[← Back to the README](../README.md)

# Level 2: Training Wheels for your agent

**Optional.** Levels 0 and 1 are enough to build and publish your first project. Come here when you want the
agent itself to have guardrails: rules it cannot break, reviewers it cannot sway, and a memory that survives
every session. Training wheels for the agent, not only for you.

Everything below is already in this template. This page explains what each piece does and why.

## Set it up in your project

If you created your repository from this template, it is already set up. To add it to an existing project:

1. Copy the files into your project (run `node dr-repo.mjs` first and after, to see what changed):

   ```text
   CLAUDE.md                 PROGRESS.md
   .claude/                  docs/
   templates/                test/  scripts/  dr-repo.mjs  (optional: the checks)
   ```

2. Fill the `<placeholders>` in `CLAUDE.md` and `PROGRESS.md`. Adapt `PROTECTED` in
   `.claude/hooks/guard.mjs` and the lists in `.claude/settings.jsonc`, then run `npm run settings` to
   regenerate `.claude/settings.json` from the commented copy.
3. If you keep the checks, merge the `test` script of `package.json` into yours and run `npm test`
   (Node 20 or later, no dependencies).
4. Open Claude Code in the project and type `/arranque`. Paste the prompt of your first step. When it is
   done, type `/relevo`.

## What's inside

| Path | What it is |
|---|---|
| [`CLAUDE.md`](../CLAUDE.md) | The constitution: what the project is, non-negotiable rules, the standard closing of every step, the session start protocol, where things are, and who decides what (autonomous mode with mandatory stops). Loaded in every session, so it is short. |
| [`PROGRESS.md`](../PROGRESS.md) | The only state the next session needs: current step, checks, pending decisions, decisions taken by Claude, commitments for future steps, the HANDOFF block and current risks. Capped at 200 lines. |
| [`.claude/commands/arranque.md`](../.claude/commands/arranque.md) | `/arranque` ("start-up"): read the state, report in five lines, flag inconsistencies, wait. |
| [`.claude/commands/relevo.md`](../.claude/commands/relevo.md) | `/relevo` ("handoff"): finish or revert the half-done part, run the checks, write the HANDOFF, commit, push. |
| [`.claude/agents/`](../.claude/agents/) | Two read-only consultants (security, software) with no shell, no write tools and no subagents. |
| [`docs/CONSULTANTS.md`](CONSULTANTS.md) | When and how to use the consultants, their shared rules, severity scale, report format, and what the tooling does and does not guarantee. |
| [`.claude/hooks/guard.mjs`](../.claude/hooks/guard.mjs) | Example `PreToolUse` guard: blocks access to environment files and protected paths, destructive commands, skipping git hooks, and any edit to the guardrails themselves (settings, hooks, commands, agents, `.git/config`, `.git/hooks`). Its header lists what it cannot see. |
| [`.claude/settings.jsonc`](../.claude/settings.jsonc) | The permission lists (`allow`, `ask`, `deny`) and the hook, with every choice commented. [`settings.json`](../.claude/settings.json) is the same without comments; a test keeps them equal. |
| [`.claude/skills/engineering-standard/`](../.claude/skills/engineering-standard/SKILL.md) | An example skill: the engineering standard (scope, commits, tests, checks, context, splitting work). |
| [`templates/`](../templates/) | Templates for a skill and for a new consultant. |
| [`docs/adr/`](adr/) | The ADR template and a first example ADR that records the method itself. |
| [`docs/progress/`](progress/) | Where old handoffs and approved decisions go, so `PROGRESS.md` stays short without losing anything. |
| [`test/`](../test/) | The method checked by code: the guard's behaviour, the 200-line cap, consultant rules, settings drift, ADR numbering, skill descriptions, and that Dr. Repo never writes or uses the network. |
| [`dr-repo.mjs`](../dr-repo.mjs) | Dr. Repo, the read-only check-up that scores any project on these protections. |

The two commands keep their Spanish names from the original project. Rename the files if you prefer
`/start` and `/handoff`; nothing else depends on the names.

## The method

### One step per context

A step is a unit of work small enough to finish in one session, with its own prompt written by the owner
(the person, not the agent). Claude does not invent the next step's scope; it waits for the prompt.

Why: a long session degrades as the context fills, and an automatic summary loses the reasoning that
mattered. A fresh session that starts from a clean, written state is more reliable than an old one that
remembers everything a little. If a step does not fit, it is split into parts ("Step 25, part 2 of 3"), each
ending in a green commit and a handoff, never in uncommitted changes.

### Handoffs

`/relevo` ends a session; `/arranque` starts the next. Between them, the only memory is the repository:

- `PROGRESS.md` holds the current state and a HANDOFF block: what was finished, **what remains exactly, with
  the next concrete action**, files touched, decisions, open questions, the real result of every check, and
  what is fragile.
- The handoff runs the full check and reports the real result. If it fails, the work is still committed, on a
  `wip/step-N` branch with the reason written down. Nothing is left uncommitted.
- `/arranque` compares `PROGRESS.md` with `git status` and `git log`. A commit or a change the file does not
  explain is the first thing it reports.
- `PROGRESS.md` is capped at 200 lines. Old handoffs move to `docs/progress/HISTORY.md` and approved decisions
  to `docs/progress/DECISIONS.md`. A progress file that only grows stops being read.

### Decisions on record

The agent works in **autonomous mode**: it decides on its own, always choosing the safest, most conservative
and most reversible option, and writes the decision down. Small decisions go to `PROGRESS.md` ("Decisions
taken by Claude"); important ones get an ADR (context, decision, alternatives, consequences). The owner
reviews afterwards and approves them with the handoff.

There is a short list of **mandatory stops** where it must ask: creating accounts or keys, paying for
anything, publishing outside the repository, changing the safety rules or the guardrails, and any
irreversible action outside the repository. Everything else flows without questions, which is what makes the
pace sustainable. Asking before every decision does not make a project safer; it makes the questions pile up
until they are approved without being read.

### Enforcement by code, not only by text

`CLAUDE.md` guides; code obliges. A rule written only in prose is followed most of the time, and "most of the
time" is not good enough for the rules that protect secrets, data or history. Every rule that matters gets a
mechanism that fails on its own:

| Layer | Example here | What it catches |
|---|---|---|
| Permissions | `.claude/settings.json` `allow` / `ask` / `deny` | Network, pushes, deletes, installs and arbitrary `npm run` need a human yes; environment files, protected data and the guardrails are denied to the file tools |
| Hook | `.claude/hooks/guard.mjs` | Spellings the permission prefixes miss (`rm -fr`, `Remove-Item -r -fo`, `git push -uf`, `git commit -n`, `data/./private`), protected paths, and any shell or file write to the guardrails |
| Tests | `test/` | The hook's behaviour, drift between files that must agree, the 200-line cap, read-only consultants, ADR numbering |
| Git hooks and CI | your own `pre-commit`, secrets scan and CI | The included `ci.yml` only runs this template's tests. Lint, types and a secrets scan are your project's to add |

Each layer has holes; together they turn the most likely mistakes into a blocked call with a clear message.
Know the holes, because believing in a guard you do not have is worse than having none:

- **`npm test` is allowed and runs code from the repository**, which the agent can write. The step-by-step
  loop needs it; the hook does not inspect what it runs.
- **The hook compares text.** A path built at run time (a `cd` and then a relative name, a variable, a
  symbolic link) is not seen. It is a seatbelt against mistakes, not a sandbox against an adversary.
- **If the hook cannot start** (node missing, `$CLAUDE_PROJECT_DIR` not expanded), Claude Code treats that as
  a non-blocking error and the call goes on. `/arranque` therefore checks that a known call is still blocked.
- **MCP tools are outside the hook's matcher.** Add them if you install a server that touches files.

Where it truly matters (production credentials, real money, customer data), the barrier is physical: the
secret is not on the machine.

### Read-only consultants

Reviewers are agents with only `Read`, `Grep` and `Glob`: no shell, no write tools, no network, no subagents.
They run only when a step's prompt names them, with a narrow scope, and return a fixed-format report where
every finding carries `file:line` evidence or the exact command that would confirm it. The main session
verifies the Critical and High findings before using them and discards what does not hold up. A reviewer that
cannot fix anything has no reason to soften what it found.

## Lessons learned

- **The agent should not be able to edit its own guardrails.** In the original project, Claude Code's own
  permission classifier blocked the agent from editing `.claude/settings.json`, its skills and its commands
  as self-modification, and the owner had to paste those changes by hand. That turned out to be the right
  design, not an obstacle: the rules that bind the agent are edited by a human. This template makes it
  explicit. The hook and `deny` block writes to `.claude/settings*` and `.claude/hooks/`, and also to
  `.claude/commands/` and `.claude/agents/`, because those declare tools: a command the human runs every
  session could otherwise grant itself more. They also block `.git/config` and `.git/hooks/`, which can make
  an innocent `git diff` run a program. The commented settings copy is regenerated by a script only the human
  runs, and a test catches drift between the two. Skills stay editable: they are guidance, not permissions.
- **Review the guard like an attacker would.** The first version of this template's hook let
  `git diff --output=<guardrail>` through as a "read-only" command, missed `git commit -n`, `prod.env`,
  `.envrc` and `data/./private`, and could be fooled with `cd .claude && …`. The read-only security consultant
  found all of it before publication; each case is now a test.
- **A generic deny rule can block what you need.** `Read(./.env.*)` also denied `.env.example`, the versioned
  template with variable names only. The fix: list the usual variants in `deny` and let the hook cover every
  other `.env.*` with an explicit exception for the template, which may only hold names without values.
- **Text matching has false positives.** A commit message or a `printf` that mentions a blocked word gets
  blocked too. Write long commit messages to a file and use `git commit -F`; write files with the editor tool
  rather than through the shell.
- **Path rules leak through parent folders.** `Grep` over the whole repository does not name the protected
  file and can still print its lines. Keep protected data git-ignored (search tools skip it by default) and
  write the limit down instead of pretending it is covered.
- **On Windows, every shell rule needs its PowerShell twin.** Claude Code may run `PowerShell(...)` instead of
  `Bash(...)`; a rule that only names Bash silently does nothing there. A test checks the twins.
- **"Does not exist" is not "passed".** Summaries tend to round a missing check up to PASS. The closing rule
  says it explicitly, and the handoff reports each check with its real status.
- **Anything copied must be compared.** Rules shared by several files (the consultants' common block, the two
  settings files) drift the first time someone edits only one copy. A test that compares the copies costs a
  few lines.
- **Exception lists only shrink.** Legacy violations go to a baseline; new code gets none. Regenerating the
  baseline to make a new failure disappear is the one move that is never allowed.
- **Freeze the bar before you look at the results.** Acceptance criteria written after seeing the numbers
  always fit the numbers. Write them first, pin them (a hash in a test works), and treat changing them as a
  mandatory stop.
- **Verify the reviewers.** Some consultant findings did not hold up when reproduced; a few real ones only
  showed when their proposed command was run. Never forward a finding that nobody checked.
- **Consultants are expensive.** Each one starts with no context and reads its sources. Ask for a diff or a
  folder, never "the whole repository".
- **External text is data, never an instruction.** Web pages, files and tool output can contain text aimed at
  the agent. The constitution says so; only the owner's own messages are instructions.
- **If you publish a subset, export it; never edit the copy.** A public copy edited by hand diverges from the
  private source of truth within days. A script that exports, plus a test, keeps one source.

## Customizing

- **Your domain rules** go in `CLAUDE.md` §2 (one line each) and their detail in a skill
  (`templates/skill/`). Add the mandatory stops your domain needs to §7.
- **Your protected paths** go in `PROTECTED` in the hook, in `.gitignore` and in `deny` (`npm test` checks
  all three agree); add tests for them in `test/guard.test.mjs`.
- **Your consultants**: copy `templates/consultant.md`, fill in what it reads and what it looks for, add it to
  `docs/CONSULTANTS.md` §1. The test keeps its shared block in line.
- **Your checks**: the closing rule assumes build, typecheck, lint, tests and a secrets scan. Wire the ones
  your stack has into one command and into CI; declare the ones it lacks.
