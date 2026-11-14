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
// W14-code fr6-03: official cd54a5401 forkDisabledReason (caec4a2d4 kn) has no running reason, and /btw already forks a
// running parent (btw-sessions.cjs). A running session forks through its newest ended turn, or names no turn when none
// has ended; compact and review still refuse while it runs.
test('fr6-03: a running session forks through its newest ended turn (or none); compact and review still refuse',async()=>{
 const running=[{id:'live',status:'inProgress',itemsView:'summary',items:[]},{id:'done',status:'completed',itemsView:'summary',items:[]}];
 const s=setup(method=>method==='thread/turns/list'?{data:running,nextCursor:null,backwardsCursor:null}:method==='thread/read'?{thread:{id:'a',cwd:'/repo',name:'Original',status:{type:'active'},historyMode:'paginated',turns:[]}}:undefined);
 s.controller.observe(event('turn/started','live'));
 assert.equal(s.controller.isActive('a'),true);
 const result=await s.controller.run({...s.payload,operation:'fork'});
 assert.equal(result.thread.id,'b');
 assert.equal(s.requests.find(x=>x.method==='thread/fork').params.lastTurnId,'done');
 for(const operation of ['compact','review']){
  await assert.rejects(s.controller.run({...s.payload,operation,target:{type:'uncommittedChanges'}}),/Wait for the current task to finish or stop it first\./);
 }
 const first=setup(method=>method==='thread/turns/list'?{data:[running[0]],nextCursor:null,backwardsCursor:null}:undefined);
 first.controller.observe(event('turn/started','live'));
 await first.controller.run({...first.payload,operation:'fork'});
 assert.ok(!('lastTurnId' in first.requests.find(x=>x.method==='thread/fork').params));
 const busy=setup(method=>method==='thread/turns/list'?{data:running,nextCursor:null,backwardsCursor:null}:undefined);
 await assert.rejects(busy.controller.run({...busy.payload,operation:'compact'}),/This session is still running\. Wait or stop it first\./);
});
// W14-code fr7-02: official cd54a5401 forkDisabledReason and cf74bc599 WN fork_code_session have no archived condition
// (the harness thread/fork reads an archived log as any other). An archived session — kept in archivedThreadIds, not
// threadIds — forks into a new active session and stays archived; compact and review still refuse it, an unknown id too.
test('fr7-02: an archived session forks; compact and review still refuse it',async()=>{
 const s=setup();s.config.threadIds=[];s.config.archivedThreadIds=['a'];
 const result=await s.controller.run({...s.payload,operation:'fork'});
 assert.equal(result.thread.id,'b');assert.deepEqual(s.config.threadIds,['b']);assert.deepEqual(s.config.archivedThreadIds,['a']);
 assert.equal(s.config.sessionMetadata.b.forkedFrom,'a');
 for(const operation of ['compact','review'])
  await assert.rejects(s.controller.run({...s.payload,operation,target:{type:'uncommittedChanges'}}),/Open an active session first\./);
 await assert.rejects(s.controller.run({...s.payload,threadId:'foreign',operation:'fork'}),/Open an active session first\./);
 // Deleted while the fork read the thread: no dispatch.
 let gone;gone=setup(method=>{if(method==='thread/read'){gone.config.archivedThreadIds=[];}});gone.config.threadIds=[];gone.config.archivedThreadIds=['a'];
 await assert.rejects(gone.controller.run({...gone.payload,operation:'fork'}),/no longer active/);
 assert.ok(!gone.requests.some(x=>x.method==='thread/fork'));
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
// W14-code r4 fr4-01 / fr4-13b: 3.6556.2 ce4f4374c $e offers Archive / Delete on a running session (no disabled state) and
// shared-20 G1uB+fnj7o says working sessions "stop if you archive them too": stopForRemoval interrupts the running turn,
// waits for its turn/completed, and only then lets the archive / delete go on.
test('stopForRemoval: a running turn is interrupted and its end awaited before the removal goes on', async () => {
 const s = setup();
 s.controller.observe(event('turn/started', 't1'));
 assert.throws(() => s.controller.assertAvailable('a'), /Wait/);
 const calls = []; let settled = false;
 const done = s.controller.stopForRemoval('a', { interrupt: async (threadId, turnId) => { calls.push([threadId, turnId]); } }).then(() => { settled = true; });
 await new Promise((resolve) => setImmediate(resolve));
 assert.deepEqual(calls, [['a', 't1']], 'the running turn is interrupted');
 assert.equal(settled, false, 'it waits for the turn to end');
 s.controller.observe(event('turn/completed', 'other'));
 await new Promise((resolve) => setImmediate(resolve));
 assert.equal(settled, false, 'another turn ending does not release it');
 s.controller.observe(event('turn/completed', 't1', 'interrupted'));
 await done;
 assert.equal(settled, true);
 assert.equal(s.controller.isActive('a'), false);
});
test('stopForRemoval: an idle session goes on at once; a dropped connection releases the wait; a turn that never ends refuses', async () => {
 const idle = setup(); let interrupted = 0;
 await idle.controller.stopForRemoval('a', { interrupt: async () => { interrupted++; } });
 assert.equal(interrupted, 0, 'nothing to stop');
 const dropped = setup();
 dropped.controller.observe(event('turn/started', 't2'));
 const waiting = dropped.controller.stopForRemoval('a', { interrupt: async () => {} });
 dropped.controller.observe({ kind: 'connection', connected: false });
 await waiting;
 const stuck = setup();
 stuck.controller.observe(event('turn/started', 't3'));
 await assert.rejects(stuck.controller.stopForRemoval('a', { interrupt: async () => {}, timeoutMs: 20 }), /Wait for the current task to finish or stop it first/);
 const failing = setup();
 failing.controller.observe(event('turn/started', 't4'));
 await assert.rejects(failing.controller.stopForRemoval('a', { interrupt: async () => { throw new Error('no stop'); } }), /no stop/);
 // A failed interrupt leaves no waiter behind: the next turn end does nothing odd.
 failing.controller.observe(event('turn/completed', 't4'));
 assert.equal(failing.controller.isActive('a'), false);
});
test('main.cjs: thread/archive and thread/delete stop a running session first (no more running refusal in the renderer)', async () => {
 const { readFileSync } = await import('node:fs');
 const main = readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
 assert.match(main, /if \(p\.method === "thread\/archive" \|\| p\.method === "thread\/delete"\) await sessionOperations\.stopForRemoval\(params\.threadId, \{ interrupt: \(threadId, turnId\) => \{/);
 assert.match(main, /const sent = interruptTurn\(client, \{ threadId, turnId, expected: \{ connectionId: connection\?\.approvalConnectionId, connectionEpoch: connection\?\.approvalConnectionEpoch \},\s*\.\.\.\(activeGoals\.has\(threadId\) \? \{ pauseGoal: true \} : \{\}\) \}\);/);
 assert.match(main, /if \(\['thread\/archive', 'thread\/delete'\]\.includes\(p\.method\)\) await sessionOperations\.stopForRemoval\(params\.threadId, \{ interrupt: \(threadId, turnId\) => coworkSessions\.request\('turn\/interrupt', \{ threadId, turnId \}\) \}\);/);
 assert.doesNotMatch(main, /if \(p\.method === "thread\/archive"\) sessionOperations\.assertAvailable/);
 const renderer = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
 assert.doesNotMatch(renderer, /Stop the running task before (archiving|deleting) it\./);
 const official = readFileSync(new URL('../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/ce4f4374c-BhSG0KEl.js', import.meta.url), 'utf8');
 assert.ok(official.includes('shortcut:"a",onClick:l("archive",o)'), 'official Archive: no disabled');
 assert.ok(/shortcut:"d",variant:"danger",onClick:l\("delete",c\)/.test(official), 'official Delete: no disabled');
});
