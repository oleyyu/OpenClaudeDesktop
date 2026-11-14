// Settings navigation (settings-nav, 4.16336.0): slices the official Settings modal navigation from the frozen
// snapshot with the shared runSlicer engine (scripts/extract-working-line.mjs) under the 4.16336.0 source contract
// (scripts/official-4.16336.0.mjs), linked to the cds-core shared graph (sharedGraph 'cds-core'):
//
//   shared-55-BRv2XBP7.js  Kg  (export Rl)  useSettingsSections: the gated section list / groups / admin link (3.6556.2
//                                           shared-46-BIbZBGFq.js Km, export Cc)
//                          z_  (internal)   SettingsNavRail: the wide modal rail (search slot, groups, Platform, admin)
//                                           (3.6556.2 shared-46 Fh)
//                          ev  (internal)   SettingsNavStacked: the narrow/stacked Tabs nav over rv (3.6556.2 shared-46 Yh)
//                          J_  (internal)   SettingsNavGroup: one group's rows (q_ row, k_ badge slot, standsFor)
//   shared-183-B2N6Zy4J.js yg  (export $g)  settingsModalStore: the official settings modal store (section/subpath/open).
//                                           The one copy of this store (productionPlan P4): later settings pages and the
//                                           customize area link it (linkedAreas ['settings-nav']), never slice it again.
//
// Production move of surface-pilots/settings-nav (analysis/claude-4.16336.0-migrate-20261104, report.json productionPlan
// P0–P4). CDS names cds-core publishes are linked (CdsIcon, CdsTabs, CdsDisabledReason, CdsSkeleton, useDirection, clsx…):
// the pilot's CdsDisabledReasonTooltip / CdsSkeleton unreachable cuts are gone. A binding cds-core holds without a
// publicName is sliced again only when pure (the engine stops on module state, D46) and is listed in the manifest's
// heldByViewTabs.
//
// Service boundaries are CUTS below: each names the importer chunk and the importer's local binding as it appears in the
// official source; the generator resolves it through the importer's import table to the exporting chunk/alias/declaration
// (an import cut becomes runSlicer `adapters[file][alias]`, a local cut `localAdapters[file#local]`), asserts `features`
// on that declaration and checks its SHA-256 against the reviewed pins (scripts/settings-nav-v4-pins.json). `contract`
// says which host fact answers it (src/settings-nav-adapter.mjs over the SettingsNavHost value the host builds in
// src/settings-shell-model.mjs settingsNavHostValue); `unreachable` cuts are branches the host contract excludes and that
// throw when entered, so a wrong host answer surfaces instead of rendering nothing.
//
// Roots are located on the official AST: each must be the only top-level declaration of its chunk carrying all its
// features (re-proved on every run), and its declaration hash and export alias must equal the pins.
//
// pins (scripts/settings-nav-v4-pins.json) are a reviewed input: this generator never writes them. The explicit review
// step is analysis/claude-4.16336.0-migrate-20261104/surfaces-prod/settings-nav/pin.mjs (refuses to overwrite without
// --replace). `node scripts/extract-settings-nav-v4.mjs` writes src/generated/settings-nav; `--check` compares byte for
// byte (scripts/verify-gen-settings-nav.mjs, found by prepare-ui); `--dry-run` writes nothing.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import * as official from './official-4.16336.0.mjs';

const appRoot = path.resolve(import.meta.dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const generatedRoot = path.join(appRoot, 'src/generated');
export const output = path.join(generatedRoot, 'settings-nav');
export const pinsFile = path.join(import.meta.dirname, 'settings-nav-v4-pins.json');
export const adapterFile = 'src/settings-nav-adapter.mjs';
export const S55 = 'shared-55-BRv2XBP7.js';
export const S183 = 'shared-183-B2N6Zy4J.js';

export const roots = [
  { semantic: 'useSettingsSections', file: S55, local: 'Kg', export: 'Rl', oldCounterpart: 'shared-46-BIbZBGFq.js#Km (export Cc)',
    features: ['forModal:', 'forNav:', 'id: "data-privacy-controls"', 'href: "/settings/desktop"', 'adminLink:', 'simpleNav:', 'defaultMessage: "This computer"'] },
  { semantic: 'SettingsNavRail', file: S55, local: 'z_', export: null, oldCounterpart: 'shared-46-BIbZBGFq.js#Fh',
    features: ['SearchComponent:', 'defaultMessage: "Admin settings"', 'defaultMessage: "Platform"', 'forModal: !0, forNav: !0'] },
  { semantic: 'SettingsNavStacked', file: S55, local: 'ev', export: null, oldCounterpart: 'shared-46-BIbZBGFq.js#Yh',
    features: ['forModal: !0, forNav: !0', 'a(rv, { groups: n, mergedPageHere: e, activeSection: t })'] },
  { semantic: 'SettingsNavGroup', file: S55, local: 'J_', export: null, oldCounterpart: null,
    features: ['"customize-plugins-disabled"', 'labelledBy:', 'onSelectYours:'] },
  { semantic: 'settingsModalStore', file: S183, local: 'yg', export: '$g', oldCounterpart: null,
    features: ['openCount: 0', 'dismissalLocked: !1', 'pendingInPlaceOpen: null'] },
];

// Host adapter contract (report.json hostAdapterContract of the pilot, with the review P1 fixes: shared-0 Uu and the
// shared-25 Bg GrowthBook hook answer from the one host table; the Platform link's analytics / configuration are cut).
export const cuts = [
  // ---- i18n (react-intl over the host catalog: cds-core-adapter useHostIntl / HostFormattedMessage) ----
  { in: S55, local: 'yu', name: 'useIntl', features: ['return (Mt(e), e);'], contract: 'host i18n (electron/i18n t/getLocale): formatMessage({defaultMessage,id}) / messages' },
  { in: S55, local: 'Q', name: 'FormattedMessage', features: ['(Wt, Ut)'], contract: 'host i18n: <FormattedMessage defaultMessage id values/>' },
  // ---- account / organization ----
  { in: S55, local: 'dn', name: 'useCurrentAccount', features: ['"Must call inside CurrentAccountProvider"'], contract: 'host local profile (settingsNavHostValue: no claude.ai organization, no memberships)', branch: 'activeOrganization drives Organization group title/admin link; host has none' },
  { in: S55, local: 'Gt', name: 'useOptionalCurrentAccount', features: ['_(Dz)'], contract: 'same host account value as useCurrentAccount (y_ reads memberships for the Platform links); no second CurrentAccount context' },
  // ---- Kg section gates (General is unconditional) ----
  { in: S55, local: 'Zh', name: 'usePrivacySection', features: ['a.canExportData && a.ownDataOnly', 'show: !0, isPending: !1'], contract: 'host Privacy page (source-settings-privacy.jsx: Export data) exists → {show:true,isPending:false}', branch: 'Privacy (data-privacy-controls)' },
  { in: S55, local: 'Hh', name: 'useClaudeCodeAvailable', features: ['ls("claude_code").isAvailable'], contract: 'host Code page (tab code) exists → true', branch: 'Claude Code (claude-code)' },
  { in: S55, local: 'lc', name: 'useCoworkSettingsVisible', features: ['"yukon_silver_settings"'], contract: 'host Cowork page (SourceCoworkSettings) shown while boot.coworkEnabled → {show,isPending:false}', branch: 'Cowork (cowork)' },
  { in: S55, local: 'Vh', name: 'useBrowserExtensionSection', features: ['ht("public_api_crochet")', '"claude_pro"'], contract: 'no Claude in Chrome bridge on host → false', branch: 'Claude in Chrome (browser-extension)' },
  { in: S55, local: 'Bh', name: 'useBillingSection', features: ['let e = cn(),', 'return e && !t;'], contract: 'no claude.ai billing service → false', branch: 'Billing' },
  { in: S55, local: 'Vu', name: 'useConnectorsSection', features: ['return e && !t;'], contract: 'host Customize › Connectors (customize-connectors) → true', branch: 'Connectors (non-modal nav only) and Customize › Connectors in Yg' },
  { in: S55, local: 'Vn', name: 'useUsageSettingsForced', features: ['XR(), JR(), LT(), UR'], contract: 'host usage page always present → true', branch: 'Usage visible (y = Ig(forNav) || Vn())' },
  { in: S55, local: 'Ig', name: 'useUsageSectionVisible', features: ['Mg(t && e)', 'Ng(t)'], contract: 'host SourceUsage → true', branch: 'Usage' },
  { in: S55, local: 'Fg', name: 'useInsightsPending', features: ['!!e && t && !n && !r && i'], contract: 'no org insights service → false (not pending)', branch: 'isPending input b' },
  { in: S55, local: 'pu', name: 'useUsagePaceIcon', features: ['e === void 0 || e'], contract: 'host usage-pace treatment unavailable → false (icon _h, not Fh)', branch: 'Usage icon' },
  { in: S55, local: 'rl', name: 'useInsightsSection', features: ['_i(yh)', 'xn(yh, e)'], contract: 'no Insights service → false', branch: 'Insights' },
  { in: S55, local: 'af', name: 'useCapabilitiesSection', features: ['(Oi(), G_)'], contract: 'host has no Capabilities page (claude.ai feature toggles) → false', branch: 'Capabilities' },
  { in: S55, local: 'Tg', name: 'useSystemPromptSection', features: ['ht("system_prompt_editor")'], contract: 'GrowthBook system_prompt_editor from the host table (not listed → false); host has its Instructions extension instead', branch: 'System prompt' },
  { in: S55, local: 'zh', name: 'useAiFluencySection', features: ['ht("claude_ai_fluency_report_main")'], contract: 'GrowthBook claude_ai_fluency_report_main from the host table (not listed → false)', branch: 'AI fluency' },
  { in: S55, local: 'Eg', name: 'useTeachersSection', features: ['internal_has_initiated_chalk_verification'], contract: 'claude.ai account education → false', branch: 'Teachers' },
  { in: S55, local: 'ng', name: 'useIsDesktopApp', features: ['return Be(pe);'], contract: 'host is the desktop app (electron) → true', branch: 'This computer group (System / Extensions / Developer)' },
  { in: S55, local: 'Mi', name: 'useOnThisDevice', features: ['onThisDevice: e'], contract: 'host renderer runs on this device → {onThisDevice:true}', branch: 'Extensions/Developer gating' },
  { in: S55, local: 'Js', name: 'useCoworkMergedIntoAccount', features: ['return Ao();'], contract: 'host keeps Cowork as its own page → false', branch: 'Cowork hidden when true' },
  { in: S55, local: 'Un', name: 'useNotificationsHidden', features: ['return la(Mn);'], contract: 'host General page has notification rows → false (only read in simpleNav, which mh = false keeps off)', branch: 'Notifications (simple nav only)' },
  { in: S55, local: 'lg', name: 'useReflectSections', features: ['ht("cardinal")'], contract: 'GrowthBook cardinal from the host table (not listed → false)', branch: 'Reflect / Time limits' },
  { in: S55, local: 'qs', name: 'useDesignSystemsSection', features: ['e = Vg(),', 't = t_(),'], contract: 'no Design systems service → {show:false,isPending:false}', branch: 'Design systems' },
  { in: S55, local: 'Zg', name: 'useMemorySection', features: ['return hc();'], contract: 'host Memory page (SourceSettingsMemory) → true', branch: 'Memory (/customize/memory, modal only)' },
  { in: S55, local: 'il', name: 'useCustomizePending', features: ['e && t && !n'], contract: 'host customize pages show their own loading state → false', branch: 'modal isPending input z' },
  { in: S55, local: 'Ku', name: 'useAdminSettingsReachable', features: ['WL() === "none"'], contract: 'WL() is "no-raven" without an enterprise (raven) plan; host has none → false (no Organization admin link / title)', branch: 'B: Organization admin link' },
  { in: S55, local: 'Ru', name: 'useAdminLinkPath', features: ['return YL().path;'], contract: 'YL() falls through to {path:"/settings"} without org/admin grants → "/settings" (unused while B is false)', branch: 'V: admin link href' },
  { in: S55, local: 'qe', name: 'useManagedConfig', features: ['e = A(S0, A0);', '{ data: e }'], contract: 'host has no managed (MDM) renderer config → {data:null} (loaded)', branch: 'X pending when data === undefined' },
  { in: S55, local: 'Dr', name: 'useServerGatesLoaded', features: ['serverGateNames: e'], contract: 'host GrowthBook answers are local and synchronous → true', branch: 'X pending when false' },
  { in: S55, local: 'Rn', name: 'usePluginsDisabledCopyFlag', features: ['Vr("__gb__3213217663")'], contract: 'GrowthBook __gb__3213217663 from the host table (not listed → false)', branch: 'Lh plugin-disabled reason copy variant' },
  { in: S55, local: 'sg', name: 'useImportSection', features: ['getImportCapabilities'], contract: 'host import (Preferences › Import from Claude Code, ClaudeImportDialog) exists while the Codex core is connected', branch: 'Import & export' },
  { in: S55, local: 'rg', name: 'useExtensionsSection', features: ['isExtensionsEnabled'], contract: 'no Claude desktop extensions (DXT) runtime → false', branch: 'desktop/extensions' },
  { in: S55, local: 'tg', name: 'useLocalDevMcpEnabled', features: ['isLocalDevMcpEnabled'], contract: 'host Developer page (local MCP servers) → true', branch: 'desktop/developer' },
  // ---- Yg (Customize sections) inputs ----
  { in: S55, local: 'ti', name: 'useSkillsSection', features: ['return e || t || n;'], contract: 'host Customize › Skills → true', branch: 'customize-skills' },
  { in: S55, local: 'Gn', name: 'usePluginsVisibility', features: ['areVisible: !0, disabledReason: void 0'], contract: 'host plugins catalog → {areVisible:true}', branch: 'customize-plugins' },
  { in: S55, local: 'qn', name: 'usePluginsAvailable', features: ['return e || t;'], contract: 'host plugin marketplace → true', branch: 'customize-plugins' },
  { in: S55, local: 'Ju', name: 'usePluginsInChat', features: ['H("claude_ai_plugins_in_chat")'], contract: 'shared-212 tN `e || !1` with e = the plugins catalog being available: host plugins catalog → true', branch: 'customize-plugins shown' },
  { in: S55, local: 'Qn', name: 'useInstalledPlugins', features: ['isCCDContext'], contract: 'count only matters while usePluginsInChat is false; host answers {data:[],isLoading:false}', branch: 'plugin count' },
  { in: S55, local: 'gr', name: 'useMarketplaces', features: ['includeSystemInternal:', 'surface:'], contract: 'count only matters while usePluginsInChat is false; host answers {data:[],isLoading:false}', branch: 'plugin count' },
  { in: S55, local: 'ai', name: 'useAppSurface', features: ['hI[t]', '?? "chat"'], contract: 'host surface (code / chat / cowork) from main.jsx mode, passed to SourceSettings', branch: 'plugin disabled reason in chat surface' },
  // ---- GrowthBook: one host table (src/host-growthbook.mjs), looked up by growthBookFlagKey (name or __gb__ id) ----
  { in: S55, local: 'ht', name: 'useGrowthBookFlag', features: ['.on;'], contract: 'host GrowthBook table by growthBookFlagKey; unlisted flags off (D29/D31). claude_ai_plugins_in_chat (__gb__1179150525) is not listed → false: the chat surface shows customize-plugins disabled with the official reason (CdsDisabledReason)' },
  { in: S55, local: 'Lt', name: 'useGrowthBookFlagWhen', features: ['!t || !n?.growthbook'], contract: 'host GrowthBook table, enabled argument respected' },
  // shared-25 Bg (exported Bg; local Jo): the GrowthBook feature-on hook read by shared-62 bP / _P (unifiedPluginsUi
  // __gb__2406162393, pluginsMergedSkills __gb__254483703) and shared-183 Ch (simple nav __gb__2503656110 && mh, mh = !1).
  { in: S183, local: 'or', name: 'useGrowthBookFeatureOn', features: ['t = _(Jr)', 'es(t, e)', '.on;'], contract: 'host GrowthBook table by growthBookFlagKey (the same answer as shared-0 Uu below)' },
  // shared-0 Uu (exported Rx): the non-hook GrowthBook value reader (forced value, else the client's, else null). Read by
  // shared-62 xP / vP and shared-183 Ah. Host: cds-core-adapter hostGrowthBookFeature (listed boolean, else null).
  { in: S183, local: 'xt', name: 'readGrowthBookValue', features: ['t === void 0 ? zu(e) : t'], contract: 'host GrowthBook table (cds-core-adapter hostGrowthBookFeature): listed boolean, else null (no client)' },
  // ---- telemetry the official settings store emits (no Datadog/o11y on host) ----
  { in: S183, local: 'qr', name: 'releaseInteractionTiming', features: ['t.armedForPath === null'], contract: 'host o11y sink (globalThis.__settingsNavTelemetry ring buffer when present); no network' },
  { in: S183, local: 'yr', name: 'startInteractionTiming', features: ['navigationType: "spa_nav"'], contract: 'host o11y sink (globalThis.__settingsNavTelemetry ring buffer when present); no network' },
  { in: S183, local: 'Mr', name: 'clearInteractionTiming', features: ['zg.delete(e)'], contract: 'host o11y sink (globalThis.__settingsNavTelemetry ring buffer when present); no network' },
  { in: S55, local: 'Ba', name: 'useUnseenAnnouncements', features: ['TU(zU)', 'TU(RU)'], contract: 'no feature-announcement service on host → [] (k_ renders no badge)', branch: 'k_ new-feature dot' },
  // ---- nav row / rail service boundaries (z_ / J_ / q_) ----
  { in: S55, local: 'Ls', name: 'useSectionPrefetch', features: ['Sr(() => gS(e, t), 120)'], contract: 'official hover-prefetches the section lazy chunk; host pages are bundled → undefined (no extra button props)', branch: 'q_ button spread props' },
  { in: S55, local: 'cd', name: 'useCanManageOrgConnectors', features: ['V.EnterpriseAuthManage', 'V.IntegrationsManage'], contract: 'no enterprise ("raven") plan → !e → true', branch: '__ connectors directory reachable' },
  { in: S55, local: 'cc', name: 'useConnectorRequestFlow', features: ['"connector_request_flow_enterprise"'], contract: 'no enterprise connector request flow → false' },
  // ---- branches the host never enters: fail loud if reached (no silent no-op) ----
  { in: S55, local: 'Dt', name: 'RouterLink', unreachable: true, features: ['new URL(f, window.location.href)', 'target: c,'], contract: 'only the Organization admin link (useAdminSettingsReachable false) and the Platform API keys link (y_ false: no api-capable organization membership) render it' },
  { in: S55, local: 'Ue', name: 'useConfiguration', unreachable: true, features: ['"useConfiguration must be called from within ConfigurationProvider"'], contract: 'read only by x_ (Platform API keys link, consoleAbsoluteUrl), which y_ = useGrowthBookFlagWhen("claudeai_settings_platform_link", an api-capable organization membership) keeps out: the host account has no memberships' },
  { in: S55, local: 'Ri', name: 'useAnalytics', unreachable: true, features: ['return ZS;'], contract: 'shared-62 OT (the Segment track queue) is read only by x_ (Platform link shown/clicked events), which the host never renders (see useConfiguration); no analytics on host' },
  { in: S55, local: 't_', name: 'UnifiedPluginsMergedPage', unreachable: true, features: ['uh({ mergedPage: n, unifiedPluginsUi: !0 })'], contract: 'only when unifiedPluginsUi (shared-62 bP: __gb__2406162393) is on; the host table does not list it → e_ calls children(false,"off")' },
  { in: S55, local: 'Q_', name: 'PluginsDisabledPopover', unreachable: true, features: ['unsupportedCode:'], contract: 'only for group.pluginsDisabledReason (org policy / unsupported plugins); host Gn answers areVisible:true → none' },
  { in: S55, local: 'P_', name: 'PluginsShownByPopover', unreachable: true, features: ['"customize_merged_page_coachmark"'], contract: 'lazy coachmark (c457887ec); only when customize-plugins stands for merged sections (shownByPlugins), i.e. unified plugins UI; host off' },
  { in: S55, local: 'E_', name: 'SectionAnnouncementDot', unreachable: true, features: ['kinds:', 'unseen:'], contract: 'only when useUnseenAnnouncements is non-empty; host answers []' },
];

// Resolve cuts into runSlicer adapters / localAdapters, asserting features and recording the resolved declaration.
export async function resolveCuts(cache = new Map()) {
  const adapters = {}, localAdapters = {}, resolved = [], names = new Set();
  for (const cut of cuts) {
    if (names.has(cut.name)) throw Error(`settings-nav cut name ${cut.name} used twice`);
    names.add(cut.name);
    const src = await readSource(cut.in, cache, official.ionSource);
    const entry = src.top.get(cut.local);
    if (!entry) throw Error(`settings-nav cut ${cut.in}#${cut.local} is not a top-level binding`);
    let file = cut.in, local = cut.local, alias = null, dep = src, decl = entry;
    if (entry.kind === 'import') {
      file = entry.file; alias = entry.alias;
      dep = await readSource(file, cache, official.ionSource);
      local = dep.exported.get(alias);
      decl = dep.top.get(local);
      if (!decl || decl.kind === 'import') throw Error(`settings-nav cut ${cut.in}#${cut.local} -> ${file}:${alias} is not a declaration (re-export)`);
    }
    assertFeatures(`settings-nav cut ${cut.name} (${file}#${local})`, await featureText(dep, decl), cut.features);
    const declarationSha256 = sha(dep.code.slice(decl.node.start, decl.node.end));
    if (alias !== null) {
      adapters[file] ??= {};
      if (adapters[file][alias]) throw Error(`settings-nav cut ${cut.name}: ${file}:${alias} already cut as ${adapters[file][alias].name}`);
      adapters[file][alias] = { name: cut.name, local, features: cut.features };
    } else localAdapters[`${file}#${local}`] = { name: cut.name, features: cut.features };
    resolved.push({ name: cut.name, importer: `${cut.in}#${cut.local}`, file, local, export: alias, kind: alias === null ? 'local' : 'import',
      declarationSha256, sourceSha256: sha(dep.bytes), unreachable: cut.unreachable === true });
  }
  return { adapters, localAdapters, resolved };
}

const byFile = new Map();
for (const r of roots) {
  if (!byFile.has(r.file)) byFile.set(r.file, { exports: {}, features: {}, internal: false });
  const m = byFile.get(r.file);
  m.exports[r.local] = r.semantic; m.features[r.local] = r.features; if (r.export === null) m.internal = true;
}

// One generated module per chunk the closure enters (vendor-frame, rolldown-runtime and preload-helper are no longer
// entered: cds-core publishes useDirection / clsx and the runtime helpers this closure used to copy).
const chunkTargets = [
  [official.sharedFrame, 'shared-frame.mjs'], ['shared-0-CnnWnVrT.js', 'shared-0.mjs'], ['shared-62-DoCqVpIq.js', 'shared-62.mjs'],
  ['shared-153-DMw2VzSq.js', 'shared-153.mjs'], [official.vendorIntl, 'vendor-intl.mjs'], ['shared-9-BgdM6Y1f.js', 'shared-9.mjs'],
  ['shared-18-Cfqwgjc5.js', 'shared-18.mjs'], ['shared-36-fqRFYwOb.js', 'shared-36.mjs'], ['vendor-all-0-uUCo-eCX.js', 'vendor-all-0.mjs'],
  ['shared-92-BOgyxePb.js', 'shared-92.mjs'], ['shared-25-D-aF0gt9.js', 'shared-25.mjs'], ['shared-123-1Hc1RTKl.js', 'shared-123.mjs'],
  ['shared-33-DtdykY0y.js', 'shared-33.mjs'], ['shared-19-UalAfDtn.js', 'shared-19.mjs'],
  [S183, 'settings-store.mjs'], [S55, 'settings-nav.mjs'],
];

export async function buildConfig(cache = new Map()) {
  const { adapters, localAdapters, resolved } = await resolveCuts(cache);
  return { resolved, config: {
    name: 'settings-nav (4.16336.0)', generator: 'scripts/extract-settings-nav-v4.mjs',
    sourceContract: official, referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
    source: official.ionSource, vendor: { [official.vendorFrame]: official.reactAliases },
    generatedRoot, output,
    adapterModule: '../../settings-nav-adapter.mjs', adapterFile,
    sharedGraph: 'cds-core', adapters,
    localAdapters: {
      [`${official.vendorFrame}#i`]: { name: 'loadHostReact', features: ['t.exports = r();'] },
      [`${official.vendorFrame}#ce`]: { name: 'hostJsxRuntime', features: ['t.exports = se();'] },
      [`${official.vendorFrame}#be`]: { name: 'hostReactDom', features: ['e(me())'] },
      ...localAdapters,
    },
    modules: chunkTargets.map(([source, target]) => {
      const r = byFile.get(source);
      return r ? { source, target, exports: r.exports, features: r.features, ...(r.internal ? { internal: true } : {}) } : { source, target };
    }),
  } };
}

const flat = text => text.replace(/\s+/g, '');
// AST uniqueness: the root must be the only top-level declaration of its chunk that carries every feature.
export async function rootMatches(r, cache) {
  const src = await readSource(r.file, cache, official.ionSource), seen = new Set();
  const matches = [];
  for (const [name, e] of src.top) {
    if (e.kind === 'import' || seen.has(e.node)) continue;
    seen.add(e.node);
    const text = flat(await featureText(src, e));
    if (r.features.every(f => text.includes(flat(f)))) matches.push(name);
  }
  return { src, matches };
}

// Reviewed inputs (pins): snapshot bytes of every chunk, root declarations (+ official export alias), cut declarations,
// the host adapter bytes and the production cds-core manifest this graph links.
export async function preflight(pins, resolved, cache) {
  if (pins.referenceVersion !== official.referenceVersion || pins.referenceSnapshot !== official.referenceSnapshot) throw Error('settings-nav pins: version/snapshot mismatch');
  for (const [file, hash] of Object.entries(pins.sources)) if (sha(await fs.readFile(path.join(official.ionSource, file))) !== hash) throw Error(`settings-nav pinned source changed: ${file}`);
  for (const r of roots) {
    const { src, matches } = await rootMatches(r, cache);
    if (matches.length !== 1 || matches[0] !== r.local) throw Error(`settings-nav root ${r.semantic}: features match ${JSON.stringify(matches)}, expected only ${r.local}`);
    const node = src.top.get(r.local)?.node, pin = pins.roots[r.semantic];
    if (!node || !pin || sha(src.code.slice(node.start, node.end)) !== pin.declarationSha256) throw Error(`settings-nav root changed: ${r.semantic}`);
    const alias = [...src.exported].find(([, l]) => l === r.local)?.[0] ?? null;
    if (alias !== r.export) throw Error(`settings-nav root ${r.semantic}: export is ${alias}, expected ${r.export}`);
  }
  for (const c of resolved) {
    const pin = pins.cuts[c.name];
    if (!pin || pin.file !== c.file || pin.local !== c.local || pin.declarationSha256 !== c.declarationSha256 || pin.unreachable !== c.unreachable) throw Error(`settings-nav cut changed: ${c.name}`);
  }
  if (Object.keys(pins.cuts).length !== resolved.length) throw Error('settings-nav: cut set differs from pins');
  if (sha(await fs.readFile(path.join(appRoot, adapterFile))) !== pins.hostAdapterSha256) throw Error('settings-nav adapter changed without review (pins.hostAdapterSha256)');
  if (sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))) !== pins.cdsCore.manifestSha256) throw Error('cds-core manifest differs from the one settings-nav pins (re-review: cds-core changed)');
}

export async function extractSettingsNav(options = {}) {
  const pins = JSON.parse(await fs.readFile(pinsFile, 'utf8'));
  const cache = new Map();
  const { config, resolved } = await buildConfig(cache);
  await preflight(pins, resolved, cache);
  config.artifacts = manifest => ({ 'provenance.json': JSON.stringify(provenance(manifest, resolved, pins), null, 2) + '\n' });
  return runSlicer(config, options);
}

function provenance(manifest, resolved, pins) {
  return {
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, migrationComplete: false,
    scope: 'settings navigation (rail, stacked tabs, group rows, section hook, modal store); settings container and pages are not sliced here',
    sharedGraph: { area: 'cds-core', manifestSha256: pins.cdsCore.manifestSha256 },
    roots: roots.map(r => ({ semantic: r.semantic, file: r.file, local: r.local, export: r.export, oldCounterpart: r.oldCounterpart, declarationSha256: pins.roots[r.semantic].declarationSha256 })),
    cuts: resolved.map(c => ({ name: c.name, importer: c.importer, file: c.file, local: c.local, export: c.export, declarationSha256: c.declarationSha256, unreachable: c.unreachable,
      contract: cuts.find(x => x.name === c.name).contract })),
    heldCopiesOfCdsCore: manifest.modules.flatMap(m => m.heldByViewTabs.map(name => `${m.source}#${name}`)),
    linkedPublicNames: [...new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'shared-graph').map(i => i.name)))].sort(),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractSettingsNav({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
