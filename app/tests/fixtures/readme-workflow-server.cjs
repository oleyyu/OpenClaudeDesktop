#!/usr/bin/env node
// Isolated workflow-agent fixture for the README screenshots (scripts/readme-screenshots.mjs); never used in production.
// Same wire shape as workflow-server.cjs, but each agent's prompt is looked up in the profile's readme-workflow.json
// ({agents: {<prompt>: {ms, tokens, result}}}): it answers `result` after `ms` with `tokens` used; ms < 0 keeps the agent
// running (it reports its tokens so far and waits until the run is stopped). Unknown prompts finish after a second.
const readline=require('node:readline'),fs=require('node:fs'),path=require('node:path');
const reply=(id,result)=>process.stdout.write(JSON.stringify({id,result})+'\n');const note=(method,params)=>process.stdout.write(JSON.stringify({method,params})+'\n');let count=0;
// The computed task inside Claude's provenance frame (runner provenance.js) and before the worktree note.
const taskText=raw=>{let text=String(raw).split('\nYou are running in an isolated git worktree')[0];if(text.startsWith('[Workflow harness'))text=text.split('\n').slice(1).map(line=>line.startsWith('  ')?line.slice(2):line).join('\n');return text.trim();};
let plan={};try{plan=JSON.parse(fs.readFileSync(path.join(process.env.CODE_DESKTOP_DATA||'','readme-workflow.json'),'utf8')).agents||{};}catch{}
const usage=(threadId,tokens)=>note('thread/tokenUsage/updated',{threadId,tokenUsage:{total:{totalTokens:tokens,inputTokens:Math.round(tokens*0.8),outputTokens:Math.round(tokens*0.2),reasoningOutputTokens:0,cachedInputTokens:0}}});
readline.createInterface({input:process.stdin}).on('line',line=>{const q=JSON.parse(line);if(q.id===undefined)return;
 if(q.method==='initialize')return reply(q.id,{userAgent:'fixture/0.155.1',codexHome:process.env.CODEX_HOME});
 if(q.method==='model/list')return reply(q.id,{data:[{id:'deepseek-v4-pro',model:'deepseek-v4-pro'}],nextCursor:null});
 if(q.method==='thread/start')return reply(q.id,{thread:{id:'worker-'+ ++count},model:'deepseek-v4-pro'});
 if(q.method==='turn/start'){const threadId=q.params.threadId,turnId='turn-'+threadId,text=taskText(q.params.input[0].text);
  const entry=plan[text]||Object.entries(plan).find(([key])=>text.startsWith(key))?.[1]||{ms:1000,tokens:4200,result:'Done.'};
  reply(q.id,{turn:{id:turnId,status:'inProgress',items:[]}});
  note('turn/started',{threadId,turn:{id:turnId,status:'inProgress'}});
  if(entry.ms<0){setTimeout(()=>usage(threadId,entry.tokens||8000),300);return;}
  setTimeout(()=>{usage(threadId,entry.tokens||4200);const result=entry.result||'Done.';
   note('item/agentMessage/delta',{threadId,turnId,itemId:'answer',delta:result});note('item/completed',{threadId,turnId,item:{id:'answer',type:'agentMessage',text:result}});
   note('turn/completed',{threadId,turn:{id:turnId,status:'completed',error:null}});},entry.ms);return;}
 if(q.method==='turn/interrupt'){reply(q.id,{});return note('turn/completed',{threadId:q.params.threadId,turn:{id:q.params.turnId,status:'interrupted'}});}
 process.stdout.write(JSON.stringify({id:q.id,error:{code:-32601,message:'Unsupported fixture method'}})+'\n');
});
