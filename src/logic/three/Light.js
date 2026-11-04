import * as THREE from 'three';
import { mergeVectors } from './vectors.js';

// A light in a 3D scene, with an optional helper gizmo.
class Light {
  constructor(id, options = {}) {
    this.id = id;
    this.type = options.type || 'point';
    this.name = options.name || `Light ${id}`;
    this.color = options.color || '#ffffff';
    this.intensity = options.intensity ?? 1.0;
    this.position = options.position || { x: 0, y: 5, z: 0 };
    this.target = options.target || { x: 0, y: 0, z: 0 };
    this.castShadow = options.castShadow || false;
    
    this.angle = options.angle ?? Math.PI / 4;
    this.penumbra = options.penumbra ?? 0.1;
    this.decay = options.decay ?? 2;
    this.distance = options.distance ?? 0;
    
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
    // The properties panel sends one axis at a time ({ position: { x } }): keep the other axes.
    props = mergeVectors(this, props);
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

export { Light };
