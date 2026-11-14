// The Code sidebar's session hover card (W14-code r4 sidebar-new, fr4-07): the 3.6556.2 originals, sliced by
// scripts/extract-sidebar-hover-card.mjs into generated/sidebar-hover-card, over the host services of
// source-sidebar-hover-card-adapters.jsx. This module is the mount interface the sidebar uses (frame-sidebar mounts it
// in source-sidebar.jsx):
//
//   <SidebarHoverCardHost requestsFor runtime respond sendReply>   once, around the Code session list
//     requestsFor(sessionId) → the session's pending approvals (state.approvals owned by it, oldest first)
//     runtime                → main.jsx approvalRuntime.current (createApprovalDraftRuntime)
//     respond(request, payload) → main.jsx respondApproval
//     sendReply(sessionId, text) → a promise that sends the text to the session (ca0409d7c ve's quick reply)
//   <SidebarSessionHoverCard row title data summaryText awaiting disabled />   per row, as shared-22 pC mounts QO (Wu):
//     row          the row element (pC `Z`: the `div[data-row-key]` around the row's main button); QO clones it with
//                  its pointer / focus handlers and renders it as the preview card's trigger
//     title        the row's title (pC `S`)
//     data         sidebarHoverCardData(session, {requests, archived})
//     summaryText  pC `de` (the session's task summary / status detail); the host has none: undefined
//     awaiting / disabled   sidebarHoverCardState(data, {suspended}) (pC `Q` / `he = L || !Q`)
//
// Gate: host-growthbook.mjs `local_sidebar_hover_card` (a host rollback switch, not a desktop flag; false keeps the rows
// without a card: E95 / E90 GUI acceptance).
import React from "react";
import { SidebarSessionHoverCard as OriginalHoverCard } from "./generated/sidebar-hover-card/hover-card.mjs";
import { SidebarHoverCardHostContext } from "./source-sidebar-hover-card-adapters.jsx";
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
export { sidebarHoverCardData, sidebarHoverCardState, hoverCardRequests, hoverCardTool } from "./sidebar-hover-card-model.mjs";

/** The rollback switch (host-growthbook.mjs local_sidebar_hover_card): false draws the rows without the hover card. */
export const SIDEBAR_HOVER_CARD_ENABLED = hostGrowthBookFlag("local_sidebar_hover_card");

export function SidebarHoverCardHost({ requestsFor, runtime, respond, sendReply, children }) {
  const value = React.useMemo(() => ({ requestsFor, runtime, respond, sendReply }), [requestsFor, runtime, respond, sendReply]);
  return <SidebarHoverCardHostContext.Provider value={value}>{children}</SidebarHoverCardHostContext.Provider>;
}

/** shared-22 pC's `o(Wu, {row, title, data, awaiting, summaryText, disabled})`; without data, the row alone (`if (!ce) return Z`). */
export function SidebarSessionHoverCard({ row, data, ...props }) {
  if (!SIDEBAR_HOVER_CARD_ENABLED || !data || !React.isValidElement(row)) return row ?? null;
  return <OriginalHoverCard row={row} data={data} {...props} />;
}
