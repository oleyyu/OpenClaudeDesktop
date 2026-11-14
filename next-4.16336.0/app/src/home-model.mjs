// Pure home-page model (2.2553.1 draft home): error acknowledgement, the compact token formatter, day keys, relative
// times and a session's pull request. No DOM. (W14-code r4 gen-final-4: the Action Center attention rows, row limits,
// stats aggregation, chart / heatmap and book footnote helpers went with the deleted Action Center (sidebar-new
// R4DC-N1) and home stats card (closeout R4DC-N2). W14-code r5 cleanup: the greeting name / copy / landingClear helpers
// (R5DC-01, with the persona "Home greeting" row) and the stats range math RANGE_DAYS / parseDayKey / rangeCutoff
// (R5DC-05, test-only since R4DC-N2) are gone too.)

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

/** O6 (shared-19): an acknowledgement covers the session's timestamp and its failure, whichever is later. */
export function acknowledgementTime(timestamp, errorAt) {
  const at = number(timestamp);
  return Number.isFinite(errorAt) ? Math.max(at, errorAt) : at;
}

/** D6 (shared-19): the session has a failure the user has not acknowledged yet. */
export function unackedError({ archived = false, errorAt, ackedAt, timestamp } = {}) {
  if (archived || !Number.isFinite(errorAt)) return false;
  if (!Number.isFinite(ackedAt)) return true;
  return !(ackedAt >= Math.max(number(timestamp), errorAt) || ackedAt >= errorAt);
}

export function localDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** shared-14 oT/sT: ≥1e9 B, ≥1e6 M, ≥1e3 k, one decimal, ".0" stripped, rollover at 1000. */
export function compactTokens(value) {
  const n = number(value);
  const strip = (text) => (text.endsWith(".0") ? text.slice(0, -2) : text);
  if (n >= 1e9) return `${strip((n / 1e9).toFixed(1))}B`;
  if (n >= 1e6) {
    const m = Number((n / 1e6).toFixed(1));
    return m >= 1e3 ? `${strip((n / 1e9).toFixed(1))}B` : `${strip(m.toFixed(1))}M`;
  }
  if (n >= 1e3) {
    const k = Number((n / 1e3).toFixed(1));
    return k >= 1e3 ? `${strip((n / 1e6).toFixed(1))}M` : `${strip(k.toFixed(1))}k`;
  }
  return String(n);
}

/** Fw: a YYYY-MM-DD key formatted as "Sep 30" in UTC so the key's day is kept. */
export function formatDayKey(key, locale) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${key}T00:00:00Z`));
}

const RELATIVE_UNITS = [
  ["year", 31536e3], ["month", 2592e3], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60],
];
const narrowStyles = new Map();
const signed = /^[+−\p{Pd}]/u;

/** uO/lO: narrow relative time; locales whose narrow form is sign-prefixed fall back to short. */
export function narrowRelativeTime(dateMs, nowMs, locale = "en") {
  let style = narrowStyles.get(locale);
  if (style === undefined) {
    const probe = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "narrow" });
    style = RELATIVE_UNITS.some(([unit]) => signed.test(probe.format(-5, unit).trim())) ? "short" : "narrow";
    narrowStyles.set(locale, style);
  }
  const seconds = Math.round((number(dateMs) - number(nowMs)) / 1e3);
  const magnitude = Math.abs(seconds);
  if (magnitude < 60) return new Intl.RelativeTimeFormat(locale, { numeric: "auto", style }).format(0, "second");
  let unit = "minute", size = 60;
  for (const [name, span] of RELATIVE_UNITS) if (magnitude >= span) { unit = name; size = span; break; }
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto", style }).format(Math.round(seconds / size), unit);
}

export function sessionTimestampMs(session) {
  const value = session?.updatedAt ?? session?.createdAt;
  if (typeof value === "number") return value < 1e12 ? value * 1000 : value;
  if (typeof value === "string") { const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : 0; }
  return 0;
}

// Local sessions name their PR through the core's binding (codeDesktop.pr) or the band's GitHub CLI lookup (prInfo).


/** The session's PR record ({number, url, state, title, checks}), or null. */
export function sessionPullRequest(session) {
  const info = session?.prInfo && typeof session.prInfo === "object" ? session.prInfo : null;
  const bound = session?.codeDesktop?.pr && typeof session.codeDesktop.pr === "object" ? session.codeDesktop.pr : null;
  const url = [info?.url, session?.prLink, bound?.url].find((value) => typeof value === "string" && /^https:\/\//i.test(value));
  if (!url) return null;
  const number = Number(info?.number ?? bound?.number ?? /\/pull\/(\d+)(?:[/?#]|$)/.exec(url)?.[1]);
  if (!Number.isInteger(number) || number <= 0) return null;
  const state = typeof info?.state === "string" ? info.state : typeof session.prState === "string" ? session.prState : "open";
  const title = typeof info?.title === "string" && info.title ? info.title : typeof bound?.title === "string" && bound.title ? bound.title : null;
  return { number, url, state, title, checks: info?.checks ?? null };
}

