**English** · [Español](es/mistakes-museum.md)

# Mistakes Museum

Real mistakes from building a real project with Claude Code, from a student who had never used git before.
Each card: **what happened · why · what prevents it now · the proof**. The proof is a test you can run with
`npm test`, or the [Dr. Repo](../dr-repo.mjs) check that spots it in your own project.

Seen a mistake that deserves a card? [Open an issue](../../../issues).

---

<a id="the-agent-that-tried-to-edit-its-own-rules"></a>
## 1. The agent that tried to edit its own rules

**What happened.** I asked Claude to update the project's permissions and slash commands. Claude Code refused:
its own safety classifier flagged editing `.claude/` as *self-modification*. I had to paste the changes by hand.

**Why.** The files in `.claude/` decide what the agent may do. An agent that can rewrite them can give itself
any permission. Annoying in the moment, but the classifier was right.

**What prevents it now.** The guard hook and the `deny` rules block every write to `.claude/settings*`,
`.claude/hooks/`, `.claude/commands/` and `.claude/agents/`. Claude proposes the change; you paste it.

**Proof.** `test/guard.test.mjs` → *"Claude may read its guardrails but never change them"*. Dr. Repo:
`guardrails-locked`.

---

<a id="the-review-that-broke-the-guard"></a>
## 2. The review that broke the guard

**What happened.** Before publishing this very repository, a read-only reviewer agent audited the guard hook. It
found that `git diff --output=.claude/hooks/guard.mjs` would *overwrite the hook*, and the hook let it through,
because `git diff` "only reads". It also found `git commit -n` (skips git hooks), `prod.env` and `.envrc`
(secrets with other names) and `cd .claude && …` (a path the hook never saw).

**Why.** A rule that matches text has holes shaped like every spelling you did not think of.

**What prevents it now.** Each finding became a test that failed first, then the fix. Any shell command that
mentions `.claude` must be a known read-only command with no output options.

**Proof.** `test/guard.test.mjs` → the tests named *S-01* to *S-12*. Dr. Repo: `claude-dir-locked`.

---

<a id="the-word-file-with-an-invisible-character"></a>
## 3. The file with an invisible character

**What happened.** I edited a config file in Word and saved it as UTF-8. It looked perfect. The tool reading it
said it was broken.

**Why.** Some editors (Word, and Windows PowerShell 5.1's `Set-Content -Encoding utf8`) put an invisible
*byte order mark* (BOM) at the start of the file. JSON parsers and git hooks choke on it.

**What prevents it now.** Edit code and config only in a plain-text editor (VS Code, Notepad++, nano) and save as
**UTF-8 without BOM**. In VS Code, the status bar shows the encoding; click it to change.

**Proof.** Dr. Repo reports a `settings.json` it cannot parse as `settings-safe` failing ("not valid JSON").

---

<a id="the-settings-file-that-was-a-txt"></a>
## 4. The settings file that was a .txt

**What happened.** I created `settings.json` in Notepad. Claude Code ignored every rule in it.

**Why.** Windows hides file extensions by default. The file was really `settings.json.txt`.

**What prevents it now.** Turn on file extensions (File Explorer → View → Show → File name extensions), or check
with `ls .claude` (`dir .claude` on Windows).

**Proof.** Dr. Repo: `settings-safe` reports "settings saved as .txt". `test/dr-repo.test.mjs` plants one.

---

<a id="the-push-that-github-refused"></a>
## 5. The push that GitHub refused

**What happened.** First real push. GitHub answered `GH007: Your push would publish a private email address`.

**Why.** I had ticked "Keep my email addresses private" on GitHub, but git was signing my commits with my real
email. Every commit carries the author's email, forever, in public.

**What prevents it now.** Use your GitHub *noreply* address (GitHub → Settings → Emails):
`git config --global user.email "<id>+<user>@users.noreply.github.com"`, then redo the commits that are not
pushed yet (`git commit --amend --reset-author --no-edit` for the last one).

**Proof.** Dr. Repo: `git-email`.

---

<a id="the-session-that-forgot-everything"></a>
## 6. The session that forgot everything

**What happened.** One long session, many tasks. Near the end Claude started repeating questions, contradicting
earlier decisions, and the context filled up mid-change.

**Why.** Claude's *context* (its working memory for one conversation) is finite. When it fills, older details are
summarized or lost, and quality drops before it is visibly full.

**What prevents it now.** One step per session. Before ~60% of context, run `/handoff`: it writes the state to
`PROGRESS.md` and commits. Then `/clear`, and `/start` in the fresh session.

**Proof.** `test/method.test.mjs` → *"PROGRESS.md stays under 200 lines"*. Dr. Repo: `claude-md`, `progress-md`.

---

<a id="the-step-that-ran-too-early"></a>
## 7. The step that ran too early

**What happened.** A step started before the previous one was approved, and I had to abort it halfway (`Esc`)
and undo the half-done part.

**Why.** Without an explicit stop, an eager agent keeps going: "and now the next thing…".

**What prevents it now.** The standard closing in `CLAUDE.md` ends every step with *stop and wait for approval*,
and `/handoff` finishes or reverts a half-done sub-step before anything else.

**Proof.** `CLAUDE.md` §3, and the HANDOFF section that `test/method.test.mjs` requires in `PROGRESS.md`.

---

<a id="the-env-rule-that-blocked-the-wrong-file"></a>
## 8. The .env rule that blocked the wrong file

**What happened.** To keep secrets away from Claude I denied `Read(./.env.*)`. It also blocked `.env.example`,
the harmless template that lists variable *names*.

**Why.** Wildcards are greedy. And secrets hide under other names too: `prod.env`, `.envrc`.

**What prevents it now.** `deny` lists the usual variants one by one; the hook covers every other environment file
and allows `.env.example` only with names and no values. `.gitignore` ignores them all.

**Proof.** `test/guard.test.mjs` → *"never reads or writes .env files, but allows names-only .env.example"*.
Dr. Repo: `env-ignored`, `env-tracked`, `secrets`.

---

<a id="the-hook-that-blocked-its-own-commit-message"></a>
## 9. The hook that blocked a commit message

**What happened.** The guard blocked a perfectly innocent `git commit -m "…"`.

**Why.** The message mentioned a forbidden word (a `.env` file name). The hook reads the whole command as text.

**What prevents it now.** Write long commit messages to a file and use `git commit -F message.txt`. A false
alarm is cheap; a missing alarm is not.

**Proof.** `test/guard.test.mjs` → *"never reads or writes .env files…"* (`cat .env` and friends are blocked by text).

---

<a id="the-terminal-that-did-not-know-claude"></a>
## 10. I installed it, but the terminal still didn't know claude

**What happened.** I had only ever used Claude Code from the desktop app. At step 7, PowerShell answered
`claude : The term 'claude' is not recognized as the name of a cmdlet…`. I installed it with the official command,
opened a new terminal, and got the same error. `claude.exe` was there, in `%USERPROFILE%\.local\bin`, but that
folder was not in my PATH. Once I added it to my user PATH and opened a new terminal, `claude` started.

**Why.** A terminal finds programs by looking in the folders listed in PATH, and it reads PATH once, when it opens.
The installer puts `claude` in `.local\bin` but does not always add that folder to PATH: it prints the fix in its
setup notes, which are easy to miss because the installer shows no progress while it works.

**What prevents it now.** Step 7 says to open a new terminal and check with `claude --version` before going on, and
[the error table](first-session.md#claude-is-still-not-recognized-on-windows) gives the two commands that put
`.local\bin` in your user PATH. The desktop app needs none of this.

**Proof.** Dr. Repo prints a note, not a failure, when no `claude` is in a PATH folder: `claude-on-path`.
`test/dr-repo.test.mjs` runs it with and without a `claude` on PATH, and checks it only looks at file names.
