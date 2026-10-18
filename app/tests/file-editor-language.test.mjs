import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorState, syntaxTree, indentUnit, history, undo } from '../src/code-editor-core.mjs';
import { foldable, getIndentation, foldEffect, codeFoldingState } from '../src/code-editor-core.mjs';
import { loadEditorLanguage, resolveEditorLanguage } from '../src/generated/code-editor-current/wrapper.mjs';
import { rememberEditorView, restoreEditorView, restoredHistory, detectedIndentation, detectIndentation, resetIndentation, insertTabIndent, bracketIndentation, bracketEnter } from '../src/generated/code-editor-current/wrapper.mjs';
import { unfoldEditorRange } from '../src/file-editor-folds.mjs';

test('every original parser family loads independently of desktop services; filename aliases resolve',async()=>{
 for(const name of ['a.tsx','a.jsonc','a.css','a.less','a.scss','a.sass','a.html','a.vue','a.xml','a.md','a.py','a.rs','a.go','a.java','a.cpp','a.sql','a.php','.bashrc','a.yaml','a.toml','Dockerfile','a.rb','a.swift','a.proto','a.lua','a.hs','a.groovy','a.properties','a.ini','a.pas','a.f90','a.scm','a.lisp','a.jinja','a.cmd','a.hcl','a.graphql','a.ps1','a.fs','a.ml','a.cs','a.kt','a.scala','a.m','a.mm','a.dart','a.glsl']) {
  const grammar=await loadEditorLanguage(name); assert.ok(grammar?.language,name);
  assert.doesNotThrow(()=>EditorState.create({doc:'sample',extensions:[grammar]}),name);
 }
 assert.equal(resolveEditorLanguage('/folder/Cargo.lock').key,'ext:toml');
 assert.equal(resolveEditorLanguage('/folder/.editorconfig').key,'ext:properties');
 assert.equal(resolveEditorLanguage('main.c++').key,'ext:cpp');
 assert.equal(await loadEditorLanguage('unknown.xyz'),null);
 assert.equal((await loadEditorLanguage('a.tsx')),(await loadEditorLanguage('b.tsx')));
});
test('real JavaScript and Python parse trees supply folds and indentation',async()=>{
 for(const [name,doc,node,indent] of [['a.js','function demo() {\n  return true;\n}\n','FunctionDeclaration',2],['a.py','def demo():\n    return True\n','FunctionDefinition',4]]) {
  const state=EditorState.create({doc,extensions:[await loadEditorLanguage(name),detectedIndentation(true,name)]});
  assert.match(syntaxTree(state).toString(),new RegExp(node));
  const first=state.doc.line(1);assert.ok(foldable(state,first.from,first.to),name);
  assert.equal(getIndentation(state,state.doc.line(2).from),indent,name);
 }
});
test('original indentation detection chooses tabs or smallest likely unit and resets on replacement',()=>{
 assert.equal(detectIndentation(['if {','    body','        nested','    end','}']),'    ');
 assert.equal(detectIndentation(['if {','\tbody','\t\tnested','}']),'\t');
 let state=EditorState.create({doc:'plain',extensions:[detectedIndentation(true,'plain.txt')]});assert.equal(state.facet(indentUnit),'  ');
 state=state.update({changes:{from:0,to:state.doc.length,insert:'block\n    body'},annotations:resetIndentation.of(true)}).state;
 assert.equal(state.facet(indentUnit),'    ');
});
test('2.42304.0 Makefile family falls back to tab indentation; detection and the disabled field stay unchanged',()=>{
 const unit=(path,doc='all:\n',enabled=true)=>EditorState.create({doc,extensions:[detectedIndentation(enabled,path)]}).facet(indentUnit);
 for(const path of ['Makefile','/repo/GNUmakefile','src/rules.mk','build.mak','C:\\repo\\Makefile']) assert.equal(unit(path),'\t',path);
 for(const path of ['a.js','Makefile.am','notes.txt']) assert.equal(unit(path),'  ',path);
 assert.equal(unit('Makefile','all:\n    echo ok\n'),'    ','detected indentation still wins over the Makefile fallback');
 assert.equal(unit('Makefile','all:\n',false),'  ','disabled detection keeps the two-space unit');
 let state=EditorState.create({doc:'all:\n    echo ok\n',extensions:[detectedIndentation(true,'Makefile')]});
 state=state.update({changes:{from:0,to:state.doc.length,insert:'all:\n'},annotations:resetIndentation.of(true)}).state;
 assert.equal(state.facet(indentUnit),'\t','an external replacement re-detects with the Makefile fallback');
});
test('Tab inserts to next indentation stop; selected lines indent together',()=>{
 let state=EditorState.create({doc:'x\n  y',selection:{anchor:1},extensions:[detectedIndentation(true,'x.txt')]});
 const dispatch=tr=>{state=tr.state;};
 assert.equal(insertTabIndent({state,dispatch}),true);assert.equal(state.doc.toString(),'x \n  y');
 state=state.update({selection:{anchor:0,head:state.doc.length}}).state;
 insertTabIndent({state,dispatch});assert.equal(state.doc.toString(),'  x \n    y');
});
test('fallback bracket Enter splits a pair, uses detected indentation, and read-only rejects it',()=>{
 let state=EditorState.create({doc:'{}',selection:{anchor:1},extensions:[detectedIndentation(true,'pair.js'),bracketIndentation(true)]});
 assert.equal(bracketEnter({state,dispatch:tr=>{state=tr.state;}}),true);
 assert.equal(state.doc.toString(),'{\n  \n}');assert.equal(state.selection.main.head,4);
 state=EditorState.create({doc:'{}',selection:{anchor:1},extensions:[EditorState.readOnly.of(true)]});
 assert.equal(bracketEnter({state,dispatch:()=>assert.fail('read only')}),false);
});
test('revealing a folded line unfolds only intersecting ranges',()=>{
 let state=EditorState.create({doc:'a {\n  b\n}\nz {\n  y\n}',extensions:[codeFoldingState()]});
 state=state.update({effects:[foldEffect.of({from:3,to:8}),foldEffect.of({from:12,to:17})]}).state;
 const effects=unfoldEditorRange(state,state.doc.line(2).from);
 assert.equal(effects.length,1);assert.deepEqual(effects[0].value,{from:3,to:8});
});

test('original bounded view cache restores history only for the same document and consumes entries',()=>{
 let state=EditorState.create({doc:'before',extensions:[history()]});
 state=state.update({changes:{from:0,to:6,insert:'after'},userEvent:'input'}).state;
 const view={state,scrollDOM:{scrollTop:0,scrollLeft:0},scrollSnapshot:()=>({saved:true})};
 rememberEditorView('cache-test',view,{});
 const cached=restoreEditorView('cache-test','after');assert.ok(cached);assert.equal(restoreEditorView('cache-test','after'),undefined);
 let restored=EditorState.create({doc:'after',selection:cached.selection,extensions:[restoredHistory(cached),history()]});
 assert.equal(undo({state:restored,dispatch:tr=>{restored=tr.state;}}),true);assert.equal(restored.doc.toString(),'before');
 rememberEditorView('cache-test',view,{});assert.equal(restoreEditorView('cache-test','external'),undefined);
 for(let n=0;n<33;n++)rememberEditorView('bounded-'+n,view,{});
 assert.equal(restoreEditorView('bounded-0','after'),undefined);assert.ok(restoreEditorView('bounded-32','after'));
});

test('the Files editor passes its file path to detectedIndentation (official Da(detectIndentation, filePath))',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../src/source-file-editor.jsx',import.meta.url),'utf8');
 assert.match(source,/detectedIndentation\(true, editor\.path\)/);
 assert.doesNotMatch(source,/detectedIndentation\(true\)/);
});
