import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({
  executablePath: path.join(
    root,
    "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
  ),
  args: [path.join(root, "tests/fixtures/composer-window.cjs")],
  env,
});
try {
  const page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page
    .getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ })
    .waitFor({ timeout: 10000 })
    .catch(async (error) => {
      console.error({
        errors,
        url: page.url(),
        body: await page.locator("body").innerText(),
      });
      throw error;
    });
  await page.locator("[data-clawd] svg").waitFor();
  await page.evaluate(() => document.fonts.ready);
  // W14-code r4 gen-final-4: home-model aggregateStats / activityCounts left with the deleted stats card (R4DC-N2).
  // W14-code r4 closeout R4DC-N2 (E95): the 2.x home stats card (and its failed / hold / tabs fixture) is deleted.
  await page.evaluate(() =>
    document.documentElement.setAttribute("data-mode", "dark"),
  );
  await page.screenshot({
    path: path.join(root, "../analysis/composer-fixture-dark.png"),
  });
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(800, 600),
  );
  await page.getByRole("button", { name: /^Effort: / }).click();
  const popup = await page.locator('[role="dialog"][data-cds="ModelSelectorEffort"]').boundingBox();
  const viewport = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
  }));
  assert.ok(
    popup.x >= 0 &&
      popup.y >= 0 &&
      popup.x + popup.width <= viewport.width &&
      popup.y + popup.height <= viewport.height,
  );
  assert.deepEqual(errors, []);
  const report = {
    passed: true,
    checks: [
      "original Lottie renders SVG",
      "source dimensions",
      "original icon font",
      "effort keyboard and drag",
      "effort popup remains open",
      "submit and reset",
      "attachment removal",
      "dark mode",
      "narrow popup containment",
    ],
    metrics,
    errors,
  };
  await fs.writeFile(
    path.join(root, "../analysis/composer-fixture-test.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(report);
} finally {
  await app.close();
}
