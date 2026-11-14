import {commandRowState} from './command-row-model.mjs';
import {stripAnsi} from './ansi-model.mjs';
import {t,tn} from '../electron/i18n/index.mjs';
import {appToolLabel,appToolCall} from './agent-tool-titles.mjs';
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const string=value=>typeof value==='string'?value:'';
export const isGenericTool=item=>['webSearch','mcpToolCall','dynamicToolCall','functionCallOutput'].includes(item?.type);
// WebSearchThreadItem has no status. Only observed item lifecycle in the
// current turn can supply it; history/unknown state is never guessed running.
export function observedGenericTool(item,state,sessionKey) {
 if(item?.type!=='webSearch'||item.status!=null||!state||sessionKey==null)return item;
 const phase=state.itemPhases?.[sessionKey]?.[item.id],active=state.active?.[sessionKey];
 if(phase==='streaming' && active!==null && (active===undefined||active===item.turnId))return {...item,status:'inProgress'};
 return item;
}
function valueText(value,pretty=false) {
 if(typeof value==='string')return value;
 try{return JSON.stringify(value,null,pretty?2:undefined)??String(value);}catch{return String(value);}
}
// DeepSeek Harness tools reach the client as dynamicToolCall with no
// namespace. Their source counterparts' words (approval-current.js oO):
// TodoWrite :4415-4430, Skill :4298-4316, ExitPlanMode :4449-4462,
// AskUserQuestion :4531-4549, TaskOutput Hae/Uae/Wae :4885/:4933/:4975,
// TaskList :4334-4347, TaskStop :4399-4413; run_code reads like Bash's
// Running/Ran/Failed to run (:4142-4157). [busy, done, failed?]; with no
// failed verb the classic row keeps the done verb (`Re ?? o ?? S.verb`).
const todosOf=item=>Array.isArray(item.arguments?.todos)?item.arguments.todos:[];
const HARNESS_TOOLS={
 todo_write:item=>({verbs:[t('Updating todos'),todosOf(item).length?t('Updated todos'):t('Cleared todos')],meta:null}),
 skill:item=>({verbs:[t('Running skill'),t('Ran skill'),t('Failed to run skill')],meta:string(item.arguments?.name)?`/${item.arguments.name}`:null}),
 exit_plan_mode:()=>({verbs:[t('Proposing plan'),t('Proposed plan'),t('Failed to propose plan')],meta:null}),
 ask_user_question:item=>{
  const questions=Array.isArray(item.arguments?.questions)?item.arguments.questions:[];
  return {verbs:[t('Asking'),t('Asked')],meta:string(questions[0]?.header).trim()||(questions.length>1?tn(questions.length,'{count} question','{count} questions'):null)};
 },
 job_output:()=>({verbs:[t('Reading task output'),t('Read task output'),t('Failed to read task output')],meta:null}),
 job_list:()=>({verbs:[t('Listing tasks'),t('Listed tasks'),t('Failed to list tasks')],meta:null}),
 job_kill:()=>({verbs:[t('Stopping task'),t('Stopped task'),t('Failed to stop task')],meta:null}),
 run_code:item=>({verbs:[t('Running'),t('Ran'),t('Failed to run')],meta:string(item.arguments?.description)||null}),
};
const harnessTool=item=>item?.type==='dynamicToolCall'&&item.namespace==null&&typeof item.tool==='string'?item.tool:null;
export function genericToolLabel(item,state=commandRowState(item)) {
 const busy=state==='busy'||state==='blocked',failed=state==='failed';
 if(item.type==='webSearch') {
  const action=item.action;
  if(action?.type==='openPage')return {label:busy?t('Fetching'):failed?t('Failed to fetch'):t('Fetched'),meta:string(action.url)||null};
  if(action?.type==='findInPage')return {label:busy?t('Searching'):failed?t('Failed to search'):t('Searched'),meta:string(action.pattern)||null};
  const query=string(item.query)||string(action?.query)||(Array.isArray(action?.queries)?action.queries.filter(q=>typeof q==='string').join(', '):'');
  return {label:busy?t('Searching web'):failed?t('Failed to search web'):t('Searched web'),meta:query||null};
 }
 // A call the core rerouted as invalid (OpenCode/MiMo's `invalid` tool: no such tool, or arguments that don't fit):
 // the tool the model tried, as a failed call.
 if(item.type==='dynamicToolCall'&&item.codeDesktop?.invalidTool===true)return {label:busy?t('Using {tool}',{tool:string(item.tool)||t('Tool')}):t('Couldn’t use {tool}',{tool:string(item.tool)||t('Tool')}),meta:null};
 const harness=harnessTool(item);
 if(harness!==null&&Object.hasOwn(HARNESS_TOOLS,harness)) {
  const {verbs:[running,done,failedVerb],meta}=HARNESS_TOOLS[harness](item);
  return {label:busy?running:failed?failedVerb??done:done,meta};
 }
 // OpenClaude Desktop's own tools (the code_desktop MCP server: preview, …) read as what they did.
 const app=appToolLabel(item,state);
 if(app)return app;
 // Any other Harness tool: its presenter title ("Create goal") when the bridge sent one.
 if(harness!==null&&string(item.title).trim())return {label:item.title,meta:null};
 const tool=string(item.tool)||string(item.name)||t('Tool');
 const scope=string(item.server)||string(item.namespace);
 const name=item.type==='mcpToolCall'?tool.replaceAll('_',' '):tool;
 // PN's generic fallback has Used/Using, without an invented failedVerb.
 return {label:t(busy?'Using {tool}':'Used {tool}',{tool:`${scope?`${scope}: `:''}${name}`}),meta:null};
}
function inputs(item) {
 // A Workflow call's inline script is saved with its run (the Tasks pane shows it): its row lists the other inputs.
 if(appToolCall(item)?.tool==='Workflow')return record(item.arguments)?Object.entries(item.arguments).filter(([key])=>key!=='script'):[];
 if(item.type!=='webSearch')return record(item.arguments)?Object.entries(item.arguments):item.arguments!==undefined&&item.arguments!==null?[['arguments',item.arguments]]:[];
 const action=record(item.action)?item.action:{},pairs=[];
 if(action.type==='openPage'||action.type==='findInPage') {
  if(typeof action.url==='string')pairs.push(['url',action.url]);
  if(typeof action.pattern==='string')pairs.push(['pattern',action.pattern]);
 }else{
  const query=string(item.query)||string(action.query);
  if(query)pairs.push(['query',query]);
  if(Array.isArray(action.queries))pairs.push(['queries',action.queries]);
 }
 if(action.type && !['search','openPage','findInPage'].includes(action.type))pairs.push(['action',action.type]);
 return pairs;
}
// Web sources ({url,title?,snippet?,publishedAt?}) read as a source list; an
// entry with any other field is opaque/new content and the whole list stays JSON.
const sourceKeys=new Set(['url','title','snippet','publishedAt']);
const isWebSource=value=>record(value)&&typeof value.url==='string'&&Object.entries(value).every(([key,field])=>sourceKeys.has(key)&&(key==='url'||field===undefined||typeof field==='string'));
function webResults(results) {
 if(!Array.isArray(results)||!results.length||!results.every(isWebSource))return valueText(results,true);
 return results.map(({url,title,snippet,publishedAt})=>[title||url,url,[snippet,publishedAt&&`(${publishedAt})`].filter(Boolean).join(' ')].filter(Boolean).join('\n')).join('\n\n');
}
// Tool output images (the source's outputImages, QO approval-current.js:7398-7445):
// an MCP ImageContent block {type:'image', data, mimeType} becomes the data URL QO
// builds; a dynamic tool's Codex inputImage, or the bridge's outputImages on a
// read_image row, carries one already. Only base64 raster data URLs are images.
const IMAGE_MIME=/^image\/(?:png|jpeg|gif|webp)$/;
const BASE64=/^[A-Za-z0-9+/]+={0,2}$/;
const DATA_URL=/^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
// Parts are immutable protocol objects: each (possibly MB-sized) payload is checked once.
const imageUrlOf=make=>{
 const urls=new WeakMap();
 return part=>{
  if(!record(part))return null;
  if(!urls.has(part))urls.set(part,make(part));
  return urls.get(part);
 };
};
const mcpImageUrl=imageUrlOf(part=>part.type==='image'&&typeof part.mimeType==='string'&&IMAGE_MIME.test(part.mimeType)&&typeof part.data==='string'&&BASE64.test(part.data)?`data:${part.mimeType};base64,${part.data}`:null);
const inputImageUrl=imageUrlOf(part=>part.type==='inputImage'&&typeof part.imageUrl==='string'&&DATA_URL.test(part.imageUrl)?part.imageUrl:null);
export function toolOutputImages(item) {
 if(item?.type==='mcpToolCall')return (Array.isArray(item.result?.content)?item.result.content:[]).map(mcpImageUrl).filter(Boolean);
 if(item?.type==='dynamicToolCall')return (Array.isArray(item.contentItems)?item.contentItems:[]).map(inputImageUrl).filter(Boolean);
 if(item?.type==='commandExecution')return (Array.isArray(item.outputImages)?item.outputImages:[]).map(inputImageUrl).filter(Boolean);
 return [];
}
// Text output content is displayed as text; opaque/new content remains JSON.
// Preserve structuredContent even when a tool also returns textual content.
// Images are toolOutputImages (thumbnails), never base64 in the details text.
function output(item) {
 if(item.type==='webSearch')return item.results!=null?webResults(item.results):item.result!=null?valueText(item.result,true):'';
 if(item.type==='mcpToolCall'&&record(item.result)&&Array.isArray(item.result.content)) {
  const parts=item.result.content.filter(part=>!mcpImageUrl(part)).map(part=>record(part)&&part.type==='text'&&typeof part.text==='string'?part.text:valueText(part,true));
  if(item.result.structuredContent!=null)parts.push(valueText(item.result.structuredContent,true));
  return parts.join('\n\n');
 }
 if(item.type==='dynamicToolCall'&&Array.isArray(item.contentItems))return item.contentItems.filter(part=>!inputImageUrl(part)).map(part=>part?.type==='inputText'&&typeof part.text==='string'?part.text:valueText(part,true)).join('\n\n');
 const value=item.result??item.output??item.contentItems;
 return value==null?'':valueText(value,true);
}
// The todo_write list as plan-pane steps (turn/plan/updated shape).
export function todoChecklist(item) {
 if(harnessTool(item)!=='todo_write')return null;
 return todosOf(item).filter(record).map(todo=>({step:string(todo.content)||string(todo.step),
  status:todo.status==='in_progress'?'inProgress':todo.status==='completed'?'completed':'pending'}));
}
// An Asked row with inline approvals is Qoe (KO :6979-6987, :7349-7395): each
// question, and once the call settled its answer — the DeepSeek tool's output is
// {answers:[{id, selected[], custom?}]} as JSON text (tool-ask-user index.ts:76-96),
// paired by id: the selected labels and the custom text joined with ', ', 'Skipped'
// with neither, 'Not answered' when the call was interrupted. While it runs only the
// questions show. null (generic details) for unparseable output.
// Each pair also keeps why it has no real answer (`unanswered`: 'skipped' with
// neither a selection nor custom text, 'dismissed' when the call was stopped), as
// the source ps (c06cf64bb) keeps it apart from the answer text.
// OpenClaude Desktop's AskUserQuestion (agent-tools/ask.mjs answerText): Claude Code's sentence, each answered question as
// "question"="answer" (no double quote inside either: the tool writes them as '), a skipped one left out.
function appAnswerPairs(item,state) {
 const questions=(Array.isArray(item.arguments?.questions)?item.arguments.questions:[]).filter(entry=>record(entry)&&string(entry.question).trim());
 if(!questions.length)return null;
 if(state==='busy'||state==='blocked')return questions.map(entry=>({question:entry.question,answer:null}));
 if(state==='stopped')return questions.map(entry=>({question:entry.question,answer:t('Not answered'),unanswered:'dismissed'}));
 const text=output(item).trim();
 if(/^The user did not answer these questions/.test(text))return questions.map(entry=>({question:entry.question,answer:t('Not answered'),unanswered:'dismissed'}));
 if(/^The user skipped the questions/.test(text))return questions.map(entry=>({question:entry.question,answer:t('Skipped'),unanswered:'skipped'}));
 if(!text.startsWith('User has answered your questions: '))return null;
 return questions.map(entry=>{
  const key=`"${string(entry.question).replace(/\s+/g,' ').trim().replace(/"/g,"'")}"="`,at=text.indexOf(key);
  if(at<0)return {question:entry.question,answer:t('Skipped'),unanswered:'skipped'};
  const start=at+key.length,end=text.indexOf('"',start);
  const answer=end>start?text.slice(start,end).trim():'';
  return answer?{question:entry.question,answer}:{question:entry.question,answer:t('Skipped'),unanswered:'skipped'};
 });
}
function answerPairs(item,state) {
 if(appToolCall(item)?.tool==='AskUserQuestion')return appAnswerPairs(item,state);
 if(harnessTool(item)!=='ask_user_question')return null;
 const questions=(Array.isArray(item.arguments?.questions)?item.arguments.questions:[]).filter(entry=>record(entry)&&string(entry.question).trim());
 if(!questions.length)return null;
 if(state==='busy'||state==='blocked')return questions.map(entry=>({question:entry.question,answer:null}));
 if(state==='stopped')return questions.map(entry=>({question:entry.question,answer:t('Not answered'),unanswered:'dismissed'}));
 let parsed;
 try{parsed=JSON.parse(output(item));}catch{return null;}
 if(!record(parsed)||!Array.isArray(parsed.answers))return null;
 const answers=new Map(parsed.answers.filter(record).map(answer=>[answer.id,answer]));
 return questions.map(entry=>{
  const answer=answers.get(entry.id);
  if(!answer)return {question:entry.question,answer:null};
  const selected=Array.isArray(answer.selected)?answer.selected.filter(label=>typeof label==='string'&&label.trim()):[];
  const text=[...selected,string(answer.custom).trim()].filter(Boolean).join(', ');
  return text?{question:entry.question,answer:text}:{question:entry.question,answer:t('Skipped'),unanswered:'skipped'};
 });
}
export function questionAnswers(item,state=commandRowState(item)) {
 return answerPairs(item,state)?.map(({question,answer})=>({question,answer}))??null;
}
// The question receipt (vZ, approval-current.js:35628-35651) replaces the Asked row once
// the call completed without error and at least one question has a real answer (ms,
// c06cf64bb): every answered or skipped question as a pair, a skipped one reading
// 'Skipped' (wue :45232-45240); a question with no answer entry is left out. null keeps the row.
export function questionReceipt(item,state=commandRowState(item)) {
 if(state!=='done'||item?.status!=='completed'||item.success===false)return null;
 const pairs=answerPairs(item,state);
 if(!pairs?.some(entry=>entry.answer!=null&&!entry.unanswered))return null;
 return pairs.filter(entry=>entry.answer!=null).map(({question,answer})=>({question,answer}));
}
// The Asked row's outcome note when nothing was answered (wue :45284-45295): 'Skipped'
// when every question was skipped, none while an answer entry is missing. A stopped call
// keeps the row's own 'Stopped' word.
export function questionOutcome(item,state=commandRowState(item)) {
 if(state!=='done'||item?.status!=='completed'||questionReceipt(item,state))return null;
 const pairs=answerPairs(item,state);
 return pairs?.length&&pairs.every(entry=>entry.unanswered==='skipped')?t('Skipped'):null;
}
// The expanded body: KO (:6966-6977) shows a TodoWrite as its checklist (none
// for an empty list) and an ExitPlanMode as the plan, which the proposed-plan
// item above the row already shows. A failed call keeps its details (the error),
// as KO sends only a non-error (or interrupted) question to Qoe.
export function genericToolBody(item,state=commandRowState(item)) {
 const harness=harnessTool(item);
 if(state!=='failed'&&appToolCall(item)?.tool==='AskUserQuestion'&&questionAnswers(item,state))return 'questions';
 if(state==='failed'||harness===null)return 'details';
 if(harness==='exit_plan_mode')return 'none';
 if(harness==='todo_write')return todoChecklist(item).length?'todos':'none';
 if(harness==='ask_user_question'&&questionAnswers(item,state))return 'questions';
 return 'details';
}
export function genericToolDetails(item) {
 const entries=inputs(item).map(([key,value])=>({key,value,text:valueText(value)}));
 const text=output(item),error=item.error?string(item.error.message)||valueText(item.error):'';
 const inputText=entries.map(({key,text})=>`${key}: ${text}`).join('\n');
 const outputText=[error,text].filter(Boolean).join('\n\n');
 return {entries,text,error,copyText:[inputText,outputText].filter(Boolean).map(stripAnsi).join('\n\n'),hasDetails:entries.length>0||!!text||!!error};
}
