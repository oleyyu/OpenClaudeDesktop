import test from 'node:test';
import assert from 'node:assert/strict';
import {documentCode} from '../src/document-code-model.mjs';
import {createClipboardFeedback} from '../src/clipboard-feedback.mjs';

test('document fences preserve indentation and CRLF, remove only trailing whitespace, and distinguish labelled wrapping',()=>{
 assert.deepEqual(documentCode('  const x = 1;\r\n  return x; \n\t','language-TypeScript'),{text:'  const x = 1;\r\n  return x;',label:'TypeScript',language:'typescript',wrap:false});
 assert.deepEqual(documentCode(' x \n'),{text:' x',label:'',language:'',wrap:true});
 assert.equal(documentCode('x','language-objective-c').label,'objective');
 assert.equal(documentCode('x','language-c++').label,'c');
});
test('renderer citations strip only valid UUID marker lists, after trimming, without swallowing ordinary source',()=>{
 const id='12345678-ABCD-1234-abcd-123456789abc';
 const marker=`:antCitation[]{citations="${id},${id}"}`;
 assert.equal(documentCode('a '+marker+'b\n').text,'a b');
 assert.equal(documentCode('a '+marker+'\n').text,'a ');
 assert.equal(documentCode(':antCitation[]{citations="literal"}\n').text,':antCitation[]{citations="literal"}');
 assert.equal(documentCode('<img onerror="alert(1)">\n').text,'<img onerror="alert(1)">');
});
test('document copy uses two-second success feedback; rejected and replaced asynchronous writes never show success',async()=>{
 let resolve,fail=false,delay,state;const scheduled=new Map();let id=0;
 const owner=createClipboardFeedback({timeout:2000,writeText:()=>fail?Promise.reject(Error('denied')):new Promise(r=>resolve=r),onState:s=>state=s,schedule:(f,ms)=>{delay=ms;scheduled.set(++id,f);return id;},cancel:i=>scheduled.delete(i)});
 owner.setText('first');const stale=owner.copy();owner.setText('second');resolve();assert.equal(await stale,false);assert.equal(state,'idle');assert.equal(scheduled.size,0);
 fail=true;assert.equal(await owner.copy(),false);assert.equal(state,'error');
 fail=false;const success=owner.copy();resolve();assert.equal(await success,true);assert.equal(state,'copied');assert.equal(delay,2000);
 scheduled.values().next().value();assert.equal(state,'idle');owner.dispose();
});
