// R4a test lock (moved from tests-r4a/ at the R4g/R4h gate) for the R3 audit group A-layout (official 2.42304.0): layout-05, layout-07, layout-10, layout-11,
// layout-12. Each test has (a) the official signature counts read from the installed 2.42304.0 chunks — where the
// official decision is a small pure function, its verbatim text is also evaluated, so the gate value / fallback order is
// computed rather than only spelled — and (b) the local side: model behaviour where a model exists, otherwise the source
// line that decides the behaviour. No vite, no GUI, no network: model imports plus file reads only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CHAT_TILE_ID, PANE_KINDS, TILE_CONFIG, fromSpec, layoutKey, openPane, removeTile, tileIds,
} from '../src/tile-layout-model.mjs';
import { createTileLayoutStore, sanitizeSessionEntry } from '../src/tile-layout-store.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const assets = path.join(reference, 'ion-dist/assets/v1');
const cache = new Map();
const read = file => { if (!cache.has(file)) cache.set(file, fs.readFileSync(file, 'utf8')); return cache.get(file); };
const official = name => read(path.join(assets, name));
const local = rel => read(path.join(app, rel));
const count = (text, needle) => text.split(needle).length - 1;
const once = (text, needles) => { for (const needle of needles) assert.equal(count(text, needle), 1, needle); };
const squash = text => text.replace(/\s+/g, ' ').trim();
// Every .js/.jsx/.mjs/.css file under a local directory (relative to app/).
const localFiles = (rel, pattern = /\.(?:m?js|jsx|css)$/) => {
  const out = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (pattern.test(entry.name)) out.push(full);
    }
  };
  walk(path.join(app, rel));
  return out;
};
// The text of a top-level local function: from its declaration to the first line that is just "}".
const fnBody = (text, head) => {
  const start = text.indexOf(head);
  assert.ok(start >= 0, head);
  const end = text.indexOf('\n}\n', start);
  return text.slice(start, end < 0 ? undefined : end + 2);
};
const memoryStorage = () => {
  const data = new Map();
  return { getItem: key => (data.has(key) ? data.get(key) : null), setItem: (key, value) => { data.set(key, String(value)); }, removeItem: key => { data.delete(key); } };
};

// The fizzy-lake "panels" gate, shared by layout-07, layout-10 and layout-11. shared-4 Cf is the build's allow-list of
// fizzy-lake parts; Of() keeps only the parts of <html data-cds-fizzy-lake> that are on it, and jf (exported co, the Bc
// of shared-18) asks whether one is on. shared-23 hands Of() to the CDS root as experimental.fizzyLake, whose hr context
// (shared-frame xr over that list) is what shared-frame vr (exported Uu, the st of shared-15) reads.
const SHARED4_GATE = 'Sf="data-cds-fizzy-lake",Cf=[];function wf(e,t){let n=new Set(e?.split(" "));return t.filter(e=>n.has(e)).sort()}function Tf(e){return[...e].sort().join(" ")}var Ef=Cf,Df;function Of(){return Df??={parts:typeof document>"u"?[]:wf(document.documentElement.getAttribute(Sf),Ef)},Df}function kf(e){return Of().parts.includes(e)}var Af={panels:Ad};function jf(e){return kf(e)&&(Af[e]?.()??!0)}';
const FRAME_XR = 'function xr(e,t){if(!t?.length)return e;let n=new Set(e?.split(" "));for(let e of t)n.add(e);return[...n].sort().join(" ")}';
const FRAME_VR = 'function _r(e,t){return e?.split(" ").includes(t)??!1}function vr(e){return _r(gr(),e)}';
// Evaluate the verbatim shared-4 gate under a document whose <html> claims every fizzy-lake part.
const officialPanelsGate = () => {
  const document = { documentElement: { getAttribute: name => (name === 'data-cds-fizzy-lake' ? 'panels bubbles' : null) } };
  return new Function('document', 'Ad', `var ${SHARED4_GATE}; return { Of, jf };`)(document, () => true);
};
const officialFrameFeature = (contextValue, parts) => {
  const { xr, vr } = new Function('gr', `${FRAME_XR}${FRAME_VR} return { xr, vr };`)(() => context);
  const context = xr(contextValue, parts);
  return { context, vr };
};

test('layout-07 layout-10 layout-11 official (shared panels gate): the 2.42304.0 fizzy-lake allow-list is empty, so "panels" is off whatever the page says', () => {
  const shared4 = official('shared-4-CJsHhp5n.js');
  once(shared4, [SHARED4_GATE, 'jf as co', 'Of as uo']);
  const { Of, jf } = officialPanelsGate();
  assert.deepEqual(Of().parts, [], 'Ef = Cf = []: no part survives the filter');
  assert.equal(jf('panels'), false);
  // shared-23 passes that list to both CDS roots; the only other fizzyLake list (c80ec48f8 gi) is ["bubbles"].
  const shared23 = official('shared-23-Bu_lvvVo.js');
  assert.equal(count(shared23, 'experimental:{densityOverride:r,theme:i,fizzyLake:T_()}'), 1);
  assert.equal(count(shared23, 'experimental:{densityOverride:i,theme:o,fizzyLake:T_()}'), 1);
  assert.equal(count(shared23, 'uo as T_'), 1);
  assert.equal(count(official('c80ec48f8-BoiZeyal.js'), 'gi={fizzyLake:{parts:["bubbles"]}}'), 1);
  const frame = official('shared-frame-BfjMqbuN.js');
  once(frame, [FRAME_XR, FRAME_VR, 'var hr=G(void 0)', 'k=xr(W(hr),l?.fizzyLake?.parts)', 'vr as Uu']);
  for (const parts of [Of().parts, ['bubbles']]) {
    const { vr } = officialFrameFeature(undefined, parts);
    assert.equal(vr('panels'), false, JSON.stringify(parts));
  }
  assert.equal(officialFrameFeature(undefined, ['panels']).vr('panels'), true, 'the reader itself would honour a panels part');
});

// ---- layout-05 -------------------------------------------------------------------------------------------------------
test('layout-05 official: closing a tile resets sidePane only when it is the current one; wa falls back lastDiffTile → sidePane → last of the kind', () => {
  const panes = official('c03935b01-CyJKQj4N.js');
  const I = 'function I(e){return e==="diff"||e.startsWith("diff:")}';
  const wa = 'function wa(e){let t=Array.from(b(e.tileLayout)).filter(t=>e.sidePane==="diff"?I(t):t===e.sidePane);return t.find(t=>t===e.lastDiffTile)??t.find(t=>t===e.sidePane)??t[t.length-1]}';
  const cleanup = '...e.lastDiffTile===t&&{lastDiffTile:null},...(wa(e)??e.sidePane)===t&&{sidePane:"none"}';
  once(panes, [I, wa,
    'function to(e,t){return{closedPaneSlotsBySession:Za(e,t),paneViewStacks:R(e.paneViewStacks,t),...e.lastInputTile===t&&{lastInputTile:null},' + cleanup,
    'closeSidePane:(e,t)=>{if(e==="file"&&Ri(a())){i(e=>N(e,{kind:"closePane"}));return}i(n=>({focusedTile:n.focusedTile===e?void 0:n.focusedTile,tileLayout:x(n.tileLayout,e),...to(n,e)',
    'return{sidePane:e,lastDiffTile:null,...B(t,e),...ao(e)}']);
  // Run the verbatim I / wa and the two cleanup clauses (b: the layout's tile set; here the layout is the id list).
  const officialWa = new Function('b', `${I}${wa} return wa;`)(layout => new Set(layout));
  const close = new Function('wa', 'e', 't', `return {${cleanup}};`).bind(null, officialWa);
  const state = { tileLayout: ['chat', 'diff:a.js', 'diff:b.js', 'terminal'], sidePane: 'diff', lastDiffTile: 'diff:a.js' };
  assert.equal(officialWa(state), 'diff:a.js', 'lastDiffTile first');
  assert.equal(officialWa({ ...state, lastDiffTile: null }), 'diff:b.js', 'then the last tile of the kind');
  assert.equal(officialWa({ ...state, sidePane: 'terminal' }), 'terminal', 'a non-diff side pane is its own tile');
  assert.deepEqual(close(state, 'terminal'), {}, 'closing a non-current pane keeps sidePane and lastDiffTile');
  assert.deepEqual(close(state, 'diff:b.js'), {}, 'closing another diff tile keeps them too');
  assert.deepEqual(close(state, 'diff:a.js'), { lastDiffTile: null, sidePane: 'none' }, 'closing the current one resets both');
});

test('layout-05 local: one tile per pane kind, no sidePane/lastDiffTile state, and closePaneTile removes only the closed tile', () => {
  // A single Changes tile: the persisted layout cannot hold official per-file "diff:<path>" tiles, so wa's
  // lastDiffTile → sidePane → last-of-kind choice never has more than one candidate here.
  assert.deepEqual([...PANE_KINDS], ['files', 'changes', 'plan', 'tasks', 'terminal', 'preview', 'session']);
  const persisted = sanitizeSessionEntry({ tileLayout: { root: { kind: 'stack', direction: 'row', id: 's1', flex: 1, children: [
    { kind: 'tile', tileId: 'chat', flex: 2 }, { kind: 'tile', tileId: 'changes', flex: 3 }, { kind: 'tile', tileId: 'diff:src/a.js', flex: 1 }] } } });
  assert.deepEqual([...tileIds(persisted.tileLayout)], ['chat', 'changes']);
  for (const file of [...localFiles('src'), ...localFiles('electron')]) {
    const text = read(file);
    assert.doesNotMatch(text, /\blastDiffTile\b|\bsidePane\b|\bfocusedTile\b|\blastInputTile\b/, path.relative(app, file));
  }
  // main.jsx closePaneTile: the line that decides what a close does.
  const main = local('src/main.jsx');
  assert.equal(count(main, 'const baseTileLayout = (entry) => (entry?.expandedTile ? entry.baseLayout : entry?.tileLayout) ?? null;'), 1);
  // R4i-transcript TR3 added the poppedOut option (cccc2cf0a XO: a pop out closes the side pane, not the /btw child).
  const closeStart = main.indexOf('const closePaneTile = useCallback((kind, sessionId = currentRef.current ?? HOME_TILE_KEY, { poppedOut = false } = {}) => {');
  assert.ok(closeStart >= 0);
  const closeBody = main.slice(closeStart, main.indexOf('}, []);', closeStart));
  for (const line of ['const next = removeTile(baseTileLayout(entry), kind);',
    'const remaining = [...tileIds(next)].filter((id) => id !== CHAT_TILE_ID);',
    'tileStore.setSession(sessionId, { tileLayout: remaining.length ? next : null, baseLayout: null, expandedTile: null, ...(kind === "tasks" ? {taskViews:[]} : {}) });'])
    assert.equal(count(closeBody, line), 1, line);
  // The same three lines run against the real model and store.
  const store = createTileLayoutStore({ storage: memoryStorage() });
  const baseTileLayout = entry => (entry?.expandedTile ? entry.baseLayout : entry?.tileLayout) ?? null;
  const closePane = (sessionId, kind) => {
    const entry = store.getSession(sessionId);
    const next = removeTile(baseTileLayout(entry), kind);
    const remaining = [...tileIds(next)].filter(id => id !== CHAT_TILE_ID);
    store.setSession(sessionId, { tileLayout: remaining.length ? next : null, baseLayout: null, expandedTile: null, ...(kind === 'tasks' ? { taskViews: [] } : {}) });
  };
  const withChanges = openPane(null, 'changes');
  const both = openPane(withChanges, 'terminal');
  assert.equal(layoutKey(both), 'S[row](T:chat,S[column](T:changes,T:terminal))');
  store.setSession('s', { tileLayout: both, fileTabs: [{ path: 'a.js', preview: false }], activePath: 'a.js', btwSessionId: 'side-1' });
  closePane('s', 'terminal');
  let entry = store.getSession('s');
  assert.equal(layoutKey(entry.tileLayout), 'S[row](T:chat,T:changes)', 'the other pane stays where it was');
  assert.equal(entry.tileLayout.root.children[1].flex, withChanges.root.children[1].flex, 'with its width');
  assert.deepEqual([entry.activePath, entry.btwSessionId, entry.fileTabs.length], ['a.js', 'side-1', 1], 'the rest of the session entry is untouched');
  // Closing the pane that was opened first (the official "current" one in this layout) leaves the other in its slot.
  store.setSession('s', { tileLayout: both });
  closePane('s', 'changes');
  assert.equal(layoutKey(store.getSession('s').tileLayout), 'S[row](T:chat,T:terminal)');
  // An expanded tile: the close works on the base layout and ends the expansion (official: x() replaces tileLayout, so
  // z(), expandedTile.baseLayout === tileLayout, no longer holds).
  const expanded = fromSpec({ direction: 'row', children: [['changes', 1]] });
  store.setSession('s', { tileLayout: expanded, baseLayout: both, expandedTile: 'changes' });
  closePane('s', 'terminal');
  entry = store.getSession('s');
  assert.deepEqual([layoutKey(entry.tileLayout), entry.baseLayout, entry.expandedTile], ['S[row](T:chat,T:changes)', null, null]);
  closePane('s', 'changes');
  assert.equal(store.getSession('s').tileLayout, null, 'the last pane closes to the chat alone');
});

// ---- layout-07 -------------------------------------------------------------------------------------------------------
test('layout-07 official: tiles-handle-line only renders for divider:"line", which Nb returns only behind panels', () => {
  const tiles = official('c9543da06-DX8mZLsD.js');
  once(tiles, ['children:[a&&!n&&f("span",{className:"tiles-handle-line"}),f("span",{className:"tiles-handle-affordance",style:ee})',
    'zIndex:(a?4:1)+l', 'line:r.divider==="line"', '"data-tiles-line":n.divider==="line"?"":void 0',
    'let j=r.divider==="line"&&!A.left,te=r.divider==="line"&&!A.top']);
  // The class has no rule anywhere: the chunk's embedded stylesheet styles .tiles-handle-affordance only, and no CSS
  // file in the bundle names it.
  assert.equal(count(tiles, 'tiles-handle-line'), 1);
  assert.equal(count(tiles, '.tiles-handle-affordance{background:var(--tile-resize-color);opacity:0}'), 1);
  const cssFiles = [];
  const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (entry.name.endsWith('.css')) cssFiles.push(full); } };
  walk(path.join(reference, 'ion-dist'));
  assert.ok(cssFiles.length >= 20, `${cssFiles.length} css files`);
  for (const file of cssFiles) assert.equal(count(read(file), 'tiles-handle-line'), 0, path.basename(file));
  const shared18 = official('shared-18-D4XxL6Tg.js');
  const Tb = '{gap:12,padding:8,minTileBasePx:100,minTileWidthPx:280,dragLift:24}';
  const Nb = 'function Nb(e){return e&&Bc("panels")?Db??={...Tb,gap:1,padding:0,borderPx:0,divider:"line"}:Tb}';
  once(shared18, [`var Tb=${Tb}`, Nb, 'co as Bc']);
  const run = gate => new Function('Bc', 'Tb', `let Db;${Nb} return Nb;`)(() => gate, Function(`return ${Tb}`)());
  assert.equal(run(true)(true).divider, 'line', 'panels on: the line divider');
  assert.equal(run(false)(true).divider, undefined, 'panels off: the plain config');
  assert.equal(run(officialPanelsGate().jf('panels'))(true).divider, undefined, 'and panels is off in 2.42304.0');
});

test('layout-07 local: the tile config is official Tb with no divider, and the separator renders no line span', () => {
  const Tb = Function('return {gap:12,padding:8,minTileBasePx:100,minTileWidthPx:280,dragLift:24}')();
  assert.deepEqual({ ...TILE_CONFIG }, Tb);
  assert.equal('divider' in TILE_CONFIG, false);
  const layout = local('src/source-tile-layout.jsx');
  assert.equal(count(layout, 'export function SourceTileLayout({ layout, onLayoutChange, tiles, renderTile, config = TILE_CONFIG,'), 1);
  // The one mount (main.jsx) passes no config: main.jsx's only config= prop is the Settings dialog's.
  const mounts = localFiles('src').filter(file => read(file).includes('<SourceTileLayout '));
  assert.deepEqual(mounts.map(file => path.relative(app, file)), ['src/main.jsx']);
  const main = local('src/main.jsx');
  assert.equal(count(main, '<SourceTileLayout '), 1);
  assert.equal(count(main, ' config={'), 1);
  assert.equal(count(main, '<SourceSettings open={!!settings} config={'), 1, 'main.jsx keeps the default tile config');
  const separator = fnBody(layout, 'function Separator(');
  assert.doesNotMatch(separator, /\bline\b/, 'no line prop');
  assert.equal(count(separator, 'style={{ zIndex: 1 + depth, '), 1, 'official (a?4:1)+l with a=false');
  // The separator's children: the affordance first, then the two corners (official: line span only when a&&!n).
  const spans = separator.match(/<span className="[^"]+"/g);
  assert.deepEqual(spans, ['<span className="tiles-handle-affordance"', '<span className="tiles-handle-corner"', '<span className="tiles-handle-corner"']);
  for (const file of localFiles('src')) {
    const text = read(file);
    assert.doesNotMatch(text, /tiles-handle-line|data-tiles-line|data-after-line-[xy]/, path.relative(app, file));
  }
});

// ---- layout-10 -------------------------------------------------------------------------------------------------------
// Pull an object literal of string values out of a chunk (official) or a generated module, and evaluate it.
const objectLiteral = (text, pattern) => {
  const match = text.match(pattern);
  assert.ok(match, String(pattern));
  return Function(`return ${match[1]}`)();
};
const PILL = {
  base: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current transition-[opacity,color,background-color]',
  vertical: 'h-full max-h-12 w-[3px] group-focus-visible/resize:max-h-none',
  horizontal: 'h-[3px] w-full max-w-12 group-focus-visible/resize:max-w-none',
  dragging: 'text-secondary opacity-100 duration-snap',
  resting: 'text-muted opacity-[var(--cds-resize-pill-force,0)] delay-200 duration-base group-hover/resize:opacity-100',
  focus: 'group-focus-visible/resize:bg-fill-accent group-focus-visible/resize:opacity-100 group-focus-visible/resize:delay-0',
};

test('layout-10 official: ResizeHandle picks the line classes (qt) only when st("panels"), otherwise the pill (Kt)', () => {
  const handle = official('shared-15-Cc9xvKlF.js');
  once(handle, ['y=st("panels")?qt:Kt', 'Uu as st', 'inset-y-0 start-[calc(50%_-_var(--resize-line)_/_2)]',
    'u("div",{"aria-hidden":!0,"data-cds-part":"resize-pill",className:x(y.base,m?y.vertical:y.horizontal,g?y.dragging:y.resting,y.focus)})']);
  const Kt = objectLiteral(handle, /,Kt=(\{base:[^}]*\}),qt=/);
  const qt = objectLiteral(handle, /,qt=(\{base:[^}]*\}),Jt=/);
  assert.deepEqual(Kt, PILL);
  assert.equal(qt.vertical, 'inset-y-0 start-[calc(50%_-_var(--resize-line)_/_2)] my-auto w-[var(--resize-line)]');
  // st is shared-frame vr over the hr context; with the 2.42304.0 fizzy-lake list it is false (see the gate test).
  assert.equal(officialFrameFeature(undefined, officialPanelsGate().Of().parts).vr('panels'), false);
});

test('layout-10 local: the generated sidebar handle keeps Kt behind useCdsFeature → false; the split-view handle spells the same pill', () => {
  // Sidebar: src/generated/sidebar-resize/resize-handle.mjs is the extracted shared-15 Jt; its st is the host adapter.
  const generated = local('src/generated/sidebar-resize/resize-handle.mjs');
  assert.deepEqual(objectLiteral(generated, /\nvar Kt = (\{[\s\S]*?\});\n/), PILL);
  assert.deepEqual(objectLiteral(generated, /\nvar qt = (\{[\s\S]*?\});\n/), objectLiteral(official('shared-15-Cc9xvKlF.js'), /,qt=(\{base:[^}]*\}),Jt=/));
  assert.equal(count(generated, 'y = st("panels") ? qt : Kt,'), 1);
  assert.equal(count(generated, 'useCdsFeature as st,'), 1);
  const adapters = local('src/source-sidebar-resize-adapters.jsx');
  assert.equal(count(adapters, 'export function useCdsFeature(_name) {\n  return false;\n}'), 1);
  // Split view: src/source-resize-handle.jsx is hand-written; evaluate its pill className expression for all four
  // states and compare with official x(y.base, m?y.vertical:y.horizontal, g?y.dragging:y.resting, y.focus) at y = Kt.
  const handle = local('src/source-resize-handle.jsx');
  const start = handle.indexOf('<div aria-hidden="true" data-cds-part="resize-pill" className={');
  assert.ok(start >= 0);
  const exprStart = handle.indexOf('{', start) + 1, exprEnd = handle.indexOf('} />', exprStart);
  const expression = handle.slice(exprStart, exprEnd);
  assert.match(expression, /^cls\(/);
  const cls = (...parts) => parts.filter(Boolean).join(' ');
  assert.equal(count(handle, 'const cls = (...parts) => parts.filter(Boolean).join(" ");'), 1);
  const localPill = new Function('cls', 'vertical', 'dragging', `return ${expression};`);
  for (const vertical of [true, false]) for (const dragging of [true, false]) {
    const expected = cls(PILL.base, vertical ? PILL.vertical : PILL.horizontal, dragging ? PILL.dragging : PILL.resting, PILL.focus);
    assert.equal(localPill(cls, vertical, dragging), expected, `vertical=${vertical} dragging=${dragging}`);
  }
  assert.doesNotMatch(handle, /--resize-line|panels/, 'no line variant in the hand-written handle');
});

// ---- layout-11 -------------------------------------------------------------------------------------------------------
// A tiny calc() evaluator for the two width/height formulas: units vw/dvh/rem/px, max(), env()/var() with fallbacks.
const evaluateCss = (expression, { width = 1280, height = 800, rem = 16, env = {}, vars = {} } = {}) => {
  let text = expression
    .replace(/env\(\s*([\w-]+)\s*,\s*([^()]+?)\s*\)/g, (_, name, fallback) => env[name] ?? fallback)
    .replace(/var\(\s*(--[\w-]+)\s*,\s*([^()]+?)\s*\)/g, (_, name, fallback) => vars[name] ?? fallback)
    .replace(/(\d+(?:\.\d+)?)(vw|dvh|rem|px)\b/g, (_, value, unit) => `(${value}*${{ vw: width / 100, dvh: height / 100, rem, px: 1 }[unit]})`)
    .replace(/\bcalc\(/g, '(').replace(/\bmax\(/g, 'Math.max(');
  assert.match(text, /^[\d\s.+\-*/(),]*(?:Math\.max[\d\s.+\-*/(),]*)*$/, text);
  return Function(`return ${text}`)();
};
const fromClass = (utility, prefix) => { assert.ok(utility.startsWith(`${prefix}-[`) && utility.endsWith(']'), utility); return utility.slice(prefix.length + 2, -1).replaceAll('_', ' '); };

test('layout-11 official: the Dialog popup width subtracts the safe area; the band header is behind vr("panels")', () => {
  const frame = official('shared-frame-BfjMqbuN.js');
  const width = 'w-[calc(100vw_-_2rem_-_2*max(env(safe-area-inset-left,0px),env(safe-area-inset-right,0px)))]';
  const height = 'max-h-[calc(100dvh_-_max(2rem,2*var(--desktop-titlebar-inset,0px))_-_2*max(env(safe-area-inset-top,0px),env(safe-area-inset-bottom,0px)))]';
  once(frame, [`Cg="${height}"`, 'wg=`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col ' + width + ' ${Cg} ${Sg} cds-reset',
    'Qg={sm:"max-w-[400px]",md:"max-w-[520px]",lg:"max-w-[720px]",xl:"max-w-[880px]","2xl":"max-w-[1024px]","3xl":"max-w-[1152px]"}',
    // b_ Dialog popup: d = vr("panels") && !unstyled feeds Eg and the Vg context the header reads.
    'let d=vr("panels")&&!n,f=W(t_),p=n?"":`${wg} ${Hg} ${Zg} ${Qg[e]} ${t?"h-dvh":""} ${d?Eg:""}`',
    'children:H(Vg.Provider,{value:d,children:', 'Vg=G(!1)',
    // w_ DialogHeader: the band when Vg, otherwise the plain mb-pad-md row.
    'return W(Vg)?T(l,{children:[T("div",{"data-cds-part":"band"', 'T("div",{className:X("mb-pad-md flex items-start gap-2",i),children:',
    'let B=vr("panels")']);
  assert.equal(count(frame, '"data-cds-part":"band"'), 2, 'Dialog header and ConfirmationDialog, both behind panels');
  assert.equal(count(frame, 'vr("panels")'), 3);
  assert.equal(officialFrameFeature(undefined, officialPanelsGate().Of().parts).vr('panels'), false);
  // The formulas, evaluated: with no safe-area inset (the desktop window) they reduce to 100vw - 2rem and
  // 100dvh - max(2rem, 2*titlebar inset).
  const officialWidth = fromClass(width, 'w'), officialHeight = fromClass(height, 'max-h');
  assert.equal(evaluateCss(officialWidth, { width: 1280 }), 1248);
  assert.equal(evaluateCss(officialWidth, { width: 1280, env: { 'safe-area-inset-left': '20px' } }), 1208);
  assert.equal(evaluateCss(officialHeight, { height: 800, vars: { '--desktop-titlebar-inset': '28px' } }), 744);
});

test('layout-11 local: .sdlg-popup is calc(100vw - 2rem) with the official max height minus the safe-area term; no band header', () => {
  const css = local('src/source-dialog.css');
  const line = '  width: calc(100vw - 2rem); max-height: calc(100dvh - max(2rem, 2 * var(--desktop-titlebar-inset, 0px)));\n';
  assert.equal(count(css, line), 1);
  const popup = css.slice(css.indexOf('.sdlg-popup {'), css.indexOf('}', css.indexOf('.sdlg-popup {')));
  assert.ok(popup.includes(line.trim()), 'the line is in the .sdlg-popup rule');
  const localWidth = 'calc(100vw - 2rem)', localHeight = 'calc(100dvh - max(2rem, 2 * var(--desktop-titlebar-inset, 0px)))';
  const officialWidth = 'calc(100vw - 2rem - 2*max(env(safe-area-inset-left,0px),env(safe-area-inset-right,0px)))';
  const officialHeight = 'calc(100dvh - max(2rem,2*var(--desktop-titlebar-inset,0px)) - 2*max(env(safe-area-inset-top,0px),env(safe-area-inset-bottom,0px)))';
  // Equal for every window size while env(safe-area-inset-*) is 0 (desktop Chromium/Electron windows report no
  // safe area); a non-zero inset is the only case they would part (2 * the larger inset).
  for (const width of [360, 520, 800, 1280, 1920]) for (const height of [400, 600, 800, 1200]) for (const titlebar of ['0px', '28px', '45px']) {
    const vars = { '--desktop-titlebar-inset': titlebar };
    assert.equal(evaluateCss(localWidth, { width, height, vars }), evaluateCss(officialWidth, { width, height, vars }), `w ${width}`);
    assert.equal(evaluateCss(localHeight, { width, height, vars }), evaluateCss(officialHeight, { width, height, vars }), `h ${height} ${titlebar}`);
  }
  assert.equal(evaluateCss(localWidth, { width: 1280 }) - evaluateCss(officialWidth, { width: 1280, env: { 'safe-area-inset-right': '12px' } }), 24);
  // Sizes: the five the local dialog offers carry the official Qg widths.
  for (const [size, px] of [['sm', 400], ['md', 520], ['lg', 720], ['xl', 880], ['2xl', 1024]])
    assert.equal(count(css, `.sdlg-popup[data-dialog-size="${size}"] { max-width: ${px}px; }`), 1, size);
  // Header: the plain mb-pad-md flex items-start gap-2 row, no band part.
  assert.equal(count(css, '.sdlg-header { display: flex; flex-shrink: 0; align-items: flex-start; gap: 8px; margin: 0 0 var(--cds-pad-md); }'), 1);
  const dialog = local('src/source-dialog.jsx');
  assert.doesNotMatch(dialog, /data-cds-part="band"|\bband\b|panels/);
  assert.equal(count(dialog, 'className={`sdlg-popup cds-reset ${className}`.trim()}'), 1);
});

// ---- layout-12 -------------------------------------------------------------------------------------------------------
test('layout-12 official: the side chat asks the composer to follow the transcript size, but every size source is ()=>void 0', () => {
  const sideChat = official('cccc2cf0a-B0D--VZp.js');
  once(sideChat, ['g(us,{ref:I,onChange:H,draftPersisted:p!==null,followsTranscriptTextSize:!0,onSubmit:ce,', 'Io as us',
    ',mk=()=>void 0,', 'i=mk(),a=r.length>0?', 'a!==null&&g(jn,{textSize:i,children:a})',
    ',dO=()=>void 0,', 'l=dO();if(e.author==="user")return e.synthetic?g(Ao,{entry:e,textSize:l})']);
  assert.equal(count(sideChat, 'followsTranscriptTextSize'), 1);
  // c227f4d5e: Io = kP = B(OP); OP defaults the flag to false and hands it to uM, whose only use is fd(flag) as the
  // composer root's style; fd is shared-7 st = tM, a stub.
  const composer = official('c227f4d5e-Ba-r--Rl.js');
  once(composer, ['kP as Io', 'kP=B(OP)', 'followsTranscriptTextSize:$e=!1}=e', 'hostCardClassName:Qe,followsTranscriptTextSize:$e})',
    'followsTranscriptTextSize:Ae}){', 'dt=fd(Ae)', 'st as fd', 'className:Bo("epitaxy-prompt",ye),style:dt,']);
  assert.equal(count(composer, 'followsTranscriptTextSize'), 3);
  const shared7 = official('shared-7-B8UIMGDr.js');
  once(shared7, [',tM=()=>void 0,', 'tM as st']);
  const tM = Function('return ()=>void 0')();
  assert.equal(tM(true), undefined, 'style:dt is undefined whether or not the composer follows the transcript');
});

test('layout-12 local: the side chat composer and user bubble take no text size and no inline style', () => {
  const sideChat = local('src/source-side-chat.jsx');
  assert.doesNotMatch(sideChat, /textSize|TextSize|fontSize|font-size/);
  const composer = fnBody(sideChat, 'function SideChatComposer(');
  assert.equal(count(composer, 'return <div className="ssc-composer" data-mention-open={suggest.open || undefined}>'), 1);
  assert.doesNotMatch(composer, /style=/);
  const user = fnBody(sideChat, 'function SideChatUserMessage(');
  assert.equal(count(user, '{rest && <div className="ssc-user-message" data-cds="UserMessage"><div className="ssc-user-bubble"><SourceSideChatUserContent text={rest}/></div></div>}'), 1);
  assert.doesNotMatch(user, /style=/);
  // The only inline styles in the panel are the floating geometry and the resize handles.
  assert.equal(count(sideChat, 'style={'), 2);
  once(sideChat, ['style={windowed ? undefined : geometry.rect ?? undefined}', "style={{ touchAction: 'none', cursor: sideChatResizeCursor(edges) }}"]);
  assert.doesNotMatch(local('src/source-side-chat-user-content.jsx'), /textSize|style=/);
});
