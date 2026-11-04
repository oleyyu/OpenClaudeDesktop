import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {createSessionOperations,reviewTarget}=createRequire(import.meta.url)('../electron/session-operations.cjs');
function setup(handler=()=>undefined,historyMode='paginated',extra={}){
 const config={threadIds:['a'],archivedThreadIds:[],threadMetadata:{},sessionMetadata:{a:{additionalFolders:['/extra']}}}, events=[],requests=[];
 const expected={connectionId:'connection',connectionEpoch:1};
 // Codex 0.155.1: thread/read is metadata-only and the turn boundary comes
 // from thread/turns/list (newest first), so the double no longer serves turns
 // from thread/read. historyMode is the paginated default of >=0.154 threads.
 const client={connection:{approvalConnectionId:'connection',approvalConnectionEpoch:1,closed:false},approvalSnapshot:()=>({closed:false}),request:async(method,params)=>{requests.push({method,params});const override=await handler(method,params);return override ?? (method==='thread/read'?{thread:{id:'a',cwd:'/repo',name:'Original',status:{type:'idle'},historyMode,turns:[]}}:method==='thread/turns/list'?{data:[{id:'last',status:'completed',itemsView:'summary',items:[]}],nextCursor:null,backwardsCursor:null}:method==='thread/fork'?{thread:{id:'b',cwd:'/repo',historyMode,turns:[]}}:{});}};
 let owner=client,saves=0;
 const controller=createSessionOperations({getClient:()=>owner,getConfig:()=>config,save:()=>saves++,emit:e=>events.push(e),verifyGit:async(cwd,target)=>{assert.equal(cwd,'/repo');return target;},...extra});
 return {controller,client,config,events,requests,expected,payload:{threadId:'a',expected,permission:'plan',mode:'code'},swap:()=>{owner={};},saves:()=>saves};
}
const event=(method,id='turn',status='completed')=>({method,params:{threadId:'a',turn:{id,status}}});
test('compact ack remains locked until its actual terminal turn; duplicate send and stale completion rejected',async()=>{
 const s=setup();await s.controller.run({...s.payload,operation:'compact'});
 assert.equal(s.events.at(-1).phase,'starting');assert.equal(s.controller.snapshot().length,1);
 assert.throws(()=>s.controller.reserveMessage('a'),/Wait/);
 s.controller.observe(event('turn/completed','old'));assert.equal(s.controller.snapshot().length,1);
 s.controller.observe(event('turn/started'));assert.equal(s.events.at(-1).phase,'running');
 s.controller.observe(event('turn/completed','old'));assert.equal(s.controller.snapshot().length,1);
 s.controller.observe(event('turn/completed'));assert.equal(s.events.at(-1).phase,'completed');assert.equal(s.controller.snapshot().length,0);
 assert.deepEqual(s.requests.find(x=>x.method==='thread/compact/start').params,{threadId:'a'});
 assert.equal(s.requests.find(x=>x.method==='thread/resume').params.sandbox,'read-only');
});
test('terminal notifications ahead of RPC response cannot resurrect completed operation',async()=>{
 let s;s=setup(method=>{if(method==='thread/compact/start'){s.controller.observe(event('turn/started'));s.controller.observe(event('turn/completed'));return {};}});
 await s.controller.run({...s.payload,operation:'compact'});assert.equal(s.controller.snapshot().length,0);assert.equal(s.events.at(-1).phase,'completed');
});
test('old terminal event during read does not complete new operation',async()=>{
 let s;s=setup(method=>{if(method==='thread/read')s.controller.observe(event('turn/completed'));});
 await s.controller.run({...s.payload,operation:'compact'});assert.equal(s.controller.snapshot()[0].phase,'starting');
});
test('lock acquired synchronously rejects concurrent operations before read resolves',async()=>{
 let resolve;const s=setup(method=>method==='thread/read'?new Promise(r=>resolve=r):undefined);
 const first=s.controller.run({...s.payload,operation:'compact'});await assert.rejects(s.controller.run({...s.payload,operation:'review'}),/Wait/);resolve();await first;
});
test('fork copies last saved boundary, persists owned child and folders, name failure remains a success with warning',async()=>{
 const s=setup(method=>{if(method==='thread/name/set')throw Error('rename failure');});
 const result=await s.controller.run({...s.payload,operation:'fork',name:'Branch copy'});
 assert.equal(result.thread.id,'b');assert.ok(result.warning);assert.ok(s.config.threadIds.includes('b'));assert.equal(s.config.sessionMetadata.b.forkedFrom,'a');assert.deepEqual(s.config.sessionMetadata.b.additionalFolders,['/extra']);assert.equal(s.requests.find(x=>x.method==='thread/fork').params.lastTurnId,'last');assert.equal(s.requests.find(x=>x.method==='thread/fork').params.excludeTurns,true);assert.equal(s.requests.find(x=>x.method==='thread/read').params.includeTurns,false);assert.equal(s.controller.snapshot().length,0);assert.ok(s.saves());
});
test('known successful fork is persisted even when connection changes before response',async()=>{
 let s;s=setup(method=>{if(method==='thread/fork'){s.swap();return {thread:{id:'b',turns:[]}};}});
 const result=await s.controller.run({...s.payload,operation:'fork'});assert.equal(result.thread.id,'b');assert.ok(result.warning);assert.ok(s.config.threadIds.includes('b'));
});
for(const operation of ['compact','fork','review'])test(`${operation} uncertain timeout retains lock until disconnect`,async()=>{
 const method={compact:'thread/compact/start',fork:'thread/fork',review:'review/start'}[operation];
 const s=setup(name=>{if(name===method)throw Error('Request timed out');});
 await assert.rejects(s.controller.run({...s.payload,operation,target:{type:'custom',instructions:'Look for errors'}}),/timed out/);
 assert.equal(s.controller.snapshot()[0].phase,'unknown');assert.throws(()=>s.controller.assertAvailable('a'));
 s.controller.observe({kind:'connection',connected:false});assert.equal(s.controller.snapshot().length,0);assert.equal(s.events.at(-1).phase,'failed');
});
test('review uses inline review API with validated target and manual permission override',async()=>{
 const s=setup();await s.controller.run({...s.payload,operation:'review',permission:'ask',target:{type:'baseBranch',branch:' main '}});
 assert.deepEqual(s.requests.find(x=>x.method==='review/start').params,{threadId:'a',delivery:'inline',target:{type:'baseBranch',branch:'main'}});
 assert.equal(s.requests.find(x=>x.method==='thread/resume').params.approvalPolicy,'untrusted');
 s.controller.observe({method:'item/started',params:{threadId:'a',turnId:'outer',item:{type:'enteredReviewMode'}}});s.controller.observe(event('turn/started','nested'));s.controller.observe(event('turn/completed','outer','interrupted'));assert.doesNotThrow(()=>s.controller.assertAvailable('a'));assert.equal(s.requests.find(x=>x.method==='thread/resume').params.sandbox,'read-only');assert.equal(s.events.at(-1).phase,'failed');assert.equal(s.events.at(-1).error,'Task stopped.');
});
test('validation rejects stale ownership, archived/unknown sessions, busy snapshots and invalid modes without a mutation',async()=>{
 for(const kind of ['connection','archived','unknown','busy','empty','permission']){
 const s=setup(method=>method==='thread/turns/list'&&['busy','empty'].includes(kind)?{data:kind==='empty'?[]:[{id:'last',status:'inProgress',itemsView:'summary',items:[]}],nextCursor:null,backwardsCursor:null}:undefined);
 const payload={...s.payload,operation:'compact'};
 if(kind==='connection')payload.expected={...s.expected,connectionEpoch:2};if(kind==='archived')s.config.archivedThreadIds.push('a');if(kind==='unknown')payload.threadId='foreign';if(kind==='permission')payload.permission='bypass';
 await assert.rejects(s.controller.run(payload));assert.equal(s.requests.filter(x=>!['thread/read','thread/turns/list'].includes(x.method)).length,0,kind);assert.equal(s.controller.snapshot().length,0);
 }
});
test('connection change after read prevents dispatch',async()=>{let s;s=setup(method=>{if(method==='thread/read')s.swap();});await assert.rejects(s.controller.run({...s.payload,operation:'compact'}),/connection changed/);assert.deepEqual(s.requests.map(x=>x.method),['thread/read']);});
test('review target normalization rejects shell option refs, empty, NUL and excessive input',()=>{
 assert.deepEqual(reviewTarget({type:'custom',instructions:' check logic '}),{type:'custom',instructions:'check logic'});
 for(const target of [{type:'baseBranch',branch:' --help'},{type:'commit',sha:'x\ny'},{type:'custom',instructions:'a\0b'},{type:'custom',instructions:'x'.repeat(12001)},{type:'custom',instructions:''},{type:'unsupported'}])assert.throws(()=>reviewTarget(target));
});

 test('review outer completion before response and nested start does not lose identity',async()=>{
 let s;s=setup(method=>{if(method==='review/start'){s.controller.observe(event('turn/started','nested'));s.controller.observe(event('turn/completed','outer'));return {turn:{id:'outer'}};}});
 await s.controller.run({...s.payload,operation:'review',target:{type:'custom',instructions:'Review'}});assert.equal(s.controller.snapshot().length,0);assert.equal(s.events.at(-1).phase,'completed');assert.doesNotThrow(()=>s.controller.assertAvailable('a'));
 });

// A review whose turn ends before it enters review mode (its prompt blocked by a hook, or stopped before its first
// step) under the id of the turn that started for it, not the one review/start answered: the task still ends.
test('a review turn that ends before review mode under its own id still ends the review task',async()=>{
 const s=setup(method=>method==='review/start'?{turn:{id:'turn-msg'}}:undefined);
 await s.controller.run({...s.payload,operation:'review',target:{type:'custom',instructions:'Review'}});
 assert.equal(s.controller.snapshot().length,1);
 s.controller.observe(event('turn/started','turn-n7'));
 s.controller.observe(event('turn/completed','turn-n7','interrupted'));
 assert.equal(s.controller.snapshot().length,0);assert.equal(s.events.at(-1).phase,'failed');assert.equal(s.events.at(-1).error,'Task stopped.');
 assert.doesNotThrow(()=>s.controller.reserveMessage('a')(),'the session takes messages again');
});
test('a review turn that ends before review mode ahead of the review/start answer still ends the task',async()=>{
 let s;s=setup(method=>{if(method==='review/start'){s.controller.observe(event('turn/started','turn-n7'));s.controller.observe(event('turn/completed','turn-n7','interrupted'));return {turn:{id:'turn-msg'}};}});
 await s.controller.run({...s.payload,operation:'review',target:{type:'custom',instructions:'Review'}});
 assert.equal(s.controller.snapshot().length,0);assert.doesNotThrow(()=>s.controller.assertAvailable('a'));
});
test('a review in review mode is ended only by its own turn id',async()=>{
 const s=setup(method=>method==='review/start'?{turn:{id:'outer'}}:undefined);
 await s.controller.run({...s.payload,operation:'review',target:{type:'custom',instructions:'Review'}});
 s.controller.observe(event('turn/started','nested'));
 s.controller.observe({method:'item/started',params:{threadId:'a',turnId:'outer',item:{type:'enteredReviewMode',id:'r'}}});
 s.controller.observe(event('turn/completed','nested'));
 assert.equal(s.controller.snapshot().length,1,'the nested id does not end a review in progress');
 s.controller.observe(event('turn/completed','outer'));
 assert.equal(s.controller.snapshot().length,0);
});

// Codex 0.155.1 deprecations honoured by session operations.
test('paginated sessions never request deprecated full history; legacy keeps the old path',async()=>{
 const paginated=setup();await paginated.controller.run({...paginated.payload,operation:'compact'});
 assert.equal(paginated.requests.filter(x=>x.method==='thread/read'&&x.params.includeTurns).length,0,'no thread/read includeTurns:true');
 assert.equal(paginated.requests.find(x=>x.method==='thread/resume').params.excludeTurns,true);
 assert.ok(paginated.requests.some(x=>x.method==='thread/turns/list'),'the turn boundary comes from the pager');
 const legacy=setup(()=>undefined,'legacy');await legacy.controller.run({...legacy.payload,operation:'compact'});
 assert.equal(legacy.requests.find(x=>x.method==='thread/resume').params.excludeTurns,undefined,'a legacy thread keeps the unpaged resume');
});
test('a server without the pager falls back to a legacy full read and still finds the boundary',async()=>{
 // Observed on the real binary: a thread with no rollout answers the pager with
 // -32601 "list_turns is not supported yet".
 const fallback=setup(method=>{if(method==='thread/turns/list')throw Object.assign(new Error('list_turns is not supported yet'),{code:-32601});
  return method==='thread/read'?{thread:{id:'a',cwd:'/repo',name:'Original',status:{type:'idle'},historyMode:'legacy',turns:[{id:'last',status:'completed',items:[]}]}}:undefined;},'legacy');
 await fallback.controller.run({...fallback.payload,operation:'fork'});
 assert.equal(fallback.requests.find(x=>x.method==='thread/fork').params.lastTurnId,'last');
 assert.equal(fallback.requests.filter(x=>x.method==='thread/read').length,2,'metadata read then the legacy full read');
});
test('review/start never uses the deprecated detached delivery',async()=>{
 for(const historyMode of ['paginated','legacy']){
  const s=setup(()=>undefined,historyMode);
  await s.controller.run({...s.payload,operation:'review',target:{type:'custom',instructions:'Review'}});
  assert.equal(s.requests.find(x=>x.method==='review/start').params.delivery,'inline');
 }
});

test('Bypass fork and compact carry real full-access overrides only with opt-in and allowed requirements; review stays read-only', async()=>{
 for(const operation of ['fork','compact','review']){
  const s=setup(method=>method==='configRequirements/read'?{requirements:null}:undefined);s.config.allowBypassPermissions=true;
  await s.controller.run({...s.payload,permission:'bypass',operation,target:{type:'custom',instructions:'Review'}});
  const request=s.requests.find(r=>r.method===(operation==='fork'?'thread/fork':'thread/resume'));
  assert.equal(request.params.sandbox,operation==='review'?'read-only':'danger-full-access');assert.equal(request.params.approvalPolicy,operation==='review'?'on-request':'never');
  assert.equal(s.requests.filter(r=>r.method==='configRequirements/read').length,operation==='review'?0:1);
 }
 for(const requirements of [{allowedSandboxModes:['workspace-write']},{allowedApprovalPolicies:['on-request']}]){
  const s=setup(method=>method==='configRequirements/read'?{requirements}:undefined);s.config.allowBypassPermissions=true;
  await assert.rejects(s.controller.run({...s.payload,permission:'bypass',operation:'fork'}),/organization/);
  assert.equal(s.requests.some(r=>r.method==='thread/fork'),false);assert.equal(s.controller.snapshot().length,0);
 }
});

test('DeepSeek compact: {} ack then its synthetic turn releases the lock, completed or failed', async()=>{
 for(const [status,error] of [['completed',null],['failed',{message:'No compactable history yet.',codexErrorInfo:null,additionalDetails:null,misalignment:null}]]){
 const s=setup();await s.controller.run({...s.payload,operation:'compact'});
 assert.deepEqual(s.requests.find(x=>x.method==='thread/compact/start').params,{threadId:'a'});
 assert.throws(()=>s.controller.reserveMessage('a'),/Wait/);
 const turn={id:'turn-compact-1',items:[],itemsView:'notLoaded',status:'inProgress',error:null,startedAt:1,completedAt:null,durationMs:null};
 s.controller.observe({method:'turn/started',params:{threadId:'a',turn}});
 s.controller.observe({method:'turn/completed',params:{threadId:'a',turn:{...turn,status,error,completedAt:1,durationMs:3}}});
 assert.deepEqual(s.controller.snapshot(),[]);
 assert.equal(s.events.at(-1).phase,status);assert.equal(s.events.at(-1).error,error?.message??null);
 assert.doesNotThrow(()=>s.controller.reserveMessage('a')());
 }
});

test('compact carries the Plan mode hint and afterPlan only to the DeepSeek core', async()=>{
 const deepseek=setup();deepseek.client.serverInfo={engine:'deepseek-harness'};
 await deepseek.controller.run({...deepseek.payload,operation:'compact',afterPlan:'ask'});
 const resume=deepseek.requests.find(x=>x.method==='thread/resume').params;
 assert.equal(resume.sandbox,'read-only');assert.deepEqual(resume.codeDesktop,{permissionMode:'plan',afterPlan:'ask'});
 const invalid=setup();invalid.client.serverInfo={engine:'deepseek-harness'};
 await invalid.controller.run({...invalid.payload,permission:'auto',operation:'compact',afterPlan:'plan'});
 assert.deepEqual(invalid.requests.find(x=>x.method==='thread/resume').params.codeDesktop,{permissionMode:'auto',afterPlan:'auto'});
 for(const serverInfo of [undefined,{engine:'codex'},{}]){
  const codex=setup();codex.client.serverInfo=serverInfo;
  await codex.controller.run({...codex.payload,operation:'compact',afterPlan:'ask'});
  assert.equal(Object.hasOwn(codex.requests.find(x=>x.method==='thread/resume').params,'codeDesktop'),false);
 }
});
// Settings › Models on Codex: fork and resume (compact/review) go through model-settings' decorateThread with the owner,
// so a session recorded under the other provider still forks and resumes.
test('fork, compact and review pass their params through decorateThread with the owner', async()=>{
 const seen=[];const decorateThread=(method,params,owner)=>{seen.push([method,owner]);if(owner?.serverInfo?.engine!=='deepseek-harness')params.modelProvider??='codedesktop';return params;};
 for(const operation of ['fork','compact','review']){
  const s=setup(undefined,'paginated',{decorateThread});
  await s.controller.run({...s.payload,operation,...(operation==='review'?{target:{type:'uncommittedChanges'}}:{})});
  const method=operation==='fork'?'thread/fork':'thread/resume';
  assert.equal(s.requests.find(x=>x.method===method).params.modelProvider,'codedesktop',operation);
  assert.equal(seen.at(-1)[0],method);assert.equal(seen.at(-1)[1],s.client);
 }
 // A DeepSeek owner passes unchanged; without the hook nothing is added.
 const ds=setup(undefined,'paginated',{decorateThread});ds.client.serverInfo={engine:'deepseek-harness'};
 await ds.controller.run({...ds.payload,operation:'compact'});assert.equal('modelProvider' in ds.requests.find(x=>x.method==='thread/resume').params,false);
 const bare=setup();await bare.controller.run({...bare.payload,operation:'fork'});assert.equal('modelProvider' in bare.requests.find(x=>x.method==='thread/fork').params,false);
});
test('/cd forks the session into another folder (relative to its own), refusing a missing folder, the root and running terminals',async()=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const base=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'cd-fork-'))),repo=path.join(base,'repo'),api=path.join(base,'api');fs.mkdirSync(repo);fs.mkdirSync(api);
 let terminals=[];
 const s=setup((method,params)=>method==='thread/read'?{thread:{id:'a',cwd:repo,name:'Original',status:{type:'idle'},historyMode:'paginated',turns:[]}}
   :method==='thread/backgroundTerminals/list'?{data:terminals}:method==='thread/fork'?{thread:{id:'b',cwd:params.cwd,historyMode:'paginated',turns:[]}}:undefined);
 const result=await s.controller.run({...s.payload,operation:'fork',cwd:'../api'});
 assert.equal(s.requests.find(x=>x.method==='thread/fork').params.cwd,api);
 assert.equal(result.thread.id,'b');
 assert.equal(s.requests.find(x=>x.method==='thread/name/set').params.name,'Original (api)');
 await assert.rejects(s.controller.run({...s.payload,operation:'fork',cwd:'../nowhere'}),/There is no folder/);
 await assert.rejects(s.controller.run({...s.payload,operation:'fork',cwd:'/'}),/filesystem root/);
 terminals=[{processId:'p1',status:'running'}];
 await assert.rejects(s.controller.run({...s.payload,operation:'fork',cwd:api}),/background terminals/);
});
