# todo-cli: your first project

A to-do list in one file, with tests. It can `add` and `list`. Your first step with Claude Code teaches it to
mark a task as done.

```bash
node examples/todo-cli/todo.mjs add "Water the plants"
node examples/todo-cli/todo.mjs list
```

## Your first step: paste this into Claude Code

```text
Step 1: add a "done <number>" command to examples/todo-cli/todo.mjs that marks that task as finished.
- Write the test first in examples/todo-cli/todo.test.mjs and show me that it fails.
- Then make it pass. A number that does not exist must give a clear error, not a crash.
- Run npm test. Only these two files may change.
- Close the step as CLAUDE.md §3 says, and stop. Do not start anything else.
```

Then follow [Your first session](../../docs/first-session.md) from step 8.
