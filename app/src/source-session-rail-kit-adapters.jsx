// Local services for the original session rail primitives and shell that scripts/extract-session-rail-kit.mjs emits
// (src/generated/session-rail-kit, R4f-rail SR-1; 3.6556.2 since w2-rail-kit). Each export replaces one import of the
// original, and the extractor checks the declaration it stands for (file:local, with feature strings) before it accepts
// the import. 3.6556.2 keys: vendor-intl q / Gt, shared-52 cB, shared-78 L2, c68c4283d un / _f / hf, shared-11 Pc,
// shared-4 Sk, shared-16 Q / Bo, cc43287c9 uH / dH. The kit no longer imports the layer hooks below (3.6556.2 reads
// view-tabs' useCdsOwnerWindow / useCdsOwnerWindowAnchor); they stay for the rail view adapters that re-export them.
import React, { createContext, useContext, useMemo } from "react";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";
import { useSourceToasts } from "./source-toast.jsx";

// vendor-intl q / Gt (react-intl useIntl / FormattedMessage) over the local catalog: the English message is looked up in
// zh-CN by t() (source-code-start-adapters.jsx).
export { useStartIntl as useIntl, StartMessage as FormattedMessage };

// shared-52 Sj (exported Ya; 3.6556.2 cB, exported ha): the ErrorsProvider (addError / addWarning / addSuccess). Here the host toasts; the branch
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

// shared-104 wR (exported rt; 3.6556.2 shared-78 L2, exported ct: `Ia().vcs.github_sync`): `xr().vcs.github_sync`, the claude.ai account's GitHub sync setting. This host has no
// claude.ai account; the chip's "Open branch on GitHub" item needs a branchUrl, which the host never supplies (no GitHub
// link, r4-session-rail.md §3 #9), so the value is never read for a label. false.
export function useGithubSyncEnabled() {
  return false;
}

// c68c4283d nn (exported fr; 3.6556.2 un, exported Sr): the claudeai.code.local_pr.menu_action telemetry event. Nothing
// is sent (D17).
export function logLocalPrMenuAction() {}

// c68c4283d _f (exported Bd): claudeai.epitaxy.session_rail.<section>.expanded / collapsed / control_pressed / hidden and
// section_moved (the rail card's open change and header menu). Nothing is sent (D17).
export function logRailSectionEvent() {}

// c68c4283d hf (exported zd): claudeai.epitaxy.session_rail.<show|hide|show_raised>_pressed { via, in_popout } (the
// titlebar toggle / command palette opener). Nothing is sent (D17).
export function logRailTogglePressed() {}

// shared-16 so / Na: the official pane layout store (extraPanesByMode, parkedPanes, …) and the panes of a mode. The
// 3.6556.2 shown store (cc43287c9 HH / VH) keeps a per-session shown map for sessions held in a split window and clears it
// when the pane layout has no "code" pane left. This host has no official pane layout store: the store never changes
// (subscribe returns a no-op unsubscribe) and has no panes. The map is only written when a caller passes a session key
// in a split window; the host's useRailShown() passes none (recorded in the w2-rail-kit report).
const paneLayoutState = Object.freeze({ extraPanesByMode: Object.freeze({}), parkedPanes: null });
export const paneLayoutStore = Object.freeze({ getState: () => paneLayoutState, subscribe: () => () => {} });
export function panesOfMode(state, mode) {
  const extra = state?.extraPanesByMode?.[mode] ?? [], parked = state?.parkedPanes?.[mode] ?? [];
  return parked.length === 0 ? extra : extra.length === 0 ? parked : [...extra, ...parked];
}

// shared-11 ms (exported fo; 3.6556.2 Pc, exported ds: `Ut(hc)`): `fr(Zo)`, the hook form of GrowthBook claudeai_cc_epitaxy_session_presets_main. D10: this
// host follows its "on" branch, so the rail is the flat rail (c73f45bc3 wy, cc43287c9 uN).
export function useSessionPresetsFlat() {
  return true;
}

// shared-4 NE (exported Z; 3.6556.2 Sk, exported rt): renders the region registry's body (`AE((e) => e.body)`) for a navigation region — here the
// rail opener (`kind: "opener", region: "sessionDetails"`). This host has no region registry (F6 region cycling over
// codeChat / codeRail / sessionDetails), so nothing is registered and nothing renders; recorded as a host difference.
export function RegionEntry() {
  return null;
}

// cc43287c9 hH / gH (3.6556.2 uH / dH, `qc({ entry: nc, …`): `{ Component: hH, handle: gH } = mc({ entry: cs, pick: (e) => e.EpitaxySessionRailHost, … })`, the
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
