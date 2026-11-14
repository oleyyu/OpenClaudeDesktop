// cds-core wave 8 (cds-wave8/design/plan.json classification b, W8-M2): shared-0 uO, the official desktop window-state
// bridge `var uO=globalThis["claude.web"]?.WindowState;` (official preload mainView.js exposes it over ipcRenderer). The host
// has no claude.web global; its one answer is frame-sidebar-host.jsx's WindowState (main.jsx fullScreen / zoomFactor), which
// that module installs here at load, next to installFrameSidebarHost. cds-core binds uO to `hostWindowState` through
// cds-core-adapter.mjs (pins.localAdapterBoundaries; this module must stay import-free). The getters are the frame-sidebar
// adapter's cap() pattern: a member read before the host installed its answer throws instead of inventing one.
let bridge = null;
export function installHostWindowState(answer) { bridge = answer; }
function cap(name) {
  if (!bridge || !Object.hasOwn(bridge, name)) throw Error(`host WindowState ${name} is not provided (frame-sidebar-host.jsx installs it)`);
  return bridge[name];
}
export const hostWindowState = Object.freeze({
  get getFullscreen() { return cap("getFullscreen"); },
  get onFullscreenChanged() { return cap("onFullscreenChanged"); },
  get getZoomFactor() { return cap("getZoomFactor"); },
  get onZoomFactorChanged() { return cap("onZoomFactorChanged"); },
});
