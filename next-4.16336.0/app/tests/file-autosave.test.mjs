import test from 'node:test';
import assert from 'node:assert/strict';
import {getFileEditor,guardFileEdits,fileEditGuards} from '../src/file-edit-store.mjs';
import {createFileAutosaveQuitGate} from '../electron/file-autosave-quit.cjs';
let seq=0;
const create=save=>getFileEditor({key:`auto-${++seq}`,path:'a.txt',sessionId:`auto-${seq}`,text:'one',hash:'h1',save});
const settle=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
test('idle autosave debounces for one second, and disabling cancels a pending timer',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let writes=[];
 const e=create(async(text,hash)=>{writes.push([text,hash]);return {status:'saved',hash:'h2'};});e.setAutoSave(true);
 e.change('two');t.mock.timers.tick(900);await settle();assert.equal(writes.length,0);
 e.change('three');t.mock.timers.tick(999);await settle();assert.equal(writes.length,0);
 t.mock.timers.tick(1);await settle();assert.deepEqual(writes,[['three','h1']]);assert.equal(e.dirty,false);
 e.change('four');e.setAutoSave(false);t.mock.timers.tick(2000);await settle();assert.equal(writes.length,1);e.discard();
});
test('flush drains latest edits serially against returned hashes; failure retains draft and never loops',async()=>{
 const writes=[],resolvers=[];const e=create((...args)=>{writes.push(args);return new Promise(r=>resolvers.push(r));});e.setAutoSave(true);e.change('two');const flush=e.flushAutoSave();await settle();
 e.change('three');resolvers.shift()({status:'saved',hash:'h2'});await settle();assert.deepEqual(writes,[['two','h1'],['three','h2']]);
 resolvers.shift()({status:'conflict',currentHash:'disk'});await flush;assert.equal(e.getSnapshot().text,'three');assert.equal(e.dirty,true);await e.flushAutoSave();assert.equal(writes.length,2);e.setAutoSave(false);e.discard();
});
test('navigation flushes autosave before leaving; conflict preserves draft and opens the existing discard guard',async()=>{
 let succeed=true;const e=create(async()=>succeed?{status:'saved',hash:'h2'}:{status:'conflict',currentHash:'disk'});e.setAutoSave(true);e.change('two');let navigated=0;
 assert.equal(guardFileEdits(()=>navigated++,{key:e.key}),true);await settle();assert.equal(navigated,1);assert.equal(fileEditGuards.getSnapshot(),null);
 succeed=false;e.change('three');guardFileEdits(()=>navigated++,{key:e.key});await settle();assert.equal(navigated,1);assert.ok(fileEditGuards.getSnapshot());assert.equal(e.getSnapshot().text,'three');fileEditGuards.cancel();e.setAutoSave(false);e.discard();
});
test('quit gate waits for one flush, then lets existing guards handle the retried quit',async()=>{
 let release,quits=0,prevented=0,calls=0;const gate=createFileAutosaveQuitGate({needsFlush:()=>true,flush:()=>{calls++;return new Promise(r=>release=r);},quit:()=>quits++});const event={preventDefault(){prevented++;}};
 assert.equal(gate.handle(event),true);assert.equal(gate.handle(event),true);await settle();assert.equal(calls,1);assert.equal(quits,0);release();await settle();assert.equal(quits,1);assert.equal(gate.handle(event),false);assert.equal(prevented,2);
});
