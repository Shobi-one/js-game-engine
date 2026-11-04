---
description: Create a new sample scene (2D or 3D), add it to the File menu, and test it
argument-hint: <2d|3d> <what the scene shows>
---

Create a new ClipEngine sample scene: $ARGUMENTS

1. Read the scene format in README.md and copy the shape of `scenes/2d-sample.json` or `scenes/3d-example.json`.
2. Write the new file as `scenes/<type>-<short-name>.json`.
3. Add a `<menu-item>` for it in the File menu in `index.html`, and its click handler next to the others in `src/logic/threeIntegration.js` (`_load2DScene` or `_loadPresetScene`).
4. Add the scene to the list in `tests/e2e/scenes.spec.js`.
5. Run `npm test` and `npm run test:e2e`, and fix any errors.
6. Add one line about it under "Sample Scenes" in README.md.
