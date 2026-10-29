**English** · [Español](es/cheatsheet.md)

# Cheatsheet

## The loop

`/arranque` → one step → `/relevo` → `/clear` → repeat. **One step per session.**

## When to use what

| Moment | Type | What happens |
|---|---|---|
| You open Claude Code | `/arranque` | Reads the rules, the progress and git; reports in 5 lines; checks the guard is alive; waits |
| The step is done, or context passes ~60% | `/relevo` | Checks, `PROGRESS.md` updated, commit, push (asks you first) |
| Right after `/relevo` | `/clear` | Fresh context. Nothing in the repo is lost |
| Claude is about to do something you did not ask | `Esc` | Stops it. Then say what you want instead |

The commands live in `.claude/commands/`. If your project does not have them, these are the prompts, ready to
paste:

**`/arranque`**
```text
Read CLAUDE.md, PROGRESS.md (especially the HANDOFF section), git status and git log -5. Do not modify
anything yet. Summarize in 5 lines where we are, what you will do next, and any inconsistency between
PROGRESS.md and the repository. Wait for my approval.
```

**`/relevo`**
```text
We are changing step. Do not start new work. 1) Finish the half-done sub-step if it is short, otherwise revert
it and say so. 2) Run all the checks and report the real result. 3) Update the HANDOFF section of PROGRESS.md:
step, what was finished, what remains with the next concrete action, files touched, decisions, open questions,
checks, risks. 4) Commit (on wip/step-N if checks fail). 5) Show me git status and the commit. 6) Push.
```

## How full is the context?

Type `/context` to see it. Rule of thumb:

| Context used | Do |
|---|---|
| under 40% | Keep going |
| 40–60% | Finish the current piece; no new big tasks |
| over 60% | `/relevo` now, write the part you are on ("step 7, part 2 of 3"), `/clear`, continue fresh |

## Five habits

1. **One step per session**, with its own prompt.
2. **Ask for the test first**: "add the test and show me it fails", then the fix.
3. **Stop on doubt**: tell Claude to stop and ask rather than guess.
4. **Never paste secrets** into the chat or into files that are not ignored.
5. **Read the diff** before saying yes to a commit: `git diff`.

More: [Prompts that worked](prompt-patterns.md) · [Mistakes Museum](mistakes-museum.md)
