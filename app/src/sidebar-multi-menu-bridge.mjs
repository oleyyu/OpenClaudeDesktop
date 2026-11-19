// U-29: the official Code sidebar's multi-selection menu. 4.16336.0 c39a247c4 CodeSessionRowActionsHost (Fn) publishes
// `multi` (ln(Zt(rowKey), rowKey): the selection, when it holds two or more Code rows and this one) and ce4f4374c
// EpitaxyCodeSessionMenuItems renders st for it: Pin / Unpin {count}, Mark {count} as read / unread, Move {count} to,
// Set model for {count}, Archive / Unarchive {count}, Delete {count}. Neither chunk ships, so the host gate
// (frame-sidebar-nav-session-actions.jsx) hands a multi-selection to the host's own multi menu, which the sidebar host
// (source-sidebar.jsx, slot "overlays") draws with its bulk runner. One handler at a time: the main window's sidebar.
let handler = null;

export function registerNavMultiMenu(fn) {
  handler = fn;
  return () => { if (handler === fn) handler = null; };
}

// ids: the selected Code session ids (visible order); at: { anchor, point, onSettled }. True when the menu opened.
export function openNavMultiMenu(ids, at) {
  return typeof handler === "function" ? handler(ids, at) === true : false;
}
