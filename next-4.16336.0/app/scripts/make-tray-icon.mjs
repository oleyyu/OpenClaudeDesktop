import { chromium } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
// Menu bar template image (main dji/uji "TrayIconTemplate.png"): black glyph on
// alpha, 24pt canvas with @2x/@3x reps. The original glyph spans 34 of 48px, so
// the app icon's </> mark is cropped to that box. Headless render; no window.
const root = path.resolve(import.meta.dirname, "../electron/assets");
await fs.mkdir(root, { recursive: true });
const glyph = size =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><svg x="3.5" y="3.5" width="17" height="17" viewBox="214 214 596 596"><path d="m410 346-167 166 167 166m204-332 167 166-167 166M557 307l-90 410" fill="none" stroke="#000" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"/></svg></svg>`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const [scale, suffix] of [[1, ""], [2, "@2x"], [3, "@3x"]]) {
    const size = 24 * scale;
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${glyph(size)}`);
    await page.screenshot({ path: path.join(root, `TrayIconTemplate${suffix}.png`), omitBackground: true });
    await page.close();
  }
} finally {
  await browser.close();
}
console.log("Created menu bar template icons.");
