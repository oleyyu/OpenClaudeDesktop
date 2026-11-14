import test from 'node:test';
import assert from 'node:assert/strict';
import { syncSideChatScroll, emptySideChatScroll } from '../src/generated/code-editor/side-chat-scroll.mjs';

// A scroll viewport obeying the browser's clamp, with question positions in
// content coordinates. This exercises source policy without reimplementing it.
function fixture() {
  const state={current:emptySideChatScroll},calls=[];
  const node={scrollTop:0,scrollHeight:800,clientHeight:200,questionTops:[20,300],getBoundingClientRect:()=>({top:50}),
    querySelectorAll(){const questions=this.questionTops.map(top=>({getBoundingClientRect:()=>({top:50+top-this.scrollTop})}));return {length:questions.length,item:i=>questions[i]??null};},
    scrollTo(options){calls.push(options);this.scrollTop=Math.max(0,Math.min(options.top,this.scrollHeight-this.clientHeight));}};
  const messages={a:[{role:'user'},{role:'assistant'},{role:'user'},{role:'assistant'}]},source={getState:()=>({messagesBySession:messages,queuedBySession:{}})};
  return {node,state,calls,messages,sync:(session='a')=>syncSideChatScroll({current:node},session,source,state)};
}
test('new long reply anchors its question 8px below the viewport instead of scrolling to the tail',()=>{
  const f=fixture();f.sync();assert.equal(f.node.scrollTop,292);assert.equal(f.calls.at(-1).behavior,'instant');
  f.node.scrollHeight+=400;f.sync();assert.equal(f.node.scrollTop,292,'growing reply keeps its beginning visible');
});
test('manual history reading survives growth and the 4px end tolerance is respected',()=>{
  const f=fixture();f.node.scrollTop=600;f.sync();f.node.scrollTop=500;f.node.scrollHeight=1000;const count=f.calls.length;f.sync();assert.equal(f.node.scrollTop,500);assert.equal(f.calls.length,count);
  // A viewport within four pixels of its previous end is eligible for adjustment.
  f.node.scrollTop=796;f.node.questionTops=[20,920];f.node.scrollHeight=1200;f.sync();assert.equal(f.node.scrollTop,912);
});
test('new question and different session do not inherit the previous reply reading lock',()=>{
  const f=fixture();f.sync();f.node.scrollTop=100;f.messages.a.push({role:'user'});f.sync();assert.equal(f.node.scrollTop,600,'pending user question is visible at the end');
  f.node.scrollTop=100;f.messages.b=[{role:'user'},{role:'assistant'}];f.node.questionTops=[450];f.sync('b');assert.equal(f.node.scrollTop,442);
});
