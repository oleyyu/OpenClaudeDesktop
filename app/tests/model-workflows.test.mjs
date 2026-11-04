import test from 'node:test';
import assert from 'node:assert/strict';
import {isModelWorkflow,modelWorkflowRuns,withModelWorkflowRows,workflowTask,workflowKey} from '../src/model-workflow-model.mjs';
import {workflowPhases} from '../src/workflow-progress-model.mjs';

// A workflow tool item as the DeepSeek core sends it (harness workflows.js).
const run={id:'r1',source:'model',callId:'w1',runId:'r1',name:'audit',description:'Audit files',status:'running',startedAt:1000,sequence:4,
  workflowProgress:[{type:'workflow_phase',index:0,title:'Scan'},{type:'workflow_agent',index:0,id:'1',label:'scan a',state:'progress',phaseIndex:0,phaseTitle:'Scan',startedAt:1100,lastProgressAt:1100}],usage:{totalTokens:0}};
const items=[{id:'u1',type:'userMessage',turnId:'t1'},{id:'w1',type:'dynamicToolCall',tool:'workflow',status:'inProgress',turnId:'t1',workflowRun:run},{id:'x',type:'dynamicToolCall',tool:'set_goal',turnId:'t1'}];

test('model-started runs become Tasks pane workflow tasks of their session',()=>{
  const runs=modelWorkflowRuns(items,'thread-1');
  assert.equal(runs.length,1);
  assert.equal(runs[0].threadId,'thread-1');
  assert.equal(runs[0].itemId,'w1');
  assert.ok(isModelWorkflow(runs[0]));
  assert.ok(!isModelWorkflow({id:'local',status:'running'}));
  assert.deepEqual(workflowTask(runs[0]),{id:'workflow:item:w1',kind:'workflow',status:'running',description:'Audit files',startedAt:1000,completedAt:undefined,run:runs[0]});
  // The core's run shape is the one the shared progress model reads.
  assert.deepEqual(workflowPhases(runs[0],1200).map(p=>[p.title,p.status,p.agents.length]),[['Scan','running',1]]);
});

test('a workflow tool item renders as its run row, keeping its turn',()=>{
  const rows=withModelWorkflowRows(items);
  assert.deepEqual(rows[1],{id:'w1',turnId:'t1',workflowRun:run});
  assert.equal(rows[0],items[0]);
  assert.equal(rows[2],items[2]);
  assert.deepEqual(withModelWorkflowRows(undefined),[]);
  // A run the core has not named yet is still addressable by its call id.
  assert.equal(modelWorkflowRuns([{id:'w2',workflowRun:{...run,id:'call-w2'}}],'t')[0].id,'call-w2');
});

test('/workflow agents take the access of the session Mode they were launched in',async()=>{
  const {workflowAccess}=await import('../electron/permission-policy.mjs');
  assert.equal(workflowAccess({permission:'auto'}),'workspace-write');
  assert.equal(workflowAccess({permission:'acceptEdits'}),'workspace-write');
  assert.equal(workflowAccess({permission:'bypass'}),'danger-full-access');
  assert.equal(workflowAccess({permission:'plan'}),'read-only');
  assert.equal(workflowAccess({permission:'ask'}),'read-only','Ask has no approval card for workflow agents');
  assert.equal(workflowAccess({permission:'bypass',mode:'chat'}),'read-only');
  assert.equal(workflowAccess({permission:'root'}),'read-only');
  assert.equal(workflowAccess(),'workspace-write','the default Mode (Auto) edits files');
});

test('a model run keeps its Tasks pane identity when the core renames it (call id → run/attempt id)',()=>{
  const before=modelWorkflowRuns([{id:'w9',workflowRun:{...run,id:'call-w9',runId:null}}],'t')[0];
  const after=modelWorkflowRuns([{id:'w9',workflowRun:{...run,id:'attempt-7',runId:'r9',attemptId:'attempt-7'}}],'t')[0];
  assert.equal(workflowTask(before).id,workflowTask(after).id);
  // The transcript row focuses the same task the card renders.
  assert.equal('workflow:'+workflowKey({...run,id:'call-w9',itemId:'w9'}),workflowTask(after).id);
  // Local /workflow runs keep their own run id.
  assert.equal(workflowTask({id:'local-1',status:'running'}).id,'workflow:local-1');
});

// W14-code r4 ct-feed R4T-08b (E95): the Tasks pane's run is the desktop's N$ card, which has no member Retry / Skip.
test('the member Retry / Skip gate went with the host card',async()=>{
  assert.equal('workflowMemberControls' in await import('../src/model-workflow-model.mjs'),false);
});
