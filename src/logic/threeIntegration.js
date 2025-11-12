import { ThreeScene } from './threeScene.js';
import { ThreeEditorUI } from './threeUI.js';
import { SceneLoader } from './sceneLoader.js';

class EngineController {
  constructor() {
    this.mode = '2d';
    this.threeScene = null;
    this.threeUI = null;
    
    this._initViewMenu();
    this._initModelLoader();
    this._initLightCreator();
  }

  _initViewMenu() {
    const viewMenu = document.querySelector('menu-item[text="View"]');
    const viewDropdown = document.getElementById('view-menu');
    
    if (viewMenu && viewDropdown) {
      viewMenu.addEventListener('click', () => {
        viewDropdown.style.display = viewDropdown.style.display === 'block' ? 'none' : 'block';
        viewMenu.shadowRoot.querySelector('.menu-item').classList.toggle('active');
        const rect = viewMenu.getBoundingClientRect();
        viewDropdown.style.top = `${rect.bottom}px`;
        viewDropdown.style.left = `${rect.left}px`;
      });
      
      document.addEventListener('click', (e) => {
        if (!viewMenu.contains(e.target) && !viewDropdown.contains(e.target)) {
          viewDropdown.style.display = 'none';
          viewMenu.shadowRoot.querySelector('.menu-item').classList.remove('active');
        }
      });
    }
    
    document.getElementById('view-2d').addEventListener('click', () => {
      this.switchTo2D();
      viewDropdown.style.display = 'none';
    });
    
    document.getElementById('view-3d').addEventListener('click', () => {
      this.switchTo3D();
      viewDropdown.style.display = 'none';
    });
    
    this._initFileMenu();
    this._initEditMenu();
  }
  
  _initEditMenu() {
    const editMenu = document.querySelector('menu-item[text="Edit"]');
    const editDropdown = document.getElementById('edit-menu');
    
    if (editMenu && editDropdown) {
      editMenu.addEventListener('click', () => {
        editDropdown.style.display = editDropdown.style.display === 'block' ? 'none' : 'block';
        editMenu.shadowRoot.querySelector('.menu-item').classList.toggle('active');
        const rect = editMenu.getBoundingClientRect();
        editDropdown.style.top = `${rect.bottom}px`;
        editDropdown.style.left = `${rect.left}px`;
      });
      
      document.addEventListener('click', (e) => {
        if (!editMenu.contains(e.target) && !editDropdown.contains(e.target)) {
          editDropdown.style.display = 'none';
          editMenu.shadowRoot.querySelector('.menu-item').classList.remove('active');
        }
      });
    }
    
    document.getElementById('open-audio-engine').addEventListener('click', () => {
      if (window.audioUI) {
        window.audioUI.show();
      }
      editDropdown.style.display = 'none';
    });
  }

  _initFileMenu() {
    const fileMenu = document.querySelector('menu-item[text="File"]');
    const fileDropdown = document.getElementById('file-menu');
    
    if (fileMenu && fileDropdown) {
      fileMenu.addEventListener('click', () => {
        fileDropdown.style.display = fileDropdown.style.display === 'block' ? 'none' : 'block';
        fileMenu.shadowRoot.querySelector('.menu-item').classList.toggle('active');
        const rect = fileMenu.getBoundingClientRect();
        fileDropdown.style.top = `${rect.bottom}px`;
        fileDropdown.style.left = `${rect.left}px`;
      });
      
      document.addEventListener('click', (e) => {
        if (!fileMenu.contains(e.target) && !fileDropdown.contains(e.target)) {
          fileDropdown.style.display = 'none';
          fileMenu.shadowRoot.querySelector('.menu-item').classList.remove('active');
        }
      });
    }
    
    document.getElementById('scene-2d-new').addEventListener('click', () => {
      this._load2DScene('scenes/2d-empty.json');
      fileDropdown.style.display = 'none';
    });
    
    document.getElementById('scene-2d-sample').addEventListener('click', () => {
      this._load2DScene('scenes/2d-sample.json');
      fileDropdown.style.display = 'none';
    });
    
    document.getElementById('scene-2d-audio-demo').addEventListener('click', () => {
      this._load2DScene('scenes/2d-audio-demo.json');
      fileDropdown.style.display = 'none';
    });
    
    document.getElementById('scene-3d-empty').addEventListener('click', () => {
      this._loadPresetScene('scenes/3d-empty.json');
      fileDropdown.style.display = 'none';
    });
    
    document.getElementById('scene-3d-example').addEventListener('click', () => {
      this._loadPresetScene('scenes/3d-example.json');
      fileDropdown.style.display = 'none';
    });
  }

  async _load2DScene(jsonPath) {
    if (this.mode !== '2d') {
      this.switchTo2D();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (window.gameController) {
      window.gameController.stopGame();
    }
    
    try {
      if (window.p5Instance && (!window.p5Instance.width || window.p5Instance.width <= 100)) {
        console.warn('p5Instance dimensions not ready, waiting...');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await SceneLoader.load2DScene(jsonPath, window.scene, window.p5Instance);
      
      if (window.editorUI) {
        const explorer = document.getElementById('project-explorer');
        const treeItems = explorer.querySelectorAll('.tree-item');
        treeItems.forEach(item => item.remove());
        
        if (window.scene && window.scene.sprites) {
          window.scene.sprites.forEach(sprite => {
            window.editorUI.addItemToExplorer(sprite);
          });
        }
      }
      
      console.log(`Successfully loaded 2D scene from ${jsonPath}`);
    } catch (error) {
      console.error('Failed to load 2D scene:', error);
      alert(`Failed to load scene: ${error.message}`);
    }
  }

  _loadPresetScene(jsonPath) {
    if (this.mode !== '3d') {
      this.switchTo3D();
      setTimeout(() => this._loadPresetSceneActual(jsonPath), 100);
    } else {
      this._loadPresetSceneActual(jsonPath);
    }
  }

  async _loadPresetSceneActual(jsonPath) {
    if (!this.threeScene) {
      console.error('Three.js scene not initialized');
      return;
    }
    
    this.threeScene.stop();
    
    try {
      await SceneLoader.load3DScene(jsonPath, this.threeScene);
      
      if (this.threeUI) {
        this.threeUI._populateExplorer();
        this.threeUI.renderProperties(null);
      }
      
      console.log(`Successfully loaded 3D scene from ${jsonPath}`);
    } catch (error) {
      console.error('Failed to load 3D scene:', error);
      alert(`Failed to load scene: ${error.message}`);
    }
  }

  switchTo2D() {
    if (this.mode === '2d') return;
    
    this.mode = '2d';
    
    document.getElementById('canvas-container').style.display = 'block';
    document.getElementById('project-explorer').style.display = 'block';
    
    document.getElementById('three-container').style.display = 'none';
    document.getElementById('three-explorer').style.display = 'none';
    
    document.getElementById('viewport-title').textContent = 'Scene Viewport - 2D Mode';
    
    if (this.threeScene) {
      this.threeScene.stop();
    }
    
    if (window.gameController) {
      window.gameController.stopGame();
    }
    
    console.log('Switched to 2D mode');
  }

  switchTo3D() {
    if (this.mode === '3d') return;
    
    this.mode = '3d';
    
    document.getElementById('canvas-container').style.display = 'none';
    document.getElementById('project-explorer').style.display = 'none';
    
    const threeContainer = document.getElementById('three-container');
    threeContainer.style.display = 'block';
    document.getElementById('three-explorer').style.display = 'block';
    
    document.getElementById('viewport-title').textContent = 'Scene Viewport - 3D Mode';
    
    if (!this.threeScene) {
      threeContainer.innerHTML = '';
      
      this.threeScene = new ThreeScene(threeContainer);
      this.threeUI = new ThreeEditorUI(this.threeScene);
      
      window.threeScene = this.threeScene;
      window.threeUI = this.threeUI;
      
      this._setupThreeGameControls();
    }
    
    console.log('Switched to 3D mode');
  }

  _setupThreeGameControls() {
    const runGame = document.getElementById('run-game');
    const stopGame = document.getElementById('stop-game');
    
    if (!this._originalRunHandler) {
      this._originalRunHandler = runGame.onclick;
      this._originalStopHandler = stopGame.onclick;
    }
    
    runGame.onclick = () => {
      if (this.mode === '2d') {
        if (window.gameController) {
          window.gameController.startGame();
        }
      } else if (this.mode === '3d') {
        if (this.threeScene) {
          this.threeScene.start();
          document.getElementById('three-container').classList.remove('paused');
        }
      }
      document.getElementById('run-menu').style.display = 'none';
    };
    
    stopGame.onclick = () => {
      if (this.mode === '2d') {
        if (window.gameController) {
          window.gameController.stopGame();
        }
      } else if (this.mode === '3d') {
        if (this.threeScene) {
          this.threeScene.stop();
          document.getElementById('three-container').classList.add('paused');
        }
      }
      document.getElementById('run-menu').style.display = 'none';
    };
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F6') {
        e.preventDefault();
        if (e.shiftKey) {
          stopGame.onclick();
        } else {
          runGame.onclick();
        }
      }
    });
  }

  _initModelLoader() {
    const modal = document.getElementById('model-loader-modal');
    const cancelBtn = document.getElementById('model-cancel-btn');
    const loadBtn = document.getElementById('model-load-btn');
    const modelFile = document.getElementById('model-file');
    const modelUrl = document.getElementById('model-url');
    const modelType = document.getElementById('model-type');
    
    // Close button is now handled by the modal component
    
    cancelBtn.addEventListener('click', () => {
      modal.hide();
    });
    
    loadBtn.addEventListener('click', async () => {
      if (!this.threeScene) {
        alert('Please switch to 3D mode first');
        return;
      }
      
      const type = modelType.value;
      let url = modelUrl.value.trim();
      
      if (modelFile.files.length > 0) {
        const file = modelFile.files[0];
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          const dataUrl = e.target.result;
          
          try {
            let obj;
            if (type === 'gltf') {
              obj = await this.threeScene.loadGLTFModel(dataUrl, {
                name: file.name,
                position: { x: 0, y: 1, z: 0 }
              });
            } else if (type === 'obj') {
              obj = await this.threeScene.loadOBJModel(dataUrl, {
                name: file.name,
                position: { x: 0, y: 1, z: 0 },
                color: '#cccccc'
              });
            }
            
            if (obj && this.threeUI) {
              this.threeUI.addItemToExplorer(obj, 'object');
              this.threeUI.selectItem('object', obj.id);
            }
            
            modal.hide();
            modelFile.value = '';
            modelUrl.value = '';
          } catch (error) {
            alert('Failed to load model: ' + error.message);
          }
        };
        
        reader.readAsDataURL(file);
      } else if (url) {
        try {
          let obj;
          if (type === 'gltf') {
            obj = await this.threeScene.loadGLTFModel(url, {
              name: 'Loaded Model',
              position: { x: 0, y: 1, z: 0 }
            });
          } else if (type === 'obj') {
            obj = await this.threeScene.loadOBJModel(url, {
              name: 'Loaded Model',
              position: { x: 0, y: 1, z: 0 },
              color: '#cccccc'
            });
          }
          
          if (obj && this.threeUI) {
            this.threeUI.addItemToExplorer(obj, 'object');
            this.threeUI.selectItem('object', obj.id);
          }
          
          modal.hide();
          modelFile.value = '';
          modelUrl.value = '';
        } catch (error) {
          alert('Failed to load model: ' + error.message);
        }
      } else {
        alert('Please select a file or enter a URL');
      }
    });
  }

  _initLightCreator() {
    const modal = document.getElementById('light-creator-modal');
    const cancelBtn = document.getElementById('light-cancel-btn');
    const createBtn = document.getElementById('light-create-btn');
    const lightType = document.getElementById('light-type');
    const lightColor = document.getElementById('light-color');
    const lightIntensity = document.getElementById('light-intensity');
    const intensityValue = document.getElementById('light-intensity-value');
    
    lightIntensity.addEventListener('input', () => {
      intensityValue.textContent = parseFloat(lightIntensity.value).toFixed(1);
    });
    
    // Close button is now handled by the modal component
    
    cancelBtn.addEventListener('click', () => {
      modal.hide();
    });
    
    createBtn.addEventListener('click', () => {
      if (!this.threeScene) {
        alert('Please switch to 3D mode first');
        return;
      }
      
      const type = lightType.value;
      const color = lightColor.value;
      const intensity = parseFloat(lightIntensity.value);
      
      const light = this.threeScene.addLight({
        type: type,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Light`,
        color: color,
        intensity: intensity,
        position: { x: 0, y: 5, z: 0 }
      });
      
      if (light && this.threeUI) {
        this.threeUI.addItemToExplorer(light, 'light');
        this.threeUI.selectItem('light', light.id);
      }
      
      modal.hide();
    });
  }
}

const engineController = new EngineController();
window.engineController = engineController;

engineController.switchTo2D();

export { EngineController };
