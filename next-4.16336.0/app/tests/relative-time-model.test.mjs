import test from "node:test";
import assert from "node:assert/strict";
import { CLOCK_INTERVAL_MS, CLOCK_STALE_MS, createRelativeClock, formatAbsolute, formatRelative, timestampView, turnSecondsToMs } from "../src/relative-time-model.mjs";
import { emptyState, reduce } from "../src/state.js";

const NOW = new Date(2026, 8, 23, 15, 4).getTime();
const ago = seconds => NOW - seconds * 1e3;

test("formatRelative follows uO: long style, numeric auto, en 'just now', largest unit", () => {
  assert.equal(formatRelative(ago(10), NOW), "just now");
  assert.equal(formatRelative(ago(59), NOW), "just now");
  assert.equal(formatRelative(ago(-10), NOW), "just now");
  assert.equal(formatRelative(ago(60), NOW), "1 minute ago");
  assert.equal(formatRelative(ago(125), NOW), "2 minutes ago");
  assert.equal(formatRelative(ago(3 * 3600), NOW), "3 hours ago");
  assert.equal(formatRelative(ago(86400), NOW), "yesterday");
  assert.equal(formatRelative(ago(3 * 86400), NOW), "3 days ago");
  assert.equal(formatRelative(ago(8 * 86400), NOW), "last week");
  assert.equal(formatRelative(ago(40 * 86400), NOW), "last month");
  assert.equal(formatRelative(ago(400 * 86400), NOW), "last year");
  assert.equal(formatRelative(ago(-125), NOW), "in 2 minutes");
  // Non-English: Intl format(0, "second") instead of the English literal.
  assert.equal(formatRelative(ago(10), NOW, "fr"), new Intl.RelativeTimeFormat("fr", { numeric: "auto", style: "long" }).format(0, "second"));
  for (const bad of [null, undefined, NaN, Infinity, "1"]) assert.equal(formatRelative(bad, NOW), null);
});

test("formatAbsolute is fO without timeZoneName (AO tooltipTimeZone false)", () => {
  assert.equal(formatAbsolute(NOW), "Sep 23, 2026, 3:04 PM");
  assert.doesNotMatch(formatAbsolute(NOW), /GMT|UTC|[A-Z]{3,4}T/);
  assert.equal(formatAbsolute(NaN), null);
  assert.equal(formatAbsolute(null), null);
});

test("timestampView renders pO values; invalid dates show an em dash and no tooltip", () => {
  assert.deepEqual(timestampView(ago(125), NOW), { iso: new Date(ago(125)).toISOString(), text: "2 minutes ago", title: formatAbsolute(ago(125)) });
  // Server snapshot null: the date is its own reference.
  assert.equal(timestampView(ago(3600), null).text, "just now");
  assert.deepEqual(timestampView(null, NOW), { iso: undefined, text: "—", title: null });
  assert.equal(turnSecondsToMs(1790000000), 1790000000000);
  for (const bad of [null, undefined, 0, -1, NaN, "5"]) assert.equal(turnSecondsToMs(bad), null);
});

test("clock: one 60s interval while subscribed, 30s staleness refresh on read", () => {
  let now = NOW, nextId = 0;
  const timers = new Map();
  const clock = createRelativeClock({ now: () => now,
    setInterval: (fn, ms) => { const id = ++nextId; timers.set(id, { fn, ms }); return id; },
    clearInterval: id => timers.delete(id) });
  assert.equal(CLOCK_INTERVAL_MS, 60000); assert.equal(CLOCK_STALE_MS, 30000);
  assert.equal(clock.running, false);
  assert.equal(clock.getSnapshot(), NOW);
  now += 29999; assert.equal(clock.getSnapshot(), NOW, "fresher than 30s: stable snapshot");
  now += 1; assert.equal(clock.getSnapshot(), NOW + 30000, "30s stale: refreshed on read");
  const calls = [];
  const offA = clock.subscribe(() => calls.push("a")), offB = clock.subscribe(() => calls.push("b"));
  assert.equal(timers.size, 1, "a single shared interval");
  assert.equal([...timers.values()][0].ms, 60000);
  now += 60000; [...timers.values()][0].fn();
  assert.deepEqual(calls, ["a", "b"]);
  assert.equal(clock.getSnapshot(), now, "tick refreshes the snapshot");
  offA(); assert.equal(timers.size, 1);
  offB(); assert.equal(timers.size, 0, "last unsubscribe clears the interval");
  assert.equal(clock.running, false);
  clock.subscribe(() => {}); assert.equal(timers.size, 1, "restarts on the next subscriber");
  assert.equal(clock.getServerSnapshot(), null);
});

test("reducer keeps Turn.startedAt/completedAt per turn; taskTurnFacts unchanged", () => {
  const started = (id, extra = {}) => ({ event: { method: "turn/started", params: { threadId: "th", turn: { id, status: "inProgress", items: [], startedAt: 100, completedAt: null, ...extra } } } });
  const completed = (id, extra = {}) => ({ event: { method: "turn/completed", params: { threadId: "th", turn: { id, status: "completed", items: [], startedAt: 100, completedAt: 160, ...extra } } } });
  let state = reduce(emptyState, started("t1"));
  assert.deepEqual(state.turnTimes.th, { t1: { startedAt: 100, completedAt: null } });
  state = reduce(state, completed("t1"));
  state = reduce(state, started("t2", { startedAt: 200 }));
  assert.deepEqual(state.turnTimes.th, { t1: { startedAt: 100, completedAt: 160 }, t2: { startedAt: 200, completedAt: null } });
  // A completion without startedAt keeps the observed start.
  state = reduce(state, completed("t2", { startedAt: null, completedAt: 230 }));
  assert.deepEqual(state.turnTimes.th.t2, { startedAt: 200, completedAt: 230 });
  assert.deepEqual(state.taskTurnFacts.th, { id: "t2", startedAt: null, completedAt: 230, durationMs: undefined }, "latest-turn facts keep their own semantics");
  // Null / malformed times stay null; nothing is invented.
  const bare = reduce(emptyState, completed("x", { startedAt: null, completedAt: "soon" }));
  assert.deepEqual(bare.turnTimes.th.x, { startedAt: null, completedAt: null });
  const same = reduce(state, completed("t2", { startedAt: 200, completedAt: 230 }));
  assert.equal(same.turnTimes, state.turnTimes, "unchanged times keep identity");
});

test("hydrate fills turn times from history and keeps live turns absent from the page", () => {
  let state = reduce(emptyState, { event: { method: "turn/started", params: { threadId: "th", turn: { id: "live", status: "inProgress", items: [], startedAt: 900, completedAt: null } } } });
  state = reduce(state, { type: "hydrate", id: "th", thread: { id: "th", turns: [
    { id: "old", status: "completed", items: [{ id: "u-old", type: "userMessage", content: [] }], startedAt: 500, completedAt: 560 },
    { id: "nulls", status: "completed", items: [], startedAt: null, completedAt: null },
  ] } });
  assert.deepEqual(state.turnTimes.th, { live: { startedAt: 900, completedAt: null }, old: { startedAt: 500, completedAt: 560 }, nulls: { startedAt: null, completedAt: null } });
});
