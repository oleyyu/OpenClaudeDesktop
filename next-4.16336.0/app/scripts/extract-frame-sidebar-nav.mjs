// Production generator of the sidebar nav body (OpenClaude v0.3 → Claude Desktop 4.16336.0; surfaces-prod-3 sidebar lane,
// plan analysis/claude-4.16336.0-migrate-20261104/surfaces-prod-3/nav-plan/{plan.json,plans/p4.json,generator-draft.mjs}).
// Slices, with runSlicer (scripts/extract-working-line.mjs) and the cds-core shared graph (sharedGraph 'cds-core', wave 6
// owner c4b6979f…), the official SidebarNavBody: shared-22 PI — the body KR draws between the titlebar and the account tray
// (frame-sidebar's `SidebarNavBody` boundary). That is: the New row (shared-57 Ek, .df-new-circle), the Search ⌘K row (shared-21
// rj), the destination list (shared-57 Ok / rb over shared-21 qN and the HN table: Artifacts / Scheduled / Customize in Code,
// Projects / Artifacts / Scheduled / Design / Customize in Chat), the session lists (LI → RI code feed / zI chat feed → HI →
// KF / ZF section headers → rows), and their menus, hover cards and dialogs.
//
// Child surfaces, desktop services and app-root seams stop at `boundaries`: each official declaration (chunk#local) becomes
// a named host capability of src/frame-sidebar-nav-adapter.mjs (written here, deterministic; --check compares it), answered
// by src/frame-sidebar-nav-host.jsx (installFrameSidebarNavHost). Kinds as in scripts/extract-frame-sidebar-v4.mjs, plus:
//   reuse   a frame-sidebar boundary this closure reaches too: re-exported from src/frame-sidebar-adapter.mjs (one answer,
//           frame-sidebar-host.jsx), so a store (frameStore) or a gate is one instance for the frame and its nav body.
//   absent  a module-level desktop bridge (globalThis["claude.web" | "claude.settings"].X) the host does not carry: the
//           adapter exports undefined, which is the official no-bridge value of `globalThis[…]?.X`.
//   link    a binding another generated area slices and exports (one instance), re-exported from that module.
// D1 (one instance of module state): bindings other graphs hold are linked (`linkedAreas`): cds-core publicNames (wave 6
// published the 210 nav requests and the vendor-query notify / focus / online managers + QueryObserver), frame-sidebar (its
// linkExports for this graph), files-changes-v4 file-browser-query (TanStack Query QueryClientContext and providers),
// code-current-v4 (sidebar contexts), working-line-v4 (vendor-motion contexts), code-routines-v4 (shared-2 wH),
// cowork-scheduled-v4 (shared-26 wI), settings-nav (the settings dialog store), cowork-progress-v4 (shared-9 OT / DT). Pure bindings those modules slice without an
// export are sliced again here (`linkedCopies`, scripts/frame-sidebar-nav-links.json, each checked pure by d1-lib classify).
//
// Pins (scripts/frame-sidebar-nav.pins.json, written once by --pin-init, then reviewed): the snapshot chunk sha256 of every
// listed module, the root's and every boundary's declaration sha256 (+ head line), the cds-core manifest + adapter sha256.
//
//   node --max-old-space-size=6144 scripts/extract-frame-sidebar-nav.mjs [--check | --dry-run | --pin-init]
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import * as official from './official-4.16336.0.mjs';
import { boundaries as frameBoundaries } from './extract-frame-sidebar-v4.mjs';

const app = path.resolve(import.meta.dirname, '..');
const sha = b => createHash('sha256').update(b).digest('hex');
export const generatedRoot = path.join(app, 'src/generated');
export const output = path.join(generatedRoot, 'frame-sidebar-nav');
export const adapterPath = path.join(app, 'src/frame-sidebar-nav-adapter.mjs');
export const pinsPath = path.join(import.meta.dirname, 'frame-sidebar-nav.pins.json');
export const linksPath = path.join(import.meta.dirname, 'frame-sidebar-nav-links.json');
const cdsCoreAdapterPath = path.join(app, 'src/cds-core-adapter.mjs');
export const S22 = 'shared-22-BACJUrcb.js', S21 = 'shared-21-CuohtEoj.js', S0 = 'shared-0-CnnWnVrT.js', S25 = 'shared-25-D-aF0gt9.js';

export const roots = [
  { semantic: 'SidebarNavBody', file: S22, local: 'PI', export: null,
    features: ['coworkChecklistMounted: t,', 'codeSessionListChrome: n,', 'classicSearchRow: r,', 'sectionTabStops: xe,', 'scrollResetKey: a,', 'searchInRecentsHeader: K.recentsHeaderIcon,'] },
  // round-4 addendum B (W8A-6): shared-22 bB, the effect the official frame root vB mounts (`useEffect(bB, [])`), boots the
  // stores this graph holds: shared-8 ky (the local session list: LocalSessions getSessionList / onOnEvent -> bv, which cds-core
  // publishes since wave 8b), shared-123 _x (the Cowork home session events) and shared-1 o_ (the Cowork spaces). frame-sidebar
  // answers it as its frameMountResets boundary; the host answer is this sliced root (frame-sidebar-nav-body.jsx), so the session
  // store has one holder and is booted by official code (it never booted before: the Code list stayed in Loading).
  { semantic: 'frameMountResets', file: S22, local: 'bB', export: null, features: ['fd(), ai(), Bt()'] },
  // round-4 addendum C (W8C-P1; real-tree replay, R4-K1): shared-4 jk, the official PerformanceMetricsProvider (official
  // export ln; the app root index-DN24_FmB.js mounts it as vD around the whole app). Its value is what shared-4 tA
  // (usePerformanceMetrics, sliced now, no longer a boundary) returns: shared-57 Ok reads markCodeSessionOpenStart from it
  // when a session row is opened (the host answer that stood here had no such member: 'L is not a function'). The context
  // shared-4 rO is cds-core's (ctx_shared4_rO, wave 8c); this graph slices the Provider because its closure stops at this
  // graph's own boundaries (useAnalytics OT, useIsDesktopApp FH, router Ar / Y, LocalSessions qO, WindowState uO). The
  // Provider belongs above the nav body (the only subtree here that reads rO): the host mounts it there
  // (src/frame-sidebar-nav-body.jsx, round-4 sidebar porting lane).
  { semantic: 'PerformanceMetricsProvider', file: 'shared-4-C_EiQb9h.js', local: 'jk', export: 'ln',
    features: ['markCodeSessionOpenStart: on,', 'getConversationOpenTiming: cr,'] },
  // round-4 wave 8c sidebar lane (Scheduled row): shared-23 KA, the app-root effect component the official app mounts
  // unconditionally (shared-23 `b = d(KA, {})` among the root's effect children; `function KA(){return Cc(),null}`, Cc = shared-92
  // Uv, official export Iv). Uv resolves the appFeatures of the official app store (shared-92 kv = Ev, cds-core
  // store_shared92_Ev / appFeaturesStore) from the AppFeatures bridge: `Wr.getSupportedFeatures().then(t => kv.setState({
  // appFeatures: t, resolution: "answered", … }))`, with onSupportedFeaturesChanged re-reading it (Jv). The Scheduled row reads it:
  // shared-21 qN `p = t === "code" ? d.codeEnabled : …`, d = shared-31 Om(), codeEnabled = shared-4 Th() || (shared-123 fR()
  // settled and enabled), fR over lR(), whose `a = q()` is that appFeatures (null: `{loading: !0, enabled: null}` while the
  // desktop app has the bridge). Nothing resolved it in the host (runtime probe round4/wave8c/sidebar/logs/gui-probe2:
  // appFeatures null, resolution "pending", lR loading), so the row never showed. The Uv family's module state (jv, Mv, Nv, Pv,
  // Fv, Lv, zv, Bv, Vv, Kv; shared-0 w0) is held by this graph only (no other graph slices it); the host mounts KA inside the
  // nav host (src/frame-sidebar-nav-body.jsx), where the AppFeatures bridge answers main.jsx's supported features.
  { semantic: 'AppFeaturesBootstrap', file: 'shared-23-BRmsPtuN.js', local: 'KA', export: null, features: ['return (Cc(), null);'] },
  // round-4 r6 sidebar lane (R6-W8D, W8D-H1 = A): shared-20 EC (official export to), the hub_sidebar_first_look boundary the
  // official app layout mounts around the app content (shared-23 `d(Rd,{children:…})`, Rd = to). With no outer shared-123 Xu
  // (HubLookBackedContext) value it renders DC: DC asks shared-18 BL("device") for the device look (BL's inputs: the hub verdict
  // shared-123 hh / uh / Bu, which this graph already slices; the Cowork VM delivery status Ku = useContext(ku) ?? Du.status,
  // Du = cds-core hubDeliveryStatusStore, initial "unknown" and written by nothing on this host: the official unknown branch;
  // shared-25 VB through the useOptionalCurrentAccount boundary; GrowthBook through growthBookEval), ORs it with shared-123 kv
  // (appFeatures.desktopHome supported), reports it once through shared-123 nd (cds-core reportHubLook, writes Zu / Qu / $u)
  // and provides Xu / Yu / shared-1 Lq around shared-39 Pu (cds-core writer_shared39_Pu, the session-presets latch) and
  // its children. The host mounts it around the nav body (src/frame-sidebar-nav-body.jsx) in place of the direct Pu mount.
  { semantic: 'HubSidebarFirstLook', file: 'shared-20-DUEo90UF.js', local: 'EC', export: 'to',
    features: ['n === null ? v(DC, null, t) : t'] },
];

// ---- round-4 navfix (real-tree defect, round4/real-b/integration/compare.json defects.sidebarOverlayBoundary) ----------------
// The official lazy overlays (the defineLazyEntry / W$ results: `X = W$({ entry: { id, tier, load: () => n(() =>
// import("./<chunk>.js"), deps) }, pick, options })`, aliased per chunk as Y / ir / bt / ia / wi / ji / Or / en / ua) are
// objects { Component, handle, annotateOpen }, read as `X.Component` / `X.handle` (shared-55 `no(Iz.handle, c > 1, u)`,
// shared-20 `Lk = Ik.Component`). They were boundaries of kind component (a host function, no .handle: 'Cannot read
// properties of undefined (reading 'resident')' with two project groups). They are sliced now, byte for byte, with the
// factory (shared-123 W$, already sliced); each inline `load` keeps its official `import("./<chunk>.js")`:
//   - lazyChunks: the chunks the sidebar's own flows need and this graph can hold alone are shipped, each emitted under its
//     own file name with its official export names (the namespace `pick` reads), as cds-core ships its lazy chunks
//     (cds-pilot pins.dynamicImports): c1afd40ea (sidebar_project_reorder_dnd: the project group drag bindings, shared-55 Iz,
//     the `handle` two project groups read). c39a247c4 (code_sidebar_actions, the session row menu gate) and ce4f4374c
//     (code_session_menu, its items) are not: their closure is the official Code session runtime (c5da7eb42 FV), whose
//     writers other graphs already slice (round4/real-b/navfix/logs/sbx-d1/app-only-1.log: 43 shared states, 24 import
//     writes), so they wait for cds-core to publish them (navfix report cdsCoreNeeds) and stay absent below;
//   - absentChunks: every other chunk a sliced declaration imports is not shipped: runSlicer emits it under its own name as a
//     module that rejects with ChunkLoadError (the answer the host's notShipped loader gave), so the official lazy runtime
//     takes its own failure branch (fail-open overlays draw nothing; `.catch` fallbacks run).
export const lazyChunks = {
  'c1afd40ea-iiW_4vbp.js': { importer: 'shared-55-BRv2XBP7.js#Iz', exports: { E: 'ProjectReorderBindings' } },
};
// c1afd40ea's closure beyond the chunks already listed: c8104f35e (one pure sortable helper, e). dnd-kit (c09f6b4e5) is not
// entered: queued-bar-v4 is its one holder and exports what c1afd40ea reads (En, dn, linkExports), linked below.
const LAZY_CLOSURE = ['c8104f35e-D6niv4qy.js'];
export const absentChunks = {
  'cf259e6ae-CdqwnBO6.js': 'shared-140 Ka sidebar_bulk_menu (SidebarBulkMenuItems): bulk selection menu, not shipped',
  'cf736d5be-BSoxXaZR.js': 'shared-140 il project_item_move (MoveChatIntoProjectConfirmBody): chat project move dialog, not shipped',
  'cc1756a6b-Dv_q9Ygq.js': 'shared-18 VY replace_cloud_version_dialog: claude.ai cloud versions, no backend on the host',
  'c961a3a0f-BAf1beVJ.js': 'shared-18 x$ project_edit_dialog_body: claude.ai project edit, no backend on the host',
  'c18965559-C9vTWERn.js': 'shared-19 RL code_project_menu (EpitaxyProjectMenuItems): project group menu, not shipped in this pass',
  'ccd576adc-NRWrW8Wm.js': 'shared-19 UL project_report_modal: claude.ai project report, no backend on the host',
  'ca0409d7c-C0M8y8aL.js': 'shared-20 TP code_session_awaiting_body (AwaitingHoverCardBody): awaiting-session hover body, not shipped in this pass',
  'c44373cde-B2dcJvRb.js': 'shared-21 CI home_sidebar_bulk (fail-open): bulk actions host, not shipped',
  'c54fcf96d-B-hJe5G4.js': 'shared-21 vE post_upgrade_cowork_carousel (fail-open): Cowork upsell, no backend on the host',
  'c8b63a9e0-BjbrL9BG.js': 'shared-22 AA hub_row_artifact_thumb_host (fail-open): artifact thumbnails, no Artifacts backend on the host',
  'c725cc0f4-DM6N7UmN.js': 'shared-22 bI sidebar_tab_activity (fail-open): tab activity publisher, not shipped',
  'cc5b2039d-BWDtgcKk.js': 'shared-22 zA hub_doc_hover_card_body: hub document hover card, no backend on the host',
  'c6eb5f8cf-DNzkXANb.js': 'shared-55 Lx mini_compose_window: mini compose window, not shipped',
  'cb3695091-B9bpeGLK.js': 'shared-57 Jk sidebar_pinned_tail_watch / pO sidebar_new_menu_watch (fail-open): pinned apps, not shipped',
  'c6d7b6a07-DeYfXyxC.js': 'shared-57 Kk cedar_wren_row (fail-open): not shipped',
  'ca9cab9d0-eQTnLnky.js': 'shared-57 Vk opened_artifacts_fetcher (fail-open): no Artifacts backend on the host',
  'c80c23999-BqapRWB7.js': 'shared-57 Yk sidebar_pinned_tail_rows (fail-open): pinned apps, not shipped',
  'c106abbe2-CDJLsiQj.js': 'shared-57 Yx hub_routine_hover_card_body: hub routine hover card, not shipped',
  'ca5811b6a-DqM8dlb4.js': 'shared-8 Fj create_project_modal: claude.ai project creation, no backend on the host',
  // U-NAV-MENU (2026-11-12, user: skip cds-core, fix the rest first): the row's right-click / ⋯ menu read this chunk through
  // Jk (no fail-open), so its ChunkLoadError took down the whole nav ("Sidebar failed to load."). Its four exports are now
  // answered by the host (src/frame-sidebar-nav-session-actions.jsx): Gk's row actions host publishes the base menu props
  // (shared-55 MB), Jk's gate closes the official popup and opens the host's own session menu at the same place (main.jsx
  // openMenu("session"): SourceSidebarSessionMenu over sessionAction). ce4f4374c (the official items) stays absent, unread.
  'c39a247c4-BgnGWMne.js': {
    why: 'shared-20 Wk code_sidebar_actions (the session row menu gate Jk and the row actions host Gk): its closure is the official Code session runtime (c5da7eb42 FV); shipping it needs cds-core to publish the writers it reaches (round-4 navfix blocked list)',
    host: { module: '../../frame-sidebar-nav-session-actions.jsx', exports: ['CodeSessionRowActionsHost', 'CodeSidebarActionsGate', 'CodeSidebarMutationsHost', 'SessionLinkActionsHost'] },
  },
  'ce4f4374c-CpxEVAby.js': 'shared-20 Ik code_session_menu (EpitaxyCodeSessionMenuItems): the session row menu items; read under the c39a247c4 gate, not shipped with it',
};

// Every chunk the bounded closure enters (the slicer fails on an unlisted or unused chunk).
// (vendor-base-ui left the closure when shared-18 WH, the CDS useToast, became the useToast boundary.)
export const chunks = [
  official.sharedFrame, 'preload-helper-BBljBeZo.js', ...Object.keys(lazyChunks), 'rolldown-runtime-C3OYiQ02.js', official.vendorFrame, 'vendor-all-0-uUCo-eCX.js', S0,
  'vendor-zod-fszujTq6.js', 'vendor-router-Cs51FAGQ.js', S25, 'shared-62-DoCqVpIq.js', official.vendorIntl, 'shared-92-BOgyxePb.js',
  'shared-123-1Hc1RTKl.js', 'shared-153-DMw2VzSq.js', 'shared-183-B2N6Zy4J.js', 'shared-212-BHMAi0oa.js', 'shared-1-D1bGaTaN.js',
  'shared-26-B-POtn5S.js', 'shared-3-IQTrO7Gx.js', 'shared-2-CsjIBQD8.js', 'shared-5-u8kha2eH.js', 'shared-7-D2e77H6v.js',
  'shared-8-BqfCbkJd.js', 'shared-4-C_EiQb9h.js', 'shared-6-2QYRw_Wv.js', 'shared-39-ZCs0lAwB.js', 'shared-120-DCdTP1_5.js',
  'shared-9-BgdM6Y1f.js', 'shared-33-DtdykY0y.js', 'shared-12-DVKzjo12.js', 'shared-140-DfG6VwpK.js', 'shared-31-C9BqSSuD.js',
  'shared-160-DDUFdDNM.js', 'shared-100-BBQR7Gmd.js', 'shared-38-DyF0_Fim.js', 'shared-18-Cfqwgjc5.js',
  'shared-19-UalAfDtn.js', 'shared-55-BRv2XBP7.js', 'shared-styles-DLE26zl_.js', 'vendor-query-Bl2Kfzgk.js', 'shared-36-fqRFYwOb.js',
  'shared-20-DUEo90UF.js', S21, 'shared-57-grpFrBWt.js', S22, 'shared-23-BRmsPtuN.js',
  // round-4 navfix: the static closure of the three lazy chunks shipped below (lazyChunks), in file-name order.
  ...LAZY_CLOSURE,
];
// shared-25 is emitted under its own file name: shared-8 wy (the session-list load) reads `import("./shared-25-D-aF0gt9.js")
// .then((e) => e.hf).performanceMetrics` after the list arrives, so the chunk resolves with its official export hf (zh).
const targets = { [S22]: 'nav-body.mjs', [S25]: S25, ...Object.fromEntries(Object.keys(lazyChunks).map(c => [c, c])) };
const extraExports = { [S25]: { zh: 'hf' }, ...Object.fromEntries(Object.entries(lazyChunks).map(([c, l]) => [c, l.exports])) };
// round-4 addendum B (W8B-N1): bindings this graph cuts that other 4.16336.0 graphs link (D1: one copy), exported under their
// own locals. shared-57 yS / Kg (code-current-upper sidebar-filter), shared-39
// $y (the tool-request store, module state) / mb and shared-8 $_ / ev / shared-62 sp (transcript-rows-v4 Zi / ToolRow /
// UserBashRun: readers of the stores cds-core publishes since wave 8b). shared-212 Pv / Av / vv are not exported yet:
// pierre-changes-v4 holds Cp / Kl / the cc8941b7b store roots on that hold (PENDING_ROOTS unexportedLinks), and Cp also
// waits for the cds-core writers c34e6410a s / cb8c5a88f go (W8B-D8 / W8B-D9); the export lands with that root review.
const navLinkExports = {
  'shared-57-grpFrBWt.js': ['yS', 'Kg'],
  'shared-39-ZCs0lAwB.js': ['$y', 'mb'],
  'shared-8-BqfCbkJd.js': ['$_', 'ev'],
  'shared-62-DoCqVpIq.js': ['sp'],
};
export const modules = chunks.map(source => {
  const mine = roots.filter(r => r.file === source);
  const spec = { source, target: targets[source] ?? `${source.replace(/-[\w-]{8}\.js$/, '')}.mjs` };
  if (extraExports[source]) spec.exports = { ...extraExports[source] };
  if (navLinkExports[source]) spec.linkExports = [...navLinkExports[source]];
  if (mine.length) {
    spec.internal = true;
    spec.exports = { ...spec.exports, ...Object.fromEntries(mine.map(r => [r.local, r.semantic])) };
    spec.features = Object.fromEntries(mine.map(r => [r.local, r.features]));
  }
  return spec;
});

export const linkedAreas = [
  { area: 'files-changes-v4', modules: ['file-browser-query.mjs', 'menu-pending.mjs'] },
  // cds-core wave 8 (W8-M5, option B): frame-sidebar holds shared-55 OR / LR with the shared-123 / shared-120 state their closure
  // brings (complete per-chunk linkExports there); this graph links all of them.
  { area: 'frame-sidebar', modules: ['shared-212.mjs', 'shared-8.mjs', 'shared-4.mjs', 'shared-39.mjs', 'shared-18.mjs', 'shared-55.mjs', 'frame-chrome.mjs', 'shared-123.mjs', 'shared-120.mjs'] },
  { area: 'code-current-v4', modules: ['sidebar-status-glyph.mjs', 'sidebar-fade-label.mjs', 'sidebar-group-view.mjs', 'sidebar-pr-card.mjs', 'chunk-shared-6.mjs'] },
  { area: 'working-line-v4', modules: ['vendor-motion.mjs'] },
  { area: 'code-routines-v4', modules: ['shared-2-CsjIBQD8.mjs'] },
  { area: 'cowork-scheduled-v4', modules: ['shared-26-B-POtn5S.mjs'] },
  { area: 'settings-nav', modules: ['settings-store.mjs'] },
  // shared-9 OT (reads the read-only Set DT, which the D1 gate counts) is cowork-progress-v4's (exported under its local).
  { area: 'cowork-progress-v4', modules: ['shared-9.mjs'] },
  // Wave 8 (cds-integrate/wave8 W8-RT, round3 integrate-gates notFixed r3b-tasks-subtask:98): the r3b-tasks bindings this
  // closure reaches (shared-0 Tl, shared-212 j_ / M_ / yv / Cv / Dv / kv) are linked from r3b-tasks, their one 4.16336.0
  // owner (D1 survey: converge on r3b-tasks; r3b-tasks exports them, roots under their semantic names, the rest as linkExports),
  // never cut again here.
  { area: 'r3b-tasks', modules: ['lazy-value.mjs', 'invisible-character.mjs'] },
  // wave 8b (W8A-6): the frameMountResets root (shared-22 bB) starts the session list (shared-8 ky), which marks a new
  // session unread through shared-8 X_ (`G_.has(e)||q_.includes(e)||Y_.getState().markUnread(e)`). btw-pane-v4 holds the
  // shown-session registry (q_ / J_ / X_, with the local unread host) and exports X_ as markUnreadUnlessShown: linked
  // here (D1: q_ is a mutable array J_ writes; a second copy would never see the shown sessions).
  { area: 'btw-pane-v4', modules: ['shown-session.mjs'] },
  // round-4 navfix: the shipped c1afd40ea (sidebar_project_reorder_dnd) reads dnd-kit (c09f6b4e5 En / dn: DragOverlay and
  // useDndContext) and one pure sortable helper (c8104f35e e, sliced here). queued-bar-v4 is dnd-kit's one holder
  // (module state and pure code alike, tests/queued-bar-v4.test.mjs) and exports En / dn for this (DND_KIT_PURE_LINK_EXPORTS),
  // so the sidebar's project drag and the queued bar share one dnd-kit instance (D1).
  { area: 'queued-bar-v4', modules: ['c09f6b4e5.mjs'] },
];
const LINKS = JSON.parse(readFileSync(linksPath, 'utf8'));
export const linkedCopies = Object.fromEntries(Object.entries(LINKS.copies).flatMap(([area, chunks]) => Object.entries(chunks).flatMap(([chunk, names]) =>
  names.map(name => [`${chunk}#${name}`, `pure binding sliced by ${area} without an export (d1-lib classify: not state)`]))));

const frameByKey = new Map(frameBoundaries.map(b => [b.key, b]));
const reuse = (key, why) => {
  const f = frameByKey.get(key);
  if (!f) throw Error(`reuse ${key}: not a frame-sidebar boundary`);
  return { key, name: f.name, kind: 'reuse', from: 'frame-sidebar', reads: f.reads, host: `frame-sidebar-host.jsx (${why ?? f.host})` };
};
// Host boundaries (official declarations of the 4.16336.0 snapshot the slice does not copy).
export const boundaries = [
  // ---- frame-sidebar boundaries this closure reaches as well (one answer, frame-sidebar-host.jsx)
  ...[`${S0}#FH`, `${S0}#Ku`, `${S0}#uO`, 'shared-123-1Hc1RTKl.js#EV', 'shared-123-1Hc1RTKl.js#TC', 'shared-123-1Hc1RTKl.js#cf',
    'shared-123-1Hc1RTKl.js#tV', 'shared-212-BHMAi0oa.js#rk', `${S21}#o_`, `${S21}#p_`, `${S21}#t_`, `${S21}#u_`, `${S21}#uj`, `${S25}#Mo`,
    `${S25}#Z`, `${S25}#$u`, `${S25}#eV`, `${S25}#go`, `${S25}#vf`, `${S25}#vu`, 'shared-26-B-POtn5S.js#Ds', 'shared-62-DoCqVpIq.js#OT',
    'shared-6-2QYRw_Wv.js#TE', 'shared-8-BqfCbkJd.js#KS', 'shared-8-BqfCbkJd.js#XS', 'vendor-intl-BJgYK7RA.js#Gt',
    'vendor-intl-BJgYK7RA.js#q'].map(k => reuse(k)),
  // (cds-core wave 8, W8-M6: shared-92 Y frame store, shared-92 zu / Jo, shared-0 qB / LL / B and shared-25 cy / tu are held and
  // published by cds-core (official runtime: pre-init Datadog SDK, consent-closed event logging, frame store, route store); they
  // are linked, not boundaries. cds-wave8/design/plan.json classification a.)
  // ---- D1: react-intl createIntl (the IntlMessageFormat class F and its caches) is sliced by generated/chat; shared-18 jZ
  // formats an English reference copy with it: one instance, chat's export.
  { key: 'vendor-intl-BJgYK7RA.js#Ht', name: 'createIntl', kind: 'link', from: './generated/chat/vendor-intl-BJgYK7RA.js', reads: [], host: 'generated/chat (scripts/extract-chat-ui.mjs) exports Ht as createIntl' },
  // ---- app-root providers / account / configuration
  { key: `${S0}#D0`, name: 'useManagedConfig', kind: 'hook', reads: [], host: 'managed (MDM) config store answer: none on the host (settings-nav-adapter useManagedConfig answer)' },
  { key: `${S0}#y4`, name: 'useConfiguration', kind: 'hook', reads: ['applicationType', 'bootstrapApiPrefix'], host: 'ConfigurationProvider value of the desktop app (official app root)' },
  // cds-core wave 8 (W8-M6, classification b): shared-62 Qk useServedDeploymentConfig, the served deployment config org API query.
  // Slicing it pulls the vendor-query QueryClient (QueryClient / Z owner decided in wave 9); one host answer, the official
  // no-organization branch (LO: asks = oe() && !!org uuid = false -> served undefined), the same answer as cowork-scheduled-v4.
  { key: 'shared-62-DoCqVpIq.js#Qk', name: 'useServedDeploymentConfig', kind: 'hook', reads: [], host: 'official no-organization branch (shared-62 LO asks=false): undefined (source-routine-cowork-adapters.jsx useServedDeploymentConfig)' },
  { key: `${S25}#VB`, name: 'useOptionalCurrentAccount', kind: 'hook', reads: ['account', 'activeOrganization'], host: 'the local account model (same answer as frame-sidebar useCurrentAccount)' },
  { key: 'shared-62-DoCqVpIq.js#rP', name: 'useErrors', kind: 'hook', reads: ['addError', 'addSuccess'], host: 'host toasts' },
  // The CDS toast hook (shared-18 WH over Base UI's toast manager vendor-base-ui Cn and the CDS toast context FH): the app root's
  // Toast.Provider is the host's (source-toast.jsx), so the nav's toasts (pin / unpin notices) go to the host store.
  { key: 'shared-18-Cfqwgjc5.js#WH', name: 'useToast', kind: 'hook', reads: ['add', 'close'], host: 'host toasts (source-toast.jsx store: add({ title, description, action, variant }) / close(id))' },
  // (round-4 addendum C, W8C-P1: shared-4 tA usePerformanceMetrics is sliced, reading the value of the official
  // PerformanceMetricsProvider root above; was: { key: 'shared-4-C_EiQb9h.js#tA', name: 'usePerformanceMetrics', kind: 'hook',
  // reads: [], host: 'gap: PerformanceMetricsProvider value (host has no metrics): the official no-op shape' })
  { key: 'shared-100-BBQR7Gmd.js#Xn', name: 'useCommandPaletteToggleContext', kind: 'hook', reads: [], host: 'host search palette: main.jsx showSearch / setShowSearch (the Search ⌘K row opens it)' },
  { key: 'shared-33-DtdykY0y.js#EA', name: 'useNux', kind: 'hook', reads: [], host: 'gate: no NUX on the host (official not-eligible answer)' },
  { key: 'shared-1-D1bGaTaN.js#C6', name: 'useShortcut', kind: 'hook', reads: ['id'], host: 'host shortcut table (main.jsx key handling)' },
  { key: 'shared-1-D1bGaTaN.js#MP', name: 'useIncognitoMode', kind: 'hook', reads: ['incognitoModeEnabled', 'setIncognitoModeEnabled'], host: 'host incognito (chat-incognito-model.mjs)' },
  { key: 'shared-7-D2e77H6v.js#zg', name: 'useHomeEffectiveErrorCategory', kind: 'hook', reads: [], host: 'host home error category (none: null)' },
  { key: 'shared-2-CsjIBQD8.js#WH', name: 'markHomeSessionUnread', kind: 'hook', reads: ['sessionId'], host: 'host unread model (main.jsx sessionMetadata unread)' },
  { key: 'shared-123-1Hc1RTKl.js#v$', name: 'useDialogPreloadProps', kind: 'hook', reads: [], host: 'host dialogs are bundled: the official no-preload handler set' },
  { key: 'shared-140-DfG6VwpK.js#pd', name: 'EmojiShortcodeField', kind: 'component', reads: ['value', 'onChange'], host: 'host text field (rename / project name inputs)' },
  { key: 'shared-26-B-POtn5S.js#hp', name: 'dynamicImport', kind: 'hook', reads: ['load'], host: 'lazy official chunks are not shipped: the official pending state' },
  { key: 'shared-31-C9BqSSuD.js#cO', name: 'ExperiencePlacement', kind: 'component', reads: [], host: 'gate off: no experience placements on the host (renders nothing)' },
  { key: 'shared-8-BqfCbkJd.js#Rj', name: 'NewProjectDialog', kind: 'component', reads: ['open', 'onOpenChange'], host: 'host new-project dialog (main.jsx onCreateGroup / openLocalProject)' },
  { key: 'shared-39-ZCs0lAwB.js#dk', name: 'DeleteConversationsDialog', kind: 'component', reads: ['open', 'onOpenChange'], host: 'host SourceConfirmDialog (main.jsx requestSessionDelete)' },
  // ---- GrowthBook (host-growthbook.mjs HOST_GROWTHBOOK, the one answer table)
  { key: `${S25}#io`, name: 'growthBookEval', kind: 'hook', reads: ['flag key'], host: 'HOST_GROWTHBOOK' },
  { key: `${S25}#ro`, name: 'useGrowthBookClient', kind: 'hook', reads: [], host: 'no GrowthBook client: null' },
  { key: `${S25}#ko`, name: 'useFeatureIsOn', kind: 'hook', reads: ['flag key'], host: 'HOST_GROWTHBOOK on' },
  { key: `${S25}#Jo`, name: 'useGrowthBookFeatureOn', kind: 'hook', reads: ['flag key'], host: 'HOST_GROWTHBOOK on' },
  { key: `${S25}#Go`, name: 'useGrowthBookFeatureValue', kind: 'hook', reads: ['flag key', 'fallback'], host: 'HOST_GROWTHBOOK value, else the fallback' },
  { key: 'vendor-flags-BSWGVdqu.js#Ht', name: 'useGrowthBook', kind: 'hook', reads: [], host: 'no GrowthBook client: undefined' },
  // ---- network seam (official custom-3p stub semantics: un-stubbed paths answer 503 custom_3p_not_available)
  { key: `${S0}#O9`, name: 'useApiFetcher', kind: 'hook', reads: [], host: 'host API router (src/frame-sidebar-nav-api.mjs)' },
  { key: `${S0}#n3`, name: 'fetchAsDocumentAccount', kind: 'hook', reads: [], host: 'host API router' },
  { key: 'shared-92-BOgyxePb.js#N$', name: 'readEventStream', kind: 'hook', reads: [], host: 'host API router (no streams)' },
  { key: `${S0}#y6`, name: 'recordApiEndpointSeen', kind: 'hook', reads: [], host: 'gap: request statistics' },
  // ---- desktop bridges (globalThis["claude.web" | "claude.settings"].X)
  { key: `${S0}#qO`, name: 'LocalSessions', kind: 'bridge', reads: ['beginTearOffHalo', 'checkRemoteTargetTrust', 'detachFromParent', 'endTearOffHalo', 'forkSession', 'getAll', 'getGitInfo', 'getRemoteGitInfo', 'getSSHConfigs', 'getSSHGitInfo', 'getSession', 'getSessionList', 'listCliSessions', 'listSSHDirectory', 'listWslDistros', 'loadArchivedSessions', 'onOnEvent', 'personOpenedSession', 'reportSessionListLoad', 'resolveSSHSettings', 'resumeCliSession', 'setTearOffHalo', 'shareSession', 'testSSHConnection'], host: 'OpenClaude Code sessions in the official LocalSessionManager shape; members the host lacks read undefined' },
  // (U-NAV-MENU 2026-11-12: + getSession / onOnEvent / loadArchivedSessions, read by shared-8 (ky `ut?.onOnEvent && ut.onOnEvent(…)`,
  // cy getSession, the archived pass). Without onOnEvent the store never subscribed: the bridge's session_updated / archived /
  // initialized events had no listener, so a rename, pin, archive or delete never reached the Code list until a relaunch.)
  // (wave 8c sidebar lane: + getAllScheduledTasks / updateScheduledTask, the list and edit the closure reads through the bridge it
  // hands to cds-core shared-31 Qf (`o = !!t?.getAllScheduledTasks`: canList) — shared-57 Xy hasCodeRoutines, which pins the
  // Scheduled row (shared-57 rb: `b ? Su : Su without "scheduled"`). The host scheduler has both (code-routine-model.mjs
  // createCodeRoutinesBridge over local-routines); getScheduledTask / getScheduledTaskFileContent / ackEvent / releaseDispatchClaim
  // it does not have stay absent members.)
  { key: `${S0}#tk`, name: 'CCDScheduledTasks', kind: 'bridge', reads: ['ackEvent', 'createScheduledTask', 'getAllScheduledTasks', 'onOnScheduledTaskEvent', 'releaseDispatchClaim', 'updateScheduledTask', 'updateScheduledTaskStatus'], host: 'OpenClaude routines scheduler (the app-level local-routines bridge of source-sidebar-routines.jsx connectSidebarRoutines)' },
  { key: `${S25}#Bi`, name: 'AppPreferences', kind: 'bridge', reads: ['getPreferences', 'onPreferencesChanged', 'setPreference'], host: 'host preferences' },
  // (wave 8c sidebar lane: + onSupportedFeaturesChanged, read by shared-92 Uv `Wr.onSupportedFeaturesChanged?.(Jv)`, root AppFeaturesBootstrap.)
  { key: `${S25}#Vi`, name: 'AppFeatures', kind: 'bridge', reads: ['getSupportedFeatures', 'onSupportedFeaturesChanged'], host: 'host-app-features getSupportedFeatures; onSupportedFeaturesChanged when main.jsx\'s answer changes (core connect)' },
  { key: `${S0}#kO`, name: 'LocalAgentModeSessions', kind: 'absent', reads: [], host: 'no Cowork agent-mode sessions bridge on the host' },
  { key: 'shared-1-D1bGaTaN.js#Rm', name: 'LocalAgentModeSessionsStatus', kind: 'absent', reads: [], host: 'same bridge as shared-0 kO: absent' },
  { key: `${S0}#ek`, name: 'CoworkScheduledTasks', kind: 'absent', reads: [], host: 'absent' },
  { key: `${S0}#PO`, name: 'CoworkSpaces', kind: 'absent', reads: [], host: 'absent (no spaces locally)' },
  { key: `${S0}#yO`, name: 'CoworkArtifacts', kind: 'absent', reads: [], host: 'absent in this pass (host artifact library is not an official CoworkArtifacts bridge yet)' },
  { key: `${S0}#xO`, name: 'ClaudeCode', kind: 'absent', reads: [], host: 'absent' },
  { key: `${S0}#LO`, name: 'DeviceRegistry', kind: 'absent', reads: [], host: 'absent (no device keys)' },
  { key: `${S0}#HO`, name: 'ForgeState', kind: 'absent', reads: [], host: 'absent' },
  { key: `${S0}#GO`, name: 'Launch', kind: 'absent', reads: [], host: 'absent (no remote previews)' },
  { key: `${S25}#Ri`, name: 'Extensions', kind: 'absent', reads: [], host: 'absent' },
  // ---- routing
  { key: 'vendor-router-Cs51FAGQ.js#Ar', name: 'useRouterState', kind: 'hook', reads: ['select'], host: 'host route model (mode / section / current → official pathname)' },
  { key: 'vendor-router-Cs51FAGQ.js#Y', name: 'useTanStackRouter', kind: 'hook', reads: ['navigate'], host: 'host route model: navigate → main.jsx navigation' },
  { key: `${S25}#rd`, name: 'useRoutePathnameSelector', kind: 'hook', reads: ['selector'], host: 'selector over the host route pathname' },
  // ---- lazily loaded official chunks (`import("./<chunk>.js")` inside the declaration). They are not shipped in this pass
  // (each would be a module emitted under its own file name): the declaration is a boundary. Lazy components draw nothing
  // (the official no-ui / fail-open state of a chunk that does not arrive); lazy entries keep their official static fields
  // and hand `load` to the host; lazy handles and loader functions are host answers that never load the chunk.
  // (round-4 navfix: the lazy overlays — W$ results — and shared-20 Wk are no longer boundaries: see lazyChunks above.)
  { key: 'shared-140-DfG6VwpK.js#Po', name: 'LazyArtifactMenuEntry', kind: 'lazyEntry', entry: {"id": "artifact_menu", "tier": "T1", "priority": 37}, reads: ['load'], host: 'lazy entry of ce9de3a9d-NLJ9Zm1x.js (not shipped): official static fields, load answered by the host (rejects)' },
  { key: 'shared-140-DfG6VwpK.js#ju', name: 'LazyMajesticStarlightBody', kind: 'hook', reads: [], host: 'loads cb737d250-DafuD3s7.js (not shipped): the host answer rejects / reports unavailable' },
  { key: 'shared-18-Cfqwgjc5.js#$L', name: 'LazyCoworkSessionMachinery', kind: 'bridge', reads: ['warm', 'preload', 'moduleForRender', 'lastOutcome'], host: 'lazy handle over c21f11e6d-Cyj5xu_D.js (not shipped): the host handle never loads (warm resolves, moduleForRender null)' },
  { key: 'shared-19-UalAfDtn.js#aL', name: 'LazyEpitaxyProjectConfigDialog', kind: 'component', reads: [], host: 'lazy component of c57eefbba-C9AT53Bo.js (not shipped): the host draws nothing (official no-ui / fail-open state)' },
  { key: 'shared-19-UalAfDtn.js#bj', name: 'LazyCodeSidebarLiveEntry', kind: 'lazyEntry', entry: {"id": "code_sidebar_live", "tier": "T1", "priority": 30, "largeClosure": true}, reads: ['load'], host: 'lazy entry of c8e5af2c6-BTZs_rO4.js (not shipped): official static fields, load answered by the host (rejects)' },
  { key: 'shared-19-UalAfDtn.js#hL', name: 'LazyEpitaxyProjectMembersDialog', kind: 'component', reads: [], host: 'lazy component of cdde15b7f-BHM0jk4P.js (not shipped): the host draws nothing (official no-ui / fail-open state)' },
  { key: 'shared-2-CsjIBQD8.js#WV', name: 'LazyRememberedDesktopLists', kind: 'hook', reads: [], host: 'loads c9e36f8fc-DnkAHUJg.js (not shipped): the host answer rejects / reports unavailable' },
  { key: 'shared-2-CsjIBQD8.js#Xk', name: 'LazyChunkC8ac3d4f', kind: 'hook', reads: [], host: 'loads c8ac3d4fb-BjETPLhv.js (not shipped): the host answer rejects / reports unavailable' },
  { key: 'shared-2-CsjIBQD8.js#hH', name: 'LazyServedCoworkRecents', kind: 'bridge', reads: ['warm', 'preload', 'moduleForRender', 'lastOutcome'], host: 'lazy handle over c563fadbe-BcxKA6Zr.js (not shipped): the host handle never loads (warm resolves, moduleForRender null)' },
  { key: 'shared-2-CsjIBQD8.js#oA', name: 'signedTriggerEdit', kind: 'hook', reads: [], host: 'loads cc6b8c296-Dkj9v7K_.js (not shipped): the host answer rejects / reports unavailable' },
  { key: 'shared-20-DUEo90UF.js#$I', name: 'LazyProjectRcSessionJoin', kind: 'bridge', reads: ['warm', 'preload', 'moduleForRender', 'lastOutcome'], host: 'lazy handle over c1b309ca9-dEGFj6Kd.js (not shipped): the host handle never loads (warm resolves, moduleForRender null)' },
  { key: 'shared-20-DUEo90UF.js#AN', name: 'LazyEpitaxyApprovalFileChangeEntry', kind: 'lazyEntry', entry: {"id": "epitaxy_approval_file_change", "tier": "T3"}, reads: ['load'], host: 'lazy entry of cd98a1763-Ce1J4L54.js (not shipped): official static fields, load answered by the host (rejects)' },
  { key: 'shared-20-DUEo90UF.js#CP', name: 'LazySessionSummaryTooltipBody', kind: 'component', reads: [], host: 'lazy component of c009a87a0-BFeVXxv5.js (not shipped): the host draws nothing (official no-ui / fail-open state)' },
  { key: 'shared-20-DUEo90UF.js#_w', name: 'loadCommandPaletteChunk', kind: 'hook', reads: [], host: 'loads c2771e1f6-C6HBg7qi.js (not shipped): the host answer rejects / reports unavailable' },
  { key: 'shared-21-CuohtEoj.js#LI', name: 'LazyCodeSidebarEnvironmentDialog', kind: 'hook', reads: [], host: 'loads cd0cf5b5e-DJvJrkr3.js (not shipped): the host answer rejects / reports unavailable' },
  { key: 'shared-22-BACJUrcb.js#KM', name: 'LazyConnectorOnboardingTryRow', kind: 'component', reads: [], host: 'lazy component of c05f4ee66-BQBIAaRe.js (not shipped): the host draws nothing (official no-ui / fail-open state)' },
  { key: 'shared-22-BACJUrcb.js#WM', name: 'LazySidebarRow', kind: 'component', reads: [], host: 'lazy component of c5b31ad2b-D-lsE8Q5.js, c5d43bcf6-zNkmtlAt.js (not shipped): the host draws nothing (official no-ui / fail-open state)' },
  { key: 'shared-22-BACJUrcb.js#cD', name: 'LazyCodeSidebarFolderPreset', kind: 'hook', reads: [], host: 'loads ce9cbd45f-HdtiW-2D.js (not shipped): the host answer rejects / reports unavailable' },
  { key: 'shared-26-B-POtn5S.js#Aq', name: 'postConversationMessage', kind: 'hook', reads: [], host: 'loads c85e3e3ef-BruM7jN5.js (not shipped): the host answer rejects / reports unavailable' },
  { key: 'shared-26-B-POtn5S.js#Q', name: 'apiRequest', kind: 'hook', reads: [], host: 'loads c85e3e3ef-BruM7jN5.js (not shipped): the host answer rejects / reports unavailable' },
  { key: 'shared-31-C9BqSSuD.js#lm', name: 'listServedRoutineRuns', kind: 'hook', reads: [], host: 'loads c2c8f5e4a-pR_Av4sT.js (not shipped): the host answer rejects / reports unavailable' },
  { key: 'shared-31-C9BqSSuD.js#rc', name: 'LazyCodeSessionViewEntry', kind: 'lazyEntry', entry: {"id": "code_session_view", "tier": "T2", "onUnrecoverable": "reload", "largeClosure": true}, reads: ['load'], host: 'lazy entry of cf74bc599-BytvntCE.js (not shipped): official static fields, load answered by the host (rejects)' },
  { key: 'shared-31-C9BqSSuD.js#rp', name: 'loadTriggerSigningChunk', kind: 'hook', reads: [], host: 'loads cc6b8c296-Dkj9v7K_.js (not shipped): the host answer rejects / reports unavailable' },
  { key: 'shared-39-ZCs0lAwB.js#su', name: 'loadEnvironmentDialogChunk', kind: 'hook', reads: [], host: 'loads cd0cf5b5e-DJvJrkr3.js (not shipped): the host answer rejects / reports unavailable' },
  { key: 'shared-5-u8kha2eH.js#dF', name: 'LazyProjectLimitUpsellModal', kind: 'component', reads: [], host: 'lazy component of ca3e55b0e-Pim00Ozf.js (not shipped): the host draws nothing (official no-ui / fail-open state)' },
  { key: 'shared-55-BRv2XBP7.js#P_', name: 'LazyCustomizeMergedPageCoachmark', kind: 'component', reads: [], host: 'lazy component of c457887ec-qdlzHYbF.js (not shipped): the host draws nothing (official no-ui / fail-open state)' },
  { key: 'shared-57-grpFrBWt.js#DD', name: 'LazySidebarEditEntry', kind: 'lazyEntry', entry: {"id": "sidebar_edit", "tier": "T2"}, reads: ['load'], host: 'lazy entry of cbba7a0df-D9-WAHtp.js (not shipped): official static fields, load answered by the host (rejects)' },
  { key: 'shared-57-grpFrBWt.js#EO', name: 'LazyProjectsNavNuxCoachmark', kind: 'component', reads: [], host: 'lazy component of cfd89545f-B2FaZ_Yp.js (not shipped): the host draws nothing (official no-ui / fail-open state)' },
  { key: 'shared-57-grpFrBWt.js#Uk', name: 'LazySidebarBulkSelectTip', kind: 'component', reads: [], host: 'lazy component of cd6a16eac-BSz1dpr-.js (not shipped): the host draws nothing (official no-ui / fail-open state)' },
  { key: 'shared-57-grpFrBWt.js#dy', name: 'LazySidebarPopover', kind: 'component', reads: [], host: 'lazy component of c0bf7ac9d-vLwLjLTW.js (not shipped): the host draws nothing (official no-ui / fail-open state)' },
  { key: 'shared-57-grpFrBWt.js#mO', name: 'LazySidebarNewMenuRowsEntry', kind: 'lazyEntry', entry: {"id": "sidebar_new_menu_rows", "tier": "T2"}, reads: ['load'], host: 'lazy entry of c3ca931fa-Caaf-isS.js (not shipped): official static fields, load answered by the host (rejects)' },
  { key: 'shared-8-BqfCbkJd.js#Cj', name: 'LazyProjectTags', kind: 'hook', reads: [], host: 'loads ccecd5bde-DBK1PGru.js (not shipped): the host answer rejects / reports unavailable' },
  { key: 'shared-8-BqfCbkJd.js#NJ', name: 'LazyEpitaxyCreateProjectDialog', kind: 'component', reads: [], host: 'lazy component of cf0b6cdd1-CRYUSqLn.js (not shipped): the host draws nothing (official no-ui / fail-open state)' },
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
    name: 'frame-sidebar-nav 4.16336.0', generator: 'extract-frame-sidebar-nav.mjs',
    sourceContract: official, referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
    source: official.ionSource, vendor: { [official.vendorFrame]: official.reactAliases },
    generatedRoot, output,
    adapterModule: '../../frame-sidebar-nav-adapter.mjs', adapterFile: 'src/frame-sidebar-nav-adapter.mjs',
    adapters: {}, localAdapters: localAdapters(pins), sharedGraph: 'cds-core', linkedAreas, linkedCopies, modules, absentChunks,
    // round-4 addendum C (W8C-P1): the PerformanceMetricsProvider closure reads it behind a typeof guard (shared-4 yE:
    // `typeof PerformanceObserver<"u"&&…&&typeof PerformanceEventTiming<"u"&&"interactionId"in PerformanceEventTiming.prototype`,
    // the Event Timing support probe; same global and reason as the cds-core wave-8 extraGlobals entry for vendor-datadog).
    extraGlobals: { PerformanceEventTiming: 'shared-4 yE Event Timing support probe of the PerformanceMetricsProvider closure (typeof-guarded)' },
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
  }
  if (Object.keys(pins.roots).length !== roots.length) throw Error('pins list a root the generator no longer has');
  for (const b of boundaries) {
    const p = pins.boundaries[b.key];
    if (!p || p.name !== b.name || p.kind !== b.kind) throw Error(`boundary ${b.key} differs from the pins`);
    const [f, l] = b.key.split('#'); await check(f, l, p.declarationSha256, `boundary ${b.name}`);
  }
  if (Object.keys(pins.boundaries).length !== boundaries.length) throw Error('pins list a boundary the generator no longer has');
  // round-4 navfix: the shipped lazy chunks (pins.dynamicImports, as cds-pilot pins.dynamicImports: importer declaration,
  // specifier, official export names) and the not-shipped ones (pins.absentChunks: chunk sha256).
  const dyn = pins.dynamicImports ?? [];
  if (JSON.stringify(dyn.map(d => d.specifier.slice(2)).sort()) !== JSON.stringify(Object.keys(lazyChunks).sort())) throw Error('pins.dynamicImports differ from lazyChunks');
  for (const d of dyn) {
    const chunk = d.specifier.slice(2), want = lazyChunks[chunk];
    if (`${d.importer}#${d.local}` !== want.importer) throw Error(`pins.dynamicImports ${chunk}: importer ${d.importer}#${d.local}, expected ${want.importer}`);
    if (JSON.stringify(Object.entries(d.exports).map(([n, l]) => [l, n]).sort()) !== JSON.stringify(Object.entries(want.exports).sort())) throw Error(`pins.dynamicImports ${chunk}: exports differ`);
    if (sha(await fs.readFile(path.join(official.ionSource, chunk))) !== d.sha256) throw Error(`${chunk} drifted from pins.dynamicImports`);
    const src = await readSource(chunk, cache, official.ionSource);
    for (const [name, local] of Object.entries(d.exports)) if (src.exported.get(name) !== local) throw Error(`${chunk}: export ${name} is not ${local}`);
    const [f, l] = want.importer.split('#'), imp = await readSource(f, cache, official.ionSource), e = imp.top.get(l);
    if (!e || imp.code.slice(e.node.start, e.node.end).split(`import("${d.specifier}")`).length !== 2) throw Error(`${want.importer} does not import ${d.specifier} once`);
  }
  if (JSON.stringify(Object.keys(pins.absentChunks ?? {}).sort()) !== JSON.stringify(Object.keys(absentChunks).sort())) throw Error('pins.absentChunks differ from absentChunks');
  for (const [chunk, want] of Object.entries(pins.absentChunks)) if (sha(await fs.readFile(path.join(official.ionSource, chunk))) !== want) throw Error(`${chunk} drifted from pins.absentChunks`);
  if (sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))) !== pins.cdsCore.manifestSha256) throw Error('src/generated/cds-core/manifest.json differs from pins.cdsCore (cds-core changed: re-run and re-pin after review)');
  if (sha(await fs.readFile(cdsCoreAdapterPath)) !== pins.cdsCore.adapterSha256) throw Error('src/cds-core-adapter.mjs differs from pins.cdsCore');
}

// The host adapter: framework identity (one React, the host's) and one dispatch export per boundary. Host capabilities come
// from installFrameSidebarNavHost(table); a missing one throws at use.
export function adapterSource() {
  const names = new Set();
  for (const b of boundaries) { if (names.has(b.name)) throw Error(`boundary name ${b.name} is used twice`); names.add(b.name); }
  const lines = [
    '// Generated by scripts/extract-frame-sidebar-nav.mjs from its boundaries; edit those, never this file.',
    '// Framework identity: the host React / JSX runtime / ReactDOM (one instance, shared with cds-core-adapter.mjs).',
    "import * as React from 'react';", "import * as JSX from 'react/jsx-runtime';", "import * as ReactDOM from 'react-dom';",
    'export function loadHostReact() { return React; }', 'export const hostJsxRuntime = JSX;', 'export const hostReactDom = ReactDOM;',
    'let host = null;',
    'export function installFrameSidebarNavHost(table) { host = table; }',
    'export function frameSidebarNavHost() { return host; }',
    'function cap(name) {',
    '  if (!host || !Object.hasOwn(host, name)) throw Error(`frame-sidebar-nav host capability ${name} is not provided (scripts/extract-frame-sidebar-nav.mjs boundaries)`);',
    '  return host[name];',
    '}',
  ];
  for (const b of boundaries) {
    const where = `${b.key} (${b.kind})`, n = JSON.stringify(b.name);
    if (b.kind === 'reuse') lines.push(`export { ${b.name} } from './frame-sidebar-adapter.mjs'; // ${where}: the frame-sidebar host answer`);
    else if (b.kind === 'link') lines.push(`export { ${b.name} } from '${b.from}'; // ${where}: one instance (D1)`);
    else if (b.kind === 'lazyEntry')
      lines.push(`export const ${b.name} = Object.freeze({ ...${JSON.stringify(b.entry)}, load: (...a) => cap(${n})(...a) }); // ${where}: official static fields, the host loads`);
    else if (b.kind === 'absent') lines.push(`export const ${b.name} = undefined; // ${where}: the official absent-bridge value`);
    else if (b.kind === 'component')
      lines.push(`export function ${b.name}(props) { return React.createElement(cap(${n}), props); } // ${where}`);
    else if (b.kind === 'store')
      lines.push(`export const ${b.name} = Object.assign((...args) => cap(${n})(...args), { getState: () => cap(${n}).getState(), setState: (...a) => cap(${n}).setState(...a), subscribe: (...a) => cap(${n}).subscribe(...a) }); // ${where}`);
    else if (b.kind === 'bridge')
      lines.push(`export const ${b.name} = Object.freeze({ ${b.reads.map(m => `get ${m}() { return cap(${n})[${JSON.stringify(m)}]; }`).join(', ')} }); // ${where}`);
    else if (b.kind === 'hook' || b.kind === 'effect' || b.kind === 'render')
      lines.push(`export function ${b.name}(...args) { return cap(${n})(...args); } // ${where}`);
    else throw Error(`boundary ${b.name}: unknown kind ${b.kind}`);
  }
  return lines.join('\n') + '\n';
}

export async function pinInit() {
  if (await fs.stat(pinsPath).catch(() => null)) throw Error(`${pinsPath} exists; review and delete it by hand to re-pin`);
  const cache = new Map();
  const decl = async (f, local) => {
    const src = await readSource(f, cache, official.ionSource); const e = src.top.get(local);
    if (!e || e.kind === 'import') throw Error(`${f}#${local} is not a declaration`);
    const exportAlias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
    return { sha256: sha(src.code.slice(e.node.start, e.node.end)), exportAlias, head: (await featureText(src, e)).split('\n')[0].trim() };
  };
  const pins = { referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, sources: {}, roots: {}, boundaries: {} };
  for (const m of modules) pins.sources[m.source] = sha(await fs.readFile(path.join(official.ionSource, m.source)));
  for (const r of roots) {
    const d = await decl(r.file, r.local);
    if (d.exportAlias !== r.export) throw Error(`${r.semantic}: export ${d.exportAlias}, expected ${r.export}`);
    pins.roots[r.semantic] = { file: r.file, local: r.local, export: r.export, declarationSha256: d.sha256, features: r.features };
  }
  for (const b of boundaries) {
    const [f, local] = b.key.split('#');
    const d = await decl(f, local);
    pins.boundaries[b.key] = { name: b.name, kind: b.kind, export: d.exportAlias, declarationSha256: d.sha256, head: d.head,
      sourceSha256: sha(await fs.readFile(path.join(official.ionSource, f))) };
  }
  pins.cdsCore = { manifestSha256: sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))), adapterSha256: sha(await fs.readFile(cdsCoreAdapterPath)) };
  await fs.writeFile(pinsPath, JSON.stringify(pins, null, 2) + '\n');
  return pins;
}

export async function extractFrameSidebarNav(options = {}) {
  const pins = await readPins();
  await preflight(pins);
  const adapter = adapterSource();
  if (options.check) { if (await fs.readFile(adapterPath, 'utf8').catch(() => null) !== adapter) throw Error('src/frame-sidebar-nav-adapter.mjs differs from the generator boundaries'); }
  else if (!options.dryRun) await fs.writeFile(adapterPath, adapter);
  return runSlicer({ ...sliceConfig(pins),
    artifacts: async m => ({ 'provenance.json': JSON.stringify({
      referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
      pins: 'scripts/frame-sidebar-nav.pins.json', links: 'scripts/frame-sidebar-nav-links.json', roots: pins.roots, boundaries: pins.boundaries, cdsCore: pins.cdsCore, adapterSha256: sha(adapter),
      sharedGraphImports: [...new Set(m.modules.flatMap(x => x.imports.filter(i => i.kind === 'shared-graph').map(i => `${i.name} <- ${i.via}`)))].sort(),
      heldByCdsCore: Object.fromEntries(m.modules.filter(x => x.heldByViewTabs.length).map(x => [x.target, x.heldByViewTabs.length])),
      initializers: Object.fromEntries(m.modules.filter(x => x.initializers.length).map(x => [x.target, x.initializers])),
    }, null, 2) + '\n' }) }, options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--pin-init')) { const p = await pinInit(); console.log('pinned', Object.keys(p.sources).length, 'sources', Object.keys(p.roots).length, 'roots', Object.keys(p.boundaries).length, 'boundaries'); }
  else await extractFrameSidebarNav({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
