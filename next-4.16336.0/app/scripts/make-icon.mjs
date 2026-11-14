import { chromium } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../build");
await fs.mkdir(path.join(root, "icon.iconset"), { recursive: true });
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect x="62" y="62" width="900" height="900" rx="208" fill="#f4f1eb" stroke="#dedad2" stroke-width="3"/><path d="m410 346-167 166 167 166m204-332 167 166-167 166" fill="none" stroke="#b16c4d" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"/><path d="m557 307-90 410" fill="none" stroke="#343330" stroke-width="45" stroke-linecap="round"/></svg>';
await fs.writeFile(path.join(root, "icon.svg"), svg);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}</style>${svg}`,
  );
  await page.screenshot({
    path: path.join(root, "icon.png"),
    omitBackground: true,
  });
} finally {
  await browser.close();
}
for (const size of [16, 32, 128, 256, 512])
  for (const scale of [1, 2])
    execFileSync(
      "sips",
      [
        "-z",
        String(size * scale),
        String(size * scale),
        path.join(root, "icon.png"),
        "--out",
        path.join(
          root,
          `icon.iconset/icon_${size}x${size}${scale === 2 ? "@2x" : ""}.png`,
        ),
      ],
      { stdio: "ignore" },
    );
execFileSync("iconutil", [
  "-c",
  "icns",
  path.join(root, "icon.iconset"),
  "-o",
  path.join(root, "icon.icns"),
]);
console.log("Created OpenClaude Desktop app icon.");
