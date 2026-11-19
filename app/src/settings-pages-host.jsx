// Host side of the settings-pages-v4 graph (scripts/extract-settings-pages-v4.mjs): builds the SettingsPagesHost value
// the cuts answer from (src/settings-pages-adapter.mjs) out of SourceSettings' saved preferences and its save, and mounts
// the official General › Appearance group (4.16336.0 c0db37792 Hn) under it.
//
// settingsPagesHostValue facts:
//   account        settings-shell-model LOCAL_PROFILE_ACCOUNT (the same local profile settings-nav answers with): no
//                  claude.ai organization (shared-153 LT taint:hybrid_3p → false), settings {} (shared-23 _D chat_font).
//   theme          the saved theme (system / light / dark); resolvedTheme the scheme it shows now (theme-command-model
//                  resolveThemeMode over prefers-color-scheme, as main.jsx writes html[data-mode]).
//   motion         the saved motion (system / reduce); interfaceFont the saved interface font (anthropic / system /
//                  dyslexic): electron/preferences.mjs appearancePreferences, applied by appearance-root.mjs.
//   save(patch)    SourceSettings' per-row save (optimistic value, row error on failure).
//
// The editorPrefs store (shared-36 Om, the one copy is in the generated graph) mirrors the host's saved transcript text
// size / width (chatTextSize ↔ transcriptSize, transcriptWidthChoice ↔ transcriptWidth, the s / m / l values both use),
// and an official write to it (c0db37792 mn / hn, shown on General only while their gates are on) saves the host
// preference, so the host stays the one saved source.
import React, { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { GeneralAppearance } from './generated/settings-pages-v4/general.mjs';
// Round 4: the Claude Code page code looks (cda9efc49 R Code appearance, M Appearance; c71860c77-puomdTO2 Ea `x && !C`).
import { CodeAppearanceSection, CodeTranscriptAppearanceSection } from './generated/settings-pages-v4/code-appearance.mjs';
import codeThemeColors from './generated/code-theme-colors.json';
import { SourceCodeThemePreview } from './source-code-theme-preview.jsx';
import { useEditorPrefsStore } from './generated/settings-pages-v4/editor-prefs.mjs';
import { useCodeFontSizeRoot } from './generated/settings-pages-v4/code-font-size-root.mjs';
import { ClaudeCodeSettingsGroups } from './generated/settings-pages-v4/claude-code.mjs';
import { DeveloperSettingsPage } from './generated/settings-pages-v4/developer-page.mjs';
// Host errors (addError → danger toast) for the official useErrors reads (shared-62 rP), one host answer.
import { useErrors as useHostErrors } from './source-routines-shared-adapters.jsx';
import { desktopInfo } from './source-code-transcript-adapters.jsx';
// TanStack Query of the 4.16336.0 graphs (files-changes-v4 file-browser-query.mjs; settings-pages-v4 links its contexts).
import { QueryClient, QueryClientProvider } from './generated/files-changes-v4/file-browser-query.mjs';
import { SettingsPagesHostProvider } from './settings-pages-adapter.mjs';
import { LOCAL_PROFILE_ACCOUNT, notificationLevel, keepAwakeEnabled } from './settings-shell-model.mjs';
import { resolveThemeMode } from './theme-command-model.mjs';
import { mcpStatus } from './settings-model.mjs';
import { t } from '../electron/i18n/index.mjs';

const DARK_QUERY = '(prefers-color-scheme: dark)';
const subscribeDark = listener => {
  const media = globalThis.matchMedia?.(DARK_QUERY);
  media?.addEventListener?.('change', listener);
  return () => media?.removeEventListener?.('change', listener);
};
const prefersDark = () => globalThis.matchMedia?.(DARK_QUERY)?.matches === true;

export function settingsPagesHostValue({ theme, motion, interfaceFont, prefersDark: dark = false, save, transcriptView }) {
  return { account: officialAccount(transcriptView), theme, resolvedTheme: resolveThemeMode(theme, dark), motion, interfaceFont, save,
    codeThemeColors, CodeThemePreview: SourceCodeThemePreview, desktopInfo };
}

// The CurrentAccount value the official rows read (useCurrentAccount / useCurrentAccountOptional): the local profile, and
// round 4 one account setting with a host home — code_default_transcript_view is the host's saved transcriptView
// (electron/preferences.mjs: normal / thinking / verbose, c66de3d94's own values). Without a saved view the field is
// absent (c66de3d94 c → its default "normal", what the host's transcriptView default is too).
const TRANSCRIPT_VIEWS = new Set(['normal', 'thinking', 'verbose']);
export function officialAccount(transcriptView) {
  if (!TRANSCRIPT_VIEWS.has(transcriptView)) return LOCAL_PROFILE_ACCOUNT;
  return Object.freeze({ ...LOCAL_PROFILE_ACCOUNT,
    account: Object.freeze({ ...LOCAL_PROFILE_ACCOUNT.account, settings: Object.freeze({ ...LOCAL_PROFILE_ACCOUNT.account.settings, code_default_transcript_view: transcriptView }) }) });
}

const SIZES = new Set(['s', 'm', 'l']);
// Host saved values → the official store (only when they differ); official writes → host save.
function useEditorPrefsMirror(transcriptSize, transcriptWidth, save) {
  useEffect(() => {
    const state = useEditorPrefsStore.getState(), patch = {};
    if (SIZES.has(transcriptSize) && state.chatTextSize !== transcriptSize) patch.chatTextSize = transcriptSize;
    if (SIZES.has(transcriptWidth) && state.transcriptWidthChoice !== transcriptWidth) patch.transcriptWidthChoice = transcriptWidth;
    if (Object.keys(patch).length) useEditorPrefsStore.setState(patch);
  }, [transcriptSize, transcriptWidth]);
  useEffect(() => useEditorPrefsStore.subscribe((state, previous) => {
    if (state.chatTextSize !== previous.chatTextSize && state.chatTextSize !== transcriptSize) save({ transcriptSize: state.chatTextSize });
    if (state.transcriptWidthChoice !== previous.transcriptWidthChoice && state.transcriptWidthChoice !== null && state.transcriptWidthChoice !== transcriptWidth)
      save({ transcriptWidth: state.transcriptWidthChoice });
  }), [transcriptSize, transcriptWidth, save]);
}

// B2 Code looks: the host's saved code font (codeFont ↔ editorFont) and code theme pair (codeThemeLight / codeThemeDark,
// the same field names) mirror into the official store; an official write saves the host preference. The code font
// size (codeFontSize) has no host preference: the official store (persisted 'epitaxy-editor-prefs') is its only home.
const CODE_KEYS = [['codeFont', 'editorFont'], ['codeThemeLight', 'codeThemeLight'], ['codeThemeDark', 'codeThemeDark']];
function useCodeLooksMirror(code, save) {
  const { codeFont, codeThemeLight, codeThemeDark } = code;
  useEffect(() => {
    const state = useEditorPrefsStore.getState(), patch = {};
    for (const [host, official] of CODE_KEYS) if (typeof code[host] === 'string' && code[host] && state[official] !== code[host]) patch[official] = code[host];
    if (typeof codeFont === 'string' && state.editorFont !== codeFont) patch.editorFont = codeFont;
    if (Object.keys(patch).length) useEditorPrefsStore.setState(patch);
  }, [codeFont, codeThemeLight, codeThemeDark]);
  useEffect(() => useEditorPrefsStore.subscribe((state, previous) => {
    for (const [host, official] of CODE_KEYS)
      if (state[official] !== previous[official] && typeof state[official] === 'string' && state[official] !== code[host]) save({ [host]: state[official] });
  }), [codeFont, codeThemeLight, codeThemeDark, save]);
}

// fix-r2 U-33: mounted once by the window (main.jsx App), as the desktop mounts c66fe388e `ct` (shared-20 bb): the
// editorPrefs store's code font size on html (data-code-font-size, --epitaxy-code-font-size / --epitaxy-code-leading), the
// variables the transcript code blocks, diffs and terminal read.
// fix-r2 U-34: the host's saved transcript text size / width seed the store from launch on (not only while Settings is
// open): the Code transcript reads its prose size from this same store (extract-code-transcript.mjs shared-7 jg →
// useTranscriptEditorPrefsStore), so a preferences.json size shows without a localStorage copy.
export function useOfficialEditorPrefsRoot({ transcriptSize, transcriptWidth } = {}) {
  useCodeFontSizeRoot();
  useEffect(() => {
    const state = useEditorPrefsStore.getState(), patch = {};
    if (SIZES.has(transcriptSize) && state.chatTextSize !== transcriptSize) patch.chatTextSize = transcriptSize;
    if (SIZES.has(transcriptWidth) && state.transcriptWidthChoice !== transcriptWidth) patch.transcriptWidthChoice = transcriptWidth;
    if (Object.keys(patch).length) useEditorPrefsStore.setState(patch);
  }, [transcriptSize, transcriptWidth]);
}

function useHostValue({ theme, motion, interfaceFont, save, transcriptView }) {
  const dark = useSyncExternalStore(subscribeDark, prefersDark, () => false);
  return useMemo(() => settingsPagesHostValue({ theme, motion, interfaceFont, prefersDark: dark, save, transcriptView }), [theme, motion, interfaceFont, dark, save, transcriptView]);
}

// SourceSettings › General (tab 'preferences'): the official Appearance group.
export function SettingsGeneralAppearance({ theme, motion, interfaceFont, transcriptSize, transcriptWidth, save }) {
  const value = useHostValue({ theme, motion, interfaceFont, save });
  useEditorPrefsMirror(transcriptSize, transcriptWidth, save);
  return <SettingsPagesHostProvider value={value}><GeneralAppearance/></SettingsPagesHostProvider>;
}

// SourceSettings › Claude Code (round 4): the official code looks of the desktop Claude Code page. shared-1 Vd is false on
// desktop (simple nav off: shared-183 Ch = GrowthBook && mh, mh = !1), so c71860c77-puomdTO2 Ea renders, after its model
// group, `x && !C && n(Wn, {})` = cda9efc49 R (Code appearance: light / dark code theme over the greet.ts preview, Code
// font family, Code font size) and `x && !C && n(Un, {})` = cda9efc49 M part "all" (Appearance: Transcript text size,
// Transcript width, Default transcript view). The host's saved code font / themes / transcript size / width mirror into
// the official editorPrefs store and its writes save the host preferences (as before on General); the default transcript
// view is the host transcriptView through the account setting the official row reads and writes. These sections render
// between the ot groups on the same page and the adapter's desktop bridges (hostAppPreferences / hostFilePickers) answer
// from the provider rendered last, so this provider carries the same Claude Code page host value (useClaudeCodeHostValue:
// desktop preferences, folder picker, deep link) as SettingsClaudeCodeGroups; config / pickDirectory / deepLink are
// the ones SourceSettings hands those groups.
export function SettingsClaudeCodeAppearance({ theme, motion, interfaceFont, transcriptSize, transcriptWidth, transcriptView, codeFont, codeThemeLight, codeThemeDark, save, config, codeSave, pickDirectory, deepLink }) {
  const value = useClaudeCodeHostValue({ theme, motion, interfaceFont, transcriptView, appearanceSave: save, config, save: codeSave, pickDirectory, deepLink });
  useEditorPrefsMirror(transcriptSize, transcriptWidth, save);
  useCodeLooksMirror({ codeFont, codeThemeLight, codeThemeDark }, save);
  return <SettingsPagesHostProvider value={value}><CodeAppearanceSection/><CodeTranscriptAppearanceSection/></SettingsPagesHostProvider>;
}

// ---- B3 Settings › Claude Code: the official local-sessions / notifications groups (4.16336.0 c8b630735 ot) ------------
// ot reads the desktop preferences through the official AppPreferences bridge (src/settings-pages-adapter.mjs
// hostAppPreferences). The host's saved desktop preferences (electron/desktop-settings.cjs desktopPreferences, the same
// values SourceSettings shows) are handed over under the official desktopPref keys; an official write saves the host key.
// Keys the host keeps no fact for (ccNextActions, ccNewTaskPrompt, ccRemoteControlDefaultEnabled,
// bypassPermissionsOptInByAccount, …) are absent, so the official rows that need them hide (U whenMissing "hide",
// ot `F?.x !== void 0`).
const LEVEL_KEYS = Object.freeze({ permission: 'permissionNotifications', question: 'questionNotifications', idle: 'completeNotifications' });
const LEVELS = new Set(['off', 'badge', 'banner']);
export function officialDesktopPrefs(config) {
  // The host rows' own reading of an unset value (electron/desktop-settings.cjs defaults, as SourceSettings showed them):
  // levels Banners (settings-shell-model notificationLevel), sound System sound, Draw attention off, keep-awake on
  // (keepAwakeEnabled), archive Never (0), worktree Inside project.
  const notificationLevels = {};
  for (const [official, host] of Object.entries(LEVEL_KEYS)) {
    const value = notificationLevel(config[host]);
    if (LEVELS.has(value)) notificationLevels[official] = value;
  }
  const prefs = { notificationLevels };
  prefs.notificationSound = config.notificationSound === 'none' ? 'none' : 'system';
  prefs.dockBounceEnabled = config.drawAttention === true;
  prefs.ccKeepAwakeWhileWorking = keepAwakeEnabled(config.keepAwake);
  prefs.ccKeepAwakeOnBattery = keepAwakeEnabled(config.keepAwakeOnBattery);
  prefs.ccAutoArchiveInactiveDays = Number.isInteger(config.archiveInactiveDays) ? config.archiveInactiveDays : 0;
  // chillingSlothLocation: "default" (Inside project) or { customPath } (main.cjs desktop-worktree-folder saves the folder).
  prefs.chillingSlothLocation = config.worktreeLocation === 'custom' && typeof config.worktreeDirectory === 'string' && config.worktreeDirectory
    ? { customPath: config.worktreeDirectory } : 'default';
  prefs.bypassPermissionsModeEnabled = config.allowBypassPermissions === true;
  return prefs;
}
// official desktopPref write → host save patch (throws for a key the host does not keep: the bridge rejects, the official
// row shows its write failure / reverts).
export function hostPatchForPreference(key, value, config, picked = null) {
  switch (key) {
    case 'notificationLevels': {
      const patch = {};
      for (const [official, host] of Object.entries(LEVEL_KEYS)) if (value?.[official] !== undefined && value[official] !== config[host]) patch[host] = value[official];
      return patch;
    }
    case 'notificationSound': return { notificationSound: value };
    case 'dockBounceEnabled': return { drawAttention: value };
    case 'ccKeepAwakeWhileWorking': return { keepAwake: value };
    case 'ccKeepAwakeOnBattery': return { keepAwakeOnBattery: value };
    case 'ccAutoArchiveInactiveDays': return { archiveInactiveDays: value };
    case 'chillingSlothLocation':
      if (value === 'default') return { worktreeLocation: 'project' };
      // the custom folder was saved by the host picker (pickDirectory) before ot saves { customPath }
      if (value && typeof value === 'object' && typeof value.customPath === 'string' && (value.customPath === picked || value.customPath === config.worktreeDirectory)) return {};
      throw Error('settings-pages: a custom worktree folder is saved by the host folder picker');
    case 'bypassPermissionsModeEnabled': return { allowBypassPermissions: value === true };
    default: throw Error(`settings-pages: the host keeps no desktop preference ${JSON.stringify(key)}`);
  }
}

// The app's QueryClient defaults (official shared-23 `new _S({defaultOptions:{queries:{staleTime:3e5,refetchOnWindowFocus:!1,…}}})`,
// as source-breadcrumb-adapters.jsx fileBrowserQueryClient): ot's queries (c27343114 ccd-user-settings-fresh) are disabled
// without the claude.web ClaudeCode bridge, so nothing is fetched here.
const claudeCodeQueryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 3e5, refetchOnWindowFocus: false, retry: false } } });

// SourceSettings › Claude Code: the official groups for `part` ("local" = Sessions on this computer, "notifications").
// config: SourceSettings' shown values; save(patch): its commit; pickDirectory(): the host folder picker (saves the custom
// worktree folder, returns [path] | undefined); deepLink: { param, value, highlight(elementId) } | null.
// The Claude Code page host value: the settings-pages base value (theme / motion / fonts / account, whose writes go through
// appearanceSave, default save) plus the desktop bridges ot reads (appPreferences over config, written through save; the
// folder picker; the deep link).
function useClaudeCodeHostValue({ theme, motion, interfaceFont, transcriptView, appearanceSave, config, save, pickDirectory, deepLink }) {
  const base = useHostValue({ theme, motion, interfaceFont, save: appearanceSave ?? save, transcriptView });
  const prefs = useMemo(() => officialDesktopPrefs(config), [config]);
  const picked = useRef(null);
  return useMemo(() => ({ ...base, deepLink,
    pickDirectory: async multiple => { const paths = await pickDirectory(multiple); picked.current = paths?.[0] ?? null; return paths; },
    appPreferences: { prefs, set: async (key, next) => { const patch = hostPatchForPreference(key, next, config, picked.current); if (Object.keys(patch).length) await save(patch); } } }),
  [base, prefs, config, save, pickDirectory, deepLink]);
}
export function SettingsClaudeCodeGroups({ part, theme, motion, interfaceFont, config, save, pickDirectory, deepLink }) {
  const value = useClaudeCodeHostValue({ theme, motion, interfaceFont, config, save, pickDirectory, deepLink });
  return <QueryClientProvider client={claudeCodeQueryClient}><SettingsPagesHostProvider value={value}><ClaudeCodeSettingsGroups part={part}/></SettingsPagesHostProvider></QueryClientProvider>;
}

// ---- B4 Settings › Developer: the official page (4.16336.0 c71860c77-Cuocl2LF i: c8828a060 F > B > oe) ---------------
// B reads the local MCP servers through the official claude.settings MCP bridge (src/settings-pages-adapter.mjs
// hostMcpBridge). The host's renderer snapshot of the running core's MCP servers (SourceSettings `desktop`:
// electron/settings-pages.cjs mcpDefinitions — command, url, args, environment variable names, never their values — and
// the core's server statuses) is handed over in the official record shape c8828a060 L reads:
//   { [name]: { command, args, env, status, error, extensionId } }
// status: the host state in the official vocabulary of shared-55 OO ("running" / "initializing" → Starting / "failed"):
// connected → running; starting / not started / a listed server the core has not reported yet → initializing; a tools
// error or failed → failed with the host message; disabled / cancelled / sign-in required → failed, the host's own label
// as the error (settings-model mcpStatus), since the official vocabulary has no such state. A server whose status entry
// lists tools without a runtime state (a core that reports tools only) is running.
// env: the names only; the host never hands environment values to the renderer, so L shows `NAME=`.
// extensionId: the host plugin that manages the server (L hides Delete and says "This server is managed by an extension").
export function officialMcpServers(desktop) {
  const definitions = desktop?.mcpDefinitions || [], statuses = desktop?.servers || [];
  const names = [...new Set([...definitions.map(server => server.name), ...statuses.map(server => server.name)])];
  const servers = {};
  for (const name of names) {
    const definition = definitions.find(server => server.name === name), server = statuses.find(row => row.name === name);
    const entry = {};
    if (typeof definition?.command === 'string') entry.command = definition.command;
    if (definition?.args?.length) entry.args = definition.args;
    if (definition?.environmentNames?.length) entry.env = Object.fromEntries(definition.environmentNames.map(key => [key, '']));
    if (typeof server?.pluginId === 'string' && server.pluginId) entry.extensionId = server.pluginId;
    Object.assign(entry, officialMcpStatus(server, desktop));
    servers[name] = entry;
  }
  return servers;
}
function officialMcpStatus(server, desktop) {
  if (!server) return { status: 'initializing' };
  if (server.toolsError) return { status: 'failed', error: t(server.toolsError) };
  const state = server.runtimeStatus?.status || server.runtimeStatus?.type || server.runtimeStatus;
  if (state === 'connected') return { status: 'running' };
  if (state === 'starting' || state === 'notStarted') return { status: 'initializing' };
  if (state === 'failed') return { status: 'failed', ...(typeof server.runtimeStatus?.error === 'string' && server.runtimeStatus.error ? { error: server.runtimeStatus.error } : {}) };
  if (typeof state === 'string' && state) return { status: 'failed', error: t(mcpStatus(server)) };
  if (Object.keys(server.tools || {}).length > 0) return { status: 'running' };
  return desktop?.serversPending ? { status: 'initializing' } : { status: 'failed', error: t(mcpStatus(server)) };
}

// SourceSettings › Developer: the official page. desktop: SourceSettings' MCP snapshot (undefined while the first read
// runs: the official B then shows its loading skeleton until getMcpServersConfigWithStatus answers); removeServer(name):
// the host removal through the core's MCP config write (B already asked with its window.confirm); revealConfig(): the
// host Edit config.
export function SettingsDeveloperPage({ theme, motion, interfaceFont, desktop, removeServer, revealConfig }) {
  const base = useHostValue({ theme, motion, interfaceFont, save: noSave });
  const errors = useHostErrors();
  // The fast first read (serversPending, no statuses yet) with nothing listed is still loading (as the host page was).
  const loading = !desktop || (desktop.serversPending === true && !(desktop.mcpDefinitions?.length || desktop.servers?.length));
  const servers = useMemo(() => (loading ? null : officialMcpServers(desktop)), [loading, desktop]);
  const value = useMemo(() => ({ ...base, errors, mcp: {
    servers,
    setServerConfigs: async next => {
      const removed = Object.keys(servers ?? {}).filter(name => !Object.hasOwn(next, name));
      try { for (const name of removed) await removeServer(name); }
      catch (error) { errors.addError(t('Couldn’t remove {serverName}.', { serverName: removed.join(', ') }), { error, messageForLogging: 'Couldn’t remove MCP server' }); throw error; }
    },
    revealConfig,
  } }), [base, errors, servers, removeServer, revealConfig]);
  return <SettingsPagesHostProvider value={value}><DeveloperSettingsPage/></SettingsPagesHostProvider>;
}
const noSave = async () => { throw Error('settings-pages: the Developer page saves no appearance preference'); };
