import {isGenericTool,observedGenericTool,genericToolLabel} from './generic-tool-model.mjs';
import { agentView } from "./agent-model.mjs";
import React, { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from './icons.jsx';
import { coalesceFileRuns, fileAction, fileGroupPresentation, fileRunCounts, fileRunState, fileToolSummary } from './file-tool-model.mjs';
import { commandRowLabel } from './command-row-model.mjs';
import './source-tool-group.css';
import { t } from '../electron/i18n/index.mjs';
import {SourceMorphText} from './source-morph-text.jsx';
import { groupExpansionKey, toolGroupExpansion } from './tool-group-expansion.mjs';
import { computerUseAction, computerUseLabel } from './computer-use-model.mjs';
import { imageGenerationState, mediaItemRow } from './media-item-model.mjs';
import { useTurnStatusRows } from './source-transcript-rows.jsx';
import { SourceToolRun } from './source-transcript-tool-rows.jsx';
import { useToolRunHost } from './source-session.jsx';

// WM :16293–16325 / Npe :53663. A key remains for at least 650ms after
// switching; repeated deltas don't restart the timer. Unmount cancels it.
// 2.42304.0 v2e `He = uM(Ve, 650, ye ? cv : void 0)`: with turnStatusRows the rest options cv = {restKey: "settled",
// fallHoldMs: 650} apply: leaving "settled" for a running tool is immediate, and settling waits 650 ms from when the
// group asked to settle as well as from when the shown key appeared.
function useHeldKey(key, rest = false) {
  const [shown, setShown] = useState({ key, at: 0 });
  const restSince = useRef(null);
  if (!rest || key !== 'settled') restSince.current = null;
  else if (restSince.current === null) restSince.current = performance.now();
  useEffect(() => {
    if (shown.key === key) return;
    if (rest && shown.key === 'settled') { setShown({ key, at: performance.now() }); return; }
    const now = performance.now();
    const remaining = Math.max(0, 650 - (now - shown.at), rest && key === 'settled' ? 650 - (now - (restSince.current ?? now)) : 0);
    const update = () => setShown({ key, at: performance.now() });
    if (!remaining) { update(); return; }
    const timer = setTimeout(update, remaining);
    return () => clearTimeout(timer);
  }, [key, shown]);
  return shown.key;
}

// Npe classic branch, approval-current:53880–54010; Gv c425fb3cf:154.
export function SourceToolGroup(props) {
  const fallback=useId();
  const identity=groupExpansionKey(props.sessionKey||fallback,props.item.toolGroup[0]?.id||props.item.id);
  // Parent renderers can reuse the same item id across sessions. Their held
  // labels and outgoing animation snapshots must not cross that boundary.
  return <ToolGroupBody key={identity} {...props} expansionKey={identity}/>;
}
function ToolGroupBody({ item, renderItem, pendingApprovalItemIds, transcriptView, agentContext, expansionKey, isStreaming = false, agentNested = false, liveTail = false, ...pathProps }) {
  const id = useId(), tools = item.toolGroup;
  const statusRows = useTurnStatusRows();
  const host = useToolRunHost({ agentContext, sessionKey: pathProps.sessionKey, cwd: pathProps.cwd, onOpenFileRef: pathProps.onOpenFileRef,
    onOpenChanges: pathProps.onOpenChanges, transcriptView, pendingApprovalItemIds, isStreaming, agentNested, liveTail });
  const remembered=useSyncExternalStore(toolGroupExpansion.subscribe,()=>toolGroupExpansion.get(expansionKey),()=>toolGroupExpansion.get(expansionKey));
  const forcedOpen=transcriptView==='verbose',open=forcedOpen||(remembered??false);
  const [mountedKey,setMountedKey]=useState(open?expansionKey:null);
  useEffect(()=>{if(open)setMountedKey(expansionKey);},[open,expansionKey]);
  const mounted=open||mountedKey===expansionKey;
  const presented = tools.map(original => {
    const tool=observedGenericTool(original,agentContext?.state,pathProps.sessionKey);
    if (!agentContext || tool.type !== 'collabAgentToolCall' || tool.tool !== 'spawnAgent') return tool;
    const view = agentView(agentContext.state, tool);
    return {...tool, status:({running:'inProgress',completed:'completed',failed:'failed',stopped:'interrupted'})[view.status] || tool.status};
  });
  const state = fileRunState(presented, pendingApprovalItemIds), counts = fileRunCounts(tools);
  const summary = fileGroupPresentation(presented);
  const running = presented.find(member => ['running', 'inProgress'].includes(member.status) || (member.type === 'imageGeneration' && imageGenerationState(member) === 'busy'));
  const key = state === 'busy' && running ? running.id : 'settled', heldKey = useHeldKey(key, statusRows);
  const [mountedLive] = useState(state === 'busy');
  // Npe:53663–53730 freezes only the aggregate while a key is held. The
  // held tool itself is re-read from the current collection on every delta.
  const snapshot = useRef({summary,counts,isAwaiting:state==='blocked'});
  if(heldKey===key)snapshot.current={summary,counts,isAwaiting:state==='blocked'};
  const {summary:shownSummary,counts:shownCounts,isAwaiting}=snapshot.current;
  const held=heldKey==='settled'?null:presented.find(member=>member.id===heldKey);
  const live = !held ? null : (fileAction(held)||held.type==='fileChange') ? fileToolSummary([held],'busy')
    : held.type==='commandExecution' ? commandRowLabel(held.command,'busy',held.description)
    : computerUseAction(held) ? computerUseLabel(computerUseAction(held),'busy')
    : isGenericTool(held) ? genericToolLabel(held,'busy')
    : held.type==='collabAgentToolCall'&&agentContext ? {label:t('Running agent'),meta:agentView(agentContext.state,held).name}
    : held.type==='imageGeneration' ? {label:mediaItemRow(held).label} : null;
  const toggle = () => { if(!forcedOpen)toolGroupExpansion.set(expansionKey,!open); };
  // turnStatusRows (GrowthBook __gb__2846116625, on): the group is the 2.42304.0 tool group n0 (c96d752d0 v2e) over the
  // members' SDK tool calls (source-transcript-tool-rows.jsx): its own coalescing, summary, held running label, XAe and
  // member rows. The host keeps the group's outer marker (data-tool-group, data-group-state).
  if (statusRows)
    return <SourceToolRun items={presented} host={host} groupKey={item.toolGroup[0]?.id || item.id}
      rest={{ 'data-tool-group': item.id, 'data-group-state': state, 'data-transcript-item-id': item.id }} />;
  return <div className="source-message stg" data-tool-group={item.id} data-group-state={state} data-summary-state={live?'busy':isAwaiting?'blocked':'settled'}>
    <button type="button" className="stg-trigger" aria-expanded={open} aria-controls={id} aria-label={!live && shownSummary.segments.some(segment=>segment.isError) ? [shownSummary.label,(shownCounts.added||shownCounts.removed)?`+${shownCounts.added} -${shownCounts.removed}`:null,isAwaiting?t('Needs approval'):state==='unknown'?t('Status unavailable'):null].filter(Boolean).join(' ') : undefined} onClick={toggle}>
      <SourceMorphText morphKey={live?heldKey:'settled'} live={mountedLive} className="stg-label" slotClassName="stg-morph">
      <span className={live ? 'source-shimmer stg-summary' : 'stg-summary'}>{live ? [live.label, live.meta].filter(Boolean).join(' ') : shownSummary.segments.map((segment,index)=><React.Fragment key={index}>{index>0?t(', '):null}<span data-summary-error={segment.isError||undefined}>{segment.verb}</span>{segment.meta?' '+segment.meta:null}</React.Fragment>)}</span>
      {!live && (shownCounts.added || shownCounts.removed) ? <span className="stg-counts"><span className="stg-add">+{shownCounts.added}</span><span className="stg-remove">-{shownCounts.removed}</span></span> : null}
      {isAwaiting && !live && <span className="stg-warning">{t("Needs approval")}</span>}
      {state === 'unknown' && !live && <span>{t("Status unavailable")}</span>}
      </SourceMorphText>
      {state === 'busy' && <span className="source-sr-only">{t("running")}</span>}
      <Icon name="CaretRight" size={14} style={{fontSize:"calc(.875rem * var(--cds-rem-scale, 1))"}} className="stg-caret" />
    </button>
    {mounted && <div id={id} hidden={!open} className="stg-body"><div className="stg-list">
      {coalesceFileRuns(tools).map(member => <div key={member.id} className="stg-row">{renderItem(member)}</div>)}
    </div></div>}
  </div>;
}
