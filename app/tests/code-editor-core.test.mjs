import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {EditorState,Compartment,history,undo,redo,highlightWhitespace,scrollPastEnd,lineNumbers} from '../src/code-editor-core.mjs';
import {EditorView,EditorSelection,Decoration,ViewPlugin,keymap,defaultKeymap,historyKeymap,Transaction,indentUnit,undoDepth,redoDepth,findClusterBreak} from '../src/code-editor-core.mjs';

test('extracted editor bytes match the installed-reference snapshot and contain only the declared vendor dependency',async()=>{
 const root=path.resolve(import.meta.dirname,'..');
 const dir=path.join(root,'src/generated/code-editor-current');
 const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json')));
 assert.equal(manifest.referenceVersion,'2.42304.0');
 for(const entry of manifest.modules){
  const generated=await fs.readFile(path.join(dir,entry.name));
  const reference=await fs.readFile(path.join(root,'../reference/installed-2.42304.0-20261017/ion-dist/assets/v1',entry.name));
  assert.deepEqual(generated,reference);assert.equal(createHash('sha256').update(generated).digest('hex'),entry.sha256);
 }
 assert.equal(manifest.modules[0].name,'c148e7537-BbnhrJJt.js');
 assert.match(manifest.modules[0].imports[0], /^\.\/vendor-prosemirror-/);
 assert.equal(manifest.modules.length,28);
 // The directory is generator-owned: only manifest entries, the five adapters and the manifest itself.
 const expected=new Set(['manifest.json',...manifest.modules.map(entry=>entry.name),...manifest.adapters.map(entry=>entry.name)]);
 assert.deepEqual((await fs.readdir(dir)).filter(name=>!expected.has(name)),[]);
 assert.deepEqual(manifest.adapters.map(entry=>entry.name).sort(),['filename-language.mjs','keyboard-repeat.mjs','newlines.mjs','theme.mjs','wrapper.mjs']);
 assert.deepEqual(manifest.adapters.find(entry=>entry.name==='filename-language.mjs').sources.map(source=>source.name),['c8a544a8c-CD0GHG_t.js']);
});
test('core exports keep their CodeMirror identities across the 2.42304.0 export renames',()=>{
 assert.equal(typeof EditorView.theme,'function');assert.equal(typeof EditorState.create,'function');
 assert.equal(typeof keymap.of,'function');assert.equal(typeof Decoration.mark,'function');assert.equal(typeof ViewPlugin.fromClass,'function');
 assert.ok(defaultKeymap.some(binding=>binding.key==='Mod-a'));assert.ok(historyKeymap.some(binding=>binding.key==='Mod-z'));
 assert.equal(typeof Transaction.addToHistory.of,'function');assert.equal(typeof EditorSelection.cursor,'function');
 const state=EditorState.create({doc:'x\n  y',extensions:[indentUnit.of('\t')]});
 assert.equal(state.facet(indentUnit),'\t');assert.equal(undoDepth(state),0);assert.equal(redoDepth(state),0);
 assert.equal(findClusterBreak('a😀b',1),3);
});
test('original CodeMirror state preserves edits, undo/redo and live tab-size reconfiguration',()=>{
 const tabSize=new Compartment();let state=EditorState.create({doc:'\talpha\n',extensions:[history(),tabSize.of(EditorState.tabSize.of(4)),highlightWhitespace(),scrollPastEnd(),lineNumbers()]});
 const dispatch=transaction=>{state=transaction.state;};
 dispatch(state.update({changes:{from:1,to:6,insert:'beta'},userEvent:'input'}));assert.equal(state.doc.toString(),'\tbeta\n');
 assert.equal(undo({state,dispatch}),true);assert.equal(state.doc.toString(),'\talpha\n');
 assert.equal(redo({state,dispatch}),true);assert.equal(state.doc.toString(),'\tbeta\n');
 dispatch(state.update({effects:tabSize.reconfigure(EditorState.tabSize.of(8))}));assert.equal(state.tabSize,8);
 assert.equal(state.doc.toString(),'\tbeta\n');
});
