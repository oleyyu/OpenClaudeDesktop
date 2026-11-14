// Per-cwd cache of the custom command folders (C3). load(cwd) asks the main process
// (desktop.call('custom-commands', {op:'list', cwd})), and a 'custom-commands-changed'
// desktop event (the folder watchers in electron/custom-commands.cjs) reloads the affected entries.
// Snapshot: { entries: { [cwdKey]: { status:'loading'|'ready'|'error', global, project, error } } }.
const MAX_ENTRIES = 16;
const keyOf = cwd => typeof cwd === 'string' && cwd ? cwd : '';
const EMPTY_ENTRY = Object.freeze({ status: 'idle', global: null, project: null, error: '' });

export function createCustomCommandsStore({ call, onEvent } = {}) {
  let snapshot = { entries: {} };
  const listeners = new Set(), inflight = new Map();
  let unsubscribe = null, generation = 0;
  const publish = (key, entry) => {
    const entries = { ...snapshot.entries, [key]: entry };
    const keys = Object.keys(entries);
    while (keys.length > MAX_ENTRIES) delete entries[keys.shift()];
    snapshot = { entries };
    for (const listener of [...listeners]) listener();
  };
  async function load(cwd, { force = false } = {}) {
    const key = keyOf(cwd);
    if (!call) return;
    if (!force && snapshot.entries[key] && snapshot.entries[key].status !== 'error') return inflight.get(key);
    if (!force && inflight.has(key)) return inflight.get(key);
    const previous = snapshot.entries[key];
    const token = ++generation;
    if (!previous) publish(key, { ...EMPTY_ENTRY, status: 'loading' });
    const request = Promise.resolve().then(() => call('custom-commands', { op: 'list', cwd: key || undefined })).then(result => {
      if (inflight.get(key)?.token !== token) return;
      publish(key, { status: 'ready', global: result?.global || null, project: result?.project || null, error: '' });
    }, error => {
      if (inflight.get(key)?.token !== token) return;
      publish(key, { ...(previous || EMPTY_ENTRY), status: 'error', error: error?.message || String(error) });
    }).finally(() => { if (inflight.get(key)?.token === token) inflight.delete(key); });
    request.token = token;
    inflight.set(key, request);
    return request;
  }
  const reloadAll = () => Promise.all(Object.keys(snapshot.entries).map(key => load(key, { force: true })));
  function observe(event) {
    if (event?.kind !== 'custom-commands-changed') return;
    if (event.scope === 'project' && typeof event.cwd === 'string') {
      // A project watcher fires for its root; reload every cached cwd at or below that root.
      const root = event.cwd.replace(/\/$/, '');
      for (const key of Object.keys(snapshot.entries)) if (key === root || key.startsWith(root + '/')) load(key, { force: true });
    } else reloadAll();
  }
  return {
    subscribe(listener) {
      listeners.add(listener);
      if (!unsubscribe && onEvent) unsubscribe = onEvent(observe) || null;
      return () => {
        listeners.delete(listener);
        if (!listeners.size && unsubscribe) { unsubscribe(); unsubscribe = null; }
      };
    },
    getSnapshot: () => snapshot,
    entry: cwd => snapshot.entries[keyOf(cwd)] || EMPTY_ENTRY,
    load,
    reloadAll,
    observe,
  };
}

const desktop = typeof window !== 'undefined' ? window.desktop : null;
export const customCommandsStore = createCustomCommandsStore({
  call: desktop?.call ? (action, params) => desktop.call(action, params) : null,
  onEvent: desktop?.onEvent ? handler => desktop.onEvent(handler) : null,
});
