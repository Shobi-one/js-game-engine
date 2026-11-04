// PreToolUse hook: while a game is running on the Windows host, block heavy commands
// (builds and browser tests) so the agent does not steal CPU or GPU.
// Works on Windows and in WSL2 (through tasklist.exe). Elsewhere, such as the cloud, it does nothing.
// Add your own games to GAMES. Set CLIPENGINE_IGNORE_GAMING=1 to turn it off.
import { spawnSync } from 'node:child_process';

const GAMES = ['steam.exe', 'EpicGamesLauncher.exe', 'javaw.exe', 'cs2.exe', 'VALORANT.exe', 'FortniteClient-Win64-Shipping.exe', 'RobloxPlayerBeta.exe', 'Unity.exe'];
const HEAVY = /\b(npm run (build|check|test:e2e)|playwright test|vite build)\b/;

const input = JSON.parse(await new Promise((done) => {
  let data = '';
  process.stdin.on('data', (c) => (data += c));
  process.stdin.on('end', () => done(data || '{}'));
}));

if (process.env.CLIPENGINE_IGNORE_GAMING === '1') process.exit(0);
if (!HEAVY.test(input.tool_input?.command || '')) process.exit(0);

const list = spawnSync(process.platform === 'win32' ? 'tasklist' : 'tasklist.exe', ['/fo', 'csv', '/nh'], { encoding: 'utf8' });
if (list.status !== 0 || !list.stdout) process.exit(0); // not on Windows or WSL

const running = GAMES.filter((g) => list.stdout.toLowerCase().includes(`"${g.toLowerCase()}"`));
if (running.length) {
  console.error(`Gaming mode: ${running.join(', ')} is running, so heavy commands are paused. Run only "npm test" for now, or ask the user to close the game.`);
  process.exit(2);
}
process.exit(0);
