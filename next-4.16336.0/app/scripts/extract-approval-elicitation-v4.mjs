// MCP elicitation form, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, round2 unit approval-elicitation):
// the same four semantic roots extract-approval-elicitation.mjs cuts from 3.6556.2 into src/generated/approval-elicitation,
// cut from the frozen 4.16336.0 snapshot into the isolated graph src/generated/approval-elicitation-v4. The 3.6556.2
// generator, its output and its test are untouched (staged double output; no production switch:
// src/source-approval-card.jsx keeps reading src/generated/approval-elicitation until the cutover batch).
//
// 4.16336.0 moved the roots (3.6556.2 chunk#local -> 4.16336.0 chunk#local, same export alias):
//   c9e77b76c-BbGxr8n3#A -> c9e77b76c-BlVE1zzc#j  ElicitationField (export t). New props extendedForm / thumbnails /
//                                                optionDescriptions (image thumbnails of anyOf options, option
//                                                descriptions, "x-openai-suggestions"), the reset button ("Reset
//                                                {fieldTitle}"), React Compiler slots 225 -> 312.
//   cd359c6df-Dv3ZEbLT#b -> cd359c6df-BQfhCuAw#k  ElicitationForm (export t). The Base UI <Form> (C) is now wrapped in
//                                                a submit guard O (staysOnPage / refuses) and a busy lock (shared-frame
//                                                Tf / wp); ⌘↵ calls HTMLFormElement.prototype.requestSubmit.
//   ce3d4614c-WVBm4FYv#a -> ce3d4614c-CK7HKdBf#o  elicitationInitialValues (export t).
//   ce3d4614c-WVBm4FYv#o -> ce3d4614c-CK7HKdBf#s  readElicitationForm (export n).
// The card that renders them is still cc32965c2 (4.16336.0 cc32965c2-CpdpcYvh: `t as ji`, `t as wo`, `n as Xs,t as Zs`).
//
// What the 3.6556.2 graph linked, and where it is answered now (round2/plan.json dagAdjustments + stagingUpstreamRule):
//   mcp-app-host zod.mjs (vendor-zod Ks / cc / ic / vs) -> the same vendor-zod-fszujTq6 chunk (byte-identical across both
//     releases); cds-core does not publish these four, frame-sidebar-nav (4.16336.0) cuts and exports them in
//     vendor-zod.mjs, so that one module is linked (D1; mcp-app-host-v4 exists only in staging and is not waited for).
//   approval-titles shared-9 LO -> approval-titles-v4 shared-38 (4.16336.0 shared-38-DyF0_Fim `c as T`).
//   cowork-scheduled cff2bf6cb#nu -> cowork-scheduled-v4 cff2bf6cb-HE-LaYyC (re-located: `t as he` in c9e77b76c).
//   routines-shared (useIntl, React Compiler helpers) -> routines-shared-v4 and the routines-shared host useIntl.
//   frame-domains grantedDeclaredFrameDomains: no longer reached by the 4.16336.0 closure (nothing to re-cut).
// The Base UI Field / Form bindings of vendor-frame that the closure reads and no 4.16336.0 graph exports are cut here
// from the 4.16336.0 vendor-frame (pure: d1-lib classifies none of them as module state; React aliases go to `react`
// through the source contract's assertVendorAlias, never copied).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs; sharedGraph 'cds-core' (pinned manifest sha256, wave 6);
//   - linkedAreas: approval-titles-v4, cowork-scheduled-v4, routines-shared-v4, and of frame-sidebar-nav only
//     vendor-zod.mjs;
//   - one host boundary: vendor-intl q (react-intl useIntl), answered by the routines-shared host adapter the 3.6556.2
//     graph already used (src/source-routines-shared-adapters.jsx); src/source-approval-elicitation-v4-adapters.jsx only
//     re-exports it.
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has the
// probe and whose prettier form carries every feature, under the reviewed local and export alias, with its raw
// declaration sha256 pinned (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const APPROVAL_ELICITATION_V4_OUTPUT = 'src/generated/approval-elicitation-v4';
const ADAPTER_FILE = 'src/source-approval-elicitation-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const FIELD = 'c9e77b76c-BlVE1zzc.js';
export const FORM = 'cd359c6df-BQfhCuAw.js';
export const VALUES = 'ce3d4614c-CK7HKdBf.js';
export const CARD = 'cc32965c2-CpdpcYvh.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias), probe (raw), features (prettier form) } ───────────
export const ROOTS = {
  [FIELD]: {
    j: { name: 'ElicitationField', export: 't', probe: 'extendedForm:p,thumbnails:h,optionDescriptions:ie}=e',
      features: ['let $ = J9(312),', 'fieldSchema: n,', 'hasSubmitError: o,', 'clearSubmitError: c,', 'extendedForm: p,', 'thumbnails: h,',
        'optionDescriptions: ie,', 'E = `${w}-error`,', 'validationMode: "onSubmit",'] },
  },
  [FORM]: {
    k: { name: 'ElicitationForm', export: 't', probe: 'submitOnModEnter:m',
      features: ['let $ = J9(45),', 'submitOnModEnter: m,', '"data-cds": "Form",', 'HTMLFormElement.prototype.requestSubmit.call(e.currentTarget)',
        'handler: "<Form>\'s onSubmit",'] },
  },
  [VALUES]: {
    o: { name: 'elicitationInitialValues', export: 't', probe: '"default"in n&&n.default!==void 0',
      features: ['if ("default" in n && n.default !== void 0) {', 'if (n.type === "boolean" && typeof r != "boolean") return;'] },
    s: { name: 'readElicitationForm', export: 'n', probe: 'new FormData(t)',
      features: ['let s = new FormData(t),', '{ data: c, invalidFields: l }', 'u.format === "date-time" &&'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'c9e77b76c-BlVE1zzc.js#j': 'b8067b54b0fe4aa5208c5005da440ce345278bd2e2df107925172157f99d7d2a',
  'cd359c6df-BQfhCuAw.js#k': '625d6d3925b7a8f8bd23ebdb37d087a091b5174cf5da8b8f28fab045aeb2c768',
  'ce3d4614c-CK7HKdBf.js#o': 'c25301dcf6a4d9c90e14c0d3dcbf1dd910a074994acc8cd326baeda7673735a6',
  'ce3d4614c-CK7HKdBf.js#s': '1c41af760d93101a9daa68210119229d4359aa610a2d9c2ec62ff859448ae62d',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from, features } ─────────────────────────
const RS = 'src/source-routines-shared-adapters.jsx', CDS = 'src/cds-core-adapter.mjs';
export const HOST_ADAPTERS = {
  // react-intl useIntl (the 3.6556.2 graph used the same routines-shared host adapter for vendor-intl q).
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: RS, features: ['return (Mt(e), e);'] },
  // vendor-frame's CommonJS loaders of React and react/jsx-runtime: the Base UI pieces cut here read React through
  // `c = e(i())` / `ce = …se()`; both are the host's one React (the same cds-core adapters cds-core and frame-sidebar-nav
  // use), so React is never copied.
  [`${official.vendorFrame}#i`]: { name: 'loadHostReact', from: CDS, features: ['t.exports = r();'] },
  [`${official.vendorFrame}#ce`]: { name: 'hostJsxRuntime', from: CDS, features: ['t.exports = se();'] },
};
export const ADAPTER_PINS = {
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  [`${official.vendorFrame}#i`]: '69d92900b7ac779d0a4e2748bf56f4c9ad1427aa17b3327085ee70e03e26dcba',
  [`${official.vendorFrame}#ce`]: '461f5f38a003bd6487ff4524212ad7350e68a8bb2415717fcb2ef533be66e9c8',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (ADAPTER_PINS[key] === undefined) throw Error(`adapter ${key}: no reviewed pin`);

const linkedCopies = {};
// frame-sidebar-nav is linked for its vendor-zod.mjs only (the four zod helpers c9e77b76c imports: A / N / u / w).
export const LINKED_AREAS = ['approval-titles-v4', 'cowork-scheduled-v4', 'routines-shared-v4', { area: 'frame-sidebar-nav', modules: ['vendor-zod.mjs'] }];
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  // The originals the roots read that no linked area or cds-core publicName answers, one module per chunk (listing a
  // chunk the closure never enters, or entering one not listed, stops generation): c81a73d3f the field-name / option
  // helpers (form control name, "__elicit_empty_value__", the extended-form test), cee9dc130 the password-manager ignore
  // attributes, shared-92 the display-text sanitiser (emoji / bidi controls), shared-123 the image with fallback the
  // option thumbnails use, shared-frame and vendor-frame the pure Base UI Field / Form / Select / Checkbox pieces.
  ...['c81a73d3f-tO6s9a8w.js', 'cee9dc130-D87BMPH_.js', 'shared-92-BOgyxePb.js', 'shared-123-1Hc1RTKl.js', official.sharedFrame, official.vendorFrame]
    .map(source => ({ source, target: target(source) })),
];

// Pinned on the minified bytes (each exactly once): how the elicitation card imports and mounts the form.
const rawCallSites = [
  { source: CARD, role: 'The elicitation card ("{serverName} requests your input") imports the field (ji), the form (wo), the read (Xs) and the initial values (Zs)',
    features: ['import{t as ji}from"./c9e77b76c-BlVE1zzc.js"', 'import{t as wo}from"./cd359c6df-BQfhCuAw.js"', 'import{n as Xs,t as Zs}from"./ce3d4614c-CK7HKdBf.js"'] },
  { source: CARD, role: 'The card mounts the form small, without ⌘↵ submit, owning typing and pastes, one field per requested property',
    features: ['t(wo,{id:u,size:"sm",submitOnModEnter:!1,disabled:P,onSubmitCapture:O,onSubmit:k,"data-testid":"epitaxy-elicitation-form","data-owns-typing-and-pastes":!0,children:F})',
      'hasSubmitError:m.has(e),clearSubmitError:A},e)'] },
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

// The host adapter module re-exports exactly the adapted names, each from the host adapter that documents it.
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
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the approval-elicitation-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

// What this graph links: a whole area by its manifest sha256; a module-restricted link by the linked modules' sha256 (the
// rest of that area may be regenerated without touching this graph).
async function linkedPins() {
  const out = {};
  for (const link of LINKED_AREAS) {
    const area = typeof link === 'string' ? link : link.area;
    const bytes = await fs.readFile(path.join(generatedRoot, area, 'manifest.json'));
    if (typeof link === 'string') { out[area] = sha(bytes); continue; }
    const manifest = JSON.parse(bytes.toString());
    out[area] = Object.fromEntries(link.modules.map(t => [t, manifest.modules.find(m => m.target === t)?.sha256 ?? null]));
  }
  return out;
}

export function approvalElicitationV4Config() {
  return {
    name: 'approval elicitation (4.16336.0)', generator: 'extract-approval-elicitation-v4.mjs', output: path.join(root, APPROVAL_ELICITATION_V4_OUTPUT),
    adapterModule: '../../source-approval-elicitation-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
    extraGlobals: { HTMLFormElement: 'cd359c6df k submits on ⌘↵ through HTMLFormElement.prototype.requestSubmit.call(e.currentTarget) (DOM platform global)' },
  };
}

export async function extractApprovalElicitationV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  if (!dryRun) {
    for (const r of roots) if (!r.pinned) throw Error(`root ${r.file}#${r.local}: unpinned (review it with --locate)`);
    for (const a of adapters) if (!a.pinned) throw Error(`adapter ${a.original}: unpinned (review it with --locate)`);
  }
  await assertAdapterModule();
  const linked = await linkedPins();
  const cfg = {
    ...approvalElicitationV4Config(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the approval-elicitation roots (${official.referenceVersion}); generated by extract-approval-elicitation-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.keys(rs).map(l => `${rs[l].name}`).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-approval-elicitation-v4.mjs',
          previous: { generator: 'scripts/extract-approval-elicitation.mjs', output: 'src/generated/approval-elicitation', referenceVersion: official.previousVersion },
          isolatedGraph: { productionOutput: 'src/generated/approval-elicitation', productionSwitchNotBeforeBatch: 9, consumers: ['src/source-approval-card.jsx'] },
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
  } else await extractApprovalElicitationV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
