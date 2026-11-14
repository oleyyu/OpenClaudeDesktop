import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorState, EditorSelection, EditorView, history } from '../src/code-editor-core.mjs';
import { editorCopyInfo, rememberEditorCopy, pasteInEditor, runEditorCommand, editorMenuItems, editorCaret, parseEditorLocation, editorLocation, editorSelectedContext, fileSelectionLabel, goToLineShortcut } from '../src/file-editor-commands.mjs';
import { makeSnippet, snippetText } from '../src/composer-attachments-model.mjs';
function view(doc, selection = { anchor: 0 }, extensions = []) {
  const view = { state: EditorState.create({ doc, selection, extensions: [history(), EditorState.allowMultipleSelections.of(true), ...extensions] }), focus() {} };
  view.dispatch = (...changes) => { view.state = view.state.update(...changes).state; };
  return view;
}
test('original context menu order and history enablement', async () => {
  const v = view('abc');
  assert.deepEqual(editorMenuItems(v.state).map(item => item.separator ? '|' : item.label), ['Undo','Redo','|','Cut','Copy','Paste','|','Select all']);
  assert.equal(editorMenuItems(v.state)[0].disabled, true);
  v.dispatch({ changes: { from: 3, insert: 'd' }, userEvent: 'input' });
  assert.equal(editorMenuItems(v.state)[0].disabled, false);
  await runEditorCommand(v, 'undo'); assert.equal(v.state.doc.toString(), 'abc'); assert.equal(editorMenuItems(v.state)[1].disabled, false);
  await runEditorCommand(v, 'redo'); assert.equal(v.state.doc.toString(), 'abcd');
  const readOnly = view('abc', { anchor: 0 }, [EditorState.readOnly.of(true)]);
  assert.deepEqual(editorMenuItems(readOnly.state).map(item => item.label ?? '|'), ['Copy','|','Select all']);
});
test('no-selection copy/cut operates on whole lines; repeated cursors on one line are deduplicated', async () => {
  const v = view('alpha\nbeta\n', EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(3), EditorSelection.cursor(7)]));
  assert.deepEqual(editorCopyInfo(v.state), { text: 'alpha\nbeta', ranges: [{from:0,to:6},{from:6,to:11}], linewise: true });
  let copied;
  await runEditorCommand(v, 'cut', { clipboard: { writeText: async text => { copied = text; } } });
  assert.equal(copied, 'alpha\nbeta'); assert.equal(v.state.doc.toString(), '');
});
test('linewise paste inserts above the caret, ordinary paste replaces the selected range', () => {
  const v = view('first\nsecond', {anchor:8});
  rememberEditorCopy({text:'copied',linewise:true}); pasteInEditor(v,'copied');
  assert.equal(v.state.doc.toString(), 'first\ncopied\nsecond'); assert.equal(v.state.selection.main.head, 15);
  v.dispatch({selection:{anchor:6,head:12}}); pasteInEditor(v, 'replacement');
  assert.equal(v.state.doc.toString(), 'first\nreplacement\nsecond');
});
test('multiple selection paste assigns one clipboard line to each selection, preserving CRLF', () => {
  const v = view('one\r\ntwo', EditorSelection.create([EditorSelection.range(0,3),EditorSelection.range(4,7)]), [EditorState.lineSeparator.of('\r\n')]);
  rememberEditorCopy({text:'not relevant',linewise:false}); pasteInEditor(v,'A\r\nB');
  assert.equal(v.state.sliceDoc(), 'A\r\nB');
});
test('async cut refuses to delete newer text and paste refuses a detached view', async () => {
  const v = view('old'); let resolve;
  const pending = runEditorCommand(v, 'cut', { clipboard: { writeText: () => new Promise(r => { resolve = r; }) } });
  v.dispatch({changes:{from:0,to:3,insert:'new'}}); resolve(); await pending; assert.equal(v.state.doc.toString(),'new');
  let alive = true;
  const paste = runEditorCommand(v,'paste',{isCurrent:()=>alive,clipboard:{readText:()=>new Promise(r=>{resolve=r;})}});
  alive=false;resolve('clipboard');await paste;assert.equal(v.state.doc.toString(),'new');
});
test('clipboard failures do not cut or change the document', async () => {
  const v=view('retain');
  await assert.rejects(runEditorCommand(v,'cut',{clipboard:{writeText:async()=>{throw Error('denied');}}}),/denied/);
  assert.equal(v.state.doc.toString(),'retain');
});
test('line:column parsing, clamping and grapheme boundaries match the original', () => {
  assert.deepEqual(parseEditorLocation(' 12 : 3 '),{line:12,column:3});
  assert.deepEqual(parseEditorLocation('0:'),{line:0,column:undefined});
  for (const text of ['', '1.2','-1','x','1:2:3']) assert.equal(parseEditorLocation(text),null);
  const v=view('first\na😀b\náz\nlast');
  assert.equal(editorLocation(v.state, 2, 3),9,'inside surrogate pair advances to the complete grapheme');
  assert.equal(editorLocation(v.state, 3, 2),13,'inside combining cluster advances past its combining mark');
  assert.equal(editorLocation(v.state, 0, 0),0);
  assert.equal(editorLocation(v.state, 999, 999),v.state.doc.length);
  v.dispatch({selection:{anchor:7}});assert.deepEqual(editorCaret(v.state),{line:2,column:2,lines:4});
  assert.equal(goToLineShortcut({key:'g',ctrlKey:true}),true);assert.equal(goToLineShortcut({key:'g',metaKey:true}),false);
  assert.equal(goToLineShortcut({key:'g',ctrlKey:true,isComposing:true}),false);
});
test('selection context uses primary contiguous block, line labels and normalized text; sent context retains origin', () => {
  const v=view('alpha\nbeta\ngamma\ndelta\n', EditorSelection.create([EditorSelection.range(0,6),EditorSelection.range(17,22)],1));
  const selected=editorSelectedContext(v.state);
  assert.deepEqual(selected,{text:'delta',fromLine:4,toLine:4});assert.equal(fileSelectionLabel('src/file.js',selected),'src/file.js:L4');
  const snippet=makeSnippet(selected.text,{label:'src/file.js:L4',sourceFile:'src/file.js:L4'});
  assert.equal(snippet.label,'src/file.js:L4');assert.equal(snippetText([snippet]),'> src/file.js:L4\n>\n> delta\n\n');
});
