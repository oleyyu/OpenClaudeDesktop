import {terminalSelectionEndRow,terminalSelectionBox,isWholeTerminalSelection,wholeTerminalSelectionAnchor} from './generated/code-current/terminal-geometry.mjs';
// 2.42304.0 c6bf19e8f pi selection callbacks (onSelectionChange ri/oi/si/ii) and scroll anchoring, adapted to a local xterm view.
export function observeTerminalSelection(term,root,{onChange,suppressed=()=>false}) {
 let point=null,anchor=null,releaseOff=null;
 const set=value=>{anchor=value;onChange(value);};
 const refresh=()=>{
  const range=term.getSelectionPosition();
  if(suppressed()||!range||!term.getSelection().trim()){set(null);return;}
  const whole=isWholeTerminalSelection(term,range);
  const position=(whole?wholeTerminalSelectionAnchor(term,root):undefined)??(point&&{...point,sel:terminalSelectionBox(term,root,point.y,range)});
  const row=whole?range.start.y:terminalSelectionEndRow(range);
  set(position?{...position,row:row-term.buffer.active.viewportY,whole}:null);
 };
 const mouseDown=()=>{
  releaseOff?.();
  const up=event=>{releaseOff();const box=root.getBoundingClientRect();point={x:Math.min(box.width,Math.max(0,event.clientX-box.left)),y:Math.min(box.height,Math.max(0,event.clientY-box.top))};};
  releaseOff=()=>root.ownerDocument.removeEventListener('mouseup',up,true);
  root.ownerDocument.addEventListener('mouseup',up,true);
 };
 term.element.addEventListener('mousedown',mouseDown,true);
 const selection=term.onSelectionChange(refresh);
 const scroll=term.onScroll(()=>{
  if(!anchor)return;const range=term.getSelectionPosition();if(!range){set(null);return;}
  const height=(term.element.querySelector('.xterm-screen')?.clientHeight??0)/term.rows,viewport=term.buffer.active.viewportY;
  const end=terminalSelectionEndRow(range),outside=end<viewport||range.start.y>=viewport+term.rows;
  if(height<=0){if(outside&&!anchor.offscreen)set({...anchor,offscreen:true});return;}
  const row=(anchor.whole?range.start.y:end)-viewport,delta=(row-anchor.row)*height,y=anchor.y+delta,offscreen=outside||y<0||y>height*(term.rows+1);
  set({...anchor,y,row,offscreen,sel:anchor.sel&&{...anchor.sel,top:anchor.sel.top+delta,bottom:anchor.sel.bottom+delta}});
 });
 return ()=>{releaseOff?.();term.element.removeEventListener('mousedown',mouseDown,true);selection.dispose();scroll.dispose();set(null);};
}
