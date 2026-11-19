// Composer session chin, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104 round 3 relink rl-composer, task C1;
// surfaces-prod-3/composer/relink-prep/plan.json C1-x6-chin-slice, relink-plan CR2): the official chin component an open
// session's composer renders, cut from the frozen 4.16336.0 snapshot into its own graph src/generated/composer-chin-v4 (a
// new graph, so code-composer-v4's manifest and its downstream graphs stay byte for byte as they are).
//
//   composer-session-chin.mjs  c227f4d5e-DGDdGBTz X6 (the chunk's export g) as ComposerSessionChin: the chin of the
//                       Code composer in its four layouts (c73f45bc3 $x(e, layout): "chin" rS, "rail" iS, "row" aS,
//                       "titlebar" oS). In the row (`tt = layout === "row"`) the leading is an empty aria-hidden span while
//                       there is a mode picker, the trailing is `div.Be(fp, "gap-1", Nn, Pn)` (the 24px control / 6px pad /
//                       13px-20px body variables and "compact:me-1") holding [En footer indicator, Ee, dn the model selector
//                       (renderModelSelector, placement "row"), Dn, On the mode picker (Y6 → k6, a CDS Menu), Te, kn the
//                       usage ring (w3), xn the Fast mode status + Q6 announcement, An], inside `tl.Chin {className: mp}`.
//                       Its own closure: Y6 / k6 / A6 / M6 (the mode picker and its menu rows), J6 (the loading label),
//                       N6 (footer indicator), P6 (manual-mode warning copy), Q6 (announcement), e8, K6 (the 5 s chord
//                       window), G6, q6, UE; shared-1 j3…q3, shared-212 SU…OU, shared-33 wb, shared-62 no, cfca6870a,
//                       cf059c6df (pure helpers; a bounded dry-run over the real tree, wave-7 cds-core 79b004e0, found 7
//                       modules / 36 bindings / 0 module state / 0 import writes:
//                       analysis/…/round3/relink/rl-composer/chin-bounded-real.json).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, unchanged):
//   - sourceContract scripts/official-4.16336.0.mjs; sharedGraph 'cds-core' (CdsButton / CdsTooltip / CdsMenu / CdsIcon /
//     CdsLoadingSkeleton / CdsSkeleton / cdsClassNames, scopedStoreRegistry …), its reviewed manifest sha256 pinned
//     (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1): code-composer-v4 (R6 useComposerFinalFocus, j6 ModeTriggerLabel, the shared-38 chin tokens,
//     cfca6870a dockGlyphProps), routines-shared-v4 (the React Compiler memo helpers of shared-frame, vendor-intl tn,
//     shared-33 Cb, shared-0 dF), files-changes-v4 (shared-18 popoverCollisionPadding), session-rail-kit-v4 (c227f4d5e tE,
//     the rail-host context X6 reads with `I(tE)`; nothing in the host provides it, so X6 takes its `_t === void 0` branch).
//     Every binding one of them holds and exports is imported from it, never cut again (relink-plan CR2: new consumers may
//     link these graphs; their old consumers' switch stays at batch 11);
//   - host boundaries as localAdapters (file#local -> the export of src/source-composer-chin-adapters.jsx): the picker
//     state W6, the usage ring w3, the gated rail / dictation / plus / coordinator / engine-footer branches, the session
//     query pR, the route context Q3 / m6, the platform gate FH (the frame graph's useIsDesktopApp), the ChatComposer
//     compound hh (code-composer-v4's Chin) and vendor-intl useIntl (the composer's host intl). Each original is pinned by
//     features and by its raw declaration sha256 (ADAPTER_PINS).
// The root is located on the official AST: the only top-level declaration of its chunk whose raw text has the probe and
// whose prettier form carries every feature, under the reviewed local and export alias, its raw declaration sha256 pinned
// (ROOT_PINS). No pin is ever refreshed by a script (`--locate` prints them for review).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const COMPOSER_CHIN_V4_OUTPUT = 'src/generated/composer-chin-v4';
const ADAPTER_FILE = 'src/source-composer-chin-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 7, cds-integrate/wave7/apply-real.json).
export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

export const COMPOSER = 'c227f4d5e-DGDdGBTz.js';
const CALLER = 'c73f45bc3-C7dtUSq8.js';

// ── Root: file -> local -> { name, export (the chunk's own alias), probe (raw), features (prettier) } ───────────────────
export const ROOTS = {
  [COMPOSER]: {
    X6: { name: 'ComposerSessionChin', export: 'g', probe: 'sharedEffortOptionCount:u',
      features: ['renderModelSelector: l,', 'hideContextRing: E,', 'modePickerAnchorRef: we,', 'layout: je,', 'tt = Ze === "row",', '_t = I(tE),',
        'p("span", { "aria-hidden": !0 })', '_(T, { children: [En, Ee, dn, Dn, On, Te, kn, xn, An] })', 'Pn = tt && "compact:me-1"',
        'Be(fp, "gap-1", Nn, Pn)', '_(tl.Chin, {', 'leading: Sn,', 'trailing: In,', 'children: [Tn, ke, Ae],'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of the root.
export const ROOT_PINS = {
  'c227f4d5e-DGDdGBTz.js#X6': 'f54d3bebfa1bd432c0305e7038e7b1822f9bb7d10b1b9a936d373c41859d8378',
};
// Declarations of X6's closure whose raw sha256 consumers pin through this graph's manifest (code-composer-v4 contract4
// composer-row-chin.mjs reads them instead of chunk feature strings): J6 is in the closure, O3 is w3's trigger (w3 is a
// host boundary here; the host ring follows O3).
export const PINNED_DECLARATIONS = ['J6', 'O3'];

// ── Host boundaries: file#local -> { name (export of the adapter module), features } ─────────────────────────────────
const C = COMPOSER;
export const HOST_ADAPTERS = {
  [`${C}#W6`]: { name: 'useComposerChinPickers', features: ['effortInModelMenu: o,', 'chordRelay: d,', 'numberedModeItems: de,', 'permissionModeMenuItems: fe,'] },
  [`${C}#w3`]: { name: 'ComposerChinUsageRing', features: ['projectUsageSlots: o,', 'explainAutoCompact: c,'] },
  [`${C}#L6`]: { name: 'ComposerRailPickerKeys', features: ['{ owned: t, host: n, pickerOpen: r, disabled: i, requestOpen: a } = e'] },
  [`${C}#$6`]: { name: 'ComposerDictationButton', features: ['hideDictation: t,', 'onSwitchDictationDevice: o,'] },
  [`${C}#wJ`]: { name: 'ComposerChinPlusMenu', features: ['plusMenuScopeKey: o,', 'supportsFileAttachments: n,'] },
  [`${C}#C6`]: { name: 'useEngineFooterRegistry', features: ['return fg(zx, x6(e));'] },
  [`${C}#O6`]: { name: 'ComposerCoordinatorToggle', features: ['A(D6)'] },
  [`${C}#nD`]: { name: 'ComposerRailModelRow', features: ['modelName: t, effortName: n, footer: r, children: i'] },
  [`${C}#tD`]: { name: 'ComposerRailModeRow', features: ['{ name: t, children: n } = e'] },
  [`${C}#m6`]: { name: 'isComposerOnRoute', features: ['(n) => p6(n, e, t)'] },
  [`${C}#Q3`]: { name: 'useComposerRouteContext', features: ['return I(X3);'] },
  'c5da7eb42-aEqbSKbC.js#pR': { name: 'useSessionHidesModePicker', features: ['select: ZL'] },
  'shared-0-CnnWnVrT.js#FH': { name: 'useIsDesktopApp', features: ['PH.get(i)', 'wI(window.navigator.userAgent, { version: t, platform: n })'] },
  'shared-5-u8kha2eH.js#hh': { name: 'ComposerChinShellParts', features: ['Object.assign(mh, xm)'] },
  [`${official.vendorIntl}#q`]: { name: 'useComposerIntl', features: ['l(K)'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original (`--locate` prints them).
export const ADAPTER_PINS = {
  [`${C}#W6`]: '77813eb5452c7c11bce0396801ca3830aa1a0326007a518ef1481c40b6b32320',
  [`${C}#w3`]: '5c6bd88a7f150d06802a37d93609ddf7ff5e11db47e9085d0e2e7a9a3af60d6c',
  [`${C}#L6`]: '9ceeb55c811eee2ce830bc85e9c1a69ca745e1a79c9269d4d062be1110573b04',
  [`${C}#$6`]: 'ace6b463cec4579030f07540a0e85ee1063b3438a50423da92e20aaf01347190',
  [`${C}#wJ`]: '1e9090e7c76e81247e8807cdb7dc6db36d3a492af72cedb12dbf0bb3eb810a22',
  [`${C}#C6`]: 'f3d8636d06a34e25afdf07e61984231553dcb3d5e3095c24a0fe1e0f95fcd76b',
  [`${C}#O6`]: '68063950fd34baec9b9c5bf9559fbfc9aa5145e06dc01ee35403ad1c0c64bdc8',
  [`${C}#nD`]: 'ff2e782b72c2b87747b80ace3a600f586d2ca86709d9e960920734c80fe1f8c7',
  [`${C}#tD`]: '46249ac4161aa997f3c18f3712db979f26d880112214a93387cd6357e027a41d',
  [`${C}#m6`]: '72ef00540ed01b7d86173028edae1be24e90968fd556c74bd89c3ecd8dc10e42',
  [`${C}#Q3`]: 'fcd973311516629d70235b442d9708fa66559c35270ab7471220475ef8846a74',
  'c5da7eb42-aEqbSKbC.js#pR': '4e6fb67fe93bd0ead0af65a9d00ff515a1e028e5287fa0d9d4b7458e992fce1b',
  'shared-0-CnnWnVrT.js#FH': '48c5ac390eae53e7b9a93536657c342305c74ce97cafa85a7f0f17dd88cbec31',
  'shared-5-u8kha2eH.js#hh': '588a6b0b6a5bc824723311ed59236f99abb15d3ffb794fdbd157d4e5fc27a856',
  [`${official.vendorIntl}#q`]: 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!Object.hasOwn(ADAPTER_PINS, key)) throw Error(`adapter ${key}: no reviewed pin`);

const linkedCopies = {};
export const LINKED_AREAS = ['code-composer-v4', 'routines-shared-v4', 'files-changes-v4', 'session-rail-kit-v4'];
const modules = [
  { source: COMPOSER, target: 'composer-session-chin.mjs', exports: { X6: 'ComposerSessionChin' }, features: { X6: ROOTS[COMPOSER].X6.features } },
  // The originals the root reads that no linked graph exports, one module per chunk (listing a chunk the closure never
  // enters, or entering one not listed, stops generation).
  { source: 'shared-1-D1bGaTaN.js', target: 'shared-1.mjs' },
  { source: 'shared-212-BHMAi0oa.js', target: 'shared-212.mjs' },
  { source: 'shared-33-DtdykY0y.js', target: 'shared-33.mjs' },
  { source: 'shared-62-DoCqVpIq.js', target: 'shared-62.mjs' },
  { source: 'cfca6870a-CdqZXIck.js', target: 'cfca6870a.mjs' },
  { source: 'cf059c6df-B32mQ24C.js', target: 'cf059c6df.mjs' },
];

// Pinned on the minified bytes (each exactly once): the session composer's row chin is X6 with layout "row" (c73f45bc3 aS),
// falling back to an empty Chin of the same class while $x has no session.
const rawCallSites = [
  { source: CALLER, role: 'c73f45bc3 aS: the open session\'s row chin renders X6 through $x(e, "row"), else an empty Chin with the row class',
    features: ['aS=Cr(c(function(e){return $x(e,"row")??r(Sr.Chin,{className:"-mt-1.5 -mb-2.5 md:-my-2"'] },
  { source: CALLER, role: 'c73f45bc3 $x: the row layout marks the scope store pickerRowMounted while mounted',
    features: ['l=t==="row"', 'n.setState({pickerRowMounted:!0})'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

export async function locateRoots(cache = new Map()) {
  const found = [];
  for (const [file, roots] of Object.entries(ROOTS)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(roots)) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      if (hits.length !== 1) throw Error(`${file} ${local} (${spec.name}): ${hits.length} top-level declarations carry its features, expected 1`);
      const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
      if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`);
      const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
      if (alias !== spec.export) throw Error(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = ROOT_PINS[`${file}#${local}`];
      if (pin === undefined) throw Error(`${file}#${local}: no reviewed pin`);
      if (pin !== null && pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, export: alias, declarationSha256, pinned: pin !== null });
    }
  }
  return found;
}

export async function pinAdapters(cache = new Map()) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (pin !== null && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: ADAPTER_FILE, declarationSha256, pinned: pin !== null });
  }
  return out;
}

// Raw sha256 of the declarations consumers pin through this manifest (PINNED_DECLARATIONS, all in c227f4d5e).
async function pinnedDeclarations(cache = new Map()) {
  const src = await readSource(COMPOSER, cache, official.ionSource);
  return Object.fromEntries(PINNED_DECLARATIONS.map(local => {
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`${COMPOSER}#${local} is not a declaration`);
    return [`${COMPOSER}#${local}`, sha(rawText(src, entry))];
  }));
}

// The adapter module exports every adapted name (and nothing the graph does not adapt, besides the host context).
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Set();
  for (const m of text.matchAll(/export (?:const|function|async function) ([\w$]+)/g)) exported.add(m[1]);
  for (const m of text.matchAll(/export \{([^}]*)\} from "[^"]+";/g)) for (const n of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.add(n);
  const wanted = new Set(Object.values(HOST_ADAPTERS).map(a => a.name));
  for (const name of wanted) if (!exported.has(name)) throw Error(`${ADAPTER_FILE} does not export ${name}`);
  for (const name of exported) if (!wanted.has(name) && name !== 'ComposerChinHostContext') throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the composer-chin-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function composerChinV4Config() {
  return {
    name: 'composer session chin (4.16336.0)', generator: 'extract-composer-chin-v4.mjs', output: path.join(root, COMPOSER_CHIN_V4_OUTPUT),
    adapterModule: '../../source-composer-chin-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, callSites: [], rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
export const probeConfig = composerChinV4Config;

export async function extractComposerChinV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  for (const r of roots) if (!r.pinned) throw Error(`root ${r.file}#${r.local}: unpinned (review it with --locate)`);
  for (const a of adapters) if (!a.pinned) throw Error(`adapter ${a.original}: unpinned (review it with --locate)`);
  await assertAdapterModule();
  const pinned = await pinnedDeclarations(cache);
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...composerChinV4Config(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic name for the composer session chin root (${official.referenceVersion}); generated by extract-composer-chin-v4.mjs.\n`
          + 'export { ComposerSessionChin } from "./composer-session-chin.mjs";\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-composer-chin-v4.mjs',
          previous: { host: 'src/source-composer-row-chin.jsx + src/source-composer.jsx (X6 row transcription, pinned by code-composer-v4 contract4 composer-row-chin.mjs chunkFeatures)' },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, adapters, pinnedDeclarations: pinned, linkedCopies,
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    for (const f of await locateRoots()) console.log('root', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const a of await pinAdapters()) console.log('adapter', a.original, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
    for (const [k, v] of Object.entries(await pinnedDeclarations())) console.log('declaration', k, v);
  } else await extractComposerChinV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
