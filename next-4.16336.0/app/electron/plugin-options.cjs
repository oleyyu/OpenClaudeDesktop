"use strict";
// A plugin's Settings tab (menus:N2): the main-process half of 3.6556.2 getPluginOptions / setPluginOptions.
//
// Official (asar/.vite/build): index.chunk-jPKPzV-P.js registers both on the LocalPlugins bridge
// (`getPluginOptions:async(e,t)=>Eva(t)?(await Dva()).readPluginOptions(e):null`, `Eva(e){return e?.mode==="ccd"}`),
// and index.chunk-CpAqf7sl.js implements them: `g(e)` finds the installed plugin (GrowthBook "2795119042", on by
// default), reads `<installPath>/.claude-plugin/plugin.json` (`SO`, at most 262144 bytes, a JSON object) and keeps it
// only when `d && !d.includes("@") && R5(f) && Object.keys(f).length > 0` (d = the manifest's name, f = userConfig);
// `C(e)` answers {schema, inputs, choices, configured, unconfigured} (u2) and `F(e, n, r)` saves after the native
// "Save these settings for the plugin “{plugin}”?" consent, answering {success, saved, refused, tooLong, tooMuch,
// unconfirmed} (d2).
//
// Host differences: the official reads and writes the values through the Claude Code CLI (`plugin configure --json
// [--values-stdin]`); this host has no such CLI, so the declared userConfig is read from the plugin's own manifest and
// the values are kept on this computer in one JSON file (mode 0600; a sensitive value is sealed with the injected
// `seal`/`unseal`, Electron safeStorage when available). The plugin's folder comes from the running core's
// plugin/installed answer (`locate`), never from the renderer. Nothing here uses the network.
const fsp = require("node:fs/promises");
const path = require("node:path");

const MANIFEST_BYTES = 262144; // CO
const VALUE_CHARS = 1000; // f
const CHANGE_LINES = 12; // m
const CHANGE_CHARS = 3 * VALUE_CHARS; // p
const STORE_VERSION = 1;

const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value); // R5 (Pf)
const own = (object, key) => isObject(object) && Object.hasOwn(object, key) ? object[key] : undefined; // aa / b
const manifestName = manifest => typeof manifest?.name === "string" && manifest.name !== "" ? manifest.name : undefined; // sW (Hyn)

// SO, with the host's native core manifest (.codex-plugin) after the official one.
const MANIFEST_PATHS = [[".claude-plugin", "plugin.json"], [".codex-plugin", "plugin.json"]];

async function readManifest(dir, { readFile = fsp.readFile, stat = fsp.stat } = {}) {
  if (typeof dir !== "string" || !path.isAbsolute(dir) || dir.includes("\0")) return null;
  for (const parts of MANIFEST_PATHS) {
    const file = path.join(dir, ...parts);
    let info;
    try { info = await stat(file); } catch { continue; }
    if (!info.isFile() || info.size > MANIFEST_BYTES) return null;
    try {
      const parsed = JSON.parse(await readFile(file, "utf8"));
      return isObject(parsed) ? parsed : null;
    } catch { return null; }
  }
  return null;
}

// g(e): the plugin with a declared userConfig, or null (no Settings tab).
function declaredOptions(manifest) {
  const name = manifestName(manifest), declared = manifest?.userConfig;
  return name && !name.includes("@") && isObject(declared) && Object.keys(declared).length > 0 ? { name, declared } : null;
}
const declaredEntry = ({ declared }, key) => { const entry = own(declared, key); return isObject(entry) ? entry : undefined; }; // b
const isOpen = (plugin, key) => { const entry = declaredEntry(plugin, key); return entry !== undefined && (entry.sensitive === undefined || entry.sensitive === false); }; // x
const isSecret = (plugin, key) => declaredEntry(plugin, key)?.sensitive === true;
// S: a boolean is "true"/"false", a declared options list is its choices.
function choicesOf(plugin, key) {
  const entry = declaredEntry(plugin, key);
  if (entry?.type === "boolean") return ["true", "false"];
  return Array.isArray(entry?.options) ? entry.options.filter(value => typeof value === "string") : undefined;
}
const optional = value => typeof value === "string" ? value : undefined;
// u2 schema entry: {type, title, description, required, sensitive, default: !0 when one is declared}.
function schemaEntry(entry) {
  const out = {};
  for (const key of ["type", "title", "description"]) if (optional(entry[key]) !== undefined) out[key] = entry[key];
  for (const key of ["required", "sensitive"]) if (typeof entry[key] === "boolean") out[key] = entry[key];
  if (Object.hasOwn(entry, "default") && entry.default !== undefined) out.default = true;
  return out;
}
const defaultText = entry => entry.default === undefined || entry.default === null ? "" : typeof entry.default === "string" ? entry.default : String(entry.default);

// C(e): what the Settings tab reads. A sensitive value is never sent back (inputs ""), only reported as configured.
function optionsView(plugin, stored = {}) {
  const schema = {}, inputs = {}, choices = {}, configured = [], unconfigured = [];
  for (const [key, entry] of Object.entries(plugin.declared)) {
    if (!isObject(entry)) continue;
    schema[key] = schemaEntry(entry);
    const saved = Object.hasOwn(stored, key) ? stored[key] : undefined;
    const list = choicesOf(plugin, key);
    if (list) choices[key] = list;
    const shown = saved !== undefined ? saved : defaultText(entry);
    inputs[key] = isOpen(plugin, key) || list?.includes(shown) ? shown : "";
    (saved !== undefined ? configured : unconfigured).push(key);
  }
  return { schema, inputs, choices, configured, unconfigured };
}

// M: too long for one value.
const tooLong = value => value.length > 2 * VALUE_CHARS || Array.from(value).length > VALUE_CHARS;
function refusedValue(plugin, key, value) {
  const entry = declaredEntry(plugin, key), list = choicesOf(plugin, key);
  if (value === "") return false;
  if (list && !list.includes(value)) return true;
  if (entry?.type === "number" && !Number.isFinite(Number(value.trim()))) return true;
  return false;
}

// k / A / j: a title or value as the consent dialog shows it (controls and invisible characters spelled out, the
// value isolated so it can't reorder the sentence around it).
const codePoint = ch => `⟨U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}⟩`;
function visible(text) {
  const chars = Array.from(String(text)
    .replace(/[\p{C}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}⠀“”⟨⟩␣]|(?! )\p{Zs}/gu, codePoint)
    .replace(/^\p{M}|(?<=\p{M}{2})\p{M}/gu, codePoint));
  return chars.map((ch, index) => ch === " " && (index === 0 || index === chars.length - 1 || chars[index - 1] === " " || chars[index + 1] === " ") ? "␣" : ch).join("");
}
const isolate = (text, open) => `${open}${text}⁩`;
const clip = (text, max) => { const chars = Array.from(text); return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : text; };
const displayName = text => isolate(clip(visible(text), 60), "⁨");

function createPluginOptions({ storePath, locate, confirm = async () => "unavailable", seal = value => value, unseal = value => value,
  readFile = fsp.readFile, writeFile = fsp.writeFile, rename = fsp.rename, mkdir = fsp.mkdir, stat = fsp.stat, t = (source, values) => format(source, values) }) {
  let queue = Promise.resolve();
  const serial = task => { const run = queue.then(task, task); queue = run.catch(() => {}); return run; };

  async function readStore() {
    try {
      const parsed = JSON.parse(await readFile(storePath(), "utf8"));
      return isObject(parsed) && isObject(parsed.plugins) ? parsed : { version: STORE_VERSION, plugins: {} };
    } catch { return { version: STORE_VERSION, plugins: {} }; }
  }
  async function writeStore(store) {
    const file = storePath(), temp = `${file}.${process.pid}.tmp`;
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(temp, JSON.stringify(store, null, 2), { mode: 0o600 });
    await rename(temp, file);
  }
  // Stored values for one plugin, keyed by its manifest name as well as its id so a reinstalled copy keeps them.
  function storedValues(store, pluginId, plugin) {
    const record = own(store.plugins, pluginId);
    if (!isObject(record) || record.name !== plugin.name || !isObject(record.values)) return {};
    const values = {};
    for (const [key, value] of Object.entries(record.values)) {
      if (!declaredEntry(plugin, key)) continue;
      const text = isSecret(plugin, key) ? unseal(value) : value;
      if (typeof text === "string") values[key] = text;
    }
    return values;
  }
  // V3-w11-sweep-shell-b: `cwd` is the Customize folder the plugin page lists plugins for (plugin/installed is scoped by
  // it, so a plugin installed only in that workspace is found); main checks it is a known workspace.
  async function find(pluginId, cwd) {
    if (typeof pluginId !== "string" || !pluginId || pluginId.length > 512) return null;
    const located = await locate(pluginId, typeof cwd === "string" && cwd ? cwd : undefined).catch(() => null);
    const dir = typeof located === "string" ? located : located?.dir;
    const manifest = await readManifest(dir, { readFile, stat });
    const plugin = declaredOptions(manifest);
    return plugin ? { ...plugin, dir } : null;
  }

  // readPluginOptions: null hides the tab (no declared userConfig, not a local ccd context, or a failed read).
  async function get(pluginId, context, { cwd } = {}) {
    if (context?.mode !== "ccd") return null;
    try {
      const plugin = await find(pluginId, cwd);
      if (!plugin) return null;
      return optionsView(plugin, storedValues(await readStore(), pluginId, plugin));
    } catch { return null; }
  }

  // savePluginOptions (F).
  async function set(pluginId, values, context, { pressed = true, cwd } = {}) {
    if (context?.mode !== "ccd") return { success: false };
    if (!isObject(values) || Object.values(values).some(value => typeof value !== "string")) return { success: false };
    return serial(async () => {
      try {
        const plugin = await find(pluginId, cwd);
        if (!plugin) return { success: false };
        if (Object.keys(values).some(key => !declaredEntry(plugin, key))) return { success: false, refused: { message: "The plugin declares no such option." } };
        if (Object.entries(values).every(([key, value]) => value === "" && isSecret(plugin, key))) return { success: true, saved: [] };
        const store = await readStore(), stored = storedValues(store, pluginId, plugin);
        const order = Object.keys(plugin.declared);
        const entries = Object.entries(values).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
        // c: the visible changes (an unchanged visible value is not asked about or rewritten); a blank secret keeps its value.
        const open = entries.filter(([key, value]) => !isSecret(plugin, key) && !(isOpen(plugin, key) && stored[key] === value));
        const secret = entries.filter(([key, value]) => isSecret(plugin, key) && value !== "");
        const long = open.find(([, value]) => tooLong(value))?.[0] ?? secret.find(([, value]) => tooLong(value))?.[0];
        if (long !== undefined) return { success: false, tooLong: { option: long, max: VALUE_CHARS } };
        const refused = [...open, ...secret].find(([key, value]) => refusedValue(plugin, key, value));
        if (refused) return { success: false, refused: { option: refused[0], message: "" } };
        const title = key => { const value = declaredEntry(plugin, key)?.title; return displayName(typeof value === "string" && value !== "" ? value : key); };
        const openLines = open.map(([key, value]) => isOpen(plugin, key) ? `${title(key)}: “${isolate(visible(value), "⁦")}”` : t("{title}: value hidden", { title: title(key) }));
        const openChars = open.reduce((sum, [key, value]) => sum + (isOpen(plugin, key) ? Array.from(visible(value)).length : 0), 0);
        if (openLines.length > CHANGE_LINES || openChars > CHANGE_CHARS) return { success: false, tooMuch: true };
        if (openLines.length === 0 && secret.length === 0) return { success: true, saved: [] };
        const secretLines = secret.map(([key]) => t("{title}: value hidden", { title: title(key) }));
        const answer = pressed && openLines.length === 0 ? "confirmed" : await confirm({ plugin: displayName(plugin.name), open: openLines, secret: secretLines, pressed });
        if (answer !== "confirmed") return { success: false, unconfirmed: answer === "declined" ? "declined" : "unavailable" };
        const nextValues = { ...own(own(store.plugins, pluginId), "values") };
        if (own(store.plugins, pluginId)?.name !== plugin.name) for (const key of Object.keys(nextValues)) delete nextValues[key];
        const saved = [];
        for (const [key, value] of [...open, ...secret]) {
          if (value === "") delete nextValues[key];
          else nextValues[key] = isSecret(plugin, key) ? seal(value) : value;
          saved.push(key);
        }
        store.version = STORE_VERSION;
        store.plugins = { ...store.plugins, [pluginId]: { name: plugin.name, values: nextValues } };
        await writeStore(store);
        return { success: true, saved };
      } catch { return { success: false }; }
    });
  }
  return { get, set };
}

function format(source, values) {
  return String(source).replace(/\{(\w+)\}/g, (match, key) => values?.[key] ?? match);
}

// y: the native consent ("Save these settings for the plugin “{plugin}”?", Cancel first and the default; answered
// before 700 ms counts as unread, p.dwelled(700)). `showMessageBox` is Electron's dialog.showMessageBox.
function consentDialog({ showMessageBox, focusedWindow, appName, t = format, now = () => Date.now() }) {
  return async ({ plugin, open, secret, pressed }) => {
    const window = focusedWindow();
    if (!window) return "unavailable";
    const cancel = t("Cancel");
    const room = Math.max(0, CHANGE_LINES - open.length);
    const changes = [...open, ...secret.slice(0, room), ...(secret.length > room ? [t("and {count} more", { count: secret.length - room })] : [])].join("\n");
    const detail = [!pressed && t("Choose {cancelLabel} unless you just pressed Save on a plugin’s Settings tab.", { cancelLabel: cancel }), changes].filter(Boolean).join("\n\n");
    const started = now();
    const { response } = await showMessageBox(window, { type: "question", title: appName(), message: t("Save these settings for the plugin “{plugin}”?", { plugin }),
      detail, buttons: [cancel, t("Save")], defaultId: 0, cancelId: 0, noLink: true });
    const dwelled = now() - started >= 700;
    if (response === 1) return dwelled ? "confirmed" : "unavailable";
    return dwelled ? "declined" : "unavailable";
  };
}

// V3-w11-sweep-shell-b: mP(e) — "the person just pressed Save" — from the official input tracker (asar
// index.chunk-jPKPzV-P EYn / DYn / mP, SYn = 1500, CYn = 5e3). Per webContents: the last activation key (before-input-event
// keyDown of Enter / " " / "Space", not auto-repeat; wYn) and the last primary click (input-event mouseDown then mouseUp
// within 5 s, neither with the right or middle button down; TYn). pressed(contents) is true when either happened in the
// last 1.5 s, and reading it consumes it, so one press answers one save. setPluginOptions passes it as `pressed`.
function createGestureTracker({ now = () => Date.now() } = {}) {
  const state = new WeakMap();
  const held = (input, button) => input?.modifiers?.some(name => String(name).toLowerCase() === button) ?? false;
  function track(contents) {
    if (!contents || typeof contents.on !== "function" || state.has(contents)) return;
    const entry = { primaryDownAt: 0, primaryUpAt: 0, activationKeyAt: 0 };
    state.set(contents, entry);
    contents.on("before-input-event", (_event, input) => {
      if (input?.type === "keyDown" && (input.key === "Enter" || input.key === " " || input.key === "Space") && !input.isAutoRepeat) entry.activationKeyAt = now();
    });
    contents.on("input-event", (_event, input) => {
      if (input?.type === "keyUp" || input?.type === "keyDown" || input?.type === "rawKeyDown") return;
      const other = held(input, "rightbuttondown") || held(input, "middlebuttondown");
      if (input?.type === "mouseDown") entry.primaryDownAt = other ? 0 : now();
      else if (input?.type === "mouseUp") {
        const at = now();
        if (!other && entry.primaryDownAt > 0 && at - entry.primaryDownAt <= 5000) entry.primaryUpAt = at;
        entry.primaryDownAt = 0;
      }
    });
  }
  function pressed(contents, within = 1500) {
    const entry = contents === undefined ? undefined : state.get(contents);
    if (entry === undefined) return false;
    if (entry.primaryUpAt !== 0 && now() - entry.primaryUpAt <= within) { entry.primaryUpAt = 0; return true; }
    if (entry.activationKeyAt === 0 || now() - entry.activationKeyAt > within) return false;
    entry.activationKeyAt = 0;
    return true;
  }
  return { track, pressed };
}

// The running core's installed plugin folder for an id (plugin/installed: source.type "local", source.path).
function pluginFolderFrom(result, pluginId) {
  for (const marketplace of Array.isArray(result?.marketplaces) ? result.marketplaces : []) {
    for (const plugin of Array.isArray(marketplace?.plugins) ? marketplace.plugins : []) {
      if (plugin?.id !== pluginId || plugin.installed === false) continue;
      const dir = plugin.source?.type === "local" ? plugin.source.path : null;
      return typeof dir === "string" && path.isAbsolute(dir) ? dir : null;
    }
  }
  return null;
}

module.exports = { createPluginOptions, consentDialog, pluginFolderFrom, readManifest, declaredOptions, optionsView, createGestureTracker, VALUE_CHARS };
