import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractChatComposer } from '../scripts/extract-chat-composer.mjs';
import { chatComposerMessages, chatPlaceholderRotation } from '../src/generated/chat-composer/messages.mjs';
import { modelSelector, modelSelectorMessages, splitModelName, modelSelectorPopupClass, modelSelectorSubmenuPopupClass } from '../src/generated/chat-composer/model-selector.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

// w13-chatui-composer-shell (research/w13-chatui.md H3 / K4 / K6): the Chat / Cowork card's reply placeholder is shared-8
// XI replyToClaude, its model control is shared-8 $H's `model-selector-dropdown` trigger as c6eb5f8cf dn passes it
// (compact, "!rounded-lg") with NH's label, and the chin no longer carries the Chat / Cowork switch (the app switch does).
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist');
const official = name => fs.readFileSync(path.join(v1, 'assets/v1', name), 'utf8');
const shared8 = official('shared-8-Db1QN4mf.js');
const mini = official('c6eb5f8cf-DfRr7hmI.js');
const enUS = JSON.parse(fs.readFileSync(path.join(v1, 'i18n/en-US.json'), 'utf8'));
const host = fs.readFileSync(path.join(app, 'src/source-chat-composer.jsx'), 'utf8');

let server, C;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-chat-composer.jsx');
});
after(() => server?.close());

const noop = () => {};
const Input = ({ inputRef, ...rest }) => React.createElement('div', rest);
const render = props => renderToStaticMarkup(React.createElement(C.SourceChatComposer, {
  editorNode: React.createElement(Input, { className: 'sc-input', contentEditable: true, placeholder: 'How can I help you today?' }),
  draft: '', scope: 'chat:fixture', mode: 'chat', onMenu: noop, onStop: noop, onFolder: noop,
  disabled: false, busy: false, sending: false, canSend: false, showStop: false,
  model: { model: 'fixture', displayName: 'Fixture' }, permission: 'ask', workdir: '/tmp/fixture', ...props }));
const triggerOf = html => {
  const at = html.indexOf('data-testid="model-selector-dropdown"');
  assert.ok(at >= 0, 'model-selector-dropdown rendered');
  const start = html.lastIndexOf('<div class="overflow-hidden', at);
  const end = html.indexOf('</button></div>', at);
  return { tag: html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at) + 1), whole: html.slice(start, end + 15) };
};
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

test('the generator is current (--check)', async () => {
  const manifest = await extractChatComposer({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  // w13-close-chat-composer: + oD / dD (the placeholder rotation), WH / jH (KH's rows), shared-28 wE / TE / hE.
  assert.deepEqual(Object.keys(manifest.roots).sort(), ['$H', 'KH', 'NH', 'QH', 'XI', 'ZH', 'dn', 'kH', 'lD', 'oD', 'dD', 'WH', 'jH', 'wE', 'TE', 'hE'].sort());
});

test('generated copy and literals are the 3.6556.2 originals, verbatim', () => {
  // Message descriptors: same id and text as the shipped en-US catalog.
  for (const descriptor of [...Object.values(chatComposerMessages), ...Object.values(modelSelectorMessages)])
    assert.equal(enUS[descriptor.id], descriptor.defaultMessage, descriptor.id);
  assert.equal(chatComposerMessages.replyToClaude.defaultMessage, 'Reply to Claude…');
  assert.ok(shared8.includes('replyToClaude:{defaultMessage:"Reply to Claude\\u2026",id:"ZA4ifEIe2U"}'));
  // $H's trigger, raw (unformatted) chunk text.
  assert.match(shared8, /render:\w+\(\w+,\{variant:"ghost","data-testid":"model-selector-dropdown","aria-label":\w+,icon:\w+,iconPosition:"end",className:\w+,disabled:\w+,"aria-busy":\w+,children:\w+\}\)/);
  assert.match(shared8, /\{name:"CaretDown",customSize:12,className:"opacity-75 @max-\[280px\]:!hidden"\}/);
  for (const literal of [modelSelector.trigger.typeClass, modelSelector.trigger.compactClass, modelSelector.trigger.tooltipWrapperClass,
    modelSelector.trigger.emptyClass, modelSelector.loading.className, modelSelector.label.name, modelSelector.label.tail,
    modelSelector.menu.moreModelsTestId, modelSelector.menu.noMatchesClass, modelSelectorPopupClass, modelSelectorSubmenuPopupClass])
    assert.ok(shared8.includes(`"${literal}"`), literal);
  assert.ok(shared8.includes('`inline-flex min-w-0 ${'), 'NH root class template');
  assert.match(shared8, /\?"text-footnote":\w+\?"text-xs":"text-\[14px\] h-\[14px\]"\} leading-none items-baseline`/);
  assert.equal((mini.match(/placement:"compact",compact:!0,[^}]*?triggerClassName:"!rounded-lg"/g) ?? []).length, 2, 'c6eb5f8cf dn passes compact + !rounded-lg twice');
  // kH, sliced verbatim.
  assert.deepEqual(splitModelName('Opus 4.5 (1M)'), { base: 'Opus 4.5', tail: '(1M)' });
  assert.deepEqual(splitModelName('Fixture'), { base: 'Fixture', tail: '' });
});

test('new chat: the chin trailing is $H\'s model-selector-dropdown trigger with NH\'s label', () => {
  const html = render({});
  const { tag, whole } = triggerOf(html);
  assert.ok(whole.startsWith('<div class="overflow-hidden min-w-0 p-2 -m-2"><button'), 'tooltip wrapper div');
  assert.equal(attr(tag, 'data-cds'), 'Button');
  assert.match(tag, /data-cds-ghost=""/);
  assert.equal(attr(tag, 'aria-label'), 'Model: Fixture');
  assert.equal(attr(tag, 'aria-haspopup'), 'menu');
  const cls = attr(tag, 'class');
  assert.ok(cls.includes('max-w-full text-[14px]/[1.4] font-[430] [font-variation-settings:normal] !px-1.5 !h-7 compact:!h-6 !rounded-lg sc-model-trigger'), cls);
  assert.doesNotMatch(cls, /surface-model/, 'no host surface-model styling on the official trigger');
  assert.doesNotMatch(tag, / disabled=""/);
  assert.match(whole, /<div class="inline-flex min-w-0 text-xs leading-none items-baseline"><div class="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap select-none">Fixture<\/div><\/div>/);
  assert.match(whole, /class="opacity-75 @max-\[280px\]:!hidden"/, 'CaretDown icon at the end');
  assert.ok(whole.indexOf('Fixture') < whole.indexOf('opacity-75'), 'iconPosition end');
  // The chin's buttons: the model trigger only; no host "Model" label left. w13-close-chat-surface (E73): the Chat chin's
  // folder picker is gone (shared-8 yP "disabled"; w13-close-chat-surface.test.mjs), Cowork keeps it (below).
  const chin = html.slice(html.indexOf('data-cds="ChatComposerChin"'));
  assert.deepEqual([...chin.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map(m => m[1]), ['Model: Fixture']);
});

test('the label splits the version tail and appends the thinking label with " · "', () => {
  const { whole, tag } = triggerOf(render({ model: { model: 'opus', displayName: 'Opus 4.5 (1M)' }, effort: 'high', effortLabel: 'High' }));
  assert.equal(attr(tag, 'aria-label'), 'Model: Opus 4.5 (1M) High');
  assert.match(whole, /select-none">Opus 4\.5<span class="ms-1 text-muted-as-secondary"> \(1M\) · High<\/span><\/div>/);
  const plain = triggerOf(render({ effort: 'low', effortLabel: 'Low' })).whole;
  assert.match(plain, /select-none">Fixture<span class="ms-1 text-muted-as-secondary"> Low<\/span>/);
});

test('loading and no-model states use $H\'s copy', () => {
  const loading = triggerOf(render({ modelsLoading: true }));
  assert.equal(attr(loading.tag, 'aria-label'), 'Loading models…');
  assert.match(loading.tag, / disabled=""/);
  assert.match(loading.whole, /<span class="flex items-center gap-1\.5 text-muted-as-secondary">.*<span class="truncate">Loading models…<\/span><\/span>/);
  const none = triggerOf(render({ model: null }));
  assert.equal(attr(none.tag, 'aria-label'), 'Default model');
  assert.match(none.whole, /<span class="text-muted-control truncate">Default model<\/span>/);
  assert.match(none.tag, / disabled=""/);
  assert.match(triggerOf(render({ sending: true, canSend: true, draft: 'x' })).tag, / disabled=""/);
});

test('reply placeholder is "Reply to Claude…"; a new chat rotates lD\'s placeholders (dD fade) over the empty editor', () => {
  assert.match(render({ current: true }), /placeholder="Reply to Claude…"/);
  assert.doesNotMatch(render({ current: true }), /placeholder="Reply"/);
  assert.match(render({ mode: 'cowork', current: true }), /placeholder="Reply to Claude…"/);
  // w13-close-chat-composer (composer-shell-02): the editor's own placeholder steps aside for dD's overlay.
  const fresh = render({});
  assert.match(fresh, /contentEditable="true" placeholder=""/);
  assert.match(fresh, /<div data-cds="ChatComposerOverlay"[^>]*><div class="grid grid-cols-\[minmax\(0,1fr\)\] absolute inset-0 pointer-events-none overflow-hidden text-\[length:max\(var\(--cds-font-size-text-entry-floor,0px\),1em\)\]"><span class="col-start-1 row-start-1 block text-muted">How can I help you today\?<\/span><\/div><\/div>/);
  // A draft, a preview or the caller's own placeholder leave the editor's placeholder alone.
  assert.doesNotMatch(render({ draft: 'x' }), /col-start-1 row-start-1 block text-muted/);
  const custom = render({ editorNode: React.createElement(Input, { className: 'sc-input', contentEditable: true, placeholder: 'Other' }) });
  assert.match(custom, /placeholder="Other"/);
  assert.doesNotMatch(custom, /col-start-1 row-start-1 block text-muted/);
});

test('dD: lD\'s placeholders and oD\'s fade interval are the 3.6556.2 originals; the rotation stops after one lap', () => {
  const shared9 = official('shared-9-CM21XrJw.js');
  assert.ok(shared9.includes('oD={fade:5e3,typewriter:3500}') || /\w+=\{fade:5e3,typewriter:3500\}/.test(shared9));
  assert.equal(chatPlaceholderRotation.intervalMs, 5000);
  for (const literal of [chatPlaceholderRotation.grid, chatPlaceholderRotation.overlay, chatPlaceholderRotation.fontSize, chatPlaceholderRotation.itemClass,
    chatPlaceholderRotation.fadeOutClass, chatPlaceholderRotation.fadeInClass])
    assert.ok(shared9.includes(`"${literal}"`), literal);
  assert.match(shared9, /\w+=\w+===0&&\w+!==null/, 'T: back at the first after a lap');
  assert.match(shared9, /if\(\w+\.length<=1\|\|\w+\)return;let \w+=setInterval\(/, 'the interval stops at T');
  assert.equal(enUS['uSmGqlwE3c'], 'Type / for skills');
  assert.match(host, /if \(placeholders\.length <= 1 \|\| done\) return undefined;/);
  assert.match(host, /const done = current === 0 && previous !== null;/);
});

test('incognito (shared-9 wD `Ae = A ? "incognito" : void 0`) picks vm\'s incognito variant', () => {
  const shared9 = official('shared-9-CM21XrJw.js');
  assert.match(shared9, /\w+=\w+\?"incognito":void 0/);
  const plain = render({}), dark = render({ incognito: true });
  assert.notEqual(plain, dark, 'the variant changes the card classes');
  assert.match(host, /variant=\{incognito \? 'incognito' : 'default'\}/);
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.ok(main.includes('incognito={incognitoDraft || (mode === "chat" && isIncognitoSession(current, sessionMetadata))}'));
});

test('composer-shell-03: aria-busy while a busy card holds the trigger; the wt name list is [name, thinking] locally', () => {
  assert.match(triggerOf(render({ sending: true, busy: true, canSend: true, draft: 'x' })).tag, / aria-busy="true"/);
  assert.doesNotMatch(triggerOf(render({ busy: true })).tag, / aria-busy="/, 'an enabled trigger is not busy');
  assert.doesNotMatch(host, /onMode/, 'the unused onMode parameter is gone');
  assert.doesNotMatch(host, /onMenu\('effort'/, 'the host Effort row left the folder menu (the model menu has wE)');
});

test('the chin has no Chat / Cowork switch; the reply chin keeps Add + the model trigger', () => {
  assert.doesNotMatch(host, /onMode\?\.\('chat'\)|onMode\?\.\('cowork'\)/);
  assert.doesNotMatch(host, /aria-label=\{t\('Model'\)\}/);
  assert.doesNotMatch(host, /t\('Reply'\)/);
  assert.doesNotMatch(host, /generated\/view-tabs\/index\.js/, 'E41: the card is in the composer graph');
  const chin = render({ current: true }).slice(render({ current: true }).indexOf('data-cds="ChatComposerChin"'));
  // w13-chatui-composer-tools: the Add control is shared-8 kF (w13-chat-composer-tools.test.mjs).
  assert.deepEqual([...chin.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map(m => m[1]), ['Add files, connectors, and more', 'Model: Fixture']);
  const cowork = render({ mode: 'cowork' });
  const coworkChin = cowork.slice(cowork.indexOf('data-cds="ChatComposerChin"'));
  assert.deepEqual([...coworkChin.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map(m => m[1]), ['Project or folder', 'Model: Fixture', 'Permission mode']);
});

test('zh-CN carries the new copy', () => {
  for (const text of ['Reply to Claude…', 'Select model', 'Loading models…', 'Default model', 'Model: {name}', 'More models', 'Search models', 'No matches', 'How can I help you today?',
    'Type / for skills', '{legacyModel} is no longer available. New replies will use {defaultModel}.', 'Effort', 'Default',
    'Higher effort means more thorough responses, but takes longer and uses your limits faster.'])
    assert.ok(typeof zh[text] === 'string' && zh[text].length > 0, text);
});
