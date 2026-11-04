import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {fillComposer} from "./composer-test-helpers.mjs";

// Run only after a fresh build. Uses a new isolated profile/workspace and the
// protocol fixture. The real system clipboard is saved in memory and restored.
const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(root, "../analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const directory=await fs.mkdtemp(path.join(evidence,"code-fence-ui-"));
const profile = path.join(directory,"profile");await fs.mkdir(profile);
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
const threadId = "code-fence-ui-thread", itemId = "code-fence-static-reply";
const now = Math.floor(Date.now() / 1000);
const plain = "PLAIN_ONE_LINE";
const spaced = '\tconst whitespace = "KEEP";  \n\n';
const long = 'const longValue = "' + "WRAP_TOKEN_".repeat(90) + '";';
const htmlText = '<img src=x onerror="globalThis.FENCE_XSS=true">';
// F06 fixtures: a multi-line fence for triple-click and the context menu, and a
// DeepSeek-shaped key (sk- and 32 hex, assembled here so no literal key is
// stored) in a fence and in inline code for secret masking.
const MULTI = "line_one = 1\nline_two = 2\nline_three = 3";
const SECRET = "sk-" + "0123456789abcdef".repeat(2);
const MASKED_SECRET = SECRET.slice(0, 8) + "\u2022".repeat(SECRET.length - 8);
const secretFence = `export DEEPSEEK_API_KEY=${SECRET}\ncurl -H "Authorization: Bearer $DEEPSEEK_API_KEY" https://api.deepseek.com`;
const maskedFence = secretFence.replace(SECRET, MASKED_SECRET);
const staticText = [
  "Inline `INLINE_ONLY` stays inline.",
  "- Key `" + SECRET + "` stays masked.",
  "```\n" + plain + "\n```",
  "```js\n" + spaced + "\n```",
  "```js\n" + long + "\n```",
  "```html\n" + htmlText + "\n```",
  "```\n```",
  "```python\n" + MULTI + "\n```",
  "```bash\n" + secretFence + "\n```",
  "    INDENTED_CODE",
].join("\n\n");
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "fixture", threadIds: [threadId], sidebarWidth: 288,
}));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: {
  [threadId]: { id: threadId, cwd: workspace, name: "Code fence verification", createdAt: now, updatedAt: now,
    archived: false, turns: [{ id: "code-fence-static-turn", status: "completed", items: [
      { id: "code-fence-static-user", type: "userMessage", content: [{ type: "text", text: "Inspect isolated Markdown code blocks." }] },
      { id: itemId, type: "agentMessage", text: staticText },
    ] }] },
} }));
const build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_HOME:path.join(profile,"codex-home"), CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE;
await fs.mkdir(env.CODEX_HOME);delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const sha=b=>createHash('sha256').update(b).digest('hex');let testHashes;
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);assert.equal(JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')).sourceSha256,build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);const hashes=Object.fromEntries(await Promise.all(['scripts/code-fence-ui-test.mjs','scripts/composer-test-helpers.mjs','tests/fixtures/codex-server.cjs'].map(async f=>[f,sha(await fs.readFile(path.join(root,f)))])));if(testHashes)assert.deepEqual(hashes,testHashes);else testHashes=hashes;}
const checks = [], metrics = {}, errors = [];
let app, page, failure, clipboardSaved = false, clipboardRestored = false;
try {
  await integrity();
  app = await electron.launch({ executablePath, args: [root], env });
  page = await app.firstWindow();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) => errors.push(error.message));
  metrics.clipboardApi = await app.evaluate(async ({ clipboard, ClipboardItem }) => {
    if (typeof clipboard.read === "function" && typeof ClipboardItem === "function") {
      const originals = await clipboard.read();
      const items = await Promise.all(originals.map(async (item) => new ClipboardItem(
        Object.fromEntries(await Promise.all(item.types.map(async (type) => [type, await item.getType(type)]))),
      )));
      globalThis.codeFenceClipboardBackup = { kind: "items", items };
      return "async ClipboardItem[]";
    }
    const data = { text: await clipboard.readText() };
    if (typeof clipboard.readHTML === "function") data.html = clipboard.readHTML();
    if (typeof clipboard.readRTF === "function") data.rtf = clipboard.readRTF();
    if (typeof clipboard.readImage === "function") {
      const image = clipboard.readImage();
      if (!image.isEmpty()) data.image = image;
    }
    if (typeof clipboard.readBookmark === "function") {
      const bookmark = clipboard.readBookmark();
      if (bookmark.title) data.bookmark = bookmark.title;
    }
    const empty = typeof clipboard.availableFormats === "function" && clipboard.availableFormats().length === 0;
    globalThis.codeFenceClipboardBackup = { kind: typeof clipboard.readHTML === "function" ? "legacy" : "text", empty, data };
    return typeof clipboard.readHTML === "function" ? "legacy formats" : "text";
  });
  clipboardSaved = true;
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Test model" }).waitFor();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768));
  await page.locator(`[data-source-session-id="${threadId}"] .source-session-open`).click();
  const message = page.locator(`[data-transcript-item-id="${itemId}"]`);
  await message.locator(".scb-block").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await message.locator(".scb-block").count(), 8);
  assert.equal(await message.locator(".scb-pre > .scb-code").allTextContents().then((values) => JSON.stringify(values)),
    JSON.stringify([plain, spaced, long, htmlText, "", MULTI, maskedFence, "INDENTED_CODE"]));
  assert.equal(await message.locator(".source-markdown > p > code").textContent(), "INLINE_ONLY");
  assert.equal(await message.locator("img, script").count(), 0);
  assert.equal(await page.evaluate(() => !!globalThis.FENCE_XSS), false);
  assert.equal(await message.locator(".scb-block header, .scb-block [aria-expanded], .scb-block .sdiff-line-number").count(), 0);
  checks.push("Real react-markdown renders eight full logical code bodies, keeps inline code separate, escapes HTML, and adds no header/gutter/collapse control");

  const first = message.locator(".scb-flow").nth(0), second = message.locator(".scb-flow").nth(1);
  metrics.geometry = await first.locator(".scb-block").evaluate((block) => {
    const pre = block.querySelector("pre"), code = pre.querySelector("code"), button = block.querySelector("button");
    const style = getComputedStyle(pre), bodyStyle = getComputedStyle(block.querySelector(".scb-body"));
    const probe = document.createElement("span");
    probe.style.cssText = `position:absolute;width:1ch;font:${style.font};`;
    pre.append(probe);
    const ch = probe.getBoundingClientRect().width;
    probe.remove();
    return { blockWidth: block.getBoundingClientRect().width, fontSize: style.fontSize, lineHeight: style.lineHeight,
      codeLineHeight: getComputedStyle(code).lineHeight, whiteSpace: style.whiteSpace, overflowWrap: style.overflowWrap,
      paddingTop: parseFloat(style.paddingTop), paddingLeft: parseFloat(style.paddingLeft), paddingRight: parseFloat(style.paddingRight), ch,
      radius: bodyStyle.borderRadius, background: style.backgroundColor, buttonWidth: button.getBoundingClientRect().width,
      glyphSize: getComputedStyle(button.querySelector('[data-cds="Icon"]')).fontSize,
      buttonRight: block.getBoundingClientRect().right - button.getBoundingClientRect().right,
      outline: getComputedStyle(block.querySelector(".scb-body"), "::after").boxShadow };
  });
  const m = metrics.geometry, near = (value, expected, label) => assert.ok(Math.abs(value - expected) < .15, `${label}: ${value} != ${expected}`);
  assert.equal(m.fontSize, "12px"); assert.equal(m.lineHeight, "17px"); assert.equal(m.codeLineHeight, "17px");
  assert.equal(m.whiteSpace, "pre-wrap"); assert.equal(m.overflowWrap, "break-word");
  near(m.blockWidth, 318, "Short card minimum"); near(m.paddingTop, 8, "Top padding");
  near(m.paddingLeft - m.ch, 10, "Left character inset"); near(m.paddingRight - m.ch, 38, "Copy reservation");
  assert.equal(m.radius, "8px"); assert.equal(m.background, "rgb(255, 255, 255)");
  near(m.buttonWidth, 24, "Copy control"); near(m.buttonRight, 7, "Copy right inset"); assert.equal(m.glyphSize, "16px");
  assert.match(m.outline, /inset/);
  await second.getByRole("button", { name: "Copy code", exact: true }).click();
  await second.getByRole("status").filter({ hasText: "Copied" }).waitFor({ state: "attached" });
  assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), spaced);
  // A trusted Shift+Tab records keyboard modality for the DOM focus that follows (a Tab inside the transcript moves
  // to the composer, cc43287c9 :45157-45164, so Tab / Shift+Tab no longer round-trips between fence buttons).
  await first.getByRole("button", { name: "Copy code", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await first.getByRole("button", { name: "Copy code", exact: true }).focus();
  assert.notEqual(await first.locator("button").evaluate((button) => getComputedStyle(button).boxShadow), "none");
  await first.locator("button").press("Enter");
  await first.getByRole("button", { name: "Copied", exact: true }).waitFor();
  assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), plain);
  await first.getByRole("button", { name: "Copy code", exact: true }).waitFor();
  checks.push("Compact geometry matches source tokens; pointer/keyboard Copy uses the real clipboard, preserves whitespace, and resets successful feedback");

  await page.evaluate(() => {
    globalThis.codeFenceWriteDescriptor = Object.getOwnPropertyDescriptor(navigator.clipboard, "writeText");
    Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: async () => { throw new DOMException("Isolated clipboard denial", "NotAllowedError"); } });
  });
  await first.getByRole("button", { name: "Copy code", exact: true }).click();
  await first.getByRole("status").filter({ hasText: "Couldn’t copy to the clipboard. Try again." }).waitFor({ state: "attached" });
  assert.equal(await first.getByRole("button", { name: "Copied", exact: true }).count(), 0);
  await page.evaluate(() => {
    if (globalThis.codeFenceWriteDescriptor) Object.defineProperty(navigator.clipboard, "writeText", globalThis.codeFenceWriteDescriptor);
    else delete navigator.clipboard.writeText;
    delete globalThis.codeFenceWriteDescriptor;
  });
  checks.push("Injected clipboard denial produces truthful failure feedback, never a false Copied state");

  // F06 triple-click (code-block-current.js:1244-1266 Rr): three real clicks on the middle line select the
  // whole fence and nothing outside it.
  const readText = () => app.evaluate(({ clipboard }) => clipboard.readText());
  const multi = message.locator(".scb-block").nth(5), secretBlock = message.locator(".scb-block").nth(6);
  await multi.scrollIntoViewIfNeeded();
  const multiBox = await multi.locator(".scb-code").boundingBox();
  await page.mouse.click(multiBox.x + 30, multiBox.y + multiBox.height / 2, { clickCount: 3 });
  metrics.tripleClick = await multi.evaluate((block) => {
    const selection = getSelection(), range = selection.rangeCount ? selection.getRangeAt(0) : null;
    return { text: selection.toString(), codeText: block.querySelector(".scb-body").dataset.codeText,
      inside: !!range && block.contains(range.startContainer) && block.contains(range.endContainer) };
  });
  assert.equal(metrics.tripleClick.codeText, MULTI);
  assert.equal(metrics.tripleClick.text.trimEnd(), MULTI, "triple-click selects exactly data-code-text");
  assert.ok(metrics.tripleClick.inside, "the selection stays inside the fence");
  await page.evaluate(() => getSelection().removeAllRanges());
  // F06 context menu (scroll-messages-current.js:33652-33818 CY): right-click on the fence -> Copy code block.
  await page.mouse.click(multiBox.x + multiBox.width - 4, multiBox.y + 4, { button: "right" });
  const contextMenu = page.getByRole("menu", { name: "Message actions", exact: true });
  await contextMenu.waitFor();
  metrics.fenceMenu = (await contextMenu.locator('[role="menuitem"]').evaluateAll((nodes) => nodes.map((node) => node.dataset.label)));
  assert.ok(metrics.fenceMenu.includes("Copy code block") && metrics.fenceMenu.includes("Copy message") && metrics.fenceMenu.includes("Copy message as Markdown"), JSON.stringify(metrics.fenceMenu));
  assert.ok(metrics.fenceMenu.indexOf("Copy code block") < metrics.fenceMenu.indexOf("Copy message"));
  assert.equal(await contextMenu.getAttribute("data-cds"), "ContextMenu");
  await contextMenu.getByRole("menuitem", { name: "Copy code block", exact: true }).click();
  await contextMenu.waitFor({ state: "detached" });
  for (let attempt = 0; attempt < 40 && await readText() !== MULTI; attempt += 1) await page.waitForTimeout(50);
  assert.equal(await readText(), MULTI, "Copy code block writes data-code-text");
  checks.push("Triple-click selects exactly one fence's data-code-text; right-click on it opens the CDS ContextMenu with Copy code block before the message items, and Copy code block writes data-code-text");

  // F06 secret masking (code-block-current.js:1021-1215, :1495-1532): the settled fence shows bullets, carries the
  // masked data-code-text and copies it; the ghost Eye toggle sits before Copy and reveals with aria-pressed.
  await secretBlock.scrollIntoViewIfNeeded();
  const secretBody = secretBlock.locator(".scb-body");
  assert.equal(await secretBlock.getAttribute("data-secrets"), "masked");
  assert.equal(await secretBody.getAttribute("data-code-text"), maskedFence);
  assert.ok(!(await secretBlock.textContent()).includes(SECRET));
  const reveal = secretBlock.getByRole("button", { name: "Reveal secret", exact: true });
  assert.equal(await reveal.getAttribute("aria-pressed"), "false");
  metrics.secretToolbar = await secretBlock.evaluate((block) => {
    const [toggle, copy] = block.querySelectorAll(".scb-actions button"), pre = block.querySelector("pre"), style = getComputedStyle(pre);
    const probe = document.createElement("span"); probe.style.cssText = `position:absolute;width:1ch;font:${style.font};`; pre.append(probe);
    const ch = probe.getBoundingClientRect().width; probe.remove();
    return { order: [toggle.getAttribute("aria-label"), copy.getAttribute("aria-label")], toggleRight: toggle.getBoundingClientRect().right,
      copyLeft: copy.getBoundingClientRect().left, reserve: parseFloat(style.paddingRight) - ch, color: getComputedStyle(toggle).color,
      icon: getComputedStyle(toggle.querySelector('[data-cds="Icon"]')).fontSize };
  });
  assert.deepEqual(metrics.secretToolbar.order, ["Reveal secret", "Copy code"]);
  assert.ok(Math.abs(metrics.secretToolbar.copyLeft - metrics.secretToolbar.toggleRight - 3) < .5, "3px gap between the toggle and Copy");
  assert.ok(Math.abs(metrics.secretToolbar.reserve - 65) < .15, `Kr(2) reserve: ${metrics.secretToolbar.reserve}`);
  assert.equal(metrics.secretToolbar.icon, "16px");
  await secretBlock.getByRole("button", { name: "Copy code", exact: true }).click();
  await secretBlock.getByRole("button", { name: "Copied", exact: true }).waitFor();
  assert.equal(await readText(), maskedFence, "Copy writes the masked text while masked");
  await page.screenshot({ path: path.join(directory, "code-fence-secret-masked-light.png") });
  await reveal.click();
  const hide = secretBlock.getByRole("button", { name: "Hide secret", exact: true });
  await hide.waitFor();
  assert.equal(await hide.getAttribute("aria-pressed"), "true");
  assert.equal(await secretBlock.getAttribute("data-secrets"), "revealed");
  assert.equal(await secretBody.getAttribute("data-code-text"), secretFence);
  await secretBlock.locator(".scb-code").filter({ hasText: SECRET }).waitFor();
  metrics.secretPressed = {};
  for (const mode of ["light", "dark"]) {
    await page.evaluate((mode) => { document.documentElement.dataset.mode = mode; }, mode);
    await page.waitForTimeout(300); // .scb-copy transitions its background over 120ms
    metrics.secretPressed[mode] = await hide.evaluate((button) => {
      const probe = document.createElement("span"); probe.style.cssText = "position:absolute;background:var(--cds-fill-control);color:var(--cds-text-primary)";
      button.append(probe); const expected = getComputedStyle(probe); const result = { expectedBackground: expected.backgroundColor, expectedColor: expected.color };
      probe.remove(); const style = getComputedStyle(button);
      return { ...result, background: style.backgroundColor, color: style.color };
    });
    assert.equal(metrics.secretPressed[mode].background, metrics.secretPressed[mode].expectedBackground, `${mode} pressed toggle background`);
    assert.equal(metrics.secretPressed[mode].color, metrics.secretPressed[mode].expectedColor, `${mode} pressed toggle color`);
    await page.screenshot({ path: path.join(directory, `code-fence-secret-revealed-${mode}.png`) });
  }
  await page.evaluate(() => { document.documentElement.dataset.mode = "light"; });
  await hide.click();
  await reveal.waitFor();
  assert.equal(await secretBody.getAttribute("data-code-text"), maskedFence);
  // Inline code (markdown-current.js:4236-4252 Pc, Dr): bullets, sr-only 'Redacted {label}', a 12px toggle.
  const inline = message.locator("li code[data-epitaxy-inline-code]");
  assert.equal(await inline.getAttribute("data-code-text"), MASKED_SECRET);
  assert.equal(await inline.locator(".smd-secret-sr").textContent(), "Redacted OpenAI API key");
  assert.equal(await inline.locator('.smd-secret-value > [aria-hidden="true"]').textContent(), MASKED_SECRET);
  const inlineReveal = inline.getByRole("button", { name: "Reveal OpenAI API key", exact: true });
  assert.equal(await inlineReveal.locator('[data-cds="Icon"]').evaluate((icon) => getComputedStyle(icon).fontSize), "12px");
  await inlineReveal.click();
  const inlineHide = inline.getByRole("button", { name: "Hide OpenAI API key", exact: true });
  assert.equal(await inlineHide.getAttribute("aria-pressed"), "true");
  assert.equal(await inline.locator(".smd-secret-value").textContent(), SECRET);
  await page.evaluate(() => { document.documentElement.dataset.mode = "dark"; });
  await page.screenshot({ path: path.join(directory, "code-fence-secret-inline-dark.png") });
  await page.evaluate(() => { document.documentElement.dataset.mode = "light"; });
  await inlineHide.click();
  checks.push("A DeepSeek-shaped sk- key is masked in a settled fence (bullets, masked data-code-text and Copy, Reveal secret before Copy with the Kr(2) reserve, pressed fill-control/text-primary in light and dark) and in inline code (Redacted OpenAI API key, 12px Reveal/Hide toggle)");

  await page.evaluate(() => { document.documentElement.dataset.mode = "dark"; });
  assert.equal(await first.locator("pre").evaluate((pre) => getComputedStyle(pre).backgroundColor), "rgb(26, 26, 25)");
  await page.evaluate(() => { document.documentElement.dataset.mode = "light"; });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(800, 600));
  await page.waitForFunction(() => {
    const block = document.querySelector('[data-transcript-item-id="code-fence-static-reply"] .scb-block');
    return block && block.getBoundingClientRect().width <= block.parentElement.getBoundingClientRect().width + 1;
  });
  metrics.narrow = await message.locator(".scb-block").nth(2).evaluate((block) => {
    const pre = block.querySelector("pre");
    return { width: block.getBoundingClientRect().width, available: block.parentElement.getBoundingClientRect().width,
      scrollWidth: pre.scrollWidth, clientWidth: pre.clientWidth, height: pre.getBoundingClientRect().height };
  });
  assert.ok(metrics.narrow.width <= metrics.narrow.available + 1);
  assert.ok(metrics.narrow.scrollWidth <= metrics.narrow.clientWidth + 1);
  assert.ok(metrics.narrow.height > 50, "Long token must wrap vertically");
  checks.push("Dark default background is correct; a narrow long token wraps without introducing horizontal overflow");
  await page.screenshot({ path: path.join(directory, "code-fence-narrow.png") });

  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768));
  // The unfinished language line is a paced ~340ms state: response-pacing-model
  // (targetLagMs 550) attaches the placeholder ~500ms after send and the
  // fixture's first grow delta (codeFenceStream +800ms) replaces it. A CDP
  // waitFor -> evaluate round trip under load can outlast that window (final
  // sweep 0.2.98: 3/9 misses with an identical in-page timeline), so the same
  // state is snapshotted in-page by the first mutation that attaches it.
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      const message = [...document.querySelectorAll(".source-assistant-message")].find((node) => node.textContent.includes("CLOSED_PRIOR"));
      const placeholder = message?.querySelector(".scb-language-placeholder");
      if (!placeholder) return;
      observer.disconnect();
      globalThis.codeFenceOpeningState = { hidden: placeholder.getAttribute("aria-hidden"), text: placeholder.textContent,
        blocks: message.querySelectorAll(".scb-block").length,
        tailBlocks: placeholder.parentElement.querySelectorAll(".scb-block").length };
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  });
  await fillComposer(page,page.getByRole("textbox",{ name: /^(?:Prompt|Message DeepSeek)$/ }),"fixture:code-fence-stream");
  await page.locator("form.sc-composer .sc-input").press("Enter");
  const live = page.locator(".source-assistant-message").filter({ hasText: "CLOSED_PRIOR" });
  // The unfinished language line intentionally renders an empty, zero-height
  // aria-hidden pre. Attachment, not visibility, is the observable contract.
  const openingState = await (await page.waitForFunction(() => globalThis.codeFenceOpeningState)).jsonValue();
  assert.deepEqual(openingState, { hidden: "true", text: "", blocks: 1, tailBlocks: 0 });
  assert.equal(await live.getByRole("button", { name: "Copy code", exact: true }).count(), 1);
  await live.locator(".scb-block").first().evaluate((block) => { block.dataset.mountProbe = "preserved"; });
  await live.getByRole("button", { name: "Copy code", exact: true }).click();
  await live.getByRole("button", { name: "Copied", exact: true }).waitFor();
  assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), 'const prior = "CLOSED_PRIOR";');
  await live.locator(".scb-code").filter({ hasText: "OPEN_FENCE_BODY" }).waitFor();
  assert.equal(await live.locator(".scb-block").first().getAttribute("data-mount-probe"), "preserved", "Earlier code blocks must not remount on each later delta");
  const growing = live.locator(".scb-block").filter({ hasText: "OPEN_FENCE_BODY" });
  assert.equal(await growing.getAttribute("data-frontier"), "true");
  assert.equal(await growing.locator(".scb-copy").count(), 0);
  // Copy is a historical-item interaction and intentionally releases following.
  // Resume only through the actual visible control; never silently re-pin it.
  await page.waitForFunction(() => document.querySelector(".source-transcript-frame")?.dataset.following === "false");
  const jump = page.locator('[data-testid="jump-to-latest"][data-visible="true"]');
  await jump.waitFor();
  assert.equal(await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').isVisible(), true, "The stream must still be active when resuming follow");
  await jump.click();
  await page.waitForFunction(() => {
    const viewport = document.querySelector(".transcript");
    return viewport?.closest(".source-transcript-frame")?.dataset.following === "true"
      && viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 3;
  });
  assert.equal(await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').isVisible(), true, "Later deltas must remain after the explicit jump");
  await live.getByText('const final = "FENCE_STREAM_DONE";', { exact: false }).waitFor();
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  await growing.getByRole("button", { name: "Copy code", exact: true }).waitFor();
  assert.equal(await growing.getAttribute("data-frontier"), null);
  await page.waitForFunction(() => {
    const viewport = document.querySelector(".transcript");
    return viewport && viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 3;
  });
  metrics.stream = await growing.locator(".scb-code").evaluate((code) => ({ length: code.textContent.length, lines: code.textContent.split("\n").length }));
  assert.ok(metrics.stream.lines >= 60);
  checks.push("Real protocol fixture keeps prior closed Copy usable without remounting it, holds an unfinished opener, hides growing-tail Copy, respects Copy's release of following, and follows later deltas only after an explicit visible jump-to-latest");
  await page.screenshot({ path: path.join(directory, "code-fence-stream-complete.png") });
  assert.deepEqual(errors, []);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "code-fence-failure.png") }).catch(() => {});
} finally {
  if (app && clipboardSaved) {
    try {
      await app.evaluate(async ({ clipboard }) => {
        const saved = globalThis.codeFenceClipboardBackup;
        if (!saved) throw new Error("Clipboard backup unavailable");
        if (saved.kind === "items") {
          if (saved.items.length) await clipboard.write(saved.items); else await clipboard.clear();
        } else if (saved.empty) await clipboard.clear();
        else if (saved.kind === "legacy") await clipboard.write(saved.data);
        else await clipboard.writeText(saved.data.text);
        delete globalThis.codeFenceClipboardBackup;
      });
      clipboardRestored = true;
    } catch (error) { failure ||= error; }
  }
  await app?.close().catch((error) => { failure ||= error; });
  await integrity().catch(error=>{failure ||=error;});
  const report = { directory,testSourceHashes:testHashes,passed: !failure, at: new Date().toISOString(), fixture: true, profile, workspace,
    build: { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256 },
    executablePath, checks, metrics, clipboardRestored, rendererErrors: errors,
    ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory,"report.json"),JSON.stringify(report,null,2));
  await fs.writeFile(path.join(evidence, "code-fence-ui-test.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined, workspace: undefined }, null, 2));
}
if (failure) throw failure;
