// Extension Packs: OpenClaude Desktop is the frame; an Extension Pack adds an agent core to it (core-registry.mjs).
//
// A pack is a folder or a .zip with
//   manifest.json   {format: 1, version, core: {id, name, assistant?, vendor, engine, kind: "bridge"|"native", models?, homepage?,
//                    license?, sessionPrefix?, implies?: {capability: true|false, sandboxNetwork?: "policy"|"always", nativeTools?: [name]},
//                    configFile?, skillRoots?, login?, sandbox?: false, historyLocation?, sessionStore?, workflowModelTiers?, plugins?: {format, placeholder,
//                    registries?}, bridge?: {script: "bridge/bin/app-server.mjs"}, agent?: {binary, systemPaths?, release?}}}
//                   (the fields are described in core-registry.mjs)
//   bridge/…        the adapter that makes the agent speak the Codex app-server protocol (kind "bridge"), run with Node
//   README.md       optional
// Importing is two steps: inspect (unpack to a staging folder, validate, summarize — nothing is installed) and install
// (the staged copy moves to <userData>/extensions/<id>/, replacing an older version of the same pack). Installed
// packs are registered at startup (load) and whenever they change; the renderer gets them as boot.extensionCores.
// Bundled packs: the packs this app ships in extensions/<id> (Codex), offered in Settings › Cores until added, and
// added through the same inspect → install as any pack (installBundled skips the confirmation for a choice the user
// already made: config.core naming a bundled pack that isn't installed).
// A pack runs code on this Mac (its bridge or its agent), so the import UI shows that before installing. The agent program a
// pack names is downloaded from its official release by core-manager.cjs, like any core.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFile } = require("node:child_process");
const { registerCores, releaseAsset } = require("./core-registry.mjs");
const { releaseProblem } = require("./core-manager.cjs");
const { cleanSessionStore } = require("./settings-pages.cjs");

const FORMAT = 1;
const ID = /^[a-z][a-z0-9-]{1,31}$/;
const RESERVED = new Set(["deepseek"]);
const MAX_FILES = 5000, MAX_BYTES = 200 * 1024 * 1024;
const CAPABILITY = /^[A-Za-z][A-Za-z0-9]{0,40}$/;
// Capabilities whose value is a word rather than true/false (core-registry.mjs header), with the words allowed.
const WORD_CAPABILITIES = Object.freeze({ sandboxNetwork: Object.freeze(["policy", "always"]), reviewReadOnly: Object.freeze(["sandbox", "noEdits"]) });
// Capabilities whose value is a list of names: nativeTools, the Claude Code tools the agent has itself (OpenClaude Desktop's
// stand-ins for them aren't offered to it; main.cjs agentToolServedToCore).
const LIST_CAPABILITIES = Object.freeze({ nativeTools: /^[A-Za-z][A-Za-z0-9_]{0,63}$/ });
const capabilityValue = (key, value) => value === true || value === false || (Object.hasOwn(WORD_CAPABILITIES, key) && WORD_CAPABILITIES[key].includes(value))
  || (Object.hasOwn(LIST_CAPABILITIES, key) && Array.isArray(value) && value.length <= 64 && value.every((entry) => typeof entry === "string" && LIST_CAPABILITIES[key].test(entry)));

const run = (file, args, options = {}) => new Promise((resolve, reject) => {
  execFile(file, args, { timeout: 120000, maxBuffer: 1 << 20, ...options }, (error, stdout) => error ? reject(error) : resolve(String(stdout)));
});
const text = (value, max) => (typeof value === "string" && value.trim() && value.length <= max && !/[\x00-\x1f\x7f]/.test(value) ? value.trim() : null);
const inside = (root, relative) => {
  if (typeof relative !== "string" || !relative || path.isAbsolute(relative)) return null;
  const full = path.resolve(root, relative);
  return full === root || full.startsWith(root + path.sep) ? full : null;
};

/** Every regular file under dir (no symlinks followed): {count, bytes, links}. */
// fs.cpSync copies natively and can't read inside app.asar, where the bundled packs (Codex) ship; this copy goes
// through the asar-aware readdir/readFile and keeps file modes and symbolic links (walk() then refuses the links).
function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name), target = path.join(to, entry.name);
    if (entry.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(source), target);
    else if (entry.isDirectory()) copyTree(source, target);
    else if (entry.isFile()) { fs.writeFileSync(target, fs.readFileSync(source)); fs.chmodSync(target, fs.statSync(source).mode & 0o777); }
  }
}

// Dotted numeric versions ("0.162.1" > "0.155.1"); a non-numeric part compares as 0.
function compareVersions(a, b) {
  const left = String(a).split(/[.-]/), right = String(b).split(/[.-]/);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (parseInt(left[index], 10) || 0) - (parseInt(right[index], 10) || 0);
    if (difference) return Math.sign(difference);
  }
  return 0;
}

function walk(dir) {
  let count = 0, bytes = 0, links = 0;
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) { links += 1; continue; }
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) { count += 1; bytes += fs.statSync(full).size; }
      if (count > MAX_FILES || bytes > MAX_BYTES) throw new Error("The extension pack is too large.");
    }
  };
  visit(dir);
  return { count, bytes, links };
}

// Settings › Account / setup sign-in options a pack's core offers (core-registry.mjs `login`): browser [{provider?, type?,
// label, deviceCode?: true}], deviceCode [{type, provider?, label}] (account/login/start types), apiKey [{template?,
// label, keyUrl?, keyPlaceholder?, keyPrefix?}] (keyPrefix: one or a few short prefixes, account-operations keyTypeMismatch), plus store (a "~/…" folder) and signOutRemovesKeys. A login with no option is no login (null): the
// core has nothing to sign in to here, and registerCores keeps the built-in descriptor's options for its id.
const LOGIN_TYPE = /^[A-Za-z][A-Za-z0-9]{0,39}$/;
const HOME_PATH = /^~\/[^\x00-\x1f\x7f]{1,200}$/;
const KEY_PREFIX = /^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$/;
function keyHints(entry) {
  const placeholder = text(entry.keyPlaceholder, 80);
  const prefixes = [].concat(entry.keyPrefix ?? []).filter((prefix) => typeof prefix === "string" && KEY_PREFIX.test(prefix)).slice(0, 4);
  return { ...(placeholder ? { keyPlaceholder: placeholder } : {}), ...(prefixes.length ? { keyPrefix: prefixes.length === 1 ? prefixes[0] : prefixes } : {}) };
}
function cleanLogin(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = (list) => (Array.isArray(list) ? list : []).filter((entry) => entry && typeof entry === "object");
  const type = (entry) => (LOGIN_TYPE.test(entry.type ?? "") ? { type: entry.type } : {});
  const provider = (entry) => { const name = text(entry.provider, 60); return name ? { provider: name } : {}; };
  const browser = entries(value.browser).map((entry) => ({ ...provider(entry), ...type(entry), label: text(entry.label, 120), ...(entry.deviceCode === true ? { deviceCode: true } : {}) }))
    .filter((entry) => entry.label && (entry.provider || entry.type)).slice(0, 8);
  const deviceCode = entries(value.deviceCode).map((entry) => ({ ...type(entry), ...provider(entry), label: text(entry.label, 120) })).filter((entry) => entry.type && entry.label).slice(0, 8);
  const apiKey = entries(value.apiKey).map((entry) => { const template = text(entry.template, 60); return { ...(template ? { template } : {}), label: text(entry.label, 120),
    ...(/^https:\/\//.test(entry.keyUrl ?? "") ? { keyUrl: String(entry.keyUrl).slice(0, 300) } : {}), ...keyHints(entry) }; }).filter((entry) => entry.label).slice(0, 24);
  if (!browser.length && !deviceCode.length && !apiKey.length) return null;
  return { browser, ...(deviceCode.length ? { deviceCode } : {}), apiKey, ...(HOME_PATH.test(value.store ?? "") ? { store: value.store } : {}),
    ...(value.signOutRemovesKeys === true ? { signOutRemovesKeys: true } : {}) };
}

// The Add plugin form's copy (customize-model pluginFormCopy): English sentences, translated through t().
function cleanPlugins(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const format = text(value.format, 200), placeholder = text(value.placeholder, 80);
  return format || placeholder ? { ...(format ? { format } : {}), ...(placeholder ? { placeholder } : {}), ...(value.registries === true ? { registries: true } : {}) } : null;
}

// agent.systemPaths: where the user may already have the agent ("~/.local/bin/kimi", "/opt/homebrew/bin/kimi");
// core-manager.cjs runs the first one that exists (a .js/.mjs/.cjs one with Node). Only "~/…" or absolute strings
// are kept (at most 12; anything else is dropped). One that lands in this app's data folder (where packs and
// downloaded agents are installed, so a pack could name a file it ships) or in the pack itself is refused: a
// pack's code runs only as its bridge or its agent release, never as a "system" install.
const MAX_SYSTEM_PATHS = 12;
const SYSTEM_PATH = /^(~\/|\/)[^\x00-\x1f\x7f]{1,300}$/;
const DEFAULT_DATA_DIR = path.join(os.homedir(), "Library", "Application Support", "OpenClaude Desktop");
// The path with its longest existing ancestor resolved through symlinks, compared case-insensitively (APFS).
function canonical(file) {
  let head = path.resolve(file), tail = [];
  while (true) {
    try { head = fs.realpathSync.native(head); break; }
    catch { const parent = path.dirname(head); if (parent === head) break; tail.unshift(path.basename(head)); head = parent; }
  }
  return path.join(head, ...tail).normalize("NFC").toLowerCase();
}
const within = (file, folder) => file === folder || file.startsWith(folder.endsWith(path.sep) ? folder : folder + path.sep);
function cleanSystemPaths(value, forbidden) {
  if (!Array.isArray(value)) return null;
  const kept = value.filter((entry) => typeof entry === "string" && SYSTEM_PATH.test(entry)).slice(0, MAX_SYSTEM_PATHS);
  const folders = forbidden.filter(Boolean).map(canonical);
  for (const entry of kept) {
    const file = canonical(entry.startsWith("~/") ? path.join(os.homedir(), entry.slice(2)) : entry);
    if (folders.some((folder) => within(file, folder)))
      throw new Error("The extension pack’s agent.systemPaths can’t point into OpenClaude Desktop’s own folders or the pack itself.");
  }
  return kept;
}

/**
 * Validate a pack folder's manifest; throws a user-facing Error. Returns {manifest, core} (core is the clean descriptor).
 * @param {string} root - the pack folder
 * @param {{dataDir?: string}} [options] - this app's data folder (extensions/, cores/), refused in agent.systemPaths
 */
function cleanModelTiers(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out = {};
  for (const tier of ["opus", "sonnet", "haiku"]) {
    const list = (Array.isArray(value[tier]) ? value[tier] : []).filter((entry) => typeof entry === "string" && entry && entry.length <= 200)
      .filter((entry) => { try { new RegExp(entry, "i"); return true; } catch { return false; } }).slice(0, 6);
    if (list.length) out[tier] = list;
  }
  return Object.keys(out).length ? out : null;
}
function validatePack(root, { dataDir } = {}) {
  root = path.resolve(root);
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8")); }
  catch { throw new Error("This isn’t an extension pack: manifest.json is missing or not valid JSON."); }
  if (manifest?.format !== FORMAT) throw new Error(`This extension pack needs a newer OpenClaude Desktop (format ${manifest?.format ?? "unknown"}).`);
  const source = manifest.core;
  if (!source || typeof source !== "object") throw new Error("The extension pack has no core.");
  const id = typeof source.id === "string" ? source.id : "";
  if (!ID.test(id)) throw new Error("The extension pack’s core id must be 2–32 lowercase letters, digits or hyphens.");
  if (RESERVED.has(id)) throw new Error(`“${id}” is a built-in core and can’t be replaced by an extension pack.`);
  const name = text(source.name, 60), vendor = text(source.vendor, 60) ?? "";
  if (!name) throw new Error("The extension pack’s core needs a name.");
  const kind = source.kind === "native" ? "native" : "bridge";
  // assistant: how the copy names the agent while this core runs ("Message Kimi"); registerCores falls back to the
  // built-in descriptor's, then to the name.
  const core = { id, name, assistant: text(source.assistant, 40), vendor, engine: text(source.engine, 60) ?? id, kind,
    models: text(source.models, 300) ?? "", brand: /^[a-z0-9-]{1,40}$/.test(source.brand ?? "") ? source.brand : null, tagline: text(source.tagline, 160), homepage: /^https:\/\//.test(source.homepage ?? "") ? String(source.homepage).slice(0, 300) : null,
    license: text(source.license, 80), sessionPrefix: typeof source.sessionPrefix === "string" && /^[\x20-\x7e]{1,40}$/.test(source.sessionPrefix) ? source.sessionPrefix : `${id} `,
    implies: Object.fromEntries(Object.entries(source.implies && typeof source.implies === "object" ? source.implies : {}).filter(([key, value]) => CAPABILITY.test(key) && capabilityValue(key, value))),
    configFile: text(source.configFile, 200), ...(text(source.mcpConfigFile, 200) ? { mcpConfigFile: text(source.mcpConfigFile, 200) } : {}), skillRoots: (Array.isArray(source.skillRoots) ? source.skillRoots : []).map((entry) => text(entry, 200)).filter(Boolean).slice(0, 12),
    agent: source.agent && typeof source.agent === "object" ? JSON.parse(JSON.stringify(source.agent)) : null,
    login: cleanLogin(source.login) };
  // sandbox: false (approved commands run unconfined); historyLocation: the core's own history folder; plugins: Add plugin copy.
  if (source.sandbox === false) core.sandbox = false;
  if (HOME_PATH.test(source.historyLocation ?? "")) core.historyLocation = source.historyLocation;
  // home: the "~/…" folder the core's own files sit in (Codex: ~/.codex; core-registry corePath).
  if (HOME_PATH.test(source.home ?? "")) core.home = source.home;
  // sessionStore: where the core keeps a session, for Settings › Storage (settings-pages.cjs cleanSessionStore checks it).
  const sessionStore = cleanSessionStore(source.sessionStore);
  if (sessionStore) core.sessionStore = sessionStore;
  const plugins = cleanPlugins(source.plugins);
  if (plugins) core.plugins = plugins;
  // securityUrl: the core's own sandbox/approval guidance, linked from the Bypass permissions dialog.
  if (/^https:\/\//.test(source.securityUrl ?? "")) core.securityUrl = String(source.securityUrl).slice(0, 300);
  // workflowModelTiers: {opus|sonnet|haiku: [pattern…]}, the core's models for Claude tiers in workflow scripts.
  const tiers = cleanModelTiers(source.workflowModelTiers);
  if (tiers) core.workflowModelTiers = tiers;
  // workflowFolders: the core's own saved-workflow folders (".qwen/workflows"), relative to a project and to the home folder.
  const workflowFolders = (Array.isArray(source.workflowFolders) ? source.workflowFolders : []).filter((entry) => typeof entry === "string" && /^\.[\w.-]+\/workflows$/.test(entry)).slice(0, 4);
  if (workflowFolders.length) core.workflowFolders = workflowFolders;
  if (kind === "bridge") {
    const script = inside(root, source.bridge?.script);
    if (!script || !fs.existsSync(script) || !fs.statSync(script).isFile()) throw new Error("The extension pack’s bridge script is missing.");
    core.bridge = { script: path.relative(root, script) };
  }
  if (core.agent) {
    const systemPaths = cleanSystemPaths(core.agent.systemPaths, [DEFAULT_DATA_DIR, dataDir, root]);
    if (systemPaths?.length) core.agent.systemPaths = systemPaths;
    else delete core.agent.systemPaths;
  }
  if (kind === "native" && !core.agent?.binary) throw new Error("A native core needs its agent program (agent.binary).");
  // The agent program is untrusted too: refuse a binary name or release core-manager.cjs would refuse at install.
  const binary = core.agent?.binary;
  if (binary != null && (typeof binary !== "string" || !binary || binary === "." || binary === ".." || /[\/\\\x00]/.test(binary)))
    throw new Error("The extension pack’s agent binary must be a plain file name.");
  for (const arch of Object.keys(core.agent?.release?.assets ?? {})) {
    const asset = releaseAsset(core, arch), problem = asset && releaseProblem(asset, core);
    if (problem) throw new Error(`The extension pack’s agent release for ${arch} can’t be installed: ${problem}.`);
  }
  return { manifest: { format: FORMAT, version: text(manifest.version, 40) ?? "0.0.0", description: text(manifest.description, 500) ?? "" }, core };
}

// The packs this app ships (extensions/ beside electron/: in the repository and in the packaged app alike).
const BUNDLED_DIR = path.resolve(__dirname, "..", "extensions");

function createExtensionPacks({ dataDir, getConfig = () => ({}), save = () => {}, onChange = () => {}, env = process.env, bundledDir = BUNDLED_DIR }) {
  const root = () => path.join(dataDir(), "extensions");
  const staging = new Map(); // token → {dir, temp}

  /** The installed packs: [{core (registered descriptor), manifest, dir}]. Broken ones are skipped. */
  function installed() {
    let names = [];
    try { names = fs.readdirSync(root(), { withFileTypes: true }).filter((entry) => entry.isDirectory() && ID.test(entry.name)).map((entry) => entry.name); } catch { return []; }
    const packs = [];
    for (const name of names) {
      const dir = path.join(root(), name);
      try {
        const { manifest, core } = validatePack(dir, { dataDir: dataDir() });
        if (core.id !== name) continue;
        packs.push({ manifest, dir, core: { ...core, pack: { version: manifest.version, dir }, ...(core.bridge ? { bridge: { ...core.bridge, path: path.join(dir, core.bridge.script) } } : {}) } });
      } catch {}
    }
    return packs;
  }
  /** The registered descriptors (boot.extensionCores). */
  const descriptors = () => installed().map((pack) => pack.core);
  function load() {
    registerCores(descriptors());
    return descriptors();
  }
  const summary = (core, manifest, stats, extra = {}) => ({
    id: core.id, name: core.name, vendor: core.vendor, kind: core.kind, models: core.models, homepage: core.homepage, license: core.license,
    version: manifest.version, description: manifest.description, capabilities: Object.keys(core.implies).filter((key) => core.implies[key] === true), files: stats.count, bytes: stats.bytes,
    // Every pack runs code: a bridge runs its own script, a native pack always runs some agent program (downloaded or
    // found at agent.systemPaths).
    runsCode: true, downloadsAgent: !!core.agent?.release, agentBinary: core.agent?.binary ?? null, ...extra,
  });

  async function inspect(source) {
    const target = typeof source === "string" ? source : "";
    if (!target || !path.isAbsolute(target) || !fs.existsSync(target)) throw new Error("Choose an extension pack (a folder or a .zip).");
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "code-desktop-pack-"));
    try {
      let dir = path.join(temp, "pack");
      if (fs.statSync(target).isDirectory()) copyTree(target, dir);
      else if (/\.zip$/i.test(target)) {
        await run("ditto", ["-x", "-k", target, dir]);
        // A zip of the folder itself: its single top-level folder is the pack.
        const top = fs.readdirSync(dir).filter((name) => !name.startsWith(".") && name !== "__MACOSX");
        if (!fs.existsSync(path.join(dir, "manifest.json")) && top.length === 1 && fs.statSync(path.join(dir, top[0])).isDirectory()) dir = path.join(dir, top[0]);
      } else throw new Error("Choose an extension pack: a folder or a .zip.");
      const stats = walk(dir);
      if (stats.links) throw new Error("The extension pack contains symbolic links, which aren’t allowed.");
      const { manifest, core } = validatePack(dir, { dataDir: dataDir() });
      const token = crypto.randomUUID();
      staging.set(token, { dir, temp });
      const existing = installed().find((pack) => pack.core.id === core.id);
      return summary(core, manifest, stats, { token, replaces: existing ? existing.manifest.version : null });
    } catch (error) {
      fs.rmSync(temp, { recursive: true, force: true });
      throw error;
    }
  }

  function discard(token) {
    const staged = staging.get(token);
    if (staged) fs.rmSync(staged.temp, { recursive: true, force: true });
    staging.delete(token);
    return true;
  }

  async function install(token) {
    const staged = staging.get(token);
    if (!staged) throw new Error("Inspect the extension pack again.");
    try {
      const { core } = validatePack(staged.dir, { dataDir: dataDir() });
      fs.mkdirSync(root(), { recursive: true });
      const target = path.join(root(), core.id), previous = `${target}.previous-${process.pid}`;
      if (fs.existsSync(target)) fs.renameSync(target, previous);
      try { fs.cpSync(staged.dir, target, { recursive: true }); }
      catch (error) { fs.rmSync(target, { recursive: true, force: true }); if (fs.existsSync(previous)) fs.renameSync(previous, target); throw error; }
      fs.rmSync(previous, { recursive: true, force: true });
      load();
      onChange();
      return { installed: core.id, packs: list() };
    } finally {
      discard(token);
    }
  }

  function remove(id) {
    if (!ID.test(id ?? "")) throw new Error("Unknown extension pack.");
    const target = path.join(root(), id);
    if (!fs.existsSync(target)) throw new Error("Unknown extension pack.");
    fs.rmSync(target, { recursive: true, force: true });
    // Its downloaded agent stays with core-manager.cjs (cores/<id>); the choice falls back to the DeepSeek core.
    const config = getConfig();
    if (config?.core === id) { config.core = "deepseek"; save(); }
    load();
    onChange();
    return { removed: id, packs: list() };
  }

  function list() {
    return installed().map(({ core, manifest, dir }) => summary(core, manifest, walk(dir), { dir }));
  }

  /** The bundled packs not added yet: [{id, name, vendor, models, brand, version, description, path}] (Settings › Cores offers them). */
  function bundled() {
    let names = [];
    try { names = fs.readdirSync(bundledDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && ID.test(entry.name)).map((entry) => entry.name); } catch { return []; }
    const added = new Set(installed().map((pack) => pack.core.id));
    const offers = [];
    for (const name of names) {
      const dir = path.join(bundledDir, name);
      try {
        const { manifest, core } = validatePack(dir, { dataDir: dataDir() });
        if (core.id !== name || added.has(core.id)) continue;
        offers.push({ id: core.id, name: core.name, vendor: core.vendor, models: core.models, brand: core.brand, version: manifest.version, description: manifest.description, path: dir });
      } catch {}
    }
    return offers;
  }
  /**
   * Bundled packs the user added from an older OpenClaude Desktop: the app's own newer copy replaces them (a pack pins its
   * agent's release, so an old copy keeps an old agent — Codex 0.155 can't list gpt-6.1-sol). Returns the ids updated.
   */
  async function upgradeBundled() {
    let names = [];
    try { names = fs.readdirSync(bundledDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && ID.test(entry.name)).map((entry) => entry.name); } catch { return []; }
    const updated = [];
    for (const name of names) {
      const existing = installed().find((pack) => pack.core.id === name);
      if (!existing) continue;
      try {
        const dir = path.join(bundledDir, name);
        const { manifest } = validatePack(dir, { dataDir: dataDir() });
        if (compareVersions(manifest.version, existing.manifest.version) <= 0) continue;
        const { token } = await inspect(dir);
        await install(token);
        updated.push(name);
      } catch (error) { console.warn(`Bundled pack ${name} update failed:`, error?.message ?? error); }
    }
    return updated;
  }
  /** Add a bundled pack without asking (a choice already made); false when there is none or it's already added. */
  async function installBundled(id) {
    const offer = bundled().find((entry) => entry.id === id);
    if (!offer) return false;
    const { token } = await inspect(offer.path);
    await install(token);
    return true;
  }

  /** The import picker's answer: CODE_DESKTOP_PICK_PACK (automation), else null for the caller's dialog. */
  const pickOverride = () => (typeof env.CODE_DESKTOP_PICK_PACK === "string" && env.CODE_DESKTOP_PICK_PACK ? env.CODE_DESKTOP_PICK_PACK : null);

  return { load, descriptors, list, bundled, installBundled, upgradeBundled, inspect, install, discard, remove, pickOverride, root };
}

module.exports = { createExtensionPacks, validatePack, FORMAT, BUNDLED_DIR };
