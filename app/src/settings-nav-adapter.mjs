// Settings-nav host adapter (scripts/extract-settings-nav-v4.mjs cuts). Every export answers one cut; the generated
// official code (src/generated/settings-nav) imports these names instead of the claude.ai account / GrowthBook / query /
// o11y services it reads in the desktop.
//
// No answer is invented here: section gates read the host's SettingsNavHost value (SettingsNavHostProvider), which the
// host builds from its own facts (src/settings-shell-model.mjs settingsNavHostValue: boot, the Codex core, the surface).
// A missing provider throws, like the official "Must call inside CurrentAccountProvider", and so does a capability the
// host value does not answer. GrowthBook has one answer source, the host table (src/host-growthbook.mjs), looked up by
// growthBookFlagKey through cds-core-adapter hostGrowthBookFeature: the hooks (useGrowthBookFlag / When / FeatureOn) and
// the non-hook shared-0 Uu reader (readGrowthBookValue) all ask it, so a flag reads the same everywhere (review P1).
// Cuts the host never enters (`unreachable` in the generator) throw when called or rendered, so a wrong host answer
// surfaces instead of rendering nothing.
//
// Framework boundaries and i18n are the reviewed cds-core ones (one React / JSX runtime / ReactDOM, host catalog).
import * as React from 'react';
import { hostGrowthBookFeature, useHostIntl, HostFormattedMessage } from './cds-core-adapter.mjs';
export { loadHostReact, hostJsxRuntime, hostReactDom } from './cds-core-adapter.mjs';

const SettingsNavHostContext = React.createContext(null);
export function SettingsNavHostProvider({ value, children }) {
  return React.createElement(SettingsNavHostContext.Provider, { value }, children);
}
function useHost(name) {
  const host = React.useContext(SettingsNavHostContext);
  if (!host) throw Error(`settings-nav: ${name} must be called inside SettingsNavHostProvider`);
  return host;
}
const capability = name => {
  const hook = () => {
    const host = useHost(name);
    if (!Object.hasOwn(host.capabilities, name)) throw Error(`settings-nav: host capability ${name} is not answered`);
    return host.capabilities[name];
  };
  Object.defineProperty(hook, 'name', { value: name });
  return hook;
};
const unreachable = name => {
  const fn = () => { throw Error(`settings-nav: official branch ${name} entered, but the host contract excludes it`); };
  Object.defineProperty(fn, 'name', { value: name });
  return fn;
};

// i18n (react-intl surface the official code uses: formatMessage / FormattedMessage) over the host catalog.
export const useIntl = useHostIntl;
export const FormattedMessage = HostFormattedMessage;

// Account: the host's local profile (no claude.ai organization); the official CurrentAccount context is not copied.
export function useCurrentAccount() { return useHost('useCurrentAccount').account; }
export function useOptionalCurrentAccount() { return React.useContext(SettingsNavHostContext)?.account; }

// GrowthBook: the host table, by growthBookFlagKey (a name such as "claude_ai_plugins_in_chat" and its "__gb__<id>"
// read the same entry). Unlisted flags are off (D29 / D31).
const flagOn = flag => hostGrowthBookFeature(flag) === true;
export function useGrowthBookFlag(flag) { return flagOn(flag); }
export function useGrowthBookFlagWhen(flag, enabled) { return !!enabled && flagOn(flag); }
export function useGrowthBookFeatureOn(flag) { return flagOn(flag); }
// shared-0 Uu: forced value, else the client's value, else null without a client (callers compare `=== !0`).
export const readGrowthBookValue = hostGrowthBookFeature;

// o11y: the official settings store times settings_load / settings_tab_open / settings_panel_content; the host keeps
// them in its own sink when one is installed. Never the network.
const telemetrySink = event => globalThis.__settingsNavTelemetry?.push(event);
export function startInteractionTiming(name, options) { telemetrySink({ kind: 'start', name, route: options?.route, trigger: options?.trigger }); }
export function releaseInteractionTiming(name) { telemetrySink({ kind: 'release', name }); }
export function clearInteractionTiming(name) { telemetrySink({ kind: 'clear', name }); }

// Section gates and inputs: answered by the host capability table (settingsNavHostValue).
export const usePrivacySection = capability('usePrivacySection');
export const useClaudeCodeAvailable = capability('useClaudeCodeAvailable');
export const useCoworkSettingsVisible = capability('useCoworkSettingsVisible');
export const useBrowserExtensionSection = capability('useBrowserExtensionSection');
export const useBillingSection = capability('useBillingSection');
export const useConnectorsSection = capability('useConnectorsSection');
export const useUsageSettingsForced = capability('useUsageSettingsForced');
export const useUsageSectionVisible = capability('useUsageSectionVisible');
export const useInsightsPending = capability('useInsightsPending');
export const useUsagePaceIcon = capability('useUsagePaceIcon');
export const useInsightsSection = capability('useInsightsSection');
export const useCapabilitiesSection = capability('useCapabilitiesSection');
export const useSystemPromptSection = capability('useSystemPromptSection');
export const useAiFluencySection = capability('useAiFluencySection');
export const useTeachersSection = capability('useTeachersSection');
export const useIsDesktopApp = capability('useIsDesktopApp');
export const useOnThisDevice = capability('useOnThisDevice');
export const useCoworkMergedIntoAccount = capability('useCoworkMergedIntoAccount');
export const useNotificationsHidden = capability('useNotificationsHidden');
export const useReflectSections = capability('useReflectSections');
export const useDesignSystemsSection = capability('useDesignSystemsSection');
export const useMemorySection = capability('useMemorySection');
export const useCustomizePending = capability('useCustomizePending');
export const useAdminSettingsReachable = capability('useAdminSettingsReachable');
export const useAdminLinkPath = capability('useAdminLinkPath');
export const useManagedConfig = capability('useManagedConfig');
export const useServerGatesLoaded = capability('useServerGatesLoaded');
export const usePluginsDisabledCopyFlag = capability('usePluginsDisabledCopyFlag');
export const useImportSection = capability('useImportSection');
export const useExtensionsSection = capability('useExtensionsSection');
export const useLocalDevMcpEnabled = capability('useLocalDevMcpEnabled');
export const useSkillsSection = capability('useSkillsSection');
export const usePluginsVisibility = capability('usePluginsVisibility');
export const usePluginsAvailable = capability('usePluginsAvailable');
export const usePluginsInChat = capability('usePluginsInChat');
export const useInstalledPlugins = capability('useInstalledPlugins');
export const useMarketplaces = capability('useMarketplaces');
export const useAppSurface = capability('useAppSurface');
export const useUnseenAnnouncements = capability('useUnseenAnnouncements');
export const useCanManageOrgConnectors = capability('useCanManageOrgConnectors');
export const useConnectorRequestFlow = capability('useConnectorRequestFlow');
// q_ spreads this onto the row button; the host has no lazy section chunk to prefetch.
export function useSectionPrefetch() { useHost('useSectionPrefetch'); return undefined; }

// Branches the host contract excludes (fail loud).
export const RouterLink = unreachable('RouterLink');
export const useConfiguration = unreachable('useConfiguration');
export const useAnalytics = unreachable('useAnalytics');
export const UnifiedPluginsMergedPage = unreachable('UnifiedPluginsMergedPage');
export const PluginsDisabledPopover = unreachable('PluginsDisabledPopover');
export const PluginsShownByPopover = unreachable('PluginsShownByPopover');
export const SectionAnnouncementDot = unreachable('SectionAnnouncementDot');
