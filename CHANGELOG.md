# Changelog

All notable changes to From Zero to Repo.

## [Unreleased]

Nothing yet.

## [1.1.0] — 2026-10-30

What changes for you: a README you can read in a minute, promises the repository keeps, and a Level 1 that was
followed for real on Windows.

### Changed

- **The session commands are now `/start` and `/handoff`** (they were `/arranque` and `/relevo`, their names in the
  project where the method was born). Neither name is a built-in Claude Code command. If your project was created from
  v1.0.0, rename `.claude/commands/arranque.md` to `start.md` and `relevo.md` to `handoff.md` by hand, or keep the old
  names: nothing else depends on them.
- **A README you can read in 60 seconds:**
  - an animated terminal at the top (`docs/assets/dr-repo-demo.svg`, under 10 KB, no JavaScript) showing a real run of
    Dr. Repo on a project with three planted faults. `node scripts/dr-repo-demo.mjs --write` rebuilds it, and a test
    fails if Dr. Repo's output changes without rebuilding it;
  - "Pick your path";
  - "The 60-second cheatsheet";
  - "What you'll have at the end";
  - a short FAQ;
  - the JP seal in the footer, in its 32 px version (thicker marks), dark or light to match GitHub's theme.
- **Promises the repository keeps.** No more "rules it cannot break" or "blocks destructive commands": the README, the
  museum and Level 2 say what the guard blocks (reads of secret files, edits to its own settings and hook, recursive
  forced deletes, forced pushes, `git reset --hard`), call it a seatbelt, not a sandbox, and link to its documented
  limits (`docs/level-2.md#limits`). A test rejects the old absolutes.
- **Plain words.** The first time the README says context, private (noreply) email, guard hook, guardrails or
  secrets, it links to the Start here glossary, which now has fifteen words (guardrails, secret and noreply email are
  new), in English and Spanish.
- **One name for Level 2: "Level 2 — Training Wheels"**, in the README, the cheatsheets and the Spanish summary.
- **The README:** "Everything in this repo" has a header row, and Dr. Repo's instructions say it requires Node.js 20+.
- **Level 1, step 7, tested on a real Windows machine:**
  - the official install command for each system, a warning that it shows no progress and that you need a new
    terminal, and `claude --version` as the check;
  - the first run logs in through the browser, and Claude Code needs a paid Claude plan (link to the official
    pricing);
  - the error table explains `'claude' is not recognized`, with the PowerShell lines that add `.local\bin` to your
    user PATH (only if it is missing, so running them twice does no harm) and a link to the official "Fix your PATH";
  - a note points to the Claude desktop app for those who prefer no terminal: same steps everywhere, and Windows has
    two extra notes (`npm.cmd` and PATH).
- **Level 1, steps 8 and 9:** step 8 shows the exact first step to paste; step 9 explains the push permission question
  and why to answer plain "Yes" rather than "don't ask again".
- **A new social preview** (`docs/assets/social-preview.png`, 1280 × 640) for links shared on social media.

### Added

- **Mistakes Museum, card 10:** "I installed it, but the terminal still didn't know claude", in English and Spanish.
- **Dr. Repo notes:** things about your machine, not the project, that never change the score or the exit code. The
  first one, `claude-on-path`, tells you when no `claude` program is in a PATH folder, and how to fix it. It only looks
  at file names; it never runs `claude`.
- **Tests for what a visitor reads** (`test/docs.test.mjs`): no absolute promises, glossary links, one name for
  Level 2, the first step identical to the example, the idempotent PATH fix. The link test also checks `src`,
  `srcset` and `href` in the HTML of the Markdown files.

## [1.0.0] — 2026-10-29

First public version: Level 0 and Level 1, the Mistakes Museum, prompt patterns, the cheatsheet, Dr. Repo, and the
optional Level 2. Level 0, Level 1, the cheatsheet and the museum also in Spanish.
