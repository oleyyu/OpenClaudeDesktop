// app_menu and app_focus live, through the real tool layer (agent-tools/computer-use.mjs), service, native module and
// Accessibility calls in it (MenuBar.swift, `npm run build:native`). Run under Electron as Node, with another app in front:
//   ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/Electron.app/Contents/MacOS/Electron scripts/computer-use-ax-tools-check.mjs
// Needs Accessibility and Screen Recording for the process that runs it.
//
// Checks
//   1. Finder, in the background: app_menu list → the menu bar titles; path ["File"] opens File and lists its items;
//      close (Escape) closes it, and a second close finds nothing open; the frontmost app never changes
//   2. TextEdit (only when it isn't already running: your documents are not touched), two documents opened in the
//      background: target "focused" on the window without focus is refused; after app_focus on it, app_type with
//      target "focused" is verified there (AXValue read back); TextEdit is never brought forward; it is quit at the end
// Evidence goes to analysis/batch-20260920/computer-use-ax-tools-<time>/report.json.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createAppResolver } = require('../electron/computer-use/apps.cjs');
const { createAxHelper } = require('../electron/computer-use/ax-helper.cjs');
const cu = await import('../electron/agent-tools/computer-use.mjs');

const directory = path.join(root, '../analysis/batch-20260920', `computer-use-ax-tools-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(directory, { recursive: true });
const report = { at: new Date().toISOString(), runtime: process.versions.electron ? `electron ${process.versions.electron}` : `node ${process.version}`, checks: [], passed: false };
const FINDER = 'com.apple.finder', TEXTEDIT = 'com.apple.TextEdit', S = 'ax-tools';
const settle = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const front = () => { try { return /bundleID="([^"]*)"/.exec(execFileSync('lsappinfo', ['info', '-only', 'bundleID', execFileSync('lsappinfo', ['front'], { encoding: 'utf8' }).trim()], { encoding: 'utf8' }))?.[1] ?? null; } catch { return null; } };
const check = (name, ok, detail = {}) => { report.checks.push({ name, ok, ...detail }); console.log(`${ok ? '✔' : '✖'} ${name}`); assert.ok(ok, `${name}: ${JSON.stringify(detail)}`); };

const axHelper = createAxHelper();
const service = createComputerUse({ axHelper, log: { info() {}, warn: (m) => console.warn(m) } });
const apps = createAppResolver({ enumerate: (folders) => axHelper.call('apps', { folders }) });
const host = createAgentToolsHost({ tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-ax-tools-')), logger: { warn() {}, log() {} },
  modules: [cu], isGroupEnabled: () => true, resolveSession: (id) => (id ? { id, cwd: root } : null) });
host.provide('computerUse', () => ({ service, resolveApps: (names) => apps.resolveAll(names), listApps: (o) => apps.list(o), ask: async () => 'accept' }));
const call = async (name, args) => {
  const result = await host.call(S, { name, arguments: args });
  const text = typeof result === 'string' ? result : result.content?.[0]?.text;
  try { return JSON.parse(text); } catch { return { text }; }
};

try {
  const before = front();
  report.front = before;
  assert.ok(before && before !== FINDER, `put another app in front of Finder first (front: ${before})`);
  const granted = await call('request_access', { apps: ['Finder', 'TextEdit'], reason: 'Live check of app_menu and app_focus' });
  check('request_access grants Finder', granted.granted.some((g) => g.bundleId === FINDER), { granted: granted.granted });

  // 1. Finder menus.
  const bar = await call('app_menu', { app: FINDER, list: true });
  check('app_menu list: the menu bar titles', bar.ok && bar.items.some((i) => i.title === 'File'), { titles: bar.items?.map((i) => i.title) });
  const opened = await call('app_menu', { app: FINDER, path: ['file'] });
  check('app_menu path ["file"]: File opens and lists its items', opened.ok && opened.opened && opened.open && opened.items.length > 3,
    { open: opened.open, items: opened.items?.slice(0, 6).map((i) => `${i.title}${i.enabled ? '' : ' (disabled)'}`) });
  await settle();
  check('the frontmost app did not change', front() === before, { front: front() });
  const closed = await call('app_menu', { app: FINDER, close: true });
  const again = await call('app_menu', { app: FINDER, close: true });
  check('app_menu close (Escape): the open menu closes; nothing is left open', closed.ok && closed.closed >= 1 && again.closed === 0, { closed: closed.closed, again: again.closed });
  const missing = await call('app_menu', { app: FINDER, path: ['Fiel'] });
  check('a misspelt title: menu_item_not_found with closestMatch', missing.error?.code === 'menu_item_not_found' && missing.error.closestMatch === 'File', { error: missing.error });

  // 2. TextEdit focus.
  if (spawnSync('pgrep', ['-x', 'TextEdit']).status === 0) {
    report.checks.push({ name: 'app_focus on TextEdit', skipped: 'TextEdit is running (not touching your documents)' });
    console.log('- app_focus: skipped, TextEdit is running');
  } else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-focus-'));
    const [a, b] = ['a.txt', 'b.txt'].map((name) => path.join(dir, name));
    fs.writeFileSync(a, ''); fs.writeFileSync(b, '');
    try {
      execFileSync('open', ['-g', '-a', 'TextEdit', a]);
      await settle(1500);
      execFileSync('open', ['-g', '-a', 'TextEdit', b]);
      await settle(1500);
      const listed = await service.listWindows(S, { bundleId: TEXTEDIT });
      const docs = listed.windows.filter((w) => !w.is_auxiliary && /\.txt/.test(w.title ?? ''));
      const winA = docs.find((w) => w.title.startsWith('a.txt')), winB = docs.find((w) => w.title.startsWith('b.txt'));
      check('two TextEdit documents in the background', !!winA && !!winB && front() === before, { windows: docs.map((w) => [w.window_id, w.title, w.is_main]) });
      // b.txt opened last: it has the focus. Point the session at a.txt and try target "focused" there.
      await call('app_screenshot', { app: TEXTEDIT, window_id: winA.window_id });
      const refused = await call('app_type', { app: TEXTEDIT, text: 'not here', target: 'focused' });
      check('before app_focus: target "focused" on the window without focus is refused', refused.ok === false, { reasonCode: refused.reasonCode ?? refused.error?.code });
      await call('app_release', { app: TEXTEDIT });
      const focused = await call('app_focus', { app: TEXTEDIT, window_id: winA.window_id });
      check('app_focus a.txt: ok, focused, not activated', focused.ok && focused.focused && focused.window_id === winA.window_id && focused.activated === false, focused);
      const typed = await call('app_type', { app: TEXTEDIT, text: 'focused by app_focus', target: 'focused' });
      check('after app_focus: app_type target "focused" is verified in a.txt', typed.ok === true && typed.windowId === winA.window_id, typed);
      await settle();
      check('TextEdit was never brought forward', front() === before, { front: front() });
    } finally {
      spawnSync('pkill', ['-x', 'TextEdit']);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  report.passed = true;
} catch (error) {
  report.error = String(error?.stack || error);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`report → ${path.relative(process.cwd(), path.join(directory, 'report.json'))}`);
}
