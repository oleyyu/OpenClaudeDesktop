// The focus-steal guard (official armFocusStealGuard; 2.42304.0 muI2IV6k xFr / dispatch, spec §1.6.3): an app_* action
// works on an app in the background while the user keeps working in another one. Some apps come to the front anyway
// (a press that activates its app, a window shown from the Dock), and then the user's typing goes to them. So every
// app_* action that reaches the target app — click, type, key, scroll, drag, a menu press, focus, bring to the current
// Space — is wrapped:
//
//   before(bundleId)   reads the frontmost app (native frontmostApp). The app the user is in is remembered as the one
//                      to put back, unless it is the target itself (the user works in it: nothing to guard) or this
//                      app (official: the host is never restored to). A target that came to the front with an earlier
//                      action and has not been put back yet keeps the app remembered then.
//   after(token)       arms two checks, at 500 ms and at 3 s after the action (official 500 ms / _Fr = 3e3): if the
//                      target is then the frontmost app, the remembered app is activated again (native activatePid:
//                      NSRunningApplication.activate, no all-windows option). Not when the user put the target in front
//                      themselves — their own left press since the action began (official: "left_to_the_user") — and
//                      not while another action on the same app is still running (its own after() arms new checks; a
//                      newer arming supersedes the older one). It answers at once whether the target is already in
//                      front, so the result can say so (official wording: frontNote).
//
// Nothing here posts input: the restore is the system's own activation of the app the user was in.
const CHECKS_MS = Object.freeze([500, 3000]);

/** What a result says when the target came to the front with the action (official shown_and_now_in_front wording). */
const frontNote = (name) => `${name} came to the FRONT with this action: either by itself, or because the user switched to it. The app the user was in is normally put back within 3 seconds; some of their typing may have gone to this one meanwhile. Tell the user, and do not take it for their consent to work in front of them.`;

const defaultSchedule = (ms, run) => { const timer = setTimeout(run, ms); timer.unref?.(); return timer; };

/**
 * @param {{native: {call(method: string, params?: object): Promise<any>}, ownPid?: number, log?: object,
 *          schedule?: (ms: number, run: () => void) => unknown, now?: () => number, checksMs?: number[]}} options
 *   schedule / now / checksMs: tests only.
 */
function createFocusGuard({ native, ownPid = process.pid, log = console, schedule = defaultSchedule, now = Date.now, checksMs = CHECKS_MS } = {}) {
  const remembered = new Map();   // target bundleId → {pid, bundleId}: the app to put back
  const armed = new Map();        // target bundleId → arming number (a newer one supersedes)
  const running = new Map();      // target bundleId → actions in flight
  const front = async () => { try { return (await native.call("frontmostApp")) ?? null; } catch { return null; } };
  const forget = (bundleId, n) => { if (armed.get(bundleId) === n) { armed.delete(bundleId); remembered.delete(bundleId); } };

  async function check(token, n, last) {
    const { bundleId } = token;
    if (armed.get(bundleId) !== n) return;
    try {
      if ((running.get(bundleId) ?? 0) > 0) return;
      const now0 = await front();
      if (now0?.bundleId !== bundleId) return;
      const prior = remembered.get(bundleId);
      if (!prior) return;
      const sinceAction = (now() - token.startedAt) / 1000;
      if (typeof now0.secondsSinceUserMouseDown === "number" && now0.secondsSinceUserMouseDown < sinceAction) {
        // The user clicked since the action began: they put the target in front themselves.
        log.info?.(`[cu focus-guard] ${bundleId} is in front after the user's own click; left to the user`);
        forget(bundleId, n);
        return;
      }
      const answer = await native.call("activatePid", { pid: prior.pid }).catch((error) => ({ error: String(error?.message ?? error) }));
      log.info?.(`[cu focus-guard] ${bundleId} came to the front; put ${prior.bundleId ?? `pid ${prior.pid}`} back (${JSON.stringify(answer)})`);
    } catch (error) {
      log.warn?.(`[cu focus-guard] check failed: ${String(error?.message ?? error)}`);
    } finally {
      if (last) forget(bundleId, n);
    }
  }

  return {
    checksMs,
    /** Before an app_* action on `bundleId`: who is in front now. Never throws. */
    async before(bundleId) {
      const startedAt = now();
      running.set(bundleId, (running.get(bundleId) ?? 0) + 1);
      let prior = remembered.get(bundleId) ?? null;
      if (!prior) {
        const f = await front();
        prior = f && Number.isInteger(f.pid) ? { pid: f.pid, bundleId: typeof f.bundleId === "string" ? f.bundleId : null } : null;
      }
      if (prior && (prior.pid === ownPid || prior.bundleId === bundleId)) prior = null;
      return { bundleId, prior, startedAt };
    },
    /**
     * After the action (whatever its outcome): arm the checks when there is an app to put back. → {cameToFront} — the
     * target is the frontmost app right now.
     */
    async after(token) {
      const { bundleId, prior } = token;
      const left = (running.get(bundleId) ?? 1) - 1;
      if (left > 0) running.set(bundleId, left); else running.delete(bundleId);
      if (!prior) return { cameToFront: false, guarded: false };
      remembered.set(bundleId, prior);
      const n = (armed.get(bundleId) ?? 0) + 1;
      armed.set(bundleId, n);
      checksMs.forEach((ms, index) => schedule(ms, () => { check(token, n, index === checksMs.length - 1); }));
      const f = await front();
      return { cameToFront: f?.bundleId === bundleId, guarded: true };
    },
    /** Tests / diagnostics: the app each target would be put back to. */
    pending: () => Object.fromEntries([...remembered].map(([bundleId, prior]) => [bundleId, { ...prior }])),
  };
}

module.exports = { createFocusGuard, frontNote, CHECKS_MS };
