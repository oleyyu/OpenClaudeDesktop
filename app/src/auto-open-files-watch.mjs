// "Auto-open files Claude writes" (3.6556.2 menus:N1 / panes:C5-4), the behaviour: a file the agent wrote that the
// built-in browser can show opens in the session's Preview pane. Pure (no imports), so plain node can load it (E42).
//
// Official (main process, asar index.chunk-DNPOm2Zc.js):
//   - The PostToolUse hook rA is installed only when the session has the Browser tools
//     (`cn = u.supportsLaunchTools() && !!Zt["Claude Browser"]`), and runs on `Edit` / `Write` / `MultiEdit` with
//     `f = u.tool_input?.file_path || ""`:
//       `if (Gk.test(f) && !t.m0("2515400668")) return {}` — Gk = /\.dc\.html$/i, a GrowthBook gate the host keeps off
//         (D29/D31), so a design canvas never auto-opens here;
//       `p = Wk.test(f)` (Wk = /\.html?$/i), `m = /\.(html?|svg|png|jpe?g|gif|webp|avif|pdf|mp4|webm|m4v|mov|ogv)$/i`;
//       `g = c.has(Yk(f)) || … isSessionSource(f)` — a published Artifact's file (the host has no Artifact tool, so
//         never) — and `if (g && paneOpens) return {}`;
//       `if (m && !(p && e())) { … await Qk(r, f, n ? 0 : Zk) … }` — e() = isAutoVerifyEnabled(cwd): an HTML file
//         under auto verify is left to the agent's own verification, everything else matching m goes to the opener.
//   - The opener `e => Fk(Pk(e, p), r, p, () => this.deps.agentEditSessionState(r))`, Pk(e, t) = path.resolve(t, e):
//       `if (t.G0("launchAutoOpenFiles") === !1) return … "autoOpenOff"`;
//       `let a = i(); if (a !== "watched") return … "skipped"`;
//       `if (!t.oI()) { try { t.Tu.loadHtmlPreview(e, r, { sessionId: n }) } catch (e) { return Nk(e), "skipped" }
//         return "opened" }` — without file tabs (oI = cP() && sP(), Cowork file tabs) every such file loads in the
//         session's browser preview; the host has no file tabs, so that is the branch it follows.
//   - agentEditSessionState(e): `!t || t.isArchived ? "gone" : this.warmLifecycle.getState(e)?.isTabVisible === !1
//       ? "hidden" : "watched"`.
// Host: the agent's edits arrive as completed `fileChange` items (Codex FileUpdateChange {path, kind}); one Write/Edit
// is one file, so for an item that touched several files the last eligible one is what stays shown (each official
// loadHtmlPreview evicts the session's previous one, evictHtmlPreviewsForScope).

// rA `m`, verbatim.
export const AUTO_OPEN_FILE_PATTERN = /\.(html?|svg|png|jpe?g|gif|webp|avif|pdf|mp4|webm|m4v|mov|ogv)$/i;
// Wk.
export const AUTO_OPEN_HTML_PATTERN = /\.html?$/i;
// Gk, behind GrowthBook 2515400668.
export const AUTO_OPEN_DESIGN_CANVAS_PATTERN = /\.dc\.html$/i;
export const AUTO_OPEN_DESIGN_CANVAS_GATE = "2515400668";

/** agentEditSessionState: "gone" (no such session, or archived), "hidden" (known not on screen), else "watched". */
export function autoOpenSessionState({ known = false, archived = false, visible } = {}) {
  if (!known || archived) return "gone";
  return visible === false ? "hidden" : "watched";
}

// Pk = path.resolve(cwd, file), POSIX only (the renderer has no node:path).
export function resolveAutoOpenPath(file, cwd) {
  if (typeof file !== "string" || !file) return "";
  const base = file.startsWith("/") ? "" : typeof cwd === "string" ? cwd : "";
  const parts = [];
  for (const part of `${base}/${file}`.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop(); else parts.push(part);
  }
  return `/${parts.join("/")}`;
}

/**
 * One written file through rA's checks and Fk. Returns null when the official hook would not call the opener at all
 * (no Browser tools, not a showable type, a design canvas with its gate off, HTML under auto verify), otherwise
 * { outcome: "autoOpenOff" | "skipped" | "opened", path } where path is Pk(file, cwd); only "opened" opens anything.
 */
export function autoOpenFileDecision(file, { cwd = null, browserTools = true, enabled = true, autoVerify = false,
  sessionState = "watched", designCanvas = false } = {}) {
  if (!browserTools || typeof file !== "string" || !file) return null;
  if (AUTO_OPEN_DESIGN_CANVAS_PATTERN.test(file) && !designCanvas) return null;
  if (!AUTO_OPEN_FILE_PATTERN.test(file)) return null;
  if (AUTO_OPEN_HTML_PATTERN.test(file) && autoVerify) return null;
  const path = resolveAutoOpenPath(file, cwd);
  if (enabled === false) return { outcome: "autoOpenOff", path };
  if (sessionState !== "watched") return { outcome: "skipped", path };
  return { outcome: "opened", path };
}

// FileUpdateChange: a move writes its destination (file-tool-model changePath); a delete writes nothing.
function writtenPath(change) {
  if (!change || typeof change !== "object") return "";
  const kind = typeof change.kind === "string" ? change.kind : change.kind?.type;
  if (kind === "delete") return "";
  const moved = change.kind && typeof change.kind === "object" ? change.kind.move_path : null;
  return typeof moved === "string" && moved ? moved : typeof change.path === "string" ? change.path : "";
}

/**
 * The agent edit an app-server event reports: item/completed for a completed fileChange item →
 * { sessionId, files } (written paths in order), else null.
 */
export function agentWrittenFiles(event) {
  if (event?.method !== "item/completed") return null;
  const params = event.params, item = params?.item;
  if (typeof params?.threadId !== "string" || !params.threadId || item?.type !== "fileChange" || item.status !== "completed") return null;
  const files = (Array.isArray(item.changes) ? item.changes : []).map(writtenPath).filter(Boolean);
  return files.length ? { sessionId: params.threadId, files } : null;
}

/**
 * The file to open for one agent edit event, or null. `context(threadId)` gives, at the time of the event, the
 * { cwd, browserTools, enabled, autoVerify, sessionState, designCanvas } of the session the edit belongs to, and its
 * `sessionId` when that is not the thread itself (a sub-agent's edit runs under its parent session's hooks).
 */
export function autoOpenTarget(event, context) {
  const written = agentWrittenFiles(event);
  if (!written) return null;
  const options = context?.(written.sessionId) ?? null;
  if (!options) return null;
  let target = null;
  for (const file of written.files) {
    const decision = autoOpenFileDecision(file, options);
    if (decision?.outcome === "opened") target = decision.path;
  }
  return target ? { sessionId: typeof options.sessionId === "string" && options.sessionId ? options.sessionId : written.sessionId, path: target } : null;
}
