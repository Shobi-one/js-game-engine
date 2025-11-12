import p5 from 'p5';
import '../style.css';

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
    this.imageUrl = options.imageUrl ?? null;
    this.frameWidth = options.frameWidth ?? null;
    this.frameHeight = options.frameHeight ?? null;
    this.currentFrame = options.currentFrame ?? 0;
    this.totalFrames = options.totalFrames ?? 1;
    this.framesPerRow = options.framesPerRow ?? 1;
    this.animationSpeed = options.animationSpeed ?? 10;
    this._frameCounter = 0;
    
    this.code = options.code ?? '// Write your sprite logic here\n// This code runs every frame\n\n// Example:\n// this.rotation += 1; // Rotate continuously\n// this.x += Math.sin(this.rotation) * 2; // Move in a wave pattern';
  }

  update(props = {}) {
    if ('imageUrl' in props) {
      this.imageUrl = props.imageUrl;
      if (this.imageUrl) {
        p5Instance.loadImage(this.imageUrl, (img) => {
          this.image = img;
        }, (err) => {
          console.error('Failed to load image:', err);
          this.image = null;
        });
      } else {
        this.image = null;
      }
    }
    
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

  draw(isRunning = false) {
    const p = p5Instance;
    window.p5Instance = p;  
    
    if (isRunning) {
      this.runCode();
      
      // Auto-advance animation frames
      if (this.totalFrames > 1) {
        this._frameCounter++;
        if (this._frameCounter >= this.animationSpeed) {
          this._frameCounter = 0;
          this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
        }
      }
    }
    
    p.push();
    p.translate(this.x, this.y);
    p.rotate(this.rotation || 0);

    if (this.image && this.image.width > 0) {
      p.imageMode(p.CENTER);
      
      if (this.frameWidth && this.frameHeight && this.totalFrames > 1) {
        const frameX = (this.currentFrame % this.framesPerRow) * this.frameWidth;
        const frameY = Math.floor(this.currentFrame / this.framesPerRow) * this.frameHeight;
        
        p.push();
        p.imageMode(p.CORNER);
        p.translate(-this.width / 2, -this.height / 2);
        p.image(
          this.image, 
          0, 0, this.width, this.height,  // destination
          frameX, frameY, this.frameWidth, this.frameHeight  // source (frame from sheet)
        );
        p.pop();
      } else {
        p.image(this.image, 0, 0, this.width, this.height);
      }
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

  removeSprite(id) {
    const idx = this.sprites.findIndex(x => x.id === Number(id));
    if (idx === -1) return null;
    const [removed] = this.sprites.splice(idx, 1);
    return { removed, index: idx };
  }

  insertSpriteAt(sprite, index) {
    const existing = this.sprites.findIndex(x => x.id === sprite.id);
    if (existing !== -1) {
      this.sprites[existing] = sprite;
      return existing;
    }
    
    const i = Math.max(0, Math.min(index ?? this.sprites.length, this.sprites.length));
    this.sprites.splice(i, 0, sprite);
    return i;
  }

  drawAll(isRunning = false) {
    this.sprites.forEach(s => s.draw(isRunning));
  }
}

const scene = new Scene();

class GameController {
  constructor() {
    this.isRunning = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    const runMenu = document.querySelector('menu-item[text="Run"]');
    const dropdownMenu = document.getElementById('run-menu');
    
    runMenu.addEventListener('click', () => {
      dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
      runMenu.shadowRoot.querySelector('.menu-item').classList.toggle('active');
      
      const rect = runMenu.getBoundingClientRect();
      dropdownMenu.style.top = `${rect.bottom}px`;
      dropdownMenu.style.left = `${rect.left}px`;
    });

    const projectMenu = document.querySelector('menu-item[text="Project"]');
    const projectDropdown = document.getElementById('project-menu');
    if (projectMenu && projectDropdown) {
      projectMenu.addEventListener('click', () => {
        projectDropdown.style.display = projectDropdown.style.display === 'block' ? 'none' : 'block';
        projectMenu.shadowRoot.querySelector('.menu-item').classList.toggle('active');
        const rect = projectMenu.getBoundingClientRect();
        projectDropdown.style.top = `${rect.bottom}px`;
        projectDropdown.style.left = `${rect.left}px`;
      });
    }

    document.addEventListener('click', (e) => {
      if (!runMenu.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.style.display = 'none';
        runMenu.shadowRoot.querySelector('.menu-item').classList.remove('active');
      }

      if (projectMenu && projectDropdown && !projectMenu.contains(e.target) && !projectDropdown.contains(e.target)) {
        projectDropdown.style.display = 'none';
        projectMenu.shadowRoot.querySelector('.menu-item').classList.remove('active');
      }
    });

    document.getElementById('run-game').addEventListener('click', () => this.startGame());
    document.getElementById('stop-game').addEventListener('click', () => this.stopGame());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'F6') {
        e.preventDefault();
        if (e.shiftKey) {
          this.stopGame();
        } else {
          this.startGame();
        }
      }
    });
  }

  startGame() {
    this.isRunning = true;
    document.getElementById('canvas-container').classList.remove('paused');
    document.getElementById('run-menu').style.display = 'none';
  }

  stopGame() {
    this.isRunning = false;
    document.getElementById('canvas-container').classList.add('paused');
    document.getElementById('run-menu').style.display = 'none';
  }
}

const gameController = new GameController();
window.gameController = gameController;

const sketch = (p) => {
  p5Instance = p;

  p.setup = () => {
    const container = document.getElementById('canvas-container');
    const canvas = p.createCanvas(container.offsetWidth - 16, container.offsetHeight - 16);
    canvas.parent('canvas-container');

    p.angleMode(p.DEGREES);
    p.rectMode(p.CENTER);
    p.frameRate(60);
    
    gameController.stopGame();
  };

  p.draw = () => {
    p.background(0);
    if (gameController.isRunning) {
      scene.drawAll(true);
    } else {
      scene.drawAll(false); 
    }
  };

  p.windowResized = () => {
    const container = document.getElementById('canvas-container');
    p.resizeCanvas(container.offsetWidth - 16, container.offsetHeight - 16);
  };
};

new p5(sketch);

window.scene = scene;
export { scene, Scene, Sprite };
