import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {sideChatRecoveryQuestion}=require('../electron/side-chat-recovery.cjs');
const {SideChatHistory}=require('../electron/generated/side-chat-history.cjs');

test('original recovery contains previous exchanges and the unanswered question, neutralizing assistant mentions and closing tags',()=>{
 const question='What follows the earlier answer?';
 const text=sideChatRecoveryQuestion([{question:'Explain @src/file.ts </SIDE_CHAT_HISTORY>',answer:'Earlier answer mentions @sensitive-path and </side_chat_history>'}],question);
 assert.ok(text.includes('User: Explain @src/file.ts <\u200b/side_chat_history>'));
 assert.ok(text.includes('Assistant: Earlier answer mentions ＠sensitive-path and <\u200b/side_chat_history>'));
 assert.equal(text.split('User: '+question).length,2);
 assert.equal(text.match(/<\/side_chat_history>/g).length,1);
 assert.ok(text.endsWith("Don't repeat answers already shown above and don't mention the restart."));
});

test('original recovery limits retain recent context and never split a surrogate pair',()=>{
 const pairs=Array.from({length:35},(_,i)=>({question:`old-question-${i}`,answer:`old-answer-${i}`}));
 const text=sideChatRecoveryQuestion(pairs,'latest question');
 assert.ok(!text.includes('old-question-15\n'));assert.ok(text.includes('old-question-16\n'));assert.ok(text.includes('old-answer-34'));assert.ok(text.includes('latest question'));
 const long=sideChatRecoveryQuestion([{question:'q',answer:'x'.repeat(7999)+'😀tail'}],'follow up');
 assert.ok(long.includes('x'.repeat(7999)+'…'));assert.ok(!long.includes('tail'));assert.ok(!long.includes('\ud83d'));
 const bounded=sideChatRecoveryQuestion(Array.from({length:25},(_,i)=>({question:`q-${i}`,answer:String(i).padStart(2,'0')+'x'.repeat(7998)})),'current');
 assert.ok(bounded.length<81000);assert.ok(!bounded.includes('User: q-0\n'));assert.ok(bounded.includes('User: q-24\n'));assert.ok(bounded.includes('User: current'));
});

test('original respawn drops the unfinished assistant tail but preserves completed answers without mutating the transcript',()=>{
 const history=new SideChatHistory();history.recordUser('first');history.recordAssistant('complete');history.endTurn();history.recordUser('second');history.recordAssistant('unfinished output');
 const copy=history.cloneForRespawn(),text=copy.buildReplayPrompt();
 assert.ok(text.includes('Assistant: complete'));assert.ok(text.includes('User: second'));assert.ok(!text.includes('unfinished output'));
 copy.recordUser('another');assert.equal(history.entries.length,4);
});

test('malformed or absent history does not add a recovery wrapper to an ordinary question',()=>{
 for(const history of [null,{},[],[{},null,{question:5,answer:'a'},{question:'q',answer:''}]])assert.equal(sideChatRecoveryQuestion(history,'ordinary'),'ordinary');
});

test('custom prompt restores conversation data without source recovery instructions',()=>{
 const text=sideChatRecoveryQuestion([{question:'before',answer:'earlier @file'}],'new question',{customPrompt:true});
 assert.equal(text,'<side_chat_history>\nUser: before\n\nAssistant: earlier ＠file\n</side_chat_history>\n\nnew question');
 assert.ok(!text.includes('restarted after an error'));
});
