import { test, expect } from '@playwright/test';
import net from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { trackErrors, openEditor, clickMenu } from './helpers.js';

// Drives the editor the way Claude Code does: starts mcp/server.js over stdio, lets the
// editor tab connect to it, and calls the tools.

const freePort = () => new Promise((resolve) => {
  const server = net.createServer();
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});

async function connectClaude(page) {
  const port = await freePort();
  const client = new Client({ name: 'clipengine-e2e', version: '1.0.0' });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: ['mcp/server.js'],
    env: { ...process.env, CLIPENGINE_MCP_PORT: String(port) },
    stderr: 'ignore',
  }));
  await page.goto(`./?claude=${port}`);
  await expect(page.locator('#claude-status')).toHaveAttribute('data-state', 'connected');
  const call = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args });
    if (result.isError) throw new Error(result.content[0].text);
    const [content] = result.content;
    return content.type === 'image' ? content : JSON.parse(content.text);
  };
  return { client, call };
}

let session;
test.afterEach(async () => {
  await session?.client.close();
  session = null;
});

test('Claude builds and runs a 2D scene, and Ctrl+Z undoes its edits', async ({ page }) => {
  const errors = trackErrors(page);
  session = await connectClaude(page);
  const { call } = session;
  await call('load_scene', { preset: '2d-empty' });

  const sprite = await call('add_item', { kind: 'sprite', props: { x: 100, y: 100, color: '#ff0000' } });
  await expect(page.locator('#project-explorer .tree-item')).toHaveCount(1);
  await expect(page.locator(`#prop-${sprite.id}-x`)).toHaveValue('100');

  // A syntax error is reported back; the fixed code runs.
  const bad = await call('update_item', { kind: 'sprite', id: sprite.id, props: { code: 'this.x +* 1' } });
  expect(bad.syntaxError).toMatch(/Unexpected/);
  await call('update_item', { kind: 'sprite', id: sprite.id, props: { code: 'this.x += 2;' } });
  const scene = await call('get_scene');
  expect(scene).toMatchObject({ mode: '2d', running: false, sprites: [{ id: sprite.id, color: '#ff0000', code: 'this.x += 2;' }] });

  expect(await call('control', { action: 'run' })).toEqual({ running: true });
  await expect.poll(async () => (await call('get_scene')).sprites[0].x).toBeGreaterThan(110);
  await call('control', { action: 'reset' });
  expect((await call('get_scene')).sprites[0].x).toBe(100);

  const shot = await call('screenshot');
  expect(shot.mimeType).toBe('image/png');
  expect(Buffer.from(shot.data, 'base64').subarray(1, 4).toString()).toBe('PNG');

  // The user's Ctrl+Z undoes Claude's last code change, then the one before it.
  await page.locator('#canvas-container').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await call('get_scene')).sprites[0].code).toBe('this.x +* 1');

  await call('delete_item', { kind: 'sprite', id: sprite.id });
  await expect(page.locator('#project-explorer .tree-item')).toHaveCount(0);
  expect(await call('history', { action: 'undo' })).toEqual({ done: true });
  await expect(page.locator('#project-explorer .tree-item')).toHaveCount(1);

  await expect(call('update_item', { kind: 'sprite', id: 99, props: { x: 1 } })).rejects.toThrow(/no sprite with id 99/);
  expect(errors).toEqual([]);
});

test('Claude builds a 3D scene with an object and a light', async ({ page }) => {
  const errors = trackErrors(page);
  session = await connectClaude(page);
  const { call } = session;
  await call('load_scene', { preset: '3d-empty' });
  expect((await call('get_scene')).mode).toBe('3d');

  const sphere = await call('add_item', { kind: 'object', props: { type: 'sphere', name: 'Moon', position: { x: 1, y: 2, z: 0 } } });
  expect(sphere).toMatchObject({ type: 'sphere', name: 'Moon', position: { x: 1, y: 2, z: 0 } });
  await call('update_item', { kind: 'object', id: sphere.id, props: { position: { y: 3 }, code: 'this.mesh.rotation.y += 0.1;' } });
  const light = await call('add_item', { kind: 'light', props: { type: 'point', intensity: 2 } });

  const scene = await call('get_scene');
  expect(scene.objects.find((o) => o.id === sphere.id)).toMatchObject({ position: { x: 1, y: 3, z: 0 }, code: 'this.mesh.rotation.y += 0.1;' });
  expect(scene.lights.find((l) => l.id === light.id)).toMatchObject({ type: 'point', intensity: 2 });
  await expect(page.locator(`#three-explorer .tree-item[data-type="object"][data-id="${sphere.id}"]`)).toBeVisible();

  const exported = await call('export_scene');
  expect(exported.type).toBe('3d');
  expect(exported.objects.some((o) => o.name === 'Moon')).toBe(true);

  const shot = await call('screenshot');
  expect(Buffer.from(shot.data, 'base64').length).toBeGreaterThan(1000);

  await call('set_mode', { mode: '2d' });
  await expect(page.locator('#canvas-container')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the editor stays unlinked without ?claude', async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  await clickMenu(page, 'scene-2d-new');
  await expect(page.locator('#claude-status')).toBeHidden();
  expect(errors).toEqual([]);
});
