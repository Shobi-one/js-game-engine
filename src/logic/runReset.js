/**
 * Run → Reset Scene: undoes what running the game did, and keeps what you edited.
 * Behavior code changes sprites and meshes while the game runs (and adds its own
 * fields, like `this.velocity`); without this, Stop only pauses that state.
 *
 * The reset point is taken on the first Run after a scene is loaded. Stop → Run
 * resumes and keeps it. Edits made while stopped (properties panel, drags, undo)
 * are found by comparing the scene with how it was at Stop, and are folded into
 * the reset point, so Reset never throws an edit away.
 *
 * GameController and ThreeScene send 'clipengine:run-start' and 'clipengine:run-stop'.
 */

// Live objects that belong to the sprite or object, not to its settings.
const KEEP_2D = new Set(['image']);
const KEEP_3D = new Set(['mesh', 'material', 'geometry', 'animations', 'animationMixer', 'animationActions']);

/**
 * True for values made only of primitives, plain objects and arrays. Anything else
 * (a p5.Vector, a Three object, a DOM node, a function) can't be copied faithfully:
 * structuredClone would drop its class or throw.
 */
export function isPlainData(value, seen = new Set()) {
  if (value === null || typeof value !== 'object') return typeof value !== 'function' && typeof value !== 'symbol';
  if (seen.has(value)) return true;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== Array.prototype && proto !== null) return false;
  seen.add(value);
  return Object.values(value).every((v) => isPlainData(v, seen));
}

/**
 * A copy of an item's fields. `data` holds the plain-data fields; `keys` is every
 * field the item had. A field that isn't plain data is in `keys` but not `data`:
 * Reset leaves it as the run left it, rather than "restoring" a shared reference.
 */
export function snapshotFields(item, keep) {
  const data = {};
  const keys = [];
  for (const [key, value] of Object.entries(item)) {
    if (keep.has(key) || typeof value === 'function') continue;
    keys.push(key);
    if (isPlainData(value)) data[key] = structuredClone(value);
  }
  return { data, keys };
}

/** Puts the fields back, and removes fields the run added (so `if (!this.velocity)` starts over). */
export function restoreFields(item, { data, keys }, keep) {
  const had = new Set(keys);
  for (const key of Object.keys(item)) {
    if (!keep.has(key) && !had.has(key) && typeof item[key] !== 'function') delete item[key];
  }
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith('@')) item[key] = structuredClone(value);
  }
}

const vec = (v) => ({ x: v.x, y: v.y, z: v.z });

// Each mode: the list of items, an item's state, and how to put a state back.
const MODES = {
  '2d': {
    list: (scene) => scene.sprites,
    state: (sprite) => snapshotFields(sprite, KEEP_2D),
    apply: (sprite, state) => restoreFields(sprite, state, KEEP_2D),
  },
  '3d': {
    list: (threeScene) => threeScene.objects,
    state: (obj) => {
      const state = snapshotFields(obj, KEEP_3D);
      // Mesh transforms and color live on Three objects; they ride along as '@' fields.
      if (obj.mesh) {
        state.data['@position'] = vec(obj.mesh.position);
        state.data['@rotation'] = vec(obj.mesh.rotation);
        state.data['@scale'] = vec(obj.mesh.scale);
      }
      const color = obj.material?.color?.getHex?.();
      if (color !== undefined) state.data['@color'] = color;
      return state;
    },
    apply: (obj, state) => {
      restoreFields(obj, state, KEEP_3D);
      const { data } = state;
      if (obj.mesh && data['@position']) {
        for (const key of ['position', 'rotation', 'scale']) {
          const v = data[`@${key}`];
          obj.mesh[key].set(v.x, v.y, v.z);
        }
      }
      if (data['@color'] !== undefined) obj.material?.color?.setHex(data['@color']);
    },
  },
};

const same = (a, b) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false; // a cycle: treat as changed, so an edit is never lost
  }
};

/** The state of every item in a scene, keyed by the item itself. */
function capture(mode, scene) {
  const { list, state } = MODES[mode];
  return new Map(list(scene).map((item) => [item, state(item)]));
}

/** A reset point for a scene: its list (to spot a scene load) and every item's state. */
export function takeResetPoint(mode, scene) {
  return { mode, list: MODES[mode].list(scene), items: capture(mode, scene), stopped: null };
}

/** Remembers the scene as it was at Stop, so later edits can be told apart from the run. */
export function markStopped(point, scene) {
  if (point && point.list === MODES[point.mode].list(scene)) point.stopped = capture(point.mode, scene);
}

/**
 * Folds edits made since Stop into the reset point: changed fields, items added
 * and items deleted while stopped. Without a Stop on record there is nothing to fold.
 */
export function foldEdits(point, scene) {
  if (!point?.stopped) return;
  const now = capture(point.mode, scene);
  for (const [item, stoppedState] of point.stopped) {
    if (!now.has(item)) point.items.delete(item); // deleted while stopped
  }
  for (const [item, current] of now) {
    const stoppedState = point.stopped.get(item);
    const base = point.items.get(item);
    if (!stoppedState || !base) {
      point.items.set(item, current); // added while stopped
      continue;
    }
    for (const key of new Set([...Object.keys(current.data), ...Object.keys(stoppedState.data)])) {
      if (same(current.data[key], stoppedState.data[key])) continue;
      if (key in current.data) base.data[key] = current.data[key];
      else delete base.data[key];
    }
    const added = current.keys.filter((k) => !stoppedState.keys.includes(k));
    const removed = new Set(stoppedState.keys.filter((k) => !current.keys.includes(k)));
    base.keys = [...base.keys.filter((k) => !removed.has(k)), ...added.filter((k) => !base.keys.includes(k))];
  }
  point.stopped = now;
}

/** Puts the scene back to the reset point. False when there is none, or the scene was reloaded. */
export function restoreResetPoint(point, scene) {
  if (!point || point.list !== MODES[point.mode].list(scene)) return false;
  foldEdits(point, scene);
  const list = MODES[point.mode].list(scene);
  // Keep the scene's order; items a behavior removed during the run come back at the end.
  const order = [...list.filter((item) => point.items.has(item)), ...[...point.items.keys()].filter((item) => !list.includes(item))];
  list.splice(0, list.length, ...order);
  for (const [item, state] of point.items) MODES[point.mode].apply(item, state);
  point.stopped = capture(point.mode, scene);
  return true;
}

export function initRunReset() {
  const points = { '2d': null, '3d': null };
  const sceneFor = (mode) => (mode === '3d' ? window.threeScene : window.scene);

  window.addEventListener('clipengine:run-start', (e) => {
    const { mode } = e.detail;
    const scene = sceneFor(mode);
    if (!scene) return;
    const point = points[mode];
    if (point && point.list === MODES[mode].list(scene)) foldEdits(point, scene);
    else points[mode] = takeResetPoint(mode, scene);
  });

  window.addEventListener('clipengine:run-stop', (e) => {
    const { mode } = e.detail;
    const scene = sceneFor(mode);
    if (scene) markStopped(points[mode], scene);
  });

  document.getElementById('reset-game')?.addEventListener('click', () => {
    document.getElementById('stop-game')?.click();
    const mode = window.engineController?.mode ?? '2d';
    if (mode === '3d') {
      if (restoreResetPoint(points['3d'], window.threeScene)) {
        const ui = window.engineController.threeUI;
        const sel = ui?.selectedItem;
        if (sel) ui.selectItem(sel.type, sel.id);
      }
    } else if (restoreResetPoint(points['2d'], window.scene)) {
      const ui = window.editorUI;
      const sel = ui?.selectedItem && window.scene.getItem('sprite', ui.selectedItem.id);
      ui?.renderProperties(sel || null);
    }
    document.getElementById('run-menu').style.display = 'none';
  });
}
