/**
 * Connects the editor to the local ClipEngine MCP server (mcp/server.js), so Claude Code
 * can read and edit the scene. Only on this machine: the editor connects when it is served
 * from localhost and is either the dev server (`npm run dev`) or opened with ?claude in the
 * URL (?claude=PORT picks another port). The live site never connects.
 *
 * The "Claude" dot in the menu bar shows the link: grey while waiting for the server,
 * green when connected.
 */
import { runEditorTool } from './editorTools.js';

export const DEFAULT_PORT = 7357;
const RETRY_MS = [1000, 2000, 5000, 10000];

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The port to connect to, or null when the bridge should stay off. */
export function bridgePort(location, isDev) {
  if (!LOCAL_HOSTS.has(location.hostname)) return null;
  const param = new URLSearchParams(location.search).get('claude');
  if (param === null && !isDev) return null;
  const port = Number(param);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_PORT;
}

function setStatus(element, state) {
  if (!element) return;
  element.hidden = false;
  element.dataset.state = state;
  element.title = state === 'connected'
    ? 'Claude is connected to this editor through the ClipEngine MCP server.'
    : 'Waiting for the ClipEngine MCP server. Open Claude Code in the repo to start it.';
}

export function initClaudeBridge({ location = window.location, isDev = import.meta.env.DEV } = {}) {
  const port = bridgePort(location, isDev);
  if (port === null) return null;
  const status = document.getElementById('claude-status');
  let attempt = 0;
  let socket = null;

  const connect = () => {
    socket = new WebSocket(`ws://127.0.0.1:${port}`);
    setStatus(status, 'waiting');
    socket.addEventListener('open', () => {
      attempt = 0;
      socket.send(JSON.stringify({ hello: 'clipengine' }));
      setStatus(status, 'connected');
    });
    socket.addEventListener('message', async (event) => {
      let call;
      try {
        call = JSON.parse(event.data);
      } catch {
        return;
      }
      try {
        const result = await runEditorTool(call.tool, call.args);
        socket.send(JSON.stringify({ id: call.id, result: result ?? null }));
      } catch (error) {
        socket.send(JSON.stringify({ id: call.id, error: error?.message ?? String(error) }));
      }
    });
    socket.addEventListener('close', () => {
      setStatus(status, 'waiting');
      setTimeout(connect, RETRY_MS[Math.min(attempt++, RETRY_MS.length - 1)]);
    });
  };

  connect();
  return { port, get connected() { return socket?.readyState === WebSocket.OPEN; } };
}
