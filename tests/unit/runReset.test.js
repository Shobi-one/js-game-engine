import { describe, it, expect } from 'vitest';
import { snapshot2D, restore2D, snapshot3D, restore3D, snapshotFields, restoreFields } from '../../src/logic/runReset.js';
import { FpsMeter } from '../../src/logic/fpsCounter.js';

const vec3 = (x, y, z) => ({ x, y, z, set(a, b, c) { this.x = a; this.y = b; this.z = c; } });

describe('reset scene', () => {
  it('puts sprites back and removes fields a behavior added', () => {
    const image = { width: 10 };
    const sprite = { id: 0, x: 10, y: 20, rotation: 0, image, code: 'this.x += 1;' };
    const scene = { sprites: [sprite] };
    const snap = snapshot2D(scene);

    Object.assign(sprite, { x: 300, rotation: 90, velocity: 3, direction: -1 });
    scene.sprites.push({ id: 1, x: 0 });
    expect(restore2D(scene, snap)).toBe(true);
    expect(scene.sprites).toEqual([sprite]);
    expect(sprite).toEqual({ id: 0, x: 10, y: 20, rotation: 0, image, code: 'this.x += 1;' });
    expect(sprite.image).toBe(image);
  });

  it('ignores a snapshot from before a scene was loaded', () => {
    const scene = { sprites: [{ x: 1 }] };
    const snap = snapshot2D(scene);
    scene.sprites = [{ x: 5 }];
    expect(restore2D(scene, snap)).toBe(false);
    expect(scene.sprites[0].x).toBe(5);
  });

  it('puts 3D meshes, colors and object fields back', () => {
    let hex = 0x00ff00;
    const obj = { id: 0, position: { x: 0, y: 1, z: 0 }, velocityY: 0,
      mesh: { position: vec3(0, 1, 0), rotation: vec3(0, 0, 0), scale: vec3(1, 1, 1) },
      material: { color: { getHex: () => hex, setHex: (h) => { hex = h; } } } };
    const three = { objects: [obj] };
    const snap = snapshot3D(three);

    obj.mesh.rotation.y = 2;
    obj.mesh.position.y = 4;
    obj.velocityY = 0.2;
    obj.spin = 5;
    hex = 0xff0000;
    expect(restore3D(three, snap)).toBe(true);
    expect([obj.mesh.rotation.y, obj.mesh.position.y, obj.velocityY, hex]).toEqual([0, 1, 0, 0x00ff00]);
    expect('spin' in obj).toBe(false);
    expect(obj.mesh).toBeDefined();
  });

  it('copies nested values instead of sharing them', () => {
    const item = { triggers: { onMove: 'beep' } };
    const data = snapshotFields(item, new Set());
    item.triggers.onMove = 'boop';
    restoreFields(item, data, new Set());
    expect(item.triggers.onMove).toBe('beep');
  });
});

describe('FPS meter', () => {
  it('reports frames per second every half second', () => {
    const meter = new FpsMeter(500);
    expect(meter.tick(0)).toBeNull();
    let result = null;
    for (let t = 1; t <= 30; t++) result = meter.tick((t * 1000) / 60) ?? result;
    expect(result).toBe(60);
  });
});
