// What a visitor reads is true, uses one name per thing, and explains its words.

import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const DOCS = ['README.md', ...['docs', 'docs/es'].flatMap((d) => readdirSync(join(ROOT, d)).filter((f) => f.endsWith('.md')).map((f) => `${d}/${f}`))];

test('no promise the repository cannot keep', () => {
  const absolute = [
    /cannot break/i, /it cannot change/i, /never leaves work uncommitted/i, /blocks destructive commands/i,
    /block every write/i, /covers every other/i, /no puede romper/i, /nunca deja trabajo/i,
  ];
  for (const file of DOCS) for (const re of absolute) assert.doesNotMatch(read(file), re, `${file}: ${re}`);
});

test('the README links the guard to its documented limits', () => {
  assert.match(read('README.md'), /\]\(docs\/level-2\.md#limits\)/);
  assert.match(read('docs/level-2.md'), /<a id="limits"><\/a>/);
});

test('the README explains each word of jargon the first time, through the Start here glossary', () => {
  const readme = read('README.md');
  for (const word of ['context', 'noreply-email', 'hook', 'guardrails', 'secret']) {
    assert.match(readme, new RegExp(`\\]\\(docs/start-here\\.md#word-${word}\\)`), word);
    for (const lang of ['docs/start-here.md', 'docs/es/start-here.md']) assert.match(read(lang), new RegExp(`<a id="word-${word}"></a>`), `${lang}: ${word}`);
  }
  assert.doesNotMatch(readme, /twelve words/i);
});

test('the Start here count matches its table, in both languages', () => {
  for (const [file, word] of [['docs/start-here.md', 'Fifteen'], ['docs/es/start-here.md', 'Quince']]) {
    const text = read(file);
    const rows = text.split('\n').filter((l) => /^\| .*\*\*.+\*\*.* \|/.test(l)).length;
    assert.equal(rows, 15, file);
    assert.match(text, new RegExp(`^${word} `, 'm'), file);
  }
});

test('Level 2 has one name everywhere it is linked', () => {
  for (const file of ['README.md', 'docs/cheatsheet.md', 'docs/es/cheatsheet.md', 'docs/prompt-patterns.md']) {
    const names = [...read(file).matchAll(/\[([^\]]+)\]\((?:\.\.\/|docs\/)?level-2\.md(?:#read-only-consultants)?\)/g)].map((m) => m[1]);
    assert.ok(names.length > 0, file);
    for (const name of names) assert.equal(name, 'Level 2 — Training Wheels', `${file}: "${name}"`);
  }
  assert.match(read('docs/level-2.md'), /^# Level 2 — Training Wheels$/m);
});

test('the first step pasted in Level 1 is exactly the example one', () => {
  const block = (text) => /```text\n(Step 1:[\s\S]*?)```/.exec(text)?.[1];
  assert.ok(block(read('examples/todo-cli/README.md')));
  assert.equal(block(read('docs/first-session.md')), block(read('examples/todo-cli/README.md')));
  assert.match(read('docs/es/first-session.md'), /```text\nPaso 1: añade un comando "done <número>"/);
});

test('the Windows PATH fix only adds the folder when it is missing, in both languages', () => {
  for (const file of ['docs/first-session.md', 'docs/es/first-session.md']) {
    const text = read(file);
    assert.match(text, /-notcontains \$bin\) \{\n {2}\[Environment\]::SetEnvironmentVariable\("Path", "\$userPath;\$bin"\.Trim\(";"\), "User"\)\n\}/, file);
    assert.doesNotMatch(text, /GetEnvironmentVariable\("Path","User"\) \+/, `${file}: the old one appends every time`);
  }
});
