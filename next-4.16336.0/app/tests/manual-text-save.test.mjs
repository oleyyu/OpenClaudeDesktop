import test from 'node:test';
import assert from 'node:assert/strict';
import {createManualTextSave} from '../src/manual-text-save.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('explicit save locks immediately, retains busy through edits, and never posts duplicate values',async()=>{
 const request=deferred(),calls=[],states=[];
 const c=createManualTextSave({save:value=>{calls.push(value);return request.promise;},onState:s=>states.push(s)});
 const pending=c.submit('first');assert.deepEqual(states.at(-1),{saving:true,error:''});assert.equal(c.submit('duplicate'),pending);
 c.edit();assert.deepEqual(states.at(-1),{saving:true,error:''});await Promise.resolve();assert.deepEqual(calls,['first']);
 request.resolve();await pending;assert.deepEqual(states.at(-1),{saving:false,error:''});
});
test('old failures do not attach to newer edits; current failures remain retryable',async()=>{
 let request=deferred();const states=[],calls=[];const c=createManualTextSave({save:v=>{calls.push(v);return request.promise;},onState:s=>states.push(s)});
 const first=c.submit('first');c.edit();request.reject(Error('old failure'));await first;assert.equal(states.at(-1).error,'');
 request=deferred();const next=c.submit('second');request.reject(Error('current failure'));await next;assert.equal(states.at(-1).error,'current failure');
 request=deferred();const retry=c.submit('second');request.resolve();await retry;assert.equal(states.at(-1).error,'');assert.deepEqual(calls,['first','second','second']);
});
test('invalid drafts never send a save and synchronous failures settle the pending lock',async()=>{
 let calls=0;const states=[];const c=createManualTextSave({validate:v=>{if(v==='bad')throw Error('Invalid');},save:()=>{calls++;throw Error('Offline');},onState:s=>states.push(s)});
 await c.submit('bad');assert.equal(calls,0);assert.equal(states.at(-1).error,'Invalid');c.edit();assert.equal(states.at(-1).error,'');
 await c.submit('valid');assert.equal(calls,1);assert.deepEqual(states.at(-1),{saving:false,error:'Offline'});await c.submit('retry');assert.equal(calls,2);
});
test('dispose suppresses late status and further saves without cancelling a real persistence request',async()=>{
 const request=deferred(),states=[];let calls=0;const c=createManualTextSave({save:()=>{calls++;return request.promise;},onState:s=>states.push(s)});
 const pending=c.submit('a');await Promise.resolve();c.dispose();const count=states.length;request.reject(Error('late'));await pending;c.edit();await c.submit('b');assert.equal(states.length,count);assert.equal(calls,1);
});
