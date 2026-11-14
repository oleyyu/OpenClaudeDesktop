// Host stand-in for vendor-all-0 `I` (zustand's create) in generated/code-current/terminal-titles.mjs: cf718f694 G is
// `ee(() => ({ byPtyKey: {} }))` and the original code only calls G.setState(updater); the host reads it through
// getState/subscribe. Same contract as zustand's vanilla store: setState merges, Object.is skips, listeners get
// (state, previous). It is not a React hook: the pane subscribes with useSyncExternalStore itself.
export function createTerminalTitleStore(init) {
  let state;
  const listeners = new Set();
  const api = {
    getState: () => state,
    getInitialState: () => initial,
    setState(partial, replace = false) {
      const next = typeof partial === "function" ? partial(state) : partial;
      if (Object.is(next, state)) return;
      const previous = state;
      state = replace || typeof next !== "object" || next === null ? next : Object.assign({}, state, next);
      for (const listener of [...listeners]) { try { listener(state, previous); } catch {} }
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
  const initial = state = init(api.setState, api.getState, api);
  return api;
}
