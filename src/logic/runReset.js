/**
 * Run → Reset Scene: puts the scene back the way it was when Run was last pressed.
 * Behavior code changes sprites and meshes while the game runs (and adds its own
 * fields, like `this.velocity`); without this, Stop only pauses that state.
 *
 * GameController.startGame and ThreeScene.start send a 'clipengine:run-start'
 * event when a run begins; the snapshot is taken then.
 */

// Live objects that belong to the sprite or object, not to its settings.
const KEEP_2D = new Set(['image']);
const KEEP_3D = new Set(['mesh', 'material', 'geometry', 'animations', 'animationMixer', 'animationActions']);

const clone = (value) => {
  try {
    return structuredClone(value);
  } catch {
    return value;
  }
};

/** A copy of an item's own fields, leaving out the live objects in `keep`. */
export function snapshotFields(item, keep) {
  const data = {};
  for (const [key, value] of Object.entries(item)) {
    if (!keep.has(key) && typeof value !== 'function') data[key] = clone(value);
  }
  return data;
}

/** Puts the fields back, and removes fields the run added (so `if (!this.velocity)` starts over). */
export function restoreFields(item, data, keep) {
  for (const key of Object.keys(item)) {
    if (!keep.has(key) && !(key in data) && typeof item[key] !== 'function') delete item[key];
  }
  Object.assign(item, clone(data));
}

const vec = (v) => ({ x: v.x, y: v.y, z: v.z });

export function snapshot2D(scene) {
  // Loading a scene replaces scene.sprites, which makes an old snapshot stale.
  return { list: scene.sprites, sprites: scene.sprites.map((s) => [s, snapshotFields(s, KEEP_2D)]) };
}

export function restore2D(scene, snap) {
  if (!snap || snap.list !== scene.sprites) return false;
  scene.sprites.splice(0, scene.sprites.length, ...snap.sprites.map(([s]) => s));
  for (const [sprite, data] of snap.sprites) restoreFields(sprite, data, KEEP_2D);
  return true;
}

export function snapshot3D(threeScene) {
  return {
    list: threeScene.objects,
    objects: threeScene.objects.map((o) => [o, {
      fields: snapshotFields(o, KEEP_3D),
      mesh: o.mesh && { position: vec(o.mesh.position), rotation: vec(o.mesh.rotation), scale: vec(o.mesh.scale) },
      color: o.material?.color?.getHex?.(),
    }]),
  };
}

export function restore3D(threeScene, snap) {
  if (!snap || snap.list !== threeScene.objects) return false;
  threeScene.objects.splice(0, threeScene.objects.length, ...snap.objects.map(([o]) => o));
  for (const [obj, { fields, mesh, color }] of snap.objects) {
    restoreFields(obj, fields, KEEP_3D);
    if (obj.mesh && mesh) {
      obj.mesh.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
      obj.mesh.rotation.set(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z);
      obj.mesh.scale.set(mesh.scale.x, mesh.scale.y, mesh.scale.z);
    }
    if (color !== undefined) obj.material?.color?.setHex(color);
  }
  return true;
}

export function initRunReset() {
  const snaps = { '2d': null, '3d': null };

  window.addEventListener('clipengine:run-start', (e) => {
    if (e.detail.mode === '2d' && window.scene) snaps['2d'] = snapshot2D(window.scene);
    if (e.detail.mode === '3d' && window.threeScene) snaps['3d'] = snapshot3D(window.threeScene);
  });

  document.getElementById('reset-game')?.addEventListener('click', () => {
    document.getElementById('stop-game')?.click();
    const mode = window.engineController?.mode ?? '2d';
    if (mode === '3d') {
      if (restore3D(window.threeScene, snaps['3d'])) {
        const ui = window.engineController.threeUI;
        const sel = ui?.selectedItem;
        if (sel) ui.selectItem(sel.type, sel.id);
      }
    } else if (restore2D(window.scene, snaps['2d'])) {
      const ui = window.editorUI;
      const sel = ui?.selectedItem && window.scene.getItem('sprite', ui.selectedItem.id);
      ui?.renderProperties(sel || null);
    }
    document.getElementById('run-menu').style.display = 'none';
  });
}
