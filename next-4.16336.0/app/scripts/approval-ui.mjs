import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const root = path.resolve(import.meta.dirname, "..");
const profile = path.join(root, "../analysis/approval-ui-profile");
const binary = path.join(root, "tests/fixtures/codex-server.cjs");
await fs.chmod(binary, 0o755);
await fs.mkdir(profile, { recursive: true });
await fs.writeFile(
  path.join(profile, "preferences.json"),
  JSON.stringify({
    cwd: path.join(root, "../workspace"),
    theme: "light",
    threadIds: [],
  }),
);
const env = {
  ...process.env,
  CODE_DESKTOP_DATA: profile,
  CODEX_BINARY: binary,
};
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({
  executablePath: path.join(
    root,
    "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
  ),
  args: [root],
  env,
});
const errors = [];
try {
  const page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForFunction(
    () =>
      document.querySelector('.sc-model-trigger')?.textContent === 'Test model',
  );
  for (const [decision, result] of [
    ["Deny", "APPROVAL_DENIED"],
    ["Allow once", "APPROVAL_ACCEPTED"],
  ]) {
    await page
      .getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ })
      .fill("Test approval " + decision);
    await page
      .locator('[data-testid="code-prompt-send"]:not([inert] *)')
      .click();
    await page.getByRole("region", { name: "Action approval" }).waitFor();
    assert.equal(
      await page
        .locator(".assistant-message")
        .filter({ hasText: result })
        .count(),
      0,
      "No continuation before a decision",
    );
    await page.getByRole("button", { name: decision, exact: true }).click();
    await page
      .locator(".assistant-message")
      .filter({ hasText: result })
      .waitFor();
  }
  await page.getByRole("button", {name: "View options", exact: true}).click(); await page.getByRole("menuitemcheckbox", {name: "Plan", exact: true}).click();
  await page.getByText("Respect user decision", { exact: true }).waitFor();
  // panes-toggle-current.js:3165 cl label is "Changes" (was the non-source "Show changes").
  await page.getByRole("button", { name: "Changes", exact: true }).click();
  await page.locator(".diff .added").filter({ hasText: "+new" }).waitFor();
  await page.getByRole("button", {name: "View options", exact: true}).click(); await page.getByRole("menuitemcheckbox", {name: "Files", exact: true}).click();
  await page.getByRole("treeitem", { name: "ui-smoke.txt", exact: true }).click();
  await page
    .locator("[data-file-viewer]")
    .filter({ hasText: "CODE_DESKTOP_SMOKE_OK" })
    .waitFor();
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.locator(".source-session-row").hover();
  await page.locator(".source-session-more").click();
  await page.getByRole("menuitem",{name:"Rename",exact:true}).click();
  await page
    .getByRole("textbox", { name: "Session name", exact: true })
    .fill("Renamed test");
  await page.getByRole("textbox", { name: "Session name", exact: true }).press("Enter");
  await page
    .locator(".source-session-open")
    .filter({ hasText: "Renamed test" })
    .waitFor();
  await page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ }).fill("disconnect");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Codex disconnected" })
    .waitFor();
  assert.equal(
    await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').count(),
    0,
  );
  assert.equal(
    await page
      .locator('[data-testid="code-prompt-send"]:not([inert] *)')
      .isDisabled(),
    true,
  );
  assert.deepEqual(errors, []);
  const report = {
    passed: true,
    fixture: true,
    checks: [
      "no automatic approval",
      "deny response",
      "allow response",
      "plan events",
      "diff events",
      "file preview",
      "rename",
      "disconnect clears running state",
    ],
    errors,
  };
  await fs.writeFile(
    path.join(root, "../analysis/approval-ui-test.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(report);
} finally {
  await app.close();
}
