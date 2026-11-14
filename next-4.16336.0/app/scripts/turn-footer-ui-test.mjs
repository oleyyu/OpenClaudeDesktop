import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { markdownToClipboardHtml } from "../src/rich-copy-html.mjs";

// Run only after a fresh integration build and with no other GUI suite active.
// Every row/footer comes through seeded RPC hydration or ordinary
// turn/item notifications; this test never inserts synthetic footer DOM.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `turn-footer-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
const A = "turn-footer-A", B = "turn-footer-B", targetTurn = "footer-static-turn";
const now = Math.floor(Date.now() / 1000);
const firstText = " \t# Exact Markdown\n\nFirst **bold** paragraph.  \n";
const secondText = "\n```js\nconst interior = '  KEEP  ';\n```\n\nLast paragraph. \t ";
const expectedText = [firstText, "", secondText].join("\n\n").trim();
const textItem = (id, text) => ({ id, type: "agentMessage", text });
const userItem = (id, text) => ({ id, type: "userMessage", content: [{ type: "text", text }] });
const toolItem = (id, command) => ({ id, type: "commandExecution", command,
  status: "completed", exitCode: 0, aggregatedOutput: "ISOLATED_TOOL_OUTPUT\n" });
const histories = Array.from({ length: 20 }, (_, i) => ({ id: `footer-history-${i}`, status: "completed", items: [
  userItem(`footer-history-user-${i}`, `Isolated history prompt ${i}.`),
  textItem(`footer-history-text-${i}`, `History answer ${i}. This paragraph wraps naturally in the real transcript and is intentionally long enough to exercise reading anchors.\n\nThe second paragraph gives this real item a stable interior scroll position.`),
] }));
const targetItems = [userItem("footer-static-user", "Copy this entire turn, excluding tools."),
  textItem("footer-static-first", firstText), toolItem("footer-static-middle", "printf middle"),
  textItem("footer-static-empty", ""), textItem("footer-static-second", secondText),
  toolItem("footer-static-tail", "printf tail")];
function thread(id, name, turns, index = 0) {
  return { id, name, cwd: workspace, createdAt: now, updatedAt: now - index, archived: false, turns };
}
await fs.writeFile(path.join(profile, "turn-footer-fixture.marker"), "isolated-turn-footer-test\n");
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "footer-fixture", threadIds: [A, B], sidebarWidth: 288,
}));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: {
  [A]: thread(A, "Turn footer A", [...histories, { id: targetTurn, status: "completed", items: targetItems }]),
  [B]: thread(B, "Turn footer B", [{ id: "footer-B-turn", status: "completed", items: [textItem("footer-B-text", "A separate real fixture session.")] }], 1),
  "footer-control": thread("footer-control", "Isolated footer protocol control", [], 2),
} }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile,
  CODEX_BINARY: path.join(root, "tests/fixtures/turn-footer-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE;
await fs.chmod(env.CODEX_BINARY, 0o755);
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const checks = [], metrics = {}, rendererErrors = [];
let app, page, build, failure, runtime, clipboardSaved = false, clipboardRestored = false, profileRemoved = false;
const testSources = ["scripts/turn-footer-ui-test.mjs", "tests/fixtures/turn-footer-server.cjs", "src/rich-copy-html.mjs"];
let testSourceHashes;
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function verifySource() {
  assert.ok(build && Array.isArray(build.sources) && build.sources.length, "Build must contain a source manifest");
  assert.equal(sha(JSON.stringify(build.sources)), build.sourceSha256, "Build source digest must be internally consistent");
  const current = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  assert.equal(current.sourceSha256, build.sourceSha256, "Build changed during this test");
  assert.equal(current.builtAt, build.builtAt, "Build was replaced during this test");
  assert.equal(JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version, build.version, "Package version must match build");
  for (const entry of build.sources) assert.equal(sha(await fs.readFile(path.join(root, entry.path))), entry.sha256, `Build is stale: ${entry.path}`);
  for (const required of ["src/turn-copy-model.mjs", "src/source-turn-footer.jsx", "src/source-turn-footer.css",
    "src/turn-footer-behavior.mjs", "src/main.jsx", "src/source-session.jsx", "src/source-transcript.jsx", "electron/main.cjs"])
    assert.ok(build.sources.some(entry => entry.path === required), `Build does not identify ${required}`);
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test or protocol fixture changed during this run");
  else testSourceHashes = hashes;
}
const near = (actual, expected, label, tolerance = .2) => assert.ok(Math.abs(actual - expected) <= tolerance,
  `${label}: expected ${expected}, got ${actual}`);
const footer = id => page.locator(`.stf-footer[data-turn-copy-id="${id}"]`);
async function rpc(method, params) {
  return page.evaluate(({ method, params }) => window.desktop.call("rpc", { method, params }), { method, params });
}
async function control(command) {
  return rpc("turn/start", { threadId: "footer-control", input: [{ type: "text",
    text: "FOOTER_TEST:" + JSON.stringify({ threadId: A, ...command }), text_elements: [] }] });
}
async function open(id) {
  await page.locator(`[data-source-session-id="${id}"] .source-session-open`).click();
  await page.locator(`[data-transcript-item-id="${id === A ? "footer-static-tail" : "footer-B-text"}"]`).waitFor();
  await page.locator(".loading-state").waitFor({ state: "detached" });
}
async function waitStatus(id, text) {
  await page.waitForFunction(({ id, text }) => {
    const node = [...document.querySelectorAll(".stf-footer")].find(node => node.dataset.turnCopyId === id);
    return node?.querySelector(".stf-status")?.textContent === text;
  }, { id, text });
}
async function waitOpacity(id, value) {
  await page.waitForFunction(({ id, value }) => {
    const node = [...document.querySelectorAll(".stf-footer")].find(node => node.dataset.turnCopyId === id)?.querySelector(".stf-toolbar");
    return node && Math.abs(Number(getComputedStyle(node).opacity) - value) < .001;
  }, { id, value });
}
// Rich copy (2.2553.1 CopyAction/getRichText + shared-7 JI): Copy first tries
// clipboard.write([ClipboardItem{text/plain,text/html}]) and silently falls
// back to writeText, so deny/hold stubs must cover BOTH methods or the rich
// path would bypass them. richDeny rejects only the ClipboardItem write.
async function restoreWrite() {
  await page.evaluate(() => {
    if (!globalThis.footerWriteBackup) return;
    for (const name of ["write", "writeText"]) {
      const descriptor = globalThis.footerWriteBackup[name];
      if (descriptor) Object.defineProperty(navigator.clipboard, name, descriptor);
      else delete navigator.clipboard[name];
    }
    delete globalThis.footerWriteBackup;
  });
}
async function mockWrite(mode) {
  await restoreWrite();
  await page.evaluate(mode => {
    globalThis.footerWriteBackup = { write: Object.getOwnPropertyDescriptor(navigator.clipboard, "write"), writeText: Object.getOwnPropertyDescriptor(navigator.clipboard, "writeText") };
    globalThis.footerWrites = [];
    const stub = method => value => {
      if (mode === "deny" || (mode === "richDeny" && method === "write")) return Promise.reject(new DOMException("Isolated clipboard denial", "NotAllowedError"));
      return new Promise((resolve, reject) => globalThis.footerWrites.push({ method, value, resolve, reject }));
    };
    Object.defineProperty(navigator.clipboard, "write", { configurable: true, value: stub("write") });
    if (mode !== "richDeny") Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: stub("writeText") });
  }, mode);
}
// Electron 44 main-process clipboard is W3C-shaped: read() yields ClipboardItem[].
const readHtml = () => app.evaluate(async ({ clipboard }) => {
  for (const item of await clipboard.read()) if (item.types.includes("text/html")) return (await item.getType("text/html")).text();
  return "";
});
// Chromium re-serializes the sanitized text/html fragment (<br> for <br />, a
// leading <meta charset>, relative/empty hrefs resolved), so both sides are
// compared as parsed DOM with hrefs removed; raw strings are kept as evidence.
async function assertRichHtml(key, expected) {
  const raw = await readHtml();
  metrics.rawHtml = { ...metrics.rawHtml, [key]: raw };
  const converted = markdownToClipboardHtml(expected);
  assert.ok(converted.length > 0 && raw.length > 0, `${key}: text/html must be present (a plain-only fallback would leave it empty)`);
  const { actual, wanted } = await page.evaluate(({ raw, converted }) => {
    const normalize = html => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      for (const node of doc.querySelectorAll("meta")) node.remove();
      for (const a of doc.body.querySelectorAll("a")) a.removeAttribute("href");
      return doc.body.innerHTML;
    };
    return { actual: normalize(raw), wanted: normalize(converted) };
  }, { raw, converted });
  assert.equal(actual, wanted, `${key}: DOM-normalized text/html equals the converter output`);
}
async function scrollState() {
  return page.locator(".transcript").evaluate(viewport => {
    const r = viewport.getBoundingClientRect();
    const row = [...viewport.querySelectorAll("[data-transcript-item-id]")].find(node => {
      const b = node.getBoundingClientRect();
      return b.height > 0 && b.bottom > r.top && b.top < r.bottom;
    });
    return { top: viewport.scrollTop, height: viewport.scrollHeight, viewport: viewport.clientHeight,
      following: viewport.closest(".source-transcript-frame").dataset.following,
      anchor: row?.dataset.transcriptItemId, offset: row ? row.getBoundingClientRect().top - r.top : null };
  });
}
try {
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  await verifySource();
  app = await electron.launch({ executablePath, args: [root], env });
  runtime = await app.evaluate(({ app }) => ({ version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome }));
  assert.equal(runtime.version, build.version, "Runtime version must match the verified source build");
  page = await app.firstWindow();
  page.setDefaultTimeout(12000);
  page.on("pageerror", error => rendererErrors.push(error.message));
  metrics.clipboardApi = await app.evaluate(async ({ clipboard, ClipboardItem }) => {
    if (typeof clipboard.read === "function" && typeof ClipboardItem === "function") {
      const originals = await clipboard.read();
      const items = await Promise.all(originals.map(async item => new ClipboardItem(Object.fromEntries(
        await Promise.all(item.types.map(async type => [type, await item.getType(type)]))))));
      globalThis.turnFooterClipboardBackup = { kind: "items", items };
      return "async ClipboardItem[]";
    }
    const data = { text: await clipboard.readText() };
    if (typeof clipboard.readHTML === "function") data.html = clipboard.readHTML();
    if (typeof clipboard.readRTF === "function") data.rtf = clipboard.readRTF();
    if (typeof clipboard.readImage === "function") { const image = clipboard.readImage(); if (!image.isEmpty()) data.image = image; }
    if (typeof clipboard.readBookmark === "function") { const bookmark = clipboard.readBookmark(); if (bookmark.title) data.bookmark = bookmark.title; }
    const empty = typeof clipboard.availableFormats === "function" && clipboard.availableFormats().length === 0;
    globalThis.turnFooterClipboardBackup = { kind: typeof clipboard.readHTML === "function" ? "legacy" : "text", empty, data };
    return typeof clipboard.readHTML === "function" ? "legacy formats" : "text";
  });
  clipboardSaved = true;
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Footer fixture" }).waitFor();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768));
  await page.mouse.move(100, 700);
  await open(A);
  await page.evaluate(() => document.fonts.ready);
  await rpc("thread/resume", { threadId: "footer-control" });
  const target = footer(targetTurn);
  await target.waitFor();
  assert.equal(await page.locator(".stf-footer").count(), histories.length + 1);
  assert.equal(await target.count(), 1);
  assert.equal(await page.locator(".source-message-actions").count(), 0, "Old per-message Copy must be removed");
  assert.equal(await target.evaluate(node => node.previousElementSibling?.dataset.transcriptItemId), "footer-static-tail");
  assert.equal(await target.locator(".stf-toolbar").count(), 0, "A never-interacted row defers its toolbar");
  assert.equal(await target.locator(".stf-placeholder").getAttribute("aria-hidden"), "true");
  near(await target.locator(".stf-placeholder").evaluate(node => node.getBoundingClientRect().height), 24, "Deferred toolbar reservation");
  checks.push("Real hydrated text/tool/text/empty/tool turn has exactly one tail footer, with a deferred 24px reservation and no old per-message Copy controls");

  // A Codex turn also contains its prompt. That shared transport turn ID does
  // not put the user bubble inside the source assistant row's hover/focus scope.
  await page.locator('[data-transcript-item-id="footer-static-user"] .source-user-bubble').hover();
  await page.waitForTimeout(260);
  assert.equal(await target.locator(".stf-toolbar").count(), 0, "Hovering the user bubble must not reveal or latch assistant actions");
  assert.equal(await target.locator(".stf-show-actions").count(), 1);
  assert.equal(await target.getAttribute("data-row-hovered"), null);
  await page.mouse.move(100, 700);
  assert.equal(await target.locator(".stf-toolbar").count(), 0, "Leaving the user bubble must keep the assistant footer deferred");
  metrics.userBubbleScope = { sameRealTurn: true, toolbarMountedAfterHover: false, deferredAfterLeaving: true };
  checks.push("Hovering the real user bubble in the same Codex turn neither reveals nor permanently mounts the assistant footer");

  // Observe focus transitions without moving focus to the hidden sentinel. The
  // real keyboard traversal from the composer must hit Show actions itself.
  await page.evaluate(() => {
    globalThis.footerFocusTrail = [];
    document.addEventListener("focusin", event => {
      const node = event.target;
      if (node instanceof HTMLElement && node.closest(".stf-footer")) globalThis.footerFocusTrail.push({
        turnId: node.closest(".stf-footer").dataset.turnCopyId,
        sentinel: node.classList.contains("stf-show-actions"), copy: node.classList.contains("stf-copy"),
      });
    }, true);
  });
  await page.locator("form.sc-composer .sc-input").focus();
  let keyboardReached = false;
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press("Shift+Tab");
    keyboardReached = await target.evaluate(node => node.querySelector(".stf-copy") === document.activeElement);
    if (keyboardReached) break;
  }
  assert.ok(keyboardReached, "Actual reverse Tab must enter the final turn's Copy control");
  metrics.focusTrail = await page.evaluate(() => globalThis.footerFocusTrail);
  assert.ok(metrics.focusTrail.some(entry => entry.turnId === targetTurn && entry.sentinel), "Tab must traverse Show message actions before focus handoff");
  await waitOpacity(targetTurn, 1);
  assert.equal(await target.locator(".stf-toolbar").getAttribute("role"), "toolbar");
  assert.equal(await target.locator(".stf-toolbar").getAttribute("aria-label"), "Message actions");
  assert.equal(await target.locator(".stf-toolbar").getAttribute("tabindex"), "-1");
  assert.equal(await target.getByRole("button", { name: "Copy", exact: true }).count(), 1);
  // Roving focus (turnFooterKeyIndex, wrapping) over Copy and, where offered, Fork from here and the ratings.
  const rovers = await target.evaluate(node => [...node.querySelectorAll(".stf-toolbar button:not(:disabled)")].map(button => button.getAttribute("aria-label")));
  assert.equal(rovers[0], "Copy");
  let rover = 0;
  for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
    await page.keyboard.press(key);
    rover = key === "Home" ? 0 : key === "End" ? rovers.length - 1 : (rover + (key === "ArrowRight" ? 1 : -1) + rovers.length) % rovers.length;
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), rovers[rover], `${key} roves to ${rovers[rover]}`);
  }
  await page.keyboard.press("Home");
  assert.equal(await target.evaluate(node => node.querySelector(".stf-copy") === document.activeElement), true, "Home returns to Copy");
  metrics.geometry = await target.evaluate(node => {
    const button = node.querySelector(".stf-copy"), toolbar = node.querySelector(".stf-toolbar");
    const style = getComputedStyle(button), toolbarStyle = getComputedStyle(toolbar);
    return { gap: node.getBoundingClientRect().top - node.previousElementSibling.getBoundingClientRect().bottom,
      width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height,
      glyphSize: getComputedStyle(button.querySelector('[data-cds="Icon"]')).fontSize,
      radius: style.borderRadius, focusShadow: style.boxShadow, focusDelay: toolbarStyle.transitionDelay,
      duration: toolbarStyle.transitionDuration, nativeTitle: button.getAttribute("title") };
  });
  near(metrics.geometry.gap, 8, "Body-to-footer source gap");
  near(metrics.geometry.width, 24, "Copy width"); near(metrics.geometry.height, 24, "Copy height");
  assert.equal(metrics.geometry.glyphSize, "16px"); assert.equal(metrics.geometry.radius, "6px");
  assert.equal(metrics.geometry.focusDelay, "0s"); assert.notEqual(metrics.geometry.focusShadow, "none");
  assert.equal(metrics.geometry.nativeTitle, null);
  checks.push("Real Tab traverses Show message actions and hands off to Copy; source toolbar semantics, roving keys, 24/16px geometry, 8px gap and immediate focus reveal hold");

  await page.keyboard.press("Enter");
  await waitStatus(targetTurn, "Copied");
  const copiedAt = await page.evaluate(() => performance.now());
  assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), expectedText);
  await assertRichHtml("keyboardCopy", expectedText);
  assert.equal(await target.getByRole("button", { name: "Copy", exact: true }).count(), 1);
  await page.waitForTimeout(1500);
  assert.equal(await target.locator(".stf-status").textContent(), "Copied", "Feedback must outlast the former 1500ms implementation");
  await waitStatus(targetTurn, "");
  metrics.feedbackResetMs = await page.evaluate(() => performance.now()) - copiedAt;
  assert.ok(metrics.feedbackResetMs >= 1850 && metrics.feedbackResetMs < 3200,
    `Observable success duration: ${metrics.feedbackResetMs}ms (pure scheduler test asserts exactly 2000)`);
  metrics.copiedTextLength = expectedText.length;
  checks.push("Keyboard Copy writes exact full Markdown with empty-fragment double separators and aggregate-only trim plus matching text/html; accessible name stays Copy and success lasts 2000ms");

  await page.locator("form.sc-composer .sc-input").focus();
  await page.mouse.move(100, 700);
  await waitOpacity(targetTurn, 0);
  await page.locator('[data-transcript-item-id="footer-static-first"]').hover();
  await waitOpacity(targetTurn, 1);
  metrics.hover = await target.locator(".stf-toolbar").evaluate(node => ({ duration: getComputedStyle(node).transitionDuration,
    delay: getComputedStyle(node).transitionDelay, scale: getComputedStyle(node).scale }));
  assert.equal(metrics.hover.duration, "0.12s"); assert.equal(metrics.hover.delay, "0.1s"); assert.equal(metrics.hover.scale, "none");
  await page.mouse.move(100, 700);
  await waitOpacity(targetTurn, 0);
  assert.equal(await target.locator(".stf-toolbar").evaluate(node => getComputedStyle(node).transitionDuration), "0.06s");
  await page.locator('[data-transcript-item-id="footer-static-tail"]').hover();
  await waitOpacity(targetTurn, 1);
  // design-system.css:51631-51640 (MessageActions under reduced motion): transition-property none + scale none, for the
  // OS query and for the in-app html[data-reduce-motion=true]; the declared hover duration stays (the global reduce clamp,
  // design-system.css:1423-1438, only shortens animations). Fidelity integration decision; see LOG "Wave integration".
  const reducedToolbar = () => target.locator(".stf-toolbar").evaluate(node => { const style = getComputedStyle(node);
    return { property: style.transitionProperty, scale: style.scale, opacity: style.opacity }; });
  await page.emulateMedia({ reducedMotion: "reduce" });
  metrics.reducedMotion = { media: await reducedToolbar() };
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => { document.documentElement.dataset.reduceMotion = "true"; });
  metrics.reducedMotion.attribute = await reducedToolbar();
  await page.evaluate(() => { delete document.documentElement.dataset.reduceMotion; });
  for (const [source, state] of Object.entries(metrics.reducedMotion))
    assert.deepEqual(state, { property: "none", scale: "none", opacity: "1" }, `${source} reduce turns the reveal transition off`);
  checks.push("Real assistant text or tools in the turn reveal its sole footer; mounted controls hide in 60ms, hover uses 120ms/100ms and reduced motion (OS query or in-app attribute) sets transition-property none");

  // The previous anchor check starts already unpinned and cannot prove that
  // sibling-footer input releases following. Re-pin through the real control,
  // then click an already-visible Copy without locator-driven scroll changes.
  const pinViewport = await page.locator(".transcript").boundingBox();
  await page.mouse.move(pinViewport.x + pinViewport.width / 2, pinViewport.y + pinViewport.height / 2);
  await page.mouse.wheel(0, -360);
  const jump = page.locator('[data-testid="jump-to-latest"][data-visible="true"]');
  await jump.waitFor();
  await jump.click();
  await page.waitForFunction(() => {
    const viewport = document.querySelector(".transcript");
    return viewport?.closest(".source-transcript-frame")?.dataset.following === "true"
      && viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 2;
  });
  const copyPoint = await target.getByRole("button", { name: "Copy", exact: true }).evaluate(button => {
    const rect = button.getBoundingClientRect(), viewport = button.closest(".transcript").getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2,
      fullyVisible: rect.top >= viewport.top && rect.bottom <= viewport.bottom && rect.left >= viewport.left && rect.right <= viewport.right };
  });
  assert.ok(copyPoint.fullyVisible, "The pinned tail Copy must already be visible before activation");
  await page.mouse.move(copyPoint.x, copyPoint.y);
  const pinnedBeforeCopy = await scrollState();
  assert.equal(pinnedBeforeCopy.following, "true", "Hover/focus alone must not replace the explicit pinned activation precondition");
  metrics.footerAnchorMarkers = await page.locator(".transcript").evaluate(viewport => ({
    footerCount: viewport.querySelectorAll(".stf-footer").length,
    footerItemCount: [...viewport.querySelectorAll(".stf-footer")].filter(node => node.closest("[data-transcript-item-id]") || node.querySelector("[data-transcript-item-id]")).length,
    actualItemCount: viewport.querySelectorAll("[data-transcript-item-id]").length,
  }));
  assert.equal(metrics.footerAnchorMarkers.footerItemCount, 0, "Copy footers must never enter the real transcript ITEM anchor set");
  await page.mouse.click(copyPoint.x, copyPoint.y);
  await waitStatus(targetTurn, "Copied");
  await assertRichHtml("pinnedMouseCopy", expectedText);
  await page.waitForFunction(() => document.querySelector(".source-transcript-frame")?.dataset.following === "false");
  const releasedAfterCopy = await scrollState();
  assert.equal(releasedAfterCopy.following, "false");
  near(releasedAfterCopy.top, pinnedBeforeCopy.top, "Tail Copy releases following without a scroll jump", 2);
  metrics.pinnedCopy = { before: pinnedBeforeCopy, after: releasedAfterCopy, alreadyVisible: copyPoint.fullyVisible };
  checks.push("An actual visible sibling tail Copy changes following true to false without moving the viewport; footers never masquerade as real item anchors");

  await waitStatus(targetTurn, "");
  const beforeDenial = { text: await app.evaluate(({ clipboard }) => clipboard.readText()), html: await readHtml() };
  assert.equal(beforeDenial.text, expectedText);
  await mockWrite("deny");
  await target.getByRole("button", { name: "Copy", exact: true }).click();
  await waitStatus(targetTurn, "Couldn’t copy to the clipboard. Try again.");
  assert.equal(await target.getByRole("status").filter({ hasText: /^Copied$/ }).count(), 0);
  assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), beforeDenial.text);
  assert.equal(await readHtml(), beforeDenial.html, "denial leaves the previous text/html untouched");
  await restoreWrite();
  checks.push("Clipboard denial (rich and plain writes both rejected) remains a truthful card-local failure and never produces false Copied feedback or changes clipboard text/html");

  // Official JI order: a refused ClipboardItem write falls back to writeText and still reports success.
  await mockWrite("richDeny");
  await target.getByRole("button", { name: "Copy", exact: true }).click();
  await waitStatus(targetTurn, "Copied");
  assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), expectedText);
  metrics.rawHtml = { ...metrics.rawHtml, fallback: await readHtml() };
  assert.equal(metrics.rawHtml.fallback.includes("<h1"), false, "fallback leaves no rich fragment");
  assert.equal(metrics.rawHtml.fallback.includes("Exact Markdown"), false, "fallback leaves no HTML copy of the turn");
  await restoreWrite();
  await waitStatus(targetTurn, "");
  checks.push("A refused ClipboardItem write falls back to the real writeText: Copied feedback, exact plain text and no text/html on the pasteboard");

  await mockWrite("hold");
  await target.getByRole("button", { name: "Copy", exact: true }).click();
  await page.waitForFunction(() => globalThis.footerWrites.length === 1);
  await control({ op: "item", turnId: targetTurn, item: textItem("footer-static-second", secondText + " Updated by a real item/completed event.") });
  await page.locator('[data-transcript-item-id="footer-static-second"]').getByText("Updated by a real item/completed event.", { exact: false }).waitFor();
  await page.evaluate(() => globalThis.footerWrites[0].resolve());
  await page.waitForTimeout(80);
  assert.equal(await target.locator(".stf-status").textContent(), "");
  await target.getByRole("button", { name: "Copy", exact: true }).click();
  await page.waitForFunction(() => globalThis.footerWrites.length === 2);
  await open(B);
  await page.evaluate(() => globalThis.footerWrites[1].resolve());
  await page.waitForTimeout(80);
  assert.equal(await page.locator(".stf-status").filter({ hasText: /^Copied$/ }).count(), 0);
  await open(A);
  await target.hover();
  await target.getByRole("button", { name: "Copy", exact: true }).waitFor();
  assert.equal(await target.locator(".stf-status").textContent(), "");
  await restoreWrite();
  checks.push("Held clipboard completions cannot mark replaced turn text, a different session, or a newly mounted original session as Copied");

  const liveTurn = "footer-live-turn";
  await control({ op: "start", turnId: liveTurn });
  await control({ op: "item", turnId: liveTurn, item: userItem("footer-live-user", "A real held protocol turn.") });
  await control({ op: "item", turnId: liveTurn, item: textItem("footer-live-first", ""), completed: false });
  await control({ op: "delta", turnId: liveTurn, itemId: "footer-live-first", delta: "First **live** fragment." });
  await control({ op: "item", turnId: liveTurn, item: textItem("footer-live-first", "First **live** fragment.") });
  await control({ op: "item", turnId: liveTurn, item: toolItem("footer-live-middle", "printf live-middle") });
  await control({ op: "item", turnId: liveTurn, item: textItem("footer-live-second", "Second fragment."), completed: false });
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor();
  assert.equal(await footer(liveTurn).count(), 0, "Completed text inside an active turn has no tail footer");
  assert.equal(await footer(targetTurn).count(), 1, "An older finished turn stays eligible");
  assert.equal(await page.locator(".stf-footer").count(), histories.length + 1);
  checks.push("Actual started/delta/completed item events keep the current responding turn footer absent while all old completed turn footers remain");

  // Position the reader with actual wheel input. No footer or scrolling state is
  // injected. Pick a fully visible historical footer and operate its real Copy.
  const viewportBox = await page.locator(".transcript").boundingBox();
  await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
  await page.mouse.wheel(0, -1200);
  await page.waitForTimeout(180);
  const visibleTurn = await page.locator(".transcript").evaluate(viewport => {
    const r = viewport.getBoundingClientRect();
    return [...viewport.querySelectorAll(".stf-footer")].find(node => {
      const b = node.getBoundingClientRect();
      return node.dataset.turnCopyId.startsWith("footer-history-") && b.top > r.top + 16 && b.bottom < r.bottom - 16;
    })?.dataset.turnCopyId;
  });
  assert.ok(visibleTurn, "Fixture supplies a fully visible historical footer for actual interaction");
  const historical = footer(visibleTurn);
  await historical.hover();
  await historical.getByRole("button", { name: "Copy", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".source-transcript-frame")?.dataset.following === "false");
  const before = await scrollState();
  assert.ok(before.height > before.viewport + 500 && before.anchor);
  await control({ op: "delta", turnId: liveTurn, itemId: "footer-live-second", delta: "\n\nSTREAM_GROWTH paragraph with real wrapping and substantial additional height.".repeat(50) });
  await control({ op: "item", turnId: liveTurn, item: toolItem("footer-live-tail", "printf live-tail") });
  await page.locator('[data-transcript-item-id="footer-live-tail"]').waitFor({ state: "attached" });
  await page.waitForTimeout(160);
  assert.equal(await footer(liveTurn).count(), 0);
  const during = await scrollState();
  assert.equal(during.anchor, before.anchor); near(during.offset, before.offset, "Growing turn preserves historical reading anchor", 2);
  assert.equal(during.following, "false");
  await control({ op: "complete", turnId: liveTurn });
  await footer(liveTurn).waitFor({ state: "attached" });
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  assert.equal(await footer(liveTurn).count(), 1);
  assert.equal(await footer(liveTurn).evaluate(node => node.previousElementSibling?.dataset.transcriptItemId), "footer-live-tail");
  assert.equal(await page.locator(".stf-footer").count(), histories.length + 2);
  await page.waitForTimeout(100);
  const after = await scrollState();
  assert.equal(after.anchor, before.anchor); near(after.offset, before.offset, "New tail footer preserves historical reading anchor", 2);
  assert.equal(after.following, "false");
  metrics.anchor = { before, during, after };
  checks.push("Real historical Copy preserves an unpinned item anchor through live content growth and completion; exactly one new footer appears after the true final tool");
  await page.screenshot({ path: path.join(directory, "verified.png") });
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
} finally {
  await restoreWrite().catch(() => {});
  if (app && clipboardSaved) {
    try {
      await app.evaluate(async ({ clipboard }) => {
        const saved = globalThis.turnFooterClipboardBackup;
        if (!saved) throw new Error("Clipboard backup unavailable");
        if (saved.kind === "items") { if (saved.items.length) await clipboard.write(saved.items); else await clipboard.clear(); }
        else if (saved.empty) await clipboard.clear();
        else if (saved.kind === "legacy") await clipboard.write(saved.data);
        else await clipboard.writeText(saved.data.text);
        delete globalThis.turnFooterClipboardBackup;
      });
      clipboardRestored = true;
    } catch (error) { failure ||= error; }
  }
  await app?.close().catch(error => { failure ||= error; });
  if (build) await verifySource().catch(error => { failure ||= error; });
  await fs.copyFile(path.join(profile, "turn-footer-events.jsonl"), path.join(directory, "protocol-events.jsonl"))
    .catch(error => { if (error.code !== "ENOENT") failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch(error => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "turn-footer-ui", passed: !failure, startedAt, at: new Date().toISOString(),
    fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath,
    checks, metrics, clipboardSaved, clipboardRestored, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "turn-footer-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined, workspace: undefined }, null, 2));
}
if (failure) throw failure;
