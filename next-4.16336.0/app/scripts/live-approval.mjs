import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import os from 'node:os';
import {execFileSync} from 'node:child_process';

// A real local Codex request, always denied. No fixture, grant or retry is used.
const require=createRequire(import.meta.url);
const {CodexClient}=require('../electron/codex.cjs');
const {respondToApproval}=require('../electron/respond-approval.cjs');
const root=path.resolve(import.meta.dirname,'..');
const evidence=path.resolve(root,'../analysis/batch-20260920');
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8'));
for(const entry of build.sources) assert.equal(createHash('sha256').update(await fs.readFile(path.join(root,entry.path))).digest('hex'),entry.sha256,`Stale build: ${entry.path}`);
const workspace=await fs.mkdtemp(path.join(evidence,'live-approval-workspace-'));
const binary=await fs.realpath(path.join(os.homedir(),'.local/bin/codex'));
const client=new CodexClient({cwd:workspace,binary});
const report={startedAt:new Date().toISOString(),passed:false,realCodex:true,denyOnly:true,binary,codexVersion:execFileSync(binary,['--version'],{encoding:'utf8'}).trim(),build:{version:build.version,builtAt:build.builtAt,sourceSha256:build.sourceSha256},workspace,requests:[],completedTools:[]};
let threadId, resolveTurn, rejectTurn, timer;
const completed=new Promise((resolve,reject)=>{resolveTurn=resolve;rejectTurn=reject});
// A failure may arrive before turn/start returns; keep its rejection observed.
completed.catch(()=>{});
client.on('event',event=>{
  if(event.kind==='request'){
    try{
      assert.equal(event.params.threadId,threadId);
      const permission=event.method==='item/permissions/requestApproval';
      assert.ok(permission||['item/commandExecution/requestApproval','item/fileChange/requestApproval'].includes(event.method),`Unexpected request: ${event.method}`);
      const answer=permission?{allow:false}:{decision:'decline'};
      const result=respondToApproval(client,{id:event.id,expected:event.bridgeApproval,...answer});
      assert.equal(result.ok,true,result.error?.message);
      assert.deepEqual(result.identity,event.bridgeApproval);
      report.requests.push({method:event.method,requestIdType:typeof event.id,threadMatches:true,identityMatched:true,decision:permission?'empty permissions, turn scope':'decline',acceptedByLocalTransport:true});
    }catch(error){rejectTurn(error)}
  }
  if(event.method==='item/completed'&&event.params?.threadId===threadId){
    const item=event.params.item;
    if(item?.type==='commandExecution') report.completedTools.push({type:item.type,status:item.status,exitCode:item.exitCode??null});
  }
  if(event.method==='turn/completed'&&event.params?.threadId===threadId) resolveTurn(event.params.turn);
});
try{
  await client.start();
  const catalog=await client.request('model/list',{limit:100});
  const model=(catalog.data.find(model=>model.isDefault)||catalog.data[0]).model;
  report.model=model;
  const started=await client.request('thread/start',{cwd:workspace,model,sandbox:'read-only',approvalPolicy:'untrusted',approvalsReviewer:'user'});
  threadId=started.thread.id;
  report.threadId=threadId;
  timer=setTimeout(()=>rejectTurn(new Error('Real approval check exceeded 180 seconds')),180000);
  await client.request('turn/start',{threadId,effort:'low',input:[{type:'text',text:'This is an isolated approval-denial integration check. Use the shell tool once to run precisely: python3 -c \'print("CODE_DESKTOP_APPROVAL_DENIAL_PROBE")\'. This only prints a constant; do not read or write files, use the network, or delegate. If execution requires approval, request it normally. The user will deny approval; after denial do not retry or use another tool, and finish with a short statement that execution was denied.',text_elements:[]}]});
  const turn=await completed;
  report.turnStatus=turn.status;
  assert.ok(report.requests.length>0,'The real server did not ask for approval; this run cannot validate denial');
  assert.ok(report.requests.some(request=>request.method==='item/commandExecution/requestApproval'),'Expected a real command approval');
  assert.equal(client.approvalSnapshot().pending.length,0);
  assert.equal(turn.status,'completed',JSON.stringify(turn.error));
  assert.ok(report.completedTools.every(tool=>tool.status!=='completed'||tool.exitCode!==0),'A denied probe unexpectedly completed successfully');
  report.passed=true;
}catch(error){report.error=error.stack||String(error);process.exitCode=1}
finally{
  clearTimeout(timer);
  if(!report.passed&&threadId){try{await client.request('turn/interrupt',{threadId})}catch{}}
  await client.stopAndWait();
  report.finishedAt=new Date().toISOString();
  await fs.writeFile(path.join(evidence,'live-approval-test.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
