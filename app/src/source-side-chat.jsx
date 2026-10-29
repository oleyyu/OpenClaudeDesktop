// /btw side chat (original ca2ef848d Jw/Uw/Hw/Ww, "claudified_btw_side_chat"):
// Current Code geometry comes from cccc2cf0a AT/NT and cd97b284f e/t; the resize
// handles (cccc2cf0a-B0D--VZp sk/ck) are 2.42304.0's.
// A movable/resizable panel asks quick questions about
// the current session without interrupting or adding to it. The DeepSeek
// bridge answers through codeDesktop/sideQuestion (one auxiliary model call
// that sees the session read-only); deltas arrive as
// codeDesktop/sideQuestion/delta. ⌘; or /btw toggles it; Escape interrupts a
// running side response and closes the panel when idle.
// Current cccc2cf0a kT renders answers directly, without the legacy action footer.
// W12 sidechat-cont: the markup is cccc2cf0a's qF (bounds layer + aside) > UF (focus frame) > c4db265df rn `N_` (pane
// Surface, header line, body) > UF Xe/Ze/nt, with HF user turns; class constants come from the generated
// side-chat-chrome.mjs. Only main.jsx imports this host, so it reaches view-tabs through the facade (R6; not in the
// chat/composer/menu graph of E41).
import React, { useEffect, useId, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { CdsButton, CdsRoot, CdsSurface, CdsTooltip, useCdsDensity } from './generated/view-tabs/index.js';
import {
  paneBodyClass, paneElevation, paneFlushRootClass, paneHeaderLineClass, paneRootClass, paneTitleClass, paneTrailingClass,
  sideChatInsetClass, sideChatUserTurnClass, userBubbleMeasureClass, userBubbleShapeClass,
} from './generated/code-editor/side-chat-chrome.mjs';
// shared-156 Ln = "data-escape-owner" (cccc2cf0a imports it as Oi; proposal-group slices it as the official export Ln).
import { Ln as escapeOwnerAttribute } from './generated/proposal-group/shared-156-BLTosN8U.js';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceTooltip } from './source-tooltip.jsx';
import { SourceMentionDropdown } from './source-mention-dropdown.jsx';
import { useSideChatMentions } from './use-side-chat-mentions.jsx';
import { SourceComposerEditor } from './source-composer-editor.jsx';
import './source-composer.css';
import { SourceComposerAttachments } from './source-composer-attachments.jsx';
import { makeSnippet } from './composer-attachments-model.mjs';
import { useShrinkWrap } from './use-shrink-wrap.js';
import { messageAttachmentsClass, messageContextChipItem } from './generated/code-editor/side-chat-attachments.mjs';
import { paneHeaderMouseDown } from './generated/code-editor/side-chat-pane-events.mjs';
import { parseSideChatQuestion } from './generated/code-editor/side-chat-context.mjs';
import { syncSideChatScroll, emptySideChatScroll } from './generated/code-editor/side-chat-scroll.mjs';
import { maskSideChatSecrets as maskSecrets } from './generated/code-editor/side-chat-secrets.mjs';
import { SourceMarkdown } from './source-session.jsx';
import { SourceSideChatStatus } from './source-side-chat-status.jsx';
import { SourceSideChatUserContent } from './source-side-chat-user-content.jsx';
import { askSideQuestion, clearSideChat, stopSideQuestion } from './side-chat-controls.mjs';
export { askSideQuestion, sideQuestionUnsupported } from './side-chat-controls.mjs';
import { sideChatStore } from './side-chat-store.mjs';
import { sideChatEscape } from './side-chat-keyboard.mjs';
import { t } from '../electron/i18n/index.mjs';
import { sideChatResizeCursor, sideChatResizeHandles } from './side-chat-geometry.mjs';
import { useSideChatGeometry } from './use-side-chat-geometry.jsx';
import './source-side-chat.css';

export const SIDE_CHAT_KEYS = 'cmd+;';
// qF T = {zIndex: n}; the host panel layer is 440.
const SIDE_CHAT_BOUNDS_STYLE = { zIndex: 440 };
// UF passes N_ `style: {flex: 1, minHeight: 0}` in both branches.
const PANE_STYLE = { flex: 1, minHeight: 0 };
const ESCAPE_OWNER = { [escapeOwnerAttribute]: '' };
// Current kT/lo disables input while answering; Escape and the stop control interrupt.
function SideChatComposer({ threadId, busy, interrupting, value, onChange, placeholder, onSubmit, onStop, inputRef, stagedContext, onRemoveContext, open, searchFiles, mentions, mentionActions, portalRef }) {
  const suggest = useSideChatMentions({ inputRef, searchFiles, scope: threadId, enabled: open && !busy, onPick: option => sideChatStore.rememberMention(threadId, option) });
  const scope = useId();
  const submit = () => { const text = value.trim(); if (!text || busy) return; onChange(''); onSubmit(text); };
  // UF nt: the composer sits in `div.shrink-0 px-md pb-md` with data-approval-hotkey-scope (R = useId); ssc-composer is a
  // host hook for the mention dropdown state.
  return <div className="ssc-composer shrink-0 px-md pb-md" data-approval-hotkey-scope={scope} data-mention-open={suggest.open || undefined}>
    <div className="ssc-field sc-composer">
      <div className="sc-surface">
        <SourceComposerAttachments previewLayerBase={440} entries={stagedContext === null ? [] : [makeSnippet(maskSecrets(stagedContext), { id: "side-chat-staged-selection" })].filter(Boolean)} disabled={busy}
          onRemove={() => { onRemoveContext(); inputRef.current?.focus(); }}/>
        <div className="sc-input-row">
        <SourceComposerEditor scope={`side-${threadId}`} inputRef={node => { inputRef.current = node; }}
          className="ssc-input sc-input" value={value} mentions={mentions} mentionActions={mentionActions}
          onChange={event => { onChange(event.target.value); suggest.update(true); }} disabled={busy}
          aria-autocomplete="list" aria-expanded={suggest.open}
          onClick={() => suggest.update()} onKeyUp={event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) suggest.update(); }}
          placeholder={placeholder} aria-label={placeholder} aria-busy={busy || undefined}
          onKeyDown={event => {
            if (suggest.keyDown(event)) return;
            if (event.key !== 'Enter') return;
            if (event.isComposing || event.keyCode === 229) { event.preventDefault(); return; }
            if (event.shiftKey || event.altKey) return;
            event.preventDefault(); if (!event.repeat) submit();
          }}/>
        {busy && !interrupting ? <SourceTooltip content={t('Stop')} shortcut="escape" hoverable={false}>
          <SourceSettingsButton variant="ghost" size="sm" className="ssc-submit" icon="Stop" iconSize={16} iconOnly aria-label={t('Stop response')}
            aria-keyshortcuts="Escape" onClick={onStop}/>
          </SourceTooltip>
          : <SourceSettingsButton variant="ghost" size="sm" className="ssc-submit" icon="ArrowReturn" iconSize={16} iconOnly aria-label={t('Send')}
            aria-keyshortcuts="Enter" disabled={busy || !value.trim()} onClick={submit}/> }
      </div></div>
    </div>
    {suggest.open && open && !busy && <SourceMentionDropdown options={suggest.menu.options} highlighted={suggest.menu.highlighted} caret={suggest.menu.caret}
      onSelect={suggest.select} onClose={suggest.close} container={portalRef.current}/>}
  </div>;
}

// shared-2 r8 (UserMessage, `Ar` in HF) as HF draws it: no author, not editing, not collapsible, no actions. The row is
// Bt `group/message-row flex w-full min-w-0 flex-col gap-xs font-sans` + `ms-auto items-end`; the bubble n is
// c("relative flex min-w-0 flex-col gap-xs", C3, "text-heading font-normal break-words select-text", "text-primary", w3,
// "bg-[var(--cds-bg-user-message)]") with the shrink-wrap ref It; its body is div#ut (className c(!1) = "") > div ot
// `cds-user-message-body`. data-text-size is E3 of HF's text size: fP() is undefined (fizzy-lake "type" part off, Qm = []),
// so it is "md" under qF's compact density and absent otherwise.
const USER_MESSAGE_ROW = 'group/message-row flex w-full min-w-0 flex-col gap-xs font-sans ms-auto items-end';
const USER_MESSAGE_BUBBLE = ['relative flex min-w-0 flex-col gap-xs', userBubbleShapeClass, 'text-heading font-normal break-words select-text', 'text-primary',
  userBubbleMeasureClass, 'bg-[var(--cds-bg-user-message)]'].join(' ');
function SideChatUserMessage({ text }) {
  const { snippets, rest } = parseSideChatQuestion(text);
  const bodyId = useId();
  const bubbleRef = useShrinkWrap({ enabled: true });
  const textSize = useCdsDensity() === 'compact' ? 'md' : undefined;
  // cccc2cf0a HF: div `ay` (c2fd10b8d ss) holding the snippet chips (sy, when there are snippets) and the UserMessage
  // around `div.flex flex-col gap-1.25` (when the body has segments). sy is c2fd10b8d cc with images LF = [] and the
  // snippets JF made (`{id: snippet-${t}, text: Zn(e.text), label: e.label}`, Zn = shared-104 ml, the secret mask), so it
  // draws only cc's "Attached context" list: ul[role=list] `${qs} gap-1` of the generated uc items (Xs quote chips).
  return <div className={sideChatUserTurnClass}>
    {snippets.length > 0 && <ul role="list" className={`${messageAttachmentsClass} gap-1`} aria-label={t('Attached context')}>
      {snippets.map((snippet, index) => messageContextChipItem({ id: `snippet-${index}`, text: maskSecrets(snippet.text), label: snippet.label }))}
    </ul>}
    {rest && <div data-cds="UserMessage" data-text-size={textSize} className={USER_MESSAGE_ROW}>
      <div ref={bubbleRef} className={USER_MESSAGE_BUBBLE}>
        <div id={bodyId} className=""><div className="cds-user-message-body"><SourceSideChatUserContent text={rest}/></div></div>
      </div>
    </div>}
  </div>;
}

function SideChatMessages({ threadId, messages, status, interrupting, thinkingSince, progress, assistantName, cwd, onOpenFileRef }) {
  const list = useRef(null), scrollState = useRef(emptySideChatScroll);
  // Our transport reserves an empty assistant slot before its first delta. The
  // reference does not insert that turn until streaming begins, so omit the slot
  // from both rendering and the original scroll callback's message history.
  const shown = messages.filter(message => message.role !== 'assistant' || message.text);
  useLayoutEffect(() => {
    if (!list.current) { scrollState.current = emptySideChatScroll; return; }
    const sourceStore = { getState: () => ({ messagesBySession: { [threadId]: shown }, queuedBySession: {} }) };
    syncSideChatScroll(list, threadId, sourceStore, scrollState);
  }, [threadId, messages, status]);
  // cccc2cf0a UF Xe (FF = "px-lg pt-md pb-[24px]"): with no turns, a padded box holding the alpha-1 notice div.
  if (!messages.length) return <div className={`flex-1 min-h-0 ${sideChatInsetClass}`}>
    <div className="bg-alpha-1 rounded p-lg text-footnote leading-normal text-muted-as-secondary text-pretty select-text">{t('Chat about this session without touching the main thread. {assistant} sees the full context, and nothing here is added to the session.', { assistant: assistantName })}</div>
  </div>;
  const streamingIndex = status === 'thinking' && shown.at(-1)?.role === 'assistant' ? shown.length - 1 : -1;
  // UF Xe: the turn list is `flex-1 min-h-0 overflow-y-auto flex flex-col gap-[var(--chat-turn-gap)] ${FF}`; user turns are
  // HF, each answer is a bare div.select-text around VF, and VF is mP around $d: with the fizzy-lake "type" part off
  // (shared-52 th, Qm = []) mP returns its children, so the Markdown sits directly in the div.select-text. UF wraps VF in
  // Yd.Provider value true (c19e90103 Ag, the Markdown's `transcriptLinks`: file paths in answers open in the app); the
  // host Markdown's counterpart is cwd + onOpenFileRef, the main transcript's file-ref opener.
  return <div ref={list} className={`flex-1 min-h-0 overflow-y-auto flex flex-col gap-[var(--chat-turn-gap)] ${sideChatInsetClass}`}>
    {shown.map((message, index) => message.role === 'user'
      ? <SideChatUserMessage key={index} text={message.text}/>
      : <div key={index} className="select-text">
        <SourceMarkdown text={message.text} isStreaming={index === streamingIndex} sessionKey={`btw-${threadId}`} itemId={`btw-${index}`} cwd={cwd} onOpenFileRef={onOpenFileRef}/>
      </div>)}
    <SourceSideChatStatus key={threadId} status={status} interrupting={interrupting} thinkingSince={thinkingSince} progress={progress} awaitingAnswer={!messages.at(-1)?.text} assistantName={assistantName}/>
  </div>;
}

// c4db265df rn (`N_`), on the classic path the host takes (shared-4 es `oe()` and `F("panels")` read the
// cai_curious_tower_drawn / fizzy-lake "panels" switches, both off locally, R15): a CdsSurface (elevation Nt "panel",
// data-pane-root, vf("side_pane") = data-perf-region) classed Lt, or zt when flush; the header line `ln` (shared-6 fh)
// with Oe {data-pane-corner-row}, data-top-left (leadingClearance) / data-top-right (trailingClearance), onPointerDown
// and {touchAction:"none"} when the header drags, the window-drag strip dn unless noWindowDrag, the string title Ft
// (`${ce} relative z-[1]`, ce = shared-6 vh) and the trailing row Z (`se` = shared-6 xh; c41956fd9 Xe renders nothing
// here); then the body `${Qt} rounded-b-[inherit]`. ssc-header / ssc-title are host hooks (window header CSS, scripts).
function SideChatPane({ flush = false, leadingClearance = false, trailingClearance = false, noWindowDrag = false, onHeaderPointerDown, title, trailing, children }) {
  return <CdsSurface elevation={paneElevation} data-pane-root="" data-perf-region="side_pane" className={flush ? paneFlushRootClass : paneRootClass} style={PANE_STYLE}>
    <div data-top-left={leadingClearance || undefined} data-top-right={trailingClearance || undefined} data-pane-corner-row="" className={`ssc-header ${paneHeaderLineClass}`}
      onPointerDown={onHeaderPointerDown} onMouseDown={paneHeaderMouseDown} style={onHeaderPointerDown ? { touchAction: 'none' } : undefined}>
      {!noWindowDrag && <div className="draggable absolute inset-0 -z-[1]" aria-hidden={true}/>}
      <span className={`ssc-title ${paneTitleClass} relative z-[1]`}>{title}</span>
      <div className={paneTrailingClass}>{trailing}</div>
    </div>
    <div className={`${paneBodyClass} rounded-b-[inherit]`}>{children}</div>
  </CdsSurface>;
}

/**
 * @param {{threadId: string|null, open: boolean, onClose: () => void, rpc: Function,
 *   assistantName?: string, pending?: string|null, onPendingTaken?: () => void}} props
 */
// B27 (cccc2cf0a kT/AT, cd377abb5 _i): onPopOut — the floating panel's WindowNew "Open in new window" (onDetach), called
// with the panel's rect in screen points; windowed — the panel fills a side chat window (kT onReattach branch:
// epitaxy-pane-window with the title, the trailing actions, Open in main window and Keep window on top), where
// windowControls is { onDock, alwaysOnTop, onTogglePin }.
export function SourceSideChat({ threadId, open, onClose, rpc, assistantName = 'Claude', pending = null, onPendingTaken, searchFiles, mentionActions, onPopOut = null, windowed = false, windowControls = null, cwd = null, onOpenFileRef = null }) {
  const state = useSyncExternalStore(sideChatStore.subscribe, () => sideChatStore.get(threadId), () => sideChatStore.get(threadId));
  // root: the floating aside (geometry, popout rect, mention portal) or the window's frame; frame: UF's focus frame U.
  const root = useRef(null), frame = useRef(null), input = useRef(null), returnFocus = useRef(null);
  const geometry = useSideChatGeometry(root, open && !windowed, threadId);
  // Current store close clears selection context, while the unsent draft survives.
  useEffect(() => { if (open) sideChatStore.markStarted(threadId); else sideChatStore.clearStagedContext(threadId); }, [open, threadId]);
  useEffect(() => () => sideChatStore.clearStagedContext(threadId), [threadId]);
  useLayoutEffect(() => { if (open && state.stagedContext !== null && state.status !== 'thinking') input.current?.focus(); }, [open, state.stagedContext]);
  // /btw <question> asks as the panel opens.
  useEffect(() => {
    if (!open || !pending || !threadId) return;
    onPendingTaken?.();
    void askSideQuestion({ rpc, threadId, question: pending });
  }, [open, pending, threadId]);
  // Focus moves in on open and back to where it was on close.
  useLayoutEffect(() => {
    const doc = frame.current?.ownerDocument ?? document;
    if (open) { returnFocus.current = doc.activeElement; input.current?.focus(); }
    else if (returnFocus.current) { const target = returnFocus.current; returnFocus.current = null; if (target?.isConnected && doc.activeElement === doc.body) target.focus(); }
  }, [open]);
  // Original kT moves focus to its frame during a response, then back to the input.
  useLayoutEffect(() => {
    if (!open || state.status !== 'thinking') return;
    const node = frame.current, active = node?.ownerDocument.activeElement;
    if (node && (!active || active === node.ownerDocument.body || node.contains(active))) node.focus({ preventScroll: true });
  }, [open, state.status]);
  const settled = state.status !== 'thinking';
  useEffect(() => {
    if (!open || !settled) return;
    const doc = frame.current?.ownerDocument ?? document;
    const active = doc.activeElement;
    if (!active || active === doc.body || active === frame.current) input.current?.focus();
  }, [open, settled]);
  if (!threadId) return null;
  const { messages, status, error } = state;
  const thinking = status === 'thinking';
  const popOut = () => {
    const rect = root.current?.getBoundingClientRect();
    const view = root.current?.ownerDocument?.defaultView ?? window;
    // AT H: the window opens over the panel (screen points: the CSS rect scaled by the page zoom).
    const ratio = view.outerWidth && view.innerWidth ? view.outerWidth / view.innerWidth : 1;
    onPopOut?.(rect ? { x: Math.round(view.screenX + rect.left * ratio), y: Math.round(view.screenY + rect.top * ratio), width: Math.round(rect.width * ratio), height: Math.round(rect.height * ratio) } : null);
  };
  // UF Ye: Clear side chat once there are turns (no tooltip of its own).
  const clear = messages.length > 0 && <CdsButton variant="ghost" iconOnly icon="Trash" aria-label={t('Clear side chat')}
    onClick={() => { clearSideChat({ rpc, threadId, keepDraft: true }); requestAnimationFrame(() => input.current?.focus()); }}/>;
  // UF Xe / Ze / nt inside `div.flex flex-col flex-1 min-h-0` (pt). Ze is one bare p with the store's error: no role, no
  // Retry, and nothing for an empty answer (CF appends whatever `response` came back and sets no error).
  const body = <div className="flex flex-col flex-1 min-h-0">
    <SideChatMessages cwd={cwd} onOpenFileRef={onOpenFileRef} assistantName={assistantName} threadId={threadId} messages={messages} status={status} interrupting={state.interrupting} thinkingSince={state.thinkingSince} progress={state.progress}/>
    {error && <p className="px-lg pb-1.25 text-footnote text-danger select-text shrink-0">{error}</p>}
    <SideChatComposer open={open} searchFiles={searchFiles} mentions={state.draftMentions} mentionActions={{ ...mentionActions, layerBase: 440 }} portalRef={root} stagedContext={state.stagedContext} onRemoveContext={() => sideChatStore.clearStagedContext(threadId)} threadId={threadId} inputRef={input} busy={thinking} interrupting={state.interrupting} value={state.draft}
      onChange={draft => sideChatStore.setDraft(threadId, draft)} onStop={() => void stopSideQuestion({ rpc, threadId })} placeholder={messages.length ? t('Follow up…') : t('Ask a quick question…')}
      onSubmit={question => void askSideQuestion({ rpc, threadId, question, useStagedContext: true })}/>
  </div>;
  const onKeyDownCapture = event => sideChatEscape(event, { state: sideChatStore.get(threadId), onStop: () => void stopSideQuestion({ rpc, threadId }), onClose });
  if (windowed) {
    // kT onReattach: div.epitaxy-pane-window (U, tabIndex -1, data-escape-owner) > N_ flush with both clearances, title
    // "Side chat", trailing [Ye, ti (shared-18 bx: Open in main window), bi (shared-18 gx: Keep window on top)].
    const dockLabel = t('Open in main window'), pinLabel = windowControls?.alwaysOnTop ? t('Stop keeping window on top') : t('Keep window on top');
    return <div ref={node => { root.current = node; frame.current = node; }} tabIndex={-1} {...ESCAPE_OWNER} onKeyDownCapture={onKeyDownCapture}
      className="ssc-root epitaxy-pane-window flex flex-1 min-h-0 flex-col outline-none" data-windowed="" data-open={open || undefined}>
      <SideChatPane flush leadingClearance trailingClearance title={t('Side chat')} trailing={<>
        {clear}
        {windowControls?.onDock && <CdsTooltip content={dockLabel} side="bottom">
          <CdsButton variant="ghost" iconOnly icon="ArrowInSquare" aria-label={dockLabel} data-popout-dock="" onClick={windowControls.onDock}/>
        </CdsTooltip>}
        {windowControls?.onTogglePin && <CdsTooltip content={pinLabel} side="bottom">
          <CdsButton variant="ghost" iconOnly icon={windowControls.alwaysOnTop ? 'PinFilled' : 'Pin'} pressed={windowControls.alwaysOnTop === true}
            aria-label={pinLabel} data-popout-pin="" onClick={windowControls.onTogglePin}/>
        </CdsTooltip>}
      </>}>{body}</SideChatPane>
    </div>;
  }
  // cccc2cf0a qF: CdsRoot density compact (className contents) > the pointer-events-none bounds layer div.epitaxy-root
  // (which defines --chat-turn-gap for the turn list) with style {zIndex} > the aside `epitaxy-side-chat rounded-card
  // absolute max-w-full flex flex-col` + open ? "draggable-none pointer-events-auto" : "invisible", holding the resize
  // handles and KF → UF: div.flex flex-1 min-h-0 flex-col outline-none (U) > N_ floating with noWindowDrag, no trailing
  // clearance, and the header dragging the panel. ssc-root is a host hook.
  return <CdsRoot density="compact" className="contents">
    <div className="epitaxy-root text-body text-primary break-words pointer-events-none fixed inset-0" style={SIDE_CHAT_BOUNDS_STYLE}>
      <aside ref={root} aria-label={t('Side chat')} onClick={event => event.stopPropagation()} data-open={open || undefined} style={geometry.rect ?? undefined} {...geometry.pointerProps}
        className={`ssc-root epitaxy-side-chat rounded-card absolute max-w-full flex flex-col ${open ? 'draggable-none pointer-events-auto' : 'invisible'}`} inert={!open || undefined} aria-hidden={!open || undefined}>
        {sideChatResizeHandles.map(({ edges, className }) => {
          // qF M (DF.map): each handle is "draggable-none absolute z-[1]" plus its DF geometry class, styled
          // {touchAction:"none",cursor:EF(edges)}. The host keeps its own pointer drag (geometry.begin) for the original
          // vr.div pan handlers; ssc-resize/data-edge are host hooks only.
          const edge = ['n', 's', 'w', 'e'].filter(key => edges[key]).join('');
          return <div key={edge} aria-hidden="true" className={`ssc-resize draggable-none absolute z-[1] ${className}`} data-edge={edge}
            style={{ touchAction: 'none', cursor: sideChatResizeCursor(edges) }} onPointerDown={event => geometry.begin(event, edges)}/>;
        })}
        <div ref={frame} tabIndex={-1} {...ESCAPE_OWNER} onKeyDownCapture={onKeyDownCapture} className="flex flex-1 min-h-0 flex-col outline-none">
          <SideChatPane noWindowDrag onHeaderPointerDown={event => geometry.begin(event)}
            title={t(thinking && state.progress?.stage === 'forking' ? 'Forking…' : 'Side chat')} trailing={<>
              {clear}
              {/* A streaming answer belongs to this window's request (side-chat-store exportThread): the side chat moves
                  to its own window once it has settled. */}
              {onPopOut && !thinking && <CdsTooltip content={t('Open in new window')}>
                <CdsButton variant="ghost" iconOnly icon="WindowNew" aria-label={t('Open in new window')} data-side-chat-popout="" onClick={popOut}/>
              </CdsTooltip>}
              <CdsButton variant="ghost" iconOnly icon="X" aria-label={t('Close side chat')} shortcut={SIDE_CHAT_KEYS} onClick={onClose}/>
            </>}>{body}</SideChatPane>
        </div>
      </aside>
    </div>
  </CdsRoot>;
}
