// Which forks the parent session's transcript marks, and where (source-fork-lineage.jsx SourceForkMarker).

/** Forks of `parentId` by the turn they were made at: {turnId → [{id, title, archived}]}. A fork's turn is its
 * metadata's forkedAtTurn, else the one this window recorded when it made the fork (`points`: {forkId → {parent,
 * turnId}}); a fork whose turn is unknown gets no marker rather than a misplaced one. */
export function forkMarkersFor(parentId, sessions = [], metadata = {}, points = {}) {
  const marks = new Map();
  if (!parentId) return marks;
  for (const row of sessions) {
    const meta = metadata?.[row?.id] ?? {};
    const from = (typeof meta.forkedFrom === "string" && meta.forkedFrom) || (typeof row?.forkedFromId === "string" && row.forkedFromId) || null;
    if (from !== parentId || row.id === parentId) continue;
    const recorded = points?.[row.id];
    const turnId = (typeof meta.forkedAtTurn === "string" && meta.forkedAtTurn) || (recorded?.parent === parentId ? recorded.turnId : null);
    if (!turnId) continue;
    const entry = { id: row.id, title: row.name || row.preview || null, archived: row.archived === true };
    marks.set(turnId, [...(marks.get(turnId) ?? []), entry]);
  }
  return marks;
}
