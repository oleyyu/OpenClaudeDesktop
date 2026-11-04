// cf74bc599 lb/ub, ceb49ada3 c and cd5a31703 Eot. The original selection
// hook and context serializer are extracted; the portal/layer host is local.
import React, { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
// W14-code r6 css6-settings-button-code-callers: the selection toolbar's ghost buttons are shared-frame Uu (E41 direct import).
import { CdsButton } from './generated/view-tabs/shared-frame-6jtSkIit.js';
import { useTranscriptSelection } from './generated/code-editor/transcript-selection.mjs';
import { sideChatContextLimit, truncateSideChatContext } from './generated/code-editor/side-chat-context.mjs';
import { sideChatStore } from './side-chat-store.mjs';
import { t } from '../electron/i18n/index.mjs';

function SelectionToolbar({ range, containerRef, onHide, children }) {
  const root = useRef(null);
  useLayoutEffect(() => {
    const node = root.current, viewport = containerRef.current;
    if (!node || !viewport) return;
    const doc = viewport.ownerDocument, win = doc.defaultView;
    const initialTop = range.getBoundingClientRect().top;
    let frame = null;
    const position = () => {
      const anchor = [...range.getClientRects()].find(rect => rect.width && rect.height);
      if (!anchor || !range.startContainer.isConnected) { onHide(); return; }
      const bounds = viewport.getBoundingClientRect(), halfWidth = node.offsetWidth / 2 + 12;
      const x = Math.round(Math.min(Math.max(anchor.left + anchor.width / 2, bounds.left + halfWidth), bounds.right - halfWidth));
      const above = anchor.top - node.offsetHeight - 8;
      const y = Math.round(above >= bounds.top + 12 ? above : anchor.bottom + 8);
      node.style.transform = `translate(${x}px, ${y}px) translateX(-50%)`;
    };
    const update = () => { if (frame === null) frame = win.requestAnimationFrame(() => {
      frame = null;
      if (Math.abs(range.getBoundingClientRect().top - initialTop) > 100) onHide(); else position();
    }); };
    position();doc.addEventListener('scroll', update, { capture: true, passive: true });win.addEventListener('resize', update);
    return () => { doc.removeEventListener('scroll', update, true);win.removeEventListener('resize', update);if (frame !== null) win.cancelAnimationFrame(frame); };
  }, [range, containerRef, onHide]);
  return createPortal(<div ref={root} className="source-selection-toolbar cds-root" role="toolbar" aria-label={t('Selection actions')}>
    {children}
  </div>, containerRef.current.ownerDocument.body);
}

export function SourceTranscriptSelection({ containerRef, actions, hidden }) {
  const state = useSyncExternalStore(sideChatStore.subscribe, () => sideChatStore.get(actions?.threadId), () => sideChatStore.get(actions?.threadId));
  const canExplain = !!actions?.onSideChatContext && state.status !== 'thinking';
  const canReply = !!actions?.onAttachText;
  const selection = useTranscriptSelection(containerRef, { enabled: canExplain || canReply });
  const hide = useCallback(() => selection.hideTooltip(), [selection.hideTooltip]);
  if (!selection.range || hidden || (!canExplain && !canReply)) return null;
  return <SelectionToolbar range={selection.range} containerRef={containerRef} onHide={hide}>
    {canExplain && <CdsButton variant="ghost" onMouseDown={event => event.preventDefault()} onClick={() => {
      actions.onSideChatContext(truncateSideChatContext(selection.text, sideChatContextLimit));selection.clearSelection();
    }}>{state.started ? t('Send to side chat') : t('Start a side chat')}</CdsButton>}
    {canExplain && canReply && <span className="source-selection-divider" aria-hidden="true"/>}
    {canReply && <CdsButton variant="ghost" onMouseDown={event => event.preventDefault()} onClick={() => {
      const text = selection.text;selection.clearSelection();actions.onAttachText(text);
    }}>{t('Reply')}</CdsButton>}
  </SelectionToolbar>;
}
