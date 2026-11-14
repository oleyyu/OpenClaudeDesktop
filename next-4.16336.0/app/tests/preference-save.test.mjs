import test from 'node:test';
import assert from 'node:assert/strict';
import { saveConfirmedPreferences } from '../src/preference-save.mjs';
function fixture() {
 const calls=[],applied=[],revision={current:0};
 const call=(name,patch)=>new Promise((resolve,reject)=>calls.push({name,patch,resolve,reject}));
 return {calls,applied,save:patch=>saveConfirmedPreferences({revision,patch,call,apply:c=>applied.push(c)})};
}
test('latest successful config is applied and older success cannot overwrite it',async()=>{
 const f=fixture(),a=f.save({codeFont:'M'}),b=f.save({codeFont:'Menlo'});
 f.calls[1].resolve({codeFont:'Menlo',theme:'dark'});await b;f.calls[0].resolve({codeFont:'M'});await a;
 assert.deepEqual(f.applied,[{codeFont:'Menlo',theme:'dark'}]);assert.equal(f.calls.length,2);
});
test('latest save failure reconciles earlier persisted success and still reports original error',async()=>{
 const f=fixture(),a=f.save({codeFont:'M'}),b=f.save({codeFont:'Me'}),failure=Error('disk full');
 f.calls[0].resolve({codeFont:'M'});await a;assert.deepEqual(f.applied,[]);
 f.calls[1].reject(failure);await Promise.resolve();assert.equal(f.calls[2].name,'init');
 f.calls[2].resolve({config:{codeFont:'M'}});await assert.rejects(b,e=>e===failure);
 assert.deepEqual(f.applied,[{codeFont:'M'}]);assert.equal(f.calls.length,3);
});
test('late failure never starts a stale reconciliation read',async()=>{
 const f=fixture(),a=f.save({codeFont:'M'}),b=f.save({codeFont:'Me'});
 f.calls[0].reject(Error('old'));await assert.rejects(a,/old/);assert.equal(f.calls.length,2);
 f.calls[1].resolve({codeFont:'Me'});await b;assert.deepEqual(f.applied,[{codeFont:'Me'}]);
});
test('new edit while reconciliation is pending prevents rollback to old read snapshot',async()=>{
 const f=fixture(),a=f.save({codeFont:'M'});f.calls[0].reject(Error('disk'));await Promise.resolve();
 const b=f.save({theme:'dark'});f.calls[2].resolve({theme:'dark',codeFont:'Mono'});await b;
 f.calls[1].resolve({config:{theme:'light',codeFont:''}});await assert.rejects(a,/disk/);
 assert.deepEqual(f.applied,[{theme:'dark',codeFont:'Mono'}]);
});
test('reconciliation failure or missing config never masks original error or fabricates config',async()=>{
 for(const unreadable of [true,false]) {
  const f=fixture(),a=f.save({codeFont:'M'});f.calls[0].reject(Error('original'));await Promise.resolve();
  if(unreadable)f.calls[1].reject(Error('read failed'));else f.calls[1].resolve({});
  await assert.rejects(a,/original/);assert.deepEqual(f.applied,[]);
 }
});
