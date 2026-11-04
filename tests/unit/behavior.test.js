import { describe, it, expect, beforeEach, vi } from 'vitest';
import { compileBehavior, clearBehaviorCache } from '../../src/logic/behavior.js';

beforeEach(() => clearBehaviorCache());

describe('compileBehavior', () => {
  it('returns null for empty code', () => {
    expect(compileBehavior('')).toBeNull();
    expect(compileBehavior('   \n')).toBeNull();
  });

  it('runs with `this` and named params', () => {
    const fn = compileBehavior('this.x = width - 1;', ['width', 'height']);
    const sprite = { x: 0 };
    fn.call(sprite, 100, 50);
    expect(sprite.x).toBe(99);
  });

  it('compiles the same code only once', () => {
    const spy = vi.spyOn(globalThis, 'Function');
    const a = compileBehavior('this.x += 1;', ['width', 'height']);
    const b = compileBehavior('this.x += 1;', ['width', 'height']);
    expect(a).toBe(b);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('compiles again when the code changes', () => {
    const a = compileBehavior('this.x += 1;');
    const b = compileBehavior('this.x += 2;');
    expect(a).not.toBe(b);
  });

  it('treats different params as different functions', () => {
    expect(compileBehavior('return 1;', ['a'])).not.toBe(compileBehavior('return 1;', ['b']));
  });

  it('throws a SyntaxError for invalid code, every time', () => {
    expect(() => compileBehavior('this.x +* 1')).toThrow(SyntaxError);
    expect(() => compileBehavior('this.x +* 1')).toThrow(SyntaxError);
  });
});
