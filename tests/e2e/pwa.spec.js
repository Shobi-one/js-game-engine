import { test, expect } from '@playwright/test';
import { openEditor } from './helpers.js';

test('service worker registers and controls the page', async ({ page }) => {
  await openEditor(page);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toMatch(/\/js-game-engine\/$/);

  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
});

test('editor still opens offline after one visit', async ({ page, context }) => {
  await openEditor(page);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload(); // let the worker see and cache the page's assets
  await expect(page.locator('#canvas-container canvas')).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#canvas-container canvas')).toBeVisible();
});
