// Example PreToolUse guard hook for Claude Code (wired in .claude/settings.json).
//
// It blocks, before they happen:
//   - reading or writing .env files (except .env.example, and then only names without values);
//   - reading or writing the paths in PROTECTED (adapt the list to your project);
//   - editing the guardrails themselves: .claude/settings*.json(c) and .claude/hooks/ (the agent must not be
//     able to weaken the rules that bind it; a human edits them);
//   - destructive commands: recursive forced deletes, forced git push, git reset --hard;
//   - skipping or redirecting git hooks (--no-verify, core.hooksPath).
//
// Claude Code sends the tool call as JSON on stdin. Exit code 2 blocks the tool and shows stderr to Claude.
// Fail closed: if the input cannot be understood, the call is blocked.
//
// It compares text. It is a seatbelt against mistakes, not a sandbox against an adversary: a script the agent
// writes and then runs is not inspected. Keep secrets off the machine where that matters.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Paths whose content Claude must never read or write. Glob (names only) is still allowed.
// Example: a frozen evaluation set, customer data, production dumps.
const PROTECTED = [/(^|\/)data\/private(\/|$)/];

// The guardrails. Claude may read them, never write them.
const GUARDRAILS = [/(^|\/)\.claude\/settings(\.local)?\.jsonc?$/, /(^|\/)\.claude\/hooks(\/|$)/];

const FILE_WRITE_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit']);
const FILE_TOOLS = new Set(['Read', 'Edit', 'Write', 'NotebookEdit', 'Grep', 'Glob']);
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);

// `.env`, `.env.local`, `dir/.env`… but not `process.env` or `.environment`.
const ENV_FILE = /(?<![\w$.)\]])\.env(?![a-zA-Z0-9])/;
const ENV_EXAMPLE = /(^|\/)\.env\.example$/;
// `KEY=value` or `export KEY=value`: group 2 is the value.
const ENV_ASSIGNMENT = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/;
const SKIP_GIT_HOOKS = /--no-verify|core\.hookspath/i;
const DELETE_COMMANDS = new Set(['rm', 'remove-item', 'ri', 'del', 'erase', 'rd', 'rmdir']);
// Commands that only read. A shell command that names a guardrail passes only if it is one of these, with no
// redirection, pipe or command substitution.
const READ_ONLY_COMMANDS = new Set(['cat', 'head', 'tail', 'less', 'ls', 'wc', 'diff', 'get-content', 'gc', 'type']);
const READ_ONLY_GIT = new Set(['diff', 'log', 'show', 'status', 'blame']);
const UNSAFE_SYNTAX = /[|<>`&]|\$\(|@\(|\{/;

function str(v) {
  return typeof v === 'string' ? v : '';
}

function normalizePath(p) {
  return p.replaceAll('\\', '/').toLowerCase();
}

function isRecursiveForceDelete(tokens) {
  const at = tokens.findIndex((t) => DELETE_COMMANDS.has(t.toLowerCase().replace(/^.*[\\/]/, '')));
  if (at === -1) return false;
  let recursive = false;
  let force = false;
  for (const raw of tokens.slice(at + 1)) {
    const t = raw.toLowerCase();
    if (t === '/s') recursive = force = true; // cmd's rmdir /s deletes the whole tree
    if (!t.startsWith('-')) continue;
    if (t === '--recursive') recursive = true;
    else if (t === '--force') force = true;
    else {
      const body = t.replace(/^-+/, '').replace(/:.*$/, '');
      if (body.length === 0) continue;
      // PowerShell parameters accept abbreviations: -Recurse, -r, -Force, -fo.
      if ('recurse'.startsWith(body)) recursive = true;
      else if ('force'.startsWith(body)) force = true;
      else if (/^[a-z]+$/.test(body)) {
        // Group of short options: -rf, -fr, -Rf.
        if (body.includes('r')) recursive = true;
        if (body.includes('f')) force = true;
      }
    }
  }
  return recursive && force;
}

function isReadOnly(tokens) {
  const [head, sub] = tokens.map((t) => t.replace(/^["']|["']$/g, '').toLowerCase());
  if (head === undefined) return false;
  if (/^git(\.exe)?$/.test(head)) return sub !== undefined && READ_ONLY_GIT.has(sub);
  return READ_ONLY_COMMANDS.has(head);
}

function namesGuardrail(text) {
  const t = normalizePath(text);
  return /\.claude\/settings|\.claude\/hooks/.test(t);
}

function namesProtected(text) {
  const tokens = normalizePath(text).split(/[\s=]+/).map((t) => t.replace(/^["']+|["';]+$/g, ''));
  return tokens.some((tok) => PROTECTED.some((re) => re.test(tok)));
}

function checkCommand(command) {
  if (ENV_FILE.test(command)) return 'the command touches a .env file';
  if (namesProtected(command)) return 'the command names a protected path';

  for (const segment of command.split(/&&|\|\||;|\n/)) {
    if (!namesGuardrail(segment)) continue;
    const tokens = segment.trim().split(/\s+/).filter((t) => t.length > 0);
    if (UNSAFE_SYNTAX.test(segment) || !isReadOnly(tokens)) {
      return 'the command may modify the guardrails (.claude/settings or .claude/hooks); a human edits them';
    }
  }

  for (const segment of command.split(/[|;&\n]+/)) {
    const tokens = segment.trim().split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length === 0) continue;
    if (isRecursiveForceDelete(tokens)) return 'recursive forced delete (rm -rf or equivalent)';

    const git = tokens.findIndex((t) => /^git(\.exe)?$/i.test(t));
    if (git === -1) continue;
    const rest = tokens.slice(git + 1);
    if (rest.includes('push')) {
      const forced = rest.some((t) => t === '-f' || t.startsWith('--force') || /^\+\S/.test(t));
      if (forced) return 'forced git push';
    }
    if (rest.includes('reset') && rest.includes('--hard')) return 'git reset --hard';
    if (SKIP_GIT_HOOKS.test(segment)) return 'the command skips or redirects the git hooks';
  }
  return null;
}

/** Variables in .env.example that carry a value. A value could be a real secret. */
function envExampleValues(text) {
  const names = [];
  for (const line of text.split(/\r?\n/)) {
    const match = ENV_ASSIGNMENT.exec(line);
    const name = match?.[1];
    const value = match?.[2] ?? '';
    // Empty, empty quotes or only a comment count as "no value".
    if (name !== undefined && value !== '' && value !== '""' && value !== "''" && !value.startsWith('#')) {
      names.push(name);
    }
  }
  return names;
}

function checkFileTool(tool, input) {
  const targets = [input.file_path, input.notebook_path, input.path, input.glob];
  if (tool === 'Glob') targets.push(input.pattern);
  const paths = targets.map(str).filter((p) => p.length > 0).map(normalizePath);
  const written = [input.content, input.new_string, input.new_source].map(str).join('\n');

  const envPaths = paths.filter((p) => ENV_FILE.test(p));
  if (envPaths.some((p) => !ENV_EXAMPLE.test(p))) {
    return '.env files are never read or written (only .env.example is allowed)';
  }
  // Glob only returns names, like `ls`, so it is allowed. Read and Grep return content.
  if (tool !== 'Glob' && paths.some((p) => PROTECTED.some((re) => re.test(p)))) {
    return 'this path is protected: its content is never read or written';
  }
  if (!FILE_WRITE_TOOLS.has(tool)) return null;

  if (paths.some((p) => GUARDRAILS.some((re) => re.test(p)))) {
    return 'the guardrails (.claude/settings and .claude/hooks) are edited by a human, not by Claude';
  }
  if (envPaths.length > 0) {
    const withValue = envExampleValues(written);
    if (withValue.length > 0) {
      return `.env.example only takes names without values; these have a value: ${withValue.join(', ')}`;
    }
  }
  return null;
}

/** Returns the reason for blocking, or null if the call may go on. */
export function evaluate(tool, input) {
  if (SHELL_TOOLS.has(tool)) return checkCommand(str(input.command));
  if (FILE_TOOLS.has(tool)) return checkFileTool(tool, input);
  return null;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function block(reason) {
  process.stderr.write(`BLOCKED by .claude/hooks/guard.mjs: ${reason}. See CLAUDE.md §2.\n`);
  process.exit(2);
}

async function main() {
  let tool;
  let input;
  try {
    const parsed = JSON.parse(await readStdin());
    if (typeof parsed !== 'object' || parsed === null) throw new Error('the input is not an object');
    if (typeof parsed.tool_name !== 'string') throw new Error('tool_name is missing');
    tool = parsed.tool_name;
    input = typeof parsed.tool_input === 'object' && parsed.tool_input !== null ? parsed.tool_input : {};
  } catch (e) {
    block(`unreadable hook input (${e instanceof Error ? e.message : String(e)})`);
  }
  const reason = evaluate(tool, input);
  if (reason !== null) block(reason);
}

if (process.argv[1] !== undefined && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) await main();
