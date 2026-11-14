import test from 'node:test';
import assert from 'node:assert/strict';
import {createFileViewSettings, FILE_VIEW_KEYS, DEFAULT_FILE_VIEW_SETTINGS, fileBehaviorMenu, fileViewMenu, scrollPastEndPadding} from '../src/file-view-settings.mjs';

function harness(seed = {}) {
  const data = new Map(Object.entries(seed)); let notify;
  const storage = {getItem:key=>data.get(key) ?? null,setItem:(key,value)=>data.set(key,value)};
  const store=createFileViewSettings({storage,subscribeStorage:listener=>{notify=listener;return()=>{notify=null;};}});
  return {store,data,storage,external:(key,value)=>{value===undefined?data.delete(key):data.set(key,value);notify({key,storageArea:storage});}};
}
test('defaults, invalid tab widths and malformed storage match source Qy/$y/ob',()=>{
 const h=harness();assert.deepEqual(h.store.getSnapshot(),DEFAULT_FILE_VIEW_SETTINGS);
 h.external(FILE_VIEW_KEYS.tabSize,'3');assert.equal(h.store.getSnapshot().tabSize,4);
 h.external(FILE_VIEW_KEYS.tabSize,'8');assert.equal(h.store.getSnapshot().tabSize,8);
 h.external(FILE_VIEW_KEYS.wordWrap,'false');assert.equal(h.store.getSnapshot().wordWrap,false);
 h.external(FILE_VIEW_KEYS.wordWrap,'{');assert.equal(h.store.getSnapshot().wordWrap,true);
 h.external(FILE_VIEW_KEYS.showWhitespace,'"true"');assert.equal(h.store.getSnapshot().showWhitespace,false);
});
test('settings survive a new store and publish changes from another window',()=>{
 const h=harness();let changes=0;const off=h.store.subscribe(()=>changes++);
 h.store.set('wordWrap',false);h.store.set('showWhitespace',true);h.store.set('scrollPastEnd',true);h.store.set('tabSize',2);
 const saved={autoSave:true,previewTabs:true,tabIndents:true,indentGuides:true,wordWrap:false,showWhitespace:true,scrollPastEnd:true,tabSize:2};assert.deepEqual(h.store.getSnapshot(),saved);
 assert.deepEqual(createFileViewSettings({storage:h.storage}).getSnapshot(),saved);
 h.store.set('tabSize',2);h.store.set('unknown',4);assert.equal(changes,4);
 h.external(FILE_VIEW_KEYS.tabSize,'8');assert.equal(changes,5);assert.equal(h.store.getSnapshot().tabSize,8);
 off();h.store.dispose();
});
test('unavailable localStorage does not prevent toggling within the current window',()=>{
 const store=createFileViewSettings({storage:{getItem(){throw Error('denied')},setItem(){throw Error('denied')}}});
 store.set('wordWrap',false);assert.equal(store.getSnapshot().wordWrap,false);
});
test('source menu order, keep-open checkboxes and 2/4/8 radio selection',()=>{
 const changes=[];const menu=fileViewMenu(DEFAULT_FILE_VIEW_SETTINGS,(...args)=>changes.push(args));
 assert.deepEqual(menu.items.map(x=>x.label),['Word wrap','Indent guides','Show whitespace','Scroll past end','Tab size']);
 assert.ok(menu.items.slice(0,4).every(x=>x.checkedRole==='checkbox'&&x.keepOpen));
 assert.deepEqual(menu.items[4].items.map(x=>[x.label,x.checked,x.checkedRole]),[['2',false,'radio'],['4',true,'radio'],['8',false,'radio']]);
 menu.items[0].onSelect();menu.items[4].items[2].onSelect();assert.deepEqual(changes,[['wordWrap',false],['tabSize',8]]);
});
test('scroll-past-end padding follows the bundled CodeMirror plugin',()=>{
 assert.equal(scrollPastEndPadding(600,20,8),571.5);assert.equal(scrollPastEndPadding(10,20,8),0);
});

test('preview tabs default on, survive restart, and expose a keep-open behavior checkbox',()=>{
 const h=harness();const item=fileBehaviorMenu(h.store.getSnapshot(),h.store.set).items[0];
 assert.equal(item.checked,true);assert.equal(item.keepOpen,true);item.onSelect();
 assert.equal(h.store.getSnapshot().previewTabs,false);
 assert.equal(createFileViewSettings({storage:h.storage}).getSnapshot().previewTabs,false);
});

 test('source-backed editing preferences default on and persist off across windows',()=>{
 const h=harness();h.store.set('tabIndents',false);h.store.set('indentGuides',false);
 const restored=createFileViewSettings({storage:h.storage});
 assert.equal(restored.getSnapshot().tabIndents,false);assert.equal(restored.getSnapshot().indentGuides,false);
 h.external(FILE_VIEW_KEYS.tabIndents,'true');assert.equal(h.store.getSnapshot().tabIndents,true);
 const item=fileBehaviorMenu(h.store.getSnapshot(),h.store.set).items[2];assert.equal(item.label,'Tab key indents');item.onSelect();assert.equal(h.store.getSnapshot().tabIndents,false);
 });
