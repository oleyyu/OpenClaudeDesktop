import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { chatIntl, chatSearchKind, chatSearchLabel, chatThinkingDuration, chatThinkingLabel, chatThinkingRow, thinkingBlock } from '../src/chat-thinking-model.mjs';

// w13-chatui-thinking-search (research/w13-chatui.md chatui-C9/C10): the Chat conversation's thought and search labels from
// the 3.6556.2 originals (scripts/extract-chat-thinking.mjs → src/generated/chat-thinking), the pure model, the
// TurnStatus step rows and the source-session hook. Source only: generator --check, official text, SSR markup, plain node
// for the model; no browser, no network.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const directory = path.join(app, 'src/generated/chat-thinking');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;

let server, i18n, thinking, session;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  thinking = await server.ssrLoadModule('/src/source-chat-thinking.jsx');
  session = await server.ssrLoadModule('/src/source-session.jsx');
});
after(async () => { i18n?.setLocale('en-US'); await closeWhenSettled(server); await server?.close(); });

const thought = { id: 'r1', type: 'reasoning', turnId: 't1', summary: ['**Planning**\n\nWeigh the options.'], content: [], startedAtMs: 1_000, completedAtMs: 13_400 };
const search = { id: 's1', type: 'webSearch', turnId: 't1', query: 'weather', action: { type: 'search', query: 'weather' } };

test('generator: --check passes and the manifest pins the 3.6556.2 originals', async () => {
  const { extractChatThinking } = await import('../scripts/extract-chat-thinking.mjs');
  await extractChatThinking({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.deepEqual(manifest.modules.map(m => [m.target, m.source, m.bindings.map(b => b.name)]), [
    ['thinking-labels.mjs', 'c05b96c7f-MPVkefMW.js', ['zs', 'Bs', 'Wg', 'Gg']],
    ['tool-group-label.mjs', 'shared-130-dWztbTO1.js', ['rq', 'uq']]]);
  assert.deepEqual(fs.readdirSync(directory).sort(), [...manifest.modules.map(m => m.target), 'manifest.json'].sort());
  for (const module of manifest.modules) {
    assert.equal(module.sourceSha256, sha(fs.readFileSync(path.join(v1, module.source))), module.source);
    assert.equal(module.sha256, sha(fs.readFileSync(path.join(directory, module.target))), module.target);
    // Plain functions and tables over an injected intl: no imports (the pure model loads them under plain node, E42).
    assert.doesNotMatch(fs.readFileSync(path.join(directory, module.target), 'utf8'), /^import /m, module.target);
  }
});

test('official text: the labels and the table are the 3.6556.2 originals', () => {
  const c05 = official('c05b96c7f-MPVkefMW.js'), s130 = official('shared-130-dWztbTO1.js');
  for (const s of ['defaultMessage:"Thought for {seconds}s",id:"Jj0DasG7Mx"', 'defaultMessage:"Thought for {minutes}m {seconds}s",id:"4LM6AdGWNg"',
    'defaultMessage:"Thought for {minutes}m",id:"vFyvc213kN"', 'defaultMessage:"Thought for {hours}h {minutes}m",id:"voTuOb/ijW"',
    'defaultMessage:"Thought for {hours}h",id:"MFx4UWu2HS"', 'defaultMessage:"Thought process",id:"zl6fNbo7RW"', 'Bs as vr', 'zs as yr'])
    assert.ok(c05.includes(s), s);
  for (const s of ['defaultMessage:"Searched the web",id:"4+310Bnuvz"', 'defaultMessage:"Searched project knowledge",id:"4GCi2qH3xL"',
    'defaultMessage:"Read a page",id:"XJU1UZCozL"', 'project_knowledge_search:"project_knowledge"', 'web_search:"web"', 'uq as Ir'])
    assert.ok(s130.includes(s), s);
  // cc1aae219 (the Chat message timeline) draws its rows with nS = c734f318c's TurnStatus (generated/working-line).
  assert.ok(official('cc1aae219-CeSwM-tp.js').includes('import{t as nS}from"./c734f318c-SHcb2X2p.js"'));
});

test('model: Gg / Bs / Wg over the host reasoning item, uq by the rq kind', () => {
  assert.deepEqual(thinkingBlock(thought, 'x'), { type: 'thinking', thinking: 'x', start_timestamp: '1970-01-01T00:00:01.000Z', stop_timestamp: '1970-01-01T00:00:13.400Z' });
  assert.equal(chatThinkingLabel([thought]), 'Thought for 12s');
  assert.equal(chatThinkingLabel([thought, { startedAtMs: 20_000, completedAtMs: 69_000 }]), 'Thought for 1m 1s');
  assert.equal(chatThinkingLabel([{ startedAtMs: 0, completedAtMs: 120_000 }]), 'Thought for 2m');
  assert.equal(chatThinkingLabel([{ startedAtMs: 0, completedAtMs: 3_900_000 }]), 'Thought for 1h 5m');
  assert.equal(chatThinkingLabel([{ startedAtMs: 0, completedAtMs: 7_200_000 }]), 'Thought for 2h');
  // Without both lifecycle times (streaming, replayed) or under half a second: "Thought process".
  assert.equal(chatThinkingLabel([{ startedAtMs: 1_000 }]), 'Thought process');
  assert.equal(chatThinkingLabel([{ startedAtMs: 1_000, completedAtMs: 1_400 }]), 'Thought process');
  assert.equal(chatThinkingDuration(thought), 'Thought for 12s');
  assert.equal(chatThinkingDuration({}), undefined);
  assert.equal(chatSearchKind(search), 'web');
  assert.equal(chatSearchKind({ type: 'webSearch', action: { type: 'openPage', url: 'https://example.com' } }), 'web_fetch');
  assert.equal(chatSearchKind({ type: 'dynamicToolCall', tool: 'project_knowledge_search' }), 'project_knowledge');
  assert.equal(chatSearchKind({ type: 'mcpToolCall', tool: 'conversation_search' }), 'past_chats');
  assert.equal(chatSearchKind({ type: 'dynamicToolCall', tool: 'bash' }), null);
  assert.equal(chatSearchKind({ type: 'commandExecution' }), null);
  assert.equal(chatSearchLabel(search), 'Searched the web');
  assert.equal(chatSearchLabel([{ type: 'webSearch', action: { type: 'openPage' } }, { type: 'webSearch', action: { type: 'findInPage' } }]), 'Read 2 pages');
  assert.equal(chatSearchLabel({ type: 'dynamicToolCall', tool: 'project_knowledge_search' }), 'Searched project knowledge');
  assert.equal(chatSearchLabel([search, { type: 'webSearch', action: { type: 'openPage' } }]), null);
  assert.equal(chatThinkingRow(thought), true);
  assert.equal(chatThinkingRow(search), true);
  assert.equal(chatThinkingRow({ type: 'agentMessage' }), false);
  // The intl hands the English defaultMessage to t() with its values.
  assert.equal(chatIntl.formatMessage({ defaultMessage: 'Thought for {seconds}s', id: 'Jj0DasG7Mx' }, { seconds: 3 }), 'Thought for 3s');
});

test('model: zh-CN reads the same labels in Chinese', () => {
  i18n.setLocale('zh-CN');
  try {
    // The SSR i18n instance is the one the vite-loaded model uses; the plain-node model shares the dictionary module.
    assert.equal(i18n.t('Thought for {minutes}m {seconds}s', { minutes: 1, seconds: 1 }), '已思考 1 分 1 秒');
    assert.equal(i18n.t('Searched the web'), '已搜索网页');
    assert.equal(i18n.t('Searched project knowledge'), '已搜索项目知识库');
  } finally { i18n.setLocale('en-US'); }
});

test('SSR: a Chat thought is a TurnStatus step labelled by Gg, folded, with the plain thought as its body', () => {
  const html = renderToStaticMarkup(h(thinking.SourceChatThinking, { item: thought }));
  assert.match(html, /^<div class="source-message source-chat-thinking" data-transcript-item-id="r1" data-chat-row="thinking">/);
  assert.match(html, /data-cds="TurnStatus\.Step"|data-cds-row/);
  assert.ok(html.includes('Thought for 12s'), html);
  assert.ok(!html.includes('Thought process'), html);
  // The Step is not controlled: it starts folded (its panel is not rendered open).
  assert.match(html, /aria-expanded="false"/);
  const streaming = renderToStaticMarkup(h(thinking.SourceChatThinking, { item: { ...thought, completedAtMs: undefined }, isStreaming: true }));
  assert.ok(streaming.includes('Thought process'), streaming);
  assert.equal(renderToStaticMarkup(h(thinking.SourceChatThinking, { item: { ...thought, summary: [], content: [] } })), '');
});

test('SSR: a Chat search is a TurnStatus step labelled by uq', () => {
  const html = renderToStaticMarkup(h(thinking.SourceChatThinking, { item: search }));
  assert.match(html, /data-chat-row="search"/);
  assert.ok(html.includes('Searched the web'), html);
  assert.equal(renderToStaticMarkup(h(thinking.SourceChatThinking, { item: { type: 'commandExecution', id: 'c1' } })), '');
});

test('host: source-session draws the Chat rows only under ChatThinkingSurface; Code keeps its rows', () => {
  const chat = renderToStaticMarkup(h(thinking.ChatThinkingSurface.Provider, { value: true }, h(session.SourceMessage, { item: thought, transcriptView: 'thinking' })));
  assert.ok(chat.includes('data-chat-row="thinking"') && chat.includes('Thought for 12s'), chat);
  const code = renderToStaticMarkup(h(session.SourceMessage, { item: thought, transcriptView: 'thinking' }));
  assert.ok(!code.includes('data-chat-row') && !code.includes('Thought for 12s'), code);
  assert.ok(code.includes('source-reasoning'), code);
  const source = local('src/source-session.jsx');
  assert.ok(source.includes('import { SourceChatThinking, chatThinkingRow, useChatThinkingSurface } from "./source-chat-thinking.jsx";'));
  assert.ok(source.includes('if (chatSurface && !inToolGroup && chatThinkingRow(item)) return <SourceChatThinking item={item} isStreaming={isStreaming} />;'));
});

test('host: source-transcript provides ChatThinkingSurface for a Chat conversation only', async () => {
  const transcript = local('src/source-transcript.jsx');
  assert.ok(transcript.includes('import { ChatThinkingSurface } from "./source-chat-thinking.jsx";'));
  assert.ok(transcript.includes('<ChatThinkingSurface.Provider value={messageActions?.surface === "chat"}>'));
  const { SourceTranscript } = await server.ssrLoadModule('/src/source-transcript.jsx');
  const rows = () => h(session.SourceMessage, { item: thought, transcriptView: 'thinking' });
  const chat = renderToStaticMarkup(h(SourceTranscript, { sessionKey: 'chat:1', messageActions: { surface: 'chat', threadId: 'c1' } }, rows()));
  assert.ok(chat.includes('data-chat-row="thinking"') && chat.includes('Thought for 12s'), chat);
  const code = renderToStaticMarkup(h(SourceTranscript, { sessionKey: 'code:1', messageActions: {} }, rows()));
  assert.ok(!code.includes('data-chat-row') && code.includes('source-reasoning'), code);
});
