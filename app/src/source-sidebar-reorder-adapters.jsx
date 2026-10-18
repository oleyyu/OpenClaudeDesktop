// Host adapters for src/generated/sidebar-reorder (R4g-sidebar SB2, research-ext/X7-partial-gaps.md X7-03): what the
// original 2.42304.0 section drag reorder reads from the desktop runtime that this app answers itself. Each name is
// mapped from one original binding in scripts/extract-sidebar-reorder.mjs, which pins it with feature strings.
//
//   defineLazyChunk     shared-104 fh (Fo): a lazily loaded chunk {entry: {id, tier, load}, pick, options} ->
//                       {Component, handle}. Officially it goes through the desktop's chunk loader (render-time
//                       loading, chunk healing and retry, overlay hosts, telemetry). Here `entry.load()` is the plain
//                       dynamic import of the generated copy (Vite splits it into its own chunk as the desktop build
//                       does); a failure renders nothing, which is b$'s `onChunkError: "fail-open"` with
//                       `loading: noFallback("no-ui")`: no placeholder while it loads, no error UI if it fails.
//   noFallback          shared-104 ph (ko): the "no fallback UI" loading marker ({reason}).
//   useLazyChunkStatus  shared-156 Ir (dB): "resident" once the chunk's module is loaded, "failed" when its load
//                       failed, else "pending" (also while disabled); while enabled it starts the load (Ir's
//                       `e.preload("open")`). `reportWait` (the wait telemetry) has nothing to report here.
//   preloadChunk        preload-helper t: vite's dynamic-import wrapper. The app's own build adds its preload
//                       wrapper around the import when it bundles the generated module, so this only calls `load`.
//   dragTelemetry       shared-25 id (Tv), the frame telemetry client: qs reports `page.drag_gesture` when a drag
//                       ends. Telemetry is not migrated (D17), so trackDragGesture records nothing.
import { createElement, useCallback, useSyncExternalStore } from 'react';

/** shared-104 ph: the loading option that asks for no fallback UI. */
export function noFallback(reason) {
  return Object.freeze({ noFallback: true, reason });
}

/** preload-helper t: `f(() => import(…))` -> the import itself. */
export function preloadChunk(load) {
  return load();
}

/** shared-25 id: the telemetry client's drag gesture event (D17: not migrated). */
export const dragTelemetry = Object.freeze({ trackDragGesture() {} });

/**
 * shared-104 fh: {entry: {id, load}, pick, options} -> {Component, handle}. `handle.load()` starts (once) and returns the
 * load; `handle.state` is idle / loading / loaded / failed; `Component` renders `pick(module)` with its props once the
 * module is loaded, and nothing before (or after a failed load).
 */
export function defineLazyChunk({ entry, pick, options = {} }) {
  const listeners = new Set();
  const notify = () => { for (const listener of [...listeners]) listener(); };
  const handle = {
    id: entry.id,
    state: 'idle',
    module: null,
    error: null,
    promise: null,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    load() {
      if (handle.promise) return handle.promise;
      handle.state = 'loading';
      handle.promise = Promise.resolve().then(() => entry.load()).then((module) => {
        handle.module = module;
        handle.state = 'loaded';
        notify();
        return module;
      }, (error) => {
        // fail-open: the error is kept on the handle and nothing renders (any other mode also reports it).
        handle.error = error;
        handle.state = 'failed';
        if (options.onChunkError !== 'fail-open') console.error(`${entry.id}: chunk failed to load`, error);
        notify();
        return null;
      });
      return handle.promise;
    },
  };
  const current = () => handle.module;
  function LazyChunk(props) {
    const module = useSyncExternalStore(handle.subscribe, current, current);
    if (module == null) return null;
    const Component = typeof pick === 'function' ? pick(module) : module.default;
    return Component == null ? null : createElement(Component, props);
  }
  LazyChunk.displayName = `LazyChunk(${entry.id})`;
  return { Component: LazyChunk, handle };
}

/** shared-156 Ir: "resident" / "failed" / "pending" for `handle`; while `enabled`, its load starts. */
export function useLazyChunkStatus(handle, enabled, _options) {
  const subscribe = useCallback((listener) => {
    if (!enabled) return () => {};
    const unsubscribe = handle.subscribe(listener);
    if (handle.state === 'idle') handle.load();
    return unsubscribe;
  }, [handle, enabled]);
  const snapshot = useCallback(() => (!enabled ? 'pending' : handle.state === 'loaded' ? 'resident' : handle.state === 'failed' ? 'failed' : 'pending'), [handle, enabled]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
