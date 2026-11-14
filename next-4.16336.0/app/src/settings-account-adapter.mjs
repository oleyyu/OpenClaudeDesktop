// Settings account pages host adapter (scripts/extract-settings-account-v4.mjs). The official Privacy route runs over
// cds-core's published runtime; the bridges it reads at module load (globalThis["claude.settings"] / ["claude.web"]) are
// absent on this host, so the official no-bridge branches run. Answered here: the reviewed framework boundaries (one
// React / JSX runtime / ReactDOM, the cds-core ones) and the one cut below.
export { loadHostReact, hostJsxRuntime, hostReactDom } from './cds-core-adapter.mjs';

// shared-62 Qk useServedDeploymentConfig (cut: its effect writes cds-core's Zk; cds-core does not publish Qk, W8S-H1).
// The official no-organization branch: shared-62 LO `t = oe() && !!activeOrganization?.uuid` is false without a claude.ai
// organization, so `asks` is false and Qk returns `e ? t.data?.served : void 0` = undefined (and writes Zk = undefined,
// its initial value). The same answer every graph that cuts Qk gives (src/source-routine-cowork-adapters.jsx
// useServedDeploymentConfig for frame-sidebar-nav and cowork-scheduled-v4); kept in this .mjs so the graph stays
// importable without the JSX transform (node --test SSR).
export function useServedDeploymentConfig() {
  return undefined;
}

// shared-25 ro useGrowthBookClient / io growthBookEval (cuts): the GrowthBook React context and its evaluation. The host
// has no GrowthBook client; the one table (src/host-growthbook.mjs) answers every flag, as frame-sidebar-nav-host.jsx
// answers the same two boundaries. io is called as io(client, key).
import { HOST_GROWTHBOOK, growthBookFlagKey } from './host-growthbook.mjs';
export function useGrowthBookClient() {
  return null;
}
export function growthBookEval(client, key) {
  const flag = growthBookFlagKey(key);
  if (!Object.hasOwn(HOST_GROWTHBOOK, flag)) return { value: null, on: false, off: true, source: 'unknownFeature' };
  const value = HOST_GROWTHBOOK[flag];
  return { value, on: value === true, off: value !== true, source: 'force' };
}

// shared-55 privacy gates (cuts; see scripts/extract-settings-account-v4.mjs contracts). The local profile has no
// claude.ai organization ("raven" false) and the host GrowthBook table lists none of the privacy flags, so each gate takes
// its official no-organization / flag-off branch. Evaluated through the same table, so a flag the host opens later opens here.
import { hostGrowthBookFlag } from './host-growthbook.mjs';
export function usePrivacySection() {
  return { show: true, isPending: false };
}
export function usePrivacyUploadedFilesPage() {
  return { show: hostGrowthBookFlag('privacy_uploaded_files_page_main') === true, isPending: false };
}
export function useExportDataPermissions() {
  // Uh with s = Hu() unknown here: the official expression is `!s && e && (…)`; e = export_data off → false regardless.
  const exportData = hostGrowthBookFlag('export_data') === true, rollout = hostGrowthBookFlag('allow_member_data_export_rollout') === true;
  if (exportData || rollout) throw Error('settings-account: the host GrowthBook table opened export_data / allow_member_data_export_rollout; Uh needs the claude.ai permission and feature answers it reads (re-review the cut)');
  return { canExportData: false, ownDataOnly: false, isPending: false };
}
// cbcbc9460 I: organization admin settings reachable — no organization on the local profile.
export function useAdminSettingsAvailable() {
  return false;
}
// shared-123 PB: server gates ready — host GrowthBook answers are synchronous (home-v4 useHomeServerGates, settings-nav Dr).
export function useServerGatesReady() {
  return true;
}
// vendor-intl q / Gt: the host i18n (same answer as settings-nav / settings-pages-v4 useIntl / FormattedMessage).
export { useHostIntl as useIntl, HostFormattedMessage as FormattedMessage } from './cds-core-adapter.mjs';
