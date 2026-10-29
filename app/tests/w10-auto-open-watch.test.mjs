// w10-shell-auto-open-behavior (menus:N1 / panes:C5-4, the behaviour): a file the agent wrote that the built-in browser
// shows opens in the session's Preview pane. Official: asar index.chunk-DNPOm2Zc.js PostToolUse hook rA and its opener
// Fk (read as text only, never executed); host: src/auto-open-files-watch.mjs and its main.jsx wiring.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { processWorld, worldOptions } from './fixtures/preview-r3b-world.mjs';
import {
  AUTO_OPEN_DESIGN_CANVAS_GATE, AUTO_OPEN_DESIGN_CANVAS_PATTERN, AUTO_OPEN_FILE_PATTERN, AUTO_OPEN_HTML_PATTERN,
  agentWrittenFiles, autoOpenFileDecision, autoOpenSessionState, autoOpenTarget, resolveAutoOpenPath,
} from '../src/auto-open-files-watch.mjs';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const official = fs.readFileSync(path.join(snapshot, 'asar/.vite/build/index.chunk-DNPOm2Zc.js'), 'utf8');
const local = file => fs.readFileSync(path.join(app, file), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

// ------------------------------------------------------------------------------------------------ official evidence
test('official: rA runs on Edit/Write/MultiEdit with the showable-file pattern, Gk behind its gate and Wk under auto verify', () => {
  assert.equal(count(official, 'if(d!=="Edit"&&d!=="Write"&&d!=="MultiEdit")return{};let f=u.tool_input?.file_path||"";'), 1);
  assert.equal(count(official, `if(Gk.test(f)&&!t.m0("${AUTO_OPEN_DESIGN_CANVAS_GATE}"))return{};`), 1);
  assert.equal(count(official, `let p=Wk.test(f),m=${AUTO_OPEN_FILE_PATTERN}.test(f)`), 1);
  assert.equal(count(official, `Wk=${AUTO_OPEN_HTML_PATTERN},Gk=${AUTO_OPEN_DESIGN_CANVAS_PATTERN}`), 1);
  assert.equal(count(official, 'if(m&&!(p&&e())){'), 1);
  // e() is the session folder's auto verify; the hook exists only with the Browser tools.
  assert.equal(count(official, 'let cn=u.supportsLaunchTools()&&!!Zt["Claude Browser"];if(cn){let e=()=>t.Tu.isAutoVerifyEnabled(p)'), 1);
  assert.equal(count(official, 'e=>Fk(Pk(e,p),r,p,(()=>this.deps.agentEditSessionState(r)))'), 1);
  assert.equal(count(official, 'function Pk(e,t){return X.default.resolve(t,e)}'), 1);
});

test('official: Fk checks the preference, then the session state, then loads the file in the browser preview', () => {
  const start = official.indexOf('async function Fk(e,n,r,i){');
  assert.ok(start > 0);
  const body = official.slice(start, start + 700);
  const steps = [
    'if(t.G0("launchAutoOpenFiles")===!1)return',
    '"autoOpenOff";let a=i();if(a!=="watched")return',
    '"skipped";if(!t.oI()){try{t.Tu.loadHtmlPreview(e,r,{sessionId:n})}catch(e){return Nk(e),"skipped"}return"opened"}',
    't.Vl(e,n,r,{initiator:"agent",provenance:"incidental"})',
  ];
  let at = 0;
  for (const step of steps) { const found = body.indexOf(step, at); assert.ok(found >= at, step); at = found + step.length; }
  assert.equal(count(official, 'agentEditSessionState(e){let t=this.sessions.get(e);return!t||t.isArchived?"gone":this.warmLifecycle.getState(e)?.isTabVisible===!1?"hidden":"watched"}'), 1);
});

// ------------------------------------------------------------------------------------------------ pure model
test('session state follows agentEditSessionState', () => {
  assert.equal(autoOpenSessionState({ known: false }), 'gone');
  assert.equal(autoOpenSessionState({ known: true, archived: true, visible: true }), 'gone');
  assert.equal(autoOpenSessionState({ known: true, visible: false }), 'hidden');
  assert.equal(autoOpenSessionState({ known: true, visible: true }), 'watched');
  assert.equal(autoOpenSessionState({ known: true }), 'watched');
});

test('paths resolve against the session folder as Pk does', () => {
  assert.equal(resolveAutoOpenPath('out/page.html', '/work/site'), '/work/site/out/page.html');
  assert.equal(resolveAutoOpenPath('./a/../b.png', '/work/'), '/work/b.png');
  assert.equal(resolveAutoOpenPath('/abs/x.pdf', '/work'), '/abs/x.pdf');
  assert.equal(resolveAutoOpenPath('', '/work'), '');
});

test('which written files open: the official type list, Gk, auto verify, Browser tools, preference and session state', () => {
  const open = file => autoOpenFileDecision(file, { cwd: '/w' });
  for (const name of ['a.html', 'a.HTM', 'a.svg', 'a.png', 'a.jpg', 'a.jpeg', 'a.gif', 'a.webp', 'a.avif', 'a.pdf', 'a.mp4', 'a.webm', 'a.m4v', 'a.mov', 'a.ogv'])
    assert.deepEqual(open(name), { outcome: 'opened', path: `/w/${name}` }, name);
  for (const name of ['a.js', 'a.css', 'a.tsx', 'a.md', 'a.txt', 'a.json', 'a.mp3', 'a.html.bak'])
    assert.equal(open(name), null, name);
  // Gk: a design canvas only with GrowthBook 2515400668 (kept off here).
  assert.equal(open('board.dc.html'), null);
  assert.equal(autoOpenFileDecision('board.dc.html', { cwd: '/w', designCanvas: true })?.outcome, 'opened');
  // `m && !(p && e())`: HTML is left to auto verify; other types still open.
  assert.equal(autoOpenFileDecision('a.html', { cwd: '/w', autoVerify: true }), null);
  assert.equal(autoOpenFileDecision('a.png', { cwd: '/w', autoVerify: true })?.outcome, 'opened');
  assert.equal(autoOpenFileDecision('a.png', { cwd: '/w', browserTools: false }), null);
  assert.deepEqual(autoOpenFileDecision('a.png', { cwd: '/w', enabled: false }), { outcome: 'autoOpenOff', path: '/w/a.png' });
  assert.equal(autoOpenFileDecision('a.png', { cwd: '/w', sessionState: 'hidden' })?.outcome, 'skipped');
  assert.equal(autoOpenFileDecision('a.png', { cwd: '/w', sessionState: 'gone' })?.outcome, 'skipped');
});

const fileChange = (changes, { status = 'completed', threadId = 't1', type = 'fileChange' } = {}) =>
  ({ method: 'item/completed', params: { threadId, turnId: 'u1', item: { id: 'i1', type, status, changes } } });

test('agent edits come from completed fileChange items; deletes write nothing, a move writes its destination', () => {
  assert.deepEqual(agentWrittenFiles(fileChange([{ path: '/w/a.png', kind: 'add' }, { path: '/w/b.html', kind: { type: 'update' } }])),
    { sessionId: 't1', files: ['/w/a.png', '/w/b.html'] });
  assert.deepEqual(agentWrittenFiles(fileChange([{ path: '/w/old.png', kind: { type: 'update', move_path: '/w/new.png' } }])),
    { sessionId: 't1', files: ['/w/new.png'] });
  assert.equal(agentWrittenFiles(fileChange([{ path: '/w/a.png', kind: 'delete' }])), null);
  assert.equal(agentWrittenFiles(fileChange([{ path: '/w/a.png', kind: 'add' }], { status: 'inProgress' })), null);
  assert.equal(agentWrittenFiles(fileChange([{ path: '/w/a.png', kind: 'add' }], { type: 'commandExecution' })), null);
  assert.equal(agentWrittenFiles({ method: 'item/started', params: fileChange([{ path: '/w/a.png', kind: 'add' }]).params }), null);
  assert.equal(agentWrittenFiles({ kind: 'preview-reveal', sessionId: 't1' }), null);
});

test('autoOpenTarget: the last showable file of the edit, in the session the edit belongs to', () => {
  const context = overrides => () => ({ cwd: '/w', browserTools: true, enabled: true, autoVerify: false, sessionState: 'watched', ...overrides });
  const event = fileChange([{ path: 'a.png', kind: 'add' }, { path: 'notes.md', kind: 'add' }, { path: 'b.pdf', kind: 'add' }]);
  assert.deepEqual(autoOpenTarget(event, context()), { sessionId: 't1', path: '/w/b.pdf' });
  assert.deepEqual(autoOpenTarget(event, context({ sessionId: 'parent' })), { sessionId: 'parent', path: '/w/b.pdf' });
  assert.equal(autoOpenTarget(event, context({ enabled: false })), null);
  assert.equal(autoOpenTarget(event, context({ sessionState: 'hidden' })), null);
  assert.equal(autoOpenTarget(event, () => null), null);
  assert.equal(autoOpenTarget(fileChange([{ path: 'notes.md', kind: 'add' }]), context()), null);
});

// ------------------------------------------------------------------------------------------------ host wiring
test('main.jsx: the event handler opens the Preview pane and loads the file through the agent-file entry', () => {
  const main = local('src/main.jsx');
  assert.equal(count(main, 'import { autoOpenTarget, autoOpenSessionState } from "./auto-open-files-watch.mjs";'), 1);
  assert.equal(count(main, 'import { autoOpenFilesEnabled } from "./auto-open-files-model.mjs";'), 1);
  const reveal = main.indexOf('if (e.kind === "preview-reveal" && typeof e.sessionId === "string" && side === 0) openPaneTile("preview", e.sessionId);');
  const wiring = main.indexOf('const autoOpen = side === 0 && !PANE_WINDOW ? autoOpenTarget(e, autoOpenContext.current) : null;');
  assert.ok(reveal > 0 && wiring > reveal);
  // V3-w11-sweep-shell-b: the pane opens once the file did (a held-back HTML file under auto verify answers opened: false).
  assert.equal(count(main, 'if (autoOpen) call("preview-agent-file", { sessionId: autoOpen.sessionId, path: autoOpen.path }).then((result) => { if (result?.opened !== false) openPaneTile("preview", autoOpen.sessionId); }, () => {});'), 1);
  // Review fix: never the user's own navigation (userNavigate: the active tab, agentDriven = false).
  assert.equal(count(main.slice(wiring, wiring + 400), 'preview-navigate'), 0);
  // The context reads the preference, Browser tools, auto verify and visibility at event time.
  const context = main.slice(main.indexOf('autoOpenContext.current = (threadId) => {'), wiring);
  for (const needle of ['enabled: autoOpenFilesEnabled(boot?.config)', 'browserTools: boot?.config?.agentPreview !== false',
    'autoVerify: launch?.exists === true && launch.autoVerify !== false', 'autoOpenSessionState({', 'splitStore.isShown(id)', 'ownerThreadId(latestState.current, threadId)'])
    assert.ok(context.includes(needle), needle);
  // The context is defined before the effect that reads it (no TDZ in the render body).
  assert.ok(main.indexOf('const autoOpenContext = useRef(null);') < main.indexOf('autoOpenContext.current = (threadId) => {'));
});

// ------------------------------------------------------------------------------------------------ review fix: agent-file tab
// Official loadHtmlPreview (index.chunk-jPKPzV-P) evicts the session's previous html preview and makes a new entry; it
// never navigates the session's other previews. Host: preview-service.cjs openAgentFile ("preview-agent-file").
test('official: loadHtmlPreview replaces only the session\'s html preview with a new entry', () => {
  const chunk = fs.readFileSync(path.join(snapshot, 'asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
  assert.equal(count(chunk, 'this.evictHtmlPreviewsForScope(n?.sessionId??null,"html");let r=`${zP}${Date.now()}-${this.htmlPreviewIdCounter++}`;return this.createHtmlPreviewEntry(r,e,t,n)'), 1);
  assert.equal(count(official, 't.Vl(e,n,r,{initiator:"agent",provenance:"incidental"})'), 1);
});

function fakeElectron() {
  const windows = new Map();
  const partition = { setPermissionRequestHandler() {}, setPermissionCheckHandler() {}, on() {}, webRequest: { onBeforeRequest() {} }, getUserAgent: () => 'UA' };
  let nextId = 1;
  class Contents extends EventEmitter {
    constructor() {
      super();
      Object.assign(this, { id: nextId++, url: '', title: '', entries: [], index: -1, session: partition, destroyed: false });
      this.navigationHistory = { canGoBack: () => this.index > 0, canGoForward: () => this.index < this.entries.length - 1 };
      this.debugger = { attached: false, attach: () => { this.debugger.attached = true; }, isAttached: () => this.debugger.attached, on() {}, sendCommand: async () => ({}) };
    }
    isDestroyed() { return this.destroyed; }
    setWindowOpenHandler() {}
    async loadURL(url) {
      this.entries = [...this.entries.slice(0, this.index + 1), url]; this.index = this.entries.length - 1; this.url = url; this.title = url;
      this.emit('did-navigate', {}, url);
      setImmediate(() => { this.emit('did-finish-load'); this.emit('did-stop-loading'); });
    }
    getURL() { return this.url; } getTitle() { return this.title; } isDevToolsOpened() { return false; }
    reload() {} stop() {} focus() {} close() { this.destroyed = true; }
    async executeJavaScriptInIsolatedWorld() { return { ok: true }; }
  }
  class WebContentsView {
    constructor(options) { this.webContents = new Contents(); this.webContents.session = options.webPreferences.session; }
    setBounds() {} setVisible() {} setBackgroundColor() {}
  }
  class BrowserWindow extends EventEmitter {
    constructor(options = {}) { super(); this.options = options; this.destroyed = false; this.contentView = { addChildView() {}, removeChildView() {} }; }
    isDestroyed() { return this.destroyed; } isVisible() { return this.options.show !== false; } destroy() { this.destroyed = true; this.emit('closed'); }
    static fromWebContents(sender) { return windows.get(sender) ?? null; }
  }
  const sender = () => {
    const contents = Object.assign(new EventEmitter(), { isDestroyed: () => false, getZoomFactor: () => 1, send() {}, focus() {} });
    windows.set(contents, new BrowserWindow({ show: true }));
    return contents;
  };
  return { electron: { WebContentsView, BrowserWindow, session: { fromPartition: () => partition }, shell: { openExternal: async () => {}, openPath: async () => '' }, nativeTheme: { shouldUseDarkColors: false } }, sender };
}

test('preview-agent-file opens the file in the session\'s one agent-file tab, never over the user\'s page', async (t) => {
  const { createPreviewService } = createRequire(import.meta.url)('../electron/preview-service.cjs');
  const cwd = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'w10-auto-open-')));
  const fake = fakeElectron(), sender = fake.sender();
  const instance = createPreviewService({ ...worldOptions(processWorld()), electron: fake.electron, getSession: (id) => (id === 's1' ? { id, cwd } : null), spawnEnv: async () => ({}), logger: { warn() {}, info() {} } });
  t.after(async () => { await instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const file = name => path.join(cwd, name), href = name => pathToFileURL(file(name)).href;
  const state = () => instance.call(sender, 'preview-state', { sessionId: 's1' });

  // A lone blank start page is taken over (no extra tab).
  await instance.call(sender, 'preview-agent-file', { sessionId: 's1', path: file('a.html') });
  let now = await state();
  assert.equal(now.tabs.length, 1); assert.equal(now.url, href('a.html'));
  const agentTab = now.activeTabId;

  // The user's own page in another tab stays where it is; the agent's next file reuses the agent-file tab.
  const userTab = (await instance.call(sender, 'preview-tab-new', { sessionId: 's1' })).activeTabId;
  await instance.call(sender, 'preview-navigate', { sessionId: 's1', url: 'http://localhost:3000/' });
  await instance.call(sender, 'preview-agent-file', { sessionId: 's1', path: file('b.svg') });
  now = await state();
  assert.equal(now.tabs.length, 2); assert.equal(now.activeTabId, agentTab); assert.equal(now.url, href('b.svg'));
  assert.equal(now.tabs.find(tab => tab.id === userTab).url, 'http://localhost:3000/');

  // Once the user takes the agent-file tab to a site, it is theirs: the next file opens in a new tab.
  await instance.call(sender, 'preview-navigate', { sessionId: 's1', url: 'http://localhost:4000/' });
  await instance.call(sender, 'preview-agent-file', { sessionId: 's1', path: file('c.png') });
  now = await state();
  assert.equal(now.tabs.length, 3); assert.notEqual(now.activeTabId, agentTab); assert.equal(now.url, href('c.png'));
  assert.equal(now.tabs.find(tab => tab.id === agentTab).url, 'http://localhost:4000/');

  // V3-w11-sweep-shell-b (rA `if(m&&!(p&&e()))`): with auto verify on in the folder's launch.json an HTML file is held
  // back (the agent checks it itself) — for any session, not only the one a pane shows; other types still open; a
  // launch.json that does not parse is no config (auto verify off); `"autoVerify": false` opens HTML again.
  assert.equal(count(official, 'if(m&&!(p&&e()))'), 1);
  fs.mkdirSync(path.join(cwd, '.claude'), { recursive: true });
  const launchFile = path.join(cwd, '.claude/launch.json');
  fs.writeFileSync(launchFile, JSON.stringify({ configurations: [{ name: 'web', runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev'], port: 3000 }] }));
  assert.deepEqual(await instance.call(sender, 'preview-agent-file', { sessionId: 's1', path: file('held.html') }), { opened: false });
  assert.equal((await state()).tabs.some(tab => tab.url === href('held.html')), false);
  await instance.call(sender, 'preview-agent-file', { sessionId: 's1', path: file('shown.pdf') });
  assert.equal((await state()).url, href('shown.pdf'));
  fs.writeFileSync(launchFile, '{ not json');
  await instance.call(sender, 'preview-agent-file', { sessionId: 's1', path: file('broken.html') });
  assert.equal((await state()).url, href('broken.html'));
  // V3-w11-sweep-shell-b (review low 2): parseLaunchJson is "ok" only with a usable configuration
  // (`if(s.length===0){…"no-valid-configs"`), so no configurations, or none usable, is no config: auto verify off.
  assert.equal(count(official, 'if(m&&!(p&&e()))'), 1);
  const launchChunk = fs.readFileSync(path.join(snapshot, 'asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
  assert.equal(count(launchChunk, 'if(s.length===0){let e=rXi(r);return e===null?{status:"no-valid-configs"'), 1);
  assert.equal(count(launchChunk, 'getConfigFile(e){let t=await this.getConfig(e);return t.status==="ok"?t.config:null}'), 1);
  fs.writeFileSync(launchFile, JSON.stringify({ configurations: [] }));
  await instance.call(sender, 'preview-agent-file', { sessionId: 's1', path: file('empty.html') });
  assert.equal((await state()).url, href('empty.html'));
  fs.writeFileSync(launchFile, JSON.stringify({ configurations: [{ port: 'x' }] }));
  await instance.call(sender, 'preview-agent-file', { sessionId: 's1', path: file('unusable.html') });
  assert.equal((await state()).url, href('unusable.html'));
  fs.writeFileSync(launchFile, JSON.stringify({ autoVerify: false, configurations: [{ name: 'web', runtimeExecutable: 'npm', port: 3000 }] }));
  await instance.call(sender, 'preview-agent-file', { sessionId: 's1', path: file('off.html') });
  assert.equal((await state()).url, href('off.html'));
  fs.rmSync(path.join(cwd, '.claude'), { recursive: true, force: true });

  // Outside the session folder or not a path: refused before any tab is made.
  await assert.rejects(instance.call(sender, 'preview-agent-file', { sessionId: 's1', path: '/etc/hosts.html' }));
  await assert.rejects(instance.call(sender, 'preview-agent-file', { sessionId: 's1', path: 'rel.html' }), /Choose a file/);
  assert.equal((await state()).tabs.length, 3);
});

// V3-w11-sweep-shell-b: evictHtmlPreviewsForScope also keeps only the 3 most recent html previews of the other scopes.
test('preview-agent-file keeps the agent-file tabs of at most 3 other sessions, the most recent ones', async (t) => {
  const chunk = fs.readFileSync(path.join(snapshot, 'asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
  assert.equal(count(chunk, 'a.serverId.startsWith("html-preview-")&&((a.sessionId??null)===e&&n(a)===t?r:i).push(a);let a=i.slice(0,Math.max(0,i.length-3));for(let e of[...r,...a])this.stop(e.serverId)'), 1);
  const { createPreviewService } = createRequire(import.meta.url)('../electron/preview-service.cjs');
  const cwd = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'w11-auto-open-')));
  const fake = fakeElectron(), sender = fake.sender();
  const instance = createPreviewService({ ...worldOptions(processWorld()), electron: fake.electron, getSession: (id) => (/^s\d$/.test(id) ? { id, cwd } : null), spawnEnv: async () => ({}), logger: { warn() {}, info() {} } });
  t.after(async () => { await instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const file = name => path.join(cwd, name), href = name => pathToFileURL(file(name)).href;
  const urls = async id => (await instance.call(sender, 'preview-state', { sessionId: id })).tabs.map(tab => tab.url);
  for (const id of ['s1', 's2', 's3', 's4']) await instance.call(sender, 'preview-agent-file', { sessionId: id, path: file(`${id}.html`) });
  for (const id of ['s1', 's2', 's3', 's4']) assert.deepEqual(await urls(id), [href(`${id}.html`)], id);
  // A fifth session: the oldest other one (s1) loses its agent-file tab; s2–s4 keep theirs.
  await instance.call(sender, 'preview-agent-file', { sessionId: 's5', path: file('s5.html') });
  assert.equal((await urls('s1')).includes(href('s1.html')), false);
  for (const id of ['s2', 's3', 's4', 's5']) assert.deepEqual(await urls(id), [href(`${id}.html`)], id);
  // Opening again in s2 makes it the most recent (the others are s3–s5: three, nothing goes); a new file in s1 then
  // leaves four others, and the oldest of them (s3) goes.
  await instance.call(sender, 'preview-agent-file', { sessionId: 's2', path: file('s2b.html') });
  for (const [id, name] of [['s2', 's2b'], ['s3', 's3'], ['s4', 's4'], ['s5', 's5']]) assert.deepEqual(await urls(id), [href(`${name}.html`)], id);
  await instance.call(sender, 'preview-agent-file', { sessionId: 's1', path: file('s1b.html') });
  assert.equal((await urls('s3')).includes(href('s3.html')), false);
  for (const [id, name] of [['s1', 's1b'], ['s2', 's2b'], ['s4', 's4'], ['s5', 's5']]) assert.ok((await urls(id)).includes(href(`${name}.html`)), id);
});

test('preview-service: openAgentFile marks the page agent-driven and is routed as preview-agent-file', () => {
  const service = local('electron/preview-service.cjs');
  const body = service.slice(service.indexOf('function openAgentFile(sessionId, file) {'), service.indexOf('function userNavigate(sessionId, text) {'));
  for (const needle of ['next.agentFile = true;', 'next.agentDriven = true;', 'return navigate(sessionId, url, { tabId: next.tabId });'])
    assert.ok(body.includes(needle), needle);
  assert.equal(count(service, 'case "preview-agent-file": subscribe(preview(id), sender); return openAgentFile(id, p.path);'), 1);
});
