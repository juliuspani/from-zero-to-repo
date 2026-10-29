# claude-code-method

A reusable way of working with [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) on a
project that lasts longer than one conversation: **one step per context, a written handoff between sessions,
every decision on record, and the rules that matter enforced by code rather than by prose.**

It was extracted from a long solo project built almost entirely by Claude Code over dozens of steps and
sessions. Everything domain-specific was removed; what is left is the scaffolding that kept that project
coherent: a constitution, a progress file, two slash commands, read-only reviewers, a guard hook, permission
lists, and templates for decisions and skills.

> Resumen en español al final: [Resumen](#resumen-en-español).

## Quick start

1. Copy the files into your project (or create a repository from this template):

   ```text
   CLAUDE.md                 PROGRESS.md
   .claude/                  docs/
   templates/                test/  scripts/  (optional: the method's own checks)
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
| [`CLAUDE.md`](CLAUDE.md) | The constitution: what the project is, non-negotiable rules, the standard closing of every step, the session start protocol, where things are, and who decides what (autonomous mode with mandatory stops). Loaded in every session, so it is short. |
| [`PROGRESS.md`](PROGRESS.md) | The only state the next session needs: current step, checks, pending decisions, decisions taken by Claude, commitments for future steps, the HANDOFF block and current risks. Capped at 200 lines. |
| [`.claude/commands/arranque.md`](.claude/commands/arranque.md) | `/arranque` ("start-up"): read the state, report in five lines, flag inconsistencies, wait. |
| [`.claude/commands/relevo.md`](.claude/commands/relevo.md) | `/relevo` ("handoff"): finish or revert the half-done part, run the checks, write the HANDOFF, commit, push. |
| [`.claude/agents/`](.claude/agents/) | Two read-only consultants (security, software) with no shell, no write tools and no subagents. |
| [`docs/CONSULTANTS.md`](docs/CONSULTANTS.md) | When and how to use the consultants, their shared rules, severity scale, report format, and what the tooling does and does not guarantee. |
| [`.claude/hooks/guard.mjs`](.claude/hooks/guard.mjs) | Example `PreToolUse` guard: blocks `.env` access, protected paths, destructive commands, skipping git hooks, and any edit to the guardrails themselves. |
| [`.claude/settings.jsonc`](.claude/settings.jsonc) | The permission lists (`allow`, `ask`, `deny`) and the hook, with every choice commented. [`settings.json`](.claude/settings.json) is the same without comments; a test keeps them equal. |
| [`.claude/skills/engineering-standard/`](.claude/skills/engineering-standard/SKILL.md) | An example skill: the engineering standard (scope, commits, tests, checks, context, splitting work). |
| [`templates/`](templates/) | Templates for a skill and for a new consultant. |
| [`docs/adr/`](docs/adr/) | The ADR template and a first example ADR that records the method itself. |
| [`docs/progress/`](docs/progress/) | Where old handoffs and approved decisions go, so `PROGRESS.md` stays short without losing anything. |
| [`test/`](test/) | The method checked by code: the guard's behaviour, the 200-line cap, consultant rules, settings drift, ADR numbering, skill descriptions. |

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
| Permissions | `.claude/settings.json` `allow` / `ask` / `deny` | Network, pushes, deletes and installs need a human yes; `.env` and the guardrails are denied |
| Hook | `.claude/hooks/guard.mjs` | Spellings the permission prefixes miss (`rm -fr`, `Remove-Item -r -fo`, `git push +main`), protected paths, edits to the guardrails |
| Tests | `test/` | Drift between files that must agree, the 200-line cap, read-only consultants, ADR numbering |
| Git hooks and CI | your `pre-commit` and `.github/workflows/ci.yml` | Lint, types, tests and a secrets scan before anything lands |

Each layer has holes; together they turn the most likely mistakes into a blocked call with a clear message.
The hook is a seatbelt, not a sandbox: it compares text, so a script the agent writes and then runs is not
inspected. Where it truly matters (production credentials, real money), the barrier is physical: the secret
is not on the machine.

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
  explicit: the hook and `deny` block writes to `.claude/settings*` and `.claude/hooks/`, the commented copy
  is regenerated by a script the human runs, and a test catches drift between the two.
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
- **Your protected paths** go in `PROTECTED` in the hook; add tests for them in `test/guard.test.mjs`.
- **Your consultants**: copy `templates/consultant.md`, fill in what it reads and what it looks for, add it to
  `docs/CONSULTANTS.md` §1. The test keeps its shared block in line.
- **Your checks**: the closing rule assumes build, typecheck, lint, tests and a secrets scan. Wire the ones
  your stack has into one command and into CI; declare the ones it lacks.

## License

[MIT](LICENSE).

## Resumen en español

Plantilla para trabajar con Claude Code en un proyecto que dura más que una conversación. Se resume en
**un paso por contexto, un relevo escrito entre sesiones, todas las decisiones documentadas y las reglas
importantes impuestas por código, no solo por texto.**

- **Un paso por contexto.** Cada paso cabe en una sesión y tiene su propio prompt, escrito por la persona. Si
  no cabe, se parte en partes, y cada una termina en un commit en verde. Una sesión nueva que parte de un estado
  limpio y escrito es más fiable que una larga que lo recuerda todo a medias.
- **Relevos.** `/relevo` cierra la sesión: pasa los checks y anota el resultado real, escribe el bloque HANDOFF
  en `PROGRESS.md` con la siguiente acción concreta, y hace commit y push. `/arranque` abre la siguiente:
  lee el estado, lo compara con git y avisa de cualquier incoherencia. `PROGRESS.md` no pasa de 200 líneas,
  y lo antiguo se mueve a `docs/progress/`.
- **Decisiones documentadas.** En modo autónomo, Claude decide con la opción más segura y reversible y lo
  anota en `PROGRESS.md` o en un ADR. Solo se detiene en las paradas obligatorias: cuentas, pagos, publicar,
  cambiar las reglas de seguridad o las guardas, y acciones irreversibles fuera del repositorio.
- **Enforcement por código.** `CLAUDE.md` orienta y el código obliga. Las capas son los permisos `allow`,
  `ask` y `deny`, un hook de guarda, pruebas que comparan lo que debe coincidir, y los hooks de git más el CI.
  El hook es un cinturón de seguridad, no un sandbox.
- **Consultores de solo lectura.** Agentes sin shell, sin escritura y sin subagentes, que solo se lanzan cuando
  el paso lo pide y con un alcance concreto. Sus hallazgos se verifican antes de usarlos.
- **Lecciones.** La principal: el agente no debe poder editar sus propias guardas. En el proyecto original, el
  clasificador de permisos de Claude Code bloqueó como automodificación las ediciones de `.claude/`, y resultó
  ser el diseño correcto: esas reglas las edita una persona. Otras lecciones:
  - un `deny` genérico de `.env.*` bloquea también `.env.example`;
  - el texto bloqueado en un mensaje de commit se esquiva con `git commit -F`;
  - en Windows cada regla necesita su gemela de PowerShell;
  - un check que no existe no cuenta como PASS;
  - las copias se comparan con una prueba;
  - los criterios de aceptación se congelan antes de ver los resultados.

Licencia MIT.
