import { registerCodexPack } from './codex-pack.mjs';
registerCodexPack();
// A saved Codex custom endpoint applies from the first spawn of the app run: CodexClient.start() awaits the launch
// preparation hook (main.cjs: Settings › Models' ready()) before it resolves the core, whoever starts it first — the
// Home stats card, an account read or connect() (codex.cjs setBeforeSpawn).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { CodexClient, setBeforeSpawn, setCodexLaunch, setCoreChoice } = require("../electron/codex.cjs");

test("every start waits for the launch to be prepared, then spawns once with it", { timeout: 10000 }, async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "codex-before-spawn-"));
  const binary = path.join(directory, "codex"), log = path.join(directory, "argv.jsonl");
  await fs.writeFile(binary, `#!${process.execPath}
require('node:fs').appendFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)) + '\\n');
require('node:readline').createInterface({ input: process.stdin }).on('line', line => {
  const message = JSON.parse(line);
  if (message.method === 'initialize') process.stdout.write(JSON.stringify({ id: message.id, result: {} }) + '\\n');
});
`, { mode: 0o755 });
  const saved = { core: process.env.CODE_DESKTOP_CORE, override: process.env.CODEX_BINARY, system: process.env.CODE_DESKTOP_CORE_SYSTEM_PATHS };
  Object.assign(process.env, { CODE_DESKTOP_CORE: "codex", CODE_DESKTOP_CORE_SYSTEM_PATHS: "" });
  delete process.env.CODEX_BINARY;
  setCoreChoice({ core: "codex", agents: { codex: { path: binary } } });
  let launch = { args: [], env: {} };
  setCodexLaunch(() => launch);
  let release, hooks = 0;
  const prepared = new Promise((resolve) => { release = resolve; });
  setBeforeSpawn(async () => { hooks++; await prepared; launch = { args: ["-c", 'model_provider="codedesktop"'], env: {} }; });
  const client = new CodexClient({ initializeTimeout: 3000, shutdownTimeout: 80 });
  t.after(async () => {
    await client.stopAndWait();
    setBeforeSpawn(null); setCodexLaunch(null); setCoreChoice({});
    for (const [key, value] of [["CODE_DESKTOP_CORE", saved.core], ["CODEX_BINARY", saved.override], ["CODE_DESKTOP_CORE_SYSTEM_PATHS", saved.system]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await fs.rm(directory, { recursive: true, force: true });
  });
  const started = client.start();
  await new Promise((resolve) => setTimeout(resolve, 150));
  await assert.rejects(fs.readFile(log, "utf8"), /ENOENT/, "nothing spawns before the launch is prepared");
  release();
  await started;
  assert.equal(hooks, 1);
  const lines = (await fs.readFile(log, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
  assert.deepEqual(lines, [["app-server", "--stdio", "-c", 'model_provider="codedesktop"']], "spawned once, with the endpoint's -c args");
  // An explicit binary (tests, CODEX_BINARY) never waits for it.
  const direct = new CodexClient({ binary, initializeTimeout: 3000, shutdownTimeout: 80 });
  t.after(() => direct.stopAndWait());
  await direct.start();
  assert.equal(hooks, 1);
});

test("main.cjs prepares the launch once before the first spawn of any client", async () => {
  const main = await fs.readFile(new URL("../electron/main.cjs", import.meta.url), "utf8");
  assert.match(main, /setBeforeSpawn\(\(\) => \(launchPrepared \?\?= Promise\.resolve\(\)\.then\(\(\) => modelSettings\.ready\?\.\(\)\)/);
  assert.ok(main.indexOf("setBeforeSpawn(") < main.indexOf("client = new CodexClient();"), "set before the first client exists");
});
