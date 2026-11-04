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

test('a new deploy replaces the old copy of a built file in the cache', async ({ page }) => {
  await openEditor(page);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();

  // Pretend an older deploy left index-OLDHASH0.js behind.
  await page.evaluate(async () => {
    const cache = await caches.open((await caches.keys())[0]);
    await cache.put(new URL('assets/index-OLDHASH0.js', location.href).href, new Response('old'));
  });
  await page.reload();

  const urls = await page.evaluate(async () => {
    const cache = await caches.open((await caches.keys())[0]);
    return (await cache.keys()).map((r) => new URL(r.url).pathname);
  });
  expect(urls).not.toContain('/js-game-engine/assets/index-OLDHASH0.js');
  expect(urls.some((u) => /\/assets\/index-.+\.js$/.test(u))).toBe(true);
});
