// Group by › Model's pure parts (frame-sidebar-nav-groups.jsx draws and wires them): the official groupBy vocabularies the
// boundaries now answer, and the provider buckets of the Code list's rows.
import { sessionProviderGroup } from "./model-menu-model.mjs";

// The official section ↔ list vocabularies (4.16336.0 shared-92 `by` and `xy`; the generator drops them from the slice with
// their only callers, Tm and Mm, now answered here).
export function listToSectionGroupBy(value) {
  switch (value) {
    case undefined: return undefined;
    case "custom": case "none": return "none";
    case "project": return "folder";
    case "environment": case "coder": return "savedEnvironment";
    case "state": return "status";
    default: return "date";
  }
}
export function sectionToListGroupBy(value) {
  switch (value) {
    case "folder": return "project";
    case "savedEnvironment": return "environment";
    case "status": return "state";
    default: return value;
  }
}
// A list row's session (the official row, nav-body: {ref, source: {kind: "code", data}}): data is the row the official list
// normalized from the CCR session shape it keeps as _originalSession, whose session_context carries the session's model.
const rowModel = (data) => data?._originalSession?.session_context?.model ?? data?.model ?? null;
const rowTime = (data) => Number(data?.lastWorkAtMs) || Date.parse(data?.timestamp ?? "") || 0;
/**
 * Group by › Model's buckets: the list's rows by their session's provider ({key, provider, label, rows, recentModel}), in the
 * catalog's provider order; rows whose model names no provider last, in an "Other" bucket without a provider.
 */
export function modelSessionBuckets(rows = [], models = [], otherLabel = "Other") {
  const providerOf = sessionProviderGroup(models), buckets = new Map();
  for (const row of rows) {
    const data = row?.source?.data, model = rowModel(data);
    const group = providerOf(model);
    const key = group ? group.key : null;
    let bucket = buckets.get(key);
    if (!bucket) buckets.set(key, bucket = { key: key ?? "other", provider: key, label: group ? group.label : otherLabel, order: group ? group.order : Infinity, rows: [], recent: null });
    bucket.rows.push(row);
    const at = rowTime(data);
    if (group && typeof model === "string" && (!bucket.recent || at > bucket.recent.at)) bucket.recent = { at, model };
  }
  return [...buckets.values()]
    .sort((a, b) => (a.provider === null) - (b.provider === null) || a.order - b.order || String(a.label).localeCompare(String(b.label)))
    .map(({ key, provider, label, rows: bucketRows, recent }) => ({ key, provider, label, rows: bucketRows, recentModel: recent?.model ?? null }));
}
