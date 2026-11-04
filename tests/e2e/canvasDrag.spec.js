import { test, expect } from '@playwright/test';
import { trackErrors, openEditor, clickMenu } from './helpers.js';

async function newSpriteScene(page) {
  await openEditor(page);
  await clickMenu(page, 'scene-2d-new');
  await page.locator('#project-explorer').click({ button: 'right', position: { x: 40, y: 40 } });
  await page.locator('#explorer-context-menu .menu-item').click();
  return page.evaluate(() => window.scene.sprites.at(-1).id);
}

// Page coordinates of a canvas point.
const toPage = (page, x, y) => page.evaluate(([cx, cy]) => {
  const canvas = document.querySelector('#canvas-container canvas');
  const r = canvas.getBoundingClientRect();
  return { x: r.left + (cx * r.width) / window.p5Instance.width, y: r.top + (cy * r.height) / window.p5Instance.height };
}, [x, y]);

const spritePos = (page, id) => page.evaluate((sid) => {
  const s = window.scene.getItem('sprite', sid);
  return { x: s.x, y: s.y };
}, id);

async function dragBy(page, from, dx, dy) {
  const start = await toPage(page, from.x, from.y);
  const end = await toPage(page, from.x + dx, from.y + dy);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move((start.x + end.x) / 2, (start.y + end.y) / 2);
  await page.mouse.move(end.x, end.y);
  await page.mouse.up();
}

test('drag a sprite on the canvas, then undo the move', async ({ page }) => {
  const errors = trackErrors(page);
  const id = await newSpriteScene(page);
  const start = await spritePos(page, id);

  await dragBy(page, start, 60, -40);
  await expect.poll(() => spritePos(page, id)).toEqual({ x: expect.closeTo(start.x + 60, 0), y: expect.closeTo(start.y - 40, 0) });
  // The properties panel shows the new position.
  const x = Number(await page.locator(`#prop-${id}-x`).inputValue());
  expect(x).toBeCloseTo(start.x + 60, 0);

  await page.keyboard.press('Control+z');
  await expect.poll(() => spritePos(page, id)).toEqual(start);
  expect(errors).toEqual([]);
});

test('with Snap to Grid on, a dragged sprite lands on the 20 px grid', async ({ page }) => {
  const errors = trackErrors(page);
  const id = await newSpriteScene(page);
  await clickMenu(page, 'view-snap');
  const start = await spritePos(page, id);
  await dragBy(page, start, 47, 13);
  const end = await spritePos(page, id);
  expect(end.x % 20).toBe(0);
  expect(end.y % 20).toBe(0);
  expect(Math.abs(end.x - (start.x + 47))).toBeLessThanOrEqual(10);
  expect(errors).toEqual([]);
});

test('clicking a sprite selects it; sprites do not move while the game runs', async ({ page }) => {
  const errors = trackErrors(page);
  const first = await newSpriteScene(page);
  await page.locator('#project-explorer').click({ button: 'right', position: { x: 40, y: 40 } });
  await page.locator('#explorer-context-menu .menu-item').click();
  const second = await page.evaluate(() => window.scene.sprites.at(-1).id);
  // Move the second sprite aside, then click the first one.
  await page.evaluate((sid) => window.scene.updateSprite(sid, { x: 60, y: 60 }), second);
  const firstPos = await spritePos(page, first);
  const point = await toPage(page, firstPos.x, firstPos.y);
  await page.mouse.click(point.x, point.y);
  await expect(page.locator(`#project-explorer .tree-item[data-id="${first}"]`)).toHaveClass(/selected/);

  await clickMenu(page, 'run-game');
  await page.evaluate((sid) => window.scene.updateSprite(sid, { code: '' }), first);
  await dragBy(page, firstPos, 50, 50);
  expect(await spritePos(page, first)).toEqual(firstPos);
  await clickMenu(page, 'stop-game');
  expect(errors).toEqual([]);
});
