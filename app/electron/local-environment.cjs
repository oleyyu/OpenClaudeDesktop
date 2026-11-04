// The local environment's variables, main-process side (Code › env pill › Local › settings, the reference's
// "Edit local environment": c3f9f1667 Ne/Pe over the desktop bridge's get/save, shared-0 Sf).
//
// run({op:'get'})            → {variables: {KEY: value}}
// run({op:'save', variables}) → {variables, changed}: validated (prefs/local-environment.mjs normalizeEnvironment, strict)
//
// Stored as JSON encrypted with Electron safeStorage in <userData>/local-environment.bin ("stored securely" in the
// source); an empty set removes the file. launchEnv() is what every core spawn adds (codex.cjs setLocalEnvironment):
// the saved variables minus whatever the app manages for that launch (managedKeys: the provider keys, the agent
// tools' variables), so a saved variable never shadows them. A running core keeps the environment it started with:
// W14-code r6 fr6-02, a changed save marks the core for a restart (core-restart.cjs mark), done idle before the next new
// session (the renderer no longer reconnects).
const fs = require("node:fs");
const path = require("node:path");

let prefsModule = null;
const loading = import("./prefs/local-environment.mjs").then((module) => { prefsModule ??= module; }, () => {});
function prefs() {
  if (prefsModule) return prefsModule;
  try { return prefsModule = require("./prefs/local-environment.mjs"); } catch { return null; }
}

function createLocalEnvironment({ app, safeStorage, file, managedKeys = () => [] } = {}) {
  const storage = () => safeStorage ?? (safeStorage = require("electron").safeStorage);
  const target = () => file || path.join(app.getPath("userData"), "local-environment.bin");
  let cache = null;

  function read() {
    if (cache) return cache;
    let data;
    try { data = fs.readFileSync(target()); } catch { return cache = {}; }
    try {
      cache = prefs().normalizeEnvironment(JSON.parse(storage().decryptString(data)));
    } catch (error) {
      // Unreadable (another machine's keychain, a damaged file): not cached, so the dialog's load fails and can retry.
      throw new Error(`Couldn’t read the local environment: ${error?.message || error}`);
    }
    return cache;
  }
  function write(variables) {
    const out = target();
    if (!Object.keys(variables).length) { fs.rmSync(out, { force: true }); cache = {}; return; }
    if (!storage()?.isEncryptionAvailable?.()) throw new Error("Secure storage is unavailable, so the environment variables can’t be saved.");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const temp = `${out}.${process.pid}.tmp`;
    fs.writeFileSync(temp, storage().encryptString(JSON.stringify(variables)), { mode: 0o600 });
    fs.renameSync(temp, out);
    cache = { ...variables };
  }
  const same = (a, b) => {
    const left = Object.keys(a), right = Object.keys(b);
    return left.length === right.length && left.every((key) => Object.hasOwn(b, key) && b[key] === a[key]);
  };

  async function run(p = {}) {
    await loading;
    switch (p.op) {
      case "get": return { variables: { ...read() } };
      case "save": {
        const variables = prefs().normalizeEnvironment(p.variables, { strict: true });
        let before = {};
        try { before = read(); } catch { before = {}; }
        write(variables);
        return { variables: { ...variables }, changed: !same(before, variables) };
      }
      default: throw new Error("Unknown local environment operation.");
    }
  }

  // The variables a core spawn adds; never throws (an unreadable file adds nothing).
  function launchEnv() {
    let variables;
    try { variables = read(); } catch (error) { console.warn(error?.message ?? error); return {}; }
    let managed;
    try { managed = new Set((managedKeys() ?? []).map((key) => String(key).toUpperCase())); } catch { managed = new Set(); }
    const isManaged = prefs()?.isManagedEnvKey ?? (() => true);
    return Object.fromEntries(Object.entries(variables).filter(([key]) => !managed.has(key.toUpperCase()) && !isManaged(key)));
  }

  return { run, read, launchEnv, ready: () => loading };
}

module.exports = { createLocalEnvironment };
