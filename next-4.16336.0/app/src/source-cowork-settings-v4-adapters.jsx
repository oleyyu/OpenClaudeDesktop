// Host adapters of the 4.16336.0 Settings › Cowork page (scripts/extract-cowork-settings-v4.mjs ->
// src/generated/cowork-settings-v4; isolated graph, no production switch: the host page src/source-cowork-settings.jsx
// keeps reading the 3.6556.2 graph src/generated/cowork-settings until the cutover, productionSwitchNotBeforeBatch 9).
//
// Each export answers one official 4.16336.0 declaration the extractor pins by features and raw sha256 (HOST_ADAPTERS /
// ADAPTER_PINS there). Where the 3.6556.2 graph or a linked 4.16336.0 area already answers the same official service, the
// name is re-exported from that host adapter (its semantics are documented there). The new answers below are service
// boundaries only (bridges, account queries, GrowthBook gates): OpenClaude has no claude.ai account (E59), so each answers
// what the official hook answers without one, and the official sections take their own closed branch (Dispatch without
// the sessions bridge, trusted devices / guest pass / backend toggle without the account features). No section component
// is replaced here.
import React from 'react';
import { SourcePictogram } from './source-pictogram.jsx';

// ---- Re-exported: the 3.6556.2 Cowork settings host (src/source-cowork-settings-adapters.jsx) ----
// shared-0 FH (3.6556.2 shared-25 cc), shared-123 Wy (shared-78 CE), shared-18 Fy (shared-18 Ov), shared-25 uQ (dY),
// shared-62 NA (shared-52 YO), shared-18 Ny / My (Ev / Tv), shared-18 by / yy (pv / fv), shared-123 nM / bA (lB / NR),
// shared-123 ay (shared-78 GT: Claude in Chrome answered), shared-1 jE (Mx), shared-0 kO / jO / MO (YS / ZS / QS),
// shared-25 zi / Bi (Ui / Wi), ce61829b3 n, ce3a18f86 r, ced6780ff ye (ve), shared-183 y$ / NY (shared-104 JR / pI).
export {
  useIsDesktopApp, useCoworkEnabled, useCoworkAdditionalDirectoriesClaudeMd, useCoworkInstructionsSeparate,
  useCoworkHostLocation, usePreviewAllowedSitesAvailable, useOpenLinksInBuiltInBrowserAvailable, useCoworkRemoteClaudeBrowser,
  useCoworkPreferredBrowser, useChromeExtensionMcpIntegration, useClaudeInChromeConnectorEnabled, useClaudeInChromeAvailable,
  useGate3213217663, coworkLocalAgentModeSessions, coworkUserFiles, coworkMemoryBridge, coworkFilePickers, coworkAppPreferences,
  useOpenLinksInBuiltInBrowser, PreviewAllowedSitesModal, useCoworkGlobalInstructionsProfile, CoworkPlacementBoundary,
  coworkSessionHostReadState, CoworkSettingsHostProvider, useCoworkSettingsHostValue,
} from './source-cowork-settings-adapters.jsx';
// ---- Re-exported: the routines-shared host (intl, errors, analytics, account, GrowthBook, query client) ----
export { useIntl, FormattedMessage, useErrors, useAnalytics, useCurrentAccount, useFeatureIsOn, useQueryClient } from './source-routines-shared-adapters.jsx';
// ---- Re-exported: the code-routines-v4 host (shared-183 pj, the history search-param remover) ----
export { removeSearchParams } from './source-code-routines-v4-adapters.jsx';

// shared-1 K$: the CDS Pictogram by name over the lazy PICTOGRAM_DEF_LOADERS chunk (c79901f9f, hundreds of lazy def
// chunks). The host bundles its defs (src/source-pictogram.jsx), as src/source-project-v3-adapters.jsx NamedPictogram
// does for the 3.6556.2 binding (shared-1 xR). Only the locked notice (cbef3b9e7 s) reads it, which the page mounts when
// Cowork is off for the organization; useCoworkEnabled answers on.
export function NamedPictogram({ name, size = 'md', className }) {
  return <SourcePictogram name={name} size={size} className={className} />;
}

// ---- Account-only services: the answers without a claude.ai account ----
// TanStack Query v5's result for a query that is not enabled (no account, no organization): pending and idle, no data.
const DISABLED_QUERY = Object.freeze({
  data: undefined, error: null, status: 'pending', fetchStatus: 'idle', isPending: true, isLoading: false, isFetching: false,
  isError: false, isSuccess: false, isPaused: false, isPlaceholderData: false, isFetchedAfterMount: false, isRefetching: false,
  dataUpdatedAt: 0, errorUpdatedAt: 0, refetch: () => Promise.resolve(DISABLED_QUERY),
});
// TanStack Query v5's idle mutation result; nothing here can send it (the account sections stay hidden), so a call
// rejects instead of pretending to save.
const unavailable = () => Promise.reject(new Error('This setting needs a Claude account.'));
const IDLE_MUTATION = Object.freeze({
  data: undefined, error: null, variables: undefined, status: 'idle', isIdle: true, isPending: false, isError: false, isSuccess: false,
  mutate() {}, mutateAsync: unavailable, reset() {},
});
// shared-212 EB / kB: the referral eligibility and redemptions queries (`/api/organizations/${org}/referral/...`).
export const useReferralEligibility = () => DISABLED_QUERY;
export const useReferralRedemptions = () => DISABLED_QUERY;
// shared-92 iO: the organization query (`/api/organizations/${uuid}`, enabled only with an organization).
export const useOrgQuery = () => DISABLED_QUERY;
// shared-92 fD: the Cowork remote device directory query (enabled only with an organization).
export const useCoworkRemoteDevices = () => DISABLED_QUERY;
// shared-92 _D / hD: the remote device DELETE / PATCH mutations; shared-92 zO: the organization settings PUT.
export const useCoworkRemoteDeviceRemoval = () => IDLE_MUTATION;
export const useCoworkRemoteDeviceUpdate = () => IDLE_MUTATION;
export const useOrgSettingsMutation = () => IDLE_MUTATION;
// shared-36 Uy: this device's row id in the account's device registry; there is no registry row.
export const useThisDeviceRowId = () => undefined;
// shared-18 Iy: the Cowork guest pass status (cowork_referrals, eligibility of CLAUDE_CODE_GUEST_PASS); the official
// answer when the pass is not offered.
const NO_GUEST_PASS = Object.freeze({ show: false, isPending: false });
export const useCoworkGuestPassStatus = () => NO_GUEST_PASS;
// shared-18 Ey: the trusted-devices hub (Require trusted devices, c79197f2b Ge); shared-18 hy: the remote device list
// (c79197f2b Be). Both read account features; off.
export const useCoworkTrustedDevicesHubAvailable = () => false;
export const useCoworkRemoteDevicesAvailable = () => false;
// shared-18 eH: the session-host backend toggle (cabd7b1c1 ee) shows only for an organization session host: off.
export const useCoworkBackendToggleShown = () => false;
// shared-26 ig: the account's dramatic_shrimp backend preference ({ isRemote, setIsRemote, isLoading }). Cowork runs on
// this computer.
const LOCAL_BACKEND = Object.freeze({ isRemote: false, setIsRemote: unavailable, isLoading: false });
export const useCoworkRemoteBackend = () => LOCAL_BACKEND;
// shared-18 RA: the confirm-before-switch wrapper of the backend toggle; without a pending organization policy it runs
// the switch at once (the official `await i()` branch).
const runAtOnce = async (_reason, run) => { await run(); };
export const useCoworkBackendSwitchConfirm = () => runAtOnce;
// shared-18 wA: the backend toggle's help URL (GrowthBook __gb__3695703908): no GrowthBook, no URL.
export const coworkBackendHelpUrl = () => undefined;
// shared-18 ZV / UV / GV: Dispatch's account gates (the dispatch policy "allowed", the dittos feature, its GrowthBook
// flag) and u1, the sessions bridge consent state ("unavailable" without the bridge's getSessionsBridgeEnabled, which
// coworkLocalAgentModeSessions does not offer: Dispatch hides itself, cfea69990 R `c === null`).
export const useDispatchAllowed = () => false;
export const useDittosAvailable = () => false;
export const useDispatchGate = () => false;
export const useSessionsBridgeState = () => 'unavailable';
