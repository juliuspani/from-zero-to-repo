#!/usr/bin/env node
// Builds docs/assets/dr-repo-demo.svg, the animated terminal at the top of the README, from a real run of Dr. Repo.
//
//   node scripts/dr-repo-demo.mjs            prints the SVG
//   node scripts/dr-repo-demo.mjs --write    writes docs/assets/dr-repo-demo.svg
//
// It creates a throwaway project with three planted faults (a committed .env, an AWS key in config.js and a bare
// Bash(*) permission) in the temp folder, runs `node dr-repo.mjs` on it (what `npm run dr-repo -- <path>` runs) with a
// clean git configuration, and draws its exact stdout, wrapped at 92 columns like a narrow terminal. No JavaScript in
// the SVG: CSS animations only, and a still image when the reader prefers reduced motion. test/dr-repo-demo.test.mjs
// checks that the committed SVG is what this script builds today.

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const OUT = join(ROOT, 'docs', 'assets', 'dr-repo-demo.svg');
const COMMAND = 'npm run dr-repo -- ../my-old-project';
const COLUMNS = 92;
const FONT = 13;
const CHAR = 7.83; // advance of a 13 px monospace character
const LINE = 18;
const PAD = 20;
const TOP = 44; // below the title bar
const STEP = 0.11; // seconds between output lines
const CYCLE = 16; // seconds before the animation starts again

/** A project with three planted faults; everything else is set up the way this template does it. */
function plantedProject(dir, env) {
  const git = (...args) => execFileSync('git', args, { cwd: dir, env, stdio: 'ignore' });
  git('init', '-q');
  writeFileSync(join(dir, 'CLAUDE.md'), '# My old project\n');
  writeFileSync(join(dir, 'PROGRESS.md'), '# PROGRESS\n');
  copyFileSync(join(ROOT, '.gitignore'), join(dir, '.gitignore'));
  mkdirSync(join(dir, '.claude', 'hooks'), { recursive: true });
  copyFileSync(join(ROOT, '.claude', 'hooks', 'guard.mjs'), join(dir, '.claude', 'hooks', 'guard.mjs'));
  const settings = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8'));
  settings.permissions.allow = ['Bash(*)', ...settings.permissions.allow];
  writeFileSync(join(dir, '.claude', 'settings.json'), `${JSON.stringify(settings, null, 2)}\n`);
  writeFileSync(join(dir, '.env'), 'API_KEY=not-a-real-key\n');
  // Built at run time so that no scanner (nor Dr. Repo on this repository) sees a key in this file.
  writeFileSync(join(dir, 'config.js'), `export const aws = '${'AKIA'}${'ABCDEFGHIJKLMNOP'}';\n`);
  git('add', '-A');
  git('add', '-f', '.env');
  git('commit', '-q', '-m', 'old project');
}

/** The real stdout of Dr. Repo on the planted project. */
export function realRun() {
  const base = mkdtempSync(join(tmpdir(), 'dr-repo-demo-'));
  try {
    const dir = join(base, 'my-old-project');
    mkdirSync(dir);
    const gitconfig = join(base, 'gitconfig');
    writeFileSync(gitconfig, '[user]\n\tname = Demo\n\temail = 12345+demo@users.noreply.github.com\n[init]\n\tdefaultBranch = main\n');
    const env = { ...process.env, GIT_CONFIG_GLOBAL: gitconfig, GIT_CONFIG_NOSYSTEM: '1' };
    plantedProject(dir, env);
    // The demo machine has Claude Code installed: an empty `claude` in a PATH folder stands for it, so the output is
    // the same on every machine (Dr. Repo's claude-on-path note only looks at file names, it never runs them).
    const bin = join(base, 'bin');
    mkdirSync(bin);
    for (const name of ['claude', 'claude.exe']) writeFileSync(join(bin, name), '');
    const key = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
    env[key] = `${bin}${delimiter}${env[key] ?? ''}`;
    try {
      return execFileSync(process.execPath, [join(ROOT, 'dr-repo.mjs'), dir], { env, encoding: 'utf8' });
    } catch (e) {
      if (e.status === 1 && typeof e.stdout === 'string') return e.stdout; // exit 1 means "some checks need a fix"
      throw e;
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

/** Long lines wrapped at COLUMNS, continuing under their own indentation. */
function wrap(line) {
  if (line.length <= COLUMNS) return [line];
  const indent = ' '.repeat(Math.min(line.length - line.trimStart().length + 2, 14));
  const out = [];
  let rest = line;
  while (rest.length > COLUMNS) {
    let cut = rest.lastIndexOf(' ', COLUMNS);
    if (cut < COLUMNS / 2) cut = COLUMNS; // a long URL: cut it at the edge, like a terminal
    out.push(rest.slice(0, cut));
    rest = indent + rest.slice(cut).trimStart();
  }
  out.push(rest);
  return out;
}

const xml = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function kind(line) {
  if (/^ {2}ok /.test(line)) return 'ok';
  if (/^ {2}FIX /.test(line)) return 'fix';
  if (/^ {8}how: /.test(line)) return 'how';
  if (/^ {8}why: /.test(line)) return 'why';
  if (/^Score: /.test(line)) return 'score';
  if (/^Dr\. Repo's diagnosis/.test(line)) return 'head';
  if (/^Prescription: /.test(line)) return 'rx';
  return 'detail';
}

/** Colour the leading marker of a line; the rest keeps the line's class colour. */
function spans(line, k) {
  const m = /^( {2})(ok|FIX)( .*)$/.exec(line);
  if (m) return `${xml(m[1])}<tspan class="${k}m">${m[2]}</tspan>${xml(m[3])}`;
  const w = /^( {8})(how:|why:)( .*)$/.exec(line);
  if (w) return `${xml(w[1])}<tspan class="lbl">${w[2]}</tspan>${xml(w[3])}`;
  return xml(line);
}

export function buildDemoSvg(stdout = realRun()) {
  const lines = stdout.replace(/\n+$/, '').split('\n').flatMap((l) => wrap(l).map((part) => ({ text: part, k: kind(l) })));
  const width = Math.ceil(2 * PAD + COLUMNS * CHAR);
  const height = TOP + PAD + (lines.length + 1) * LINE + 8;
  const typed = COMMAND.length;
  const typeEnd = 0.5 + typed * 0.035;
  // One keyframe per line on the same cycle: each line appears in turn, and they all go out together before the
  // command is typed again (with animation-delay they would go out one by one, after the command had gone).
  const pct = (s) => ((s / CYCLE) * 100).toFixed(2);
  const keyframes = lines.map((_, i) => {
    const at = typeEnd + 0.35 + i * STEP;
    return `@keyframes a${i}{0%,${pct(at)}%{opacity:0}${pct(at + 0.05)}%,94%{opacity:1}96%,100%{opacity:0}}`;
  });
  const rows = lines.map((l, i) => {
    const y = TOP + PAD + (i + 1) * LINE;
    return `<text class="l ${l.k}" y="${y}" style="animation-name:a${i}">${spans(l.text, l.k)}</text>`;
  });
  const title = 'Dr. Repo checking a project with three planted faults';
  const desc = `A terminal runs "${COMMAND}". Dr. Repo prints its diagnosis line by line: ` +
    lines.filter((l) => l.k === 'ok' || l.k === 'fix').map((l) => l.text.trim()).join('; ') +
    `. Then "${lines.find((l) => l.k === 'score')?.text ?? ''}" and the suggestion to run again with --prompt.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="t d">
<title id="t">${xml(title)}</title>
<desc id="d">${xml(desc)}</desc>
<style>
text{font:${FONT}px ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;fill:#c9d1d9;white-space:pre}
.bar{font-size:12px;fill:#8b949e}.cmd{fill:#e6edf3}.ps{fill:#3fb950}
.okm{fill:#3fb950;font-weight:700}.fixm{fill:#f0883e;font-weight:700}.lbl{fill:#8b949e}
.ok{fill:#adbac7}.fix{fill:#e6edf3}.detail{fill:#f0b072}.how{fill:#c9d1d9}.why{fill:#58a6ff}
.head{fill:#e6edf3;font-weight:700}.score{fill:#ffffff;font-weight:700}.rx{fill:#56d4dd}
.l{opacity:0;animation-duration:${CYCLE}s;animation-iteration-count:infinite}
.cover{animation:type ${CYCLE}s steps(${typed}) infinite}
@keyframes type{0%,${pct(0.5)}%{transform:translateX(0)}${pct(typeEnd)}%,100%{transform:translateX(${(typed * CHAR).toFixed(1)}px)}}
${keyframes.join('\n')}
@media (prefers-reduced-motion:reduce){.l,.cover{animation:none}.l{opacity:1}.cover{display:none}}
</style>
<rect width="${width}" height="${height}" rx="10" fill="#0d1117"/>
<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="none" stroke="#30363d"/>
<circle cx="20" cy="18" r="6" fill="#ff5f56"/><circle cx="40" cy="18" r="6" fill="#ffbd2e"/><circle cx="60" cy="18" r="6" fill="#27c93f"/>
<text class="bar" x="${width / 2}" y="22" text-anchor="middle">my-old-project — npm run dr-repo</text>
<line x1="0" y1="34" x2="${width}" y2="34" stroke="#30363d"/>
<g transform="translate(${PAD} 0)">
<text y="${TOP + PAD}"><tspan class="ps">$ </tspan><tspan class="cmd">${xml(COMMAND)}</tspan></text>
<rect class="cover" x="${(2 * CHAR - 1.5).toFixed(1)}" y="${TOP + PAD - FONT}" width="${(typed * CHAR + 12).toFixed(1)}" height="${LINE}" fill="#0d1117"/>
${rows.join('\n')}
</g>
</svg>
`;
}

if (process.argv[1] !== undefined && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const svg = buildDemoSvg();
  if (process.argv.includes('--write')) {
    writeFileSync(OUT, svg);
    process.stdout.write(`dr-repo-demo: ${OUT} (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)\n`);
  } else process.stdout.write(svg);
}
