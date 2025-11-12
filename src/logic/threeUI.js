import { ThreeScene } from './threeScene.js';

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
    this._initCodeEditor();
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

  _initCodeEditor() {
    this.codeEditorModal = document.getElementById('code-editor-modal');
    this.codeEditorTextarea = document.getElementById('code-editor-textarea');
    this.codeEditorApply = document.getElementById('code-editor-apply');
    
    if (this.codeEditorModal) {
      // Close button and ESC key are now handled by the modal component
      
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
    const propertyGroups = {
      transform: {
        label: 'Transform',
        properties: [
          { id: 'position.x', label: 'Position X', type: 'number', value: obj.position.x, step: 0.1 },
          { id: 'position.y', label: 'Position Y', type: 'number', value: obj.position.y, step: 0.1 },
          { id: 'position.z', label: 'Position Z', type: 'number', value: obj.position.z, step: 0.1 },
          { id: 'rotation.x', label: 'Rotation X', type: 'number', value: obj.rotation.x, step: 0.1 },
          { id: 'rotation.y', label: 'Rotation Y', type: 'number', value: obj.rotation.y, step: 0.1 },
          { id: 'rotation.z', label: 'Rotation Z', type: 'number', value: obj.rotation.z, step: 0.1 },
          { id: 'scale.x', label: 'Scale X', type: 'number', value: obj.scale.x, step: 0.1, min: 0.01 },
          { id: 'scale.y', label: 'Scale Y', type: 'number', value: obj.scale.y, step: 0.1, min: 0.01 },
          { id: 'scale.z', label: 'Scale Z', type: 'number', value: obj.scale.z, step: 0.1, min: 0.01 }
        ]
      },
      material: {
        label: 'Material',
        properties: [
          { id: 'color', label: 'Color', type: 'color', value: obj.color },
          { id: 'metalness', label: 'Metalness', type: 'range', value: obj.metalness, min: 0, max: 1, step: 0.01 },
          { id: 'roughness', label: 'Roughness', type: 'range', value: obj.roughness, min: 0, max: 1, step: 0.01 },
          { id: 'opacity', label: 'Opacity', type: 'range', value: obj.opacity, min: 0, max: 1, step: 0.01 },
          { id: 'transparent', label: 'Transparent', type: 'checkbox', value: obj.transparent },
          { id: 'wireframe', label: 'Wireframe', type: 'checkbox', value: obj.wireframe },
          {
            id: 'textureUrl',
            label: 'Texture',
            type: 'custom',
            value: obj.textureUrl || '',
            render: (value, onChange) => {
              const container = document.createElement('div');
              container.style.display = 'flex';
              container.style.flexDirection = 'column';
              container.style.gap = '4px';
              
              const fileInput = document.createElement('input');
              fileInput.type = 'file';
              fileInput.accept = 'image/*';
              fileInput.className = 'property-input';
              
              fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const textureUrl = evt.target.result;
                    onChange(textureUrl);
                    preview.src = textureUrl;
                    preview.style.display = 'block';
                  };
                  reader.readAsDataURL(file);
                }
              };
              
              const preview = document.createElement('img');
              preview.style.maxWidth = '100px';
              preview.style.maxHeight = '100px';
              preview.style.border = '1px solid #ccc';
              preview.style.borderRadius = '4px';
              preview.style.display = obj.textureUrl ? 'block' : 'none';
              if (obj.textureUrl) preview.src = obj.textureUrl;
              
              const clearBtn = document.createElement('button');
              clearBtn.className = 'code-editor-button';
              clearBtn.textContent = 'Clear Texture';
              clearBtn.onclick = () => {
                onChange(null);
                fileInput.value = '';
                preview.style.display = 'none';
              };
              
              container.appendChild(fileInput);
              container.appendChild(preview);
              container.appendChild(clearBtn);
              return container;
            }
          }
        ]
      },
      behavior: {
        label: 'Behavior',
        properties: [
          { id: 'interactive', label: 'Interactive', type: 'checkbox', value: obj.interactive },
          {
            id: 'code',
            label: 'Custom Code',
            type: 'custom',
            value: obj.code || '',
            render: (value, onChange) => {
              const button = document.createElement('button');
              button.className = 'code-editor-button';
              button.textContent = 'Edit Code';
              button.onclick = () => this._showCodeEditor(obj, obj.code, onChange);
              return button;
            }
          }
        ]
      }
    };
    
    if (obj.animations && obj.animations.length > 0) {
      propertyGroups.animation = {
        label: 'Animation',
        properties: [
          {
            id: 'currentAnimation',
            label: 'Active Animation',
            type: 'custom',
            value: obj.currentAnimation || '',
            render: (value, onChange) => {
              const container = document.createElement('div');
              container.style.display = 'flex';
              container.style.flexDirection = 'column';
              container.style.gap = '4px';
              
              obj.animations.forEach(clip => {
                const btn = document.createElement('button');
                btn.className = 'code-editor-button';
                btn.textContent = clip.name;
                btn.style.width = '100%';
                btn.onclick = () => {
                  obj.playAnimation(clip.name);
                  onChange(clip.name);
                };
                container.appendChild(btn);
              });
              
              return container;
            }
          }
        ]
      };
    }
    
    this._renderPropertyGroups(propertyGroups, obj, 'object');
    
    // Delete button
    const deleteRow = document.createElement('div');
    deleteRow.style.display = 'flex';
    deleteRow.style.justifyContent = 'flex-end';
    deleteRow.style.marginTop = 'var(--space-sm)';
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'code-editor-button';
    deleteBtn.addEventListener('click', () => {
      this.threeScene.removeObject(obj.id);
      const el = this.projectExplorer.querySelector(`.tree-item[data-id="${obj.id}"]`);
      if (el) el.remove();
      this.selectedItem = null;
      this.renderProperties(null);
    });
    deleteRow.appendChild(deleteBtn);
    this.propertiesPanel.appendChild(deleteRow);
  }

  _renderLightProperties(light) {
    const propertyGroups = {
      general: {
        label: 'General',
        properties: [
          { id: 'name', label: 'Name', type: 'text', value: light.name },
          { id: 'color', label: 'Color', type: 'color', value: light.color },
          { id: 'intensity', label: 'Intensity', type: 'range', value: light.intensity, min: 0, max: 5, step: 0.1 }
        ]
      },
      position: {
        label: 'Position',
        properties: [
          { id: 'position.x', label: 'Position X', type: 'number', value: light.position.x, step: 0.1 },
          { id: 'position.y', label: 'Position Y', type: 'number', value: light.position.y, step: 0.1 },
          { id: 'position.z', label: 'Position Z', type: 'number', value: light.position.z, step: 0.1 }
        ]
      }
    };
    
    // Type-specific properties
    if (light.type === 'spot') {
      propertyGroups.spotlight = {
        label: 'Spotlight Settings',
        properties: [
          { id: 'angle', label: 'Angle', type: 'range', value: light.angle, min: 0, max: Math.PI / 2, step: 0.01 },
          { id: 'penumbra', label: 'Penumbra', type: 'range', value: light.penumbra, min: 0, max: 1, step: 0.01 },
          { id: 'decay', label: 'Decay', type: 'number', value: light.decay, min: 0, step: 0.1 },
          { id: 'distance', label: 'Distance', type: 'number', value: light.distance, min: 0, step: 1 },
          { id: 'target.x', label: 'Target X', type: 'number', value: light.target.x, step: 0.1 },
          { id: 'target.y', label: 'Target Y', type: 'number', value: light.target.y, step: 0.1 },
          { id: 'target.z', label: 'Target Z', type: 'number', value: light.target.z, step: 0.1 }
        ]
      };
    }
    
    if (light.type === 'point') {
      propertyGroups.pointlight = {
        label: 'Point Light Settings',
        properties: [
          { id: 'distance', label: 'Distance', type: 'number', value: light.distance, min: 0, step: 1 },
          { id: 'decay', label: 'Decay', type: 'number', value: light.decay, min: 0, step: 0.1 }
        ]
      };
    }
    
    if (light.type === 'hemisphere') {
      propertyGroups.hemisphere = {
        label: 'Hemisphere Settings',
        properties: [
          { id: 'groundColor', label: 'Ground Color', type: 'color', value: light.groundColor }
        ]
      };
    }
    
    if (['directional', 'spot', 'point'].includes(light.type)) {
      propertyGroups.shadow = {
        label: 'Shadows',
        properties: [
          { id: 'castShadow', label: 'Cast Shadow', type: 'checkbox', value: light.castShadow }
        ]
      };
    }
    
    this._renderPropertyGroups(propertyGroups, light, 'light');
    
    const deleteRow = document.createElement('div');
    deleteRow.style.display = 'flex';
    deleteRow.style.justifyContent = 'flex-end';
    deleteRow.style.marginTop = 'var(--space-sm)';
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'code-editor-button';
    deleteBtn.addEventListener('click', () => {
      this.threeScene.removeLight(light.id);
      const el = this.projectExplorer.querySelector(`.tree-item[data-id="${light.id}"][data-type="light"]`);
      if (el) el.remove();
      this.selectedItem = null;
      this.renderProperties(null);
    });
    deleteRow.appendChild(deleteBtn);
    this.propertiesPanel.appendChild(deleteRow);
  }

  _renderPropertyGroups(propertyGroups, item, itemType) {
    Object.entries(propertyGroups).forEach(([groupId, group]) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'property-group';
      
      const label = document.createElement('div');
      label.className = 'property-label';
      label.textContent = group.label;
      groupEl.appendChild(label);
      
      const inputs = {};
      
      group.properties.forEach(prop => {
        const row = document.createElement('div');
        row.className = 'property-row';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = prop.label;
        labelEl.htmlFor = `prop-${item.id}-${prop.id}`;
        row.appendChild(labelEl);
        
        let input;
        if (prop.type === 'custom' && prop.render) {
          input = prop.render(prop.value, (newValue) => {
            const update = this._parsePropertyPath(prop.id, newValue);
            if (itemType === 'object') {
              this.threeScene.updateObject(item.id, update);
            } else if (itemType === 'light') {
              this.threeScene.updateLight(item.id, update);
            }
          });
        } else {
          input = document.createElement('input');
          input.className = 'property-input';
          input.id = `prop-${item.id}-${prop.id}`;
          input.dataset.propId = prop.id;
          
          if (prop.type === 'checkbox') {
            input.type = 'checkbox';
            input.checked = prop.value;
          } else if (prop.type === 'range') {
            input.type = 'range';
            input.value = prop.value;
            input.min = prop.min;
            input.max = prop.max;
            input.step = prop.step;
            
            const valueLabel = document.createElement('span');
            valueLabel.textContent = prop.value.toFixed(2);
            valueLabel.style.marginLeft = '8px';
            valueLabel.style.fontSize = '12px';
            
            input.addEventListener('input', () => {
              valueLabel.textContent = parseFloat(input.value).toFixed(2);
            });
            
            row.appendChild(input);
            row.appendChild(valueLabel);
            inputs[prop.id] = input;
            groupEl.appendChild(row);
            return;
          } else {
            input.type = prop.type;
            input.value = prop.value ?? '';
            if (prop.min !== undefined) input.min = prop.min;
            if (prop.step !== undefined) input.step = prop.step;
          }
        }
        
        row.appendChild(input);
        inputs[prop.id] = input;
        groupEl.appendChild(row);
      });
      
      this.propertiesPanel.appendChild(groupEl);
      
      Object.entries(inputs).forEach(([propId, input]) => {
        const eventType = input.type === 'range' ? 'input' : 'change';
        
        input.addEventListener(eventType, () => {
          const value = input.type === 'checkbox' ? input.checked : 
                       (input.type === 'number' || input.type === 'range') ? parseFloat(input.value) : 
                       input.value;
          
          const update = this._parsePropertyPath(propId, value);
          
          if (itemType === 'object') {
            this.threeScene.updateObject(item.id, update);
          } else if (itemType === 'light') {
            this.threeScene.updateLight(item.id, update);
          }
        });
      });
    });
  }

  _parsePropertyPath(path, value) {
    const parts = path.split('.');
    if (parts.length === 1) {
      return { [path]: value };
    }
    
    const result = {};
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    return result;
  }
}

export { ThreeEditorUI };
