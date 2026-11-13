// Dynamic workflow reliability: the ways a run was cut short, recorded wrong or left its session waiting.
//   1. a silent (thinking) agent restarted from scratch after 180s        runtime.js stallWindowMs
//   2. a request written while the app-server dies ended the runner       appServerClient.js pipe 'error'
//   3. the runner exited before its result left the IPC pipe              workflow-child.mjs flushed()
//   4. an unwritable run folder threw in the main process, never settled  workflow-service.cjs record / close
//   5. a core that dropped mid-turn kept the notification waiting         workflow-tool-service.cjs observe
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BASE = fs.existsSync('/private/tmp/claude-501') ? '/private/tmp/claude-501' : os.tmpdir();
const SANDBOX = fs.realpathSync(fs.mkdtempSync(path.join(BASE, 'wf-reliability-')));
test.after(() => fs.rmSync(SANDBOX, { recursive: true, force: true }));
const dir = name => fs.mkdtempSync(path.join(SANDBOX, name + '-'));

const R = '../third-party/codex-workflows-runner/src/';
const { stallWindowMs } = await import(R + 'runtime.js');
const { AppServerClient } = await import(R + 'appServerClient.js');
const { createWorkflowService } = require('../electron/workflow-service.cjs');
const { createWorkflowToolService } = require('../electron/workflow-tool-service.cjs');

test('the stall window outlasts a model that thinks in silence; CODE_DESKTOP_WORKFLOW_STALL_MS replaces it', () => {
  assert.equal(stallWindowMs({}), 600_000, 'not Claude Code\'s 180s: an app-server core reports nothing while its model thinks');
  assert.equal(stallWindowMs({ CODE_DESKTOP_WORKFLOW_STALL_MS: '900000' }), 900_000);
  assert.equal(stallWindowMs({ CODE_DESKTOP_WORKFLOW_STALL_MS: '0' }), 0, '0 turns the restart off');
  for (const bad of ['', ' ', 'abc', '-1', '1.5']) assert.equal(stallWindowMs({ CODE_DESKTOP_WORKFLOW_STALL_MS: bad }), 600_000, `"${bad}" is ignored`);
});

test('requests written while the app-server dies are rejected; the runner process survives the broken pipe', async () => {
  const server = path.join(dir('server'), 'dies.mjs');
  fs.writeFileSync(server, `import readline from 'node:readline';
readline.createInterface({ input: process.stdin }).on('line', line => { const m = JSON.parse(line);
  if (m.method === 'initialize') process.stdout.write(JSON.stringify({ id: m.id, result: { userAgent: 'fixture' } }) + '\\n');
  else if (m.method === 'thread/start') process.kill(process.pid, 'SIGKILL'); });\n`);
  const client = new AppServerClient({ command: process.execPath, args: [server] });
  await client.connect();
  const uncaught = [];
  const onUncaught = error => uncaught.push(error);
  process.on('uncaughtException', onUncaught);
  try {
    // As concurrent agents do: the first request kills the server, the rest are written while it dies.
    const fire = () => client.request('thread/start', { padding: 'x'.repeat(200_000) }).then(() => 'answered', error => String(error.message));
    const requests = [];
    for (let i = 0; i < 16; i++) requests.push(fire());
    for (let i = 0; i < 20; i++) { await new Promise(resolve => setImmediate(resolve)); requests.push(fire()); }
    const outcomes = await Promise.all(requests);
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.deepEqual(uncaught.map(error => error.code ?? error.message), [], 'no stream error escapes the client');
    assert.ok(outcomes.every(outcome => outcome !== 'answered'), 'every request settles with an error');
    assert.equal(client.readyState, 'disconnected');
  } finally { process.off('uncaughtException', onUncaught); await client.shutdown(); }
});

test('a run with no core to shut down (a large dry run) still delivers every event and its result before it exits', { timeout: 60_000 }, async () => {
  const root = dir('runs'), cwd = fs.realpathSync(dir('cwd')), script = path.join(cwd, 'big.workflow.js');
  fs.writeFileSync(script, 'export const meta = { name: "big-plan", description: "a large dry run" };\nfor (let i = 0; i < 900; i++) await agent("task " + i, { label: "agent-" + i });\nreturn "r".repeat(60000);\n');
  let done; const finished = new Promise(resolve => { done = resolve; });
  const service = createWorkflowService({ root, getConfig: () => ({ threadIds: ['t1'], cwd }), emit() {}, command: 'unused', version: '0', enabled: () => true, onSettled: done });
  await service.start({ threadId: 't1', file: script, plan: true });
  const run = await finished;
  assert.equal(run.status, 'completed', run.summary);
  assert.equal(run.plannedAgents, 900, 'no event was dropped on the way out');
  assert.equal(fs.readFileSync(path.join(root, run.id, 'result.json'), 'utf8').length > 60000, true);
});

test('a run folder that cannot be written neither throws in the main process nor keeps the run from settling', async () => {
  const root = dir('runs'), cwd = fs.realpathSync(dir('cwd')), script = path.join(cwd, 'a.workflow.js');
  fs.writeFileSync(script, 'export const meta = { name: "x", description: "y" };\nreturn 1;\n');
  let child; const settled = [];
  const spawn = () => { child = new EventEmitter(); child.pid = undefined; child.stderr = new EventEmitter(); child.send = () => {}; return child; };
  const warn = console.warn; console.warn = () => {};
  try {
    const service = createWorkflowService({ root, getConfig: () => ({ threadIds: ['t1'], cwd }), emit() {}, command: 'unused', version: '0', spawn, enabled: () => true, onSettled: run => settled.push(run.status) });
    const run = await service.start({ threadId: 't1', file: script });
    fs.rmSync(path.join(root, run.id), { recursive: true, force: true });
    assert.doesNotThrow(() => child.emit('message', { event: { type: 'log', message: 'hello' }, at: Date.now() }));
    // A second 'error' has a listener too (it would otherwise throw as an unhandled 'error' event).
    assert.doesNotThrow(() => { child.emit('error', new Error('first')); child.emit('error', new Error('second')); });
    const stopping = service.stop(run.id);
    await new Promise(resolve => setImmediate(resolve)); // stop() is async: let it reach the runner first
    assert.doesNotThrow(() => child.emit('close', null, 'SIGTERM'));
    assert.equal((await stopping).status, 'stopped', 'Stop gets its answer');
    assert.deepEqual(settled, ['stopped'], 'the settle hook (the model\'s notification) ran');
    assert.equal(service.get(run.id).status, 'stopped');
    await service.dispose();
  } finally { console.warn = warn; }
});

test('a core connection that drops mid-turn frees the session: a finished workflow\'s notification is delivered', async () => {
  const data = dir('data');
  fs.writeFileSync(path.join(data, 'result.json'), JSON.stringify('done'));
  const started = []; let refuse = false;
  const service = createWorkflowToolService({ workflowService: { orphans: async () => [] }, getConfig: () => ({ threadIds: ['t1', 't2'] }), updateConfig() {}, settings: () => ({ enabled: false }),
    dataRoot: data, home: os.homedir(), requestApproval: async () => true,
    startTurn: async (threadId, params) => { if (refuse) throw new Error('core is away'); started.push([threadId, params.input.length]); } });
  const run = (threadId, id) => ({ id, origin: 'tool', status: 'completed', threadId, transcriptDir: data, taskId: 'w' + id.slice(-1), description: 'x', workflowProgress: [], startedAt: 1 });
  const warn = console.warn; console.warn = () => {};
  try {
    for (const threadId of ['t1', 't2']) {
      await service.turnStart({ threadId, input: [{ type: 'text', text: 'run the workflow' }], cwd: data });
      service.observe({ method: 'turn/started', params: { threadId, turn: { id: 'turn-' + threadId } } });
    }
    // While the turn runs, a notification waits (a running turn is never interrupted).
    await service.settled(run('t1', 'wf_aaaaaaaaaaa1'));
    assert.equal(service.idle('t1'), false);
    assert.deepEqual(started, []);
    // The core dies: no turn/completed follows. The session is idle again; the waiting notification goes out when the core is back.
    service.observe({ kind: 'connection', connected: false });
    assert.equal(service.idle('t1'), true);
    assert.equal(service.pendingFor('t1').length, 1, 'nothing is started by the disconnect itself');
    service.observe({ kind: 'connection', connected: true });
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.deepEqual(started, [['t1', 1]]);
    assert.equal(service.pendingFor('t1').length, 0);
    // A delivery the returning core refuses stays queued for the session's next idle moment.
    refuse = true;
    await service.settled(run('t2', 'wf_aaaaaaaaaaa2'));
    assert.equal(service.pendingFor('t2').length, 1);
    refuse = false;
    service.observe({ kind: 'connection', connected: true });
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.deepEqual(started, [['t1', 1], ['t2', 1]]);
  } finally { console.warn = warn; }
});
