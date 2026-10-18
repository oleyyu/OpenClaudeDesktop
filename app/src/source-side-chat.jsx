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
import React, { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceTooltip } from './source-tooltip.jsx';
import { SourceMentionDropdown } from './source-mention-dropdown.jsx';
import { useSideChatMentions } from './use-side-chat-mentions.jsx';
import { SourceComposerEditor } from './source-composer-editor.jsx';
import './source-composer.css';
import { SourceComposerAttachments } from './source-composer-attachments.jsx';
import { makeSnippet } from './composer-attachments-model.mjs';
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
// Current kT/lo disables input while answering; Escape and the stop control interrupt.
function SideChatComposer({ threadId, busy, interrupting, value, onChange, placeholder, onSubmit, onStop, inputRef, stagedContext, onRemoveContext, open, searchFiles, mentions, mentionActions, portalRef }) {
  const suggest = useSideChatMentions({ inputRef, searchFiles, scope: threadId, enabled: open && !busy, onPick: option => sideChatStore.rememberMention(threadId, option) });
  const submit = () => { const text = value.trim(); if (!text || busy) return; onChange(''); onSubmit(text); };
  return <div className="ssc-composer" data-mention-open={suggest.open || undefined}>
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

function SideChatUserMessage({ text }) {
  const { snippets, rest } = parseSideChatQuestion(text);
  return <div className="ssc-user-body">
    <SourceComposerAttachments previewLayerBase={440} entries={snippets.map((snippet, index) => makeSnippet(maskSecrets(snippet.text), { id: `side-context-${index}` })).filter(Boolean)}/>
    {rest && <div className="ssc-user-message" data-cds="UserMessage"><div className="ssc-user-bubble"><SourceSideChatUserContent text={rest}/></div></div>}
  </div>;
}

function SideChatMessages({ threadId, messages, status, interrupting, thinkingSince, progress, assistantName }) {
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
  if (!messages.length) return <div className="ssc-empty"><p>{t('Chat about this session without touching the main thread. {assistant} sees the full context, and nothing here is added to the session.', { assistant: assistantName })}</p></div>;
  const streamingIndex = status === 'thinking' && shown.at(-1)?.role === 'assistant' ? shown.length - 1 : -1;
  return <div ref={list} className="ssc-messages">
    {shown.map((message, index) => message.role === 'user'
      ? <div key={index} className="ssc-user epitaxy-user-turn"><SideChatUserMessage text={message.text}/></div>
      : <div key={index} className="ssc-answer">
        {message.text ? <div className="ssc-answer-text"><SourceMarkdown text={message.text} isStreaming={index === streamingIndex} sessionKey={`btw-${threadId}`} itemId={`btw-${index}`}/></div> : null}

      </div>)}
    <SourceSideChatStatus key={threadId} status={status} interrupting={interrupting} thinkingSince={thinkingSince} progress={progress} awaitingAnswer={!messages.at(-1)?.text} assistantName={assistantName}/>
  </div>;
}

/**
 * @param {{threadId: string|null, open: boolean, onClose: () => void, rpc: Function,
 *   assistantName?: string, pending?: string|null, onPendingTaken?: () => void}} props
 */
// B27 (cccc2cf0a kT/AT, cd377abb5 _i): onPopOut — the floating panel's WindowNew "Open in new window" (onDetach), called
// with the panel's rect in screen points; windowed — the panel fills a side chat window (kT onReattach branch:
// epitaxy-pane-window with the title, the trailing actions, Open in main window and Keep window on top), where
// windowControls is { onDock, alwaysOnTop, onTogglePin }.
export function SourceSideChat({ threadId, open, onClose, rpc, assistantName = 'Claude', pending = null, onPendingTaken, searchFiles, mentionActions, onPopOut = null, windowed = false, windowControls = null }) {
  const state = useSyncExternalStore(sideChatStore.subscribe, () => sideChatStore.get(threadId), () => sideChatStore.get(threadId));
  const root = useRef(null), input = useRef(null), returnFocus = useRef(null);
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
    const doc = root.current?.ownerDocument ?? document;
    if (open) { returnFocus.current = doc.activeElement; input.current?.focus(); }
    else if (returnFocus.current) { const target = returnFocus.current; returnFocus.current = null; if (target?.isConnected && doc.activeElement === doc.body) target.focus(); }
  }, [open]);
  // Original kT moves focus to its frame during a response, then back to the input.
  useLayoutEffect(() => {
    if (!open || state.status !== 'thinking') return;
    const frame = root.current, active = frame?.ownerDocument.activeElement;
    if (frame && (!active || active === frame.ownerDocument.body || frame.contains(active))) frame.focus({ preventScroll: true });
  }, [open, state.status]);
  const settled = state.status !== 'thinking';
  useEffect(() => {
    if (!open || !settled) return;
    const doc = root.current?.ownerDocument ?? document;
    const active = doc.activeElement;
    if (!active || active === doc.body || active === root.current) input.current?.focus();
  }, [open, settled]);
  if (!threadId) return null;
  const { messages, status, error, retry } = state;
  const thinking = status === 'thinking';
  // A question that got no answer stays in the list; an empty answer with no error still says so.
  const failure = error ?? (!thinking && retry ? t('No answer came back.') : null);
  const popOut = () => {
    const rect = root.current?.getBoundingClientRect();
    const view = root.current?.ownerDocument?.defaultView ?? window;
    // AT H: the window opens over the panel (screen points: the CSS rect scaled by the page zoom).
    const ratio = view.outerWidth && view.innerWidth ? view.outerWidth / view.innerWidth : 1;
    onPopOut?.(rect ? { x: Math.round(view.screenX + rect.left * ratio), y: Math.round(view.screenY + rect.top * ratio), width: Math.round(rect.width * ratio), height: Math.round(rect.height * ratio) } : null);
  };
  return <aside ref={root} tabIndex={-1} className="ssc-root cds-root" data-density="compact" data-windowed={windowed || undefined} style={windowed ? undefined : geometry.rect ?? undefined} {...(windowed ? {} : geometry.pointerProps)} onClick={event => event.stopPropagation()} aria-label={t('Side chat')} data-open={open || undefined} inert={!open || undefined} aria-hidden={!open || undefined}
    onKeyDownCapture={event => sideChatEscape(event, { state: sideChatStore.get(threadId), onStop: () => void stopSideQuestion({ rpc, threadId }), onClose })}>
    {!windowed && sideChatResizeHandles.map(({ edges, className }) => {
      // cccc2cf0a-B0D--VZp (2.42304.0) ck.map: each handle is "draggable-none absolute z-[1]" plus its ck
      // geometry class, styled {touchAction:"none",cursor:sk(edges)}. The host keeps its own pointer
      // drag (geometry.begin) for the original kn.div pan handlers; ssc-resize/data-edge are host hooks only.
      const edge = ['n', 's', 'w', 'e'].filter(key => edges[key]).join('');
      return <div key={edge} aria-hidden="true" className={`ssc-resize draggable-none absolute z-[1] ${className}`} data-edge={edge}
        style={{ touchAction: 'none', cursor: sideChatResizeCursor(edges) }} onPointerDown={event => geometry.begin(event, edges)}/>;
    })}
    <div className="ssc-content">
    <header className="ssc-header" onPointerDown={windowed ? undefined : event => geometry.begin(event)}>
      <span className="ssc-title">{t(!windowed && thinking && state.progress?.stage === 'forking' ? 'Forking…' : 'Side chat')}</span>
      {messages.length > 0 && <SourceSettingsButton variant="ghost" size="sm" icon="Trash" iconSize={16} iconOnly aria-label={t('Clear side chat')}
        onClick={() => { clearSideChat({ rpc, threadId, keepDraft: true }); requestAnimationFrame(() => input.current?.focus()); }}/>}
      {windowed ? <>
        {windowControls?.onDock && <SourceTooltip content={t('Open in main window')}>
          <SourceSettingsButton variant="ghost" size="sm" icon="ArrowInSquare" iconSize={16} iconOnly aria-label={t('Open in main window')} data-popout-dock="" onClick={windowControls.onDock}/>
        </SourceTooltip>}
        {windowControls?.onTogglePin && <SourceTooltip content={windowControls.alwaysOnTop ? t('Stop keeping window on top') : t('Keep window on top')}>
          <SourceSettingsButton variant="ghost" size="sm" icon={windowControls.alwaysOnTop ? 'PinFilled' : 'Pin'} iconSize={16} iconOnly aria-pressed={windowControls.alwaysOnTop === true}
            aria-label={windowControls.alwaysOnTop ? t('Stop keeping window on top') : t('Keep window on top')} data-popout-pin="" onClick={windowControls.onTogglePin}/>
        </SourceTooltip>}
      </> : <>
        {/* A streaming answer belongs to this window's request (side-chat-store exportThread): the side chat moves
            to its own window once it has settled. */}
        {onPopOut && !thinking && <SourceTooltip content={t('Open in new window')}>
          <SourceSettingsButton variant="ghost" size="sm" icon="WindowNew" iconSize={16} iconOnly aria-label={t('Open in new window')} data-side-chat-popout="" onClick={popOut}/>
        </SourceTooltip>}
        <SourceTooltip content={t('Close side chat')} shortcut={SIDE_CHAT_KEYS}>
          <SourceSettingsButton variant="ghost" size="sm" icon="X" iconSize={16} iconOnly aria-label={t('Close side chat')} onClick={onClose}/>
        </SourceTooltip>
      </>}
    </header>
    <SideChatMessages assistantName={assistantName} threadId={threadId} messages={messages} status={status} interrupting={state.interrupting} thinkingSince={state.thinkingSince} progress={state.progress}/>
    {failure && <div className="ssc-error-row">
      <p role="alert" className="ssc-error">{failure}</p>
      {retry && <SourceSettingsButton variant="ghost" size="sm" icon="ArrowClockwise" iconSize={16}
        onClick={() => void askSideQuestion({ rpc, threadId, question: retry })}>{t('Retry')}</SourceSettingsButton>}
    </div>}
    <SideChatComposer open={open} searchFiles={searchFiles} mentions={state.draftMentions} mentionActions={{ ...mentionActions, layerBase: 440 }} portalRef={root} stagedContext={state.stagedContext} onRemoveContext={() => sideChatStore.clearStagedContext(threadId)} threadId={threadId} inputRef={input} busy={thinking} interrupting={state.interrupting} value={state.draft}
      onChange={draft => sideChatStore.setDraft(threadId, draft)} onStop={() => void stopSideQuestion({ rpc, threadId })} placeholder={messages.length ? t('Follow up…') : t('Ask a quick question…')}
      onSubmit={question => void askSideQuestion({ rpc, threadId, question, useStagedContext: true })}/>
    </div>
  </aside>;
}
