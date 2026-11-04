import { test, expect } from '@playwright/test';
import { trackErrors, openEditor, clickMenu } from './helpers.js';

const FEED = `<?xml version="1.0"?><rss><channel>
  <item><title>Patch notes</title><link>https://example.com/1</link><guid>1</guid>
    <description><![CDATA[<b>Bold</b> text<img src=x onerror="window.__pwned = true">]]></description></item>
</channel></rss>`;

test('RSS panel shows feed items as plain text', async ({ page }) => {
  const errors = trackErrors(page);
  await page.route('https://corsproxy.io/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/rss+xml', body: FEED }));
  await openEditor(page);

  await clickMenu(page, 'open-rss-menu');
  await page.locator('#rss-feed-1').fill('https://example.com/feed.xml');
  await page.locator('#rss-load-btn').click();

  const row = page.locator('#rss-list .rss-item');
  await expect(row).toHaveCount(1);
  await expect(row.locator('a')).toHaveText('Patch notes');
  await expect(row).toContainText('Bold text');
  await expect(row.locator('img, b')).toHaveCount(0);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  expect(errors).toEqual([]);
});
