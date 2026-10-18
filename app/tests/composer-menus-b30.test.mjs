import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// B30: composer menus and chin polish (ca80fca8d uz/dz/fz, O$/A$/W$, N$; c8e04f916 C; c2d9b9a76 mark row).
let server, C, P;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-composer.jsx');
  P = await server.ssrLoadModule('/src/source-permission-menu.jsx');
});
after(() => server?.close());
const noop = () => {};
const render = props => renderToStaticMarkup(React.createElement(C.SourceComposer, {
  draft: '', setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false,
  permission: 'auto', model: { model: 'fixture', displayName: 'Fixture' }, workdir: '/tmp/fixture', ...props }));
const modeTrigger = html => {
  const match = /<button[^>]*class="[^"]*sc-permission[^"]*"[^>]*>[\s\S]*?<\/button>/.exec(html);
  assert.ok(match, 'Mode trigger rendered');
  return match[0];
};

// Mn :20490-20497 dz(uz(t, n === r ? -1 : n, …, "inline"), r, …), An = Ie && St !== "auto".
test('permission badges: Default on the saved mode, Recommended on Auto while another mode is current', () => {
  assert.deepEqual(P.permissionBadges({ value: 'auto', defaultValue: 'auto' }), { auto: 'default' });
  assert.deepEqual(P.permissionBadges({ value: 'ask', defaultValue: 'acceptEdits' }), { acceptEdits: 'default', auto: 'recommended' });
  assert.deepEqual(P.permissionBadges({ value: 'plan', defaultValue: 'auto' }), { auto: 'recommended' }, 'Recommended replaces Default on the same row');
  assert.deepEqual(P.permissionBadges({ value: 'ask', defaultValue: 'bypass', values: ['auto', 'ask'] }), { auto: 'recommended' }, 'a default the menu does not list gets nothing');
  assert.deepEqual(P.permissionBadges({ value: 'ask', defaultValue: 'ask', values: ['ask', 'plan'] }), { ask: 'default' }, 'no Recommended without Auto');
});

// 2.42304.0 (R3 composer-row-chin): tQ's ghost CdsButton holds the generated rQ — the truncating label (text-warning for
// Manual) and the hidden description the button is aria-described by (bQ `labelTone/description: xt ? …`; tQ drops both
// while disabled); _Q while the mode loads: the invisible label under an absolute skeleton box, the sr-only name.
test('chin Mode label: rQ truncating span, Manual warning tone and hidden description, the _Q skeleton while the mode loads', () => {
  const auto = modeTrigger(render({ permission: 'auto' }));
  assert.match(auto, /<span class="grid grid-cols-\[minmax\(0,1fr\)\]"><span class="overflow-x-clip text-ellipsis whitespace-nowrap">Auto<\/span><\/span>/);
  assert.doesNotMatch(auto, /aria-describedby|aria-description| hidden=""/);
  assert.match(auto, /data-cds="Button" data-cds-ghost=""/, 'the view-tabs CdsButton, ghost');
  assert.match(auto, /class="[^"]* min-w-0 shrink sc-permission"/, 'tQ "min-w-0 shrink"');
  const manual = modeTrigger(render({ permission: 'ask' }));
  const id = /aria-describedby="([^"]+)"/.exec(manual)?.[1];
  assert.ok(id, 'Manual is described by its warning');
  assert.ok(manual.includes(`<span id="${id}" hidden="">DeepSeek asks before making changes. Auto is recommended.</span>`), manual);
  assert.match(manual, /<span class="overflow-x-clip text-ellipsis whitespace-nowrap text-warning">Manual<\/span>/);
  assert.doesNotMatch(modeTrigger(render({ permission: 'ask', sending: true })), /text-warning|aria-describedby| hidden=""/, 'a disabled trigger drops the warning');
  const loading = modeTrigger(render({ permission: null }));
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, / disabled=""/);
  assert.ok(loading.includes('<span class="relative block"><span class="sr-only">Permission mode</span><span aria-hidden="true" class="invisible">Mode</span><span aria-hidden="true" class="absolute inset-0 flex items-center"><span data-cds="Skeleton" class="smenu-skeleton sc-permission-skeleton w-full"></span></span></span>'), loading);
});

// c8e04f916 C: the marked stop, the label row under the track and '{name} ({badge})' value text.
test('effort slider: the badged level marks its stop and names the value text; a warning badge adds the note', () => {
  const levels = [{ reasoningEffort: 'low' }, { reasoningEffort: 'medium', badge: { message: 'Default', variant: 'neutral' } }, { reasoningEffort: 'high' }];
  const html = renderToStaticMarkup(React.createElement(C.EffortControl, { levels, value: 'medium', onChange: noop }));
  assert.match(html, /data-slider-stop="1" data-marked="" title="Medium \(Default\)"/);
  assert.match(html, /aria-valuetext="Medium \(Default\)"/);
  assert.match(html, /<span class="sc-slider-mark-row" aria-hidden="true" data-current=""><span class="sc-slider-mark-span" style="width:100%"><span class="sc-slider-mark-label">Default<\/span>/);
  const low = renderToStaticMarkup(React.createElement(C.EffortControl, { levels, value: 'low', onChange: noop }));
  assert.match(low, /aria-valuetext="Low"/);
  assert.doesNotMatch(low, /sc-slider-mark-row[^>]*data-current/);
  assert.doesNotMatch(html, /sc-effort-warning/);
  const warned = renderToStaticMarkup(React.createElement(C.EffortControl, { levels: [{ reasoningEffort: 'high' }, { reasoningEffort: 'max', badge: { message: 'High usage', variant: 'warning' } }], value: 'max', onChange: noop }));
  assert.match(warned, /data-effort-warning=""[^>]*>[\s\S]*DeepSeek thinks longer with Max effort/);
  assert.doesNotMatch(warned, /sc-slider-mark-row/, 'a warning badge is not a mark');
});
