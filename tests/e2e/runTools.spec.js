import { test, expect } from '@playwright/test';
import { trackErrors, openEditor, clickMenu } from './helpers.js';

const sampleState = (page) => page.evaluate(() =>
  window.scene.sprites.map((s) => [Math.round(s.x), Math.round(s.y), Math.round(s.rotation), 'velocity' in s]));

test('Run → Reset Scene puts the 2D sample back the way it was before Run', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'scene-2d-sample');
  await expect.poll(() => page.evaluate(() => window.scene.sprites.length)).toBeGreaterThan(2);
  const before = await sampleState(page);

  await clickMenu(page, 'run-game');
  await expect.poll(() => sampleState(page)).not.toEqual(before);
  await clickMenu(page, 'reset-game');
  expect(await page.evaluate(() => window.gameController.isRunning)).toBe(false);
  expect(await sampleState(page)).toEqual(before);

  // Running again starts from the reset state.
  await clickMenu(page, 'run-game');
  await expect.poll(() => sampleState(page)).not.toEqual(before);
  await clickMenu(page, 'stop-game');
  expect(errors).toEqual([]);
});

test('Run → Reset Scene puts animated 3D objects back', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'scene-3d-example');
  await expect(page.locator('#three-container canvas')).toBeVisible();
  await page.waitForTimeout(300);
  const meshes = () => page.evaluate(() =>
    window.threeScene.objects.map((o) => [o.mesh.position.y, o.mesh.rotation.y].map((n) => n.toFixed(4)).join(',')));
  const before = await meshes();

  await clickMenu(page, 'run-game');
  await expect.poll(meshes).not.toEqual(before);
  await clickMenu(page, 'reset-game');
  expect(await page.evaluate(() => window.threeScene.isRunning)).toBe(false);
  expect(await meshes()).toEqual(before);
  expect(errors).toEqual([]);
});

test('Reset Scene does nothing before the first run', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'scene-2d-sample');
  await expect.poll(() => page.evaluate(() => window.scene.sprites.length)).toBeGreaterThan(2);
  const before = await sampleState(page);
  await clickMenu(page, 'reset-game');
  expect(await sampleState(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test('View → Show FPS shows a frame rate and remembers the choice', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  const counter = page.locator('#fps-counter');
  await expect(counter).toBeHidden();
  await clickMenu(page, 'view-fps');
  await expect(counter).toBeVisible();
  await expect(counter).toHaveText(/^\d+ FPS$/);
  await expect(page.locator('#view-fps')).toHaveAttribute('text', 'Show FPS: On');

  await page.reload();
  await expect(page.locator('#fps-counter')).toBeVisible();
  await clickMenu(page, 'view-fps');
  await expect(page.locator('#fps-counter')).toBeHidden();
  expect(errors).toEqual([]);
});

test('the app manifest and its icons are served', async ({ page, request }) => {
  await openEditor(page);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifestUrl = new URL(href, page.url()).href;
  const manifest = await (await request.get(manifestUrl)).json();
  expect(new URL(manifest.start_url, manifestUrl).pathname).toBe('/js-game-engine/');
  for (const icon of manifest.icons) {
    const res = await request.get(new URL(icon.src, manifestUrl).href);
    expect(res.status(), icon.src).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  }
});
