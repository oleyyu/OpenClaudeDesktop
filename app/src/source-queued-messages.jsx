import React, { useCallback, useMemo, useState } from "react";
// W14-code r7 r7c-01 (E84 / E95): the bar is the original 3.6556.2 QueuedMessageBar (cf74bc599 VE with WE / GE / BE / UE,
// scripts/extract-queued-bar.mjs); the host's restatement of the 2.2553.1 bar (SingleRow / MultiEntry / Row / RowMenu and
// their .sqm-* rules) is gone. This module is the host side: the Codex queue's entries and in-flight state as VE's props
// and stores, and Jfe's exit (useQueuedBandExit).
import { QueuedMessageBar } from "./generated/queued-bar/queued-bar.mjs";
import { QueuedBarStateContext } from "./source-queued-bar-adapter.jsx";
import { bandAccentClassName } from "./generated/session-rail-changes/branch-row-classes.mjs"; // shared-6 C_ (gen-final-7 D1: its one copy)
import { queuedBandStep, queuedBandView } from "./queued-messages-model.mjs";
import { useReducedMotion } from "./use-reduced-motion.js";
import "./source-queued-messages.css";

// cf74bc599 WE's single row (`x = `${br} px-lg select-none``, br = shared-6 w_ = C_() of the band frame), its count
// ("text-body-medium text-primary shrink-0") and preview ("flex-1 min-w-0 truncate text-body text-muted-as-secondary"):
// the host's pending-steer band (main.jsx / source-btw-pane.jsx, sends waiting for the next step while the transcript
// does not draw them) uses the same row.
export const QUEUED_ROW_CLASS = `${bandAccentClassName()} px-lg select-none`;
export const QUEUED_COUNT_CLASS = "text-body-medium text-primary shrink-0";
export const QUEUED_PREVIEW_CLASS = "flex-1 min-w-0 truncate text-body text-muted-as-secondary";

const SYSTEM_REMINDER = /<system-reminder>[\s\S]*?(?:<\/system-reminder>|$)/g;
/**
 * A Codex QueuedSubmission (`{id, input, preview}`, queued-messages-model.mjs queueFromList) as the entry VE draws: its
 * input as entry items, which cf74bc599 gE previews — text as text (a hidden workflow reminder is not the user's
 * words), an image "[Image]" (`image` / `pathImage`), a mention or skill as its `@name` text — or the host's preview
 * when it has no input.
 */
export function queuedBarEntry(entry) {
  const items = [];
  for (const [index, part] of (Array.isArray(entry?.input) ? entry.input : []).entries()) {
    if (!part || typeof part !== "object") continue;
    const id = `${entry.id}:${index}`;
    if (part.type === "text" && typeof part.text === "string") items.push({ kind: "text", id, text: part.text.replace(SYSTEM_REMINDER, "") });
    else if (part.type === "mention" || part.type === "skill") items.push({ kind: "text", id, text: `@${part.name ?? part.path ?? ""}` });
    else if (part.type === "image") items.push({ kind: "image", id });
    else if (part.type === "localImage") items.push({ kind: "pathImage", id, path: part.path });
  }
  if (!items.length && typeof entry?.preview === "string" && entry.preview !== "…") items.push({ kind: "text", id: `${entry?.id}:preview`, text: entry.preview });
  return { id: entry.id, author: "user", items };
}

// 3.6556.2 cc43287c9 Jfe over the bar's entries: the last lone entry is remembered (`i`, per session scope); when the
// queue empties and that entry has landed in the transcript (PM = c6b8adeaf bi, `e in t.landed`) — and motion is not
// reduced — the bar stays mounted with that entry (`o`) as `exiting` until its exit animation ends (onExited). Any other
// emptying (removed, cleared, another session) unmounts at once. `landed(entry)` is the host's landed test
// (queuedEntryLanded: its userMessage with clientId = clientUserMessageId is in the transcript). The epitaxy gate `n`
// (shared-11 us, claudeai_cc_epitaxy_session_presets_main) is always on in the host.
const QUEUED_BAND_IDLE = Object.freeze({ last: null, leaving: null });
export function useQueuedBandExit(entries, scope, landed) {
  const reduced = useReducedMotion();
  const [state, setState] = useState(QUEUED_BAND_IDLE);
  // Jfe's render-phase updates (a(...) / s(...)): React re-renders before committing, so the view reads the next state.
  const next = queuedBandStep(state, { entries, scope, landed, reduced });
  if (next !== state) setState(next);
  const onExited = useCallback(() => setState((current) => (current.leaving === null ? current : { ...current, leaving: null })), []);
  return { ...queuedBandView(next, { entries, scope }), onExited };
}

/**
 * The Codex queue's bar: cf74bc599 VE over the host's entries. `lockedIds`: entries with an operation in flight
 * (removal, edit, Send now), `steeringId`: the entry being sent now — c6b8adeaf's cancel / promotion stores the rows read
 * (QueuedBarStateContext: X busy "Removing…", Send now busy "Sending…"); while one is sent the others' Send now waits
 * (VE `steerBusy`). `sendNow(id)`: whether the queue may promote an entry now (canSendNow); Send now is offered while
 * any may. `onClearAll(ids)` (GE's Clear all; without it each unlocked entry is removed), `onReorder(activeId, overId)`
 * (BE's sortable rows). The `.sqm-band` wrapper is the composer column's layout hook (source-composer.css).
 *
 * W14-code r7 复核 (r7c-01): the locked entries other than the one being sent go to VE as `lockedIds` (a Set, as
 * cc43287c9 passes `lockedIds:yn` = `new Set([...])` to epe = VE): GE's `N = t.map(e => n?.has(e.id) === !0)` then
 * withholds their X, Edit, Send now, drag handle and menu, and Clear all skips them (`t.filter(e => !n?.has(e.id))`);
 * BE still draws the busy X / ArrowReturn from the stores. The entry being sent stays unlocked so its Send now shows
 * busy (vg). A lone entry is not handed to VE as locked — VE's single branch (`a = r ? void 0 : e.onCancel`) would drop
 * the X whose busy "Removing…" WE draws (`busy: h`, h = Cg) — so its Edit and Send now (and the X while it is being
 * sent) are withheld here instead, as the host's single row did.
 */
export function SourceQueuedMessages({ entries = [], lockedIds = [], steeringId = null, sendNow, onCancel, onEdit, onSteer, onReorder, onClearAll, exiting = false, onExited }) {
  const official = useMemo(() => entries.map(queuedBarEntry), [entries]);
  const state = useMemo(() => ({ busyIds: Array.isArray(lockedIds) ? lockedIds : [], sendingId: steeringId ?? null }), [lockedIds, steeringId]);
  const barLocked = useMemo(() => {
    const ids = (Array.isArray(lockedIds) ? lockedIds : []).filter((id) => id !== steeringId);
    return ids.length ? new Set(ids) : undefined;
  }, [lockedIds, steeringId]);
  if (!entries.length) return null;
  const steerOffered = !!onSteer && (!sendNow || !!steeringId || entries.some((entry) => sendNow(entry.id)));
  const lone = entries.length === 1 ? entries[0].id : null;
  const loneLocked = lone !== null && state.busyIds.includes(lone), loneSending = lone !== null && lone === steeringId;
  return <div className="sqm-band" data-queued-messages="" data-count={entries.length}>
    <QueuedBarStateContext.Provider value={state}>
      <QueuedMessageBar entries={official} lockedIds={lone === null ? barLocked : undefined}
        onCancel={loneSending ? undefined : onCancel} onEdit={loneLocked ? undefined : onEdit}
        onSteer={steerOffered && (!loneLocked || loneSending) ? onSteer : undefined}
        steerBusy={!!steeringId} onReorder={onReorder} onClearAll={onClearAll} exiting={exiting} onExited={onExited} />
    </QueuedBarStateContext.Provider>
  </div>;
}
