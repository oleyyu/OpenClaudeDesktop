import test from 'node:test';
import assert from 'node:assert/strict';
import {createResponseMathLoader} from '../src/response-math-loader.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(){
 let at=0;const engines=[],styles=[],events=new EventTarget();
 const loader=createResponseMathLoader({now:()=>at,events,
  loadEngine:()=>{const job=deferred();engines.push(job);return job.promise;},
  loadStyles:()=>{const job=deferred();styles.push(job);return job.promise;},
 });
 return {loader,engines,styles,events,time:value=>{at=value;}};
}
const tick=()=>Promise.resolve();
test('concurrent formulas share one request; ready notifies old consumers and unsubscribed consumers stay silent',async()=>{
 const f=fixture(),seen=[],gone=[];f.loader.subscribe(()=>seen.push(f.loader.getSnapshot()));const off=f.loader.subscribe(()=>gone.push(1));
 const a=f.loader.ensure(),b=f.loader.ensure();assert.equal(a,b);await tick();assert.equal(f.engines.length,1);assert.equal(f.styles.length,1);off();
 const engine={renderToString:()=>'<math/>'};f.engines[0].resolve(engine);f.styles[0].resolve();await a;
 assert.deepEqual(seen,[{status:'ready',katex:engine}]);assert.deepEqual(gone,[]);assert.equal(f.loader.ensure(),a);assert.equal(f.loader.getDisabledSnapshot().status,'pending');
});
test('failed resource retries only on demand at10000ms and in-flight retry is deduplicated',async()=>{
 const f=fixture(),first=f.loader.ensure();await tick();f.engines[0].reject(Error('unavailable'));f.styles[0].resolve();await assert.rejects(first,/unavailable/);
 assert.equal(f.loader.getSnapshot().status,'pending');f.time(9999);assert.equal(f.loader.ensure(),first);assert.equal(f.engines.length,1);
 f.time(10000);assert.equal(f.engines.length,1,'time passing creates no request');const second=f.loader.ensure();assert.notEqual(second,first);assert.equal(f.loader.ensure(),second);await tick();assert.equal(f.engines.length,2);
 f.engines[1].resolve('engine');f.styles[1].resolve();await second;assert.equal(f.loader.getSnapshot().katex,'engine');
});
test('exactly three failures become terminal and later consumers cannot create a fourth attempt',async()=>{
 const f=fixture(),states=[];f.loader.subscribe(()=>states.push(f.loader.getSnapshot().status));let last;
 for(let i=0;i<3;i++){f.time(i*10000);last=f.loader.ensure();await tick();f.engines[i].reject(Error('no '+i));f.styles[i].resolve();await assert.rejects(last);assert.equal(f.loader.getSnapshot().status,i<2?'pending':'failed');}
 f.time(999999);assert.equal(f.loader.ensure(),last);assert.equal(f.engines.length,3);assert.deepEqual(states,['failed']);
});
test('vite preloadError disables retries without cancelling a still-successful engine',async()=>{
 const f=fixture(),first=f.loader.ensure();await tick();f.events.dispatchEvent(new Event('vite:preloadError'));assert.equal(f.loader.getSnapshot().status,'pending');
 f.engines[0].resolve('usable');f.styles[0].reject(Error('css'));await first;assert.equal(f.loader.getSnapshot().status,'ready');assert.equal(f.loader.getSnapshot().katex,'usable');
});
test('vite preloadError after a failed import publishes terminal failure and retains the failed promise',async()=>{
 const f=fixture(),states=[];f.loader.subscribe(()=>states.push(f.loader.getSnapshot().status));const p=f.loader.ensure();await tick();f.engines[0].reject(Error('chunk'));f.styles[0].resolve();await assert.rejects(p);
 f.events.dispatchEvent(new Event('vite:preloadError'));f.events.dispatchEvent(new Event('vite:preloadError'));assert.deepEqual(states,['failed']);f.time(10000);assert.equal(f.loader.ensure(),p);assert.equal(f.engines.length,1);
});
test('stylesheet rejection is independent; completion still waits until both resources have settled',async()=>{
 const f=fixture(),p=f.loader.ensure();await tick();f.engines[0].resolve('engine');await tick();assert.equal(f.loader.getSnapshot().status,'pending');f.styles[0].reject(Error('stylesheet'));await p;assert.equal(f.loader.getSnapshot().katex,'engine');
});
test('a late stylesheet completion from a failed attempt cannot overwrite a recovered engine',async()=>{
 const f=fixture(),first=f.loader.ensure();await tick();f.engines[0].reject(Error('first'));await assert.rejects(first);f.time(10000);const recovered=f.loader.ensure();await tick();f.engines[1].resolve('current');f.styles[1].resolve();await recovered;const state=f.loader.getSnapshot();f.styles[0].resolve();await tick();assert.equal(f.loader.getSnapshot(),state);
});
test('synchronous module loader exceptions follow the same observed rejection policy',async()=>{
 const loader=createResponseMathLoader({loadEngine:()=>{throw Error('sync');},loadStyles:()=>{throw Error('css sync');}});await assert.rejects(loader.ensure(),/sync/);assert.equal(loader.getSnapshot().status,'pending');
});
