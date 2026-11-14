// src/settings-routes-account.mjs — Settings account pages host (lane account): mounts the generated official Privacy route (src/generated/settings-account-v4,
// cf4f70727 pn → cc5f29bb3 t) under the official app-root context it reads. Plain .mjs (createElement, no JSX) so the
// node SSR tests import it as the app does.
//
// CurrentAccount: cds-core holds the official context (shared-25 Dz, public name settings_shared25_Dz). The official app
// root's CurrentAccountProvider fills it from the claude.ai bootstrap; this host has no claude.ai account, so the value is
// the local profile every settings graph answers with (settings-shell-model LOCAL_PROFILE_ACCOUNT: no organization,
// settings {}), the same value settings-nav / settings-pages-v4 give their useCurrentAccount cuts.
//
// Configuration: cds-core holds the official ConfigurationProvider context (shared-0 h4, public name ctx_shared0_h4; read
// by shared-0 y4 useConfiguration). The value is the desktop app's configuration the host gives every graph
// (src/frame-sidebar-nav-host.jsx CONFIGURATION: applicationType "claude-dot", bootstrapApiPrefix "/api").
import * as React from 'react';
import { settings_shared25_Dz as CurrentAccountContext, ctx_shared0_h4 as ConfigurationContext } from './cds-core.mjs';
import { LOCAL_PROFILE_ACCOUNT } from './settings-shell-model.mjs';
import { SettingsPrivacyPage } from './generated/settings-account-v4/routes.mjs';

// The official account object (claude.ai /api/account, CurrentAccountProvider) always carries `invites` (pending
// organization invites); shared-8 lH reads `e?.invites.some(…)` unguarded. The local profile has none → [].
// (Proposed upstream: add invites: [] to settings-shell-model LOCAL_PROFILE_ACCOUNT itself; not a lane-account file.)
export const HOST_CURRENT_ACCOUNT = Object.freeze({
  ...LOCAL_PROFILE_ACCOUNT,
  account: Object.freeze({ ...LOCAL_PROFILE_ACCOUNT.account, invites: LOCAL_PROFILE_ACCOUNT.account.invites ?? Object.freeze([]) }),
});
export const HOST_CONFIGURATION = Object.freeze({ applicationType: 'claude-dot', bootstrapApiPrefix: '/api' });
const h = React.createElement;
export function SettingsAccountAppRoot({ children }) {
  return h(ConfigurationContext.Provider, { value: HOST_CONFIGURATION }, h(CurrentAccountContext.Provider, { value: HOST_CURRENT_ACCOUNT }, children));
}
export function SettingsPrivacyRoute() {
  return h(SettingsAccountAppRoot, null, h(SettingsPrivacyPage));
}
