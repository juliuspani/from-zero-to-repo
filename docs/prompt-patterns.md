# Prompts that worked (and the ones that didn't)

Eight patterns from a long project built with Claude Code. Each one: a prompt that went wrong, one that
worked, and why. Copy the good ones; they work in any project.

---

## 1. One step, with a standard closing

❌ *"Build the login page, and the profile, and fix the tests while you're at it."*

✅ *"Step 4: add the login form. Only `src/login/` changes. Close the step as CLAUDE.md §3 says (checks, PROGRESS.md, commit, summary) and stop."*

**Why.** A step that fits in one session ends clean: tested, committed, written down. Three tasks in one prompt
end with three half-done things and a full context.

## 2. Mandatory stops, written down once

❌ *"Be careful with anything important."*

✅ In `CLAUDE.md`: *"Stop and ask before: creating accounts or keys, paying for anything, publishing outside the repository, changing the guardrails, anything irreversible outside the repository. Everything else: decide, choose the safest reversible option, and write the decision in PROGRESS.md."*

**Why.** "Careful" means nothing to an agent. A short, explicit list means it asks exactly when it matters,
and never in between, so you do not drown in questions and start approving without reading.

## 3. Freeze the bar before seeing the results

❌ *"Run the experiment and tell me if it's good."*

✅ *"Before running anything, write the acceptance criteria in docs/criteria.md and commit them. Then run. Report pass or fail against those criteria; do not change them."*

**Why.** Criteria written after the results always fit the results. In the original project, a strategy with an
impressive-looking score failed criteria frozen weeks earlier, and that honest "no" kept it away from real money.

## 4. Verify before you fix

❌ *"The reviewer says the hook has a bug. Fix it."*

✅ *"For each finding, first add a test that reproduces it and show me that it fails. Only then fix it, and show the same test passing."*

**Why.** Some findings are wrong; a failing test proves the real ones. And the test stays, so the bug cannot
come back quietly. This is how the guard in this repo was hardened ([Museum 2](mistakes-museum.md#the-review-that-broke-the-guard)).

## 5. Reviewers that cannot touch anything

❌ *"Review the code and fix whatever you find."*

✅ *"Launch consultant-security (read-only) on the diff since abc123. It must cite file:line for each finding and propose commands instead of running them. Do not fix anything in this step."*

**Why.** A reviewer that can edit tends to fix quietly and report less. Read-only keeps the report honest,
and you decide what gets fixed. See [Level 2](level-2.md#read-only-consultants).

## 6. Stop on doubt instead of guessing

❌ *"Just make it work."*

✅ *"If something is ambiguous or a check fails in a way you don't understand, stop and ask me. Do not guess, do not silence errors, do not skip tests."*

**Why.** "Make it work" invites an empty `catch`, a skipped test or a loosened check. Telling it that stopping
is allowed is what makes it stop.

## 7. The handoff

❌ Closing the laptop and hoping the next session remembers.

✅ `/relevo`: *"Update the HANDOFF in PROGRESS.md with what remains exactly and the next concrete action. Commit. Push."* Next session: `/arranque`.

**Why.** The next session has no memory. A written state it reads in ten seconds beats a long conversation it
half-remembers ([Museum 6](mistakes-museum.md#the-session-that-forgot-everything)).

## 8. Say what must not change

❌ *"Clean up the code."*

✅ *"Refactor `todo.mjs` for readability. Behaviour must not change: npm test must pass before and after, with no test edited. No other file changes."*

**Why.** Without a fence, "clean up" spreads to files you never meant to touch, and you cannot tell a
refactor from a bug.
