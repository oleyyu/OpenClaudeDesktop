import test from 'node:test';
import assert from 'node:assert/strict';
// 2.42304.0 c6bf19e8f $r..ci (generated/code-current/terminal-geometry, R3-terminal FT-03; identical to the 2.31226.0 Br..Yr).
import {terminalSelectionEndRow,terminalSelectionBox,isWholeTerminalSelection,wholeTerminalSelectionAnchor,terminalSelectionPillPosition} from '../src/generated/code-current/terminal-geometry.mjs';
import {observeTerminalSelection} from '../src/terminal-selection-controller.mjs';
function fixture(){
 const doc=new EventTarget(),element=new EventTarget();
 const screen={clientHeight:200,clientWidth:400,getBoundingClientRect:()=>({left:20,top:30})};
 element.querySelector=()=>screen;
 const root={ownerDocument:doc,getBoundingClientRect:()=>({left:10,top:10,width:500,height:240})};
 let range={start:{x:0,y:2},end:{x:0,y:4}},selected='hello',change,scroll;
 const term={element,rows:10,cols:40,buffer:{active:{viewportY:0,baseY:0,cursorY:2,cursorX:4,getLine:i=>i===2?{length:40,getCell:j=>({getChars:()=>j<4?'x':'',getWidth:()=>1})}:null}},getSelectionPosition:()=>range,getSelection:()=>selected,
 onSelectionChange:fn=>{change=fn;return {dispose:()=>change=null};},onScroll:fn=>{scroll=fn;return {dispose:()=>scroll=null};}};
 return {term,root,doc,setRange:r=>range=r,change:()=>change?.(),scroll:()=>scroll?.()};
}
test('end at column zero excludes the next empty row; geometry includes screen offset',()=>{
 const {term,root}=fixture();const range=term.getSelectionPosition();
 assert.equal(terminalSelectionEndRow(range),3);
 const box=terminalSelectionBox(term,root,100,range);
 assert.deepEqual({top:box.top,bottom:box.bottom,below:box.below},{top:60,bottom:100,below:true});
});
test('whole-buffer anchor uses last populated row and cursor, not empty screen tail',()=>{
 const {term,root}=fixture();
 assert.equal(isWholeTerminalSelection(term,{start:{x:0,y:0},end:{x:40,y:9}}),true);
 assert.equal(isWholeTerminalSelection(term,{start:{x:0,y:1},end:{x:40,y:9}}),false);
 const anchor=wholeTerminalSelectionAnchor(term,root);
 assert.equal(anchor.x,60);assert.equal(anchor.y,70);assert.equal(anchor.beside,true);
});
test('pill prefers beside for select-all; clamps to right and flips above near bottom',()=>{
 const pill={width:140,height:28},box={width:400,height:200};
 assert.deepEqual(terminalSelectionPillPosition({x:60,y:70,beside:true},pill,box),{left:138,top:84});
 assert.deepEqual(terminalSelectionPillPosition({x:390,y:180,sel:{top:160,bottom:190,below:true}},pill,box),{left:330,top:152,side:'above'});
 assert.equal(terminalSelectionPillPosition({x:100,y:80,sel:{top:60,bottom:90,below:true}},pill,box,'above').side,'above');
});
test('selection controller records mouse anchor, hides offscreen and disposes subscriptions',()=>{
 const f=fixture();let latest;const stop=observeTerminalSelection(f.term,f.root,{onChange:value=>latest=value});
 f.term.element.dispatchEvent(new Event('mousedown'));
 const release=new Event('mouseup');Object.assign(release,{clientX:100,clientY:100});f.doc.dispatchEvent(release);f.change();
 assert.equal(latest.x,90);assert.equal(latest.y,90);
 f.term.buffer.active.viewportY=5;f.scroll();assert.equal(latest.offscreen,true);
 f.term.buffer.active.viewportY=0;f.scroll();assert.equal(latest.offscreen,false);assert.equal(latest.y,90);
 stop();assert.equal(latest,null);f.change();assert.equal(latest,null);
});
test('find suppression never exposes programmatic select-all',()=>{
 const f=fixture();let latest;f.setRange({start:{x:0,y:0},end:{x:40,y:9}});
 const stop=observeTerminalSelection(f.term,f.root,{onChange:value=>latest=value,suppressed:()=>true});
 f.change();assert.equal(latest,null);stop();
});
