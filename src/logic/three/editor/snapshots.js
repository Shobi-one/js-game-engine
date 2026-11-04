/**
 * Plain copies of 3D objects and lights, used by undo (to re-create a deleted
 * item with the same id) and by copy, paste and duplicate.
 */

const OBJECT_FIELDS = ['type', 'name', 'color', 'wireframe', 'transparent', 'opacity', 'metalness', 'roughness', 'textureUrl', 'interactive', 'code'];
const LIGHT_FIELDS = ['type', 'name', 'color', 'intensity', 'castShadow', 'angle', 'penumbra', 'decay', 'distance', 'groundColor'];
const VECTORS = { object: ['position', 'rotation', 'scale'], light: ['position', 'target'] };

function snapshot(item, fields, vectors) {
  const copy = { id: item.id };
  for (const key of fields) copy[key] = structuredClone(item[key]);
  for (const key of vectors) if (item[key]) copy[key] = { x: item[key].x, y: item[key].y, z: item[key].z };
  return copy;
}

export const objectSnapshot = (obj) => snapshot(obj, OBJECT_FIELDS, VECTORS.object);
export const lightSnapshot = (light) => snapshot(light, LIGHT_FIELDS, VECTORS.light);

export const snapshotOf = (kind, item) => (kind === 'light' ? lightSnapshot(item) : objectSnapshot(item));

/** Imported models come from a local file, so they can't be re-created from a snapshot. */
export const canSnapshot = (kind, item) => kind === 'light' || item.type !== 'model';

/** The fields of `item` named in `update`, as they are now (whole vectors for 'position' and so on). */
export function currentValues(item, update) {
  return Object.fromEntries(Object.keys(update).map((key) => [key, structuredClone(item[key])]));
}

/** A copy for paste or duplicate: no id, " copy" added to the name, moved along x. */
export function copyFor(config, offset) {
  const { id, ...rest } = structuredClone(config);
  rest.name = `${rest.name} copy`;
  if (rest.position) rest.position.x += offset;
  return rest;
}
