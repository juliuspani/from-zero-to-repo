#!/usr/bin/env node
// A tiny to-do list for your first session. Tasks live in todo.json, next to where you run it.
//
//   node examples/todo-cli/todo.mjs add "Buy milk"
//   node examples/todo-cli/todo.mjs list
//
// Your first step with Claude Code adds a third command, `done <number>` (see README.md here).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function load(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
}

export function add(tasks, text) {
  if (text.trim() === '') throw new Error('a task needs some text');
  return [...tasks, { text: text.trim(), done: false }];
}

export function format(tasks) {
  if (tasks.length === 0) return 'Nothing to do. Enjoy it.';
  return tasks.map((t, i) => `${i + 1}. [${t.done ? 'x' : ' '}] ${t.text}`).join('\n');
}

function main([command, ...rest], file = resolve('todo.json')) {
  const tasks = load(file);
  if (command === 'add') {
    writeFileSync(file, `${JSON.stringify(add(tasks, rest.join(' ')), null, 2)}\n`);
    return 'Added.';
  }
  if (command === 'list' || command === undefined) return format(tasks);
  throw new Error(`unknown command "${command}". Try: add, list`);
}

if (process.argv[1] !== undefined && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  try {
    process.stdout.write(`${main(process.argv.slice(2))}\n`);
  } catch (e) {
    process.stderr.write(`todo: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
