// Host adapter for the 2.42304.0 session cycle (generated/code-current/session-cycle-rows.mjs; R3-sidebar2, cov7-02).
//
// shared-16 rm reads the folded groups and expands one through the dframe store: `r = W.getState()`,
// `r.collapsedGroups.includes(t)`, `n(() => r.expandGroup(t))` (W is shared-52 If). Locally the folded keys and the way
// to unfold one belong to SourceSidebar (its preferences' collapsedGroups and, in the sections layout, a section's own
// collapsed flag), so the sidebar connects them here; with no sidebar connected nothing is folded.
// (No imports: the generated rows module imports this one.)

let groups = null;
const noGroups = Object.freeze({ collapsedGroups: Object.freeze([]), expandGroup: () => {} });

/** W (shared-52 If) for rm: getState() gives the folded keys and expandGroup(key) of the connected sidebar. */
export const sessionCycleGroupStore = Object.freeze({
  getState() {
    if (!groups) return noGroups;
    const provider = groups;
    return { collapsedGroups: [...(provider.collapsedGroups() ?? [])], expandGroup: (key) => provider.expandGroup(key) };
  },
});

/** SourceSidebar: `collapsedGroups()` → the keys folded now; `expandGroup(key)` unfolds one. Returns the disconnect. */
export function connectSessionCycleGroups(provider) {
  groups = provider;
  return () => { if (groups === provider) groups = null; };
}
