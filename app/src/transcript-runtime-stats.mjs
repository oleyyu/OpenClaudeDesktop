import { t } from '../electron/i18n/index.mjs';
import { commandText } from './shell-command-model.mjs';
import { formatDuration } from './command-row-model.mjs';

const count = value => Number.isSafeInteger(value) && value >= 0;
const start = value => Number.isFinite(value) && value >= 0 ? value : null;

// A total is useful only with its reported turn identity. Never sum repeated
// last-response snapshots or infer a baseline from text length.
export function beginTurnStats(previous, turn, observedStart = true) {
  if (previous?.turnId === turn.id) return { ...previous, startedAt: start(turn.startedAt) ?? previous.startedAt };
  const last = previous?.lastUsage;
  const alreadyReported = last?.turnId === turn.id && count(last.total) && last.total === last.last;
  return { turnId: turn.id, startedAt: start(turn.startedAt),
    baseline: alreadyReported ? 0 : observedStart && last && last.turnId !== turn.id && count(last.total) ? last.total : null,
    outputTokens: alreadyReported ? last.total : null, lastUsage: last || null };
}

export function updateTurnUsage(previous, { turnId, tokenUsage }, activeTurnId) {
  if (typeof turnId !== 'string' || !turnId) return previous;
  // Replayed or late usage for another turn must not rewind the live baseline.
  if (activeTurnId && turnId !== activeTurnId) return previous;
  const total = tokenUsage?.total?.outputTokens, last = tokenUsage?.last?.outputTokens;
  const record = previous || {};
  if (!count(total) || !count(last) || last > total) return { ...record, outputTokens: null, lastUsage: null, baseline: null, uncertain: true };
  const lastUsage = { turnId, total, last };
  if (!activeTurnId || record.turnId !== turnId) return { ...record, lastUsage };
  // total===last proves that all reported output belongs to this response.
  let baseline = count(record.baseline) ? record.baseline : !record.uncertain && total === last ? 0 : null;
  const regressed = record.lastUsage?.turnId === turnId && total < record.lastUsage.total;
  if (regressed || (baseline !== null && total < baseline)) baseline = null;
  return { ...record, baseline, lastUsage, uncertain: record.uncertain || regressed || undefined, outputTokens: baseline === null ? null : total - baseline };
}

// shared-14 aT/oT: one decimal, lowercase k, carry rounded 1000 into next unit.
export function formatOutputTokens(tokens) {
  if (!count(tokens)) return null;
  const units = ['', 'k', 'M', 'B'];
  let unit = tokens >= 1e9 ? 3 : tokens >= 1e6 ? 2 : tokens >= 1e3 ? 1 : 0;
  if (!unit) return String(tokens);
  if (unit < 3 && Number((tokens / 1000 ** unit).toFixed(1)) >= 1000) unit++;
  return `${(tokens / 1000 ** unit).toFixed(1)}${units[unit]}`;
}

export function elapsedTurnSeconds(startedAt, nowMs) {
  return start(startedAt) === null || !Number.isFinite(nowMs) ? null : Math.max(0, Math.floor(nowMs / 1000 - startedAt));
}

export function subscribeTurnClock(startedAt, notify, host = globalThis) {
  if (start(startedAt) === null) return () => {};
  let live = true, timer;
  const now = () => host.Date.now();
  const schedule = () => {
    const remainder = ((now() - startedAt * 1000) % 1000 + 1000) % 1000;
    timer = host.setTimeout(() => { if (live) { schedule(); notify(); } }, Math.ceil(1000 - remainder));
  };
  schedule();
  return () => { live = false; host.clearTimeout(timer); };
}

const tools = new Set(['commandExecution', 'fileChange', 'mcpToolCall', 'dynamicToolCall', 'collabAgentToolCall', 'webSearch', 'computerUse']);
export const liveTurnItems = (turnId, items, phases) => items.filter(item => item.turnId === turnId
  && (phases[item.id] === 'streaming' || ['inProgress', 'running'].includes(item.status)) && phases[item.id] !== 'completed');

// approval-shared-current.js:1966-1981 Du: Tu = minimum time "active" is
// shown for a thought, Eu = how long "Thought for Ns" stays afterwards.
export const THINKING_MIN_ACTIVE_MS = 2000;
export const THINKING_DONE_MS = 2000;
// Du's thinkingStart / lastThinkingEnd, read from the turn's reasoning items.
// Thinking is active only while the newest live item is the thought; an
// answer streaming after it means thinking is over. The last end is the
// latest finished thought with both lifecycle times (item/started
// startedAtMs, item/completed completedAtMs); without them there is no done
// state (Codex reasoning that is only superseded, or a replayed turn).
function thinkingWindow(turnId, items, phases) {
  if (!turnId) return null;
  const live = liveTurnItems(turnId, items, phases);
  if (live.at(-1)?.type === 'reasoning') return { streaming: true };
  let last = null;
  for (const item of items) {
    if (item.type !== 'reasoning' || item.turnId !== turnId || live.includes(item)) continue;
    const begun = start(item.startedAtMs);
    if (begun === null || !Number.isFinite(item.completedAtMs) || item.completedAtMs < begun) continue;
    if (!last || item.completedAtMs >= last.completedAtMs) last = item;
  }
  if (!last) return null;
  const duration = last.completedAtMs - last.startedAtMs;
  const activeUntil = last.completedAtMs + Math.max(0, THINKING_MIN_ACTIVE_MS - duration);
  return { activeUntil, doneUntil: activeUntil + THINKING_DONE_MS, seconds: Math.max(1, Math.round(duration / 1000)) };
}
/** Du: {kind:'active'} | {kind:'done', seconds} | null. Without a clock
 * (nowMs not finite, e.g. SSR) only a streaming thought is reported. */
export function thinkingState(turnId, items = [], phases = {}, nowMs) {
  const hold = thinkingWindow(turnId, items, phases);
  if (!hold) return null;
  if (hold.streaming) return { kind: 'active' };
  if (!Number.isFinite(nowMs)) return null;
  return nowMs < hold.activeUntil ? { kind: 'active' }
    : nowMs < hold.doneUntil ? { kind: 'done', seconds: hold.seconds } : null;
}
/** The next time thinkingState changes on its own, or null. */
export function thinkingChangeAt(turnId, items = [], phases = {}, nowMs) {
  const hold = thinkingWindow(turnId, items, phases);
  if (!hold || hold.streaming || !Number.isFinite(nowMs)) return null;
  return nowMs < hold.activeUntil ? hold.activeUntil : nowMs < hold.doneUntil ? hold.doneUntil : null;
}
/** A snapshot reader that returns the same object while the state is unchanged. */
export function createThinkingReader(turnId, items, phases) {
  let last = null;
  return nowMs => {
    const next = thinkingState(turnId, items, phases, nowMs);
    if (next?.kind === last?.kind && next?.seconds === last?.seconds) return last;
    return last = next;
  };
}
// Re-check exactly when the state can change (end of the minimum active
// time, end of the "Thought for Ns" hold); streaming changes arrive as items.
export function subscribeThinkingClock(changeAt, notify, host = globalThis) {
  let live = true, timer = null;
  const schedule = () => {
    const at = changeAt(host.Date.now());
    if (!Number.isFinite(at)) return;
    timer = host.setTimeout(() => { timer = null; if (live) { notify(); schedule(); } }, Math.max(0, at - host.Date.now()));
  };
  schedule();
  return () => { live = false; host.clearTimeout(timer); };
}
// scroll-messages-current.js zhe :58034-58063 (seconds = the turn's elapsed
// time) and Y5 I :58280-58286.
export function thinkingLabel(state, seconds) {
  if (state?.kind === 'done') return t('Thought for {seconds}s', { seconds: state.seconds });
  if (state?.kind !== 'active') return null;
  return t(seconds >= 60 ? 'Almost done thinking…' : seconds >= 45 ? 'Thinking some more…' : seconds >= 30 ? 'Thinking more…' : seconds >= 15 ? 'Still thinking…' : 'Thinking…');
}
/** {kind: 'compacting' | 'tools' | 'thinking', label, thinking?} | null. Local
 * compaction and tool labels keep precedence over the thinking label. */
export function turnActivity(turnId, items = [], phases = {}, seconds, thinking = thinkingState(turnId, items, phases)) {
  if (!turnId) return null;
  // Codex waits on a background terminal (terminalInteraction with empty stdin) and nothing has happened since: the
  // turn's newest item is that command (tui command_lifecycle.rs 'Waiting for background terminal · <command>').
  const newest = [...items].reverse().find(item => item?.turnId === turnId);
  if (newest?.type === 'commandExecution' && newest.terminalWaitingAt) {
    const command = commandText(newest.command).replace(/\s+/g, ' ').trim();
    return { kind: 'tools', label: command ? t('Waiting for {command}', { command: command.length > 48 ? `${command.slice(0, 47)}…` : command }) : t('Waiting for a background terminal') };
  }
  const live = liveTurnItems(turnId, items, phases);
  if (live.some(item => item.type === 'contextCompaction')) return { kind: 'compacting', label: t('Compacting session…') };
  if (live.some(item => tools.has(item.type))) return { kind: 'tools', label: t('Running tools…') };
  const label = thinkingLabel(thinking, seconds);
  return label ? { kind: 'thinking', label, thinking } : null;
}
export function turnActivityLabel(turnId, items = [], phases = {}, seconds, thinking) {
  return turnActivity(turnId, items, phases, seconds, thinking)?.label ?? null;
}

export function runtimeStatLabels(seconds, tokens) {
  if (!Number.isFinite(seconds) || seconds < 2) return [];
  const labels = [formatDuration(seconds)];
  if (count(tokens) && tokens > 0) labels.push(t('{tokens} tokens', { tokens: formatOutputTokens(tokens) }));
  return labels;
}
