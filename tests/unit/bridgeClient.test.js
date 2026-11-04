import { describe, it, expect, vi, afterEach } from 'vitest';
import { bridgePort, initClaudeBridge, DEFAULT_PORT, REPLACED_CODE } from '../../src/logic/mcp/bridgeClient.js';
import { REPLACED_CODE as SERVER_REPLACED_CODE } from '../../mcp/bridge.js';

const at = (url) => new URL(url);

describe('when the editor connects to the local MCP server', () => {
  it('connects from the dev server on this machine', () => {
    expect(bridgePort(at('http://localhost:5173/js-game-engine/'), true)).toBe(DEFAULT_PORT);
    expect(bridgePort(at('http://127.0.0.1:5173/js-game-engine/'), true)).toBe(DEFAULT_PORT);
  });

  it('needs ?claude in a built copy, which can also pick the port', () => {
    expect(bridgePort(at('http://localhost:4173/js-game-engine/'), false)).toBeNull();
    expect(bridgePort(at('http://localhost:4173/js-game-engine/?claude'), false)).toBe(DEFAULT_PORT);
    expect(bridgePort(at('http://localhost:4173/js-game-engine/?claude=9000'), false)).toBe(9000);
    expect(bridgePort(at('http://localhost:4173/js-game-engine/?claude=nope'), false)).toBe(DEFAULT_PORT);
  });

  it('never connects from the live site', () => {
    expect(bridgePort(at('https://shobi-one.github.io/js-game-engine/'), true)).toBeNull();
    expect(bridgePort(at('https://shobi-one.github.io/js-game-engine/?claude=7357'), false)).toBeNull();
  });
});

describe('the editor link', () => {
  const sockets = [];
  class FakeSocket extends EventTarget {
    constructor(url) {
      super();
      this.url = url;
      this.sent = [];
      sockets.push(this);
    }
    send(data) { this.sent.push(data); }
    serverCloses(code) { this.dispatchEvent(Object.assign(new Event('close'), { code })); }
  }

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    sockets.length = 0;
    document.body.innerHTML = '';
  });

  function start() {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeSocket);
    document.body.innerHTML = '<span id="claude-status" hidden></span>';
    initClaudeBridge({ location: new URL('http://localhost:5173/js-game-engine/'), isDev: true });
    sockets[0].dispatchEvent(new Event('open'));
    return document.getElementById('claude-status');
  }

  it('reconnects when the server goes away', () => {
    const status = start();
    expect(status.dataset.state).toBe('connected');
    sockets[0].serverCloses(1006);
    expect(status.dataset.state).toBe('waiting');
    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);
  });

  it('stays off when another tab takes the link, so two tabs do not take turns', () => {
    expect(REPLACED_CODE).toBe(SERVER_REPLACED_CODE);
    const status = start();
    sockets[0].serverCloses(REPLACED_CODE);
    expect(status.dataset.state).toBe('replaced');
    vi.advanceTimersByTime(60000);
    expect(sockets).toHaveLength(1);
  });
});
