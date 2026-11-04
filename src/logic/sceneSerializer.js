/**
 * Turns the live editor scenes back into the JSON format of the files in
 * scenes/, so SceneLoader.apply2DScene / apply3DScene can load them again.
 */

const SPRITE_FIELDS = [
  'x', 'y', 'width', 'height', 'rotation', 'color', 'code', 'imageUrl',
  'frameWidth', 'frameHeight', 'totalFrames', 'framesPerRow', 'animationSpeed',
  'audioEvents', 'audioTriggers',
];

const OBJECT_FIELDS = [
  'type', 'name', 'color', 'metalness', 'roughness', 'opacity', 'transparent', 'wireframe', 'interactive', 'textureUrl',
];

const LIGHT_FIELDS = [
  'type', 'name', 'color', 'intensity', 'castShadow', 'angle', 'penumbra', 'decay', 'distance', 'groundColor',
];

const vec = (v) => ({ x: v.x, y: v.y, z: v.z });
// { key: {x, y, z} } when the vector is set, otherwise nothing.
const vecField = (key, v) => (v ? { [key]: vec(v) } : {});

// Copies the listed fields, leaving out null and undefined so the file stays small.
function pickSet(source, keys) {
  return Object.fromEntries(keys.filter((k) => source[k] !== undefined && source[k] !== null)
    .map((k) => [k, structuredClone(source[k])]));
}

/** The 2D scene as scene JSON. `audio` is the scene's audio block, written back unchanged. */
export function serialize2DScene(scene, { name = 'Untitled 2D Scene', audio = null } = {}) {
  const data = { name, type: '2d', sprites: scene.sprites.map((s) => pickSet(s, SPRITE_FIELDS)) };
  if (audio) data.audio = structuredClone(audio);
  return data;
}

/**
 * The 3D scene as scene JSON. Imported models are left out because they come
 * from a local file the scene can't point to; `skipped` counts them.
 */
export function serialize3DScene(threeScene, { name = 'Untitled 3D Scene' } = {}) {
  const models = threeScene.objects.filter((o) => o.type === 'model');
  const objects = threeScene.objects.filter((o) => o.type !== 'model').map((o) => ({
    ...pickSet(o, OBJECT_FIELDS),
    ...vecField('position', o.position),
    ...vecField('rotation', o.rotation),
    ...vecField('scale', o.scale),
    ...(o.code ? { animation: { code: o.code } } : {}),
  }));
  const lights = threeScene.lights.map((l) => ({
    ...pickSet(l, LIGHT_FIELDS),
    ...vecField('position', l.position),
    ...(l.type === 'spot' ? vecField('target', l.target) : {}),
  }));
  const data = { name, type: '3d', objects, lights };
  if (threeScene.camera) {
    data.camera = { position: vec(threeScene.camera.position) };
    if (threeScene.controls?.target) data.camera.lookAt = vec(threeScene.controls.target);
  }
  return { data, skipped: models.length };
}
