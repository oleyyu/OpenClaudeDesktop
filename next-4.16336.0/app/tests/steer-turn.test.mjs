import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { steerTurn }=createRequire(import.meta.url)('../electron/steer-turn.cjs');
const expected={connectionId:'one',connectionEpoch:1};
const payload={threadId:'child',expectedTurnId:'child-turn',input:[{type:'text',text:'Next'}],clientUserMessageId:'user',expected};
function harness(){
  const calls=[],connection={closed:false,approvalConnectionId:'one',approvalConnectionEpoch:1};
  const owner={connection,approvalSnapshot:()=>({closed:false}),start:async()=>calls.push(['start']),request:async(...args)=>{calls.push(args);return {turnId:'child-turn'};}};
  return {calls,connection,owner};
}
test('bound steer sends on the exact existing connection with child wire parameters',async()=>{
  const h=harness();const result=await steerTurn(h.owner,payload);
  assert.equal(result.ok,true);assert.deepEqual(h.calls,[['turn/steer',{threadId:'child',expectedTurnId:'child-turn',input:payload.input,clientUserMessageId:'user'},120000,h.connection]]);
});
test('stale or closed bound steer never starts or writes a replacement client',async()=>{
  for(const patch of [{closed:true},{approvalConnectionId:'two'},{approvalConnectionEpoch:2}]){
    const h=harness();Object.assign(h.connection,patch);await assert.rejects(steerTurn(h.owner,payload),/connection changed/);assert.equal(h.calls.length,0);
  }
});
test('reconnection during asynchronous input preparation prevents dispatch',async()=>{
  const h=harness();await assert.rejects(steerTurn(h.owner,payload,{prepareInput:async input=>{h.owner.connection={...h.connection};return input;}}),/connection changed/);assert.equal(h.calls.length,0);
});
test('structured non-steerable failure survives IPC; accepted bookkeeping failure does not cause retry',async()=>{
  const h=harness();h.owner.request=async()=>{throw Object.assign(new Error('not steerable'),{code:-32000,data:{codexErrorInfo:'activeTurnNotSteerable'}});};
  assert.deepEqual(await steerTurn(h.owner,payload),{ok:false,message:'not steerable',code:-32000,data:{codexErrorInfo:'activeTurnNotSteerable'}});
  const accepted=harness();assert.equal((await steerTurn(accepted.owner,payload,{accepted:async()=>{throw new Error('metadata failed');}})).ok,true);assert.equal(accepted.calls.length,1);
});
test('existing unbound callers retain client startup and prepared input',async()=>{
  const h=harness();await steerTurn(h.owner,{...payload,expected:undefined},{prepareInput:async()=>[{type:'text',text:'Prepared'}]});
  assert.equal(h.calls[0][0],'start');assert.equal(h.calls[1][1].input[0].text,'Prepared');
});
