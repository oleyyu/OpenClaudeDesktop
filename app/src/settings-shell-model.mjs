// Fidelity F14: pure pieces of the Settings shell and Local sessions rows, ported from the original.
import { t } from '../electron/i18n/index.mjs';
import { hostGrowthBookFlag } from './host-growthbook.mjs';
import { LOCAL_EXTENSION_GROUPS } from './settings-tab-compat.mjs';

// shared-22-Cz3C_T8d.js:3915-3918 zC: nav-hidden sections leave the nav and the narrow tabs only. (2.31226.0
// shared-19 ZC lists Usage again; the claudified_usage_page_pace treatment oC only swaps its icon, so no local
// section is nav-hidden now.) 4.16336.0 settings-nav: the official sections come from useSettingsSections (shared-55
// Kg, generated/settings-nav); this now serves the OpenClaude local extension groups only.
export function settingsNavSections(sections) {
  return sections.some(section => section.navHidden) ? sections.filter(section => !section.navHidden) : sections;
}

// The OpenClaude local extension groups as the official SettingsNavGroup (J_) takes them: { title, sections: [{ id,
// label, icon, testId }] }. `entries` are the host tab entries ({ id, label, icon }) still listed for the running core
// (source-settings.jsx navTabs); a group with none left is not drawn. testId openclaude-<id> (productionPlan P7).
export function localNavGroups(entries, labelOf = entry => entry.label) {
  const byId = new Map(settingsNavSections(entries).map(entry => [entry.id, entry]));
  return LOCAL_EXTENSION_GROUPS.map(group => ({
    id: group.id, title: group.title,
    sections: group.sections.filter(id => byId.has(id)).map(id => ({ id, label: labelOf(byId.get(id)), icon: byId.get(id).icon, testId: `openclaude-${id}` })),
  })).filter(group => group.sections.length > 0);
}

// The SettingsNavHost value src/settings-nav-adapter.mjs answers the official settings-nav cuts from (generator
// scripts/extract-settings-nav-v4.mjs, contract per cut). Every answer is a host fact:
//   surface         main.jsx mode ('code' / 'chat' / 'cowork'): Yg disables customize-plugins in chat while the host
//                   GrowthBook table does not serve claude_ai_plugins_in_chat (official reason: "Plugins are only
//                   available in Cowork and Code").
//   coworkEnabled   boot.coworkEnabled: the Cowork page is listed only then (CODE_DESKTOP_COWORK=0 hides it).
//   importAvailable the Codex core is connected: Claude Code › Import from Claude Code (the official Import & export).
// The account is the host's local profile: no claude.ai organization and no memberships, so no Organization, admin
// or Platform links (useAdminSettingsReachable false; y_'s membership test fails).
export const LOCAL_PROFILE_ACCOUNT = Object.freeze({
  account: Object.freeze({ uuid: 'openclaude-local-profile', email_address: null, memberships: Object.freeze([]), settings: Object.freeze({}) }),
  activeOrganization: null,
});
export function settingsNavHostValue({ surface = 'code', coworkEnabled = false, importAvailable = false } = {}) {
  if (!['code', 'chat', 'cowork'].includes(surface)) throw Error(`settings-nav: unknown host surface ${JSON.stringify(surface)}`);
  return {
    account: LOCAL_PROFILE_ACCOUNT,
    capabilities: {
      usePrivacySection: { show: true, isPending: false },
      useClaudeCodeAvailable: true,
      useCoworkSettingsVisible: { show: coworkEnabled === true, isPending: false },
      useBrowserExtensionSection: false,
      useBillingSection: false,
      useConnectorsSection: true,
      useUsageSettingsForced: true,
      useUsageSectionVisible: true,
      useInsightsPending: false,
      useUsagePaceIcon: false,
      useInsightsSection: false,
      useCapabilitiesSection: false,
      // Tg / zh / lg / Rn read GrowthBook only (cut with their account checks): the one host table answers.
      useSystemPromptSection: hostGrowthBookFlag('system_prompt_editor'),
      useAiFluencySection: hostGrowthBookFlag('claude_ai_fluency_report_main'),
      useTeachersSection: false,
      useIsDesktopApp: true,
      useOnThisDevice: { onThisDevice: true },
      useCoworkMergedIntoAccount: false,
      useNotificationsHidden: false,
      useReflectSections: hostGrowthBookFlag('cardinal'),
      useDesignSystemsSection: { show: false, isPending: false },
      useMemorySection: true,
      useCustomizePending: false,
      useAdminSettingsReachable: false,
      useAdminLinkPath: '/settings',
      useManagedConfig: { data: null },
      useServerGatesLoaded: true,
      usePluginsDisabledCopyFlag: hostGrowthBookFlag('__gb__3213217663'),
      useImportSection: importAvailable === true,
      useExtensionsSection: false,
      useLocalDevMcpEnabled: true,
      useSkillsSection: true,
      usePluginsVisibility: { areVisible: true, disabledReason: undefined },
      usePluginsAvailable: true,
      usePluginsInChat: true,
      useInstalledPlugins: { data: [], isLoading: false },
      useMarketplaces: { data: [], isLoading: false },
      useAppSurface: surface,
      useUnseenAnnouncements: [],
      useCanManageOrgConnectors: true,
      useConnectorRequestFlow: false,
    },
  };
}

// cc011544b _t (SettingsNavSearch) focuses its field on mount; shared-22:4508/:4549 sw: the popup never
// takes initial focus itself. The narrow tabs and the stacked (nav-hidden) Usage page have no search, so
// the popup keeps focus there.
export function settingsInitialFocus({ narrow, section }) {
  return !narrow && section !== 'usage' ? 'search' : 'popup';
}

// menus W3 (cc011544b-Bdta0Cl7 On): with popupScrolls (the stacked Settings dialog) a section change scrolls the
// pane's nearest scrolling ancestor (overflow-y auto/scroll) back to the top; a position:fixed ancestor ends the walk.
export function scrollPopupToTop(node) {
  for (let element = node?.parentElement; element; element = element.parentElement) {
    const { overflowY, position } = (element.ownerDocument?.defaultView ?? globalThis).getComputedStyle(element);
    if (overflowY === 'auto' || overflowY === 'scroll') { element.scrollTop = 0; return element; }
    if (position === 'fixed') return null;
  }
  return null;
}

// c71860c77-yvGrrWO9.js:2004-2029 D: permission and question offer Off / Badge only / Banners; Task complete
// (idle) offers Off / Banners. No item is disabled (:2240-2275).
const OFF = { value: 'off', label: t('Off') }, BADGE = { value: 'badge', label: t('Badge only') }, BANNER = { value: 'banner', label: t('Banners') };
export const NOTIFICATION_LEVEL_ITEMS = Object.freeze({
  permissionNotifications: Object.freeze([OFF, BADGE, BANNER]),
  questionNotifications: Object.freeze([OFF, BADGE, BANNER]),
  completeNotifications: Object.freeze([OFF, BANNER]),
});
// :2270 `value: A?.[e] ?? "banner"`: an unset level reads as Banners.
export const notificationLevel = value => value ?? 'banner';
// :2108 F = si.every(e => A?.[e] === "off") with si = ['permission','question'] (:1923); the Draw attention
// switch is disabled when both are Off (:2335 `disabled: W && F`).
export function drawAttentionDisabled(levels) {
  return ['permissionNotifications', 'questionNotifications'].every(key => levels?.[key] === 'off');
}
// index.chunk-ChZ67Jhw.js tV: `Db("ccKeepAwakeWhileWorking") !== !1`: keep-awake is on unless turned off.
export const keepAwakeEnabled = value => value !== false;

// c71860c77-DzP8HoeV Wr / Kr (:2208-2300): Settings › Code › Browser › Keep cookies. The modes are the Preview
// pane's (preview-storage.mjs PREVIEW_STORAGE_MODES); an unknown or missing saved mode reads as the legacy
// keep-cookies switch did (previewStorageMode).
export const PREVIEW_STORAGE_ITEMS = Object.freeze([
  Object.freeze({ value: 'none', label: t('Until quit') }),
  Object.freeze({ value: 'shared', label: t('Shared') }),
  Object.freeze({ value: 'session', label: t('Per session') }),
]);
export function previewStorageChoice(value, legacyKeep = false) {
  return PREVIEW_STORAGE_ITEMS.some(item => item.value === value) ? value : legacyKeep === true ? 'shared' : 'none';
}
// c71860c77-DzP8HoeV cr (:877-899): Prompt suggestions (ccPromptSuggestions, default on) is listed only where the
// suggestions exist; locally, a core that sends codeDesktop/promptSuggestion (capabilities.promptSuggestion).
export const promptSuggestionsEnabled = value => value !== false;
