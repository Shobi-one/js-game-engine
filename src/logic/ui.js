import { scene } from './sketch.js';

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

    this.codeEditorModal = document.getElementById('code-editor-modal');
    this.codeEditorTextarea = document.getElementById('code-editor-textarea');
    this.codeEditorClose = document.getElementById('code-editor-close');
    this.codeEditorApply = document.getElementById('code-editor-apply');

    if (this.codeEditorModal) {
      this._initCodeEditor();
    }
  }

  _initCodeEditor() {
    this.codeEditorClose.addEventListener('click', () => {
      this.codeEditorModal.style.display = 'none';
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.codeEditorModal.style.display === 'block') {
        this.codeEditorModal.style.display = 'none';
      }
    });

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
    this.codeEditorModal.style.display = 'flex';
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
      this.codeEditorModal.style.display = 'none';
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
        if (obj) this.addItemToExplorer(obj);
        this.contextMenu.style.display = 'none';
      });
    });
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
      if (!item) return;

      const propertyDefs = {
        transform: {
          label: 'Transform',
          properties: [
            { id: 'x', label: 'Position X', type: 'number', value: item.x ?? 0, step: 1, validate: v => !isNaN(v) },
            { id: 'y', label: 'Position Y', type: 'number', value: item.y ?? 0, step: 1, validate: v => !isNaN(v) },
            { id: 'rotation', label: 'Rotation', type: 'number', value: item.rotation ?? 0, step: 1, validate: v => !isNaN(v) }
          ]
        },
        appearance: {
          label: 'Size & Style',
          properties: [
            { id: 'width', label: 'Width', type: 'number', value: item.width ?? 50, min: 1, step: 1, validate: v => v > 0 },
            { id: 'height', label: 'Height', type: 'number', value: item.height ?? 50, min: 1, step: 1, validate: v => v > 0 },
            { id: 'color', label: 'Color', type: 'text', value: item.color ?? '#00ff00', validate: v => /^#[0-9a-f]{6}$/i.test(v) }
          ]
        },
        behavior: {
          label: 'Behavior',
          properties: [
            {
              id: 'code',
              label: 'Logic',
              type: 'custom',
              value: item.code || '',
              render: (value, onChange) => {
                const container = document.createElement('div');
                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.style.gap = 'var(--space-xs)';

                const button = document.createElement('button');
                button.className = 'code-editor-button';
                button.textContent = 'Edit Logic';
                
                button.onclick = () => this._showCodeEditor(item, item.code, onChange);
                
                container.appendChild(button);
                return container;
              }
            }
          ]
        }
      };

      const makeRow = (propDef) => {
        const row = document.createElement('div');
        row.className = 'property-row';
        row.dataset.property = propDef.id;
        
        const label = document.createElement('label');
        label.textContent = propDef.label;
        label.htmlFor = `prop-${item.id}-${propDef.id}`;
        row.appendChild(label);
        
        let input;
        if (propDef.type === 'custom' && propDef.render) {
          input = propDef.render(propDef.value, (newValue) => {
            const update = {};
            update[propDef.id] = newValue;
            if (this.scene?.updateSprite) {
              this.scene.updateSprite(Number(item.id), update);
            }
          });
        } else {
          input = document.createElement('input');
          input.className = 'property-input';
          input.id = `prop-${item.id}-${propDef.id}`;
          input.type = propDef.type;
          input.value = propDef.value ?? '';
          input.dataset.propId = propDef.id;
          if (propDef.min !== undefined) input.min = propDef.min;
          if (propDef.step !== undefined) input.step = propDef.step;
        }
        
        row.appendChild(input);
        
        const error = document.createElement('span');
        error.className = 'property-error';
        error.style.display = 'none';
        error.id = `error-${item.id}-${propDef.id}`;
        row.appendChild(error);
        
        return { row, input, error };
      };

      Object.entries(propertyDefs).forEach(([groupId, group]) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'property-group';
        groupEl.dataset.group = groupId;
        
        const label = document.createElement('div');
        label.className = 'property-label';
        label.textContent = group.label;
        groupEl.appendChild(label);

        const inputs = {};
        const errors = {};

        group.properties.forEach(prop => {
          const { row, input, error } = makeRow(prop);
          groupEl.appendChild(row);
          inputs[prop.id] = input;
          errors[prop.id] = error;
        });

        this.propertiesPanel.appendChild(groupEl);

        const validateAndUpdate = (propId, value) => {
          const prop = group.properties.find(p => p.id === propId);
          
          if (prop.type === 'custom' || !prop.validate) {
            return true;
          }

          const isValid = prop.validate(value);
          const error = errors[propId];
          
          if (!isValid) {
            error.textContent = `Invalid ${prop.label.toLowerCase()}`;
            error.style.display = 'block';
            inputs[propId].classList.add('invalid');
            return false;
          }
          
          error.style.display = 'none';
          inputs[propId].classList.remove('invalid');
          return true;
        };

        Object.entries(inputs).forEach(([propId, input]) => {
          input.addEventListener('change', () => {
            const update = {};
            let isValid = true;

            Object.entries(inputs).forEach(([key, inp]) => {
              const value = inp.type === 'number' ? Number(inp.value) : inp.value;
              if (validateAndUpdate(key, value)) {
                update[key] = value;
              } else {
                isValid = false;
              }
            });

            if (isValid && this.scene?.updateSprite) {
              this.scene.updateSprite(Number(item.id), update);
            }
          });

          validateAndUpdate(propId, input.type === 'number' ? Number(input.value) : input.value);
        });
      });

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

export { EditorUI };