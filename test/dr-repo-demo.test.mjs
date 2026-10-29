// The animated terminal at the top of the README is a real run of Dr. Repo, light, and without JavaScript.

import { strict as assert } from 'node:assert';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildDemoSvg, realRun } from '../scripts/dr-repo-demo.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const SVG = join(ROOT, 'docs', 'assets', 'dr-repo-demo.svg');

test('docs/assets/dr-repo-demo.svg is what the script builds today from Dr. Repo (run: node scripts/dr-repo-demo.mjs --write)', () => {
  const run = realRun();
  assert.match(run, /Score: 7\/10/);
  assert.equal(readFileSync(SVG, 'utf8'), buildDemoSvg(run));
});

test('it is light, has no script and loads nothing', () => {
  const svg = readFileSync(SVG, 'utf8');
  assert.ok(statSync(SVG).size < 300 * 1024, `${statSync(SVG).size} bytes`);
  assert.doesNotMatch(svg, /<script|\son[a-z]+=|href=|@import|url\(/i);
  assert.match(svg, /<title id="t">[^<]+<\/title>/);
  assert.match(svg, /prefers-reduced-motion/);
});

test('the README opens with it, with a descriptive alternative text', () => {
  const first = readFileSync(join(ROOT, 'README.md'), 'utf8').split('\n')[0];
  assert.match(first, /^!\[A terminal runs "npm run dr-repo[^\]]{120,}\]\(docs\/assets\/dr-repo-demo\.svg\)$/);
});
