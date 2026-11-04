import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

// Lights that have a position worth dragging (ambient and hemisphere light everything the same).
const MOVABLE_LIGHTS = new Set(['directional', 'point', 'spot']);
const MODES_BY_KEY = { w: 'translate', e: 'rotate', r: 'scale' };

// Grid steps used when snapping is on: one grid cell, 15 degrees, a quarter of the size.
export const SNAP = { translate: 1, rotate: Math.PI / 12, scale: 0.25 };

const vec = (v) => ({ x: v.x, y: v.y, z: v.z });

/** The transform a drag can change, read from the mesh or light it moved. */
export function readTransform(kind, node) {
  return kind === 'light'
    ? { position: vec(node.position) }
    : { position: vec(node.position), rotation: vec(node.rotation), scale: vec(node.scale) };
}

/** The node the gizmo moves for an item, or null if it can't be moved. */
export function nodeFor(kind, item) {
  if (kind === 'light') return MOVABLE_LIGHTS.has(item.type) ? item.light : null;
  return item.mesh ?? null;
}

/**
 * Move, rotate and scale handles in the 3D view (W, E and R switch between them).
 * Clicking an object in the view selects it. Every finished drag calls
 * onDragEnd(kind, item, before, after) so the editor can apply and record it.
 */
export class TransformGizmo {
  constructor(threeScene, { onDragEnd, onPick }) {
    this.threeScene = threeScene;
    this.onDragEnd = onDragEnd;
    this.onPick = onPick;
    this.target = null;
    this.snap = false;

    const dom = threeScene.renderer.domElement;
    this.controls = new TransformControls(threeScene.camera, dom);
    this.controls.setSize(0.8);
    threeScene.scene.add(this.controls.getHelper());

    this.controls.addEventListener('dragging-changed', (e) => this._onDragging(e.value));
    this._initPicking(dom);
  }

  _onDragging(dragging) {
    // The camera must not orbit while a handle is dragged.
    this.threeScene.controls.enabled = !dragging;
    if (!this.target) return;
    const { kind, item, node } = this.target;
    if (dragging) {
      this._before = readTransform(kind, node);
      return;
    }
    this._justDragged = true;
    const after = readTransform(kind, node);
    if (JSON.stringify(after) !== JSON.stringify(this._before)) this.onDragEnd(kind, item, this._before, after);
  }

  _initPicking(dom) {
    // A click selects; a drag (orbiting the camera or a gizmo handle) does not.
    let down = null;
    dom.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY };
      // A drag released outside the canvas never reaches pointerup here.
      this._justDragged = false;
    });
    dom.addEventListener('pointerup', (e) => {
      const moved = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4;
      const wasGizmo = this._justDragged || this.controls.axis !== null;
      this._justDragged = false;
      if (!down || moved || wasGizmo || this.threeScene.isRunning) return;
      down = null;
      const obj = this.pick(e.clientX, e.clientY);
      if (obj) this.onPick('object', obj.id);
    });
  }

  /** The object under a screen point, or null. */
  pick(clientX, clientY) {
    const { renderer, raycaster, mouse, camera, objects } = this.threeScene;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const meshes = objects.map((o) => o.mesh).filter(Boolean);
    const hit = raycaster.intersectObjects(meshes, true)[0];
    if (!hit) return null;
    // A model's hit is one of its child meshes: walk up to the object's own mesh.
    return objects.find((o) => o.mesh && (o.mesh === hit.object || isAncestor(o.mesh, hit.object))) ?? null;
  }

  attach(kind, item) {
    const node = item && nodeFor(kind, item);
    if (!node || this.threeScene.isRunning) return this.detach();
    this.target = { kind, item, node };
    this.controls.attach(node);
    // Lights only move.
    if (kind === 'light') this.controls.setMode('translate');
  }

  detach() {
    this.target = null;
    this.controls.detach();
  }

  setMode(mode) {
    if (this.target?.kind === 'light' && mode !== 'translate') return;
    this.controls.setMode(mode);
  }

  /** W, E and R pick the handle; returns true when the key was used. */
  handleKey(key) {
    const mode = MODES_BY_KEY[key.toLowerCase()];
    if (!mode || !this.target) return false;
    this.setMode(mode);
    return true;
  }

  setSnap(enabled) {
    this.snap = enabled;
    this.controls.setTranslationSnap(enabled ? SNAP.translate : null);
    this.controls.setRotationSnap(enabled ? SNAP.rotate : null);
    this.controls.setScaleSnap(enabled ? SNAP.scale : null);
  }
}

function isAncestor(ancestor, node) {
  for (let n = node.parent; n; n = n.parent) if (n === ancestor) return true;
  return false;
}
