# The great refactoring

**Goal:** make ClipEngine's two biggest files easy to read and change, and stop recompiling behavior code 60 times a second, without changing what the editor does. Every step must keep the existing tests and screenshot baselines green.

Directed by Obi and carried out by Claude Code, following the plan → tests → code → review loop in `docs/agents.md`.

## Where we start

| File | Lines | Problem |
|---|---|---|
| `src/logic/threeScene.js` | 1,098 | Three classes in one file, plus about 370 lines of preset scenes (`loadLightingDemoScene`, `loadAnimationShowcase`, `loadPhysicsPlayground`, `loadExampleScene`, `loadEmptyScene`) that nothing calls |
| `src/logic/ui.js` | 737 | 2D editor UI mixed with an unrelated RSS reader (200 lines), a 270-line `renderProperties`, and undo/redo stack bookkeeping |
| `Sprite.runCode`, `ThreeObject.runCode` | | `new Function(code)` on every frame for every object |
| `SceneLoader.listScenes()` | | Lists three 3D scenes that have no JSON file |

## Steps (one commit each, tests green after every one)

1. **Safety net first.** Add the tests that would catch a broken refactor before touching code:
   - e2e: add a sprite from the explorer, edit a property, undo, redo, delete
   - e2e: run and stop each 3D scene with no console errors
   - unit: feed parsing (RSS 2.0 and Atom)
2. **Behavior compiler.** New `src/logic/behavior.js` with `compileBehavior(code, params)`, which caches the compiled function per code string. `Sprite` and `ThreeObject` use it. A syntax error is reported once instead of every frame. Unit tested.
3. **Split `threeScene.js`** into `src/logic/three/ThreeObject.js`, `Light.js` and `ThreeScene.js`. `threeScene.js` stays as a one-line re-export so no import breaks.
4. **Preset scenes become data.** Convert the dead `load*Scene` methods into `scenes/3d-lighting.json`, `3d-animation.json` and `3d-physics.json` (generated from the methods, not retyped), add them to the File menu and the e2e scene list, and delete the methods. `listScenes()` is then correct.
5. **Split `ui.js`:**
   - `src/logic/editor/undoHistory.js`: the undo/redo stacks and their 100-entry limit, unit tested
   - `src/logic/editor/propertiesPanel.js`: building the properties form from field definitions
   - `src/logic/rss/feed.js` (pure parsing and merging, unit tested) and `src/logic/rss/rssPanel.js` (the modal)
   - `ui.js` keeps `EditorUI` as the coordinator
6. **Security fix found on the way:** RSS descriptions are written with `innerHTML`, so a hostile feed could run script in the editor. Render them as text.
7. **Docs.** Update the architecture map in `CLAUDE.md`, the project tree in `README.md`, and Known issues.

## Out of scope

- TypeScript, a framework, or new dependencies
- Changing how scenes look or behave (screenshot baselines must not change)
- `audioEngine.js`, `audioUI.js` and `threeUI.js`, which come next if this goes well

## How we know it worked

- `npm test`, `npm run build` and `npm run test:e2e` green, with the original screenshot baselines untouched
- No file this refactor touches is over 450 lines
- The Claude review on the PR finds no behavior changes beyond steps 4 and 6

## Result

| File | Before | After |
|---|---|---|
| `threeScene.js` | 1,098 | split into `three/ThreeScene.js` (428), `ThreeObject.js` (192) and `Light.js` (123); dead presets became 3 scene files |
| `ui.js` | 737 | 317, plus `editor/undoHistory.js`, `editor/propertiesPanel.js`, `rss/feed.js` and `rss/rssPanel.js` |
| Behavior code | compiled every frame | compiled once per code string (`behavior.js`) |
| Unit tests | 21 | 45 |
| Browser tests | 8 | 16 |

The screenshot baselines were not changed.
