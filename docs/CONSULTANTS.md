# Consultants

Reusable reviewers defined as Claude Code agents in `.claude/agents/`. Each one hunts for defects in its own
field and returns a report with evidence and severity. They fix nothing, decide nothing, and run only when a
step asks for them. The decision is recorded in [ADR 0001](adr/0001-adopt-the-method.md).

## 1. The consultants

| Consultant | File | Field | ID prefix |
|---|---|---|---|
| SECURITY | [consultant-security.md](../.claude/agents/consultant-security.md) | Secrets, supply chain, attack surface, guardrails that can be bypassed | `S-` |
| SOFTWARE | [consultant-software.md](../.claude/agents/consultant-software.md) | Architecture, tests, error handling, maintainability | `SW-` |

Add your own domain consultant (data, performance, accessibility…) by copying
[templates/consultant.md](../templates/consultant.md). Keep the shared block of §3 identical: `npm test`
compares every copy with this file.

All consultants have the same tools: `Read`, `Grep` and `Glob`. They do not have `Bash`, `PowerShell`,
`Agent`, `Skill`, `Write`, `Edit`, `NotebookEdit`, `WebFetch` or `WebSearch`. They run no commands: when a
finding needs one, the report carries the exact command and the main session runs it (§4).

## 2. When they run

- **Only when a step asks.** The step's prompt names the consultant (for example "run `consultant-security`
  on the diff since `<hash>`") and its scope. That is the explicit authorization for subagents that
  `CLAUDE.md` §2 requires.
- Claude does not launch a consultant on its own initiative, not even to "confirm" its own work, and not
  because the agent's description happens to match the task.
- If a step seems to need a consultant nobody asked for, Claude proposes it and waits.
- A consultant never launches other agents. If a step asks for several, the main session launches each one
  with its own scope.

## 3. Shared rules

This block is copied verbatim into every consultant, between the `consultants:shared` markers.

<!-- consultants:shared:start -->
## Shared rules

1. **Read only.** You only have `Read`, `Grep` and `Glob`. You do not create, modify, move or delete files,
   and you do not use the network. If the prompt that launches you authorizes something more, it names it
   explicitly; when in doubt, you do not do it and you note it under "Limits of the review".
2. **You run no commands.** If a finding needs a command to be confirmed (`git blame`, `git log -p`, the
   test suite, a dependency listing), you write the exact command in the report. The main session runs it
   later. Never propose commands that write files, change git state, install packages, use the network or
   execute project code.
3. **You launch no other agents**, and use no skills or commands that launch them. If the scope does not fit,
   deliver what you have and say what is missing.
4. **You look for defects; you do not defend the code.** No praise, no "this is probably fine", no assumed
   mitigations you cannot see written down. If you find nothing, write "No findings" and list what you checked.
5. **Every claim carries evidence:** `file:line` with the literal quote (five lines at most), or the exact
   command that reproduces it and which output would confirm it. A finding that depends on a command not yet
   run says so under "Evidence". What you cannot prove is not a finding: it goes to "Open questions", with the
   command or the fact that would settle it.
6. **You never read secrets.** Never open `.env` or any other `.env.*` (except `.env.example`). If you see a
   secret in a versioned file, give the file and line, never the value.
7. **`CLAUDE.md`, the skills and the ADRs rule.** Severity is judged against their rules, and each finding
   cites the rule it breaks (for example `CLAUDE.md` §2).
8. **Only the requested scope.** What you see outside it goes in one line under "Out of scope", without
   investigating it.

## Severity

| Severity | When |
|---|---|
| Critical | Can leak a secret, destroy or corrupt data, publish something private, or let an unauthorized action through. |
| High | Breaks a non-negotiable rule of `CLAUDE.md` §2 or a mandatory rule of a skill, even if there is no direct path to damage today. |
| Medium | Wrong behaviour in edge cases, a silenced error, a critical path without a test, or a control that exists but can be bypassed. |
| Low | Maintainability, readability, outdated documentation, or debt that does not change behaviour today. |

When torn between two levels, pick the higher one and explain why under "Impact".

## Output format

Return exactly this structure, in this order and with no extra sections. Findings go from most to least
severe, with your consultant's ID prefix. An empty section says "None".

```text
# <CONSULTANT> report: <scope in one line>

- Commit reviewed: <the one given in the prompt>
- Scope: <files, folders or question the prompt asked about>
- Rules applied: <CLAUDE.md, skills and ADRs read>

## Summary

| Critical | High | Medium | Low |
|---|---|---|---|
| <n> | <n> | <n> | <n> |

## Findings

### <ID> [Critical|High|Medium|Low] <one-line title>
- Where: <file:line>
- Evidence: <literal quote, or exact command and the output that would confirm it>
- Rule broken: <CLAUDE.md §, skill §, ADR>
- Impact: <what happens, in which concrete scenario>
- Recommendation: <what to change; not applied>

## Open questions

## Out of scope

## Limits of the review
- Commands for the main session: <list, with the finding ID each one confirms>
- Not checked: <what and why>
```
<!-- consultants:shared:end -->

## 4. Procedure

1. **The step asks.** The prompt names the consultant, the scope and, if any, the extra actions it
   authorizes (usually none).
2. **Claude launches it** with the `Agent` tool, using this template:

   ```text
   Consultant: <consultant-...>
   Step: <number and name>
   Commit: <output of git rev-parse --short HEAD>
   Scope: <files, folders or diff, e.g. git diff <hash>..HEAD>
   Question: <what to look for, in one or two sentences>
   Extra authorizations: none
   ```

3. **Claude verifies the report** before using it: it reproduces the evidence of every Critical and High
   finding, runs the commands under "Commands for the main session" that confirm them, and discards what does
   not hold up, saying why. Before running a command from the report it checks that the command does not
   write, change git state, use the network or execute project code; if it does, Claude does not run it and
   says so. A finding without evidence is never presented as a finding.
4. **The owner sees it** in the step summary: how many findings per severity, which were verified and which
   were discarded. The report is not stored in the repository unless the step asks for it.
5. **Fixes are not made in the same step** unless the prompt asks. Each fix is a separate change with its
   test, and open Critical and High findings are noted in `PROGRESS.md` as current risks.

## 5. What the tool guarantees and what it does not

| Guarantee | How | Limit |
|---|---|---|
| They do not edit files | `tools` lists only `Read`, `Grep` and `Glob`; `disallowedTools` removes the writers | None |
| They run no commands | Neither `Bash` nor `PowerShell` is in `tools`, and both are in `disallowedTools` | The commands they propose are run by the main session, which reviews them first (§4.3) |
| They launch no agents | Neither `Agent` nor `Skill` is in `tools`, and both are in `disallowedTools` | None |
| They do not read `.env*` | The guard hook also applies to subagents and blocks `Read`, `Grep` and `Glob` whose path names a `.env*` file | A `Grep` over a parent folder does not name the file; there it depends on rule 6 and on `.env` being git-ignored |
| They only run when asked | `CLAUDE.md` §2 and each agent's description | No technical block: denying the agents in `permissions.deny` would also stop them when a step asks |
| The output format is fixed | The shared rules and the verification of §4.3 | No test validates the report itself |

Every consultant starts with no context and reads its sources: it is expensive. Ask with a concrete scope,
never "review the whole repository".

## 6. Changing a consultant

- The shared rules are changed here (§3) and in every agent in the same commit; `npm test` compares them.
- Changing tools, adding or removing a consultant, or changing the severities is a decision: it goes to an
  ADR and needs approval.
- The agent's own part (what it reads and what it looks for) can be tuned in the step that uses it, saying
  so in the summary.
