#!/usr/bin/env node
// The doctor: a read-only safety check-up for any project you work on with Claude Code.
//
//   node doctor.mjs [path] [--prompt]
//
// It never modifies anything and never uses the network. It reads files, and asks git four read-only
// questions (rev-parse, ls-files, check-ignore, config --get) with fsmonitor and hooks switched off, so a
// hostile repository cannot make it run a program. test/doctor.test.mjs checks both promises.
// Exit code: 0 when every check passes, 1 otherwise, 2 if the path does not exist.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MUSEUM = 'https://github.com/juliuspani/from-zero-to-repo/blob/main/docs/mistakes-museum.md';
const MAX_SCAN_BYTES = 1_000_000;
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.venv', 'venv', '__pycache__']);

// Shapes of real credentials. A match prints the file and line, never the value.
const SECRET_PATTERNS = [
  ['private key', /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b/],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ['OpenAI-style API key', /\bsk-(proj-)?[A-Za-z0-9]{32,}\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Stripe live key', /\b(sk|rk)_live_[0-9A-Za-z]{20,}\b/],
  ['hard-coded secret', /\b(api[_-]?key|secret|password|passwd|token)\b\s*[:=]\s*["'][^"'\s]{16,}["']/i],
];

/** An environment file: .env, .env.local, prod.env, .envrc… but not .env.example / .env.sample / .env.template. */
export function isEnvFile(path) {
  const base = path.replaceAll('\\', '/').split('/').pop() ?? '';
  if (/^\.env\.(example|sample|template)$/.test(base)) return false;
  return /^\.env(rc)?(\.|$)/.test(base) || /^[\w-]+\.env$/.test(base);
}

function git(root, args) {
  try {
    return execFileSync('git', ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=', ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' },
    }).trim();
  } catch {
    return null; // not a repository, git missing, or the answer is "no": the caller decides what that means
  }
}

function walk(root, dir = '', out = []) {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(root, rel, out);
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
  } catch {
    return null;
  }
}

function project(root) {
  const isRepo = git(root, ['rev-parse', '--is-inside-work-tree']) === 'true';
  const tracked = isRepo ? (git(root, ['ls-files', '-z']) ?? '').split('\0').filter(Boolean) : walk(root);
  const settingsPath = join(root, '.claude', 'settings.json');
  return {
    root,
    isRepo,
    tracked,
    present: walk(root),
    settings: existsSync(settingsPath) ? readJson(settingsPath) : undefined,
    settingsTxt: existsSync(`${settingsPath}.txt`) || existsSync(join(root, '.claude', 'settings.txt')),
  };
}

const rules = (p, list) => (Array.isArray(p.settings?.permissions?.[list]) ? p.settings.permissions[list] : []);

function hookCommands(p) {
  const pre = p.settings?.hooks?.PreToolUse;
  if (!Array.isArray(pre)) return [];
  return pre.flatMap((h) => (Array.isArray(h?.hooks) ? h.hooks : [])).map((h) => String(h?.command ?? ''));
}

/** Each check: id, title, run(project) → { ok, detail }, fix, prompt, museum anchor. */
export const CHECKS = [
  {
    id: 'env-ignored',
    title: '.env files are git-ignored',
    run: (p) => {
      if (!p.isRepo) return { ok: false, detail: 'not a git repository, so nothing is ignored yet' };
      const probes = ['.env', '.env.local', 'prod.env', '.envrc'];
      const missing = probes.filter((f) => git(p.root, ['check-ignore', '-q', '--no-index', f]) === null);
      const presentNotIgnored = p.present.filter(isEnvFile).filter((f) => git(p.root, ['check-ignore', '-q', '--no-index', f]) === null);
      const bad = [...new Set([...missing, ...presentNotIgnored])];
      return bad.length === 0 ? { ok: true } : { ok: false, detail: `not ignored: ${bad.join(', ')}` };
    },
    fix: 'Add .env, .env.*, *.env and .envrc (and !.env.example) to .gitignore.',
    prompt: 'Add these lines to .gitignore, keeping what is there: .env, .env.*, *.env, .envrc and !.env.example. Do not open, read or print any .env file. Show me the diff of .gitignore and commit it.',
    museum: 'the-env-rule-that-blocked-the-wrong-file',
  },
  {
    id: 'env-tracked',
    title: 'no .env file is committed',
    run: (p) => {
      const bad = p.tracked.filter(isEnvFile);
      return bad.length === 0 ? { ok: true } : { ok: false, detail: `committed: ${bad.join(', ')}` };
    },
    fix: 'Untrack it (git rm --cached <file>), rotate every key it held, and ignore it.',
    prompt: 'Run git rm --cached on each committed .env file the doctor listed, without opening or printing them, add them to .gitignore, and commit. Then list which services I must rotate keys for, by variable name only. Remind me that the old values stay in git history until I rewrite it.',
    museum: 'the-env-rule-that-blocked-the-wrong-file',
  },
  {
    id: 'secrets',
    title: 'no secret-looking strings in tracked files',
    run: (p) => {
      const hits = [];
      for (const file of p.tracked) {
        const full = join(p.root, file);
        let text;
        try {
          if (statSync(full).size > MAX_SCAN_BYTES) continue;
          text = readFileSync(full, 'utf8');
        } catch {
          continue;
        }
        if (text.includes('\0')) continue; // binary
        text.split(/\r?\n/).forEach((line, i) => {
          for (const [name, re] of SECRET_PATTERNS) if (re.test(line)) hits.push(`${file}:${i + 1} (${name})`);
        });
      }
      return hits.length === 0 ? { ok: true } : { ok: false, detail: hits.slice(0, 10).join(', ') + (hits.length > 10 ? ` and ${hits.length - 10} more` : '') };
    },
    fix: 'Move the value to .env (ignored), read it from the environment, and rotate the key: it is already exposed.',
    prompt: 'For each file:line the doctor listed, replace the hard-coded value with a read from an environment variable and add the variable name, without a value, to .env.example. Never print the secret values in the chat or in commit messages. Then tell me which keys to rotate.',
    museum: 'the-env-rule-that-blocked-the-wrong-file',
  },
  {
    id: 'git-email',
    title: 'git uses your private GitHub email',
    run: (p) => {
      const email = git(p.root, ['config', '--get', 'user.email']);
      if (!email) return { ok: false, detail: 'git has no user.email: your first commit will fail' };
      if (/@users\.noreply\.github\.com$/i.test(email)) return { ok: true };
      return { ok: false, detail: 'your real email goes into every public commit (and GitHub may reject the push)' };
    },
    fix: 'git config --global user.email "<id>+<user>@users.noreply.github.com" (GitHub → Settings → Emails).',
    prompt: 'Explain how to find my GitHub noreply email (Settings → Emails, "Keep my email addresses private"), then give me the exact git config --global user.email command to run myself. Do not run it for me.',
    museum: 'the-push-that-github-refused',
  },
  {
    id: 'claude-md',
    title: 'CLAUDE.md exists (the rules Claude reads first)',
    run: (p) => ({ ok: existsSync(join(p.root, 'CLAUDE.md')), detail: 'no CLAUDE.md: every session starts without rules' }),
    fix: 'Copy CLAUDE.md from from-zero-to-repo and fill the <placeholders>.',
    prompt: 'Create a short CLAUDE.md for this project based on https://github.com/juliuspani/from-zero-to-repo/blob/main/CLAUDE.md: what the project is, non-negotiable rules, the standard closing of every step, the session start protocol and the mandatory stops. Ask me what the project is for before writing it.',
    museum: 'the-session-that-forgot-everything',
  },
  {
    id: 'progress-md',
    title: 'PROGRESS.md exists (the memory between sessions)',
    run: (p) => ({ ok: existsSync(join(p.root, 'PROGRESS.md')), detail: 'no PROGRESS.md: the next session cannot know where you left off' }),
    fix: 'Copy PROGRESS.md from from-zero-to-repo and keep it under 200 lines.',
    prompt: 'Create PROGRESS.md following https://github.com/juliuspani/from-zero-to-repo/blob/main/PROGRESS.md, filled with the real state of this repository (read git log and git status first). Keep it under 200 lines.',
    museum: 'the-session-that-forgot-everything',
  },
  {
    id: 'settings-safe',
    title: '.claude/settings.json exists and has no dangerous permissions',
    run: (p) => {
      if (p.settingsTxt) return { ok: false, detail: 'found settings saved as .txt: Claude Code ignores it' };
      if (p.settings === undefined) return { ok: false, detail: 'no .claude/settings.json: everything falls back to the defaults' };
      if (p.settings === null) return { ok: false, detail: '.claude/settings.json is not valid JSON, so it is ignored' };
      const bad = [];
      if (/^bypassPermissions$/i.test(String(p.settings.permissions?.defaultMode ?? ''))) bad.push('defaultMode bypassPermissions');
      for (const r of rules(p, 'allow')) {
        if (/^(Bash|PowerShell)(\(\*?\))?$/.test(r)) bad.push(`${r} (any command)`);
        else if (/git push/i.test(r)) bad.push(`${r} (push without asking)`);
        else if (/^(Bash|PowerShell)\((curl|wget|ssh|scp|nc|Invoke-WebRequest|Invoke-RestMethod|iwr|irm)\b/i.test(r)) bad.push(`${r} (network)`);
      }
      return bad.length === 0 ? { ok: true } : { ok: false, detail: bad.join(', ') };
    },
    fix: 'Start from from-zero-to-repo/.claude/settings.jsonc: push and network in "ask", never a bare Bash.',
    prompt: 'Show me my .claude/settings.json next to https://github.com/juliuspani/from-zero-to-repo/blob/main/.claude/settings.jsonc and propose a safer version: push, network commands, installs and deletes in "ask", no bare Bash or PowerShell in "allow", no bypassPermissions. Do not edit the file: give me the full JSON to paste myself, in a plain-text editor, saved as UTF-8 without BOM.',
    museum: 'the-settings-file-that-was-a-txt',
  },
  {
    id: 'hook-active',
    title: 'a PreToolUse guard hook is wired and its file exists',
    run: (p) => {
      const commands = hookCommands(p);
      if (commands.length === 0) return { ok: false, detail: 'no PreToolUse hook in .claude/settings.json' };
      const files = commands.flatMap((c) => [...c.matchAll(/(?:\$CLAUDE_PROJECT_DIR\/)?([\w./-]+\.(?:mjs|cjs|js|ts|py|sh|ps1))/g)].map((m) => m[1]));
      const missing = files.filter((f) => !existsSync(join(p.root, f)));
      if (files.length === 0) return { ok: false, detail: 'the hook command names no script file I can find' };
      return missing.length === 0 ? { ok: true } : { ok: false, detail: `hook file missing: ${missing.join(', ')}` };
    },
    fix: 'Copy .claude/hooks/guard.mjs and its "hooks" block from from-zero-to-repo, then check /arranque reports it alive.',
    prompt: 'Explain what the guard hook in https://github.com/juliuspani/from-zero-to-repo/blob/main/.claude/hooks/guard.mjs blocks, and adapt its PROTECTED list to this project. Do not write into .claude/ yourself: give me the files to copy by hand and the exact "hooks" block for settings.json.',
    museum: 'the-agent-that-tried-to-edit-its-own-rules',
  },
  {
    id: 'guardrails-locked',
    title: 'Claude cannot edit its own settings or hooks',
    run: (p) => {
      const deny = rules(p, 'deny');
      const need = ['Edit(./.claude/settings.json)', 'Edit(./.claude/hooks/**)'];
      const missing = need.filter((r) => !deny.includes(r));
      return missing.length === 0 ? { ok: true } : { ok: false, detail: `missing in deny: ${missing.join(', ')}` };
    },
    fix: 'Add Edit(./.claude/settings.json) and Edit(./.claude/hooks/**) to "deny", by hand.',
    prompt: 'Give me the "deny" rules that stop you from editing .claude/settings.json, .claude/settings.local.json and .claude/hooks/, as JSON to paste myself. Explain in two lines why the rules that bind you must be edited by a human.',
    museum: 'the-agent-that-tried-to-edit-its-own-rules',
  },
  {
    id: 'claude-dir-locked',
    title: 'commands, agents and .git are protected too',
    run: (p) => {
      const deny = rules(p, 'deny');
      const need = ['Edit(./.claude/commands/**)', 'Edit(./.claude/agents/**)', 'Edit(./.git/**)'];
      const missing = need.filter((r) => !deny.includes(r));
      return missing.length === 0 ? { ok: true } : { ok: false, detail: `missing in deny: ${missing.join(', ')}` };
    },
    fix: 'Add Edit(./.claude/commands/**), Edit(./.claude/agents/**) and Edit(./.git/**) to "deny", by hand.',
    prompt: 'Explain why commands and agents in .claude/ and the .git folder count as guardrails (they declare tools or make git run programs), and give me the "deny" rules to paste myself.',
    museum: 'the-review-that-broke-the-guard',
  },
];

export function examine(root) {
  const p = project(root);
  return CHECKS.map((c) => ({ ...c, result: c.run(p) }));
}

function report(results, withPrompt) {
  const passed = results.filter((r) => r.result.ok).length;
  const lines = ['', 'Doctor check-up (read-only, no network)', ''];
  for (const r of results) {
    lines.push(`${r.result.ok ? '  ok  ' : '  FIX '} ${r.title}`);
    if (r.result.ok) continue;
    if (r.result.detail) lines.push(`        ${r.result.detail}`);
    lines.push(`        how: ${r.fix}`);
    lines.push(`        why: ${MUSEUM}#${r.museum}`);
    if (withPrompt) lines.push(`        paste in Claude Code: "${r.prompt}"`);
  }
  lines.push('', `Score: ${passed}/${results.length}`);
  if (passed < results.length && !withPrompt) lines.push('Run again with --prompt to get a prompt for each fix.');
  lines.push('');
  return lines.join('\n');
}

function main(argv) {
  const withPrompt = argv.includes('--prompt');
  const target = argv.find((a) => !a.startsWith('--')) ?? '.';
  const root = resolve(target);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    process.stderr.write(`doctor: ${target} is not a folder\n`);
    return 2;
  }
  const results = examine(root);
  process.stdout.write(report(results, withPrompt));
  return results.every((r) => r.result.ok) ? 0 : 1;
}

if (process.argv[1] !== undefined && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}
