import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class ThreeObject {
  constructor(id, options = {}) {
    this.id = id;
    this.type = options.type || 'box';
    this.name = options.name || `Object ${id}`;
    this.position = options.position || { x: 0, y: 0, z: 0 };
    this.rotation = options.rotation || { x: 0, y: 0, z: 0 };
    this.scale = options.scale || { x: 1, y: 1, z: 1 };
    this.color = options.color || '#00ff00';
    this.wireframe = options.wireframe || false;
    this.transparent = options.transparent || false;
    this.opacity = options.opacity || 1.0;
    this.metalness = options.metalness || 0.5;
    this.roughness = options.roughness || 0.5;
    this.modelPath = options.modelPath || null;
    this.textureUrl = options.textureUrl || null;
    
    this.animations = [];
    this.currentAnimation = null;
    this.animationMixer = null;
    this.animationActions = {};
    
    this.interactive = options.interactive || false;
    this.velocityX = 0;
    this.velocityY = 0;
    this.velocityZ = 0;
    this.code = options.code || '// Write your 3D object logic here\n// this.mesh.rotation.y += 0.01;\n// this.mesh.position.y = Math.sin(Date.now() * 0.001) * 2;';
    
    this.mesh = null;
    this.material = null;
    this.geometry = null;
  }

  createMesh() {
    if (this.type === 'model') {
      return null;
    }

    switch (this.type) {
      case 'sphere':
        this.geometry = new THREE.SphereGeometry(1, 32, 32);
        break;
      case 'cylinder':
        this.geometry = new THREE.CylinderGeometry(1, 1, 2, 32);
        break;
      case 'cone':
        this.geometry = new THREE.ConeGeometry(1, 2, 32);
        break;
      case 'torus':
        this.geometry = new THREE.TorusGeometry(1, 0.4, 16, 100);
        break;
      case 'plane':
        this.geometry = new THREE.PlaneGeometry(2, 2);
        break;
      case 'box':
      default:
        this.geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    this.material = new THREE.MeshStandardMaterial({
      color: this.color,
      wireframe: this.wireframe,
      transparent: this.transparent,
      opacity: this.opacity,
      metalness: this.metalness,
      roughness: this.roughness
    });

    if (this.textureUrl) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(this.textureUrl, (texture) => {
        this.material.map = texture;
        this.material.needsUpdate = true;
      });
    }

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
    this.mesh.scale.set(this.scale.x, this.scale.y, this.scale.z);
    
    if (!this.mesh.userData) this.mesh.userData = {};
    this.mesh.userData.objectId = this.id;
    this.mesh.userData.interactive = this.interactive;
    this.userData = this.mesh.userData;

    return this.mesh;
  }

  updateMaterial(props) {
    if (!this.material) return;
    
    if (props.color !== undefined) {
      this.color = props.color;
      this.material.color.set(props.color);
    }
    if (props.wireframe !== undefined) {
      this.wireframe = props.wireframe;
      this.material.wireframe = props.wireframe;
    }
    if (props.transparent !== undefined) {
      this.transparent = props.transparent;
      this.material.transparent = props.transparent;
    }
    if (props.opacity !== undefined) {
      this.opacity = props.opacity;
      this.material.opacity = props.opacity;
    }
    if (props.metalness !== undefined) {
      this.metalness = props.metalness;
      this.material.metalness = props.metalness;
    }
    if (props.roughness !== undefined) {
      this.roughness = props.roughness;
      this.material.roughness = props.roughness;
    }
    if (props.textureUrl !== undefined) {
      this.textureUrl = props.textureUrl;
      if (props.textureUrl) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(props.textureUrl, (texture) => {
          this.material.map = texture;
          this.material.needsUpdate = true;
        });
      } else {
        this.material.map = null;
        this.material.needsUpdate = true;
      }
    }
    
    this.material.needsUpdate = true;
  }

  update(props) {
    Object.assign(this, props);
    
    if (this.mesh) {
      if (props.position) {
        this.mesh.position.set(props.position.x, props.position.y, props.position.z);
      }
      if (props.rotation) {
        this.mesh.rotation.set(props.rotation.x, props.rotation.y, props.rotation.z);
      }
      if (props.scale) {
        this.mesh.scale.set(props.scale.x, props.scale.y, props.scale.z);
      }
    }
    
    if (this.material && (props.color || props.wireframe !== undefined || props.transparent !== undefined || 
        props.opacity !== undefined || props.metalness !== undefined || props.roughness !== undefined || props.textureUrl !== undefined)) {
      this.updateMaterial(props);
    }
  }

  playAnimation(name) {
    if (!this.animationMixer || !this.animationActions[name]) return;
    
    if (this.currentAnimation && this.animationActions[this.currentAnimation]) {
      this.animationActions[this.currentAnimation].stop();
    }
    
    this.currentAnimation = name;
    this.animationActions[name].reset();
    this.animationActions[name].play();
  }

  runCode(isRunning) {
    if (!isRunning || !this.code || !this.mesh) return;
    
    try {
      const fn = new Function('THREE', this.code).bind(this);
      fn(THREE);
    } catch (err) {
      console.error(`Error in object ${this.id} code:`, err);
    }
  }

  updateAnimation(delta) {
    if (this.animationMixer) {
      this.animationMixer.update(delta);
    }
  }
}

class Light {
  constructor(id, options = {}) {
    this.id = id;
    this.type = options.type || 'point';
    this.name = options.name || `Light ${id}`;
    this.color = options.color || '#ffffff';
    this.intensity = options.intensity || 1.0;
    this.position = options.position || { x: 0, y: 5, z: 0 };
    this.target = options.target || { x: 0, y: 0, z: 0 };
    this.castShadow = options.castShadow || false;
    
    this.angle = options.angle || Math.PI / 4;
    this.penumbra = options.penumbra || 0.1;
    this.decay = options.decay || 2;
    this.distance = options.distance || 0;
    
    this.groundColor = options.groundColor || '#444444';
    
    this.light = null;
    this.helper = null;
  }

  createLight() {
    switch (this.type) {
      case 'ambient':
        this.light = new THREE.AmbientLight(this.color, this.intensity);
        break;
      
      case 'directional':
        this.light = new THREE.DirectionalLight(this.color, this.intensity);
        this.light.position.set(this.position.x, this.position.y, this.position.z);
        this.light.castShadow = this.castShadow;
        if (this.castShadow) {
          this.light.shadow.mapSize.width = 2048;
          this.light.shadow.mapSize.height = 2048;
          this.light.shadow.camera.near = 0.5;
          this.light.shadow.camera.far = 500;
        }
        break;
      
      case 'point':
        this.light = new THREE.PointLight(this.color, this.intensity, this.distance, this.decay);
        this.light.position.set(this.position.x, this.position.y, this.position.z);
        this.light.castShadow = this.castShadow;
        break;
      
      case 'spot':
        this.light = new THREE.SpotLight(this.color, this.intensity, this.distance, this.angle, this.penumbra, this.decay);
        this.light.position.set(this.position.x, this.position.y, this.position.z);
        this.light.target.position.set(this.target.x, this.target.y, this.target.z);
        this.light.castShadow = this.castShadow;
        break;
      
      case 'hemisphere':
        this.light = new THREE.HemisphereLight(this.color, this.groundColor, this.intensity);
        this.light.position.set(this.position.x, this.position.y, this.position.z);
        break;
    }
    
    if (this.light) {
      this.light.userData.lightId = this.id;
    }
    
    return this.light;
  }

  update(props) {
    Object.assign(this, props);
    
    if (this.light) {
      if (props.color !== undefined) {
        this.light.color.set(props.color);
      }
      if (props.intensity !== undefined) {
        this.light.intensity = props.intensity;
      }
      if (props.position) {
        this.light.position.set(props.position.x, props.position.y, props.position.z);
      }
      if (props.castShadow !== undefined && this.light.castShadow !== undefined) {
        this.light.castShadow = props.castShadow;
      }
      
      if (this.type === 'spot' && this.light.target && props.target) {
        this.light.target.position.set(props.target.x, props.target.y, props.target.z);
      }
      if (this.type === 'hemisphere' && props.groundColor) {
        this.light.groundColor.set(props.groundColor);
      }
    }
  }

  toggleHelper(scene, show) {
    if (show && !this.helper && this.light) {
      switch (this.type) {
        case 'directional':
          this.helper = new THREE.DirectionalLightHelper(this.light, 1);
          break;
        case 'point':
          this.helper = new THREE.PointLightHelper(this.light, 0.5);
          break;
        case 'spot':
          this.helper = new THREE.SpotLightHelper(this.light);
          break;
        case 'hemisphere':
          this.helper = new THREE.HemisphereLightHelper(this.light, 1);
          break;
      }
      if (this.helper) {
        scene.add(this.helper);
      }
    } else if (!show && this.helper) {
      scene.remove(this.helper);
      this.helper = null;
    }
  }
}

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

  loadExampleScene() {
    this.clearScene();
    
    this.addLight({
      type: 'ambient',
      name: 'Ambient Light',
      color: '#404040',
      intensity: 0.5
    });
    
    this.addLight({
      type: 'directional',
      name: 'Sun Light',
      color: '#ffffff',
      intensity: 1.0,
      position: { x: 5, y: 10, z: 5 },
      castShadow: true
    });
    
    this.addLight({
      type: 'point',
      name: 'Accent Light',
      color: '#ff6600',
      intensity: 0.8,
      position: { x: -5, y: 3, z: 0 }
    });
    
    this.addObject({
      type: 'plane',
      name: 'Floor',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: -Math.PI / 2, y: 0, z: 0 },
      scale: { x: 10, y: 10, z: 1 },
      color: '#333333',
      metalness: 0.1,
      roughness: 0.8
    });
    
    this.addObject({
      type: 'box',
      name: 'Rotating Cube',
      position: { x: 0, y: 1, z: 0 },
      color: '#00ff00',
      interactive: true,
      code: 'this.mesh.rotation.y += 0.01;\nthis.mesh.rotation.x += 0.005;'
    });
    
    this.addObject({
      type: 'sphere',
      name: 'Bouncing Sphere',
      position: { x: 3, y: 1, z: 0 },
      color: '#ff0000',
      metalness: 0.8,
      roughness: 0.2,
      code: 'this.mesh.position.y = Math.abs(Math.sin(Date.now() * 0.002)) * 3 + 0.5;'
    });
    
    this.addObject({
      type: 'cylinder',
      name: 'Cylinder',
      position: { x: -3, y: 1, z: 0 },
      color: '#0000ff',
      code: 'this.mesh.rotation.y += 0.02;'
    });
    
    this.addObject({
      type: 'torus',
      name: 'Torus',
      position: { x: 0, y: 2, z: 3 },
      color: '#ffff00',
      code: 'this.mesh.rotation.x += 0.01;\nthis.mesh.rotation.z += 0.015;'
    });
    
    this.addObject({
      type: 'cone',
      name: 'Cone',
      position: { x: 0, y: 1, z: -3 },
      color: '#ff00ff',
      interactive: true
    });
  }

  loadEmptyScene() {
    this.clearScene();
    
    this.addLight({
      type: 'ambient',
      name: 'Ambient Light',
      color: '#404040',
      intensity: 0.5
    });
    
    this.addLight({
      type: 'directional',
      name: 'Main Light',
      color: '#ffffff',
      intensity: 1.0,
      position: { x: 5, y: 10, z: 5 },
      castShadow: true
    });
    
    this.addObject({
      type: 'plane',
      name: 'Floor',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: -Math.PI / 2, y: 0, z: 0 },
      scale: { x: 10, y: 10, z: 1 },
      color: '#333333',
      metalness: 0.1,
      roughness: 0.8
    });
  }

  loadLightingDemoScene() {
    this.clearScene();
    
    this.addLight({
      type: 'ambient',
      name: 'Ambient Base',
      color: '#202020',
      intensity: 0.3
    });
    
    this.addLight({
      type: 'directional',
      name: 'Sun',
      color: '#ffffcc',
      intensity: 0.8,
      position: { x: 10, y: 10, z: 5 },
      castShadow: true
    });
    
    this.addLight({
      type: 'point',
      name: 'Red Light',
      color: '#ff0000',
      intensity: 1.5,
      position: { x: -3, y: 2, z: 0 }
    });
    
    this.addLight({
      type: 'point',
      name: 'Blue Light',
      color: '#0000ff',
      intensity: 1.5,
      position: { x: 3, y: 2, z: 0 }
    });
    
    this.addLight({
      type: 'spot',
      name: 'Spotlight',
      color: '#ffffff',
      intensity: 2.0,
      position: { x: 0, y: 8, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      angle: Math.PI / 6,
      castShadow: true
    });
    
    this.addLight({
      type: 'hemisphere',
      name: 'Sky Light',
      color: '#87ceeb',
      groundColor: '#8b4513',
      intensity: 0.5,
      position: { x: 0, y: 10, z: 0 }
    });
    
    this.addObject({
      type: 'plane',
      name: 'Floor',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: -Math.PI / 2, y: 0, z: 0 },
      scale: { x: 15, y: 15, z: 1 },
      color: '#ffffff',
      metalness: 0.8,
      roughness: 0.2
    });
    
    this.addObject({
      type: 'sphere',
      name: 'Center Sphere',
      position: { x: 0, y: 1, z: 0 },
      color: '#cccccc',
      metalness: 0.5,
      roughness: 0.3
    });
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 4;
      this.addObject({
        type: i % 2 === 0 ? 'box' : 'cylinder',
        name: `Object ${i + 1}`,
        position: {
          x: Math.cos(angle) * radius,
          y: 1,
          z: Math.sin(angle) * radius
        },
        color: '#ffffff',
        metalness: 0.7,
        roughness: 0.3
      });
    }
  }

  loadAnimationShowcase() {
    this.clearScene();
    
    this.addLight({
      type: 'ambient',
      name: 'Ambient Light',
      color: '#404040',
      intensity: 0.5
    });
    
    this.addLight({
      type: 'directional',
      name: 'Sun Light',
      color: '#ffffff',
      intensity: 1.0,
      position: { x: 5, y: 10, z: 5 },
      castShadow: true
    });
    
    // Floor
    this.addObject({
      type: 'plane',
      name: 'Floor',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: -Math.PI / 2, y: 0, z: 0 },
      scale: { x: 15, y: 15, z: 1 },
      color: '#333333',
      metalness: 0.1,
      roughness: 0.8
    });
    
    this.addObject({
      type: 'box',
      name: 'Spinning Cube',
      position: { x: -4, y: 1, z: 0 },
      color: '#ff0000',
      code: 'this.mesh.rotation.x += 0.02;\nthis.mesh.rotation.y += 0.03;\nthis.mesh.rotation.z += 0.01;'
    });
    
    this.addObject({
      type: 'sphere',
      name: 'Bouncing Ball',
      position: { x: -2, y: 1, z: 0 },
      color: '#00ff00',
      code: 'this.mesh.position.y = Math.abs(Math.sin(Date.now() * 0.003)) * 4 + 0.5;'
    });
    
    this.addObject({
      type: 'torus',
      name: 'Orbiting Torus',
      position: { x: 0, y: 1, z: 0 },
      color: '#0000ff',
      code: 'const t = Date.now() * 0.001;\nthis.mesh.position.x = Math.cos(t) * 2;\nthis.mesh.position.z = Math.sin(t) * 2;\nthis.mesh.rotation.x += 0.01;'
    });
    
    this.addObject({
      type: 'cylinder',
      name: 'Pulsing Cylinder',
      position: { x: 2, y: 1, z: 0 },
      color: '#ffff00',
      code: 'const scale = 1 + Math.sin(Date.now() * 0.002) * 0.5;\nthis.mesh.scale.set(scale, 1, scale);'
    });
    
    this.addObject({
      type: 'cone',
      name: 'Wave Cone',
      position: { x: 4, y: 1, z: 0 },
      color: '#ff00ff',
      code: 'this.mesh.position.x = 4 + Math.sin(Date.now() * 0.002) * 2;\nthis.mesh.rotation.y += 0.02;'
    });
    
    this.addObject({
      type: 'sphere',
      name: 'Color Cycle',
      position: { x: 0, y: 2, z: -3 },
      color: '#ffffff',
      code: 'if (!this.colorTime) this.colorTime = 0;\nthis.colorTime += 0.01;\nconst hue = (this.colorTime % 1.0);\nthis.material.color.setHSL(hue, 1.0, 0.5);'
    });
  }

  loadPhysicsPlayground() {
    this.clearScene();
    
    this.addLight({
      type: 'ambient',
      name: 'Ambient Light',
      color: '#404040',
      intensity: 0.5
    });
    
    this.addLight({
      type: 'directional',
      name: 'Sun Light',
      color: '#ffffff',
      intensity: 1.0,
      position: { x: 5, y: 10, z: 5 },
      castShadow: true
    });
    
    // Floor
    this.addObject({
      type: 'plane',
      name: 'Floor',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: -Math.PI / 2, y: 0, z: 0 },
      scale: { x: 15, y: 15, z: 1 },
      color: '#556b2f',
      metalness: 0.1,
      roughness: 0.9
    });
    
    for (let i = 0; i < 5; i++) {
      this.addObject({
        type: 'sphere',
        name: `Ball ${i + 1}`,
        position: { x: (i - 2) * 2, y: 3 + Math.random() * 3, z: 0 },
        color: `hsl(${i * 60}, 70%, 50%)`,
        interactive: true,
        code: `if (!this.velocityY) this.velocityY = 0;
this.velocityY -= 0.02;
this.mesh.position.y += this.velocityY;
if (this.mesh.position.y <= 0.5) {
  this.mesh.position.y = 0.5;
  this.velocityY = Math.abs(this.velocityY) * 0.8;
}
this.mesh.rotation.x += 0.1;
this.mesh.rotation.z += 0.05;`
      });
    }
    
    this.addObject({
      type: 'box',
      name: 'Interactive Box 1',
      position: { x: -4, y: 1, z: -3 },
      color: '#ff6600',
      interactive: true
    });
    
    this.addObject({
      type: 'box',
      name: 'Interactive Box 2',
      position: { x: 4, y: 1, z: -3 },
      color: '#6600ff',
      interactive: true
    });
    
    this.addObject({
      type: 'cylinder',
      name: 'Pendulum',
      position: { x: 0, y: 4, z: 3 },
      scale: { x: 0.1, y: 2, z: 0.1 },
      color: '#888888',
      code: `if (!this.angle) this.angle = Math.PI / 4;
if (!this.velocity) this.velocity = 0;
const gravity = 0.001;
const length = 2;
this.velocity += (-gravity / length) * Math.sin(this.angle);
this.angle += this.velocity;
this.velocity *= 0.99;
this.mesh.position.x = Math.sin(this.angle) * length;
this.mesh.position.y = 4 - Math.cos(this.angle) * length;
this.mesh.rotation.z = this.angle;`
    });
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

  addObject(options) {
    const obj = new ThreeObject(this._nextObjectId++, options);
    const mesh = obj.createMesh();
    
    if (mesh) {
      this.scene.add(mesh);
      if (mesh.receiveShadow !== undefined) mesh.receiveShadow = true;
      if (mesh.castShadow !== undefined) mesh.castShadow = true;
    }
    
    this.objects.push(obj);
    return obj;
  }

  addLight(options) {
    const light = new Light(this._nextLightId++, options);
    const lightObj = light.createLight();
    
    if (lightObj) {
      this.scene.add(lightObj);
      if (lightObj.target && this.scene) {
        this.scene.add(lightObj.target);
      }
    }
    
    this.lights.push(light);
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
    this.isRunning = true;
  }

  stop() {
    this.isRunning = false;
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

export { ThreeScene, ThreeObject, Light };
