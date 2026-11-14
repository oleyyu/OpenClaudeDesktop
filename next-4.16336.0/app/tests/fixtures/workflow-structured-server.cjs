// Keyless bidirectional app-server fixture. A successful tool must be observed
// before the client interrupts; any later model request is recorded as a leak.
// The computed task inside Claude's provenance frame (runner provenance.js) and before the worktree note.
const taskText=raw=>{let text=String(raw).split('\nYou are running in an isolated git worktree')[0];if(text.startsWith('[Workflow harness'))text=text.split('\n').slice(1).map(line=>line.startsWith('  ')?line.slice(2):line).join('\n');return text;};
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline');
const wire=path.join(process.cwd(),'structured-wire.jsonl');
const log=x=>fs.appendFileSync(wire,JSON.stringify(x)+'\n');
const send=x=>process.stdout.write(JSON.stringify(x)+'\n');
const reply=(id,result)=>send({id,result});
const note=(method,params)=>send({method,params});
let sequence=0,threads=0;const states=new Map(),pending=new Map();
const complete=(s,text,status='completed')=>{
  if(text!==undefined)note('item/completed',{threadId:s.threadId,turnId:s.turnId,item:{type:'agentMessage',id:'text-'+ ++sequence,text}});
  note('turn/completed',{threadId:s.threadId,turn:{id:s.turnId,status}});
};
const step=s=>{
  if(s.stopped)return;
  const answer=s.replies[Math.min(s.index++,s.replies.length-1)];
  log({providerRequest:true,threadId:s.threadId,index:s.index});
  if(typeof answer==='string')return complete(s,answer);
  const id='server-'+ ++sequence,callId=s.config.reuseCallId?'shared-call':('call-'+sequence);
  note('rawResponseItem/completed',{threadId:s.threadId,turnId:s.turnId,item:{type:'function_call',call_id:callId,name:'StructuredOutput',arguments:JSON.stringify(answer)}});
  note('rawResponse/completed',{threadId:s.threadId,turnId:s.turnId,responseId:'response-'+sequence});
  const item={id:callId,type:'dynamicToolCall',tool:'StructuredOutput',success:null};
  note('item/started',{threadId:s.threadId,turnId:s.turnId,item});
  pending.set(id,{s,item});
  send({id,method:'item/tool/call',params:{threadId:s.threadId,turnId:s.turnId,callId,namespace:null,tool:'StructuredOutput',arguments:answer}});
};
readline.createInterface({input:process.stdin}).on('line',line=>{
  const q=JSON.parse(line);log(q);if(q.id===undefined)return;
  if(!q.method){
    const entry=pending.get(q.id);if(!entry)return;pending.delete(q.id);
    const {s,item}=entry;
    note('item/completed',{threadId:s.threadId,turnId:s.turnId,item:{...item,success:q.result?.success===true&&!(s.config.rejectFirstCommit&&s.index===1),contentItems:q.result?.contentItems??[]}});
    note('rawResponseItem/completed',{threadId:s.threadId,turnId:s.turnId,item:{type:'function_call_output',call_id:item.id,output:q.result?.contentItems??[]}});
    s.timer=setTimeout(()=>step(s),30);return;
  }
  if(q.method==='initialize')return reply(q.id,{userAgent:'structured-fixture'});
  if(q.method==='model/list')return reply(q.id,{data:[{id:'fixture',model:'fixture'}],nextCursor:null});
  if(q.method==='thread/start'){
    const threadId='thread-'+ ++threads;states.set(threadId,{threadId,index:0,turn:0,stopped:false,params:q.params});
    return reply(q.id,{thread:{id:threadId}});
  }
  if(q.method==='turn/start'){
    const s=states.get(q.params.threadId);s.turnId=s.threadId+'-turn-'+ ++s.turn;s.stopped=false;
    if(!s.replies){const input=JSON.parse(taskText(q.params.input[0].text).replace(/^SCHEMA_CASE:/u,''));s.config=Array.isArray(input)?{}:input;s.replies=Array.isArray(input)?input:input.replies;}
    reply(q.id,{turn:{id:s.turnId,status:'inProgress'}});
    if(s.config.delay)s.timer=setTimeout(()=>step(s),s.config.delay);else step(s);return;
  }
  if(q.method==='turn/interrupt'){
    const s=states.get(q.params.threadId);s.stopped=true;clearTimeout(s.timer);reply(q.id,{});complete(s,undefined,'interrupted');return;
  }
  send({id:q.id,error:{code:-32601,message:'Unsupported structured fixture request'}});
});
