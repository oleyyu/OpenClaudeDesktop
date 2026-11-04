import { t } from '../electron/i18n/index.mjs';
import {connectionInterrupted} from "./item-observation.mjs";
import {agentTargets,agentView} from './agent-model.mjs';
import {commandRowState} from './command-row-model.mjs';
import {commandText} from './shell-command-model.mjs';
/**
 * How soon the open session's background inventory (main.jsx background-read) is read again: every 2 s while anything
 * of it runs (its turn or a sub-agent's, a background command, a child agent), else every 10 s. Each read is two
 * reducer actions, each re-rendering the whole window: an idle session with a long transcript need not pay that every
 * 2 s. A turn starting or ending in the session reads again at once (the poll's effect keys on it).
 */
export const BACKGROUND_POLL_MS=2000,BACKGROUND_IDLE_POLL_MS=10000;
export function backgroundPollDelay(state,sessionId){
 const owner=(id)=>{const seen=new Set();while(id&&state?.threadParents?.[id]&&!seen.has(id)){seen.add(id);id=state.threadParents[id];}return id;};
 if(Object.entries(state?.active||{}).some(([id,turn])=>turn&&owner(id)===sessionId))return BACKGROUND_POLL_MS;
 if(Object.keys(state?.backgroundStarts?.[sessionId]||{}).length)return BACKGROUND_POLL_MS;
 try{if(backgroundTasks(state,sessionId).some(task=>task.status==='running'))return BACKGROUND_POLL_MS;}catch{return BACKGROUND_POLL_MS;}
 return BACKGROUND_IDLE_POLL_MS;
}
export function backgroundTasks(state,sessionId,{connected=true}={}) {
 const items=state.items?.[sessionId]||[],snapshot=state.background?.[sessionId]?.connectionId===state.approvalConnectionId?state.background?.[sessionId]:undefined,terminals=snapshot?.terminals||[],tasks=[];
 const spawns=items.filter(item=>item.type==='collabAgentToolCall'&&item.tool==='spawnAgent');
 const children=new Set([...spawns.flatMap(agentTargets),...(state.childThreads?.[sessionId]||[]).filter(id=>state.threads?.[id]?.source?.subAgent?.thread_spawn)]);
 for(const id of children){const item=spawns.find(item=>agentTargets(item).includes(id));const agent=agentView(state,item||{},id),facts=state.taskTurnFacts?.[id];tasks.push({id:'agent:'+id,kind:'agent',threadId:id,sourceItem:item,description:agent.name,status:!connected&&agent.status==='running'?'unknown':agent.status,
  // codeDesktop.stoppable false on the sub-agent's thread: the core can't stop that one alone (MiMo's actors share
  // their parent's session), so no Stop is offered.
  ...(state.threads?.[id]?.codeDesktop?.stoppable===false?{stoppable:false}:{}),
  turnId:state.active?.[id],model:agent.model,tokens:state.usage?.[id]?.total?.totalTokens,toolUses:Object.hasOwn(state.items||{},id)?agent.toolCallCount:null,lastTool:agent.latestToolVerb??agent.latestToolName,summary:agent.result,
  startedAt:Number.isFinite(facts?.startedAt)?facts.startedAt*1000:null,completedAt:Number.isFinite(facts?.completedAt)?facts.completedAt*1000:null,durationMs:facts?.durationMs});}
 const commands=new Map(items.filter(item=>item.type==='commandExecution'&&item.processId).map(item=>[item.id,item]));
 for(const terminal of [...Object.values(snapshot?.knownTerminals||{}),...terminals])if(!commands.has(terminal.itemId))commands.set(terminal.itemId,null);
 for(const [id,item] of commands){const terminal=terminals.find(t=>t.itemId===id&&(!item||t.processId===item.processId));const record=terminal||snapshot?.knownTerminals?.[id];const phase=item&&!item[connectionInterrupted]?commandRowState(item):null;
  const terminalStatus={done:'completed',failed:'failed',stopped:'stopped',denied:'failed'}[phase];
  const start=state.backgroundStarts?.[sessionId]?.[id];
  const newerStart=phase==='busy'&&start?.connectionId===state.approvalConnectionId&&start?.processId===item.processId&&snapshot?.coveredProcesses&&snapshot.coveredProcesses[id]!==item.processId;
  const status=terminalStatus||(!connected||snapshot?.error?'unknown':terminal||newerStart?'running':snapshot?'unknown':phase==='busy'?'running':'unknown');
  // codeDesktop.stoppable false: the core can't stop it (Kimi's background sub-agents), so no Stop is offered.
  const stoppable=record?.codeDesktop?.stoppable!==false;
  // codeDesktop.kind: what the core says the process is (a Monitor, a sub-agent…; Claude's taskType names work too).
  const taskType=typeof record?.codeDesktop?.kind==='string'?record.codeDesktop.kind:typeof item?.codeDesktop?.taskKind==='string'?item.codeDesktop.taskKind:null;
  tasks.push({id:'bash:'+id,kind:'bash',...(taskType?{taskType}:{}),threadId:sessionId,itemId:id,processId:item?.processId||record?.processId,description:commandText(item?.command||record?.command)||t('Command'),command:item?.command||record?.command,output:item?.aggregatedOutput||'',status,...(stoppable?{}:{stoppable:false}),
   startedAt:Number.isFinite(item?.startedAtMs)?item.startedAtMs:null,completedAt:Number.isFinite(item?.completedAtMs)?item.completedAtMs:null,durationMs:item?.durationMs});
 }
 return tasks;
}
export function taskSections(tasks){const order=new Map(tasks.map((task,index)=>[task,index]));return {running:tasks.filter(t=>t.status==='running').sort((a,b)=>(a.startedAt??Infinity)-(b.startedAt??Infinity)),unknown:tasks.filter(t=>t.status==='unknown'),finished:tasks.filter(t=>['completed','failed','stopped'].includes(t.status)).sort((a,b)=>(b.completedAt??-Infinity)-(a.completedAt??-Infinity)||order.get(b)-order.get(a))};}
// sC / lC (cccc2cf0a :11080-11129): past 8000 characters only the tail shows, cut at the first line break inside it
// so it never starts mid-line, under "(Earlier output not shown)".
export function earlierOutputCut(text){const newline=text.indexOf('\n');return newline>=0&&newline<text.length-1?text.slice(newline+1):text;}
export function taskOutput(text){return text.length>8000?`${t('(Earlier output not shown)')}\n${earlierOutputCut(text.slice(-8000))}`:text;}
export function dismissedTasks(map,sessionId,ids,running=[]){const entries=Object.entries(map||{}).filter(([id,value])=>id!==sessionId&&Array.isArray(value)).slice(-99);const restored=new Set(running);return {...Object.fromEntries(entries),[sessionId]:[...new Set([...(map?.[sessionId]||[]),...ids])].filter(id=>typeof id==='string'&&!restored.has(id)).slice(-1000)};}
export const DISMISSED_TASKS_KEY='codeDesktop.dismissedTasks';
const NONE=Object.freeze([]);
/** ES / wS / TS (cccc2cf0a :10501-10583): the per-session dismissed-task store shared by the pane header's
 * "Clear finished tasks" (rw) and the task list, persisted to `storage`. `finished` is the list's clearable ids,
 * published by the mounted list so the header can disable its button when nothing has finished. */
export function createDismissedTasksStore(storage){
 let map=(()=>{try{const value=JSON.parse(storage?.getItem(DISMISSED_TASKS_KEY));return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}})();
 const finished=new Map(),listeners=new Set();
 const emit=()=>{for(const listener of [...listeners])listener();};
 const save=next=>{map=next;try{storage?.setItem(DISMISSED_TASKS_KEY,JSON.stringify(map));}catch{}emit();};
 const same=(a,b)=>a.length===b.length&&a.every((id,index)=>id===b[index]);
 const store={
  subscribe(listener){listeners.add(listener);return()=>{listeners.delete(listener);};},
  dismissed(sessionId){return Array.isArray(map[sessionId])?map[sessionId]:NONE;},
  /** wS: nothing to dismiss is a no-op. */
  dismiss(sessionId,ids){const current=store.dismissed(sessionId),added=ids.filter(id=>typeof id==='string'&&!current.includes(id));if(!sessionId||!added.length)return false;save(dismissedTasks(map,sessionId,added));return true;},
  /** TS: ids running again come back. */
  restore(sessionId,ids){const current=store.dismissed(sessionId);if(!ids.some(id=>current.includes(id)))return false;save(dismissedTasks(map,sessionId,[],ids));return true;},
  finished(sessionId){return finished.get(sessionId)??NONE;},
  setFinished(sessionId,ids){const next=Array.isArray(ids)?ids.filter(id=>typeof id==='string'):[];if(same(store.finished(sessionId),next))return;if(next.length)finished.set(sessionId,next);else finished.delete(sessionId);emit();},
  clear(sessionId){const ids=store.finished(sessionId);if(!store.dismiss(sessionId,ids))return false;finished.delete(sessionId);emit();return true;},
 };
 return store;
}
/** QS (cccc2cf0a :11030-11059): a countdown in whole units, narrow — "45s", "4m 30s" under five minutes, "12m",
 * "2h 15m", "1d 3h". */
export function stopsInDuration(ms,locale){
 if(!(ms>0))return t('now');
 const seconds=Math.round(ms/1000);let parts;
 if(seconds<60)parts={seconds};
 else{const minutes=Math.floor(seconds/60);if(minutes<60){const rest=seconds%60;parts=rest>0&&minutes<5?{minutes,seconds:rest}:{minutes};}
  else{const hours=Math.floor(minutes/60);if(hours<24){const rest=minutes%60;parts=rest>0?{hours,minutes:rest}:{hours};}
   else{const days=Math.floor(hours/24),rest=hours%24;parts=rest>0?{days,hours:rest}:{days};}}}
 try{if(typeof Intl.DurationFormat==='function')return new Intl.DurationFormat(locale,{style:'narrow'}).format(parts);}catch{}
 const unit={days:'d',hours:'h',minutes:'m',seconds:'s'};return Object.entries(parts).map(([key,value])=>`${value}${unit[key]}`).join(' ');
}
/** OC: "Stops in {duration}" while at least a second remains, else nothing. */
export function stopsInLabel(stopsAt,now,locale){return Number.isFinite(stopsAt)&&stopsAt-now>=1000?t('Stops in {duration}',{duration:stopsInDuration(stopsAt-now,locale)}):null;}

// Sb / xb (panes-tile-current.js:14494-14520): the kind a task row names. Claude's taskType values map onto the
// seven labels; anything else is a plain "Task".
const TASK_TYPES={local_agent:'agent',in_process_teammate:'agent',remote_agent:'remote_agent',local_bash:'bash',local_workflow:'workflow',monitor_mcp:'monitor',monitor_ws:'monitor',dream:'dream'};
const TASK_KINDS=['agent','remote_agent','bash','workflow','monitor','dream','task'];
export function taskKind(task){const raw=task?.taskType??task?.kind;return TASK_KINDS.includes(raw)?raw:TASK_TYPES[raw]??'task';}
export function taskKindLabel(task){return ({agent:t('Agent'),remote_agent:t('Remote agent'),bash:t('Bash'),workflow:t('Workflow'),monitor:t('Monitor'),dream:t('Dream'),task:t('Task')})[taskKind(task)];}
/** qb (panes-tile-current.js:15192-15265): the session's preview servers that are up, starting or failed, for the
 * Running section. Stopped servers are not tasks. */
export function previewServerTasks(state){return (state?.servers??[]).filter(server=>['running','starting','stopping','failed'].includes(server?.status)).map(server=>({id:'preview:'+server.name,name:server.name,port:server.port??null,status:server.status==='failed'?'error':server.status,startedAt:Number.isFinite(server.startedAt)?server.startedAt:null}));}

// OpenClaude Desktop's own background sources (electron/monitor-service.cjs, schedule-service.cjs), pushed by main.
/** A session's Monitor commands as Background tasks rows: Claude's monitor_mcp tasks (kind "Monitor", expandable output, Stop). */
export function monitorTasks(list){return (Array.isArray(list)?list:[]).filter(entry=>entry&&typeof entry.id==='string').map(entry=>({id:'monitor:'+entry.id,monitorId:entry.id,kind:'bash',taskType:'monitor_mcp',description:entry.description||entry.command||t('Monitor'),command:entry.command,output:entry.output||'',
 status:['running','completed','failed','stopped'].includes(entry.status)?entry.status:'unknown',...(entry.status==='running'&&Number.isFinite(entry.stopsAt)?{stopsAt:entry.stopsAt}:{}),startedAt:Number.isFinite(entry.startedAt)?entry.startedAt:null,completedAt:Number.isFinite(entry.startedAt)&&Number.isFinite(entry.durationMs)?entry.startedAt+entry.durationMs:null,durationMs:Number.isFinite(entry.durationMs)?entry.durationMs:undefined}));}
/** Kb (panes-tile-current.js:15081-15190): a session's scheduled prompts as Loop / Once rows of the Running section. */
export function scheduledLoops(list){return (Array.isArray(list)?list:[]).filter(entry=>entry&&typeof entry.id==='string').map(entry=>({id:entry.id,prompt:typeof entry.prompt==='string'&&entry.prompt?entry.prompt:null,recurring:entry.recurring!==false,cron:entry.cron??null,humanSchedule:entry.humanSchedule??null,
 nextFireAt:Number.isFinite(entry.nextFireAt)?entry.nextFireAt:null,expiresAt:Number.isFinite(entry.expiresAt)?entry.expiresAt:null}));}
/** 'Ends {days}d': whole days left before a recurring loop expires, at least 1. */
export function loopDaysLeft(loop,now=Date.now()){return Number.isFinite(loop?.expiresAt)?Math.max(1,Math.round((loop.expiresAt-now)/864e5)):null;}
/** c03935b01 openTaskRowsBySession / stoppingIdsBySession (setTaskRowsOpen, markStopping, releaseStopping): the
 * task list's open rows and in-flight stops, kept per session in memory (not persisted), so closing and reopening
 * the pane or switching sessions keeps a bash/monitor row open and a pending Stop busy. Kinds: 'task' (a core task
 * or Monitor), 'loop' (a scheduled prompt) and 'server' (a preview server). */
export const NO_TASK_SESSION='__no-session__';
const NO_ROWS=new Map(),NO_IDS=Object.freeze(new Set());
export function createTaskRowsStore(){
 const open=new Map(),stopping=new Map(),listeners=new Set();
 const emit=()=>{for(const listener of [...listeners])listener();};
 const key=sessionId=>sessionId||NO_TASK_SESSION;
 const store={
  subscribe(listener){listeners.add(listener);return()=>{listeners.delete(listener);};},
  openRows(sessionId){return open.get(key(sessionId))??NO_ROWS;},
  isOpen(sessionId,id){return store.openRows(sessionId).get(id)===true;},
  setRowsOpen(sessionId,ids,value){const current=store.openRows(sessionId);if(ids.every(id=>current.get(id)===value))return;const next=new Map(current);for(const id of ids)next.set(id,value);open.set(key(sessionId),next);emit();},
  stopping(sessionId,kind){return stopping.get(key(sessionId))?.[kind]??NO_IDS;},
  markStopping(sessionId,kind,id){const current=stopping.get(key(sessionId))??{};if(current[kind]?.has(id))return false;stopping.set(key(sessionId),{...current,[kind]:new Set([...(current[kind]??[]),id])});emit();return true;},
  releaseStopping(sessionId,kind,ids){const current=stopping.get(key(sessionId));const list=(Array.isArray(ids)?ids:[ids]).filter(id=>current?.[kind]?.has(id));if(!list.length)return;const left=new Set(current[kind]);for(const id of list)left.delete(id);const next={...current,[kind]:left};if(!left.size)delete next[kind];if(Object.keys(next).length)stopping.set(key(sessionId),next);else stopping.delete(key(sessionId));emit();},
  /** A deleted session's rows. */
  forget(sessionId){const hadRows=open.delete(key(sessionId)),hadStops=stopping.delete(key(sessionId));if(hadRows||hadStops)emit();},
 };
 return store;
}
