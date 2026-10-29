const { contextBridge, ipcRenderer, webUtils } = require("electron");
// First-paint appearance ({theme, mode}) read once, synchronously, before the
// renderer's first frame; main.cjs answers from the saved preference and
// nativeTheme. A failure leaves the renderer on its media-query fallback.
let appearance = null;
try { appearance = ipcRenderer.sendSync("desktop:appearance") ?? null; } catch {}
// Electron prefixes every rejection with its transport ("Error invoking remote method 'desktop:call': Error: …"):
// unwrapped here, once, so no component ever shows it (src/action-error-model.mjs cleanErrorReason, the same pattern).
const IPC_PREFIX = /^Error invoking remote method '[^']+': (?:Error: )?/gm;
const unwrapped = (promise) => promise.catch((error) => {
  const message = String(error?.message ?? error ?? "").replace(IPC_PREFIX, "");
  throw new Error(message);
});
contextBridge.exposeInMainWorld("desktop", {
  call: (action, params) => unwrapped(ipcRenderer.invoke("desktop:call", action, params)),
  // w12c-wiring (w12b-settings-dialogs S3): the default browser's name (main.cjs "default-browser-name", Dtr), which
  // src/default-browser-name.mjs asks for on mount and window focus (c8ae173c6 `r?.getDefaultBrowserName?.()`).
  getDefaultBrowserName: () => unwrapped(ipcRenderer.invoke("desktop:call", "default-browser-name")),
  appearance,
  setFileEditDirty: paths => ipcRenderer.sendSync("desktop:file-edit-dirty", paths),
  onFileAutosaveFlush: handler => {
    const listener = (_event, token) => { Promise.resolve().then(handler).finally(() => ipcRenderer.send('desktop:file-autosave-flushed', token)).catch(() => {}); };
    ipcRenderer.on('desktop:file-autosave-flush', listener);
    return () => ipcRenderer.removeListener('desktop:file-autosave-flush', listener);
  },
  // Finder drops arrive as File objects; only the main process may stat them. A path read here belongs to a File the
  // user gave the page, so main records it as user-chosen (convert-document reads only those; w13-chatfn-attachments).
  pathForFile: (file) => {
    let filePath = "";
    try { filePath = webUtils.getPathForFile(file) || ""; } catch { return ""; }
    if (filePath) ipcRenderer.send("desktop:attachment-path", filePath);
    return filePath;
  },
  onEvent: (handler) => {
    const listener = (_e, event) => handler(event);
    ipcRenderer.on("desktop:event", listener);
    return () => ipcRenderer.removeListener("desktop:event", listener);
  },
  // Built-in terminal pane (terminal-service.cjs): requests, fire-and-forget keystrokes and the output/state events,
  // on their own channels so terminal output never passes through the app's desktop:event reducer.
  terminal: {
    call: (op, params) => unwrapped(ipcRenderer.invoke("terminal:call", String(op), params ?? {})),
    write: (id, data) => { if (typeof id === "string" && typeof data === "string") ipcRenderer.send("terminal:write", id, data); },
    onEvent: (handler) => {
      const listener = (_e, event) => handler(event);
      ipcRenderer.on("terminal:event", listener);
      return () => ipcRenderer.removeListener("terminal:event", listener);
    },
  },
});
