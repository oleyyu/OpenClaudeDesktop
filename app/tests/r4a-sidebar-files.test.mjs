// R4a test lock (moved from tests-r4a/ at the R4g/R4h gate) for the R3 audit group A-sidebar-files (official 2.42304.0): cov7-01, sidebar-14, files-01, files-04,
// files-09, files-21, files-24. Each test has (a) the official signature counts read from the installed 2.42304.0
// chunks and (b) the local side. No vite, no GUI, no network:
//  - model imports (.mjs / .js / .cjs) where the behaviour lives in a node-loadable model;
//  - where the deciding code sits inside a .jsx component (or a model whose import graph needs Vite SSR), the test
//    cuts that exact function / object literal out of the CURRENT source file and runs it with injected stubs, so the
//    assertion is about what the shipped line does, not just that a word is present;
//  - where it is cheaper and exact, the official minified function itself is evaluated from the chunk and run
//    side by side with the local port (files-09 Xb, files-24 the cc3bc2027 search engine and its line-break
//    normaliser).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { setLocale, DEFAULT_LOCALE, t } from '../electron/i18n/index.mjs';
import { archiveChord, archiveBlockedByField, archiveNeighbour } from '../src/sidebar-jump-model.mjs';
import { sessionArchived, sessionState } from '../src/sidebar-model.js';
import { searchInText, DEFAULT_SEARCH_OPTIONS } from '../src/file-find-model.mjs';
import { normalizeSearchText } from '../src/generated/code-editor/search.mjs';

const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const cache = new Map();
const read = file => { if (!cache.has(file)) cache.set(file, fs.readFileSync(file, 'utf8')); return cache.get(file); };
const official = name => read(path.join(reference, 'ion-dist/assets/v1', name));
const local = rel => read(path.join(app, rel));
const count = (text, needle) => text.split(needle).length - 1;
const once = (text, needles) => { for (const needle of needles) assert.equal(count(text, needle), 1, needle); };
const u = text => text.replaceAll('’', '\\u2019'); // the minified chunks spell ’ as \u2019

// ---- source slicing --------------------------------------------------------------------------------------------------
// blockEnd: the index just past the "}" that closes the "{" at `open`, skipping quoted strings, template literals
// (with their ${} holes) and // comments.
function skipQuoted(text, at, quote) {
  for (let i = at + 1; i < text.length; i++) {
    if (text[i] === '\\') { i++; continue; }
    if (text[i] === quote) return i;
  }
  throw new Error('unterminated string');
}
function skipTemplate(text, at) {
  for (let i = at + 1; i < text.length; i++) {
    if (text[i] === '\\') { i++; continue; }
    if (text[i] === '`') return i;
    if (text[i] === '$' && text[i + 1] === '{') i = blockEnd(text, i + 1) - 1;
  }
  throw new Error('unterminated template');
}
function blockEnd(text, open) {
  assert.equal(text[open], '{');
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' || ch === "'") i = skipQuoted(text, i, ch);
    else if (ch === '`') i = skipTemplate(text, i);
    else if (ch === '/' && text[i + 1] === '/') i = text.indexOf('\n', i);
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i + 1;
  }
  throw new Error('unbalanced block');
}
// The source from `startToken` (inside `head`) to the end of the block that `head`'s last "{" opens. `head` must occur
// exactly once in the file, so a refactor that moves or duplicates the code fails here first.
function sliceBlock(text, head, startToken = null) {
  assert.equal(count(text, head), 1, head);
  assert.ok(head.endsWith('{'), head);
  const at = text.indexOf(head);
  const start = startToken === null ? at + head.length - 1 : at + head.indexOf(startToken);
  return text.slice(start, blockEnd(text, at + head.length - 1));
}
// Run a sliced expression with the given free variables bound. The returned `bindings` object writes back into the
// closure (`bindings.set(name, value)`), for a binding the code reads after an await (files-09 `live`).
function evaluate(source, scope) {
  const names = Object.keys(scope);
  const setter = `(name, value) => { switch (name) { ${names.map(n => `case ${JSON.stringify(n)}: ${n} = value; break;`).join(' ')} } }`;
  return new Function(...names, `"use strict"; return { value: (${source}), set: ${setter} };`)(...names.map(n => scope[n]));
}
const spy = (impl = () => undefined) => { const calls = []; const fn = (...args) => { calls.push(args); return impl(...args); }; fn.calls = calls; return fn; };
const tick = () => new Promise(resolve => setImmediate(resolve));

// ---- cov7-01 ---------------------------------------------------------------------------------------------------------
test('cov7-01 ⇧⌘⌫ archive skips pinned and working sessions before preventDefault (official yh / local archiveShortcut)', async () => {
  // (a) shared-16 yh: the focused row, then isArchived / isPinned / isWorking (and an agent-owned row another account
  // started) return before o.preventDefault(), so the chord falls through to the page untouched.
  const shared16 = official('shared-16-B0xHzPjj.js');
  once(shared16, [
    'u.isArchived||u.isPinned||u.isWorking',
    'if(!l||!u||u.isArchived||u.isPinned||u.isWorking||u.isAgentOwned&&!of(u.startedByAccountId,t?.uuid))return;o.preventDefault();',
    'if(c===-1||s[c].getAttribute("data-selected")!=="focused")return;',
    'Mn.getState().selectedKeys.size>0',
    'function Th(e){if(e.key!=="Backspace"||!e.shiftKey||e.altKey)return!1;',
  ]);

  // (b) local: the deciding line, then the handler itself cut out of source-sidebar.jsx and run.
  const sidebar = local('src/source-sidebar.jsx');
  once(sidebar, ['    if (!keys.includes(current) || !session || sessionArchived(session) || sessionMetadata[current]?.pinned || state.active?.[current] || sessionState(session, state) === "working") return;\n    event.preventDefault();\n']);
  const handler = sliceBlock(sidebar, '  archiveShortcut.current = (event) => {', '(event)');
  // Local rows are never agent-owned (sidebar-sections-layout row facts), so yh's isAgentOwned clause has nothing to act on.
  once(local('src/sidebar-sections-layout.mjs'), ['isAgentOwned: false, startedByAccountId: undefined,']);

  const run = ({ session = { id: 's1', title: 'One' }, metadata = {}, state = {} } = {}) => {
    const onSessionAction = spy(() => Promise.resolve());
    const onNew = spy();
    const clicked = [];
    const rows = ['s0', 's1', 's2'];
    const scope = {
      archiveChord, archiveBlockedByField, archiveNeighbour, sessionArchived, sessionState,
      document: { activeElement: null, querySelector: () => null, getElementById: () => null },
      CSS: { escape: value => value },
      mode: 'code', section: null, onSessionAction, current: 's1', onNew, notifyError: spy(),
      archiveInFlight: { current: false }, selectionRef: { current: { selectedKeys: new Set() } },
      navRef: { current: {
        querySelectorAll: () => rows.map(key => ({ getAttribute: () => key })),
        querySelector: selector => ({ isConnected: true, scrollIntoView() {}, click() { clicked.push(selector); } }),
      } },
      sessionById: new Map([[session.id, session]]), sessionMetadata: metadata, state,
    };
    const event = { key: 'Backspace', shiftKey: true, metaKey: true, ctrlKey: false, altKey: false, repeat: false,
      defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    evaluate(handler, scope).value(event);
    return { event, onSessionAction, clicked };
  };

  const plain = run();
  assert.equal(plain.event.defaultPrevented, true, 'an ordinary session takes the chord');
  assert.deepEqual(plain.onSessionAction.calls.map(([action, session, options]) => [action, session.id, options]), [['archive', 's1', { keepView: true }]]);
  await tick();
  assert.deepEqual(plain.clicked, ['.source-session-row[data-row-key="s2"] [data-row-main-button]'], 'then the next row opens (Zm)');

  for (const [label, input] of [
    ['pinned (isPinned)', { metadata: { s1: { pinned: true } } }],
    ['an active turn (isWorking)', { state: { active: { s1: true } } }],
    ['a working status (isWorking)', { session: { id: 's1', status: { type: 'active' } } }],
    ['a running live status (isWorking)', { session: { id: 's1', liveStatus: 'running' } }],
    ['already archived (isArchived)', { session: { id: 's1', archived: true } }],
  ]) {
    const result = run(input);
    assert.equal(result.event.defaultPrevented, false, `${label}: the key is not consumed`);
    assert.equal(result.onSessionAction.calls.length, 0, `${label}: nothing is archived`);
  }
});

// ---- sidebar-14 ------------------------------------------------------------------------------------------------------
test('sidebar-14 Code nav row reads "Routines": the Scheduled rename and (Was Routines) only exist behind GrowthBook gates', () => {
  // (a) shared-21 cR: n = Bm() = shared-18 UL = shared-16 Yo = GrowthBook "claude_ai_unified_routines" (shared-25 Zs:
  // .on, off when the feature is absent). With it off, the Code "scheduled" row is relabelled eR.routines ("Routines"),
  // and the nav skeleton uses jU (also Routines). Only with it on does the row read "Scheduled", and XX's
  // showRoutines (cai_fizzy_nest through shared-25 ec, which is false without the condition e&&t&&r = Code, the
  // unified gate and an organization uuid) puts "Routines" back until the first click (routines-renamed-on-click).
  const shared21 = official('shared-21-IP-SVetq.js');
  once(shared21, [
    'function cR(){let e=Q(),t=Za(),n=Bm(),',
    'r.id==="scheduled"&&t==="code"&&!n&&(f=e.formatMessage(eR.routines))',
    'scheduled:{defaultMessage:"Scheduled",id:"cc+3C6KB4m"}',
    'jU={scheduled:{label:OU.routines}}', 'let a=e==="code"&&!n?jU[r]:void 0',
    'var JX="cai_fizzy_nest",YX="scheduled:routines-renamed-on-click";function XX(e){let t=Bm(),n=rt()?.activeOrganization?.uuid,r=mc(n),i=se(JX,e&&t&&r)',
    'showRoutines:i&&!a', 'R=XX(n==="code")', 'children:R.showRoutines?_(Z,{...tR}):e.label', 'tR=eR.routines',
    'ir as Bm', 'Nh as se',
  ]);
  assert.equal(count(shared21, 'routines:{defaultMessage:"Routines",id:"Dbc6XaCcol"}'), 2);
  assert.equal(count(shared21, 'Was Routines'), 0, 'no (Was Routines) suffix on the nav row');
  once(official('shared-18-D4XxL6Tg.js'), ['UL as ir', 'function UL(){return cg()}', 'ki as cg']);
  once(official('shared-16-B0xHzPjj.js'), ['Yo as ki', 'var Jo="claude_ai_unified_routines";function Yo(){return D(Jo)}', 'Th as D']);
  const shared25 = official('shared-25-DP8p7i1Z.js');
  once(shared25, ['Zs as Th', 'function Zs(e){return Rs(I(e)).on}', 'ec as Nh', 'function ec(e,t){let n=ks();return!t||!n?.growthbook?!1:As(n,I(e)).on}']);
  // The only "(Was Routines)" string is the scheduled-tasks page title elsewhere, not this row.
  once(official('c1ae93753-CcL9PNI4.js'), ['defaultMessage:"Scheduled tasks (Was Routines)",id:"xtr647M+er"']);

  // (b) local: the Code rows are fixed (the gates-off branch); "routines" is labelled Routines and rendered via t().
  const sidebar = local('src/source-sidebar.jsx');
  const head = 'const primaryRows = mode === \'code\'';
  assert.equal(count(sidebar, head), 1);
  const at = sidebar.indexOf(head) + 'const primaryRows = '.length;
  const rowsOf = evaluate(`(mode) => ${sidebar.slice(at, sidebar.indexOf(';\n', at))}`, {}).value;
  const label = (mode, key) => rowsOf(mode).find(row => row[2] === key)?.[0];
  assert.equal(label('code', 'routines'), 'Routines');
  assert.equal(label('cowork', 'routines'), 'Scheduled', 'the other mode keeps its own label');
  once(sidebar, ["{mode === 'code' ? <span className=\"flex min-w-0 flex-1 items-center\"><span>{t(label)}</span>"]);
  for (const text of ['Was Routines', 'routines-renamed-on-click', 'cai_fizzy_nest', 'claude_ai_unified_routines'])
    assert.equal(count(sidebar, text), 0, text);
  setLocale(DEFAULT_LOCALE);
  assert.equal(t('Routines'), 'Routines');
});

// ---- files-01 --------------------------------------------------------------------------------------------------------
test('files-01 the Files pane opens .html / .htm on the source (official FilePane defaultView / local SourceSessionFileViewer)', () => {
  // (a) cccc2cf0a FilePane passes defaultView:"source" for Rr = shared-28 Nk = /\.html?$/i; the viewer (cd2efac6e)
  // defaults to "preview" and starts on the source when er (line, find query or defaultView "source") holds.
  const pane = official('cccc2cf0a-B0D--VZp.js');
  once(pane, ['presentation:o?"reading":"pane",defaultView:Rr.test(w.path)?"source":void 0', 'Ln as Rr']);
  const shared28 = official('shared-28-DcgD7xXH.js');
  once(shared28, ['Nk=/\\.html?$/i,', 'Nk as Ln']);
  once(official('cd2efac6e-C1jvGOgh.js'), ['defaultView:k="preview"', 'er=o!==void 0||!!f||k==="source"', '[mr,vr]=n(er||or?.source===!0)']);
  const officialHtml = new Function(`return ${shared28.match(/Nk=(\/\\\.html\?\$\/i),/)[1]};`)();

  // (b) local: SourceSessionFileViewer's props literal, cut out and run; then the sourceFirst lines it feeds.
  const viewer = local('src/source-file-viewer.jsx');
  const propsLiteral = sliceBlock(viewer, 'export function SourceSessionFileViewer({ file, scopeKey, sessionId, onSaveFile, ...props }) {\n  props = {');
  const propsFor = (filePath, props = {}) => evaluate(propsLiteral, { file: { path: filePath }, sessionId: 's1', props }).value;
  for (const filePath of ['site/index.html', 'A.HTM', 'page.htm', 'notes.md', 'index.html.bak', 'x.xhtml', 'html', 'view.svg']) {
    const expected = officialHtml.test(filePath) ? 'source' : undefined;
    assert.equal(propsFor(filePath).defaultView, expected, filePath);
  }
  assert.equal(propsFor('site/index.html').defaultView, 'source');
  assert.equal(propsFor('notes.md').defaultView, undefined);
  once(viewer, [
    '  const sourceFirst = line != null || defaultView === "source";\n',
    '  const [localShowSource, setShowSource] = useState(() => sourceFirst || !!readFileView(memoryKey)?.source);\n',
    '    if (previewable) setShowSource(sourceFirst);\n',
  ]);
  // The only caller (the Files pane in source-session.jsx) does not pass its own defaultView, so ...props cannot undo it.
  const session = local('src/source-session.jsx');
  assert.equal(count(session, '<SourceSessionFileViewer'), 1);
  const callStart = session.indexOf('return <SourceSessionFileViewer');
  const call = session.slice(callStart, session.indexOf('/>;', callStart));
  assert.ok(call.length > 0 && !call.includes('defaultView'), 'the Files pane caller leaves defaultView to the wrapper');
});

// ---- files-04 --------------------------------------------------------------------------------------------------------
test('files-04 Create file switches to the source after a successful write (official Ok → vr(!0) / local saved → viewSource)', async () => {
  // (a) cd2efac6e Xm: createSessionFile → no result: the "Couldn’t create" toast; Ok: vr(!0) (the source view setter of
  // [mr,vr]); Denied: Im() (focus back to the viewer); then Lm() re-reads. shared-0 hb: Ok="ok", Conflict, Denied.
  const viewerChunk = official('cd2efac6e-C1jvGOgh.js');
  once(viewerChunk, [
    'Wm=O?.createSessionFile', 'let e=await Wm(ou,i).catch(()=>void 0);if(!e){',
    'e.status===le.Ok&&vr(!0),e.status===le.Denied&&Im(),await Lm()',
    u('defaultMessage:"Couldn’t create {name}. You can select Create file again or ask Claude to create it.",id:"MsGSAy6idq"'),
    '[mr,vr]=n(er||or?.source===!0)', 'jg as le',
  ]);
  once(official('shared-0-ByI5P0CP.js'), ['hb=function(e){return e.Ok="ok",e.Conflict="conflict",e.Denied="denied",e}({})', 'hb as jg']);

  // (b) local, link by link: source-session.jsx → file:save → file-editor.cjs writeFile ("saved" is official "ok") →
  // the viewer's onCreateFile wrapper (viewSource on saved) → the card's create (toast on failure, else re-read).
  once(local('src/source-session.jsx'), ['onCreateFile: sessionId ? () => call("file:save", { cwd, relative: preview.path, text: "", expectedHash: null }) : null,']);
  once(local('electron/main.cjs'), ['const { readEditableFile, writeFile: writeEditedFile } = require("./file-editor.cjs");',
    '      case "file:save":\n        return writeEditedFile(p.cwd || config.cwd, p.relative, p.text, p.expectedHash);\n']);
  const { writeFile } = require('../electron/file-editor.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'r4a-files-04-'));
  try {
    assert.equal((await writeFile(root, 'missing.txt', '', null)).status, 'saved', 'a missing file in an existing parent is created');
    assert.equal(fs.readFileSync(path.join(root, 'missing.txt'), 'utf8'), '');
    assert.equal((await writeFile(root, 'missing.txt', '', null)).status, 'conflict', 'a second create finds the file');
    assert.equal((await writeFile(root, '../outside.txt', '', null)).status, 'denied');
    assert.equal((await writeFile(root, 'no-such-dir/new.txt', '', null)).status, 'denied', 'no parent folder is made');
    assert.equal(fs.existsSync(path.join(root, 'no-such-dir')), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }

  const viewer = local('src/source-file-viewer.jsx');
  once(viewer, ['  const viewSource = () => { setShowSource(true); onViewModeChange?.("source"); };\n']);
  const viewSourceSrc = sliceBlock(viewer, '  const viewSource = () => {', '()');
  const wrapper = sliceBlock(viewer, '    onCreateFile: cardActions.onCreateFile ? async () => {', 'async');
  const createSrc = sliceBlock(viewer, '  const create = async () => {', 'async');
  for (const [status, switches] of [['saved', true], ['conflict', false], ['denied', false], ['failed', false], [undefined, false]]) {
    const setShowSource = spy(), onViewModeChange = spy();
    const viewSource = evaluate(viewSourceSrc, { setShowSource, onViewModeChange }).value;
    const result = status === undefined ? undefined : { status };
    const onCreateFile = evaluate(wrapper, { cardActions: { onCreateFile: async () => result }, viewSource }).value;
    assert.equal(await onCreateFile(), result);
    assert.deepEqual(setShowSource.calls, switches ? [[true]] : [], `${status}: source view`);
    assert.deepEqual(onViewModeChange.calls, switches ? [['source']] : [], `${status}: controlled view mode`);
  }
  // The card around it: no result, a throw or "failed" is the toast and no re-read; anything else re-reads (Lm).
  for (const [outcome, toasted] of [[{ status: 'saved' }, false], [{ status: 'denied' }, false], [{ status: 'conflict' }, false],
    [{ status: 'failed' }, true], [undefined, true], ['throw', true]]) {
    const add = spy(), retry = spy(async () => {});
    const create = evaluate(createSrc, {
      cardActions: { onCreateFile: async () => { if (outcome === 'throw') throw new Error('x'); return outcome; } },
      toasts: { add }, createFileFailedMessage: name => `Couldn’t create ${name}.`, name: 'missing.txt', retry,
    }).value;
    await create();
    assert.equal(add.calls.length, toasted ? 1 : 0, `${JSON.stringify(outcome)}: toast`);
    assert.equal(retry.calls.length, toasted ? 0 : 1, `${JSON.stringify(outcome)}: re-read`);
  }
});

// ---- files-09 --------------------------------------------------------------------------------------------------------
test('files-09 the first load expands the root single-folder chain (official Xb, 16 levels, gate default on / local singleChildFolderChain)', async () => {
  // (a) cccc2cf0a: Yb() = __gb__464349239 ?? true (shared-0 no: a forced or evaluated feature, else undefined, so the
  // gate is on by default); Xb walks at most Jb = 16 single-directory, non-link levels; the first-load effect runs it
  // once per (c,l) key while the session's expanded list is still undefined (q), writing only if still undefined.
  const pane = official('cccc2cf0a-B0D--VZp.js');
  once(pane, [
    'var qb="__gb__464349239",Jb=16;function Yb(){return le(qb)??!0}',
    'async function Xb(e,t){let n=[],r=e;for(;n.length<Jb;){let e;try{e=await t(r)}catch{break}let i=e.length===1?e[0]:void 0;if(!i?.isDirectory||i.link!==void 0)break;n.push(i.absPath),r=i.absPath}return n}',
    'G===null||e.scope==="ssh"||e.scope==="wsl"||!Yb()||Xb(t,t=>H.fetchQuery(p_(e,t))).then(e=>{e.length>0&&n(G.getState().fileBrowserExpandedBySession[p])&&f(p,e)})',
    'q=m===void 0', '!de||fe.current===e||(fe.current=e,q&&ce(l,t=>t===void 0&&fe.current===e))', 'gy as le',
  ]);
  once(official('shared-0-ByI5P0CP.js'), ['no as gy', 'function no(e){let t=ro(e);return t===void 0?Qa(e):t}']);
  const officialXb = evaluate(sliceBlock(pane, 'async function Xb(e,t){', 'async'), { Jb: 16 }).value;

  // (b) local: singleChildFolderChain cut out of file-tree-row-model.mjs (its module graph reaches .jsx through
  // view-tabs, which only Vite SSR loads) and run beside the official Xb on the same fixture trees.
  const model = local('src/file-tree-row-model.mjs');
  once(model, ['export const SINGLE_CHILD_EXPAND_LIMIT = 16;\n']);
  const chainSrc = sliceBlock(model, 'export async function singleChildFolderChain(path, list, limit = SINGLE_CHILD_EXPAND_LIMIT) {', 'async');
  const singleChildFolderChain = evaluate(chainSrc, { SINGLE_CHILD_EXPAND_LIMIT: 16 }).value;
  const dir = (p, extra = {}) => ({ p, directory: true, ...extra });
  const file = p => ({ p, directory: false });
  const deep = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i ? Array.from({ length: i }, (_, j) => `d${j}`).join('/') : '', [dir(Array.from({ length: i + 1 }, (_, j) => `d${j}`).join('/'))]]));
  const trees = {
    chain: { '': [dir('a')], a: [dir('a/b')], 'a/b': [dir('a/b/c')], 'a/b/c': [file('a/b/c/x.txt'), file('a/b/c/y.txt')] },
    'two entries': { '': [dir('a'), dir('b')] },
    'a file': { '': [file('README.md')] },
    'a link': { '': [dir('lnk', { link: { state: 'ok' } })] },
    'empty root': { '': [] },
    'read error below': { '': [dir('a')], a: 'throw' },
    'link below': { '': [dir('a')], a: [dir('a/l', { link: { state: 'external' } })] },
    deep,
  };
  const lister = (tree, shape) => async at => {
    const entries = tree[at];
    if (entries === 'throw' || entries === undefined) throw new Error(`no ${at}`);
    return entries.map(e => shape === 'official' ? { name: e.p, absPath: e.p, isDirectory: e.directory, link: e.link } : { name: e.p, path: e.p, directory: e.directory, link: e.link });
  };
  for (const [name, tree] of Object.entries(trees)) {
    const theirs = await officialXb('', lister(tree, 'official'));
    const ours = await singleChildFolderChain('', lister(tree, 'local'));
    assert.deepEqual(ours, theirs, name);
  }
  assert.deepEqual(await singleChildFolderChain('', lister(trees.chain, 'local')), ['a', 'a/b', 'a/b/c']);
  assert.equal((await singleChildFolderChain('', lister(deep, 'local'))).length, 16, 'Jb = 16 levels');

  // The first-load step in source-session.jsx (the root listing's .then), cut out and run: only while the expanded
  // list is still null, and the write keeps a list that arrived meanwhile (official t===void 0).
  const session = local('src/source-session.jsx');
  const marker = '        // 2.37337.1 cb/Fv: the first opening also expands a single-directory chain.\n';
  once(session, [marker, '          if (live) setExpandedList(list => Array.isArray(list) ? list : chain);\n']);
  const thenAt = session.lastIndexOf('      .then(async (data) => {', session.indexOf(marker));
  const firstLoad = sliceBlock(session.slice(thenAt), '      .then(async (data) => {', 'async');
  const root = trees.chain[''].map(e => ({ name: e.p, path: e.p, directory: true }));
  const runFirstLoad = async (expandedList, { dropAfterRead = false } = {}) => {
    const setEntries = spy(), setExpandedList = spy();
    const call = spy(async (action, { relative }) => lister(trees.chain, 'local')(relative));
    const bound = evaluate(firstLoad, { live: true, setEntries, expandedList, singleChildFolderChain, call, cwd: '/work', setExpandedList });
    const running = bound.value(root);
    if (dropAfterRead) bound.set('live', false);
    await running;
    return { setEntries, setExpandedList, call };
  };
  const fresh = await runFirstLoad(null);
  assert.deepEqual(fresh.setEntries.calls, [[root]]);
  assert.deepEqual(fresh.call.calls.map(([action, args]) => [action, args.cwd, args.relative]), [['files', '/work', 'a'], ['files', '/work', 'a/b'], ['files', '/work', 'a/b/c']], 'the root itself is not listed again');
  assert.equal(fresh.setExpandedList.calls.length, 1);
  const update = fresh.setExpandedList.calls[0][0];
  assert.deepEqual(update(null), ['a', 'a/b', 'a/b/c'], 'still unset: the chain is written');
  assert.deepEqual(update(['other']), ['other'], 'set meanwhile: it wins (t===void 0)');
  const known = await runFirstLoad(['a']);
  assert.equal(known.setExpandedList.calls.length, 0, 'an existing expanded list is never auto-expanded again');
  assert.equal(known.call.calls.length, 0);
  const dropped = await runFirstLoad(null, { dropAfterRead: true });
  assert.equal(dropped.setExpandedList.calls.length, 0, 'a superseded load writes nothing');
  // Host adapter: an empty chain writes [] where Xb's caller writes nothing (e.length>0). Both leave every folder
  // closed; locally [] also switches the tree to the controlled expanded list the hand-expand chain needs.
  const emptyCall = spy(async () => []);
  const emptyWrite = spy();
  await evaluate(firstLoad, { live: true, setEntries: spy(), expandedList: null, singleChildFolderChain, call: emptyCall, cwd: '/work', setExpandedList: emptyWrite }).value([]);
  assert.deepEqual(emptyWrite.calls[0][0](null), []);
});

// ---- the official 2.42304.0 cc3bc2027 search engine, evaluated from the chunk (files-21, files-24) -----------------
// cc3bc2027 imports two bindings: e = shared-52 Pz (regex escape, evaluated from its chunk too) and t = shared-15 ca
// (the search case fold), supplied by the generated copy normalizeSearchText. Exports: r = Ki (line-break
// normaliser S), l = V (scan m), s = qi (compile p), c = Vi (plain whole-text search r).
function officialSearchEngine() {
  const chunk = official('cc3bc2027-C49Ef-ei.js');
  const imports = 'import{Et as e}from"./shared-52-DGviI8xb.js";import{B as t}from"./shared-15-Cc9xvKlF.js";';
  assert.ok(chunk.startsWith(imports));
  const exportsAt = chunk.lastIndexOf('export{');
  assert.equal(chunk.slice(exportsAt), 'export{i as a,r as c,h as d,g as f,x as i,m as l,v as n,n as o,c as p,S as r,p as s,_ as t,s as u};');
  const shared52 = official('shared-52-DGviI8xb.js');
  once(shared52, ['function Pz(e){return e.replace(/[\\\\^$.*+?()[\\]{}|]/g,"\\\\$&")}', 'Pz as Et']);
  once(official('shared-15-Cc9xvKlF.js'), ['ca as B']);
  const escape = evaluate(sliceBlock(shared52, 'function Pz(e){', 'function'), {}).value;
  const body = chunk.slice(imports.length, exportsAt);
  return new Function('e', 't', `${body}\nreturn { lineBreaks: S, scan: m, compile: p, plain: r };`)(escape, normalizeSearchText);
}
// cd2efac6e ns: no option → Vi(rn(contents), query) on the whole text; any option → V(contents, qi(query, options)).
function officialFindLines(engine, contents, query, options) {
  const plain = !options.matchCase && !options.wholeWord && !options.regexp;
  if (plain) return engine.plain(normalizeSearchText(contents), query);
  const matcher = engine.compile(query, options);
  return matcher === null ? [] : engine.scan(contents, matcher).lines;
}
const localFindLines = (text, query, options) => searchInText(text, query, options).matches.map(match => match.line);

// ---- files-21 --------------------------------------------------------------------------------------------------------
test('files-21 the skip of the truncation note / sr-only headings lives only in the gated document find; local find reads the file text', () => {
  // (a) cd2efac6e: ru() is the truncation note with data-find-omitted (shown when q.truncated); the DOM find bc/xc
  // excludes the document rail and sr-only headings and, through shared-15's walker, data-find-omitted. That find only
  // runs when yd = yr() (c51596d2b je: __gb__802676274, on unless GrowthBook answers off) && pn (presentation is not
  // "pane") && markdown && CSS highlights. The Files pane passes presentation o?"reading":"pane" with o = wf() =
  // c19e90103 fy = GrowthBook __gb__1590565993 (shared-25 Zs .on: off when absent), so by default the pane is "pane"
  // and find runs over the file contents (ns contents xd), where neither the note nor a rail heading exists.
  const chunk = official('cd2efac6e-C1jvGOgh.js');
  once(chunk, [
    'function ru(){return c("p",{className:"text-footnote text-muted-as-secondary px-0.75","data-find-omitted":"",children:c(R,{defaultMessage:"This preview may be missing its end.",id:"JUgzkwe7Bj"})})}',
    '"data-find-omitted":""', 'Sc=q?.truncated===!0',
    'var mc=".epitaxy-document-column",hc=".epitaxy-document-rail",gc=\':is(h1, h2, h3, h4, h5, h6).sr-only:not([class*="not-sr-only"])\'',
    'f=new Set(e.querySelectorAll(`${hc}, ${gc}`))', 'm=ln(e,d,{exclude:f})',
    'yd=yr()&&pn&&Cc==="markdown"&&yc(Z),bd=yd&&J!==null', 'Q=bc({find:ns({contents:bd?void 0:xd,', 'pn=Ne!=="pane"', 'c as yr',
  ]);
  assert.equal(count(chunk, 'Sc&&c(ru,{})'), 3, 'the note follows the html, markdown and text previews');
  once(official('shared-15-Cc9xvKlF.js'), ['else if(i.hasAttribute("data-find-omitted")){if(!i.querySelector(ma)){s=!0;return}n=!1}']);
  once(official('c51596d2b-Dr10h3fs.js'), ['function je(){return K("__gb__802676274")}', 'je as c',
    'function K(e){let t=u(e),n=r(T)?.growthbook,i=x(e),a=n!==void 0&&(n.getFeatures()?.[i]!==void 0||n.getForcedFeatures().has(i));return t||!a}']);
  once(official('cccc2cf0a-B0D--VZp.js'), ['let i=yC(e),a=lC(),o=wf(),', 'presentation:o?"reading":"pane",defaultView:', 'w as wf']);
  once(official('c19e90103-muBq-gyt.js'), ['var dy="__gb__1590565993";function fy(){return I(dy)}', 'fy as w', 'Th as I']);
  once(official('shared-25-DP8p7i1Z.js'), ['Zs as Th', 'function Zs(e){return Rs(I(e)).on}']);

  // (b) local: the viewer's find is searchInText over file.text (the bar opens on the source), it renders no
  // truncation note, rail or sr-only heading, and local Files reads never come back truncated.
  const viewer = local('src/source-file-viewer.jsx');
  once(viewer, [
    '  const searchable = !media && !reason && typeof file.text === "string";\n',
    '  const initialSearch = useMemo(() => searchInText(searchable && find.open ? file.text : "", find.open ? find.query : "", find.options), [find.open, find.query, find.options, searchable, file.text]);\n',
  ]);
  for (const text of ['data-find-omitted', 'This preview may be missing its end.', 'epitaxy-document-rail', 'epitaxy-document-column'])
    assert.equal(count(viewer, text), 0, text);
  assert.equal(count(local('electron/files.cjs'), 'truncated'), 0, 'files.cjs never marks a read truncated');
  // Default path, same contents: the official contents find and the local find give the same lines.
  const engine = officialSearchEngine();
  const markdown = '# Intro\n\nIntro text here.\n\n## Usage\n\nSee intro.\n';
  for (const [query, options] of [['intro', DEFAULT_SEARCH_OPTIONS], ['Intro', { ...DEFAULT_SEARCH_OPTIONS, matchCase: true }], ['missing its end', DEFAULT_SEARCH_OPTIONS]])
    assert.deepEqual(localFindLines(markdown, query, options), officialFindLines(engine, markdown, query, options), query);
  assert.deepEqual(localFindLines(markdown, 'intro', DEFAULT_SEARCH_OPTIONS), [1, 3, 7]);
  assert.deepEqual(localFindLines(markdown, 'missing its end', DEFAULT_SEARCH_OPTIONS), []);
});

// ---- files-24 --------------------------------------------------------------------------------------------------------
test('files-24 find in the editable source matches on normalised line breaks (official Ki(contents).text / local searchInText)', () => {
  // (a) cd2efac6e: xd = Uc (an editable source view: writable, loaded, no preview, not binary) ? Ki(contents).text
  // : contents, where Ki = cc3bc2027 S: every break becomes the dominant one (CRLF kept when it dominates; the scan
  // then drops each line's trailing \r).
  const chunk = official('cd2efac6e-C1jvGOgh.js');
  once(chunk, [
    'xd=d(()=>Uc&&q?Ki(q.contents).text:q?.contents,[Uc,q])', 'Uc=ms&&!!q&&J===null&&!_c', 'r as Ki', 'B as rn',
    'E=!T.matchCase&&!T.wholeWord&&!T.regexp,te=d(()=>o&&E&&e?rn(e):"",[o,E,e]),D=d(()=>o&&!E?qi(l,T):null,[o,E,l,T]),O=d(()=>E?{lines:Vi(te,l),hasLongLines:!1}:D!==null&&e?V(e,D):Jo,',
    'c as Vi', 's as qi', 'l as V',
  ]);
  const search = official('cc3bc2027-C49Ef-ei.js');
  once(search, ['function S(e){if(!e.includes("\\r"))return{text:e,lineBreak:`\n`};', 'function x(e,t){return e.replace(/\\r\\n|\\r|\\n/g,t)}',
    'c=e.slice(u,i>u&&e[i-1]==="\\r"?i-1:i)']);
  const engine = officialSearchEngine();
  assert.deepEqual(engine.lineBreaks('a\r\nb\r\n'), { text: 'a\r\nb\r\n', lineBreak: '\r\n' });
  assert.deepEqual(engine.lineBreaks('a\r\nb\nc\r\n'), { text: 'a\r\nb\r\nc\r\n', lineBreak: '\r\n' });
  assert.deepEqual(engine.lineBreaks('a\rb\nc\n'), { text: 'a\nb\nc\n', lineBreak: '\n' });

  // (b) local: searchInText always folds \r\n and \r to \n before the same scan; in the editable view that gives the
  // official lines for every text and option set below.
  once(local('src/file-find-model.mjs'), ["  const normalized = text.replace(/\\r\\n?/g, '\\n');\n  const found = scanSearch(normalized, matcher, previous?.found, now);\n"]);
  const texts = {
    crlf: 'alpha beta\r\nBeta gamma \r\n\r\nbeta end\r\n',
    'mostly crlf': 'one beta\r\ntwo\nthree beta\r\nfour beta\r\n',
    'mostly lf': 'beta\nbeta\r\nx\ny beta\n',
    'lone cr': 'beta one\rtwo beta\rbeta\r',
    mixed: 'a beta\rb\nbeta c\r\nd',
    lf: 'beta\n\nbeta beta\n',
  };
  const queries = [
    ['beta', {}], ['Beta', { matchCase: true }], ['beta', { wholeWord: true }], ['beta$', { regexp: true }],
    ['\\s$', { regexp: true }], ['a\\s', { regexp: true }], ['\\r', { regexp: true }], ['^$', { regexp: true }], ['.$', { regexp: true }],
  ];
  for (const [name, text] of Object.entries(texts)) {
    const editable = engine.lineBreaks(text).text;
    for (const [query, extra] of queries) {
      const options = { ...DEFAULT_SEARCH_OPTIONS, ...extra };
      assert.deepEqual(localFindLines(text, query, options), officialFindLines(engine, editable, query, options), `${name} / ${query} ${JSON.stringify(extra)}`);
    }
  }
  assert.deepEqual(localFindLines(texts.crlf, 'beta', DEFAULT_SEARCH_OPTIONS), [1, 2, 4]);
  assert.deepEqual(localFindLines(texts.crlf, 'beta$', { ...DEFAULT_SEARCH_OPTIONS, regexp: true }), [1]);
  // Host difference (read-only view, outside this item): the official read-only find scans the raw contents, so a
  // lone-CR file is one line there; local normalises in every view.
  const raw = texts['lone cr'];
  assert.deepEqual(officialFindLines(engine, raw, 'beta', DEFAULT_SEARCH_OPTIONS), [1, 1, 1]);
  assert.deepEqual(localFindLines(raw, 'beta', DEFAULT_SEARCH_OPTIONS), [1, 2, 3]);
});
