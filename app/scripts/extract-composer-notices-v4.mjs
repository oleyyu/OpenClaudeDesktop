// Composer notices, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2 batch 5, region
// composer-notices): the same semantic roots extract-composer-notices.mjs cuts from 3.6556.2 into
// src/generated/composer-notices, cut from the frozen 4.16336.0 snapshot into the isolated graph
// src/generated/composer-notices-v4. The 3.6556.2 output is untouched (staged double output; no production switch:
// src/source-session-notices.jsx and the session rail keep reading src/generated/composer-notices).
//
//   shared-26-B-POtn5S  bH  ChatComposerNotices (export li; 3.6556.2 shared-26 RM): the notice stack the Code session's
//                           notice region mounts (cc43287c9-dzfX-J5i bSe `p(uc, { items: c, onDismiss: l })`). New since
//                           3.6556.2: the stack reads its dock primitives from its own chunk (shared-26 em / nm / am …,
//                           3.6556.2 shared-1 _d / yd / Dd / Od), takes onShown / masked / cardAbove /
//                           onOccupancyChange, and its banner row _H is a class-guarded focus hand-back (mH, dH / fH).
//                       uH  ChatComposerBand (export ui; 3.6556.2 kM): the CDS Banner with the composer calibration (lH
//                           over the composer layout context's startInset), role none, "@container". A linked root
//                           (LINKED_ROOTS): cowork-scheduled-v4 already slices it; index.mjs re-exports that copy.
//   c227f4d5e-DGDdGBTz  iR  CodeNoticeSlotsProvider (export Oa; 3.6556.2 cI)   oR useCodeNoticeSlot (Aa; uI)
//                       XL  CodeNoticeRegionContext (Ma; eI)                  ZL useInCodeNoticeRegion (Na; tI)
//                       uR  useCodeNoticeSlotEntries (ka; mI)                 $L CODE_NOTICE_SLOT_ORDER (Da; rI; new slot
//                           "tokenLimit", "effort" gone)
//                       OV  useScopeStoreNotice (fi; pY)   wV TURN_TAIL_NOTICE_PLACEMENT (ci; lY)
//                       TV  tailSessionNotice (di; uY; new "pausedNotice" between sleep and refusal fallback)
//   shared-6-2QYRw_Wv   nv  CodeBandRow (export xa; 3.6556.2 kT): the band row over ChatComposerBand.
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs; sharedGraph 'cds-core' (cds-core manifest sha256 pinned,
//     CDS_CORE_MANIFEST_SHA256); linkedAreas (D1, plan.json composer-notices `linked`) for every binding a linked area
//     already holds and exports;
//   - no host boundary: the 3.6556.2 graph's two stand-ins (src/source-code-notice-adapters.jsx useSessionScopeHidden /
//     useVisibleZoneKeys) are not needed here: shared-1 bB is sliced over cds-core's hB (see EXTRA_CHUNKS) and the
//     visible-zone registry hook shared-2 Kq (export Ba) is cowork-scheduled-v4's slice, linked (D1). HOST_ADAPTERS stays
//     empty and the generator refuses an adapter import (assertNoAdapters).
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has
// the probe and whose prettier form carries every feature, under the reviewed local, with its raw declaration sha256
// pinned (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const COMPOSER_NOTICES_V4_OUTPUT = 'src/generated/composer-notices-v4';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

export const S26 = 'shared-26-B-POtn5S.js';
export const SLOTS = 'c227f4d5e-DGDdGBTz.js';
export const S6 = 'shared-6-2QYRw_Wv.js';

// ── Roots: file -> local -> { name, export, previous (3.6556.2), probe (raw), features } ────────────────────────────
export const ROOTS = {
  [S26]: {
    bH: { name: 'ChatComposerNotices', export: 'li', previous: 'shared-26-CGuBxVt9.js#RM', probe: 'items:n,onDismiss:r,onShown:i,masked:a,cardAbove:o',
      features: ['"data-cds": "ChatComposerNotices",', 'role: "status",', '"aria-live": "polite",', '"aria-atomic": "false",', 'setTimeout(() => {', '}, 300);',
        'cardAbove: o,', 'onOccupancyChange: s,', 'tabIndex: -1,'] },
  },
  [SLOTS]: {
    iR: { name: 'CodeNoticeSlotsProvider', export: 'Oa', previous: 'c227f4d5e-B-FYKrwT.js#cI', probe: 'setRegionMounted(e){a.current=e}',
      features: ['{ session: t, children: n } = e,', 'let r = { notice: sR(t, n), early: !a.current };', 'unregister(e) {', 'setRegionMounted(e) {', 'p(nR.Provider, { value: r, children: n })'] },
    oR: { name: 'useCodeNoticeSlot', export: 'Aa', previous: 'c227f4d5e-B-FYKrwT.js#uI', probe: 'r.register(e,t,a)',
      features: ['aR(e, n);', 'a = t?.perOpening === !0 ? i : null,', 'return (r.register(e, t, a), () => r.unregister(e));'] },
    XL: { name: 'CodeNoticeRegionContext', export: 'Ma', previous: 'c227f4d5e-B-FYKrwT.js#eI', probe: 'XL=F(!1)', features: ['var XL = F(!1);'] },
    ZL: { name: 'useInCodeNoticeRegion', export: 'Na', previous: 'c227f4d5e-B-FYKrwT.js#tI', probe: 'return I(XL)', features: ['return I(XL);'] },
    uR: { name: 'useCodeNoticeSlotEntries', export: 'ka', previous: 'c227f4d5e-B-FYKrwT.js#mI', probe: '{entries:e,setRegionMounted:t}',
      features: ['e = I(nR),', 't = I(tR)?.setRegionMounted ?? lR;', '{ entries: e, setRegionMounted: t }'] },
    $L: { name: 'CODE_NOTICE_SLOT_ORDER', export: 'Da', previous: 'c227f4d5e-B-FYKrwT.js#rI', probe: '"limit","tokenLimit","refusal"',
      features: ['"ops",', '"tokenLimit",', '"refusal",', '"credentialNudge",'] },
    OV: { name: 'useScopeStoreNotice', export: 'fi', previous: 'c227f4d5e-B-FYKrwT.js#pY', probe: 'e.setState(DV(t,null))',
      features: ['e.getState()[t] !== n && e.setState(DV(t, n));', 'e.getState()[t] !== null && e.setState(DV(t, null));'] },
    wV: { name: 'TURN_TAIL_NOTICE_PLACEMENT', export: 'ci', previous: 'c227f4d5e-B-FYKrwT.js#lY', probe: 'wV={placement:"turn_tail"}', features: ['var wV = { placement: "turn_tail" };'] },
    TV: { name: 'tailSessionNotice', export: 'di', previous: 'c227f4d5e-B-FYKrwT.js#uY', probe: 'sleepNotice:e,pausedNotice:t,refusalFallbackNotice:n',
      features: ['pausedNotice: t,', 'return e ?? t ?? n ?? r ?? i ?? void 0;'] },
  },
  [S6]: {
    nv: { name: 'CodeBandRow', export: 'xa', previous: 'shared-6-sd9jbJqs.js#kT', probe: 'wordsClassName:a,children:n',
      features: ['({ leaving: i, onDismiss: r, wordsClassName: a, children: n, ...t } = e),', 'm("span", { "aria-atomic": "true", className: a, children: n })',
        'm(Mo, { ...t, onDismiss: o, children: s })'] },
  },
};
// Roots another graph already holds (D1): located and pinned on the official AST like the roots, never sliced here; the
// linked area must hold the binding and export it, and index.mjs re-exports it under the semantic name.
//   shared-26 uH ChatComposerBand: cowork-scheduled-v4 slices it (with lH / cH over cds-core's composer layout context
//   Mp and its own tm), and exports it under its own name. The 3.6556.2 graph kept its own copy because cowork-scheduled's
//   3.6556.2 kM read that area's own copy of the layout context; in 4.16336.0 both read cds-core's Mp.
export const LINKED_ROOTS = {
  [`${S26}#uH`]: { area: 'cowork-scheduled-v4', module: 'shared-26-B-POtn5S.mjs', name: 'ChatComposerBand', export: 'ui', previous: 'shared-26-CGuBxVt9.js#kM', probe: 'role:"none",composerCalibration:h,className:"@container"',
      features: ['m = t === void 0 ? "neutral" : t,', 'h = lH();', 'role: "none",', 'composerCalibration: h,', 'className: "@container",'] },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'shared-26-B-POtn5S.js#bH': 'f68c4fdd4a2b8ee8e597653e1229e7e8440f931473fb1f284cf8992cccc658cd',
  'shared-26-B-POtn5S.js#uH': '6cc03819f00ea3e310313697d7bf46fb506c5ecfd0d8ce579c5c5ed6c63c4eb8',
  'c227f4d5e-DGDdGBTz.js#iR': 'd81a67737c7620d2cf8bce34d6a40f01f662bb69119cf0a466dd66c1f610a7b5',
  'c227f4d5e-DGDdGBTz.js#oR': '064603b3eb014b3c6b71dca9e4d8df8fef6e1a9baa5ff646a403a4b482c179a4',
  'c227f4d5e-DGDdGBTz.js#XL': 'b7b9ce8d778694a7854bbc677c760f4aded0f8007b1f54155414d9e60b992c73',
  'c227f4d5e-DGDdGBTz.js#ZL': 'db51a063846c8fa690eaa3ac646e96ceb6a4ba2680d110b7236c9f947830a045',
  'c227f4d5e-DGDdGBTz.js#uR': '0ae535f220fed29f71735a4a9edc6099bf277689be5c2bfede721e062bc98cf4',
  'c227f4d5e-DGDdGBTz.js#$L': 'cb8238bc157cfe6626c4c605db29d3f6375d2e827a7aa75a8460b46a1758b974',
  'c227f4d5e-DGDdGBTz.js#OV': '93aaebf35e6f9700ade0ef63313f58c712e8f8d3c39c07374e0dc892e4250043',
  'c227f4d5e-DGDdGBTz.js#wV': '7d1383cdddd347b40afb0963e3fcf3b6ef1c903a11b18381bb4bcc460fd0ed71',
  'c227f4d5e-DGDdGBTz.js#TV': '5a5dcc8bf66a40430ee9d5e3269c23e8223775fd218606d39c4c8553efdec055',
  'shared-6-2QYRw_Wv.js#nv': '602b2a765c0857d57b7f1cdd3b277381732a3e5700f371bda245e4d1889d7b4d',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), features, why } ───────────────────────────
export const HOST_ADAPTERS = {};
export const ADAPTER_PINS = {};
for (const key of Object.keys(HOST_ADAPTERS)) if (!(key in ADAPTER_PINS)) throw Error(`adapter ${key}: no reviewed pin`);

export const LINKED_AREAS = ['code-composer-v4', 'cowork-scheduled-v4', 'files-changes-v4', 'session-rail-kit-v4'];
const TARGETS = { [S26]: 'composer-notices.mjs', [SLOTS]: 'code-notice-slots.mjs', [S6]: 'code-band-row.mjs', 'shared-1-D1bGaTaN.js': 'shared-1.mjs' };
const target = file => TARGETS[file] ?? `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
// The originals the roots read outside their own chunks (listing a chunk the closure never enters, or entering one not
// listed, stops generation):
//   shared-1-D1bGaTaN bB (export wl; 3.6556.2 shared-1 wE, a host stand-in there) / yB: whether the session scope is
//   hidden, `ud(E(hB), yB)` over cds-core's session scope context hB (publicName hB) and zustand's useStore (vendor-all-0,
//   linked from session-rail-kit-v4). The 3.6556.2 graph adapted wE because its context yE had no owner; 4.16336.0's hB is
//   a cds-core binding, so the original reads it (no host provides it: its default store mB, never hidden).
const EXTRA_CHUNKS = ['shared-1-D1bGaTaN.js'];
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...EXTRA_CHUNKS.map(source => ({ source, target: target(source) })),
];
// Original text the host follows but does not import (prettier form of the named top-level declaration): how the Code
// session mounts the stack (host: src/source-session-notices.jsx SourceSessionNotices at cutover).
const callSites = [
  { source: 'cc43287c9-dzfX-J5i.js', binding: 'bSe', role: 'The Code session notice region: the slot entries (useCodeNoticeSlotEntries) in CODE_NOTICE_SLOT_ORDER, keyed per slot and notice id, dismissible only with onDismiss, skipEnter for early entries; mounted in a dock-group div around ChatComposerNotices',
    features: ['{ entries: e, setRegionMounted: t } = Cj(),', 'pA.flatMap((t) => {', 'key: A7(t, r.id),', 'dismissible: r.onDismiss !== void 0 && r.dismissible,', 'skipEnter: i || !s,', 'p(uc, { items: c, onDismiss: l })'] },
  { source: 'cc43287c9-dzfX-J5i.js', binding: 'vSe', role: 'The region provider: CodeNoticeRegionContext true around CodeNoticeSlotsProvider for the session',
    features: ['p(Jee.Provider, {', 'value: !0,', 'children: p(nte, { session: t, children: n }),'] },
];
const rawCallSites = [];
const linkedCopies = {};

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

export async function locateRoots(cache = new Map()) {
  const found = [];
  const all = [...Object.entries(ROOTS).flatMap(([file, roots]) => Object.entries(roots).map(([local, spec]) => [file, local, spec])),
    ...Object.entries(LINKED_ROOTS).map(([key, spec]) => [...key.split('#'), spec])];
  for (const [file, local, spec] of all) {
    const src = await readSource(file, cache, official.ionSource);
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
    found.push({ file, local, name: spec.name, export: alias, previous: spec.previous, declarationSha256, pinned: pin !== null, ...(spec.area ? { linkedFrom: `${spec.area}/${spec.module}` } : {}) });
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
    out.push({ original: key, name: spec.name, previous: spec.previous ?? null, declarationSha256, pinned: pin !== null });
  }
  return out;
}

// A linked root: the linked area's module holds the binding (sliced from the same official bytes) and exports it.
async function assertLinkedRoots() {
  const out = [];
  for (const [key, spec] of Object.entries(LINKED_ROOTS)) {
    const [file, local] = key.split('#');
    const manifest = JSON.parse(await fs.readFile(path.join(generatedRoot, spec.area, 'manifest.json'), 'utf8'));
    const mod = manifest.modules.find(m => m.target === spec.module);
    if (!mod || path.basename(mod.source) !== file) throw Error(`linked root ${key}: ${spec.area}/${spec.module} does not slice ${file}`);
    if (!(mod.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === local)) throw Error(`linked root ${key}: ${spec.area}/${spec.module} does not hold ${local}`);
    const official_ = await fs.readFile(path.join(official.ionSource, file));
    if (mod.sourceSha256 !== sha(official_)) throw Error(`linked root ${key}: ${spec.area}/${spec.module} was sliced from other bytes`);
    const text = await fs.readFile(path.join(generatedRoot, spec.area, spec.module), 'utf8');
    if (sha(text) !== mod.sha256) throw Error(`linked root ${key}: ${spec.area}/${spec.module} differs from its manifest`);
    const exported = [...text.matchAll(/export \{([^}]*)\}/g)].flatMap(m => m[1].split(',').map(x => x.trim()).filter(Boolean));
    if (!exported.includes(local)) throw Error(`linked root ${key}: ${spec.area}/${spec.module} does not export ${local}`);
    out.push({ original: key, name: spec.name, area: spec.area, module: spec.module, moduleSha256: mod.sha256 });
  }
  return out;
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the composer-notices-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function composerNoticesV4Config() {
  return {
    name: 'composer notices (4.16336.0)', generator: 'extract-composer-notices-v4.mjs', output: path.join(root, COMPOSER_NOTICES_V4_OUTPUT),
    // The area's host adapter file (plan.json hostAdaptersOwned); this graph imports nothing from it (assertNoAdapters).
    adapterModule: '../../source-code-notice-adapters.jsx', adapterFile: 'src/source-code-notice-adapters.jsx', adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, callSites, rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
export const probeConfig = composerNoticesV4Config;

export async function extractComposerNoticesV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  const linkedRoots = await assertLinkedRoots();
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...composerNoticesV4Config(),
    async artifacts(m) {
      // assertNoAdapters: every import resolves to the official graph (cds-core, linked areas, React), none to the host.
      const adapterImports = m.modules.flatMap(mod => mod.imports.filter(i => i.kind === 'adapter').map(i => `${mod.target} ${i.local} <- ${i.via}`));
      if (adapterImports.length) throw Error(`composer-notices-v4 must not import host adapters: ${adapterImports.join(', ')}`);
      return {
        'index.mjs': `// Semantic names for the composer-notices roots (${official.referenceVersion}); generated by extract-composer-notices-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.values(rs).map(r => r.name).join(', ')} } from "./${target(file)}";`).join('\n') + '\n'
          + Object.entries(LINKED_ROOTS).map(([key, r]) => `export { ${key.split('#')[1]} as ${r.name} } from "../${r.area}/${r.module}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-composer-notices-v4.mjs',
          previous: { generator: 'scripts/extract-composer-notices.mjs', output: 'src/generated/composer-notices', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, linkedRoots, adapters, linkedCopies,
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
  } else await extractComposerNoticesV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
