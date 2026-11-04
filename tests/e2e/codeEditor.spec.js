import { test, expect } from '@playwright/test';
import { trackErrors, openEditor, clickMenu } from './helpers.js';

async function openSpriteCode(page) {
  await openEditor(page);
  await clickMenu(page, 'scene-2d-new');
  await page.locator('#project-explorer').click({ button: 'right', position: { x: 40, y: 40 } });
  await page.locator('#explorer-context-menu .menu-item').click();
  await page.locator('#properties-panel button', { hasText: 'Edit Logic' }).click();
  await expect(page.locator('#code-editor-mount .cm-editor')).toBeVisible();
}

const status = (page) => page.locator('#code-editor-status');

test('the code editor has line numbers, highlighting and a problem-free status', async ({ page }) => {
  const errors = trackErrors(page);
  await openSpriteCode(page);
  await page.locator('#code-editor-textarea').fill('this.rotation += 2;\nthis.x += 1;');
  await expect(page.locator('#code-editor-mount .cm-gutter.cm-lineNumbers .cm-gutterElement', { hasText: '2' })).toBeVisible();
  // Keywords get their own highlight class.
  await expect(page.locator('#code-editor-mount .cm-content span').filter({ hasText: 'this' }).first()).toBeVisible();
  await expect(status(page)).toHaveText('No problems');
  expect(errors).toEqual([]);
});

test('a syntax error is marked on its line before Apply', async ({ page }) => {
  const errors = trackErrors(page);
  await openSpriteCode(page);
  await page.locator('#code-editor-textarea').fill('this.x += 1;\nif (this.x > 5 {\n  this.x = 0;\n}');
  await expect(status(page)).toHaveText(/^Line 2: Syntax error:/);
  await expect(page.locator('#code-editor-mount .cm-lintRange-error')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('a runtime error from the last run shows on its line when the editor opens', async ({ page }) => {
  const errors = trackErrors(page);
  await openSpriteCode(page);
  await page.locator('#code-editor-textarea').fill('const speed = 2;\nthis.missing.x += speed;');
  await page.locator('#code-editor-apply').click();
  await clickMenu(page, 'run-game');
  await expect.poll(() => errors.length).toBeGreaterThan(0);
  await clickMenu(page, 'stop-game');

  await page.locator('#properties-panel button', { hasText: 'Edit Logic' }).click();
  await expect(status(page)).toHaveText(/^Line 2: Last run: Cannot read properties of undefined/);
  // The engine logged the error once; that is the error this test caused on purpose.
  expect(errors.filter((e) => !e.includes("reading 'x'"))).toEqual([]);
});

// Ctrl+Z inside the editor is covered by undo.spec.js (from the undo PR), which routes shortcuts away from text fields.
test('Tab indents, Enter keeps the indent, and Apply saves the code', async ({ page }) => {
  const errors = trackErrors(page);
  await openSpriteCode(page);
  const content = page.locator('#code-editor-textarea');
  await content.fill('if (true) {');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('this.x = 1;');
  await page.locator('#code-editor-apply').click();
  // Enter after "{" indents the new line (and the editor adds the closing brace).
  expect(await page.evaluate(() => window.scene.sprites[0].code)).toMatch(/^if \(true\) \{\n\s+this\.x = 1;/);

  await page.locator('#properties-panel button', { hasText: 'Edit Logic' }).click();
  await content.fill('this.y = 2;');
  await page.keyboard.press('Home');
  await page.keyboard.press('Tab');
  await page.locator('#code-editor-apply').click();
  // Tab indents instead of moving focus out of the editor.
  expect(await page.evaluate(() => window.scene.sprites[0].code)).toMatch(/^\s+this\.y = 2;$/);
  expect(errors).toEqual([]);
});

test('3D objects use the same editor', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'scene-3d-empty');
  await expect.poll(() => page.evaluate(() => !!window.threeUI)).toBe(true);
  await page.locator('#three-explorer').click({ button: 'right', position: { x: 40, y: 40 } });
  await page.locator('#three-context-menu [data-action="add-box"]').click();
  await page.locator('#properties-panel button', { hasText: 'Edit Code' }).click();
  await page.locator('#code-editor-textarea').fill('this.mesh.rotation.y += 0.01;');
  await expect(status(page)).toHaveText('No problems');
  await page.locator('#code-editor-apply').click();
  expect(await page.evaluate(() => window.threeScene.objects.at(-1).code)).toBe('this.mesh.rotation.y += 0.01;');
  expect(errors).toEqual([]);
});

test('typing keeps the cursor in place across new lines', async ({ page }) => {
  const errors = trackErrors(page);
  await openSpriteCode(page);
  await page.locator('#code-editor-textarea').click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await page.keyboard.type('const a = 1;');
  await page.keyboard.press('Enter');
  await page.keyboard.type('this.x = a;');
  await page.locator('#code-editor-apply').click();
  expect(await page.evaluate(() => window.scene.sprites[0].code)).toBe('const a = 1;\nthis.x = a;');
  expect(errors).toEqual([]);
});

test('Escape closes the autocomplete popup first, then the editor', async ({ page }) => {
  const errors = trackErrors(page);
  await openSpriteCode(page);
  await page.locator('#code-editor-textarea').click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await page.keyboard.type('cons');
  await expect(page.locator('.cm-tooltip-autocomplete')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.cm-tooltip-autocomplete')).toHaveCount(0);
  await expect(page.locator('#code-editor-mount .cm-editor')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#code-editor-mount .cm-editor')).toBeHidden();
  expect(errors).toEqual([]);
});

test('Escape still closes other modals', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'open-rss-menu');
  await expect(page.locator('#rss-feed-1')).toBeVisible();
  await page.locator('#rss-feed-1').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#rss-feed-1')).toBeHidden();
  expect(errors).toEqual([]);
});

test.describe('without the service worker', () => {
  // The service worker takes over the page as soon as it activates, and page.route can't
  // intercept its fetches, so whether the failed chunk load is seen would depend on timing.
  test.use({ serviceWorkers: 'block' });

  test('a code editor that failed to load says so, and opens after a reload', async ({ page }) => {
    const errors = trackErrors(page);
    // Fail the CodeMirror chunk once, as when offline or right after a deploy.
    let failed = false;
    await page.route(/codeEditorView.*\.js/, (route) => {
      if (failed) return route.continue();
      failed = true;
      return route.abort();
    });
    const openLogic = async () => {
      await clickMenu(page, 'scene-2d-new');
      await page.locator('#project-explorer').click({ button: 'right', position: { x: 40, y: 40 } });
      await page.locator('#explorer-context-menu .menu-item').click();
      await page.locator('#properties-panel button', { hasText: 'Edit Logic' }).click();
    };
    await openEditor(page);
    await openLogic();
    // trackErrors records (and dismisses) the alert.
    await expect.poll(() => errors.filter((e) => e.startsWith('dialog:'))).toEqual([expect.stringMatching(/could not be loaded.*reload/)]);
    await expect(page.locator('#code-editor-mount .cm-editor')).toHaveCount(0);

    await openEditor(page);
    await openLogic();
    await expect(page.locator('#code-editor-mount .cm-editor')).toBeVisible();
    // The failed request, its warning and the alert are what this test causes on purpose.
    expect(errors.filter((e) => !/ERR_FAILED|^dialog: The code editor could not be loaded/.test(e))).toEqual([]);
  });
});
