import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { fork } from 'node:child_process';
import { extractMeta, runWorkflowSource } from '../third-party/codex-workflows-runner/src/runWorkflow.js';
import { createRuntime } from '../third-party/codex-workflows-runner/src/runtime.js';
import { recordTokenUsage, resetMeter } from '../third-party/codex-workflows-runner/src/meter.js';
import service from '../electron/workflow-service.cjs';

const header = 'export const meta={name:"contract",description:"Contract fixture"};\n';
const run = (body, options) => runWorkflowSource(header + body, options);
const plain = value => JSON.parse(JSON.stringify(value));

test('metadata discovery decodes literals and normalizes annotations without executing expressions', () => {
  assert.deepEqual(extractMeta('/* { */ export const meta={name:`brace}`,description:"{not a brace}",title:`Title`,phases:[null,{title:"",model:9},{title:"Scan",detail:"Details"}],ignored:[1,true,null]}; invalid body'), {
    name: 'brace}', description: '{not a brace}', title: 'Title', phases: [{ title: '' }, { title: 'Scan', detail: 'Details' }],
  });
  for (const source of [
    'export const meta={name:"test",description:(()=>"computed")()}',
    'export const meta={name:"test",description:"Test",get extra(){return 1}}',
    'export const meta={name:"test",description:`value ${1}`}',
    'export const meta={name:"test",description:"Test",constructor:1}',
    'export const meta={name:"test"}',
    'log("before"); export const meta={name:"test",description:"Test"}',
  ]) assert.equal(extractMeta(source), null, source);
});

test('invalid headers and bodies fail before runtime creation or any agent call', async () => {
  let runtimes = 0, agents = 0;
  for (const source of ['return 1', header + 'const = ;', 'export const meta={name:"x",description:agent("no")};return 1', header + ' '.repeat(524289)]) {
    await assert.rejects(runWorkflowSource(source, { onRuntime: () => runtimes++, runAgent: async () => agents++ }));
  }
  assert.equal(runtimes, 0);
  assert.equal(agents, 0);
});

test('metadata is not a runtime binding; args preserve every JSON input kind', async () => {
  for (const args of [null, false, 2, 'text', [1, 2], { nested: [true] }]) {
    assert.deepEqual(plain(await run('return { meta: typeof meta, args }', { args })), { meta: 'undefined', args });
  }
  assert.equal(await run('return typeof args'), 'undefined');
});

test('compiler rejects reserved bindings, imports and await using before creating a runtime', async () => {
  let runtimes=0;
  for(const body of ['const __wRg$secret=1;return 1','if(false)import("node:fs");return 1','await using resource=null;return 1']) {
    await assert.rejects(run(body,{onRuntime(){runtimes++}}),SyntaxError);
  }
  assert.equal(runtimes,0);
  assert.equal(await run('return ({__wRg$secret:1}).__wRg$secret'),1);
});

test('async iteration resolves promised values and waits for early close values', async () => {
  const values=await run('let n=0,closed=0;const source={[Symbol.asyncIterator](){return {next(){return {done:false,value:Promise.resolve(++n)}},return(){return {done:true,value:{then(resolve){closed++;resolve(2)}}}}}}};const values=[];for await(const value of source){values.push([value,typeof value]);break}return {values,closed}');
  assert.deepEqual(plain(values),{values:[[1,'number']],closed:1});
});

test('Date guards close direct, prototype-constructor, Reflect and subclass paths to current time', async () => {
  for (const expression of ['Date()', 'Date(0)', 'new Date()', 'Date.now()', '(new Date(0)).constructor()', 'new (new Date(0)).constructor()', 'Reflect.construct(Date, [])', '(new Date(0)).constructor.now()', 'new (class extends Date {})()', 'Math.random()']) {
    await assert.rejects(run(`return ${expression}`), /unavailable.*breaks resume/, expression);
  }
  assert.deepEqual(plain(await run('class D extends Date {}; const date=new D(0); return [date.toISOString(),date instanceof D,date instanceof Date,Date.parse("1970-01-01T00:00:00Z"),Date.UTC(1970,0,1),new (new Date(0)).constructor(123).getTime()]')), ['1970-01-01T00:00:00.000Z', true, true, 0, 0, 123]);
  // Installing a shim in the guest never changes the host clock.
  assert.equal(typeof Date.now(), 'number');
});

test('parallel validates every slot before invoking a task and rejects promises and holes', async () => {
  for (const source of ['return parallel(null)', 'return parallel([Promise.resolve(1)])', 'return parallel([,()=>1])', 'return parallel([()=>agent("must not run"),1])']) {
    let calls = 0;
    await assert.rejects(run(source, { runAgent: async () => calls++ }), /parallel\(\) expects an array of functions/);
    assert.equal(calls, 0);
  }
  assert.deepEqual(plain(await run('return parallel([()=>1,()=>{throw Error("x")},async()=>3])')), [1, null, 3]);
});

test('pipeline admits promised items and optional stages, preserving original item and index', async () => {
  assert.deepEqual(plain(await run('const original=Promise.resolve(2);return pipeline([original],(value,item,index)=>[value,item===original,index])')), [[2, true, 0]]);
  assert.deepEqual(plain(await run('return pipeline([Promise.resolve(1),null,3])')), [1, null, 3]);
  assert.deepEqual(plain(await run('const item=Promise.reject(Error("item")); item.catch(()=>{}); return pipeline([item,2],value=>value*2)')), [null, 4]);
  assert.deepEqual(plain(await run('return pipeline([],42)')), []);
  await assert.rejects(run('return pipeline({},()=>1)'), /expects an array as the first argument/);
  await assert.rejects(run('return pipeline([null],42)'), /stages must be functions/);
});

test('combinators snapshot dense slots, ignore custom iterators, and cap arrays at 4096', async () => {
  assert.deepEqual(plain(await run('const items=[,1];Object.defineProperty(items,Symbol.iterator,{value:()=>{throw Error("iterator")}});return pipeline(items,(v,item,i)=>[typeof v,i])')), [['undefined', 0], ['number', 1]]);
  assert.deepEqual(plain(await run('const tasks=[()=>{tasks[1]=()=>99;return 1},()=>2];Object.defineProperty(tasks,"map",{value:()=>{throw Error("map")}});return parallel(tasks)')), [1, 2]);
  assert.deepEqual(plain(await run('const items=[1,2];Object.defineProperty(items,0,{get(){throw Error("getter")}});return pipeline(items,v=>typeof v)')), ['undefined', 'number']);
  for (const helper of ['parallel', 'pipeline']) await assert.rejects(run(`return ${helper}(new Array(4097))`), /array length 4097 exceeds the maximum of 4096/);
});

test('empty combinators bypass resource gates; nonempty combinators refuse an exhausted agent cap', async () => {
  const runtime = createRuntime({ executionState: { agentCount: 1000 } });
  assert.deepEqual(await runtime.parallel([]), []);
  assert.deepEqual(await runtime.pipeline([], 1), []);
  await assert.rejects(runtime.parallel([() => 1]), /agent\(\) call cap reached/);
  await assert.rejects(runtime.pipeline([1]), /agent\(\) call cap reached/);
});

test('nonempty combinators check a spent budget before callback validation or invocation', async (t) => {
  resetMeter();
  t.after(resetMeter);
  const runtime = createRuntime({ budgetTotal: 1 });
  recordTokenUsage({ threadId: 'combinator-budget', tokenUsage: { total: { outputTokens: 1 } } });
  assert.deepEqual(await runtime.parallel([]), []);
  assert.deepEqual(await runtime.pipeline([], 1), []);
  let calls = 0;
  await assert.rejects(runtime.parallel([() => ++calls]), { code: 'BUDGET_EXCEEDED' });
  await assert.rejects(runtime.pipeline([1], () => ++calls), { code: 'BUDGET_EXCEEDED' });
  await assert.rejects(runtime.parallel([42]), { code: 'BUDGET_EXCEEDED' });
  await assert.rejects(runtime.pipeline([1], 42), { code: 'BUDGET_EXCEEDED' });
  assert.equal(calls, 0);
});

test('strict guest execution freezes intrinsics while preserving own overrides and argument prototypes', async () => {
  for (const body of ['Array.prototype.map=()=>0', 'Math.random=()=>0', 'const values=[];values.map=()=>0', 'undeclaredWorkflowVariable=1']) {
    await assert.rejects(run(body), error => ['TypeError','ReferenceError'].includes(error.name));
  }
  assert.deepEqual(plain(await run('class Failure extends Error {constructor(){super("message");this.name="Failure"}}; const object=Object.assign({}, {constructor:1,hasOwnProperty:2,toString:3});return [new Failure().name,object.constructor,object.hasOwnProperty,object.toString,Object.isFrozen(Array.prototype),Object.isFrozen(Math),args instanceof Object,args.nested instanceof Array,typeof WeakRef,typeof WebAssembly]', { args: { nested: [1] } })), ['Failure', 1, 2, 3, true, true, true, true, 'undefined', 'undefined']);
  assert.equal(Object.isFrozen(Array.prototype), false, 'host intrinsics remain unchanged');
});

test('phase and log stringify primitives without calling guest object conversion hooks', async () => {
  const phases = [], logs = [];
  const touched = await run('let touched=0; const value={toString(){touched++;throw Error("conversion")}}; for(const x of [7,null,undefined,value,()=>1]) {phase(x);log(x)} return touched', { onPhase: x => phases.push(x), onLog: x => logs.push(x) });
  assert.equal(touched, 0);
  assert.deepEqual(phases, ['7', 'null', 'undefined', '[object]', '[function]']);
  assert.deepEqual(logs.slice(1), phases); // Initial host workflow label precedes guest logs.
});

test('packaged parser is standalone and its fingerprint matches the shared source and builder', async () => {
  const workspace = path.resolve(import.meta.dirname, '../..');
  const runner = path.resolve(import.meta.dirname, '../third-party/codex-workflows-runner');
  const manifest = JSON.parse(await fs.readFile(path.join(runner, 'parser-build.json'), 'utf8'));
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = await fs.readFile(path.join(runner, manifest.output));
  assert.equal(hash(bytes), manifest.sha256);
  assert.equal(hash(await fs.readFile(path.join(workspace, 'app/scripts/build-workflow-parser.mjs'))), manifest.builderSha256);
  for (const source of manifest.sources) assert.equal(hash(await fs.readFile(path.join(workspace, source.path))), source.sha256, source.path);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'packaged-workflow-parser-'));
  try {
    const file = path.join(directory, 'parser.mjs');
    await fs.writeFile(file, bytes);
    const parser = await import(pathToFileURL(file));
    assert.equal(parser.parseClaudeWorkflowScript(header + 'return 42').script, 'return 42');
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('packaged intrinsic setup matches its shared source and executes without workspace dependencies', async () => {
  const workspace = path.resolve(import.meta.dirname, '../..');
  const runner = path.resolve(import.meta.dirname, '../third-party/codex-workflows-runner');
  const manifest = JSON.parse(await fs.readFile(path.join(runner, 'intrinsics-build.json'), 'utf8'));
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = await fs.readFile(path.join(runner, manifest.output));
  assert.equal(hash(bytes), manifest.sha256);
  assert.equal(hash(await fs.readFile(path.join(workspace, 'app/scripts/build-workflow-parser.mjs'))), manifest.builderSha256);
  for (const source of manifest.sources) assert.equal(hash(await fs.readFile(path.join(workspace, source.path))), source.sha256, source.path);
  const { WORKFLOW_INTRINSICS_SOURCE } = await import('data:text/javascript;base64,' + bytes.toString('base64'));
  const vm = await import('node:vm');
  const context = vm.createContext({});
  vm.runInContext(WORKFLOW_INTRINSICS_SOURCE, context);
  assert.equal(vm.runInContext('Object.isFrozen(Array.prototype) && Object.isFrozen(Math)', context), true);
});

test('packaged compiler matches its source and runs without workspace dependencies', async () => {
  const workspace = path.resolve(import.meta.dirname, '../..');
  const runner = path.resolve(import.meta.dirname, '../third-party/codex-workflows-runner');
  const manifest = JSON.parse(await fs.readFile(path.join(runner, 'compiler-build.json'), 'utf8'));
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = await fs.readFile(path.join(runner, manifest.output));
  assert.equal(hash(bytes), manifest.sha256);
  assert.equal(hash(await fs.readFile(path.join(workspace, 'app/scripts/build-workflow-parser.mjs'))), manifest.builderSha256);
  for(const source of manifest.sources)assert.equal(hash(await fs.readFile(path.join(workspace,source.path))),source.sha256,source.path);
  const compiler = await import('data:text/javascript;base64,'+bytes.toString('base64'));
  const vm = await import('node:vm');const context=vm.createContext({});
  vm.runInContext(compiler.WORKFLOW_ASYNC_INIT_SOURCE,context);
  assert.equal(await vm.runInContext(compiler.compileWorkflowBody('return await 42'),context),42);
});

test('packaged result formatter matches its source and runs without workspace dependencies', async () => {
  const workspace=path.resolve(import.meta.dirname,'../..');
  const runner=path.resolve(import.meta.dirname,'../third-party/codex-workflows-runner');
  const manifest=JSON.parse(await fs.readFile(path.join(runner,'result-build.json'),'utf8'));
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const bytes=await fs.readFile(path.join(runner,manifest.output));
  assert.equal(hash(bytes),manifest.sha256);
  assert.equal(hash(await fs.readFile(path.join(workspace,'app/scripts/build-workflow-parser.mjs'))),manifest.builderSha256);
  for(const source of manifest.sources)assert.equal(hash(await fs.readFile(path.join(workspace,source.path))),source.sha256,source.path);
  const formatter=await import('data:text/javascript;base64,'+bytes.toString('base64'));
  assert.equal(formatter.workflowErrorText({name:'Failure',message:'message',stack:'ignored\n  at first\n  at second\n  at third\n  at fourth\n  at fifth\n  at sixth'}),'Failure: message\n  at first\n  at second\n  at third\n  at fourth\n  at fifth');
  assert.equal(await run('return undefined'),undefined);
  assert.deepEqual(await run('return {drop:undefined,values:[,()=>1],data:{x:1,toJSON(){throw 1}}}'),{drop:undefined,values:[undefined,undefined],data:{x:1}});
});

test('packaged output formatter matches its source and runs without workspace dependencies', async () => {
  const workspace=path.resolve(import.meta.dirname,'../..');
  const runner=path.resolve(import.meta.dirname,'../third-party/codex-workflows-runner');
  const manifest=JSON.parse(await fs.readFile(path.join(runner,'output-build.json'),'utf8'));
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const bytes=await fs.readFile(path.join(runner,manifest.output));
  assert.equal(hash(bytes),manifest.sha256);
  assert.equal(hash(await fs.readFile(path.join(workspace,'app/scripts/build-workflow-parser.mjs'))),manifest.builderSha256);
  for(const source of manifest.sources)assert.equal(hash(await fs.readFile(path.join(workspace,source.path))),source.sha256,source.path);
  const {WorkflowOutput}=await import('data:text/javascript;base64,'+bytes.toString('base64'));
  const output=new WorkflowOutput('fixture');
  assert.equal(JSON.parse(output.render({stopReason:'completed',agentsStarted:0,value:null})).result,null);
});

test('real child rejects malformed metadata before starting the selected core', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-admission-'));
  const runner = service.createWorkflowService({ root: path.join(root, 'runs'), getConfig: () => ({ threadIds: ['t'], cwd: root, dynamicWorkflows: true }), emit() {}, command: path.resolve(import.meta.dirname, 'fixtures/workflow-server.cjs'), version: 'test', spawn: (file, args, options) => fork(file, args, { ...options, env: { ...options.env, CODEX_HOME: path.join(root, 'codex-home') } }) });
  try {
    const file = path.join(root, 'bad.workflow.js');
    await fs.writeFile(file, 'export const meta={name:"bad",description:(()=>"evaluated")()}; return agent("must not run")');
    const started = await runner.start({ threadId: 't', file, model: 'fixture' });
    let current;
    const deadline = Date.now() + 10000;
    do {
      current = (await runner.list('t')).find(run => run.id === started.id);
      if (current.status !== 'running') break;
      await new Promise(resolve => setTimeout(resolve, 20));
    } while (Date.now() < deadline);
    assert.equal(current.status, 'failed');
    assert.match(JSON.stringify(current), /meta must be a pure literal/);
    await assert.rejects(fs.stat(path.join(root, 'workflow-wire.jsonl')), { code: 'ENOENT' });
    assert.equal(current.workflowProgress.filter(entry => entry.type === 'workflow_agent').length, 0);
  } finally { await runner.dispose(); await fs.rm(root, { recursive: true, force: true }); }
});


test('helper promises, copies and failure records use the workflow realm', async () => {
  const result=await run(`parallel(0);pipeline(0);const p=agent('data',{schema:{type:'object'}});const data=await p;const x={n:1};const values=await parallel([()=>x,()=>x]);let error;try{await parallel(0)}catch(e){error={frozen:Object.isFrozen(e),nullPrototype:Object.getPrototypeOf(e)===null,keys:Object.keys(e)}};await new Promise(r=>setTimeout(r,10));return {promise:p instanceof Promise,object:data instanceof Object,array:values instanceof Array,copy:values[0]!==x,alias:values[0]===values[1],error}`,{runAgent:async()=>({n:1})});
  assert.deepEqual(plain(result),{promise:true,object:true,array:true,copy:true,alias:true,error:{frozen:true,nullPrototype:true,keys:['name','message','stack','toString']}});
});
