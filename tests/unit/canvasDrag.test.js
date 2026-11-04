import { describe, it, expect, vi } from 'vitest';
import { spriteContains, spriteAt, dragPosition, snapTo, GRID_SIZE_2D, drawGrid } from '../../src/logic/editor/canvasDrag.js';

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

describe('snap grid drawing', () => {
  const fakeP5 = (width, height) => {
    const layer = () => ({ stroke: vi.fn(), strokeWeight: vi.fn(), line: vi.fn(), remove: vi.fn() });
    return { width, height, createGraphics: vi.fn(layer), image: vi.fn() };
  };

  it('draws the lines once and reuses them until the canvas is resized', () => {
    const p = fakeP5(100, 60);
    drawGrid(p);
    drawGrid(p);
    drawGrid(p);
    expect(p.createGraphics).toHaveBeenCalledTimes(1);
    expect(p.image).toHaveBeenCalledTimes(3);
    const first = p.createGraphics.mock.results[0].value;
    expect(first.line).toHaveBeenCalledTimes(100 / GRID_SIZE_2D + 1 + 60 / GRID_SIZE_2D + 1);

    p.width = 200;
    drawGrid(p);
    expect(p.createGraphics).toHaveBeenCalledTimes(2);
    expect(p.createGraphics).toHaveBeenLastCalledWith(200, 60);
    expect(first.remove).toHaveBeenCalled();
  });
});
