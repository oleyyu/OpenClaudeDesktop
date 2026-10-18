// Current cccc2cf0a zS (2.42304.0 jT): child transcript, the session error notice
// (nT) and approvals, then its own composer in flex/h-full/min-h-0; FT (RO)
// supplies the multiple side-chat tabs in the header, with the LO tab menu (Unpin, Detach to top level).
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { SourceTranscript } from './source-transcript.jsx';
import { SourceTranscriptEmpty, SourceTranscriptLoadFailure } from './source-transcript-states.jsx';
import { SourceLoadingPane } from './source-pane-states.jsx';
import { SourceMessage, SourceApproval, SourcePlanHandoffCard } from './source-session.jsx';
import { SourceComposer } from './source-composer.jsx';
import { SourceViewTabBar } from './source-view-tabs.jsx';
import { SourceQueuedMessages } from './source-queued-messages.jsx';
import { lastDequeueable } from './queued-messages-model.mjs';
import { btwDrafts } from './use-btw-pane.jsx';
import { ownBtwItems } from './btw-pane-controller.mjs';
import { groupFileTools } from './file-tool-model.mjs';
import { useMcpAppRowGrouping } from './source-mcp-app.jsx';
import { isItemStreaming, ownerThreadId } from './state.js';
import { visibleApprovals, isPlanReviewRequest } from './approval-draft-model.mjs';
import { approvalItem, planHandoff } from './approval-card-model.mjs';
import { CardComposerContext } from './use-card-hotkeys.js';
import { t, tn, getLocale } from '../electron/i18n/index.mjs';
import { useBtwFocusIntent, rememberBtwFocus } from './generated/code-current/btw-focus-intent.mjs';
import { paneOwnsFocus } from './generated/code-current/pane-focus-owner.mjs';
import { SourceTurnError } from './source-turn-error.jsx';
import { SourceTranscriptRowBoundary } from './source-r3b-transcript.jsx';
import { turnErrorPlacements } from './turn-error-model.mjs';
import { btwSessionNotice, btwNoticeDismissals, sendFailureToasts } from './btw-session-notice-model.mjs';
import { SourceApprovalSlot } from './source-approval-card.jsx';
import { ApprovalCardWatch } from './generated/approval-landing/card-landing.mjs';
// cccc2cf0a Qn = shared-frame Ii: the CDS ContextMenu whose Popup the ViewTabBar tab menu is (cfe7c4b3b ge `C.Popup`).
import { CdsContextMenu, CdsRoot } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { codePaneExperimental } from './generated/code-composer/code-pane-experimental.mjs';
import './source-btw-pane.css';
// R4g-btw BT4 (X7-16): c96d752d0 Kj (the watch over the card slot, ccf527892 useFocusHandBack) and the approval
// area's slot (qj with its next-card landing and the Gj window guard) are the shared originals now: the generated
// ApprovalCardWatch and source-approval-card.jsx's SourceApprovalSlot, which the main session's area mounts too.
export const SourceBtwCardWatch = ApprovalCardWatch;
export const SourceBtwApprovalSlot = SourceApprovalSlot;

// cccc2cf0a LO: the side-chat tab menu's own items, "Unpin" (nR6dLhVwqy) for a pinned tab and "Detach to top level"
// (XP5vxiZixk) for a detachable one, as Qn.Item = CdsContextMenu.Item inside the ViewTabBar's tab menu. Detach first
// records the tab in the header's `detaching` set (`r.add(e)`), and a failed detach takes it out again
// (`i(e, () => r.delete(e))`, shared-11 pf). The unpin/detach telemetry (Pu, Br) is not ported.
export function SourceBtwTabMenuItems({ id, pinned, detachable, detaching, onUnpin, onDetach }) {
  return <>
    {pinned && <CdsContextMenu.Item onClick={() => onUnpin?.(id)}>{t('Unpin')}</CdsContextMenu.Item>}
    {detachable && <CdsContextMenu.Item onClick={() => { detaching.add(id); onDetach?.(id, () => detaching.delete(id)); }}>
      {t('Detach to top level')}</CdsContextMenu.Item>}
  </>;
}

// cccc2cf0a FT passes no onReorder/onCreate: the side-chat strip is ordered
// by creation time even though the shared component also supports reordering.
// 2.42304.0 RO adds renderTabMenuItems N (LO when the tab is pinned (m) or detachable (p = Sa(sessions, id)); `menu` is
// btw-tab-menu-model's per-tab state) and IO: when the active tab's lineageDetached turns from false to true after a
// Detach from this menu (`j.delete(t)`) and its draft is empty (`!Gh(t)`), the pane yields (A: the next, then previous
// tab, else it closes) through onYield. activeDetached is undefined while the active session's record is unknown.
export function SourceBtwTabs({ tabs, activeId, state, pending, onSelect, onClose, onReselect, density, direction,
  menu = null, onUnpin, onDetach, activeDetached, onYield }) {
  const fallback=t('Side chat'),locale=getLocale();
  const views=useMemo(()=>tabs.map((tab,index)=>({id:tab.id,
    label:tab.name && tab.name!==fallback ? tab.name.startsWith('btw: ') ? tab.name.slice(5) : tab.name : tabs.length===1 ? fallback : t('Side chat {n}',{n:index+1}),
    closable:!state.active[tab.id]&&!pending[tab.id],status:state.active[tab.id]?t('Working'):undefined})),[tabs,state.active,pending,fallback]);
  const labels=useMemo(()=>({moreTabs:t('More side chats'),closeTab:t('Close side chat'),
    closeTabHint:t('press right arrow to close'),closeTabHintRtl:t('press left arrow to close'),
    closeTabDeleteHint:t('Press Delete or Backspace to close the side chat')}),[locale]);
  const [detaching]=useState(()=>new Set());
  const renderTabMenuItems=useMemo(()=>id=>{
    const entry=menu?.get(id);
    return entry&&(entry.pinned||entry.detachable)
      ? <SourceBtwTabMenuItems id={id} pinned={entry.pinned===true} detachable={entry.detachable===true} detaching={detaching} onUnpin={onUnpin} onDetach={onDetach}/> : null;
  },[menu,detaching,onUnpin,onDetach]);
  // IO's store subscriber runs inside the store update, with the callback (A → E over x) of the render before it, so E
  // looks for the neighbours in the strip as it stood before the detach (PO then moves the detached active tab last):
  // `order` is that strip, kept from the previous render.
  const seen=useRef({id:activeId,detached:activeDetached,tabs}),yieldTo=useRef(onYield);yieldTo.current=onYield;
  useEffect(()=>{
    const prior=seen.current;seen.current={id:activeId,detached:activeDetached,tabs};
    if(prior.id!==activeId||prior.detached!==false||activeDetached!==true)return;
    if(detaching.delete(activeId)&&!btwDrafts.get(activeId).trim())yieldTo.current?.(activeId,prior.tabs);
  },[activeId,activeDetached,tabs]);
  return <div className="relative flex items-center flex-1 min-w-0 gap-1">
    <div className="draggable absolute inset-0 -z-[1]" aria-hidden="true"/>
    <SourceViewTabBar className="min-w-0 flex-1" aria-label={t('Side chat tabs')} density={density} direction={direction}
      tabs={views} activeId={activeId} onActivate={onSelect} onReselect={onReselect} onClose={onClose}
      renderTabMenuItems={renderTabMenuItems} minTabWidth={92} labels={labels}/>
  </div>;
}

export function SourceBtwPane(props) {
  const { sessionId, meta, tabs, state, pending = {}, tabPending = pending, stopping = {}, density, onStop, onSelect, onCloseTab,
    tabMenu = null, onUnpinTab, onDetachTab, onYieldTab, headerCenter, controls, onError } = props;
  const root = useRef(null), input = useRef(null), running = !!state.active[sessionId];
  return <aside ref={root} className="source-file-panel detail-panel btw-pane" data-side-session-pane={sessionId} aria-label={t('Side chat')}
    onKeyDown={event => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229 || event.target.closest?.('[role="menu"],[role="dialog"]')) return;
      event.stopPropagation();
      if (running && !stopping[sessionId]) { event.preventDefault(); if (!event.repeat) void onStop(sessionId).catch(error => onError(error.message)); }
    }}>
    <header className="source-pane-header" data-pane-header="session">
      <SourceBtwTabs density={density} tabs={tabs} activeId={sessionId} state={state} pending={tabPending} onSelect={onSelect}
        onClose={id => onCloseTab(id, paneOwnsFocus(root.current))} onReselect={() => input.current?.focus()}
        menu={tabMenu} onUnpin={onUnpinTab} onDetach={onDetachTab} activeDetached={meta ? meta.lineageDetached === true : undefined}
        onYield={(id, order) => onYieldTab?.(id, paneOwnsFocus(root.current), order)}/>{headerCenter}{controls}
    </header>
    {/* zS is keyed by session: its focus intent is consumed once per mount.
        FT/header stays mounted so the source tab strip retains its state. */}
    <SourceBtwContent key={sessionId} {...props} root={root} input={input}/>
  </aside>;
}

export function SourceBtwContent({ sessionId, meta, thread, state, connected, pending = {}, stopping = {}, root, input, density,
  queueEnabled = false, queueState, queueEpoch, queues,
  planAnswered, planBusy = false, onImplementPlan, onStayPlan, permissionHints = false,
  onLoad, onSend, onStop, approvalRuntime, respond, onOpenFile, onError, onOpenLink, onOpenSettings, onEditConfig }) {
  const draftRef = useRef(false), load = useRef(onLoad); load.current = onLoad;
  const draft = useSyncExternalStore(btwDrafts.subscribe, () => btwDrafts.get(sessionId), () => '');
  draftRef.current = !!draft.trim();
  const composer = useMemo(() => ({ composerRef: input, draftRef }), []);
  const running = !!state.active[sessionId], [read, setRead] = useState({ id: null, pending: false, error: null }), [retry, setRetry] = useState(0);
  const reading = read.id !== sessionId || read.pending, readError = read.id === sessionId ? read.error : null;
  // R4i-mcp MC1: an MCP App call is its own row in the side chat too (c96d752d0 KBe mcp_app, UV stands-alone).
  const groupRows = useMcpAppRowGrouping(sessionId);
  const ownItems = ownBtwItems(state.items[sessionId], meta), rows = groupRows(groupFileTools, ownItems);
  const ownedApprovals = state.approvals.filter(request => ownerThreadId(state, request.params?.threadId) === sessionId);
  const approvals = visibleApprovals(ownedApprovals);
  const planReview = approvals.some(request => isPlanReviewRequest(request) && request.params?.inputWithheld !== true);
  const pendingItems = new Set(approvals.map(request => request.params?.itemId).filter(Boolean));
  const priorRunning = useRef({sessionId,running});
  useEffect(() => {
    if (priorRunning.current.sessionId === sessionId && priorRunning.current.running && !running) setRetry(value => value + 1);
    priorRunning.current = {sessionId,running};
  }, [sessionId,running]);
  useEffect(() => {
    if (!sessionId || !connected) return;
    let live = true; setRead({ id: sessionId, pending: true, error: null });
    load.current(sessionId).then(() => { if (live) setRead({ id: sessionId, pending: false, error: null }); }, error => { if (live) setRead({ id: sessionId, pending: false, error }); });
    return () => { live = false; };
  }, [sessionId, connected, state.approvalConnectionId, state.approvalConnectionEpoch, retry]);
  // jT `B = Jh(e); T(() => { B && m.current?.scheduleFocus(); }, [B])`: the consumed focus intent focuses the composer
  // with its caret at the end (c227f4d5e OP scheduleFocus, on the editor element; composer-focus-api.mjs).
  const focusIntent = useBtwFocusIntent(sessionId);
  useEffect(() => {
    if (!focusIntent || planReview) return;
    const node = input.current;
    if (!node || node.isConnected === false || thread?.archived) return;
    // The header shares a ref to the currently mounted editor. A retiring
    // child's effect must not focus the next child's replacement editor.
    if (node.closest && node.closest('[data-side-session-pane]')?.getAttribute('data-side-session-pane') !== sessionId) return;
    node.scheduleFocus?.();
  }, [focusIntent, input]);
  const queueView = queueState?.epoch === queueEpoch ? queueState : null;
  const queued = queueView?.queue, pendingSteers = queueView?.pending ?? [];
  const handoff = connected && !reading && !readError && !thread?.archived ? planHandoff({
    items: ownItems, permission: meta?.btw?.permission, hints: permissionHints, running,
    waiting: approvals.length > 0 || (pending[sessionId] && !planBusy) || !!queueView?.busy || queued?.entries.length > 0,
    turnErrors: state.turnErrors?.[sessionId], answered: new Set([meta?.btw?.planAnsweredTurnId,
      planAnswered && planAnswered.epoch === queueEpoch ? planAnswered.turnId : null]) }) : null;
  const composerHidden = planReview || !!handoff;
  // F_'s transcript draws each own failed turn's error in that turn (errorSource "transcript"): the newest as the card,
  // older ones as markers (turnErrorPlacements over the child's own rows, as the main transcript does).
  const turnErrors = state.turnErrors?.[sessionId], turnErrorView = turnErrorPlacements(ownItems, turnErrors, { activeTurnId: state.active[sessionId] });
  // nT: the child's current session error (btw-session-notice-model: the thread-wide one), until dismissed.
  const dismissals = useSyncExternalStore(btwNoticeDismissals.subscribe, btwNoticeDismissals.getSnapshot, btwNoticeDismissals.getSnapshot);
  const current = btwSessionNotice({ threadError: state.errors?.[sessionId] });
  const notice = current && dismissals.get(sessionId) !== current.key ? current : null;
  const noticeKey = useRef(null); noticeKey.current = notice?.key ?? null;
  const dismissedFrom = useRef(null), [dismissRevision, setDismissRevision] = useState(0);
  const dismissNotice = event => {
    // nT m with c73f45bc3 Km (xd): only a keyboard Dismiss (the button focused and :focus-visible) restores focus.
    const control = event.currentTarget;
    if (control?.ownerDocument?.activeElement === control && control.matches?.(':focus-visible')) {
      dismissedFrom.current = { control, scope: control.closest?.('[data-approval-hotkey-scope]') ?? null };
      setDismissRevision(value => value + 1);
    }
    btwNoticeDismissals.dismiss(sessionId, notice?.key);
  };
  useEffect(() => {
    const from = dismissedFrom.current; dismissedFrom.current = null;
    if (!from || from.control.isConnected) return;
    const doc = from.control.ownerDocument;
    if (doc.activeElement && doc.activeElement !== doc.body) return;
    // nT f: Uh (c5259f582 pe: `n ? n.scheduleFocus() : K(e, t)`) focuses the mounted composer, else remembers a focus
    // intent for its next mount; focus still on the body lands on the approval scope itself.
    const node = input.current;
    if (node && node.isConnected !== false) node.scheduleFocus?.();
    else rememberBtwFocus(sessionId, performance.now());
    if (from.scope && doc.activeElement === doc.body) { from.scope.tabIndex = -1; from.scope.focus(); }
  }, [dismissRevision]);
  // jT N (onFocusHandBack, qj's toComposer): `m.current?.focusPreservingSelection(), m.current?.ignoreStrayEnter()` on
  // this child's composer, the editor element's c227f4d5e OP API (composer-focus-api.mjs); the editor's own keydown then
  // swallows a stray Enter for rP. jT j (hasComposerDraft, qj's hasDraft): the child's draft is not empty.
  const landing = useMemo(() => ({
    toComposer: () => {
      const node = input.current;
      node?.focusPreservingSelection?.();
      node?.ignoreStrayEnter?.();
    },
    hasDraft: () => draftRef.current,
  }), [input]);
  const queueAction = action => void action().catch(error => onError(error.message));
  const editQueued = id => queueAction(async () => { await queues.remove(sessionId, id, true); input.current?.focus(); });
  const submit = async options => {
    const text = btwDrafts.get(sessionId).trim(); if (!text || composerHidden || pending[sessionId] || (running && !queueEnabled)) return;
    btwDrafts.set(sessionId, '');
    const before = noticeKey.current;
    try { await onSend(sessionId, text, options); }
    catch (error) {
      btwDrafts.restore(sessionId, text);
      // jT H: no toast when the failure put a new session error on screen (personSent has no local field).
      if (sendFailureToasts({ before, after: noticeKey.current })) onError(error.message);
    }
  };
  return <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        {readError && !rows.length ? <SourceTranscriptLoadFailure onRetry={() => setRetry(value => value + 1)}/>
          : reading && !rows.length ? <SourceLoadingPane label={t('Loading session')}/>
          : !rows.length ? <SourceTranscriptEmpty/>
          : <SourceTranscript sessionKey={`btw:${sessionId}`} responding={running} ready={!reading}>
            {rows.map((item, index) => {
              // Inside the failed turn, after its last row. No Try again / Compact: the child pane's transcript has no
              // retry/compact provider (c227f4d5e OW without MW → TW), and nT never offers them either.
              const variant = item.turnId && turnErrorView.get(item.turnId);
              const failure = variant && rows.findLastIndex(row => row.turnId === item.turnId) === index;
              return <React.Fragment key={item.id}>
                {/* R4g-btw BT2 (X7-19, D34): the child's feed is c96d752d0's lat / dat too (c4ea84cb3), so each row sits in
                    the u9 row boundary, gated on the child's own session. */}
                <SourceTranscriptRowBoundary sessionId={sessionId} item={item} isStreaming={isItemStreaming(state, sessionId, item)}>
                <SourceMessage item={item} sessionKey={sessionId} cwd={thread?.cwd} isStreaming={isItemStreaming(state, sessionId, item)} turnStart={index === 0 || rows[index - 1].turnId !== item.turnId}
                  pendingApprovalItemIds={pendingItems} onOpenFileRef={onOpenFile}/></SourceTranscriptRowBoundary>
                {/* R4i-transcript TR2: the error card is an item of the reply in 2.42304.0 (c96d752d0 `case"error":g(s,VK(n.id,u,"error",`),
                    so it sits in its own row boundary with the reply's copy (D34). Only the card draws actions: the marker
                    gets no callbacks, as the main transcript's does not. The card's own, session-independent actions are the
                    official TW ones (links, settings, and the host's Open config); model is the child's own model (the turn
                    it ran used metadata.model, use-btw-pane send), so the cyber notice names the child's model. */}
                {failure && <SourceTranscriptRowBoundary key={`${sessionId}:${item.turnId}:${variant}`} sessionId={sessionId} item={item} kind="reply">
                  <SourceTurnError key={`${sessionId}:${item.turnId}:${variant}`} error={turnErrors[item.turnId]} turnId={item.turnId} variant={variant}
                  onOpenSettings={variant === 'card' ? onOpenSettings : undefined} onOpenLink={variant === 'card' ? onOpenLink : undefined}
                  onEditConfig={variant === 'card' ? onEditConfig : undefined} model={meta?.model || ''}/></SourceTranscriptRowBoundary>}
              </React.Fragment>;
            })}
          </SourceTranscript>}
      </div>
      <div className="flex shrink-0 flex-col gap-xs px-sm pb-sm pt-xs" data-approval-hotkey-scope={`btw:${sessionId}`}>
        {/* R4g-btw BT1 (X7-17): c3e34355f draws helpLink as its own link (`a(ye,{href:bn,external:"with-icon"`) and
            billing through the router (`Yt("/settings/billing")`, Yt=ke()), neither from nT's props; the local card's link
            and settings buttons need onOpenLink / onOpenSettings, so the child pane passes the main session's two. */}
        {notice && <SourceTurnError key={`${sessionId}:${notice.key}`} error={notice.error} turnId={notice.turnId} variant="card" onDismiss={dismissNotice}
          onOpenSettings={onOpenSettings} onOpenLink={onOpenLink} onEditConfig={onEditConfig} model={meta?.model || ''}/>}
        <CardComposerContext.Provider value={composer}>
          {/* R4g-btw BT4 (X7-16): one slot for the area ($j's qj), so the card after a decided one is where focus lands. */}
          <SourceBtwApprovalSlot runtime={approvalRuntime} requests={ownedApprovals} extraCard={handoff ? handoff.turnId : null}
            hasDraft={landing.hasDraft} toComposer={landing.toComposer}
            renderRequest={request => <SourceApproval key={request.bridgeApproval.instanceId} runtime={approvalRuntime} request={request} item={approvalItem(request, ownItems)}
            sessionKey={sessionId} cwd={thread?.cwd} onOpenFileRef={onOpenFile} getVisibleThreadId={() => root.current?.isConnected ? request.params?.threadId : null}
            respond={payload => respond(request, payload)} isActive={connected} planTarget="acceptEdits" planAcceptModes={['acceptEdits']} bypassAvailable={false}/>}>
          {handoff && <SourcePlanHandoffCard key={`handoff:${handoff.turnId}`} handoffKey={`btw:${sessionId}:${handoff.turnId}`} target="acceptEdits" acceptModes={['acceptEdits']}
          captureHotkeys busy={planBusy} isActive={connected} onImplement={target => void onImplementPlan(sessionId, handoff.turnId, target).catch(error => onError(error.message))}
          onStay={() => void Promise.resolve(onStayPlan(sessionId, handoff.turnId)).catch(error => onError(error.message))}/>}
          </SourceBtwApprovalSlot>
        </CardComposerContext.Provider>
        <div className={composerHidden ? 'hidden' : 'contents'} data-btw-composer-hidden={composerHidden ? 'true' : undefined}>
        {pendingSteers.length > 0 && <div className="sqm-band epitaxy-band-enter" data-pending-steers="" data-count={pendingSteers.length} role="status">
          <div className="sqm-row sqm-single"><span className="sqm-count">{tn(pendingSteers.length, 'Sending after the next step', '{count} messages sending after the next step', { count: pendingSteers.length })}</span>
            <span className="sqm-preview">{pendingSteers.map(entry => entry.preview).join(' · ')}</span></div>
        </div>}
        {queued && <SourceQueuedMessages key={sessionId} entries={queued.entries} lockedIds={queueView.busy ? queued.entries.map(entry => entry.id) : []}
          steeringId={queueView.steeringId} onCancel={connected && !thread?.archived && !queueView.busy ? id => queueAction(() => queues.remove(sessionId, id)) : undefined}
          onEdit={connected && !thread?.archived && !queueView.busy ? editQueued : undefined}
          onClearAll={connected && !thread?.archived && !queueView.busy ? () => queueAction(() => queues.clear(sessionId)) : undefined}
          onSteer={connected && !thread?.archived && running && !queueView.busy ? id => queueAction(() => queues.promote(sessionId, id)) : undefined}
          onReorder={connected && !thread?.archived && !queueView.busy ? (from, to) => queueAction(() => queues.reorder(sessionId, from, to)) : undefined}/>} 
        {/* R4g-btw BT1 (X7-18): jT's composer (Io = c227f4d5e kP/OP → uM) gets no onPaste, onPageFileDrop, onAddFiles
            or attachmentStrip, so uM's `onPaste:Te`, `onFileDrop:Ee` and the + (Oj, only with onAddFiles) are all off:
            the child pane takes no attachments. Passing no onStageFiles / onAddFolders here is the same. */}
        {/* R4i-graph GR3: jT sits inside the Code pane, which 2.42304.0 c11959232 wraps in CdsRoot; the host wraps each
            composer instead, this one like main.jsx's Code composer (density, platform "desktop", the Code pane's
            experimental, className "contents"). No font prop: CdsRoot then reads html[data-font] (Za's nr), which
            appearance-root writes from the same preference main.jsx's cdsFont comes from. */}
        <CdsRoot density={density} platform="desktop" experimental={codePaneExperimental} className="contents">
        <SourceComposer key={sessionId} embedded isPanelActive={false} codeLayout="side-session" draft={draft} setDraft={value => btwDrafts.set(sessionId, typeof value === 'function' ? value(btwDrafts.get(sessionId)) : value)} textarea={input}
          onSubmit={submit} onStop={() => void onStop(sessionId).catch(error => onError(error.message))} running={running} sending={!!pending[sessionId]} stopping={!!stopping[sessionId]}
          editable={!thread?.archived} canSubmit={!composerHidden && connected && !reading && !readError && !queueView?.busy} queueEnabled={queueEnabled}
          onEmptyArrowUp={connected && !thread?.archived && !queueView?.busy && lastDequeueable(queued) ? () => { editQueued(lastDequeueable(queued).id); return true; } : undefined}
          commandScope={`btw:${sessionId}`} workdir={thread?.cwd}
          placeholder={t('Reply in this session…')} permission={meta?.btw?.permission} folderMenu={false}/>
        </CdsRoot>
        </div>
      </div>
    </div>;
}
