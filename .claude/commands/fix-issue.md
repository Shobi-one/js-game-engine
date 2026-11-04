---
description: Reproduce a bug with a failing test, fix it, and open a PR
argument-hint: <issue number or bug description>
---

Fix this bug: $ARGUMENTS

If it is an issue number, read it with `gh issue view $ARGUMENTS`.

1. Find the cause. Say in two or three sentences what is wrong and where.
2. Write a test that fails because of the bug: a unit test in `tests/unit/` if the logic can run without a browser, otherwise a Playwright test in `tests/e2e/`. Run it and show the failure.
3. Make the smallest fix that turns it green. Do not refactor around it.
4. Run `npm run check` and `npm run test:e2e`.
5. If the bug is listed under "Known issues" in CLAUDE.md, remove it there.
6. Commit on `fix/<short-name>`, push, and open a PR that says "Fixes #<issue>", the cause, and the test that proves it.
