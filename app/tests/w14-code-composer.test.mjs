// W14-code composer lane: the environment bar's folder menu and chip (cc43287c9 P8 / hse / use), the spawn notice row
// (wpe Yn + Ufe), per-command refusals (xme / Bhe), the Auto / Bypass consent dialog (c227f4d5e xR / vR, c73f45bc3 Au),
// /cd (c227f4d5e Lz), /add-dir, /theme, failure toasts, queue take-back (Lc / cD), the history hint (c227f4d5e NA with
// the cbd6db52c Kbd), the queue's Send now note (cf74bc599 UE) and the composer CSS items. Source and SSR only.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';
import { commandRefusal, parseSessionCommand, sessionCommands } from '../src/session-command-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const assets = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const read = (file) => fs.readFile(path.join(app, file), 'utf8');
const chunk = (name) => fs.readFile(path.join(assets, name), 'utf8');
const h = React.createElement;
let server, Menu, Bar, Bypass, Kbd;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Menu = await server.ssrLoadModule('/src/source-composer-folder-menu.jsx');
  Bar = await server.ssrLoadModule('/src/source-composer-environment-bar.jsx');
  Bypass = await server.ssrLoadModule('/src/source-bypass-permission.jsx');
  Kbd = await server.ssrLoadModule('/src/generated/code-composer/composer-kbd.mjs');
});
after(() => server?.close());
const command = (id) => sessionCommands.find((entry) => entry.id === id);

test('official evidence: the strings and classes this lane copies are in 3.6556.2', async () => {
  const cc = await chunk('cc43287c9-Me-M2ucD.js'), c2 = await chunk('c227f4d5e-B-FYKrwT.js'), c7 = await chunk('c73f45bc3-B7hbL7H9.js');
  for (const text of ['id:"biG+krWPOa"', 'defaultMessage:"Also included",id:"QltjY7DzbP"',
    'defaultMessage:"{folder} +{count}, folder: {value}",id:"kIIspeB92o"', 'defaultMessage:"No matching branches",id:"ueb6I/aqiQ"',
    'defaultMessage:"Use /{commandName}",id:"o/k1n6KMxU"', 'flex flex-wrap items-center gap-sm text-footnote text-warning select-text',
    'defaultMessage:"Start a session before renaming it.",id:"jy4Q9es/t+"', 'defaultMessage:"Appearance set to Dark",id:"hULKuNJKmj"',
    'defaultMessage:"Model: {value}",id:"/BH9qS3xcc"', 'defaultMessage:"The input already has a draft. Clear it to pull this message back in.",id:"UfDkK7lgLJ"'])
    assert.ok(cc.includes(text), text);
  for (const text of ['"epitaxy-auto-mode-consented"', '"epitaxy-perm-mode-acks-v2"', 'defaultMessage:"Change working directory",id:"SoyaAWkbuR"',
    'defaultMessage:"Session moved to {directory}",id:"0ux48b2N96"', 'motion-safe:animate-pulse', 'id:"sYWwXvJhx5"'])
    assert.ok(c2.includes(text), text);
  for (const text of ['defaultMessage:"Enable auto mode?",id:"3E39HlgtDu"', 'defaultMessage:"Workspace folder",id:"euTsu1GHzj"',
    'mt-3 max-h-24 overflow-y-auto font-mono-ui text-code text-primary break-all', 'mt-3 text-footnote text-muted-as-secondary'])
    assert.ok(c7.includes(text), text);
  assert.match(await chunk('cbd6db52c-BMnXAopb.js'), /"data-cds":"Kbd"/);
  assert.match(await chunk('shared-5-Bg6ZMqvt.js'), /shadow-\[inset_0_0_0_2px_var\(--cds-fill-accent\)\]/);
});

test('folder menu: eight recents without a query, every match of a path or ~ path with one', () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ path: `/Users/me/p${i}`, label: `p${i}` }));
  assert.equal(Menu.folderMenuRows(rows, '').length, 8);
  assert.deepEqual(Menu.folderMenuRows(rows, 'p9').map((row) => row.path), ['/Users/me/p9']);
  assert.equal(Menu.FOLDER_MENU_SEARCH_AFTER, 8);
});

test('folder chip: the extra folders fold into "+N" and the kIIspeB92o name', () => {
  const plain = Bar.environmentBarChips({ workdir: '/tmp/a/project' });
  assert.equal(plain.folder.tail, undefined);
  assert.match(plain.folder.ariaLabel, /^Folder: /);
  const extra = Bar.environmentBarChips({ workdir: '/tmp/a/project', additionalFolders: ['/tmp/b', '/tmp/c'] });
  assert.equal(extra.folder.tail, '+2');
  assert.equal(extra.folder.ariaLabel, 'project +2, folder: /tmp/a/project, /tmp/b, /tmp/c');
});

test('refusals: per-command copy before the session starts; /status is the spawn notice', () => {
  assert.deepEqual(commandRefusal(command('rename'), {}), { text: 'Start a session before renaming it.', surface: 'toast' });
  assert.equal(commandRefusal(command('btw'), {}).text, 'Side chat is available once this session starts. Send your first message to start it.');
  assert.equal(commandRefusal(command('diff'), {}).text, 'The changes view works once this session starts. Send your first message to start it.');
  assert.deepEqual(commandRefusal(command('status'), {}), { text: 'Session info is available once the session starts.', surface: 'notice', cause: 'session' });
  assert.equal(commandRefusal(command('status'), { current: 'a', connected: true, running: true }).cause, 'turn');
  assert.equal(commandRefusal(command('fork'), { current: 'a', connected: true, hasHistory: true, unsupportedMethods: ['thread/fork'] }).text, 'Fork isn’t available for this session.');
  assert.equal(commandRefusal(command('compact'), { current: 'a', connected: true, hasHistory: true }), null);
  assert.equal(parseSessionCommand('/nope').errorSurface, 'notice');
  assert.equal(parseSessionCommand('/share').errorSurface, 'toast');
  assert.equal(parseSessionCommand('/rename a\nb').errorSurface, null);
});

test('consent memory: Bypass per workspace, Auto once (official keys)', () => {
  const data = new Map(), store = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
  assert.equal(Bypass.bypassAcknowledged('/w', store), false);
  Bypass.acknowledgeBypass('/w', store); Bypass.acknowledgeBypass('', store);
  assert.equal(Bypass.bypassAcknowledged('/w', store), true);
  assert.deepEqual(JSON.parse(data.get('epitaxy-perm-mode-acks-v2')), ['/w:bypassPermissions']);
  assert.equal(Bypass.autoConsented(store), false);
  Bypass.consentToAuto(store);
  assert.equal(Bypass.autoConsented(store), true);
});

test('Au body: Auto and Bypass copy, the workspace block and the note classes (source)', async () => {
  const source = await read('src/source-bypass-permission.jsx');
  for (const text of ['t("Enable auto mode?")', 't("Enable auto mode")', "t('Workspace folder')", 'className="mt-3 text-footnote text-muted-as-secondary"',
    '"You won’t be asked again for this workspace. Read our <securityLink>security guide</securityLink> for details."',
    '"You won’t be asked again. Read our <securityLink>security guide</securityLink> for details."',
    'mt-3 max-h-24 overflow-y-auto font-mono-ui text-code text-primary break-all', 'epitaxy-scroll-clamp scroll-fade-y'])
    assert.ok(source.includes(text), text);
  assert.doesNotMatch(source, /Stays on for new sessions|source-bypass-workspace|source-bypass-note/);
});

test('history hint: the CDS Kbd and NA classes; no host history rules left', async () => {
  const html = renderToStaticMarkup(h(withMemoCache(() => h(Kbd.Kbd, null, '↓'))));
  assert.match(html, /^<kbd data-cds="Kbd" class="text-caption inline-flex shrink-0 items-center justify-center h-\[calc\(1em\+6px\)\][^"]*w-\[calc\(1em\+6px\)\] px-0">↓<\/kbd>$/);
  const composer = await read('src/source-composer.jsx'), css = await read('src/source-composer.css');
  for (const text of ['className="font-mono-ui text-primary"', 'className="motion-safe:animate-pulse"', 'className="tabular-nums"', 't("<kbd>↓</kbd> to restore your draft")',
    'ms-auto inline-flex min-w-0 items-center gap-1 truncate transition-opacity duration-300 ease-out motion-reduce:transition-none'])
    assert.ok(composer.includes(text), text);
  assert.doesNotMatch(css, /\.sc-history-(search|kbd|count|draft)/);
});

test('main.jsx wiring: folder menu popup, spawn notice, refusal toasts, /cd, /theme, failure toasts, take-back, prefill', async () => {
  const main = await read('src/main.jsx');
  for (const text of ['<SourceComposerFolderMenu popup=', 'menu?.kind === "home-environment" || menu?.kind === "home-folder"', 'const refusal = commandRefusal(command, commandContext);',
    'parsed.errorSurface === "notice"', 'call("folder", { additional: true, purpose: "cd" })', 't("The session is already in this directory.")',
    "t('Appearance set to Dark')", 'modelChangeFailed(model)', 't("Effort change couldn’t be applied. You can try again.")',
    't("Permission mode couldn’t be changed. You can try again.")', 't("The input already has a draft. Clear it to pull this message back in.")',
    'mode={bypassMode.confirmingMode}', 'key: "epitaxy-prefill-refused"', "t('DeepSeek can already use {path} in this session.',{path:dir})"])
    assert.ok(main.includes(text), text);
  assert.doesNotMatch(main, /commandSuggestion|>\{t\("Add another folder"\)\}<\/SourceMenu\.Item>|>\{t\("Edit local environment"\)\}<|Name a folder: \/cd/);
});

test('CSS items: the drop panel insets, the warning row wraps, the official ProseMirror marks, the CDS spinner and search header', async () => {
  const css = await read('src/source-composer.css'), editor = await read('src/source-composer-editor.css'), model = await read('src/composer-editor-model.mjs');
  // Review fix: the drop panel is the shell's own (qf / Kf / Jf), not a host rule.
  assert.doesNotMatch(css, /\[data-drag-over\] \[data-cds="ChatComposer"\] > \.sc-card/);
  assert.match(css, /\.sc-warning-row \{ display: flex; flex-wrap: wrap;[^}]*user-select: text; \}/);
  assert.doesNotMatch(editor, /sc-inline-code\{|sc-code-block\{|a\.sc-composer-link\{/);
  assert.match(model, /\['div',\{class:'code-block'\},\['pre',\{dir:'ltr'/);
  assert.match(await read('src/source-composer-row-chin.jsx'), /<CdsSpinner size="sm" \/>/);
  assert.doesNotMatch(css, /\.sc-model-trigger \.sc-spinner/);
  const menu = await read('src/source-model-menu.jsx');
  assert.match(menu, /!border-transparent !bg-transparent !shadow-none compact:!ps-2 comfortable:!ps-2\.5/);
  assert.doesNotMatch(await read('src/source-model-menu.css'), /sm-model-search/);
  assert.match(await read('src/source-slash-menu.css'), /font:400 var\(--prompt-text-size,14px\)\/24px/);
  // W14-code r2-composer-01: the composer error's column wrapper moved with the card to message-style.css.
  // W14-code r3 css3-band-column-width: and then into the composer column rules (source-composer.css).
  assert.match(await read('src/source-composer.css'), /\.composer-error:not\(\.inline-error\), \.ssn-list, \.sqm-band \{[^}]*max-width: calc\(var\(--local-transcript-width, 768px\)/);
  // W14-code r7 r7c-01: the queue's ghost buttons are the original bar's own (generated/queued-bar: CdsButton ghost iconOnly
  // base, UE's note in the persona through source-queued-bar-adapter.jsx QueuedBarMessage).
  const queued = await read('src/generated/queued-bar/queued-bar.mjs');
  assert.match(queued, /variant: "ghost",\s+iconOnly: !0,\s+size: "base",\s+icon: "ArrowReturn",/);
  assert.match(await read('src/source-queued-bar-adapter.jsx'), /text: "DeepSeek reads this message at its next step\."/);
});
