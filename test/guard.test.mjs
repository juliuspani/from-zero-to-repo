import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { evaluate } from '../.claude/hooks/guard.mjs';

const HOOK = resolve(fileURLToPath(import.meta.url), '..', '..', '.claude', 'hooks', 'guard.mjs');
const bash = (command) => evaluate('Bash', { command });
const ps = (command) => evaluate('PowerShell', { command });

test('allows ordinary work', () => {
  assert.equal(bash('git status'), null);
  assert.equal(bash('npm test'), null);
  assert.equal(bash('git push origin main'), null);
  assert.equal(bash('rm build/output.txt'), null);
  assert.equal(evaluate('Read', { file_path: 'src/index.ts' }), null);
  assert.equal(evaluate('Edit', { file_path: 'src/config.ts', new_string: 'process.env.PORT' }), null);
  assert.equal(evaluate('WebSearch', { query: 'anything' }), null);
});

test('blocks recursive forced deletes in every common spelling', () => {
  for (const command of ['rm -rf dist', 'rm -fr dist', 'rm -r -f dist', 'rm --recursive --force dist', 'cd x && rm -Rf .']) {
    assert.notEqual(bash(command), null, command);
  }
  for (const command of ['Remove-Item -Recurse -Force dist', 'ri -r -fo dist', 'rmdir /s dist']) {
    assert.notEqual(ps(command), null, command);
  }
});

test('blocks forced push, hard reset and skipping git hooks', () => {
  assert.notEqual(bash('git push --force origin main'), null);
  assert.notEqual(bash('git push -f'), null);
  assert.notEqual(bash('git push origin +main'), null);
  assert.notEqual(bash('git push --force-with-lease'), null);
  assert.notEqual(bash('git reset --hard HEAD~1'), null);
  assert.notEqual(bash('git commit --no-verify -m x'), null);
  assert.notEqual(bash('git config core.hooksPath /dev/null'), null);
});

test('never reads or writes .env files, but allows names-only .env.example', () => {
  assert.notEqual(evaluate('Read', { file_path: '.env' }), null);
  assert.notEqual(evaluate('Read', { file_path: 'config/.env.production' }), null);
  assert.notEqual(evaluate('Grep', { pattern: 'KEY', path: '.env.local' }), null);
  assert.notEqual(bash('cat .env'), null);
  assert.notEqual(bash('source .env'), null);
  assert.equal(evaluate('Read', { file_path: '.env.example' }), null);
  assert.equal(evaluate('Write', { file_path: '.env.example', content: 'API_KEY=\nPORT= # default 3000\n' }), null);
  assert.notEqual(evaluate('Write', { file_path: '.env.example', content: 'API_KEY=abc123\n' }), null);
});

test('protects the paths in PROTECTED, but lets Glob list names', () => {
  assert.notEqual(evaluate('Read', { file_path: 'data/private/users.csv' }), null);
  assert.notEqual(evaluate('Write', { file_path: 'data\\private\\users.csv', content: 'x' }), null);
  assert.notEqual(bash('cat data/private/users.csv'), null);
  assert.notEqual(bash('head "./data/private/users.csv"'), null);
  assert.equal(evaluate('Glob', { pattern: 'data/private/*' }), null);
  assert.equal(evaluate('Read', { file_path: 'data/public/sample.csv' }), null);
});

test('Claude may read its guardrails but never change them', () => {
  assert.equal(evaluate('Read', { file_path: '.claude/settings.json' }), null);
  assert.equal(bash('cat .claude/settings.json'), null);
  assert.equal(bash('git diff .claude/hooks/guard.mjs'), null);
  for (const file_path of ['.claude/settings.json', '.claude/settings.jsonc', '.claude/settings.local.json', '.claude/hooks/guard.mjs']) {
    assert.notEqual(evaluate('Edit', { file_path, new_string: 'x' }), null, file_path);
    assert.notEqual(evaluate('Write', { file_path, content: 'x' }), null, file_path);
  }
  assert.notEqual(evaluate('Write', { file_path: 'C:\\repo\\.claude\\hooks\\guard.mjs', content: 'x' }), null);
  for (const command of [
    'echo {} > .claude/settings.json',
    "sed -i 's/deny/allow/' .claude/settings.json",
    'cp /tmp/x .claude/hooks/guard.mjs',
    'node scripts/settings.mjs',
    'npm run settings',
    'cat .claude/settings.jsonc | tee .claude/settings.json',
  ]) {
    assert.notEqual(bash(command), null, command);
  }
  assert.notEqual(ps('Set-Content .claude\\settings.json "{}"'), null);
  // Skills, commands and agents are ordinary project files: the step may change them.
  assert.equal(evaluate('Edit', { file_path: '.claude/skills/engineering-standard/SKILL.md', new_string: 'x' }), null);
});

test('S-01: git cannot write a guardrail through --output', () => {
  assert.notEqual(bash('git diff --output=.claude/hooks/guard.mjs'), null);
  assert.notEqual(bash('git log -o .claude/settings.json'), null);
  assert.notEqual(bash('git show HEAD:x --output .claude/settings.json'), null);
});

test('S-04/S-06: other spellings of a protected path or a guardrail are caught', () => {
  assert.notEqual(evaluate('Read', { file_path: 'data/./private/users.csv' }), null);
  assert.notEqual(evaluate('Read', { file_path: 'data/public/../private/users.csv' }), null);
  assert.notEqual(evaluate('Write', { file_path: '.claude/./settings.json', content: 'x' }), null);
  assert.notEqual(evaluate('Write', { file_path: '.claude//hooks/guard.mjs', content: 'x' }), null);
  assert.notEqual(bash('cd .claude && echo {} > settings.json'), null);
  assert.notEqual(bash('cp x .claude/./settings.json'), null);
  assert.notEqual(bash('cp x .claude/setting?.json'), null);
  assert.notEqual(bash('cp x .claude//hooks/guard.mjs'), null);
  assert.notEqual(bash('cat data/./private/users.csv'), null);
});

test('S-07: git hooks cannot be skipped with -n, and .git/config and .git/hooks are guardrails', () => {
  assert.notEqual(bash('git commit -n -m x'), null);
  assert.notEqual(bash('git commit -nm x'), null);
  assert.equal(bash('git commit -m x'), null);
  assert.equal(bash('git commit -am x'), null);
  assert.notEqual(evaluate('Write', { file_path: '.git/config', content: 'x' }), null);
  assert.notEqual(evaluate('Edit', { file_path: '.git/hooks/pre-commit', new_string: 'x' }), null);
  assert.notEqual(bash('echo x > .git/hooks/pre-commit'), null);
});

test('S-08: other environment file names are secrets too', () => {
  for (const file_path of ['prod.env', 'config/secrets.env', '.envrc', 'deploy/.envrc']) {
    assert.notEqual(evaluate('Read', { file_path }), null, file_path);
  }
  assert.notEqual(bash('cat prod.env'), null);
  assert.notEqual(bash('cat .envrc'), null);
  assert.notEqual(bash('cat .en?'), null);
  assert.equal(bash('node -e "console.log(process.env.HOME)"'), null);
});

test('S-09: commands and agents are guardrails; skills stay editable', () => {
  assert.notEqual(evaluate('Edit', { file_path: '.claude/commands/handoff.md', new_string: 'x' }), null);
  assert.notEqual(evaluate('Write', { file_path: '.claude/agents/consultant-security.md', content: 'x' }), null);
  assert.equal(evaluate('Read', { file_path: '.claude/agents/consultant-security.md' }), null);
  assert.equal(bash('git add .claude/skills/engineering-standard/SKILL.md'), null);
  assert.equal(bash('cat scripts/settings.mjs'), null);
  assert.notEqual(bash('sed -i s/x/y/ .claude/skills/engineering-standard/SKILL.md'), null, 'via the shell, any .claude path is read-only');
});

test('S-12: grouped force flags on push are caught', () => {
  assert.notEqual(bash('git push -uf origin main'), null);
  assert.notEqual(bash('git push -fu origin main'), null);
  assert.equal(bash('git push -u origin main'), null);
});

test('the hook process blocks with exit code 2 and fails closed on bad input', () => {
  const run = (stdin) => spawnSync(process.execPath, [HOOK], { input: stdin, encoding: 'utf8' });
  const ok = run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } }));
  assert.equal(ok.status, 0, ok.stderr);
  const blocked = run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git push --force' } }));
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /BLOCKED/);
  assert.equal(run('not json').status, 2);
  assert.equal(run(JSON.stringify({ tool_input: {} })).status, 2);
});
