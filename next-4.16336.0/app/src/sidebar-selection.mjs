// Sidebar multi-selection model (2.2553.1 shared-11 uI store): a Set of row
// keys plus the anchor used for shift ranges. The anchor domain is the list
// identity a selection was started in; interacting with a different domain
// resets the selection to that single row instead of mixing lists.
// Pure and immutable: every operation returns a new state object.

export function createSelection() {
  return { selectedKeys: new Set(), anchorKey: null, anchorDomain: "" };
}

function domainDiffers(state, domain) {
  return state.selectedKeys.size > 0 && state.anchorDomain !== domain;
}

export function isSelected(state, key) {
  return !!state && state.selectedKeys.has(key);
}

/** cmd/ctrl-click: remove when present, otherwise add (or restart when the domain changed). */
export function toggleSelection(state, key, domain = "") {
  const next = new Set(state.selectedKeys);
  if (next.has(key)) {
    next.delete(key);
    return { selectedKeys: next, anchorKey: key, anchorDomain: state.anchorDomain };
  }
  if (domainDiffers(state, domain)) return { selectedKeys: new Set([key]), anchorKey: key, anchorDomain: domain };
  next.add(key);
  return { selectedKeys: next, anchorKey: key, anchorDomain: domain };
}

/** shift-click: inclusive slice of the visible order between anchor and target;
 * only the target when either end is missing from the order. */
export function selectRange(state, anchor, target, orderedKeys, domain = "") {
  const from = domainDiffers(state, domain) || anchor === null || anchor === undefined ? -1 : orderedKeys.indexOf(anchor);
  const to = orderedKeys.indexOf(target);
  if (from === -1 || to === -1) return { selectedKeys: new Set([target]), anchorKey: target, anchorDomain: domain };
  const [start, end] = from < to ? [from, to] : [to, from];
  return { selectedKeys: new Set(orderedKeys.slice(start, end + 1)), anchorKey: anchor, anchorDomain: domain };
}

export function setSelection(state, keys, domain = state?.anchorDomain ?? "") {
  return { selectedKeys: new Set(keys), anchorKey: null, anchorDomain: domain };
}

/** Drop keys that no longer exist; returns the same object when nothing changed. */
export function pruneSelection(state, existingKeys) {
  const existing = existingKeys instanceof Set ? existingKeys : new Set(existingKeys);
  const kept = [...state.selectedKeys].filter((key) => existing.has(key));
  const anchorKey = state.anchorKey !== null && existing.has(state.anchorKey) ? state.anchorKey : null;
  if (kept.length === state.selectedKeys.size && anchorKey === state.anchorKey) return state;
  return { selectedKeys: new Set(kept), anchorKey, anchorDomain: state.anchorDomain };
}

export function clearSelection(state) {
  if (!state || state.selectedKeys.size === 0 && state.anchorKey === null) return state ?? createSelection();
  return createSelection();
}
