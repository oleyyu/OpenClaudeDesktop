import test from 'node:test';
import assert from 'node:assert/strict';
import { CoworkMainHost } from '../electron/cowork-runtime/main-host.mjs';

test('native host is lazy, shares one runtime for concurrent calls, and forwards status', async () => {
 let loads=0, stops=0, emit; const calls=[];
 const host=new CoworkMainHost({load:async()=>{loads++;return {createCoworkRuntime(send){emit=send;return {async dispatch(method,params){calls.push([method,params]);if(method==='stop')stops++;return method;}}}}}});
 await assert.rejects(host.request('send'), /not running/); assert.equal(loads,0);
 const events=[];host.on('event',event=>events.push(event));
 assert.deepEqual(await Promise.all([host.request('boot'),host.request('open')]),['boot','open']);
 assert.equal(loads,1);emit({event:'status',status:'ready'});assert.deepEqual(events,[{event:'status',status:'ready'}]);
 await Promise.all([host.stop(),host.stop()]);assert.equal(stops,1);
 await assert.rejects(host.request('open'),/stopped/);
});
test('native string rejections become actionable errors', async () => {
 const host=new CoworkMainHost({load:async()=>({createCoworkRuntime:()=>({dispatch:async()=>{throw 'Virtualization entitlement is missing';}})})});
 await assert.rejects(host.request('boot'),/Virtualization entitlement is missing/);
});
