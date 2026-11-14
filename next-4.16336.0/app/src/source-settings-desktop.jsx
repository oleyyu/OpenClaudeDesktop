// Settings › Desktop (4.16336.0 settingsComponentsByPath "desktop" → c71860c77-B4INzBZs default Vs): the official page from
// src/generated/settings-desktop-v4 (scripts/extract-settings-desktop-v4.mjs) over the host value its adapter reads
// (src/settings-desktop-adapter.mjs). SourceSettings renders it for the System page (host tab id 'general') and hands it
// the host facts it already keeps: the desktop snapshot's login item and its write (main "desktop-startup"), the saved
// menuBarEnabled preference (electron/menu-bar.cjs), build-info.json's version, the host storage report call and dialog,
// and the Allowed sites dialog. The local Computer use group (src/source-settings-computer-use.jsx) stays after it.
import React, { useMemo } from 'react';
import { DesktopSettingsPage } from './generated/settings-desktop-v4/desktop-page.mjs';
import { SettingsDesktopHostProvider, desktopPageAccount } from './settings-desktop-adapter.mjs';
// TanStack Query of the 4.16336.0 graphs (its context is cds-core's settings_vendorquery_q): the Gorse notice row (jr › br)
// declares a disabled query, as settings-pages-host does for the Claude Code groups.
import { QueryClient, QueryClientProvider } from './generated/files-changes-v4/file-browser-query.mjs';
import { useErrors as useHostErrors } from './source-routines-shared-adapters.jsx';
import { LOCAL_PROFILE_ACCOUNT } from './settings-shell-model.mjs';
import { StorageDialog } from './source-settings-pages.jsx';
import { SourcePreviewAllowedSites } from './source-preview-allowed-sites.jsx';

const DESKTOP_PAGE_ACCOUNT = desktopPageAccount(LOCAL_PROFILE_ACCOUNT);
const desktopQueryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 3e5, refetchOnWindowFocus: false, retry: false } } });

export function SettingsDesktopPage({ version, runOnStartup, setRunOnStartup, menuBarEnabled, setMenuBarEnabled, desktopCall, settingsRoot }) {
  const errors = useHostErrors();
  const storage = useMemo(() => (typeof desktopCall === 'function' ? { call: desktopCall, settingsRoot, Dialog: StorageDialog } : null), [desktopCall, settingsRoot]);
  const allowedSites = useMemo(() => (typeof desktopCall === 'function' ? { call: desktopCall, Dialog: SourcePreviewAllowedSites } : null), [desktopCall]);
  const value = useMemo(() => ({
    account: DESKTOP_PAGE_ACCOUNT, version: typeof version === 'string' && version ? version : null,
    runOnStartup: typeof runOnStartup === 'boolean' ? runOnStartup : null, setRunOnStartup,
    menuBarEnabled: menuBarEnabled !== false, setMenuBarEnabled, storage, errors, allowedSites,
  }), [version, runOnStartup, setRunOnStartup, menuBarEnabled, setMenuBarEnabled, storage, errors, allowedSites]);
  return <QueryClientProvider client={desktopQueryClient}><SettingsDesktopHostProvider value={value}><DesktopSettingsPage/></SettingsDesktopHostProvider></QueryClientProvider>;
}
