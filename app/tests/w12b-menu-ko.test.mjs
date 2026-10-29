// w12b-menu-ko (3.6556.2): the menu bar follows ko() — another window holds the focus while the main window is alive.
// index.chunk-jPKPzV-P.js ko / ybi and the ko() sites aSi, xbi, Qxi/Xxi, Zxi, SSi, mTi/vTi, gTi. Here app-menu.cjs
// isOtherWindowFocused (ko), watchOtherWindowFocus (ybi) and appMenuTemplate's otherWindowFocused option.
// Lead: analysis/claude-3.6556.2-migrate-20261025/reports/W11/w11-sweep-shell-a.md (new-side-chat `ko()`).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import appMenu from '../electron/app-menu.cjs';

const { appMenuTemplate, menuState, isOtherWindowFocused, watchOtherWindowFocus } = appMenu;
const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const submenu = (template, label) => template.find(item => item.label === label).submenu;
const byLabel = (items, label) => items.find(item => item.label === label);
const plain = value => JSON.parse(JSON.stringify(value));
const CODE = [{ id: 'cowork', label: 'Claude', items: 'chats', selected: false }, { id: 'code', label: 'Code', items: 'sessions', selected: true }];
const STATE = {
  panes: { changes: { enabled: true, open: true }, files: { enabled: true, open: false }, terminal: { enabled: true, open: true },
    preview: { enabled: true, open: false }, sideChat: { enabled: true, open: false } },
  closePane: { enabled: true }, session: { open: true }, reopenClosed: { available: true, enabled: true }, findInFiles: { enabled: true },
  goMenuAreas: CODE,
};
const SPLIT = { newRight: true, newBelow: true, split: true, moveLeft: true, moveRight: true, moveUp: true, moveDown: true };
const build = (extra = {}, state = STATE) => appMenuTemplate({ sidebarOpen: true, canGoBack: true, canGoForward: true, menuState: menuState(state), splitState: SPLIT, emit: () => {}, ...extra });

test('official text: ko / ybi and its menu sites (read as text, never executed)', () => {
  const main = fs.readFileSync(path.join(snapshot, 'asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
  for (const needle of [
    'function ko(){let e=a.BrowserWindow.getFocusedWindow();return e!=null&&B!=null&&!B.isDestroyed()&&e!==B}',
    'function ybi(){let e=ko(),t=()=>{let t=ko();t!==e&&(e=t,CM())};a.app.on("browser-window-focus",t),a.app.on("browser-window-blur",t)}',
    'hHn(),ybi(),yGa()',
    'enabled:EM()&&!ko()&&(n||e.enabled&&!e.open)',
    'enabled:EM()&&!ko()&&Jyi().findInFiles.enabled',
    'Xxi=()=>{let e=Qxi();return e===void 0?[Yxi(),{...Yxi("CmdOrCtrl+Shift+W"),visible:!1,acceleratorWorksWhenHidden:!0},...Zxi()]',
    'Zxi=()=>{let e=tbi();return!e.available||!EM()||!_bi()||ko()?[]:',
    'function Qxi(){if(!_bi()||ko())return;',
    'SSi=(e,t)=>{let n=e&&!ko(),',
    'mTi=(e,t,n,r)=>{let i=e?Xyi():{enabled:!1,open:!1},a=EM()&&!ko();',
    '...vTi(t,a,r),{type:"separator"},gTi(n,a,r)]',
    'a=(e,r,i,a)=>pTi(e,t&&a.enabled&&a.open,n,{...r!==null&&{accelerator:r,registerAccelerator:n?.registerAccelerator},enabled:t&&a.enabled,',
    'enabled:t&&r.closePane.enabled,click:(e,t,r)=>$1(r,(e=>e.dispatchCloseSessionPane()),fTi(n))',
    'registerAccelerator:a?n?.registerAccelerator:void 0,enabled:t&&i,click:(e,t,i)=>$1(i,(e=>e.dispatchSplitViewCommand(r))',
  ]) assert.ok(main.includes(needle), needle);
  // The cycle pair is the only Go row ko() touches: Search… is `enabled:e` (signed in), Back/Forward read _Si.
  assert.ok(main.includes('{label:X().formatMessage({defaultMessage:"Search\\u2026",id:"+WkyrCbxoZ"}),accelerator:t.search,enabled:e,'));
});

test('isOtherWindowFocused is ko(): a focused window that is not the live main window', () => {
  const live = { isDestroyed: () => false }, dead = { isDestroyed: () => true }, other = { isDestroyed: () => false };
  assert.equal(isOtherWindowFocused({ focused: null, main: live }), false);
  assert.equal(isOtherWindowFocused({ focused: undefined, main: live }), false);
  assert.equal(isOtherWindowFocused({ focused: other, main: null }), false);
  assert.equal(isOtherWindowFocused({ focused: other, main: dead }), false);
  assert.equal(isOtherWindowFocused({ focused: live, main: live }), false);
  assert.equal(isOtherWindowFocused({ focused: other, main: live }), true);
});

test('watchOtherWindowFocus is ybi(): rebuild only when ko() flips on browser-window-focus / -blur', () => {
  const electronApp = new EventEmitter();
  let other = false, rebuilds = 0;
  const stop = watchOtherWindowFocus({ app: electronApp, otherWindowFocused: () => other, rebuild: () => { rebuilds += 1; } });
  assert.equal(electronApp.listenerCount('browser-window-focus'), 1);
  assert.equal(electronApp.listenerCount('browser-window-blur'), 1);
  electronApp.emit('browser-window-focus');
  assert.equal(rebuilds, 0, 'no flip, no rebuild');
  other = true; electronApp.emit('browser-window-focus');
  assert.equal(rebuilds, 1);
  electronApp.emit('browser-window-blur');
  assert.equal(rebuilds, 1, 'still another window: no rebuild');
  other = false; electronApp.emit('browser-window-blur');
  assert.equal(rebuilds, 2);
  stop();
  assert.equal(electronApp.listenerCount('browser-window-focus'), 0);
  assert.equal(electronApp.listenerCount('browser-window-blur'), 0);
});

test('otherWindowFocused false (the default) leaves the template unchanged', () => {
  assert.deepEqual(plain(build({ otherWindowFocused: false })), plain(build()));
  const file = submenu(build(), 'File');
  assert.equal(byLabel(file, 'Close Session').accelerator, 'CmdOrCtrl+W');
  assert.equal(byLabel(file, 'Reopen Closed Session').enabled, true);
  assert.equal(byLabel(file, 'New Side Chat').enabled, true);
});

test('another window focused: File ⌘W is Close Window (Qxi undefined), no Reopen (Zxi), New Side Chat disabled (aSi)', () => {
  const file = submenu(build({ otherWindowFocused: true }), 'File');
  assert.equal(byLabel(file, 'Close Session'), undefined);
  assert.equal(byLabel(file, 'Reopen Closed Session'), undefined);
  assert.equal(byLabel(file, 'New Side Chat').enabled, false);
  const closes = file.filter(item => item.label === 'Close Window');
  assert.deepEqual(plain(closes), [
    { label: 'Close Window', accelerator: 'CmdOrCtrl+W', role: 'close' },
    { label: 'Close Window', accelerator: 'CmdOrCtrl+Shift+W', role: 'close', visible: false, acceleratorWorksWhenHidden: true },
  ]);
  // A Chat / Task / Page target and a closable pane give way the same way.
  for (const state of [{ ...STATE, session: { open: false }, closeMenuTarget: 'chat', goMenuAreas: [{ ...CODE[0], selected: true }, { ...CODE[1], selected: false }] },
    { ...STATE, session: { open: false } }]) {
    const items = submenu(build({ otherWindowFocused: true }, state), 'File');
    assert.deepEqual(items.filter(item => item.accelerator === 'CmdOrCtrl+W').map(item => item.label), ['Close Window']);
  }
});

test('another window focused: Find in Files (xbi) and Previous/Next (SSi) are disabled; Search and Back/Forward are not', () => {
  const template = build({ otherWindowFocused: true });
  const find = byLabel(submenu(template, 'Edit'), 'Find').submenu;
  assert.equal(find.find(item => item.id === 'find-in-files').enabled, false);
  assert.equal(byLabel(submenu(build(), 'Edit'), 'Find').submenu.find(item => item.id === 'find-in-files').enabled, true);
  const go = submenu(template, 'Go');
  assert.equal(byLabel(go, 'Previous Session').enabled, false);
  assert.equal(byLabel(go, 'Next Session').enabled, false);
  assert.notEqual(byLabel(go, 'Search…').enabled, false);
  assert.equal(go.find(item => item.id === 'go-back').enabled, true);
  assert.equal(go.find(item => item.id === 'go-forward').enabled, true);
  const goHere = submenu(build(), 'Go');
  assert.notEqual(byLabel(goHere, 'Previous Session').enabled, false);
});

test('another window focused: View pane items, Close Pane (vTi) and Split View (gTi) are disabled, labels read Show', () => {
  const view = submenu(build({ otherWindowFocused: true }), 'View');
  for (const label of ['Show Terminal', 'Show Changes', 'Show Preview', 'Show Files', 'Show Side Chat']) assert.equal(byLabel(view, label).enabled, false, label);
  assert.equal(byLabel(view, 'Hide Terminal'), undefined);
  assert.equal(byLabel(view, 'Hide Changes'), undefined);
  assert.equal(byLabel(view, 'Close Pane').enabled, false);
  for (const item of byLabel(view, 'Split View').submenu.filter(item => item.type !== 'separator')) assert.equal(item.enabled, false, item.label);
  // mTi's Command Palette (enabled:e) and sidebar item (Xyi) are not ko() sites.
  assert.notEqual(byLabel(view, 'Command Palette…').enabled, false);
  assert.notEqual(byLabel(view, 'Hide Sidebar').enabled, false);
  const here = submenu(build(), 'View');
  assert.equal(byLabel(here, 'Hide Terminal').enabled, true);
  assert.equal(byLabel(here, 'Close Pane').enabled, true);
  assert.ok(byLabel(here, 'Split View').submenu.filter(item => item.type !== 'separator').every(item => item.enabled === true));
});
