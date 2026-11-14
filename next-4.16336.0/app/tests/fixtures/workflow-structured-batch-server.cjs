// Scripted bidirectional protocol fixture; models complete response boundaries.
// The computed task inside Claude's provenance frame (runner provenance.js) and before the worktree note.
const taskText=raw=>{let text=String(raw).split('\nYou are running in an isolated git worktree')[0];if(text.startsWith('[Workflow harness'))text=text.split('\n').slice(1).map(line=>line.startsWith('  ')?line.slice(2):line).join('\n');return text;};
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline');
const log=x=>fs.appendFileSync(path.join(process.cwd(),'batch-wire.jsonl'),JSON.stringify(x)+'\n');
const send=x=>process.stdout.write(JSON.stringify(x)+'\n');
const reply=(id,result)=>send({id,result});
const note=(method,params)=>send({method,params});
let seq=0;const pending=new Map(),states=new Map();
const base=s=>({threadId:s.id,turnId:s.turnId});
const raw=(s,item)=>note('rawResponseItem/completed',{...base(s),item});
const finish=(s,status='completed',error)=>note('turn/completed',{threadId:s.id,turn:{id:s.turnId,status,error}});
const output=(s,item,success=true)=>{
 note('item/completed',{...base(s),item:{...item,success}});
 raw(s,{type:'function_call_output',call_id:item.id,output:'fixture result'});
};
function dispatch(s){
 if(s.stopped)return;
 const next=s.batch.shift();
 if(!next){
  if(s.response?.terminalFailure){finish(s,'failed',{message:'FIXTURE_STREAM_FAILED',codexErrorInfo:{responseStreamDisconnected:{httpStatusCode:null}}});return;}
  if(s.response?.stream){note('error',{...base(s),willRetry:true,error:{message:'Reconnecting... 1/5',additionalDetails:'FIXTURE_STREAM_FAILED',codexErrorInfo:{responseStreamDisconnected:{httpStatusCode:null}}}});}
  s.timer=setTimeout(()=>step(s),30);return;
 }
 const item={id:next.id,type:next.name==='StructuredOutput'?'dynamicToolCall':'commandExecution',tool:next.name,success:null};
 note('item/started',{...base(s),item});
 if(next.name!=='StructuredOutput'){
  log({effect:next.name});output(s,item);s.timer=setTimeout(()=>dispatch(s),5);return;
 }
 const id='rpc-'+ ++seq;pending.set(id,{s,item});
 send({id,method:'item/tool/call',params:{...base(s),callId:item.id,namespace:null,tool:'StructuredOutput',arguments:next.input}});
}
function step(s){
 if(s.stopped)return;
 const response=s.replies[Math.min(s.index++,s.replies.length-1)];s.response=response;log({providerRequest:true,index:s.index});
 if(response?.http){
  if(response.http===401&&s.index<s.replies.length){s.timer=setTimeout(()=>step(s),5);return;}
  finish(s,'failed',{message:'LIFECYCLE_API_FAILURE',codexErrorInfo:'badRequest'});return;
 }
 if(typeof response==='string'||response.text!==undefined){
  const item={type:'agentMessage',id:'text-'+ ++seq,text:typeof response==='string'?response:response.text};
  note('item/started',{...base(s),item});note('item/completed',{...base(s),item});finish(s);return;
 }
 s.batch=(response.stream==='partial'?[]:(response.calls??response)).map(call=>({...call,id:'call-'+ ++seq}));
 for(const call of s.batch)raw(s,{type:'function_call',call_id:call.id,name:call.name,arguments:JSON.stringify(call.input)});
 if(!response.stream&&!response.terminalFailure)note('rawResponse/completed',{...base(s),responseId:'response-'+ ++seq});dispatch(s);
}
readline.createInterface({input:process.stdin}).on('line',line=>{
 const q=JSON.parse(line);log(q);if(q.id===undefined)return;
 if(!q.method){const entry=pending.get(q.id);if(!entry)return;pending.delete(q.id);output(entry.s,entry.item,q.result?.success===true);entry.s.timer=setTimeout(()=>dispatch(entry.s),5);return;}
 if(q.method==='initialize')return reply(q.id,{userAgent:'structured-batch-fixture'});
 if(q.method==='model/list')return reply(q.id,{data:[{id:'fixture',model:'fixture'}],nextCursor:null});
 if(q.method==='thread/start'){const id='thread-'+ ++seq;states.set(id,{id,index:0,turn:0,stopped:false});return reply(q.id,{thread:{id}});}
 if(q.method==='turn/start'){
  const s=states.get(q.params.threadId);s.turnId=s.id+'-turn-'+ ++s.turn;s.stopped=false;
  if(!s.replies)s.replies=JSON.parse(taskText(q.params.input[0].text).replace(/^SCHEMA_CASE:/u,''));
  reply(q.id,{turn:{id:s.turnId,status:'inProgress'}});
  const item={type:'userMessage',id:'user-'+ ++seq};note('item/started',{...base(s),item});note('item/completed',{...base(s),item});
  step(s);return;
 }
 if(q.method==='turn/interrupt'){const s=states.get(q.params.threadId);s.stopped=true;clearTimeout(s.timer);reply(q.id,{});finish(s,'interrupted');return;}
 send({id:q.id,error:{code:-32601,message:'Unsupported batch fixture request'}});
});
