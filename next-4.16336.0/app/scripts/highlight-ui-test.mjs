import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Run serially after a fresh integration build, or set TEST_APP_PATH for the actual installed app.
// No app fixture hooks are required. The isolated server emits real RPC events.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidenceRoot = process.env.HIGHLIGHT_EVIDENCE_DIR || path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidenceRoot, { recursive: true });
const mode = process.env.TEST_APP_PATH ? "packaged" : "local-built";
const evidence = await fs.mkdtemp(path.join(evidenceRoot, `highlight-${mode}-`));
const profile = await fs.mkdtemp(path.join(evidence, "profile-"));
const workspace = path.join(profile, "workspace"); await fs.mkdir(workspace);
const appPath = process.env.TEST_APP_PATH ? path.resolve(process.env.TEST_APP_PATH) : null;
const executablePath = appPath ? path.join(appPath, "Contents/MacOS/OpenClaude Desktop")
  : process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const buildFile = process.env.TEST_EXPECT_BUILD || path.join(root, "dist/build-info.json");
const expected = JSON.parse(await fs.readFile(buildFile, "utf8"));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sourceRoot = process.env.TEST_SOURCE_ROOT || root;
const requiredSources = ["src/highlight-model.mjs", "src/highlight-worker.mjs", "src/highlight-tokenizer.mjs", "src/highlight-engine.mjs",
  "src/highlight-service.mjs", "src/use-settled-highlight.mjs", "src/use-stream-highlight.mjs", "src/highlight-stream-worker.mjs",
  "src/source-code-block.jsx", "src/source-session.jsx", "src/highlight-languages.mjs", "src/highlight-grammar-loaders.mjs", "package-lock.json", "vite.config.js"];
let testSources;
async function verifyBuildAndHarness() {
  for (const name of requiredSources) assert.ok(expected.sources?.some((source) => source.path === name),
    `Build is not the integrated highlighter: missing manifest entry ${name}`);
  assert.equal(digest(JSON.stringify(expected.sources)), expected.sourceSha256);
  const current = JSON.parse(await fs.readFile(buildFile, "utf8"));
  assert.equal(current.sourceSha256, expected.sourceSha256, "Build changed during test");
  assert.equal(current.builtAt, expected.builtAt, "Build was replaced during test");
  assert.equal(JSON.parse(await fs.readFile(path.join(sourceRoot, "package.json"), "utf8")).version, expected.version);
  for (const source of expected.sources) assert.equal(digest(await fs.readFile(path.join(sourceRoot, source.path))), source.sha256, `Stale build/source: ${source.path}`);
  const hashes = Object.fromEntries(await Promise.all(["scripts/highlight-ui-test.mjs", "tests/fixtures/highlight-server.cjs"].map(async (file) => [file, digest(await fs.readFile(path.join(root, file)))])));
  if (testSources) assert.deepEqual(hashes, testSources, "GUI script or protocol fixture changed during test");
  else testSources = hashes;
}

const A = "highlight-A", B = "highlight-B", CONTROL = "highlight-control";
const now = Math.floor(Date.now() / 1000);
const samples = [
  { id: "js", language: "js", text: '// JS_COMMENT\nconst value = "JS_STRING";\nfunction greet() { return 42; }', needle: "const", light: "rgb(197, 98, 27)", dark: "rgb(204, 123, 244)" },
  { id: "ts", language: "ts", text: '// TS_COMMENT\nconst value: string = "TS_STRING";', needle: "const", light: "rgb(197, 98, 27)", dark: "rgb(204, 123, 244)" },
  { id: "json", language: "json", text: '{"answer":42,"message":"JSON_STRING"}', needle: "42", light: "rgb(205, 32, 84)", dark: "rgb(94, 237, 237)" },
  { id: "python", language: "python", text: '# PY_COMMENT\ndef greet(name):\n    return "PY_STRING"', needle: "def", light: "rgb(197, 98, 27)", dark: "rgb(204, 123, 244)" },
  { id: "bash", language: "bash", text: '# BASH_COMMENT\necho "BASH_STRING"', needle: "BASH_COMMENT", light: "rgb(153, 153, 153)", dark: "rgb(129, 136, 152)" },
];
const fence = (text, language = "js") => `\`\`\`${language}\n${text}\n\`\`\``;
const item = (id, text) => ({ id, type: "agentMessage", text });
const unknown = 'UNKNOWN_LANGUAGE_BODY <img src=x onerror="window.HIGHLIGHT_XSS=true">';
const overlong = 'const LONG_LIMIT = "' + "x".repeat(1200) + '";';
const whitespace = '\tconst COPY_WHITESPACE = "KEEP";  \n\n';
const seedItems = [
  ...samples.map((sample) => item(`highlight-${sample.id}`, fence(sample.text, sample.language))),
  // F06: every bundled grammar is now eligible (rust included), so the unknown fence uses a label outside the table.
  item("highlight-unknown", fence(unknown, "notalang")), item("highlight-long", fence(overlong)),
  item("highlight-whitespace", fence(whitespace)),
];
const thread = (id, name, items = []) => ({ id, name, cwd: workspace, createdAt: now, updatedAt: now,
  archived: false, turns: items.length ? [{ id: `${id}-seed`, status: "completed", items }] : [] });
await fs.writeFile(path.join(profile, "highlight-fixture.marker"), "isolated-highlight-test\n");
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({ cwd: workspace, theme: "light", mode: "code", model: "highlight-fixture", threadIds: [A, B], sidebarWidth: 288 }));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: {
  [A]: thread(A, "Highlight A", seedItems), [B]: thread(B, "Highlight B", [item("highlight-B-only", "OTHER_SESSION_VISIBLE")]),
  [CONTROL]: thread(CONTROL, "Isolated highlight controls"),
} }));
const binary = path.join(root, "tests/fixtures/highlight-server.cjs"); await fs.chmod(binary, 0o755);
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: binary };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const checks = [], metrics = {}, pageErrors = [], failedRequests = [], targets = [], screenshots = [], phases = [], cleanupErrors = [];
let app, page, failure, runtime, asarHash, clipboardSaved = false, clipboardRestored = false, profileRemoved = false,
  protocolEvents = null, phase = "launch", watchdog, watchdogTriggered = false, emergencyCleanup = null;
function enterPhase(name) {
  phase = name; const entry = { phase, at: new Date().toISOString() }; phases.push(entry);
  console.log(`HIGHLIGHT ${mode} ${entry.at} ${phase}`);
}
async function within(promise, label, milliseconds) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} exceeded ${milliseconds}ms`)), milliseconds); })]); }
  finally { clearTimeout(timer); }
}
async function waitUntil(predicate, label, milliseconds = 3000) {
  const deadline = Date.now() + milliseconds;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`${label} exceeded ${milliseconds}ms`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}
async function observeParsedWorkerModules(workerUrl, evidence) {
  // This endpoint belongs to the fresh profile launched by this test. Only
  // observation commands are sent; no pause, evaluation or source mutation.
  const [port, endpoint] = (await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).trim().split("\n");
  assert.ok(/^\d+$/.test(port) && Number(port) > 0 && Number(port) <= 65535, "Invalid isolated DevTools port");
  assert.ok(/^\/devtools\/browser\/[a-z\d-]+$/i.test(endpoint), "Invalid isolated browser endpoint");
  const socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
  const pending = new Map();
  let nextId = 1, sessionId, debuggerEnabled = false;
  evidence.observation = "Actual CDP Debugger.scriptParsed events replayed by Debugger.enable in the already-running worker; parsed modules, not network requests";
  evidence.scripts = [];
  const rejectPending = (error) => {
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(error); }
    pending.clear();
  };
  socket.addEventListener("close", () => { evidence.socketClosed = true; rejectPending(new Error("Worker observation socket closed")); });
  socket.addEventListener("error", () => rejectPending(new Error("Worker observation socket error")));
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined && pending.has(message.id)) {
      const entry = pending.get(message.id); clearTimeout(entry.timer); pending.delete(message.id);
      if (message.error) entry.reject(new Error(`CDP ${entry.method}: ${JSON.stringify(message.error)}`));
      else entry.resolve(message.result);
    }
    if (message.sessionId === sessionId && message.method === "Debugger.scriptParsed") {
      const { scriptId, url, hash, isModule, sourceMapURL, startLine, endLine } = message.params;
      evidence.scripts.push({ scriptId, url, hash, isModule, sourceMapURL, startLine, endLine });
    }
  });
  const call = (method, params = {}, owner) => new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP observation ${method} exceeded 3000ms`)); }, 3000);
    pending.set(id, { resolve, reject, timer, method });
    try { socket.send(JSON.stringify({ id, method, params, ...(owner ? { sessionId: owner } : {}) })); }
    catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
  });
  try {
    await within(new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error("Could not open isolated browser observation socket")), { once: true });
    }), "Connect isolated browser observation socket", 3000);
    const { targetInfos } = await call("Target.getTargets");
    const matches = targetInfos.filter((target) => target.type === "worker" && target.url === workerUrl);
    assert.equal(matches.length, 1, "CDP must find exactly the same live worker reported by Playwright");
    evidence.target = { targetId: matches[0].targetId, type: matches[0].type, url: matches[0].url };
    ({ sessionId } = await call("Target.attachToTarget", { targetId: matches[0].targetId, flatten: true }));
    await call("Debugger.enable", {}, sessionId); debuggerEnabled = true;
    const required = ["highlight-worker-", "javascript-", "typescript-", "json-", "python-", "shellscript-"];
    await waitUntil(() => required.every((prefix) => evidence.scripts.some((entry) => {
      try { return path.basename(new URL(entry.url).pathname).startsWith(prefix); } catch { return false; }
    })), "Replay actual worker entry and five parsed grammar modules", 2500);
  } catch (error) {
    evidence.error = error.message;
    throw error;
  } finally {
    const errors = [];
    if (socket.readyState === WebSocket.OPEN && sessionId) {
      if (debuggerEnabled) {
        try { await call("Debugger.disable", {}, sessionId); evidence.debuggerDisabled = true; }
        catch (error) { errors.push(error); }
      }
      try { await call("Target.detachFromTarget", { sessionId }); evidence.detached = true; }
      catch (error) { errors.push(error); }
    }
    try { socket.close(); await waitUntil(() => evidence.socketClosed, "Close worker observation socket", 1500); }
    catch (error) { errors.push(error); }
    rejectPending(new Error("Worker observation complete"));
    evidence.cleanupErrors = errors.map((error) => error.message);
    if (errors.length && !evidence.error) throw new AggregateError(errors, "Could not clean up worker observation");
  }
}
async function restoreClipboardInMain(destroyWindow = false) {
  if (!app) return;
  const result = await within(app.evaluate(async ({ app, clipboard, BrowserWindow }, args) => {
    if (app.getPath("userData") !== args.profile) throw new Error("Refusing cleanup of a different profile");
    const saved = globalThis.highlightClipboardBackup;
    if (saved) {
      if (saved.kind === "items") { if (saved.items.length) await clipboard.write(saved.items); else await clipboard.clear(); }
      else if (saved.empty) await clipboard.clear(); else if (saved.kind === "legacy") await clipboard.write(saved.data); else await clipboard.writeText(saved.data.text);
      globalThis.highlightClipboardRestored = true;
      delete globalThis.highlightClipboardBackup;
    }
    if (args.requireBackup && !globalThis.highlightClipboardRestored) throw new Error("Clipboard backup missing");
    let destroyScheduled = false;
    if (args.destroyWindow) {
      const window = BrowserWindow.fromId(args.windowId);
      if (window && !window.isDestroyed()) {
        // Return the independent main-process acknowledgement before destruction
        // triggers the app's normal quit/owned-Codex cleanup sequence.
        setTimeout(() => { if (!window.isDestroyed()) window.destroy(); }, 50);
        destroyScheduled = true;
      }
    }
    return { restored: Boolean(globalThis.highlightClipboardRestored), destroyScheduled };
  }, { profile, windowId: runtime?.windowId, requireBackup: clipboardSaved, destroyWindow }), "Independent main cleanup", 5000);
  clipboardRestored ||= result.restored;
  return result;
}
const nodeFor = (id) => page.locator(`[data-transcript-item-id="${id}"]`);
const blockFor = (id) => nodeFor(id).locator(".scb-block").last();
const codeFor = (id) => blockFor(id).locator(".scb-code");
async function rpc(method, params) { return page.evaluate(({ method, params }) => window.desktop.call("rpc", { method, params }), { method, params }); }
async function control(command) { return rpc("turn/start", { threadId: CONTROL, input: [{ type: "text", text: "HIGHLIGHT_TEST:" + JSON.stringify({ threadId: A, ...command }) }] }); }
async function completed(id, text, language = "js") {
  await control({ op: "start", turnId: `${id}-turn` });
  await control({ op: "item", turnId: `${id}-turn`, item: item(id, fence(text, language)) });
  await control({ op: "complete", turnId: `${id}-turn` });
  await codeFor(id).waitFor();
}
async function open(id) {
  await page.locator(`[data-source-session-id="${id}"] .source-session-open`).click();
  await page.locator(".loading-state").waitFor({ state: "detached" });
  await nodeFor(id === A ? "highlight-js" : "highlight-B-only").waitFor();
}
async function tokens(id) { await codeFor(id).locator("[data-code-token]").first().waitFor({ state: "attached" }); }
async function rule(text, mode) { await page.evaluate(({ text, mode }) => __highlightObserver.addRule(text, mode), { text, mode }); }
async function held(text) { await page.waitForFunction((text) => __highlightObserver.heldFor(text) > 0, text); }
async function snapshot() { return page.evaluate(() => __highlightObserver.snapshot()); }
async function screenshot(name) {
  const file = path.join(evidence, name);
  await within(page.screenshot({ path: file, timeout: 3000 }), "Evidence screenshot", 3500); screenshots.push(file);
}
async function clipboardCopy(id, text) {
  await blockFor(id).getByRole("button", { name: /^(Copy code|Copied)$/, exact: true }).click();
  await blockFor(id).getByRole("button", { name: "Copied", exact: true }).waitFor();
  assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), text);
}
try {
  enterPhase("launch");
  await verifyBuildAndHarness();
  app = await electron.launch({ executablePath, args: appPath ? [] : [root], env });
  runtime = await app.evaluate(({ app, BrowserWindow }) => ({ path: app.getAppPath(), userData: app.getPath("userData"), version: app.getVersion(), windowId: BrowserWindow.getAllWindows()[0].id, electron: process.versions.electron,
    chrome: process.versions.chrome, preferences: BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences() }));
  assert.equal(runtime.version, expected.version);
  assert.equal(runtime.userData, profile, "Debugger observation must belong to this isolated profile");
  if (appPath) { assert.equal(runtime.path, path.join(appPath, "Contents/Resources/app.asar")); asarHash = digest(await fs.readFile(runtime.path)); }
  assert.equal(runtime.preferences.nodeIntegration, false); assert.equal(runtime.preferences.contextIsolation, true); assert.equal(runtime.preferences.sandbox, true);
  assert.notEqual(runtime.preferences.webSecurity, false);
  page = await app.firstWindow(); page.setDefaultTimeout(12_000);
  page.on("pageerror", (error) => pageErrors.push({ phase, message: error.message }));
  page.on("requestfailed", (request) => failedRequests.push({ phase, url: request.url(), error: request.failure()?.errorText }));
  page.on("worker", (worker) => {
    const target = { worker, url: worker.url(), createdAtEpochMs: Date.now(), closed: false, closedAtEpochMs: null }; targets.push(target);
    worker.on("close", () => { target.closed = true; target.closedAtEpochMs = Date.now(); });
  });
  await app.evaluate(({ BrowserWindow }) => {
    globalThis.highlightNetwork = { seen: [], blocked: [] };
    BrowserWindow.getAllWindows()[0].webContents.session.webRequest.onBeforeRequest((details, callback) => {
      const record = { url: details.url, type: details.resourceType };
      globalThis.highlightNetwork.seen.push(record);
      const blocked = /^(https?|wss?):/.test(details.url);
      if (blocked) globalThis.highlightNetwork.blocked.push(record);
      callback({ cancel: blocked });
    });
  });
  await page.context().setOffline(true);
  await page.context().addInitScript(installWorkerObserver, { workerName: "code-fence-highlight" });
  await page.reload();
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Highlight fixture" }).waitFor();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768));
  const actualBuild = await page.evaluate(async () => (await fetch("./build-info.json")).json());
  assert.equal(actualBuild.sourceSha256, expected.sourceSha256); assert.equal(actualBuild.builtAt, expected.builtAt);
  assert.ok(page.url().startsWith("file:"), "Acceptance must load built files, never Vite dev server");
  metrics.csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  const directives = Object.fromEntries(metrics.csp.split(";").map((part) => part.trim().split(/\s+/)).filter(([name]) => name).map(([name, ...values]) => [name, values]));
  assert.deepEqual(directives["script-src"], ["'self'"]);
  assert.deepEqual(directives["connect-src"], ["'self'"]);
  const workerPolicy = directives["worker-src"] ?? directives["child-src"] ?? directives["script-src"] ?? directives["default-src"];
  assert.deepEqual(workerPolicy, ["'self'"], "Do not add blob:, data:, unsafe-eval or remote worker allowances to make this test pass");
  checks.push("Verified runtime/build identity, sandboxed renderer, strict self-only script/worker/connect policy and offline file URL load");

  metrics.clipboardApi = await app.evaluate(async ({ clipboard, ClipboardItem }) => {
    if (typeof clipboard.read === "function" && typeof ClipboardItem === "function") {
      const items = await clipboard.read();
      globalThis.highlightClipboardBackup = { kind: "items", items: await Promise.all(items.map(async (item) => new ClipboardItem(Object.fromEntries(await Promise.all(item.types.map(async (type) => [type, await item.getType(type)])))))) };
      return "ClipboardItem[]";
    }
    const data = { text: await clipboard.readText() };
    if (typeof clipboard.readHTML === "function") data.html = clipboard.readHTML();
    if (typeof clipboard.readRTF === "function") data.rtf = clipboard.readRTF();
    if (typeof clipboard.readImage === "function") { const image = clipboard.readImage(); if (!image.isEmpty()) data.image = image; }
    if (typeof clipboard.readBookmark === "function") { const bookmark = clipboard.readBookmark(); if (bookmark.title) data.bookmark = bookmark.title; }
    globalThis.highlightClipboardBackup = { kind: typeof clipboard.readHTML === "function" ? "legacy" : "text", data,
      empty: typeof clipboard.availableFormats === "function" && clipboard.availableFormats().length === 0 };
    return "legacy/text";
  });
  clipboardSaved = true;
  enterPhase("five-languages");
  await open(A); await rpc("thread/resume", { threadId: CONTROL });
  for (const sample of samples) {
    await tokens(`highlight-${sample.id}`);
    assert.equal(await codeFor(`highlight-${sample.id}`).textContent(), sample.text);
  }
  await tokens("highlight-whitespace"); // Drain every initial eligible job before counting theme requests.
  // Electron session.webRequest does not expose these worker module requests in
  // every Chromium build. Record execution evidence at its actual owners: the
  // live browser worker target for the entry, and that worker's scriptParsed
  // module events for the five dynamic imports. Keep the resource timeline even
  // when Chromium provides no entries. Later static hash reads are separate.
  const initialWorkerTargets = targets.filter((target) => !target.closed && target.url.includes("highlight-worker-"));
  assert.equal(initialWorkerTargets.length, 1, "Five initial grammars must use one live browser worker");
  const initialWorkerTarget = initialWorkerTargets[0];
  metrics.executionLoads = {
    entryObservation: "Playwright browser worker target URL",
    grammarObservation: "CDP Debugger.scriptParsed in the actual live worker after all five grammars produced tokens",
    resourceTimelineLimitation: "This Chromium/file-worker configuration can provide an empty resource timeline; it is recorded but is not used as proof of absence of requests",
    workerTargetUrl: initialWorkerTarget.url,
    workerTimeline: await within(initialWorkerTarget.worker.evaluate(() => ({
      location: self.location.href, timeOrigin: performance.timeOrigin, observedAt: performance.now(),
      resources: performance.getEntriesByType("resource").map((entry) => ({
        name: entry.name, entryType: entry.entryType, initiatorType: entry.initiatorType,
        startTime: entry.startTime, duration: entry.duration,
        transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize,
      })),
    })), "Read actual worker resource timeline", 3000),
  };
  assert.equal(metrics.executionLoads.workerTimeline.location, initialWorkerTarget.url);
  const assertBuiltAssetUrl = (url) => {
    const parsed = new URL(url);
    assert.equal(parsed.protocol, "file:", `Executed asset is not a local file: ${url}`);
    assert.ok(decodeURIComponent(parsed.pathname).startsWith(path.join(runtime.path, "dist/assets") + path.sep),
      `Executed asset must be under this runtime's dist/assets: ${url}`);
  };
  assertBuiltAssetUrl(initialWorkerTarget.url);
  assert.ok(path.basename(new URL(initialWorkerTarget.url).pathname).startsWith("highlight-worker-"));
  metrics.executionLoads.parsedModules = {};
  await observeParsedWorkerModules(initialWorkerTarget.url, metrics.executionLoads.parsedModules);
  for (const prefix of ["highlight-worker-", "javascript-", "typescript-", "json-", "python-", "shellscript-"]) {
    const matches = metrics.executionLoads.parsedModules.scripts.filter((entry) => {
      try { return path.basename(new URL(entry.url).pathname).startsWith(prefix); } catch { return false; }
    });
    assert.ok(matches.length, `No actual worker Debugger.scriptParsed entry for ${prefix}`);
    for (const entry of matches) assertBuiltAssetUrl(entry.url);
  }
  const paints = async () => page.evaluate((samples) => samples.map((sample) => {
    const code = document.querySelector(`[data-transcript-item-id="highlight-${sample.id}"] .scb-code`);
    const token = [...code.querySelectorAll("[data-code-token]")].find((span) => span.textContent.includes(sample.needle));
    if (!token) throw new Error(`No actual token for ${sample.id}/${sample.needle}`);
    const style = getComputedStyle(token);
    return { id: sample.id, color: style.color, fontStyle: style.fontStyle };
  }), samples);
  metrics.light = await paints();
  for (let index = 0; index < samples.length; index++) assert.equal(metrics.light[index].color, samples[index].light);
  assert.equal(metrics.light.at(-1).fontStyle, "italic");
  const beforeTheme = (await snapshot()).records.reduce((sum, record) => sum + record.requests.length, 0);
  await page.evaluate(() => { globalThis.highlightTokenNodes = [...document.querySelectorAll("[data-code-token]")]; document.documentElement.dataset.mode = "dark"; });
  metrics.dark = await paints();
  for (let index = 0; index < samples.length; index++) assert.equal(metrics.dark[index].color, samples[index].dark);
  assert.equal(metrics.dark.at(-1).fontStyle, "normal");
  assert.ok(await page.evaluate(() => highlightTokenNodes.every((node) => node.isConnected)));
  assert.equal((await snapshot()).records.reduce((sum, record) => sum + record.requests.length, 0), beforeTheme);
  await screenshot("highlight-five-dark.png");
  await page.evaluate(() => { document.documentElement.dataset.mode = "light"; });
  await screenshot("highlight-five-light.png");
  assert.equal(await codeFor("highlight-unknown").textContent(), unknown); assert.equal(await codeFor("highlight-unknown").locator("[data-code-token]").count(), 0);
  assert.equal(await codeFor("highlight-long").textContent(), overlong); assert.equal(await codeFor("highlight-long").locator("[data-code-token]").count(), 0);
  assert.equal(await nodeFor("highlight-unknown").locator("img,script").count(), 0);
  assert.equal(await page.evaluate(() => !!window.HIGHLIGHT_XSS), false);
  assert.ok(!(await snapshot()).records.flatMap((record) => record.requests).some((request) => request.text.includes("UNKNOWN_LANGUAGE_BODY") || request.text.includes("LONG_LIMIT")));
  await clipboardCopy("highlight-whitespace", whitespace);
  checks.push("Five actual grammars have source palette colors in Light/Dark; theme change preserves token nodes and sends no worker request; unknown/overlong text stays escaped plain and original Copy bytes survive");

  enterPhase("streaming");
  // 0.2.14 stream-highlight: official oi mounts the incremental renderer (hr/_r,
  // code-block-current.js:1555-1662) for the frontier fence, so a supported
  // language now shows stream-palette tokens while growing, and a successful
  // stream is retained after completion (Le, addendum-027) instead of being
  // re-highlighted by the settled worker. The settled worker must still never
  // receive the frontier text. Detailed stream assertions live in
  // scripts/stream-highlight-ui-test.mjs.
  const priorText = 'const prior = "PRIOR_READY";';
  let streamBody = '// STREAM_COMMENT\nconst stream = "STREAM_A";';
  let markdown = `${fence(priorText)}\n\n\`\`\`js\n${streamBody}`;
  await control({ op: "start", turnId: "stream-turn" });
  await control({ op: "item", turnId: "stream-turn", item: item("highlight-stream", markdown), completed: false });
  await nodeFor("highlight-stream").locator(".scb-block").first().locator("[data-code-token]").first().waitFor({ state: "attached" });
  const stream = blockFor("highlight-stream");
  // Paced reveal (source-session.jsx RichSourceMarkdown useResponsePacing) can tokenize the prior fence before the open
  // fence is revealed; under parallel suite load .last() still resolved to the prior block (data-frontier null). Wait for
  // the frontier block to be rendered, then assert as before.
  await page.waitForFunction(() => [...document.querySelectorAll('[data-transcript-item-id="highlight-stream"] .scb-block')].length >= 2);
  assert.equal(await stream.getAttribute("data-frontier"), "true"); assert.equal(await stream.locator(".scb-copy").count(), 0);
  const streamTokens = async (text) => page.waitForFunction((text) => {
    const code = [...document.querySelectorAll('[data-transcript-item-id="highlight-stream"] .scb-code')].at(-1);
    return code?.dataset.highlightSource === "stream" && code.textContent === text
      && [...code.querySelectorAll("[data-code-token]")].map((span) => span.textContent).join("") === text;
  }, text);
  await streamTokens(streamBody);
  await codeFor("highlight-stream").evaluate((code) => { code.dataset.streamNode = "original"; });
  // HANDOFF 0.2.125: since 0.2.71 assistant text is paced (use-response-pacing.js; approval-current h5 -> markdown-current
  // Ml/Dl -> shared-16 Sb), so this item is revealed from "```js\nconst prior = " (work/claude-ui-sweep/0.2.125/
  // highlight-pacing-experiment.log): the prior fence is itself a frontier for one paced step. By the stream binding rule
  // (highlight-stream-binding.mjs:12-15, code-block-current.js:1489-1620, addendum-027) it then keeps its stream tokens if
  // their first render beat the fence closing, else the settled path owns it. Either way it is closed and tokenized
  // before the delta, and the later frontier must leave that code node, its source and its token nodes untouched.
  const priorCode = nodeFor("highlight-stream").locator(".scb-block").first().locator(".scb-code");
  await page.waitForFunction(() => { const code = document.querySelector('[data-transcript-item-id="highlight-stream"] .scb-block .scb-code');
    return code && !code.closest(".scb-block").dataset.frontier && ["stream", "settled"].includes(code.dataset.highlightSource) && code.querySelector("[data-code-token]"); });
  metrics.priorBlockSource = await priorCode.evaluate((code) => { code.dataset.priorNode = "original"; globalThis.highlightPriorTokenNodes = [...code.querySelectorAll("[data-code-token]")]; return code.dataset.highlightSource; });
  const delta = "\nconst count = 42;"; streamBody += delta; markdown += delta;
  await control({ op: "delta", turnId: "stream-turn", itemId: "highlight-stream", delta });
  await streamTokens(streamBody);
  assert.equal(await codeFor("highlight-stream").getAttribute("data-stream-node"), "original");
  assert.equal(await priorCode.getAttribute("data-highlight-source"), metrics.priorBlockSource, "prior closed block keeps its tokens' source");
  assert.equal(await priorCode.evaluate((code) => code.dataset.priorNode === "original" && code.textContent === 'const prior = "PRIOR_READY";'
    && [...code.querySelectorAll("[data-code-token]")].every((node, index) => node === globalThis.highlightPriorTokenNodes[index]) && code.querySelectorAll("[data-code-token]").length === globalThis.highlightPriorTokenNodes.length), true, "prior closed block's code and token nodes are untouched by the later frontier");
  assert.ok(!(await snapshot()).records.flatMap((record) => record.requests).some((request) => request.text.includes("STREAM_A")), "the settled worker never receives the frontier text");
  metrics.streamPalette = await codeFor("highlight-stream").evaluate((code) => [...code.querySelectorAll("[data-code-token]")].map((span) => ({ text: span.textContent, color: getComputedStyle(span).color })));
  assert.equal(metrics.streamPalette.find((token) => token.text === "const")?.color, "rgb(129, 0, 194)", "stream light keyword (hsl 280 100% 38%), not the settled Code orange");
  await stream.locator(".scb-code").evaluate((code) => { globalThis.highlightStreamTokenNodes = [...code.querySelectorAll("[data-code-token]")]; });
  markdown += "\n```";
  await control({ op: "item", turnId: "stream-turn", item: item("highlight-stream", markdown) });
  await control({ op: "complete", turnId: "stream-turn" });
  await page.waitForFunction(() => document.querySelector('[data-transcript-item-id="highlight-stream"] .scb-block:last-of-type')?.getAttribute("data-frontier") === null);
  await page.waitForTimeout(300);
  assert.equal(await stream.getAttribute("data-frontier"), null); assert.equal(await stream.locator(".scb-copy").count(), 1);
  assert.equal(await codeFor("highlight-stream").getAttribute("data-highlight-source"), "stream", "successful stream tokens are retained after completion");
  assert.equal(await codeFor("highlight-stream").textContent(), streamBody);
  assert.ok(!(await snapshot()).records.flatMap((record) => record.requests).some((request) => request.text.includes("STREAM_A")), "no settled job for the retained fence");
  await clipboardCopy("highlight-stream", streamBody);
  checks.push("Real item/turn events stream the frontier fence through the stream worker (stream palette, code node identity kept, prior settled block untouched); completion keeps Copy canonical and retains the stream tokens without a settled request");

  enterPhase("selection");
  const selectedText = 'const SELECT_HOLD = "selected text stays intact";';
  await rule("SELECT_HOLD", "hold-reply"); await completed("highlight-selection", selectedText); await held("SELECT_HOLD");
  metrics.selection = await codeFor("highlight-selection").evaluate((code) => {
    const range = document.createRange(); range.selectNodeContents(code);
    const selection = document.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    __highlightObserver.release("SELECT_HOLD");
    return selection.toString();
  });
  assert.equal(metrics.selection, selectedText);
  await page.waitForTimeout(100);
  assert.equal(await codeFor("highlight-selection").locator("[data-code-token]").count(), 0);
  assert.equal(await page.evaluate(() => document.getSelection().toString()), selectedText);
  await clipboardCopy("highlight-selection", selectedText);
  assert.equal(await page.evaluate(() => document.getSelection().toString()), selectedText, "Copy must preserve the active code selection");
  await page.evaluate(() => document.getSelection().removeAllRanges()); await tokens("highlight-selection");
  assert.equal(await blockFor("highlight-selection").getByRole("button", { name: "Copied", exact: true }).count(), 1, "Applying highlight must not reset Copy feedback");
  checks.push("Actual DOM selection blocks token commit after a real worker reply; clearing selection applies tokens and Copy remains canonical");

  enterPhase("session-race");
  await rule("STALE_OWNER", "hold-reply"); await completed("highlight-stale", 'const STALE_OWNER = "thread A";'); await held("STALE_OWNER");
  const staleOwner = (await snapshot()).records.find((record) => record.requests.some((request) => request.text.includes("STALE_OWNER"))).number;
  await open(B);
  assert.equal((await snapshot()).records.find((record) => record.number === staleOwner).terminated, true);
  await page.evaluate(() => __highlightObserver.release("STALE_OWNER"));
  // F10 (LOG.md F10; scroll-messages-current.js:56941-56953 x5): the feed hook prepends the sr-only
  // 'DeepSeek responded: …' h2 [data-feed-heading] to B's answer head row one frame after its rows mount
  // (use-transcript-feed-nav.js MutationObserver -> rAF), so the settled row textContent includes it and a raw
  // read only passed when it beat that frame. Wait for B's own settled heading (af summary, c2fb08a02-DWV0GyaQ.js N:
  // `_…_` emphasis is stripped) and compare the rendered message text without it.
  await page.waitForFunction(() => document.querySelector('[data-transcript-item-id="highlight-B-only"] > [data-feed-heading]')?.textContent === "DeepSeek responded: OTHERSESSIONVISIBLE");
  assert.equal(await nodeFor("highlight-stale").count(), 0);
  assert.equal(await nodeFor("highlight-B-only").evaluate((node) => { const copy = node.cloneNode(true); copy.querySelectorAll("[data-feed-heading]").forEach((heading) => heading.remove()); return copy.textContent; }), "OTHER_SESSION_VISIBLE");
  await page.evaluate(() => __highlightObserver.clearRules()); await open(A); await tokens("highlight-stale");
  checks.push("Switching A→B cancels the owned job; replay of its real late reply cannot alter B; A rehydrates and highlights correctly");

  enterPhase("timeout");
  const busyTarget = targets.filter((target) => !target.closed && target.url.includes("highlight-worker-")).at(-1);
  assert.ok(busyTarget, "Need the real browser module worker target");
  // Freeze only the test-owned actual browser worker. Independent main-process
  // cleanup provides a second exit path if this acceptance task stalls.
  watchdog = setTimeout(() => {
    watchdogTriggered = true;
    console.error(`HIGHLIGHT ${mode} emergency main-process cleanup after timeout fixture stalled`);
    emergencyCleanup = restoreClipboardInMain(true).catch((error) => { cleanupErrors.push(error.message); });
  }, 7000);
  // The CDP evaluation itself MUST be finite. A debugger-injected synchronous
  // infinite evaluate can wedge the protocol/renderer, making timeout evidence
  // inconclusive. Schedule the real block as an ordinary worker event-loop task.
  assert.equal(await within(busyTarget.worker.evaluate(() => {
    setTimeout(() => { self.postMessage({ fixture: "cpu-blocked" }); for (;;) {} }, 100);
    return "scheduled";
  }), "Schedule ordinary worker task", 3000), "scheduled");
  await within(page.waitForFunction(() => __highlightObserver.records.some((record) => record.cpuBlocked && !record.terminated), null, { timeout: 3000 }), "Observe blocked worker task", 3500);
  const timeoutStarted = Date.now();
  await completed("highlight-timeout", 'const TIMEOUT_BODY = "plain is complete";');
  await within(page.waitForFunction(() => __highlightObserver.records.some((record) => record.cpuBlocked && record.terminated), null, { timeout: 3500 }), "Production worker termination", 4000);
  // HANDOFF 0.2.125: Blink closes a worker terminated mid-task only after its fixed 2s forcible-termination delay. The bare
  // hidden Electron probe (work/claude-ui-sweep/0.2.125/probe-worker-terminate, no app code) measured terminate->target close
  // 2002.1-2003.9ms with termination observed 0.4-17.4ms after terminate(), and every native run since 0.2.7 recorded
  // 2001.5-2002.8ms; a 2000ms window opened only after observing termination therefore races that constant. Observe the
  // close with room, then bound it from the renderer's own terminate() time below.
  await waitUntil(() => busyTarget.closed, "Actual worker target close", 2500);
  clearTimeout(watchdog); watchdog = null;
  const timeoutRecord = (await snapshot()).records.find((record) => record.cpuBlocked && record.requests.some((request) => request.text.includes("TIMEOUT_BODY")));
  assert.ok(timeoutRecord, "The blocked worker must own the actual timeout request");
  const timeoutRequest = timeoutRecord.requests.find((request) => request.text.includes("TIMEOUT_BODY"));
  const requestToTerminateMs = timeoutRecord.terminatedAt - timeoutRequest.postedAt;
  metrics.timeout = {
    rpcToTargetClosedMs: busyTarget.closedAtEpochMs - timeoutStarted,
    requestToTerminateMs, expectedDeadlineMs: 1500,
    requestPostedAt: timeoutRequest.postedAt, terminateCalledAt: timeoutRecord.terminatedAt,
    rendererTimeOrigin: timeoutRecord.timeOrigin,
    targetCloseObservedAtEpochMs: busyTarget.closedAtEpochMs,
    terminateToTargetCloseObservedMs: busyTarget.closedAtEpochMs - (timeoutRecord.timeOrigin + timeoutRecord.terminatedAt),
    ordinaryWorkerTask: true, targetClosed: busyTarget.closed,
  };
  assert.ok(Number.isFinite(requestToTerminateMs) && requestToTerminateMs >= 1400 && requestToTerminateMs < 3500,
    `Expected the 1500ms production deadline (allowing scheduler delay), observed ${requestToTerminateMs}ms`);
  assert.ok(metrics.timeout.terminateToTargetCloseObservedMs < 2050, `Worker target closed ${metrics.timeout.terminateToTargetCloseObservedMs}ms after terminate()`);
  assert.equal(watchdogTriggered, false, "Fixture emergency cleanup triggered; timeout acceptance is inconclusive");
  assert.equal(busyTarget.closed, true); assert.equal(await codeFor("highlight-timeout").locator("[data-code-token]").count(), 0);
  await clipboardCopy("highlight-timeout", 'const TIMEOUT_BODY = "plain is complete";');
  await completed("highlight-recovery", 'const RECOVERY_READY = 42;'); await tokens("highlight-recovery");
  checks.push("Actual browser worker blocked in synchronous execution is terminated by the production deadline; complete plain text/Copy survive and a new worker recovers");

  enterPhase("worker-error");
  await rule("WORKER_ERROR_BODY", "hold-send"); await completed("highlight-error", 'const WORKER_ERROR_BODY = "keep";'); await held("WORKER_ERROR_BODY");
  const errorTarget = targets.filter((target) => !target.closed && target.url.includes("highlight-worker-")).at(-1);
  await within(errorTarget.worker.evaluate(() => {
    setTimeout(() => { throw new Error("HIGHLIGHT_FIXTURE_WORKER_FAILURE"); }, 100);
    return "scheduled";
  }), "Schedule worker error", 3000);
  await within(page.waitForFunction(() => __highlightObserver.records.some((record) => record.errors.some((error) => error.includes("HIGHLIGHT_FIXTURE_WORKER_FAILURE")) && record.terminated), null, { timeout: 3500 }), "Worker error cleanup", 4000);
  await waitUntil(() => errorTarget.closed, "Errored worker target close", 2000);
  assert.equal(await codeFor("highlight-error").locator("[data-code-token]").count(), 0);
  await clipboardCopy("highlight-error", 'const WORKER_ERROR_BODY = "keep";');
  await completed("highlight-after-error", 'const AFTER_ERROR = true;'); await tokens("highlight-after-error");
  checks.push("A real uncaught worker error settles an active request to plain text while leaving canonical Copy usable");

  enterPhase("layout");
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(800, 600));
  metrics.layout = await codeFor("highlight-js").evaluate((code) => {
    const pre = code.parentElement, block = pre.closest(".scb-block"), style = getComputedStyle(pre);
    return { font: style.fontSize, lineHeight: style.lineHeight, whiteSpace: style.whiteSpace, overflowWrap: style.overflowWrap,
      width: block.getBoundingClientRect().width, available: block.parentElement.getBoundingClientRect().width,
      scrollWidth: pre.scrollWidth, clientWidth: pre.clientWidth };
  });
  assert.equal(metrics.layout.font, "12px"); assert.equal(metrics.layout.lineHeight, "17px"); assert.equal(metrics.layout.whiteSpace, "pre-wrap"); assert.equal(metrics.layout.overflowWrap, "break-word");
  assert.ok(metrics.layout.width <= metrics.layout.available + 1); assert.ok(metrics.layout.scrollWidth <= metrics.layout.clientWidth + 1);
  await screenshot("highlight-narrow.png");
  metrics.network = await app.evaluate(() => globalThis.highlightNetwork);
  metrics.network.observation = "Electron session.webRequest onBeforeRequest; captures renderer requests and blocks remote attempts, but does not expose every worker module request";
  assert.deepEqual(metrics.network.blocked, [], "Main's observed request layer must contain no remote attempt");
  assert.deepEqual(failedRequests, []);
  assert.deepEqual(pageErrors.filter((entry) => !(entry.phase === "worker-error" && entry.message.includes("HIGHLIGHT_FIXTURE_WORKER_FAILURE"))), []);
  metrics.workerBeforeCsp = await snapshot();
  assert.equal(metrics.workerBeforeCsp.violations.length, 0, "Positive worker/grammar load must cause no CSP violation");
  checks.push("Actual offline worker target and CDP scriptParsed events prove its entry and five grammar modules were parsed from this runtime's dist/assets (inside ASAR when packaged); main interception saw no remote attempt in its observable request layer, and the document recorded no CSP violation");

  enterPhase("packaged-assets");
  metrics.bundle = await page.evaluate(async () => {
    const json = async (file) => {
      const response = await fetch(new URL(file, location.href));
      if (!response.ok) throw new Error(`Cannot read packaged ${file}: ${response.status}`);
      return response.json();
    };
    const hashFile = async (file) => {
      if (typeof file !== "string" || file.startsWith("/") || file.split("/").includes("..") || /^[a-z]+:/i.test(file)) throw new Error("Manifest asset path is not relative");
      const response = await fetch(new URL(file, location.href));
      if (!response.ok) throw new Error(`Cannot read packaged ${file}: ${response.status}`);
      const bytes = await response.arrayBuffer();
      const sha256 = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      return { file, bytes: bytes.byteLength, sha256 };
    };
    const graph = await json("./highlight-build.json");
    const notices = await json("./third-party/highlight/manifest.json");
    return { graph, notices,
      actualChunks: await Promise.all(graph.files.map((entry) => hashFile(entry.file))),
      actualNotices: await Promise.all(notices.entries.map((entry) => hashFile(`third-party/highlight/${entry.file}`))),
    };
  });
  // F06: all 235 bundled grammars of the original table (c5a058668) ship, each as its own lazy chunk.
  assert.equal(metrics.bundle.graph.languages.length, 235);
  const shippedGrammars = new Set(metrics.bundle.graph.grammars.map((name) => path.basename(name).replace(/\.mjs$/, "")));
  for (const id of metrics.bundle.graph.languages) assert.ok(shippedGrammars.has(id), `Missing grammar ${id}`);
  for (const id of ["javascript", "json", "python", "shellscript", "typescript", "tsx", "go", "rust", "yaml", "html", "diff", "dotenv"]) assert.ok(shippedGrammars.has(id));
  assert.ok(metrics.bundle.graph.files.some((entry) => path.basename(entry.file).startsWith("highlight-worker-")));
  assert.ok(!metrics.bundle.graph.modules.some((name) => /engine-oniguruma|\.wasm(?:$|\?)/.test(name)));
  for (const actual of metrics.bundle.actualChunks) {
    const recorded = metrics.bundle.graph.files.find((entry) => entry.file === actual.file);
    assert.equal(actual.bytes, recorded.bytes, `Packaged chunk size: ${actual.file}`);
    assert.equal(actual.sha256, recorded.sha256, `Packaged chunk hash: ${actual.file}`);
  }
  // 25 since settings-rest (0.2.14): @shikijs/themes 4.4.3 supplies the on-demand code theme catalog (official panes-diff-theme-current.js loader map).
  // 81 since 0.2.54 (HANDOFF 0.2.54/0.2.125): KaTeX/remark-math and their owner-resolved dependencies joined the same
  // build/highlight-notices/manifest.json that verify-build.mjs:54-59 checks byte-for-byte.
  assert.equal(metrics.bundle.notices.entries.length, 81);
  for (const actual of metrics.bundle.actualNotices) {
    const recorded = metrics.bundle.notices.entries.find((entry) => `third-party/highlight/${entry.file}` === actual.file);
    assert.equal(actual.sha256, recorded.sha256, `Packaged notice hash: ${actual.file}`);
  }
  assert.ok(metrics.bundle.notices.entries.some((entry) => entry.file === "selected-grammars-NOTICE.txt"));
  checks.push("Actual distributed worker/language chunks and all 81 notices match their embedded SHA256 manifests through renderer file reads");

  enterPhase("csp-negative-probe");
  await page.evaluate(async () => {
    const script = document.createElement("script"); script.textContent = "window.HIGHLIGHT_INLINE_EXECUTED=true"; document.body.append(script); script.remove();
    await fetch("https://highlight-probe.invalid/blocked").catch(() => {});
    const url = URL.createObjectURL(new Blob(["postMessage('blocked probe')"], { type: "text/javascript" }));
    try {
      const worker = new Worker(url, { name: "csp-negative-probe" });
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 500);
        worker.addEventListener("error", (event) => { event.preventDefault(); clearTimeout(timer); resolve(); }, { once: true });
      });
      worker.terminate();
    }
    catch {} finally { URL.revokeObjectURL(url); }
  });
  await page.waitForFunction(() => __highlightObserver.violations.some((violation) => violation.directive === "connect-src")
    && __highlightObserver.violations.some((violation) => violation.directive.startsWith("script-src"))
    && __highlightObserver.violations.some((violation) => violation.directive === "worker-src"));
  assert.equal(await page.evaluate(() => !!window.HIGHLIGHT_INLINE_EXECUTED), false);
  metrics.worker = await snapshot();
  checks.push("Negative probes confirm inline script, remote fetch and blob worker are blocked; no CSP weakening is required for real local module workers");

  enterPhase("reload-dispose");
  const previousTargets = targets.filter((target) => !target.closed);
  assert.ok(previousTargets.length, "Reload must actually have a live worker to destroy");
  await page.reload();
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Highlight fixture" }).waitFor();
  assert.ok(previousTargets.every((target) => target.closed), "Old renderer workers must close on pagehide/reload");
  checks.push("Reload destroys all previous real worker targets; no worker survives renderer ownership");
  if (appPath) assert.equal(digest(await fs.readFile(runtime.path)), asarHash, "Installed ASAR changed during acceptance");
  else assert.equal(JSON.parse(await fs.readFile(buildFile, "utf8")).sourceSha256, expected.sourceSha256, "Build changed during acceptance");
} catch (error) {
  failure = error;
  if (page) await screenshot("highlight-failure.png").catch(() => {});
} finally {
  if (watchdog) clearTimeout(watchdog);
  if (emergencyCleanup) await within(emergencyCleanup, "Emergency main cleanup completion", 5500).catch((error) => { cleanupErrors.push(error.message); failure ||= error; });
  if (app && clipboardSaved && !clipboardRestored) {
    try {
      await restoreClipboardInMain(Boolean(failure));
    } catch (error) { failure ||= error; }
  }
  if (app) {
    const child = app.process();
    try { await within(app.close(), "Owned Electron close", 8000); }
    catch (error) {
      failure ||= error; cleanupErrors.push(error.message);
      // Main cleanup is tried before any process signal, and can target only
      // this exact new profile/window. No global process matching or kill exists.
      if (child.exitCode === null && child.signalCode === null) await restoreClipboardInMain(true).catch((error) => cleanupErrors.push(error.message));
      try { await waitUntil(() => child.exitCode !== null || child.signalCode !== null, "Owned Electron exit", 2500); }
      catch {
        child.kill("SIGTERM");
        try { await waitUntil(() => child.exitCode !== null || child.signalCode !== null, "Owned Electron SIGTERM exit", 2500); }
        catch { child.kill("SIGKILL"); await waitUntil(() => child.exitCode !== null || child.signalCode !== null, "Owned Electron forced exit", 2500).catch((error) => cleanupErrors.push(error.message)); }
      }
    }
  }
  try { await verifyBuildAndHarness(); } catch (error) { failure ||= error; }
  try {
    const source = path.join(profile, "highlight-events.jsonl");
    try {
      await fs.copyFile(source, path.join(evidence, "protocol-events.jsonl"));
      protocolEvents = path.join(evidence, "protocol-events.jsonl");
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    await fs.rm(profile, { recursive: true, force: true });
    profileRemoved = true;
  } catch (error) { failure ||= error; }
  const report = { passed: !failure, mode, at: new Date().toISOString(), status: "actual-run", phase, fixture: true, appPath,
    executablePath, runtime, asarHash, profile, profileRemoved, directory: evidence, evidence, screenshots, protocolEvents,
    build: { version: expected.version, builtAt: expected.builtAt, sourceSha256: expected.sourceSha256 },
    checks, metrics, clipboardRestored, pageErrors, failedRequests, testSources, watchdogTriggered, phases, cleanupErrors,
    workerTargets: targets.map(({ url, createdAtEpochMs, closed, closedAtEpochMs }) => ({ url, createdAtEpochMs, closed, closedAtEpochMs })),
    testSourceSha256: digest(await fs.readFile(import.meta.filename)),
    limitation: "Local adaptation acceptance, not same-state official Computer Use or complete 1:1 highlighting.",
    ...(failure ? { error: failure.stack || String(failure) } : {}) };
  const reportName = mode === "packaged" ? "highlight-packaged-test.json" : "highlight-ui-test.json";
  await fs.writeFile(path.join(evidence, reportName), JSON.stringify(report, null, 2) + "\n");
  await fs.writeFile(path.join(evidenceRoot, reportName), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ passed: report.passed, evidence, checks: checks.length, error: report.error }, null, 2));
}
if (failure) throw failure;

// Test-only browser init script. All normal requests/results use a real native
// module worker. Rules hold actual messages to expose async boundaries; no fake
// token arrays or DOM are generated. Do not ship this instrumentation.
function installWorkerObserver({ workerName = "code-fence-highlight" } = {}) {
  const NativeWorker = window.Worker;
  const records = [], rules = [], held = [], violations = [];
  const observers = new Map();
  document.addEventListener("securitypolicyviolation", (event) => violations.push({
    directive: event.effectiveDirective, blockedURI: event.blockedURI, disposition: event.disposition,
  }));
  class ObservedWorker extends EventTarget {
    constructor(url, options = {}) {
      super();
      if (options.name !== workerName) return new NativeWorker(url, options);
      const native = new NativeWorker(url, options);
      const record = { number: records.length + 1, url: new URL(url, location.href).href,
        type: options.type, name: options.name, timeOrigin: performance.timeOrigin, createdAt: performance.now(),
        requests: [], replies: [], errors: [], terminated: false, terminatedAt: null, cpuBlocked: false, cpuBlockedAt: null };
      records.push(record); observers.set(record.number, this);
      this.native = native; this.record = record; this.modes = new Map();
      native.addEventListener("message", (event) => {
        if (event.data?.fixture === "cpu-blocked") { record.cpuBlocked = true; record.cpuBlockedAt = performance.now(); return; }
        record.replies.push({ id: event.data?.id, status: event.data?.status });
        if (this.modes.get(event.data?.id) === "hold-reply") {
          held.push({ owner: this, id: event.data.id, data: event.data, kind: "reply" });
        } else this.deliver(event.data);
      });
      native.addEventListener("error", (event) => {
        record.errors.push(event.message || "Native worker error");
        // Keep intentional fixture errors in the worker evidence. The real
        // service still receives its real native error event via this proxy.
        event.preventDefault();
        const forwarded = new ErrorEvent("error", { message: event.message, filename: event.filename, cancelable: true });
        this.dispatchEvent(forwarded); this.onerror?.(forwarded);
      });
      native.addEventListener("messageerror", () => this.dispatchEvent(new Event("messageerror")));
    }
    postMessage(data, transfer) {
      const text = data?.input?.text ?? "";
      const rule = rules.find((rule) => text.includes(rule.contains));
      const mode = rule?.mode ?? "normal";
      this.record.requests.push({ id: data.id, text, language: data.input?.language, mode, postedAt: performance.now() });
      this.modes.set(data.id, mode);
      if (mode === "hold-send") held.push({ owner: this, id: data.id, data, transfer, kind: "send" });
      else this.native.postMessage(data, transfer);
    }
    deliver(data) { const event = new MessageEvent("message", { data }); this.dispatchEvent(event); this.onmessage?.(event); }
    terminate() {
      if (!this.record.terminated) this.record.terminatedAt = performance.now();
      this.record.terminated = true; this.native.terminate();
    }
  }
  window.Worker = ObservedWorker;
  window.__highlightObserver = {
    records, violations,
    addRule(contains, mode) { rules.push({ contains, mode }); },
    clearRules() { rules.length = 0; },
    heldFor(contains) { return held.filter((entry) => entry.owner.record.requests.find((request) => request.id === entry.id)?.text.includes(contains)).length; },
    release(contains) {
      for (let index = held.length - 1; index >= 0; index -= 1) {
        const entry = held[index];
        const request = entry.owner.record.requests.find((request) => request.id === entry.id);
        if (!request?.text.includes(contains)) continue;
        held.splice(index, 1);
        // Replaying a held reply after owner termination exercises real service
        // listener removal/identity guards. It still contains the original data.
        if (entry.kind === "reply") entry.owner.deliver(entry.data);
        else if (!entry.owner.record.terminated) entry.owner.native.postMessage(entry.data, entry.transfer);
      }
    },
    forceTerminateAll() { for (const observer of observers.values()) observer.terminate(); },
    snapshot() { return { records: structuredClone(records), held: held.length, violations: structuredClone(violations) }; },
  };
}
