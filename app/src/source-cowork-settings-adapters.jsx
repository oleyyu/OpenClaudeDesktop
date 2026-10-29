// Local services for the 3.6556.2 Settings › Cowork page (c71860c77 De and its sections), which
// scripts/extract-cowork-settings.mjs emits into src/generated/cowork-settings (w13-coworkui-settings, research/w13-coworkui.md
// §1.5, cwui-38..42). Each export replaces one original declaration, which the extractor feature-checks (see its `adapters`
// table). OpenClaude has no claude.ai account (E59): the account profile, account settings and the session host answer
// from local preferences (electron/prefs/cowork-settings.mjs, electron/prefs/instructions.mjs), the desktop bridges
// (globalThis["claude.web"] / ["claude.settings"]) go through desktop:call ("cowork-settings", "cowork-folders"), and the
// parts that only exist for an account render nothing (their official mount points are pinned by the extractor).
import React, { createContext, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import { previewLinksStore } from './preview-links-model.mjs';
import { SourcePreviewAllowedSites } from './source-preview-allowed-sites.jsx';
import { normalizeInstructions } from '../electron/prefs/instructions.mjs';
import { COWORK_GLOBAL_INSTRUCTIONS_MAX, coworkMemoryEnabled } from '../electron/prefs/cowork-settings.mjs';
import { COWORK_CLAUDE_MD_CONFIG } from './cowork-outputs-model.mjs';

// The page's host: { config, call(action, params), onSave(patch) } (src/source-cowork-settings.jsx).
const EMPTY_HOST = Object.freeze({ config: Object.freeze({}), call: undefined, onSave: undefined });
const CoworkSettingsHost = createContext(EMPTY_HOST);
const useHost = () => useContext(CoworkSettingsHost) ?? EMPTY_HOST;
// The module-level bridges below are read at call time (as the official globalThis bridges are); the provider points
// them at the page's desktop:call while it renders.
let bridgeCall;
const callBridge = (action, params) => (typeof bridgeCall === 'function' ? Promise.resolve(bridgeCall(action, params)) : Promise.resolve(undefined));
export function CoworkSettingsHostProvider({ value, children }) {
  bridgeCall = value?.call;
  return <CoworkSettingsHost.Provider value={value ?? EMPTY_HOST}>{children}</CoworkSettingsHost.Provider>;
}

// ---- The page (c71860c77 De) ----
// shared-25 cc (vh): "is this the desktop app" from the Claude/<version> user agent. This window is the desktop app, but
// its user agent carries no Claude/ token, so the official test would answer the web page; here it is always the app.
export const useIsDesktopApp = () => true;
// shared-25 dY (p): the account profile is not cowork_instructions_union (uY `e?.cowork_instructions_union !== !0`): no
// profile here, so the Cowork page edits its own Global instructions (W) and never offers the account import (G).
export const useCoworkInstructionsSeparate = () => true;
// shared-78 CE (bv): Cowork is on for the account ({ enabled, isLoading }); the local Cowork runtime is on (E60).
const COWORK_ON = Object.freeze({ enabled: true, isLoading: false });
export const useCoworkEnabled = () => COWORK_ON;
// shared-18 Ov (Pp): yukon_silver_config.enableAdditionalDirectoriesClaudeMd, the Cowork config value that gates De's
// section list (`o && t(n, {children: [...]})`). Its built-in default is off, but the served config turns it on for
// Cowork accounts; the host serves no config and answers with COWORK_CLAUDE_MD_CONFIG, the one constant the Outputs
// CLAUDE.md row (cowork-outputs-model.mjs) reads too.
export const useCoworkAdditionalDirectoriesClaudeMd = () => COWORK_CLAUDE_MD_CONFIG;
// shared-52 YO (Ru): `{ onThisDevice: !An() }` — Cowork runs on this computer (no organization session host).
const ON_THIS_DEVICE = Object.freeze({ onThisDevice: true });
export const useCoworkHostLocation = () => ON_THIS_DEVICE;
// shared-104 cI (Nn): where sessions run: "device".
export const useCoworkPlacement = () => 'device';
// shared-104 JR (Tt): waits for the placement (pending until known), then renders children(placement).
export function CoworkPlacementBoundary({ children }) {
  return typeof children === 'function' ? children('device') : null;
}
// shared-104 pI: the session host's read state for an error; there is no session host.
export const coworkSessionHostReadState = () => undefined;
// cbef3b9e7 s: the "Cowork isn’t enabled for your organization" locked notice; never mounted (useCoworkEnabled is on).
export const CoworkLockedNotice = () => null;
// c79197f2b Ve / Ie (cwui-44, blocked): Require trusted devices and the device list read the account's device registry.
export const CoworkTrustedDevicesSetting = () => null;
export const CoworkTrustedDevicesList = () => null;
// c79197f2b Re: the Cowork guest pass (cowork_referrals, CLAUDE_CODE_GUEST_PASS) is an account referral.
export const CoworkGuestPassReferral = () => null;
// cfea69990 R (cwui-43, blocked): Dispatch pairs a phone through the account (getSessionsBridgeEnabled).
export const CoworkDispatchRow = () => null;
// cabd7b1c1 ee: the session-host backend switch ("switch_to_local_settings") only exists with an organization host.
export const CoworkBackendToggle = () => null;
// ced6780ff Be: importing "Instructions saved on this computer" into the account; there is no account to import into.
export const CoworkLocalInstructionsImport = () => null;
// shared-1 Mx: GrowthBook __gb__3213217663 (the secret-copy titles of the trusted-folder rows): off, no GrowthBook (D29).
export const useGate3213217663 = () => false;
// shared-78 lh: GrowthBook __gb__2142364912 or a foreign feature-flag organization: off.
export const useGate2142364912OrForeignOrg = () => false;

// ---- Global instructions (ced6780ff Se) ----
// ced6780ff ve: the account profile query and its PUT ({ query, putProfile, limit, notKept }). The profile is the local
// config: cowork_global_instructions is config.customInstructions.global, the text Settings › Instructions edits too, and
// work_function marks the profile row as present (j). dataUpdatedAt moves with the saved text, never before Se mounted.
export function useCoworkGlobalInstructionsProfile() {
  const { config, onSave } = useHost();
  const saved = normalizeInstructions(config?.customInstructions);
  const text = saved.global;
  const updatedAt = useMemo(() => Date.now(), [text]);
  const query = useMemo(() => ({ data: { cowork_global_instructions: text, work_function: null }, error: null, isFetchedAfterMount: true,
    dataUpdatedAt: updatedAt, errorUpdatedAt: 0, isFetching: false, isPaused: false, isError: false }), [text, updatedAt]);
  const latest = useMemo(() => ({ saved }), [config?.customInstructions]);
  const putProfile = useMemo(() => async (patch) => {
    if (typeof onSave !== 'function') throw new Error('Instructions can’t be saved here.');
    const value = typeof patch?.cowork_global_instructions === 'string' ? patch.cowork_global_instructions : '';
    await onSave({ customInstructions: { ...latest.saved, global: value } });
  }, [onSave, latest]);
  return { query, putProfile, limit: GLOBAL_LIMIT, notKept: false };
}
const GLOBAL_LIMIT = Object.freeze({ fits: (text) => text.length <= COWORK_GLOBAL_INSTRUCTIONS_MAX, maxLength: COWORK_GLOBAL_INSTRUCTIONS_MAX });
// shared-0 QS: CoworkMemory, the desktop bridge whose readGlobalMemory / writeGlobalMemory keep a local copy of the
// instructions next to the account's; the config is the only copy here, so no bridge (Se `!!C?.readGlobalMemory`).
export const coworkMemoryBridge = undefined;

// ---- Cowork files (cfea69990 P) ----
// shared-0 ZS: CoworkUserFiles { getInfo, pickTarget, migrate, reveal } (electron/prefs/cowork-settings.mjs).
export const coworkUserFiles = Object.freeze({
  getInfo: () => callBridge('cowork-settings', { op: 'files-info' }).catch(() => undefined),
  pickTarget: () => callBridge('cowork-settings', { op: 'files-pick' }),
  migrate: (path) => callBridge('cowork-settings', { op: 'files-migrate', path }),
  reveal: () => callBridge('cowork-settings', { op: 'files-reveal' }).catch(() => undefined),
});

// ---- Trusted Cowork folders (cabd7b1c1 se / te) ----
// shared-0 YS: LocalAgentModeSessions' trusted-folder calls, the cowork-folders service (cowork-runtime/folder-policy.mjs:
// trusted-add judges the folder and asks the trust consent; trusted-remove forgets it).
const preferenceListeners = new Set();
const announce = (result) => {
  if (!Array.isArray(result?.folders)) return result;
  const preferences = trustedPreferences(result.folders);
  for (const listener of preferenceListeners) listener(preferences);
  return result;
};
const trustedPreferences = (folders) => ({ localAgentModeTrustedFolders: folders, remoteFolderConsentMemory: [] });
export const coworkLocalAgentModeSessions = Object.freeze({
  browseAndAddTrustedFolder: () => callBridge('cowork-folders', { op: 'trusted-add' }).then(announce).then(() => undefined),
  addTrustedFolder: (path) => callBridge('cowork-folders', { op: 'trusted-add', path }).then(announce),
  removeTrustedFolder: (path) => callBridge('cowork-folders', { op: 'trusted-remove', path }).then(announce),
});
// shared-25 Wi: AppPreferences { getPreferences, onPreferencesChanged }; se reads localAgentModeTrustedFolders and
// remoteFolderConsentMemory (no "Don’t ask again" consent memory here: the trust prompt has no such choice).
export const coworkAppPreferences = Object.freeze({
  getPreferences: () => callBridge('cowork-folders', { op: 'trusted-list' })
    .then((result) => (Array.isArray(result?.folders) ? trustedPreferences(result.folders) : undefined), () => undefined),
  onPreferencesChanged: (listener) => { preferenceListeners.add(listener); return () => preferenceListeners.delete(listener); },
});
// shared-25 Ui: FilePickers, only read when browseAndAddTrustedFolder answers "disabled" (it never does here).
export const coworkFilePickers = undefined;

// ---- Preferred browser (cabd7b1c1 J / q) ----
// shared-78 GT: Claude in Chrome is connected and answered; the row shows only then (K `e ? t && n : r`). The local
// Chrome bridge is an agent tool, not a browser Cowork can default to, so the row stays hidden.
export const useClaudeInChromeAvailable = () => false;
// shared-78 lB / NR: the Claude in Chrome connector gates (the row's warning); off with the row.
export const useChromeExtensionMcpIntegration = () => false;
export const useClaudeInChromeConnectorEnabled = () => false;
// shared-18 pv: the web page's remote Claude browser (cowork_remote_claude_browser): off.
export const useCoworkRemoteClaudeBrowser = () => false;
// shared-18 fv (Up): { preferredBrowser, setPreferredBrowser, supported }: only the built-in browser here.
const BUILT_IN = Object.freeze({ preferredBrowser: 'built_in', setPreferredBrowser() {}, supported: false });
export const useCoworkPreferredBrowser = () => BUILT_IN;

// ---- Open links in built-in browser / Allowed sites (cdc95db1a f / p) ----
// shared-18 Tv / Ev: the desktop bridge has openExternalLinkInPreview / getPreviewAllowedOrigins: the Preview pane has both.
export const useOpenLinksInBuiltInBrowserAvailable = () => true;
export const usePreviewAllowedSitesAvailable = () => true;
// ce61829b3 n: [checked, setChecked] of the built-in-browser links preference: the Preview pane's own preference (the
// same store Settings › Code › Browser switches, src/preview-links-model.mjs).
export function useOpenLinksInBuiltInBrowser() {
  const checked = useSyncExternalStore(previewLinksStore.subscribe, previewLinksStore.getSnapshot, previewLinksStore.getSnapshot);
  return [checked, previewLinksStore.set];
}
// ce3a18f86 r: the lazily loaded PreviewAllowedSitesModal: the host's Allowed sites dialog, in the settings layer.
const SETTINGS_LAYER = Object.freeze({ base: 520, z: 520 });
export function PreviewAllowedSitesModal({ isOpen, onClose }) {
  const { call } = useHost();
  const desktop = useMemo(() => ({ call: (action, params) => call?.(action, params) }), [call]);
  return <SourcePreviewAllowedSites isOpen={isOpen} onClose={onClose} desktop={desktop} layer={SETTINGS_LAYER}/>;
}

// ---- Memory (c71860c77 me / he / ge) ----
// shared-78 xE: the desktop bridge supports Cowork memory (coworkKappa): the local Cowork runtime does.
export const useCoworkMemorySupported = () => true;
// cdef253bf j: the memory files Claude keeps for Cowork ({ memories, isSupported, isLoading, failure, deleteMemory }).
// The local Cowork runtime keeps none yet, so the list is the official empty state.
const NO_MEMORIES = Object.freeze({ memories: Object.freeze([]), isSupported: true, isLoading: false, failure: undefined, async deleteMemory() {} });
export const useCoworkMemories = () => NO_MEMORIES;
// shared-25 Z (zr): the current account; ge reads account.settings.enabled_cowork_memory, here config.coworkMemory.
export function useCoworkSettingsAccount() {
  const { config, memory } = useHost();
  const enabled = typeof memory === 'boolean' ? memory : coworkMemoryEnabled(config);
  return useMemo(() => ({ account: { settings: { enabled_cowork_memory: enabled } }, activeOrganization: undefined, isLoading: false }), [enabled]);
}
// shared-78 FO (e_): the account settings PATCH; ge sends { enabled_cowork_memory }.
export function useUpdateAccountSettings() {
  const { setMemory } = useHost();
  return useMemo(() => ({
    mutate(patch) {
      if (typeof patch?.enabled_cowork_memory !== 'boolean') return;
      const enabled = patch.enabled_cowork_memory;
      setMemory?.(enabled);
      void callBridge('cowork-settings', { op: 'memory', enabled }).catch(() => setMemory?.(!enabled));
    },
  }), [setMemory]);
}

// The host page's provider value: config, desktop:call, onSave, and the optimistic memory switch.
export function useCoworkSettingsHostValue({ config, call, onSave }) {
  const [memory, setMemory] = useState(undefined);
  const saved = coworkMemoryEnabled(config);
  const shown = memory === saved ? undefined : memory;
  return useMemo(() => ({ config: config ?? {}, call, onSave, memory: shown, setMemory }), [config, call, onSave, shown]);
}
