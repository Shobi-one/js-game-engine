import { serialize2DScene, serialize3DScene } from './sceneSerializer.js';
import { downloadJSON, fileNameFor, pickSceneFile, readAutosave, writeAutosave } from './sceneFiles.js';

const AUTOSAVE_INTERVAL_MS = 3000;

/** The scene that is open now, as scene JSON. */
function currentScene(engine) {
  if (engine.mode === '3d' && engine.threeScene) {
    const { data, skipped } = serialize3DScene(engine.threeScene, { name: engine.sceneName || 'Untitled 3D Scene' });
    return { data, skipped };
  }
  const scene = window.scene;
  const data = serialize2DScene(scene, { name: engine.sceneName || 'Untitled 2D Scene', audio: scene.audioConfig });
  return { data, skipped: 0 };
}

function isRunning(engine) {
  return engine.mode === '3d' ? Boolean(engine.threeScene?.isRunning) : Boolean(window.gameController?.isRunning);
}

async function openScene(engine, data) {
  if (data.type === '3d') await engine._loadPresetScene(data);
  else await engine._load2DScene(data);
}

function closeFileMenu() {
  const dropdown = document.getElementById('file-menu');
  if (dropdown) dropdown.style.display = 'none';
}

/**
 * File → Save Scene (Ctrl+S), Open Scene File (Ctrl+O) and Restore Autosave.
 * While the game is stopped, the open scene is autosaved to this browser every
 * few seconds. The autosave found when the editor starts is offered once, in
 * the File menu, so a refresh or a closed tab doesn't lose work.
 */
export function initSceneFiles(engine) {
  const saveScene = () => {
    const { data, skipped } = currentScene(engine);
    downloadJSON(data, fileNameFor(data.name));
    if (skipped) console.warn(`Saved without ${skipped} imported model(s): models are loaded from your computer and can't be stored in a scene file.`);
    closeFileMenu();
  };

  const openSceneFile = async () => {
    closeFileMenu();
    try {
      const data = await pickSceneFile();
      if (data) await openScene(engine, data);
    } catch (error) {
      console.warn('Could not open scene file:', error);
      alert(`Could not open scene file: ${error.message}`);
    }
  };

  document.getElementById('scene-save')?.addEventListener('click', saveScene);
  document.getElementById('scene-open')?.addEventListener('click', openSceneFile);

  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === 's') {
      e.preventDefault();
      saveScene();
    } else if (key === 'o') {
      e.preventDefault();
      openSceneFile();
    }
  });

  // Offer the previous session's autosave before this session starts overwriting it.
  const previous = readAutosave();
  // While the previous autosave is on offer, keep it until the open scene really changes.
  let protectPrevious = Boolean(previous);
  const restoreItem = document.getElementById('scene-restore');
  if (previous && restoreItem) {
    const time = new Date(previous.savedAt).toLocaleString();
    restoreItem.setAttribute('text', `Restore Autosave (${time})`);
    restoreItem.hidden = false;
    restoreItem.addEventListener('click', async () => {
      closeFileMenu();
      restoreItem.hidden = true;
      protectPrevious = false;
      await openScene(engine, previous.scene);
    });
  }

  let lastSaved = null;
  let startScene = null;
  const autosave = () => {
    if (isRunning(engine)) return;
    try {
      const { data } = currentScene(engine);
      const json = JSON.stringify(data);
      startScene ??= json;
      if (protectPrevious && json === startScene) return;
      protectPrevious = false;
      if (json !== lastSaved && writeAutosave(data)) lastSaved = json;
    } catch (error) {
      // A half-built scene during a mode switch is not worth reporting; the next tick catches up.
    }
  };
  setInterval(autosave, AUTOSAVE_INTERVAL_MS);
  window.addEventListener('pagehide', autosave);
}
