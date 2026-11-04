// W14-code r2 closeout-2 (fr2-09): deleting a saved environment that sessions were started from, after 3.6556.2
// c6aeda0b7 runEnvironmentDelete (`M`, lazily loaded by cc43287c9 Wa = Wue and handed to the environment dialog as
// onDeleteAsk; ca690a791 I `Ii`). The question itself is the original cc3b500c8 dialog
// (generated/code-current/environment-delete-question.mjs). This is the host's runner over its own session list
// (E84 tier 2): c6aeda0b7 reads the official sidebar / session stores (shared-46 M, shared-8 Df, shared-52 mu / ah) and the
// bulk delete runtime (shared-11 Xi beginBulkDelete), which the host does not have; the decisions, the order of the
// checks and the copy follow c6aeda0b7 line by line.
//
// A session belongs to the environment when it is a local Code session, not archived, was started from it
// (sessionMetadata.environmentId, written by main.cjs when the session starts: c6aeda0b7 k `startedFromEnvironmentId`)
// and is still recorded there (k `i({id, startedFromEnvironmentId: t}, o) === n`, the rail's record when it has one).

// c6aeda0b7 T, verbatim.
export const ENVIRONMENT_DELETE_MESSAGES = Object.freeze({
  nothingDeleted: { defaultMessage: "Nothing was deleted because the sessions changed. To try again, edit the environment and delete it.", id: "9Kh0Sl6y5p" },
  unexpected: { defaultMessage: "Couldn’t finish deleting “{name}”.{sessionsToo, select, yes { Some of its sessions may already be deleted.} other {}} To try again, edit the environment and delete it.", id: "2lJbC4ftXJ" },
  stillDeleting: { defaultMessage: "Still deleting the sessions started from “{name}”. The environment is deleted once they all are.", id: "0x6sqshKBL" },
  environmentKept: { defaultMessage: "{count, plural, one {# session wasn’t deleted} other {# sessions weren’t deleted}}, so “{name}” was kept. To try again, edit the environment and delete it.", id: "CL1XOKy91Y" },
});
// shared-78 WS (the sidebar's bulk messages) that c6aeda0b7 reads as `d`, verbatim.
export const ENVIRONMENT_DELETE_BULK_MESSAGES = Object.freeze({
  bulkDeleted: { defaultMessage: "Deleted {count, plural, one {# session} other {# sessions}}", id: "2tQzCPSbi0" },
  bulkDeleteFailed: { defaultMessage: "{count, plural, one {# session} other {# sessions}} couldn’t be deleted. Try again.", id: "RDSc3nybsj" },
});

/**
 * c6aeda0b7 k + A: the sessions started from `environmentId`, keyed by id, with c6aeda0b7 O's running and the pin.
 * @param {{ sessions: Array<{id: string, archived?: boolean}>, sessionMetadata?: object, recordedEnvironment?: (id: string) => string|undefined,
 *   isRunning?: (id: string) => boolean, pinnedIds?: Iterable<string> }} source
 */
export function environmentDeleteTargets(environmentId, { sessions = [], sessionMetadata = {}, recordedEnvironment = () => undefined, isRunning = () => false, pinnedIds = [] } = {}) {
  const pinned = new Set(pinnedIds);
  const targets = new Map();
  for (const session of sessions) {
    if (!session || typeof session.id !== "string" || session.archived === true) continue;
    const meta = sessionMetadata[session.id] ?? {};
    // Code sessions only (Chat / Cowork sessions start from no environment).
    if (meta.surface !== undefined && meta.surface !== "code") continue;
    const started = meta.environmentId;
    if (started !== environmentId) continue;
    const recorded = recordedEnvironment(session.id);
    if ((typeof recorded === "string" ? recorded : started) !== environmentId) continue;
    targets.set(session.id, { target: session, running: isRunning(session.id) === true, pinned: pinned.has(session.id) });
  }
  return targets;
}

/** c6aeda0b7 j: the sessions changed between the question and the choice (one more, or one now running / pinned). */
export function environmentDeleteTargetsChanged(before, after) {
  if ([...before.keys()].some((id) => !after.has(id))) return true;
  return [...after].some(([id, next]) => {
    const previous = before.get(id);
    return !previous || (next.running && !previous.running) || (next.pinned && !previous.pinned);
  });
}

/**
 * c6aeda0b7 M. `host`: readTargets(environmentId) → Map (environmentDeleteTargets over the current state); ask(question)
 * → "environmentOnly" | "withSessions" | null (cc3b500c8 r); deleteSession(target) → true when deleted (a refusal or a
 * declined confirm is false); removeEnvironment(environment, result); environmentExists(id); format(message, values); toast(message,
 * variant). One runner per window: it keeps c6aeda0b7's E (environment id → "asking" / "deleting").
 */
export function createEnvironmentDelete(host) {
  const inFlight = new Map();
  return async function runEnvironmentDelete({ environment, onChosen = () => {}, isCurrent = () => true }) {
    const state = inFlight.get(environment.id);
    if (state === "asking" || !isCurrent()) return true;
    if (state === "deleting") {
      onChosen();
      host.toast(host.format(ENVIRONMENT_DELETE_MESSAGES.stillDeleting, { name: environment.name }), "neutral");
      return true;
    }
    const before = host.readTargets(environment.id);
    if (before.size === 0) return false;
    const stillThere = () => host.environmentExists(environment.id);
    inFlight.set(environment.id, "asking");
    let choice = null;
    try {
      const rows = [...before.values()];
      choice = await host.ask({ name: environment.name, count: before.size, pinnedCount: rows.filter((row) => row.pinned).length,
        runningCount: rows.filter((row) => row.running).length, someRanElsewhere: false });
      if (choice === null) return true;
      onChosen();
      if (!stillThere()) return true;
      inFlight.set(environment.id, "deleting");
      if (choice === "environmentOnly") {
        await host.removeEnvironment(environment, { deleteChoice: "environment_only", deletedSessionCount: 0 });
        return true;
      }
      const after = host.readTargets(environment.id);
      if (environmentDeleteTargetsChanged(before, after)) {
        host.toast(host.format(ENVIRONMENT_DELETE_MESSAGES.nothingDeleted), "danger");
        return true;
      }
      const targets = [...after.values()].map((row) => row.target);
      let deleted = 0, failed = 0;
      for (const target of targets) {
        try { if (await host.deleteSession(target)) deleted += 1; }
        catch { failed += 1; }
      }
      if (deleted > 0) host.toast(host.format(ENVIRONMENT_DELETE_BULK_MESSAGES.bulkDeleted, { count: deleted }), "neutral", { key: "environment-delete", timeout: 3000 });
      const present = stillThere();
      if (deleted < targets.length || !present) {
        if (!present) { if (failed > 0) host.toast(host.format(ENVIRONMENT_DELETE_BULK_MESSAGES.bulkDeleteFailed, { count: failed }), "danger"); return true; }
        const kept = host.format(ENVIRONMENT_DELETE_MESSAGES.environmentKept, { name: environment.name, count: targets.length - deleted });
        host.toast(kept, failed > 0 ? "danger" : "neutral");
        return true;
      }
      await host.removeEnvironment(environment, { deleteChoice: "with_sessions", deletedSessionCount: deleted });
      return true;
    } catch {
      host.toast(host.format(ENVIRONMENT_DELETE_MESSAGES.unexpected, { name: environment.name, sessionsToo: choice === "withSessions" ? "yes" : "no" }), "danger");
      return true;
    } finally {
      inFlight.delete(environment.id);
    }
  };
}
