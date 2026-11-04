---
description: Write a 2D sprite behavior and add it to a scene, with a test
argument-hint: <what the sprite should do>
---

Write a ClipEngine 2D sprite behavior that does this: $ARGUMENTS

Rules for behavior code (it runs every frame through `Sprite.runCode` in `src/logic/sketch.js`):
- `this` is the sprite: `x`, `y`, `width`, `height`, `rotation`, `color`, plus any state you add (initialize it with `if (this.foo === undefined) this.foo = ...`).
- `width` and `height` are the canvas size. For input, use `window.p5Instance` (`mouseX`, `mouseY`, `keyIsDown`, ...).
- For sound, use `this.playAudio(name)` or `this.playAudioOnce(event, name)`.
- No imports, no `await`, no DOM access. Keep it under about 30 lines.

Then:
1. Add a sprite with this code to `scenes/2d-sample.json`, or to the scene the user names, keeping the JSON formatting.
2. Add the snippet to `CODE_EXAMPLES.js` with a one-line comment.
3. Run `npm test`. `tests/unit/scenes.test.js` checks that the code compiles.
4. Run `npm run test:e2e`. If the 2D screenshot changes because of the new sprite, update the baseline with `npm run test:e2e:update` and say so.
