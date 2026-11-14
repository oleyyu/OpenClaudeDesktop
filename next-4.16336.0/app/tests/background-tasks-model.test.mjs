import {fileRunState} from "../src/file-tool-model.mjs";
import test from 'node:test';import assert from 'node:assert/strict';
import {backgroundTasks,taskSections,taskOutput,dismissedTasks,earlierOutputCut,createDismissedTasksStore,DISMISSED_TASKS_KEY,stopsInDuration,stopsInLabel,monitorTasks,commandTaskTitle} from '../src/background-tasks-model.mjs';
import {reduce,emptyState} from '../src/state.js';import background from '../electron/background-tasks.cjs';
const terminal={itemId:'cmd',processId:'42',command:'sleep 30',cwd:'/tmp'};
const state=(item)=>({...emptyState,approvalConnectionId:'c',items:{parent:item?[item]:[]},background:{parent:{connectionId:'c',terminals:[terminal],knownTerminals:{cmd:terminal}}}});
test('tasks use actual process membership, timestamps and status; missing terminal remains unknown, not completed',()=>{let s=state();let tasks=backgroundTasks(s,'parent');assert.equal(tasks[0].status,'running');assert.equal(tasks[0].startedAt,null);s.background.parent.terminals=[];tasks=backgroundTasks(s,'parent');assert.equal(tasks[0].status,'unknown');assert.equal(taskSections(tasks).finished.length,0);assert.deepEqual(taskSections(tasks).running.map(t=>t.status),['unknown'],'W14-code r5pa-05: cccc2cf0a has no Status unavailable section; an unknown task stays under Running');s=state({id:'cmd',type:'commandExecution',processId:'42',command:'false',status:'completed',exitCode:1,durationMs:3});assert.equal(backgroundTasks(s,'parent')[0].status,'completed');assert.equal(backgroundTasks(s,'parent')[0].durationMs,3);assert.equal(backgroundTasks(state(),'parent',{connected:false})[0].status,'unknown');});
test('child tasks are isolated, usage stays absent until reported and live turn identity enables stop',()=>{const s={...emptyState,items:{parent:[{id:'spawn',type:'collabAgentToolCall',tool:'spawnAgent',receiverThreadIds:['child'],agentsStates:{child:{status:'running'}}}],other:[{id:'x',type:'commandExecution',processId:'foreign',status:'inProgress'}]},active:{child:'turn-c'},usage:{child:{total:{totalTokens:19}}},taskTurnFacts:{child:{startedAt:20}}};const tasks=backgroundTasks(s,'parent');assert.equal(tasks.length,1);assert.equal(tasks[0].turnId,'turn-c');assert.equal(tasks[0].tokens,19);assert.equal(tasks[0].toolUses,null);assert.equal(tasks[0].startedAt,20000);assert.equal(backgroundTasks(s,'other').length,1);});
test('background snapshots are tied to connection and retain missing terminal metadata for unknown state',()=>{let s={...emptyState,approvalConnectionId:'c'};assert.equal(reduce(s,{type:'backgroundSnapshot',id:'p',connectionId:'stale',snapshot:{terminals:[terminal]}}),s);s=reduce(s,{type:'backgroundSnapshot',id:'p',connectionId:'c',snapshot:{terminals:[terminal],children:[]}});s=reduce(s,{type:'backgroundSnapshot',id:'p',connectionId:'c',snapshot:{terminals:[],children:[]}});assert.equal(backgroundTasks(s,'p')[0].description,'sleep 30');assert.equal(backgroundTasks(s,'p')[0].status,'unknown');});
test('dismissal is bounded, new running work reappears, output tail is exact',()=>{const map=Object.fromEntries(Array.from({length:120},(_,i)=>['s'+i,['old']]));const next=dismissedTasks(map,'active',Array.from({length:1200},(_,i)=>String(i)),['1199']);assert.equal(Object.keys(next).length,100);assert.equal(next.active.length,1000);assert.equal(next.active.includes('1199'),false);assert.equal(taskOutput('a'.repeat(8001)),'(Earlier output not shown)\n'+'a'.repeat(8000));});
test('terminal stop requires an observed member on the exact connection; ack does not synthesize state',async()=>{const calls=[],owner={connection:{approvalConnectionId:'c',approvalConnectionEpoch:3},approvalSnapshot:()=>({closed:false}),start:async()=>{},request:async(method,params)=>{calls.push({method,params});return method==='thread/list'?{data:[{id:'child',parentThreadId:'p'},{id:'foreign',parentThreadId:'x'}],nextCursor:null}:method==='thread/backgroundTerminals/list'?{data:[terminal],nextCursor:null}:{terminated:true};}};const operations=background.createBackgroundTasks({getClient:()=>owner,getConfig:()=>({threadIds:['p']})});await assert.rejects(operations.read({threadId:'foreign'}),/Unknown/);const snapshot=await operations.read({threadId:'p'});assert.equal(snapshot.children.length,1);assert.throws(()=>operations.terminate({threadId:'p',processId:'42',expected:{connectionId:'old',connectionEpoch:3}}),/connection changed/);await assert.rejects(async()=>operations.terminate({threadId:'p',processId:'alien',expected:{connectionId:'c',connectionEpoch:3}}),/no longer/);const result=await operations.terminate({threadId:'p',processId:'42',expected:{connectionId:'c',connectionEpoch:3}});assert.deepEqual(result,{terminated:true});assert.equal(calls.filter(c=>c.method.endsWith('/terminate')).length,1);assert.equal(snapshot.terminals.length,1);});

test('a restarted connection on the same client invalidates snapshots and stop membership',async()=>{const owner={connection:{approvalConnectionId:'a',approvalConnectionEpoch:1},approvalSnapshot:()=>({closed:false}),start:async()=>{},request:async(method)=>method==='thread/list'?{data:[],nextCursor:null}:{data:[terminal],nextCursor:null}};const operations=background.createBackgroundTasks({getClient:()=>owner,getConfig:()=>({threadIds:['p']})});await operations.read({threadId:'p'});owner.connection={approvalConnectionId:'b',approvalConnectionEpoch:2};owner.request=async()=>({data:[],nextCursor:null});await assert.rejects(async()=>operations.terminate({threadId:'p',processId:'42',expected:{connectionId:'b',connectionEpoch:2}}),/no longer/);owner.request=async()=>{owner.connection={...owner.connection};return {data:[],nextCursor:null};};await assert.rejects(operations.read({threadId:'p'}),/Connection changed/);});

// panes-tile-current Ub:14808–14870: a live start stays running. A list
// requested before that start cannot negate it; a fresh omission is unknown.
const startCommand=(s,processId='42')=>reduce(s,{event:{method:'item/started',params:{threadId:'parent',turnId:'turn',item:{id:'cmd',type:'commandExecution',processId,command:'sleep 30',status:'inProgress'}}}});
const beginRead=(s,requestId)=>reduce(s,{type:'backgroundReadStarted',id:'parent',connectionId:'c',requestId});
const finishRead=(s,requestId,terminals=[])=>reduce(s,{type:'backgroundSnapshot',id:'parent',connectionId:'c',requestId,snapshot:{children:[],terminals}});
const initial=()=>({...emptyState,approvalConnectionId:'c'});
test('a prior empty inventory cannot hide a later live start, but a fresh omission is unknown',()=>{
 let s=finishRead(beginRead(initial(),'before'),'before');s=startCommand(s);
 assert.equal(backgroundTasks(s,'parent')[0].status,'running');assert.equal(backgroundTasks(s,'parent')[0].startedAt,null);
 s=finishRead(beginRead(s,'after'),'after');assert.equal(backgroundTasks(s,'parent')[0].status,'unknown');assert.equal(taskSections(backgroundTasks(s,'parent')).finished.length,0);
});
test('start during inventory read survives stale absence; completion wins over list membership',()=>{
 let s=startCommand(beginRead(initial(),'before'));s=finishRead(s,'before');assert.equal(backgroundTasks(s,'parent')[0].status,'running');
 s=reduce(s,{event:{method:'item/completed',params:{threadId:'parent',turnId:'turn',item:{id:'cmd',type:'commandExecution',processId:'42',command:'sleep 30',status:'completed',exitCode:0}}}});
 assert.equal(s.backgroundStarts.parent.cmd,undefined);s=finishRead(beginRead(s,'after'),'after',[terminal]);assert.equal(backgroundTasks(s,'parent')[0].status,'completed');
});
test('old, duplicate and foreign inventory replies cannot overwrite a newer request',()=>{
 let s=beginRead(beginRead(initial(),'first'),'second');assert.equal(finishRead(s,'first',[terminal]),s);s=finishRead(s,'second');assert.equal(finishRead(s,'second',[terminal]),s);
 assert.equal(reduce(s,{type:'backgroundReadStarted',id:'parent',connectionId:'old',requestId:'foreign'}),s);
 assert.equal(reduce(s,{type:'backgroundSnapshot',id:'parent',connectionId:'old',requestId:'foreign',snapshot:{terminals:[terminal]}}),s);
 s=startCommand(beginRead(s,'pending'));assert.equal(backgroundTasks(s,'parent',{connected:false})[0].status,'unknown');
 s=reduce(s,{event:{kind:'connection',connected:false}});assert.deepEqual(s.backgroundStarts,{});assert.deepEqual(s.backgroundReads,{});
});
test('history and deltas do not constitute live starts; a new process can supersede old absence',()=>{
 let s=finishRead(beginRead(initial(),'empty'),'empty');s={...s,items:{parent:[{id:'cmd',type:'commandExecution',processId:'42',status:'inProgress'}]}};
 assert.equal(backgroundTasks(s,'parent')[0].status,'unknown');s=reduce(s,{event:{method:'item/commandExecution/outputDelta',params:{threadId:'parent',itemId:'cmd',delta:'hello'}}});assert.equal(backgroundTasks(s,'parent')[0].status,'unknown');
 s=finishRead(beginRead(s,'old'),'old');s=startCommand(s,'43');assert.equal(backgroundTasks(s,'parent')[0].status,'running');s=finishRead(beginRead(s,'new'),'new');assert.equal(backgroundTasks(s,'parent')[0].status,'unknown');
});
test('early Stop refreshes real process membership before sending a terminate RPC',async()=>{
 const calls=[],owner={connection:{approvalConnectionId:'c',approvalConnectionEpoch:3},approvalSnapshot:()=>({closed:false}),start:async()=>{},request:async(method,params)=>{calls.push({method,params});return method==='thread/list'?{data:[],nextCursor:null}:method==='thread/backgroundTerminals/list'?{data:[terminal],nextCursor:null}:{terminated:true};}};
 const ops=background.createBackgroundTasks({getClient:()=>owner,getConfig:()=>({threadIds:['p']})});assert.deepEqual(await ops.terminate({threadId:'p',processId:'42',expected:{connectionId:'c',connectionEpoch:3}}),{terminated:true});assert.deepEqual(calls.map(c=>c.method),['thread/list','thread/backgroundTerminals/list','thread/backgroundTerminals/terminate']);
 await assert.rejects(async()=>ops.terminate({threadId:'p',processId:'alien',expected:{connectionId:'c',connectionEpoch:3}}),/no longer/);assert.equal(calls.filter(c=>c.method.endsWith('/terminate')).length,1);
});
test('early Stop rejects a connection change during membership refresh without terminating',async()=>{
 const calls=[],owner={connection:{approvalConnectionId:'c',approvalConnectionEpoch:3},approvalSnapshot:()=>({closed:false}),start:async()=>{},request:async(method)=>{calls.push(method);if(method==='thread/backgroundTerminals/list'){owner.connection={approvalConnectionId:'d',approvalConnectionEpoch:4};return {data:[terminal],nextCursor:null};}return {data:[],nextCursor:null};}};
 const ops=background.createBackgroundTasks({getClient:()=>owner,getConfig:()=>({threadIds:['p']})});await assert.rejects(async()=>ops.terminate({threadId:'p',processId:'42',expected:{connectionId:'c',connectionEpoch:3}}),/Connection changed/);assert.equal(calls.some(c=>c.endsWith('/terminate')),false);
});

// Transport closure is not a server-reported terminal outcome.
test('disconnect retains real terminal facts but makes an unfinished background process unknown',()=>{
 let s=startCommand(initial());s={...s,items:{...s.items,parent:[...s.items.parent,{id:'done',type:'commandExecution',processId:'done-pid',status:'completed',command:'true'}]}};
 s=reduce(s,{event:{kind:'connection',connected:false}});
 assert.deepEqual(backgroundTasks(s,'parent',{connected:false}).map(t=>t.status),['unknown','completed']);
 assert.equal(backgroundTasks(s,'parent',{connected:true})[0].status,'unknown','connecting alone does not imply a stopped or running process');
 s={...s,approvalConnectionId:'new'};s=reduce(s,{type:'backgroundSnapshot',id:'parent',connectionId:'new',snapshot:{terminals:[terminal],children:[]}});
 assert.equal(backgroundTasks(s,'parent')[0].status,'running','new connection inventory supplies membership');
 s=reduce(s,{event:{method:'item/completed',params:{threadId:'parent',turnId:'turn',item:{id:'cmd',type:'commandExecution',processId:'42',status:'failed',command:'sleep 30'}}}});
 assert.equal(backgroundTasks(s,'parent')[0].status,'failed');
});
test('authoritative interrupted turn and restarted item override the local disconnect observation',()=>{
 let s=reduce(startCommand(initial()),{event:{kind:'connection',connected:false}});
 s=reduce(s,{event:{method:'turn/completed',params:{threadId:'parent',turn:{id:'turn',status:'interrupted'}}}});
 assert.equal(backgroundTasks(s,'parent',{connected:false})[0].status,'stopped');
 s=startCommand(s,'43');assert.equal(backgroundTasks(s,'parent')[0].status,'running');
});
test('an in-flight old history cannot undo disconnect, but fresh history can restore real process status',()=>{
 let s=startCommand(initial());const baseline=s.items.parent;s=reduce(s,{event:{kind:'connection',connected:false}});
 const thread={turns:[{id:'turn',status:'inProgress',items:baseline}]};
 s=reduce(s,{type:'hydrate',id:'parent',thread,baselineItems:baseline});assert.equal(backgroundTasks(s,'parent',{connected:false})[0].status,'unknown');
 s=reduce(s,{type:'hydrate',id:'parent',thread,baselineItems:s.items.parent});assert.equal(backgroundTasks(s,'parent')[0].status,'running');
});

test('collapsed mixed tool batches retain an unknown outcome even if another item completed',()=>{
 let s=reduce(startCommand(initial()),{event:{kind:'connection',connected:false}});
 const lost=s.items.parent[0],done={id:'done',status:'completed'},busy={id:'busy',status:'inProgress'};
 assert.equal(fileRunState([lost,done]),'unknown');assert.equal(fileRunState([done,lost]),'unknown');
 assert.equal(fileRunState([lost,busy]),'busy');assert.equal(fileRunState([lost,busy],new Set(['busy'])),'blocked');
});

test('finished tasks use reverse encounter order for equal or missing server completion times',()=>{
 const tasks=[{id:'old',status:'completed'},{id:'first-timed',status:'failed',completedAt:20},{id:'new',status:'stopped'},{id:'second-timed',status:'completed',completedAt:20},{id:'run-a',status:'running'},{id:'run-b',status:'running'}];
 assert.deepEqual(taskSections(tasks).finished.map(t=>t.id),['second-timed','first-timed','new','old']);
 assert.deepEqual(taskSections(tasks).running.map(t=>t.id),['run-a','run-b']);assert.equal(tasks[0].id,'old');
});

test('a DeepSeek child listed with thread_spawn lineage and a running spawn row is a running agent task',async()=>{
 const {threadLineage}=await import('../../harness/packages/codex-app-server/src/subagents.js');
 const {toolItem,completeToolItem}=await import('../../harness/packages/codex-app-server/src/projection.js');
 const call=toolItem({callId:'sa',name:'subagent',args:{description:'Audit deps',prompt:'p'},threadId:'parent'});
 const spawn=completeToolItem(call,{name:'subagent',args:{},result:{content:[{type:'text',text:'started subagent child'}],isError:false}});
 const child={id:'child',status:{type:'idle'},model:'deepseek-v4-flash',...threadLineage({origin:'subagent',parentSession:'parent',delegationDepth:1},'Audit deps')};
 let s={...emptyState,approvalConnectionId:'c',items:{parent:[{...spawn,turnId:'t1'}]}};
 s=reduce(s,{type:'backgroundSnapshot',id:'parent',connectionId:'c',snapshot:{children:[child],terminals:[]}});
 assert.equal(s.threadParents.child,'parent');
 const tasks=backgroundTasks(s,'parent');
 assert.equal(tasks.length,1);assert.equal(tasks[0].kind,'agent');assert.equal(tasks[0].status,'running');assert.equal(tasks[0].description,'Audit deps');assert.equal(tasks[0].sourceItem.id,'sa');
 // Listed alone (its spawn row not loaded yet), the child is still a task of its parent.
 const listed=reduce({...emptyState,approvalConnectionId:'c'},{type:'backgroundSnapshot',id:'parent',connectionId:'c',snapshot:{children:[child],terminals:[]}});
 assert.deepEqual(backgroundTasks(listed,'parent').map(task=>[task.kind,task.threadId,task.description]),[['agent','child','Audit deps']]);
});
test('a terminal the core cannot stop (codeDesktop.stoppable false) is marked so no Stop is offered',()=>{
 const own={itemId:'cmd',processId:'kimi-agent:a',command:'coder agent (a)',cwd:'/tmp',codeDesktop:{stoppable:false}};
 const s={...emptyState,approvalConnectionId:'c',items:{parent:[]},background:{parent:{connectionId:'c',terminals:[own],knownTerminals:{cmd:own}}}};
 assert.equal(backgroundTasks(s,'parent')[0].stoppable,false);
 assert.equal(Object.hasOwn(backgroundTasks(state(),'parent')[0],'stoppable'),false);
});

// lC / sC (cccc2cf0a :11080-11129): the tail starts after the first line break inside the cut.
test('long task output keeps the last 8000 characters from a whole line under the reference label',()=>{
 const text='head\n'+'x'.repeat(7990)+'\nline two\nlast';
 assert.equal(taskOutput('short\ntext'),'short\ntext');
 const out=taskOutput(text);assert.ok(out.startsWith('(Earlier output not shown)\n'));
 assert.equal(out,'(Earlier output not shown)\nline two\nlast');
 assert.equal(earlierOutputCut('abc\n'),'abc\n','a lone trailing break keeps the tail');
});
function memoryStorage(seed){const data=new Map(seed?[[DISMISSED_TASKS_KEY,JSON.stringify(seed)]]:[]);return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),data};}
// ES / wS / TS (cccc2cf0a :10501-10583) behind rw (:12505-12522).
test('the dismissed store is shared by the header button and the list: clear dismisses only finished ids, persists, and notifies',()=>{
 const storage=memoryStorage({old:['x']}),store=createDismissedTasksStore(storage);let calls=0;const off=store.subscribe(()=>calls++);
 assert.deepEqual(store.dismissed('old'),['x']);assert.equal(store.dismissed('s'),store.dismissed('s'),'stable empty snapshot');
 assert.equal(store.clear('s'),false,'nothing finished: the disabled button does nothing');assert.equal(calls,0);
 store.setFinished('s',['a','b']);assert.deepEqual(store.finished('s'),['a','b']);const snap=store.finished('s');store.setFinished('s',['a','b']);assert.equal(store.finished('s'),snap,'unchanged ids keep the snapshot');
 assert.equal(store.clear('s'),true);assert.deepEqual(store.dismissed('s'),['a','b']);assert.deepEqual(store.finished('s'),[]);
 assert.deepEqual(JSON.parse(storage.data.get(DISMISSED_TASKS_KEY)),{old:['x'],s:['a','b']});
 assert.equal(store.restore('s',['b']),true);assert.deepEqual(store.dismissed('s'),['a']);assert.equal(store.restore('s',['zzz']),false);
 assert.ok(calls>=3);off();const before=calls;store.dismiss('s',['c']);assert.equal(calls,before);
 assert.deepEqual(createDismissedTasksStore(memoryStorage()).dismissed('s'),[]);
 assert.deepEqual(createDismissedTasksStore({getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');}}).dismissed('s'),[]);
});
// QS / OC (cccc2cf0a :11030-11059, :11432-11446).
test('Stops in uses QS whole units and hides in the final second',()=>{
 assert.equal(stopsInDuration(45_400,'en-US'),'45s');
 assert.equal(stopsInDuration(270_000,'en-US'),'4m 30s');
 assert.equal(stopsInDuration(12*60_000+30_000,'en-US'),'12m','seconds drop from five minutes up');
 assert.equal(stopsInDuration((2*60+15)*60_000,'en-US'),'2h 15m');
 assert.equal(stopsInDuration(27*3600_000,'en-US'),'1d 3h');
 assert.equal(stopsInLabel(10_999,10_000,'en-US'),null);assert.equal(stopsInLabel(undefined,0,'en-US'),null);
 assert.equal(stopsInLabel(10_000+300_000,10_000,'en-US'),'Stops in 5m');
});
test('a running Monitor row carries its deadline; a finished one does not',()=>{
 const [run,done]=monitorTasks([{id:'m1',command:'tail',status:'running',startedAt:1,stopsAt:300001},{id:'m2',command:'tail',status:'completed',startedAt:1,durationMs:5,stopsAt:9}]);
 assert.equal(run.stopsAt,300001);assert.equal(Object.hasOwn(done,'stopsAt'),false);
});

// B35 (c03935b01 openTaskRowsBySession / stoppingIdsBySession): open rows and pending stops kept per session.
test('task rows store keeps open rows and pending stops per session across remounts',async()=>{
 const {createTaskRowsStore}=await import('../src/background-tasks-model.mjs');
 const store=createTaskRowsStore();let emits=0;store.subscribe(()=>emits++);
 const empty=store.openRows('a');assert.equal(store.openRows('a'),empty,'stable empty snapshot');
 store.setRowsOpen('a',['bash:1'],true);assert.equal(store.isOpen('a','bash:1'),true);assert.equal(store.isOpen('b','bash:1'),false);
 const snap=store.openRows('a');store.setRowsOpen('a',['bash:1'],true);assert.equal(store.openRows('a'),snap,'no-op keeps the snapshot');
 store.setRowsOpen('a',['bash:1'],false);assert.equal(store.isOpen('a','bash:1'),false);
 assert.equal(store.markStopping('a','task','bash:2'),true);assert.equal(store.markStopping('a','task','bash:2'),false,'one stop at a time');
 store.markStopping('a','loop','job');assert.deepEqual([...store.stopping('a','task')],['bash:2']);assert.deepEqual([...store.stopping('a','loop')],['job']);assert.equal(store.stopping('b','task').size,0);
 store.releaseStopping('a','task',['bash:2','missing']);assert.equal(store.stopping('a','task').size,0);store.releaseStopping('a','loop','job');
 const before=emits;store.releaseStopping('a','loop','job');assert.equal(emits,before,'nothing to release emits nothing');
 store.setRowsOpen(null,['x'],true);assert.equal(store.isOpen(undefined,'x'),true,'no session shares one bucket');
 store.forget('a');store.forget(null);assert.equal(store.openRows('a').size,0);
});
// B35 (cccc2cf0a jC → c52b02f3f Pf): a running agent's last tool reads as the running verb.
test('a running agent card shows its last tool as the transcript running verb',async()=>{
 const {toolRunningVerb}=await import('../src/agent-model.mjs');
 assert.equal(toolRunningVerb({type:'commandExecution',commandActions:[{type:'read'}]}),'Reading');
 assert.equal(toolRunningVerb({type:'commandExecution',commandActions:[{type:'search'}]}),'Searching');
 assert.equal(toolRunningVerb({type:'commandExecution',commandActions:[{type:'listFiles'}]}),'Listing');
 assert.equal(toolRunningVerb({type:'commandExecution',commandActions:[{type:'unknown'}]}),'Running a command');
 assert.equal(toolRunningVerb({type:'fileChange',changes:[{kind:{type:'update'}}]}),'Editing');
 assert.equal(toolRunningVerb({type:'fileChange',changes:[{kind:{type:'add'}}]}),'Creating');
 assert.equal(toolRunningVerb({type:'webSearch',query:'x'}),'Searching web');
 assert.equal(toolRunningVerb({type:'collabAgentToolCall'}),'Running agent');
 assert.equal(toolRunningVerb({type:'mcpToolCall',server:'github',tool:'list_issues'}),'Using github: list issues');
 const s={...emptyState,items:{parent:[{id:'spawn',type:'collabAgentToolCall',tool:'spawnAgent',receiverThreadIds:['child'],agentsStates:{child:{status:'running'}}}],child:[{id:'c1',type:'commandExecution',commandActions:[{type:'read'}],status:'inProgress'}]},active:{child:'turn'}};
 const task=backgroundTasks(s,'parent').find(entry=>entry.kind==='agent');assert.equal(task.lastTool,'Reading');
});
// B35 (cccc2cf0a zw, c5da7eb42 _p): a completed sub-agent's stats footnote.
test('a completed sub-agent transcript ends with tool calls, tokens and duration once all are known',async()=>{
 const {agentConclusionStats,agentConclusionValues,AGENT_CONCLUSION_MESSAGE}=await import('../src/agent-model.mjs');
 // W14-code pa2-08: 3.6556.2 cccc2cf0a FP formats one ICU message (dAbHM3tAVv); the panel renders it through StartMessage.
 const {icuFormat}=await import('../src/approval-card-model.mjs');
 const agentConclusionText=(stats)=>icuFormat(AGENT_CONCLUSION_MESSAGE.defaultMessage,agentConclusionValues(stats));
 assert.equal(AGENT_CONCLUSION_MESSAGE.defaultMessage,'{toolUses, plural, one {# tool call} other {# tool calls}} \u00B7 {tokenForm, select, one {1 token} other {{tokens} tokens}} \u00B7 {duration}');
 const s={items:{child:[]},usage:{child:{total:{totalTokens:12345}}},taskTurnFacts:{child:{durationMs:65000}}};
 assert.deepEqual(agentConclusionStats(s,{id:'child',status:'completed',toolCallCount:3}),{toolUses:3,tokens:12345,durationMs:65000});
 assert.equal(agentConclusionText({toolUses:3,tokens:12345,durationMs:65000}),'3 tool calls · 12.3k tokens · 1m 5s');
 assert.equal(agentConclusionText({toolUses:1,tokens:1,durationMs:2000}),'1 tool call · 1 token · 2s');
 assert.equal(agentConclusionStats(s,{id:'child',status:'running',toolCallCount:3}),null);
 assert.equal(agentConclusionStats({...s,taskTurnFacts:{}},{id:'child',status:'completed',toolCallCount:3}),null,'unknown duration');
 assert.equal(agentConclusionStats({...s,items:{}},{id:'child',status:'completed',toolCallCount:0}),null,'transcript not loaded');
});

test('a command task is titled like its transcript row, never with the whole script; the full command stays on the task',()=>{
 const script="python3 -u - <<'PY'\nimport json,urllib.request\nprint('result',flush=True)\nPY";
 const wrapped=`/bin/zsh -lc "${script}"`;
 assert.equal(commandTaskTitle(wrapped),'python3\u2026');
 const s={...emptyState,approvalConnectionId:'c',items:{parent:[{id:'cmd',type:'commandExecution',command:wrapped,processId:'42',status:'inProgress'}]},background:{parent:{connectionId:'c',terminals:[{...terminal,command:wrapped}],knownTerminals:{}}}};
 const [task]=backgroundTasks(s,'parent');
 assert.equal(task.description,'python3\u2026');assert.equal(task.command,wrapped);
 // No summary (a && chain): the one-line command itself; several lines: the first, marked as cut.
 assert.equal(commandTaskTitle('sleep 30 && echo hi'),'sleep 30 && echo hi');
 assert.equal(commandTaskTitle('sleep 30 && echo hi\necho done'),'sleep 30 && echo hi\u2026');
 // Soe's refusals hold here too: a command that names a credential falls back to the plain label.
 assert.equal(commandTaskTitle("curl -H 'Authorization: Bearer abc' https://x && echo"),'');
 assert.equal(monitorTasks([{id:'m',command:script,status:'running'}])[0].description,'python3\u2026');
 assert.equal(monitorTasks([{id:'m',description:'Watch logs',command:script,status:'running'}])[0].description,'Watch logs');
});
