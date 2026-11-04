import * as THREE from 'three';
import { mergeVectors } from './vectors.js';
import { compileBehavior } from '../behavior.js';

// One mesh in a 3D scene: geometry, material, optional model animations and behavior code.
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
    // New code gets a fresh chance to report its errors.
    if ('code' in props) this._lastCodeError = null;
    // The properties panel sends one axis at a time ({ position: { x } }): keep the other axes.
    props = mergeVectors(this, props);
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
      const fn = compileBehavior(this.code, ['THREE']);
      if (fn) fn.call(this, THREE);
      this._lastCodeError = null;
    } catch (err) {
      // A syntax error is the same cached error every frame, so log it once (until the code runs or changes).
      if (err !== this._lastCodeError) console.error(`Error in object ${this.id} code:`, err);
      this._lastCodeError = err;
    }
  }

  updateAnimation(delta) {
    if (this.animationMixer) {
      this.animationMixer.update(delta);
    }
  }
}

export { ThreeObject };
