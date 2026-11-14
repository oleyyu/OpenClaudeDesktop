import test from 'node:test';import assert from 'node:assert/strict';
import {createPlainCodeScheduler} from '../src/plain-code-scheduler.mjs';
function fixture(initialText='seed'){
 let time=1000,next=0;const pending=new Map(),callbacks=[],commits=[];
 const clock={now:()=>time,schedule:(fn,delay)=>{const id=++next;pending.set(id,{at:time+delay,fn});callbacks.push(fn);return id;},cancel:id=>pending.delete(id)};
 const owner=createPlainCodeScheduler({...clock,initialText,onCommit:text=>commits.push({at:time,text})});
 function advance(target){while(true){const due=[...pending].filter(([,job])=>job.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;pending.delete(due[0]);time=due[1].at;due[1].fn();}time=target;}
 return {owner,commits,pending,callbacks,advance};
}
test('continuous plain code input coalesces to the latest bytes at100ms instead of debouncing forever',()=>{
 const f=fixture();f.owner.update('one',true);for(let at=1010;at<1100;at+=10){f.advance(at);f.owner.update('at'+at,true);assert.equal(f.pending.size,1);}f.advance(1099);assert.deepEqual(f.commits,[{at:1000,text:'one'}]);f.advance(1100);assert.deepEqual(f.commits,[{at:1000,text:'one'},{at:1100,text:'at1090'}]);f.advance(1101);f.owner.update('next',true);f.advance(1200);assert.deepEqual(f.commits.at(-1),{at:1200,text:'next'});
});
test('completion publishes exact whitespace immediately and invalidates the still-pending growing value',()=>{
 const f=fixture();f.owner.update('x',true);f.advance(1005);f.owner.update('old',true);const stale=f.callbacks.at(-1);f.advance(1010);f.owner.update('\tcomplete  \n\n',false);assert.deepEqual(f.commits.at(-1),{at:1010,text:'\tcomplete  \n\n'});assert.equal(f.pending.size,0);stale();f.advance(1400);assert.equal(f.commits.length,2);
});
test('returning to the displayed source cancels a pending rewrite without producing a duplicate commit',()=>{
 const f=fixture();f.owner.update('visible',true);f.advance(1010);f.owner.update('discard',true);const stale=f.callbacks.at(-1);f.advance(1020);f.owner.update('visible',true);stale();f.advance(1400);assert.deepEqual(f.commits,[{at:1000,text:'visible'}]);
});
test('a disposed plain branch cannot repaint after highlighter handover or scope replacement',()=>{
 const old=fixture('old scope');old.owner.update('old immediate',true);old.advance(1010);old.owner.update('old late',true);const stale=old.callbacks.at(-1);old.owner.dispose();old.owner.dispose();stale();old.owner.update('after unmount',false);assert.equal(old.pending.size,0);assert.deepEqual(old.commits,[{at:1000,text:'old immediate'}]);const fresh=fixture('new scope');fresh.owner.update('new scope',true);assert.deepEqual(fresh.commits,[]);fresh.owner.update('new text',true);assert.deepEqual(fresh.commits,[{at:1000,text:'new text'}]);
});
