// Codex is an Extension Pack (extensions/codex), not a built-in core: tests that run Codex as an added core register
// that pack the way extension-packs.cjs does at startup, beside any other pack cores a test registers.
import path from "node:path";
import { createRequire } from "node:module";
import { registerCores } from "../electron/core-registry.mjs";

const require = createRequire(import.meta.url);
const { validatePack, BUNDLED_DIR } = require("../electron/extension-packs.cjs");

/** The Codex pack's registered descriptor (extension-packs installed() shape). */
export function codexPackCore() {
  const dir = path.join(BUNDLED_DIR, "codex");
  const { manifest, core } = validatePack(dir);
  return { ...core, pack: { version: manifest.version, dir } };
}

/** Register the Codex pack and the given pack cores (registerCores replaces the whole list). */
export function registerCodexPack(list = []) {
  registerCores([codexPackCore(), ...list]);
}
