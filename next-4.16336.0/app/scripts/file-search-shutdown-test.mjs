import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { execFile, execFileSync, spawn } from "node:child_process";
import { promisify } from "node:util";

// A lifecycle test of the installed main-process wiring, not a delayed reply.
// Only this fresh workspace's Git ls-files is blocked. All other Git calls use
// the real binary. There are no test branches or handler replacements in app/.
const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(root, "../analysis/batch-20260920");
const startedAt = new Date().toISOString();
const directory = path.join(
  evidence,
  `file-search-shutdown-${startedAt.replaceAll(":", "-")}`,
);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace"),
  bin = path.join(profile, "bin");
const pidLog = path.join(profile, "blocked-git.json");
const wrapperFile = path.join(profile, "git-wrapper.cjs");
const sentinelFile = path.join(profile, "unrelated-sentinel.cjs");
const sentinelReady = path.join(profile, "sentinel-ready.json");
const exec = promisify(execFile);
const checks = [],
  errors = [],
  snapshots = {};
let app,
  host,
  page,
  sentinel,
  sentinelDone,
  blocked,
  workerIdentity,
  gitIdentity;
let build, runtime, failure, searchStartedAt, quitStartedAt, exitSnapshot;
const alive = (pid) => {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
};
async function bound(promise, milliseconds, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function waitFor(probe, milliseconds, message) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(message);
}
async function readJSON(filename) {
  try {
    return JSON.parse(await fs.readFile(filename, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
async function identity(pid) {
  if (!alive(pid)) return null;
  try {
    const { stdout } = await exec(
      "/bin/ps",
      ["-p", String(pid), "-o", "pid=,ppid=,pgid=,lstart=,command="],
      { timeout: 1000, maxBuffer: 8192 },
    );
    const match = stdout
      .trim()
      .match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.{24})\s+(.+)$/);
    assert.ok(match, `Cannot inspect PID ${pid}: ${stdout}`);
    return {
      pid: Number(match[1]),
      ppid: Number(match[2]),
      pgid: Number(match[3]),
      started: match[4],
      command: match[5],
    };
  } catch (error) {
    if (!alive(pid)) return null;
    throw error;
  }
}
async function cleanupOwnedProcess(expected) {
  if (!expected) return;
  const current = await identity(expected.pid);
  // A failing test only kills the exact recorded process, never a process name
  // or reused PID. Reparenting after host exit is allowed; identity must match.
  if (
    current?.started === expected.started &&
    current?.command === expected.command
  )
    process.kill(expected.pid, "SIGKILL");
}
const shellQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

try {
  const manifest = JSON.parse(
    await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"),
  );
  const packageInfo = JSON.parse(
    await fs.readFile(path.join(root, "package.json"), "utf8"),
  );
  build = {
    version: manifest.version,
    builtAt: manifest.builtAt,
    sourceSha256: manifest.sourceSha256,
  };
  assert.equal(manifest.version, packageInfo.version);
  assert.equal(
    createHash("sha256").update(JSON.stringify(manifest.sources)).digest("hex"),
    manifest.sourceSha256,
  );
  for (const entry of manifest.sources)
    assert.equal(
      createHash("sha256")
        .update(await fs.readFile(path.join(root, entry.path)))
        .digest("hex"),
      entry.sha256,
      `Build is stale: ${entry.path}`,
    );
  assert.ok(
    manifest.sources.some(
      (entry) => entry.path === "electron/file-name-search.cjs",
    ),
  );
  assert.ok(
    manifest.sources.some((entry) => entry.path === "electron/main.cjs"),
  );

  await Promise.all([workspace, bin].map((folder) => fs.mkdir(folder)));
  const realWorkspace = await fs.realpath(workspace);
  const realGit = await fs.realpath(
    execFileSync("/usr/bin/which", ["git"], { encoding: "utf8" }).trim(),
  );
  assert.ok(path.isAbsolute(realGit));
  const gitEnvironment = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
    ),
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
  execFileSync(realGit, ["-C", workspace, "init", "-q"], {
    env: gitEnvironment,
    stdio: "pipe",
  });
  await fs.writeFile(
    path.join(workspace, "Needle.txt"),
    "REAL_SHUTDOWN_FIXTURE_FILE\n",
  );
  execFileSync(realGit, ["-C", workspace, "add", "Needle.txt"], {
    env: gitEnvironment,
    stdio: "pipe",
  });
  await fs.writeFile(
    path.join(profile, "preferences.json"),
    JSON.stringify({
      cwd: workspace,
      mode: "code",
      theme: "light",
      model: "fixture",
      threadIds: [],
    }),
  );
  await fs.writeFile(
    wrapperFile,
    `const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
if (fs.realpathSync(process.cwd()) === ${JSON.stringify(realWorkspace)} && args.includes('ls-files')) {
  const record = { pid: process.pid, ppid: process.ppid, cwd: process.cwd(), args, at: Date.now() };
  // Atomic publication: the runner never sees a partial PID record.
  fs.writeFileSync(${JSON.stringify(pidLog + ".tmp")}, JSON.stringify(record));
  fs.renameSync(${JSON.stringify(pidLog + ".tmp")}, ${JSON.stringify(pidLog)});
  process.on('SIGTERM', () => {});
  setInterval(() => {}, 1000);
} else {
  const child = spawnSync(${JSON.stringify(realGit)}, args, { stdio: 'inherit', env: process.env });
  if (child.error) { process.stderr.write(child.error.message); process.exit(127); }
  if (child.signal) process.kill(process.pid, child.signal);
  else process.exit(child.status ?? 1);
}
`,
  );
  // exec preserves the PID and process group. Explicit quoting supports paths
  // with spaces; argv is forwarded literally rather than evaluated as code.
  await fs.writeFile(
    path.join(bin, "git"),
    `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(wrapperFile)} "$@"\n`,
    { mode: 0o700 },
  );
  await fs.writeFile(
    sentinelFile,
    `const fs = require('node:fs');\nfs.writeFileSync(${JSON.stringify(sentinelReady + ".tmp")}, JSON.stringify({pid:process.pid,ppid:process.ppid}));\nfs.renameSync(${JSON.stringify(sentinelReady + ".tmp")}, ${JSON.stringify(sentinelReady)});\nsetInterval(() => {}, 1000);\n`,
  );
  sentinel = spawn(process.execPath, [sentinelFile], {
    cwd: profile,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: "ignore",
  });
  sentinelDone = once(sentinel, "close");
  const ready = await waitFor(
    () => readJSON(sentinelReady),
    2000,
    "Unrelated sentinel did not start",
  );
  assert.equal(ready.pid, sentinel.pid);
  assert.equal(
    ready.ppid,
    process.pid,
    "The sentinel belongs to the test runner, not the Electron host",
  );

  const env = {
    ...process.env,
    PATH: `${bin}${path.delimiter}${process.env.PATH || "/usr/bin:/bin"}`,
    CODE_DESKTOP_DATA: profile,
    CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs"),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.CODE_DESKTOP_DEV_URL;
  app = await electron.launch({
    executablePath:
      process.env.TEST_ELECTRON_BINARY ||
      path.join(
        root,
        "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
      ),
    args: [root],
    env,
  });
  host = app.process();
  page = await app.firstWindow();
  page.on("pageerror", (error) => errors.push(error.message));
  runtime = await app.evaluate(({ app }) => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
  }));
  assert.equal(runtime.version, build.version);
  await page
    .getByRole("button", { name: "Model", exact: true })
    .filter({ hasText: "Test model" })
    .waitFor();
  await page.screenshot({ path: path.join(directory, "before-search.png") });
  searchStartedAt = Date.now();
  await page.evaluate(() => {
    window.fileSearchShutdownOutcome = { settled: false };
    // Keep the real invoke pending. No UI component can cancel this request on
    // unmount, so cleanup must come from the app lifecycle integration.
    window.desktop
      .call("files:search", {
        sessionId: null,
        pane: "main",
        requestId: "shutdown-real-search",
        query: "Needle",
      })
      .then(
        (result) => {
          window.fileSearchShutdownOutcome = { settled: true, result };
        },
        (error) => {
          window.fileSearchShutdownOutcome = {
            settled: true,
            error: error.message,
          };
        },
      );
  });
  blocked = await waitFor(
    () => readJSON(pidLog),
    2000,
    "The real filename worker did not reach fixture Git ls-files",
  );
  [workerIdentity, gitIdentity] = await Promise.all([
    identity(blocked.ppid),
    identity(blocked.pid),
  ]);
  assert.ok(
    workerIdentity && gitIdentity,
    "Both the real worker and its Git descendant must be alive before quit",
  );
  assert.equal(workerIdentity.ppid, host.pid);
  assert.match(workerIdentity.command, /file-name-search-worker\.cjs/);
  assert.equal(
    workerIdentity.pgid,
    workerIdentity.pid,
    "The worker owns a fresh process group",
  );
  assert.equal(gitIdentity.ppid, workerIdentity.pid);
  assert.equal(gitIdentity.pgid, workerIdentity.pid);
  assert.ok(gitIdentity.command.includes(wrapperFile));
  assert.equal(blocked.cwd, realWorkspace);
  assert.ok(blocked.args.includes("ls-files"));
  assert.equal(
    (await page.evaluate(() => window.fileSearchShutdownOutcome)).settled,
    false,
  );
  assert.ok(alive(sentinel.pid));
  snapshots.beforeQuit = {
    worker: workerIdentity,
    git: gitIdentity,
    sentinelPid: sentinel.pid,
    searchAgeMs: Date.now() - searchStartedAt,
  };
  checks.push(
    "Real renderer IPC starts an unresolved filename worker and Git ls-files in its own process group; the unrelated sentinel belongs to the test runner",
  );

  const hostExited = once(host, "exit");
  host.once("exit", (code, signal) => {
    exitSnapshot = {
      at: Date.now(),
      code,
      signal,
      workerAlive: alive(workerIdentity.pid),
      gitAlive: alive(gitIdentity.pid),
      sentinelAlive: alive(sentinel.pid),
    };
  });
  quitStartedAt = Date.now();
  await bound(
    Promise.all([app.close(), hostExited]),
    6000,
    "Electron did not complete bounded file-search shutdown",
  );
  snapshots.hostExit = exitSnapshot;
  assert.equal(exitSnapshot.code, 0);
  assert.equal(exitSnapshot.signal, null);
  assert.equal(
    exitSnapshot.workerAlive,
    false,
    "The worker must be reaped before Electron exits",
  );
  assert.equal(
    exitSnapshot.sentinelAlive,
    true,
    "Shutdown must not kill unrelated processes",
  );
  // A descendant killed with its parent can briefly be a zombie until the OS
  // reaps it. Allow that short reap window, never the service's 4-second timer.
  await waitFor(
    () => !alive(gitIdentity.pid),
    750,
    "Git descendant survived app shutdown",
  );
  snapshots.afterReap = {
    at: Date.now(),
    workerAlive: alive(workerIdentity.pid),
    gitAlive: alive(gitIdentity.pid),
    sentinelAlive: alive(sentinel.pid),
  };
  assert.equal(snapshots.afterReap.workerAlive, false);
  assert.equal(snapshots.afterReap.sentinelAlive, true);
  assert.ok(
    Date.now() - searchStartedAt < 3500,
    "Cleanup must complete before the 4-second search deadline could mask missing shutdown wiring",
  );
  assert.deepEqual(errors, []);
  checks.push(
    "app.close awaits the owned live worker, removes its stubborn Git descendant before the search deadline, and leaves the unrelated sentinel alive",
  );
} catch (error) {
  failure = error;
  if (page)
    await page
      .screenshot({ path: path.join(directory, "failure.png") })
      .catch(() => {});
} finally {
  if (host && host.exitCode === null && host.signalCode === null) {
    await bound(app.close(), 5000, "Cleanup close timed out").catch(() => {});
    if (host.exitCode === null && host.signalCode === null)
      host.kill("SIGKILL");
  }
  // Failure cleanup happens strictly after all lifecycle observations/assertions.
  // No global process lookup, process-name kill, or negative-PID kill is used.
  await cleanupOwnedProcess(gitIdentity).catch((error) => {
    failure ||= error;
  });
  await cleanupOwnedProcess(workerIdentity).catch((error) => {
    failure ||= error;
  });
  if (sentinel && sentinel.exitCode === null && sentinel.signalCode === null)
    sentinel.kill("SIGKILL");
  if (sentinelDone)
    await bound(sentinelDone, 2000, "Sentinel cleanup timed out").catch(
      (error) => {
        failure ||= error;
      },
    );
  const report = {
    passed: !failure,
    fixture: true,
    realIpc: Boolean(searchStartedAt),
    blockedRealWorker: Boolean(blocked && workerIdentity && gitIdentity),
    at: new Date().toISOString(),
    startedAt,
    build,
    runtime,
    profile,
    workspace,
    checks,
    errors,
    blocked,
    snapshots,
    searchStartedAt,
    quitStartedAt,
    quitElapsedMs: exitSnapshot ? exitSnapshot.at - quitStartedAt : null,
    ...(failure ? { error: failure.stack || String(failure) } : {}),
  };
  await fs.writeFile(
    path.join(directory, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  await fs.writeFile(
    path.join(evidence, "file-search-shutdown-test.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
}
if (failure) throw failure;
