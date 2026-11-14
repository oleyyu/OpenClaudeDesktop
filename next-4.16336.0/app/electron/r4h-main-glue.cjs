// R4h-glue-tests (G1): pure main-process helpers extracted from electron/main.cjs so Y1-reviewed wiring
// (R4e-zoom menuZoomLevel / applyWindowZoom / settleWindowZoom, R3-nested archiveParentCascade) is behavior-tested
// directly without duplicating glue in tests.
const { clampZoomFactor, zoomLevelAfter } = require("./window-chrome.cjs");
const { refreshZoomMenu } = require("./app-menu.cjs");

function hasLiveContents(window) {
  return Boolean(window && !window.isDestroyed?.() && window.webContents && !window.webContents.isDestroyed?.());
}

// R4e-zoom (2.42304.0 gPi): the main view's zoom level for installAppMenu, or undefined without a live main window.
function menuZoomLevel(win, isLive = hasLiveContents) {
  return isLive(win) ? win.webContents.getZoomLevel() : undefined;
}

// R4e-zoom (2.42304.0 I$ -> PPi): refresh the four zoom menu items, persist the factor hint, and notify the renderer.
function settleWindowZoom({ win, Menu, isLive = hasLiveContents, zoomFactorOf, rememberZoomHint = () => {}, emit = () => {} } = {}) {
  if (!isLive(win)) return undefined;
  refreshZoomMenu(win, Menu);
  const zoomFactor = typeof zoomFactorOf === "function"
    ? zoomFactorOf(win)
    : clampZoomFactor(typeof win.webContents.getZoomFactor === "function" ? win.webContents.getZoomFactor() : 1.2 ** win.webContents.getZoomLevel());
  rememberZoomHint(zoomFactor);
  emit({ kind: "zoom-factor", zoomFactor });
  return zoomFactor;
}

// ONr/SNr/FPi/APi: step or reset the main window's level, copy it to every live window and reposition its traffic lights, then settle.
function applyWindowZoom({ win, windows = [win], request, Menu, isLive = hasLiveContents, placeTrafficLights = () => {}, zoomSettled, zoomFactorOf, rememberZoomHint, emit } = {}) {
  if (!isLive(win)) return undefined;
  const level = zoomLevelAfter(win.webContents.getZoomLevel(), request);
  for (const window of windows) {
    if (!isLive(window)) continue;
    window.webContents.setZoomLevel(level);
    placeTrafficLights(window);
  }
  if (typeof zoomSettled === "function") zoomSettled();
  else settleWindowZoom({ win, Menu, isLive, zoomFactorOf, rememberZoomHint, emit });
  return level;
}

// R3-nested (2.42304.0 CFJssAFf teardownSession): after saving the archived parent, emit its "archived" event first,
// read cascadeHoldsArchive before starting cascadeParentArchive, and await the cascade only while live side sessions or
// openings in flight hold the archive answer.
async function archiveParentCascade({
  threadId,
  owner,
  emitSessionList,
  btwSessions,
  warn = (error) => console.warn("Side session cascade:", error.message),
} = {}) {
  emitSessionList("archived", threadId);
  const holdsArchive = btwSessions.cascadeHoldsArchive(threadId);
  const cascade = btwSessions.cascadeParentArchive({ parentId: threadId, owner }).catch(warn);
  if (holdsArchive) await cascade;
  return { holdsArchive };
}

module.exports = {
  hasLiveContents,
  menuZoomLevel,
  settleWindowZoom,
  applyWindowZoom,
  archiveParentCascade,
};
