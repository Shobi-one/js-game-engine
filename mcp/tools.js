/**
 * The tools Claude sees. Each one is run in the editor tab (src/logic/mcp/editorTools.js
 * has the other half); this file only describes them and checks their arguments.
 */
import { z } from 'zod';

export const PRESETS = ['2d-empty', '2d-sample', '2d-audio-demo', '3d-empty', '3d-example', '3d-lighting', '3d-animation', '3d-physics'];

const kind = z.enum(['sprite', 'object', 'light']).describe('sprite (2D), object (3D mesh) or light (3D)');
const id = z.number().int().describe('The id from get_scene');
const props = z.record(z.string(), z.any());

const UNDO_NOTE = 'It is one undo step in the editor, so the user can undo it with Ctrl+Z.';

export const TOOLS = [
  {
    name: 'get_scene',
    description: 'Reads the scene open in the editor: the mode (2d or 3d), whether the game is running, and every sprite '
      + '(2D) or object and light (3D) with its id, properties, behavior code and the last error that code threw. '
      + 'Call this first, and again after changes, because ids are needed by the other tools.',
    input: {},
  },
  {
    name: 'add_item',
    description: 'Adds a sprite (2D), object (3D) or light (3D), switching the editor to that mode if needed, and selects it. '
      + 'Sprite props (sprites have no name; the explorer shows their id): x, y, width, height, rotation (degrees), color ("#rrggbb"), code. x/y is the centre, in canvas pixels. '
      + 'Object props: type (box, sphere, cylinder, cone, torus, plane), name, position/rotation/scale ({x,y,z}, rotation in radians), '
      + 'color, metalness, roughness, opacity, wireframe, code. Light props: type (ambient, directional, point, spot, hemisphere), '
      + `name, color, intensity, position, target. Returns the new item with its id. ${UNDO_NOTE}`,
    input: { kind, props: props.describe('The new item\'s properties; anything left out gets a default') },
  },
  {
    name: 'update_item',
    description: 'Changes properties of a sprite, object or light, with the same property names as add_item. '
      + 'Setting `code` replaces its behavior code: a 2D sprite\'s code runs every frame with `this` = the sprite and '
      + '`width`/`height` = the canvas size; a 3D object\'s code runs with `this.mesh` (a THREE.Mesh) and `THREE`. '
      + `If the new code has a syntax error the change is still made and the error is returned. ${UNDO_NOTE}`,
    input: { kind, id, props: props.describe('Only the properties to change') },
  },
  {
    name: 'delete_item',
    description: `Deletes a sprite, object or light. ${UNDO_NOTE}`,
    input: { kind, id },
  },
  {
    name: 'control',
    description: 'Runs or stops the game, or resets it (Run → Reset Scene: stops and puts everything back to how it was '
      + 'before the first run, keeping edits made while stopped). Behavior code only runs while the game runs.',
    input: { action: z.enum(['run', 'stop', 'reset']) },
  },
  {
    name: 'history',
    description: 'Undo or redo in the editor for the current mode, the same as Ctrl+Z / Ctrl+Y. Returns whether there was a step to undo or redo.',
    input: { action: z.enum(['undo', 'redo']) },
  },
  {
    name: 'set_mode',
    description: 'Switches the editor between the 2D (p5.js) and 3D (Three.js) view. Each mode keeps its own scene.',
    input: { mode: z.enum(['2d', '3d']) },
  },
  {
    name: 'load_scene',
    description: 'Replaces the scene in the editor with one of the built-in scenes, or with scene JSON in the format of the '
      + 'files in scenes/ (what export_scene returns). This clears the undo history, so ask before discarding the user\'s work.',
    input: {
      preset: z.enum(PRESETS).optional().describe('A built-in scene'),
      scene: z.record(z.string(), z.any()).optional().describe('Scene JSON with type "2d" or "3d"'),
    },
  },
  {
    name: 'export_scene',
    description: 'Returns the open scene as scene JSON, exactly what File → Save Scene downloads. Write it to scenes/ '
      + 'to keep it in the repo (a scene in the File menu also needs a menu entry; see CLAUDE.md).',
    input: {},
  },
  {
    name: 'screenshot',
    description: 'A PNG of the 2D canvas or 3D view as the user sees it now (the editor grid included when snapping is on). '
      + 'To see a behavior move, run the game first.',
    input: {},
    image: true,
  },
];
