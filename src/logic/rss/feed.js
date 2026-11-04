// Fetching, parsing and merging RSS 2.0 and Atom feeds. No DOM rendering here.

export const DEFAULT_PROXY = 'https://corsproxy.io/?';

const text = (node, selector) => node.querySelector(selector)?.textContent?.trim() || '';

/** Parses an RSS 2.0 or Atom document into a list of items. */
export function parseFeed(xml, source) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) console.warn('XML parse error for', source);

  const rssItems = doc.querySelectorAll('item');
  if (rssItems.length) {
    return Array.from(rssItems, (node) => {
      const title = text(node, 'title') || 'No title';
      const link = text(node, 'link') || text(node, 'guid');
      const pub = text(node, 'pubDate') || text(node, 'dc\\:date');
      return {
        guid: text(node, 'guid') || link || title,
        link,
        title,
        description: text(node, 'description'),
        pubDate: pub ? new Date(pub) : null,
        source,
      };
    });
  }

  return Array.from(doc.querySelectorAll('entry'), (node) => {
    const title = text(node, 'title') || 'No title';
    const linkEl = node.querySelector('link[rel="alternate"]') || node.querySelector('link');
    const pub = text(node, 'updated') || text(node, 'published');
    return {
      guid: text(node, 'id') || title,
      link: linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || '',
      title,
      description: text(node, 'summary') || text(node, 'content'),
      pubDate: pub ? new Date(pub) : null,
      source,
    };
  });
}

/** Fetches and parses one feed. Returns [] on any failure. */
export async function fetchFeed(url, proxy = '') {
  try {
    const res = await fetch(proxy ? proxy + encodeURIComponent(url) : url);
    if (!res.ok) throw new Error(`Network response was not ok: ${res.status}`);
    return parseFeed(await res.text(), url);
  } catch (err) {
    console.error('Failed to fetch/parse feed', url, err);
    return [];
  }
}

export const itemKey = (it) => it.guid || it.link || `${it.title}|${it.pubDate?.toString() || ''}`;

/**
 * Adds items to `seen` (a Map kept between polls), marks unseen ones with `_isNew`,
 * and returns everything seen so far, newest first.
 */
export function mergeFeedItems(seen, items) {
  for (const it of items) {
    const key = itemKey(it);
    it._isNew = !seen.has(key);
    if (it.pubDate && !(it.pubDate instanceof Date)) it.pubDate = new Date(it.pubDate);
    seen.set(key, { ...seen.get(key), ...it });
  }
  const time = (it) => (it.pubDate ? new Date(it.pubDate).getTime() : 0);
  return Array.from(seen.values()).sort((a, b) => time(b) - time(a));
}

/** Strips HTML from a feed description so it can be shown as plain text. */
export function toPlainText(html) {
  return new DOMParser().parseFromString(html || '', 'text/html').body.textContent || '';
}
