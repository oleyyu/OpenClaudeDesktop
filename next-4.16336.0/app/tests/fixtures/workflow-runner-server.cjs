#!/usr/bin/env node
// Isolated app-server protocol fixture for workflow-runner regression tests; never used in production.
// Turn behaviour is chosen by the first turn's text on a thread:
//   WAIT              never completes (until turn/interrupt)
//   TRICKLE:<ms>      streams a delta every 50ms for <ms>, then completes "trickled"
//   CRASH_ONCE        first server process exits mid-turn (marker file in cwd); later ones complete "recovered"
//   REPLIES:<json[]>  turn n on the thread replies with the n-th string of the array
//   FAST / anything   completes "fixture result" at once
// With WF_FIXTURE_HOSTED set, it also acts as a core-hosted workflow engine
// (codeDesktop/diagnostics + workflow/startScript/scriptResult) whose result has no
// outputFile; WF_FIXTURE_HOSTED is the JSON value it returns ("undefined" omits it).
const readline=require('node:readline'),fs=require('node:fs'),path=require('node:path');
const wire=path.join(process.cwd(),'workflow-wire.jsonl');
const log=value=>fs.appendFileSync(wire,JSON.stringify(value)+'\n');
const reply=(id,result)=>process.stdout.write(JSON.stringify({id,result})+'\n');
const note=(method,params)=>process.stdout.write(JSON.stringify({method,params})+'\n');
let threads=0;const scripts=new Map(),turns=new Map(),timers=new Map();
const complete=(threadId,turnId,text,status='completed')=>{
 clearInterval(timers.get(turnId));timers.delete(turnId);
 note('thread/tokenUsage/updated',{threadId,tokenUsage:{total:{totalTokens:20,inputTokens:12,outputTokens:8,reasoningOutputTokens:0,cachedInputTokens:0}}});
 if(text!==undefined){note('item/agentMessage/delta',{threadId,turnId,itemId:'answer-'+turnId,delta:text});note('item/completed',{threadId,turnId,item:{id:'answer-'+turnId,type:'agentMessage',text}});}
 note('turn/completed',{threadId,turn:{id:turnId,status}});
};
// The computed task inside Claude's provenance frame (runner provenance.js) and before the worktree note.
const taskText=raw=>{let text=String(raw).split('\nYou are running in an isolated git worktree')[0];if(text.startsWith('[Workflow harness \u2014 user request]')){const at=text.indexOf('\n\n[Workflow harness');if(at>=0)text=text.slice(at+2);}if(text.startsWith('[Workflow harness'))text=text.split('\n').slice(1).map(line=>line.startsWith('  ')?line.slice(2):line).join('\n');return text;};
readline.createInterface({input:process.stdin}).on('line',line=>{const q=JSON.parse(line);if(q.id===undefined)return;log({pid:process.pid,...q});
 if(q.method==='initialize')return reply(q.id,{userAgent:'fixture/0.155.1'});
 if(q.method==='model/list')return reply(q.id,{data:[{id:'fixture',model:'fixture'},{id:'fixture-b',model:'fixture-b'}],nextCursor:null});
 if(q.method==='thread/start')return reply(q.id,{thread:{id:'thread-'+process.pid+'-'+ ++threads},model:'fixture'});
 if(q.method==='turn/start'){
  const threadId=q.params.threadId,text=taskText(q.params.input[0].text),n=(turns.get(threadId)??0)+1;turns.set(threadId,n);
  if(n===1)scripts.set(threadId,text);
  const script=scripts.get(threadId),turnId=`turn-${threadId}-${n}`;
  reply(q.id,{turn:{id:turnId,status:'inProgress',items:[]}});
  note('turn/started',{threadId,turn:{id:turnId,status:'inProgress'}});
  if(script==='WAIT')return;
  if(script.startsWith('TRICKLE:')){const until=Date.now()+Number(script.slice(8));timers.set(turnId,setInterval(()=>{if(Date.now()>=until)return complete(threadId,turnId,'trickled');note('item/agentMessage/delta',{threadId,turnId,itemId:'trickle',delta:'.'});},50));return;}
  if(script==='CRASH_ONCE'){const marker=path.join(process.cwd(),'crashed');if(!fs.existsSync(marker)){fs.writeFileSync(marker,'1');setTimeout(()=>process.exit(1),100);return;}return complete(threadId,turnId,'recovered');}
  if(script.startsWith('REPLIES:')){const replies=JSON.parse(script.slice(8).split('\n')[0]);return complete(threadId,turnId,replies[Math.min(n,replies.length)-1]);}
  return complete(threadId,turnId,'fixture result');
 }
 const hosted=process.env.WF_FIXTURE_HOSTED;
 if(hosted&&q.method==='codeDesktop/diagnostics')return reply(q.id,{workflowExecute:true});
 if(hosted&&q.method==='codeDesktop/workflow/startScript')return reply(q.id,{runId:'run-1',attemptId:'att-1'});
 if(hosted&&q.method==='codeDesktop/workflow/scriptResult')return reply(q.id,{stopReason:'completed',...(hosted==='undefined'?{}:{value:JSON.parse(hosted)})});
 if(hosted&&q.method==='codeDesktop/workflow/releaseScript')return reply(q.id,{});
 if(q.method==='turn/interrupt'){reply(q.id,{});clearInterval(timers.get(q.params.turnId));return note('turn/completed',{threadId:q.params.threadId,turn:{id:q.params.turnId,status:'interrupted'}});}
 process.stdout.write(JSON.stringify({id:q.id,error:{code:-32601,message:'Unsupported fixture method'}})+'\n');
});
