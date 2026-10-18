import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import http from "node:http";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";

// Git band Commit action, base/ahead/behind IPC, 10s responding poll and focus
// refresh in the real app against an isolated protocol fixture and a temp
// repository with a bare origin; then the fixture-only band rows (behind
// indicator, reserved dismiss slot, uncounted tree, responding Commit) in an
// isolated component fixture served by Vite. One Electron instance at a time;
// the app part runs only after a fresh production build.
// R4f-rail SR-8 retired the 2.3x stacked rail half (SourceGitRail, never mounted):
// the session rail is the 2.42304.0 flat rail src/source-session-rail.jsx mounts,
// with the generated c96d752d0 OLe Changes row, covered by the SSR / fake-DOM
// tests (session-rail-*.test.mjs, source-git-band.test.mjs). The suite keeps its
// registered name (git-rail) and report path.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `git-rail-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const origin = path.join(profile, "origin.git"), cwd = path.join(profile, "rail-workspace");
await fs.mkdir(origin); await fs.mkdir(cwd);
const gitEnv = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
const git = (dir, ...args) => execFileSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", ...args], { cwd: dir, env: gitEnv, encoding: "utf8" });
git(origin, "init", "-q", "--bare", "-b", "main");
git(cwd, "init", "-q", "-b", "main"); git(cwd, "remote", "add", "origin", origin);
await fs.writeFile(path.join(cwd, "change.txt"), "original\n"); git(cwd, "add", "."); git(cwd, "commit", "-qm", "Fixture base");
git(cwd, "push", "-q", "-u", "origin", "main"); git(cwd, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main");
git(cwd, "checkout", "-q", "-b", "feature");
await fs.writeFile(path.join(cwd, "f1.txt"), "one\n"); git(cwd, "add", "."); git(cwd, "commit", "-qm", "feature one");
await fs.writeFile(path.join(cwd, "f2.txt"), "two\n"); git(cwd, "add", "."); git(cwd, "commit", "-qm", "feature two");
git(cwd, "checkout", "-q", "main");
await fs.writeFile(path.join(cwd, "m1.txt"), "main moved\n"); git(cwd, "add", "."); git(cwd, "commit", "-qm", "main one"); git(cwd, "push", "-q", "origin", "main");
git(cwd, "checkout", "-q", "feature");
await fs.writeFile(path.join(cwd, "change.txt"), "replacement\nsecond\n"); // dirty worktree: +2 −1
// Every git the app spawns goes through this wrapper so polling is observed
// out of process; it only appends argv and execs the real binary.
const realGit = execFileSync("/usr/bin/which", ["git"], { encoding: "utf8", env: process.env }).trim();
const shim = path.join(profile, "bin"); await fs.mkdir(shim);
const gitLog = path.join(profile, "git-calls.log");
await fs.writeFile(path.join(shim, "git"), `#!/bin/sh\nprintf '%s\\n' "$*" >> "${gitLog}"\nexec "${realGit}" "$@"\n`, { mode: 0o755 });
const SESSION = "git-rail-thread", now = Math.floor(Date.now() / 1000);
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({ cwd, theme: "light", mode: "code", model: "fixture", effort: "low", threadIds: [SESSION], displayName: "Fixture" }));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: { [SESSION]: { id: SESSION, cwd, name: "Git rail verification", createdAt: now, updatedAt: now, turns: [], archived: false } } }));
const env = { ...process.env, PATH: `${shim}:${process.env.PATH}`, CODE_DESKTOP_DATA: profile, CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const COMMIT_TEXT = "Commit the working tree changes with a sensible message.";
// git-rail-model COMMIT_RESPONDING_REASON names the assistant (i18n assistant-name rewrite): the fixture profile picks no
// core, so the app's default DeepSeek core names it.
const RESPONDING_REASON = "DeepSeek is working \u2014 wait for the turn to finish";
const checks = [], metrics = {}, rendererErrors = [];
let app, page, build, failure, runtime, vite, viteLog = "", profileRemoved = false;
const testSources = ["scripts/git-rail-ui-test.mjs", "tests/fixtures/codex-server.cjs", "tests/fixtures/git-rail-ui.jsx", "tests/fixtures/git-rail-fixture.html", "tests/fixtures/composer-window.cjs"];
let testSourceHashes;
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function verifySource() {
  assert.ok(build && Array.isArray(build.sources) && build.sources.length, "Build must contain a source manifest");
  assert.equal(sha(JSON.stringify(build.sources)), build.sourceSha256, "Build source digest must be internally consistent");
  const current = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  assert.equal(current.sourceSha256, build.sourceSha256, "Build changed during this test");
  assert.equal(JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version, build.version, "Package version must match build");
  for (const entry of build.sources) assert.equal(sha(await fs.readFile(path.join(root, entry.path))), entry.sha256, `Build is stale: ${entry.path}`);
  for (const required of ["src/source-git-status.jsx", "src/source-git-status.css", "src/git-rail-model.mjs", "electron/git-status.cjs", "electron/main.cjs", "src/main.jsx"])
    assert.ok(build.sources.some(entry => entry.path === required), `Build does not identify ${required}`);
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test or fixture changed during this run");
  else testSourceHashes = hashes;
}
const near = (actual, expected, label, tolerance = .5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
const statusCalls = async () => { try { return (await fs.readFile(gitLog, "utf8")).split("\n").filter(line => line.includes("status --porcelain=v1")).length; } catch { return 0; } };
// Full worktree patch reads (workspace-git-diff): `diff … --find-renames` without --numstat (status uses --numstat).
const diffCalls = async () => { try { return (await fs.readFile(gitLog, "utf8")).split("\n").filter(line => /(^|\s)diff\s/.test(line) && line.includes("--find-renames") && !line.includes("--numstat")).length; } catch { return 0; } };
// R4i-gui GU1 (R4i-rail RL2): rail mode hides the band (main.jsx railHidesBand, cc43287c9 Mte `mr`); the Commit verb is the
// rail Changes row's (aside "Session details" › nav[aria-label="Repository and pull request controls"] › changes-row.mjs
// OLe `data-rail-changes-row`): changes-verb.mjs DLe, a CdsButton "Commit changes" inside view-tabs CdsDisabledReason
// (Uc: [data-cds-disabled-reason-wrapper] with aria-describedby → the hidden [data-cds-disabled-reason] span).
const RAIL_ROW = 'aside[aria-label="Session details"] nav[aria-label="Repository and pull request controls"] [data-rail-changes-row]';
const railProbe = () => page.evaluate((selector) => { const el = document.querySelector(selector), action = [...(el?.querySelectorAll("button") ?? [])].find(button => button.textContent === "Commit changes");
  return { sameNode: el === window.__railRow && document.contains(el), bands: document.querySelectorAll("nav.sg-status").length, disabled: action?.disabled ?? null, title: action?.getAttribute("title") ?? null,
    reason: (() => { const wrap = action?.closest("[data-cds-disabled-reason-wrapper]"), id = wrap?.getAttribute("aria-describedby"); return id ? document.getElementById(id)?.textContent ?? null : null; })(), busy: action?.getAttribute("aria-busy") ?? null }; }, RAIL_ROW);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function fixtureTurns() { return Object.values(JSON.parse(await fs.readFile(path.join(profile, "fixture-threads.json"), "utf8")).threads)[0].turns; }
try {
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  await verifySource();
  app = await electron.launch({ executablePath, args: [root], env });
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => rendererErrors.push(error.message));
  runtime = await app.evaluate(({ app: electronApp }) => ({ electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node, packaged: electronApp.isPackaged }));
  await page.locator(`[data-source-session-id="${SESSION}"] .source-session-open`).click();
  const railToggle = page.locator(".st-toolbar").getByRole("button", { name: "Show session rail", exact: true });
  if (await railToggle.count()) await railToggle.click();
  const row = page.locator(RAIL_ROW); await row.waitFor();
  const commit = row.getByRole("button", { name: "Commit changes", exact: true });
  await page.locator(".loading-state").waitFor({ state: "detached" });
  await page.evaluate(() => document.fonts.ready);

  // 1. Rail mode: no band; the rail Changes row counts the branch; Commit enabled; no behind indicator in the rail row.
  // F12 (heavyWorkWorker ya, getGitDiffStats(cwd, baseBranch)): the counts are merge-base(origin/main, HEAD) → worktree,
  // i.e. both feature commits (f1 +1, f2 +1) plus the dirty change.txt (+2 −1). DiffCounts (diff-counts.mjs Xe) animates
  // its numbers for 400ms, so wait for the settled values.
  await page.waitForFunction((selector) => { const el = document.querySelector(selector); return el?.querySelector(".text-git-added")?.textContent === "+4" && el.querySelector(".text-git-removed")?.textContent === "−1"; }, RAIL_ROW);
  const band = await row.evaluate(el => ({ bands: document.querySelectorAll("nav.sg-status").length,
    diffLabel: el.querySelector('button[aria-label^="Open changes, "]')?.getAttribute("aria-label") ?? null,
    behind: el.querySelectorAll(".sg-behind").length }));
  metrics.band = band;
  assert.equal(band.bands, 0, "rail mode hides the band");
  assert.equal(band.diffLabel, "Open changes, 4 added, 1 removed");
  // changes-row.mjs OLe (the rail branch of iB) has no ArrowDown behind count (that is the band layout's `N`).
  assert.equal(band.behind, 0);
  const idleRail = await railProbe();
  assert.equal(idleRail.disabled, false); assert.equal(idleRail.busy, null);
  assert.equal(idleRail.title, null, "no native title (CDS tooltip only)"); assert.equal(idleRail.reason, null, "enabled Commit carries no disabled reason");
  assert.equal(await page.locator('aside[aria-label="Session details"]').getByRole("button", { name: "feature", exact: true }).count(), 1, "the Environment card's branch chip names feature");
  checks.push("Rail mode: no band; the rail Changes row shows +4 −1 ('Open changes, 4 added, 1 removed'), no behind count; Commit changes enabled without a native title or disabled reason; the Environment card's branch chip names feature");

  // 2. Real comparison payload through the whitelisted IPC (scoped to the session cwd).
  const comparison = await page.evaluate(({ cwd, session }) => window.desktop.call("workspace-git-comparison", { cwd, sessionId: session }), { cwd, session: SESSION });
  metrics.comparison = comparison;
  assert.equal(comparison.base, "main"); assert.equal(comparison.ahead, 2); assert.equal(comparison.behind, 1); assert.equal(comparison.baseSource, "default");
  assert.match(comparison.mergeBase, /^[0-9a-f]{40}$/);
  const status = await page.evaluate(({ cwd, session }) => window.desktop.call("workspace-git-status", { cwd, sessionId: session }), { cwd, session: SESSION });
  assert.deepEqual({ base: status.comparison.base, ahead: status.comparison.ahead, behind: status.comparison.behind }, { base: "main", ahead: 2, behind: 1 });
  await assert.rejects(page.evaluate(() => window.desktop.call("workspace-git-status", { cwd: "/tmp" })), /Unknown workspace directory/);
  const gitLogBefore = await fs.readFile(gitLog, "utf8");
  assert.ok(!/(^|\s)(fetch|ls-remote|push|pull)(\s|$)/m.test(gitLogBefore), "no network git verb was spawned");
  checks.push("workspace-git-comparison/status return {base:'main', ahead:2, behind:1} with a real merge base; unknown cwd is rejected; no fetch/ls-remote spawned");

  // 3. Commit sends the exact official text as a real turn; while responding the action is disabled with the
  //    official reason (cc: !hasChanges || isResponding), never busy (pi holds only PR creation); the band node is
  //    kept across the turn start and every 10s poll; the Changes panel reads the diff once while polling.
  const callsBeforeClick = await statusCalls(), diffBeforeClick = await diffCalls();
  await page.evaluate((selector) => { window.__railRow = document.querySelector(selector); }, RAIL_ROW);
  const clickedAt = Date.now();
  await commit.click();
  await commit.evaluate((action, reason) => new Promise(resolve => { const check = () => { const wrap = action.closest("[data-cds-disabled-reason-wrapper]"); if (action.disabled && wrap && document.getElementById(wrap.getAttribute("aria-describedby"))?.textContent === reason) resolve(); else requestAnimationFrame(check); }; check(); }), RESPONDING_REASON);
  await page.getByRole("button", { name: "Allow once", exact: true }).waitFor();
  const turns = await fixtureTurns();
  assert.equal(turns.length, 1); assert.equal(turns[0].items[0].type, "userMessage");
  assert.equal(turns[0].items[0].content[0].text, COMMIT_TEXT, "exact official commit ask");
  assert.equal(turns[0].items[0].content.length, 1);
  const responding = await railProbe();
  metrics.responding = responding;
  assert.equal(responding.disabled, true); assert.equal(responding.reason, RESPONDING_REASON); assert.equal(responding.title, null, "reason is the Pu described tooltip, not a native title");
  assert.equal(responding.busy, null, "official Commit is never aria-busy for its own turn");
  assert.equal(responding.sameNode, true, "the rail Changes row stays mounted across the turn start"); assert.equal(responding.bands, 0);
  assert.equal(git(cwd, "log", "--oneline").split("\n").filter(Boolean).length, 3, "the app itself never committed");
  await row.getByRole("button", { name: /^Open changes, / }).click();
  // F12: the default "All changes" scope lists the two feature commits' files plus change.txt.
  await page.locator(".sdiff-file").first().waitFor();
  await page.waitForFunction(() => document.querySelector(".sdiff-file-body") !== null);
  const diffOpened = await diffCalls();
  assert.equal(diffOpened - diffBeforeClick, 1, "opening the Changes panel reads the diff once");
  await sleep(Math.max(0, 25000 - (Date.now() - clickedAt)));
  const pollCalls = await statusCalls() - callsBeforeClick;
  metrics.pollCallsWithin25s = pollCalls;
  assert.ok(pollCalls >= 2, `expected >=2 status polls within 25s of responding, saw ${pollCalls}`);
  assert.ok(pollCalls <= 4, `polling is ~10s, saw ${pollCalls} calls in 25s`);
  metrics.diffCallsWhilePolling = await diffCalls() - diffOpened;
  assert.equal(metrics.diffCallsWhilePolling, 0, "unchanged polls do not re-read the worktree diff");
  assert.deepEqual(await page.locator(".sdiff-file").evaluateAll(nodes => nodes.map(node => node.dataset.filePath).sort()), ["change.txt", "f1.txt", "f2.txt"], "the branch diff stays on screen across polls");
  const polled = await railProbe();
  assert.equal(polled.sameNode, true, "the rail Changes row stays mounted across polls"); assert.equal(polled.disabled, true); assert.equal(polled.reason, RESPONDING_REASON); assert.equal(polled.title, null); assert.equal(polled.busy, null);
  checks.push(`Commit sends "${COMMIT_TEXT}" as the only input; while responding the action is disabled with "${RESPONDING_REASON}" (no aria-busy, no spinner); rail Changes row node kept; no local git commit; ${pollCalls} status polls in 25s with 0 diff re-reads while the Changes panel is open`);

  // 4. Turn end stops the interval; window focus refreshes once; the band survives both; the reason disappears.
  await page.getByRole("button", { name: "Allow once", exact: true }).click();
  await page.waitForFunction((selector) => { const action = [...(document.querySelector(selector)?.querySelectorAll("button") ?? [])].find(button => button.textContent === "Commit changes"); return !!action && !action.disabled; }, RAIL_ROW);
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  await sleep(2500); // the running→idle refetch settles
  const idleBase = await statusCalls(), idleDiff = await diffCalls();
  await sleep(15000);
  metrics.idleCallsIn15s = await statusCalls() - idleBase;
  assert.equal(metrics.idleCallsIn15s, 0, "no polling after the turn ended");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await sleep(1500);
  metrics.focusCalls = await statusCalls() - idleBase;
  assert.equal(metrics.focusCalls, 1, "one refetch on window focus");
  assert.equal(await diffCalls() - idleDiff, 0, "an unchanged focus refetch does not re-read the diff");
  const idle = await railProbe();
  metrics.idle = idle;
  assert.equal(idle.sameNode, true, "the rail Changes row stays mounted across the turn end and the focus refetch");
  assert.equal(idle.disabled, false); assert.equal(idle.reason, null, "no tooltip once enabled"); assert.equal(idle.title, null); assert.equal(idle.busy, null);
  checks.push("Polling stops after the turn ends (0 calls in 15s); window focus refetches exactly once without a diff re-read; rail Changes row node kept; Commit re-enabled with no reason tooltip");
  await page.screenshot({ path: path.join(directory, "rail-changes.png") });
  assert.deepEqual(rendererErrors, []);
  await app.close(); app = null;

  // ---- Fixture-only band rows in an isolated component fixture (Vite dev server, no production build involved). ----
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  vite = spawn(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: root, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  vite.stdout.on("data", chunk => { viteLog += chunk; }); vite.stderr.on("data", chunk => { viteLog += chunk; });
  const url = `http://127.0.0.1:${port}/tests/fixtures/git-rail-fixture.html`;
  for (let attempt = 0; ; attempt++) {
    const ok = await new Promise(resolve => http.get(url, response => { response.resume(); resolve(response.statusCode === 200); }).on("error", () => resolve(false)));
    if (ok) break;
    if (attempt > 200) throw new Error("Vite fixture server did not start\n" + viteLog);
    await sleep(100);
  }
  const fixtureEnv = { ...process.env, COMPOSER_FIXTURE_URL: url }; delete fixtureEnv.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({ executablePath, args: [path.join(root, "tests/fixtures/composer-window.cjs")], env: fixtureEnv });
  page = await app.firstWindow(); page.setDefaultTimeout(15000);
  page.on("pageerror", error => rendererErrors.push(error.message));
  const bandRow = page.locator('[data-fixture="band"] .sg-row').first();
  await bandRow.waitFor();
  await page.evaluate(() => document.fonts.ready);

  // 5. Behind indicator markup with showBehind forced on (fixture only).
  const behindSpan = page.locator('[data-fixture="band"] .sg-row').first().locator(".sg-behind");
  const behind = await behindSpan.evaluate(el => {
    const style = getComputedStyle(el), glyph = el.querySelector('[data-cds="Icon"]');
    return { role: el.getAttribute("role"), label: el.getAttribute("aria-label"), title: el.getAttribute("title"), height: el.getBoundingClientRect().height,
      control: getComputedStyle(document.documentElement).getPropertyValue("--cds-h-control").trim(), gap: style.columnGap, paddingLeft: style.paddingInlineStart, paddingRight: style.paddingInlineEnd,
      color: style.color, muted: getComputedStyle(document.documentElement).getPropertyValue("--cds-text-muted").trim(), glyphSize: glyph && getComputedStyle(glyph).fontSize,
      count: el.querySelector(".sg-behind-count").textContent, numeric: getComputedStyle(el.querySelector(".sg-behind-count")).fontVariantNumeric,
      // Token probes resolve inside the same compact-density scope as the row.
      controlPx: (() => { const probe = document.createElement("div"); probe.style.height = "var(--cds-h-control)"; el.parentElement.append(probe); const px = probe.getBoundingClientRect().height; probe.remove(); return px; })() };
  });
  metrics.behind = behind;
  assert.equal(behind.role, "img"); assert.equal(behind.label, "1 commit behind main"); assert.equal(behind.title, null, "behind hint is the multiline K tooltip (git-status-card 1270-1292), not a native title");
  near(behind.height, behind.controlPx, "behind height is --cds-h-control"); assert.equal(behind.controlPx, 24);
  assert.equal(behind.gap, "3px"); assert.equal(behind.paddingLeft, "5px"); assert.equal(behind.paddingRight, "5px");
  assert.equal(behind.glyphSize, "16px"); assert.equal(behind.count, "1"); assert.equal(behind.numeric, "tabular-nums");
  const mutedRgb = await page.evaluate(() => { const probe = document.createElement("span"); probe.style.color = "var(--cds-text-muted)"; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; });
  assert.equal(behind.color, mutedRgb);
  const reserved = await page.locator('[data-fixture="band"] .sg-row').nth(1).locator(".sg-dismiss-reserved").evaluate(el => el.getBoundingClientRect());
  assert.equal(reserved.width, 24); assert.equal(reserved.height, 24);
  assert.equal(await page.locator('[data-fixture="band"] .sg-row').nth(1).locator(".sg-dismiss").count(), 0);
  checks.push("Fixture-only behind indicator: role=img, aria-label = tooltip, ArrowDown 16px + tabular count '1', height 24px (--cds-h-control), gap 3px, padding-inline 5px, text-muted; dismissReserved renders a 24px square");

  // 6. Uncounted dirty tree and the responding state of the band Commit (fixture only).
  await page.getByRole("button", { name: "Fixture: toggle uncounted" }).click();
  // Only the first (live) row follows the toggle; the dismiss-reserved row keeps its counted status.
  await page.waitForFunction(() => document.querySelector('[data-fixture="band"] .sg-row')?.querySelector(".sg-diff") === null);
  assert.equal(await bandRow.locator(".sg-diff").count(), 0, "uncounted dirty tree shows no +/- in the band");
  await page.getByRole("button", { name: "Fixture: toggle responding" }).click();
  const respondingBand = await bandRow.locator(".sg-action").evaluate(el => ({ disabled: el.disabled, title: el.getAttribute("title"), reason: (() => { const wrap = el?.closest(".source-tooltip-disabled-trigger"), id = wrap?.getAttribute("aria-describedby"); return id ? document.getElementById(id)?.textContent ?? null : null; })(), busy: el.getAttribute("aria-busy") }));
  metrics.respondingFixture = { band: respondingBand };
  assert.deepEqual(respondingBand, { disabled: true, title: null, reason: RESPONDING_REASON, busy: null });
  await page.getByRole("button", { name: "Fixture: toggle responding" }).click();
  assert.equal(await bandRow.locator(".sg-action").getAttribute("title"), null); assert.equal(await bandRow.locator(".source-tooltip-disabled-trigger").count(), 0); assert.equal(await bandRow.locator(".sg-action").isDisabled(), false);
  await page.getByRole("button", { name: "Fixture: toggle uncounted" }).click();
  checks.push(`Uncounted dirty tree shows no +/- in the band; responding disables the band Commit with "${RESPONDING_REASON}", no native title and no busy state; it re-enables when the turn ends`);
  await page.screenshot({ path: path.join(directory, "band-fixture.png") });
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
} finally {
  await app?.close().catch(error => { failure ||= error; });
  vite?.kill("SIGTERM");
  if (build) await verifySource().catch(error => { failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch(error => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "git-rail-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, realGit: true, directory, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, rendererErrors,
    notes: ["2.31226 renders the behind indicator (cd5a31703 ORe, 3nAhFAuOAD) behind the desktop git engine; main.jsx passes showBehind with behindIndicator (B34). The fixture sets showBehind on one row to verify the markup.",
      "R4f-rail SR-8: the 2.3x stacked rail fixture (SourceGitRail) is retired. The 2.42304.0 flat session rail is mounted in the app (src/source-session-rail.jsx) with the generated c96d752d0 OLe Changes row; it is verified by SSR / fake-DOM tests, and its on-screen geometry is not part of this suite."],
    ...(failure ? { error: failure.stack || String(failure), viteLog: viteLog.slice(-4000) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "git-rail-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
if (failure) throw failure;
