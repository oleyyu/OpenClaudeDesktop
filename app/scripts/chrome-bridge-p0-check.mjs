// Chrome bridge P0 acceptance: Electron main ⇄ native host ⇄ extension, one ping answered by a pong.
//   npm run check:chrome-bridge          (= electron scripts/chrome-bridge-p0-check.mjs)
// Runs in Electron's main process (no window, Dock icon hidden) with the same bridge-client.cjs the app uses. It starts
// a headless Chrome for Testing (Playwright's, or CHROME_PATH) on a throwaway profile with claude-ext/ loaded, registers
// the native host in that profile only (<profile>/NativeMessagingHosts, launcher run by this Electron as node), and
// points the host at a socket folder of its own — the user's Chrome and its settings are never touched.
// Checks: the host's socket appears · get_status reports the extension's hello with the fixed ID · execute_tool ping
// returns pong · an unknown tool comes back as {error: unknown_tool} · the host log shows both directions.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { app } from "electron";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const { installNativeHost } = require("../electron/browser/install.cjs");
const { ChromeBridgeClient, listSockets } = require("../electron/browser/bridge-client.cjs");
const { EXTENSION_ID, HOST_NAME } = require("../electron/browser/protocol.cjs");
const extensionDir = path.resolve(root, "..", "claude-ext");

app.dock?.hide();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const lines = [];
const say = (line) => { lines.push(line); console.log(line); };

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  const builds = fs.existsSync(cache) ? fs.readdirSync(cache).filter((name) => /^chromium-\d+$/.test(name)).sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1])) : [];
  for (const build of builds) {
    const binary = path.join(cache, build, "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing");
    if (fs.existsSync(binary)) return binary;
  }
  throw new Error("No Chrome for Testing found: run `npx playwright install chromium` or set CHROME_PATH (branded Google Chrome ignores --load-extension).");
}

async function until(what, test, timeoutMs = 20_000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const value = await test();
    if (value) return value;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await wait(200);
  }
}

let chrome = null, client = null, exitCode = 1, chromeErr = "";
// Not a top-level await: Electron fires ready only after the ESM entry module has finished evaluating.
app.whenReady().then(run);
const work = fs.mkdtempSync(path.join(os.tmpdir(), "ocb-"));
const profile = path.join(work, "profile");
const sockets = path.join(work, "s");
async function run() {
  try {
    say(`runtime: electron ${process.versions.electron} (main process)`);
    const installed = installNativeHost({ manifestDir: path.join(profile, "NativeMessagingHosts"), launcherPath: path.join(work, "native-host.sh"), socketDir: sockets });
    say(`host manifest: ${installed.manifestPath}`);

    const binary = findChrome();
    say(`chrome: ${binary}`);
    chrome = spawn(binary, [
      "--headless=new", `--user-data-dir=${profile}`, `--load-extension=${extensionDir}`, `--disable-extensions-except=${extensionDir}`,
      "--no-first-run", "--no-default-browser-check", "--disable-features=DisableLoadExtensionCommandLineSwitch", "about:blank",
    ], { stdio: ["ignore", "ignore", "pipe"] });
    chrome.stderr.on("data", (chunk) => { chromeErr = (chromeErr + chunk).slice(-4000); });

    const socket = await until("the native host's socket (Chrome → connectNative → host)", () => listSockets(sockets)[0]);
    say(`host socket: ${socket.file}`);
    client = await ChromeBridgeClient.connect({ file: socket.file, log: (line) => say(`  [electron] ${line}`) });

    const status = await until("the extension's hello", async () => { const value = await client.getStatus(); return value.connected ? value : null; });
    assert.equal(status.extension.extensionId, EXTENSION_ID, "the extension's ID is the fixed one");
    assert.equal(status.host.origin, `chrome-extension://${EXTENSION_ID}/`, "Chrome started the host for the bridge extension");
    say(`status: extension ${status.extension.extensionId} v${status.extension.version}, host pid ${status.host.pid}`);

    const pong = await client.executeTool("ping", {}, { timeoutMs: 5000 });
    assert.equal(pong.pong, true, "ping answered with pong");
    assert.equal(pong.extensionId, EXTENSION_ID);
    say(`ping → ${JSON.stringify(pong)}`);

    await assert.rejects(client.executeTool("no_such_tool", {}, { timeoutMs: 5000 }), (error) => error.code === "unknown_tool");
    say("no_such_tool → error unknown_tool");

    await wait(100);
    const hostLog = fs.readFileSync(path.join(sockets, "host.log"), "utf8").trim().split("\n");
    say(`host log (${sockets}/host.log):`);
    for (const line of hostLog) say(`  ${line}`);
    for (const direction of ["electron→host execute_tool ping", "host→ext execute_tool ping", "ext→host tool_response ok", "host→electron tool_response ok", "ext→host notification hello"]) {
      assert.ok(hostLog.some((line) => line.includes(direction)), `host log shows "${direction}"`);
    }
    say(`P0 PASS: ${HOST_NAME} carried ping → pong between Electron and the extension.`);
    exitCode = 0;
  } catch (error) {
    say(`P0 FAIL: ${error.stack ?? error.message}`);
    const hostLog = path.join(sockets, "host.log");
    if (fs.existsSync(hostLog)) say(`host log:\n${fs.readFileSync(hostLog, "utf8")}`);
    if (chromeErr) say(`chrome stderr (tail):\n${chromeErr}`);
  } finally {
    client?.close();
    if (chrome && chrome.exitCode === null) {
      const exited = new Promise((resolve) => chrome.once("exit", () => resolve(true)));
      chrome.kill("SIGTERM");
      if (!(await Promise.race([exited, wait(3000)]))) { chrome.kill("SIGKILL"); await Promise.race([exited, wait(2000)]); }
    }
    await wait(300);
    if (exitCode === 0) fs.rmSync(work, { recursive: true, force: true });
    else say(`kept ${work} for inspection`);
    app.exit(exitCode);
  }
}
