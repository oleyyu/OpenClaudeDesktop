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
import { toolRunLiveTail } from './transcript-rows-model.mjs';
import { useMcpAppRowGrouping } from './source-mcp-app.jsx';
import { isItemStreaming, ownerThreadId } from './state.js';
import { visibleApprovals, isPlanReviewRequest } from './approval-draft-model.mjs';
import { approvalItem, planHandoff } from './approval-card-model.mjs';
import { CardComposerContext } from './use-card-hotkeys.js';
import { t, tn, getLocale } from '../electron/i18n/index.mjs';
import { useBtwFocusIntent, focusBtwComposer, armBtwSessionComposer, focusBtwSessionComposer } from './generated/code-current/btw-focus-intent.mjs';
import { paneFocusTarget } from './generated/code-current/pane-focus-target.mjs';
import { registerBtwComposer } from './btw-composer-registry.mjs';
import { paneOwnsFocus } from './generated/code-current/pane-focus-owner.mjs';
import { SourceTurnError } from './source-turn-error.jsx';
import { SourceTranscriptStatus } from './source-transcript-status.jsx';
import { SourceTranscriptRowBoundary } from './source-r3b-transcript.jsx';
import { turnErrorPlacements } from './turn-error-model.mjs';
import { btwSessionNotice, btwNoticeDismissals, sendFailureToasts } from './btw-session-notice-model.mjs';
import { SourceApprovalSlot } from './source-approval-card.jsx';
import { ApprovalCardWatch } from './generated/approval-landing/card-landing.mjs';
// cccc2cf0a Qn = shared-frame Ii: the CDS ContextMenu whose Popup the ViewTabBar tab menu is (cfe7c4b3b ge `C.Popup`).
// R6/E2: hand-written code reads view-tabs through its version-free facade.
import { CdsContextMenu, CdsRoot } from './generated/view-tabs/index.js';
import { codePaneExperimental } from './generated/code-composer/code-pane-experimental.mjs';
import './source-btw-pane.css';
// R4g-btw BT4 (X7-16): the watch over the card slot (3.6556.2 c9ed5627b it over shared-1 useFocusHandBack mC;
// 2.42304.0 c96d752d0 Kj / ccf527892 o) and the approval area's slot (c9ed5627b A with its next-card landing and the k
// window guard; 2.42304.0 qj / Gj) are the shared originals: the generated ApprovalCardWatch and
// source-approval-card.jsx's SourceApprovalSlot, which the main session's area mounts too.
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

// cccc2cf0a qP passes no onReorder: the side-chat strip is ordered by creation time even though the shared component
// also supports reordering. It does pass `onCreate:P,createBusy:F` (c73f45bc3 Op / vp, use-btw-pane createTab / opening):
// the strip's "New side chat" button, "Starting side chat…" while the start is in flight.
// 2.42304.0 RO adds renderTabMenuItems N (LO when the tab is pinned (m) or detachable (p = Sa(sessions, id)); `menu` is
// btw-tab-menu-model's per-tab state) and IO: when the active tab's lineageDetached turns from false to true after a
// Detach from this menu (`j.delete(t)`) and its draft is empty (`!Gh(t)`), the pane yields (A: the next, then previous
// tab, else it closes) through onYield. activeDetached is undefined while the active session's record is unknown.
export function SourceBtwTabs({ tabs, activeId, state, pending, onSelect, onClose, onReselect, density, direction,
  menu = null, onUnpin, onDetach, activeDetached, onYield, closing = NO_CLOSING, onCreate, createBusy = false }) {
  const fallback=t('Side chat'),locale=getLocale();
  // 3.6556.2 qP: an untitled tab is "Side chat" when it is the parent's first /btw child (HP's ordinal, y[t] === 1), else
  // "Side chat {n}" with that ordinal (btw-pane-controller btwPaneTabs gives each tab its HP ordinal; 2.42304.0 RO used the
  // strip position, "Side chat" only for a lone tab).
  const views=useMemo(()=>tabs.map((tab,index)=>{const ordinal=tab.ordinal??index+1;return {id:tab.id,
    label:tab.name && tab.name!==fallback ? tab.name.startsWith('btw: ') ? tab.name.slice(5) : tab.name : ordinal===1 ? fallback : t('Side chat {n}',{n:ordinal}),
    // qP: `closable:!(I.has(e)||L.has(e)),status:x[t]?L.has(e)?"Stopping…":Wt.working:void 0`. A working tab stays
    // closable (closing stops it first, SourceBtwPane closeTab); L = c73f45bc3 uf is `closing`, the tabs being stopped and
    // closed. I (open in another window) is left to main's closeBtwTab / the controller's isOpenElsewhere. Host
    // difference: a tab protected by tabPending (a send, queue or Plan decision in flight) stays unclosable.
    closable:!closing.has(tab.id)&&!pending[tab.id],
    status:state.active[tab.id]?closing.has(tab.id)?t('Stopping…'):t('Working'):undefined};}),[tabs,state.active,pending,fallback,closing]);
  // qP G: `{...j,newTab:B,newTabBusy:V,moreTabs:H,closeTab:U,closeTabDeleteHint:ee}` (42YfXqKAm8, y9B3O29aGR, Qifwwi0/7E,
  // fyPrl4HbZ6, iCxvGkWlgx; CI-08 restored: a working side chat is stopped first, SourceBtwPane closeTab).
  const labels=useMemo(()=>({newTab:t('New side chat'),newTabBusy:t('Starting side chat…'),moreTabs:t('More side chats'),closeTab:t('Close side chat'),
    closeTabHint:t('press right arrow to close'),closeTabHintRtl:t('press left arrow to close'),
    closeTabDeleteHint:t('Press Delete or Backspace to close the side chat. A working side chat is stopped first.')}),[locale]);
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
  // 3.6556.2 cccc2cf0a UP(n, ne): `let n=Pa(e);return Fa(()=>{let r=n;n=Pa(e),n&&!r&&t()})` (Pa = shared-8 Kd, the
  // archive set): when the active child turns archived the pane yields (ne: Y over the strip, the next then previous tab
  // that is not archived, else the side pane closes). Host: the active tab stays in the strip once archived
  // (btwPaneTabs), with `archived: true` from its session record, so an archive from anywhere else (the sidebar, another
  // window) yields here; the pane's own close already moves on before it archives (main closeBtwTab). w11-sweep-ccres.
  const activeArchived=tabs.some(tab=>tab.id===activeId&&tab.archived===true);
  const archivedSeen=useRef({id:activeId,archived:activeArchived,tabs});
  useEffect(()=>{
    const prior=archivedSeen.current;archivedSeen.current={id:activeId,archived:activeArchived,tabs};
    if(prior.id===activeId&&prior.archived===false&&activeArchived)yieldTo.current?.(activeId,prior.tabs);
  },[activeId,activeArchived,tabs]);
  return <div className="relative flex items-center flex-1 min-w-0 gap-1">
    <div className="draggable absolute inset-0 -z-[1]" aria-hidden="true"/>
    <SourceViewTabBar className="min-w-0 flex-1" aria-label={t('Side chat tabs')} density={density} direction={direction}
      tabs={views} activeId={activeId} onActivate={onSelect} onReselect={onReselect} onClose={onClose} overflowArrowCloses={false}
      onCreate={onCreate} createBusy={createBusy} renderTabMenuItems={renderTabMenuItems} minTabWidth={92} maxLabelWidth={320} labels={labels}/>
  </div>;
}

const NO_CLOSING = new Set();
// c73f45bc3 bh = Tf → wf: `pf=1e4` (stop deadline), `hf=5` close attempts, each waiting `mf=1e3` for the archive (Cf over
// shared-8 Kd = Pg, the optimistic archive set).
const STOP_DEADLINE_MS = 10000, CLOSE_ATTEMPTS = 5, CLOSE_WAIT_MS = 1000;
const closeFailures = {
  not_stopped: () => t('Couldn’t stop the side chat. Try closing it again.'),
  pinned: () => t('This side chat is pinned. Unpin it before closing its tab.'),
  not_closed: () => t('Stopped the side chat, but couldn’t close its tab. It stays open while something still needs it, such as an open pull request.'),
};

export function SourceBtwPane(props) {
  const { sessionId, meta, tabs, state, pending = {}, tabPending = pending, stopping = {}, density, onStop, onSelect, onCloseTab,
    tabMenu = null, onUnpinTab, onDetachTab, onYieldTab, onCreateTab, createBusy = false, headerCenter, controls, onError } = props;
  const root = useRef(null), input = useRef(null), running = !!state.active[sessionId];
  // 3.6556.2 cccc2cf0a qP oe (onClose) with c73f45bc3 bh (Tf/wf). `closing` is uf (L), `live` the store reads wf's check
  // makes, `waiters` Cf's subscriptions (run after each render, as the session store's subscribers run on each update).
  const [closing, setClosing] = useState(NO_CLOSING);
  const live = useRef(null); live.current = { state, tabs, menu: tabMenu, onCloseTab, onStop, onError };
  const waiters = useRef(new Set()), mounted = useRef(true);
  useEffect(() => { for (const check of [...waiters.current]) check(); });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; for (const check of [...waiters.current]) check(); }; }, []);
  const waitFor = (test, ms) => new Promise(resolve => {
    let timer;
    const done = value => { clearTimeout(timer); waiters.current.delete(check); resolve(value); };
    const check = () => { if (!mounted.current || test()) done(true); };
    timer = setTimeout(() => done(false), ms); waiters.current.add(check); check();
  });
  const mark = (id, on) => { if (mounted.current) setClosing(value => { const next = new Set(value); if (on) next.add(id); else next.delete(id); return next; }); };
  // wf: `X.stop(e)` within pf (a failure is "not_stopped"), then up to hf times `closeBtwChild(e)` and Cf's wait for the
  // archive; still open after that is "not_closed". Its check (`n` once seen idle; the record still a live /btw child of
  // this parent, not shown elsewhere, not running again) gates every step and each failure toast. Host: X.stop is the
  // pane's onStop (interrupt), and the close is main's closeBtwTab once the turn has ended (it refuses a working tab and
  // moves the pane off the tab before the controller's closeChild); the archive is the tab leaving the strip. The run is
  // the mounted pane's: switching to another parent remounts the pane and ends it (uf is module state in 3.6556.2).
  async function stopThenClose(id, focus) {
    let idle = false;
    const check = () => {
      const { state, tabs } = live.current, working = !!state.active[id], tab = tabs.find(entry => entry.id === id);
      if (!working) idle = true;
      return mounted.current && !!tab && tab.archived !== true && !(idle && working);
    };
    const fail = reason => { if (check()) live.current.onError?.(closeFailures[reason]()); };
    mark(id, true);
    try {
      let timer;
      try {
        await Promise.race([Promise.resolve().then(() => live.current.onStop?.(id)),
          new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new Error('btw child stop timed out')), STOP_DEADLINE_MS); })]);
      } catch { fail('not_stopped'); return; } finally { clearTimeout(timer); }
      for (let attempt = 0; attempt < CLOSE_ATTEMPTS; attempt++) {
        if (!check()) return;
        // The interrupt has returned; the turn ends with its notification, and the close follows it at once.
        if (live.current.state.active[id] && !(await waitFor(() => !live.current.state.active[id], CLOSE_WAIT_MS) && check())) continue;
        live.current.onCloseTab(id, focus);
        if (await waitFor(() => !live.current.tabs.some(entry => entry.id === id && entry.archived !== true), CLOSE_WAIT_MS)) return;
      }
      fail('not_closed');
    } finally { mark(id, false); }
  }
  // oe: a draft (Mu) the host has none of; open elsewhere (Th) and an archived or no longer own child (BP) are main's
  // closeBtwTab (it moves the pane off the tab); a close already in flight (Lh, lf) is `closing` here and the controller's
  // closings; pinned (starredIds) is the "pinned" toast; working is bh; else Fh, main's closeBtwTab.
  const closeTab = id => {
    const tab = tabs.find(entry => entry.id === id);
    if (closing.has(id)) return;
    if (tab && tab.archived !== true && tabMenu?.get(id)?.pinned === true) { onError?.(closeFailures.pinned()); return; }
    const focus = paneOwnsFocus(root.current);
    if (state.active[id]) { void stopThenClose(id, focus); return; }
    onCloseTab(id, focus);
  };
  return <aside ref={root} className="source-file-panel detail-panel btw-pane" data-side-session-pane={sessionId} aria-label={t('Side chat')}
    onKeyDown={event => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229 || event.target.closest?.('[role="menu"],[role="dialog"]')) return;
      event.stopPropagation();
      if (running && !stopping[sessionId]) { event.preventDefault(); if (!event.repeat) void onStop(sessionId).catch(error => onError(error.message)); }
    }}>
    <header className="source-pane-header" data-pane-header="session">
      <SourceBtwTabs density={density} tabs={tabs} activeId={sessionId} state={state} pending={tabPending} onSelect={onSelect}
        onClose={closeTab} closing={closing} onCreate={onCreateTab} createBusy={createBusy}
        // 3.6556.2 cccc2cf0a qP J: `let t=N.current?.closest("[data-pane-root]");t&&(cu(e),P_(t)?.focus())`. cu = c03935b01 Yr
        // (`Rr.get(e)?.composerRef.current?.ignoreStrayEnter()`, the registry SourceBtwContent fills) arms the reselected
        // child's composer against the activating Enter; P_ = c9bc99274 b picks the pane's focus target (its
        // [data-tile-focus-target], else its first focusable text field). No pane root: nothing is focused.
        onReselect={id => { const pane = root.current?.closest?.('[data-pane-root]'); if (pane) { armBtwSessionComposer(id); paneFocusTarget(pane)?.focus(); } }}
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
  // c03935b01 ni: while this child's composer is shown it is the session's entry in the composer registry Rr
  // (btw-composer-registry.mjs), which Xr / Yr read; cleanup removes the entry only while it is still this mount's.
  useEffect(() => registerBtwComposer(sessionId, input), [sessionId, input]);
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
  // 3.6556.2 cccc2cf0a `f = $l(i); … f && ql(o.current, f)` (2.42304.0 jT `B && m.current?.scheduleFocus()`): the consumed
  // focus intent is now its record (c03935b01 Zr, null when stale) and Jr = focusBtwComposer applies it: a keyboard one
  // (`afterKeyPress`) first makes the composer swallow a stray Enter, then the caret goes to the end (c227f4d5e OP
  // scheduleFocus, on the editor element; composer-focus-api.mjs). The editor element carries both methods together.
  const focusIntent = useBtwFocusIntent(sessionId);
  useEffect(() => {
    if (!focusIntent || planReview) return;
    const node = input.current;
    if (!node || node.isConnected === false || thread?.archived) return;
    // The header shares a ref to the currently mounted editor. A retiring
    // child's effect must not focus the next child's replacement editor.
    if (node.closest && node.closest('[data-side-session-pane]')?.getAttribute('data-side-session-pane') !== sessionId) return;
    if (typeof node.scheduleFocus === 'function') focusBtwComposer(node, focusIntent);
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
    // nT f: 3.6556.2 `ou(t.id, performance.now(), { afterKeyPress: !0 })` = c03935b01 Xr (`let r=Rr.get(e)?.composerRef.
    // current;r?Jr(r,n):qr(e,t,n)`; 2.42304.0 c5259f582 pe: `n ? n.scheduleFocus() : K(e, t)`): the registered composer
    // swallows the dismissing key's stray Enter and takes focus, else a keyboard focus intent waits for its next mount;
    // focus still on the body lands on the approval scope itself.
    focusBtwSessionComposer(sessionId, performance.now(), { afterKeyPress: true });
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
                  pendingApprovalItemIds={pendingItems} liveTail={toolRunLiveTail(rows, index, state.active[sessionId] ?? null)} onOpenFileRef={onOpenFile}/></SourceTranscriptRowBoundary>
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
            {/* F_ is the session transcript in the pane too, so the child's turn has the same working line (w8) as the
                main transcript: elapsed, tokens and activity of the child's own turn; the approval card replaces it. */}
            <SourceTranscriptStatus sessionKey={sessionId} ready={!reading} turnId={state.active[sessionId]}
              turnStats={state.turnStats?.[sessionId]} items={state.items[sessionId]} itemPhases={state.itemPhases?.[sessionId]}
              connected={connected} running={running} stopping={!!stopping[sessionId]} sending={!!pending[sessionId] && !running}
              waiting={ownedApprovals.length > 0} approvalVisible={ownedApprovals.length > 0}/>
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
