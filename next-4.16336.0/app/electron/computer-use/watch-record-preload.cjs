// Watch-record's preload (official asar/.vite/build/watchRecordChooser.js and computerUseWatchRecord.js, which are the
// same file: EIPC interfaces claude.internal.computerUse.CuWatchRecordChooser and .CuWatchRecordPill). The original pages
// (watch-record-pages.cjs) talk to the main process only through these, with the original's methods and events. Only
// the top frame gets them, as the original checks. The main side (watch-record.cjs) answers only its own window's page.
const { contextBridge, ipcRenderer, webFrame } = require("electron");

const topFrame = () => ("frameToken" in webFrame && webFrame.top && "frameToken" in webFrame.top
  ? webFrame.top.frameToken === webFrame.frameToken : webFrame.top?.routingId === webFrame.routingId);
// An event: the listener gets the payload's arguments (micState carries two), and unsubscribes with the returned function.
const on = (channel) => (callback) => {
  const listener = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, listener);
  return () => { ipcRenderer.removeListener(channel, listener); };
};
const CHOOSER = "cu-watch-record-chooser:";
const PILL = "cu-watch-record-pill:";
const CuWatchRecordChooser = {
  choose: (choice) => ipcRenderer.invoke(CHOOSER + "choose", choice),
  setMicPreview: (uid) => ipcRenderer.invoke(CHOOSER + "setMicPreview", uid),
  stopMicPreview: () => ipcRenderer.invoke(CHOOSER + "stopMicPreview"),
  reportContentShortfall: (px) => ipcRenderer.invoke(CHOOSER + "reportContentShortfall", px),
  onMicState: on(CHOOSER + "micState"),
  onInputDevices: on(CHOOSER + "inputDevices"),
};
const CuWatchRecordPill = {
  done: () => ipcRenderer.invoke(PILL + "done"),
  discard: () => ipcRenderer.invoke(PILL + "discard"),
  toggleMic: () => ipcRenderer.invoke(PILL + "toggleMic"),
  reportProcessingWidth: (px) => ipcRenderer.invoke(PILL + "reportProcessingWidth", px),
  onMicState: on(PILL + "micState"),
  onProcessing: on(PILL + "processing"),
  onTimeWarning: on(PILL + "timeWarning"),
  onMicError: on(PILL + "micError"),
};
if (topFrame()) contextBridge.exposeInMainWorld("claude.internal.computerUse", { CuWatchRecordChooser, CuWatchRecordPill });
