import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { serialize2DScene, serialize3DScene } from '../../src/logic/sceneSerializer.js';
import {
  AUTOSAVE_KEY, validateScene, fileNameFor, parseSceneFile, readAutosave, writeAutosave,
} from '../../src/logic/sceneFiles.js';

vi.mock('../../src/logic/audioEngine.js', () => ({ audioEngine: { initialized: false } }));
const { SceneLoader } = await import('../../src/logic/sceneLoader.js');

const v = (x, y, z) => ({ x, y, z });

function fake2DScene() {
  return {
    sprites: [],
    _nextId: 0,
    addSprite(data) {
      const sprite = { id: this._nextId++, rotation: 0, imageUrl: null, frameWidth: null, ...data, update: vi.fn() };
      this.sprites.push(sprite);
      return sprite;
    },
  };
}

function fake3DScene() {
  return {
    camera: { position: { ...v(5, 5, 5), set(x, y, z) { Object.assign(this, { x, y, z }); } }, lookAt: vi.fn() },
    controls: { target: v(0, 0, 0) },
    objects: [],
    lights: [],
    clearScene() { this.objects = []; this.lights = []; },
    addObject(cfg) { const o = { ...cfg }; this.objects.push(o); return o; },
    addLight(cfg) { this.lights.push({ ...cfg }); },
  };
}

describe('2D scene save and load', () => {
  it('writes sprites back in the scenes/ format and loads them again unchanged', async () => {
    const scene = fake2DScene();
    scene.addSprite({ x: 100, y: 50, width: 40, height: 20, rotation: 45, color: '#ff0000', code: 'this.x += 1;',
      audioEvents: [], audioTriggers: {} });
    const audio = { sounds: [{ name: 'beep', type: 'synth', channel: 'sfx', options: {} }] };
    const saved = serialize2DScene(scene, { name: 'Mine', audio });

    expect(saved).toEqual({
      name: 'Mine',
      type: '2d',
      sprites: [{ x: 100, y: 50, width: 40, height: 20, rotation: 45, color: '#ff0000', code: 'this.x += 1;',
        audioEvents: [], audioTriggers: {} }],
      audio,
    });

    const reloaded = fake2DScene();
    await SceneLoader.apply2DScene(JSON.parse(JSON.stringify(saved)), reloaded);
    expect(serialize2DScene(reloaded, { name: 'Mine', audio: reloaded.audioConfig })).toEqual(saved);
  });

  it('loads a saved sprite image through update() so the picture is fetched', async () => {
    const scene = fake2DScene();
    await SceneLoader.apply2DScene({ type: '2d', sprites: [{ x: 1, y: 2, width: 3, height: 4, imageUrl: 'data:image/png;base64,AA' }] }, scene);
    expect(scene.sprites[0].update).toHaveBeenCalledWith({ imageUrl: 'data:image/png;base64,AA' });
  });
});

describe('3D scene save and load', () => {
  it('round-trips objects, lights and the camera', () => {
    const three = fake3DScene();
    three.objects.push({ id: 0, type: 'sphere', name: 'Ball', position: v(1, 2, 3), rotation: v(0, 1, 0), scale: v(2, 2, 2),
      color: '#00ff00', metalness: 0, roughness: 0.4, opacity: 1, transparent: false, wireframe: true, interactive: true,
      textureUrl: null, code: 'this.mesh.rotation.y += 0.01;', mesh: {} });
    three.lights.push({ id: 0, type: 'spot', name: 'Spot', color: '#ffffff', intensity: 2, position: v(0, 5, 0),
      target: v(1, 0, 0), castShadow: true, angle: 0.5, penumbra: 0.2, decay: 1, distance: 10, groundColor: '#444444', light: {} });
    three.camera.position.set(3, 4, 5);
    three.controls.target = v(0, 1, 0);

    const { data, skipped } = serialize3DScene(three, { name: 'Mine' });
    expect(skipped).toBe(0);
    expect(data.objects[0]).toEqual({ type: 'sphere', name: 'Ball', position: v(1, 2, 3), rotation: v(0, 1, 0), scale: v(2, 2, 2),
      color: '#00ff00', metalness: 0, roughness: 0.4, opacity: 1, transparent: false, wireframe: true, interactive: true,
      animation: { code: 'this.mesh.rotation.y += 0.01;' } });
    expect(data.lights[0]).toMatchObject({ type: 'spot', decay: 1, target: v(1, 0, 0) });
    expect(data.camera).toEqual({ position: v(3, 4, 5), lookAt: v(0, 1, 0) });

    const reloaded = fake3DScene();
    SceneLoader.apply3DScene(JSON.parse(JSON.stringify(data)), reloaded);
    expect(reloaded.objects[0]).toMatchObject({ name: 'Ball', wireframe: true, metalness: 0, code: 'this.mesh.rotation.y += 0.01;' });
    expect(reloaded.lights[0]).toMatchObject({ angle: 0.5, decay: 1, distance: 10, target: v(1, 0, 0) });
    expect(reloaded.camera.lookAt).toHaveBeenCalledWith(0, 1, 0);
  });

  it('leaves imported models out and counts them', () => {
    const three = fake3DScene();
    three.objects.push({ type: 'model', name: 'Robot', position: v(0, 0, 0), rotation: v(0, 0, 0), scale: v(1, 1, 1) });
    const { data, skipped } = serialize3DScene(three);
    expect(data.objects).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('every built-in 3D scene survives load → save → load', () => {
    const dir = resolve(__dirname, '../../scenes');
    for (const file of readdirSync(dir).filter((f) => f.startsWith('3d-'))) {
      const first = fake3DScene();
      SceneLoader.apply3DScene(JSON.parse(readFileSync(resolve(dir, file), 'utf8')), first);
      const { data } = serialize3DScene(first);
      const second = fake3DScene();
      SceneLoader.apply3DScene(JSON.parse(JSON.stringify(data)), second);
      expect(second.objects.map((o) => o.name), file).toEqual(first.objects.map((o) => o.name));
      expect(second.lights.map((l) => l.type), file).toEqual(first.lights.map((l) => l.type));
    }
  });
});

describe('scene files', () => {
  it('accepts only 2D and 3D scenes', () => {
    expect(validateScene({ type: '3d' })).toEqual({ type: '3d' });
    expect(() => validateScene({ type: 'video' })).toThrow(/Not a ClipEngine scene/);
    expect(() => parseSceneFile('{nope')).toThrow(/not valid JSON/);
  });

  it('makes a safe file name', () => {
    expect(fileNameFor('My Cool Scene!')).toBe('my-cool-scene.json');
    expect(fileNameFor('')).toBe('scene.json');
  });

  it('stores and reads the autosave, and survives broken storage', () => {
    const store = new Map();
    const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, val) => store.set(k, val) };
    expect(readAutosave(storage)).toBeNull();
    expect(writeAutosave({ type: '2d', sprites: [] }, storage, 1234)).toBe(true);
    expect(readAutosave(storage)).toEqual({ savedAt: 1234, scene: { type: '2d', sprites: [] } });

    store.set(AUTOSAVE_KEY, 'garbage');
    expect(readAutosave(storage)).toBeNull();
    const full = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } };
    expect(readAutosave(full)).toBeNull();
    expect(writeAutosave({ type: '2d' }, full)).toBe(false);
  });
});
