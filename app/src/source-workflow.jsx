import React,{useEffect,useRef,useState} from 'react';
import {Icon} from './icons.jsx';
import {SourceSettingsButton} from './source-settings-button.jsx';
import {SourceTooltip} from './source-tooltip.jsx';
import {WorkflowErrorPopover} from './source-workflow-error.jsx';
import {ActionDialog} from './source-session-actions.jsx';
import {workflowPhases,workflowCells,workflowSummary,workflowTokens,WORKFLOW_AGENTS_GROUP} from './workflow-progress-model.mjs';
import {workflowKey,workflowMemberControls,isModelWorkflow} from './model-workflow-model.mjs';
import {SourceSelect} from './source-select.jsx';
import {localizeBridgeText} from './bridge-text-model.mjs';
import {workflowArtifacts,artifactKindLabel,artifactView} from './workflow-artifacts-model.mjs';
import './source-workflow.css';
import {t,tn} from '../electron/i18n/index.mjs';
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

export function WorkflowRow({run,onOpen,warningLimits}){const active=run.status==='running',title=run.title||run.name||run.description,now=useClock(active),agents=workflowPhases(run,now).flatMap(p=>p.agents);if(!active)return <div className="swf-terminal" data-status={run.status} data-workflow-id={run.id}><span>{t('Ran workflow')}</span><span className="swf-terminal-title">{title}</span>{run.plan&&<span>{t('Plan · {count} agents estimated',{count:run.plannedAgents||0})}</span>}{['failed','stopped'].includes(run.status)&&(workflowSummary(run.summary,run.description)?<SourceTooltip content={workflowSummary(run.summary,run.description)}><span tabIndex={0} data-status={run.status}>{label[run.status]}</span></SourceTooltip>:<span data-status={run.status}>{label[run.status]}</span>)}</div>;
 return <button className="swf-compact" aria-label={t('View workflow: {title}',{title})} data-workflow-id={run.id} onClick={onOpen}><span className="swf-surface" aria-hidden="true"/><span className="swf-compact-content"><span className="swf-title source-shimmer">{title}</span><span className="swf-meta"><span>{run.plan?t('Workflow plan'):run.source==='model'&&!run.runId?t('Starting workflow'):t('Workflow')}</span>{agents.length>0&&<span><span className="swf-value">{agents.length}</span> {agents.length===1?t('agent'):t('agents')}</span>}<span>{Number.isFinite(run.startedAt)?duration(now-run.startedAt):null}</span>{run.paused&&<span>{t('Paused')}</span>}{largeWorkflow(run,warningLimits)&&<LargeWarning/>}</span><span className="swf-grid-wrap"><Cells compact anticipate agents={agents}/></span></span><span className="swf-caret-slot"><Icon name="CaretRight" size={16} style={{fontSize:"calc(1rem * var(--cds-rem-scale,1))"}}/></span></button>;
}
// /workflows' agent view (Claude Code 2.1.280: ↵ on an agent shows its prompt and result): what the agent was asked,
// what it returned, and its error, under its row. Escape closes it and returns to the agent.
function AgentDetail({agent,onClose}){
 const has=v=>typeof v==='string'&&v.trim();
 return <li className="swf-agent-detail" data-agent-detail={agent.id} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}}>
  <div role="region" aria-label={t('Agent details: {name}',{name:agent.label})} tabIndex={-1}>
   {has(agent.promptPreview)&&<section><h4>{t('Task')}</h4><pre>{agent.promptPreview}</pre></section>}
   {has(agent.resultPreview)&&<section><h4>{t('Result')}</h4><pre>{agent.resultPreview}</pre></section>}
   {has(agent.error)&&<section data-error=""><h4>{t('Error')}</h4><pre>{localizeBridgeText(agent.error)}</pre></section>}
   {!has(agent.promptPreview)&&!has(agent.resultPreview)&&!has(agent.error)&&<p>{agent.state==='done'?t('This agent returned no result.'):t('Nothing recorded for this agent yet.')}</p>}
   {(has(agent.promptPreview)||has(agent.resultPreview))&&<p>{t('Long tasks and results are shortened here; the run’s journal.jsonl has them in full.')}</p>}
  </div>
 </li>;
}
function Phase({phase,run,now,onMember}){const [openAgent,setOpenAgent]=useState(null),agentButtons=useRef(new Map());const closeAgent=id=>{setOpenAgent(null);agentButtons.current.get(id)?.focus();};const [expanded,setExpanded]=useState(null),open=expanded??(run.status==='running'&&phase.agents.length>0),status=phase.status==='pending'?t('Pending'):phase.status==='notRun'?t('Not run'):({error:t('Failed'),running:t('Running'),done:t('Done')})[phase.status];return <li className="swf-phase" data-phase-status={phase.status} data-stalled={phase.agents.some(a=>a.displayState==='stalled')||undefined} data-has-agents={phase.agents.length>0||undefined} data-anticipate={run.status==='running'&&phase.status!=='done'||undefined} data-expanded={open||undefined}><button className="swf-phase-head" aria-expanded={open} aria-label={[phase.index===WORKFLOW_AGENTS_GROUP?phase.title:t('Phase: {title}',{title:phase.title}),status,phase.agents.length?tn(phase.agents.length,'{done} of {count} agent done','{done} of {count} agents done',{done:phase.done}):null].filter(Boolean).join(t(', '))} onClick={()=>setExpanded(!open)}><span className="swf-phase-title"><span className={run.status==='running'&&phase.status==='running'&&!phase.agents.some(a=>a.displayState==='stalled')?'source-shimmer':''}>{phase.title}</span>{phase.agents.length>0&&<span>{phase.done}/{phase.agents.length}</span>}<span className="swf-phase-caret"><Icon name="CaretRight" size={16} style={{fontSize:"calc(1rem * var(--cds-rem-scale,1))"}} className={open?'swf-open':''}/></span></span>{(phase.agents.length>0||(run.status==='running'&&phase.status!=='done'))&&<span className="swf-phase-grid"><Cells agents={phase.agents} anticipate={run.status==='running'&&phase.status!=='done'}/></span>}</button>{open&&(phase.agents.length?<div className="swf-agents"><div className="swf-table"><span/><span className="swf-agent-label">{t('Agent')}</span><span className="swf-model">{t('Model')}</span><span className="swf-tokens">{t('Tokens')}</span><span className="swf-number">{t('Time')}</span><ul>{phase.agents.map(a=><React.Fragment key={a.id}><li data-state={a.state} data-agent-open={openAgent===a.id||undefined}><span>{a.state==='done'&&<Icon name="Check" size={12}/>}</span><span className="swf-agent-label" title={a.label}><button type="button" className="swf-agent-open" ref={node=>{if(node)agentButtons.current.set(a.id,node);else agentButtons.current.delete(a.id);}} aria-expanded={openAgent===a.id} aria-label={t('Agent details: {name}',{name:a.label})} onClick={()=>setOpenAgent(openAgent===a.id?null:a.id)}>{a.label}</button>{a.attempt>1&&<span className="swf-attempt"> · {t('Attempt {count}',{count:a.attempt})}</span>}{a.state==='skipped'&&<span className="swf-attempt"> · {t('Skipped')}</span>}{a.toolCalls>0&&<span className="swf-attempt swf-tools"> · {tn(a.toolCalls,'{count} tool call','{count} tool calls')}{a.lastToolName?' · '+t('last: {tool}',{tool:a.lastToolName}):''}</span>}{a.retryAt>now&&<span className="swf-attempt"> · {t('Waiting for rate limit')}</span>}{a.question&&a.state==='progress'&&<span className="swf-attempt swf-asking" title={a.question}> · {t('Waiting for an answer')}</span>}{run.status==='running'&&a.state==='progress'&&onMember&&workflowMemberControls(run)&&<MemberControls agent={a} onMember={onMember}/>}</span>{a.error?<span className="swf-agent-error"><WorkflowErrorPopover key={JSON.stringify([run.id,a.id])} error={localizeBridgeText(a.error)}/></span>:<><span className="swf-model" title={a.model}>{a.model}</span><span className="swf-tokens swf-number">{a.tokens?workflowTokens(a.tokens):''}</span><span className="swf-number">{run.status==='running'&&a.state==='progress'&&Number.isFinite(a.startedAt)?duration(now-a.startedAt):Number.isFinite(a.durationMs)?duration(a.durationMs):''}</span></>}</li>{openAgent===a.id&&<AgentDetail agent={a} onClose={()=>closeAgent(a.id)}/>}</React.Fragment>)}</ul></div></div>:<p className="swf-empty-phase">{({running:t('No agents have started yet'),completed:t('No agents ran in this phase'),stopped:t('Stopped before any agents started'),failed:t('Failed before any agents started')})[run.status]}</p>)}</li>;}
function MemberControls({agent,onMember}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function control(action){if(busy)return;setBusy(true);setError('');try{await onMember(agent,action);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <span className="swf-member-controls">{['retry','skip'].map(action=><button key={action} type="button" disabled={busy} aria-label={t(action==='retry'?'Retry agent: {name}':'Skip agent: {name}',{name:agent.label})} onClick={()=>control(action)}>{t(action==='retry'?'Retry':'Skip')}</button>)}{error&&<span role="alert">{error}</span>}</span>;
}
// /workflows f: agents by state (Claude's filter), applied inside every phase; a phase with none left is hidden.
const FILTERS=['all','running','done','error','skipped','pending'];
const filterLabel=value=>({all:t('All agents'),running:t('Running'),done:t('Done'),error:t('Failed'),skipped:t('Skipped'),pending:t('Queued')})[value];
// onPause(paused): /workflows p (OpenClaude Desktop's runner: no new agents start while paused; a model run only when its core
// pauses it, run.pauseControls: Qwen). onResume(): a settled model run its core can resume (run.resumable: ZCode's own
// resume gate). onSave({name,scope,overwrite}): /workflows s (the run's script into .claude/workflows or ~/.claude/workflows).
export function WorkflowCard({run,onStop,onMember,onPause,onResume,onSave,onArtifact,renderMarkdown,onOpenFile,onSettings,models,warningLimits}) {
 const active=run.status==='running',title=run.title||run.name||run.description,now=useClock(active),allPhases=workflowPhases(run,now),summary=workflowSummary(run.summary,run.description);
 const [filter,setFilter]=useState('all'),[saving,setSaving]=useState(false),[pausing,setPausing]=useState(false),[configuring,setConfiguring]=useState(false);
 const phases=filter==='all'?allPhases:allPhases.map(p=>({...p,agents:p.agents.filter(a=>(a.displayState==='stalled'?'running':a.displayState)===filter)})).filter(p=>p.agents.length>0);
 const total=allPhases.reduce((sum,p)=>sum+p.agents.length,0);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),root=useRef(null),alive=useRef(true);
 async function pause(){if(pausing)return;setPausing(true);setError('');try{await onPause(!run.paused);}catch(e){if(alive.current)setError(e.message);}finally{if(alive.current)setPausing(false);}}
 async function resume(){if(pausing)return;setPausing(true);setError('');try{await onResume();}catch(e){if(alive.current)setError(e.message);}finally{if(alive.current)setPausing(false);}}
 const pauseShown=active&&onPause&&(isModelWorkflow(run)?run.pauseControls===true&&!!run.runId:run.pausable!==false);
 const resumeShown=!active&&onResume&&isModelWorkflow(run)&&run.resumable===true&&!!run.runId;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(!active)setBusy(false);},[active]);
 async function stop(){if(busy)return;(root.current?.closest('.sbt-root')||root.current)?.focus();setBusy(true);try{await onStop();}catch(e){if(alive.current){setError(t('Couldn’t stop the task — check your connection and try again.')+' '+e.message);setBusy(false);}}}
 return <div ref={root} className="swf-card" data-task-id={'workflow:'+workflowKey(run)} data-workflow-status={run.status} tabIndex={-1}>
  <div className="swf-header">
   <div className="swf-heading-group">
    <div className="swf-heading"><span className={active?'source-shimmer':''}>{title}</span>
     {resumeShown&&<SourceSettingsButton size="sm" variant="secondary" icon="Play" iconSize="auto" iconOnly className="swf-pause epitaxy-task-row-secondary" aria-label={t('Resume this workflow')} title={t('Resume')} busy={pausing} disabled={pausing} onClick={resume}/>}
     {pauseShown&&<SourceSettingsButton size="sm" variant="secondary" icon={run.paused?'Play':'Pause'} iconSize="auto" iconOnly className="swf-pause epitaxy-task-row-secondary" aria-label={run.paused?t('Resume this workflow'):t('Pause this workflow')} title={run.paused?t('Resume'):t('Pause')} busy={pausing} disabled={pausing||busy} onClick={pause}/>}
     {active&&onStop?<SourceSettingsButton size="sm" variant="secondary" icon="Stop" iconSize="auto" iconOnly className="swf-stop epitaxy-task-row-secondary" aria-label={run.stopScope==='turn'?t('Stop the turn running this workflow'):t("Stop this workflow")} busy={busy} disabled={busy} onClick={stop}/>:!active&&Number.isFinite(run.durationMs)?<span className="swf-time">{duration(run.durationMs)}</span>:null}
    </div>
    <div className="swf-meta"><span className="swf-kind">{t('Workflow')}</span>{active&&busy&&<span>{t('Stopping…')}</span>}{!active&&<span data-status={run.status}>{label[run.status]}</span>}{active&&Number.isFinite(run.startedAt)&&<span>{duration(now-run.startedAt)}</span>}{run.paused&&active&&<span data-paused="">{t('Paused')}</span>}{active&&onStop&&run.stopScope==='turn'&&<span>{t('Stop interrupts the whole turn')}</span>}{largeWorkflow(run,warningLimits)&&<LargeWarning/>}</div>
    {active&&run.stall&&Number.isFinite(run.stall.sinceMs)&&<div className="swf-meta swf-stall" data-stall=""><Icon name="Timer" size={12}/><span>{t('Waiting for the model provider · {duration}',{duration:duration(run.stall.sinceMs+(Number.isFinite(run.stall.at)?Math.max(0,now-run.stall.at):0))})}</span></div>}
    {(total>0||run.usage)&&<div className="swf-meta">{total>0&&<span><span className="swf-value">{total}</span> {total===1?t('agent'):t('agents')}</span>}{run.usage&&<span><span className="swf-value">{workflowTokens(run.usage.totalTokens)}</span> tokens</span>}</div>}
   </div>
   {run.name&&run.description!==run.name&&<p className="swf-description">{run.description}</p>}
   {run.plan&&<p className="swf-description">{t('Plan · {count} agents estimated. Dynamic fan-outs may add more.',{count:run.plannedAgents||0})}</p>}
   {run.compatibilityNotes?.length>0&&<details className="swf-compatibility"><summary>{t('Compatibility differences ({count})',{count:run.compatibilityNotes.length})}</summary><p>{t('This run uses model, output or permission mappings. Its behavior may differ from Claude.')}</p><ul>{run.compatibilityNotes.map((message,index)=><li key={index}>{message}</li>)}</ul></details>}
   {summary&&['failed','stopped'].includes(run.status)&&<div className="swf-reason" data-status={run.status}><span>{run.status==='failed'?t('Error'):t('Stopped')}</span><span tabIndex={0} role="region" aria-label={run.status==='failed'?t('Error'):t('Stopped')}>{summary}</span></div>}
   {error&&<p role="alert">{error}</p>}
   {active&&Array.isArray(run.pendingQuestions)&&run.pendingQuestions.length>0&&<WorkflowQuestions questions={run.pendingQuestions} now={now}/>}
   {onArtifact&&workflowArtifacts(run).length>0&&<WorkflowArtifacts run={run} onArtifact={onArtifact} renderMarkdown={renderMarkdown} onOpenFile={onOpenFile}/>}
   {onSave&&!isModelWorkflow(run)&&!run.plan&&<div className="swf-actions"><SourceSettingsButton size="sm" variant="secondary" onClick={()=>setSaving(true)}>{t('Save workflow…')}</SourceSettingsButton></div>}
   {onSettings&&active&&!!run.runId&&<div className="swf-actions"><SourceSettingsButton size="sm" variant="secondary" onClick={()=>setConfiguring(true)}>{t('Configure…')}</SourceSettingsButton></div>}
  </div>
  {allPhases.length>0&&<div className="swf-phases"><span className="swf-phases-head"><span>{t('Phases')}</span>{total>1&&<SourceSelect label={t('Filter agents')} align="end" className="swf-filter" value={filter} onChange={setFilter} items={FILTERS.map(value=>({value,label:filterLabel(value)}))}/>}</span><ul>{phases.map(p=><Phase key={p.index} phase={p} run={run} now={now} onMember={onMember}/>)}</ul>{!phases.length&&<p className="swf-empty-phase">{t('No agents match this filter')}</p>}</div>}
  {saving&&<WorkflowSaveDialog run={run} onSave={onSave} onClose={()=>setSaving(false)}/>}
  {configuring&&<WorkflowSettingsDialog run={run} models={models} onSettings={onSettings} onClose={()=>setConfiguring(false)}/>}
 </div>;
}
// A run's open questions (ZCode: a workflow agent escalated a blocking question to the main agent, which answers it):
// who asks, what, the context, and how long it has waited.
function WorkflowQuestions({questions,now}){
 return <section className="swf-questions" aria-label={t('Questions waiting for an answer')}><h4>{t('Questions waiting for an answer')}</h4><ul>{questions.map(q=><li key={q.qid}>
  <span className="swf-question-head">{q.agent?t('{agent} asks',{agent:q.agent}):t('An agent asks')}{Number.isFinite(q.askedAt)&&<span className="swf-time"> · {t('waiting {duration}',{duration:duration(Math.max(0,now-q.askedAt))})}</span>}</span>
  <p>{q.question}</p>{q.context&&<details><summary>{t('Context')}</summary><p>{q.context}</p></details>}
 </li>)}</ul><p className="swf-questions-note">{t('The main agent answers these questions. To answer one yourself, tell it in the chat.')}</p></section>;
}
// The deliverables the run published (ZCode's artifact.*), primary first: each opens its content.
function WorkflowArtifacts({run,onArtifact,renderMarkdown,onOpenFile}){
 const [open,setOpen]=useState(null);
 const list=workflowArtifacts(run);
 return <section className="swf-artifacts" aria-label={t('Deliverables')}><h4>{t('Deliverables')}</h4><ul>{list.map(a=><li key={a.id} data-primary={a.primary||undefined}>
  <button type="button" className="swf-artifact-open" onClick={()=>setOpen(a)} aria-label={t('Open {title}',{title:a.title||a.id})}><Icon name={a.kind==='markdown'?'Note':a.kind==='file'?'File':'Grid'} size={14}/><span className="swf-artifact-title">{a.title||a.id}</span></button>
  <span className="swf-artifact-kind">{artifactKindLabel(a.kind)}{a.primary&&<> · {t('Main result')}</>}{a.version>1&&<> · {t('Version {version}',{version:a.version})}</>}</span>
  {a.description&&<p>{a.description}</p>}
 </li>)}</ul>{open&&<WorkflowArtifactDialog artifact={open} onArtifact={onArtifact} renderMarkdown={renderMarkdown} onOpenFile={onOpenFile} onClose={()=>setOpen(null)}/>}</section>;
}
function WorkflowArtifactDialog({artifact,onArtifact,renderMarkdown,onOpenFile,onClose}){
 const [state,setState]=useState({status:'loading',value:null,error:''});
 useEffect(()=>{let live=true;setState({status:'loading',value:null,error:''});Promise.resolve().then(()=>onArtifact(artifact)).then(value=>{if(live)setState({status:'ready',value,error:''});},e=>{if(live)setState({status:'error',value:null,error:localizeBridgeText(e?.message||String(e))});});return()=>{live=false;};},[artifact.id,artifact.version]);
 const value=state.value;
 let body=null;
 if(state.status==='loading')body=<p role="status">{t('Loading…')}</p>;
 else if(state.status==='error')body=<p role="alert">{state.error}</p>;
 else if(typeof value?.text==='string')body=value.kind==='markdown'||/markdown/i.test(value.mediaType||'')?(renderMarkdown?renderMarkdown(value.text):<pre>{value.text}</pre>):<pre>{value.text}</pre>;
 else if(typeof value?.dataBase64==='string')body=<img className="swf-artifact-image" alt={value.title||value.id} src={`data:${value.mediaType};base64,${value.dataBase64}`}/>;
 else if(Array.isArray(value?.items))body=<ArtifactBoard view={artifactView(value.kind,value.spec,value.items)}/>;
 else body=<p>{t('This file can’t be shown here.')}</p>;
 return <ActionDialog title={artifact.title||artifact.id} onClose={onClose} className="swf-artifact-dialog">
  {artifact.description&&<p className="swf-artifact-description">{artifact.description}</p>}
  <div className="swf-artifact-body" tabIndex={0} role="region" aria-label={artifact.title||artifact.id}>{body}</div>
  {value?.truncated&&<p className="swf-artifact-note">{t('Only the beginning of this file is shown.')}</p>}
  {value?.sourcePath&&onOpenFile&&<div className="swf-actions"><SourceSettingsButton size="sm" variant="secondary" onClick={()=>{onOpenFile({path:value.sourcePath});onClose();}}>{t('Open in Files')}</SourceSettingsButton></div>}
 </ActionDialog>;
}
function ArtifactBoard({view}){
 if(view.type==='metrics')return <ul className="swf-artifact-metrics">{view.tiles.map((tile,index)=><li key={index}><span>{tile.label}</span><strong>{tile.value}</strong></li>)}</ul>;
 if(view.type==='board')return <div className="swf-artifact-board">{view.columns.map((column,index)=><section key={index}><h4>{column.title} <span>{column.cards.length}</span></h4><ul>{column.cards.map((card,cardIndex)=><li key={cardIndex}><span>{card.title}</span>{card.details.map((detail,detailIndex)=><span key={detailIndex} className="swf-artifact-detail">{detail.label}: {detail.value}</span>)}</li>)}</ul></section>)}</div>;
 if(!view.rows.length)return <p>{t('Nothing reported yet.')}</p>;
 return <table className="swf-artifact-table"><thead><tr>{view.columns.map((column,index)=><th key={index} scope="col">{column}</th>)}</tr></thead><tbody>{view.rows.map((row,index)=><tr key={index}>{row.map((cell,cellIndex)=><td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table>;
}
// A running core-native run's Configure (ZCode's run settings): its sub-agents' model and how many agents run at once.
// Only what the user changed is sent; a new model goes on as a revised run that keeps the finished agents' work.
const SESSION_MODEL='';
export function WorkflowSettingsDialog({run,models=[],onSettings,onClose}){
 const listed=(Array.isArray(models)?models:[]).filter(m=>m&&!m.hidden&&typeof (m.model||m.id)==='string');
 const initialModel=typeof run.subagentModel==='string'?run.subagentModel.replace(/\$[^$]*$/,''):SESSION_MODEL;
 const [model,setModel]=useState(initialModel),[limit,setLimit]=useState(Number.isInteger(run.maxConcurrency)?String(run.maxConcurrency):''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const limitValue=limit.trim()===''?null:Number(limit);
 const limitValid=limitValue===null||(Number.isInteger(limitValue)&&limitValue>=1&&limitValue<=(run.concurrencyCeiling||1024));
 const initialLimit=Number.isInteger(run.maxConcurrency)?run.maxConcurrency:null;
 const changed=model!==initialModel||limitValue!==initialLimit;
 async function submit(event){event.preventDefault();if(busy||!changed||!limitValid)return;setBusy(true);setError('');
  try{await onSettings({...(model!==initialModel?{subagentModel:model===SESSION_MODEL?null:model}:{}),...(limitValue!==initialLimit?{maxConcurrency:limitValue}:{})});onClose();}
  catch(e){setError(localizeBridgeText(e?.message||String(e)));setBusy(false);}}
 const items=[{value:SESSION_MODEL,label:t('Same as the session')},...listed.map(m=>({value:m.model||m.id,label:m.displayName||m.model||m.id})),...(initialModel&&!listed.some(m=>(m.model||m.id)===initialModel)?[{value:initialModel,label:initialModel}]:[])];
 return <ActionDialog title={t('Workflow settings')} onClose={onClose}><form className="swf-launch" onSubmit={submit}>
  <div className="swf-field"><span>{t('Sub-agent model')}</span><SourceSelect label={t('Sub-agent model')} value={model} onChange={setModel} items={items}/></div>
  <p className="swf-settings-note">{t('A new model starts a revised run that keeps the work of agents that already finished.')}</p>
  <label>{t('Agents at once')}<input type="number" inputMode="numeric" min={1} max={run.concurrencyCeiling||1024} aria-label={t('Agents at once')} placeholder={run.concurrencyCeiling?t('Up to {count}',{count:run.concurrencyCeiling}):t('No limit')} value={limit} onChange={e=>{setLimit(e.target.value);setError('');}}/></label>
  {!limitValid&&<p role="alert">{t('Enter a whole number from 1 to {max}.',{max:run.concurrencyCeiling||1024})}</p>}
  {error&&<p role="alert">{error}</p>}
  <button type="submit" disabled={busy||!changed||!limitValid}>{busy?t('Saving…'):t('Apply')}</button>
 </form></ActionDialog>;
}
// /workflows s (Claude's "Save dynamic workflow"): Project scope → .claude/workflows/<slug>.js, User → ~/.claude/workflows.
const slug=name=>String(name??'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'workflow';
export function WorkflowSaveDialog({run,onSave,onClose}){
 const [name,setName]=useState(run.name||slug(run.description)),[scope,setScope]=useState('project'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[exists,setExists]=useState(null),[saved,setSaved]=useState(null);
 const target=scope==='project'?`.claude/workflows/${slug(name)}.js`:`~/.claude/workflows/${slug(name)}.js`;
 async function submit(event){event.preventDefault();if(busy)return;setBusy(true);setError('');try{const result=await onSave({name,scope,overwrite:exists===target});setSaved(result);}catch(e){if(/already exists/i.test(e.message)){setExists(target);setError(t('{path} already exists. Save again to overwrite, or change the name.',{path:target}));}else setError(e.message);}finally{setBusy(false);}}
 return <ActionDialog title={t('Save dynamic workflow')} onClose={onClose}>{saved?<div className="swf-launch"><p role="status">{t('Dynamic workflow saved to {path}. Run it with /workflow {name}, or ask for it by name.',{path:saved.path,name:saved.name})}</p><button type="button" onClick={onClose}>{t('Done')}</button></div>:<form className="swf-launch" onSubmit={submit}>
  <label>{t('Save as')}<input aria-label={t('Workflow name')} value={name} onChange={e=>{setName(e.target.value);setExists(null);setError('');}}/></label>
  <fieldset className="swf-scope"><legend>{t('Scope')}</legend>{[['project',t('Project')],['user',t('User')]].map(([value,text])=><label key={value}><input type="radio" name="swf-scope" value={value} checked={scope===value} onChange={()=>{setScope(value);setExists(null);setError('');}}/>{text}</label>)}</fieldset>
  <p>{t('{scope} scope · {path}',{scope:scope==='project'?t('Project'):t('User'),path:target})}</p>
  {error&&<p role="alert">{error}</p>}
  <button type="submit" disabled={busy||!name.trim()}>{busy?t('Saving…'):exists===target?t('Overwrite'):t('Save')}</button></form>}</ActionDialog>;
}
// Local launcher reuses the host dialog. The source has no Codex script picker.
export function WorkflowLaunch({initial={},onClose,onStart,onPick}){const [file,setFile]=useState(initial.file||''),[args,setArgs]=useState(initial.args?JSON.stringify(initial.args,null,2):'{}'),[plan,setPlan]=useState(!!initial.plan),[busy,setBusy]=useState(false),[error,setError]=useState('');return <ActionDialog title={t("Run workflow")} onClose={onClose}><form className="swf-launch" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{await onStart({file,args:JSON.parse(args),plan,resumeId:initial.resumeId});onClose();}catch(error){setError(error.message);setBusy(false);}}}><label>{t("Workflow file")}<input aria-label={t("Workflow file")} value={file} onChange={e=>setFile(e.target.value)}/></label><button type="button" onClick={async()=>{try{const selected=await onPick();if(selected)setFile(selected);}catch(error){setError(error.message);}}}>{t("Choose file…")}</button><label>{t("Arguments (JSON)")}<textarea aria-label={t("Workflow arguments")} value={args} onChange={e=>setArgs(e.target.value)}/></label><label><input type="checkbox" checked={plan} onChange={e=>setPlan(e.target.checked)}/>{t("Plan only")}</label><p>{accessCopy[initial.access]||accessCopy['read-only']} {t('A plan estimates calls without using a model.')}</p>{error&&<p role="alert">{error}</p>}<button type="submit" disabled={busy||!file}>{busy?t('Starting…'):plan?t('Plan workflow'):t('Run workflow')}</button></form></ActionDialog>;}
