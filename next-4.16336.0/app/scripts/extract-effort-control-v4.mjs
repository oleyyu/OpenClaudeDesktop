// Effort control, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104 round 2, unit effort-control): the same
// semantic roots extract-effort-control.mjs cuts from 3.6556.2 into src/generated/effort-control, cut from the frozen
// 4.16336.0 snapshot into the isolated graph src/generated/effort-control-v4. The 3.6556.2 output is untouched (staged
// double output; no production switch: the host keeps reading src/generated/effort-control until the switch recorded in
// analysis/.../round2/effort-control/patches/).
//
//   effort-control.mjs  c8e04f916-DxnnNQyG S (exported EffortControl; shared-7 FI loads the chunk lazily, 3.6556.2 lw):
//                       the CDS Popover (data-cds "ModelSelectorEffort") whose Popup is "isolate flex w-[220px]
//                       select-none flex-col gap-lg": the Title beside the direction-aware value swap (four plus-lighter
//                       glow layers over the lazily loaded motion, shared-5 Um presenceMotion), the About effort
//                       PreviewCard (shared-183 Ka, cds-core CdsPreviewCard, delay 200), Faster / Smarter, the CDS Slider
//                       c2d9b9a76 with its overlay, the warning note and the touch-only description. New in 4.16336.0:
//                       the `toggle` prop (shared-7 aL passes the model's effortToggle: a CDS Switch row).
//   lit-overlay.mjs     c227f4d5e-DGDdGBTz Zz (3.6556.2 P$: the overlay the composer passes when the model's last effort
//                       option is ultracode, qf) and, new in 4.16336.0, Qz / $z (the overlay always lit / never lit, which
//                       the composer passes instead when ultracode is a separate toggle: rB `me = F ? v ? v.on ? Qz : $z :
//                       void 0 : qf(...) ? Zz : void 0`), all three over Fz (the webgl2 "charged" bed and its outer
//                       / inner surfaces Pz).
//   slider.mjs          c2d9b9a76-BfuloLan t: the CDS Slider (track, fill, overlay inside the fill, stops, thumb, marks)
//                       over Base UI's slider parts c69149ae7 (slider-parts.mjs), ca597a055's clamp / number format
//                       (number-format.mjs) and c7b39e598's value-to-percent (value-percent.mjs).
//   vendor-frame.mjs, shared-frame.mjs, rolldown-runtime.mjs: the small originals the closure reaches that no linked
//                       graph exports (Base UI internals cds-core holds without a public name are pure and cut again;
//                       module state among them stops generation, D46).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CdsPopover / CdsPreviewCard / CdsSwitch / CdsTooltip / CdsIcon / CdsButton / useCdsLabel /
//     useCdsPrefersReducedMotion / useCdsMode / useEventCallback / useDirection / mergeProps / clsx …); the reviewed cds-core
//     manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, round2/plan.json effort-control presentLinks): code-composer-v4 (shared-5 Um presenceMotion over the
//     motion its loader fills, shared-frame Pp useOptionalEventCallback, the compiler helpers it exports),
//     session-rail-kit-v4 and transcript-rows-v4 (the React Compiler memo helpers of shared-frame), cowork-scheduled-v4
//     (shared-7 x / C, shared-25 Wp, the vendor-frame / shared-frame bindings it exports) — every binding one of them holds
//     and exports is imported from it, never cut again;
//   - host boundaries as localAdapters (file#local): vendor-frame's CommonJS React loader `i` and JSX runtime `ce` are the
//     host's React (src/cds-core-adapter.mjs, the one cds-core's slices read), so the closure never copies React itself.
//     src/source-effort-control-v4-adapters.jsx only re-exports them. Each original is pinned by features and by its raw
//     declaration sha256 (ADAPTER_PINS).
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has the
// probe and whose prettier form carries every feature, under the reviewed local, with its raw declaration sha256 pinned
// (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const EFFORT_CONTROL_V4_OUTPUT = 'src/generated/effort-control-v4';
const ADAPTER_FILE = 'src/source-effort-control-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6, cds-integrate/wave6/apply-real.json).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const EFFORT = 'c8e04f916-DxnnNQyG.js';
export const COMPOSER = 'c227f4d5e-DGDdGBTz.js';
export const SHARED_7 = 'shared-7-D2e77H6v.js';
const VF = official.vendorFrame;

// ── Roots: file -> local -> { name, export (the chunk's own alias, null: chunk-internal), probe (raw), features } ──────
export const ROOTS = {
  [EFFORT]: {
    S: { name: 'EffortControl', export: 'EffortControl', probe: 'sliderOverlay:me,toggle:T,renderTrigger:he',
      features: ['"data-cds": "ModelSelectorEffort"', '"isolate flex w-[220px] select-none flex-col gap-lg"', 'className: "shrink-0 text-muted"',
        'l("aboutEffort", "About effort")', 'l("faster", "Faster")', 'l("smarter", "Smarter")', 'showStops: !0,', 'overlay: Ie,', 'delay: 200,',
        '"pointer-coarse:block text-pretty text-footnote text-muted hidden break-words"', 'toggle: T,'] },
  },
  [COMPOSER]: {
    Zz: { name: 'EffortSliderOverlay', export: null, probe: 'p(Fz,{lit:e.atMax})',
      features: ['className: "epitaxy-root text-body text-primary break-words contents"', 'children: p(Fz, { lit: e.atMax }),'] },
    Qz: { name: 'EffortSliderOverlayLit', export: null, probe: 'p(Fz,{lit:!0})',
      features: ['className: "epitaxy-root text-body text-primary break-words contents"', 'children: p(Fz, { lit: !0 }),'] },
    $z: { name: 'EffortSliderOverlayUnlit', export: null, probe: 'p(Fz,{lit:!1})',
      features: ['className: "epitaxy-root text-body text-primary break-words contents"', 'children: p(Fz, { lit: !1 }),'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'c8e04f916-DxnnNQyG.js#S': '6b2a22c007c6158d2bb3ce1333434b15de7e4c95cb892c95642d15ddcee795c9',
  'c227f4d5e-DGDdGBTz.js#Zz': '1b7fc2f60306f913e7efd1c900effe86fb06aa1c242d92c1d94becec30c17483',
  'c227f4d5e-DGDdGBTz.js#Qz': '7ed2e19523285df9a08315baf9942d3eb7096d1d83737f6697693dc2de641cf1',
  'c227f4d5e-DGDdGBTz.js#$z': 'd5e8c86e8de9421100d51fccc57ce0a6d452b92fe20894f10d893773b9182076',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from, features } ─────────────────────────
// `from` names the existing host module the v4 adapter module re-exports (its semantics are documented there).
const CDS = 'src/cds-core-adapter.mjs';
export const HOST_ADAPTERS = {
  // cds-integrate wave 8a (R4-K1 addendum A): vendor-frame's React namespace c = e(i()) is the cds-core publicName
  // identity_vendorframe_c, linked from cds-core, so no binding of this graph reads vendor-frame i any more and its host
  // answer left (was: [`${VF}#i`]: { name: 'loadHostReact', from: CDS, features: ['t.exports = r();'] }, "vendor-frame i: the
  // CommonJS React module (`t.exports = r()`); c = e(i()) and the use-sync-external-store shim read it", pin 69d92900…).
  // vendor-frame ce: the JSX runtime (`t.exports = se()`); vendor-frame G = ce.jsx.
  [`${VF}#ce`]: { name: 'hostJsxRuntime', from: CDS, features: ['t.exports = se();'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  [`${VF}#ce`]: '461f5f38a003bd6487ff4524212ad7350e68a8bb2415717fcb2ef533be66e9c8',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!Object.hasOwn(ADAPTER_PINS, key)) throw Error(`adapter ${key}: no reviewed pin`);

// No linkedCopies: every binding a linked area holds is imported from it.
const linkedCopies = {};

export const LINKED_AREAS = ['code-composer-v4', 'session-rail-kit-v4', 'cowork-scheduled-v4', 'transcript-rows-v4'];
const modules = [
  { source: EFFORT, target: 'effort-control.mjs', exports: { S: 'EffortControl' }, features: { S: ROOTS[EFFORT].S.features } },
  { source: COMPOSER, target: 'lit-overlay.mjs', internal: true,
    exports: Object.fromEntries(Object.entries(ROOTS[COMPOSER]).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(ROOTS[COMPOSER]).map(([local, r]) => [local, r.features])) },
  // The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
  // listed, stops generation).
  { source: 'c2d9b9a76-BfuloLan.js', target: 'slider.mjs' },
  { source: 'c69149ae7-QcwBEzuN.js', target: 'slider-parts.mjs' },
  { source: 'ca597a055-CdrdFNxN.js', target: 'number-format.mjs' },
  // cds-integrate wave 8s (W8S-M9): the slider-parts readers of c7b39e598's value-to-percent are cds-core publicNames now
  // (settings_c69149ae7_<local>, pins.merge.wave8s), linked from there, so the closure no longer enters c7b39e598; it was
  // `{ source: 'c7b39e598-CNSGbpPd.js', target: 'value-percent.mjs' },` here through wave 8.
  { source: VF, target: 'vendor-frame.mjs' },
  { source: official.sharedFrame, target: 'shared-frame.mjs' },
  // cds-integrate wave 8a (R4-K1 addendum A, identity family): vendor-frame's React namespace `c = e(i())` is the cds-core
  // publicName identity_vendorframe_c now (pins.merge.wave8a), linked from there, so the closure no longer enters
  // rolldown-runtime for its interop helper `l`; it was
  // `{ source: 'rolldown-runtime-C3OYiQ02.js', target: 'rolldown-runtime.mjs' },` here through wave 8s.
];

// Original text the host follows but does not import (prettier form of the named top-level declaration).
const callSites = [
  { source: SHARED_7, binding: 'aL', role: 'The ModelSelector effort part: Suspense over FI (the lazily loaded S) with II as fallback; S gets modal / options / activeEffortId / thinkingDescription / onPickEffort / open / onOpenChange / sliderOverlay / toggle / renderTrigger (host: src/source-composer.jsx SourceEffortPopover)',
    features: ['C = aI("Effort"),', 'x(FI, {', 'options: N,', 'activeEffortId: P,', 'thinkingDescription: U,', 'onPickEffort: M.pickEffort,', 'sliderOverlay: c,', 'toggle: E,',
      'warningNoteEnabled: l,', 'renderTrigger: t,', 'x(A, { fallback: H, children: K })'] },
  { source: COMPOSER, binding: 'rB', role: 'The composer model menu picks the effort slider overlay: Qz / $z by the ultracode toggle when ultracode is separate, else Zz when the model\'s last effort option is ultracode (qf)',
    features: ['ultracodeSeparate: _,', 'F = _ !== void 0 && _,', '? Qz', ': $z', '? Zz', 'effortSliderOverlay: he,', 'effortToggle: pe,'] },
];
// Pinned on the minified bytes (each exactly once).
const rawCallSites = [
  { source: COMPOSER, role: 'The overlay selection of rB (3.6556.2 R$ `J = Dd(re?.thinking?.effort_options?.at(-1)?.id) ? P$ : void 0`)',
    features: ['me=F?v?v.on?Qz:$z:void 0:qf(fe?.thinking?.effort_options?.at(-1)?.id)?Zz:void 0', 'effortSliderOverlay:he,effortToggle:pe'] },
  { source: SHARED_7, role: 'shared-7 FI loads c8e04f916 lazily and falls back to II',
    features: ['FI=P(()=>_(()=>import("./c8e04f916-DxnnNQyG.js").then(e=>({default:e?.EffortControl??II})'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root (unique declaration carrying its features, under the reviewed local, export alias as
// reviewed, raw declaration sha256 as pinned).
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

// Every adapted original: a declaration of its chunk carrying its features, its raw sha256 as pinned.
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
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, declarationSha256, pinned: pin !== null });
  }
  return out;
}

// The host adapter module re-exports exactly the adapted names, each from the host module that documents it.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
  const body = text.replace(/\/\/[^\n]*/g, '').replace(/export \{[^}]*\} from "[^"]+";/g, '').trim();
  if (body) throw Error(`${ADAPTER_FILE}: only re-exports are allowed, found: ${body.slice(0, 120)}`);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (exported.get(name) !== from) throw Error(`${ADAPTER_FILE}: ${name} is not re-exported from ${from}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the effort-control-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function effortControlV4Config() {
  return {
    name: 'effort control (4.16336.0)', generator: 'extract-effort-control-v4.mjs', output: path.join(root, EFFORT_CONTROL_V4_OUTPUT),
    adapterModule: '../../source-effort-control-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, callSites, rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
export const probeConfig = effortControlV4Config;

export async function extractEffortControlV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  for (const r of roots) if (!r.pinned) throw Error(`root ${r.file}#${r.local}: unpinned (review it with --locate)`);
  for (const a of adapters) if (!a.pinned) throw Error(`adapter ${a.original}: unpinned (review it with --locate)`);
  await assertAdapterModule();
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const byFile = Object.fromEntries(modules.map(m => [m.source, m.target]));
  const cfg = {
    ...effortControlV4Config(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the effort-control roots (${official.referenceVersion}); generated by extract-effort-control-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.values(rs).map(r => r.name).join(', ')} } from "./${byFile[file]}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-effort-control-v4.mjs',
          previous: { generator: 'scripts/extract-effort-control.mjs', output: 'src/generated/effort-control', referenceVersion: official.previousVersion,
            roots: { 'c8e04f916-39YFkTtR.js#S': 'EffortControl', 'c227f4d5e-B-FYKrwT.js#P$': 'EffortSliderOverlay' } },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, removedRoots: [], adapters, linkedCopies,
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
  } else await extractEffortControlV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
