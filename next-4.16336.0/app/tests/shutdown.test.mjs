import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { installShutdownHandler } = require("../electron/shutdown.cjs");

class App extends EventEmitter {
  calls = 0;
  exits = 0;
  quit() {
    this.calls++;
    const event = { prevented: false, preventDefault() { this.prevented = true; } };
    this.emit("before-quit", event);
    if (!event.prevented) this.exits++;
  }
}

test("before-quit waits once and allows the final re-entrant quit only after cleanup", async () => {
  const app = new App();
  let finish, calls = 0;
  const pending = new Promise((resolve) => { finish = resolve; });
  const handler = installShutdownHandler(app, { stop: () => { calls++; return pending; } });
  app.quit(); app.quit(); app.quit();
  assert.equal(handler.state, "waiting");
  assert.equal(app.exits, 0);
  await Promise.resolve();
  assert.equal(calls, 1);
  finish({ exited: true });
  assert.deepEqual(await handler.completion, { timedOut: false, result: { exited: true } });
  assert.equal(handler.state, "complete");
  assert.equal(app.calls, 4);
  assert.equal(app.exits, 1);
});

test("synchronous failure is reported and cannot deadlock quit", async () => {
  const app = new App(), error = new Error("test cleanup failed"), errors = [];
  const handler = installShutdownHandler(app, { stop: () => { throw error; }, onError: (error) => errors.push(error) });
  app.quit();
  assert.deepEqual(await handler.completion, { timedOut: false, error });
  assert.deepEqual(errors, [error]);
  assert.equal(app.exits, 1);
});

test("hard deadline finishes exactly once even if cleanup later resolves", async () => {
  const app = new App(), errors = [];
  let finish;
  const handler = installShutdownHandler(app, {
    timeoutMs: 20,
    stop: () => new Promise((resolve) => { finish = resolve; }),
    onError: (error) => errors.push(error),
  });
  app.quit();
  const result = await handler.completion;
  assert.equal(result.timedOut, true);
  assert.match(result.error.message, /exceeded 20ms/);
  assert.equal(errors.length, 1);
  assert.equal(app.exits, 1);
  finish({ exited: true });
  await Promise.resolve();
  assert.equal(app.exits, 1);
  assert.equal(app.calls, 2);
});

test("a failing reporter cannot prevent deadline completion", async () => {
  const app = new App();
  const handler = installShutdownHandler(app, {
    timeoutMs: 10,
    stop: () => new Promise(() => {}),
    onError: () => { throw new Error("reporter failed"); },
  });
  app.quit();
  assert.equal((await handler.completion).timedOut, true);
  assert.equal(app.exits, 1);
});

test("cleanup rejection after deadline is consumed; disposed handlers do not intercept quit", async () => {
  const app = new App();
  let reject;
  const handler = installShutdownHandler(app, { timeoutMs: 10, stop: () => new Promise((_, fail) => { reject = fail; }) });
  app.quit();
  await handler.completion;
  reject(new Error("late rejection"));
  await Promise.resolve();
  assert.equal(app.exits, 1);
  const clean = new App();
  installShutdownHandler(clean, { stop: () => assert.fail("disposed") }).dispose();
  clean.quit();
  assert.equal(clean.exits, 1);
});
