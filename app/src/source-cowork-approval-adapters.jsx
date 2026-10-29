// Local services for the 3.6556.2 tool approval card, which scripts/extract-cowork-approval.mjs emits into
// src/generated/cowork-approval (w13-coworkui-approval, cwui-27 / cwui-28: c96142a4d Je, the card the transcript's tool
// block renders for a pending permission, and c14f706e5 wt, its decision row). Each export replaces one original
// declaration, which the extractor feature-checks (see its `adapters` table). The host card that feeds these components
// from a local approval request is src/source-cowork-approval.jsx.
//
// Host facts behind these answers (E59): no claude.ai account, organization or telemetry; no MCP connector directory
// (the Cowork tools are the app's own and the core's); no push notifications service.
import { useContext, useMemo } from "react";
import { CardComposerContext } from "./use-card-hotkeys.js";

// c14f706e5 tt: the tool approval telemetry event (`T(event_key, { attributes })` to the O11Y pipeline and `E(e)` to
// segment). OpenClaude sends no telemetry (D17): nothing is recorded.
export function recordToolApprovalEvent() {}

// c14f706e5 mt: the "Get notified when you're needed" opt-in under the decision row. It renders only for a host it is
// given — `telemetry` of a server-run chat tool ({surface: "chat"}), or the `notifyOptInHost` Cowork's ex passes, which is
// `J ? (Le ? void 0 : {surface: "external", …}) : Wr ? {surface: "cowork_remote", …} : void 0` (ca44d5dae ex: J is
// isExternalSurface, true only for the hub of asks in c1c7e52be; Wr a remote session). A local Cowork session's card has
// neither, so mt answers null there (`if (o || !s || u || !d) return null`); the chat branch also needs the claude.ai
// push registration (shared-7 ty, firebase messaging). This host renders no opt-in, as the official local Cowork card.
export function ToolApprovalNotifyOptIn() {
  return null;
}

// cc2d75ce6 l: the composer the card's keys share (`{ getComposerDom, isOwnComposer, hasComposerPopup, hasComposerDraft,
// isDictationLive, dictationOwnsEscape }`, from the chat input's TipTap editor). Here the session composer main.jsx
// provides through CardComposerContext ({ composerRef, draftRef }, the one the Code cards use): its element, whether an
// element is inside it, and whether it holds a draft. This composer has no mention / slash popup over the card's keys
// and no dictation.
const no = () => false;
export function useToolApprovalComposer() {
  const composer = useContext(CardComposerContext);
  return useMemo(() => {
    const getComposerDom = () => composer?.composerRef?.current ?? null;
    return {
      getComposerDom,
      isOwnComposer: (element) => { const dom = getComposerDom(); return dom !== null && !!element && dom.contains(element); },
      hasComposerPopup: no,
      hasComposerDraft: () => !!composer?.draftRef?.current,
      isDictationLive: no,
      dictationOwnsEscape: no,
    };
  }, [composer]);
}

// shared-1 fR: the MCP app view resource of the tool (`{ meta, isLoading, isKeyPending, metaUnknown }`; shared-1 oR when
// the tool has none). No connector tool here declares an app view: the official "none" value.
const NO_APP_RESOURCE = Object.freeze({ meta: undefined, isLoading: false, isKeyPending: false, metaUnknown: false });
export function useToolAppResource() {
  return NO_APP_RESOURCE;
}

// shared-156 X (the connector store, `Zl()(By(Xl((...e) => ({ ...Rc(...e), ...Mb(...e) }))))`) and iw (its lookup
// selector rw over tw). No claude.ai or local MCP connector is known to this card: the stores' initial state (shared-78
// RH local slice, shared-156 Mb remote slice, shared-78 nk icon flags), so every lookup by tool name misses.
const empty = Object.freeze({});
const CONNECTORS = Object.freeze({
  remoteServers: empty, remoteTools: empty, remoteDirectories: empty, remoteIconUrls: empty, firstPartyServerAliases: empty,
  remoteLiveRunToolTest: undefined, injectedServerTitles: empty,
  connectorIconFlags: Object.freeze({ hostedOnly: false, customNoGoogleFavicons: false }), mcpUrlKeyNamesOn: false,
  localTools: empty, pluginBridgeTools: empty, localClients: empty, localAppOnlyTools: empty, localPrompts: empty, localResources: empty,
  dxts: empty, dxtContestNames: empty, dxtNotFileInstalledNames: empty, dxtContestHydrated: false, nonInternalClaimedNames: empty,
  internalToolsOnlyNames: empty, catalogAttribution: "pending",
});
export function useConnectorStore(selector) {
  return typeof selector === "function" ? selector(CONNECTORS) : CONNECTORS;
}
export function useConnectorLookup() {
  return CONNECTORS;
}

// shared-6 lb: opens a file a tool request carries (claude.ai uploads, `files_api` / the served preview). The card shows
// such files only for `fileInputs` (c14f706e5 ut), which the local requests never carry: nothing to open.
export function useOpenToolApprovalFile() {
  return no;
}

// shared-10 rS: the lazily loaded "approval place check" engine (cd69aaa10 createPlaceCheck, GrowthBook __gb__212114354),
// which hS attaches when the chunk has loaded. This host never loads it: the loader stays unloaded (`pending` false, no
// outcome), so hS keeps its engine-less holder and the decision row works without the place check.
export const approvalPlaceCheckChunk = Object.freeze({ pending: false, lastOutcome: undefined, warm() {} });
