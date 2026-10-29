// w10-shell-submit-queue (3.6556.2 c227f4d5e-B-FYKrwT.js wF, the Code composer; 2.42304.0 c227f4d5e OP has the same
// logic under other local names): the composer's two submit queues and the decisions its handle
// (`submit` / `releaseQueuedSubmit` / `dropQueuedSubmit`) and effects make over them, transcribed as host-agnostic
// functions so main.jsx and tests/w10-composer-submit-queue.test.mjs run the same code.
//
// 1. The editor queue `co` (2.42304.0 `$r`): a submit that carries a queued payload ({text, onLost}) while the editor
//    does not exist yet waits for it, keyed by the draft store key `o`:
//      submit:(e,t)=>Z||!t?hs(e):(co.current={...t,opts:e,storeKey:o},!0)
//    Once the editor (Z) or the key changes:
//      let e=co.current,t=e?.storeKey===o;!e||t&&!Z||(co.current=null,t&&Z!==null&&e.text===Wl(xM(Z))&&hs(e.opts)||e.onLost())
//    and unmounting the composer loses it: lo=()=>()=>{so(),co.current?.onLost()}.
//    The only queued caller is cc43287c9's fork auto-send (`n={text:ce,onLost:t};Xo.current?.submit({forkAutoSend:e},n)||t()`,
//    `ce` the fork draft's seeded text, gated by shared-1 AT `t?.autoSubmit?(t.autoSubmit=!1,!0):!1`); onLost reports
//    the c68c4283d fork prompt outcome "not_sent", which the host does not log.
// 2. The held submit `Xt` (2.42304.0 `pt`): while holdSubmit (the parent's branchCheckPending) is set or a send is in
//    flight, a submit is held as {opts, text, targetKey} (`Xt.current={opts:{…},text:Wl(xM(Z)),targetKey:$e}`, then
//    `Qt(!0)` — the Send button's submitQueued, `Is=Zt||it`). It is dropped (`en`) when the editor text changes
//    (`Xt.current!==null&&Xt.current.text!==e&&en()`), when the target key changes (`if(t.targetKey!==$e){en();return}`)
//    or by the parent's dropQueuedSubmit; releaseQueuedSubmit (`gs`) sends it only while the key is unchanged, the
//    composer is not disabled and no send is in flight:
//      let e=Xt.current;e===null||e.targetKey!==$e||zt.current||Yt.current||(en(),hs(e.opts))
//
// Host mapping. The host's held Home start (main.jsx heldStart {priority, key}, r4h-glue-decisions settleHeldStart over
// branch-picker-model heldStartStep) already plays the key drop and the release; trackHeldStartText adds the text drop:
// the draft text is stamped on the held start at its first look (the render that held it; holdStartOnWorkspaceRace's
// draft restore lands in the same batch) and an edit afterwards drops it, the edited draft staying unsent as in the
// original. heldStartReleaseWaits adds gs's own gate (review fix): a held start whose check settled with its key
// unchanged still waits while the composer is disabled (`zt.current`, Rt=f||m||Lt; host: !boot.connected || loading,
// SourceComposer's canSubmit) or a send is in flight (`Yt.current`; host: sending || actionPending), and goes out when
// that clears — the composer's own effect re-runs gs then (`!Qe&&!e&&!Rt&&gs()`, deps [Qe,$e,Rt,…]; the in-flight end
// via `.finally(…Xt.current!==null&&v?.())` → parent `cy||Xo.current?.releaseQueuedSubmit()`). The key drop
// (`if(t.targetKey!==$e){en();return}`) and the dirty-tree drop are not gated.
// w11-submit-queue-wiring wires the rest: heldSubmitQueued is `Zt` (SourceComposer submitHeld → the busy Send,
// `Is=Zt||it`); holdSubmitWhileInFlight is hs's `if(Qe||Yt.current)` hold for a send in flight (the same held start,
// released by the settle effect once `sending` clears); dropHeldSubmit is en for the parent's dropQueuedSubmit (a failed
// send, text put back); createEditorSubmitQueue is the `co` queue the host's /fork auto-send goes through.

import { heldStartStep } from "./branch-picker-model.mjs";

/** OP Ma's `Xt.current!==null&&Xt.current.text!==e&&en()` over a held entry: "none" (nothing held), "stamp" (the
 * held start has no text yet — host only, see above), "keep" (same text) or "drop" (the text changed). */
export function heldTextStep({ held, text }) {
  if (!held) return "none";
  if (typeof held.text !== "string") return "stamp";
  return held.text === text ? "keep" : "drop";
}

/** Applies heldTextStep to the host's held-start ref: stamps the text, or drops the held start (en) when the draft
 * changed under it. Returns the step. */
export function trackHeldStartText({ heldStart, text }) {
  const held = heldStart.current;
  const step = heldTextStep({ held, text: text ?? "" });
  if (step === "stamp") heldStart.current = { ...held, text: text ?? "" };
  else if (step === "drop") heldStart.current = null;
  return step;
}

/** `Zt`: a submit is held (the Send button shows its busy "Sending" state, `Is=Zt||it`). */
export function heldSubmitQueued(heldStart) {
  return !!heldStart?.current;
}

/** gs (releaseQueuedSubmit): "none" (nothing held), "wait" (the key changed — the effect drops it —, the composer is
 * disabled, or a send is in flight) or "release" (en(), then hs(opts)). */
export function releaseHeldSubmitStep({ held, key, disabled = false, inFlight = false }) {
  if (!held) return "none";
  if (held.targetKey !== key || disabled || inFlight) return "wait";
  return "release";
}

/** w11-submit-queue-wiring: hs's in-flight branch over the host's send() (`Yt` = the host's sendInFlight {text}, set
 * while sendMessage runs). A disabled composer never gets here (SourceComposer's canSend / send()'s own gates), and the
 * host always passes a release callback (`v`), so of hs's refusal
 *   ((zt.current&&…)||Yt.current)&&(…,zt.current||!v||Yt.current?.text===Wl(xM(Z)))
 * only the same-text case is left: "refuse" (the text in flight again, or an empty / machine submit under
 * `if(Qe||Yt.current)return e?.machineSend||Z.isEmpty&&!tn.current?!1:(Xt.current={…})`), "hold" (other text while a
 * send is in flight) or "send" (nothing in flight). */
export function inFlightSubmitStep({ inFlight, text, empty = false, machine = false }) {
  if (!inFlight) return "send";
  if (inFlight.text === text) return "refuse";
  return machine || empty ? "refuse" : "hold";
}

/** Applies inFlightSubmitStep in send(): a hold is `Xt.current={opts,text,targetKey:$e}` then `Qt(!0)` — the host's
 * held start {priority, key, text} (the text already stamped, so trackHeldStartText drops it on an edit) and a bump,
 * which re-renders the busy Send (heldSubmitQueued) and re-runs the settle effect that releases it (gs) once the send
 * in flight is over. Returns the step; send() goes on only on "send". */
export function holdSubmitWhileInFlight({ inFlight, priority, key, text, empty = false, heldStart, bumpHeldStart }) {
  const step = inFlightSubmitStep({ inFlight, text, empty });
  if (step === "hold") {
    heldStart.current = { priority, key, text };
    bumpHeldStart();
  }
  return step;
}

/** en (the handle's dropQueuedSubmit): `Xt.current!==null&&(Xt.current=null,Qt(!1))`. The parent calls it when a send
 * fails and when it puts text back into the composer. Returns true when something was held. */
export function dropHeldSubmit({ heldStart, bumpHeldStart }) {
  if (!heldStart?.current) return false;
  heldStart.current = null;
  bumpHeldStart();
  return true;
}

/** gs's gate over the host's held start: true when settleHeldStart would release it (heldStartStep "release": key
 * unchanged, check settled, no dirty-tree dialog) but the composer is disabled or a send is in flight, so the release
 * waits for the next run of the settle effect. A drop is never held back. */
export function heldStartReleaseWaits({ heldStart, pending = false, key, branchSwitch = null, disabled = false, inFlight = false }) {
  const held = heldStart?.current;
  if (heldStartStep({ held, pending, key, dialog: !!branchSwitch }) !== "release") return false;
  return releaseHeldSubmitStep({ held: { targetKey: held.key }, key, disabled, inFlight }) === "wait";
}

/**
 * The `co` editor queue of the composer handle.
 * @param {object} deps
 * @param {(opts: any) => boolean} deps.submitNow hs: the composer's submit; true when it took the submit.
 */
export function createEditorSubmitQueue({ submitNow }) {
  let pending = null;
  return {
    /** submit:(e,t)=>Z||!t?hs(e):(co.current={...t,opts:e,storeKey:o},!0) */
    submit(opts, queued, { editorReady, storeKey }) {
      if (editorReady || !queued) return submitNow(opts);
      pending = { ...queued, opts, storeKey };
      return true;
    },
    /** The [Z, o, hs] effect: "none" (nothing queued), "wait" (same key, still no editor), "sent" (the editor holds
     * the queued text and hs took it) or "lost" (another key, other text, or hs refused: onLost). */
    editorChanged({ editorReady, storeKey, editorText }) {
      const entry = pending;
      const sameKey = entry?.storeKey === storeKey;
      if (!entry) return "none";
      if (sameKey && !editorReady) return "wait";
      pending = null;
      if (sameKey && editorReady && entry.text === editorText && submitNow(entry.opts)) return "sent";
      entry.onLost?.();
      return "lost";
    },
    /** lo's cleanup: unmounting the composer loses the queued submit. */
    unmount() {
      const entry = pending;
      pending = null;
      entry?.onLost?.();
      return entry ? "lost" : "none";
    },
    get pending() {
      return pending;
    },
  };
}
