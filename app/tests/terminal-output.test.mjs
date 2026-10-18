import test from 'node:test';
import assert from 'node:assert/strict';
// 2.42304.0 c6bf19e8f In..$n (generated/code-current, R3-terminal FT-03; identical to the 2.31226.0 kn..Kn).
import {attachVisibleTerminalOutput,terminalSelectionText} from '../src/generated/code-current/terminal-output.mjs';

function fixture({selection='',visible='viewport output\n\n',viewportY=20,cols=80,rows=10,wrapped=[]}={}) {
 const calls=[];
 const term={cols,rows,buffer:{active:{viewportY,getLine:i=>({isWrapped:wrapped.includes(i)})}},
  hasSelection:()=>selection.length>0,getSelection:()=>selection,
  selectLines:(start,end)=>{calls.push(['select',start,end]);selection=visible;},
  clearSelection:()=>{calls.push(['clear']);selection='';}};
 return {term,calls,attach:text=>calls.push(['attach',text,term.hasSelection()])};
}
test('selected text takes priority over viewport and clears before callback',()=>{
 const f=fixture({selection:'chosen text  \r\n\r\n'});
 assert.equal(attachVisibleTerminalOutput(f.term,f.attach),true);
 assert.deepEqual(f.calls,[['clear'],['attach','chosen text  ',false]]);
});
test('no selection attaches exactly viewport rows, including a scrolled-back viewport',()=>{
 const f=fixture();assert.equal(attachVisibleTerminalOutput(f.term,f.attach),true);
 assert.deepEqual(f.calls,[['select',20,29],['clear'],['attach','viewport output',false]]);
});
test('wrapped replay banner at buffer start is included then stripped, unrelated wraps are not backtracked',()=>{
 const f=fixture({cols:20,viewportY:2,wrapped:[1,2],visible:'[shell reconnected — replaying buffered output]\r\nreal output\r\n'});
 attachVisibleTerminalOutput(f.term,f.attach);
 assert.deepEqual(f.calls,[['select',0,11],['clear'],['attach','real output',false]]);
 const later=fixture({cols:20,viewportY:5,wrapped:[4,5]});attachVisibleTerminalOutput(later.term,later.attach);
 assert.deepEqual(later.calls[0],['select',5,14]);
});
test('blank output clears only a synthesized selection; whitespace selection stays intact',()=>{
 const blank=fixture({visible:'  \n  '});assert.equal(attachVisibleTerminalOutput(blank.term,blank.attach),false);
 assert.deepEqual(blank.calls,[['select',20,29],['clear']]);
 const selected=fixture({selection:'  '});assert.equal(attachVisibleTerminalOutput(selected.term,selected.attach),false);
 assert.deepEqual(selected.calls,[]);assert.equal(selected.term.hasSelection(),true);
});
test('missing callback preserves user selection and removes temporary viewport selection',()=>{
 const selected=fixture({selection:'chosen'});assert.equal(attachVisibleTerminalOutput(selected.term,null),false);
 assert.equal(selected.term.getSelection(),'chosen');assert.deepEqual(selected.calls,[]);
 const visible=fixture();assert.equal(attachVisibleTerminalOutput(visible.term,null),false);
 assert.deepEqual(visible.calls,[['select',20,29],['clear']]);
});
test('banner alone remains meaningful; normalization preserves leading indentation and meaningful blank lines',()=>{
 const banner='[shell reconnected — replaying buffered output]';
 assert.equal(terminalSelectionText(banner+'\n\n'),banner);
 assert.equal(terminalSelectionText('  a\n\n  b  \n\n'),'  a\n\n  b  ');
});
