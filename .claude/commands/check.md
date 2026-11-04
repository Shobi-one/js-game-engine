---
description: Run every check and summarize what is red
---

Run these in order and stop at the first failure:

1. `npm test`
2. `npm run build`
3. `npm run test:e2e`

For each failure, say which test failed, the likely cause in one sentence, and the file to look at. Do not fix anything unless the user asks. If everything is green, say so in one line.
