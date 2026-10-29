---
name: <skill-name>
description: <What the skill covers, as a list of the topics it rules on>. Use this skill before <the actions that should load it: writing or changing X, reviewing Y, deciding Z>, even when the request does not mention it by name.
---

<!--
Template for a project skill. Copy the folder to .claude/skills/<skill-name>/ and fill it in.

The description is what Claude reads to decide whether to load the skill, so it must say WHEN, in terms of
actions ("before writing…", "when reviewing…"), not only WHAT. npm test checks that it does.

Keep SKILL.md under ~250 lines: it is loaded whole. Move long checklists, templates or reference tables to
sibling files and link them; Claude opens them only when needed. Delete this comment.
-->

# <skill-name>

This standard is mandatory for <scope>. It develops `CLAUDE.md` §<n> but does not replace it: if something
here clashes with `CLAUDE.md`, `CLAUDE.md` wins. The decisions behind it are in
[ADR NNNN](../../../docs/adr/NNNN-title.md).

Files of this skill:

- [checklist.md](checklist.md): what to check before calling the work done.

## 1. Principles

1. **<Principle>.** <One or two sentences. A principle decides cases the rules below did not foresee.>
2. **<Principle>.** <…>

## 2. <Rule area>

- <A rule phrased so a reviewer can tell whether it was followed.>
- <What to do instead when the rule blocks the obvious path.>

## 3. <Rule area>

- <…>

## N. How to work

1. <The order of operations for a typical change in this area.>
2. <Which checks prove it, and what to write in the summary.>
