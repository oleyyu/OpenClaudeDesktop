import React from 'react';
import { t } from '../electron/i18n/index.mjs';

// The 2.31226.0 chat / current-chat slices these host adapters served are retired (w10-chat-gen, w10-curchat-retire);
// w10-cleanup-final removed the exports that no module imported any more (HostButton, HostTooltip, HostMenuButton,
// HostCollapsible, classNames, Presence, ...). What is left is the ICU message registry.
//
// The ICU formatter (StartMessage, R4h-intl I1) lives in source-code-start-adapters.jsx, which registers it here
// (main.jsx loads it through SourceCodeStart before anything renders); until then a message falls back to t() with
// {name} values. This module imports nothing from view-tabs or the menus, so it cannot close a cycle back through
// source-code-start-adapters.jsx (tests/view-tabs-no-cycle.test.mjs).
// `var` without an initializer, not `let … = null`: the registration may run while this module is still evaluating;
// a `let` would be in its TDZ then, and an initializer would wipe the registration once this line runs.
var RegisteredMessage;
export function registerLocalizedMessage(component) { RegisteredMessage = component; }
export function LocalizedMessage({ values, ...message }) {
  return RegisteredMessage ? <RegisteredMessage {...message} values={values} /> : t(message.defaultMessage, values);
}
