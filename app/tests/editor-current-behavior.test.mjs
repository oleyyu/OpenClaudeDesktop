import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState, EditorSelection, history, Transaction, undoDepth, foldEffect, codeFoldingState, foldedRanges} from '../src/code-editor-core.mjs';
import {copyLines, selectedEditorContext, lineIndentLevels, activeIndentBlock, indentGradient, detectedIndentation, externalEditorChange, resolveEditorLanguage, loadEditorLanguage, codeFolding} from '../src/generated/code-editor-current/wrapper.mjs';
import {editorTheme, editorThemePalette} from '../src/generated/code-editor-current/theme.mjs';
// CodeMirror theme extensions carry StyleModule rules; collect them without a DOM.
const themeRules = extension => {
  if (Array.isArray(extension)) return extension.flatMap(themeRules);
  if (Array.isArray(extension?.rules)) return extension.rules;
  return extension && typeof extension === 'object' && 'value' in extension ? themeRules(extension.value) : [];
};
import {suppressEscapeRepeat, suppressKeyRepeat} from '../src/generated/code-editor-current/keyboard-repeat.mjs';

test('current copy-lines merges adjacent selections and preserves both caret positions', () => {
  for(const above of [true,false]) {
    let state=EditorState.create({doc:'one\ntwo\nthree',selection:EditorSelection.create([EditorSelection.cursor(1),EditorSelection.cursor(5)]),extensions:[EditorState.allowMultipleSelections.of(true),history()]});
    let transaction;
    assert.equal(copyLines(above)({state,dispatch:tr=>{transaction=tr;state=tr.state;}}),true);
    assert.equal(state.doc.toString(),'one\ntwo\none\ntwo\nthree');
    assert.deepEqual(state.selection.ranges.map(r=>r.head),above?[9,13]:[1,5]);
    assert.equal(transaction.isUserEvent('input.copyline'),true);
    assert.equal(undoDepth(state),1);
  }
  const state=EditorState.create({doc:'locked',extensions:[EditorState.readOnly.of(true)]});
  assert.equal(copyLines(true)({state,dispatch:()=>assert.fail('read-only edit')}),false);
});
test('attachment chooses a nonblank selected group when the primary group is only whitespace', () => {
  const state=EditorState.create({doc:'   \n\nhello\nworld',selection:EditorSelection.create([EditorSelection.range(0,3),EditorSelection.range(5,10)],0),extensions:[EditorState.allowMultipleSelections.of(true)]});
  assert.deepEqual(selectedEditorContext(state),{text:'hello',range:{fromLine:3,toLine:3}});
  assert.equal(selectedEditorContext(EditorState.create({doc:' \n ',selection:{anchor:0,head:3}})),null);
});
test('active indent guides track the enclosing block and use distinct active/inactive colors', () => {
  const state=EditorState.create({doc:'root\n  a\n    b\n  c\nend',extensions:[detectedIndentation(true,'outline.txt')]});
  const levels=lineIndentLevels(state);
  assert.deepEqual([1,2,3,4,5].map(levels),[0,1,2,1,0]);
  assert.deepEqual(activeIndentBlock(levels,3,1,5,null),{first:3,last:3,level:2});
  assert.deepEqual(activeIndentBlock(levels,1,1,5,null),{first:2,last:4,level:1});
  assert.match(indentGradient(2,2,2),/currentColor 14%/);
  assert.match(indentGradient(2,2,2),/currentColor 40%/);
});
test('external edits use a small change range, preserve selection, and reveal intersecting folds', () => {
  let state=EditorState.create({doc:'a {\n  old\n}\nend',selection:{anchor:13},extensions:[history(),codeFoldingState()]});
  state=state.update({effects:foldEffect.of({from:6,to:9})}).state;
  assert.equal(foldedRanges(state).size,1);
  const view={get state(){return state;},dispatch:tr=>{state=state.update(tr).state;}};
  const changes=externalEditorChange(view,'a {\n  new value\n}\nend');
  assert.equal(changes.from,6);assert.equal(changes.to,9);
  assert.equal(foldedRanges(state).size,0);
  state=state.update({changes,annotations:Transaction.addToHistory.of(false)}).state;
  assert.equal(state.doc.toString(),'a {\n  new value\n}\nend');
  assert.equal(state.selection.main.head,19);
  assert.equal(undoDepth(state),0);
});
test('current grammars include dotenv, configuration, ignore files, and diff/patch', async () => {
  for(const filename of ['.env','local.cfg','change.diff','fix.patch','.assetsignore','.git-blame-ignore-revs','.vercelignore','.gitattributes']) {
    assert.equal(typeof resolveEditorLanguage(filename).loader,'function',filename);
    const grammar=await loadEditorLanguage(filename);
    assert.ok(grammar?.language,filename);
    assert.doesNotThrow(()=>EditorState.create({doc:'A=value\n',extensions:[grammar]}));
  }
});
test('theme respects active guide overrides and official fallback selection colors', () => {
  const palette=editorThemePalette({type:'dark',colors:{'editor.foreground':'#fff','editorIndentGuide.background1':'#123','editorIndentGuide.activeBackground1':'#abc'}});
  assert.equal(palette.indentGuide,'#123');assert.equal(palette.indentGuideActive,'#abc');
  assert.equal(palette.selection,'#0099ff4d');assert.equal(palette.activeLine,'#ffffff0d');
});
test('2.42304.0 theme tokens are literal CDS variables: fold placeholder pad and gutter cursor', () => {
  const editorRules=themeRules(editorTheme({type:'light',colors:{'editor.foreground':'#111'}})).join('\n');
  assert.match(editorRules,/\.cm-foldPlaceholder[^}]*padding: 0 var\(--cds-pad-xs\)/);
  assert.doesNotMatch(editorRules,/--cds-pad-xs, 4px/);
  const foldingRules=themeRules(codeFolding(true,{formatMessage:({defaultMessage})=>defaultMessage})).join('\n');
  assert.match(foldingRules,/\.cm-foldGutter span[^}]*cursor: var\(--cds-cursor-interactive\)/);
  assert.match(foldingRules,/\.cm-foldPlaceholder[^}]*cursor: var\(--cds-cursor-interactive\)/);
});
test('Escape/Enter suppression consumes held repeats and releases on keyup or another key', () => {
  // Browser capture-phase semantics (Node's EventTarget has different boolean removal behavior).
  const listeners=new Map();
  const target={addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},dispatchEvent(event){for(const fn of [...(listeners.get(event.type)??[])])fn(event);}};
  const key=(type,key,repeat=false)=>Object.assign(new Event(type,{cancelable:true}),{key,repeat});
  for (const pressed of ['Escape', 'Enter']) {
  const suppress=()=>pressed==='Escape'?suppressEscapeRepeat(target):suppressKeyRepeat(pressed,target);
  suppress();
  const held=key('keydown',pressed,true);target.dispatchEvent(held);assert.equal(held.defaultPrevented,true);
  target.dispatchEvent(key('keyup',pressed));
  const released=key('keydown',pressed,true);target.dispatchEvent(released);assert.equal(released.defaultPrevented,false);
  suppress();target.dispatchEvent(key('keydown','a'));
  const later=key('keydown',pressed,true);target.dispatchEvent(later);assert.equal(later.defaultPrevented,false);
  }
});
