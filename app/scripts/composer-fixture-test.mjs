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
    .getByRole("textbox", { name: "Message DeepSeek" })
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
  // home-model aggregateStats (code-home Iw over the original stats object):
  // sessions/messages/active days are ranged sums of dailyActivity, model tokens
  // come from dailyModelTokens, the heatmap counts (eT) are never ranged.
  const aggregation = await page.evaluate(async () => {
    const { aggregateStats, activityCounts } = await import("/src/home-model.mjs");
    const stats = {
      dailyActivity: [
        { date: "2026-09-01", messageCount: 10, sessionCount: 2, toolCallCount: 0 },
        { date: "2026-09-20", messageCount: 5, sessionCount: 1, toolCallCount: 0 },
      ],
      dailyModelTokens: [{ date: "2026-09-01", tokensByModel: { actual: 100 } }, { date: "2026-09-20", tokensByModel: { actual: 50 } }],
      modelUsage: {},
      peakActivityHour: 10,
    };
    return {
      all: aggregateStats(stats, "all", "2026-09-20"),
      week: aggregateStats(stats, "7d", "2026-09-20"),
      heatmap: activityCounts(stats.dailyActivity),
    };
  });
  assert.equal(aggregation.all.totalMessages, 15);
  assert.equal(aggregation.all.totalTokens, 150);
  assert.equal(aggregation.all.totalSessions, 3);
  assert.equal(aggregation.all.activeDays, 2);
  assert.equal(aggregation.week.totalMessages, 5);
  assert.equal(aggregation.week.totalTokens, 50);
  assert.equal(aggregation.week.totalSessions, 1);
  assert.equal(aggregation.week.activeDays, 1);
  assert.deepEqual(aggregation.heatmap, { "2026-09-01": 10, "2026-09-20": 5 }, "Range changes totals but never the complete heatmap");
  assert.equal(await page.locator(".sh-model-io").textContent(), "20k in · 12k out");
  assert.equal(await page.locator(".sh-model-pct").textContent(), "100.0%");
  // code-home Jw: failed card with Retry disabled while disconnected (reason
  // "Available when reconnected"); a click re-requests once connected.
  const failed = page.locator('[data-testid="epitaxy-stats-failed"]');
  await failed.getByText("Couldn’t load usage stats").waitFor();
  assert.equal(await failed.getByRole("button", { name: "Retry" }).isDisabled(), true);
  assert.equal(await failed.locator("[data-cds-disabled-reason]").textContent(), "Available when reconnected");
  assert.equal(await failed.getAttribute("data-stats-attempts"), "1");
  await page.getByRole("button", { name: "Fixture reconnect" }).click();
  assert.equal(await failed.getByRole("button", { name: "Retry" }).isDisabled(), false);
  await failed.getByRole("button", { name: "Retry" }).click();
  assert.equal(await failed.getAttribute("data-stats-attempts"), "2");
  // code-home qw hold: six 44px tiles, a 120px block and a 12×240px line at half-opacity tabs.
  const hold = await page.locator('[data-testid="epitaxy-stats-hold"]').evaluate((node) => ({
    tiles: [...node.querySelectorAll(".sh-skeleton-tile")].map((tile) => [tile.getBoundingClientRect().height, getComputedStyle(tile).borderRadius]),
    block: [node.querySelector(".sh-skeleton-block").getBoundingClientRect().height, getComputedStyle(node.querySelector(".sh-skeleton-block")).borderRadius],
    line: [node.querySelector(".sh-skeleton-line").getBoundingClientRect().width, node.querySelector(".sh-skeleton-line").getBoundingClientRect().height, getComputedStyle(node.querySelector(".sh-skeleton-line")).marginTop],
    tabsOpacity: getComputedStyle(node.querySelector(".sh-tabs-row")).opacity,
    disabled: node.querySelectorAll(".sh-tabs-row button:disabled").length,
  }));
  assert.deepEqual(hold, { tiles: Array.from({ length: 6 }, () => [44, "6px"]), block: [120, "2px"], line: [240, 12, "4px"], tabsOpacity: "0.5", disabled: 5 });
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await page.getByRole("tab", { name: "7d", exact: true }).click();
  assert.equal(await page.locator(".activity-heatmap .sh-heatmap-cell").count(), 182);
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
      "home-model ledger aggregation (per-day sessions, ranged totals, unranged heatmap)",
      "deferred-live stats tabs, models list, failed/retry and hold skeleton cards, complete heatmap",
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
