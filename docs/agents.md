# Coding agents on ClipEngine

ClipEngine is built with Claude Code as a pair programmer. This page says what is set up, the one-time steps, and how to use it day to day. Agents work in the dev workflow only. Nothing here runs AI inside the engine.

## What is in the repo

| Piece | Where | What it does |
|---|---|---|
| Project brief | `CLAUDE.md` | Architecture, commands and "never do" rules every agent session reads first |
| Slash commands | `.claude/commands/` | `/feature`, `/fix-issue`, `/new-sprite-behavior`, `/new-scene`, `/check` |
| Subagents | `.claude/agents/` | `test-writer` (only edits `tests/`), `reviewer` (read-only), `docs-keeper` (only edits docs) |
| Guardrail hooks | `.claude/hooks/` | Block edits outside `src/`, `tests/`, `scenes/` and docs; run unit tests after every edit; pause builds while you game |
| Permissions | `.claude/settings.json` | Edits auto-accepted, safe commands allowlisted, `git push` and `npm install` ask, `rm -rf` and `curl` denied |
| Tests | `tests/unit/`, `tests/e2e/` | Vitest unit tests, Playwright tests that load every scene with no console errors, screenshot comparison of the 2D and 3D samples |
| CI | `.github/workflows/ci.yml` | Unit tests with coverage, build, browser and visual tests on every PR |
| Agents in GitHub | `.github/workflows/claude.yml`, `claude-review.yml` | `@claude` on issues and PRs, and an automatic review on each new PR |

## One-time setup (about 10 minutes)

1. **Install the Claude GitHub app** on this repo: https://github.com/apps/claude, then choose "Only select repositories" and pick `js-game-engine`.
2. **Add a secret** in the repo under Settings → Secrets and variables → Actions → New repository secret. Pick one:
   - If you have Claude Pro or Max, run `claude setup-token` in a terminal, and save the token as `CLAUDE_CODE_OAUTH_TOKEN`. Usage counts against your plan.
   - Otherwise, create a key at https://console.anthropic.com/settings/keys and save it as `ANTHROPIC_API_KEY`. This bills per use, so set a monthly limit in the console.
3. **Check it works:** open an issue titled "Test" with the body `@claude say hi and list the slash commands in this repo`. Within a minute or two Claude replies in the issue.

## Day to day: three modes

### 1. Off-PC (default, zero impact on your PC)

Everything runs on GitHub or in Anthropic's cloud. Use this while you game, or from your phone.

- **Issue → PR.** Write an issue as a spec: what you want, acceptance criteria as bullets, and what is out of scope. End it with `@claude please implement this using /feature`. Claude plans, writes tests, implements, runs CI and opens a PR.
- **Fix through review.** On a PR, comment `@claude the bouncing ball should slow down at the edges, fix that`. It pushes a commit to the same PR.
- **Automatic review.** Every PR you open gets a Claude review with inline comments. You still merge.
- **Cloud sessions.** At https://claude.ai/code (or in the Claude app on your phone) pick `js-game-engine`, then type the task. It works in a cloud container, runs the tests there, and pushes a branch for you to review.

### 2. Background (on your PC, kept out of the way)

For when you want to watch it work, without it slowing your games.

- Run Claude Code in **WSL2** (Windows Subsystem for Linux), not in Windows directly. Cap it with `%UserProfile%\.wslconfig`:

  ```ini
  [wsl2]
  memory=8GB
  processors=4
  ```

  Then run `wsl --shutdown` once so the limits apply.
- Or open the repo in VS Code and choose **Reopen in Container**. `.devcontainer/` gives you a container with Node, Playwright and Claude Code, capped at 4 CPUs and 8 GB.
- Give each task its own worktree so it never touches the checkout you have open: `claude --worktree`.
- **Gaming mode** is on by default: if Steam or a game in `.claude/hooks/gaming-mode.mjs` is running, builds and browser tests are paused, and only the fast unit tests run. Add your games to the `GAMES` list. Set `CLIPENGINE_IGNORE_GAMING=1` to turn it off.

### 3. Full access (only when you choose it)

For evenings you are not gaming. Start it on purpose, inside WSL2 or the container, never on bare Windows:

```bash
claude --settings .claude/settings.full.example.json
```

It skips permission prompts. Commit or push your work first, so anything it does can be undone with git.

## The feature loop

1. Write the issue as a spec.
2. `/feature <issue number>`: Claude restates the criteria and proposes a plan, then waits.
3. You fix the plan, then approve it.
4. `test-writer` writes failing tests, Claude implements until they pass, then runs the build and the browser tests.
5. `reviewer` checks the diff, and `docs-keeper` updates the docs.
6. Claude opens the PR, the Claude review and CI run, you read the diff and merge.
7. If you had to explain something twice, add a line to `CLAUDE.md`.

## Good first tasks

- Undo/redo for the 3D editor (the 2D editor in `ui.js` already has an undo stack).
- `onCollide` events for 2D sprites.
- Fix the known issues listed in `CLAUDE.md` (`listScenes()` naming missing scenes).
- Export a scene as a standalone HTML game.

## When a screenshot test fails

The visual tests compare the 2D and 3D sample scenes with PNGs in `tests/e2e/visual.spec.js-snapshots/`. If CI fails there:

- The change was not meant to be visual: it is a real regression. Open the `playwright-report` artifact on the failed run to see the diff.
- The change was meant to be visual, or the baselines need regenerating on GitHub's runners: run **Actions → Update screenshot baselines → Run workflow** on your branch.
