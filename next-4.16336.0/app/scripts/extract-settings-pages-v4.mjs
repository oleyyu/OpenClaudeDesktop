// Settings pages (settings-pages-v4, 4.16336.0): slices the official Settings page bodies from the frozen snapshot with
// the shared runSlicer engine (scripts/extract-working-line.mjs) under the 4.16336.0 source contract
// (scripts/official-4.16336.0.mjs), linked to the cds-core shared graph (sharedGraph 'cds-core') and to the settings-nav
// graph (linkedAreas ['settings-nav']: the settings modal store and the pure helpers settings-nav already slices).
//
// Plan: analysis/claude-4.16336.0-migrate-20261104/surfaces-prod-3/settings-plan/report.json bPhase B0 (settings
// primitives) + B1 (General › Appearance) + B2 (General › Code looks) + B3 (Claude Code page groups c8b630735 ot;
// surfaces-prod-3/settings/relink-prep/plan.json ST-B3) + B4 (Developer page c71860c77-Cuocl2LF i, ST-B4). Official route table cf4f70727-BlN3pGWP.js#In (settingsComponentsByPath):
// general → c0db37792 zn (export t). Round 4 correction (settings lane general): on desktop shared-1 Vd (UF:
// `E(VF) !== void 0`) is FALSE — the modal content cc011544b Mn provides VF with `simpleEntries`, which shared-55 dv takes
// from settings-nav Kg `simpleEntryOf`, set only when simpleNav = shared-183 Ch (export h_) = `or("__gb__2503656110") &&
// mh` is on, and `mh = !1` is a bundle constant. So zn renders Appearance as plain `a(Hn, {})` (its `t ? a(kt, { extra:
// Mt, children: a(Hn, {}) })` arm, the cbc28252c E react-intl wording overlay, is the simple-nav arm and not reached),
// and the code looks belong to the Claude Code page (see the CodeAppearanceSection / CodeTranscriptAppearanceSection
// roots). The earlier "desktop Vd = UF() true" reading (B1/B2) was wrong.
//
//   c0db37792-BTkaIv78.js  Hn  (internal)  GeneralAppearance: Theme (Yt), Interface font (Mn), Chat font (Kn / Pn, shown
//                                          while the account's organization lacks taint:hybrid_3p), Transcript text size
//                                          (mn), Transcript width (hn), Motion (vn); GrowthBook __gb__3559838436 moves
//                                          motion and fonts into a second group (3.6556.2 c0db37792 zt)
//   shared-1-D1bGaTaN.js   II  (export hd) SettingsSection: a titled settings group (h3 data-settings-group-title)
//                          jI  (export bd) SettingsRow: one label / description / control row
//                          GI  (export vd) SettingsStack: the flex-col stack of settings sections
//
// The editorPrefs store (shared-36 Om, "epitaxy-editor-prefs", zustand persist) has no other holder: this graph is its
// one copy (D1); the host reads it through the exported useEditorPrefsStore (src/settings-pages-adapter.mjs mirrors the
// host's saved transcript size into it and saves the official writes back, electron/preferences.mjs).
//
// Service boundaries are CUTS below, written like scripts/extract-settings-nav-v4.mjs: each names the importer chunk and
// the importer's local binding as it appears in the official source; the generator resolves it through the importer's
// import table to the exporting chunk/alias/declaration (an import cut becomes runSlicer `adapters[file][alias]`, a
// local cut `localAdapters[file#local]`), asserts `features` on that declaration and checks its SHA-256 against the
// reviewed pins (scripts/settings-pages-v4-pins.json). `contract` says which host fact answers it
// (src/settings-pages-adapter.mjs over the SettingsPagesHost value the host builds in src/settings-pages-host.jsx
// settingsPagesHostValue).
//
// Roots are located on the official AST: each must be the only top-level declaration of its chunk carrying all its
// features (re-proved on every run), and its declaration hash and export alias must equal the pins.
//
// pins (scripts/settings-pages-v4-pins.json) are a reviewed input: this generator never writes them. The explicit review
// step is analysis/claude-4.16336.0-migrate-20261104/surfaces-prod-3/settings/tools/pin.mjs (refuses to overwrite without
// --replace). `node scripts/extract-settings-pages-v4.mjs` writes src/generated/settings-pages-v4; `--check` compares
// byte for byte (scripts/verify-gen-settings-pages.mjs, found by prepare-ui); `--dry-run` writes nothing.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import * as official from './official-4.16336.0.mjs';

const appRoot = path.resolve(import.meta.dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const generatedRoot = path.join(appRoot, 'src/generated');
export const output = path.join(generatedRoot, 'settings-pages-v4');
export const pinsFile = path.join(import.meta.dirname, 'settings-pages-v4-pins.json');
export const adapterFile = 'src/settings-pages-adapter.mjs';
export const C0 = 'c0db37792-BTkaIv78.js';
export const CBC = 'cbc28252c-BH4auGvp.js';
export const S1 = 'shared-1-D1bGaTaN.js';
export const S23 = 'shared-23-BRmsPtuN.js';
export const S36 = 'shared-36-fqRFYwOb.js';
export const C51 = 'c51ac4bf6-BiJ5KnQb.js';

export const roots = [
  { semantic: 'GeneralAppearance', file: C0, local: 'Hn', export: null, oldCounterpart: '3.6556.2 c0db37792 zt',
    features: ['row: "motion"', 'showChatFont: t', 'defaultMessage: "Ant only"', 'a(yn, { row: "text-size" })', 'a(yn, { row: "width" })'] },
  { semantic: 'SettingsSection', file: S1, local: 'II', export: 'hd', oldCounterpart: null,
    features: ['"data-settings-group-title": ""', '"data-settings-section-titled": O', 'titleAdornment: i'] },
  { semantic: 'SettingsRow', file: S1, local: 'jI', export: 'bd', oldCounterpart: null,
    features: ['controlWrapsBelow: c', 'controlGivesWay: u', 'labelId: x, descriptionId: C'] },
  { semantic: 'SettingsStack', file: S1, local: 'GI', export: 'vd', oldCounterpart: null,
    features: ['`flex flex-col ${n ?? ""}`'] },
  // Round 4 (settings lane general) — the desktop placement of the code looks. shared-183 Ch (export h_) is
  // `or("__gb__2503656110") && mh` with the bundle constant `mh = !1`, so the simple settings nav is off on desktop, the
  // modal content's shared-1 VF value (cc011544b Mn `simpleEntries`) is undefined and shared-1 Vd (UF) is false. The
  // General page (c0db37792 zn) therefore never renders the lazy settings_general_code_looks entry (xn, `t && n && …`)
  // and the official Claude Code page (c71860c77-puomdTO2 Ea, `C = le()` = Vd false) renders the two code-looks groups
  // itself: `x && !C && n(Wn, {})` (Code appearance) and `x && !C && n(Un, {})` (Appearance: transcript text size /
  // width / default transcript view). Wn / Un are cda9efc49 R (export t) and M (export n), rooted here (the
  // c296a7a55 GeneralCodeLooks root, the simple-nav-only wrapper, is gone).
  { semantic: 'CodeAppearanceSection', file: 'cda9efc49-K1e0W0Gw.js', local: 'R', export: 't', oldCounterpart: '3.6556.2 c71860c77 Code appearance group (host SourceCodeThemePreview)',
    features: ['id: "code-appearance"', 'def: E.codeFontSize'] },
  { semantic: 'CodeTranscriptAppearanceSection', file: 'cda9efc49-K1e0W0Gw.js', local: 'M', export: 'n', oldCounterpart: '3.6556.2 c71860c77 Appearance group (host Default transcript view row)',
    features: ['row: "transcriptTextSize"', 'def: E.defaultTranscriptView'] },
  // Round 4 General page (cf4f70727 In general → yn → c0db37792 zn, export t) is NOT rooted here yet. zn = the GI stack
  // [Profile Et (c547d6690 gr), Appearance (Hn: desktop `t ? kt : Hn`, t = Vd false), Code looks (simple nav only), Tasks
  // Un (`De() ? Wn : null`, De = shared-18 By → shared-123 ad = cds-core useHubLookBacked), Notifications
  // (`e && !t && [qn, xr]`, e = Rn = !hybrid_3p → true here), Memory It (ceba4c76e w, gate cbc28252c k = shared-123 k_
  // && (Hy coworkKappa || uK chatIn3p))]. Each group but Appearance is blocked on a binding another graph holds:
  //   Profile       c547d6690 Cr → xt → c6bd2cd90 o/a/i → vendor-motion (44 stateful, working-line-v4, unexported;
  //                 cds-core deferred them: initializer append needs a ruling) — D1.
  //   Notifications xr → we = shared-18 ZV → YV → Zi = shared-123 _S → _x / mx / the local-sessions store (23 stateful,
  //                 frame-sidebar-nav, unexported; cds-core W8S-H2/H4 held them back) — D1.
  //   Tasks, Memory both reach the claude.ai API query core shared-0 Y9 (`e === null ? te : …`, te = vendor-query A =
  //                 TanStack skipToken, a Symbol()) whose one copy the linked query runtime compares against is
  //                 files-changes-v4 file-browser-query.mjs, unexported: a re-sliced copy would be a second skipToken
  //                 identity (the linked QueryObserver would treat it as a queryFn and call it). Needs that export.
  // (round4/settings/general/report.json blocked / cdsCoreNeeds.) The host keeps the official order for the groups it
  // shows: Profile (host, local display name), Appearance (Hn), then its local groups.
  // B3 Claude Code page setting groups: c8b630735 ot (export t), rendered by the official Claude Code page
  // (c71860c77-puomdTO2 Ea: `zn {part:"local"}`, `zn {part:"notifications"}`, account scope `zn {part:"behavior"}`) and by the
  // notifications page (ca274f4d4 `a {part:"notifications"}`).
  { semantic: 'ClaudeCodeSettingsGroups', file: 'c8b630735-Bbdb359j.js', local: 'ot', export: 't', oldCounterpart: '3.6556.2 c71860c77-DzP8HoeV hr (Sessions, id local-sessions)',
    features: ['action: "highlight-bypass-permissions"', 'bypassPermissionsOptInByAccount', 'l === "all" || l === e'] },
  // B4 Developer page: the settings route component of /settings/developer (c71860c77-Cuocl2LF default i):
  // c8828a060 F (page container) > B (Local MCP servers) > oe (the Claude Platform API key card, GrowthBook gated).
  { semantic: 'DeveloperSettingsPage', file: 'c71860c77-Cuocl2LF.js', local: 'i', export: 'default', oldCounterpart: '3.6556.2 c4fa092cc Developer (host DeveloperServers)',
    features: ['children: e(t, { children: e(r, {}) })'] },
  // The one copy of the editorPrefs store (shared-36 Om, export Eo): exported so the host can read and mirror it.
  { semantic: 'useEditorPrefsStore', file: S36, local: 'Om', export: 'Eo', oldCounterpart: null,
    features: ['chatTextSize: ym(Dm.chatTextSize) ? Dm.chatTextSize : "m"', 'setTranscriptWidth: (t) => e({ transcriptWidthChoice: t })'] },
  // fix-r2 U-33: shared-20 bb (export ys), the desktop's code font size root writer (c66fe388e `function ct(){return v(),null}`):
  // the store's codeFontSize (shared-36 Mm) onto html data-code-font-size and --epitaxy-code-font-size / --epitaxy-code-leading
  // (yb over shared-36 dm / um), cleared when the last writer unmounts. The host mounts it once (settings-pages-host.jsx).
  { semantic: 'useCodeFontSizeRoot', file: 'shared-20-DUEo90UF.js', local: 'bb', export: 'ys', oldCounterpart: null,
    features: ['yb(e);', 'w(xb, r);'] },
];

// Host adapter contract. Each cut is a service the official General page reads that the host answers from its own facts.
export const cuts = [
  // ---- i18n (react-intl over the host catalog: cds-core-adapter useHostIntl / HostFormattedMessage) ----
  { in: C0, local: 'Y', name: 'useIntl', features: ['return (Mt(e), e);'], contract: 'host i18n (electron/i18n t/getLocale): formatMessage({defaultMessage,id}) / messages' },
  { in: C0, local: 'J', name: 'FormattedMessage', features: ['(Wt, Ut)'], contract: 'host i18n: <FormattedMessage defaultMessage id values/>' },
  // ---- account ----
  { in: C0, local: 'A', name: 'useCurrentAccount', features: ['"Must call inside CurrentAccountProvider"'],
    contract: 'host local profile (settingsPagesHostValue.account = settings-shell-model LOCAL_PROFILE_ACCOUNT: no claude.ai organization, settings {})', branch: 'Hn G(account) "Ant only" badge (no anthropic.com address → none); shared-23 _D chat font account sync (account present, settings.chat_font undefined)' },
  // shared-153 LT (export Oh): la(Mn) = the active organization has capability "taint:hybrid_3p". The host local profile
  // has no organization, so the capability is absent (the same answer shared-25 qB gives without an organization).
  { in: C0, local: 'L', name: 'useHybrid3pOrganization', features: ['return la(Mn);'],
    contract: 'host local profile has no organization → false', branch: 'Hn Rn() = !L(): Chat font rows shown; cbc28252c A/j (text size / width gates) not hidden by 3P' },
  // ---- GrowthBook: one host table (src/host-growthbook.mjs) by growthBookFlagKey; unlisted flags off (D29/D31) ----
  { in: C0, local: 'k', name: 'useGrowthBookFlagWhen', features: ['!t || !n?.growthbook'], contract: 'host GrowthBook table, enabled argument respected (Hn __gb__3559838436: second fonts/motion group)' },
  { in: C0, local: 'D', name: 'useGrowthBookFlag', features: ['.on;'], contract: 'host GrowthBook table (kn __gb__936258914: Atkinson Hyperlegible Next offered)' },
  { in: CBC, local: 't', name: 'useGrowthBookFeatureOn', features: ['t = _(Jr)', 'es(t, e)', '.on;'], contract: 'host GrowthBook table (cbc28252c A: __gb__2811586548 transcript text size row on General)' },
  // ---- analytics: the official rows track their changes (hn: claudeai.code.transcript_width.changed) ----
  { in: C0, local: 'ie', name: 'useAnalytics', features: ['return ZS;'], contract: 'host o11y sink: track(event) appends to globalThis.__settingsPagesTelemetry when the host installed one; no network' },
  // ---- appearance state the host owns ----
  // shared-92 Y (export qg): the frame/sidebar store. Mn / En / shared-23 _D read interfaceFont and call
  // setInterfaceFont on it (shared-92 Fb). The host's interface font is its saved preference (electron/preferences.mjs
  // interfaceFont: anthropic / system / dyslexic, the official names), applied by appearance-root.mjs.
  // A local cut (shared-92 xC / $g reads Y inside its own chunk), so every reader — c0db37792 xe, shared-92 xC, shared-23 J
  // — gets the same host store.
  { in: 'shared-92-BOgyxePb.js', local: 'Y', name: 'interfaceFontStore', features: ['interfaceFont: "anthropic"', 'setInterfaceFont: (t) => e({ interfaceFont: t })'],
    contract: 'host saved interfaceFont as a zustand-compatible store (selector hook + getState) with the official field names interfaceFont / setInterfaceFont; setInterfaceFont saves the host preference' },
  // shared-1 BF (export Ud): the theme mode context { mode, setMode, resolvedMode } (mF, no holder).
  { in: C0, local: 'M', name: 'useThemeMode', features: ['E(mF) ?? zF'],
    contract: 'host theme preference (system ↔ official "auto", light, dark); setMode saves it; resolvedMode from the host color scheme' },
  // shared-183 dN (export Uc): { mode, setMode, shouldReduceMotion } over the "appearance:reduceMotion" local value. The
  // host's Motion is its saved preference (electron/preferences.mjs motion: system / reduce, the official values), which
  // appearance-root.mjs writes to html[data-reduce-motion]; a second copy in localStorage would split it.
  { in: C0, local: 'ce', name: 'useReduceMotion', features: ['Lr(cN, "system")', 'shouldReduceMotion: r'],
    contract: 'host motion preference (system / reduce) + prefers-reduced-motion; setMode saves the host preference' },
  // shared-123 Vw (export G_): useUpdateAccountSettings (PATCH /api/account/settings). shared-23 _D reads its mutateAsync
  // but its setter never calls it (the chat font is the local chat-font setting); the host has no account settings API.
  // ---- B2 Code looks: the settings-row binding layer (c51ac4bf6) ----
  // shared-25 VB (export bi): `_(Dz)`, the CurrentAccount context value or undefined (Dz is held by routines-shared-v4,
  // unexported). c51ac4bf6 H reads activeOrganization capabilities (claude_max / raven defaults), c66de3d94 c reads
  // account.settings.code_default_transcript_view. Host: the same local profile value as useCurrentAccount.
  { in: C51, local: 'S', name: 'useCurrentAccountOptional', features: ['_(Dz)'],
    contract: 'host local profile (settingsPagesHostValue.account): no organization capabilities, settings {}' },
  // shared-25 Go (export yg): the GrowthBook feature value (undefined without a GrowthBook client). c51ac4bf6 le reads
  // __gb__4076713163 (setting-row "chrome": scope badge + modified dot + Reset) and falls back to the anthropic.com check.
  { in: C51, local: 'C', name: 'useGrowthBookFeatureValue', features: ['t?.growthbook', 'Ko(t, H(e))'],
    contract: 'host GrowthBook table: the listed boolean, else undefined (unlisted = no GrowthBook answer, the official fallback runs)' },
  // c51ac4bf6 U / W / ae: the stock bindings for desktopPref / claudeCodeSetting / accountSetting rows. Code looks passes an
  // explicit binding to every row (cda9efc49 R: k(editorFont…), k(codeFontSize…); M: k(transcriptTextSize…)). B3: the
  // Claude Code groups (c8b630735 ot) call U (De) and W (Me) themselves, so both are sliced as official code over the
  // bridges they read: U over the c6673aecb desktop prefs store and shared-25 Bi AppPreferences (cut below, host
  // preferences), W over c27343114 (vendor-query, linked from files-changes-v4) and shared-0 xO claude.web ClaudeCode
  // (not cut: no host bridge, so isAvailable false → the official hidden row). ae stays a cut: no row this graph renders
  // reads an accountSetting through it.
  { in: C51, local: 'ae', name: 'useAccountSettingBinding', features: ['": not an accountSetting"'], unreachable: true,
    contract: 'unreachable from Code looks and the Claude Code local / notifications groups; no claude.ai account settings on the host' },
  // shared-36 fm (export Po): createContext(false), "inside a routine preview" (Mm returns null code font size there).
  // code-routines-v4 slices it without an export, so it cannot be linked; the settings page renders outside any fm
  // provider, so the host answers the default (false) context. cds-core request: publish shared-36 fm.
  { in: S36, local: 'fm', name: 'codeFontSizeScopeContext', features: ['S(!1)'],
    contract: 'no fm provider above the settings page: a context whose value is false (cdsCoreNeeds: publish shared-36 fm so code-routines-v4 and this graph share one)' },
  // ca7ba268c Va (export r): @pierre/diffs FileDiff, the code theme preview (cda9efc49 R renders the greet.ts diff under
  // each column's forced mode). Not sliced here: it is the pierre-changes region's graph (diff web component, Shiki worker
  // pool, the 622 KB oniguruma chunk); the settings page answers it with the host preview of the same fixed diff
  // (src/source-code-theme-preview.jsx, which cites 3.6556.2 c71860c77 hi/gi/_i), reading the column's mode from the
  // official cds scope around it (cds-core useCdsMode) and the code theme of that mode from the official theme prop.
  { in: 'cda9efc49-K1e0W0Gw.js', local: 'C', name: 'CodeThemePreviewFileDiff', features: ['"FileDiff"', 'disableWorkerPool'],
    contract: 'host code theme preview (SourceCodeThemePreview mode / theme[mode]) for the official fileDiff (greet.ts, parsed by the sliced ca7ba268c $t)' },
  // c34e6410a s (export t): the lazy code highlight stack (cce0118b1 → Shiki highlighter, grammars, oniguruma), loaded
  // once into module state. c6e73333a x calls only its resolveTheme(name) to read the selected code themes' bg / colors
  // (code theme CSS variables). The stack itself is the transcript / editor graphs' (one Shiki instance); the host
  // answers resolveTheme from its generated code theme table (prepare-ui resolves the same @shikijs/themes).
  { in: 'c6e73333a-LnS4e_bw.js', local: 'l', name: 'loadCodeHighlightStack', features: ['code_highlight_stack'],
    contract: 'host code theme table (src/generated/code-theme-colors.json via the host value): { resolveTheme(name) → { bg, fg, colors } }' },
  // ---- B3 Claude Code page (c8b630735 ot) ----
  // Desktop bridges the official preload exposes (module-load reads of globalThis["claude.settings"|"claude.web"]). The host
  // has no claude.settings preload; the ones whose facts the host owns are answered by host bridge objects with the
  // official method names and shapes (src/settings-pages-adapter.mjs); the rest stay sliced and read undefined, the
  // official no-bridge branch.
  // shared-25 Bi (export M_): AppPreferences { getPreferences, onPreferencesChanged, setPreference } — read by c6673aecb
  // (desktop prefs store: c51ac4bf6 U desktopPref rows, ot F), shared-123 x_ (keep-awake / prompt-suggestion stores) and
  // ot S.setPreference (bypass opt-in, notification levels).
  { in: 'c8b630735-Bbdb359j.js', local: 'S', name: 'hostAppPreferences', features: ['globalThis["claude.settings"]?.AppPreferences'],
    contract: 'host saved preferences under the official desktopPref keys (notificationLevels, notificationSound, dockBounceEnabled, ccAutoArchiveInactiveDays, chillingSlothLocation, bypassPermissionsModeEnabled, ccKeepAwakeWhileWorking, ccKeepAwakeOnBattery, ccPromptSuggestions); keys the host has no fact for are absent (official whenMissing branch)' },
  // shared-25 zi (export V_): FilePickers { getDirectoryPath(multi) } (ot se: Worktree location › Custom…).
  { in: 'c8b630735-Bbdb359j.js', local: 'T', name: 'hostFilePickers', features: ['globalThis["claude.settings"]?.FilePickers'],
    contract: 'host folder picker: getDirectoryPath(false) → [path] | undefined' },
  // shared-0 xO (export dh, claude.web ClaudeCode: resolveLocalSettings / patchUserSettings / getLocalSandboxStatus …) and
  // shared-0 qO (LocalSessions) are NOT cut: the host renders the official "local" and "notifications" parts only, whose
  // readers of those bridges (Ke sandbox section `!!v?.getLocalSandboxStatus`, c27343114 claudeCodeSetting rows) take the
  // official no-bridge branch (hidden); the host keeps its own workflow / sandbox rows (src/source-settings.jsx).
  // shared-92 Lp → _O: F_("claude_code_desktop_bypass_permissions").isAvailable (organization feature availability over the
  // claude.ai bootstrap + o11y). The local profile has no organization restricting features: available.
  { in: 'c8b630735-Bbdb359j.js', local: 'ie', name: 'useBypassPermissionsFeatureAvailable', features: ['"claude_code_desktop_bypass_permissions"'],
    contract: 'local profile: no organization feature gate → true (the host requirements policy still decides the switch, src/source-settings.jsx bypassAvailability)' },
  // shared-123 mu → dR: lR().enabled (Claude Code desktop enabled for the organization: claude.ai bootstrap, org popover config).
  { in: 'c8b630735-Bbdb359j.js', local: 'z', name: 'useClaudeCodeDesktopEnabled', features: ['lR().enabled'],
    contract: 'local profile: Claude Code is the app → true' },
  // c2d87f9e7 t → o: the settings deep-link action (router ?highlight=bypass_permissions or a pending action) that flashes
  // the row. The host opens the page with its own anchor (SourceSettings initialSection 'code#bypass').
  { in: 'c8b630735-Bbdb359j.js', local: 'we', name: 'useSettingsDeepLinkAction', features: ['e.pendingAction === c'],
    contract: 'host settings anchor: when rendered and the host deep link names this action, highlight elementId once' },
  // shared-92 ly → F_: P_[feature].useAvailable() (claude.ai bootstrap feature availability; cf50036ec E reads
  // claude_code_desktop_bypass_permissions { isAvailable, status }). Local profile: no organization gate.
  { in: 'cf50036ec-CBXm08ls.js', local: 'u', name: 'useFeatureAvailability', features: ['P_[e].useAvailable()'],
    contract: 'local profile: { isAvailable: true, status: "available" } for every feature asked here' },
  // shared-8 hx (local; px = Cu and mx = Su wrap it): the managed Claude Code settings query (resolveLocalSettings /
  // resolveSSHSettings over the CLI's managed-settings files, zod-parsed, claudeai_permission_modes_managed_settings gate).
  // The host has no managed-settings source: settled, nothing managed.
  { in: 'shared-8-BqfCbkJd.js', local: 'hx', name: 'useManagedClaudeCodeSettings', features: ['"claudeai_permission_modes_managed_settings"', 'desktopResolvesDisableModes: A'],
    contract: 'host has no managed settings: { config: {}, configSettled: true, configErrored: false, desktopResolvesDisableModes: false, rereadConfig, capabilities }' },
  // shared-25 Mi → YB: qB("raven") — the active organization has capability "raven" (qB reads shared-25 VB = `_(Dz)`, the
  // CurrentAccount context routines-shared-v4 holds unexported). Local profile: no organization → false.
  // shared-25 Hi (export z_) = globalThis["claude.settings"]?.DesktopInfo, read by shared-26 DF (once per window:
  // `EF||tn?.getSystemInfo&&tn.getSystemInfo().then(e=>{EF=e,t(e)})`); ot reads DF()?.platform for the Draw attention
  // description (darwin "Bounce the Dock icon…" / win32 "Flash the taskbar button…" / else "Flash the app icon…") and the
  // platform fallback (`DF()?.platform ?? K_()`). Without the bridge the platform is undefined and macOS shows the generic
  // branch. Host: the same DesktopInfo answer the Session info card reads (src/source-code-transcript-adapters.jsx
  // desktopInfo: app version + the boot's host facts {platform, os_version, arch}, set by main.jsx).
  { in: 'shared-26-B-POtn5S.js', local: 'tn', name: 'hostDesktopInfo', features: ['globalThis["claude.settings"]?.DesktopInfo'],
    contract: 'host DesktopInfo { getSystemInfo() → Promise<{ app_version, os_version, os_pretty_name: null, platform, arch }> } (source-code-transcript-adapters.jsx desktopInfo, the one host instance)' },
  { in: 'c8b630735-Bbdb359j.js', local: 'C', name: 'useRavenOrganization', features: ['qB("raven")'],
    contract: 'host local profile: no organization capabilities → false' },
  // shared-123 Zc → kB: a server-gated feature (AB: the claude.ai boot configuration's serverGateNames or the loaded server
  // gate store, NB via shared-0 y4 useConfiguration; && V: the GrowthBook flag). Ve reads R("ccd_maple_lantern").
  { in: 'c8b630735-Bbdb359j.js', local: 'R', name: 'useServerGatedFeature', features: ['AB(e)', 'V(e)'],
    contract: 'host has no claude.ai boot configuration and loads no server gate store (as source-session-rail-kit-adapters.jsx useServerGatedFeature): NB undefined → AB false → false' },
  // shared-123 Cb → q: Rs(E_), the desktop appFeatures (cds-core appFeaturesStore, booted from window.desktopBootFeatures,
  // which this host does not expose). ot Ue reads codeSessionKeepAwake (Keep computer awake rows).
  { in: 'c8b630735-Bbdb359j.js', local: 'F', name: 'useDesktopAppFeatures', features: ['Rs(E_)'],
    contract: 'host appFeatures table (src/host-app-features.mjs HOST_APP_FEATURES) + codeSessionKeepAwake supported (the host power-save blocker, electron/desktop-settings.cjs; as src/source-session-rail-adapters.jsx useDesktopAppFeatures)' },
  // ---- B4 Developer page (c71860c77-Cuocl2LF i: c8828a060 F > B > oe) ----
  // shared-25 Li (export W_) = globalThis["claude.settings"]?.MCP, the preload bridge c8828a060 B reads
  // (getMcpServersConfigWithStatus / onMcpStatusChanged / onMcpConfigChange / setMcpServerConfigs / revealConfig /
  // revealServerLog) and shared-55 tg reads (isLocalDevMcpEnabled); the cut answers both importers. The host has no
  // claude.settings preload: one host bridge object answers B's methods from the host's local MCP configuration (src/settings-pages-adapter.mjs hostMcpBridge over
  // the host value's mcp: the running core's configured servers and their statuses, the core's MCP config writes, the
  // host's config file reveal). It has no isLocalDevMcpEnabled method (no device policy on the host): tg's official
  // no-method branch (`!It?.isLocalDevMcpEnabled`) keeps developer MCP servers enabled.
  { in: 'c8828a060-CcxioRoe.js', local: '_', name: 'hostMcpBridge', features: ['globalThis["claude.settings"]?.MCP'],
    contract: 'host local MCP servers in the official shape { [key]: { command, args, env, url, status, error, extensionId } } with setMcpServerConfigs(servers) removing the keys left out through the core MCP config, revealConfig() the host Edit config; no revealServerLog (no per-server log on the host) and no isLocalDevMcpEnabled' },
  // shared-0 FH (shared-55 Be, `Be(pe)` with pe = shared-0 OI { version: ">=0.12.0" }): is this the desktop app at or above a
  // version. The settings window is always the desktop app (src/settings-pages-adapter.mjs useIsDesktopApp → true).
  { in: 'shared-55-BRv2XBP7.js', local: 'Be', name: 'useIsDesktopApp', features: ['window.navigator.userAgent', 'PH.set(i, o)'],
    contract: 'the desktop app: true (as the cowork-settings and sidebar-sections host answers)' },
  // shared-62 rP (export zl): useErrors() = useContext(ErrorsProvider); c8828a060 B calls addError when the MCP server list
  // fails to load. Host: the routines-shared host errors (src/source-routines-shared-adapters.jsx: host toasts).
  { in: 'c8828a060-CcxioRoe.js', local: 'O', name: 'useErrors', features: ['"Must be called within ErrorsProvider"'],
    contract: 'host errors: { addError(message, { error, messageForLogging }) → danger toast, … } (source-routines-shared-adapters.jsx useErrors)' },
  { in: S23, local: 'ua', name: 'useUpdateAccountSettings', features: ['"/api/account/settings"'],
    contract: 'no claude.ai account settings service; the one field the sliced closure writes with a host home, code_default_transcript_view (c66de3d94 l, Claude Code › Appearance › Default transcript view), saves the host transcriptView preference; every other field rejects (shared-23 _D chat_font only reads it)' },
];

// Resolve cuts into runSlicer adapters / localAdapters, asserting features and recording the resolved declaration.
export async function resolveCuts(cache = new Map()) {
  const adapters = {}, localAdapters = {}, resolved = [], names = new Set();
  for (const cut of cuts) {
    if (names.has(cut.name)) throw Error(`settings-pages cut name ${cut.name} used twice`);
    names.add(cut.name);
    const src = await readSource(cut.in, cache, official.ionSource);
    const entry = src.top.get(cut.local);
    if (!entry) throw Error(`settings-pages cut ${cut.in}#${cut.local} is not a top-level binding`);
    let file = cut.in, local = cut.local, alias = null, dep = src, decl = entry;
    if (entry.kind === 'import') {
      file = entry.file; alias = entry.alias;
      dep = await readSource(file, cache, official.ionSource);
      local = dep.exported.get(alias);
      decl = dep.top.get(local);
      if (!decl || decl.kind === 'import') throw Error(`settings-pages cut ${cut.in}#${cut.local} -> ${file}:${alias} is not a declaration (re-export)`);
    }
    assertFeatures(`settings-pages cut ${cut.name} (${file}#${local})`, await featureText(dep, decl), cut.features);
    const declarationSha256 = sha(dep.code.slice(decl.node.start, decl.node.end));
    if (alias !== null) {
      adapters[file] ??= {};
      if (adapters[file][alias]) throw Error(`settings-pages cut ${cut.name}: ${file}:${alias} already cut as ${adapters[file][alias].name}`);
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

// One generated module per chunk the closure enters. The compiler runtime and the published cds-core / settings-nav names
// are linked; Code looks (B2) also enters shared-frame / shared-62 / shared-7 / preload-helper for bindings neither
// publishes (pure helpers and constants: held copies, listed in provenance heldCopiesOfCdsCore).
const chunkTargets = [
  ['shared-0-CnnWnVrT.js', 'shared-0.mjs'], ['shared-25-D-aF0gt9.js', 'shared-25.mjs'],
  ['ca6a97f9c-H4XSAsx3.js', 'ca6a97f9c.mjs'], ['shared-160-DDUFdDNM.js', 'shared-160.mjs'], ['cd14a8022-CCTq5nc1.js', 'cd14a8022.mjs'],
  [official.vendorIntl, 'vendor-intl.mjs'], ['shared-26-B-POtn5S.js', 'shared-26.mjs'],
  ['vendor-all-0-uUCo-eCX.js', 'vendor-all-0.mjs'], ['shared-92-BOgyxePb.js', 'shared-92.mjs'], [S36, 'editor-prefs.mjs'],
  [S1, 'settings-kit.mjs'], ['c5592b83a-B9Znj3io.js', 'c5592b83a.mjs'],
  ['shared-80-BDW2YKDx.js', 'shared-80.mjs'], ['shared-11-CNsu0Zu8.js', 'shared-11.mjs'], [S23, 'shared-23.mjs'],
  ['ce40c68bb-Hv_t9k0W.js', 'ce40c68bb.mjs'], ['ce2be2435-B1eGpyeB.js', 'ce2be2435.mjs'], ['c90d7fd86-iWqdaSNP.js', 'c90d7fd86.mjs'],
  ['c478be5f3-X9DbZqkz.js', 'c478be5f3.mjs'], [CBC, 'settings-registry.mjs'], [C0, 'general.mjs'],
  // B2 Code looks
  ['shared-frame-CJdE5Ria.js', 'shared-frame.mjs'], ['preload-helper-BBljBeZo.js', 'preload-helper.mjs'], ['shared-55-BRv2XBP7.js', 'shared-55.mjs'], ['shared-62-DoCqVpIq.js', 'shared-62.mjs'],
  ['shared-7-D2e77H6v.js', 'shared-7.mjs'], ['c5d464fa3-D1V4bYI5.js', 'c5d464fa3.mjs'], ['cfc117758-Bqlw74fW.js', 'cfc117758.mjs'],
  ['c91a5e4a6-BOaQZsN0.js', 'c91a5e4a6.mjs'], ['c82eca2bd-B-5ZNoqx.js', 'c82eca2bd.mjs'], ['ca9e46d28-gC-LK4xZ.js', 'ca9e46d28.mjs'],
  // cds-integrate wave 8s (W8S-M10): cds-core holds cb951fc8f now (a wave-8s chunk module, reached by the published settings
  // names) and the closure links what it needs there, so the chunk is no longer entered; it was
  // `['cb951fc8f-DYLeL6RL.js', 'cb951fc8f.mjs'],` at the end of the next row through wave 8.
  ['c74f29bd2-CAuuQDSL.js', 'c74f29bd2.mjs'], ['c6e73333a-LnS4e_bw.js', 'code-theme-vars.mjs'],
  ['c6438c669-CeVpGyFN.js', 'c6438c669.mjs'], ['c76ea0beb-CU4sD99o.js', 'c76ea0beb.mjs'], ['c93fb40ec-BxOp-lhI.js', 'c93fb40ec.mjs'],
  ['cbe9ab01c-P15fuilu.js', 'cbe9ab01c.mjs'], ['c19cfecfb-DrFO98S_.js', 'c19cfecfb.mjs'], ['ca7ba268c-BbXZXSeA.js', 'pierre-diff-parse.mjs'],
  ['c66de3d94-Bb5hHau-.js', 'transcript-view.mjs'],
  // fix-r2 U-33: shared-20 bb (the code font size root writer) and what it enters there (yb, xb / Sb, hb).
  ['shared-20-DUEo90UF.js', 'code-font-size-root.mjs'],
  [C51, 'settings-rows.mjs'], ['cda9efc49-K1e0W0Gw.js', 'code-appearance.mjs'],
  // B3 Claude Code page (c8b630735 ot and what it enters below the cuts)
  ['shared-123-1Hc1RTKl.js', 'shared-123.mjs'], ['shared-8-BqfCbkJd.js', 'shared-8.mjs'], ['shared-18-Cfqwgjc5.js', 'shared-18.mjs'],
  ['shared-183-B2N6Zy4J.js', 'shared-183.mjs'], ['shared-39-ZCs0lAwB.js', 'shared-39.mjs'], ['shared-40-Caqkqnhw.js', 'shared-40.mjs'],
  ['c6673aecb-B-t_VQzj.js', 'desktop-prefs.mjs'], ['c27343114-Bh0Hy-eV.js', 'claude-code-settings.mjs'], ['c1e585df0-CzOusXJc.js', 'keep-awake.mjs'],
  ['cf50036ec-CBXm08ls.js', 'bypass-availability.mjs'], ['c7dd5958a-DU5pTYpy.js', 'c7dd5958a.mjs'], ['cd55d696d-FUob_YwE.js', 'cd55d696d.mjs'],
  ['c50f7afa0-BtrOkGFw.js', 'c50f7afa0.mjs'], ['c46a25c95-DWCpUCoD.js', 'c46a25c95.mjs'], ['cb2e92b23-CbBPwg4q.js', 'cb2e92b23.mjs'],
  ['c8b630735-Bbdb359j.js', 'claude-code.mjs'],
  // B4 Developer page
  ['c71860c77-Cuocl2LF.js', 'developer-page.mjs'], ['c8828a060-CcxioRoe.js', 'developer.mjs'],
  ['shared-33-DtdykY0y.js', 'shared-33.mjs'],
];

// fix-r2 U-41: c8b630735 ot (the Claude Code page; its Sessions › Worktree location select) describes its "Inside project" choice with the
// official CLI's folder, ".claude/worktrees". The host creates those worktrees under <project>/.code/worktrees
// (electron/worktree-prepare.mjs createWorktree `path.join(cwd, '.code', 'worktrees')`), so the description names that
// folder. runSlicer cfg.rewrites: the literal occurs once in the official declaration; the manifest records the rewrite.
export const WORKTREE_LOCATION_REWRITES = Object.freeze({
  'c8b630735-Bbdb359j.js#ot': [{ from: 'description:".claude/worktrees"', to: 'description:".code/worktrees"',
    why: 'Host fact (U-41): the app creates "Inside project" worktrees in <project>/.code/worktrees (electron/worktree-prepare.mjs), not the CLI\'s .claude/worktrees' }],
});

export async function buildConfig(cache = new Map()) {
  const { adapters, localAdapters, resolved } = await resolveCuts(cache);
  return { resolved, config: {
    name: 'settings-pages-v4 (4.16336.0)', generator: 'scripts/extract-settings-pages-v4.mjs',
    sourceContract: official, referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
    source: official.ionSource, vendor: { [official.vendorFrame]: official.reactAliases },
    generatedRoot, output,
    adapterModule: '../../settings-pages-adapter.mjs', adapterFile,
    sharedGraph: 'cds-core',
    // files-changes-v4 is linked for the zustand and TanStack Query modules only (react-store / vanilla-store / file-browser-query:
    // the vendor-query contexts ot's queries read and zustand's store hooks). Its owner-window module is not linked: this
    // graph keeps its own shared-25 vd (pure: `ownerWindow(e) ?? globalThis.window`), which session-panels-v4 links from here.
    linkedAreas: ['settings-nav', { area: 'files-changes-v4', modules: ['react-store.mjs', 'vanilla-store.mjs', 'file-browser-query.mjs'] }], adapters,
    // shared-92 Ib (export F_: `documentElement.hasAttribute(Ue)`, pure) is sliced by settings-nav without an export.
    linkedCopies: { 'shared-92-BOgyxePb.js#Ib': 'pure DOM attribute read settings-nav slices without exporting; sliced again here (no module state)',
      // B3: pure bindings the linked areas slice without exporting (no module state; re-exporting them would re-pin every
      // consumer of those manifests for two constants and zustand's selector hook).
      'shared-183-B2N6Zy4J.js#Mg': 'string constant "highlight" (settings-nav settings-store.mjs, unexported); ot deep-link param',
      'shared-183-B2N6Zy4J.js#Bg': 'string constant "bypass_permissions" (settings-nav settings-store.mjs, unexported); ot deep-link value',
      'vendor-all-0-uUCo-eCX.js#g': "zustand useStore(store, selector) (files-changes-v4 react-store.mjs, unexported): pure over the store it is given",
      'vendor-all-0-uUCo-eCX.js#h': 'identity selector e => e (files-changes-v4 react-store.mjs, unexported)' },
    localAdapters: {
      [`${official.vendorFrame}#i`]: { name: 'loadHostReact', features: ['t.exports = r();'] },
      [`${official.vendorFrame}#ce`]: { name: 'hostJsxRuntime', features: ['t.exports = se();'] },
      [`${official.vendorFrame}#be`]: { name: 'hostReactDom', features: ['e(me())'] },
      ...localAdapters,
    },
    rewrites: WORKTREE_LOCATION_REWRITES,
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
// the host adapter bytes, the production cds-core manifest and the settings-nav manifest this graph links.
export async function preflight(pins, resolved, cache) {
  if (pins.referenceVersion !== official.referenceVersion || pins.referenceSnapshot !== official.referenceSnapshot) throw Error('settings-pages pins: version/snapshot mismatch');
  for (const [file, hash] of Object.entries(pins.sources)) if (sha(await fs.readFile(path.join(official.ionSource, file))) !== hash) throw Error(`settings-pages pinned source changed: ${file}`);
  for (const r of roots) {
    const { src, matches } = await rootMatches(r, cache);
    if (matches.length !== 1 || matches[0] !== r.local) throw Error(`settings-pages root ${r.semantic}: features match ${JSON.stringify(matches)}, expected only ${r.local}`);
    const node = src.top.get(r.local)?.node, pin = pins.roots[r.semantic];
    if (!node || !pin || sha(src.code.slice(node.start, node.end)) !== pin.declarationSha256) throw Error(`settings-pages root changed: ${r.semantic}`);
    const alias = [...src.exported].find(([, l]) => l === r.local)?.[0] ?? null;
    if (alias !== r.export) throw Error(`settings-pages root ${r.semantic}: export is ${alias}, expected ${r.export}`);
  }
  for (const c of resolved) {
    const pin = pins.cuts[c.name];
    if (!pin || pin.file !== c.file || pin.local !== c.local || pin.declarationSha256 !== c.declarationSha256 || pin.unreachable !== c.unreachable) throw Error(`settings-pages cut changed: ${c.name}`);
  }
  if (Object.keys(pins.cuts).length !== resolved.length) throw Error('settings-pages: cut set differs from pins');
  if (sha(await fs.readFile(path.join(appRoot, adapterFile))) !== pins.hostAdapterSha256) throw Error('settings-pages adapter changed without review (pins.hostAdapterSha256)');
  if (sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))) !== pins.cdsCore.manifestSha256) throw Error('cds-core manifest differs from the one settings-pages pins (re-review: cds-core changed)');
  if (sha(await fs.readFile(path.join(generatedRoot, 'settings-nav/manifest.json'))) !== pins.settingsNav.manifestSha256) throw Error('settings-nav manifest differs from the one settings-pages pins (re-review: settings-nav changed)');
  if (sha(await fs.readFile(path.join(generatedRoot, 'files-changes-v4/manifest.json'))) !== pins.filesChangesV4?.manifestSha256) throw Error('files-changes-v4 manifest differs from the one settings-pages pins (re-review: files-changes-v4 changed)');
}

export async function extractSettingsPages(options = {}) {
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
    scope: 'settings page primitives (shared-1 II/jI/GI), General › Appearance (c0db37792 Hn; cbc28252c E wording overlay not sliced, see generator header), the Claude Code page code looks (cda9efc49 R Code appearance + M Appearance part all, the desktop c71860c77-puomdTO2 Ea `x && !C` groups; c51ac4bf6 row layer; FileDiff ca7ba268c Va answered by the host preview; round 4: the simple-nav GeneralCodeLooks c296a7a55 root is gone) and the Claude Code page setting groups (c8b630735 ot: the host renders parts local and notifications; desktop bridges AppPreferences / FilePickers / DesktopInfo answered by the host) and the Developer page (c71860c77-Cuocl2LF i: c8828a060 F > B > oe; the claude.settings MCP bridge answered by the host from the core\'s local MCP configuration); the General page shell zn (Profile: vendor-motion D1; Notifications: local-sessions store D1; Tasks / Memory: vendor-query skipToken identity — round4/settings/general/report.json), the Claude Code page shell c71860c77 Ea and the System page are not sliced here',
    sharedGraph: { area: 'cds-core', manifestSha256: pins.cdsCore.manifestSha256 },
    linkedAreas: [{ area: 'settings-nav', manifestSha256: pins.settingsNav.manifestSha256 }, { area: 'files-changes-v4', manifestSha256: pins.filesChangesV4.manifestSha256 }],
    roots: roots.map(r => ({ semantic: r.semantic, file: r.file, local: r.local, export: r.export, oldCounterpart: r.oldCounterpart, declarationSha256: pins.roots[r.semantic].declarationSha256 })),
    cuts: resolved.map(c => ({ name: c.name, importer: c.importer, file: c.file, local: c.local, export: c.export, declarationSha256: c.declarationSha256, unreachable: c.unreachable,
      contract: cuts.find(x => x.name === c.name).contract })),
    heldCopiesOfCdsCore: manifest.modules.flatMap(m => m.heldByViewTabs.map(name => `${m.source}#${name}`)),
    linkedPublicNames: [...new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'shared-graph').map(i => i.name)))].sort(),
    linkedFromSettingsNav: [...new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => `${i.via} -> ${i.from}#${i.name}`)))].sort(),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractSettingsPages({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
