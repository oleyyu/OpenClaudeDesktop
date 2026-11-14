import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Classic status-row Spark sprite ("thinking" strip, WAAPI) and stream-
// incremental fence highlighting (dedicated stream worker, stream palette,
// retention after completion). Runs only after a fresh build with no other GUI
// suite active; every row comes from the isolated protocol fixture
// (tests/fixtures/highlight-server.cjs: real item/delta/turn events).
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `stream-highlight-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
const A = "stream-A", B = "stream-B", CONTROL = "highlight-control";
const now = Math.floor(Date.now() / 1000);
const fence = (text, language = "js") => `\`\`\`${language}\n${text}\n\`\`\``;
const item = (id, text) => ({ id, type: "agentMessage", text });
const thread = (id, name, items = [], index = 0) => ({ id, name, cwd: workspace, createdAt: now, updatedAt: now - index, archived: false,
  turns: items.length ? [{ id: `${id}-seed`, status: "completed", items }] : [] });
const SEED_A = 'const seeded = "SEED_A_READY";';
await fs.writeFile(path.join(profile, "highlight-fixture.marker"), "isolated-highlight-test\n");
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({ cwd: workspace, theme: "light", mode: "code", model: "highlight-fixture", threadIds: [A, B], sidebarWidth: 288 }));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: {
  [A]: thread(A, "Stream A", [item("seed-a", fence(SEED_A))]),
  [B]: thread(B, "Stream B", [item("seed-b", "OTHER_SESSION_VISIBLE")], 1),
  [CONTROL]: thread(CONTROL, "Isolated stream controls"),
} }));
const binary = path.join(root, "tests/fixtures/highlight-server.cjs"); await fs.chmod(binary, 0o755);
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: binary };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const checks = [], metrics = {}, rendererErrors = [], targets = [], phases = [];
let app, page, build, failure, runtime, clipboardSaved = false, clipboardRestored = false, profileRemoved = false, phase = "launch";
const testSources = ["scripts/stream-highlight-ui-test.mjs", "tests/fixtures/highlight-server.cjs"];
let testSourceHashes;
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const requiredSources = ["src/source-spark.jsx", "src/spark-sprite-model.mjs", "src/use-reduced-motion.js", "src/generated/spark-thinking.json",
  "src/source-transcript-status.jsx", "src/highlight-stream-worker.mjs", "src/highlight-stream-client.mjs", "src/highlight-stream-binding.mjs",
  "src/highlight-stream-model.mjs", "src/use-stream-highlight.mjs", "src/highlight-engine.mjs", "src/highlight-themes.mjs", "src/source-code-block.jsx", "vite.config.js"];
async function verifySource() {
  assert.ok(build && Array.isArray(build.sources) && build.sources.length, "Build must contain a source manifest");
  assert.equal(sha(JSON.stringify(build.sources)), build.sourceSha256, "Build source digest must be internally consistent");
  const current = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  assert.equal(current.sourceSha256, build.sourceSha256, "Build changed during this test");
  assert.equal(current.builtAt, build.builtAt, "Build was replaced during this test");
  assert.equal(JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version, build.version, "Package version must match build");
  for (const entry of build.sources) assert.equal(sha(await fs.readFile(path.join(root, entry.path))), entry.sha256, `Build is stale: ${entry.path}`);
  for (const required of requiredSources) assert.ok(build.sources.some((entry) => entry.path === required), `Build does not identify ${required}`);
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async (file) => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test or protocol fixture changed during this run");
  else testSourceHashes = hashes;
}
function enterPhase(name) { phase = name; phases.push({ phase, at: new Date().toISOString() }); console.log(`STREAM-HIGHLIGHT ${phase}`); }
const near = (actual, expected, label, tolerance = .5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
const rgbNear = (actual, expected, label, tolerance = 1) => {
  const parse = (value) => value.match(/\d+/g).map(Number);
  const a = parse(actual), e = parse(expected);
  assert.ok(a.length === 3 && e.length === 3 && a.every((channel, index) => Math.abs(channel - e[index]) <= tolerance), `${label}: expected ${expected}, got ${actual}`);
};
async function frames(count = 3) {
  await page.evaluate((count) => new Promise((resolve) => { const step = () => --count ? requestAnimationFrame(step) : resolve(); requestAnimationFrame(step); }), count);
}
const nodeFor = (id) => page.locator(`[data-transcript-item-id="${id}"]`);
const blockFor = (id) => nodeFor(id).locator(".scb-block").last();
const codeFor = (id) => blockFor(id).locator(".scb-code");
async function rpc(method, params) { return page.evaluate(({ method, params }) => window.desktop.call("rpc", { method, params }), { method, params }); }
async function control(command) { return rpc("turn/start", { threadId: CONTROL, input: [{ type: "text", text: "HIGHLIGHT_TEST:" + JSON.stringify({ threadId: A, ...command }) }] }); }
async function open(id, lastItem) {
  await page.locator(`[data-source-session-id="${id}"] .source-session-open`).click();
  await page.locator(`[data-transcript-item-id="${lastItem}"]`).waitFor();
  await page.locator(".loading-state").waitFor({ state: "detached" });
  await rpc("thread/resume", { threadId: CONTROL });
  await frames(4);
}
async function waitText(id, text) {
  await page.waitForFunction(({ id, text }) => {
    const codes = [...document.querySelectorAll(`[data-transcript-item-id="${id}"] .scb-code`)];
    return codes.length > 0 && codes.at(-1).textContent === text;
  }, { id, text });
}
async function waitStreamTokens(id, text) {
  await page.waitForFunction(({ id, text }) => {
    const code = [...document.querySelectorAll(`[data-transcript-item-id="${id}"] .scb-code`)].at(-1);
    if (!code || code.dataset.highlightSource !== "stream") return false;
    return [...code.querySelectorAll("[data-code-token]")].map((span) => span.textContent).join("") === text && code.textContent === text;
  }, { id, text }, { timeout: 8000 });
}
async function tokenColors(id) {
  return codeFor(id).evaluate((code) => [...code.querySelectorAll("[data-code-token]")].map((span) => ({ text: span.textContent, color: getComputedStyle(span).color })));
}
const colorOf = (tokens, text) => tokens.find((token) => token.text === text)?.color ?? tokens.find((token) => token.text.includes(text))?.color;
async function snapshot() { return page.evaluate(() => __streamObserver.snapshot()); }
async function statusSnapshot() {
  return page.locator(".source-transcript-status").evaluate((status) => {
    const row = status.querySelector(".sts-row"), spark = status.querySelector(".sts-spark"), label = status.querySelector(".sts-label");
    const strip = spark.querySelector("[data-cds-spark-strip]"), svg = spark.tagName === "svg" ? spark : strip?.querySelector("svg");
    const style = getComputedStyle(spark), r = (node) => node.getBoundingClientRect();
    const animations = strip ? strip.getAnimations() : [];
    const timing = animations[0]?.effect.getComputedTiming();
    return {
      phase: status.dataset.transcriptStatus, tag: spark.tagName.toLowerCase(), rendering: spark.dataset.sparkRendering, state: spark.dataset.sparkState ?? null,
      cds: spark.dataset.cds, ariaHidden: spark.getAttribute("aria-hidden"), width: r(spark).width, height: r(spark).height,
      overflow: style.overflow, position: style.position, color: style.color, fill: style.fill, display: style.display,
      rowHeight: r(row).height, rowGap: getComputedStyle(row).gap, labelText: label.textContent, labelRole: label.getAttribute("role"),
      labelLeft: r(label).left, sparkRight: r(spark).right, labelFont: getComputedStyle(label).fontSize, labelLine: getComputedStyle(label).lineHeight,
      // Y5:58655–58690 shimmers only activity; elapsed/tokens remain plain.
      // Keep checking actual text readability after moving the paint to its child.
      labelNumeric: getComputedStyle(label).fontVariantNumeric, labelFill: getComputedStyle(label.querySelector('.sts-activity') || label).webkitTextFillColor,
      stripViewBox: svg?.getAttribute("viewBox") ?? null, stripHeight: strip ? r(strip.querySelector("svg")).height : null,
      running: status.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length,
      animation: animations.length ? { count: animations.length, playState: animations[0].playState, currentTime: animations[0].currentTime,
        duration: timing.duration, iterations: timing.iterations, easing: timing.easing, fill: timing.fill,
        keyframes: animations[0].effect.getKeyframes().map((frame) => frame.transform) } : null,
    };
  });
}
async function readClipboard() { return app.evaluate(({ clipboard }) => clipboard.readText()); }
async function copyBlock(id, expected) {
  await blockFor(id).getByRole("button", { name: /^(Copy code|Copied)$/, exact: true }).click();
  await blockFor(id).getByRole("button", { name: "Copied", exact: true }).waitFor();
  assert.equal(await readClipboard(), expected, "Copy payload stays the canonical code bytes");
}
async function screenshot(name) { await page.screenshot({ path: path.join(directory, name) }).catch(() => {}); }

try {
  enterPhase("launch");
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  await verifySource();
  app = await electron.launch({ executablePath, args: [root], env });
  runtime = await app.evaluate(({ app, BrowserWindow }) => ({ version: app.getVersion(), userData: app.getPath("userData"), electron: process.versions.electron, chrome: process.versions.chrome, windowId: BrowserWindow.getAllWindows()[0].id }));
  assert.equal(runtime.version, build.version); assert.equal(runtime.userData, profile);
  page = await app.firstWindow(); page.setDefaultTimeout(12_000);
  page.on("pageerror", (error) => rendererErrors.push({ phase, message: error.message }));
  page.on("worker", (worker) => {
    const target = { url: worker.url(), worker, createdAt: Date.now(), closed: false };
    targets.push(target); worker.on("close", () => { target.closed = true; target.closedAt = Date.now(); });
  });
  await page.context().setOffline(true);
  await page.context().addInitScript(installStreamObserver);
  await page.reload();
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Highlight fixture" }).waitFor();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768));
  await page.waitForFunction(() => innerWidth === 1324 && innerHeight === 768);
  assert.ok(page.url().startsWith("file:"), "Built files only");
  metrics.csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  assert.match(metrics.csp, /script-src 'self'(;|$)/, "CSP script-src stays 'self'");
  metrics.clipboardApi = await app.evaluate(async ({ clipboard, ClipboardItem }) => {
    if (typeof clipboard.read === "function" && typeof ClipboardItem === "function") {
      const items = await clipboard.read();
      globalThis.streamClipboardBackup = { kind: "items", items: await Promise.all(items.map(async (entry) => new ClipboardItem(Object.fromEntries(await Promise.all(entry.types.map(async (type) => [type, await entry.getType(type)])))))) };
      return "ClipboardItem[]";
    }
    globalThis.streamClipboardBackup = { kind: "text", data: { text: await clipboard.readText() }, empty: typeof clipboard.availableFormats === "function" && clipboard.availableFormats().length === 0 };
    return "text";
  });
  clipboardSaved = true;
  await open(A, "seed-a");
  await codeFor("seed-a").locator("[data-code-token]").first().waitFor({ state: "attached" });
  assert.equal(await codeFor("seed-a").getAttribute("data-highlight-source"), "settled");
  checks.push("Runtime/build identity verified; offline built files; settled seed fence highlighted through the settled worker");

  enterPhase("plain-frontier-cadence");
  await control({op:"start",turnId:"plain-cadence-turn"});
  let plainBody="PLAIN_START";await control({op:"item",turnId:"plain-cadence-turn",item:item("plain-cadence-item","```text\n"+plainBody),completed:false});await waitText("plain-cadence-item",plainBody);
  await codeFor("plain-cadence-item").evaluate(code=>{const data={start:performance.now(),commits:[]};const observer=new MutationObserver(()=>{const text=code.textContent;if(text!==data.commits.at(-1)?.text)data.commits.push({at:performance.now(),text});});observer.observe(code,{subtree:true,childList:true,characterData:true});globalThis.plainCadenceProbe={data,observer};});
  for(let i=0;i<16;i++){const delta=`\nPLAIN_LINE_${i}`;plainBody+=delta;await control({op:"delta",turnId:"plain-cadence-turn",itemId:"plain-cadence-item",delta});await page.waitForTimeout(12);}
  await waitText("plain-cadence-item",plainBody);metrics.plainCadence=await page.evaluate(()=>{const {data,observer}=plainCadenceProbe;observer.disconnect();delete globalThis.plainCadenceProbe;return {...data,finished:performance.now()};});
  const changes=metrics.plainCadence.commits,span=metrics.plainCadence.finished-metrics.plainCadence.start;assert.ok(changes.length>=2);assert.ok(changes.length<=Math.ceil(span/100)+2,`plain commits ${changes.length} within ${span}ms`);assert.ok(changes.length<16,'16 distinct protocol deltas must coalesce');for(const entry of changes)assert.ok(plainBody.startsWith(entry.text));assert.equal(await codeFor("plain-cadence-item").getAttribute("data-highlight-source"),'plain');assert.equal(await blockFor("plain-cadence-item").locator('.scb-copy').count(),0);
  plainBody+='\nFINAL_EXACT  ';await control({op:"delta",turnId:"plain-cadence-turn",itemId:"plain-cadence-item",delta:'\nFINAL_EXACT  '});await control({op:"item",turnId:"plain-cadence-turn",item:item("plain-cadence-item","```text\n"+plainBody+"\n```")});await control({op:"complete",turnId:"plain-cadence-turn"});await waitText("plain-cadence-item",plainBody);await copyBlock("plain-cadence-item",plainBody);
  await open(B,'seed-b');await page.waitForTimeout(120);assert.equal(await nodeFor('plain-cadence-item').count(),0);await open(A,'seed-a');await waitText('plain-cadence-item',plainBody);
  checks.push('Plain frontier coalesces16 real protocol deltas on source100ms cadence; completion and Copy preserve exact trailing spaces, session switch never paints old scope text');

  // ---------------------------------------------------------------- sprite
  enterPhase("sprite-idle");
  const idle = await statusSnapshot();
  assert.equal(idle.phase, "idle"); assert.equal(idle.tag, "svg"); assert.equal(idle.rendering, "static"); assert.equal(idle.cds, "Spark"); assert.equal(idle.ariaHidden, "true");
  near(idle.width, 18, "idle spark width"); near(idle.height, 18, "idle spark height"); assert.equal(idle.fill, "rgb(217, 119, 87)");
  assert.equal(idle.running, 0); near(idle.rowHeight, 20, "idle row height"); assert.equal(idle.rowGap, "16px");
  metrics.idle = idle;
  checks.push("Idle tail: static aria-hidden svg Spark 18px clay, no running animation, 20px row with 16px gap");

  enterPhase("sprite-running");
  await control({ op: "start", turnId: "sprite-turn" });
  await page.locator('.source-transcript-status[data-transcript-status="running"]').waitFor({ state: "attached" });
  const runningSeen = Date.now();
  await page.locator('.source-transcript-status .sts-spark[data-spark-rendering="sprite"][data-spark-state="thinking"]').waitFor({ state: "attached", timeout: 1000 });
  metrics.spriteLatencyMs = Date.now() - runningSeen;
  await page.locator(".source-transcript-status").evaluate((node) => { node.dataset.streamIdentity = "original"; });
  await frames(2);
  const running = await statusSnapshot();
  assert.equal(running.tag, "span"); assert.equal(running.cds, "Spark"); assert.equal(running.ariaHidden, "true"); assert.equal(running.state, "thinking");
  near(running.width, 18, "sprite width"); near(running.height, 18, "sprite height"); assert.equal(running.overflow, "hidden"); assert.equal(running.position, "relative");
  assert.equal(running.color, "rgb(217, 119, 87)"); assert.equal(running.stripViewBox, "0 0 100 900"); near(running.stripHeight, 162, "strip svg height = 9 frames x 18px");
  assert.ok(running.animation, "strip has a WAAPI animation"); assert.equal(running.animation.count, 1); assert.equal(running.animation.playState, "running");
  assert.equal(running.animation.duration, 810); assert.equal(running.animation.iterations, Infinity); assert.equal(running.animation.easing, "steps(9, jump-none)"); assert.equal(running.animation.fill, "forwards");
  assert.equal(running.animation.keyframes.length, 9);
  running.animation.keyframes.forEach((transform, index) => {
    const value = Number(/translateY\(-?([\d.]+)%\)/.exec(transform)[1]);
    near(value, (100 / 9) * index, `keyframe ${index}`, 0.01);
  });
  const later = await page.locator(".source-transcript-status [data-cds-spark-strip]").evaluate(async (strip) => {
    const animation = strip.getAnimations()[0]; const first = animation.currentTime;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { first, second: animation.currentTime };
  });
  assert.ok(later.second > later.first, `animation time advances (${later.first} -> ${later.second})`);
  near(running.rowHeight, 20, "running row height"); near(running.labelLeft - running.sparkRight, 16, "label sits 16px after the spark");
  assert.equal(running.labelText, "Working…"); assert.equal(running.labelRole, "status"); assert.equal(running.labelFont, "12px"); assert.equal(running.labelNumeric, "tabular-nums");
  // --cds-leading-footnote is a density token (15px at the workspace's compact density); the row stays 20px.
  assert.match(running.labelLine, /^1[5-7]px$/);
  assert.equal(running.running >= 1, true);
  metrics.running = { ...running, later };
  await screenshot("sprite-running.png");
  checks.push("Running: span sprite 18x18 (overflow hidden, relative, clay) with the 9-frame 0 0 100 900 strip at 162px, one running WAAPI animation 810ms/Infinity/steps(9, jump-none)/forwards over 9 translateY keyframes; row 20px, label 16px after the spark, Working… role=status footnote");

  enterPhase("sprite-reduced-motion");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('.source-transcript-status .sts-spark[data-spark-rendering="static-fallback"]').waitFor({ state: "attached", timeout: 1000 });
  await frames(2);
  const reduced = await statusSnapshot();
  assert.equal(reduced.tag, "svg"); assert.equal(reduced.running, 0); assert.notEqual(reduced.labelFill, "rgba(0, 0, 0, 0)"); assert.equal(reduced.labelText, "Working…");
  assert.equal(await page.locator(".source-transcript-status").getAttribute("data-stream-identity"), "original", "status node identity retained across the motion toggle");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator('.source-transcript-status .sts-spark[data-spark-rendering="sprite"]').waitFor({ state: "attached", timeout: 1000 });
  await frames(2);
  const restored = await statusSnapshot();
  assert.equal(restored.animation?.playState, "running");
  // The Settings switch mirrors to html[data-local-motion] and this event (main.jsx).
  await page.evaluate(() => { document.documentElement.dataset.localMotion = "reduce"; window.dispatchEvent(new Event("local-motion-change")); });
  await page.locator('.source-transcript-status .sts-spark[data-spark-rendering="static-fallback"]').waitFor({ state: "attached", timeout: 1000 });
  await frames(2);
  const settingsReduced = await statusSnapshot();
  assert.equal(settingsReduced.running, 0); assert.notEqual(settingsReduced.labelFill, "rgba(0, 0, 0, 0)");
  await page.evaluate(() => { document.documentElement.dataset.localMotion = "auto"; window.dispatchEvent(new Event("local-motion-change")); });
  await page.locator('.source-transcript-status .sts-spark[data-spark-rendering="sprite"]').waitFor({ state: "attached", timeout: 1000 });
  assert.equal(await page.locator(".source-transcript-status").getAttribute("data-stream-identity"), "original");
  metrics.reducedMotion = { media: reduced, restored: restored.animation, settings: settingsReduced };
  checks.push("Live reduced motion (media query and the Settings attribute/event) swaps the sprite for the static fallback without remounting the row, cancels the WAAPI animation, keeps the label readable, and restores the running sprite when switched back");

  enterPhase("sprite-stopping-and-completion");
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').click();
  await page.locator('.source-transcript-status[data-transcript-status="idle"]').waitFor({ state: "attached" });
  await frames(2);
  const done = await statusSnapshot();
  assert.equal(done.tag, "svg"); assert.equal(done.rendering, "static"); assert.equal(done.animation, null);
  assert.equal(await page.evaluate(() => document.getAnimations().filter((animation) => animation.effect?.target?.closest?.(".sts-spark")).length), 0, "no animation targets the spark");
  // The label's own 150ms opacity transition (existing CSS) is the only thing allowed to still run; it ends shortly after.
  await page.waitForTimeout(250);
  assert.equal((await statusSnapshot()).running, 0);
  assert.equal(await page.evaluate(() => document.getAnimations().filter((animation) => animation.effect?.target?.closest?.(".source-transcript-status")).length), 0);
  metrics.completion = done;
  checks.push("Completion (real interrupted turn event) returns the static idle svg and leaves no animation targeting the status row");

  enterPhase("sprite-chunk-unavailable");
  metrics.spriteBlock = await app.evaluate(({ BrowserWindow }) => {
    globalThis.streamBlocked = [];
    BrowserWindow.getAllWindows()[0].webContents.session.webRequest.onBeforeRequest((details, callback) => {
      const blocked = /spark-thinking-[^/]*\.js/.test(details.url);
      if (blocked) globalThis.streamBlocked.push(details.url);
      callback({ cancel: blocked });
    });
    return "webRequest cancel spark-thinking chunk";
  });
  await page.reload();
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Highlight fixture" }).waitFor();
  await open(A, "seed-a");
  await control({ op: "start", turnId: "sprite-blocked-turn" });
  await page.locator('.source-transcript-status[data-transcript-status="running"]').waitFor({ state: "attached" });
  await page.waitForTimeout(600);
  const blockedState = await statusSnapshot();
  metrics.spriteBlocked = { state: blockedState, blocked: await app.evaluate(() => globalThis.streamBlocked) };
  assert.ok(metrics.spriteBlocked.blocked.length >= 1, "the sprite chunk request was actually intercepted");
  assert.equal(blockedState.rendering, "static-fallback"); assert.equal(blockedState.tag, "svg"); assert.equal(blockedState.labelText, "Working…"); assert.equal(blockedState.labelRole, "status");
  assert.equal(await page.locator('[role="alert"]').count(), 0, "no error UI for a missing sprite chunk");
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').click();
  await page.locator('.source-transcript-status[data-transcript-status="idle"]').waitFor({ state: "attached" });
  await app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].webContents.session.webRequest.onBeforeRequest(null); });
  await page.reload();
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Highlight fixture" }).waitFor();
  await open(A, "seed-a");
  const chunkErrors = rendererErrors.filter((entry) => entry.phase === "sprite-chunk-unavailable");
  metrics.spriteBlocked.rendererErrors = chunkErrors;
  checks.push("Blocked sprite chunk: the row stays static-fallback with the Working label announced and no error UI; the chunk loads again after the block is lifted");

  // ---------------------------------------------------------------- stream
  enterPhase("stream-first-render");
  await page.evaluate(() => __streamObserver.reset());
  let streamBody = '// STREAM_COMMENT\nconst stream = "STREAM_A";';
  let markdown = "```js";
  await control({ op: "start", turnId: "stream-turn" });
  await control({ op: "item", turnId: "stream-turn", item: item("stream-item", markdown), completed: false });
  await nodeFor("stream-item").locator(".scb-language-placeholder").waitFor({ state: "attached" });
  markdown += `\n${streamBody}`;
  await control({ op: "delta", turnId: "stream-turn", itemId: "stream-item", delta: `\n${streamBody}` });
  await waitText("stream-item", streamBody);
  await codeFor("stream-item").evaluate((code) => { code.dataset.streamNode = "original"; });
  const beforeCommit = await blockFor("stream-item").evaluate((block) => { const box = block.getBoundingClientRect(); return { width: box.width, height: box.height }; });
  await waitStreamTokens("stream-item", streamBody);
  assert.equal(await blockFor("stream-item").getAttribute("data-frontier"), "true"); assert.equal(await blockFor("stream-item").locator(".scb-copy").count(), 0);
  assert.equal(await codeFor("stream-item").getAttribute("data-stream-node"), "original", "code node identity kept across the first token commit");
  const afterCommit = await blockFor("stream-item").evaluate((block) => { const box = block.getBoundingClientRect(); return { width: box.width, height: box.height }; });
  near(afterCommit.width, beforeCommit.width, "block width unchanged by the first token commit"); near(afterCommit.height, beforeCommit.height, "block height unchanged by the first token commit");
  const initialSnapshot = await snapshot();
  assert.ok(!initialSnapshot.settled.requests.some((request) => request.text.includes("STREAM_A")), "the settled worker saw no request for the frontier text");
  assert.ok(initialSnapshot.stream.pushes.some((push) => push.text.includes("STREAM_A")), "the stream worker received the frontier text");
  const light = await tokenColors("stream-item");
  rgbNear(colorOf(light, "const"), "rgb(129, 0, 194)", "stream light keyword"); rgbNear(colorOf(light, '"STREAM_A"'), "rgb(0, 128, 0)", "stream light string"); rgbNear(colorOf(light, "// STREAM_COMMENT"), "rgb(110, 118, 135)", "stream light comment");
  metrics.streamGeometry = { beforeCommit, afterCommit };
  metrics.streamLight = light;
  checks.push("Frontier js fence streamed by real item/delta events: stream tokens equal the fed text, the code node keeps identity and geometry, the settled worker never receives the frontier text, and colors are the stream light palette (keyword 129,0,194 / string 0,128,0 / comment 110,118,135)");

  enterPhase("stream-recall-and-theme");
  await codeFor("stream-item").evaluate((code) => { [...code.querySelectorAll("[data-code-token]")].forEach((span, index) => { span.dataset.streamSpan = String(index); }); });
  const firstLineSpans = await codeFor("stream-item").evaluate((code) => [...code.querySelectorAll("[data-code-token]")].filter((span) => code.textContent.indexOf(span.textContent) < code.textContent.indexOf("\n")).length);
  let delta = "\nfunction greet() { return `open";
  streamBody += delta; markdown += delta;
  await control({ op: "delta", turnId: "stream-turn", itemId: "stream-item", delta });
  await waitStreamTokens("stream-item", streamBody);
  const provisional = await tokenColors("stream-item");
  rgbNear(colorOf(provisional, "greet"), "rgb(0, 81, 194)", "stream light function name");
  rgbNear(colorOf(provisional, "`open"), "rgb(0, 128, 0)", "unterminated template literal is provisional string");
  delta = "\nstill`; }";
  streamBody += delta; markdown += delta;
  await control({ op: "delta", turnId: "stream-turn", itemId: "stream-item", delta });
  await waitStreamTokens("stream-item", streamBody);
  const closed = await tokenColors("stream-item");
  rgbNear(colorOf(closed, "still`"), "rgb(0, 128, 0)", "template literal continuation keeps the grammar state (string)");
  const identity = await codeFor("stream-item").evaluate((code) => {
    const spans = [...code.querySelectorAll("[data-code-token]")];
    return { kept: spans.filter((span) => span.dataset.streamSpan !== undefined).length, total: spans.length };
  });
  assert.ok(identity.kept >= firstLineSpans && firstLineSpans > 0, `earlier line spans keep identity (${identity.kept}/${identity.total}, first line ${firstLineSpans})`);
  const pushesBeforeTheme = (await snapshot()).stream.pushes.length;
  await page.evaluate(() => { globalThis.streamTokenNodes = [...document.querySelectorAll('[data-transcript-item-id="stream-item"] [data-code-token]')]; document.documentElement.dataset.mode = "dark"; });
  await frames(2);
  const dark = await tokenColors("stream-item");
  rgbNear(colorOf(dark, "const"), "rgb(204, 123, 244)", "stream dark keyword"); rgbNear(colorOf(dark, '"STREAM_A"'), "rgb(155, 233, 99)", "stream dark string"); rgbNear(colorOf(dark, "// STREAM_COMMENT"), "rgb(129, 136, 152)", "stream dark comment");
  assert.ok(await page.evaluate(() => streamTokenNodes.every((node) => node.isConnected)), "theme switch keeps token nodes");
  assert.equal((await snapshot()).stream.pushes.length, pushesBeforeTheme, "theme switch sends no worker message");
  await screenshot("stream-dark.png");
  await page.evaluate(() => { document.documentElement.dataset.mode = "light"; });
  metrics.streamDark = dark; metrics.recall = { firstLineSpans, identity };
  checks.push("Recall: closing a template literal in a later delta recolors only the open line while earlier line spans keep identity; dark stream palette (keyword 204,123,244 / string 155,233,99 / comment 129,136,152) applies without worker traffic or node replacement");

  enterPhase("stream-restart");
  const replaced = 'let replaced = "STREAM_REPLACED";\nconst n = 42;';
  markdown = "```js\n" + replaced;
  await control({ op: "item", turnId: "stream-turn", item: item("stream-item", markdown), completed: false });
  await waitStreamTokens("stream-item", replaced);
  assert.equal(await codeFor("stream-item").getAttribute("data-stream-node"), "original");
  assert.equal(await codeFor("stream-item").textContent(), replaced);
  assert.ok(!(await codeFor("stream-item").textContent()).includes("STREAM_A"), "no stale tokens from the previous stream");
  const streamsAfterRestart = (await snapshot()).stream.opens.length;
  assert.ok(streamsAfterRestart >= 2, "a non-prefix replacement opened a fresh stream");
  streamBody = replaced;
  checks.push("Non-append item replacement while frontier restarts the stream: text exact, tokens reappear, no stale tokens");

  enterPhase("stream-completion-retained");
  const settledBefore = (await snapshot()).settled.requests.length;
  markdown += "\n```";
  await control({ op: "item", turnId: "stream-turn", item: item("stream-item", markdown) });
  await control({ op: "complete", turnId: "stream-turn" });
  await page.waitForFunction(() => document.querySelector('[data-transcript-item-id="stream-item"] .scb-block')?.getAttribute("data-frontier") === null);
  await page.waitForTimeout(400);
  assert.equal(await blockFor("stream-item").locator(".scb-copy").count(), 1);
  assert.equal(await codeFor("stream-item").getAttribute("data-highlight-source"), "stream", "successful stream result is retained after completion");
  const retained = await tokenColors("stream-item");
  rgbNear(colorOf(retained, "let"), "rgb(129, 0, 194)", "retained stream keyword"); rgbNear(colorOf(retained, "42"), "rgb(0, 128, 128)", "retained stream number");
  const afterCompletion = await snapshot();
  assert.equal(afterCompletion.settled.requests.length, settledBefore, "no settled job for the retained fence");
  assert.ok(!afterCompletion.settled.requests.some((request) => request.text.includes("STREAM_REPLACED")));
  const completedBox = await blockFor("stream-item").evaluate((block) => { const box = block.getBoundingClientRect(); const pre = block.querySelector(".scb-pre"); return { width: box.width, height: box.height, font: getComputedStyle(pre).fontSize, line: getComputedStyle(pre).lineHeight }; });
  assert.equal(completedBox.font, "12px"); assert.equal(completedBox.line, "17px");
  await copyBlock("stream-item", replaced);
  metrics.retained = { colors: retained, box: completedBox };
  checks.push("Completion with a successful stream: Copy appears, stream tokens and palette are retained, the settled service gets no job for the text, geometry 12/17 unchanged and Copy writes the exact code");

  enterPhase("stream-chunking");
  const bigLines = Array.from({ length: 650 }, (_, index) => `const big${index} = "${"b".repeat(50)}";`);
  const big = bigLines.join("\n");
  assert.ok(big.length >= 40_000, `fixture delta is ${big.length} units`);
  await control({ op: "start", turnId: "big-turn" });
  await control({ op: "item", turnId: "big-turn", item: item("big-item", "```js\n// BIG_START"), completed: false });
  await waitText("big-item", "// BIG_START");
  await control({ op: "delta", turnId: "big-turn", itemId: "big-item", delta: "\n" + big });
  await waitStreamTokens("big-item", "// BIG_START\n" + big);
  const bigPushes = (await snapshot()).stream.pushes.filter((push) => push.text.includes("big"));
  assert.ok(bigPushes.length >= 3, `expected several chunks, got ${bigPushes.length}`);
  for (const push of bigPushes) assert.ok(push.text.length <= 16_384, "each push within 16384 units");
  for (const push of bigPushes.slice(0, -1)) assert.ok(push.text.endsWith("\n"), "chunks are cut after a newline");
  assert.equal(bigPushes.map((push) => push.text).join(""), "\n" + big);
  await control({ op: "item", turnId: "big-turn", item: item("big-item", "```js\n// BIG_START\n" + big + "\n```") });
  await control({ op: "complete", turnId: "big-turn" });
  await page.waitForFunction(() => document.querySelector('[data-transcript-item-id="big-item"] .scb-block')?.getAttribute("data-frontier") === null);
  metrics.chunking = { units: big.length, pushes: bigPushes.map((push) => push.text.length) };
  checks.push("A 40k-unit delta reaches the stream worker as <=16384-unit pushes cut after newlines and the tokens still equal the fed text");

  enterPhase("stream-fallbacks");
  // Unknown language: never streams; completes as plain exactly as before.
  // F06: rust is a bundled grammar now; the unknown-language fence uses a label outside the table.
  await control({ op: "start", turnId: "rust-turn" });
  await control({ op: "item", turnId: "rust-turn", item: item("rust-item", "```notalang\nfn RUST_BODY() {}"), completed: false });
  await waitText("rust-item", "fn RUST_BODY() {}");
  await page.waitForTimeout(300);
  assert.equal(await codeFor("rust-item").getAttribute("data-highlight-source"), "plain");
  assert.ok(!(await snapshot()).stream.opens.some((entry) => entry.language === "notalang"), "unknown language opens no stream");
  await control({ op: "item", turnId: "rust-turn", item: item("rust-item", "```notalang\nfn RUST_BODY() {}\n```") });
  await control({ op: "complete", turnId: "rust-turn" });
  await page.waitForFunction(() => document.querySelector('[data-transcript-item-id="rust-item"] .scb-block')?.getAttribute("data-frontier") === null);
  assert.equal(await codeFor("rust-item").locator("[data-code-token]").count(), 0); assert.equal(await codeFor("rust-item").getAttribute("data-highlight-source"), "plain");
  // Overlong line: the stream ends and the settled path keeps it plain.
  const longLine = 'const LONG_STREAM = "' + "x".repeat(1200) + '";';
  await control({ op: "start", turnId: "long-turn" });
  await control({ op: "item", turnId: "long-turn", item: item("long-item", "```js\nconst short = 1;"), completed: false });
  await waitStreamTokens("long-item", "const short = 1;");
  await control({ op: "delta", turnId: "long-turn", itemId: "long-item", delta: "\n" + longLine });
  await waitText("long-item", "const short = 1;\n" + longLine);
  await page.waitForFunction(() => [...document.querySelectorAll('[data-transcript-item-id="long-item"] .scb-code')].at(-1)?.dataset.highlightSource === "plain");
  await control({ op: "item", turnId: "long-turn", item: item("long-item", "```js\nconst short = 1;\n" + longLine + "\n```") });
  await control({ op: "complete", turnId: "long-turn" });
  await page.waitForFunction(() => document.querySelector('[data-transcript-item-id="long-item"] .scb-block')?.getAttribute("data-frontier") === null);
  await page.waitForTimeout(300);
  assert.equal(await codeFor("long-item").locator("[data-code-token]").count(), 0); assert.equal(await codeFor("long-item").textContent(), "const short = 1;\n" + longLine);
  // Held stream worker reply beyond the 4000ms deadline: the stream fails,
  // later deltas still render plain, and completion uses the settled Code palette.
  await page.evaluate(() => __streamObserver.hold("HELD_STREAM"));
  await control({ op: "start", turnId: "held-turn" });
  await control({ op: "item", turnId: "held-turn", item: item("held-item", '```js\nconst HELD_STREAM = "wait";'), completed: false });
  await waitText("held-item", 'const HELD_STREAM = "wait";');
  await page.waitForFunction(() => __streamObserver.heldCount() > 0);
  metrics.heldStream=await snapshot();assert.equal(metrics.heldStream.heldStreams.length,1);assert.equal(metrics.heldStream.heldStreams[0].label,"HELD_STREAM");
  const heldAt = Date.now();
  await control({ op: "delta", turnId: "held-turn", itemId: "held-item", delta: "\nconst later = 1;" });
  await waitText("held-item", 'const HELD_STREAM = "wait";\nconst later = 1;');
  assert.equal(await codeFor("held-item").locator("[data-code-token]").count(), 0, "plain text stays visible while the stream is held");
  await page.waitForFunction(() => __streamObserver.snapshot().stream.terminated >= 1, null, { timeout: 6000 });
  metrics.heldDeadlineMs = Date.now() - heldAt;
  assert.ok(metrics.heldDeadlineMs >= 3000 && metrics.heldDeadlineMs < 6000, `deadline observed after ${metrics.heldDeadlineMs}ms`);
  await control({ op: "delta", turnId: "held-turn", itemId: "held-item", delta: "\nconst after = 2;" });
  await waitText("held-item", 'const HELD_STREAM = "wait";\nconst later = 1;\nconst after = 2;');
  assert.equal(await codeFor("held-item").getAttribute("data-highlight-source"), "plain");
  await page.evaluate(() => __streamObserver.release());
  await control({ op: "item", turnId: "held-turn", item: item("held-item", '```js\nconst HELD_STREAM = "wait";\nconst later = 1;\nconst after = 2;\n```') });
  await control({ op: "complete", turnId: "held-turn" });
  await page.waitForFunction(() => [...document.querySelectorAll('[data-transcript-item-id="held-item"] .scb-code')].at(-1)?.dataset.highlightSource === "settled");
  const heldColors = await tokenColors("held-item");
  assert.equal(colorOf(heldColors, "const"), "rgb(197, 98, 27)", "settled Code palette after a failed stream");
  // A fresh stream after worker death gets a new worker.
  await control({ op: "start", turnId: "after-death-turn" });
  await control({ op: "item", turnId: "after-death-turn", item: item("after-death-item", '```js\nconst AFTER_DEATH = "fresh";'), completed: false });
  await waitStreamTokens("after-death-item", 'const AFTER_DEATH = "fresh";');
  const streamWorkers = targets.filter((target) => target.url.includes("highlight-stream-worker-"));
  assert.ok(streamWorkers.length >= 2 && streamWorkers.some((target) => target.closed), "a new stream worker replaced the terminated one");
  await control({ op: "item", turnId: "after-death-turn", item: item("after-death-item", '```js\nconst AFTER_DEATH = "fresh";\n```') });
  await control({ op: "complete", turnId: "after-death-turn" });
  await page.waitForFunction(() => document.querySelector('[data-transcript-item-id="after-death-item"] .scb-block')?.getAttribute("data-frontier") === null);
  metrics.fallbacks = { heldColors, streamWorkers: streamWorkers.map(({ url, closed }) => ({ url, closed })) };
  checks.push("Unknown language never streams; an overlong line ends the stream to plain; a stream held past the 4000ms deadline terminates the worker, later deltas stay plain, completion uses the settled Code palette (const 197,98,27) and the next stream gets a fresh worker");

  enterPhase("stream-concurrency");
  await control({ op: "start", turnId: "multi-turn" });
  for (let index = 1; index <= 5; index += 1)
    await control({ op: "item", turnId: "multi-turn", item: item(`multi-${index}`, `\`\`\`js\nconst MULTI_${index} = ${index};`), completed: false });
  for (let index = 1; index <= 4; index += 1) await waitStreamTokens(`multi-${index}`, `const MULTI_${index} = ${index};`);
  await waitText("multi-5", "const MULTI_5 = 5;");
  await page.waitForTimeout(300);
  assert.equal(await codeFor("multi-5").getAttribute("data-highlight-source"), "plain", "the fifth concurrent frontier stays plain");
  for (let index = 1; index <= 4; index += 1) assert.equal(await codeFor(`multi-${index}`).getAttribute("data-highlight-source"), "stream");
  assert.equal(await codeFor("seed-a").getAttribute("data-highlight-source"), "settled", "earlier settled blocks keep their tokens");
  for (let index = 1; index <= 5; index += 1) await control({ op: "item", turnId: "multi-turn", item: item(`multi-${index}`, `\`\`\`js\nconst MULTI_${index} = ${index};\n\`\`\``) });
  await control({ op: "complete", turnId: "multi-turn" });
  await page.waitForFunction(() => document.querySelector('[data-transcript-item-id="multi-5"] .scb-block')?.getAttribute("data-frontier") === null);
  await codeFor("multi-5").locator("[data-code-token]").first().waitFor({ state: "attached" });
  assert.equal(await codeFor("multi-5").getAttribute("data-highlight-source"), "settled");
  checks.push("More than four concurrent frontier streams leave the extras plain (settled on completion) without affecting the first four or earlier settled blocks");

  enterPhase("stream-reopen");
  await open(B, "seed-b");
  assert.equal(await nodeFor("stream-item").count(), 0);
  await open(A, "seed-a");
  await codeFor("stream-item").locator("[data-code-token]").first().waitFor({ state: "attached" });
  assert.equal(await codeFor("stream-item").getAttribute("data-highlight-source"), "settled", "a remounted completed fence uses the settled Code palette");
  const reopened = await tokenColors("stream-item");
  assert.equal(colorOf(reopened, "let"), "rgb(197, 98, 27)");
  metrics.reopened = reopened;
  await screenshot("verified.png");
  metrics.worker = await snapshot();
  assert.deepEqual(rendererErrors.filter((entry) => entry.phase !== "sprite-chunk-unavailable"), []);
  checks.push("Reopening the session remounts the fence with the settled Code palette (official reopened behavior); no renderer errors");
} catch (error) {
  failure = error;
  metrics.failureObserver=await snapshot().catch(reason=>String(reason));
  metrics.visibility=await page?.evaluate(()=>({hidden:document.hidden,state:document.visibilityState})).catch(reason=>String(reason));
  await screenshot("failure.png");
  metrics.failureDom = await page?.evaluate(() => [...document.querySelectorAll(".scb-block")].slice(-3).map((block) => ({
    item: block.closest("[data-transcript-item-id]")?.dataset.transcriptItemId, frontier: block.dataset.frontier ?? null,
    source: block.querySelector(".scb-code")?.dataset.highlightSource, tokens: block.querySelectorAll("[data-code-token]").length,
    text: block.querySelector(".scb-code")?.textContent.slice(0, 80) }))).catch((reason) => String(reason));
} finally {
  if (app && clipboardSaved) {
    try {
      await app.evaluate(async ({ clipboard }) => {
        const saved = globalThis.streamClipboardBackup;
        if (!saved) throw new Error("Clipboard backup unavailable");
        if (saved.kind === "items") { if (saved.items.length) await clipboard.write(saved.items); else await clipboard.clear(); }
        else if (saved.empty) await clipboard.clear(); else await clipboard.writeText(saved.data.text);
        delete globalThis.streamClipboardBackup;
      });
      clipboardRestored = true;
    } catch (error) { failure ||= error; }
  }
  await app?.close().catch((error) => { failure ||= error; });
  if (build) await verifySource().catch((error) => { failure ||= error; });
  try {
    await fs.copyFile(path.join(profile, "highlight-events.jsonl"), path.join(directory, "protocol-events.jsonl"));
  } catch (error) { if (error.code !== "ENOENT") failure ||= error; }
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch((error) => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "stream-highlight-ui", passed: !failure, startedAt, at: new Date().toISOString(), phase, phases, fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, clipboardSaved, clipboardRestored, rendererErrors,
    workerTargets: targets.map(({ url, createdAt, closed, closedAt }) => ({ url, createdAt, closed, closedAt })),
    limitation: "Local adaptation acceptance with an isolated protocol fixture; not same-state official Computer Use and not complete 1:1 highlighting.",
    ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "stream-highlight-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, directory, checks: checks.length, error: report.error }, null, 2));
}
if (failure) throw failure;

// Test-only init script: proxies both real module workers by name to record
// traffic and optionally hold stream pushes. No fake tokens or DOM are produced.
function installStreamObserver() {
  const NativeWorker = window.Worker;
  const state = { settled: { requests: [] }, stream: { opens: [], pushes: [], batches: 0, terminated: 0 }, holds: [], heldStreams: [], held: [] };
  class ObservedWorker extends EventTarget {
    constructor(url, options = {}) {
      super();
      const kind = options.name === "code-fence-highlight" ? "settled" : options.name === "code-fence-stream-highlight" ? "stream" : null;
      if (!kind) return new NativeWorker(url, options);
      const native = new NativeWorker(url, options);
      this.native = native; this.kind = kind;
      native.addEventListener("message", (event) => { if (kind === "stream" && event.data?.kind === "batch") state.stream.batches += 1; this.deliver(event.data); });
      native.addEventListener("error", (event) => { event.preventDefault(); const forwarded = new ErrorEvent("error", { message: event.message, cancelable: true }); this.dispatchEvent(forwarded); this.onerror?.(forwarded); });
      native.addEventListener("messageerror", () => this.dispatchEvent(new Event("messageerror")));
    }
    postMessage(data, transfer) {
      if (this.kind === "settled") state.settled.requests.push({ id: data?.id, text: data?.input?.text ?? "", language: data?.input?.language });
      else if (data?.kind === "open") {
        state.stream.opens.push({ streamId: data.streamId, language: data.language });
        // Pacing can split HELD_STREAM across two pushes. Arm the next actual
        // stream ID before its first request instead of matching one text chunk.
        if(state.holds.length)state.heldStreams.push({streamId:data.streamId,label:state.holds.shift()});
      }
      else if (data?.kind === "push") {
        state.stream.pushes.push({ streamId: data.streamId, seq: data.seq, text: data.text });
        if (state.heldStreams.some(entry=>entry.streamId===data.streamId)) { state.held.push({ owner: this, data, transfer }); return; }
      }
      this.native.postMessage(data, transfer);
    }
    deliver(data) { const event = new MessageEvent("message", { data }); this.dispatchEvent(event); this.onmessage?.(event); }
    terminate() { if (this.kind === "stream") state.stream.terminated += 1; this.native.terminate(); }
  }
  window.Worker = ObservedWorker;
  window.__streamObserver = {
    hold(needle) { state.holds.push(needle); },
    heldCount() { return state.held.length; },
    release() { state.holds.length = 0; state.heldStreams.length=0; state.held.length = 0; },
    reset() { state.settled.requests.length = 0; state.stream.opens.length = 0; state.stream.pushes.length = 0; state.stream.batches = 0; },
    snapshot() { return structuredClone({ settled: state.settled, stream: state.stream, held: state.held.length,heldStreams:state.heldStreams }); },
  };
}
