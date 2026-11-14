import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { KeptAwakeBand, SleepBand } from "./generated/session-rail/sleep-band.mjs";
import { CodeNoticeRegionContext, CodeNoticeSlotsProvider, tailSessionNotice } from "./generated/composer-notices/code-notice-slots.mjs";
import { createStore, useStore } from "./generated/session-rail-kit/react-store.mjs";
import { TranscriptInsetRow, TranscriptSessionNotice } from "./generated/code-transcript/code-transcript.mjs";
import { InlineBandSlotContext, SessionBandsHostContext } from "./source-session-rail-adapters.jsx";

// W14-code r6 sleep lane (r6-composer-03 / fr6-01 / sh6-01 / css6-sleep-band / gates-r6-10 / R6T-03): the Code session's
// sleep and kept-awake bands are the original 3.6556.2 ones.
//
// - cf74bc599 vA (EpitaxySessionBands) mounts `s(wO, {sessionRef, inTranscript, scopeStore, focusComposer}, `${t}:sleep`)`
//   and `s(dO, {…}, `${t}:kept-awake`)`; SourceSessionBands mounts the sliced wO / dO (generated/session-rail/sleep-band.mjs)
//   the same way, and answers what they read of the desktop (SessionBandsHostContext, source-session-rail-adapters.jsx).
// - Each band is c73f45bc3 Qg (k_, code-band.mjs): inside the Code notice region it registers `{kind: "custom", render →
//   $g → e_ → shared-6 kT}` under its slot ("sleep" / "keptAwake") with c227f4d5e uI, into cI's slot table. cc43287c9 Ide
//   provides that table (ID) and the region flag (ete = c227f4d5e eI) around the session; SourceCodeNoticeRegion is that
//   pair. Rde reads the table in rI's order into shared-26 RM (source-session-notices.jsx SourceSessionNotices).
// - With inTranscript (the unified renderer's tail rows show) and no keep-awake offer, wO puts its urgent notice Ie on the
//   scope store (`Wm(r, "sleepNotice", Ie)`, c227f4d5e pY), as dO does with its own (`Wm(r, "keepAwakeNotice", ke)`);
//   the transcript's tail draws c227f4d5e uY of them (`sleepNotice ?? refusalFallbackNotice ?? keepAwakeNotice ??
//   newerModelNotice`) as c96d752d0 i9's "sessionNotice" row: `t9(r, f(GG, {notice}))` — SourceTailSessionNotice.
//
// The scope store holds the fields the bands and the tail read: the four tail notices and `sessionNoticeSlot` (cf74bc599
// sets it from the renderer's tail line, c227f4d5e dpe: no auto-archive hold or stale compact takes the line; the host
// has neither, so the slot is the tail itself: inTranscript).
export function createSessionBandsScopeStore() {
  return createStore()(() => ({ sleepNotice: null, refusalFallbackNotice: null, keepAwakeNotice: null, newerModelNotice: null, sessionNoticeSlot: false }));
}

/** cc43287c9 Ide's providers: the region flag (ete, c227f4d5e eI) and the slot table (ID, c227f4d5e cI) for `session`.
 * W14-code r7 notices (E81): Ide mounts them only under __gb__100087145 (`r = Mt(Fde, !0) … if (!a) return n;`), which is
 * off on the 3P desktop; main.jsx mounts this only with the rollback switch local_code_notice_region (host-growthbook.mjs).
 * Without it k_ draws the band inline (c227f4d5e oL, source-session-rail-adapters.jsx InlineCodeBand). */
export function SourceCodeNoticeRegion({ session, children }) {
  return <CodeNoticeRegionContext.Provider value={true}>
    <CodeNoticeSlotsProvider session={session ?? null}>{children}</CodeNoticeSlotsProvider>
  </CodeNoticeRegionContext.Provider>;
}

/**
 * cf74bc599 vA's sleep and kept-awake bands for the local session `sessionId`. Host data: running (the session's turn),
 * inputWaiting (its queued input), config / saveSettings (the desktop settings: keepAwake, keepAwakeOnBattery),
 * sendContinue(text) (the fixed-turn send), stopSession() (Stop, which SO awaits before the continue send).
 */
export function SourceSessionBands({ sessionId, scopeStore, inTranscript = false, running = false, inputWaiting = false, config = null,
  saveSettings, sendContinue, stopSession, focusComposer, inlineSink = null }) {
  const host = useMemo(() => ({ sessionId, running, inputWaiting, config, saveSettings, sendContinue, stopSession }),
    [sessionId, running, inputWaiting, config, saveSettings, sendContinue, stopSession]);
  const sessionRef = useMemo(() => (sessionId ? { type: "local", id: sessionId } : null), [sessionId]);
  useEffect(() => {
    if (scopeStore && scopeStore.getState().sessionNoticeSlot !== inTranscript) scopeStore.setState({ sessionNoticeSlot: inTranscript });
  }, [scopeStore, inTranscript]);
  if (!sessionRef || !scopeStore) return null;
  const sleep = <SleepBand key={`${sessionId}:sleep`} sessionRef={sessionRef} inTranscript={inTranscript} scopeStore={scopeStore} focusComposer={focusComposer} />;
  const keptAwake = <KeptAwakeBand key={`${sessionId}:kept-awake`} sessionRef={sessionRef} inTranscript={inTranscript} scopeStore={scopeStore} focusComposer={focusComposer} />;
  return <SessionBandsHostContext.Provider value={host}>
    {inlineSink ? <>
      <InlineBandSlotContext.Provider value={inlineSink.slot("sleep")}>{sleep}</InlineBandSlotContext.Provider>
      <InlineBandSlotContext.Provider value={inlineSink.slot("keptAwake")}>{keptAwake}</InlineBandSlotContext.Provider>
    </> : <>{sleep}{keptAwake}</>}
  </SessionBandsHostContext.Provider>;
}

// W14-code r6 sleep review fix (只改 Code 模式): Chat / Cowork have no Code notice region — the official bands are
// cc43287c9 EpitaxySessionScopeBody's (cf74bc599 vA) only — so they keep the host's notice stack as it was before this
// lane: the sleep and kept-awake bands as two of its CdsBanner entries, after the workspace headline and before the usage
// limit, in its own order (no rI slots). The bands still decide what shows (wO / dO); outside the region their k_ falls
// to c227f4d5e oL (InlineCodeBand), which hands its props to this sink instead of drawing. The stack's entries change
// only when a band appears or goes (one per mount: a band shown again is a new entry, so its dismissal never hides the
// next one); the banner reads the band's latest props from the sink.
export function createInlineBandSink() {
  let seq = 0, presence = [];
  const bands = new Map(), slots = new Map(), listeners = new Set(), bandListeners = new Set();
  const notify = (set) => { for (const listener of [...set]) listener(); };
  const update = () => {
    presence = ["sleep", "keptAwake"].filter((name) => bands.has(name)).map((name) => ({ name, seq: bands.get(name).seq }));
    notify(listeners);
  };
  const sink = {
    nextSeq: () => ++seq,
    set(name, id, band) {
      const had = bands.get(name);
      bands.set(name, { seq: id, band });
      if (had?.seq !== id) update();
      notify(bandListeners);
    },
    remove(name, id) {
      if (bands.get(name)?.seq !== id) return;
      bands.delete(name);
      update();
      notify(bandListeners);
    },
    band: (name) => bands.get(name)?.band ?? null,
    presence: () => presence,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    subscribeBands(listener) { bandListeners.add(listener); return () => bandListeners.delete(listener); },
    slot(name) {
      if (!slots.has(name)) slots.set(name, { sink, name });
      return slots.get(name);
    },
  };
  return sink;
}
/** One inline-band sink per session view (Chat / Cowork). */
export function useInlineBandSink() {
  const [sink] = useState(createInlineBandSink);
  return sink;
}
/** The sink's bands as host notice entries ({kind: "sleep" | "keptAwake", inlineBand}), sleep first (as before this lane). */
export function useInlineBandNotices(sink) {
  const presence = useSyncExternalStore(sink.subscribe, sink.presence, sink.presence);
  return useMemo(() => presence.map(({ name, seq }) => ({
    kind: name, level: "info", dismissKey: `${name}:${seq}`, inlineBand: sink.slot(name),
    onDismiss: () => sink.band(name)?.onDismiss?.(),
  })), [presence, sink]);
}

/** c227f4d5e uY over the scope store: the notice the transcript tail shows, if any. */
export function useTailSessionNotice(scopeStore) {
  return useStore(scopeStore, tailSessionNotice) ?? null;
}
/** The transcript tail's session notice, drawn as c96d752d0 i9 `t9(r, f(GG, {notice}))`. */
export function SourceTailSessionNotice({ notice }) {
  return notice ? <TranscriptInsetRow><TranscriptSessionNotice notice={notice} /></TranscriptInsetRow> : null;
}

/** One scope store per session view (the bands' writes are cleared when they unmount, c227f4d5e pY). */
export function useSessionBandsScopeStore() {
  const [store] = useState(createSessionBandsScopeStore);
  return store;
}
