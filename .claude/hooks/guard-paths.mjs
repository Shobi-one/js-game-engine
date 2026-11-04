// PreToolUse hook: blocks agent edits outside the parts of the repo it should touch.
// Exit code 2 blocks the tool call and shows the message to Claude.
import { relative, resolve } from 'node:path';

const input = JSON.parse(await new Promise((done) => {
  let data = '';
  process.stdin.on('data', (c) => (data += c));
  process.stdin.on('end', () => done(data || '{}'));
}));

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const file = input.tool_input?.file_path;
if (!file) process.exit(0);

const rel = relative(root, resolve(root, file)).split('\\').join('/');

const allowed = [
  /^src\//, /^tests\//, /^scenes\//, /^docs\//, /^\.claude\//,
  /^index\.html$/, /^README\.md$/, /^CLAUDE\.md$/, /^CODE_EXAMPLES\.js$/,
  /^manifest\.json$/, /^service-worker\.js$/, /^public\//, /^package\.json$/,
  /^vitest\.config\.js$/, /^playwright\.config\.js$/,
];
const blocked = [/^tests\/e2e\/.*-snapshots\//, /^package-lock\.json$/, /^dist\//, /^node_modules\//];

if (rel.startsWith('..')) {
  console.error(`Blocked: ${file} is outside the repo.`);
  process.exit(2);
}
if (blocked.some((re) => re.test(rel))) {
  console.error(`Blocked: ${rel} is generated. Use npm or "npm run test:e2e:update" instead of editing it.`);
  process.exit(2);
}
if (!allowed.some((re) => re.test(rel))) {
  console.error(`Blocked: ${rel} is outside the paths agents may edit (see .claude/hooks/guard-paths.mjs). Ask the user first.`);
  process.exit(2);
}
process.exit(0);
