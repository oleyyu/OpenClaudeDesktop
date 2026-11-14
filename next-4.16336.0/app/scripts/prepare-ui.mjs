import fs from "node:fs/promises";
import path from "node:path";
import {designVersion,designSnapshot,designIconModule,designIconFont,designEntryStylesheets,designComponentStylesheets,
  designLegacyVersion,designLegacySnapshot,legacyRegionStylesheets} from "./current-design-assets.mjs";
import { parseAst } from "rolldown/parseAst";
import {prepareStyleCompatibility} from "./prepare-style-compatibility.mjs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import './build-workflow-parser.mjs';
import './build-workflow-schema.mjs';
// Generators added during the 2.42304.0 migration each ship a `verify-gen-<area>.mjs` that runs the generator's
// `--check`; discovering them here keeps parallel migration lanes from editing this file. Each one runs in its own
// process: every generator parses multi-megabyte minified chunks, and importing them all into this process kept those
// ASTs alive until the heap ran out (about 2 GB after the first few, during the R4 gate). The older verifiers run the
// same way: imported together after the 3.6556.2 migration they ran this process out of its 4 GB heap.
const verifiers = ["verify-chat-ui.mjs", "verify-code-editor.mjs", "verify-code-start.mjs", "verify-code-ui-current.mjs", "verify-view-tabs.mjs",
  "verify-code-editor-current.mjs", "verify-terminal-shell.mjs", "verify-release-notes.mjs"];
for (const name of [...verifiers, ...(await fs.readdir(import.meta.dirname)).filter((n) => /^verify-gen-[a-z0-9-]+\.mjs$/.test(n)).sort()]) {
  const run = spawnSync(process.execPath, [path.join(import.meta.dirname, name)], { stdio: "inherit" });
  if (run.status !== 0) throw new Error(`${name} failed (${run.signal ?? `exit ${run.status}`})`);
}
const root = path.resolve(import.meta.dirname, "..");
const source = path.resolve(root, "../reference/current-2.2553.1/ion-dist/assets/v1");
// B38: the design-system stylesheets, their fonts and the Anthropicons map (which must match the icon font) come from
// the pinned latest frontend; the other extractions below still read 2.2553.1.
const designSource = path.resolve(root, "../reference", designSnapshot, "ion-dist/assets/v1");
// Legacy-region dependencies only (current-design-assets.mjs legacyRegionStylesheets): sheets 3.6556.2 regions still name.
const legacySource = path.resolve(root, "../reference", designLegacySnapshot, "ion-dist/assets/v1");
const dest = path.join(root, "public/assets/v1");
await fs.rm(dest, { recursive: true, force: true });
await fs.mkdir(dest, { recursive: true });
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const provenance = [];
async function copyAsset(name, target = path.join(dest, name), from = source, extra = {}) {
  const bytes = await fs.readFile(path.join(from, name));
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
  provenance.push({ source: name, ...(from === source ? {} : { sourceDir: path.relative(root, from) }), output: path.relative(root, target), sourceSha256: digest(bytes), outputSha256: digest(bytes), ...extra });
}
// Extract the actual numeric font map, including non-contiguous future glyphs, from the static AST of the pinned module
// (4.16336.0 shared-frame-CJdE5Ria.js gs = {icons:{…412}, secondary:{…24}, next, wght}); nothing is executed.
const iconSourceName = designIconModule;
const iconSource = await fs.readFile(path.join(designSource, iconSourceName), "utf8");
function anthropiconsMaps(code) {
  const keyOf = (node) => node.type === "Identifier" ? node.name : String(node.value);
  const numeric = (node) => {
    if (node?.type !== "ObjectExpression") throw new Error("Anthropicons map is not a static object");
    const out = {};
    for (const p of node.properties) {
      if (p.type !== "Property" || p.computed || p.value.type !== "Literal" || !Number.isSafeInteger(p.value.value)) throw new Error("Non-static Anthropicons glyph");
      if (Object.hasOwn(out, keyOf(p.key))) throw new Error(`Duplicate icon ${keyOf(p.key)}`);
      out[keyOf(p.key)] = p.value.value;
    }
    return out;
  };
  const found = [];
  for (const statement of parseAst(code).body) if (statement.type === "VariableDeclaration") for (const d of statement.declarations) {
    if (d.init?.type !== "ObjectExpression") continue;
    const props = new Map(d.init.properties.filter((p) => p.type === "Property" && !p.computed).map((p) => [keyOf(p.key), p.value]));
    if (!props.has("icons") || !props.has("secondary") || !props.has("next")) continue;
    const icons = numeric(props.get("icons"));
    if (icons.Activity === 57344) found.push({ icons, secondary: numeric(props.get("secondary")) });
  }
  if (found.length !== 1) throw new Error("Anthropicons map changed; trace the source before updating extraction.");
  return found[0];
}
const { icons: glyphs, secondary: secondaryGlyphs } = anthropiconsMaps(iconSource);
// Pinned 4.16336.0 contract: 412 primary glyphs and 24 secondary layers (styles-audit §5).
if (Object.keys(glyphs).length !== 412 || Object.keys(secondaryGlyphs).length !== 24 || !glyphs.ArrowReturn || !glyphs.StopCircle)
  throw new Error("Anthropicons map changed; trace the source before updating extraction.");
// The host renders icons through the official CdsIcon (src/icons.jsx → cds-core.mjs), which carries both tables itself;
// icons.json is the primary table the host and its tests look glyphs up in. No secondary file: nothing in the host reads it.
const iconOutput = JSON.stringify(glyphs, null, 2) + "\n";
await fs.mkdir(path.join(root, "src/generated"), { recursive: true });
await fs.writeFile(path.join(root, "src/generated/icons.json"), iconOutput);
provenance.push({ source: iconSourceName, sourceDir: path.relative(root, designSource), referenceVersion: designVersion, sourceSha256: digest(iconSource), output: "src/generated/icons.json", outputSha256: digest(iconOutput), transform: "Numeric gs.icons map extracted from the static AST without executing source", count: Object.keys(glyphs).length, secondaryCount: Object.keys(secondaryGlyphs).length });
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
await copyAsset("c25011d97-Dg-b7-mk.png");
// working-line: the clay activity marker's sprite sheets (c8677db5f's /assets/v1/*.webp), from the generator's checked
// copies (src/generated/working-line/manifest.json publicAssets), so a fresh public/assets/v1 still serves them.
for (const { name } of JSON.parse(await fs.readFile(path.join(root, "src/generated/working-line/manifest.json"), "utf8")).publicAssets) {
  await copyAsset(name, undefined, path.join(root, "src/generated/working-line/public-assets"));
}
// The Cowork progress empty-state art (public/images/illustrations/session-*.svg) is written from the 3.6556.2 snapshot by
// scripts/extract-cowork-progress.mjs, whose --check pins it (w11-sweep-curchat); it is no longer copied from 2.2553.1 here.
const copied = ["claude-spark.svg"];
// Stylesheets. Entry: the official index.html's three sheets, linked from app/index.html in that order. Lazy: every sheet a
// generated chunk preloads through its __vite__mapDeps list ("assets/v1/<name>.css"), as the original does, plus the
// sheets src/source-code-transcript.jsx links itself (CODE_TRANSCRIPT_SHEETS: the Code transcript renderer's chunks).
// Each needed sheet comes from the pinned snapshot when it ships there (a same-named 3.6556.2 sheet must be byte-equal);
// otherwise it must be a declared legacy-region dependency, whose naming regions must all still be on 3.6556.2, and is
// copied from the 3.6556.2 snapshot with legacyRegion / referenceVersion recorded. Nothing falls back silently.
const sheetRegions = new Map();
for (const file of (await fs.readdir(path.join(root, "src/generated"), { recursive: true })).filter((f) => /\.(?:m?js)$/.test(f))) {
  for (const m of (await fs.readFile(path.join(root, "src/generated", file), "utf8")).matchAll(/"assets\/v1\/([\w-]+\.css)"/g)) {
    if (designEntryStylesheets.includes(m[1])) continue;
    if (!sheetRegions.has(m[1])) sheetRegions.set(m[1], new Set());
    sheetRegions.get(m[1]).add(file.split(/[\\/]/)[0]);
  }
}
const transcriptSource = await fs.readFile(path.join(root, "src/source-code-transcript.jsx"), "utf8");
const transcriptSheets = JSON.parse(transcriptSource.match(/\bCODE_TRANSCRIPT_SHEETS = Object\.freeze\((\[[^\]]*\])\)/)?.[1] ?? "null");
// W14-code renderer-core (E86): the 3.6556.2 code-transcript renderer's chunk sheets; kept in step with the constant.
if (JSON.stringify(transcriptSheets) !== JSON.stringify(["c4a9ee384-Br-fzuOs.css", "c19e90103-CuNz46ca.css"]))
  throw new Error("CODE_TRANSCRIPT_SHEETS changed; update prepare-ui.mjs and current-design-assets.mjs legacyRegionStylesheets");
const hostLinked = new Set(transcriptSheets);
const legacyGlobal = Object.keys(legacyRegionStylesheets).filter((name) => legacyRegionStylesheets[name].global);
const regionVersion = async (area) => {
  for (const record of ["manifest.json", "provenance.json"]) {
    const data = JSON.parse(await fs.readFile(path.join(root, "src/generated", area, record), "utf8").catch(() => "null"));
    const version = data && !Array.isArray(data) ? data.referenceVersion ?? data.version : null;
    if (version) return version;
  }
  return null;
};
const sheetPlan = [];
for (const name of designEntryStylesheets) sheetPlan.push({ name, from: designSource, extra: { referenceVersion: designVersion, loading: "entry (index.html)" } });
const needed = [...new Set([...sheetRegions.keys(), ...hostLinked, ...legacyGlobal])].sort();
for (const name of needed) {
  const loading = [sheetRegions.has(name) && "lazy (vitePreload)", hostLinked.has(name) && "host link (CODE_TRANSCRIPT_SHEETS)",
    legacyGlobal.includes(name) && "global (index.html)"].filter(Boolean).join("; ");
  const inTarget = await fs.stat(path.join(designSource, name)).then(() => true, () => false);
  if (inTarget) {
    if (legacyRegionStylesheets[name]) throw new Error(`${name} ships in ${designVersion}; drop it from legacyRegionStylesheets`);
    const previous = await fs.readFile(path.join(legacySource, name)).catch(() => null);
    if (previous && !previous.equals(await fs.readFile(path.join(designSource, name)))) throw new Error(`${name} differs between ${designLegacyVersion} and ${designVersion}`);
    sheetPlan.push({ name, from: designSource, extra: { referenceVersion: designVersion, loading } });
    continue;
  }
  const legacy = legacyRegionStylesheets[name];
  if (!legacy) throw new Error(`${name} is named by ${[...(sheetRegions.get(name) ?? ["src/source-code-transcript.jsx"])].join(", ")} but is not in ${designVersion} and not a declared legacy-region dependency`);
  const regions = [...(sheetRegions.get(name) ?? [])].sort();
  if (JSON.stringify(regions) !== JSON.stringify([...legacy.regions].sort())) throw new Error(`${name}: naming regions ${regions.join(",")} differ from the declared ${legacy.regions.join(",")}`);
  for (const area of regions) if (await regionVersion(area) !== designLegacyVersion) throw new Error(`${name}: region ${area} is not on ${designLegacyVersion}; migrate its sheet reference`);
  if (hostLinked.has(name) !== Boolean(legacy.hostLinks)) throw new Error(`${name}: host link declaration differs from CODE_TRANSCRIPT_SHEETS`);
  // A global legacy sheet is held by the regions its host consumers render (globalRegions); each must still be on
  // 3.6556.2, so migrating one of them fails here until the global link is re-justified or removed.
  if (Boolean(legacy.global) !== Boolean(legacy.globalRegions?.length)) throw new Error(`${name}: a global legacy sheet must declare globalRegions (and only a global one may)`);
  for (const area of legacy.globalRegions ?? []) {
    const version = await regionVersion(area);
    if (version !== designLegacyVersion) throw new Error(`${name}: global holder region ${area} is ${version ?? "unversioned"}, not ${designLegacyVersion}; drop the global link or re-declare its holders`);
  }
  sheetPlan.push({ name, from: legacySource, extra: { referenceVersion: designLegacyVersion, legacyRegion: [...legacy.regions], replacedBy: legacy.replacedBy,
    ...(legacy.hostLinks ? { hostLinks: [...legacy.hostLinks] } : {}),
    ...(legacy.global ? { globalFor: [...legacy.global], globalRegions: [...legacy.globalRegions] } : {}), loading } });
}
for (const name of Object.keys(legacyRegionStylesheets)) if (!needed.includes(name)) throw new Error(`${name} is declared as a legacy-region dependency but nothing names it; remove it`);
// integration-1 preload-helper: the view-tabs preload helper's assetsURL is the host's viteAssetUrl
// (src/view-tabs-asset-url.mjs), which resolves each "assets/v1/<sheet>" dependency against document.baseURI (the
// href index.html and CODE_TRANSCRIPT_SHEETS links carry, under file:// and the dev server alike) and points a 3.6556.2
// sheet 4.16336.0 superseded with an index.html entry sheet at that linked sheet (SUPERSEDED_LEGACY_SHEETS). That table
// must be exactly the lazy-only legacy sheets whose replacedBy is an entry sheet, each mapped to its own replacedBy.
const viewTabsAdapters = await fs.readFile(path.join(root, "src/view-tabs-asset-url.mjs"), "utf8");
const supersededSheets = JSON.parse(viewTabsAdapters.match(/\bSUPERSEDED_LEGACY_SHEETS = Object\.freeze\((\{[^}]*\})\)/)?.[1] ?? "null");
if (!supersededSheets) throw new Error("src/view-tabs-asset-url.mjs no longer declares SUPERSEDED_LEGACY_SHEETS as a JSON object literal");
const replacementOf = (name) => /^[\w-]+\.css\b/.exec(legacyRegionStylesheets[name]?.replacedBy ?? "")?.[0] ?? null;
const expectedSuperseded = Object.fromEntries(needed.filter((name) => { const legacy = legacyRegionStylesheets[name];
  return legacy && !legacy.global && !hostLinked.has(name) && sheetRegions.has(name) && designEntryStylesheets.includes(replacementOf(name)); })
  .map((name) => [name, replacementOf(name)]));
if (JSON.stringify(Object.entries(supersededSheets).sort()) !== JSON.stringify(Object.entries(expectedSuperseded).sort()))
  throw new Error(`SUPERSEDED_LEGACY_SHEETS ${JSON.stringify(supersededSheets)} differs from the legacy sheets index.html supersedes ${JSON.stringify(expectedSuperseded)}`);
const assetOrigin = new Map();
for (const { name: file, from, extra } of sheetPlan) {
  const raw = await fs.readFile(path.join(from, file), "utf8");
  for (const m of raw.matchAll(/url\(["']?\/assets\/v1\/([^\s)"']+)/g)) {
    const name = m[1];
    const bytes = await fs.readFile(path.join(from, name));
    const seen = assetOrigin.get(name);
    if (seen && !seen.equals(bytes)) throw new Error(`${name} differs between the sheets that reference it`);
    if (!seen) await copyAsset(name, undefined, from, { referenceVersion: extra.referenceVersion, ...(extra.legacyRegion ? { legacyRegion: extra.legacyRegion, referencedBy: file } : {}) });
    assetOrigin.set(name, bytes);
    copied.push(name);
  }
  await fs.writeFile(path.join(dest, file), raw.replaceAll("/assets/v1/", "./"));
  copied.push(file);
  provenance.push({ source: file, sourceDir: path.relative(root, from), output: "public/assets/v1/" + file, sourceSha256: digest(raw), outputSha256: digest(raw.replaceAll("/assets/v1/", "./")), ...extra });
}
// The icon font both entry sheets declare (Anthropicons-Variable) is the pinned one, preloaded from index.html.
if (!assetOrigin.has(designIconFont)) throw new Error(`${designIconFont} is not referenced by the entry sheets`);
provenance.push({ source: "shared-7-DsClUbcz.js", sourceSha256: digest(logoModule), output: "public/assets/v1/claude-spark.svg", outputSha256: digest(await fs.readFile(path.join(dest, "claude-spark.svg"))), transform: "Original mf spark path wrapped in SVG" });
await fs.writeFile(
  path.join(root, "public/ui-provenance.json"),
  JSON.stringify(
    {
      source: `Local Claude Desktop 2.2553.1 installation; design-system CSS, fonts and icon map from ${designVersion}; legacy-region sheets from ${designLegacyVersion}`,
      designVersion, designSnapshot, designEntryStylesheets,
      designComponentStylesheets: Object.fromEntries(Object.entries(designComponentStylesheets).map(([name, entry]) => [name, { ...entry,
        shipped: sheetPlan.some((plan) => plan.name === name), note: "loaded with its owning official module; not linked from index.html" }])),
      legacyDebt: sheetPlan.filter((plan) => plan.extra.legacyRegion).map((plan) => ({ stylesheet: plan.name, referenceVersion: designLegacyVersion,
        legacyRegion: plan.extra.legacyRegion, ...(plan.extra.globalRegions ? { globalRegions: plan.extra.globalRegions } : {}),
        replacedBy: plan.extra.replacedBy, loading: plan.extra.loading,
        // Packaged (file://…/dist/index.html) reachability. The view-tabs preload helper resolves deps with the host's
        // viteAssetUrl (document.baseURI, integration-1 preload-helper; the official "/"+dep gave file:///assets/v1/), so a
        // global or host-linked legacy sheet is the linked one (the helper finds the link and does not load it twice), a
        // superseded one is never requested (the helper meets the linked replacement), and any other lazy one loads from
        // dist/assets/v1 with its chunk.
        packagedLoad: plan.extra.globalRegions ? "index.html link" : plan.extra.hostLinks ? "host link (CODE_TRANSCRIPT_SHEETS)"
          : Object.hasOwn(supersededSheets, plan.name) ? `superseded: vitePreload resolves to the index.html link ${supersededSheets[plan.name]}`
          : "lazy: vitePreload resolves against document.baseURI" })),
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
