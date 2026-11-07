// Registers the Chrome bridge's native messaging host with Chrome: a launcher script that runs native-host.cjs with an
// absolute runtime (Chrome starts hosts with a bare environment and only accepts absolute paths), and the host manifest
// <manifestDir>/com.openclaude.chrome_bridge.json naming it and the extension allowed to start it.
// Windows: Chrome finds the manifest through the registry (HKCU\Software\Google\Chrome\NativeMessagingHosts\<name>,
// default value = the manifest's path), not a folder it scans, and runs a .cmd launcher (through cmd.exe).
//
//   node app/electron/browser/install.cjs              install for Google Chrome (this user)
//   node app/electron/browser/install.cjs --uninstall  remove it again
"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { HOST_NAME, EXTENSION_ID } = require("./protocol.cjs");
const { batchPath, batchValue, batchFile } = require("../batch-file.cjs");

const HOST_SCRIPT = path.join(__dirname, "native-host.cjs");

const appDataDir = (env = process.env) => path.join(env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "OpenClaude Desktop");
/**
 * Google Chrome's per-user host folder. A Chrome started with --user-data-dir=X reads X/NativeMessagingHosts instead.
 * Windows: the folder the manifest is kept in (the registry points Chrome at it).
 */
function chromeManifestDir(platform = process.platform) {
  if (platform === "win32") return path.join(appDataDir(), "chrome-bridge");
  return path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome", "NativeMessagingHosts");
}
function defaultLauncherPath(platform = process.platform) {
  if (platform === "win32") return path.join(appDataDir(), "chrome-bridge", "native-host.cmd");
  return path.join(os.homedir(), "Library", "Application Support", "OpenClaude Desktop", "chrome-bridge", "native-host.sh");
}
const quote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
// A value in a .cmd line: double-quoted, with % doubled so cmd doesn't expand it. A non-ASCII path (the app unpacked
// under C:\Users\张三\…) goes through %LOCALAPPDATA%/%APPDATA%/%USERPROFILE% or chcp 65001: cmd.exe reads the file in the
// console code page, not UTF-8 (batch-file.cjs, docs/windows-bugs.md R10).
const cmdQuote = (value, env) => batchPath(value, env);
const REGISTRY_KEY = `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`;
const reg = (args) => execFileSync("reg", args, { windowsHide: true, stdio: "ignore" });

/**
 * @param {object} [options]
 * @param {string} [options.manifestDir]  where Chrome looks for host manifests (default: Google Chrome's)
 * @param {string} [options.launcherPath] the launcher script to write (absolute)
 * @param {string} [options.runtime]      the node to run the host with (default: this process; Electron runs as node)
 * @param {string} [options.socketDir]    bake OPENCLAUDE_CHROME_BRIDGE_DIR into the launcher (the P0 check's own folder)
 * @param {string[]} [options.extensionIds]
 */
function installNativeHost({ platform = process.platform, manifestDir = chromeManifestDir(platform), launcherPath = defaultLauncherPath(platform), runtime = process.execPath, socketDir = null, extensionIds = [EXTENSION_ID], registry = reg, env = process.env, hostScript = HOST_SCRIPT } = {}) {
  const windows = platform === "win32";
  const absolute = windows ? path.win32.isAbsolute : path.isAbsolute;
  if (!absolute(launcherPath) || !absolute(runtime) || !absolute(manifestDir)) throw new Error("Chrome needs absolute paths for its native host.");
  const electron = process.versions.electron && runtime === process.execPath;
  let lines;
  if (windows) {
    // Chrome runs it as `cmd /c <launcher> chrome-extension://…/ --parent-window=…`; setlocal keeps the variables to it.
    lines = ["@echo off", "setlocal"];
    if (electron) lines.push("set ELECTRON_RUN_AS_NODE=1");
    if (socketDir) lines.push(`set "OPENCLAUDE_CHROME_BRIDGE_DIR=${batchValue(socketDir, env)}"`);
    lines.push(`${cmdQuote(runtime, env)} ${cmdQuote(hostScript, env)} %*`);
  } else {
    lines = ["#!/bin/sh"];
    if (electron) lines.push("export ELECTRON_RUN_AS_NODE=1");
    if (socketDir) lines.push(`export OPENCLAUDE_CHROME_BRIDGE_DIR=${quote(socketDir)}`);
    lines.push(`exec ${quote(runtime)} ${quote(hostScript)} "$@"`, "");
  }
  fs.mkdirSync(path.dirname(launcherPath), { recursive: true });
  fs.writeFileSync(launcherPath, windows ? batchFile(lines) : lines.join("\n"), { mode: 0o755 });
  fs.chmodSync(launcherPath, 0o755);
  const manifest = {
    name: HOST_NAME,
    description: "OpenClaude Desktop Chrome bridge",
    path: launcherPath,
    type: "stdio",
    allowed_origins: extensionIds.map((id) => `chrome-extension://${id}/`),
  };
  fs.mkdirSync(manifestDir, { recursive: true });
  const manifestPath = path.join(manifestDir, `${HOST_NAME}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  // HKCU only (this user, no elevation); a failure is the install's failure, since Chrome can't find the host without it.
  if (windows) registry(["add", REGISTRY_KEY, "/ve", "/t", "REG_SZ", "/d", manifestPath, "/f"]);
  return { manifestPath, launcherPath, manifest, ...(windows ? { registryKey: REGISTRY_KEY } : {}) };
}

function uninstallNativeHost({ platform = process.platform, manifestDir = chromeManifestDir(platform), launcherPath = defaultLauncherPath(platform), registry = reg } = {}) {
  for (const file of [path.join(manifestDir, `${HOST_NAME}.json`), launcherPath]) { try { fs.unlinkSync(file); } catch {} }
  if (platform === "win32") { try { registry(["delete", REGISTRY_KEY, "/f"]); } catch {} }
}

module.exports = { installNativeHost, uninstallNativeHost, chromeManifestDir, defaultLauncherPath, HOST_SCRIPT, REGISTRY_KEY };

if (require.main === module) {
  if (process.argv.includes("--uninstall")) {
    uninstallNativeHost();
    console.log(`Removed ${HOST_NAME} from ${chromeManifestDir()}.`);
  } else {
    const { manifestPath, launcherPath } = installNativeHost();
    console.log(`Installed ${HOST_NAME}:\n  manifest  ${manifestPath}\n  launcher  ${launcherPath}\n  extension chrome-extension://${EXTENSION_ID}/`);
  }
}
