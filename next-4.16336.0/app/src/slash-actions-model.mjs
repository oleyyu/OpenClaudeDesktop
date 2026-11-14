// Local presentation records never enter the protocol reducer or persisted thread.
export function withLocalCommandRows(items,rows=[]) {
 const result=[...items];
 for(const row of rows){const at=result.findIndex(item=>item.id===row.after);let offset=at<0?result.length:at+1;while(result[offset]?.localCommand)offset++;result.splice(offset,0,{...row,localCommand:true});}
 return result;
}
export function rewindChoices(turns) {return turns.flatMap(turn=>{const user=turn.items?.find(item=>item.type==='userMessage');const text=user?.content?.filter(c=>c.type==='text').map(c=>c.text).join('\n');return text?[{id:turn.id,text}]:[];});}
export function transcriptMarkdown(thread,turns) {
 const parts=[`# ${thread.name||thread.preview||'Conversation'}`,`Session: ${thread.id}`];
 for(const turn of turns)for(const item of turn.items||[]){
  if(item.type==='userMessage')parts.push('## User',item.content?.map(c=>c.type==='text'?c.text:c.type==='image'?`Image: ${c.url}`:c.type==='localImage'?`Image: ${c.path}`:`[${c.type}]`).join('\n')||'');
  else if(item.type==='agentMessage')parts.push('## Assistant',item.text||'');
  else if(item.type==='commandExecution')parts.push('### Command',fence(item.command||''),fence(item.aggregatedOutput||''));
  else if(item.type==='fileChange')for(const change of item.changes||[])parts.push(`### ${change.path}`,fence(change.diff||''));
 }
 return parts.join('\n\n')+'\n';
}
function fence(text){const length=Math.max(3,...[...text.matchAll(/`+/g)].map(m=>m[0].length+1));const ticks='`'.repeat(length);return `${ticks}\n${text}\n${ticks}`;}
