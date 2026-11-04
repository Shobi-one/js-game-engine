/**
 * Copy, paste and duplicate support shared by the 2D and 3D editors.
 * Items are stored as plain configs, so a paste builds a new item.
 */

export const PASTE_OFFSET_2D = 20;
export const PASTE_OFFSET_3D = 1;

// Runtime state a sprite builds for itself; a copy starts without it.
const SPRITE_SKIP = new Set(['id', 'type', 'image', 'currentFrame']);

/** A sprite's settings as options for scene.addSprite. */
export function spriteConfig(sprite) {
  return Object.fromEntries(Object.entries(sprite)
    .filter(([key, value]) => !key.startsWith('_') && !SPRITE_SKIP.has(key) && typeof value !== 'function')
    .map(([key, value]) => [key, structuredClone(value)]));
}

/** Holds one copied item and the kind of thing it is ('sprite', 'object' or 'light'). */
export class EditorClipboard {
  constructor() {
    this.entry = null;
  }

  copy(kind, config) {
    this.entry = { kind, config: structuredClone(config) };
  }

  /** A fresh copy of the stored config, or null if nothing (of a kind in `kinds`) was copied. */
  paste(kinds) {
    if (!this.entry || !kinds.includes(this.entry.kind)) return null;
    return { kind: this.entry.kind, config: structuredClone(this.entry.config) };
  }
}

/** One clipboard for both editors, so a copied sprite never pastes into the 3D scene. */
export const editorClipboard = new EditorClipboard();
