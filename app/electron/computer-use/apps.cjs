// request_access names apps the way people do ("Finder", "TextEdit") or by bundle id ("com.apple.finder"); grants are
// by bundle id (grants.cjs). This finds each one's installed bundle without launching anything: a name in the usual
// application folders first, then Spotlight (mdfind) by display name; a bundle id through Spotlight. The bundle id
// comes from the bundle's own Info.plist (plutil). Not found is `installed: false`, which the access card shows as
// "(not installed)" and request_access reports as denied.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");

const FOLDERS = ["/Applications", "/Applications/Utilities", "/System/Applications", "/System/Applications/Utilities",
  "/System/Library/CoreServices"];
// The card draws icons at 20 px (×1.15); 64 px stays sharp on a 2× display.
const ICON_PX = 64;
const BUNDLE_ID = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
// What may go inside a Spotlight query's quotes: no quote, backslash, wildcard or line break.
const QUERYABLE = /^[^"'\\*?\r\n\0]{1,120}$/;

const run = (file, args) => new Promise((resolve) => {
  execFile(file, args, { timeout: 5000, maxBuffer: 1 << 20 }, (error, stdout) => resolve(error ? "" : String(stdout)));
});

/**
 * @param {{exec?: (file: string, args: string[]) => Promise<string>, readdir?: (dir: string) => string[], home?: string}} [options]
 *   exec / readdir: tests only.
 */
function createAppResolver({ exec = run, readdir = (dir) => fs.readdirSync(dir), home = os.homedir() } = {}) {
  const folders = [...FOLDERS, path.join(home, "Applications")];
  const bundleIdOf = async (appPath) =>
    (await exec("/usr/bin/plutil", ["-extract", "CFBundleIdentifier", "raw", "-o", "-", path.join(appPath, "Contents", "Info.plist")])).trim() || null;
  const appPaths = (out) => out.split("\n").map((line) => line.trim()).filter((line) => line.endsWith(".app"));
  // An app in the usual folders wins over a copy elsewhere (a backup, a DMG, Xcode's simulators).
  const preferred = (paths) => paths.find((file) => folders.includes(path.dirname(file))) ?? paths[0] ?? null;

  async function byName(name) {
    const want = `${name}.app`.toLowerCase();
    for (const folder of folders) {
      let entries;
      try { entries = readdir(folder); } catch { continue; }
      const hit = entries.find((entry) => entry.toLowerCase() === want);
      if (hit) return path.join(folder, hit);
    }
    if (!QUERYABLE.test(name)) return null;
    return preferred(appPaths(await exec("/usr/bin/mdfind",
      [`kMDItemContentType == "com.apple.application-bundle" && (kMDItemDisplayName == "${name}"c || kMDItemDisplayName == "${name}.app"c)`])));
  }
  const byBundleId = async (bundleId) => preferred(appPaths(await exec("/usr/bin/mdfind", [`kMDItemCFBundleIdentifier == "${bundleId}"`])));

  /** One requested app → {requested, bundleId, displayName, path, installed}. */
  async function resolve(requested) {
    const name = typeof requested === "string" ? requested.trim().replace(/\.app$/i, "") : "";
    const missing = { requested, bundleId: null, displayName: name || String(requested), path: null, installed: false };
    if (!name) return missing;
    // "com.apple.finder" is a bundle id; "Visual Studio Code" or "Notes" is a name.
    const asId = BUNDLE_ID.test(name) && name.includes(".");
    const appPath = asId ? await byBundleId(name) : await byName(name);
    if (!appPath) return asId ? { ...missing, bundleId: name } : missing;
    const bundleId = await bundleIdOf(appPath);
    if (!bundleId) return missing;
    return { requested, bundleId, displayName: path.basename(appPath, ".app"), path: appPath, installed: true };
  }
  return { resolve, resolveAll: (names) => Promise.all(names.map(resolve)) };
}

/**
 * The access card's icon for an app bundle, as a PNG data URL, or undefined. Quick Look's thumbnail of the bundle, not
 * app.getFileIcon: on macOS 27 getFileIcon answers the generic app-icon template (the grid) for every app — Finder,
 * TextEdit and VS Code alike — so the card would show a blank icon. Without a thumbnail the card draws its own
 * placeholder rather than that template.
 * @param {string} appPath
 * @param {{createThumbnailFromPath: (path: string, size: {width: number, height: number}) => Promise<object>}} nativeImage  Electron's
 */
async function appIconDataUrl(appPath, nativeImage) {
  if (typeof appPath !== "string" || !appPath.endsWith(".app")) return undefined;
  try {
    const image = await nativeImage.createThumbnailFromPath(appPath, { width: ICON_PX, height: ICON_PX });
    return image && !image.isEmpty() ? image.toDataURL() : undefined;
  } catch { return undefined; }
}

module.exports = { createAppResolver, appIconDataUrl };
