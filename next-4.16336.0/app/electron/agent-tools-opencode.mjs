// The app thread an OpenCode 2.x tools/call is for (agent-tools-server.mjs). OpenCode runs one code_desktop server per
// folder for every session in it. 1.x's bridge plugin names the thread in a hidden tool argument
// (__code_desktop_session), but 2.x decodes a call's arguments against the tool's input schema first and drops what it
// doesn't list (additionalProperties:false: most of the app's tools). 2.x names the calling session itself instead, in
// every call's `_meta["ai.opencode/sessionID"]` (core/src/mcp/client.ts), and the OpenCode bridge's runtime files map
// it to the thread:
//   $CODE_DESKTOP_OPENCODE_RUNTIME/sessions/<id>.json   appTools.session: the session's app thread (a sub-agent's: its root)
//   $CODE_DESKTOP_OPENCODE_RUNTIME/sandbox/<id>.root    a sub-agent the bridge has no file for yet: its root's id
// (harness/packages/opencode-bridge src/v2/config.js sets the variable on this server under 2.x only, so 1.x and MiMo
// keep the hidden argument). Node built-ins only, like the server.
import fs from "node:fs";
import path from "node:path";

export const OPENCODE_SESSION_META = "ai.opencode/sessionID";
export const OPENCODE_RUNTIME_ENV = "CODE_DESKTOP_OPENCODE_RUNTIME";

const safe = (id) => String(id).replace(/[^A-Za-z0-9_-]/g, "_");
const sessionId = (value) => (typeof value === "string" && value && value.length <= 200 ? value : null);

/** The app thread a 2.x call's `_meta` names, or null (no runtime folder, no session, a session the bridge never wrote). */
export function opencodeThread(meta, env = process.env) {
  const dir = env?.[OPENCODE_RUNTIME_ENV];
  const id = sessionId(meta?.[OPENCODE_SESSION_META]);
  if (typeof dir !== "string" || !path.isAbsolute(dir) || !id) return null;
  const thread = (session) => {
    try {
      const value = JSON.parse(fs.readFileSync(path.join(dir, "sessions", `${safe(session)}.json`), "utf8"));
      return sessionId(value?.appTools?.session);
    } catch { return null; }
  };
  const own = thread(id);
  if (own) return own;
  let root = null;
  try { root = sessionId(fs.readFileSync(path.join(dir, "sandbox", `${safe(id)}.root`), "utf8").trim()); } catch { /* none */ }
  return root ? thread(root) : null;
}
