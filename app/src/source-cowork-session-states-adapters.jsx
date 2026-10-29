// Local services for the 3.6556.2 Cowork session ended notice scripts/extract-cowork-session-states.mjs emits into
// src/generated/cowork-session-states (w13-coworkui-session-states: c21f11e6d EM / TM). Each export replaces one
// original declaration, which the extractor feature-checks (see its `adapters` table). The intl, error toast and
// pathname answers are routines-shared's (src/source-routines-shared-adapters.jsx); the host notice
// (src/source-cowork-session-states.jsx) turns the "New task" link into the host's own navigation.

// shared-78 Uy: `Vy() ? "/new" : Wy()`. Vy is the hub look (`pv()`: mode "c3" with hubLook, plus `By()`), which this
// host never runs (no GrowthBook client, D29/D31); Wy is `H() ? Qi : Ei` with H the "running inside an iframe" flag
// (shared-78 Dv: `window.self === window.top` → false) — the desktop window is the top frame, so Ei, shared-52 ml
// "/new?surface=cowork".
export const COWORK_NEW_TASK_HREF = '/new?surface=cowork';
export function useNewTaskHref() {
  return COWORK_NEW_TASK_HREF;
}
