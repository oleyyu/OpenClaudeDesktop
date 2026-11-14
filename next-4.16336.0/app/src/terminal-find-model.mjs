// Claude 2.31226.0 c6bf19e8f Jt/Qr: edit searches backwards from the end;
// Enter continues backwards, Shift+Enter forwards. Search owns no result counter.
export function runTerminalFind(view, query, direction, reset, selecting) {
 if (!view) return false;
 selecting.current=true;
 try {
  if (reset) view.term.clearSelection();
  return query!==''&&(direction==='next'?view.search.findNext(query):view.search.findPrevious(query));
 } finally { selecting.current=false; }
}
export function terminalFindKey(event) {
 if (event.isComposing||event.keyCode===229) return null;
 if (event.key==='Escape') return 'close';
 if (event.metaKey&&!event.ctrlKey&&!event.altKey&&event.code==='KeyF') return 'focus';
 if (event.key==='Enter') return event.shiftKey?'next':'previous';
 if (event.metaKey&&!event.ctrlKey&&!event.altKey&&event.code==='KeyG') return event.shiftKey?'previous':'next';
 return null;
}
// App-menu events have no DOM target; route only into the currently focused terminal pane.
export function dispatchTerminalFind(kind,forward=true,doc=globalThis.document) {
 const pane=doc?.activeElement?.closest?.('.stp-pane');if(!pane)return false;
 return !pane.dispatchEvent(new CustomEvent('terminal-find-command',{cancelable:true,detail:{kind,forward}}));
}
