import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// 0.2.113: SSR of the full SourceComposer chin follows the source no-dictation branch. c360a9e1c-GPs-MV9u.js
// :4892-4907 bH{…empty:hidden gap-xs} holds only nf, which returns null for hideDictation (:5067-5095); Code
// passes hideDictation:!dictationEnabled (cc43287c9-BMbiZYzF.js:36836). This Codex client has no dictation,
// so the chin renders no SplitDropdownButton and no Dictate control. R3 composer-row-chin: an open session's presets chin
// is bQ's row layout (c227f4d5e `Le = Ne === "row"`), whose leading slot holds the mode picker alone (no folder chip).
let server, C;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-composer.jsx');
});
after(() => server?.close());
const noop = () => {};
const render = props => renderToStaticMarkup(React.createElement(C.SourceComposer, {
  draft: '', setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false,
  permission: 'ask', model: { model: 'fixture', displayName: 'Fixture' }, workdir: '/tmp/fixture', ...props }));
// R3-composer step 3: the chin is the shell's Chin part (shared-5 Kd), whose leading slot is 'flex items-center
// self-start' and trailing slot 'ms-auto flex min-w-0 items-center gap-1 ps-2'.
const leading = html => {
  const chin = html.indexOf('data-cds="ChatComposerChin"');
  const start = html.indexOf('<div class="flex items-center self-start">', chin);
  assert.ok(chin >= 0 && start >= 0, 'chin leading slot rendered');
  const end = html.indexOf('<div class="ms-auto flex min-w-0 items-center gap-1 ps-2">', start);
  assert.ok(end > start, 'chin trailing slot rendered');
  return html.slice(start, end);
};

for (const [name, props] of [['idle', {}], ['running', { running: true }], ['sending', { sending: true }], ['disconnected', { canSubmit: false }]])
  test(`${name} composer renders no dictation control`, () => {
    const html = render(props);
    assert.match(html, /data-cds="ChatComposerChin"/);
    assert.doesNotMatch(html, /SplitDropdownButton/);
    assert.doesNotMatch(html, /Dictat/, "no 'Dictate', 'Dictation settings' or 'Dictation unavailable' text or label");
    assert.doesNotMatch(html, /sc-dictation|Microphone/);
    const labels = [...leading(html).matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map(match => match[1]);
    assert.deepEqual(labels, ['Permission mode'], 'the row chin leading is the mode picker alone');
    assert.doesNotMatch(html, /sc-folder-chip/, 'no folder chip in a session chin (the titlebar folder chip has its menu)');
  });

// 0.2.120 chin tooltips + fast live region (c360a9e1c-GPs-MV9u.js Ud :4544-4575 / :4924-4945, ze :4840-4848 +
// :4972-4980; c8e04f916 effort f{content: effortLabel}; shared-14 :7160-7226 Model pill without tooltip).
const trigger = (html, className) => {
  const match = new RegExp(`<button[^>]*class="[^"]*${className}[^"]*"[^>]*>`).exec(html);
  assert.ok(match, `${className} rendered`);
  return match[0];
};
// 0.2.120 review: Mu → Qa text → po sorts modifiers by io (shared-frame-C_2npUJq.js:2136, :2206-2219), shift
// before cmd, so the source tooltip reads ⇧⌘M (an earlier revision pinned the unsorted ⌘⇧M). Fidelity F02: the
// tooltip takes the raw key spec (Ud triggerKey) and SourceTooltip draws the text variant; MODE_MENU_SHORTCUT is its caps.
test('Mode tooltip carries the cmd+shift+m spec (caps ⇧⌘M, io modifier order); the Bypass copy differs from Mode; closed while a chin menu is open', () => {
  // B30 (ca80fca8d Kt/N$): Manual with Auto on offer reads the warning tooltip instead of the header.
  assert.deepEqual(C.modeTooltip({ permission: 'ask' }), { content: 'DeepSeek asks before making changes. Auto is recommended.', shortcut: 'cmd+shift+m', open: undefined });
  assert.deepEqual(C.modeTooltip({ permission: 'plan' }), { content: 'Mode', shortcut: 'cmd+shift+m', open: undefined });
  const bypass = C.modeTooltip({ permission: 'bypass' });
  assert.equal(bypass.content, 'DeepSeek can modify or delete files without asking');
  assert.notEqual(bypass.content, 'Mode'); assert.equal(bypass.shortcut, 'cmd+shift+m'); assert.equal(C.MODE_MENU_SHORTCUT, '⇧⌘M');
  assert.equal(C.modeTooltip({ permission: 'ask', menuKind: 'permission' }).open, false);
  assert.doesNotMatch(trigger(render({ permission: 'bypass' }), 'sc-permission'), /title=/, 'CDS tooltip, no native title');
});
// A Code composer folds the effort into the model pill (c9543da06 G, shared-7 pill tail): no separate Effort trigger.
const tail = (html) => /<span class="[^"]*sc-effort-tail[^"]*"[^>]*>[^<]*<\/span>/.exec(html)?.[0] ?? null;
test('the Model trigger carries no native title and the effort as its tail; no separate Effort trigger', () => {
  const html = render({ effort: 'low', model: { model: 'fixture', displayName: 'Fixture', supportedReasoningEfforts: [{ reasoningEffort: 'low' }, { reasoningEffort: 'high' }] } });
  const model = trigger(html, 'sc-model-trigger');
  assert.doesNotMatch(model, /title=/); assert.match(model, /aria-label="Model"/);
  assert.match(tail(html), /> Low<\/span>$/);
  assert.doesNotMatch(html, /sc-effort-trigger/);
});
// Purple top tier (user decision 2026-10-18): the model's highest level, whatever its id; never a lower one.
test('the effort tail is marked data-top-tier for the model\'s highest level only', () => {
  const astra = { model: 'gpt-6-astra', displayName: 'GPT-6 Astra', supportedReasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'].map(reasoningEffort => ({ reasoningEffort })) };
  const deepseek = { model: 'deepseek-flash', displayName: 'DeepSeek', supportedReasoningEfforts: ['off', 'low', 'high', 'max'].map(reasoningEffort => ({ reasoningEffort })) };
  assert.match(tail(render({ effort: 'ultra', model: astra })), /data-top-tier=""/);
  assert.doesNotMatch(tail(render({ effort: 'max', model: astra })), /data-top-tier/);
  assert.match(tail(render({ effort: 'max', model: deepseek })), /data-top-tier=""/, "DeepSeek's max is its highest level");
  assert.doesNotMatch(tail(render({ effort: 'high', model: deepseek })), /data-top-tier/);
});
test('fast live region: role=status polite sr-only text follows fastMode, only with a Fast tier', () => {
  const region = html => [...html.matchAll(/<span role="status" aria-live="polite" class="sr-only">([^<]*)<\/span>/g)].map(match => match[1]);
  assert.deepEqual(region(render({ fastAvailable: true, fastMode: false })), ['Fast mode off']);
  assert.deepEqual(region(render({ fastAvailable: true, fastMode: true })), ['Fast mode on']);
  assert.deepEqual(region(render({ fastAvailable: false })), []);
  const html = render({ fastAvailable: true });
  assert.ok(html.indexOf('Fast mode off') > html.indexOf('sc-usage-trigger'), 'ze sits last in the trailing slot');
});

// Fidelity F05: c360a9e1c-GPs-MV9u.js:4544-4575 Ud / :4942 / :4961 / :2829 — Mode, Model and Effort are not busy-gated.
const efforts = { model: 'fixture', displayName: 'Fixture', supportedReasoningEfforts: [{ reasoningEffort: 'low' }, { reasoningEffort: 'high' }] };
test('a running turn leaves Mode and Model (with its effort) enabled; modelsLoading, no model and a pending send still disable them', () => {
  const running = render({ running: true, effort: 'low', model: efforts });
  for (const name of ['sc-permission', 'sc-model-trigger']) assert.doesNotMatch(trigger(running, name), / disabled=""/, `${name} usable while running`);
  assert.match(trigger(render({ running: true, modelsLoading: true, effort: 'low', model: efforts }), 'sc-model-trigger'), / disabled=""/);
  assert.match(trigger(render({ running: true, model: null }), 'sc-model-trigger'), / disabled=""/);
  const sending = render({ sending: true, effort: 'low', model: efforts });
  for (const name of ['sc-permission', 'sc-model-trigger']) assert.match(trigger(sending, name), / disabled=""/, `${name} waits for the pending send`);
});
