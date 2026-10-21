// The teach overlay's preload (official asar/.vite/build/computerUseTeach.js, EIPC interface
// claude.internal.computerUse.CuTeach): the one global the original page (teach-page.cjs) talks through,
// window["claude.internal.computerUse"].CuTeach, with the original's four methods and four events. Only the top frame
// gets it, as the original checks. The main side (teach.cjs) answers only this overlay's own web contents.
const { contextBridge, ipcRenderer, webFrame } = require("electron");

const CHANNEL = "cu-teach:";
const topFrame = () => ("frameToken" in webFrame && webFrame.top && "frameToken" in webFrame.top
  ? webFrame.top.frameToken === webFrame.frameToken : webFrame.top?.routingId === webFrame.routingId);
const on = (name, pass) => (callback) => {
  const listener = (_event, payload) => (pass ? callback(payload) : callback());
  ipcRenderer.on(CHANNEL + name, listener);
  return () => { ipcRenderer.removeListener(CHANNEL + name, listener); };
};
const CuTeach = {
  next: () => ipcRenderer.invoke(CHANNEL + "next"),
  exit: () => ipcRenderer.invoke(CHANNEL + "exit"),
  mouseEnter: () => ipcRenderer.invoke(CHANNEL + "mouseEnter"),
  mouseLeave: () => ipcRenderer.invoke(CHANNEL + "mouseLeave"),
  onShow: on("show", true),
  onWorking: on("working", false),
  onHide: on("hide", false),
  onReassertHover: on("reassertHover", false),
};
if (topFrame()) contextBridge.exposeInMainWorld("claude.internal.computerUse", { CuTeach });
