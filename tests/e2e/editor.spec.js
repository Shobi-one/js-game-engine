import { test, expect } from '@playwright/test';
import { trackErrors, openEditor, clickMenu } from './helpers.js';

// Guards the 2D editor flows that the ui.js split touches.

async function addSprite(page) {
  await page.locator('#project-explorer').click({ button: 'right', position: { x: 40, y: 40 } });
  await page.locator('#explorer-context-menu .menu-item').click();
}

const sprites = (page) => page.evaluate(() => window.scene.sprites.map((s) => ({ id: s.id, x: s.x })));

test('add, edit, undo, redo and delete a sprite', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'scene-2d-new');
  await expect.poll(() => sprites(page)).toEqual([]);

  await addSprite(page);
  await expect(page.locator('#project-explorer .tree-item')).toHaveCount(1);
  const [{ id }] = await sprites(page);

  // The properties panel shows the new sprite; changing X updates the sprite.
  const xInput = page.locator(`#prop-${id}-x`);
  await xInput.fill('123');
  await xInput.dispatchEvent('change');
  await expect.poll(async () => (await sprites(page))[0].x).toBe(123);

  // Undo the creation, then redo it.
  await page.keyboard.press('Control+z');
  await expect(page.locator('#project-explorer .tree-item')).toHaveCount(0);
  await page.keyboard.press('Control+y');
  await expect(page.locator('#project-explorer .tree-item')).toHaveCount(1);

  // Delete from the properties panel, then undo the delete.
  await page.locator('#project-explorer .tree-item').click();
  await page.locator('#properties-panel button', { hasText: 'Delete' }).click();
  await expect.poll(() => sprites(page)).toEqual([]);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await sprites(page)).length).toBe(1);

  expect(errors).toEqual([]);
});

test('behavior code edited in the code editor runs', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'scene-2d-new');
  await addSprite(page);

  await page.locator('#properties-panel button', { hasText: 'Edit Logic' }).click();
  await page.locator('#code-editor-textarea').fill('this.x = width - 10;');
  await page.locator('#code-editor-apply').click();

  await clickMenu(page, 'run-game');
  const canvasWidth = await page.evaluate(() => window.p5Instance.width);
  await expect.poll(() => page.evaluate(() => window.scene.sprites[0].x)).toBe(canvasWidth - 10);
  await clickMenu(page, 'stop-game');
  expect(errors).toEqual([]);
});

test('a syntax error in behavior code is logged once, not every frame', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'scene-2d-new');
  await addSprite(page);
  await page.evaluate(() => { window.scene.sprites[0].code = 'this.x +* 1'; });
  await clickMenu(page, 'run-game');
  await page.waitForTimeout(500); // about 30 frames
  await clickMenu(page, 'stop-game');
  expect(errors.filter((e) => e.includes('Error in sprite'))).toHaveLength(1);
});

test('the same syntax error is reported again after the code was fixed', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'scene-2d-new');
  await addSprite(page);
  await clickMenu(page, 'run-game');
  for (const code of ['this.x +* 1', 'this.x += 1;', 'this.x +* 1']) {
    await page.evaluate((c) => window.scene.updateSprite(window.scene.sprites[0].id, { code: c }), code);
    await page.waitForTimeout(200);
  }
  await clickMenu(page, 'stop-game');
  expect(errors.filter((e) => e.includes('Error in sprite'))).toHaveLength(2);
});
