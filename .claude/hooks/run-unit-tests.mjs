// PostToolUse hook: after an edit to code or scenes, run the fast unit tests.
// On failure, exit code 2 feeds the output back to Claude so it fixes the break right away.
import { spawnSync } from 'node:child_process';

const input = JSON.parse(await new Promise((done) => {
  let data = '';
  process.stdin.on('data', (c) => (data += c));
  process.stdin.on('end', () => done(data || '{}'));
}));

const file = (input.tool_input?.file_path || '').split('\\').join('/');
if (!/(^|\/)(src|tests\/unit|scenes)\//.test(file)) process.exit(0);

const run = spawnSync('npx', ['vitest', 'run', '--reporter=dot'], {
  cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

if (run.status !== 0) {
  console.error('Unit tests fail after this edit:\n' + (run.stdout + run.stderr).slice(-3000));
  process.exit(2);
}
process.exit(0);
