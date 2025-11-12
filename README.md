# ClipEngine

A browser-based game engine and visual editor for creating 2D and 3D interactive experiences. ClipEngine provides an intuitive IDE-like interface for building games and animations using p5.js and Three.js, with built-in audio support via Tone.js.

## Features

- **2D Game Development** - Create 2D games and animations using p5.js with an intuitive sprite-based system
- **3D Scene Editor** - Build 3D environments with Three.js including primitives, custom models, and lighting
- **Visual Code Editor** - Edit object behaviors with a built-in code editor
- **Audio Engine** - Integrated audio system powered by Tone.js for sound effects and music
- **Scene Management** - Save and load scenes with JSON-based configuration
- **Live Preview** - See your changes in real-time with the built-in viewport
- **Web Workers** - Multi-threaded processing support for performance-intensive tasks
- **PWA Support** - Installable as a Progressive Web App with offline capability
- **Model Loading** - Import GLTF/GLB and OBJ 3D models
- **Project Explorer** - Hierarchical view of scene objects and assets
- **Properties Panel** - Edit object properties and transformations in real-time

## Technology Stack

- **[p5.js](https://p5js.org/)** (v2.0.5) - Creative coding framework for 2D graphics
- **[Three.js](https://threejs.org/)** (v0.181.1) - 3D graphics library
- **[Tone.js](https://tonejs.github.io/)** (v15.1.22) - Web Audio framework
- **[Vite](https://vitejs.dev/)** (v7.1.7) - Next-generation frontend build tool

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/Shobi-one/js-game-engine.git
cd js-game-engine
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to the URL shown in the terminal (typically `http://localhost:5173`)

## Getting Started

### Creating a 2D Scene

1. Click **File** > **New 2D Scene** to create a blank 2D scene
2. Right-click in the Project Explorer to add sprites
3. Select a sprite to edit its properties in the Properties Panel
4. Double-click a sprite to edit its behavior code
5. Click **Run** > **Run Game** (or press F6) to test your scene

### Creating a 3D Scene

1. Click **File** > **New Empty 3D Scene**
2. Right-click in the Three Explorer to add objects (boxes, spheres, etc.)
3. Select an object to modify its position, rotation, scale, and color
4. Edit custom animation code for dynamic behaviors
5. Add lights to illuminate your scene
6. Run the scene to see it in action

### Sample Scenes

The engine comes with example scenes:
- **Sample 2D Scene** - Demonstrates sprites with rotation, movement, and physics
- **Audio Demo Scene** - Shows audio integration
- **Sample 3D Scene** - Features animated 3D objects with various geometries and lighting

## Project Structure

```
js-game-engine/
├── src/
│   ├── components/          # Web components
│   │   ├── MenuItemComponent.js
│   │   ├── ModalComponent.js
│   │   └── PanelModalComponent.js
│   ├── logic/              # Core engine logic
│   │   ├── sketch.js       # p5.js integration
│   │   ├── threeIntegration.js  # Three.js setup
│   │   ├── threeScene.js   # 3D scene management
│   │   ├── audioEngine.js  # Audio system
│   │   ├── audioUI.js      # Audio interface
│   │   ├── ui.js           # UI management
│   │   ├── sceneLoader.js  # Scene loading/saving
│   │   ├── threeUI.js      # 3D UI controls
│   │   └── workerManager.js # Web worker handling
│   ├── workers/            # Web worker scripts
│   │   └── gameWorker.js
│   └── style.css          # Application styles
├── scenes/                # Scene definitions
│   ├── 2d-empty.json
│   ├── 2d-sample.json
│   ├── 2d-audio-demo.json
│   ├── 3d-empty.json
│   └── 3d-example.json
├── index.html            # Main entry point
├── manifest.json         # PWA manifest
├── service-worker.js     # Service worker for PWA
├── CODE_EXAMPLES.js      # Animation code snippets
└── vite.config.js        # Build configuration
```

## Scene Format

### 2D Scene Structure

```json
{
  "name": "My 2D Scene",
  "type": "2d",
  "sprites": [
    {
      "name": "Player",
      "x": 100,
      "y": 100,
      "width": 50,
      "height": 50,
      "color": "#ff0000",
      "code": "// Update logic here\nthis.x += 1;"
    }
  ]
}
```

### 3D Scene Structure

```json
{
  "name": "My 3D Scene",
  "type": "3d",
  "camera": {
    "position": { "x": 5, "y": 5, "z": 5 },
    "lookAt": { "x": 0, "y": 0, "z": 0 }
  },
  "objects": [
    {
      "type": "box",
      "name": "Cube",
      "position": { "x": 0, "y": 1, "z": 0 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "scale": { "x": 1, "y": 1, "z": 1 },
      "color": "#00ff00",
      "animation": {
        "code": "this.mesh.rotation.y += 0.01;"
      }
    }
  ],
  "lights": [
    {
      "type": "directional",
      "name": "Sun",
      "color": "#ffffff",
      "intensity": 1,
      "position": { "x": 5, "y": 10, "z": 5 }
    }
  ]
}
```

## Code Examples

### 2D Sprite Animation

```javascript
// Bouncing ball
if (!this.velocity) this.velocity = 3;
if (!this.direction) this.direction = 1;
this.y += this.velocity * this.direction;
if (this.y > height - 25 || this.y < 25) {
  this.direction *= -1;
}
```

### 3D Object Animation

```javascript
// Rotating and pulsing cube
this.mesh.rotation.y += 0.02;
const scale = 1 + Math.sin(Date.now() * 0.002) * 0.3;
this.mesh.scale.set(scale, scale, scale);
```

### Orbital Motion

```javascript
// Object orbiting around origin
const time = Date.now() * 0.001;
const radius = 3;
this.mesh.position.x = Math.cos(time) * radius;
this.mesh.position.z = Math.sin(time) * radius;
```

See [CODE_EXAMPLES.js](CODE_EXAMPLES.js) for a comprehensive collection of animation patterns and behaviors.

## Development

### Available Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Building for Production

```bash
npm run build
```

The optimized production build will be generated in the `dist/` directory.

## Browser Support

ClipEngine works best in modern browsers with WebGL support:
- Chrome/Edge (recommended)
- Firefox
- Safari

## Learning Resources

- [p5.js Reference](https://p5js.org/reference/)
- [Three.js Documentation](https://threejs.org/docs/)
- [Tone.js Documentation](https://tonejs.github.io/docs/)
- [WebGL Fundamentals](https://webglfundamentals.org/)

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Built with p5.js, Three.js, and Tone.js
- Inspired by game engines like Unity and Godot
- Icon resources from various open-source projects

---

**ClipEngine** - Create games and interactive experiences in your browser
