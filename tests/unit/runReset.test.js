import { describe, it, expect } from 'vitest';
import { takeResetPoint, markStopped, restoreResetPoint, snapshotFields, restoreFields, isPlainData } from '../../src/logic/runReset.js';
import { FpsMeter } from '../../src/logic/fpsCounter.js';

const vec3 = (x, y, z) => ({ x, y, z, set(a, b, c) { this.x = a; this.y = b; this.z = c; } });

// What the engine does: Run takes a reset point (or folds edits into it), Stop marks it.
const run = (point, mode, scene) => point ?? takeResetPoint(mode, scene);

describe('reset scene', () => {
  it('puts sprites back and removes fields a behavior added', () => {
    const image = { width: 10 };
    const sprite = { id: 0, x: 10, y: 20, rotation: 0, image, code: 'this.x += 1;' };
    const scene = { sprites: [sprite] };
    const point = takeResetPoint('2d', scene);

    Object.assign(sprite, { x: 300, rotation: 90, velocity: 3, direction: -1 });
    scene.sprites.push({ id: 1, x: 0 });
    expect(restoreResetPoint(point, scene)).toBe(true);
    expect(scene.sprites).toEqual([sprite]);
    expect(sprite).toEqual({ id: 0, x: 10, y: 20, rotation: 0, image, code: 'this.x += 1;' });
    expect(sprite.image).toBe(image);
  });

  it('ignores a reset point from before a scene was loaded', () => {
    const scene = { sprites: [{ x: 1 }] };
    const point = takeResetPoint('2d', scene);
    scene.sprites = [{ x: 5 }];
    expect(restoreResetPoint(point, scene)).toBe(false);
    expect(scene.sprites[0].x).toBe(5);
  });

  it('keeps the first reset point across Stop and Run again', () => {
    const sprite = { id: 0, x: 0 };
    const scene = { sprites: [sprite] };
    const point = run(null, '2d', scene);
    sprite.x = 50; // the run
    markStopped(point, scene);
    expect(run(point, '2d', scene)).toBe(point);
    sprite.x = 90; // the second run
    markStopped(point, scene);
    restoreResetPoint(point, scene);
    expect(sprite.x).toBe(0);
  });

  it('keeps an edit made while stopped, and still undoes the run', () => {
    const sprite = { id: 0, x: 0, y: 0, rotation: 0 };
    const scene = { sprites: [sprite] };
    const point = takeResetPoint('2d', scene);
    Object.assign(sprite, { x: 50, rotation: 30, velocity: 2 }); // the run
    markStopped(point, scene);
    sprite.y = 77; // edited in the properties panel
    const added = { id: 1, x: 5 };
    scene.sprites.push(added); // added while stopped

    restoreResetPoint(point, scene);
    expect(sprite).toEqual({ id: 0, x: 0, y: 77, rotation: 0 });
    expect(scene.sprites).toEqual([sprite, added]);
  });

  it('drops a sprite deleted while stopped, but brings back one the run removed', () => {
    const a = { id: 0, x: 0 };
    const b = { id: 1, x: 0 };
    const c = { id: 2, x: 0 };
    const scene = { sprites: [a, b, c] };
    const point = takeResetPoint('2d', scene);
    scene.sprites.splice(2, 1); // the run removed c
    markStopped(point, scene);
    scene.sprites.splice(1, 1); // deleted b in the editor
    restoreResetPoint(point, scene);
    expect(scene.sprites).toEqual([a, c]);
  });

  it('puts 3D meshes, colors and object fields back', () => {
    let hex = 0x00ff00;
    const obj = { id: 0, position: { x: 0, y: 1, z: 0 }, velocityY: 0,
      mesh: { position: vec3(0, 1, 0), rotation: vec3(0, 0, 0), scale: vec3(1, 1, 1) },
      material: { color: { getHex: () => hex, setHex: (h) => { hex = h; } } } };
    const three = { objects: [obj] };
    const point = takeResetPoint('3d', three);

    obj.mesh.rotation.y = 2;
    obj.mesh.position.y = 4;
    obj.velocityY = 0.2;
    obj.spin = 5;
    hex = 0xff0000;
    expect(restoreResetPoint(point, three)).toBe(true);
    expect([obj.mesh.rotation.y, obj.mesh.position.y, obj.velocityY, hex]).toEqual([0, 1, 0, 0x00ff00]);
    expect('spin' in obj).toBe(false);
    expect(obj.mesh).toBeDefined();
  });

  it('keeps a 3D color edited while stopped', () => {
    let hex = 0x00ff00;
    const obj = { id: 0, mesh: { position: vec3(0, 0, 0), rotation: vec3(0, 0, 0), scale: vec3(1, 1, 1) },
      material: { color: { getHex: () => hex, setHex: (h) => { hex = h; } } } };
    const three = { objects: [obj] };
    const point = takeResetPoint('3d', three);
    obj.mesh.rotation.y = 1; // the run
    markStopped(point, three);
    hex = 0x0000ff; // edited
    restoreResetPoint(point, three);
    expect([obj.mesh.rotation.y, hex]).toEqual([0, 0x0000ff]);
  });

  it('copies nested values instead of sharing them', () => {
    const item = { triggers: { onMove: 'beep' } };
    const state = snapshotFields(item, new Set());
    item.triggers.onMove = 'boop';
    restoreFields(item, state, new Set());
    expect(item.triggers.onMove).toBe('beep');
  });

  it('leaves fields that cannot be copied as the run left them, instead of aliasing them', () => {
    class Vector { constructor(x) { this.x = x; } add(n) { this.x += n; return this; } }
    const target = new Vector(1);
    const item = { x: 0, target, node: { el: new Vector(2) } };
    const state = snapshotFields(item, new Set());
    expect(state.data).toEqual({ x: 0 });
    expect(state.keys).toEqual(['x', 'target', 'node']);

    item.x = 9;
    item.target.add(4);
    item.later = new Vector(3); // added by the run: removed again
    restoreFields(item, state, new Set());
    expect(item.x).toBe(0);
    expect(item.target).toBe(target);
    expect(item.target.add).toBeTypeOf('function');
    expect('later' in item).toBe(false);
  });

  it('only treats primitives, plain objects and arrays as copyable', () => {
    expect(isPlainData({ a: [1, 'b', null, { c: true }] })).toBe(true);
    const cyclic = { a: 1 };
    cyclic.self = cyclic;
    expect(isPlainData(cyclic)).toBe(true);
    expect(isPlainData(new Map())).toBe(false);
    expect(isPlainData({ f: () => 1 })).toBe(false);
    expect(isPlainData([new Date()])).toBe(false);
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
