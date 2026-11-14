import test from 'node:test';
import assert from 'node:assert/strict';
import {agentStatus,observeAgentEvent,agentView,agentTargets,agentPromptNeeded,agentRowLabel} from '../src/agent-model.mjs';
import {emptyState,reduce} from '../src/state.js';
const spawn={id:'spawn',type:'collabAgentToolCall',senderThreadId:'P',tool:'spawnAgent',status:'completed',receiverThreadIds:['C'],prompt:'Audit the code\nDetails',model:'actual-model',agentsStates:{C:{status:'running',message:null}}};
const event=(method,params)=>({kind:'notification',method,params});
test('spawn acknowledgement stays running; child completion beats late spawn status',()=>{
 let lifecycle=observeAgentEvent({},event('turn/started',{threadId:'C',turn:{id:'t'}}),{},100);
 lifecycle=observeAgentEvent(lifecycle,event('turn/completed',{threadId:'C',turn:{id:'t',status:'completed'}}),{C:'t'},200);
 lifecycle=observeAgentEvent(lifecycle,event('item/completed',{threadId:'P',item:spawn}),{},300);
 assert.equal(lifecycle.C.status,'completed');assert.equal(lifecycle.C.completedObservedAt,200);
 assert.equal(agentView({...emptyState,agentLifecycle:lifecycle},spawn).status,'completed');
 assert.equal(agentView(emptyState,spawn).status,'running');
 lifecycle=observeAgentEvent(lifecycle,event('turn/started',{threadId:'C',turn:{id:'t2'}}),{},400);
 assert.equal(lifecycle.C.status,'running');
 const stale=observeAgentEvent(lifecycle,event('turn/completed',{threadId:'C',turn:{id:'t',status:'interrupted'}}),{C:'t2'},500);
 assert.equal(stale,lifecycle);
});
test('only genuine child tools count; child result wins over wait fallback',()=>{
 const state={...emptyState,threads:{C:{agentNickname:'nova',agentRole:'reviewer',model:'real-child-model'}},items:{P:[spawn,{...spawn,id:'wait',tool:'wait',agentsStates:{C:{status:'completed',message:'fallback'}}}],C:[{id:'u',type:'userMessage'},{id:'r',type:'reasoning'},{id:'cmd',type:'commandExecution'},{id:'edit',type:'fileChange'},{id:'a',type:'agentMessage',text:'child result'}]}};
 const view=agentView(state,spawn);assert.equal(view.name,'nova · reviewer');assert.equal(view.model,'real-child-model');assert.equal(view.toolCallCount,2);assert.equal(view.latestToolName,'Edit');assert.equal(view.result,'child result');assert.equal(view.status,'completed');
 assert.deepEqual(agentTargets({...spawn,receiverThreadIds:['C','C','D'],agentsStates:{E:{}}}),['C','D','E']);
});
test('protocol terminal mappings and activity state do not manufacture transcript rows',()=>{
 for(const [wire,expected] of [['pendingInit','unknown'],['errored','failed'],['shutdown','stopped'],['interrupted','stopped']])assert.equal(agentStatus(wire),expected);
 let state=reduce(emptyState,{event:event('item/completed',{threadId:'P',item:{id:'activity',type:'subAgentActivity',kind:'interrupted',agentThreadId:'C',agentPath:'C'}})});
 assert.equal(state.agentLifecycle.C.status,'stopped');assert.deepEqual(Object.keys(state.items),['P']);assert.equal(state.items.P.length,1);
});
test('hydrate races preserve child live result and lifecycle; source spawn metadata resolves parent',()=>{
 let state=reduce(emptyState,{event:event('thread/started',{thread:{id:'C',source:{subAgent:{thread_spawn:{parent_thread_id:'P',agent_nickname:'nova'}}},historyMode:'paginated'}})});
 assert.equal(state.threadParents.C,'P');assert.equal(state.threads.C.agentNickname,'nova');
 state=reduce(state,{event:event('turn/started',{threadId:'C',turn:{id:'t'}})});
 const baseline=state;
 state=reduce(state,{event:event('item/completed',{threadId:'C',turnId:'t',item:{id:'msg',type:'agentMessage',text:'live'}})});
 state=reduce(state,{event:event('turn/completed',{threadId:'C',turn:{id:'t',status:'completed'}})});
 state=reduce(state,{type:'hydrate',id:'C',thread:{id:'C',turns:[{id:'t',status:'inProgress',items:[]}]},baselineItems:baseline.items.C,baselineActiveVersion:baseline.activeVersions.C});
 assert.equal(state.active.C,null);assert.equal(state.agentLifecycle.C.status,'completed');assert.equal(state.items.C[0].text,'live');
});
test('prompt is not duplicated if child already contains a real user entry',()=>{
 assert.equal(agentPromptNeeded([{type:'userMessage',content:[{type:'text',text:'real'}]}],'prompt'),false);
 assert.equal(agentPromptNeeded([],'prompt'),true);assert.equal(agentPromptNeeded([],null),false);
});

test('late old turn completion cannot idle the newer child run',()=>{
 let state=reduce(emptyState,{event:event('turn/started',{threadId:'C',turn:{id:'new'}})});
 state=reduce(state,{event:event('turn/completed',{threadId:'C',turn:{id:'old',status:'completed'}})});
 assert.equal(state.active.C,'new');assert.equal(state.agentLifecycle.C.status,'running');
});

test('agent grouping counts spawn calls and preserves roll-up activity boundaries',async()=>{
 const {groupFileTools}=await import('../src/file-tool-model.mjs');
 const items=[spawn,{id:'status',type:'subAgentActivity',kind:'started',agentThreadId:'C'}, {...spawn,id:'spawn2',receiverThreadIds:['D']}];
 assert.equal(groupFileTools(items).length,1);assert.equal(groupFileTools(items)[0].toolGroup.length,2);
});

// The DeepSeek core's own projection (harness bridge) feeding the reducer.
const bridge=()=>import('../../harness/packages/codex-app-server/src/projection.js');
test('a DeepSeek delegation settles through its notice: completed with the closing text, no user bubble',async()=>{
 const {ThreadProjector}=await bridge();let seq=0;const ev=(type,data)=>({type,data,seq:++seq,time:1000+seq});
 const p=new ThreadProjector({threadId:'P'}),notes=[];const apply=e=>notes.push(...p.apply(e));
 apply(ev('turn/start',{turn:1}));apply(ev('user/message',{id:'u1',content:[{type:'text',text:'go'}],source:{kind:'user'}}));
 apply(ev('tool/call',{turn:1,step:1,callId:'sa',name:'subagent',arguments:JSON.stringify({description:'Audit deps',prompt:'p'})}));
 apply(ev('tool/result',{turn:1,step:1,message:{toolCallId:'sa',content:[{type:'text',text:'started subagent child-1'}],isError:false}}));
 apply(ev('turn/end',{turn:1,reason:{kind:'completed'}}));
 let state=notes.reduce((s,note)=>reduce(s,{event:event(note.method,note.params)}),emptyState);
 const running=state.items.P.find(item=>item.type==='collabAgentToolCall');
 assert.equal(agentView(state,running).status,'running');assert.equal(agentView(state,running).name,'Audit deps');
 notes.length=0;
 apply(ev('turn/start',{turn:2}));
 apply(ev('user/message',{id:'n1',content:[{type:'text',text:'Background subagent child-1 finished and will do no further work unless you send it more.'},{type:'text',text:'Its closing message:'},{type:'text',text:'done'}],source:{kind:'subagent-settled',form:'notice',summary:'Background subagent child-1 finished and will do no further work unless you send it more.',senderSessionId:'child-1'}}));
 apply(ev('assistant/message',{turn:2,step:1,message:{content:[{type:'text',text:'All good.'}]}}));
 apply(ev('turn/end',{turn:2,reason:{kind:'completed'}}));
 state=notes.reduce((s,note)=>reduce(s,{event:event(note.method,note.params)}),state);
 const item=state.items.P.find(entry=>entry.type==='collabAgentToolCall');
 assert.equal(state.agentLifecycle['child-1'].status,'completed');
 const view=agentView(state,item);assert.equal(view.status,'completed');assert.equal(view.result,'done');
 assert.deepEqual(state.items.P.filter(entry=>entry.type==='userMessage').map(entry=>entry.id),['u1']);
 assert.equal(state.items.P.filter(entry=>entry.type==='collabAgentToolCall').length,1);
 // Applied directly, the item carries the same outcome.
 assert.equal(observeAgentEvent({},event('item/completed',{threadId:'P',item}))['child-1'].message,'done');
});
test('agent rows read the tensed description (oO/Ie, approval-current.js:4271-4296, :16921-16934)',()=>{
 const audit={...spawn,description:'Audit the parser'};
 assert.deepEqual(agentRowLabel(audit,'Audit the parser','running'),{label:'Auditing the parser',name:null,described:true});
 assert.deepEqual(agentRowLabel(audit,'Audit the parser','completed'),{label:'Audited the parser',name:null,described:true});
 assert.deepEqual(agentRowLabel(audit,'Audit the parser','failed'),{label:'Failed to audit the parser',name:null,described:true});
 // Stopped, denied, awaiting and unconfirmed rows keep the verb + description meta.
 for(const status of ['stopped','denied','awaiting','unknown']) assert.deepEqual(agentRowLabel(audit,'nova',status),{label:'Ran agent',name:'Audit the parser',described:false});
 // 'say' is not in the source verb table (jae :3744-3749), so 'Say hello' has no tenses:
 // the description itself is the running/done label and a failure falls back to the verb.
 const hello={...spawn,description:'Say hello'};
 assert.deepEqual(agentRowLabel(hello,'x','running'),{label:'Say hello',name:null,described:true});
 assert.deepEqual(agentRowLabel(hello,'x','completed'),{label:'Say hello',name:null,described:true});
 assert.deepEqual(agentRowLabel(hello,'x','failed'),{label:'Failed to run agent',name:'Say hello',described:false});
 // No description (Codex spawnAgent): verb + the agent name.
 assert.deepEqual(agentRowLabel(spawn,'nova · reviewer','running'),{label:'Running agent',name:'nova · reviewer',described:false});
 assert.deepEqual(agentRowLabel(spawn,'nova · reviewer','completed'),{label:'Ran agent',name:'nova · reviewer',described:false});
 assert.deepEqual(agentRowLabel(spawn,'nova · reviewer','failed'),{label:'Failed to run agent',name:'nova · reviewer',described:false});
 assert.deepEqual(agentRowLabel({...spawn,description:'  '},'nova','completed'),{label:'Ran agent',name:'nova',described:false});
});
