import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/logic/sketch.js', () => ({ scene: {} }));

// Parsing lives on EditorUI today; after the split it moves to src/logic/rss/feed.js.
const { EditorUI } = await import('../../src/logic/ui.js');
const parse = async (xml) => {
  globalThis.fetch = vi.fn(async () => ({ ok: true, text: async () => xml }));
  return EditorUI.prototype._fetchAndParseFeed.call({}, 'https://example.com/feed', '');
};

describe('feed parsing', () => {
  it('reads RSS 2.0 items', async () => {
    const items = await parse(`<?xml version="1.0"?><rss><channel>
      <item><title>One</title><link>https://a/1</link><guid>g1</guid><description>d1</description><pubDate>Tue, 03 Nov 2026 10:00:00 GMT</pubDate></item>
      <item><title>Two</title><link>https://a/2</link></item>
    </channel></rss>`);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ guid: 'g1', link: 'https://a/1', title: 'One', description: 'd1' });
    expect(items[0].pubDate.toISOString()).toBe('2026-11-03T10:00:00.000Z');
    expect(items[1].guid).toBe('https://a/2');
  });

  it('reads Atom entries', async () => {
    const items = await parse(`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
      <entry><title>A</title><id>urn:1</id><link rel="alternate" href="https://b/1"/><summary>s</summary><updated>2026-11-01T00:00:00Z</updated></entry>
    </feed>`);
    expect(items).toEqual([
      expect.objectContaining({ guid: 'urn:1', link: 'https://b/1', title: 'A', description: 's' }),
    ]);
  });

  it('returns an empty list when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500 }));
    const items = await EditorUI.prototype._fetchAndParseFeed.call({}, 'https://x', '');
    expect(items).toEqual([]);
  });
});

describe('merging feed items', () => {
  it('marks only unseen items as new and sorts newest first', () => {
    const ctx = {};
    const merge = (items) => EditorUI.prototype._mergeAndDetectNew.call(ctx, items);
    const old = { guid: 'a', title: 'old', pubDate: new Date('2026-01-01') };
    merge([old]);
    const result = merge([{ ...old }, { guid: 'b', title: 'new', pubDate: new Date('2026-02-01') }]);
    expect(result.map((i) => i.guid)).toEqual(['b', 'a']);
    expect(result.find((i) => i.guid === 'b')._isNew).toBe(true);
    expect(result.find((i) => i.guid === 'a')._isNew).toBe(false);
  });
});
