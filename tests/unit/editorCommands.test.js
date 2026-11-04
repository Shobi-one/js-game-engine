import { describe, it, expect } from 'vitest';
import { commandForKey, isTypingIn } from '../../src/logic/editor/shortcuts.js';
import { spriteConfig, EditorClipboard } from '../../src/logic/editor/clipboard.js';
import { objectSnapshot, lightSnapshot, copyFor, canSnapshot, currentValues } from '../../src/logic/three/editor/snapshots.js';

const key = (k, mods = {}) => ({ key: k, ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, ...mods });

describe('editor shortcuts', () => {
  it('maps keys to commands', () => {
    expect(commandForKey(key('z'))).toBe('undo');
    expect(commandForKey(key('Z', { shiftKey: true }))).toBe('redo');
    expect(commandForKey(key('y'))).toBe('redo');
    expect(commandForKey(key('d'))).toBe('duplicate');
    expect(commandForKey(key('c'))).toBe('copy');
    expect(commandForKey(key('v', { ctrlKey: false, metaKey: true }))).toBe('paste');
    expect(commandForKey(key('z', { ctrlKey: false }))).toBeNull();
    expect(commandForKey(key('s'))).toBeNull();
    expect(commandForKey(key('v', { shiftKey: true }))).toBeNull();
  });

  it('leaves text fields to the browser but not number fields or sliders', () => {
    const el = (tag, type) => Object.assign(document.createElement(tag), type ? { type } : {});
    expect(isTypingIn(el('textarea'))).toBe(true);
    expect(isTypingIn(el('input', 'text'))).toBe(true);
    expect(isTypingIn(el('input', 'number'))).toBe(false);
    expect(isTypingIn(el('input', 'range'))).toBe(false);
    expect(isTypingIn(document.body)).toBe(false);
  });
});

describe('clipboard', () => {
  it('copies a sprite without its id, image or runtime state', () => {
    const sprite = { id: 3, type: 'sprite', x: 1, y: 2, color: '#fff', image: {}, currentFrame: 4, _frameCounter: 9,
      audioTriggers: { onMove: 'beep' }, runCode() {} };
    const config = spriteConfig(sprite);
    expect(config).toEqual({ x: 1, y: 2, color: '#fff', audioTriggers: { onMove: 'beep' } });
    config.audioTriggers.onMove = 'changed';
    expect(sprite.audioTriggers.onMove).toBe('beep');
  });

  it('pastes only the kinds the editor accepts, as a fresh copy each time', () => {
    const clip = new EditorClipboard();
    expect(clip.paste(['sprite'])).toBeNull();
    clip.copy('object', { name: 'Box', position: { x: 0, y: 0, z: 0 } });
    expect(clip.paste(['sprite'])).toBeNull();
    const a = clip.paste(['object', 'light']);
    a.config.position.x = 5;
    expect(clip.paste(['object']).config.position.x).toBe(0);
  });
});

describe('3D snapshots', () => {
  const v = (x, y, z) => ({ x, y, z });
  const obj = { id: 4, type: 'box', name: 'Box', position: v(1, 2, 3), rotation: v(0, 0, 0), scale: v(1, 1, 1), color: '#f00',
    wireframe: false, transparent: false, opacity: 1, metalness: 0, roughness: 0.5, textureUrl: null, interactive: false,
    code: 'x', mesh: {} };

  it('keeps everything needed to re-create the item with the same id', () => {
    const snap = objectSnapshot(obj);
    expect(snap).toMatchObject({ id: 4, type: 'box', metalness: 0, code: 'x', position: v(1, 2, 3) });
    expect(snap.mesh).toBeUndefined();
    snap.position.x = 9;
    expect(obj.position.x).toBe(1);
    expect(lightSnapshot({ id: 1, type: 'spot', name: 'S', position: v(0, 5, 0), target: v(1, 0, 0), intensity: 0 }))
      .toMatchObject({ id: 1, intensity: 0, target: v(1, 0, 0) });
  });

  it('makes a moved, renamed copy without an id', () => {
    const copy = copyFor(objectSnapshot(obj), 1);
    expect(copy.id).toBeUndefined();
    expect(copy).toMatchObject({ name: 'Box copy', position: v(2, 2, 3) });
  });

  it('skips imported models and records whole vectors as the previous value', () => {
    expect(canSnapshot('object', { type: 'model' })).toBe(false);
    expect(canSnapshot('light', { type: 'point' })).toBe(true);
    expect(currentValues(obj, { position: { x: 5 } })).toEqual({ position: v(1, 2, 3) });
  });
});
