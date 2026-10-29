// Example PreToolUse guard hook for Claude Code (wired in .claude/settings.json).
//
// It blocks, before they happen:
//   - reading or writing environment files (.env, .env.*, *.env, .envrc), except .env.example, which may only
//     hold names without values;
//   - reading or writing the paths in PROTECTED (adapt the list to your project);
//   - editing the guardrails: .claude/settings*, .claude/hooks/, .claude/commands/, .claude/agents/,
//     .git/config and .git/hooks/ (the agent must not be able to weaken the rules that bind it, widen its own
//     tools or redirect git; a human edits them);
//   - destructive commands: recursive forced deletes, forced git push, git reset --hard;
//   - skipping or redirecting git hooks (--no-verify, commit -n, core.hooksPath).
//
// Claude Code sends the tool call as JSON on stdin. Exit code 2 blocks the tool and shows stderr to Claude.
// Fail closed: unreadable input or any error inside the hook exits with 2.
//
// LIMITS. It compares text. It is a seatbelt against mistakes, not a sandbox against an adversary:
//   - a script the agent writes and then runs (npm test, node x.mjs) is not inspected;
//   - in the shell, a path built at run time (`cd` into a folder and use a relative name, variables,
//     concatenated strings, symbolic links) is not seen;
//   - if the hook cannot start at all (node missing, $CLAUDE_PROJECT_DIR not expanded), Claude Code treats
//     the failure as non-blocking and the call goes on. /arranque checks that the hook is alive.
//   - MCP tools are not in the matcher of settings.json; add them if you install a file-system MCP server.

import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Paths whose content Claude must never read or write. Glob (names only) is still allowed.
// Example: a frozen evaluation set, customer data, production dumps. Keep each one in .gitignore too, and
// add Read/Edit rules for it to `deny` in .claude/settings.jsonc.
const PROTECTED = [/(^|\/)data\/private(\/|$)/];

// The guardrails. Claude may read them, never write them.
const GUARDRAILS = [
  /(^|\/)\.claude\/settings(\.local)?\.jsonc?$/,
  /(^|\/)\.claude\/(hooks|commands|agents)(\/|$)/,
  /(^|\/)\.git\/(config$|hooks(\/|$))/,
];
// In a shell command any mention of these folders counts: the shell can reach them in too many spellings.
// scripts/settings.mjs (npm run settings) rewrites .claude/settings.json without naming it.
const GUARDRAIL_IN_COMMAND = /\.claude|\.git[\\/]+(config|hooks)|scripts[\\/]+settings\.mjs|npm\s+run\s+settings/i;

const FILE_WRITE_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit']);
const FILE_TOOLS = new Set(['Read', 'Edit', 'Write', 'NotebookEdit', 'Grep', 'Glob']);
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);

const ENV_EXAMPLE = '.env.example';
// `KEY=value` or `export KEY=value`: group 2 is the value.
const ENV_ASSIGNMENT = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/;
const SKIP_GIT_HOOKS = /--no-verify|core\.hookspath/i;
const DELETE_COMMANDS = new Set(['rm', 'remove-item', 'ri', 'del', 'erase', 'rd', 'rmdir']);
// Commands that only read. A shell command that names a guardrail passes only if it is one of these, with no
// redirection, pipe, command substitution, wildcard or output option.
const READ_ONLY_COMMANDS = new Set(['cat', 'head', 'tail', 'less', 'ls', 'wc', 'diff', 'get-content', 'gc', 'type']);
const READ_ONLY_GIT = new Set(['diff', 'log', 'show', 'status', 'blame', 'add']);
const UNSAFE_SYNTAX = /[|<>`&*?[\]]|\$\(|@\(|\{/;
const WRITING_OPTION = /^(-o|--output|--ext-diff|--textconv)/i;

function str(v) {
  return typeof v === 'string' ? v : '';
}

/** Lower case, forward slashes, `.`, `..` and `//` resolved. */
function normalizePath(p) {
  const normalized = posix.normalize(p.replaceAll('\\', '/').toLowerCase());
  return normalized.startsWith('./') ? normalized.slice(2) : normalized;
}

/** An environment file: .env, .env.local, prod.env, .envrc… but not .env.example and not process.env. */
function isEnvFile(path) {
  const base = path.slice(path.lastIndexOf('/') + 1);
  if (base === ENV_EXAMPLE) return false;
  return /^\.env(rc)?(\.|$)/.test(base) || /^[\w-]+\.env$/.test(base);
}

/** A shell word that could expand to an environment file: `.en?`, `.e*`, `[.]env`. */
function mayGlobToEnv(token) {
  const base = token.slice(token.lastIndexOf('/') + 1);
  return /[*?[]/.test(base) && /^(\.|\[\.\])(e|\[|\*|\?)/.test(base);
}

function shellTokens(segment) {
  return segment.split(/[\s=;()]+/).map((t) => t.replace(/^["']+|["',]+$/g, '')).filter((t) => t.length > 0);
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
  const words = tokens.map((t) => t.replace(/^["']|["']$/g, '').toLowerCase());
  const [head, sub] = words;
  if (head === undefined) return false;
  if (words.some((w) => WRITING_OPTION.test(w))) return false;
  if (/^git(\.exe)?$/.test(head)) return sub !== undefined && READ_ONLY_GIT.has(sub);
  return READ_ONLY_COMMANDS.has(head);
}

function checkCommand(command) {
  for (const token of shellTokens(command)) {
    const path = normalizePath(token);
    if (isEnvFile(path) || mayGlobToEnv(token)) return 'the command touches an environment file (.env, *.env, .envrc)';
    if (PROTECTED.some((re) => re.test(path))) return 'the command names a protected path';
  }

  for (const segment of command.split(/&&|\|\||;|\n/)) {
    if (!GUARDRAIL_IN_COMMAND.test(segment)) continue;
    const tokens = segment.trim().split(/\s+/).filter((t) => t.length > 0);
    if (UNSAFE_SYNTAX.test(segment) || !isReadOnly(tokens)) {
      return 'the command may modify the guardrails (.claude/, .git/config, .git/hooks); a human edits them';
    }
  }

  for (const segment of command.split(/[|;&\n]+/)) {
    const tokens = segment.trim().split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length === 0) continue;
    if (isRecursiveForceDelete(tokens)) return 'recursive forced delete (rm -rf or equivalent)';

    const git = tokens.findIndex((t) => /^git(\.exe)?$/i.test(t));
    if (git === -1) continue;
    const rest = tokens.slice(git + 1);
    const shortGroups = rest.filter((t) => /^-[a-z]+$/i.test(t));
    if (rest.includes('push')) {
      const forced = rest.some((t) => t.startsWith('--force') || /^\+\S/.test(t)) || shortGroups.some((t) => t.includes('f'));
      if (forced) return 'forced git push';
    }
    if (rest.includes('reset') && rest.includes('--hard')) return 'git reset --hard';
    if (SKIP_GIT_HOOKS.test(segment)) return 'the command skips or redirects the git hooks';
    // `git commit -n` is the short form of --no-verify; a message that contains "-n" needs `git commit -F`.
    if (rest[0] === 'commit' && shortGroups.some((t) => t.includes('n'))) return 'git commit -n skips the git hooks';
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

  if (paths.some(isEnvFile)) return 'environment files are never read or written (only .env.example is allowed)';
  // Glob only returns names, like `ls`, so it is allowed. Read and Grep return content.
  if (tool !== 'Glob' && paths.some((p) => PROTECTED.some((re) => re.test(p)))) {
    return 'this path is protected: its content is never read or written';
  }
  if (!FILE_WRITE_TOOLS.has(tool)) return null;

  if (paths.some((p) => GUARDRAILS.some((re) => re.test(p)))) {
    return 'the guardrails (.claude/settings, hooks, commands, agents; .git/config and .git/hooks) are edited by a human';
  }
  if (paths.some((p) => p.endsWith(`/${ENV_EXAMPLE}`) || p === ENV_EXAMPLE)) {
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
  const parsed = JSON.parse(await readStdin());
  if (typeof parsed !== 'object' || parsed === null) throw new Error('the input is not an object');
  if (typeof parsed.tool_name !== 'string') throw new Error('tool_name is missing');
  const input = typeof parsed.tool_input === 'object' && parsed.tool_input !== null ? parsed.tool_input : {};
  const reason = evaluate(parsed.tool_name, input);
  if (reason !== null) block(reason);
}

if (process.argv[1] !== undefined && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  try {
    await main();
  } catch (e) {
    block(`hook error, failing closed (${e instanceof Error ? e.message : String(e)})`);
  }
}
