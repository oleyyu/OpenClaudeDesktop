import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createNativeSideChat, SIDE_DEVELOPER_INSTRUCTIONS, SIDE_BOUNDARY_PROMPT } = require('../electron/native-side-chat.cjs');

// A fake Codex client: records requests; the test drives notifications through observe().
function fakeClient({ injectFails = false } = {}) {
  const calls = [];
  let forks = 0, turns = 0;
  return { calls, async request(method, params) {
    calls.push({ method, params });
    if (method === 'thread/fork') return { thread: { id: `fork-${++forks}`, ephemeral: true, forkedFromId: params.threadId } };
    if (method === 'thread/inject_items') { if (injectFails) throw Object.assign(new Error('unknown variant'), { code: -32600 }); return {}; }
    if (method === 'turn/start') return { turn: { id: `turn-${++turns}`, status: 'inProgress' } };
    return {};
  } };
}

test('Codex /side: an ephemeral read-only fork with the side instructions, the boundary injected, deltas to the panel', async () => {
  const client = fakeClient(), emitted = [];
  const side = createNativeSideChat({ getClient: () => client, emit: (event) => emitted.push(event), settings: () => ({ model: 'gpt-5.5', effort: 'high' }) });
  const answer = side.ask({ threadId: 'main', question: 'what does this regex do?', history: [], requestId: 'r1' });
  await new Promise((resolve) => setImmediate(resolve));
  const fork = client.calls.find((call) => call.method === 'thread/fork').params;
  assert.deepEqual({ ...fork, developerInstructions: undefined }, { threadId: 'main', ephemeral: true, excludeTurns: true, approvalPolicy: 'never', sandbox: 'read-only', model: 'gpt-5.5', config: { model_reasoning_effort: 'high' }, developerInstructions: undefined });
  assert.equal(fork.developerInstructions, SIDE_DEVELOPER_INSTRUCTIONS);
  assert.equal(client.calls.find((call) => call.method === 'thread/inject_items').params.items[0].content[0].text, SIDE_BOUNDARY_PROMPT);
  const turn = client.calls.find((call) => call.method === 'turn/start').params;
  assert.equal(turn.threadId, 'fork-1');
  assert.equal(turn.input[0].text, 'what does this regex do?');
  assert.deepEqual(turn.sandboxPolicy, { type: 'readOnly', networkAccess: false });
  // The fork's events stay in main; the delta reaches the panel under the parent session.
  assert.equal(side.observe({ method: 'thread/started', params: { thread: { id: 'fork-1' } } }), true);
  assert.equal(side.observe({ method: 'item/agentMessage/delta', params: { threadId: 'fork-1', turnId: 'turn-1', delta: 'It matches ' } }), true);
  assert.deepEqual(emitted.at(-1), { method: 'codeDesktop/sideQuestion/delta', params: { threadId: 'main', requestId: 'r1', text: 'It matches ' } });
  side.observe({ method: 'item/completed', params: { threadId: 'fork-1', turnId: 'turn-1', item: { type: 'agentMessage', text: 'It matches digits.' } } });
  side.observe({ method: 'turn/completed', params: { threadId: 'fork-1', turn: { id: 'turn-1', status: 'completed' } } });
  assert.deepEqual(await answer, { text: 'It matches digits.' });
  assert.equal(side.observe({ method: 'item/agentMessage/delta', params: { threadId: 'main', delta: 'x' } }), false, 'the session itself is not a fork');
  // A follow-up reuses the fork; a fresh chat (no history) drops it and forks again.
  const follow = side.ask({ threadId: 'main', question: 'and groups?', history: [{ question: 'q', answer: 'a' }], requestId: 'r2' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(client.calls.filter((call) => call.method === 'thread/fork').length, 1);
  side.observe({ method: 'turn/completed', params: { threadId: 'fork-1', turn: { id: 'turn-2', status: 'completed' } } });
  await follow;
  const again = side.ask({ threadId: 'main', question: 'new', history: [], requestId: 'r3' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(client.calls.some((call) => call.method === 'thread/unsubscribe' && call.params.threadId === 'fork-1'));
  assert.equal(client.calls.filter((call) => call.method === 'thread/fork').length, 2);
  await side.cancel({ requestId: 'r3' });
  assert.deepEqual(await again, { text: '' });
  assert.ok(client.calls.some((call) => call.method === 'turn/interrupt' && call.params.threadId === 'fork-2'));
});

test('Codex /side: without thread/inject_items the boundary leads the first question; a failed turn rejects', async () => {
  const client = fakeClient({ injectFails: true });
  const side = createNativeSideChat({ getClient: () => client, emit: () => {} });
  const answer = side.ask({ threadId: 'main', question: 'hi', history: [], requestId: 'r1' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(client.calls.find((call) => call.method === 'turn/start').params.input[0].text.startsWith('Side conversation boundary.'));
  side.observe({ method: 'turn/completed', params: { threadId: 'fork-1', turn: { id: 'turn-1', status: 'failed', error: { message: 'boom' } } } });
  await assert.rejects(answer, /boom/);
  assert.equal(side.observe({ method: 'thread/started', params: { thread: { id: 'other', ephemeral: true, forkedFromId: 'nobody' } } }), false);
});

test('Stop during fork creation settles immediately and never starts the cancelled question', async () => {
  const client=fakeClient(),base=client.request.bind(client);let release;
  const gate=new Promise(resolve=>release=resolve);
  client.request=async(method,params)=>{if(method==='thread/fork')await gate;return base(method,params);};
  const side=createNativeSideChat({getClient:()=>client,emit:()=>{}});
  const answer=side.ask({threadId:'main',question:'cancel before fork',history:[],requestId:'early'});
  await side.cancel({requestId:'early'});assert.deepEqual(await answer,{text:''});
  release();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(client.calls.some(call=>call.method==='turn/start'),false);
  assert.ok(client.calls.some(call=>call.method==='thread/unsubscribe'&&call.params.threadId==='fork-1'));
});

test('Stop before turn/start acknowledgement interrupts the late turn once and ignores late deltas', async () => {
  const client=fakeClient(),base=client.request.bind(client),emitted=[];let release;
  const gate=new Promise(resolve=>release=resolve);
  client.request=async(method,params)=>{const result=await base(method,params);if(method==='turn/start')await gate;return result;};
  const side=createNativeSideChat({getClient:()=>client,emit:event=>emitted.push(event)});
  const answer=side.ask({threadId:'main',question:'cancel pending start',history:[],requestId:'pending'});
  await new Promise(resolve=>setImmediate(resolve));await side.cancel({requestId:'pending'});await side.cancel({requestId:'pending'});
  assert.deepEqual(await answer,{text:''});release();await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(client.calls.filter(call=>call.method==='turn/interrupt').map(call=>call.params),[{threadId:'fork-1',turnId:'turn-1'}]);
  side.observe({method:'item/agentMessage/delta',params:{threadId:'fork-1',turnId:'turn-1',delta:'late'}});
  assert.deepEqual(emitted.map(e=>e.params.stage),['forking','waiting'],'cancelled requests publish no late progress or text');
});


test('native progress reports fresh forks, structured overlapping tools and model waits without parent leakage', async () => {
  const client=fakeClient(),events=[];const side=createNativeSideChat({getClient:()=>client,emit:e=>events.push(e)});
  const result=side.ask({threadId:'main',question:'inspect',history:[],requestId:'activity'});await new Promise(r=>setImmediate(r));
  const progress=()=>events.filter(e=>e.method.endsWith('/progress')).map(e=>e.params);
  assert.deepEqual(progress().map(e=>e.stage),['forking','waiting']);
  const emit=(method,item,turnId='turn-1')=>side.observe({method,params:{threadId:'fork-1',turnId,item}});
  assert.equal(emit('item/started',{id:'read',type:'commandExecution',commandActions:[{type:'read',name:'README.md',path:'/work/README.md'}]}),true);
  assert.deepEqual(progress().at(-1).activity,{tool:'Read',detail:'README.md'});
  emit('item/started',{id:'search',type:'commandExecution',commandActions:[{type:'search',query:'needle'}]});
  assert.deepEqual(progress().at(-1).activity,{tool:'Grep',detail:'needle'});
  const count=events.length;emit('item/completed',{id:'search'},'stale');assert.equal(events.length,count);
  emit('item/completed',{id:'search'});assert.equal(progress().at(-1).activity.tool,'Read','another live tool still owns activity');
  emit('item/completed',{id:'read'});assert.equal(progress().at(-1).stage,'waiting');
  side.observe({method:'item/agentMessage/delta',params:{threadId:'fork-1',turnId:'turn-1',delta:'answer'}});assert.equal(progress().at(-1).stage,'responding');
  side.observe({method:'turn/completed',params:{threadId:'fork-1',turn:{id:'turn-1',status:'completed'}}});assert.deepEqual(await result,{text:'answer'});
  assert.ok(progress().every(p=>p.threadId==='main'&&p.requestId==='activity'));
  const after=events.length;emit('item/started',{id:'late',type:'webSearch'});assert.equal(events.length,after);
  const follow=side.ask({threadId:'main',question:'again',history:[{question:'inspect',answer:'answer'}],requestId:'follow'});await new Promise(r=>setImmediate(r));
  assert.equal(progress().at(-1).stage,'waiting');assert.equal(progress().filter(p=>p.stage==='forking').length,1);
  await side.cancel({requestId:'follow'});await follow;
});

test('tool descriptions use protocol metadata and never infer a file read from shell text', () => {
  const {sideToolActivity}=require('../electron/native-side-chat.cjs');
  assert.deepEqual(sideToolActivity({type:'commandExecution',command:'cat secrets.txt'}),{tool:'commandExecution',detail:null});
  assert.deepEqual(sideToolActivity({type:'mcpToolCall',tool:'Read',arguments:{file_path:'notes.txt'}}),{tool:'Read',detail:'notes.txt'});
  assert.deepEqual(sideToolActivity({type:'commandExecution',commandActions:[{type:'listFiles'}]}),{tool:'Glob',detail:null});
  assert.equal(sideToolActivity({type:'agentMessage'}),null);
});


test('a closed ephemeral fork settles its pending question and removes its route', async () => {
  const client=fakeClient(),events=[];const side=createNativeSideChat({getClient:()=>client,emit:e=>events.push(e)});
  const pending=side.ask({threadId:'parent',requestId:'closed',question:'q',history:[]});await new Promise(r=>setImmediate(r));
  side.observe({method:'item/agentMessage/delta',params:{threadId:'fork-1',turnId:'turn-1',delta:'partial'}});
  assert.equal(side.observe({method:'thread/closed',params:{threadId:'fork-1'}}),true);
  assert.deepEqual(await pending,{text:'partial',closed:true});assert.equal(side.isFork('fork-1'),false);
  const count=events.length;await side.cancel({requestId:'closed'});assert.equal(events.length,count);
});


for(const action of ['closed','cancelled'])test(`${action} during boundary setup settles without starting a late turn`, async () => {
  const client=fakeClient(),base=client.request.bind(client);let release;const gate=new Promise(r=>release=r);
  client.request=async(method,params)=>{const result=await base(method,params);if(method==='thread/inject_items')await gate;return result;};
  const events=[],side=createNativeSideChat({getClient:()=>client,emit:e=>events.push(e)});
  const pending=side.ask({threadId:'parent',requestId:action,question:'q',history:[]});await new Promise(r=>setImmediate(r));
  if(action==='closed')side.observe({method:'thread/closed',params:{threadId:'fork-1'}});else await side.cancel({requestId:action});
  assert.deepEqual(await pending,{text:'',...(action==='closed'?{closed:true}:{})});release();await new Promise(r=>setImmediate(r));
  assert.equal(client.calls.some(c=>c.method==='turn/start'),false);assert.deepEqual(events.map(e=>e.params.stage),['forking']);assert.equal(side.isFork('fork-1'),false);
});

test('replacement forks recover visible side history exactly once and a clear starts clean', async()=>{
 const client=fakeClient(),side=createNativeSideChat({getClient:()=>client,emit:()=>{}});
 let answer=side.ask({threadId:'main',question:'remember violet',history:[],requestId:'first'});await new Promise(r=>setImmediate(r));
 side.observe({method:'item/completed',params:{threadId:'fork-1',turnId:'turn-1',item:{type:'agentMessage',text:'The code is violet.'}}});
 side.observe({method:'turn/completed',params:{threadId:'fork-1',turn:{id:'turn-1',status:'completed'}}});await answer;
 side.observe({method:'thread/closed',params:{threadId:'fork-1'}});
 const history=[{question:'remember violet',answer:'The code is violet.'}];
 answer=side.ask({threadId:'main',question:'what code?',history,requestId:'recover'});await new Promise(r=>setImmediate(r));
 let start=client.calls.filter(c=>c.method==='turn/start').at(-1).params;
 assert.equal(start.threadId,'fork-2');assert.ok(start.input[0].text.includes('Assistant: The code is violet.'));assert.ok(start.input[0].text.includes('User: what code?'));
 assert.deepEqual(start.sandboxPolicy,{type:'readOnly',networkAccess:false});
 side.observe({method:'turn/completed',params:{threadId:'fork-2',turn:{id:'turn-2',status:'completed'}}});await answer;
 answer=side.ask({threadId:'main',question:'healthy follow up',history,requestId:'follow'});await new Promise(r=>setImmediate(r));
 start=client.calls.filter(c=>c.method==='turn/start').at(-1).params;assert.equal(start.threadId,'fork-2');assert.equal(start.input[0].text,'healthy follow up');
 await side.cancel({requestId:'follow'});await answer;
 answer=side.ask({threadId:'main',question:'new conversation',history:[],requestId:'clear'});await new Promise(r=>setImmediate(r));
 start=client.calls.filter(c=>c.method==='turn/start').at(-1).params;assert.equal(start.threadId,'fork-3');assert.equal(start.input[0].text,'new conversation');
 await side.cancel({requestId:'clear'});await answer;
});

test('reconnection restores history after the read-only boundary even when inject_items is unsupported',async()=>{
 let client=fakeClient(),side=createNativeSideChat({getClient:()=>client,emit:()=>{}});
 const first=side.ask({threadId:'main',question:'q',history:[],requestId:'first'});await new Promise(r=>setImmediate(r));
 side.observe({kind:'connection',connected:false});assert.deepEqual(await first,{status:'not_connected'}); // r6-composer-06: cccc2cf0a SF not_connected
 client=fakeClient({injectFails:true});
 const next=side.ask({threadId:'main',question:'continue',history:[{question:'old question',answer:'old answer'}],requestId:'next'});await new Promise(r=>setImmediate(r));
 const text=client.calls.find(c=>c.method==='turn/start').params.input[0].text;
 assert.ok(text.startsWith(SIDE_BOUNDARY_PROMPT+'\n\n<side_chat_history>'));assert.ok(text.includes('Assistant: old answer'));assert.ok(text.includes('User: continue'));
 assert.equal(client.calls.filter(c=>c.method==='thread/fork').length,1);await side.cancel({requestId:'next'});await next;
});

test('custom instructions suppress boundary injection and recovery directions but retain historical data',async()=>{
 const client=fakeClient(),side=createNativeSideChat({getClient:()=>client,emit:()=>{},customPrompt:()=>true});
 const answer=side.ask({threadId:'main',question:'follow up',history:[{question:'earlier question',answer:'earlier answer'}],requestId:'custom'});await new Promise(r=>setImmediate(r));
 assert.equal(client.calls.some(c=>c.method==='thread/inject_items'),false);
 assert.equal('developerInstructions' in client.calls.find(c=>c.method==='thread/fork').params,false);
 const text=client.calls.find(c=>c.method==='turn/start').params.input[0].text;
 assert.ok(text.includes('earlier answer'));assert.ok(text.endsWith('\n\nfollow up'));
 assert.ok(!text.includes(SIDE_BOUNDARY_PROMPT));assert.ok(!text.includes('restarted after an error'));
 await side.cancel({requestId:'custom'});await answer;
});
