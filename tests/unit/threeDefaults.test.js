import { describe, it, expect } from 'vitest';
import { ThreeObject } from '../../src/logic/three/ThreeObject.js';
import { Light } from '../../src/logic/three/Light.js';

describe('3D defaults', () => {
  it('keeps object values set to 0 or false', () => {
    const obj = new ThreeObject(1, { metalness: 0, roughness: 0, opacity: 0 });
    expect([obj.metalness, obj.roughness, obj.opacity]).toEqual([0, 0, 0]);
    expect(new ThreeObject(2).metalness).toBe(0.5);
  });

  it('keeps light values set to 0', () => {
    const light = new Light(1, { type: 'spot', intensity: 0, penumbra: 0, decay: 0, angle: 0 });
    expect([light.intensity, light.penumbra, light.decay, light.angle]).toEqual([0, 0, 0, 0]);
    const plain = new Light(2);
    expect([plain.intensity, plain.penumbra, plain.decay]).toEqual([1, 0.1, 2]);
  });
});
