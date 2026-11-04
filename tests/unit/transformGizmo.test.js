import { describe, it, expect } from 'vitest';
import { readTransform, nodeFor, SNAP } from '../../src/logic/three/editor/transformGizmo.js';

const v = (x, y, z) => ({ x, y, z });

describe('transform gizmo helpers', () => {
  it('reads position, rotation and scale for objects, and only position for lights', () => {
    const node = { position: v(1, 2, 3), rotation: { ...v(0, 1, 0), order: 'XYZ' }, scale: v(2, 2, 2) };
    expect(readTransform('object', node)).toEqual({ position: v(1, 2, 3), rotation: v(0, 1, 0), scale: v(2, 2, 2) });
    expect(readTransform('light', node)).toEqual({ position: v(1, 2, 3) });
  });

  it('moves meshes and positioned lights, not ambient or hemisphere lights', () => {
    const mesh = {};
    const light = {};
    expect(nodeFor('object', { mesh })).toBe(mesh);
    expect(nodeFor('object', { mesh: null })).toBeNull();
    expect(nodeFor('light', { type: 'spot', light })).toBe(light);
    expect(nodeFor('light', { type: 'ambient', light })).toBeNull();
    expect(nodeFor('light', { type: 'hemisphere', light })).toBeNull();
  });

  it('snaps to one grid cell and 15 degrees', () => {
    expect(SNAP.translate).toBe(1);
    expect(SNAP.rotate).toBeCloseTo((15 * Math.PI) / 180);
  });
});
