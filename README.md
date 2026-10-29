![A terminal runs "npm run dr-repo -- ../my-old-project". Dr. Repo prints its diagnosis line by line: seven checks ok and three to fix (a committed .env file, an AWS key in config.js and a Bash(*) permission that allows any command), each with how to fix it and why. It ends with "Score: 7/10" and the suggestion to run again with --prompt.](docs/assets/dr-repo-demo.svg)

**English** · [Español](#resumen-en-español)

# From Zero to Repo

**Your first real project with Claude Code, safely.**

> Community project. Not affiliated with Anthropic.

Never used git, GitHub or Claude Code? This takes you from nothing installed to a real project online, with an
AI agent that works inside rules it cannot break.

## Pick your path

| You… | Go to | What you get |
|---|---|---|
| **have never used git** | **[Start here](docs/start-here.md)** | Twelve words explained plainly, then [your first session in 10 steps](docs/first-session.md). |
| **already have a project** | **[Let Dr. Repo take a look](#already-have-a-project-let-dr-repo-take-a-look)** | A read-only checkup with a score, the fix for each fault and a prompt for Claude Code. |
| **want the safety kit** | **[Level 2](docs/level-2.md)** | The guard hook, permissions and read-only reviewers, already set up in this template. |

## The 60-second cheatsheet

`/start` → build one step → `/handoff` → push → `/clear` → repeat.

| Type | What it does | When |
|---|---|---|
| `/start` | Claude reads the rules, the progress and git, reports in 5 lines and waits | Every time you open Claude Code |
| `/handoff` | Runs the checks, writes `PROGRESS.md`, commits and pushes (asking you first) | The step is done, or the context passes ~60% |
| `/clear` | Wipes the conversation; your files and commits stay | Right after `/handoff` |
| `npm run dr-repo` | Scores your project's safety, read-only | Before you start, and after big changes |
| `npm run dr-repo -- --prompt` | The same, plus a prompt to paste for each fix | When the score is not 10/10 |

The full version, with ready-to-paste prompts: [Cheatsheet](docs/cheatsheet.md).

## What you'll have at the end

About an hour for the first session:

- Your own repository on GitHub, with your first commits pushed under a private email.
- Claude Code working inside rules it cannot change: secrets blocked, pushes asked for, guardrails locked.
- A `PROGRESS.md` that lets every new session start exactly where the last one ended.
- A 10/10 from Dr. Repo, and the habit of one small step per session.

## Already have a project? Let Dr. Repo take a look.

Dr. Repo is a read-only checkup: it never changes a file, never uses the network and never runs anything from
the project it examines. Inside a copy of this repo it is `npm run dr-repo`; for any other project, point it at
the folder (for a project from someone else, `git clone` it rather than copying the folder):

```bash
git clone https://github.com/juliuspani/from-zero-to-repo
node from-zero-to-repo/dr-repo.mjs path/to/your/project --prompt
```

It scores 10 protections (secrets, git email, rules for the agent, guardrails), and for each one that is
missing it tells you how to fix it, why it matters, and a prompt to paste in Claude Code that fixes it safely.

## Everything in this repo

| | |
|---|---|
| **[Level 0: Start here](docs/start-here.md)** | Twelve words, explained like a friend would, and the session loop in one picture. 5 minutes. |
| **[Level 1: Your first session in 10 steps](docs/first-session.md)** | From zero to your first push, with a tiny [example project](examples/todo-cli/) so you never face a blank page. |
| **[Mistakes Museum](docs/mistakes-museum.md)** | Real mistakes, told as short stories: what happened, why, what prevents it now, and the test that proves it. |
| **[Prompts that worked](docs/prompt-patterns.md)** | Eight patterns, each with a bad prompt, a good one and why. |
| **[Cheatsheet](docs/cheatsheet.md)** | `/start`, `/handoff`, when to clear, one step per session. |
| **[Level 2: Training Wheels for your agent](docs/level-2.md)** | **Optional.** The guard hook, permissions, read-only reviewers and the rules behind them, already set up in this template. Levels 0 and 1 work without reading it. |

Use it: click **Use this template** on GitHub, or follow [step 5](docs/first-session.md).

## FAQ

**Do I need to know how to code?** No. Claude writes the code; you decide what to build, read what changed
(`git diff`) and say yes or no. [Start here](docs/start-here.md) explains every word you will meet.

**What do I need to install?** git, Node.js 20 or later, the GitHub CLI and Claude Code. [Level 1](docs/first-session.md)
links to the official installer for each one, step by step.

**How much does it cost?** This repo, git, Node.js and GitHub are free. Claude Code needs a Claude account: see the
[official pricing page](https://claude.com/pricing).

**What if I break something?** git keeps every version, so any change can be undone. On top of that, the guard
hook blocks destructive commands, pushing asks you first, and `/handoff` never leaves work uncommitted. Stuck?
Paste the error to Claude and ask it to explain before fixing, or [open an issue](../../issues).

## Real example: how I built JP Quant as a student

I built [JP Quant](https://github.com/juliuspani/jp-quant), a crypto-strategy research platform, with Claude Code
and this method: dozens of steps, one per session, each closed with a handoff. It has close to 800 automated
tests, 49 written decisions, and three public versions. Its most useful result was an honest "no": the best
strategy failed criteria frozen in advance. The story is in [STORY.md](https://github.com/juliuspani/jp-quant/blob/main/STORY.md).
The cards in the museum come from building it, and from preparing this repo.

## Contributing

Questions are contributions. If a step confused you, [open an issue](../../issues): beginner questions are
exactly what this repo is for. Lived a mistake worth a museum card? Propose it with the four parts: what
happened, why, what prevents it, the proof.

## License

[MIT](LICENSE). Community project, not affiliated with Anthropic. "Claude" and "Claude Code" are names of
Anthropic's products, used here only to say what this guide is about.

## Resumen en español

**From Zero to Repo** te lleva de no tener nada instalado a tu primer proyecto real con Claude Code, publicado y
seguro. Elige tu camino: si nunca has usado git, [empieza aquí](docs/es/start-here.md); si ya tienes un proyecto,
pásale **Dr. Repo** (`npm run dr-repo`, o `node dr-repo.mjs <ruta> --prompt`), que lo revisa sin cambiar nada y te dice
cómo arreglar cada fallo; si quieres los ruedines para el agente, el [nivel 2](docs/level-2.md) (en inglés).

El ciclo: `/start` (el *arranque*) → un paso → `/handoff` (el *relevo*) → push → `/clear`. La primera sesión dura más o
menos una hora. Claude Code necesita una cuenta de Claude: [precios oficiales](https://claude.com/pricing).

En español: [Nivel 0: Empieza aquí](docs/es/start-here.md) · [Nivel 1: Tu primera sesión en 10 pasos](docs/es/first-session.md) ·
[Museo de errores](docs/es/mistakes-museum.md) · [Chuleta](docs/es/cheatsheet.md). El resto (los patrones de prompt y el
nivel 2) está en inglés. Proyecto comunitario, sin afiliación con Anthropic.

---

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/seal-small.svg"><img src="docs/assets/seal-small-light.svg" width="32" height="32" alt="JP seal"></picture><br><sub>Made by <a href="https://github.com/juliuspani">JP</a></sub></p>
