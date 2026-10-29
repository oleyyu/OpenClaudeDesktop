// Host services of the 3.6556.2 Cowork progress panel (src/generated/cowork-progress, scripts/extract-cowork-progress.mjs;
// w10-curchat-progress-gen, w13-coworkui-outputs). Each export replaces one original declaration the generator pins by its
// features. OpenClaude has no claude.ai account, files API or Cowork VM bridge (E59): the file system bridge goes to this
// host's own file IPC (window.desktop.call, as source-deliverables.jsx does); account-bound services answer the
// official "unavailable" branch.
import { createElement as h, Fragment, lazy, Suspense, useEffect, useState } from "react";
import { CdsContextMenu } from "./generated/view-tabs/index.js";
import { FormattedMessage } from "./source-routines-shared-adapters.jsx";

// shared-156 iw (the connector lookup over the claude.ai MCP store; a row's MCP tool display name). cowork-scheduled's
// adapter for the same binding (an empty store, so names fall back to the raw tool name): one implementation.
export { useConnectorLookup } from "./source-routine-cowork-adapters.jsx";

// shared-78 gK (export fs): whether the panel sits in the desktop frame (dramatic_shrimp and the frame store). This host
// is the desktop frame, so the section takes the official dframe-card surface (the 2.31226.0 slice's useDesktopFrame).
export const useDesktopFrame = () => true;

// c4038fd41 L: a todo row's "Comment on this item" handler (analytics activity_panel.feedback, then a todo_item.txt
// attachment in the chat composer's pending store). Cowork todos have no chat attachment store here and the host renders
// the official disableCommentAttachment branch (no comment button), so there is no handler.
export const useTodoCommentAttachment = () => undefined;

// vendor-intl nn (react-intl defineMessage): the identity.
export const defineMessage = (message) => message;

const desktopCall = (action, params) => {
  const call = typeof window === "undefined" ? undefined : window.desktop?.call;
  return typeof call === "function" ? Promise.resolve(call(action, params)) : Promise.reject(new Error("File system is not available"));
};
const parentOf = (filePath) => {
  const trimmed = String(filePath).replace(/[\\/]+$/, "");
  const at = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return at > 0 ? trimmed.slice(0, at) : trimmed;
};
const joinPath = (folder, name) => `${String(folder).replace(/[\\/]+$/, "")}/${name}`;

// shared-0 oC (window["claude.web"].FileSystem, the desktop file system bridge). The methods this graph calls:
//   listFilesInFolder(sessionId, folder) — the file browser (Bb/Vb zb) and its tree's children: the host's Files pane
//     listing (main "files", scoped to that folder), as { name, path (absolute), isDirectory } entries.
//   showInFolder(path) — a folder group's / file row's Finder button: the host's session-file reveal (main
//     "file:reveal-session", rooted at the path's parent).
//   readLocalFile(sessionId, encodedPath) / writeLocalFile(sessionId, encodedPath, content) — the folder instructions
//     editor (kT → LS: PS reads `i?.content ?? ""`, FS needs a truthy answer): main "cowork-claude-md", which only takes a
//     CLAUDE.md in the session's own folders (electron/cowork-runtime/claude-md.mjs; w13-close-cowork-ui, E67). With
//     enableAdditionalDirectoriesClaudeMd on (COWORK_CLAUDE_MD_CONFIG) the official `_t?.writeLocalFile` row shows.
export const FileSystem = Object.freeze({
  listFilesInFolder: async (_sessionId, folder) => {
    const entries = await desktopCall("files", { cwd: folder, relative: "" });
    return Array.isArray(entries)
      ? entries.map((entry) => ({ name: entry.name, path: joinPath(folder, entry.name), isDirectory: entry.directory === true }))
      : [];
  },
  showInFolder: (filePath) => {
    desktopCall("file:reveal-session", { cwd: parentOf(filePath), path: filePath }).catch(() => {});
  },
  readLocalFile: (sessionId, encodedPath) => desktopCall("cowork-claude-md", { threadId: sessionId, path: decodeURIComponent(encodedPath) }),
  writeLocalFile: async (sessionId, encodedPath, content) =>
    (await desktopCall("cowork-claude-md", { threadId: sessionId, path: decodeURIComponent(encodedPath), content })) === true,
});

// c21f11e6d by (the working-documents section over the Cowork VM scratch root funnel, c1373296b Xt): the original
// returns null while the funnel is null; this host has no scratch-root host (cwui-17), so it is always null.
export const CoworkWorkingDocuments = () => null;

// c21f11e6d ox (a non-file output row: artifacts and connector items opening cc1aae219's drawers) and Sx (the
// thumbnail frame around kept non-file outputs, over the claude.ai artifact metadata query). Local Cowork sessions only
// produce files (session-service.mjs ./outputs), so nonFileOutputs is always empty: no row, and the frame passes its
// children through unchanged.
export const CoworkNonFileOutputRow = () => null;
export const CoworkNonFileOutputsFrame = ({ children }) => children ?? null;

// c41de644f i / ca2ef848d e4 / O4: the lazy entries (skill, MCP server, web search activity detail) a row preloads on
// hover or when idle. The detail chunks are not sliced; preloading is a no-op and a row click goes to onActivityClick.
export const unavailableActivityDetail = Object.freeze({ preload() {}, enqueueIdle() {} });
// c46809900 m: preload the file pane's source view while a previewable row is shown: no-op (the host files pane is eager).
export const usePreloadFileSourceView = () => {};

// ca2ef848d o1 (the Office add-in bridge: connected Word / Excel / PowerPoint files). No add-in bridge here: the
// feature reads off, so c21f11e6d Eb renders null (cwui-17).
const NO_OFFICE_FILES = Object.freeze({ isFeatureEnabled: false, connectedFiles: Object.freeze([]), isInitialized: true });
export const useConnectedOfficeFiles = () => NO_OFFICE_FILES;

// shared-6 lb / db / tS: download one output (claude.ai files API or a served URL), download a batch through the
// desktop's writeFileDownload, and the newest file version uuid of a conversation. All are account-bound: c21f11e6d Lb
// answers no organization (routines-shared useCurrentAccount) and returns before downloading; db's desktop branch is
// absent (`n && Xt?.writeFileDownload ? r : null`), and there are no file versions.
export const useDownloadOutput = () => async () => {};
export const useDownloadOutputs = () => null;
export const newestOutputFileUuid = () => undefined;

// c45a8b2e8 E: a file browser entry's context menu items — Copy path / separator / Open / Show in Finder — over the
// host's file IPC (main "open-tool-file" / "file:reveal-session"), with the original's labels.
export function CoworkFileEntryMenuItems({ entry, sessionId }) {
  const path = entry?.path ?? "";
  const copy = () => { navigator.clipboard?.writeText?.(path)?.catch?.(() => {}); };
  const open = () => { desktopCall("open-tool-file", { sessionId, path }).catch(() => {}); };
  const reveal = () => { desktopCall("file:reveal-session", { cwd: parentOf(path), path }).catch(() => {}); };
  return h(Fragment, null,
    h(CdsContextMenu.Item, { onClick: copy }, h(FormattedMessage, { defaultMessage: "Copy path", id: "Qask1i8TzH" })),
    h(CdsContextMenu.Separator, null),
    entry?.isDirectory ? null : h(CdsContextMenu.Item, { onClick: open }, h(FormattedMessage, { defaultMessage: "Open", id: "JfG49wNHKP" })),
    h(CdsContextMenu.Item, { onClick: reveal }, h(FormattedMessage, { defaultMessage: "Show in Finder", id: "LVY6c4L1SF" })));
}

// c45a8b2e8 k: the file browser's preview of the selected file (the original reads it through the Cowork file APIs).
// The host reads it with its Files pane read (main "file", rooted at the file's parent) and shows it in the host file
// viewer (loaded lazily, so this module stays out of the chat graph).
const HostFileViewer = lazy(() => import("./source-file-viewer.jsx").then((m) => ({ default: m.SourceFileViewer })));
export function CoworkFilePreview({ filePath }) {
  const [file, setFile] = useState(null);
  useEffect(() => {
    let live = true;
    const name = String(filePath).split(/[/\\]/).pop();
    desktopCall("file", { cwd: parentOf(filePath), relative: name })
      .then((result) => { if (live) setFile(result && typeof result === "object" ? { ...result, path: name } : { path: name, unavailable: "missing" }); })
      .catch(() => { if (live) setFile({ path: name, unavailable: "missing" }); });
    return () => { live = false; };
  }, [filePath]);
  if (!file) return null;
  return h(Suspense, { fallback: null }, h(HostFileViewer, { file, presentation: "reading", displayPath: file.path, fullPath: filePath, showHeader: false }));
}
