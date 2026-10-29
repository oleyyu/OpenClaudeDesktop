import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// w10-curchat-composer (CC-01, research/w10-curchat.md §0.1 / §3): the Chat / Cowork card is the 3.6556.2 CDS
// ChatComposer — shared-5-Bg6ZMqvt vm with its parts Sm (`Header: Mp, Attachments: rs, Actions: hp, PrimaryAction: sf,
// Chin: Ap, Overlay: jp, Tray: Pp`) and shared-26-CGuBxVt9 io / lo / Qa — from the code-composer slice the Code card
// already renders, no longer the 2.31226.0 current-chat shared-5 Rf / Wd / ef / tf / yd / ai / Br copy.
const app = path.resolve(import.meta.dirname, '..');
const repo = path.resolve(app, '..');
const officialShared5 = fs.readFileSync(path.join(repo,
  'reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/shared-5-Bg6ZMqvt.js'), 'utf8');
const generatedShell = fs.readFileSync(path.join(app, 'src/generated/code-composer/chat-composer-shell.mjs'), 'utf8');
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
  draft: '', scope: 'chat:fixture', mode: 'chat', onMode: noop, onMenu: noop, onStop: noop, onFolder: noop,
  disabled: false, busy: false, sending: false, canSend: false, showStop: false,
  model: { model: 'fixture', displayName: 'Fixture' }, permission: 'ask', workdir: '/tmp/fixture', ...props }));
const classOf = (html, marker) => {
  const at = html.indexOf(marker);
  assert.ok(at >= 0, `${marker} rendered`);
  const tag = html.slice(html.lastIndexOf('<', at), html.indexOf('>', at));
  return tag.match(/class="([^"]*)"/)?.[1] ?? '';
};

// Class runs the 3.6556.2 parts write (hp leading / trailing columns, Ap's chin, vm's attachments clip). Each must be in
// the official chunk and in the generated slice, so the SSR match below proves the DOM comes from the 3.6556.2 shell.
const officialRuns = [
  'absolute bottom-0 start-0 flex shrink-0 items-center gap-xs pe-1.5 compact:pe-1.5 comfortable:pe-2',
  'absolute bottom-0 end-0 flex max-w-[calc(100%_-_var(--cmp-lead-w))] shrink-0 items-center justify-end gap-xs ps-1.5 compact:ps-1.5 comfortable:ps-2',
  'relative z-0 overflow-clip px-2 -mx-2 pt-2 -mt-2',
  'ms-auto flex min-w-0 items-center gap-1 ps-2',
];

test('the host card imports the 3.6556.2 code-composer shell, not current-chat or the host Attachments stand-in', () => {
  assert.doesNotMatch(host, /generated\/current-chat\//);
  assert.match(host, /from '\.\/generated\/code-composer\/chat-composer-shell\.mjs'/);
  assert.match(host, /from '\.\/generated\/code-composer\/chat-composer-layout\.mjs'/);
  assert.match(host, /const \{ Actions, Attachments, Chin, Overlay \} = ChatComposerParts;/);
  assert.doesNotMatch(host, /from '\.\/source-chat-adapters\.jsx'/);
  // E41: the card is in the composer graph; it must not reach the view-tabs facade.
  assert.doesNotMatch(host, /generated\/view-tabs\/index\.js/);
  // The ideaPreviewClass line belongs to the chat area (cross-lane, left as is).
  assert.match(host, /import \{ ideaPreviewClass \} from '\.\/generated\/chat\//);
});

test('the code-composer slice is 3.6556.2 shared-5 vm / Sm and shared-26 io / lo / Qa', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/code-composer/manifest.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  const sources = Object.fromEntries(manifest.modules.map(module => [module.target, module.source]));
  assert.equal(sources['chat-composer-shell.mjs'], 'shared-5-Bg6ZMqvt.js');
  assert.equal(sources['chat-composer-layout.mjs'], 'shared-26-CGuBxVt9.js');
  assert.match(generatedShell, /vm as ChatComposerShell,\s*Sm as ChatComposerParts,/);
  assert.match(officialShared5, /Header:\w+,Attachments:\w+,Actions:\w+,PrimaryAction:\w+,Chin:\w+,Overlay:\w+,Tray:\w+/);
  for (const run of officialRuns) {
    assert.ok(officialShared5.includes(run), `official shared-5 has ${run}`);
    assert.ok(generatedShell.includes(run), `generated shell has ${run}`);
  }
  // jp (Overlay) pads with the logical pe-, the 2.31226.0 tf's pr- is gone from the official chunk.
  assert.ok(!officialShared5.includes('pr-[var(--cmp-trail-w,0px)]'));
});

for (const [name, props, form] of [['new chat', {}, 'new'], ['new cowork', { mode: 'cowork' }, 'new'],
  ['reply', { current: true }, 'reply']]) {
  test(`${name}: the ChatComposer root and parts are the 3.6556.2 shell's`, () => {
    const html = render(props);
    assert.ok(html.startsWith('<div data-cds="ChatComposer"'), 'vm root first');
    assert.match(html, /^<div data-cds="ChatComposer" data-cds-dock-group=""/, 'vm root carries the dock group attribute');
    if (form === 'reply') assert.match(html, /^<div[^>]*data-form="reply"/);
    else assert.doesNotMatch(html.slice(0, html.indexOf('>')), /data-form=/, 'form "new" writes no data-form');
    assert.match(classOf(html, 'data-cds="ChatComposer"'), /source-chat-composer cds-root/);
    for (const part of ['ChatComposerEditor', 'ChatComposerActions', 'ChatComposerChin'])
      assert.equal(html.split(`data-cds="${part}"`).length - 1, 1, `one ${part}`);
    assert.ok(html.includes(officialRuns[1]), 'hp trailing column (send) is the 3.6556.2 logical-inset run');
    assert.ok(html.includes(officialRuns[2]), 'Ap chin root');
    assert.ok(html.includes(officialRuns[3]), 'Ap chin trailing slot (model / permission)');
    if (form === 'new') assert.ok(html.includes(officialRuns[0]), 'hp leading column (Add) on the new card');
    assert.doesNotMatch(html, /pr-\[var\(--cmp-trail-w,0px\)\]/);
    assert.doesNotMatch(html, /absolute bottom-0 (?:left|right)-0 /, 'no 2.31226.0 physical-inset action columns');
    assert.doesNotMatch(html, /data-cds="ChatComposerAttachments"/);
    // lo / Qa: the editor box keeps the local editor inside and the minLines floor.
    const editor = classOf(html, 'data-cds="ChatComposerEditor"');
    assert.match(editor, /^w-full max-h-96 min-h-\[var\(--cmp-row-h\)\] overflow-y-auto break-words /);
    assert.match(editor, /source-chat-editor/);
    if (form === 'new') assert.match(html, /data-cds="ChatComposerEditor"[^>]*style="min-height:calc\(2lh \+ 2 \* var\(--cmp-row-py\)\)"/);
  });
}

test('the preview overlay is jp and attachments go through Sm.Attachments (MessageAttachments)', () => {
  const html = render({ current: true, previewPrompt: 'Preview prompt',
    attachments: React.createElement('span', { className: 'fixture-attachment' }, 'file.txt') });
  const overlay = classOf(html, 'data-cds="ChatComposerOverlay"');
  assert.match(overlay, /^absolute inset-0 overflow-hidden /);
  assert.match(overlay, /pointer-events-none$/);
  assert.doesNotMatch(overlay, /pr-\[var\(--cmp-trail-w/);
  assert.match(html, /data-cds="ChatComposerOverlay"[^>]*><p class="[^"]*">Preview prompt<\/p>/);
  assert.match(html, /<div data-cds-composer-attachments-clip=""[^>]*><div data-cds-composer-attachments=""[^>]*><div data-cds="MessageAttachments" class="flex w-full flex-wrap gap-xs justify-start"><span class="fixture-attachment">file\.txt<\/span><\/div>/);
  assert.ok(html.indexOf('data-cds-composer-attachments-clip') < html.indexOf('data-cds="ChatComposerEditor"'), 'attachments above the editor row');
});

// w13-chatui-composer-shell: the model control is now shared-8 $H's trigger, aria-label 'Model: {name}' (w13-chat-composer.test.mjs).
test('the chin keeps the host controls: Cowork folder or Add leading, model (+ Cowork permission) trailing', () => {
  const labels = html => {
    const chin = html.slice(html.indexOf('data-cds="ChatComposerChin"'));
    return [...chin.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map(match => match[1]);
  };
  // w13-close-chat-surface (E73): a Chat chin has no folder picker (shared-8 yP "disabled"); Cowork keeps it.
  assert.deepEqual(labels(render({})), ['Model: Fixture']);
  assert.deepEqual(labels(render({ mode: 'cowork' })), ['Project or folder', 'Model: Fixture', 'Permission mode']);
  // w13-chatui-composer-tools: the Add control is shared-8 kF (w13-chat-composer-tools.test.mjs).
  assert.deepEqual(labels(render({ current: true })), ['Add files, connectors, and more', 'Model: Fixture']);
});
