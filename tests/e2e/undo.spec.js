import { test, expect } from '@playwright/test';
import { trackErrors, openEditor, clickMenu } from './helpers.js';

// Undo, redo, duplicate, copy and paste in both editors.

async function open3D(page) {
  await openEditor(page);
  await clickMenu(page, 'scene-3d-empty');
  await expect(page.locator('#three-container canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!window.threeUI)).toBe(true);
}

async function addBox(page) {
  await page.locator('#three-explorer').click({ button: 'right', position: { x: 40, y: 40 } });
  await page.locator('#three-context-menu [data-action="add-box"]').click();
  return page.evaluate(() => window.threeScene.objects.at(-1).id);
}

const objects = (page) => page.evaluate(() =>
  window.threeScene.objects.map((o) => ({ id: o.id, name: o.name, x: o.mesh.position.x, metalness: o.material.metalness })));

async function addSprite(page) {
  await page.locator('#project-explorer').click({ button: 'right', position: { x: 40, y: 40 } });
  await page.locator('#explorer-context-menu .menu-item').click();
  return page.evaluate(() => window.scene.sprites.at(-1).id);
}

const sprites = (page) => page.evaluate(() => window.scene.sprites.map((s) => ({ id: s.id, x: s.x, y: s.y })));

test('3D: undo and redo a move, a delete and a creation', async ({ page }) => {
  const errors = trackErrors(page);
  await open3D(page);
  const start = (await objects(page)).length;
  const id = await addBox(page);

  const x = page.locator(`#prop-${id}-position\\.x`);
  await x.fill('3');
  await x.dispatchEvent('change');
  await expect.poll(async () => (await objects(page)).at(-1).x).toBe(3);

  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await objects(page)).at(-1).x).toBe(0);
  await page.keyboard.press('Control+y');
  await expect.poll(async () => (await objects(page)).at(-1).x).toBe(3);

  await page.locator('#properties-panel button', { hasText: 'Delete' }).click();
  await expect.poll(async () => (await objects(page)).length).toBe(start);
  await page.keyboard.press('Control+z');
  // The box comes back with the same id, position and explorer entry.
  await expect.poll(async () => (await objects(page)).at(-1)).toMatchObject({ id, x: 3 });
  await expect(page.locator(`#three-explorer .tree-item[data-type="object"][data-id="${id}"]`)).toHaveCount(1);

  await page.keyboard.press('Control+z'); // the move
  await page.keyboard.press('Control+z'); // the creation
  await expect.poll(async () => (await objects(page)).length).toBe(start);
  expect(errors).toEqual([]);
});

test('3D: one slider drag is one undo step', async ({ page }) => {
  const errors = trackErrors(page);
  await open3D(page);
  const id = await addBox(page);
  const original = (await objects(page)).at(-1).metalness;
  const slider = page.locator(`#prop-${id}-metalness`);
  for (const value of ['0.1', '0.2', '0.3', '0.9']) {
    await slider.fill(value);
    await slider.dispatchEvent('input');
  }
  await expect.poll(async () => (await objects(page)).at(-1).metalness).toBeCloseTo(0.9);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await objects(page)).at(-1).metalness).toBeCloseTo(original);
  expect(errors).toEqual([]);
});

test('3D: duplicate, copy and paste', async ({ page }) => {
  const errors = trackErrors(page);
  await open3D(page);
  await addBox(page);
  const count = (await objects(page)).length;

  await page.keyboard.press('Control+d');
  await expect.poll(async () => (await objects(page)).length).toBe(count + 1);
  const [original, copy] = (await objects(page)).slice(-2);
  expect(copy).toMatchObject({ name: `${original.name} copy`, x: original.x + 1 });

  await page.keyboard.press('Control+c');
  await clickMenu(page, 'edit-paste');
  await clickMenu(page, 'edit-paste');
  await expect.poll(async () => (await objects(page)).length).toBe(count + 3);
  const xs = (await objects(page)).slice(-2).map((o) => o.x);
  expect(xs).toEqual([original.x + 2, original.x + 3]);

  // A paste is undoable like any creation.
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await objects(page)).length).toBe(count + 2);
  expect(errors).toEqual([]);
});

test('2D: duplicate, copy, paste and undo a property edit', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'scene-2d-new');
  const id = await addSprite(page);
  const { x, y } = (await sprites(page))[0];

  await clickMenu(page, 'edit-duplicate');
  await expect.poll(async () => (await sprites(page)).length).toBe(2);
  expect((await sprites(page))[1]).toMatchObject({ x: x + 20, y: y + 20 });

  await page.locator(`#project-explorer .tree-item[data-id="${id}"]`).click();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await expect.poll(async () => (await sprites(page)).length).toBe(3);
  await expect(page.locator('#project-explorer .tree-item')).toHaveCount(3);

  const pastedId = (await sprites(page))[2].id;
  const color = page.locator(`#prop-${pastedId}-color`);
  const before = await page.evaluate((sid) => window.scene.getItem('sprite', sid).color, pastedId);
  await color.fill('#123456');
  await color.dispatchEvent('change');
  await expect.poll(() => page.evaluate((sid) => window.scene.getItem('sprite', sid).color, pastedId)).toBe('#123456');
  await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate((sid) => window.scene.getItem('sprite', sid).color, pastedId)).toBe(before);
  expect(errors).toEqual([]);
});

test('Ctrl+Z in 3D mode leaves the 2D scene alone, and the code editor keeps its own undo', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'scene-2d-new');
  await addSprite(page);

  await clickMenu(page, 'view-3d');
  await expect.poll(() => page.evaluate(() => !!window.threeUI)).toBe(true);
  await page.keyboard.press('Control+z');
  await clickMenu(page, 'view-2d');
  expect((await sprites(page)).length).toBe(1);

  // Typing in the code editor and pressing Ctrl+Z must not undo the sprite.
  await page.locator('#project-explorer .tree-item').click();
  await page.locator('#properties-panel button', { hasText: 'Edit Logic' }).click();
  const textarea = page.locator('#code-editor-textarea');
  await textarea.focus();
  await page.keyboard.type('x');
  await page.keyboard.press('Control+z');
  expect((await sprites(page)).length).toBe(1);
  expect(errors).toEqual([]);
});
