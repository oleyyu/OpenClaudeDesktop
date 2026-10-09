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
