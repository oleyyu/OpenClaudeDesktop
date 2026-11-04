import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import path from "node:path";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const root = path.resolve(import.meta.dirname, "..");
const build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
const profile = path.join(root, "../analysis/live-ui-profile");
const workspace = path.join(root, "../workspace");
await fs.mkdir(profile, { recursive: true });
await fs.writeFile(
  path.join(profile, "preferences.json"),
  JSON.stringify({
    cwd: workspace,
    theme: "light",
    mode: "code",
    effort: "low",
    threadIds: [],
  }),
);
const env = { ...process.env, CODE_DESKTOP_DATA: profile };
delete env.ELECTRON_RUN_AS_NODE;
delete env.CODEX_BINARY;
const executablePath =
  process.env.TEST_ELECTRON_BINARY ||
  path.join(
    root,
    "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
  );
const errors = [];
const events = [];
async function launch() {
  const app = await electron.launch({ executablePath, args: [root], env });
  const page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForFunction(
    () =>
      document.querySelector('.sc-model-trigger')?.textContent !== 'Default model' && !!document.querySelector('.sc-model-trigger'),
    {},
    { timeout: 60000 },
  );
  await page.evaluate(() => {
    window.testEvents = [];
    window.desktop.onEvent((e) => window.testEvents.push(e));
  });
  return { app, page };
}
async function send(page, text) {
  await page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ }).fill(text);
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
}
let { app, page } = await launch();
try {
  await send(
    page,
    "Read ui-smoke.txt with a tool and reply with its exact contents. Do not modify any files.",
  );
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll(".assistant-message")).some((e) =>
        e.textContent.includes("CODE_DESKTOP_SMOKE_OK"),
      ) && !document.querySelector(".source-working"),
    {},
    { timeout: 150000 },
  );
  assert.ok(await page.locator(".source-step").count());
  await page.screenshot({
    path: path.join(root, "../analysis/app-conversation.png"),
  });
  events.push(...(await page.evaluate(() => window.testEvents)));
  const prefs = JSON.parse(
    await fs.readFile(path.join(profile, "preferences.json"), "utf8"),
  );
  assert.equal(prefs.threadIds.length, 1);
  await app.close();
  ({ app, page } = await launch());
  await page.locator(".source-session-open").first().click();
  await page
    .locator(".assistant-message")
    .filter({ hasText: "CODE_DESKTOP_SMOKE_OK" })
    .waitFor({ timeout: 60000 });
  await send(
    page,
    "What was the exact file content from the previous turn? Reply only with that content; no tool needed.",
  );
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".assistant-message").length >= 2 &&
      !document.querySelector(".source-working") &&
      !document.querySelector('[data-testid="code-prompt-send"][aria-busy="true"]'),
    {},
    { timeout: 150000 },
  );
  assert.match(
    await page.locator(".assistant-message").last().innerText(),
    /CODE_DESKTOP_SMOKE_OK/,
  );
  await send(page, "Run the terminal command sleep 30, then reply DONE.");
  await page.locator('.source-step[data-state="busy"]').waitFor({ timeout: 90000 });
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').click();
  await page
    .locator('[data-testid="code-prompt-stop"]:not([inert] *)')
    .waitFor({ state: "detached", timeout: 30000 });
  events.push(...(await page.evaluate(() => window.testEvents)));
  assert.ok(events.some((e) => e.method === "item/agentMessage/delta"));
  assert.ok(
    events.some(
      (e) =>
        e.method === "turn/completed" && e.params.turn.status === "interrupted",
    ),
  );
  assert.deepEqual(errors, []);
  const report = {
    passed: true,
    at: new Date().toISOString(),
    build,
    realCodex: true,
    checks: [
      "read file through UI",
      "streamed response",
      "compact expandable tool row",
      "restart and restore",
      "follow-up context",
      "interrupt active command",
    ],
    errors,
    threadId: prefs.threadIds[0],
  };
  await fs.writeFile(
    path.join(root, "../analysis/batch-20260920/live-ui-test.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(report);
} finally {
  await app.close();
}
