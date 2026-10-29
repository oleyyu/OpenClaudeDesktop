import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isSideChatReset } from '../src/side-chat-command.mjs';
import * as controls from '../src/side-chat-controls.mjs';
import { sideChatStore as store } from '../src/side-chat-store.mjs';
test('original reset command boundary/case rules', () => {
  for (const value of ['/clear', ' /RESET ', '/new\nanything', '/clear text']) assert.equal(isSideChatReset(value), true);
  for (const value of ['/clearer', '/news', 'please /clear', '/new-file']) assert.equal(isSideChatReset(value), false);
});
test('reset commands clear locally without model dispatch; in-flight reset only sends cancel', async () => {
  for (const question of ['/clear', '/reset', '/new']) {
    store.ask('commands', 'old', 'old');store.finish('commands', 'old', { text: 'answer' });store.setDraft('commands', question);
    const calls=[];await controls.askSideQuestion({ threadId:'commands',question,rpc:async(...args)=>{calls.push(args);return {};} });
    assert.deepEqual(calls,[]);assert.deepEqual(store.get('commands').messages,[]);assert.equal(store.get('commands').draft,'');
  }
  store.ask('commands','pending','pending');const calls=[];
  await controls.askSideQuestion({threadId:'commands',question:'/clear',rpc:async(...args)=>{calls.push(args);return {};}});
  assert.deepEqual(calls,[['codeDesktop/sideQuestion/cancel',{requestId:'pending'}]]);
});
test('repeated Stop waits on one cancellation and retains partial answer without failure', async () => {
  store.ask('stop','q','r');store.delta('stop','r','partial');let done,calls=0;
  const rpc=()=>{calls++;return new Promise(resolve=>done=resolve);};
  const first=controls.stopSideQuestion({threadId:'stop',rpc});await controls.stopSideQuestion({threadId:'stop',rpc});
  assert.equal(calls,1);assert.equal(store.get('stop').interrupting,true);
  done({});await first;assert.equal(store.get('stop').status,'idle');assert.equal(store.get('stop').messages.at(-1).text,'partial');
  assert.equal(store.get('stop').error,null);assert.equal(store.get('stop').retry,null);
});
test('failed cancellation remains stoppable and cannot affect a newer request', async () => {
  store.ask('fail','q','r');await controls.stopSideQuestion({threadId:'fail',rpc:async()=>{throw Error('stop failed');}});
  assert.equal(store.get('fail').status,'thinking');assert.equal(store.get('fail').interrupting,false);assert.equal(store.get('fail').error,'stop failed');
  let done;const stop=controls.stopSideQuestion({threadId:'fail',rpc:()=>new Promise(resolve=>done=resolve)});
  store.clear('fail');store.ask('fail','next','next');done({});await stop;
  assert.equal(store.get('fail').requestId,'next');assert.equal(store.get('fail').status,'thinking');
});

test('selection dispatch is explicit, uses original quote wire format and consumes context once', async () => {
  store.clear('context');store.stageContext('context','line one\nline two');const calls=[];
  const rpc=async(method,params)=>{calls.push({method,params});return {text:'answer'};};
  await controls.askSideQuestion({threadId:'context',question:'explain',rpc,useStagedContext:true});
  const wire='<!-- attach -->\n> line one\n> line two\n\nexplain';
  assert.equal(calls[0].params.question,wire);assert.equal(store.get('context').stagedContext,null);
  assert.equal(store.get('context').messages[0].text,wire);assert.equal(store.get('context').started,true);
  await controls.askSideQuestion({threadId:'context',question:'follow up',rpc,useStagedContext:true});
  assert.equal(calls[1].params.question,'follow up');assert.equal(calls[1].params.history[0].question,wire);
  store.stageContext('context','next selection');await controls.askSideQuestion({threadId:'context',question:'external search',rpc});
  assert.equal(calls[2].params.question,'external search');assert.equal(store.get('context').stagedContext,'next selection');
  await controls.askSideQuestion({threadId:'context',question:'/reset',rpc,useStagedContext:true});assert.equal(calls.length,3);assert.equal(store.get('context').stagedContext,'next selection');assert.equal(store.get('context').started,true);
});
test('failed context question retries its wire once without capturing a newly staged selection', async () => {
  store.clear('context-retry');store.stageContext('context-retry','old quote');
  await controls.askSideQuestion({threadId:'context-retry',question:'why',useStagedContext:true,rpc:async()=>{throw Error('offline');}});
  const retry=store.get('context-retry').retry;store.stageContext('context-retry','new quote');let sent;
  await controls.askSideQuestion({threadId:'context-retry',question:retry,rpc:async(_,params)=>{sent=params.question;return {text:'done'};}});
  assert.equal(sent,'<!-- attach -->\n> old quote\n\nwhy');assert.equal(store.get('context-retry').stagedContext,'new quote');
});

test('request-owned subscriptions route concurrent streams once and tear down on success/failure', async () => {
  const listeners=new Set(),pending=new Map();
  const subscribe=handler=>{listeners.add(handler);return()=>listeners.delete(handler);};
  const emit=params=>{for(const listener of listeners)listener({method:'codeDesktop/sideQuestion/delta',params});};
  const rpc=(method,params)=>new Promise((resolve,reject)=>pending.set(params.threadId,{...params,resolve,reject}));
  store.clear('stream-a');store.clear('stream-b');
  const a=controls.askSideQuestion({rpc,subscribe,threadId:'stream-a',question:'a'});
  const b=controls.askSideQuestion({rpc,subscribe,threadId:'stream-b',question:'b'});
  assert.equal(listeners.size,2);
  emit({...pending.get('stream-a'),text:'first '});emit({...pending.get('stream-a'),text:'second'});emit({...pending.get('stream-b'),text:'other'});
  assert.equal(store.get('stream-a').messages.at(-1).text,'first second');assert.equal(store.get('stream-b').messages.at(-1).text,'other');
  pending.get('stream-a').resolve({});await a;assert.equal(listeners.size,1);
  emit({...pending.get('stream-a'),text:'late'});assert.equal(store.get('stream-a').messages.at(-1).text,'first second');
  pending.get('stream-b').reject(Error('offline'));await b;assert.equal(listeners.size,0);assert.equal(store.get('stream-b').messages.at(-1).text,'other');
});
test('listener is installed before dispatch and old request completion cannot detach the replacement', async () => {
  const listeners=new Set(),pending=[];const subscribe=h=>{listeners.add(h);return()=>listeners.delete(h);};
  const emit=params=>{for(const listener of listeners)listener({method:'codeDesktop/sideQuestion/delta',params});};
  const rpc=(method,params)=>{if(method.endsWith('/cancel'))return Promise.resolve({});emit({...params,text:'early'});return new Promise(resolve=>pending.push({...params,resolve}));};
  store.clear('stream-replace');const first=controls.askSideQuestion({rpc,subscribe,threadId:'stream-replace',question:'first'});
  assert.equal(store.get('stream-replace').messages.at(-1).text,'early');
  const second=controls.askSideQuestion({rpc,subscribe,threadId:'stream-replace',question:'next'});const id=store.get('stream-replace').requestId;
  emit({...pending[0],text:'stale'});pending[0].resolve({text:'old result'});await first;
  assert.equal(listeners.size,1);assert.equal(store.get('stream-replace').requestId,id);assert.equal(store.get('stream-replace').messages.at(-1).text,'early');
  emit({...pending[1],text:' late'});pending[1].resolve({});await second;assert.equal(listeners.size,0);assert.equal(store.get('stream-replace').messages.at(-1).text,'early late');
});


test('progress subscription is request-scoped and cannot overwrite a stopping or finished request', async () => {
  let listener,finish,params;const rpc=async(method,value)=>{params=value;return await new Promise(r=>finish=r);};
  store.clear('progress');const pending=controls.askSideQuestion({rpc,threadId:'progress',question:'q',subscribe:fn=>{listener=fn;return()=>{};}});
  const event=extra=>listener({method:'codeDesktop/sideQuestion/progress',params:{...params,stage:'forking',...extra}});
  event({threadId:'other'});assert.equal(store.get('progress').progress,null);event({requestId:'stale'});assert.equal(store.get('progress').progress,null);
  event({});assert.equal(store.get('progress').progress.stage,'forking');event({stage:'tools',activity:{tool:'Read',detail:'file'}});assert.equal(store.get('progress').progress.activity.detail,'file');
  event({stage:'unknown'});assert.equal(store.get('progress').progress.stage,'tools');store.interrupt('progress',params.requestId);event({stage:'responding'});assert.equal(store.get('progress').progress.stage,'tools');
  finish({text:'partial'});await pending;assert.equal(store.get('progress').progress,null);event({});assert.equal(store.get('progress').progress,null);
});


test('source closed state becomes idle without a spurious retry or no-answer error', async () => {
  store.clear('closed');await controls.askSideQuestion({threadId:'closed',question:'q',rpc:async()=>({text:'',closed:true})});
  const state=store.get('closed');assert.equal(state.status,'idle');assert.equal(state.started,false);assert.equal(state.progress,null);assert.equal(state.thinkingSince,null);assert.equal(state.retry,null);assert.equal(state.error,null);assert.equal(state.messages.at(-1).text,'q');
});

// w12b-terminal-preview-tabs TPT-7: 3.6556.2 cccc2cf0a SF/vF — the error row is vF.unsupported or vF.failed, never the
// core's raw message (CF's catch maps any failure to "failed").
test('a failed side question shows the official vF sentence, not the raw error', async () => {
  const official = fs.readFileSync(path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/cccc2cf0a-DhZC33Gc.js'), 'utf8');
  for (const feature of ['failed:{defaultMessage:"Couldn\\u2019t get an answer. Try again.",id:"gYPvvv2FIZ"}',
    'unsupported:{defaultMessage:"Side chat isn\\u2019t supported in this session\\u2019s environment yet.",id:"TOHoonVIan"}',
    'case"timeout":case"failed":return n.formatMessage(r.failed)']) assert.ok(official.includes(feature), feature);
  store.clear('raw');
  await controls.askSideQuestion({ threadId: 'raw', question: 'q', rpc: async () => { throw Object.assign(Error('socket hang up'), { code: -32000 }); }, subscribe: () => () => {} });
  assert.equal(store.get('raw').error, 'Couldn’t get an answer. Try again.');
  store.clear('none');
  await controls.askSideQuestion({ threadId: 'none', question: 'q', rpc: async () => { throw Object.assign(Error('Method not found'), { code: -32601 }); }, subscribe: () => () => {} });
  assert.equal(store.get('none').error, 'Side chat isn’t supported in this session’s environment yet.');
  assert.equal(controls.sideQuestionErrorText('failed'), 'Couldn’t get an answer. Try again.');
});
