// Which agent core owns a remembered session, and how loadSessions splits the
// config's session ids between the running core and the other one. The ids
// themselves are never dropped from config: starting OpenClaude Desktop with the
// other core (CODE_DESKTOP_CORE=codex) brings those sessions back.

import { coreById, coreForEngine, sessionCore } from "../electron/core-registry.mjs";
import { tn } from "../electron/i18n/index.mjs";

// Thread.cliVersion is "dsh <version>" from the DeepSeek bridge (harness codex-app-server threadObject),
// "<core id> <version>" from another bridge, and a bare semver from Codex (core-registry.mjs sessionCore).
export const sessionEngine = sessionCore;

// boot.core.engine from initialize → the core id ("codex", "deepseek", "zcode", …); no engine is Codex.
export const coreEngine = (core) => coreForEngine(core?.engine).id;

// The core a boot is about: the one that reported (boot.core), else, when the start failed ({connected:false, config}
// with no core), the chosen one (config.core; none is the DeepSeek core main falls back to, core-manager.cjs chosen()).
// A connected boot without a core report, or no boot yet, stays Codex (the fixtures' case).
export function bootEngine(boot) {
  if (boot?.core) return coreEngine(boot.core);
  if (boot && boot.connected === false) {
    const chosen = typeof boot.config?.core === "string" ? boot.config.core.trim() : "";
    return chosen ? coreById(chosen)?.id ?? chosen : "deepseek";
  }
  return coreEngine(undefined);
}

/**
 * @param {{ids?: string[], results?: PromiseSettledResult<{thread?: object}>[], metadata?: Record<string, object>, archivedIds?: string[], engine?: "codex"|"deepseek"}} input
 *   ids: config.threadIds, results: thread/read per id (same order),
 *   metadata: config.threadMetadata, archivedIds: config.archivedThreadIds.
 * @returns {{active: object[], archived: object[], otherEngine: number, missing: number, missingIds: string[]}}
 *   active: read threads, newest first; archived: remembered rows this core
 *   can open; otherEngine: hidden sessions recorded by the other core;
 *   missing: other ids that could not be read.
 */
export function partitionSessions({ ids = [], results = [], metadata = {}, archivedIds = [], engine = "codex" } = {}) {
  const active = [], archived = [], missingIds = [];
  let otherEngine = 0, missing = 0;
  const foreign = (id) => {
    const owner = sessionEngine(metadata[id]);
    return owner !== null && owner !== engine;
  };
  ids.forEach((id, index) => {
    const result = results[index];
    if (result?.status === "fulfilled" && result.value?.thread) active.push(result.value.thread);
    else if (foreign(id)) otherEngine += 1;
    else { missing += 1; missingIds.push(id); }
  });
  active.sort((a, b) => b.updatedAt - a.updatedAt);
  for (const id of archivedIds) {
    const meta = metadata[id];
    if (!meta) continue;
    const owner = sessionEngine(meta);
    // An unattributed row predates engine tags, so only Codex shows it.
    if (meta.modelProvider === 'cowork-vm' || owner === engine || (owner === null && engine === "codex")) archived.push({ ...meta, archived: true });
    else if (foreign(id)) otherEngine += 1;
  }
  return { active, archived, otherEngine, missing, missingIds };
}

// The one-line sidebar notice for sessions loadSessions kept out of the list.
export function hiddenSessionsNotice(hidden, engine = "codex") {
  const missing = hidden?.missing || 0;
  void engine;
  // Sessions that belong to the other core stay silently hidden (user preference); only real load failures are noted.
  return missing > 0 ? tn(missing, "{count} session could not be loaded.", "{count} sessions could not be loaded.", { count: missing }) : "";
}
