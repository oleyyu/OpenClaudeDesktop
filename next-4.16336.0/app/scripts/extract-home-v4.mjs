// home-chat-cowork (4.16336.0): the Chat new-page greeting and the Cowork home, sliced from the frozen 4.16336.0 snapshot
// by the runSlicer engine (scripts/extract-working-line.mjs) into src/generated/home-chat-cowork, linking every CDS name
// through the finalized cds-core shared graph (sharedGraph 'cds-core': a binding cds-core publishes is imported under its
// publicName; a binding it holds without one is sliced again only when pure, module state stops generation, D46).
// Surface pilot: analysis/claude-4.16336.0-migrate-20261104/surface-pilots/home-chat-cowork (report.json productionPlan
// steps 2-6; review/ P1 fixed: no cds-core patch any more, the names come from the finalized cds-core manifest).
//
// Roots (all in shared-23-BRmsPtuN.js unless noted), each located on the official AST as the only top-level declaration
// of its chunk carrying its features, under the pinned local, export alias and declaration sha256 (locateRoots):
//   ix  useChatGreeting      the Chat greeting text ("You’re here!" / "You’re incognito" / the personalized_greeting slot)
//   Hb  personalizedGreeting the greeting table lookup (surface, day, hour)
//   lx  HomeGreeting         the greeting lockup (CdsSpark + text)
//   dw  CoworkHome           the Cowork new page body (plugin card, setup card, task list with the Ideas as its empty fallback)
//   uw  homeSurfaceSlots     the per-surface slot table
//   ZC  CoworkTaskList       the task list keyed by account (export vn); QC is its body (Active / Pinned / Scheduled)
//   ce266b9be Le  ChorusCoworkSuggestions (lazy, loaded by shared-23 sw through the official preload helper)
//   c2bf50d9e o   COWORK_HOME_IDEAS_CATALOG (lazy, loaded by ce266b9be Ne)
//
// Host services are answered by src/source-home-v4-adapters.jsx (the host adapter contract: report.json of this surface);
// each replaced original declaration is pinned by its feature strings, so a reshaped original stops generation.
// D0: own generator, own output folder, own scripts/verify-gen-home-v4.mjs (prepare:ui discovers it).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as v4 from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
export const HOME_V4_OUTPUT = 'src/generated/home-chat-cowork';
const S23 = 'shared-23-BRmsPtuN.js', CE26 = 'ce266b9be-DwMu7QWG.js', C2BF = 'c2bf50d9e-C85ZHUZy.js', PRELOAD = 'preload-helper-BBljBeZo.js';
const sha256 = text => createHash('sha256').update(text).digest('hex');

// The finalized cds-core this graph links (wave 4, cds-integrate/wave4/wave4-merged.json manifestSha256.production).
// A regenerated cds-core changes this hash: re-run this generator (--check fails until then, as for every cds-core area).
export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

// Official chunks this area slices its roots from, pinned (a changed snapshot stops generation).
export const sourcePins = {
  [S23]: 'f52e23053cdcb6378fb347c14ff7a6243e4d89a5dfb63cf27d4b2217d2cb01c9',
  [CE26]: '7bc02618202f1a5008ca76f4041c55e75d1cc07267529a16658992d3535e2e86',
  [C2BF]: '723e1c3426dc409b519eb4a5810e002364f3ca7b5a8dac13468ec20006230db7',
};

const adapters = {
  [v4.vendorIntl]: {
    p: { name: 'useIntl', local: 'q', features: ['return (Mt(e), e);'], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
    l: { name: 'FormattedMessage', local: 'Gt', features: ['Gt = a(Wt, Ut)'] },
    a: { name: 'HomeRelativeTime', local: 'en', features: ['updateIntervalInSeconds: i,', '"Cannot schedule update with unit longer than hour"'] },
  },
  'shared-25-D-aF0gt9.js': {
    di: { name: 'useChatGreetingBootstrap', local: 'kB', features: ['"use no memo"', 'bootstrapApiPrefix:', 'sessionMarkerValue:'] },
    hs: { name: 'readCachedChatGreetings', local: 'BO', features: ['localStorage.getItem(IO)', 'accountUuid: r,', 'entries: o'] },
    yi: { name: 'useHomeAccount', local: 'Z', features: ['"Must call inside CurrentAccountProvider"'] },
    Wg: { name: 'useGrowthBookFlagWhen', local: 'Mo', features: ['!t || !n?.growthbook', '.on;'] },
    Pu: { name: 'HomeRouterLink', local: 'Ky', features: ['href: t,', 'prefetch: r,', 'scroll: s,'] },
  },
  'shared-183-B2N6Zy4J.js': {
    to: { name: 'useChatGreetingSearchParams', local: 'UH', features: ['n = e?.searchParamsString;'] },
    Qa: { name: 'useHomeChalkTeacher', local: 'WH', features: ['"chalk_teacher"'] },
  },
  'shared-92-BOgyxePb.js': {
    Hb: { name: 'setGreetingTelemetry', local: 'zu', features: ['setGlobalContextProperty(e, t)'] },
    Yg: { name: 'useHomeSidebarCollapsed', local: 'FS', features: ['return Y(PS);'] },
  },
  'shared-1-D1bGaTaN.js': {
    S_: { name: 'chatBootLocale', local: 'nx', features: ['nx = hs(tx)'] },
    hf: { name: 'useHomeIncognito', local: 'MP', features: ['return E(OP);'] },
  },
  'shared-123-1Hc1RTKl.js': {
    Yx: { name: 'useHomeMarlinDesign', local: 's_', features: ['"skeleton_stamp"', 's === "marlin"'] },
    Et: { name: 'defineLazyEntry', local: 'W$', features: ['e.options.suspense === !0', '{ pick: n } = e,'] },
    cy: { name: 'subscribeHomeSessionEvents', local: '_x', features: ['Se?.onOnEvent', 'case "archived":'] },
    Zy: { name: 'useHomeScheduleAccess', local: 'By', features: ['{ yukonSilver: e, verdict: t, sessionHost: n } = Ry()'] },
    Nu: { name: 'useHomePinsEnabled', local: '_L', features: ['(e) => !0'] },
    Qb: { name: 'useDesktopHomeSupported', local: 'kv', features: ['?.desktopHome?.status === "supported"'] },
    Kb: { name: 'useHomeBrowserPaired', local: 'ay', features: ['=== "answered"'] },
    zx: { name: 'useHomeBrowserInitialized', local: 'w_', features: ['.useIsInitialized'] },
    Xc: { name: 'useHomeServerGates', local: 'PB', features: ['serverGateNames: e'] },
  },
  'shared-2-CsjIBQD8.js': {
    _o: { name: 'useHomeSessions', local: 'hK', features: ['{ sessions: r } = gG(t);'] },
    ps: { name: 'useHomeReadState', local: 'QH', features: ['return wH($H);'] },
    $o: { name: 'clearHomeActive', local: 'KH', features: ['let t = { sessions: {}, initializedAt: Date.now() };'] },
    us: { name: 'useHomeReadStateSync', local: 'IH', features: ['jH(t);'] },
    es: { name: 'markHomeSessionRead', local: 'RH', features: ['zH([e]);'] },
    rs: { name: 'markHomeSessionUnread', local: 'WH', features: ['explicitUnread: { ...t.explicitUnread, [e]: !0 },'] },
  },
  'shared-4-C_EiQb9h.js': {
    Mt: { name: 'useHomeLandingIntent', local: 'ij', features: ['return O(rj);'] },
    zt: { name: 'useHomeLandingSkipsPlugins', local: 'vj', features: ['e = _j(),', 'return e && t;'] },
    Bt: { name: 'useHomeLandingActive', local: '_j', features: ['e = O(rj),', 'return e !== null || t;'] },
    br: { name: 'pendingHomeCreation', local: 'fC', features: ['folderGrantWaitMs: n.folderGrantWaitMs,'] },
  },
  'shared-5-u8kha2eH.js': {
    Mc: { name: 'useHomeSurface', local: 'tA', features: ['return O(eA);'] },
    Cn: { name: 'useHomeAttentionIds', local: 'IW', features: ['t.verdictsByToolUseId'] },
    Tn: { name: 'useHomeSessionAwaiting', local: 'jW', features: ['(e) => AW(t, e.verdictsByToolUseId)'] },
    wn: { name: 'useHomeSessionOnlyQuestions', local: 'NW', features: ['kW(t, e.verdictsByToolUseId)', 'n.every(PW)'] },
    Nn: { name: 'useHomeSessionAutoAnswering', local: 'lW', features: ['() => rW.has(e)', 'iW.subscribe'] },
  },
  'shared-153-DMw2VzSq.js': {
    Dh: { name: 'useHomePluginsInChat', local: 'nD', features: ['"claude_ai_plugins_in_chat"'] },
    Eh: { name: 'useHomeSetupCards', local: 'AE', features: ['classifyWebRows: r'] },
  },
  'shared-33-DtdykY0y.js': {
    ka: { name: 'useHomeRemoteCoworkSession', local: 'Fj', features: ['isRemoteCoworkSession: e'] },
    co: { name: 'useHomePluginSkillFilter', local: 'RA', features: ['"claude_ai_plugins_in_chat"'] },
    ua: { name: 'useHomeSkillNames', local: 'NM', features: ['e.orgAvailable && e.isRemote'] },
    wi: { name: 'useHomeIdeaTarget', local: 'dF', features: ['projectScopeLocked: c'] },
    Mo: { name: 'useHomeIdeasTracker', local: 'Jk', features: ['client_platform: t ? kt.DESKTOP_APP : kt.WEB_CLAUDE_AI'] },
    da: { name: 'useHomeSupportedCommands', local: 'HM', features: ['enabled: !!Q?.getSupportedCommands'] },
  },
  'shared-212-BHMAi0oa.js': {
    Tc: { name: 'useHomeSetupCardDismissals', local: 'bU', features: ['e?.silent'] },
    Tv: { name: 'useHomeIdeasPrompt', local: 'kw', features: ['"useChatInputPrefill"'] },
    Mv: { name: 'useHomeIdeasEditor', local: 'UC', features: ['return Kl(t, Dl(e));'] },
  },
  'shared-140-DfG6VwpK.js': {
    na: { name: 'useHomeIdle', local: 'Ta', features: ['t ? Pn : Ca'] },
    ea: { name: 'useHomeUnifiedRoutines', local: 'Aa', features: ['return Ce(ka);'] },
  },
  'shared-31-C9BqSSuD.js': {
    ha: { name: 'useHomeSchedules', local: 'Up', features: ['zp(t), !0'] },
  },
  'shared-26-B-POtn5S.js': {
    Ys: { name: 'useHomeFolderSelection', local: 'wI', features: ['selectedFolders: bI(),', 'selectedFoldersTouched: !1,'] },
  },
  'shared-21-CuohtEoj.js': {
    va: { name: 'useHomeChalkSidebar', local: 'O_', features: ['"proj-chalk-sidebar"'] },
  },
  'shared-8-BqfCbkJd.js': {
    Hi: { name: 'useHomeRemoteDevicesAvailable', local: 'HN', features: ['!lo() && r'] },
  },
  'cca63be39-YRQcYEN1.js': {
    t: { name: 'useHomeAgentModeAnalytics', local: 'n', features: ['claudeai.yukon_gold.${e}'] },
  },
  'shared-18-Cfqwgjc5.js': {
    cs: { name: 'useHomePermissions', local: 'lI', features: [] },
  },
  'shared-0-CnnWnVrT.js': {
    Yu: { name: 'useIsClaudeDesktopApp', local: 'FH', features: ['wI(window.navigator.userAgent, { version: t, platform: n })'] },
    // The GrowthBook value reader (forced value, else the client's): the host's one table (src/host-growthbook.mjs through
    // src/cds-core-adapter.mjs hostGrowthBookFeature, as approval-landing-v4 / btw-pane-v4 answer it; D29 / D31), not a
    // sliced copy of the client singleton `ku` that nothing here ever sets. Read by shared-2 yH (__gb__3873045074).
    Rx: { name: 'hostGrowthBookFeature', local: 'Uu', features: ['let t = Wu(e);', 'return t === void 0 ? zu(e) : t;'] },
  },
  'shared-7-D2e77H6v.js': {
    Qa: { name: 'useHomeEffectiveErrorCategory', local: 'zg', features: ['e === "auth_error"', '"subscription_past_due"', 'billingNotSelfManageable: r'] },
  },
  'shared-62-DoCqVpIq.js': {
    cf: { name: 'useHomeTracker', local: 'OT', features: ['return ZS;'] },
  },
};
const localAdapters = {
  // (The official preload helper's assetsURL `a` is no longer a local adapter here: since cds-core wave 5 cds-core binds
  // it to the host's viteAssetUrl itself and publishes the helper as vitePreload, which this graph links.)
  // Same-chunk services of the home (re-located by AST and features).
  [`${S23}#rx`]: { name: 'readStaticComposerGreeting', features: ['window.location.pathname !== "/new"', 'e.classList.contains("invisible")'] },
  [`${S23}#qC`]: { name: 'useHomeTasksReady', features: ['Math.min(Date.now(), r ?? 1 / 0) + VC'] },
  [`${S23}#MC`]: { name: 'useHomeSetupCardGate', features: ['{ enabled: u, pending: d }', 'r.considerEnabledForNonUI'] },
  [`${S23}#EC`]: { name: 'PluginSetupCardEntry', features: ['id: "plugin_setup_card",', 'pick: (e) => e.PluginSetupCardBody,'] },
  'shared-18-Cfqwgjc5.js#IM': { name: 'useHomeSessionPreviewActive', features: ['vM.has(t)'] },
  'shared-55-BRv2XBP7.js#QS': { name: 'UnavailableInlineReview', features: ['import("./c75724292-BGed9max.js")', 'default: e.InlineToolApproval,'] },
  [`${CE26}#Ae`]: { name: 'useHomeChipsVariant', features: ['"variant", "control"'] },
  [`${CE26}#Oe`]: { name: 'useHomeBrowserIdeas', features: ['return !e || t ? !1 : n ? r && i : a && !o && !s;'] },
  [`${CE26}#ke`]: { name: 'useHomeBrowserDevices', features: ['i.data.devices'] },
  [`${CE26}#Pe`]: { name: 'useHomeSkillIdeas', features: ['icon: "SlashShortcutCommand",', '{ suggestions: p, isLoading: m }'] },
};

// Roots: chunk -> local -> { name, alias (the chunk's export alias, or null when internal), probe, features, sha256 (the
// original declaration text, as the pilot and its independent AST review computed it) }.
const rootsV4 = {
  [S23]: {
    ix: { name: 'useChatGreeting', alias: null, probe: 'personalized_greeting',
      features: ['{ incognito: t } = e,', 'defaultMessage: "You\\u2019re here!"', 'defaultMessage: "You\\u2019re incognito"', '"chat"', 'personalized_greeting'],
      sha256: 'a10b45da6abac199984c4ff5c4f2a8464d82f146d6d852d7d7f520e66b500c54' },
    Hb: { name: 'personalizedGreeting', alias: null, probe: 'surface',
      features: ['e.find((e) => e.surface === t)', '(e) => n.getHours() < e.until'],
      sha256: '71d171b903f713aaa9b69e510c1d0d4754056dc14515f71c9c9c8ac28defa95d' },
    lx: { name: 'HomeGreeting', alias: null, probe: 'isAgentRoute',
      features: ['{ text: t, isAgentRoute: n, layout: r, spark: i, minHeight: a } = e,', '"data-new-page-greeting-spark": ""', '"data-new-page-greeting-text": ""'],
      sha256: '91578fefae6991bf50fbe52389a2be556847f3754f60f214055941beacdd998c' },
    dw: { name: 'CoworkHome', alias: null, probe: 'opensOnChatSurface',
      features: ['{ target: t, surfaces: n } =', 'opensOnChatSurface === !0', 'source: "plugin", shown: !1', 'emptyFallback: y ? null : d(cw, { standalone: !0 })'],
      sha256: 'f4bbe9943b85a1cb251d3ae6b66b2399c375b4dffbd97532a0ef7793a9ca0c3b' },
    uw: { name: 'homeSurfaceSlots', alias: null, probe: 'task_new',
      features: ['setupCard: "task_new", taskList: !0', 'setupCard: e === "chat" ? (t ? "hub" : n ? "chat" : null) : null'],
      sha256: 'bfb42917f52ee82855fd63003f424c950457a6104d08774cc55220c8f7c02c2f' },
    ZC: { name: 'CoworkTaskList', alias: 'vn', probe: 'uuid',
      features: ['`${n?.uuid ?? ""}:${r?.uuid ?? ""}`'],
      sha256: 'da248aa1044973858973f4e47ed62d83633f450cc2bda39b2d79916a0e1ffd15' },
  },
  [CE26]: {
    Le: { name: 'ChorusCoworkSuggestions', alias: 'ChorusCoworkSuggestions', probe: 'standalone',
      features: ['{ standalone: t } = e,', 'COWORK_HOME_IDEAS_CATALOG'],
      sha256: '6e56d4e1f56c55ec40a19984e44ad4313122675bcf4aa9b20db340ec65960259' },
  },
  // The greeting's seat (the classic new page; shared-23 fx's frame `hu` = shared-19 Sa, its layout table `zu` = shared-19
  // ya over the "classic" variant, and the phone seat class shared-33 Zo): the host draws fx's frame around lx (fx itself
  // also mounts shared-100 Vm, an idle prefetch of chunks the host does not ship, and Nb, an account anniversary that is
  // always null without a claude.ai account), with these original values.
  'shared-19-UalAfDtn.js': {
    pS: { name: 'homeLayout', alias: 'ya', probe: 'fS', features: ['return fS[e];'], sha256: 'b50a8a7e22930f3cf6b3d8f6a0e8b6bada90a2747dfcab9c539e11a62cd75975' },
    eS: { name: 'greetingFrameClass', alias: 'Sa', probe: 'max-md', features: ['"mx-auto flex w-full flex-col items-center gap-7 max-md:pt-4 max-w-2xl"'], sha256: '35d5c1a788dab3ad8c3ee6222b1839c126d31961d0f3ddef57233fa8ab2ce1d3' },
    // chat-home r1-07: SD (ED's greeting slot) draws `div { className: h(n, aC, opacity-0 while held) }` — the caller's
    // greetingSlotClass + seat, then aC, the md: margin that pulls the greeting up by the composer / band lift.
    aC: { name: 'greetingSlotLiftClass', alias: null, probe: 'band-slot-lift', features: ['"md:mt-[calc(0.75rem_-_min(var(--chorus-composer-lift,0px)_+_var(--band-slot-lift,0px),5rem))]"'], sha256: '7d3fd6fc0add7b2084927a6cc64cd2e0ddc0bb3eda3b98d77defd63a60b3afe9' },
  },
  'shared-33-DtdykY0y.js': {
    Ik: { name: 'homeGreetingSeatClass', alias: 'Zo', probe: 'center', features: ['return e === "center" ? Fk : "";'], sha256: '624daa0dfc9002b9497aa34c28b98603f2cb5ca6de9a0a3268df64426642e3f1' },
  },
  [C2BF]: {
    o: { name: 'COWORK_HOME_IDEAS_CATALOG', alias: 'COWORK_HOME_IDEAS_CATALOG', probe: null, features: [],
      sha256: 'a83df521489af574afa7d6ca7c35b0ef930a5b1b95b6d145b5099138a3ab5639' },
  },
};
// Declarations inside the closure the host contract reads by name (checked like roots, not exported): the task list body,
// the lazy Ideas entry / component and the static-shell fade that reads the boot markers.
const innerPins = {
  [S23]: {
    QC: { alias: null, probe: 'Pinned or active', features: ['defaultMessage: "Pinned or active"', 'defaultMessage: "Active tasks"', 'b.filter(ow).sort(aw)'],
      sha256: 'fc03e8b2c8fa64220479d46044a4a50a35d46088a26c385adb8ec3ee74f7b51b' },
    sw: { alias: null, probe: 'chorus_cowork_suggestions', features: ['id: "chorus_cowork_suggestions",', 'import("./ce266b9be-DwMu7QWG.js")', 'onChunkError: "fail-open",'],
      sha256: '9f4163b968736dc35e52dd11fd4b5a3da29c39ceabb10261b521be7ea55305f6' },
    cw: { alias: null, probe: 'Component', features: ['cw = sw.Component'], sha256: 'db8d1cba053695072f3f168202e5756a1588eaeaf07de4c59e15f3e5a2bb8d8c' },
    XC: { alias: 'gn', probe: 'coveredByPageSurface', features: ['{ className: t, children: n, plainFadeIn: r } = e,', '{ coveredByPageSurface: !0 }', '"animate-fade-in motion-reduce:animate-none"'],
      sha256: '2f1142723288f4b46a0d33fd6ee21caa7892753b3175dfb4fc47046d10385bac' },
  },
};
// c2bf50d9e o has no distinctive feature text of its own beyond its ids; it is pinned by its export alias and hash, and by
// the first idea of the pool.
rootsV4[C2BF].o.probe = 'find-themes-in-files';
rootsV4[C2BF].o.features = ['id: "find-themes-in-files",', 'defaultMessage: "Find themes in my messy files",'];

const modules = [
  { target: 'shared-23.mjs', source: S23, internal: true,
    exports: Object.fromEntries(Object.entries(rootsV4[S23]).map(([local, root]) => [local, root.name])),
    features: Object.fromEntries(Object.entries(rootsV4[S23]).map(([local, root]) => [local, root.features])) },
  { target: CE26, source: CE26, exports: { Le: 'ChorusCoworkSuggestions' }, features: { Le: rootsV4[CE26].Le.features } },
  { target: C2BF, source: C2BF, exports: { o: 'COWORK_HOME_IDEAS_CATALOG' }, features: { o: rootsV4[C2BF].o.features } },
  // The rest of the closure: one module per official chunk it enters. Bindings cds-core publishes are linked; pure ones it
  // holds without a publicName (the React Compiler helpers) are sliced again (heldByViewTabs). Since cds-core wave 5 the
  // closure enters preload-helper, shared-31, shared-1 and shared-60 only through bindings cds-core publishes (vitePreload,
  // the state / message tables of the wave-5 lanes), so those four chunk modules are gone.
  { target: 'shared-frame.mjs', source: v4.sharedFrame },
  { target: 'shared-0.mjs', source: 'shared-0-CnnWnVrT.js' },
  { target: 'shared-25.mjs', source: 'shared-25-D-aF0gt9.js' },
  { target: 'shared-62.mjs', source: 'shared-62-DoCqVpIq.js' },
  { target: 'vendor-intl.mjs', source: v4.vendorIntl },
  { target: 'shared-123.mjs', source: 'shared-123-1Hc1RTKl.js' },
  { target: 'shared-19.mjs', source: 'shared-19-UalAfDtn.js', internal: true, exports: { pS: 'homeLayout', eS: 'greetingFrameClass', aC: 'greetingSlotLiftClass' },
    features: { pS: rootsV4['shared-19-UalAfDtn.js'].pS.features, eS: rootsV4['shared-19-UalAfDtn.js'].eS.features, aC: rootsV4['shared-19-UalAfDtn.js'].aC.features } },
  { target: 'shared-3.mjs', source: 'shared-3-IQTrO7Gx.js' },
  { target: 'shared-153.mjs', source: 'shared-153-DMw2VzSq.js' },
  { target: 'shared-92.mjs', source: 'shared-92-BOgyxePb.js' },
  { target: 'shared-212.mjs', source: 'shared-212-BHMAi0oa.js' },
  { target: 'shared-33.mjs', source: 'shared-33-DtdykY0y.js', exports: { Ik: 'homeGreetingSeatClass' }, features: { Ik: rootsV4['shared-33-DtdykY0y.js'].Ik.features } },
  { target: 'vendor-all-0.mjs', source: 'vendor-all-0-uUCo-eCX.js' },
  { target: 'shared-2.mjs', source: 'shared-2-CsjIBQD8.js' },
  { target: 'shared-183.mjs', source: 'shared-183-B2N6Zy4J.js' },
  { target: 'shared-26.mjs', source: 'shared-26-B-POtn5S.js' },
  { target: 'shared-8.mjs', source: 'shared-8-BqfCbkJd.js' },
  { target: 'shared-5.mjs', source: 'shared-5-u8kha2eH.js' },
  { target: 'shared-160.mjs', source: 'shared-160-DDUFdDNM.js' },
  { target: 'shared-18.mjs', source: 'shared-18-Cfqwgjc5.js' },
  { target: 'shared-55.mjs', source: 'shared-55-BRv2XBP7.js' },
  { target: 'c05c7c31d.mjs', source: 'c05c7c31d-CsbIKKsT.js' },
  { target: 'c3b8779ba.mjs', source: 'c3b8779ba-ftPgp0TO.js' },
  { target: 'c644c45fc.mjs', source: 'c644c45fc-Ckc94xcg.js' },
];

// Wave 8 (cds-integrate/wave8 W8-RT, round3 integrate-gates notFixed r3b-tasks-subtask:98): the r3b-tasks bindings this
// closure reaches (shared-0 Tl) are linked from r3b-tasks, their one 4.16336.0
// owner (D1 survey: converge on r3b-tasks; r3b-tasks exports them, roots under their semantic names, the rest as linkExports),
// never cut again here.
export const HOME_V4 = {
  name: 'home-chat-cowork (4.16336.0)', generator: 'extract-home-v4.mjs', output: path.join(root, HOME_V4_OUTPUT),
  adapterModule: '../../source-home-v4-adapters.jsx', adapterFile: 'src/source-home-v4-adapters.jsx', adapters, localAdapters, modules,
  sharedGraph: 'cds-core', generatedRoot: path.join(root, 'src/generated'), linkedAreas: ['r3b-tasks'],
  referenceVersion: v4.referenceVersion, referenceSnapshot: v4.referenceSnapshot, source: v4.ionSource,
  vendor: { [v4.vendorFrame]: v4.reactAliases }, sourceContract: v4,
};

const declarationEntries = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const hasFeatures = (label, text, features) => { try { assertFeatures(label, text, features); return true; } catch { return false; } };
// The one top-level declaration of a chunk carrying `features` (candidates: declarations whose original text contains
// `probe`); uniqueness is decided on the features over the prettier text.
async function uniqueDeclaration(src, label, probe, features) {
  if (!probe || !features.length || !features.some(feature => feature.includes(probe))) throw Error(`${label}: probe ${probe} is not a token of its features`);
  const hits = [];
  for (const entry of declarationEntries(src)) {
    if (!src.code.slice(entry.node.start, entry.node.end).includes(probe)) continue;
    if (hasFeatures(label, await featureText(src, entry), features)) hits.push(entry);
  }
  if (hits.length !== 1) throw Error(`${src.name} ${label}: ${hits.length} top-level declarations carry ${JSON.stringify(features)}, expected 1`);
  return { entry: hits[0], local: [...src.top].find(([, e]) => e === hits[0])[0] };
}
// Strict source contract: every root and inner pin is the only declaration of its chunk with its features, under the pinned
// local, export alias (null: not exported) and declaration hash.
export async function locateRoots() {
  const cache = new Map(), read = name => readSource(name, cache, v4.ionSource);
  const located = { roots: {}, inner: {} };
  for (const [kind, table] of [['roots', rootsV4], ['inner', innerPins]]) for (const [chunk, locals] of Object.entries(table)) {
    const src = await read(chunk);
    for (const [local, pin] of Object.entries(locals)) {
      const label = `${kind} ${pin.name ?? local}`;
      const hit = await uniqueDeclaration(src, label, pin.probe, pin.features);
      if (hit.local !== local) throw Error(`${chunk} ${label}: the declaration is ${hit.local}, expected ${local}`);
      const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
      if (alias !== pin.alias) throw Error(`${chunk} ${label}: exported as ${alias}, expected ${pin.alias}`);
      const declSha = sha256(src.code.slice(hit.entry.node.start, hit.entry.node.end));
      if (declSha !== pin.sha256) throw Error(`${chunk} ${label}: declaration sha256 ${declSha}, pinned ${pin.sha256}`);
      located[kind][pin.name ?? local] = { chunk, local, alias, sha256: declSha };
    }
  }
  return located;
}
export async function preflight() {
  for (const [file, want] of Object.entries(sourcePins))
    if (sha256(await fs.readFile(path.join(v4.ionSource, file))) !== want) throw Error(`official ${file} changed`);
  const manifest = await fs.readFile(path.join(HOME_V4.generatedRoot, 'cds-core/manifest.json'));
  if (sha256(manifest) !== CDS_CORE_MANIFEST_SHA256) throw Error(`cds-core manifest is ${sha256(manifest)}, this graph is pinned to ${CDS_CORE_MANIFEST_SHA256}: re-run and review`);
  return locateRoots();
}
// Module state this graph holds that the engine's own test (new Map / Set / WeakMap / WeakSet, imported createContext)
// does not see, among the bindings cds-core also holds (heldByViewTabs): a context made through a local createContext
// alias, or a module-level binding a selected declaration assigns. A hit stops generation (D46) unless it is listed in
// justifiedCopies with its reason.
const justifiedCopies = {
  // (The preload helper's dedupe cache o left this list in cds-core wave 5: cds-core's helper is viteAssetUrl-bound and
  // published as vitePreload, so this graph links it and holds no second cache.)
};
async function unseenHeldState(manifest) {
  const cache = new Map(), found = [];
  for (const m of manifest.modules) {
    if (!m.heldByViewTabs?.length) continue;
    const src = await readSource(m.source, cache, v4.ionSource), held = new Set(m.heldByViewTabs);
    for (const name of held) {
      const entry = src.top.get(name), init = entry?.kind === 'var' ? entry.node.init : null;
      if (init?.type === 'CallExpression' && /createContext/.test(src.code.slice(init.start, init.end).slice(0, 80))) found.push(`${m.source}#${name} (context)`);
      if (init?.type === 'ObjectExpression' || init?.type === 'ArrayExpression') {
        const written = m.bindings.some(({ name: other }) => {
          const e = src.top.get(other);
          return e && e.kind !== 'import' && new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\[[^\\]]+\\]\\s*=[^=]`).test(src.code.slice(e.node.start, e.node.end));
        });
        if (written) found.push(`${m.source}#${name} (mutable object written by the graph)`);
      }
    }
    const written = new Map();
    for (const { name } of m.bindings) {
      const entry = src.top.get(name);
      const text = (entry.kind === 'var' ? 'var ' : '') + src.code.slice(entry.node.start, entry.node.end) + (entry.kind === 'var' ? ';' : '');
      babel.traverse(babel.babelParse(text, `${m.source}#${name}`, true), {
        'AssignmentExpression|UpdateExpression'(p) {
          const target = p.node.type === 'AssignmentExpression' ? p.node.left : p.node.argument;
          if (target.type === 'Identifier' && target.name !== name && held.has(target.name) && !p.scope.hasBinding(target.name)) written.set(target.name, name);
        },
      });
    }
    for (const [binding, by] of written) found.push(`${m.source}#${binding} (module-level binding written by ${by})`);
  }
  return found.filter(hit => !Object.hasOwn(justifiedCopies, hit.split(' ')[0]));
}
function rootsJson(located) {
  return JSON.stringify({ referenceVersion: v4.referenceVersion, referenceSnapshot: v4.referenceSnapshot, cdsCoreManifestSha256: CDS_CORE_MANIFEST_SHA256,
    sourcePins, ...located, justifiedCopies,
    previous: { referenceVersion: v4.previousVersion, outputs: ['src/generated/chat-home', 'src/generated/cowork-home'],
      roots: { useChatGreeting: 'Dy', personalizedGreeting: 'dy', HomeGreeting: 'My', CoworkHome: 'FS', homeSurfaceSlots: 'PS', CoworkTaskList: 'xS (export un)',
        ChorusCoworkSuggestions: 'Re', COWORK_HOME_IDEAS_CATALOG: 'c2bf50d9e o' } } }, null, 2) + '\n';
}
// r2 chat-home-r2-05 / r2-06: shared-19 ED's card column around the composer, as picked literals (new-page-card-slot.mjs):
// the slot `div { className: h("isolate", Be, K, ea), [Sp]: "" }` (Be = the caller's className ?? "mx-auto w-full max-w-2xl",
// K = shared-23's cardSlotClassName = shared-33 xk, ea = `vt && "md:contents"`, Sp = shared-33 Dk via its export Vo); the
// band slot `div { className: h("relative -z-10", q, ra) }` (q = bandSlotClassName = shared-33 Ck); the card block
// `ac { className: h(J, ua) }` (J = cardBlockClassName = shared-33 Pk with chorusUnifiedComposerDesign off); the composer's
// `div { className: "relative z-10" }`; and kw's closed tray (`aria-hidden`, inert, grid-rows-[0fr]) under it. vt is ED's
// `greetingHeadroomFree && layoutVariant === "home"`. Read from the minified chunks (each pattern must match once).
const CARD_SLOT_PICKS = {
  'shared-33-DtdykY0y.js': {
    cardSlotClass: /(?<![\w$])xk="(dock:contents)"/, cardSlotAttribute: /(?<![\w$])Dk="(data-chorus-card-slot)"/,
    bandSlotClass: /(?<![\w$])Ck="(dock:order-last dock:mt-auto [^"]*)"/, cardBlockClass: /(?<![\w$])Pk="(dock:order-last dock:mt-0 dock:sticky dock:bottom-0 dock:z-10 dock:bg-surface-1 dock:pb-\[3\.75rem\][^"]*)"/,
    cardPxProperty: /(?<![\w$])Sk="(--new-page-card-px)"/, cardPxExport: /(?<![\w$])Sk as (Bo)[,}]/,
    cardSlotAttributeExport: /(?<![\w$])Dk as (Vo)[,}]/, cardSlotExport: /(?<![\w$])xk as (Yo)[,}]/, bandSlotExport: /(?<![\w$])Ck as (Ro)[,}]/, cardBlockExport: /(?<![\w$])Pk as (Ko)[,}]/,
  },
  'shared-19-UalAfDtn.js': {
    slotWidthClass: /Be=H\?\?\(Ie\?"mx-auto w-full max-w-\[40rem\]":"([^"]+)"\)/, slotHeadroomClass: /ea=vt&&"([^"]+)",ta=/,
    slotBaseClass: /K3\(\$,301,K,ea,Be,h\("([^"]+)",Be,K,ea\)\)/, slotAttribute: /K0\(\$,305,\{\[(Sp)\]:""\}\)/, slotAttributeImport: /(?<![\w$])(Vo) as Sp[,}]/,
    bandBaseClass: /h\("([^"]+)",q,ra\)/, bandHeadroomClass: /ra=vt&&"([^"]+)",ia=/, cardBlockHeadroomClass: /ua=vt&&"([^"]+)",da=/,
    composerClass: /g\("div",\{ref:jt,className:"([^"]+)",children:v\(ZT,/,
    trayClass: /h\("(relative z-0 mx-2 -mt-5 grid [^"]+)",ee\)/, trayClosedRows: /ee=L\?"grid-rows-\[1fr\]":"([^"]+)"/,
    trayInnerClass: /g\("div",\{className:"([^"]+)",children:g\(El,\{initial:!1,children:q\}\)\}/,
    trayAttributes: /"aria-hidden":U,inert:W,"(data-chorus-tray-open)":G,className:te/,
  },
  [S23]: {
    cardSlotProp: /cardSlotClassName:(Ch),oneLineBelowSm:!0/, bandSlotProp: /bandSlotClassName:(gh),belowSlotClassName/, cardBlockProp: /ke=r\?Vh:(dh),/,
    // r3 chat-home-r3-06: TT's resize effect writes Sk (imported as th) on the band slot, the card block's height, below 40rem.
    cardPxImport: /(?<![\w$])(Bo) as th[,}]/,
    cardPxWrite: /if\(!matchMedia\("(\(width < 40rem\))"\)\.matches\)\{[\w$]+\.set\(!1\),[\w$]+=null;return\}let\{bandSlot:([\w$]+),card:([\w$]+)\}=[\w$]+\(\);if\(\2 instanceof HTMLElement&&\3&&\2\.style\.setProperty\(th,`\$\{\3\.getBoundingClientRect\(\)\.height\}px`\)/,
    cardSlotImport: /(?<![\w$])(Yo) as Ch[,}]/, bandSlotImport: /(?<![\w$])(Ro) as gh[,}]/, cardBlockImport: /(?<![\w$])(Ko) as dh[,}]/,
  },
};
async function cardSlotArtifact() {
  const picked = {}, records = [];
  for (const [chunk, table] of Object.entries(CARD_SLOT_PICKS)) {
    const code = await fs.readFile(path.join(v4.ionSource, chunk), 'utf8');
    for (const [name, pattern] of Object.entries(table)) {
      const all = [...code.matchAll(new RegExp(pattern.source, 'g'))];
      if (all.length !== 1) throw Error(`card slot pick ${name}: ${all.length} matches in ${chunk}, expected 1`);
      picked[name] = all[0][1];
      records.push({ name, chunk, sha256: sha256(all[0][0]) });
    }
  }
  // E5: shared-23 hands ED the shared-33 constants (through their exports), and ED's slot attribute is shared-33's Dk.
  if (picked.cardSlotImport !== picked.cardSlotExport || picked.bandSlotImport !== picked.bandSlotExport || picked.cardBlockImport !== picked.cardBlockExport)
    throw Error('shared-23 no longer passes shared-33 xk / Ck / Pk as ED\'s card slot / band slot / card block classes');
  if (picked.slotAttributeImport !== picked.cardSlotAttributeExport) throw Error('shared-19 ED\'s slot attribute is no longer shared-33 Dk');
  if (picked.cardPxImport !== picked.cardPxExport) throw Error('shared-23 TT no longer writes shared-33 Sk on the band slot');
  const out = {
    slot: { baseClass: picked.slotBaseClass, widthClass: picked.slotWidthClass, dockClass: picked.cardSlotClass, headroomClass: picked.slotHeadroomClass, attribute: picked.cardSlotAttribute },
    band: { baseClass: picked.bandBaseClass, dockClass: picked.bandSlotClass, headroomClass: picked.bandHeadroomClass,
      cardHeightProperty: picked.cardPxProperty, cardHeightQuery: picked.cardPxWrite },
    cardBlock: { dockClass: picked.cardBlockClass, headroomClass: picked.cardBlockHeadroomClass },
    composerClass: picked.composerClass,
    tray: { className: picked.trayClass, closedRows: picked.trayClosedRows, innerClass: picked.trayInnerClass, openAttribute: picked.trayAttributes },
  };
  return `// Original Claude Desktop ${v4.referenceVersion} literals: shared-19-UalAfDtn.js ED (card slot, band slot, card block, composer wrapper) and kw (closed tray),\n` +
    `// shared-33-DtdykY0y.js xk / Ck / Pk / Dk, as shared-23-BRmsPtuN.js TT passes them; generated by extract-home-v4.mjs. Edit the extractor, never this file.\n` +
    `// picks: ${records.map(r => `${r.chunk}#${r.name}:${r.sha256.slice(0, 12)}`).join(' ')}\n` +
    `export const newPageCardSlot = Object.freeze(${JSON.stringify(out, null, 2)});\n`;
}
// chat-cowork-1to1 r3 (chat-home-r3-02): shared-23 TT's new-page column, as picked literals (new-page-column.mjs), replacing
// the 3.6556.2 cowork-home HomeColumn / homeColumnClass / Rx / HS / scroll class. TT draws the scroll column `div { [Oh]:
// "", className: <scroll class>, children: p(Cl, { className: Se, … }) }` with Se = u("relative flex flex-col items-center
// gap-6 max-sm:!px-1 md:px-14", be, hT, xe): be = `${zu(n).columnTopOffsetClass} ${fu}` without topContent (fu = shared-19
// Jx, the organization banner offset, via its export Oa), hT = !1, and xe = xh without topContent (shared-33 yk, the dock
// height, via its export Wo). Cl is shared-18 uO (export Ku), the page column; its one 4.16336.0 owner is
// cowork-scheduled-v4 (shared-18-Cfqwgjc5.mjs exports uO), so the artifact re-exports it from there (D1: no second slice).
const COLUMN_OWNER = { area: 'cowork-scheduled-v4', target: 'shared-18-Cfqwgjc5.mjs', source: 'shared-18-Cfqwgjc5.js', local: 'uO' };
const NEW_PAGE_COLUMN_PICKS = {
  [S23]: {
    scrollClass: /className:"(min-h-0 flex-1 overflow-x-hidden overflow-y-auto \[scrollbar-gutter:stable_both-edges\])",children:[\w$]+\((Cl),\{className:Se,/,
    columnClass: /Se=[\w$]+\(\$,\d+,be,xe\)\?[\w$]+\(\$,\d+,be,xe,[\w$]+\("(relative flex flex-col items-center gap-6 [^"]*)",be,(hT),xe\)\)/,
    offset: /be=[\w$]+\(\$,\d+,n,t\)\?[\w$]+\(\$,\d+,n,t,t===void 0\?`\$\{[\w$]+\(n\)\.columnTopOffsetClass\} \$\{(fu)\}`:"[^"]*"\):\$\[\d+\]/,
    dock: /xe=t===void 0\?(xh):lh,/, falseFlag: /(?<![\w$])hT=(!1)[,;]/,
    columnImport: /(?<![\w$])(Ku) as Cl[,}]/, offsetImport: /(?<![\w$])(Oa) as fu[,}]/, dockImport: /(?<![\w$])(Wo) as xh[,}]/,
  },
  'shared-18-Cfqwgjc5.js': { columnExport: /(?<![\w$])uO as (Ku)[,}]/ },
  'shared-19-UalAfDtn.js': { offsetClass: /(?<![\w$])Jx="(!mt-\[calc\(-1\*min\(var\(--organization-banner-column-height[^"]*)"/, offsetExport: /(?<![\w$])Jx as (Oa)[,}]/ },
  'shared-33-DtdykY0y.js': { dockClass: /(?<![\w$])yk="(dock:h-auto dock:min-h-\[calc\(100%\+min[^"]*)"/, dockExport: /(?<![\w$])yk as (Wo)[,}]/ },
};
async function newPageColumnArtifact() {
  const picked = {}, records = [];
  for (const [chunk, table] of Object.entries(NEW_PAGE_COLUMN_PICKS)) {
    const code = await fs.readFile(path.join(v4.ionSource, chunk), 'utf8');
    for (const [name, pattern] of Object.entries(table)) {
      const all = [...code.matchAll(new RegExp(pattern.source, 'g'))];
      if (all.length !== 1) throw Error(`new-page column pick ${name}: ${all.length} matches in ${chunk}, expected 1`);
      picked[name] = all[0][1];
      records.push({ name, chunk, sha256: sha256(all[0][0]) });
    }
  }
  // E5: TT's column, offset and dock bindings are the shared-18 / shared-19 / shared-33 exports the picks read, and hT is false.
  if (picked.columnImport !== picked.columnExport || picked.offsetImport !== picked.offsetExport || picked.dockImport !== picked.dockExport || picked.falseFlag !== '!1')
    throw Error('shared-23 TT no longer builds its column from shared-18 uO, shared-19 Jx and shared-33 yk');
  const owner = JSON.parse(await fs.readFile(path.join(HOME_V4.generatedRoot, COLUMN_OWNER.area, 'manifest.json'), 'utf8'));
  const module = owner.modules.find(m => m.target === COLUMN_OWNER.target);
  if (owner.referenceVersion !== v4.referenceVersion || path.basename(module?.source ?? '') !== COLUMN_OWNER.source
    || !module.bindings.some(b => (typeof b === 'string' ? b : b.name) === COLUMN_OWNER.local)
    || module.sourceSha256 !== sha256(await fs.readFile(path.join(v4.ionSource, COLUMN_OWNER.source))))
    throw Error(`${COLUMN_OWNER.area}/${COLUMN_OWNER.target} no longer holds ${COLUMN_OWNER.source}#${COLUMN_OWNER.local}`);
  const out = { scrollClass: picked.scrollClass, columnClass: picked.columnClass, bannerOffsetClass: picked.offsetClass, dockHeightClass: picked.dockClass };
  return `// Original Claude Desktop ${v4.referenceVersion} literals: shared-23-BRmsPtuN.js TT's new-page scroll column and page column (Se), with\n` +
    `// shared-19-UalAfDtn.js Jx (banner offset) and shared-33-DtdykY0y.js yk (dock height); the column is shared-18-Cfqwgjc5.js uO from\n` +
    `// its one owner, ${COLUMN_OWNER.area}. Generated by extract-home-v4.mjs. Edit the extractor, never this file.\n` +
    `// picks: ${records.map(r => `${r.chunk}#${r.name}:${r.sha256.slice(0, 12)}`).join(' ')}\n` +
    `export { ${COLUMN_OWNER.local} as NewPageColumn } from "../${COLUMN_OWNER.area}/${COLUMN_OWNER.target}";\n` +
    `export const newPageColumn = Object.freeze(${JSON.stringify(out, null, 2)});\n`;
}
const quiet = async run => { const log = console.log; console.log = () => {}; try { return await run(); } finally { console.log = log; } };
export async function extractHomeV4({ check = false, dryRun = false } = {}) {
  const located = await preflight();
  const cardSlot = await cardSlotArtifact();
  const column = await newPageColumnArtifact();
  const cfg = { ...HOME_V4, artifacts: () => ({ 'roots.json': rootsJson(located), 'new-page-card-slot.mjs': cardSlot, 'new-page-column.mjs': column }) };
  const planned = await quiet(() => runSlicer(cfg, { dryRun: true }));
  const unseen = await unseenHeldState(planned);
  if (unseen.length) throw Error(`module state cds-core holds without a semantic name, unseen by the engine (D46):\n  ${unseen.join('\n  ')}`);
  return dryRun ? planned : runSlicer(cfg, { check });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractHomeV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
