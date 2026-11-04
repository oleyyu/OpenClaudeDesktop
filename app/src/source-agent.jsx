import React, {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Icon} from './icons.jsx';
import {SourceSpark} from './source-spark.jsx';
import {agentTargets,agentView,agentOperationLabel,agentPromptNeeded,agentRowLabel,agentConclusionStats,agentConclusionValues,AGENT_CONCLUSION_MESSAGE} from './agent-model.mjs';
import {StartMessage} from './source-code-start-adapters.jsx';
import {commandRowState} from './command-row-model.mjs';
import {groupFileTools} from './file-tool-model.mjs';
import {useMcpAppRowGrouping} from './source-mcp-app.jsx';
import {reasoningPlacement} from './reasoning-model.mjs';
import './source-agent.css';
import {t} from '../electron/i18n/index.mjs';
import {createStickToBottom} from './task-output-follow.mjs';
import {SourceClearFinishedTasks} from './source-background-tasks.jsx';
import {attachTabFocusRelease} from './generated/code-current/tab-focus-release.mjs';
import {f as EmptyState} from './generated/code-routines/cc0a875c8-Ba9KI-Fw.mjs';
import {CdsButton} from './generated/view-tabs/shared-frame-6jtSkIit.js';
import {classifyKeyScroll,keyScrollIntentMs} from './generated/code-current/tab-focus-key-scroll.mjs';
import { PaneWindowDragStrip, usePaneWindowHeaderProps } from "./pane-window-header.jsx";

/** The sub-agent view's key intent (R3-topbar TT-05; TT-05 / tasks-01). cccc2cf0a mO hands the follow hook c7f8992b4
 * C itself (`es({classifyKeyScroll:$o})`), and T reads every keydown on the scroller's document in the capture phase
 * (`p.addEventListener("keydown",_,{capture:!0})`): while pinned, a classified "up" (ArrowUp, PageUp, Home and
 * Shift+Space from the scroller or the body outside an editable, ArrowUp/Home with a modifier, Shift+Tab from
 * anywhere) only records the intent; the upward scroll that follows within `re` lets go (createStickToBottom
 * intent()). No key releases at keydown: a Shift+Tab that moved focus above the viewport is attachTabFocusRelease's
 * (c9f414608 i), and a key that scrolls nothing keeps following. Returns the detach. */
export function attachSubagentKeyIntent(scroller,follow){
  const doc=scroller?.ownerDocument;
  if(!doc)return()=>{};
  const keydown=event=>{if(follow.pinned&&classifyKeyScroll(event,scroller)==='up')follow.intent();};
  doc.addEventListener('keydown',keydown,{capture:true});
  return()=>doc.removeEventListener('keydown',keydown,{capture:true});
}
// Ow (cccc2cf0a :12810-12840): a running sub-agent opened with entries jumps to the bottom once and follows new
// output (qa stick-to-bottom, c7f8992b4) until the reader scrolls up.
function useSubagentFollow(start) {
  const scroller=useRef(null),content=useRef(null),follow=useRef(null),started=useRef(false);
  follow.current??=createStickToBottom({intentMs:keyScrollIntentMs});
  useLayoutEffect(()=>{if(start&&!started.current){started.current=true;follow.current.snap(scroller.current);}},[start]);
  useLayoutEffect(()=>{follow.current.follow(scroller.current);});
  useEffect(()=>{
    if(!scroller.current)return;
    const detachKeys=attachSubagentKeyIntent(scroller.current,follow.current);
    const detachTab=attachTabFocusRelease(scroller.current,{isPinned:()=>follow.current.pinned,setPinned:value=>{if(!value)follow.current.release();}});
    return()=>{detachKeys();detachTab();};
  },[]);
  useEffect(()=>{
    const element=content.current,View=element?.ownerDocument?.defaultView?.ResizeObserver;
    if(!element||typeof View!=='function')return undefined;
    const observer=new View(()=>follow.current.follow(scroller.current));observer.observe(element);
    return()=>observer.disconnect();
  },[]);
  return {scroller,content,handlers:{
    onScroll:event=>{if(event.target===event.currentTarget)follow.current.scrolled(event.currentTarget);},
    onWheel:event=>{if(!event.ctrlKey&&event.deltaY<0&&Math.abs(event.deltaY)>Math.abs(event.deltaX))follow.current.release();},
  }};
}

export function SourceAgentTool({item,context,inGroup,Step,defaultOpen,forcedOpen,sessionKey,pendingApprovalItemIds}) {
  const targets=agentTargets(item);
  if (item.tool !== 'spawnAgent' || !targets.length || !context) {
    const names=targets.map(id=>context ? agentView(context.state,item,id).name : id).join(', ');
    // K (approval-current.js:16848): a spawn waiting on its Ask-mode card is 'blocked'.
    const state=commandRowState(item,!!pendingApprovalItemIds?.has(item.id));
    // An unstarted spawn (awaiting approval, denied, failed to start) takes the same
    // tensed description label as the agent row below.
    const spawn=item.tool==='spawnAgent' && agentRowLabel(item,names||null,{busy:'running',blocked:'awaiting',done:'completed'}[state] ?? state);
    return <Step item={item} classic caretSize={14} defaultOpen={defaultOpen} forcedOpen={forcedOpen} sessionKey={sessionKey} state={state}
      label={spawn ? spawn.label : agentOperationLabel(item)} meta={(spawn ? spawn.name : names) || undefined}>
      <div role="group" aria-label={t("Tool call details")} className="source-tool-output">
        {item.prompt && <p>{item.prompt}</p>}
        {targets.map(id=><div key={id}>{context && <button className="sag-link" onClick={event=>context.onOpen(item,id,event.currentTarget)}>{agentView(context.state,item,id).name}</button>}
          {item.agentsStates?.[id]?.message && <pre>{item.agentsStates[id].message}</pre>}</div>)}
      </div>
    </Step>;
  }
  return targets.map(id=>{
    const agent=agentView(context.state,item,id),running=agent.status==='running';
    const card=running && !agent.toolCallCount && !inGroup, row=agentRowLabel(item,agent.name,agent.status);
    const open=event=>context.onOpen(item,id,event.currentTarget);
    return <div key={id} className={`source-message sag ${card?'sag-card-wrap':''}`} data-transcript-item-id={item.id} data-agent-thread-id={id} data-agent-state={agent.status}>
      <div role="button" tabIndex={0} data-transcript-keeps-pin="" className={`sag-trigger ${card?'sag-card':''}`} onClick={open}
        onKeyDown={event=>{if(event.target===event.currentTarget && ['Enter',' '].includes(event.key)){event.preventDefault();open(event);}}}>
        {card ? <><span className="sag-surface"/><Icon name="AgentsSimple" size={16}/><span className="sag-description source-shimmer">{agent.name}</span></> : <>
          {/* :17112-17126: label = Ie ?? verb (Ie truncates in a min-w-0 slot); the meta
              only when !Ie. :17127-17131 he: the model whenever known, muted once settled. */}
          <span className={`sag-verb ${running?'source-shimmer':''}`} data-described={row.described ? "" : undefined}>{row.label}</span>
          {row.name && <span className="sag-name" title={row.name}>{row.name}</span>}
          {agent.model && <span className="sag-model">{agent.model}</span>}
          {/* 3.6556.2 c96d752d0 BOe: the latest tool truncates ("text-body text-secondary truncate min-w-0") and its count
              keeps its place ("text-body text-secondary shrink-0", " · N"). */}
          {running && agent.toolCallCount>0 && <><span className="sag-activity">{agent.model?'· ':''}{agent.latestToolName}</span><span className="sag-activity-count">{' '}· {agent.toolCallCount}</span></>}
          {agent.status==='stopped' && <span className="sag-outcome">{t("Stopped")}</span>}
        </>}
        {running && <span className="sr-only">{t("running")}</span>}
        <Icon name="CaretRight" size={16} className="sag-caret"/>
      </div>
    </div>;
  });
}

// cccc2cf0a CP: "No activity yet" (aojEGT2eHI).
const NO_ACTIVITY_MESSAGE={defaultMessage:"No activity yet",id:"aojEGT2eHI"};
// cccc2cf0a yP: the model name in bP's sentence.
const modelValue=(chunks)=><span className="text-secondary">{chunks}</span>;
// W14-code r2 gates-r2-06: renderRows(rows, agentId) — the sub-agent's rows drawn as one transcript by the caller (the
// Code transcript renderer: cccc2cf0a draws each entry with PP, `{entry, sessionRef, isStreaming: !1, isOwnedSession: !1,
// font, smartQuotes: ws (__gb__2215170874)}`); without it every row is renderItem's.
function AgentTranscript({agent,item,ownerId=null,renderItem,renderRows=null,loading,error,transcriptView,stats}) {
  const [now,setNow]=useState(Date.now());
  const until=agent.status==='completed' && !agent.items.length && !agent.result && agent.completedObservedAt ? agent.completedObservedAt+2500 : 0;
  useEffect(()=>{setNow(Date.now());if(until>Date.now()){const timer=setTimeout(()=>setNow(Date.now()),until-Date.now());return()=>clearTimeout(timer);}},[until]);
  const running=agent.status==='running' || until>now;
  const visible=agent.items.filter(entry=>entry.type!=='subAgentActivity');
  // R4i-mcp MC1: an MCP App call is its own row here too (c96d752d0 KBe mcp_app, UV stands-alone), classified and
  // drawn under the session that owns the subagent (a child thread is no session of mcp-apps-host's).
  const groupRows=useMcpAppRowGrouping(agent.id,ownerId);
  const resultNeeded=agent.result && !visible.some(entry=>entry.type==='agentMessage' && entry.text===agent.result);
  const {scroller,content,handlers}=useSubagentFollow(agent.status==='running' && visible.length>0);
  return <div ref={scroller} className="sag-transcript" data-child-thread={agent.id} aria-busy={loading || undefined} {...handlers}><div ref={content} className="sag-entries">
    {/* W14-code pa2-08: cccc2cf0a bP — p.text-footnote.text-muted-as-secondary, "Model <v>{model}</v>" (Rd/NrmZbJ4), v = yP. */}
    {agent.model && <p className="text-footnote text-muted-as-secondary"><StartMessage defaultMessage="Model <v>{model}</v>" id="Rd/NrmZbJ4" values={{model:agent.model,v:modelValue}}/></p>}
    {renderRows ? renderRows([...(agentPromptNeeded(visible,agent.prompt) ? [{id:`${item.id}-prompt`,type:'userMessage',content:[{type:'text',text:agent.prompt}]}] : []),
      ...visible, ...(resultNeeded ? [{id:`${item.id}-result`,type:'agentMessage',text:agent.result}] : [])],agent.id) : <>
    {agentPromptNeeded(visible,agent.prompt) && renderItem({id:`${item.id}-prompt`,type:'userMessage',content:[{type:'text',text:agent.prompt}]},agent.id)}
    {groupRows(groupFileTools,visible,transcriptView).map((entry,index,rows)=><React.Fragment key={entry.id}>{renderItem(entry,agent.id,entry.type==='reasoning'?reasoningPlacement(rows,index,transcriptView):undefined)}</React.Fragment>)}
    {resultNeeded && renderItem({id:`${item.id}-result`,type:'agentMessage',text:agent.result},agent.id)}
    </>}
    {/* cccc2cf0a FP: p.text-footnote.text-muted-as-secondary.tabular-nums with the single ICU message dAbHM3tAVv. */}
    {stats && !running && !loading && <p className="text-footnote text-muted-as-secondary tabular-nums" data-subagent-stats=""><StartMessage {...AGENT_CONCLUSION_MESSAGE} values={agentConclusionValues(stats)}/></p>}
    {error && <p role="alert" className="source-tool-error">{error}</p>}
    {/* W14-code r3 r3pa-01: cccc2cf0a SP — div[role=status] "flex items-center min-h-5" with the thinking spark (ce, 18) and
        its sr-only "Thinking…" (P1QHV0AhYD); a settled sub-agent with nothing to show is xP — p "text-body
        text-muted-as-secondary select-text", the one select ICU lEAPaAhXw3 — or, one never seen (no task), CP under the
        prompt: p "text-body text-muted-as-secondary" "No activity yet" (aojEGT2eHI). */}
    {running || loading ? <div role="status" className="flex items-center min-h-5"><SourceSpark size={18} state="thinking"/><span className="sr-only"><StartMessage defaultMessage="Thinking…" id="P1QHV0AhYD"/></span></div>
      : !visible.length && !agent.result && (agent.status==='unknown'
        ? <p className="text-body text-muted-as-secondary"><StartMessage {...NO_ACTIVITY_MESSAGE}/></p>
        : <p className="text-body text-muted-as-secondary select-text"><StartMessage defaultMessage="No result — task {status, select, failed {failed} stopped {stopped} other {ended}}" id="lEAPaAhXw3" values={{status:agent.status}}/></p>)}
  </div></div>;
}
// W14-code r5pa-07 (E95): 3.6556.2 cccc2cf0a's sub-agent view has no composer (en-US has no "Message {name}…"), so the
// host's follow-up box for a continuable sub-agent (AgentComposer, onMessage / canMessage, .sag-composer) is gone.
export function SourceTasksPane({transcriptView="normal",state,sessionId,views=[],onBack,onClose,onOpen,onLoad,renderItem,renderRows=null,headerCenter,controls,background}) {
  const current=views.at(-1),pane=useRef(null),load=useRef(onLoad);load.current=onLoad;
  // W14-code r4 r4pa-c03: in a pane window (c5638815a wt `isTopLeft: !0`) the header clears the traffic lights and drags the window.
  const paneWindowHeader=usePaneWindowHeaderProps();
  const [loadState,setLoadState]=useState({id:null,pending:false,error:null});
  useEffect(()=>{
    if(!current?.threadId)return;
    let live=true;setLoadState({id:current.threadId,pending:true,error:null});
    load.current(current.threadId).then(()=>{if(live)setLoadState({id:current.threadId,pending:false,error:null});},error=>{if(live)setLoadState({id:current.threadId,pending:false,error:error.message});});
    return()=>{live=false;};
  },[current?.threadId,state.approvalConnectionEpoch]);
  useLayoutEffect(()=>{pane.current?.querySelector('.source-pane-header button')?.focus({preventScroll:true});},[current?.threadId]);
  const item=current && (state.items[current.ownerId || sessionId] || []).find(item=>item.id===current.toolId);
  const agent=current && agentView(state,item||{},current.threadId);
  const spawns=(state.items[sessionId] || []).filter(item=>item.type==='collabAgentToolCall' && item.tool==='spawnAgent');
  // rw (cccc2cf0a :12505-12522, mounted :13790): "Clear finished tasks" leads the header's trailing controls while
  // the task list shows (not under a sub-agent view), disabled rather than hidden when nothing has finished.
  const clear=views.length===0 && background && sessionId ? <SourceClearFinishedTasks sessionId={sessionId}/> : null;
  const trailing=node=>!clear ? node : React.isValidElement(node) && typeof node.type!=='string' ? React.cloneElement(node,{leading:<>{clear}{node.props.leading}</>}) : <>{clear}{node}</>;
  return <aside ref={pane} className="source-file-panel detail-panel sag-pane" aria-label={t("Background tasks")} onKeyDown={event=>{
    if(event.key==='Escape' && !event.defaultPrevented && !event.target.closest('[role="menu"]')){event.preventDefault();event.stopPropagation();onClose();}
  }}>
    <header className="source-pane-header" data-pane-header="tasks" {...paneWindowHeader}>
      <PaneWindowDragStrip/>
      {/* W14-code r4 css4-pane-toggle-icon-buttons: c4db265df's pane-header back button Q, `n(h,{variant:"ghost",iconOnly:!0,
          icon:"CaretLeft","aria-label":pe??"Back" (cyR7KhiuaU),onClick:B,tooltip:me,className:"shrink-0"})` (h = the CDS Button). */}
      {views.length>0 && <CdsButton variant="ghost" iconOnly icon="CaretLeft" aria-label={t("Back")} onClick={onBack} className="shrink-0"/>}
      <span className="sag-pane-title">{current?.description || t('Background tasks')}</span>{/* ka [H, t, o] then pe (panes-toggle-current.js:1627-1632): handle after the title */}{headerCenter}{trailing(controls)}
    </header>
    {agent ? <AgentTranscript transcriptView={transcriptView} key={current.threadId} agent={agent} ownerId={sessionId} stats={agentConclusionStats(state,agent)} item={item||{}} renderItem={renderItem} renderRows={renderRows} loading={loadState.id===current.threadId && loadState.pending} error={loadState.id===current.threadId && loadState.error}/> : !current&&background ? background : <div className="sag-transcript">
      {/* W14-code r3 r3pa-01: cccc2cf0a CP without a prompt (`underPrompt: !1`) — the EmptyState (cc0a875c8 t, nd) titled
          "No activity yet" (aojEGT2eHI). */}
      {current ? <EmptyState title={<StartMessage {...NO_ACTIVITY_MESSAGE}/>}/> : spawns.map(item=><React.Fragment key={item.id}>{renderItem(item,sessionId)}</React.Fragment>)}
      {!current && !spawns.length && <EmptyState title={<StartMessage {...NO_ACTIVITY_MESSAGE}/>}/>}
    </div>}
  </aside>;
}
