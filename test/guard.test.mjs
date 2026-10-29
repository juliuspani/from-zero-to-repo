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
    'node scripts/settings.mjs && git add .claude/settings.json',
    'cat .claude/settings.jsonc | tee .claude/settings.json',
  ]) {
    assert.notEqual(bash(command), null, command);
  }
  assert.notEqual(ps('Set-Content .claude\\settings.json "{}"'), null);
  // Skills, commands and agents are ordinary project files: the step may change them.
  assert.equal(evaluate('Edit', { file_path: '.claude/skills/engineering-standard/SKILL.md', new_string: 'x' }), null);
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
