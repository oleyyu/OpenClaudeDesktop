// chat-cowork-1to1 r3, chat-home fix lane (analysis/chat-cowork-1to1-20261117/r3/chat-home/fix/notes.md), by source / SSR:
//   r3-02  the new-page column is 4.16336.0 shared-23 TT's: shared-18 uO from its one owner (cowork-scheduled-v4) with Se's
//          classes (generated/home-chat-cowork/new-page-column.mjs), not the 3.6556.2 cowork-home HomeColumn / Rx / HS.
//   r3-05  the Chat / Cowork editor carries shared-9 BD's classic attributes and aria-label (generated/chat-composer/card.mjs).
//   r3-06  SourceNewPageCardSlot writes shared-33 Sk on the band slot below 40rem, as TT's resize effect does.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(app, file), 'utf8');
const h = React.createElement;
const noop = () => {};
let server, surfaces, column, owner, composer, card, slot, home, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  surfaces = await server.ssrLoadModule('/src/source-surfaces.jsx');
  column = await server.ssrLoadModule('/src/generated/home-chat-cowork/new-page-column.mjs');
  owner = await server.ssrLoadModule('/src/generated/cowork-scheduled-v4/shared-18-Cfqwgjc5.mjs');
  composer = await server.ssrLoadModule('/src/source-composer.jsx');
  card = await server.ssrLoadModule('/src/generated/chat-composer/card.mjs');
  slot = await server.ssrLoadModule('/src/generated/home-chat-cowork/new-page-card-slot.mjs');
  home = await server.ssrLoadModule('/src/source-chat-home.jsx');
});
after(async () => { i18n?.setLocale('en-US'); i18n?.setAssistantName('DeepSeek'); await server?.close(); });

test('r3-02: the new-page column is TT\'s uO (one owner) with Se\'s 4.16336.0 classes', () => {
  assert.equal(column.NewPageColumn, owner.uO, 'shared-18 uO re-exported from cowork-scheduled-v4, not sliced again');
  assert.deepEqual({ ...column.newPageColumn }, {
    scrollClass: 'min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable_both-edges]',
    columnClass: 'relative flex flex-col items-center gap-6 max-sm:!px-1 md:px-14',
    bannerOffsetClass: '!mt-[calc(-1*min(var(--organization-banner-column-height,0px),var(--prerender-activation-viewport-height,100vh)*0.25))] h-[calc(100%+min(var(--organization-banner-column-height,0px),var(--prerender-activation-viewport-height,100vh)*0.25))]',
    dockHeightClass: 'dock:h-auto dock:min-h-[calc(100%+min(var(--organization-banner-column-height,0px),var(--prerender-activation-viewport-height,100vh)*0.25))]' });
  const source = read('src/source-surfaces.jsx');
  assert.doesNotMatch(source, /generated\/cowork-home\//);
  assert.match(source, /import \{ NewPageColumn, newPageColumn \} from '\.\/generated\/home-chat-cowork\/new-page-column\.mjs';/);
  assert.equal(surfaces.homeScrollClass, column.newPageColumn.scrollClass);
  const html = renderToStaticMarkup(h(surfaces.SourceSurfaceHome, { active: true }, h('i')));
  const { columnClass, bannerOffsetClass, dockHeightClass } = column.newPageColumn;
  // uO: p("mx-auto mt-4 w-full flex-1 px-md md:px-8 lg:mt-6", "max-w-7xl", className); the host hook leads the className.
  assert.ok(html.startsWith(`<main class="mx-auto mt-4 w-full flex-1 px-md md:px-8 lg:mt-6 max-w-7xl surface-home-column ${columnClass} `), html.slice(0, 200));
  assert.ok(html.includes(` ${bannerOffsetClass} ${dockHeightClass}"><i></i></main>`));
});

test('r3-05: the Chat editor carries BD\'s classic attributes and "Write your prompt to Claude" (persona)', () => {
  assert.deepEqual({ ...card.chatComposerEditor, ariaLabel: { ...card.chatComposerEditor.ariaLabel } }, { role: 'textbox', testId: 'chat-input',
    kindAttribute: 'data-composer-editor', kind: 'classic', ariaLabel: { defaultMessage: 'Write your prompt to Claude', id: 'uxkiTeN6WU' },
    ariaMultiline: 'true', ariaRequired: 'false', ariaInvalid: 'false', ariaDescribedby: 'claude-code-nudge-body' });
  const en = JSON.parse(fs.readFileSync(path.join(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/i18n/en-US.json'), 'utf8'));
  assert.equal(en.uxkiTeN6WU, 'Write your prompt to Claude');
  const base = { draft: '', setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false, permission: 'auto', model: { model: 'fixture' }, workdir: '/tmp/fixture' };
  const editorTag = props => { const html = renderToStaticMarkup(h(composer.SourceComposer, { ...base, ...props })); const at = html.indexOf('role="textbox"'); return html.slice(html.lastIndexOf('<div', at), html.indexOf('>', at) + 1); };
  for (const mode of ['chat', 'cowork']) {
    const tag = editorTag({ mode });
    for (const piece of ['data-testid="chat-input"', 'data-composer-editor="classic"', 'aria-required="false"', 'aria-invalid="false"', 'aria-label="Write your prompt to DeepSeek"', 'aria-multiline="true"'])
      assert.ok(tag.includes(piece), `${mode}: ${piece} in ${tag}`);
  }
  const code = editorTag({ mode: 'code' });
  assert.ok(code.includes('aria-label="Prompt"') && !code.includes('data-composer-editor') && !code.includes('chat-input'), 'Code keeps wF\'s editor');
  i18n.setAssistantName('Codex'); i18n.setLocale('zh-CN');
  try { assert.ok(editorTag({ mode: 'chat' }).includes('aria-label="给 Codex 写下你的提示"')); } finally { i18n.setLocale('en-US'); i18n.setAssistantName('DeepSeek'); }
  assert.doesNotMatch(read('src/source-composer.jsx'), /t\("Message DeepSeek"\)/);
});

test('r3-06: TT writes Sk (--new-page-card-px) on the band slot below 40rem; the band\'s dock class reads it', () => {
  const { band } = slot.newPageCardSlot;
  assert.equal(band.cardHeightProperty, '--new-page-card-px');
  assert.equal(band.cardHeightQuery, '(width < 40rem)');
  assert.ok(band.dockClass.includes('dock:bottom-[var(--new-page-card-px,0px)]'));
  const source = read('src/source-chat-home.jsx');
  assert.ok(source.includes('band.style.setProperty(cardHeightProperty, `${card.getBoundingClientRect().height}px`)'));
  assert.ok(source.includes('if (query.matches)'), 'nothing is written at or above 40rem');
  // Rendered: the band div and the card block are still ED's (the effect does not run on the server).
  const html = renderToStaticMarkup(h(home.SourceNewPageCardSlot, null, h('i')));
  assert.ok(html.includes(`<div class="relative -z-10 ${band.dockClass} md:z-0 md:-mb-6 md:w-full md:max-w-[inherit]"></div>`));
});
