import {compileStructuredOutputSchema} from './workflow-schema.js';

export const STRUCTURED_TOOL = 'StructuredOutput';
export class StructuredAgentError extends Error {
  constructor(message,kind,details={}) { super(message); this.kind=kind; Object.assign(this,details); }
}
const INSTRUCTION = 'Return your final answer by calling StructuredOutput with arguments matching its schema. Only that tool call counts as the result. If validation fails, read the tool error and call StructuredOutput again with corrected arguments. Do not finish with a text response.';
const REMINDER = 'You MUST call StructuredOutput to return the final result. Call that tool now with arguments matching its schema.';
const response = (success,text) => ({success,contentItems:[{type:'inputText',text}]});

// Codex normalizes tool schemas to a smaller keyword subset. Carry the complete
// author schema in the description and keep wire arguments permissive; the full
// validator below, rather than that lossy metadata, decides which value commits.
export async function runStructuredAgent({client,threadParams,prompt,opts,runTurn,metrics}) {
  const schema=structuredClone(opts.schema);
  const validate=compileStructuredOutputSchema(schema);
  const cap=Number(process.env.MAX_STRUCTURED_OUTPUT_RETRIES ?? 5);
  if(!Number.isSafeInteger(cap)||cap<1)throw Error('MAX_STRUCTURED_OUTPUT_RETRIES must be a positive integer');
  const started=await client.startThread({...threadParams,
    experimentalRawEvents:true,
    // Local: codexAgent.js already gave the thread Claude's StructuredOutput instructions (opts.instructed, subagentPrompt.js).
    developerInstructions:opts.instructed?threadParams.developerInstructions:[threadParams.developerInstructions,INSTRUCTION].filter(Boolean).join('\n\n'),
    dynamicTools:[{type:'function',name:STRUCTURED_TOOL,
      description:'Return the final result matching this JSON Schema exactly:\n'+JSON.stringify(schema),
      inputSchema:{type:'object',additionalProperties:true},deferLoading:false}],
  });
  const threadId=started?.thread?.id;
  if(!threadId)throw Error('thread/start did not return thread.id');
  let captured,failures=0,lastError,terminalError,providerFailure,reminded=false,active=true,responseComplete=false;
  const pending=new Map(),interrupts=new Map(),calls=new Map(),outstanding=new Set(),ignoredCalls=new Set();
  const settle=turnId=>{
    if(terminalError||(captured!==undefined&&responseComplete&&outstanding.size===0))stop(turnId);
  };
  const stop=turnId=>{
    if(!interrupts.has(turnId))interrupts.set(turnId,client.interruptTurn(threadId,turnId).catch(()=>{}));
  };
  const dispose=client.registerToolHandler(threadId,req=>{
    const p=req.params;
    if(p.tool!==STRUCTURED_TOOL||p.namespace) return response(false,'No matching structured result tool.');
    if(!active||opts.signal?.aborted||terminalError||providerFailure){
      ignoredCalls.add(p.callId);
      opts.onActivity?.({toolCalls:Math.max(0,state.toolCalls-ignoredCalls.size)});
      return response(false,'This structured result is already settling.');
    }
    if(!validate(p.arguments)){
      failures++;
      lastError=(validate.errors??[]).map(e=>`${e.instancePath||'root'}: ${e.message}`).join(', ').slice(0,600);
      const error=`Output does not match required schema: ${lastError}`;
      pending.set(p.callId,{error});
      return response(false,error);
    }
    pending.set(p.callId,{value:structuredClone(p.arguments),order:calls.get(p.callId)??calls.size});
    return response(true,'Structured output recorded.');
  });
  const observe=n=>{
    if(n.params?.threadId!==threadId)return;
    if(n.method==='error'&&captured!==undefined&&!responseComplete){
      const error=n.params.error;
      providerFailure=new StructuredAgentError(error?.additionalDetails??error?.message??'Response failed after StructuredOutput','provider',{codexErrorInfo:error?.codexErrorInfo,retryable:false});
      captured=undefined;
      stop(n.params.turnId);
      return;
    }
    if(n.method==='rawResponseItem/completed'){
      const item=n.params.item;
      if(item?.type==='function_call'||item?.type==='custom_tool_call'){
        if(responseComplete){calls.clear();outstanding.clear();responseComplete=false;}
        calls.set(item.call_id,calls.size);outstanding.add(item.call_id);
      }else if(item?.type==='function_call_output'||item?.type==='custom_tool_call_output'){
        outstanding.delete(item.call_id);settle(n.params.turnId);
      }
      return;
    }
    if(n.method==='rawResponse/completed'){responseComplete=true;settle(n.params.turnId);return;}
    if(n.method!=='item/completed')return;
    const item=n.params.item,entry=pending.get(item?.id);
    if(!entry||item.type!=='dynamicToolCall')return;
    pending.delete(item.id);
    if(!entry.error&&item.success===true&&(captured===undefined||entry.order>=captured.order))captured=entry;
    else if(!entry.error){failures++;lastError='Structured output tool call failed';}
    if(captured===undefined&&failures>=cap)terminalError=`agent({schema}): StructuredOutput retry cap (${cap}) exceeded — ${failures} failed calls with no valid output — last StructuredOutput error: ${lastError}`;
    settle(n.params.turnId);
  };
  client.on('notification',observe);
  const state={activeTools:new Set(),toolCalls:0};
  try{
    let input=prompt;
    for(;;){
      const params={threadId,input:[{type:'text',text:String(input)}],...opts.requestedModel?{model:opts.requestedModel}:{},...opts.effort?{effort:opts.effort}:{}};
      const {turn}=await runTurn(client,threadId,params,{...opts,onActivity:activity=>opts.onActivity?.({...activity,toolCalls:Math.max(0,activity.toolCalls-ignoredCalls.size)})},state);
      opts.signal?.throwIfAborted();
      if(providerFailure)throw providerFailure;
      if(terminalError)throw new StructuredAgentError(terminalError,'retry-limit');
      if(turn.status==='failed'||(turn.status&&turn.status!=='completed'&&captured===undefined)){
        throw new StructuredAgentError(turn.error?.message??`turn ended with status=${turn.status}`,'provider',{codexErrorInfo:turn.error?.codexErrorInfo,...captured!==undefined?{retryable:false}:{}});
      }
      if(captured!==undefined)return captured.value;
      if(reminded)throw new StructuredAgentError('agent({schema}): subagent completed without calling StructuredOutput (after in-conversation nudge)','missing');
      reminded=true;input=REMINDER;
    }
  }finally{
    active=false;dispose();client.off('notification',observe);
    await Promise.allSettled(interrupts.values());
    metrics(threadId,Math.max(0,state.toolCalls-ignoredCalls.size));
  }
}
