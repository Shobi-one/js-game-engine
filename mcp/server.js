#!/usr/bin/env node
/**
 * ClipEngine MCP server. Claude Code starts it over stdio once registered with
 * `claude mcp add clipengine -- node mcp/server.js`; it forwards each
 * tool call to the editor tab through EditorBridge. See docs/agents.md.
 *
 * CLIPENGINE_MCP_PORT sets the editor port (default 7357; the editor connects to the
 * same port, or to the one given as ?claude=PORT in its URL).
 */
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { EditorBridge, DEFAULT_PORT } from './bridge.js';
import { TOOLS } from './tools.js';

/** An MCP server whose tools run in the editor connected to `bridge`. */
export function createServer(bridge) {
  const server = new McpServer({ name: 'clipengine', version: '1.0.0' });
  for (const tool of TOOLS) {
    server.registerTool(tool.name, { description: tool.description, inputSchema: tool.input }, async (args) => {
      try {
        const result = await bridge.call(tool.name, args ?? {});
        if (tool.image) return { content: [{ type: 'image', data: result.data, mimeType: result.mimeType }] };
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: error.message }] };
      }
    });
  }
  return server;
}

async function main() {
  // stdout carries the MCP protocol, so everything else goes to stderr.
  const log = (message) => process.stderr.write(`[clipengine] ${message}\n`);
  const port = Number(process.env.CLIPENGINE_MCP_PORT) || DEFAULT_PORT;
  const bridge = new EditorBridge({ port, log });
  await bridge.start();
  const server = createServer(bridge);
  await server.connect(new StdioServerTransport());
  const stop = async () => {
    await bridge.close();
    process.exit(0);
  };
  process.stdin.on('close', stop);
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

// Run only when started as a program, not when a test imports createServer.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
