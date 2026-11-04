import { serialize2DScene, serialize3DScene } from './sceneSerializer.js';
import { downloadJSON, fileNameFor, pickSceneFile, readAutosave, writeAutosave } from './sceneFiles.js';

const AUTOSAVE_INTERVAL_MS = 3000;

/** The scene that is open now, as scene JSON. */
function currentScene(engine) {
  if (engine.mode === '3d' && engine.threeScene) {
    const { data, skipped } = serialize3DScene(engine.threeScene, { name: engine.sceneNames?.['3d'] || 'Untitled 3D Scene' });
    return { data, skipped };
  }
  const scene = window.scene;
  const data = serialize2DScene(scene, { name: engine.sceneNames?.['2d'] || 'Untitled 2D Scene', audio: scene.audioConfig });
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
      try {
        await openScene(engine, previous.scene);
        restoreItem.hidden = true;
        protectPrevious = false;
      } catch (error) {
        console.warn('Could not restore the autosave:', error);
        alert(`Could not restore the autosave: ${error.message}`);
      }
    });
  }

  let lastSaved = null;
  let startScene = null;
  let warnedFull = false;
  const sceneJSON = () => {
    try {
      return JSON.stringify(currentScene(engine).data);
    } catch {
      // A half-built scene during a mode switch; the next tick catches up.
      return null;
    }
  };
  // The startup scene, taken as soon as the editor is built (before the user can change
  // anything), so the previous autosave is only replaced once the scene really changes.
  // The restore item keeps the previous autosave in memory for the rest of the visit.
  setTimeout(() => { startScene = sceneJSON(); }, 0);

  const autosave = () => {
    if (isRunning(engine)) return;
    const json = sceneJSON();
    if (json === null) return;
    if (protectPrevious && (startScene === null || json === startScene)) return;
    protectPrevious = false;
    if (json === lastSaved) return;
    if (writeAutosave(JSON.parse(json))) {
      lastSaved = json;
    } else if (!warnedFull) {
      warnedFull = true;
      console.warn('Autosave failed: browser storage is full or blocked (large images in a scene can fill it). Use File → Save Scene.');
    }
  };
  setInterval(autosave, AUTOSAVE_INTERVAL_MS);
  window.addEventListener('pagehide', autosave);
}
