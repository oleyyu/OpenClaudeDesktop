import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runWorkflowSource} from '../third-party/codex-workflows-runner/src/runWorkflow.js';
import {createRuntime} from '../third-party/codex-workflows-runner/src/runtime.js';
import {Journal} from '../third-party/codex-workflows-runner/src/journal.js';
import {recordTokenUsage,resetMeter} from '../third-party/codex-workflows-runner/src/meter.js';

const fixtures=JSON.parse(await readFile(new URL('./fixtures/workflow-resume-native.json',import.meta.url),'utf8'));
const header='export const meta={name:"resume-fixture",description:"Resume fixture"};\n';
const entries=async file=>(await readFile(file,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
async function temporary(action){
  const directory=await mkdtemp(join(tmpdir(),'workflow-resume-parity-'));
  try{return await action(directory,join(directory,'journal.jsonl'));}
  finally{await rm(directory,{recursive:true,force:true});}
}
const load=async(file,reuse=true)=>{const journal=new Journal(file,{reuse});await journal.load();return journal;};
const summary=output=>({result:output.result,agents:output.workflowProgress.filter(r=>r.type==='workflow_agent').map(r=>({label:r.label,cached:r.cached===true,state:r.state}))});

// Expected decisions and values come from eight actual isolated Claude 2.1.286
// processes. The three journal edits are explicit simulated recovery histories.
for(const fixture of fixtures)test(`native resume chain: ${fixture.name}`,async()=>temporary(async(directory,file)=>{
  const childPath=join(directory,'child.js');
  if(fixture.child)await writeFile(childPath,header+fixture.child);
  let calls=0;
  for(const resumed of [false,true]){
    if(resumed&&fixture.journalEdit){
      const records=await entries(file),target=records.find(e=>e.outcome==='started'&&e.label==='B');
      assert.ok(target);
      const altered=fixture.journalEdit==='result-then-failed'?records:records.filter(e=>e.outcome!=='completed'||e.key!==target.key);
      if(fixture.journalEdit!=='started-only')altered.push({...target,outcome:'failed'});
      if(fixture.journalEdit==='failed-then-started')altered.push(target);
      await writeFile(file,altered.map(JSON.stringify).join('\n')+'\n');
    }
    let output;
    await runWorkflowSource(header+fixture.body,{
      journal:await load(file,resumed),args:{resumed,childPath},onOutput:value=>{output=JSON.parse(value);},
      runAgent:async(prompt,opts)=>{
        if(opts.agentType==='resume-chain-missing-fixture')throw Error('Missing fixture agent');
        calls++;
        const name=/RESUME_CHAIN_CHILD:([\w-]+)/u.exec(prompt)[1];
        return name.startsWith('s1-')?name.slice(3):name;
      },
    });
    assert.deepEqual(summary(output),resumed?fixture.resumed:fixture.first);
  }
  assert.equal(calls,fixture.modelCalls);
}));

test('real cancellation leaves a started attempt and reuses completed later siblings',async()=>temporary(async(_directory,file)=>{
  const runtime=createRuntime({journal:await load(file,false),runAgent:async(prompt,{signal})=>{
    if(prompt!=='B')return prompt;
    await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
  }});
  const a=runtime.agent('A'),b=runtime.agent('B'),c=runtime.agent('C');
  b.catch(()=>{});
  await Promise.all([a,c]);
  await runtime.cancel();
  await assert.rejects(b,/cancelled/);
  const rows=await entries(file);
  assert.deepEqual(rows.filter(r=>r.label==='B').map(r=>r.outcome),['started']);
  const calls=[],resumed=createRuntime({journal:await load(file),runAgent:async prompt=>{calls.push(prompt);return prompt;}});
  try{
    assert.deepEqual(await Promise.all(['A','B','C'].map(p=>resumed.agent(p))),['A','B','C']);
    assert.deepEqual(calls,['B']);
  }finally{await resumed.finalize();}
}));

test('cancelling queued work never records a started provider attempt',async()=>temporary(async(_directory,file)=>{
  let started=0,admitted;
  const gate=new Promise(resolve=>{admitted=resolve;});
  const runtime=createRuntime({journal:await load(file,false),runAgent:async(_prompt,{signal})=>{
    if(++started===runtime.CAP)admitted();
    await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
  }});
  const settled=Promise.allSettled(Array.from({length:runtime.CAP+1},(_,i)=>runtime.agent('call-'+i)));
  await gate;await runtime.cancel();await settled;
  const rows=await entries(file);
  assert.equal(rows.filter(r=>r.outcome==='started').length,runtime.CAP);
  assert.ok(!rows.some(r=>r.label==='call-'+runtime.CAP));
}));

test('a budget failure during admission persists failure instead of an interrupted start',async()=>temporary(async(_directory,file)=>{
  resetMeter();
  const runtime=createRuntime({journal:await load(file,false),budgetTotal:10,runAgent:async()=>assert.fail('must not start')});
  try{
    const promise=runtime.agent('queued');
    recordTokenUsage({threadId:'spent-at-admission',tokenUsage:{total:{outputTokens:20}}});
    await assert.rejects(promise,/budget exceeded/);
    assert.deepEqual((await entries(file)).map(r=>r.outcome),['failed']);
  }finally{await runtime.finalize();resetMeter();}
}));

test('v3 agent entries miss safely once while human/session extension history stays readable',async()=>temporary(async(_directory,file)=>{
  const original=[
    {key:'v3:old-branch-key',label:'A',result:'old A',outcome:'completed'},
    {key:'human:q1#0',result:{answer:'keep'},outcome:'completed'},
    {key:'sess:s1#0',result:'keep session',outcome:'completed'},
  ].map(JSON.stringify).join('\n')+'\n';
  await writeFile(file,original);
  let calls=0;
  for(let attempt=0;attempt<2;attempt++){
    const journal=await load(file);
    assert.equal(journal.hit('human:q1#0'),true);
    assert.equal(journal.get('sess:s1#0'),'keep session');
    assert.equal(await runWorkflowSource(header+'return await agent("A")',{journal,runAgent:async()=>{calls++;return 'new A';}}),'new A');
  }
  assert.equal(calls,1);
  assert.ok((await readFile(file,'utf8')).startsWith(original),'old lines remain intact');
}));
