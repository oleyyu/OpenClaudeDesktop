import {terminalSelectionText} from './generated/code-current/terminal-output.mjs';
import {isMacPlatform} from './pane-keys-model.mjs';
// 2.31226.0 c6bf19e8f Lr: let the window session cycler handle Ctrl+Tab;
// copy selected text without allowing Ctrl+Shift+C to interrupt a shell command.
// Off macOS a plain Ctrl+C with a selection copies it (Windows Terminal / VS Code); without one it stays the shell's
// interrupt. ⌘C / Ctrl+Shift+C copy everywhere, as before.
export function routeTerminalKey(event,term,writeText,{mac=isMacPlatform()}={}) {
 if(event.type!=='keydown'||event.isComposing||event.keyCode===229)return null;
 if(event.key==='Tab'&&event.ctrlKey&&!event.metaKey&&!event.altKey)return 'window';
 const plainCtrl=!mac&&event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.shiftKey;
 if((event.metaKey||(event.ctrlKey&&event.shiftKey)||plainCtrl)&&event.code==='KeyC'&&term.hasSelection()){
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
