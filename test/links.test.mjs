// Every relative link in every Markdown file, in both languages, points at something that exists.

import { strict as assert } from 'node:assert';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const SKIP = new Set(['.git', 'node_modules']);

function markdownFiles(dir = '') {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    if (SKIP.has(e.name)) return [];
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) return markdownFiles(rel);
    return e.name.endsWith('.md') ? [rel] : [];
  });
}

/** Markdown without fenced code blocks and inline code, where a link is only an example. */
const prose = (text) => text.replace(/^```[\s\S]*?^```/gm, '').replace(/`[^`\n]*`/g, '');

/** GitHub's heading anchor: lower case, punctuation dropped, spaces to hyphens. */
const slug = (heading) => heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');

function anchors(file) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  const ids = [...text.matchAll(/<a id="([^"]+)"><\/a>/g)].map((m) => m[1]);
  const headings = [...prose(text).matchAll(/^#{1,6} (.+)$/gm)].map((m) => slug(m[1].replaceAll('`', '')));
  return new Set([...ids, ...headings]);
}

function links(file) {
  const text = prose(readFileSync(join(ROOT, file), 'utf8'));
  const markdown = [...text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]);
  const html = [...text.matchAll(/\s(?:src|srcset|href)="([^"]+)"/g)].map((m) => m[1]); // <img>, <picture> and <a> in the README
  return [...markdown, ...html].filter((l) => !/^(https?|mailto):/.test(l));
}

const FILES = markdownFiles();

test('the link checker sees the docs in both languages', () => {
  for (const f of ['README.md', 'docs/start-here.md', 'docs/es/start-here.md', 'docs/es/mistakes-museum.md']) assert.ok(FILES.includes(f), f);
});

test('every relative link and anchor in every Markdown file resolves', () => {
  const broken = [];
  for (const file of FILES) {
    const depth = file.split('/').length - 1;
    for (const link of links(file)) {
      if (file.startsWith('templates/') && link.includes('NNNN')) continue; // a placeholder, valid once the template is copied
      const [path, anchor] = link.split('#');
      const target = path === '' ? join(ROOT, file) : resolve(ROOT, dirname(file), decodeURIComponent(path));
      const rel = relative(ROOT, target).split(sep).join('/');
      if (rel.startsWith('..')) {
        // GitHub serves files under <repo>/blob/main/, so the repo's own pages are depth + 2 levels up.
        if (path !== `${'../'.repeat(depth + 2)}issues`) broken.push(`${file}: ${link} leaves the repository`);
        continue;
      }
      if (!existsSync(target)) broken.push(`${file}: ${link} (no such file)`);
      else if (anchor !== undefined && !anchors(rel).has(anchor)) broken.push(`${file}: ${link} (no such anchor)`);
    }
  }
  assert.deepEqual(broken, []);
});

test('each Spanish page has its English original, and both link to each other first', () => {
  const spanish = FILES.filter((f) => f.startsWith('docs/es/'));
  assert.ok(spanish.length >= 4, spanish.join(', '));
  for (const es of spanish) {
    const name = es.slice('docs/es/'.length);
    const en = `docs/${name}`;
    assert.ok(FILES.includes(en), `${es} has no English original`);
    assert.equal(readFileSync(join(ROOT, es), 'utf8').split('\n')[0], `[English](../${name}) · **Español**`, es);
    assert.equal(readFileSync(join(ROOT, en), 'utf8').split('\n')[0], `**English** · [Español](es/${name})`, en);
  }
});
