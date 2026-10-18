// R4a test lock (moved from tests-r4a/ at the R4g/R4h gate) for the R3 audit group A-diffgit-terminal (official 2.42304.0): diffgit-06, diffgit-07, diffgit-08,
// terminal-02, terminal-05, terminal-06, terminal-16. Each test has (a) the official signature counts read from the
// installed 2.42304.0 chunks and (b) the local side: model behaviour where a model exists, otherwise the source line
// that decides the behaviour. diffgit-08 local (R4g-files FV2) now asserts the ported decision plus the documented
// host adapter (the per-file body keeps the 5000-line limit), and since R4i-files FI2 the live Qe / Fe inputs; terminal-05 was a divergence until R4e-small gated attach on the archived session. No vite, no GUI, no network: model imports plus file reads only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setLocale, DEFAULT_LOCALE, LOCALE_CODES, t } from '../electron/i18n/index.mjs';
import { createTileLayoutStore, sanitizeStoreState, emptyStoreState, TILE_STORE_KEY } from '../src/tile-layout-store.mjs';
import { changesMenuSections } from '../src/changes-menu-model.mjs';
import { DIFF_FILE_LIST_WIDTH, LARGE_DIFF_FILES, LARGE_DIFF_LINES, LARGE_DIFF_LINES_SINGLE_LIST, isLargeDiff } from '../src/diff-file-list-model.mjs';
import { handleTerminalNavigation, POSIX_TERMINAL_KEYS, POWERSHELL_TERMINAL_KEYS, terminalEditingKeys } from '../src/terminal-navigation.mjs';
import { promptAfterInput, pickRunTab, isTerminalReply } from '../src/code-block-run-model.mjs';
import { createTerminalStore } from '../src/terminal-store.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const cache = new Map();
const read = file => { if (!cache.has(file)) cache.set(file, fs.readFileSync(file, 'utf8')); return cache.get(file); };
const official = name => read(path.join(reference, 'ion-dist/assets/v1', name));
const officialMain = name => read(path.join(reference, 'asar/.vite/build', name));
const local = rel => read(path.join(app, rel));
const count = (text, needle) => text.split(needle).length - 1;
const once = (text, needles) => { for (const needle of needles) assert.equal(count(text, needle), 1, needle); };
// The body of a top-level function in a local source file, from its declaration to the first line that is just "}".
const fnBody = (text, head) => {
  const start = text.indexOf(head);
  assert.ok(start >= 0, head);
  const end = text.indexOf('\n}\n', start);
  return text.slice(start, end < 0 ? undefined : end + 2);
};
const memoryStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return { data, getItem: key => (data.has(key) ? data.get(key) : null), setItem: (key, value) => { data.set(key, String(value)); }, removeItem: key => { data.delete(key); } };
};

// ---- diffgit-06 ------------------------------------------------------------------------------------------------------

test('diffgit-06 official: the Changed files column moves to inline-start only behind GrowthBook __gb__2446046106 (default off)', () => {
  const tree = official('c227f4d5e-Ba-r--Rl.js');
  once(tree, [
    'function bx(){return we("__gb__2446046106")}',
    // Ex: o = the gate; s = drag sign (1 in LTR while off); c = the handle side; onRight goes back to the column's host.
    'o=bx(),s=o===(k()==="rtl")?1:-1,c=o?"inline-start":"inline-end"',
    'onRight:o}}',
    'Ex as Kl',
    'ux={DEFAULT:240,MIN:160,MAX:640}',
  ]);
  // we = shared-25 Th = Zs: the GrowthBook feature's .on (an unknown feature evaluates off).
  assert.match(tree, /import\{[^}]*\bTh as we\b[^}]*\}from"\.\/shared-25-DP8p7i1Z\.js"/);
  const shared = official('shared-25-DP8p7i1Z.js');
  once(shared, ['function Zs(e){return Rs(I(e)).on}', 'Zs as Th']);
  assert.equal(count(official('c227f4d5e-Ba-r--Rl.js') + official('c44d00c7f-zUAG9XyS.js') + official('cccc2cf0a-B0D--VZp.js'), '__gb__2446046106'), 1);
  // c44d00c7f Al (the Changes diff view): only onRight reverses the row and swaps the column's border to border-s.
  const view = official('c44d00c7f-zUAG9XyS.js');
  assert.match(view, /import\{[^}]*\bKl as Ne\b[^}]*\}from"\.\/c227f4d5e-Ba-r--Rl\.js"/);
  once(view, [
    'edgeHandleProps:Et,onRight:Dt}=Ne({width:U,onWidthChange:Ce,defaultWidth:Se,onShownChange:we,shown:_t})',
    'className:w("flex flex-1 min-h-0",Dt&&"flex-row-reverse",ye)',
    'className:w("relative shrink-0 flex flex-col min-h-0",xe&&(Dt?"border-s":"border-e"))',
  ]);
});

test('diffgit-06 local: the column is fixed at the start with an end border, a forward drag widens it (the gate-off form)', () => {
  const diff = local('src/source-diff.jsx');
  const layout = fnBody(diff, 'function ChangesFileLayout(');
  // No local preference or gate for the column side.
  assert.equal(count(local('src/source-diff.jsx') + local('src/source-session.jsx') + local('src/tile-layout-store.mjs') + local('src/main.jsx'), '2446046106'), 0);
  assert.doesNotMatch(layout, /row-reverse|onRight|inline-start/);
  // DOM order [column | edge | main] in a plain flex row (off: no flex-row-reverse), the column bordered at its end.
  once(layout, [
    // R3-files made the layout root the focusable diff pane body (outline-none, data-diff-pane-body, tabIndex -1).
    'return <div ref={layoutRef} className="sdiff-changes-layout outline-none" data-diff-pane-body="" tabIndex={-1} data-file-list-shown={shown || undefined} data-resizing={resizing || undefined}>',
    // The column border is now the original's logical class: xe&&(Dt?"border-s":"border-e") with Dt (onRight) off.
    '{columnRendered && <div className="sdiff-file-list relative shrink-0 flex flex-col min-h-0 border-e"',
  ]);
  const column = layout.indexOf('className="sdiff-file-list '), edge = layout.indexOf('className="source-tree-edge sdiff-file-list-edge"'), main = layout.indexOf('className={`sdiff-changes-main');
  assert.ok(column > 0 && column < edge && edge < main, 'column, edge handle, then the diff');
  const css = local('src/source-diff.css');
  once(css, ['.sdiff-changes-layout { position:relative; display:flex; flex:1; min-height:0; min-width:0; }']);
  assert.doesNotMatch(css, /\.sdiff-file-list \{ border-right/, 'the hand-written physical border is gone');
  assert.doesNotMatch(css, /row-reverse|\.sdiff-file-list \{[^}]*border-left/);
  // Off in LTR the official drag sign s is 1: width = start + delta, and the edge handle reveals on a positive drag.
  // The local app ships no right-to-left locale, so k()==="rtl" never holds and s stays 1 (no RTL mirror needed).
  assert.deepEqual([...LOCALE_CODES], ['en-US', 'zh-CN']);
  assert.equal(count(layout, 'const value = startWidth.current + delta;'), 2);
  once(layout, ['onMove: (delta) => setDrag(delta >= MIN / 2 ?', "if (event.key === 'ArrowLeft') value = visibleWidth - step;", "else if (event.key === 'ArrowRight') value = visibleWidth + step;"]);
  assert.deepEqual({ ...DIFF_FILE_LIST_WIDTH }, { DEFAULT: 240, MIN: 160, MAX: 640 });
});

// ---- diffgit-07 ------------------------------------------------------------------------------------------------------

test('diffgit-07 official: file_tree defaults to !__gb__616667399 (true while off) and only a stored boolean overrides it', () => {
  const tree = official('c227f4d5e-Ba-r--Rl.js');
  once(tree, [
    'VS="epitaxy-diff-file-tree"',
    'function GS(){return!we("__gb__220101525")}',
    // qS: the stored value (default null, so nothing is written until set) wins only when it is a boolean.
    'function qS(e,t,n,r){let[i,a]=Bc(e,null);return[r&&typeof i=="boolean"?i:n,H(e=>{a(e),rh({option:t,enabled:e})},[a,t])]}',
    'function ZS(){let e=GS();return qS(VS,"file_tree",!ve("__gb__616667399",e),e)}',
  ]);
  assert.match(tree, /import\{[^}]*\bNh as ve\b[^}]*\}from"\.\/shared-25-DP8p7i1Z\.js"/);
  assert.match(tree, /import\{[^}]*\bfs as Bc\b[^}]*\}from"\.\/shared-28-DcgD7xXH\.js"/);
  // ve = shared-25 Nh = ec: false without GrowthBook or when the second argument is false, else the feature's .on.
  const shared = official('shared-25-DP8p7i1Z.js');
  once(shared, ['function ec(e,t){let n=ks();return!t||!n?.growthbook?!1:As(n,I(e)).on}', 'ec as Nh']);
  // c44d00c7f Al takes it as fileTree, default true.
  once(official('c44d00c7f-zUAG9XyS.js'), ['fileTree:_=!0,groupByKind:y=!1']);
});

test('diffgit-07 local: diffFileTree defaults to true, a stored false is kept, anything not boolean falls back to true', () => {
  assert.equal(emptyStoreState().diffFileTree, true);
  for (const [stored, expected] of [[true, true], [false, false], [undefined, true], [null, true], ['false', true], [0, true], ['yes', true]])
    assert.equal(sanitizeStoreState({ diffFileTree: stored }).diffFileTree, expected, JSON.stringify(stored));
  // Opening the store writes nothing; a toggle persists and a fresh store reads it back.
  const storage = memoryStorage();
  const store = createTileLayoutStore({ storage });
  assert.equal(store.getState().diffFileTree, true);
  assert.equal(storage.getItem(TILE_STORE_KEY), null);
  store.setGlobal({ diffFileTree: false });
  assert.equal(JSON.parse(storage.getItem(TILE_STORE_KEY)).diffFileTree, false);
  assert.equal(createTileLayoutStore({ storage }).getState().diffFileTree, false);
  // Host difference (unobservable here): the tile blob carries the default once anything else is saved, where the official
  // value stays unset. Locally the default is fixed at the gate-off value, so stored true and unset read the same.
  const other = memoryStorage();
  createTileLayoutStore({ storage: other }).setGlobal({ diffShowTree: true });
  assert.equal(JSON.parse(other.getItem(TILE_STORE_KEY)).diffFileTree, true);
  assert.equal(count(local('src/tile-layout-store.mjs'), 'state.diffFileTree = value.diffFileTree !== false;'), 1);
  // The pane reads it with the same default and the Changes settings checkbox toggles it.
  assert.equal(count(local('src/source-session.jsx'), 'const [diffFileTree, setDiffFileTree] = useViewState(diffTree, onDiffTreeChange, "diffFileTree", true);'), 1);
  once(local('src/main.jsx'), ['diffTree={tileId === "changes" ? tileState : null}', 'onDiffTreeChange={tileId === "changes" ? tileStore.setGlobal : null}']);
  const changed = [];
  const item = tree => changesMenuSections({ hasPatch: true, fileList: { tree, onTreeChange: value => changed.push(value) } })
    .find(section => section.key === 'diff-file-list').items.find(entry => entry.value === 'diff-file-tree');
  assert.equal(item(undefined).checked, true);
  assert.equal(item(false).checked, false);
  item(true).onSelect();
  item(false).onSelect();
  assert.deepEqual(changed, [false, true]);
});

// ---- diffgit-08 ------------------------------------------------------------------------------------------------------

// c44d00c7f Al $e, transcribed: He picks the threshold (Rt 20000 / Pt 5000); with patches_withheld absent the >300-file
// heuristic needs fetchFilePatch (Fe) to be defined.
const OFFICIAL_LARGE = { Pt: 5e3, Rt: 2e4, kl: 300, Ol: /(?:^|\n)@@/ };
function officialIsLarge({ files, withheld, fetchFilePatch, He }) {
  const { Pt, Rt, kl, Ol } = OFFICIAL_LARGE;
  let additions = 0, deletions = 0;
  for (const file of files) { additions += file.additions; deletions += file.deletions; }
  const limit = He ? Rt : Pt;
  if (additions + deletions > limit) return true;
  if (withheld !== undefined) return withheld;
  return fetchFilePatch !== undefined && (files.some(file => file.rawFile.changes > 0) && !files.some(file => file.rawFile.patch)
    || files.length > kl && files.some(file => file.rawFile.changes > 0 && !file.rawFile.patch) && !files.some(file => Ol.test(file.rawFile.patch ?? '')));
}
const changed = (additions, deletions, patch = '@@ -1 +1 @@\n-a\n+b\n') => ({ additions, deletions, rawFile: { changes: additions + deletions, patch } });

test('diffgit-08 official: patches_withheld decides first, the >300-file heuristic needs fetchFilePatch, the line limit is He ? 20000 : 5000', () => {
  const view = official('c44d00c7f-zUAG9XyS.js');
  once(view, [
    'Qe=Y?.patches_withheld,$e=u(()=>{let e=He?Rt:Pt;return Ze.additions+Ze.deletions>e?!0:Qe===void 0?Fe!==void 0&&(Z.some(e=>e.rawFile.changes>0)&&!Z.some(e=>e.rawFile.patch)||Z.length>kl&&Z.some(e=>e.rawFile.changes>0&&!e.rawFile.patch)&&!Z.some(e=>Ol.test(e.rawFile.patch??""))):Qe},[Ze,Qe,Fe,Z,He])',
    'Ol=/(?:^|\\n)@@/,kl=300;function Al(',
    '{comparison:Y,carriedOver:X,fetchFileLines:Pe,fetchFilePatch:Fe,repoScope:Le,commits:Re}=J',
    // He: latched !Be && !perFileList; Be = shared-frame Xa (rendered into another window). He also picks the
    // single-list renderer Bs (one st list over every file); the per-file list is the He=false branch. perFileList
    // appears nowhere else in the bundle, so no caller sets it: in the main window He is true and the limit is 20000.
    'Be=be(),Ve=ao(),He=I(!Be&&!q)',
    'perFileList:q=!1}',
    'He?c(Bs,{sessionId:e,tileId:t',
    'import{a as Nt,i as Pt,n as Ft,o as It,r as Lt,t as Rt}from"./cd14a8022-DDLlDKpQ.js"',
  ]);
  assert.match(view, /import\{[^}]*\bbu as be\b[^}]*\}from"\.\/shared-frame-BfjMqbuN\.js"/);
  // No chunk passes perFileList (property names survive minification): the only occurrence is Al's own default. The
  // chunks that reference c44d00c7f (`grep -l c44d00c7f-zUAG9XyS.js` over the 3548 chunks, which also found perFileList
  // in c44d00c7f alone) are listed rather than rescanned, to keep this test cheap.
  assert.equal(count(view, 'perFileList'), 1);
  for (const name of ['c5638815a-D1NXo6h5.js', 'cb61be3a2--wBh7Ql7.js', 'c9f7f3e21-D5Vl7WlB.js', 'ca9ee6f68-DXnzjzft.js', 'cf74bc599-D9NZWRyl.js', 'cccc2cf0a-B0D--VZp.js']) {
    const text = official(name);
    assert.ok(text.includes('c44d00c7f-zUAG9XyS.js'), name);
    assert.equal(count(text, 'perFileList'), 0, name);
  }
  once(official('cd14a8022-DDLlDKpQ.js'), ['var A=5e3,j=2e4,', 'A as i,', 'j as t,']);
  once(official('shared-frame-BfjMqbuN.js'), ['function Xa(){let e=Ya();return e!==void 0&&e!==globalThis.window}', 'Xa as bu']);
  // Main process: only a call that decided about inline patches sends patches_withheld.
  once(officialMain('index.chunk-BAdej_RQ.js'), ['function je(e,t){return e===!0?{}:{patches_withheld:!t}}']);
  // The transcription agrees with the chunk on the cases that matter below.
  const many = Array.from({ length: 301 }, () => ({ additions: 1, deletions: 0, rawFile: { changes: 1, patch: undefined } }));
  assert.equal(officialIsLarge({ files: many, fetchFilePatch: () => {}, He: true }), true);
  assert.equal(officialIsLarge({ files: many, fetchFilePatch: undefined, He: true }), false);
  assert.equal(officialIsLarge({ files: many, withheld: false, fetchFilePatch: () => {}, He: true }), false);
});

test('diffgit-08 local: isLargeDiff is $e branch for branch; patches_withheld reaches it from the payload; the per-file body takes Pt (host adapter)', () => {
  // R4g-files FV2: the decision is ported (line limit, then a boolean Qe, then the no-patch heuristics behind Fe).
  const model = local('src/diff-file-list-model.mjs');
  assert.equal(count(model, 'if (additions + deletions > (singleList ? LARGE_DIFF_LINES_SINGLE_LIST : LARGE_DIFF_LINES)) return true;'), 1);
  assert.equal(count(model, 'if (typeof withheld === "boolean") return withheld;'), 1);
  assert.equal(count(model, 'files.length > LARGE_DIFF_FILES &&'), 1);
  assert.equal(LARGE_DIFF_LINES, OFFICIAL_LARGE.Pt);
  assert.equal(LARGE_DIFF_LINES_SINGLE_LIST, OFFICIAL_LARGE.Rt);
  assert.equal(LARGE_DIFF_FILES, OFFICIAL_LARGE.kl);
  // Wiring: the main process's patches_withheld -> diffPayload -> SourceDiff patchesWithheld (Qe); fetchFilePatch (Fe)
  // is fileActions.fetchFilePatch; He is false because the body is the per-file list in every window.
  assert.equal(count(local('src/diff-context-model.mjs'), "typeof value?.patches_withheld === 'boolean' ? { patchesWithheld: value.patches_withheld }"), 1);
  assert.equal(count(local('src/source-session.jsx'), 'patchesWithheld={diffView.patchesWithheld}'), 1);
  const diff = local('src/source-diff.jsx');
  assert.equal(count(diff, 'const lazyPatches = typeof fileActions?.fetchFilePatch === "function";'), 1);
  assert.equal(count(diff, 'const large = changes && isLargeDiff(entries, { withheld: patchesWithheld, lazyPatches, singleList: false });'), 1);
  // Every branch agrees with the transcription of the chunk.
  const raw = (changes, patch) => ({ additions: changes, deletions: 0, rawFile: { changes, patch } });
  const cases = [
    { files: [changed(4999, 0)] }, { files: [changed(5001, 0)] }, { files: [changed(12000, 0)], He: true }, { files: [changed(20001, 0)], He: true },
    { files: [changed(5001, 0)], withheld: false, fetchFilePatch: () => {} }, { files: [changed(1, 0)], withheld: true }, { files: [changed(1, 0)], withheld: false },
    { files: [raw(2, undefined)], fetchFilePatch: () => {} }, { files: [raw(2, undefined)] },
    { files: Array.from({ length: 301 }, () => raw(1, undefined)), fetchFilePatch: () => {} },
    { files: [...Array.from({ length: 300 }, () => raw(0, 'diff --git a/x b/x\n')), raw(1, undefined)], fetchFilePatch: () => {} },
  ];
  for (const [index, entry] of cases.entries()) {
    const options = { withheld: entry.withheld, lazyPatches: entry.fetchFilePatch !== undefined, singleList: !!entry.He };
    assert.equal(isLargeDiff(entry.files, options), officialIsLarge({ ...entry, He: !!entry.He }), String(index));
  }
  // R4i-files FI2 (diffgit-08-lazy landed, the R4g lock flipped): as c5da7eb42, the working-tree scopes ask
  // workspace-git-diff for the inline budget ({includePatches:false, inlinePatchesMaxChangedLines:2e4}) and supply
  // fetchFilePatch (workspace-git-file-patch, heavyWorkWorker Fy); git-status.cjs budgetedDiff answers vy's
  // {patches_withheld: !include}, so Qe arrives as a boolean and Fe is defined. A commit scope keeps every patch and
  // no fetchFilePatch (je(true) = {}). Budget and per-file behaviour: tests/diff-large-withheld-main.test.mjs.
  const service = local('electron/git-status.cjs');
  assert.equal(count(service, "patches_withheld: true"), 1);
  assert.equal(count(service, "patches_withheld: false"), 1);
  const renderer = local('src/main.jsx');
  // 2026-10-18 render-tdz fix: the main Changes pane attaches fetchFilePatch after diffScope is declared (the
  // diffFileActions literal read diffScope before its const); the popout keeps the inline spread. Same condition, same call.
  assert.equal(count(renderer, '? { fetchFilePatch: ({ filePath, previousPath }) => call("workspace-git-file-patch"'), 1);
  assert.equal(count(renderer, 'if (gitStatus?.isRepo && lazyDiffScope(diffScope.param)) diffFileActions.fetchFilePatch = ({ filePath, previousPath }) => call("workspace-git-file-patch"'), 1);
  assert.equal(count(renderer, '? INLINE_PATCH_BUDGET : {}) })'), 2);
  once(official('c5da7eb42-B8cTG8SI.js'), ['let e=!s&&!o&&!r&&!!V?.getGitDiffFilePatch;', 'e?{includePatches:!1,inlinePatchesMaxChangedLines:2e4}:void 0', '...t?{lazy_file_hunks:!0}:{}']);
  once(officialMain('index.chunk-CxZMGoHL.js'), ['static patchInclusion(e){if(e?.includePatches!==!1)return!0;']);
  once(official('cb61be3a2--wBh7Ql7.js'), ['bt=Y?.lazy_file_hunks===!0,xt=t(()=>{let e=a?.getGitDiffFilePatch;if(!(!bt||!X||!J||!e))return']);
  // Host adapter (kept, was the R4a DIVERGENCE): the official main window renders Bs (one list over every file) and
  // pairs it with Rt = 20000; the per-file list hl (He = false) pairs with Pt = 5000. The local body is one FileDiff
  // per file in a non-virtualised DOM, i.e. hl, so it keeps Pt: a 5001..20000-line diff collapses here and stays
  // expanded in the official main window.
  for (const lines of [5001, 12000, 20000]) {
    assert.equal(isLargeDiff([changed(lines, 0)]), true, String(lines));
    assert.equal(officialIsLarge({ files: [changed(lines, 0)], He: true }), false, String(lines));
    assert.equal(officialIsLarge({ files: [changed(lines, 0)], He: false }), true, String(lines));
  }
  once(official('c44d00c7f-zUAG9XyS.js'), ['children:Z.map(n=>c(hl,{sessionId:e,file:n,defaultCollapsed:ft||pt&&Lo(n.filePath)']);
});

// ---- terminal-02 -----------------------------------------------------------------------------------------------------

test('terminal-02 official: macOS Cmd/Opt+Left/Right scroll to the bottom before writing the line-editing sequence', () => {
  const terminal = official('c6bf19e8f-oq2b1_8O.js');
  once(terminal, [
    'if(_&&l.buffer.active.type==="normal"&&(e.code==="ArrowLeft"||e.code==="ArrowRight")){let t=e.code==="ArrowLeft",n=an(S.shell);if(e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey)return e.preventDefault(),l.scrollToBottom(),h(t?n.lineStart:n.lineEnd),!1;if(e.altKey&&!e.ctrlKey&&!e.shiftKey&&!e.metaKey)return e.preventDefault(),l.scrollToBottom(),h(t?n.wordBack:n.wordForward),!1}',
    // nn (POSIX) holds raw control bytes for ^A/^E/^U; rn is PowerShell's.
    'nn={lineStart:"\x01",lineEnd:"\x05",wordBack:"\\x1Bb",wordForward:"\\x1Bf",deleteToLineStart:"\x15"}',
    'rn={lineStart:"\\x1B[H",lineEnd:"\\x1B[F",wordBack:"\\x1B[1;5D",wordForward:"\\x1B[1;5C",deleteToLineStart:"\\x1B[1;5H"}',
    'function an(e){return Pe(e)?rn:nn}',
    'import{t as Pe}from"./c643524cf-DsBfh92h.js"',
    // _ = shared-78 kw (Wa: a macOS user agent) gates the whole branch.
    '_=ae(),y=ie();l.attachCustomKeyEventHandler(',
  ]);
  // Pe: the shell's basename is exactly powershell.exe or pwsh.exe (case-sensitive).
  once(official('c643524cf-DsBfh92h.js'), ['import{wd as e}from"./shared-52-DGviI8xb.js";function t(t){let n=e(t??"");return n==="powershell.exe"||n==="pwsh.exe"}export{t};']);
  once(official('shared-52-DGviI8xb.js'), ['function n_(e){let t=e.replace(/[\\\\/]$/,""),n=Math.max(t.lastIndexOf("/"),t.lastIndexOf("\\\\"));return n===-1?t:t.slice(n+1)}', 'n_ as wd']);
});

test('terminal-02 local: handleTerminalNavigation scrolls to the bottom, then writes the same sequences, on the same keys only', () => {
  assert.deepEqual({ ...POSIX_TERMINAL_KEYS }, { lineStart: '\x01', lineEnd: '\x05', wordBack: '\x1bb', wordForward: '\x1bf', deleteToLineStart: '\x15' });
  assert.deepEqual({ ...POWERSHELL_TERMINAL_KEYS }, { lineStart: '\x1b[H', lineEnd: '\x1b[F', wordBack: '\x1b[1;5D', wordForward: '\x1b[1;5C', deleteToLineStart: '\x1b[1;5H' });
  assert.equal(terminalEditingKeys('C:\\Program Files\\PowerShell\\7\\pwsh.exe'), POWERSHELL_TERMINAL_KEYS);
  assert.equal(terminalEditingKeys('/bin/zsh'), POSIX_TERMINAL_KEYS);
  // Same basename rule as Pe: exact, case-sensitive, ".exe" required.
  for (const [shell, keys] of [['pwsh.exe', POWERSHELL_TERMINAL_KEYS], ['C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', POWERSHELL_TERMINAL_KEYS],
    ['C:\\Tools\\PowerShell.exe', POSIX_TERMINAL_KEYS], ['/usr/local/bin/pwsh', POSIX_TERMINAL_KEYS], ['C:\\x\\notpwsh.exe', POSIX_TERMINAL_KEYS], [undefined, POSIX_TERMINAL_KEYS]])
    assert.equal(terminalEditingKeys(shell), keys, String(shell));
  const run = (code, props, options = {}, type = 'normal') => {
    const calls = [];
    const term = { buffer: { active: { type } }, scrollToTop: () => calls.push('top'), scrollToBottom: () => calls.push('bottom') };
    const event = { type: 'keydown', key: code, code, preventDefault() { calls.push('prevent'); }, ...props };
    return { handled: handleTerminalNavigation(event, term, data => calls.push(['write', data]), { mac: true, ...options }), calls };
  };
  for (const [code, props, sequence] of [['ArrowLeft', { metaKey: true }, '\x01'], ['ArrowRight', { metaKey: true }, '\x05'],
    ['ArrowLeft', { altKey: true }, '\x1bb'], ['ArrowRight', { altKey: true }, '\x1bf']])
    assert.deepEqual(run(code, props), { handled: true, calls: ['prevent', 'bottom', ['write', sequence]] }, `${code} ${Object.keys(props)}`);
  assert.deepEqual(run('ArrowLeft', { metaKey: true }, { shell: 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe' }).calls, ['prevent', 'bottom', ['write', '\x1b[H']]);
  assert.deepEqual(run('ArrowRight', { altKey: true }, { shell: 'pwsh.exe' }).calls, ['prevent', 'bottom', ['write', '\x1b[1;5C']]);
  // Not macOS, an alternate-screen app, or another modifier held: the key goes to xterm untouched (official `return!0`).
  for (const [props, options, type] of [[{ metaKey: true }, { mac: false }, 'normal'], [{ altKey: true }, { mac: false }, 'normal'],
    [{ metaKey: true }, {}, 'alternate'], [{ metaKey: true, shiftKey: true }, {}, 'normal'], [{ altKey: true, ctrlKey: true }, {}, 'normal']])
    assert.deepEqual(run('ArrowLeft', props, options, type), { handled: false, calls: [] }, JSON.stringify([props, options, type]));
  // Wired into the xterm key handler with the tab's shell and the platform (mac = the official _ gate).
  assert.equal(count(local('src/source-terminal-pane.jsx'), 'const mac=/Mac/.test(navigator.platform);'), 1);
  assert.equal(count(local('src/source-terminal-pane.jsx'),'if(handleTerminalNavigation(event,term,data=>terminals.input(id,data),{mac,linux:/Linux/.test(navigator.platform),shell:info.shell,commands}))return false;'), 1);
});

// ---- terminal-05 -----------------------------------------------------------------------------------------------------

test('terminal-05 official: canAttach = Bo(session): owner-writable (not shared, not archived, not cli), not Slack-read-only, not a viewer', () => {
  const host = official('cccc2cf0a-B0D--VZp.js');
  once(host, [
    'function MO({owner:e,onPaneClose:t}){let n=ul(e),r=Fc(sl(e)),i=Pc(sl(e)),a=ou(sl(e)),o=Xc();return n?g(Ny,{sessionId:e.id,transport:n,forcePosixCd:r||i||e.type==="remote",localPty:i,spawnCwd:e.type==="landing"?o:void 0,canAttach:a,onPaneClose:t}):null}',
    // Jy (a tab): no sink → no onTerminalSelection and no "Attach selection as context" row.
    'onTerminalSelection:l?D:void 0',
    'hasAttachableSelection:l&&me',
  ]);
  assert.match(host, /import\{[^}]*\bh as ou\b[^}]*\}from"\.\/cd2efac6e-C1jvGOgh\.js"/);
  const sink = official('cd2efac6e-C1jvGOgh.js');
  once(sink, ['function Bo(e){let t=Kn(e),{data:n}=Un(e,zo,{passive:!0}),r=wa({isSlackOrigin:n}),i=Zt();return(e===null||t)&&r==="off"&&!i}', 'Bo as h']);
  assert.match(sink, /import\{[^}]*\bb as Kn\b[^}]*\}from"\.\/c5da7eb42-B8cTG8SI\.js"/);
  once(official('c5da7eb42-B8cTG8SI.js'), [
    'function BM(e){let{data:t}=Q(e,{select:Df,passive:!0}),{data:n}=Q(e,{select:zM,passive:!0}),r=np(e?.id,n);return(t??!1)&&!r&&e?.type!=="cli"}',
    'function Df(e){return e?.isShared===!1&&e?.isArchived!==!0&&!Do(e)&&Tf(e.tags)===void 0}',
    'BM as b',
  ]);
  // c6bf19e8f pi: hasAttachSink is "the parent passed onTerminalSelection"; ⇧⌘L does nothing without it.
  const terminal = official('c6bf19e8f-oq2b1_8O.js');
  once(terminal, ['We=s(()=>m!==void 0)', 'f=()=>We()', 'r.hasAttachSink=f',
    'if(t==="attachTerminalOutput")return e.preventDefault(),!e.repeat&&S.hasAttachSink?.()&&!$n(l,S.onAttachSelection)&&l.hasSelection()&&S.onAttachNothing?.(),!1;']);
});

test('terminal-05 local: the pane shows Attach only with onAttachSelection, and main.jsx withholds it for an archived session (as official Df)', () => {
  const pane = local('src/source-terminal-pane.jsx');
  // Pane side = Jy/pi: the body-menu row, the selection button, ⇧⌘L and the attach handler all need the sink.
  once(pane, [
    '{onAttachSelection && bodyMenu.selection.trim() && <>',
    '{selectionAnchor&&!selectionAnchor.offscreen&&onAttachSelection&&!bodyMenu&&<TerminalSelectionAction',
    'if (!attachVisibleTerminalOutput(term,onAttachSelection?handlers.current.attach:null) && term.hasSelection()) setSelectionAnchor(null);',
    'if (!onAttachSelection || typeof text !== "string" || !text.trim()) return false;',
  ]);
  const main = local('src/main.jsx');
  // Local own rule for every other attach entry point: no attachments while the session is archived (official Df).
  once(main, ['const composerAttachable = section === "new" && !session?.archived;', 'onAttachSelection: composerAttachable ? (text, label) => {']);
  // Fixed in R4e-small: the terminal's sink follows official canAttach — an archived session (Df isArchived) gets no
  // onAttachSelection, so no "Attach selection as context", no selection button and no ⇧⌘L attach; Home (no session,
  // official e===null) and live sessions keep it, in the main window and in a popped-out pane window alike.
  // The terminal itself stays available in an archived session (official MO has no archived check either).
  once(main, ['const terminalAvailable = section === "new" && !!workdir && !!api?.terminal;', 'const session = sessions.find((s) => s.id === current);']);
  const line = main.split('\n').find(text => text.includes('onAttachSelection={session?.archived ? undefined : PANE_WINDOW ?'));
  assert.ok(line, 'terminal pane onAttachSelection prop');
  assert.equal(count(main, 'onAttachSelection={session?.archived ? undefined : PANE_WINDOW ?'), 1);
  assert.equal(count(main, 'onAttachSelection={PANE_WINDOW ?'), 0);
  assert.match(line, /: attachTerminalOutput\} fileDragOwner=\{fileContextOwner\}/);
  // The terminal pane gets that session: sessionId={current ?? null}, the same `current` the session row is found by.
  assert.match(main, /<SourceTerminalPane sessionId=\{current \?\? null\} homeWorkspace=\{current \? null : workdir\}/);
  // …the gate sits on the sink, like MO's canAttach: attachTerminalOutput itself still just adds the snippet.
  const start = main.indexOf('  const attachTerminalOutput = useCallback((text, metadata) => {');
  assert.ok(start > 0);
  const attach = main.slice(start, main.indexOf('}, []);', start));
  assert.match(attach, /setAttachments\(\(entries\) => addSnippet\(entries, snippet\)\);/);
  assert.doesNotMatch(attach, /archived|composerAttachable/);
});

// ---- terminal-06 -----------------------------------------------------------------------------------------------------

test('terminal-06 official: a key typed before the shell starts (typedEarly) marks the prompt held, and Run then avoids that tab', () => {
  const terminal = official('c6bf19e8f-oq2b1_8O.js');
  once(terminal, [
    'let f=t=>!S.typedEarly||S.isRemote?!1:(S.typedEarly.push(t),Kn(t)||(Ie(e),F.getState().noteKeysHeld(e)),!0)',
    'function Kn(e){return e.length<=Gn&&(Hn.test(e)||Un.test(e)||Wn.test(e))}',
    // Once the shell is up the held keys are typed for real (unless a pending Run owns the PTY), through noteUserInput.
    'function zr(e,t){let n=e.typedEarly??[];if(e.typedEarly=void 0,!(t||e.isRemote||F.getState().pendingCommand?.ptyKey===e.ptyKey))for(let t of n)e.terminal.input(t)}',
    '!Kn(n)&&!S.waitingForHost&&(Ie(e),p(n,l.buffer.active.type!=="normal"))',
  ]);
  const store = official('ca41b3815-m5hSbL5-.js');
  once(store, [
    'noteKeysHeld:e=>{tt.add(e)}',
    'function zt(e,t){if(tt.has(t))return!0;if(et.has(t)&&R.get(t)?.lineEditor===!1)return!1;let n=e.promptLines.get(t);return n!==void 0&&n!=="clean"}',
    'function an(e,t){return sn(e)?"a captured run is still live":zt(e,t)?on:null}var on="the prompt may hold unsent input"',
    'function Wt(e){z.delete(e),B.delete(e),tt.delete(e)}',
    // At spawn the held mark is dropped and the prompt line becomes dirty if keys were held (B), then zr types them.
    'noteShellSpawned:e=>{let t=B.has(e);Wt(e);',
  ]);
});

// The official Kn reply patterns (Hn CSI / Un OSC / Wn DCS, at most Gn=64 chars), cut out of the chunk as source text.
const officialReplyPatterns = () => {
  const terminal = official('c6bf19e8f-oq2b1_8O.js');
  const start = terminal.indexOf('Hn=/'), end = terminal.indexOf(',Gn=64;function Kn(e)');
  assert.ok(start > 0 && end > start);
  const [csi, osc, dcs] = terminal.slice(start, end).split(/,(?=[UW]n=\/)/).map(part => part.slice(3));
  return { csi, osc, dcs };
};

test('terminal-06 local: the reply filter is the official Kn verbatim (same three patterns, same 64-char cap)', () => {
  const { csi, osc, dcs } = officialReplyPatterns();
  const model = local('src/code-block-run-model.mjs');
  once(model, [`const REPLY_CSI = ${csi};`, `const REPLY_OSC = ${osc};`, `const REPLY_DCS = ${dcs};`,
    'export const isTerminalReply = (data) => typeof data === "string" && data.length <= 64 && (REPLY_CSI.test(data) || REPLY_OSC.test(data) || REPLY_DCS.test(data));']);
  const officialKn = data => data.length <= 64 && [csi, osc, dcs].some(source => new RegExp(source.slice(1, -1)).test(data));
  for (const data of ['\x1b[?1;2c', '\x1b[>0;276;0c', '\x1b[12;40R', '\x1b[I', '\x1b[O', '\x1b]11;rgb:1e1e/1e1e/1e1e\x1b\\', '\x1bP1$r0m\x1b\\',
    'l', 'ls\r', '\x1b[A', '\x1b[?1;2cx', `\x1b]11;rgb:${'0'.repeat(80)}\x1b\\`]) {
    assert.equal(isTerminalReply(data), officialKn(data), JSON.stringify(data));
    // A reply never changes the prompt state; anything else typed (not a bare line end, ^C or cursor key) makes it dirty.
    if (officialKn(data)) assert.equal(promptAfterInput('clean', data), 'clean');
  }
});

function fakeBridge() {
  const calls = [], writes = [];
  let nextId = 1;
  const bridge = {
    calls, writes, probe: null,
    onEvent() { return () => {}; },
    write(id, data) { writes.push([id, data]); },
    async call(op, params) {
      calls.push(op);
      if (op === 'hello') return { backend: 'pty' };
      if (op === 'list') return [];
      if (op === 'create') return { id: `term-${nextId++}`, owner: params.sessionId, sessionId: params.sessionId, number: nextId - 1, title: null, status: 'running', generation: 1, busy: false };
      if (op === 'attach') return { output: '', end: 0 };
      if (op === 'probe') return bridge.probe ?? { live: [], busy: [], unknown: [] };
      if (op === 'ready') return { at: 0 };
      if (op === 'close' || op === 'resize') return true;
      throw new Error(`unexpected ${op}`);
    },
  };
  return bridge;
}

test('terminal-06 local: every non-reply keystroke marks the prompt dirty whether or not the shell is up, and Run opens another tab', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  // Host adapter: the PTY is spawned by the main process when the tab is created and input goes straight to it, so there
  // is no held typedEarly queue; promptAfterInput applies from the first keystroke.
  assert.equal(count(local('src/terminal-store.mjs'), 'prompts.set(id, promptAfterInput(prompts.get(id), data));'), 1);
  assert.equal(count(local('src/terminal-store.mjs'), 'const target = pickRunTab({ tabs: state.tabs, activeId: state.active, probe, dirty: (tab) => prompts.get(tab) === "dirty" });'), 1);
  assert.equal(count(local('src/terminal-store.mjs') + local('src/source-terminal-pane.jsx'), 'typedEarly'), 0);
  const bridge = fakeBridge();
  const store = createTerminalStore({ bridge });
  const tab = await store.create('s1', 's1', null);
  bridge.probe = { live: [tab.id], busy: [], unknown: [] };
  // A terminal reply (DA) the shell asked for is not typing (official Kn): the idle tab is still used.
  store.input(tab.id, '\x1b[?1;2c');
  let started = await store.runInline({ id: 'r0', sessionId: 's1', command: 'pwd' });
  assert.equal(started.ptyKey, tab.id);
  store.cancelInlineRun();
  store.input(tab.id, '\r');
  // Keys typed before any shell output (the shell may still be starting): written through and the prompt is dirty.
  store.input(tab.id, 'gi');
  assert.deepEqual(bridge.writes.at(-1), [tab.id, 'gi']);
  started = await store.runInline({ id: 'r1', sessionId: 's1', command: 'pwd' });
  assert.notEqual(started.ptyKey, tab.id, 'Run never types into a prompt that may hold unsent input');
  assert.equal(started.fresh, true);
  store.dispose();
  // Model: non-reply input → dirty; replies keep the previous state.
  assert.equal(promptAfterInput(undefined, 'l'), 'dirty');
  assert.equal(promptAfterInput('clean', '\x1b[?1;2c'), 'clean');
  assert.equal(pickRunTab({ tabs: [{ id: 'a', status: 'running' }], activeId: 'a', probe: { live: ['a'] }, dirty: () => true }), null);
  // Host difference: a complete line typed early ("ls\r") is held officially (dirty) until the shell is up and then typed;
  // here it reaches the shell at once, so the prompt is already in its post-flush state (clean).
  assert.equal(promptAfterInput(undefined, 'ls\r'), 'clean');
});

// ---- terminal-16 -----------------------------------------------------------------------------------------------------

test('terminal-16 official: the xterm textarea aria-label is i18n "Terminal input", set on mount and again when the message changes', () => {
  once(official('c6bf19e8f-oq2b1_8O.js'), [
    'V=Je.formatMessage({defaultMessage:"Terminal input",id:"FNxVuWGzC1"}),H=s(()=>V)',
    'r.terminal.textarea?.setAttribute("aria-label",H())',
    'c(()=>{k.current?.terminal.textarea?.setAttribute("aria-label",V)},[V])',
  ]);
});

test('terminal-16 local: Terminal.strings.promptLabel = t("Terminal input") before any Terminal exists; a language change reloads the window', async () => {
  const pane = local('src/source-terminal-pane.jsx');
  const loader = fnBody(pane, 'function loadXterm() {');
  const label = loader.indexOf('xterm.Terminal.strings.promptLabel = t("Terminal input");');
  assert.ok(label > 0 && label < loader.indexOf('Terminal: xterm.Terminal,'), 'the label is set before the Terminal class is handed out');
  assert.equal(count(pane, 'promptLabel'), 1);
  // Every Terminal is built from the loaded modules (factory), so its helper textarea is created with that label.
  once(pane, ['const { Terminal, FitAddon, SearchAddon, Unicode11Addon, WebLinksAddon } = modules;', 'const term = new Terminal({']);
  assert.equal(count(pane, 'new Terminal('), 1);
  // xterm 6.0.0 labels its helper textarea from the same promptLabel string when the terminal opens.
  assert.equal(JSON.parse(local('package.json')).dependencies['@xterm/xterm'], '6.0.0');
  const xterm = local('node_modules/@xterm/xterm/lib/xterm.mjs');
  once(xterm, ['var Gs="Terminal input",mi={get:()=>Gs,set:s=>Gs=s}', 'this.textarea.setAttribute("aria-label",mi.get())', 'get promptLabel(){return mi.get()},set promptLabel(t){mi.set(t)}']);
  const { Terminal } = await import('@xterm/xterm/lib/xterm.mjs');
  try {
    setLocale('zh-CN');
    Terminal.strings.promptLabel = t('Terminal input');
    assert.equal(Terminal.strings.promptLabel, '终端输入');
    setLocale(DEFAULT_LOCALE);
    Terminal.strings.promptLabel = t('Terminal input');
    assert.equal(Terminal.strings.promptLabel, 'Terminal input');
  } finally {
    setLocale(DEFAULT_LOCALE);
    Terminal.strings.promptLabel = 'Terminal input';
  }
  assert.equal(count(local('electron/i18n/zh-CN/terminal.mjs'), '"Terminal input": "终端输入",'), 1);
  // No runtime relabel is needed: both language pickers save and reload, so module-level t() is re-read.
  assert.equal(count(local('src/source-language-picker.jsx'), 'try { await onSave({ locale }); globalThis.location?.reload(); }'), 1);
  assert.equal(count(local('src/source-settings.jsx'), "onChange={value=>{if(value!==getLocale())void Promise.resolve(onSave({locale:value})).then(()=>{try{globalThis.sessionStorage?.setItem('code-desktop:reopen-settings','preferences');}catch{}globalThis.location?.reload();},()=>{});}}/>"), 1);
});
