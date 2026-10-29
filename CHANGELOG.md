# Changelog

All notable changes to From Zero to Repo.

## [Unreleased]

### Changed

- **The session commands are now `/start` and `/handoff`** (they were `/arranque` and `/relevo`, their names in the
  project where the method was born). Neither name is a built-in Claude Code command. If your project was created from
  v1.0.0, rename `.claude/commands/arranque.md` to `start.md` and `relevo.md` to `handoff.md` by hand, or keep the old
  names: nothing else depends on them.
- **A new social preview** (`docs/assets/social-preview.png`, 1280 × 640) for links shared on social media.
- **A README you can read in 60 seconds:**
  - an animated terminal at the top (`docs/assets/dr-repo-demo.svg`, about 6 KB, no JavaScript) showing a real run of
    Dr. Repo on a project with three planted faults. `node scripts/dr-repo-demo.mjs --write` rebuilds it, and a test
    fails if Dr. Repo's output changes without rebuilding it;
  - "Pick your path";
  - "The 60-second cheatsheet";
  - "What you'll have at the end";
  - a short FAQ;
  - the JP seal in the footer, dark or light to match GitHub's theme.
- **The link test also checks** `src`, `srcset` and `href` in the HTML of the Markdown files.

## [1.0.0] — 2026-10-29

First public version: Level 0 and Level 1, the Mistakes Museum, prompt patterns, the cheatsheet, Dr. Repo, and the
optional Level 2. Level 0, Level 1, the cheatsheet and the museum also in Spanish.
