import { sideChatRect } from './generated/code-editor/side-chat-geometry.mjs';
export { sideChatRect, sideChatResizeCursor, sideChatResizeHandles } from './generated/code-editor/side-chat-geometry.mjs';

// cccc2cf0a AT: drag constraints use the viewport; resize constraints retain a
// 16px margin. The opposite edge stays still when a minimum/maximum is reached.
export function moveSideChat(rect, offset, viewport, topInset = 0) {
  return { ...rect,
    left: Math.max(0, Math.min(rect.left + offset.x, viewport.width - rect.width)),
    top: Math.max(topInset, Math.min(rect.top + offset.y, viewport.height - rect.height)),
  };
}
export function resizeSideChat(rect, edges, offset, viewport, topInset = 0) {
  const next = { ...rect };
  const maxW = Math.max(rect.width, edges.e ? viewport.width - 16 - rect.left : rect.left + rect.width - 16);
  const maxH = Math.max(rect.height, edges.s ? viewport.height - 16 - rect.top : rect.top + rect.height - 16 - topInset);
  const width = value => Math.max(280, Math.min(maxW, value));
  const height = value => Math.max(160, Math.min(maxH, value));
  if (edges.e) next.width = width(rect.width + offset.x);
  if (edges.w) { next.width = width(rect.width - offset.x); next.left = rect.left + rect.width - next.width; }
  if (edges.s) next.height = height(rect.height + offset.y);
  if (edges.n) { next.height = height(rect.height - offset.y); next.top = rect.top + rect.height - next.height; }
  return next;
}

export function sideChatViewport(win) {
  return { width: win.innerWidth, height: win.innerHeight };
}
export function sideChatTopInset(doc) {
  return parseFloat(doc.defaultView.getComputedStyle(doc.documentElement).getPropertyValue('--desktop-titlebar-inset')) || 0;
}
export function fitSideChat(saved, win) {
  return sideChatRect({ saved, viewport: sideChatViewport(win), topInset: sideChatTopInset(win.document) });
}
