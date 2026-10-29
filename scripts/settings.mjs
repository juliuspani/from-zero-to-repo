// Writes .claude/settings.json from the commented .claude/settings.jsonc.
// Run it by hand after editing the commented copy: `npm run settings`. The guard hook stops Claude from
// running it, on purpose (the guardrails are edited by a human).

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Removes // and /* *\/ comments outside strings. Trailing commas are not supported (none are used). */
export function stripJsonComments(text) {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inString) {
      out += c;
      if (c === '\\') out += text[++i] ?? '';
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else if (c === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++;
    } else {
      out += c;
    }
  }
  return out;
}

export function settingsFromJsonc(jsoncText) {
  return JSON.parse(stripJsonComments(jsoncText));
}

if (process.argv[1] !== undefined && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const root = resolve(fileURLToPath(import.meta.url), '..', '..');
  const settings = settingsFromJsonc(readFileSync(resolve(root, '.claude/settings.jsonc'), 'utf8'));
  writeFileSync(resolve(root, '.claude/settings.json'), `${JSON.stringify(settings, null, 2)}\n`);
  process.stdout.write('.claude/settings.json written from .claude/settings.jsonc\n');
}
