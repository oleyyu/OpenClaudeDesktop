import test from 'node:test';
import assert from 'node:assert/strict';
import { fileAction, fileActionFacts, readContents, fileBasename, fileToolSummary, fileRunState, coalesceFileRuns, changePreview, fileRunCounts, pathChoices } from '../src/file-tool-model.mjs';
const read = (id,path='/w/a.ts',turnId='t') => ({id,turnId,type:'commandExecution',status:'completed',commandActions:[{type:'read',path}]});
const diff = '--- a/a.ts\n+++ b/a.ts\n@@ -1 +1,2 @@\n-old\n+new\n+more\n';
const edit = (id,kind='update',path='/w/a.ts') => ({id,turnId:'t',type:'fileChange',status:'completed',changes:[{path,kind:{type:kind},diff}]});
test('only single protocol action classifies; no command text inference',()=>{
 assert.equal(fileAction({type:'commandExecution',command:'cat file'}),null);
 assert.equal(fileAction({...read('r'),commandActions:[{type:'read'},{type:'search'}]}),null);
 assert.equal(fileAction(read('r')).type,'read');
});
test('read prefixes strip only when every nonempty line matches; exact content retained',()=>{
 assert.equal(readContents('  12\talpha\n 13\tbeta\n'),'alpha\nbeta\n');
 assert.equal(readContents('1: a\nplain\n'),'1: a\nplain\n');
 assert.equal(readContents('<script>foo</script>\n<system-reminder>x'),'<script>foo</script>\n<system-reminder>x');
 assert.equal(fileBasename('C:\\src\\app.ts\\'),'app.ts');
});
test('semantic labels and multi-file groups are not primary metas',()=>{
 assert.deepEqual(fileToolSummary([read('r')],'busy'),{label:'Reading',path:'/w/a.ts',meta:'a.ts'});
 assert.equal(fileToolSummary([edit('e','add')],'done').label,'Created');
 assert.equal(fileToolSummary([edit('e')],'failed').label,'Failed to edit');
 const item=edit('m');item.changes=[edit('a','add','a').changes[0],edit('b','update','b').changes[0],edit('c','update','c').changes[0]];
 assert.deepEqual(fileToolSummary([item],'done'),{label:'Created a file, edited 2 files'});
});
test('coalescing has tool, path and turn boundaries; approval wins over running',()=>{
 const items=[read('a'),read('b'),edit('c'),edit('d'),read('e','/w/a.ts','next'),read('f','/w/b.ts','next')];
 const runs=coalesceFileRuns(items);assert.equal(runs.length,4);assert.deepEqual(runs[0].fileRun.map(i=>i.id),['a','b']);assert.deepEqual(runs[1].fileRun.map(i=>i.id),['c','d']);
 assert.equal(fileRunState([{id:'a',status:'inProgress'},{id:'b',status:'inProgress'}],new Set(['a'])),'blocked');
 assert.equal(fileRunState([{id:'a',status:'inProgress'},{id:'b',status:'completed'}]),'busy');
});
test('unified hunk counts exclude headers, preserve raw and fall back honestly',()=>{
 const result=changePreview(edit('e').changes[0]);assert.equal(result.added,2);assert.equal(result.removed,1);assert.equal(result.raw,diff);
 assert.equal(changePreview({kind:'update',diff:'@@ malformed\n+foo'}).fallback,true);
 assert.equal(changePreview({kind:'add',diff:'alpha\nbeta\n'}).pureSide,'added');
 assert.equal(changePreview({kind:'delete',diff:'alpha\n'}).pureSide,'removed');
 assert.deepEqual(fileRunCounts([edit('a'),edit('b'),{...edit('bad'),status:'failed'}]),{added:4,removed:2});
});
test('path menu exposes relative only inside cwd, does not authorize filesystem access',()=>{
 assert.deepEqual(pathChoices('src/a.ts','/w'),{absolute:'/w/src/a.ts',relative:'src/a.ts',filename:'a.ts'});
 assert.equal(pathChoices('../elsewhere/a','/w').relative,null);assert.equal(pathChoices('/w2/a','/w').relative,null);
});

test('classic file group keeps prose boundaries and unique paths per category',async()=>{
 const {groupFileTools}=await import('../src/file-tool-model.mjs');
 const tools=[edit('create','add','a'),read('read','a'),edit('update','update','a'),edit('create2','add','b')];
 const grouped=groupFileTools([...tools,{id:'answer',type:'agentMessage',turnId:'t',text:'done'},read('after','b')]);
 assert.equal(grouped.length,3);assert.deepEqual(grouped[0].toolGroup.map(i=>i.id),tools.map(i=>i.id));
 assert.equal(grouped[1].id,'answer');
});

// Pure commands must group too (classic Npe :53865–54010). A nonzero
// process exit alone is not a protocol failure, nor is an interruption.
test('command groups count actual items and failures, never merge repeated commands',async()=>{
 const {groupFileTools}=await import('../src/file-tool-model.mjs');
 const tools=Array.from({length:8},(_,i)=>({id:`cmd${i}`,turnId:'t',type:'commandExecution',command:'echo same',status:i===5?'failed':'completed',exitCode:i===3?1:0}));
 const group=groupFileTools(tools);assert.equal(group.length,1);assert.equal(group[0].toolGroup.length,8);
 assert.equal(coalesceFileRuns(tools).length,8);
 assert.equal(groupFileTools([tools[0],{...tools[1],turnId:'another'}]).length,2);
});
test('DeepSeek read and glob shapes render clean contents and the searched pattern',()=>{
 // harness projection: one `N: text` line per structured read line, no footer.
 assert.equal(readContents('1: hello\n2: world'),'hello\nworld');
 assert.equal(readContents('1: hello\n2: world\n\n(End of file - total 2 lines)'),'1: hello\n2: world\n\n(End of file - total 2 lines)','a footer defeats the all-or-nothing strip, so the bridge drops it');
 const glob={id:'g',turnId:'t',type:'commandExecution',status:'completed',commandActions:[{type:'search',command:'Glob **/*.md',query:'**/*.md',path:null}]};
 assert.deepEqual(fileToolSummary([glob],'done'),{label:'Searched **/*.md'});
});

test('an exec-backed list step names the command that ran only when it reports no arguments, pattern or path',()=>{
 const item={type:'commandExecution',command:"/bin/zsh -lc 'ls -la'"};
 assert.deepEqual(fileActionFacts(item,{type:'listFiles',command:'ls -la',path:null}),[['command','ls -la']]);
 assert.deepEqual(fileActionFacts(item,{type:'listFiles',path:null}),[['command','ls -la']],'the item command, without its shell wrapper');
 assert.deepEqual(fileActionFacts({type:'commandExecution',command:'rg foo src'},{type:'search',command:'rg foo src',query:'foo',path:'src'}),[['pattern','foo'],['path','src']],'a search keeps its inputs, no synthesized command');
 assert.deepEqual(fileActionFacts(item,{type:'search',arguments:{pattern:'x',glob:null}}),[['pattern','x']],'a tool’s own arguments win');
});
