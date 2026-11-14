const {connectionMatches}=require('./session-operations.cjs');
const {coreError}=require('./codex.cjs');
const parentId=thread=>thread?.parentThreadId||thread?.source?.subAgent?.thread_spawn?.parent_thread_id;
// modelProviders: [] lists Codex children recorded under any provider (OpenAI or a saved custom endpoint); bridges ignore it.
function createBackgroundTasks({getClient,getConfig}){
 const known=new Map(),reads=new Map();
 async function read({threadId}){if(!getConfig().threadIds.includes(threadId))throw Error('Unknown session.');const owner=getClient();await owner.start();const connection=owner.connection,request=Symbol('read');reads.set(threadId,request);const stale=()=>owner!==getClient()||owner.connection!==connection;const result={children:[],terminals:[],errors:[]};
  for(const [key,method,params] of [['children','thread/list',{sourceKinds:['subAgentThreadSpawn'],limit:100,modelProviders:[]}],['terminals','thread/backgroundTerminals/list',{threadId,limit:100}]]){
   try{let cursor=null;const seen=new Set();do{const page=await owner.request(method,{...params,...(cursor?{cursor}:{})});if(stale())throw Error('Connection changed.');if(!Array.isArray(page.data))throw Error('Background task list is unavailable.');result[key].push(...page.data);cursor=page.nextCursor;if(cursor&&seen.has(cursor))throw Error('Background task pagination did not advance.');if(cursor)seen.add(cursor);if(seen.size>=100)throw Error('Background task list is incomplete.');}while(cursor);
   }catch(error){result.errors.push(`${key}: ${error.message}`);if(stale())throw error;}}
  result.children=result.children.filter(t=>parentId(t)===threadId);if(stale())throw Error('Connection changed.');if(reads.get(threadId)===request)known.set(threadId,{owner,connection,terminals:result.terminals});return result;
 }
 function terminate({threadId,processId,expected}){
  const owner=getClient(),connection=owner.connection,snapshot=known.get(threadId);
  if(!connectionMatches(owner,expected))throw coreError(owner,'The {core} connection changed. The stop request was not sent.');
  if(!getConfig().threadIds.includes(threadId))throw Error('This background process is no longer available.');
  // A live item can precede the next inventory poll. Confirm actual process
  // membership before stopping it; never act on the item ID alone.
  const send=terminals=>{if(owner!==getClient()||connection!==owner.connection||!connectionMatches(owner,expected))throw coreError(owner,'The {core} connection changed. The stop request was not sent.');if(!getConfig().threadIds.includes(threadId)||!terminals.some(t=>t.processId===processId))throw Error('This background process is no longer available.');return owner.request('thread/backgroundTerminals/terminate',{threadId,processId},120000,connection);};
  if(snapshot?.owner===owner&&snapshot.connection===connection&&snapshot.terminals.some(t=>t.processId===processId))return send(snapshot.terminals);
  return read({threadId}).then(result=>send(result.terminals));
 }
 return {read,terminate};
}
module.exports={createBackgroundTasks};
