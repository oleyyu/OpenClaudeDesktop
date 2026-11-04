// The large-workflow composer band (cc43287c9 Oq/kq/Aq/jq/Vq/Hq, Nq/Rq/zq): the first running workflow task whose
// scheduled agents or projected tokens pass the caps gets a warning band above the composer with Stop workflow.
// The caps are this side's large-workflow limits (source-workflow.jsx DEFAULT_WORKFLOW_WARNING_LIMITS: Settings or
// the size guideline, 25 agents / 1.5M tokens by default, none in ultracode); the per-agent projection before any
// agent started is Dq's 70k. A drawn warning only grows (Aq) until the run settles; dismissing it is per task.
import {t,tn,getLocale} from '../electron/i18n/index.mjs';

export const WORKFLOW_SIZE_PROJECTION_PER_AGENT=70000;
const DEFAULT_LIMITS=Object.freeze({agents:25,tokens:1500000,suppressed:false});

/** kq: which cap a count and a projection pass ('agents', 'tokens', 'both'), or undefined. */
export function workflowSizeAxis(scheduledAgents,projectedTokens,limits=DEFAULT_LIMITS){
 const agents=scheduledAgents>limits.agents,tokens=projectedTokens>limits.tokens;
 return agents&&tokens?'both':agents?'agents':tokens?'tokens':undefined;
}
/** jq: scheduled agents, and the ones that started (finished, failed, timed or with tokens). */
export function workflowAgentCounts(progress){
 let scheduledAgents=0,startedAgents=0;
 for(const row of Array.isArray(progress)?progress:[]){
  if(row?.type!=='workflow_agent')continue;
  scheduledAgents++;
  if(row.state==='done'||row.state==='error'||Number.isFinite(row.startedAt)||(row.tokens??0)>0)startedAgents++;
 }
 return {scheduledAgents,startedAgents};
}
/** Oq: the projection from the per-started-agent average (70k each before any started), when a cap is passed. */
export function workflowSizeWarning({scheduledAgents,startedAgents,totalTokens},limits=DEFAULT_LIMITS){
 const perAgent=startedAgents>0?totalTokens/startedAgents:WORKFLOW_SIZE_PROJECTION_PER_AGENT;
 const projectedTokens=Math.max(totalTokens,Math.round(perAgent*scheduledAgents));
 const axis=workflowSizeAxis(scheduledAgents,projectedTokens,limits);
 return axis===undefined?undefined:{axis,scheduledAgents,totalTokens,projectedTokens,agentCap:limits.agents,tokenCap:limits.tokens};
}
/** Aq: a drawn warning never shrinks while the run is going (fewer agents left, a lower average). */
export function growWorkflowSizeWarning(fresh,previous,limits=DEFAULT_LIMITS){
 if(previous===undefined)return fresh;
 const scheduledAgents=Math.max(fresh.scheduledAgents,previous.scheduledAgents),projectedTokens=Math.max(fresh.projectedTokens,previous.projectedTokens);
 return scheduledAgents===previous.scheduledAgents&&projectedTokens===previous.projectedTokens?previous
  :{...fresh,scheduledAgents,projectedTokens,axis:workflowSizeAxis(scheduledAgents,projectedTokens,limits)??fresh.axis};
}
/** Vq: the first running workflow task that warrants the band and whose band is not dismissed. */
export function pickWorkflowSizeWarning(tasks,entries,limits=DEFAULT_LIMITS){
 limits={...DEFAULT_LIMITS,...limits};
 if(limits.suppressed)return null;
 for(const task of Array.isArray(tasks)?tasks:[]){
  if(task?.kind!=='workflow'||task.status!=='running'||task.run?.status!=='running')continue;
  const entry=entries.get(task.id);
  if(entry==='dismissed')continue;
  const fresh=workflowSizeWarning({...workflowAgentCounts(task.run.workflowProgress),totalTokens:task.run.usage?.totalTokens??0},limits);
  const warning=fresh===undefined?entry?.warning:growWorkflowSizeWarning(fresh,entry?.warning,limits);
  if(warning!==undefined)return {task,warning};
 }
 return null;
}
/** Nq/Fq/Iq/Rq/zq: the per-task band entries ({warning} or 'dismissed'), in memory for the app's life. */
export function createWorkflowSizeStore(){
 let entries=new Map();const listeners=new Set();
 const emit=()=>{for(const listener of [...listeners])listener();};
 return {
  subscribe(listener){listeners.add(listener);return()=>{listeners.delete(listener);};},
  entries:()=>entries,
  set(taskId,value){if(entries.get(taskId)===value)return;entries=new Map(entries).set(taskId,value);emit();},
  /** zq: a settled run's entry goes (a run started again warns afresh). */
  clear(taskIds){const gone=taskIds.filter(id=>entries.has(id));if(!gone.length)return;const next=new Map(entries);for(const id of gone)next.delete(id);entries=next;emit();},
 };
}
/** The band's settle step (Uq's first effect): drop entries of runs that stopped running and keep the drawn warning. */
export function syncWorkflowSizeStore(store,tasks,picked){
 const entries=store.entries();
 store.clear((Array.isArray(tasks)?tasks:[]).filter(task=>task?.kind==='workflow'&&task.status!=='running'&&entries.has(task.id)).map(task=>task.id));
 if(!picked)return;
 const entry=store.entries().get(picked.task.id);
 if(entry!=='dismissed'&&entry?.warning!==picked.warning)store.set(picked.task.id,{warning:picked.warning});
}
/** Intl compact notation with one fraction digit (Uq's formatNumber): 1.6M, 2.1M. */
export function compactTokens(value,locale=getLocale()){
 try{return new Intl.NumberFormat(locale,{notation:'compact',maximumFractionDigits:1}).format(value);}catch{return String(value);}
}
/** Hq (3.6556.2 o6): the band's detail line for the axis it was drawn for. W14-code r8 r8c-04 / sh8-02: o6 `{drawn, named}`
 * — with a named workflow (p6's "{name} is larger than most workflows." already says it) the agents and tokens lines
 * are the short 1UIDTGel6A "Up to {agents} scheduled." / gkJGMhm9Rl "As many as {tokens} tokens projected."; "both"
 * reads the same either way. */
export function workflowSizeDetail(warning,locale=getLocale(),named=false){
 if(!warning)return '';
 const tokens=compactTokens(warning.projectedTokens,locale);
 if(named&&warning.axis==='agents')return tn(warning.scheduledAgents,'Up to {count} agent scheduled.','Up to {count} agents scheduled.');
 if(named&&warning.axis==='tokens')return t('As many as {tokens} tokens projected.',{tokens});
 if(warning.axis==='agents')return tn(warning.scheduledAgents,'Up to {count} agent scheduled, more than most workflows use.','Up to {count} agents scheduled, more than most workflows use.');
 if(warning.axis==='tokens')return t('As many as {tokens} tokens projected, more than most workflows use.',{tokens});
 return tn(warning.scheduledAgents,'Up to {count} agent scheduled, about {tokens} tokens projected.','Up to {count} agents scheduled, about {tokens} tokens projected.',{tokens});
}
