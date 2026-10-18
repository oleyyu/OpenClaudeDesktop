import test from 'node:test';
import assert from 'node:assert/strict';
import { createBtwPaneController, createBtwDraftStore, btwChildren, ownBtwItems, btwPaneTabs, nextBtwTab } from '../src/btw-pane-controller.mjs';
import { createTileLayoutStore } from '../src/tile-layout-store.mjs';
import { fromSpec, tileIds } from '../src/tile-layout-model.mjs';
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup(overrides = {}) {
  const events = [], timers = new Map(); let version = 1, visible = 'parent', view = null, serial = 0, children = [];
  const controller = createBtwPaneController({
    start: async p => { events.push(['start',p]); return {status:'started',sessionId:`child-${++serial}`}; },
    close: async id => { events.push(['close',id]); return {status:'archived'}; },
    send: async (...args) => { events.push(['send',...args]); }, show: (parent,id) => {view=id;events.push(['show',parent,id]);},
    hide: parent => {view=null;events.push(['hide',parent]);}, currentView: () => view,
    listChildren: () => children, isParentVisible: id => id === visible, epoch: () => version,
    registered: result => events.push(['registered',result.sessionId]), fallback: payload => events.push(['fallback',payload]),
    restoreDraft: (...args) => events.push(['restore',...args]), requestId: () => `opening-${serial}`,
    setTimer: (fn,ms) => { const id=Symbol(); timers.set(id,{fn,ms});return id; }, clearTimer: id => timers.delete(id), ...overrides });
  return {controller,events,timers, open: args => controller.open({parentId:'parent',permission:'ask',...args}),
    view: () => view, navigate: id => {visible=id;}, reconnect: () => {version++;}, children: value => {children=value;},
    tick: async ms => {for(const [id,timer] of timers) if(timer.ms===ms){timers.delete(id);timer.fn();}await flush();} };
}
test('question starts and sends to its persistent child; quote is separate from the naming question', async () => {
  const s=setup(); assert.equal(await s.open({question:'  Why?  ',context:'line1\nline2'}),'child-1');
  assert.deepEqual(s.events.map(e=>e[0]),['start','registered','show','send']);
  assert.equal(s.events[0][1].question,'Why?'); assert.equal(s.events[0][1].openedBy,'selection');
  assert.deepEqual(s.events.at(-1),['send','child-1','> line1\n> line2\n\nWhy?']); assert.equal(s.timers.size,0);
});
test('bare toggle closes once; archived child cannot reopen before sidebar notification arrives', async () => {
  const s=setup(); await s.open();s.children([{id:'child-1',createdAt:1}]);await s.open();
  assert.equal(s.view(),null);assert.deepEqual(s.events.filter(e=>e[0]==='close'),[['close','child-1']]);
  assert.equal(await s.open(),'child-2');
});
test('reopens most recent nonarchived child; never one shown elsewhere', async () => {
  const s=setup({isOpenElsewhere:id=>id==='elsewhere'});s.children([{id:'old',createdAt:1},{id:'archived',createdAt:4,archived:true},{id:'recent',createdAt:2},{id:'elsewhere',createdAt:3}]);
  assert.equal(await s.open(),'recent');assert.deepEqual(s.events,[['show','parent','recent']]);
});
test('two concurrent bare opens join one creation', async () => {
  const gate=deferred();let count=0;const s=setup({start:()=>{count++;return gate.promise;}});
  const a=s.open(),b=s.open();await flush();assert.equal(count,1);gate.resolve({status:'started',sessionId:'one'});await Promise.all([a,b]);assert.equal(s.view(),'one');
});
test('new and reopened children retain the initiating focus timestamp across asynchronous work',async()=>{
  const gate=deferred(),shown=[];let now=100;
  const s=setup({captureFocus:()=>now,start:()=>gate.promise,show:(...args)=>shown.push(args)});
  const opening=s.open({question:'Question'});await flush();now=5000;gate.resolve({status:'started',sessionId:'new'});await opening;
  assert.deepEqual(shown[0],['parent','new',{askedAt:100}]);
  const reopened=setup({captureFocus:()=>9000,show:(...args)=>shown.push(args)});reopened.children([{id:'recent',createdAt:1}]);
  await reopened.open({askedAt:8000});assert.deepEqual(shown[1],['parent','recent',{askedAt:8000}]);
});
test('concurrent questions both send, but only the latest opening selects a tab', async () => {
  const gates=[deferred(),deferred()];let count=0;const s=setup({start:()=>gates[count++].promise});
  const a=s.open({question:'first'}),b=s.open({question:'second'});await flush();
  gates[1].resolve({status:'started',sessionId:'second'});await b;gates[0].resolve({status:'started',sessionId:'first'});await a;
  assert.equal(s.view(),'second');assert.deepEqual(s.events.filter(e=>e[0]==='send'),[['send','second','second'],['send','first','first']]);
});
test('closing an opening pane invalidates a late bare result and cleans it up', async () => {
  const gate=deferred(),s=setup({start:()=>gate.promise});const opening=s.open();await flush();
  await s.controller.onPaneClosed('parent',null);gate.resolve({status:'started',sessionId:'late'});await opening;await flush();
  assert.equal(s.view(),null);assert.deepEqual(s.events,[['close','late']]);
});
test('20-second timeout falls back once and archives a late confirmed child without sending', async () => {
  const gate=deferred(),s=setup({start:()=>gate.promise});const opening=s.open({question:'question'});await flush();await s.tick(20000);await opening;
  assert.equal(s.events.filter(e=>e[0]==='fallback').length,1);gate.resolve({status:'started',sessionId:'late'});await flush();
  assert.deepEqual(s.events.at(-1),['close','late']);assert.equal(s.events.some(e=>e[0]==='send'),false);
});
test('navigation still sends an explicit question to its original child, but closes a late bare child', async () => {
  for(const question of ['', 'explicit']){
    const gate=deferred(),s=setup({start:()=>gate.promise});const opening=s.open({question});await flush();s.navigate('other');gate.resolve({status:'started',sessionId:'child'});await opening;await flush();
    assert.equal(s.view(),null);assert.equal(s.events.some(e=>e[0]==='send'),!!question);assert.equal(s.events.some(e=>e[0]==='close'),!question);
  }
});
test('changed connection never registers, displays or sends into the replacement runtime', async () => {
  const gate=deferred(),s=setup({start:()=>gate.promise});const opening=s.open({question:'question'});await flush();s.reconnect();gate.resolve({status:'started',sessionId:'old'});await opening;await flush();
  assert.deepEqual(s.events,[['close','old']]);
});
test('selection-only creates a child with a quoted draft; send failure restores without fallback resend', async () => {
  const s=setup();await s.open({context:'selected'});assert.deepEqual(s.events.at(-1),['restore','child-1','> selected\n\n']);
  const error=Error('offline'),f=setup({send:async()=>{throw error;}});await f.open({question:'keep me'});
  assert.deepEqual(f.events.at(-1),['restore','child-1','keep me',error]);assert.equal(f.events.some(e=>e[0]==='fallback'),false);
});
test('close waits at most 3 seconds; a still-closing child is never reused', async () => {
  const gate=deferred(),s=setup({close:()=>gate.promise});s.children([{id:'closing',createdAt:1}]);
  const closing=s.controller.closeChild('parent','closing'),opening=s.open();await flush();assert.equal(s.view(),null);
  await s.tick(3000);assert.equal(await opening,'child-1');gate.resolve({status:'archived'});await closing;
});
test('lineage and own-turn filtering exclude ordinary forks, detached children and inherited rows', () => {
  const from={btw:true,userFork:true,sideSession:true,sessionId:'p'},meta={a:{spawnedFrom:from,btw:{createdAt:2,ownTurnIds:['own']}},b:{spawnedFrom:from,lineageDetached:true},c:{spawnedFrom:{...from,btw:false}},d:{spawnedFrom:{...from,sessionId:'other'}}};
  assert.deepEqual(btwChildren(['a','b','c','d'].map(id=>({id})),meta,'p').map(t=>t.id),['a']);
  assert.deepEqual(ownBtwItems([{id:1,turnId:'inherited'},{id:2,turnId:'own'},{id:3}],meta.a),[{id:2,turnId:'own'}]);
});
test('active archived or arriving child keeps a tab; close chooses next then previous without stealing another window', () => {
  const sessions=[{id:'a'},{id:'b',archived:true},{id:'c'},{id:'old',archived:true}];
  const metadata=Object.fromEntries(sessions.map((thread,index)=>[thread.id,{spawnedFrom:{btw:true,userFork:true,sideSession:true,sessionId:'parent'},btw:{createdAt:index}}]));
  const tabs=btwPaneTabs(sessions,metadata,'parent','b');assert.deepEqual(tabs.map(t=>t.id),['a','b','c']);
  assert.equal(nextBtwTab(tabs,'b').id,'c');assert.equal(nextBtwTab(tabs,'b',id=>id==='c').id,'a');assert.equal(nextBtwTab(tabs,'b',()=>true),null);
  assert.deepEqual(btwPaneTabs(sessions,metadata,'parent','arriving').map(t=>t.id),['a','c','arriving']);
});
test('drafts and pane selection survive restart per child, failed send never overwrites new input', () => {
  const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
  const drafts=createBtwDraftStore(storage);drafts.set('one','new input');drafts.restore('one','failed input');drafts.restore('two','second');
  const restored=createBtwDraftStore(storage);assert.equal(restored.get('one'),'new input');assert.equal(restored.get('two'),'second');
  const tiles=createTileLayoutStore({storage});tiles.setSession('parent',{btwSessionId:'one',tileLayout:fromSpec({direction:'row',children:['chat','session']})});
  const next=createTileLayoutStore({storage}).getSession('parent');assert.equal(next.btwSessionId,'one');assert.ok(tileIds(next.tileLayout).has('session'));
});
