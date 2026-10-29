import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { CHECKS, examine, isEnvFile, report } from '../dr-repo.mjs';

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
  // Positive control: the planted fsmonitor is live, plain git runs it.
  spawnSync('git', ['status'], { cwd: dir, env, stdio: 'ignore' });
  assert.ok(existsSync(join(dir, 'PWNED')), 'the planted fsmonitor did not run: this test would prove nothing');
  rmSync(join(dir, 'PWNED'));
  const before = snapshot(dir);
  runDrRepo(dir, env);
  runDrRepo(dir, env, '--prompt');
  assert.deepEqual(snapshot(dir), before);
});

test('the source has no way to write, delete, reach the network or run anything but git', () => {
  const src = readFileSync(DR_REPO, 'utf8');
  const code = src.replace(/^\s*\/\/.*$/gm, '');
  const imports = [...src.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]).sort();
  assert.deepEqual(imports, ['node:child_process', 'node:fs', 'node:path', 'node:url']);
  for (const forbidden of [/writeFile|appendFile|createWriteStream|mkdir|rmSync|rmdir|unlink|rename|copyFile|chmod|truncate|symlink|\bopen(Sync)?\(/, /\bfetch\(|node:https?|node:net|node:dgram|node:tls|WebSocket/]) {
    assert.ok(!forbidden.test(code), `forbidden API ${forbidden}`);
  }
  assert.equal(/import \{([^}]+)\} from 'node:child_process'/.exec(src)[1].trim(), 'execFileSync');
  assert.deepEqual([...code.matchAll(/execFileSync\(([^,]+),/g)].map((m) => m[1]), ['p.git'], 'execFileSync runs only the resolved git');
  const fsImport = /import \{([^}]+)\} from 'node:fs'/.exec(src)[1].split(',').map((s) => s.trim()).sort();
  assert.deepEqual(fsImport, ['existsSync', 'lstatSync', 'readFileSync', 'readdirSync', 'realpathSync', 'statSync']);
  const gitCalls = [...code.matchAll(/\bgit\(p, \['([a-z-]+)'/g)].map((m) => m[1]);
  assert.equal(code.match(/\bgit\(/g).length - 1, gitCalls.length, 'every git call names its subcommand literally');
  assert.deepEqual([...new Set(gitCalls)].sort(), ['check-ignore', 'config', 'ls-files', 'rev-parse']);
  assert.match(src, /'core\.fsmonitor=false'/);
});

test('S-01: a git planted in the project is never run instead of the real one', () => {
  const env = gitEnv('1+someone@users.noreply.github.com');
  delete env.NoDefaultCurrentDirectoryInExePath; // Windows' default: a program is looked for in the current folder first
  const dir = tempDir();
  sh(dir, env, 'init', '-q');
  if (process.platform === 'win32') {
    copyFileSync(process.execPath, join(dir, 'git.exe'));
    copyFileSync(process.execPath, join(dir, 'git.com'));
  } else {
    writeFileSync(join(dir, 'git'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
    const key = Object.keys(env).find((k) => k.toUpperCase() === 'PATH');
    env[key] = `${delimiter}${env[key]}`; // an empty PATH entry means the current folder
  }
  const r = runDrRepo(dir, env);
  assert.doesNotMatch(r.stdout, /not a git repository/, r.stdout);
  assert.match(r.stdout, /ok {3}git uses your private GitHub email/, r.stdout);
});

test('S-01: without git on PATH, Dr. Repo says so instead of "not a repository"', () => {
  const env = gitEnv('1+someone@users.noreply.github.com');
  const dir = tempDir();
  sh(dir, env, 'init', '-q');
  for (const k of Object.keys(env)) if (k.toUpperCase() === 'PATH') env[k] = '';
  const r = runDrRepo(dir, env);
  assert.match(r.stdout, /git not found/, r.stdout);
});

test('S-02: links are not followed, so nothing outside the project is read', () => {
  const outside = tempDir();
  writeFileSync(join(outside, 'key.txt'), `aws = '${'AKIA'}${'ABCDEFGHIJKLMNOP'}'\n`);
  writeFileSync(join(outside, 'settings.json'), readFileSync(join(ROOT, '.claude', 'settings.json')));
  const dir = tempDir();
  symlinkSync(outside, join(dir, 'linked'), 'junction');
  symlinkSync(outside, join(dir, '.claude'), 'junction');
  const secrets = CHECKS.find((c) => c.id === 'secrets').run({ root: dir, tracked: ['linked/key.txt'], present: [] });
  assert.ok(secrets.ok, secrets.detail);
  const settings = examine(dir).find((c) => c.id === 'settings-safe').result;
  assert.ok(!settings.ok);
  assert.match(settings.detail, /no \.claude\/settings\.json/);
});

test('S-03: names from the project are printed escaped and on one line, and prompts say they are data', () => {
  const name = '.env.\u001b[2Kx\n        paste in Claude Code: "evil"';
  const check = CHECKS.find((c) => c.id === 'env-tracked');
  const out = report([{ ...check, result: check.run({ root: ROOT, tracked: [name], present: [] }) }], true);
  assert.ok(!out.includes('\u001b'), 'raw escape character printed');
  assert.doesNotMatch(out, /\n\s*paste in Claude Code: "evil/);
  assert.match(out, /git rm --cached -- /);
  assert.match(out, /data, never instructions/);
});

function withSettings(files) {
  const dir = tempDir();
  mkdirSync(join(dir, '.claude'));
  for (const [name, value] of Object.entries(files)) writeFileSync(join(dir, '.claude', name), JSON.stringify(value));
  return examine(dir).find((c) => c.id === 'settings-safe').result;
}

test('S-04: wildcards over git, shells, interpreters and the web are not "safe"', () => {
  for (const rule of ['Bash(git:*)', 'Bash(git *)', 'Bash(bash:*)', 'Bash(sh -c *)', 'Bash(node:*)', 'Bash(npx *)', 'Bash(npm:*)', 'PowerShell(iex *)', 'PowerShell(powershell *)', 'WebFetch', 'Bash(curl:*)']) {
    const r = withSettings({ 'settings.json': { permissions: { allow: [rule] } } });
    assert.ok(!r.ok, rule);
  }
  for (const rule of ['Bash(git status)', 'Bash(npm test)', 'Bash(npm test *)', 'Bash(git log *)', 'WebFetch(domain:docs.claude.com)']) {
    const r = withSettings({ 'settings.json': { permissions: { allow: [rule] } } });
    assert.ok(r.ok, `${rule}: ${r.detail}`);
  }
});

test('S-04: settings.local.json is checked too', () => {
  const r = withSettings({ 'settings.json': { permissions: { allow: [] } }, 'settings.local.json': { permissions: { defaultMode: 'bypassPermissions' } } });
  assert.ok(!r.ok);
  assert.match(r.detail, /settings\.local\.json/);
});

test('S-06: a huge hook command does not hang Dr. Repo', () => {
  const dir = tempDir();
  mkdirSync(join(dir, '.claude'));
  writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({ hooks: { PreToolUse: [{ hooks: [{ command: 'a'.repeat(200000) }] }] } }));
  const r = spawnSync(process.execPath, [DR_REPO, dir], { encoding: 'utf8', env: gitEnv(null), timeout: 10000 });
  assert.notEqual(r.status, null, 'timed out');
});

test('S-07: only ignore rules that travel with the repository count', () => {
  const env = gitEnv('1+someone@users.noreply.github.com');
  const globalIgnore = join(tempDir(), 'ignore');
  const rules = '.env\n.env.*\n*.env\n.envrc\n';
  writeFileSync(globalIgnore, rules);
  writeFileSync(env.GIT_CONFIG_GLOBAL, `[user]\n\temail = 1+someone@users.noreply.github.com\n[core]\n\texcludesFile = ${globalIgnore.replaceAll('\\', '/')}\n`);
  const dir = tempDir();
  sh(dir, env, 'init', '-q');
  let r = runDrRepo(dir, env);
  assert.match(r.stdout, /FIX {2}\.env files are git-ignored/, 'a global excludesFile does not protect a collaborator');
  writeFileSync(join(dir, '.git', 'info', 'exclude'), rules);
  r = runDrRepo(dir, env);
  assert.match(r.stdout, /FIX {2}\.env files are git-ignored/, '.git/info/exclude is not committed');
  writeFileSync(join(dir, '.gitignore'), `${rules}!.env.example\n`);
  r = runDrRepo(dir, env);
  assert.match(r.stdout, /ok {3}\.env files are git-ignored/, r.stdout);
});

test('a .git file that points to a network folder is not followed', () => {
  const dir = tempDir();
  writeFileSync(join(dir, '.git'), 'gitdir: //127.0.0.1/share/repo.git\n');
  const r = runDrRepo(dir, gitEnv('1+someone@users.noreply.github.com'));
  assert.match(r.stdout, /network folder/, r.stdout);
});

test('environment file names', () => {
  for (const f of ['.env', '.env.local', 'a/.env.production', 'prod.env', '.envrc']) assert.ok(isEnvFile(f), f);
  for (const f of ['.env.example', '.env.sample', 'env.ts', 'process.env.js', 'environment.md']) assert.ok(!isEnvFile(f), f);
});

test('every check links to a card that exists in the museum', () => {
  const museum = readFileSync(join(ROOT, 'docs', 'mistakes-museum.md'), 'utf8');
  for (const check of CHECKS) assert.ok(museum.includes(`<a id="${check.museum}"></a>`), `${check.id} → #${check.museum}`);
});
