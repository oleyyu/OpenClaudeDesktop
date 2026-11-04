import { chooseSetting, settingOptions } from './select-test-helpers.mjs';
import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { lightThemes, darkThemes } from "../src/code-theme-catalog.mjs";
import themeColors from "../src/generated/code-theme-colors.json" with { type: "json" };

// Settings remainder (analysis/settings-rest-20260920): OpenDyslexic interface
// font with the Font licenses dialog, light/dark code theme selection with the
// greet.ts previews, and the default transcript view with its per-session
// menu override. Isolated protocol fixture profile; runs only after a fresh
// build with no other GUI suite active.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `settings-rest-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
const A = "settings-rest-A", B = "settings-rest-B";
const now = Math.floor(Date.now() / 1000);
const FENCE = 'Seeded reply with a fence.\n\n```js\nfunction greet(name) { return "hi " + name; }\n```\n';
// Twelve distinct fences in one item exceed the settled service's 1 active + 8 queued capacity when they mount
// or re-request together (a theme change), so they prove the binding's transient-limit retry end to end.
const MANY_FENCE_COUNT = 12;
const MANY_FENCES = "Many fences.\n\n" + Array.from({ length: MANY_FENCE_COUNT }, (_, index) => "```js\nconst fence" + index + " = " + index + ";\n```\n").join("\n");
const userItem = (id, text) => ({ id, type: "userMessage", content: [{ type: "text", text }] });
const textItem = (id, text) => ({ id, type: "agentMessage", text });
const thread = (id, name, turns, index = 0) => ({ id, name, cwd: workspace, createdAt: now, updatedAt: now - index, archived: false, turns });
await fs.writeFile(path.join(profile, "settings-rest-fixture.marker"), "isolated-settings-rest-test\n");
const prefsFile = path.join(profile, "preferences.json");
await fs.writeFile(prefsFile, JSON.stringify({ cwd: workspace, theme: "light", mode: "code", model: "fixture", effort: "low", threadIds: [A, B], sidebarWidth: 288, displayName: "Fixture", permission: "plan" }));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: {
  [A]: thread(A, "Settings rest A", [{ id: "sa-turn", status: "completed", items: [
    userItem("sa-user", "Seeded request with reasoning."),
    { id: "sa-reasoning", type: "reasoning", summary: ["SEEDED_REASONING_SUMMARY for the transcript view."], status: "completed" },
    { id: "sa-command", type: "commandExecution", command: "printf seeded-step", cwd: workspace, status: "completed", exitCode: 0, aggregatedOutput: "SEEDED_STEP_OUTPUT\n" },
    textItem("sa-answer", FENCE),
    textItem("sa-fences", MANY_FENCES),
  ] }]),
  [B]: thread(B, "Settings rest B", [{ id: "sb-turn", status: "completed", items: [userItem("sb-user", "Session B request."), textItem("sb-answer", "Session B answer without reasoning.")] }], 1),
} }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const checks = [], metrics = {}, rendererErrors = [], failedRequests = [], consoleErrors = [];
let app, page, build, failure, runtime, profileRemoved = false;
const testSources = ["scripts/settings-rest-ui-test.mjs", "scripts/select-test-helpers.mjs", "tests/fixtures/codex-server.cjs", "src/code-theme-catalog.mjs", "electron/code-theme-catalog.mjs", "src/generated/code-theme-colors.json"];
let testSourceHashes;
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const rgb = (hex) => `rgb(${[1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)).join(", ")})`;
async function verifySource() {
  assert.ok(build && Array.isArray(build.sources) && build.sources.length, "Build must contain a source manifest");
  assert.equal(sha(JSON.stringify(build.sources)), build.sourceSha256, "Build source digest must be internally consistent");
  const current = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  assert.equal(current.sourceSha256, build.sourceSha256, "Build changed during this test");
  assert.equal(current.builtAt, build.builtAt, "Build was replaced during this test");
  assert.equal(JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version, build.version, "Package version must match build");
  for (const item of build.sources) assert.equal(sha(await fs.readFile(path.join(root, item.path))), item.sha256, `Source changed after build: ${item.path}`);
}
const prefs = async () => JSON.parse(await fs.readFile(prefsFile, "utf8"));
async function waitPref(key, value, timeout = 12000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) { if ((await prefs())[key] === value) return; await new Promise((resolve) => setTimeout(resolve, 25)); }
  throw new Error(`Preference ${key} did not persist as ${JSON.stringify(value)}`);
}
async function launch() {
  app = await electron.launch({ executablePath, args: [root], env });
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => rendererErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Test model" }).waitFor();
  runtime = await app.evaluate(({ app: electronApp }) => ({ electron: process.versions.electron, chrome: process.versions.chrome, userData: electronApp.getPath("userData") }));
  assert.equal(runtime.userData, profile, "The app must run on the isolated profile");
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  assert.equal(await page.evaluate(async () => (await (await fetch("./build-info.json")).json()).sourceSha256), build.sourceSha256);
}
const openSession = async (name) => { await page.locator(".source-session-open").filter({ hasText: name }).click(); };
const settingsDialog = () => page.getByRole("dialog", { name: "Settings", exact: true });
// The first device pixel of a 1x1 CSS clip, decoded from the PNG (every filter type leaves a first-row first pixel raw).
async function pagePixel({ x, y }) {
  const png = await page.screenshot({ clip: { x, y, width: 1, height: 1 } });
  let offset = 8, colorType = 6;
  const data = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset), type = png.toString("ascii", offset + 4, offset + 8), body = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") colorType = body[9];
    if (type === "IDAT") data.push(body);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  return [...raw.subarray(1, 1 + (colorType === 6 ? 4 : 3))];
}
async function openSettings(tab = "Code") {
  await page.keyboard.press("Meta+,");
  await settingsDialog().waitFor();
  await page.getByRole("navigation", { name: "Settings", exact: true }).getByRole("button", { name: tab, exact: true }).click();
}
async function closeSettings() {
  await page.getByRole("dialog", { name: "Settings", exact: true }).getByRole("button", { name: "Close", exact: true }).click();
  await settingsDialog().waitFor({ state: "detached" });
}
const htmlFontState = () => page.evaluate(() => ({
  dyslexic: document.documentElement.hasAttribute("data-dyslexic-font"), system: document.documentElement.hasAttribute("data-system-font"),
  font: document.documentElement.dataset.font, mainFont: document.querySelector("main.workspace")?.dataset.font,
}));
const fontFamilies = () => page.evaluate(() => Object.fromEntries([[".ss-dialog", document.querySelector(".ss-dialog")], ["sidebar", document.querySelector(".source-sidebar")], ["composer", document.querySelector('[aria-label="Prompt"],[aria-label="Message DeepSeek"]')]]
  .map(([key, node]) => [key, node ? getComputedStyle(node).fontFamily : null])));
const functionTokenColor = () => page.evaluate(() => {
  const token = [...document.querySelectorAll('.transcript [data-transcript-item-id="sa-answer"] .scb-code [data-code-token]')].find((span) => span.textContent === "function");
  return token ? getComputedStyle(token).color : null;
});
const waitFunctionColor = (color) => page.waitForFunction((expected) => {
  const token = [...document.querySelectorAll('.transcript [data-transcript-item-id="sa-answer"] .scb-code [data-code-token]')].find((span) => span.textContent === "function");
  return token && getComputedStyle(token).color === expected;
}, color);
// Every fence of an item: its highlight source plus the colour of one token text.
const fenceStates = (itemId, tokenText) => page.evaluate(({ itemId, tokenText }) => [...document.querySelectorAll(`.transcript [data-transcript-item-id="${itemId}"] .scb-code`)].map((code) => {
  const token = [...code.querySelectorAll("[data-code-token]")].find((span) => span.textContent === tokenText);
  return { source: code.dataset.highlightSource, color: token ? getComputedStyle(token).color : null };
}), { itemId, tokenText });
const waitFenceStates = (itemId, tokenText, count, source, color) => page.waitForFunction(({ itemId, tokenText, count, source, color }) => {
  const codes = [...document.querySelectorAll(`.transcript [data-transcript-item-id="${itemId}"] .scb-code`)];
  return codes.length === count && codes.every((code) => {
    const token = [...code.querySelectorAll("[data-code-token]")].find((span) => span.textContent === tokenText);
    return code.dataset.highlightSource === source && token && getComputedStyle(token).color === color;
  });
}, { itemId, tokenText, count, source, color }, { timeout: 20000 });
// The fence streamed by fixture:code-fence-stream (its item also holds a closed "prior" fence that never streamed).
const STREAMED_MARK = "FENCE_STREAM_DONE";
const streamedFence = () => page.evaluate((mark) => {
  const code = [...document.querySelectorAll(".transcript .scb-code")].find((node) => node.textContent.includes(mark));
  const token = code ? [...code.querySelectorAll("[data-code-token]")].find((span) => span.textContent === "const") : null;
  return code ? { source: code.dataset.highlightSource, color: token ? getComputedStyle(token).color : null, frontier: code.closest(".scb-block")?.getAttribute("data-frontier") } : null;
}, STREAMED_MARK);
const waitStreamedFence = (source, color) => page.waitForFunction(({ mark, source, color }) => {
  const code = [...document.querySelectorAll(".transcript .scb-code")].find((node) => node.textContent.includes(mark));
  const token = code ? [...code.querySelectorAll("[data-code-token]")].find((span) => span.textContent === "const") : null;
  return Boolean(code && code.dataset.highlightSource === source && token && getComputedStyle(token).color === color);
}, { mark: STREAMED_MARK, source, color }, { timeout: 20000 });
async function setTheme(mode) {
  await openSettings("General");
  await page.getByRole("radiogroup", { name: "Theme", exact: true }).getByRole("radio", { name: mode === "dark" ? "Dark" : "Light", exact: true }).click();
  await waitPref("theme", mode);
  await page.waitForFunction((expected) => document.documentElement.dataset.mode === expected, mode);
  await closeSettings();
}
async function transcriptViewMenu(open = true) {
  // B09 (c593f7513 Om → Dm/xm): Transcript view is in the header session menu (the CaretDown beside the title).
  await page.locator(".st-toolbar").getByRole("button", { name: /^More options for / }).click();
  const menu = page.locator('[role="menu"]:not([aria-label]):not([aria-labelledby])');
  await menu.waitFor();
  const trigger = menu.getByRole("menuitem", { name: "Transcript view", exact: true });
  await trigger.waitFor();
  if (!open) return { menu, trigger, submenu: null };
  await trigger.click();
  const submenu = page.getByRole("menu", { name: "Transcript view", exact: true });
  await submenu.waitFor();
  return { menu, trigger, submenu };
}
try {
  testSourceHashes = Object.fromEntries(await Promise.all(testSources.map(async (file) => [file, sha(await fs.readFile(path.join(root, file)))])));
  await launch();
  await openSession("Settings rest A");
  await page.locator('[data-transcript-item-id="sa-answer"] .scb-code [data-code-token]').first().waitFor({ state: "attached" });
  // Mounting more distinct fences than the service admits at once still ends highlighted (transient-limit retry).
  await waitFenceStates("sa-fences", "const", MANY_FENCE_COUNT, "settled", "rgb(197, 98, 27)");
  metrics.manyFencesLight = await fenceStates("sa-fences", "const");
  assert.equal(metrics.manyFencesLight.length, MANY_FENCE_COUNT);
  assert.equal(await page.locator(".source-reasoning").count(), 0, "Normal (fresh profile) hides the seeded reasoning item");
  // Streamed reasoning through the protocol fixture also stays hidden under Normal.
  const box = page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ });
  await box.fill("fixture:reasoning"); await box.press("Enter");
  await page.locator(".assistant-message").filter({ hasText: "REASONING_FIXTURE_REPLY" }).waitFor();
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  assert.equal(await page.locator(".source-reasoning").count(), 0);
  checks.push("Fresh profile: Normal view renders zero .source-reasoning for seeded and streamed reasoning items; twelve distinct seeded fences (beyond the 1+8 service capacity) all reach settled tokens");
  // A fence that streams in through the stream worker keeps its retained stream tokens after completion.
  await box.fill("fixture:code-fence-stream"); await box.press("Enter");
  await page.locator(".assistant-message").filter({ hasText: "FENCE_STREAM_DONE" }).waitFor({ timeout: 30000 });
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  await page.waitForFunction((mark) => { const code = [...document.querySelectorAll(".transcript .scb-code")].find((node) => node.textContent.includes(mark)); return code && code.closest(".scb-block")?.getAttribute("data-frontier") === null; }, STREAMED_MARK);
  await page.waitForTimeout(400);
  metrics.streamedRetained = await streamedFence();
  assert.ok(metrics.streamedRetained, "the streamed fence is in the transcript");
  assert.equal(metrics.streamedRetained.source, "stream", "a successful stream is retained after completion");
  assert.equal(metrics.streamedRetained.color, "rgb(129, 0, 194)", "retained stream tokens carry the stream light palette");
  checks.push("fixture:code-fence-stream completes with data-highlight-source=stream (retained stream palette keyword 129,0,194)");

  // A. Interface font.
  await openSettings("Code");
  const fontGroup = page.getByRole("radiogroup", { name: "Interface font", exact: true });
  metrics.fontRadios = await fontGroup.getByRole("radio").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
  assert.deepEqual(metrics.fontRadios, ["Anthropic Sans", "System", "OpenDyslexic"]);
  const codeFontBox = page.getByRole("textbox", { name: "Code font family", exact: true });
  assert.equal(await codeFontBox.getAttribute("placeholder"), "e.g. JetBrains Mono");
  await fontGroup.getByRole("radio", { name: "OpenDyslexic", exact: true }).click();
  await waitPref("interfaceFont", "dyslexic");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-dyslexic-font"));
  metrics.dyslexicState = await htmlFontState();
  assert.deepEqual(metrics.dyslexicState, { dyslexic: true, system: false, font: "system", mainFont: "system" });
  assert.equal(await codeFontBox.getAttribute("placeholder"), "e.g. OpenDyslexic Mono");
  metrics.dyslexicFonts = await page.evaluate(async () => {
    await Promise.all([document.fonts.load("16px OpenDyslexic"), document.fonts.load("bold italic 16px OpenDyslexic"), document.fonts.load("bold 16px OpenDyslexic"), document.fonts.load("italic 16px OpenDyslexic")]);
    const faces = [...document.fonts].filter((face) => face.family.replaceAll('"', "") === "OpenDyslexic").map((face) => `${face.weight}/${face.style}:${face.status}`).sort();
    return { regular: document.fonts.check("16px OpenDyslexic"), boldItalic: document.fonts.check("bold italic 16px OpenDyslexic"), faces };
  });
  assert.equal(metrics.dyslexicFonts.regular, true); assert.equal(metrics.dyslexicFonts.boldItalic, true);
  assert.deepEqual(metrics.dyslexicFonts.faces, ["400/italic:loaded", "400/normal:loaded", "700/italic:loaded", "700/normal:loaded"]);
  metrics.dyslexicFamilies = await fontFamilies();
  for (const [key, family] of Object.entries(metrics.dyslexicFamilies)) assert.match(family ?? "", /^"?OpenDyslexic"?/, `${key} font family`);
  assert.deepEqual(failedRequests.filter((url) => url.endsWith(".woff2")), []);
  assert.deepEqual(consoleErrors.filter((text) => /woff2|404/.test(text)), []);
  await page.screenshot({ path: path.join(directory, "code-settings-dyslexic.png") });
  checks.push("OpenDyslexic: third radio, interfaceFont:dyslexic persisted, data-dyslexic-font + data-font=system, four faces loaded from ./assets/v1, dialog/sidebar/composer families, Code font placeholder");
  // Font licenses dialog.
  const licensesButton = page.getByRole("group", { name: "Interface font", exact: true }).getByRole("button", { name: "Font licenses", exact: true });
  // R03 (shared-frame-C_2npUJq.js:5569 yf, :5619-5620 Ef/Df): a page pixel outside both dialogs keeps the Settings-only
  // backdrop value once the nested dialog opens; the nested backdrop is clear and Settings dims/blurs itself instead.
  const outside = await page.evaluate(() => ({ x: 6, y: Math.round(innerHeight / 2) }));
  // Scroll-driven animations (the nav's scroll-fade-y, a ScrollTimeline) never finish; only time-based ones settle.
  const settled = () => page.waitForFunction(() => document.querySelector(".ss-settings-dialog").getAnimations({ subtree: true }).every((animation) => animation.timeline !== document.timeline || animation.playState === "finished"));
  await settled();
  const settingsOnlyPixel = await pagePixel(outside);
  await licensesButton.click();
  const licenses = page.getByRole("dialog", { name: "Font licenses", exact: true });
  await licenses.waitFor();
  await page.waitForFunction(() => document.querySelector(".ss-settings-dialog")?.hasAttribute("data-nested-dialog-open"));
  await settled();
  metrics.nestedLicenses = await licenses.evaluate((node) => {
    const backdrop = getComputedStyle(node.parentElement), settings = document.querySelector(".ss-settings-dialog");
    return { background: backdrop.backgroundColor, backdropFilter: backdrop.backdropFilter, nested: settings.hasAttribute("data-nested-dialog-open"),
      settingsFilter: getComputedStyle(settings).filter, overlayOpacity: getComputedStyle(settings, "::after").opacity, overlay: getComputedStyle(settings, "::after").backgroundColor };
  });
  metrics.nestedLicenses.pixel = await pagePixel(outside);
  metrics.nestedLicenses.settingsOnlyPixel = settingsOnlyPixel;
  assert.equal(metrics.nestedLicenses.background, "rgba(0, 0, 0, 0)", "the nested backdrop is transparent");
  assert.equal(metrics.nestedLicenses.backdropFilter, "none");
  assert.equal(metrics.nestedLicenses.nested, true);
  assert.equal(metrics.nestedLicenses.settingsFilter, "blur(2px)");
  assert.equal(metrics.nestedLicenses.overlayOpacity, "1");
  assert.ok(metrics.nestedLicenses.pixel.every((value, index) => Math.abs(value - settingsOnlyPixel[index]) <= 1), `page dimmed once: ${metrics.nestedLicenses.pixel} vs ${settingsOnlyPixel}`);
  const region = licenses.getByRole("region", { name: "Font licenses", exact: true });
  await region.filter({ hasText: "OpenDyslexic" }).waitFor();
  await region.filter({ hasText: "SIL OPEN FONT LICENSE" }).waitFor();
  metrics.licenses = await page.evaluate(async () => {
    const response = await fetch("./third-party/fonts.txt");
    return { contentType: response.headers.get("content-type"), focused: document.activeElement?.getAttribute("aria-label"), settingsOpen: document.querySelectorAll('[role="dialog"][aria-modal="true"]').length };
  });
  assert.match(metrics.licenses.contentType ?? "", /^text\/plain/);
  assert.equal(metrics.licenses.focused, "Font licenses", "the pre region receives focus on open");
  // Fidelity F14: c71860c77:1130-1135 Popup size lg (720px) fullHeight; its close button is named 'Close'.
  metrics.licensesBox = await licenses.evaluate((node) => ({ width: node.offsetWidth, height: node.offsetHeight, expectedWidth: Math.min(720, innerWidth - 32), expectedHeight: innerHeight - 32 }));
  assert.equal(metrics.licensesBox.width, metrics.licensesBox.expectedWidth); assert.equal(metrics.licensesBox.height, metrics.licensesBox.expectedHeight);
  assert.equal(await licenses.getByRole("button", { name: "Close", exact: true }).count(), 1);
  await page.screenshot({ path: path.join(directory, "font-licenses.png") });
  await page.keyboard.press("Escape");
  await licenses.waitFor({ state: "detached" });
  assert.equal(await settingsDialog().count(), 1, "Escape closes only the licenses dialog");
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Font licenses", "focus returns to the Font licenses button");
  checks.push("Font licenses: text button inside the Interface font description opens a dialog with a focusable region fed by the text/plain notice; Escape closes it, focus returns, settings stay open");
  assert.equal(await page.locator(".ss-settings-dialog").evaluate((node) => node.hasAttribute("data-nested-dialog-open")), false, "closing the nested dialog clears data-nested-dialog-open");
  checks.push("R03 nested dialog: while Font licenses is open its backdrop is transparent (no blur), Settings carries data-nested-dialog-open with blur(2px) and an opaque ::after bg-backdrop overlay, and a page pixel outside both dialogs equals the Settings-only value");
  await fontGroup.getByRole("radio", { name: "System", exact: true }).click();
  await waitPref("interfaceFont", "system");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-system-font"));
  metrics.systemState = await htmlFontState();
  assert.deepEqual(metrics.systemState, { dyslexic: false, system: true, font: "system", mainFont: "system" });
  assert.match((await fontFamilies())[".ss-dialog"], /apple-system|BlinkMacSystemFont|system-ui/);
  await fontGroup.getByRole("radio", { name: "Anthropic Sans", exact: true }).click();
  await waitPref("interfaceFont", "anthropic");
  await page.waitForFunction(() => document.documentElement.dataset.font === "sans");
  metrics.anthropicState = await htmlFontState();
  assert.deepEqual(metrics.anthropicState, { dyslexic: false, system: false, font: "sans", mainFont: "sans" });
  assert.equal(await codeFontBox.getAttribute("placeholder"), "e.g. JetBrains Mono");
  checks.push("System sets data-system-font only; Anthropic Sans clears both attributes and restores data-font=sans");

  // B. Code themes: catalog comboboxes.
  const lightSelect = page.locator('button[role="combobox"]').and(page.getByRole("combobox", { name: "Light code theme", exact: true }));
  const darkSelect = page.locator('button[role="combobox"]').and(page.getByRole("combobox", { name: "Dark code theme", exact: true }));
  // shared-frame xb/Tb: enumerate actual open listbox options; native select is no longer the source UI.
  const options = async locator => settingOptions(page, await locator.getAttribute("aria-label"));
  metrics.lightOptions = await options(lightSelect); metrics.darkOptions = await options(darkSelect);
  assert.deepEqual(metrics.lightOptions, lightThemes().map((entry) => [entry.value, entry.label]));
  assert.deepEqual(metrics.darkOptions, darkThemes().map((entry) => [entry.value, entry.label]));
  assert.equal(metrics.lightOptions.length, 9); assert.equal(metrics.darkOptions.length, 17);
  assert.deepEqual(metrics.lightOptions[0], ["claude-light", "Claude Light"]); assert.deepEqual(metrics.darkOptions[0], ["claude-dark", "Claude Dark"]);
  assert.equal(await lightSelect.getAttribute("data-value"), "claude-light"); assert.equal(await darkSelect.getAttribute("data-value"), "claude-dark");
  checks.push("Light/Dark code theme comboboxes list exactly the catalog's 9 light and 17 dark entries (Pierre omitted, documented)");
  // shared-frame xb/Tb: >5 items has an actual search input and a listbox,
  // while Escape returns focus and leaves the containing settings dialog open.
  await darkSelect.click();
  const themeList=page.getByRole('listbox',{name:'Dark code theme',exact:true});
  const themeSearch=page.locator('input[role="combobox"][aria-label="Dark code theme"]');
  await themeSearch.waitFor();
  assert.equal(await themeSearch.evaluate(el=>document.activeElement===el),true);
  metrics.select=await page.locator('.sselect-popup').evaluate(el=>{
    const trigger=document.querySelector('button[aria-label="Dark code theme"]'),field=trigger.parentElement,css=getComputedStyle(field),option=el.querySelector('[role=option]');
    const probe=document.createElement('span');probe.style.cssText='position:absolute;height:var(--cds-h-control)';field.appendChild(probe);const expectedHeight=probe.getBoundingClientRect().height;probe.remove();
    return{height:field.getBoundingClientRect().height,expectedHeight,triggerHeight:trigger.getBoundingClientRect().height,fieldWidth:field.getBoundingClientRect().width,popupWidth:el.getBoundingClientRect().width,maxHeight:getComputedStyle(el).maxHeight,padding:getComputedStyle(el.firstElementChild).padding,optionHeight:option.getBoundingClientRect().height,ring:css.boxShadow,caret:parseFloat(getComputedStyle(trigger.querySelector('[data-cds=Icon]')).fontSize)};
  });
  assert.equal(metrics.select.height,metrics.select.expectedHeight);assert.equal(metrics.select.triggerHeight,metrics.select.expectedHeight);
  assert.equal(metrics.select.popupWidth,Math.max(metrics.select.fieldWidth,192));assert.equal(metrics.select.padding,'4px');assert.equal(metrics.select.caret,16);assert.notEqual(metrics.select.ring,'none');
  assert.ok(metrics.select.optionHeight>=metrics.select.expectedHeight);assert.ok(parseFloat(metrics.select.maxHeight)<=320);
  await page.screenshot({path:path.join(directory,'settings-code-theme-select.png')});
  await themeSearch.fill('ROSE');
  assert.deepEqual(await themeList.getByRole('option').evaluateAll(nodes=>nodes.map(n=>n.firstElementChild.textContent)),['Rosé Pine']);
  await themeSearch.fill('not-an-existing-theme');
  await themeList.getByText('No results',{exact:true}).waitFor();assert.equal(await themeList.getByRole('option').count(),0);
  await themeSearch.press('Enter');assert.equal(await themeList.isVisible(),true);assert.equal(await darkSelect.getAttribute('data-value'),'claude-dark');
  await themeSearch.press('Escape');await themeList.waitFor({state:'detached'});
  assert.equal(await darkSelect.evaluate(el=>document.activeElement===el),true);assert.equal(await page.getByRole('dialog',{name:'Settings',exact:true}).count(),1);
  await darkSelect.press('ArrowDown');await themeSearch.waitFor();await themeSearch.press('Tab');await themeList.waitFor({state:'detached'});
  assert.equal(await codeFontBox.evaluate(el=>document.activeElement===el),true,'Tab continues after the trigger inside settings');
  // The settings shell owns Cmd+F (shared-22/cc011544b). An open listbox
  // must not swallow that parent shortcut while owning Escape/Tab itself.
  await darkSelect.click();await themeSearch.waitFor();await themeSearch.press('Meta+f');
  await themeList.waitFor({state:'detached'});
  assert.equal(await page.getByRole('textbox',{name:'Search settings',exact:true}).evaluate(el=>document.activeElement===el),true);
  // B23: in the reference-sized dialog (JD rail clamp) the open popup sits over the Code font field, so the outside
  // click lands on the nav's Search settings field, which the popup never covers. Focus starts in the popup search.
  const settingsSearchBox = page.getByRole('textbox',{name:'Search settings',exact:true});
  await darkSelect.click();await themeSearch.waitFor();await settingsSearchBox.click();await themeList.waitFor({state:'detached'});
  assert.equal(await settingsSearchBox.evaluate(el=>document.activeElement===el),true,'outside click keeps focus in the newly chosen field');
  checks.push('CDS theme selection uses source control height/16px caret/4px popup padding, anchor width and <=320px scrolling; search ignores accents/case, empty Enter cannot save, Escape/Tab preserve settings and logical focus; Cmd+F reaches settings search and outside clicks retain the chosen field');
  // Preview geometry and content (light app mode first).
  const previewFrames = page.locator(".ss-theme-preview-frame");
  await page.locator(".ss-theme-preview[data-highlighted]").nth(1).waitFor({ state: "attached" });
  const previewMetrics = () => page.evaluate(() => {
    const dialog = document.querySelector(".ss-dialog");
    const probe = document.createElement("div"); probe.style.width = "var(--radius-lg)"; probe.style.position = "absolute"; dialog.appendChild(probe);
    const radius = getComputedStyle(probe).width; probe.remove();
    return { radius, frames: [...document.querySelectorAll(".ss-theme-preview-frame")].map((frame) => {
      const style = getComputedStyle(frame), preview = frame.querySelector(".ss-theme-preview");
      const marker = (type) => [...preview.querySelectorAll(`[data-diff-row="${type}"] .sdiff-marker`)].map((node) => node.textContent);
      const token = [...preview.querySelectorAll("[data-code-token]")].find((span) => span.textContent === "function");
      const rows = [...preview.querySelectorAll(".sdiff-row")];
      const probe = document.createElement("span"); probe.style.cssText = "position:absolute;width:1ch;height:1lh;"; rows[0].appendChild(probe);
      const ch = probe.getBoundingClientRect().width, lh = probe.getBoundingClientRect().height; probe.remove();
      const gutter = rows.map((row) => {
        const number = row.querySelector(".sdiff-line-number"), rect = row.getBoundingClientRect(), numberRect = number.getBoundingClientRect();
        const content = row.querySelector(".sdiff-line-content").getBoundingClientRect(), markerRect = row.querySelector(".sdiff-marker").getBoundingClientRect();
        return { paddingLeft: parseFloat(getComputedStyle(number).paddingLeft), paddingRight: parseFloat(getComputedStyle(number).paddingRight), figureWidth: number.firstElementChild.getBoundingClientRect().width,
          numberWidth: numberRect.width, markerLeft: markerRect.left - numberRect.right, markerWidth: markerRect.width, markerHeight: markerRect.height,
          contentLeft: content.left - rect.left, contentRight: rect.right - content.right, numberColor: getComputedStyle(number).color };
      });
      return { height: frame.offsetHeight, borderRadius: style.borderRadius, borderWidth: style.borderTopWidth, overflow: style.overflow,
        mode: preview.dataset.mode, theme: preview.dataset.codeTheme, background: getComputedStyle(preview).backgroundColor,
        ch, lh, numbers: rows.map((row) => row.querySelector(".sdiff-line-number")?.textContent ?? null), gutter,
        removed: marker("removed"), added: marker("added"), rows: preview.querySelectorAll(".sdiff-row").length,
        greet: preview.textContent.includes("greet"), lines: [...preview.querySelectorAll(".sdiff-line-content")].map((node) => node.textContent), tokens: preview.querySelectorAll("[data-code-token]").length, functionColor: token ? getComputedStyle(token).color : null,
        // Fidelity F14: ca7ba268c lineDiffType 'word-alt' emphasis on the paired removed/added rows.
        diffSpans: Object.fromEntries(["context", "removed", "added"].map((type) => [type, preview.querySelectorAll(`[data-diff-row="${type}"] [data-diff-span]`).length])),
        diffSpanBackgrounds: ["removed", "added"].map((type) => { const span = preview.querySelector(`[data-diff-row="${type}"] [data-diff-span]`); return span ? getComputedStyle(span).backgroundColor : null; }) };
    }) };
  });
  metrics.previewLight = await previewMetrics();
  const assertPreviews = (report, light, dark) => {
    assert.equal(report.frames.length, 2);
    for (const frame of report.frames) {
      assert.ok(frame.height >= 94, `preview height ${frame.height}`); assert.equal(frame.borderRadius, report.radius); assert.equal(frame.borderWidth, "1px"); assert.equal(frame.overflow, "clip");
      assert.deepEqual(frame.removed, ["-"]); assert.deepEqual(frame.added, ["+"]); assert.equal(frame.rows, 4); assert.equal(frame.greet, true); assert.ok(frame.tokens > 0, "preview is highlighted");
      assert.deepEqual(frame.lines, ["function greet(name: string) {", '  return "Hello, " + name;', "  return `Hello, ${name}!`;", "}"], "token spans keep the exact source whitespace");
      // pierre unified gutter with line numbers enabled (official _i keeps disableLineNumbers=false): the addition
      // line's number (else the deletion's), padded calc(2ch + 5px) / 1ch around a ≥3ch figure, then a 2ch classic
      // indicator inset with the 1ch marker at its left edge and 1ch kept on the right of wrapped lines.
      assert.deepEqual(frame.numbers, ["1", "2", "2", "3"]);
      assert.equal(frame.diffSpans.context, 0); assert.ok(frame.diffSpans.removed >= 1 && frame.diffSpans.added >= 1, "word-alt emphasis on the changed fragments");
      assert.ok(frame.diffSpanBackgrounds.every((color) => color && color !== "rgba(0, 0, 0, 0)"), `emphasis paints in ${frame.mode}: ${frame.diffSpanBackgrounds}`);
      const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) <= 0.6, `${label}: ${actual} vs ${expected}`);
      assert.ok(frame.ch > 5 && frame.ch < 10, `1ch of the preview mono font: ${frame.ch}`);
      for (const [index, cell] of frame.gutter.entries()) {
        near(cell.paddingLeft, 2 * frame.ch + 5, `row ${index} number padding-left`); near(cell.paddingRight, frame.ch, `row ${index} number padding-right`);
        near(cell.figureWidth, 3 * frame.ch, `row ${index} figure min-width 3ch`); near(cell.numberWidth, 6 * frame.ch + 5, `row ${index} number cell width`);
        near(cell.markerLeft, 0, `row ${index} marker at the line's left edge`); near(cell.markerWidth, frame.ch, `row ${index} marker width`); near(cell.markerHeight, frame.lh, `row ${index} marker height 1lh`);
        near(cell.contentLeft, 8 * frame.ch + 5, `row ${index} text start`); near(cell.contentRight, frame.ch, `row ${index} right inset`);
      }
    }
    assert.equal(report.frames[0].mode, "light"); assert.equal(report.frames[1].mode, "dark");
    assert.equal(report.frames[0].theme, light); assert.equal(report.frames[1].theme, dark);
    assert.equal(report.frames[0].background, rgb(themeColors[light].bg)); assert.equal(report.frames[1].background, rgb(themeColors[dark].bg));
  };
  assertPreviews(metrics.previewLight, "claude-light", "claude-dark");
  assert.equal(metrics.previewLight.frames[0].functionColor, "rgb(197, 98, 27)"); assert.equal(metrics.previewLight.frames[1].functionColor, "rgb(204, 123, 244)");
  await page.screenshot({ path: path.join(directory, "code-themes-light-app.png") });
  await closeSettings();
  // Transcript color under Claude Dark, then GitHub Dark.
  await setTheme("dark");
  await waitFunctionColor("rgb(204, 123, 244)");
  metrics.claudeDarkFunction = await functionTokenColor();
  await openSettings("Code");
  await darkSelect.click();await themeSearch.fill('GitHub Dark');
  await themeList.locator('[role=option][data-value="github-dark"][data-highlighted]').waitFor();
  await themeSearch.press('Enter');await themeList.waitFor({state:'detached'});
  await waitPref("codeThemeDark", "github-dark");
  await page.waitForFunction(() => !document.querySelector('[aria-label="Dark code theme"]').disabled);
  assert.equal(await darkSelect.getAttribute("data-value"), "github-dark");
  await page.locator('.ss-theme-preview[data-code-theme="github-dark"][data-highlighted]').waitFor({ state: "attached" });
  // Fidelity F14: the select and the preview's data-code-theme show the pending (optimistic) value at once, while the
  // preview colours come from the committed pair (main.jsx --code-theme-*-bg and the worker's theme pair), which lands
  // when the settings IPC resolves (and the worker then re-tokenizes both previews); wait for that commit and the
  // re-highlight before measuring.
  await page.waitForFunction((bg) => {
    const previews = [...document.querySelectorAll(".ss-theme-preview")], dark = document.querySelector('.ss-theme-preview[data-code-theme="github-dark"]');
    const fn = dark && [...dark.querySelectorAll("[data-code-token]")].find((span) => span.textContent === "function");
    return dark && getComputedStyle(dark).backgroundColor === bg && fn && getComputedStyle(fn).color === "rgb(249, 117, 131)"
      && previews.length === 2 && previews.every((node) => node.hasAttribute("data-highlighted") && node.querySelector("[data-code-token]"));
  }, rgb(themeColors["github-dark"].bg));
  metrics.previewDark = await previewMetrics();
  assertPreviews(metrics.previewDark, "claude-light", "github-dark");
  assert.equal(metrics.previewDark.frames[0].functionColor, "rgb(197, 98, 27)", "the light preview stays light while the app is dark");
  assert.equal(metrics.previewDark.frames[1].functionColor, "rgb(249, 117, 131)");
  await page.screenshot({ path: path.join(directory, "code-themes-dark-app.png") });
  await closeSettings();
  // github-dark keyword foreground #f97583 (the official chunk cd14a9327 carries the same value; it has no #ff7b72).
  await waitFunctionColor("rgb(249, 117, 131)");
  metrics.githubDarkFunction = await functionTokenColor();
  // The retained stream fence is released to the settled path under the new pair; the twelve fences (more than the
  // service admits at once) all re-tokenize under GitHub Dark instead of falling back to plain text.
  await waitStreamedFence("settled", "rgb(249, 117, 131)");
  metrics.streamedGithubDark = await streamedFence();
  await waitFenceStates("sa-fences", "const", MANY_FENCE_COUNT, "settled", "rgb(249, 117, 131)");
  metrics.manyFencesGithubDark = await fenceStates("sa-fences", "const");
  await setTheme("light");
  await waitFunctionColor("rgb(197, 98, 27)");
  metrics.lightFunction = await functionTokenColor();
  await waitStreamedFence("settled", "rgb(197, 98, 27)");
  await setTheme("dark");
  await openSettings("Code");
  await chooseSetting(page,"Dark code theme","claude-dark");
  await waitPref("codeThemeDark", "claude-dark");
  await closeSettings();
  await waitFunctionColor("rgb(204, 123, 244)");
  await waitStreamedFence("settled", "rgb(204, 123, 244)");
  await waitFenceStates("sa-fences", "const", MANY_FENCE_COUNT, "settled", "rgb(204, 123, 244)");
  metrics.manyFencesClaudeDark = await fenceStates("sa-fences", "const");
  metrics.rejected = await page.evaluate(async () => {
    const attempt = async (patch) => { try { await window.desktop.call("settings", patch); return "accepted"; } catch (error) { return error.message; } };
    return { crossMode: await attempt({ codeThemeDark: "github-light" }), unknown: await attempt({ codeThemeLight: "nope" }) };
  });
  assert.notEqual(metrics.rejected.crossMode, "accepted"); assert.notEqual(metrics.rejected.unknown, "accepted");
  const afterReject = await prefs();
  assert.equal(afterReject.codeThemeDark, "claude-dark"); assert.equal(afterReject.codeThemeLight, undefined);
  checks.push("GitHub Dark persists, re-tokenizes the transcript fence (function → #f97583 in dark, #c5621b unchanged in light), Claude Dark restores #cc7bf4; the retained stream fence is released and re-tokenized under each pair (settled, const #f97583 / #c5621b / #cc7bf4); all twelve seeded fences re-tokenize under every pair (no queue-limit plain fallback); previews ≥94px/rounded-lg/1px/clip with one - and one + row, unified line-number gutter 1/2/2/3 with 2ch+5px / ≥3ch / 1ch cells and the 2ch classic inset, forced light preview in a dark app; cross-mode and unknown ids rejected over raw IPC");

  // C. Default transcript view.
  await openSettings("Code");
  const viewGroup = page.getByRole("radiogroup", { name: "Default transcript view", exact: true });
  metrics.viewRadios = await viewGroup.getByRole("radio").evaluateAll((nodes) => nodes.map((node) => [node.getAttribute("aria-label"), node.getAttribute("aria-checked")]));
  assert.deepEqual(metrics.viewRadios, [["Normal", "true"], ["Thinking", "false"], ["Verbose", "false"]]);
  await viewGroup.getByRole("radio", { name: "Thinking", exact: true }).click();
  await waitPref("transcriptView", "thinking");
  await closeSettings();
  await page.locator(".source-reasoning").first().waitFor();
  metrics.thinkingReasoning = await page.locator(".source-reasoning").count();
  assert.ok(metrics.thinkingReasoning >= 2, "seeded and streamed reasoning both render under Thinking");
  // H2/U2 (scroll-messages-current.js:44475-44545): the seeded thought precedes
  // the seeded command, so it is an open "Thought process" step; the streamed
  // thought precedes the reply, so it is the plain italic block with no step.
  metrics.thinkingRows = await page.evaluate(() => [...document.querySelectorAll(".source-reasoning")].map((node) => ({
    id: node.dataset.transcriptItemId, step: node.matches(".source-reasoning-step"),
    label: node.querySelector(".source-step-label")?.textContent ?? null,
    expanded: node.querySelector(".source-step-trigger")?.getAttribute("aria-expanded") ?? null,
    italic: getComputedStyle(node.querySelector(".source-reasoning-text") ?? node).fontStyle,
    copy: node.querySelector('button[aria-label="Copy as quote"]') !== null })));
  const seededRow = metrics.thinkingRows.find((row) => row.id === "sa-reasoning");
  assert.deepEqual(seededRow, { id: "sa-reasoning", step: true, label: "Thought process", expanded: "true", italic: "normal", copy: true });
  const blocks = metrics.thinkingRows.filter((row) => !row.step);
  assert.ok(blocks.length >= 1 && blocks.every((row) => row.expanded === null && row.italic === "italic" && row.copy), "standalone thinking is a plain italic block with Copy as quote");
  metrics.thinkingSteps = metrics.thinkingRows.filter((row) => row.step).length;
  const rememberedReasoning = page.locator('.source-reasoning-step').first();
  const rememberedReasoningId = await rememberedReasoning.getAttribute('data-transcript-item-id');
  await rememberedReasoning.locator('.source-step-trigger').focus();
  await rememberedReasoning.locator('.source-step-trigger').press('Enter');
  assert.equal(await rememberedReasoning.locator('.source-step-trigger').getAttribute('aria-expanded'),'false');
  await openSettings("Code");
  await viewGroup.getByRole("radio", { name: "Verbose", exact: true }).click();
  await waitPref("transcriptView", "verbose");
  await closeSettings();
  await page.waitForFunction(() => { const steps = [...document.querySelectorAll(".transcript .source-step-trigger[aria-expanded]")]; return steps.length > 0 && steps.every((node) => node.getAttribute("aria-expanded") === "true"); });
  metrics.verbose = await page.evaluate(() => ({ reasoning: document.querySelectorAll(".source-reasoning").length, steps: document.querySelectorAll(".transcript .source-step-trigger[aria-expanded]").length,
    expanded: document.querySelectorAll(".transcript .source-step-trigger[aria-expanded='true']").length, details: document.querySelectorAll(".transcript .source-step-detail").length }));
  assert.ok(metrics.verbose.reasoning >= 2); assert.equal(metrics.verbose.expanded, metrics.verbose.steps); assert.equal(metrics.verbose.details, metrics.verbose.steps);
  // approval-current PN:16834–16875: Verbose forces open and does not
  // overwrite the explicit row preference on activation.
  const forcedRow = page.locator(".source-reasoning .source-step-trigger").first();
  await forcedRow.focus(); await forcedRow.press("Enter");
  assert.equal(await forcedRow.getAttribute("aria-expanded"), "true");
  await page.screenshot({ path: path.join(directory, "verbose-view.png") });
  await openSettings("Code");
  await viewGroup.getByRole("radio", { name: "Normal", exact: true }).click();
  await waitPref("transcriptView", "normal");
  await closeSettings();
  await page.waitForFunction(() => document.querySelectorAll(".source-reasoning").length === 0);
  // dN:16578–16589 is independent of a rendered row's lifetime.
  await openSettings("Code");
  await viewGroup.getByRole("radio", {name:"Thinking",exact:true}).click();await waitPref("transcriptView","thinking");await closeSettings();
  const restoredReasoning=page.locator(`[data-transcript-item-id="${rememberedReasoningId}"] .source-step-trigger`);
  await restoredReasoning.waitFor();assert.equal(await restoredReasoning.getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('.source-reasoning .source-step-trigger[aria-expanded="true"]').count(),metrics.thinkingSteps-1);
  await openSettings("Code");await viewGroup.getByRole("radio",{name:"Normal",exact:true}).click();await waitPref("transcriptView","normal");await closeSettings();
  await page.waitForFunction(()=>document.querySelectorAll('.source-reasoning').length===0);
  checks.push('Explicit reasoning-row expansion survives Normal unmount and Thinking remount; Verbose activation does not overwrite it');
  checks.push("Default transcript view: Normal checked on a fresh profile; Thinking persists and renders thinking before tools as an open Thought process step and other thinking as a plain italic block, each with Copy as quote; Verbose renders reasoning with every step expanded; Normal hides reasoning again");

  // Session menu override.
  let { menu, trigger, submenu } = await transcriptViewMenu();
  metrics.menuA = await submenu.evaluate((node) => [...node.querySelectorAll('[role^="menuitem"]')].map((item) => [item.getAttribute("role"), item.dataset.label, item.getAttribute("aria-checked")]));
  assert.deepEqual(metrics.menuA, [["menuitemradio", "Normal", "true"], ["menuitemradio", "Thinking", "false"], ["menuitemradio", "Verbose", "false"]], "Thinking is offered for a session with reasoning; no make-default row while following the default");
  assert.equal(await trigger.getAttribute("aria-haspopup"), "menu");
  await submenu.getByRole("menuitemradio", { name: "Verbose", exact: true }).click();
  await menu.waitFor({ state: "detached" });
  await page.waitForFunction(() => { const steps = [...document.querySelectorAll(".transcript .source-step-trigger[aria-expanded]")]; return document.querySelectorAll(".source-reasoning").length >= 2 && steps.every((node) => node.getAttribute("aria-expanded") === "true"); });
  assert.equal((await prefs()).transcriptView, "normal", "a session choice does not change the default");
  metrics.sessionStorage = await page.evaluate(() => JSON.parse(localStorage.getItem("code-desktop-transcript-view-by-session")));
  assert.deepEqual(metrics.sessionStorage, { [A]: "verbose" });
  ({ menu, trigger, submenu } = await transcriptViewMenu());
  metrics.menuAVerbose = await submenu.evaluate((node) => [...node.querySelectorAll('[role^="menuitem"], [role="separator"]')].map((item) => [item.getAttribute("role"), item.dataset.label ?? null, item.getAttribute("aria-checked")]));
  assert.deepEqual(metrics.menuAVerbose, [["menuitemradio", "Normal", "false"], ["menuitemradio", "Thinking", "false"], ["menuitemradio", "Verbose", "true"], ["separator", null, null], ["menuitem", "Make Verbose the default", null]]);
  await page.screenshot({ path: path.join(directory, "transcript-view-submenu.png") });
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
  await menu.waitFor({ state: "detached" });
  await openSession("Settings rest B");
  await page.locator(".assistant-message").filter({ hasText: "Session B answer" }).waitFor();
  ({ menu, trigger, submenu } = await transcriptViewMenu());
  metrics.menuB = await submenu.evaluate((node) => [...node.querySelectorAll('[role^="menuitem"]')].map((item) => [item.getAttribute("role"), item.dataset.label, item.getAttribute("aria-checked")]));
  assert.deepEqual(metrics.menuB, [["menuitemradio", "Normal", "true"], ["menuitemradio", "Verbose", "false"]], "no Thinking row without reasoning; session B still follows the default");
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
  await menu.waitFor({ state: "detached" });
  await openSession("Settings rest A");
  await page.locator(".source-reasoning").first().waitFor();
  ({ menu, trigger, submenu } = await transcriptViewMenu());
  await submenu.getByRole("menuitem", { name: "Make Verbose the default", exact: true }).click();
  await menu.waitFor({ state: "detached" });
  await waitPref("transcriptView", "verbose");
  ({ menu, trigger, submenu } = await transcriptViewMenu());
  assert.equal(await submenu.getByRole("menuitem", { name: /Make .* the default/ }).count(), 0, "make-default row disappears once the session view is the default");
  // Two Escapes inside 500 ms are Esc Esc (Rewind; code-workspace.js Gl counts them even after a menu took the first),
  // so the menu is closed with one Escape, and a second goes only to a menu still open, after that window.
  await page.keyboard.press("Escape");
  await submenu.waitFor({ state: "detached" });
  if (await menu.isVisible()) { await page.waitForTimeout(600); await page.keyboard.press("Escape"); }
  await menu.waitFor({ state: "detached" });
  assert.equal(await page.getByRole("dialog", { name: "Rewind session" }).count(), 0, "closing the session menu does not open Rewind");
  await openSession("Settings rest B");
  await page.locator(".assistant-message").filter({ hasText: "Session B answer" }).waitFor();
  await page.waitForFunction(() => { const steps = [...document.querySelectorAll(".transcript .source-step-trigger[aria-expanded]")]; return steps.every((node) => node.getAttribute("aria-expanded") === "true"); });
  checks.push("Session menu Transcript view submenu: radio rows, Thinking gated on reasoning, a session pick changes only that session (localStorage map), Make Verbose the default writes preferences.json and the row disappears");
  // cc011544b:535–616,948–1118: ranked popup hits select a section/row; content is not filtered.
  await openSettings("Code");
  const search = page.getByRole("textbox", { name: "Search settings" });
  await search.fill("transcript");
  // cc011544b Z/gt:614–830 groups multiple row matches under their destination section.
  metrics.searchTranscript = await page.locator(".ss-search-results>button").evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('.ss-search-heading>span:not([data-cds=Icon]),.ss-search-via,.ss-search-child')].map(el=>el.textContent).join('')));
  assert.deepEqual(metrics.searchTranscript, ["Code", "Transcript text size", "Transcript width", "Default transcript view"]);
  await search.fill("theme");
  metrics.searchTheme = await page.locator(".ss-search-results>button").evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('.ss-search-heading>span:not([data-cds=Icon]),.ss-search-via,.ss-search-child')].map(el=>el.textContent).join('')));
  // C4: the Theme page (label match, no indexed rows) ranks first.
  assert.deepEqual(metrics.searchTheme, ["Theme", "GeneralTheme", "CodeCode theme"]);
  await page.getByRole("button",{name:"Code theme in Code",exact:true}).click();
  assert.equal(await page.getByRole("combobox", { name: "Light code theme", exact: true }).count(), 1, "the search result opens the real code theme block");
  await closeSettings();
  checks.push("Settings search: 'transcript' → Code + 3 child rows, 'theme' → General/Code with exact matched subtitles");
  // Restart: per-session override and defaults persist.
  await app.close(); app = null;
  await launch();
  await openSession("Settings rest A");
  await page.locator(".source-reasoning").first().waitFor();
  ({ menu, trigger, submenu } = await transcriptViewMenu());
  metrics.menuAfterRestart = await submenu.evaluate((node) => [...node.querySelectorAll('[role^="menuitem"]')].map((item) => [item.dataset.label, item.getAttribute("aria-checked")]));
  assert.deepEqual(metrics.menuAfterRestart, [["Normal", "false"], ["Thinking", "false"], ["Verbose", "true"]]);
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
  await menu.waitFor({ state: "detached" });
  metrics.restartStorage = await page.evaluate(() => JSON.parse(localStorage.getItem("code-desktop-transcript-view-by-session")));
  assert.deepEqual(metrics.restartStorage, { [A]: "verbose" });
  const restarted = await prefs();
  assert.equal(restarted.transcriptView, "verbose"); assert.equal(restarted.codeThemeDark, "claude-dark"); assert.equal(restarted.interfaceFont, "anthropic");
  checks.push("Full restart keeps the per-session transcript view (localStorage) and the persisted defaults");
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
} finally {
  await app?.close().catch((error) => { failure ||= error; });
  if (build) await verifySource().catch((error) => { failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch((error) => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "settings-rest-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, rendererErrors, failedRequests, consoleErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "settings-rest-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined }, null, 2));
}
if (failure) throw failure;
