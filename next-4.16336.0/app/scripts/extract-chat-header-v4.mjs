// Production generator of the Chat top bar (OpenClaude v0.3 → Claude Desktop 4.16336.0; surfaces wave 2, chat-header lane,
// analysis/claude-4.16336.0-migrate-20261104/surfaces-prod-2/chat-header/report.json). Slices, with runSlicer
// (scripts/extract-working-line.mjs) and the finalized cds-core shared graph (sharedGraph 'cds-core'):
//   shared-20 Yw  DesktopTopBar (export Ra): the desktop top bar slot (`nr()` has-top-bar gate, isMac / isWco) around Xw, the
//                 row shared-23 QA draws as `d(ud, { replacesFrameHeader: D })` while the window is incognito (E = n && !o &&
//                 (!l || r)): traffic-light spacer, the incognito label (shared-140 Xl GhostFilled + "Incognito chat") in the
//                 middle, and the trailing Zw / $w slots. 3.6556.2 counterpart shared-20 Fy (host hand port
//                 src/source-incognito-shell.jsx SourceIncognitoTopBar, replaced by this slice).
//   shared-20 Zw  TopBarIncognitoToggle (export za): `if (n || !(s || r) || !r) return null` — drawn only while incognito
//                 (r = incognitoModeEnabled), then Ix. The not-enabled "Use incognito" ghost of the user's screenshot 03 has
//                 no render path in this frozen bundle (Ix is called only by Zw and Lx, both return null unless enabled);
//                 see the lane report (1P desktop loads https://claude.ai, getMainWindowUrl → anthropicOriginUrl()).
//   shared-20 Ix  IncognitoToggle (internal): CdsRoot of the opposite mode > CdsTooltip {hoverable:false, shortcut} > ghost
//                 iconOnly CdsButton, icon "X" while enabled (shared-140 ql animated Ghost otherwise), aria-label "Exit
//                 incognito" / "Use incognito", disabled with CdsDisabledReason "End the voice session first" while a
//                 voice session holds (shared-1 AP). 3.6556.2 counterpart shared-20 Qg.
// The incognito frame (shared-20 lT's `incognito-frame`) and the shell grid (shared-23 QA / JA) stay host code
// (source-incognito-shell.jsx) in this lane: lT reads vendor-motion and the fizzy-lake panels; recorded as remaining.
//
// Child surfaces, stores and desktop services stop at `boundaries`: each official declaration (chunk#local) becomes a named
// host capability of src/chat-header-adapter.mjs (written here, deterministic; --check compares it), answered by
// src/chat-header-host.jsx (installChatHeaderHost). A capability the host does not provide throws at use; an `unreachable`
// one throws when entered (a wrong host answer surfaces instead of rendering nothing).
// D1: shared-11 pn (useWindowChrome) and Mr (traffic lights follow the language) are frame-sidebar's (window-chrome.mjs,
// linkedAreas): one copy. So are shared-0 IH / uI / _e (frame-sidebar shared-0.mjs): uI reads the RTL language Set lI,
// which the D1 gate counts as state, so it is linked, never sliced twice (only the no-op ve is a linkedCopies copy). shared-20 hv (Back / Forward) is the titlebar lane's slice: a boundary here (unreachable while
// incognito), never a second copy of the official history store. shared-19's main-view zoom store (bA / _A / vA, read by
// dA only on Windows / Linux window-controls-overlay) is held by this graph alone (no other graph slices it).
//
// Pins (scripts/chat-header-v4.pins.json, written once by --pin-init, then reviewed and fixed): the snapshot chunk sha256 of
// every listed module, each root's and boundary's declaration sha256 (+ head line), the old 3.6556.2 counterparts, the
// finalized cds-core (manifest + adapter sha256). Any drift stops generation; a changed pin is a review decision.
//
//   node --max-old-space-size=4096 scripts/extract-chat-header-v4.mjs [--check | --dry-run | --pin-init]
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import * as official from './official-4.16336.0.mjs';

const app = path.resolve(import.meta.dirname, '..');
const sha = b => createHash('sha256').update(b).digest('hex');
export const generatedRoot = path.join(app, 'src/generated');
export const output = path.join(generatedRoot, 'chat-header');
export const adapterPath = path.join(app, 'src/chat-header-adapter.mjs');
export const pinsPath = path.join(import.meta.dirname, 'chat-header-v4.pins.json');
const cdsCoreAdapterPath = path.join(app, 'src/cds-core-adapter.mjs');
export const S20 = 'shared-20-DUEo90UF.js';

// Roots: semantic name, AST-unique features (prettier form), official export alias (null: chunk-internal), and the old
// 3.6556.2 counterpart, re-checked at --pin-init.
export const roots = [
  { semantic: 'DesktopTopBar', file: S20, local: 'Yw', export: 'Ra',
    features: ['i(Xw, { isMac: r, isWco: a, replacesFrameHeader: e.replacesFrameHeader })', 'K0($, 0, { platform: "mac" })'],
    old: { file: 'shared-20-mUr7IqZY.js', local: 'Py', export: 'Li' } },
  { semantic: 'DesktopTopBarRow', file: S20, local: 'Xw', export: null,
    features: ['"data-testid": "desktop-topbar-sidebar-toggle"', 'defaultMessage: "Hide sidebar"', '"w-[69px] shrink-0"', '"w-[77px] shrink-0"', '"flex items-center gap-2 text-bg-000"', '"text-sm select-none"', '"flex-1 flex items-center justify-end"'],
    old: { file: 'shared-20-mUr7IqZY.js', local: 'Fy', export: null } },
  { semantic: 'TopBarIncognitoToggle', file: S20, local: 'Zw', export: 'za',
    features: ['Jn("incognito")', 'if (n || !(s || r) || !r) return null;', 'tooltipSide: l,', 'className: "draggable-none",'],
    old: { file: 'shared-20-mUr7IqZY.js', local: 'Iy', export: 'Ri' } },
  { semantic: 'IncognitoToggle', file: S20, local: 'Ix', export: null,
    features: ['defaultMessage: "Exit incognito"', 'defaultMessage: "Use incognito"', 'defaultMessage: "End the voice session first"', 'hoverable: !1,', 'className: "contents",'],
    old: { file: 'shared-20-mUr7IqZY.js', local: 'Qg', export: null } },
];

const targets = {
  [S20]: 'top-bar.mjs', 'shared-140-DfG6VwpK.js': 'icons.mjs', 'shared-19-UalAfDtn.js': 'titlebar-area.mjs',
  'shared-123-1Hc1RTKl.js': 'chat-title-messages.mjs', [official.sharedFrame]: 'shared-frame.mjs',
};
// Every chunk the bounded closure enters (the slicer fails on an unlisted or unused chunk).
export const chunks = [S20, 'shared-140-DfG6VwpK.js', 'shared-19-UalAfDtn.js', 'shared-123-1Hc1RTKl.js', 'shared-0-CnnWnVrT.js',
  'shared-1-D1bGaTaN.js', 'shared-62-DoCqVpIq.js', official.vendorIntl, official.sharedFrame];

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

// D1: useWindowChrome (shared-11 pn) and the traffic-lights-follow-language store hook (Mr) are frame-sidebar's.
export const linkedAreas = [{ area: 'frame-sidebar', modules: ['window-chrome.mjs', 'shared-0.mjs'] }];
// Pure bindings frame-sidebar/shared-0.mjs slices without exporting, sliced again here (no state: D1 checks them).
export const linkedCopies = {
  'shared-0-CnnWnVrT.js#ve': 'function ve(){} — the no-op unsubscribe of the he() closure store and _e()',
};

// Host boundaries: official declarations (chunk#local of the 4.16336.0 snapshot) the slice does not copy. Kinds as in
// scripts/extract-frame-sidebar-v4.mjs (component / hook / bridge); `unreachable: true` dispatches throw when entered.
export const boundaries = [
  // ---- i18n (react-intl over the host catalog)
  { key: 'vendor-intl-BJgYK7RA.js#q', name: 'useIntl', kind: 'hook', reads: ['formatMessage'], host: 'host i18n (react-intl compatible useIntl, source-code-start-adapters.jsx useStartIntl)' },
  { key: 'vendor-intl-BJgYK7RA.js#Gt', name: 'FormattedMessage', kind: 'component', reads: ['id', 'defaultMessage', 'values'], host: 'host i18n <StartMessage> (source-code-start-adapters.jsx): Xw renders `i(X, { ...c.incognito })` (shared-123 Oh / kh "Incognito chat")' },
  // ---- platform / desktop
  { key: 'shared-0-CnnWnVrT.js#FH', name: 'useIsDesktopApp', kind: 'hook', reads: ['platform', 'version'], host: "the frame-sidebar host's answer (frame-sidebar-host.jsx HOST_ANSWERS.useIsDesktopApp: Electron desktop, platform from main.jsx frameHost), so Je and the linked useWindowChrome read one platform fact" },
  { key: 'shared-1-D1bGaTaN.js#YI', name: 'useHasDesktopTopBar', kind: 'hook', reads: [], host: 'YI = tn() && claude.web feature "desktopTopBar" supported: the host draws its desktop top bar row (the incognito shell, source-incognito-shell.jsx) → true' },
  { key: 'shared-0-CnnWnVrT.js#uO', name: 'WindowState', kind: 'bridge', reads: ['getFullscreen', 'onFullscreenChanged', 'getZoomFactor', 'onZoomFactorChanged'], host: "shared-19 CA / kA (main-view zoom store: zoom factor and fullscreen) read it only on a Windows / Linux window-controls overlay (dA's dt()); the frame-sidebar host's WindowState object (frame-sidebar-host.jsx HOST_ANSWERS.WindowState), one object" },
  { key: 'shared-1-D1bGaTaN.js#I9', name: 'WindowControlsMenu', kind: 'component', reads: ['inverted'], unreachable: true, host: 'the Windows / Linux window-controls-overlay menu ($n), drawn only when isWco (IH: windows || linux desktop); the host is the macOS desktop (hiddenInset traffic lights)' },
  // ---- route / mode
  { key: 'shared-25-D-aF0gt9.js#rd', name: 'useRoutePathnameSelector', kind: 'hook', reads: ['selector'], host: 'Ft(Kw): selector over the host route pathname (the shell is mounted for Chat only: "/new" on the incognito New chat page, "/chat/<id>" in an incognito chat)' },
  { key: 'shared-2-CsjIBQD8.js#u0', name: 'useRouterPathnameSelector', kind: 'hook', reads: ['selector'], host: 'au(qw): the same host route pathname as useRoutePathnameSelector' },
  { key: 'shared-123-1Hc1RTKl.js#FS', name: 'useIsAgentRoute', kind: 'hook', reads: [], host: 'FS: Cowork / local-session (agent) route; the incognito shell exists for Chat only (main.jsx incognitoActive = mode === "chat" && …) → false' },
  // ---- incognito / sidebar / shortcuts / voice
  { key: 'shared-1-D1bGaTaN.js#MP', name: 'useIncognitoMode', kind: 'hook', reads: ['incognitoModeEnabled', 'setIncognitoModeEnabled'], host: 'host incognito (main.jsx incognitoArm / chat-incognito-model.mjs, a local chat deleted when left): enabled = the shell is active; set(next) toggles through incognitoKey when next differs' },
  { key: 'shared-1-D1bGaTaN.js#kE', name: 'useSidebarExpanded', kind: 'hook', reads: ['isExpanded', 'setIsExpanded'], host: 'while incognito the frame shell and its sidebar are unmounted (shared-23 JA wa / host frameShellMounted) → isExpanded false; Xw writes it only from the sidebar toggle it draws when not incognito (setIsExpanded throws: unreachable)' },
  { key: 'shared-1-D1bGaTaN.js#C6', name: 'useShortcut', kind: 'hook', reads: ['incognito'], host: 'host shortcut table: incognito is ⇧⌘I in Chat (main.jsx capture listener, shared-21 oO) → shortcutString "cmd+shift+i" (shared-1 T6 form); other ids are not asked here' },
  { key: 'shared-1-D1bGaTaN.js#AP', name: 'useVoiceSessionHoldsIncognito', kind: 'hook', reads: [], host: 'AP = a voice session (shared-1 ON: QA isActive || aA voiceStartPending, not owned elsewhere) holds the toggle; the host has no voice mode service → false (the official enabled branch)' },
  // ---- child slots
  { key: `${S20}#Qw`, name: 'TopBarModeSelect', kind: 'component', reads: [], unreachable: true, host: 'Xw draws the mode select only when not incognito (H = T ? label : Qw); the host mounts the top bar only while incognito (shell active)' },
  { key: `${S20}#hv`, name: 'TopBarHistoryNav', kind: 'component', reads: [], unreachable: true, host: 'Xw draws Back / Forward (hv, sliced by the titlebar lane, generated/titlebar) only beside the sidebar toggle when not incognito' },
  { key: `${S20}#$w`, name: 'TopBarActivityPanelToggle', kind: 'component', reads: [], host: '$w returns null unless Mi() (shared-123 IS: a local-session agent route); the shell is Chat only → renders nothing (official null branch)' },
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
    name: 'chat-header 4.16336.0', generator: 'extract-chat-header-v4.mjs',
    sourceContract: official, referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
    source: official.ionSource, vendor: { [official.vendorFrame]: official.reactAliases },
    generatedRoot, output,
    adapterModule: '../../chat-header-adapter.mjs', adapterFile: 'src/chat-header-adapter.mjs',
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
    // AST uniqueness: the root is the only top-level declaration of its chunk carrying every feature.
    // (each top-level name on its own: one `var` statement may declare several of them, e.g. `var Yw = f(…), Xw = f(…)`)
    const src = await readSource(r.file, cache, official.ionSource), matches = [];
    for (const [name, e] of src.top) {
      if (e.kind === 'import') continue;
      const text = await featureText(src, e);
      try { assertFeatures(name, text, r.features); matches.push(name); } catch { /* not this declaration */ }
    }
    if (matches.length !== 1 || matches[0] !== r.local) throw Error(`root ${r.semantic}: features match ${JSON.stringify(matches)}, expected only ${r.local}`);
  }
  if (Object.keys(pins.roots).length !== roots.length) throw Error('pins list a root the generator no longer has');
  for (const b of boundaries) {
    const p = pins.boundaries[b.key];
    if (!p || p.name !== b.name || p.kind !== b.kind || (p.unreachable ?? false) !== (b.unreachable ?? false)) throw Error(`boundary ${b.key} differs from the pins`);
    const [f, l] = b.key.split('#'); await check(f, l, p.declarationSha256, `boundary ${b.name}`);
  }
  if (Object.keys(pins.boundaries).length !== boundaries.length) throw Error('pins list a boundary the generator no longer has');
  if (sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))) !== pins.cdsCore.manifestSha256) throw Error('src/generated/cds-core/manifest.json differs from pins.cdsCore (cds-core changed: re-run and re-pin after review)');
  if (sha(await fs.readFile(cdsCoreAdapterPath)) !== pins.cdsCore.adapterSha256) throw Error('src/cds-core-adapter.mjs differs from pins.cdsCore');
}

// The host adapter: framework identity (one React, the host's) and one dispatch export per boundary. Host capabilities come
// from installChatHeaderHost(table); a missing one throws, an unreachable one throws when entered.
export function adapterSource() {
  const lines = [
    '// Generated by scripts/extract-chat-header-v4.mjs from its boundaries; edit those, never this file.',
    '// Framework identity: the host React / JSX runtime / ReactDOM (one instance, shared with cds-core-adapter.mjs).',
    "import * as React from 'react';", "import * as JSX from 'react/jsx-runtime';", "import * as ReactDOM from 'react-dom';",
    'export function loadHostReact() { return React; }', 'export const hostJsxRuntime = JSX;', 'export const hostReactDom = ReactDOM;',
    'let host = null;',
    'export function installChatHeaderHost(table) { host = table; }',
    'export function chatHeaderHost() { return host; }',
    'function cap(name) {',
    '  if (!host || !Object.hasOwn(host, name)) throw Error(`chat-header host capability ${name} is not provided (scripts/extract-chat-header-v4.mjs boundaries)`);',
    '  return host[name];',
    '}',
    'function unreachable(name) {',
    '  throw Error(`chat-header: ${name} was entered, but the host contract excludes it (scripts/extract-chat-header-v4.mjs boundaries)`);',
    '}',
  ];
  for (const b of boundaries) {
    const where = `${b.key} (${b.kind}${b.unreachable ? ', unreachable' : ''})`, n = JSON.stringify(b.name);
    if (b.unreachable && b.kind === 'component')
      lines.push(`export function ${b.name}() { return unreachable(${n}); } // ${where}`);
    else if (b.kind === 'component')
      lines.push(`export function ${b.name}(props) { return React.createElement(cap(${n}), props); } // ${where}`);
    else if (b.kind === 'bridge')
      lines.push(`export const ${b.name} = Object.freeze({ ${b.reads.map(m => `get ${m}() { return cap(${n})[${JSON.stringify(m)}]; }`).join(', ')} }); // ${where}`);
    else if (b.kind === 'hook')
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
      if (o.exportAlias !== r.old.export) throw Error(`${r.semantic} old: export ${o.exportAlias}, expected ${r.old.export}`);
      pins.roots[r.semantic].old = { version: official.previousVersion, ...r.old, declarationSha256: o.sha256, sourceSha256: sha(await fs.readFile(path.join(official.previousIonSource, r.old.file))) };
    }
  }
  for (const b of boundaries) {
    const [f, local] = b.key.split('#');
    const d = await decl(official.ionSource, cache, f, local);
    pins.boundaries[b.key] = { name: b.name, kind: b.kind, ...(b.unreachable ? { unreachable: true } : {}), export: d.exportAlias, declarationSha256: d.sha256, head: d.head,
      sourceSha256: sha(await fs.readFile(path.join(official.ionSource, f))) };
  }
  pins.cdsCore = { manifestSha256: sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))), adapterSha256: sha(await fs.readFile(cdsCoreAdapterPath)) };
  await fs.writeFile(pinsPath, JSON.stringify(pins, null, 2) + '\n');
  return pins;
}

export async function extractChatHeader(options = {}) {
  const pins = await readPins();
  await preflight(pins);
  const adapter = adapterSource();
  if (options.check) { if (await fs.readFile(adapterPath, 'utf8').catch(() => null) !== adapter) throw Error('src/chat-header-adapter.mjs differs from the generator boundaries'); }
  else if (!options.dryRun) await fs.writeFile(adapterPath, adapter);
  return runSlicer({ ...sliceConfig(pins),
    artifacts: async m => ({ 'provenance.json': JSON.stringify({
      referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, migrationComplete: false,
      scope: 'Chat desktop top bar while incognito (Yw / Xw), its incognito toggle (Zw / Ix); the incognito frame and shell grid stay host code',
      pins: 'scripts/chat-header-v4.pins.json', roots: pins.roots, boundaries: pins.boundaries, cdsCore: pins.cdsCore, adapterSha256: sha(adapter),
      linkedAreas,
      sharedGraphImports: [...new Set(m.modules.flatMap(x => x.imports.filter(i => i.kind === 'shared-graph').map(i => `${i.name} <- ${i.via}`)))].sort(),
      linkedImports: [...new Set(m.modules.flatMap(x => x.imports.filter(i => i.kind === 'linked').map(i => `${i.name} <- ${i.via} (${i.from})`)))].sort(),
      heldByCdsCore: Object.fromEntries(m.modules.filter(x => x.heldByViewTabs.length).map(x => [x.target, x.heldByViewTabs.length])),
    }, null, 2) + '\n' }) }, options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--pin-init')) { const p = await pinInit(); console.log('pinned', Object.keys(p.sources).length, 'sources', Object.keys(p.roots).length, 'roots', Object.keys(p.boundaries).length, 'boundaries'); }
  else await extractChatHeader({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
