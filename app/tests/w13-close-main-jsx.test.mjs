// w13-close-main-jsx-tests (W13 closeout G7): main.jsx guards and wiring that have no test of their own — the Cowork
// surface guard of the project page, the Cowork panel's computer-use gate (E63 panel-live-05), the incognito header's
// Exit incognito (shared-20 Iy / Qg) and the date range's own "From" / "To" in zh-CN. Source only: the official chunks
// and catalogs are read as text (never executed); hosts render through react-dom/server. No Electron, no browser.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const official = (name) => fs.readFileSync(path.join(ionSource, name), 'utf8');
const catalog = (locale) => JSON.parse(fs.readFileSync(path.join(ionSource, `../../i18n/${locale}.json`), 'utf8'));
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const main = read('src/main.jsx');

let server, I18n, T, ChatExport;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18n.setLocale('en-US');
  T = await server.ssrLoadModule('/src/source-titlebar.jsx');
  ChatExport = await server.ssrLoadModule('/src/source-chat-export-adapters.jsx');
});
after(async () => { I18n?.setLocale('en-US'); await server?.close(); });

test('coworkui-placeholder-02: the project page never opens on the cowork surface while Cowork is unavailable', () => {
  // shared-78 mY: no cowork surface unless Cowork is available; switchMode refuses it the same way.
  assert.equal(count(main, "const coworkSurfaceListed = () => desktopSurfaces({ coworkEnabled: boot?.coworkEnabled === true }).includes('cowork');"), 1);
  const open = main.slice(main.indexOf('async function openLocalProject(project) {'), main.indexOf('async function setProjectComposerMode('));
  assert.ok(open.indexOf('if (!coworkSurfaceListed()) {') < open.indexOf("navigate(null, { surface: 'cowork', projectId: opened.id });"));
  assert.equal(count(open, "navigate(null, { surface: 'chat', projectId: opened.id });"), 1);
  assert.equal(count(open, "await call('settings', { mode: 'chat' });"), 1);
  // The Artifacts library's Create starts nothing on a missing cowork surface.
  assert.equal(count(main, "onCreate={async () => { if (!coworkSurfaceListed()) return; await switchMode('cowork'); navigate(null, { surface: 'cowork' });"), 1);
});

test('E63 panel-live-05: the Cowork panel gets the computer-use card gate (shared-78 vR) answered on', () => {
  assert.ok(official('shared-78-D5Fw2h0a.js').includes('vR="cowork_computer_use_side_panel_card";function yR(){return Ze(vR)}function bR(){return O(vR)}'));
  assert.equal(count(main, 'const COWORK_PANEL_GATES = Object.freeze({ cowork_computer_use_side_panel_card: true });'), 1);
  const mount = main.slice(main.indexOf('<SourceCoworkProgress key={current}'), main.indexOf('/>}', main.indexOf('<SourceCoworkProgress key={current}')));
  assert.equal(count(mount, 'gates={COWORK_PANEL_GATES}'), 1);
  assert.equal(read('src/source-cowork-live-adapters.jsx').includes('export const COMPUTER_USE_CARD_GATE = "cowork_computer_use_side_panel_card";'), true);
});

test('Exit incognito: shared-20 Iy in Fy\'s trailing slot, Qg\'s ghost X with the incognito shortcut', () => {
  const s20 = official('shared-20-mUr7IqZY.js');
  for (const needle of ['t?l.formatMessage({defaultMessage:"Exit incognito",id:"DZ4HgSiP72"}):l.formatMessage({defaultMessage:"Use incognito",id:"I+U+pJa37R"})',
    'variant:"ghost",iconOnly:!0,size:c,icon:g,tooltip:!1,className:_,"aria-label":f,disabled:p,onClick:r',
    'i(M,{hoverable:!1,side:o,shortcut:a,content:h,children:v})', 'if(n||!(s||r)||!r)return null;let l=r?"left":"bottom"',
    'i(Qg,{enabled:r,onToggle:c,shortcut:o,tooltipSide:l,className:"draggable-none",size:t})', 'U=i(Iy,{})',
    'c("div",{className:"flex-1 flex items-center justify-end",children:[U,W,ee,G]})'])
    assert.equal(count(s20, needle), 1, needle);
  // The incognito shortcut (shared-1 `incognito`): ⇧⌘I on a Mac. desktopTopBar is "supported" in the main process.
  assert.ok(official('shared-1-BJhqMmkf.js').includes('incognito:{description:$P.description,sessionDescription:$P.description_session,group:"chat",shortcut:{bindings:[{key:"i",modifiers:["cmd","shift"],platform:"mac"}'));
  assert.equal(catalog('en-US').DZ4HgSiP72, 'Exit incognito');

  const render = (props) => renderToStaticMarkup(h(T.SourceTitlebar, { surface: 'chat', section: 'new', session: null, onRename() {}, ...props }));
  const trailing = (html) => html.slice(html.indexOf('<div class="st-trailing'));
  const on = trailing(render({ onExitIncognito() {} }));
  const button = on.match(/<button[^>]*aria-label="Exit incognito"[^>]*>/)?.[0];
  assert.ok(button, 'drawn while incognito');
  assert.ok(on.indexOf('aria-label="Exit incognito"') < 200, 'first in the trailing slot');
  assert.match(button, /class="[^"]*\bgroup draggable-none\b/);
  assert.doesNotMatch(trailing(render({})), /Exit incognito/);
  // main.jsx: only in Chat, on the incognito New chat page or in an incognito chat; the toggle is ⇧⌘I's.
  // w13-close-chat-surface (E77) changed this wiring: incognitoActive is the same Chat incognito condition, and while
  // the main window draws the incognito shell its Fy row carries Iy (tests/w13-close-chat-surface.test.mjs), so the
  // titlebar's X is only passed where no shell is drawn.
  assert.equal(count(main, 'const incognitoActive = mode === "chat" && (incognitoDraft || isIncognitoSession(current, sessionMetadata));'), 1);
  assert.equal(count(main, 'onExitIncognito={incognitoActive && !incognitoShell ? () => incognitoKey.current?.() : undefined'), 1);
  I18n.setLocale('zh-CN');
  try { assert.match(trailing(render({ onExitIncognito() {} })), /aria-label="退出无痕模式"/); } finally { I18n.setLocale('en-US'); }
});

test('zh "To" context: the date range\'s From / To are its own entries, the email card keeps 收件人', () => {
  // Same English, other meanings in the official catalogs (ja-JP 開始日 / 終了日 for the range, 宛先 for the email header).
  const ja = catalog('ja-JP');
  assert.deepEqual([ja['H9/0QD/PB9'], ja.xdBzfNZWw7, ja.AEtSiuVhQb], ['開始日', '終了日', '宛先']);
  assert.ok(read('src/generated/chat-export/date-range-selector.mjs').includes('e(r, { defaultMessage: "To", id: "xdBzfNZWw7" })'));
  assert.ok(read('src/generated/mcp-app-card/cfdfec14c.mjs').includes('_.formatMessage({ defaultMessage: "To", id: "AEtSiuVhQb" })'));
  const html = () => ['H9/0QD/PB9', 'xdBzfNZWw7'].map((id, i) => renderToStaticMarkup(h(ChatExport.FormattedMessage, { id, defaultMessage: ['From', 'To'][i] })));
  assert.deepEqual(html(), ['From', 'To']);
  I18n.setLocale('zh-CN');
  try {
    assert.deepEqual(html(), ['开始日期', '结束日期']);
    assert.equal(I18n.t('To'), '收件人', 'the plain entry (mcp-app-card AEtSiuVhQb) is unchanged');
    assert.equal(renderToStaticMarkup(h(ChatExport.FormattedMessage, { id: 'Sjo1P44FYy', defaultMessage: 'Custom' })), I18n.t('Custom'));
  } finally { I18n.setLocale('en-US'); }
});
