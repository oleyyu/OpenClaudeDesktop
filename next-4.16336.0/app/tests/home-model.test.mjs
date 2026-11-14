import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  compactTokens, formatDayKey, narrowRelativeTime, sessionPullRequest, sessionTimestampMs,
} from "../src/home-model.mjs";

// W14-code r4 gen-final-4: the Action Center attention / row-limit / PR-row helpers and the home stats card's
// aggregation / chart / heatmap / book helpers left with the deleted Action Center (sidebar-new R4DC-N1) and stats card
// (closeout R4DC-N2); their cases are gone with them.
// W14-code r5 cleanup: greetingName / greetingText / landingClear left with the Settings › Persona "Home greeting" row
// (R5DC-01: nothing read persona.greeting; official 3.6556.2 has no Code home greeting under D10), and the stats range
// math rangeCutoff (R5DC-05: test-only since R4DC-N2); their cases are gone with them.

test("B29 session-attention.cjs: failures mark errorAt; a new turn clears it", () => {
  const require = createRequire(import.meta.url);
  const { sessionErrorPatch } = require("../electron/session-attention.cjs");
  const failed = { method: "turn/completed", params: { threadId: "t", turn: { id: "1", status: "failed", error: { message: "boom" } } } };
  assert.deepEqual(sessionErrorPatch({ pinned: true }, failed, 5), { pinned: true, errorAt: 5 });
  assert.equal(sessionErrorPatch({}, { method: "turn/completed", params: { turn: { id: "1", status: "completed" } } }, 5), null);
  assert.equal(sessionErrorPatch({}, { method: "turn/completed", params: { turn: { id: "1", status: "interrupted", error: { message: "x" } } } }, 5), null);
  assert.deepEqual(sessionErrorPatch(undefined, { method: "error", params: { threadId: "t", error: { message: "x" }, willRetry: false } }, 7), { errorAt: 7 });
  assert.equal(sessionErrorPatch({}, { method: "error", params: { threadId: "t", error: { message: "x" }, willRetry: true } }, 7), null, "a retry is not a failure");
  assert.deepEqual(sessionErrorPatch({ errorAt: 5, ackedAt: 3 }, { method: "turn/started", params: { turn: { id: "2" } } }), { ackedAt: 3 });
  assert.equal(sessionErrorPatch({ ackedAt: 3 }, { method: "turn/started", params: {} }), null);
});

test("compact token formatter: k/M/B, '.0' stripped, rollover at 1000", () => {
  assert.equal(compactTokens(0), "0");
  assert.equal(compactTokens(999), "999");
  assert.equal(compactTokens(1000), "1k");
  assert.equal(compactTokens(22000), "22k");
  assert.equal(compactTokens(1234), "1.2k");
  assert.equal(compactTokens(999950), "1M");
  assert.equal(compactTokens(999949), "999.9k");
  assert.equal(compactTokens(999950000), "1B");
  assert.equal(compactTokens(10500000000), "10.5B");
  assert.equal(compactTokens(2000), "2k");
});

test("narrow relative time and day-key formatting", () => {
  const now = Date.UTC(2026, 8, 20, 12);
  assert.equal(narrowRelativeTime(now - 30e3, now, "en"), "now");
  assert.equal(narrowRelativeTime(now - 5 * 60e3, now, "en"), "5m ago");
  assert.equal(narrowRelativeTime(now - 3 * 3600e3, now, "en"), "3h ago");
  assert.equal(narrowRelativeTime(now - 86400e3, now, "en"), "yesterday");
  assert.equal(formatDayKey("2000-09-30", "en"), "Sep 30");
  assert.equal(formatDayKey("2026-09-20", "en"), "Sep 20");
  assert.equal(sessionTimestampMs({ updatedAt: 1758326400 }), 1758326400000);
  assert.equal(sessionTimestampMs({ createdAt: 1758326400000 }), 1758326400000);
  assert.equal(sessionTimestampMs({}), 0);
});

test("a session's pull request: the core binding's URL with its live state", () => {
  const url = "https://github.com/acme/widget/pull/1";
  assert.deepEqual(sessionPullRequest({ id: "e", updatedAt: 400, codeDesktop: { pr: { url } }, prState: "open", prLink: url }),
    { number: 1, url, state: "open", title: null, checks: null });
});
