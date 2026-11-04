import { describe, it, expect } from 'vitest';
import { mergeVectors } from '../../src/logic/three/vectors.js';

describe('mergeVectors', () => {
  it('keeps the other axes when one axis changes', () => {
    const current = { position: { x: 0, y: 1, z: 2 }, scale: { x: 1, y: 1, z: 1 } };
    expect(mergeVectors(current, { position: { x: 5 } })).toEqual({ position: { x: 5, y: 1, z: 2 } });
  });

  it('leaves other props and missing vectors alone', () => {
    expect(mergeVectors({}, { name: 'a', position: { x: 1 } })).toEqual({ name: 'a', position: { x: 1 } });
  });

  it('does not modify its inputs', () => {
    const current = { rotation: { x: 0, y: 0, z: 0 } };
    const props = { rotation: { y: 1 } };
    mergeVectors(current, props);
    expect(current.rotation).toEqual({ x: 0, y: 0, z: 0 });
    expect(props.rotation).toEqual({ y: 1 });
  });
});
