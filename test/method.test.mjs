// The method's rules, checked by code instead of trusted to memory.

import { strict as assert } from 'node:assert';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { settingsFromJsonc } from '../scripts/settings.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const lines = (text) => text.replace(/\n$/, '').split('\n').length;

test('PROGRESS.md stays under 200 lines', () => {
  assert.ok(lines(read('PROGRESS.md')) <= 200, `PROGRESS.md has ${lines(read('PROGRESS.md'))} lines`);
});

test('PROGRESS.md keeps the sections the handoff relies on', () => {
  const progress = read('PROGRESS.md');
  for (const heading of ['## Current state', '## Pending decisions', '## Decisions taken by Claude', '## Commitments for future steps', '## HANDOFF', '## Current risks']) {
    assert.ok(progress.includes(heading), `missing "${heading}"`);
  }
});

const START = '<!-- consultants:shared:start -->';
const END = '<!-- consultants:shared:end -->';
function sharedBlock(text, file) {
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  assert.ok(s !== -1 && e > s, `${file}: shared block markers missing`);
  return text.slice(s, e + END.length);
}

const consultantFiles = [
  ...readdirSync(resolve(ROOT, '.claude/agents')).filter((f) => f.startsWith('consultant-')).map((f) => `.claude/agents/${f}`),
  'templates/consultant.md',
];

test('every consultant carries the shared rules verbatim', () => {
  const reference = sharedBlock(read('docs/CONSULTANTS.md'), 'docs/CONSULTANTS.md');
  assert.ok(consultantFiles.length >= 2);
  for (const file of consultantFiles) assert.equal(sharedBlock(read(file), file), reference, file);
});

function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text.replaceAll('\r\n', '\n'));
  assert.ok(match, 'frontmatter missing');
  return Object.fromEntries(match[1].split('\n').map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()]));
}
const list = (v) => (v ?? '').split(',').map((s) => s.trim()).filter((s) => s.length > 0);

test('consultants are read-only: no shell, no writers, no network, no subagents', () => {
  const forbidden = ['Bash', 'PowerShell', 'Agent', 'Skill', 'Write', 'Edit', 'NotebookEdit', 'WebFetch', 'WebSearch'];
  for (const file of consultantFiles) {
    const fm = frontmatter(read(file));
    assert.deepEqual(list(fm.tools).sort(), ['Glob', 'Grep', 'Read'], file);
    for (const tool of forbidden) assert.ok(list(fm.disallowedTools).includes(tool), `${file}: ${tool} not disallowed`);
    assert.match(fm.description, /Do not delegate on your own initiative/, file);
  }
});

test('docs/CONSULTANTS.md lists every consultant agent', () => {
  const doc = read('docs/CONSULTANTS.md');
  for (const file of consultantFiles.filter((f) => f.startsWith('.claude/'))) {
    assert.ok(doc.includes(file.replace('.claude/agents/', '')), `${file} missing from docs/CONSULTANTS.md`);
  }
});

test('settings.json is exactly the commented settings.jsonc without comments', () => {
  assert.deepEqual(JSON.parse(read('.claude/settings.json')), settingsFromJsonc(read('.claude/settings.jsonc')));
});

test('settings.json wires the guard hook and denies edits to the guardrails', () => {
  const settings = JSON.parse(read('.claude/settings.json'));
  const command = settings.hooks.PreToolUse.flatMap((h) => h.hooks).map((h) => h.command).join('\n');
  assert.match(command, /\.claude\/hooks\/guard\.mjs/);
  assert.ok(existsSync(resolve(ROOT, '.claude/hooks/guard.mjs')));
  for (const rule of [
    'Edit(./.claude/settings.json)', 'Edit(./.claude/hooks/**)', 'Edit(./.claude/commands/**)',
    'Edit(./.claude/agents/**)', 'Edit(./.git/**)', 'Read(./.env)',
  ]) {
    assert.ok(settings.permissions.deny.includes(rule), rule);
  }
  assert.ok(!settings.permissions.deny.includes('Read(./.env.*)'), 'a generic .env.* rule would also deny .env.example');
  for (const pattern of [/git push/, /npm run/, /npm install/]) {
    assert.ok(!settings.permissions.allow.some((r) => pattern.test(r)), `${pattern} belongs in ask`);
  }
});

test('every Bash rule in allow and ask has its PowerShell twin in the same list', () => {
  const settings = JSON.parse(read('.claude/settings.json'));
  for (const name of ['allow', 'ask']) {
    const rules = settings.permissions[name];
    for (const rule of rules.filter((r) => r.startsWith('Bash('))) {
      assert.ok(rules.includes(rule.replace(/^Bash/, 'PowerShell')), `${name}: ${rule} has no PowerShell twin`);
    }
  }
});

test('every protected path is git-ignored and denied, as the hook header asks', () => {
  const hook = read('.claude/hooks/guard.mjs');
  const deny = JSON.parse(read('.claude/settings.json')).permissions.deny;
  const gitignore = read('.gitignore').split('\n');
  const folders = [...hook.matchAll(/\(\^\|\\\/\)([a-z0-9_\\/-]+?)\(\\\/\|\$\)/gi)]
    .map((m) => m[1].replaceAll('\\/', '/'))
    .filter((f) => !f.startsWith('\\.'));
  assert.ok(folders.includes('data/private'), `could not read PROTECTED from the hook: ${folders}`);
  for (const folder of folders) {
    assert.ok(gitignore.includes(`${folder}/`), `${folder}/ missing from .gitignore`);
    assert.ok(deny.includes(`Read(./${folder}/**)`) && deny.includes(`Edit(./${folder}/**)`), `${folder} missing from deny`);
  }
  for (const secret of ['.env', '.env.*', '*.env', '.envrc']) assert.ok(gitignore.includes(secret), secret);
});

test('ADRs are numbered in sequence and have the four sections', () => {
  const files = readdirSync(resolve(ROOT, 'docs/adr')).filter((f) => f.endsWith('.md')).sort();
  files.forEach((file, i) => {
    assert.match(file, new RegExp(`^${String(i).padStart(4, '0')}-[a-z0-9-]+\\.md$`), file);
    const text = read(`docs/adr/${file}`);
    for (const section of ['## Context', '## Decision', '## Alternatives', '## Consequences']) {
      assert.ok(text.includes(section), `${file}: missing ${section}`);
    }
  });
});

test('skills have a name and a description that says when to use them', () => {
  const dirs = [
    ...readdirSync(resolve(ROOT, '.claude/skills')).map((d) => `.claude/skills/${d}`),
    'templates/skill',
  ];
  for (const dir of dirs) {
    const fm = frontmatter(read(`${dir}/SKILL.md`));
    assert.ok(fm.name && fm.name.length > 0, `${dir}: name missing`);
    assert.match(fm.description, /Use (it|this skill) (when|before)/i, `${dir}: the description must say when to use it`);
  }
});

test('the guides never ask a beginner to weaken an operating system safety setting', () => {
  const docs = ['docs', 'docs/es'].flatMap((d) => readdirSync(resolve(ROOT, d)).filter((f) => f.endsWith('.md')).map((f) => `${d}/${f}`));
  for (const file of [...docs, 'README.md']) assert.doesNotMatch(read(file), /Set-ExecutionPolicy/i, file);
});
