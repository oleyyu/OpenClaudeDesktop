// Chat answer renderer, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, round2 units chat-renderer:a / :b):
// the roots scripts/extract-chat-renderer.mjs cuts from 3.6556.2 into src/generated/chat-renderer, cut from the frozen
// 4.16336.0 snapshot into the isolated graph src/generated/chat-renderer-v4. The 3.6556.2 generator, its output, its
// adapters (src/source-chat-renderer-adapters.jsx) and its tests are untouched (staged double output; no production
// switch: region-plan cutover.productionSwitchNotBeforeBatch 11, consumers code-transcript / pierre-changes /
// sidebar-hover-card still import src/generated/chat-renderer by 3.6556.2 identity).
//
// 4.16336.0 moved the roots (3.6556.2 chunk#local -> 4.16336.0 chunk#local; round2/plan.json roots.astChecked):
//   cc1aae219-CeSwM-tp#OR  -> cc1aae219-BbSf__8R#EP  ChatTextMarkdown (internal memo, every prop to c89efce1a Mu as Uv;
//                                                   new props unlinkHref / rubyAnnotations, compiler slots 23).
//   c89efce1a-C_nlrFif#rc  -> c89efce1a-CleBUUAy#Mu  StandardMarkdown (export s; compiler slots 113; new props dialect,
//                                                   markedText, rubyAnnotations, showHtmlComments, deferOffscreenBlocks…).
//   c851b27a8-BxvTOAx3#Jr  -> c851b27a8-Chd9-72r#Ai  loadLatexPlugins (internal; the KaTeX chunk load is now ki with three
//                                                   dynamic imports, the plugin record adds the in-house plugin ht).
//   ca129fbf3-CdfQB5sF#it/at -> ca129fbf3-HnH_eJBK#it/at rehypeKatexChecked / rehypeKatexGuardedAndChecked (same export
//                                                   names; 4.16336.0 adds a katex tree-to-hast fast path for katex 0.16.47
//                                                   / 0.18.1 and reports refused formulas through shared-0 eP).
//
//   c6369e48b-Cz3VPKCm#h   -> c6369e48b-jalMQaq2#h   remarkMath (export default; unit :b; same attacher, the micromark
//                                                   syntax / from-markdown / to-markdown handlers it pushes).
//
// Unit :a (this file's first cut): the LaTeX group and the Markdown group. Only the roots whose closure is consistent are
// emitted (ROOTS); the others are located and pinned on the official AST like every root, but held in PENDING_ROOTS with
// the reason generation cannot take them yet. Unit :b completes the glue (the remaining callSites, the eleven linked
// regions on their -v4 semantic exports, link-surface.json) on top of this generator. Unit :b emitted the third lazy
// LaTeX chunk (remark-math) and surveyed the pending closure against the main-workflow graphs (MAIN_WORKFLOW_AREAS) with
// the draft boundaries (PENDING_HOST_ADAPTERS) and pure copies (PENDING_LINKED_COPIES): what is left is exactly the
// eleven cds-core writers of round2/chat-renderer-b/cds-core-requests.json (c851b27a8 x10, vendor-zod k).
//
// Why EP / Mu / Ai are pending (assertNoImportedWrites, below): their closure (Mu -> Ft -> c851b27a8 Ni -> Ai, Mu -> Bt
// -> Ii -> fi, Mu -> ku -> Wt -> Ei, …) re-slices declarations that ASSIGN module variables cds-core holds and publishes
// (c851b27a8 xr / Ar / Ir / Lr / Z / jr / Mr / Pr / Fr / Q / H / q / hi / gi / vi / yi / bi, shared-0 lC / uC / cC / sC,
// shared-62 Na / Ma / za / Pa, vendor-zod Me). This graph would import those from cds-core, and an ES import binding is
// read-only: the first call throws "Assignment to constant variable", and a private copy would split the latex load state
// (D1 / D46). The writers have to be cds-core publicNames (round2/chat-renderer-a/cds-core-requests.json, wave 7); cds-core
// is frozen in this phase.
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs; sharedGraph 'cds-core' (manifest sha256 pinned, wave 6);
//   - linkedAreas (D1): every binding a linked 4.16336.0 graph already holds and exports is imported from it;
//   - host boundaries as localAdapters (file#local), each pinned by features and by its raw declaration sha256.
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has the
// probe and whose prettier form carries every feature, under the reviewed local and export alias, with its raw
// declaration sha256 pinned (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const CHAT_RENDERER_V4_OUTPUT = 'src/generated/chat-renderer-v4';
const ADAPTER_FILE = 'src/source-chat-renderer-v4-adapters.jsx';
const HERE = ADAPTER_FILE;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// Staged graphs never copy into public/assets/v1 (no asset in this closure; runSlicer requires a root for staged graphs).
const stagedPublicAssets = path.resolve(root, '../analysis/claude-4.16336.0-migrate-20261104/round2/chat-renderer-a/staging/public/assets/v1');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

export const CC1 = 'cc1aae219-BbSf__8R.js', C89 = 'c89efce1a-CleBUUAy.js', C851 = 'c851b27a8-Chd9-72r.js', KATEX_PLUGIN = 'ca129fbf3-HnH_eJBK.js';
export const KATEX = 'cf1a02a1a-A3V2xzb_.js', REMARK_MATH = 'c6369e48b-jalMQaq2.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias, null = private), probe (raw), features (prettier),
// emit (optional: the name the generated module exports it under, when the original importer needs the chunk's own alias) } ─
export const ROOTS = {
  [KATEX_PLUGIN]: {
    it: { name: 'rehypeKatexChecked', export: 'rehypeKatexChecked', probe: 'rt(Z)', features: ['function it(e) {', 'return rt(Z)(e);'] },
    at: { name: 'rehypeKatexGuardedAndChecked', export: 'rehypeKatexGuardedAndChecked', probe: 'e(Ze)', features: ['let t = e(Ze);', 'return t && rt(t);'] },
  },
  // Unit :b: c6369e48b h (export default) is remark-math, the third chunk c851b27a8 ki imports lazily
  // (`import("./c6369e48b-jalMQaq2.js")`, read as `remarkMath: r.default` by Ai): the processor attacher that pushes the
  // micromark math syntax (p), the mdast from-markdown handlers (r) and the to-markdown handlers (i). Emitted under the
  // chunk's own file name and its own `default` alias, so ki's specifier and `.default` resolve once ki joins this graph
  // (3.6556.2: c6369e48b-Cz3VPKCm.js#h, exported `default` as well).
  [REMARK_MATH]: {
    h: { name: 'remarkMath', export: 'default', emit: 'default', probe: 'micromarkExtensions||=[]', features: ['function h(e) {', 'n = e || m,',
      'o = (a.micromarkExtensions ||= []),', 's = (a.fromMarkdownExtensions ||= []),', 'c = (a.toMarkdownExtensions ||= []);', '(o.push(p(n)), s.push(r()), c.push(i(n)));'] },
  },
};
// Located and pinned like ROOTS, not emitted: `blockedBy` says why (see the header); :b moves each into ROOTS once its
// blocker is gone (cds-core wave 7 publicNames), never by relaxing a check.
export const PENDING_ROOTS = {
  [CC1]: {
    EP: { name: 'ChatTextMarkdown', export: null, probe: 'directionTelemetry:S', features: ['let $ = J9(23),', 'unlinkHref: d,', 'rubyAnnotations: C', 'letterDirection: x,',
      'directionTelemetry: S,', 'w = i !== void 0 && i;', 'm(Uv, {'], blockedBy: 'closure (through Uv = c89efce1a Mu) writes cds-core module state; see Mu' },
  },
  [C89]: {
    Mu: { name: 'StandardMarkdown', export: 's', probe: 'normalizationMode:o', features: ['let $ = J9(113),', 'normalizationMode: o,', 'dialect: s,', 'markedText: c,',
      'rubyAnnotations: l,', 'showHtmlComments: d,', 'deferOffscreenBlocks: f,', 'smartQuotes: te,', 'hangingQuotes: M,', 'mathPlaceholders: ne,',
      'useStreamingFadeIn: re,'],
      blockedBy: 'closure re-slices writers of cds-core-held module state (c851b27a8 Ai/ki/Ti/Si/wi/Ei/fi/$r/qr/ht, shared-0 mC/bC, shared-62 Va/Ha, vendor-zod k): writes to read-only imports' },
  },
  [C851]: {
    Ai: { name: 'loadLatexPlugins', export: null, probe: 'rehypeKatexGuardedAndChecked', features: ['function Ai(e) {', 'status: "ready",', 'remarkMath: r.default,',
      'rehypeKatex: n.rehypeKatexGuardedAndChecked((t) => $r(t, e, i)),', 'katex: e.default,', 'inHouseLatexPlugin: ht,', '((xr = null), (Ar = !1), (Ir = null), (Lr = null))'],
      blockedBy: 'assigns cds-core-held c851b27a8 xr/Ar/Ir/Lr/Z/jr/Mr/Pr/Fr (wave6 unblocks: state_c851b27a8_Ai blocked by vendor-markdown ee document-at-load and the ki dynamic imports)' },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root, pending ones included (`--locate` prints them).
export const ROOT_PINS = {
  [`${KATEX_PLUGIN}#it`]: '9feb947abcdd5d1be4486e0ffc869df39d1882a4f3218d2b0c3139644fe19d48',
  [`${KATEX_PLUGIN}#at`]: '5d7eefe6331b68b461d7cd93bd10d50655bdc567b78169a3fa546d1aa577ffc2',
  [`${REMARK_MATH}#h`]: '2027c5849606a992d2a4fca1072a8e2e833703abf3ce09302d2459e56f13552f',
  [`${CC1}#EP`]: '5b4643a838008b404cdba4f4c96990c31cf02710be39946d2cf9a96c69e751cc',
  [`${C89}#Mu`]: '5ecd5b925fb6e7537506abd250cb08d47fa423c3a8524f99eb15af104ebdc6b4',
  [`${C851}#Ai`]: 'e5b9436796e335b2a5de0fd0a952998f6958fc1bdf352dab1db72efb2aa6610f',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from, features } ─────────────────────────
export const HOST_ADAPTERS = {
  // shared-0 eP = P(iP, N.O11Y_INTERNALS) (exported xm): ca129fbf3 rt reports a refused formula ("katex_refuse_failed")
  // as a handled severe error to datadog; its closure is the datadog client with dynamic imports. OpenClaude Desktop sends
  // no telemetry (3.6556.2 renderer: shared-0 iO reportO11yError, E59): nothing is reported.
  'shared-0-CnnWnVrT.js#eP': { name: 'reportHandledError', from: HERE, features: ['var eP = P(iP, N.O11Y_INTERNALS);'],
    also: { iP: ['source: "handled_severe",', 'handled_reason: e,'] } },
};
export const ADAPTER_PINS = {
  'shared-0-CnnWnVrT.js#eP': 'cc9c7858d1d485031e8d798e43b910389b27f8487bf21cbe86b3e3513a77f671',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (ADAPTER_PINS[key] === undefined) throw Error(`adapter ${key}: no reviewed pin`);
// Unit :b drafts for the pending closure (surveyed with `--survey-pending --with-drafts`, never used by generation): the
// two host boundaries 3.6556.2 already drew on the same paths. They are not in HOST_ADAPTERS (no adapter is written for
// code this graph does not emit); the survey shows which cds-core writers they keep out of the closure.
//   shared-0 H = P(Zw, N.O11Y_INTERNALS) (exported ry): the o11y-internals logger c89efce1a ae reaches; its Zw -> pC ->
//     mC / bC hold queue writes shared-0 lC / uC / cC / sC (cds-core state) and pulls vendor-datadog. 3.6556.2: shared-0
//     iO / B adapters (reportO11yError / trackAction, E59: no telemetry).
//   shared-123 PD (exported eg): the source favicon (Globe fallback, server favicon lookups through ta -> shared-62 Ga ->
//     Ha / Va, the public-suffix parser load writing shared-62 Na / Ma / za / Pa). 3.6556.2: shared-78 WF adapter
//     ChatSourceFavicon (the renderer CSP forbids the favicon service; the host draws WF's own Globe fallback).
export const PENDING_HOST_ADAPTERS = {
  'shared-0-CnnWnVrT.js#H': { name: 'logO11yInternals', from: HERE, features: ['var H = P(Zw, N.O11Y_INTERNALS);'] },
  'shared-123-1Hc1RTKl.js#PD': { name: 'ChatSourceFavicon', from: HERE, features: ['name: "Globe",', 'customSize: l + 2,',
    'fallbackSvg: r,', 'disableServerUrlLookups: t,', 'skipPrivateSuffixHosts: o,', 'if (!c) return m;'] },
};

// Pure bindings a linked area slices without exporting, cut again here (none in :a).
const linkedCopies = {};
// Unit :b, for the pending closure (survey `--with-drafts`; joins linkedCopies when the pending roots are emitted):
// turn-plan-v4 shared-92.mjs slices shared-92's secret scanner without exporting it (56 bindings, reached from the
// Markdown code path). Reviewed as pure (round2/chat-renderer-b/tools/unexported-classified.json): 17 functions, regular
// expressions and their source strings / template literals, numeric and string constants, the pattern table YA and the
// escape table RA; the only module-level values filled later are deterministic memo caches of the same results (hj, the
// per-plane Uint8Array table _j fills; rj / lj / dj, rn(() => RegExp(...)) lazies), and the sticky / global regular
// expressions (Cj, aj) set lastIndex before every use, so a copy holds no state another graph observes.
export const PENDING_LINKED_COPIES = Object.fromEntries([
  'Rj', 'Bj', 'sj', 'YA', 'LA', 'JA', 'qA', 'GA', 'HA', 'UA', 'zA', 'BA', 'WA', 'VA', 'KA', 'ij', 'nj', 'rj', 'RA',
  'oj', 'aj', 'XA', 'QA', 'ZA', 'tj', 'Tj', 'uj', 'lj', 'wj', 'Ej', 'fj', 'Mj', 'kj', 'dj', 'Dj', 'Oj', 'jj', 'Cj',
  'Aj', 'Fj', 'Sj', 'Pj', 'Nj', '$A', 'ej', 'vj', 'pj', 'hj', 'gj', '_j', 'mj', 'Lj', 'bj', 'yj', 'xj', 'Ij',
].map(name => [`shared-92-BOgyxePb.js#${name}`, 'a pure binding turn-plan-v4 shared-92.mjs slices without exporting (secret scanner)']));
export const LINKED_AREAS = ['chat-markdown-v4', 'r3b-transcript-v4', 'routines-shared-v4', 'working-line-v4', 'cowork-progress-v4', 'turn-plan-v4',
  // 3.6556.2 linked cowork-approval's shared-52 Qq (push all of an array, copying a self-append); 4.16336.0 is shared-123
  // ZS (`let n = t === e ? e.slice() : t; for (let t of n) e.push(t)`), which frame-sidebar-nav exports (D1: one copy).
  { area: 'frame-sidebar-nav', modules: ['shared-123.mjs'] },
];
// Unit :b: the main-workflow regions the 3.6556.2 renderer linked (transcript-rows, chat-artifact-card, chat-knowledge,
// session-rail, session-rail-sections), on their 4.16336.0 graphs. The emitted closure (ROOTS) reaches none of them, so
// they are not linked by generation (an unused link would only pin a manifest another line is still writing); the
// pending closure is surveyed against them (`--survey-pending --with-main`), and :b's successor moves them into
// LINKED_AREAS together with the pending roots. An area without a 4.16336.0 manifest yet is skipped by the survey and
// reported (mainWorkflowDepRule: never linked to its 3.6556.2 directory).
export const MAIN_WORKFLOW_AREAS = ['transcript-rows-v4', 'chat-artifact-card-v4', 'chat-knowledge-v4', 'session-rail-v4', 'session-rail-sections-v4'];
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+(?:-\d+)?|rolldown-runtime|preload-helper|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
// Chunks the original loads with import("./<chunk>.js") (c851b27a8 ki): emitted under their own file name, so the
// original specifiers resolve when the loader joins this graph.
const LAZY_NAMED = new Set([KATEX_PLUGIN, KATEX, REMARK_MATH]);
const targetOf = file => LAZY_NAMED.has(file) ? file : target(file);
// The originals the roots read that no linked area, adapter or cds-core publicName answers, one module per chunk (listing
// a chunk the closure never enters, or entering one not listed, stops generation).
export const MODULE_CHUNKS = ['shared-11-CNsu0Zu8.js', 'shared-31-C9BqSSuD.js', 'vendor-markdown-CoTLcoVs.js', C851];
// Copied byte for byte under their own names (runSlicer verbatim; sha256 in the manifest): cf1a02a1a is the KaTeX bundle
// the desktop ships (katex 0.16.47 inlined behind rolldown's __export helper; its top level runs `for (var gt = …)`
// symbol-table loops a declaration slicer cannot cut), and its only import, rolldown-runtime (the bundler's pure interop
// helpers), comes along as a verbatim dependency. ca129fbf3 reads the namespace (`t`) and c851b27a8 ki lazily imports the
// same file (`.then(e => e.n)`), so both original specifiers resolve to this one copy.
export const VERBATIM_CHUNKS = [KATEX];
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: targetOf(file),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.emit ?? r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...MODULE_CHUNKS.filter(f => !ROOTS[f]).map(source => ({ source, target: targetOf(source) })),
  ...VERBATIM_CHUNKS.map(source => ({ source, target: source, verbatim: true })),
];
// Link requests (D1; the 4.16336.0 form of scripts/code-transcript-links.json): a consumer of this graph (code-transcript,
// pierre-changes) that reaches a binding this graph slices lists it in its own scripts/<consumer>-v4-links.json under
// linkExports['chat-renderer-v4'][chunk]; the binding is then exported here under its own name (runSlicer linkExports),
// so the consumer imports this one copy instead of slicing it again. A request for a chunk this graph has no module for,
// for a verbatim chunk, or for a binding outside the closure stops generation. The surface is round2/chat-renderer-b/
// link-surface.json.
export const LINK_REQUEST_FILES = ['code-transcript-v4-links.json', 'pierre-changes-v4-links.json'];
const linkRequests = {};
for (const file of LINK_REQUEST_FILES) {
  let text;
  try { text = await fs.readFile(path.join(import.meta.dirname, file), 'utf8'); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
  const asked = JSON.parse(text).linkExports?.['chat-renderer-v4'] ?? {};
  linkRequests[`scripts/${file}`] = { sha256: sha(text), linkExports: asked };
  for (const [chunk, locals] of Object.entries(asked)) {
    const m = modules.find(mod => mod.source === chunk);
    if (!m || m.verbatim) throw Error(`scripts/${file}: chat-renderer-v4 has no sliced module for ${chunk}`);
    m.linkExports = [...new Set([...(m.linkExports ?? []), ...locals])].sort();
  }
}

// Pinned on the minified bytes (each exactly once): how the desktop reaches the roots.
const rawCallSites = [
  { source: C851, role: 'ki loads katex (cf1a02a1a n), rehype-katex (ca129fbf3) and remark-math (c6369e48b) lazily; Ai keeps the guarded rehype-katex with the in-house plugin ht',
    features: ['import("./cf1a02a1a-A3V2xzb_.js").then(e=>e.n)', 'import("./ca129fbf3-HnH_eJBK.js")', 'import("./c6369e48b-jalMQaq2.js")',
      'rehypeKatex:n.rehypeKatexGuardedAndChecked(t=>$r(t,e,i)),katex:e.default,inHouseLatexPlugin:ht'] },
  { source: CC1, role: 'EP hands every prop to c89efce1a Mu (imported as Uv); the render-path warmup feeds it the settled sample',
    features: ['m(Uv,{text:t,blockCitations:n,className:r,isStreaming:w,', 'm(EP,{text:DP,isStreaming:t,headingLevelOffset:1,typography:zv,smartQuotes:r,rubyAnnotations:!0,onSettledCommit:n})'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}
async function locate(table, cache, pending) {
  const found = [];
  for (const [file, roots] of Object.entries(table)) {
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
      found.push({ file, local, name: spec.name, export: alias, declarationSha256, pinned: pin !== null, ...(pending ? { pending: true, blockedBy: spec.blockedBy } : {}) });
    }
  }
  return found;
}
export async function locateRoots(cache = new Map()) {
  return [...await locate(ROOTS, cache, false), ...await locate(PENDING_ROOTS, cache, true)];
}

export async function pinAdapters(cache = new Map()) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    for (const [other, features] of Object.entries(spec.also ?? {})) {
      const also = src.top.get(other);
      if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
      assertFeatures(`adapter ${key} (${other})`, await featureText(src, also), features);
    }
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (pin !== null && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, declarationSha256, pinned: pin !== null });
  }
  return out;
}

// The host adapter module exports exactly the adapted names: each re-exported from the host adapter that documents it, or
// (from: HERE) defined in the module itself; it never imports generated code.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
  for (const m of text.matchAll(/^export (?:const|function) ([\w$]+)/gm)) exported.set(m[1], HERE);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (exported.get(name) !== from) throw Error(`${ADAPTER_FILE}: ${name} is not ${from === HERE ? 'defined here' : `re-exported from ${from}`}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  if (/from ["']\.\/generated\//.test(text) || /import\(["']\.\/generated\//.test(text)) throw Error(`${ADAPTER_FILE}: must not import generated code`);
  for (const [name, from] of wanted) {
    if (from === HERE) continue;
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the chat-renderer-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}
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

// An emitted declaration must never assign a binding this graph imports (from cds-core, a linked area or an adapter):
// an ES import binding is read-only (TypeError at the first write), and the state belongs to its owner. The engine's
// state test (WeakMap / Map / Set / createContext held without a publicName) does not see these, so the planned closure
// is checked here; any hit stops generation (the writer must come from the state's owner).
export async function importedWrites(manifest, cache = new Map()) {
  const found = [];
  for (const m of manifest.modules) {
    if (m.verbatim) continue;
    const ext = new Map((m.imports ?? []).filter(i => i.kind !== 'generated' && i.kind !== 'verbatim').map(i => [i.local, i]));
    if (!ext.size) continue;
    const src = await readSource(m.source, cache, official.ionSource);
    for (const b of m.bindings) {
      const name = typeof b === 'string' ? b : b.name;
      const entry = src.top.get(name);
      const text = (entry.kind === 'var' ? 'var ' : '') + rawText(src, entry) + (entry.kind === 'var' ? ';' : '');
      babel.traverse(babel.babelParse(text, `${m.source}#${name}`, true), {
        'AssignmentExpression|UpdateExpression'(p) {
          const t = p.node.type === 'AssignmentExpression' ? p.node.left : p.node.argument;
          if (t.type === 'Identifier' && t.name !== name && ext.has(t.name) && !p.scope.hasBinding(t.name)) {
            const i = ext.get(t.name);
            found.push({ module: m.target, file: m.source, writer: name, writes: t.name, importedFrom: i.from, as: i.name, kind: i.kind });
          }
        },
      });
    }
  }
  return found;
}

export function chatRendererV4Config(extra = {}) {
  return {
    name: 'chat renderer (4.16336.0)', generator: 'extract-chat-renderer-v4.mjs', output: path.join(root, CHAT_RENDERER_V4_OUTPUT),
    adapterModule: '../../source-chat-renderer-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    publicAssetsRoot: stagedPublicAssets,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases }, ...extra,
  };
}
const quiet = async run => { const log = console.log; console.log = () => {}; try { return await run(); } finally { console.log = log; } };

export async function extractChatRendererV4({ check = false, dryRun = false } = {}) {
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
  const planned = await quiet(() => runSlicer(chatRendererV4Config(), { dryRun: true }));
  const writes = await importedWrites(planned, cache);
  if (writes.length) throw Error(`emitted declarations assign bindings this graph imports (read-only; the writer belongs to the state's owner):\n  ${writes.map(w => `${w.module}: ${w.file}#${w.writer} writes ${w.writes} (${w.kind} ${w.from ?? w.importedFrom} ${w.as})`).join('\n  ')}`);
  if (dryRun) return planned;
  const cfg = chatRendererV4Config({
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the chat-renderer roots (${official.referenceVersion}); generated by extract-chat-renderer-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.keys(rs).map(l => rs[l].emit ? `${rs[l].emit} as ${rs[l].name}` : rs[l].name).join(', ')} } from "./${targetOf(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-chat-renderer-v4.mjs',
          unit: 'round2 chat-renderer:a (LaTeX + Markdown root groups), chat-renderer:b (remark-math root; pending-closure survey against the main-workflow -v4 graphs, draft boundaries, link-surface.json)',
          previous: { generator: 'scripts/extract-chat-renderer.mjs', output: 'src/generated/chat-renderer', referenceVersion: official.previousVersion,
            roots: { ChatTextMarkdown: 'cc1aae219-CeSwM-tp.js#OR', StandardMarkdown: 'c89efce1a-C_nlrFif.js#rc', loadLatexPlugins: 'c851b27a8-BxvTOAx3.js#Jr',
              markLatexStylesheetSettled: 'c851b27a8-BxvTOAx3.js#Hr (4.16336.0: the settle is qr inside Ai/Ni, no separate root)',
              requestLatexFontWait: 'c851b27a8-BxvTOAx3.js#Gr (4.16336.0: fi, reached from Ii)',
              rehypeKatexGuardedAndChecked: 'ca129fbf3-CdfQB5sF.js#at', rehypeKatexChecked: 'ca129fbf3-CdfQB5sF.js#it', remarkMath: 'c6369e48b-Cz3VPKCm.js#h' },
            linkedSharedPushAll: { from: 'cowork-approval shared-52-uHFNjl7C.mjs Qq', to: 'shared-123-1Hc1RTKl.js#ZS (frame-sidebar-nav shared-123.mjs)' } },
          isolatedGraph: { productionOutput: 'src/generated/chat-renderer', productionSwitchNotBeforeBatch: 11,
            consumers: ['code-transcript', 'pierre-changes', 'sidebar-hover-card'] },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked, linkRequests,
          roots: roots.filter(r => !r.pending), pendingRoots: roots.filter(r => r.pending), adapters, linkedCopies,
          imports: m.modules.flatMap(mod => (mod.imports ?? []).filter(i => i.kind && i.kind !== 'generated' && i.kind !== 'verbatim').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  });
  return runSlicer(cfg, { check, dryRun });
}

// Survey (writes nothing): what the pending roots would need. The closure of ROOTS + PENDING_ROOTS is explored and every
// assignment to a binding it would import is listed with the chain that reaches the writer.
export async function surveyPending({ withMain = false, withDrafts = false } = {}) {
  const cache = new Map();
  const missing = [], extra = [];
  if (withMain) for (const area of MAIN_WORKFLOW_AREAS) {
    try {
      const m = JSON.parse(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'), 'utf8'));
      if (m.referenceVersion === official.referenceVersion) extra.push(area); else missing.push({ area, referenceVersion: m.referenceVersion });
    } catch { missing.push({ area, referenceVersion: null }); }
  }
  const linkedAreas = [...LINKED_AREAS, ...extra];
  const all = { ...ROOTS };
  for (const [file, roots] of Object.entries(PENDING_ROOTS)) all[file] = { ...(all[file] ?? {}), ...roots };
  const mods = Object.entries(all).map(([file, roots]) => ({ source: file, target: targetOf(file), internal: true,
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])) }));
  const before = process.env.WORKING_LINE_EXPLORE;
  process.env.WORKING_LINE_EXPLORE = '1';
  globalThis.__exploreEdges = [];
  let planned, message = null;
  const said = [], log = console.log;
  console.log = (...a) => { if (String(a[0]).startsWith('EXPLORE')) said.push(a.join(' ')); };
  const drafts = withDrafts ? Object.fromEntries(Object.entries(PENDING_HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])) : {};
  const localAdapters = { ...chatRendererV4Config().localAdapters, ...drafts };
  const copies = { ...linkedCopies, ...(withDrafts ? PENDING_LINKED_COPIES : {}) };
  try { planned = await runSlicer(chatRendererV4Config({ modules: mods, linkedAreas, localAdapters, linkedCopies: copies }), { dryRun: true }); } catch (e) { message = String(e.message); } finally {
    console.log = log;
    if (before === undefined) delete process.env.WORKING_LINE_EXPLORE; else process.env.WORKING_LINE_EXPLORE = before;
  }
  const parents = new Map();
  for (const [from, to] of globalThis.__exploreEdges) if (from && !parents.has(to)) parents.set(to, from);
  delete globalThis.__exploreEdges;
  // runSlicer's explore report: bindings a linked area slices without exporting, and cds-core state held without a name.
  const said1 = said.join('\n');
  const listed = label => (new RegExp(`EXPLORE ${label}:([^\n]*)`).exec(said1)?.[1] ?? '').trim().split(/ (?=[\w$.-]+\.js#)/).filter(Boolean);
  const unexportedLinks = listed('unexported links'), stateConflicts = listed('state conflicts');
  if (!planned) return { linkedAreas, missingMainAreas: missing, unexportedLinks, stateConflicts, error: message };
  const writes = await importedWrites(planned, cache);
  const writers = new Map();
  for (const w of writes) {
    const key = `${w.file}#${w.writer}`;
    if (!writers.has(key)) {
      const reachedBy = [];
      for (let at = parents.get(key); at && reachedBy.length < 24; at = parents.get(at)) reachedBy.push(at);
      writers.set(key, { writer: key, writes: [], reachedBy });
    }
    writers.get(key).writes.push(`${w.writes} <- ${w.kind} ${w.importedFrom} ${w.as}`);
  }
  const byArea = {};
  for (const m of planned.modules) for (const i of m.imports ?? []) {
    const area = /^\.\.\/([\w-]+)\//.exec(i.from ?? '')?.[1] ?? i.kind;
    (byArea[area] ??= new Set()).add(`${i.via} -> ${i.name}`);
  }
  return { linkedAreas, missingMainAreas: missing, draftAdapters: Object.keys(drafts), unexportedLinks, stateConflicts,
    chunks: planned.modules.map(m => ({ source: m.source, bindings: m.bindings.length, heldByViewTabs: m.heldByViewTabs?.length ?? 0 })),
    importsByArea: Object.fromEntries(Object.entries(byArea).map(([a, v]) => [a, [...v].sort()])),
    writers: [...writers.values()].map(w => ({ ...w, writes: [...new Set(w.writes)] })) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    for (const f of await locateRoots()) console.log(f.pending ? 'pending' : 'root', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const a of await pinAdapters()) console.log('adapter', a.original, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
  } else if (process.argv.includes('--survey-pending')) console.log(JSON.stringify(await surveyPending({ withMain: process.argv.includes('--with-main'), withDrafts: process.argv.includes('--with-drafts') }), null, 2));
  else await extractChatRendererV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
