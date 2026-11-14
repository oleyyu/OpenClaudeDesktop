// Production generator of the Code titlebar frame (OpenClaude v0.3 → Claude Desktop 4.16336.0; surfaces wave 3, titlebar lane,
// analysis/claude-4.16336.0-migrate-20261104/surfaces-prod-3/titlebar/{prep/plan.json,report.json}). Slices, with runSlicer
// (scripts/extract-working-line.mjs) and the finalized cds-core shared graph (sharedGraph 'cds-core'):
//   shared-20 o_   TitlebarFrame (official export Uc; cc43287c9 RX's `p(xp, {lifted, label, barRef, sectionsRef, startScreen,
//                  paneAtEnd, staticTitle, lead, grip, cluster, seeThrough, data-top-left, data-top-right, ...on("header"),
//                  style})`): shared-18 OS (the comfortable CdsRoot + the shared-120 Ke panels scope, value !lifted) around
//                  shared-20 s_ (the epitaxy-titlebar row: shared-18 XS drag backdrop, NS / IS top-left / top-right
//                  clearances, the cds-core CdsToolbar with divider `panels && !startScreen ? undefined : false` and flush
//                  `!panels`, the lead / cluster slots, the shared-31 scrollbar lane) and, only when lifted, shared-31 ru
//                  (the frame store's strip line claim)
//   shared-20 Rg   TitlebarLiftedHiddenContext (createContext(false), read by o_; held here once, exported for whoever slices
//                  shared-20 sb, its provider)
//   shared-20 Ug   titlebarTextVars (official export Yc; RX `style: {...kp, "--titlebar-pill-max": je}`)
//   shared-120 qe  useTitlebarPanelsScope (official export _n; `c(Ke) === !0` over the cds-core Ke OS provides)
//   shared-38 fn / En  titlebarLeadRowClass / titlebarLeadClipClass (official exports Br / Hr; RX's lead wrapper
//                  `group/lead relative z-[1] ${oy} ${py} draggable-none`)
// The stateful bindings of the closure: shared-0 jH / PH, shared-31 Tu and shared-120 Ke come from cds-core (wave 6); the
// shared-31 slot store Kl is frame-sidebar's (linkedAreas, exported by frame-sidebar's linkExportsByChunk); Rg is held only
// here. Two host boundaries are the SAME boundaries frame-sidebar declares, so the adapter re-exports frame-sidebar's
// dispatchers instead of declaring a second host object (one frame store, one desktop answer per window):
//   (shared-92 Y frameStore was the other one until SB-0: it is linked from cds-core store_shared92_Y now)
//   shared-0 FH  useIsDesktopApp   (shared-18 WS: the see-through titlebar's scrollbar lane; frame-sidebar's host answer)
//
// Pins (scripts/titlebar-frame-v4.pins.json, written once by --pin-init, then reviewed): the snapshot chunk sha256 of every
// listed module, each root's / also-pinned declaration's / boundary's declaration sha256 (+ head line), the finalized cds-core
// (manifest + adapter sha256). Any drift stops generation; a changed pin is a review decision.
//
//   node --max-old-space-size=4096 scripts/extract-titlebar-frame-v4.mjs [--check | --dry-run | --pin-init]
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import * as official from './official-4.16336.0.mjs';
import { boundaries as frameSidebarBoundaries } from './extract-frame-sidebar-v4.mjs';

const app = path.resolve(import.meta.dirname, '..');
const sha = b => createHash('sha256').update(b).digest('hex');
export const generatedRoot = path.join(app, 'src/generated');
export const output = path.join(generatedRoot, 'titlebar-frame');
export const adapterPath = path.join(app, 'src/titlebar-frame-adapter.mjs');
export const pinsPath = path.join(import.meta.dirname, 'titlebar-frame-v4.pins.json');
const cdsCoreAdapterPath = path.join(app, 'src/cds-core-adapter.mjs');
export const S20 = 'shared-20-DUEo90UF.js', S120 = 'shared-120-DCdTP1_5.js', S38 = 'shared-38-DyF0_Fim.js', S18 = 'shared-18-Cfqwgjc5.js',
  S31 = 'shared-31-C9BqSSuD.js', S0 = 'shared-0-CnnWnVrT.js', S92 = 'shared-92-BOgyxePb.js';

// Roots: semantic name, AST-unique features (prettier form), official export alias (null: chunk-internal).
export const roots = [
  { semantic: 'TitlebarFrame', file: S20, local: 'o_', export: 'Uc',
    features: ['lifted: t, ...n } = e', 't && !r && !n.startScreen && i(xl, {})', 'o(Es, { compact: t, children: [a, s] })'] },
  { semantic: 'TitlebarLiftedHiddenContext', file: S20, local: 'Rg', export: null, features: ['Rg = g(!1)'] },
  { semantic: 'titlebarTextVars', file: S20, local: 'Ug', export: 'Yc', features: ['"--titlebar-text-primary": "var(--cds-text-primary)"'] },
  { semantic: 'useTitlebarPanelsScope', file: S120, local: 'qe', export: '_n', features: ['return c(Ke) === !0;'] },
  { semantic: 'titlebarLeadRowClass', file: S38, local: 'fn', export: 'Br', features: ['fn = "flex min-w-0 items-center"'] },
  { semantic: 'titlebarLeadClipClass', file: S38, local: 'En', export: 'Hr', features: ['[clip-path:inset(-32px_-12px)]'] },
  // verify:titlebar (session lead inside the frame, where shared-120 qe is true): c73f45bc3 Qb `t === null ? r("span",
  // {className: l ? bi : Ci})` (l = Ei() = qe, bi = shared-38 gn), the rail-mode no-origin box; cc43287c9 FX `w = jb()` (qe):
  // the title is `$h({bleed: w ? Pd : void 0})` (Pd = shared-18 Iw; c9543da06 pp `c = a === void 0 ? fp : a`, class
  // dp(c.pad), style c.style) inside `div{className: w ? Df : jf}` (Df = shared-18 Bw).
  { semantic: 'titlebarLeadNoOriginPanelsClass', file: S38, local: 'gn', export: 'Zn', features: ['gn = "ps-md shrink-0"'] },
  { semantic: 'titleBleedPanels', file: S18, local: 'Iw', export: 'Rf', features: ['Iw = { pad: Fw, style: { "--cds-outset-x": "var(--cds-pad-md)" } }'] },
  { semantic: 'titleGroupPanelsClass', file: S18, local: 'Bw', export: 'xf', features: ['gap-[calc(var(--cds-pad-md)_-_--spacing(1.5))]'] },
];
// Declarations the roots reach that carry the behaviour this lane restores (pinned and feature-checked, not exported).
export const also = [
  { semantic: 'TitlebarRow', file: S20, local: 's_',
    features: ['i(re, { label: a, divider: P, flush: F, ...I, className: L, children: H })', 'P = D ? void 0 : !1', '"--title-row-lane": `${S}px`',
      'className: v ? "flex min-w-0 items-center ps-md" : "contents"'] },
  { semantic: 'TitlebarDensityRoot', file: S18, local: 'OS', features: ['density: "comfortable"', 'children: m(iv, { value: r, children: n })'] },
];

const targets = {
  [S20]: 'titlebar-frame.mjs', [S120]: 'panels-scope.mjs', [S38]: 'titlebar-classes.mjs', [S18]: 'titlebar-density.mjs',
  [S31]: 'titlebar-lane.mjs', [official.sharedFrame]: 'shared-frame.mjs',
};
// Every chunk the bounded closure enters (the slicer fails on an unlisted or unused chunk).
// (shared-frame: one compiler-runtime-free helper, ho, over cds-core's owner window; a pure copy, D1 allowed.)
export const chunks = [S20, S120, S38, S18, S31, official.sharedFrame];

export const modules = chunks.map(source => {
  const mine = roots.filter(r => r.file === source);
  const spec = { source, target: targets[source] };
  if (mine.length) {
    spec.internal = true;
    spec.exports = Object.fromEntries(mine.map(r => [r.local, r.semantic]));
    spec.features = Object.fromEntries(mine.map(r => [r.local, r.features]));
  }
  return spec;
});

// D1: frame-sidebar slices and exports shared-31's slot store Kl (`Kl = Gl()`, frame-sidebar linkExportsByChunk) and the
// compiler-runtime helpers; this graph links them. titlebar is linked for whatever pure binding it already exports.
export const linkedAreas = ['frame-sidebar', 'titlebar'];
export const linkedCopies = {};

// Host boundaries: official declarations the slice does not copy. Each is a boundary frame-sidebar already declares with the
// same name and kind; src/titlebar-frame-adapter.mjs re-exports frame-sidebar's dispatcher (one host answer per window).
export const boundaries = [
  // SB-0 (round4 wave8b sidebar): shared-92 Y is linked from cds-core (store_shared92_Y), as frame-sidebar now links it; ru's
  // claimStripLine / releaseStripLine are Y's own actions. Was: { key: `${S92}#Y`, name: 'frameStore', kind: 'store', reads:
  // ['claimStripLine', 'releaseStripLine'] } re-exported from frame-sidebar's dispatcher.
  { key: `${S0}#FH`, name: 'useIsDesktopApp', kind: 'hook', reads: ['platform', 'version'],
    host: 'shared-18 WS `t = !Pt()` (the see-through titlebar\'s controls / scrollbar lane): frame-sidebar\'s useIsDesktopApp answer' },
];
export const reexportFrom = './frame-sidebar-adapter.mjs';

export function localAdapters(pins) {
  return {
    [`${official.vendorFrame}#i`]: { name: 'loadHostReact', features: ['t.exports = r();'] },
    [`${official.vendorFrame}#ce`]: { name: 'hostJsxRuntime', features: ['t.exports = se();'] },
    [`${official.vendorFrame}#be`]: { name: 'hostReactDom', features: ['e(me())'] },
    ...Object.fromEntries(boundaries.map(b => [b.key, { name: b.name, features: [pins.boundaries[b.key].head] }])),
  };
}
export function sliceConfig(pins) {
  return {
    name: 'titlebar-frame 4.16336.0', generator: 'extract-titlebar-frame-v4.mjs',
    sourceContract: official, referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
    source: official.ionSource, vendor: { [official.vendorFrame]: official.reactAliases },
    generatedRoot, output,
    adapterModule: '../../titlebar-frame-adapter.mjs', adapterFile: 'src/titlebar-frame-adapter.mjs',
    adapters: {}, localAdapters: localAdapters(pins), sharedGraph: 'cds-core', linkedAreas, linkedCopies, modules,
  };
}

export async function readPins() { return JSON.parse(await fs.readFile(pinsPath, 'utf8')); }

// The re-exported boundaries must stay frame-sidebar's own (same key, name and kind).
export function assertSharedBoundaries() {
  for (const b of boundaries) {
    const theirs = frameSidebarBoundaries.find(x => x.key === b.key);
    if (!theirs || theirs.name !== b.name || theirs.kind !== b.kind)
      throw Error(`boundary ${b.key}: frame-sidebar no longer declares ${b.name} (${b.kind}); the re-export would answer another host object`);
  }
}

export async function preflight(pins) {
  if (pins.referenceVersion !== official.referenceVersion || pins.referenceSnapshot !== official.referenceSnapshot) throw Error('pins are for another snapshot');
  assertSharedBoundaries();
  const pinnedChunks = new Set([...modules.map(m => m.source), ...boundaries.map(b => b.key.split('#')[0])]);
  for (const file of pinnedChunks) {
    const want = pins.sources[file];
    if (!want) throw Error(`${file} is not pinned`);
    if (sha(await fs.readFile(path.join(official.ionSource, file))) !== want) throw Error(`${file} drifted from the pins`);
  }
  if (Object.keys(pins.sources).length !== pinnedChunks.size) throw Error('pins list a chunk the generator no longer reads');
  const cache = new Map();
  const check = async (file, local, want, label, features) => {
    const src = await readSource(file, cache, official.ionSource), e = src.top.get(local);
    if (!e || e.kind === 'import') throw Error(`${label}: ${file}#${local} is not a declaration`);
    if (sha(src.code.slice(e.node.start, e.node.end)) !== want) throw Error(`${label}: ${file}#${local} declaration drifted`);
    if (features) assertFeatures(label, await featureText(src, e), features);
  };
  for (const [kind, list] of [['roots', roots], ['also', also]]) {
    for (const r of list) {
      const p = pins[kind][r.semantic];
      if (!p || p.file !== r.file || p.local !== r.local) throw Error(`${kind} ${r.semantic} differs from the pins`);
      await check(r.file, r.local, p.declarationSha256, `${kind} ${r.semantic}`, r.features);
    }
    if (Object.keys(pins[kind]).length !== list.length) throw Error(`pins list a ${kind} entry the generator no longer has`);
  }
  for (const b of boundaries) {
    const p = pins.boundaries[b.key];
    if (!p || p.name !== b.name || p.kind !== b.kind) throw Error(`boundary ${b.key} differs from the pins`);
    const [f, l] = b.key.split('#'); await check(f, l, p.declarationSha256, `boundary ${b.name}`);
  }
  if (Object.keys(pins.boundaries).length !== boundaries.length) throw Error('pins list a boundary the generator no longer has');
  if (sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))) !== pins.cdsCore.manifestSha256) throw Error('src/generated/cds-core/manifest.json differs from pins.cdsCore (cds-core changed: re-run and re-pin after review)');
  if (sha(await fs.readFile(cdsCoreAdapterPath)) !== pins.cdsCore.adapterSha256) throw Error('src/cds-core-adapter.mjs differs from pins.cdsCore');
}

// The host adapter: framework identity (one React, the host's) and frame-sidebar's dispatchers for the shared boundaries.
export function adapterSource() {
  const lines = [
    '// Generated by scripts/extract-titlebar-frame-v4.mjs from its boundaries; edit those, never this file.',
    '// Framework identity: the host React / JSX runtime / ReactDOM (one instance, shared with cds-core-adapter.mjs).',
    "import * as React from 'react';", "import * as JSX from 'react/jsx-runtime';", "import * as ReactDOM from 'react-dom';",
    'export function loadHostReact() { return React; }', 'export const hostJsxRuntime = JSX;', 'export const hostReactDom = ReactDOM;',
    '// Boundaries frame-sidebar declares with the same key, name and kind: its dispatchers, so its host table answers them.',
  ];
  for (const b of boundaries) lines.push(`export { ${b.name} } from '${reexportFrom}'; // ${b.key} (${b.kind})`);
  return lines.join('\n') + '\n';
}

export async function pinInit() {
  if (await fs.stat(pinsPath).catch(() => null)) throw Error(`${pinsPath} exists; review and delete it by hand to re-pin`);
  assertSharedBoundaries();
  const cache = new Map();
  const decl = async (f, local) => {
    const src = await readSource(f, cache, official.ionSource); const e = src.top.get(local);
    if (!e || e.kind === 'import') throw Error(`${f}#${local} is not a declaration`);
    const exportAlias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
    return { sha256: sha(src.code.slice(e.node.start, e.node.end)), exportAlias, head: (await featureText(src, e)).split('\n')[0].trim() };
  };
  const pins = { referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, sources: {}, roots: {}, also: {}, boundaries: {} };
  for (const file of new Set([...modules.map(m => m.source), ...boundaries.map(b => b.key.split('#')[0])]))
    pins.sources[file] = sha(await fs.readFile(path.join(official.ionSource, file)));
  for (const r of roots) {
    const d = await decl(r.file, r.local);
    if (d.exportAlias !== r.export) throw Error(`${r.semantic}: export ${d.exportAlias}, expected ${r.export}`);
    pins.roots[r.semantic] = { file: r.file, local: r.local, export: r.export, declarationSha256: d.sha256, features: r.features };
  }
  for (const r of also) {
    const d = await decl(r.file, r.local);
    pins.also[r.semantic] = { file: r.file, local: r.local, export: d.exportAlias, declarationSha256: d.sha256, features: r.features };
  }
  for (const b of boundaries) {
    const [f, local] = b.key.split('#');
    const d = await decl(f, local);
    pins.boundaries[b.key] = { name: b.name, kind: b.kind, export: d.exportAlias, declarationSha256: d.sha256, head: d.head };
  }
  pins.cdsCore = { manifestSha256: sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))), adapterSha256: sha(await fs.readFile(cdsCoreAdapterPath)) };
  await fs.writeFile(pinsPath, JSON.stringify(pins, null, 2) + '\n');
  return pins;
}

export async function extractTitlebarFrame(options = {}) {
  const pins = await readPins();
  await preflight(pins);
  const adapter = adapterSource();
  if (options.check) { if (await fs.readFile(adapterPath, 'utf8').catch(() => null) !== adapter) throw Error('src/titlebar-frame-adapter.mjs differs from the generator boundaries'); }
  else if (!options.dryRun) await fs.writeFile(adapterPath, adapter);
  return runSlicer({ ...sliceConfig(pins),
    artifacts: async m => ({ 'provenance.json': JSON.stringify({
      referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
      pins: 'scripts/titlebar-frame-v4.pins.json', roots: pins.roots, also: pins.also, boundaries: pins.boundaries, reexportFrom,
      cdsCore: pins.cdsCore, adapterSha256: sha(adapter), linkedAreas, linkedCopies,
      sharedGraphImports: [...new Set(m.modules.flatMap(x => x.imports.filter(i => i.kind === 'shared-graph').map(i => `${i.name} <- ${i.via}`)))].sort(),
      linkedImports: [...new Set(m.modules.flatMap(x => x.imports.filter(i => i.kind === 'linked').map(i => `${i.name} <- ${i.via} (${i.from})`)))].sort(),
      heldByCdsCore: Object.fromEntries(m.modules.filter(x => x.heldByViewTabs.length).map(x => [x.target, x.heldByViewTabs.length])),
      initializers: Object.fromEntries(m.modules.filter(x => x.initializers.length).map(x => [x.target, x.initializers])),
    }, null, 2) + '\n' }) }, options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--pin-init')) { const p = await pinInit(); console.log('pinned', Object.keys(p.sources).length, 'sources', Object.keys(p.roots).length, 'roots', Object.keys(p.also).length, 'also', Object.keys(p.boundaries).length, 'boundaries'); }
  else await extractTitlebarFrame({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
