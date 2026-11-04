import { describe, it, expect, vi } from 'vitest';
import { parseFeed, fetchFeed, mergeFeedItems, toPlainText } from '../../src/logic/rss/feed.js';

describe('parseFeed', () => {
  it('reads RSS 2.0 items', () => {
    const items = parseFeed(`<?xml version="1.0"?><rss><channel>
      <item><title>One</title><link>https://a/1</link><guid>g1</guid><description>d1</description><pubDate>Tue, 03 Nov 2026 10:00:00 GMT</pubDate></item>
      <item><title>Two</title><link>https://a/2</link></item>
    </channel></rss>`, 'https://example.com/feed');
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ guid: 'g1', link: 'https://a/1', title: 'One', description: 'd1', source: 'https://example.com/feed' });
    expect(items[0].pubDate.toISOString()).toBe('2026-11-03T10:00:00.000Z');
    expect(items[1].guid).toBe('https://a/2');
  });

  it('reads Atom entries', () => {
    const items = parseFeed(`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
      <entry><title>A</title><id>urn:1</id><link rel="alternate" href="https://b/1"/><summary>s</summary><updated>2026-11-01T00:00:00Z</updated></entry>
    </feed>`, 'x');
    expect(items).toEqual([expect.objectContaining({ guid: 'urn:1', link: 'https://b/1', title: 'A', description: 's' })]);
  });
});

describe('fetchFeed', () => {
  it('goes through the proxy and parses the response', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, text: async () => '<rss><channel><item><title>T</title></item></channel></rss>' }));
    const items = await fetchFeed('https://a/feed', 'https://proxy/?');
    expect(globalThis.fetch).toHaveBeenCalledWith('https://proxy/?' + encodeURIComponent('https://a/feed'));
    expect(items[0].title).toBe('T');
  });

  it('returns an empty list when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500 }));
    expect(await fetchFeed('https://x')).toEqual([]);
  });
});

describe('mergeFeedItems', () => {
  it('marks only unseen items as new and sorts newest first', () => {
    const seen = new Map();
    const old = { guid: 'a', title: 'old', pubDate: new Date('2026-01-01') };
    mergeFeedItems(seen, [old]);
    const result = mergeFeedItems(seen, [{ ...old }, { guid: 'b', title: 'new', pubDate: new Date('2026-02-01') }]);
    expect(result.map((i) => i.guid)).toEqual(['b', 'a']);
    expect(result.find((i) => i.guid === 'b')._isNew).toBe(true);
    expect(result.find((i) => i.guid === 'a')._isNew).toBe(false);
  });
});

describe('toPlainText', () => {
  it('drops tags and scripts so feed HTML cannot run', () => {
    expect(toPlainText('<b>hi</b><img src=x onerror="alert(1)"><script>alert(2)</script>')).not.toMatch(/<|onerror/);
    expect(toPlainText('<b>hi</b> there')).toBe('hi there');
  });
});
