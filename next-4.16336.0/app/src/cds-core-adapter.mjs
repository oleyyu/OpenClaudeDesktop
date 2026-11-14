// The official vendor's CJS React loader, JSX namespace, and DOM namespace.
// All consumers (including Base UI's vendor-internal hooks) use the host renderer.
import * as React from "react";
import * as JSX from "react/jsx-runtime";
import * as ReactDOM from "react-dom";
import { HOST_GROWTHBOOK, growthBookFlagKey } from "./host-growthbook.mjs";
export function loadHostReact() {
  return React;
}
export const hostJsxRuntime = JSX;
export const hostReactDom = ReactDOM;
// GrowthBook boundary (host has no GrowthBook client; D29/D31: answers come from the one host table).
// shared-0 Uu (export Rx): the global feature reader. Official: forced value, else the client's features, else null
// when no client. Host: the listed boolean, else null (no client) — `=== !0` callers then take the off branch.
export function hostGrowthBookFeature(flag) {
  const key = growthBookFlagKey(flag);
  return Object.hasOwn(HOST_GROWTHBOOK, key) ? HOST_GROWTHBOOK[key] === true : null;
}
// shared-25 ls (export wg): `ls(key, enabled)` = the experiment's string value when enabled (Do), else the noop key's
// value. Host: a string listed for the key while enabled, else undefined (the table holds no experiment values today).
export function hostGrowthBookExperimentValue(key, enabled) {
  if (!enabled) return undefined;
  const value = HOST_GROWTHBOOK[growthBookFlagKey(key)];
  return typeof value === "string" ? value : undefined;
}
// --- host i18n boundary (vendor-intl p / l) ---
// react-intl useIntl (vendor-intl q, export p) and FormattedMessage (Gt, export l), read by SessionsArchivedBadge
// (ce58a0513) and CdsSelectableTable (c9c7785eb), answered by the host i18n instead of a sliced react-intl + IntlProvider:
// the same contract as source-code-start-adapters.jsx useStartIntl / StartMessage (transcript-rows, code-start,
// frame-sidebar, settings-nav). The English defaultMessage is looked up in the active electron/i18n catalog by t()
// (zh-CN: "Archived" -> "已归档", "Select {name}" -> "选择 {name}") and ICU-formatted by the official react-intl createIntl
// (generated/chat vendor-intl Ht). Only leaf imports (react, generated/chat vendor-intl, electron/i18n): the merge appends
// this block to app/src/cds-core-adapter.mjs (union.mjs writes that file) and must not import source-code-start-adapters.jsx
// there, whose icons.jsx -> cds-core.mjs import would close a cycle through the generated cds-core modules.
import { Children, Fragment, createElement, isValidElement, useMemo } from "react";
import { createIntl } from "./generated/chat/vendor-intl-BJgYK7RA.js";
import { getLocale, t } from "../electron/i18n/index.mjs";
const keyedParts = parts => Children.toArray(parts).map((part, index) => (isValidElement(part) ? createElement(Fragment, { key: index }, part) : part));
const keyedValues = values => values && Object.fromEntries(Object.entries(values)
  .map(([name, value]) => [name, typeof value === 'function' ? chunks => value(keyedParts(chunks)) : value]));
export function createHostIntl(locale = getLocale()) {
  const intl = createIntl({ locale, defaultLocale: locale, messages: {} });
  return { ...intl, formatMessage: (message, values) => {
    const id = message.id || message.defaultMessage;
    const result = intl.formatMessage({ ...message, id, defaultMessage: t(message.defaultMessage) }, keyedValues(values));
    return Array.isArray(result) ? keyedParts(result) : result;
  } };
}
export function useHostIntl() {
  const locale = getLocale();
  return useMemo(() => createHostIntl(locale), [locale]);
}
export function HostFormattedMessage({ values, ...message }) { return useHostIntl().formatMessage(message, values); }
// --- wave 5: Vite preload assetsURL (preload-helper-BBljBeZo.js a) ---
// cds-core's official preload helper (preload-helper s, published as vitePreload) resolves each dependency through
// `a=function(e){return"/"+e}`, which names the disk root under file:// (dist/index.html is loaded with loadFile). cds-core
// binds `a` to the host viteAssetUrl (document.baseURI; SUPERSEDED_LEGACY_SHEETS), as extract-view-tabs.mjs and
// extract-home-v4.mjs already do. Plain .mjs re-export: view-tabs-asset-url.mjs imports nothing (no cycle).
export { viteAssetUrl } from "./view-tabs-asset-url.mjs";
// --- wave 8: unique cds-core host boundaries (shared-0 Ru / Ku / uO; cds-wave8/design/plan.json classification b) ---
// shared-0 Ru (GrowthBook isOn) and Ku (GrowthBook value) answer from the one host table (no client: false / the caller's
// fallback); shared-0 uO (globalThis["claude.web"]?.WindowState) is the host window-state answer frame-sidebar-host.jsx
// installs. Plain .mjs re-exports: both host modules import nothing (pins.localAdapterBoundaries).
export { hostGrowthBookIsOn, hostGrowthBookValue } from "./host-growthbook.mjs";
export { hostWindowState } from "./host-window-state.mjs";
// --- wave 8d: session-presets host boundaries (shared-25 go / Z, shared-39 su; R4-Q1, round4/wave8d/core/requests.json) ---
// shared-25 go (useGrowthBookFeature) and Z (useCurrentAccount) answer with frame-sidebar-host.jsx's own answers, which that
// module installs into host-session-presets.mjs (the host table HOST_GROWTHBOOK in the official {value, on, off, source}
// shape; main.jsx's local account); shared-39 su (the cd0cf5b5e environments chunk) is the official chunk-load failure.
// Plain .mjs re-export: the host module imports nothing (pins.localAdapterBoundaries).
export { hostUseGrowthBookFeature, hostUseCurrentAccount, hostLoadEnvironmentDialogChunk } from "./host-session-presets.mjs";
