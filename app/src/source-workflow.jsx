import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Icon} from './icons.jsx';
import {SourceTooltip} from './source-tooltip.jsx';
import {ActionDialog} from './source-session-actions.jsx';
import {workflowPhases,workflowCells,workflowSummary} from './workflow-progress-model.mjs';
import {StartMessage} from './source-code-start-adapters.jsx';
// W14-code r4 R4T-08b: the desktop's workflow card (c96d752d0 N$), its task record and the app's QueryClient.
import {WorkflowTaskCard} from './generated/code-transcript/code-transcript.mjs';
import {workflowTask} from './source-code-feed-adapters.jsx';
import {QueryClientProvider} from './generated/files-changes/file-browser-query.mjs';
import {fileBrowserQueryClient} from './source-breadcrumb-adapters.jsx';
import './source-workflow.css';
import {t} from '../electron/i18n/index.mjs';
const label={completed:t('Completed'),running:t('Running'),stopped:t('Stopped'),failed:t('Failed')};
// The access the session's Mode gives /workflow agents (permission-policy.mjs workflowAccess); they never ask.
const accessCopy={'read-only':t('Agents run with read-only access in this mode.'),'workspace-write':t('Agents can create and edit files in the working directory without asking.'),'danger-full-access':t('Bypass permissions: agents can edit files and run commands anywhere without asking.')};
const duration=ms=>{const seconds=Math.max(0,Math.round(ms/1000));return seconds>=3600?t('{hours}h {minutes}m {seconds}s',{hours:Math.floor(seconds/3600),minutes:Math.floor(seconds/60)%60,seconds:seconds%60}):seconds>=60?t('{minutes}m {seconds}s',{minutes:Math.floor(seconds/60),seconds:seconds%60}):t('{seconds}s',{seconds:seconds%60});};
// Claude Code 2.1.280's large-workflow warning: more scheduled agents than the cap (Settings or
// CLAUDE_CODE_WORKFLOW_SIZE_WARNING_AGENTS, else an explicit size guideline's count, else 25), or tokens (actual or
// projected from the per-agent average, 70k before any started) above 1.5M; never in ultracode. Each App side passes
// its own session's limits (warningLimits prop): split view renders two sides, one may be in ultracode and one not.
export const DEFAULT_WORKFLOW_WARNING_LIMITS=Object.freeze({agents:25,tokens:1500000,suppressed:false});
export function largeWorkflow(run,limits){
 limits={...DEFAULT_WORKFLOW_WARNING_LIMITS,...limits};
 if(!run||run.status!=='running'||limits.suppressed)return false;
 const agents=(run.workflowProgress||[]).filter(p=>p.type==='workflow_agent'),started=agents.filter(a=>a.state!=='start'),total=run.usage?.totalTokens||0;
 const projected=Math.max(total,Math.round((started.length?total/started.length:70000)*agents.length));
 return agents.length>limits.agents||total>limits.tokens||projected>limits.tokens;
}
const LargeWarning=()=><span className="swf-large" data-large-workflow=""><Icon name="Warning" size={12}/> {t('Large workflow · /workflows to stop')}</span>;
function useClock(active){const [now,setNow]=useState(Date.now);useEffect(()=>{if(!active)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[active]);return now;}
// Claude Desktop 2.19675.0: p0/c0, 6px cells, 2px gaps, 280 compact cells plus an anticipation cell.
function Cells({agents,compact=false,anticipate=false}) {
 const counts=agents.reduce((v,a)=>{v[a.displayState]=(v[a.displayState]||0)+1;return v;},{});
 const cells=workflowCells(agents,compact?280:Infinity),[hover,setHover]=useState(null),hoverBounds=useRef(null);
 const aria=agents.length?t('{done} of {total} agents done, {running} running, {stalled} stalled, {failed} failed',{done:counts.done||0,total:agents.length,running:counts.running||0,stalled:counts.stalled||0,failed:counts.error||0}):t('Waiting for agents to start');
 const state=typeof hover==='number'?cells[hover]?.displayState:undefined;
 const content=hover==='ghost'&&anticipate?t('More agents may appear'):({error:t('Failed'),done:t('Done'),running:t('Running'),stalled:t('Stalled'),skipped:t('Skipped'),pending:t('Queued')})[state]||aria;
 function move(event){const cell=event.target.closest('[data-cell]');if(cell){hoverBounds.current=cell.getBoundingClientRect();setHover(cell.dataset.cell==='ghost'?'ghost':Number(cell.dataset.cell));return;}const r=hoverBounds.current;if(r&&event.clientX>=r.left-3&&event.clientX<=r.right+3&&event.clientY>=r.top-3&&event.clientY<=r.bottom+3)return;hoverBounds.current=null;setHover(null);}
 return <SourceTooltip delay={150} content={content} detail={typeof hover==='number'&&cells.length===agents.length?agents[hover]?.label:undefined} hoverable={false} closeOnClick={false} trackCursorAxis="both"><span className={'swf-cells'+(compact?' swf-cells-compact':'')} role="img" aria-label={aria} onPointerMove={move} onPointerLeave={()=>{hoverBounds.current=null;}} onPointerCancel={()=>{hoverBounds.current=null;}}>
  {cells.map((a,i)=><span key={i} className="swf-cell" data-cell={i} data-state={a.displayState} style={{'--pulse-duration':`${(2.4+((i*.7548776662)%1)*1.4).toFixed(2)}s`,'--pulse-delay':`${(-((i*.61803398875)%1)*(2.4+((i*.7548776662)%1)*1.4)).toFixed(2)}s`}}/>)}
  {anticipate&&<span className="swf-cell" data-cell="ghost" data-state="ghost" aria-hidden="true"/>}
 </span></SourceTooltip>;
}

// c96d752d0 $Q (59iDR2YzIC): the run's agent count, one ICU plural with the number in C$e's text-secondary span.
const agentValue=chunks=><span className="swf-value">{chunks}</span>;
const AgentCount=({n})=><span className="whitespace-nowrap"><StartMessage defaultMessage="{n, plural, one {<v>#</v> agent} other {<v>#</v> agents}}" id="59iDR2YzIC" values={{n,v:agentValue}}/></span>;
export function WorkflowRow({run,onOpen,warningLimits}){const active=run.status==='running',title=run.title||run.name||run.description,now=useClock(active),agents=workflowPhases(run,now).flatMap(p=>p.agents);if(!active)return <div className="swf-terminal" data-status={run.status} data-workflow-id={run.id}><span>{t('Ran workflow')}</span><span className="swf-terminal-title">{title}</span>{run.plan&&<span>{t('Plan · {count} agents estimated',{count:run.plannedAgents||0})}</span>}{['failed','stopped'].includes(run.status)&&(workflowSummary(run.summary,run.description)?<SourceTooltip content={workflowSummary(run.summary,run.description)}><span tabIndex={0} data-status={run.status}>{label[run.status]}</span></SourceTooltip>:<span data-status={run.status}>{label[run.status]}</span>)}</div>;
 return <button className="swf-compact" aria-label={t('View workflow: {title}',{title})} data-workflow-id={run.id} onClick={onOpen}><span className="swf-surface" aria-hidden="true"/><span className="swf-compact-content"><span className="swf-title source-shimmer">{title}</span><span className="swf-meta"><span>{run.plan?t('Workflow plan'):run.source==='model'&&!run.runId?t('Starting workflow'):t('Workflow')}</span>{agents.length>0&&<AgentCount n={agents.length}/>}<span>{Number.isFinite(run.startedAt)?duration(now-run.startedAt):null}</span>{largeWorkflow(run,warningLimits)&&<LargeWarning/>}</span><span className="swf-grid-wrap"><Cells compact anticipate agents={agents}/></span></span><span className="swf-caret-slot"><Icon name="CaretRight" size={16} style={{fontSize:"calc(1rem * var(--cds-rem-scale,1))"}}/></span></button>;
}
// W14-code r4 ct-feed R4T-08b (E95): a workflow run in the Background tasks pane is the desktop's workflow card — c96d752d0
// N$ detailed (k1e: the title, Stop, "Workflow · {time} · {n} agents", the reason a failed / stopped run ended, the phases
// with their agents, "Up next: {phases}", "Failed agents", Stalled), as cccc2cf0a wN draws a local_workflow task: `u(ds,
// {task: r, variant: "detailed", sessionRef: i, onStop: a, stopping: o?.has(r.taskId), nested: t.nested, ownLine:
// t.variant !== "line"})`. The run is the desktop's task record (source-code-feed-adapters.jsx workflowTask); D1e's
// output-file read is a react-query (the app's one QueryClient). The host's own card (member Retry / Skip, Pause /
// Resume, deliverables, Configure, open questions, compatibility notes, the large-workflow warning, the agent view) is
// gone with it. `data-task-id` is the pane's focus anchor (source-background-tasks.jsx focusTask).
export function SourceWorkflowTask({task,sessionId=null,onStop}){
 const run=task.run,[stopping,setStopping]=useState(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const shown=useMemo(()=>workflowTask(run,typeof run?.itemId==='string'?run.itemId:run?.id),[run]);
 const sessionRef=useMemo(()=>(sessionId?{type:'local',id:sessionId}:null),[sessionId]);
 const stop=useCallback(async()=>{setStopping(true);try{await onStop?.();}finally{if(alive.current)setStopping(false);}},[onStop]);
 if(!shown)return null;
 return <div data-task-id={task.id} data-workflow-status={shown.status}><QueryClientProvider client={fileBrowserQueryClient}>
  <WorkflowTaskCard task={shown} variant="detailed" sessionRef={sessionRef} onStop={onStop&&shown.status==='running'?stop:undefined} stopping={stopping} nested={false} ownLine={true}/>
 </QueryClientProvider></div>;
}
// Local launcher reuses the host dialog. The source has no Codex script picker.
export function WorkflowLaunch({initial={},onClose,onStart,onPick}){const [file,setFile]=useState(initial.file||''),[args,setArgs]=useState(initial.args?JSON.stringify(initial.args,null,2):'{}'),[plan,setPlan]=useState(!!initial.plan),[busy,setBusy]=useState(false),[error,setError]=useState('');return <ActionDialog title={t("Run workflow")} onClose={onClose}><form className="swf-launch" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{await onStart({file,args:JSON.parse(args),plan,resumeId:initial.resumeId});onClose();}catch(error){setError(error.message);setBusy(false);}}}><label>{t("Workflow file")}<input aria-label={t("Workflow file")} value={file} onChange={e=>setFile(e.target.value)}/></label><button type="button" onClick={async()=>{try{const selected=await onPick();if(selected)setFile(selected);}catch(error){setError(error.message);}}}>{t("Choose file…")}</button><label>{t("Arguments (JSON)")}<textarea aria-label={t("Workflow arguments")} value={args} onChange={e=>setArgs(e.target.value)}/></label><label><input type="checkbox" checked={plan} onChange={e=>setPlan(e.target.checked)}/>{t("Plan only")}</label><p>{accessCopy[initial.access]||accessCopy['read-only']} {t('A plan estimates calls without using a model.')}</p>{error&&<p role="alert">{error}</p>}<button type="submit" disabled={busy||!file}>{busy?t('Starting…'):plan?t('Plan workflow'):t('Run workflow')}</button></form></ActionDialog>;}
