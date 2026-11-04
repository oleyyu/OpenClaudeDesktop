// W14-code r4 fr4-13b: deleting a saved environment with its sessions deletes the running ones too (3.6556.2 c6aeda0b7 M
// hands every target to the bulk delete; the core stops a running session first), so the host no longer reports
// "N sessions weren’t deleted, so “…” was kept" for a session that was only running. The renderer's delete goes through
// main.cjs thread/delete, which stops the running turn first (session-operations.cjs stopForRemoval).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createEnvironmentDelete, environmentDeleteTargets } from '../src/environment-delete-model.mjs';
const { createSessionOperations } = createRequire(import.meta.url)('../electron/session-operations.cjs');

const format = (message, values = {}) => message.defaultMessage.replace(/\{(\w+)(?:, plural, [^}]*\{[^}]*\}[^}]*\{[^}]*\})?\}/g, (_, key) => String(values[key] ?? ''));

test('an environment whose sessions include a running one: the running session is stopped, then deleted with the rest', async () => {
  const ops = createSessionOperations({ getClient: () => null, getConfig: () => ({ threadIds: [], archivedThreadIds: [] }), save() {}, emit() {} });
  ops.observe({ method: 'turn/started', params: { threadId: 'run', turn: { id: 'live' } } });
  const sessions = [{ id: 'run' }, { id: 'idle' }];
  const sessionMetadata = { run: { environmentId: 'env' }, idle: { environmentId: 'env' } };
  const steps = [], toasts = [], removed = [];
  const host = {
    readTargets: (id) => environmentDeleteTargets(id, { sessions, sessionMetadata, isRunning: (sessionId) => ops.isActive(sessionId) }),
    ask: async (question) => { steps.push(['ask', question.count, question.runningCount]); return 'withSessions'; },
    // main.jsx sessionAction("delete") → rpc thread/delete → main.cjs stopForRemoval, then the core deletes it.
    deleteSession: async (target) => {
      await ops.stopForRemoval(target.id, { interrupt: async (threadId, turnId) => {
        steps.push(['interrupt', threadId, turnId]);
        setImmediate(() => ops.observe({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'interrupted' } } }));
      } });
      steps.push(['delete', target.id]);
      return true;
    },
    removeEnvironment: async (environment, result) => { removed.push([environment.id, result]); },
    environmentExists: () => removed.length === 0,
    format,
    toast: (message, variant) => toasts.push([message, variant]),
  };
  const run = createEnvironmentDelete(host);
  assert.equal(await run({ environment: { id: 'env', name: 'Work' } }), true);
  assert.deepEqual(steps, [['ask', 2, 1], ['interrupt', 'run', 'live'], ['delete', 'run'], ['delete', 'idle']]);
  assert.deepEqual(removed, [['env', { deleteChoice: 'with_sessions', deletedSessionCount: 2 }]]);
  assert.ok(!toasts.some(([message]) => /wasn’t deleted|weren’t deleted/.test(message)), 'no “was kept” report for the running session');
  assert.ok(toasts.some(([message]) => /^Deleted/.test(message)));
});

test('main.jsx: the environment delete runs sessionAction("delete"), which no longer refuses a running session', () => {
  const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(main, /deleteSession: \(target\) => sessionAction\("delete", target, \{\}\),/);
  const deleteCase = main.slice(main.indexOf('      case "delete": {'), main.indexOf('      case "fork": {'));
  assert.doesNotMatch(deleteCase, /state\.active\[target\.id\]/);
  assert.match(deleteCase, /if \(actionLock\.current\.has\(target\.id\)\) throw new Error\(t\("A session action is already starting\."\)\);/);
  const official = readFileSync(new URL('../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c6aeda0b7-BY70ugai.js', import.meta.url), 'utf8');
  assert.ok(official.includes('t.beginBulkDelete('), 'c6aeda0b7 M deletes every target through the bulk delete');
});
