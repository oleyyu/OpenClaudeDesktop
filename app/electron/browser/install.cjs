// Registers the Chrome bridge's native messaging host with Chrome: a launcher script that runs native-host.cjs with an
// absolute runtime (Chrome starts hosts with a bare environment and only accepts absolute paths), and the host manifest
// <manifestDir>/com.openclaude.chrome_bridge.json naming it and the extension allowed to start it.
//
//   node app/electron/browser/install.cjs              install for Google Chrome (this user)
//   node app/electron/browser/install.cjs --uninstall  remove it again
"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { HOST_NAME, EXTENSION_ID } = require("./protocol.cjs");

const HOST_SCRIPT = path.join(__dirname, "native-host.cjs");

/** Google Chrome's per-user host folder. A Chrome started with --user-data-dir=X reads X/NativeMessagingHosts instead. */
function chromeManifestDir() {
  return path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome", "NativeMessagingHosts");
}
function defaultLauncherPath() {
  return path.join(os.homedir(), "Library", "Application Support", "OpenClaude Desktop", "chrome-bridge", "native-host.sh");
}
const quote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;

/**
 * @param {object} [options]
 * @param {string} [options.manifestDir]  where Chrome looks for host manifests (default: Google Chrome's)
 * @param {string} [options.launcherPath] the launcher script to write (absolute)
 * @param {string} [options.runtime]      the node to run the host with (default: this process; Electron runs as node)
 * @param {string} [options.socketDir]    bake OPENCLAUDE_CHROME_BRIDGE_DIR into the launcher (the P0 check's own folder)
 * @param {string[]} [options.extensionIds]
 */
function installNativeHost({ manifestDir = chromeManifestDir(), launcherPath = defaultLauncherPath(), runtime = process.execPath, socketDir = null, extensionIds = [EXTENSION_ID] } = {}) {
  if (!path.isAbsolute(launcherPath) || !path.isAbsolute(runtime) || !path.isAbsolute(manifestDir)) throw new Error("Chrome needs absolute paths for its native host.");
  const lines = ["#!/bin/sh"];
  if (process.versions.electron && runtime === process.execPath) lines.push("export ELECTRON_RUN_AS_NODE=1");
  if (socketDir) lines.push(`export OPENCLAUDE_CHROME_BRIDGE_DIR=${quote(socketDir)}`);
  lines.push(`exec ${quote(runtime)} ${quote(HOST_SCRIPT)} "$@"`, "");
  fs.mkdirSync(path.dirname(launcherPath), { recursive: true });
  fs.writeFileSync(launcherPath, lines.join("\n"), { mode: 0o755 });
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
  return { manifestPath, launcherPath, manifest };
}

function uninstallNativeHost({ manifestDir = chromeManifestDir(), launcherPath = defaultLauncherPath() } = {}) {
  for (const file of [path.join(manifestDir, `${HOST_NAME}.json`), launcherPath]) { try { fs.unlinkSync(file); } catch {} }
}

module.exports = { installNativeHost, uninstallNativeHost, chromeManifestDir, defaultLauncherPath, HOST_SCRIPT };

if (require.main === module) {
  if (process.argv.includes("--uninstall")) {
    uninstallNativeHost();
    console.log(`Removed ${HOST_NAME} from ${chromeManifestDir()}.`);
  } else {
    const { manifestPath, launcherPath } = installNativeHost();
    console.log(`Installed ${HOST_NAME}:\n  manifest  ${manifestPath}\n  launcher  ${launcherPath}\n  extension chrome-extension://${EXTENSION_ID}/`);
  }
}
