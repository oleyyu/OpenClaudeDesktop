// The Accessibility calls without synthetic input behind app_focus, app_menu and list_apps, in the native module
// (computer_use.node, MenuBar.swift; official: menu(bundleId, {mode, path}) is a native export, spec §1.6.4). They ran
// in a separate helper process (helpers/cu-ax) until 2026-10-21; this keeps that helper's call names and results so the
// service and list_apps did not change:
//
//   probe                              → native axProbe      {axTrusted}
//   focus     {bundleId, windowId?}    → native focusWindow
//   menu      {bundleId, path}         → native menu {mode: "press"}
//   menuList  {bundleId, path}         → native menu {mode: "list"}
//   menuClose {bundleId}               → native menu {mode: "close"}
//   apps      {folders}                → native listApps
//
// Errors are native.cjs's coded errors (details kept); a missing module is native_unavailable, an app that stops
// answering is helper_timeout (the native 8 s budget).
const { createNative, coded } = require("./native.cjs");

const ROUTES = Object.freeze({
  probe: () => ["axProbe", {}],
  focus: ({ bundleId, windowId }) => ["focusWindow", { bundleId, ...(windowId !== undefined ? { windowId } : {}) }],
  menu: ({ bundleId, path }) => ["menu", { bundleId, mode: "press", path }],
  menuList: ({ bundleId, path = [] }) => ["menu", { bundleId, mode: "list", path }],
  menuClose: ({ bundleId }) => ["menu", { bundleId, mode: "close" }],
  apps: ({ folders = [] }) => ["listApps", { folders }],
});

/** @param {{native?: {call(method: string, params?: object): Promise<any>, available?: () => boolean}}} [options]
 *  native: main.cjs passes its one loaded module (native.cjs createNative()); tests pass a fake. */
function createAxHelper({ native = createNative() } = {}) {
  return {
    available: () => (typeof native.available === "function" ? native.available() : true),
    async call(method, params = {}) {
      const route = Object.hasOwn(ROUTES, method) ? ROUTES[method] : null;
      if (!route) throw coded("unknown_method", `Unknown method ${method}.`);
      const [nativeMethod, nativeParams] = route(params ?? {});
      return native.call(nativeMethod, nativeParams);
    },
  };
}

module.exports = { createAxHelper, ROUTES };
