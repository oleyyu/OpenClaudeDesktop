export const DIFF_SPLIT_MIN_WIDTH = 560;
// F12: wordDiff ("Highlight changed words", default on) and hideWhitespace ("Hide
// whitespace changes", default off) join the persisted Changes display prefs
// (panes-tile-current.js:3597-3598, 3805-3835).
export const DIFF_PREFERENCE_KEYS = { layout: 'code-desktop-diff-layout', wordWrap: 'code-desktop-diff-word-wrap',
  wordDiff: 'code-desktop-diff-word-diff', hideWhitespace: 'code-desktop-diff-hide-whitespace' };
export function normalizeDiffPreference(key, value) {
  if (key === 'layout') return value === 'split' || value === 'auto' ? 'split' : 'unified';
  return key === 'hideWhitespace' ? value === true : value !== false;
}
export function createDiffPreferencesStore({ storage, subscribeStorage = () => () => {} } = {}) {
  const read = key => { try { return normalizeDiffPreference(key, JSON.parse(storage?.getItem(DIFF_PREFERENCE_KEYS[key]) ?? 'null')); } catch { return normalizeDiffPreference(key, null); } };
  const readAll = () => Object.fromEntries(Object.keys(DIFF_PREFERENCE_KEYS).map(key => [key, read(key)]));
  let current = readAll();
  const listeners = new Set();
  const publish = next => { if (Object.keys(DIFF_PREFERENCE_KEYS).every(key => next[key] === current[key])) return; current = next; for (const listener of [...listeners]) listener(); };
  const off = subscribeStorage(event => {
    if (event.storageArea && event.storageArea !== storage) return;
    if (event.key === null || Object.values(DIFF_PREFERENCE_KEYS).includes(event.key)) publish(readAll());
  });
  return {
    getSnapshot: () => current,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    set(key, value) {
      if (!Object.hasOwn(DIFF_PREFERENCE_KEYS, key)) return;
      const next = normalizeDiffPreference(key, value);
      try { storage?.setItem(DIFF_PREFERENCE_KEYS[key], JSON.stringify(next)); } catch { /* Keep the current window usable without storage. */ }
      publish({ ...current, [key]: next });
    },
    dispose() { off(); listeners.clear(); },
  };
}

export function observeDiffSplitFit(element, onChange, Observer = element.ownerDocument.defaultView.ResizeObserver) {
  let active = true, last;
  const measure = width => {
    if (!active || !Number.isFinite(width) || width <= 0) return;
    const fits = width >= DIFF_SPLIT_MIN_WIDTH;
    if (fits !== last) { last = fits; onChange(fits); }
  };
  measure(element.getBoundingClientRect().width);
  const observer = new Observer(entries => { for (const entry of entries) if (entry.target === element) measure(entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width); });
  observer.observe(element, { box: 'border-box' });
  return () => { active = false; observer.disconnect(); };
}

// Pair only real lines within each change run. Context is present on both
// sides, using each side's own lexical index and line number. A no-newline
// note follows its actual preceding side without consuming a source line.
export function splitDiffRows(rows) {
  const result = []; let old = [], next = [], beforeLine = 0, afterLine = 0, previous = [];
  const flush = () => {
    for (let i = 0; i < Math.max(old.length, next.length); i++) result.push({ before: old[i] || null, after: next[i] || null });
    old = []; next = [];
  };
  rows.forEach((row, rowIndex) => {
    if (row.type === 'note') { for (const cell of previous) cell.notes.push(row.text); return; }
    const cell = side => ({ ...row, side, line: side === 'before' ? beforeLine++ : afterLine++, rowIndex, notes: [] });
    if (row.type === 'removed') { const item = cell('before'); old.push(item); previous = [item]; }
    else if (row.type === 'added') { const item = cell('after'); next.push(item); previous = [item]; }
    else if (row.type === 'context') { flush(); const pair = { before: cell('before'), after: cell('after') }; result.push(pair); previous = [pair.before, pair.after]; }
    else { flush(); previous = []; }
  });
  flush(); return result;
}
