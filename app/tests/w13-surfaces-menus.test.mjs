// w13-surfaces-menus (3.6556.2): the menu bar follows the renderer's reported areas and ⌘W target — index.chunk-jPKPzV-P.js
// rSi (File's first item), iSi/aSi (Code-only File items in the Sessions area), Qxi (Close Chat / Task / Page), Zxi
// (Reopen Closed Session under EM()), xSi (Go's area checkboxes), SSi (Previous/Next by area), $yi (Chats by default),
// fbi (at most Uyi=8 areas); the renderer side is shared-22 $P / JP (here main.jsx menuState).
// Research: analysis/claude-3.6556.2-migrate-20261025/research/w13-surfaces.md §1.3 O20–O27, surf-17/18/19/20/21/33.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import appMenu from '../electron/app-menu.cjs';
import zhMenus from '../electron/i18n/zh-CN/menus.mjs';

const { appMenuTemplate, menuState, sameMenuState, areaItems } = appMenu;
const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const readable = path.resolve(app, '../analysis/claude-3.6556.2-migrate-20261025/readable/3.6556.2');
const source = file => fs.readFileSync(path.join(app, file), 'utf8');
const submenu = (template, label) => template.find(item => item.label === label).submenu;
const shape = items => items.map(item => item.type === 'separator' ? '---' : item.label);
const build = (state, emit = () => {}) => appMenuTemplate({ sidebarOpen: true, menuState: menuState(state), emit });
const HOME = { id: 'cowork', label: 'Claude', items: 'chats' }, CODE = { id: 'code', label: 'Code', items: 'sessions' };
const onHome = [{ ...HOME, selected: true }, { ...CODE, selected: false }];
const onCode = [{ ...HOME, selected: false }, { ...CODE, selected: true }];

test('official text: rSi / iSi / aSi / Qxi / Zxi / xSi / SSi / $yi / fbi and the renderer reports $P / JP', () => {
  // Read as text only (indexOf), never executed.
  const main = fs.readFileSync(path.join(snapshot, 'asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
  for (const needle of [
    '[Y_.Chats]:t.formatMessage({defaultMessage:"New Chat",id:"0aHdFu/l3q"}),[Y_.Tasks]:t.formatMessage({defaultMessage:"New Task",id:"tyiWynSRix"}),[Y_.Sessions]:t.formatMessage({defaultMessage:"New Session",id:"oQrNKDv+Cp"})}[$yi()],accelerator:"CmdOrCtrl+N"',
    'iSi=()=>$yi()!==Y_.Sessions||',
    'aSi=()=>{if($yi()!==Y_.Sessions||!K().codeSurface.enabled)return[];',
    'case X_.Chat:return e.formatMessage({defaultMessage:"Close Chat",id:"aMz0CHEoCu"})',
    'case X_.Task:return e.formatMessage({defaultMessage:"Close Task",id:"lba/DHLeeP"})',
    'case X_.Page:return e.formatMessage({defaultMessage:"Close Page",id:"xBoJHuJvWa"})',
    'if(EM())return Yyi()?e.formatMessage({defaultMessage:"Close Session",id:"xdFFXdcjAb"})',
    'Zxi=()=>{let e=tbi();return!e.available||!EM()||',
    'return e.length<2?[]:[{type:"separator"},...e.map((e=>({label:CSi(e.label),type:"checkbox",checked:e.selected,',
    'dispatchSelectArea(e.id)),null)',
    'bSi=(e,t)=>[...xSi(),{type:"separator"},...SSi(e,t),{type:"separator"},',
    '[Y_.Chats]:[r.formatMessage({defaultMessage:"Previous Chat",id:"R6IJaQd5ea"}),r.formatMessage({defaultMessage:"Next Chat",id:"Ubrd2osCEK"})]',
    '[Y_.Tasks]:[r.formatMessage({defaultMessage:"Previous Task",id:"MPdc7dzZqC"}),r.formatMessage({defaultMessage:"Next Task",id:"+CCvoj7koS"})]',
    'function $yi(){return t0.goMenuAreas.find((e=>e.selected))?.items??Y_.Chats}',
    'function fbi(e){n0({goMenuAreas:e.slice(0,Uyi)})}', 'Uyi=8,',
    'Y_=function(e){return e.Chats="chats",e.Tasks="tasks",e.Sessions="sessions",e}({}),X_=function(e){return e.Chat="chat",e.Task="task",e.Page="page",e}({})',
    'function CSi(e){return FT(e,uSi)}', 'uSi=80,',
  ]) assert.ok(main.includes(needle), needle);
  const renderer = fs.readFileSync(path.join(readable, 'shared-22-Bwn3sJTG.js'), 'utf8');
  for (const needle of [
    '(e) => (e === "code" ? qe.Sessions : e === "cowork" && !r ? qe.Tasks : qe.Chats)',
    '(e) => ({ id: e, label: n[e].label, selected: e === t, items: a(e) })',
    'Be?.reportGoMenuAreas?.(e)', 'Be?.reportCloseMenuTarget?.(e)',
    'a = r !== null && i ? Le.Chat : r,',
  ]) assert.ok(renderer.includes(needle), needle);
});

test('Home area (merged cowork, Chats): New Chat, no Code-only File rows, Close Chat, Go area checkboxes and Previous/Next Chat', () => {
  const events = [];
  const template = build({ goMenuAreas: onHome, closeMenuTarget: 'chat', session: { open: true }, closePane: { enabled: true },
    reopenClosed: { available: true, enabled: true }, panes: { sideChat: { enabled: true, open: false } } }, e => events.push(e));
  const file = submenu(template, 'File');
  assert.deepEqual(shape(file), ['New Chat', '---', 'Open File…', 'Open Folder…', '---', 'Close Chat', 'Close Window']);
  assert.deepEqual(file.filter(item => item.label).map(item => [item.label, item.accelerator, item.role]), [
    ['New Chat', 'CmdOrCtrl+N', undefined], ['Open File…', 'CmdOrCtrl+O', undefined], ['Open Folder…', 'CmdOrCtrl+Shift+O', undefined],
    ['Close Chat', 'CmdOrCtrl+W', undefined], ['Close Window', 'CmdOrCtrl+Shift+W', 'close']]);
  file[0].click({}, null); file[5].click({}, null); file[5].click({}, null, { triggeredByAccelerator: true, metaKey: true });
  const go = submenu(template, 'Go');
  assert.deepEqual(go.map(item => item.type === 'separator' ? '---' : [item.label, item.type, item.checked]), [
    ['Back', undefined, undefined], ['Back', undefined, undefined], ['Forward', undefined, undefined], ['Forward', undefined, undefined],
    '---', ['Claude', 'checkbox', true], ['Code', 'checkbox', false],
    '---', ['Previous Chat', undefined, undefined], ['Next Chat', undefined, undefined], '---', ['Search…', undefined, undefined]]);
  // xSi's click has a null modifier: an accelerator-shaped event still dispatches.
  go[6].click({}, null, { triggeredByAccelerator: true, metaKey: true }); go[5].click({}, null);
  go[8].click({}, null); go[9].click({}, null);
  assert.deepEqual(events, [{ kind: 'new-session' }, { kind: 'close-session' }, { kind: 'close-session', accelerator: true },
    { kind: 'select-area', id: 'code' }, { kind: 'select-area', id: 'cowork' }, { kind: 'cycle-session', delta: -1 }, { kind: 'cycle-session', delta: 1 }]);
});

test('Code area (Sessions): New Session, the Code-only File rows, Close Session / Reopen, Previous/Next Session, the checkboxes', () => {
  const template = build({ goMenuAreas: onCode, closeMenuTarget: 'chat', session: { open: true }, reopenClosed: { available: true, enabled: true } });
  assert.deepEqual(shape(submenu(template, 'File')), ['New Session', 'New Session with Current Settings', 'New Window', 'New Side Chat', '---',
    'Open File…', 'Open Folder…', '---', 'Close Session', 'Close Window', 'Reopen Closed Session']);
  const go = submenu(template, 'Go');
  assert.deepEqual(go.filter(item => item.type === 'checkbox').map(item => [item.label, item.checked]), [['Claude', false], ['Code', true]]);
  assert.deepEqual(shape(go.slice(7)), ['---', 'Previous Session', 'Next Session', '---', 'Search…']);
  // Without a session view the Sessions area keeps Close Pane / the Close Window pair (closeMenuTarget is not read under EM()).
  assert.deepEqual(shape(submenu(build({ goMenuAreas: onCode, closeMenuTarget: 'task', closePane: { enabled: true } }), 'File').slice(8)), ['Close Pane', 'Close Window']);
  assert.deepEqual(submenu(build({ goMenuAreas: onCode, closeMenuTarget: 'task' }), 'File').slice(8).map(item => [item.label, item.visible]), [['Close Window', undefined], ['Close Window', false]]);
});

test('⌘W target outside the Sessions area: Close Chat / Close Task / Close Page, else the Close Window pair; no Close Pane or Reopen', () => {
  const tasks = [{ id: 'cowork', label: 'Cowork', selected: true, items: 'tasks' }, { ...CODE, selected: false }];
  const closeRows = (closeMenuTarget, areas = tasks) => submenu(build({ goMenuAreas: areas, closeMenuTarget, closePane: { enabled: true },
    reopenClosed: { available: true, enabled: true } }), 'File').slice(5).map(item => [item.label, item.accelerator, item.visible]);
  assert.deepEqual(closeRows('task'), [['Close Task', 'CmdOrCtrl+W', undefined], ['Close Window', 'CmdOrCtrl+Shift+W', undefined]]);
  assert.deepEqual(closeRows('chat'), [['Close Chat', 'CmdOrCtrl+W', undefined], ['Close Window', 'CmdOrCtrl+Shift+W', undefined]]);
  assert.deepEqual(closeRows('page'), [['Close Page', 'CmdOrCtrl+W', undefined], ['Close Window', 'CmdOrCtrl+Shift+W', undefined]]);
  assert.deepEqual(closeRows(null), [['Close Window', 'CmdOrCtrl+W', undefined], ['Close Window', 'CmdOrCtrl+Shift+W', false]]);
  const template = build({ goMenuAreas: tasks, closeMenuTarget: 'task' });
  assert.equal(submenu(template, 'File')[0].label, 'New Task');
  assert.deepEqual(shape(submenu(template, 'Go').slice(8, 10)), ['Previous Task', 'Next Task']);
});

test('one area: no checkboxes; none reported: $yi reads Chats', () => {
  const single = build({ goMenuAreas: [{ ...CODE, selected: true }] });
  assert.equal(submenu(single, 'Go').some(item => item.type === 'checkbox'), false);
  assert.deepEqual(shape(submenu(single, 'Go').slice(4)), ['---', 'Previous Session', 'Next Session', '---', 'Search…']);
  assert.equal(submenu(single, 'File')[0].label, 'New Session');
  const none = appMenuTemplate({ sidebarOpen: true, emit: () => {} });
  assert.equal(areaItems(menuState()), 'chats');
  assert.deepEqual(shape(submenu(none, 'File')), ['New Chat', '---', 'Open File…', 'Open Folder…', '---', 'Close Window', 'Close Window']);
  assert.deepEqual(shape(submenu(none, 'Go').slice(4)), ['---', 'Previous Chat', 'Next Chat', '---', 'Search…']);
});

test('menu-state keeps at most 8 well-formed areas and a known ⌘W target; both take part in the rebuild comparison', () => {
  const nine = Array.from({ length: 9 }, (_, index) => ({ id: `a${index}`, label: `Area ${index}`, selected: index === 0, items: 'chats' }));
  assert.equal(menuState({ goMenuAreas: nine }).goMenuAreas.length, 8);
  assert.deepEqual(menuState({ goMenuAreas: [{ id: 'x', label: 'X', selected: 'yes', items: 'chats', extra: 1 }, { id: '', label: 'Y', items: 'chats' },
    { id: 'z', label: 3, items: 'chats' }, { id: 'w', label: 'W', items: 'pages' }, null] }).goMenuAreas, [{ id: 'x', label: 'X', selected: false, items: 'chats' }]);
  assert.deepEqual(menuState({ goMenuAreas: 'cowork' }).goMenuAreas, []);
  for (const target of ['chat', 'task', 'page']) assert.equal(menuState({ closeMenuTarget: target }).closeMenuTarget, target);
  for (const target of ['session', '', 1, undefined]) assert.equal(menuState({ closeMenuTarget: target }).closeMenuTarget, null);
  assert.equal(sameMenuState({ goMenuAreas: onHome }, { goMenuAreas: onCode }), false);
  assert.equal(sameMenuState({ closeMenuTarget: 'chat' }, { closeMenuTarget: null }), false);
  assert.equal(sameMenuState({ goMenuAreas: onHome, closeMenuTarget: 'chat' }, JSON.parse(JSON.stringify({ goMenuAreas: onHome, closeMenuTarget: 'chat' }))), true);
  // CSi = FT(label, 80): whitespace collapses; a longer label keeps 79 characters and an ellipsis.
  const long = submenu(build({ goMenuAreas: [{ id: 'a', label: `  ${'x'.repeat(90)}  `, selected: true, items: 'chats' }, { ...CODE, selected: false, label: 'Co\n  de' }] }), 'Go')
    .filter(item => item.type === 'checkbox').map(item => item.label);
  assert.deepEqual(long, [`${'x'.repeat(79)}…`, 'Co de']);
});

test('renderer wiring: main.jsx reports the areas and ⌘W target ($P / JP) and Go\'s checkbox switches the mode', () => {
  const main = source('src/main.jsx');
  assert.match(main, /\nimport \{ homeNameFor \} from '\.\/app-switch-model\.mjs';\n/);
  assert.match(main, /const MENU_COMMANDS = new Set\(\[[^\]]*"select-area"\]\);/);
  assert.match(main, /else if \(e\.kind === "select-area"\) \{ if \(!settings && typeof e\.id === "string"\) void switchMode\(e\.id\); \}/);
  assert.match(main, /const menuAreas = menuSurfaces\.map\(id => \(\{ id, label: t\(id === 'code' \? 'Code' : homeNameFor\(id\)\), selected: \(mode === 'code' \? 'code' : menuHome\) === id,\n\s+items: id === 'code' \? 'sessions' : id === 'cowork' && !menuMerged \? 'tasks' : 'chats' \}\)\);/);
  assert.match(main, /const menuCloseTarget = paneMenuAvailable && mode !== 'code' \? \(mode === 'cowork' && !menuMerged \? 'task' : 'chat'\) : null;/);
  assert.match(main, /goMenuAreas: menuAreas, closeMenuTarget: menuCloseTarget \};\n\s+const menuStateKey = JSON\.stringify\(menuState\);/);
  // main.cjs normalizes the report through app-menu.cjs menuState and forwards select-area like every renderer command.
  const cjs = source('electron/main.cjs');
  assert.match(cjs, /function setMenuState\(payload, window\) \{\n\s+const next = menuState\(payload\);/);
  assert.match(cjs, /if \(window\) windowRegistry\.send\(window, e\);/);
  // The stale "area checkboxes never appear" note is gone.
  assert.doesNotMatch(source('electron/app-menu.cjs'), /never appear here/);
});

test('zh-CN: the new area labels are translated (Claude stays untranslated, D23)', () => {
  assert.deepEqual(['New Chat', 'New Task', 'Close Chat', 'Close Task', 'Close Page', 'Previous Chat', 'Next Chat', 'Previous Task', 'Next Task'].map(key => zhMenus[key]),
    ['新建聊天', '新建任务', '关闭聊天', '关闭任务', '关闭页面', '上一个聊天', '下一个聊天', '上一个任务', '下一个任务']);
  assert.equal(zhMenus.Claude, undefined);
});
