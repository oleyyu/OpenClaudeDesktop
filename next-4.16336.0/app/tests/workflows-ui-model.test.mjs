import test from 'node:test';import assert from 'node:assert/strict';
import {workflowEvent,workflowCells,workflowPhases,mergeWorkflow,workflowAgentState,workflowSummary,WORKFLOW_AGENTS_GROUP} from '../src/workflow-progress-model.mjs';
import {parseWorkflowLaunch} from '../src/workflow-launch-model.mjs';
import {commandUnavailable,parseSessionCommand} from '../src/session-command-model.mjs';
test('workflow launch supports quoted local paths, plan/resume and exact JSON values',()=>{assert.deepEqual(parseWorkflowLaunch('"/tmp/a b.js" --plan --resume run-1 --args {"query":"x -- y"}'),{file:'/tmp/a b.js',plan:true,resumeId:'run-1',args:{query:'x -- y'}});assert.throws(()=>parseWorkflowLaunch('foo --args []'),/JSON object/);assert.throws(()=>parseWorkflowLaunch('foo --unknown'),/Use/);assert.equal(parseSessionCommand('/workflows').error,null);assert.equal(commandUnavailable(parseSessionCommand('/workflow').command,{current:'p',connected:true}),'Enable Dynamic workflows in Code settings first');});
test('grid compression matches Claude 2.19675.0 buckets and retains full detail below the cap',()=>{const agents=Array.from({length:1000},(_,i)=>({displayState:i===999?'error':i===998?'stalled':i>800?'running':'done',label:String(i)}));const cells=workflowCells(agents,280);assert.equal(cells.length,280);assert.deepEqual(new Set(cells.map(c=>c.displayState)),new Set(['done','running','error']));assert.equal(workflowCells(agents,Infinity),agents);});
test('repeated real phase names share one execution identity and cached agents do not invent timing or tokens',()=>{let run={id:'w',startedAt:0,workflowProgress:[]};run=workflowEvent(run,{type:'phase',title:'Check'},0);run=workflowEvent(run,{type:'cached',id:'a',label:'A',phase:'Check'},1);run=workflowEvent(run,{type:'phase',title:'Check'},2);run=workflowEvent(run,{type:'start',id:'b',label:'B',phase:'Check'},3);const phases=workflowPhases(run,90004);assert.equal(phases.length,1);assert.equal(phases[0].agents[0].startedAt,undefined);assert.equal(phases[0].agents[0].tokens,undefined);assert.equal(phases[0].agents[1].displayState,'stalled');const snapshot=[run];assert.equal(mergeWorkflow(snapshot,{...run,sequence:run.sequence-1}),snapshot);});

test('script metadata is displayed only when supplied by the actual engine event',()=>{const run={id:'x',description:'file.js',workflowProgress:[]};const next=workflowEvent(run,{type:'metadata',name:'Inspect',title:'Readable title',description:'Check the project'},1);assert.equal(next.name,'Inspect');assert.equal(next.title,'Readable title');assert.equal(next.description,'Check the project');assert.equal(run.name,undefined);});


test('Claude pending cells; unindexed agents gather in the last Other agents group (c62da1b56 ge) without inventing work',()=>{
 const run={status:'running',workflowProgress:[{type:'workflow_phase',index:2,title:'Review'},{type:'workflow_agent',id:'q',state:'queued',label:'Queued'},{type:'workflow_agent',id:'r',state:'progress',label:'Working',lastProgressAt:0}]};
 const all=workflowPhases(run,90001);assert.deepEqual(all.map(p=>[p.title,p.status,p.agents.length]),[['Review','pending',0],['Other agents','running',2]]);
 const phases=all.slice(1);assert.equal(phases[0].index,WORKFLOW_AGENTS_GROUP);assert.equal(workflowAgentState(phases[0].agents[0],90001),'pending');assert.equal(phases[0].agents[1].displayState,'stalled');
 assert.equal(workflowCells(phases[0].agents,1).length,1);assert.deepEqual(workflowCells(phases[0].agents,0),[]);
 assert.equal(workflowPhases({status:'running',workflowProgress:[{type:'workflow_phase',index:0,title:'Later'}]},0)[0].status,'pending');
});
test('Claude failure summaries remove the repeated workflow envelope',()=>{
 assert.equal(workflowSummary('Workflow "review" failed: connection lost','Review'),'Connection lost');
 assert.equal(workflowSummary('Review','Review'),'');assert.equal(workflowSummary('Stopped','Review'),'');assert.equal(workflowSummary('Replaced by a revised run','Review'),'Replaced by a revised run');assert.equal(workflowSummary('Workflow "review" completed.','Review'),'');
});
test('long-running tools and providers without activity telemetry do not falsely stall',()=>{
 const agent={state:'progress',lastProgressAt:0};
 assert.equal(workflowAgentState({...agent,activeTools:1},100000),'running');
 assert.equal(workflowAgentState({...agent,progressSupported:false},100000),'running');
 assert.equal(workflowAgentState({...agent,activeTools:0,progressSupported:true},100000),'stalled');
 assert.equal(workflowAgentState({...agent,lastProgressAt:99000},100000),'running');
});

test('native grouping preserves empty titles and replaces only generated Phase titles',()=>{
 const group=rows=>workflowPhases({workflowProgress:rows},0);
 assert.equal(group([{type:'workflow_phase',index:1,title:''}])[0].title,'');
 assert.equal(group([{type:'workflow_agent',index:1,phaseIndex:3},{type:'workflow_phase',index:3,title:'Review'}])[0].title,'Review');
 assert.equal(group([{type:'workflow_phase',index:1,title:'Original'},{type:'workflow_agent',index:1,phaseIndex:1,phaseTitle:'Later'}])[0].title,'Original');
});

test('queued members remain pending, upgrade in place on publication and preserve pre-start failures',()=>{
 let run={id:'queue',startedAt:0,workflowProgress:[]};
 run=workflowEvent(run,{type:'admission',id:'1',seq:1,label:'',state:'queued',queuedAt:1,lastProgressAt:1},2);
 assert.equal(workflowPhases(run,100000)[0].agents[0].displayState,'pending');
 assert.equal(run.workflowProgress[0].label,'');
 assert.equal(run.workflowProgress[0].childId,undefined);
 run=workflowEvent(run,{type:'phase',title:'Later',index:1},3);
 run=workflowEvent(run,{type:'start',id:'1',seq:1,label:'',childId:'actual-child',progressSupported:false},4);
 assert.equal(run.workflowProgress.length,2);
 assert.deepEqual([run.workflowProgress[0].state,run.workflowProgress[0].queuedAt,run.workflowProgress[0].childId],['progress',1,'actual-child']);
 run=workflowEvent(run,{type:'admission',id:'2',seq:2,label:'pending failure',state:'queued',queuedAt:5,lastProgressAt:5},5);
 run=workflowEvent(run,{type:'admission',id:'2',seq:2,label:'pending failure',state:'failed',error:'startup failed',queuedAt:5,lastProgressAt:6},6);
 assert.deepEqual([run.workflowProgress[2].state,run.workflowProgress[2].error,run.workflowProgress[2].childId],['error','startup failed',undefined]);
});

test('a skipped agent is skipped, not failed, in live events, grids and phase status',()=>{
 let run={id:'w',status:'running',startedAt:0,workflowProgress:[]};
 run=workflowEvent(run,{type:'phase',title:'Fan out'},0);
 for(const id of ['a','b','c'])run=workflowEvent(run,{type:'start',id,label:id.toUpperCase(),phase:'Fan out'},1);
 run=workflowEvent(run,{type:'end',id:'a',status:'skipped',error:'skipped by user'},2);
 run=workflowEvent(run,{type:'end',id:'b',status:'failed',error:'skipped by user'},2);
 run=workflowEvent(run,{type:'end',id:'c'},3);
 const [phase]=workflowPhases(run,4);
 assert.deepEqual(phase.agents.map(a=>[a.state,a.displayState,a.error]),[['skipped','skipped',undefined],['skipped','skipped',undefined],['done','done',undefined]]);
 assert.equal(phase.status,'done');assert.equal(phase.done,1);
 assert.deepEqual(new Set(workflowCells(Array.from({length:10},(_,i)=>({displayState:i<5?'skipped':'done'})),4).map(c=>c.displayState)),new Set(['skipped','done']));
 // Settling does not turn a skipped agent into an error.
 const settled=workflowEvent(run,{type:'settled',status:'stopped'},5);
 assert.equal(settled.workflowProgress.find(p=>p.id==='a').state,'skipped');
});

test('c62da1b56 ge/he: a phaseless run is one Agents group; a settled run never started reads notRun',()=>{
 const agent=(id,state,extra={})=>({type:'workflow_agent',id,index:1,label:id,state,...extra});
 const only=workflowPhases({status:'running',workflowProgress:[agent('a','done')]},0);
 assert.deepEqual(only.map(p=>[p.index,p.title,p.status]),[[WORKFLOW_AGENTS_GROUP,'Agents','done']]);
 const rows=[{type:'workflow_phase',index:1,title:'Scan'},{type:'workflow_phase',index:2,title:'Fix'},agent('s','done',{phaseIndex:1,phaseTitle:'Scan'}),agent('q','start',{phaseIndex:2,phaseTitle:'Fix'})];
 assert.deepEqual(workflowPhases({status:'running',workflowProgress:rows},0).map(p=>[p.title,p.status]),[['Scan','done'],['Fix','pending']]);
 assert.deepEqual(workflowPhases({status:'stopped',workflowProgress:rows},0).map(p=>[p.title,p.status]),[['Scan','done'],['Fix','notRun']]);
 assert.deepEqual(workflowPhases({status:'completed',workflowProgress:[{type:'workflow_phase',index:3,title:'Later'}]},0).map(p=>p.status),['notRun']);
});
