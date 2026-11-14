// Host adapters of the 4.16336.0 code-editor-current graph (src/generated/code-editor-current-v4), named by
// scripts/extract-code-editor-current.mjs (adaptersV4, each pinned to the original declaration it answers for).
// Plain ESM (no JSX): node tests import the graph directly.

// preload-helper s (exported t, preload-helper-BBljBeZo.js): Vite's dynamic-import wrapper (modulepreload links for the
// chunk's CSS / dependencies, `vite:preloadError`, chunk-load retries, the globalThis.__antChunkLoadCtx telemetry
// context). Every call the wrapper makes is `n(() => import("./<chunk>.js"), [])` (no dependencies; the generator checks
// each one), and the app's own bundler adds its preload wrapper when it bundles the generated module, so the loader
// runs as is. Same answer as the mcp-app-host and sidebar-reorder adapters.
export function preloadChunk(load) {
  return load();
}
