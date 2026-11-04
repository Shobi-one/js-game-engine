/**
 * Click and drag sprites on the 2D canvas while the game is stopped.
 * A drag is one undo step; with View → Snap to Grid on, sprites snap to GRID_SIZE_2D.
 */
import { snapSettings } from './snapSettings.js';

export const GRID_SIZE_2D = 20;

export const snapTo = (value, step) => Math.round(value / step) * step;

/** True when canvas point (px, py) is inside the sprite's rotated rectangle (rotation in degrees). */
export function spriteContains(sprite, px, py) {
  const angle = (-(sprite.rotation || 0) * Math.PI) / 180;
  const dx = px - sprite.x;
  const dy = py - sprite.y;
  const lx = dx * Math.cos(angle) - dy * Math.sin(angle);
  const ly = dx * Math.sin(angle) + dy * Math.cos(angle);
  return Math.abs(lx) <= sprite.width / 2 && Math.abs(ly) <= sprite.height / 2;
}

/** The sprite drawn on top at a canvas point (sprites draw in list order), or null. */
export function spriteAt(sprites, px, py) {
  for (let i = sprites.length - 1; i >= 0; i--) {
    if (spriteContains(sprites[i], px, py)) return sprites[i];
  }
  return null;
}

/** Where a dragged sprite goes: pointer minus grab offset, snapped when snapping is on. */
export function dragPosition(pointer, grab, snap) {
  const x = pointer.x - grab.x;
  const y = pointer.y - grab.y;
  return snap ? { x: snapTo(x, GRID_SIZE_2D), y: snapTo(y, GRID_SIZE_2D) } : { x, y };
}

/**
 * Wires dragging on #canvas-container. `canEdit()` says whether the 2D editor is
 * showing and stopped; `editor` is the EditorUI (selectItem, recordMove).
 */
export function initCanvasDrag({ container, scene, editor, canEdit }) {
  let drag = null;

  // Pointer position in canvas units (the canvas may be scaled by CSS or pixel density).
  const toCanvas = (e) => {
    const canvas = container.querySelector('canvas');
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const p = window.p5Instance;
    const width = p?.width || rect.width;
    const height = p?.height || rect.height;
    return { x: ((e.clientX - rect.left) * width) / rect.width, y: ((e.clientY - rect.top) * height) / rect.height };
  };

  container.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !canEdit()) return;
    const point = toCanvas(e);
    const sprite = point && spriteAt(scene.sprites, point.x, point.y);
    if (!sprite) return;
    e.preventDefault();
    editor.selectItem('sprite', sprite.id);
    drag = { sprite, grab: { x: point.x - sprite.x, y: point.y - sprite.y }, start: { x: sprite.x, y: sprite.y } };
    container.setPointerCapture?.(e.pointerId);
  });

  container.addEventListener('pointermove', (e) => {
    const point = toCanvas(e);
    if (!point) return;
    if (!drag) {
      const over = canEdit() && spriteAt(scene.sprites, point.x, point.y);
      container.style.cursor = over ? 'move' : '';
      return;
    }
    drag.sprite.update(dragPosition(point, drag.grab, snapSettings.enabled));
  });

  const finish = () => {
    if (!drag) return;
    const { sprite, start } = drag;
    drag = null;
    if (sprite.x !== start.x || sprite.y !== start.y) editor.recordMove(sprite.id, start);
  };
  container.addEventListener('pointerup', finish);
  container.addEventListener('pointercancel', finish);
}

/** Draws the snap grid on a p5 instance (only called while snapping is on and the game is stopped). */
export function drawGrid(p) {
  p.push();
  p.stroke(255, 255, 255, 28);
  p.strokeWeight(1);
  for (let x = 0; x <= p.width; x += GRID_SIZE_2D) p.line(x, 0, x, p.height);
  for (let y = 0; y <= p.height; y += GRID_SIZE_2D) p.line(0, y, p.width, y);
  p.pop();
}
