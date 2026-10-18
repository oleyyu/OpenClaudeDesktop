// Host adapters the original shared-11 df (generated/btw-pane/detach-eligibility.mjs, scripts/extract-btw-pane.mjs)
// reads in place of two declarations of its chunk. Kept free of imports so the generated module can import it without a
// cycle.

// uf: `return !!V?.detachFromParent` — the desktop bridge offers detachFromParent. Locally that is main.cjs
// btw-session op 'detach' (electron/btw-sessions.cjs detach), always present in this app; whether the connected core
// keeps /btw children at all (supportsBtwChildren) is the caller's gate (btw-tab-menu-model.mjs `supported`).
export function detachFromParentAvailable() {
  return true;
}

// Iu(e, t): `t ? (Fu.parents = ou(e, !0), cached per sessions array) : Au` — the nest-parent map of the session records,
// or the empty map when nesting is off. df asks it with t = true and only reads `has(sessionId)`. Stand-in for ou over
// the official-shaped records (shared-11 Pl: sessionId, isArchived, spawnedFrom, lineageDetached): a session's parent
// is its spawnedFrom lineage, which F_ drops once lineageDetached; the parent must be listed, and, as ou does, an
// archived parent does not hold a live child.
const NONE = new Map();
let cached = null;
export function detachLineageParents(records, nested) {
  if (!nested) return NONE;
  if (cached?.records === records) return cached.parents;
  const byId = new Map(records.map(record => [record.sessionId, record])), parents = new Map();
  for (const record of records) {
    // $l(e, !0) for a record without the official `lineage` field: `lineageDetached` → none; `spawnedFrom.sideSession`
    // → its spawnedFrom.sessionId. (The forkedFromSessionId branch has no field on these records; df only asks /btw tabs.)
    const parentId = record.lineageDetached || !record.spawnedFrom?.sideSession ? undefined : record.spawnedFrom.sessionId;
    const parent = typeof parentId === 'string' && parentId !== record.sessionId ? byId.get(parentId) : undefined;
    if (parent && !(parent.isArchived === true && record.isArchived !== true)) parents.set(record.sessionId, parentId);
  }
  cached = { records, parents };
  return parents;
}
