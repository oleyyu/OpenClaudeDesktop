import {terminalSelectionText} from './generated/code-current/terminal-output.mjs';
// 2.31226.0 c6bf19e8f Lr: let the window session cycler handle Ctrl+Tab;
// copy selected text without allowing Ctrl+Shift+C to interrupt a shell command.
export function routeTerminalKey(event,term,writeText) {
 if(event.type!=='keydown'||event.isComposing||event.keyCode===229)return null;
 if(event.key==='Tab'&&event.ctrlKey&&!event.metaKey&&!event.altKey)return 'window';
 if((event.metaKey||(event.ctrlKey&&event.shiftKey))&&event.code==='KeyC'&&term.hasSelection()){
  event.preventDefault();
  const text=terminalSelectionText(term.getSelection());
  void Promise.resolve().then(()=>writeText(text)).catch(()=>{});
  return 'copy';
 }
 return null;
}
// xterm's copy handler runs on its child first; the wrapper supplies the same
// normalized text as the keyboard and menu routes, including native Edit > Copy.
export function installTerminalCopyEvent(term,element) {
 const copy=event=>{if(term.hasSelection())event.clipboardData?.setData('text/plain',terminalSelectionText(term.getSelection()));};
 element.addEventListener('copy',copy);
 return ()=>element.removeEventListener('copy',copy);
}
