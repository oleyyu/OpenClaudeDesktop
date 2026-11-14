// Lane R3b-settings: settings-01 (Worktree location "…on this computer."), the Settings end of cov0-04 (the low-disk
// toast's Manage storage opens Settings › General with the Storage dialog: 'general#open-storage') and menus-01 (the
// CDS Shortcut text variant's 0.15em glyph gap and "+" joiner, checked against the 3.6556.2 shared-frame source and
// the view-tabs CdsShortcut that renders it). SSR only (portals inline, effects do not run).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
import { conciseCopy } from '../electron/i18n/concise.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
// D21: view-tabs' preload-helper calls document.createElement while it evaluates.
const documentStub = { cookie: '', body: { nodeType: 1 }, documentElement: { dataset: {}, dir: 'ltr', getAttribute: () => null, hasAttribute: () => false },
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
  ViewTabs = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
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

test('settings-01: Code › Sessions › Worktree location: the official "…on this computer." source (3.6556.2 cc7db14f1 P0gQiUc0+j) shows its concise line, in zh-CN too', async () => {
  // 3.6556.2 moved the settings catalog rows from cd19fedd2 to the new cc7db14f1 (menus §2.2); the copy is unchanged.
  const official = await fs.readFile(path.join(reference, 'cc7db14f1-gBe2zwpj.js'), 'utf8');
  assert.ok(official.includes('description:c({defaultMessage:"Where to store Git worktrees for isolated coding sessions on this computer.",id:"P0gQiUc0+j"})'));
  // round3 rl-settings B3: the Claude Code page's Sessions group is now the official 4.16336.0 one (c8b630735 ot, part
  // "local") over the catalog row cbc28252c worktreeLocation (id "worktree-location" in section claude-code), whose
  // element id is cd14a8022's `setting-${section}-${id}`; the copy is the same P0gQiUc0+j string.
  const official4 = await fs.readFile(path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1/cbc28252c-BH4auGvp.js'), 'utf8');
  assert.equal(official4.split('worktreeLocation:_({id:"worktree-location",group:"local-sessions",label:u({defaultMessage:"Worktree location",id:"cU7ff1IrXY"}),description:u({defaultMessage:"Where to store Git worktrees for isolated coding sessions on this computer.",id:"P0gQiUc0+j"})').length - 1, 1);
  const anchor = await fs.readFile(path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1/cd14a8022-CCTq5nc1.js'), 'utf8');
  assert.ok(anchor.includes('function r(e){return e.anchor??`setting-${e.section.replaceAll("/","-")}-${e.id}`}'));
  const html = page('code');
  const at = html.indexOf('id="setting-claude-code-worktree-location"');
  const row = at < 0 ? '' : html.slice(at, (html.indexOf('data-settings-row=""', html.indexOf('data-settings-row=""', at) + 1) >>> 0) || undefined);
  assert.ok(row, 'the row renders');
  assert.match(row, /^id="setting-claude-code-worktree-location" role="group" aria-labelledby="[^"]+" aria-describedby="[^"]+" data-settings-row=""/);
  // U-SET-LITE-2: the official defaultMessage goes through t(), which shows its concise line (electron/i18n/concise.mjs).
  const worktreeCopy = 'Where to store Git worktrees for isolated coding sessions on this computer.';
  assert.equal(conciseCopy(worktreeCopy, 'en-US'), 'Where Git worktrees are stored.');
  assert.match(row, /aria-describedby="([^"]+)"[\s\S]*<div id="\1" data-settings-desc="" class="[^"]*">Where Git worktrees are stored\.<\/div>/, 'the row describes itself with the short line');
  assert.equal(html.includes(worktreeCopy), false, 'the long line is not shown');
  assert.equal(html.includes('Where to store Git worktrees for isolated coding sessions.'), false, 'the old copy is gone');
  assert.equal(html.includes('SSH sessions use the Worktree folder setting'), false, 'no SSH variant: no core runs over SSH');
  const zh = I18n.dictionary('zh-CN');
  assert.equal(zh[worktreeCopy], '在这台电脑上为隔离的编码会话存放 Git 工作树的位置。', 'the full translation stays in the dictionary');
  assert.equal(zh['Where to store Git worktrees for isolated coding sessions.'], undefined, 'the unused old entry was removed');
  assert.equal(zh['Low disk space: {free} free'], '磁盘空间不足：剩余 {free}');
  assert.equal(zh['Manage storage'], '管理存储空间');
  // zh-CN shows the short Chinese line, ahead of the dictionary's full one.
  assert.equal(conciseCopy(worktreeCopy, 'zh-CN'), 'Git worktree 的存放位置。');
  I18n.setLocale('zh-CN');
  try {
    assert.equal(I18n.t(worktreeCopy), 'Git worktree 的存放位置。');
    const zhHtml = page('code'), zhAt = zhHtml.indexOf('id="setting-claude-code-worktree-location"');
    assert.ok(zhAt > 0, 'the row renders in zh-CN');
    assert.ok(zhHtml.slice(zhAt, zhHtml.indexOf('data-settings-row=""', zhHtml.indexOf('data-settings-row=""', zhAt) + 1) >>> 0 || undefined).includes('>Git worktree 的存放位置。</div>'));
  } finally { I18n.setLocale('en-US'); }
});

test('cov0-04: general#open-storage opens Settings on Desktop app (the System host page) with the Storage dialog; plain general does not', async () => {
  const official = await fs.readFile(path.join(reference, 'shared-3-BCEbd8Fv.js'), 'utf8');
  assert.ok(official.includes('bN="open_storage",xN=`/settings/desktop?${bN}=true`'));
  const opened = page('general#open-storage');
  assert.ok(opened.includes('class="ss-storage-dialog"'), 'the Storage dialog is open');
  assert.ok(opened.includes('aria-label="Calculating storage"'), 'and loading its report');
  // U-SET-LITE: the System page ('general') is a host of the Desktop app nav entry.
  assert.ok(opened.includes('class="ss-content sl-content" data-page="general" data-entry="desktop"><span hidden=""></span><h2 class="sl-page-title">Desktop app</h2>'), 'on the Desktop app page (System host)');
  // The sl-nav row marks the current entry aria-current="page".
  assert.match(opened, /<button type="button" class="sl-nav-item" data-testid="settings-nav-desktop" aria-current="page">(?:(?!<\/button>)[\s\S])*<span>Desktop app<\/span><\/button>/, 'Desktop app is current');
  assert.equal(opened.match(/aria-current="page"/g).length, 1);
  const plain = page('general');
  assert.equal(plain.includes('class="ss-storage-dialog"'), false);
  assert.equal(page('code#open-storage').includes('class="ss-storage-dialog"'), false, 'only the System page opens it');
});

test('menus-01: the text variant gap is 0.15em and the non-mac "+" joiner margin -0.15em, as the view-tabs CdsShortcut renders them', async () => {
  const official = await fs.readFile(path.join(reference, 'shared-frame-6jtSkIit.js'), 'utf8');
  assert.ok(official.includes('text:"inline-flex shrink-0 items-baseline gap-[0.15em] text-caption"'));
  assert.ok(official.includes('className:"mx-[-0.15em] [color:var(--cds-shortcut-cap-ink)]",children:ac'));
  assert.ok(official.includes('insert:"Insert",plus:"+"}'), 'the plus key glyph');
  // 3.6556.2: a one-chord shortcut also gets the RTL row reversal (`g=i.length===1&&rc`).
  assert.ok(official.includes('rc="[&:where(:root[dir=rtl]_:dir(rtl))]:flex-row-reverse"'));
  assert.ok(official.includes('let h=nc[o],g=i.length===1&&rc'));
  // The original component, through the view-tabs facade (SSR snapshot: non-mac, so "+" joiners).
  const cds = render(React.createElement(ViewTabs.CdsShortcut, { keys: 'cmd+shift+k', variant: 'text' }));
  assert.match(cds, /data-cds="Shortcut" data-variant="text" class="inline-flex shrink-0 items-baseline gap-\[0\.15em\] text-caption \[&amp;:where\(:root\[dir=rtl\]_:dir\(rtl\)\)\]:flex-row-reverse"/);
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
