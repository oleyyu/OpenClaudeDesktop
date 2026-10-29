import { useLayoutEffect } from 'react';

// Host services for the sliced 3.6556.2 nested caret (generated/code-current/sidebar-nested-caret.mjs, shared-21 g1).
// g1 calls two shared-20 module functions from its click handler:
//   yv = nS (exported `ti`): toggle the family's collapsed state (q.toggleFamilyCollapsed) and log the "row_caret" via;
//   Qg = TS (exported `$r`): open the 500ms window in which the code session list's capture handlers (shared-20 ES/DS)
//        swallow the rest of that multi-click.
// This host keeps the collapsed families in the sidebar preferences (`collapsedNested`) and its multi-click window in
// source-sidebar.jsx (guardMultiClick, the same DS rule), so each head row registers the two callbacks under its id.
// Telemetry (zl) is not sent by this host.
const hosts = new Map();
let lastGuard = null;

export function useNestedCaretHost(headId, toggle, guard) {
  useLayoutEffect(() => {
    if (headId === undefined || toggle === undefined) return undefined;
    const entry = { toggle, guard };
    hosts.set(headId, entry);
    return () => { if (hosts.get(headId) === entry) hosts.delete(headId); };
  }, [headId, toggle, guard]);
}

export function toggleNestedFamily(headId, via) {
  const entry = hosts.get(headId);
  lastGuard = entry?.guard ?? null;
  entry?.toggle(via);
}

export function guardNestedCaretMultiClick(ms) {
  lastGuard?.(ms);
}
