// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import WebSocket from 'ws';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { EditorBridge, isLocalOrigin } from '../../mcp/bridge.js';
import { createServer } from '../../mcp/server.js';
import { TOOLS } from '../../mcp/tools.js';
import { EDITOR_TOOLS } from '../../src/logic/mcp/editorTools.js';

const open = [];

async function startBridge(options = {}) {
  const bridge = new EditorBridge({ port: 0, ...options });
  const port = await bridge.start();
  open.push(bridge);
  return { bridge, port };
}

// A fake editor tab: says hello, then answers each call with `answer(call)`.
function fakeEditor(port, answer, origin = 'http://localhost:5173') {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`, { origin });
    socket.on('open', () => {
      socket.send(JSON.stringify({ hello: 'clipengine' }));
      // Give the bridge a moment to register the hello.
      setTimeout(() => resolve(socket), 30);
    });
    socket.on('error', reject);
    socket.on('message', async (raw) => {
      const call = JSON.parse(raw);
      try {
        socket.send(JSON.stringify({ id: call.id, result: await answer(call) }));
      } catch (error) {
        socket.send(JSON.stringify({ id: call.id, error: error.message }));
      }
    });
    open.push({ close: () => socket.close() });
  });
}

afterEach(async () => {
  while (open.length) await open.pop().close();
});

describe('MCP bridge to the editor', () => {
  it('accepts pages from this machine only', () => {
    expect(isLocalOrigin('http://localhost:5173')).toBe(true);
    expect(isLocalOrigin('http://127.0.0.1:4173')).toBe(true);
    expect(isLocalOrigin('https://shobi-one.github.io')).toBe(false);
    expect(isLocalOrigin('http://localhost.evil.com')).toBe(false);
    expect(isLocalOrigin(undefined)).toBe(false);
  });

  it('refuses a connection from another site', async () => {
    const { port } = await startBridge();
    await expect(fakeEditor(port, () => null, 'https://example.com')).rejects.toThrow(/401|Unexpected server response/);
  });

  it('forwards a call to the editor and returns its answer', async () => {
    const { bridge, port } = await startBridge();
    await fakeEditor(port, (call) => ({ echoed: call.tool, args: call.args }));
    expect(await bridge.call('get_scene', { a: 1 })).toEqual({ echoed: 'get_scene', args: { a: 1 } });
  });

  it('passes an editor error back as an error', async () => {
    const { bridge, port } = await startBridge();
    await fakeEditor(port, () => { throw new Error('There is no sprite with id 9.'); });
    await expect(bridge.call('delete_item', { kind: 'sprite', id: 9 })).rejects.toThrow('There is no sprite with id 9.');
  });

  it('says how to connect when no editor is open', async () => {
    const { bridge } = await startBridge();
    await expect(bridge.call('get_scene')).rejects.toThrow(/npm run dev/);
  });

  it('gives up on an editor that does not answer', async () => {
    const { bridge, port } = await startBridge({ timeoutMs: 100 });
    await fakeEditor(port, () => new Promise(() => {}));
    await expect(bridge.call('screenshot')).rejects.toThrow(/did not answer "screenshot"/);
  });

  it('talks to the newest editor tab', async () => {
    const { bridge, port } = await startBridge();
    await fakeEditor(port, () => 'old tab');
    await fakeEditor(port, () => 'new tab');
    expect(await bridge.call('get_scene')).toBe('new tab');
  });

  it('explains a port that is already taken', async () => {
    const { port } = await startBridge();
    const { bridge } = await startBridge({ port });
    await expect(bridge.call('get_scene')).rejects.toThrow(/couldn't listen on port .*Another Claude session/);
  });
});

describe('MCP server', () => {
  async function connectClient(bridge) {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const server = createServer(bridge);
    await server.connect(serverSide);
    const client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(clientSide);
    open.push({ close: () => client.close() });
    return client;
  }

  it('lists every tool, and each one has an editor half', async () => {
    const { bridge } = await startBridge();
    const client = await connectClient(bridge);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(TOOLS.map((t) => t.name).sort());
    expect(Object.keys(EDITOR_TOOLS).sort()).toEqual(TOOLS.map((t) => t.name).sort());
    const update = tools.find((t) => t.name === 'update_item');
    expect(update.inputSchema.required).toEqual(expect.arrayContaining(['kind', 'id', 'props']));
  });

  it('returns results as JSON text and screenshots as images', async () => {
    const { bridge, port } = await startBridge();
    await fakeEditor(port, (call) => (call.tool === 'screenshot'
      ? { mimeType: 'image/png', data: 'iVBORw0KGgo=' }
      : { mode: '2d', sprites: [] }));
    const client = await connectClient(bridge);

    const scene = await client.callTool({ name: 'get_scene', arguments: {} });
    expect(JSON.parse(scene.content[0].text)).toEqual({ mode: '2d', sprites: [] });
    const shot = await client.callTool({ name: 'screenshot', arguments: {} });
    expect(shot.content[0]).toEqual({ type: 'image', mimeType: 'image/png', data: 'iVBORw0KGgo=' });
  });

  it('reports a missing editor as a tool error, not a crash', async () => {
    const { bridge } = await startBridge();
    const client = await connectClient(bridge);
    const result = await client.callTool({ name: 'get_scene', arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/not connected/);
  });
});
