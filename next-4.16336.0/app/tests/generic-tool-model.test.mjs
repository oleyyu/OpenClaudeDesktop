import test from 'node:test';
import assert from 'node:assert/strict';
import {genericToolBody,genericToolDetails,genericToolLabel,observedGenericTool,questionAnswers,todoChecklist} from '../src/generic-tool-model.mjs';
import {groupFileTools,fileGroupPresentation} from '../src/file-tool-model.mjs';
import {reduce,emptyState} from '../src/state.js';
const event=(method,params)=>({event:{method,params}});
test('web tools derive live state only from observed lifecycle and the matching active turn',()=>{
 const item={id:'web',type:'webSearch',query:'compiler',turnId:'turn'};
 let state=reduce(emptyState,event('turn/started',{threadId:'s',turn:{id:'turn'}}));
 assert.strictEqual(observedGenericTool(item,state,'s'),item);
 state=reduce(state,event('item/started',{threadId:'s',turnId:'turn',item}));
 assert.equal(observedGenericTool(state.items.s[0],state,'s').status,'inProgress');assert.equal(state.items.s[0].status,undefined);
 assert.strictEqual(observedGenericTool(item,{...state,active:{s:'other'}},'s'),item);
 assert.strictEqual(observedGenericTool(item,{...state,active:{s:null}},'s'),item);
 state=reduce(state,event('item/completed',{threadId:'s',turnId:'turn',item}));assert.strictEqual(observedGenericTool(item,state,'s'),item);
 assert.strictEqual(observedGenericTool({...item,status:'failed'},state,'s').status,'failed');
});
test('search/open/find action labels preserve actual targets without generic web or invented tool descriptions',()=>{
 assert.deepEqual(genericToolLabel({type:'webSearch',query:'',action:{type:'search',queries:['one','two']}},'busy'),{label:'Searching web',meta:'one, two'});
 assert.deepEqual(genericToolLabel({type:'webSearch',action:{type:'openPage',url:'https://example.test'}},'failed'),{label:'Failed to fetch',meta:'https://example.test'});
 assert.deepEqual(genericToolLabel({type:'webSearch',action:{type:'findInPage',pattern:'API',url:'https://example.test'}},'done'),{label:'Searched',meta:'API'});
 assert.deepEqual(genericToolLabel({type:'mcpToolCall',server:'docs',tool:'read_docs'},'busy'),{label:'Using docs: read docs',meta:null});
 assert.equal(genericToolLabel({type:'dynamicToolCall',namespace:'tools',tool:'tool_search'},'done').label,'Used tools: tool_search');
});
test('generic parameter rows retain primitives, false, null, nested structures and original linebreaks in copy',()=>{
 const item={type:'mcpToolCall',arguments:{path:'a\nb',enabled:false,limit:0,optional:null,filter:{a:1}},result:{content:[{type:'text',text:'\u001b[32mFound\u001b[0m'}]}};
 const value=genericToolDetails(item);assert.equal(value.copyText,'path: a\nb\nenabled: false\nlimit: 0\noptional: null\nfilter: {"a":1}\n\nFound');assert.equal(value.entries.length,5);
 assert.equal(genericToolDetails({arguments:false}).copyText,'arguments: false');assert.equal(genericToolDetails({arguments:'literal input'}).copyText,'arguments: literal input');
});
test('MCP text unwraps envelope while structured and unknown content remain visible, no internal metadata shown',()=>{
 const d=genericToolDetails({type:'mcpToolCall',arguments:{},result:{content:[{type:'text',text:'Answer'},{type:'new_type',value:42}],structuredContent:{count:1},_meta:{private:'transport metadata'}}});
 assert.match(d.text,/^Answer\n\n/);assert.match(d.text,/"new_type"/);assert.match(d.text,/"count": 1/);assert.doesNotMatch(d.text,/transport metadata/);
 assert.equal(genericToolDetails({type:'dynamicToolCall',contentItems:[{type:'inputText',text:'actual text'}]}).text,'actual text');
 // R06: a raster data-URL image is a thumbnail (toolOutputImages), not details text; other image URLs stay opaque JSON.
 assert.equal(genericToolDetails({type:'dynamicToolCall',contentItems:[{type:'inputImage',imageUrl:'data:image/png;base64,abc='}]}).text,'');
 assert.match(genericToolDetails({type:'dynamicToolCall',contentItems:[{type:'inputImage',imageUrl:'https://example.test/a.png'}]}).text,/imageUrl/);
});
test('web details show every reported query and opaque result without making a fetched body or result card',()=>{
 const value=genericToolDetails({type:'webSearch',query:'one',action:{type:'search',queries:['one','two']},results:[{url:'https://example.test',title:'Actual title',newField:7}]});
 assert.equal(value.entries[1].text,'["one","two"]');assert.match(value.text,/"newField": 7/);
 assert.equal(genericToolDetails({type:'webSearch',action:{type:'openPage',url:'https://example.test'}}).copyText,'url: https://example.test');
 assert.equal(genericToolDetails({type:'webSearch',query:''}).hasDetails,false);
});
test('pure web/MCP/dynamic batches group with turn/prose boundaries and correct fetch counts',()=>{
 const items=[{id:'a',type:'webSearch',turnId:'t',action:{type:'openPage'}},{id:'b',type:'webSearch',turnId:'t',action:{type:'openPage'}},{id:'c',type:'mcpToolCall',turnId:'t'},{id:'d',type:'dynamicToolCall',turnId:'t'}];
 const grouped=groupFileTools(items);assert.equal(grouped.length,1);assert.equal(grouped[0].toolGroup.length,4);assert.equal(fileGroupPresentation(items).label,'Fetched 2 pages, used 2 tools');
 assert.equal(groupFileTools([items[0],{...items[1],turnId:'next'}]).length,2);assert.equal(groupFileTools([items[0],{id:'prose',type:'agentMessage',turnId:'t',text:'Actual prose boundary'},items[1]]).length,3);
});
test('DeepSeek web sources read as a source list, fetched text as text, failures as failed',()=>{
 const results=[{url:'https://a.test/x',title:'Actual title',snippet:'A snippet',publishedAt:'2026-09-30'},{url:'https://b.test'}];
 const value=genericToolDetails({type:'webSearch',status:'completed',query:'one',action:{type:'search',query:'one',queries:['one']},results});
 assert.equal(value.text,'Actual title\nhttps://a.test/x\nA snippet (2026-09-30)\n\nhttps://b.test\nhttps://b.test');
 assert.doesNotMatch(value.text,/[{}]/);
 assert.equal(genericToolDetails({type:'webSearch',action:{type:'openPage',url:'https://a.test'},results:'# Page\n\nBody'}).text,'# Page\n\nBody');
 const failed={type:'webSearch',status:'failed',query:'one',action:{type:'search',queries:['one']},results:null,error:{message:'Error: quota'}};
 assert.deepEqual(genericToolLabel(failed),{label:'Failed to search web',meta:'one'});
 assert.equal(genericToolDetails(failed).error,'Error: quota');
 assert.match(genericToolDetails({type:'webSearch',results:[{url:'https://a.test',score:1}]}).text,/"score": 1/,'unknown source fields stay opaque JSON');
});
test('DeepSeek Harness tools read in the source tool words; other Harness tools use their presenter title',()=>{
 const harness=(tool,args={},extra={})=>({type:'dynamicToolCall',namespace:null,tool,arguments:args,status:'completed',...extra});
 const todos={todos:[{content:'a',status:'pending'}]};
 assert.deepEqual(genericToolLabel(harness('todo_write',todos)),{label:'Updated todos',meta:null});
 assert.equal(genericToolLabel(harness('todo_write',{todos:[]})).label,'Cleared todos');
 assert.equal(genericToolLabel(harness('todo_write',todos),'busy').label,'Updating todos');
 assert.equal(genericToolLabel(harness('todo_write',todos),'failed').label,'Updated todos','no source failedVerb: the done verb');
 assert.deepEqual(genericToolLabel(harness('skill',{name:'pdf'},{title:'Load skill pdf'})),{label:'Ran skill',meta:'/pdf'});
 assert.deepEqual(genericToolLabel(harness('skill',{name:'pdf'}),'busy'),{label:'Running skill',meta:'/pdf'});
 assert.deepEqual(genericToolLabel(harness('skill',{name:'pdf'}),'failed'),{label:'Failed to run skill',meta:'/pdf'});
 assert.deepEqual(['busy','done','failed'].map(state=>genericToolLabel(harness('exit_plan_mode',{plan:'# P'}),state).label),['Proposing plan','Proposed plan','Failed to propose plan']);
 assert.deepEqual(genericToolLabel(harness('ask_user_question',{questions:[{id:'q',header:' Color ',question:'?'}]}),'busy'),{label:'Asking',meta:'Color'});
 assert.deepEqual(genericToolLabel(harness('ask_user_question',{questions:[{id:'a',question:'?'},{id:'b',question:'?'}]})),{label:'Asked',meta:'2 questions'});
 assert.deepEqual(genericToolLabel(harness('ask_user_question',{questions:[{id:'a',question:'?'}]})),{label:'Asked',meta:null});
 assert.deepEqual(['busy','done','failed'].map(state=>genericToolLabel(harness('job_output',{job_id:'j'}),state).label),['Reading task output','Read task output','Failed to read task output']);
 assert.deepEqual(['busy','done','failed'].map(state=>genericToolLabel(harness('job_list'),state).label),['Listing tasks','Listed tasks','Failed to list tasks']);
 assert.equal(genericToolLabel(harness('job_kill',{job_id:'j'},{status:'inProgress'})).label,'Stopping task');
 assert.equal(genericToolLabel(harness('job_kill',{job_id:'j'})).label,'Stopped task');
 assert.deepEqual(genericToolLabel(harness('run_code',{description:'Count the files',code:'1'}),'busy'),{label:'Running',meta:'Count the files'});
 assert.deepEqual(genericToolLabel(harness('run_code',{code:'1'})),{label:'Ran',meta:null});
 assert.deepEqual(genericToolLabel(harness('create_goal',{objective:'x'},{title:'Create goal'})),{label:'Create goal',meta:null});
 assert.equal(genericToolLabel(harness('create_goal',{},{title:'  '})).label,'Used create_goal');
 assert.equal(genericToolLabel(harness('create_goal')).label,'Used create_goal');
 // Namespaced (Codex) dynamic tools and MCP tools never take the Harness words or a title.
 assert.equal(genericToolLabel({type:'dynamicToolCall',namespace:'tools',tool:'todo_write',arguments:todos,title:'T'},'done').label,'Used tools: todo_write');
 assert.equal(genericToolLabel({type:'mcpToolCall',server:'s',tool:'skill',title:'T'},'done').label,'Used s: skill');
});
test('todo_write bodies are the plan checklist; exit_plan_mode has no body; failures keep their details',()=>{
 const todo={type:'dynamicToolCall',namespace:null,tool:'todo_write',status:'completed',arguments:{todos:[{content:'Read',status:'completed'},{content:'Edit',status:'in_progress'},{content:'Test',status:'pending'},'junk']}};
 assert.deepEqual(todoChecklist(todo),[{step:'Read',status:'completed'},{step:'Edit',status:'inProgress'},{step:'Test',status:'pending'}]);
 assert.equal(genericToolBody(todo),'todos');
 assert.equal(genericToolBody({...todo,arguments:{todos:[]}}),'none');
 assert.equal(genericToolBody({...todo,status:'failed'}),'details');
 assert.equal(genericToolBody({type:'dynamicToolCall',namespace:null,tool:'exit_plan_mode',status:'completed',arguments:{plan:'# P'}}),'none');
 assert.equal(genericToolBody({type:'dynamicToolCall',namespace:null,tool:'skill',status:'completed',arguments:{name:'pdf'}}),'details');
 assert.equal(genericToolBody({type:'dynamicToolCall',namespace:'tools',tool:'todo_write',status:'completed',arguments:todo.arguments}),'details');
 assert.equal(todoChecklist({type:'mcpToolCall',tool:'todo_write',arguments:todo.arguments}),null);
});
test('ask_user_question rows list each question with its answer (Qoe, approval-current.js:7349-7395)',()=>{
 const questions=[{id:'lang',header:'Language',question:'Which language?',options:[{label:'TypeScript'},{label:'Go'}]},{id:'tests',question:'Which test kinds?',options:[{label:'Unit'},{label:'UI'}],multi_select:true},{id:'name',question:'Package name?'}];
 const asked=(status,answers)=>({type:'dynamicToolCall',namespace:null,tool:'ask_user_question',status,arguments:{questions},contentItems:answers===undefined?null:[{type:'inputText',text:typeof answers==='string'?answers:JSON.stringify({answers})}]});
 // Answered pairs: selected labels joined with ', ', the custom text after them; nothing → Skipped.
 const done=asked('completed',[{id:'lang',selected:['Go']},{id:'tests',selected:['Unit','UI'],custom:'smoke'},{id:'name',selected:[]}]);
 assert.equal(genericToolBody(done),'questions');
 assert.deepEqual(questionAnswers(done),[{question:'Which language?',answer:'Go'},{question:'Which test kinds?',answer:'Unit, UI, smoke'},{question:'Package name?',answer:'Skipped'}]);
 // A free-text answer alone; an answer missing for a question shows no answer line.
 assert.deepEqual(questionAnswers(asked('completed',[{id:'name',selected:[],custom:'  cd-kit '}])).map(entry=>entry.answer),[null,null,'cd-kit']);
 // While busy (or blocked on its card) only the questions show.
 for(const status of ['inProgress']) assert.deepEqual(questionAnswers(asked(status)).map(entry=>entry.answer),[null,null,null]);
 assert.deepEqual(questionAnswers(asked('inProgress'),'blocked').map(entry=>entry.answer),[null,null,null]);
 // Interrupted: Not answered; failed keeps the generic details (KO gates Qoe on !isError || interrupted).
 assert.deepEqual(questionAnswers(asked('interrupted',[])).map(entry=>entry.answer),['Not answered','Not answered','Not answered']);
 assert.equal(genericToolBody(asked('failed','Error: dismissed')),'details');
 // Unparseable or shapeless output falls back to the details body.
 assert.equal(questionAnswers(asked('completed','not json')),null);
 assert.equal(genericToolBody(asked('completed','not json')),'details');
 assert.equal(genericToolBody(asked('completed','{"other":1}')),'details');
 assert.equal(genericToolBody({...asked('completed',[]),arguments:{}}),'details');
 assert.equal(questionAnswers({type:'dynamicToolCall',namespace:null,tool:'skill',status:'completed',arguments:{questions}}),null);
});

// R06 QO (approval-current.js:7398-7445): output images are split from the details text.
test('tool output images split from the text: no base64 reaches the details',async()=>{
 const {toolOutputImages}=await import('../src/generic-tool-model.mjs');
 const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
 const mcp={type:'mcpToolCall',server:'shots',tool:'take',status:'completed',arguments:{},result:{content:[{type:'text',text:'Took it'},{type:'image',data:PNG,mimeType:'image/png'}],structuredContent:null}};
 assert.deepEqual(toolOutputImages(mcp),[`data:image/png;base64,${PNG}`]);
 const details=genericToolDetails(mcp);assert.equal(details.text,'Took it');assert.doesNotMatch(details.copyText,/iVBOR/);
 // Non-raster or malformed image blocks stay opaque JSON and are no thumbnail.
 const svg={...mcp,result:{content:[{type:'image',data:'PHN2Zz4=',mimeType:'image/svg+xml'}]}};
 assert.deepEqual(toolOutputImages(svg),[]);assert.match(genericToolDetails(svg).text,/svg\+xml/);
 assert.deepEqual(toolOutputImages({...mcp,result:{content:[{type:'image',data:'not base64!',mimeType:'image/png'}]}}),[]);
 const dynamic={type:'dynamicToolCall',namespace:null,tool:'screenshot',status:'completed',arguments:{},contentItems:[{type:'inputText',text:'Shot'},{type:'inputImage',imageUrl:`data:image/png;base64,${PNG}`}]};
 assert.deepEqual(toolOutputImages(dynamic),[`data:image/png;base64,${PNG}`]);assert.equal(genericToolDetails(dynamic).text,'Shot');
 assert.deepEqual(toolOutputImages({...dynamic,contentItems:[{type:'inputImage',imageUrl:'javascript:alert(1)'}]}),[]);
 // read_image rows: the bridge's outputImages on the commandExecution.
 assert.deepEqual(toolOutputImages({type:'commandExecution',commandActions:[{type:'read',path:'/w/a.png'}],outputImages:[{type:'inputImage',imageUrl:`data:image/png;base64,${PNG}`}]}),[`data:image/png;base64,${PNG}`]);
 assert.deepEqual(toolOutputImages({type:'webSearch'}),[]);assert.deepEqual(toolOutputImages(null),[]);
});
// R06 vZ / ms / wue: answered questions become a receipt; all skipped keeps the Asked row.
test('question receipts: answered pairs, all-skipped outcome, busy/failed/stopped rows',async()=>{
 const {questionReceipt,questionOutcome}=await import('../src/generic-tool-model.mjs');
 const questions=[{id:'lang',question:'Which language?'},{id:'kinds',question:'Which test kinds?'},{id:'name',question:'Package name?'}];
 const asked=(status,answers,extra={})=>({type:'dynamicToolCall',namespace:null,tool:'ask_user_question',status,arguments:{questions},contentItems:answers===undefined?null:[{type:'inputText',text:JSON.stringify({answers})}],...extra});
 const done=asked('completed',[{id:'lang',selected:['Go']},{id:'kinds',selected:['Unit'],custom:'smoke'},{id:'name',selected:[]}]);
 assert.deepEqual(questionReceipt(done),[{question:'Which language?',answer:'Go'},{question:'Which test kinds?',answer:'Unit, smoke'},{question:'Package name?',answer:'Skipped'}]);
 assert.equal(questionOutcome(done),null);
 // A question with no answer entry is left out of the receipt.
 assert.deepEqual(questionReceipt(asked('completed',[{id:'kinds',selected:['UI']}])),[{question:'Which test kinds?',answer:'UI'}]);
 const skipped=asked('completed',questions.map(({id})=>({id,selected:[]})));
 assert.equal(questionReceipt(skipped),null);assert.equal(questionOutcome(skipped),'Skipped');
 assert.equal(questionOutcome(asked('completed',[{id:'lang',selected:[]}])),null,'a missing answer entry: no note');
 assert.equal(questionReceipt(asked('inProgress')),null);assert.equal(questionReceipt(done,'busy'),null);assert.equal(questionReceipt(done,'blocked'),null);
 assert.equal(questionReceipt({...done,status:'failed'}),null);assert.equal(questionReceipt({...done,success:false}),null);
 assert.equal(questionReceipt(asked('interrupted',[])),null);assert.equal(questionOutcome(asked('interrupted',[])),null);
 assert.equal(questionReceipt({...done,tool:'skill'}),null);
 // Answered questions never join a tool group; unanswered rows still do.
 const other={id:'o',type:'mcpToolCall',turnId:'t',status:'completed'};
 assert.equal(groupFileTools([other,{...done,id:'q',turnId:'t'},{...other,id:'o2'}]).length,3);
 assert.equal(groupFileTools([other,{...skipped,id:'q',turnId:'t'}]).length,1);
});
