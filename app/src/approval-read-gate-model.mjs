// The approval card's read gate (toolcards-01): Rj's bookkeeping around the generated ApprovalReadRows (UDe), from
// Claude Desktop 2.42304.0 c96d752d0-BOCqU7c2.js. Pure functions over one per-card store, so the card component only
// wires them and the states the card cannot reach in SSR (held, replayed) stay testable.
//
//   wj            the per-card store `{get, set, subscribe}` (Rj `[it] = d(wj)`, read with useSyncExternalStore `I`)
//   st            onReadState: ignore a repeat, and "unlaid" once a state is known; `hinted` latches on "unread"
//   gt            onRowsFit: ignored once read; a "doesn't fit" sticks (`t.fits !== !1 && e`)
//   rt            the gate key `${e.id}\nrows\n${xj(Ie)}` (xj = JSON of the rows)
//   ht            unread = Oj(rt, state) = rt !== null && state !== "read"
//   yt            held = rt !== null && (… || rowsReadGate.loose !== !0 || fits === !1 || state === "unlaid")
//   bt            the allow buttons are disabled = ht && yt, with `disabledReason: Dt` (Cj; Dt = rowsReadGate.hint)
//   Et / St       a blocked allow while not held and unread replays the hint in the sr-only aria-live line; the count's
//                 parity adds a NBSP so a repeat is announced again
//   At            the visible hint line: (yt && mt && (mt.hinted || (card && unlaid))) || St.key === rt; "invisible"
//                 unless unread
//   pn            the click arming key gains "\nheld-look" while held
//   Mj K && h     the "What Claude sent" label over the rows while held
// The Allow paths (Rj Nt / Rt / Cp): any allow click while unread is blocked and replays (Et); from the keyboard
// only Allow once replays (Cp allowOnce → Nt), the persistent chord does nothing while unread (`ht ? () => void 0`),
// and nothing is replayed while held (Nn.disabled).

/** wj: the per-card read-state store. */
export function createReadGateStore() {
  let value = null;
  const listeners = new Set();
  return {
    get: () => value,
    set(next) {
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

/** Rj st: record what ApprovalReadRows reports ("read" | "unread" | "waiting" | "unlaid") for this gate key. */
export function recordReadState(store, key, state) {
  if (key === null || key === undefined) return false;
  const current = store.get();
  const known = current?.key === key ? current : undefined;
  if (known?.state === state || (known !== undefined && state === "unlaid")) return false;
  store.set({ key, state, hinted: known?.hinted === true || state === "unread", ...(known?.fits === undefined ? {} : { fits: known.fits }) });
  return true;
}

/** Rj gt: record whether the rows' scroll container shows them whole (UDe onFits); a "doesn't fit" sticks. */
export function recordRowsFit(store, key, fits) {
  const current = store.get();
  if (key === null || key === undefined || current?.key !== key || current.state === "read") return false;
  const next = current.fits !== false && fits;
  if (next === current.fits) return false;
  store.set({ ...current, fits: next });
  return true;
}

/** rt: the gate key for a card. `identity` is the card's request identity (the store is the card's own, so an
 * object identity only needs the rows part); the rows text stands in for xj's JSON of the rows. */
export function readGateKey(identity, model) {
  if (!model?.rowsReadGate || !model.detail) return null;
  const id = typeof identity === "string" || typeof identity === "number" ? String(identity) : "";
  return `${id}\nrows\n${typeof model.detail.text === "string" ? model.detail.text : JSON.stringify(model.detail.value ?? null)}`;
}

const NO_GATE = Object.freeze({ gated: false, key: null, unread: false, held: false, allowDisabled: false, disabledReason: undefined,
  heldLabel: false, hintShown: false, hintInvisible: true, liveRegion: false, liveText: "", armSuffix: "" });

const isHeld = (gate, known) => gate.loose !== true || known?.fits === false || known?.state === "unlaid";

/** What Rj derives for one render from the store snapshot and the last replay (St). */
export function readGateView({ gate, key, snapshot, replay = null, presentation = "card" }) {
  if (!gate || key === null || key === undefined) return NO_GATE;
  const known = snapshot?.key === key ? snapshot : undefined;
  const unread = known?.state !== "read";
  const held = isHeld(gate, known);
  const replayed = replay?.key === key;
  return {
    gated: true, key, unread, held,
    allowDisabled: unread && held,
    disabledReason: gate.hint,
    heldLabel: held,
    hintShown: (held && known !== undefined && (known.hinted || (presentation === "card" && known.state === "unlaid"))) || replayed,
    hintInvisible: known?.state !== "unread",
    liveRegion: !held,
    liveText: replayed && known?.state === "unread" ? `${gate.hint}${(replay.count ?? 0) % 2 === 0 ? " " : ""}` : "",
    armSuffix: held ? "\nheld-look" : "",
  };
}

/** Whether an allow goes through now: "proceed", "replay" (blocked; replay the hint) or "ignore" (blocked, silent).
 * `current` is the store's live value (Rj pt/xt read it, not the render's snapshot). via: "click" | "keyboard";
 * primary: the Allow once action. Deny is never gated, so callers only ask for allows. */
export function readGateAllowIntent({ gate, key, current, via = "click", primary = false }) {
  if (!gate || key === null || key === undefined) return "proceed";
  const known = current?.key === key ? current : undefined;
  if (known?.state === "read") return "proceed";
  if (via === "keyboard" && !primary) return "ignore";
  if (isHeld(gate, known)) return "ignore";
  return known?.state === "unread" ? "replay" : "ignore";
}

/** St after one replay (Ct): the count restarts for a new key. */
export function nextReadGateReplay(previous, key) {
  return { key, count: previous?.key === key ? previous.count + 1 : 1 };
}
