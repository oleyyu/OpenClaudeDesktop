// 2.42304.0 c6bf19e8f Wr and pi's mouse-up WeakRef (G/He): only a left-button release selection event may
// auto-copy; search and Select all never overwrite the clipboard. Vn normalizes the copied text.
import {terminalSelectionText} from './generated/code-current/terminal-output.mjs';
export {terminalSelectionText};
export function installTerminalCopyOnSelect(term,element,{enabled,writeText,mac=false}) {
 const document=element.ownerDocument;let cleanupGesture=null,release=null;
 const down=event=>{
  cleanupGesture?.();let primary=event.button===0&&!(mac&&event.ctrlKey);
  const cancel=()=>{primary=false;};
  const cleanup=()=>{document.removeEventListener('mouseup',up,true);document.removeEventListener('mousedown',cancel,true);cleanupGesture=null;};
  const up=event=>{cleanup();release=primary?event:null;};
  cleanupGesture=cleanup;document.addEventListener('mouseup',up,true);document.addEventListener('mousedown',cancel,true);
 };
 element.addEventListener('mousedown',down,true);
 const subscription=term.onSelectionChange(()=>{
  const event=release;release=null;
  if(!event||event.eventPhase===0||!enabled()||!term.hasSelection())return;
  const text=terminalSelectionText(term.getSelection());
  if(text.trim()!=='')void Promise.resolve().then(()=>writeText(text)).catch(()=>{});
 });
 return ()=>{cleanupGesture?.();element.removeEventListener('mousedown',down,true);subscription.dispose();};
}
