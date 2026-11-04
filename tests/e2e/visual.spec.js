import { test, expect } from '@playwright/test';
import { openEditor, clickMenu } from './helpers.js';

// Screenshots of the scenes in edit mode (not running), so frames are stable.
// Baselines live in tests/e2e/visual.spec.js-snapshots/. Update them on purpose with:
//   npm run test:e2e:update
test('2D sample scene matches baseline', async ({ page }) => {
  await openEditor(page);
  await clickMenu(page, 'scene-2d-sample');
  await page.waitForTimeout(500);
  await expect(page.locator('#canvas-container')).toHaveScreenshot('2d-sample.png');
});

test('3D example scene matches baseline', async ({ page }) => {
  await openEditor(page);
  await clickMenu(page, 'scene-3d-example');
  await expect(page.locator('#three-container canvas')).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.locator('#three-container')).toHaveScreenshot('3d-example.png');
});
