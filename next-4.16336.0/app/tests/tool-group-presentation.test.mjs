import test from 'node:test';
import assert from 'node:assert/strict';
import {fileGroupPresentation} from '../src/file-tool-model.mjs';
import {createToolGroupExpansion,groupExpansionKey} from '../src/tool-group-expansion.mjs';
const command=(id,status)=>({id,type:'commandExecution',status,command:'true'});
const read=(id,status,path='/work/file.ts')=>({...command(id,status),commandActions:[{type:'read',path}]});
test('all-failed category colors its verb but retains the exact failure count for accessible text',()=>{
 const all=fileGroupPresentation([command('a','failed'),command('b','failed')]);assert.equal(all.label,'Ran 2 commands (2 failed)');assert.deepEqual(all.segments,[{verb:'Ran',meta:'2 commands',isError:true,failedMeta:'2 commands (2 failed)'}]);
 const mixed=fileGroupPresentation([command('a','failed'),command('b','completed')]);assert.equal(mixed.segments[0].isError,false);assert.equal(mixed.segments[0].meta,'2 commands (1 failed)');
});
// Sk:16616–16702 shares one known file basename even in mixed groups or failed categories.
test('failed categories remain independent of successful categories and preserve first appearance',()=>{
 const result=fileGroupPresentation([read('r','failed'),command('a','completed'),{id:'web',type:'webSearch',status:'completed'}]);assert.deepEqual(result.segments.map(s=>[s.verb,s.meta,s.isError]),[['Read','file.ts',true],['ran','a command',false],['browsed','the web',false]]);assert.equal(result.label,'Read file.ts (1 failed), ran a command, browsed the web');
});
test('path retries follow latest observed outcomes, interrupted retries do not erase actual failures',()=>{
 const failed=read('a','failed');assert.equal(fileGroupPresentation([failed,read('b','interrupted')]).segments[0].isError,true);
 assert.equal(fileGroupPresentation([failed,read('b','inProgress')]).segments[0].isError,false);
 assert.equal(fileGroupPresentation([failed,read('b','completed')]).segments[0].isError,false);
 assert.equal(fileGroupPresentation([read('a','completed'),read('b','failed')]).segments[0].isError,true);
});
test('interruptions, denials and completed nonzero exit codes never count as tool failures',()=>{
 for(const status of ['interrupted','declined','completed']){const result=fileGroupPresentation([{...command('a',status),exitCode:1},command('b','completed')]);assert.equal(result.label,'Ran 2 commands');assert.equal(result.segments[0].isError,false);}
});
test('expansion booleans survive remount subscriptions, isolate sessions, and do not collide at separators',()=>{
 const memory=createToolGroupExpansion(),a=groupExpansionKey('session:a','b'),b=groupExpansionKey('session','a:b');assert.notEqual(a,b);
 let calls=0;const off=memory.subscribe(()=>calls++);assert.equal(memory.get(a),undefined);memory.set(a,true);memory.set(a,true);assert.equal(calls,1);assert.equal(memory.get(b),undefined);off();memory.set(a,false);assert.equal(calls,1);
 const stop=memory.subscribe(()=>calls++);assert.equal(memory.get(a),false);memory.clear();assert.equal(memory.get(a),undefined);assert.equal(calls,2);stop();
});
test('bounded expansion cache stores explicit closed state and evicts only oldest intentions',()=>{
 const memory=createToolGroupExpansion(2);memory.set('a',true);memory.set('b',false);memory.set('a',false);memory.set('c',true);assert.equal(memory.get('b'),undefined);assert.equal(memory.get('a'),false);assert.equal(memory.get('c'),true);
});

const edit=(id,status,path='/work/file.ts')=>({id,type:'fileChange',status,changes:[{kind:'update',path,diff:''}]});
test('one file merges read/edit verbs at the first file category while commands keep their position',()=>{
 assert.equal(fileGroupPresentation([read('r','completed'),command('c','completed'),edit('e','completed')]).label,'Read and edited file.ts, ran a command');
 assert.equal(fileGroupPresentation([command('c','completed'),edit('e','completed'),read('r','completed')]).label,'Ran a command, edited and read file.ts');
 const failed=fileGroupPresentation([read('r','failed'),command('c','failed'),edit('e','completed')]);
 assert.deepEqual(failed.segments.map(x=>[x.verb,x.meta,x.isError]),[['Read and edited','file.ts (1 failed)',false],['ran','a command',true]]);
 assert.equal(failed.label,'Read and edited file.ts (1 failed), ran a command (1 failed)');
 assert.equal(failed.path,undefined);
});
test('merged file failure count uses categories, and retry outcomes remain distinct across read/edit',()=>{
 const both=fileGroupPresentation([read('r','failed'),edit('e','failed')]);assert.equal(both.label,'Read and edited file.ts (2 failed)');assert.equal(both.segments[0].isError,true);assert.equal(both.segments[0].meta,'file.ts');
 const retry=fileGroupPresentation([read('r','failed'),edit('e','failed'),read('r2','completed')]);assert.equal(retry.label,'Read and edited file.ts (1 failed)');assert.equal(retry.segments[0].isError,false);
});
test('missing or distinct file paths never claim a shared basename',()=>{
 for(const path of [undefined,'','/other/file.ts']){
  const value=fileGroupPresentation([read('r','completed'),{...edit('e','completed'),changes:[{kind:'update',path,diff:''}]}]);
  assert.equal(value.label,'Read a file, edited a file');assert.equal(value.path,undefined);
 }
});
test('one-path summary preserves hostile basename as text data and never interprets separators',()=>{
 const path='/work/<script>&name.ts';const value=fileGroupPresentation([read('r','completed',path),command('c','completed'),edit('e','completed',path)]);
 assert.equal(value.label,'Read and edited <script>&name.ts, ran a command');assert.equal(value.segments[0].meta,'<script>&name.ts');
});
test('a stopped read in a group is not counted as failed',()=>{
 const result=fileGroupPresentation([read('a','interrupted'),command('b','completed')]);
 assert.doesNotMatch(result.label,/failed/);assert.equal(result.segments[0].isError,false);
});

// R06 cf6ae6197 xk/fk: DeepSeek Harness tools take their source categories.
const harness=(id,tool,status='completed')=>({id,type:'dynamicToolCall',namespace:null,tool,arguments:{},status});
test('Harness todo_write, exit_plan_mode, run_code and glob read in the source category words',()=>{
 assert.equal(fileGroupPresentation([harness('t1','todo_write'),harness('t2','todo_write'),command('c','completed')]).label,'Updated todos, ran a command');
 assert.equal(fileGroupPresentation([read('r','completed','/work/a.ts'),harness('p','exit_plan_mode')]).label,'Read a.ts, proposed a plan');
 assert.equal(fileGroupPresentation([harness('x','run_code')]).label,'Ran code');
 const glob={...command('g','completed'),commandActions:[{type:'search',query:'**/*.ts',tool:'glob'}]};
 assert.equal(fileGroupPresentation([glob]).label,'Found files');
 assert.equal(fileGroupPresentation([{...glob,commandActions:[{type:'search',query:'x',tool:'grep'}]}]).label,'Searched code');
 const failed=fileGroupPresentation([harness('t','todo_write','failed')]);
 assert.equal(failed.label,'Updated todos (1 failed)');assert.deepEqual(failed.segments,[{verb:'Updated',meta:'todos',isError:true,failedMeta:'todos (1 failed)'}]);
 // ask_user_question, skill and job_* (and namespaced Codex tools) stay 'used'.
 assert.equal(fileGroupPresentation([harness('s','skill'),harness('j','job_output'),{...harness('n','todo_write'),namespace:'tools'}]).label,'Used 3 tools');
});
