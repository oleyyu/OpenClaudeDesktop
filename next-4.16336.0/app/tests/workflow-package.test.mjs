import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {extractMeta,runWorkflowSource} from '../third-party/codex-workflows-runner/src/runWorkflow.js';
const runBody = (body, options) => runWorkflowSource('export const meta={name:"fixture",description:"Workflow fixture"}; ' + body, options);
import {Journal} from '../third-party/codex-workflows-runner/src/journal.js';
import {isRetryable} from '../third-party/codex-workflows-runner/src/codexAgent.js';
import {workflowEvent,workflowPhases,mergeWorkflow} from '../src/workflow-progress-model.mjs';
import service from '../electron/workflow-service.cjs';
test('workflow runtime preserves phases, results and structured failures without fabricated protocol events',async()=>{const journal=new Journal(null,{reuse:true}),events=[],phases=[];let calls=0;
 const options={journal,onEvent:e=>events.push(e),onPhase:p=>phases.push(p),runAgent:async(p,o)=>{calls++;o.onMetrics({model:'actual',tokens:{total:10},ms:5});if(p==='bad')throw Error('wire failure');return 'ok';}};
 assert.deepEqual(structuredClone(await runBody('phase("Check"); return await parallel([()=>agent("good"),()=>agent("bad")]);',options)),['ok',null]);assert.equal(calls,2);assert.equal(events.find(e=>e.status==='failed').error,'wire failure');assert.equal(events.filter(e=>e.type==='end').length,2);assert.deepEqual(phases,['Check']);
 assert.equal(extractMeta('export const meta = {name:"test",description:"Test"}').name,'test');assert.equal(extractMeta('export const meta = {name: process.env.HOME}'),null);
 await assert.rejects(runBody('return Date.now();'),/unavailable/);await assert.rejects(runBody('return Math.random();'),/unavailable/);
});
test('camelCase retry classification accepts actual string and object codes, rejecting authorization errors',()=>{assert.equal(isRetryable({codexErrorInfo:'internalServerError'}),true);assert.equal(isRetryable({codexErrorInfo:{httpConnectionFailed:{httpStatusCode:503}}}),true);assert.equal(isRetryable({codexErrorInfo:'unauthorized',message:'socket hang up'}),false);});
test('workflow phases and per-agent ids survive replay, stale snapshots, failure, stop, and absent usage',()=>{let run={id:'r',startedAt:1000,status:'running',workflowProgress:[]};const entries=[{type:'phase',title:'Analyze'},{type:'start',id:'a',label:'same',phase:'Analyze'},{type:'start',id:'b',label:'same',phase:'Analyze'},{type:'progress',id:'a'},{type:'end',id:'a',tokens:123,ms:44,model:'actual'},{type:'settled',status:'stopped'}];const reduce=()=>entries.reduce((r,e,i)=>workflowEvent(r,e,1000+i),run);const result=reduce();assert.deepEqual(result,reduce());assert.equal(result.workflowProgress.length,3);assert.equal(result.workflowProgress[2].state,'error');assert.equal(result.workflowProgress[2].tokens,undefined);assert.equal(result.usage.totalTokens,123);const old=workflowEvent(run,entries[1],1000);assert.equal(workflowPhases(old,91001)[0].agents[0].displayState,'stalled');assert.equal(mergeWorkflow([result],old)[0],result);});
test('isolated real Node child persists results and stops an infinite script without GUI',async()=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'code-workflows-'));const records=[],sent=[];const config={threadIds:['t'],cwd:root,dynamicWorkflows:true};const {fork}=await import('node:child_process');
 // Records the start message the real child receives (the core command and its own arguments).
 const spawn=(file,args,options)=>{const child=fork(file,args,options);const send=child.send.bind(child);child.send=(message,...rest)=>{sent.push(message);return send(message,...rest);};return child;};
 const server=service.createWorkflowService({root:path.join(root,'runs'),getConfig:()=>config,emit:e=>records.push(e),command:'/does/not/exist',args:['x.mjs','app-server','--stdio'],version:'test',spawn});try{
 const file=path.join(root,'simple.workflow.js');await fs.writeFile(file,'export const meta={name:"fixture",description:"Workflow fixture"}; phase("Plan"); return await agent("inspect",{label:"Inspect"});');
 let run=await server.start({threadId:'t',file,plan:true,args:{depth:1}});await until(async()=>{run=(await server.list('t'))[0];return run.status!=='running';});assert.equal(run.status,'completed');assert.equal(sent[0].command,'/does/not/exist');assert.deepEqual(sent[0].commandArgs,['x.mjs','app-server','--stdio']);assert.deepEqual(sent[0].args,{depth:1},'workflow arguments keep their own field');assert.equal(run.plannedAgents,1);assert.equal(run.workflowProgress.filter(p=>p.type==='workflow_agent').length,0);assert.equal(JSON.parse(await fs.readFile(path.join(root,'runs',run.id,'result.json'),'utf8')).result,'');
 const infinite=path.join(root,'infinite.workflow.js');await fs.writeFile(infinite,'export const meta={name:"fixture",description:"Workflow fixture"}; return await new Promise(()=>{});');const stopRun=await server.start({threadId:'t',file:infinite,plan:true});const stopped=await server.stop(stopRun.id);assert.equal(stopped.status,'stopped');assert.equal(await fs.readFile(path.join(root,'runs',stopRun.id,'result.json'),'utf8'),'');assert.equal(records.at(-1).run.status,'stopped');await assert.rejects(server.start({threadId:'foreign',file}),/session/);
 }finally{await server.dispose();await fs.rm(root,{recursive:true,force:true});}
});
async function until(fn){const end=Date.now()+10000;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('Workflow child did not settle');}

test('alternate output matches recorded native files for values, logs and repeated phases',async()=>{
 const native=JSON.parse(await fs.readFile(new URL('../../vendor/deepseek-harness/packages/workflow/workflow-ptc/tests/fixtures/output-native.json',import.meta.url),'utf8'));
 const scripts={object:'log("first");phase("Inspect");return {answer:42}',undefined:'log("no return")',null:'return null',phases:'phase("First");phase("Second");phase("First");return 1'};
 for(const [name,script] of Object.entries(scripts)){
  let output;
  await runWorkflowSource('export const meta={name:"output",description:"Workflow result and logs"};'+script,{onOutput:text=>{output=text;}});
  assert.equal(output,native.find(row=>row.name===name).fileText,name);
 }
});

test('alternate output preserves agent previews and actual activity totals',async()=>{
 let output;
 const result=await runBody('phase("Inspect");return await agent("  inspect  ",{label:"Answer"})',{
  onOutput:text=>{output=JSON.parse(text)},
  runAgent:async(prompt,options)=>{options.onActivity({toolCalls:1,lastToolName:'Read'});options.onMetrics({model:'fixture',tokens:{total:14,output:4},toolCalls:1,ms:3});return 'x'.repeat(120000);},
 });
 assert.equal(result.length,120000);assert.equal(output.result,result);assert.equal(output.totalTokens,14);assert.equal(output.totalToolCalls,1);
 const agent=output.workflowProgress.at(-1);
 assert.equal(agent.resultPreview,'x'.repeat(400)+'…');assert.equal(agent.promptPreview,'inspect');assert.equal(agent.state,'done');assert.equal(agent.phaseIndex,1);assert.equal(agent.lastToolName,'Read');assert.equal(agent.attempt,1);
});

test('real hosted child copies the engine artifact intact after release while limiting the displayed value',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'workflow-hosted-output-'));
 const {fork}=await import('node:child_process');
 const server=service.createWorkflowService({root:path.join(root,'runs'),getConfig:()=>({threadIds:['t'],cwd:root,dynamicWorkflows:true}),emit:()=>{},command:process.execPath,args:[path.resolve('tests/fixtures/workflow-hosted-server.cjs')],version:'test',spawn:(file,args,options)=>fork(file,args,{...options,env:{...options.env,CODEX_HOME:path.join(root,'codex-home')}})});
 try{
  const file=path.join(root,'hosted.js');await fs.writeFile(file,'export const meta={name:"hosted",description:"Hosted fixture"};return 42');
  let run=await server.start({threadId:'t',file});await until(async()=>{run=(await server.list('t')).find(row=>row.id===run.id);return run.status!=='running'});
  assert.equal(run.status,'completed',run.summary);assert.equal(run.result,null);
  const fileText=await fs.readFile(path.join(root,'runs',run.id,'result.json'),'utf8');
  assert.equal(fileText,await fs.readFile(path.join(root,'engine.output'),'utf8'));
  assert.equal(JSON.parse(fileText).result.text.length,120000);assert.deepEqual(JSON.parse(fileText).logs,['engine log']);
  const requests=(await fs.readFile(path.join(root,'hosted-rpc.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  const release=requests.find(request=>request.method==='codeDesktop/workflow/releaseScript');
  assert.equal(release.params.attemptId,'hosted-attempt');assert.equal(requests.some(request=>request.method==='turn/start'),false);
 }finally{await server.dispose();await fs.rm(root,{recursive:true,force:true})}
});

test('resume reuses only actual persisted agent results and invalidates changed prompts',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'workflow-journal-'));try{const file=path.join(dir,'journal.jsonl');let calls=0;const run=async(source)=>{const journal=new Journal(file,{reuse:true});await journal.load();return runBody(source,{journal,runAgent:async()=>{calls++;return 'real-result';}});};assert.equal(await run('return await agent("same");'),'real-result');assert.equal(await run('return await agent("same");'),'real-result');assert.equal(calls,1);await run('return await agent("changed");');assert.equal(calls,2);}finally{await fs.rm(dir,{recursive:true,force:true});}});

test('live fixture agents send real read-only RPCs, finish before/after start ack, replay journal and clean up app-server',async()=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'workflow-wire-'));const {fork}=await import('node:child_process');const server=service.createWorkflowService({root:path.join(root,'runs'),getConfig:()=>({threadIds:['t'],cwd:root,dynamicWorkflows:true}),emit:()=>{},command:path.resolve('tests/fixtures/workflow-server.cjs'),version:'test',spawn:(file,args,options)=>fork(file,args,{...options,env:{...options.env,CODEX_HOME:path.join(root,'codex-home')}})});try{const file=path.join(root,'live.workflow.js');await fs.writeFile(file,'export const meta={name:"fixture",description:"Workflow fixture"}; phase("Check"); return await parallel([()=>agent("FAST"),()=>agent("FAIL")]);');let run=await server.start({threadId:'t',file,model:'fixture'});await until(async()=>{run=(await server.list('t')).find(r=>r.id===run.id);return run.status!=='running';});assert.equal(run.status,'completed');const agents=run.workflowProgress.filter(p=>p.type==='workflow_agent');assert.equal(agents.filter(a=>a.state==='error').length,1);assert.equal(agents.find(a=>a.label==='FAST').tokens,20,'the journal start write lets either agent start first');const trace=(await fs.readFile(path.join(root,'workflow-wire.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);assert.equal(trace.filter(q=>q.method==='thread/start').length,2);assert.ok(trace.filter(q=>q.method==='thread/start').every(q=>q.params.sandbox==='read-only'&&q.params.approvalPolicy==='never'));const resumed=await server.start({threadId:'t',file,model:'fixture',resumeId:run.id});await until(async()=>{const next=(await server.list('t')).find(r=>r.id===resumed.id);return next.status==='completed';});const after=(await fs.readFile(path.join(root,'workflow-wire.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);assert.equal(after.filter(q=>q.method==='thread/start').length,3,'Successful agent is cached; failed agent actually reruns');}finally{await server.dispose();await fs.rm(root,{recursive:true,force:true});}});

test('event journal restores completed state, rejects stale/corrupt tails, and recovery never invents an exit time',async()=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'workflow-replay-'));const id='00000000-0000-4000-8000-000000000001',directory=path.join(root,id);await fs.mkdir(directory);const origin={id,threadId:'t',status:'running',startedAt:1000,sequence:0,workflowProgress:[]};await fs.writeFile(path.join(directory,'origin.json'),JSON.stringify(origin));const entries=[{sequence:1,at:1001,event:{type:'phase',title:'Check'}},{sequence:2,at:1002,event:{type:'start',id:'a',label:'A'}},{sequence:3,at:1003,event:{type:'end',id:'a',tokens:12,ms:1}},{sequence:4,at:1004,event:{type:'settled',status:'completed'}}];await fs.writeFile(path.join(directory,'events.jsonl'),entries.map(JSON.stringify).join('\n')+'\n{"truncated":');const make=()=>service.createWorkflowService({root,getConfig:()=>({threadIds:['t']}),emit:()=>{},version:'test'});let runner=make();let restored=(await runner.list('t'))[0];assert.equal(restored.status,'completed');assert.equal(restored.usage.totalTokens,12);assert.equal(restored.durationMs,4);await runner.dispose();await fs.writeFile(path.join(directory,'events.jsonl'),JSON.stringify(entries[0])+'\n');runner=make();restored=(await runner.list('t'))[0];assert.equal(restored.status,'failed');assert.equal(restored.durationMs,undefined);assert.equal(restored.completedAt,undefined);await runner.dispose();await fs.rm(root,{recursive:true,force:true});});

test('workflow agents run on the session core: the DeepSeek bridge gets its script and app-server --stdio',async()=>{
 assert.deepEqual(service.workflowCoreCommand({kind:'deepseek',command:'/n',prefix:['/s']}),{command:'/n',args:['/s','app-server','--stdio'],workflowScripts:true});
 assert.deepEqual(service.workflowCoreCommand({kind:'codex',command:'/usr/local/bin/codex',prefix:[]}),{command:'/usr/local/bin/codex',workflowScripts:false},'Codex keeps the runner default arguments');
 assert.deepEqual(service.workflowCoreCommand({kind:'override',command:'/fixture',prefix:[]}),{command:'/fixture'});
 assert.deepEqual(service.workflowCoreCommand({kind:'deepseek',command:'/n',prefix:['/s']},'/explicit'),{command:'/explicit'},'CODE_DESKTOP_WORKFLOW_BINARY wins');
 // A Node-script core (like the bridge) launched through the real runner: node + script + app-server --stdio.
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'workflow-core-'));const {fork}=await import('node:child_process');
 const core=service.workflowCoreCommand({kind:'deepseek',command:process.execPath,prefix:[path.resolve('tests/fixtures/workflow-server.cjs')]});
 const server=service.createWorkflowService({root:path.join(root,'runs'),getConfig:()=>({threadIds:['t'],cwd:root,dynamicWorkflows:true}),emit:()=>{},command:core.command,args:core.args,version:'test',spawn:(file,args,options)=>fork(file,args,{...options,env:{...options.env,CODEX_HOME:path.join(root,'codex-home')}})});
 try{const file=path.join(root,'core.workflow.js');await fs.writeFile(file,'export const meta={name:"fixture",description:"Workflow fixture"}; return await agent("FAST");');let run=await server.start({threadId:'t',file,model:'fixture'});await until(async()=>{run=(await server.list('t')).find(r=>r.id===run.id);return run.status!=='running';});assert.equal(run.status,'completed');
  const trace=(await fs.readFile(path.join(root,'workflow-wire.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);assert.deepEqual(trace.find(q=>q.argv)?.argv,['app-server','--stdio']);assert.equal(trace.filter(q=>q.method==='thread/start').length,1);
 }finally{await server.dispose();await fs.rm(root,{recursive:true,force:true});}
});

test('a launch in an editing Mode gives agents workspace-write access, never more',async()=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'workflow-write-'));const {fork}=await import('node:child_process');const server=service.createWorkflowService({root:path.join(root,'runs'),getConfig:()=>({threadIds:['t'],cwd:root,dynamicWorkflows:true}),emit:()=>{},command:path.resolve('tests/fixtures/workflow-server.cjs'),version:'test',spawn:(file,args,options)=>fork(file,args,{...options,env:{...options.env,CODEX_HOME:path.join(root,'codex-home')}})});try{
 const file=path.join(root,'write.workflow.js');await fs.writeFile(file,'export const meta={name:"fixture",description:"Workflow fixture"}; return await agent("FAST",{sandbox:"danger-full-access"});');
 let run=await server.start({threadId:'t',file,model:'fixture',access:'workspace-write'});assert.equal(run.access,'workspace-write');await until(async()=>{run=(await server.list('t')).find(r=>r.id===run.id);return run.status!=='running';});assert.equal(run.status,'completed');
 const starts=(await fs.readFile(path.join(root,'workflow-wire.jsonl'),'utf8')).trim().split('\n').map(JSON.parse).filter(q=>q.method==='thread/start');
 assert.equal(starts.length,1);assert.equal(starts[0].params.sandbox,'workspace-write','a script cannot raise the launch access');assert.equal(starts[0].params.approvalPolicy,'never');
 const resumed=await server.start({threadId:'t',file,model:'fixture',resumeId:run.id});assert.equal(resumed.id,run.id,'a resume continues the same run, whatever the access now is (Claude Code)');assert.equal(resumed.access,'read-only','never more than the resume asks for');await until(async()=>{const next=(await server.list('t')).find(r=>r.id===run.id);return next.status!=='running';});assert.equal((await server.list('t')).filter(r=>r.id===run.id).length,1,'one run row');await assert.rejects(server.start({threadId:'t',file,model:'fixture',access:'root'}),/valid workflow access/);
}finally{await server.dispose();await fs.rm(root,{recursive:true,force:true});}});

test('workflow agents on a Codex core with Settings › Models overrides get app-server --stdio, the -c args and the core env',async()=>{
 assert.deepEqual(service.workflowCoreCommand({kind:'codex',command:'/c',prefix:[],args:['-c','a=1'],env:{K:'v'}}),{command:'/c',args:['app-server','--stdio','-c','a=1'],env:{K:'v'},workflowScripts:false});
 assert.deepEqual(service.workflowCoreCommand({kind:'codex',command:'/c',prefix:[],args:[]}),{command:'/c',workflowScripts:false},'no overrides: the runner default');
 // Through the real runner: a Codex-like binary (no prefix) that logs its argv and environment, then serves the fixture protocol.
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'workflow-codex-'));const {fork}=await import('node:child_process');
 const binary=path.join(root,'codex');await fs.writeFile(binary,`#!${process.execPath}\nrequire('node:fs').appendFileSync(${JSON.stringify(path.join(root,'launch.jsonl'))},JSON.stringify({argv:process.argv.slice(2),K:process.env.K??null,DEEPSEEK_API_KEY:process.env.DEEPSEEK_API_KEY??null})+'\\n');\nrequire(${JSON.stringify(path.resolve('tests/fixtures/workflow-server.cjs'))});\n`,{mode:0o755});
 let launch={command:binary,args:['app-server','--stdio','-c','a=1'],env:{K:'v',DEEPSEEK_API_KEY:undefined}};
 const saved=process.env.DEEPSEEK_API_KEY;process.env.DEEPSEEK_API_KEY='leak';
 const server=service.createWorkflowService({root:path.join(root,'runs'),getConfig:()=>({threadIds:['t'],cwd:root,dynamicWorkflows:true}),emit:()=>{},core:()=>launch,version:'test',spawn:(file,args,options)=>fork(file,args,{...options,env:{...options.env,CODEX_HOME:path.join(root,'codex-home')}})});
 try{const file=path.join(root,'codex.workflow.js');await fs.writeFile(file,'export const meta={name:"fixture",description:"Workflow fixture"}; return await agent("FAST");');
  const finish=async()=>{let run=await server.start({threadId:'t',file,model:'fixture'});await until(async()=>{run=(await server.list('t')).find(r=>r.id===run.id);return run.status!=='running';});assert.equal(run.status,'completed',run.error);};
  await finish();
  assert.deepEqual((await fs.readFile(path.join(root,'launch.jsonl'),'utf8')).trim().split('\n').map(JSON.parse),[{argv:['app-server','--stdio','-c','a=1'],K:'v',DEEPSEEK_API_KEY:null}]);
  // The getter is read at each start: a provider change reaches the next run.
  launch={...launch,args:['app-server','--stdio','-c','b=2'],env:{K:'w'}};await finish();
  assert.deepEqual((await fs.readFile(path.join(root,'launch.jsonl'),'utf8')).trim().split('\n').map(JSON.parse).at(-1),{argv:['app-server','--stdio','-c','b=2'],K:'w',DEEPSEEK_API_KEY:'leak'});
 }finally{if(saved===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=saved;await server.dispose();await fs.rm(root,{recursive:true,force:true});}
});
test('real workflow child preserves absent results, explicit null and formatted thrown values',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'workflow-result-'));
 const server=service.createWorkflowService({root:path.join(root,'runs'),getConfig:()=>({threadIds:['t'],cwd:root,dynamicWorkflows:true}),emit:()=>{},command:'/does/not/exist',version:'test'});
 try{
  for(const [name,body] of [['absent','return undefined'],['null','return null'],['failure','throw {name:"Failure",message:"retained",stack:"  at first\\n  at second"}']]){
   const file=path.join(root,name+'.js');await fs.writeFile(file,'export const meta={name:"fixture",description:"Result fixture"};'+body);
   let run=await server.start({threadId:'t',file,plan:true});await until(async()=>{run=(await server.list('t')).find(r=>r.id===run.id);return run.status!=='running'});
   assert.equal(run.status,name==='failure'?'failed':'completed');
   if(name==='null'){assert.equal(run.result,null);assert.equal(JSON.parse(await fs.readFile(path.join(root,'runs',run.id,'result.json'),'utf8')).result,null)}
   else if(name==='absent'){assert.equal(run.result,undefined);assert.equal(Object.hasOwn(JSON.parse(await fs.readFile(path.join(root,'runs',run.id,'result.json'),'utf8')),'result'),false)}
   else {assert.equal(run.summary,'Failure: retained\n  at first\n  at second');assert.equal(await fs.readFile(path.join(root,'runs',run.id,'result.json'),'utf8'),'');}
  }
 }finally{await server.dispose();await fs.rm(root,{recursive:true,force:true})}
});
