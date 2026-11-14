// U-NAV-MENU (2026-11-12): host answers for the official lazy chunk c39a247c4-BgnGWMne.js (code_sidebar_actions), which
// OpenClaude Desktop does not ship (scripts/extract-frame-sidebar-nav.mjs absentChunks: its closure is the official Code
// session runtime, a cds-core job). The generated src/generated/frame-sidebar-nav/c39a247c4-BgnGWMne.js re-exports these
// four under the official names, so shared-20's lazy entries Gk / Jk load them instead of failing with ChunkLoadError
// (Jk has no fail-open: that error took down the whole nav, "Sidebar failed to load.").
//   - CodeSessionRowActionsHost (Gk; official Nn → Fn): publishes the row's menu props. The official host builds them from
//     the Code session runtime (bt); here they are the row's base props (shared-55 MB), enough for the menu to leave its
//     pending skeleton and to name its session.
//   - CodeSidebarActionsGate (Jk, within "menu"; official Wn `<J>{children}</J>`): its child is the official item list
//     (shared-20 Lk over ce4f4374c, not shipped either). It renders nothing: it closes the official popup and opens the
//     host's own session menu (main.jsx openMenu("session") → SourceSidebarSessionMenu over sessionAction) at the
//     right-click's point, or under the row's ⋯ button.
//   - CodeSidebarMutationsHost / SessionLinkActionsHost: no host service (render nothing).
import { useEffect, useLayoutEffect } from "react";
import { openNavSessionMenu } from "./frame-sidebar-nav-host.jsx";

// The last right-click's target: the anchor the host menu returns focus to when it opens at a point.
let lastContextTarget = null;
if (typeof document !== "undefined") document.addEventListener("contextmenu", (event) => { lastContextTarget = event.target; }, true);

export function CodeSessionRowActionsHost({ data, publish }) {
  const { id, title, timestamp } = data ?? {};
  useEffect(() => {
    if (!id) return undefined;
    publish({ menuProps: { sessionRef: { kind: "code", id }, sessionTitle: title ?? "", updatedAtMs: new Date(timestamp).getTime(), canPin: false } });
    return () => publish(null);
  }, [id, title, timestamp, publish]);
  return null;
}

export function CodeSidebarActionsGate({ children }) {
  const { sessionRef, onOpenChange, contextMenuAt } = children?.props ?? {};
  const id = sessionRef?.kind === "code" ? sessionRef.id : undefined;
  useLayoutEffect(() => {
    if (!id) return;
    const point = contextMenuAt ? { x: contextMenuAt.x, y: contextMenuAt.y } : undefined;
    const anchor = point
      ? lastContextTarget?.closest?.("a, button, [role='button'], [tabindex]") ?? null
      : document.querySelector("[aria-haspopup='menu'][aria-expanded='true']");
    onOpenChange?.(false);
    openNavSessionMenu(id, { anchor, point });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps -- once per opened session menu
  return null;
}

export function CodeSidebarMutationsHost() { return null; }
export function SessionLinkActionsHost() { return null; }
