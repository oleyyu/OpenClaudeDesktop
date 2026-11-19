// U-01 (2026-11-16): the host answer for the official lazy chunk ca0409d7c-C0M8y8aL.js (code_session_awaiting_body), which
// OpenClaude Desktop does not ship (scripts/extract-frame-sidebar-nav.mjs absentChunks). shared-20 TP loads it with only a
// loading placeholder (no fail-open; and with no recovery kit, cds-core shared-123 w$ = null, no chunk failure is contained),
// so hovering an awaiting session row threw ChunkLoadError up to the nav's boundary: "Sidebar failed to load.".
// The generated src/generated/frame-sidebar-nav/ca0409d7c-C0M8y8aL.js re-exports this module's AwaitingHoverCardBody under
// the official name. It is the resident body the host already slices (generated/sidebar-hover-card awaiting-body.mjs:
// ca0409d7c `ge`, the same component as 4.16336.0's `be`, props { data, summaryText, toolCardResident }) under its host
// (source-sidebar-hover-card.jsx SidebarHoverCardHost) over main.jsx's sidebarNavValue.hoverCard: the session's pending
// approvals, the approval runtime and respondApproval. Without that value the body draws its own "Awaiting input" card.
import React from "react";
import { FrameSidebarNavHostContext } from "./frame-sidebar-nav-host.jsx";
import { SidebarHoverCardHost } from "./source-sidebar-hover-card.jsx";
import { AwaitingHoverCardBody as ResidentAwaitingHoverCardBody } from "./generated/sidebar-hover-card/awaiting-body.mjs";

export function AwaitingHoverCardBody(props) {
  const hoverCard = React.useContext(FrameSidebarNavHostContext)?.hoverCard;
  if (!hoverCard) return <ResidentAwaitingHoverCardBody {...props} />;
  return <SidebarHoverCardHost requestsFor={hoverCard.requestsFor} runtime={hoverCard.runtime} respond={hoverCard.respond} sendReply={hoverCard.sendReply}>
    <ResidentAwaitingHoverCardBody {...props} />
  </SidebarHoverCardHost>;
}
