import { isMacPlatform } from "./pane-keys-model.mjs";
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
// Off macOS (the find field, not the shell): Ctrl+F / Ctrl+Shift+F focus, Ctrl+G / Ctrl+Shift+G and F3 / Shift+F3 step.
export function terminalFindKey(event,{mac=isMacPlatform()}={}) {
 if (event.isComposing||event.keyCode===229) return null;
 if (event.key==='Escape') return 'close';
 const primary=mac?event.metaKey&&!event.ctrlKey:event.ctrlKey&&!event.metaKey;
 if (primary&&!event.altKey&&event.code==='KeyF') return 'focus';
 if (event.key==='Enter') return event.shiftKey?'next':'previous';
 if (primary&&!event.altKey&&event.code==='KeyG') return event.shiftKey?'previous':'next';
 if (!mac&&event.code==='F3'&&!event.ctrlKey&&!event.metaKey&&!event.altKey) return event.shiftKey?'previous':'next';
 return null;
}
// App-menu events have no DOM target; route only into the currently focused terminal pane.
export function dispatchTerminalFind(kind,forward=true,doc=globalThis.document) {
 const pane=doc?.activeElement?.closest?.('.stp-pane');if(!pane)return false;
 return !pane.dispatchEvent(new CustomEvent('terminal-find-command',{cancelable:true,detail:{kind,forward}}));
}
