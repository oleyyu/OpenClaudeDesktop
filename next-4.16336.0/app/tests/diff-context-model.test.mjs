import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUnifiedDiff} from '../src/diff-model.js';
import {contextRegions,visibleContext,expandContext,diffPayload} from '../src/diff-context-model.mjs';
const patch=(length=800,edits=[150,600])=>'--- a/demo.ts\n+++ b/demo.ts\n@@ -1,'+length+' +1,'+length+' @@\n'+Array.from({length},(_,i)=>edits.includes(i+1)?`-old ${i+1}\n+new ${i+1}\n`:` line ${i+1}\n`).join('');
const model=(value=patch())=>parseUnifiedDiff(value).files[0];
const shown=(regions,state)=>visibleContext(regions,state).filter(x=>x.kind==='rows').flatMap(x=>x.rows);

test('complete workspace data hides exact leading, middle and trailing context with original coordinates',()=>{
 const regions=contextRegions(model(),true),gaps=regions.filter(x=>x.kind==='gap');
 assert.deepEqual(gaps.map(x=>[x.count,x.first,x.last]),[[146,true,false],[443,false,false],[197,false,true]]);
 assert.equal(shown(regions).length,16);
 assert.deepEqual(shown(regions).filter(x=>x.type==='removed').map(x=>x.oldLine),[150,600]);
 assert.equal(shown(regions).filter(x=>x.type==='context').length,12);
});
test('100-line directional and both expansion never duplicate or invent a line; last remaining one is shown',()=>{
 const regions=contextRegions(model(),true),gaps=regions.filter(x=>x.kind==='gap');
 let state=expandContext({},gaps[0],'down');
 assert.equal(visibleContext(regions,state).find(x=>x.id===gaps[0].id).remaining,46);
 assert.equal(shown(regions,state).some(x=>x.oldLine===47),true);
 assert.equal(shown(regions,state).some(x=>x.oldLine===46),false);
 state=expandContext(state,gaps[1],'up');assert.equal(visibleContext(regions,state).find(x=>x.id===gaps[1].id).remaining,343);
 state=expandContext(state,gaps[1],'both');assert.equal(visibleContext(regions,state).find(x=>x.id===gaps[1].id).remaining,143);
 for(const gap of gaps)for(let i=0;i<5;i++)state=expandContext(state,gap,'both');
 assert.equal(visibleContext(regions,state).filter(x=>x.kind==='gap').length,0);
 assert.deepEqual(shown(regions,state),model().hunks[0].rows);
 const tiny=contextRegions(model(patch(105,[105])),true),gap=tiny.find(x=>x.kind==='gap');
 assert.equal(gap.count,101);assert.equal(visibleContext(tiny,expandContext({},gap,'down')).filter(x=>x.kind==='gap').length,0);
});
test('partial and malformed data cannot acquire expansion or unknown tail from a boolean alone',()=>{
 assert.equal(contextRegions(model(),false),null);
 assert.equal(contextRegions(model('--- a/a\n+++ b/a\n@@ -7 +7 @@\n-a\n+b\n'),true),null);
 assert.equal(contextRegions(model('--- a/a\n+++ b/a\n@@ -1,2 +1 @@\n-a\n+b\n'),true),null);
 assert.deepEqual(diffPayload('raw patch'),{patch:'raw patch',completeContext:false});
 assert.deepEqual(diffPayload(null),{patch:'',completeContext:false});
 // diffgit-08: the main process's patches_withheld travels only as a boolean.
 assert.deepEqual(diffPayload({patch:'p',completeContext:true,patches_withheld:true}),{patch:'p',completeContext:true,patchesWithheld:true});
 assert.deepEqual(diffPayload({patch:'p',patches_withheld:false}),{patch:'p',completeContext:false,patchesWithheld:false});
 assert.deepEqual(diffPayload({patch:'p',patches_withheld:'true'}),{patch:'p',completeContext:false});
});
test('new/deleted files show every real changed line with no false unchanged gap',()=>{
 for(const value of ['--- /dev/null\n+++ b/a\n@@ -0,0 +1,2 @@\n+a\n+b\n','--- a/a\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-a\n-b\n']){
  const file=model(value),regions=contextRegions(file,true);assert.ok(regions);assert.deepEqual(shown(regions),file.hunks[0].rows);assert.equal(regions.some(x=>x.kind==='gap'),false);
 }
});
test('unchanged final no-newline annotation stays with its real line through expansion',()=>{
 const file=model(patch(40,[10]).trimEnd()+'\n\\ No newline at end of file\n');
 const regions=contextRegions(file,true),tail=regions.at(-1);assert.equal(tail.kind,'gap');assert.equal(tail.last,true);
 const rows=shown(regions,expandContext({},tail,'up'));assert.equal(rows.at(-2).oldLine,40);assert.equal(rows.at(-1).type,'note');
});
test('gaps of one line stay visible and side offsets remain authoritative after insertions',()=>{
 const value='--- a/a\n+++ b/a\n@@ -1,12 +1,13 @@\n a\n b\n c\n d\n+inserted\n e\n f\n g\n h\n i\n j\n k\n l\n';
 const file=model(value),regions=contextRegions(file,true),first=regions[0];assert.equal(first.kind,'rows');assert.equal(first.rows[0].oldLine,1);
 const tail=regions.at(-1);const rows=shown(regions,expandContext({},tail,'up'));
 assert.deepEqual(rows,file.hunks[0].rows);assert.equal(rows.at(-1).newLine,13);assert.equal(rows.at(-1).oldLine,12);
});
