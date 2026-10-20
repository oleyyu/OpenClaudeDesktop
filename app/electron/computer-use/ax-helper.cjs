// Runs helpers/cu-ax/build/cu-ax-helper (main.swift there): the Accessibility calls the native module doesn't expose
// yet — window focus, the menu bar, the app list. One process per call: the request as JSON on stdin, the answer as one
// JSON line, {ok, result} or {ok: false, error: {code, message, details?}}. A child of the app, so macOS counts its
// Accessibility use against the app's own permission. In the packaged app the binary is unpacked beside app.asar.
// A missing binary is not fatal: every call rejects with code "helper_unavailable".
const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { coded } = require("./native.cjs");

const HELPER = path.join(__dirname, "..", "..", "helpers", "cu-ax", "build", "cu-ax-helper");
const TIMEOUT_MS = 8000;

function run(file, input) {
  return new Promise((resolve, reject) => {
    const child = execFile(file, [], { timeout: TIMEOUT_MS, maxBuffer: 8 << 20 }, (error, stdout) => {
      if (error && !stdout) return reject(coded(error.killed ? "helper_timeout" : "helper_failed", error.message));
      resolve(String(stdout));
    });
    child.stdin.end(input);
  });
}

/** @param {{file?: string, exec?: (file: string, input: string) => Promise<string>, platform?: string}} [options]  exec: tests only. */
function createAxHelper({ file = HELPER.replace(/app\.asar(?=[\\/])/, "app.asar.unpacked"), exec = run, platform = process.platform } = {}) {
  const available = () => platform === "darwin" && (exec !== run || fs.existsSync(file));
  return {
    file,
    available,
    async call(method, params = {}) {
      if (!available()) throw coded("helper_unavailable", platform !== "darwin" ? "Computer use is macOS only." : `${file} is not built (npm run build:native).`);
      const line = (await exec(file, JSON.stringify({ method, params }))).trim().split("\n").pop();
      let envelope;
      try { envelope = JSON.parse(line); } catch { throw coded("helper_failed", "The Accessibility helper answered with something that isn't JSON."); }
      if (envelope?.ok === true) return envelope.result;
      const error = coded(envelope?.error?.code || "internal", envelope?.error?.message);
      if (envelope?.error?.details) error.details = envelope.error.details;
      throw error;
    },
  };
}

module.exports = { createAxHelper, HELPER };
