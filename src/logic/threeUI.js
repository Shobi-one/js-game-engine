import { ThreeScene } from './three/ThreeScene.js';
import { objectPropertyGroups, lightPropertyGroups } from './three/editor/propertyDefs.js';
import { renderPropertyGroups, renderDeleteRow } from './three/editor/propertyForm.js';
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

  _addObject(type) {
    const obj = this.threeScene.addObject({
      type: type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${this.threeScene.objects.length}`,
      position: { x: 0, y: 1, z: 0 },
      color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    });
    
    this.addItemToExplorer(obj, 'object');
    this.selectItem('object', obj.id);
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
    
    document.querySelectorAll('#three-explorer .tree-item').forEach(i => i.classList.remove('selected'));
    const el = document.querySelector(`#three-explorer .tree-item[data-type="${type}"][data-id="${id}"]`);
    if (el) el.classList.add('selected');
  }

  renderProperties(item, type) {
    if (!this.propertiesPanel) return;
    
    this.propertiesPanel.innerHTML = '';
    
    if (!item) {
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
    renderPropertyGroups(this.propertiesPanel, groups, obj, (update) => this.threeScene.updateObject(obj.id, update));
    renderDeleteRow(this.propertiesPanel, () => {
      this.threeScene.removeObject(obj.id);
      const el = this.projectExplorer.querySelector(`.tree-item[data-id="${obj.id}"]`);
      if (el) el.remove();
      this.selectedItem = null;
      this.renderProperties(null);
    });
  }

  _renderLightProperties(light) {
    renderPropertyGroups(this.propertiesPanel, lightPropertyGroups(light), light, (update) => this.threeScene.updateLight(light.id, update));
    renderDeleteRow(this.propertiesPanel, () => {
      this.threeScene.removeLight(light.id);
      const el = this.projectExplorer.querySelector(`.tree-item[data-id="${light.id}"][data-type="light"]`);
      if (el) el.remove();
      this.selectedItem = null;
      this.renderProperties(null);
    });
  }
}

export { ThreeEditorUI };
