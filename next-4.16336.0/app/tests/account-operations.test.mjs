import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {createAccountOperations}=createRequire(import.meta.url)('../electron/account-operations.cjs');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const calls=[],states=[],accounts=[],opened=[];let handler=async method=>method==='account/read'?{account:{type:'chatgpt',email:'fixture@example.test'},requiresOpenaiAuth:true}:method==='account/login/cancel'?{status:'canceled'}:method==='account/logout'?{}:{type:'chatgpt',loginId:'login-1',authUrl:'https://auth.example.test/signin'};
 let owner={start:async()=>{},request:async(method,params)=>{calls.push({method,params});return handler(method,params);}};
 let opener=async value=>opened.push(value);
 const service=createAccountOperations({getClient:()=>owner,openExternal:value=>opener(value),onState:s=>states.push(s),onAccount:a=>accounts.push(a)});
 return {service,calls,states,accounts,opened,setHandler:fn=>handler=fn,setOpener:fn=>opener=fn,replace:()=>owner={start:async()=>{},request:async()=>{throw Error('Unexpected new owner request');}}};
}
test('browser login keeps true id, ignores unrelated completions, and only succeeds with a fresh actual account read',async()=>{
 const f=fixture();await f.service.start();assert.deepEqual(f.calls[0],{method:'account/login/start',params:{type:'chatgpt'}});assert.equal(f.service.snapshot().phase,'waiting');assert.equal(f.service.snapshot().login.loginId,'login-1');assert.deepEqual(f.opened,['https://auth.example.test/signin']);
 f.service.observe({method:'account/login/completed',params:{loginId:'other',success:true}});assert.equal(f.calls.length,1);
 f.service.observe({method:'account/login/completed',params:{loginId:'login-1',success:true}});await tick();assert.equal(f.service.snapshot().phase,'idle');assert.equal(f.service.snapshot().login,null);assert.equal(f.accounts[0].account.email,'fixture@example.test');assert.deepEqual(f.calls.at(-1),{method:'account/read',params:{refreshToken:false}});
});
test('completion before start reply is matched by id and never opens an already-completed browser flow',async()=>{
 const f=fixture(),wait=deferred();f.setHandler(async method=>method==='account/login/start'?wait.promise:{account:null,requiresOpenaiAuth:true});
 const run=f.service.start();await tick();f.service.observe({method:'account/login/completed',params:{loginId:'early',success:true}});wait.resolve({type:'chatgpt',loginId:'early',authUrl:'https://auth.example.test'});await run;assert.equal(f.service.snapshot().phase,'idle');assert.equal(f.opened.length,0);assert.equal(f.accounts.length,1);
});
test('device code and launch failures retain cancellable attempt, retry opens the same url and failure events do not report success',async()=>{
 const f=fixture();f.setHandler(async method=>method==='account/login/cancel'?{status:'canceled'}:{type:'chatgptDeviceCode',loginId:'device',verificationUrl:'https://auth.example.test/device',userCode:'ABCD-5678'});f.setOpener(async()=>{throw Error('Browser unavailable');});await assert.rejects(f.service.start('chatgptDeviceCode'),/Browser unavailable/);assert.equal(f.service.snapshot().login.userCode,'ABCD-5678');assert.equal(f.service.snapshot().phase,'waiting');
 f.setOpener(async url=>f.opened.push(url));await f.service.reopen();assert.equal(f.service.snapshot().error,'');assert.deepEqual(f.opened,['https://auth.example.test/device']);
 f.service.observe({method:'account/login/completed',params:{loginId:'device',success:false,error:'Code expired'}});await tick();assert.equal(f.service.snapshot().error,'Code expired');assert.equal(f.accounts.length,0);await f.service.start('chatgptDeviceCode');await f.service.cancel();assert.deepEqual(f.calls.at(-1),{method:'account/login/cancel',params:{loginId:'device'}});assert.equal(f.service.snapshot().login,null);
});
test('duplicate starts and unsafe URLs cannot open another flow; invalid URL still allows real-id cancellation',async()=>{
 const f=fixture();f.setHandler(async method=>method==='account/login/cancel'?{status:'canceled'}:{type:'chatgpt',loginId:'bad-url',authUrl:'javascript:alert(1)'});await assert.rejects(f.service.start(),/Invalid sign-in URL/);assert.equal(f.opened.length,0);await assert.rejects(f.service.start(),/Finish or cancel/);await f.service.cancel();assert.equal(f.service.snapshot().phase,'idle');await assert.rejects(f.service.start('apiKey'),/valid API key/);
});
test('cancel notFound reconciles an already completed login; a late old completion cannot clear a newer attempt',async()=>{
 const f=fixture(),wait=deferred();await f.service.start();f.setHandler(async method=>method==='account/login/cancel'?wait.promise:{account:null,requiresOpenaiAuth:true});const run=f.service.cancel();f.service.observe({method:'account/login/completed',params:{loginId:'login-1',success:true}});wait.resolve({status:'notFound'});await run;assert.equal(f.accounts.length,1);assert.equal(f.service.snapshot().phase,'idle');
 f.setHandler(async()=>({type:'chatgpt',loginId:'new-login',authUrl:'https://auth.example.test/new'}));await f.service.start();f.service.observe({method:'account/login/completed',params:{loginId:'login-1',success:false,error:'Old cancellation'}});assert.equal(f.service.snapshot().login.loginId,'new-login');assert.equal(f.service.snapshot().error,'');
});
test('connection replacement fences pending login, stale snapshots and stale read failures',async()=>{
 const f=fixture(),wait=deferred();f.setHandler(()=>wait.promise);const start=f.service.start();await tick();f.service.observe({kind:'connection',connected:false});f.replace();wait.resolve({type:'chatgpt',loginId:'old',authUrl:'https://auth.example.test'});await assert.rejects(start,/connection changed/);assert.equal(f.opened.length,0);assert.equal(f.service.snapshot().phase,'idle');
 const g=fixture(),read=deferred();g.setHandler(()=>read.promise);g.service.observe({method:'account/updated'});await tick();g.service.observe({kind:'connection',connected:false});g.replace();read.reject(Error('Old read failure'));await tick();assert.equal(g.service.snapshot().error,'');assert.equal(g.accounts.length,0);
});
test('sign out requires confirmation, invalidates cached identity and reads actual residual credentials; failed reads remain unknown',async()=>{
 const f=fixture();await assert.rejects(f.service.logout(false),/Confirm/);assert.equal(f.calls.length,0);
 f.setHandler(async method=>method==='account/logout'?{}:{account:{type:'apiKey'},requiresOpenaiAuth:false});await f.service.logout(true);assert.deepEqual(f.calls.map(x=>x.method),['account/logout','account/read']);assert.equal(f.accounts[0],null);assert.equal(f.accounts[1].account.type,'apiKey');assert.equal(f.service.snapshot().phase,'idle');
 f.setHandler(async method=>{if(method==='account/read')throw Error('Account read failed');return {};});await assert.rejects(f.service.logout(true),/Account read failed/);assert.equal(f.accounts.at(-1),null);assert.equal(f.service.snapshot().error,'Account read failed');
});
test('a sign out that leaves something signed in elsewhere publishes its notice until the next operation',async()=>{
 const f=fixture();f.setHandler(async method=>method==='account/logout'?{codeDesktop:{notice:'Claude Code itself stays signed in: run `claude auth logout` in a terminal to sign out of your Claude account.'}}:{account:null,requiresOpenaiAuth:true});
 await f.service.logout(true);assert.equal(f.service.snapshot().phase,'idle');assert.equal(f.service.snapshot().error,'');assert.match(f.service.snapshot().notice,/claude auth logout/);
 f.setHandler(async method=>method==='account/logout'?{}:{account:null,requiresOpenaiAuth:true});await f.service.logout(true);assert.equal(f.service.snapshot().notice,'');
});
test('newer account snapshots win out-of-order refreshes without overwriting identity',async()=>{
 const f=fixture(),a=deferred(),b=deferred();let n=0;f.setHandler(()=>++n===1?a.promise:b.promise);const first=f.service.refresh();await tick();const second=f.service.refresh();await tick();b.resolve({account:{type:'chatgpt',email:'new@example.test'}});await second;a.resolve({account:{type:'chatgpt',email:'old@example.test'}});await first;assert.deepEqual(f.accounts.map(a=>a.account.email),['new@example.test']);
});
test('a completion received while cancellation fails remains authoritative; notFound read failures persist',async()=>{
 const f=fixture(),wait=deferred();await f.service.start();f.setHandler(async method=>method==='account/login/cancel'?wait.promise:{account:{type:'chatgpt',email:'completed@example.test'}});const cancel=f.service.cancel();f.service.observe({method:'account/login/completed',params:{loginId:'login-1',success:true}});wait.reject(Error('Cancellation transport failed'));await cancel;assert.equal(f.service.snapshot().phase,'idle');assert.equal(f.service.accountSnapshot().account.email,'completed@example.test');assert.equal(f.service.snapshot().error,'');
 f.setHandler(async method=>method==='account/login/start'?{type:'chatgpt',loginId:'cancel-missing',authUrl:'https://auth.example.test'}:method==='account/login/cancel'?{status:'notFound'}:Promise.reject(Error('Reconciliation failed')));await f.service.start();await assert.rejects(f.service.cancel(),/Reconciliation failed/);assert.equal(f.service.snapshot().phase,'idle');assert.equal(f.service.snapshot().login,null);assert.equal(f.service.snapshot().error,'Reconciliation failed');
});
test('explicit refresh persists errors across settings remounts and clears them after successful retry',async()=>{
 const f=fixture();f.setHandler(async()=>{throw Error('Refresh failed');});await assert.rejects(f.service.run({operation:'refresh'}),/Refresh failed/);assert.equal(f.service.snapshot().error,'Refresh failed');assert.equal(f.service.snapshot().phase,'idle');f.setHandler(async()=>({account:null,requiresOpenaiAuth:true}));await f.service.run({operation:'refresh'});assert.equal(f.service.snapshot().error,'');assert.equal(f.service.accountSnapshot().account,null);
});
test('a sign-in the agent opened itself opens no second tab; a pasted code goes to the pending sign-in',async()=>{
 const f=fixture();f.setHandler(async(method)=>method==='account/login/start'?{type:'chatgpt',loginId:'mimo-1',authUrl:'https://platform.example.test/authorize',codeDesktop:{openedByAgent:true,acceptsCode:true}}
  :method==='codeDesktop/login/code'?{status:'completed'}:{account:{type:'apiKey'},requiresOpenaiAuth:false});
 await f.service.start('chatgpt',{codeDesktop:{provider:'xiaomi'}});
 assert.deepEqual(f.opened,[],'MiMo opened its own tab');
 assert.equal(f.service.snapshot().login.openedByAgent,true);assert.equal(f.service.snapshot().login.acceptsCode,true);
 await assert.rejects(f.service.run({operation:'code',code:'  '}),/Paste/);
 await f.service.run({operation:'code',code:' abc123 '});
 assert.deepEqual(f.calls.at(-1),{method:'codeDesktop/login/code',params:{loginId:'mimo-1',code:'abc123'}});
 // Reopening the sign-in page still works (the manual page).
 await f.service.reopen();assert.deepEqual(f.opened,['https://platform.example.test/authorize']);
});
