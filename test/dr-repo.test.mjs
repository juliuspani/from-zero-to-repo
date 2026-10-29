import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { CHECKS, isEnvFile } from '../dr-repo.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const DR_REPO = join(ROOT, 'dr-repo.mjs');
const temps = [];
after(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })));

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'dr-repo-'));
  temps.push(dir);
  return dir;
}

/** A clean git environment: no system or user config leaks in from the machine running the tests. */
function gitEnv(email) {
  const dir = tempDir();
  const global = join(dir, 'gitconfig');
  writeFileSync(global, email ? `[user]\n\tname = Test\n\temail = ${email}\n` : '');
  return { ...process.env, GIT_CONFIG_GLOBAL: global, GIT_CONFIG_NOSYSTEM: '1' };
}

function runDrRepo(path, env, ...flags) {
  return spawnSync(process.execPath, [DR_REPO, path, ...flags], { encoding: 'utf8', env });
}

const sh = (cwd, env, ...args) => execFileSync('git', args, { cwd, env, stdio: 'ignore' });

/** A project with every fault Dr. Repo knows, planted on purpose. */
function sickProject(env) {
  const dir = tempDir();
  sh(dir, env, 'init', '-q');
  writeFileSync(join(dir, '.env'), 'API_KEY=not-a-real-key\n');
  // Built at run time so that no scanner (nor Dr. Repo on this repository) sees a key in this file.
  writeFileSync(join(dir, 'config.js'), `const aws = '${'AKIA'}${'ABCDEFGHIJKLMNOP'}';\n`);
  mkdirSync(join(dir, '.claude'));
  writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({
    permissions: { allow: ['Bash(*)', 'Bash(git push *)', 'Bash(curl *)'], deny: [] },
  }));
  sh(dir, env, 'add', '-A');
  sh(dir, env, 'commit', '-q', '-m', 'sick');
  return dir;
}

function snapshot(dir) {
  const out = {};
  const walk = (rel) => {
    for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(r);
      else {
        const full = join(dir, r);
        out[r] = `${statSync(full).mtimeMs}:${createHash('sha256').update(readFileSync(full)).digest('hex')}`;
      }
    }
  };
  walk('');
  return out;
}

test('this repository gets the maximum score', () => {
  const r = runDrRepo(ROOT, gitEnv('1+someone@users.noreply.github.com'));
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, new RegExp(`Score: ${CHECKS.length}/${CHECKS.length}`));
  assert.match(r.stdout, /Dr. Repo's diagnosis/);
  assert.match(r.stdout, /Clean bill of health/);
});

test('a project with planted faults fails every check', () => {
  const env = gitEnv('someone@example.com');
  const r = runDrRepo(sickProject(env), env, '--prompt');
  assert.equal(r.status, 1);
  assert.match(r.stdout, new RegExp(`Score: 0/${CHECKS.length}`), r.stdout);
  for (const check of CHECKS) assert.ok(r.stdout.includes(check.title), check.id);
  assert.match(r.stdout, /config\.js:1 \(AWS access key\)/);
  assert.ok(!r.stdout.includes('ABCDEFGHIJKLMNOP'), 'Dr. Repo must never print a secret value');
  assert.match(r.stdout, /paste in Claude Code: "/);
  assert.match(r.stdout, /mistakes-museum\.md#/);
});

test('missing email, settings saved as .txt and a folder that is not a repository are reported', () => {
  const env = gitEnv(null);
  const dir = tempDir();
  mkdirSync(join(dir, '.claude'));
  writeFileSync(join(dir, '.claude', 'settings.json.txt'), '{}');
  const r = runDrRepo(dir, env);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /not a git repository/);
  assert.match(r.stdout, /saved as \.txt/);
  assert.match(r.stdout, /no user\.email/);
});

test('Dr. Repo changes nothing, not even inside .git, and ignores a hostile fsmonitor', () => {
  const env = gitEnv('someone@example.com');
  const dir = sickProject(env);
  sh(dir, env, 'config', 'core.fsmonitor', 'echo pwned > PWNED');
  const before = snapshot(dir);
  runDrRepo(dir, env);
  runDrRepo(dir, env, '--prompt');
  assert.deepEqual(snapshot(dir), before);
});

test('the source has no way to write, delete or reach the network', () => {
  const src = readFileSync(DR_REPO, 'utf8');
  const imports = [...src.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]).sort();
  assert.deepEqual(imports, ['node:child_process', 'node:fs', 'node:path', 'node:url']);
  for (const forbidden of [/writeFile|appendFile|createWriteStream|mkdir|rmSync|rmdir|unlink|rename|copyFile|chmod|truncate|symlink/, /\bfetch\(|node:https?|node:net|node:dgram|node:tls|WebSocket/, /\bspawn\(|\bexec\(|execSync\(|fork\(/]) {
    assert.ok(!forbidden.test(src.replace(/^\s*\/\/.*$/gm, '')), `forbidden API ${forbidden}`);
  }
  const fsImport = /import \{([^}]+)\} from 'node:fs'/.exec(src)[1].split(',').map((s) => s.trim()).sort();
  assert.deepEqual(fsImport, ['existsSync', 'readFileSync', 'readdirSync', 'statSync']);
  const gitCalls = [...src.matchAll(/git\(p\.root, \['([a-z-]+)'/g)].map((m) => m[1]);
  assert.ok(gitCalls.length > 0);
  for (const sub of gitCalls) assert.ok(['rev-parse', 'ls-files', 'check-ignore', 'config'].includes(sub), sub);
  assert.match(src, /'core\.fsmonitor=false'/);
});

test('environment file names', () => {
  for (const f of ['.env', '.env.local', 'a/.env.production', 'prod.env', '.envrc']) assert.ok(isEnvFile(f), f);
  for (const f of ['.env.example', '.env.sample', 'env.ts', 'process.env.js', 'environment.md']) assert.ok(!isEnvFile(f), f);
});

test('every check links to a card that exists in the museum', () => {
  const museum = readFileSync(join(ROOT, 'docs', 'mistakes-museum.md'), 'utf8');
  for (const check of CHECKS) assert.ok(museum.includes(`<a id="${check.museum}"></a>`), `${check.id} → #${check.museum}`);
});
