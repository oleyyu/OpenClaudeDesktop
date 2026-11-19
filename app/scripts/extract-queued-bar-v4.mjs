// Queued message bar, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, round 2 batch 11, unit queued-bar):
// the semantic root scripts/extract-queued-bar.mjs cuts from 3.6556.2 into src/generated/queued-bar (cf74bc599 VE
// QueuedMessageBar), re-located in the frozen 4.16336.0 snapshot, for the isolated graph src/generated/queued-bar-v4.
// The 3.6556.2 generator, its output and src/source-queued-bar-adapter.jsx are untouched (staged double output; no
// production switch: src/source-queued-messages.jsx keeps mounting src/generated/queued-bar). Round 3 left the switch
// out: the bar's closure statically reaches three frame-sidebar-nav import-writers (shared-0 mC / bC / K$, d1-gate W7-D1;
// round3/relink/rl-queued-bar-pierre/logs/writer-reach-queued-bar--precise.json) and calls the nav host capability
// useFeatureIsOn, whose table (src/frame-sidebar-nav-host.jsx) the host does not install yet; both clear with wave 8.
//
// Root (cf74bc599-BytvntCE; 3.6556.2 counterpart cf74bc599-CRYqipWN VE):
//   wO  QueuedMessageBar (export alias QueuedMessageBar)  memo; no entries: null; one entry: DO (the row `${Co} px-lg
//       select-none`: "{count} message queued", the preview eO, the sent mark sO, Send now EO — ArrowReturn ghost
//       described by "Claude reads this message at its next step." / "Stops Claude's current response." when steerStops —
//       Edit in composer, Remove from queue, joinTop); several: OO (the collapsed / expanded list of CO sortable rows,
//       dnd-kit c09f6b4e5, the ⋮ / context menu through shared-frame Us = _D renderMenuItems, Clear all); the band
//       `${Oy} ${exiting ? "epitaxy-band-exit" : ""}` (Oy = c0b46114c t, BAND_ENTER_CLASS of session-rail-changes-v4).
//   New in 4.16336.0 against VE: entry.seeded (no Edit, never steerable: SO), waitingLane "steer", steerHeadOnly /
//   steerStops (EO's "Stops Claude's current response."), joinTop, the "sent" mark reads es() (shared-39 zs) && (accepted ||
//   landed), the comment-summon preview (QD / nO over c28ffe629 Ji, the artifact comment summary with the artifact title).
//
// Where the desktop mounts it (pinned on the minified bytes, RAW_CALL_SITES): cc43287c9-dzfX-J5i ICe, the session scope
// body's overlay `Da({entry: Tm, pick: e => e.QueuedMessageBar, …, overlayHost: "EpitaxySessionScopeBody.QueuedMessageBar"})`
// (3.6556.2 cc43287c9 epe: round2/plan.json reported it "not found" because the local and the chunk hash changed; the
// overlayHost string is the same), rendered `p(ICe, {entries, exiting, onExited, lockedIds, onCancel, onEdit, onSteer,
// steerHeadOnly, steerBusy, onReorder}, `${t}:queued`)` while `_c.entries?.length`.
//
// Formerly PENDING (D1, never cut twice), released by cds-core wave 7 (cds-integrate/wave7/unblocks.json, manifest 79b004e0)
// and moved back into ROOTS in round 3 (relink task rl-queued-bar-pierre):
//   - shared-frame-CJdE5Ria.js#_D (renderMenuItems; cf74bc599 F = shared-frame Us): CO's row menu, now linked from cds-core
//     (publicName renderMenuItems) instead of copying vendor-frame's Base UI menu out of cds-core.
//   - shared-3-IQTrO7Gx.js#jF (the artifact names store `Ho(() => ({namesByTenantAndUuid, readMsByTenantAndUuid}))`):
//     eO -> nO -> rs = c28ffe629 Ji -> it -> shared-3 ZF -> VF reads it; now linked from cds-core (publicName
//     artifactNamesStore), one store.
// assertPending still checks every entry left in PENDING_ROOTS (none today).
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here), configured the way
// extract-cowork-live-v4.mjs is: sourceContract scripts/official-4.16336.0.mjs; sharedGraph 'cds-core' (pinned manifest
// sha256, D46); linkedAreas (D1): every binding a linked 4.16336.0 graph holds and exports is imported from it; pure
// bindings a linked graph slices without exporting are cut again here (linkedCopies, each checked pure by d1-lib in
// tests/queued-bar-v4.test.mjs); host boundaries as localAdapters (file#local), each original pinned by features and raw
// declaration sha256 (ADAPTER_PINS), src/source-queued-bar-v4-adapters.jsx only re-exports existing host adapters.
// Roots are located on the official AST (the only top-level declaration of its chunk whose raw text has the probe and
// whose prettier form carries every feature, under the reviewed local, raw declaration sha256 pinned). No pin is ever
// refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const QUEUED_BAR_V4_OUTPUT = 'src/generated/queued-bar-v4';
const ADAPTER_FILE = 'src/source-queued-bar-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

export const BAR = 'cf74bc599-BytvntCE.js';
export const SCOPE_BODY = 'cc43287c9-dzfX-J5i.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias), probe (raw), features (prettier) } ───────────────
export const ROOTS = {
  [BAR]: {
    wO: { name: 'QueuedMessageBar', export: 'QueuedMessageBar', probe: 'r=e.lockedIds?.has(t.id)===!0,i=t.seeded===!0',
      features: ['if (t === 0) return null;', 'r = e.lockedIds?.has(t.id) === !0,', 'i = t.seeded === !0,', 's = r || !SO(t) ? void 0 : e.onSteer,',
        'c = i || r ? void 0 : e.onEdit,', 'u = e.steerHeadOnly === !0;', 'o(DO, {', 'steerStops: u,', 'joinTop: e.joinTop,', 'o(OO, { ...e })',
        's = `${Oy} ${a ? "epitaxy-band-exit" : ""}`,', 'o("div", { className: s, inert: a, onAnimationEnd: c, children: n })'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'cf74bc599-BytvntCE.js#wO': '718c33b793fe5b518edfca40aec430422b5405346da7192adcaf66dbcf4260b4',
};

// Roots held back (see the header). `needs`: what must change before the root can be cut without a second copy of
// module state; assertPending throws as soon as one is met (move the root back: delete it here, re-run --probe, generate).
export const PENDING_ROOTS = {};
// Released in round 3 (wave 7 published both needs): cf74bc599#wO QueuedMessageBar once waited for
// shared-frame-CJdE5Ria.js#_D (cds-core renderMenuItems) and shared-3-IQTrO7Gx.js#jF (cds-core artifactNamesStore).
export const RELEASED_ROOTS = {
  [`${BAR}#wO`]: { name: 'QueuedMessageBar', releasedBy: 'cds-core wave 7', needs: [
    { binding: 'shared-frame-CJdE5Ria.js#_D', publicName: 'renderMenuItems' },
    { binding: 'shared-3-IQTrO7Gx.js#jF', publicName: 'artifactNamesStore' },
  ] },
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from, old (3.6556.2 original), features } ───
const QB = 'src/source-queued-bar-adapter.jsx', CT = 'src/source-code-transcript-adapters.jsx', RS = 'src/source-routines-shared-adapters.jsx';
export const HOST_ADAPTERS = {
  // c6b8adeaf's queue stores (3.6556.2 Ti / vi / yi / bi, the same four readers): the host's queue state of the entry
  // (src/source-queued-bar-adapter.jsx QueuedBarStateContext: lockedIds / steeringId). aa `{inFlight}` is the cancel in
  // flight (the X busy "Removing…"), q `{pending, landed}` the promotion (Send now busy "Sending…", accepted / landed: the
  // "sent" mark sO). cf74bc599 imports them as r_ (N), n_ (L), i_ (R), t_ (B).
  'c6b8adeaf-qnfs920E.js#la': { name: 'useQueuedEntryRemoving', from: QB, old: 'c6b8adeaf-bLEQVSWL.js#Ti', features: ['return aa(J1($, 0, e) ? K1($, 0, e, (t) => e in t.inFlight) : $[1]);'] },
  'c6b8adeaf-qnfs920E.js#ta': { name: 'useQueuedEntrySending', from: QB, old: 'c6b8adeaf-bLEQVSWL.js#vi', features: ['return q(J1($, 0, e) ? K1($, 0, e, (t) => e in t.pending) : $[1]);'] },
  'c6b8adeaf-qnfs920E.js#na': { name: 'useQueuedEntrySendAccepted', from: QB, old: 'c6b8adeaf-bLEQVSWL.js#yi', features: ['(t) => t.pending[e] === "accepted"'] },
  'c6b8adeaf-qnfs920E.js#ra': { name: 'useQueuedEntrySendLanded', from: QB, old: 'c6b8adeaf-bLEQVSWL.js#bi', features: ['(t) => e !== null && e in t.landed'] },
  // cb231ff8d c: the seeded-summon parser's lazy handle (shared-92 Qy over `import("./ce4ced852-DvUl86-e.js")`), read by
  // cb231ff8d d (cbe8e060f d, the preview's `$y`): not served, the code-transcript graph's failed handle, so d answers
  // `{status: "unparsed"}` and an unmarked comment summon previews as text (3.6556.2: the same adapter, cb231ff8d c).
  'cb231ff8d-H_9bdVKG.js#c': { name: 'SEEDED_SUMMON_PARSER_ENTRY', from: CT, old: 'cb231ff8d-C3NUlIOY.js#c', features: ['id: "epitaxy_seeded_summon_parser",', 'import("./ce4ced852-DvUl86-e.js")'] },
  // Account / intl (routines-shared-v4, cowork-live-v4 and cowork-progress-v4 adapt the same bindings).
  'shared-25-D-aF0gt9.js#Z': { name: 'useCurrentAccount', from: RS, old: null, features: ['Error("Must call inside CurrentAccountProvider"),'] },
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: RS, old: 'vendor-intl-DYfox5Co.js#q', features: ['return (Mt(e), e);'] },
  // FormattedMessage: the 3.6556.2 bar's persona wrapper (E83: EO's note names the assistant; QueuedBarMessage swaps the
  // running core's assistant for the two ids 2jgJ/J75kk and 6Wu6VFE8rB, every other message unchanged).
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'QueuedBarMessage', from: QB, old: 'vendor-intl-DYfox5Co.js#l', features: ['var Gt = a(Wt, Ut);'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'c6b8adeaf-qnfs920E.js#la': '7426a45bb8b62b3f82d4c41650bf8ae8d261ccc2c82e8e2def1a936c0a6ec73f',
  'c6b8adeaf-qnfs920E.js#ta': 'f5cdd41e678d555ad0bcf68f254620f3c986f262d4600551eac3f1a361df833f',
  'c6b8adeaf-qnfs920E.js#na': 'f8b53a11810e9ba7bb46d1f1a384a7f5d09e5e6524882eb7b5995c112f171902',
  'c6b8adeaf-qnfs920E.js#ra': 'dbb7a588f868db985da23da9010585c59049b7f50ca61dacfced79cf31c84ebd',
  'cb231ff8d-H_9bdVKG.js#c': '4b672a180649313a49b901e0fd92e133fa66fdddc01ef1ca59b28bba0d4029bc',
  'shared-25-D-aF0gt9.js#Z': '65456efed4ffae1a16e739336c231a59f0f8fd4f0523de0d58b1ae8c18f0eb74',
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!ADAPTER_PINS[key]) throw Error(`adapter ${key}: no reviewed pin`);

// The 4.16336.0 graphs the closure imports from with _D / jF linked from cds-core (round2/queued-bar/logs/probe-4-linked.json
// `linkedFrom`, re-probed in round 3). D1-relevant (stateful) imports resolve to the
// one graph holding them whatever the order; a pure duplicate several graphs hold is served by the last listed exporter.
// Round 3 re-probe (wave-7 cds-core, _D and jF linked from cds-core; round3/relink/rl-queued-bar-pierre/logs/probe-r3-1.json):
// settings-nav served none of the closure's imports any more and left the list (probe-r3-2.json: the same 18 modules /
// 310 bindings without it).
export const LINKED_AREAS = [
  'chat-projects-v4', 'code-composer-v4', 'cowork-scheduled-v4', 'frame-sidebar-nav', 'proposal-group-v4', 'r3b-transcript-v4',
  'titlebar', 'turn-plan-v4', 'session-rail-changes-v4', 'working-line-v4',
];
// Pure bindings a linked graph slices without exporting, cut again here (chunk#local -> why; round2/queued-bar/logs/
// probe-3-D-boundary.json, the closure with _D linked; tests/queued-bar-v4.test.mjs re-checks each one pure with d1-lib).
const W_TURN_PLAN_V4 = 'pure (d1-lib classify), sliced by turn-plan-v4 without an export: the queued preview\'s text cleanup (shared-1 system-tag strip, c4d199b75 reply / attach markers)';
const W_FRAME_SIDEBAR_NAV = 'pure (d1-lib classify), sliced by frame-sidebar-nav without an export: the artifact name key / uuid helpers (shared-3)';
export const linkedCopies = {
  // pure (d1-lib classify), sliced by turn-plan-v4 without an export: the queued preview's text cleanup (shared-1 system-tag strip, c4d199b75 reply / attach markers)
  'shared-1-D1bGaTaN.js#F4': W_TURN_PLAN_V4, 'shared-1-D1bGaTaN.js#P4': W_TURN_PLAN_V4, 'shared-1-D1bGaTaN.js#Y4': W_TURN_PLAN_V4, 'shared-1-D1bGaTaN.js#G4': W_TURN_PLAN_V4,
  'shared-1-D1bGaTaN.js#N4': W_TURN_PLAN_V4, 'shared-1-D1bGaTaN.js#j4': W_TURN_PLAN_V4, 'shared-1-D1bGaTaN.js#q4': W_TURN_PLAN_V4, 'shared-1-D1bGaTaN.js#e3': W_TURN_PLAN_V4,
  'shared-1-D1bGaTaN.js#$4': W_TURN_PLAN_V4, 'shared-1-D1bGaTaN.js#t3': W_TURN_PLAN_V4, 'shared-1-D1bGaTaN.js#n3': W_TURN_PLAN_V4, 'c4d199b75-BFt-qsGU.js#q': W_TURN_PLAN_V4,
  'c4d199b75-BFt-qsGU.js#F': W_TURN_PLAN_V4, 'c4d199b75-BFt-qsGU.js#we': W_TURN_PLAN_V4, 'c4d199b75-BFt-qsGU.js#N': W_TURN_PLAN_V4, 'c4d199b75-BFt-qsGU.js#z': W_TURN_PLAN_V4,
  'c4d199b75-BFt-qsGU.js#P': W_TURN_PLAN_V4, 'c4d199b75-BFt-qsGU.js#j': W_TURN_PLAN_V4,
  // pure (d1-lib classify), sliced by frame-sidebar-nav without an export: the artifact name key / uuid helpers (shared-3)
  'shared-3-IQTrO7Gx.js#NF': W_FRAME_SIDEBAR_NAV, 'shared-3-IQTrO7Gx.js#MF': W_FRAME_SIDEBAR_NAV, 'shared-3-IQTrO7Gx.js#yF': W_FRAME_SIDEBAR_NAV, 'shared-3-IQTrO7Gx.js#vF': W_FRAME_SIDEBAR_NAV,
  // wave 8c (addendum C): frame-sidebar-nav now exports shared-0 ut (its PerformanceMetricsProvider root jk reaches the
  // base58 / uuid parser from a second module), so the bar links ut instead of cutting it and shared-0 is no longer
  // entered. The eight copies were: shared-0-CnnWnVrT.js#ut / #nt / #tt / #Ye / #Ke / #We / #Ue / #Ge (W_FRAME_SIDEBAR_NAV).
};

// dnd-kit (c09f6b4e5--ahaSfV5, 178 bindings of OO / CO's sortable list, 9 of them module state: contexts ce / Yt / Xt /
// rn / sn / Bn, the measuring cache Ct (`new Map`) and the default context values qt / Jt the contexts are created over).
// Owner (D1, round 3): d1-lib finds no 4.16336.0 graph holding any of its bindings (app-only and full; round3/relink/
// rl-queued-bar-pierre/logs/dnd-kit-holders.json), and cds-core is frozen at wave 7 without it, so this graph is its first
// and only holder. Seven official chunks import it (the bar, the session rail sN and five others): the module state is
// exported under its own names (linkExports) so a later graph (session-rail-v4 sN) links this one copy instead of cutting
// a second DndContext / SortableContext; publishing it from cds-core stays a recommended wave-8 request (cdsCoreNeeds).
export const DND_KIT = 'c09f6b4e5--ahaSfV5.js';
export const DND_KIT_LINK_EXPORTS = ['Bn', 'Ct', 'Jt', 'Xt', 'Yt', 'ce', 'qt', 'rn', 'sn'];
// round4 relink-w8 (session-rail-v4 SessionRail sN, the rail section reorder cf74bc599 XM / kb / Cb): five pure helpers of
// the same chunk the rail also reads — N (isKeyboardEvent), y (the window of a node), _ (is a Window), v (is a Node), Dn
// (arrayMove) — exported under their own names too, so this graph stays dnd-kit's one holder (no second copy, not even of
// pure code) and session-rail-v4 links them.
// round4 navfix (frame-sidebar-nav ships the official lazy chunk c1afd40ea, sidebar_project_reorder_dnd, the project group
// drag bindings shared-55 Iz reads): c1afd40ea imports dnd-kit's En (DragOverlay, the memo component) and dn (useDndContext),
// both pure by d1-lib classify; exported here too (joining the closure with what they read), so the sidebar links them and
// this graph stays dnd-kit's one holder.
export const DND_KIT_PURE_LINK_EXPORTS = ['Dn', 'En', 'N', '_', 'dn', 'v', 'y'];
// dnd-kit's TypeScript enums are filled by top-level statements `var Q;(function(e){e.Space="Space",…})(Q||={})` the engine
// does not see as assigning Q (the assignment is an argument of the call), so without carryStatements Q / Z / H … stay
// undefined and the chunk throws at load (`Q.Space`; round3/relink/rl-queued-bar-pierre/logs/ssr-scratch-1.log). The nine
// enums the closure selects are carried as the official statements, each named by its raw `(X||={})` argument (each
// occurs once in the chunk; tools/dropped-statements.mjs: no other dropped statement reads a selected binding). ut
// (RightClick…) is not selected and stays out.
export const DND_KIT_ENUM_STATEMENTS = ['(H||={})', '(X||={})', '(Z||={})', '(Q||={})', '(mt||={})', '(ht||={})', '(xt||={})', '(St||={})', '(an||={})'];

const target = file => (file === BAR ? 'queued-bar.mjs' : `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`);
// The originals the root reads, one module per chunk (listing a chunk the closure never enters, or entering one not
// listed, stops generation). The closure once _D is linked from cds-core (round2/queued-bar/logs/probe-3-D-boundary.json:
// 18 modules, 311 bindings, 0 copies of cds-core-held code; with _D cut here it would be 20 modules / 852 bindings, 534 of
// them copies of cds-core-held shared-frame / vendor-frame code, probe-2.json).
// wave 8c: shared-0-CnnWnVrT.js left the list (ut is linked from frame-sidebar-nav; was 17 chunks, now 16).
export const CLOSURE_CHUNKS = ['c06cf64bb-CoZso5N4.js', 'c09f6b4e5--ahaSfV5.js', 'c28ffe629-UwVJIrEV.js', 'c470fd30f-DEXgWknH.js', 'c4d199b75-BFt-qsGU.js', 'c53a94863-BDspYDCo.js', 'c96d752d0-D9VB6ArX.js', 'cb231ff8d-H_9bdVKG.js', 'cbe8e060f-ALQ-pIfu.js', 'ce311b43f-CaHZaaO5.js', 'shared-1-D1bGaTaN.js', 'shared-153-DMw2VzSq.js', 'shared-2-CsjIBQD8.js', 'shared-26-B-POtn5S.js', 'shared-3-IQTrO7Gx.js', 'shared-38-DyF0_Fim.js'];
const modules = () => [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...CLOSURE_CHUNKS.filter(source => !ROOTS[source]).map(source => ({ source, target: target(source), ...(source === DND_KIT ? { linkExports: [...DND_KIT_LINK_EXPORTS, ...DND_KIT_PURE_LINK_EXPORTS], carryStatements: DND_KIT_ENUM_STATEMENTS } : {}) })),
];

// Pinned on the minified bytes (each exactly once): where the desktop mounts the bar and what it passes.
export const RAW_CALL_SITES = [
  { source: SCOPE_BODY, role: 'The session scope body\'s queued message bar overlay (cf74bc599 wO, export QueuedMessageBar), rendered while the queue has entries',
    features: ['var{Component:ICe}=Da({entry:Tm,pick:e=>e.QueuedMessageBar,options:{loading:Ea("placeholder-would-mislead")},overlayHost:"EpitaxySessionScopeBody.QueuedMessageBar"})',
      '_c.entries?.length?p(ICe,{entries:_c.entries,exiting:_c.exiting,onExited:_c.onExited,lockedIds:wn,onCancel:Tn?Ae:void 0,onEdit:Tn?Ge:void 0,onSteer:ji&&!Pi?void 0:Dn,steerHeadOnly:On,steerBusy:On&&Ai,onReorder:En?ut:void 0},`${t}:queued`):null'] },
  { source: BAR, role: 'The bar chunk exports wO as QueuedMessageBar (the overlay\'s pick)', features: ['wO as QueuedMessageBar'] },
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
      if (pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, export: alias, declarationSha256, pinned: true });
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
    if (ADAPTER_PINS[key] !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${ADAPTER_PINS[key]}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, previous: spec.old, declarationSha256, pinned: true });
  }
  return out;
}

// Each raw call-site feature occurs exactly once in its official chunk (the check runSlicer applies at generation).
export async function assertRawCallSites() {
  const out = [];
  for (const site of RAW_CALL_SITES) {
    const bytes = await fs.readFile(path.join(official.ionSource, site.source));
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = text.split(feature).length - 1;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    out.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), features: site.features });
  }
  return out;
}

// The host adapter module re-exports exactly the adapted names, each from the host adapter that documents it.
export async function assertAdapterModule() {
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
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the queued-bar-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

// Every pending root still waits: each need is still unmet in the real tree (a met need stops the run).
export async function assertPending() {
  const core = JSON.parse(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'), 'utf8'));
  const published = new Set(Object.values(core.publicNames).map(v => `${v.file}#${v.local}`));
  const held = new Set(core.modules.flatMap(mod => (mod.bindings ?? []).map(b => `${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`)));
  const out = [];
  for (const [key, p] of Object.entries(PENDING_ROOTS)) {
    const needs = [];
    for (const need of p.needs) {
      if (published.has(need.binding)) throw Error(`${key} (${p.name}): cds-core now publishes ${need.binding}; re-probe and move the root back`);
      if (need.kind === 'cds-core-publicName') {
        if (!held.has(need.binding)) throw Error(`${key} (${p.name}): cds-core no longer holds ${need.binding}; review the pending root`);
        needs.push({ ...need, state: 'held by cds-core without a publicName' });
      } else {
        const m = JSON.parse(await fs.readFile(path.join(generatedRoot, need.area, 'manifest.json'), 'utf8'));
        const [file, local] = need.binding.split('#');
        const mod = m.modules.find(x => typeof x.source === 'string' && path.basename(x.source) === file && (x.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === local));
        if (!mod) throw Error(`${key} (${p.name}): ${need.area} no longer slices ${need.binding}; review the pending root`);
        if (mod.exports?.[local] || mod.linkExports?.includes(local) || mod.sharedExports?.includes(local))
          throw Error(`${key} (${p.name}): ${need.area} now exports ${need.binding}; re-probe and move the root back`);
        needs.push({ ...need, state: `sliced by ${need.area}/${mod.target} without an export` });
      }
    }
    out.push({ root: key, name: p.name, needs });
  }
  return out;
}

export function queuedBarV4Config() {
  return {
    name: 'queued bar (4.16336.0)', generator: 'extract-queued-bar-v4.mjs', output: path.join(root, QUEUED_BAR_V4_OUTPUT),
    adapterModule: '../../source-queued-bar-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules: modules(), rawCallSites: RAW_CALL_SITES, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official,
    linkedAreas: LINKED_AREAS, referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
// The probe (round2/queued-bar/tools/probe.mjs) explores this configuration, pending root included.
export const probeConfig = queuedBarV4Config;

export async function extractQueuedBarV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const callSites = await assertRawCallSites();
  const pendingRoots = await assertPending();
  const emitted = roots.filter(r => !PENDING_ROOTS[`${r.file}#${r.local}`]);
  if (emitted.length === 0) {
    const err = Error(`queued-bar-v4 is pending, nothing to generate: ${pendingRoots.map(p => `${p.name} needs ${p.needs.map(n => `${n.binding} (${n.state})`).join(' and ')}`).join('; ')}`);
    err.pending = { cdsCore, roots, adapters, callSites, pendingRoots };
    throw err;
  }
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...queuedBarV4Config(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the queued-bar roots (${official.referenceVersion}); generated by extract-queued-bar-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.keys(rs).map(l => rs[l].name).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-queued-bar-v4.mjs',
          previous: { generator: 'scripts/extract-queued-bar.mjs', output: 'src/generated/queued-bar', referenceVersion: official.previousVersion,
            roots: { QueuedMessageBar: 'cf74bc599-CRYqipWN.js#VE' }, callSite: 'cc43287c9-Me-M2ucD.js#epe' },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, pendingRoots, adapters, linkedCopies, callSites, dndKit: DND_KIT,
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
    for (const c of await assertRawCallSites()) console.log('call site', c.source, c.features.length, 'features, each once');
    for (const p of await assertPending()) console.log('pending', p.root, p.name, p.needs.map(n => `${n.binding}: ${n.state}`).join(' | '));
  } else {
    try {
      await extractQueuedBarV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
    } catch (e) {
      if (!e.pending) throw e;
      console.error(e.message);
      process.exitCode = 3;
    }
  }
}
