import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { codeStats, foldSession } from "../../harness/packages/codex-app-server/src/usage.js";

// Fidelity F09: the home stats card is the original card over the original stats object
// (getCodeStats, cc43287c9-BMbiZYzF.js:3987-4004 → code-home.js Rw/qw/Yw/Xw/eT/cT). The
// account-usage provenance footer, its tile titles and the token heatmap are gone; the
// DeepSeek bridge's codeDesktop/stats/read supplies every tile.
const app = path.resolve(import.meta.dirname, "..");

const usage = { inputTokens: 260, outputTokens: 11, cacheReadTokens: 8704, totalTokens: 8975 };
let seq = 0;
const at = (day, hour, minute = 0) => new Date(2026, 8, day, hour, minute).getTime();
const event = (type, time, data) => ({ type, seq: seq++, time, data });
const prompt = (time, turn) => event("user/message", time, { turn, step: 0, role: "user", content: "hi", source: { kind: "user" } });
const reply = (time, turn, model) => event("assistant/message", time, { turn, step: 0, message: { role: "assistant", content: "ok", source: { provider: "deepseek-official", model } }, stream: [], usage });
const toolCall = (time, turn) => event("tool/call", time, { turn, step: 0, callId: `c${seq}`, name: "read", arguments: "{}" });
// Two sessions on the DeepSeek bridge: 21st (flash, 2 tool calls) and 22nd (pro then flash).
const stats = codeStats([
  foldSession([prompt(at(21, 9), 1), toolCall(at(21, 9, 1), 1), toolCall(at(21, 9, 2), 1), reply(at(21, 9, 3), 1, "deepseek-v4-flash")]),
  foldSession([prompt(at(22, 14), 1), reply(at(22, 14, 1), 1, "deepseek-v4-pro"), prompt(at(22, 14, 30), 2), reply(at(22, 14, 31), 2, "deepseek-v4-flash")]),
]);

// W14-code r4 closeout R4DC-N2 (E95): 3.6556.2's Home is the presets start card; the 2.x stats card (SourceStatsCard,
// source-home.jsx) was never mounted and is deleted with its tabs / heatmap / tooltip / skeleton CSS. The bridge's
// stats object still feeds the composer's first-run placeholder (main.jsx composerFirstRun({ stats: statsSnapshot })).
test("the bridge's stats object: sessions, messages, peak hour and model totals come from codeDesktop/stats/read", () => {
  assert.equal(stats.peakActivityHour, 14);
  // W14-code r4 gen-final-4: home-model aggregateStats (the deleted card's Iw) is gone; the per-day object itself is pinned.
  assert.deepEqual(stats.dailyActivity.map((day) => [day.date, day.sessionCount, day.messageCount, day.toolCallCount]),
    [["2026-09-21", 1, 2, 2], ["2026-09-22", 1, 4, 0]]);
  assert.deepEqual(stats.dailyModelTokens.map((day) => [day.date, day.tokensByModel]),
    [["2026-09-21", { "deepseek-v4-flash": 271 }], ["2026-09-22", { "deepseek-v4-pro": 271, "deepseek-v4-flash": 271 }]]);
});

test("the unmounted home stats card is gone; source-home.css keeps only the Lw outline card", async () => {
  assert.equal(await fs.access(path.join(app, "src/source-home.jsx")).then(() => true, () => false), false);
  const css = await fs.readFile(path.join(app, "src/source-home.css"), "utf8");
  assert.doesNotMatch(css, /\.sh-(?:tab|tile|heatmap|chart|day-tooltip|skeleton|model|failed|retry)/);
  assert.match(css, /\.sh-card\.is-outline \{ box-shadow: 0 0 0 1px var\(--cds-border\); \}/);
  const main = await fs.readFile(path.join(app, "src/main.jsx"), "utf8");
  assert.doesNotMatch(main, /SourceStatsCard|SourceGreeting|useHomeStartedAt|statsAttempts/);
  assert.match(main, /^import "\.\/source-home\.css";$/m);
});

test("the home has no generic connection card; the DeepSeek key card stays", async () => {
  const main = await fs.readFile(path.join(app, "src/main.jsx"), "utf8");
  assert.doesNotMatch(main, /Connecting to DeepSeek…|"Connect to DeepSeek"|Use the DeepSeek API key from DeepSeek Harness/);
  assert.match(main, /\{boot\?\.connected && boot\.account\?\.deepseek && !boot\.account\.account && \(\n\s+<div className="sh-card is-outline connection-card" data-testid="deepseek-key-card">/);
  // F09 review: the removed card showed `error` while disconnected; the page banner now shows it on Home too.
  assert.doesNotMatch(main, /\{error && \(boot\?\.connected \|\| current\) && \(/);
  // W14-code r2-composer-01: the banner is c3e34355f Hn's literal card (cc43287c9 Nu → gpe), not the host .inline-error.
  // Code only (r2 review): Chat/Cowork keep the host .inline-error banner.
  assert.match(main, /\{error && \(mode === "code"\n\s+\? <div className="composer-error"><SourceComposerError message=\{error\} onDismiss=\{\(\) => setError\(""\)\} \/><\/div>\n\s+: <div role="alert" className="inline-error composer-error">/);
});

// R02 no-key onboarding: the key card on the Lw outline language (code-home.js:13752-13754, Jw :13895-13924)
// with CDS Buttons (W14-code r5 cleanup: the shared-frame CdsButton itself, not the host replica); the composer warns and send() refuses before any thread/start or turn/start.
test("no-key home: Lw outline key card with sm CDS Buttons, composer warning and a send guard", async () => {
  const main = await fs.readFile(path.join(app, "src/main.jsx"), "utf8");
  const card = main.slice(main.indexOf('data-testid="deepseek-key-card"'), main.indexOf("The running core's sign-in (account-label-model"));
  assert.match(card, /<span className="connection-card-title">\{t\("Add your DeepSeek API key"\)\}<\/span>\s*<span className="connection-card-body">\{t\("Choose Add key and paste your key to start\. A key saved in DeepSeek Harness or set as DEEPSEEK_API_KEY also works; refresh after adding one there\."\)\}<\/span>/);
  assert.match(card, /<CdsButton size="sm" onClick=\{\(\) => call\("account-auth", \{ operation: "refresh" \}\)[^\n]*>\{t\("Refresh"\)\}<\/CdsButton>/);
  assert.match(card, /<CdsButton size="sm" onClick=\{\(\) => call\("external", \{ url: DEEPSEEK_KEYS_URL \}\)[^\n]*>\{t\("Get an API key"\)\}<\/CdsButton>/);
  // The primary reopens setup's Connect a model step (the in-app key field) after 'Set up later'.
  assert.match(card, /<CdsButton size="sm" variant="primary" onClick=\{\(\) => setOnboarding\("connect"\)\}>\{t\("Add key"\)\}<\/CdsButton>/);
  assert.doesNotMatch(card, /<button|<strong>|<Icon/);
  assert.doesNotMatch(main, /<strong>Set up DeepSeek<\/strong>/, "the Codex card no longer says Set up DeepSeek above ChatGPT copy");
  assert.match(main, /warning=\{boot !== null && boot\?\.connected === false && !loading \? t\("Connection to \{core\} lost\.", \{ core: coreName\(boot\?\.core\) \}\)\s*: boot\?\.connected && boot\.account\?\.deepseek && !boot\.account\.account \? t\("Add a DeepSeek API key to start a session\."\)\s*: signInRequired \? t\("Sign in to \{name\} to start a session\.", \{ name: signInPrompt\.name \}\) : undefined\}/);
  const send = main.slice(main.indexOf("async function send({ priority, title } = {}) {"));
  assert.match(send, /^async function send\(\{ priority, title \} = \{\}\) \{\n\s+if \(boot\?\.account\?\.deepseek && !boot\.account\.account\) return;/, "the guard is the first line of send()");
  const style = await fs.readFile(path.join(app, "src/style.css"), "utf8");
  const start = style.indexOf(".connection-card {"), actions = style.indexOf(".connection-card-actions {");
  assert.ok(start > 0 && actions > start, "the card rules are one block");
  const block = style.slice(start, style.indexOf("}", actions) + 1);
  assert.doesNotMatch(block, /0\.5px solid|padding: 15px|font-size: 12px|\.connection-card button/, "no legacy card paint");
  assert.match(block, /\.connection-card-title \{\n\s+color: var\(--cds-text-primary\);/);
  assert.match(block, /\.connection-card-body \{\n\s+color: var\(--cds-text-secondary\);/);
});

// W14-code r4 sidebar-new R4DC-N1 (E95): the host Home Action Center (source-action-center.jsx, never mounted) is gone,
// with its rows' repo meta; main.jsx still resolves repo identities whatever the sidebar grouping.
test("main.jsx resolves repo identities for cwd and every session cwd; the Action Center is gone", async () => {
  assert.equal(await fs.access(path.join(app, "src/source-action-center.jsx")).then(() => true, () => false), false);
  const main = await fs.readFile(path.join(app, "src/main.jsx"), "utf8");
  assert.match(main, /const repoFolderKey = \[\.\.\.new Set\(\[cwd, \.\.\.sessions\.map\(\(thread\) => thread\.cwd\)\]/, "identities for cwd and every session cwd, whatever the grouping");
  assert.doesNotMatch(main, /groupBy === "project"\s*\n?\s*\? \[\.\.\.new Set\(\[cwd/);
  assert.match(main, /sessions=\{startCardSessions\} onOpenSession=\{navigate\}/, "presets receives real awaiting sessions, including pinned sessions");
});
