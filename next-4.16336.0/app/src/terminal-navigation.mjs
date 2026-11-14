// 2.31226.0 c6bf19e8f Qt/nn/rn and the terminal key handler. Full-screen
// alternate buffers retain their application's keys; shell editing is normal-buffer only.
export const POSIX_TERMINAL_KEYS=Object.freeze({lineStart:'\x01',lineEnd:'\x05',wordBack:'\x1bb',wordForward:'\x1bf',deleteToLineStart:'\x15'});
export const POWERSHELL_TERMINAL_KEYS=Object.freeze({lineStart:'\x1b[H',lineEnd:'\x1b[F',wordBack:'\x1b[1;5D',wordForward:'\x1b[1;5C',deleteToLineStart:'\x1b[1;5H'});
export function terminalEditingKeys(shell){return /(?:^|[\\/])(?:powershell|pwsh)\.exe$/.test(shell??'')?POWERSHELL_TERMINAL_KEYS:POSIX_TERMINAL_KEYS;}
const only=(event,key)=>['metaKey','ctrlKey','shiftKey','altKey'].every(name=>!!event[name]===(name===key));
export function handleTerminalNavigation(event,term,write,{mac=true,linux=false,shell,commands}={}){
 if(event.type!=='keydown'||event.isComposing||event.keyCode===229||term.buffer.active.type!=='normal')return false;
 const key=event.code||event.key,keys=terminalEditingKeys(shell);
 let action=null;
 if((key==='ArrowUp'||key==='ArrowDown')&&only(event,mac?'metaKey':'ctrlKey')){
  if(!commands?.scrollToCommand(key==='ArrowUp'?'previous':'next'))return false;
  event.preventDefault();return true;
 }
 if(key==='Home'||key==='End'){
  if(only(event,mac?'metaKey':linux?'shiftKey':'ctrlKey'))action=key==='Home'?'top':'bottom';
 }else if(mac&&key==='Backspace'&&only(event,'metaKey'))action='deleteToLineStart';
 else if(mac&&(key==='ArrowLeft'||key==='ArrowRight')){
  if(only(event,'metaKey'))action=key==='ArrowLeft'?'lineStart':'lineEnd';
  else if(only(event,'altKey'))action=key==='ArrowLeft'?'wordBack':'wordForward';
 }
 if(!action)return false;
 event.preventDefault();
 if(action==='top')term.scrollToTop();else if(action==='bottom')term.scrollToBottom();else {
  term.scrollToBottom();
  write(keys[action]);
 }
 return true;
}
