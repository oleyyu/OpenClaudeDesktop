// Detect the installed `codex` CLI version and flag drift from the version this
// runner's app-server bindings were verified against. Cheap, best-effort: a
// mismatch is a warning (method shapes are usually stable), not a hard failure.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

// Local isolated initialize/model-list/account handshake: workflow-handshake.json.
// Model execution is separately unverified (isolated account is unauthenticated).
export const VERIFIED_CODEX_VERSION = "0.155.1";

export async function detectCodexVersion() {
  try {
    const { stdout } = await exec("codex", ["--version"], { timeout: 10_000 });
    const m = String(stdout).match(/(\d+\.\d+\.\d+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// Returns a warning string if `found` differs from the verified version, else null.
export function versionDriftNote(found, pinned = VERIFIED_CODEX_VERSION) {
  if (!found || found === pinned) return null;
  return (
    `⚠ codex ${found} detected; this runner's app-server bindings were verified against ${pinned}. ` +
    `Calls should still work, but if they fail, regenerate bindings:\n` +
    `    codex app-server generate-json-schema --out ./schema`
  );
}
