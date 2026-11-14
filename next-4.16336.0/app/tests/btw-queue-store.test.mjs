import test from 'node:test';
import assert from 'node:assert/strict';
import { createBtwQueueStore } from '../src/btw-queue-store.mjs';

const textInput = text => [{type:'text',text,text_elements:[]}];
const entry = (id,text=id) => ({id,input:textInput(text),clientUserMessageId:`client-${id}`});
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(handler) {
  const calls=[],restored=[],errors=[],rows={child:[],sibling:[]}; let counter=0;
  const host={epoch:'one',expected:{connectionId:'one',connectionEpoch:1},connected:true,supported:true,archived:false,turnId:'child-turn',items:[]};
  const store=createBtwQueueStore({context:id=>({...host,call:async(action,p)=>{
    calls.push({action,...p});
    if(handler){const result=await handler(action,p);if(result!==undefined)return result;}
    if(action==='steer')return {ok:true,result:{turnId:p.expectedTurnId}};
    const id=p.params.threadId;
    if(p.method==='thread/queue/list')return {data:rows[id]??[]};
    if(p.method==='thread/queue/add'){const next=entry(`new-${++counter}`);next.input=p.params.input;next.clientUserMessageId=p.params.clientUserMessageId;rows[id].push(next);return {queuedSubmission:next};}
    if(p.method==='thread/queue/delete'){const exists=rows[id].some(e=>e.id===p.params.queuedSubmissionId);rows[id]=rows[id].filter(e=>e.id!==p.params.queuedSubmissionId);return {deleted:exists};}
    if(p.method==='thread/queue/reorder'){rows[id]=p.params.queuedSubmissionIds.map(key=>rows[id].find(e=>e.id===key));return {};}
    throw new Error(p.method);
  }}),restore:(...args)=>restored.push(args),onError:message=>errors.push(message),uuid:()=>`uuid-${++counter}`});
  return {store,host,calls,restored,errors,rows};
}
test('Enter steers the child, Cmd+Enter queues it, and every request binds its connection',async()=>{
  const h=harness();await h.store.send('child','Next');await tick();
  assert.equal(h.calls[0].action,'steer');assert.equal(h.calls[0].expectedTurnId,'child-turn');
  assert.equal(h.store.getSnapshot().child.pending[0].text,'Next');
  await h.store.send('child','Later',{priority:'later'});await tick();
  assert.equal(h.rows.child[0].input[0].text,'Later');
  assert.ok(h.calls.every(c=>(c.threadId??c.params.threadId)==='child'));
  assert.ok(h.calls.every(c=>c.expected.connectionEpoch===1));
  assert.deepEqual(h.calls.filter(c=>c.action==='steer').map(c=>c.input[0].text),['Next']);
});
test('only explicit non-steerable refusal falls back to queue, retaining the message ID',async()=>{
  const h=harness(async action=>action==='steer'?{ok:false,message:'not steerable',data:{codexErrorInfo:'activeTurnNotSteerable'}}:undefined);
  await h.store.send('child','Question');await tick();
  const steer=h.calls.find(c=>c.action==='steer'),add=h.calls.find(c=>c.method==='thread/queue/add');
  assert.equal(add.params.clientUserMessageId,steer.clientUserMessageId);assert.equal(h.store.getSnapshot().child.pending.length,0);
  const rejected=harness(async action=>action==='steer'?{ok:false,message:'network uncertainty'}:undefined);
  await assert.rejects(rejected.store.send('child','Question'),/uncertainty/);await tick();
  assert.equal(rejected.calls.some(c=>c.method==='thread/queue/add'),false);
});
test('a reconnect between a refused steer and queue fallback cannot send into replacement connection',async()=>{
  let h;h=harness(async action=>{if(action==='steer'){h.host.epoch='two';return {ok:false,message:'not steerable'};}});
  await assert.rejects(h.store.send('child','Question'),/connection changed/);
  assert.equal(h.calls.length,1);
});
test('interrupted undelivered steers restore to their child only and exactly once',async()=>{
  const h=harness();await h.store.send('child','Question');await tick();
  const complete={method:'turn/completed',params:{threadId:'child',turn:{id:'child-turn',status:'interrupted'}}};
  h.store.observe({...complete,params:{...complete.params,threadId:'parent'}});assert.equal(h.restored.length,0);
  h.store.observe({...complete,params:{...complete.params,turn:{id:'older-turn',status:'interrupted'}}});assert.equal(h.restored.length,0);
  h.store.observe(complete);h.store.observe(complete);await tick();
  assert.deepEqual(h.restored,[['child','Question']]);assert.equal(h.store.getSnapshot().child.pending.length,0);
});
test('delivered ID and text-fallback messages never return to the draft after Stop',async()=>{
  for(const byId of [true,false]){
    const h=harness();await h.store.send('child','Question');await tick();
    const pending=h.store.getSnapshot().child.pending[0];
    h.store.observe({method:'item/started',params:{threadId:'child',item:{id:'row',type:'userMessage',...(byId?{clientId:pending.id}:{}),content:textInput('Question')}}});
    h.store.observe({method:'turn/completed',params:{threadId:'child',turn:{id:'child-turn',status:'interrupted'}}});await tick();
    assert.equal(h.restored.length,0);assert.equal(h.store.getSnapshot().child.pending.length,0);
  }
});
test('completion and delivery can precede the steer acknowledgment without losing or duplicating a draft',async()=>{
  for(const delivered of [true,false]){
    let resolve;const gate=new Promise(r=>resolve=r),h=harness(action=>action==='steer'?gate:undefined);
    const pending=h.store.send('child','Question');
    h.store.observe({method:'turn/completed',params:{threadId:'child',turn:{id:'child-turn',status:'interrupted',items:delivered?[{id:'row',type:'userMessage',clientId:h.calls[0].clientUserMessageId,content:textInput('Question')}]:[]}}});
    assert.equal(h.restored.length,0);resolve({ok:true});await pending;await tick();
    assert.equal(h.restored.length,delivered?0:1);
  }
});
test('repeated same text already present at send is not mistaken for new delivery',async()=>{
  const h=harness();h.host.items=[{id:'old',type:'userMessage',content:textInput('Again')}];
  await h.store.refresh('child');h.store.observe({method:'item/completed',params:{threadId:'child',item:h.host.items[0]}});
  await h.store.send('child','Again');await tick();
  h.store.observe({method:'turn/completed',params:{threadId:'child',turn:{id:'child-turn',status:'interrupted'}}});await tick();
  assert.deepEqual(h.restored,[['child','Again']]);
});
test('one delivered row cannot consume two pending steers with identical words',async()=>{
  const h=harness();await h.store.send('child','Again');await tick();await h.store.send('child','Again');await tick();
  const item={id:'one-row',type:'userMessage',content:textInput('Again')};
  h.store.observe({method:'item/started',params:{threadId:'child',item}});
  h.store.observe({method:'item/completed',params:{threadId:'child',item}});
  h.store.observe({method:'turn/completed',params:{threadId:'child',turn:{id:'child-turn',status:'interrupted'}}});await tick();
  assert.deepEqual(h.restored,[['child','Again']]);
});
test('queue edit restores only after confirmed deletion; already consumed entries are not duplicated',async()=>{
  const h=harness();h.rows.child=[entry('one','First'),entry('two','Second')];await h.store.refresh('child');
  await h.store.remove('child','one',true);await tick();assert.deepEqual(h.restored,[['child','First',true]]);
  h.rows.child=[];await h.store.remove('child','two',true);await tick();assert.equal(h.restored.length,1);
});
test('cannot lose attachment entries through a text-only side composer',async()=>{
  const h=harness();h.rows.child=[{...entry('image'),input:[{type:'localImage',path:'/image.png'}]}];await h.store.refresh('child');
  await assert.rejects(h.store.remove('child','image',true),/attachments/);await tick();
  assert.equal(h.rows.child.length,1);assert.equal(h.calls.some(c=>c.method==='thread/queue/delete'),false);
});
test('queue reorder is child-local and a failed reorder preserves the old order',async()=>{
  const h=harness();h.rows.child=[entry('one'),entry('two')];await h.store.refresh('child');await h.store.reorder('child','two','one');await tick();
  assert.deepEqual(h.store.getSnapshot().child.queue.entries.map(e=>e.id),['two','one']);
  const failed=harness(async(_a,p)=>{if(p.method==='thread/queue/reorder')throw new Error('reorder refused');});
  failed.rows.child=[entry('one'),entry('two')];await failed.store.refresh('child');await assert.rejects(failed.store.reorder('child','two','one'),/refused/);await tick();
  assert.deepEqual(failed.store.getSnapshot().child.queue.entries.map(e=>e.id),['one','two']);
});
test('Clear all serializes its captured entries and preserves entries added during removal',async()=>{
  let h;h=harness(async(_a,p)=>{if(p.method==='thread/queue/delete'&&p.params.queuedSubmissionId==='one')h.rows.child.push(entry('later'));});
  h.rows.child=[entry('one'),entry('two'),entry('three')];await h.store.refresh('child');await h.store.clear('child');await tick();
  assert.deepEqual(h.calls.filter(c=>c.method==='thread/queue/delete').map(c=>c.params.queuedSubmissionId),['one','two','three']);
  assert.deepEqual(h.store.getSnapshot().child.queue.entries.map(e=>e.id),['later']);assert.equal(h.restored.length,0);
});
test('Send now removes then steers; explicit refusal requeues at the original slot',async()=>{
  for(const refuse of [false,true]){
    const h=harness(async action=>action==='steer'&&refuse?{ok:false,message:'not steerable'}:undefined);
    h.rows.child=[entry('one'),entry('two'),entry('three')];await h.store.refresh('child');
    const result=h.store.promote('child','two');if(refuse)await assert.rejects(result,/stays queued/);else await result;await tick();
    assert.deepEqual(h.rows.child.map(e=>e.input[0].text),refuse?['one','two','three']:['one','three']);
    assert.equal(h.calls.find(c=>c.action==='steer').clientUserMessageId,'client-two');
  }
});
test('Send now never resends an entry already consumed by the queue',async()=>{
  const h=harness();h.rows.child=[entry('one')];await h.store.refresh('child');h.rows.child=[];
  await h.store.promote('child','one');await tick();
  assert.equal(h.calls.some(c=>c.action==='steer'),false);assert.equal(h.restored.length,0);
});
test('transport uncertainty after removal restores the child text without an automatic second send',async()=>{
  const h=harness(async action=>{if(action==='steer')throw new Error('transport closed');});
  h.rows.child=[entry('one')];await h.store.refresh('child');await assert.rejects(h.store.promote('child','one'),/transport closed/);await tick();
  assert.deepEqual(h.restored,[['child','one']]);assert.equal(h.calls.some(c=>c.method==='thread/queue/add'),false);
});
test('requeue accepted but reorder failed does not also restore a duplicate draft',async()=>{
  const h=harness(async(action,p)=>{
    if(action==='steer')return {ok:false,message:'not steerable'};
    if(p.method==='thread/queue/reorder')throw new Error('reorder refused');
  });
  h.rows.child=[entry('one'),entry('two')];await h.store.refresh('child');await assert.rejects(h.store.promote('child','one'),/reorder refused/);await tick();
  assert.equal(h.restored.length,0);assert.deepEqual(h.rows.child.map(e=>e.input[0].text),['two','one']);
});
test('a confirmed accepted steer stays accepted across a later connection change',async()=>{
  let h;h=harness(async action=>{if(action==='steer'){h.host.epoch='two';return {ok:true,result:{turnId:'child-turn'}};}});
  assert.equal((await h.store.send('child','Accepted')).ok,true);assert.equal(h.restored.length,0);assert.equal(h.calls.length,1);
});
test('overlapping child queue mutations are refused; the other child remains independent',async()=>{
  let resolve;const gate=new Promise(r=>resolve=r),h=harness((action,p)=>action==='steer'&&p.threadId==='child'?gate:undefined);
  const sending=h.store.send('child','First');await assert.rejects(h.store.send('child','Duplicate'),/Wait/);
  await h.store.send('sibling','Other',{priority:'later'});resolve({ok:true});await sending;await tick();
  assert.equal(h.calls.filter(c=>c.action==='steer').length,1);assert.equal(h.rows.sibling.length,1);
});
test('paginated list is complete, and a stale read cannot overwrite a newer snapshot',async()=>{
  let delayed,reads=0;const h=harness(async(_a,p)=>{
    if(p.method!=='thread/queue/list')return;
    if(++reads===1)return new Promise(resolve=>delayed=resolve);
    return p.params.cursor?{data:[entry('second')]}:{data:[entry('first')],nextCursor:'page-two'};
  });
  const old=h.store.refresh('child');await h.store.refresh('child');delayed({data:[entry('stale')]});await old;
  assert.deepEqual(h.store.getSnapshot().child.queue.entries.map(e=>e.id),['first','second']);
});
test('unsupported, archived, or disconnected children refuse queue mutations',async()=>{
  for(const patch of [{supported:false},{archived:true},{connected:false}]){
    const h=harness();Object.assign(h.host,patch);await assert.rejects(h.store.send('child','No'),/active session/);assert.equal(h.calls.length,0);
  }
});
