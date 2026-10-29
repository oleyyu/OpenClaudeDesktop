// R4f-rail SR-2: extract the Code session rail's view (the "Session details" aside) without executing any desktop
// runtime (decision D0: own generator, own output folder src/generated/session-rail, own
// scripts/verify-gen-session-rail.mjs). Spec: analysis/code-ui-migrate-20261017/research/r4-session-rail.md §1.2, §2,
// §8 SR-2, §10. The rail's primitives, stores and shell are SR-1's session-rail-kit, imported by public name.
// w5-session-rail-gen (2026-10-26): the originals are Claude Desktop 3.6556.2 (analysis/claude-3.6556.2-migrate-20261025,
// research/panes.md §1.1 / §2.1 C1-5…C1-9, C1-13 / §3.2; plan R1–R15, E3/E5/E7/E34/E37). Target files and export names are
// those of 2.42304.0 (R4/E7); the rail view adds the engine plugin card ($j) and its empty default (Wj).
//
//   rail-view.mjs          cf74bc599 Zj (memo; the session key provider) → Gj (<aside aria-label="Session details">: the
//                          region entry, the scroll area and the card stack) → sj / ij (the dnd-kit sortable card stack:
//                          order / hidden from the kit's rail sections store, slot presence, drop animation) and the
//                          cards: Environment (environment row hM / gM, folder rows uM / dM / lM, branch row, worktree
//                          mark), Connectors (rM / iM / nM), Outputs ($A / QA / YA / JA / qA), Changes (the PR bar slot
//                          under the row / sans contexts), an engine plugin's rail pane ($j; the host passes none), plus
//                          xM (the inline skeleton).
//   rail-derive.mjs        cf74bc599's pure derivations TN feeds Gj with: folder Cj, extra folders _j, branch Dj / Ej,
//                          worktree Lj, lazy worktree Rj / zj, environment Mj / Nj / Oj, connectors yj / HA, plan Uj,
//                          Remote Control wj, the meta fields gN, the composer menu → section map pN, the git-info select
//                          bN, Tj (6 s); rail-hooks.mjs: SN (the pending hold), xN (the checkout's branch and repo name
//                          over the git-info query), mN (a composer menu request opens its rail section).
//   dnd-kit.mjs            c09f6b4e5: core, sortable and utilities as sj / ij use them. Its 13 roots are imported from
//                          sidebar-reorder's byte-for-byte copy of the chunk (the one copy) and re-exported here.
//   save-environment.mjs   cf74bc599 Vx (the rail's "save this folder as an environment" setup), Qx (the flat rail's "Save"
//                          link beside the environment row), $x (the stacked rail's row), Xx / Yx / Jx (the save request
//                          on the scope store, its checkout, the outcome), Bx (the suggested name), Nx (the "Save as
//                          environment" label); with cd0cf5b5e p / Fe (target equality, model settings), cead7e0c5 v (the
//                          last session's settings for a target) and their small originals (shared-20 uA, shared-28 l_).
//                          The environment store, the local sessions store, the session → environment record, the
//                          non-local environment create and the model alias table are host adapters in
//                          src/source-session-rail-adapters.jsx.
//   …                      and the small originals those read (c4db265df Ze, shared-25 UH / DG / kG, shared-46 tM / WL,
//                          shared-frame yT, c96d752d0 cL / dL, c5304ebdb E, ccc47c03f I, shared-52 Ro / hJ / Gc, shared-7
//                          Ik / Fk, shared-130 EH / VA / zA / UV, shared-78 eB, shared-11 cm, c73f45bc3 _v).
//
// TN (the data assembly behind EpitaxySessionRailHost = LN = memo(TN)) is not emitted: it reads claude.ai session meta,
// remote environments, Remote Control, engine plugins and artifacts. Its text is pinned as a call site; the host assembler
// (SR-7) builds Zj's props from host data with the derivations above and calls SN / Tj / _v / xN / mN as TN does.
//
// Every emitted binding is an original top-level declaration sliced from the 3.6556.2 chunk (a module's bindings are the
// reachable closure of its roots; free variables by Babel scope analysis; a top-level statement that initialises a
// binding — a TypeScript enum body, a static member — goes with it). An import or same-chunk binding resolves, in this
// order, to: a host adapter in src/source-session-rail-adapters.jsx (feature-checked against the original it replaces),
// an earlier module of this area, a session-rail-kit public name, a view-tabs public name (D1/D24; the React Compiler
// helpers by their E3 names; a member of a public compound such as CdsDropdown.Item is read off the compound after
// checking its declaration names it), React (a vendor-frame export alias of official.reactAliases), or an export of
// another generated area that slices the same 3.6556.2 binding (one copy). A module root another importable area already
// slices and exports is imported from there and re-exported under this area's public name (R4i GR4: one copy, the public
// name kept for this area's consumers). A binding another area slices without exporting it is refused unless
// `duplicates` says why a second copy is harmless; a context view-tabs already instantiates is refused. Nothing else is
// accepted.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { sidebarResizeManifestFor, sidebarResizeExportsFor } from './sidebar-resize-compat.mjs';
import { turnBoxManifestFor, turnBoxExportsFor } from './turn-box-compat.mjs';
import { routinesSharedManifestFor } from './routines-shared-compat.mjs';
import { mcpAppCardManifestFor, mcpAppCardExportsFor } from './mcp-app-card-compat.mjs';
import { sidebarReorderManifestFor, sidebarReorderExportsFor } from './sidebar-reorder-compat.mjs';
import * as official from './official-3.6556.2.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
// w5-session-rail-gen: 3.6556.2 (R1/E6). The constants come from official-3.6556.2.mjs.
const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/session-rail');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-session-rail-adapters.jsx';
const kitAdapterModule = '../../source-session-rail-kit-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const VENDOR_FRAME = official.vendorFrame;
const RAIL = 'cf74bc599-CRYqipWN.js';
// E34 (producer side), removed in wave 7: transcript-rows linked this area through a frozen 2.42304.0 view
// (scripts/session-rail-legacy-2.42304.0.json, written as `legacy['2.42304.0']`) until it moved to 3.6556.2 in wave 6.
// Every importer now reads this version's manifest and imports semantic names, so no legacy segment is written.

// Host dependencies, keyed by the original binding (file:local) an import or same-chunk reference resolves to.
// `features` must appear in that binding's prettier form (`closure: true`: in the raw text of its same-chunk closure).
// Export names are those of 2.42304.0.
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (the kit's adapters, re-exported by this area's).
  'vendor-intl-DYfox5Co.js:q': { name: 'useIntl', features: ['return (Mt(e), e);'] },
  'vendor-intl-DYfox5Co.js:Gt': { name: 'FormattedMessage', features: ['var Gt = c(Wt, Ut);'] },
  // shared-4 Sk (exported rt): a navigation region's registered body; no region registry here (the kit's adapter).
  'shared-4-DUB1Oi0O.js:Sk': { name: 'RegionEntry', features: ['t = vk(Ck);', 't === null ? null : P(t, e)'] },
  // c280f9bbb L (exported n): GrowthBook __gb__2954460583 (the file icon set) unless fizzy "icons". Off here (D29 / D31).
  'c280f9bbb-CutcMso2.js:L': { name: 'useFileIconSetEnabled', closure: true, features: ['e&&!f("icons")', 'F="__gb__2954460583"'] },
  // c856385e2 rr (exported m): the transcript's file reference (opens the path in the session's Files pane).
  'c856385e2-aEyDzrcK.js:rr': { name: 'SessionFileRef', features: ['fileRef: n,', 'blockedClassName: u,', 'preferDiff: o,', 'isTranscriptMarkdown: s,'] },
  // c73f45bc3 Vb (exported x): the scratch workspace's copy-of mapping (`scratchCarried` in the session meta). None here.
  'c73f45bc3-B7hbL7H9.js:Vb': { name: 'useScratchCopyOf', features: ['if (!t?.scratchCarried) {', 'carried: e,'] },
  // shared-11 _m (exported ki): the live branch of a checkout from the branch rows store the desktop's git-state bridge
  // fills. No such bridge here.
  'shared-11-_AVGLHEz.js:_m': { name: 'useLiveCheckoutBranch', closure: true, features: ['t.rows[e]?.branch', 'getGitStateSnapshot'] },
  // cf74bc599 same-chunk bindings the host stands in for.
  [`${RAIL}:ZA`]: { name: 'useSessionOutputPaths', features: ['{ sessionRef: t, checkouts: n, copyOf: r, folders: i } = e,', 'return fe(u);'] },
  [`${RAIL}:zA`]: { name: 'useGoneOutputPaths', features: ['o = Ge?.resolveSessionFile !== void 0,', 'c.length === 0'] },
  [`${RAIL}:SM`]: { name: 'RemoteControlRow', features: ['{ remoteControl: t, icon: n } = e,', 't.lockedByRemoteClient', 'defaultMessage: "Remote Control options",'] },
  [`${RAIL}:vM`]: { name: 'GoalCardBody', features: ['cutWhenLastShown: r,', 'children: t.condition', 'defaultMessage: "Edit goal",'] },
  [`${RAIL}:sM`]: { name: 'ProgressCardBody', features: ['disableCommentAttachment: !0,'] },
  [`${RAIL}:KA`]: { name: 'ArtifactOutputRow', features: ['{ artifact: t, onOpen: n } = e,', 'defaultMessage: "Updated {when}",', 'defaultMessage: "Artifact", id: "PpIQsaWAR2"'] },
  // The stores and creators of the rail's Save environment (save-environment.mjs: Vx / Xx).
  'cd0cf5b5e-BCzJmEwZ.js:z': { name: 'useEnvironmentStore', features: ['environments: [],', 'markStartedFrom: (t) =>', 'startedPlaces'] },
  'shared-8-Db1QN4mf.js:og': { name: 'useLocalSessionsStore', features: ['sessions: [],', 'name: "ccd-sessions-filter",'] },
  // shared-46 IL (exported j): records the environment a session now belongs to (ML `record(sessionId, environmentId)`).
  'shared-46-BIbZBGFq.js:IL': { name: 'recordSessionEnvironment', features: ['ML.getState().record(e, t)'] },
  // c73f45bc3 du (exported Yn): creates a non-local environment straight from the setup (Xx's `__`).
  'c73f45bc3-B7hbL7H9.js:du': { name: 'addRemoteEnvironment', features: ['r.addEnvironment({ ...e, name: e.name.trim() })', 'r.markStartedFrom(i.id),'] },
  // cecbf1aa5 l (exported s; 2.42304.0 c4e18af0a c): a model id with Claude's alias table applied.
  'cecbf1aa5-BT0v8IlE.js:l': { name: 'canonicalModelId', features: ['let i = r(e),', 'return `${t(i)}${a}`;'] },
  // w10-ccres-rail-env-edit: the lazy dialog handles c73f45bc3 Zx preloads on intent (shared-78 t3 `e?.preload("intent")`):
  // c73f45bc3 ou (the local environment dialog, ca690a791 EpitaxyEnvironmentDialog) and cc5b397c6 l (exported r, the cloud
  // environment editor, c28ccf1ab EpitaxyEditEnvironmentDialog). The host bundles its saved environment dialog
  // synchronously, so each is null (t3's optional call does nothing).
  'c73f45bc3-B7hbL7H9.js:ou': { name: 'localEnvironmentDialogHandle', closure: true,
    features: ['ou=iu.handle', 'id:"epitaxy_new_preset_dialog"', 'pick:e=>e.EpitaxyEnvironmentDialog'] },
  'cc5b397c6-BgWEcD7A.js:l': { name: 'cloudEnvironmentDialogHandle', closure: true,
    features: ['l=a.handle', 'id:"epitaxy_environment_dialogs"', 'pick:e=>e.EpitaxyEditEnvironmentDialog'] },
  // c68c4283d _f (exported Bd): rail section telemetry (D17: nothing is sent; the kit's adapter).
  'c68c4283d-CWbOoVxS.js:_f': { name: 'logRailSectionEvent', module: kitAdapterModule, features: ['d("claudeai.epitaxy.session_rail.section_moved", { section: t });'] },
};
// Original bindings this generator slices although another area also slices them (not exported there). Each entry says
// why a second copy is harmless; anything that holds state is never listed here.
const duplicates = {
  // c96d752d0 vke / _ke / uL: the repo-name chip (dL = memo(vke)), its accent classes and the "inside the chip" flag (uL =
  // createContext(!1)). session-rail-changes pr-rows.mjs slices the same chip for the PR rows without exporting it. Each
  // copy of uL is provided by its own vke and read only by components of the same area (here lM, the path tail inside the
  // folder chip; there the PR row's own children), so the two instances never meet.
  'c96d752d0-CWv_7-n9.js:vke': 'stateless component (no module state)', 'c96d752d0-CWv_7-n9.js:_ke': 'plain data (no state)',
  'c96d752d0-CWv_7-n9.js:uL': 'context provided and read within each area (see above)',
  // c73f45bc3 sx / dx: the engine plugin sections and the section title resolver, hooks over the kit's
  // RailPluginSectionsContext (ox, imported from the kit); session-rail-kit rail-card.mjs slices them without exporting them.
  'c73f45bc3-B7hbL7H9.js:sx': 'hook over the kit\'s context (no module state)', 'c73f45bc3-B7hbL7H9.js:cx': 'pure function (no state)', 'c73f45bc3-B7hbL7H9.js:dx': 'hook over the kit\'s context (no module state)',
  // shared-78 w4: a session's remote target (code-routines shared-78-D5Fw2h0a.mjs slices it without exporting it).
  'shared-78-D5Fw2h0a.js:w4': 'pure function (no state)',
  // shared-25 wG: the lazily built invisible-character pattern DG strips with (w8-turn-plan-renderer: turn-plan shared-25.mjs
  // slices it for shared-11 qE, which the plain-node turn tail reads, so it cannot import this area's copy, E42).
  'shared-25-DOWZRSlq.js:wG': 'lazily built RegExp, no other state',
};
/** The other areas' slices of `file:local` that `duplicates` does not allow (one copy per binding). */
export function unlistedSlices(key, elsewhere) {
  if (duplicates[key]) return [];
  return elsewhere.map(e => `${e.area}/${e.target}`);
}
const contextDuplicates = {};
// Members of a view-tabs public compound component: `file:local` -> the compound's binding and member. The compound's
// original declaration must name the member (`Member: local`); the module then reads `<compound>.<Member>`.
// 3.6556.2 shared-frame: GT = Object.assign(CT, { …, Popup: cT, Item: dT, Separator: mT, Submenu: pT, SubmenuTrigger: fT, … })
// (view-tabs CdsDropdown).
const members = {
  'shared-frame-6jtSkIit.js:dT': { of: 'GT', member: 'Item' },
  'shared-frame-6jtSkIit.js:mT': { of: 'GT', member: 'Separator' },
  'shared-frame-6jtSkIit.js:pT': { of: 'GT', member: 'Submenu' },
  'shared-frame-6jtSkIit.js:fT': { of: 'GT', member: 'SubmenuTrigger' },
  'shared-frame-6jtSkIit.js:cT': { of: 'GT', member: 'Popup' },
};
// Generated areas whose exported roots this generator may import (one copy), in order of preference. Composer-owned
// areas (code-composer) are never imported. The sibling rail areas (session-rail-sections / -changes / -context) moved to
// 3.6556.2 in waves 3–4 and are importable now (their one copy of a shared original is reused instead of refused).
const importableAreas = ['session-rail-kit', 'code-current', 'files-changes', 'r3b-transcript', 'r4e-findings', 'r4e-envbranch', 'r4e-plugin',
  'sidebar-sections', 'review-findings', 'session-load-error', 'retry-decision', 'app-switch', 'r3b-settings', 'r3b-tasks', 'btw-pane', 'sidebar-resize',
  'turn-box', 'routines-shared', 'sidebar-reorder', 'mcp-app-card', 'session-rail-sections', 'session-rail-changes', 'session-rail-context',
  // cowork-home (3.6556.2, W10) exports its shared-52 copy of mJ (plugin display name); the rail imports it (D1,
  // w11-sweep-ccres) instead of keeping a second copy.
  'cowork-home',
  // cowork-progress (3.6556.2, W13 w13-coworkui-outputs) slices and exports shared-78's connector naming (eB / BP / UP / qz
  // and their closure; qz is mcp-app-card's copy since w13-close-gen-dedup); the rail imports that one copy (D1,
  // w13-close-rail-regen) instead of keeping connector-name.mjs's second slice. No host adapter of the Cowork graph is
  // reached (E41).
  'cowork-progress',
  // cowork-scheduled (3.6556.2, W12) holds the CDS coachmark shared-frame Sj (its module imports only view-tabs and React);
  // coachmark.mjs re-exports that copy (D1, w13-close-rail-regen cwui-46).
  'cowork-scheduled'];

// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original (prettier-formatted) text, `closureFeatures` to the raw text of its
// same-chunk closure (R2: literals, keys, class names, message ids).
const modules = [
  // ---- c09f6b4e5: dnd-kit (core, sortable, utilities) as the card stack sj / ij use it; imported from sidebar-reorder ----
  { target: 'dnd-kit.mjs', source: 'c09f6b4e5-CLm8I7_i.js',
    exports: { fe: 'useSensors', de: 'useSensor', ct: 'PointerSensor', rt: 'KeyboardSensor', $n: 'sortableKeyboardCoordinates', N: 'isKeyboardEvent',
      Dn: 'arrayMove', on: 'DndContext', _e: 'closestCenter', Vn: 'SortableContext', Ln: 'verticalListSortingStrategy', Yn: 'useSortable', P: 'CSS' },
    features: { fe: ['.filter((e) => e != null), [...e]);'], de: ['({ sensor: e, options: t ?? {} }), [e, t]);'], ct: ['var ct = class extends ot {'], rt: ['this.autoScrollEnabled = !1'], $n: ['if (Qn.includes(e.code)) {'], N: ['let { KeyboardEvent: t } = y(e.target);'],
      Dn: ['r.splice(n < 0 ? r.length + n : n, 0, r.splice(t, 1)[0])'], on: ['autoScroll: c = !0,', 'collisionDetection: p = be,'],
      _e: ['i = ge(t, t.left, t.top),'], Vn: ['strategy: o = Fn,'], Ln: ['activeIndex: t,', 'overIndex: a,'], Yn: ['animateLayoutChanges: n = Un,'],
      P: ['"translate3d(" +'] } },
  // c4db265df Ze: the region reading order Gj hands the navigation region (`readingOrder`; nothing provides it here).
  { target: 'region-reading-order.mjs', source: 'c4db265df-fNhlkQCj.js', exports: { Ze: 'RegionReadingOrderContext' }, features: { Ze: ['var Ze = l([]);'] } },
  // shared-25 UH (IH over HH): an array kept while its items are the same (QA); DG / kG: the shown output path.
  { target: 'stable-array.mjs', source: 'shared-25-DOWZRSlq.js', exports: { UH: 'useStableArray', DG: 'stripInvisible', kG: 'displayPath' },
    features: { UH: ['return IH(e, HH);'], DG: ['.replace(wG(), "");'], kG: ['return DG(e).replace(TG(), "");'] },
    closureFeatures: { UH: ['comparedWith:e,stable:e'], kG: ['\\p{Default_Ignorable_Code_Point}'] } },
  // shared-46 tM: swallow the click that ends a pointer drag (sj's onDragStart); WL / GL: the folder's parent, `~` for home.
  { target: 'drag-click-guard.mjs', source: 'shared-46-BIbZBGFq.js', exports: { tM: 'swallowNextClick', WL: 'homeRelativeParent' },
    features: { tM: ['e.addEventListener("click", t, !0),'], WL: ['let t = GL(e).replace(/[\\\\/][^\\\\/]*$/, "");'] } },
  // shared-frame yT: a CdsDropdown body from item descriptors (the folder chip's repo menu), its parts read as members of
  // the view-tabs CdsDropdown.
  { target: 'menu-items.mjs', source: 'shared-frame-6jtSkIit.js', exports: { yT: 'renderMenuItems' },
    features: { yT: ['e === "separator"', 'onClick: e.onSelect,', 'disabledReason: e.disabledReason,'] } },
  // c96d752d0 cL: the Changes card's pull request count (Gj's provider value; the PR bar slot reports into it).
  { target: 'pr-count-context.mjs', source: 'c96d752d0-CWv_7-n9.js', exports: { cL: 'RailPrCountContext' }, features: { cL: ['var cL = N(null);'] } },
  // c96d752d0 dL (memo vke): the folder name chip (Working folder / Additional folder), a menu trigger with repo items.
  { target: 'repo-name-chip.mjs', source: 'c96d752d0-CWv_7-n9.js', exports: { dL: 'RepoNameChip', uL: 'RepoNameChipSlotContext' },
    features: { dL: ['var dL = M(vke);'], uL: ['var uL = N(!1);'] }, closureFeatures: { dL: ['(uL.Provider,{value:!0,children:'] } },
  // c5304ebdb E: the preview card placement the Outputs list sets (`placement: "beside-start"`).
  { target: 'preview-placement.mjs', source: 'c5304ebdb-C8vzSQK_.js', exports: { E: 'PreviewPlacementProvider' },
    features: { E: ['{ placement: n, popupClassName: r, children: i } = e,', 't(T.Provider, { value: a, children: i })'] } },
  // ccc47c03f I: the Slack logo (an environment that started in Slack).
  { target: 'slack-logo.mjs', source: 'ccc47c03f-nDk6qfjU.js', exports: { I: 'SlackLogo' }, features: { I: ['viewBox: "0 0 123 123",', 'fill: "#E01E5A",'] } },
  // shared-52 Ro / hJ / Gc: "plugin:<plugin>:<connector>" names, the plugin's display name, an "owner/name" repo slug.
  { target: 'plugin-connector.mjs', source: 'shared-52-uHFNjl7C.js', exports: { Ro: 'parsePluginConnector', hJ: 'pluginDisplayName', Gc: 'parseRepoSlug' },
    features: { Ro: ['let t = e.match(/^plugin:([^:]+):(.+)$/);'], hJ: ['return typeof e == "string" ? mJ(e) : e.displayName || mJ(e.name);'], Gc: ['let t = e.split("/");'] } },
  // shared-7 Ik / Fk: the connector icon's letter avatar and tile (the host's ConnectorIcon adapter composes them as the
  // original shared-7 icon does).
  { target: 'connector-icon-parts.mjs', source: 'shared-7-DBAgAi5H.js', exports: { Ik: 'ConnectorLetterIcon', Fk: 'ConnectorIconTile' },
    features: { Ik: ['"shrink-0 flex items-center justify-center bg-surface-3 text-secondary",'], Fk: ['"shrink-0 bg-surface-3 border shadow-sm flex items-center justify-center",', 'a = i * 0.27,'] } },
  // shared-130 EH / VA / zA / UV: a connector's saved tool-result file (`mcp-<server>-blob-<ms>-…`), identifier humanising,
  // "-plugin", backslashes to slashes (UV is exported for transcript-rows, which links this area).
  { target: 'saved-output.mjs', source: 'shared-130-dWztbTO1.js', exports: { EH: 'savedConnectorOutput', VA: 'humanizeIdentifier', zA: 'stripPluginSuffix', UV: 'forwardSlashes', WV: 'pathFileName' },
    features: { EH: ['if (t !== null) return { server: t[1], savedMs: Number(t[2]) };'], VA: ['.split(/[-_\\s]+/)'], zA: ['return e.replace(/-plugin$/, "");'],
      UV: ['return e.replace(/\\\\/g, "/");'], WV: ['e.startsWith("/") ? "/" : /[/\\\\]/', '.pop() || e'] } },
  // shared-78 eB: a connector's display name (Claude in Chrome, Computer use, …). BP / qz are exported for transcript-rows,
  // which links this area instead of slicing them a second time.
  { target: 'connector-name.mjs', source: 'shared-78-D5Fw2h0a.js', exports: { eB: 'connectorDisplayName', BP: 'isAgentsConnector', qz: 'CLAUDE_IN_CHROME_NAME' },
    features: { eB: ['e === "claude-in-chrome"', 'e === "computer-use"'], BP: ['e.uuid === "f688f3fc-1d05-5bd1-9c48-9854ec083044"'], qz: ['var qz = "Claude in Chrome";'] } },
  // shared-11 cm: a detached HEAD ("HEAD" / "detached:…"), which xN's git-info select (bN) drops.
  { target: 'branch-name.mjs', source: 'shared-11-_AVGLHEz.js', exports: { cm: 'isDetachedBranch' }, features: { cm: ['return e === "HEAD" || e.startsWith("detached:");'] } },
  // c227f4d5e cJ: a connector row's target ("account:<id>" / "session:<id>", yj); nY: the Remote Control meta fields gN
  // spreads (bridgeSessionUrl, remoteControlConnecting, remoteControlAvailable, startedViaRemoteControl, isCloudRun).
  { target: 'connector-target.mjs', source: 'c227f4d5e-B-FYKrwT.js', exports: { cJ: 'parseConnectorTarget' },
    features: { cJ: ['/^(account|session):([^:]+)$/', '{ kind: t, id: decodeURIComponent(n) }'] } },
  { target: 'remote-control-meta.mjs', source: 'c227f4d5e-B-FYKrwT.js', exports: { nY: 'REMOTE_CONTROL_META_FIELDS' },
    features: { nY: ['"bridgeSessionUrl",', '"remoteControlConnecting",', '"remoteControlAvailable",', '"startedViaRemoteControl",', '"isCloudRun",'] } },
  // c227f4d5e RB: a folder path in a rail row, shrinking first (the extra folder rows).
  { target: 'rail-path-label.mjs', source: 'c227f4d5e-B-FYKrwT.js', exports: { RB: 'RailPathLabel' },
    features: { RB: ['"flex min-w-[8ch] shrink-[9999] text-muted-as-secondary"', 'title: ""'] } },
  // shared-20 Dh: the lined (panels) rail row's start inset.
  { target: 'rail-lined-inset.mjs', source: 'shared-20-mUr7IqZY.js', exports: { Dh: 'RAIL_LINED_INSET_CLASS' },
    features: { Dh: ['"[.epitaxy-rail-lined_&]:ps-[calc(var(--cds-gap-xs)-var(--cds-pad-xs))]"'] } },
  // shared-46 BL: "this computer", the local place of a saved environment's label.
  { target: 'this-computer-label.mjs', source: 'shared-46-BIbZBGFq.js', exports: { BL: 'thisComputerLabel' },
    features: { BL: ['defaultMessage: "this computer", id: "ege0wZHHpb"'] } },
  // cef1e6037 er: a session record's origin folder and working folder (Vx's checkout).
  { target: 'session-checkout.mjs', source: 'cef1e6037-C9OZ_iaL.js', exports: { er: 'sessionCheckoutFolders' },
    features: { er: ['let t = e.originCwd || e.cwd;', 'workingDir: e.harnessCwd ?? e.worktreePath ?? t'] } },
  // c73f45bc3 sx / dx: the engine plugin rail panes (over the kit's RailPluginSectionsContext) and a section's title (a
  // plugin pane's own title, else the kit's railSectionTitle).
  { target: 'plugin-sections.mjs', source: 'c73f45bc3-B7hbL7H9.js', exports: { sx: 'useRailPluginSections', dx: 'useRailSectionTitle' },
    features: { sx: ['e.map(cx)'], dx: ['(t.find((e) => e.id === n)?.title ?? "")', 'ux(e, n)'] } },
  // shared-78 w4: a session's remote target (SSH / WSL), which Vx's setup keeps.
  { target: 'remote-target.mjs', source: 'shared-78-D5Fw2h0a.js', exports: { w4: 'sessionRemoteTarget' },
    features: { w4: ['let t = e?.remoteTarget;', 'case "wsl":', 'if (e?.sshConfig)'] } },
  // c73f45bc3 _v (TN's e_): how long an environment name may stay pending before the skeleton gives up.
  { target: 'rail-timing.mjs', source: 'c73f45bc3-B7hbL7H9.js', exports: { _v: 'NAME_PENDING_GIVE_UP_MS' }, features: { _v: ['var _v = 2e3;'] } },

  // ---- cf74bc599: the rail's pure derivations, and the TN pieces the host assembler (SR-7) calls as written ----
  { target: 'rail-derive.mjs', source: RAIL,
    exports: { Cj: 'railFolder', Sj: 'repoSlugName', Bj: 'pathLeaf', _j: 'railExtraFolders', xj: 'folderTreeCwd', gj: 'otherRepos', Ej: 'knownBranch',
      Dj: 'railBranch', Lj: 'railWorktree', Ij: 'CLAUDE_WORKTREE_PATH', Rj: 'lazyWorktreePending', zj: 'lazyWorktreeState', Mj: 'railEnvironment',
      Nj: 'environmentLabel', Oj: 'environmentKind', kj: 'isCloudEnvironment', yj: 'connectorRows', vj: 'plainConnectorLabel', hj: 'environmentConnection',
      Hj: 'isSideSessionNotesFolder', wj: 'remoteControlState', Uj: 'railPlanSteps', Pj: 'hasEnvironmentCard', Fj: 'railHasContent',
      pM: 'environmentSummary', mM: 'doneStepCount', HA: 'connectorLabel', VA: 'humanizedSlug', Tj: 'RAIL_PENDING_GIVE_UP_MS', bN: 'checkoutInfo',
      yN: 'NO_CHECKOUT_INFO', Qj: 'RAIL_SLOT_CLASSES', tM: 'NO_CHECKOUTS', gN: 'RAIL_SESSION_META', pN: 'COMPOSER_MENU_SECTIONS' },
    features: {
      Cj: ['if (r) return o ? { name: o, path: l, hidePath: !0 } : null;', 'name: Sj(i) || a || Bj(u),', '...(u !== l && { basePath: u }),', '...(m && { repoSlug: m }),',
        'clonesRepos: s = !1,', 'repoSlugs: c = [],'],
      Sj: ['return e ? Bj(e) : void 0;'], Bj: ['return e.split(/[\\\\/]/).filter(Boolean).pop() ?? e;'],
      _j: ['trees: t = bj,', 'worktreeRemoved: !0,', 'worktree: { name: e.worktreeName, path: e.worktreePath },', '(t.repoLinks ??= e.repoLinks)', 'repoSlugs: r,'],
      xj: ['? e.worktreePath + e.folder.slice(t.length)'], gj: ['return n === null ? e : e.filter((e) => e !== t);'],
      Ej: ['return (e ? void 0 : t) || n || t || r || void 0;'], Dj: ['? { name: i }', '? { name: null }'],
      Lj: ['return !e || !n || n === t || (!r && !Ij.test(n))', ': { name: Bj(n), path: n };'], Ij: ['/[\\\\/]\\.claude[\\\\/]worktrees[\\\\/]/'],
      Rj: ['return e && o === !0 && s !== !0 && !r && !i && !a && !!n && t === n;'],
      zj: ['? { kind: "notEntered" }', '? { kind: "ready", branch: i }', ': { kind: "preparing" };'],
      Mj: ['labels: { local: null, cloud: null, bridge: null },', '...(n !== null && n !== e.name && { details: [{ value: n }] }),'],
      Nj: ['case "remoteHost":', 'return { label: o.local, kind: s.local, ...(c && { icon: c }) };', 'place: "cloud",'], Oj: ['?.type === "pool"', '? "selfHosted"'],
      kj: ['return e === "cloud" || e === "selfHosted";'], yj: ['labelOf: a = vj,', 'targets: i,', 'n === "failed" || n === "needs-auth" || n === "unavailable"'],
      vj: ['return { label: e };'], hj: ['case "idle":', 'return "notConnected";'], Hj: ['return Vj.test(e);'],
      wj: ['prefsPending: i,', 'return n && (e || !t) ? n : i || (r && t) ? "pending" : void 0;'],
      Uj: ['e.findIndex((e) => e.status === "in_progress")', 'n === t ? "current" : e.status === "completed" ? "done" : "pending",'],
      Pj: ['e.worktree !== null'], Fj: ['e.artifacts.length > 0'], pM: ['(fM(e) ? e.extraFolders[0] : e.folder)?.name', '(e) => typeof e == "string" && e !== "",'],
      mM: ['return e.filter((e) => e.state === "done").length;'], HA: ['label: VA(t.connectorName),'],
      VA: ['return BA.test(e) ? Xi(e) : e;'], Tj: ['var Tj = 6e3;'], bN: ['repoName: ', 'headUnread: '],
      yN: ['branch: void 0,', 'repoName: void 0,', 'headUnread: '], Qj: ['"hidden has-[nav:not(:empty)]:flex has-[[data-epitaxy-branch-row-ghost]]:flex"'],
      tM: ['var tM = [];'], gN: ['"hasDesktopWorktree",', '"startedWithWorktree",', '"worktreeRemoved",', '"sshConnectionRemoved",'],
      pN: ['context: "context",', 'effort: "settings",'],
    } },
  { target: 'rail-hooks.mjs', source: RAIL, exports: { SN: 'useRailPendingHold', xN: 'useCheckoutInfo', mN: 'useComposerMenuOpensRailSection' },
    features: { SN: ['let i = setTimeout(() => r(!0), t);', 'e && !n'], xN: ['{ ...r, select: bN }', 'o = Fo(n === "local" ? e : null),',
      'o && o !== s.branch ? { ...s, branch: o } : s'],
      mN: ['let i = n ? pN[n.menu] : void 0;', 'if (i === "settings" && r) {', '(i !== "environment" && e.setHidden(i, !1), e.setOpen(t, i, !0));'] } },

  // ---- cf74bc599: the rail view ----
  { target: 'rail-view.mjs', source: RAIL,
    exports: { Zj: 'SessionRail', Gj: 'SessionRailAside', sj: 'RailCardStack', ij: 'RailCardSlot', uM: 'RailFolderRows', dM: 'RailExtraFolderBranch',
      lM: 'RailPathTail', gM: 'RailEnvironmentStatus', hM: 'environmentDetails', rM: 'RailConnectorsCard', iM: 'RailConnectorIcon', nM: 'connectorStateAction',
      xM: 'RailSkeleton', $A: 'RailOutputsCard', QA: 'RailSessionOutputs', YA: 'RailOutputsList', JA: 'RailOutputFileRow', qA: 'RailOutputFileIcon',
      $j: 'RailPluginSectionCard', Wj: 'NO_PLUGIN_SECTIONS' },
    features: {
      Zj: ['({ sessionKey: n, ...t } = e)', 'let r = n === void 0 ? Vm : n,', 's(Gj, { ...t })', 's(Uf.Provider, { value: r, children: i })'],
      Gj: ['defaultMessage: "Session details",', 'id: "v52hoKcuPM",', 'onMouseDownCapture: op,', 'kind: "codeRail",', 'pluginSections: P,', 'R = P === void 0 ? Wj : P,',
        'Y = "flex shrink-0 ps-xs";', 'value: V ? "row" : "stacked",', 'slotClasses: Qj,', 'keepMounted: !0,',
        '"Claude is reading from {folder} on {branch}; it moves into this worktree before changing files.",',
        '"Claude hasn\\u2019t moved to this session\\u2019s worktree yet. Until it does, the folder and branch shown are your own.",',
        'defaultMessage: "Environment", id: "K7kuIZkkhY"', 'defaultMessage: "Changes", id: "dgqhUM6BxJ"'],
      sj: ['"moved"', 'activationConstraint: { distance: 6 }', 'id: "UPaB6J5Q6m",',
        '"To pick up a section, press Space or Enter. While it is picked up, press the up or down arrow key to move it, Space or Enter to drop it, or Escape to cancel.",',
        '"Picked up {name}. It is section {position} of {count}.",', 'defaultMessage: "Moving {name} was cancelled.",'],
      ij: ['defaultMessage: "Draggable section",', 'id: "1y61ZzlFkj",', 'e.toggleAttribute("data-rail-slot-off", !r)', '"data-rail-card"', '"relative flex-col rounded-card",',
        '"contents has-[[data-rail-section]]:flex"'],
      uM: ['defaultMessage: "Additional folder",', 'defaultMessage: "Working folder",', 'defaultMessage: "Choose folder\\u2026",', 'icon: "Add",', 'flush: "end",',
        '!t.repoSlug', 'repository: t.repoSlug !== void 0,'],
      dM: ['"GitBranch"', 'defaultMessage: "Branch",', '"min-w-0 text-primary"'],
      lM: ['"flex w-[8ch] shrink-[9999] basis-[content] px-md text-muted-as-secondary"'],
      gM: ['defaultMessage: "Learn more", id: "TdTXXf940t"', 'defaultMessage: "Connecting", id: "6q3tCnkd2h"', 'defaultMessage: "Not connected", id: "kldl5VlIaI"',
        '"shrink-0 text-footnote text-warning"', 'caution: r,'],
      hM: ['" \\u00B7 "'],
      rM: ['defaultMessage: "{count} to reconnect",', 'id: "NM9g1WPqsR",', 'defaultMessage: "{count} connected",', 'id: "aGQ0Kha73h",', 'defaultMessage: "Manage connectors",',
        'defaultMessage: "Unavailable",', 'f = n === null ? null : Math.max(0, n - r - c),', 'limit: eM,', 'onClick: () => o(e.target),'],
      iM: ['"favicon"', 'fadeInOnLoad: !1,'], nM: ['defaultMessage: "Reconnect", id: "ZHe7cLKE7v"', 'defaultMessage: "Authenticate", id: "CKI/AUaH8H"'],
      xM: ['decorative: !0,', 'as: "span",', 'className: "flex min-w-0 items-center",', 's(ne, { width: t, height: 12 })'],
      $A: ['files: GA, artifacts: i, onOpenArtifact: a'], QA: ['copyOf: a,', 'l = zA(i, c),', 'c === o && l.size === 0 ? o : XA(c, l)'],
      YA: ['defaultMessage: "Outputs", id: "ohKjpG6KDI"', 'placement: "beside-start",', 'limit: UA,', 'id: "outputs",'],
      JA: ['defaultMessage: "{server} image",', 'defaultMessage: "{name} \\u00B7 {when}",', 'blockedClassName: "block w-full",', '{ path: t }'],
      qA: ['s(Wf, { name: "File" })', 'Un("panels") && (i = ma.size),'],
      $j: ['className: "flex max-w-40",', 's(E, { lazy: !0, children: r })', 'defaultMessage: "Close", id: "rbrahOGMC3"', 'headerMenu: u,'],
      Wj: ['var Wj = [];'],
    } },
  // ---- Save environment (TN's bn = Vx(…), the flat rail's environmentSave Qx, the stacked rail's $x) ----
  // cd0cf5b5e p (target equality without the folder lists, over code-current's m) / Fe (a preset's model and effort).
  { target: 'environment-target.mjs', source: 'cd0cf5b5e-BCzJmEwZ.js', exports: { p: 'sameStoredEnvironmentTarget', Fe: 'environmentModelSettings', S: 'splitEnvironmentSettings' },
    features: { p: ['return m(Ce(e), Ce(t));'], Fe: ['...(e?.modelId ? { modelId: e.modelId } : {}),'],
      S: ['let { worktree: t, branch: n, ...r } = e ?? {},', 'place: Object.keys(i).length > 0 ? i : void 0,'] } },
  // shared-20 uA: a target's key; shared-28 l_: an SSH host's key (cead7e0c5 v reads both).
  { target: 'environment-target-key.mjs', source: 'shared-20-mUr7IqZY.js', exports: { uA: 'environmentTargetKey' },
    features: { uA: ['return `local:${e.wslDistro ?? ""}:${e.cwd}`;'] } },
  { target: 'ssh-host-key.mjs', source: 'shared-28-DNYlf4wu.js', exports: { l_: 'sshHostKey' }, features: { l_: ['return `${n === -1 ? "" : e.slice(0, n)}@${c_(e)}:${t ?? 22}`;'] } },
  // cecbf1aa5 S: the one saved environment whose target matches (Vx's `m`).
  { target: 'environment-match.mjs', source: 'cecbf1aa5-BT0v8IlE.js', exports: { S: 'uniqueMatchingEnvironment' },
    features: { S: ['return n.length === 1 ? n[0] : void 0;'] } },
  // cead7e0c5 v: the newest session record started at a target, as that target's settings (Vx's `m`).
  { target: 'recent-target-settings.mjs', source: 'cead7e0c5-BwXFC-CL.js', exports: { v: 'recentTargetSettings' },
    features: { v: ['let e = t.lastActivityAt ?? t.createdAt ?? 0;', 'return o ? d(o, t, a) : null;'] } },
  { target: 'save-environment.mjs', source: RAIL,
    exports: { Vx: 'useSaveEnvironmentSetup', Qx: 'RailSaveEnvironmentLink', $x: 'RailSaveEnvironmentRow', Xx: 'requestSaveEnvironment',
      Jx: 'recordSaveEnvironmentOutcome', Yx: 'saveEnvironmentCheckout', Bx: 'environmentFolderName', Nx: 'SaveAsEnvironmentLabel' },
    features: {
      Vx: ['besideNamed: c,', 'defaultMessage: "Folder", id: "ukQpDs7M+0"'],
      Qx: ['"data-testid": "rail-save-environment-link",', 'defaultMessage: "Save as environment",', 'defaultMessage: "Save", id: "fs11ci1KNs"', '() => Xx(t, r, n)',
        '"shrink-0 text-footnote text-muted-control"'],
      $x: ['"data-testid": "rail-save-environment",', 'defaultMessage: "Saved as environment \\u201C{name}\\u201D",', 's(Wf, { name: "Bookmark" })', 's(Nx, {})'],
      Xx: ['saveEnvironmentRequest: { setup: t, checkout: Yx(e, t, n), onSaved: r },', 'Jx(e, t, { savedAs: r.name })'],
      Jx: ['"updated"', 'moveLineOutcome:'], Yx: ['worktree: '],
      Bx: ['.slice(0, zx) || t'], Nx: ['defaultMessage: "Save as environment", id: "9klNTvm9bE"'],
    } },
  // ---- w10-ccres-rail-env-edit: TN's environmentAction (`kn`) over c73f45bc3 Zx (cf74bc599 M_) and fu (cf74bc599 n_) ----
  // Zx: the environment row's ghost, xs, icon-only "Settings" button ("Edit environment" for a local environment, "Edit
  // cloud environment" otherwise) that preloads its dialog on intent (shared-78 t3 over ou / cc5b397c6 l); fu: a saved
  // environment the rail can edit in place (local, not WSL, no variant).
  { target: 'environment-edit.mjs', source: 'c73f45bc3-B7hbL7H9.js', exports: { Zx: 'RailEditEnvironmentButton', fu: 'isRailEditableEnvironment' },
    features: {
      Zx: ['r = t === void 0 ? "cloud" : t,', 'o = yt(r === "local" ? ou : ml),', 'defaultMessage: "Edit environment", id: "cfNkVEwvig"',
        'defaultMessage: "Edit cloud environment", id: "B2B5sIxbna"', 'variant: "ghost",', 'size: "xs",', 'iconOnly: !0,', 'flush: "end",',
        'icon: "Settings",', '"aria-label": s,', 'onClick: n,'],
      fu: ['return e?.target.kind === "local" && !e.target.wslDistro && !e.target.variant;'],
    } },
  // ---- w13-close-rail-regen (cwui-46): the Pinned section's drag-pin coachmark (shared-22 aM, readable :12520-12776) ----
  // shared-22 rM: the Pinned section's messages ("Pinned", the coachmark's "Tip: you can drag {kind, select, …} here to pin
  // them", the drop row's "Drag to pin" / "Drop here" / "Let go"). aM formats dragPinHint with kind = the sidebar's kind
  // (`G && t === "chat" ? "code" : t`, G the hub look, off here).
  { target: 'pinned-section-messages.mjs', source: 'shared-22-Bwn3sJTG.js', exports: { rM: 'pinnedSectionMessages' },
    features: { rM: ['pinned: { defaultMessage: "Pinned", id: "A8GDlh2QW4" },', 'id: "3R0FD3r1RO",',
      '"Tip: you can drag {kind, select, code {sessions} cowork {tasks} other {chats}} here to pin them"',
      'dragToPin: { defaultMessage: "Drag to pin", id: "a6msxIE91i" },', 'dropHere: { defaultMessage: "Drop here", id: "Au4AP9NTeL" },',
      'letGo: { defaultMessage: "Let go", id: "9Z0I31VbJD" },'] } },
  // shared-frame Sj (exported Fi): the CDS coachmark aM opens (open, introDelay seconds before it shows, accent variant,
  // showClose keeps it open on outside press / focus out / Escape). cowork-scheduled holds and exports the one copy; it is
  // re-exported here under a semantic name for the sidebar host (src/source-drag-pin-hint.jsx).
  { target: 'coachmark.mjs', source: 'shared-frame-6jtSkIit.js', exports: { Sj: 'CdsCoachmark' },
    features: { Sj: ['({ open: i, onOpenChange: r, introDelay: n, variant: o, ...a } = e),', 'o === void 0 ? "accent" : o,',
      'let e = window.setTimeout(() => l(!0), n * 1e3);', '_ = !!a.showClose || !!a.action,',
      't.reason === "outside-press" || t.reason === "focus-out" || t.reason === "escape-key"'] } },
];

// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration).
const callSites = [
  // cf74bc599 TN (EpitaxySessionRailHost = LN = memo(TN)): the data assembly the host replaces (it reads claude.ai meta,
  // remote environments, Remote Control, engine plugins, artifacts). SR-7's assembler builds Zj's props from host data with
  // the pure derivations above, and calls the timing / checkout hooks as TN does: SN with Tj (6 s) for the discovery, meta
  // and draft-rail holds, with e_ (_v, 2 s) for the environment name; xN for the working folder and its origin; mN for the
  // composer menu → section link. 3.6556.2 adds the engine plugin rail panes (`pluginSections: wn`), the SSH
  // `sshConnectionRemoved` meta field, the environment editor request and the Context card's Skills / Memory / MCP
  // openers (panes §2.1 C1-5, C1-8, C1-10).
  { source: RAIL, binding: 'TN', role: 'Rail host data assembly (EpitaxySessionRailHost): host replacement in SR-7, calling the generated pieces as written',
    features: ['mN(n, t.id);', 'R = SN(!L && A, Tj),', 'H = SN(z !== null && (!L || !V), Tj),', 'K = xN(te, L?.remote),',
      'ne = xN(E && L?.originCwd !== te ? L?.originCwd : void 0, L?.remote),', 'Ae = SN(!!Y && !ke && ((de && !X) || ue), e_),',
      'Pe = L?.sshConnectionRemoved === !0,', 'labelOf: HA,', 'targets: e.counts.listedTargets,', 'repos: N ? [] : gj(M ?? [], G, r).map(AN),',
      '.filter((e) => !i.has(e) && !Hj(e)),', 'openSkills: Je ? Ye : null,', 'openMemory: v,', 'mcpToolOpener: Ze,', 'pluginSections: wn,',
      'n.setState({ editEnvironmentRequest: xn })', 's(Qx, { scopeStore: n, sessionId: t.id, setup: bn })'] },
];
// Pinned on the minified bytes (each must occur exactly once). `loose: true` matches through official.looseFeature (R2/E5;
// `keep` names stay literal).
const rawCallSites = [
  { source: RAIL, role: 'TN passes the session MCP counts to the Connectors card with their opener (by the server\'s target)', loose: true, keep: ['yj', 'HA'],
    features: ['servers:yj({names:e.counts.listedNames,states:e.counts.listedStates,iconTypes:e.counts.listedIconTypes,iconSrcs:e.counts.listedIconSrcs,targets:e.counts.listedTargets,labelOf:HA}),onOpen:t=>Xe(t,e.onOpen)'] },
  { source: RAIL, role: 'TN builds the save setup with Vx and passes $x (stacked) / Qx (flat, beside an unnamed environment row)', loose: true, keep: ['Vx', 'Qx', '$x'],
    features: ['vn=t.type==="local",yn=d&&!_e,bn=Vx(', 's($x,{scopeStore:n,sessionId:t.id,setup:bn})', 's(Qx,{scopeStore:n,sessionId:t.id,setup:bn})'] },
  // w10-ccres-rail-env-edit: TN's environmentAction. `y` is the scope store's cloud editor opener (PN), `xn` a local
  // session's named environment the rail can edit (n_ = c73f45bc3 fu), `Sn` puts it on the scope store as the edit request
  // and `kn` is M_ (c73f45bc3 Zx), handed to Zj as environmentAction.
  { source: RAIL, role: 'TN builds the environment row\'s Edit environment action (M_ = c73f45bc3 Zx) and its edit request', loose: true,
    keep: ['M_', 'n_', 'PN', 'Xr'],
    features: ['y=Xr(n,PN)', 't.type==="local"&&!l&&n_(_e)?_e.id:null', '()=>n.setState({editEnvironmentRequest:xn})',
      'y?s(M_,{onOpen:y}):xn===null?void 0:s(M_,{kind:"local",onOpen:Sn})', 'onEditGoal:ct,connectors:$e,computer:Dn,environmentAction:kn,saveEnvironment:An,'] },
  { source: 'c73f45bc3-B7hbL7H9.js', role: 'c73f45bc3 exports fu as Jn and Zx as l', features: ['fu as Jn,', 'Zx as l,'] },
  { source: RAIL, role: 'cf74bc599 imports c73f45bc3 Jn as n_ (fu) and l as M_ (Zx)', features: ['Jn as n_,', ',l as M_,'] },
  { source: 'c73f45bc3-B7hbL7H9.js', role: 'The environment dialog clears the scope store\'s save / edit requests and hands the created environment to onSaved',
    features: ['t.setState({saveEnvironmentRequest:null,editEnvironmentRequest:null})', 't.getState().saveEnvironmentRequest?.onSaved(r)'] },
  { source: 'cc43287c9-Me-M2ucD.js', role: 'The session view puts the MCP opener on the scope store while it is available', loose: true,
    features: ['t.setState({openSessionMcpDialog:iv}),()=>t.setState({openSessionMcpDialog:null})'] },
  { source: RAIL, role: 'cf74bc599 exports the rail host as EpitaxySessionRailHost (LN = memo(TN)); the kit lazy slot picks it', loose: true, keep: ['LN', 'TN'],
    features: ['LN as EpitaxySessionRailHost', 'LN=y(TN)'] },
  // w13-close-rail-regen (cwui-46): aM's coachmark, written by the sidebar host (src/source-drag-pin-hint.jsx) over the
  // generated CdsCoachmark (Sj, imported as j) and pinnedSectionMessages (rM); the menu pin (shared-11 Nw / shared-21 n0)
  // asks for it, a drag pin (lW onFirstPin: HM / lP) and its close mark it seen, the sidebar store persists seenDragPinHint.
  { source: 'shared-22-Bwn3sJTG.js', role: 'aM opens the drag-pin coachmark under the Pinned heading for the live kind, Hand icon and the hint',
    features: ['Ae&&t===je&&!Ne&&o(j,{open:!0,onOpenChange:(e,t)=>!e&&t?.reason!=="outside-press"&&ke(),anchor:ze,side:gd("inline-end",oe),introDelay:.3,"aria-label":Me,showClose:!0,children:f("div",{className:"flex flex-row items-start gap-sm min-w-[13rem]",children:[o(L,{name:"Hand",size:"md",className:"shrink-0"}),o("p",{children:Me})]})})',
      'W.formatMessage(rM.dragPinHint,{kind:G&&t==="chat"?"code":t})', 'o("div",{ref:ze,children:_t})', 'Fi as j,', 'od as L,', 'js as gd,'] },
  { source: 'shared-22-Bwn3sJTG.js', role: 'A drag pin marks the hint seen (lW onFirstPin)', count: 2, features: ['return En.getState().markDragPinHintSeen()'] },
  { source: 'shared-21-R7LldJ05.js', role: 'lW calls onFirstPin after a drag pin', features: ['t.type==="pin"&&o?.()'] },
  { source: 'shared-11-_AVGLHEz.js', role: 'A menu pin asks for the hint (Nw)', features: ['t||J.getState().maybeShowDragPinHint()'] },
  { source: 'shared-52-uHFNjl7C.js', role: 'The sidebar store: the hint shows once (not seen, sidebar not collapsed / docked / narrow / drilled down) and is persisted',
    features: ['markDragPinHintSeen:()=>e({seenDragPinHint:!0,showDragPinHint:!1})',
      'maybeShowDragPinHint:()=>e(e=>e.seenDragPinHint||e.collapsed||Hg(e)||e.isRouteDrilldown?e:{showDragPinHint:!0})', '["seenDragPinHint"]'] },
  { source: RAIL, role: 'The card stack imports dnd-kit from c09f6b4e5 (13 names)', loose: true,
    features: ['import{_ as hy,a as gy,d as _y,i as vy,l as yy,n as by,o as xy,p as Sy,s as Cy,t as wy,v as Ty,x as Ey,y as Dy}from"./c09f6b4e5-CLm8I7_i.js"'] },
];

const cache = new Map();
async function readSource(name) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  const patternNames = (node, out = []) => {
    if (!node) return out;
    if (node.type === 'Identifier') out.push(node.name);
    else if (node.type === 'ObjectPattern') for (const p of node.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
    else if (node.type === 'ArrayPattern') for (const e of node.elements) patternNames(e, out);
    else if (node.type === 'AssignmentPattern') patternNames(node.left, out);
    else if (node.type === 'RestElement') patternNames(node.argument, out);
    return out;
  };
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (d.id.type === 'Identifier') top.set(d.id.name, { kind: 'var', node: d });
        else for (const n of patternNames(d.id)) top.set(n, { kind: 'pattern', node: d });
      }
    } else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
  }
  // Top-level statements that initialise a binding after its declaration: a TypeScript enum body
  // (`(function (e) { e.Space = "Space", … })(Q ||= {})`) or a static member (`rt.activators = [ … ]`). Each belongs to
  // the bindings it writes (an assignment to a top-level name, or to a member of one, outside any local scope) and is
  // emitted with them; a statement that writes no top-level binding (a listener, a style tag) belongs to nothing.
  const initializers = new Map();
  for (const node of ast.program.body) {
    if (node.type !== 'ExpressionStatement') continue;
    const text = code.slice(node.start, node.end);
    const parsed = babel.babelParse(text, `${name}@${node.start}`, true);
    const targets = new Set(), reads = new Set();
    babel.traverse(parsed, {
      Program(p) { for (const g of Object.keys(p.scope.globals)) if (top.has(g)) reads.add(g); },
      AssignmentExpression(p) {
        const left = p.node.left;
        const id = left.type === 'Identifier' ? left : left.type === 'MemberExpression' && left.object.type === 'Identifier' ? left.object : null;
        if (id && !p.scope.hasBinding(id.name) && top.has(id.name)) targets.add(id.name);
      },
    });
    const entry = { kind: 'statement', node, deps: [...reads], targets: [...targets] };
    for (const target of targets) {
      if (!initializers.has(target)) initializers.set(target, []);
      initializers.get(target).push(entry);
    }
  }
  const record = { name, bytes, code, ast, exported, top, initializers, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' || entry.kind === 'pattern' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
const bindingName = entry => (entry.kind === 'statement' ? `#init@${entry.node.start}` : null);
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
function declarationDeps(src, name) {
  if (src.deps.has(name)) return src.deps.get(name);
  const entry = src.top.get(name);
  const ast = babel.babelParse(emittedText(src, entry), `${src.name}#${name}`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const deps = globals.filter(n => n !== name && src.top.has(n));
  src.deps.set(name, deps);
  return deps;
}
function closureText(src, name) {
  const seen = new Set(), parts = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const entry = src.top.get(n);
    if (!entry || entry.kind === 'import') return;
    parts.push(declarationText(src, entry));
    for (const dep of declarationDeps(src, n)) visit(dep);
  };
  visit(name);
  return parts.join('\n');
}
const normalised = text => text.replace(/\s+/g, ' ');
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}

const jsonCache = new Map();
async function readJson(file) {
  if (!jsonCache.has(file)) jsonCache.set(file, JSON.parse(await fs.readFile(file, 'utf8')));
  return jsonCache.get(file);
}
function exportedNames(text) {
  const out = new Map();
  for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean)) {
      const [local, as] = part.split(/\s+as\s+/);
      out.set(local, [...(out.get(local) ?? []), as ?? local]);
    }
  return out;
}
// An area's manifest for this release (its compat helper's view where it has one), or null while that area is on another
// release with no view of this one (its modules then slice nothing of 3.6556.2). All five areas below are 3.6556.2 now
// (turn-box included), so each answers its current manifest.
const compatManifests = {
  'sidebar-resize': () => sidebarResizeManifestFor(referenceVersion), 'turn-box': () => turnBoxManifestFor(referenceVersion),
  'routines-shared': () => routinesSharedManifestFor(referenceVersion), 'mcp-app-card': () => mcpAppCardManifestFor(referenceVersion),
  'sidebar-reorder': () => sidebarReorderManifestFor(referenceVersion),
};
async function areaManifest(area) {
  const viewFor = compatManifests[area];
  if (!viewFor) return readJson(path.join(generatedRoot, area, 'manifest.json')).catch(() => null);
  try {
    return await viewFor();
  } catch (error) {
    if (/ is .*, expected /.test(error.message)) return null;
    throw error;
  }
}
let areas;
async function loadAreas() {
  if (areas) return areas;
  const viewTabs = await viewTabsManifestFor(referenceVersion);
  if (viewTabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${viewTabs.referenceVersion}, expected ${referenceVersion}`);
  const publicByLocal = new Map();
  for (const [name, entry] of Object.entries(viewTabs.publicNames ?? {})) publicByLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  const viewTabsBindings = new Map();
  for (const m of viewTabs.modules) viewTabsBindings.set(m.source, new Set(m.bindings));
  const kit = await readJson(path.join(generatedRoot, 'session-rail-kit/manifest.json'));
  if (kit.referenceVersion !== referenceVersion) throw Error(`session-rail-kit is ${kit.referenceVersion}, expected ${referenceVersion}`);
  const kitByLocal = new Map();
  for (const [name, entry] of Object.entries(kit.publicNames)) kitByLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  // Every 2.42304.0 binding another generated area slices: file#local -> [{ area, target }].
  const slicedElsewhere = new Map();
  for (const area of (await fs.readdir(generatedRoot, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name)) {
    if (area === 'session-rail' || area === 'view-tabs') continue;
    const manifest = await areaManifest(area);
    if (!manifest || !Array.isArray(manifest.modules)) continue;
    for (const m of manifest.modules) {
      if (typeof m.source !== 'string' || typeof m.target !== 'string') continue;
      if ((m.referenceVersion ?? manifest.referenceVersion) !== referenceVersion) continue;
      if (m.source.includes('/') && !m.source.includes(`/${referenceSnapshot}/`)) continue;
      const file = path.basename(m.source);
      // R4i GR4: a chunk another area copies byte for byte (`kind: "copy"`, e.g. sidebar-reorder dnd-kit.mjs) holds every
      // top-level declaration of that chunk, under the chunk's own export names.
      const held = m.kind === 'copy' && !m.bindings
        ? [...(await readSource(file)).top].filter(([, entry]) => entry.kind !== 'import').map(([local]) => local)
        : m.bindings ?? [];
      for (const b of held) {
        const local = typeof b === 'string' ? b : b.name;
        const key = `${file}#${local}`;
        if (!slicedElsewhere.has(key)) slicedElsewhere.set(key, []);
        slicedElsewhere.get(key).push({ area, target: m.target });
      }
    }
  }
  areas = { publicByLocal, viewTabsBindings, kitByLocal, slicedElsewhere };
  return areas;
}
const areaExports = new Map();
async function areaExport(area, target) {
  const key = `${area}/${target}`;
  if (!areaExports.has(key)) areaExports.set(key, area === 'sidebar-resize' ? await sidebarResizeExportsFor(referenceVersion, target) : area === 'turn-box' ? await turnBoxExportsFor(referenceVersion, target) : area === 'mcp-app-card' ? await mcpAppCardExportsFor(referenceVersion, target) : area === 'sidebar-reorder' ? await sidebarReorderExportsFor(referenceVersion, target) : exportedNames(await fs.readFile(path.join(generatedRoot, area, target), 'utf8')));
  return areaExports.get(key);
}

// vendor-frame: the export alias of `local` that official.reactAliases lists, proved once (R3; aliases were reused across
// releases, so never by the old name).
const provedAliases = new Set();
async function reactMember(file, local) {
  if (file !== VENDOR_FRAME) return null;
  const src = await readSource(file);
  const alias = [...src.exported].find(([name, l]) => l === local && Object.hasOwn(official.reactAliases, name))?.[0];
  if (!alias) return null;
  if (!provedAliases.has(alias)) { official.assertVendorAlias(src.code, alias); provedAliases.add(alias); }
  const [module, member] = official.reactAliases[alias];
  return { from: module, name: member };
}
const rank = area => { const i = importableAreas.indexOf(area); return i === -1 ? importableAreas.length : i; };
// W13 G11 (D1): shared-0 Pa (lazyInit) is routines-shared's import-free shared-0 copy; code-current lazy-init.mjs only
// re-exports it, and the r4e / r3b `once` / `lazyValue` modules are per-graph copies, so the rail imports that one.
const preferredArea = { 'shared-0-DDOOdL6P.js#Pa': 'routines-shared' };
const posix = p => p.split(path.sep).join('/');
const rel = (fromFile, toFile) => { const r = posix(path.relative(path.dirname(fromFile), toFile)); return r.startsWith('.') ? r : `./${r}`; };

export async function extractSessionRail({ check = false, explore = null } = {}) {
  const { publicByLocal, viewTabsBindings, kitByLocal, slicedElsewhere } = await loadAreas();
  const emitted = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-session-rail.mjs',
    adapterModule: 'src/source-session-rail-adapters.jsx', modules: [], publicNames: {}, callSites: [],
  };
  const files = {};
  const ownModule = (file, local) => emitted.find(m => m.spec.source === file && Object.hasOwn(m.spec.exports, local));
  // An importable area's export of the very original binding file:local (its one copy), or null.
  const areaImport = async (spec, file, local, via) => {
    const self = path.join(output, spec.target);
    const elsewhere = slicedElsewhere.get(`${file}#${local}`) ?? [];
    const first = preferredArea[`${file}#${local}`];
    const importable = elsewhere.filter(e => importableAreas.includes(e.area))
      .sort((a, b) => (b.area === first) - (a.area === first) || rank(a.area) - rank(b.area));
    for (const { area, target } of importable) {
      const names = (await areaExport(area, target)).get(local);
      if (names?.length) return { from: rel(self, path.join(generatedRoot, area, target)), name: names[0], via, kind: area, original: `${file}:${local}` };
    }
    return null;
  };
  // Resolves the original binding file:local to an import, or null when it is to be sliced (same chunk only).
  const resolveBinding = async (spec, file, local, via) => {
    const self = path.join(output, spec.target);
    const adapter = adapters[`${file}:${local}`];
    if (adapter) {
      const dep = await readSource(file);
      const original = dep.top.get(local);
      if (!original || original.kind === 'import') throw Error(`${spec.target}: adapter ${via} (${local}) is not a declaration of ${file}`);
      try {
        assertFeatures(`${spec.target}: adapter ${via} (${local})`, adapter.closure ? closureText(dep, local) : await featureText(dep, original), adapter.features);
      } catch (error) {
        if (!explore) throw error;
        explore.push({ target: spec.target, via: 'ADAPTER-FEATURE', local, size: error.message });
      }
      return { from: adapter.module ?? adapterModule, name: adapter.name, via, kind: 'adapter', original: `${file}:${local}` };
    }
    const owner = ownModule(file, local);
    if (owner) return { from: `./${owner.spec.target}`, name: owner.spec.exports[local], via, kind: 'generated', original: `${file}:${local}` };
    const kit = kitByLocal.get(`${file}#${local}`);
    if (kit) return { from: rel(self, path.join(generatedRoot, 'session-rail-kit', kit.target)), name: kit.name, via, kind: 'session-rail-kit', original: `${file}:${local}` };
    const pub = publicByLocal.get(`${file}#${local}`);
    if (pub) return { from: rel(self, path.join(generatedRoot, 'view-tabs', pub.file)), name: pub.name, via, kind: 'view-tabs', original: `${file}:${local}` };
    const react = await reactMember(file, local);
    if (react) return { ...react, via, kind: 'react' };
    const shared = await areaImport(spec, file, local, via);
    if (shared) return shared;
    const elsewhere = slicedElsewhere.get(`${file}#${local}`) ?? [];
    const unlisted = unlistedSlices(`${file}:${local}`, elsewhere);
    if (unlisted.length) {
      const where = unlisted.join(', ');
      const message = `${spec.target}: ${via} (${local}) is sliced by ${where} but not exported there; it must not be sliced twice`;
      if (!explore) throw Error(message);
      explore.push({ target: spec.target, via: 'DUPLICATE', local: `${file}:${local}`, size: where });
    }
    return null;
  };
  for (const spec of modules) {
    const src = await readSource(spec.source);
    const selected = new Map(), imports = new Map(), seen = new Set(), contexts = [], aliases = new Map();
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const entry = src.top.get(name);
      if (!entry) throw Error(`${spec.target}: unbound ${name}`);
      if (entry.kind === 'import') {
        const dep = await readSource(entry.file);
        const local = dep.exported.get(entry.alias);
        const via = `${entry.file}:${entry.alias}`;
        if (!local) throw Error(`${spec.target}: ${via} is not exported`);
        const resolved = await resolveBinding(spec, entry.file, local, via);
        if (resolved) { imports.set(name, resolved); return; }
        if (explore) {
          explore.push({ target: spec.target, via, local, size: closureText(dep, local).length });
          imports.set(name, { from: '__unresolved__', name: local, via, kind: 'unresolved' });
          return;
        }
        throw Error(`${spec.target}: unresolved import ${via} (${local})`);
      }
      const isRoot = Object.hasOwn(spec.exports, name);
      const member = members[`${spec.source}:${name}`];
      if (member && !isRoot) {
        // `<compound>.<Member>`: the compound's original declaration names this binding as that member.
        const compound = src.top.get(member.of);
        assertFeatures(`${spec.target}: ${member.of}.${member.member}`, await featureText(src, compound), [`${member.member}: ${name},`]);
        await add(member.of);
        aliases.set(name, `${member.of}.${member.member}`);
        return;
      }
      if (!isRoot) {
        const resolved = await resolveBinding(spec, spec.source, name, `${spec.source}:${name}`);
        if (resolved) { imports.set(name, resolved); return; }
      } else if (adapters[`${spec.source}:${name}`] || publicByLocal.has(`${spec.source}#${name}`) || kitByLocal.has(`${spec.source}#${name}`)) {
        throw Error(`${spec.target}: root ${name} is provided elsewhere`);
      } else {
        // A root another importable area already slices and exports: import that copy, re-export it under this name.
        const shared = await areaImport(spec, spec.source, name, `${spec.source}:${name}`);
        if (shared) { imports.set(name, { ...shared, reexport: true }); return; }
      }
      if (entry.kind === 'pattern' && explore) { explore.push({ target: spec.target, via: 'PATTERN', local: name, size: 0 }); imports.set(name, { from: '__unresolved__', name, via: 'pattern', kind: 'unresolved' }); return; }
      if (entry.kind === 'pattern') throw Error(`${spec.target}: ${spec.source}:${name} is a destructured declaration; it needs an adapter`);
      if (entry.kind !== 'function' && entry.kind !== 'var' && entry.kind !== 'class') throw Error(`${spec.target}: unsupported declaration ${name}`);
      const text = declarationText(src, entry);
      if (/\bimport\s*\(/.test(text)) throw Error(`${spec.target}: dynamic import inside ${name}`);
      selected.set(name, entry);
      for (const dep of declarationDeps(src, name)) await add(dep);
      for (const init of src.initializers.get(name) ?? []) {
        if (selected.has(bindingName(init))) continue;
        selected.set(bindingName(init), init);
        for (const dep of init.deps) await add(dep);
      }
      // A context: its creator resolves to React's createContext. One instance only.
      const init = entry.kind === 'var' ? entry.node.init : null;
      if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
        const callee = imports.get(init.callee.name);
        if (callee?.kind === 'react' && callee.name === 'createContext') {
          if (viewTabsBindings.get(spec.source)?.has(name) && !contextDuplicates[`${spec.source}:${name}`]) {
            const message = `${spec.target}: context ${spec.source}:${name} already lives in view-tabs; slicing it would make a second instance`;
            if (!explore) throw Error(message);
            explore.push({ target: spec.target, via: 'CONTEXT', local: name, size: message });
          }
          contexts.push(name);
        }
      }
    };
    for (const name of Object.keys(spec.exports)) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import') throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      try {
        assertFeatures(`${spec.target}: root ${name}`, await featureText(src, entry), spec.features?.[name]);
        assertFeatures(`${spec.target}: root ${name} (closure)`, closureText(src, name), spec.closureFeatures?.[name]);
      } catch (error) {
        if (!explore) throw error;
        explore.push({ target: spec.target, via: 'FEATURE', local: name, size: error.message });
      }
      await add(name);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    if (explore) {
      manifest.modules.push({ target: spec.target, bindings: order.map(([name, entry]) => ({ name, size: entry.node.end - entry.node.start })),
        imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind })), exports: spec.exports,
        aliases: [...aliases].map(([local, of]) => `${local}=${of}`) });
      emitted.push({ spec });
      continue;
    }
    const blocks = order.map(([, entry]) => emittedText(src, entry));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => {
      const star = names.filter(n => n.startsWith('* as ')), named = names.filter(n => !n.startsWith('* as '));
      return [...star.map(n => `import ${n} from ${JSON.stringify(from)};`),
        ...(named.length ? [`import { ${named.join(', ')} } from ${JSON.stringify(from)};`] : [])].join('\n');
    }).join('\n');
    const aliasText = [...aliases].map(([local, of]) => `var ${local} = ${of};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-session-rail.mjs.\n// Edit the extractor or src/source-session-rail-adapters.jsx, never this file.\n`;
    const aliasHeader = aliases.size ? `// Members of the view-tabs compound ${[...new Set([...aliases.values()].map(v => v.split('.')[0]))].join(', ')} (checked against its original declaration).\n` : '';
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${aliasHeader}${aliasText}\n${exportText}\n`, { parser: 'babel' });
    // The module must be closed: every identifier it reads is imported or declared in it.
    const closed = babel.babelParse(text, spec.target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const allowed = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'String', 'Set', 'Map', 'JSON', 'Symbol', 'Promise', 'RegExp',
      'globalThis', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'parseFloat', 'parseInt', 'Date', 'Intl', 'undefined', 'Infinity',
      'WeakMap', 'WeakSet', 'Boolean', 'window', 'document', 'console', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
      'TypeError', 'Reflect', 'navigator', 'queueMicrotask', 'performance', 'getComputedStyle', 'NaN', 'isNaN', 'isFinite', 'Element', 'HTMLElement',
      'Node', 'reportError', 'ResizeObserver', 'URL', 'Event', 'KeyboardEvent', 'arguments', 'SVGElement', 'Image', 'decodeURIComponent']);
    const unbound = globals.filter(name => !allowed.has(name));
    if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}), ...(e.reexport ? { reexport: true } : {}) })),
      ...(aliases.size ? { members: Object.fromEntries(aliases) } : {}),
      exports: spec.exports,
      ...(contexts.length ? { contexts } : {}),
    });
    emitted.push({ spec });
    for (const [local, name] of Object.entries(spec.exports)) {
      if (manifest.publicNames[name]) throw Error(`public name ${name} is used twice`);
      manifest.publicNames[name] = { file: spec.source, local, target: spec.target };
    }
  }
  if (explore) return manifest;
  for (const site of callSites) {
    const src = await readSource(site.source);
    const entry = src.top.get(site.binding);
    if (!entry || entry.kind === 'import') throw Error(`call site ${site.source}:${site.binding} is not a declaration`);
    assertFeatures(`call site ${site.source}:${site.binding}`, await featureText(src, entry), site.features);
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(declarationText(src, entry)), features: site.features });
  }
  for (const site of rawCallSites) {
    const bytes = await fs.readFile(path.join(source, site.source));
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = site.loose ? (text.match(official.looseFeature(feature, { keep: site.keep ?? [], flags: 'g' })) ?? []).length : text.split(feature).length - 1;
      if (count !== (site.count ?? 1)) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected ${site.count ?? 1}`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, ...(site.loose ? { loose: true } : {}), features: site.features });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Session rail output set changed: ${present.join(',')}. Run scripts/extract-session-rail.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Session rail source mismatch: ${name}. Run scripts/extract-session-rail.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} session rail modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--explore')) {
    const found = [];
    const manifest = await extractSessionRail({ explore: found });
    for (const m of manifest.modules) {
      console.log(`${m.target}\t${m.bindings.length} bindings\t${m.bindings.reduce((n, b) => n + b.size, 0)} bytes`);
      console.log(`  BINDINGS ${m.bindings.map(b => `${b.name}(${b.size})`).join(' ')}`);
      if (m.aliases.length) console.log(`  ALIASES ${m.aliases.join(' ')}`);
      for (const kind of [...new Set(m.imports.map(i => i.kind))]) console.log(`  ${kind}: ${m.imports.filter(i => i.kind === kind).map(i => `${i.local}=${i.name}`).join(' ')}`);
    }
    for (const f of found) console.log(`UNRESOLVED ${f.target}\t${f.via}\t${f.local}\t${f.size}`);
  } else await extractSessionRail({ check: process.argv.includes('--check') });
}
