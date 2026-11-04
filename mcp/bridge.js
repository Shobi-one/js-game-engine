/**
 * The link between the MCP server and the ClipEngine editor running in a browser tab.
 *
 * The server listens on 127.0.0.1 only and accepts connections only from pages served
 * from localhost, so the live GitHub Pages site (or any other site) can't attach to it.
 * The newest editor tab that connects wins. Messages are JSON:
 *   editor → server  { hello: 'clipengine' }                  once, after connecting
 *   server → editor  { id, tool, args }                       a tool call
 *   editor → server  { id, result } or { id, error }          its answer
 */
import { WebSocketServer } from 'ws';

export const DEFAULT_PORT = 7357;
/** The close code an editor tab gets when a newer tab takes the link; that tab then stops reconnecting. */
export const REPLACED_CODE = 4000;

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/** True for a page served from this machine. */
export const isLocalOrigin = (origin) => LOCAL_ORIGIN.test(origin ?? '');

export class EditorBridge {
  constructor({ port = DEFAULT_PORT, timeoutMs = 15000, log = () => {} } = {}) {
    this.requestedPort = port;
    this.timeoutMs = timeoutMs;
    this.log = log;
    this.editor = null;
    this.pending = new Map();
    this.nextId = 1;
    this.listenError = null;
  }

  /** Starts listening. Resolves with the port (useful when asked for port 0). */
  start() {
    return new Promise((resolve) => {
      this.wss = new WebSocketServer({
        host: '127.0.0.1',
        port: this.requestedPort,
        verifyClient: ({ origin }) => isLocalOrigin(origin),
      });
      this.wss.on('listening', () => {
        this.port = this.wss.address().port;
        this.log(`Waiting for the ClipEngine editor on ws://127.0.0.1:${this.port}`);
        resolve(this.port);
      });
      this.wss.on('error', (error) => {
        // Usually EADDRINUSE: another Claude session already runs a ClipEngine server.
        this.listenError = error;
        this.log(`Could not listen on port ${this.requestedPort}: ${error.message}`);
        resolve(null);
      });
      this.wss.on('connection', (socket) => this._attach(socket));
    });
  }

  _attach(socket) {
    socket.once('message', (raw) => {
      let hello;
      try {
        hello = JSON.parse(raw);
      } catch {
        hello = null;
      }
      if (hello?.hello !== 'clipengine') {
        socket.close(1008, 'not a ClipEngine editor');
        return;
      }
      if (this.editor && this.editor !== socket) this.editor.close(REPLACED_CODE, 'another editor tab connected');
      this.editor = socket;
      this.log('ClipEngine editor connected');
      socket.on('message', (data) => this._onMessage(data));
    });
    socket.on('close', () => {
      // Calls sent to this tab can no longer be answered, even when a newer tab replaced it.
      for (const [id, waiting] of this.pending) {
        if (waiting.socket !== socket) continue;
        clearTimeout(waiting.timer);
        this.pending.delete(id);
        waiting.reject(new Error('The editor tab closed before it answered.'));
      }
      if (this.editor !== socket) return;
      this.editor = null;
      this.log('ClipEngine editor disconnected');
    });
  }

  _onMessage(data) {
    let message;
    try {
      message = JSON.parse(data);
    } catch {
      return;
    }
    const waiting = this.pending.get(message.id);
    if (!waiting) return;
    this.pending.delete(message.id);
    clearTimeout(waiting.timer);
    if ('error' in message) waiting.reject(new Error(message.error));
    else waiting.resolve(message.result);
  }

  get connected() {
    return Boolean(this.editor);
  }

  /** Runs a tool in the editor and resolves with its result. */
  call(tool, args = {}) {
    if (!this.editor) {
      if (this.listenError) {
        return Promise.reject(new Error(`The ClipEngine MCP server couldn't listen on port ${this.requestedPort} `
          + `(${this.listenError.code ?? this.listenError.message}). Another Claude session probably runs it already.`));
      }
      return Promise.reject(new Error('The ClipEngine editor is not connected. Start it with `npm run dev` and open '
        + 'http://localhost:5173/js-game-engine/ in a browser; the "Claude" dot in the menu bar turns green when it is linked.'));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`The editor did not answer "${tool}" within ${this.timeoutMs / 1000} s.`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer, socket: this.editor });
      this.editor.send(JSON.stringify({ id, tool, args }));
    });
  }

  close() {
    for (const { timer } of this.pending.values()) clearTimeout(timer);
    this.pending.clear();
    return new Promise((resolve) => {
      if (!this.wss) return resolve();
      for (const client of this.wss.clients) client.terminate();
      this.wss.close(() => resolve());
    });
  }
}
