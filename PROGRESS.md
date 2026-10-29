# PROGRESS

Last update: <YYYY-MM-DD> (handoff: <one line>). Maximum 200 lines (`CLAUDE.md` §3); `npm test` fails above that.

## Current state

- **Step:** <none in progress | N, part X of Y>.
- **Work in progress:** <none | what is half done and the next concrete action>.
- **Last closed step:** <N> (<YYYY-MM-DD>).
- **Branch:** `main`, remote `<origin>`.

### Plan

- **Done:** steps 1 to <N>. One line each lives in `docs/progress/HISTORY.md`.
- **Next:** step <N+1>, <title>, when the owner pastes its prompt.
- **Later:** <steps known but not yet scoped>.

### Checks (<YYYY-MM-DD>, handoff)

| Check | Status | Note |
|---|---|---|
| build | <PASS / FAIL / does not exist> | <command and anything worth knowing> |
| typecheck | <PASS / FAIL / does not exist> | |
| lint | <PASS / FAIL / does not exist> | |
| tests | <PASS / FAIL> | <how many> |
| secrets scan | <PASS / FAIL / does not exist> | |

## Pending decisions

Decisions that need the owner. "None open." when empty.

## Decisions taken by Claude

Taken in autonomous mode (`CLAUDE.md` §7) and not yet approved. Once approved by a handoff they move to
`docs/progress/DECISIONS.md`.

| # | Decision | Why | Where |
|---|---|---|---|
| 1 | <what> | <one line> | <file or ADR> |

## Commitments for future steps

Things a step promised that a later step must do. In parentheses, the step that took the commitment.

| Step | Commitment |
|---|---|
| <N> | (<origin step>) <what must be done and how it will be checked> |

## HANDOFF (<YYYY-MM-DD>, step <N>: <title>)

**Step and sub-step.** <Step N, part X of Y>.

**Finished in this session.**
- <point>

**What remains exactly.** <The next concrete action, not a vague direction.>

**Files touched.** <list or folders>

**Commits.** <first..last>

**Decisions and ADRs.** <ADR NNNN, or "none">

**Open questions for the owner.** <"None block." or the list>

**Checks.** <real result of the full check, including failures>

**Watch out.** <fragile things the next session must keep in mind>

## Previous handoffs (summary)

Full text in `docs/progress/HISTORY.md`.

- **<YYYY-MM-DD>, step <N-1>:** <one line>.

## Current risks

Risks that are still true today. When one is closed, move it to `HISTORY.md` with the step that closed it.

- **<Risk>:** <what can go wrong, and what would close it>.
