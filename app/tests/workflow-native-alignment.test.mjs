import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {Journal} from '../third-party/codex-workflows-runner/src/journal.js';
import {runWorkflowSource} from '../third-party/codex-workflows-runner/src/runWorkflow.js';
import {createSharedBudget,joinSharedBudget} from '../third-party/codex-workflows-runner/src/shared-budget.js';
import {resolveWorkflowSettings} from '../electron/prefs/workflow-settings.mjs';

const require=createRequire(import.meta.url);
const {createWorkflowService}=require('../electron/workflow-service.cjs');
const {createWorkflowToolService}=require('../electron/workflow-tool-service.cjs');
const header='export const meta={name:"alignment",description:"Alignment probe"};\n';
const fixture=path.resolve(import.meta.dirname,'fixtures/workflow-runner-server.cjs');
async function temp(fn){const root=await fs.mkdtemp(path.join(os.tmpdir(),'workflow-alignment-'));try{return await fn(root);}finally{await fs.rm(root,{recursive:true,force:true});}}
async function waitFor(fn){for(let i=0;i<400;i++){const value=await fn();if(value)return value;await new Promise(r=>setTimeout(r,20));}throw Error('Timed out waiting for fixture');}

test('resume ignores host defaults and display labels, but honors authored model and schema',()=>temp(async root=>{
  const file=path.join(root,'journal.jsonl');let calls=0;
  const execute=async(body,defaults,defaultModel)=>{
    const journal=new Journal(file,{reuse:true});await journal.load();
    return runWorkflowSource(header+body,{journal,defaults,defaultModel,runAgent:async()=>`result-${++calls}`});
  };
  assert.equal(await execute('return await agent("inspect",{label:"first"})',{cwd:root,sandbox:'workspace-write',effort:'high'},'one'),'result-1');
  assert.equal(await execute('return await agent("inspect",{label:"second",phase:"Review"})',{cwd:root+'/other',sandbox:'read-only',effort:'low'},'two'),'result-1');
  assert.equal(calls,1);
  assert.equal(await execute('return await agent("inspect",{model:"explicit"})',{},'two'),'result-2');
  await execute('return await agent("inspect",{model:"explicit",schema:{type:"object",properties:{n:{type:"number"}}}})',{},'two');
  assert.equal(calls,3);
}));

test('previous v4 agent entries are retained but not mistaken for v5 results',()=>temp(async root=>{
  const file=path.join(root,'journal.jsonl');
  const old={key:'v4:'+ 'a'.repeat(64),result:'old',outcome:'completed'};
  await fs.writeFile(file,JSON.stringify(old)+'\n');
  const journal=new Journal(file,{reuse:true});await journal.load();
  assert.equal(journal.hit(old.key),false);
  const key=journal.nextKey('inspect',{});assert.match(key,/^v5:/);
  await journal.record(key,'inspect','new');
  assert.ok((await fs.readFile(file,'utf8')).includes(JSON.stringify(old)));
}));

test('forced models ignore authored model changes in the resume chain',()=>temp(async root=>{
  const file=path.join(root,'journal.jsonl');let calls=0;
  for(const model of ['first','second']){
    const journal=new Journal(file,{reuse:true});await journal.load();
    assert.equal(await runWorkflowSource(header+`return await agent("inspect",{model:${JSON.stringify(model)}})`,{
      journal,ignoreRequestedModel:true,runAgent:async(_prompt,opts)=>{assert.equal(opts.model,undefined);return ++calls;},
    }),1);
  }
  assert.equal(calls,1);
}));

test('shared budget retains finished contributions and rejects broken accounting',()=>temp(async root=>{
  const pool=createSharedBudget(root,3),a=joinSharedBudget(pool.descriptor),b=joinSharedBudget(pool.descriptor);
  a.record(7);b.record(5);assert.equal(a.spent(),15);
  pool.recordMain(9);assert.equal(b.spent(),21);
  const resumed=joinSharedBudget(pool.descriptor);resumed.record(2);assert.equal(resumed.spent(),23);
  await fs.writeFile(path.join(pool.descriptor.directory,'main.tokens'),'broken');
  assert.throws(()=>a.spent(),/budget counter/);
}));

async function host(root){
  const config={threadIds:['session'],cwd:root,model:'fixture'};let tools;
  const service=createWorkflowService({root:path.join(root,'runs'),getConfig:()=>config,emit(){},version:'test',home:root,
    core:()=>({command:process.execPath,args:[fixture]}),runnerEnv:()=>({CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS:'0'}),
    onSettled:run=>void tools.settled(run)});
  tools=createWorkflowToolService({workflowService:service,getConfig:()=>config,updateConfig(){},settings:()=>resolveWorkflowSettings({config}),dataRoot:path.join(root,'sessions'),home:root,
    requestApproval:async()=>true,startTurn:async()=>{}});
  const usage=(total,last=0)=>tools.observe({method:'thread/tokenUsage/updated',params:{threadId:'session',tokenUsage:{total:{outputTokens:total},last:{outputTokens:last}}}});
  const turn=async target=>tools.turnStart({threadId:'session',input:[{type:'text',text:`workflow +${target/1000}k`}],cwd:root,model:'fixture',sandboxPolicy:{type:'readOnly'}},{permission:'plan',mode:'code'});
  const launch=async body=>{const text=await tools.launch({script:header+body},{sessionId:'session',cwd:root});return text.match(/\nRun ID: (wf_[\w-]+)/)[1];};
  const done=id=>waitFor(()=>{const run=service.get(id);return run?.status!=='running'&&run;});
  const result=async run=>JSON.parse(await fs.readFile(path.join(run.transcriptDir,'result.json'),'utf8')).result;
  return {service,tools,usage,turn,launch,done,result};
}

test('actual forked workflows share main-model and finished-sibling spend without double counting',()=>temp(async root=>{
  const h=await host(root);
  try{
    h.usage(100);await h.turn(16);h.usage(104,4);
    const body='const before=budget.spent();await agent("FAST");return [before,budget.spent()]';
    assert.deepEqual(await h.result(await h.done(await h.launch(body))),[4,12]);
    assert.deepEqual(await h.result(await h.done(await h.launch(body))),[12,20]);
    // Already-running agents may overshoot, but the next run must not launch one.
    const denied=await h.done(await h.launch('return await agent("FAST")'));
    assert.equal(denied.status,'failed');
    const wire=(await fs.readFile(path.join(root,'workflow-wire.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(wire.filter(q=>q.method==='thread/start').length,2);
    await h.turn(16);
    assert.deepEqual(await h.result(await h.done(await h.launch(body))),[0,8]);
  }finally{await h.service.dispose();}
}));

test('live main-model usage reaches two running processes before they admit an agent',()=>temp(async root=>{
  const h=await host(root);
  try{
    h.usage(100);await h.turn(16);
    // A script waits on its shared budget, so no timing assumption or fixed sleep
    // decides when it tries admission. Host usage releases both processes.
    const body='log("waiting-for-budget");while(budget.spent()<16)await new Promise(r=>setTimeout(r,10));return await agent("FAST")';
    const ids=await Promise.all([h.launch(body),h.launch(body)]);
    await waitFor(async()=>{
      const texts=await Promise.all(ids.map(id=>fs.readFile(path.join(h.service.get(id).transcriptDir,'events.jsonl'),'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;})));
      return texts.every(text=>text.includes('waiting-for-budget'));
    });
    h.usage(116,16);
    const finished=await Promise.all(ids.map(h.done));
    assert.ok(finished.every(run=>run.status==='failed'));
    const wire=(await fs.readFile(path.join(root,'workflow-wire.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(wire.filter(q=>q.method==='thread/start').length,0);
  }finally{await h.service.dispose();}
}));

test('overlapping user turns share new spend while retaining separate starting baselines',()=>temp(async root=>{
  const h=await host(root);
  try{
    h.usage(100);await h.turn(100);
    const older=await h.launch('log("waiting-for-sibling");while(budget.spent()<8)await new Promise(r=>setTimeout(r,10));await agent("FAST");return budget.spent()');
    await waitFor(async()=>fs.readFile(path.join(h.service.get(older).transcriptDir,'events.jsonl'),'utf8').then(text=>text.includes('waiting-for-sibling')).catch(error=>{if(error.code==='ENOENT')return false;throw error;}));
    await h.turn(16);
    assert.equal((await h.done(await h.launch('return await agent("FAST")'))).status,'completed');
    assert.equal(await h.result(await h.done(older)),16);
    const denied=await h.done(await h.launch('return await agent("FAST")'));
    assert.equal(denied.status,'failed','late spend by the earlier turn reaches the new turn');
    const wire=(await fs.readFile(path.join(root,'workflow-wire.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(wire.filter(q=>q.method==='thread/start').length,2);
  }finally{await h.service.dispose();}
}));
