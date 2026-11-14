// Settings › Cores: finding, installing and choosing the agent core (core-registry.mjs, electron/cores/*.mjs).
//
// A core's agent program (core.agent) is either the user's own install
// (agent.systemPaths) or one this app downloaded from the official release into
// <userData>/cores/<id>/<version>/ with a manifest.json beside it. A download is
// streamed with progress, checked against the release's size and sha256,
// unpacked (tar.gz / tgz with the system tar, zip with ditto, or a bare binary),
// and only becomes the installed copy once it answers `--version` (or the
// asset's versionArgs). Assets with keep: "dir" keep the whole unpacked tree
// (Node CLIs and their files) and name the entry with binaryPath; runner: "node"
// marks an entry that runs under Node. Nothing outside <userData>/cores is
// written; the user's own installs are never touched.
//
// A release is untrusted input (an Extension Pack's agent.release and
// agent.binary are copied as written): releaseProblem refuses one without an
// https URL (http only on loopback), a 64-hex sha256 and a byte size, or whose
// version, binaryPath, binaryName, extractPaths or the core's agent.binary would
// land outside its own folder, or whose version would name the bridge state or
// the manifest (compared case-insensitively: APFS and HFS+ fold case by
// default), before anything is downloaded or removed. Inside the unpacked
// release, the entry is resolved through symlinks and must be a regular file
// within the release before it is moved, made executable or run; a disk
// image's extractPaths must resolve inside the mounted image. The new copy is
// staged inside the download folder and swapped in only after it starts, so a
// failed or cancelled install (Cancel works in every phase) leaves the previous
// copy as it was.
//
// <userData>/cores/<id>/state is the bridge's own data (CODE_DESKTOP_BRIDGE_STATE:
// threads, connectors, settings). Installing or updating never touches it;
// uninstall keeps it unless asked ({removeState: true}). Leftovers of a download
// cut short by a quit or crash (.download-<pid>-<time>) are swept on start.
//
// The chosen core (config.core) and every agent found reach codex.cjs through
// setCoreChoice; the renderer reconnects to start it. CODE_DESKTOP_CORE and
// CODEX_BINARY still win. Tests: CODE_DESKTOP_CORE_RELEASE_MANIFEST replaces the
// release ({url, size, sha256, version, type?, binaryPath?, keep?, runner?}, or
// {[coreId]: that}), CODE_DESKTOP_CORE_SYSTEM_PATHS (colon-separated, "" for
// none) the system paths.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFile } = require("node:child_process");
const { offeredCores, coreById, releaseAsset } = require("./core-registry.mjs");
// A release is fetched over Chromium's network stack, so the system proxy applies (system-fetch.cjs).
const { systemFetch } = require("./system-fetch.cjs");
// Messages reach Settings › Cores as given, so they go through the main-process t() (core names stay as written).
const { t } = require("./i18n/index.mjs");
const fail = (source, values) => new Error(t(source, values));

const run = (file, args, options = {}) => new Promise((resolve, reject) => {
  execFile(file, args, { timeout: 15000, maxBuffer: 1 << 20, ...options }, (error, stdout, stderr) => error ? reject(Object.assign(error, { stderr })) : resolve(String(stdout)));
});
const expand = (file, home) => (file.startsWith("~/") ? path.join(home, file.slice(2)) : file);
const executable = (file) => { try { const stat = fs.statSync(file); return stat.isFile() && (stat.mode & 0o111) !== 0; } catch { return false; } };
const exists = (file) => { try { return fs.statSync(file).isFile(); } catch { return false; } };

// The folder a bridge keeps its own data in, beside the downloaded versions; never a version name.
const STATE_DIR = "state";
const DOWNLOAD_PREFIX = ".download-";
const RELEASE_TYPES = new Set(["tar.gz", "tgz", "zip", "binary", "dmg"]);
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
const cancelled = () => fail("Download cancelled.");

/** `child` is `parent` itself or below it (both already resolved). */
const within = (child, parent) => child === parent || child.startsWith(parent.endsWith(path.sep) ? parent : parent + path.sep);
/** A relative path that stays strictly inside whatever folder it is joined to. */
function insideRelative(value) {
  if (typeof value !== "string" || !value || value.includes("\0") || path.isAbsolute(value)) return false;
  const normal = path.normalize(value);
  return normal !== "." && normal !== ".." && !normal.startsWith(".." + path.sep);
}
const plainName = (value) => typeof value === "string" && insideRelative(value) && path.basename(value) === value;
/**
 * Names in <userData>/cores/<id> that aren't downloaded versions, compared case-insensitively: on the default
 * case-insensitive APFS volume "State" is the same folder as "state".
 */
const RESERVED_NAMES = new Set([STATE_DIR, "manifest.json", "manifest.json.tmp"]);
const reservedName = (name) => RESERVED_NAMES.has(String(name).toLowerCase());
/** A release version is one folder name: no separators, no leading dot, not the bridge state folder or the manifest. */
const validVersion = (value) => typeof value === "string" && /^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$/.test(value) && !reservedName(value);

/**
 * Why this release can't be installed, or null. With the core, its agent.binary (the installed entry's file name
 * when the release has no keep: "dir" tree) is checked too: a pack's descriptor is as untrusted as its release.
 */
function releaseProblem(asset, core = null) {
  // A keep: "dir" release names its entry with binaryPath, so there agent.binary may be absent, but never a path.
  if (core && (asset.keep !== "dir" || core.agent?.binary != null) && !plainName(core.agent?.binary)) return "its agent binary isn’t a plain file name";
  let url;
  try { url = new URL(String(asset.url)); } catch { return "its download address isn’t a URL"; }
  if (!(url.protocol === "https:" || (url.protocol === "http:" && LOOPBACK.has(url.hostname)))) return "it isn’t downloaded over https";
  if (typeof asset.sha256 !== "string" || !/^[0-9a-f]{64}$/i.test(asset.sha256)) return "it has no sha256 checksum to check the download against";
  if (!Number.isSafeInteger(asset.size) || asset.size <= 0) return "it has no download size";
  if (!validVersion(asset.version)) return "its version isn’t a plain version name";
  if (!RELEASE_TYPES.has(asset.type ?? "tar.gz")) return `its type ${asset.type} isn’t supported`;
  if (asset.binaryPath != null && !insideRelative(asset.binaryPath)) return "its binaryPath points outside the release";
  if (asset.keep === "dir" && asset.binaryPath == null) return "it keeps a folder but names no binaryPath";
  if (asset.binaryName != null && !plainName(asset.binaryName)) return "its binaryName isn’t a plain file name";
  if (asset.extractPaths != null && !(Array.isArray(asset.extractPaths) && asset.extractPaths.every(insideRelative))) return "its extractPaths point outside the disk image";
  if (asset.versionArgs != null && !(Array.isArray(asset.versionArgs) && asset.versionArgs.every((arg) => typeof arg === "string"))) return "its versionArgs aren’t a list of arguments";
  return null;
}

/** Numeric-aware version order (1.10 > 1.9); a leading "v" and build suffixes are ignored. */
function compareVersions(a, b) {
  const parts = (value) => String(value ?? "").replace(/^v/i, "").split(/[.+-]/);
  const left = parts(a), right = parts(b);
  for (let at = 0; at < Math.max(left.length, right.length); at += 1) {
    const x = left[at] ?? "0", y = right[at] ?? "0";
    const nx = /^\d+$/.test(x) ? Number(x) : NaN, ny = /^\d+$/.test(y) ? Number(y) : NaN;
    const order = Number.isNaN(nx) || Number.isNaN(ny) ? x.localeCompare(y) : nx - ny;
    if (order) return Math.sign(order);
  }
  return 0;
}

/** The x.y.z version in an agent's `--version` line ("codex-cli 0.155.1" → "0.155.1"), or null. */
function plainVersion(text) {
  return /(?:^|[^\d.])v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)/.exec(String(text ?? ""))?.[1] ?? null;
}

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (error) { return error?.code === "EPERM"; } };

function dirSize(dir) {
  let total = 0;
  const walk = (current) => {
    let entries = [];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else try { total += fs.lstatSync(full).size; } catch {}
    }
  };
  walk(dir);
  return total;
}

// A Node-script agent entry (a .cjs/.mjs bundle, e.g. ZCode's glm/zcode.cjs) runs under Node and needs no exec bit.
const nodeScript = (file) => /\.(c|m)?js$/.test(file);

/**
 * A macOS disk image release (ZCode ships its agent only inside the desktop DMG): mounted read-only without a Finder
 * window, the asset's extractPaths (or the whole image but Applications) copied out at the same relative paths, detached.
 */
async function unpackDmg(archive, unpacked, extractPaths, signal) {
  const mount = fs.mkdtempSync(path.join(os.tmpdir(), "cd-dmg-"));
  try {
    await run("hdiutil", ["attach", "-nobrowse", "-readonly", "-noautoopen", "-noverify", "-mountpoint", mount, archive], { timeout: 180000, signal });
    const paths = Array.isArray(extractPaths) && extractPaths.length ? extractPaths : fs.readdirSync(mount).filter((name) => !name.startsWith(".") && name !== "Applications");
    for (const relative of paths) {
      if (signal?.aborted) throw cancelled();
      const from = path.resolve(mount, relative), to = path.resolve(unpacked, relative);
      if (!insideRelative(relative) || !within(from, mount) || from === mount || !within(to, path.resolve(unpacked)) || !fs.existsSync(from)) throw fail("The disk image has no {path}.", { path: relative });
      // Resolved through symlinks (ditto follows them in the source path): an extract path must stay inside the image.
      const realMount = fs.realpathSync(mount), real = fs.realpathSync(from);
      if (real === realMount || !within(real, realMount)) throw fail("The disk image’s {path} points outside it.", { path: relative });
      fs.mkdirSync(path.dirname(to), { recursive: true });
      // A symlink copied by an earlier extract path must not carry this copy out of the release either.
      if (!within(fs.realpathSync(path.dirname(to)), fs.realpathSync(unpacked))) throw fail("The disk image’s {path} points outside it.", { path: relative });
      await run("ditto", [from, to], { timeout: 180000, signal });
    }
  } finally {
    // Detached even when attach was cut short; the mount point is removed only once it is an empty folder again.
    await run("hdiutil", ["detach", mount, "-force"]).catch(() => {});
    try { fs.rmdirSync(mount); } catch {}
  }
}

/** The agent binary inside an unpacked release: `<name>` or `<name>-<target triple>`, at any shallow depth. */
function findBinary(dir, name) {
  const found = [];
  // The name is a pack's agent.binary: matched literally, never as a pattern.
  const literal = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const triple = new RegExp(`^${literal}-(aarch64|x86_64|arm64|x64)-(apple-darwin|darwin)$`);
  const walk = (current, depth) => {
    if (depth > 4) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.isFile() && (entry.name === name || triple.test(entry.name))) found.push(full);
    }
  };
  walk(dir, 0);
  return found.sort((a, b) => a.length - b.length)[0] ?? null;
}

function createCoreManager({ dataDir, getConfig, save, emit = () => {}, setCoreChoice = () => {}, deepseekScript = () => null, bridgeScript = () => null,
  nodeBinary = () => process.execPath, fetchImpl = (...args) => systemFetch(...args), arch = process.arch, home = os.homedir(), env = process.env }) {
  const coresDir = () => path.join(dataDir(), "cores");
  const coreDir = (id) => path.join(coresDir(), id);
  // id → {controller, phase, received, total}: list() reports it, so Settings can poll progress.
  const downloads = new Map();
  const archKey = arch === "arm64" ? "arm64" : "x64";

  const stateDir = (id) => path.join(coreDir(id), STATE_DIR);
  function manifest(id) {
    try {
      const value = JSON.parse(fs.readFileSync(path.join(coreDir(id), "manifest.json"), "utf8"));
      if (!validVersion(value.version) || !insideRelative(value.binary)) return null;
      const binary = path.join(coreDir(id), value.version, value.binary);
      return (value.runner === "node" ? exists(binary) : executable(binary)) ? { ...value, path: binary } : null;
    } catch { return null; }
  }
  const systemPaths = (core) => (env.CODE_DESKTOP_CORE_SYSTEM_PATHS !== undefined ? env.CODE_DESKTOP_CORE_SYSTEM_PATHS.split(":").filter(Boolean) : core.agent?.systemPaths ?? []);
  function systemInstall(core) {
    for (const candidate of systemPaths(core)) {
      const file = expand(candidate, home);
      if (nodeScript(file) ? exists(file) : executable(file)) return file;
    }
    return null;
  }
  function assetFor(core) {
    if (env.CODE_DESKTOP_CORE_RELEASE_MANIFEST) {
      try {
        const all = JSON.parse(fs.readFileSync(env.CODE_DESKTOP_CORE_RELEASE_MANIFEST, "utf8"));
        const entry = all[core.id] ?? (all.url ? all : null);
        if (entry) return { name: `${core.id}.${entry.type === "zip" ? "zip" : entry.type === "binary" ? "bin" : "tar.gz"}`, type: "tar.gz", ...entry };
      } catch {}
    }
    return releaseAsset(core, archKey);
  }
  /** The agent this app or the user installed: {path, runner, version, source}, or null. */
  function agentOf(core) {
    if (!core.agent) return null;
    const app = manifest(core.id);
    if (app) return { path: app.path, runner: app.runner ?? "", version: app.version, source: "app" };
    const system = systemInstall(core);
    return system ? { path: system, runner: nodeScript(system) ? "node" : "", version: "", source: "system" } : null;
  }
  const usable = (core) => core.kind === "builtin" ? !!deepseekScript() : !!agentOf(core) && (core.kind !== "bridge" || !!bridgeScript(core));
  const chosen = () => {
    const core = coreById(getConfig()?.core);
    return core && core.available !== false ? core.id : "deepseek";
  };

  /** Point codex.cjs at the chosen core and every agent program found. */
  function apply() {
    const agents = {};
    // state: the folder a bridge keeps its own data in (CODE_DESKTOP_BRIDGE_STATE).
    for (const core of offeredCores()) {
      if (core.agent && !swept.has(core.id)) { swept.add(core.id); sweepLeftovers(core.id); }
      const agent = agentOf(core);
      if (agent) agents[core.id] = { ...agent, state: stateDir(core.id) };
    }
    setCoreChoice({ core: chosen(), agents });
  }

  // Cores whose download leftovers were swept in this run (once each, on the first apply at start).
  const swept = new Set();
  /**
   * Download folders and manifest temp files nothing will finish: from a quit or crash mid-download, or another
   * process that is gone (or a day old). This process's own in-flight download is kept.
   */
  function sweepLeftovers(id) {
    let items = [];
    try { items = fs.readdirSync(coreDir(id), { withFileTypes: true }); } catch { return; }
    const current = downloads.get(id)?.work;
    for (const item of items) {
      const full = path.join(coreDir(id), item.name);
      if (item.name === "manifest.json.tmp" && !current) { fs.rmSync(full, { force: true }); continue; }
      if (!item.name.startsWith(DOWNLOAD_PREFIX) || full === current) continue;
      const [, pid, time] = item.name.match(/^\.download-(\d+)-(\d+)$/) ?? [];
      const live = Number(pid) === process.pid ? !!current : !!pid && alive(Number(pid)) && Date.now() - Number(time) < 24 * 3600 * 1000;
      if (!live) fs.rmSync(full, { recursive: true, force: true });
    }
  }
  /** Bytes in a file or folder of this core, or 0 when it isn't there. */
  const folderSize = (file) => { try { const stat = fs.lstatSync(file); return stat.isDirectory() ? dirSize(file) : stat.size; } catch { return 0; } };

  async function versionOf(file, runner = "", args = ["--version"], signal) {
    try { return (await (runner === "node" ? run(nodeBinary(), [file, ...args], { signal }) : run(file, args, { signal }))).trim().split("\n")[0].slice(0, 120); } catch { return null; }
  }

  async function list() {
    const active = chosen();
    const rows = [];
    for (const core of offeredCores()) {
      const row = { id: core.id, name: core.name, vendor: core.vendor, brand: core.brand ?? null, tagline: core.tagline ?? null, kind: core.kind, models: core.models, homepage: core.homepage ?? null, license: core.license ?? null, selected: core.id === active };
      if (core.kind === "builtin") {
        const script = deepseekScript();
        Object.assign(row, { installed: !!script, source: script ? "built-in" : null, path: script, version: null });
      } else {
        const app = manifest(core.id), system = systemInstall(core);
        const file = app?.path ?? system;
        const asset = assetFor(core);
        const missingBridge = core.kind === "bridge" && !bridgeScript(core);
        const state = stateDir(core.id);
        const systemReported = !app && system ? await versionOf(system, nodeScript(system) ? "node" : "") : null;
        // The user's own install against the release this build pins and is tested with (e.g. Codex 0.155.1):
        // 1 the release is newer, 0 the same, -1 the install is newer; null when its version can't be read.
        const systemVersion = plainVersion(systemReported);
        Object.assign(row, {
          installed: !!file && !missingBridge, source: app ? "app" : system ? "system" : null, path: file,
          version: app?.version ?? systemReported,
          systemVersion,
          systemVsRelease: systemVersion && asset?.version ? compareVersions(asset.version, systemVersion) : null,
          // size: the downloaded copy alone (not the bridge state or an unfinished download).
          appInstall: app ? { version: app.version, size: folderSize(path.join(coreDir(core.id), app.version)) + folderSize(path.join(coreDir(core.id), "manifest.json")), path: app.path } : null,
          // The app's copy is older than the release this build pins: install() replaces it in place and keeps the state.
          updateAvailable: !!(app && asset?.version && compareVersions(asset.version, app.version) > 0),
          systemInstall: system,
          missingBridge,
          // The bridge's own data (threads, connectors, settings), kept across install, update and Remove download.
          bridgeState: fs.existsSync(state) ? { path: state, size: folderSize(state) } : null,
          release: asset ? { version: asset.version, size: asset.size ?? null, url: asset.url } : null,
          download: downloads.has(core.id) ? (({ phase, received, total }) => ({ phase, received, total }))(downloads.get(core.id)) : null,
        });
      }
      rows.push(row);
    }
    return { cores: rows, selected: active, dataDir: coresDir() };
  }

  async function unpack(asset, archive, unpacked, signal) {
    const type = asset.type ?? "tar.gz";
    if (type === "tar.gz" || type === "tgz") await run("tar", ["-xzf", archive, "-C", unpacked], { timeout: 180000, signal });
    else if (type === "zip") await run("ditto", ["-x", "-k", archive, unpacked], { timeout: 180000, signal });
    else if (type === "binary") fs.copyFileSync(archive, path.join(unpacked, asset.binaryName ?? path.basename(archive)));
    else if (type === "dmg") await unpackDmg(archive, unpacked, asset.extractPaths, signal);
    else throw fail("Unsupported release type {type}.", { type });
  }

  async function install(id) {
    const core = coreById(id);
    if (!core || !core.agent || core.available === false) throw fail("This core can’t be downloaded.");
    if (downloads.has(id)) throw fail("That core is already downloading.");
    const asset = assetFor(core);
    if (!asset?.url) throw fail("There is no release of this core for this Mac.");
    // Checked before anything is fetched or removed: the release decides paths under <userData>/cores/<id>.
    const problem = releaseProblem(asset, core);
    if (problem) throw fail("This release of {name} can’t be installed: {problem}.", { name: core.name, problem: t(problem) });
    const controller = new AbortController(), { signal } = controller;
    const work = path.join(coreDir(id), `${DOWNLOAD_PREFIX}${process.pid}-${Date.now()}`);
    const state = { controller, phase: "download", received: 0, total: asset.size, work };
    sweepLeftovers(id);
    downloads.set(id, state);
    const progress = (phase, extra = {}) => { Object.assign(state, { phase }, extra); emit({ kind: "core-install", id, phase, ...extra }); };
    // Cancel is honoured between every step, and aborts the running tar/ditto/hdiutil/--version child.
    const checkCancel = () => { if (signal.aborted) throw cancelled(); };
    try {
      fs.mkdirSync(work, { recursive: true });
      const name = path.basename(String(asset.name ?? ""));
      const archive = path.join(work, plainName(name) ? name : "release");
      progress("download", { received: 0, total: asset.size });
      let response;
      try { response = await fetchImpl(asset.url, { signal, redirect: "follow" }); }
      catch (error) { throw signal.aborted ? cancelled() : fail("Couldn’t download {url}: {error}", { url: asset.url, error: error?.message || error }); }
      if (!response.ok || !response.body) throw fail("{url} answered {status}.", { url: asset.url, status: response.status });
      const hash = crypto.createHash("sha256"), out = fs.createWriteStream(archive);
      let received = 0, last = 0;
      try {
        for await (const chunk of response.body) {
          const buffer = Buffer.from(chunk);
          hash.update(buffer); received += buffer.length;
          if (received > asset.size) throw fail("The download is larger than the {size} bytes the release names.", { size: asset.size });
          if (!out.write(buffer)) await new Promise((resolve) => out.once("drain", resolve));
          if (received - last > 512 * 1024) { last = received; progress("download", { received, total: asset.size }); }
        }
      } catch (error) {
        throw signal.aborted ? cancelled() : fail("The download stopped: {error}", { error: error?.message || error });
      } finally {
        await new Promise((resolve) => out.end(resolve));
      }
      checkCancel();
      progress("verify", { received, total: asset.size });
      if (received !== asset.size) throw fail("The download is {received} bytes, expected {size}.", { received, size: asset.size });
      const digest = hash.digest("hex");
      if (digest !== asset.sha256.toLowerCase()) throw fail("The download doesn’t match the release checksum, so it wasn’t installed.");
      checkCancel();
      progress("extract");
      const unpacked = path.join(work, "unpacked");
      fs.mkdirSync(unpacked);
      await unpack(asset, archive, unpacked, signal);
      checkCancel();
      // The new copy is staged inside the download folder; the installed one is untouched until it starts.
      const staged = path.join(work, "staged");
      // The entry, resolved through every symlink, must be a regular file inside the unpacked release before anything
      // moves, chmods or runs it: an archive can carry a symlinked folder (d -> ~/Documents) or a symlinked entry.
      const realUnpacked = fs.realpathSync(unpacked);
      const insideRelease = (file, shown) => {
        let real;
        try { real = fs.realpathSync(file); } catch { throw fail("The release has no {path}.", { path: shown }); }
        if (!within(real, realUnpacked)) throw fail("The release’s {path} points outside it.", { path: shown });
        if (!fs.statSync(real).isFile()) throw fail("The release has no {path}.", { path: shown });
        return real;
      };
      let relative;
      if (asset.keep === "dir") {
        // The whole tree stays (a Node CLI with its files); binaryPath names the entry inside it.
        insideRelease(path.join(unpacked, asset.binaryPath), asset.binaryPath);
        fs.renameSync(unpacked, staged);
        relative = asset.binaryPath;
      } else {
        const found = asset.binaryPath ? path.join(unpacked, asset.binaryPath) : findBinary(unpacked, core.agent.binary);
        if (!found) throw fail("The release has no {binary} binary.", { binary: core.agent.binary });
        // The real file is moved, never a symlink to it (a link moved into staged could point anywhere).
        const real = insideRelease(found, asset.binaryPath ?? core.agent.binary);
        fs.mkdirSync(staged);
        relative = core.agent.binary;
        const destination = path.resolve(staged, relative);
        // releaseProblem already refused an agent.binary that isn't a plain file name; checked again before the move.
        if (!plainName(relative) || path.dirname(destination) !== path.resolve(staged)) throw fail("The release’s {path} points outside it.", { path: relative });
        fs.renameSync(real, destination);
      }
      const entry = path.join(staged, relative);
      // A symlinked entry must not lead out of the release (chmod and --version follow it).
      if (!within(fs.realpathSync(entry), fs.realpathSync(staged))) throw fail("The release’s {path} points outside it.", { path: relative });
      if (asset.runner !== "node") fs.chmodSync(entry, 0o755);
      const version = await versionOf(entry, asset.runner ?? "", asset.versionArgs ?? ["--version"], signal);
      checkCancel();
      if (!version) throw fail("The downloaded {binary} didn’t start.", { binary: core.agent.binary ?? path.basename(relative) });
      // Commit: swap the staged copy in, then the manifest. Past this point Cancel no longer applies.
      const target = path.join(coreDir(id), asset.version), previous = path.join(work, "previous");
      if (!validVersion(asset.version) || path.dirname(path.resolve(target)) !== path.resolve(coreDir(id))) throw fail("This release’s version isn’t a plain version name.");
      // Belt and braces for a file system that folds names some other way: the version folder is never the bridge state.
      if (fs.existsSync(target) && fs.existsSync(stateDir(id)) && fs.statSync(target).ino === fs.statSync(stateDir(id)).ino) throw fail("This release’s version isn’t a plain version name.");
      state.committing = true;
      if (fs.existsSync(target)) fs.renameSync(target, previous);
      try { fs.renameSync(staged, target); }
      catch (error) { if (fs.existsSync(previous) && !fs.existsSync(target)) fs.renameSync(previous, target); throw error; }
      const record = { version: asset.version, binary: relative, runner: asset.runner ?? "", reported: version, sha256: digest, source: asset.url, installedAt: new Date().toISOString() };
      fs.writeFileSync(path.join(coreDir(id), "manifest.json.tmp"), JSON.stringify(record, null, 2) + "\n");
      fs.renameSync(path.join(coreDir(id), "manifest.json.tmp"), path.join(coreDir(id), "manifest.json"));
      // Older downloaded versions go; the bridge state and dot-folders (in-flight downloads) stay.
      for (const item of fs.readdirSync(coreDir(id), { withFileTypes: true }))
        if (item.isDirectory() && item.name !== asset.version && !reservedName(item.name) && !item.name.startsWith(".")) fs.rmSync(path.join(coreDir(id), item.name), { recursive: true, force: true });
      apply();
      progress("done", { version: asset.version });
      return list();
    } catch (error) {
      const failure = signal.aborted && !state.committing ? cancelled() : error;
      progress("failed", { error: failure?.message || String(failure) });
      throw failure;
    } finally {
      downloads.delete(id);
      fs.rmSync(work, { recursive: true, force: true });
    }
  }

  function cancel(id) {
    const download = downloads.get(id);
    if (download && !download.committing) download.controller.abort();
    return true;
  }

  /**
   * Remove download: the downloaded versions and manifest go; the bridge state (threads, connectors, settings) stays
   * unless removeState is true, so a system install, or a later download, picks up where the user left off.
   */
  async function uninstall(id, { removeState = false } = {}) {
    const core = coreById(id);
    if (!core || !core.agent) throw fail("This core isn’t installed by OpenClaude Desktop.");
    if (downloads.has(id)) throw fail("Wait for the download to finish or cancel it first.");
    let items = [];
    try { items = fs.readdirSync(coreDir(id), { withFileTypes: true }); } catch {}
    for (const item of items)
      if (removeState || item.name.toLowerCase() !== STATE_DIR) fs.rmSync(path.join(coreDir(id), item.name), { recursive: true, force: true });
    try { fs.rmdirSync(coreDir(id)); } catch {}
    // Without any copy left, the choice falls back to the DeepSeek core.
    if (chosen() === id && !usable(core)) { getConfig().core = "deepseek"; save(); }
    apply();
    return list();
  }

  async function select(id) {
    const core = coreById(id);
    if (!core || core.available === false) throw fail("Unknown core.");
    if (!usable(core)) throw fail(core.kind === "builtin" ? "{name} isn’t available." : core.kind === "bridge" && agentOf(core) ? "The {name} adapter is missing." : "Install {name} first.", { name: core.name });
    getConfig().core = id;
    save();
    apply();
    return list();
  }

  async function runOp(p = {}) {
    switch (p.op) {
      case "list": return list();
      case "install": return install(p.id);
      case "cancel": return cancel(p.id);
      case "uninstall": return uninstall(p.id, { removeState: p.removeState === true });
      case "select": return select(p.id);
      default: throw fail("Unsupported cores operation.");
    }
  }

  // The Terminal pane's command shims (terminalShims): every agent this app installed, by its binary name, so a
  // "run it in a terminal" fallback (`qwen extensions install …`) works in the app's own terminal too. A Node CLI runs
  // under the app's Node (the runner the cores use); a native binary is linked. Written into `dir`, which the terminal
  // appends to PATH (an agent the user installed themselves stays first).
  function terminalShims(dir) {
    const wanted = new Map();
    for (const core of offeredCores()) {
      const name = core.agent?.binary;
      if (typeof name !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(name)) continue;
      const installed = manifest(core.id);
      if (installed) wanted.set(name, installed);
    }
    try { fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); } catch { return null; }
    const quote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
    for (const [name, installed] of wanted) {
      const file = path.join(dir, name);
      const body = installed.runner === "node"
        ? `#!/bin/sh\n# OpenClaude Desktop: the ${name} it installed, under its own Node.\nELECTRON_RUN_AS_NODE=1 exec ${quote(nodeBinary())} ${quote(installed.path)} "$@"\n`
        : `#!/bin/sh\n# OpenClaude Desktop: the ${name} it installed.\nexec ${quote(installed.path)} "$@"\n`;
      try {
        let current = null;
        try { current = fs.readFileSync(file, "utf8"); } catch {}
        if (current !== body) { fs.writeFileSync(file + ".tmp", body, { mode: 0o755 }); fs.renameSync(file + ".tmp", file); }
      } catch {}
    }
    // A shim for an agent no longer installed by the app goes.
    try { for (const entry of fs.readdirSync(dir)) if (!wanted.has(entry)) { try { fs.rmSync(path.join(dir, entry), { force: true }); } catch {} } } catch {}
    return dir;
  }

  return { run: runOp, apply, list, install, cancel, uninstall, select, terminalShims };
}

module.exports = { createCoreManager, findBinary, releaseProblem, compareVersions, plainVersion };
