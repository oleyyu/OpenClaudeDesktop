// Code transcript renderer, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, round 2, region
// code-transcript, staged in steps ct-0 .. ct-4 of region-plan/plan.json largeRegionSplits['code-transcript']).
// The 3.6556.2 graph (scripts/extract-code-transcript.mjs -> src/generated/code-transcript) is untouched (staged double
// output; no production switch: the host keeps importing src/generated/code-transcript). This generator cuts the
// 4.16336.0 graph into the isolated folder src/generated/code-transcript-v4, one step at a time; every step it holds
// runs on its own (`--check` passes with only the completed steps). Steps present: ct-0, ct-1 (round-2 unit
// code-transcript:a). code-transcript:b added the ct-2 location layer (V8 / f8 located and pinned, the four call sites
// pinned, chat-renderer-v4 linked) and the ct-4 import() proof for c96d752d0; slicing the renderer core (ct-2) and the
// link convergence (ct-3) stay PENDING_ROOTS until transcript-rows tr-b/tr-c, turn-box and cds-core wave 7 land.
//
// ct-0 (preconditions and owners): the module state the 3.6556.2 renderer reads that lives in other graphs, each with
//   its one 4.16336.0 owner (D1 / D46), checked against that owner's manifest on every run (owners.json):
//   - cds-core publishes the D46 contexts the renderer's CDS rows read: CdsOwnerWindowContext (shared-frame Ga),
//     CdsSkeletonStartedAtContext (nf), CdsNaturalImageTilesContext (Ia), and the three c856385e2 contexts the ct-1
//     providers below provide (ctx_c856385e2_kt / _Jt / _Zt);
//   - transcript-rows-v4 (tr-0) holds BackgroundTaskStatusContext (cea7057eb L), SessionScopeContext (cd96b5fdc g) and
//     PathResolverProvider (c856385e2 Nt): linked, never sliced here (linkedAreas);
//   - r3b-transcript-v4 holds SessionFileOpenerProvider (c856385e2 Ot): linked.
//   The 7 of the 30 surveyed roots region-plan's locate pass left without a unique 4.16336.0 match are located here on
//   the official AST through their callers (ROOT_CONSTRAINTS): the three c856385e2 providers, BackgroundTasksContext
//   (cea7057eb, three shape-identical `t(<ident>)` contexts), UserRowChromeContext (c96d752d0, 14 `k(!1)` contexts),
//   ForkedFromRow and ForkMarkerRow (c96d752d0, memo wrappers `w(<inner>)`).
// ct-1 (the provider family and the small rows):
//   c856385e2-Cqx37C-b  At  SessionFileReadableProvider   (3.6556.2 c856385e2-aEyDzrcK rt = nt.Provider, exported b)
//                       Yt  ImageLoaderProvider           (3.6556.2 xt = bt.Provider, exported h)
//                       Qt  ContainedImageLoaderProvider  (3.6556.2 wt = Ct.Provider, exported n)
//     17 `X.Provider` declarations share the shape; each is the one c5259f582 (the session's provider stack) mounts with
//     its prop (`n(<alias>,{value:t.sessionFileReadable|imageLoader|containedImageLoader,…})`). Their contexts (kt, Jt,
//     Zt) are cds-core's, imported through the shared graph.
//   cea7057eb-BrXukOIp  X   BackgroundTasksContext        (3.6556.2 cea7057eb-De2BQu3K X) — the context the chunk's
//     provider ve fills with the session's task array (`a=i.tasks`, `n(X.Provider,{value:a},…)`); K and J (the
//     running / flagged task-id sets) share its shape. No other 4.16336.0 graph slices it: owned here.
//   c96d752d0-D9VB6ArX  WM  UserRowChromeContext          (3.6556.2 c96d752d0-CWv_7-n9 uD) — the `k(!1)` context the
//     feed provides around a renderer-drawn aside reply (`value:t.entry.aside===!0&&…`) and reads in the user row's
//     bubble, the shared-screen block and the comment-summon card. Owned here.
//                       jgt ForkedFromRow                 (3.6556.2 Cet = M(xet)) — `w(Agt)`, drawn by the feed's
//                       Ngt ForkMarkerRow                 (3.6556.2 Tet = M(wet)) — `w(Mgt)`,  `case"forkedFrom"` /
//     `case"forkMarker"` rows. Located and pinned here; their closures reach the session list store, the intl boundary
//     and the session hover card the transcript rows' later steps adapt, so they are sliced in ct-2 (PENDING_ROOTS).
// ct-2, located and pinned (round-2 unit code-transcript:b; sliced once its blockers clear, see below):
//   c96d752d0-D9VB6ArX  V8  CodeTranscriptRenderer        (3.6556.2 R3) — the one declaration the chunk's namespace names
//                       `CodeTranscriptRenderer:()=>V8` (uht, made resident by `Qdt(uht)`; 3.6556.2 r9e / wVe), with R3's
//                       props `{spec, fragments, host, write, proseSize, streaming, children}`.
//                       f8  RendererTurnRow               (3.6556.2 l3) — reads the renderer's row context d8 (`k(null)`,
//                       provided in this chunk) and draws `r.renderRow(turnKey, opensTranscript)`.
//   Call sites (callSites, each the one declaration of its chunk that carries its features, raw sha256 pinned):
//     cf74bc599 HT (3.6556.2 uw): the renderer offered (`E = p !== void 0 && !a.overviewFeedLayout`), the live text held,
//       then UT; cf74bc599 UT (dw): `Ml` splits the live texts, `Oc` provides them around the feed; c96d752d0 UCt (bat):
//       the feed (renderer host Ye, fragments `v(fft)`, write Xe) around WSt; c96d752d0 WSt (Zit): USt (= V8) with the
//       stream snapshot.
//   Why V8 / f8 are not sliced yet (round2/code-transcript-b/logs/explore-renderer.json, a dry run of their closure with
//   every present 4.16336.0 graph linked): 233 modules / 10930 bindings; 40 of its declarations assign module state
//   cds-core holds without publishing their writer (cds-core wave 6 left them blocked; frozen this phase: wave 7), and
//   9404 of its bindings are in transcript-rows' own probe (tr-2..tr-5) and 7952 in turn-box's, both main-workflow graphs
//   not yet in the real tree (D1: they own them, this graph links them).
// ct-4 (computed imports, c96d752d0): DYNAMIC_IMPORTS lists every import() of the chunk; each run re-reads them from
//   the official AST: all 7 are string literals (no computed specifier), each holder's declaration is pinned, and none
//   is in this graph's slice (a later step that reaches one emits the chunk under its own name, as runSlicer requires).
// ct-3 (link convergence, round-2 unit code-transcript:c): the 19 regions the 3.6556.2 graph imported from
//   (region-plan dependsOn; scripts/code-transcript-links.json for the old form) are mapped to their 4.16336.0 graphs
//   (LINK_PLAN). Every one that is in the real tree on this version and that the V8 / f8 closure reaches (dry run,
//   round2/code-transcript-c/logs/explore-renderer.json) is in linkedAreas now, so what they hold resolves to their
//   semantic / link exports and is never sliced again here (D1); session-rail-v4, turn-box-v4 and transcript-rows
//   tr-2..tr-5 (main workflow) are PENDING; code-current-v4 is not reached; r3b-settings has no 4.16336.0 graph (its
//   logger / logCategory resolve through turn-plan-v4's shared-0). The closure's other 4.16336.0 owners (frame-sidebar-nav,
//   settings-nav, r4e-plugin, ...) join linkedAreas when V8 / f8 are sliced (LINK_AT_SLICE). Consumers of this graph
//   (queued-bar, pierre-changes) ask for chunk-local exports in scripts/<consumer>-v4-links.json (LINK_REQUEST_FILES,
//   the chat-renderer-v4 form); the surface is written as link-surface.json next to the manifest.
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here): sourceContract
// scripts/official-4.16336.0.mjs, sharedGraph 'cds-core' (pinned manifest sha256). No host adapter is reached by
// ct-0 / ct-1 (ct-2 adds src/source-code-transcript-v4-adapters.jsx); a run that would import one stops. Roots are
// located on the official AST: each is the only top-level declaration of its chunk whose raw text has the probe, whose
// prettier form carries every feature and that passes its constraint, under the reviewed local, with the reviewed
// export aliases and its raw declaration sha256 pinned (ROOT_PINS; never refreshed by a script).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const CODE_TRANSCRIPT_V4_OUTPUT = 'src/generated/code-transcript-v4';
export const STEPS = ['ct-0', 'ct-1'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const esc = s => s.replace(/[$]/g, '\\$');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const PATHS = 'c856385e2-Cqx37C-b.js', TASKS = 'cea7057eb-BrXukOIp.js', C96 = 'c96d752d0-D9VB6ArX.js';
export const SESSION_PROVIDERS = 'c5259f582-BaPt7VSi.js', CF7 = 'cf74bc599-BytvntCE.js';

// ── Roots: file -> local -> { name, step, exports (the chunk's own aliases; [] chunk-internal), probe (raw), features,
//    constraint (ROOT_CONSTRAINTS key, when the probe and features leave shape-identical declarations), slice (false:
//    located and pinned here, sliced by a later step) } ──────────────────────────────────────────────────────────────
export const ROOTS = {
  [PATHS]: {
    At: { name: 'SessionFileReadableProvider', step: 'ct-1', exports: ['S'], probe: '.Provider', features: ['.Provider;'], constraint: 'sessionProviderValue:sessionFileReadable', previous: 'c856385e2-aEyDzrcK.js#rt' },
    Yt: { name: 'ImageLoaderProvider', step: 'ct-1', exports: ['h'], probe: '.Provider', features: ['.Provider;'], constraint: 'sessionProviderValue:imageLoader', previous: 'c856385e2-aEyDzrcK.js#xt' },
    Qt: { name: 'ContainedImageLoaderProvider', step: 'ct-1', exports: ['n'], probe: '.Provider', features: ['.Provider;'], constraint: 'sessionProviderValue:containedImageLoader', previous: 'c856385e2-aEyDzrcK.js#wt' },
  },
  [TASKS]: {
    X: { name: 'BackgroundTasksContext', step: 'ct-1', exports: [], probe: '=t(', features: ['= t(E);'], constraint: 'sessionTasksProvider', previous: 'cea7057eb-De2BQu3K.js#X' },
  },
  [C96]: {
    WM: { name: 'UserRowChromeContext', step: 'ct-1', exports: [], probe: '=k(!1)', features: ['= k(!1);'], constraint: 'asideReplyChrome', previous: 'c96d752d0-CWv_7-n9.js#uD' },
    jgt: { name: 'ForkedFromRow', step: 'ct-1', slice: false, exports: [], probe: '=w(', features: ['= w(Agt);'], constraint: 'feedCase:forkedFrom', previous: 'c96d752d0-CWv_7-n9.js#Cet' },
    Ngt: { name: 'ForkMarkerRow', step: 'ct-1', slice: false, exports: [], probe: '=w(', features: ['= w(Mgt);'], constraint: 'feedCase:forkMarker', previous: 'c96d752d0-CWv_7-n9.js#Tet' },
    V8: { name: 'CodeTranscriptRenderer', step: 'ct-2', slice: false, exports: [], probe: 'subscribeReplyTextHooked(',
      features: ['{ spec: t, fragments: n, host: r, write: i, proseSize: a, streaming: o, children: s } = e,', 'c.replyTextHooked({ sessionRef: l, isOwnedSession: d })', 't.parts.includes(a6)', 'f(pht, {'],
      constraint: 'namespaceMember:CodeTranscriptRenderer', previous: 'c96d752d0-CWv_7-n9.js#R3' },
    f8: { name: 'RendererTurnRow', step: 'ct-2', slice: false, exports: [], probe: '.renderRow(',
      features: ['{ turnKey: t, opensTranscript: n } = e,', 'r === null ? null : r.renderRow(t, n)'], constraint: 'rendererRowContext', previous: 'c96d752d0-CWv_7-n9.js#l3' },
  },
};
// The inner components the fork rows' memo wrappers name, checked with them (the 3.6556.2 xet / wet, unchanged in shape).
export const INNER_FEATURES = {
  [`${C96}#jgt`]: { inner: 'Agt', features: ['{ sessionId: t, parentSessionId: n, linked: r } = e,', 's = i ? "claude" : "fork",', 'e.sessions.find((e) => e.sessionId === t)?.createdAt'] },
  [`${C96}#Ngt`]: { inner: 'Mgt', features: ['{ childIds: t, linked: n } = e;', 't.length === 1'] },
};

// Caller / provider constraints that tell shape-identical declarations apart (each must leave exactly one).
const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const aliasesOf = (src, local) => [...src.exported].filter(([, l]) => l === local).map(([a]) => a);
export const ROOT_CONSTRAINTS = {
  // The provider the session's provider stack (c5259f582) mounts with `value: t.<prop>`: the importer's local for one of
  // this declaration's export aliases is the element type of that createElement call.
  sessionProviderValue: async (src, local, prop, cache) => {
    if (!/^[\w$]+=[\w$]+\.Provider$/.test(rawText(src, src.top.get(local)))) return false;
    const stack = await readSource(SESSION_PROVIDERS, cache, official.ionSource);
    const aliases = aliasesOf(src, local);
    const locals = [...stack.top].filter(([, e]) => e.kind === 'import' && e.file === src.name && aliases.includes(e.alias)).map(([n]) => n);
    return locals.some(l => new RegExp(`[(,]${esc(l)},\\{value:[\\w$]+\\.${prop},`).test(stack.code));
  },
  // The context the chunk's provider fills with the session's task array (`a=i.tasks`, `X.Provider,{value:a}`).
  sessionTasksProvider: async (src, local) => {
    const holders = declarations(src).filter(e => rawText(src, e).includes(`${local}.Provider,{value:`));
    if (holders.length !== 1) return false;
    const raw = rawText(src, holders[0]);
    const value = new RegExp(`${esc(local)}\\.Provider,\\{value:([\\w$]+)\\}`).exec(raw)?.[1];
    return !!value && new RegExp(`[,{;\\s]${esc(value)}=[\\w$]+\\.tasks[,;]`).test(raw);
  },
  // The `k(!1)` context the feed provides around a renderer-drawn aside reply.
  asideReplyChrome: async (src, local) =>
    declarations(src).some(e => rawText(src, e).includes(`${local}.Provider,{value:t.entry.aside===!0&&`)),
  // The memo row the feed's row switch draws for the named case (`case"<kind>":{… f(<local>,{…`).
  feedCase: async (src, local, kind) =>
    declarations(src).some(e => new RegExp(`case"${kind}":\\{let [^}]*?[(,]f\\(${esc(local)},\\{`).test(rawText(src, e))),
  // The chunk's namespace object names exactly one member `<member>:()=><local>` (c96d752d0 uht:
  // `CodeTranscriptRenderer:()=>V8`, the renderer module the residency call `Qdt(uht)` keeps; 3.6556.2 r9e / wVe).
  namespaceMember: async (src, local, member) => {
    const named = [...src.code.matchAll(new RegExp(`[{,]${esc(member)}:\\(\\)=>([\\w$]+)[,}]`, 'g'))].map(m => m[1]);
    return named.length === 1 && named[0] === local;
  },
  // The turn row reads the renderer's row context: `r = j(<ctx>)`, <ctx> a `k(null)` context this chunk provides once.
  rendererRowContext: async (src, local) => {
    const ctx = /[,\s]r=j\(([\w$]+)\);/.exec(rawText(src, src.top.get(local)))?.[1];
    if (!ctx || rawText(src, src.top.get(ctx) ?? { node: { start: 0, end: 0 } }) !== `${ctx}=k(null)`) return false;
    return src.code.split(`${ctx}.Provider,{value:`).length - 1 === 1;
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them).
export const ROOT_PINS = {
  'c856385e2-Cqx37C-b.js#At': '5f79538bce82e5d7b2698e30f543e328ceeb83dfd9c2e9bd7b859918d7b50de8',
  'c856385e2-Cqx37C-b.js#Yt': 'e6c5f3b800a9da50611547f0f4b6300046465ac8c9645708724ffc074c06cef9',
  'c856385e2-Cqx37C-b.js#Qt': 'c2f7a96a2afbe01a1e194543070413cf6c4887eadce2fc5a3b18d820e87e5d05',
  'cea7057eb-BrXukOIp.js#X': '1a30f8f85f1ba2d0f085f159e13a19fa7bb7dd0c7d7a8c90d9960e044de1d0a6',
  'c96d752d0-D9VB6ArX.js#WM': '219de816d363e224d412d896c45348d425bfcbd5b609a18aac8bf97493adda4f',
  'c96d752d0-D9VB6ArX.js#jgt': '1726bceb617e7091458f0a167e5382391d99738078f98aa3c25c95e6a74cd6a8',
  'c96d752d0-D9VB6ArX.js#Ngt': '4bc38826eefb21cb4f50750f905462af454b83fdfe06da7ee0b82477f937dad7',
  'c96d752d0-D9VB6ArX.js#V8': '63241ebbff6e4018fb38645bf0f4cb5f6d25823a11ab5ba199bf2b596725c207',
  'c96d752d0-D9VB6ArX.js#f8': '38828af4fe4e528de1308ceb7c27f6f07015c4bd574825264be59b7ca2f9017d',
};

// ── ct-2 call sites: how the desktop mounts the renderer (followed by the host, not imported). Each must be the only
//    top-level declaration of its chunk whose raw text has the probe and whose prettier form carries every feature,
//    under the reviewed local; raw declaration sha256 pinned (CALL_SITE_PINS). Emitted as runSlicer callSites. ─────────
export const CALL_SITES = [
  { source: CF7, binding: 'HT', previous: 'cf74bc599-CRYqipWN.js#uw', probe: 'liveTextHeld:',
    role: 'ct-2: the Code transcript: the renderer offered (transcriptRenderer present, not the overview layout), the live text held, then UT',
    features: ['E = p !== void 0 && !a.overviewFeedLayout,', '{ offered: E, liveTextHeld: T }', 'holdLiveText: k,', 'o(UT, {'] },
  { source: CF7, binding: 'UT', previous: 'cf74bc599-CRYqipWN.js#dw', probe: 'liveSnapshot:',
    role: 'ct-2: Ml (c96d752d0 live-text split) over the entries, Oc provides the live texts around the feed with the renderer props',
    features: ['{ entries: We, liveTexts: Ge, liveTextStore: Ke } = Ml(Ue, Me),', 'o(Oc, { liveTexts: Ge, liveTextStore: Ke, liveSnapshot: ot, children: ft })', 'transcriptRenderer: Ce,'] },
  { source: C96, binding: 'UCt', previous: 'c96d752d0-CWv_7-n9.js#bat', probe: 'componentName:"TranscriptRenderer"',
    role: 'ct-2: the feed: the renderer host Ye, the fragments v(fft), the write Xe, then WSt around its list',
    features: ['[_e] = v(fft)', 'ue ? Se(tCt(s)) : YSt', '{ baseEntries: Ce, hasEarlier: Ee, isResponding: O }', 'f(WSt, {', 'componentName: "TranscriptRenderer",',
      'seedKeys: qe ? Oxt : kxt,', 'lastReplyClosingLine: be,', 'tailActionsOutlet: xe,', 'publishedTranscript: c,'] },
  { source: C96, binding: 'WSt', previous: 'c96d752d0-CWv_7-n9.js#Zit', probe: 'streaming:i})',
    role: 'ct-2: USt (= V8, CodeTranscriptRenderer) with the stream snapshot (Brt) over the streaming prop',
    features: ['i = r === void 0 ? n : r;', 'f(USt, { ...t, streaming: i })'] },
];
export const CALL_SITE_PINS = {
  'cf74bc599-BytvntCE.js#HT': 'a77f5be14f9d9fb21815a6b34df0e1cd6e27c8e0ba14a1766de3e81a23d0c28f',
  'cf74bc599-BytvntCE.js#UT': '998ef6ca1e072719277c0620f6c6be6a86b08efdddc19578d14a2169d38c36a1',
  'c96d752d0-D9VB6ArX.js#UCt': '1fec3118735d4e85af516be2c274582784b1f3349430a2d6cbbfc7dd47d2c693',
  'c96d752d0-D9VB6ArX.js#WSt': 'dba5d2859dce54153a087a1d6119c5d47b1bd3507bdc73dea2b5c921ba55645e',
};

// ── ct-4: every import() of c96d752d0 (official AST, re-read each run). All string literals; holder declarations pinned.
//    `reachedBy` notes the pending root whose closure needs the chunk under its own name (null: none of this region's). ──
export const DYNAMIC_IMPORTS = {
  [C96]: [
    { holder: 'wE', specifier: './c9f7f3e21-CMadu0yK.js', sha256: '790e33763c2d180b49c26dd3a77157b666fe009431f5cbf3ab90ba38dc4c3783', what: 'epitaxy_thread_diff_dialog (lazy registry entry)', reachedBy: null },
    { holder: 'MO', specifier: './ce3a1e571-DOV2KwvB.js', sha256: '92e368fdc977e3d1966357a5dbbaf9bebf1ef95be1c1f5b0f156e3bb8f4cea1c', what: 'epitaxy_pr_bar (lazy registry entry)', reachedBy: null },
    { holder: 'vk', specifier: './c841a2d68-CCT_KyUS.js', sha256: 'e10aff2685c0cebd7a21acea0cce59669202072c7d0df841aea0e6cb6ff48221', what: 'cds_emoji_picker_body', reachedBy: null },
    { holder: 'PB', specifier: './cd9b7fccf-CzNhbnyC.js', sha256: 'c461591a535bd931bcce792c21a3d87cb83864f44b636d82b7994240f60454b3', what: 'lazy registry entry (T1, priority 120)', reachedBy: null },
    { holder: 'mK', specifier: './cd335949d-CxlSo-0B.js', sha256: '1526af548b8e166dba194a1b3674579b45aaa562b84a5e13e16d950e165a19e4', what: 'project_blocks_card_row (lazy registry entry)', reachedBy: null },
    { holder: 'p9e', specifier: './cc1a17de9-m7izsjgJ.js', sha256: '40c21a07f714254e207ed5280a267c4fd7e0800c733b187028d082e1a0eeec4e', what: 'rc_capacity_suggestions (lazy registry entry)', reachedBy: null },
    { holder: 'P7', specifier: './c9f414608-CCeBXbMm.js', sha256: '8d4ef55397be5ec4810ddfa0a1628895005da673eafdf16b4d3ba4a37325804d', what: 'code_tab_focus_release (`.then(e=>e.n)`)', reachedBy: 'useFeedKeyboard (3.6556.2 Cat → b8 → c9f414608 attachTabFocusRelease, ct-4)' },
  ],
};

// ── ct-0 owner table: state this renderer reads that another graph owns (checked against its manifest) ────────────
export const FOREIGN_OWNERS = [
  { name: 'CdsOwnerWindowContext', binding: `${official.sharedFrame}#Ga`, owner: 'cds-core', publicName: 'CdsOwnerWindowContext', why: 'D46 (ct-0 precondition): the owner window the CDS rows read' },
  { name: 'CdsSkeletonStartedAtContext', binding: `${official.sharedFrame}#nf`, owner: 'cds-core', publicName: 'CdsSkeletonStartedAtContext', why: 'D46 (ct-0 precondition): the skeleton shimmer phase' },
  { name: 'CdsNaturalImageTilesContext', binding: `${official.sharedFrame}#Ia`, owner: 'cds-core', publicName: 'CdsNaturalImageTilesContext', why: 'D46 (ct-0 precondition): the natural-size image tiles flag' },
  { name: 'sessionFileReadableContext', binding: `${PATHS}#kt`, owner: 'cds-core', publicName: 'ctx_c856385e2_kt', previous: 'c856385e2-aEyDzrcK.js#nt', why: 'the context SessionFileReadableProvider (At = kt.Provider) provides' },
  { name: 'imageLoaderContext', binding: `${PATHS}#Jt`, owner: 'cds-core', publicName: 'ctx_c856385e2_Jt', previous: 'c856385e2-aEyDzrcK.js#bt', why: 'the context ImageLoaderProvider (Yt = Jt.Provider) provides' },
  { name: 'containedImageLoaderContext', binding: `${PATHS}#Zt`, owner: 'cds-core', publicName: 'ctx_c856385e2_Zt', previous: 'c856385e2-aEyDzrcK.js#Ct', why: 'the context ContainedImageLoaderProvider (Qt = Zt.Provider) provides' },
  { name: 'BackgroundTaskStatusContext', binding: `${TASKS}#L`, owner: 'transcript-rows-v4', target: 'rows-cea7057eb.mjs', export: 'BackgroundTaskStatusContext', why: 'transcript-rows tr-0 owns it; linked by the steps that read it' },
  { name: 'SessionScopeContext', binding: 'cd96b5fdc-HvwFILuF.js#g', owner: 'transcript-rows-v4', target: 'rows-cd96b5fdc.mjs', export: 'SessionScopeContext', why: 'transcript-rows tr-0 owns it; linked by the steps that read it' },
  { name: 'PathResolverProvider', binding: `${PATHS}#Nt`, owner: 'transcript-rows-v4', target: 'rows-c856385e2.mjs', export: 'PathResolverProvider', why: 'transcript-rows tr-0 owns it; linked by the steps that read it' },
  { name: 'SessionFileOpenerProvider', binding: `${PATHS}#Ot`, owner: 'r3b-transcript-v4', target: 'session-file-access.mjs', export: 'SessionFileOpenerProvider', why: 'r3b-transcript-v4 owns it; linked by the steps that read it' },
];

// ── PENDING_ROOTS: the rest of the 3.6556.2 renderer's roots, for code-transcript:b / :c (not sliced, not pinned here).
//    `candidate` is region-plan's locate result (survey-1-tools/locate/code-transcript.json) where it has one; null:
//    not surveyed, :b locates it through its caller. Checked on every run: a candidate must still be a top-level
//    declaration of its 4.16336.0 chunk (structure only; the semantic review and the pin are :b's). ─────────────────
const P = (name, previous, candidate, step, note) => ({ name, previous, candidate, step, ...(note ? { note } : {}) });
const O96 = 'c96d752d0-CWv_7-n9.js';
export const PENDING_ROOTS = [
  P('CodeTranscriptRenderer', `${O96}#R3`, `${C96}#V8`, 'ct-2', 'shape-equal'),
  P('CODE_TRANSCRIPT_SPEC', `${O96}#E3`, `${C96}#A8`, 'ct-2'),
  P('createRendererFragments', `${O96}#E4e`, null, 'ct-2'),
  P('RendererItemRow', `${O96}#e7e`, `${C96}#cmt`, 'ct-2'),
  P('RendererTurnRow', `${O96}#l3`, `${C96}#f8`, 'ct-2', 'shape-equal'),
  P('useLiveTexts', `${O96}#LSe`, null, 'ct-2'),
  P('LiveTextProvider', `${O96}#S2e`, `${C96}#zrt`, 'ct-2'),
  P('rendererTurnKey', `${O96}#kN`, null, 'ct-2'), P('entryIndexById', `${O96}#ON`, null, 'ct-2'),
  P('createValueStore', `${O96}#U0`, null, 'ct-2'), P('seedKeysOwn', `${O96}#lit`, null, 'ct-2'), P('seedKeysWithTurnEdits', `${O96}#cit`, null, 'ct-2'),
  P('isDeferrableEntry', `${O96}#TN`, null, 'ct-2'), P('entriesThroughProvisional', `${O96}#rat`, null, 'ct-2'), P('createEntrySharer', `${O96}#X3`, null, 'ct-2'),
  P('epitaxyChapterStore', `${O96}#GT`, null, 'ct-2', 'stateful store: D1 owner check first'),
  P('messageRatingStore', `${O96}#l0`, null, 'ct-2', 'stateful store: D1 owner check first'),
  P('ForkedFromRow', `${O96}#Cet`, `${C96}#jgt`, 'ct-2', 'located and pinned in ct-1 (ROOTS slice:false)'),
  P('ForkMarkerRow', `${O96}#Tet`, `${C96}#Ngt`, 'ct-2', 'located and pinned in ct-1 (ROOTS slice:false)'),
  P('RewindDisabledReasonProvider', `${O96}#tDe`, `${C96}#dLe`, 'ct-2'),
  P('UserEntryRow', `${O96}#kI`, `${C96}#JR`, 'ct-2', 'feature-jaccard 0.953; the feed passes WM.Provider around JR (ct-1 asideReplyChrome callers)'),
  P('WorkflowToolRow', `${O96}#F$`, `${C96}#MU`, 'ct-2', 'feature-jaccard 0.656: re-locate through group-status'),
  P('WorkflowTaskCard', `${O96}#N$`, `${C96}#jU`, 'ct-2', 'feature-jaccard 0.563: re-locate through WorkflowToolRow'),
  P('TranscriptSessionNotice', `${O96}#GG`, `${C96}#QW`, 'ct-2'),
  P('TranscriptInsetRow', `${O96}#e9`, `${C96}#RCt`, 'ct-2'),
  P('useFeedKeyboard', `${O96}#Cat`, null, 'ct-2'), P('FEED_WINDOWING', `${O96}#c9`, `${C96}#owt`, 'ct-2'), P('feedViewportEstimate', `${O96}#Nat`, null, 'ct-2'),
  P('buildFeedRows', `${O96}#lP`, null, 'ct-2'), P('splitsRendererEntry', `${O96}#hit`, null, 'ct-2'), P('useRendererFragmentsVersion', `${O96}#w4e`, null, 'ct-2'),
  P('isEntryPartRow', `${O96}#pN`, null, 'ct-2'), P('isArticlelessRow', `${O96}#VN`, null, 'ct-2'),
  P('RendererRowActions', `${O96}#M7`, `${C96}#I9`, 'ct-2'),
  P('rendererItemOfKey', `${O96}#TM`, null, 'ct-2'), P('rendererPinItemKey', `${O96}#EM`, null, 'ct-2'),
  P('TaskStopButton', `${O96}#UQ`, `${C96}#QH`, 'ct-2', 'feature-jaccard 0.833'),
  P('feedPressKeepsFollow', `${O96}#i7`, null, 'ct-2'), P('feedRepinAfterClick', `${O96}#a7`, null, 'ct-2'),
  P('TranscriptMessageMenuHost', `${O96}#TA`, `${C96}#nA`, 'ct-2', 'feature-jaccard 0.945'),
  P('applyStreamSnapshot', `${O96}#fO`, null, 'ct-2'),
  P('TurnErrorRecoveryProvider', 'c227f4d5e-B-FYKrwT.js#PZ', 'c227f4d5e-DGDdGBTz.js#KF', 'ct-2', 'feature-jaccard 0.882'),
  P('classifyFeedKeyScroll', 'c227f4d5e-B-FYKrwT.js#S2', null, 'ct-2'),
  P('useTranscriptList', 'c4a9ee384-RLCjceOL.js#ba', null, 'ct-2'), P('useHoldPlaceOnWidthChange', 'c4a9ee384-RLCjceOL.js#Zp', null, 'ct-2'),
  P('useFeedScroller', 'c4a9ee384-RLCjceOL.js#Hp', null, 'ct-2'), P('useResnapBeforeInput', 'c4a9ee384-RLCjceOL.js#Wp', null, 'ct-2'),
  P('transcriptStreamStore', 'c06cf64bb-CdJdJuVd.js#W', null, 'ct-2', 'stateful store: D1 owner check first'),
  P('useStreamSnapshot', 'cd4f82e77-CAMIsQ30.js#zt', null, 'ct-2'),
  P('EpitaxyMermaidFence', 'c9e4d0c57-DoEW0Gy_.js#J', 'c9e4d0c57-DvzRE6N8.js#we', 'ct-4', 'lazy chunk, own name'),
  P('HELD_HEIGHT_ATTR', 'cb264bc23-DxMA33A4.js#d', 'cb264bc23-DwbYs7Ip.js#p', 'ct-4', 'lazy chunk, own name (with createHoldPlace / createHoldPlaceKeepingPress)'),
  P('attachTabFocusRelease', 'c9f414608-BplIKcn2.js#i', 'c9f414608-CCeBXbMm.js#o', 'ct-4', 'lazy chunk, own name: c96d752d0 P7 loads it (`.then(e=>e.n)`, n = r = {attachTabFocusRelease: () => o}); DYNAMIC_IMPORTS'),
  P('ImagePreviewModal', 'cb1b78cfa-VqsYNxqp.js#g', 'shared-36-fqRFYwOb.js#r_', 'ct-4', 'moved from its lazy chunk into shared-36 (feature-jaccard 0.944)'),
];
// The call sites the renderer is mounted through (3.6556.2 cf74bc599 uw / dw, c96d752d0 bat / Zit): located and pinned
// by code-transcript:b (CALL_SITES, emitted as callSites); none left pending.
export const PENDING_CALL_SITES = [];
// Graphs ct-2 links once they are in the real tree (main workflow), with the dry-run overlap that makes them owners.
export const PENDING_LINKED_AREAS = [
  { area: 'transcript-rows-v4', steps: 'tr-2..tr-5 (real tree: tr-0 / tr-1 only)', overlap: 9404, why: 'transcript-rows probe (account2/plan-explore/transcript-rows.json) holds 9404 of the 10930 bindings of the V8 / f8 closure' },
  { area: 'turn-box-v4', steps: 'all (not in the real tree)', overlap: 7952, why: 'turn-box probe holds 7952 of them' },
];
// Writers of module state cds-core holds without publishing them that the V8 / f8 closure reaches (round2/code-transcript-b
// logs/explore-renderer.json importedWriters): an ES import binding is read-only, so a sliced copy would throw on its
// first write; cds-core has to publish each writer next to its state (wave 7; wave 6 left all 40 blocked).
export const CDS_CORE_WRITER_NEEDS = ['shared-25-D-aF0gt9.js#Uy', 'shared-0-CnnWnVrT.js#g9',
  ...['De', 'ft', 'ht', 'gt', '_t', 'vt', 'Y', 'xt', 'St', 'Ct', 'X', 'Ot'].map(l => `ca41b3815-k7z3sa_r.js#${l}`), 'vendor-zod-fszujTq6.js#k',
  ...['Kt', 'C', 'Rl', 'du'].map(l => `c03935b01-BylKMWqe.js#${l}`), 'shared-7-D2e77H6v.js#lS', 'shared-7-D2e77H6v.js#xS', 'c06cf64bb-CoZso5N4.js#vO',
  'c2d03a751-CMPZg8NP.js#s', ...['ht', 'qr', '$r', 'Si', 'wi', 'Ti', 'ki', 'Ai'].map(l => `c851b27a8-Chd9-72r.js#${l}`), 'cb8c5a88f-Cxti0pWl.js#go',
  'c34e6410a-BLtdknyP.js#s', ...['k', 'qe', 'Je', 'vt', 'Br', 'is', 'Os'].map(l => `cfa45e123-hxjKjDwM.js#${l}`)];

// ── ct-3: the 3.6556.2 graph's 19 dependency regions (region-plan batches[9] code-transcript dependsOn) on 4.16336.0.
//    status: 'linked' (graph in linkedAreas; checked on this version every run), 'pending' (main workflow; not in the
//    real tree on this version yet: link when it lands), 'not-reached' (the 4.16336.0 closure takes nothing from it),
//    'no-graph' (no 4.16336.0 graph in the real tree; `via` names where its bindings resolve). ─────────────────────────
const LP = (region, graph, status, why) => ({ region, graph, status, why });
export const LINK_PLAN = [
  LP('chat-markdown', 'chat-markdown-v4', 'linked', 'prose / markdown helpers (shared-11 J_ context held unexported: link-export request)'),
  LP('chat-renderer', 'chat-renderer-v4', 'linked', 'round2/chat-renderer-b/link-surface.json (Markdown roots still pending there)'),
  LP('code-composer', 'code-composer-v4', 'linked', 'composer helpers the feed reads'),
  LP('code-current:base', 'code-current-v4', 'not-reached', 'the V8 / f8 closure (4.16336.0) takes no binding code-current-v4 holds'),
  LP('code-routines', 'code-routines-v4', 'linked', 'routine rows / helpers'),
  LP('cowork-approval', 'cowork-approval-v4', 'linked', '3.6556.2 shared-52 Qq is shared-123#ZS (frame-sidebar-nav) now; cowork-approval-v4 holds other closure bindings'),
  LP('cowork-progress', 'cowork-progress-v4', 'linked', 'progress rows'),
  LP('files-changes', 'files-changes-v4', 'linked', 'changed-file rows'),
  LP('r3b-settings', null, 'no-graph', 'staging only (regions/batch1/r3b-settings); logger / logCategory are shared-0 Rc / N, resolved through turn-plan-v4'),
  LP('r3b-transcript', 'r3b-transcript-v4', 'linked', 'SessionFileOpenerProvider (ct-0) and the transcript file access'),
  LP('routines-shared', 'routines-shared-v4', 'linked', 'routine helpers'),
  LP('session-rail', 'session-rail-v4', 'pending', 'main workflow batch 6; not in the real tree on 4.16336.0 yet'),
  LP('session-rail-kit', 'session-rail-kit-v4', 'linked', 'rail kit helpers'),
  LP('session-rail-sections', 'session-rail-sections-v4', 'linked', 'main workflow batch 5 (in the real tree on 4.16336.0)'),
  LP('sessions-page', 'sessions-page-v4', 'linked', 'main workflow batch 5 (in the real tree on 4.16336.0)'),
  LP('transcript-rows', 'transcript-rows-v4', 'linked', 'tr-0 / tr-1 in the real tree; tr-2..tr-5 pending (PENDING_LINKED_AREAS)'),
  LP('turn-box', 'turn-box-v4', 'pending', 'main workflow batch 7; not in the real tree yet (PENDING_LINKED_AREAS)'),
  LP('turn-plan', 'turn-plan-v4', 'linked', 'turn plan rows; shared-0 Rc / N (logger, r3b-settings)'),
  LP('working-line', 'working-line-v4', 'linked', 'working line + the shared-0 / shared-frame helpers it exports'),
];
// 4.16336.0 graphs outside the 3.6556.2 dependency set that hold bindings of the V8 / f8 closure (dry run linkedFrom):
// linked when V8 / f8 are sliced (several are B-phase surface graphs still being written; not linked before then).
export const LINK_AT_SLICE = ['frame-sidebar-nav', 'settings-nav', 'settings-pages-v4', 'r4e-plugin', 'cowork-scheduled-v4', 'proposal-group-v4',
  'effort-control-v4', 'frame-sidebar', 'cowork-live-v4', 'chat-knowledge-v4', 'question-card-v4', 'retry-decision-v4', 'r3b-tasks', 'titlebar-frame',
  'titlebar', 'session-rail-changes-v4', 'home-chat-cowork', 'cowork-settings-v4', 'chat-thinking', 'approval-titles-v4', 'approval-elicitation-v4',
  'session-panels-v4', 'artifact-library-v4', 'session-load-error', 'code-editor-current-v4', 'code-start-v4'];
const LINKED_AREAS = ['transcript-rows-v4', 'r3b-transcript-v4', 'chat-renderer-v4',
  ...LINK_PLAN.filter(l => l.status === 'linked' && !['transcript-rows-v4', 'r3b-transcript-v4', 'chat-renderer-v4'].includes(l.graph)).map(l => l.graph)];

// ct-3: the link plan against the real tree: every 'linked' graph on this version, every 'pending' one reported when it lands.
async function checkLinkPlan() {
  const rows = [];
  for (const l of LINK_PLAN) {
    const m = l.graph ? await fs.readFile(path.join(generatedRoot, l.graph, 'manifest.json'), 'utf8').then(JSON.parse, () => null) : null;
    const onVersion = m?.referenceVersion === official.referenceVersion;
    if (l.status === 'linked' && !onVersion) throw Error(`LINK_PLAN ${l.region}: ${l.graph} is ${m?.referenceVersion ?? 'absent'}, expected ${official.referenceVersion}`);
    if (l.status === 'pending' && onVersion) console.log(`LINK_PLAN ${l.region}: ${l.graph} is in the real tree on ${official.referenceVersion} now: review and link it`);
    rows.push({ ...l, linked: LINKED_AREAS.includes(l.graph) });
  }
  return rows;
}

// Link requests (D1): a consumer of this graph lists bindings it reaches that a module here slices in its own
// scripts/<consumer>-v4-links.json under linkExports['code-transcript-v4'][chunk]; they are exported under their own
// names (runSlicer linkExports) so the consumer imports this one copy. A request for a chunk without a sliced module here
// or for a binding outside the closure stops generation.
export const LINK_REQUEST_FILES = ['queued-bar-v4-links.json', 'pierre-changes-v4-links.json'];
const linkRequests = {};
const requested = {};
for (const file of LINK_REQUEST_FILES) {
  let text;
  try { text = await fs.readFile(path.join(import.meta.dirname, file), 'utf8'); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
  const asked = JSON.parse(text).linkExports?.['code-transcript-v4'] ?? {};
  linkRequests[`scripts/${file}`] = { sha256: sha(text), linkExports: asked };
  for (const [chunk, locals] of Object.entries(asked)) requested[chunk] = [...new Set([...(requested[chunk] ?? []), ...locals])].sort();
}

const target = file => {
  const named = { [PATHS]: 'session-providers.mjs', [TASKS]: 'background-tasks.mjs', [C96]: 'transcript-rows-chrome.mjs' };
  return named[file] ?? `ct-${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
};
const sliced = Object.entries(ROOTS).map(([file, roots]) => [file, Object.fromEntries(Object.entries(roots).filter(([, r]) => r.slice !== false))]);
const modules = sliced.filter(([, roots]) => Object.keys(roots).length).map(([file, roots]) => ({
  source: file, target: target(file), internal: Object.values(roots).some(r => r.exports.length === 0),
  exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
  features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  ...(requested[file] ? { linkExports: requested[file] } : {}),
}));
for (const chunk of Object.keys(requested)) if (!modules.some(m => m.source === chunk)) throw Error(`link request: code-transcript-v4 has no sliced module for ${chunk}`);

// The surface consumers link (queued-bar, pierre-changes, the relink stage): semantic exports of the sliced roots, the
// chunk-local link exports granted, and the semantic names still pending (located / candidates, not sliced yet).
function linkSurface(manifest) {
  const semanticExports = {}, linkExports = {};
  for (const mod of manifest.modules) {
    for (const [local, name] of Object.entries(mod.exports ?? {})) semanticExports[name] = { module: mod.target, ref: `${mod.source}#${local}` };
    if (mod.linkExports?.length) linkExports[mod.source] = { module: mod.target, locals: mod.linkExports };
  }
  const pending = {};
  for (const [file, roots] of Object.entries(ROOTS)) for (const [local, r] of Object.entries(roots)) if (r.slice === false) pending[r.name] = { ref: `${file}#${local}`, step: r.step, located: 'pinned' };
  for (const p of PENDING_ROOTS) if (!pending[p.name]) pending[p.name] = { ref: p.candidate, step: p.step, located: p.candidate ? 'candidate' : 'unsurveyed', previous: p.previous };
  return {
    schema: 'code-transcript-v4-link-surface/1', graph: CODE_TRANSCRIPT_V4_OUTPUT, referenceVersion: official.referenceVersion,
    howToLink: 'add "code-transcript-v4" to the consumer\'s runSlicer linkedAreas (linkedGraphs for another engine): bindings are matched by 4.16336.0 file#local and imported under the semantic name below; a binding sliced here without an export stops the consumer (unexportedLinks): list it in scripts/<consumer>-v4-links.json {"linkExports":{"code-transcript-v4":{"<chunk>.js":["<local>"]}}} (LINK_REQUEST_FILES) and re-run this generator. Never link src/generated/code-transcript (3.6556.2) from a 4.16336.0 graph.',
    semanticExports, linkExports, linkRequests, pendingSemanticExports: pending,
    linkedAreas: LINKED_AREAS, linkPlan: LINK_PLAN, linkAtSlice: LINK_AT_SLICE, pendingLinkedAreas: PENDING_LINKED_AREAS.map(a => a.area),
  };
}

// Pinned on the minified bytes (each exactly once): the providers / readers / callers the constraints rely on.
const rawCallSites = [
  { source: SESSION_PROVIDERS, role: 'ct-1: the session provider stack mounts the three c856385e2 providers with its props (imported as S / h / n)',
    features: ['S as ne', 'h as de', 'n as pe', 'n(de,{value:t.imageLoader,children:x})', 'n(pe,{value:t.containedImageLoader,children:S})', 'n(ne,{value:t.sessionFileReadable,children:D})'] },
  { source: PATHS, role: 'ct-1: the three providers over cds-core\'s contexts (kt = l(!1), Jt / Zt = l(null)) and their readers',
    features: ['kt=l(!1)', 'At=kt.Provider', 'function jt(){return s(kt)}', 'Jt=l(null)', 'Yt=Jt.Provider', 'function Xt(){return s(Jt)}', 'Zt=l(null)', 'Qt=Zt.Provider', 'function $t(){return s(Zt)}', 'At as S', 'Yt as h', 'Qt as n'] },
  { source: TASKS, role: 'ct-1: the background task provider ve: X (the task array a = i.tasks) outermost, L (statuses, transcript-rows-v4) inside; _e (exported g) reads X',
    features: ['var E=[],se={tasks:E,flaggedTaskIds:[]}', 'var X=t(E);function _e(){return e(X)}', 'a=i.tasks,s=fe(a)', 'n(X.Provider,{value:a},n(L.Provider,{value:s}', '_e as g'] },
  { source: C96, role: 'ct-1: UserRowChromeContext WM (k(!1)): provided around an aside reply, read by the user row bubble (j(WM))',
    features: ['WM=k(!1)', 'f(WM.Provider,{value:t.entry.aside===!0&&Ft!==!1&&X!==!0,children:f(Cit,{', 'f(WM.Provider,{value:!1,children:f(gM,{value:!1,children:t})})'] },
  { source: C96, role: 'ct-1: the feed row switch draws ForkedFromRow (jgt = w(Agt)) and ForkMarkerRow (Ngt = w(Mgt))',
    features: ['f(jgt,{sessionId:e,parentSessionId:t.parentSessionId,linked:n})', 'f(Ngt,{childIds:t.childIds,linked:e})', 'var jgt=w(Agt)', 'var Ngt=w(Mgt)'] },
  { source: C96, role: 'ct-2: the renderer module: its namespace names V8, the residency call keeps it, WSt draws it as USt; f8 reads d8',
    features: ['CodeTranscriptRenderer:()=>V8', 'Qdt(uht);', 'var USt=V8;', 'd8=k(null)', 'f(d8.Provider,{value:u,'] },
];

async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root.
export async function locateRoots(cache = new Map()) {
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
      const inner = INNER_FEATURES[key];
      if (inner) {
        const entry = src.top.get(inner.inner);
        if (!entry || entry.kind !== 'function' || !await carries(src, entry, inner.features)) throw Error(`${key}: inner component ${inner.inner} does not carry its reviewed features`);
      }
      const declarationSha256 = sha(rawText(src, located[0]));
      const pin = ROOT_PINS[key];
      if (pin === undefined) throw Error(`${key}: no reviewed pin`);
      if (pin !== null && pin !== declarationSha256) throw Error(`${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, step: spec.step, sliced: spec.slice !== false, previous: spec.previous, exports: aliases,
        ...(spec.constraint ? { constraint: spec.constraint, shapeAlternatives: hits.length } : {}), declarationSha256, pinned: pin !== null });
    }
  }
  return found;
}

// CALL_SITES: AST location (the one declaration carrying the probe and features), reviewed local, pinned raw sha256.
export async function locateCallSites(cache = new Map()) {
  const found = [];
  for (const site of CALL_SITES) {
    const src = await readSource(site.source, cache, official.ionSource);
    const hits = [];
    for (const entry of declarations(src)) if (rawText(src, entry).includes(site.probe) && await carries(src, entry, site.features)) hits.push(entry);
    if (hits.length !== 1) throw Error(`call site ${site.source}#${site.binding}: ${hits.length} top-level declarations carry its features, expected 1`);
    const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
    if (!names.includes(site.binding)) throw Error(`call site ${site.source}: the declaration carrying ${site.binding}'s features is ${names.join(', ')}`);
    const key = `${site.source}#${site.binding}`, declarationSha256 = sha(rawText(src, hits[0]));
    if (CALL_SITE_PINS[key] !== declarationSha256) throw Error(`call site ${key}: declaration ${declarationSha256} differs from the reviewed pin ${CALL_SITE_PINS[key]}`);
    found.push({ file: site.source, local: site.binding, previous: site.previous, declarationSha256, pinned: true });
  }
  return found;
}

// DYNAMIC_IMPORTS: the chunk's import() calls, read from the official AST, equal the reviewed table (no computed
// specifier; every holder's raw declaration sha256 as pinned).
export async function checkDynamicImports(cache = new Map()) {
  const rows = [];
  for (const [file, table] of Object.entries(DYNAMIC_IMPORTS)) {
    const src = await readSource(file, cache, official.ionSource);
    const decls = declarations(src);
    const found = [];
    babel.traverse(babel.babelParse(src.code, file, true), {
      'CallExpression|ImportExpression'(p) {
        const n = p.node;
        if (n.type !== 'ImportExpression' && n.callee?.type !== 'Import') return;
        const arg = n.type === 'ImportExpression' ? n.source : n.arguments[0];
        if (arg?.type !== 'StringLiteral') throw Error(`${file}: computed dynamic import at ${n.start} (${src.code.slice(arg.start, arg.end).slice(0, 80)})`);
        const entry = decls.find(e => e.node.start <= n.start && n.start < e.node.end);
        const holder = entry ? [...src.top].filter(([, e]) => e === entry).map(([k]) => k).join(',') : null;
        found.push({ holder, specifier: arg.value, sha256: entry ? sha(rawText(src, entry)) : null });
      },
    });
    const want = table.map(({ holder, specifier, sha256 }) => ({ holder, specifier, sha256 }));
    if (JSON.stringify(found) !== JSON.stringify(want)) throw Error(`${file}: dynamic imports differ from DYNAMIC_IMPORTS:\n  found ${JSON.stringify(found)}`);
    rows.push(...table.map(r => ({ file, ...r, computed: false })));
  }
  return rows;
}

// PENDING_ROOTS: each candidate is still a top-level declaration of its 4.16336.0 chunk (structure only).
export async function checkPending(cache = new Map()) {
  const files = new Set(await fs.readdir(official.ionSource));
  const previousFiles = new Set(await fs.readdir(official.previousIonSource));
  const rows = [];
  for (const p of [...PENDING_ROOTS, ...PENDING_CALL_SITES]) {
    const [prevFile] = p.previous.split('#');
    if (!previousFiles.has(prevFile)) throw Error(`pending ${p.name}: 3.6556.2 ${prevFile} is not in the previous snapshot`);
    if (p.candidate === null) { rows.push({ ...p, structure: 'unsurveyed' }); continue; }
    const [file, local] = p.candidate.split('#');
    if (!files.has(file)) throw Error(`pending ${p.name}: ${file} is not in the 4.16336.0 snapshot`);
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`pending ${p.name}: ${p.candidate} is not a top-level declaration`);
    rows.push({ ...p, structure: 'top-level-declaration' });
  }
  return rows;
}

// ct-0: the state this graph slices has no other 4.16336.0 copy; the foreign owners hold and export what is recorded.
async function ownerTable(manifest) {
  const others = [];
  for (const dirent of await fs.readdir(generatedRoot, { withFileTypes: true })) {
    if (!dirent.isDirectory() || dirent.name === path.basename(CODE_TRANSCRIPT_V4_OUTPUT)) continue;
    const file = path.join(generatedRoot, dirent.name, 'manifest.json');
    const json = await fs.readFile(file, 'utf8').then(JSON.parse, () => null);
    if (json?.referenceVersion === official.referenceVersion) others.push([dirent.name, json]);
  }
  const holders = key => others.filter(([, m]) => (m.modules ?? []).some(mod => path.basename(mod.source ?? '') === key.split('#')[0]
    && (mod.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === key.split('#')[1]))).map(([name]) => name);
  const owned = [];
  for (const mod of manifest.modules) for (const b of mod.bindings ?? []) {
    const name = typeof b === 'string' ? b : b.name, key = `${mod.source}#${name}`, elsewhere = holders(key);
    if (elsewhere.length) throw Error(`D1: ${key} is also sliced by ${elsewhere.join(', ')}; link it from there`);
  }
  for (const [file, roots] of sliced) for (const [local, spec] of Object.entries(roots)) {
    const mod = manifest.modules.find(m => m.source === file);
    owned.push({ name: spec.name, binding: `${file}#${local}`, owner: 'code-transcript-v4', target: mod.target, export: spec.name, previous: spec.previous });
  }
  const cds = others.find(([name]) => name === 'cds-core')?.[1];
  const foreign = [];
  for (const f of FOREIGN_OWNERS) {
    const [file, local] = f.binding.split('#');
    if (f.owner === 'cds-core') {
      const pub = cds?.publicNames?.[f.publicName];
      if (!pub || pub.file !== file || pub.local !== local) throw Error(`owner table: cds-core does not publish ${f.publicName} as ${f.binding}`);
      foreign.push({ ...f, target: `cds-core/${pub.target}`, export: pub.exportName });
    } else {
      const m = others.find(([name]) => name === f.owner)?.[1];
      const mod = m?.modules?.find(x => x.target === f.target && path.basename(x.source) === file);
      if (!mod || mod.exports?.[local] !== f.export) throw Error(`owner table: ${f.owner}/${f.target} does not export ${f.binding} as ${f.export}`);
      foreign.push({ ...f, target: `${f.owner}/${f.target}` });
    }
    const elsewhere = holders(f.binding).filter(name => name !== f.owner);
    if (elsewhere.length) throw Error(`D1: ${f.binding} (${f.name}) is owned by ${f.owner} but also sliced by ${elsewhere.join(', ')}`);
  }
  for (const mod of manifest.modules) for (const imp of mod.imports ?? []) if (imp.kind === 'adapter') throw Error(`${mod.target}: imports host adapter ${imp.name}; steps ${STEPS.join(', ')} reach none`);
  // ct-4: no holder of a c96d752d0 import() is in this graph's slice (its chunk would have to be emitted under its own name).
  for (const [file, table] of Object.entries(DYNAMIC_IMPORTS)) {
    const mod = manifest.modules.find(m => m.source === file);
    for (const r of table) if ((mod?.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === r.holder)) throw Error(`${file}#${r.holder} (import ${r.specifier}) is sliced: list ${r.specifier} as a chunk emitted under its own name`);
  }
  return { owned, foreign };
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the code-transcript-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function codeTranscriptV4Config() {
  return {
    name: 'code transcript (4.16336.0)', generator: 'extract-code-transcript-v4.mjs', output: path.join(root, CODE_TRANSCRIPT_V4_OUTPUT),
    adapterModule: '../../source-code-transcript-v4-adapters.jsx', adapterFile: 'src/source-code-transcript-v4-adapters.jsx', adapters: {}, localAdapters: {},
    modules, rawCallSites, sharedGraph: 'cds-core', generatedRoot, sourceContract: official,
    callSites: CALL_SITES.map(({ source, binding, role, features }) => ({ source, binding, role, features })),
    // D1: what transcript-rows-v4 (tr-0), r3b-transcript-v4, chat-renderer-v4 (round2/chat-renderer-b/link-surface.json)
    // and the other LINK_PLAN 'linked' graphs hold is imported from them, never sliced again. turn-box-v4 and
    // transcript-rows tr-2..tr-5: PENDING_LINKED_AREAS; session-rail-v4: LINK_PLAN pending.
    linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
    gate: { flag: '__gb__3413676205', name: 'code_unified_renderer', host: 'wired in step ct-3 (src/host-growthbook.mjs HOST_GROWTHBOOK; 3.6556.2: Uon always !0, E81)' },
  };
}
export const probeConfig = codeTranscriptV4Config;

export async function extractCodeTranscriptV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const callSitesLocated = await locateCallSites(cache);
  const dynamicImports = await checkDynamicImports(cache);
  const pending = await checkPending(cache);
  const linkPlan = await checkLinkPlan();
  const cfg = {
    ...codeTranscriptV4Config(),
    async artifacts(m) {
      const owners = await ownerTable(m);
      const rootsByTarget = new Map();
      for (const [file, rs] of sliced) if (Object.keys(rs).length) rootsByTarget.set(target(file), Object.values(rs).map(r => r.name));
      return {
        'index.mjs': `// Semantic names of the code-transcript roots (${official.referenceVersion}, steps ${STEPS.join(', ')}); generated by extract-code-transcript-v4.mjs.\n`
          + [...rootsByTarget].map(([t, names]) => `export { ${names.join(', ')} } from "./${t}";`).join('\n') + '\n',
        'owners.json': JSON.stringify({ step: 'ct-0', referenceVersion: official.referenceVersion, ...owners }, null, 2) + '\n',
        'link-surface.json': JSON.stringify(linkSurface(m), null, 2) + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-code-transcript-v4.mjs', steps: STEPS,
          previous: { generator: 'scripts/extract-code-transcript.mjs', output: 'src/generated/code-transcript', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, roots,
          callSites: callSitesLocated, dynamicImports,
          pendingRoots: pending,
          pendingLinkedAreas: PENDING_LINKED_AREAS,
          linkPlan, linkRequests,
          cdsCoreWriterNeeds: CDS_CORE_WRITER_NEEDS,
          imports: m.modules.flatMap(mod => (mod.imports ?? []).filter(i => i.kind && i.kind !== 'generated' && i.kind !== 'verbatim')
            .map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    for (const f of await locateRoots()) console.log('root', `${f.file}#${f.local}`, f.name, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED', f.constraint ? `${f.constraint} of ${f.shapeAlternatives}` : '');
    for (const c of await locateCallSites()) console.log('callSite', `${c.file}#${c.local}`, c.previous, c.declarationSha256);
    for (const d of await checkDynamicImports()) console.log('import()', `${d.file}#${d.holder}`, d.specifier, d.reachedBy ?? '-');
    for (const p of await checkPending()) console.log('pending', p.step, p.name, p.candidate ?? '(unsurveyed)', p.structure);
  } else await extractCodeTranscriptV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
