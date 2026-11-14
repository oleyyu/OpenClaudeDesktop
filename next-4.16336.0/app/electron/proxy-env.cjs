// The proxy variables an agent core's commands should see.
//
// A Finder/Dock launch gives Electron launchd's environment, not the login shell's: an HTTPS_PROXY exported in
// ~/.zshrc never reaches the core, so `curl`, `npm`, `pip` or `git` run by the agent skip the proxy that the same
// commands use in Terminal. codex.cjs adds the login shell's proxy variables (only those) to the core's spawn
// environment, the way editors resolve the shell environment. Variables already in Electron's environment win
// (a launch from Terminal has them). A core may also name the variables its agent reads from the shell (descriptor
// shellEnv: Gemini's GEMINI_API_KEY, GOOGLE_CLOUD_PROJECT…); those come from the same single read (shellVariables).
//
// Whether a command can then reach the proxy is the core's sandbox's call, not this module's: Codex and the
// OpenCode/MiMo bridges block all network in the workspace-write and read-only sandboxes, loopback included,
// unless the turn's sandboxPolicy.networkAccess is true (Settings › Code › Sandbox network access,
// permission-policy.mjs turnPermissionParams).
const { spawn } = require("node:child_process");
const os = require("node:os");

const PROXY_KEYS = Object.freeze(["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"]);
// reqwest (Codex) and most CLIs send loopback requests through the proxy unless NO_PROXY lists it; a relay
// endpoint (model-settings.cjs) and local dev servers live there.
const LOOPBACK = Object.freeze(["localhost", "127.0.0.1", "::1"]);
const MARKER = "__CODE_DESKTOP_PROXY_ENV__";

const valueOf = (env, key) => {
  for (const name of [key, key.toLowerCase()]) {
    const value = env?.[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};
/** The proxy variables of an environment, by upper-case name; empty values are absent. */
function proxyVariables(env) {
  const found = {};
  for (const key of PROXY_KEYS) {
    const value = valueOf(env, key);
    if (value !== null) found[key] = value;
  }
  return found;
}
/** `env` output between two markers (rc files may print before or after) → every variable (kept in this module). */
function parseShellEnv(output) {
  if (typeof output !== "string") return {};
  const start = output.indexOf(MARKER), end = output.lastIndexOf(MARKER);
  if (start < 0 || end <= start) return {};
  const env = {};
  for (const line of output.slice(start + MARKER.length, end).split("\n")) {
    const at = line.indexOf("=");
    if (at > 0) env[line.slice(0, at)] = line.slice(at + 1);
  }
  return env;
}
/** `env` output between two markers → its proxy variables. */
function parseShellProxy(output) {
  return proxyVariables(parseShellEnv(output));
}
// A variable a core declares it reads from the user's shell (descriptor shellEnv): an upper-case name.
const SHELL_NAME = /^[A-Z][A-Z0-9_]{0,63}$/;
/**
 * The named variables of the login shell that `base` lacks ({} when none): a core's own settings exported in ~/.zshrc
 * (Gemini's GEMINI_API_KEY, GOOGLE_CLOUD_PROJECT…) that a Finder or Dock launch never sees. A variable already in
 * `base` (Electron's own environment, a launch from Terminal) wins; an empty value is absent.
 */
function shellVariables(base = {}, shell = {}, names = []) {
  const added = {};
  for (const name of Array.isArray(names) ? names : []) {
    if (typeof name !== "string" || !SHELL_NAME.test(name) || PROXY_KEYS.includes(name)) continue;
    if (typeof base?.[name] === "string" && base[name] !== "") continue;
    const value = shell?.[name];
    if (typeof value === "string" && value !== "" && !value.includes("\0")) added[name] = value;
  }
  return added;
}
/**
 * The variables to add to a core's spawn environment: the login shell's proxy variables that `base` lacks, in
 * both spellings (curl reads only the lower-case http_proxy), and loopback appended to NO_PROXY whenever a proxy
 * is in effect (base's own NO_PROXY entries kept). Never overrides another variable `base` already has; empty
 * when no proxy is set anywhere.
 */
function proxyEnv(base = {}, shell = {}) {
  const own = proxyVariables(base);
  const merged = { ...proxyVariables(shell), ...own };
  if (!merged.HTTP_PROXY && !merged.HTTPS_PROXY && !merged.ALL_PROXY) return {};
  const added = {};
  for (const key of ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY"]) {
    if (merged[key] && !own[key]) Object.assign(added, { [key]: merged[key], [key.toLowerCase()]: merged[key] });
  }
  const bypass = (merged.NO_PROXY || "").split(",").map((entry) => entry.trim()).filter(Boolean);
  const noProxy = [...bypass, ...LOOPBACK.filter((host) => !bypass.includes(host))].join(",");
  if (noProxy !== own.NO_PROXY) Object.assign(added, { NO_PROXY: noProxy, no_proxy: noProxy });
  // Node (Gemini CLI, other Node-based cores) ignores HTTP(S)_PROXY unless asked: without this its fetch fails behind a local proxy.
  if (typeof base?.NODE_USE_ENV_PROXY !== "string" || base.NODE_USE_ENV_PROXY === "") added.NODE_USE_ENV_PROXY = "1";
  return added;
}
/**
 * The login shell's proxy variables ({} on failure, after `timeout`, or on Windows). Runs the user's shell once
 * as an interactive login shell with stdin closed; CODE_DESKTOP_RESOLVING_ENVIRONMENT=1 lets rc files skip slow
 * work. Only the proxy variables leave this function.
 */
function readLoginShellProxy(options) {
  return readLoginShellEnv(options).then(proxyVariables);
}
// The login shell's whole environment ({} on failure): private to this module, which hands out only proxy variables and
// the names a core declares (loginShellVariables).
function readLoginShellEnv({ platform = process.platform, env = process.env, timeout = 5000, spawnImpl = spawn } = {}) {
  if (platform === "win32") return Promise.resolve({});
  const shell = typeof env.SHELL === "string" && env.SHELL.startsWith("/") ? env.SHELL : platform === "darwin" ? "/bin/zsh" : "/bin/sh";
  return new Promise((resolve) => {
    let output = "", done = false, child;
    const finish = (value) => { if (done) return; done = true; clearTimeout(timer); resolve(value); };
    const timer = setTimeout(() => { try { child?.kill("SIGKILL"); } catch {} finish({}); }, timeout);
    try {
      child = spawnImpl(shell, ["-i", "-l", "-c", `printf '%s' '${MARKER}'; command env; printf '%s' '${MARKER}'`], {
        env: { ...env, CODE_DESKTOP_RESOLVING_ENVIRONMENT: "1" }, stdio: ["ignore", "pipe", "ignore"], cwd: os.homedir(), detached: false,
      });
    } catch { finish({}); return; }
    child.on("error", () => finish({}));
    child.stdout.on("data", (chunk) => { output = (output + chunk).slice(-1 << 20); });
    child.on("close", () => finish(parseShellEnv(output)));
  });
}
let cached = null;
// One login-shell read per app run (a failed or empty read is remembered too), shared by the proxy and the variables.
function loginShellEnv(options) {
  if (!cached) cached = readLoginShellEnv(options).catch(() => ({}));
  return cached;
}
/** The login shell's proxy variables, read once per app run. */
function loginShellProxy(options) {
  return loginShellEnv(options).then(proxyVariables);
}
/** The login shell's values of `names` (a core's descriptor shellEnv), from the same single read; never others. */
function loginShellVariables(names, options) {
  return loginShellEnv(options).then((env) => shellVariables({}, env, names));
}
function resetLoginShellProxy() { cached = null; }

module.exports = { PROXY_KEYS, LOOPBACK, MARKER, proxyVariables, parseShellProxy, proxyEnv, shellVariables, readLoginShellProxy, loginShellProxy, loginShellVariables, resetLoginShellProxy };
