// Settings › Advanced: the host's developer-facing settings, gathered in one nav group after Customize so the pages
// the official 2.42304.0 nav has (General, Usage, Code, System, Developer, Skills, Connectors, Plugins) keep their
// place and lose the host's core-tuning rows. The group's pages (source-settings.jsx tabs, group 'Advanced'):
//   Core options  (id 'advanced')   rows that tune the running core itself: the Codex permission profile, an ACP
//                                   agent's own settings.json keys, DeepSeek Harness limits, Codex beta features
//   Harness       (id 'harness')    DeepSeek Harness profile overlays and plugins
//   Hooks         (id 'customize-hooks')  the core's lifecycle hooks
//   Profiles      (id 'profiles')   tool profiles
// Page ids are unchanged, so 'tab#row' anchors, the command palette and search results keep resolving.
import { t } from '../electron/i18n/index.mjs';

export const ADVANCED_NAV_GROUP = 'Advanced';
export const ADVANCED_PAGES = Object.freeze(['advanced', 'harness', 'customize-hooks', 'profiles']);
// The group titles the Core options page shows ('{core} settings' is the running core's own, by name).
export const ADVANCED_GROUP_TITLES = Object.freeze(['Codex permissions', '{core} settings', 'DeepSeek settings', 'Beta features']);

/** Whether Core options has anything to show for the running core (its nav entry is listed only then). */
export function hasAdvancedRows({ coreSettings = null, harnessSettings = null, codexFeatures = null, codexPermissions = null } = {}) {
  return !!(coreSettings?.settings?.length || harnessSettings?.settings?.length || codexFeatures?.beta?.length || codexPermissions);
}
/** Core options opened (an anchor, search) while the running core has none of its rows. */
export function advancedEmptyNotice(core) {
  return core ? t('{core} has no advanced options to change here.', { core }) : t('The agent core has no advanced options to change here.');
}
