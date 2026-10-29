import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { add, format } from './todo.mjs';

test('add puts a new, unfinished task at the end', () => {
  assert.deepEqual(add([], '  Buy milk '), [{ text: 'Buy milk', done: false }]);
});

test('add refuses an empty task', () => {
  assert.throws(() => add([], '   '), /needs some text/);
});

test('format numbers the tasks and marks the finished ones', () => {
  assert.equal(format([]), 'Nothing to do. Enjoy it.');
  assert.equal(format([{ text: 'a', done: false }, { text: 'b', done: true }]), '1. [ ] a\n2. [x] b');
});
