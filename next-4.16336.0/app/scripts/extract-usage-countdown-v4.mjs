// Usage reset countdown, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2 batch 7, region
// usage-countdown): the semantic roots scripts/extract-usage-countdown.mjs cuts from 3.6556.2 into
// src/generated/usage-countdown, re-located in the frozen 4.16336.0 snapshot and cut into the isolated graph
// src/generated/usage-countdown-v4. The 3.6556.2 output is untouched (staged double output; no production switch:
// src/source-session-notices.jsx keeps rendering src/generated/usage-countdown).
//
// Roots (c227f4d5e-DGDdGBTz; 3.6556.2 counterpart c227f4d5e-B-FYKrwT in brackets):
//   SQ  UsageResetCountdown     [QF]  outside a notice card the countdown alone; inside one (xQ true) the countdown
//                                     aria-hidden plus the absolute reset text once, sr-only.
//   xQ  UsageNoticeCardContext  [ZF]  the notice card's context: h$ (the usage limit card) provides it around its
//                                     headline and detail (`_(xQ.Provider,{value:!0,children:[D,O]})`).
// account2/plan.json listed `uD` for UsageNoticeCardContext (shape-equal-ambiguous: uD, XL, wU and xQ are all
// `F(!1)`). The official code settles it: SQ reads `I(xQ)` and the usage card provides `xQ.Provider`, while uD is the
// pull-request view context (`p(uD.Provider,{value:s,…})` with `s = n?.prNumber !== void 0`, read by dD). So the root is
// xQ, pinned through SQ's own `if (!I(xQ))` feature and the card's raw call site; uD stays cds-core's
// ctx_c227f4d5e_uD (session-rail-changes' area) and is not part of this closure.
//
// 4.16336.0 changed the countdown itself: CQ (3.6556.2 $F) no longer ticks every second within the hour ("Resets in
// {duration}", "Resets in {minutes}:{seconds}"); it shows the absolute text until the reset time has passed on the minute
// clock (`t * 1e3 <= Ua()`, shared-183 _J useMinuteNow), then "Resetting…" (aria-live off outside a card). So
// 3.6556.2's per-second store (c93058e68 Yp, src/generated/usage-countdown/seconds-until.mjs) and its YF / XF thresholds
// have no 4.16336.0 counterpart in this closure.
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames; cds-core module state without a publicName stops
//     generation, D46); the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1): routines-shared-v4 holds and exports shared-183 _J useMinuteNow with its minute clock (the
//     4.16336.0 counterpart of the 3.6556.2 graph's link to session-rail-sections minute-clock.mjs; session-rail-sections-v4
//     itself imports it from routines-shared-v4), so it is imported from there, never cut again;
//   - host boundary as a localAdapter (file#local): react-intl FormattedMessage over the local catalog, the same host
//     adapter the 3.6556.2 graph uses, re-exported by src/source-usage-countdown-v4-adapters.jsx; the original is pinned
//     by features and by its raw declaration sha256 (ADAPTER_PINS).
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
export const USAGE_COUNTDOWN_V4_OUTPUT = 'src/generated/usage-countdown-v4';
const ADAPTER_FILE = 'src/source-usage-countdown-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const BAND = 'c227f4d5e-DGDdGBTz.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias, null: chunk-internal), probe (raw), features } ──────
export const ROOTS = {
  [BAND]: {
    SQ: { name: 'UsageResetCountdown', export: null, probe: 'if(!I(xQ))return J1($,0,e)?K1($,0,e,p(CQ,{...e})):$[1]',
      features: ['if (!I(xQ)) return J1($, 0, e) ? K1($, 0, e, p(CQ, { ...e })) : $[1];', '"aria-hidden": "true",', 'children: p(CQ, { ...e, inNoticeCard: !0 }),',
        'p("span", { className: "sr-only", children: e.absolute })', '_(T, { children: [t, n] })'] },
    xQ: { name: 'UsageNoticeCardContext', export: null, probe: 'xQ=F(!1)', features: ['var xQ = F(!1);'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'c227f4d5e-DGDdGBTz.js#SQ': 'df04a072ab4421089b34ca1cd5a7bacae79166b0168f91ed5cc0db92ae369906',
  'c227f4d5e-DGDdGBTz.js#xQ': '764dc64202509ea46e653c0ed3035d789d9dc4500604d5368529d3b082e12339',
};
// The countdown body SQ renders (emitted in the closure, not a public name): its copy and thresholds, as reviewed.
export const COUNTDOWN = { file: BAND, local: 'CQ', features: ['{ resetsAtSeconds: t, absolute: n, inNoticeCard: r } = e,', 'i = r !== void 0 && r;',
  'if (!(t * 1e3 <= Ua()))', 'p(T, { children: n })', 'let a = i ? void 0 : "off",', 'p(Q, { defaultMessage: "Resetting\\u2026", id: "26SvXGZRRO" })',
  'p("span", { "aria-live": a, children: o })'] };

// ── Host boundary: file#local -> { name (export of the adapter module), from, old, features } ──────────────────────────
// `from` names the existing host adapter the v4 adapter module re-exports (its semantics are documented there); `old` is
// the 3.6556.2 original that adapter already stands for in src/generated/usage-countdown.
const OLD_ADAPTERS = 'src/source-usage-countdown-adapters.jsx';
export const HOST_ADAPTERS = {
  // react-intl FormattedMessage over the local catalog (the 3.6556.2 graph's adapter).
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: OLD_ADAPTERS, old: 'vendor-intl-DYfox5Co.js#Gt', features: ['var Gt = a(Wt, Ut);'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (ADAPTER_PINS[key] === undefined) throw Error(`adapter ${key}: no reviewed pin`);

export const LINKED_AREAS = ['routines-shared-v4'];
const target = file => (file === BAND ? 'usage-countdown.mjs' : `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`);
const ROOT_FILES = new Set(Object.keys(ROOTS));
// The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
// listed, stops generation).
export const CLOSURE_CHUNKS = [];
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...CLOSURE_CHUNKS.filter(source => !ROOT_FILES.has(source)).map(source => ({ source, target: target(source) })),
];

// Pinned on the minified bytes (each exactly once): where the desktop puts the countdown and its card context.
const rawCallSites = [
  { source: BAND, role: 'The usage limit band (d$, export Tn) puts SQ in the reached limit\'s detail, at the window\'s reset time je',
    features: ['je=S?.type==="exceeded_limit"&&j?.status?.status!=="exceeded_limit"?k:j?.status?.resets_at??k',
      'lt=je?p(SQ,{resetsAtSeconds:je,absolute:XQ(je,m)}):void 0'] },
  { source: BAND, role: 'The usage limit card (h$) provides xQ around its headline and detail',
    features: ['K2($,25,D,O,_(xQ.Provider,{value:!0,children:[D,O]}))'] },
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
  // The countdown body: the declaration SQ renders, carrying the reviewed copy.
  const src = await readSource(COUNTDOWN.file, cache, official.ionSource);
  const entry = src.top.get(COUNTDOWN.local);
  if (!entry || entry.kind === 'import') throw Error(`${COUNTDOWN.file}#${COUNTDOWN.local} is not a declaration`);
  assertFeatures(`${COUNTDOWN.file}#${COUNTDOWN.local}`, await featureText(src, entry), COUNTDOWN.features);
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
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, previous: spec.old, declarationSha256, pinned: pin !== null });
  }
  return out;
}

// The host adapter module re-exports exactly the adapted names, each from the host adapter that documents it.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
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
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the usage-countdown-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function usageCountdownV4Config() {
  return {
    name: 'usage countdown (4.16336.0)', generator: 'extract-usage-countdown-v4.mjs', output: path.join(root, USAGE_COUNTDOWN_V4_OUTPUT),
    adapterModule: '../../source-usage-countdown-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}

export async function extractUsageCountdownV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...usageCountdownV4Config(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the usage-countdown roots (${official.referenceVersion}); generated by extract-usage-countdown-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.keys(rs).map(l => rs[l].name).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-usage-countdown-v4.mjs',
          previous: { generator: 'scripts/extract-usage-countdown.mjs', output: 'src/generated/usage-countdown', referenceVersion: official.previousVersion,
            roots: { UsageResetCountdown: 'c227f4d5e-B-FYKrwT.js#QF', UsageNoticeCardContext: 'c227f4d5e-B-FYKrwT.js#ZF' } },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          disambiguation: {
            UsageNoticeCardContext: { chosen: `${BAND}#xQ`, planCandidate: `${BAND}#uD`, shapeTwins: ['uD', 'XL', 'wU'],
              why: 'SQ reads I(xQ) and the usage limit card h$ provides xQ.Provider; uD is the pull-request view context (uD.Provider value prNumber !== undefined, read by dD)' },
          },
          countdown: { file: COUNTDOWN.file, local: COUNTDOWN.local, previous: 'c227f4d5e-B-FYKrwT.js#$F',
            note: 'no per-second ticking in 4.16336.0: the absolute text until the minute clock passes the reset, then Resetting…' },
          removedFromClosure: { 'c93058e68-CMBi_EBm.js': '3.6556.2 seconds-until store (Yp) and YF / XF thresholds: CQ no longer reads them' },
          roots, adapters,
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
  } else await extractUsageCountdownV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
