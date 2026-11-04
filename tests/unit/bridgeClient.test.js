import { describe, it, expect } from 'vitest';
import { bridgePort, DEFAULT_PORT } from '../../src/logic/mcp/bridgeClient.js';

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
