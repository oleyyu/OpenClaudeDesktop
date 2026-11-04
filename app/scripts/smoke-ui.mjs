import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import path from "node:path";
import fs from "node:fs/promises";
const root = path.resolve(import.meta.dirname, "..");
const env = {
  ...process.env,
  CODE_DESKTOP_DATA: path.join(root, "../analysis/test-userdata"),
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
try {
  const page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ }).waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector('.model-trigger')?.textContent !== 'Default model' && !!document.querySelector('.model-trigger'),
    {},
    { timeout: 60000 },
  );
  await page.screenshot({ path: path.join(root, "../analysis/app-light.png") });
  console.log(
    JSON.stringify(
      {
        title: await page.title(),
        errors,
        body: (await page.locator("body").innerText()).slice(0, 1200),
        metrics: await page.evaluate(() => ({
          font: getComputedStyle(document.body).fontFamily,
          bg: getComputedStyle(document.documentElement).backgroundColor,
          sidebar: document
            .querySelector(".app-sidebar")
            .getBoundingClientRect().width,
          composer: document
            .querySelector(".composer")
            .getBoundingClientRect()
            .toJSON(),
        })),
      },
      null,
      2,
    ),
  );
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("radio", { name: "Dark", exact: true }).click();
  await page.getByRole("dialog", { name: "Settings", exact: true }).getByRole("button", { name: "Close", exact: true }).click();
  await page.screenshot({ path: path.join(root, "../analysis/app-dark.png") });
  await page.getByRole("button", {name: "View options", exact: true}).click(); await page.getByRole("menuitemcheckbox", {name: "Files", exact: true}).click();
  await page.getByRole("button", { name: "Close panel" }).waitFor();
  // Source labels: sidebar-groups.js hw "Hide sidebar" / Nb "Show sidebar".
  await page.getByRole("button", { name: "Hide sidebar" }).click();
  await page.getByRole("button", { name: "Show sidebar" }).waitFor();
  console.log("Theme, file panel, sidebar toggle passed.");
} finally {
  await app.close();
}
