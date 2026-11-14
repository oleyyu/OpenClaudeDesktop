// Pane windows (Files, Changes, Plan popped out of a session: main.cjs openPopout) come back after a quit and
// relaunch, where they were and with Keep window on top as it was. Claude Desktop 2.2553.1 does the same for its
// popouts (index.chunk-ChZ67Jhw.js SessionPopouts reportOpenPopouts / takeRestorablePopouts: each popout's
// {sessionId, paneTileId, view, alwaysOnTop, bounds}, written at quit, "[popout-restore] Saving %d session + %d pane
// popout(s) for next launch", reopened at the next launch with the bounds clamped to the screens).
// The list is written when a quit starts (before any window closes) and taken once at launch: a crash or a later quit
// with no pane window open never brings back an old one. Pure apart from the injected fs, so it is unit-testable.
const nodeFs = require("node:fs");
const path = require("node:path");

const POPOUTS_FILE = "open-popouts.json";
const MAX_POPOUTS = 12;
// B27: session popouts (pane "session": cd377abb5 wr `popouts`, beside the pane popouts' `panes`) are saved in the same
// list with their own cap (window-registry.cjs MAX_SESSION_POPOUTS).
const SESSION_PANE = "session";
const MAX_SESSION_POPOUTS = 16;
const WINDOW_KEY = /^[a-z0-9-]{1,40}$/;

const validSessionId = (value) => typeof value === "string" && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f]/.test(value) ? value : null;
const integer = (value) => Number.isFinite(value) ? Math.round(value) : null;
function validBounds(value, { minWidth = 1, minHeight = 1 } = {}) {
  if (!value || typeof value !== "object") return null;
  const x = integer(value.x), y = integer(value.y), width = integer(value.width), height = integer(value.height);
  if (x === null || y === null || width === null || height === null || width < minWidth || height < minHeight || width > 100000 || height > 100000) return null;
  return { x, y, width, height };
}

/**
 * What to save for the open pane windows: [{sessionId, pane, alwaysOnTop, bounds, displayBounds?, ownerKey?}].
 * @param {Array<{sessionId, pane, alwaysOnTop?, bounds, displayBounds?, ownerKey?}>} entries
 */
function popoutSnapshot(entries, { kinds = null } = {}) {
  const out = [], seen = new Set();
  let panes = 0, sessions = 0;
  for (const entry of Array.isArray(entries) ? entries : []) {
    const sessionId = validSessionId(entry?.sessionId), pane = typeof entry?.pane === "string" ? entry.pane : null;
    const bounds = validBounds(entry?.bounds);
    if (!sessionId || !pane || !bounds || (kinds && !kinds.has(pane))) continue;
    const key = `${sessionId}\u0000${pane}`;
    if (seen.has(key)) continue;
    if (pane === SESSION_PANE ? sessions >= MAX_SESSION_POPOUTS : panes >= MAX_POPOUTS) continue;
    seen.add(key);
    if (pane === SESSION_PANE) sessions += 1; else panes += 1;
    const displayBounds = validBounds(entry.displayBounds);
    out.push({ sessionId, pane, alwaysOnTop: entry.alwaysOnTop === true, bounds, ...(displayBounds ? { displayBounds } : {}),
      ...(typeof entry.ownerKey === "string" && WINDOW_KEY.test(entry.ownerKey) ? { ownerKey: entry.ownerKey } : {}) });
  }
  return out;
}

/** The saved list, cleaned: only known panes of sessions that still exist (`exists(sessionId)`), each once. */
function restorablePopouts(raw, { kinds = null, exists = () => true } = {}) {
  const list = popoutSnapshot(Array.isArray(raw?.popouts) ? raw.popouts : [], { kinds });
  return list.filter((entry) => { try { return exists(entry.sessionId) === true; } catch { return false; } });
}

function savePopouts(file, entries, { fs = nodeFs, kinds = null } = {}) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + ".tmp", JSON.stringify({ version: 1, popouts: popoutSnapshot(entries, { kinds }) }, null, 2));
    fs.renameSync(file + ".tmp", file);
    return true;
  } catch { return false; }
}

/** Read the saved list once: the file is removed, so only the quit that wrote it brings the windows back. */
function takeRestorablePopouts(file, { fs = nodeFs, kinds = null, exists = () => true } = {}) {
  let raw = null;
  try { raw = JSON.parse(fs.readFileSync(file, "utf8")); } catch { raw = null; }
  try { fs.rmSync(file, { force: true }); } catch { /* best effort */ }
  return restorablePopouts(raw, { kinds, exists });
}

module.exports = { POPOUTS_FILE, MAX_POPOUTS, SESSION_PANE, MAX_SESSION_POPOUTS, popoutSnapshot, restorablePopouts, savePopouts, takeRestorablePopouts };
