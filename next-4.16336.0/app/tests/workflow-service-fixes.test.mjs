import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fork } from 'node:child_process';
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
  const graceful = await fixture(`const fs=require('node:fs');process.on('message',()=>{});process.once('SIGTERM',()=>{process.send({stopping:true});setTimeout(()=>{fs.writeFileSync(${JSON.stringify('')}+process.env.MARKER,'');process.exit(0);},2500);});`);
  process.env.MARKER = marker(graceful.root, 'released');
  try {
    const run = await graceful.runner.start({ threadId: 't', file: graceful.file });
    await new Promise(r => setTimeout(r, 300));
    await graceful.runner.stop(run.id);
    assert.equal((await settled(graceful.runner, run.id)).status, 'stopped');
    await fs.stat(marker(graceful.root, 'released'));
  } finally { delete process.env.MARKER; await graceful.runner.dispose(); await fs.rm(graceful.root, { recursive: true, force: true }); }
  const silent = await fixture(`process.on('message',()=>{});process.on('SIGTERM',()=>{});setInterval(()=>{},1000);`);
  try {
    const run = await silent.runner.start({ threadId: 't', file: silent.file });
    await new Promise(r => setTimeout(r, 300));
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
