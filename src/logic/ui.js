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
  }

  _initContextMenu() {
    const showContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const x = e.clientX;
      const y = e.clientY;
      
      // Ensure menu stays within window bounds
      const menuWidth = this.contextMenu.offsetWidth || 120;
      const menuHeight = this.contextMenu.offsetHeight || 30;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      
      this.contextMenu.style.left = `${Math.min(x, viewportWidth - menuWidth)}px`;
      this.contextMenu.style.top = `${Math.min(y, viewportHeight - menuHeight)}px`;
      this.contextMenu.style.display = 'block';
    };

    this.projectExplorer.addEventListener('contextmenu', showContextMenu);

    const hideContextMenu = (e) => {
      if (!this.contextMenu.contains(e.target)) {
        this.contextMenu.style.display = 'none';
      }
    };

    document.addEventListener('click', hideContextMenu);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.contextMenu.style.display = 'none';
      }
    });

    this.contextMenu.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const obj = this.scene.addSprite();
        if (obj) this.addItemToExplorer(obj);
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
        }
      };

      const makeRow = (propDef) => {
        const row = document.createElement('div');
        row.className = 'property-row';
        row.dataset.property = propDef.id;
        
        const label = document.createElement('label');
        label.textContent = propDef.label;
        label.htmlFor = `prop-${item.id}-${propDef.id}`;
        
        const input = document.createElement('input');
        input.className = 'property-input';
        input.id = `prop-${item.id}-${propDef.id}`;
        input.type = propDef.type;
        input.value = propDef.value;
        input.dataset.propId = propDef.id;
        if (propDef.min !== undefined) input.min = propDef.min;
        if (propDef.step !== undefined) input.step = propDef.step;
        
        const error = document.createElement('span');
        error.className = 'property-error';
        error.style.display = 'none';
        error.id = `error-${item.id}-${propDef.id}`;

        row.appendChild(label);
        row.appendChild(input);
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