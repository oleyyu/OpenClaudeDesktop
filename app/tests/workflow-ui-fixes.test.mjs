import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fork } from 'node:child_process';
import { createRequire } from 'node:module';
import { mergeWorkflow } from '../src/workflow-progress-model.mjs';
const require = createRequire(import.meta.url);
const service = require('../electron/workflow-service.cjs');

const settled = async (runner, id) => { for (;;) { const run = (await runner.list('t')).find(r => r.id === id); if (run.status !== 'running') return run; await new Promise(r => setTimeout(r, 20)); } };

// A resume reuses the run id, and its event log (and sequence) starts over: the renderer's merge must still take it.
test('a resumed run replaces its earlier attempt in the renderer, not only once its sequence catches up', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-wf-ui-resume-'));
  const child = path.join(root, 'child.cjs');
  await fs.writeFile(child, `const fs=require('node:fs'),path=require('node:path');process.once('message',o=>{fs.writeFileSync(path.join(o.directory,'journal.jsonl'),'');const send=e=>process.send({event:e,at:Date.now()});
    for(const title of o.resume?['Resumed']:['A','B','C','D'])send({type:'phase',title});process.send({event:{type:'result',result:o.resume?'second':'first'}},()=>process.exit(0));});`);
  const file = path.join(root, 'demo.workflow.js');
  await fs.writeFile(file, 'export const meta={name:"demo",description:"Demo"}; return 1');
  let shown = [];
  const runner = service.createWorkflowService({ root: path.join(root, 'runs'), getConfig: () => ({ threadIds: ['t'], cwd: root, dynamicWorkflows: true }), version: 'test', command: '/nonexistent',
    emit: e => { if (e.kind === 'workflow') shown = mergeWorkflow(shown, e.run); }, spawn: (_file, args, options) => fork(child, args, options) });
  try {
    const first = await runner.start({ threadId: 't', file });
    assert.equal((await settled(runner, first.id)).status, 'completed');
    assert.equal(shown.find(r => r.id === first.id).result, 'first');
    const resumed = await runner.start({ threadId: 't', file, resumeId: first.id });
    shown = mergeWorkflow(shown, resumed); // main.jsx onStart
    const done = await settled(runner, first.id);
    assert.equal(done.result, 'second');
    const view = shown.filter(r => r.id === first.id);
    assert.equal(view.length, 1);
    assert.equal(view[0].result, 'second', 'the card shows the resumed attempt');
    assert.equal(view[0].resumedFrom, first.id);
    assert.deepEqual(view[0].workflowProgress.map(p => p.title), ['Resumed']);
  } finally { await runner.dispose(); await fs.rm(root, { recursive: true, force: true }); }
});

// /workflows p right after the launch: the runner child has no runtime yet (its core is still starting).
test('a pause that arrives before the runtime exists is applied, not reported as an unpausable run', { timeout: 60000 }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-wf-ui-pause-')), cwd = path.join(dir, 'ws'), home = path.join(dir, 'home');
  await fs.mkdir(cwd, { recursive: true }); await fs.mkdir(home, { recursive: true }); await fs.mkdir(path.join(dir, 'run'));
  const env = { PATH: process.env.PATH, HOME: home, CODEX_HOME: path.join(home, '.codex'), CODE_DESKTOP_WORKFLOW_RUNNER: '1', CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS: '0' };
  const source = 'export const meta={name:"p",description:"pause"};\nreturn await agent("FAST",{label:"a1"});';
  const child = fork(path.resolve(import.meta.dirname, '../electron/workflow-child.mjs'), [], { cwd, stdio: ['ignore', 'ignore', 'pipe', 'ipc'], env });
  let stderr = '';
  child.stderr.on('data', (data) => { stderr += data; });
  const events = [];
  const finished = new Promise((resolve) => child.on('exit', resolve));
  child.on('message', (message) => { if (message?.event?.type) events.push(message.event); });
  try {
    child.send({ directory: path.join(dir, 'run'), source, cwd, plan: false, access: 'read-only', resume: false, model: 'fixture', command: path.resolve(import.meta.dirname, 'fixtures/workflow-runner-server.cjs'), version: 't', runId: 'wf_earlypause1', workflowScripts: false });
    child.send({ control: 'pause', paused: true });
    await new Promise((resolve) => setTimeout(resolve, 2500));
    assert.equal(events.some((event) => event.type === 'pausable' && event.pausable === false), false, 'the local runner can pause');
    assert.ok(events.some((event) => event.type === 'paused' && event.paused === true));
    assert.equal(events.some((event) => event.type === 'start'), false, 'no agent starts while paused');
    child.send({ control: 'pause', paused: false });
    assert.equal(await finished, 0, stderr);
    assert.ok(events.some((event) => event.type === 'start'));
    assert.ok(events.some((event) => event.type === 'result'));
  } finally { child.kill('SIGKILL'); await fs.rm(dir, { recursive: true, force: true }); }
});
