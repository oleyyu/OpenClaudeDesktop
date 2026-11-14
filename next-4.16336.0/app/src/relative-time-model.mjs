// Relative timestamp model for transcript message rows (independent adapter).
// Source: scroll-shared-10-current.js:14418-14565 (2.2553.1) — eO one shared
// 60000ms interval, nO snapshot refreshed when >=30s stale, aO unit table,
// uO relative text, fO absolute tooltip text, pO <time data-cds=RelativeTime>.
// Wrapped by AO (wi.Timestamp, 14983) and OY (scroll-messages-current.js:33857)
// with absoluteAfterHours Infinity: transcript rows are always relative.
export const CLOCK_INTERVAL_MS = 6e4;
export const CLOCK_STALE_MS = 3e4;
// The app UI is English-only; the source takes the intl locale from its app
// provider ($()). Callers may still pass another BCP 47 tag.
export const DEFAULT_LOCALE = "en-US";

const UNITS = [
  ["year", 31536e3], ["month", 2592e3], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60],
];
const formatters = new Map();
function relativeFormat(locale) {
  let format = formatters.get(locale);
  if (!format) { format = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "long" }); formatters.set(locale, format); }
  return format;
}
const valid = value => typeof value === "number" && Number.isFinite(value);

/** uO with style "long", numeric "auto", no justNowLabel. Null for an invalid date. */
export function formatRelative(dateMs, nowMs, locale = DEFAULT_LOCALE) {
  if (!valid(dateMs) || !valid(nowMs)) return null;
  const seconds = Math.round((dateMs - nowMs) / 1e3), magnitude = Math.abs(seconds);
  const format = relativeFormat(locale);
  if (magnitude < 60)
    return format.resolvedOptions().locale.toLowerCase().startsWith("en") ? "just now" : format.format(0, "second");
  let unit = "minute", size = 60;
  for (const [name, span] of UNITS) if (magnitude >= span) { unit = name; size = span; break; }
  return format.format(Math.round(seconds / size), unit);
}

/** fO with tooltipTimeZone false (AO default): no timeZoneName. Null when invalid. */
export function formatAbsolute(dateMs, locale = DEFAULT_LOCALE) {
  if (!valid(dateMs) || Number.isNaN(new Date(dateMs).getTime())) return null;
  return new Date(dateMs).toLocaleString(locale, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** pO render values. snapshot null (server snapshot rO) uses the date itself. */
export function timestampView(dateMs, snapshot, locale = DEFAULT_LOCALE) {
  const date = valid(dateMs) ? new Date(dateMs) : null;
  if (!date || Number.isNaN(date.getTime())) return { iso: undefined, text: "—", title: null };
  return { iso: date.toISOString(), text: formatRelative(dateMs, snapshot ?? dateMs, locale), title: formatAbsolute(dateMs, locale) };
}

/** Codex Turn.startedAt/completedAt are Unix seconds or null (ts/v2/Turn.ts). */
export function turnSecondsToMs(seconds) {
  return valid(seconds) && seconds > 0 ? seconds * 1e3 : null;
}

/** tO/nO/iO as an injectable store for useSyncExternalStore. */
export function createRelativeClock({ now = () => Date.now(), setInterval: start = globalThis.setInterval,
  clearInterval: stop = globalThis.clearInterval, intervalMs = CLOCK_INTERVAL_MS, staleMs = CLOCK_STALE_MS } = {}) {
  const listeners = new Set();
  let snapshot = 0, timer;
  const refresh = () => { snapshot = now(); };
  return {
    getSnapshot() {
      if (snapshot === 0 || Math.abs(now() - snapshot) >= staleMs) refresh();
      return snapshot;
    },
    getServerSnapshot: () => null,
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) timer = start(() => { refresh(); for (const notify of listeners) notify(); }, intervalMs);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer !== undefined) { stop(timer); timer = undefined; }
      };
    },
    get listenerCount() { return listeners.size; },
    get running() { return timer !== undefined; },
  };
}

// One clock for every mounted timestamp, as the source module-level ZD/QD.
export const relativeClock = createRelativeClock();
