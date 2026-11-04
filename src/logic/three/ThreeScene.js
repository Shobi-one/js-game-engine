import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ThreeObject } from './ThreeObject.js';
import { Light } from './Light.js';

// The 3D editor scene: renderer, camera, controls, objects, lights and the render loop.
class ThreeScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);
    
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.offsetWidth / container.offsetHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.offsetWidth, container.offsetHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    this.objects = [];
    this.lights = [];
    this._nextObjectId = 0;
    this._nextLightId = 0;
    
    this.gltfLoader = new GLTFLoader();
    this.objLoader = new OBJLoader();
    this.textureLoader = new THREE.TextureLoader();
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedObject = null;
    
    this.clock = new THREE.Clock();
    this.isRunning = false;
    
    this.keys = {};
    
    this._initDefaultScene();
    this._initEventListeners();
    this._animate();
  }

  _initDefaultScene() {
    const gridHelper = new THREE.GridHelper(20, 20);
    this.scene.add(gridHelper);
    
    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);
  }

  clearScene() {
    this.objects.forEach(obj => {
      if (obj.mesh) {
        this.scene.remove(obj.mesh);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      }
    });
    this.objects = [];
    this._nextObjectId = 0;
    
    this.lights.forEach(light => {
      if (light.light) {
        this.scene.remove(light.light);
        if (light.light.target) this.scene.remove(light.light.target);
      }
      if (light.helper) {
        this.scene.remove(light.helper);
      }
    });
    this.lights = [];
    this._nextLightId = 0;
  }

  _initEventListeners() {
    this.renderer.domElement.addEventListener('click', (e) => this._onMouseClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this._onMouseMove(e));
    
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this._handleKeyboard(e);
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    
    window.addEventListener('resize', () => this._onWindowResize());
  }

  _onMouseClick(event) {
    if (!this.isRunning) return;
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const meshes = this.objects.map(obj => obj.mesh).filter(m => m);
    const intersects = this.raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const object = intersects[0].object;
      if (object.userData.interactive) {
        const obj = this.objects.find(o => o.id === object.userData.objectId);
        if (obj) {
          const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
          obj.updateMaterial({ color: randomColor });
          
          obj.velocityY = 0.2;
          
          this.selectedObject = obj;
          console.log('Clicked on:', obj.name);
        }
      }
    }
  }

  _onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _handleKeyboard(event) {
    if (!this.isRunning || !this.selectedObject) return;
    
    const speed = 0.2;
    
    switch(event.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        this.selectedObject.mesh.position.z -= speed;
        this.selectedObject.position.z = this.selectedObject.mesh.position.z;
        break;
      case 's':
      case 'arrowdown':
        this.selectedObject.mesh.position.z += speed;
        this.selectedObject.position.z = this.selectedObject.mesh.position.z;
        break;
      case 'a':
      case 'arrowleft':
        this.selectedObject.mesh.position.x -= speed;
        this.selectedObject.position.x = this.selectedObject.mesh.position.x;
        break;
      case 'd':
      case 'arrowright':
        this.selectedObject.mesh.position.x += speed;
        this.selectedObject.position.x = this.selectedObject.mesh.position.x;
        break;
      case 'q':
        this.selectedObject.mesh.position.y += speed;
        this.selectedObject.position.y = this.selectedObject.mesh.position.y;
        break;
      case 'e':
        this.selectedObject.mesh.position.y -= speed;
        this.selectedObject.position.y = this.selectedObject.mesh.position.y;
        break;
      case ' ':
        event.preventDefault();
        this.selectedObject.velocityY = 0.3;
        break;
    }
  }

  _onWindowResize() {
    this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
  }

  /** Adds an object. `options.id` re-uses an id (undo re-creating a deleted object); `index` sets its place in the list. */
  addObject(options, index = this.objects.length) {
    const id = options.id ?? this._nextObjectId;
    this._nextObjectId = Math.max(this._nextObjectId, id + 1);
    const obj = new ThreeObject(id, options);
    const mesh = obj.createMesh();
    
    if (mesh) {
      this.scene.add(mesh);
      if (mesh.receiveShadow !== undefined) mesh.receiveShadow = true;
      if (mesh.castShadow !== undefined) mesh.castShadow = true;
    }
    
    this.objects.splice(index, 0, obj);
    return obj;
  }

  addLight(options, index = this.lights.length) {
    const id = options.id ?? this._nextLightId;
    this._nextLightId = Math.max(this._nextLightId, id + 1);
    const light = new Light(id, options);
    const lightObj = light.createLight();
    
    if (lightObj) {
      this.scene.add(lightObj);
      if (lightObj.target && this.scene) {
        this.scene.add(lightObj.target);
      }
    }
    
    this.lights.splice(index, 0, light);
    return light;
  }

  async loadGLTFModel(url, options = {}) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          
          if (options.position) model.position.set(options.position.x, options.position.y, options.position.z);
          if (options.rotation) model.rotation.set(options.rotation.x, options.rotation.y, options.rotation.z);
          if (options.scale) model.scale.set(options.scale.x, options.scale.y, options.scale.z);
          
          this.scene.add(model);
          
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
                if (!child.userData) child.userData = {};
            }
          });
          

          const obj = new ThreeObject(this._nextObjectId++, {
            ...options,
            type: 'model',
            modelPath: url
          });
          obj.mesh = model;
          
          if (gltf.animations && gltf.animations.length > 0) {
            obj.animationMixer = new THREE.AnimationMixer(model);
            obj.animations = gltf.animations;
            
            gltf.animations.forEach((clip) => {
              obj.animationActions[clip.name] = obj.animationMixer.clipAction(clip);
            });
            
            if (gltf.animations.length > 0) {
              obj.playAnimation(gltf.animations[0].name);
            }
          }
          
          this.objects.push(obj);
          resolve(obj);
        },
        (xhr) => {
          console.log(`Loading: ${(xhr.loaded / xhr.total * 100)}%`);
        },
        (error) => {
          console.error('Error loading GLTF:', error);
          reject(error);
        }
      );
    });
  }

  async loadOBJModel(url, options = {}) {
    return new Promise((resolve, reject) => {
      this.objLoader.load(
        url,
        (object) => {
          if (options.position) object.position.set(options.position.x, options.position.y, options.position.z);
          if (options.rotation) object.rotation.set(options.rotation.x, options.rotation.y, options.rotation.z);
          if (options.scale) object.scale.set(options.scale.x, options.scale.y, options.scale.z);
          
          if (options.color) {
            object.traverse((child) => {
              if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({ color: options.color });
              }
            });
          }
          
          this.scene.add(object);
          
          object.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
                if (!child.userData) child.userData = {};
            }
          });
          
          const obj = new ThreeObject(this._nextObjectId++, {
            ...options,
            type: 'model',
            modelPath: url
          });
          obj.mesh = object;
          
          this.objects.push(obj);
          resolve(obj);
        },
        (xhr) => {
          console.log(`Loading: ${(xhr.loaded / xhr.total * 100)}%`);
        },
        (error) => {
          console.error('Error loading OBJ:', error);
          reject(error);
        }
      );
    });
  }

  updateObject(id, props) {
    const obj = this.objects.find(o => o.id === id);
    if (obj) {
      obj.update(props);
    }
  }

  updateLight(id, props) {
    const light = this.lights.find(l => l.id === id);
    if (light) {
      light.update(props);
    }
  }

  removeObject(id) {
    const index = this.objects.findIndex(o => o.id === id);
    if (index !== -1) {
      const obj = this.objects[index];
      if (obj.mesh) {
        this.scene.remove(obj.mesh);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      }
      this.objects.splice(index, 1);
    }
  }

  removeLight(id) {
    const index = this.lights.findIndex(l => l.id === id);
    if (index !== -1) {
      const light = this.lights[index];
      if (light.light) {
        this.scene.remove(light.light);
      }
      if (light.helper) {
        this.scene.remove(light.helper);
      }
      this.lights.splice(index, 1);
    }
  }

  getObject(id) {
    return this.objects.find(o => o.id === id);
  }

  getLight(id) {
    return this.lights.find(l => l.id === id);
  }

  getAllObjects() {
    return this.objects;
  }

  getAllLights() {
    return this.lights;
  }

  start() {
    if (!this.isRunning) window.dispatchEvent(new CustomEvent('clipengine:run-start', { detail: { mode: '3d' } }));
    this.isRunning = true;
    this.onRunChange?.(true);
  }

  stop() {
    if (this.isRunning) window.dispatchEvent(new CustomEvent('clipengine:run-stop', { detail: { mode: '3d' } }));
    this.isRunning = false;
    this.onRunChange?.(false);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    
    const delta = this.clock.getDelta();
    
    if (this.isRunning) {
      this.objects.forEach(obj => {
        obj.updateAnimation(delta);
        obj.runCode(true);
        
        if (obj.velocityY !== 0) {
          obj.mesh.position.y += obj.velocityY;
          obj.velocityY -= 0.01;
          
          if (obj.mesh.position.y <= 0.5) {
            obj.mesh.position.y = 0.5;
            obj.velocityY = 0;
          }
          
          obj.position.y = obj.mesh.position.y;
        }
      });
    }
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
    this.controls.dispose();
    
    this.objects.forEach(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

export { ThreeScene };
