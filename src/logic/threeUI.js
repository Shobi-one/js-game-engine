import { ThreeScene } from './three/ThreeScene.js';
import { objectPropertyGroups, lightPropertyGroups } from './three/editor/propertyDefs.js';
import { renderPropertyGroups, renderDeleteRow } from './three/editor/propertyForm.js';
import { snapshotOf, canSnapshot, currentValues, copyFor } from './three/editor/snapshots.js';
import { UndoHistory, mergeUpdates } from './editor/undoHistory.js';
import { editorClipboard, PASTE_OFFSET_3D } from './editor/clipboard.js';
import { isTypingIn } from './editor/shortcuts.js';
import { snapSettings } from './editor/snapSettings.js';
import { TransformGizmo } from './three/editor/transformGizmo.js';
import { openCodeEditor } from './editor/codeEditor.js';

class ThreeEditorUI {
  constructor(threeScene) {
    this.threeScene = threeScene;
    this.selectedItem = null;
    this.selectedType = null;
    this.projectExplorer = document.getElementById('three-explorer');
    this.contextMenu = document.getElementById('three-context-menu');
    this.propertiesPanel = document.getElementById('properties-panel');
    
    if (!this.projectExplorer || !this.contextMenu || !this.propertiesPanel) {
      console.error('ThreeEditorUI: missing DOM elements', {
        projectExplorer: !!this.projectExplorer,
        contextMenu: !!this.contextMenu,
        propertiesPanel: !!this.propertiesPanel
      });
      return;
    }
    
    // Ctrl+Z / Ctrl+Y / Ctrl+D / Ctrl+C / Ctrl+V reach these methods through editor/shortcuts.js in 3D mode.
    this.history = new UndoHistory();
    this._initGizmo();
    console.log('ThreeEditorUI initialized successfully');
    this.contextMenu.style.display = 'none';
    this._initContextMenu();
    this._populateExplorer();
  }

  _initContextMenu() {
    this.projectExplorer.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = this.projectExplorer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const menuWidth = this.contextMenu.offsetWidth || 150;
      const menuHeight = this.contextMenu.offsetHeight || 200;
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
    
    // Context menu items
    this.contextMenu.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        
        if (action === 'add-box') {
          this._addObject('box');
        } else if (action === 'add-sphere') {
          this._addObject('sphere');
        } else if (action === 'add-cylinder') {
          this._addObject('cylinder');
        } else if (action === 'add-cone') {
          this._addObject('cone');
        } else if (action === 'add-torus') {
          this._addObject('torus');
        } else if (action === 'add-plane') {
          this._addObject('plane');
        } else if (action === 'load-model') {
          this._showModelLoader();
        } else if (action === 'add-light') {
          this._showLightCreator();
        }
        
        this.contextMenu.style.display = 'none';
      });
    });
  }

  _initGizmo() {
    this.gizmo = new TransformGizmo(this.threeScene, {
      onDragEnd: (kind, item, before, after) => this._applyDrag(kind, item, before, after),
      onPick: (kind, id) => this.selectItem(kind, id),
    });
    snapSettings.subscribe((on) => this.gizmo.setSnap(on));
    // The handles hide while the game runs and come back on the selection when it stops.
    this.threeScene.onRunChange = (running) => {
      if (running) this.gizmo.detach();
      else if (this._selected()) this.gizmo.attach(this._selected().kind, this._selected().item);
    };
    document.addEventListener('keydown', (e) => {
      if (window.engineController?.mode !== '3d' || this.threeScene.isRunning) return;
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingIn(e.target)) return;
      if (this.gizmo.handleKey(e.key)) e.preventDefault();
    });
  }

  /** A finished gizmo drag: keep the item's fields in step with its mesh, and make it one undo step. */
  _applyDrag(kind, item, before, after) {
    item.update(after);
    this.history.record({ type: 'update', kind, id: item.id, prev: before, at: Date.now() });
    if (this.selectedItem?.type === kind && this.selectedItem.id === item.id) this.renderProperties(item, kind);
  }

  _addObject(type) {
    const obj = this.threeScene.addObject({
      type: type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${this.threeScene.objects.length}`,
      position: { x: 0, y: 1, z: 0 },
      color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    });
    
    this.addItemToExplorer(obj, 'object');
    this.selectItem('object', obj.id);
    this.recordAdded('object', obj);
  }

  // --- Undo, redo, duplicate, copy and paste ---------------------------------
  // Actions: { type: 'add' | 'remove', kind, snapshot, index } and
  // { type: 'update', kind, id, prev, at }. Undoing an action applies its
  // inverse, which goes on the other stack, so undo and redo share one code path.

  _list(kind) {
    return kind === 'light' ? this.threeScene.lights : this.threeScene.objects;
  }

  _get(kind, id) {
    return kind === 'light' ? this.threeScene.getLight(id) : this.threeScene.getObject(id);
  }

  /** Called after an object or light is created, so the creation can be undone. */
  recordAdded(kind, item) {
    if (!canSnapshot(kind, item)) return;
    this.history.record({ type: 'add', kind, snapshot: snapshotOf(kind, item), index: this._list(kind).indexOf(item) });
  }

  clearHistory() {
    this.history = new UndoHistory();
  }

  _remove(kind, id) {
    const item = this._get(kind, id);
    if (!item) return null;
    const removed = { snapshot: canSnapshot(kind, item) ? snapshotOf(kind, item) : null, index: this._list(kind).indexOf(item) };
    if (kind === 'light') this.threeScene.removeLight(id);
    else this.threeScene.removeObject(id);
    return removed;
  }

  _restore(kind, snapshot, index) {
    return kind === 'light' ? this.threeScene.addLight(snapshot, index) : this.threeScene.addObject(snapshot, index);
  }

  _invert(action) {
    const { type, kind } = action;
    if (type === 'add') {
      const removed = this._remove(kind, action.snapshot.id);
      return removed && { type: 'remove', kind, snapshot: removed.snapshot, index: removed.index };
    }
    if (type === 'remove') {
      this._restore(kind, action.snapshot, action.index);
      return { ...action, type: 'add' };
    }
    const item = this._get(kind, action.id);
    if (!item) return null;
    const now = currentValues(item, action.prev);
    item.update(action.prev);
    return { type: 'update', kind, id: action.id, prev: now, at: 0 };
  }

  _step(take, push) {
    const action = take();
    if (!action) return false;
    try {
      const inverse = this._invert(action);
      if (inverse) push(inverse);
    } catch (err) {
      console.error('3D undo/redo failed', err);
    }
    this._refreshAfterHistory();
    return true;
  }

  undo() {
    return this._step(() => this.history.takeUndo(), (a) => this.history.pushRedo(a));
  }

  redo() {
    return this._step(() => this.history.takeRedo(), (a) => this.history.pushUndo(a));
  }

  _refreshAfterHistory() {
    this._populateExplorer();
    const sel = this.selectedItem;
    if (sel && this._get(sel.type, sel.id)) this.selectItem(sel.type, sel.id);
    else {
      this.selectedItem = null;
      this.renderProperties(null);
    }
  }

  _updateFromPanel(kind, item, update) {
    const action = { type: 'update', kind, id: item.id, prev: currentValues(item, update), at: Date.now() };
    if (kind === 'light') this.threeScene.updateLight(item.id, update);
    else this.threeScene.updateObject(item.id, update);
    // A change event that repeats the current value is not an edit.
    if (JSON.stringify(currentValues(item, update)) === JSON.stringify(action.prev)) return;
    this.history.record(action, mergeUpdates(action));
  }

  _deleteSelected(kind, item) {
    const removed = this._remove(kind, item.id);
    if (removed?.snapshot) this.history.record({ type: 'remove', kind, ...removed });
    this._populateExplorer();
    this.selectedItem = null;
    this.renderProperties(null);
  }

  _selected() {
    const sel = this.selectedItem;
    const item = sel && this._get(sel.type, sel.id);
    return item ? { kind: sel.type, item } : null;
  }

  _addCopy(kind, config) {
    const item = this._restore(kind, config);
    this.addItemToExplorer(item, kind);
    this.selectItem(kind, item.id);
    this.recordAdded(kind, item);
    return item;
  }

  duplicate() {
    const sel = this._selected();
    if (!sel || !canSnapshot(sel.kind, sel.item)) return false;
    this._addCopy(sel.kind, copyFor(snapshotOf(sel.kind, sel.item), PASTE_OFFSET_3D));
    return true;
  }

  copy() {
    const sel = this._selected();
    if (!sel || !canSnapshot(sel.kind, sel.item)) return false;
    editorClipboard.copy(sel.kind, snapshotOf(sel.kind, sel.item));
    return true;
  }

  paste() {
    const copied = editorClipboard.paste(['object', 'light']);
    if (!copied) return false;
    const item = this._addCopy(copied.kind, copyFor(copied.config, PASTE_OFFSET_3D));
    // The next paste lands a step further along.
    editorClipboard.copy(copied.kind, { ...snapshotOf(copied.kind, item), name: copied.config.name });
    return true;
  }

  _showModelLoader() {
    const modal = document.getElementById('model-loader-modal');
    if (modal) {
      modal.show();
    }
  }

  _showLightCreator() {
    const modal = document.getElementById('light-creator-modal');
    if (modal) {
      modal.show();
    }
  }

  _showCodeEditor(item, code, onChange) {
    openCodeEditor({
      code,
      params: ['THREE'],
      runtimeError: item?._lastCodeError ?? null,
      onApply: (newCode) => {
        onChange(newCode);
        if (item) item.code = newCode;
      },
    });
  }

  _populateExplorer() {
    const contextMenu = this.contextMenu;
    const treeItems = this.projectExplorer.querySelectorAll('.tree-item');
    treeItems.forEach(item => item.remove());
    
    this.threeScene.getAllObjects().forEach(obj => {
      this.addItemToExplorer(obj, 'object');
    });
    
    this.threeScene.getAllLights().forEach(light => {
      this.addItemToExplorer(light, 'light');
    });
  }

  addItemToExplorer(item, type) {
    const treeItem = document.createElement('div');
    treeItem.className = 'tree-item';
    treeItem.textContent = item.name || `${type} ${item.id}`;
    treeItem.dataset.type = type;
    treeItem.dataset.id = item.id;
    treeItem._item = item;
    
    treeItem.addEventListener('click', () => {
      this.selectItem(type, item.id);
    });
    
    this.projectExplorer.appendChild(treeItem);
  }

  selectItem(type, id) {
    this.selectedType = type;
    this.selectedItem = { type, id };
    
    let item = null;
    if (type === 'object') {
      item = this.threeScene.getObject(id);
    } else if (type === 'light') {
      item = this.threeScene.getLight(id);
    }
    
    this.renderProperties(item, type);
    this.gizmo?.attach(type, item);
    
    document.querySelectorAll('#three-explorer .tree-item').forEach(i => i.classList.remove('selected'));
    const el = document.querySelector(`#three-explorer .tree-item[data-type="${type}"][data-id="${id}"]`);
    if (el) el.classList.add('selected');
  }

  renderProperties(item, type) {
    if (!this.propertiesPanel) return;
    
    this.propertiesPanel.innerHTML = '';
    
    if (!item) {
      this.gizmo?.detach();
      const noSelection = document.createElement('div');
      noSelection.className = 'no-selection';
      noSelection.innerHTML = `
        <div class="no-selection-text">No object selected</div>
        <div class="no-selection-hint">Click on an object in the 3D viewport or explorer to edit its properties.</div>
      `;
      this.propertiesPanel.appendChild(noSelection);
      return;
    }
    
    if (type === 'object') {
      this._renderObjectProperties(item);
    } else if (type === 'light') {
      this._renderLightProperties(item);
    }
  }

  _renderObjectProperties(obj) {
    const groups = objectPropertyGroups(obj, { editCode: (item, code, onChange) => this._showCodeEditor(item, code, onChange) });
    renderPropertyGroups(this.propertiesPanel, groups, obj, (update) => this._updateFromPanel('object', obj, update));
    renderDeleteRow(this.propertiesPanel, () => this._deleteSelected('object', obj));
  }

  _renderLightProperties(light) {
    renderPropertyGroups(this.propertiesPanel, lightPropertyGroups(light), light, (update) => this._updateFromPanel('light', light, update));
    renderDeleteRow(this.propertiesPanel, () => this._deleteSelected('light', light));
  }
}

export { ThreeEditorUI };
