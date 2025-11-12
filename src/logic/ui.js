import { scene } from './sketch.js';
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
    this._initRSS();

    this.codeEditorModal = document.getElementById('code-editor-modal');
    this.codeEditorTextarea = document.getElementById('code-editor-textarea');
    this.codeEditorClose = document.getElementById('code-editor-close');
    this.codeEditorApply = document.getElementById('code-editor-apply');

    if (this.codeEditorModal) {
      this._initCodeEditor();
    }

    this._undoStack = [];
    this._redoStack = [];

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.redo();
        return;
      }
    });

    const undoBtn = document.querySelector('menu-item[text="Undo"]');
    if (undoBtn) undoBtn.addEventListener('click', () => this.undo());
    const redoBtn = document.querySelector('menu-item[text="Redo"]');
    if (redoBtn) redoBtn.addEventListener('click', () => this.redo());
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

  _pushUndo(action) {
    this._undoStack.push(action);
    this._redoStack.length = 0;
    if (this._undoStack.length > 100) this._undoStack.shift();
  }

  undo() {
    if (!this._undoStack || this._undoStack.length === 0) return;
    const action = this._undoStack.pop();
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
          this._redoStack.push({ type: 'create', item: res.removed, index: res.index });
        }
      } else if (action.type === 'delete') {
        const { item, index } = action;
        this.scene.insertSpriteAt(item, index);
        this.addItemToExplorer(item);
        this._redoStack.push({ type: 'delete', id: item.id });

      } else if (action.type === 'update') {
        const { id, prev } = action;
        const current = this.scene.getItem('sprite', id);
        const after = current ? { } : null;
        if (current && prev) {
          Object.keys(prev).forEach(k => after[k] = current[k]);
          this.scene.updateSprite(id, prev);
          this._redoStack.push({ type: 'update', id, prev: after });
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
    if (!this._redoStack || this._redoStack.length === 0) return;
    const action = this._redoStack.pop();
    try {
      if (action.type === 'create') {
        const idx = this.scene.insertSpriteAt(action.item, action.index);
        this.addItemToExplorer(action.item);
        this._undoStack.push({ type: 'create', id: action.item.id });
      } else if (action.type === 'delete') {
        const res = this.scene.removeSprite(action.id);
        const el = this.projectExplorer.querySelector(`.tree-item[data-id="${action.id}"]`);
        if (el) el.remove();
        if (res) {
          this._undoStack.push({ type: 'delete', item: res.removed, index: res.index });
        }
      } else if (action.type === 'update') {
        const { id, prev } = action;
        const current = this.scene.getItem('sprite', id);
        if (current) {
          const before = {};
          Object.keys(prev).forEach(k => before[k] = current[k]);
          this.scene.updateSprite(id, prev);
          this._undoStack.push({ type: 'update', id, prev: before });
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
            { id: 'color', label: 'Color', type: 'color', value: item.color ?? '#00ff00' },
            {
              id: 'imageUrl',
              label: 'Image',
              type: 'custom',
              value: item.imageUrl || '',
              render: (value, onChange) => {
                const container = document.createElement('div');
                container.style.display = 'flex';
                container.style.flexDirection = 'column';
                container.style.gap = 'var(--space-xs)';

                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.className = 'property-input';
                
                fileInput.onchange = (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const imageUrl = evt.target.result;
                      onChange(imageUrl);
                      preview.src = imageUrl;
                      preview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                  }
                };

                const preview = document.createElement('img');
                preview.style.maxWidth = '100px';
                preview.style.maxHeight = '100px';
                preview.style.marginTop = '4px';
                preview.style.border = '1px solid #ccc';
                preview.style.borderRadius = '4px';
                preview.style.display = item.imageUrl ? 'block' : 'none';
                if (item.imageUrl) {
                  preview.src = item.imageUrl;
                }

                const clearBtn = document.createElement('button');
                clearBtn.className = 'code-editor-button';
                clearBtn.textContent = 'Clear Image';
                clearBtn.style.marginTop = '4px';
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
        animation: {
          label: 'Sprite Sheet Animation',
          properties: [
            { id: 'frameWidth', label: 'Frame Width', type: 'number', value: item.frameWidth ?? null, min: 1, step: 1 },
            { id: 'frameHeight', label: 'Frame Height', type: 'number', value: item.frameHeight ?? null, min: 1, step: 1 },
            { id: 'totalFrames', label: 'Total Frames', type: 'number', value: item.totalFrames ?? 1, min: 1, step: 1 },
            { id: 'framesPerRow', label: 'Frames Per Row', type: 'number', value: item.framesPerRow ?? 1, min: 1, step: 1 },
            { id: 'currentFrame', label: 'Current Frame', type: 'number', value: item.currentFrame ?? 0, min: 0, step: 1 },
            { id: 'animationSpeed', label: 'Animation Speed', type: 'number', value: item.animationSpeed ?? 10, min: 1, step: 1 }
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

  _initRSS() {
    try {
      this.rssFeed1 = document.getElementById('rss-feed-1');
      this.rssFeed2 = document.getElementById('rss-feed-2');
      this.rssProxy = document.getElementById('rss-proxy');
      this.rssLoadBtn = document.getElementById('rss-load-btn');
      this.rssStartBtn = document.getElementById('rss-start-btn');
      this.rssStopBtn = document.getElementById('rss-stop-btn');

      this.rssModal = document.getElementById('rss-modal');
      this.rssModalClose = document.getElementById('rss-modal-close');
      this.openRssMenu = document.getElementById('open-rss-menu');

      if (this.openRssMenu) {
        this.openRssMenu.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.rssModal) {
            this.rssModal.show();
            setTimeout(() => this.loadFeeds(), 20);
          }
        });
      }

      if (this.rssLoadBtn) this.rssLoadBtn.addEventListener('click', () => this.loadFeeds());
      if (this.rssStartBtn) this.rssStartBtn.addEventListener('click', () => this.startPolling());
      if (this.rssStopBtn) this.rssStopBtn.addEventListener('click', () => this.stopPolling());

      if (this.rssProxy && !this.rssProxy.value) this.rssProxy.value = 'https://corsproxy.io/?';
    } catch (err) {
      console.warn('RSS init skipped or failed', err);
    }
  }
  async _fetchAndParseFeed(url, proxy) {
    try {
      const fetchUrl = proxy && proxy.length > 0 ? proxy + encodeURIComponent(url) : url;
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`Network response was not ok: ${res.status}`);
      const text = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'application/xml');

      if (doc.querySelector('parsererror')) {
        console.warn('XML parse error for', url);
      }

      const items = [];

      const itemNodes = doc.querySelectorAll('item');
      if (itemNodes.length) {
        itemNodes.forEach(node => {
          const title = node.querySelector('title')?.textContent?.trim() || 'No title';
          const link = node.querySelector('link')?.textContent?.trim() || node.querySelector('guid')?.textContent?.trim() || '';
          const guid = node.querySelector('guid')?.textContent?.trim() || link || title;
          const desc = node.querySelector('description')?.textContent?.trim() || '';
          const pub = node.querySelector('pubDate')?.textContent?.trim() || node.querySelector('dc\:date')?.textContent?.trim() || '';
          const pubDate = pub ? new Date(pub) : null;
          items.push({ guid, link, title, description: desc, pubDate, source: url });
        });
        return items;
      }

      const entryNodes = doc.querySelectorAll('entry');
      if (entryNodes.length) {
        entryNodes.forEach(node => {
          const title = node.querySelector('title')?.textContent?.trim() || 'No title';
          const id = node.querySelector('id')?.textContent?.trim() || title;
          const linkEl = node.querySelector('link[rel="alternate"]') || node.querySelector('link');
          const link = linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || '';
          const summary = node.querySelector('summary')?.textContent?.trim() || node.querySelector('content')?.textContent?.trim() || '';
          const pub = node.querySelector('updated')?.textContent?.trim() || node.querySelector('published')?.textContent?.trim() || '';
          const pubDate = pub ? new Date(pub) : null;
          items.push({ guid: id, link, title, description: summary, pubDate, source: url });
        });
        return items;
      }

      return items;
    } catch (err) {
      console.error('Failed to fetch/parse feed', url, err);
      return [];
    }
  }

  async loadFeeds() {
    try {
      const f1 = document.getElementById('rss-feed-1')?.value?.trim();
      const f2 = document.getElementById('rss-feed-2')?.value?.trim();
      const proxy = document.getElementById('rss-proxy')?.value?.trim() || 'https://corsproxy.io/?';

      const urls = [];
      if (f1) urls.push(f1);
      if (f2) urls.push(f2);

      const allItems = [];
      for (const u of urls) {
        const items = await this._fetchAndParseFeed(u, proxy);
        allItems.push(...items.map(i => ({ ...i, source: u })));
      }

      const merged = this._mergeAndDetectNew(allItems);
      this.renderRSS(merged);
    } catch (err) {
      console.error('loadFeeds failed', err);
    }
  }

  _mergeAndDetectNew(items) {
    if (!this._rss) this._rss = { itemsMap: new Map() };

    const newList = [];
    items.forEach(it => {
      const key = it.guid || it.link || (it.title + '|' + (it.pubDate?.toString() || ''));
      if (!this._rss.itemsMap.has(key)) {
        this._rss.itemsMap.set(key, it);
        it._isNew = true;
      } else {
        it._isNew = false;
      }

      if (it.pubDate && !(it.pubDate instanceof Date)) it.pubDate = new Date(it.pubDate);
      this._rss.itemsMap.set(key, { ...this._rss.itemsMap.get(key), ...it });
    });

    const merged = Array.from(this._rss.itemsMap.values()).sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate) : new Date(0);
      const db = b.pubDate ? new Date(b.pubDate) : new Date(0);
      return db - da;
    });

    return merged;
  }

  startPolling(intervalMs = 30000) {
    if (this._rss && this._rss.timer) return;
    this._rss = this._rss || { itemsMap: new Map() };
    this._rss.timer = setInterval(() => this.loadFeeds(), intervalMs);
    console.log('RSS polling started every', intervalMs, 'ms');
  }

  stopPolling() {
    if (this._rss && this._rss.timer) {
      clearInterval(this._rss.timer);
      this._rss.timer = null;
      console.log('RSS polling stopped');
    }
  }

  renderRSS(items) {
    try {
      const container = document.getElementById('rss-list');
      if (!container) return;
      container.innerHTML = '';

      if (!items || items.length === 0) {
        container.innerHTML = '<div style="color:#666;font-size:13px">No items</div>';
        return;
      }

      items.forEach(it => {
        const key = it.guid || it.link || (it.title + '|' + (it.pubDate?.toString() || ''));
        const row = document.createElement('div');
        row.className = 'rss-item';
        row.dataset.key = key;
        row.style.padding = '6px';
        row.style.borderBottom = '1px solid #eee';
        if (it._isNew) {
          row.style.background = '#fff9e6';
        }

        const a = document.createElement('a');
        a.href = it.link || '#';
        a.textContent = it.title || '(no title)';
        a.target = '_blank';
        a.style.display = 'block';
        a.style.fontWeight = '600';

        const meta = document.createElement('div');
        meta.style.fontSize = '12px';
        meta.style.color = '#666';
        const date = it.pubDate ? (new Date(it.pubDate)).toLocaleString() : 'no date';
        meta.textContent = `${date} • ${it.source || ''}`;

        const desc = document.createElement('div');
        desc.style.fontSize = '13px';
        desc.style.marginTop = '4px';
        desc.innerHTML = it.description ? (it.description.length > 300 ? it.description.substring(0, 300) + '…' : it.description) : '';

        row.appendChild(a);
        row.appendChild(meta);
        row.appendChild(desc);

        container.appendChild(row);

        if (it._isNew) {
          setTimeout(() => {
            row.style.background = '';
            it._isNew = false;
          }, 6000);
        }
      });
    } catch (err) {
      console.error('renderRSS failed', err);
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