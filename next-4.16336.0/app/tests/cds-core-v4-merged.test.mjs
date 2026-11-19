// Merged 4.16336.0 cds-core owner (146 roots, one Context owner). The fields, layout and navigation lanes' (wave 1), the
// overlays, menus, dialogs, form-controls and display lanes' (wave 2) and the cds-wave3-final / cds-surface-additions
// fragments' (wave 3) key SSR/behaviour assertions are re-run here against the merged graph in
// analysis/.../cds-pilot/staging/src/generated/cds-core; the lanes' own tests keep testing their isolated staging graphs.
// See analysis/.../cds-integrate/merge.md, merge-pins-wave2.mjs / wave2-closure.json and merge-pins-wave3.mjs /
// wave3-closure.json; wave 4 (cds-wave4 states / utils / components, 39 roots and 288 names): merge-pins-wave4.mjs /
// wave4/closure.json; wave 5 (the cds-wave5 D1 convergence fragment, 50 names, five new chunk modules, the carried
// shared-62 registration and the viteAssetUrl-bound preload helper): merge-pins-wave5.mjs / wave5/closure.json; wave 5b (the
// cds-wave5b lane, 96 names, six new chunk modules, no adapter change): merge-pins-wave5b.mjs / wave5b/closure.json; wave 6
// (the cds-wave6 shared-layer publish, 1747 names, 84 new chunk modules, no adapter change): merge-pins-wave6.mjs /
// wave6/union.json (inputs/lane-manifest.json: cds-wave6/run iterate.mjs's strict dry run of the entries on the 50763521 owner);
// wave 7 (the cds-wave7 write-integrity publish, 77 names, 7 new chunk modules, no adapter change): merge-pins-wave7.mjs /
// wave7/union.json (inputs/lane-manifest.json: cds-wave7's strict dry run of the entries on the c4b6979f owner);
// wave 8 (the cds-wave8 publish, 153 names, 3 new chunk modules (vendor-datadog and its two lazy chunks), the carried shared-92
// Y.persist.onFinishHydration(NS) companion statement, three unique host boundaries Ru / Ku / uO): merge-pins-wave8.mjs /
// wave8/union.json (inputs/lane-manifest.json: cds-wave8r's strict dry run of the entries on the 79b004e0 owner).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createRequire, registerHooks } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseAst } from "rolldown/parseAst";
import * as official from "../scripts/official-4.16336.0.mjs";
import { pilot, config } from "../scripts/extract-cds-pilot-v4.mjs";
import { preflight } from "../../analysis/claude-4.16336.0-migrate-20261104/cds-pilot/provenance.mjs";
import { readSource } from "../scripts/extract-working-line.mjs";
import { fixture, find } from "../../analysis/claude-4.16336.0-migrate-20261104/cds-integrate/support/hook-fixture.mjs";

const require = createRequire(import.meta.url);
const sha = (x) => createHash("sha256").update(x).digest("hex");
const integrate = path.join(pilot, "../cds-integrate");
const output = path.join(pilot, "staging/src/generated/cds-core");
const targets = new Map(
  ["react", "react/jsx-runtime", "react/compiler-runtime", "react-dom"].map((id) => [id, pathToFileURL(require.resolve(id)).href]),
);
let Core, Vendor, Page, Tabs, Row, S2, P183, VT, VTI, SR, SH, SM, SA, S62, S1, SEP, Adapter, hostResolution;
before(async () => {
  hostResolution = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL?.includes("/cds-pilot/staging/") && targets.has(specifier))
        return nextResolve(targets.get(specifier), context);
      return nextResolve(specifier, context);
    },
  });
  const load = (name) => import(pathToFileURL(path.join(output, name)).href);
  Core = await load("shared-frame.mjs");
  Vendor = await load("vendor-frame.mjs");
  Page = (await load("page.mjs")).CdsPage;
  Tabs = (await load("shared-11.mjs")).CdsTabs;
  Row = await load("c09817156.mjs");
  S2 = await load("shared-2.mjs");
  P183 = await load("shared-183.mjs");
  // wave 3
  [VT, VTI, SR, SH, SM, SA, S62, S1, SEP] = await Promise.all(["cfe7c4b3b.mjs", "cd9e4c7f2.mjs", "c75e89812.mjs", "c1ea8a271.mjs",
    "cdfb0c433.mjs", "cc18d27d7.mjs", "shared-62.mjs", "shared-1.mjs", "c04b2e418.mjs"].map(load));
  Adapter = await import(pathToFileURL(path.join(pilot, "staging/src/pilot-adapter.mjs")).href);
});
after(() => hostResolution?.deregister());
const el = React.createElement;
const html = (C, props) => renderToStaticMarkup(el(C, props));
const withContext = (context, value, C, props) => renderToStaticMarkup(el(context.Provider, { value }, el(C, props)));
const json = async (p) => JSON.parse(await fs.readFile(p, "utf8"));

// ---------------------------------------------------------------------------------------------
// Merge contract
// ---------------------------------------------------------------------------------------------
const ROOTS = {
  CdsButton: ["shared-frame.mjs", "Xu"], CdsIcon: ["shared-frame.mjs", "Bs"], CdsSpinner: ["shared-frame.mjs", "kc"],
  CdsBadge: ["shared-frame.mjs", "vh"], CdsRoot: ["shared-frame.mjs", "xo"], CdsTooltipProvider: ["shared-frame.mjs", "_m"],
  CdsTextInputField: ["shared-frame.mjs", "LI"], CdsTextAreaField: ["shared-frame.mjs", "RI"], CdsBanner: ["shared-frame.mjs", "aj"],
  CdsTextLink: ["shared-frame.mjs", "Lg"], CdsTabs: ["shared-11.mjs", "Ar"], CdsPage: ["page.mjs", "x"],
  // wave 2
  CdsTooltip: ["shared-frame.mjs", "Kp"], CdsOverflowTooltip: ["shared-frame.mjs", "dm"], CdsPopover: ["shared-frame.mjs", "JM"],
  CdsLayerProvider: ["shared-frame.mjs", "yd"], useCdsLayerAwareZIndex: ["shared-frame.mjs", "Td"], useCdsOwnerWindow: ["shared-frame.mjs", "mo"],
  useCdsOwnerWindowAnchor: ["shared-frame.mjs", "fo"],
  CdsDropdown: ["shared-frame.mjs", "UD"], CdsContextMenu: ["shared-frame.mjs", "JF"], CdsSplitDropdownButton: ["shared-frame.mjs", "qj"],
  cdsMenuItemClass: ["shared-frame.mjs", "yT"], cdsDropdownGroupLabelClass: ["shared-frame.mjs", "pD"],
  CdsDialog: ["shared-frame.mjs", "ax"], CdsAlertDialog: ["shared-frame.mjs", "sx"], CdsConfirmationDialog: ["shared-frame.mjs", "lx"],
  CdsTextInput: ["shared-frame.mjs", "ww"], CdsTextArea: ["shared-frame.mjs", "oN"], CdsCheckbox: ["shared-frame.mjs", "lz"],
  CdsCheckboxRow: ["c09817156.mjs", "h"], CdsCheckboxIndicator: ["shared-frame.mjs", "GC"], cdsCheckboxTopAlignClass: ["shared-frame.mjs", "HC"],
  CdsRadioGroup: ["shared-frame.mjs", "HW"], CdsSegmentedControl: ["shared-frame.mjs", "lF"], CdsField: ["shared-frame.mjs", "OI"],
  CdsFieldLabel: ["shared-frame.mjs", "kI"], CdsFieldError: ["shared-frame.mjs", "NI"], CdsFieldDescription: ["shared-frame.mjs", "AI"],
  CdsCombobox: ["shared-frame.mjs", "oz"], CdsComboboxField: ["shared-frame.mjs", "sz"],
  CdsShimmer: ["shared-frame.mjs", "wI"], CdsSkeleton: ["shared-frame.mjs", "Eg"], CdsSurface: ["shared-frame.mjs", "Dm"],
  cdsSurfaceClass: ["shared-frame.mjs", "Cm"], CdsCard: ["shared-frame.mjs", "Bh"], CdsCollapsible: ["shared-frame.mjs", "LA"],
  CdsButtonGroup: ["shared-frame.mjs", "uz"], CdsAvatar: ["shared-frame.mjs", "VN"], CdsCounter: ["shared-frame.mjs", "kO"],
  CdsPulse: ["shared-frame.mjs", "QB"], CdsShortcut: ["shared-frame.mjs", "ic"], CdsRelativeTime: ["shared-2.mjs", "H5"],
  CdsPictogram: ["shared-183.mjs", "Zq"], CdsHiddenReasonText: ["shared-frame.mjs", "Al"], CdsDisabledReason: ["shared-frame.mjs", "qp"],
  cdsClassNames: ["shared-frame.mjs", "Q"],
  // wave 3: cds-wave3-final
  ViewTabBar: ["cfe7c4b3b.mjs", "nt"], useViewTabIconSize: ["cd9e4c7f2.mjs", "r"], viewTabSizes: ["cfe7c4b3b.mjs", "me"],
  viewTabLabels: ["cfe7c4b3b.mjs", "M"], ViewTab: ["cfe7c4b3b.mjs", "je"], ViewTabOverflowItem: ["cfe7c4b3b.mjs", "fe"],
  ViewTabOverflowMenu: ["cfe7c4b3b.mjs", "ue"], useViewTabOverflow: ["cfe7c4b3b.mjs", "Be"],
  SessionsRowLayout: ["c75e89812.mjs", "a"], SessionsMoreButton: ["c75e89812.mjs", "s"], SessionsDateLayout: ["c75e89812.mjs", "o"],
  SessionsHighlight: ["c1ea8a271.mjs", "r"], SessionsActionsRail: ["cc18d27d7.mjs", "O"], findSessionTitleMatch: ["cdfb0c433.mjs", "e"],
  useVirtualizer: ["vendor-frame.mjs", "sy"], useDirection: ["vendor-frame.mjs", "Xn"], useCdsDensity: ["shared-frame.mjs", "Ja"],
  useIsMacPlatform: ["shared-frame.mjs", "sc"], isMacUserAgent: ["shared-62.mjs", "Za"], mergeProps: ["vendor-frame.mjs", "wn"],
  asElementNode: ["shared-frame.mjs", "Pt"], ariaKeyShortcuts: ["shared-frame.mjs", "Tc"], clsx: ["vendor-frame.mjs", "ke"],
  // wave 3: cds-surface-additions
  useCdsIconSize: ["shared-frame.mjs", "qu"], CdsSpark: ["shared-frame.mjs", "A_"], CdsAnimatedSpark: ["shared-frame.mjs", "dM"],
  CdsSwitch: ["shared-frame.mjs", "tI"], CdsInfoTooltip: ["shared-frame.mjs", "eN"], CdsLoadingSkeleton: ["shared-frame.mjs", "mg"],
  useCdsOwnerAnchor: ["shared-frame.mjs", "po"], CdsDeferredTooltip: ["shared-frame.mjs", "du"], CdsSearchableMenuPopup: ["shared-frame.mjs", "PD"],
  useCdsLinkProps: ["shared-frame.mjs", "fa"], sanitizeCdsHref: ["shared-frame.mjs", "Ti"], CdsPreviewCard: ["shared-183.mjs", "dU"],
  CdsSeparator: ["c04b2e418.mjs", "o"], useCdsIsoLayoutEffect: ["shared-frame.mjs", "Un"], useCdsMergedRefs: ["shared-frame.mjs", "In"],
  useCdsLabel: ["shared-frame.mjs", "pi"], useFizzyLakePart: ["shared-frame.mjs", "or"], CdsPortalRoot: ["shared-frame.mjs", "of"],
  useCdsFieldDisabled: ["shared-frame.mjs", "iw"], useCdsLocale: ["shared-frame.mjs", "lo"], useLazyMutationObserver: ["shared-frame.mjs", "Mr"],
  CdsOpensInNewTabHint: ["shared-frame.mjs", "Dg"], useLatestCallback: ["shared-frame.mjs", "Nn"], useCdsFieldInvalid: ["shared-frame.mjs", "rw"],
  useCdsRootRemPx: ["shared-frame.mjs", "us"], useClickToFocus: ["shared-frame.mjs", "Fm"], useLazyObserver: ["shared-frame.mjs", "jr"],
};
const WAVE3_INTERNAL = ["viewTabSizes", "viewTabLabels", "ViewTab", "ViewTabOverflowItem", "ViewTabOverflowMenu", "useViewTabOverflow"];
// wave 4: the 39 roots merge-pins-wave4.mjs added (37 lane roots + the two writers of the states review P2), each checked
// below from its pin; two are link exports another root already reaches (isDocumentNode, createSafeStorage).
const ROOTS4_COUNT = 39;
test("one owner: 146 pinned roots (107 + 39 wave-4), one target per official source, lane pins merged without conflict", async () => {
  const manifest = await json(path.join(output, "manifest.json"));
  const pins = await json(path.join(pilot, "pins.json"));
  assert.equal(manifest.referenceVersion, "4.16336.0");
  assert.equal(new Set(manifest.modules.map((m) => m.source)).size, manifest.modules.length);
  assert.equal(new Set(manifest.modules.map((m) => m.target)).size, manifest.modules.length);
  // wave 5 adds shared-60, shared-5, shared-153, shared-31 and vendor-intl; wave 5b shared-6, shared-9, shared-26,
  // shared-39, shared-212 and ce574895a (fragment.newModules / pins.merge.wave5b.newModules); wave 6 the 84 chunks of
  // pins.merge.wave6.newModules; wave 7 the 7 chunks of pins.merge.wave7.newModules; wave 8 the 3 chunks of
  // pins.merge.wave8.newModules (W8-M1; wave 7: 137); wave 8s the 24 chunks of pins.merge.wave8s.newModules (W8S-M1; wave 8: 140).
  assert.equal(manifest.modules.length, 164);
  assert.equal(pins.merge.wave6.newModules.length, 84);
  assert.equal(pins.merge.wave7.newModules.length, 7);
  assert.deepEqual(pins.merge.wave8.newModules.map((m) => m.target), ["vendor-datadog.mjs", "c91b42814-CWEg9hC3.js", "c78048286-BYKo118F.js"]);
  const owner5b = await json(path.join(pilot, "../cds-integrate/wave6/before/prod-manifest.json"));
  assert.deepEqual(manifest.modules.map((m) => m.target).sort(), [...owner5b.modules.map((m) => m.target), ...pins.merge.wave6.newModules.map((m) => m.target),
    ...pins.merge.wave7.newModules.map((m) => m.target), ...pins.merge.wave8.newModules.map((m) => m.target),
    ...pins.merge.wave8s.newModules.map((m) => m.target)].sort()); // wave 8s (W8S-M1; wave 8: ended with ...wave8.newModules)
  assert.equal(pins.merge.wave8s.newModules.length, 24); // wave 8s (W8S-M1)
  assert.deepEqual(pins.merge.wave5b.newModules.map((m) => m.target), ["shared-6.mjs", "shared-9.mjs", "shared-26.mjs", "shared-39.mjs", "shared-212.mjs", "ce574895a.mjs"]);
  assert.equal(manifest.modules.find((m) => m.source === "shared-11-CNsu0Zu8.js").target, "shared-11.mjs");
  assert.equal(Object.keys(ROOTS).length, 107);
  assert.equal(pins.merge.wave4.roots.length, ROOTS4_COUNT);
  assert.deepEqual(Object.keys(pins.roots).sort(), [...Object.keys(ROOTS), ...pins.merge.wave4.roots].sort());
  for (const semantic of pins.merge.wave4.roots) {
    const root = pins.roots[semantic], m = manifest.modules.find((x) => x.source === root.file);
    assert.ok(m && !(semantic in ROOTS), semantic);
    if (root.publish === "linkExport") assert.ok(m.linkExports.includes(root.local) && !m.exports[root.local], semantic);
    else assert.equal(m.exports[root.local], semantic, semantic);
    assert.equal(m.bindings.find((b) => b.name === root.local).sha256, root.sha256, semantic);
  }
  assert.deepEqual(pins.merge.wave4.roots.filter((n) => pins.roots[n].publish === "linkExport").sort(), ["createSafeStorage", "isDocumentNode"]);
  for (const [semantic, [target, local]] of Object.entries(ROOTS)) {
    const root = pins.roots[semantic], m = manifest.modules.find((x) => x.target === target);
    assert.equal(m.source, root.file, semantic);
    assert.equal(root.local, local, semantic);
    assert.equal(m.exports[local], semantic, semantic);
    assert.equal(m.bindings.find((b) => b.name === local).sha256, root.sha256, semantic);
  }
  // Page has no official export; the pinned exported reader is C (export t).
  assert.equal(pins.roots.CdsPage.alias, null);
  assert.equal(pins.roots.CdsPage.exportedReader.export, "t");
  assert.equal(config.modules.find((m) => m.target === "page.mjs").internal, true);
  assert.deepEqual(manifest.modules.find((m) => m.target === "page.mjs").exports, { x: "CdsPage" });
  // Wave 3: the six ViewTabBar parts have no official export and no exported wrapper; they are pinned as reached from
  // ViewTabBar's same-file closure (preflight re-checks it).
  for (const name of WAVE3_INTERNAL) {
    assert.equal(pins.roots[name].alias, null, name);
    assert.equal(pins.roots[name].reachedFrom, "ViewTabBar", name);
  }
  assert.equal(config.modules.find((m) => m.target === "cfe7c4b3b.mjs").internal, true);
  // Statement reviews: every lane that pinned a file agrees on omit/carry for every statement, except the two
  // selection-only differences stage 3 proved (a graph that does not hold the assigned object omitted it).
  const changes = new Map(pins.merge.wave3.decisionChanges.map((d) => [`${d.file}:${d.start}`, d]));
  // Wave 4: the lanes that omitted a statement the owner carries (selection-only, proved against each lane's manifest).
  const changes4 = new Map();
  for (const d of pins.merge.wave4.decisionChanges) changes4.set(`${d.file}:${d.start}`, [...(changes4.get(`${d.file}:${d.start}`) ?? []), d.omittedBy]);
  // Wave 5: the same selection-only proof for cds-wave5 (merge.wave5.selectionOnly), and one decision change: shared-62
  // 40114 (the pagehide / pageshow registration) every earlier lane omitted and cds-wave5 carries (merge.wave5.decisionChanges).
  for (const d of pins.merge.wave5.selectionOnly) changes4.set(`${d.file}:${d.start}`, [...(changes4.get(`${d.file}:${d.start}`) ?? []), d.omittedBy]);
  const changes5 = new Map(pins.merge.wave5.decisionChanges.map((d) => [`${d.file}:${d.start}`, d]));
  assert.deepEqual([...changes5.keys()], ["shared-62-DoCqVpIq.js:40114"]);
  // Wave 5b: no decision change; the selection-only proof again for cds-wave5b (eN.Text and the Zq mark, whose assigned
  // objects the lane graph does not hold).
  assert.deepEqual(pins.merge.wave5b.decisionChanges, []);
  assert.deepEqual(pins.merge.wave5b.selectionOnly.map((d) => [d.file, d.start, d.assigns, d.carriedBy, d.omittedBy, d.decision]), [
    ["shared-frame-CJdE5Ria.js", 347587, ["eN"], "owner", "cds-wave5b", "carry"], ["shared-183-B2N6Zy4J.js", 428589, ["Zq"], "owner", "cds-wave5b", "carry"]]);
  for (const d of pins.merge.wave5b.selectionOnly) changes4.set(`${d.file}:${d.start}`, [...(changes4.get(`${d.file}:${d.start}`) ?? []), d.omittedBy]);
  // Wave 7: two decision changes (W7-D2): vendor-zod's official guarded __zod_globalConfig / __zod_globalRegistry
  // initialisers, which the cds-wave6 review omitted and cds-wave7 carries (merge.wave7.decisionChanges).
  const changes7 = new Map(pins.merge.wave7.decisionChanges.map((d) => [`${d.file}:${d.start}`, d]));
  assert.deepEqual([...changes7.keys()], ["vendor-zod-fszujTq6.js:10685", "vendor-zod-fszujTq6.js:58561"]);
  assert.deepEqual([...changes7.values()].map((d) => [d.owner, d.merged, d.decision]), [["omit", "carry", "W7-D2"], ["omit", "carry", "W7-D2"]]);
  // Wave 8: one decision change: shared-92's Y.persist.onFinishHydration(NS), the companion statement of the frame store Y
  // cds-core now holds; every earlier lane omitted it, cds-wave8 carries it (merge.wave8.decisionChanges).
  const changes8 = new Map(pins.merge.wave8.decisionChanges.map((d) => [`${d.file}:${d.start}`, d]));
  assert.deepEqual([...changes8.keys()], ["shared-92-BOgyxePb.js:155437"]);
  assert.deepEqual([...changes8.values()].map((d) => [d.owner, d.merged, d.feature, d.decision]), [["omit", "carry", "Y.persist.onFinishHydration(NS)", "W7-D4 / W8-M1 / W8-M4"]]);
  const action = (p) => p.slice(0, p.indexOf(":")).split(" ")[0];
  for (const [file, list] of Object.entries(pins.statements))
    for (const s of list) {
      const change = changes.get(`${file}:${s.start}`);
      const disagree = Object.entries(s.reviews).filter(([, p]) => action(p) !== action(s.policy)).map(([lane]) => lane);
      assert.ok(Object.keys(s.reviews).length >= 1, `${file}:${s.start}`);
      // eN.Text: every owner lane and wave3-final omitted it (none selects eN), surface-additions carries it; Zq mark:
      // only surface-additions (which does not select Zq) omitted it. Wave-4 lanes that omitted either are listed in
      // merge.wave4.decisionChanges.
      const expected = new Set(!change ? [] : change.carriedBy === "owner" ? change.omittedBy
        : Object.keys(s.reviews).filter((l) => l !== change.carriedBy));
      // The wave-5 decision change: every lane but cds-wave5 omitted it; the wave-5b lane (which reviews every statement
      // of the chunks it reads) carries it with the cds-wave5 review, word for word.
      if (changes5.has(`${file}:${s.start}`)) {
        assert.equal(s.reviews["cds-wave5b"], s.reviews["cds-wave5"], `${file}:${s.start} cds-wave5b`);
        for (const l of Object.keys(s.reviews).filter((l) => l !== "cds-wave5" && l !== "cds-wave5b")) expected.add(l);
      }
      // The wave-7 decision changes: every lane but cds-wave7 omitted them; the merged policy is cds-wave7's review.
      if (changes7.has(`${file}:${s.start}`)) {
        assert.equal(s.policy, s.reviews["cds-wave7"], `${file}:${s.start} cds-wave7`);
        for (const l of Object.keys(s.reviews).filter((l) => l !== "cds-wave7")) expected.add(l);
      }
      // The wave-8 decision change: every lane but cds-wave8 omitted it; the merged policy is cds-wave8's review.
      if (changes8.has(`${file}:${s.start}`)) {
        assert.equal(s.policy, s.reviews["cds-wave8"], `${file}:${s.start} cds-wave8`);
        for (const l of Object.keys(s.reviews).filter((l) => l !== "cds-wave8")) expected.add(l);
      }
      for (const lane of changes4.get(`${file}:${s.start}`) ?? []) expected.add(lane);
      assert.deepEqual(disagree.sort(), [...expected].sort(), `${file}:${s.start}`);
    }
  assert.deepEqual(pins.merge.wave4.decisionChanges.map((d) => [d.file, d.start, d.assigns, d.carriedBy, d.omittedBy, d.decision]), [
    ["shared-frame-CJdE5Ria.js", 347587, ["eN"], "owner", "states", "carry"], ["shared-183-B2N6Zy4J.js", 428589, ["Zq"], "owner", "states", "carry"],
    ["shared-frame-CJdE5Ria.js", 347587, ["eN"], "owner", "utils", "carry"], ["shared-frame-CJdE5Ria.js", 347587, ["eN"], "owner", "components", "carry"]]);
  assert.deepEqual([...changes.keys()], ["shared-frame-CJdE5Ria.js:347587", "shared-183-B2N6Zy4J.js:428589"]);
  assert.deepEqual([...changes.values()].map((d) => [d.assigns, d.carriedBy, d.omittedBy]),
    [[["eN"], "surface-additions", ["owner", "wave3-final"]], [["Zq"], "owner", ["surface-additions"]]]);
  // Carried: Base UI syncHooks (vendor-frame), surface-additions' eN.Text (CdsInfoTooltip.Text), display's
  // Zq.isCdsPictogram=!0 (shared-183), (wave 5) shared-62's pagehide / pageshow registration of the page-unloading state
  // (wave 7) vendor-zod's two guarded globalThis initialisers and (wave 8) shared-92's Y.persist.onFinishHydration(NS).
  assert.deepEqual(Object.entries(pins.statements).flatMap(([file, list]) => list.filter((s) => s.policy.startsWith("carry:")).map((s) => `${file}:${s.start}`)),
    ["vendor-frame-BckkO60Y.js:288728", "shared-frame-CJdE5Ria.js:347587", "shared-183-B2N6Zy4J.js:428589", "shared-62-DoCqVpIq.js:40114",
      "shared-92-BOgyxePb.js:155437", "vendor-zod-fszujTq6.js:10685", "vendor-zod-fszujTq6.js:58561"]);
  const unload = pins.statements["shared-62-DoCqVpIq.js"].find((s) => s.start === 40114);
  assert.equal(unload.sha256, "c5d7db17d193f3197f90f8e147f4ecc4659e36a80ac736f64e6bf8ad4b8d71f3");
  assert.match(unload.policy, /^carry: .*\(wave 5 decision change, cds-wave5 CARRY\)$/);
  // The merge used exactly the frozen input copies (wave 1, then wave 2 on top of the frozen twelve-root pins).
  for (const [lane, hash] of Object.entries(pins.merge.inputs))
    assert.equal(sha(await fs.readFile(path.join(integrate, lane === "pilot" ? "before/pins.json" : `inputs/${lane}/pins.json`))), hash, lane);
  assert.equal(sha(await fs.readFile(path.join(integrate, "wave2/before/pins.json"))), pins.merge.wave2.base);
  assert.deepEqual(Object.keys(pins.merge.wave2.inputs), ["overlays", "menus", "dialogs", "form-controls", "display"]);
  for (const [lane, hash] of Object.entries(pins.merge.wave2.inputs))
    assert.equal(sha(await fs.readFile(path.join(integrate, `wave2/inputs/${lane}/pins.json`))), hash, lane);
  // Wave-2 lanes reviewed the same statements: every shared-frame / vendor-frame review now has their wording too.
  for (const file of [official.sharedFrame, official.vendorFrame])
    for (const s of pins.statements[file]) for (const lane of ["overlays", "menus", "dialogs", "form-controls", "display", "wave3-final", "surface-additions"]) assert.ok(s.reviews[lane], `${file}:${s.start} ${lane}`);
  // Wave 3 on top of the frozen 57-root pins, from the frozen fragment copies.
  assert.equal(sha(await fs.readFile(path.join(integrate, "wave3/before/pins.json"))), pins.merge.wave3.base);
  assert.deepEqual(Object.keys(pins.merge.wave3.inputs), ["wave3-final", "surface-additions"]);
  for (const [lane, hash] of Object.entries(pins.merge.wave3.inputs)) {
    assert.equal(sha(await fs.readFile(path.join(integrate, `wave3/inputs/${lane}/pins.json`))), hash, lane);
    assert.equal(sha(await fs.readFile(path.join(integrate, `wave3/inputs/${lane}/fragment.json`))), pins.merge.wave3.fragments[lane], lane);
  }
  assert.equal(pins.merge.wave3.fragments["wave3-final"], "33446f5c1be7469fa187535c001b449e5ea9aa8fee24aa574f501348bac95e99");
  assert.equal(pins.merge.wave3.fragments["surface-additions"], "a4bbd124e75c8a6a035e44e8eebde39ef979a236140b4580bfda8e31c400734d");
  // Wave 4 on top of the frozen 107-root pins, from the frozen lane copies (cds-integrate/wave4/inputs, SHA256SUMS).
  assert.equal(sha(await fs.readFile(path.join(integrate, "wave4/before/pins.json"))), pins.merge.wave4.base);
  assert.equal(pins.merge.wave4.base, "2e8b03a4452d8c75fc9954493977afe49d843f2c820c1360e9d90752010a6e93");
  assert.deepEqual(Object.keys(pins.merge.wave4.inputs), ["states", "utils", "components"]);
  for (const [lane, hash] of Object.entries(pins.merge.wave4.inputs)) {
    assert.equal(sha(await fs.readFile(path.join(integrate, `wave4/inputs/${lane}/pins.json`))), hash, lane);
    assert.equal(sha(await fs.readFile(path.join(integrate, `wave4/inputs/${lane}/fragment.json`))), pins.merge.wave4.fragments[lane], lane);
  }
  // Namespace members: every pinned member names a root owner, and each owner's object still yields it.
  const kinds = {};
  for (const m of pins.namespaceMembers) {
    assert.equal(pins.roots[m.owner].local, m.ownerLocal, `${m.owner}.${m.member}`);
    kinds[m.kind] = (kinds[m.kind] ?? 0) + 1;
  }
  // wave 4 adds CdsToolbar.Title (Tv, a declaration).
  assert.deepEqual(kinds, { inline: 1, declaration: 77, import: 16, "member-expression": 7 });
  assert.equal(config.modules.length, 164); // wave 8s (W8S-M1: + 24 chunk modules; wave 8: 140); wave 8 (W8-M1: + vendor-datadog, c91b42814, c78048286); wave 7: 137
});

test("merged bindings are exactly the union of the 107-root owner and the three wave-4 lane graphs (+ the two writers), with unchanged declarations", async () => {
  const manifest = await json(path.join(output, "manifest.json"));
  const merged = new Map(manifest.modules.flatMap((m) => m.bindings.map((b) => [`${m.source}#${b.name}`, b.sha256])));
  const union = new Set();
  const pins5 = await json(path.join(pilot, "pins.json"));
  const replaced = new Set(Object.keys(pins5.localAdapterBoundaries));
  // wave 8 (W8-M2, classification b): the unique host boundaries shared-0 Ru / Ku (GrowthBook isOn / value over
  // HOST_GROWTHBOOK) and uO (the desktop WindowState bridge) join viteAssetUrl (wave 7: ["preload-helper-BBljBeZo.js#a"]).
  // wave 8d (R4-Q1, real-tree replay over addendum C): + the session-presets host boundaries shared-25 go / Z and shared-39 su
  // (was: the four up to shared-0 uO).
  assert.deepEqual([...replaced], ["preload-helper-BBljBeZo.js#a", "shared-0-CnnWnVrT.js#Ru", "shared-0-CnnWnVrT.js#Ku", "shared-0-CnnWnVrT.js#uO",
    "shared-25-D-aF0gt9.js#go", "shared-25-D-aF0gt9.js#Z", "shared-39-ZCs0lAwB.js#su"]);
  assert.deepEqual([...replaced].map((k) => pins5.localAdapterBoundaries[k].name), ["viteAssetUrl", "hostGrowthBookIsOn", "hostGrowthBookValue", "hostWindowState",
    "hostUseGrowthBookFeature", "hostUseCurrentAccount", "hostLoadEnvironmentDialogChunk"]);
  // The wave-1 and wave-2 inputs (six-root owner + fields / layout / navigation, twelve-root owner + the five wave-2
  // lanes) are a subset with unchanged declarations; the frozen 57-root owner and the two wave-3 fragments together are
  // exactly the output.
  for (const file of ["before/manifest.json", "inputs/fields/manifest.json", "inputs/layout/manifest.json", "inputs/navigation/manifest.json",
    "wave2/before/manifest.json", ...["overlays", "menus", "dialogs", "form-controls", "display"].map((l) => `wave2/inputs/${l}/manifest.json`),
    "wave3/before/manifest.json", "wave3/inputs/wave3-final/manifest.json", "wave3/inputs/surface-additions/manifest.json",
    // wave 4: the frozen 107-root owner (its production manifest: the same bindings) and the three lanes' isolated graphs.
    "wave4/before/prod-manifest.json", ...["states", "utils", "components"].map((l) => `wave4/inputs/${l}/manifest.json`),
    // wave 5: the frozen 146-root owner (production manifest) and the cds-wave5 lane graph.
    "wave5/before/prod-manifest.json", "wave5/inputs/lane-manifest.json",
    // wave 5b: the staged wave-5 owner (wave5b/before/wave5-manifest.json) and the cds-wave5b lane graph.
    "wave5b/before/wave5-manifest.json", "wave5b/inputs/lane-manifest.json",
    // wave 6: the applied wave-5b owner (production manifest 50763521) and the cds-wave6 lane graph.
    "wave6/before/prod-manifest.json", "wave6/inputs/lane-manifest.json",
    // wave 7: the applied wave-6 owner (production manifest c4b6979f) and the cds-wave7 lane graph.
    "wave7/before/prod-manifest.json", "wave7/inputs/lane-manifest.json",
    // wave 8: the applied wave-7 owner (production manifest 79b004e0) and the cds-wave8 lane graph.
    "wave8/before/prod-manifest.json", "wave8/inputs/lane-manifest.json",
    // wave 8s (W8S-M1): the rehearsed wave-8 owner (production manifest 9203795f) and the cds-wave8s lane graph.
    "wave8s/before/prod-manifest.json", "wave8s/inputs/lane-manifest.json",
    // wave 8a/8b (R4-K1, addendum A + B): the applied wave-8s owner (production manifest cdba8a29, wave8a/before; wave 8a adds no
    // binding, only publicNames over held values), the stage-11a owner (56e9a537, wave8b/before) and the wave-8b lane dry run
    // (w8-explore over the stage-11a pins with the 6 entries, wave8b/lane/SHA256SUMS). Wave 8s: the list ended with wave 8s.
    "wave8a/before/prod-manifest.json", "wave8b/before/prod-manifest.json", "wave8b/lane/lane-manifest.json",
    // wave 8c (R4-K1, addendum C, stage 13c): the applied wave-8b owner (production manifest 33036703, wave8c/before) and the
    // wave-8c lane dry run (w8-explore over the stage-12b config with the 5 entries, wave8c/lane/SHA256SUMS). Wave 8c: the
    // list ended with "wave8b/lane/lane-manifest.json".
    "wave8c/before/prod-manifest.json", "wave8c/lane/lane-manifest.json",
    // wave 8d (R4-Q1 addendum D replayed over addendum C, R4-K1, stage 14d): the applied wave-8c owner (production manifest
    // c5da39b7, wave8d/before) and the wave-8d lane dry run (w8-explore over the stage-13c config with the 11 entries and the 3
    // local adapters, wave8d/scripts/lane-w8d.sh, wave8d/lane/SHA256SUMS). Wave 8d: the list ended with "wave8c/lane/lane-manifest.json".
    "wave8d/before/prod-manifest.json", "wave8d/lane/lane-manifest.json",
    // wave cc2 (chat-cowork-1to1-20261117 r2 Core step, stage 15cc): the applied wave-8d owner (production manifest 06d20269,
    // wavecc2/before) and the wave-cc2 lane dry run (w8-explore over a stage-14d clone with the 11 entries, wavecc2/lane/SHA256SUMS).
    // Wave cc2: the list ended with "wave8d/lane/lane-manifest.json".
    "wavecc2/before/prod-manifest.json", "wavecc2/lane/lane-manifest.json"]) {
    const input = await json(path.join(integrate, file));
    for (const m of input.modules)
      for (const b of m.bindings) {
        const id = `${m.source}#${b.name}`;
        // wave 5 replaces the official preload-helper assetsURL a by the host viteAssetUrl (pins.localAdapterBoundaries):
        // the declaration leaves the owner, its readers keep their text and import the adapter.
        if (replaced.has(id)) { assert.equal(merged.get(id), undefined, `${file} ${id}`); continue; }
        union.add(id);
        assert.equal(merged.get(id), b.sha256, `${file} ${id}`);
      }
  }
  // The states-review P2 writers (shared-frame kn, shared-11 _n) are the integrator's two roots: official text, no lane.
  const writers = (await json(path.join(pilot, "pins.json"))).merge.wave4.integrator.filter((r) => r.export).map((r) => r.binding);
  assert.deepEqual(writers, ["shared-frame-CJdE5Ria.js#kn", "shared-11-CNsu0Zu8.js#_n"]);
  assert.deepEqual([...merged.keys()].sort(), [...union, ...writers.filter((w) => !union.has(w))].sort());
  assert.equal(merged.size, 10786); // wave cc2 (wavecc2/union.json bindings.after; was 10613); wave 8d (R4-Q1: wave8d/union.json bindings.after; was 10533); wave 8c (R4-K1: wave8c/union.json bindings.after; was 10527); wave 8a/8b (R4-K1: wave8b/union.json bindings.after); wave 8s: 10522 (W8S-M1: wave8s/union.json bindings.after); wave 8: 9746 (W8-M1: wave8/union.json bindings.after); wave 7: 7321
  // wave 6 union proof (scripts/union-check.mjs): every wave-5b module, binding, export and initializer kept, 0 moved names.
  const union6 = await json(path.join(integrate, "wave6/union.json"));
  assert.deepEqual(union6.problems, []);
  assert.deepEqual([union6.bindings.before, union6.bindings.after, union6.bindings.existingKeptIdentical, union6.publicNames.before, union6.publicNames.after, union6.publicNames.moved],
    [3909, 7168, 3909, 553, 2300, 0]);
  // wave 7 union proof: every wave-6 module, binding, export and initializer kept (vendor-zod gains only the two official
  // __zod_globalConfig / __zod_globalRegistry initialisers it was missing), 0 moved names.
  const union7 = await json(path.join(integrate, "wave7/union.json"));
  assert.deepEqual(union7.problems, []);
  assert.deepEqual([union7.bindings.before, union7.bindings.after, union7.bindings.existingKeptIdentical, union7.publicNames.before, union7.publicNames.after, union7.publicNames.moved],
    [7168, 7321, 7168, 2300, 2377, 0]);
  // wave 8 union proof: every wave-7 module, binding, export and initializer kept (the one declared statement change: shared-92
  // Y.persist.onFinishHydration(NS) carried), 0 moved names.
  const union8 = await json(path.join(integrate, "wave8/union.json"));
  assert.deepEqual(union8.problems, []);
  assert.deepEqual([union8.bindings.before, union8.bindings.after, union8.bindings.existingKeptIdentical, union8.publicNames.before, union8.publicNames.after, union8.publicNames.moved],
    [7321, 9746, 7321, 2377, 2530, 0]);
  // wave 8s union proof (W8S-M1, wave8s/scripts/union-check-w8s.mjs): every wave-8 module, binding, export and initializer
  // kept, no declared initializer change, 0 moved names.
  const union8s = await json(path.join(integrate, "wave8s/union.json"));
  assert.deepEqual(union8s.problems, []);
  assert.deepEqual(union8s.declaredInitializerChanges, []);
  assert.deepEqual([union8s.bindings.before, union8s.bindings.after, union8s.bindings.existingKeptIdentical, union8s.publicNames.before, union8s.publicNames.after, union8s.publicNames.moved],
    [9746, 10522, 9746, 2530, 2927, 0]);
  // wave 8a / 8b union proofs (R4-K1, wave8a|wave8b/scripts/union-check-w8a|w8b.mjs; wave8ab/union.json combines both against
  // the applied wave-8s owner): every module, binding, export and initializer kept, no declared initializer change, 0 moved names.
  const union8a = await json(path.join(integrate, "wave8a/union.json"));
  assert.deepEqual(union8a.problems, []);
  assert.deepEqual(union8a.declaredInitializerChanges, []);
  assert.deepEqual([union8a.bindings.before, union8a.bindings.after, union8a.bindings.existingKeptIdentical, union8a.publicNames.before, union8a.publicNames.after, union8a.publicNames.moved],
    [10522, 10522, 10522, 2927, 3187, 0]);
  const union8b = await json(path.join(integrate, "wave8b/union.json"));
  assert.deepEqual(union8b.problems, []);
  assert.deepEqual(union8b.declaredInitializerChanges, []);
  assert.deepEqual([union8b.bindings.before, union8b.bindings.after, union8b.bindings.existingKeptIdentical, union8b.publicNames.before, union8b.publicNames.after, union8b.publicNames.moved],
    [10522, 10527, 10522, 3187, 3193, 0]);
  assert.equal(sha(await fs.readFile(path.join(integrate, "wave8b/lane/lane-manifest.json"))), "8affadee32d110cdb0436837bfa36a9d8511f521cbc43764220f2e6739899f2c");
  // wave 8c union proof (R4-K1 addendum C): every stage-12b binding kept identical (no declared initializer change), 0 moved names.
  const union8c = await json(path.join(integrate, "wave8c/union.json"));
  assert.deepEqual(union8c.problems, []);
  assert.deepEqual(union8c.declaredInitializerChanges, []);
  assert.deepEqual([union8c.bindings.before, union8c.bindings.after, union8c.bindings.existingKeptIdentical, union8c.publicNames.before, union8c.publicNames.after, union8c.publicNames.moved],
    [10527, 10533, 10527, 3193, 3198, 0]);
  assert.equal(sha(await fs.readFile(path.join(integrate, "wave8c/lane/lane-manifest.json"))), "c55d080de1e1b5a677424c451c0a157388ed1020b8a759dd489bd13d75a3506f");
  // wave 8d union proof (R4-Q1 addendum D over the applied stage-13c owner, wave8d/scripts/union-check-w8d.mjs): every stage-13c
  // binding kept identical (no declared initializer change), 0 moved names, 11 names added.
  const union8d = await json(path.join(integrate, "wave8d/union.json"));
  assert.deepEqual([union8d.problems, union8d.declaredInitializerChanges], [[], []]);
  assert.deepEqual([union8d.bindings.before, union8d.bindings.after, union8d.bindings.existingKeptIdentical, union8d.publicNames.before, union8d.publicNames.after, union8d.publicNames.moved],
    [10533, 10613, 10533, 3198, 3209, 0]);
  assert.equal(sha(await fs.readFile(path.join(integrate, "wave8d/lane/lane-manifest.json"))), "096f6c022727c46223d4279652dd8d3ec22626be2cf3abbef37bfa8ec2a25710");
  // wave cc2 union proof (chat-cowork r2 Core step over the applied stage-14d owner, wavecc2/scripts/union-check-wcc2.mjs): every
  // stage-14d binding kept identical (no declared initializer change), 0 moved names, 11 names added.
  const unioncc2 = await json(path.join(integrate, "wavecc2/union.json"));
  assert.deepEqual([unioncc2.problems, unioncc2.declaredInitializerChanges], [[], []]);
  assert.deepEqual([unioncc2.bindings.before, unioncc2.bindings.after, unioncc2.bindings.existingKeptIdentical, unioncc2.publicNames.before, unioncc2.publicNames.after, unioncc2.publicNames.moved],
    [10613, 10786, 10613, 3209, 3220, 0]);
  assert.equal(sha(await fs.readFile(path.join(integrate, "wavecc2/lane/lane-manifest.json"))), "b0a8f2b0485c7da2c3610fb07914ac3be54cd988d976cc5ea008c08c2fb9956a");
  const closure5b = await json(path.join(integrate, "wave5b/closure.json"));
  assert.equal(closure5b.verdict, "PASS");
  assert.deepEqual([closure5b.owner.bindings.before, closure5b.owner.bindings.wave5, closure5b.owner.bindings.after, closure5b.owner.publicNames.before, closure5b.owner.publicNames.after],
    [3564, 3781, 3909, 407, 553]);
  assert.deepEqual([closure5b.owner.vsBefore.changed, closure5b.owner.vsBefore.moved, closure5b.owner.vsWave5.changed, closure5b.owner.vsWave5.moved, closure5b.owner.vsWave5.replaced], [[], [], [], [], []]);
  assert.deepEqual(closure5b.owner.vsBefore.replaced.map((r) => r.binding), ["preload-helper-BBljBeZo.js#a"]);
  assert.deepEqual([closure5b.union.identicalModules, closure5b.union.of], [46, 46]);
  assert.ok(closure5b.newHeldStateful.every((x) => x.published));
  assert.deepEqual(closure5b.statefulStillSliced, []);
  const closure5 = await json(path.join(integrate, "wave5/closure.json"));
  assert.equal(closure5.verdict, "PASS");
  assert.deepEqual([closure5.owner.bindings.before, closure5.owner.bindings.after, closure5.owner.publicNames.before, closure5.owner.publicNames.after], [3564, 3781, 407, 457]);
  assert.deepEqual([closure5.owner.changedExistingBindings, closure5.owner.movedPublicNames], [[], []]);
  assert.deepEqual(closure5.owner.declaredReplacements.map((r) => r.binding), ["preload-helper-BBljBeZo.js#a"]);
  assert.deepEqual([closure5.union.identicalModules, closure5.union.of], [40, 40]);
  assert.ok(closure5.newHeldStateful.every((x) => x.published));
  const closure4 = await json(path.join(integrate, "wave4/closure.json"));
  assert.equal(closure4.verdict, "pass");
  assert.equal(closure4.output.bindings, 3564);
  assert.deepEqual([closure4.union.missing, closure4.union.extra, closure4.union.changedExistingBindings], [0, 0, []]);
  assert.equal(closure4.union.productionEqualsStaging, true);
  assert.deepEqual([closure4.traversal.missing, closure4.traversal.extra, closure4.traversal.equal], [[], [], true]);
  assert.deepEqual([closure4.publicNames.before, closure4.publicNames.after, closure4.publicNames.movedExisting], [119, 407, []]);
  assert.deepEqual(closure4.linkedState.withoutPublicName, []);
  const closure = await json(path.join(integrate, "wave3-closure.json"));
  assert.equal(closure.union.missing, 0); assert.equal(closure.union.extra, 0);
  assert.deepEqual(closure.union.changedExistingBindings, []);
  // wave-3 evidence stays as written (3055 bindings, 107 roots).
  assert.equal(closure.traversal.equal, true); assert.equal(closure.output.bindings, 3055);
  assert.deepEqual(closure.traversal.carriedStatements, ["vendor-frame-BckkO60Y.js:288728", "shared-frame-CJdE5Ria.js:347587", "shared-183-B2N6Zy4J.js:428589"]);
  assert.deepEqual(closure.traversal.adapters, ["shared-0-CnnWnVrT.js#Uu", "shared-25-D-aF0gt9.js#ls", ...["be", "ce", "i"].map((n) => `${official.vendorFrame}#${n}`)]);
  assert.deepEqual(closure.traversal.dynamicImports, ["shared-frame-CJdE5Ria.js#ri -> ./c86ccec3d-CSD9PqcP.js", "shared-frame-CJdE5Ria.js#sM -> ./cf2613ee5-Btwr9m9F.js"]);
  assert.deepEqual(closure.omittedStatements.writesToSelectedBindings, []);
  assert.deepEqual(Object.keys(closure.inputs), ["owner57", "wave3-final", "surface-additions"]);
  assert.deepEqual([closure.inputs["wave3-final"].bindings, closure.inputs["surface-additions"].bindings], [1974, 1788]);
  assert.equal(closure.singleOwner.oneTargetPerSource, true); assert.equal(closure.singleOwner.productionEqualsStaging, true);
  assert.deepEqual(closure.singleOwner.laneStates.missingFromMergedGraph, []); assert.deepEqual(closure.singleOwner.linkedWithoutPublicName, []);
  // The wave-1 and wave-2 evidence stays as written (2108 bindings closure.json, 2852 wave2-closure.json).
  assert.equal((await json(path.join(integrate, "closure.json"))).output.bindings, 2108);
  assert.equal((await json(path.join(integrate, "wave2-closure.json"))).output.bindings, 2852);
});

// A canonical statement policy that calls a binding "unselected" must hold for the merged 107-root closure (lane
// wordings under `reviews` describe each lane's own graph and are not checked here). Covers the pins, the staging
// provenance and the production provenance (fix.md: HA/WA/GA are selected because Banner reads them).
test("canonical statement policies never call a binding of the merged closure unselected", async () => {
  const manifest = await json(path.join(output, "manifest.json"));
  const selected = new Set(manifest.modules.flatMap((m) => m.bindings.map((b) => `${m.source}#${b.name}`)));
  const reviews = {
    pins: (await json(path.join(pilot, "pins.json"))).statements,
    staging: (await json(path.join(pilot, "provenance.json"))).initializationReview,
    production: (await json(path.join(pilot, "../../../app/src/generated/cds-core/provenance.json"))).initializationReview,
  };
  const claimed = [];
  const sourceBindings = new Map();
  for (const file of Object.keys(reviews.pins))
    sourceBindings.set(file, new Set((await readSource(file, new Map(), official.ionSource)).top.keys()));
  for (const [where, statements] of Object.entries(reviews))
    for (const [file, list] of Object.entries(statements))
      for (const s of list)
        for (const [, name] of s.policy.matchAll(/\bunselected (?:pictogram )?([\w$]+)/g)) {
          // Prose such as "unselected constants" (display, shared-183) names no binding of the file.
          if (!sourceBindings.get(file).has(name)) continue;
          claimed.push(`${where} ${file}#${name}`);
          assert.equal(selected.has(`${file}#${name}`), false, `${where} ${file}:${s.start} calls selected ${name} unselected`);
        }
  // eN became the CdsInfoTooltip root in wave 3; its Text assignment is carried with the surface-additions wording. Wave
  // 5b's new modules omit the listeners / registrations that write the unselected shared-212 Hb / Wb and shared-26 iK / kd.
  assert.deepEqual([...new Set(claimed.map((c) => c.split(" ")[1]))].sort(),
    ["shared-212-BHMAi0oa.js#Hb", "shared-212-BHMAi0oa.js#Wb", "shared-26-B-POtn5S.js#iK", "shared-26-B-POtn5S.js#kd", "shared-frame-CJdE5Ria.js#AW"]);
  assert.ok(selected.has("shared-frame-CJdE5Ria.js#eN"));
  for (const statements of Object.values(reviews))
    assert.match(statements["shared-frame-CJdE5Ria.js"].find((x) => x.start === 347587).policy, /^carry: assigns the InfoTip Text part \(eN\.Text\)/);
  for (const glyph of ["HA", "WA", "GA"]) {
    assert.ok(selected.has(`shared-frame-CJdE5Ria.js#${glyph}`), glyph);
    for (const statements of Object.values(reviews)) {
      const s = statements["shared-frame-CJdE5Ria.js"].filter((x) => x.reviews.layout?.startsWith(`omit: discarded ${glyph}.glyph read`));
      assert.equal(s.length, 1, glyph);
      assert.equal(s[0].policy, `omit: discarded ${glyph}.glyph read; plain data object, no getter or mutation`);
    }
  }
});

test("Context and store owners are declared once in shared-frame and imported by shared-11 / page / page-header", async () => {
  const manifest = await json(path.join(output, "manifest.json"));
  const owner = official.sharedFrame;
  for (const name of ["Da", "Wa", "Ci", "ui", "rr", "qn", "Qd", "hm", "Ba", "Ku", "Vd"]) {
    const owners = manifest.modules.filter((m) => m.bindings.some((b) => b.name === name) && m.source === owner);
    assert.equal(owners.length, 1, name);
  }
  for (const target of ["shared-11.mjs", "page.mjs", "page-header.mjs", "c86ccec3d-CSD9PqcP.js"]) {
    const code = await fs.readFile(path.join(output, target), "utf8");
    const ast = parseAst(code);
    const sharedImports = ast.body.filter((n) => n.type === "ImportDeclaration" && n.source.value === "./shared-frame.mjs");
    assert.equal(sharedImports.length, 1, target);
  }
  // Context factories appear only in the official sources that declare their own Contexts
  // (shared-frame, vendor-frame, vendor-base-ui, shared-11 Tabs; wave 3: cd9e4c7f2's view-tab icon size and shared-183's
  // PreviewCard parts); Page, PageHeader, the lazy sheet chunk and the ViewTabBar chunk only import them, so each Context
  // object exists once.
  const factories = [];
  for (const m of manifest.modules)
    if (/\bcreateContext\b/.test(await fs.readFile(path.join(output, m.target), "utf8"))) factories.push(m.target);
  // Wave 4: the components chunks that declare their own Contexts (c51c45b79 / c9c7785eb tables, cc18d27d7 Sessions menu);
  // wave 5: shared-123's "look backed" Context Xu (read by useHubLookBacked, formerly cut by routines-shared-v4); wave 5b:
  // the region Contexts cds-core now owns once (shared-18 HoverTooltipsEnabled / StatusActive / StatusClay, shared-26
  // ComposerDock / ChatComposerLayout / PageHeadingRegistry, shared-39 EpitaxySessionPresets, shared-6 InDesktopFrameContent);
  // wave 6 / 7: exactly the modules that hold a wave-6 or wave-7 published Context (pins.publicBindings kinds "context",
  // lane cds-wave6 / cds-wave7).
  const pinsCtx = await json(path.join(pilot, "pins.json"));
  // wave 8c (R4-K1 addendum C): + the wave-8c published Context shared-4 rO (ctx_shared4_rO), whose module shared-4.mjs is a
  // Context factory now (was: cds-wave6 / cds-wave7 / cds-wave8s).
  const wave6Contexts = Object.entries(pinsCtx.publicBindings).filter(([, e]) => (e.lanes?.includes("cds-wave6") || e.lanes?.includes("cds-wave7") || e.lanes?.includes("cds-wave8s") || e.lanes?.includes("cds-wave8c") || e.lanes?.includes("cds-wave8d")) && e.kinds?.includes("context")); // wave 8d (R4-Q1): + the wave-8d published Context shared-25 Mz (ctx_shared25_Mz) (was: up to cds-wave8c) // wave 8s (W8S-M1): + the wave-8s published Contexts (wave 8: cds-wave6 / cds-wave7 only)
  const wave6Factories = new Set(wave6Contexts.map(([, e]) => manifest.modules.find((m) => m.source === e.file).target));
  for (const [name, e] of wave6Contexts) {
    const mod = await import(pathToFileURL(path.join(output, manifest.modules.find((m) => m.source === e.file).target)).href);
    assert.equal(mod[e.local]?.$$typeof, Symbol.for("react.context"), name);
  }
  assert.deepEqual(factories.sort(), [...new Set(["c51c45b79.mjs", "c9c7785eb.mjs", "cc18d27d7.mjs", "cd9e4c7f2.mjs", "shared-11.mjs", "shared-123.mjs", "shared-18.mjs", "shared-183.mjs",
    "shared-26.mjs", "shared-39.mjs", "shared-6.mjs", "shared-frame.mjs", "vendor-base-ui.mjs", "vendor-frame.mjs", ...wave6Factories])].sort());
  // The staged owner graph exports each wave-5b publicBinding under its original local (pins.publicBindings).
  const pinsNow = await json(path.join(pilot, "pins.json"));
  for (const name of ["HoverTooltipsEnabledContext", "StatusActiveContext", "StatusClayContext", "ComposerDockContext", "ChatComposerLayoutContext",
    "PageHeadingRegistryContext", "EpitaxySessionPresetsContext", "InDesktopFrameContentContext"]) {
    const e = pinsNow.publicBindings[name];
    assert.ok(e?.lanes.includes("cds-wave5b"), name);
    const m = manifest.modules.find((x) => x.source === e.file);
    const mod = await import(pathToFileURL(path.join(output, m.target)).href);
    assert.equal(mod[e.local]?.$$typeof, Symbol.for("react.context"), name);
  }
  assert.ok(manifest.modules.find((m) => m.target === "cfe7c4b3b.mjs").imports.some((i) => i.from === "./cd9e4c7f2.mjs" && i.name === "n"));
  for (const name of ["Da", "Wa", "Ci", "ui", "rr", "qn", "Qd"])
    assert.equal(Core[name]?.$$typeof, Symbol.for("react.context"), name);
});

test("preflight rejects drift in every source the merge added", async (t) => {
  const pins = await json(path.join(pilot, "pins.json"));
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "cds-core-merged-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  for (const file of [...Object.keys(pins.sources), ...Object.keys(pins.hostBoundaries)]) await fs.copyFile(path.join(official.ionSource, file), path.join(directory, file));
  await preflight({ ...official, ionSource: directory });
  // Wave 4: the host i18n boundary chunk (its p / l are answered by the adapter) is pinned too; since wave 5 the owner also
  // slices it (vendor-intl.mjs, fragment.newModules), so its source pin is the first check that refuses the drift.
  assert.ok(Object.hasOwn(pins.hostBoundaries, "vendor-intl-BJgYK7RA.js") && Object.hasOwn(pins.sources, "vendor-intl-BJgYK7RA.js"));
  await fs.appendFile(path.join(directory, "vendor-intl-BJgYK7RA.js"), "\n// drift fixture\n");
  await assert.rejects(preflight({ ...official, ionSource: directory }), /pilot pinned input changed: vendor-intl-BJgYK7RA\.js/);
  await fs.copyFile(path.join(official.ionSource, "vendor-intl-BJgYK7RA.js"), path.join(directory, "vendor-intl-BJgYK7RA.js"));
  for (const file of ["shared-11-CNsu0Zu8.js", "cd75b47e6-BcflIwff.js", "cf35aed38-tqXPCmE_.js", "vendor-base-ui-C9gS4B4G.js",
    "c09817156-Yg3kFvSY.js", "shared-2-CsjIBQD8.js", "shared-183-B2N6Zy4J.js",
    // wave 3
    "cfe7c4b3b-DL00XXE5.js", "cd9e4c7f2-CKPq1wry.js", "c75e89812-DRkIsp6K.js", "c1ea8a271-C3TY2pYF.js", "cc18d27d7-CJQ6OnqZ.js",
    "cdfb0c433-OOm3enZf.js", "shared-62-DoCqVpIq.js", "shared-0-CnnWnVrT.js", "shared-1-D1bGaTaN.js", "shared-8-BqfCbkJd.js",
    "shared-25-D-aF0gt9.js", "shared-33-DtdykY0y.js", "shared-92-BOgyxePb.js", "shared-123-1Hc1RTKl.js", "cf2613ee5-Btwr9m9F.js",
    "c04b2e418-B9im5gUL.js",
    // wave 4
    "vendor-all-0-uUCo-eCX.js", "ce58a0513-CWdKvvaS.js", "c51c45b79-CoF599cL.js", "c12ca901f-BRGahymY.js", "ce802b15a-D3k3ccEH.js",
    "shared-18-Cfqwgjc5.js", "c9c7785eb-0Yp6X-iJ.js",
    // wave 5
    "shared-60-DmOyT7JJ.js", "shared-5-u8kha2eH.js", "shared-153-DMw2VzSq.js", "shared-31-C9BqSSuD.js",
    // wave 5b
    "shared-6-2QYRw_Wv.js", "shared-9-BgdM6Y1f.js", "shared-26-B-POtn5S.js", "shared-39-ZCs0lAwB.js", "shared-212-BHMAi0oa.js", "ce574895a-AyUKk43x.js",
    // wave 6: every chunk the merge added (pins.merge.wave6.newModules)
    ...pins.merge.wave6.newModules.map((m) => m.source),
    // wave 7: every chunk the merge added (pins.merge.wave7.newModules)
    ...pins.merge.wave7.newModules.map((m) => m.source),
    // wave 8: every chunk the merge added (pins.merge.wave8.newModules)
    ...pins.merge.wave8.newModules.map((m) => m.source)]) {
    await fs.appendFile(path.join(directory, file), "\n// drift fixture\n");
    await assert.rejects(preflight({ ...official, ionSource: directory }), new RegExp(`pinned input changed: ${file.replace(/[.]/g, "\\.")}`));
    await fs.copyFile(path.join(official.ionSource, file), path.join(directory, file));
  }
});

// ---------------------------------------------------------------------------------------------
// fields lane (TextInputField LI / TextAreaField RI) on the merged graph
// ---------------------------------------------------------------------------------------------
for (const [name, tag, data] of [["CdsTextInputField", "input", "TextInput"], ["CdsTextAreaField", "textarea", "TextArea"]]) {
  test(`${name}: merged SSR preserves field semantics and native attributes`, () => {
    const markup = html(Core[name], {
      label: "Account name", hint: "Use plain text", error: "Required field", required: true,
      id: "account-name", name: "account", form: "profile", defaultValue: "Ada", disabled: true,
      readOnly: true, "aria-describedby": "external-help", "data-probe": "official", fieldClassName: "field-probe",
    });
    for (const pattern of [new RegExp(`<${tag}\\b`), new RegExp(`data-cds="${data}"`), /data-cds="Field"/, /name="account"/, /form="profile"/, /required=""/, /disabled=""/, /readOnly=""/, /aria-invalid="true"/, /aria-describedby="external-help"/, /data-probe="official"/, /field-probe/, /Use plain text/, /Required field/, /Ada/])
      assert.match(markup, pattern);
    const controlId = markup.match(new RegExp(`<${tag}[^>]* id="([^"]+)"`))?.[1];
    assert.ok(controlId); assert.ok(markup.includes(`for="${controlId}"`));
    const reserved = html(Core[name], { label: "Notes", reserveErrorLines: 2, value: "controlled", onChange() {} });
    assert.match(reserved, /min-height:2lh/); assert.match(reserved, /aria-hidden="true"/); assert.match(reserved, /controlled/);
  });
}
test("TextInputField clearable renders the original clear Button through the shared Button owner", () => {
  const markup = html(Core.CdsTextInputField, { label: "Search", clearable: true, defaultValue: "query" });
  assert.match(markup, /data-cds="Button"/); assert.match(markup, /aria-label="Clear"/);
  assert.doesNotMatch(html(Core.CdsTextInputField, { label: "Search", clearable: true, defaultValue: "q", disabled: true }), /aria-label="Clear"/);
  const area = html(Core.CdsTextAreaField, { label: "Notes", rows: 5, autosize: true, resize: "y", style: { color: "rgb(1, 2, 3)" }, defaultValue: "x" });
  assert.match(area, /rows="5"/); assert.match(area, /--cds-textarea-rows:5/); assert.match(area, /field-sizing:content/); assert.match(area, /resize-y/);
});

// ---------------------------------------------------------------------------------------------
// layout lane (Page x / Banner aj) on the merged graph
// ---------------------------------------------------------------------------------------------
test("Page merged SSR preserves header/content/banner/tabs/actions/status and width/gap props", () => {
  const markup = html(Page, { title: "Page title", subtitle: "Subtitle",
    tabs: el("nav", { "aria-label": "Sections" }, "Tabs"), actions: el("a", { href: "#action" }, "Action"),
    primaryAction: el("button", null, "Create"), status: "Updated", banner: el("aside", null, "Notice"),
    width: "wide", contentGap: "lg", className: "page-probe", id: "header-id", children: el("p", null, "Body") });
  assert.match(markup, /^<div data-cds="Page" data-width="wide" class="[^"]*page-probe/);
  assert.match(markup, /--cds-page-header-scroll-offset:10rem;--cds-page-header-pinned-height:7rem/);
  assert.match(markup, /<header[^>]*data-cds="PageHeader"[^>]*id="header-id"/);
  for (const value of ["Page title", "Subtitle", "Tabs", "Action", "Create", "Updated", "Notice", "Body"]) assert.ok(markup.includes(value), value);
  assert.match(markup, /data-cds-part="tabs-row"/); assert.match(markup, /data-cds-part="controls"/);
  assert.ok(markup.indexOf("<aside>Notice") < markup.indexOf("<p>Body"));
  assert.match(markup, /<p role="status" class="sr-only">Updated<\/p>/);
});

test("Page fixed root, forwarded ref, header spread, header=false and panels Context match the new source", () => {
  const ref = React.createRef(), titleRef = React.createRef(), sentinel = React.createRef();
  const f = fixture((props) => Page.render(props, ref), { title: "Title", titleRef, topSentinelRef: sentinel, id: "on-header", children: "Body" });
  assert.equal(f.tree.type, "div"); assert.equal(f.tree.props.ref, ref); assert.equal(f.tree.props.id, undefined);
  assert.equal(find(f.tree, (n) => n.props?.className === "h-0").props.ref, sentinel);
  assert.equal(find(f.tree, (n) => n.props?.id === "on-header").props.titleRef, titleRef);
  assert.equal(f.tree.props["data-width"], "content"); assert.match(html(Page, { title: "T" }), /max-w-5xl pb-2/);
  const hidden = html(Page, { header: false, title: "Suppressed", contentGap: "none", children: "Body" });
  assert.match(hidden, /--cds-page-header-scroll-offset:0px;--cds-page-header-pinned-height:0px/);
  assert.doesNotMatch(hidden, /<header|Suppressed/);
  const panels = withContext(Core.rr, "panels", Page, { title: "Title", translucentHeader: true });
  assert.match(panels, /--cds-page-header-scroll-offset:8rem/); assert.match(panels, /data-cds-part="stuck-mark"/);
  assert.match(panels, /data-cds-part="level-mark"/); assert.match(panels, /data-cds-part="page-header-ground"/);
});

test("Page original observers measure pinned header, update scroll state and clean up", (t) => {
  const previous = Object.fromEntries(["IntersectionObserver", "ResizeObserver", "Node"].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  const intersections = [], resizes = [], listeners = new Map();
  class IO { constructor(callback) { this.callback = callback; this.observed = []; intersections.push(this); } observe(n) { this.observed.push(n); } disconnect() { this.disconnected = true; } }
  class RO { constructor(callback) { this.callback = callback; this.observed = []; resizes.push(this); } observe(n) { this.observed.push(n); } disconnect() { this.disconnected = true; } }
  Object.assign(globalThis, { IntersectionObserver: IO, ResizeObserver: RO, Node: { DOCUMENT_POSITION_PRECEDING: 2 } });
  t.after(() => { for (const [k, desc] of Object.entries(previous)) if (desc) Object.defineProperty(globalThis, k, desc); else delete globalThis[k]; });
  let scrolled;
  const sentinel = { current: { scrollIntoView(options) { scrolled = options; } } };
  const f = fixture(Page.render, { title: "Measured", band: "tall-frame", tabs: "Tabs", topSentinelRef: sentinel, children: "Body" }, new Map([[Core.rr, "panels"]]), { effects: true });
  find(f.tree, (n) => n.props?.["data-cds-part"] === "stuck-mark").props.ref.current = { tag: "stuck" };
  find(f.tree, (n) => n.props?.["data-cds-part"] === "level-mark").props.ref.current = { offsetWidth: 60 };
  const header = find(f.tree, (n) => n.props?.className === "sticky top-0 bg-page");
  const tabs = { getBoundingClientRect: () => ({ top: 30, height: 40, width: 300 }), querySelector: () => ({}), compareDocumentPosition: () => 2 };
  header.props.ref.current = { offsetHeight: 160, offsetWidth: 800,
    ownerDocument: { documentElement: { clientWidth: 800 }, defaultView: { ResizeObserver: RO, matchMedia: () => ({ matches: true }), getComputedStyle: () => ({ direction: "ltr" }) } },
    querySelector(selector) { if (selector.includes("tabs-row")) return tabs; if (selector.includes("controls")) return { getBoundingClientRect: () => ({ top: 40 }) }; return { getBoundingClientRect: () => ({ left: 10, right: 700 }) }; },
    getBoundingClientRect: () => ({ top: 0 }), addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name) => listeners.delete(name),
  };
  f.flushEffects(); f.render(); f.flushEffects();
  assert.equal(intersections[0].observed.length, 3); assert.ok(resizes[0].observed.includes(tabs));
  assert.equal(f.tree.props.style["--cds-page-header-scroll-offset"], "154px");
  assert.equal(f.tree.props.style["--cds-page-header-pinned-height"], "138px");
  intersections[0].callback(intersections[0].observed.map((target) => ({ target, isIntersecting: false })));
  f.render(); f.flushEffects();
  const shim = find(f.tree, (n) => n.props?.blockRef);
  assert.equal(shim.props.shift, 50); assert.equal(shim.props.isStuck, true);
  listeners.get("focusin")({ target: { matches: () => true } }); assert.deepEqual(scrolled, { block: "nearest" });
  f.unmount(); assert.ok(intersections.every((o) => o.disconnected)); assert.ok(resizes.every((o) => o.disconnected)); assert.equal(listeners.size, 0);
});

test("Banner merged SSR roles, variants, actions, calibration and details Collapsible match aj", () => {
  const standard = html(Core.CdsBanner, { children: "Notice", variant: "warning", action: el("a", { href: "#details" }, "Review"), "data-testid": "banner", className: "banner-probe" });
  assert.match(standard, /data-cds="Banner"/); assert.match(standard, /role="status"/);
  assert.match(standard, /bg-warning text-warning/); assert.match(standard, /<a href="#details">Review<\/a>/);
  assert.match(html(Core.CdsBanner, { children: "Error", variant: "danger", role: "alert", icon: null }), /role="alert"/);
  assert.doesNotMatch(html(Core.CdsBanner, { children: "Quiet", role: "none", icon: null }), /role=|data-cds="Icon"/);
  const custom = html(Core.CdsBanner, { children: "Custom", icon: el("b", null, "!"), actionAlign: "center", composerCalibration: true });
  assert.match(custom, /data-composer-keyline="glyph"/); assert.match(custom, /data-action-align="center"/);
  const props = { children: "Read more", details: el("p", null, "Details content") };
  const opened = html(Core.CdsBanner, { ...props, defaultDetailsOpen: true });
  assert.match(opened, /data-cds="Collapsible"/); assert.match(opened, /aria-expanded="true"/); assert.match(opened, /Details content/);
  const control = opened.match(/aria-controls="([^"]+)"/)[1]; assert.ok(opened.includes(`id="${control}"`));
  assert.match(html(Core.CdsBanner, { ...props, defaultDetailsOpen: true, detailsOpen: false }), /aria-expanded="false"/);
});

test("Banner detail callbacks, controlled state, dismiss and link handlers stay original", () => {
  const changed = [], clicked = [], onDismiss = (event) => clicked.push(event), onClick = () => clicked.push("link");
  const props = { children: "Notice", details: "Details", onDetailsOpenChange: (value) => changed.push(value), onDismiss, dismissLabel: "Close notice", action: el("a", { href: "/learn", onClick }, "Learn") };
  const f = fixture(Core.CdsBanner, props);
  const root = () => find(f.tree, (n) => typeof n.props?.onOpenChange === "function");
  assert.equal(root().props.open, false); root().props.onOpenChange(true); f.render();
  assert.equal(root().props.open, true); assert.deepEqual(changed, [true]);
  props.detailsOpen = false; f.render(); root().props.onOpenChange(true); f.render();
  assert.equal(root().props.open, false); assert.deepEqual(changed, [true, true]);
  const dismiss = find(f.tree, (n) => n.props?.icon === "X");
  assert.equal(dismiss.type, Core.CdsButton); assert.equal(dismiss.props["aria-label"], "Close notice");
  const event = {}; dismiss.props.onClick(event); assert.equal(clicked[0], event);
  find(f.tree, (n) => n.type === "a").props.onClick(); assert.equal(clicked[1], "link");
});

test("Banner original ResizeObserver switches calibrated actions between inline, stacked and wrapped", (t) => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "getComputedStyle"), observers = [];
  globalThis.getComputedStyle = () => ({ lineHeight: "20px" });
  t.after(() => { if (prior) Object.defineProperty(globalThis, "getComputedStyle", prior); else delete globalThis.getComputedStyle; });
  class RO { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } }
  let actionTop = 30;
  const props = { children: "Long notice", action: el("a", { href: "#review" }, "Review"), composerCalibration: true };
  const f = fixture(Core.CdsBanner, props, new Map(), { effects: true });
  assert.equal(f.tree.props["data-cta-layout"], "inline");
  const root = { offsetWidth: 320, ownerDocument: { defaultView: { ResizeObserver: RO } } };
  f.tree.props.ref.current = root;
  find(f.tree, (n) => n.props?.ref && n.props?.className === "max-w-full min-w-0 flex-auto").props.ref.current = { getBoundingClientRect: () => ({ top: 0, bottom: 20, height: 20 }) };
  find(f.tree, (n) => n.type === "span" && n.props?.ref).props.ref.current = { getBoundingClientRect: () => ({ top: actionTop }) };
  f.flushEffects(); f.render();
  assert.equal(f.tree.props["data-cta-layout"], "stacked");
  f.flushEffects(); root.offsetWidth = 1000; actionTop = 0; observers.at(-1).callback(); f.render();
  assert.equal(f.tree.props["data-cta-layout"], "inline");
  f.flushEffects(); props.composerCalibration = false; actionTop = 30; f.render(); f.flushEffects(); f.render();
  assert.equal(f.tree.props["data-cta-layout"], "wrapped");
  f.unmount(); assert.ok(observers.every((o) => o.disconnected));
});

// ---------------------------------------------------------------------------------------------
// navigation lane (Tabs Ar / TextLink Lg) on the merged graph
// ---------------------------------------------------------------------------------------------
test("Tabs namespace keeps all four source members and SSR selection/ARIA/panel attributes", () => {
  assert.deepEqual(Object.keys(Tabs), ["Root", "List", "Tab", "Panel"]);
  const s = renderToStaticMarkup(el(Tabs.Root, { value: "second", orientation: "vertical" },
    el(Tabs.List, { "aria-label": "Sections" }, el(Tabs.Tab, { value: "first" }, "First"), el(Tabs.Tab, { value: "second" }, "Second"), el(Tabs.Tab, { value: "disabled", disabled: true }, "Disabled")),
    el(Tabs.Panel, { value: "second" }, "Second panel")));
  assert.match(s, /data-cds="Tabs"/); assert.match(s, /role="tablist"/); assert.match(s, /aria-orientation="vertical"/);
  assert.match(s, /aria-selected="false"[^>]*>First/); assert.match(s, /aria-selected="true"[^>]*>Second/);
  assert.match(s, /aria-disabled="true"/); assert.match(s, /role="tabpanel"/); assert.match(s, /Second panel/);
});

test("TextLink SSR keeps native href/target/rel/download/ARIA, external note, color Context and render branches", () => {
  const s = html(Core.CdsTextLink, { href: "https://example.test/report", external: "with-icon", target: "_blank", rel: "opener author", "aria-describedby": "caller-note", download: "report.txt", children: "Report" });
  assert.match(s, /<a /); assert.match(s, /data-cds="TextLink"/); assert.match(s, /rel="author noopener"/);
  assert.match(s, /download="report.txt"/); assert.match(s, /aria-describedby="caller-note [^"]+"/); assert.match(s, /data-cds="Icon"/);
  assert.match(renderToStaticMarkup(el(Core.Qd.Provider, { value: true }, el(Core.CdsTextLink, { href: "/report" }, "Report"))), /data-inherit-color=""/);
  const action = html(Core.CdsTextLink, { disabled: true, children: "Unavailable" });
  assert.match(action, /<span/); assert.match(action, /aria-disabled="true"/);
  const custom = html(Core.CdsTextLink, { href: "/unused", render: el("button", { "data-custom": "yes" }), children: "Custom" });
  assert.match(custom, /<button/); assert.doesNotMatch(custom, /href=/);
});

// ---------------------------------------------------------------------------------------------
// One CdsRoot, the twelve wave-1 roots (wave-2 / wave-3 roots: see the tests above and below), one set of Context instances
// ---------------------------------------------------------------------------------------------
// Record every Context read by the real server dispatcher (useContext / use). Reads are matched
// by object identity against the shared-frame and vendor-frame module exports.
function traceContexts(render) {
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const reads = [], original = internals.H;
  let current = original;
  const wrap = (d) => d && {
    ...d,
    useContext(c) { const v = d.useContext(c); reads.push([c, v]); return v; },
    use(u) { const v = d.use(u); if (u?.$$typeof === Symbol.for("react.context")) reads.push([u, v]); return v; },
  };
  Object.defineProperty(internals, "H", { configurable: true, enumerable: true, get: () => current, set: (d) => { current = d && wrap(d); } });
  try { return { result: render(), reads }; } finally {
    delete internals.H; internals.H = original;
  }
}
const contextName = () => {
  const names = new Map();
  for (const [k, v] of Object.entries(Core)) if (v?.$$typeof === Symbol.for("react.context")) names.set(v, k);
  for (const [k, v] of Object.entries(Vendor)) if (v?.$$typeof === Symbol.for("react.context")) names.set(v, `vendor.${k}`);
  return names;
};

test("one CdsRoot provides density, locale, labels, router and direction to Field, Banner, Page, Tabs and TextLink through the shared-frame owner", () => {
  const names = contextName();
  const navigations = [], labelKeys = [];
  const router = { resolveHref: (href) => `/local${href}`, navigate: (href, options) => navigations.push([href, options]) };
  const labels = (key, fallback) => { labelKeys.push(key); return `译:${key}`; };
  const rootProps = { density: "compact", locale: " zh-TW ", labels, router, direction: "rtl" };
  const samples = {
    TextInputField: el(Core.CdsTextInputField, { label: "Name", clearable: true, defaultValue: "x" }),
    TextAreaField: el(Core.CdsTextAreaField, { label: "Notes", defaultValue: "y" }),
    Banner: el(Core.CdsBanner, { children: "Notice", onDismiss() {} }),
    Page: el(Page, { title: "Page", children: "Body" }),
    Tabs: el(Tabs.Root, { defaultValue: "a" }, el(Tabs.List, null, el(Tabs.Tab, { value: "a" }, "A"), el(Tabs.Tab, { value: "b" }, "B")), el(Tabs.Panel, { value: "a" }, "Panel A")),
    TextLink: el(Core.CdsTextLink, { href: "/docs", external: "with-icon", children: "Docs" }),
  };
  // Root's own reads (its parents) form a fixed prefix; what follows belongs to the child subtree.
  const prefix = traceContexts(() => renderToStaticMarkup(el(Core.CdsRoot, rootProps, null))).reads.map(([c]) => c);
  const matrix = {};
  for (const [name, child] of Object.entries(samples)) {
    const { reads } = traceContexts(() => renderToStaticMarkup(el(Core.CdsRoot, rootProps, child)));
    prefix.forEach((c, i) => assert.equal(reads[i][0], c, `${name} root prefix`));
    const own = reads.slice(prefix.length);
    // Contexts are matched by object identity with the owner's exports; internal Contexts that
    // no other module imports (e.g. Base UI field parts) stay unnamed here.
    matrix[name] = Object.fromEntries(own.filter(([c]) => names.has(c)).map(([c, v]) => [names.get(c), v]));
  }
  // density (Da), labels (ui), router (Ci): Field (via its original clear Button), Banner, TextLink.
  for (const name of ["TextInputField", "Banner", "TextLink"]) {
    assert.equal(matrix[name].Da, "compact", name);
    assert.equal(matrix[name].ui, labels, name);
    assert.equal(matrix[name].Ci, router, name);
  }
  // direction: Tabs reads Base UI's direction Context that Root fills from `direction`.
  assert.deepEqual(matrix.Tabs["vendor.Yn"], { direction: "rtl" });
  // Page reads the layout parts Context rr (undefined without experimental.fizzyLake).
  assert.ok("rr" in matrix.Page); assert.equal(matrix.Page.rr, undefined);
  // Root's official rule: fizzyLake "panels" fills rr and forces comfortable density unless
  // experimental.densityOverride is set; Page and Banner read both from the same owner.
  const panels = traceContexts(() => renderToStaticMarkup(el(Core.CdsRoot, { ...rootProps, experimental: { fizzyLake: { parts: ["panels"] } } }, el(Page, { title: "P", banner: samples.Banner }))));
  const panelReads = panels.reads.slice(prefix.length).filter(([c]) => c === Core.rr || c === Core.Da).map(([c, v]) => [names.get(c), v]);
  assert.deepEqual([...new Set(panelReads.map(([n, v]) => `${n}=${v}`))].sort(), ["Da=comfortable", "rr=panels"]);
  assert.match(panels.result, /data-cds-part="level-mark"/); assert.match(panels.result, /!py-lg/);
  // locale: Root trims it into Wa; no selected root reads Wa (only nested Roots do).
  for (const name of Object.keys(samples)) assert.ok(!("Wa" in matrix[name]), name);
  // Since wave 4 (cds-wave4/states) the Base UI form / field Contexts TextAreaField reads are published module states,
  // so they now carry a name here; still the vendor-frame instances, read once each.
  assert.deepEqual(Object.keys(matrix.TextAreaField), ["vendor.Wm", "vendor.Hm", "vendor.Bm", "vendor.Rm", "vendor.uh", "nw"]);

  // The twelve wave-1 roots under one Root, rendered once (wave-3 roots: "wave 3: one CdsRoot" test).
  let seen;
  function Probe() {
    seen = Object.fromEntries(["Da", "Wa", "Ci", "ui", "rr", "hm"].map((n) => [n, React.useContext(Core[n])]));
    seen.direction = React.useContext(Vendor.Yn)?.direction;
    return null;
  }
  const markup = renderToStaticMarkup(el(Core.CdsRoot, rootProps,
    el(Core.CdsTooltipProvider, { delay: 0 },
      el(Probe),
      el(Page, { title: "Workspace", tabs: samples.Tabs, banner: samples.Banner, actions: el(Core.CdsButton, { href: "/new", icon: "Add", tooltip: "New" }, "New") },
        samples.TextInputField, samples.TextAreaField, samples.TextLink,
        el(Core.CdsBadge, { onRemove() {}, children: "Tag" }), el(Core.CdsSpinner, { inheritColor: true }), el(Core.CdsIcon, { name: "Add", alt: "Add" })))));
  assert.deepEqual({ ...seen, ui: seen.ui === labels, Ci: seen.Ci === router }, { Da: "compact", Wa: "zh-TW", Ci: true, ui: true, rr: undefined, hm: 0, direction: "rtl" });
  for (const cds of ["Page", "PageHeader", "Tabs", "Banner", "Field", "TextInput", "TextArea", "TextLink", "Button", "Badge", "Spinner", "Icon"])
    assert.match(markup, new RegExp(`data-cds="${cds}"`), cds);
  assert.match(markup, /data-density="compact"/);
  assert.match(markup, /href="\/local\/docs"/); assert.match(markup, /href="\/local\/new"/);
  assert.match(markup, /aria-label="译:dismiss"/); assert.match(markup, /译:opensInNewTab/);
  assert.ok(labelKeys.includes("dismiss") && labelKeys.includes("opensInNewTab"));
});

test("a nested Root overrides density, router, labels and direction for the merged roots it wraps", () => {
  const outer = { navigate() {}, resolveHref: (h) => `/outer${h}` }, inner = { navigate() {}, resolveHref: (h) => `/inner${h}` };
  const names = contextName();
  const { reads } = traceContexts(() => renderToStaticMarkup(el(Core.CdsRoot, { density: "compact", router: outer, direction: "rtl", labels: () => "outer" },
    el(Core.CdsRoot, { density: "comfortable", router: inner, direction: "ltr", labels: (k) => (k === "dismiss" ? "inner" : undefined) },
      el(Core.CdsBanner, { children: "N", onDismiss() {} }), el(Core.CdsTextLink, { href: "/x" }, "x"),
      el(Tabs.Root, { defaultValue: "a" }, el(Tabs.List, null, el(Tabs.Tab, { value: "a" }, "A")))))));
  const last = (n) => reads.filter(([c]) => names.get(c) === n).at(-1)?.[1];
  assert.equal(last("Da"), "comfortable"); assert.equal(last("Ci"), inner);
  assert.deepEqual(last("vendor.Yn"), { direction: "ltr" });
  const markup = renderToStaticMarkup(el(Core.CdsRoot, { density: "compact", router: outer, labels: () => "outer" },
    el(Core.CdsRoot, { density: "comfortable", router: inner, labels: (k) => (k === "dismiss" ? "inner" : undefined) },
      el(Core.CdsBanner, { children: "N", onDismiss() {} }), el(Core.CdsTextLink, { href: "/x" }, "x"))));
  assert.match(markup, /aria-label="inner"/); assert.match(markup, /href="\/inner\/x"/); assert.match(markup, /data-step="3"/);
});

// ---------------------------------------------------------------------------------------------
// Wave 2 on the merged graph: the lanes' key SSR assertions (overlays, menus, dialogs, form-controls, display) run
// against the one owner, with Contexts and shared parts (Button, Tooltip, labels) taken from that same owner.
// ---------------------------------------------------------------------------------------------
const render = (C, props, ...children) => renderToStaticMarkup(el(C, props, ...children));
const within = (context, value, node) => renderToStaticMarkup(el(context.Provider, { value }, node));

test("overlays: Tooltip / OverflowTooltip SSR and the provider is the merged CdsTooltipProvider", () => {
  const closed = render(Core.CdsTooltip, { content: "Tip" }, el("button", { type: "button" }, "Trigger"));
  assert.match(closed, /^<button type="button" id="[^"]+" data-base-ui-tooltip-trigger="">Trigger<\/button>$/);
  const open = render(Core.CdsTooltip, { content: "Tip", open: true }, el("button", null, "Trigger"));
  assert.match(open, /data-popup-open=""/); assert.doesNotMatch(open, /role="tooltip"/);
  assert.match(render(Core.CdsTooltipProvider, { delay: 50 }, el(Core.CdsTooltip, { content: "Tip" }, el("span", null, "x"))), /data-base-ui-tooltip-trigger/);
  const s = render(Core.CdsOverflowTooltip, { className: "caller", dir: "rtl", "data-testid": "o", title: "t" }, "Long");
  assert.match(s, /^<span /); assert.match(s, /data-cds="OverflowTooltip"/);
  assert.match(s, /class="block min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap caller"/);
  for (const p of [/dir="rtl"/, /data-testid="o"/, /title="t"/, /data-base-ui-tooltip-trigger/]) assert.match(s, p);
});

test("overlays: LayerProvider / useCdsLayerAwareZIndex nesting and owner-window hooks read the same Contexts", () => {
  function Z({ o }) { return String(Core.useCdsLayerAwareZIndex(o)); }
  assert.equal(render(Core.CdsLayerProvider, { render: el("div", { style: { color: "red" } }) }, el(Core.CdsLayerProvider, { render: el("section") }, "x")),
    '<div style="color:red;z-index:100;--cds-layer-base:100" data-cds="CdsLayer"><section data-cds="CdsLayer" style="z-index:200;--cds-layer-base:200">x</section></div>');
  assert.equal(render(Core.CdsLayerProvider, { base: 300 }, el(Z, { o: 5 })), "305");
  assert.equal(within(Core.vd, 40, el(Z, { o: 1 })), "41");
  function W() { const w = Core.useCdsOwnerWindow(), a = Core.useCdsOwnerWindowAnchor(); return `${w?.name}:${a?.id}`; }
  assert.equal(within(Core.Ga, { id: "anchor", ownerDocument: { defaultView: { name: "frame" } } }, el(W)), "frame:anchor");
});

test("overlays: Popover keeps ten official members (Header/Tail new) and SSR trigger ARIA", () => {
  const P = Core.CdsPopover;
  assert.deepEqual(Object.keys(P), ["Root", "Trigger", "Popup", "Header", "Title", "Description", "Close", "Arrow", "Tail", "createHandle"]);
  const s = render(P.Root, null, el(P.Trigger, { "data-x": "1" }, "Open"));
  assert.match(s, /^<button type="button"/); assert.match(s, /aria-haspopup="dialog"/); assert.match(s, /aria-expanded="false"/); assert.match(s, /data-x="1"/);
  assert.equal(typeof P.createHandle, "function");
});

test("menus: Dropdown / ContextMenu namespaces share parts, class roots and SSR triggers use the merged Button", () => {
  const D = Core.CdsDropdown, C = Core.CdsContextMenu;
  assert.deepEqual(Object.keys(D), ["Root", "Bar", "Trigger", "TriggerButton", "Popup", "Item", "Separator", "Group", "GroupLabel", "Header", "Submenu", "SubmenuTrigger", "SearchablePopup", "PendingList"]);
  assert.deepEqual(Object.keys(C), ["Root", "Trigger", "Popup", "Item", "Separator", "Group", "Header", "Submenu", "SubmenuTrigger", "SubmenuPopup"]);
  for (const k of ["Item", "Separator", "Group", "Header", "Submenu", "SubmenuTrigger"]) assert.equal(C[k], D[k], k);
  assert.equal(C.SubmenuPopup, D.Popup);
  assert.equal(Core.cdsDropdownGroupLabelClass, "compact:px-2 comfortable:px-2.5 py-1 text-footnote font-medium text-muted");
  assert.match(Core.cdsMenuItemClass({ variant: "danger" }), /group\/menu-danger text-danger/);
  const items = render(D, { label: "Options", items: [{ label: "Rename" }] });
  assert.match(items, /^<button type="button" data-cds="Button"/); assert.match(items, /aria-haspopup="menu"/); assert.doesNotMatch(items, /Rename/);
  const ctx = render(D, { trigger: "context-menu", items: [{ label: "Inspect" }] }, el("div", { id: "area" }, "Area"));
  assert.match(ctx, /<div id="area">Area<\/div>/); assert.doesNotMatch(ctx, /<button/);
  assert.equal(render(D, { trigger: "context-menu", disabled: true, className: "x", items: [] }, "Area"), '<div data-disabled="" class="x">Area</div>');
  const split = render(Core.CdsSplitDropdownButton, { label: "Run", items: [{ label: "Run all" }], onPrimaryClick() {} });
  assert.match(split, /^<div data-cds="SplitDropdownButton" role="group" aria-label="Run"/);
  const buttons = [...split.matchAll(/<button [^>]*>/g)].map((x) => x[0]);
  assert.equal(buttons.length, 2); assert.match(buttons[1], /aria-label="More options"/);
});

test("dialogs: Dialog / AlertDialog share parts, ConfirmationDialog is a function, portaled popups stay off the server", () => {
  const D = Core.CdsDialog, A = Core.CdsAlertDialog;
  assert.deepEqual(Object.keys(D), ["Root", "Trigger", "Popup", "Backdrop", "Header", "Title", "Description", "Footer", "Close", "CloseButton"]);
  assert.deepEqual(Object.keys(A), [...Object.keys(D), "createHandle"]);
  for (const part of ["Popup", "Backdrop", "Header", "Title", "Description", "Footer", "Close", "CloseButton"]) assert.equal(D[part], A[part], part);
  assert.notEqual(D.Root, A.Root);
  const dialog = render(D.Root, null, el(D.Trigger, { "data-testid": "t" }, "Open"), el(D.Popup, null, el(D.Header, { description: "D" }, "Title")));
  assert.match(dialog, /^<button type="button"[^>]*aria-haspopup="dialog"[^>]*aria-expanded="false"[^>]*>Open<\/button>$/);
  assert.equal(render(D.Root, { open: true }, el(D.Popup, null, el(D.Title, null, "Hidden on server"))), "");
  assert.equal(render(Core.CdsConfirmationDialog, { open: true, onOpenChange() {}, title: "Delete?", onConfirm() {} }), "");
});

const fruits = [{ value: "a", label: "Apple" }, { value: "b", label: "Banana" }];
test("form-controls: TextInput / TextArea / Checkbox / CheckboxRow SSR on the merged owner", () => {
  const input = render(Core.CdsTextInput, { defaultValue: "abc", clearable: true, slotStart: "S", placeholder: "Find", name: "q", "data-probe": "x" });
  for (const p of [/data-cds="TextInput"/, /<input[^>]*placeholder="Find"/, /name="q"/, /value="abc"/, /aria-label="Clear"/, /data-probe="x"/]) assert.match(input, p);
  assert.match(input, new RegExp(`aria-label="Clear"[\\s\\S]*data-cds="Icon"[^>]*>${String.fromCodePoint(57615)}<`));
  assert.doesNotMatch(render(Core.CdsTextInput, { defaultValue: "abc", clearable: true, disabled: true }), /aria-label="Clear"/);
  const area = render(Core.CdsTextArea, { rows: 4, autosize: true, resize: "y", defaultValue: "x" });
  for (const p of [/<textarea data-cds="TextArea" rows="4"/, /\[field-sizing:content\]/, /resize-y/, /--cds-textarea-rows:4/]) assert.match(area, p);
  const box = render(Core.CdsCheckbox, { label: "Agree", description: "More", defaultChecked: true });
  for (const p of [/role="checkbox"/, /aria-checked="true"/, /data-cds="Checkbox"/, />Agree</, />More</]) assert.match(box, p);
  assert.match(render(Core.CdsCheckboxIndicator, { checked: true }), /^<span data-checked=""/);
  assert.equal(Core.cdsCheckboxTopAlignClass, "mt-[calc((1lh_-_var(--cds-checkbox,1rem))_/_2)]");
  const row = render(Row.CdsCheckboxRow, { label: "Row", description: "Explain", error: "Bad", disabled: true });
  for (const p of [/data-cds="Field"/, /<label[^>]*group\/cb items-start self-start cursor-default/, />Explain</, />Bad</]) assert.match(row, p);
  assert.match(render(Row.CdsCheckboxRow, { label: "Row", reserveErrorLines: 2 }), /aria-hidden="true"[^>]*style="min-height:2lh"/);
});

test("form-controls: RadioGroup / SegmentedControl / Field parts / Combobox SSR on the merged owner", () => {
  const radio = render(Core.CdsRadioGroup, { name: "plan", defaultValue: "b", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }, { value: "c", label: "C", disabled: true }] });
  assert.match(radio, /role="radiogroup" data-cds="RadioGroup"/); assert.equal((radio.match(/role="radio"/g) ?? []).length, 3);
  const cards = render(Core.CdsRadioGroup.Root, { defaultValue: "x" }, el(Core.CdsRadioGroup.Card, { value: "x", label: "Card", description: "Cd", trailing: "T" }));
  assert.match(cards, /data-cds-part="card-trailing"/);
  assert.equal(cards.match(/aria-describedby="([^"]+)"/)[1].split(" ").length, 2);
  const seg = render(Core.CdsSegmentedControl, { "aria-label": "Range", value: "w", onChange() {}, segments: [{ value: "d", label: "Day" }, { value: "w", label: "Week" }] });
  assert.match(seg, /role="radiogroup" data-cds="SegmentedControl" aria-label="Range"/);
  const field = render(Core.CdsField, { invalid: true }, el(Core.CdsFieldLabel, null, "Name"), el(Core.CdsTextInput, {}), el(Core.CdsFieldDescription, null, "Desc"), el(Core.CdsFieldError, { match: true }, "Required"));
  assert.match(field, /^<div data-invalid="" data-cds="Field" class="flex flex-col gap-xs font-sans"/);
  assert.match(field, new RegExp(`class="mt-px shrink-0" aria-hidden="true">${String.fromCodePoint(57610)}</span>`));
  const controlId = field.match(/<input[^>]* id="([^"]+)"/)[1]; assert.match(field, new RegExp(`<label[^>]*for="${controlId}"`));
  const combo = render(Core.CdsCombobox, { items: fruits, defaultValue: "b", "aria-label": "Fruit" });
  for (const p of [/data-cds="Combobox"/, /role="combobox"/, /aria-expanded="false"/, />Banana<\/span>/]) assert.match(combo, p);
  const cf = render(Core.CdsComboboxField, { label: "Fruit", hint: "Pick", error: "Bad", items: fruits, placeholder: "Choose" });
  for (const p of [/data-cds="Field"/, /aria-invalid="true"/, />Pick</, />Bad</]) assert.match(cf, p);
  assert.match(render(Core.CdsComboboxField, { label: "Fruit", reserveErrorLines: 1, items: fruits }), /aria-hidden="true"[^>]*style="min-height:1lh"/);
  // TextInputField (wave 1) and TextInput (wave 2) render the same official ww control from one owner.
  assert.equal(render(Core.CdsTextInputField, { label: "L", defaultValue: "v" }).match(/data-cds="TextInput"/g).length, 1);
});

test("display: Shimmer / Skeleton / Surface / Card / Collapsible / ButtonGroup SSR with the owner's Contexts", () => {
  assert.match(render(Core.CdsShimmer, { "data-testid": "s" }, "Thinking"), /^<span data-testid="s" data-cds="ShimmerText" data-shimmering="true"/);
  assert.match(render(Core.CdsSkeleton, { width: 80, height: 12 }), /<span class="sr-only">Loading<\/span><\/div>$/);
  assert.match(within(Core.ui, (key, fallback) => (key === "loading" ? "加载中" : fallback), el(Core.CdsSkeleton)), /<span class="sr-only">加载中<\/span>/);
  assert.match(within(Core.tf, "span", el(Core.CdsSkeleton.Lines, { lines: 2 })), /^<span class="flex flex-col gap-sm">/);
  assert.equal(within(Core.ef, true, el(Core.CdsSkeleton, { width: 10 })), '<div data-cds="Skeleton" class="h-[1em] max-w-full rounded bg-[var(--cds-skeleton-base)]" style="width:10px"></div>');
  const seen = [];
  const Probe = () => { seen.push(React.useContext(Core.Ua)); return null; };
  const surface = render(Core.CdsSurface, { elevation: "popover", className: "probe" }, el(Probe));
  assert.ok(surface.includes(`class="${Core.cdsSurfaceClass("popover")} probe"`)); assert.deepEqual(seen, ["surface-3"]);
  assert.equal(Core.cdsSurfaceClass("panel"), "rounded-card bg-surface-2 shadow-panel-sm forced-colors:border forced-colors:border-solid forced-colors:border-[color:CanvasText]");
  assert.notEqual(render(Core.CdsCard, { outlined: true }, "x"), render(Core.CdsCard, {}, "x"));
  assert.match(render(Core.CdsCard, null, el(Core.CdsCard.Link, { href: "/inside" }, "Open")), /<a data-cds="CardLink" href="\/inside"/);
  const C = Core.CdsCollapsible;
  assert.deepEqual(Object.keys(C), ["Root", "Trigger", "Panel"]);
  const open = render(C.Root, { defaultOpen: true }, el(C.Trigger, null, "More"), el(C.Panel, null, "Body"));
  assert.match(open, /^<div data-open="" data-cds="Collapsible">/); assert.match(open, /aria-expanded="true"/); assert.match(open, />Body<\/div>/);
  // 4.16336.0 Trigger caret: CaretRightFilled (apiChanges), resolved through the merged Icon glyph table.
  assert.match(open, /data-cds="Icon"[^>]*group-data-\[panel-open\]\/clp:rotate-90/);
  assert.match(render(Core.CdsButtonGroup, null, el("button", null, "A"), el("button", null, "B")), /data-cds="ButtonGroup" role="group"/);
});

test("display: Avatar / Counter / Pulse / Shortcut / reasons / RelativeTime / Pictogram / cdsClassNames SSR", () => {
  assert.match(render(Core.CdsAvatar, { name: "Ada Lovelace" }), /role="img" aria-label="Ada Lovelace">AL<\/span>$/);
  assert.match(within(Core.LN, { size: "lg" }, el(Core.CdsAvatar, { name: "Ada", size: "xs" })), /size-\[var\(--cds-avatar-lg\)\]/);
  assert.equal(render(Core.CdsCounter, { value: 0 }), "");
  assert.match(render(Core.CdsCounter, { value: 120 }), />99\+<\/span>$/);
  assert.match(render(Core.CdsPulse, { color: "red", animate: false }), /forced-colors:!bg-\[color:CanvasText\]/);
  assert.equal((render(Core.CdsShortcut, { keys: "mod+k" }).match(/<kbd /g) ?? []).length, 2);
  assert.match(within(Core.ui, (key, fallback) => (key === "sequenceThen" ? "然后" : fallback), el(Core.CdsShortcut, { keys: "mod+k then g" })), />然后<\/span>/);
  assert.equal(render(Core.CdsHiddenReasonText, { id: "r", reason: "Not allowed" }), '<span id="r" hidden="" data-cds-disabled-reason="">Not allowed</span>');
  const wrapped = render(Core.CdsDisabledReason, { reason: "Needs login" }, el("button", { disabled: true }, "Go"));
  assert.ok(wrapped.includes(`<span id="${wrapped.match(/aria-describedby="([^"]+)"/)[1]}" hidden="" data-cds-disabled-reason="">Needs login</span>`));
  const date = new Date("2026-01-02T03:04:05.000Z");
  assert.match(render(S2.CdsRelativeTime, { date, locale: "en-US" }), /^<time data-cds="RelativeTime" dateTime="2026-01-02T03:04:05.000Z"[^>]*>just now<\/time>$/);
  assert.match(render(S2.CdsRelativeTime, { date, justNowLabel: "right now", sentenceCase: true }), />Right now<\/time>$/);
  assert.equal(P183.CdsPictogram.isCdsPictogram, true);
  assert.match(render(P183.CdsPictogram, { asset: { name: "Probe", line: ["M0 0"], highlight: ["M1 1"] }, highlightFill: "cactus", alt: "P" }),
    /^<svg data-cds="Pictogram" width="96" height="96"[^>]*role="img" aria-label="P">[\s\S]*fill-pictogram-highlight-cactus/);
  assert.equal(Core.cdsClassNames("p-2", "p-4", false, null, { a: true, b: false }, ["c"]), "p-4 a c");
});

// One owner for wave 1 and wave 2: under one CdsRoot the wave-2 roots read the same density / labels / router / direction
// Contexts as the wave-1 roots (matched by object identity on the real server dispatcher), and ButtonGroup / Dropdown /
// TextInput render through the single CdsButton / CdsIcon of the graph.
test("one CdsRoot provides the same Context instances to wave-2 roots; shared parts are the owner's Button and Icon", () => {
  const names = contextName();
  const router = { resolveHref: (href) => `/local${href}`, navigate() {} };
  const labels = (key, fallback) => (key === "clear" ? "清除" : key === "loading" ? "加载中" : fallback);
  const rootProps = { density: "compact", labels, router, direction: "rtl" };
  const prefix = traceContexts(() => renderToStaticMarkup(el(Core.CdsRoot, rootProps, null))).reads.map(([c]) => c);
  const read = (child) => {
    const { reads, result } = traceContexts(() => renderToStaticMarkup(el(Core.CdsRoot, rootProps, child)));
    prefix.forEach((c, i) => assert.equal(reads[i][0], c));
    return { result, ctx: Object.fromEntries(reads.slice(prefix.length).filter(([c]) => names.has(c)).map(([c, v]) => [names.get(c), v])) };
  };
  const input = read(el(Core.CdsTextInput, { clearable: true, defaultValue: "x" }));
  assert.equal(input.ctx.ui, labels); assert.equal(input.ctx.Da, "compact"); assert.match(input.result, /aria-label="清除"/);
  const skeleton = read(el(Core.CdsSkeleton));
  assert.equal(skeleton.ctx.ui, labels); assert.match(skeleton.result, />加载中</);
  const dropdown = read(el(Core.CdsDropdown, { label: "Options", items: [] }));
  assert.equal(dropdown.ctx.Da, "compact"); assert.match(dropdown.result, /data-cds="Button"[^>]*data-density="compact"|data-density="compact"[\s\S]*data-cds="Button"/);
  const segmented = read(el(Core.CdsSegmentedControl, { "aria-label": "R", value: "a", onChange() {}, segments: [{ value: "a", label: "A" }, { value: "b", label: "B" }] }));
  assert.deepEqual(segmented.ctx["vendor.Yn"], { direction: "rtl" });
  const card = read(el(Core.CdsCard, null, el(Core.CdsCard.Link, { href: "/docs" }, "Docs")));
  assert.equal(card.ctx.Ci, router); assert.match(card.result, /href="\/local\/docs"/);
  // ButtonGroup and SplitDropdownButton render the one CdsButton element type of the graph (no second Button).
  const f = fixture(Core.CdsSplitDropdownButton, { label: "Run", items: [{ label: "All" }], onPrimaryClick() {} });
  assert.ok(find(f.tree, (n) => n.type === Core.CdsButton), "SplitDropdownButton primary is the owner's CdsButton");
});

// ---------------------------------------------------------------------------------------------
// wave 3: cds-wave3-final (ViewTabBar family, Sessions row parts, helpers) and cds-surface-additions on the merged graph
// (ported from analysis/.../cds-wave3-final/cds-wave3-final.test.mjs and cds-surface-additions/surface-additions.test.mjs)
// ---------------------------------------------------------------------------------------------
const noop = () => {};
// Runs a hook during a real server render and returns its value.
function hookValue(hook, wrap = (n) => n) {
  let value;
  const Probe = () => { value = hook(); return null; };
  renderToStaticMarkup(wrap(el(Probe)));
  return value;
}
// What SourceViewTabBar (app/src/source-view-tabs.jsx) provides: a direction object and a density string, here through
// the merged owner's own Context objects.
const vtHost = (direction, density, node) => el(Vendor.Yn.Provider, { value: { direction } }, el(Core.Da.Provider, { value: density }, node));
const tabPair = [{ id: "a", label: "א", closable: true }, { id: "b", label: "B", closable: false }];

test("wave 3: ViewTabBar SSR with the host fixture tabs: tablist, RTL, density-selected sizing table", () => {
  const props = { tabs: tabPair, activeId: "a", onActivate: noop, onClose: noop, "aria-label": "Side chat tabs" };
  const compact = renderToStaticMarkup(vtHost("rtl", "compact", el(VT.ViewTabBar, props)));
  assert.match(compact, /role="tablist" aria-label="Side chat tabs"/);
  assert.equal((compact.match(/role="tab"/g) ?? []).length, 2);
  assert.match(compact, /data-vtb-id="a" data-selected="true"/);
  assert.ok(compact.includes("א"));
  assert.ok(compact.includes(VT.viewTabSizes.floorClass), "compact density keeps the base table (me)");
  const comfortable = renderToStaticMarkup(vtHost("ltr", "comfortable", el(VT.ViewTabBar, props)));
  assert.ok(comfortable.includes("min-w-[calc(var(--cds-icon)_+_2*var(--cds-pad-md))]"), "comfortable density uses the new table");
  assert.ok(!comfortable.includes(VT.viewTabSizes.floorClass));
  assert.equal(VT.viewTabLabels.newTab, "New tab");
  assert.equal(VT.viewTabLabels.openInBrowser, "Open in default browser");
  assert.equal(typeof VT.useViewTabOverflow, "function");
  for (const part of ["ViewTab", "ViewTabOverflowItem", "ViewTabOverflowMenu"]) assert.ok(["function", "object"].includes(typeof VT[part]) && VT[part] !== null, part);
});

test("wave 3: useViewTabIconSize reads the cd9e4c7f2 Context (\"xs\" default, provider override) ViewTabBar imports", () => {
  const Probe = () => el("i", null, VTI.useViewTabIconSize());
  assert.equal(renderToStaticMarkup(el(Probe)), "<i>xs</i>");
  assert.equal(renderToStaticMarkup(el(VTI.n.Provider, { value: "md" }, el(Probe))), "<i>md</i>");
  assert.equal(VTI.n.$$typeof, Symbol.for("react.context"));
});

test("wave 3: Sessions row parts SSR with fixture rows", () => {
  const row = renderToStaticMarkup(vtHost("rtl", "compact", el(SR.SessionsRowLayout, { leading: el("i"), title: "Fixture session", titleAccessories: el("b"), subline: "sub", rail: el("u") })));
  assert.match(row, /<span dir="auto" class="min-w-0 truncate text-body text-primary \[text-align:-webkit-match-parent\]/);
  assert.match(renderToStaticMarkup(vtHost("ltr", "compact", el(SR.SessionsRowLayout, { title: "T" }))), /<span class="min-w-0 truncate text-body text-primary">T<\/span>/);
  assert.equal(render(SR.SessionsDateLayout, { className: "x" }, "today"), '<span class="flex-shrink-0 text-body text-muted first-letter:capitalize x">today</span>');
  assert.match(render(SA.SessionsActionsRail, null, "rail"), /^<div class="absolute inset-y-0 end-0 z-10 [^"]*group-data-\[selection-mode\]\/table:hidden">rail<\/div>$/);
  const matches = SM.findSessionTitleMatch("Fixture Session", "session");
  assert.deepEqual(matches, [{ start: 8, end: 15 }]);
  assert.equal(SM.findSessionTitleMatch("Fixture", ""), undefined);
  assert.equal(render(SH.SessionsHighlight, { text: "Fixture Session", matches }), '<span>Fixture </span><mark class="bg-accent text-inherit rounded-sm">Session</mark>');
  const more = render(SR.SessionsMoreButton, { "aria-label": "More" });
  assert.match(more, /data-cds="Button" data-cds-icon-only="" data-cds-ghost="" data-size="sm"/);
  assert.match(more, /aria-label="More"/);
});

test("wave 3: helpers: direction, density, platform, props, class names, shortcuts, virtualizer", () => {
  const Probe = () => el("i", null, `${Vendor.useDirection()}|${Core.useCdsDensity()}|${Core.useIsMacPlatform()}`);
  assert.equal(renderToStaticMarkup(el(Probe)), "<i>ltr|comfortable|false</i>");
  assert.equal(renderToStaticMarkup(vtHost("rtl", "compact", el(Probe))), "<i>rtl|compact|false</i>");
  assert.equal(S62.isMacUserAgent(), false, "no window in node");
  assert.equal(Vendor.clsx("a", { b: true, c: false }, ["d"]), "a b d");
  assert.equal(typeof Vendor.mergeProps({ className: "a", onClick: noop }, { className: "b" }).onClick, "function");
  assert.equal(Core.ariaKeyShortcuts("cmd+k", true), "Meta+k");
  assert.equal(Core.ariaKeyShortcuts("cmd+shift+escape", false), "Control+Shift+Escape");
  assert.equal(Core.asElementNode({ nodeType: 1 }).nodeType, 1);
  assert.equal(Core.asElementNode({ nodeType: 3 }), null);
  let size;
  const List = () => { size = Vendor.useVirtualizer({ count: 100, getScrollElement: () => null, estimateSize: () => 20 }).getTotalSize(); return null; };
  renderToStaticMarkup(el(List));
  assert.equal(size, 2000);
});

test("wave 3: GrowthBook boundary answers from the host table through the reviewed adapter", async () => {
  const { HOST_GROWTHBOOK } = await import(pathToFileURL(path.join(pilot, "../../../app/src/host-growthbook.mjs")).href);
  assert.equal(Adapter.hostGrowthBookFeature("__gb__1951358650"), Object.hasOwn(HOST_GROWTHBOOK, "__gb__1951358650") ? HOST_GROWTHBOOK.__gb__1951358650 === true : null);
  assert.equal(Adapter.hostGrowthBookFeature("__gb__3525173228"), true);
  assert.equal(Adapter.hostGrowthBookExperimentValue("__gb__2285377532", false), undefined);
  assert.equal(Adapter.hostGrowthBookExperimentValue("__gb__2285377532", true), undefined);
  assert.equal(renderToStaticMarkup(el(() => String(S1.$3()))), "false");
  const manifest = await json(path.join(output, "manifest.json"));
  assert.deepEqual(manifest.modules.find((m) => m.target === "shared-1.mjs").imports.filter((i) => i.kind === "adapter").map((i) => i.name).sort(),
    ["hostGrowthBookExperimentValue", "hostGrowthBookFeature"]);
});

test("wave 3: useCdsIconSize: explicit size, Button icon-size Context, then ButtonGroup segment size, in the original order", () => {
  const plain = (arg) => hookValue(() => Core.useCdsIconSize(arg));
  const inGroup = (group, arg) => hookValue(() => Core.useCdsIconSize(arg), (n) => el(Core.zu.Provider, { value: group }, n));
  const inButton = (value, arg, group) => hookValue(() => Core.useCdsIconSize(arg), (n) => el(Core.zu.Provider, { value: group ?? null }, el(Core.Ku.Provider, { value }, n)));
  assert.notDeepEqual(plain("xs"), plain("md"));
  assert.deepEqual(plain(), plain("md"));
  assert.deepEqual(inGroup({ size: "xs" }), plain("xs"));
  assert.deepEqual(inGroup({ size: "lg" }), plain("lg"));
  assert.deepEqual(inGroup({}), plain());
  assert.deepEqual(inButton("sm", undefined, { size: "xs" }), inButton("sm"), "the Button Context wins over the group segment");
  assert.notDeepEqual(inButton("sm"), plain());
  assert.deepEqual(inButton("sm", "xs"), plain("xs"), "an explicit size wins over both");
});

test("wave 3: Spark / AnimatedSpark / Switch / InfoTooltip / LoadingSkeleton / Separator / PreviewCard SSR", () => {
  const s = render(Core.CdsSpark, { size: 20, className: "probe" });
  assert.match(s, /^<svg data-cds="Spark" xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 100 100" width="20" height="20" class="[^"]*probe"/);
  assert.match(s, /--cds-spark-size/);
  const idle = render(Core.CdsAnimatedSpark, { size: 20 });
  assert.equal(idle, render(Core.CdsSpark, { size: 20, className: "shrink-0" }));
  assert.equal(render(Core.CdsAnimatedSpark, { size: 20, state: "thinking" }), idle, "sprites load in the browser only");
  const on = render(Core.CdsSwitch, { defaultChecked: true, "aria-label": "Wi-Fi", size: "sm" });
  assert.match(on, /role="switch"/); assert.match(on, /aria-checked="true"/); assert.match(on, /data-cds="Switch"/);
  assert.doesNotMatch(render(Core.CdsSwitch, { "aria-label": "x", disabledReason: "Admin only" }), /Admin only/);
  assert.match(render(Core.CdsSwitch, { "aria-label": "x", disabled: true, disabledReason: "Admin only" }), /data-cds-disabled-reason-wrapper[\s\S]*Admin only/);
  const tip = render(Core.CdsInfoTooltip, { content: "Explains the setting", className: "probe" });
  assert.match(tip, /<button[^>]*data-cds="InfoTip"/); assert.match(tip, /aria-label="More info"/); assert.doesNotMatch(tip, /Explains the setting/);
  assert.match(within(Core.ui, (key, fallback) => (key === "moreInfo" ? "更多信息" : fallback), el(Core.CdsInfoTooltip, { content: "x" })), /aria-label="更多信息"/);
  assert.equal(typeof Core.CdsInfoTooltip.Text, "function", "eN.Text comes from the carried original statement");
  const group = render(Core.CdsLoadingSkeleton, { hold: "none" }, "content");
  assert.match(group, /data-cds="SkeletonGroup"/); assert.match(group, /Loading/);
  const sep = render(SEP.CdsSeparator, { className: "probe" });
  assert.match(sep, /data-cds="Separator"/); assert.match(sep, /role="separator"/);
  assert.match(render(SEP.CdsSeparator, { orientation: "vertical" }), /aria-orientation="vertical"/);
  assert.deepEqual(Object.keys(P183.CdsPreviewCard), ["Root", "Trigger", "Popup"]);
  const card = render(P183.CdsPreviewCard.Root, null, el(P183.CdsPreviewCard.Trigger, { render: el("a", { href: "#p" }, "Project") }), el(P183.CdsPreviewCard.Popup, null, "Preview body"));
  assert.match(card, /<a href="#p"[^>]*>Project<\/a>/); assert.doesNotMatch(card, /Preview body/);
  assert.equal(P183.CdsPictogram.isCdsPictogram, true, "display's carried mark survives the surface lane's omit");
});

test("wave 3: hooks and helpers: owner anchor, deferred tooltip, link props, sanitize, labels, locale, field state, observers", () => {
  assert.equal(hookValue(() => Core.useCdsOwnerAnchor()), undefined);
  const cold = render(Core.CdsDeferredTooltip, { content: "Copy link" }, el("button", { type: "button" }, "Copy"));
  assert.match(cold, /^<button type="button"[^>]*>Copy<\/button>$/); assert.doesNotMatch(cold, /Copy link/);
  const Tooltip = (props) => el("i", { "data-impl": "yes" }, props.content, props.children);
  assert.equal(within(Core.Pl, { Tooltip }, el(Core.CdsDeferredTooltip, { content: "Copy link" }, el("b", null, "Copy"))), '<i data-impl="yes">Copy link<b>Copy</b></i>');
  const router = { resolveHref: (href) => `/app${href}`, navigate: () => {} };
  const inside = hookValue(() => Core.useCdsLinkProps({ href: "/docs", target: "_blank" }), (n) => el(Core.Ci.Provider, { value: router }, n));
  assert.equal(inside.href, "/app/docs"); assert.match(inside.rel, /noopener/);
  for (const ok of ["https://claude.ai/settings", "/relative/path", "#anchor"]) assert.equal(Core.sanitizeCdsHref(ok), ok);
  const warn = console.warn, error = console.error;
  console.warn = () => {}; console.error = () => {};
  try { assert.notEqual(Core.sanitizeCdsHref("javascript:alert(1)"), "javascript:alert(1)"); } finally { console.warn = warn; console.error = error; }
  assert.equal(hookValue(() => Core.useCdsLabel("x", "Fallback {n}", { n: 2 })), "Fallback 2");
  assert.equal(hookValue(() => Core.useCdsLocale(), (n) => el(Core.Wa.Provider, { value: "zh-CN" }, n)), "zh-CN");
  assert.equal(hookValue(() => Core.useCdsFieldDisabled()), false); assert.equal(hookValue(() => Core.useCdsFieldInvalid()), false);
  assert.equal(hookValue(() => Core.useCdsRootRemPx()), 16);
  assert.equal(hookValue(() => Core.useFizzyLakePart("color"), (n) => el(Core.rr.Provider, { value: "color panels type" }, n)), true);
  const a = { current: null };
  hookValue(() => Core.useCdsMergedRefs(a, noop))("node");
  assert.equal(a.current, "node");
  const calls = [];
  hookValue(() => Core.useLatestCallback((...x) => calls.push(x)))(1, 2);
  assert.deepEqual(calls, [[1, 2]]);
  assert.equal(Core.useCdsIsoLayoutEffect, React.useEffect, "server: useEffect");
  assert.deepEqual(Object.keys(hookValue(() => Core.useClickToFocus(noop, { disabled: true })).clickToFocusProps), ["onMouseDown"]);
  assert.equal(render(Core.CdsOpensInNewTabHint, { id: "h" }), '<span id="h" hidden="" class="sr-only">(opens in new tab)</span>');
  assert.match(render(Core.CdsPortalRoot, { className: "probe" }, el("p", null, "inside")), /class="cds-root pointer-events-auto probe"[\s\S]*<p>inside<\/p>/);
  const made = [];
  class Fake { constructor(cb) { made.push(cb); } observe(t) { made.push(["observe", t]); } disconnect() { made.push("disconnect"); } takeRecords() { return ["r"]; } }
  const lazy = Core.useLazyObserver(Fake, noop), mutation = Core.useLazyMutationObserver(Fake, noop);
  lazy.observe("a"); lazy.disconnect(); mutation.observe("m");
  assert.deepEqual(mutation.takeRecords(), ["r"]);
  assert.deepEqual(made, [noop, noop, ["observe", "a"], "disconnect", ["observe", "m"]]);
});

// One owner for wave 3: under one CdsRoot the wave-3 roots read the Root's own density / direction / labels / locale /
// router Context objects (the ones the 57 earlier roots read), not copies.
test("wave 3: one CdsRoot provides the same Context instances to the wave-3 roots", () => {
  const names = contextName();
  const router = { resolveHref: (href) => `/local${href}`, navigate() {} };
  const labels = (key, fallback) => (key === "moreInfo" ? "更多信息" : key === "loading" ? "加载中" : fallback);
  const rootProps = { density: "compact", labels, router, direction: "rtl", locale: "zh-CN" };
  const prefix = traceContexts(() => renderToStaticMarkup(el(Core.CdsRoot, rootProps, null))).reads.map(([c]) => c);
  const read = (child) => {
    const { reads, result } = traceContexts(() => renderToStaticMarkup(el(Core.CdsRoot, rootProps, child)));
    prefix.forEach((c, i) => assert.equal(reads[i][0], c));
    return { result, ctx: Object.fromEntries(reads.slice(prefix.length).filter(([c]) => names.has(c)).map(([c, v]) => [names.get(c), v])) };
  };
  const bar = read(el(VT.ViewTabBar, { tabs: tabPair, activeId: "a", onActivate: noop, "aria-label": "Tabs" }));
  assert.equal(bar.ctx.Da, "compact"); assert.deepEqual(bar.ctx["vendor.Yn"], { direction: "rtl" });
  assert.ok(bar.result.includes(VT.viewTabSizes.floorClass), "Root density selects the compact table");
  const Probe = () => el("i", null, `${Vendor.useDirection()}|${Core.useCdsDensity()}|${Core.useCdsLocale()}`);
  assert.match(read(el(Probe)).result, /<i>rtl\|compact\|zh-CN<\/i>/);
  const tip = read(el(Core.CdsInfoTooltip, { content: "x" }));
  assert.equal(tip.ctx.ui, labels); assert.match(tip.result, /aria-label="更多信息"/);
  const skeleton = read(el(Core.CdsLoadingSkeleton, { hold: "none" }, "x"));
  assert.match(skeleton.result, /加载中/);
  const link = hookValue(() => Core.useCdsLinkProps({ href: "/docs" }), (n) => el(Core.CdsRoot, rootProps, n));
  assert.equal(link.href, "/local/docs");
});
