// Quick Entry's preload (official asar/.vite/build/quickWindow.js): the two globals the official page script reads —
// window["claude.internal.ui"].QuickWindow { requestDismiss, requestSkooch } and window["claude.hybrid"].DesktopIntl
// { getInitialLocale, onLocaleChanged } — plus quickEntryHost for the host's target button (page.cjs), which the
// official page does not have. Only the top frame gets them, as the original checks. window.cjs answers only this
// window's own web contents.
const { contextBridge, ipcRenderer, webFrame } = require("electron");

const CHANNEL = "quick-entry:";
const topFrame = () => ("frameToken" in webFrame && webFrame.top && "frameToken" in webFrame.top
  ? webFrame.top.frameToken === webFrame.frameToken : webFrame.top?.routingId === webFrame.routingId);
const on = (name, spread) => (callback) => {
  const listener = (_event, payload) => (spread ? callback(payload?.locale, payload?.messages) : callback(payload));
  ipcRenderer.on(CHANNEL + name, listener);
  return () => { ipcRenderer.removeListener(CHANNEL + name, listener); };
};
const QuickWindow = {
  requestDismiss: (text) => ipcRenderer.invoke(CHANNEL + "requestDismiss", text),
  requestSkooch: (width, height) => ipcRenderer.invoke(CHANNEL + "requestSkooch", width, height),
};
const DesktopIntl = {
  getInitialLocale: () => ipcRenderer.invoke(CHANNEL + "getInitialLocale"),
  onLocaleChanged: on("localeChanged", true),
};
const quickEntryHost = {
  getState: () => ipcRenderer.invoke(CHANNEL + "getState"),
  onState: on("state", false),
  openTargetMenu: (anchor) => ipcRenderer.invoke(CHANNEL + "openTargetMenu", anchor),
};
if (topFrame()) {
  contextBridge.exposeInMainWorld("claude.internal.ui", { QuickWindow });
  contextBridge.exposeInMainWorld("claude.hybrid", { DesktopIntl });
  contextBridge.exposeInMainWorld("quickEntryHost", quickEntryHost);
}
