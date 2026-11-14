import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { once } from "node:events";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Exercises the real Electron before-quit integration. The only server used is
// an isolated fixture which deliberately ignores SIGTERM and stdin closure.
const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(root, "../analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const exec = promisify(execFile), checks = [], scenarios = [];
const alive = (pid) => {
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error.code === "ESRCH") return false; throw error; }
};
const readLines = async (filename) => {
  try { return (await fs.readFile(filename, "utf8")).split("\n").filter(Boolean).map(JSON.parse); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
};
async function bound(promise, timeout, message) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeout);
    })]);
  } finally { clearTimeout(timer); }
}
async function cleanupFixture(pid, binary) {
  if (!alive(pid)) return;
  // A failed test must not leave its intentionally stubborn fixture behind.
  // Validate the unique executable path as well as the recorded PID first.
  const { stdout } = await exec("/bin/ps", ["-p", String(pid), "-o", "command="], { timeout: 1000 });
  if (stdout.includes(binary)) process.kill(pid, "SIGKILL");
}

async function scenario(kind, reconnects) {
  const profile = await fs.mkdtemp(path.join(evidence, `shutdown-${kind}-profile-`));
  const workspace = path.join(profile, "workspace");
  await fs.mkdir(workspace);
  const log = path.join(profile, "fixture-processes.jsonl");
  const binary = path.join(profile, "stubborn-codex.cjs");
  await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
    cwd: workspace, theme: "light", mode: "code", model: "shutdown-fixture", threadIds: [],
  }));
  await fs.writeFile(binary, `#!/usr/bin/env node
const fs=require('node:fs'),readline=require('node:readline');
const record=event=>fs.appendFileSync(${JSON.stringify(log)},JSON.stringify({event,pid:process.pid,ppid:process.ppid,at:Date.now()})+'\\n');
record('start');
process.on('SIGTERM',()=>record('SIGTERM'));
setInterval(()=>{},1000);
const send=message=>process.stdout.write(JSON.stringify(message)+'\\n');
readline.createInterface({input:process.stdin}).on('line',line=>{
  const message=JSON.parse(line);
  if(message.id===undefined)return;
  let result;
  if(message.method==='initialize')result={userAgent:'shutdown-fixture'};
  else if(message.method==='account/read')result={account:{type:'chatgpt'},requiresOpenaiAuth:true};
  else if(message.method==='model/list')result={data:[{id:'shutdown-fixture',model:'shutdown-fixture',displayName:'Shutdown fixture',isDefault:true,defaultReasoningEffort:'low',supportedReasoningEfforts:[{reasoningEffort:'low'}]}],nextCursor:null};
  else if(message.method==='thread/list')result={data:[],nextCursor:null};
  else{send({id:message.id,error:{code:-32601,message:'Unsupported shutdown fixture request'}});return;}
  send({id:message.id,result});
});
`, { mode: 0o755 });
  const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: binary };
  delete env.ELECTRON_RUN_AS_NODE;
  let app, host, page, pids = [];
  const errors = [];
  try {
    app = await electron.launch({
      executablePath: process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"),
      args: [root], env,
    });
    host = app.process();
    page = await app.firstWindow();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Shutdown fixture" }).waitFor();
    for (let index = 0; index < reconnects; index++) {
      const result = await page.evaluate(() => window.desktop.call("reconnect"));
      assert.equal(result.connected, true);
    }
    const starts = (await readLines(log)).filter((record) => record.event === "start");
    pids = starts.map((record) => record.pid);
    assert.equal(pids.length, reconnects + 1);
    assert.equal(new Set(pids).size, pids.length);
    assert.ok(starts.every((record) => record.ppid === host.pid), "Every fixture is a direct child of this Electron host");
    const aliveBeforeQuit = pids.filter(alive);
    assert.ok(aliveBeforeQuit.includes(pids.at(-1)));
    if (reconnects) assert.ok(aliveBeforeQuit.length >= 2, "At least one replaced client is still in the SIGTERM grace period");
    const hostExited = once(host, "exit");
    let windowClose = null;
    if (kind === "window-close") {
      // Fidelity F04 (on purpose): closing the main window hides it and the app keeps running
      // (index.chunk-ChZ67Jhw.js m.on("close") + a no-op window-all-closed); only a quit ends the host.
      let exited = false;
      host.once("exit", () => { exited = true; });
      await app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].close(); });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      windowClose = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => ({ destroyed: w.isDestroyed(), visible: w.isVisible() })));
      assert.equal(exited, false, "closing the main window does not quit");
      assert.deepEqual(windowClose, [{ destroyed: false, visible: false }], "the closed main window is hidden, not destroyed");
      assert.ok(alive(pids.at(-1)), "the core keeps running behind the hidden window");
    }
    const began = Date.now();
    await app.evaluate(({ app }) => { setTimeout(() => { app.quit(); app.quit(); app.quit(); }, 0); });
    const [code, signal] = await bound(hostExited, 6000, "Electron host did not finish bounded shutdown");
    const elapsedMs = Date.now() - began;
    // Check immediately after the host exits, before any test cleanup or wait.
    const aliveAfterHostExit = pids.filter(alive);
    assert.deepEqual(aliveAfterHostExit, [], "Electron exited only after all its stubborn fixture children disappeared");
    assert.equal(code, 0);
    assert.equal(signal, null);
    assert.ok(elapsedMs >= 850 && elapsedMs < 5000, "Default 1s SIGTERM grace was awaited and shutdown remained bounded");
    const signals = (await readLines(log)).filter((record) => record.event === "SIGTERM");
    for (const pid of pids) assert.equal(signals.filter((record) => record.pid === pid).length, 1, "Each child receives one idempotent SIGTERM");
    assert.deepEqual(errors, []);
    const result = { kind, profile, hostPid: host.pid, pids, aliveBeforeQuit, aliveAfterHostExit, elapsedMs, code, signal, errors, windowClose };
    scenarios.push(result);
    checks.push(kind === "quit"
      ? "Repeated app.quit waits for the current and replaced clients, escalates ignored SIGTERM, and leaves no fixture PID alive when Electron exits"
      : "Closing the main window hides it (still alive, not visible, core running, no exit); the following quit closes it and follows the same bounded cleanup before Electron host exit");
  } finally {
    if (host && host.exitCode === null && host.signalCode === null) {
      await app?.close().catch(() => {});
      if (host.exitCode === null && host.signalCode === null) host.kill("SIGKILL");
    }
    const starts = (await readLines(log)).filter((record) => record.event === "start");
    for (const record of starts) {
      if (!host || record.ppid !== host.pid) continue;
      await cleanupFixture(record.pid, binary).catch(() => {});
    }
  }
}

try {
  await scenario("quit", 2);
  await scenario("window-close", 0);
  const report = { passed: true, fixture: true, at: new Date().toISOString(), checks, scenarios };
  await fs.writeFile(path.join(evidence, "shutdown-ui-test.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await fs.writeFile(path.join(evidence, "shutdown-ui-test.json"), JSON.stringify({
    passed: false, fixture: true, at: new Date().toISOString(), checks, scenarios, error: error.stack,
  }, null, 2));
  throw error;
}
