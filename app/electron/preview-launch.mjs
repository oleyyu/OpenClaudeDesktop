// The project's dev servers for the Preview pane and the preview tools: .claude/launch.json, read the way the
// 2.2553.1 app reads it (main bundle C2: JSONC, `configurations[]`, top-level `autoVerify`; per entry name,
// runtimeExecutable + runtimeArgs, program + args, cwd relative to the folder, env, port, autoPort, url;
// ${workspaceFolder} / ${workspaceRoot} substituted; the port from `port`, the url, env.PORT, then the arguments,
// else 3000 for a command). Pure: the caller reads the file and spawns (insideFolderReal only resolves symlinks).
import fs from "node:fs";
import path from "node:path";
// preview-04: 2.42304.0 X0.parseConfiguration's "autoPort" / "port" type checks and its localhost-url port error,
// verbatim (scripts/extract-r3b-preview.mjs).
import { launchPortFields, launchUrlPortMismatch } from "./generated/r3b-preview-launch-fields.mjs";

export const LAUNCH_FILE = path.join(".claude", "launch.json");
export const LAUNCH_EXAMPLE = `{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "<unique-name>",
      "runtimeExecutable": "<command>",
      "runtimeArgs": ["<args>"],
      "port": <port>
    }
  ]
}`;
export const LAUNCH_HELP = 'Set "runtimeExecutable" to the command (e.g. "npm"), "runtimeArgs" to the arguments (e.g. ["run", "dev"]), and "port" to the server port. An optional "url" (http/https) opens the preview there instead of http://localhost:<port>. A configuration with "url" and no command attaches to an already-running server.';
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);
const MAX_ARGS = 64;

/** JSON with // and /* comments and trailing commas (VS Code launch.json style). */
export function parseJsonc(text) {
  let out = "", inString = false, quote = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i], next = text[i + 1];
    if (inString) {
      out += char;
      if (char === "\\") { out += next ?? ""; i++; }
      else if (char === quote) inString = false;
      continue;
    }
    if (char === '"') { inString = true; quote = char; out += char; continue; }
    if (char === "/" && next === "/") { while (i < text.length && text[i] !== "\n") i++; out += "\n"; continue; }
    if (char === "/" && next === "*") { i += 2; while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++; i++; continue; }
    out += char;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

export function isLocalHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return LOCAL_HOSTS.has(host) || host.endsWith(".localhost");
}

const validPort = (value) => Number.isInteger(value) && value > 0 && value < 65536;
const strings = (value) => Array.isArray(value) && value.length <= MAX_ARGS && value.every((entry) => typeof entry === "string");

/** The port a command line names (--port 5173, -p 3000, localhost:8080, :4000), or null. */
export function portFromArgs(args) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const flag = /^--?(?:port|p)(?:=(\d{2,5}))?$/.exec(arg);
    if (flag) {
      const value = Number(flag[1] ?? args[i + 1]);
      if (validPort(value)) return value;
      continue;
    }
    const hosted = /(?:localhost|127\.0\.0\.1|0\.0\.0\.0)?:(\d{2,5})(?:\/|$)/.exec(arg);
    if (hosted && validPort(Number(hosted[1]))) return Number(hosted[1]);
  }
  return null;
}

function substitute(value, root) {
  return typeof value === "string" ? value.replace(/\$\{workspace(?:Folder|Root)\}/g, root) : value;
}

/**
 * One configuration entry as something the app can run, or {problem}.
 * @returns {{config?: object, problem?: string}}
 */
export function normalizeConfiguration(entry, root, index = 0) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return { problem: `configuration ${index + 1} is not an object` };
  const malformed = (field) => ({ problem: `configuration ${index + 1} has a malformed "${field}"` });
  if (entry.runtimeExecutable !== undefined && (typeof entry.runtimeExecutable !== "string" || !entry.runtimeExecutable.trim())) return malformed("runtimeExecutable");
  if (entry.runtimeArgs !== undefined && !strings(entry.runtimeArgs)) return malformed("runtimeArgs");
  if (entry.program !== undefined && (typeof entry.program !== "string" || !entry.program.trim())) return malformed("program");
  if (entry.args !== undefined && !strings(entry.args)) return malformed("args");
  // "autoPort" is the JSON boolean or absent; "port" a number from 1 to 65535 or its digits as a string (an empty or
  // zero "port" counts as absent), else the original's message.
  let entryPort;
  try { entryPort = launchPortFields(entry); } catch (error) { return { problem: `configuration ${index + 1}: ${error.message}` }; }
  if (entry.env !== undefined && (!entry.env || typeof entry.env !== "object" || Array.isArray(entry.env) || !Object.values(entry.env).every((value) => typeof value === "string"))) return malformed("env");
  if (entry.cwd !== undefined && typeof entry.cwd !== "string") return malformed("cwd");
  if (entry.name !== undefined && (typeof entry.name !== "string" || !entry.name.trim() || entry.name.length > 100)) return malformed("name");

  const runtime = substitute(entry.runtimeExecutable?.trim(), root);
  const runtimeArgs = (entry.runtimeArgs ?? []).map((arg) => substitute(arg, root));
  const program = substitute(entry.program?.trim(), root);
  const programArgs = (entry.args ?? []).map((arg) => substitute(arg, root));
  let command = null, args = [];
  if (runtime) { command = runtime; args = [...runtimeArgs, ...(program ? [program] : []), ...programArgs]; }
  else if (program) { command = "node"; args = [program, ...programArgs]; }

  let url = null;
  if (entry.url !== undefined) {
    if (typeof entry.url !== "string") return malformed("url");
    let parsed;
    try { parsed = new URL(substitute(entry.url, root)); } catch { return { problem: `configuration ${index + 1}: "url" is not a valid URL` }; }
    if (!["http:", "https:"].includes(parsed.protocol)) return { problem: `configuration ${index + 1}: "url" must be http or https` };
    if (parsed.username || parsed.password) return { problem: `configuration ${index + 1}: "url" must not contain credentials` };
    url = parsed;
  }
  if (!command && !url) return { problem: `configuration ${index + 1} has no "runtimeExecutable", "program" or "url"` };

  const env = { ...(entry.env ?? {}) };
  for (const key of Object.keys(env)) env[key] = substitute(env[key], root);
  const urlPort = url ? Number(url.port || (url.protocol === "https:" ? 443 : 80)) : null;
  const envPort = validPort(Number(env.PORT)) ? Number(env.PORT) : null;
  const port = entryPort ?? (url && url.port ? urlPort : null) ?? envPort ?? (command ? portFromArgs(args) : null) ?? (command ? 3000 : (url ? urlPort : 0));

  if (url && isLocalHost(url.hostname)) {
    // A localhost url is the server's own origin: no path or query, and the entry's port.
    if ((url.pathname && url.pathname !== "/") || url.search || url.hash) return { problem: `configuration ${index + 1}: "url" is a localhost address with a path or query; use the bare origin` };
    if (entryPort !== undefined && urlPort !== entryPort) return { problem: `configuration ${index + 1}: ${launchUrlPortMismatch(url, entryPort)}` };
  }
  const cwd = entry.cwd ? path.resolve(root, substitute(entry.cwd, root)) : root;
  // Symlinks followed: a "cwd" that is a link inside the project to a folder outside it (web -> ~) is outside it, so
  // the approval card's "In <project>/web" is where the command really runs (preview-service checks again at spawn).
  if (!insideFolderReal(root, cwd)) return { problem: `configuration ${index + 1}: "cwd" is outside the project folder` };
  const fallbackName = (args.length ? args[args.length - 1] : "") || (url ? url.host : "") || "preview";
  const name = (entry.name?.trim() || fallbackName).slice(0, 100);
  return {
    config: {
      name, command, args, cwd, env, port,
      // Three states, as the original keeps it: true (always movable), false (never), absent (movable unless the
      // start script pins the port; preview-01).
      autoPort: entry.autoPort,
      url: url ? url.href.replace(/\/$/, isLocalHost(url.hostname) ? "" : "/") : null,
      attach: !command,
    },
  };
}

/**
 * The parsed file. `text` null means the file doesn't exist.
 * @returns {{exists: boolean, configs: object[], problems: string[], autoVerify: boolean, error: string|null}}
 */
export function parseLaunchConfig(text, root) {
  const empty = { exists: text !== null && text !== undefined, configs: [], problems: [], autoVerify: true, error: null };
  if (text === null || text === undefined) return { ...empty, error: "no .claude/launch.json" };
  let data;
  try { data = parseJsonc(String(text)); } catch (error) { return { ...empty, error: `launch.json failed to parse: ${error.message}` }; }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ...empty, error: "launch.json is not an object" };
  const list = Array.isArray(data.configurations) ? data.configurations : [];
  const autoVerify = data.autoVerify !== false;
  if (!list.length) return { ...empty, autoVerify, error: "launch.json contains no configurations" };
  const configs = [], problems = [], seen = new Set();
  list.forEach((entry, index) => {
    const { config, problem } = normalizeConfiguration(entry, root, index);
    if (problem) { problems.push(problem); return; }
    const key = config.name.toLowerCase();
    if (seen.has(key)) { problems.push(`configuration ${index + 1} repeats the name "${config.name}"`); return; }
    seen.add(key);
    configs.push(config);
  });
  const error = configs.length ? null : `none of the ${list.length} configuration(s) in launch.json could be used (${problems.join("; ")})`;
  return { exists: true, configs, problems, autoVerify, error };
}

/**
 * launch.json text with top-level "autoVerify" set (Servers & settings › Enable/Disable auto verify). The value is
 * replaced in place, or the key added after the opening brace, so the rest of the file (comments, order) stays.
 */
export function withAutoVerify(text, enabled) {
  const value = enabled ? "true" : "false";
  const source = String(text ?? "");
  // Only a top-level key: the first "autoVerify" outside any nested object or array (depth 1), strings and comments skipped.
  let depth = 0, at = -1;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === "/" && source[index + 1] === "/") { const end = source.indexOf("\n", index); index = end < 0 ? source.length : end; continue; }
    if (char === "/" && source[index + 1] === "*") { const end = source.indexOf("*/", index + 2); index = end < 0 ? source.length : end + 1; continue; }
    if (char === '"') {
      let end = index + 1;
      while (end < source.length && source[end] !== '"') end += source[end] === "\\" ? 2 : 1;
      if (depth === 1 && source.slice(index, end + 1) === '"autoVerify"') { at = index; break; }
      index = end;
      continue;
    }
    if (char === "{" || char === "[") depth++;
    else if (char === "}" || char === "]") depth--;
  }
  if (at >= 0) {
    const rest = /^("autoVerify"\s*:\s*)(true|false|null|"[^"]*"|-?\d+(?:\.\d+)?)/.exec(source.slice(at));
    if (rest) return source.slice(0, at) + rest[1] + value + source.slice(at + rest[0].length);
  }
  const open = source.indexOf("{");
  if (open < 0) return `{\n  "autoVerify": ${value},\n  "configurations": []\n}\n`;
  const empty = /^\s*}/.test(source.slice(open + 1));
  return `${source.slice(0, open + 1)}\n  "autoVerify": ${value}${empty ? "" : ","}${source.slice(open + 1).replace(/^[ \t]*\n?/, "\n")}`;
}

/** The address a configuration opens. */
export function configUrl(config, port = config.port) {
  if (config.url) {
    if (port && port !== config.port) { try { const url = new URL(config.url); if (isLocalHost(url.hostname)) { url.port = String(port); return url.href.replace(/\/$/, ""); } } catch { /* keep */ } }
    return config.url;
  }
  return `http://localhost:${port}`;
}

/** True when `file` is `root` or inside it (both absolute). */
export function insideFolder(root, file) {
  if (typeof root !== "string" || typeof file !== "string" || !path.isAbsolute(root) || !path.isAbsolute(file)) return false;
  const relative = path.relative(path.resolve(root), path.resolve(file));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/**
 * A path with its symlinks resolved: the nearest part that exists, realpath'd, and the rest as written (a file that
 * doesn't exist yet under a linked folder still resolves through the link). null when it can't be resolved.
 */
function resolvedPath(value, realpath) {
  let current = path.resolve(value);
  const rest = [];
  for (;;) {
    try { return path.join(realpath(current), ...rest); }
    catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") return null;
      const parent = path.dirname(current);
      if (parent === current) return null;
      rest.unshift(path.basename(current));
      current = parent;
    }
  }
}

/**
 * insideFolder, and still inside once every symlink is followed (both sides): a link in the folder that points
 * elsewhere (`ln -s ~ home-link`) doesn't make the files it reaches part of the folder. As agent-tools/files.mjs.
 */
export function insideFolderReal(root, file, realpath = fs.realpathSync.native) {
  if (!insideFolder(root, file)) return false;
  const realRoot = resolvedPath(root, realpath), realFile = resolvedPath(file, realpath);
  return !!realRoot && !!realFile && insideFolder(realRoot, realFile);
}

/**
 * What the preview may show: http(s) anywhere, about:blank, and file:// only inside the session's folder (symlinks
 * followed: insideFolderReal).
 * @returns {{ok: true, url: string} | {ok: false, reason: string}}
 */
export function navigationAllowed(value, root) {
  let url;
  try { url = new URL(String(value)); } catch { return { ok: false, reason: "That isn’t a valid address." }; }
  if (url.protocol === "http:" || url.protocol === "https:") {
    if (url.username || url.password) return { ok: false, reason: "Addresses with a user name or password aren’t supported." };
    return { ok: true, url: url.href };
  }
  if (url.href === "about:blank") return { ok: true, url: url.href };
  if (url.protocol === "file:") {
    let file;
    try { file = decodeURIComponent(url.pathname); } catch { return { ok: false, reason: "That isn’t a valid address." }; }
    if (!insideFolderReal(root, file)) return { ok: false, reason: "The preview opens files from this session’s folder only." };
    return { ok: true, url: url.href };
  }
  return { ok: false, reason: "The preview opens web pages (http and https) and files from this session’s folder." };
}

/**
 * The address the URL field means: a full URL as is, localhost / 127.0.0.1 / host:port over http, a path inside the
 * folder (absolute, ~/ or ./) as a file, a bare domain over https, anything else as a web search.
 */
export function parseUserUrl(text, root, home = "") {
  const value = String(text ?? "").trim();
  if (!value) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || /^about:blank$/i.test(value)) return value;
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/.*)?$/i.test(value)) return `http://${value}`;
  if (/^:\d{2,5}(\/.*)?$/.test(value)) return `http://localhost${value}`;
  if (value.startsWith("/") || value.startsWith("~/") || value.startsWith("./") || value.startsWith("../")) {
    const file = value.startsWith("~/") ? path.join(home || "/", value.slice(2)) : path.resolve(root || "/", value);
    return `file://${file.split(path.sep).map(encodeURIComponent).join("/")}`;
  }
  if (!/\s/.test(value) && /^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(value)) return `https://${value}`;
  if (!/\s/.test(value) && /^[\w-]+:\d{2,5}(\/.*)?$/.test(value)) return `http://${value}`;
  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}

// ------------------------------------------------------------------ dev server detection
// The Preview start page's static dev-server detection, as 2.31226.0 main reads it (asar index.chunk-CiiI592G.js
// rUi detectServerCandidates, eUi framework, tUi runner, nUi validation, gatherProjectInfo packageManager): the
// package.json scripts dev / start / serve / develop, run through the lockfile's package manager, on the framework's
// default port. Pure: `files` is { read(relative) → text | null, exists(relative) → boolean }.
export const DETECT_SCRIPT_NAMES = ["dev", "start", "serve", "develop"];
// QHi: the frameworks a candidate may name (the start page captions all but "unknown").
export const DETECT_FRAMEWORKS = ["next", "vite", "nuxt", "astro", "svelte", "angular", "remix", "gatsby", "unknown"];
// $Hi: the first framework whose config file exists sets the framework and its port.
const FRAMEWORK_FILES = [
  { files: ["next.config.js", "next.config.ts", "next.config.mjs"], framework: "next", port: 3000 },
  { files: ["vite.config.js", "vite.config.ts", "vite.config.mjs"], framework: "vite", port: 5173 },
  { files: ["nuxt.config.js", "nuxt.config.ts"], framework: "nuxt", port: 3000 },
  { files: ["astro.config.js", "astro.config.ts", "astro.config.mjs"], framework: "astro", port: 4321 },
  { files: ["svelte.config.js", "svelte.config.ts"], framework: "svelte", port: 5173 },
  { files: ["angular.json"], framework: "angular", port: 4200 },
  { files: ["remix.config.js", "remix.config.ts"], framework: "remix", port: 3000 },
  { files: ["gatsby-config.js", "gatsby-config.ts"], framework: "gatsby", port: 8000 },
];
// YHi / XHi: the runners a candidate may use and the script (and entry) names it may run.
const CANDIDATE_RUNNERS = new Set(["npm", "yarn", "pnpm"]);
const CANDIDATE_SCRIPT = /^[a-zA-Z0-9][a-zA-Z0-9:_.-]{0,63}$/;

/** nUi: {status: "ok"} or {status: "blocked", reason: "runner-not-allowed" | "shell-metachar" | "port-out-of-range"}. */
export function validateServerCandidate(candidate) {
  if (!CANDIDATE_RUNNERS.has(candidate?.runtimeExecutable)) return { status: "blocked", reason: "runner-not-allowed" };
  const args = Array.isArray(candidate.runtimeArgs) ? candidate.runtimeArgs : [];
  const script = args.length === 2 && args[0] === "run" ? args[1] : null;
  if (script === null || typeof script !== "string" || !CANDIDATE_SCRIPT.test(script) || (candidate.name !== undefined && !CANDIDATE_SCRIPT.test(candidate.name)))
    return { status: "blocked", reason: "shell-metachar" };
  if (!Number.isInteger(candidate.port) || candidate.port < 1 || candidate.port > 65535) return { status: "blocked", reason: "port-out-of-range" };
  return { status: "ok" };
}

function projectScripts(files) {
  const read = (name) => { try { return files.read(name); } catch { return null; } };
  const exists = (name) => { try { return files.exists(name) === true; } catch { return false; } };
  // gatherProjectInfo: yarn.lock → yarn, pnpm-lock.yaml → pnpm, else npm.
  const packageManager = exists("yarn.lock") ? "yarn" : exists("pnpm-lock.yaml") ? "pnpm" : "npm";
  let scripts = null;
  if (exists("package.json")) {
    try { const pkg = JSON.parse(read("package.json") ?? "null"); if (pkg?.scripts && typeof pkg.scripts === "object") scripts = pkg.scripts; } catch { scripts = null; }
  }
  return { packageManager, scripts, exists };
}

/** rUi: the candidates {name, runtimeExecutable, runtimeArgs, port, framework, validation} the start page lists. */
export function detectServerCandidates(files) {
  const { packageManager, scripts, exists } = projectScripts(files);
  if (!scripts) return [];
  const found = FRAMEWORK_FILES.find((entry) => entry.files.some((file) => exists(file)));
  const framework = found?.framework ?? "unknown", port = found?.port ?? 3000;
  const candidates = [];
  for (const name of DETECT_SCRIPT_NAMES) {
    if (!Object.prototype.hasOwnProperty.call(scripts, name)) continue;
    // tUi: every runner runs the script as `<runner> run <script>`.
    const runtimeExecutable = packageManager, runtimeArgs = ["run", name];
    candidates.push({ name, runtimeExecutable, runtimeArgs, port, framework, validation: validateServerCandidate({ runtimeExecutable, runtimeArgs, port }) });
  }
  return candidates;
}

/** addServerFromCandidate's checks before it writes: a valid candidate whose script package.json still has. */
export function serverCandidateProblem(candidate, files) {
  const validation = validateServerCandidate(candidate);
  if (validation.status !== "ok") return validation.reason;
  const { scripts } = projectScripts(files);
  return scripts && Object.prototype.hasOwnProperty.call(scripts, candidate.runtimeArgs[1]) ? null : "script-not-found";
}

/** The launch.json entry addServerFromCandidate writes (named after the script). */
export function candidateConfiguration(candidate) {
  return { name: String(candidate.runtimeArgs[1]), runtimeExecutable: String(candidate.runtimeExecutable), runtimeArgs: candidate.runtimeArgs.map(String), port: Number(candidate.port) };
}

/** The launch.json text for a project that has none yet. */
export function launchConfigText(candidate) {
  return `${JSON.stringify({ version: "0.0.1", configurations: [candidateConfiguration(candidate)] }, null, 2)}\n`;
}

// Index just past the string, comment or single character at `index` (JSONC lexing for the in-place edits).
function skipToken(source, index) {
  const char = source[index];
  if (char === "/" && source[index + 1] === "/") { const end = source.indexOf("\n", index); return end < 0 ? source.length : end; }
  if (char === "/" && source[index + 1] === "*") { const end = source.indexOf("*/", index + 2); return end < 0 ? source.length : end + 2; }
  if (char === '"') {
    let end = index + 1;
    while (end < source.length && source[end] !== '"') end += source[end] === "\\" ? 2 : 1;
    return end + 1;
  }
  return index + 1;
}

/**
 * p2.addServerConfiguration: the entry appended to an existing launch.json's top-level "configurations" in place (its
 * comments and layout kept, as jsonc-parser modify with isArrayInsertion does). {status: "ok", text} |
 * {status: "name-exists"} when a configuration already has the name (ignoring case) | {status: "error"} when the file
 * isn't a JSON object or its "configurations" isn't an array.
 */
export function withServerConfiguration(text, entry) {
  const source = String(text ?? "");
  let parsed;
  try { parsed = parseJsonc(source); } catch { return { status: "error" }; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { status: "error" };
  if (parsed.configurations !== undefined && !Array.isArray(parsed.configurations)) return { status: "error" };
  const name = entry.name.toLowerCase();
  if ((parsed.configurations ?? []).some((config) => typeof config?.name === "string" && config.name.toLowerCase() === name)) return { status: "name-exists" };
  const lineIndent = (at) => /^[ \t]*/.exec(source.slice(source.lastIndexOf("\n", at - 1) + 1))[0];
  const block = (indent, unit) => JSON.stringify(entry, null, unit).split("\n").map((line) => indent + line).join("\n");
  // The top-level "configurations" key and its array's brackets.
  let depth = 0, keyAt = -1, open = -1, close = -1, root = -1;
  for (let index = 0; index < source.length;) {
    const char = source[index];
    if (char === '"') {
      const end = skipToken(source, index);
      if (depth === 1 && keyAt < 0 && source.slice(index, end) === '"configurations"' && /^\s*:/.test(source.slice(end))) keyAt = index;
      index = end;
      continue;
    }
    if (char === "/" && (source[index + 1] === "/" || source[index + 1] === "*")) { index = skipToken(source, index); continue; }
    if (char === "{" || char === "[") {
      if (depth === 0 && char === "{" && root < 0) root = index;
      if (depth === 1 && char === "[" && keyAt >= 0 && open < 0) open = index;
      depth++;
    } else if (char === "}" || char === "]") {
      depth--;
      if (depth === 1 && char === "]" && open >= 0 && close < 0) close = index;
    }
    index++;
  }
  if (open >= 0 && close > open) {
    const outer = lineIndent(keyAt);
    // The array's last value (comments skipped) decides whether a comma goes before the new entry.
    let last = -1;
    for (let index = open + 1; index < close;) {
      const char = source[index];
      if (char === "/" && (source[index + 1] === "/" || source[index + 1] === "*")) { index = skipToken(source, index); continue; }
      if (char === '"') { index = skipToken(source, index); last = index - 1; continue; }
      if (!/\s/.test(char)) last = index;
      index++;
    }
    const unit = outer.length ? outer : "  ";
    const inner = outer + unit;
    if (last < 0) return { status: "ok", text: `${source.slice(0, open + 1)}\n${block(inner, unit)}\n${outer}${source.slice(close)}` };
    const comma = source[last] === "," ? "" : ",";
    return { status: "ok", text: `${source.slice(0, last + 1)}${comma}\n${block(inner, unit)}${source.slice(last + 1)}` };
  }
  // No "configurations" yet: added as the object's last key.
  const end = source.lastIndexOf("}");
  if (root < 0 || end < root) return { status: "error" };
  const body = source.slice(root + 1, end);
  const bare = !body.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "").trim();
  const trimmed = source.slice(0, end).replace(/\s*$/, "");
  const needsComma = !bare && !trimmed.endsWith(",") && !trimmed.endsWith("{");
  return { status: "ok", text: `${trimmed}${needsComma ? "," : ""}\n  "configurations": [\n${block("    ", "  ")}\n  ]\n${source.slice(end)}` };
}
