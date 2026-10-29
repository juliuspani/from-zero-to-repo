# ADR 0001: Work with Claude Code one step per context, with handoffs and enforced rules

Date: <YYYY-MM-DD> · Status: accepted · Step: 1

<!-- Example ADR. Keep it, adapt it, or replace it with your own first decision. -->

## Context

Claude Code forgets everything between sessions, and a long session degrades as its context fills up. Rules
written only in prose are followed most of the time, which is not the same as always. The project needs a
way of working where any session can pick up from the repository alone, where decisions survive the session
that took them, and where the important rules hold even when the agent makes a mistake.

## Decision

1. **One step per context.** Each step has its own prompt, written by the owner, and fits in one session.
   If it does not fit, it is split into parts, each one ending in a green commit.
2. **State lives in the repository.** `PROGRESS.md` (under 200 lines) is the only state the next session
   needs. `/arranque` reads it at the start; `/relevo` writes the HANDOFF section and commits at the end.
3. **Decisions are written down.** Small ones go to `PROGRESS.md` ("Decisions taken by Claude"), important
   ones to an ADR. The owner reviews them afterwards and can revert them.
4. **Autonomous mode with mandatory stops.** Claude decides with the safest reversible option and stops only
   at the stops listed in `CLAUDE.md` §7.
5. **Rules that matter are enforced by code:** permissions in `.claude/settings.json`, the guard hook in
   `.claude/hooks/guard.mjs`, and tests in `test/`. `CLAUDE.md` guides; the code obliges.
6. **The guardrails are edited by a human.** Claude may read `.claude/settings*`, `.claude/hooks/`,
   `.claude/commands/`, `.claude/agents/`, `.git/config` and `.git/hooks/`, never write them: they define what
   Claude may do, which tools it gets, and what git runs. Skills stay editable: they guide, they do not grant.
7. **Read-only consultants** (`docs/CONSULTANTS.md`) review a scope when a step asks; their findings are
   verified before they are used.

## Alternatives considered

| Alternative | Why it was not chosen |
|---|---|
| One long session per feature | Quality drops as the context fills; a crash or a compaction loses the reasoning |
| Rules only in `CLAUDE.md` | Followed most of the time; the important ones need a mechanism that fails on its own |
| Ask the owner before every decision | Slow, and the questions pile up; reviewing written decisions afterwards is cheaper |
| Reviewers with write access | A reviewer that can fix things also hides what it found; read-only keeps the report honest |

## Consequences

- Every step costs a little ceremony (start, handoff, checks). In exchange, any session can be thrown away.
- The hook compares text: it stops mistakes, not an adversary. A script the agent writes and runs is not
  inspected. Real secrets must stay off the development machine when that matters.
- Changing a guardrail needs a human at the keyboard, by design.
- The consultants cost context: they are asked with a narrow scope.
