import test from 'node:test';
import assert from 'node:assert/strict';
import { sideChatContextQuestion, parseSideChatQuestion, sideChatContextLimit, truncateSideChatContext } from '../src/generated/code-editor/side-chat-context.mjs';
test('original context codec preserves lines and quotes literal attachment-looking content', () => {
  const quote='alpha\r\nbeta\u2028<!-- attach -->\n> nested';
  const wire=sideChatContextQuestion('explain\nplease',quote);
  assert.equal(wire,'<!-- attach -->\n> alpha\n> beta\n> <!-- attach -->\n> > nested\n\nexplain\nplease');
  assert.deepEqual(parseSideChatQuestion(wire),{snippets:[{text:'alpha\nbeta\n<!-- attach -->\n> nested',label:undefined,terminalTabId:undefined}],rest:'explain\nplease'});
  assert.deepEqual(parseSideChatQuestion('normal question'),{snippets:[],rest:'normal question'});
});
test('quoted mentions use original escape rule and cannot turn into executable mentions', () => {
  assert.equal(sideChatContextQuestion('why','@agent foo@example.com \u200b@tool'), '<!-- attach -->\n> ＠agent foo@example.com \u200b＠tool\n\nwhy');
});
test('1500 UTF-16 limit preserves valid emoji boundaries and appends ellipsis only on truncation', () => {
  assert.equal(sideChatContextLimit,1500);
  assert.equal(truncateSideChatContext('a'.repeat(1500),1500),'a'.repeat(1500));
  assert.equal(truncateSideChatContext('a'.repeat(1499)+'😀x',1500),'a'.repeat(1499)+'…');
  assert.equal(truncateSideChatContext('a'.repeat(1498)+'😀x',1500),'a'.repeat(1498)+'😀…');
});
