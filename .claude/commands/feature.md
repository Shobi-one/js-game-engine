---
description: Build a feature from an issue or spec with the plan → tests → code → PR loop
argument-hint: <issue number or short spec>
---

Build this feature: $ARGUMENTS

If it is an issue number, read it with `gh issue view $ARGUMENTS`.

1. **Spec.** Restate the feature as checkable acceptance criteria, the files in scope, and what is out of scope. If anything is unclear, ask now.
2. **Plan.** Read the relevant code (start from the map in CLAUDE.md) and propose a short plan: which files change and why, and which tests prove it. Stop and wait for approval before editing.
3. **Tests first.** Use the `test-writer` subagent to write failing tests from the acceptance criteria. Run them and show that they fail for the right reason.
4. **Implement** until `npm test` passes. Keep the diff to what the criteria need.
5. **Verify.** Run `npm run check`, then `npm run test:e2e`. If the change is visual on purpose, run `npm run test:e2e:update`, look at the new PNGs, and say so.
6. **Review.** Ask the `reviewer` subagent to review the diff, and fix what it finds.
7. **Docs.** Ask the `docs-keeper` subagent whether README.md or CLAUDE.md need an update.
8. **PR.** Commit on a branch named `feat/<short-name>`, push, and open a PR that links the issue, lists the acceptance criteria as a checklist, and says how it was tested.
