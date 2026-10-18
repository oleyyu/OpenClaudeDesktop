// Local services for the original 2.42304.0 session rail primitives and shell that scripts/extract-session-rail-kit.mjs
// emits (src/generated/session-rail-kit, R4f-rail SR-1). Each export replaces one import of the original, and the
// extractor checks the declaration it stands for (file:local, with feature strings) before it accepts the import.
import React, { createContext, useContext, useMemo } from "react";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";
import { useSourceToasts } from "./source-toast.jsx";

// vendor-intl q / Gt (react-intl useIntl / FormattedMessage) over the local catalog: the English message is looked up in
// zh-CN by t() (source-code-start-adapters.jsx).
export { useStartIntl as useIntl, StartMessage as FormattedMessage };

// shared-frame qa (exported _u): `W(Oa)`, the CDS layer element of a popout or portal root. No component of this host
// provides that context (CdsLayerProvider only sets the z-index base), so it reads undefined: the branch chip's popup
// goes to the document body and its clipboard / window calls use the current window (shared-frame Yi / Ji fallbacks).
export function useLayerElement() {
  return undefined;
}

// shared-frame Ya (exported mu): `Ji(W(Oa))`, the window of that layer element, else globalThis.window. Every window of
// this host renders its own React root and no layer element is mounted into another window, so Ji's fallback is the
// answer (as in source-r3b-transcript-adapters.jsx).
export function useLayerOwnerWindow() {
  return globalThis.window;
}

// shared-frame Ja (exported gu): the portal container of the current layer, `W(Oa) ?? (W(Aa) ? void 0 : W(ka))`. None of
// those contexts is provided here, so undefined: the overlay's outside-pointer test (cc43287c9 OH) skips its layer rule.
export function useLayerPortalContainer() {
  return undefined;
}

// shared-52 Sj (exported Ya): the ErrorsProvider (addError / addWarning / addSuccess). Here the host toasts; the branch
// chip's "Branch name copied to clipboard." is a neutral toast. The logging options are not kept (no telemetry, D17).
export function useErrors() {
  const toasts = useSourceToasts();
  const intl = useStartIntl();
  return useMemo(() => {
    const text = message => (typeof message === "string" ? message : message ? intl.formatMessage(message) : "");
    return {
      addError: message => { toasts?.add?.(text(message), { variant: "danger" }); },
      addWarning: message => { toasts?.add?.(text(message), { variant: "warning" }); },
      addSuccess: message => { toasts?.add?.(text(message), { variant: "neutral" }); },
    };
  }, [toasts, intl]);
}

// shared-104 wR (exported rt): `xr().vcs.github_sync`, the claude.ai account's GitHub sync setting. This host has no
// claude.ai account; the chip's "Open branch on GitHub" item needs a branchUrl, which the host never supplies (no GitHub
// link, r4-session-rail.md §3 #9), so the value is never read for a label. false.
export function useGithubSyncEnabled() {
  return false;
}

// c68c4283d nn (exported fr): the claudeai.code.local_pr.menu_action telemetry event. Nothing is sent (D17).
export function logLocalPrMenuAction() {}

// shared-11 ms (exported fo): `fr(Zo)`, the hook form of GrowthBook claudeai_cc_epitaxy_session_presets_main. D10: this
// host follows its "on" branch, so the rail is the flat rail (c73f45bc3 wy, cc43287c9 uN).
export function useSessionPresetsFlat() {
  return true;
}

// shared-4 NE (exported Z): renders the region registry's body (`AE((e) => e.body)`) for a navigation region — here the
// rail opener (`kind: "opener", region: "sessionDetails"`). This host has no region registry (F6 region cycling over
// codeChat / codeRail / sessionDetails), so nothing is registered and nothing renders; recorded as a host difference.
export function RegionEntry() {
  return null;
}

// cc43287c9 hH / gH: `{ Component: hH, handle: gH } = mc({ entry: cs, pick: (e) => e.EpitaxySessionRailHost, … })`, the
// lazy code_session_view chunk (cf74bc599) and its preload handle. This host bundles synchronously: the rail content is
// the component SessionRailHostContext carries (the host mount provides it), rendered with the props the docked column
// (bH) and overlay (jH) pass, keyed by the session as they key it. The handle's preload / warm / idle calls have nothing
// to load.
export const SessionRailHostContext = createContext(null);
export function LazySessionRailHost(props) {
  const Host = useContext(SessionRailHostContext);
  return Host ? <Host {...props} /> : null;
}
export const sessionRailLazyHandle = Object.freeze({ preload() {}, warm() {}, enqueueIdle() {} });
