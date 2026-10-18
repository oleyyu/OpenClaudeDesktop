import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { codeStats, foldSession } from "../../harness/packages/codex-app-server/src/usage.js";
import { aggregateStats } from "../src/home-model.mjs";

// Fidelity F09: the home stats card is the original card over the original stats object
// (getCodeStats, cc43287c9-BMbiZYzF.js:3987-4004 → code-home.js Rw/qw/Yw/Xw/eT/cT). The
// account-usage provenance footer, its tile titles and the token heatmap are gone; the
// DeepSeek bridge's codeDesktop/stats/read supplies every tile.
const app = path.resolve(import.meta.dirname, "..");
let server, H;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", logLevel: "error" });
  H = await server.ssrLoadModule("/src/source-home.jsx");
});
after(() => server?.close());

const today = "2026-09-22";
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
const models = [{ model: "deepseek-v4-flash", displayName: "DeepSeek V4 Flash" }, { model: "deepseek-v4-pro", displayName: "DeepSeek V4 Pro" }];
const render = (props) => renderToStaticMarkup(React.createElement(H.SourceStatsCard, { models, todayKey: today, bookSeed: 0, ...props }));
const tiles = (html) => Object.fromEntries([...html.matchAll(/<span class="sh-tile-label">([^<]*)<\/span><span class="sh-tile-value[^"]*">([^<]*)<\/span>/g)].map((match) => [match[1], match[2]]));

test("the bridge's stats fill every tile: sessions, messages and favorite model come from codeDesktop/stats/read", () => {
  assert.equal(stats.peakActivityHour, 14);
  const html = render({ stats });
  assert.deepEqual(tiles(html), {
    Sessions: "2", Messages: "6", "Total tokens": "813", "Active days": "2",
    "Peak hour": new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date(2000, 0, 1, 14)),
    "Favorite model": "DeepSeek V4 Flash",
  });
  const week = aggregateStats(stats, "7d", today);
  assert.equal(week.totalToolCalls, 2);
  assert.deepEqual(week.modelTotals.map((entry) => [entry.model, entry.tokens]), [["deepseek-v4-flash", 542], ["deepseek-v4-pro", 271]]);
});

test("no provenance footer, no native titles, a messages-only heatmap", () => {
  const html = render({ stats });
  assert.doesNotMatch(html, /sh-account-source|Refresh usage|account usage|recorded in this app|No reported usage/i);
  assert.doesNotMatch(html, / title="/, "no [title] inside the card");
  assert.match(html, /role="img" aria-label="Daily activity heatmap"/);
  assert.match(html, /data-date="2026-09-22" data-count="4"/, "the heatmap counts messages");
  assert.match(html, /data-date="2026-09-21" data-count="2"/);
  // The card is the tabs row plus the overview (tiles, heatmap, footnote) only.
  const card = html.slice(html.indexOf('data-testid="epitaxy-stats-card"'));
  assert.equal((card.match(/<div class="sh-tabs-row"/g) || []).length, 1);
  assert.doesNotMatch(card, /<button[^>]*class="sh-model-more"/);
});

test("the hold skeleton is a delayed, waving SkeletonGroup with a status role and an empty Loading label", () => {
  for (const value of [undefined, null]) {
    const html = render({ stats: value, startedAt: 0 });
    assert.match(html, /^<div data-cds="SkeletonGroup" data-motion="wave" data-hold="delayed" role="status"><span class="sr-only" data-skeleton-label=""><\/span><div aria-hidden="true" class="contents"><div class="code-stats source-stats-card sh-card is-fill" data-testid="epitaxy-stats-hold">/);
    const indices = [...html.matchAll(/data-cds="Skeleton" class="sh-skeleton [^"]*" style="--cds-skel-i:(\d+)"/g)].map((match) => Number(match[1]));
    assert.deepEqual(indices, [0, 1, 2, 3, 4, 5, 6, 7], "eight skeletons, staggered in DOM order");
    assert.doesNotMatch(html, /epitaxy-stats-card|sh-tile-value/, "never ledger zeros");
  }
});

test("the day tooltip row is a 6px dot and '{model}: {tokens}'; live tabs paint the ghost pill on hover", async () => {
  const source = await fs.readFile(path.join(app, "src/source-home.jsx"), "utf8");
  assert.match(source, /<span className="sh-day-tooltip-dot" aria-hidden="true" style=\{\{ backgroundColor: segment\.color \}\} \/>\n\s+\{`\$\{modelDisplayName\(models, segment\.model\)\}: \$\{compactTokens\(segment\.tokens\)\}`\}/);
  const css = await fs.readFile(path.join(app, "src/source-home.css"), "utf8");
  assert.match(css, /\.sh-day-tooltip-dot \{ display: inline-block; width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; \}/);
  assert.match(css, /\.sh-day-tooltip-row \{ display: flex; align-items: center; gap: 4px; font-variant-numeric: tabular-nums; \}/);
  assert.doesNotMatch(css, /sh-day-tooltip-name|sh-account-source/);
  assert.match(css, /\[role="tablist"\] > \.sh-tab::before \{\n\s+content: "";\n\s+position: absolute;\n\s+inset: 0 1px;\n\s+border-radius: 4px;\n\s+background: transparent;\n\s+z-index: -1;\n\}/);
  assert.match(css, /\[role="tablist"\] > \.sh-tab:not\(\.is-selected\):not\(:disabled\):hover::before \{ background: var\(--cds-fill-ghost-hover\); \}/);
  assert.match(css, /\[role="tablist"\] > \.sh-tab:not\(\.is-selected\):not\(:disabled\):hover \{ color: var\(--cds-text-secondary\); \}/);
  // F09 review (rn focus-visible:before:shadow-focus, before:transition-shadow before:duration-fast): the ring is the pill's.
  assert.match(css, /\.sh-tab:focus-visible \{ outline: none; \}/);
  assert.match(css, /\[role="tablist"\] > \.sh-tab::before \{ transition: box-shadow var\(--cds-dur-fast\) /);
  assert.match(css, /\[role="tablist"\] > \.sh-tab:focus-visible::before \{ box-shadow: var\(--cds-focus-shadow\); \}/);
  assert.doesNotMatch(css, /\.sh-tab:focus-visible \{[^}]*box-shadow/);
});

test("the home has no generic connection card; the DeepSeek key card stays", async () => {
  const main = await fs.readFile(path.join(app, "src/main.jsx"), "utf8");
  assert.doesNotMatch(main, /Connecting to DeepSeek…|"Connect to DeepSeek"|Use the DeepSeek API key from DeepSeek Harness/);
  assert.match(main, /\{boot\?\.connected && boot\.account\?\.deepseek && !boot\.account\.account && \(\n\s+<div className="sh-card is-outline connection-card" data-testid="deepseek-key-card">/);
  // F09 review: the removed card showed `error` while disconnected; the page banner now shows it on Home too.
  assert.doesNotMatch(main, /\{error && \(boot\?\.connected \|\| current\) && \(/);
  assert.match(main, /\{error && \(\n\s+<div role="alert" className="inline-error composer-error">/);
});

// R02: Kw pre-live tabs (code-home.js:13844-13847) are disabled buttons whose unselected labels are
// text-muted; the original :disabled only sets cursor default (design-system.css:814-820), so the local
// rule must restate the colour over style.css `button:disabled` (text-disabled), before the selected rule.
test("pre-live disabled tabs keep text-muted; the selected rule still wins after it", async () => {
  const css = await fs.readFile(path.join(app, "src/source-home.css"), "utf8");
  assert.match(css, /\.sh-tab:disabled \{ cursor: default; color: var\(--cds-text-muted\); \}/);
  const disabled = css.indexOf(".sh-tab:disabled {"), selected = css.indexOf(".sh-tab.is-selected { color: var(--cds-text-primary); }");
  assert.ok(disabled > 0 && selected > disabled, "equal specificity: .sh-tab.is-selected comes later");
});

// R02 no-key onboarding: the key card on the Lw outline language (code-home.js:13752-13754, Jw :13895-13924)
// with CDS Buttons; the composer warns and send() refuses before any thread/start or turn/start.
test("no-key home: Lw outline key card with sm CDS Buttons, composer warning and a send guard", async () => {
  const main = await fs.readFile(path.join(app, "src/main.jsx"), "utf8");
  const card = main.slice(main.indexOf('data-testid="deepseek-key-card"'), main.indexOf("The running core's sign-in (account-label-model"));
  assert.match(card, /<span className="connection-card-title">\{t\("Add your DeepSeek API key"\)\}<\/span>\s*<span className="connection-card-body">\{t\("Choose Add key and paste your key to start\. A key saved in DeepSeek Harness or set as DEEPSEEK_API_KEY also works; refresh after adding one there\."\)\}<\/span>/);
  assert.match(card, /<SourceSettingsButton size="sm" onClick=\{\(\) => call\("account-auth", \{ operation: "refresh" \}\)[^\n]*>\{t\("Refresh"\)\}<\/SourceSettingsButton>/);
  assert.match(card, /<SourceSettingsButton size="sm" onClick=\{\(\) => call\("external", \{ url: DEEPSEEK_KEYS_URL \}\)[^\n]*>\{t\("Get an API key"\)\}<\/SourceSettingsButton>/);
  // The primary reopens setup's Connect a model step (the in-app key field) after 'Set up later'.
  assert.match(card, /<SourceSettingsButton size="sm" variant="primary" onClick=\{\(\) => setOnboarding\("connect"\)\}>\{t\("Add key"\)\}<\/SourceSettingsButton>/);
  assert.doesNotMatch(card, /<button|<strong>|<Icon/);
  assert.doesNotMatch(main, /<strong>Set up DeepSeek<\/strong>/, "the Codex card no longer says Set up DeepSeek above ChatGPT copy");
  assert.match(main, /warning=\{boot !== null && boot\?\.connected === false && !loading \? t\("Connection to \{core\} lost\.", \{ core: coreName\(boot\?\.core\) \}\)\s*: boot\?\.connected && boot\.account\?\.deepseek && !boot\.account\.account \? t\("Add a DeepSeek API key to start a session\."\)\s*: signInRequired \? t\("Sign in to \{name\} to start a session\.", \{ name: signInPrompt\.name \}\) : undefined\}/);
  const send = main.slice(main.indexOf("async function send({ priority } = {}) {"));
  assert.match(send, /^async function send\(\{ priority \} = \{\}\) \{\n\s+if \(boot\?\.account\?\.deepseek && !boot\.account\.account\) return;/, "the guard is the first line of send()");
  const style = await fs.readFile(path.join(app, "src/style.css"), "utf8");
  const start = style.indexOf(".connection-card {"), actions = style.indexOf(".connection-card-actions {");
  assert.ok(start > 0 && actions > start, "the card rules are one block");
  const block = style.slice(start, style.indexOf("}", actions) + 1);
  assert.doesNotMatch(block, /0\.5px solid|padding: 15px|font-size: 12px|\.connection-card button/, "no legacy card paint");
  assert.match(block, /\.connection-card-title \{\n\s+color: var\(--cds-text-primary\);/);
  assert.match(block, /\.connection-card-body \{\n\s+color: var\(--cds-text-secondary\);/);
});

// R02 Action Center meta (cc43287c9 tA :5416-5417, :5473): `owner/name`, the bare repo name, or nothing;
// never the folder basename. main.jsx resolves repo identities whatever the sidebar grouping.
test("Action Center rows show the repo slug from repo-identities, and no meta outside a repo", async () => {
  const A = await server.ssrLoadModule("/src/source-action-center.jsx");
  assert.equal(A.repoMeta({ isRepo: true, owner: "acme", name: "widgets" }), "acme/widgets");
  assert.equal(A.repoMeta({ isRepo: true, owner: null, name: "local-repo" }), "local-repo");
  for (const identity of [{ isRepo: false, owner: null, name: null }, null, undefined]) assert.equal(A.repoMeta(identity), undefined);
  const session = (id, cwd) => ({ id, cwd, name: `Session ${id}` });
  const rows = [{ session: session("a", "/work/widgets"), kind: "unread", timestamp: 0 }, { session: session("b", "/work/scratch"), kind: "unread", timestamp: 0 },
    { session: session("c", "/work/pending"), kind: "unread", timestamp: 0 }];
  const html = renderToStaticMarkup(React.createElement(A.SourceActionCenter, { rows, limit: 5, now: 1000, onOpen() {},
    repoIdentities: { "/work/widgets": { isRepo: true, owner: "acme", name: "widgets" }, "/work/scratch": { isRepo: false, owner: null, name: null } } }));
  const metas = [...html.matchAll(/data-session-id="(\w)"[\s\S]*?(?=data-session-id=|$)/g)].map((match) => [match[1], /<span class="hac-meta">([^<]*)<\/span>/.exec(match[0])?.[1] ?? null]);
  assert.deepEqual(metas, [["a", "acme/widgets"], ["b", null], ["c", null]]);
  assert.doesNotMatch(html, />scratch<|>pending<|>widgets</, "never the folder basename");
  const main = await fs.readFile(path.join(app, "src/main.jsx"), "utf8");
  assert.match(main, /const repoFolderKey = \[\.\.\.new Set\(\[cwd, \.\.\.sessions\.map\(\(thread\) => thread\.cwd\)\]/, "identities for cwd and every session cwd, whatever the grouping");
  assert.doesNotMatch(main, /groupBy === "project"\s*\n?\s*\? \[\.\.\.new Set\(\[cwd/);
  assert.match(main, /sessions=\{startCardSessions\} onOpenSession=\{navigate\}/, "presets receives real awaiting sessions, including pinned sessions");
});
