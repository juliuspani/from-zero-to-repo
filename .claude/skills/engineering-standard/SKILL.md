---
name: engineering-standard
description: Mandatory engineering standard for any change in this repository. Covers minimal scope, small changes and atomic commits, tests, checks, documentation, no secrets, dependencies, no unnecessary infrastructure, subagents, context usage and how to split a task that does not fit in one session. Use this skill before writing or changing code, tests, configuration or documentation, before installing a package, before committing or closing a step, and before launching a subagent.
---

# engineering-standard

This standard is mandatory for every change in the repository: code, tests, configuration or documentation.
It develops `CLAUDE.md` §2 ("Code quality") and §3 ("Standard closing") but does not replace them: if
something here clashes with `CLAUDE.md`, `CLAUDE.md` wins. Domain skills rule in their own field.

## 1. Principles

1. **Minimal scope.** Do what the step asks, nothing more. What was not asked is not done, even if it looks
   like an improvement.
2. **What has not been checked is not assumed.** A check that was not run, or does not exist, is reported as
   such. It is never summarized as PASS.
3. **Visible beats pretty.** A visible error, a failing test or a written doubt is worth more than a clean
   result that hides something.

## 2. Minimal scope

- Before touching anything, write in one sentence what the step asks and which files it will touch.
- Change only the files needed for that. No reformatting, reordering imports or renaming outside the scope.
- Something broken outside the scope is noted in `PROGRESS.md` or asked about, not fixed on the way.

## 3. Small changes and atomic commits

- One behaviour per commit. A refactor and a behaviour change never share a commit.
- Every commit leaves the full check green, except `wip/*` branches during a handoff (`/relevo`).
- Commit messages say what changed and why. Long messages go through `git commit -F <file>`.

## 4. Tests

- Every behaviour change comes with a test that fails without the change.
- Tests do not depend on the clock, the network, randomness or execution order unless that is what they test.
- A test that cannot fail (no assertion, asserting on the mock) is a defect, not a test.

## 5. Checks

- Run the full check (build, typecheck, lint, tests, secrets scan) before every commit and report the real
  result. Never weaken a check, add an exception or regenerate a baseline to make a new failure disappear.
- Exception lists only shrink.

## 6. Documentation

- `PROGRESS.md` reflects the real state at every handoff.
- A non-trivial decision gets an ADR in the step that takes it (`docs/adr/0000-template.md`).
- A document that the change makes false is fixed in the same commit.

## 7. No secrets

- No keys, tokens, passwords or personal data in code, tests, fixtures, logs, commit messages or chat.
- `.env` is never read or written by Claude; `.env.example` holds names only.
- Before publishing anything, scan for secrets and for personal data (names, emails, local paths).

## 8. Explaining changes

The step summary says: what changed and why, files touched, the real result of each check, decisions taken
(and where they are written), and risks or doubts. Unchecked boxes of the checklist are explained.

## 9. Dependencies

- Prefer the platform's standard library. A dependency must earn its place.
- Automatic approval only if it meets every condition of `CLAUDE.md` §7 (permissive license, maintained,
  exact version at least 7 days old, no install scripts, registered with its reason). Otherwise ask.

## 10. No unnecessary infrastructure

- No folders, configuration, scripts, services, CI or abstraction layers the step does not need today.
- An abstraction is introduced when there are two real uses, not just in case.
- A new enforcement mechanism (hook, script, rule) is proposed with an ADR and approved first.

## 11. Subagents

- None unless the step's prompt explicitly authorizes them (`CLAUDE.md` §2). Skills or commands that launch
  agents count as subagents.
- An authorized subagent never launches others, never commits, and its result is verified before it is used.

## 12. Context usage

- Read only the files you need, and know why before opening one.
- Measure first (`wc -l`, headings), then read the range you need. Prefer targeted searches.
- Do not repeat in the conversation what is already in a file: cite its path and line.
- Filter long command output.

### 12.1 Tasks that do not fit in one session

1. Before starting, estimate whether it fits. If not, split it into parts that make sense on their own
   ("Step 25, part 1 of 3"), each with its own green commit.
2. Write the plan of parts in `PROGRESS.md` with the next concrete action.
3. When cutting, run `/relevo`: checks, `PROGRESS.md` and commit. Never leave uncommitted changes.
4. The next session starts with `/arranque` and resumes from what is written, without re-reading what is
   already summarized.

## 13. How to work

1. **Start:** `PROGRESS.md`, `git status`, `git log -5` (`CLAUDE.md` §4).
2. **Scope:** one sentence on what is done and which files are touched; doubts before starting.
3. **Change:** small, with its test.
4. **Checks:** the full check, with the real result.
5. **Documentation:** `PROGRESS.md`, an ADR if there is a decision, affected documents.
6. **Commit:** atomic.
7. **Summary** as in §8, then wait for approval.
