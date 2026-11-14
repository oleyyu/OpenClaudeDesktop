#!/usr/bin/env node
// Isolated protocol fixture for the embedded runner; never used in production.
const readline=require('node:readline'),fs=require('node:fs'),path=require('node:path');
const reply=(id,result)=>process.stdout.write(JSON.stringify({id,result})+'\n');const note=(method,params)=>process.stdout.write(JSON.stringify({method,params})+'\n');let count=0;
// The computed task inside Claude's provenance frame (runner provenance.js) and before the worktree note.
const taskText=raw=>{let text=String(raw).split('\nYou are running in an isolated git worktree')[0];if(text.startsWith('[Workflow harness'))text=text.split('\n').slice(1).map(line=>line.startsWith('  ')?line.slice(2):line).join('\n');return text;};
readline.createInterface({input:process.stdin}).on('line',line=>{const q=JSON.parse(line);if(q.id===undefined)return;fs.appendFileSync(path.join(process.cwd(),'workflow-wire.jsonl'),JSON.stringify(q)+'\n');
 if(q.method==='initialize'){fs.appendFileSync(path.join(process.cwd(),'workflow-wire.jsonl'),JSON.stringify({argv:process.argv.slice(2)})+'\n');return reply(q.id,{userAgent:'fixture/0.155.1',codexHome:process.env.CODEX_HOME});}
 if(q.method==='model/list')return reply(q.id,{data:[{id:'fixture',model:'fixture'}],nextCursor:null});
 if(q.method==='thread/start')return reply(q.id,{thread:{id:'worker-'+ ++count},model:'fixture'});
 if(q.method==='turn/start'){const threadId=q.params.threadId,turnId='turn-'+threadId,text=taskText(q.params.input[0].text);
  reply(q.id,{turn:{id:turnId,status:'inProgress',items:[]}});
  note('turn/started',{threadId,turn:{id:turnId,status:'inProgress'}});
  if(text==='WAIT')return;
  const finish=()=>{note('thread/tokenUsage/updated',{threadId,tokenUsage:{total:{totalTokens:20,inputTokens:12,outputTokens:8,reasoningOutputTokens:0,cachedInputTokens:0}}});note('item/agentMessage/delta',{threadId,turnId,itemId:'answer',delta:'fixture result'});note('item/completed',{threadId,turnId,item:{id:'answer',type:'agentMessage',text:'fixture result'}});note('turn/completed',{threadId,turn:{id:turnId,status:text==='FAIL'?'failed':'completed',error:text==='FAIL'?{message:'Fixture failed',codexErrorInfo:'badRequest'}:null}});};
  if(text==='FAST')finish();else setTimeout(finish,text==='GUI'?2000:250);return;}
 if(q.method==='turn/interrupt'){reply(q.id,{});return note('turn/completed',{threadId:q.params.threadId,turn:{id:q.params.turnId,status:'interrupted'}});}
 process.stdout.write(JSON.stringify({id:q.id,error:{code:-32601,message:'Unsupported fixture method'}})+'\n');
});
