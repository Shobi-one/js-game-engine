# ClipEngine

Browser game engine and editor. p5.js for 2D, Three.js for 3D, Tone.js for audio, built with Vite.
Live at https://shobi-one.github.io/js-game-engine/ (deployed from `main` by `.github/workflows/pages.yml`).

## Architecture in ten lines

- `public/service-worker.js` is copied as-is to `dist/` (network first, cache as offline fallback). Bump `CACHE_NAME` when you change it.
- `index.html` is the whole editor UI: menus, panels and modals. It loads every module in `src/` with `<script type="module">`.
- `src/logic/sketch.js`: the 2D side. `Sprite`, `Scene` and `GameController`, on a p5 instance-mode sketch in `#canvas-container`.
- `src/logic/three/`: the 3D side. `ThreeObject.js`, `Light.js` and `ThreeScene.js`, rendered in `#three-container`.
- `src/logic/threeIntegration.js`: `EngineController` switches 2D/3D mode and wires the File menu to scene loading.
- `src/logic/sceneLoader.js`: `SceneLoader` turns a JSON file in `scenes/` into sprites or 3D objects. 2D `x/y/width/height` may be strings like `"width/2"`. Every scene in the File menu is a JSON file; don't build scenes in code.
- `src/logic/sceneSerializer.js` turns the open scene back into that JSON. `sceneFiles.js` (download, open, autosave in `localStorage`) and `sceneFilesMenu.js` (File → Save Scene / Open Scene File / Restore Autosave, Ctrl+S, Ctrl+O) use it. A new sprite, object or light field must be added to both the serializer and `SceneLoader`.
- `src/logic/ui.js`: `EditorUI`, the 2D editor coordinator (explorer tree, selection, undo/redo, code editor). It uses `editor/undoHistory.js` (stacks) and `editor/propertiesPanel.js` (form fields and rendering). `threeUI.js` is the 3D equivalent: its property groups are defined in `three/editor/propertyDefs.js` and rendered by `three/editor/propertyForm.js`.
- `src/logic/behavior.js`: `compileBehavior(code, params)` compiles behavior code once and caches it. Always use it instead of `new Function` (the one exception is `editor/codeProblems.js`, which checks drafts while they are typed).
- `src/logic/editor/codeEditor.js`: the behavior code editor (CodeMirror 6, its own chunk, preloaded when idle). Problems come from `editor/codeProblems.js`. The editable area keeps the id `#code-editor-textarea`; in Playwright, `fill` and `keyboard.type` work on it.
- `src/logic/rss/`: `feed.js` (fetch, parse, merge) and `rssPanel.js` (Project → RSS modal). Feed content is untrusted: render it with `textContent`, never `innerHTML`.
- `src/logic/audioEngine.js` wraps Tone.js (mixers, synths, effects). Effect and instrument types are tables in `audio/effects.js` and `audio/instruments.js`: add a type there. `audioUI.js` is its panel, with markup in `audio/panelTemplate.js` and lists in `audio/lists.js`. Names are user input: build them with DOM nodes, never `innerHTML`.
- `src/components/`: vanilla web components (`<menu-item>`, `<modal-window>`, `<panel-modal>`).
- Behaviors are user code strings. A 2D sprite's `code` runs every frame with `this` = the sprite and `width`/`height` = canvas size. A 3D object's `animation.code` runs with `this.mesh`.
- Globals used across modules: `window.scene`, `window.p5Instance`, `window.gameController`, `window.editorUI`, `window.audioEngine`.

## Commands

```bash
npm install          # once
npm run dev          # editor at http://localhost:5173/js-game-engine/
npm test             # Vitest unit tests (tests/unit), about 2 s
npm run test:e2e     # Playwright: builds, serves on :4173, loads every scene, compares screenshots
npm run test:e2e:update   # only when a visual change is intended; commit the new PNGs
npm run check        # unit tests + build; run this before saying you are done
```

First Playwright run on a new machine: `npx playwright install chromium`.

## How to work in this repo

- Start from an issue or a short spec. For anything bigger than one file, write a plan first and wait for approval.
- Write or update a failing test first, then make it pass. Unit tests go in `tests/unit/*.test.js`, browser tests in `tests/e2e/*.spec.js`.
- Tests mock `audioEngine.js` (Tone.js needs a real AudioContext). Follow `tests/unit/sceneLoader.test.js`.
- A new scene in `scenes/` is checked automatically by `tests/unit/scenes.test.js`. Add it to `tests/e2e/scenes.spec.js` if it has a menu entry.
- Menu items sit in hidden dropdowns. In Playwright, click them with `clickMenu(page, id)` from `tests/e2e/helpers.js`.
- Keep changes small: one feature or fix per branch and PR. Conventional, short commit messages.
- Code style: ES modules, 2-space indent, single quotes, semicolons, classes exported at the bottom of the file. Match the file you are in.

## Never

- Never edit `package-lock.json` by hand, or add a dependency without saying why in the PR.
- Never update screenshot baselines (`tests/e2e/*-snapshots/`) just to make a test pass. Only when the visual change is the point of the PR, and say so.
- Never skip, delete or `.only` a test to get green.
- Never change `vite.config.js` `base` (`/js-game-engine/`), or the GitHub Pages workflow, unless the task is about deployment.
- Never commit `dist/`, `node_modules/`, `.env` or anything with a key in it.

## Known issues

- `manifest.json` points at `icon-192.png` and `icon-512.png`, which don't exist.
