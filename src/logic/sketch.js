import p5 from 'p5';

let p5Instance;

class Sprite {
  constructor(id, options = {}) {
    this.id = id;
    this.type = 'sprite';
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.width = options.width ?? 50;
    this.height = options.height ?? 50;
    this.rotation = options.rotation ?? 0;
    this.color = options.color ?? '#00ff00';
    this.image = options.image ?? null;
    this.code = options.code ?? '// Write your sprite logic here\n// This code runs every frame\n\n// Example:\n// this.rotation += 1; // Rotate continuously\n// this.x += Math.sin(this.rotation) * 2; // Move in a wave pattern';
  }

  update(props = {}) {
    Object.assign(this, props);
  }

  runCode() {
    try {
      const code = this.code;
      if (code && code.trim()) {
        const fn = new Function(code).bind(this);
        fn();
      }
    } catch (err) {
      console.error(`Error in sprite ${this.id} code:`, err);
    }
  }

  draw() {
    const p = p5Instance;
    this.runCode();
    p.push();
    p.translate(this.x, this.y);
    p.rotate(this.rotation || 0);

    if (this.image) {
      p.imageMode(p.CENTER);
      p.image(this.image, 0, 0, this.width, this.height);
    } else {
      p.fill(this.color || '#00ff00');
      p.rect(0, 0, this.width, this.height);
    }

    p.pop();
  }
}

class Scene {
  constructor() {
    this.sprites = [];
    this._nextId = 0;
  }

  addSprite(options = {}) {
    const s = new Sprite(this._nextId++, { 
      x: p5Instance.width / 2, 
      y: p5Instance.height / 2, 
      ...options 
    });
    this.sprites.push(s);
    return s;
  }

  updateSprite(id, props = {}) {
    const s = this.sprites.find(x => x.id === Number(id));
    if (s) s.update(props);
    return s || null;
  }

  getItem(type, id) {
    if (type !== 'sprite') return null;
    return this.sprites.find(x => x.id === Number(id)) || null;
  }

  getItems() {
    return { sprites: this.sprites };
  }

  drawAll() {
    this.sprites.forEach(s => s.draw());
  }
}

const scene = new Scene();

const sketch = (p) => {
  p5Instance = p;

  p.setup = () => {
    const container = document.getElementById('canvas-container');
    const canvas = p.createCanvas(container.offsetWidth - 16, container.offsetHeight - 16);
    canvas.parent('canvas-container');

    p.angleMode(p.DEGREES);
    p.rectMode(p.CENTER);
    p.frameRate(60);
  };

  p.draw = () => {
    p.background(0);
    scene.drawAll();
  };

  p.windowResized = () => {
    const container = document.getElementById('canvas-container');
    p.resizeCanvas(container.offsetWidth - 16, container.offsetHeight - 16);
  };
};

new p5(sketch);

window.scene = scene;
export { scene, Scene, Sprite };
