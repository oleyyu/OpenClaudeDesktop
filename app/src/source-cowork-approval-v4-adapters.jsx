// Host adapters of the 4.16336.0 Cowork tool approval card graph (scripts/extract-cowork-approval-v4.mjs ->
// src/generated/cowork-approval-v4: c96142a4d gt ToolApprovalCard with c14f706e5 Zt ToolApprovalActions; round2 unit
// cowork-approval). Each export answers one original declaration, which the extractor feature-checks and pins
// (HOST_ADAPTERS / ADAPTER_PINS). Staged only: the host still mounts the 3.6556.2 card (src/source-cowork-approval.jsx
// reads src/generated/cowork-approval); the switch is round2/cowork-approval/patches/.
//
// Re-exported unchanged from the host adapter that documents each (same semantics as for the 3.6556.2 graph or for the
// sibling Cowork -v4 graphs that adapt the same 4.16336.0 original):
//   vendor-intl q useIntl / Gt FormattedMessage, shared-25 ko / Vo useFeatureIsOn (GrowthBook off, D29 / D31),
//   shared-62 OT useAnalytics / rP useErrors                          -> source-routines-shared-adapters.jsx
//   shared-0 H trackEvent / qB reportError (no telemetry, D17), shared-183 GT useConnectorLookup (no claude.ai MCP store),
//   shared-36 Db ConnectorServerIcon                                  -> source-routine-cowork-adapters.jsx
//   shared-6 Sf useDownloadOutput (account-bound claude.ai file opener; local requests carry no fileInputs)
//                                                                     -> source-cowork-progress-v3-adapters.jsx
//   cc2d75ce6 u useToolApprovalComposer, c14f706e5 Vt ToolApprovalNotifyOptIn, shared-26 kw approvalPlaceCheckChunk
//                                                                     -> source-cowork-approval-adapters.jsx (3.6556.2
//                                                                        cc2d75ce6 l / c14f706e5 mt / shared-10 rS)
// Defined here (the 4.16336.0 contract of the original changed, or the original is new in 4.16336.0):
export { useIntl, FormattedMessage, useFeatureIsOn, useAnalytics, useErrors } from "./source-routines-shared-adapters.jsx";
export { trackEvent, reportError, useConnectorLookup, ConnectorServerIcon } from "./source-routine-cowork-adapters.jsx";
export { useDownloadOutput } from "./source-cowork-progress-v3-adapters.jsx";
import { approvalPlaceCheckChunk } from "./source-cowork-approval-adapters.jsx";
export { useToolApprovalComposer, ToolApprovalNotifyOptIn, approvalPlaceCheckChunk } from "./source-cowork-approval-adapters.jsx";
// shared-62 Ha (wave 7, W7-D5): the public-suffix list loader, answered as cowork-live-v4 answers it (the chunk is not served).
export { loadPublicSuffixList } from "./source-code-transcript-adapters.jsx";

// shared-26 Fw / Hw (wave 7, W7-D5: their originals assign cds-core's Nw / Mw, which this graph imports read-only). The
// originals under this graph's kw answer (approvalPlaceCheckChunk: never loaded, `pending` false, no `lastOutcome`):
//   Fw  `(kw.pending || (Nw = performance.now()), kw.warm("open"))`: the Nw stamp is read only by Hw behind `kw.pending`
//       (false), so what remains is warm("open").
//   Hw  `let e = kw.lastOutcome; (e === "failed" || e === "declined") && (Mw = !0), Fw(); let t = kw.pending && …;
//       if (Mw || t) for (let e of Iw) e();`: no outcome, so Mw stays false (nothing else sets it), t is false, and the
//       listener loop is not reached: what remains is Fw().
export function warmApprovalPlaceCheck() {
  approvalPlaceCheckChunk.warm("open");
}
export function settleApprovalPlaceCheck() {
  warmApprovalPlaceCheck();
}

// cb3e475a7 H (3.6556.2 shared-1 fR): the tool's MCP app view resource. The original answers its module constant `ie`
// unless `p = c && !!o && !!a && !u` holds, where c = N() is GrowthBook claudeai_mcp_tool_details (off here) and a / o the
// claude.ai connector server and its app resource URI (none here). 4.16336.0 `ie` adds readFailed; this is that constant.
const NO_APP_RESOURCE = Object.freeze({ meta: undefined, isLoading: false, isKeyPending: false, metaUnknown: false, readFailed: false });
export function useToolAppResource() {
  return NO_APP_RESOURCE;
}

// shared-153 ZU / $U: `D(LU)` reads the conversation's restricted actions (LU = createContext(kU), kU an empty Set) and
// asks whether one is restricted (ZU: `QU(t, e) !== void 0`) and why ($U: `tW(QU(t, e))`, whose switch returns a message
// only for a restricted action). Zt asks both for "respondToElicitation". No provider of LU exists in this host, so the
// original reads the empty default: nothing restricted, no reason.
export function useConversationRestricts() {
  return false;
}
export function useConversationRestrictionReason() {
  return undefined;
}

// c96142a4d at: the lazy Gmail file-ask rows (c237667f6 GmailFileAskRows, `{ entry, pick, options }` read as
// `at.Component`). gt renders it only when `it(N, c, h)` holds: a remote Gmail connector tool (server.type "remote",
// a gmail url) whose input carries sha256 attachments. This host has no remote connector (useConnectorLookup is empty),
// so `P` stays undefined and the component is never rendered; the chunk is not loaded.
export const GmailFileAskRows = Object.freeze({ Component: () => null });
