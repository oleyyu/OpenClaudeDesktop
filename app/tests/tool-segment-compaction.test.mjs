import test from 'node:test';
import assert from 'node:assert/strict';
import {groupFileTools,coalesceFileRuns} from '../src/file-tool-model.mjs';
import {isHiddenTranscriptItem} from '../src/transcript-item-visibility.mjs';
import {buildTurnCopyFooters} from '../src/turn-copy-model.mjs';
const read=(id,path='/fixture/deploy.log',turnId='t')=>({id,type:'commandExecution',turnId,status:'completed',commandActions:[{type:'read',path}],aggregatedOutput:id});
const thinking=(id,text='Checking the next result',turnId='t')=>({id,type:'reasoning',turnId,summary:[text]});
const visible=items=>items.filter(item=>!isHiddenTranscriptItem(item));
test('hidden reasoning and empty text do not fragment repeated read batches; all identities and outputs survive',()=>{
 const calls=Array.from({length:6},(_,i)=>read('r'+i));
 const input=calls.flatMap((call,i)=>[call,thinking('q'+i),{id:'empty'+i,type:'agentMessage',turnId:'t',text:' \n'}]);
 const before=JSON.stringify(input),rows=groupFileTools(input),shown=visible(rows);
 assert.equal(shown.length,1);assert.deepEqual(shown[0].toolGroup,calls);
 assert.deepEqual(coalesceFileRuns(calls)[0].fileRun,calls);assert.equal(rows.length,13);assert.equal(JSON.stringify(input),before);
});
test('command, search, listing, web and generic batches share the same visibility-aware segmentation',()=>{
 const tools=[{...read('command'),commandActions:[]},{...read('search'),commandActions:[{type:'search',query:'needle'}]},{...read('list'),commandActions:[{type:'listFiles',path:'/fixture'}]},{id:'web',type:'webSearch',turnId:'t'},{id:'mcp',type:'mcpToolCall',turnId:'t'},{id:'dynamic',type:'dynamicToolCall',turnId:'t'}];
 const rows=visible(groupFileTools(tools.flatMap((item,i)=>[item,thinking('q'+i)])));
 assert.equal(rows.length,1);assert.deepEqual(rows[0].toolGroup,tools);
});
test('visible prose, turns and local surfaces remain boundaries; thinking/verbose retain real reasoning',()=>{
 const a=read('a'),b=read('b');
 for(const view of ['thinking','verbose']){
  assert.equal(groupFileTools([a,thinking('q'),b],view).length,3);
  const empty=thinking('empty',' \n');assert.equal(isHiddenTranscriptItem(empty,view),true);assert.ok(groupFileTools([a,empty,b],view)[0].toolGroup);
 }
 for(const boundary of [{id:'p',type:'agentMessage',text:'Progress update',turnId:'t'},{id:'u',type:'userMessage',turnId:'t'},{id:'compact',type:'contextCompaction',turnId:'t'},{id:'local',localCommand:true},{id:'workflow',workflowRun:{id:'w'}}])assert.equal(groupFileTools([a,boundary,b]).length,3);
 assert.equal(visible(groupFileTools([a,thinking('next','Reason','next'),read('b','/fixture/deploy.log','next')])).length,2);
});
test('invisible last-turn anchors stay reachable and exactly one footer remains after the aggregated tools',()=>{
 const items=[{id:'p',type:'agentMessage',text:'Work underway',turnId:'t'},read('a'),thinking('mid'),read('b'),thinking('last')];
 const footer=buildTurnCopyFooters(items,{activeTurnId:null})[0],rows=groupFileTools(items);
 assert.equal(footer.anchorItemId,'last');assert.equal(rows.at(-1).id,footer.anchorItemId);assert.equal(rows[1].toolGroup.length,2);
 const anchors=rows.map(row=>row.toolGroup?.at(-1)?.id||row.id);assert.equal(anchors.filter(id=>id===footer.anchorItemId).length,1);
});

test('whitespace-only agent output has no meaningless turn actions; actual prose keeps its footer',()=>{
 const blank={id:'blank',type:'agentMessage',turnId:'t',text:' \n\t'};
 assert.deepEqual(buildTurnCopyFooters([read('r'),blank],{activeTurnId:null}),[]);
 const footer=buildTurnCopyFooters([{...blank,text:'Real answer'},read('r'),blank],{activeTurnId:null});
 assert.equal(footer.length,1);assert.equal(footer[0].text,'Real answer');assert.equal(footer[0].anchorItemId,'blank');
});
