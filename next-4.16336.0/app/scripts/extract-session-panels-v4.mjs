// Generator of session-panels-v4 (OpenClaude v0.3 → Claude Desktop 4.16336.0; surfaces-prod-3 session-page lane, item 2:
// the Code session's right-hand pane container; analysis/claude-4.16336.0-migrate-20261104/surfaces-prod-3/session-page/
// prep/plan.json item2_rightPanelContainer + mainSessionDecisions). The official container of a docked pane is
//   cc43287c9 Eje (Code session tile host) → c9543da06 ys (tile viewport, `data-tiles-line` when shared-20 f_ sets
//   divider "line") → c4db265df Tn (pane frame, export t) → shared-38 Wi (CdsPanel, export ft).
// Wave 7 (cds-integrate/wave7, session-page request): the CdsPanel layer this area owned until then is cds-core's —
//   shared-38 Wi  CdsPanel              (official export ft)    cds-core publicName CdsPanel
//   shared-38 Di  CdsPanelLabelContext  (official export mt)    cds-core publicName CdsPanelLabelContext (its one state)
//   shared-38 Ei  CdsPanelResizeHandle  (official export ht)    cds-core publicName CdsPanelResizeHandle
// — and so are the tile line-mode config f_ (with its lazily built u_) and the frame vars p_ (writer_shared20_f_ /
// writer_shared20_p_, state_shared20_u_): the host reads those from src/cds-core.mjs. This area keeps the rest of the
// tile line mode, sliced with runSlicer (scripts/extract-working-line.mjs) over the finalized cds-core shared graph
// (sharedGraph 'cds-core').
// Relink (round3 rl-session-page, port of the sandbox surfaces-prod-3/session-page/prestage-r3 SP-1 / SP-2; decisions D-SP-1 /
// D-SP-2 in surfaces-prod-3/session-page/relink-prep/plan.json): the pane frame
//   c4db265df Tn  PaneFrame (official export t): `"data-pane-root"`, the pane title row (`"data-pane-header-line"`), the
//                 trailing actions and the CdsPanel (cds-core) it puts around a docked pane; side / flush / variant are
//                 Tn's own decision over its tile contexts (`o(ot)` in a tile, `o(xs)` the pane stands on the page).
//   The stateful bindings its closure reads are cds-core's since wave 7 (vendor-flags Vt, shared-31 AT, shared-120 Er / Dr /
//   Je = CdsPanePanelsContext, c03935b01 vf, the CdsPanel layer): linked, not cut.
//   Its closure reaches the official session tile store through c03935b01 Q (export Et, `$e(u(vf) ?? yf, sel)`) only
//   from Ht (the layout toggle) and Qe (the pane menu), rendered when a pane passes tileId / paneLayout / onPopOut. D-SP-1
//   option A: Q is a host boundary (usePaneTileStoreSelector, src/session-panels-v4-adapter.mjs), so the module store
//   yf (du()) and the 266-binding store closure stay out. The host has no official tile store and passes PaneFrame none of
//   those props, so the boundary answers with an explicit error, never with a guessed state (the tile-bound parts wait for
//   the tile store: Eje phase B).
//   D-SP-2: the contexts the official tile host provides around a pane (cc43287c9 Hje: `p(sR, {value: !0})` = c4db265df
//   ot, `p(lm, {value: Wf(b)})` = shared-20 ub / xs) are roots exported under semantic names for the host tile engine
//   (src/source-tile-layout.jsx), which provides them with its own tile model's values; Yt (sidePanelChrome, `a === null`
//   → null in the host), ht / ft (minimized owner, needs c03935b01 Tr / Er) keep their official defaults.
// Not cut here (round 8): ys (vendor-motion module state held unexported by working-line-v4), the frame strip line
// (frame-sidebar ji / To unexported), Eje (8778 bindings).
//
// Pins (scripts/session-panels-v4.pins.json, written once by --pin-init, then reviewed): the snapshot chunk sha256 of every
// listed module, each root's / also-pinned declaration's sha256, the finalized cds-core (manifest + adapter sha256). Any
// drift stops generation; a changed pin is a review decision.
//
//   node --max-old-space-size=4096 scripts/extract-session-panels-v4.mjs [--check | --dry-run | --pin-init]
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import * as official from './official-4.16336.0.mjs';

const app = path.resolve(import.meta.dirname, '..');
const sha = b => createHash('sha256').update(b).digest('hex');
export const generatedRoot = path.join(app, 'src/generated');
export const output = path.join(generatedRoot, 'session-panels-v4');
export const adapterPath = path.join(app, 'src/session-panels-v4-adapter.mjs');
export const pinsPath = path.join(import.meta.dirname, 'session-panels-v4.pins.json');
const cdsCoreAdapterPath = path.join(app, 'src/cds-core-adapter.mjs');
export const S38 = 'shared-38-DyF0_Fim.js';
// Item 2 (tile line mode): the Code session tile host cc43287c9 Eje builds its viewport config from shared-20 f_ (Zf(!0),
// `{...c_, gap: 1, padding: 0, borderPx: 0, divider: "line"}`) and its per-tile shell style from shared-20 h_ (Cp, padding /
// --tiles-padding / --tile-shell-ground m_), keyed by l_ (fm, chat / session tiles keep a bottom inset) and fb (Wf, which
// pane kinds stand on the page ground, db); p_ (Hf) carries --tiles-border. The tile renderer c9543da06 Is gives a shell
// after a divider `data-after-line-x` / `-y` and the reach-back size ks / As (Os). The host's tile engine
// (source-tile-layout.jsx, the 2.2553.1-engine host port) consumes these originals; the viewport ys itself is not cut
// (vendor-motion module state held unexported by working-line-v4; prep plan item2 / prestage blocked).
export const S20 = 'shared-20-DUEo90UF.js';
export const C95 = 'c9543da06-DHwxxZai.js';
export const C4D = 'c4db265df-CHyZjtsm.js';
export const C039 = 'c03935b01-BylKMWqe.js';

// Roots: semantic name, AST-unique features (prettier form), official export alias.
export const roots = [
  { semantic: 'tileShellStyle', file: S20, local: 'h_', export: 'Vc', features: ['"--tiles-padding": "8px",', '"--tile-shell-ground": m_(r),'] },
  { semantic: 'isChatOrSessionTile', file: S20, local: 'l_', export: 'zc', features: ['return e === "chat" || e === "session";'] },
  { semantic: 'paneTileStandsOnPage', file: S20, local: 'fb', export: 'Cs', features: ['let t = e.split(":", 1)[0];', 'return Object.hasOwn(db, t) && db[t];'] },
  { semantic: 'WIDE_TITLE_ROW_H', file: S20, local: 'Qy', export: 'Os', features: ['Qy = "var(--wide-title-row-h)"'] },
  { semantic: 'TILE_REACH_BACK', file: C95, local: 'Os', export: null, features: ['Os = "var(--tile-reach-back, 0px)"'] },
  { semantic: 'TILE_AFTER_LINE_X_STYLE', file: C95, local: 'ks', export: null, features: ['ks = { width: `calc(100% + ${Os})` }'] },
  { semantic: 'TILE_AFTER_LINE_Y_STYLE', file: C95, local: 'As', export: null, features: ['As = { height: `calc(100% + ${Os})` }'] },
  { semantic: 'TILE_STYLES', file: C95, local: 'vs', export: null, features: ['gridTemplateRows: "minmax(0, 1fr)",', 'transform: "translateZ(2px)",'] },
  // SP-1: the pane frame and the tile contexts its tile host provides (D-SP-2).
  { semantic: 'PaneFrame', file: C4D, local: 'Tn', export: 't',
    features: ['"data-pane-root": M,', 'r ? void 0 : te("side_pane")', '"data-pane-header-line": me,', 'Ye = o(ot),', 'Xe = o(fe),', 'ht = Pe();'] },
  { semantic: 'PaneInTileContext', file: C4D, local: 'ot', export: 'D', features: ['ot = c(!1)'] },
  // round4 relink-w8 (session-rail sN, D1): the reading-order context PaneFrame reads (`Je = o(at)`, passed on as
  // `readingOrder: Je`; official export E). session-rail-v4 SessionRail reads the same context (cf74bc599 `E as yy`), so this
  // graph, its one holder, exports it and session-rail-v4 links it instead of cutting a second createContext.
  { semantic: 'PaneReadingOrderContext', file: C4D, local: 'at', export: 'E', features: ['at = c([])'] },
  { semantic: 'PaneStandsOnPageContext', file: S20, local: 'ub', export: 'xs', features: ['ub = g(!1)'] },
];
// Declarations the roots reach that carry the look this lane restores (pinned and feature-checked, not exported). Wave 7:
// the CdsPanel look (shared-38 Ii / ji / Mi / Pi) went to cds-core with the CdsPanel layer; none is reached here.
export const also = [];

const targets = { [S20]: 'tiles-line.mjs', [C95]: 'tiles-shell.mjs', [C4D]: 'pane-frame.mjs' };
// Every chunk the bounded closure enters (the slicer fails on an unlisted or unused chunk); shared-38 and shared-frame (the
// compiler-runtime helpers CdsPanel read) left with the CdsPanel layer. SP-1: the chunks PaneFrame's closure enters past
// the D-SP-1 cut (runSlicer --dry-run over the wave-7 cds-core; vendor-intl is not entered, see localAdapters).
export const chunks = [S20, C95, C4D, C039,
  'c12ca901f-BRGahymY.js', 'c41956fd9-C7ZoiXta.js', 'c5d464fa3-D1V4bYI5.js', 'c68c4283d-FxwfdZSA.js', 'c6e73333a-LnS4e_bw.js',
  'c7037f09e-DXK8RSre.js', 'c70925de4-QmzvmFns.js', 'c9bc99274-DZ8dxmGP.js', 'ca5db7aaf-C8dMH-IH.js', 'cb50b3202-wMiGsFCo.js',
  'cc44b66a7-CBE7MOEW.js', 'cd12ec3aa-zQrJQqot.js', 'cd1d8a6ac-cRrts978.js', 'cf53e1812-B98_08tN.js', 'shared-0-CnnWnVrT.js',
  'shared-1-D1bGaTaN.js', 'shared-18-Cfqwgjc5.js', 'shared-183-B2N6Zy4J.js', 'shared-19-UalAfDtn.js', 'shared-31-C9BqSSuD.js',
  'shared-38-DyF0_Fim.js', 'shared-39-ZCs0lAwB.js', 'shared-55-BRv2XBP7.js', 'shared-62-DoCqVpIq.js',
  'shared-frame-CJdE5Ria.js'];
// Other chunks keep their file name without the 8-character content hash (ca5db7aaf-C8dMH-IH.js → ca5db7aaf.mjs).
const targetOf = source => targets[source] ?? source.replace(/-[\w-]{8}\.js$/, '.mjs');

export const modules = chunks.map(source => {
  const mine = roots.filter(r => r.file === source);
  const spec = { source, target: targetOf(source) };
  if (mine.length) {
    spec.internal = true;
    spec.exports = Object.fromEntries(mine.map(r => [r.local, r.semantic]));
    spec.features = Object.fromEntries(mine.map(r => [r.local, r.features]));
  }
  return spec;
});

// D1: the shared-frame compiler-runtime helpers are linked from routines-shared-v4 and shared-38's focus-shadow style hook
// from code-composer-v4 (prep survey p-cds-panel); none is cut twice. session-rail-kit-v4 is not linked: it stays an
// isolated staged graph until its cutover (region-plan batch 11; tests/session-rail-kit-v4.test.mjs), so shared-frame's
// two pure owner-window helpers ha / ma are copied here (stateless, D1 allows a copy).
// SP-1 (PaneFrame): frame-sidebar and settings-pages-v4 answer the frame helpers, shared-31 W, the code theme and the
// editor prefs Tn reads; code-current-v4 only through its environment-modifier-keys module (shared-1 F9, exported as
// environmentModifierKeys) and files-changes-v4 only through file-type-icon-context (c17ed8826 t, FileTypeIconSetContext).
// The pure bindings a linked area slices without exporting are copied (linkedCopies, d1-lib classify: pure).
export const linkedAreas = ['code-composer-v4', 'routines-shared-v4', 'frame-sidebar', 'settings-pages-v4',
  { area: 'code-current-v4', modules: ['environment-modifier-keys.mjs'] },
  { area: 'files-changes-v4', modules: ['file-type-icon-context.mjs'] }];
export const linkedCopies = {
  'shared-1-D1bGaTaN.js#jU': 'pure: the pane header double-click guard (composedPath / selection test); frame-sidebar and code-current-v4 slice it unexported',
  'shared-1-D1bGaTaN.js#AU': 'pure: the interactive-element selector string jU tests; frame-sidebar and code-current-v4 slice it unexported',
  'c5d464fa3-D1V4bYI5.js#V': 'pure: the code theme pair hook over settings-pages-v4 linked hooks; settings-pages-v4 slices it unexported',
};
// D-SP-1: c03935b01 Q (export Et) is a host boundary; its original declaration and the module store it falls back to are pinned.
export const hostAdapters = {
  [C039]: { Et: { local: 'Q', name: 'usePaneTileStoreSelector', features: ['let t = u(vf);', 'return $e(t ?? yf, e);'], also: { yf: ['yf = du()'] } } },
};

export function localAdapters() {
  return {
    [`${official.vendorFrame}#i`]: { name: 'loadHostReact', features: ['t.exports = r();'] },
    [`${official.vendorFrame}#ce`]: { name: 'hostJsxRuntime', features: ['t.exports = se();'] },
    [`${official.vendorFrame}#be`]: { name: 'hostReactDom', features: ['e(me())'] },
    // SP-1: react-intl's useIntl / FormattedMessage (vendor-intl q / Gt) the pane frame reads are the host i18n, as in
    // cds-core and every 4.16336.0 region graph (cds-core-adapter useHostIntl / HostFormattedMessage over the host catalog;
    // react-intl is not sliced and the host mounts no IntlProvider for cds-core's ctx_vendorintl_K).
    [`${official.vendorIntl}#q`]: { name: 'useHostIntl', features: ['let e = l(K);', 'return (Mt(e), e);'] },
    [`${official.vendorIntl}#Gt`]: { name: 'HostFormattedMessage', features: ['Gt = a(Wt, Ut)'] },
  };
}
export function sliceConfig() {
  return {
    name: 'session-panels 4.16336.0', generator: 'extract-session-panels-v4.mjs',
    sourceContract: official, referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
    source: official.ionSource, vendor: { [official.vendorFrame]: official.reactAliases },
    generatedRoot, output,
    adapterModule: '../../session-panels-v4-adapter.mjs', adapterFile: 'src/session-panels-v4-adapter.mjs',
    adapters: hostAdapters, localAdapters: localAdapters(), sharedGraph: 'cds-core', linkedAreas, linkedCopies, modules,
  };
}

export async function readPins() { return JSON.parse(await fs.readFile(pinsPath, 'utf8')); }

export async function preflight(pins) {
  if (pins.referenceVersion !== official.referenceVersion || pins.referenceSnapshot !== official.referenceSnapshot) throw Error('pins are for another snapshot');
  const pinnedChunks = new Set(modules.map(m => m.source));
  for (const file of pinnedChunks) {
    const want = pins.sources[file];
    if (!want) throw Error(`${file} is not pinned`);
    if (sha(await fs.readFile(path.join(official.ionSource, file))) !== want) throw Error(`${file} drifted from the pins`);
  }
  if (Object.keys(pins.sources).length !== pinnedChunks.size) throw Error('pins list a chunk the generator no longer reads');
  const cache = new Map();
  for (const [kind, list] of [['roots', roots], ['also', also]]) {
    for (const r of list) {
      const p = pins[kind][r.semantic];
      if (!p || p.file !== r.file || p.local !== r.local) throw Error(`${kind} ${r.semantic} differs from the pins`);
      const src = await readSource(r.file, cache, official.ionSource), e = src.top.get(r.local);
      if (!e || e.kind === 'import') throw Error(`${kind} ${r.semantic}: ${r.file}#${r.local} is not a declaration`);
      if (sha(src.code.slice(e.node.start, e.node.end)) !== p.declarationSha256) throw Error(`${kind} ${r.semantic}: ${r.file}#${r.local} declaration drifted`);
      assertFeatures(`${kind} ${r.semantic}`, await featureText(src, e), r.features);
    }
    if (Object.keys(pins[kind]).length !== list.length) throw Error(`pins list a ${kind} entry the generator no longer has`);
  }
  if (sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))) !== pins.cdsCore.manifestSha256) throw Error('src/generated/cds-core/manifest.json differs from pins.cdsCore (cds-core changed: re-run and re-pin after review)');
  if (sha(await fs.readFile(cdsCoreAdapterPath)) !== pins.cdsCore.adapterSha256) throw Error('src/cds-core-adapter.mjs differs from pins.cdsCore');
}

// The host adapter: framework identity (one React, the host's), the host i18n and the D-SP-1 boundary.
export function adapterSource() {
  return [
    '// Generated by scripts/extract-session-panels-v4.mjs; edit the generator, never this file.',
    '// Framework identity: the host React / JSX runtime / ReactDOM (one instance, shared with cds-core-adapter.mjs).',
    "import * as React from 'react';", "import * as JSX from 'react/jsx-runtime';", "import * as ReactDOM from 'react-dom';",
    'export function loadHostReact() { return React; }', 'export const hostJsxRuntime = JSX;', 'export const hostReactDom = ReactDOM;',
    '// Host i18n (vendor-intl q / Gt): the same answer cds-core gives, from its adapter.',
    "export { useHostIntl, HostFormattedMessage } from './cds-core-adapter.mjs';",
    '// D-SP-1 (relink-prep/plan.json): c03935b01 Q, `function Q(e){let t=u(vf);return $e(t??yf,e)}`, selects from the official',
    '// session tile store (the vf provider, else the module store yf = du()). The host keeps its own tile store',
    '// (src/tile-layout-store.mjs) and no official one exists in this app: its readers in PaneFrame are c4db265df Ht and',
    '// ca5db7aaf Qe, rendered only for a tileId / paneLayout / onPopOut, and the host passes none of them. A call means a pane',
    '// was wired to the tile-bound parts before the tile store exists (Eje phase B); it fails here instead of reading a guessed state.',
    'export function usePaneTileStoreSelector() {',
    "  throw Error('session-panels-v4: PaneFrame reached c03935b01 Q (official session tile store), which the host does not have; do not pass PaneFrame tileId / paneLayout / onPopOut before the tile store lands');",
    '}',
  ].join('\n') + '\n';
}

export async function pinInit() {
  if (await fs.stat(pinsPath).catch(() => null)) throw Error(`${pinsPath} exists; review and delete it by hand to re-pin`);
  const cache = new Map();
  const decl = async (f, local) => {
    const src = await readSource(f, cache, official.ionSource); const e = src.top.get(local);
    if (!e || e.kind === 'import') throw Error(`${f}#${local} is not a declaration`);
    const exportAlias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
    return { sha256: sha(src.code.slice(e.node.start, e.node.end)), exportAlias };
  };
  const pins = { referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, sources: {}, roots: {}, also: {} };
  for (const file of new Set(modules.map(m => m.source))) pins.sources[file] = sha(await fs.readFile(path.join(official.ionSource, file)));
  for (const r of roots) {
    const d = await decl(r.file, r.local);
    if (d.exportAlias !== r.export) throw Error(`${r.semantic}: export ${d.exportAlias}, expected ${r.export}`);
    pins.roots[r.semantic] = { file: r.file, local: r.local, export: r.export, declarationSha256: d.sha256, features: r.features };
  }
  for (const r of also) {
    const d = await decl(r.file, r.local);
    pins.also[r.semantic] = { file: r.file, local: r.local, export: d.exportAlias, declarationSha256: d.sha256, features: r.features };
  }
  pins.cdsCore = { manifestSha256: sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))), adapterSha256: sha(await fs.readFile(cdsCoreAdapterPath)) };
  await fs.writeFile(pinsPath, JSON.stringify(pins, null, 2) + '\n');
  return pins;
}

export async function extractSessionPanelsV4(options = {}) {
  const pins = await readPins();
  await preflight(pins);
  const adapter = adapterSource();
  if (options.check) { if (await fs.readFile(adapterPath, 'utf8').catch(() => null) !== adapter) throw Error('src/session-panels-v4-adapter.mjs differs from the generator'); }
  else if (!options.dryRun) await fs.writeFile(adapterPath, adapter);
  return runSlicer({ ...sliceConfig(),
    artifacts: async m => ({ 'provenance.json': JSON.stringify({
      referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
      pins: 'scripts/session-panels-v4.pins.json', roots: pins.roots, also: pins.also,
      cdsCore: pins.cdsCore, adapterSha256: sha(adapter), linkedAreas, linkedCopies,
      sharedGraphImports: [...new Set(m.modules.flatMap(x => x.imports.filter(i => i.kind === 'shared-graph').map(i => `${i.name} <- ${i.via}`)))].sort(),
      linkedImports: [...new Set(m.modules.flatMap(x => x.imports.filter(i => i.kind === 'linked').map(i => `${i.name} <- ${i.via} (${i.from})`)))].sort(),
      initializers: Object.fromEntries(m.modules.filter(x => x.initializers.length).map(x => [x.target, x.initializers])),
    }, null, 2) + '\n' }) }, options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--pin-init')) { const p = await pinInit(); console.log('pinned', Object.keys(p.sources).length, 'sources', Object.keys(p.roots).length, 'roots', Object.keys(p.also).length, 'also'); }
  else await extractSessionPanelsV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
