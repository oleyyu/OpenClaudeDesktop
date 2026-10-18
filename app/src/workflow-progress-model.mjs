import {t} from '../electron/i18n/index.mjs';
import {localizeBridgeText} from './bridge-text-model.mjs';
// Input is our embedded engine's actual events, never app-server protocol items.
export function workflowEvent(run,event,at){
 const next={...run,sequence:(run.sequence||0)+1,workflowProgress:(run.workflowProgress||[]).map(p=>({...p}))};
 const progress=next.workflowProgress,agents=progress.filter(p=>p.type==='workflow_agent');
 const phase=(title,details={})=>{let found=progress.findLast(p=>p.type==='workflow_phase'&&p.title===title);if(!found){found={type:'workflow_phase',index:details.index??Math.max(0,...progress.filter(p=>p.type==='workflow_phase').map(p=>p.index))+1,title,...details.kind?{kind:details.kind}:{}};progress.push(found);}return found;};
 if(event.type==='metadata'){if(event.name)next.name=event.name;if(typeof event.title==='string')next.title=event.title;if(event.description)next.description=event.description;}
 // Keep compatibility notices visible in Tasks and in event replay. Ordinary
 // script logs are not notices. Bound and de-duplicate messages across agents.
 if(event.type==='log'&&typeof event.message==='string'&&(/^(Workflow compatibility|model:)/.test(event.message)||/^workflow agent .*compatibility:/.test(event.message))){
  const message=event.message.replace(/^Workflow compatibility \[[^\]]*\]/,'Workflow compatibility').slice(0,2000);
  const notices=run.compatibilityNotes||[];
  if(!notices.includes(message))next.compatibilityNotes=[...notices,message].slice(0,32);
 }
 if(event.type==='phase')phase(String(event.title),event);
 if(['admission','start','end','cached','progress'].includes(event.type)&&event.kind!=='human'&&event.id){
  let agent=agents.find(a=>a.id===event.id);
  if(!agent&&['admission','start','cached'].includes(event.type)){const group=event.phase!=null?phase(String(event.phase),{index:event.phaseIndex}):undefined;agent={type:'workflow_agent',index:event.seq??agents.length+1,id:event.id,label:event.label??'Agent',state:event.type==='cached'?'done':event.type==='admission'?'start':'progress',...(group?{phaseIndex:group.index,phaseTitle:group.title}:{}),...(event.type==='start'?{startedAt:at,lastProgressAt:at}:{}),model:event.model||undefined};progress.push(agent);}
  if(agent&&event.type==='admission'){agent.state=event.state==='failed'?'error':'start';agent.queuedAt=event.queuedAt;agent.lastProgressAt=event.lastProgressAt;if(event.error!==undefined)agent.error=event.error;if(event.promptPreview!==undefined)agent.promptPreview=event.promptPreview;}
  if(agent&&event.type==='start'&&agent.state==='start'){agent.state='progress';agent.startedAt=at;agent.lastProgressAt=at;if(event.model)agent.model=event.model;}
  if(agent&&['start','cached'].includes(event.type)){if(event.childId)agent.childId=event.childId;if(typeof event.progressSupported==='boolean')agent.progressSupported=event.progressSupported;}
  if(agent&&event.type==='progress'&&agent.state==='progress'){agent.lastProgressAt=at;for(const key of ['activeTools','toolCalls','attempt','retryAt','tokens'])if(Number.isFinite(event[key]))agent[key]=event[key];if(event.lastToolName)agent.lastToolName=event.lastToolName;}
  // A skipped agent (the runner's and the engines' 'skipped by user') is not a failure.
  if(agent&&event.type==='end'){agent.state=event.status==='skipped'||event.error==='skipped by user'?'skipped':event.status&&event.status!=='completed'?'error':'done';agent.error=agent.state==='skipped'?undefined:event.error||(agent.state==='error'?`Agent ${event.status}`:undefined);if(event.model)agent.model=event.model;if(Number.isFinite(event.tokens))agent.tokens=event.tokens;if(Number.isFinite(event.ms))agent.durationMs=event.ms;}
 }
 if(event.type==='settled'){next.status=event.status;next.completedAt=event.recovered?undefined:at;next.durationMs=event.recovered?undefined:Math.max(0,at-run.startedAt);next.summary=event.error;next.result=event.result;for(const p of progress)if(p.type==='workflow_agent'&&p.state==='progress'){p.state='error';p.error=event.status==='stopped'?'Stopped before completion':'Workflow ended before completion';}}
 if(event.type==='plan-agent')next.plannedAgents=(next.plannedAgents||0)+1;
 // A failed parallel/pipeline slot or nested workflow (the runner's slot-failure): the <task-notification>'s <failures>.
 if(event.type==='slot-failure'&&typeof event.message==='string'&&event.message)next.slotFailures=[...(run.slotFailures||[]),event.message].slice(-100);
 // The result preview a finished agent's end event carries: a run that fails later still counts empty results right.
 if(event.type==='end'&&event.kind!=='human'&&event.id&&typeof event.resultPreview==='string'){const agent=agents.find(a=>a.id===event.id);if(agent&&agent.state==='done')agent.resultPreview=event.resultPreview;}
 // /workflows p: a paused run admits no new agents until resumed; settling ends the pause.
 if(event.type==='paused')next.paused=event.paused===true;
 // A runtime that can't pause (a core-hosted engine: the DeepSeek /workflow host) says so; its card has no Pause.
 if(event.type==='pausable'){if(event.pausable===false){next.pausable=false;delete next.paused;}else delete next.pausable;}
 if(event.type==='settled')delete next.paused;
 next.usage={totalTokens:progress.reduce((sum,p)=>sum+(p.tokens||0),0)};
 return next;
}
export const workflowAgentState=(agent,now)=>agent.state==='progress'?(agent.progressSupported!==false&&!(agent.activeTools>0)&&Number.isFinite(agent.lastProgressAt)&&now-agent.lastProgressAt>90000?'stalled':'running'):agent.state==='done'?'done':agent.state==='error'?'error':agent.state==='skipped'?'skipped':'pending';
// c62da1b56 ge/he: agents without a phase gather in one last group, 'Agents' (or 'Other agents' beside real phases);
// a settled run's phase whose agents never started reads 'Not run' (status notRun), not 'Pending'.
export const WORKFLOW_AGENTS_GROUP=Number.MAX_SAFE_INTEGER;
export function workflowPhases(run,now){
 const groups=new Map();
 const group=(index,title)=>{let p=groups.get(index);if(!p){p={index,title:title??`Phase ${index+1}`,agents:[]};groups.set(index,p);}else if(title&&p.title.startsWith('Phase '))p.title=title;return p;};
 for(const p of run.workflowProgress||[]){
  if(p.type==='workflow_phase'){group(p.index,p.title);continue;}
  if(p.type!=='workflow_agent')continue;
  (p.phaseIndex===undefined?group(WORKFLOW_AGENTS_GROUP):group(p.phaseIndex,p.phaseTitle)).agents.push({...p,displayState:workflowAgentState(p,now)});
 }
 const settled=run.status&&run.status!=='running',others=groups.get(WORKFLOW_AGENTS_GROUP);
 if(others)others.title=groups.size>1?t('Other agents'):t('Agents');
 return [...groups.values()].sort((a,b)=>a.index-b.index).map(p=>({...p,done:p.agents.filter(a=>a.state==='done').length,status:p.agents.some(a=>a.state==='error')?'error':p.agents.some(a=>a.state==='progress')?(settled?'done':'running'):!p.agents.length||p.agents.every(a=>a.displayState==='pending')?(settled?'notRun':'pending'):p.agents.every(a=>a.state==='done'||a.state==='skipped')||settled?'done':'running',tokens:p.agents.reduce((sum,a)=>sum+(a.tokens||0),0)}));
}
export function workflowSummary(summary,description){
 if(!summary||summary===description)return '';
 const match=summary.match(/^(?:Dynamic w|W)orkflow ".*" (?:completed|failed|stopped|was killed)(?::\s*(.+))?\.?\s*$/s);
 const text=match?match[1]?.trim():summary;
 // A bridge's bare 'Stopped' repeats the status label beside it; its other fixed reasons read in the UI language.
 if(!text||text==='Stopped')return '';
 const shown=localizeBridgeText(text);
 return shown!==text?shown:text[0].toUpperCase()+text.slice(1);
}
export function mergeWorkflow(runs,run){const existing=runs.find(r=>r.id===run.id);if(existing&&existing.sequence>=run.sequence)return runs;return [...runs.filter(r=>r.id!==run.id),run].sort((a,b)=>a.startedAt-b.startedAt);}
// Compressed grids use Claude's four buckets plus skipped; stalled is included in running when compressed.
export function workflowCells(agents,capacity){
 if(agents.length<=capacity)return agents;
 if(capacity<=0)return [];
 const groups=['done','running','error','skipped','pending'].map(displayState=>({displayState,count:agents.filter(a=>(a.displayState==='stalled'?'running':a.displayState)===displayState).length})).filter(g=>g.count);
 const alloc=groups.map((g,i)=>i<capacity?1:0),slots=Math.max(0,capacity-groups.length);
 const fractions=groups.map(g=>g.count/agents.length*slots);fractions.forEach((v,i)=>alloc[i]+=Math.floor(v));
 let left=capacity-alloc.reduce((a,b)=>a+b,0);
 for(const {i} of fractions.map((v,i)=>({i,f:v-Math.floor(v)})).sort((a,b)=>b.f-a.f)){if(left<=0)break;alloc[i]++;left--;}
 return groups.flatMap((g,i)=>Array.from({length:alloc[i]},()=>({displayState:g.displayState,label:t('{count} agents',{count:g.count})})));
}

// Claude shared-16 $O/tk: one decimal, remove .0, promote rounded thousands.
export function workflowTokens(value){
 for(const [divisor,suffix,next] of [[1e9,'B','B'],[1e6,'M','B'],[1e3,'k','M']]){
  if(value<divisor)continue;
  const rounded=Number((value/divisor).toFixed(1));
  return rounded>=1000&&divisor<1e9?Number((value/(divisor*1000)).toFixed(1))+next:rounded+suffix;
 }
 return String(value);
}
