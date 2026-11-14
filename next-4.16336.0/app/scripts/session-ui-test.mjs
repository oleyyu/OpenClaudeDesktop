import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

// All seeded content is confined to this temporary fixture profile. No real
// account, Codex model, thread, or workspace file is used by this script.
const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(root, "../analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const profile = await fs.mkdtemp(path.join(evidence, "session-ui-profile-"));
// The project root is a git repo now (analysis/ is gitignored inside it): keep the fixture workspace outside any repo.
const workspace = path.join(await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "cd-session-"))), "workspace");
await fs.mkdir(path.join(workspace, "nested"), { recursive: true });
await fs.writeFile(path.join(workspace, "alpha.txt"), "FIRST_FILE_PREVIEW\n");
await fs.writeFile(path.join(workspace, "beta.md"), "# SECOND_FILE_PREVIEW\n");
await fs.writeFile(
  path.join(workspace, "nested/deep.txt"),
  "NESTED_FILE_PREVIEW\n",
);
const threadId = "session-ui-seeded";
// R09: a second seeded session for the app-level find bar (a session switch keeps
// it open) and the document-only Plan pane (fixture:plan-document).
const secondThreadId = "session-ui-second";
const now = Math.floor(Date.now() / 1000);
await fs.writeFile(
  path.join(profile, "preferences.json"),
  JSON.stringify({
    cwd: workspace,
    theme: "light",
    mode: "code",
    threadIds: [threadId, secondThreadId],
    displayName: "Fixture",
    model: "fixture",
    sidebarWidth: 288,
  }),
);
await fs.writeFile(
  path.join(profile, "fixture-threads.json"),
  JSON.stringify({
    next: 100,
    threads: {
      [threadId]: {
        id: threadId,
        cwd: workspace,
        name: "Session component fixture",
        createdAt: now,
        updatedAt: now,
        archived: false,
        turns: [
          {
            id: "seed-turn",
            status: "completed",
            items: [
              {
                id: "seed-user",
                type: "userMessage",
                content: [
                  {
                    type: "text",
                    text: "Inspect the isolated session fixture.",
                  },
                ],
              },
              {
                id: "seed-intro",
                type: "agentMessage",
                text: "I will inspect the fixture.\n\nThis is a second paragraph.",
              },
              {
                id: "seed-command",
                type: "commandExecution",
                command: "printf source-tool-output",
                cwd: workspace,
                status: "completed",
                exitCode: 0,
                durationMs: 125,
                aggregatedOutput: "SOURCE_TOOL_OUTPUT\n",
              },
              {
                id: "seed-reasoning",
                type: "reasoning",
                summary: ["A summary supplied by the fixture."],
                status: "completed",
              },
              {
                id: "seed-file",
                type: "fileChange",
                status: "completed",
                changes: [
                  {
                    path: "example.txt",
                    kind: { type: "update" },
                    diff: "--- a/example.txt\n+++ b/example.txt\n-old\n+new",
                  },
                ],
              },
              {
                id: "seed-failed",
                type: "commandExecution",
                command: "exit 1",
                status: "completed",
                exitCode: 1,
                aggregatedOutput: "EXPECTED_FIXTURE_FAILURE",
              },
              {
                id: "seed-final",
                type: "agentMessage",
                text: "Fixture inspection complete.\n\n- Markdown list\n- Another item",
              },
            ],
          },
        ],
      },
      [secondThreadId]: {
        id: secondThreadId,
        cwd: workspace,
        name: "Second fixture session",
        createdAt: now - 60,
        updatedAt: now - 60,
        archived: false,
        turns: [
          {
            id: "second-turn",
            status: "completed",
            items: [
              { id: "second-user", type: "userMessage", content: [{ type: "text", text: "Inspect the second session." }] },
              { id: "second-reply", type: "agentMessage", text: "Second session ready." },
            ],
          },
        ],
      },
    },
  }),
);
const binary = path.join(root, "tests/fixtures/codex-server.cjs");
await fs.chmod(binary, 0o755);
const env = {
  ...process.env,
  CODE_DESKTOP_DATA: profile,
  CODEX_BINARY: binary,
};
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({
  executablePath:
    process.env.TEST_ELECTRON_BINARY ||
    path.join(
      root,
      "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
    ),
  args: [root],
  env,
});
const errors = [],
  checks = [],
  metrics = {};
let page;
async function responses() {
  try {
    return (
      await fs.readFile(path.join(profile, "fixture-responses.jsonl"), "utf8")
    )
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}
async function send(text) {
  await page
    .getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ })
    .fill(text);
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await page.locator("[data-approval-presentation=card]").waitFor();
}
async function decide(prompt, button, result, inspect) {
  const before = (await responses()).length;
  const replyCount = await page.locator(".assistant-message").count();
  await send(prompt);
  assert.equal(
    await page.locator(".assistant-message").count(),
    replyCount,
    "There must be no continuation before the user decides",
  );
  assert.equal(
    (await responses()).length,
    before,
    "No response may be sent automatically",
  );
  const card = page.locator("[data-approval-presentation=card]");
  if (inspect) await inspect(card);
  // Source Allow actions arm 400 ms after a new card becomes active.
  if (await card.locator("[data-approval-allow]").count()) await page.waitForTimeout(450);
  await card.getByRole("button", { name: button, exact: true }).click();
  await card.waitFor({ state: "detached" });
  await page.waitForFunction(
    (n) => document.querySelectorAll(".assistant-message").length > n,
    replyCount,
  );
  assert.deepEqual((await responses()).at(-1).result, result);
  assert.equal(
    (await responses()).length,
    before + 1,
    "Exactly one approval response is sent",
  );
}
try {
  page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("button", { name: "Model", exact: true })
    .filter({ hasText: "Test model" })
    .waitFor();
  await page
    .locator(".source-session-open")
    .filter({ hasText: "Session component fixture" })
    .click();
  // HANDOFF 0.2.66/0.2.108: seed-command..seed-failed are adjacent tools, so they
  // render inside the collapsed Npe classic group (approval-current.js:53880-54010,
  // members mount only when `aria-expanded`); open the group before inspecting a
  // member row. Previously the group was opened only after these row checks.
  await page.locator('.stg-trigger').click();
  await page
    .locator('[data-transcript-item-id="seed-command"]')
    .waitFor();
  await page.evaluate(() => document.fonts.ready);

  const command = page
    .locator('[data-transcript-item-id="seed-command"]');
  assert.equal(
    await command.locator(".source-step-detail").count(),
    0,
    "Completed tool details start collapsed",
  );
  assert.equal(
    await command.locator(".source-step-outcome").count(),
    0,
    "Completed tool has no Done/status badge",
  );
  assert.doesNotMatch(await command.innerText(), /\bDone\b/);
  // approval-current:4118–4161/6213–6255: printf has no safe code meta;
  // 16934: completed + exitCode 1 is not a tool failure. c425fb3cf:j retains
  // expanded bodies hidden on close. These replace the pre-0.2.16 expectations.
  assert.equal(await command.locator('.source-step-label').textContent(), 'Ran a command');
  // Npe classic group (53880–54010) contains the adjacent file/command tools (opened above).
  const failed = page.locator('[data-transcript-item-id="seed-failed"]');
  assert.equal(await failed.getAttribute('data-state'), 'done');
  assert.equal(await failed.locator('.source-step-outcome').count(), 0);
  await command.locator('.source-step-trigger').click();
  await command.getByText('SOURCE_TOOL_OUTPUT', { exact: false }).waitFor();
  await command.locator('.source-step-trigger').click();
  assert.equal(await command.locator('.source-step-detail').count(), 1);
  assert.equal(await command.locator('.source-step-detail').getAttribute('hidden'), '');
  checks.push('Collapsed tool row, no Done badge, completed nonzero command remains done, body retained hidden after closing');

  metrics.transcript = await page.evaluate(() => {
    const step = document.querySelector(".source-step"),
      trigger = step.querySelector(".source-step-trigger"),
      // The 10px item gap (source-session.css `.source-message + .source-message`) sits on
      // the transcript-level item; since the group is opened first (see above) the first
      // step is an in-card group member (approval-current.js:54035-54063 m8 inCard), so the
      // gap is read from its enclosing `.stg` transcript item.
      item = step.closest(".stg") || step;
    const markdown = document.querySelector(".source-markdown"),
      bubble = document.querySelector(".source-user-bubble");
    const style = (node) => getComputedStyle(node);
    return {
      fontSize: style(markdown).fontSize,
      lineHeight: style(markdown).lineHeight,
      toolMarginTop: style(item).marginTop,
      toolBorderWidth: style(item).borderTopWidth,
      groupMemberRowHeight: trigger.getBoundingClientRect().height,
      rowFont: style(trigger).fontFamily,
      maxBubbleWidth: style(bubble).maxWidth,
      userTurnGap: style(
        document.querySelector(".source-user-message + .source-message"),
      ).marginTop,
      toolLabelColor: style(step.querySelector(".source-step-label")).color,
      toolMetaColor: step.querySelector(".source-step-meta") ? style(step.querySelector(".source-step-meta")).color : null,
    };
  });
  assert.equal(metrics.transcript.fontSize, "14px");
  assert.ok(Math.abs(parseFloat(metrics.transcript.lineHeight) - 20) < 0.1);
  assert.equal(metrics.transcript.toolMarginTop, "10px");
  assert.equal(metrics.transcript.userTurnGap, "15px");
  assert.equal(metrics.transcript.toolBorderWidth, "0px");
  // The standalone stream-command row (alone in its turn, so not grouped) is a classic
  // tool row: approval-current.js:17298 `${zv} cursor-pointer` with zv = c425fb3cf:143
  // (py-0, no min-height) is exactly one text-body line. Until 0.2.123 this suite asserted
  // 26px here, which was the non-tool TurnStatusStep min-height (source-session.css),
  // not the source zv geometry; asserted below against one transcript text-body line
  // (--chat-body x --chat-leading, the c6a992d55 epitaxy-transcript-typography remap).
  assert.equal(metrics.transcript.maxBubbleWidth, "85%");
  assert.equal(metrics.transcript.toolMetaColor, null, "Soe fallback a command is plain label, with no code meta (approval-current:4118–4161)");
  checks.push(
    "14px / 20px transcript, 10px item gap, 15px user/turn gap, 85% user bubble",
  );

  for (const [button, decision] of [
    ["Deny", "decline"],
    ["Allow once", "accept"],
    ["Allow for this session", "acceptForSession"],
  ]) {
    await decide(
      `fixture:command ${decision}`,
      button,
      { decision },
      async (card) => {
        await card
          .getByText("Allow DeepSeek to run this command?", { exact: true })
          .waitFor();
        await card.getByText("printf approval-test", { exact: true }).waitFor();
        assert.equal(
          await card
            .getByRole("button", {
              name: "Allow for this session",
              exact: true,
            })
            .count(),
          1,
        );
      },
    );
  }
  checks.push(
    "command decline / accept / acceptForSession traverse fixture → IPC → logged server response",
  );
  for (const [button, decision] of [
    ["Deny", "decline"],
    ["Allow once", "accept"],
    ["Allow for this session", "acceptForSession"],
  ]) {
    await decide(
      `fixture:file ${decision}`,
      button,
      { decision },
      async (card) => {
        // Generic `fixture:file` requests carry only grantRoot and no item.changes, so EM/SM
        // (approval-current.js:15201-15205, :15399-15470) have no file to name; title stays generic.
        await card
          .getByText("Allow DeepSeek to edit files?", { exact: true })
          .waitFor();
        assert.match(await card.innerText(), /Requested write root:/);
      },
    );
  }
  checks.push(
    "file decline / accept / acceptForSession with real request grantRoot",
  );
  await decide(
    "fixture:permissions accept",
    "Allow for this turn",
    { permissions: { network: { enabled: true } }, scope: "turn" },
    async (card) => {
      assert.equal(
        await card
          .getByRole("button", { name: /session|always|permanent/i })
          .count(),
        0,
      );
      await card
        .getByText("Applies to this turn only.", { exact: true })
        .waitFor();
    },
  );
  await decide(
    "fixture:permissions deny",
    "Deny",
    { permissions: {}, scope: "turn" },
    async (card) => {
      assert.equal(
        await card
          .getByRole("button", { name: /session|always|permanent/i })
          .count(),
        0,
      );
    },
  );
  checks.push(
    "permission grant and denial always use turn scope; no session or permanent affordance",
  );

  await decide(
    "fixture:input choose",
    "Submit",
    { answers: { approach: { answers: ["Second"] } } },
    async (card) => {
      // _se (approval-current.js:7790-7800) preselects the first option: Submit starts enabled
      // (product correction in 0.2.115; previously asserted disabled).
      assert.equal(
        await card.getByRole("button", { name: "Submit" }).isDisabled(),
        false,
      );
      await card
        .getByRole("button", { name: "Second Second test choice", exact: true })
        .click();
    },
  );
  await decide(
    "fixture:input freeform",
    "Submit",
    { answers: { approach: { answers: ["A freeform fixture answer"] } } },
    async (card) => {
      await card
        .getByRole("textbox", { name: "Other option", exact: true })
        .fill("A freeform fixture answer");
    },
  );
  checks.push(
    "user question preselects its first option (Submit enabled); selected and freeform answers preserve IDs and exact values",
  );

  // F10 find bar (sidebar-main.js:17787-18130 ZB over the transcript provider). "inspect" is in
  // the seeded prompt, the intro and "inspection" in the final answer; the sr-only 'You said' /
  // 'DeepSeek responded' headings are data-find-omitted, so exactly 3 matches.
  const findStatus = () => page.locator('[role="search"] [role="status"]').textContent();
  const waitFindStatus = (value) => page.waitForFunction((value) =>
    document.querySelector('[role="search"] [role="status"]')?.textContent === value, value);
  await page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ }).click();
  await page.waitForFunction(() => document.activeElement?.classList.contains("sc-input"));
  await page.keyboard.press("Meta+f");
  await page.waitForFunction(() => document.activeElement?.matches('input[aria-label="Find"]'));
  metrics.findBar = await page.locator('[role="search"]').evaluate((node) => {
    const box = node.getBoundingClientRect(), style = getComputedStyle(node), probe = document.createElement("span");
    probe.style.cssText = "background-color:var(--cds-surface-3);border:0.5px solid var(--cds-border-strong)";
    document.body.append(probe);
    const tokens = { surface: getComputedStyle(probe).backgroundColor, border: getComputedStyle(probe).borderTopColor, width: getComputedStyle(probe).borderTopWidth };
    probe.remove();
    return { top: box.top, right: innerWidth - box.right, position: style.position, zIndex: style.zIndex, radius: style.borderTopLeftRadius,
      borderWidth: style.borderTopWidth, background: style.backgroundColor, borderColor: style.borderTopColor, tokens,
      inBody: node.parentElement === document.body, placeholder: node.querySelector("input").placeholder,
      buttons: [...node.querySelectorAll("button")].map((button) => [button.getAttribute("aria-label"),
        button.getBoundingClientRect().width, button.getBoundingClientRect().height, button.disabled]) };
  });
  assert.deepEqual([metrics.findBar.top, metrics.findBar.right, metrics.findBar.position, metrics.findBar.zIndex], [56, 16, "fixed", "9000"]);
  assert.deepEqual([metrics.findBar.radius, metrics.findBar.borderWidth, metrics.findBar.inBody, metrics.findBar.placeholder], ["8px", metrics.findBar.tokens.width, true, "Find…"], "border-0.5 (as the device snaps 0.5px)");
  assert.equal(metrics.findBar.background, metrics.findBar.tokens.surface, "bg-surface-3");
  assert.equal(metrics.findBar.borderColor, metrics.findBar.tokens.border, "border-strong");
  assert.deepEqual(metrics.findBar.buttons, [["Go to previous match", 24, 24, true], ["Go to next match", 24, 24, true], ["Close find bar", 24, 24, false]]);
  // Dark mode: the same tokens resolve to the dark surface (the bar has no colour transition).
  metrics.findBarDark = await page.locator('[role="search"]').evaluate((node) => {
    const root = document.documentElement, previous = root.dataset.mode, probe = document.createElement("span");
    root.dataset.mode = "dark";
    probe.style.cssText = "background-color:var(--cds-surface-3);color:var(--cds-text-primary)";
    document.body.append(probe);
    const value = { background: getComputedStyle(node).backgroundColor, surface: getComputedStyle(probe).backgroundColor,
      input: getComputedStyle(node.querySelector("input")).color, text: getComputedStyle(probe).color };
    probe.remove();
    root.dataset.mode = previous;
    return value;
  });
  assert.equal(metrics.findBarDark.background, metrics.findBarDark.surface, "dark bg-surface-3");
  assert.equal(metrics.findBarDark.input, metrics.findBarDark.text, "dark text-primary input");
  assert.notEqual(metrics.findBarDark.background, metrics.findBar.background, "the surface follows the mode");
  assert.equal(await findStatus(), "", "an empty query shows no count");
  await page.keyboard.type("inspect");
  await waitFindStatus("1/3");
  // The debounced (qB 120ms) search of the whole word has run: its first match is painted active.
  await page.waitForFunction(() => [...(CSS.highlights.get("transcript-find-active") ?? [])][0]?.toString() === "Inspect");
  metrics.findHighlights = await page.evaluate(() => ({ all: CSS.highlights.get("transcript-find")?.size,
    active: CSS.highlights.get("transcript-find-active")?.size, first: [...CSS.highlights.get("transcript-find-active")][0]?.toString() }));
  assert.deepEqual(metrics.findHighlights, { all: 3, active: 1, first: "Inspect" });
  await page.keyboard.press("Enter");
  await waitFindStatus("2/3");
  await page.keyboard.press("Enter");
  await waitFindStatus("3/3");
  const activeMatch = () => page.evaluate(() => {
    const range = [...CSS.highlights.get("transcript-find-active")][0], box = range.getBoundingClientRect(),
      viewport = document.querySelector(".transcript").getBoundingClientRect();
    return { text: range.toString(), inView: box.height > 0 && box.top >= viewport.top && box.bottom <= viewport.bottom,
      following: document.querySelector(".source-transcript-frame").dataset.following, focused: document.activeElement?.getAttribute("aria-label") };
  });
  metrics.findActive = await activeMatch();
  assert.deepEqual(metrics.findActive, { text: "inspect", inView: true, following: "false", focused: "Find" });
  await page.screenshot({ path: path.join(evidence, "session-find-bar.png") });
  await page.keyboard.press("Meta+Shift+g");
  await waitFindStatus("2/3");
  await page.keyboard.press("Meta+g");
  await waitFindStatus("3/3");
  await page.keyboard.press("F3");
  await waitFindStatus("1/3");
  await page.keyboard.press("Shift+Enter");
  await waitFindStatus("3/3");
  assert.equal((await activeMatch()).inView, true);
  await page.keyboard.press("Escape");
  await page.locator('[role="search"]').waitFor({ state: "detached" });
  await page.waitForFunction(() => document.activeElement?.classList.contains("sc-input"));
  assert.deepEqual(await page.evaluate(() => [CSS.highlights.has("transcript-find"), CSS.highlights.has("transcript-find-active")]), [false, false]);
  // Edit ▸ Find (ISr) reaches the same bar; Close find bar restores the focus too.
  const editFind = (label) => app.evaluate(({ Menu }, label) => Menu.getApplicationMenu().items.find((item) => item.label === "Edit")
    .submenu.items.find((item) => item.label === "Find").submenu.items.find((item) => item.label === label).click(), label);
  await editFind("Find…");
  await page.waitForFunction(() => document.activeElement?.matches('input[aria-label="Find"]'));
  await page.keyboard.type("zz-no-such-text");
  await waitFindStatus("0/0");
  await editFind("Find Next");
  assert.equal(await findStatus(), "0/0");
  await page.getByRole("button", { name: "Close find bar", exact: true }).click();
  await page.locator('[role="search"]').waitFor({ state: "detached" });
  await page.waitForFunction(() => document.activeElement?.classList.contains("sc-input"));
  checks.push("⌘F find bar: fixed 56/16, z 9000, surface-3 / border-strong / 8px, 24px buttons; 'inspect' 1/3 → Enter ×2 3/3 in view with following released; ⇧⌘G/⌘G/F3/⇧Enter wrap; Escape and Close restore the composer focus; Edit ▸ Find… / Find Next");

  // F10 feed structure (scroll-messages-current.js N9 :60985-61288, :63957-63966, :61757-61761).
  metrics.feed = await page.evaluate(() => {
    const feed = document.querySelector(".transcript"), articles = [...feed.querySelectorAll('[role="article"]')];
    return { role: feed.getAttribute("role"), label: feed.getAttribute("aria-label"), busy: feed.getAttribute("aria-busy"),
      instructions: document.getElementById(feed.getAttribute("aria-describedby"))?.textContent,
      count: articles.length, tabStops: articles.filter((node) => node.tabIndex === 0).length, lastIsStop: articles.at(-1)?.tabIndex === 0,
      labels: articles.map((node) => node.getAttribute("aria-label")), posinset: articles.map((node) => Number(node.getAttribute("aria-posinset"))),
      setsize: [...new Set(articles.map((node) => node.getAttribute("aria-setsize")))],
      first: [articles[0]?.dataset.transcriptItemId, articles[1]?.dataset.transcriptItemId],
      headings: [...feed.querySelectorAll("h2.sr-only")].slice(0, 2).map((node) => [node.textContent, node.hasAttribute("data-find-omitted")]),
      groupMember: document.querySelector('[data-transcript-item-id="seed-command"]')?.getAttribute("role") ?? null,
      finalRole: document.querySelector('[data-transcript-item-id="seed-final"]')?.getAttribute("role") ?? null };
  });
  assert.deepEqual([metrics.feed.role, metrics.feed.label, metrics.feed.busy], ["feed", "Chat messages", "false"]);
  assert.equal(metrics.feed.instructions, "Use the up and down arrow keys to move between messages.");
  assert.ok(metrics.feed.count >= 4, "prompts and answers are articles");
  assert.deepEqual([metrics.feed.tabStops, metrics.feed.lastIsStop], [1, true], "one roving stop, on the latest message");
  assert.deepEqual(metrics.feed.labels, metrics.feed.posinset.map((n) => `Message ${n}`));
  assert.deepEqual(metrics.feed.posinset, metrics.feed.labels.map((_, index) => index + 1));
  assert.deepEqual(metrics.feed.setsize, [String(metrics.feed.count)]);
  assert.deepEqual(metrics.feed.first, ["seed-user", "seed-intro"]);
  assert.deepEqual(metrics.feed.headings, [["You said: Inspect the isolated session fixture.", true], ["DeepSeek responded: I will inspect the fixture.", true]]);
  assert.deepEqual([metrics.feed.groupMember, metrics.feed.finalRole], [null, "none"], "only the first row of an answer is an article");
  const last = metrics.feed.count;
  await page.locator('.transcript [role="article"][tabindex="0"]').focus();
  // Element.focus() scrolls the latest article into view after the find bar left the viewport mid-transcript; let that
  // scroll event land before the arrows (an ArrowUp in the same frame turned it into a user move back to the tail).
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const focusedArticle = () => page.evaluate(() => ({ label: document.activeElement?.getAttribute("aria-label"),
    stops: document.querySelectorAll('.transcript [role="article"][tabindex="0"]').length,
    following: document.querySelector(".source-transcript-frame").dataset.following,
    atTail: (() => { const v = document.querySelector(".transcript"); return v.scrollHeight - v.clientHeight - v.scrollTop <= 2; })() }));
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  metrics.feedUp = await focusedArticle();
  assert.deepEqual([metrics.feedUp.label, metrics.feedUp.stops, metrics.feedUp.following], [`Message ${last - 2}`, 1, "false"]);
  await page.keyboard.press("Home");
  assert.equal((await focusedArticle()).label, "Message 1");
  await page.keyboard.press("End");
  await page.waitForFunction(() => document.querySelector(".source-transcript-frame").dataset.following === "true");
  metrics.feedEnd = await focusedArticle();
  assert.deepEqual(metrics.feedEnd, { label: `Message ${last}`, stops: 1, following: "true", atTail: true });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.activeElement?.classList.contains("sc-input"));
  checks.push(`role=feed 'Chat messages' (aria-busy false, sr-only instructions) with ${last} numbered articles and one tabindex=0 stop; 'You said' / 'DeepSeek responded' headings; ArrowUp ×2 → Message ${last - 2} released, Home → Message 1, End → Message ${last} re-pinned, Escape → composer`);

  // A fixture-only renderer event exercises transient busy/streaming display.
  // Approval assertions above use the fixture process and genuine IPC pipeline.
  await app.evaluate(({ BrowserWindow }, id) => {
    const contents = BrowserWindow.getAllWindows()[0].webContents;
    contents.send("desktop:event", {
      method: "item/started",
      params: {
        threadId: id,
        turnId: "fixture-stream",
        item: {
          id: "stream-command",
          type: "commandExecution",
          command: "fixture streaming command",
          status: "inProgress",
          aggregatedOutput: "",
        },
      },
    });
    contents.send("desktop:event", {
      method: "turn/started",
      params: {
        threadId: id,
        turn: { id: "fixture-stream", status: "inProgress" },
      },
    });
  }, threadId);
  const busyStep = page
    .locator('[data-transcript-item-id="stream-command"]');
  await busyStep.waitFor();
  assert.equal(await busyStep.getAttribute("data-state"), "busy");
  // F10 (N9 G, :61239): the feed is busy and its live tail article reads 'Currently streaming message'.
  const feedTail = () => page.evaluate(() => {
    const feed = document.querySelector(".transcript"), articles = [...feed.querySelectorAll('[role="article"]')];
    return { busy: feed.getAttribute("aria-busy"), last: articles.at(-1)?.getAttribute("aria-label"), count: articles.length };
  });
  await page.waitForFunction(() => document.querySelector(".transcript")?.getAttribute("aria-busy") === "true");
  metrics.feedBusy = await feedTail();
  assert.deepEqual([metrics.feedBusy.busy, metrics.feedBusy.last], ["true", "Currently streaming message"]);
  metrics.transcript.rowHeight = await busyStep.evaluate((node) =>
    node.closest(".stg") ? null : node.querySelector(".source-step-trigger").getBoundingClientRect().height);
  metrics.transcript.leadingBody = await busyStep.evaluate((node) => {
    const probe = document.createElement("div");
    // c6a992d55 .epitaxy-transcript-typography remaps text-body to --chat-body/--chat-leading.
    probe.style.cssText = "position:absolute;height:calc(var(--chat-body) * var(--chat-leading))";
    node.append(probe); const value = probe.getBoundingClientRect().height; probe.remove(); return value;
  });
  assert.equal(metrics.transcript.rowHeight, metrics.transcript.leadingBody, "zv classic row is one text-body line (c425fb3cf:143)");
  checks.push("Standalone busy command row is one text-body line (zv, no 26px min-height)");
  // source-tool-group.css intentionally keeps standalone running labels in
  // steady secondary gray. The legacy class is still present, but its generic
  // shimmer is overridden; check the visible style, including reduced motion.
  const busyLabelStyle = () => busyStep.locator(".source-step-label").evaluate((node) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--cds-text-secondary)";
    node.append(probe);
    const expectedColor = getComputedStyle(probe).color;
    probe.remove();
    const style = getComputedStyle(node);
    return { animation: style.animationName, background: style.backgroundImage,
      color: style.color, fill: style.webkitTextFillColor, expectedColor };
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  metrics.busyLabel = await busyLabelStyle();
  assert.equal(metrics.busyLabel.animation, "none");
  assert.equal(metrics.busyLabel.background, "none");
  assert.equal(metrics.busyLabel.color, metrics.busyLabel.expectedColor);
  assert.equal(metrics.busyLabel.fill, metrics.busyLabel.expectedColor);
  await page
    .locator(".source-working")
    // approval-current z5:58085–58089: a reported live command is the tools phase.
    .filter({ hasText: "Running tools…" })
    .waitFor();
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.deepEqual(await busyLabelStyle(), metrics.busyLabel);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await app.evaluate(({ BrowserWindow }, id) => {
    const contents = BrowserWindow.getAllWindows()[0].webContents;
    contents.send("desktop:event", {
      method: "item/completed",
      params: {
        threadId: id,
        turnId: "fixture-stream",
        item: {
          id: "stream-command",
          type: "commandExecution",
          command: "fixture streaming command",
          status: "completed",
          exitCode: 0,
          aggregatedOutput: "streamed output",
        },
      },
    });
    contents.send("desktop:event", {
      method: "turn/completed",
      params: {
        threadId: id,
        turn: { id: "fixture-stream", status: "completed" },
      },
    });
  }, threadId);
  await page.locator(".source-working").waitFor({ state: "detached" });
  await page.waitForFunction(() => document.querySelector(".transcript")?.getAttribute("aria-busy") === "false");
  metrics.feedSettled = await feedTail();
  assert.equal(metrics.feedSettled.last, `Message ${metrics.feedSettled.count}`);
  checks.push(
    "fixture-only transient busy event keeps the standalone label in steady secondary gray with no gradient or animation in both motion modes; completed state clears Working; the feed is aria-busy with a 'Currently streaming message' tail, then 'Message N'",
  );

  await page.getByRole("button", {name: "View options", exact: true}).click(); await page.getByRole("menuitemcheckbox", {name: "Plan", exact: true}).click();
  await page.getByText("Respect user decision", { exact: true }).waitFor();
  assert.equal(
    await page.locator(".source-plan li[data-state=completed]").count(),
    2,
  );
  // kp/Op/ZO: caption "Tasks" heading; a completed row is struck through on
  // its text only (local font-glyph icons must not be struck).
  metrics.planPane = await page.locator(".source-plan li[data-state=completed]").first().evaluate((li) => ({
    row: getComputedStyle(li).textDecorationLine,
    text: getComputedStyle(li.querySelector(".source-plan-step")).textDecorationLine,
    icon: getComputedStyle(li.querySelector("[data-cds=Icon]")).textDecorationLine,
    sr: li.querySelector(".sr-only").textContent,
    heading: getComputedStyle(li.closest(".source-plan").querySelector("h2")).textTransform,
  }));
  assert.deepEqual(metrics.planPane, { row: "none", text: "line-through", icon: "none", sr: "done", heading: "uppercase" });
  await page.screenshot({ path: path.join(evidence, "session-source-plan-pane.png") });
  metrics.paneHeader = await page
    .locator(".source-pane-header")
    .evaluate((node) => node.getBoundingClientRect().height);
  assert.equal(metrics.paneHeader, 32);
  // panes-toggle-current.js:3165 cl label is "Changes" (was the non-source "Show changes").
  await page.getByRole("button", { name: "Changes", exact: true }).click();
  await page
    .locator(".source-diff .added")
    .filter({ hasText: "+new" })
    .waitFor();
  await page
    .locator(".source-diff .removed")
    .filter({ hasText: "-old" })
    .waitFor();
  assert.equal(
    await page.locator(".source-file-panel [role=tab]").count(),
    0,
    "Plan/changes are separate panes, not a fabricated three-tab file panel",
  );
  checks.push(
    "Codex plan steps, turn diff, exceptional diff coloring, independent pane selection and 32px header",
  );

  // 0.2.14 tile engine (2.2553.1 toggleSidePane): Plan/Changes/Files coexist
  // as tiles, so close the open panes first to give Files its 2:3 width.
  while (await page.locator(".source-side-tile").count()) {
    await page.locator(".source-side-tile").first().getByRole("button", { name: "Close panel", exact: true }).click();
    await page.waitForTimeout(80);
  }
  await page.getByRole("button", {name: "View options", exact: true}).click(); await page.getByRole("menuitemcheckbox", {name: "Files", exact: true}).click();
  // F11: the tree is "Project files"; the viewer scroller is .source-file-preview (cd2efac6e jo), and a writable text
  // tab opens in the CodeMirror editor (.sfv-editor, the Oct 12 file-editor port), so either holds the text.
  const tree = page.getByRole("tree", { name: "Project files" });
  await tree.getByRole("button", { name: "nested", exact: true }).click();
  await tree.getByRole("button", { name: "deep.txt", exact: true }).click();
  await page
    .locator("[data-file-viewer], .sfv-editor")
    .filter({ hasText: "NESTED_FILE_PREVIEW" })
    .waitFor();
  // Preview tab name carries the sr-only ", preview" hint (panes-tabs-current.js:436-441).
  // HANDOFF 0.2.101 wrote "deep.txt, preview" unexecuted; `.sr-only` is position:absolute
  // (design-system.css:4083-4093), i.e. display block, so accname name-from-content pads it
  // with spaces (Playwright innerAccumulatedElementText) and the exact name is "deep.txt , preview".
  await page.getByRole("tab", { name: "deep.txt , preview", exact: true }).dblclick();
  // B33: the tree coachmark (portaled to body) has its own "Show file tree" action, so use the header toggle.
  await page.locator(".source-pane-header").getByRole("button", { name: "Show file tree", exact: true }).click();
  await tree.getByRole("button", { name: "alpha.txt", exact: true }).click();
  await page
    .locator("[data-file-viewer], .sfv-editor")
    .filter({ hasText: "FIRST_FILE_PREVIEW" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("tablist", { name: "Open files" })
      .getByRole("tab")
      .count(),
    2,
  );
  await page.getByRole("tab", { name: "deep.txt", exact: true }).click();
  await page
    .locator("[data-file-viewer], .sfv-editor")
    .filter({ hasText: "NESTED_FILE_PREVIEW" })
    .waitFor();
  // pe close button: aria-hidden, label "Close file" (panes-tile-current.js:6671).
  await page
    .locator('[data-view-tab-bar] [data-vtb-id="nested/deep.txt"] button[aria-label="Close file"]')
    .click();
  await page
    .locator("[data-file-viewer], .sfv-editor")
    .filter({ hasText: "FIRST_FILE_PREVIEW" })
    .waitFor();
  await fs.writeFile(
    path.join(workspace, "after-refresh.txt"),
    "AFTER_REFRESH\n",
  );
  await page.getByRole("textbox", { name: "Filter files", exact: true }).fill("refresh");
  await page.getByRole("button", { name: "Clear filter", exact: true }).click();
  await tree
    .getByRole("button", { name: "after-refresh.txt", exact: true })
    .waitFor();
  await page.screenshot({
    path: path.join(evidence, "session-source-file-pane.png"),
  });
  checks.push(
    "scoped filesystem IPC, lazy folder expansion, file previews, real file tabs, tab close fallback and refresh",
  );

// 0.2.14 tile engine: separators are labelled "Resize {i} and {i+1}" (2.2553.1 Mh aria-label).
  await page.getByRole("separator", {name: /^Resize Chat and /}).focus();
  await page.keyboard.press("End");
  await page.locator(".source-files-tree").waitFor({ state: "hidden" });
  assert.equal(await page.locator(".source-files-tree").isVisible(), false);
  // F11: no "Back to files" (cd2efac6e jo); the ListBullet switches the narrow pane to the tree.
  await page
    .getByRole("button", { name: "Show file tree", exact: true })
    .click();
  assert.equal(await tree.isVisible(), true);
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  await page.locator(".source-file-panel").waitFor({ state: "detached" });
  checks.push(
    "narrow file pane hides the tree while a file is open and the file tree toggle brings it back",
  );

  // R09 (sidebar-main.js:20491, :17787-18130): ZB is app-level, so a session switch keeps the bar open with its
  // query and recounts it against the other transcript; Escape still restores the focus ⌘F found.
  const findStatusText = () => page.locator('[role="search"] [role="status"]').textContent();
  const waitStatus = (value) => page.waitForFunction((value) =>
    document.querySelector('[role="search"] [role="status"]')?.textContent === value, value);
  await page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ }).click();
  await page.waitForFunction(() => document.activeElement?.classList.contains("sc-input"));
  await page.keyboard.press("Meta+f");
  await page.waitForFunction(() => document.activeElement?.matches('input[aria-label="Find"]'));
  await page.keyboard.type("inspect");
  await page.waitForFunction(() => /^1\/\d+$/.test(document.querySelector('[role="search"] [role="status"]')?.textContent ?? ""));
  metrics.findBeforeSwitch = await findStatusText();
  await page.locator(".source-session-open").filter({ hasText: "Second fixture session" }).click();
  await page.locator('[data-transcript-item-id="second-user"]').waitFor();
  await waitStatus("1/1");
  metrics.findAfterSwitch = {
    status: await findStatusText(),
    query: await page.locator('[role="search"] input').inputValue(),
    active: await page.evaluate(() => [...(CSS.highlights.get("transcript-find-active") ?? [])][0]?.toString() ?? null),
    bars: await page.locator('[role="search"]').count(),
  };
  assert.deepEqual(metrics.findAfterSwitch, { status: "1/1", query: "inspect", active: "Inspect", bars: 1 }, "the bar stays open with its query, recounted");
  // ⌘F re-selects the open bar; Escape closes it and gives the focus back to the composer.
  await page.keyboard.press("Meta+f");
  await page.waitForFunction(() => document.activeElement?.matches('input[aria-label="Find"]'));
  await page.keyboard.press("Escape");
  await page.locator('[role="search"]').waitFor({ state: "detached" });
  await page.waitForFunction(() => document.activeElement?.classList.contains("sc-input"));
  assert.deepEqual(await page.evaluate(() => [CSS.highlights.has("transcript-find"), CSS.highlights.has("transcript-find-active")]), [false, false]);
  checks.push(`⌘F find bar survives a session switch: "inspect" ${metrics.findBeforeSwitch} → 1/1 in the second session with the query kept; Escape restores the composer focus`);

  // R09 Plan document (panes-tile-current.js kp/Dp/Mp; panes-toggle-current.js:3262-3272): a proposed plan with no
  // todos still offers the Plan row, and the pane shows its Markdown without a Tasks section.
  await page.getByRole("button", { name: "View options", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Files", exact: true }).waitFor();
  assert.equal(await page.getByRole("menuitemcheckbox", { name: "Plan", exact: true }).count(), 0, "no plan, no Plan row");
  await page.keyboard.press("Escape");
  await page.getByRole("menuitemcheckbox", { name: "Files", exact: true }).waitFor({ state: "detached" });
  await page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ }).fill("fixture:plan-document");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await page.getByText("PLAN_FIXTURE_REPLY", { exact: true }).waitFor();
  await page.getByRole("button", { name: "View options", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Plan", exact: true }).click();
  await page.locator(".source-plan-document h1").filter({ hasText: "Plan fixture heading" }).waitFor();
  metrics.planDocument = await page.locator(".source-plan").evaluate((node) => ({
    heading: node.querySelector(".source-plan-document h1")?.textContent,
    body: node.querySelector(".source-plan-document")?.textContent.includes("PLAN_DOCUMENT_BODY"),
    tasks: !!node.querySelector(".source-plan-tasks"),
    empty: node.textContent.includes("No plan yet"),
    column: node.firstElementChild.classList.contains("max-w-[68ch]") && node.firstElementChild.classList.contains("mx-auto"),
    copy: node.closest(".source-file-panel").querySelector('.source-pane-header [aria-label="Copy plan"]') !== null,
  }));
  assert.deepEqual(metrics.planDocument, { heading: "Plan fixture heading", body: true, tasks: false, empty: false, column: true, copy: true });
  await page.screenshot({ path: path.join(evidence, "session-plan-document.png") });
  checks.push("fixture:plan-document (a Codex plan item, no todos) adds the Plan row; the pane renders the heading in the 68ch Prose column, no Tasks, and the header Copy plan");

  assert.deepEqual(errors, []);
  const report = {
    passed: true,
    fixture: true,
    at: new Date().toISOString(),
    checks,
    metrics,
    responseCount: (await responses()).length,
    profile,
    errors,
  };
  await fs.writeFile(
    path.join(evidence, "session-source-test.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (page)
    await page
      .screenshot({ path: path.join(evidence, "session-source-failure.png") })
      .catch(() => {});
  await fs.writeFile(
    path.join(evidence, "session-source-test.json"),
    JSON.stringify(
      {
        passed: false,
        fixture: true,
        at: new Date().toISOString(),
        checks,
        metrics,
        profile,
        errors,
        error: error.stack,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await app.close();
}
