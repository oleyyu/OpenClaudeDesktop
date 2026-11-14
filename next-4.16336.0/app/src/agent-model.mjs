// Independent adapter: scroll-messages-current:16884–16909/17118–17151;
// panes-tile-current:15894–16155. No synthetic child transcript entries.
import { describeVerb } from './description-verb-model.mjs';
import { genericToolLabel } from './generic-tool-model.mjs';
import { t } from '../electron/i18n/index.mjs';
import { compactTokens } from './context-usage-model.mjs';
import { formatDuration } from './command-row-model.mjs';
const TOOL_TYPES = new Set(['commandExecution','fileChange','mcpToolCall','dynamicToolCall','collabAgentToolCall','webSearch','imageView','imageGeneration','computerUse']);
const TERMINAL = new Set(['completed','failed','stopped']);
export function agentStatus(status) {
  if (['running','inProgress','active'].includes(status)) return 'running';
  if (['completed'].includes(status)) return 'completed';
  if (['errored','failed','systemError','notFound'].includes(status)) return 'failed';
  if (['interrupted','shutdown','stopped'].includes(status)) return 'stopped';
  return 'unknown';
}
// Local receipt time only controls Ex's 2500ms result wait; never presented
// as a server timestamp or persisted/sent back to Codex.
export function observeAgentEvent(previous = {}, event, active = {}, now = Date.now()) {
  const p = event.params || {}; let next = previous;
  const set = (id, status, extra = {}) => {
    if (!id || status === 'unknown') return;
    const old = next[id];
    if (old?.status === status && (!extra.turnId || old.turnId === extra.turnId) && (extra.message == null || extra.message === old.message)) return;
    if (next === previous) next = {...previous};
    next[id] = {...old,...extra,status,observedAt:now,completedObservedAt:status === 'completed' ? now : null};
  };
  if (event.method === 'turn/started') set(p.threadId,'running',{turnId:p.turn?.id});
  if (event.method === 'turn/completed' && (!active[p.threadId] || active[p.threadId] === p.turn?.id))
    set(p.threadId,agentStatus(p.turn?.error ? 'failed' : p.turn?.status),{turnId:p.turn?.id});
  if (event.method === 'thread/status/changed') {
    const type = typeof p.status === 'string' ? p.status : p.status?.type;
    if (type !== 'idle') set(p.threadId,agentStatus(type));
  }
  if (['item/started','item/completed'].includes(event.method)) {
    const item=p.item || {};
    if (item.type === 'collabAgentToolCall') for (const [id,info] of Object.entries(item.agentsStates || {})) {
      const status=agentStatus(info.status);
      // A late spawn acknowledgement cannot undo a child completion that
      // already arrived. Resume/turn-start are the evidence of a new run.
      if (item.tool === 'spawnAgent' && status === 'running' && TERMINAL.has(next[id]?.status)) continue;
      set(id,status,{...(info.message != null ? {message:info.message} : {})});
    }
    if (item.type === 'subAgentActivity') {
      const status={started:'running',completed:'completed',interrupted:'stopped'}[item.kind];
      if (status) set(item.agentThreadId,status);
    }
  }
  return next;
}
export const agentTargets = item => [...new Set([...(item?.receiverThreadIds || []), ...Object.keys(item?.agentsStates || {})])];
export function agentName(thread, item) {
  const name=[thread?.agentNickname,thread?.agentRole].filter(Boolean).join(' · ');
  // item.description: the DeepSeek core's delegation label, before the child thread is known.
  return name || (typeof item?.description==='string' && item.description.trim()) || item?.prompt?.split(/\r?\n/)[0]?.slice(0,80) || t('Agent');
}
function toolName(item) {
  if (item.type === 'commandExecution') {
    const action=item.commandActions?.length===1 && item.commandActions[0];
    return ({read:'Read',search:'Grep',listFiles:t('List files')})[action?.type] || t('Run command');
  }
  return ({fileChange:'Edit',webSearch:t('Web search'),collabAgentToolCall:t('Agent'),imageView:t('View image'),imageGeneration:t('Image generation')})[item.type] || [item.server,item.tool || item.name].filter(Boolean).join(' · ') || t('Tool');
}
// jC (cccc2cf0a :11451-11454): a running agent's last tool as the running verb the transcript row would read
// (c52b02f3f Pf with no input: Read → 'Reading', Grep/Glob → 'Searching', LS → 'Listing', Bash → 'Running a command',
// Edit → 'Editing', WebSearch → 'Searching web', Agent → 'Running agent', any other tool → 'Using {label}').
export function toolRunningVerb(item) {
  if (!item) return null;
  if (item.type === 'commandExecution') {
    const action=item.commandActions?.length===1 && item.commandActions[0];
    return ({read:t('Reading'),search:t('Searching'),listFiles:t('Listing')})[action?.type] || t('Running a command');
  }
  if (item.type === 'fileChange') {
    const kinds=new Set((item.changes || []).map(change=>typeof change?.kind==='string' ? change.kind : change?.kind?.type));
    return kinds.size===1 && kinds.has('add') ? t('Creating') : kinds.size===1 && kinds.has('delete') ? t('Deleting') : t('Editing');
  }
  if (item.type === 'collabAgentToolCall') return t('Running agent');
  if (item.type === 'imageView') return t('Reading');
  if (item.type === 'imageGeneration') return t('Generating image');
  if (item.type === 'computerUse') return t('Using the computer');
  if (['webSearch','mcpToolCall','dynamicToolCall'].includes(item.type)) return genericToolLabel(item,'busy').label;
  return null;
}
export function agentView(state, item, id = agentTargets(item)[0]) {
  const thread=state.threads?.[id], items=state.items?.[id] || [];
  // Read the latest genuine parent operation's status, not just spawn's ack.
  const parentItems=state.items?.[item.senderThreadId || thread?.parentThreadId] || [];
  const latest=[...parentItems].reverse().find(entry=>entry.type==='collabAgentToolCall' && entry.agentsStates?.[id]);
  const observed=state.agentLifecycle?.[id];
  const status=state.active?.[id] ? 'running' : observed?.status || agentStatus(latest?.agentsStates[id]?.status || item.agentsStates?.[id]?.status || (thread?.status?.type==='active'?'running':null) || (item.status==='inProgress' ? 'running' : item.status==='failed' ? 'failed' : null));
  const tools=items.filter(entry=>TOOL_TYPES.has(entry.type));
  const lastText=[...items].reverse().find(entry=>entry.type==='agentMessage' && entry.text?.trim())?.text;
  const result=lastText || observed?.message || latest?.agentsStates[id]?.message || item.agentsStates?.[id]?.message || null;
  return {id,name:agentName(thread,item),model:thread?.model || item.model || null,status,items,prompt:item.prompt || null,
    toolCallCount:tools.length,latestToolName:tools.length ? toolName(tools.at(-1)) : null,latestToolVerb:tools.length ? toolRunningVerb(tools.at(-1)) : null,result,
    completedObservedAt:observed?.completedObservedAt || null};
}
// zw / _p (cccc2cf0a :13175-13190, c5da7eb42 :2270-2276): a completed sub-agent's transcript ends with a muted
// stats line once its tool calls (loaded child items), tokens (its usage) and duration (its turn facts) are all known.
export function agentConclusionStats(state, agent) {
  if (agent?.status !== 'completed' || !agent.id || !Object.hasOwn(state?.items || {}, agent.id)) return null;
  const tokens=state.usage?.[agent.id]?.total?.totalTokens, durationMs=state.taskTurnFacts?.[agent.id]?.durationMs;
  return Number.isFinite(tokens) && Number.isFinite(durationMs) ? { toolUses:agent.toolCallCount, tokens, durationMs } : null;
}
// W14-code pa2-08: 3.6556.2 cccc2cf0a FP — one ICU message (dAbHM3tAVv) with `toolUses: r, tokenForm: t.tokens === 1 ?
// "one" : "other", tokens: Na(t.tokens), duration: gs(n, t.durationMs)`; source-agent.jsx formats it (StartMessage).
export const AGENT_CONCLUSION_MESSAGE = Object.freeze({ id: 'dAbHM3tAVv',
  defaultMessage: '{toolUses, plural, one {# tool call} other {# tool calls}} \u00B7 {tokenForm, select, one {1 token} other {{tokens} tokens}} \u00B7 {duration}' });
export function agentConclusionValues(stats) {
  if (!stats) return null;
  return { toolUses: stats.toolUses, tokenForm: stats.tokens === 1 ? 'one' : 'other', tokens: compactTokens(stats.tokens), duration: formatDuration(Math.round(stats.durationMs/1000)) };
}
export function agentPromptNeeded(items, prompt) {
  if (!prompt || items[0]?.type === 'userMessage') return false;
  return !items.some(item=>item.type==='userMessage' && (item.content || []).filter(part=>part.type==='text').map(part=>part.text).join('\n').trim()===prompt.trim());
}
export function agentOperationLabel(item) {
  const words={sendInput:['Sending input to agent','Sent input to agent'],resumeAgent:['Resuming agent','Resumed agent'],wait:['Waiting for agent','Waited for agent'],closeAgent:['Closing agent','Closed agent'],sendMessage:['Sending message to agent','Sent message to agent'],followupTask:['Sending follow-up to agent','Sent follow-up to agent'],interruptAgent:['Stopping agent','Stopped agent'],listAgents:['Listing agents','Listed agents']};
  return t((words[item.tool] || ['Using agent tool','Used agent tool'])[item.status==='inProgress'?0:1]);
}
// Task/Agent row label (approval-current.js:4271-4296 oO, :16921-16934 Ie, :17112-17126):
// a description that opens with a verb is the label in the row's tense ("Saying hello"
// while running, "Said hello" once done, "Failed to say hello"); one without a verb is
// itself the running/done label. Ie applies only while running, failed (with tenses) or
// done (completion confirmed), so a stopped, denied, awaiting or unknown agent — or one
// with no description — reads verb + name ('Running agent'/'Ran agent'/'Failed to run
// agent'). The name (the source meta: the description, else the thread's agent name) is
// null whenever the description label replaces it (`S.meta && !Ie`).
// status: agentStatus values plus 'denied'/'awaiting' for an unstarted spawn.
export function agentRowLabel(item, name, status) {
  const description = typeof item?.description === 'string' && item.description.trim() ? item.description.trim() : null;
  const tenses = description ? describeVerb(description) : null, meta = description ?? name ?? null;
  if (status === 'running') return description ? { label: tenses?.running ?? description, name: null, described: true } : { label: t('Running agent'), name: meta, described: false };
  if (status === 'failed') return tenses ? { label: `Failed to ${tenses.infinitive}`, name: null, described: true } : { label: t('Failed to run agent'), name: meta, described: false };
  if (status === 'completed' && description) return { label: tenses?.done ?? description, name: null, described: true };
  return { label: t('Ran agent'), name: meta, described: false };
}

// W14-code r5 cleanup (r5-panes handoff): subAgentMessageError left with the host sub-agent follow-up box (r5pa-07, E95).
