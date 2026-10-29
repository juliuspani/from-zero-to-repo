---
description: Handoff. Close the session so the next one can start from PROGRESS.md alone.
---

This command counts as my approval of the step, unless a mandatory stop (CLAUDE.md §7) is still open.

We are changing step. Do not start new work. Do all of this, in order:

1. If a sub-step is half done, finish it if it is short; otherwise revert only that sub-step and say so.

2. Run the full check (build, typecheck, lint, tests, secrets scan) and record the real result, without hiding
   failures. A check that does not exist is reported as missing, not as passed.

3. Update PROGRESS.md with a HANDOFF section:
   - current step and sub-step (e.g. Step 25, part 2 of 3);
   - what was finished in this session;
   - what remains exactly, with the next concrete action;
   - files touched;
   - decisions taken and ADRs created;
   - open questions that need my approval;
   - status of build, typecheck, lint and tests;
   - risks or fragile things the next session must watch.
   Move the previous HANDOFF to docs/progress/HISTORY.md and approved decisions to docs/progress/DECISIONS.md,
   so PROGRESS.md stays under 200 lines without losing information.

4. Commit:
   - if the full check passes: a normal commit;
   - if it does not: commit on the branch wip/step-N with the prefix WIP, and the reason in PROGRESS.md.
   Never leave uncommitted changes.

5. Show me: git status, the commit hash, the branch and the HANDOFF block.

6. After the commit, run git push origin <current branch> and show me the result. If it fails, tell me and do
   not retry with --force.
