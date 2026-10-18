// R4i-small SM1 (cov0-05): the "Claude kept your computer awake" band of Claude Desktop 2.42304.0.
//
// Renderer ion-dist/assets/v1/cf74bc599-D9NZWRyl.js:
//   ZC="epitaxy-keep-awake-band-used" (pi(ZC,!1,{scope:"account"}): once the band was used it never shows again),
//   $C={keptAwake "Claude kept your computer awake for {duration}." o4fhLORTcB, canSleepNow "This lets long tasks
//       finish. Your computer can sleep as usual now." leA6hDdNhw, onlyPluggedIn "Only when plugged in" RcWyvP8gI5,
//       dontKeepAwake "Don’t keep awake" 6/uGp8JWcE, continueInCloud …},
//   ew(e,t): n=max(1,round(t/6e4)) minutes, formatted {hours:floor(n/60),minutes:n%60} with
//       {unitDisplay:"short",listType:"unit",listStyle:"narrow"} (shared-19 SW, generated formatDurationUnits),
//   tw: W = local session && keep-awake supported && no sleepInterruption && not running && ccKeepAwakeWhileWorking
//       on && account prefs ready && (!bandUsed) && settled && slot && endedAt!==null && endedAt!==dismissedEndedAt,
//   nw: [Continue in cloud (qC=!1: never)], "Only when plugged in" when ccKeepAwakeOnBattery is on, "Don’t keep awake";
//   rw: icon CoffeeCup, message $C.keptAwake, detail $C.canSleepNow, cta/secondary from nw, onDismiss.
//   K(): every action and the dismiss mark the band used (ae) and hide this endedAt (A(W)); a message sent in the
//   session does the same (Om(g,ce)).
// Host: the band is a SourceSessionNotices entry (the closed __gb__100087145 branch: bands above the composer, cov2-03);
// keptAwake arrives from desktop-settings.cjs (event desktop-kept-awake) instead of the session view.
import { t } from "../electron/i18n/index.mjs";
import { formatDurationUnits } from "./generated/session-rail-sections/duration-units.mjs";

export const KEEP_AWAKE_BAND_USED_KEY = "epitaxy-keep-awake-band-used";
export const KEPT_AWAKE_MESSAGES = Object.freeze({
  keptAwake: { defaultMessage: "Claude kept your computer awake for {duration}.", id: "o4fhLORTcB" },
  canSleepNow: { defaultMessage: "This lets long tasks finish. Your computer can sleep as usual now.", id: "leA6hDdNhw" },
  onlyPluggedIn: { defaultMessage: "Only when plugged in", id: "RcWyvP8gI5" },
  dontKeepAwake: { defaultMessage: "Don’t keep awake", id: "6/uGp8JWcE" },
});

// react-intl's formatNumber / formatList over Intl, for the generated shared-19 SW.
function intlFor(locale) {
  return {
    formatNumber: (value, options) => new Intl.NumberFormat(locale, options).format(value),
    formatList: (list, { style, type } = {}) => new Intl.ListFormat(locale, { style, type }).format(list),
  };
}
/** ew: the held time as whole minutes (at least one), e.g. "1 hr 12 min". */
export function keptAwakeDuration(heldMs, locale = "en-US") {
  const minutes = Math.max(1, Math.round((Number(heldMs) || 0) / 6e4));
  return formatDurationUnits(intlFor(locale), { hours: Math.floor(minutes / 60), minutes: minutes % 60 },
    { unitDisplay: "short", listType: "unit", listStyle: "narrow" });
}

/** A keptAwake value from the main process ({heldMs, endedAt}), else null. */
export function normalizeKeptAwake(value) {
  return value && Number.isFinite(value.heldMs) && value.heldMs >= 0 && Number.isFinite(value.endedAt) ? { heldMs: value.heldMs, endedAt: value.endedAt } : null;
}

/** tw's W: the endedAt the band is shown for, else null. */
export function keptAwakeShownFor({ keptAwake, local = true, running = false, archived = false, sleepInterruption = false, whileWorking = true, bandUsed = false, dismissedEndedAt = null } = {}) {
  const value = normalizeKeptAwake(keptAwake);
  if (!value || !local || running || archived || sleepInterruption || whileWorking === false || bandUsed === true) return null;
  return value.endedAt !== dismissedEndedAt ? value.endedAt : null;
}

/** rw/nw as a SourceSessionNotices entry; onBatteryOff only while 'Keep awake on battery power' is on. */
export function keptAwakeNotice({ keptAwake, shownFor, onBattery = true, locale = "en-US", onBatteryOff, onTurnOff, onDismiss } = {}) {
  const value = normalizeKeptAwake(keptAwake);
  if (!value || shownFor === null || shownFor === undefined) return null;
  const actions = [];
  if (onBattery !== false && typeof onBatteryOff === "function") actions.push({ label: t(KEPT_AWAKE_MESSAGES.onlyPluggedIn.defaultMessage), run: onBatteryOff });
  if (typeof onTurnOff === "function") actions.push({ label: t(KEPT_AWAKE_MESSAGES.dontKeepAwake.defaultMessage), run: onTurnOff });
  return {
    kind: "keptAwake", level: "info", icon: "CoffeeCup",
    summary: t(KEPT_AWAKE_MESSAGES.keptAwake.defaultMessage, { duration: keptAwakeDuration(value.heldMs, locale) }),
    details: t(KEPT_AWAKE_MESSAGES.canSleepNow.defaultMessage),
    dismissKey: `kept-awake:${shownFor}`, actions, onDismiss,
  };
}

// The windows' copy of each session's keptAwake: set and cleared by desktop-settings.cjs (desktop-kept-awake); a turn
// starting in the session clears it here too (LG: e.keptAwake=void 0), whichever event arrives first.
export function createKeptAwakeStore() {
  const values = new Map(), listeners = new Set();
  const notify = () => { for (const listener of [...listeners]) listener(); };
  return {
    observe(event) {
      if (event?.kind === "desktop-kept-awake" && typeof event.threadId === "string") {
        const value = normalizeKeptAwake(event.keptAwake);
        if (value) values.set(event.threadId, value); else if (!values.delete(event.threadId)) return;
        notify();
      } else if (event?.method === "turn/started" && typeof event.params?.threadId === "string" && values.delete(event.params.threadId)) notify();
    },
    get: (id) => (typeof id === "string" ? values.get(id) ?? null : null),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
export const keptAwakeStore = createKeptAwakeStore();
