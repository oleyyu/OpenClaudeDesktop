// The system file manager's name in the reveal items, by platform: Finder on macOS, File Explorer on Windows, a
// generic file manager elsewhere (c18ab0d94 C / c856385e2 Be, source-session-rail.jsx revealLabel). Every label is
// an English source string looked up by t(); "Show in Finder" / "Show in Explorer" / "Show in file manager" have zh-CN
// entries. Pure over an injectable platform so the Windows copy is testable on a Mac.
import { t } from "../electron/i18n/index.mjs";
import { isMacPlatform } from "./pane-keys-model.mjs";
import { isWindowsHost } from "./host-path-model.mjs";

/** "darwin" | "win32" | "linux" for the running renderer. */
export function hostPlatform(nav = globalThis.navigator) {
  if (isMacPlatform(nav)) return "darwin";
  return isWindowsHost(nav) ? "win32" : "linux";
}

const pick = (platform, mac, windows, other) => (platform === "darwin" ? mac : platform === "win32" ? windows : other);

/** The reveal item: "Show in Finder" / "Show in Explorer" / "Show in file manager". */
export const revealInFileManagerLabel = (platform = hostPlatform()) =>
  pick(platform, t("Show in Finder"), t("Show in Explorer"), t("Show in file manager"));

/** The file manager's own name (the sidebar's Open in list): "Finder" / "File Explorer" / "File manager". */
export const fileManagerName = (platform = hostPlatform()) =>
  pick(platform, t("Finder"), t("File Explorer"), t("File manager"));

/** "Show {file} in Finder" with the platform's file manager. */
export const revealFileLabel = (file, platform = hostPlatform()) =>
  pick(platform, t("Show {file} in Finder", { file }), t("Show {file} in Explorer", { file }), t("Show {file} in file manager", { file }));

/** The approval card's action phrase: "show {file} in Finder". */
export const revealFileAction = (file, platform = hostPlatform()) =>
  pick(platform, t("show {file} in Finder", { file }), t("show {file} in Explorer", { file }), t("show {file} in the file manager", { file }));
