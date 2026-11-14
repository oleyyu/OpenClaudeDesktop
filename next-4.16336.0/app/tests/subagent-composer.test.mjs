import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

// The tasks pane's sub-agent view (the host follow-up box was removed in W14-code r5pa-07, E95). Server-rendered;
// effects do not run.
const app = path.resolve(import.meta.dirname, '..');
let server, React, render, pane, agentModel;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  pane = await server.ssrLoadModule('/src/source-agent.jsx');
  agentModel = await server.ssrLoadModule('/src/agent-model.mjs');
});
after(() => server?.close());

const spawn = { id: 'spawn-1', type: 'collabAgentToolCall', tool: 'spawnAgent', receiverThreadIds: ['child-1'], agentsStates: { 'child-1': { status: 'completed' } }, description: 'probe child' };
const state = { items: { parent: [spawn], 'child-1': [] }, threads: { 'child-1': { id: 'child-1', parentThreadId: 'parent', canAcceptDirectInput: true } }, active: {}, usage: {}, approvalConnectionEpoch: 1 };
const html = (props) => render(React.createElement(pane.SourceTasksPane, { state, sessionId: 'parent', views: [{ threadId: 'child-1', toolId: 'spawn-1', ownerId: 'parent', description: 'probe child' }],
  onLoad: async () => {}, onBack() {}, onClose() {}, onOpen() {}, renderItem: () => null, ...props }));

// W14-code r5pa-07 (E95): 3.6556.2 cccc2cf0a's sub-agent view has no composer and en-US has no "Message {name}…", so the
// host's follow-up box is gone even for a continuable sub-agent (canAcceptDirectInput); the pane takes no onMessage.
test('the sub-agent view has no host follow-up box (E95: official has none)', () => {
  const out = html({ onMessage: async () => {}, canMessage: () => true });
  assert.doesNotMatch(out, /sag-composer|Message probe child…|<textarea/);
  assert.doesNotMatch(html({}), /sag-composer/);
});

// W14-code r5 cleanup: the follow-up box's error wording (agent-model subAgentMessageError) left with the box.
test('the follow-up error helper is gone with the host follow-up box', () => {
  assert.equal('subAgentMessageError' in agentModel, false);
});

// W14-code pa2-08: 3.6556.2 cccc2cf0a bP / FP — the model line is the single ICU "Model <v>{model}</v>" in
// p.text-footnote.text-muted-as-secondary (v: span.text-secondary), the stats footnote one ICU message (dAbHM3tAVv)
// with tabular-nums; no host .sag-model-note / .sag-stats.
test('subagent panel: bP model line and FP stats footnote are the official ICU sentences', () => {
  const withModel = { ...state, threads: { 'child-1': { ...state.threads['child-1'], model: 'probe-model' } },
    items: { ...state.items, 'child-1': [] }, usage: { 'child-1': { total: { totalTokens: 1 } } }, taskTurnFacts: { 'child-1': { durationMs: 2000 } } };
  const out = render(React.createElement(pane.SourceTasksPane, { state: withModel, sessionId: 'parent', views: [{ threadId: 'child-1', toolId: 'spawn-1', ownerId: 'parent', description: 'probe child' }],
    onLoad: async () => {}, onBack() {}, onClose() {}, onOpen() {}, renderItem: () => null }));
  assert.match(out, /<p class="text-footnote text-muted-as-secondary">Model <span class="text-secondary">probe-model<\/span><\/p>/);
  assert.match(out, /<p class="text-footnote text-muted-as-secondary tabular-nums" data-subagent-stats="">0 tool calls · 1 token · 2s<\/p>/);
  assert.doesNotMatch(out, /sag-model-note|sag-stats/);
});
