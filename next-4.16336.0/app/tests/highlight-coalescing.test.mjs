import test from 'node:test';
import assert from 'node:assert/strict';
const {createHighlightService}=await import(process.env.HIGHLIGHT_SERVICE_TEST_PATH||'../src/highlight-service.mjs');
import {createHighlightBinding} from '../src/highlight-binding.mjs';
import {nodeWorkerFactory} from './fixtures/highlight-node-worker-adapter.mjs';
const input=(text='const x = 1;',language='js')=>({text,language});
class FakeWorker{
 listeners=new Map();messages=[];terminated=false;
 addEventListener(name,fn){this.listeners.set(name,fn);}removeEventListener(name,fn){if(this.listeners.get(name)===fn)this.listeners.delete(name);}
 postMessage(message){this.messages.push(message);}terminate(){this.terminated=true;}
 reply(){const {id,input}=this.messages.at(-1);this.listeners.get('message')?.({data:{id,status:'highlighted',language:input.language,tokens:[{text:input.text,light:{color:'#777777',fontStyle:0},dark:{color:'#888888',fontStyle:0}}]}});}
 fail(){this.listeners.get('error')?.({});}
}
function harness(options={}){const workers=[];return{workers,service:createHighlightService({createWorker(){const worker=new FakeWorker();workers.push(worker);return worker;},...options})};}
function observedSignal(){const listeners=new Set();return{aborted:false,addEventListener(name,fn){assert.equal(name,'abort');listeners.add(fn);},removeEventListener(name,fn){listeners.delete(fn);},abort(){if(this.aborted)return;this.aborted=true;for(const fn of [...listeners])fn();},get listeners(){return listeners.size;}};}
const microtasks=async()=>{await Promise.resolve();await Promise.resolve();};
const samples=[input('// Installed JavaScript\nconst message = "hello";'),input('type User = { name: string };','ts'),input('{"ready":true,"count":42}','json'),input('def greet(name):\n    return "Hello " + name','python'),input('# Shell sample\necho "hello"','bash')];
const long=input(Array.from({length:90},(_,i)=>`// Scroll sample ${String(i+1).padStart(2,'0')}`).join('\n'));

test('eleven mounted user/assistant blocks with six distinct keys all reach highlighted',async()=>{
 const {service,workers}=harness();
 try{
  const requests=[...samples,...samples,long].map(value=>service.request(value));
  while(service.inspect().active)workers.at(-1).reply();
  const results=await Promise.all(requests);
  assert.equal(results.filter(result=>result.status==='highlighted').length,11,'No eligible duplicate consumer or final90-line block is permanently queue-limit plain');
  assert.equal(workers.reduce((sum,worker)=>sum+worker.messages.length,0),6,'Only exact distinct canonical work is dispatched');
  for(let i=0;i<5;i++)assert.equal(results[i],results[i+5]);
  assert.equal(results.at(-1).tokens.map(token=>token.text).join(''),long.text);
 }finally{service.dispose();}
});
test('normalized language aliases coalesce; exact bytes and distinct languages do not',async()=>{
 const {service,workers}=harness();try{
  const a=service.request(input('x','js')),b=service.request(input('x','javascript')),c=service.request(input('x\n','js')),d=service.request(input('x','ts'));
  assert.equal(service.inspect().sharedJobs,3);while(service.inspect().active)workers.at(-1).reply();
  const results=await Promise.all([a,b,c,d]);assert.equal(results[0],results[1]);assert.notEqual(results[0],results[2]);assert.equal(results[3].language,'typescript');
 }finally{service.dispose();}
});
test('full distinct queue still accepts active and queued duplicates without increasing jobs',async()=>{
 const {service,workers}=harness({maxQueued:1});try{
  const a=service.request(input('a')),b=service.request(input('b')),aa=service.request(input('a')),bb=service.request(input('b'));
  assert.equal((await service.request(input('c'))).reason,'queue-limit');assert.equal(service.inspect().queued,1);assert.equal(service.inspect().subscribers,4);
  workers[0].reply();workers[0].reply();const results=await Promise.all([a,b,aa,bb]);assert.equal(results[0],results[2]);assert.equal(results[1],results[3]);assert.equal(workers[0].messages.length,2);
 }finally{service.dispose();}
});
test('one active subscriber abort does not terminate shared worker or cancel another view',async()=>{
 const {service,workers}=harness(),aSignal=observedSignal(),bSignal=observedSignal();try{
  const a=service.request(input(),{signal:aSignal}),b=service.request(input(),{signal:bSignal});aSignal.abort();
  assert.equal((await a).reason,'cancelled');assert.equal(workers[0].terminated,false);assert.equal(service.inspect().subscribers,1);assert.equal(aSignal.listeners,0);
  workers[0].reply();assert.equal((await b).status,'highlighted');assert.equal(bSignal.listeners,0);assert.equal(service.inspect().sharedJobs,0);
  bSignal.abort();assert.equal(workers[0].terminated,false);
 }finally{service.dispose();}
});
test('queued job disappears only after its last subscriber aborts',async()=>{
 const {service,workers}=harness(),one=observedSignal(),two=observedSignal();try{
  const a=service.request(input('active')),b=service.request(input('queued'),{signal:one}),c=service.request(input('queued'),{signal:two});
  one.abort();assert.equal((await b).reason,'cancelled');assert.equal(service.inspect().queued,1);two.abort();assert.equal((await c).reason,'cancelled');assert.equal(service.inspect().queued,0);assert.equal(service.inspect().sharedJobs,1);assert.equal(workers[0].terminated,false);
  workers[0].reply();await a;assert.equal(workers[0].messages.length,1);
 }finally{service.dispose();}
});
test('last active subscriber abort terminates underlying work and late prior generation cannot resolve replacement',async()=>{
 const {service,workers}=harness(),one=observedSignal(),two=observedSignal();try{
  const a=service.request(input('same'),{signal:one}),b=service.request(input('same'),{signal:two}),oldListener=workers[0].listeners.get('message');
  one.abort();assert.equal(workers[0].terminated,false);two.abort();await Promise.all([a,b]);assert.equal(workers[0].terminated,true);assert.equal(service.inspect().sharedJobs,0);
  let settled=false;const next=service.request(input('same')).then(result=>{settled=true;return result;});
  oldListener({data:{id:workers[1].messages[0].id,status:'plain',reason:'old-generation'}});await microtasks();assert.equal(settled,false);
  workers[1].reply();assert.equal((await next).status,'highlighted');
 }finally{service.dispose();}
});
test('32 subscribers per active or queued job is a hard bound and rejection does not consume a slot',async()=>{
 const {service,workers}=harness();try{
  for(const text of ['active','queued']){
   const pending=Array.from({length:32},()=>service.request(input(text)));
   assert.equal((await service.request(input(text))).reason,'subscriber-limit');
   if(text==='active')workers[0].reply();else workers.at(-1).reply();
   assert.ok((await Promise.all(pending)).every(result=>result.status==='highlighted'));
  }
  // True queued path with the preceding active job held.
  const hold=service.request(input('hold')),queued=Array.from({length:32},()=>service.request(input('behind')));
  assert.equal((await service.request(input('behind'))).reason,'subscriber-limit');assert.equal(service.inspect().queued,1);assert.equal(service.inspect().subscribers,33);
  workers.at(-1).reply();workers.at(-1).reply();await hold;await Promise.all(queued);
  assert.equal(service.inspect().subscribers,0);
 }finally{service.dispose();}
});
test('joining a running job does not restart its hard deadline, errors clear map and all listeners',async()=>{
 const timers=new Map();let id=0;const {service,workers}=harness({deadlineMs:1234,schedule:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},cancelTimer:id=>timers.delete(id)}),aSignal=observedSignal(),bSignal=observedSignal();try{
  const a=service.request(input(),{signal:aSignal}),before=[...timers.keys()],b=service.request(input(),{signal:bSignal});assert.deepEqual([...timers.keys()],before);
  [...timers.values()].find(timer=>timer.delay===1234).fn();const results=await Promise.all([a,b]);assert.ok(results.every(result=>result.reason==='timeout'));assert.equal(results[0],results[1]);assert.ok(Object.isFrozen(results[0]));assert.equal(aSignal.listeners+bSignal.listeners,0);assert.equal(service.inspect().sharedJobs,0);
  const c=service.request(input()),d=service.request(input());workers.at(-1).fail();assert.ok((await Promise.all([c,d])).every(result=>result.reason==='worker-error'));assert.equal(service.inspect().subscribers,0);
  const e=service.request(input());workers.at(-1).reply();assert.equal((await e).status,'highlighted');
 }finally{service.dispose();}
});
test('cancelAll and dispose settle all subscribers and release per-view abort hooks',async()=>{
 const {service}=harness();const signals=Array.from({length:4},observedSignal),pending=signals.map((signal,i)=>service.request(input(i<2?'a':'b'),{signal}));
 service.cancelAll();assert.ok((await Promise.all(pending)).every(result=>result.reason==='cancelled'));assert.equal(service.inspect().sharedJobs,0);assert.ok(signals.every(signal=>signal.listeners===0));
 const again=service.request(input('a')),duplicate=service.request(input('a'));service.dispose();assert.ok((await Promise.all([again,duplicate])).every(result=>result.reason==='disposed'));assert.equal(service.inspect().sharedJobs,0);assert.equal((await service.request(input())).reason,'disposed');
});
test('independent binding scope replacement cannot cancel or paint another shared consumer',async()=>{
 const {service,workers}=harness(),left=[],right=[];
 const a=createHighlightBinding({service,onResult:(value,result)=>left.push({value,result})}),b=createHighlightBinding({service,onResult:(value,result)=>right.push({value,result})});
 try{
  a.update({...input('same'),scopeKey:'session-a'});b.update({...input('same'),scopeKey:'session-b'});a.update({...input('new'),scopeKey:'session-c'});
  assert.equal(workers[0].terminated,false);workers[0].reply();await microtasks();assert.equal(right.at(-1).result.status,'highlighted');assert.equal(left.at(-1).result,null);
  workers[0].reply();await microtasks();assert.equal(left.at(-1).value.scopeKey,'session-c');assert.equal(left.at(-1).result.tokens[0].text,'new');
 }finally{a.dispose();b.dispose();service.dispose();}
});
test('actual worker handles11 consumers/6 keys and90 comment lines without queue plain', {timeout:10000},async()=>{
 const records=[],service=createHighlightService({createWorker:nodeWorkerFactory(records)});
 try{
  const values=[...samples,...samples,long],results=await Promise.all(values.map(value=>service.request(value)));
  assert.equal(results.length,11);for(let i=0;i<results.length;i++){assert.equal(results[i].status,'highlighted',JSON.stringify(results[i]));assert.equal(results[i].tokens.map(token=>token.text).join(''),values[i].text);}
  assert.equal(records.length,1);assert.equal(results.at(-1).tokens.filter(token=>token.text.startsWith('//')).length,90);assert.ok(results.at(-1).tokens.find(token=>token.text.startsWith('//')).light.color!=='#1a1a1a');
 }finally{service.dispose();await Promise.all(records.map(record=>record.exit));}
 assert.ok(records.every(record=>record.terminated&&record.raw.threadId===-1));
});
