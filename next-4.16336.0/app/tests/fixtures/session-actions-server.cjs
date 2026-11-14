#!/usr/bin/env node
// Isolated app-server protocol double; never used in production profiles.
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline');
const home=process.env.CODE_DESKTOP_DATA;
if(!home || !fs.existsSync(path.join(home,'session-action-test.marker')))throw Error('Dedicated isolated fixture profile required');
const store=path.join(home,'action-fixture.json'),trace=path.join(home,'action-trace.jsonl');
let db={next:0,threads:{}};try{db=JSON.parse(fs.readFileSync(store));}catch{}
// Atomic write: pollers must never read a truncated store (see codex-server.cjs).
const writeAtomic=(target,text)=>{const temporary=`${target}.${process.pid}.tmp`;fs.writeFileSync(temporary,text);fs.renameSync(temporary,target);};
const save=()=>writeAtomic(store,JSON.stringify(db)),send=m=>process.stdout.write(JSON.stringify(m)+'\n'),notify=(method,params)=>send({method,params}),timers=new Map();
// Codex 0.155.1 Thread.historyMode: this double serves whole threads from
// thread/read and thread/resume, i.e. the legacy contract, so it reports
// historyMode "legacy" and the client keeps the unpaged route. thread/turns/list
// is answered for both modes by the real server, so it is served here too.
const withMode=thread=>thread?{...thread,historyMode:thread.historyMode||'legacy'}:thread;
const turnsPage=(thread,p)=>{const ordered=p.sortDirection==='asc'?[...thread.turns]:[...thread.turns].reverse();
 const from=p.cursor?Number(String(p.cursor).replace('turns:','')):0,limit=Math.max(1,Math.min(200,Number(p.limit)||25));
 const slice=ordered.slice(from,from+limit),view=p.itemsView==='full'?'full':'summary';
 return {data:slice.map(t=>({id:t.id,status:t.status,error:t.error||null,itemsView:view,items:view==='full'?structuredClone(t.items||[]):[]})),
  nextCursor:from+slice.length<ordered.length?`turns:${from+slice.length}`:null,backwardsCursor:slice.length?`turns:${from}`:null};};
function finish(thread,turn,status='completed'){
 clearTimeout(timers.get(thread.id));timers.delete(thread.id);if(turn.status!=='inProgress')return;
 turn.status=status;thread.status={type:'idle'};save();
 for(const item of turn.items)notify('item/completed',{threadId:thread.id,turnId:turn.id,item});
 notify('thread/tokenUsage/updated',{threadId:thread.id,tokenUsage:{total:{totalTokens:350},last:{totalTokens:120},modelContextWindow:128000}});
 notify('turn/completed',{threadId:thread.id,turn});
}
readline.createInterface({input:process.stdin}).on('line',line=>{
 const m=JSON.parse(line),p=m.params||{};if(!m.method||m.method==='initialized')return;
 fs.appendFileSync(trace,JSON.stringify(m)+'\n');const thread=db.threads[p.threadId];let result={};
 try{switch(m.method){
 case 'initialize':result={userAgent:'session-actions-test'};break;
 case 'account/read':result={account:{type:'chatgpt',planType:'test',email:'isolated@example.invalid'}};break;
 case 'account/rateLimits/read':if(fs.existsSync(path.join(home,'rates-unavailable.marker')))throw Error('Rate limits temporarily unavailable');result={rateLimits:{primary:{usedPercent:99}},rateLimitsByLimitId:{codex:{limitName:'Codex test',primary:{usedPercent:20,windowDurationMins:300,resetsAt:1900000000},secondary:{usedPercent:45,windowDurationMins:10080,resetsAt:1900500000}}}};break;
 case 'model/list':{
  const main={id:'fixture',model:'fixture',displayName:'Action test model',isDefault:true,defaultReasoningEffort:'low',supportedReasoningEfforts:[{reasoningEffort:'low'},{reasoningEffort:'medium'}]};
  result={data:fs.existsSync(path.join(home,'settings-test.marker'))?[{...main,serviceTiers:[{id:'priority',name:'Fast',description:'2x speed, increased usage'}]},{...main,id:'standard-only',model:'standard-only',displayName:'Standard only',isDefault:false,serviceTiers:[]}]:[main]};break;
 }
 case 'thread/start':{const id='action-thread-'+ ++db.next,t={id,cwd:p.cwd,name:'Action session',createdAt:Math.floor(Date.now()/1000),updatedAt:Math.floor(Date.now()/1000),status:{type:'idle'},turns:[]};db.threads[id]=t;result={thread:t};save();break;}
 case 'thread/read':case 'thread/resume':if(!thread)throw Error('Unknown fixture thread');result={thread:withMode(thread)};break;
 case 'thread/turns/list':if(!thread)throw Error('Unknown fixture thread');result=turnsPage(thread,p);break;
 case 'thread/name/set':thread.name=p.name;save();break;
 case 'thread/archive':thread.archived=true;save();break;
 case 'thread/unarchive':thread.archived=false;save();result={thread:withMode(thread)};break;
 case 'thread/list':result={data:Object.values(db.threads).map(withMode),nextCursor:null};break;
 case 'thread/fork':{const copy=structuredClone(thread);copy.id='action-thread-'+ ++db.next;db.threads[copy.id]=copy;result={thread:withMode(copy)};save();break;}
 case 'turn/start':case 'thread/compact/start':case 'review/start':{
  if(thread.status.type==='active')throw Error('Busy fixture thread');
  if(m.method==='review/start'&&p.target.instructions==='FAIL')throw Error('Review failed before starting');
  if(m.method==='review/start'&&p.target.instructions==='DISCONNECT'){setTimeout(()=>process.exit(0),150);return;}
  const id='action-turn-'+ ++db.next;
  const items=m.method==='turn/start'?[{id:id+'-user',type:'userMessage',content:p.input},{id:id+'-reply',type:'agentMessage',text:fs.existsSync(path.join(home,'settings-test.marker'))?'ACTION_HISTORY_PRESERVED\n\n```js\nconst message = "Settings";\n```':'ACTION_HISTORY_PRESERVED'}]:m.method==='thread/compact/start'?[{id:id+'-compact',type:'contextCompaction'}]:[{id:id+'-enter',type:'enteredReviewMode',review:'Reviewing '+p.target.type},{id:id+'-exit',type:'exitedReviewMode',review:'ACTION_REVIEW_RESULT: no issues in the isolated fixture.'}];
  const turn={id,status:'inProgress',items};thread.turns.push(turn);thread.status={type:'active'};save();
  send({id:m.id,result:m.method==='thread/compact/start'?{}:{turn,...(m.method==='review/start'?{reviewThreadId:thread.id}:{})}});
  // Compact intentionally acks before start. UI must not announce completion.
  setTimeout(()=>{if(turn.status!=='inProgress')return;notify('turn/started',{threadId:thread.id,turn:m.method==='review/start'?{...turn,id:id+'-nested'}:turn});for(const item of items)notify('item/started',{threadId:thread.id,turnId:turn.id,item});},100);
  timers.set(thread.id,setTimeout(()=>finish(thread,turn),p.target?.instructions==='HOLD'?30000:1200));return;
 }
 case 'turn/interrupt':{const turn=thread.turns.at(-1);if(turn.id!==p.turnId && turn.id+'-nested'!==p.turnId)throw Error('Wrong turn');finish(thread,turn,'interrupted');break;}
 default:throw Error('Unsupported fixture method: '+m.method);
 }send({id:m.id,result});}catch(error){send({id:m.id,error:{code:-32602,message:error.message}});}
});
