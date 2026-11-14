import test from 'node:test';
import assert from 'node:assert/strict';
import {createPacingState,updatePacing,pacingCeiling,nextPacingBoundary,pacingBoundary,remapPacingOffset,pacingDelay,tickPacing,resumePacing,pacedText} from '../src/response-pacing-model.mjs';

test('initial 22-character step, strict 400 join and 600 rejoin boundaries match the active source path',()=>{
 for(const count of [1,22,23,399,400,401]){const s=createPacingState('a'.repeat(count),true,10);assert.equal(s.visible,count>400?count:Math.min(count,22));}
 let s=createPacingState('a'.repeat(30),true,10);s=updatePacing(s,'a'.repeat(622),true,11);assert.equal(s.visible,22);s=updatePacing(s,'a'.repeat(623),true,12);assert.equal(s.visible,623);
 const historical=createPacingState('a'.repeat(200),false,0);assert.equal(updatePacing(historical,historical.text,true,20).visible,200);
 let cleared=updatePacing(createPacingState('once shown',true), '',true,10);assert.equal(cleared.visible,0);assert.equal(updatePacing(cleared,'a'.repeat(100),true,20).visible,100);
});
test('steps prefer a space in the second half, preserve every source code unit, and never split surrogate pairs',()=>{
 assert.equal(nextPacingBoundary('one two three four five six',0),19);
 assert.equal(nextPacingBoundary('short '+'a'.repeat(40),0),22);
 assert.equal(nextPacingBoundary('a'.repeat(21)+'😀 more',0),21);
 assert.equal(pacingBoundary('a😀z',2),1);
 const text='第一行😀中文 '.repeat(45);let s=createPacingState(text,true,0);let now=0;
 while(s.visible<s.ceiling){const delay=pacingDelay(s,now);assert.notEqual(delay,null);now+=delay;s=tickPacing(s,now);const shown=pacedText(s);assert.ok(text.startsWith(shown));assert.ok(!/[\uD800-\uDBFF]$/.test(shown));}
 assert.equal(pacedText(s),text);
});
test('only the configured incomplete heading/list markers are held; no invented inline or math buffering',()=>{
 for(const tail of ['#','### ','> ## ','-','* ','123.','7) ','- [','- [x','- [x] ','> - [ ] '])assert.equal(pacingCeiling('Ready\n'+tail),6,tail);
 for(const text of ['>','```','$$','[link','**bold','- [z]','#######','    #','1234567890.'])assert.equal(pacingCeiling(text),text.length,text);
 assert.equal(pacingCeiling('Ready\n- [x] task'),16);
 assert.equal(nextPacingBoundary('a'.repeat(20)+'\n# Heading text goes here',0),21);
 assert.ok(nextPacingBoundary('### '+'word '.repeat(8),0)>4);
 const only=createPacingState('### ',true);assert.equal(pacedText(only),'');assert.equal(pacingDelay(only,999),null);
 assert.equal(pacedText(updatePacing(only,'### Heading',true,999)),'### Heading');
 assert.equal(pacedText(updatePacing(only,only.text,false,999)),only.text);
});
test('adaptive interval uses 550ms target with 25/150 bounds, no timer while idle, and a fresh delay after idle',()=>{
 let s=createPacingState('a'.repeat(300),true,0);assert.equal(pacingDelay(s,0),44);assert.equal(tickPacing(s,43),s);s=tickPacing(s,44);assert.equal(s.visible,44);
 assert.equal(pacingDelay({...s,ceiling:s.visible+600},44),25);
 assert.equal(pacingDelay({...s,ceiling:s.visible+1},44),150);
 s=resumePacing(s,50);assert.equal(pacingDelay(s,50),null);s=updatePacing(s,s.text+' more words',true,1000);assert.equal(pacingDelay(s,1000),150);
 assert.equal(tickPacing(s,1149),s);assert.equal(pacedText(tickPacing(s,1150)),s.text);
});
test('rewrites map the visible position through shared prefix/suffix and clamp deletions; clean source remains unchanged',()=>{
 assert.equal(remapPacingOffset('abcd-middle-tail','abcd-new-middle-tail',14),18);
 assert.equal(remapPacingOffset('abcdef','axyzf',3),3);
 assert.equal(remapPacingOffset('long text','x',7),1);
 let s=createPacingState('a'.repeat(100),true);s=updatePacing(s,'b'.repeat(90),true,30);assert.equal(s.visible,22);assert.equal(pacedText(s),'b'.repeat(22));
 s=updatePacing(s,'short',true,40);assert.equal(pacedText(s),'short');assert.equal(s.text,'short');
});
test('completion/reduced motion/interrupt flush full text; visibility resumes at held ceiling and disabling has no pending work',()=>{
 let s=createPacingState('a'.repeat(100)+'\n- ',true);const resumed=resumePacing(s,20);assert.equal(resumed.visible,101);assert.equal(pacedText(resumed),'a'.repeat(100)+'\n');
 assert.equal(resumePacing(resumed,30),resumed);
 const completed=updatePacing(s,s.text,false,40);assert.equal(pacedText(completed),s.text);assert.equal(pacingDelay(completed,40),null);assert.equal(tickPacing(completed,200),completed);
 assert.equal(updatePacing(completed,completed.text,true,50).visible,101);
 assert.equal(createPacingState('   \n\t',true).visible,0);
});
