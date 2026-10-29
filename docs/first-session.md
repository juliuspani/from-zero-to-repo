**English** · [Español](es/first-session.md)

# Level 1: Your first session in 10 steps

From nothing installed to your first push, in about an hour. Works on Windows, macOS and Linux: type the
commands in a terminal (Windows: **PowerShell**; macOS: **Terminal**; Linux: your usual one). Each step says
what it is for, what to type, and how to know it worked. New words? See [Start here](start-here.md).

Installing tools is the one part that changes over time, so those steps link to the official instructions
instead of copying them.

---

**1. Install git.** *So your project can remember its versions.*
Windows: [git-scm.com/downloads/win](https://git-scm.com/downloads/win) · macOS: `xcode-select --install` ·
Linux (Debian/Ubuntu): `sudo apt install git`

```bash
git --version
```
✅ Prints something like `git version 2.x`.

**2. Install Node.js (version 20 or later).** *The tests, Dr. Repo and the example run on it.*
[nodejs.org](https://nodejs.org/) → the **LTS** installer.

```bash
node --version
```
✅ Prints `v20` or higher. Close and reopen the terminal if it says "not found".

**3. Tell git who you are, with your private GitHub email.** *Every commit carries this email, in public.*
Make a free account at [github.com](https://github.com) first, then copy your noreply address from
GitHub → Settings → Emails (it looks like `12345+you@users.noreply.github.com`) and tick
"Keep my email addresses private".

```bash
git config --global user.name "Your Name"
git config --global user.email "12345+you@users.noreply.github.com"
```
✅ `git config --global user.email` prints the noreply address. (Skip this and GitHub may refuse your push:
[museum card 5](mistakes-museum.md#the-push-that-github-refused).)

**4. Install the GitHub CLI and log in.** *So you can create repos and push without passwords.*
[cli.github.com](https://cli.github.com/) → install, then:

```bash
gh auth login
```
Choose GitHub.com, HTTPS, and "Login with a web browser". ✅ `gh auth status` says "Logged in".

**5. Create your project from this template.** *Your own copy, private until you decide otherwise.*

```bash
gh repo create my-first-project --template juliuspani/from-zero-to-repo --private --clone
cd my-first-project
```
✅ `git log --oneline` shows at least one commit.

**6. Run the checks.** *Proof that everything works before Claude touches anything.*

```bash
npm test
npm run dr-repo
```
✅ `npm test` ends with `fail 0`; Dr. Repo says `Score: 10/10`. (Windows: if PowerShell says *running scripts is
disabled*, see [the table at the end](#if-you-see-this-error).)

**7. Install Claude Code and open it in the project.** *The agent, inside your folder.*
Follow [the official setup](https://docs.claude.com/en/docs/claude-code/setup) (you need a Claude account), then,
inside `my-first-project`:

```bash
claude
```
✅ Claude Code starts and asks whether you trust this folder. Say yes: it is yours.

**8. Start the session and give it a first step.** *One small, real change.*
Type `/start`. Claude summarizes where the project is and checks that the guard hook is alive (it should
report a **BLOCKED** test read). It will also notice that `CLAUDE.md` and `PROGRESS.md` still have
`<placeholders>`: normal on day one, and `/handoff` fills `PROGRESS.md` for you. Then paste the first step from
[the example](../examples/todo-cli/README.md).

✅ Claude shows a test failing, then passing, and stops to wait for you. `npm test` still ends with `fail 0`.

**9. Hand off.** *Save the state, commit and push.*
Type `/handoff`. Claude runs the checks, updates `PROGRESS.md`, commits and pushes. Pushing asks for your
permission: that is the safety net working, say yes.

✅ `git status` says "nothing to commit, working tree clean".

**10. See it online, then clear.** *Your first push, live.*

```bash
gh repo view --web
```
✅ Your commit is on GitHub. Back in Claude Code, type `/clear`. Next time: `/start` and the next step.

🎉 That's it: a real project, with its history, safely online.

---

## If you see this error…

| You see | What it means | Fix |
|---|---|---|
| `Author identity unknown` / `Please tell me who you are` | git does not know your name and email | Step 3 |
| `GH007: Your push would publish a private email address` | your commits use your real email | [Museum 5](mistakes-museum.md#the-push-that-github-refused) |
| `'git'`, `'node'`, `'gh'` or `'claude'` is not recognized / command not found | the terminal started before the install | Close it and open a new one |
| A config file "looks fine" but is reported as invalid | an invisible BOM from Word or PowerShell | [Museum 3](mistakes-museum.md#the-word-file-with-an-invisible-character) |
| Your settings seem to be ignored | the file is `settings.json.txt` | [Museum 4](mistakes-museum.md#the-settings-file-that-was-a-txt) |
| `BLOCKED by .claude/hooks/guard.mjs: the guardrails … are edited by a human` | Claude tried to change its own rules | Edit the file yourself in a text editor: [Museum 1](mistakes-museum.md#the-agent-that-tried-to-edit-its-own-rules) |
| Claude repeats itself, forgets decisions, or says the context is almost full | the session is too long | `/handoff`, `/clear`, `/start`: [Museum 6](mistakes-museum.md#the-session-that-forgot-everything) |
| `npm.ps1 cannot be loaded because running scripts is disabled on this system` | Windows PowerShell does not run script files by default, and `npm` is one | Type `npm.cmd` instead of `npm`: `npm.cmd test`, `npm.cmd run dr-repo` |
| `npm test` fails | a check found a real problem | Paste the failing lines to Claude and ask it to explain before fixing |

Stuck on something else? [Open an issue](../../../issues): beginner questions are welcome.
