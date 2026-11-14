// integration-2 links: the host's one window.open / navigation policy (electron/main.cjs installLinkPolicy) against the
// 4.16336.0 main process it follows (asar/.vite/build/index.chunk-Du-Wqi0E.js), run on stub webContents. The Electron
// end-to-end check (real clicks, shell.openExternal stubbed, isolated profile) is scripts/external-links-ui-test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const app = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const main = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');
const officialMain = fs.readFileSync(path.join(app, '../reference/snapshots/claude-4.16336.0-20261104/asar/.vite/build/index.chunk-Du-Wqi0E.js'));
const officialPreload = fs.readFileSync(path.join(app, '../reference/snapshots/claude-4.16336.0-20261104/asar/.vite/build/mainView.js'));
const at = (buffer, needle) => { const offset = buffer.indexOf(needle); assert.equal(buffer.indexOf(needle, offset + 1), -1, `once: ${needle}`); return offset; };
const count = (text, needle) => text.split(needle).length - 1;

test('official 4.16336.0: the main view denies every child window and sends external web URLs to shell.openExternal', () => {
  assert.equal(at(officialMain, 'let oe=e=>{let{url:t}=e;if(!URL.canParse(t))return{action:"deny"}'), 6669273);
  assert.equal(at(officialMain, 'return Y9(t,{trigger:"window-open"}),{action:"deny"}},se=Lfi((e=>w.handleWindowOpen(e,oe)))'), 6670048);
  assert.equal(at(officialMain, 'b.webContents.on("will-navigate",Mwo)'), 6665835);
  assert.equal(at(officialMain, 'Nwo=(e,t)=>{let n=e.url;if(typeof n!="string"){e.preventDefault();return}Y9(n,{trigger:t})||e.preventDefault()}'), 6671103);
  assert.equal(at(officialMain, 'P.debug("Opening in system browser %o",{origin:r.origin}),_b(r.toString())}return!1}return!0}'), 6672525);
  assert.equal(at(officialMain, 'function _b(e,t){let n=m2t(e);u.shell.openExternal(n)'), 2106510);
  assert.equal(at(officialMain, 'function p2t(e){return({url:t})=>{let n=null;try{n=new URL(t)}catch{return{action:"deny"}}return n.protocol!=="https:"&&n.protocol!=="http:"?'), 2103352);
  assert.equal(at(officialMain, 'e2t=new Set(["mailto:","tel:","sms:"])'), 2099332);
  // The official preload's claudeAppBindings opens no links (MCP bindings only); the host does not define it.
  const bindings = at(officialPreload, 'exposeInMainWorld("claudeAppBindings",{registerBinding:');
  assert.equal(bindings, 269253);
  assert.match(officialPreload.subarray(bindings, bindings + 600).toString(), /openMcpSettings:e=>t\.ipcRenderer\.invoke\(Z\.RequestOpenMcpSettings,e\)\}\)/);
  assert.equal(count(fs.readFileSync(path.join(app, 'electron/preload.cjs'), 'utf8'), 'claudeAppBindings'), 0);
});

test('host: every app window installs the one link policy; no bare deny handler or local will-navigate is left', () => {
  assert.equal(count(main, 'installLinkPolicy(window);'), 3, 'popout pane, main window, session window');
  assert.equal(count(main, 'setWindowOpenHandler('), 1, 'only inside installLinkPolicy');
  assert.equal(count(main, '.on("will-navigate", '), 1, 'only inside installLinkPolicy');
  assert.equal(count(main, 'new BrowserWindow('), 4, 'the three app windows and the hidden printToPdf page; window.open never adds one');
});

function loadPolicy() {
  const start = main.indexOf('function externalLinkTarget(url, contents) {');
  const end = main.indexOf('function broadcastPopouts() {');
  assert.ok(start > 0 && end > start);
  const opened = [];
  const shell = { openExternal: url => { opened.push(url); return Promise.resolve(); } };
  const { externalLink } = require('../electron/context-menu.cjs');
  const context = vm.createContext({ URL, shell, externalLink });
  vm.runInContext(`${main.slice(start, end)}; globalThis.installLinkPolicy = installLinkPolicy;`, context);
  return { install: context.installLinkPolicy, opened };
}
function fakeWindow(pageUrl) {
  const handlers = {};
  const contents = { getURL: () => pageUrl, setWindowOpenHandler(fn) { handlers.open = fn; }, on(name, fn) { handlers[name] = fn; } };
  return { window: { webContents: contents }, handlers };
}

test('window.open: http(s) without credentials and mailto: open externally; everything is denied', () => {
  const { install, opened } = loadPolicy();
  const { window, handlers } = fakeWindow('file:///Applications/OpenClaude/dist/index.html');
  install(window);
  const cases = { 'https://example.com/a?b=1#c': 'https://example.com/a?b=1#c', 'http://example.com': 'http://example.com/', 'mailto:someone@example.com': 'mailto:someone@example.com',
    'https://user:pw@example.com/': null, 'file:///etc/hosts': null, 'javascript:alert(1)': null, 'tel:+15550100': null, 'ftp://example.com/': null, 'not a url': null, 'about:blank': null };
  for (const [url, expected] of Object.entries(cases)) {
    const before = opened.length;
    assert.deepEqual({ ...handlers.open({ url }) }, { action: 'deny' }, url);
    assert.deepEqual([...opened.slice(before)], expected ? [expected] : [], url);
  }
});

test('will-navigate: the page never leaves; an external URL goes to the browser; the same URL (reload) is allowed', () => {
  const { install, opened } = loadPolicy();
  const page = 'file:///app/dist/index.html?window=session';
  const { window, handlers } = fakeWindow(page);
  install(window);
  const navigate = url => { let prevented = false; handlers['will-navigate']({ preventDefault: () => { prevented = true; } }, url); return prevented; };
  assert.equal(navigate(page), false);
  assert.equal(opened.length, 0);
  assert.equal(navigate('https://example.com/x'), true); assert.deepEqual(opened, ['https://example.com/x']);
  assert.equal(navigate('file:///app/dist/other.html'), true); assert.equal(opened.length, 1);
  assert.equal(navigate('https://u:p@example.com/'), true); assert.equal(opened.length, 1);
});

test('U-2 app://localhost page: same rules; its own app:// URLs are never external and never navigated to', () => {
  const { install, opened } = loadPolicy();
  const page = 'app://localhost/index.html?window=session';
  const { window, handlers } = fakeWindow(page);
  install(window);
  const navigate = url => { let prevented = false; handlers['will-navigate']({ preventDefault: () => { prevented = true; } }, url); return prevented; };
  assert.equal(navigate(page), false, 'reload');
  assert.equal(navigate('app://localhost/other.html'), true);
  assert.equal(navigate('file:///etc/hosts'), true);
  assert.equal(navigate('claude-media://v/x'), true);
  assert.deepEqual(opened, []);
  assert.deepEqual({ ...handlers.open({ url: 'app://localhost/index.html' }) }, { action: 'deny' });
  assert.deepEqual(opened, []);
  handlers.open({ url: 'https://example.com/' });
  assert.deepEqual(opened, ['https://example.com/']);
});

test('dev server: the app\'s own origin is never treated as external', () => {
  const { install, opened } = loadPolicy();
  const { window, handlers } = fakeWindow('http://127.0.0.1:5173/?window=session');
  install(window);
  assert.deepEqual({ ...handlers.open({ url: 'http://127.0.0.1:5173/?popout=1' }) }, { action: 'deny' });
  let prevented = false;
  handlers['will-navigate']({ preventDefault: () => { prevented = true; } }, 'http://127.0.0.1:5173/settings');
  assert.equal(prevented, true);
  assert.deepEqual(opened, []);
  handlers.open({ url: 'http://127.0.0.1:8080/' });
  assert.deepEqual(opened, ['http://127.0.0.1:8080/']);
});
