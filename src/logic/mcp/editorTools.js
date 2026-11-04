/**
 * The editor half of the ClipEngine MCP tools (mcp/tools.js describes them to Claude).
 * Every edit goes through the editors' own undo history, so Ctrl+Z undoes what Claude did,
 * and through the same code paths as the explorer and properties panel.
 */
import { spriteConfig } from '../editor/clipboard.js';
import { runCommand } from '../editor/shortcuts.js';
import { runtimeErrorLine, syntaxError } from '../editor/codeProblems.js';
import { snapshotOf, currentValues } from '../three/editor/snapshots.js';
import { validateScene } from '../sceneFiles.js';
import { currentScene, openScene } from '../sceneFilesMenu.js';

const MAX_SCREENSHOT_WIDTH = 1024;
const KINDS_2D = new Set(['sprite']);

const lastError = (item) => {
  const error = item._lastCodeError;
  return error ? { message: error.message, line: runtimeErrorLine(error) } : null;
};

const spriteSummary = (sprite) => ({ id: sprite.id, ...spriteConfig(sprite), lastError: lastError(sprite) });
const item3DSummary = (kind, item) => ({ ...snapshotOf(kind, item), ...(kind === 'object' ? { lastError: lastError(item) } : {}) });

/** The editor's pieces, looked up when a tool runs (3D is created on first use). */
function editor() {
  const engine = window.engineController;
  if (!engine) throw new Error('The editor is still starting.');
  return { engine, scene: window.scene, ui: window.editorUI, threeScene: engine.threeScene, threeUI: engine.threeUI };
}

function modeFor(kind) {
  if (kind !== 'sprite' && kind !== 'object' && kind !== 'light') throw new Error(`Unknown kind "${kind}".`);
  return KINDS_2D.has(kind) ? '2d' : '3d';
}

function useMode(engine, mode) {
  if (mode === '3d') engine.switchTo3D();
  else engine.switchTo2D();
}

function find(kind, id) {
  const { scene, threeScene } = editor();
  const item = kind === 'sprite' ? scene.getItem('sprite', id)
    : kind === 'light' ? threeScene?.getLight(id) : threeScene?.getObject(id);
  if (!item) throw new Error(`There is no ${kind} with id ${id}. Call get_scene for the current ids.`);
  return item;
}

function isRunning(engine) {
  return engine.mode === '3d' ? Boolean(engine.threeScene?.isRunning) : Boolean(window.gameController?.isRunning);
}

const codeParams = (kind) => (kind === 'sprite' ? ['width', 'height'] : ['THREE']);

function addItem({ kind, props = {} }) {
  const { engine } = editor();
  useMode(engine, modeFor(kind));
  const { ui, threeScene, threeUI } = editor();
  if (kind === 'sprite') {
    const sprite = ui._addSpriteFromConfig(props);
    ui.selectItem('sprite', sprite.id);
    return spriteSummary(sprite);
  }
  const defaults = kind === 'light'
    ? { type: 'point', name: `Light ${threeScene.lights.length}`, color: '#ffffff', intensity: 1, position: { x: 2, y: 4, z: 2 } }
    : { type: 'box', name: `Object ${threeScene.objects.length}`, color: '#4488ff', position: { x: 0, y: 1, z: 0 } };
  const item = threeUI._addCopy(kind, { ...defaults, ...props });
  return item3DSummary(kind, item);
}

function updateItem({ kind, id, props = {} }) {
  const { engine } = editor();
  useMode(engine, modeFor(kind));
  const { ui, threeScene, threeUI } = editor();
  const item = find(kind, id);
  // Recorded as its own step (not merged like a slider drag), so each call undoes on its own.
  if (kind === 'sprite') {
    const prev = Object.fromEntries(Object.keys(props).map((k) => [k, structuredClone(item[k])]));
    window.scene.updateSprite(id, props);
    ui._pushUndo({ type: 'update', kind: 'sprite', id, prev, at: Date.now() });
    if (ui.selectedItem?.id === id) ui.renderProperties(item);
  } else {
    threeUI.history.record({ type: 'update', kind, id, prev: currentValues(item, props), at: Date.now() });
    if (kind === 'light') threeScene.updateLight(id, props);
    else threeScene.updateObject(id, props);
    if (threeUI.selectedItem?.type === kind && threeUI.selectedItem.id === id) threeUI.renderProperties(item, kind);
  }
  const result = kind === 'sprite' ? spriteSummary(item) : item3DSummary(kind, item);
  if (typeof props.code === 'string') {
    const error = syntaxError(props.code, codeParams(kind));
    if (error) result.syntaxError = error;
  }
  return result;
}

function deleteItem({ kind, id }) {
  const { engine } = editor();
  useMode(engine, modeFor(kind));
  const { ui, threeUI } = editor();
  const item = find(kind, id);
  if (kind === 'sprite') ui.deleteSprite(id);
  else threeUI._deleteSelected(kind, item);
  return { deleted: { kind, id } };
}

function control({ action }) {
  const ids = { run: 'run-game', stop: 'stop-game', reset: 'reset-game' };
  if (!ids[action]) throw new Error(`Unknown action "${action}".`);
  document.getElementById(ids[action]).click();
  return { running: isRunning(editor().engine) };
}

function history({ action }) {
  if (action !== 'undo' && action !== 'redo') throw new Error(`Unknown action "${action}".`);
  return { done: runCommand(action) };
}

function setMode({ mode }) {
  const { engine } = editor();
  useMode(engine, mode === '3d' ? '3d' : '2d');
  return { mode: engine.mode };
}

function getScene() {
  const { engine, scene, threeScene } = editor();
  const base = { mode: engine.mode, name: engine.sceneNames?.[engine.mode] ?? null, running: isRunning(engine) };
  if (engine.mode === '3d' && threeScene) {
    return {
      ...base,
      objects: threeScene.objects.map((o) => item3DSummary('object', o)),
      lights: threeScene.lights.map((l) => item3DSummary('light', l)),
    };
  }
  const p = window.p5Instance;
  return { ...base, canvas: p ? { width: p.width, height: p.height } : null, sprites: scene.sprites.map(spriteSummary) };
}

async function loadScene({ preset, scene }) {
  const { engine } = editor();
  if (preset) {
    if (!/^[23]d-[a-z-]+$/.test(preset)) throw new Error(`Unknown preset "${preset}".`);
    const path = `scenes/${preset}.json`;
    if (preset.startsWith('3d')) await engine._loadPresetScene(path);
    else await engine._load2DScene(path);
  } else if (scene) {
    await openScene(engine, validateScene(scene));
  } else {
    throw new Error('Give a preset or scene JSON.');
  }
  return getScene();
}

function exportScene() {
  const { data, skipped } = currentScene(editor().engine);
  return skipped ? { ...data, note: `${skipped} imported model(s) left out: they come from a local file.` } : data;
}

function screenshot() {
  const { engine, threeScene } = editor();
  let canvas;
  if (engine.mode === '3d' && threeScene) {
    // WebGL clears its buffer after each frame; render now so the pixels are there to read.
    threeScene.renderer.render(threeScene.scene, threeScene.camera);
    canvas = threeScene.renderer.domElement;
  } else {
    canvas = document.querySelector('#canvas-container canvas');
  }
  if (!canvas) throw new Error('There is no canvas to capture yet.');
  let source = canvas;
  if (canvas.width > MAX_SCREENSHOT_WIDTH) {
    const scale = MAX_SCREENSHOT_WIDTH / canvas.width;
    source = document.createElement('canvas');
    source.width = MAX_SCREENSHOT_WIDTH;
    source.height = Math.round(canvas.height * scale);
    source.getContext('2d').drawImage(canvas, 0, 0, source.width, source.height);
  }
  return { mimeType: 'image/png', data: source.toDataURL('image/png').split(',')[1] };
}

export const EDITOR_TOOLS = {
  get_scene: getScene,
  add_item: addItem,
  update_item: updateItem,
  delete_item: deleteItem,
  control,
  history,
  set_mode: setMode,
  load_scene: loadScene,
  export_scene: exportScene,
  screenshot,
};

/** Runs one tool call from Claude. Resolves with a JSON-friendly result; throws with a message Claude can act on. */
export async function runEditorTool(name, args = {}) {
  const tool = EDITOR_TOOLS[name];
  if (!tool) throw new Error(`Unknown tool "${name}".`);
  return tool(args);
}
