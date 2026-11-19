// Settings › Desktop host adapter (scripts/extract-settings-desktop-v4.mjs cuts). Every export answers one cut; the
// generated official desktop page (src/generated/settings-desktop-v4, 4.16336.0 c71860c77-B4INzBZs default Vs) imports
// these names instead of the claude.settings preload bridges, the claude.ai account / errors contexts and the official
// Storage dialog it reads in the desktop.
//
// No answer is invented here: every value is a host fact handed in through SettingsDesktopHostProvider
// (src/source-settings-desktop.jsx builds it from SourceSettings: the desktop snapshot's login item, the saved
// menuBarEnabled preference, build-info.json's version, the host storage report call, the host keep-awake store). A
// missing provider throws, like the official "Must call inside CurrentAccountProvider". Bridges whose facts the host does
// not have are not answered: the official code reads them as undefined and takes its no-bridge branch.
//
// Framework boundaries and i18n are the reviewed cds-core ones (one React / JSX runtime / ReactDOM, host catalog).
import * as React from 'react';
import { useHostIntl, HostFormattedMessage } from './cds-core-adapter.mjs';
import { t, tId } from '../electron/i18n/index.mjs';
import { HOST_APP_FEATURES } from './host-app-features.mjs';
import { keepAwakeStore } from './keep-awake-model.mjs';
import { HOST_GROWTHBOOK, growthBookFlagKey } from './host-growthbook.mjs';
export { loadHostReact, hostJsxRuntime, hostReactDom } from './cds-core-adapter.mjs';

// ---- the host value -------------------------------------------------------------------------------------------------
// { account: the CurrentAccount value (desktopPageAccount(settings-shell-model LOCAL_PROFILE_ACCOUNT)),
//   version: the desktop app version string (build-info.json) | null while unknown,
//   runOnStartup: boolean | null (the desktop snapshot's login item; null while the snapshot loads),
//   setRunOnStartup(enabled) → Promise<boolean> (main "desktop-startup": app.setLoginItemSettings, returns openAtLogin),
//   menuBarEnabled: boolean (saved preference, electron/menu-bar.cjs tray; default true),
//   setMenuBarEnabled(enabled) → Promise (the host preference save),
//   storage: { call(kind, payload) (desktopCall: "desktop-storage", "clear-cache-restart", …), settingsRoot (ref of the
//              Settings dialog the nested Storage dialog makes inert), Dialog (the host Storage dialog component) } | null,
//   errors: the host errors value (source-routines-shared-adapters.jsx useErrors),
//   allowedSites: { call, Dialog (src/source-preview-allowed-sites.jsx SourcePreviewAllowedSites) } | null }
// The local profile as the official CurrentAccount value: settings-shell-model LOCAL_PROFILE_ACCOUNT's account, no
// organization (activeOrganization undefined, the official encoding; the shared host model writes null).
export const desktopPageAccount = account => Object.freeze({ ...account, activeOrganization: account?.activeOrganization ?? undefined });
const SettingsDesktopHostContext = React.createContext(null);
const HOST_KEYS = ['account', 'version', 'runOnStartup', 'setRunOnStartup', 'menuBarEnabled', 'setMenuBarEnabled', 'storage', 'errors', 'allowedSites'];
function assertHost(value) {
  if (!value || typeof value !== 'object') throw Error('settings-desktop: SettingsDesktopHostProvider needs a host value');
  for (const key of HOST_KEYS) if (!Object.hasOwn(value, key)) throw Error(`settings-desktop: host value does not answer ${key}`);
  if (typeof value.setRunOnStartup !== 'function' || typeof value.setMenuBarEnabled !== 'function') throw Error('settings-desktop: host value setters must be functions');
  // The official CurrentAccount value has no activeOrganization (undefined) when there is none: shared-123 bC
  // `r !== void 0`, shared-26 `It()?.activeOrganization !== void 0`, c71860c77 Un `e === void 0 || …` (null would read as
  // an organization and crash HH on `.capabilities`).
  if (!value.account || typeof value.account !== 'object' || value.account.activeOrganization === null) throw Error('settings-desktop: host value account must be a CurrentAccount value (no organization = undefined activeOrganization)');
  if (value.storage !== null && (typeof value.storage?.call !== 'function' || typeof value.storage?.Dialog !== 'function')) throw Error('settings-desktop: host value storage must be { call, settingsRoot, Dialog } or null');
  return value;
}
function useHost(name) {
  const host = React.useContext(SettingsDesktopHostContext);
  if (!host) throw Error(`settings-desktop: ${name} must be called inside SettingsDesktopHostProvider`);
  return host;
}

// The bridges are module-load constants in the official code (`var Pi = globalThis["claude.settings"]?.Startup`), so they
// read the host value the provider last published. A read before any provider waits for one (the official effects call
// them once on mount; the first provider render publishes before its children's effects run).
let current = null;
const waiters = new Set();
function publish(host) {
  current = host;
  for (const waiter of [...waiters]) waiter();
}
function whenHost(test) {
  return new Promise(resolve => {
    const check = () => { if (current && test(current)) { waiters.delete(check); resolve(current); return true; } return false; };
    if (!check()) waiters.add(check);
  });
}

export function SettingsDesktopHostProvider({ value, children }) {
  const host = assertHost(value);
  if (current !== host) publish(host);
  React.useLayoutEffect(() => () => { if (current === host) current = null; }, [host]);
  return React.createElement(SettingsDesktopHostContext.Provider, { value: host }, children);
}

// ---- i18n (react-intl surface the official code uses: formatMessage / messages / FormattedMessage) -------------------
// U-16: one English word names two things here — 'System' is the theme choice (跟随系统) and this page's first group
// heading (I2acb3TGcT, 系统). A '#<id>' catalog entry (electron/i18n tId) becomes the descriptor's text before the host
// catalog looks it up; every other descriptor goes through the cds-core host intl unchanged.
const byId = message => {
  const shown = message && tId(message.id, message.defaultMessage);
  return shown && shown !== t(message.defaultMessage) ? { ...message, defaultMessage: shown } : message;
};
export function useIntl() {
  const intl = useHostIntl();
  return React.useMemo(() => ({ ...intl, formatMessage: (message, values) => intl.formatMessage(byId(message), values) }), [intl]);
}
export function FormattedMessage(props) {
  const { values, ...message } = props;
  return HostFormattedMessage({ ...byId(message), values });
}

// ---- shared-25 Pi (export K_) = globalThis["claude.settings"]?.Startup ----------------------------------------------
// xs: on mount `de.isStartupOnLoginEnabled().then(t)`, `de.isMenuBarEnabled().then(s)`; the switches call
// setStartupOnLoginEnabled(e) / setMenuBarEnabled(e) after setting their own state.
export const hostStartup = Object.freeze({
  isStartupOnLoginEnabled: async () => (await whenHost(host => typeof host.runOnStartup === 'boolean')).runOnStartup,
  setStartupOnLoginEnabled: async enabled => {
    if (!current) throw Error('settings-desktop: Startup.setStartupOnLoginEnabled outside SettingsDesktopHostProvider');
    return current.setRunOnStartup(enabled === true);
  },
  isMenuBarEnabled: async () => (await whenHost(() => true)).menuBarEnabled !== false,
  setMenuBarEnabled: async enabled => {
    if (!current) throw Error('settings-desktop: Startup.setMenuBarEnabled outside SettingsDesktopHostProvider');
    return current.setMenuBarEnabled(enabled === true);
  },
});

// ---- shared-25 Ii (export H_) = globalThis["claude.settings"]?.GlobalShortcut ---------------------------------------
// The host has no Quick Entry window and registers no Quick Entry shortcut (electron/main.cjs registers only the computer
// use Escape stop): the shortcut is empty. AppFeatures answers quickEntryGlobalShortcut unsupported, so xs hides the row
// that would set one; a set is refused.
export const hostGlobalShortcut = Object.freeze({
  getGlobalShortcut: async () => '',
  setGlobalShortcut: async () => { throw Error('settings-desktop: this host has no Quick Entry shortcut'); },
});

// ---- shared-25 Bi (export M_) = globalThis["claude.settings"]?.AppPreferences ---------------------------------------
// xs: getPreferences() → p, onPreferencesChanged(m) (its unsubscribe is the effect's cleanup), setPreference(key, value)
// for quickEntryShortcut / dictationShortcut / allowAllBrowserActions / chicago*. The host keeps one of the desktopPref
// keys this page reads: keepAwakeEnabled (src/keep-awake-model.mjs keepAwakeStore over main "keep-awake-read" /
// "settings"); the rest are absent (official `?.` / `?? default` / `!== void 0` branches). Writes of other keys are
// refused: the host has no store for them.
const prefsOf = state => (state.hasKey ? Object.freeze({ keepAwakeEnabled: state.enabled }) : Object.freeze({}));
export const hostAppPreferences = Object.freeze({
  getPreferences: async () => prefsOf(keepAwakeStore.getState()),
  onPreferencesChanged: listener => {
    let last = keepAwakeStore.getState();
    return keepAwakeStore.subscribe(() => {
      const next = keepAwakeStore.getState();
      if (next.enabled === last.enabled && next.hasKey === last.hasKey) return;
      last = next;
      listener(prefsOf(next));
    });
  },
  setPreference: async (key, value) => {
    if (key !== 'keepAwakeEnabled') throw Error(`settings-desktop: the host keeps no desktop preference ${key}`);
    keepAwakeStore.set(value === true);
  },
});

// ---- shared-25 Vi (export j_) = globalThis["claude.settings"]?.AppFeatures ------------------------------------------
// xs: getSupportedFeatures() → d (until it settles the page shows its skeleton), read with shared-92 U_ (`e[t] ||
// { status: "unavailable" }`). Host: its appFeatures table (host-app-features.mjs) and the desktop-page entries it has a
// fact for — no Quick Entry window (nativeQuickEntry / quickEntryDictation unavailable, quickEntryGlobalShortcut
// unsupported: the legacy shortcut row is hidden), no sableOtter; the tray exists on every platform (electron/menu-bar.cjs).
const unavailable = Object.freeze({ status: 'unavailable' });
const DESKTOP_PAGE_FEATURES = Object.freeze({
  ...HOST_APP_FEATURES,
  nativeQuickEntry: unavailable,
  quickEntryDictation: unavailable,
  quickEntryGlobalShortcut: Object.freeze({ status: 'unsupported' }),
  trayIcon: Object.freeze({ status: 'supported' }),
});
export const hostAppFeatures = Object.freeze({ getSupportedFeatures: async () => DESKTOP_PAGE_FEATURES });

// ---- c71860c77 Lo: the desktop app version (official: parsed from the "Claude/<version>" user agent) -----------------
// Io reads it through shared-25 Ei (`pe(Lo, null)`): a thrown read or null hides the row. Host: build-info.json version.
export function desktopAppVersion() {
  const version = current?.version;
  return typeof version === 'string' && version ? version : null;
}

// ---- shared-123 Zc (kB): server gate && GrowthBook flag ---------------------------------------------------------------
// The host renderer has no claude.ai boot configuration (serverGateNames) and never loads a server gate store: off.
export function useServerGatedFeature() { useHost('useServerGatedFeature'); return false; }

// ---- unreachable on this page (scripts/extract-settings-desktop-v4.mjs cut `branch`) ----------------------------------
const unreachable = name => function Unreachable() { throw Error(`settings-desktop: ${name} is unreachable on the desktop page (see the generator cut)`); };
export const StockDesktopPrefSetting = unreachable('c51ac4bf6 Oe (stock desktopPref binding)');
export const BrowserUseSection = unreachable('c71860c77 ho (Browser use, cd55d696d w is false)');
export const IntlProviderOverlay = unreachable('vendor-intl IntlProvider (c9599aae9 l overlay, shared-183 Ch is false)');

// ---- shared-18 ZV: Dispatch allowed. No claude.ai Dispatch on the host (as cowork-settings-v4 useDispatchAllowed) ------
export function useDispatchAllowed() { return false; }

// ---- Storage ----------------------------------------------------------------------------------------------------------
// shared-5 _c (yA): the Storage row is offered on the desktop app, on this device, when storage can be read. Host: its
// storage report (main "desktop-storage") is the fact; no storage call on the host value, no row.
export function useStorageSettingsAvailable() { return useHost('useStorageSettingsAvailable').storage !== null; }
// c71860c77 Fa: the Storage dialog ({ open, onOpenChange }). Host: its Storage dialog over the same report, mounted while
// open; closing it is onOpenChange(false).
export function StorageDialog({ open, onOpenChange }) {
  const storage = useHost('StorageDialog').storage;
  if (!open || !storage) return null;
  return React.createElement(storage.Dialog, { call: storage.call, settingsRoot: storage.settingsRoot, onClose: () => onOpenChange?.(false) });
}

// ---- account / errors ---------------------------------------------------------------------------------------------------
// shared-25 Z (export yi) and VB (export bi): the CurrentAccount value. Host: the local profile (no organization).
export function useCurrentAccount() { return useHost('useCurrentAccount').account; }
export function useOptionalCurrentAccount() { return React.useContext(SettingsDesktopHostContext)?.account; }
// shared-62 rP (export zl): useErrors(). Host: the host errors value.
export function useErrors() { return useHost('useErrors').errors; }

// ---- c1e3f823e o / a / l: keepAwakeEnabled (the same boundaries cowork-scheduled answers, over the one host store) ------
const keepAwakeState = () => keepAwakeStore.getState();
const useKeepAwakeState = () => React.useSyncExternalStore(keepAwakeStore.subscribe, keepAwakeState, keepAwakeState);
export function useKeepAwakeAvailable() { return useKeepAwakeState().hasKey; }
export function useKeepAwakeEnabled() { return useKeepAwakeState().enabled; }
const writeKeepAwake = value => keepAwakeStore.set(value);
export function useKeepAwakeWriter() { return writeKeepAwake; }
// shared-7 FI: the lazy effort slider slot, reached only through the sableOtter section (no sableOtter on this host).
export const EffortControlSlot = unreachable('shared-7 FI (lazy EffortControl under sableOtter)');
// ce3a18f86 r: the lazy PreviewAllowedSitesModal. Host: its Allowed sites dialog in the settings layer (as the cowork
// settings host answers it).
const SETTINGS_LAYER = Object.freeze({ base: 520, z: 520 });
export function PreviewAllowedSitesModal({ isOpen, onClose }) {
  const sites = useHost('PreviewAllowedSitesModal').allowedSites;
  if (!sites) throw Error('settings-desktop: PreviewAllowedSitesModal needs the host allowedSites value');
  return React.createElement(sites.Dialog, { isOpen, onClose, desktop: { call: (action, params) => sites.call(action, params) }, layer: SETTINGS_LAYER });
}
// c71860c77 Mo: the ancient-journal notice (ko: server gate off and no claude.web ancientJournalState bridge).
export const AncientJournalNotice = unreachable('c71860c77 Mo (ancient journal notice)');
// ---- shared-25 sd: useSearchParams. The host Settings dialog has no URL: empty search (the open-storage entry is the host
// anchor in SourceSettings). One frozen-shape value so the official memo deps stay stable.
const NO_SEARCH = new URLSearchParams('');
export function useSearchParams() { return NO_SEARCH; }
// ---- shared-25 go: a GrowthBook feature result. The host has no GrowthBook client; the one host table answers ----------
const OFF = Object.freeze({ value: null, on: false, off: true, source: 'unknownFeature' });
export function useGrowthBookFeature(key) {
  const name = growthBookFlagKey(key);
  if (!Object.hasOwn(HOST_GROWTHBOOK, name)) return OFF;
  const value = HOST_GROWTHBOOK[name];
  return { value, on: value === true, off: value !== true, source: 'force' };
}
// shared-25 Go: the GrowthBook feature value (listed boolean, else undefined: no GrowthBook answer).
export function useGrowthBookFeatureValue(key) {
  const name = growthBookFlagKey(key);
  return Object.hasOwn(HOST_GROWTHBOOK, name) ? HOST_GROWTHBOOK[name] : undefined;
}
// shared-25 is: a GrowthBook dynamic config (name, fallback, schema). No GrowthBook on the host: the caller's fallback.
export function useDynamicConfig(name, fallback) { return fallback; }
// ---- shared-0 y4: useConfiguration. No claude.ai boot configuration on the host (as cowork-scheduled answers it) --------
const NO_CONFIGURATION = Object.freeze({});
export function useAppConfiguration() { return NO_CONFIGURATION; }
