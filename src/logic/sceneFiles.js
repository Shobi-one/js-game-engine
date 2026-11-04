/**
 * Saving scenes to disk, opening them again, and the browser autosave.
 * Storage can be missing or full (private windows, blocked site data), so
 * every storage call is wrapped and simply reports failure.
 */

export const AUTOSAVE_KEY = 'clipengine:autosave';

/** Throws unless `data` looks like a 2D or 3D scene file. */
export function validateScene(data) {
  if (!data || typeof data !== 'object' || (data.type !== '2d' && data.type !== '3d')) {
    throw new Error('Not a ClipEngine scene file (expected "type": "2d" or "3d").');
  }
  return data;
}

/** "My Cool Scene!" → "my-cool-scene.json" */
export function fileNameFor(name) {
  const slug = String(name || 'scene').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'scene'}.json`;
}

/** Starts a download of `data` as a pretty-printed JSON file. */
export function downloadJSON(data, filename) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Parses and validates the text of a scene file. */
export function parseSceneFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  return validateScene(data);
}

/** Opens a file picker and resolves with the chosen scene, or null if nothing was picked. */
export function pickSceneFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(parseSceneFile(await file.text()));
      } catch (error) {
        reject(error);
      }
    });
    input.click();
  });
}

/** The last autosave as { savedAt, scene }, or null. */
export function readAutosave(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    validateScene(saved.scene);
    return saved;
  } catch {
    return null;
  }
}

/** Stores `scene` as the autosave. Returns false when storage is unavailable or full. */
export function writeAutosave(scene, storage = globalThis.localStorage, now = Date.now()) {
  try {
    storage.setItem(AUTOSAVE_KEY, JSON.stringify({ savedAt: now, scene }));
    return true;
  } catch {
    return false;
  }
}
