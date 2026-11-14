// React Compiler support for tests that install their own hook dispatcher (D21 / R5).
//
// 3.6556.2 official chunks are React Compiler output: every component starts with
// `let $ = J9(n)`, where shared-frame `J9` is vendor-frame `Oo`, i.e.
// `react/compiler-runtime#c` (`e.c=function(e){return t.H.useMemoCache(e)}`), and the
// cache slots are compared against `J8 = Symbol.for("react.memo_cache_sentinel")`.
// A hand-built dispatcher therefore needs `useMemoCache(size)`.
//
// `withMemoCache(dispatcher)` adds that hook to the dispatcher object itself and returns it.
// The cache array lives in the dispatcher's own state slot (`useState` with a lazy
// initializer), so a dispatcher with cursor-based slots returns the same array on every
// render, as React does. A dispatcher without `useState`, or whose `useState` does not run
// lazy initializers, gets a fresh sentinel-filled array per call (one-shot renders only).
// An existing `useMemoCache` is left untouched.

export const MEMO_CACHE_SENTINEL = Symbol.for('react.memo_cache_sentinel');

export function createMemoCache(size) {
  if (!Number.isInteger(size) || size < 0) throw new TypeError(`useMemoCache size must be a non-negative integer, got ${size}`);
  return new Array(size).fill(MEMO_CACHE_SENTINEL);
}

export function withMemoCache(dispatcher) {
  if (dispatcher === null || (typeof dispatcher !== 'object' && typeof dispatcher !== 'function')) {
    throw new TypeError('withMemoCache expects a hook dispatcher object');
  }
  if (typeof dispatcher.useMemoCache === 'function') return dispatcher;
  dispatcher.useMemoCache = function useMemoCache(size) {
    if (typeof dispatcher.useState === 'function') {
      const state = dispatcher.useState(() => createMemoCache(size));
      const cache = Array.isArray(state) ? state[0] : undefined;
      if (Array.isArray(cache)) {
        if (cache.length !== size) throw new Error(`useMemoCache size changed between renders (${cache.length} -> ${size}); the dispatcher's state slots are out of order`);
        return cache;
      }
    }
    return createMemoCache(size);
  };
  return dispatcher;
}
