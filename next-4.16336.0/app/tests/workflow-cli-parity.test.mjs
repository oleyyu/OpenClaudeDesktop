import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runWorkflowSource } from '../third-party/codex-workflows-runner/src/runWorkflow.js';
import { Journal } from '../third-party/codex-workflows-runner/src/journal.js';

const runBody = (body, options) => runWorkflowSource('export const meta={name:"fixture",description:"Workflow fixture"}; ' + body, options);
const sharedHooks=JSON.parse(await fs.readFile(new URL('../../vendor/deepseek-harness/packages/workflow/workflow-ptc/tests/fixtures/shared-hooks-native.json',import.meta.url),'utf8'));
for(const fixture of sharedHooks)test(`native ${fixture.name} keeps shared hook references across child realms`,async()=>{
  await withChild(fixture.child,async file=>{
    const value=await runBody(fixture.script.replaceAll('workflow("child"','workflow('+JSON.stringify({scriptPath:file})));
    assert.deepEqual(structuredClone(value),fixture.value);
  });
});
test('shared hook properties do not escape an alternate root run',async()=>{
  await withChild('return [setTimeout.marker??null,budget.spent.marker??null]',async file=>{
    const call='return await workflow('+JSON.stringify({scriptPath:file})+')';
    assert.deepEqual(structuredClone(await runBody('setTimeout.marker=1;budget.spent.marker=2;'+call)),[1,2]);
    assert.deepEqual(structuredClone(await runBody(call)),[null,null]);
  });
});
async function withChild(body, action) {
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'workflow-child-'));
  const file=path.join(directory,'child.js');
  try {
    await fs.writeFile(file,'export const meta={name:"child",description:"Child"};'+body);
    return await action(file);
  } finally { await fs.rm(directory,{recursive:true,force:true}); }
}

test('nested arguments and returns retain the native VM ownership', async () => {
  await withChild('const p=parallel([()=>({n:1})]);const v=await p;const a=await agent("data");return {local:args instanceof Object,cycle:args.self===args,bigint:String(args.n),promise:p instanceof Promise,helpersForeign:!(v instanceof Array)&&!(a instanceof Object)}', async file => {
    const result=await runBody('const input={n:42n};input.self=input;const v=await workflow({scriptPath:args},input);return {childForeign:!(v instanceof Object),...v}',{args:file,runAgent:async()=>({n:1})});
    assert.deepEqual(structuredClone(result),{childForeign:true,local:true,cycle:true,bigint:'42',promise:true,helpersForeign:true});
  });
});

test('child timers survive settlement and child groups appear only for agent calls', async () => {
  await withChild('phase("ignored");setTimeout(()=>log(args?"later failure":"later success"),5);if(args)throw "failed";return 1',async file=>{
    const logs=[],phases=[];
    assert.equal(await runBody('await workflow({scriptPath:args},false);try{await workflow({scriptPath:args},true)}catch{}await new Promise(r=>setTimeout(r,30));return 42',{args:file,onLog:l=>logs.push(l),onPhase:p=>phases.push(p)}),42);
    assert.deepEqual(phases,[]);
    assert.deepEqual(logs.filter(l=>!l.startsWith('▶ ')&&!l.startsWith('[child] later')),['▸ running dynamic workflow child','▸ child done','▸ running dynamic workflow child','▸ child failed: Error: failed']);
    assert.equal(logs.filter(l=>l==='[child] later success').length,1);assert.equal(logs.filter(l=>l==='[child] later failure').length,1);
    assert.ok(logs.indexOf('[child] later success')>logs.indexOf('▸ child done'));assert.ok(logs.indexOf('[child] later failure')>logs.indexOf('▸ child failed: Error: failed'));
  });
  await withChild('phase("ignored");return await agent("data",{phase:"override"})',async file=>{
    const phases=[],members=[];
    await runBody('await workflow({scriptPath:args});await workflow({scriptPath:args})',{args:file,onPhase:p=>phases.push(p),runAgent:async(_prompt,opts)=>{members.push(opts.phase);return 'ok'}});
    assert.deepEqual(phases,['▸ child','▸ child #2']);
    assert.deepEqual(members,phases);
  });
});

test('nested errors preserve script fields and reject second-level calls as Promises', async () => {
  await withChild('const p=workflow("missing");if(!(p instanceof Promise))throw "bad promise";try{await p}catch(e){throw {name:"ChildFailure",message:e.message,stack:"header\\n  at child"}}',async file=>{
    const result=await runBody('try{await workflow({scriptPath:args})}catch(e){return {name:e.name,message:e.message,stack:e.stack,frozen:Object.isFrozen(e),nullPrototype:Object.getPrototypeOf(e)===null}}',{args:file});
    const message='workflow() cannot be called from within a child workflow — nesting is limited to one level. Inline the inner script or call its agents directly.';
    assert.deepEqual(structuredClone(result),{name:'ChildFailure',message,stack:`ChildFailure: ${message}\n  at child`,frozen:true,nullPrototype:true});
  });
});

test('nested selectors reject object names and unreadable paths before lookup', async () => {
  const result=await runBody('const errors=[];for(const v of [null,1,{name:"child"},{scriptPath:1},{get scriptPath(){throw 1}}]){try{await workflow(v)}catch(e){errors.push([e.name,e.message,Object.isFrozen(e)])}}return errors');
  assert.deepEqual(structuredClone(result),Array(5).fill(['TypeError','workflow() expects a workflow name (string) or {scriptPath: string}',true]));
});
test('pipeline stops null items before a downstream model call', async () => {
  const prompts = [];
  const result = await runBody('return await pipeline([1,2], n => n === 1 ? null : "keep", v => agent(v))', { runAgent: async prompt => { prompts.push(prompt); return prompt; } });
  assert.deepEqual(structuredClone(result), [null, 'keep']);
  assert.deepEqual(prompts, ['keep']);
});

test('nested workflows enforce one level and share the root agent cap', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-nesting-'));
  try {
    const child = path.join(root, 'child.js');
    await fs.writeFile(child, 'export const meta={name:"fixture",description:"Workflow fixture"}; return await workflow({scriptPath: args.path})');
    await assert.rejects(runBody('return await workflow({scriptPath: args.path}, args)', { args: { path: child } }), /one level/);
    await fs.writeFile(child, 'export const meta={name:"fixture",description:"Workflow fixture"}; for(let i=0;i<101;i++) await agent("child"); return 1');
    await assert.rejects(runBody('for(let i=0;i<900;i++) await agent("parent"); return await workflow({scriptPath: args.path})', { args: { path: child }, plan: true }), /agent\(\) call cap reached/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('resume invalidates a changed call and its suffix but ignores display labels', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-prefix-'));
  try {
    const file = path.join(root, 'journal.jsonl');
    const original = new Journal(file);
    for (const prompt of ['A', 'B', 'C']) await original.record(original.nextKey(prompt, { label: 'old' }), prompt, prompt);
    const resumed = new Journal(file, { reuse: true });
    await resumed.load();
    assert.deepEqual(['A', 'changed', 'C'].map(prompt => resumed.hit(resumed.nextKey(prompt, { label: 'new' }))), [true, false, false]);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('a failed null child is rerun and never emitted as a successful cached result', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-null-resume-'));
  try {
    const file = path.join(root, 'journal.jsonl');
    const first = new Journal(file), events = [];
    assert.equal(await runBody('return await agent("retry me")', { journal: first, runAgent: async () => null, onEvent: e => events.push(e) }), null);
    assert.equal(events.find(e => e.type === 'end').status, 'failed');
    const resumed = new Journal(file, { reuse: true });
    await resumed.load();
    let calls = 0;
    assert.equal(await runBody('return await agent("retry me")', { journal: resumed, runAgent: async () => { calls++; return 'recovered'; } }), 'recovered');
    assert.equal(calls, 1);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

const nativePhases=JSON.parse(await fs.readFile(new URL('../../vendor/deepseek-harness/packages/workflow/workflow-ptc/tests/fixtures/phases-native.json',import.meta.url),'utf8'));
const stableProgress=rows=>rows.map(row=>Object.fromEntries(['type','index','title','kind','label','phaseIndex','phaseTitle'].filter(key=>row[key]!==undefined).map(key=>[key,row[key]])));
for(const fixture of nativePhases)test(`native ${fixture.name} phase identities survive alternate execution, manual UI and durable replay`,async()=>{
 const {workflowEvent,workflowPhases}=await import('../src/workflow-progress-model.mjs');
 const {workflowRecord}=await import('../../harness/packages/codex-app-server/src/workflows.js');
 await withChild(fixture.child,async file=>{
  let manual={id:'phase-run',startedAt:0,workflowProgress:[]},replay={...manual},fileOutput;
  const receive=event=>{
   manual=workflowEvent(manual,event,1);
   if(event.type==='phase')replay=workflowRecord(replay,'tool-workflow/phase',event,1);
   if(event.type==='start'||event.type==='cached')replay=workflowRecord(replay,'tool-workflow/agent-start',event,1);
   if(event.type==='end')replay=workflowRecord(replay,'tool-workflow/agent-end',{...event,outcome:'completed'},2);
  };
  await runWorkflowSource(`export const meta=${JSON.stringify({name:'phases',description:'Workflow phases',...fixture.meta})};\n`+fixture.script.replaceAll('workflow("child"','workflow('+JSON.stringify({scriptPath:file})),{
   onPhase:(title,phase)=>receive({type:'phase',title,...phase}),onEvent:receive,onOutput:text=>{fileOutput=JSON.parse(text)},runAgent:async()=>({items:[1,2]}),
  });
  // Both runtimes reserve after asynchronous source resolution. Concurrent reads
  // can finish in either order; the first admitted agent must keep that reservation.
  const expected=fixture.name==='concurrent'&&fileOutput.workflowProgress[0].index===1
   ? fixture.progress.map(row=>row.type==='workflow_phase'?{...row,index:3-row.index,title:row.index===1?'▸ child #2':'▸ child'}:{...row,phaseIndex:3-row.phaseIndex,phaseTitle:row.phaseIndex===1?'▸ child #2':'▸ child'})
   : fixture.progress;
  for(const rows of [fileOutput.workflowProgress,manual.workflowProgress,replay.workflowProgress])assert.deepEqual(stableProgress(rows),expected);
  const grouping=run=>workflowPhases(run,2).map(p=>({index:p.index,title:p.title,agents:p.agents.map(a=>a.index)}));
  assert.deepEqual(grouping(manual),grouping({workflowProgress:expected}));
  assert.deepEqual(grouping(replay),grouping(manual));
 });
});

const nativeAdmissions=JSON.parse(await fs.readFile(new URL('../../vendor/deepseek-harness/packages/workflow/workflow-ptc/tests/fixtures/admissions-native.json',import.meta.url),'utf8'));
for(const fixture of nativeAdmissions)test(`native ${fixture.name} queued order and labels survive alternate execution and both UI projections`,async()=>{
 const {workflowEvent}=await import('../src/workflow-progress-model.mjs');
 const {workflowRecord}=await import('../../harness/packages/codex-app-server/src/workflows.js');
 let manual={id:'admission-run',startedAt:0,workflowProgress:[]},replay={...manual},output;
 const receive=event=>{
  manual=workflowEvent(manual,event,1);
  if(event.type==='phase')replay=workflowRecord(replay,'tool-workflow/phase',event,1);
  if(event.type==='admission')replay=workflowRecord(replay,'tool-workflow/agent-admission',event,1);
  if(event.type==='start'||event.type==='cached')replay=workflowRecord(replay,'tool-workflow/agent-start',event,1);
  if(event.type==='end')replay=workflowRecord(replay,'tool-workflow/agent-end',{...event,outcome:'completed'},2);
 };
 await runBody(fixture.script,{onPhase:(title,phase)=>receive({type:'phase',title,...phase}),onEvent:receive,onOutput:text=>{output=JSON.parse(text)},runAgent:async()=>({items:[1,2]})});
 for(const rows of [output.workflowProgress,manual.workflowProgress,replay.workflowProgress])assert.deepEqual(stableProgress(rows),fixture.progress);
});
