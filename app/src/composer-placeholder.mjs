// cc43287c9-BMbiZYzF.js:28680-28699 (2.31226.0 cc43287c9-Bchz60VT :33797-33816) placeholder:
// ur || yn !== 'draft' ? 'Type / for commands'
// : (Et ?? (ho ? 'Describe something to build, change, or fix' : 'Describe a task or ask a question')),
// with Yn/ur the attached session and ho = scope store firstRun === true (:32691), which k2 (:33969-33977) sets
// from Zq (:15632-15660). Et is a caller override the app has no source for. Chat mode is not this
// Code-composer branch and keeps the app's own 'How can I help you today?'.
import { t } from "../electron/i18n/index.mjs";
export const SESSION_PLACEHOLDER = t("Type / for commands");
export const DRAFT_PLACEHOLDER = t("Describe a task or ask a question");
export const CHAT_PLACEHOLDER = t("How can I help you today?");
export const FIRST_RUN_PLACEHOLDER = t("Describe something to build, change, or fix");
export function composerPlaceholder({ sessionId = null, mode = "code", firstRun = null } = {}) {
  if (mode !== "code") return CHAT_PLACEHOLDER;
  if (sessionId) return SESSION_PLACEHOLDER;
  return firstRun === true ? FIRST_RUN_PLACEHOLDER : DRAFT_PLACEHOLDER;
}

// 2.42304.0 c227f4d5e uM, while a turn runs (ze = !!V && !ge && Le && !A && !I && re === null: Stop offered, ⌘⏎ not
// claimed, Enter sends, the editor enabled, sending not blocked, no history search): the placeholder names both lanes,
// Be(spoken) "{sendKey} to send, {queueKey} to queue for later" (mZ6xnUz7iS), and a probe that overflows the editor
// swaps in He "{queueKey} to queue" (FIL0bW8Kgx). The key labels are the original cM (generated composer-key-label.mjs,
// over the CDS cap table): glyphs on a Mac, spoken names joined with "+" (aria-description) or elsewhere.
import { shortcutLabel } from "./generated/code-composer/composer-key-label.mjs";
export const RUNNING_PLACEHOLDER = "{sendKey} to send, {queueKey} to queue for later";
export const RUNNING_PLACEHOLDER_COMPACT = "{queueKey} to queue";
export function runningPlaceholder({ mac = true, spoken = false, compact = false } = {}) {
  if (compact) return t(RUNNING_PLACEHOLDER_COMPACT, { queueKey: shortcutLabel("cmd+enter", mac) });
  return t(RUNNING_PLACEHOLDER, { sendKey: shortcutLabel("enter", mac, spoken), queueKey: shortcutLabel("cmd+enter", mac, spoken) });
}
/** uM ze: whether the running-turn placeholder replaces the composer's own. */
export function runningPlaceholderShown({ showStop = false, cmdEnterClaimed = false, plainEnterSends = true, disabled = false, submitBlocked = false, historySearch = null } = {}) {
  return !!showStop && !cmdEnterClaimed && !!plainEnterSends && !disabled && !submitBlocked && historySearch === null;
}

/** getCodeStats totalSessions (the local stats object carries only the daily sessionCount, summed here). */
function statsSessionTotal(stats) {
  if (Number.isFinite(stats?.totalSessions)) return stats.totalSessions;
  return (Array.isArray(stats?.dailyActivity) ? stats.dailyActivity : []).reduce((sum, day) => sum + (Number.isFinite(day?.sessionCount) ? day.sessionCount : 0), 0);
}

/**
 * Zq: true only once the session list loaded with no session in it (r === 0, here counting the other core's hidden
 * sessions too) and the stats read with totalSessions 0; null while either is pending (r === null, a === null);
 * false otherwise, including stats that could not be read (a === undefined; locally the 'stats' null). The cloud
 * code-session check (l / qs hasAnyCodeSession) has no local counterpart.
 * @param {{sessionsLoaded?: boolean, sessionCount?: number, stats?: object | null}} input - stats: undefined while
 *   pending, null when main.cjs 'stats' failed, else the getCodeStats object
 */
export function composerFirstRun({ sessionsLoaded = false, sessionCount = 0, stats } = {}) {
  if (!sessionsLoaded) return null;
  if (sessionCount > 0 || stats === null) return false;
  if (stats === undefined) return null;
  return statsSessionTotal(stats) > 0 ? false : true;
}
