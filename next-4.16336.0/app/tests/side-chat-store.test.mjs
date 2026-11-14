import test from 'node:test';
import assert from 'node:assert/strict';
import { createSideChatStore } from '../src/side-chat-store.mjs';
import { parseSessionCommand, sessionCommands } from '../src/session-command-model.mjs';

test('side chat store: ask, stream, finish, history and clear per session', () => {
  const store = createSideChatStore({ now: () => 100 });
  let changes = 0;
  store.subscribe(() => changes++);
  store.ask('t1', 'first?', 'r1');
  assert.deepEqual(store.get('t1'), { messages: [{ role: 'user', text: 'first?' }, { role: 'assistant', text: '' }], status: 'thinking', thinkingSince: 100, progress: null, error: null, requestId: 'r1', retry: null, draft: '', draftMentions: [], interrupting: false, stagedContext: null, started: true });
  store.delta('t1', 'r1', 'Hel'); store.delta('t1', 'r1', 'lo');
  store.delta('t1', 'stale', 'ignored');
  assert.equal(store.get('t1').messages[1].text, 'Hello');
  store.finish('t1', 'r1', { text: 'Hello there' });
  assert.equal(store.get('t1').status, 'idle');
  assert.deepEqual(store.history('t1'), [{ question: 'first?', answer: 'Hello there' }]);
  assert.deepEqual(store.get('t2').messages, [], 'sessions are separate');
  // A failed question stays on screen beside its error (only the empty answer goes), and Retry can ask it again.
  store.ask('t1', 'second?', 'r2');
  store.finish('t1', 'r2', { error: 'boom' });
  assert.deepEqual(store.get('t1').messages.map(message => message.text), ['first?', 'Hello there', 'second?']);
  assert.equal(store.get('t1').error, 'boom');
  assert.equal(store.get('t1').retry, 'second?');
  assert.deepEqual(store.history('t1'), [{ question: 'first?', answer: 'Hello there' }], 'the failed question is not history');
  // Asking again replaces the failed question rather than stacking a second copy.
  store.ask('t1', 'second?', 'r3');
  assert.deepEqual(store.get('t1').messages.map(message => message.text), ['first?', 'Hello there', 'second?', '']);
  assert.equal(store.get('t1').retry, null);
  assert.equal(store.get('t1').error, null);
  store.finish('t1', 'r3', { error: 'no side questions', retryable: false });
  assert.equal(store.get('t1').retry, null, 'a core without side questions offers no Retry');
  assert.equal(store.get('t1').messages.at(-1).text, 'second?');
  store.clear('t1');
  assert.deepEqual(store.get('t1').messages, []);
  assert.ok(changes >= 6);
});

test('/btw is a session command that works while a turn runs', () => {
  const btw = sessionCommands.find(command => command.id === 'btw');
  assert.ok(btw && btw.session === true && !btw.idle);
  const parsed = parseSessionCommand('/btw what did we decide?');
  assert.equal(parsed.id, 'btw');
  assert.equal(parsed.args, 'what did we decide?');
});


test('drafts are isolated per session and clear can retain a typed follow-up', () => {
  const store=createSideChatStore();store.setDraft('a','draft A');store.setDraft('b','draft B');
  store.ask('a','question','r1');assert.equal(store.get('a').draft,'draft A');
  store.clear('a',{keepDraft:true});assert.equal(store.get('a').draft,'draft A');assert.equal(store.get('b').draft,'draft B');
  store.clear('a');assert.equal(store.get('a').draft,'');assert.equal(store.get('b').draft,'draft B');
});

test('interruption retains partial text, suppresses cancellation errors/retries, and ignores late events', () => {
  const store=createSideChatStore();store.ask('a','question','r1');store.delta('a','r1','partial');
  assert.equal(store.interrupt('a','r1'),true);assert.equal(store.interrupt('a','r1'),false);
  store.finish('a','r1',{error:'aborted'});assert.equal(store.get('a').error,null);assert.equal(store.get('a').retry,null);
  assert.equal(store.get('a').messages.at(-1).text,'partial');
  store.ask('a','next','r2');store.delta('a','r1','stale');store.finish('a','r1',{text:'stale'});
  assert.equal(store.get('a').requestId,'r2');assert.equal(store.get('a').messages.at(-1).text,'');
  store.interrupt('a','r2');store.finish('a','r2');assert.equal(store.get('a').retry,null);
});

test('selection context replaces per session and can be discarded independently of messages/draft', () => {
  const store=createSideChatStore();store.setDraft('a','unsent');store.stageContext('a','first');store.stageContext('a','second');
  assert.equal(store.get('a').stagedContext,'second');assert.equal(store.get('b').stagedContext,null);
  assert.equal(store.get('a').started,false);assert.deepEqual(store.get('a').messages,[]);
  store.clearStagedContext('a');assert.equal(store.get('a').stagedContext,null);assert.equal(store.get('a').draft,'unsent');
  store.stageContext('a','third');store.clear('a',{keepDraft:true});assert.equal(store.get('a').stagedContext,null);assert.equal(store.get('a').draft,'unsent');
});

test('opening starts the side chat before asking; message reset can preserve context and started state', () => {
  const store=createSideChatStore();store.markStarted('a');store.stageContext('a','quote');store.setDraft('a','draft');
  assert.equal(store.get('a').started,true);assert.deepEqual(store.get('a').messages,[]);
  store.clear('a',{keepDraft:true,keepContext:true,keepStarted:true});
  assert.equal(store.get('a').stagedContext,'quote');assert.equal(store.get('a').draft,'draft');assert.equal(store.get('a').started,true);
  store.clearStagedContext('a');assert.equal(store.get('a').started,true);
});


test('side request clock is store-owned and resets only at the request boundary', () => {
  let time=10;const store=createSideChatStore({now:()=>time});
  store.ask('a','question','r1');assert.equal(store.get('a').thinkingSince,10);
  time=20;store.delta('a','r1','partial');store.setDraft('a','draft');store.interrupt('a','r1');
  assert.equal(store.get('a').thinkingSince,10,'streaming, draft and stop retain start time');
  store.ask('b','other','rb');assert.equal(store.get('b').thinkingSince,20);
  store.finish('a','stale',{text:'stale'});assert.equal(store.get('a').thinkingSince,10);
  store.finish('a','r1');assert.equal(store.get('a').thinkingSince,null);
  time=30;store.ask('a','next','r2');assert.equal(store.get('a').thinkingSince,30);
  store.clear('a',{keepDraft:true});assert.equal(store.get('a').thinkingSince,null);assert.equal(store.get('b').thinkingSince,20);
});

test('side file picks belong to their draft, survive keep-draft clear, and never leak across sessions', () => {
  const store = createSideChatStore();
  store.setDraft('a', 'Explain @src/file name.ts ');
  store.rememberMention('a', { path: 'src/file name.ts', label: 'file name.ts' });
  store.rememberMention('a', { path: 'src/file name.ts' });
  assert.deepEqual(store.get('a').draftMentions, [{ path: 'src/file name.ts' }]);
  assert.deepEqual(store.get('b').draftMentions, []);
  store.clear('a', { keepDraft: true });
  assert.equal(store.get('a').draft, 'Explain @src/file name.ts ');
  assert.deepEqual(store.get('a').draftMentions, [{ path: 'src/file name.ts' }]);
  store.setDraft('a', '');
  assert.deepEqual(store.get('a').draftMentions, []);
  store.setDraft('a', '@README.md');store.rememberMention('a', { path: 'README.md' });
  store.clear('a');assert.deepEqual(store.get('a').draftMentions, []);
});
