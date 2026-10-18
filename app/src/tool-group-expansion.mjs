// approval-current sN/pN:16542–16603: explicit expansion survives remounts.
// This independent cache stores booleans only, scoped by session and group.
export const groupExpansionKey = (session, group) => JSON.stringify([session, group]);
export function createToolGroupExpansion(limit = 1000) {
  const capacity=Number.isFinite(limit)?Math.max(1,Math.floor(limit)):1000;
  const values = new Map(), listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  return {
    get: key => values.get(key),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    set(key, open) {
      const next = Boolean(open);
      if (values.has(key) && values.get(key) === next) return;
      values.delete(key); values.set(key, next);
      while (values.size > capacity) values.delete(values.keys().next().value);
      notify();
    },
    clear() { if (values.size) { values.clear(); notify(); } },
    // c96d752d0 d9 (eS + axe, cc6e9624e l / u): a row's Try again forgets the session's expansion intentions.
    forgetSession(session) {
      const prefix = JSON.stringify([session]).slice(0, -1) + ',';
      let changed = false;
      for (const key of [...values.keys()]) if (key.startsWith(prefix)) { values.delete(key); changed = true; }
      if (changed) notify();
    },
  };
}
export const toolGroupExpansion = createToolGroupExpansion();

// sN keeps row intentions separate from groups, even for the same tool ID.
export const toolRowExpansion = createToolGroupExpansion();
export const rowExpansionKey = (session, item) => JSON.stringify([session, item]);
