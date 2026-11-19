// Pierre Changes body, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, round 2, unit pierre-changes;
// region-plan batch 11). The 3.6556.2 graph (scripts/extract-pierre-changes.mjs -> src/generated/pierre-changes) is
// untouched (staged double output; no production switch: src/source-diff.jsx keeps importing src/generated/pierre-changes).
// This generator re-locates the 3.6556.2 roots in the frozen 4.16336.0 snapshot and cuts what is cuttable now into the
// isolated folder src/generated/pierre-changes-v4, step pc-0; the rest is located, pinned and held (PENDING_ROOTS).
//
// Roots (4.16336.0 c44d00c7f-DNez7133 / cc8941b7b-C4hsxbbb; 3.6556.2 c44d00c7f-Cr1FDL2F / cc8941b7b-DAgMZRvX in brackets):
//   pc-0, cut here:
//     c44d00c7f fo  PierreChangesFileHeader   [Zu = v(Xu)]   `fo = u(co)` (memo), the file header the body and the
//                                                            per-file rows draw (reserveImageAction / reserveMenuAction)
//               Ff  pierreChangesMessages     [lu]           "Show more lines" (UT3lU03eUR)
//               ca  comparisonFileEntries     [mi]           exported C; the content hash and order of the pane's files
//               Ql  useDiffFetchScheduler     [Vc]           the pane's `Ct = Ql(r)` (one scheduler per session, views)
//               ud  DiffImageViewerContext    [Yc]           `h(null)`: {open(path), stale} where images can be read
//               dd  DiffImageViewerShownContext [Xc]         `h(!1)`: true where the comparison can read images
//               fd  DiffImageViewerProvider   [— (Jd provided Yc / Xc itself)] exported s; provides ud and dd
//     ud / dd share their shape with _l (`h(null)`) and oo (`h(!1)`); round2/plan.json named fo / oo for the two
//     contexts, which is wrong (fo is the memo file header, oo the hover-mark overlay context): they are told apart on
//     the official AST by their one provider (ROOT_CONSTRAINTS imageViewerProvider), fd, whose value for ud is
//     `d ? {open: p, stale: o} : null` and for dd `d = r !== void 0` (fetchFileImages given).
//   held (located and pinned; PENDING_ROOTS says why and is re-checked on every run):
//     c44d00c7f Cp  PierreChanges             [Ju = v(qu)]   `Cp = u(Sp)`, mounted by the Changes pane Dm (CALL_SITES)
//               Kl  PierreChangesCommentCard  [Fc]           "Tell Claude what to change"
//     cc8941b7b I   useDiffAnnotationStore    [F]   q        the one session diff-annotation / review / PR comment store
//               L   diffAnnotationActions     [I]   N
//               j   diffAnnotationKey         [k]   H        M isFileAnnotationKey [A] R
//               at  useFileAnnotations        [Ie]  Q        Kt useFileAnnotationDrafts [St] $
//               F   prCommentBodiesStore      [—]   J        (new in 4.16336.0: the PR comment draft / edit bodies)
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here): sourceContract
// scripts/official-4.16336.0.mjs, sharedGraph 'cds-core' (pinned manifest sha256), linkedAreas (D1: every binding a
// linked 4.16336.0 graph holds and exports is imported from it, never cut again), host boundaries as localAdapters
// re-exported unchanged by src/source-pierre-changes-v4-adapters.jsx (each original pinned by features and raw sha256).
// Roots are located on the official AST: each is the only top-level declaration of its chunk whose raw text has the
// probe, whose prettier form carries every feature and that passes its constraint, under the reviewed local, with the
// reviewed export aliases and its raw declaration sha256 pinned (ROOT_PINS; never refreshed by a script).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const PIERRE_CHANGES_V4_OUTPUT = 'src/generated/pierre-changes-v4';
const ADAPTER_FILE = 'src/source-pierre-changes-v4-adapters.jsx';
export const STEPS = ['pc-0'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const esc = s => s.replace(/[$]/g, '\\$');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

export const C44 = 'c44d00c7f-DNez7133.js', CC89 = 'cc8941b7b-C4hsxbbb.js';
const O44 = 'c44d00c7f-Cr1FDL2F.js', O89 = 'cc8941b7b-DAgMZRvX.js';

// ── Roots: file -> local -> { name, step, exports (the chunk's own aliases; [] chunk-internal), probe (raw), features,
//    constraint (ROOT_CONSTRAINTS key), inner (memo wrapper: the inner component's features), slice (false: held),
//    previous (3.6556.2 file#local) } ─────────────────────────────────────────────────────────────────────────────────
export const ROOTS = {
  [C44]: {
    fo: { name: 'PierreChangesFileHeader', step: 'pc-0', exports: [], probe: 'fo=u(co)', features: ['var fo = u(co);'],
      inner: { local: 'co', features: ['reserveImageAction: b,', 'reserveMenuAction: S,', 'openCommentCount: d,', 'd === "set" && so.madeExecutable,'] }, previous: `${O44}#Zu` },
    Ff: { name: 'pierreChangesMessages', step: 'pc-0', exports: [], probe: 'showMoreLines:{defaultMessage:"Show more lines"',
      features: ['showMoreLines: { defaultMessage: "Show more lines", id: "UT3lU03eUR" },'], previous: `${O44}#lu` },
    ca: { name: 'comparisonFileEntries', step: 'pc-0', exports: ['C'], probe: 'lazy_file_hunks===!0',
      features: ['a = e.lazy_file_hunks === !0,', 'contentHash: me(o),', 'return r.sort((e, t) => ua(e.filePath, t.filePath, n));'], previous: `${O44}#mi` },
    Ql: { name: 'useDiffFetchScheduler', step: 'pc-0', exports: [], probe: '.views+=1', features: ['let r = Zl(e).core;', '(t.views += 1),'], previous: `${O44}#Vc` },
    ud: { name: 'DiffImageViewerContext', step: 'pc-0', exports: [], probe: '=h(null)', features: ['var ud = h(null);'], constraint: 'imageViewerProvider:value', previous: `${O44}#Yc` },
    dd: { name: 'DiffImageViewerShownContext', step: 'pc-0', exports: [], probe: '=h(!1)', features: ['var dd = h(!1);'], constraint: 'imageViewerProvider:shown', previous: `${O44}#Xc` },
    fd: { name: 'DiffImageViewerProvider', step: 'pc-0', exports: ['s'], probe: 'fetchFileImages:r,scopeKey:a,stale:o',
      features: ['{ files: t, fetchFileImages: r, scopeKey: a, stale: o, children: c } = e,', 'd ? { open: p, stale: o } : null', 'n(dd, { value: d, children: x })', 'i(ud, { value: m, children: [c, b] })'], previous: null },
    Cp: { name: 'PierreChanges', step: 'pc-1', slice: false, exports: [], probe: 'Cp=u(Sp)', features: ['var Cp = u(Sp);'],
      inner: { local: 'Sp', features: ['foldsProvisional: u = !1,', 'fetchScheduler: _,', 'commentOrigin: L = "diff_pane",', 'onStepPrComment: B,'] }, previous: `${O44}#Ju` },
    Kl: { name: 'PierreChangesCommentCard', step: 'pc-1', slice: false, exports: [], probe: 'Tell Claude what to change',
      features: ['defaultMessage: "Tell Claude what to change",', 'n(Pr, { ...e, isActive: r, placeholder: i })'], previous: `${O44}#Fc` },
  },
  [CC89]: {
    I: { name: 'useDiffAnnotationStore', step: 'pc-1', slice: false, exports: ['q'], probe: 'annotationsBySession:{},',
      features: ['annotationsBySession: {},', 'findingsIndexBySession: {},', 'heldMarksBySession: {},', 'scrollTargetBySession: {},'], previous: `${O89}#F` },
    L: { name: 'diffAnnotationActions', step: 'pc-1', slice: false, exports: ['N'], probe: 'scrollToAnnotation:I.getState().scrollToAnnotation',
      features: ['addAnnotation: I.getState().addAnnotation,', 'setReviewFindings: I.getState().setReviewFindings,'], previous: `${O89}#I` },
    j: { name: 'diffAnnotationKey', step: 'pc-1', slice: false, exports: ['H'], probe: 'e.source==="file"?',
      features: ['return e.source === "file" ? `${We}${e.endLine}` : Ue(e.side, e.endLine);'], previous: `${O89}#k` },
    M: { name: 'isFileAnnotationKey', step: 'pc-1', slice: false, exports: ['R'], probe: 'return e.startsWith(We)', features: ['return e.startsWith(We);'], previous: `${O89}#A` },
    at: { name: 'useFileAnnotations', step: 'pc-1', slice: false, exports: ['Q'], probe: 'annotationsBySession[e]?.[t]??R',
      features: ['n.annotationsBySession[e]?.[t] ?? R', 'r[e.id] === void 0'], previous: `${O89}#Ie` },
    Kt: { name: 'useFileAnnotationDrafts', step: 'pc-1', slice: false, exports: ['$'], probe: 'draftsBySession[e]?.[t]??it',
      features: ['n.draftsBySession[e]?.[t] ?? it'], previous: `${O89}#St` },
    F: { name: 'prCommentBodiesStore', step: 'pc-1', slice: false, exports: ['J'], probe: 'editBodiesBySession:{}',
      features: ['bodiesBySession: {},', 'editBodiesBySession: {},', 'postStateBySession: {},'], previous: null },
  },
};

// Caller / provider constraints that tell shape-identical declarations apart (each must leave exactly one).
const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const aliasesOf = (src, local) => [...src.exported].filter(([, l]) => l === local).map(([a]) => a);
export const ROOT_CONSTRAINTS = {
  // The image viewer provider (the chunk's one declaration providing this context, with fetchFileImages): `value` — the
  // context whose provided value is `d ? {open: …, stale: …} : null`; `shown` — the one whose value is `d = r !== void 0`.
  imageViewerProvider: async (src, local, kind) => {
    const provides = declarations(src).filter(e => new RegExp(`[(,]${esc(local)},\\{value:[\\w$]+,`).test(rawText(src, e)));
    if (provides.length !== 1) return false;
    const raw = rawText(src, provides[0]);
    if (!raw.includes('fetchFileImages')) return false;
    const value = new RegExp(`[(,]${esc(local)},\\{value:([\\w$]+),`).exec(raw)[1];
    if (kind === 'value') return new RegExp(`[,\\s]${esc(value)}=[^;]*\\?K3\\([^;]*,[\\w$]+\\?\\{open:[\\w$]+,stale:[\\w$]+\\}:null\\)`).test(raw);
    if (kind === 'shown') return new RegExp(`[,\\s]${esc(value)}=[\\w$]+!==void 0[,;]`).test(raw);
    return false;
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them).
export const ROOT_PINS = {
  'c44d00c7f-DNez7133.js#fo': 'dd96d3491c7ecde510e24dc38c8e9748bf5c5a9fcca236689b1f28f388880bb5',
  'c44d00c7f-DNez7133.js#Ff': '16782c7b2bff749b70061e7670b4e6aec3bff0e8ea4c9f17e26f7a0b39678504',
  'c44d00c7f-DNez7133.js#ca': 'dabf610917a3a344ebf4c5e02bb1dffbd783ecf1e901bd4181729b7ca311e248',
  'c44d00c7f-DNez7133.js#Ql': '9720f19a1ea45feb31198872629b5a5842eaa8386f8400d9014a739b7f8f348a',
  'c44d00c7f-DNez7133.js#ud': 'ef07d073f521ce57ff7b0da22448338a08bcf1979ae9f235f7129b9196fa08c3',
  'c44d00c7f-DNez7133.js#dd': '85f6e5ae0c41258232b802ff1aa3d3fb853daedd1924f26b94ab2ee7d604b633',
  'c44d00c7f-DNez7133.js#fd': 'dbea45b616ac74bb0875a06b888ad8e3e5c828268bd75258d2c2aa6666e11d9b',
  'c44d00c7f-DNez7133.js#Cp': '1cd5dd2f27ad90ef3c78c10baacd68e3a406e8c24dd4c4d9f0b563ae9ab73342',
  'c44d00c7f-DNez7133.js#Kl': 'f588a317fb1a81aa41b3cd70489347cdf8921e26700ce47179b4424b83be8d02',
  'cc8941b7b-C4hsxbbb.js#I': 'd4477b4f610d928888617d46b2be6cdb8b0b169ab14176baab5e37ca75cf7765',
  'cc8941b7b-C4hsxbbb.js#L': '3719e942fabe536bd5428d5a0938ec1ce7d9fdb0504f3a07c5d7050fc13973cf',
  'cc8941b7b-C4hsxbbb.js#j': '6909390d1afb8bfced4be96292dc19275adb53563f0fdbb07bcde5f647d9d389',
  'cc8941b7b-C4hsxbbb.js#M': '8d75e9de06602e05277bbd43b7eeb88a7f68dd58ea1832fe4a4232f6912145e0',
  'cc8941b7b-C4hsxbbb.js#at': '0a67a4bc4c938fd6569f13600183280915aad1845a9fa4e74a81e8943c6e29a3',
  'cc8941b7b-C4hsxbbb.js#Kt': '715068bb987029012dc169a0ec86ac00664739d55a8ad66f88044d6d75fd2116',
  'cc8941b7b-C4hsxbbb.js#F': 'a599e3dda0460b506e6eebda20e15660a49d1ec8922def1189946830c37ac33c',
};

// ── The call site the host follows (not imported): the Changes pane Dm mounts Cp outside a pop-out window and without
//    perFileList (3.6556.2 Jd: `pt = Le(!dt && !Ye)`), with the scheduler Ql(sessionId). Raw sha256 pinned. ────────────
export const CALL_SITES = [
  { source: C44, binding: 'Dm', previous: `${O44}#Jd`, probe: 'mt=Re(!dt&&!Ye)',
    role: 'pc-1: the Changes pane (Dm): `mt = Re(!dt && !Ye)`; with mt the body is Cp (PierreChanges), the scheduler `Ct = Ql(r)`. Host: src/source-diff.jsx PierreChangesBody (local_pierre_changes_body)',
    features: ['mt = Re(!dt && !Ye),', 'Ct = Ql(r),', 'n(Cp, {', 'fetchScheduler: Ct,', 'onAnnotationSaved: ne,', 'onStepPrComment: Vt,'] },
];
export const CALL_SITE_PINS = {
  'c44d00c7f-DNez7133.js#Dm': 'bd3cd2b9db69839544c499b4c1a51c72e4e17465488ec847fed0f63ea0d6092c',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from (existing host adapter), features } ─────
export const HOST_ADAPTERS = {
  // react-intl useIntl / FormattedMessage over the local catalog (3.6556.2 vendor-intl q / Gt; the renderer family's
  // adapters: src/source-session-rail-kit-adapters.jsx, which the 3.6556.2 src/source-pierre-changes-adapters.jsx reaches through
  // source-code-transcript-adapters.jsx).
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: 'src/source-session-rail-kit-adapters.jsx', features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: 'src/source-session-rail-kit-adapters.jsx', features: ['var Gt = a(Wt, Ut);'] },
};
export const ADAPTER_PINS = {
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!ADAPTER_PINS[key]) throw Error(`adapter ${key}: no reviewed pin`);

// ── PENDING_ROOTS: held roots and what they wait for, re-checked on every run (a changed fact stops the run, so the
//    root is reviewed and moved back into the cut set). ──────────────────────────────────────────────────────────────
//   cdsCoreWriters: declarations in the closure that assign module state cds-core holds without publishing the writer
//     (ES import bindings are read-only; a private copy splits the state: D1 / D46). cds-core is frozen at wave 6.
//   foreignOwners: module state of the closure another 4.16336.0 graph holds in a manifest runSlicer cannot link
//     (code-editor-v4 is not a runSlicer manifest: modules[].sources / bindings[].file) and does not export.
//   mainWorkflow: graphs of the main workflow the closure needs that are not in the real tree on 4.16336.0 yet.
const CE_SERIAL = 'ce311b43f-CaHZaaO5.js';
// Wave 7 (cds-integrate/wave7): cds-core publishes ce311b43f's counters with their pattern builders (state_ce311b43f_a /
// _o / _de …), so the code-editor-v4 hold is gone; the two writers c34e6410a s and cb8c5a88f go are still not published
// (cds-wave7/out/excluded.json), so Cp keeps cdsCoreWriters. Cut on that cds-core (cds-integrate/wave7 dry-run with the
// store roots in), the comment card and store closure goes on through ten more chunks to shared-212 Pv / Av / vv, which
// frame-sidebar-nav slices in shared-212.mjs without exporting: unexportedLinks records that hold (a D1 owner this graph
// cannot link yet; once frame-sidebar-nav exports them, or stops slicing them, the run stops and the roots are reviewed).
const FSN_212 = ['shared-212-BHMAi0oa.js#Pv', 'shared-212-BHMAi0oa.js#Av', 'shared-212-BHMAi0oa.js#vv'];
export const PENDING_ROOTS = {
  [`${C44}#Cp`]: { name: 'PierreChanges',
    cdsCoreWriters: { 'c34e6410a-BLtdknyP.js#s': ['c34e6410a-BLtdknyP.js#i', 'c34e6410a-BLtdknyP.js#r'], 'cb8c5a88f-Cxti0pWl.js#go': ['cb8c5a88f-Cxti0pWl.js#ho'] },
    unexportedLinks: { 'frame-sidebar-nav': FSN_212 },
    mainWorkflow: ['turn-box-v4', 'transcript-rows-v4 tr-2..tr-5', 'code-transcript-v4 ct-2 (V8 / f8)'],
    why: 'closure (round2/pierre-changes/logs/explore-all.json: 64 modules / 2525 bindings) reaches 1677 bindings of transcript-rows\' own probe (tr-2..tr-5, incl. the pierre diffs library c2a6d07ee / ce7d378c5 state) and 751 of turn-box\'s, the cds-core writers c34e6410a s (writes i, r) and cb8c5a88f go (writes ho), and (through the comment card) frame-sidebar-nav\'s unexported shared-212 Pv / Av / vv' },
  [`${C44}#Kl`]: { name: 'PierreChangesCommentCard', unexportedLinks: { 'frame-sidebar-nav': FSN_212 },
    why: 'Kl -> cc8941b7b ei / I (the store) -> cfdc58f68 (markdown escape) -> ce311b43f (cds-core since wave 7) … -> shared-212 Pv / Av / vv, sliced by frame-sidebar-nav without an export' },
  ...Object.fromEntries(['I', 'L', 'j', 'M', 'at', 'Kt', 'F'].map(l => [`${CC89}#${l}`, { name: ROOTS[CC89][l].name, unexportedLinks: { 'frame-sidebar-nav': FSN_212 },
    why: 'the store module (cc8941b7b I / L / E / F …) reaches ce311b43f (cds-core since wave 7) through cfdc58f68 and, past it, shared-212 Pv / Av / vv, sliced by frame-sidebar-nav without an export (the same hold as Kl). D1 owner plan: this graph owns the store (as the 3.6556.2 pierre-changes did); transcript-rows ToolRow (tr-4, pending) and later graphs link it' }])),
};

// D1 (round2/plan.json pierre-changes presentLinks + what the pc-0 closure reaches): every binding these graphs hold and
// export is imported from them. code-current-v4 is not a runSlicer manifest everywhere: linked through the modules that
// name their chunk. Alphabetical (a binding two areas export resolves to the later one, as in the survey).
// Wave 7: session-rail-changes-v4 cuts c761aa8b9 Kn (with PrBarRow back in its roots) and exports it, so Kn is linked from
// there (D1: never cut twice) and c761aa8b9 left CLOSURE_CHUNKS.
export const LINKED_AREA_NAMES = ['chat-knowledge-v4', 'code-current-v4', 'files-changes-v4', 'frame-sidebar-nav', 'review-findings-v4', 'routines-shared-v4',
  'session-rail-changes-v4', 'session-rail-kit-v4', 'settings-pages-v4', 'turn-plan-v4', 'working-line-v4'];
async function linkedAreas() {
  const out = [];
  for (const area of LINKED_AREA_NAMES) {
    const m = JSON.parse(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'), 'utf8'));
    out.push(m.modules.some(x => !x.source) ? { area, modules: m.modules.filter(x => x.source).map(x => x.target) } : area);
  }
  return out;
}
const linkedCopies = {};

const target = file => file === C44 ? 'pierre-changes.mjs'
  : `pierre-${/^(shared-\d+|shared-frame|vendor-[a-z]+(?:-\d+)?|preload-helper|rolldown-runtime|c[0-9a-f]+)-[\w-]+\.js$/.exec(file)[1]}.mjs`;
// The originals the cut roots read in other chunks, one module per chunk (a chunk the closure never enters, or one it
// enters that is not listed, stops generation).
export const CLOSURE_CHUNKS = ['cd14a8022-DdgywyOs.js', 'shared-39-ZCs0lAwB.js'];
const sliced = Object.entries(ROOTS).map(([file, roots]) => [file, Object.fromEntries(Object.entries(roots).filter(([, r]) => r.slice !== false))]);
const modules = () => [
  ...sliced.filter(([, roots]) => Object.keys(roots).length).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.exports.length === 0),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...CLOSURE_CHUNKS.filter(source => !ROOTS[source] || !Object.keys(sliced.find(([f]) => f === source)?.[1] ?? {}).length).map(source => ({ source, target: target(source) })),
];

// Pinned on the minified bytes (each exactly once): the provider the context constraints rely on, and the pane's mount.
const rawCallSites = [
  { source: C44, role: 'pc-0: the image viewer contexts (ud = h(null), dd = h(!1)) and their one provider fd (exported s): dd outermost with fetchFileImages given, ud with {open, stale}',
    features: ['var ud=h(null),dd=h(!1);', 'let d=r!==void 0,', 'd?{open:p,stale:o}:null', 'i(ud,{value:m,children:[c,b]})', 'n(dd,{value:d,children:x})', 'fd as s'] },
  { source: C44, role: 'pc-0: the file header memo and the pane scheduler (Ct = Ql(r)); the body memo Cp mounted under mt',
    features: ['var fo=u(co)', 'var Cp=u(Sp)', 'Ct=Ql(r)', 'mt=Re(!dt&&!Ye)', 'ca as C'] },
];

async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root.
export async function locateRoots(cache = new Map(), { requirePins = true } = {}) {
  const found = [];
  for (const [file, roots] of Object.entries(ROOTS)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(roots)) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      let located = hits;
      if (spec.constraint) {
        const [key, arg] = spec.constraint.split(':');
        located = [];
        for (const entry of hits) {
          const name = [...src.top].find(([, e]) => e === entry)?.[0];
          if (await ROOT_CONSTRAINTS[key](src, name, arg, cache)) located.push(entry);
        }
      }
      if (located.length !== 1) throw Error(`${file} ${local} (${spec.name}): ${located.length} top-level declarations carry its features${spec.constraint ? ` and pass ${spec.constraint} (of ${hits.length})` : ''}, expected 1`);
      const names = [...src.top].filter(([, entry]) => entry === located[0]).map(([name]) => name);
      if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`);
      const aliases = aliasesOf(src, local).sort();
      if (JSON.stringify(aliases) !== JSON.stringify([...spec.exports].sort())) throw Error(`${file}#${local}: export aliases ${aliases.join(',') || '(none)'}, reviewed ${spec.exports.join(',') || '(none)'}`);
      const key = `${file}#${local}`;
      if (spec.inner) {
        const entry = src.top.get(spec.inner.local);
        if (!entry || entry.kind !== 'function' || !await carries(src, entry, spec.inner.features)) throw Error(`${key}: inner component ${spec.inner.local} does not carry its reviewed features`);
      }
      const declarationSha256 = sha(rawText(src, located[0]));
      const pin = ROOT_PINS[key];
      if (pin === undefined && requirePins) throw Error(`${key}: no reviewed pin`);
      if (pin !== undefined && pin !== declarationSha256) throw Error(`${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, step: spec.step, sliced: spec.slice !== false, previous: spec.previous, exports: aliases,
        ...(spec.constraint ? { constraint: spec.constraint, shapeAlternatives: hits.length } : {}), declarationSha256, pinned: pin !== undefined });
    }
  }
  return found;
}

// CALL_SITES: AST location (the one declaration carrying the probe and features), reviewed local, pinned raw sha256.
export async function locateCallSites(cache = new Map(), { requirePins = true } = {}) {
  const found = [];
  for (const site of CALL_SITES) {
    const src = await readSource(site.source, cache, official.ionSource);
    const hits = [];
    for (const entry of declarations(src)) if (rawText(src, entry).includes(site.probe) && await carries(src, entry, site.features)) hits.push(entry);
    if (hits.length !== 1) throw Error(`call site ${site.source}#${site.binding}: ${hits.length} top-level declarations carry its features, expected 1`);
    const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
    if (!names.includes(site.binding)) throw Error(`call site ${site.source}: the declaration carrying ${site.binding}'s features is ${names.join(', ')}`);
    const key = `${site.source}#${site.binding}`, declarationSha256 = sha(rawText(src, hits[0]));
    const pin = CALL_SITE_PINS[key];
    if (pin === undefined && requirePins) throw Error(`call site ${key}: no reviewed pin`);
    if (pin !== undefined && pin !== declarationSha256) throw Error(`call site ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    found.push({ file: site.source, local: site.binding, previous: site.previous, declarationSha256, pinned: pin !== undefined });
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
    if (ADAPTER_PINS[key] !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${ADAPTER_PINS[key]}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, declarationSha256, pinned: true });
  }
  return out;
}

// The host adapter module re-exports exactly the adapted names, each from the host adapter that documents it.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const item of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
      const [orig, as] = item.split(/\s+as\s+/);
      exported.set(as ?? orig, { from: `src/${m[2]}`, orig });
    }
  if (/^export (const|function|class|default|\*)/m.test(text)) throw Error(`${ADAPTER_FILE}: only named re-exports of existing host adapters`);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a]));
  for (const [name, a] of wanted) if (exported.get(name)?.from !== a.from) throw Error(`${ADAPTER_FILE}: ${name} is not re-exported from ${a.from}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, { from, orig }] of exported) {
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${esc(orig)}\\b|export \\{[^}]*\\b${esc(orig)}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${orig} (${name})`);
  }
}

// Every held root still waits for what PENDING_ROOTS records; every held root is located and pinned (ROOTS slice:false)
// and every ROOTS slice:false entry is held.
async function assertPending(roots) {
  const read = async area => JSON.parse(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'), 'utf8'));
  const cds = await read('cds-core');
  const published = new Set(Object.values(cds.publicNames).map(v => `${v.file}#${v.local}`));
  const held = new Set(cds.modules.flatMap(mod => (mod.bindings ?? []).map(b => `${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`)));
  const holds = (m, key) => (m.modules ?? []).some(mod => (mod.bindings ?? []).some(b => {
    const name = typeof b === 'string' ? b : b.name, file = typeof b === 'object' && b.file ? path.basename(b.file) : path.basename(mod.source ?? '');
    return `${file}#${name}` === key;
  }));
  const heldRoots = roots.filter(r => !r.sliced).map(r => `${r.file}#${r.local}`).sort();
  if (JSON.stringify(heldRoots) !== JSON.stringify(Object.keys(PENDING_ROOTS).sort())) throw Error(`PENDING_ROOTS ${Object.keys(PENDING_ROOTS).join(',')} differ from the held ROOTS ${heldRoots.join(',')}`);
  const out = [];
  for (const [key, p] of Object.entries(PENDING_ROOTS)) {
    for (const [writer, writes] of Object.entries(p.cdsCoreWriters ?? {})) {
      if (published.has(writer)) throw Error(`${key} (${p.name}): cds-core now publishes the writer ${writer}; review the root`);
      for (const w of writes) if (!held.has(w)) throw Error(`${key} (${p.name}): cds-core no longer holds ${w} (written by ${writer}); review the root`);
    }
    for (const [area, keys] of Object.entries(p.foreignOwners ?? {})) {
      const m = await read(area);
      if (m.referenceVersion !== official.referenceVersion) throw Error(`${key}: ${area} is ${m.referenceVersion}`);
      if (!(m.modules ?? []).some(mod => Array.isArray(mod.sources))) throw Error(`${key} (${p.name}): ${area} is a runSlicer manifest now; link it and review the root`);
      for (const k of keys) if (!holds(m, k)) throw Error(`${key} (${p.name}): ${area} no longer holds ${k}; review the root`);
    }
    // wave 7: module state of the closure another graph slices in a runSlicer manifest without exporting it
    for (const [area, keys] of Object.entries(p.unexportedLinks ?? {})) {
      const m = await read(area);
      for (const k of keys) {
        const [file, local] = k.split('#');
        const mods = (m.modules ?? []).filter(mod => path.basename(mod.source ?? '') === file && (mod.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === local));
        if (!mods.length) throw Error(`${key} (${p.name}): ${area} no longer slices ${k}; review the root`);
        if (mods.some(mod => Object.keys(mod.exports ?? {}).includes(local) || (mod.linkExports ?? []).includes(local) || (mod.sharedExports ?? []).includes(local)))
          throw Error(`${key} (${p.name}): ${area} now exports ${k}; review the root`);
      }
    }
    for (const g of p.mainWorkflow ?? []) {
      const dir = g.split(' ')[0];
      const m = await read(dir).catch(() => null);
      if (dir === 'turn-box-v4' && m?.referenceVersion === official.referenceVersion) console.log(`PENDING ${key}: ${dir} is in the real tree on ${official.referenceVersion} now: review the root`);
    }
    out.push({ root: key, ...p });
  }
  return out;
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the pierre-changes-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

// D1: nothing this graph cuts is held by another 4.16336.0 graph (any manifest shape), and the 3.6556.2 graph is untouched.
async function assertOwners(manifest) {
  const others = [];
  for (const d of await fs.readdir(generatedRoot, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name === path.basename(PIERRE_CHANGES_V4_OUTPUT)) continue;
    const m = await fs.readFile(path.join(generatedRoot, d.name, 'manifest.json'), 'utf8').then(JSON.parse, () => null);
    if (m?.referenceVersion === official.referenceVersion) others.push([d.name, m]);
  }
  const index = new Map();
  for (const [name, m] of others) for (const mod of m.modules ?? []) for (const b of mod.bindings ?? []) {
    const local = typeof b === 'string' ? b : b.name, file = typeof b === 'object' && b.file ? path.basename(b.file) : path.basename(mod.source ?? '');
    (index.get(`${file}#${local}`) ?? index.set(`${file}#${local}`, new Set()).get(`${file}#${local}`)).add(name);
  }
  for (const mod of manifest.modules) for (const b of mod.bindings ?? []) {
    const key = `${mod.source}#${typeof b === 'string' ? b : b.name}`;
    if (index.has(key) && !Object.hasOwn(linkedCopies, key)) throw Error(`D1: ${key} is also cut by ${[...index.get(key)].join(', ')}; link it from there`);
  }
  for (const mod of manifest.modules) for (const imp of mod.imports ?? []) if (imp.kind === 'adapter' && !Object.values(HOST_ADAPTERS).some(a => a.name === imp.name)) throw Error(`${mod.target}: unexpected adapter ${imp.name}`);
}

export function pierreChangesV4Config() {
  return {
    name: 'pierre changes (4.16336.0)', generator: 'extract-pierre-changes-v4.mjs', output: path.join(root, PIERRE_CHANGES_V4_OUTPUT),
    adapterModule: '../../source-pierre-changes-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules: modules(), rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: [...LINKED_AREA_NAMES],
    callSites: CALL_SITES.map(({ source, binding, role, features }) => ({ source, binding, role, features })),
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
    gate: { flag: 'local_pierre_changes_body', name: 'local_pierre_changes_body', host: 'src/host-growthbook.mjs HOST_GROWTHBOOK; src/source-diff.jsx pierreChangesBodyOn (3.6556.2 graph; the -v4 graph is staged, not mounted)' },
  };
}
export async function probeConfig() { return { ...pierreChangesV4Config(), linkedAreas: await linkedAreas() }; }

export async function extractPierreChangesV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const callSitesLocated = await locateCallSites(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const pendingRoots = await assertPending(roots);
  const linked = {};
  for (const area of LINKED_AREA_NAMES) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...pierreChangesV4Config(), linkedAreas: await linkedAreas(),
    async artifacts(m) {
      await assertOwners(m);
      const rootsByTarget = new Map();
      for (const [file, rs] of sliced) if (Object.keys(rs).length) rootsByTarget.set(target(file), Object.values(rs).map(r => r.name));
      return {
        'index.mjs': `// Semantic names of the pierre-changes roots (${official.referenceVersion}, steps ${STEPS.join(', ')}); generated by extract-pierre-changes-v4.mjs.\n`
          + [...rootsByTarget].map(([t, names]) => `export { ${names.join(', ')} } from "./${t}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-pierre-changes-v4.mjs', steps: STEPS,
          previous: { generator: 'scripts/extract-pierre-changes.mjs', output: 'src/generated/pierre-changes', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, callSites: callSitesLocated, pendingRoots, adapters, linkedCopies,
          imports: m.modules.flatMap(mod => (mod.imports ?? []).filter(i => i.kind && i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    for (const f of await locateRoots(new Map(), { requirePins: false })) console.log('root', `${f.file}#${f.local}`, f.name, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED', f.constraint ? `${f.constraint} of ${f.shapeAlternatives}` : '');
    for (const c of await locateCallSites(new Map(), { requirePins: false })) console.log('callSite', `${c.file}#${c.local}`, c.previous, c.declarationSha256, c.pinned ? 'pinned' : 'UNPINNED');
    for (const a of await pinAdapters()) console.log('adapter', a.original, a.declarationSha256);
  } else await extractPierreChangesV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
