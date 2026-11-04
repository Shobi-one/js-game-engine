import { test, expect } from '@playwright/test';
import { trackErrors, openEditor, clickMenu } from './helpers.js';

const scenes2D = [
  { menu: 'scene-2d-new', name: '2d-empty' },
  { menu: 'scene-2d-sample', name: '2d-sample' },
  { menu: 'scene-2d-audio-demo', name: '2d-audio-demo' },
];
const scenes3D = [
  { menu: 'scene-3d-empty', name: '3d-empty' },
  { menu: 'scene-3d-example', name: '3d-example' },
];

test('editor loads with no errors', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  expect(errors).toEqual([]);
});

for (const { menu, name } of scenes2D) {
  test(`2D scene ${name} loads and runs`, async ({ page }) => {
    const errors = trackErrors(page);
    await openEditor(page);
    await clickMenu(page, menu);
    await expect(page.locator('#canvas-container canvas')).toBeVisible();
    await clickMenu(page, 'run-game');
    await page.waitForTimeout(500);
    await clickMenu(page, 'stop-game');
    expect(errors).toEqual([]);
  });
}

for (const { menu, name } of scenes3D) {
  test(`3D scene ${name} loads and runs`, async ({ page }) => {
    const errors = trackErrors(page);
    await openEditor(page);
    await clickMenu(page, menu);
    await expect(page.locator('#three-container canvas')).toBeVisible();
    await page.waitForTimeout(300);
    await clickMenu(page, 'run-game');
    await page.waitForTimeout(500);
    await clickMenu(page, 'stop-game');
    expect(errors).toEqual([]);
  });
}

test('3D example scene animates while running', async ({ page }) => {
  await openEditor(page);
  await clickMenu(page, 'scene-3d-example');
  await expect(page.locator('#three-container canvas')).toBeVisible();
  await page.waitForTimeout(300);
  const snapshot = () =>
    page.evaluate(() => window.threeScene.objects.map((o) => o.mesh.rotation.y + o.mesh.position.y).join(','));
  const before = await snapshot();
  await clickMenu(page, 'run-game');
  await expect.poll(snapshot).not.toBe(before);
});
