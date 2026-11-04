import { test, expect } from '@playwright/test';
import { trackErrors, openEditor, clickMenu } from './helpers.js';

// Guards the 3D editor flows that the threeUI.js split touches.

async function open3D(page) {
  await openEditor(page);
  await clickMenu(page, 'scene-3d-empty');
  await expect(page.locator('#three-container canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!window.threeUI)).toBe(true);
}

const lastObject = (page) =>
  page.evaluate(() => {
    const o = window.threeScene.objects.at(-1);
    const p = o.mesh.position;
    return { id: o.id, type: o.type, name: o.name, x: p.x, y: p.y, z: p.z, code: o.code };
  });

test('add a box, edit its position and color, then delete it', async ({ page }) => {
  const errors = trackErrors(page);
  await open3D(page);
  const before = await page.evaluate(() => window.threeScene.objects.length);

  await page.locator('#three-explorer').click({ button: 'right', position: { x: 40, y: 40 } });
  await page.locator('#three-context-menu [data-action="add-box"]').click();
  await expect.poll(() => page.evaluate(() => window.threeScene.objects.length)).toBe(before + 1);
  const box = await lastObject(page);
  expect(box).toMatchObject({ type: 'box', x: 0, y: 1, z: 0 });

  const x = page.locator(`#prop-${box.id}-position\\.x`);
  await x.fill('2.5');
  await x.dispatchEvent('change');
  // Editing X must not wipe Y and Z.
  await expect.poll(() => lastObject(page)).toMatchObject({ x: 2.5, y: 1, z: 0 });

  const color = page.locator(`#prop-${box.id}-color`);
  await color.fill('#ff0000');
  await color.dispatchEvent('change');
  await expect
    .poll(() => page.evaluate(() => window.threeScene.objects.at(-1).mesh.material.color.getHexString()))
    .toBe('ff0000');

  await page.locator('#properties-panel button', { hasText: 'Delete' }).click();
  await expect.poll(() => page.evaluate(() => window.threeScene.objects.length)).toBe(before);
  expect(errors).toEqual([]);
});

test('every object property group renders for a selected object', async ({ page }) => {
  const errors = trackErrors(page);
  await open3D(page);
  await page.locator('#three-explorer').click({ button: 'right', position: { x: 40, y: 40 } });
  await page.locator('#three-context-menu [data-action="add-sphere"]').click();
  const groups = await page.locator('#properties-panel .property-group .property-label').allTextContents();
  expect(groups.length).toBeGreaterThan(2);
  expect(groups).toContain('Transform');
  expect(errors).toEqual([]);
});

test('selecting a light shows its properties and editing intensity updates it', async ({ page }) => {
  const errors = trackErrors(page);
  await open3D(page);
  const light = page.locator('#three-explorer .tree-item[data-type="light"]').first();
  await light.click();
  const id = await light.getAttribute('data-id');
  const intensity = page.locator(`#prop-${id}-intensity`);
  await intensity.fill('2.5');
  await intensity.dispatchEvent('input');
  await expect
    .poll(() => page.evaluate((lid) => window.threeScene.getLight(Number(lid)).intensity, id))
    .toBe(2.5);
  expect(errors).toEqual([]);
});
