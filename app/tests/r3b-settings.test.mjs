// Lane R3b-settings: settings-01 (Worktree location "…on this computer."), the Settings end of cov0-04 (the low-disk
// toast's Manage storage opens Settings › General with the Storage dialog: 'general#open-storage') and menus-01 (the
// CDS Shortcut text variant's 0.15em glyph gap and "+" joiner, checked against the 2.42304.0 shared-frame source and
// the view-tabs CdsShortcut that renders it). SSR only (portals inline, effects do not run).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
// D21: view-tabs' preload-helper calls document.createElement while it evaluates.
const documentStub = { body: { nodeType: 1 }, documentElement: { dataset: {}, dir: 'ltr', getAttribute: () => null, hasAttribute: () => false },
  createElement: () => ({ relList: { supports: () => false } }) };
let server, Settings, Shortcut, ViewTabs, React, render, I18n, savedDocument;
before(async () => {
  savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  if (!globalThis.document) Object.defineProperty(globalThis, 'document', { value: documentStub, configurable: true, writable: true });
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSettings: Settings } = await server.ssrLoadModule('/src/source-settings.jsx'));
  Shortcut = await server.ssrLoadModule('/src/source-shortcut.jsx');
  ViewTabs = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(async () => {
  await server?.close();
  if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument); else if (globalThis.document === documentStub) delete globalThis.document;
});
const page = (initialSection, config = {}) => render(React.createElement(Settings, { open: true, config: { threadIds: [], ...config },
  model: 'm', effort: 'medium', permission: 'ask', boot: { connected: true, models: [] }, busy: false, initialSection,
  desktopCall: async () => ({}), onSave: async () => ({}), onClose() {} }));
const rowOf = (html, id) => { const at = html.indexOf(`data-setting-id="${id}"`); return at < 0 ? '' : html.slice(at, html.indexOf('data-setting-id="', at + 20) >>> 0 || undefined); };

test('settings-01: Code › Sessions › Worktree location says "…on this computer." (2.42304.0 cd19fedd2 P0gQiUc0+j), in zh-CN too', async () => {
  const official = await fs.readFile(path.join(reference, 'cd19fedd2-7Tk-qNbq.js'), 'utf8');
  assert.ok(official.includes('description:s({defaultMessage:"Where to store Git worktrees for isolated coding sessions on this computer.",id:"P0gQiUc0+j"})'));
  const html = page('code');
  const row = rowOf(html, 'worktreeLocation');
  assert.ok(row, 'the row renders');
  assert.ok(row.includes('Where to store Git worktrees for isolated coding sessions on this computer.'));
  assert.equal(html.includes('Where to store Git worktrees for isolated coding sessions.'), false, 'the old copy is gone');
  assert.equal(html.includes('SSH sessions use the Worktree folder setting'), false, 'no SSH variant: no core runs over SSH');
  const zh = I18n.dictionary('zh-CN');
  assert.equal(zh['Where to store Git worktrees for isolated coding sessions on this computer.'], '在这台电脑上为隔离的编码会话存放 Git 工作树的位置。');
  assert.equal(zh['Where to store Git worktrees for isolated coding sessions.'], undefined, 'the unused old entry was removed');
  assert.equal(zh['Low disk space: {free} free'], '磁盘空间不足：剩余 {free}');
  assert.equal(zh['Manage storage'], '管理存储空间');
});

test('cov0-04: general#open-storage opens Settings on the System page with the Storage dialog; plain general does not', async () => {
  const official = await fs.readFile(path.join(reference, 'shared-3-DnHYUZdJ.js'), 'utf8');
  assert.ok(official.includes('bk="open_storage",xk=`/settings/desktop?${bk}=true`'));
  const opened = page('general#open-storage');
  assert.ok(opened.includes('class="ss-storage-dialog"'), 'the Storage dialog is open');
  assert.ok(opened.includes('aria-label="Calculating storage"'), 'and loading its report');
  assert.ok(opened.includes('class="ss-content" data-page="general"'), 'on the General (System) page');
  assert.match(opened, /<button aria-current="page">(?:(?!<\/button>)[\s\S])*<span>System<\/span><\/button>/, 'This computer › System is current');
  const plain = page('general');
  assert.equal(plain.includes('class="ss-storage-dialog"'), false);
  assert.equal(page('code#open-storage').includes('class="ss-storage-dialog"'), false, 'only the System page opens it');
});

test('menus-01: the text variant gap is 0.15em and the non-mac "+" joiner margin -0.15em, as the view-tabs CdsShortcut renders them', async () => {
  const official = await fs.readFile(path.join(reference, 'shared-frame-BfjMqbuN.js'), 'utf8');
  assert.ok(official.includes('text:"inline-flex shrink-0 items-baseline gap-[0.15em] text-caption"'));
  assert.ok(official.includes('className:"mx-[-0.15em] [color:var(--cds-shortcut-cap-ink)]",children:Os'));
  assert.ok(official.includes('insert:"Insert",plus:"+"}'), 'the plus key glyph');
  // The original component, through the view-tabs public name (SSR snapshot: non-mac, so "+" joiners).
  const cds = render(React.createElement(ViewTabs.CdsShortcut, { keys: 'cmd+shift+k', variant: 'text' }));
  assert.match(cds, /data-cds="Shortcut" data-variant="text" class="inline-flex shrink-0 items-baseline gap-\[0\.15em\] text-caption"/);
  assert.equal(cds.split('class="mx-[-0.15em] [color:var(--cds-shortcut-cap-ink)]">+</span>').length - 1, 2);
  // The host component keeps the same structure, and its stylesheet the same values.
  const host = render(React.createElement(Shortcut.SourceShortcut, { keys: 'cmd+shift+k', variant: 'text', mac: false }));
  assert.equal(host.split('<span class="scds-joiner">+</span>').length - 1, 2);
  assert.deepEqual(host.match(/<kbd[^>]*>[^<]*<\/kbd>/g), cds.match(/<kbd[^>]*>[^<]*<\/kbd>/g).map(kbd => kbd.replace(/ class="[^"]*"/, ' class="scds-text-key"')));
  const css = await fs.readFile(path.join(app, 'src/source-shortcut.css'), 'utf8');
  assert.match(css, /\.scds-shortcut\.scds-text \{ gap: \.15em; align-items: baseline; \}/);
  assert.match(css, /\.scds-joiner \{ margin-inline: -\.15em; color: var\(--cds-shortcut-cap-ink\); \}/);
  assert.equal(/\.3em/.test(css), false, 'no 2.31226.0 0.3em value left');
  assert.deepEqual(Shortcut.shortcutCaps('cmd+plus', true).map(cap => cap.label), ['⌘', '+']);
});
