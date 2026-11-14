// Loads native/computer-use/build/computer_use.node (built by native/computer-use/build.mjs) and wraps its single
// export, `call(method, paramsJson) → Promise<string>`, whose JSON is {ok, result} or {ok: false, error: {code, message,
// details?}} (details, e.g. menu_item_not_found's closestMatch, is kept on the thrown error).
// In the packaged app the module is unpacked beside app.asar (dlopen cannot read inside an archive).
// A missing or unloadable module is not fatal: every call rejects with code "native_unavailable".
const path = require("node:path");

const MODULE = path.join(__dirname, "..", "..", "native", "computer-use", "build", "computer_use.node");

function coded(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

function createNative({ file = MODULE.replace(/app\.asar(?=[\\/])/, "app.asar.unpacked"), load = require, platform = process.platform } = {}) {
  let binding, loadError = null;
  const get = () => {
    if (binding !== undefined) return binding;
    if (platform !== "darwin") { loadError = "Computer use is macOS only."; return (binding = null); }
    try { binding = load(file); } catch (error) { loadError = error.message; binding = null; }
    if (binding && typeof binding.call !== "function") { loadError = "computer_use.node has no call()."; binding = null; }
    return binding;
  };
  return {
    file,
    available: () => Boolean(get()),
    loadError: () => (get(), loadError),
    async call(method, params = {}) {
      const native = get();
      if (!native) throw coded("native_unavailable", loadError);
      const envelope = JSON.parse(await native.call(method, JSON.stringify(params)));
      if (envelope?.ok === true) return envelope.result;
      const error = coded(envelope?.error?.code || "internal", envelope?.error?.message);
      if (envelope?.error?.details && typeof envelope.error.details === "object") error.details = envelope.error.details;
      throw error;
    },
  };
}

module.exports = { createNative, coded, MODULE };
