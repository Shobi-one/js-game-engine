import { test, expect } from '@playwright/test';
import { trackErrors, openEditor, clickMenu } from './helpers.js';

// Guards the Edit → Audio Engine panel that the audioUI.js split touches.

test('audio panel: start audio, make a sound, add an effect, mix and adjust channels', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'open-audio-engine');
  const panel = page.locator('#audio-panel-modal');
  await expect(panel).toBeVisible();

  await page.locator('#audio-init-btn').click();
  await expect(page.locator('#audio-init-btn')).toHaveText('✓ Audio Ready');

  // Sounds tab: generate two sounds and select one.
  for (const [name, type] of [['lead', 'synth'], ['hat', 'metal']]) {
    await page.locator('#sound-name').fill(name);
    await page.locator('#sound-type').selectOption(type);
    await page.locator('#generate-sound-btn').click();
  }
  await expect(page.locator('#sounds-list .audio-list-item')).toHaveCount(2);
  await page.locator('#sounds-list [data-sound="lead"]').click();
  await expect(page.locator('#current-sound-name')).toHaveText('lead');
  await page.locator('#sound-volume').fill('-12');
  await page.locator('#sound-volume').dispatchEvent('input');
  await expect.poll(() => page.evaluate(() => window.audioEngine.getSoundInfo('lead').options.volume)).toBe(-12);
  await page.locator('#play-sound-btn').click();

  // Effects tab: create a delay, change a type-specific control, apply it.
  await panel.locator('.audio-tab[data-tab="effects"]').click();
  await page.locator('#effect-name').fill('echo');
  await page.locator('#effect-type').selectOption('delay');
  await page.locator('#create-effect-btn').click();
  await page.locator('#effects-list [data-effect="echo"]').click();
  await expect(page.locator('#effect-param-feedback')).toBeVisible();
  await page.locator('#effect-param-feedback').fill('0.8');
  await page.locator('#effect-param-feedback').dispatchEvent('input');
  await expect.poll(() => page.evaluate(() => window.audioEngine.getEffectInfo('echo').options.feedback)).toBe(0.8);
  await page.locator('#effect-target-sound').selectOption('lead');
  await page.locator('#apply-effect-btn').click();

  // Mixer tab: channel volume, mute, master and a mix.
  await panel.locator('.audio-tab[data-tab="mixer"]').click();
  const sfx = page.locator('.channel-volume[data-channel="sfx"]');
  await sfx.fill('-20');
  await sfx.dispatchEvent('input');
  await expect.poll(() => page.evaluate(() => window.audioEngine.mixers.get('sfx').volume)).toBe(-20);
  await page.locator('.channel-mute[data-channel="music"]').check();
  await expect.poll(() => page.evaluate(() => window.audioEngine.mixers.get('music').mute)).toBe(true);
  await page.locator('#mix-name').fill('band');
  await page.locator('#mix-sounds-select input[value="lead"]').check();
  await page.locator('#mix-sounds-select input[value="hat"]').check();
  await page.locator('#create-mix-btn').click();
  await expect.poll(() => page.evaluate(() => window.audioEngine.getAllMixers())).toContain('band');

  await page.locator('#audio-panel-close').click();
  await expect(panel).toBeHidden();
  expect(errors).toEqual([]);
});
