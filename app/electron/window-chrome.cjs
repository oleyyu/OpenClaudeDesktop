// Native window chrome values, kept pure so they are unit-testable.
// index.chunk-ChZ67Jhw.js ssn={light:"#fcfcfb",dark:"#151515"} and jP():
// windows are created with, and repainted on nativeTheme "updated" to, the
// background of the resolved appearance.
const WINDOW_BACKGROUND = Object.freeze({ light: "#fcfcfb", dark: "#151515" });
function windowBackground(dark) {
  return dark ? WINDOW_BACKGROUND.dark : WINDOW_BACKGROUND.light;
}
// Hon=.25 / CP: zoom factors are clamped to [0.25, 5]; Uon=Math.log(1.2),
// Won/Gon/Kon: zoom levels to the same range in Chromium's 1.2^level steps.
const ZOOM_FACTOR = Object.freeze({ MIN: 0.25, MAX: 5 });
const clampZoomFactor = (factor) => Math.min(ZOOM_FACTOR.MAX, Math.max(ZOOM_FACTOR.MIN, Number.isFinite(factor) ? factor : 1));
// R4e-zoom: the level range, its clamp and the step are the original 2.42304.0 bindings (index.chunk-muI2IV6k.js
// NHn=Math.log(jHn)/MHn, PHn=Math.log(5)/MHn, FHn, mPi=.5; electron/generated/r4e-zoom.cjs), the same values Zoom In /
// Zoom Out's enabled checks (_Pi / vPi) compare against.
const r4eZoom = require("./generated/r4e-zoom.cjs");
const ZOOM_LEVEL = Object.freeze({ MIN: r4eZoom.ZOOM_LEVEL_MIN, MAX: r4eZoom.ZOOM_LEVEL_MAX });
const clampZoomLevel = r4eZoom.clampZoomLevel;
// mPi=.5 (Zoom In, MPi) and -.5 (Zoom Out, NPi) per FPi step; Actual Size is level 0 (APi).
const ZOOM_STEP = r4eZoom.ZOOM_STEP;
// index.chunk-CiiI592G.js iSi(e) (2.31226.0): n = EIn(e===0 ? t : Math.round((t+e)/zxi)*zxi+0), zxi=.5 — a step
// lands back on the 0.5 grid (a level restored from a factor hint, or reached some other way, re-snaps; +0 turns
// -0 into 0); a zero step (iSi(0) on focus) re-applies the current level, only clamped. Qxi: Actual Size is 0.
// 2.42304.0 FPi keeps it: n=FHn(e===0?t:Math.round((t+e)/mPi)*mPi+0), then I$() refreshes the four zoom items.
function zoomLevelAfter(level, request) {
  if (request?.reset === true) return 0;
  const delta = Number.isFinite(request?.delta) ? request.delta : 0;
  const current = Number.isFinite(level) ? level : 0;
  return clampZoomLevel(delta === 0 ? current : Math.round((current + delta) / ZOOM_STEP) * ZOOM_STEP + 0);
}
// pBn = UWe("windowControlsZoomFactor", e => finite number or undefined, …, 1) and mBn() = QF(pBn.read() ?? 1):
// the main window's zoom factor, remembered whenever it settles (qI pBn.remember) and read at the next launch so
// the window is created at that zoom with its traffic lights already in place (SBn trafficLightPosition).
const ZOOM_HINT_KEY = "windowControlsZoomFactor";
function zoomFactorHint(value) {
  return clampZoomFactor(typeof value === "number" ? value : 1);
}
// eun=12 and run(base, zoom): each coordinate becomes
// max(0, round((v + eun/2) * CP(zoom) - eun/2)).
const TRAFFIC_LIGHT_SIZE = 12;
function scaleTrafficLights(base, zoom) {
  const half = TRAFFIC_LIGHT_SIZE / 2, factor = clampZoomFactor(zoom);
  const scale = (value) => Math.max(0, Math.round((value + half) * factor - half));
  return { x: scale(base.x), y: scale(base.y) };
}
// aun(zoom) = run({x:iun, y:iun}, zoom) with iun=33/2: {x:17, y:17} at 100%
// (lun; uun feeds the main window's trafficLightPosition).
const TRAFFIC_LIGHT_ORIGIN = Object.freeze({ x: 33 / 2, y: 33 / 2 });
function trafficLightPosition(zoom = 1) {
  return scaleTrafficLights(TRAFFIC_LIGHT_ORIGIN, zoom);
}
module.exports = { WINDOW_BACKGROUND, windowBackground, ZOOM_FACTOR, clampZoomFactor, ZOOM_LEVEL, clampZoomLevel, ZOOM_STEP, zoomLevelAfter, ZOOM_HINT_KEY, zoomFactorHint, TRAFFIC_LIGHT_SIZE, scaleTrafficLights, trafficLightPosition };
