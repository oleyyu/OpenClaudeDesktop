import { useLayoutEffect, useRef, useState } from 'react';
import { sideChatGeometryStore } from './side-chat-geometry-store.mjs';
import { fitSideChat, moveSideChat, resizeSideChat, sideChatTopInset, sideChatViewport } from './side-chat-geometry.mjs';

// Host pointer capture replaces the reference's motion values/Pan handlers.
// Original Qn panelRect lives beyond the panel and persists under epitaxy.sideChat.v1.
export function useSideChatGeometry(root, open, threadId) {
  const [rect, setRect] = useState(null);
  const current = useRef(null), gesture = useRef(null);
  const apply = next => { current.current = next; setRect(next); };
  const cleanup = () => {
    const active = gesture.current;
    if (!active) return;
    gesture.current = null;
    active.doc.body.style.userSelect = active.userSelect;
    active.doc.body.style.webkitUserSelect = active.webkitUserSelect;
    if (active.target.hasPointerCapture(active.id)) active.target.releasePointerCapture(active.id);
  };
  useLayoutEffect(() => {
    if (!open || !root.current) { cleanup(); return; }
    const win = root.current.ownerDocument.defaultView;
    const fit = () => { if (!gesture.current) apply(fitSideChat(sideChatGeometryStore.get(), win)); };
    fit(); win.addEventListener('resize', fit);
    return () => { win.removeEventListener('resize', fit); cleanup(); };
  }, [open, threadId]);
  const finish = event => {
    const active = gesture.current;
    if (!active || event.pointerId !== active.id) return;
    const win = active.doc.defaultView;
    sideChatGeometryStore.set({ ...current.current, viewport: sideChatViewport(win) });
    cleanup(); apply(fitSideChat(sideChatGeometryStore.get(), win));
  };
  const begin = (event, edges = null) => {
    if (event.button !== 0 || !current.current || gesture.current) return;
    if (!edges && event.target.closest('button, input, textarea, a, [role="button"]')) return;
    event.preventDefault(); event.stopPropagation();
    const target = event.currentTarget, doc = target.ownerDocument;
    gesture.current = { id: event.pointerId, target, doc, edges, rect: current.current,
      x: event.clientX, y: event.clientY, viewport: sideChatViewport(doc.defaultView), topInset: sideChatTopInset(doc),
      userSelect: doc.body.style.userSelect, webkitUserSelect: doc.body.style.webkitUserSelect };
    doc.body.style.userSelect = 'none'; doc.body.style.webkitUserSelect = 'none';
    target.setPointerCapture(event.pointerId);
  };
  return { rect,
    pointerProps: {
      onPointerMove(event) {
        const active = gesture.current;
        if (!active || event.pointerId !== active.id) return;
        const offset = { x: event.clientX - active.x, y: event.clientY - active.y };
        apply(active.edges ? resizeSideChat(active.rect, active.edges, offset, active.viewport, active.topInset)
          : moveSideChat(active.rect, offset, active.viewport, active.topInset));
      },
      onPointerUp: finish, onPointerCancel: finish, onLostPointerCapture: finish,
    },
    begin,
  };
}
