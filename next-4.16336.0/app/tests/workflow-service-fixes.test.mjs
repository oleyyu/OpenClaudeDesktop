import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fork } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mergeWorkflow } from '../src/workflow-progress-model.mjs';
import { createWorkflowToolService } from '../electron/workflow-tool-service.cjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const service = require('../electron/workflow-service.cjs');
const i18n = await import('../electron/i18n/index.mjs');

async function fixture(childSource) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-wf-service-'));
  const child = path.join(root, 'child.cjs');
  if (childSource) await fs.writeFile(child, childSource);
  const file = path.join(root, 'demo.workflow.js');
  await fs.writeFile(file, 'export const meta={name:"demo",description:"Demo"}; return 1');
  const runner = service.createWorkflowService({ root: path.join(root, 'runs'), getConfig: () => ({ threadIds: ['t'], cwd: root, dynamicWorkflows: true }), emit() {}, command: '/nonexistent', version: 'test',
    spawn: (_file, args, options) => fork(child, args, options) });
  return { root, file, runner };
}
const settled = async (runner, id) => { for (;;) { const run = (await runner.list('t')).find(r => r.id === id); if (run.status !== 'running') return run; await new Promise(r => setTimeout(r, 20)); } };

test('C1: only a core whose engine runs launcher scripts is probed for one (Codex never is)', () => {
  assert.equal(service.workflowCoreCommand({ command: 'codex', prefix: [], kind: 'codex' }).workflowScripts, false);
  assert.equal(service.workflowCoreCommand({ command: 'node', prefix: ['bridge.js'], kind: 'deepseek' }).workflowScripts, true);
  assert.equal('workflowScripts' in service.workflowCoreCommand({ command: '/x', prefix: [], kind: 'override' }), false, 'unknown: probed');
  assert.equal('workflowScripts' in service.workflowCoreCommand(null, '/override'), false);
  assert.deepEqual(service.workflowCoreCommand({ command: 'node', prefix: ['b.js'], kind: 'deepseek' }), { command: 'node', args: ['b.js', 'app-server', '--stdio'], workflowScripts: true });
});

test('C3: a stop under way gets its bounded grace before the force-kill; a silent runner is killed quickly', async () => {
  const marker = (root, name) => path.join(root, name);
  const awaitChildReady = async (runner, id) => {
    for (let i = 0; i < 250; i++) {
      if (runner.get(id).sequence > 0) return;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.fail('Workflow fixture did not report readiness');
  };
  const ready = 'process.send({event:{type:"log",message:"ready"}});';
  const graceful = await fixture(`const fs=require('node:fs');process.on('message',()=>{});process.once('SIGTERM',()=>{process.send({stopping:true});setTimeout(()=>{fs.writeFileSync(${JSON.stringify('')}+process.env.MARKER,'');process.exit(0);},2500);});${ready}`);
  process.env.MARKER = marker(graceful.root, 'released');
  try {
    const run = await graceful.runner.start({ threadId: 't', file: graceful.file });
    await awaitChildReady(graceful.runner, run.id);
    await graceful.runner.stop(run.id);
    assert.equal((await settled(graceful.runner, run.id)).status, 'stopped');
    await fs.stat(marker(graceful.root, 'released'));
  } finally { delete process.env.MARKER; await graceful.runner.dispose(); await fs.rm(graceful.root, { recursive: true, force: true }); }
  const silent = await fixture(`process.on('message',()=>{});process.on('SIGTERM',()=>{});setInterval(()=>{},1000);${ready}`);
  try {
    const run = await silent.runner.start({ threadId: 't', file: silent.file });
    await awaitChildReady(silent.runner, run.id);
    const began = Date.now();
    await silent.runner.stop(run.id);
    assert.ok(Date.now() - began < 4000, 'killed after the short deadline');
    assert.equal((await settled(silent.runner, run.id)).status, 'stopped');
  } finally { await silent.runner.dispose(); await fs.rm(silent.root, { recursive: true, force: true }); }
});

test('C4: a refused resume leaves no run folder behind', async () => {
  const { root, file, runner } = await fixture();
  try {
    await runner.ready;
    await assert.rejects(runner.start({ threadId: 't', file, resumeId: '00000000-0000-4000-8000-000000000000' }), /Unknown workflow/);
    assert.deepEqual(await fs.readdir(path.join(root, 'runs')), []);
  } finally { await runner.dispose(); await fs.rm(root, { recursive: true, force: true }); }
});

test('C5: workflow service errors are translated', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-wf-service-'));
  const runner = service.createWorkflowService({ root, getConfig: () => ({ threadIds: ['t'], cwd: root, dynamicWorkflows: false }), emit() {}, command: '/nonexistent', version: 'test' });
  const before = i18n.getLocale();
  try {
    i18n.setLocale('zh-CN');
    await assert.rejects(runner.start({ threadId: 't', file: 'x.js' }), { message: '动态工作流已停用。' });
    await assert.rejects(runner.stop('00000000-0000-4000-8000-000000000000'), { message: '未知的工作流。' });
    const zh = i18n.dictionary('zh-CN');
    for (const source of ['Four workflows are already running.', 'Choose a session before starting a workflow.', 'Resume requires the same model, effort, access and working directory from a finished run.', 'This workflow is no longer running.', 'Unknown active workflow member.']) assert.ok(zh[source], source);
  } finally { i18n.setLocale(before); await runner.dispose(); await fs.rm(root, { recursive: true, force: true }); }
});

test('resume reserves a hosted run once, preserves its args and publishes a fresh task snapshot', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-wf-resume-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const children = [];
  let ui = [];
  const runner = service.createWorkflowService({
    root,
    getConfig: () => ({ threadIds: ['t'], cwd: root }),
    emit: ({ run }) => { ui = mergeWorkflow(ui, run); },
    spawn: () => {
      const child = new EventEmitter();
      child.send = (options) => { child.options = options; };
      children.push(child);
      return child;
    },
  });
  const source = 'export const meta={name:"demo",description:"Demo"}; return args.key';
  const initial = await runner.start({ threadId: 't', file: 'demo.js', source, args: { key: 'old' } });
  const finish = (child, result) => {
    child.emit('message', { event: { type: 'result', result } });
    child.emit('close', 0);
  };
  for (let i = 0; i < 6; i++) children[0].emit('message', { event: { type: 'log', message: 'Running' } });
  finish(children[0], 'old');
  await fs.writeFile(path.join(initial.transcriptDir, 'engine.json'), JSON.stringify({ threadId: 'core-thread', runId: 'core-run' }));
  await fs.writeFile(path.join(initial.transcriptDir, 'result.json'), JSON.stringify({ workflowProgress: [{ type: 'workflow_agent', agentId: 'before' }] }));
  assert.deepEqual([...runner.agentIds()], ['before']);
  const resume = { threadId: 't', file: 'demo.js', source, resumeId: initial.id };
  const concurrent = await Promise.allSettled([runner.start(resume), runner.start(resume)]);
  assert.deepEqual(concurrent.map(item => item.status), ['fulfilled', 'rejected']);
  assert.match(concurrent[1].reason.message, /still running/);
  assert.equal(children.length, 2);
  assert.deepEqual(children[1].options.args, { key: 'old' });
  assert.equal(ui[0].status, 'running');
  await fs.writeFile(path.join(initial.transcriptDir, 'result.json'), JSON.stringify({ workflowProgress: [{ type: 'workflow_agent', agentId: 'after' }] }));
  finish(children[1], 'new');
  assert.equal(ui[0].result, 'new');
  assert.deepEqual([...runner.agentIds()], ['after']);

  const restarted = service.createWorkflowService({ root, getConfig: () => ({ threadIds: ['t'], cwd: root }), emit() {} });
  assert.equal((await restarted.list('t'))[0].result, 'new');
});

test('a finished workflow notification survives shutdown until a turn accepts it', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-wf-notice-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const getConfig = () => ({ threadIds: ['t'], cwd: root });
  let child;
  const serviceOptions = { root, getConfig, emit() {}, spawn() {
    child = new EventEmitter();
    child.send = () => {};
    return child;
  } };
  const tool = workflowService => createWorkflowToolService({
    workflowService, getConfig, settings: () => ({ enabled: false }),
  });
  const params = () => ({ threadId: 't', input: [{ type: 'text', text: 'Next request' }] });
  const first = service.createWorkflowService(serviceOptions);
  const before = tool(first);
  await before.turnStart(params());
  const run = await first.start({ threadId: 't', file: 'demo.js', source: 'return 1', origin: 'tool', taskId: 'w12345678' });
  child.emit('message', { event: { type: 'result', result: 1 } });
  child.emit('close', 0);
  await before.settled(first.get(run.id));
  assert.equal(before.pendingFor('t').length, 1);
  await first.dispose();

  const restarted = service.createWorkflowService(serviceOptions);
  const after = tool(restarted);
  const rejectedTurn = await after.turnStart(params());
  assert.match(rejectedTurn.input[1].text, /<task-id>w12345678<\/task-id>/);
  assert.match(rejectedTurn.input[1].text, /<result>1<\/result>/);
  after.turnFailed('t');
  const acceptedTurn = await after.turnStart(params());
  assert.equal(acceptedTurn.input[1].text, rejectedTurn.input[1].text);
  after.observe({ method: 'turn/started', params: { threadId: 't' } });
  assert.deepEqual(await restarted.completionNotices('t'), []);
});

test('manual launches enforce the runner byte limit before spawning', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-wf-size-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const runner = service.createWorkflowService({
    root: path.join(root, 'runs'),
    getConfig: () => ({ threadIds: ['t'], cwd: root }),
    emit() {},
    spawn: () => assert.fail('Oversized script must fail before spawning'),
  });
  const file = path.join(root, 'large.js');
  await fs.writeFile(file, '中'.repeat(Math.ceil(524289 / 3)));
  await assert.rejects(runner.start({ threadId: 't', file }), /512 KB/);
  assert.deepEqual(await runner.list('t'), []);
});

test('a hosted resume sends the original thread, run ID and args through the runner child', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-wf-hosted-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const server = path.join(root, 'engine.cjs');
  await fs.writeFile(server, `
    const readline = require('node:readline').createInterface({ input: process.stdin });
    let value;
    readline.on('line', line => {
      const { id, method, params } = JSON.parse(line);
      if (id === undefined) return;
      let result = {};
      if (method === 'thread/start') result = { thread: { id: 'core-thread' } };
      if (method === 'thread/resume') {
        if (params.threadId !== 'core-thread') process.exit(4);
        result = { thread: { id: 'core-thread' } };
      }
      if (method === 'model/list') result = { data: [] };
      if (method === 'codeDesktop/diagnostics') result = { workflowExecute: true };
      if (method === 'codeDesktop/workflow/startScript') {
        if (params.args?.value !== 'kept') process.exit(5);
        value = params.resumeFromRunId === 'engine-run' ? 2 : 1;
        result = { runId: 'engine-run', attemptId: 'attempt-' + value };
      }
      if (method === 'codeDesktop/workflow/scriptResult') result = { stopReason: 'completed', value };
      console.log(JSON.stringify({ id, result }));
    });
  `);
  const runner = service.createWorkflowService({
    root: path.join(root, 'runs'),
    getConfig: () => ({ threadIds: ['t'], cwd: root }),
    emit() {},
    core: () => ({ command: process.execPath, args: [server], workflowScripts: true }),
  });
  const options = { threadId: 't', file: 'demo.js', engine: 'native',
    source: 'export const meta={name:"demo",description:"Demo"}; return 1' };
  try {
    const first = await runner.start({ ...options, args: { value: 'kept' } });
    const original = await settled(runner, first.id);
    assert.equal(original.status, 'completed', original.summary);
    assert.equal(original.result, 1);
    await assert.rejects(fs.stat(path.join(first.transcriptDir, 'journal.jsonl')), { code: 'ENOENT' });
    await runner.start({ ...options, resumeId: first.id });
    const resumed = await settled(runner, first.id);
    assert.equal(resumed.status, 'completed', resumed.summary);
    assert.equal(resumed.result, 2);
  } finally { await runner.dispose(); }
});
