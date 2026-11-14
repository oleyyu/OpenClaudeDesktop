// Production generator of the titlebar controls (OpenClaude v0.3 → Claude Desktop 4.16336.0; surfaces wave 2, titlebar lane,
// analysis/claude-4.16336.0-migrate-20261104/surfaces-prod-2/titlebar/report.json). Slices, with runSlicer
// (scripts/extract-working-line.mjs) and the finalized cds-core shared graph (sharedGraph 'cds-core'):
//   shared-21 _O   SidebarHistoryNav (the sidebar placement of Back / Forward, KR's titlebar and yO's collapsed nav; it is the
//                  frame-sidebar boundary `shared-21#_O`, answered by this slice)
//   shared-20 hv   HistoryNavButtons (memo(mv): the official history state hook jm over BrowserNavigation.navigationStateStore,
//                  the press-and-hold page list pv, and uv: two ghost iconOnly CDS Buttons, CaretLeft "Back" / CaretRight
//                  "Forward", tooltip bottom, cmd+[ / cmd+] on macOS)
//   cc43287c9 SY   TitlebarPaneToggle (one Code titlebar pane toggle: ghost iconOnly CDS Button pressed / pressedVariant
//                  "selected" in a bottom CDS Tooltip)
//   cc43287c9 UJ   titlebarOverflowIcon (the "View options" trigger's glyph, Dp("DotsHorizontal"))
//   cc44b66a7 M    PANE_ICONS (the pane kind -> icon table of the titlebar toggles and View options rows)
// The official history store is the desktop bridge globalThis["claude.web"].BrowserNavigation (shared-1 Am / shared-0 gO): two
// boundaries of kind bridge below, answered by ONE host object (src/titlebar-host.jsx), so there is a single navigation state.
// The focus registry tj reads (shared-19 qA) and the isMac / telemetry helpers are frame-sidebar's: linkedAreas (D1).
//
// Pins (scripts/titlebar-v4.pins.json, written once by --pin-init, then reviewed and fixed): the snapshot chunk sha256 of every
// listed module, each root's and boundary's declaration sha256 (+ head line), the old 3.6556.2 counterparts, the finalized
// cds-core (manifest + adapter sha256). Any drift stops generation; a changed pin is a review decision.
//
//   node --max-old-space-size=4096 scripts/extract-titlebar-v4.mjs [--check | --dry-run | --pin-init]
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import * as official from './official-4.16336.0.mjs';

const app = path.resolve(import.meta.dirname, '..');
const sha = b => createHash('sha256').update(b).digest('hex');
export const generatedRoot = path.join(app, 'src/generated');
export const output = path.join(generatedRoot, 'titlebar');
export const adapterPath = path.join(app, 'src/titlebar-adapter.mjs');
export const pinsPath = path.join(import.meta.dirname, 'titlebar-v4.pins.json');
const cdsCoreAdapterPath = path.join(app, 'src/cds-core-adapter.mjs');
export const S21 = 'shared-21-CuohtEoj.js', S20 = 'shared-20-DUEo90UF.js', CC = 'cc43287c9-dzfX-J5i.js', PI = 'cc44b66a7-CBE7MOEW.js';

// Roots: semantic name, AST-unique features (prettier form), official export alias (null: chunk-internal), and the old
// 3.6556.2 counterpart, re-checked at --pin-init.
export const roots = [
  { semantic: 'SidebarHistoryNav', file: S21, local: '_O', export: 'vr',
    features: ['ju(e, "nav-back", n)', 'ju(t, "nav-forward", n)', 'In().state === "ready"', 'buttonClassName: "df-chrome-btn"', 'placement: "sidebar"', 'rO(N()) ? "sm" : void 0'],
    old: { file: 'shared-21-R7LldJ05.js', local: 'xI', export: '_o' } },
  { semantic: 'HistoryNavButtons', file: S20, local: 'hv', export: 'xc', features: ['f(mv)'],
    old: { file: 'shared-20-mUr7IqZY.js', local: 'Dm', export: 'Po' } },
  { semantic: 'TitlebarPaneToggle', file: CC, local: 'SY', export: null,
    features: ['{ spec: t, ownerId: n, onButton: r } = e', 'pressedVariant: "selected"', 'onMouseDown: IM', 'Qne(n, a, e.currentTarget)', 'side: "bottom"'] },
  { semantic: 'titlebarOverflowIcon', file: CC, local: 'UJ', export: null, features: ['Dp("DotsHorizontal")'] },
  { semantic: 'PANE_ICONS', file: PI, local: 'M', export: 'n',
    features: ['preview: "Play"', 'diff: "ChangesPlusMinus"', 'terminal: "CommandLinePrompt"', 'file: "Folder"', 'tasks: "AgentsSimple"'] },
];

const targets = {
  [S21]: 'sidebar-history-nav.mjs', [S20]: 'history-nav.mjs', 'shared-1-D1bGaTaN.js': 'navigation-state.mjs', [CC]: 'pane-toggle.mjs',
  [PI]: 'pane-icons.mjs', [official.sharedFrame]: 'shared-frame.mjs',
};
// Every chunk the bounded closure enters (the slicer fails on an unlisted or unused chunk).
export const chunks = [S21, S20, 'shared-1-D1bGaTaN.js', 'shared-62-DoCqVpIq.js', CC, PI, 'shared-8-BqfCbkJd.js', 'c81ea1931-ChuE7vym.js',
  official.sharedFrame];
// (shared-frame: only the compiler-runtime helpers cds-core holds without a publicName and frame-sidebar does not export (today Z2;
// I2 / I3 are linked from frame-sidebar since it exports them): pure copies, D1 allowed.)

export const modules = chunks.map(source => {
  const mine = roots.filter(r => r.file === source);
  const spec = { source, target: targets[source] ?? `${source.replace(/-[\w-]{8}\.js$/, '')}.mjs` };
  if (mine.length) {
    spec.internal = true;
    spec.exports = Object.fromEntries(mine.map(r => [r.local, r.semantic]));
    spec.features = Object.fromEntries(mine.map(r => [r.local, r.features]));
  }
  return spec;
});

// D1: frame-sidebar already slices shared-19's focus hand-off registry (qA, read and written by tj, exported) and shared-62's
// Qa (isMac); this graph links them. shared-62 ZS (the analytics facade object over cds-core withAnalyticsClient) is a pure
// object frame-sidebar keeps unexported (it exports only QS = ZS.track): sliced again here.
export const linkedAreas = ['frame-sidebar'];
export const linkedCopies = {
  'shared-62-DoCqVpIq.js#ZS': 'pure object of forwarding functions over cds-core withAnalyticsClient (YS); frame-sidebar exports only its .track (QS)',
};

// Host boundaries: official declarations (chunk#local of the 4.16336.0 snapshot) the slice does not copy; each resolves to a
// named host capability through src/titlebar-adapter.mjs. Kinds as in scripts/extract-frame-sidebar-v4.mjs:
//   component  a child the host mounts in this slot      hook / effect  a hook the host answers (gate, host state, gap)
//   bridge     a module-level desktop bridge object (globalThis["claude.web"].X); the adapter exposes the methods named in
//              `reads` as getters over the host's object, so a method the host lacks reads undefined (the official absent path)
export const boundaries = [
  // ---- the official history store: BrowserNavigation (one host object answers both module-level reads)
  { key: 'shared-1-D1bGaTaN.js#Am', name: 'BrowserNavigationState', kind: 'bridge', reads: ['navigationStateStore'],
    host: 'jm (shared-1 export db, In / Zn): navigationStateStore.getState() / onStateChange(cb) over main.jsx history / historyAt (src/titlebar-host.jsx)' },
  { key: 'shared-0-CnnWnVrT.js#gO', name: 'BrowserNavigation', kind: 'bridge', reads: ['goBack', 'goForward', 'historyPages', 'goToHistoryPage'],
    host: 'dv / fv goBack / goForward = main.jsx travel(-1 / +1); historyPages / goToHistoryPage absent (the host keeps no page list): the official no-list path' },
  // ---- the press-and-hold history page list (lazy chunk ce8821ff9): only reached when the state lists pages (listsPages)
  { key: `${S20}#cv`, name: 'historyPagesMenuEntry', kind: 'bridge', reads: ['handle'], host: 'gap: the host state never sets listsPages, so pv never preloads the lazy HistoryPagesMenu chunk' },
  { key: `${S20}#lv`, name: 'HistoryPagesMenu', kind: 'component', reads: ['anchor', 'direction', 'pages', 'onPick', 'onClosed'], host: 'gap: unreachable without listsPages (not provided: reaching it throws)' },
  // ---- pane toggle SY
  { key: 'c73f45bc3-C7dtUSq8.js#ry', name: 'notePaneToggleClick', kind: 'effect', reads: ['ownerId', 'pane', 'button'],
    host: 'ry writes c73f45bc3 ny (panes clicked under the pointer, read only by the titlebar fold sy / oy / ay to keep them unfolded); the host fold is the code-current titlebar-toggle-fold port (not this lane): no ny here, so one copy stays for whoever slices the 4.16336.0 fold — gap' },
  { key: 'shared-120-DCdTP1_5.js#qe', name: 'useTitlebarPanelsScope', kind: 'hook', reads: [], host: 'Vg icon size: shared-120 Ke panels scope; host: generated/code-current titlebar-panels-scope (the scope the host titlebar already reads)' },
  // ---- i18n
  { key: 'vendor-intl-BJgYK7RA.js#q', name: 'useIntl', kind: 'hook', reads: ['formatMessage'], host: 'host i18n (react-intl compatible useIntl, source-code-start-adapters.jsx useStartIntl)' },
];

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
    name: 'titlebar 4.16336.0', generator: 'extract-titlebar-v4.mjs',
    sourceContract: official, referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
    source: official.ionSource, vendor: { [official.vendorFrame]: official.reactAliases },
    generatedRoot, output,
    adapterModule: '../../titlebar-adapter.mjs', adapterFile: 'src/titlebar-adapter.mjs',
    adapters: {}, localAdapters: localAdapters(pins), sharedGraph: 'cds-core', linkedAreas, linkedCopies, modules,
  };
}

export async function readPins() { return JSON.parse(await fs.readFile(pinsPath, 'utf8')); }

export async function preflight(pins) {
  if (pins.referenceVersion !== official.referenceVersion || pins.referenceSnapshot !== official.referenceSnapshot) throw Error('pins are for another snapshot');
  for (const m of modules) {
    const want = pins.sources[m.source];
    if (!want) throw Error(`${m.source} is not pinned`);
    if (sha(await fs.readFile(path.join(official.ionSource, m.source))) !== want) throw Error(`${m.source} drifted from the pins`);
  }
  if (Object.keys(pins.sources).length !== modules.length) throw Error('pins list a chunk the generator no longer slices');
  const cache = new Map();
  const check = async (file, local, want, label, features) => {
    const src = await readSource(file, cache, official.ionSource), e = src.top.get(local);
    if (!e || e.kind === 'import') throw Error(`${label}: ${file}#${local} is not a declaration`);
    if (sha(src.code.slice(e.node.start, e.node.end)) !== want) throw Error(`${label}: ${file}#${local} declaration drifted`);
    if (features) assertFeatures(label, await featureText(src, e), features);
  };
  for (const r of roots) {
    const p = pins.roots[r.semantic];
    if (!p || p.file !== r.file || p.local !== r.local) throw Error(`root ${r.semantic} differs from the pins`);
    await check(r.file, r.local, p.declarationSha256, `root ${r.semantic}`, r.features);
  }
  if (Object.keys(pins.roots).length !== roots.length) throw Error('pins list a root the generator no longer has');
  for (const b of boundaries) {
    const p = pins.boundaries[b.key];
    if (!p || p.name !== b.name || p.kind !== b.kind) throw Error(`boundary ${b.key} differs from the pins`);
    const [f, l] = b.key.split('#'); await check(f, l, p.declarationSha256, `boundary ${b.name}`);
  }
  if (Object.keys(pins.boundaries).length !== boundaries.length) throw Error('pins list a boundary the generator no longer has');
  if (sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))) !== pins.cdsCore.manifestSha256) throw Error('src/generated/cds-core/manifest.json differs from pins.cdsCore (cds-core changed: re-run and re-pin after review)');
  if (sha(await fs.readFile(cdsCoreAdapterPath)) !== pins.cdsCore.adapterSha256) throw Error('src/cds-core-adapter.mjs differs from pins.cdsCore');
}

// The host adapter: framework identity (one React, the host's) and one dispatch export per boundary. Host capabilities come
// from installTitlebarHost(table); a missing one throws.
export function adapterSource() {
  const lines = [
    '// Generated by scripts/extract-titlebar-v4.mjs from its boundaries; edit those, never this file.',
    '// Framework identity: the host React / JSX runtime / ReactDOM (one instance, shared with cds-core-adapter.mjs).',
    "import * as React from 'react';", "import * as JSX from 'react/jsx-runtime';", "import * as ReactDOM from 'react-dom';",
    'export function loadHostReact() { return React; }', 'export const hostJsxRuntime = JSX;', 'export const hostReactDom = ReactDOM;',
    'let host = null;',
    'export function installTitlebarHost(table) { host = table; }',
    'export function titlebarHost() { return host; }',
    'function cap(name) {',
    '  if (!host || !Object.hasOwn(host, name)) throw Error(`titlebar host capability ${name} is not provided (scripts/extract-titlebar-v4.mjs boundaries)`);',
    '  return host[name];',
    '}',
  ];
  for (const b of boundaries) {
    const where = `${b.key} (${b.kind})`, n = JSON.stringify(b.name);
    if (b.kind === 'component')
      lines.push(`export function ${b.name}(props) { return React.createElement(cap(${n}), props); } // ${where}`);
    else if (b.kind === 'bridge')
      lines.push(`export const ${b.name} = Object.freeze({ ${b.reads.map(m => `get ${m}() { return cap(${n})[${JSON.stringify(m)}]; }`).join(', ')} }); // ${where}`);
    else if (b.kind === 'hook' || b.kind === 'effect')
      lines.push(`export function ${b.name}(...args) { return cap(${n})(...args); } // ${where}`);
    else throw Error(`boundary ${b.name}: unknown kind ${b.kind}`);
  }
  return lines.join('\n') + '\n';
}

export async function pinInit() {
  if (await fs.stat(pinsPath).catch(() => null)) throw Error(`${pinsPath} exists; review and delete it by hand to re-pin`);
  const cache = new Map(), oldCache = new Map();
  const decl = async (dir, c, f, local) => {
    const src = await readSource(f, c, dir); const e = src.top.get(local);
    if (!e || e.kind === 'import') throw Error(`${f}#${local} is not a declaration`);
    const exportAlias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
    return { sha256: sha(src.code.slice(e.node.start, e.node.end)), exportAlias, head: (await featureText(src, e)).split('\n')[0].trim() };
  };
  const pins = { referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, sources: {}, roots: {}, boundaries: {} };
  for (const m of modules) pins.sources[m.source] = sha(await fs.readFile(path.join(official.ionSource, m.source)));
  for (const r of roots) {
    const d = await decl(official.ionSource, cache, r.file, r.local);
    if (d.exportAlias !== r.export) throw Error(`${r.semantic}: export ${d.exportAlias}, expected ${r.export}`);
    pins.roots[r.semantic] = { file: r.file, local: r.local, export: r.export, declarationSha256: d.sha256, features: r.features };
    if (r.old) {
      const o = await decl(official.previousIonSource, oldCache, r.old.file, r.old.local);
      if (o.exportAlias !== r.old.export) throw Error(`${r.semantic} old: export ${o.exportAlias}`);
      pins.roots[r.semantic].old = { version: official.previousVersion, ...r.old, declarationSha256: o.sha256, sourceSha256: sha(await fs.readFile(path.join(official.previousIonSource, r.old.file))) };
    }
  }
  for (const b of boundaries) {
    const [f, local] = b.key.split('#');
    const d = await decl(official.ionSource, cache, f, local);
    pins.boundaries[b.key] = { name: b.name, kind: b.kind, export: d.exportAlias, declarationSha256: d.sha256, head: d.head,
      sourceSha256: sha(await fs.readFile(path.join(official.ionSource, f))) };
  }
  pins.cdsCore = { manifestSha256: sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))), adapterSha256: sha(await fs.readFile(cdsCoreAdapterPath)) };
  await fs.writeFile(pinsPath, JSON.stringify(pins, null, 2) + '\n');
  return pins;
}

export async function extractTitlebar(options = {}) {
  const pins = await readPins();
  await preflight(pins);
  const adapter = adapterSource();
  if (options.check) { if (await fs.readFile(adapterPath, 'utf8').catch(() => null) !== adapter) throw Error('src/titlebar-adapter.mjs differs from the generator boundaries'); }
  else if (!options.dryRun) await fs.writeFile(adapterPath, adapter);
  return runSlicer({ ...sliceConfig(pins),
    artifacts: async m => ({ 'provenance.json': JSON.stringify({
      referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
      pins: 'scripts/titlebar-v4.pins.json', roots: pins.roots, boundaries: pins.boundaries, cdsCore: pins.cdsCore, adapterSha256: sha(adapter),
      linkedAreas, linkedCopies,
      sharedGraphImports: [...new Set(m.modules.flatMap(x => x.imports.filter(i => i.kind === 'shared-graph').map(i => `${i.name} <- ${i.via}`)))].sort(),
      linkedImports: [...new Set(m.modules.flatMap(x => x.imports.filter(i => i.kind === 'linked').map(i => `${i.name} <- ${i.via} (${i.from})`)))].sort(),
      heldByCdsCore: Object.fromEntries(m.modules.filter(x => x.heldByViewTabs.length).map(x => [x.target, x.heldByViewTabs.length])),
      initializers: Object.fromEntries(m.modules.filter(x => x.initializers.length).map(x => [x.target, x.initializers])),
    }, null, 2) + '\n' }) }, options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--pin-init')) { const p = await pinInit(); console.log('pinned', Object.keys(p.sources).length, 'sources', Object.keys(p.roots).length, 'roots', Object.keys(p.boundaries).length, 'boundaries'); }
  else await extractTitlebar({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
