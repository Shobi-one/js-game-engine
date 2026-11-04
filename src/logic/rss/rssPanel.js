import { DEFAULT_PROXY, fetchFeed, itemKey, mergeFeedItems, toPlainText } from './feed.js';

// The Project → Open RSS Feeds modal.
class RssPanel {
  constructor() {
    this.seen = new Map();
    this.timer = null;

    this.feedInputs = [document.getElementById('rss-feed-1'), document.getElementById('rss-feed-2')];
    this.proxyInput = document.getElementById('rss-proxy');
    this.modal = document.getElementById('rss-modal');
    this.list = document.getElementById('rss-list');

    document.getElementById('open-rss-menu')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.modal) {
        this.modal.show();
        setTimeout(() => this.loadFeeds(), 20);
      }
    });
    document.getElementById('rss-load-btn')?.addEventListener('click', () => this.loadFeeds());
    document.getElementById('rss-start-btn')?.addEventListener('click', () => this.startPolling());
    document.getElementById('rss-stop-btn')?.addEventListener('click', () => this.stopPolling());

    if (this.proxyInput && !this.proxyInput.value) this.proxyInput.value = DEFAULT_PROXY;
  }

  async loadFeeds() {
    try {
      const urls = this.feedInputs.map((input) => input?.value?.trim()).filter(Boolean);
      const proxy = this.proxyInput?.value?.trim() || DEFAULT_PROXY;
      const items = [];
      for (const url of urls) items.push(...(await fetchFeed(url, proxy)));
      this.render(mergeFeedItems(this.seen, items));
    } catch (err) {
      console.error('loadFeeds failed', err);
    }
  }

  startPolling(intervalMs = 30000) {
    if (this.timer) return;
    this.timer = setInterval(() => this.loadFeeds(), intervalMs);
    console.log('RSS polling started every', intervalMs, 'ms');
  }

  stopPolling() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    console.log('RSS polling stopped');
  }

  render(items) {
    if (!this.list) return;
    this.list.innerHTML = '';

    if (!items.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#666;font-size:13px';
      empty.textContent = 'No items';
      this.list.appendChild(empty);
      return;
    }

    for (const it of items) {
      const row = document.createElement('div');
      row.className = 'rss-item';
      row.dataset.key = itemKey(it);
      row.style.padding = '6px';
      row.style.borderBottom = '1px solid #eee';
      if (it._isNew) row.style.background = '#fff9e6';

      const link = document.createElement('a');
      link.href = /^https?:/i.test(it.link) ? it.link : '#';
      link.textContent = it.title || '(no title)';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.display = 'block';
      link.style.fontWeight = '600';

      const meta = document.createElement('div');
      meta.style.fontSize = '12px';
      meta.style.color = '#666';
      const date = it.pubDate ? new Date(it.pubDate).toLocaleString() : 'no date';
      meta.textContent = `${date} • ${it.source || ''}`;

      // Feed content is untrusted: show it as text, never as HTML.
      const desc = document.createElement('div');
      desc.style.fontSize = '13px';
      desc.style.marginTop = '4px';
      const plain = toPlainText(it.description);
      desc.textContent = plain.length > 300 ? `${plain.substring(0, 300)}…` : plain;

      row.append(link, meta, desc);
      this.list.appendChild(row);

      if (it._isNew) {
        setTimeout(() => {
          row.style.background = '';
          it._isNew = false;
        }, 6000);
      }
    }
  }
}

export { RssPanel };
