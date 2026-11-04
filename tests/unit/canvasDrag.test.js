import { describe, it, expect } from 'vitest';
import { spriteContains, spriteAt, dragPosition, snapTo, GRID_SIZE_2D } from '../../src/logic/editor/canvasDrag.js';

describe('2D canvas dragging', () => {
  const box = { x: 100, y: 100, width: 40, height: 20, rotation: 0 };

  it('hits a sprite inside its rectangle, around its centre', () => {
    expect(spriteContains(box, 119, 109)).toBe(true);
    expect(spriteContains(box, 121, 100)).toBe(false);
    expect(spriteContains(box, 100, 111)).toBe(false);
  });

  it('follows the sprite rotation', () => {
    const turned = { ...box, rotation: 90 };
    expect(spriteContains(turned, 100, 119)).toBe(true);
    expect(spriteContains(turned, 119, 100)).toBe(false);
  });

  it('picks the sprite drawn on top', () => {
    const under = { id: 1, ...box };
    const over = { id: 2, ...box, x: 110 };
    expect(spriteAt([under, over], 105, 100).id).toBe(2);
    expect(spriteAt([under, over], 85, 100).id).toBe(1);
    expect(spriteAt([under, over], 0, 0)).toBeNull();
  });

  it('keeps the grab point under the pointer, and snaps to the grid when asked', () => {
    expect(dragPosition({ x: 57, y: 33 }, { x: 5, y: -3 }, false)).toEqual({ x: 52, y: 36 });
    expect(dragPosition({ x: 57, y: 33 }, { x: 5, y: -3 }, true)).toEqual({ x: 60, y: 40 });
    expect(snapTo(29, GRID_SIZE_2D)).toBe(20);
    expect(snapTo(30, GRID_SIZE_2D)).toBe(40);
  });
});
