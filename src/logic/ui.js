import { scene } from './sketch.js';
import { UndoHistory, mergeUpdates } from './editor/undoHistory.js';
import { initEditorShortcuts } from './editor/shortcuts.js';
import { initSnapMenu } from './editor/snapSettings.js';
import { initCanvasDrag } from './editor/canvasDrag.js';
import { editorClipboard, spriteConfig, PASTE_OFFSET_2D } from './editor/clipboard.js';
import { spritePropertyGroups, renderPropertyForm } from './editor/propertiesPanel.js';
import { RssPanel } from './rss/rssPanel.js';
import '../style.css';

class EditorUI {
  constructor(scene) {
    this.scene = scene;
    this.selectedItem = null;
    this.projectExplorer = document.getElementById('project-explorer');
    this.contextMenu = document.getElementById('explorer-context-menu');
    this.propertiesPanel = document.getElementById('properties-panel');

    if (!this.projectExplorer || !this.contextMenu || !this.propertiesPanel) {
      console.error('EditorUI: missing DOM elements');
      return;
    }

    this.contextMenu.style.display = 'none';
    this._initContextMenu();
    this.rss = new RssPanel();

    this.codeEditorModal = document.getElementById('code-editor-modal');
    this.codeEditorTextarea = document.getElementById('code-editor-textarea');
    this.codeEditorClose = document.getElementById('code-editor-close');
    this.codeEditorApply = document.getElementById('code-editor-apply');

    if (this.codeEditorModal) {
      this._initCodeEditor();
    }

    // Ctrl+Z, Ctrl+Y and the Undo/Redo menu reach undo() and redo() through editor/shortcuts.js.
    this.history = new UndoHistory();
  }

  _initCodeEditor() {
    // Close button is now handled by the modal component
    // ESC key is also handled by the modal component

    this.codeEditorTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.codeEditorTextarea.selectionStart;
        const end = this.codeEditorTextarea.selectionEnd;
        this.codeEditorTextarea.value = 
          this.codeEditorTextarea.value.substring(0, start) + 
          '  ' + 
          this.codeEditorTextarea.value.substring(end);
        this.codeEditorTextarea.selectionStart = this.codeEditorTextarea.selectionEnd = start + 2;
      }
    });
  }

  _showCodeEditor(item, code, onChange) {
    this.codeEditorTextarea.value = code || '';
    this.codeEditorModal.show();
    this.codeEditorTextarea.focus();

    if (this._currentApplyHandler) {
      this.codeEditorApply.removeEventListener('click', this._currentApplyHandler);
    }

    this._currentApplyHandler = () => {
      const newCode = this.codeEditorTextarea.value;
      onChange(newCode);

      if (item) {
        item.code = newCode;
      }
      this.codeEditorModal.hide();
    };

    this.codeEditorApply.addEventListener('click', this._currentApplyHandler);
  }

  _initContextMenu() {
    this.projectExplorer.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = this.projectExplorer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const menuWidth = this.contextMenu.offsetWidth || 120;
      const menuHeight = this.contextMenu.offsetHeight || 30;
      const maxX = rect.width - menuWidth;
      const maxY = rect.height - menuHeight;
      
      this.contextMenu.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
      this.contextMenu.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
      this.contextMenu.style.display = 'block';
      
      console.log('Context menu shown at', x, y);
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.contextMenu.contains(e.target)) {
        this.contextMenu.style.display = 'none';
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.contextMenu.style.display = 'none';
      }
    });

    this.contextMenu.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const obj = this.scene.addSprite();
        if (obj) {
          this.addItemToExplorer(obj);
          this._pushUndo({ type: 'create', id: obj.id });
        }
        this.contextMenu.style.display = 'none';
      });
    });
  }

  clearHistory() {
    this.history = new UndoHistory();
  }

  _pushUndo(action, merge = null) {
    this.history.record(action, merge);
  }

  /** Applies a properties-panel edit and records it, so one slider drag is one undo step. */
  _updateFromPanel(id, update) {
    const sprite = this.scene.getItem('sprite', id);
    if (!sprite) return;
    const prev = Object.fromEntries(Object.keys(update).map((k) => [k, structuredClone(sprite[k])]));
    const action = { type: 'update', kind: 'sprite', id, prev, at: Date.now() };
    this.scene.updateSprite(id, update);
    // A change event that repeats the current value is not an edit.
    const after = Object.fromEntries(Object.keys(update).map((k) => [k, sprite[k]]));
    if (JSON.stringify(after) === JSON.stringify(prev)) return;
    this._pushUndo(action, mergeUpdates(action));
  }

  /** A finished canvas drag: one undo step back to `start`. */
  recordMove(id, start) {
    this._pushUndo({ type: 'update', kind: 'sprite', id, prev: { x: start.x, y: start.y }, at: Date.now() });
    if (this.selectedItem?.id === Number(id)) this.renderProperties(this.scene.getItem('sprite', id));
  }

  _selectedSprite() {
    if (this.selectedItem?.type !== 'sprite') return null;
    return this.scene.getItem('sprite', this.selectedItem.id);
  }

  _addSpriteFromConfig(config) {
    const sprite = this.scene.addSprite(config);
    // update() is what loads an image.
    if (config.imageUrl) sprite.update({ imageUrl: config.imageUrl });
    this.addItemToExplorer(sprite);
    this._pushUndo({ type: 'create', id: sprite.id });
    return sprite;
  }

  _offset(config) {
    return { ...config, x: config.x + PASTE_OFFSET_2D, y: config.y + PASTE_OFFSET_2D };
  }

  duplicate() {
    const sprite = this._selectedSprite();
    if (sprite) this._addSpriteFromConfig(this._offset(spriteConfig(sprite)));
  }

  copy() {
    const sprite = this._selectedSprite();
    if (sprite) editorClipboard.copy('sprite', spriteConfig(sprite));
  }

  paste() {
    const copied = editorClipboard.paste(['sprite']);
    if (!copied) return;
    // Each paste lands a step further, so repeated pastes don't stack exactly.
    const pasted = this._addSpriteFromConfig(this._offset(copied.config));
    editorClipboard.copy('sprite', spriteConfig(pasted));
  }

  undo() {
    const action = this.history.takeUndo();
    if (!action) return;
    try {
      if (action.type === 'create') {
        const res = this.scene.removeSprite(action.id);
        const el = this.projectExplorer.querySelector(`.tree-item[data-id="${action.id}"]`);
        if (el) el.remove();
        if (this.selectedItem && this.selectedItem.id === Number(action.id)) {
          this.selectedItem = null;
          this.renderProperties(null);
        }
        if (res) {
          this.history.pushRedo({ type: 'create', item: res.removed, index: res.index });
        }
      } else if (action.type === 'delete') {
        const { item, index } = action;
        this.scene.insertSpriteAt(item, index);
        this.addItemToExplorer(item);
        this.history.pushRedo({ type: 'delete', id: item.id });

      } else if (action.type === 'update') {
        const { id, prev } = action;
        const current = this.scene.getItem('sprite', id);
        const after = current ? { } : null;
        if (current && prev) {
          Object.keys(prev).forEach(k => after[k] = current[k]);
          this.scene.updateSprite(id, prev);
          this.history.pushRedo({ type: 'update', id, prev: after });
        }
        if (this.selectedItem && this.selectedItem.id === Number(id)) {
          const item = this.scene.getItem('sprite', id);
          this.renderProperties(item);
        }
      }
    } catch (err) {
      console.error('Undo failed', err);
    }
  }

  redo() {
    const action = this.history.takeRedo();
    if (!action) return;
    try {
      if (action.type === 'create') {
        const idx = this.scene.insertSpriteAt(action.item, action.index);
        this.addItemToExplorer(action.item);
        this.history.pushUndo({ type: 'create', id: action.item.id });
      } else if (action.type === 'delete') {
        const res = this.scene.removeSprite(action.id);
        const el = this.projectExplorer.querySelector(`.tree-item[data-id="${action.id}"]`);
        if (el) el.remove();
        if (res) {
          this.history.pushUndo({ type: 'delete', item: res.removed, index: res.index });
        }
      } else if (action.type === 'update') {
        const { id, prev } = action;
        const current = this.scene.getItem('sprite', id);
        if (current) {
          const before = {};
          Object.keys(prev).forEach(k => before[k] = current[k]);
          this.scene.updateSprite(id, prev);
          this.history.pushUndo({ type: 'update', id, prev: before });
        }
        if (this.selectedItem && this.selectedItem.id === Number(id)) {
          const item = this.scene.getItem('sprite', id);
          this.renderProperties(item);
        }
      }
    } catch (err) {
      console.error('Redo failed', err);
    }
  }

  selectItem(type, id) {
    try {
      this.selectedItem = { type, id: Number(id) };
      let item = null;
      if (this.scene && typeof this.scene.getItem === 'function') item = this.scene.getItem(type, id);
      if (!item) {
        const el = document.querySelector(`.tree-item[data-type="${type}"][data-id="${id}"]`);
        if (el && el._obj) item = el._obj;
        else console.warn('Selected item not found', { type, id });
      }
      this.renderProperties(item, type);

      document.querySelectorAll('.tree-item').forEach(i => i.classList.remove('selected'));
      const el = document.querySelector(`.tree-item[data-type="${type}"][data-id="${id}"]`);
      if (el) el.classList.add('selected');
    } catch (err) {
      console.error('Error in selectItem', err);
    }
  }

  renderProperties(item, type) {
    try {
      if (!this.propertiesPanel) {
        console.error('propertiesPanel element not found');
        return;
      }

      this.propertiesPanel.innerHTML = '';

      if (!item) {
        const noSelection = document.createElement('div');
        noSelection.className = 'no-selection';
        noSelection.innerHTML = `
          <div class="no-selection-text">No object selected</div>
          <div class="no-selection-hint">Click on an object in the scene or project explorer to view and edit its properties.</div>
        `;
        this.propertiesPanel.appendChild(noSelection);
        return;
      }

      const groups = spritePropertyGroups(item, {
        onEditCode: (target, onChange) => this._showCodeEditor(target, target.code, onChange),
      });
      renderPropertyForm(this.propertiesPanel, item, groups, (update) => this._updateFromPanel(Number(item.id), update));

      const deleteRow = document.createElement('div');
      deleteRow.style.display = 'flex';
      deleteRow.style.justifyContent = 'flex-end';
      deleteRow.style.marginTop = 'var(--space-sm)';
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'code-editor-button';
      deleteBtn.addEventListener('click', () => {
        try {
          const res = this.scene.removeSprite(Number(item.id));
          if (res) {
            this._pushUndo({ type: 'delete', item: res.removed, index: res.index });
            const el = this.projectExplorer.querySelector(`.tree-item[data-id="${item.id}"]`);
            if (el) el.remove();
            this.selectedItem = null;
            this.renderProperties(null);
          }
        } catch (err) {
          console.error('Delete failed', err);
        }
      });
      deleteRow.appendChild(deleteBtn);
      this.propertiesPanel.appendChild(deleteRow);

    } catch (err) {
      console.error('Error in renderProperties', err);
    }
  }

  addItemToExplorer(obj) {
    const item = document.createElement('div');
    item.className = 'tree-item';
    item.textContent = `${obj.type} ${obj.id}`;
    item.dataset.type = obj.type;
    item.dataset.id = obj.id;
    item._obj = obj;

    item.addEventListener('click', () => {
      this.selectedItem = { type: item.dataset.type, id: Number(item.dataset.id) };
      this.renderProperties(obj, item.dataset.type);
      document.querySelectorAll('.tree-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
    });

    this.projectExplorer.appendChild(item);
    this.selectItem(item.dataset.type, item.dataset.id);
  }
}

const ui = new EditorUI(scene);
window.editorUI = ui;
initEditorShortcuts();
initSnapMenu();
initCanvasDrag({
  container: document.getElementById('canvas-container'),
  scene,
  editor: ui,
  canEdit: () => (window.engineController?.mode ?? '2d') === '2d' && !window.gameController?.isRunning,
});

export { EditorUI };