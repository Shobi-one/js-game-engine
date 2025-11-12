export class SceneLoader {
  static async load3DScene(path, threeScene) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load scene: ${response.statusText}`);
      }
      
      const sceneData = await response.json();
      
      if (sceneData.type !== '3d') {
        throw new Error('Invalid scene type. Expected 3D scene.');
      }
      
      threeScene.clearScene();
      
      if (sceneData.objects) {
        sceneData.objects.forEach(objData => {
          const obj = threeScene.addObject({
            type: objData.type,
            name: objData.name,
            position: objData.position || { x: 0, y: 0, z: 0 },
            rotation: objData.rotation || { x: 0, y: 0, z: 0 },
            scale: objData.scale || { x: 1, y: 1, z: 1 },
            color: objData.color || '#ffffff',
            castShadow: objData.castShadow !== undefined ? objData.castShadow : true,
            receiveShadow: objData.receiveShadow !== undefined ? objData.receiveShadow : true
          });
          
          if (objData.animation && objData.animation.code) {
            obj.code = objData.animation.code;
          }
        });
      }
      
      if (sceneData.lights) {
        sceneData.lights.forEach(lightData => {
          const config = {
            type: lightData.type,
            name: lightData.name,
            color: lightData.color || '#ffffff',
            intensity: lightData.intensity !== undefined ? lightData.intensity : 1
          };
          
          if (lightData.position) config.position = lightData.position;
          if (lightData.castShadow !== undefined) config.castShadow = lightData.castShadow;
          if (lightData.distance !== undefined) config.distance = lightData.distance;
          if (lightData.angle !== undefined) config.angle = lightData.angle;
          if (lightData.penumbra !== undefined) config.penumbra = lightData.penumbra;
          if (lightData.target) config.target = lightData.target;
          if (lightData.skyColor) config.skyColor = lightData.skyColor;
          if (lightData.groundColor) config.groundColor = lightData.groundColor;
          
          threeScene.addLight(config);
        });
      }
      
      if (sceneData.camera) {
        if (sceneData.camera.position) {
          const pos = sceneData.camera.position;
          threeScene.camera.position.set(pos.x, pos.y, pos.z);
        }
        if (sceneData.camera.lookAt) {
          const lookAt = sceneData.camera.lookAt;
          threeScene.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
        }
      }
      
      console.log(`Loaded 3D scene: ${sceneData.name}`);
      return sceneData;
      
    } catch (error) {
      console.error('Error loading 3D scene:', error);
      throw error;
    }
  }
  
  static async load2DScene(path, scene, p5Instance) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load scene: ${response.statusText}`);
      }
      
      const sceneData = await response.json();
      
      if (sceneData.type !== '2d') {
        throw new Error('Invalid scene type. Expected 2D scene.');
      }
      
      if (scene.sprites) {
        scene.sprites = [];
        scene._nextId = 0;
      }
      
      if (sceneData.sprites) {
        sceneData.sprites.forEach(spriteData => {
          const sprite = {
            x: this._evalExpression(spriteData.x, p5Instance),
            y: this._evalExpression(spriteData.y, p5Instance),
            width: this._evalExpression(spriteData.width, p5Instance),
            height: this._evalExpression(spriteData.height, p5Instance),
            color: spriteData.color || '#00ff00',
            code: spriteData.code || ''
          };
          
          scene.addSprite(sprite);
        });
      }
      
      console.log(`Loaded 2D scene: ${sceneData.name}`);
      return sceneData;
      
    } catch (error) {
      console.error('Error loading 2D scene:', error);
      throw error;
    }
  }
  
  static _evalExpression(value, p5Instance) {
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'string') {
      try {
        let width = p5Instance.width;
        let height = p5Instance.height;
        
        if (!width || width <= 100 || !height || height <= 100) {
          const canvasContainer = document.getElementById('canvas-container');
          const canvas = canvasContainer?.querySelector('canvas');
          if (canvas) {
            width = canvas.width || 800;
            height = canvas.height || 600;
          } else {
            width = canvasContainer?.clientWidth || 800;
            height = canvasContainer?.clientHeight || 600;
          }
          
          console.log(`Using fallback dimensions: ${width}x${height}`);
        }

        const result = new Function('width', 'height', `return ${value}`)(width, height);
        return result;
      } catch (error) {
        console.warn(`Failed to evaluate expression: ${value}`, error);
        return 0;
      }
    }
    
    return value;
  }
  
  static async listScenes(type = null) {
    const scenes = {
      '2d': [
        { name: 'Empty', path: 'scenes/2d-empty.json' },
        { name: 'Sample', path: 'scenes/2d-sample.json' }
      ],
      '3d': [
        { name: 'Empty', path: 'scenes/3d-empty.json' },
        { name: 'Example', path: 'scenes/3d-example.json' },
        { name: 'Lighting Demo', path: 'scenes/3d-lighting.json' },
        { name: 'Animation Showcase', path: 'scenes/3d-animation.json' },
        { name: 'Physics Playground', path: 'scenes/3d-physics.json' }
      ]
    };
    
    if (type) {
      return scenes[type] || [];
    }
    
    return scenes;
  }
}
