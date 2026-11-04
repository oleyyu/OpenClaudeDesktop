import React,{useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
// E41: CDS by semantic name from the view-tabs file (this module is imported by source-agent's pane graph).
import {CdsButton,CdsIcon,CdsShimmer} from './generated/view-tabs/shared-frame-6jtSkIit.js';
// W14-code r7 r7pa-07: cccc2cf0a `mp` (c86240138 n), the task row's text-link class (View transcript).
import {n as TASK_LINK_CLASS} from './generated/transcript-rows/rows-c86240138-Cq_NwsO0.mjs';
// W14-code r7 r7pa-06: cccc2cf0a `wr` (Ff), the relative day-and-time phrase tN shows for a one-shot prompt.
import {pA as relativeTime} from './generated/routines-shared/shared-2-TF8v67kg.mjs';
// W14-code r6 r6pa-03: cccc2cf0a Ho = c96d752d0 UQ (the task row's Stop button), exported by code-transcript as TaskStopButton.
import {TaskStopButton} from './generated/code-transcript/code-transcript.mjs';
// W14-code r4 r4pa-05: the empty list is the EmptyState (cc0a875c8 t, cccc2cf0a nd), as source-agent.jsx uses it.
import {f as EmptyState} from './generated/code-routines/cc0a875c8-Ba9KI-Fw.mjs';
import {createDismissedTasksStore,createTaskRowsStore,loopDaysLeft,stopsInLabel,monitorTasks,previewServerTasks,scheduledLoops,taskKindLabel,taskOutput,taskSections} from './background-tasks-model.mjs';
import { formatDuration } from './command-row-model.mjs';
import { SourceAnsiText } from './source-ansi-text.jsx';
import { SourceCommandLine } from './source-command.jsx';
import { taskOutputFollow } from './task-output-follow.mjs';
import { getLocale, t } from '../electron/i18n/index.mjs';
import './source-background-tasks.css';
import { localizeBridgeText } from './bridge-text-model.mjs';
import { assistantName } from './persona-store.mjs';
import { useSourceToasts } from './source-toast.jsx';
import { StartMessage, useStartIntl } from './source-code-start-adapters.jsx';
import { compactTokens } from './context-usage-model.mjs';
// ES/wS/TS: one dismissed-task store for the pane header's Clear button and the list.
export const dismissedTasksStore=createDismissedTasksStore((()=>{try{return globalThis.localStorage;}catch{return null;}})());
// c03935b01 openTaskRowsBySession / stoppingIdsBySession: open rows and pending stops outlive the pane and session switches.
export const taskRowsStore=createTaskRowsStore();
/** rw (cccc2cf0a :12505-12522): the header's ghost Trash button; aria-disabled (opacity) while nothing has finished.
 * W14-code r3 fr3-08: the CDS Button itself, as 3.6556.2 cccc2cf0a draws it: `u(F,{variant:"ghost",icon:"Trash",
 * "aria-disabled":a,className:"aria-disabled:opacity-disabled",onClick:o,"aria-label":s,iconOnly:!0})`. */
export function SourceClearFinishedTasks({sessionId,store=dismissedTasksStore}){
 const finished=useSyncExternalStore(store.subscribe,()=>store.finished(sessionId));
 return <CdsButton variant="ghost" icon="Trash" aria-disabled={finished.length===0} className="aria-disabled:opacity-disabled"
  onClick={()=>store.clear(sessionId)} aria-label={t('Clear finished tasks')} iconOnly/>;
}
// W14-code r7 r7pa-07: cccc2cf0a AM — the command region (`${DM} p-px`), the output tail (kM: `${OM} whitespace-pre-wrap
// break-all`), else the summary or the no-output footnote, in the open row's `flex flex-col gap-1.25 select-text px-md
// pb-[16px]` column (QM `ke`). DM / OM are cccc2cf0a's own class strings.
const OUTPUT_BLOCK='rounded-lg text-code max-h-[200px] overflow-y-auto focus-visible:outline-hidden focus-visible:shadow-focus';
const OUTPUT_PRE=`${OUTPUT_BLOCK} bg-alpha-2 px-md py-1.25 text-primary whitespace-pre-wrap break-all`;
const NO_OUTPUT='text-footnote text-muted-as-secondary';
export function SourceTaskOutput({task,sessionId}) {
  const output=useRef(null), key=JSON.stringify([sessionId,task.id]), text=taskOutput(task.output || '');
  useLayoutEffect(()=>{taskOutputFollow.update(key,output.current);},[key,text]);
  const summary=task.summary&&task.summary!==task.description?task.summary:null;
  return <div className="flex flex-col gap-1.25 select-text px-md pb-[16px]">
    {task.command&&<div role="region" tabIndex={0} aria-label={t('Command for {task}',{task:task.description})} className={`${OUTPUT_BLOCK} p-px`}>
      <SourceCommandLine command={task.command} scopeKey={key}/>
    </div>}
    {task.output?<pre ref={output} role="region" tabIndex={0} aria-label={t('Output for {task}',{task:task.description})} className={OUTPUT_PRE}
      onScroll={e=>taskOutputFollow.record(key,e.currentTarget)}><SourceAnsiText text={text}/></pre>
      :summary?<div className="text-footnote text-secondary whitespace-pre-wrap break-words">{summary}</div>
      :<div className={NO_OUTPUT}>{task.status==='running'?t('No output yet'):task.status==='unknown'?t('Output unavailable'):t('No output captured.')}</div>}
  </div>;
}
// OC (cccc2cf0a :11432-11446): a running Monitor's countdown to its deadline, hidden in the last second.
function StopsIn({stopsAt}){const [now,setNow]=useState(Date.now);useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);const label=stopsInLabel(stopsAt,now,getLocale());return label?<span className="tabular-nums">{label}</span>:null;}
function Elapsed({task}){const [now,setNow]=useState(Date.now);useEffect(()=>{if(task.status!=='running'||!Number.isFinite(task.startedAt))return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[task.status,task.startedAt]);const ms=task.status==='running'&&Number.isFinite(task.startedAt)?Math.max(0,now-task.startedAt):task.durationMs;return Number.isFinite(ms)?<span className="tabular-nums">{formatDuration(ms/1000)}</span>:null;}
// The session folder's preview servers (preview-service.cjs state), pushed as they change.
// Both feeds are null until their first answer, so a remounted list keeps a pending stop until it knows the state.
function usePreviewServers(sessionId,desktop){const [servers,setServers]=useState(null);useEffect(()=>{if(!sessionId||!desktop?.call){setServers([]);return undefined;}setServers(null);let live=true;desktop.call('preview-state',{sessionId}).then(state=>{if(live)setServers(previewServerTasks(state));},()=>{if(live)setServers(old=>old??[]);});const off=desktop.onEvent?.(event=>{if(event?.kind==='preview'&&event.sessionId===sessionId&&event.state)setServers(previewServerTasks(event.state));});return()=>{live=false;off?.();};},[sessionId,desktop]);return servers;}
// The session's Monitor commands and scheduled prompts (electron/monitor-service.cjs, schedule-service.cjs), pushed as they change.
function useAppFeed(sessionId,desktop,action,kind,key){const [list,setList]=useState(null);useEffect(()=>{if(!sessionId||!desktop?.call){setList([]);return undefined;}setList(null);let live=true;desktop.call(action,{sessionId}).then(value=>{if(live)setList(Array.isArray(value)?value:[]);},()=>{if(live)setList(old=>old??[]);});const off=desktop.onEvent?.(event=>{if(event?.kind===kind&&event.sessionId===sessionId&&Array.isArray(event[key]))setList(event[key]);});return()=>{live=false;off?.();};},[sessionId,desktop,action,kind,key]);return list;}
// jM: the value of "Next <v>{countdown}</v>" / "Ends <v>{days}d</v>" in the secondary colour (loops and servers always run).
const loopValue=chunks=><span className="text-secondary">{chunks}</span>;
// W14-code r6 r6pa-06: cccc2cf0a eN — `u("span",{className:"tabular-nums",children:u(Z,{defaultMessage:"Next <v>{countdown}</v>",
// id:"APhUc9212r",values:{countdown:o,v:jM}})})`.
function Countdown({at}){const [now,setNow]=useState(Date.now);useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);return <span className="tabular-nums"><StartMessage defaultMessage="Next <v>{countdown}</v>" id="APhUc9212r" values={{countdown:formatDuration(Math.max(0,at-now)/1000),v:loopValue}}/></span>;}
// zM: a running preview server's uptime (tabular-nums), in the UI language (formatDuration is the transcript timer's wording).
function Uptime({startedAt}){const [now,setNow]=useState(Date.now);useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);return <span className="tabular-nums">{formatDuration(Math.max(0,now-startedAt)/1000)}</span>;}
// W14-code r6 r6pa-06: cccc2cf0a $M — the loop / preview server card shell (Vn("panels") is fizzy-lake off, so the
// "rounded-lg bg-alpha-1" / "p-md" branch): the title in the Shimmer (`ae` = shared-frame zF, active while it runs), the
// Stop button (Ho = UQ) in a `contents` span, then the footnote metadata column. A stop the caller accepted (returns
// true) parks focus on the card's label span, as $M d.
function TaskCardShell({ariaLabel,title,shine=true,stop,children}){
 const label=useRef(null);
 const onStop=()=>{if(stop?.onClick?.()!==true)return;const node=label.current;if(node?.parentElement?.contains(node.ownerDocument.activeElement))node.focus({preventScroll:true});};
 return <div className="flex flex-col rounded-lg bg-alpha-1"><div className="relative flex items-start gap-sm p-md">
  <span ref={label} tabIndex={-1} aria-label={ariaLabel} className="flex-1 min-w-0 flex flex-col gap-1.25 pb-0.75 select-text outline-none">
   <span className="flex items-start gap-sm"><CdsShimmer active={shine} className="flex-1 min-w-0 text-body text-primary break-words">{title}</CdsShimmer>
    {stop?<span className="contents"><TaskStopButton busy={stop.busy} onClick={onStop} ariaLabel={stop.ariaLabel}/></span>:null}</span>
   <span className="flex flex-col gap-1.25 text-footnote text-muted-as-secondary [overflow-wrap:anywhere]">{children}</span>
  </span>
 </div></div>;
}
const META_ROW='flex flex-wrap items-baseline gap-x-sm gap-y-0.75';
// 3.6556.2 cccc2cf0a tN: "Loop" / "Once", the cadence, then Next <v>{countdown}</v> and, for a loop, Ends <v>{days}d</v>;
// the stopping Stop button's aria-label is "Stop requested. Claude will cancel it." (/td9FaldiX; W14-code r5pa-03 (E83):
// the brand is the persona's name).
// W14-code r7 r7pa-06: tN `l = s && (t.humanSchedule === void 0 || t.humanSchedule === t.cron) ? t.nextRunAt : void 0`
// (nextFireAt here; schedule-service humanSchedule() returns a one-shot cron it can't phrase as the expression itself):
// a one-shot prompt with no phrase shows `wr(new Date(l), p, i, "future")` (shared-2 pA, "today at 3:05 PM" …), else
// the phrase or the cron; a bare cron under RTL is `dir: "ltr"`.
const rootIsRtl=()=>globalThis.document?.documentElement?.dir==='rtl';
function useMinuteNow(active){const [now,setNow]=useState(Date.now);useEffect(()=>{if(!active)return undefined;const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[active]);return now;}
export function loopScheduleAt(loop){return !loop.recurring&&(loop.humanSchedule==null||loop.humanSchedule===loop.cron)&&Number.isFinite(loop.nextFireAt)?loop.nextFireAt:undefined;}
export function LoopCard({loop,stopping,onStop}){const once=!loop.recurring,title=loop.prompt??(once?t('Scheduled prompt'):t('Recurring loop')),days=once?null:loopDaysLeft(loop);
 const intl=useStartIntl(),at=loopScheduleAt(loop),now=useMinuteNow(at!==undefined);
 const schedule=at===undefined?(loop.humanSchedule??loop.cron):relativeTime(new Date(at),now,intl,'future');
 const stop=onStop?{onClick:onStop,busy:stopping,ariaLabel:stopping?t('Stop requested. {assistant} will cancel it.',{assistant:assistantName()}):once?t('Stop this scheduled prompt'):t('Stop this loop')}:undefined;
 return <TaskCardShell ariaLabel={once?t('Once: {description}',{description:title}):t('Loop: {description}',{description:title})} title={title} stop={stop}>
  <span className={META_ROW}>
   <span className="text-secondary">{once?t('Once'):t('Loop')}</span>
   <span role="status" className="sr-only">{stopping?t('Stop requested…'):null}</span>
   {stopping?<span aria-hidden="true">{t('Stop requested…')}</span>:null}
   {schedule?<span dir={rootIsRtl()&&at===undefined&&loop.humanSchedule==null?'ltr':undefined}>{schedule}</span>:null}
  </span>
  <span className={META_ROW}>
   {Number.isFinite(loop.nextFireAt)&&<Countdown at={loop.nextFireAt}/>}
   {days!==null&&<span><StartMessage defaultMessage="Ends <v>{days}d</v>" id="BIrz9yA5y+" values={{days,v:loopValue}}/></span>}
  </span>
 </TaskCardShell>;}
// 3.6556.2 cccc2cf0a nN: "Preview" · Stopping…/Starting…/Failed · uptime, then localhost:port; no shimmer once it failed.
function PreviewServerCard({server,stopping,onStop}){const failed=server.status==='error';
 const stop=onStop?{onClick:onStop,busy:stopping,ariaLabel:stopping?t('Stopping server…'):t('Stop this server')}:undefined;
 return <TaskCardShell ariaLabel={t('Preview server: {name}',{name:server.name})} title={server.name} shine={!failed} stop={stop}>
  <span className={META_ROW}>
   <span className="text-secondary">{t('Preview')}</span>
   <span role="status" className="sr-only">{stopping?t('Stopping…'):null}</span>
   {stopping?<span aria-hidden="true">{t('Stopping…')}</span>:server.status==='starting'?<span>{t('Starting…')}</span>:failed?<span className="text-danger">{t('Failed')}</span>:null}
   {!failed&&Number.isFinite(server.startedAt)&&<span><Uptime startedAt={server.startedAt}/></span>}
  </span>
  {server.port?<span>{`localhost:${server.port}`}</span>:null}
 </TaskCardShell>;}
// W14-code r4 r4pa-01: cccc2cf0a EN `I = T || (j ?? (w || F))` — the person's stored choice (j, finishedExpandedBySession)
// wins; until then Finished is open by default when nothing is running (`openByDefault: g && be`, be = `E.length === 0 &&
// A.running.length === 0`: running tasks and workflows, not servers or loops) or when one of its expandable rows is open
// (F: TN `n.get(e.taskId) === !0`; here only Bash rows expand).
export function finishedSectionOpen(stored,sections,openRows){
 return stored??(sections.running.length===0||sections.finished.some(task=>task.kind==='bash'&&openRows.get(task.id)===true));
}
export function SourceBackgroundTasks({tasks:coreTasks,sessionId,onOpen,onStop,renderWorkflow,focusTask,onFocusDone,error,finishedExpanded,onFinishedExpanded,desktop=globalThis.desktop}){
 // Monitor commands are tasks of their own (Claude's monitor_mcp rows); scheduled prompts are Loop / Once rows.
 const monitorFeed=useAppFeed(sessionId,desktop,'monitor-state','monitors','monitors'),loopFeed=useAppFeed(sessionId,desktop,'schedule-state','schedules','jobs'),loops=scheduledLoops(loopFeed);
 const tasks=React.useMemo(()=>[...coreTasks,...monitorTasks(monitorFeed)],[coreTasks,monitorFeed]);
 const rowsStore=taskRowsStore,openRows=useSyncExternalStore(rowsStore.subscribe,()=>rowsStore.openRows(sessionId)),stopping=useSyncExternalStore(rowsStore.subscribe,()=>rowsStore.stopping(sessionId,'task'));
 const stoppingLoops=useSyncExternalStore(rowsStore.subscribe,()=>rowsStore.stopping(sessionId,'loop')),stoppingServers=useSyncExternalStore(rowsStore.subscribe,()=>rowsStore.stopping(sessionId,'server'));
 useEffect(()=>{if(loopFeed!==null)rowsStore.releaseStopping(sessionId,'loop',[...stoppingLoops].filter(id=>!loops.some(loop=>loop.id===id)));},[loopFeed,stoppingLoops,sessionId]);
 const stopLoop=loop=>{if(!desktop?.call||!rowsStore.markStopping(sessionId,'loop',loop.id))return;root.current?.focus();desktop.call('schedule-stop',{sessionId,id:loop.id}).catch(e=>{rowsStore.releaseStopping(sessionId,'loop',loop.id);if(alive.current)setNotice(localizeBridgeText(e?.message||''));});};
 const serverFeed=usePreviewServers(sessionId,desktop),servers=serverFeed??[];
 // 3.6556.2 cccc2cf0a pN me: a stopping preview server or loop that leaves its feed is announced in the sr-only status
 // (cleared after 5s): "Preview server stopped", "Loop stopped" / "Scheduled prompt stopped" (every gone loop is a
 // once, mN), or both joined; a loop that aged out (cea7057eb w; here its expiresAt passed) is not counted.
 const stopSeen=useRef(null);
 useEffect(()=>{
  const previous=stopSeen.current;
  const loopsById=loopFeed!==null?new Map(loops.map(loop=>[loop.id,loop])):(previous?.loopsById??new Map());
  const serverIds=serverFeed!==null?new Set(serverFeed.map(server=>server.id)):(previous?.serverIds??new Set());
  stopSeen.current={loopsById,serverIds};
  if(!previous)return;
  const goneServers=[...previous.serverIds].filter(id=>!serverIds.has(id)&&stoppingServers.has(id));
  const goneLoops=[...previous.loopsById.values()].filter(loop=>!loopsById.has(loop.id)&&stoppingLoops.has(loop.id));
  const now=Date.now(),liveLoops=goneLoops.filter(loop=>!(Number.isFinite(loop.expiresAt)&&now>loop.expiresAt));
  const server=goneServers.length>0,loop=liveLoops.length>0,once=liveLoops.every(entry=>!entry.recurring);
  if(!server&&!loop)return;
  setNotice(server&&loop?once?t('Preview server stopped. Scheduled prompt stopped'):t('Preview server stopped. Loop stopped')
   :server?t('Preview server stopped'):once?t('Scheduled prompt stopped'):t('Loop stopped'));
 },[loopFeed,serverFeed]);
 // A stop settles when the server leaves the list (stopped) or fails.
 useEffect(()=>{if(serverFeed!==null)rowsStore.releaseStopping(sessionId,'server',[...stoppingServers].filter(id=>!serverFeed.some(server=>server.id===id&&server.status!=='error')));},[serverFeed,stoppingServers,sessionId]);
 const stopServer=server=>{if(!desktop?.call||!rowsStore.markStopping(sessionId,'server',server.id))return;root.current?.focus();desktop.call('preview-server-stop',{sessionId,name:server.name}).catch(e=>{rowsStore.releaseStopping(sessionId,'server',server.id);if(alive.current)setNotice(localizeBridgeText(e?.message||''));});};
 const dismissedIds=useSyncExternalStore(dismissedTasksStore.subscribe,()=>dismissedTasksStore.dismissed(sessionId)),[notice,setNotice]=useState(''),root=useRef(null),alive=useRef(true),toasts=useSourceToasts();
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const runningIds=tasks.filter(t=>t.status==='running').map(t=>t.id),visible=tasks.filter(t=>t.status==='running'||!dismissedIds.includes(t.id)),sections=taskSections(visible);
 // iw: a dismissed task running again comes back.
 useEffect(()=>{dismissedTasksStore.restore(sessionId,runningIds);},[runningIds.join('\0'),sessionId,dismissedIds]);
 // The header's Clear button (SourceClearFinishedTasks) clears what this list shows as finished.
 const finishedIds=sections.finished.map(t=>t.id);
 useLayoutEffect(()=>{dismissedTasksStore.setFinished(sessionId,finishedIds);},[sessionId,finishedIds.join('\0')]);
 // A stop settles once its task is no longer running; a Monitor missing before the feed answers is still unknown.
 useEffect(()=>{if(tasks.some(t=>t.status==='stopped'&&stopping.has(t.id)))setNotice(t('Task stopped'));rowsStore.releaseStopping(sessionId,'task',[...stopping].filter(id=>{const task=tasks.find(t=>t.id===id);return task?task.status!=='running':monitorFeed!==null||!id.startsWith('monitor:');}));},[tasks,stopping,monitorFeed,sessionId]);
 useEffect(()=>{if(!focusTask)return;rowsStore.setRowsOpen(sessionId,[focusTask],true);if(sections.finished.some(t=>t.id===focusTask))onFinishedExpanded(true);const frame=requestAnimationFrame(()=>{const node=root.current?.querySelector(`[data-task-id="${CSS.escape(focusTask)}"]`);/* pN: wN's wrapper is display:contents, so the card itself scrolls (`t?.firstElementChild ?? t`). */(node?.firstElementChild??node)?.scrollIntoView({block:'start'});onFocusDone?.();});return()=>cancelAnimationFrame(frame);},[focusTask]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(timer);},[notice]);
 async function stop(task){if(!rowsStore.markStopping(sessionId,'task',task.id))return;root.current?.focus();setNotice(t('Stop requested…'));try{if(task.monitorId&&desktop?.call)await desktop.call('monitor-stop',{sessionId,id:task.monitorId});else await onStop(task);}catch(e){rowsStore.releaseStopping(sessionId,'task',task.id);console.warn('task stop failed',e);toasts?.add?.(t('Couldn’t stop the task — check your connection and try again.'),{variant:'danger'});}}
 const finishedOpen=finishedSectionOpen(finishedExpanded,sections,openRows);
 // EN H (onClickCapture): a click on a button or link inside the open Finished list keeps it open (`L(O, !0)`).
 const keepFinishedOpen=event=>{if(event.target?.closest?.('button, a'))onFinishedExpanded?.(true);};
 const row=task=>task.kind==='workflow'?<React.Fragment key={task.id}>{renderWorkflow(task)}</React.Fragment>:<TaskCard key={task.id} task={task} sessionId={sessionId} expanded={openRows.get(task.id)===true} stopping={stopping.has(task.id)} onStop={()=>stop(task)} onOpen={onOpen} onToggle={()=>rowsStore.setRowsOpen(sessionId,[task.id],openRows.get(task.id)!==true)}/>;
 // W14-code r7 r7pa-07: pN's root `Se` and column `Ce`, and EN's sections (Vn("panels") off): `section.flex.flex-col.gap-sm`,
 // the heading in `div.flex > h3.text-footnote.text-muted-as-secondary` (Finished's is the collapsible button with its
 // count and CdsIcon caret), the list `div.flex.flex-col.gap-1` (servers, loops, then the rows).
 const runningCount=sections.running.length+servers.length+loops.length,finishedCount=sections.finished.length;
 return <div ref={root} tabIndex={-1} className="h-full overflow-y-auto scroll-py-2.5 [scrollbar-gutter:stable_both-edges] outline-none"><span role="status" className="sr-only">{notice}</span>{error&&<p role="alert" className="px-2.5 pt-2.5 text-footnote text-danger">{error}</p>}{!visible.length&&!servers.length&&!loops.length?<EmptyState icon="AgentsSimple" title={t('Background tasks appear here')}/>:<div className="flex flex-col gap-[16px] px-2.5 py-2.5 min-w-[220px]">
  {runningCount>0&&<section className="flex flex-col gap-sm"><div className="flex"><h3 className="text-footnote text-muted-as-secondary">{t('Running')}</h3></div><div className="flex flex-col gap-1">{servers.map(server=><PreviewServerCard key={server.id} server={server} stopping={stoppingServers.has(server.id)} onStop={desktop?.call?()=>stopServer(server):undefined}/>)}{loops.map(loop=><LoopCard key={'loop:'+loop.id} loop={loop} stopping={stoppingLoops.has(loop.id)} onStop={desktop?.call?()=>stopLoop(loop):undefined}/>)}{sections.running.map(row)}</div></section>}
  {finishedCount>0&&<section className="flex flex-col gap-sm"><div className="flex"><h3 className="text-footnote text-muted-as-secondary"><button type="button" aria-expanded={finishedOpen} onClick={()=>onFinishedExpanded(!finishedOpen)}
   className="flex items-center gap-1 focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-[3px] hover:text-secondary"><span>{t('Finished')}</span><span>{finishedCount}</span>
   <CdsIcon name="CaretRight" size="xs" rotate={finishedOpen?90:0} className="transition-transform duration-fast motion-reduce:transition-none"/></button></h3></div>
   {finishedOpen&&<div className="flex flex-col gap-1" onClickCapture={keepFinishedOpen}>{sections.finished.map(row)}</div>}</section>}
 </div>}</div>;
}

// W14-code r5pa-06: cccc2cf0a QM — "<v>{n}</v> tokens" (q8yC2bH6mD, n = shared-8 cX, compactTokens here) and
// "{n, plural, one {<v>#</v> tool use} other {<v>#</v> tool uses}}" (D1S12O0SBS); v is the value span (jM / MM).
// r5pa-04: a task the agent can't stop just has no Stop button (no host hint line); r5pa-05: an unknown task sits in
// Running (cccc2cf0a has only Running IM and Finished LM) with no status word. QM `W = A ? jM : MM`: the value is
// text-secondary only while the task runs.
const runningValue=chunks=><span className="text-secondary">{chunks}</span>;
const settledValue=chunks=><>{chunks}</>;
const TASK_META_ROW='flex flex-wrap items-baseline gap-x-sm gap-y-0.75';
// W14-code r7 r7pa-07: QM's card variant (Vn("panels") off) in its own class strings — the shell `Ce` (rounded-lg
// bg-alpha-1, hover / focus-within bg-alpha-2 when expandable), the body `we` (relative flex flex-col gap-1.25 p-md), the
// title row (the expandable title is a text-start button whose ::after covers the card), the footnote column `Se` and
// the open output `ke`; wN's `div.contents[data-task-id]` around it. The host .sbt-* rules are gone.
export function TaskCard({task,sessionId,expanded,stopping,onStop,onOpen,onToggle}) {
 const running=task.status==='running',expandable=task.kind==='bash',value=running?runningValue:settledValue;
 const hasDetails=!!task.model||Number.isFinite(task.tokens)||Number.isFinite(task.toolUses)||(running&&!!task.lastTool)||task.kind==='agent';
 const title=<span className={`flex-1 min-w-0 flex items-start gap-0.75 text-body ${running?'text-primary':'text-muted-as-secondary'}`}>
  <CdsShimmer active={running} className="min-w-0 break-words">{task.description}</CdsShimmer>
  {expandable&&<span className="flex h-[1lh] shrink-0 items-center"><CdsIcon name="CaretRight" size="xs" rotate={expanded?90:0}
   className="text-muted-as-secondary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-transform duration-fast motion-reduce:transition-none"/></span>}
 </span>;
 const status=running?stopping?<span>{t('Stopping…')}</span>:null:task.status==='unknown'?null
  :<span className={task.status==='failed'?'text-danger':undefined}>{({completed:t('Completed'),failed:t('Failed'),stopped:t('Stopped')})[task.status]}</span>;
 return <div className="contents" data-task-id={task.id} data-status={task.status}>
  <div className={`group flex flex-col rounded-lg bg-alpha-1 ${expandable?'[&:hover:not(:has(.epitaxy-task-row-secondary:hover))]:bg-alpha-2 focus-within:bg-alpha-2':''}`}>
   <div className="relative flex flex-col gap-1.25 p-md">
    <div className="flex items-start gap-sm">
     {expandable?<button type="button" onClick={onToggle} data-task-opener="" aria-expanded={expanded} aria-label={t('Background task: {task}',{task:task.description})}
      className="flex-1 min-w-0 flex text-start focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus after:content-[''] after:absolute after:inset-0">{title}</button>
      :<div className="flex-1 min-w-0 flex">{title}</div>}
     {/* W14-code r6 r6pa-03: cccc2cf0a QM (card variant) `u(Ho,{busy:i,busyLabel:"Stopping…",onClick:U,ariaLabel:"Stop this task"})`. */}
     {running&&task.stoppable!==false&&(task.kind==='bash'||task.turnId)&&<span className="contents"><TaskStopButton busy={stopping} busyLabel={t('Stopping…')} onClick={onStop} ariaLabel={t('Stop this task')}/></span>}
    </div>
    <span className="flex flex-col gap-1.25 pb-0.75 text-footnote text-muted-as-secondary [overflow-wrap:anywhere]">
     <span className={TASK_META_ROW}>
      <span className={running?'text-secondary':undefined}>{taskKindLabel(task)}</span>
      {status}
      <Elapsed task={task}/>
      {running&&Number.isFinite(task.stopsAt)&&<StopsIn stopsAt={task.stopsAt}/>}
     </span>
     {hasDetails&&<span className={TASK_META_ROW}>
      {task.model&&<span>{value(task.model)}</span>}
      {Number.isFinite(task.tokens)&&<span><StartMessage defaultMessage="<v>{n}</v> tokens" id="q8yC2bH6mD" values={{n:compactTokens(task.tokens),v:value}}/></span>}
      {Number.isFinite(task.toolUses)&&<span><StartMessage defaultMessage="{n, plural, one {<v>#</v> tool use} other {<v>#</v> tool uses}}" id="D1S12O0SBS" values={{n:task.toolUses,v:value}}/></span>}
      {running&&task.lastTool&&<span>{task.lastTool}</span>}
      {task.kind==='agent'&&<button type="button" data-task-opener="" aria-label={t('View transcript for {task}',{task:task.description})} className={TASK_LINK_CLASS}
       onClick={event=>onOpen(task.sourceItem||{},task.threadId,event.currentTarget)}>{t('View transcript')}</button>}
     </span>}
    </span>
   </div>
   {expanded&&expandable&&<SourceTaskOutput task={task} sessionId={sessionId}/>}
  </div>
 </div>;
}
