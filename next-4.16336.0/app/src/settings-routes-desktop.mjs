// Settings page dispatch seam (round4 settings design S0, lane desktop): the official settingsComponentsByPath sections of
// the "This computer" group this lane owns, mapped to their host page component and the host tab that shows it.
//   desktop            → c71860c77-B4INzBZs default Vs (src/generated/settings-desktop-v4) via SettingsDesktopPage
//                        (src/source-settings-desktop.jsx); host tab 'general' (labelled System)
//   desktop/developer  → settings-pages-v4 DeveloperSettingsPage (lane A's graph); host tab 'developer'
// Official closed branches (Kg / route gates false on the desktop host, see round4/settings/desktop/report.json pages):
// desktop/extensions (+ advanced / manage-directory / $extensionId), desktop/browser-extensions.
export const DESKTOP_SETTINGS_ROUTES = Object.freeze({
  desktop: Object.freeze({ hostTab: 'general', page: 'SettingsDesktopPage', module: './source-settings-desktop.jsx', official: 'c71860c77-B4INzBZs.js#Vs' }),
  'desktop/developer': Object.freeze({ hostTab: 'developer', page: 'SettingsDeveloperPage', module: './settings-pages-host.jsx', official: 'c71860c77-Cuocl2LF.js#i' }),
});
export const DESKTOP_SETTINGS_CLOSED = Object.freeze(['desktop/extensions', 'desktop/extensions/advanced', 'desktop/extensions/manage-directory', 'desktop/extensions/$extensionId', 'desktop/browser-extensions']);
/** The official group marker SourceSettings gives the host group whose body the official desktop page renders. */
export const DESKTOP_PAGE_GROUP = 'desktop-page';
