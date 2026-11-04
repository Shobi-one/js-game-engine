import { test, expect } from '@playwright/test';
import { trackErrors, openEditor, clickMenu } from './helpers.js';

async function open3DWithBox(page) {
  await openEditor(page);
  await clickMenu(page, 'scene-3d-empty');
  await expect(page.locator('#three-container canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!window.threeUI)).toBe(true);
  await page.locator('#three-explorer').click({ button: 'right', position: { x: 40, y: 40 } });
  await page.locator('#three-context-menu [data-action="add-box"]').click();
  return page.evaluate(() => window.threeScene.objects.at(-1).id);
}

const gizmo = (page) => page.evaluate(() => {
  const g = window.threeUI.gizmo;
  return { attached: g.controls.object?.userData?.objectId ?? (g.controls.object ? 'other' : null), mode: g.controls.mode,
    snap: g.controls.translationSnap };
});

// Screen position of an object's centre, for a real click on it.
const screenPoint = (page, id) => page.evaluate((oid) => {
  const { camera, renderer, objects } = window.threeScene;
  const v = objects.find((o) => o.id === oid).mesh.position.clone().project(camera);
  const r = renderer.domElement.getBoundingClientRect();
  return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
}, id);

test('selecting an object shows the handles; W, E and R switch them', async ({ page }) => {
  const errors = trackErrors(page);
  const id = await open3DWithBox(page);
  await expect.poll(() => gizmo(page)).toMatchObject({ attached: id, mode: 'translate' });
  await page.locator('#three-container canvas').hover();
  await page.keyboard.press('e');
  await expect.poll(async () => (await gizmo(page)).mode).toBe('rotate');
  await page.keyboard.press('r');
  await expect.poll(async () => (await gizmo(page)).mode).toBe('scale');
  await page.keyboard.press('w');
  await expect.poll(async () => (await gizmo(page)).mode).toBe('translate');
  expect(errors).toEqual([]);
});

test('clicking an object in the 3D view selects it', async ({ page }) => {
  const errors = trackErrors(page);
  const first = await open3DWithBox(page);
  // Move the first box aside and add a second, which becomes selected.
  const x = page.locator(`#prop-${first}-position\\.x`);
  await x.fill('-3');
  await x.dispatchEvent('change');
  await page.locator('#three-explorer').click({ button: 'right', position: { x: 40, y: 40 } });
  await page.locator('#three-context-menu [data-action="add-box"]').click();
  await expect.poll(async () => (await gizmo(page)).attached).not.toBe(first);

  const point = await screenPoint(page, first);
  await page.mouse.click(point.x, point.y);
  await expect.poll(async () => (await gizmo(page)).attached).toBe(first);
  await expect(page.locator(`#three-explorer .tree-item[data-type="object"][data-id="${first}"]`)).toHaveClass(/selected/);
  expect(errors).toEqual([]);
});

test('a gizmo drag updates the object and the panel, and is one undo step', async ({ page }) => {
  const errors = trackErrors(page);
  const id = await open3DWithBox(page);
  // Simulate a drag: the same events TransformControls sends while a handle is dragged.
  await page.evaluate(() => {
    const { controls } = window.threeUI.gizmo;
    controls.dragging = true;
    controls.object.position.x = 2;
    controls.object.position.z = -1;
    controls.dragging = false;
  });
  await expect.poll(() => page.evaluate(() => window.threeScene.objects.at(-1).position)).toEqual({ x: 2, y: 1, z: -1 });
  await expect(page.locator(`#prop-${id}-position\\.x`)).toHaveValue('2');

  await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate(() => {
    const o = window.threeScene.objects.at(-1);
    return [o.position.x, o.position.z, o.mesh.position.x];
  })).toEqual([0, 0, 0]);
  expect(errors).toEqual([]);
});

test('View → Snap to Grid turns gizmo snapping on and off', async ({ page }) => {
  const errors = trackErrors(page);
  await open3DWithBox(page);
  expect((await gizmo(page)).snap).toBeNull();
  await clickMenu(page, 'view-snap');
  await expect.poll(async () => (await gizmo(page)).snap).toBe(1);
  await expect(page.locator('#view-snap')).toHaveAttribute('text', 'Snap to Grid: On');
  await clickMenu(page, 'view-snap');
  await expect.poll(async () => (await gizmo(page)).snap).toBeNull();
  expect(errors).toEqual([]);
});

test('the handles hide while the game runs and come back when it stops', async ({ page }) => {
  const errors = trackErrors(page);
  const id = await open3DWithBox(page);
  await clickMenu(page, 'run-game');
  await expect.poll(async () => (await gizmo(page)).attached).toBeNull();
  await clickMenu(page, 'stop-game');
  await expect.poll(async () => (await gizmo(page)).attached).toBe(id);
  expect(errors).toEqual([]);
});
