// V3-w12b-settings-dialogs (S3): "Open in {browserName}" as 3.6556.2 c8ae173c6 names the default browser
// (`named:{defaultMessage:"Open in {browserName}",id:"1WdokkZgcZ"},generic:{defaultMessage:"Open in default browser",
// id:"1B2oJwBn8a"}`). One module-level store (`s=null,c=!1,l=n(()=>(window.addEventListener("focus",u),()=>
// window.removeEventListener("focus",u)))`): while anything listens, every window focus asks the desktop bridge again
// (`u`: `r?.getDefaultBrowserName?.()`, one request at a time, a falsy answer is null and only a change notifies).
// The bridge is window.desktop.getDefaultBrowserName (main: electron/default-browser-name.cjs, Dtr); without it the
// name stays null and every label is the generic one, as c8ae173c6 does when DesktopInfo lacks the method.
// Pure (no React): src/use-default-browser-label.mjs is the hook (f/p), transcript-context-menu-model.mjs reads the
// snapshot when it builds a menu.
import { t } from "../electron/i18n/index.mjs";

let name = null; // s
let pending = false; // c
const listeners = new Set();
const desktopBridge = () => (typeof window === "undefined" ? undefined : window.desktop);

/** u: ask the bridge once (no overlap); a resolved name that differs from the last one notifies the listeners. */
export function refreshDefaultBrowserName(bridge = desktopBridge()) {
  if (pending) return;
  const request = bridge?.getDefaultBrowserName?.();
  if (!request) return;
  pending = true;
  Promise.resolve(request).then((value) => {
    const next = value || null;
    if (next !== name) { name = next; for (const listener of [...listeners]) listener(); }
  }, () => undefined).finally(() => { pending = false; });
}

const onFocus = () => refreshDefaultBrowserName();
/** l.subscribe: the first listener adds the window focus refresh, the last one removes it. */
export function subscribeDefaultBrowserName(listener) {
  if (listeners.size === 0 && typeof window !== "undefined") window.addEventListener("focus", onFocus);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("focus", onFocus);
  };
}

/** d: the current name (null until the bridge answers with one). */
export const defaultBrowserName = () => name;

/** p: the named label, or the generic one while there is no name. */
export function browserLabel(browserName = name) {
  return browserName === null || browserName === undefined ? t("Open in default browser") : t("Open in {browserName}", { browserName });
}

/** Tests only: forget the name and any request in flight. */
export function resetDefaultBrowserName() { name = null; pending = false; }
