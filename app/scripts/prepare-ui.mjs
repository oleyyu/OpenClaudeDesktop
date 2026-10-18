import fs from "node:fs/promises";
import path from "node:path";
import {designVersion,designSnapshot,designIconModule,designStylesheets} from "./current-design-assets.mjs";
import {prepareStyleCompatibility} from "./prepare-style-compatibility.mjs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import './build-workflow-parser.mjs';
import './build-workflow-schema.mjs';
import './verify-chat-ui.mjs';
import './prepare-current-chat-ui.mjs';
import './verify-code-editor.mjs';
import './verify-code-start.mjs';
import './verify-code-ui-current.mjs';
import './verify-view-tabs.mjs';
import './verify-code-editor-current.mjs';
import './verify-terminal-shell.mjs';
import './verify-release-notes.mjs';
// Generators added during the 2.42304.0 migration each ship a `verify-gen-<area>.mjs` that runs the generator's
// `--check`; discovering them here keeps parallel migration lanes from editing this file. Each one runs in its own
// process: every generator parses multi-megabyte minified chunks, and importing them all into this process kept those
// ASTs alive until the heap ran out (about 2 GB after the first few, during the R4 gate).
for (const name of (await fs.readdir(import.meta.dirname)).filter((n) => /^verify-gen-[a-z0-9-]+\.mjs$/.test(n)).sort()) {
  const run = spawnSync(process.execPath, [path.join(import.meta.dirname, name)], { stdio: "inherit" });
  if (run.status !== 0) throw new Error(`${name} failed (${run.signal ?? `exit ${run.status}`})`);
}
const root = path.resolve(import.meta.dirname, "..");
const source = path.resolve(root, "../reference/current-2.2553.1/ion-dist/assets/v1");
// B38: the design-system stylesheets, their fonts and the Anthropicons map (which must match the icon font) come from
// the pinned latest frontend; the other extractions below still read 2.2553.1.
const designSource = path.resolve(root, "../reference", designSnapshot, "ion-dist/assets/v1");
const dest = path.join(root, "public/assets/v1");
await fs.rm(dest, { recursive: true, force: true });
await fs.mkdir(dest, { recursive: true });
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const provenance = [];
async function copyAsset(name, target = path.join(dest, name), from = source) {
  const bytes = await fs.readFile(path.join(from, name));
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
  provenance.push({ source: name, ...(from === source ? {} : { sourceDir: path.relative(root, from) }), output: path.relative(root, target), sourceSha256: digest(bytes), outputSha256: digest(bytes) });
}
// Extract the actual numeric font map, including non-contiguous future glyphs.
const iconSourceName = designIconModule;
const iconSource = await fs.readFile(path.join(designSource, iconSourceName), "utf8");
// 2.37337.1 qa={icons:{…},secondary:{…},next:…}: `icons` already lists the secondary set's glyphs too.
const iconBlock = iconSource.match(/icons:\{(Activity:57344,[^}]+)\},(?:secondary|next):/)?.[1];
if (!iconBlock) throw new Error("Anthropicons map changed; trace the source before updating extraction.");
const glyphs = Object.fromEntries([...iconBlock.matchAll(/([A-Za-z][A-Za-z0-9]*):(\d+)/g)].map((m) => [m[1], Number(m[2])]));
if (Object.keys(glyphs).length < 300 || !glyphs.ArrowReturn || !glyphs.StopCircle) throw new Error("Incomplete Anthropicons map");
const iconOutput = JSON.stringify(glyphs, null, 2) + "\n";
await fs.mkdir(path.join(root, "src/generated"), { recursive: true });
await fs.writeFile(path.join(root, "src/generated/icons.json"), iconOutput);
provenance.push({ source: iconSourceName, sourceDir: path.relative(root, designSource), sourceSha256: digest(iconSource), output: "src/generated/icons.json", outputSha256: digest(iconOutput), transform: "Numeric icons map extracted without executing source", count: Object.keys(glyphs).length });
await copyAsset("c838f53ee-DqwARLA7.json", path.join(root, "public/reference/clawd-laptop.json"));
await copyAsset("cf27cae7f-IGfSpeOJ.js", path.join(root, "public/reference/lottie-player.js"));
// Extract the original 24px spark geometry from the installed compiled logo module.
const logoModule = await fs.readFile(
  path.join(source, "shared-7-DsClUbcz.js"),
  "utf8",
);
const spark = logoModule.match(/\bmf="([^"]+)"/);
if (!spark)
  throw new Error(
    "The installed logo module changed; inspect it before updating the extraction.",
  );
await fs.writeFile(
  path.join(dest, "claude-spark.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#d97757" d="${spark[1]}"/></svg>`,
);
// Classic status row Spark "thinking" strip (shared-frame uv/cv lazily import
// cf2613ee5 `animations`). Only the reachable state is extracted, as data; the
// module itself is never executed and the seven other strips stay unshipped.
const spriteSourceName = "cf2613ee5-Btwr9m9F.js";
const spriteSource = await fs.readFile(path.join(source, spriteSourceName), "utf8");
const spriteStates = [...spriteSource.matchAll(/([a-z]+):\{svg:'<svg viewBox="([^"]+)">((?:(?!'\}).)*?)<\/svg>',width:(\d+),height:(\d+),frameCount:(\d+),speed:(\d+)\}/g)]
  .map((m) => ({ name: m[1], viewBox: m[2], body: m[3], width: Number(m[4]), height: Number(m[5]), frameCount: Number(m[6]), speed: Number(m[7]) }));
const thinking = spriteStates.find((state) => state.name === "thinking");
if (spriteStates.length !== 8 || !thinking) throw new Error("Spark sprite module changed; trace shared-frame cv/uv before updating extraction.");
const thinkingPaths = [...thinking.body.matchAll(/<path d="([^"]+)"\/>/g)].map((m) => m[1]);
if (thinkingPaths.length !== 1 || thinking.body !== `<path d="${thinkingPaths[0]}"/>` || thinking.viewBox !== "0 0 100 900"
  || thinking.width !== 100 || thinking.height !== 100 || thinking.frameCount !== 9 || thinking.speed !== 90 || !/^[mMlLhHvVcCsSqQtTaAzZ0-9 .,-]+$/.test(thinkingPaths[0]))
  throw new Error("Spark thinking strip shape changed (expected one path, 9 frames x 90ms, viewBox 0 0 100 900).");
const sparkStrip = JSON.stringify({ name: "thinking", viewBox: thinking.viewBox, path: thinkingPaths[0],
  width: thinking.width, height: thinking.height, frameCount: thinking.frameCount, speed: thinking.speed }, null, 2) + "\n";
await fs.writeFile(path.join(root, "src/generated/spark-thinking.json"), sparkStrip);
provenance.push({ source: spriteSourceName, sourceSha256: digest(spriteSource), output: "src/generated/spark-thinking.json", outputSha256: digest(sparkStrip),
  transform: "thinking strip extracted without executing source",
  otherStates: spriteStates.filter((state) => state.name !== "thinking").map(({ name, viewBox, width, height, frameCount, speed }) => ({ name, viewBox, width, height, frameCount, speed })) });
// Static MCP empty-state illustration: extract data, never evaluate its module.
const mcpSourceName = 'c71860c77-CCdfSDER.js';
const mcpSource = await fs.readFile(path.join(source,mcpSourceName),'utf8');
const mcpBlock = mcpSource.match(/function M\(\)\{[\s\S]*?(?=var )/)?.[0];
const mcpPaths = [...(mcpBlock || '').matchAll(/d:"([^"]+)",fill:e\.resolvedMode==="dark"\?"(#[\dA-F]+)":"(#[\dA-F]+)"/g)].map(([,d,dark,light])=>({d,dark,light}));
if(mcpPaths.length!==4 || !mcpBlock.includes('viewBox:"0 0 70 71"') || mcpPaths.some(p=>!/^[mMlLhHvVcCsSqQtTaAzZ0-9 .,-]+$/.test(p.d)))throw Error('MCP empty illustration changed; inspect the source before updating extraction.');
const mcpIllustration=JSON.stringify({viewBox:'0 0 70 71',width:70,height:71,paths:mcpPaths},null,2)+'\n';
await fs.writeFile(path.join(root,'src/generated/mcp-empty.json'),mcpIllustration);
provenance.push({source:mcpSourceName,sourceSha256:digest(mcpSource),output:'src/generated/mcp-empty.json',outputSha256:digest(mcpIllustration),transform:'Four static SVG paths and theme colors extracted without executing source'});
const files = designStylesheets;
await copyAsset("c25011d97-Dg-b7-mk.png");
// working-line: the clay activity marker's sprite sheets (c8677db5f's /assets/v1/*.webp), from the generator's checked
// copies (src/generated/working-line/manifest.json publicAssets), so a fresh public/assets/v1 still serves them.
for (const { name } of JSON.parse(await fs.readFile(path.join(root, "src/generated/working-line/manifest.json"), "utf8")).publicAssets) {
  await copyAsset(name, undefined, path.join(root, "src/generated/working-line/public-assets"));
}
for (const name of ['session-progress.svg', 'session-progress-dark.svg', 'session-artifacts.svg', 'session-artifacts-dark.svg']) {
  await copyAsset('../../images/illustrations/' + name, path.join(root, 'public/images/illustrations', name));
}
const copied = ["claude-spark.svg"];
for (const file of files) {
  const raw = await fs.readFile(path.join(designSource, file), "utf8");
  for (const m of raw.matchAll(/url\(["']?\/assets\/v1\/([^\s)"']+)/g)) {
    const name = m[1];
    await copyAsset(name, undefined, designSource);
    copied.push(name);
  }
  await fs.writeFile(
    path.join(dest, file),
    raw.replaceAll("/assets/v1/", "./"),
  );
  copied.push(file);
  provenance.push({ source: file, sourceDir: path.relative(root, designSource), output: "public/assets/v1/" + file, sourceSha256: digest(raw), outputSha256: digest(raw.replaceAll("/assets/v1/", "./")) });
}
provenance.push({ source: "shared-7-DsClUbcz.js", sourceSha256: digest(logoModule), output: "public/assets/v1/claude-spark.svg", outputSha256: digest(await fs.readFile(path.join(dest, "claude-spark.svg"))), transform: "Original mf spark path wrapped in SVG" });
await fs.writeFile(
  path.join(root, "public/ui-provenance.json"),
  JSON.stringify(
    {
      source: `Local Claude Desktop 2.2553.1 installation; design-system CSS, fonts and icon map from ${designVersion}`,
      designVersion, designSnapshot,
      compatibilityStylesheet: "style-compatibility.json",
      purpose: "Private local UI study; original assets retain their ownership",
      cssModification: "Only asset URL paths made relative",
      files: [...new Map(provenance.map((entry) => [entry.output, entry])).values()],
    },
    null,
    2,
  ),
);
console.log(`Prepared ${new Set(copied).size} original style/font assets`);
await prepareStyleCompatibility();
// Package dependency notices alongside the emitted worker, even though the
// application archive deliberately excludes development node_modules/build.
const noticeSource = path.join(root, "build/highlight-notices");
const noticeDest = path.join(root, "public/third-party/highlight");
await fs.rm(noticeDest, { recursive: true, force: true });
await fs.cp(noticeSource, noticeDest, { recursive: true });
// Main-thread color table for the code theme catalog (editor background,
// foreground and selection): the renderer exposes --code-theme-* variables
// from it without loading a theme module outside the worker. Claude entries
// come from the local transcriptions; the rest are read from the pinned
// @shikijs/themes package at build time (data only; nothing is executed from
// the official bundle).
const { CODE_THEMES } = await import("../electron/code-theme-catalog.mjs");
const { lightTheme: claudeLight, darkTheme: claudeDark } = await import("../src/highlight-themes.mjs");
// Official c6e73333a g(): a theme without editor.selectionBackground takes the
// Claude palette's selection for that mode (c5d464fa3 C(mode, key)), not the
// VS Code defaults; github-dark-dimmed, min-dark, slack-dark and min-light lack it.
const selectionDefaults = { light: claudeLight.colors["editor.selectionBackground"], dark: claudeDark.colors["editor.selectionBackground"] };
if (selectionDefaults.light !== "#0073e640" || selectionDefaults.dark !== "#0099ff4d") throw new Error("Claude selection colors changed");
const themeColors = {};
for (const entry of CODE_THEMES) {
  const theme = entry.value === "claude-light" ? claudeLight : entry.value === "claude-dark" ? claudeDark
    : (await import(`@shikijs/themes/${entry.value}`)).default;
  const colors = theme.colors ?? {};
  // Same normalization as highlight-tokenizer normalizeColor: #rgb/#rgba expand to six/eight digits.
  const hex = (value) => {
    const short = typeof value === "string" ? value.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i) : null;
    const full = short ? `#${short.slice(1, 5).filter(Boolean).map((digit) => digit + digit).join("")}` : value;
    return typeof full === "string" && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(full) ? full.toLowerCase() : null;
  };
  // Shiki's resolved fg: editor.foreground, then the theme's fg, then the scope-less default token color.
  const defaultToken = theme.tokenColors?.find((rule) => !rule.scope)?.settings?.foreground;
  const bg = hex(colors["editor.background"] ?? theme.bg), fg = hex(colors["editor.foreground"] ?? theme.fg ?? defaultToken);
  if (!bg || !fg) throw new Error(`Theme ${entry.value} lacks editor colors`);
  themeColors[entry.value] = { mode: entry.mode, bg, fg, selection: hex(colors["editor.selectionBackground"]) ?? selectionDefaults[entry.mode], editor: {type: entry.mode, colors: {...colors, 'editor.foreground': fg, 'editor.background': bg}, ...(theme.colorReplacements ? {colorReplacements:theme.colorReplacements} : {})} };
}
await fs.writeFile(path.join(root, "src/generated/code-theme-colors.json"), JSON.stringify(themeColors, null, 2) + "\n");
await fs.cp(path.join(root,"build/editor-notices"),path.join(root,"public/third-party/editor"),{recursive:true});
const buildSources = [];
for (const folder of ["src", "electron", "build/highlight-notices", "build/editor-notices", "third-party/codex-workflows-runner"]) {
  for (const name of await fs.readdir(path.join(root, folder), { recursive: true })) {
    const file = path.join(root, folder, name);
    if ((await fs.stat(file)).isFile()) buildSources.push(path.relative(root, file));
  }
}
buildSources.push("package.json", "package-lock.json", "vite.config.js", "index.html", "scripts/prepare-ui.mjs", "scripts/build-workflow-parser.mjs");
const sourceHashes = [];
for (const file of buildSources.sort()) sourceHashes.push({ path: file, sha256: digest(await fs.readFile(path.join(root, file))) });
await fs.writeFile(path.join(root, "public/build-info.json"), JSON.stringify({
  version: JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version,
  builtAt: new Date().toISOString(), sourceSha256: digest(JSON.stringify(sourceHashes)), sources: sourceHashes,
}, null, 2));
