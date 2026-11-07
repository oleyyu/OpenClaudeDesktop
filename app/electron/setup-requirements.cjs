// First-run setup › Requirements (src/source-onboarding.jsx): what this Mac needs before a core can start.
//
// Node.js 22.19 or newer runs DeepSeek Harness and every bridge core (codex.cjs nodeBinary), and a Mac fresh
// from a GitHub download usually has none: the core then never connects, which is why setup can't wait for a
// connection before it opens. Git (the Xcode Command Line Tools) backs worktrees, Git status and the branch
// picker; it is recommended, not required.
//
// check() never runs /usr/bin/git or /usr/bin/xcrun: without the Command Line Tools those shims open Apple's
// install dialog by themselves. Installing Git asks Apple's installer (xcode-select --install). Installing Node
// downloads the official macOS installer of the newest LTS line from nodejs.org (npmmirror.com when nodejs.org
// can't be reached), checks it against the release's SHASUMS256.txt and opens it; the user finishes it in
// Installer, which puts node in /usr/local/bin, where nodeBinary looks.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFile, execFileSync, spawn } = require("node:child_process");

const MIN_NODE = Object.freeze([22, 19, 0]);
const NODE_SOURCES = Object.freeze(["https://nodejs.org/dist", "https://npmmirror.com/mirrors/node"]);

function parseVersion(text) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(text || "").trim());
  return match ? match.slice(1, 4).map(Number) : null;
}
function meetsMinimum(version, minimum = MIN_NODE) {
  const parts = Array.isArray(version) ? version : parseVersion(version);
  if (!parts) return false;
  for (let i = 0; i < 3; i++) if (parts[i] !== minimum[i]) return parts[i] > minimum[i];
  return true;
}

// Where a Node can live on a Mac: CODE_DESKTOP_NODE, Homebrew, the official installer, ~/.local, Volta, then
// nvm's versions newest first. A GUI app's PATH holds none of these, so a bare "node" is the last resort only.
// Windows: CODE_DESKTOP_NODE, the official installer (Program Files), nvm-windows, Volta, Scoop, fnm, then every
// node.exe on PATH (a GUI launch on Windows does get the user's PATH).
function windowsNodeCandidates({ env = process.env, home = os.homedir(), readdir = (dir) => fs.readdirSync(dir) } = {}) {
  const versions = (dir) => { try { return readdir(dir).filter((name) => parseVersion(name))
    .sort((a, b) => { const x = parseVersion(a), y = parseVersion(b); return y[0] - x[0] || y[1] - x[1] || y[2] - x[2]; })
    .map((name) => path.win32.join(dir, name, "node.exe")); } catch { return []; } };
  const local = env.LOCALAPPDATA || path.win32.join(home, "AppData", "Local");
  const roaming = env.APPDATA || path.win32.join(home, "AppData", "Roaming");
  const onPath = String(env.Path || env.PATH || "").split(";").filter(Boolean).map((dir) => path.win32.join(dir.trim(), "node.exe"));
  return [env.CODE_DESKTOP_NODE,
    path.win32.join(env.ProgramFiles || "C:\\Program Files", "nodejs", "node.exe"),
    path.win32.join(local, "Programs", "nodejs", "node.exe"),
    env.NVM_SYMLINK && path.win32.join(env.NVM_SYMLINK, "node.exe"),
    ...versions(env.NVM_HOME || path.win32.join(roaming, "nvm")),
    path.win32.join(local, "Volta", "bin", "node.exe"),
    path.win32.join(home, "scoop", "apps", "nodejs", "current", "node.exe"),
    path.win32.join(home, "scoop", "apps", "nodejs-lts", "current", "node.exe"),
    ...onPath].filter(Boolean).filter((file, index, all) => all.findIndex((other) => other.toLowerCase() === file.toLowerCase()) === index);
}
function nodeCandidates({ env = process.env, home = os.homedir(), readdir = (dir) => fs.readdirSync(dir), platform = process.platform } = {}) {
  if (platform === "win32") return windowsNodeCandidates({ env, home, readdir });
  let nvm = [];
  try {
    const dir = path.join(env.NVM_DIR || path.join(home, ".nvm"), "versions/node");
    nvm = readdir(dir).filter((name) => parseVersion(name))
      .sort((a, b) => { const x = parseVersion(a), y = parseVersion(b); return y[0] - x[0] || y[1] - x[1] || y[2] - x[2]; })
      .map((name) => path.join(dir, name, "bin/node"));
  } catch {}
  return [env.CODE_DESKTOP_NODE, "/opt/homebrew/bin/node", "/usr/local/bin/node", path.join(home, ".local/bin/node"), path.join(home, ".volta/bin/node"), ...nvm].filter(Boolean);
}

// The Node the cores run on: the first candidate new enough, else the first one found (too old, so check()
// reports its version), else null. Only a usable Node is remembered: once the user installs one, the next
// spawn or check finds it without a restart.
// Windows only: with no usable Node installed, the cores run on this app's own Node (Electron as Node,
// ELECTRON_RUN_AS_NODE=1, set by codex.cjs for every spawn of process.execPath), so an unzipped build works at once.
function bundledNode({ platform = process.platform } = {}) {
  if (platform !== "win32" || !process.versions.electron || !meetsMinimum(process.versions.node)) return null;
  return { path: process.execPath, version: `v${process.versions.node}`, ok: true, bundled: true };
}
function createNodeResolver({ candidates = () => nodeCandidates(), exists = (file) => fs.existsSync(file), bundled = () => bundledNode(),
  versionOf = (file) => { try { return String(execFileSync(file, ["-v"], { timeout: 5000 })).trim(); } catch { return null; } } } = {}) {
  let usable = null;
  function resolve() {
    if (usable && exists(usable.path)) return usable;
    usable = null;
    let fallback = null;
    for (const file of candidates()) {
      if (!exists(file)) continue;
      const version = versionOf(file);
      if (version && meetsMinimum(version)) return (usable = { path: file, version, ok: true });
      fallback ??= { path: file, version, ok: false };
    }
    // Not remembered: a Node the user installs later takes over at the next spawn.
    return bundled() || fallback;
  }
  return { resolve, forget: () => { usable = null; } };
}

const run = (file, args, options = {}) => new Promise((resolve, reject) => {
  execFile(file, args, { timeout: 15000, maxBuffer: 1 << 20, ...options }, (error, stdout) => error ? reject(error) : resolve(String(stdout)));
});

function createSetupRequirements({ resolveNode, downloadsDir, openPath, fetchImpl = (...args) => fetch(...args), exec = run,
  exists = (file) => fs.existsSync(file), launch = (file, args) => spawn(file, args, { detached: true, stdio: "ignore" }).unref(),
  sources = NODE_SOURCES, platform = process.platform, env = process.env, openExternal = null }) {
  const windows = platform === "win32";
  // The one Node download: {phase: 'download' | 'verify' | 'installer' | 'failed', version, received, total, error}.
  let nodeInstall = null;

  async function gitStatus() {
    if (windows) {
      const onPath = String(env.Path || env.PATH || "").split(";").filter(Boolean).map((dir) => path.win32.join(dir.trim(), "git.exe"));
      for (const file of [path.win32.join(env.ProgramFiles || "C:\\Program Files", "Git", "cmd", "git.exe"),
        path.win32.join(env.LOCALAPPDATA || path.win32.join(os.homedir(), "AppData", "Local"), "Programs", "Git", "cmd", "git.exe"), ...onPath])
        if (exists(file)) return { ok: true, path: file };
      return { ok: false, path: null };
    }
    for (const file of ["/opt/homebrew/bin/git", "/usr/local/bin/git"]) if (exists(file)) return { ok: true, path: file };
    try {
      const dir = (await exec("/usr/bin/xcode-select", ["-p"])).trim();
      const file = dir && path.join(dir, "usr/bin/git");
      if (file && exists(file)) return { ok: true, path: file };
    } catch {}
    return { ok: false, path: null };
  }

  async function check() {
    const node = resolveNode();
    if (node?.ok && nodeInstall?.phase === "installer") nodeInstall = null;
    return {
      node: { ok: !!node?.ok, path: node?.path ?? null, version: node?.version ?? null, minimum: MIN_NODE.join(".") },
      git: await gitStatus(),
      nodeInstall: nodeInstall && { ...nodeInstall },
    };
  }

  async function latestLts(base) {
    const response = await fetchImpl(`${base}/index.json`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`${base} answered ${response.status}`);
    const releases = await response.json();
    // The installer is universal (arm64 and x64); a release without one (none so far) is skipped.
    const wanted = windows ? (process.arch === "arm64" ? "win-arm64-msi" : "win-x64-msi") : "osx-x64-pkg";
    const release = (Array.isArray(releases) ? releases : []).find((entry) => entry?.lts && meetsMinimum(entry.version) && (entry.files || []).includes(wanted));
    if (!release) throw new Error(`${base} lists no Node.js LTS release for ${windows ? "Windows" : "macOS"}`);
    return release.version;
  }

  async function expectedSha(base, version, file) {
    const response = await fetchImpl(`${base}/${version}/SHASUMS256.txt`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`${base} answered ${response.status}`);
    const line = (await response.text()).split("\n").find((row) => row.trim().endsWith(`  ${file}`));
    const sha = line?.trim().split(/\s+/)[0];
    if (!/^[0-9a-f]{64}$/.test(sha || "")) throw new Error(`SHASUMS256.txt has no checksum for ${file}`);
    return sha;
  }

  async function download(base) {
    const version = await latestLts(base);
    const file = windows ? `node-${version}-${process.arch === "arm64" ? "arm64" : "x64"}.msi` : `node-${version}.pkg`;
    const sha = await expectedSha(base, version, file);
    nodeInstall = { phase: "download", version, received: 0, total: 0, error: null };
    const response = await fetchImpl(`${base}/${version}/${file}`);
    if (!response.ok || !response.body) throw new Error(`${base} answered ${response.status}`);
    nodeInstall.total = Number(response.headers.get("content-length")) || 0;
    fs.mkdirSync(downloadsDir(), { recursive: true });
    const target = path.join(downloadsDir(), file), partial = `${target}.part`;
    const hash = crypto.createHash("sha256");
    const out = fs.createWriteStream(partial);
    try {
      for await (const chunk of response.body) {
        hash.update(chunk);
        nodeInstall.received += chunk.length;
        if (!out.write(chunk)) await new Promise((resolve, reject) => { out.once("drain", resolve); out.once("error", reject); });
      }
      await new Promise((resolve, reject) => { out.once("error", reject); out.end(resolve); });
    } catch (error) {
      out.destroy();
      fs.rmSync(partial, { force: true });
      throw error;
    }
    nodeInstall.phase = "verify";
    if (hash.digest("hex") !== sha) { fs.rmSync(partial, { force: true }); throw new Error(`The Node.js ${version} installer didn't match its published checksum.`); }
    fs.renameSync(partial, target);
    return target;
  }

  async function installNode() {
    const failures = [];
    for (const base of sources) {
      try {
        const pkg = await download(base);
        const problem = await openPath(pkg);
        if (problem) throw new Error(problem);
        nodeInstall = { ...nodeInstall, phase: "installer" };
        return;
      } catch (error) {
        failures.push(error?.message || String(error));
      }
    }
    nodeInstall = { ...(nodeInstall || {}), phase: "failed", error: failures.join("\n") };
  }

  async function runOp(p = {}) {
    if (p.op === "check") return check();
    if (p.op === "install-git") {
      // Windows: Git for Windows' download page; macOS: Apple's installer dialog takes over. check() sees git once it finishes.
      if (windows) { if (typeof openExternal === "function") openExternal("https://git-scm.com/download/win"); return check(); }
      launch("/usr/bin/xcode-select", ["--install"]);
      return check();
    }
    if (p.op === "install-node") {
      if (!["download", "verify"].includes(nodeInstall?.phase)) {
        nodeInstall = { phase: "download", version: null, received: 0, total: 0, error: null };
        void installNode();
      }
      return check();
    }
    throw new Error("Unsupported operation.");
  }

  return { run: runOp, check };
}

module.exports = { bundledNode, MIN_NODE, NODE_SOURCES, parseVersion, meetsMinimum, nodeCandidates, windowsNodeCandidates, createNodeResolver, createSetupRequirements };
