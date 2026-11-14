// Settings › Desktop (settings-desktop-v4, 4.16336.0): slices the official desktop settings route component from the frozen
// snapshot with the shared runSlicer engine (scripts/extract-working-line.mjs) under the 4.16336.0 source contract
// (scripts/official-4.16336.0.mjs), linked to the cds-core shared graph (sharedGraph 'cds-core') and, for the settings
// modal store only, to the settings-nav graph (linkedAreas: settings-nav exports shared-183 yg settingsModalStore; the
// desktop page's Storage row reads its pendingAction / setPendingAction).
//
// Plan: analysis/claude-4.16336.0-migrate-20261104/round4/settings/design/plan.json split.lanes[B] (lane "desktop").
// Official route table cf4f70727-BlN3pGWP.js#In (settingsComponentsByPath): desktop → c71860c77-B4INzBZs.js default Vs,
// shown on the desktop app (shared-55 Kg `D = ng()`, useIsDesktopApp true; nav group "This computer", label "System").
//
//   c71860c77-B4INzBZs.js  Vs (default)  DesktopSettingsPage: `main.flex flex-col` > xs
//                          xs            the page body (react-compiler memo cache J9(116)):
//                                        - while the supported desktop features are unknown (`d` null: AppFeatures bridge
//                                          present, getSupportedFeatures pending) the official skeleton: SettingsSection
//                                          "System" with Io + three skeleton rows (Ms);
//                                        - SettingsSection id general-desktop "System": Io Desktop app version, ko (ancient
//                                          journal notice, server gate), Run on startup, the quick entry / voice / dictation
//                                          shortcut rows (desktop feature gated), Menu bar (System tray on win32/linux),
//                                          Keep computer awake (Rs, c1e3f823e keepAwakeEnabled pref present), Storage (no),
//                                          gs (hub-look backed: Kt / trust / Dispatch), Mr (Gorse notice);
//                                        - ps (sableOtter, desktop feature gated), ho / _s Browser use, Vt Computer use
//                                          (shared-26 ac gate), Is Extensions (only when the desktop/extensions route is
//                                          registered), all inside c51ac4bf6 _e scope "device".
//
// Service boundaries are CUTS below, written like scripts/extract-settings-pages-v4.mjs: each names the importer chunk and
// the importer's local binding as it appears in the official source; the generator resolves it through the importer's
// import table to the exporting chunk/alias/declaration (an import cut becomes runSlicer `adapters[file][alias]`, a local
// cut `localAdapters[file#local]`), asserts `features` on that declaration and checks its SHA-256 against the reviewed
// pins (scripts/settings-desktop-v4-pins.json). `contract` says which host fact answers it (src/settings-desktop-adapter.mjs
// over the SettingsDesktopHost value src/source-settings-desktop.jsx builds). `unreachable: true` marks a cut whose
// official caller can never run on this page (the proof is in `branch`); its adapter export throws if it is ever reached.
//
// Roots are located on the official AST: each must be the only top-level declaration of its chunk carrying all its
// features (re-proved on every run), and its declaration hash and export alias must equal the pins.
//
// pins (scripts/settings-desktop-v4-pins.json) are a reviewed input: this generator never writes them. The explicit review
// step is analysis/claude-4.16336.0-migrate-20261104/round4/settings/desktop/tools/pin.mjs (refuses to overwrite without
// --replace). `node scripts/extract-settings-desktop-v4.mjs` writes src/generated/settings-desktop-v4; `--check` compares
// byte for byte (scripts/verify-gen-settings-desktop.mjs, found by prepare-ui); `--dry-run` writes nothing.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import * as official from './official-4.16336.0.mjs';

const appRoot = path.resolve(import.meta.dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const generatedRoot = path.join(appRoot, 'src/generated');
export const output = path.join(generatedRoot, 'settings-desktop-v4');
export const pinsFile = path.join(import.meta.dirname, 'settings-desktop-v4-pins.json');
export const adapterFile = 'src/settings-desktop-adapter.mjs';
export const DESK = 'c71860c77-B4INzBZs.js';
export const C51 = 'c51ac4bf6-BiJ5KnQb.js';

export const roots = [
  { semantic: 'DesktopSettingsPage', file: DESK, local: 'Vs', export: 'default', oldCounterpart: '3.6556.2 c71860c77-B72Ova_w It (host System group in src/source-settings.jsx)',
    features: ['className: "flex flex-col"', 'children: r(xs, {})'] },
];

// Host adapter contract. Each cut is a service the official desktop page reads that the host answers from its own facts.
export const cuts = [
  // ---- i18n (react-intl over the host catalog: cds-core-adapter useHostIntl / HostFormattedMessage) ----
  // vendor-intl p (q) / l (Gt): every importer in the closure (c71860c77, c51ac4bf6, shared-1 …) resolves the same alias.
  { in: DESK, local: 'Y', name: 'useIntl', features: ['return (Mt(e), e);'], contract: 'host i18n (electron/i18n t/getLocale): formatMessage({defaultMessage,id}, values) / messages' },
  { in: DESK, local: 'J', name: 'FormattedMessage', features: ['(Wt, Ut)'], contract: 'host i18n: <FormattedMessage defaultMessage id values/>' },
  // ---- desktop preload bridges (module-load reads of globalThis["claude.settings"]) ----
  // The host has no claude.settings preload. The bridges whose facts the host owns are answered by host bridge objects with
  // the official method names and shapes (src/settings-desktop-adapter.mjs); the others stay sliced and read undefined,
  // the official no-bridge branch.
  // shared-25 Pi (export K_) Startup: xs reads isStartupOnLoginEnabled / isMenuBarEnabled (initial values, only when
  // GlobalShortcut.getGlobalShortcut exists too) and calls setStartupOnLoginEnabled / setMenuBarEnabled.
  { in: DESK, local: 'de', name: 'hostStartup', features: ['globalThis["claude.settings"]?.Startup'],
    contract: 'host login item (electron/desktop-settings.cjs setStartup / snapshot runOnStartup through desktopCall "desktop-startup") and the saved menuBarEnabled preference (electron/menu-bar.cjs tray)' },
  // shared-25 Ii (export H_) GlobalShortcut: getGlobalShortcut / setGlobalShortcut (the legacy Quick Entry shortcut row).
  { in: DESK, local: 'ue', name: 'hostGlobalShortcut', features: ['globalThis["claude.settings"]?.GlobalShortcut'],
    contract: 'the host registers no Quick Entry shortcut (no quick entry window): getGlobalShortcut → "" ; setGlobalShortcut rejects. The row itself is hidden by AppFeatures quickEntryGlobalShortcut unsupported' },
  // shared-25 Bi (export M_) AppPreferences: getPreferences / onPreferencesChanged / setPreference (quickEntryShortcut,
  // dictationShortcut, keepAwakeEnabled, sableOtterEnabled, allowAllBrowserActions, chicago*).
  { in: DESK, local: 'G', name: 'hostAppPreferences', features: ['globalThis["claude.settings"]?.AppPreferences'],
    contract: 'host saved desktop preferences under the official desktopPref keys the host keeps (keepAwakeEnabled: electron/desktop-settings.cjs, main "keep-awake-read" / "settings"); keys without a host fact are absent (official `!== void 0` / `?? default` branches)' },
  // shared-25 Vi (export j_) AppFeatures: getSupportedFeatures() → { [feature]: { status } } (nativeQuickEntry,
  // quickEntryGlobalShortcut, quickEntryDictation, customQuickEntryDictationShortcut, sableOtter, trayIcon …).
  { in: DESK, local: 'ye', name: 'hostAppFeatures', features: ['globalThis["claude.settings"]?.AppFeatures'],
    contract: 'host desktop feature table (src/host-app-features.mjs HOST_APP_FEATURES) + the desktop-page entries the host answers: nativeQuickEntry / quickEntryDictation unavailable, quickEntryGlobalShortcut unsupported (no quick entry window), sableOtter absent' },
  // c71860c77 Lo: `V(navigator.userAgent)`, the desktop app version parsed from the official "Claude/<version>" user agent.
  { in: DESK, local: 'Lo', name: 'desktopAppVersion', features: ['return V(navigator.userAgent);'],
    contract: 'host build version (build-info.json version, the same value the host System page showed) or null while unknown' },
  // shared-123 Zc (kB): server gate (AB: the claude.ai boot configuration's serverGateNames / loaded server gate store) &&
  // GrowthBook flag. ko reads Me(_o) (ancient journal notice).
  { in: DESK, local: 'Me', name: 'useServerGatedFeature', features: ['AB(e)', 'V(e)'],
    contract: 'host has no claude.ai boot configuration and loads no server gate store (as settings-pages-adapter useServerGatedFeature): false' },
  // ---- unreachable on this page ----
  // c51ac4bf6 Oe: the stock desktopPref binding of the official Setting (je). je takes it only when no `binding` prop is
  // given; every je call on this page (xs: Run on startup, Quick access / Quick Entry / Voice / Dictation shortcut, Menu
  // bar) passes an object-literal binding, so Oe never renders here. Not sliced: its store (c6673aecb) is
  // settings-pages-v4's.
  { in: C51, local: 'Oe', name: 'StockDesktopPrefSetting', unreachable: true, features: ['t(Q, {'],
    branch: 'c51ac4bf6 je: `if (r) return … t(Q, { ...i, binding: r })`; the six je calls in c71860c77 xs all pass binding',
    contract: 'unreachable: throws if rendered' },
  // c71860c77 ho: Browser use (allow all browser actions + Connected browsers mo). xs renders it only under
  // `re && V && ie && p`, ie = Ht() = cd55d696d w `return (r(), !1)`, a constant false.
  { in: DESK, local: 'ho', name: 'BrowserUseSection', unreachable: true, features: ['"allowAllBrowserActions"', 'cowork_chrome_automode_default_main'],
    branch: 'xs Ne: `re && V && ie && p ? r(ho, …) : ae && r(_s, { ownGroup: !0 })`, ie = cd55d696d w → false',
    contract: 'unreachable: throws if rendered' },
  // c9599aae9 i (vendor-intl c → Jt = qt): react-intl IntlProvider, rendered only by the wording overlay c9599aae9 l
  // (reached through Computer use ca537d078 → ce2191564 h) when its message overrides are on: `f === null ? n : e(i, …)`,
  // f = `d ? c(u.messages, s(u, o, l)) : null`, d = shared-183 Ch (export h_) `or("__gb__2503656110") && mh` with
  // `mh = !1` (the simpleNav constant, round4/settings/design officialGateFacts). So the overlay always renders its
  // children and no IntlProvider mounts; not sliced (vendor-intl F, its nested cache, is the chat graph's copy).
  { in: 'c9599aae9-CBm-7_M3.js', local: 'i', name: 'IntlProviderOverlay', unreachable: true, features: ['var Jt = qt;'],
    branch: 'c9599aae9 l: f === null ? n : e(i, …); f null because shared-183 Ch = `… && mh`, mh = !1',
    contract: 'unreachable: throws if rendered' },
  // ---- Dispatch (gs › qt › cfea69990 R, shown only while the hub look is backed: shared-18 hg) ----
  // shared-18 ZV: `YV() === "allowed"`, the Dispatch availability over claude.ai (UV kd("dittos"), GrowthBook, the
  // local-sessions store Zi → shared-123 _S, which frame-sidebar-nav holds). The host has no claude.ai Dispatch: the
  // same answer as the reviewed cowork-settings-v4 boundary (src/source-cowork-settings-v4-adapters.jsx useDispatchAllowed).
  { in: 'cfea69990-Cqha5dsf.js', local: 'S', name: 'useDispatchAllowed', features: ['return YV() === "allowed";'],
    contract: 'no claude.ai Dispatch on the host: false (as cowork-settings-v4 useDispatchAllowed)' },
  // ---- Storage (xs Se = no: row "Storage" + dialog Fa) ----
  // shared-5 _c (yA): `Mt() && onThisDevice && !!Xe?.getUsage` — desktop app, this device, DeviceStorage bridge. The host
  // keeps its own storage report (electron/main.cjs "desktop-storage": storageReport, the 3.6556.2-modelled areas), not the
  // claude.web DeviceStorage bridge, so the gate is answered from that fact: the host storage report is available.
  { in: DESK, local: 'dt', name: 'useStorageSettingsAvailable', features: ['!!Xe?.getUsage'],
    contract: 'host storage report available (desktopCall "desktop-storage" present on the host value): true; the official no row (Storage / Manage) and its open-storage pending action / ?open_storage param stay official' },
  // c71860c77 Fa: the Storage dialog (CDS Dialog: header "Storage" / "Space Claude uses on this computer.", Ra usage rows over
  // DeviceStorage / CoworkStorage / ClaudeCode cleanup bridges). Host: its Storage dialog over the host storage report
  // (src/source-settings-pages.jsx StorageDialog: same header copy, the host areas, Clean up / Clear cache actions).
  { in: DESK, local: 'Fa', name: 'StorageDialog', features: ['defaultMessage: "Space Claude uses on this computer."', 'size: "lg"'],
    contract: 'host Storage dialog ({ open, onOpenChange } → src/source-settings-pages.jsx StorageDialog over desktopCall "desktop-storage" while open)' },
  // ---- account / errors (contexts cds-core holds: settings_shared25_Dz, ctx_shared62_qN) ----
  // shared-25 Z (export yi): the CurrentAccountProvider value (throws outside one). Readers here: xs Se (Mo / br account
  // uuid), shared-25 GB / uV / vV / xV, shared-92 r_ / E_, shared-123 Oy / bC / nB, shared-212, shared-26 $h / ig / ag,
  // shared-18 Mr readers, c51ac4bf6 w. Host: the local profile (as settings-pages-adapter / settings-nav-adapter).
  { in: 'shared-25-D-aF0gt9.js', local: 'Z', name: 'useCurrentAccount', features: ['"Must call inside CurrentAccountProvider"'],
    contract: 'host local profile (settings-shell-model LOCAL_PROFILE_ACCOUNT: no claude.ai organization, settings {})' },
  // shared-25 VB (export bi): `_(Dz)`, the CurrentAccount context value or undefined (xs _e, c51ac4bf6 S / H, shared-26 It,
  // shared-25 qB / hQ, shared-123 Xn). Host: the same local profile value.
  { in: 'shared-25-D-aF0gt9.js', local: 'VB', name: 'useOptionalCurrentAccount', features: ['_(Dz)'],
    contract: 'host local profile (the same value as useCurrentAccount)' },
  // shared-62 rP (export zl): useErrors() = useContext(ErrorsProvider) (c71860c77 br Ge, cfea69990 P / I / R b).
  { in: 'shared-62-DoCqVpIq.js', local: 'rP', name: 'useErrors', features: ['"Must be called within ErrorsProvider"'],
    contract: 'host errors: { addError → danger toast, addSuccess, … } (source-routines-shared-adapters.jsx useErrors, as settings-pages-host)' },

  // ---- Keep computer awake (xs xe = Rs, gated by c1e3f823e n; its control zs is c6ad19bb9 t KeepAwakeSwitch) ----
  // c1e3f823e o / a / l: the keepAwakeEnabled desktop-pref store reads and writer, the same three boundaries the reviewed
  // cowork-scheduled graph answers (scripts/extract-cowork-scheduled.mjs adapters c1e3f823e-Dly84_dq.js), over the one host
  // store src/keep-awake-model.mjs keepAwakeStore (main "keep-awake-read" / "settings" keepAwakeEnabled; electron/
  // desktop-settings.cjs holds the computer awake while it is on).
  { in: 'c1e3f823e-Dly84_dq.js', local: 'o', name: 'useKeepAwakeAvailable', features: ['let e = i.useHasKey(),', 'return e && n;'],
    contract: 'host keepAwakeStore hasKey (main always hands keepAwakeEnabled over) && this desktop build keeps the computer awake (supported)' },
  { in: 'c1e3f823e-Dly84_dq.js', local: 'a', name: 'useKeepAwakeEnabled', features: ['a = i.useEnabled'],
    contract: 'host keepAwakeStore enabled' },
  { in: 'c1e3f823e-Dly84_dq.js', local: 'l', name: 'useKeepAwakeWriter', features: ['event_key: "claudeai.desktop.keep_awake_toggled",'],
    contract: 'host keepAwakeStore.set(value) (saves through main, rolls back on failure); no telemetry' },

  // shared-7 FI: the lazily loaded effort slider (`import("./c8e04f916-…")` EffortControl), reached only through ps
  // (sableOtter: Qo › c7b47b35d m › … › shared-7 aL). xs renders ps only when `$e(d, "sableOtter").status === "supported"`;
  // the host AppFeatures answer has no sableOtter entry (no sableOtter on this host) → U_ reads unavailable → ps is never
  // rendered. The lazy chunk is not shipped (the same boundary code-routines-v4 / cowork-scheduled-v4 cut).
  { in: 'shared-7-D2e77H6v.js', local: 'FI', name: 'EffortControlSlot', unreachable: true, features: ['import("./c8e04f916-DxnnNQyG.js")', 'default: e?.EffortControl ?? II'],
    branch: 'xs Oe: `p && (z || p.sableOtterEnabled) && $e(d, "sableOtter").status === "supported" ? r(ps, …) : null`; host AppFeatures has no sableOtter',
    contract: 'unreachable: throws if rendered' },

  // ce3a18f86 r: the lazily loaded PreviewAllowedSitesModal (Browser use › Allowed sites, cdc95db1a p, under _s when the hub
  // look is backed). The lazy chunk is not shipped; host: its Allowed sites dialog (the same answer as the reviewed
  // cowork-settings-v4 boundary, src/source-cowork-settings-adapters.jsx PreviewAllowedSitesModal).
  { in: 'ce3a18f86-Dmeg0yYT.js', local: 'r', name: 'PreviewAllowedSitesModal', features: ['id: "preview_allowed_sites_modal",', 'pick: (e) => e.PreviewAllowedSitesModal,'],
    contract: 'host Allowed sites dialog ({ isOpen, onClose } → src/source-preview-allowed-sites.jsx SourcePreviewAllowedSites over desktopCall, settings layer)' },

  // c71860c77 Mo: the ancient-journal move notice (account move, links out through shared-62 tN › shared-25 Uy, the router
  // navigation writer cds-core holds). ko renders it only under `s && c`, s = `i && o`: i = Me(_o) (useServerGatedFeature,
  // false: no server gate store on the host) and o = `pe(() => n?.ancientJournalState !== void 0, !1)` over the claude.web
  // AutoUpdater bridge oe (shared-0 oh = hO), which the host does not expose (official no-bridge: false). Both are false, so Mo never renders.
  { in: DESK, local: 'Mo', name: 'AncientJournalNotice', unreachable: true, features: ['{ bridge: t, reported: n, held: i } = e,', '{ kind: "idle", moved: null }'],
    branch: 'ko: `s && c ? r(Mo, …) : null`, s = Me(_o) (host server gate false) && ancientJournalState bridge present (no claude.web AutoUpdater bridge on the host)',
    contract: 'unreachable: throws if rendered' },

  // shared-25 sd: useSearchParams (TanStack router location search: vendor-router Ar reads `router.stores`, null without a
  // RouterProvider). Read by c2d87f9e7 o, the settings pending-action / URL-param flash hook the Storage row (no) runs for
  // `?open_storage`. The host Settings dialog has no URL: its open-storage entry is the host anchor (SourceSettings
  // anchorRow 'open-storage' opens the host Storage dialog), so the dialog's search is empty. The same boundary
  // routines-shared / sessions-page-v4 cut (useSearchParams over the host's notional location).
  { in: 'shared-25-D-aF0gt9.js', local: 'sd', name: 'useSearchParams', features: ['t = e === null ? null : e.searchParamsString,'],
    contract: 'the host Settings dialog has no URL search: an empty URLSearchParams (no ?open_storage param; the settings modal store pendingAction stays official)' },

  // ---- GrowthBook: the one host table (src/host-growthbook.mjs); unlisted flags are off (D29 / D31) ----
  // shared-25 go: `ho(ro(), e)`, the GrowthBook feature result { value, on } for a hashed key (ko .on, Do string value, Eo
  // object value); without a GrowthBookProvider io throws. The same boundary frame-sidebar-v4 / cowork-scheduled cut.
  { in: 'shared-25-D-aF0gt9.js', local: 'go', name: 'useGrowthBookFeature', features: ['return ho(ro(), e);'],
    contract: 'host GrowthBook table: a listed flag → { value, on: value === true }, unlisted → { value: null, on: false, off: true }' },
  // shared-25 Go (export yg): the GrowthBook feature value. It calls ts(e) (vendor-flags Ht: throws without a GrowthBookProvider)
  // before its own `if (!t?.growthbook) return;`. Read by c51ac4bf6 C (the stock desktopPref settings kit, hydrated on the
  // client). The same boundary settings-pages-v4 cuts (c51ac4bf6 C useGrowthBookFeatureValue).
  { in: 'shared-25-D-aF0gt9.js', local: 'Go', name: 'useGrowthBookFeatureValue', features: ['t?.growthbook', 'Ko(t, H(e))'],
    contract: 'host GrowthBook table: the listed boolean, else undefined (unlisted = no GrowthBook answer, the official fallback runs)' },
  // shared-25 is: the GrowthBook dynamic config `is(name, fallback, schema)` (`ho(ro(), …)`: io throws without a
  // GrowthBookProvider). Readers on this page: shared-18 En (yukon_silver_config / cowork_subagent_model), shared-92 Kn
  // (tengu_hollow_lantern), shared-153 Gr, shared-212 sr. The same answer as the reviewed code-routines / routine-cowork
  // boundary (useDynamicConfig: the caller's default).
  { in: 'shared-25-D-aF0gt9.js', local: 'is', name: 'useDynamicConfig', features: ['{ type: "dynamic_config", name: e }'],
    contract: 'no GrowthBook dynamic configs on the host: the caller\'s fallback (as source-code-routines-adapters / source-routine-cowork-adapters useDynamicConfig)' },

  // shared-0 y4: useConfiguration (the web app's boot configuration; shared-123 NB reads its serverGateNames for AB, the
  // server gate xs reads through ke = shared-123 $c). The host renderer has no claude.ai boot configuration: the same
  // answer as the reviewed cowork-scheduled boundary (src/source-routine-cowork-adapters.jsx useAppConfiguration).
  { in: 'shared-0-CnnWnVrT.js', local: 'y4', name: 'useAppConfiguration', features: ['"useConfiguration must be called from within ConfigurationProvider"'],
    contract: 'no claude.ai boot configuration: {} (no serverGateNames, so AB falls back to the unloaded server gate store: off)' },

];

// Resolve cuts into runSlicer adapters / localAdapters, asserting features and recording the resolved declaration.
export async function resolveCuts(cache = new Map()) {
  const adapters = {}, localAdapters = {}, resolved = [], names = new Set();
  for (const cut of cuts) {
    if (names.has(cut.name)) throw Error(`settings-desktop cut name ${cut.name} used twice`);
    names.add(cut.name);
    const src = await readSource(cut.in, cache, official.ionSource);
    const entry = src.top.get(cut.local);
    if (!entry) throw Error(`settings-desktop cut ${cut.in}#${cut.local} is not a top-level binding`);
    let file = cut.in, local = cut.local, alias = null, dep = src, decl = entry;
    if (entry.kind === 'import') {
      file = entry.file; alias = entry.alias;
      dep = await readSource(file, cache, official.ionSource);
      local = dep.exported.get(alias);
      decl = dep.top.get(local);
      if (!decl || decl.kind === 'import') throw Error(`settings-desktop cut ${cut.in}#${cut.local} -> ${file}:${alias} is not a declaration (re-export)`);
    }
    assertFeatures(`settings-desktop cut ${cut.name} (${file}#${local})`, await featureText(dep, decl), cut.features);
    const declarationSha256 = sha(dep.code.slice(decl.node.start, decl.node.end));
    if (alias !== null) {
      adapters[file] ??= {};
      if (adapters[file][alias]) throw Error(`settings-desktop cut ${cut.name}: ${file}:${alias} already cut as ${adapters[file][alias].name}`);
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

// One generated module per chunk the closure enters (target names are this graph's own; the compiler runtime and the
// published cds-core / settings-nav names are linked, not sliced).
export const chunkTargets = [
  [DESK, 'desktop-page.mjs'],
  ['preload-helper-BBljBeZo.js', 'preload-helper.mjs'], ['vendor-query-Bl2Kfzgk.js', 'vendor-query.mjs'],
  ['vendor-all-0-uUCo-eCX.js', 'vendor-all-0.mjs'], ['shared-0-CnnWnVrT.js', 'shared-0.mjs'],
  ['vendor-zod-fszujTq6.js', 'vendor-zod.mjs'],
  ['vendor-frame-BckkO60Y.js', 'vendor-frame.mjs'],
  ['vendor-router-Cs51FAGQ.js', 'vendor-router.mjs'], ['shared-25-D-aF0gt9.js', 'shared-25.mjs'],
  ['shared-frame-CJdE5Ria.js', 'shared-frame.mjs'], ['vendor-intl-BJgYK7RA.js', 'vendor-intl.mjs'],
  ['shared-153-DMw2VzSq.js', 'shared-153.mjs'], ['shared-62-DoCqVpIq.js', 'shared-62.mjs'], ['shared-92-BOgyxePb.js', 'shared-92.mjs'],
  ['shared-123-1Hc1RTKl.js', 'shared-123.mjs'], ['shared-212-BHMAi0oa.js', 'shared-212.mjs'], ['shared-1-D1bGaTaN.js', 'shared-1.mjs'],
  ['shared-36-fqRFYwOb.js', 'shared-36.mjs'], ['c0fe64a00-Bijs8_8F.js', 'c0fe64a00.mjs'],
  ['shared-26-B-POtn5S.js', 'shared-26.mjs'], ['cd55d696d-FUob_YwE.js', 'cd55d696d.mjs'],
  ['shared-4-C_EiQb9h.js', 'shared-4.mjs'], ['shared-18-Cfqwgjc5.js', 'shared-18.mjs'], ['cd14a8022-CCTq5nc1.js', 'cd14a8022.mjs'],
  ['shared-8-BqfCbkJd.js', 'shared-8.mjs'], ['c27343114-Bh0Hy-eV.js', 'c27343114.mjs'],
  ['c51ac4bf6-BiJ5KnQb.js', 'c51ac4bf6.mjs'], ['c7357c32b-CYgkZ_Hd.js', 'c7357c32b.mjs'], ['c1e3f823e-Dly84_dq.js', 'c1e3f823e.mjs'],
  ['c6ad19bb9-BHM84I90.js', 'c6ad19bb9.mjs'], ['shared-5-u8kha2eH.js', 'shared-5.mjs'], ['shared-183-B2N6Zy4J.js', 'shared-183.mjs'],
  ['cee6df3f4-D3si2fZf.js', 'cee6df3f4.mjs'], ['cfea69990-Cqha5dsf.js', 'cfea69990.mjs'], ['shared-33-DtdykY0y.js', 'shared-33.mjs'],
  ['c03547424-CImlgKdT.js', 'c03547424.mjs'], ['c2d87f9e7-Bk6d74Ey.js', 'c2d87f9e7.mjs'], ['cabd7b1c1-CAF7rZLU.js', 'cabd7b1c1.mjs'],
  ['c0db37792-BTkaIv78.js', 'c0db37792.mjs'], ['shared-7-D2e77H6v.js', 'shared-7.mjs'], ['c7b47b35d-BJQdl9_g.js', 'c7b47b35d.mjs'],
  ['shared-6-2QYRw_Wv.js', 'shared-6.mjs'], ['ce61829b3-DN3TmwtQ.js', 'ce61829b3.mjs'],
  ['cdc95db1a-Dwi18fP3.js', 'cdc95db1a.mjs'], ['c50f7afa0-BtrOkGFw.js', 'c50f7afa0.mjs'],
  ['c9599aae9-CBm-7_M3.js', 'c9599aae9.mjs'], ['ce2191564-CJxaAbMh.js', 'ce2191564.mjs'],
  ['ca537d078-DPuNs3bK.js', 'ca537d078.mjs'], ['c70925de4-QmzvmFns.js', 'c70925de4.mjs'], ['ce02c3e31-DYHdW2G3.js', 'ce02c3e31.mjs'],
  ['c60a8dc71-BhziJe6P.js', 'c60a8dc71.mjs'],
];

// settings-pages-v4's shared-26 module is linked for DF / EF (the once-per-window DesktopInfo getSystemInfo cache): on the
// wave 8s real tree cds-core does not publish them (397 names) and settings-pages-v4 slices DF with its hostDesktopInfo cut
// (shared-25 Hi = z_); slicing them again here would duplicate EF's module state (D1 [reassigned]), so that one module
// is imported, never resliced (the { area, modules } form: settings-pages-v4's other modules stay this graph's own).
export const linkedAreas = ['settings-nav', { area: 'settings-pages-v4', modules: ['shared-26.mjs'] }];
// Pure bindings settings-nav slices without exporting (no module state: their state is cds-core's), sliced again here.
export const linkedCopies = {
  'vendor-all-0-uUCo-eCX.js#g': "zustand useStore(store, selector) (settings-nav vendor-all-0.mjs, unexported): pure over the store it is given",
  'vendor-all-0-uUCo-eCX.js#h': 'identity selector e => e (settings-nav vendor-all-0.mjs, unexported)',
  'shared-25-D-aF0gt9.js#jl': 'try { El?.() === !0 } (settings-nav shared-25.mjs, unexported); El is cds-core state_shared25_El',
  'shared-183-B2N6Zy4J.js#Mg': 'string constant "highlight" (settings-nav settings-store.mjs, unexported)',
  'shared-183-B2N6Zy4J.js#Ng': 'string constant "cowork_backend" (settings-nav settings-store.mjs, unexported)',
  'shared-62-DoCqVpIq.js#PI': 'message lookup over intl.messages (settings-nav shared-62.mjs, unexported); calls MI',
  'shared-62-DoCqVpIq.js#MI': 'notifies cds-core missingTranslationListeners kI (settings-nav shared-62.mjs, unexported)',
};

export async function buildConfig(cache = new Map()) {
  const { adapters, localAdapters, resolved } = await resolveCuts(cache);
  return { resolved, config: {
    name: 'settings-desktop-v4 (4.16336.0)', generator: 'scripts/extract-settings-desktop-v4.mjs',
    sourceContract: official, referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
    source: official.ionSource, vendor: { [official.vendorFrame]: official.reactAliases },
    generatedRoot, output,
    adapterModule: '../../settings-desktop-adapter.mjs', adapterFile,
    sharedGraph: 'cds-core',
    linkedAreas, adapters, linkedCopies,
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
// the host adapter bytes, the cds-core manifest and the settings-nav manifest this graph links.
export async function preflight(pins, resolved, cache) {
  if (pins.referenceVersion !== official.referenceVersion || pins.referenceSnapshot !== official.referenceSnapshot) throw Error('settings-desktop pins: version/snapshot mismatch');
  for (const [file, hash] of Object.entries(pins.sources)) if (sha(await fs.readFile(path.join(official.ionSource, file))) !== hash) throw Error(`settings-desktop pinned source changed: ${file}`);
  for (const r of roots) {
    const { src, matches } = await rootMatches(r, cache);
    if (matches.length !== 1 || matches[0] !== r.local) throw Error(`settings-desktop root ${r.semantic}: features match ${JSON.stringify(matches)}, expected only ${r.local}`);
    const node = src.top.get(r.local)?.node, pin = pins.roots[r.semantic];
    if (!node || !pin || sha(src.code.slice(node.start, node.end)) !== pin.declarationSha256) throw Error(`settings-desktop root changed: ${r.semantic}`);
    const alias = [...src.exported].find(([, l]) => l === r.local)?.[0] ?? null;
    if (alias !== r.export) throw Error(`settings-desktop root ${r.semantic}: export is ${alias}, expected ${r.export}`);
  }
  for (const c of resolved) {
    const pin = pins.cuts[c.name];
    if (!pin || pin.file !== c.file || pin.local !== c.local || pin.declarationSha256 !== c.declarationSha256 || pin.unreachable !== c.unreachable) throw Error(`settings-desktop cut changed: ${c.name}`);
  }
  if (Object.keys(pins.cuts).length !== resolved.length) throw Error('settings-desktop: cut set differs from pins');
  if (sha(await fs.readFile(path.join(appRoot, adapterFile))) !== pins.hostAdapterSha256) throw Error('settings-desktop adapter changed without review (pins.hostAdapterSha256)');
  if (sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))) !== pins.cdsCore.manifestSha256) throw Error('cds-core manifest differs from the one settings-desktop pins (re-review: cds-core changed)');
  if (sha(await fs.readFile(path.join(generatedRoot, 'settings-nav/manifest.json'))) !== pins.settingsNav.manifestSha256) throw Error('settings-nav manifest differs from the one settings-desktop pins (re-review: settings-nav changed)');
  if (sha(await fs.readFile(path.join(generatedRoot, 'settings-pages-v4/manifest.json'))) !== pins.settingsPages.manifestSha256) throw Error('settings-pages-v4 manifest differs from the one settings-desktop pins (re-review: settings-pages-v4 changed)');
}

export async function extractSettingsDesktop(options = {}) {
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
    scope: 'Settings › Desktop route component (c71860c77-B4INzBZs default Vs > xs): System group, desktop feature gated rows, Computer use / Storage slots answered by host sections (see cuts)',
    sharedGraph: { area: 'cds-core', manifestSha256: pins.cdsCore.manifestSha256 },
    linkedAreas: [{ area: 'settings-nav', manifestSha256: pins.settingsNav.manifestSha256 }, { area: 'settings-pages-v4', modules: ['shared-26.mjs'], manifestSha256: pins.settingsPages.manifestSha256 }],
    roots: roots.map(r => ({ semantic: r.semantic, file: r.file, local: r.local, export: r.export, oldCounterpart: r.oldCounterpart, declarationSha256: pins.roots[r.semantic].declarationSha256 })),
    cuts: resolved.map(c => ({ name: c.name, importer: c.importer, file: c.file, local: c.local, export: c.export, declarationSha256: c.declarationSha256, unreachable: c.unreachable,
      contract: cuts.find(x => x.name === c.name).contract, ...(cuts.find(x => x.name === c.name).branch ? { branch: cuts.find(x => x.name === c.name).branch } : {}) })),
    heldCopiesOfCdsCore: manifest.modules.flatMap(m => m.heldByViewTabs.map(name => `${m.source}#${name}`)),
    linkedPublicNames: [...new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'shared-graph').map(i => i.name)))].sort(),
    linkedFromSettingsNav: [...new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => `${i.via} -> ${i.from}#${i.name}`)))].sort(),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractSettingsDesktop({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
