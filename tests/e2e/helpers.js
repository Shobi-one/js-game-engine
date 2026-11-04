import { expect } from '@playwright/test';

// Collects console errors and uncaught exceptions so a test can assert there were none.
// Known issues that exist on main today. Remove an entry once it is fixed.
const KNOWN_ERRORS = [];

export function trackErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && !KNOWN_ERRORS.some((re) => re.test(text))) errors.push(text);
  });
  page.on('pageerror', (err) => errors.push(err.message));
  // Fail loudly instead of hanging on alert() from a failed scene load.
  page.on('dialog', (d) => {
    errors.push(`dialog: ${d.message()}`);
    d.dismiss();
  });
  return errors;
}

export async function openEditor(page) {
  await page.goto('./');
  await expect(page.locator('#canvas-container canvas')).toBeVisible();
}

// Menu items live in hidden dropdowns, so click them through the DOM.
export async function clickMenu(page, id) {
  await page.evaluate((menuId) => document.getElementById(menuId).click(), id);
}
