// Settings-pages host adapter (scripts/extract-settings-pages-v4.mjs cuts). Every export answers one cut; the generated
// official General › Appearance (src/generated/settings-pages-v4) imports these names instead of the claude.ai account,
// GrowthBook, Segment analytics and the official theme / motion / sidebar stores it reads in the desktop.
//
// No answer is invented here: the appearance values are the host's saved preferences (electron/preferences.mjs theme,
// motion, interfaceFont), handed in through SettingsPagesHostProvider (src/settings-pages-host.jsx builds the value from
// SourceSettings' prefs and onSave). A missing provider throws, like the official "Must call inside
// CurrentAccountProvider". GrowthBook has one answer source, the host table (src/host-growthbook.mjs), through
// cds-core-adapter hostGrowthBookFeature, exactly as settings-nav-adapter answers it.
//
// Framework boundaries and i18n are the reviewed cds-core ones (one React / JSX runtime / ReactDOM, host catalog).
import * as React from 'react';
import { hostGrowthBookFeature, useHostIntl } from './cds-core-adapter.mjs';
// cds-core public name useCdsMode (shared-frame Xa): the mode of the nearest official cds scope (shared-frame xo).
import { useCdsMode } from './generated/cds-core/shared-frame.mjs';
import { HOST_APP_FEATURES } from './host-app-features.mjs';
export { loadHostReact, hostJsxRuntime, hostReactDom } from './cds-core-adapter.mjs';

// ---- the host value -------------------------------------------------------------------------------------------------
// { account: the CurrentAccount value (settings-shell-model LOCAL_PROFILE_ACCOUNT),
//   theme: 'system' | 'light' | 'dark', resolvedTheme: 'light' | 'dark', motion: 'system' | 'reduce',
//   interfaceFont: 'anthropic' | 'system' | 'dyslexic' (| 'atkinson' when the host saves it),
//   save(patch): the host preference write (SourceSettings onSave),
//   codeThemeColors: the generated code theme table (src/generated/code-theme-colors.json, prepare-ui from the same
//                    @shikijs/themes the official highlighter resolves), keyed by code theme name,
//   CodeThemePreview: the host preview component ({ mode, theme }) of the fixed greet.ts diff }
const SettingsPagesHostContext = React.createContext(null);
const HOST_KEYS = ['account', 'theme', 'resolvedTheme', 'motion', 'interfaceFont', 'save', 'codeThemeColors', 'CodeThemePreview'];
// B3 (Claude Code groups) host value, optional for the General groups: appPreferences { prefs, set(key, value) },
// pickDirectory() and deepLink ({ param, value } | null, highlight(elementId)). B4 (Developer page): mcp { servers,
// setServerConfigs(servers), revealConfig() } and errors (useErrors). Checked where they are read.
function assertHost(value) {
  if (!value || typeof value !== 'object') throw Error('settings-pages: SettingsPagesHostProvider needs a host value');
  for (const key of HOST_KEYS) if (!Object.hasOwn(value, key)) throw Error(`settings-pages: host value does not answer ${key}`);
  if (typeof value.save !== 'function') throw Error('settings-pages: host value save must be a function');
  if (!value.codeThemeColors || typeof value.codeThemeColors !== 'object') throw Error('settings-pages: host value codeThemeColors must be the code theme table');
  if (typeof value.CodeThemePreview !== 'function') throw Error('settings-pages: host value CodeThemePreview must be a component');
  return value;
}
function useHost(name) {
  const host = React.useContext(SettingsPagesHostContext);
  if (!host) throw Error(`settings-pages: ${name} must be called inside SettingsPagesHostProvider`);
  return host;
}

// ---- shared-92 Y (export qg): interface font fields of the official frame store ---------------------------------------
// The official Interface font row (c0db37792 Mn: `xe(Nn)`, En: `pe(e, xe.getState())`), shared-92 xC (`Y(SC)`) and
// shared-23 _D (`J.getState().interfaceFont`) read the store as a zustand hook with a selector and through getState()
// from event handlers. The host answers with its saved interfaceFont under the official field names; setInterfaceFont
// (shared-92 Fb calls it with anthropic / system / dyslexic / atkinson) saves the host preference. The provider below
// publishes the current host value; outside a provider the store throws (no silent default).
let fontHost = null;
const fontListeners = new Set();
let fontState = null;
function publishFont(host) {
  const previous = fontState;
  fontHost = host;
  const interfaceFont = host?.interfaceFont ?? null;
  if (previous && previous.interfaceFont === interfaceFont) return;
  fontState = host ? Object.freeze({ interfaceFont, setInterfaceFont: value => fontHost.save({ interfaceFont: value }) }) : null;
  for (const listener of [...fontListeners]) listener(fontState, previous);
}
const fontSnapshot = () => {
  if (!fontState) throw Error('settings-pages: interfaceFontStore read outside SettingsPagesHostProvider');
  return fontState;
};
const subscribeFont = listener => (fontListeners.add(listener), () => fontListeners.delete(listener));
export function interfaceFontStore(selector = state => state) {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- the official store hook (zustand-shaped) is called as a hook
  return React.useSyncExternalStore(subscribeFont, () => selector(fontSnapshot()), () => selector(fontSnapshot()));
}
Object.assign(interfaceFontStore, {
  getState: fontSnapshot,
  setState: () => { throw Error('settings-pages: the interface font is the host preference; write it through setInterfaceFont'); },
  subscribe: subscribeFont,
});

export function SettingsPagesHostProvider({ value, children }) {
  const host = assertHost(value);
  // The store reads must see this host on the first render (official rows call getState from handlers only, but the
  // selector hook reads the snapshot while rendering): publish before the children render, and again on change.
  if (fontHost !== host) publishFont(host);
  if (themeHost !== host) themeHost = host;
  if (prefsHost !== host) prefsHost = host;
  // A changed preferences object reaches the official stores' onPreferencesChanged listeners after the render (they set
  // zustand state: never while rendering the provider).
  const prefsValue = host.appPreferences?.prefs;
  React.useLayoutEffect(() => { if (prefsValue) notifyPrefs(prefsValue); }, [prefsValue]);
  // B4: a changed MCP server map reaches B's onMcpConfigChange / onMcpStatusChanged listeners after the render, likewise.
  const mcpServers = host.mcp?.servers;
  React.useLayoutEffect(() => { if (mcpServers) notifyMcp(mcpServers); }, [mcpServers]);
  React.useLayoutEffect(() => () => { if (fontHost === host) publishFont(null); if (themeHost === host) themeHost = null; if (prefsHost === host) prefsHost = null; }, [host]);
  return React.createElement(SettingsPagesHostContext.Provider, { value: host }, children);
}

// ---- i18n (react-intl surface the official code uses: formatMessage / messages / FormattedMessage) -------------------
// E83 (assistant name): official copy on these pages that names Claude as the acting assistant reads with the running
// core's assistant, as the host rows it replaces did ("Keep computer awake while DeepSeek works"; the English key says
// DeepSeek, electron/i18n named() swaps in the core's assistant and the zh-CN catalog keys the DeepSeek text). Applied by
// id only while the official defaultMessage is the one below (the same mechanism as source-queued-bar-adapter.jsx
// QUEUED_BAR_PERSONA and source-routines-shared-adapters.jsx PERSONA_MESSAGES); product names (Claude Code, Claude
// Platform) are not the assistant and keep the official text.
export const SETTINGS_PAGES_PERSONA = Object.freeze({
  // cbc28252c (settings-registry): Claude Code › Sessions / On this computer rows
  "EcEP8qH6+A": { original: "Keep computer awake while Claude works", text: "Keep computer awake while DeepSeek works" },
  "StvyQfdEqi": { original: "Let Claude run multiple agents in parallel for complex tasks. Workflows can use a lot of your usage limit quickly.",
    text: "Let DeepSeek run multiple agents in parallel for complex tasks. Workflows can use a lot of your usage limit quickly." },
  "6/sAAh+NIB": { original: "Claude needs your approval to use a tool.", text: "DeepSeek needs your approval to use a tool." },
  "E4l5E2QoYp": { original: "Claude is asking you to choose between options.", text: "DeepSeek is asking you to choose between options." },
  "aFCUCfaD+M": { original: "Claude finished and is waiting for your input.", text: "DeepSeek finished and is waiting for your input." },
  // c8b630735 ot: bypass opt-in and Draw attention descriptions
  "YlYBASRBOt": { original: "Bypass all permission checks and let Claude work uninterrupted. This works well for workflows like fixing lint errors or generating boilerplate code. Letting Claude run arbitrary commands is risky and can result in data loss, system corruption, or data exfiltration (e.g., via prompt injection attacks). <link>See best practices for safe usage</link>",
    text: "Bypass all permission checks and let DeepSeek work uninterrupted. This works well for workflows like fixing lint errors or generating boilerplate code. Letting DeepSeek run arbitrary commands is risky and can result in data loss, system corruption, or data exfiltration (e.g., via prompt injection attacks). <link>See best practices for safe usage</link>" },
  "HOH5mdam48": { original: "Bounce the Dock icon when Claude needs your attention and the app isn’t focused.", text: "Bounce the Dock icon when DeepSeek needs your attention and the app isn’t focused." },
  "3SBJtWgrE1": { original: "Flash the taskbar button when Claude needs your attention and the app isn’t focused.", text: "Flash the taskbar button when DeepSeek needs your attention and the app isn’t focused." },
  "KgSix/c4Nx": { original: "Flash the app icon when Claude needs your attention and the app isn’t focused.", text: "Flash the app icon when DeepSeek needs your attention and the app isn’t focused." },
});
function personaMessage(message) {
  const persona = message && SETTINGS_PAGES_PERSONA[message.id];
  return persona && message.defaultMessage === persona.original ? { ...message, defaultMessage: persona.text } : message;
}
export function useIntl() {
  const intl = useHostIntl();
  return React.useMemo(() => ({ ...intl, formatMessage: (message, values) => intl.formatMessage(personaMessage(message), values) }), [intl]);
}
export function FormattedMessage({ values, ...message }) { return useIntl().formatMessage(message, values); }

// ---- account ---------------------------------------------------------------------------------------------------------
// shared-25 Z (export yi): the CurrentAccountProvider value. Host: the local profile (no organization, settings {}).
export function useCurrentAccount() { return useHost('useCurrentAccount').account; }
// shared-153 LT (export Oh): la("taint:hybrid_3p"), the active organization's capability list. Answered from the same
// host account value: the local profile has no organization, so no capability.
export function useHybrid3pOrganization() {
  const capabilities = useHost('useHybrid3pOrganization').account?.activeOrganization?.capabilities ?? [];
  return capabilities.includes('taint:hybrid_3p');
}
// shared-123 Vw (export G_): useUpdateAccountSettings (PATCH /api/account/settings). The host has no claude.ai account
// settings API. One account field the official rows write has a host home: code_default_transcript_view (c66de3d94 l, the
// Claude Code page Appearance group's Default transcript view, cda9efc49 M) is the host's saved transcriptView
// (electron/preferences.mjs, the same normal / thinking / verbose values), so a patch of exactly that field saves the host
// preference; the host value's account carries it back (settings-pages-host.jsx officialAccount). Any other field
// (shared-23 _D chat_font only reads the mutation) has no host fact and rejects loudly.
const ACCOUNT_SETTING_TO_HOST = Object.freeze({ code_default_transcript_view: 'transcriptView' });
export function useUpdateAccountSettings() {
  const host = useHost('useUpdateAccountSettings');
  const write = async patch => {
    const keys = Object.keys(patch ?? {});
    if (!keys.length || keys.some(key => !Object.hasOwn(ACCOUNT_SETTING_TO_HOST, key)))
      throw Error(`settings-pages: no claude.ai account settings service on the host (PATCH /api/account/settings ${JSON.stringify(keys)})`);
    await host.save(Object.fromEntries(keys.map(key => [ACCOUNT_SETTING_TO_HOST[key], patch[key]])));
  };
  return { mutate: (patch, options) => { write(patch).then(() => options?.onSuccess?.(undefined, patch), error => options?.onError?.(error, patch)); },
    mutateAsync: write, isPending: false };
}

// ---- GrowthBook: the host table, by growthBookFlagKey; unlisted flags are off (D29 / D31) ----------------------------
const flagOn = flag => hostGrowthBookFeature(flag) === true;
export function useGrowthBookFlag(flag) { return flagOn(flag); }
export function useGrowthBookFlagWhen(flag, enabled) { return !!enabled && flagOn(flag); }
export function useGrowthBookFeatureOn(flag) { return flagOn(flag); }

// ---- analytics: the host keeps the official events in its own sink when one is installed; never the network ----------
const telemetrySink = event => globalThis.__settingsPagesTelemetry?.push(event);
const analytics = Object.freeze({ track: event => telemetrySink({ kind: 'track', event }) });
export function useAnalytics() { return analytics; }

// ---- theme / motion: the host preferences ----------------------------------------------------------------------------
// shared-1 BF (export Ud): { theme, mode, resolvedMode, mounted, setTheme, setMode } (official zF shape). The official
// mode "auto" is the host theme "system"; Yt's segments are auto / light / dark.
const OFFICIAL_MODE = Object.freeze({ system: 'auto', light: 'light', dark: 'dark' });
const HOST_THEME = Object.freeze({ auto: 'system', light: 'light', dark: 'dark' });
export function useThemeMode() {
  const host = useHost('useThemeMode');
  return React.useMemo(() => {
    const mode = OFFICIAL_MODE[host.theme];
    if (!mode) throw Error(`settings-pages: host theme ${JSON.stringify(host.theme)} has no official mode`);
    return {
      theme: 'claude', mode, resolvedMode: host.resolvedTheme, mounted: true,
      setTheme: () => { throw Error('settings-pages: the host has one theme family (claude)'); },
      setMode: next => {
        if (!Object.hasOwn(HOST_THEME, next)) throw Error(`settings-pages: official theme mode ${JSON.stringify(next)} has no host theme`);
        return host.save({ theme: HOST_THEME[next] });
      },
    };
  }, [host]);
}
// shared-183 dN (export Uc): { mode, setMode, shouldReduceMotion }. Official: the "appearance:reduceMotion" local value
// (system / reduce) or the OS prefers-reduced-motion. Host: its saved motion preference (same values; appearance-root
// writes html[data-reduce-motion]) and the same media query.
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';
const subscribeReduce = listener => {
  const media = globalThis.matchMedia?.(REDUCE_QUERY);
  media?.addEventListener?.('change', listener);
  return () => media?.removeEventListener?.('change', listener);
};
const prefersReduce = () => globalThis.matchMedia?.(REDUCE_QUERY)?.matches === true;
export function useReduceMotion() {
  const host = useHost('useReduceMotion');
  const systemReduce = React.useSyncExternalStore(subscribeReduce, prefersReduce, () => false);
  return React.useMemo(() => {
    if (host.motion !== 'system' && host.motion !== 'reduce') throw Error(`settings-pages: host motion ${JSON.stringify(host.motion)} is not system / reduce`);
    return { mode: host.motion, setMode: next => host.save({ motion: next }), shouldReduceMotion: host.motion === 'reduce' || systemReduce };
  }, [host, systemReduce]);
}

// ---- B2 General › Code looks ------------------------------------------------------------------------------------------
// shared-25 VB (export bi): the CurrentAccount context value (c51ac4bf6 H organization capabilities, c66de3d94 c
// account.settings.code_default_transcript_view). Host: the same local profile as useCurrentAccount.
export function useCurrentAccountOptional() { return useHost('useCurrentAccountOptional').account; }
// shared-25 Go (export yg): the GrowthBook feature value, undefined without an answer (official: no GrowthBook client).
// The host table answers listed flags; an unlisted flag is undefined, so the official fallback runs (c51ac4bf6 le: the
// anthropic.com address check → the row chrome stays off for the local profile).
export function useGrowthBookFeatureValue(flag) {
  const value = hostGrowthBookFeature(flag);
  return value === null ? undefined : value;
}
// c51ac4bf6 ae: the accountSetting stock binding. Code looks and the Claude Code local / notifications groups never call
// it (B3 slices U and W as official code over the bridges below); calling it is a wiring error and throws.
export function useAccountSettingBinding(def) {
  throw Error(`settings-pages: useAccountSettingBinding (c51ac4bf6 ae, accountSetting) is not answered on this page (setting ${def?.id ?? "?"})`);
}
// shared-36 fm (export Po): createContext(false), read by Mm (code font size is null inside a routine preview). The one
// official copy is in code-routines-v4 without an export; the settings page has no fm provider above it, so the value it
// reads is the default false. cds-core request (cdsCoreNeeds): publish shared-36 fm so both graphs link one instance.
export const codeFontSizeScopeContext = React.createContext(false);
// c34e6410a s (export t): lazily loads the code highlight stack (cce0118b1: resolveTheme, …) once. c6e73333a x only calls
// resolveTheme(name) for the selected light / dark code themes to read bg + colors (code theme CSS variables). Host: the
// generated code theme table carries exactly those colors per theme (prepare-ui resolves the same @shikijs/themes).
let themeHost = null;
let highlightStack = null;
function resolveHostTheme(name) {
  if (!themeHost) throw Error('settings-pages: code themes resolved outside SettingsPagesHostProvider');
  const entry = themeHost.codeThemeColors[name];
  if (!entry) throw Error(`settings-pages: code theme ${JSON.stringify(name)} is not in the host code theme table`);
  return { name, type: entry.mode, bg: entry.bg, fg: entry.fg, colors: entry.editor?.colors ?? {} };
}
export function loadCodeHighlightStack() {
  highlightStack ??= Promise.resolve(Object.freeze({ resolveTheme: async name => resolveHostTheme(name) }));
  return highlightStack;
}
// ca7ba268c Va (export r): @pierre/diffs FileDiff, here only as the Code appearance preview (cda9efc49 R: fixed greet.ts
// diff, unified, classic indicators, no file header, wrapped) inside the official cds scope that forces the column's
// mode. Host: its preview of the same diff (SourceCodeThemePreview, rendered by the host value) under that mode with the
// official theme pair's theme for it.
export function CodeThemePreviewFileDiff(props) {
  const host = useHost('CodeThemePreviewFileDiff');
  const mode = useCdsMode();
  const theme = props.theme?.[mode];
  if (typeof theme !== 'string') throw Error(`settings-pages: FileDiff theme has no ${mode} code theme`);
  return React.createElement(host.CodeThemePreview, { mode, theme });
}

// ---- B3 Claude Code page (c8b630735 ot): desktop bridges ----------------------------------------------------------------
// shared-25 Bi (export M_) = globalThis["claude.settings"]?.AppPreferences, the preload bridge the official desktop page
// reads through c6673aecb (desktop prefs store: getPreferences + onPreferencesChanged, c51ac4bf6 U re-reads after a write),
// shared-123 x_ (keep-awake stores: getPreferences / onPreferencesChanged / setPreference) and ot (setPreference for the
// bypass opt-in and the notification levels). The host has no claude.settings preload: this object answers the same three
// methods from the host value's appPreferences — prefs: the host's saved preferences under the official desktopPref keys
// (built by src/settings-pages-host.jsx from electron/desktop-settings.cjs desktopPreferences: keys without a host fact are
// absent, so the official whenMissing / `!== void 0` branches hide those rows), set(key, value): the host save of that key
// (rejects for a key the host does not keep). Outside a provider the bridge throws (no silent default).
let prefsHost = null;
const prefsListeners = new Set();
let notifiedPrefs = null;
function notifyPrefs(next) {
  if (next === notifiedPrefs) return;
  notifiedPrefs = next;
  for (const listener of [...prefsListeners]) listener(next);
}
function appPreferences(method) {
  const prefs = prefsHost?.appPreferences;
  if (!prefs || typeof prefs.set !== 'function' || !prefs.prefs || typeof prefs.prefs !== 'object')
    throw Error(`settings-pages: AppPreferences.${method} outside a SettingsPagesHostProvider whose value answers appPreferences`);
  return prefs;
}
export const hostAppPreferences = Object.freeze({
  getPreferences: async () => appPreferences('getPreferences').prefs,
  onPreferencesChanged: listener => { prefsListeners.add(listener); return () => prefsListeners.delete(listener); },
  setPreference: async (key, value) => appPreferences('setPreference').set(key, value),
});
// shared-25 zi (export V_) = globalThis["claude.settings"]?.FilePickers: ot se calls getDirectoryPath(false) for Worktree
// location › Custom… and saves { customPath: paths[0] }. Host: its folder picker (pickDirectory → [path] | undefined).
export const hostFilePickers = Object.freeze({
  getDirectoryPath: async multiple => {
    if (typeof prefsHost?.pickDirectory !== 'function') throw Error('settings-pages: FilePickers.getDirectoryPath outside a host value that answers pickDirectory');
    return prefsHost.pickDirectory(multiple === true);
  },
});
// shared-25 Hi (export z_) = globalThis["claude.settings"]?.DesktopInfo, read once per window by shared-26 DF (ot: the
// platform of the Draw attention description and the platform fallback). Host: the host value's desktopInfo, the
// Session info card's DesktopInfo answer (src/source-code-transcript-adapters.jsx desktopInfo, handed over by
// src/settings-pages-host.jsx). Outside a provider that answers it, it throws (no silent default).
export const hostDesktopInfo = Object.freeze({
  getSystemInfo: () => {
    const info = prefsHost?.desktopInfo;
    if (!info || typeof info.getSystemInfo !== 'function') throw Error('settings-pages: DesktopInfo.getSystemInfo outside a SettingsPagesHostProvider whose value answers desktopInfo');
    return info.getSystemInfo();
  },
});
// shared-92 Lp (_O): F_("claude_code_desktop_bypass_permissions").isAvailable — an organization feature gate over the
// claude.ai bootstrap. The local profile has no organization (settings-shell-model LOCAL_PROFILE_ACCOUNT): available. The
// host requirements policy is applied by the bypass preference write (appPreferences.set refuses when it disallows).
export function useBypassPermissionsFeatureAvailable() { useHost('useBypassPermissionsFeatureAvailable'); return true; }
// shared-92 ly (F_): { isAvailable, status } for a claude.ai bootstrap feature (cf50036ec E: the bypass gate signals).
const AVAILABLE = Object.freeze({ isAvailable: true, status: 'available' });
export function useFeatureAvailability() { useHost('useFeatureAvailability'); return AVAILABLE; }
// shared-123 mu (dR): lR().enabled, Claude Code desktop enabled for the organization. Local profile: Claude Code is the app.
export function useClaudeCodeDesktopEnabled() { useHost('useClaudeCodeDesktopEnabled'); return true; }
// shared-25 Mi (YB): qB("raven"), the active organization's "raven" capability. Local profile: no organization.
export function useRavenOrganization() {
  const capabilities = useHost('useRavenOrganization').account?.activeOrganization?.capabilities ?? [];
  return capabilities.includes('raven');
}
// shared-8 hx: the managed Claude Code settings query (official: the CLI's managed-settings files through
// resolveLocalSettings / resolveSSHSettings). The host has no managed-settings source: settled with nothing managed,
// no error, the desktop does not resolve disable modes; rereading has nothing to reread.
const NO_MANAGED = Object.freeze({
  capabilities: Object.freeze({ fastMode: undefined, bypassPermissions: undefined, autoPermissions: undefined, workflows: undefined }),
  config: Object.freeze({}), configSettled: true, configErrored: false, desktopResolvesDisableModes: false,
  rereadConfig: () => {},
});
export function useManagedClaudeCodeSettings() { return NO_MANAGED; }
// c2d87f9e7 o: the settings deep-link action ({ rendered, action, param, value, elementId, flash }): once the row is rendered
// and the link names it (router ?param=value or a pending action), highlight elementId. Host: SourceSettings opens a page
// with its own anchor ('code#bypass' from the Mode menu's Bypass › Enable); the host value's deepLink answers which
// { param, value } is open and highlights the element (the host's anchor highlight).
export function useSettingsDeepLinkAction({ rendered, param, value, elementId }) {
  const deepLink = useHost('useSettingsDeepLinkAction').deepLink ?? null;
  const done = React.useRef(false);
  const matches = !!deepLink && deepLink.param === param && deepLink.value === value;
  React.useEffect(() => {
    if (!rendered || done.current || !matches) return;
    done.current = true;
    deepLink.highlight(elementId);
  }, [rendered, matches, elementId, deepLink]);
}
// shared-123 Zc (kB): server gate (AB) && GrowthBook flag (V). The host renderer has no claude.ai boot configuration
// (serverGateNames) and never loads a server gate store, so NB is undefined and AB false: the feature is off, whatever the
// GrowthBook table says (the same answer as src/source-session-rail-kit-adapters.jsx useServerGatedFeature).
export function useServerGatedFeature(flag) {
  useHost('useServerGatedFeature');
  const serverGate = undefined; // NB: no serverGateNames, no loaded gate store
  return serverGate === true && flagOn(flag);
}
// shared-123 Cb (q): the desktop appFeatures map (official: the main process's supported features). Host: its table
// (host-app-features.mjs) plus Keep awake, which the host implements itself (electron/desktop-settings.cjs power-save
// blocker; the same answer as source-session-rail-adapters.jsx useDesktopAppFeatures). Absent entries read unavailable.
const CLAUDE_CODE_APP_FEATURES = Object.freeze({ ...HOST_APP_FEATURES, codeSessionKeepAwake: Object.freeze({ status: 'supported' }) });
export function useDesktopAppFeatures() { useHost('useDesktopAppFeatures'); return CLAUDE_CODE_APP_FEATURES; }

// ---- B4 Developer page (c71860c77-Cuocl2LF i: c8828a060 F > B > oe): desktop bridges ----------------------------------
// shared-25 Li (export W_) = globalThis["claude.settings"]?.MCP, the preload bridge c8828a060 B reads. The host has no
// claude.settings preload: this object answers B's methods from the host value's mcp, built by src/settings-pages-host.jsx
// from the running core's local MCP configuration (electron/settings-pages.cjs mcpDefinitions + the core's server statuses):
//   getMcpServersConfigWithStatus()  → { [key]: { command, args, env, status, error, extensionId } } (B's first read)
//   onMcpConfigChange(listener)      → listener(servers) when the host's configured set or a definition changes
//   onMcpStatusChanged(listener)     → listener(key, status, error) when only a server's status changes
//   setMcpServerConfigs(servers)     → B's delete (after its own window.confirm): the host removes the keys left out
//                                      through the core's MCP config write (developer-server-actions.mjs removeDeveloperServer
//                                      flow: mcp-remove, then re-read)
//   revealConfig()                   → the host Edit config (main.cjs desktop-edit-config opens the core's config file)
// revealServerLog is absent: the host keeps no per-server MCP log, so B's `_?.revealServerLog?.(n)` takes the official
// no-method branch. isLocalDevMcpEnabled is absent: no device policy on the host (shared-55 tg: developer servers enabled).
const mcpConfigListeners = new Set();
const mcpStatusListeners = new Set();
let notifiedMcp = null;
const mcpDefinitionKey = server => JSON.stringify([server?.command ?? null, server?.args ?? null, server?.env ?? null, server?.url ?? null, server?.extensionId ?? null]);
const pendingMcpReads = new Set();
function notifyMcp(next) {
  const previous = notifiedMcp;
  if (next === previous) return;
  notifiedMcp = next;
  if (pendingMcpReads.size) { for (const resolve of [...pendingMcpReads]) resolve(next); pendingMcpReads.clear(); }
  if (!previous) return;
  const before = Object.keys(previous), after = Object.keys(next);
  const sameSet = before.length === after.length && after.every(key => Object.hasOwn(previous, key));
  if (!sameSet || after.some(key => mcpDefinitionKey(previous[key]) !== mcpDefinitionKey(next[key]))) {
    for (const listener of [...mcpConfigListeners]) listener(next);
    return;
  }
  for (const key of after) {
    if (previous[key].status === next[key].status && previous[key].error === next[key].error) continue;
    for (const listener of [...mcpStatusListeners]) listener(key, next[key].status, next[key].error);
  }
}
// mcp.servers is null while the host's first MCP snapshot is being read: B's first read then waits for it (B keeps its
// official loading skeleton, `Q = Z || !w`).
function mcpHost(method) {
  const mcp = prefsHost?.mcp;
  if (!mcp || typeof mcp !== 'object' || (mcp.servers !== null && typeof mcp.servers !== 'object'))
    throw Error(`settings-pages: MCP.${method} outside a SettingsPagesHostProvider whose value answers mcp`);
  return mcp;
}
export const hostMcpBridge = Object.freeze({
  getMcpServersConfigWithStatus: () => {
    const { servers } = mcpHost('getMcpServersConfigWithStatus');
    return servers ? Promise.resolve(servers) : new Promise(resolve => pendingMcpReads.add(resolve));
  },
  onMcpConfigChange: listener => { mcpConfigListeners.add(listener); return () => mcpConfigListeners.delete(listener); },
  onMcpStatusChanged: listener => { mcpStatusListeners.add(listener); return () => mcpStatusListeners.delete(listener); },
  setMcpServerConfigs: async servers => mcpHost('setMcpServerConfigs').setServerConfigs(servers),
  revealConfig: () => mcpHost('revealConfig').revealConfig(),
});
// shared-0 FH (via shared-55 Be: `Be(pe)`, pe = shared-0 OI { version: ">=0.12.0" }): is this the desktop app at or above
// that version. The settings window is always the OpenClaude desktop app (the same answer as source-cowork-settings-adapters.jsx
// and source-sidebar-sections-adapters.jsx useIsDesktopApp), so F renders the page instead of shared-25 kh's not-found.
export function useIsDesktopApp() { return true; }
// shared-62 rP (useErrors): the host value's errors (src/settings-pages-host.jsx hands over the routines-shared host errors,
// source-routines-shared-adapters.jsx useErrors: host toasts).
export function useErrors() {
  const errors = useHost('useErrors').errors;
  if (!errors || typeof errors.addError !== 'function') throw Error('settings-pages: useErrors needs a host value that answers errors');
  return errors;
}
