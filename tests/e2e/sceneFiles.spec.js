import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { trackErrors, openEditor, clickMenu } from './helpers.js';

const spriteSummary = (page) => page.evaluate(() =>
  window.scene.sprites.map((s) => `${Math.round(s.x)},${Math.round(s.y)},${s.width},${s.height},${s.color}`));

test('Ctrl+S saves the 3D scene and Open Scene File loads it back', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'scene-3d-example');
  await expect(page.locator('#three-container canvas')).toBeVisible();
  await page.waitForTimeout(300);
  const names = await page.evaluate(() => window.threeScene.objects.map((o) => o.name));

  const downloadPromise = page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('example-scene.json');
  const saved = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(saved.type).toBe('3d');
  expect(saved.objects.map((o) => o.name)).toEqual(names);

  // Switch away, then open the saved file again.
  await clickMenu(page, 'scene-2d-sample');
  await expect(page.locator('#canvas-container canvas')).toBeVisible();
  const chooserPromise = page.waitForEvent('filechooser');
  await clickMenu(page, 'scene-open');
  await (await chooserPromise).setFiles({ name: 'mine.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
  await expect.poll(() => page.evaluate(() => window.threeScene?.objects.map((o) => o.name))).toEqual(names);
  expect(errors).toEqual([]);
});

test('File → Save Scene saves the 2D scene and it reopens the same', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'scene-2d-sample');
  await expect.poll(() => page.evaluate(() => window.scene.sprites.length)).toBeGreaterThan(0);
  const before = await spriteSummary(page);

  const downloadPromise = page.waitForEvent('download');
  await clickMenu(page, 'scene-save');
  const saved = JSON.parse(await readFile(await (await downloadPromise).path(), 'utf8'));
  expect(saved).toMatchObject({ name: 'Sample 2D Scene', type: '2d' });

  await clickMenu(page, 'scene-2d-new');
  await expect.poll(() => page.evaluate(() => window.scene.sprites.length)).toBe(0);
  const chooserPromise = page.waitForEvent('filechooser');
  await clickMenu(page, 'scene-open');
  await (await chooserPromise).setFiles({ name: 'mine.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
  await expect.poll(() => spriteSummary(page)).toEqual(before);
  await expect(page.locator('#project-explorer .tree-item')).toHaveCount(before.length);
  expect(errors).toEqual([]);
});

test('the autosave survives a reload and can be restored from the File menu', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await expect(page.locator('#scene-restore')).toBeHidden();
  await clickMenu(page, 'scene-2d-sample');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('clipengine:autosave') || 'null')?.scene.name),
    { timeout: 10000 }).toBe('Sample 2D Scene');
  const before = await spriteSummary(page);

  await page.reload();
  await expect(page.locator('#canvas-container canvas')).toBeVisible();
  await expect(page.locator('#scene-restore')).toBeAttached();
  expect(await page.locator('#scene-restore').evaluate((el) => el.hidden)).toBe(false);
  await clickMenu(page, 'scene-restore');
  await expect.poll(() => spriteSummary(page)).toEqual(before);

  // The startup scene must not have overwritten the autosave before it was restored.
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('clipengine:autosave')).scene.name)).toBe('Sample 2D Scene');
  expect(errors).toEqual([]);
});

test('a save after switching modes uses the open scene\'s own name', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'scene-2d-sample');
  await expect.poll(() => page.evaluate(() => window.scene.sprites.length)).toBeGreaterThan(0);
  await clickMenu(page, 'view-3d');
  await expect(page.locator('#three-container canvas')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  expect((await downloadPromise).suggestedFilename()).toBe('untitled-3d-scene.json');

  await clickMenu(page, 'view-2d');
  const again = page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  expect((await again).suggestedFilename()).toBe('sample-2d-scene.json');
  expect(errors).toEqual([]);
});

test('opening a file that is not a scene says so', async ({ page }) => {
  await openEditor(page);
  const dialogPromise = page.waitForEvent('dialog');
  const chooserPromise = page.waitForEvent('filechooser');
  await clickMenu(page, 'scene-open');
  await (await chooserPromise).setFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello": 1}') });
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain('Not a ClipEngine scene file');
  await dialog.dismiss();
});
