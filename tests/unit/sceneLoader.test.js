import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Tone.js needs a real AudioContext, so the audio engine is replaced with a stub.
vi.mock('../../src/logic/audioEngine.js', () => ({
  audioEngine: { initialized: false },
}));

const { SceneLoader } = await import('../../src/logic/sceneLoader.js');

const scenePath = (name) => resolve(__dirname, '../../scenes', name);
const readScene = (name) => JSON.parse(readFileSync(scenePath(name), 'utf8'));

function mockFetch(json, ok = true) {
  globalThis.fetch = vi.fn(async () => ({
    ok,
    statusText: ok ? 'OK' : 'Not Found',
    json: async () => json,
  }));
}

function fake2DScene() {
  return {
    sprites: [],
    _nextId: 0,
    addSprite(data) {
      this.sprites.push({ id: this._nextId++, ...data });
    },
  };
}

function fake3DScene() {
  const camera = {
    position: { set: vi.fn() },
    lookAt: vi.fn(),
  };
  return {
    camera,
    objects: [],
    lights: [],
    clearScene: vi.fn(),
    addObject(cfg) {
      const obj = { ...cfg };
      this.objects.push(obj);
      return obj;
    },
    addLight(cfg) {
      this.lights.push(cfg);
    },
  };
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('SceneLoader._evalExpression', () => {
  const p5 = { width: 800, height: 600 };

  it('returns numbers unchanged', () => {
    expect(SceneLoader._evalExpression(42, p5)).toBe(42);
  });

  it('evaluates width/height expressions', () => {
    expect(SceneLoader._evalExpression('width/2', p5)).toBe(400);
    expect(SceneLoader._evalExpression('height - 100', p5)).toBe(500);
  });

  it('returns 0 for an invalid expression', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(SceneLoader._evalExpression('width +* 2', p5)).toBe(0);
  });
});

describe('SceneLoader.load2DScene', () => {
  it('loads every sprite from the sample scene', async () => {
    const data = readScene('2d-sample.json');
    mockFetch(data);
    const scene = fake2DScene();

    await SceneLoader.load2DScene('scenes/2d-sample.json', scene, { width: 800, height: 600 });

    expect(scene.sprites).toHaveLength(data.sprites.length);
    expect(scene.sprites[0]).toMatchObject({ x: 400, y: 300, width: 800, height: 600 });
  });

  it('clears existing sprites before loading', async () => {
    mockFetch({ name: 't', type: '2d', sprites: [{ x: 1, y: 2, width: 3, height: 4 }] });
    const scene = fake2DScene();
    scene.addSprite({ x: 9 });

    await SceneLoader.load2DScene('x.json', scene, { width: 800, height: 600 });

    expect(scene.sprites).toHaveLength(1);
    expect(scene.sprites[0]).toMatchObject({ id: 0, x: 1, color: '#00ff00', code: '' });
  });

  it('rejects a 3D scene', async () => {
    mockFetch({ type: '3d' });
    await expect(
      SceneLoader.load2DScene('x.json', fake2DScene(), { width: 800, height: 600 }),
    ).rejects.toThrow('Expected 2D scene');
  });

  it('rejects when the fetch fails', async () => {
    mockFetch({}, false);
    await expect(
      SceneLoader.load2DScene('missing.json', fake2DScene(), { width: 800, height: 600 }),
    ).rejects.toThrow('Failed to load scene');
  });
});

describe('SceneLoader.load3DScene', () => {
  it('loads objects, lights and camera from the example scene', async () => {
    const data = readScene('3d-example.json');
    mockFetch(data);
    const three = fake3DScene();

    await SceneLoader.load3DScene('scenes/3d-example.json', three);

    expect(three.clearScene).toHaveBeenCalledOnce();
    expect(three.objects).toHaveLength(data.objects?.length ?? 0);
    expect(three.lights).toHaveLength(data.lights?.length ?? 0);
    if (data.camera?.position) {
      const { x, y, z } = data.camera.position;
      expect(three.camera.position.set).toHaveBeenCalledWith(x, y, z);
    }
  });

  it('fills in default transforms', async () => {
    mockFetch({ name: 't', type: '3d', objects: [{ type: 'box', name: 'b' }] });
    const three = fake3DScene();

    await SceneLoader.load3DScene('x.json', three);

    expect(three.objects[0]).toMatchObject({
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#ffffff',
      castShadow: true,
    });
  });

  it('rejects a 2D scene', async () => {
    mockFetch({ type: '2d' });
    await expect(SceneLoader.load3DScene('x.json', fake3DScene())).rejects.toThrow(
      'Expected 3D scene',
    );
  });
});

describe('SceneLoader._evalExpression without a p5 instance', () => {
  it('falls back to the canvas container size', () => {
    document.body.innerHTML = '<div id="canvas-container"><canvas width="640" height="480"></canvas></div>';
    expect(SceneLoader._evalExpression('width/2', undefined)).toBe(320);
    expect(SceneLoader._evalExpression('height', undefined)).toBe(480);
  });
});

describe('SceneLoader.load3DScene material fields', () => {
  it('passes metalness, roughness and other optional fields through', async () => {
    mockFetch({ name: 't', type: '3d', objects: [{ type: 'box', metalness: 0.9, roughness: 0.1, interactive: true }] });
    const three = fake3DScene();
    await SceneLoader.load3DScene('x.json', three);
    expect(three.objects[0]).toMatchObject({ metalness: 0.9, roughness: 0.1, interactive: true });
    expect(three.objects[0]).not.toHaveProperty('opacity');
  });
});

describe('SceneLoader.listScenes', () => {
  it('only lists scene files that exist', async () => {
    const { existsSync } = await import('node:fs');
    const all = await SceneLoader.listScenes();
    for (const { path } of [...all['2d'], ...all['3d']]) {
      expect(existsSync(resolve(__dirname, '../..', path)), path).toBe(true);
    }
  });
});
