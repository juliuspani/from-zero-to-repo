---
description: Session start. Read the project state and report before touching anything.
---

Read CLAUDE.md, PROGRESS.md (especially the HANDOFF section), git status and git log -5.

Do not modify anything yet. Summarize in 5 lines where we are, what you will do next, and whether you see any
inconsistency between PROGRESS.md and the real state of the repository (uncommitted changes, commits that
PROGRESS.md does not mention, statements that contradict each other).

Check that the guard hook is alive: try to Read the file `.env.hookcheck` (it does not need to exist). The
call must come back BLOCKED by .claude/hooks/guard.mjs. If it is not blocked, the hook is not running (node
missing, path not expanded, hook broken): say so first, in capitals, and do nothing else until I answer.

Wait for my approval.
