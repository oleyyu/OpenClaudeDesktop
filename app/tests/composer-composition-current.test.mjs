import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {composerHelperPins,pinComposerHelper} from '../scripts/code-current-composer-pins.mjs';
import {EditorState,TextSelection} from 'prosemirror-state';
import {composerSchema as schema} from '../src/composer-editor-model.mjs';
import {compositionEdgePlugins,compositionEdgeKey,clearCompositionEdge,finishCompositionBeforePaste,trackComposition} from '../src/generated/code-current/composer-composition.mjs';

function fixture({plain=false,composing=false}={}) {
  const link=schema.marks.link.create({href:'https://example.com'});
  const doc=schema.node('doc',null,[schema.node('paragraph',null,[schema.text('link',plain?[]:[link]),schema.text(' next')])]);
  const [plugin]=compositionEdgePlugins();
  let state=EditorState.create({doc,selection:TextSelection.create(doc,5),plugins:[plugin]});
  const view={get state(){return state;},dispatch(tr){state=state.apply(tr);},domObserver:{flush(){}},editable:true,composing};
  return {view,plugin};
}
function chromium(fn) {
  const saved=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{vendor:'Google Inc.',userAgent:'Chrome/140'}});
  try{return fn();}finally{Object.defineProperty(globalThis,'navigator',saved);}
}
test('composition at a noninclusive link edge inserts an unmarked sentinel and removes it cleanly',()=>chromium(()=>{
  const {view,plugin}=fixture();
  assert.equal(plugin.props.handleDOMEvents.compositionstart(view,{data:''}),false);
  assert.equal(view.state.doc.textContent,'link\u200b next');
  const pos=compositionEdgeKey.getState(view.state).pos;assert.equal(pos,5);
  assert.equal(view.state.doc.nodeAt(pos).marks.length,0);
  const tr=clearCompositionEdge(view.state.tr,pos);assert.equal(tr.getMeta('addToHistory'),false);
  view.dispatch(tr);assert.equal(view.state.doc.textContent,'link next');assert.equal(compositionEdgeKey.getState(view.state).pos,null);
}));
test('ordinary text and an already active composition do not get sentinel characters',()=>chromium(()=>{
  for(const options of [{plain:true},{composing:true}]){const {view,plugin}=fixture(options);plugin.props.handleDOMEvents.compositionstart(view,{data:'中'});assert.equal(view.state.doc.textContent,'link next');}
}));
test('sentinel cleanup does not remove user text when the sentinel was overwritten',()=>{
  const {view}=fixture();const tr=clearCompositionEdge(view.state.tr,5);assert.equal(tr.doc.textContent,'link next');
});
test('paste ends composition before consuming clipboard data and keeps the selection',()=>chromium(()=>{
  const {view}=fixture({composing:true});const calls=[];
  const owner=new EventTarget();
  view.domObserver.flush=()=>calls.push('flush');
  view.dom={ownerDocument:{defaultView:owner},blur(){calls.push('blur');view.composing=false;},focus(options){assert.equal(options.preventScroll,true);calls.push('focus');}};
  trackComposition(view,{type:'compositionupdate',data:'中'});
  finishCompositionBeforePaste(view,{type:'paste'});
  assert.deepEqual(calls,['flush','blur','focus','flush']);assert.equal(view.state.selection.from,5);
}));
test('Android paste keeps native composition handling',()=>{
  const saved=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{configurable:true,value:{vendor:'Google Inc.',userAgent:'Android 16 Chrome'}});
  try{const {view}=fixture({composing:true});view.domObserver.flush=()=>assert.fail('native Android composition');finishCompositionBeforePaste(view,{type:'paste'});}finally{Object.defineProperty(globalThis,'navigator',saved);}
});

// composer-helpers-latest (w3-composer-host): both helpers are sliced from the shipped 3.6556.2 chunks (shared-28 Wb…RS,
// was 2.42304.0 Bv…Ab; shared-frame rn exported If, was en / hd), and the emitted binding lists are the closures
// code-current-composer-pins.mjs checks against those chunks.
test('3.6556.2: the composition guard and the focus capability are pinned to the shipped chunks',async()=>{
  const app=path.resolve(import.meta.dirname,'..'),reference=path.resolve(app,'../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
  const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
  const manifest=JSON.parse(readFileSync(path.join(app,'src/generated/code-current/manifest.json'),'utf8'));
  for(const [target,file] of [['composer-composition.mjs','shared-28-DNYlf4wu.js'],['composer-focus-capability.mjs','shared-frame-6jtSkIit.js']]){
    const entry=manifest.modules.find(module=>module.target===target);
    assert.equal(entry.referenceVersion,'3.6556.2',target);
    assert.equal(path.basename(entry.source),file);
    assert.equal(entry.sourceSha256,sha(readFileSync(path.join(reference,file))),target);
    const text=readFileSync(path.join(app,'src/generated/code-current',target),'utf8');
    assert.equal(entry.sha256,sha(text),target);
    assert.ok(text.startsWith('// Original Claude Desktop 3.6556.2 bindings;'),target);
    assert.deepEqual(entry.bindings,composerHelperPins[target].bindings,target);
    assert.deepEqual(await pinComposerHelper(target,reference),entry.bindings,target);
  }
  // Same 18 bindings as 2.42304.0 (Bv Vv Hv Uv Wv Gv Kv qv zv Jv Cb wb Tb Eb Db Ob kb Ab), renamed.
  assert.deepEqual(manifest.modules.find(module=>module.target==='composer-composition.mjs').bindings,['Wb','Gb','Kb','qb','Jb','Yb','Xb','Zb','Ub','Qb','jS','MS','NS','PS','FS','IS','LS','RS']);
  // shared-frame rn (exported If) closes over Zt / Qt / $t / en (2.42304.0 Jt / Yt / Xt / Zt, en exported hd).
  assert.deepEqual(manifest.modules.find(module=>module.target==='composer-focus-capability.mjs').bindings,['Zt','Qt','$t','en','rn']);
});
test('3.6556.2: the guard still debounces cleanup by 25ms (dv inlined) and recognizes history transactions (Ub, was zv)',()=>{
  const text=readFileSync(new URL('../src/generated/code-current/composer-composition.mjs',import.meta.url),'utf8');
  assert.match(text,/setTimeout\(t, 25, n\)/);
  assert.match(text,/var Ub = \(e\) => e\.getMeta\("history\$"\) !== void 0;/);
  assert.doesNotMatch(text,/\bdv\b/);
});
