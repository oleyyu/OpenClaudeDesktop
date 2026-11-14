import test from 'node:test';import assert from 'node:assert/strict';
import {workflowAgentCounts,workflowSizeWarning,growWorkflowSizeWarning,pickWorkflowSizeWarning,createWorkflowSizeStore,syncWorkflowSizeStore,workflowSizeDetail,compactTokens} from '../src/workflow-size-band-model.mjs';

const agent=(id,extra={})=>({type:'workflow_agent',id,index:1,label:id,state:'start',...extra});
const task=(id,progress,{status='running',tokens=0}={})=>({id:'workflow:'+id,kind:'workflow',status,run:{id,status,workflowProgress:progress,usage:{totalTokens:tokens}}});
const limits={agents:25,tokens:1500000,suppressed:false};

test('cc43287c9 jq/Oq/kq: started agents, the 70k projection and the axis',()=>{
 assert.deepEqual(workflowAgentCounts([agent('a',{state:'done'}),agent('b',{state:'progress',startedAt:1}),agent('c'),agent('d',{tokens:5}),{type:'workflow_phase'}]),{scheduledAgents:4,startedAgents:3});
 assert.equal(workflowSizeWarning({scheduledAgents:3,startedAgents:0,totalTokens:0},limits),undefined,'3 × 70k is small');
 assert.deepEqual(workflowSizeWarning({scheduledAgents:26,startedAgents:0,totalTokens:0},limits),{axis:'both',scheduledAgents:26,totalTokens:0,projectedTokens:1820000,agentCap:25,tokenCap:1500000});
 assert.equal(workflowSizeWarning({scheduledAgents:26,startedAgents:26,totalTokens:26},limits).axis,'agents');
 assert.equal(workflowSizeWarning({scheduledAgents:4,startedAgents:1,totalTokens:600000},limits).axis,'tokens','600k per started agent × 4');
 assert.equal(workflowSizeWarning({scheduledAgents:6,startedAgents:6,totalTokens:6},{...limits,agents:5}).axis,'agents','Settings cap');
});

test('Aq: a drawn warning only grows; Vq picks the first undismissed running workflow',()=>{
 const first=workflowSizeWarning({scheduledAgents:30,startedAgents:30,totalTokens:30},limits);
 const smaller=workflowSizeWarning({scheduledAgents:26,startedAgents:26,totalTokens:26},limits);
 assert.equal(growWorkflowSizeWarning(smaller,first,limits),first);
 const big=Array.from({length:30},(_,i)=>agent(String(i),{state:'done',tokens:1}));
 const tasks=[task('small',[agent('x')]),task('big',big),task('other',big)];
 const pick=pickWorkflowSizeWarning(tasks,new Map(),limits);assert.equal(pick.task.id,'workflow:big');assert.equal(pick.warning.axis,'agents');
 assert.equal(pickWorkflowSizeWarning(tasks,new Map([['workflow:big','dismissed']]),limits).task.id,'workflow:other');
 assert.equal(pickWorkflowSizeWarning(tasks,new Map(),{...limits,suppressed:true}),null,'never in ultracode');
 assert.equal(pickWorkflowSizeWarning([task('big',big,{status:'completed'})],new Map(),limits),null);
 // A run that drops under the caps keeps the warning already drawn.
 const kept=pickWorkflowSizeWarning([task('big',[agent('x')])],new Map([['workflow:big',{warning:first}]]),limits);assert.equal(kept.warning,first);
});

test('Nq/Rq/zq: the store keeps the drawn warning, dismissal per task, and clears settled runs',()=>{
 const store=createWorkflowSizeStore();let emits=0;store.subscribe(()=>emits++);
 const big=Array.from({length:30},(_,i)=>agent(String(i),{state:'done',tokens:1}));
 let tasks=[task('big',big)];
 const pick=pickWorkflowSizeWarning(tasks,store.entries(),limits);syncWorkflowSizeStore(store,tasks,pick);
 assert.equal(store.entries().get('workflow:big').warning,pick.warning);const after=emits;
 syncWorkflowSizeStore(store,tasks,pickWorkflowSizeWarning(tasks,store.entries(),limits));assert.equal(emits,after,'steady state emits nothing');
 store.set('workflow:big','dismissed');assert.equal(pickWorkflowSizeWarning(tasks,store.entries(),limits),null);
 tasks=[task('big',big,{status:'stopped'})];syncWorkflowSizeStore(store,tasks,null);assert.equal(store.entries().has('workflow:big'),false);
});

test('Hq: detail line per axis with compact token counts',()=>{
 assert.equal(compactTokens(1820000,'en-US'),'1.8M');
 assert.equal(workflowSizeDetail({axis:'agents',scheduledAgents:30,projectedTokens:1},'en-US'),'Up to 30 agents scheduled, more than most workflows use.');
 assert.equal(workflowSizeDetail({axis:'tokens',scheduledAgents:4,projectedTokens:2400000},'en-US'),'As many as 2.4M tokens projected, more than most workflows use.');
 assert.equal(workflowSizeDetail({axis:'both',scheduledAgents:26,projectedTokens:1820000},'en-US'),'Up to 26 agents scheduled, about 1.8M tokens projected.');
});
