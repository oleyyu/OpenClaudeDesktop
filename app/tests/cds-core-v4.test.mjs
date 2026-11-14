// Production cds-core (scripts/extract-cds-core-v4.mjs → src/generated/cds-core, facade src/cds-core.mjs): the merged
// 4.16336.0 graph of analysis/.../cds-pilot/staging, regenerated into the app tree with the host adapter: twelve wave-1
// roots, the five CDS wave-2 lanes (57 roots, cds-integrate/merge-pins-wave2.mjs) and the wave-3 fragments
// cds-wave3-final and cds-surface-additions (107 roots, cds-integrate/merge-pins-wave3.mjs), then the cds-wave4 states,
// utils and components lanes (146 roots, 407 publicNames, cds-integrate/merge-pins-wave4.mjs), then the cds-wave5 D1
// convergence fragment (50 more publicNames, cds-integrate/merge-pins-wave5.mjs: the module state two or more 4.16336.0
// graphs used to cut, its readers / writers, the carried shared-62 pagehide / pageshow registration and the preload
// helper bound to the host viteAssetUrl), then the cds-wave5b lane (96 more publicNames, cds-integrate/merge-pins-wave5b.mjs:
// the module state, writers and pure links the region graphs share, 6 new chunk modules, no adapter change), then the
// cds-wave6 shared-layer publish (1747 more publicNames, cds-integrate/merge-pins-wave6.mjs: the titlebar-frame state that
// leaves routines-shared-v4, the nav-plan holders, the account2 Tier A / B requests that pass the wave-6 fixpoint, the
// TanStack Query singletons, 84 new chunk modules; three of them read the existing host intl / GrowthBook adapter exports,
// no adapter change), then the cds-wave7 write-integrity publish (77 more publicNames, cds-integrate/merge-pins-wave7.mjs:
// the writers whose state wave 6 published alone, the whole vendor-zod state unit with its __zod_globalConfig initialiser,
// the round-2 / round-3 requests, 7 new chunk modules; c8ae173c6 reads the existing host intl adapter export, no adapter
// change), then the cds-wave8 publish (153 more publicNames, cds-integrate/merge-pins-wave8.mjs: the frame-sidebar-nav
// writers, the official o11y runtime (pre-init Datadog SDK, consent-closed event logging), the frame store Y with its carried
// Y.persist.onFinishHydration(NS), the zod schemas, vendor-datadog and its two lazy chunks (3 new modules), and three unique
// host boundaries: shared-0 Ru / Ku over the host GrowthBook table and uO over src/host-window-state.mjs). This checks
// the generated
// graph, its provenance, the facade and host React SSR passes; host wiring (which app modules import which name) is not
// here.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseAst } from "rolldown/parseAst";
import * as official from "../scripts/official-4.16336.0.mjs";
import { extract, output, adapterPath, contexts } from "../scripts/extract-cds-core-v4.mjs";
import { pilot } from "../scripts/extract-cds-pilot-v4.mjs";
import { pins } from "../../analysis/claude-4.16336.0-migrate-20261104/cds-pilot/provenance.mjs";
import { productionAdapterBytesWave5 } from "../../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/merge-pins-wave5.mjs";
import { productionAdapterBytesWave8 } from "../../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/merge-pins-wave8.mjs";
// wave 8d (R4-Q1, real-tree replay over addendum C, R4-K1): the adapter also re-exports the session-presets host boundaries (stage-14d adapter block).
import { productionAdapterBytesWave8d } from "../../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/merge-pins-wave8d.mjs";

const app = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const sha = (x) => createHash("sha256").update(x).digest("hex");
const json = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const staging = path.join(pilot, "staging/src/generated/cds-core");
const facadeFile = path.join(app, "src/cds-core.mjs");
const el = React.createElement;
const ROOTS = ["CdsButton", "CdsIcon", "CdsSpinner", "CdsBadge", "CdsRoot", "CdsTooltipProvider", "CdsTextInputField", "CdsTextAreaField",
  "CdsPage", "CdsBanner", "CdsTabs", "CdsTextLink",
  // wave 2 (overlays, menus, dialogs, form-controls, display); names follow the 3.6556.2 view-tabs facade.
  "CdsTooltip", "CdsOverflowTooltip", "CdsPopover", "CdsLayerProvider", "useCdsLayerAwareZIndex", "useCdsOwnerWindow", "useCdsOwnerWindowAnchor",
  "CdsDropdown", "CdsContextMenu", "CdsSplitDropdownButton", "cdsMenuItemClass", "cdsDropdownGroupLabelClass",
  "CdsDialog", "CdsAlertDialog", "CdsConfirmationDialog",
  "CdsTextInput", "CdsTextArea", "CdsCheckbox", "CdsCheckboxRow", "CdsCheckboxIndicator", "cdsCheckboxTopAlignClass", "CdsRadioGroup",
  "CdsSegmentedControl", "CdsField", "CdsFieldLabel", "CdsFieldError", "CdsFieldDescription", "CdsCombobox", "CdsComboboxField",
  "CdsShimmer", "CdsSkeleton", "CdsSurface", "cdsSurfaceClass", "CdsCard", "CdsCollapsible", "CdsButtonGroup", "CdsAvatar", "CdsCounter",
  "CdsPulse", "CdsShortcut", "CdsRelativeTime", "CdsPictogram", "CdsHiddenReasonText", "CdsDisabledReason", "cdsClassNames"];
// wave 3: cds-wave3-final (ViewTabBar family, Sessions row parts, helpers) and cds-surface-additions; 3.6556.2
// view-tabs names where one existed.
const ROOTS3 = ["ViewTabBar", "useViewTabIconSize", "viewTabSizes", "viewTabLabels", "ViewTab", "ViewTabOverflowItem", "ViewTabOverflowMenu",
  "useViewTabOverflow", "SessionsRowLayout", "SessionsMoreButton", "SessionsDateLayout", "SessionsHighlight", "SessionsActionsRail",
  "findSessionTitleMatch", "useVirtualizer", "useDirection", "useCdsDensity", "useIsMacPlatform", "isMacUserAgent", "mergeProps",
  "asElementNode", "ariaKeyShortcuts", "clsx",
  "useCdsIconSize", "CdsSpark", "CdsAnimatedSpark", "CdsSwitch", "CdsInfoTooltip", "CdsLoadingSkeleton", "useCdsOwnerAnchor",
  "CdsDeferredTooltip", "CdsSearchableMenuPopup", "useCdsLinkProps", "sanitizeCdsHref", "CdsPreviewCard", "CdsSeparator",
  "useCdsIsoLayoutEffect", "useCdsMergedRefs", "useCdsLabel", "useFizzyLakePart", "CdsPortalRoot", "useCdsFieldDisabled", "useCdsLocale",
  "useLazyMutationObserver", "CdsOpensInNewTabHint", "useLatestCallback", "useCdsFieldInvalid", "useCdsRootRemPx", "useClickToFocus",
  "useLazyObserver"];
const CONTEXTS = ["CdsDensityContext", "CdsLocaleContext", "CdsLabelsContext", "CdsRouterContext", "CdsFizzyLakePartsContext",
  "CdsTooltipDelayContext", "CdsDirectionContext"];
const CONTEXTS3 = ["CdsButtonIconSizeContext", "CdsButtonGroupContext", "CdsTooltipDeferralContext", "CdsTooltipImplContext", "ViewTabIconSizeContext"];
// wave 4 (cds-integrate/merge-pins-wave4.mjs): 288 names appended in publication order, each with its kind (root, context
// or module state) in pins.merge.wave4.publicNames.
const WAVE4 = pins.merge.wave4.publicNames;
// wave 5 (cds-integrate/merge-pins-wave5.mjs): 50 names appended after them in lane order (kind "binding": state, writer,
// reader or the vitePreload helper; pins.publicBindings pins each declaration).
const WAVE5 = pins.merge.wave5.publicNames;
// wave 5b (cds-integrate/merge-pins-wave5b.mjs): 96 names appended after them in lane order, pinned the same way.
const WAVE5B = pins.merge.wave5b.publicNames;
// wave 6 (cds-integrate/merge-pins-wave6.mjs): 1747 names appended after them in fragment order, pinned the same way.
const WAVE6 = pins.merge.wave6.publicNames;
// wave 7 (cds-integrate/merge-pins-wave7.mjs): 77 names appended after them in candidate order, pinned the same way.
const WAVE7 = pins.merge.wave7.publicNames;
// wave 8 (cds-integrate/merge-pins-wave8.mjs): 153 names appended after them in lane order, pinned the same way.
const WAVE8 = pins.merge.wave8.publicNames;
// wave 8s (cds-integrate/merge-pins-wave8s.mjs, W8S-M1): 397 settings names appended after them in fragment order, pinned the same way.
const WAVE8S = pins.merge.wave8s.publicNames;
// wave 8a (cds-integrate/merge-pins-wave8a.mjs, R4-K1 addendum A, stage 11a): 260 identity values (the shared-25 _H family)
// appended after the wave-8s names, pinned the same way (pins.publicBindings, kind binding).
const WAVE8A = pins.merge.wave8a.publicNames;
// wave 8b (cds-integrate/merge-pins-wave8b.mjs, R4-K1 addendum B, stage 12b): 6 names appended after the wave-8a names.
const WAVE8B = pins.merge.wave8b.publicNames;
// wave 8c (cds-integrate/merge-pins-wave8c.mjs, R4-K1 addendum C, stage 13c): 5 names (shared-4 rO / eD, shared-26 BH,
// shared-25 w_, shared-0 Es) appended after the wave-8b names, pinned the same way (pins.publicBindings, kind binding).
const WAVE8C = pins.merge.wave8c.publicNames;
// wave 8d (cds-integrate/merge-pins-wave8d.mjs, R4-Q1 addendum D replayed over addendum C, R4-K1, stage 14d): 11 names (shared-39
// Pu, its closure state $l / eu / nu / Mu / kc / Su and writers cu / ru / wu, shared-25 Mz) appended after the wave-8c names.
const WAVE8D = pins.merge.wave8d.publicNames;

test("generator --check: production output is current", async () => {
  const manifest = await extract({ check: true });
  // wave 8c (R4-K1 addendum C, wave8c/union.json: the 10527 kept identical, + 6: rO / eD / BH, BH's pure closure and the writer w_; Es was held); was: 10527
  // wave 8d (R4-Q1 addendum D, wave8d/union.json: the 10533 kept identical, + 80: Pu's closure); was: 10533
  assert.equal(manifest.modules.reduce((n, m) => n + m.bindings.length, 0), 10613); // wave 8a/8b (R4-K1, wave8ab/union.json: the 10522 kept identical, + 5 bindings the wave-8b names reach in shared-92 / shared-8 / shared-4 / c227f4d5e; wave 8a adds none); wave 8s: 10522 (W8S-M1, wave8s/union.json); wave 8: 9746 (wave8/union.json); wave 7: 7321
});

test("manifest: 4.16336.0 snapshot, pinned source hashes, module bytes, no view-tabs graph", async () => {
  const manifest = await json(path.join(output, "manifest.json"));
  assert.equal(manifest.referenceVersion, "4.16336.0");
  assert.equal(manifest.referenceVersion, official.referenceVersion);
  assert.equal(manifest.referenceSnapshot, official.referenceSnapshot);
  assert.equal(manifest.generator, "scripts/extract-cds-core-v4.mjs");
  assert.equal(manifest.adapterModule, "src/cds-core-adapter.mjs");
  assert.equal(manifest.sharedGraph, null);
  assert.deepEqual(manifest.publicAssets, []);
  assert.equal(manifest.modules.length, 164); // wave 8s (W8S-M1: + the 24 wave-8s chunk modules, pins.merge.wave8s.newModules); wave 8: 140 (+ vendor-datadog, c91b42814, c78048286); wave 7: 137
  assert.deepEqual((await fs.readdir(output)).sort(), [...manifest.modules.map((m) => m.target), "manifest.json", "provenance.json"].sort());
  for (const m of manifest.modules) {
    assert.equal(m.referenceVersion, "4.16336.0", m.target);
    assert.equal(m.sourceSha256, pins.sources[m.source], m.source);
    assert.equal(m.sourceSha256, sha(await fs.readFile(path.join(official.ionSource, m.source))), m.source);
    assert.equal(m.sha256, sha(await fs.readFile(path.join(output, m.target))), m.target);
    assert.deepEqual(m.heldByViewTabs, [], m.target);
    for (const i of m.imports) assert.ok(["generated", "react", "adapter"].includes(i.kind), `${m.target} ${i.local} ${i.kind}`);
  }
});

test("production equals the merged staging graph binding for binding; bytes differ only in header and adapter path", async () => {
  const prod = await json(path.join(output, "manifest.json")), stage = await json(path.join(staging, "manifest.json"));
  assert.deepEqual(prod.modules.map((m) => m.target), stage.modules.map((m) => m.target));
  const adapterFrom = { "../../pilot-adapter.mjs": "../../cds-core-adapter.mjs" };
  const differing = {};
  for (const [i, p] of prod.modules.entries()) {
    const s = stage.modules[i];
    for (const key of ["source", "sourceSha256", "bindings", "initializers", "exports", "sharedExports", "linkExports", "heldByViewTabs"])
      assert.deepEqual(p[key], s[key], `${p.target} ${key}`);
    assert.deepEqual(p.imports, s.imports.map((x) => (x.kind === "adapter" ? { ...x, from: adapterFrom[x.from] } : x)), `${p.target} imports`);
    const a = (await fs.readFile(path.join(output, p.target), "utf8")).split("\n");
    const b = (await fs.readFile(path.join(staging, s.target), "utf8")).split("\n");
    assert.equal(a.length, b.length, p.target);
    differing[p.target] = a.flatMap((line, n) => (line === b[n] ? [] : [[n + 1, line, b[n]]]));
  }
  for (const [target, lines] of Object.entries(differing)) {
    assert.deepEqual(lines.slice(0, 2).map(([n]) => n), [1, 2], target);
    assert.equal(lines[0][1], lines[0][2].replace("extract-cds-pilot-v4.mjs", "extract-cds-core-v4.mjs"), target);
    assert.equal(lines[1][1], lines[1][2].replace("cds-pilot/staging/src/pilot-adapter.mjs", "src/cds-core-adapter.mjs"), target);
    // Besides the header, only the host adapter import line of the modules that import the adapter (vendor-frame's
    // i / ce / be, shared-1's two GrowthBook readers, since wave 4 the react-intl readers ce58a0513 / c9c7785eb, and since
    // wave 5 browser-preload-helper's viteAssetUrl, since wave 6 the react-intl readers c6b8adeaf / c89efce1a and the
    // shared-62 GrowthBook reader, since wave 7 the react-intl reader c8ae173c6, since wave 8 shared-0's Ru / Ku / uO host
    // boundaries and shared-55's hostGrowthBookIsOn reader) differs.
    const rest = lines.slice(2);
    if (prod.modules.find((m) => m.target === target).imports.some((x) => x.kind === "adapter"))
      assert.deepEqual(rest, [[rest[0][0], rest[0][2].replace('from "../../pilot-adapter.mjs";', 'from "../../cds-core-adapter.mjs";'), rest[0][2]]], target);
    else assert.deepEqual(rest, [], target);
    if (rest.length) assert.match(rest[0][2], /(^\} |^import \{ \w+ as \w+ \} )from "\.\.\/\.\.\/pilot-adapter\.mjs";$/, target);
  }
  assert.deepEqual(prod.modules.filter((m) => m.imports.some((x) => x.kind === "adapter")).map((m) => m.target).sort(),
    // wave 8 (W8-M2) adds shared-0.mjs and shared-55.mjs (wave 7: the other nine). wave 8s (W8S-M1) adds shared-18.mjs: a
    // wave-8s binding there reads the W8-M2 GrowthBook boundary shared-0 Nx (hostGrowthBookValue); no new adapter export
    // (wave 8: the eleven without shared-18.mjs).
    // wave 8d (R4-Q1) adds shared-25.mjs (go / Z) and shared-39.mjs (su): the session-presets host boundaries (was: the twelve
    // without them).
    ["browser-preload-helper.mjs", "c6b8adeaf.mjs", "c89efce1a.mjs", "c8ae173c6.mjs", "c9c7785eb.mjs", "ce58a0513.mjs", "shared-0.mjs", "shared-1.mjs", "shared-18.mjs", "shared-25.mjs", "shared-39.mjs", "shared-55.mjs", "shared-62.mjs", "vendor-frame.mjs"]);
});

test("host adapter is the reviewed framework boundary; provenance records roots, contexts and the adapter", async () => {
  // The reviewed staging adapter (cds-wave3-final's wave3-adapter.mjs plus the components lane's host i18n block and the
  // cds-wave5 viteAssetUrl block) with only its host-growthbook, host i18n and view-tabs-asset-url imports re-pointed.
  const bytes = await fs.readFile(adapterPath), staged = await fs.readFile(path.join(pilot, pins.adapter.file));
  assert.equal(sha(staged), pins.adapter.sha256);
  // wave 8: the staging adapter imports host-growthbook twice (the wave-8 Ru / Ku re-export) and host-window-state, so the
  // wave-8 rewrite (every staging specifier, merge-pins-wave8.mjs) produces it; the wave-5 rewrite (one host-growthbook
  // import) no longer applies (wave 7: bytes.equals(productionAdapterBytesWave5(staged))).
  assert.throws(() => productionAdapterBytesWave5(staged), /host-growthbook\.mjs" exactly once/);
  // wave 8d: the wave-8 rewrite refuses the staging host-session-presets specifier it does not know; the wave-8d rewrite (the
  // wave-8 list plus that module) produces the adapter (was: assert.ok(bytes.equals(productionAdapterBytesWave8(staged)))).
  assert.throws(() => productionAdapterBytesWave8(staged), /keeps a staging specifier/);
  assert.ok(bytes.equals(productionAdapterBytesWave8d(staged)));
  assert.equal(sha(bytes), pins.productionAdapter.sha256);
  const diff = bytes.toString().split("\n").map((l, i) => [l, staged.toString().split("\n")[i]]).filter(([a, b]) => a !== b);
  assert.deepEqual(diff, [['import { HOST_GROWTHBOOK, growthBookFlagKey } from "./host-growthbook.mjs";',
    'import { HOST_GROWTHBOOK, growthBookFlagKey } from "../../../../../app/src/host-growthbook.mjs";'],
  ['import { createIntl } from "./generated/chat/vendor-intl-BJgYK7RA.js";',
    'import { createIntl } from "../../../../../app/src/generated/chat/vendor-intl-BJgYK7RA.js";'],
  ['import { getLocale, t } from "../electron/i18n/index.mjs";', 'import { getLocale, t } from "../../../../../app/electron/i18n/index.mjs";'],
  ['export { viteAssetUrl } from "./view-tabs-asset-url.mjs";', 'export { viteAssetUrl } from "../../../../../app/src/view-tabs-asset-url.mjs";'],
  // wave 8 (W8-M2): the unique host boundaries' re-exports.
  ['export { hostGrowthBookIsOn, hostGrowthBookValue } from "./host-growthbook.mjs";', 'export { hostGrowthBookIsOn, hostGrowthBookValue } from "../../../../../app/src/host-growthbook.mjs";'],
  ['export { hostWindowState } from "./host-window-state.mjs";', 'export { hostWindowState } from "../../../../../app/src/host-window-state.mjs";'],
  // wave 8d (R4-Q1): the session-presets host boundaries' re-export.
  ['export { hostUseGrowthBookFeature, hostUseCurrentAccount, hostLoadEnvironmentDialogChunk } from "./host-session-presets.mjs";',
    'export { hostUseGrowthBookFeature, hostUseCurrentAccount, hostLoadEnvironmentDialogChunk } from "../../../../../app/src/host-session-presets.mjs";']]);
  const Adapter = await import(pathToFileURL(adapterPath).href);
  // wave 8 adds hostGrowthBookIsOn, hostGrowthBookValue and hostWindowState (W8-M2).
  assert.deepEqual(Object.keys(Adapter).sort(), ["HostFormattedMessage", "createHostIntl", "hostGrowthBookExperimentValue", "hostGrowthBookFeature",
    // wave 8d (R4-Q1) adds hostLoadEnvironmentDialogChunk, hostUseCurrentAccount and hostUseGrowthBookFeature.
    "hostGrowthBookIsOn", "hostGrowthBookValue", "hostJsxRuntime", "hostLoadEnvironmentDialogChunk", "hostReactDom", "hostUseCurrentAccount", "hostUseGrowthBookFeature", "hostWindowState", "loadHostReact", "useHostIntl", "viteAssetUrl"]);
  const proof = await json(path.join(output, "provenance.json"));
  assert.equal(proof.referenceVersion, "4.16336.0");
  assert.equal(proof.generator, "scripts/extract-cds-core-v4.mjs");
  assert.deepEqual(proof.adapter, { file: "src/cds-core-adapter.mjs", sha256: pins.productionAdapter.sha256, reviewed: pins.adapter, production: pins.productionAdapter });
  assert.deepEqual(proof.growthBookBoundaries, pins.growthBookBoundaries);
  assert.deepEqual(proof.bareImports, pins.bareImports);
  assert.deepEqual(proof.roots, pins.roots);
  assert.deepEqual(Object.keys(proof.frameworkBoundaries), ["i", "ce", "be"].map((l) => `${official.vendorFrame}#${l}`));
  for (const [name, c] of Object.entries(proof.contexts)) {
    const code = await fs.readFile(path.join(official.ionSource, c.file), "utf8");
    assert.equal(sha(code.slice(c.start, c.end)), c.sha256, name);
    assert.equal(code.slice(c.start, c.end).split("=")[0], contexts[name].local, name);
  }
});

// wave 8a/8b (R4-K1): title was "… 77 wave-7 and 153 wave-8 names, each an exported binding of the generated graph" (the 397 wave-8s,
// 260 wave-8a and 6 wave-8b names follow, asserted below).
// wave 8c (R4-K1 addendum C): title was "… 397 wave-8s, 260 wave-8a and 6 wave-8b names, each an exported binding of the generated graph".
// wave 8d (R4-Q1 addendum D): title was "… 6 wave-8b and 5 wave-8c names, each an exported binding of the generated graph".
test("publicNames: 107 pinned roots and twelve Contexts, then the 288 wave-4, 50 wave-5, 96 wave-5b, 1747 wave-6, 77 wave-7, 153 wave-8, 397 wave-8s, 260 wave-8a, 6 wave-8b, 5 wave-8c and 11 wave-8d names, each an exported binding of the generated graph", async () => {
  const manifest = await json(path.join(output, "manifest.json"));
  // The 64 earlier names keep their order; the stage-3 roots and Contexts follow, then the wave-4, wave-5, wave-5b and wave-6 names.
  const wave4Names = WAVE4.map((e) => e.name), wave5Names = WAVE5.map((e) => e.name), wave5bNames = WAVE5B.map((e) => e.name), wave6Names = WAVE6.map((e) => e.name), wave7Names = WAVE7.map((e) => e.name), wave8Names = WAVE8.map((e) => e.name), wave8sNames = WAVE8S.map((e) => e.name); // wave 8s (W8S-M1)
  const wave8aNames = WAVE8A.map((e) => e.name), wave8bNames = WAVE8B.map((e) => e.name); // wave 8a/8b (R4-K1)
  const wave8cNames = WAVE8C.map((e) => e.name); // wave 8c (R4-K1 addendum C)
  const wave8dNames = WAVE8D.map((e) => e.name); // wave 8d (R4-Q1 addendum D)
  // wave 8c: the next two lists were [..., ...wave8aNames, ...wave8bNames] (the wave-8c names follow).
  assert.deepEqual(Object.keys(manifest.publicNames), [...Object.keys(pins.roots).filter((n) => !ROOTS3.includes(n) && !wave4Names.includes(n)), ...CONTEXTS,
    ...ROOTS3, ...CONTEXTS3, ...wave4Names, ...wave5Names, ...wave5bNames, ...wave6Names, ...wave7Names, ...wave8Names, ...wave8sNames, ...wave8aNames, ...wave8bNames, ...wave8cNames, ...wave8dNames]); // wave 8d: appended last (wave 8c: ended with ...wave8cNames); wave 8a/8b (R4-K1): appended last (wave 8s: ended with ...wave8sNames); wave 8s (W8S-M1): appended last (wave 8: ended with ...wave8Names)
  assert.deepEqual(pins.merge.wave3.roots, ROOTS3);
  assert.deepEqual(pins.merge.wave3.contexts, CONTEXTS3);
  assert.equal(ROOTS.length + ROOTS3.length, 107);
  assert.equal(Object.keys(pins.roots).length, 146);
  assert.equal(wave4Names.length, 288);
  assert.equal(wave5Names.length, 50);
  assert.equal(wave5bNames.length, 96);
  assert.equal(wave6Names.length, 1747);
  assert.equal(wave7Names.length, 77);
  assert.equal(wave8Names.length, 153);
  assert.equal(wave8sNames.length, 397); // wave 8s (W8S-M1)
  assert.equal(wave8aNames.length, 260); // wave 8a (R4-K1 addendum A)
  assert.equal(wave8bNames.length, 6); // wave 8b (R4-K1 addendum B)
  assert.equal(wave8cNames.length, 5); // wave 8c (R4-K1 addendum C)
  assert.equal(wave8dNames.length, 11); // wave 8d (R4-Q1 addendum D: 13 decisions, settings_shared62_AS / settings_shared25_ki dropped on replay)
  assert.deepEqual(Object.keys(manifest.publicNames).sort(), [...ROOTS, ...ROOTS3, ...CONTEXTS, ...CONTEXTS3, ...wave4Names, ...wave5Names, ...wave5bNames, ...wave6Names, ...wave7Names, ...wave8Names, ...wave8sNames, ...wave8aNames, ...wave8bNames, ...wave8cNames, ...wave8dNames].sort()); // wave 8d: + ...wave8dNames; wave 8a/8b (R4-K1; wave 8s: without ...wave8aNames, ...wave8bNames); wave 8s (W8S-M1; wave 8: without ...wave8sNames)
  for (const dir of ["wave3", "wave4", "wave5", "wave5b", "wave6", "wave7", "wave8", "wave8s", "wave8a", "wave8b", "wave8c", "wave8d"]) { // wave 8d: + its frozen stage-13c owner (was: ended with "wave8c"); wave 8c: + its frozen stage-12b owner (was: ended with "wave8b"); wave 8a/8b (R4-K1): + their frozen stage-10s / 11a owners; wave 8s (W8S-M1): + its frozen stage-9 owner
    const before = await json(path.join(app, `../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/${dir}/before/prod-manifest.json`));
    for (const [name, entry] of Object.entries(before.publicNames)) assert.deepEqual(manifest.publicNames[name], entry, `${name} moved`);
  }
  for (const [name, entry] of Object.entries(manifest.publicNames)) {
    const m = manifest.modules.find((x) => x.target === entry.target);
    assert.equal(m.source, entry.file, name);
    const binding = m.bindings.find((b) => b.name === entry.local);
    assert.ok(binding, name);
    const w4 = WAVE4.find((e) => e.name === name), w5 = WAVE5.find((e) => e.name === name) ?? WAVE5B.find((e) => e.name === name) ?? WAVE6.find((e) => e.name === name) ?? WAVE7.find((e) => e.name === name) ?? WAVE8.find((e) => e.name === name) ?? WAVE8S.find((e) => e.name === name) ?? WAVE8A.find((e) => e.name === name) ?? WAVE8B.find((e) => e.name === name) ?? WAVE8C.find((e) => e.name === name) ?? WAVE8D.find((e) => e.name === name); // wave 8d: + WAVE8D; wave 8c: + WAVE8C; wave 8a/8b (R4-K1: + WAVE8A, WAVE8B); wave 8s (W8S-M1)
    if (w4) assert.deepEqual([w4.file, w4.local], [entry.file, entry.local], name);
    // A wave-5 / 5b / 6 / 7 / 8 name is a pinned binding (pins.publicBindings: declaration hash, export name), never a root.
    if (w5) {
      const pin = pins.publicBindings[name];
      assert.deepEqual([w5.kind, pin.file, pin.local, pin.sha256], ["binding", entry.file, entry.local, binding.sha256], name);
      assert.equal(entry.exportName, entry.local, name);
    }
    if (ROOTS.includes(name) || ROOTS3.includes(name) || w4?.kind === "root") {
      assert.equal(entry.local, pins.roots[name].local, name); assert.equal(binding.sha256, pins.roots[name].sha256, name);
      // A wave-4 root another root already reaches (isDocumentNode <- ownerWindow, createSafeStorage <- safeLocalStorage)
      // is a link export of its module: published under its local, which the facade re-exports under the name.
      assert.equal(entry.exportName, pins.roots[name].publish === "linkExport" ? entry.local : name, name);
    } else if (!w4 && !w5) assert.equal(entry.exportName, entry.local, name);
    const mod = await import(pathToFileURL(path.join(output, entry.target)).href);
    // A wave-4 module state may hold undefined until its writer runs (cdsLazyImportInterceptor / cdsFitOptOutPredicate).
    assert.ok(entry.exportName in mod, name);
    if (CONTEXTS.includes(name) || CONTEXTS3.includes(name) || w4?.kind === "context") assert.equal(mod[entry.exportName].$$typeof, Symbol.for("react.context"), name);
  }
});

test("facade re-exports exactly the publicNames, each the generated graph's own binding", async () => {
  const manifest = await json(path.join(output, "manifest.json"));
  const ast = parseAst(await fs.readFile(facadeFile, "utf8"));
  const names = [];
  for (const n of ast.body) {
    assert.equal(n.type, "ExportNamedDeclaration", "facade holds re-exports only");
    assert.equal(n.declaration, null);
    for (const s of n.specifiers) {
      const name = s.exported.name, entry = manifest.publicNames[name];
      assert.ok(entry, name);
      assert.equal(n.source.value, `./generated/cds-core/${entry.target}`, name);
      assert.equal(s.local.name, entry.exportName, name);
      names.push(name);
    }
  }
  assert.deepEqual(names.sort(), Object.keys(manifest.publicNames).sort());
  const Facade = await import(pathToFileURL(facadeFile).href);
  for (const name of names) {
    const entry = manifest.publicNames[name];
    assert.equal(Facade[name], (await import(pathToFileURL(path.join(output, entry.target)).href))[entry.exportName], name);
  }
  assert.deepEqual(Object.keys(Facade).sort(), names.sort());
});

test("host React SSR: one CdsRoot around the twelve wave-1 roots (of 107), Contexts read through the facade", async () => {
  const Cds = await import(pathToFileURL(facadeFile).href);
  const { loadHostReact } = await import(pathToFileURL(adapterPath).href);
  assert.equal(loadHostReact(), (await import("react")));
  assert.equal(require.resolve("react", { paths: [output] }), require.resolve("react"));
  const router = { resolveHref: (href) => `/local${href}`, navigate() {} };
  const labels = (key) => `译:${key}`;
  let seen;
  function Probe() {
    seen = Object.fromEntries(CONTEXTS.map((n) => [n, React.useContext(Cds[n])]));
    return null;
  }
  const Tabs = Cds.CdsTabs;
  const markup = renderToStaticMarkup(el(Cds.CdsRoot, { density: "compact", locale: " zh-CN ", labels, router, direction: "rtl" },
    el(Cds.CdsTooltipProvider, { delay: 0 },
      el(Probe),
      el(Cds.CdsPage, {
        title: "Workspace",
        tabs: el(Tabs.Root, { defaultValue: "a" }, el(Tabs.List, null, el(Tabs.Tab, { value: "a" }, "A"), el(Tabs.Tab, { value: "b" }, "B")), el(Tabs.Panel, { value: "a" }, "Panel A")),
        banner: el(Cds.CdsBanner, { children: "Notice", onDismiss() {} }),
        actions: el(Cds.CdsButton, { href: "/new", icon: "Add", tooltip: "New" }, "New"),
      },
      el(Cds.CdsTextInputField, { label: "Name", clearable: true, defaultValue: "x" }),
      el(Cds.CdsTextAreaField, { label: "Notes", defaultValue: "y" }),
      el(Cds.CdsTextLink, { href: "/docs", external: "with-icon", children: "Docs" }),
      el(Cds.CdsBadge, { onRemove() {}, children: "Tag" }), el(Cds.CdsSpinner, { inheritColor: true }), el(Cds.CdsIcon, { name: "Add", alt: "Add" })))));
  for (const cds of ["Page", "PageHeader", "Tabs", "Banner", "Field", "TextInput", "TextArea", "TextLink", "Button", "Badge", "Spinner", "Icon"])
    assert.match(markup, new RegExp(`data-cds="${cds}"`), cds);
  assert.match(markup, /data-density="compact"/);
  assert.match(markup, /href="\/local\/docs"/); assert.match(markup, /href="\/local\/new"/);
  assert.match(markup, /aria-label="译:dismiss"/);
  assert.equal(seen.CdsDensityContext, "compact"); assert.equal(seen.CdsLocaleContext, "zh-CN");
  assert.equal(seen.CdsLabelsContext, labels); assert.equal(seen.CdsRouterContext, router);
  assert.equal(seen.CdsFizzyLakePartsContext, undefined); assert.equal(seen.CdsTooltipDelayContext, 0);
  assert.deepEqual(seen.CdsDirectionContext, { direction: "rtl" });
});

test("import graph from the facade closes inside cds-core and the host adapter, one React, no view-tabs", async () => {
  const allowedBare = new Set(["react", "react/jsx-runtime", "react/compiler-runtime", "react-dom"]);
  const seen = new Set(), bare = new Set(), dynamic = [];
  const visit = async (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const ast = parseAst(await fs.readFile(file, "utf8"));
    const specs = [];
    for (const n of ast.body) if ((n.type === "ImportDeclaration" || n.type === "ExportNamedDeclaration" || n.type === "ExportAllDeclaration") && n.source) specs.push(n.source.value);
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "ImportExpression") dynamic.push([path.relative(app, file), node.source.value]);
      for (const v of Object.values(node)) Array.isArray(v) ? v.forEach(walk) : walk(v);
    };
    walk(ast);
    for (const spec of specs) {
      if (spec.startsWith(".")) await visit(path.resolve(path.dirname(file), spec));
      else bare.add(spec);
    }
    for (const [from, spec] of dynamic) if (path.join(app, from) === file && spec?.startsWith(".")) await visit(path.resolve(path.dirname(file), spec));
  };
  await visit(facadeFile);
  // The adapter reads the host's one GrowthBook table (src/host-growthbook.mjs, no imports of its own), since wave 4 the
  // host i18n leaves: the chat area's react-intl createIntl (generated/chat vendor-intl, React only) and the
  // electron/i18n catalog (its zh-CN table), and since wave 5 the host viteAssetUrl (src/view-tabs-asset-url.mjs, the
  // integration-1 preload-helper answer: a plain leaf with no imports, not the view-tabs graph despite its name).
  // Since wave 8 also the host window state (src/host-window-state.mjs, W8-M2: no imports, installed by frame-sidebar-host.jsx).
  // Since wave 8d (R4-Q1) also the session-presets host module (src/host-session-presets.mjs: no imports, installed by
  // frame-sidebar-host.jsx) (wave 8: the five without it).
  const HOST_LEAVES = ["src/host-growthbook.mjs", "src/generated/chat/vendor-intl-BJgYK7RA.js", "electron/i18n/index.mjs", "src/view-tabs-asset-url.mjs", "src/host-window-state.mjs", "src/host-session-presets.mjs"];
  const catalog = (rel) => /^electron\/i18n\/zh-CN\/[\w-]+\.mjs$/.test(rel); // the zh-CN tables, plain data modules
  for (const file of seen) {
    const rel = path.relative(app, file);
    assert.ok(rel === "src/cds-core.mjs" || rel === "src/cds-core-adapter.mjs" || HOST_LEAVES.includes(rel) || catalog(rel) || rel.startsWith("src/generated/cds-core/"), rel);
    if (rel !== "src/view-tabs-asset-url.mjs") assert.doesNotMatch(rel, /view-tabs/);
  }
  assert.deepEqual(parseAst(await fs.readFile(path.join(app, "src/view-tabs-asset-url.mjs"), "utf8")).body.filter((n) => n.type === "ImportDeclaration" || n.source), []);
  assert.deepEqual(parseAst(await fs.readFile(path.join(app, "src/host-window-state.mjs"), "utf8")).body.filter((n) => n.type === "ImportDeclaration" || n.source), []);
  assert.deepEqual(parseAst(await fs.readFile(path.join(app, "src/host-session-presets.mjs"), "utf8")).body.filter((n) => n.type === "ImportDeclaration" || n.source), []); // wave 8d
  assert.deepEqual([...seen].map((f) => path.relative(app, f)).filter((rel) => HOST_LEAVES.includes(rel)).sort(), [...HOST_LEAVES].sort());
  // wave 8: every module of the graph is reached, now with vendor-datadog.mjs and its two lazy chunks (wave 7: 137).
  assert.equal([...seen].filter((f) => path.relative(app, f).startsWith("src/generated/cds-core/")).length, 164); // wave 8s (W8S-M1: + 24 chunk modules); wave 8: 140
  for (const spec of bare) assert.ok(allowedBare.has(spec), spec);
  // wave 8 (pins.merge.wave8.dynamicImports): shared-0's lazy profiler chunk c78048286 and vendor-datadog's c91b42814.
  assert.deepEqual(dynamic.sort(), [["src/generated/cds-core/shared-0.mjs", "./c78048286-BYKo118F.js"], ["src/generated/cds-core/shared-frame.mjs", "./c86ccec3d-CSD9PqcP.js"],
    ["src/generated/cds-core/shared-frame.mjs", "./cf2613ee5-Btwr9m9F.js"], ["src/generated/cds-core/vendor-datadog.mjs", "./c91b42814-CWEg9hC3.js"]]);
  // Exactly one React: the generated graph and the app resolve the same package files.
  for (const id of allowedBare) assert.equal(require.resolve(id, { paths: [output] }), require.resolve(id), id);
});

// cds-integrate/fix.md (P1 style-compatibility): cds-core is 4.16336.0 code; the compatibility layer must never supply a
// prior-snapshot (3.6556.2 / 2.42304.0 / 2.37337.1) rule or theme token on its behalf, and every class it names that a
// prior rule would cover must be shipped by the 4.16336.0 design itself. Dry run only: nothing is written.
test("style compatibility: no prior-snapshot rule, token or unresolved class is held by cds-core", async () => {
  const { prepareStyleCompatibility } = await import("../scripts/prepare-style-compatibility.mjs");
  const manifest = await prepareStyleCompatibility({ dryRun: true });
  const ours = (hit) => hit.file.startsWith("src/generated/cds-core/");
  assert.deepEqual(manifest.rules.filter((rule) => rule.references.some((ref) => ref.hits.some(ours))).map((rule) => rule.selector), []);
  for (const key of ["targetVersionUnresolved", "targetVersionClasses"])
    for (const entry of manifest[key] ?? [])
      if (entry.hits.some(ours)) assert.ok(entry.targetStylesheet, `${key} ${entry.className} is not shipped by the 4.16336.0 design`);
  const sources = (await fs.readdir(output)).filter((n) => /\.(m?js)$/.test(n));
  const text = (await Promise.all(sources.map((n) => fs.readFile(path.join(output, n), "utf8")))).join("\n");
  assert.deepEqual(manifest.tokens.filter((t) => text.includes(t.property)).map((t) => `${t.property} ${t.baseline}`), []);
});
