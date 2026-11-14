import test from 'node:test';import assert from 'node:assert/strict';
import {runTerminalFind,terminalFindKey,dispatchTerminalFind} from '../src/terminal-find-model.mjs';
test('search resets before backwards edit, skips empty query, and suppresses programmatic selection',()=>{
 const calls=[],selecting={current:false};const view={term:{clearSelection:()=>calls.push(['clear',selecting.current])},search:{findPrevious:q=>{calls.push(['previous',q,selecting.current]);return true;},findNext:q=>{calls.push(['next',q,selecting.current]);return false;}}};
 assert.equal(runTerminalFind(view,'word','previous',true,selecting),true);
 assert.deepEqual(calls,[['clear',true],['previous','word',true]]);assert.equal(selecting.current,false);
 assert.equal(runTerminalFind(view,'','previous',true,selecting),false);assert.equal(calls.length,3);
 assert.equal(runTerminalFind(view,'missing','next',false,selecting),false);assert.equal(calls.length,4);
 view.search.findNext=()=>{throw Error('addon failure')};assert.throws(()=>runTerminalFind(view,'x','next',false,selecting));assert.equal(selecting.current,false);
});
test('terminal Enter directions differ from transcript and respect IME composition',()=>{
 assert.equal(terminalFindKey({key:'Enter'}),'previous');assert.equal(terminalFindKey({key:'Enter',shiftKey:true}),'next');
 assert.equal(terminalFindKey({code:'KeyG',metaKey:true}),'next');assert.equal(terminalFindKey({code:'KeyG',metaKey:true,shiftKey:true}),'previous');
 assert.equal(terminalFindKey({key:'Escape',isComposing:true}),null);assert.equal(terminalFindKey({key:'Enter',keyCode:229}),null);
 assert.equal(terminalFindKey({code:'KeyF',metaKey:true}),'focus');
});
test('native menu routing only consumes handled commands in the focused terminal',()=>{
 const pane=new EventTarget(),doc={activeElement:{closest:()=>pane}};assert.equal(dispatchTerminalFind('find-open',true,doc),false);
 pane.addEventListener('terminal-find-command',event=>{assert.equal(event.detail.kind,'find-step');assert.equal(event.detail.forward,false);event.preventDefault();});
 assert.equal(dispatchTerminalFind('find-step',false,doc),true);assert.equal(dispatchTerminalFind('find-open',true,{activeElement:null}),false);
});
