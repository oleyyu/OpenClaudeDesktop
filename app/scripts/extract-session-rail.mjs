// R4f-rail SR-2: extract the 2.42304.0 Code session rail's view (the "Session details" aside) without executing any
// desktop runtime (decision D0: own generator, own output folder src/generated/session-rail, own
// scripts/verify-gen-session-rail.mjs). Spec: analysis/code-ui-migrate-20261017/research/r4-session-rail.md §1.2, §2,
// §8 SR-2, §10. The rail's primitives, stores and shell are SR-1's session-rail-kit, imported by public name.
//
//   rail-view.mjs          cf74bc599 iD (memo; the session key provider) → rD (<aside aria-label="Session details">: the
//                          region entry, the scroll area and the card stack) → DE / wE (the dnd-kit sortable card stack:
//                          order / hidden from epitaxy.sessionRailSections, slot presence, drop animation) and the cards:
//                          Environment (environment row bD / xD, folder rows gD / _D / hD, branch row, worktree mark),
//                          Connectors (lD / uD / cD), Outputs (xE / bE / _E / gE / hE), Changes (the PR bar slot under
//                          the row / sans contexts), plus TD (the inline skeleton).
//   rail-derive.mjs        cf74bc599's pure derivations fO feeds rD with: folder RE, extra folders ME, branch HE / VE,
//                          worktree XE, lazy worktree ZE / QE, environment GE / KE / UE, connectors PE / uE, plan nD,
//                          Remote Control zE, the meta fields rO, the composer menu → section map tO, the git-info select
//                          sO, BE (6 s); rail-hooks.mjs: lO (the pending hold), cO (the checkout's branch and repo name over
//                          the git-info query), nO (a composer menu request opens its rail section).
//   dnd-kit.mjs            c09f6b4e5: core, sortable and utilities as DE / wE use them. R4i GR4: its 13 roots are imported
//                          from sidebar-reorder's byte-for-byte copy of the chunk (the one copy) and re-exported here.
//   save-environment.mjs   R4i-rail RL1: cf74bc599 Ay (the rail's "save this folder as an environment" setup), Iy (the flat
//                          rail's "Save" link beside the environment row), Ly (the stacked rail's row), Py / Ny / My (the
//                          save request on the scope store, its checkout, the outcome), ky (the suggested name); with
//                          cd0cf5b5e p / Fe (target equality, model settings), cead7e0c5 b (the last session's settings for
//                          a target) and their small originals (shared-20 Wk, shared-28 oh). The environment store (cd0cf5b5e
//                          z), the local sessions store (shared-8 Q), the session → environment record (shared-19 D7), the
//                          non-local environment create (c73f45bc3 Kc) and the model alias table (c4e18af0a c) are host
//                          adapters in src/source-session-rail-adapters.jsx.
//   …                      and the small originals those read (c4db265df ft, shared-25 zU / ZU / $U, shared-19 u$ / P7,
//                          shared-frame iC, c96d752d0 qz / Yz, c5304ebdb O, ccc47c03f N, shared-52 Ha / UV / Gs, shared-7
//                          MT / jT, shared-130 rR / FE / NE, shared-78 mN, shared-11 Ed, c73f45bc3 gg).
//
// fO (the data assembly behind EpitaxySessionRailHost) is not emitted: it reads claude.ai session meta, remote
// environments, Remote Control and artifacts. Its text is pinned as a call site; the host assembler (SR-7) builds iD's
// props from host data with the derivations above and calls lO / BE / hg / cO / nO as fO does.
//
// Every emitted binding is an original top-level declaration sliced from the installed chunk (a module's bindings are
// the reachable closure of its roots; free variables by Babel scope analysis; a top-level statement that initialises a
// binding — a TypeScript enum body, a static member — goes with it). An import or same-chunk binding resolves, in this
// order, to: a host adapter in src/source-session-rail-adapters.jsx (feature-checked against the original it replaces),
// an earlier module of this area, a session-rail-kit public name, a view-tabs public name (D1/D24; a member of a public
// compound such as CdsDropdown.Item is read off the compound after checking its declaration names it), React, or an
// export of another generated area that slices the same original binding (one copy). A module root another importable
// area already slices and exports is imported from there and re-exported under this area's public name (R4i GR4: one
// copy, the public name kept for this area's consumers). A binding another area slices without exporting it is refused
// unless `duplicates` says why a second copy is harmless; a context view-tabs already instantiates is refused. Nothing
// else is accepted.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = '2.42304.0';
const referenceSnapshot = 'installed-2.42304.0-20261017';
const source = path.resolve(root, '../reference', referenceSnapshot, 'ion-dist/assets/v1');
const output = path.join(root, 'src/generated/session-rail');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-session-rail-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const VENDOR_FRAME = 'vendor-frame-DfPJ1QmD.js';

const reactNamespaces = {
  o: { module: 'react', features: ['.useSyncExternalStore=function', '.forwardRef=function', '.useEffectEvent=function'] },
  fe: { module: 'react/jsx-runtime', features: ['.jsxs='] },
  Ln: { module: 'react-dom', features: ['.createPortal=function', '.flushSync=function'] },
};
const reactNamespaceObjects = {
  a: { module: 'react', features: ['useInsertionEffect: () => B,', 'useSyncExternalStore: () => G,', 'version: () => re,'] },
};

// Host dependencies, keyed by the original binding (file:local) an import or same-chunk reference resolves to.
// `features` must appear in that binding's prettier form (`closure: true`: in its same-chunk closure).
const adapters = {
  'vendor-intl-Db7hDWRO.js:q': { name: 'useIntl', features: ['let e = o(K);', 'return (Mt(e), e);'] },
  'vendor-intl-Db7hDWRO.js:Gt': { name: 'FormattedMessage', features: ['var Gt = u(Wt, Ut);'] },
  'shared-4-CJsHhp5n.js:NE': { name: 'RegionEntry', features: ['let t = AE((e) => e.body);', 'return t === null ? null : z(t, e);'] },
  'shared-frame-BfjMqbuN.js:qa': { name: 'useLayerElement', features: ['return W(Oa);'] },
  'shared-frame-BfjMqbuN.js:Ya': { name: 'useLayerOwnerWindow', features: ['return Ji(W(Oa));'] },
  'shared-7-B8UIMGDr.js:RT': { name: 'ConnectorIcon', features: ['disableServerUrlLookups: u,', 'case "favicon":', 'x(MT, { letter: h || "?", size: f, hideBorder: !d })',
    '"!border-0 !shadow-none !bg-transparent"'] },
  'shared-frame-BfjMqbuN.js:nd': { name: 'SkeletonGroup', features: ['"data-cds": "SkeletonGroup",', 'decorative: i = !1,', 'as: s,', 'motion: c = Ku,', 'let P = m ? X("block", r) : r;'] },
  'shared-frame-BfjMqbuN.js:dd': { name: 'Skeleton', features: ['var dd = Object.assign(rd, { Rows: od, Chip: sd, Lines: ld, Block: ud });'] },
  'shared-frame-BfjMqbuN.js:Jd': { name: 'useLayerAwareZIndex', features: ['let t = W(Vd);', 'return (Gd(`useCdsLayerAwareZIndex(${e})`, e), t + e);'] },
  // shared-frame Cd (TextLink): R4i-rail RL1 reads view-tabs' CdsTextLink (no adapter).
  'c856385e2-DVsjb2QL.js:In': { name: 'SessionFileRef', features: ['fileRef: e,', 'blockedClassName: c,', 'onOpenWithDefaultApp: () => {', 'return T === null'] },
  'c280f9bbb-Dw5U-PIG.js:L': { name: 'useFileIconSetEnabled', closure: true, features: ['function L(){return a(F)}', 'F="__gb__2954460583"'] },
  'c73f45bc3-CFrHin0p.js:Sv': { name: 'useScratchCopyOf', features: ['if (!t?.scratchCarried) return null;'] },
  'shared-11-BuQ3CK5I.js:Fd': { name: 'useLiveCheckoutBranch', closure: true, features: ['let t=Dd(t=>e?t.rows[e]?.branch:void 0);return Id(e),t', 'Pe?.getGitStateSnapshot'] },
  // cf74bc599 same-chunk bindings the host stands in for.
  'cf74bc599-D9NZWRyl.js:yE': { name: 'useSessionOutputPaths', features: ['let i = Sm(e),', 'c = f(() => qh(Yd(e, i, null, a, o, s), t, n, r), [e, i, a, o, s, t, n, r]);', 'return N(c);'] },
  'cf74bc599-D9NZWRyl.js:sE': { name: 'useGoneOutputPaths', features: ['o = he?.resolveSessionFile !== void 0,', 'return rE;'] },
  'cf74bc599-D9NZWRyl.js:ED': { name: 'RemoteControlRow', features: ['function ED({ remoteControl: e, icon: t }) {', 'e.lockedByRemoteClient'] },
  'cf74bc599-D9NZWRyl.js:CD': { name: 'GoalCardBody', features: ['goal: e,', 'cutWhenLastShown: n,', 'children: e.condition,'] },
  'cf74bc599-D9NZWRyl.js:pD': { name: 'ProgressCardBody', features: ['function pD({ steps: e, live: t, sessionKey: n }) {', 'disableCommentAttachment: !0,'] },
  // R4i-rail RL1 (save-environment.mjs): the stores and creators Ay / Py read.
  'cd0cf5b5e-BajR1nyG.js:z': { name: 'useEnvironmentStore', features: ['environments: [],', 'markStartedFrom: (t) =>', 'startedPlaces'] },
  'shared-8-B5lJ8U5C.js:Q': { name: 'useLocalSessionsStore', features: ['sessions: [],', 'name: "ccd-sessions-filter",'] },
  'shared-19-CkPOiIKm.js:D7': { name: 'recordSessionEnvironment', features: ['function D7(e, t) {', 'C7.getState().record(e, t)'] },
  'c73f45bc3-CFrHin0p.js:Kc': { name: 'addRemoteEnvironment', features: ['r.addEnvironment({ ...e, name: e.name.trim() })', 'r.markStartedFrom(i.id),'] },
  'c4e18af0a-BPhGaxmd.js:c': { name: 'canonicalModelId', features: ['let i = r(e),', 'return `${t(i)}${a}`;'] },
  'cf74bc599-D9NZWRyl.js:mE': { name: 'ArtifactOutputRow', features: ['function mE({ artifact: e, onOpen: t }) {', 'surface: "session_rail",'] },
};
// Original bindings this generator slices although another area also slices them (not exported there). Each entry says
// why a second copy is harmless; anything that holds state is never listed here.
const duplicates = {
  // shared-130 Y: backslashes to slashes (code-current file-output-paths.mjs slices it without exporting it).
  'shared-130-DnUXVlYq.js:Y': 'pure function (no state)',
};
// R4i GR4: the former `copiedLater` list (shared-25 IU / RU / JU / qU, sliced here first and copied again by turn-box
// owner-window.mjs and routines-shared shared-25-DP8p7i1Z.mjs) is gone: stable-array.mjs now imports zU / ZU from
// turn-box (their one copy) and slices only $U / YU, so this area holds none of those bindings any more.
/** The other areas' slices of `file:local` that `duplicates` does not allow (one copy per binding). */
export function unlistedSlices(key, elsewhere) {
  if (duplicates[key]) return [];
  return elsewhere.map(e => `${e.area}/${e.target}`);
}
const contextDuplicates = {};
// Members of a view-tabs public compound component: `file:local` -> the compound's binding and member. The compound's
// original declaration must name the member (`Member: local`); the module then reads `<compound>.<Member>`.
const members = {
  'shared-frame-BfjMqbuN.js:XS': { of: 'EC', member: 'Item' },
  'shared-frame-BfjMqbuN.js:$S': { of: 'EC', member: 'Separator' },
  'shared-frame-BfjMqbuN.js:QS': { of: 'EC', member: 'Submenu' },
  'shared-frame-BfjMqbuN.js:ZS': { of: 'EC', member: 'SubmenuTrigger' },
  'shared-frame-BfjMqbuN.js:qS': { of: 'EC', member: 'Popup' },
};
// Generated areas whose exported roots this generator may import (one copy), in order of preference. Composer-owned
// areas (code-composer, landing-texture) are never imported, nor are the sibling rail areas generated in the same round
// (session-rail-sections, session-rail-changes): a binding they also slice is refused unless `duplicates` names it.
// R4i GR4 adds turn-box (shared-25 zU / ZU), routines-shared and sidebar-reorder (shared-19 u$), which own originals this
// area used to slice a second time.
const importableAreas = ['session-rail-kit', 'code-current', 'files-changes', 'r3b-transcript', 'r4e-findings', 'r4e-envbranch', 'r4e-plugin',
  'sidebar-sections', 'review-findings', 'session-load-error', 'retry-decision', 'app-switch', 'r3b-settings', 'r3b-tasks', 'btw-pane', 'sidebar-resize',
  'turn-box', 'routines-shared', 'sidebar-reorder',
  // R4i-rail RL1: mcp-app-card exports shared-52 Qf (as Pp, the selector memo Ay's local session read goes through).
  'mcp-app-card'];

const RAIL = 'cf74bc599-D9NZWRyl.js';
// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original (prettier-formatted) text.
const modules = [
  // ---- c09f6b4e5: dnd-kit (core, sortable, utilities) as the card stack DE / wE use it; imported from sidebar-reorder ----
  { target: 'dnd-kit.mjs', source: 'c09f6b4e5-DErbwtLQ.js',
    exports: { fe: 'useSensors', de: 'useSensor', ct: 'PointerSensor', rt: 'KeyboardSensor', $n: 'sortableKeyboardCoordinates', N: 'isKeyboardEvent',
      Dn: 'arrayMove', on: 'DndContext', _e: 'closestCenter', Vn: 'SortableContext', Ln: 'verticalListSortingStrategy', Yn: 'useSortable', P: 'CSS' },
    features: { fe: ['return a(() => [...e].filter((e) => e != null), [...e]);'], de: ['return a(() => ({ sensor: e, options: t ?? {} }), [e, t]);'],
      ct: ['var ct = class extends ot {'], rt: ['this.autoScrollEnabled = !1'], $n: ['if (Qn.includes(e.code)) {'], N: ['let { KeyboardEvent: t } = y(e.target);'],
      Dn: ['r.splice(n < 0 ? r.length + n : n, 0, r.splice(t, 1)[0])'], on: ['autoScroll: s = !0,', 'collisionDetection: m = be,'],
      _e: ['i = ge(t, t.left, t.top),'], Vn: ['strategy: o = Fn,'], Ln: ['activeIndex: t,', 'overIndex: a,'], Yn: ['animateLayoutChanges: t = Un,'],
      P: ['"translate3d(" +'] } },
  // c4db265df ft: the region reading order rD hands the navigation region (`readingOrder: m(zg)`; nothing provides it here).
  { target: 'region-reading-order.mjs', source: 'c4db265df-CAC3hDZP.js', exports: { ft: 'RegionReadingOrderContext' }, features: { ft: ['var ft = c([]);'] } },
  // shared-25 zU (MU over RU / IU): an array kept while its items are the same (yE); ZU / $U: the shown output path.
  { target: 'stable-array.mjs', source: 'shared-25-DP8p7i1Z.js', exports: { zU: 'useStableArray', ZU: 'stripInvisible', $U: 'displayPath' },
    features: { zU: ['return MU(e, RU);'], ZU: ['return jU(e).replace(JU(), "");'], $U: ['return ZU(e).replace(YU(), "");'] } },
  // shared-19 u$: swallow the click that ends a pointer drag (DE's onDragStart); P7 / F7: the folder's parent, `~` for home.
  { target: 'drag-click-guard.mjs', source: 'shared-19-CkPOiIKm.js', exports: { u$: 'swallowNextClick', P7: 'homeRelativeParent' },
    features: { u$: ['e.addEventListener("click", t, !0),'], P7: ['let t = F7(e).replace(/[\\\\/][^\\\\/]*$/, "");'] } },
  // shared-frame iC: a CdsDropdown body from item descriptors (the folder chip's repo menu), its parts read as members of
  // the view-tabs CdsDropdown (EC = Object.assign(cC, { …, Popup: qS, Item: XS, Separator: $S, Submenu: QS, SubmenuTrigger: ZS })).
  { target: 'menu-items.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { iC: 'renderMenuItems' },
    features: { iC: ['e === "separator"', 'onClick: e.onSelect,', 'disabledReason: e.disabledReason,'] } },
  // c96d752d0 qz: the Changes card's pull request count (rD's `Wo.Provider value: ge`; the PR bar slot reports into it).
  { target: 'pr-count-context.mjs', source: 'c96d752d0-BOCqU7c2.js', exports: { qz: 'RailPrCountContext' }, features: { qz: ['var qz = E(null);'] } },
  // c96d752d0 Yz (memo pLe): the folder name chip (Working folder / Additional folder), a menu trigger with repo items.
  { target: 'repo-name-chip.mjs', source: 'c96d752d0-BOCqU7c2.js', exports: { Yz: 'RepoNameChip' },
    features: { Yz: ['var Yz = M(pLe);'] } },
  // c5304ebdb O: the preview card placement the Outputs list sets (`placement: "beside-start"`, popupClassName mx-pad-md).
  { target: 'preview-placement.mjs', source: 'c5304ebdb-BdWv-4Wb.js', exports: { O: 'PreviewPlacementProvider' },
    features: { O: ['return i(D.Provider, { value: r, children: n });'] } },
  // ccc47c03f N: the Slack logo (an environment that started in Slack).
  { target: 'slack-logo.mjs', source: 'ccc47c03f-CKf5zpck.js', exports: { N: 'SlackLogo' }, features: { N: ['viewBox: "0 0 123 123",', 'fill: "#E01E5A",'] } },
  // shared-52 Ha / UV / Gs: "plugin:<plugin>:<connector>" names, the plugin's display name, an "owner/name" repo slug.
  { target: 'plugin-connector.mjs', source: 'shared-52-DGviI8xb.js', exports: { Ha: 'parsePluginConnector', UV: 'pluginDisplayName', Gs: 'parseRepoSlug' },
    features: { Ha: ['let t = e.match(/^plugin:([^:]+):(.+)$/);'], UV: ['return typeof e == "string" ? HV(e) : e.displayName || HV(e.name);'], Gs: ['let t = e.split("/");'] } },
  // shared-7 MT / jT: the connector icon's letter avatar and tile (the host's ConnectorIcon adapter composes them as RT does).
  { target: 'connector-icon-parts.mjs', source: 'shared-7-B8UIMGDr.js', exports: { MT: 'ConnectorLetterIcon', jT: 'ConnectorIconTile' },
    features: { MT: ['"shrink-0 flex items-center justify-center bg-surface-3 text-secondary",'], jT: ['style: { width: e, height: e, borderRadius: e * 0.27 },'] } },
  // shared-130 rR / FE / NE: a connector's saved tool-result file (`mcp-<server>-blob-<ms>-…`), identifier humanising, "-plugin".
  // Y is exported (2026-10-18) for transcript-rows, which links this area instead of slicing Y a second time.
  { target: 'saved-output.mjs', source: 'shared-130-DnUXVlYq.js', exports: { rR: 'savedConnectorOutput', FE: 'humanizeIdentifier', NE: 'stripPluginSuffix', Y: 'forwardSlashes' },
    features: { rR: ['if (t !== null) return { server: t[1], savedMs: Number(t[2]) };'], FE: ['.split(/[-_\\s]+/)'], NE: ['return e.replace(/-plugin$/, "");'],
      Y: ['return e.replace(/\\\\/g, "/");'] } },
  // shared-78 mN: a connector's display name (Claude in Chrome, Computer use, …).
  // YD / sN are exported (2026-10-18) for transcript-rows, which links this area instead of slicing them a second time.
  { target: 'connector-name.mjs', source: 'shared-78-D6VXYXaQ.js', exports: { mN: 'connectorDisplayName', YD: 'isAgentsConnector', sN: 'CLAUDE_IN_CHROME_NAME' },
    features: { mN: ['e === "claude-in-chrome"', 'e === "computer-use"'], YD: ['e.uuid === "f688f3fc-1d05-5bd1-9c48-9854ec083044"'], sN: ['var sN = "Claude in Chrome";'] } },
  // shared-11 Ed: a detached HEAD ("HEAD" / "detached:…"), which cO's git-info select (sO) drops.
  { target: 'branch-name.mjs', source: 'shared-11-BuQ3CK5I.js', exports: { Ed: 'isDetachedBranch' }, features: { Ed: ['return e === "HEAD" || e.startsWith("detached:");'] } },
  // c73f45bc3 gg (fO's hg): how long an environment name may stay pending before the skeleton gives up.
  { target: 'rail-timing.mjs', source: 'c73f45bc3-CFrHin0p.js', exports: { gg: 'NAME_PENDING_GIVE_UP_MS' }, features: { gg: ['var gg = 2e3;'] } },

  // ---- cf74bc599: the rail's pure derivations, and the fO pieces the host assembler (SR-7) calls as written ----
  { target: 'rail-derive.mjs', source: RAIL,
    exports: { RE: 'railFolder', LE: 'repoSlugName', $E: 'pathLeaf', ME: 'railExtraFolders', IE: 'folderTreeCwd', jE: 'otherRepos', VE: 'knownBranch',
      HE: 'railBranch', XE: 'railWorktree', YE: 'CLAUDE_WORKTREE_PATH', ZE: 'lazyWorktreePending', QE: 'lazyWorktreeState', GE: 'railEnvironment',
      KE: 'environmentLabel', UE: 'environmentKind', WE: 'isCloudEnvironment', PE: 'connectorRows', NE: 'plainConnectorLabel', AE: 'environmentConnection',
      tD: 'isSideSessionNotesFolder', zE: 'remoteControlState', nD: 'railPlanSteps', qE: 'hasEnvironmentCard', JE: 'railHasContent',
      vD: 'environmentSummary', yD: 'doneStepCount', uE: 'connectorLabel', lE: 'humanizedSlug', BE: 'RAIL_PENDING_GIVE_UP_MS', sO: 'checkoutInfo',
      oO: 'NO_CHECKOUT_INFO', aD: 'RAIL_SLOT_CLASSES', sD: 'NO_CHECKOUTS', rO: 'RAIL_SESSION_META', tO: 'COMPOSER_MENU_SECTIONS' },
    features: {
      RE: ['if (r) return o ? { name: o, path: s, hidePath: !0 } : null;', 'name: LE(i) || a || $E(c),', '...(c !== s && { basePath: c }),'],
      LE: ['return e ? $E(e) : void 0;'], $E: ['return e.split(/[\\\\/]/).filter(Boolean).pop() ?? e;'],
      ME: ['trees: t = FE,', 'worktreeRemoved: !0,', 'worktree: { name: e.worktreeName, path: e.worktreePath },', '(t.repoLinks ??= e.repoLinks)'],
      IE: ['? e.worktreePath + e.folder.slice(t.length)'], jE: ['return n === null ? e : e.filter((e) => e !== t);'],
      VE: ['return (e ? void 0 : t) || n || t || r || void 0;'], HE: ['? { name: i }', '? { name: null }'],
      XE: ['return !e || !n || n === t || (!r && !YE.test(n))', ': { name: $E(n), path: n };'], YE: ['YE = /[\\\\/]\\.claude[\\\\/]worktrees[\\\\/]/'],
      ZE: ['return e && o === !0 && s !== !0 && !r && !i && !a && !!n && t === n;'],
      QE: ['? { kind: "notEntered" }', '? { kind: "ready", branch: i }', ': { kind: "preparing" };'],
      GE: ['labels: { local: null, cloud: null, bridge: null },', '...(n !== null && n !== e.name && { details: [{ value: n }] }),'],
      KE: ['case "remoteHost":', 'return { label: o.local, kind: s.local };', 'place: "cloud",'], UE: ['?.type === "pool"', '? "selfHosted"'],
      WE: ['return e === "cloud" || e === "selfHosted";'], PE: ['labelOf: i = NE,', 'n === "failed" || n === "needs-auth" || n === "unavailable"'],
      NE: ['return { label: e };'], AE: ['case "idle":', 'return "notConnected";'], tD: ['return eD.test(e);'],
      zE: ['return n && (e || !t)', '? "pending"'], nD: ['e.findIndex((e) => e.status === "in_progress")', 'n === t ? "current" : e.status === "completed" ? "done" : "pending",'],
      qE: ['e.worktree !== null'], JE: ['e.artifacts.length > 0'], vD: ['return [e?.name, t?.name].find((e) => typeof e == "string" && e !== "");'],
      yD: ['return e.filter((e) => e.state === "done").length;'], uE: ['label: lE(t.connectorName), plugin: rn(Ji(t.pluginName))'],
      lE: ['return cE.test(e) ? Zi(e) : e;'], BE: ['var BE = 6e3;'], sO: ['branch: e?.branch && !no(e.branch) ? e.branch : void 0,', 'repoName: qt(e?.repo)?.name,'],
      oO: ['var oO = { branch: void 0, repoName: void 0 };'], aD: ['"hidden has-[nav:not(:empty)]:flex has-[[data-epitaxy-branch-row-ghost]]:flex"'],
      sD: ['var sD = [];'], rO: ['"hasDesktopWorktree",', '"startedWithWorktree",', '"worktreeRemoved",', '"remoteControlAvailable",'],
      tO: ['context: "context",', 'effort: "settings",'],
    } },
  { target: 'rail-hooks.mjs', source: RAIL, exports: { lO: 'useRailPendingHold', cO: 'useCheckoutInfo', nO: 'useComposerMenuOpensRailSection' },
    features: { lO: ['let i = setTimeout(() => r(!0), t);', 'e && !n'], cO: ['{ data: r } = Ti({ ...$a(e, n), select: sO }),', 'i = oo(n === "local" ? e : null);',
      'return i && i !== e.branch ? { ...e, branch: i } : e;'],
      nO: ['let i = n ? tO[n.menu] : void 0;', 'if (i === "settings" && r) {', '(i !== "environment" && e.setHidden(i, !1), e.setOpen(t, i, !0));'] } },

  // ---- cf74bc599: the rail view ----
  { target: 'rail-view.mjs', source: RAIL,
    exports: { iD: 'SessionRail', rD: 'SessionRailAside', DE: 'RailCardStack', wE: 'RailCardSlot', gD: 'RailFolderRows', _D: 'RailExtraFolderBranch',
      hD: 'RailPathTail', xD: 'RailEnvironmentStatus', bD: 'environmentDetails', lD: 'RailConnectorsCard', uD: 'RailConnectorIcon', cD: 'connectorStateAction',
      TD: 'RailSkeleton', xE: 'RailOutputsCard', bE: 'RailSessionOutputs', _E: 'RailOutputsList', gE: 'RailOutputFileRow', hE: 'RailOutputFileIcon' },
    features: {
      iD: ['var iD = y(function ({ sessionKey: e = Zu, ...t }) {', 'return u(rl.Provider, { value: e, children: u(rD, { ...t }) });'],
      rD: ['defaultMessage: "Session details",', 'id: "v52hoKcuPM",', 'onMouseDownCapture: tl,', 'className: Vr(`flex ${Mi} min-h-0 flex-col font-sans outline-none`, I),',
        'u(cn, { kind: "codeRail", railRef: be, readingOrder: xe }),', 'z = R ? "sans" : "mono",', 'value: R ? "row" : "stacked",', 'slotClasses: aD,',
        '"Claude is reading from {folder} on {branch}; it moves into this worktree before changing files.",',
        '"Claude hasn\\u2019t moved to this session\\u2019s worktree yet. Until it does, the folder and branch shown are your own.",',
        'se = te && u(Rl, { pending: ne?.kind, hint: oe }),', 'settings:', '!R &&', 'u(pD, { steps: n, live: y, sessionKey: L })',
        'defaultMessage: "Changes",', 'id: "dgqhUM6BxJ",', 'keepMounted: !0,', 'u(xE, {'],
      DE: ['activationConstraint: { distance: 6 }', 'autoScroll: !1,', 'id: "UPaB6J5Q6m",',
        '"To pick up a section, press Space or Enter. While it is picked up, press the up or down arrow key to move it, Space or Enter to drop it, or Escape to cancel.",',
        '"Picked up {name}. It is section {position} of {count}.",', 'return n != null && n !== !1 && !Eu(t, i) && !al({ hidden: s }, t, i);', 'strategy: j_,'],
      wE: ['defaultMessage: "Draggable section",', 'id: "1y61ZzlFkj",', 't.toggleAttribute("data-rail-slot-off", !i)', '"data-rail-card": e,', 'let C = Sr(1);',
        '"relative flex-col rounded-card",', 't ?? "contents has-[[data-rail-section]]:flex",'],
      gD: ['defaultMessage: "Additional folder",', 'defaultMessage: "Working folder",', 'defaultMessage: "Choose folder\\u2026",', 'icon: "Add",',
        'm = e !== null && !e.hidePath ? ut(e.basePath ?? e.path) : "";'],
      _D: ['face: n ? "sans" : "mono",', 'e.worktree !== void 0 && u(Rl, { hint: e.worktree.path })'],
      hD: ['"flex w-[8ch] shrink-[9999] basis-[content] px-md text-muted-as-secondary"', 'content: () => (mD(t.current) ? e : void 0),'],
      xD: ['defaultMessage: "Learn more", id: "TdTXXf940t"', 'defaultMessage: "Connecting", id: "6q3tCnkd2h"', 'defaultMessage: "Not connected", id: "kldl5VlIaI"'],
      bD: ['e.label !== void 0 && o(i, { children: [e.label, " \\u00B7 "] }),'],
      lD: ['defaultMessage: "{count} to reconnect",', 'defaultMessage: "{count} connected",', 'defaultMessage: "Manage connectors",', 'defaultMessage: "Unavailable",',
        's = e === null ? null : Math.max(0, e - t - n);', 'limit: oD,'],
      uD: ['type: t?.type ?? "favicon",', 'fadeInOnLoad: !1,'], cD: ['defaultMessage: "Reconnect", id: "IE7REaVJ6q"', 'defaultMessage: "Authenticate", id: "CKI/AUaH8H"'],
      TD: ['decorative: !0,', 'as: "span",', 'children: u(mr, { width: e, height: 12 }),'],
      xE: ['? u(_E, { files: pE, artifacts: r, onOpenArtifact: i })'], bE: ['let i = mg(e),', 's = sE(e, o),', 'c = f(() => (o === a && s.size === 0 ? a : vE(o, s)), [a, o, s]);'],
      _E: ['defaultMessage: "Outputs", id: "ohKjpG6KDI"', 'placement: "beside-start",', 'limit: dE,', 'children: a.length'],
      gE: ['defaultMessage: "{server} image",', 'defaultMessage: "{name} \\u00B7 {when}",', 'blockedClassName: "block w-full",', 'fileRef: { path: e },'],
      hE: ['if (t) return u(Sl, { name: Ba(e) });', 'ln("panels") && (r = fa.size),'],
    } },
  // ---- R4i-rail RL1: Save environment (fO's St = Ay(…), the flat rail's environmentSave Iy, the stacked rail's Ly) ----
  // cd0cf5b5e p (target equality without the folder lists, over code-current's m) / Fe (a preset's model and effort).
  { target: 'environment-target.mjs', source: 'cd0cf5b5e-BajR1nyG.js', exports: { p: 'sameStoredEnvironmentTarget', Fe: 'environmentModelSettings' },
    features: { p: ['return m(Ce(e), Ce(t));'], Fe: ['...(e?.modelId ? { modelId: e.modelId } : {}),'] } },
  // shared-20 Wk: a target's key; shared-28 oh: an SSH host's key (cead7e0c5 b reads both).
  { target: 'environment-target-key.mjs', source: 'shared-20-B7UqYfsi.js', exports: { Wk: 'environmentTargetKey' },
    features: { Wk: ['return `local:${e.wslDistro ?? ""}:${e.cwd}`;'] } },
  { target: 'ssh-host-key.mjs', source: 'shared-28-DcgD7xXH.js', exports: { oh: 'sshHostKey' }, features: { oh: ['return `${n === -1 ? "" : e.slice(0, n)}@${ah(e)}:${t ?? 22}`;'] } },
  // cead7e0c5 b: the newest session record started at a target, as that target's settings (Ay's `m`).
  { target: 'recent-target-settings.mjs', source: 'cead7e0c5-D6nt0a11.js', exports: { b: 'recentTargetSettings' },
    features: { b: ['let e = t.lastActivityAt ?? t.createdAt ?? 0;', 'return o ? p(o, t, a) : null;'] } },
  { target: 'save-environment.mjs', source: RAIL,
    exports: { Ay: 'useSaveEnvironmentSetup', Iy: 'RailSaveEnvironmentLink', Ly: 'RailSaveEnvironmentRow', Py: 'requestSaveEnvironment',
      My: 'recordSaveEnvironmentOutcome', Ny: 'saveEnvironmentCheckout', ky: 'environmentFolderName', Sy: 'SaveAsEnvironmentLabel' },
    features: {
      Ay: ['besideNamed: s = !1,', 'e.environments.some((e) => Og(e.target, { kind: "local", cwd: l })),', 'defaultMessage: "Folder",', 'label: `${ot(c)} \\u00B7 ${t}`,',
        'startCount: d?.quiet ? 0 : (d?.starts ?? 1),'],
      Iy: ['"data-testid": "rail-save-environment-link",', 'defaultMessage: "Save as environment",', 'defaultMessage: "Save",', 'onClick: () => Py(e, n, t),'],
      Ly: ['return m(ki)', '"data-testid": "rail-save-environment",', 'defaultMessage: "Saved as environment \\u201C{name}\\u201D",', 'u(Sl, { name: "Bookmark" }),'],
      Py: ['e.setState({', 'saveEnvironmentRequest: { setup: t, checkout: Ny(e, t, n), onSaved: r },', '(i && Og(r.target, t.target) && $e(i, r.id), My(e, t, { savedAs: r.name }));'],
      My: ['if (n === "updated") {', 'moveLineOutcome: { cwd: t.target.cwd, ...n }'], Ny: ['?.startedWithWorktree', '? { worktree: !0 }'],
      ky: ['.slice(0, Oy) || t'], Sy: ['defaultMessage: "Save as environment",', 'id: "9klNTvm9bE"'],
    } },
];

// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration).
const callSites = [
  // cf74bc599 fO (EpitaxySessionRailHost = pO = memo(fO)): the data assembly the host replaces (it reads claude.ai meta,
  // remote environments, Remote Control, artifacts). SR-7's assembler builds iD's props from host data with the pure
  // derivations above, and calls the timing / checkout hooks as fO does: lO with BE (6 s) for the discovery, meta and
  // draft-rail holds, with hg (2 s) for the environment name; cO for the working folder and its origin; nO for the
  // composer menu → section link. The prop wiring of iD (Changes = the PR bar slot unless the session has a live
  // worktree, Context unless live worktree, Servers / Background tasks always, usage / controls off when flat) is here.
  { source: RAIL, binding: 'fO', role: 'Rail host data assembly (EpitaxySessionRailHost): host replacement in SR-7, calling the generated pieces as written',
    features: ['nO(t, e.id);', 'D = lO( !( E !== void 0 || T.isError || (T.isPending && T.fetchStatus !== "fetching") ), BE, ),', 'A = lO(!k && w, BE),',
      'N = lO(j !== null && (!k || !M), BE);', 'ee = cO(I, k?.remote),', 'L = cO(x && k?.originCwd !== I ? k?.originCwd : void 0, k?.remote),',
      'R = O !== void 0 && ZE({', 'V = R && !B && !z ? O?.lazyWorktreePath : void 0,', 'me = lO(!!U && !pe && ((ne && !te) || G), hg),',
      'J = UE({', 'servers: PE({', 'labelOf: uE,', 'let e = GE({', 'labels: { local: je?.label ?? le, cloud: ue, bridge: de },', 'r = RE({',
      'cachedRepoName: ee.repoName ?? L.repoName,', 'a = ME({', '(e) => !i.has(e) && !tD(e),', 'repos: D ? [] : jE(E ?? [], P, r).map((e) => ({',
      'o = x && k.workingDir !== k.originCwd,', 's = VE({', 'branch: HE({', 'discovered: D ? void 0 : F?.currentBranch || F?.branch || null,',
      'inCheckout: o || k.git !== void 0 || k.repoSlugs.length > 0,', 'worktree: XE({', 'worktreePending: QE({', 'goal: k.goal ?? null,',
      'rt = lO(!C && w, BE),', 'at = zE({', 'lt = f(() => (ct ? [] : nD(st)), [ct, st]),', 'wt = u(iD, {',
      'pullRequests: o ? void 0 : u( Sh, { sessionRef: e, layout: "rail", onRequestComposerFocus: i }, e.id, ),', 'outputsSession: e,', 'sessionKey: e.id,',
      'repoMenuItems: Pe.folder?.path ? We : void 0,', 'contextSection: o ? void 0 : u(cg, { scopeStore: t, sessionRef: e }),',
      'usageSection: o || c ? void 0 : u(Yh, { scopeStore: t, sessionRef: e }),', 'serversSection: u(QD, { sessionRef: e, readOnly: o }),',
      'backgroundSection: u(BD, { sessionRef: e, readOnly: o }),', 'return u(ug, { snapshot: j, held: N, scopeStore: t, children: wt });'] },
];
// Pinned on the minified bytes (each must occur exactly once).
const rawCallSites = [
  // R4i-rail RL1: fO's Connectors and Save environment wiring, and the originals around it the host stands in for.
  { source: RAIL, role: 'fO reads the session MCP counts (c73f45bc3 Cd as _g) only for a local session with an opener, and passes them with that opener',
    features: ['p=Q(t,e=>e.openSessionMcpDialog)', 'g=_g(e.type==="local"&&p!==null?e.id:null)', 'p?{counts:g,onOpen:p}:void 0',
      'servers:PE({names:e.counts.listedNames,states:e.counts.listedStates,iconTypes:e.counts.listedIconTypes,iconSrcs:e.counts.listedIconSrcs,labelOf:uE})'] },
  { source: RAIL, role: 'fO builds the save setup with Ay and passes Ly (stacked) / Iy (flat, beside an unnamed environment row)',
    features: ['St=Ay({scopeStore:t,environmentsOn:ce,sessionId:e.id,isLocal:e.type==="local",meta:S.data,besideNamed:c&&!K})',
      'saveEnvironment:St&&!o?u(Ly,{scopeStore:t,sessionId:e.id,setup:St}):void 0,environmentSave:St&&!o&&c&&!K?u(Iy,{scopeStore:t,sessionId:e.id,setup:St}):void 0'] },
  { source: 'c73f45bc3-CFrHin0p.js', role: 'Cd (the session MCP counts): needs-auth / failed servers to reconnect, unavailable ones apart, every listed server with its state',
    features: ['u=s.filter(e=>(e.status==="needs-auth"||e.status==="failed")&&(!Vs(e)||c(e)&&!l(e)))',
      'p=new Set(s.filter(e=>e.status==="unavailable"||e.status==="failed"&&Vs(e)&&!f.has(e)))', 'needReconnect:u.length,unavailable:p.size',
      'listedStates:s.map(e=>f.has(e)?e.status:p.has(e)?"unavailable":"").join('] },
  { source: 'c73f45bc3-CFrHin0p.js', role: 'qc opens the environment dialog for the scope store\'s saveEnvironmentRequest and hands the created environment to onSaved',
    features: ['initialTarget:r?.setup.target??null,initialKind:"local",focusName:!0', 'e.getState().saveEnvironmentRequest?.onSaved(r)'] },
  { source: 'cc43287c9-DAfOi8yP.js', role: 'The session view puts the MCP opener (session MCP dialog, else Settings › Connectors) on the scope store while it is available',
    features: ['if(Em)return e.setState({openSessionMcpDialog:jm}),()=>e.setState({openSessionMcpDialog:null})', 'J?.warmSession?.(G.id)?.catch(()=>void 0)'] },
  { source: RAIL, role: 'cf74bc599 exports the rail host as EpitaxySessionRailHost (pO = memo(fO)); the kit lazy slot (hH) picks it',
    features: ['pO as EpitaxySessionRailHost', 'pO=y(fO)'] },
  // dnd-kit is in no other generated area (R4f-rail SR-2 checked view-tabs, code-current and every area manifest).
  { source: RAIL, role: 'The card stack imports dnd-kit from c09f6b4e5 (13 names)',
    features: ['import{_ as T_,a as E_,d as D_,i as O_,l as k_,n as A_,o as j_,p as M_,s as N_,t as P_,v as F_,x as I_,y as L_}from"./c09f6b4e5-DErbwtLQ.js"'] },
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
let areas;
async function loadAreas() {
  if (areas) return areas;
  const viewTabs = await readJson(path.join(generatedRoot, 'view-tabs/manifest.json'));
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
    const manifest = await readJson(path.join(generatedRoot, area, 'manifest.json')).catch(() => null);
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
  if (!areaExports.has(key)) areaExports.set(key, exportedNames(await fs.readFile(path.join(generatedRoot, area, target), 'utf8')));
  return areaExports.get(key);
}

const provedNamespaces = new Set();
async function reactMember(file, local) {
  if (file !== VENDOR_FRAME) return null;
  const src = await readSource(file);
  const entry = src.top.get(local);
  if (entry?.kind !== 'var') return null;
  const object = reactNamespaceObjects[local];
  if (object) {
    assertFeatures(`React namespace object ${local}`, await featureText(src, entry), object.features);
    return { from: object.module, name: '*' };
  }
  const init = entry.node.init;
  if (init?.type !== 'MemberExpression' || init.computed || init.object.type !== 'Identifier' || init.property.type !== 'Identifier') return null;
  const ns = reactNamespaces[init.object.name];
  if (!ns) return null;
  if (!provedNamespaces.has(init.object.name)) {
    assertFeatures(`React namespace ${init.object.name}`, closureText(src, init.object.name), ns.features);
    provedNamespaces.add(init.object.name);
  }
  const react = await import(ns.module === 'react/jsx-runtime' ? 'react/jsx-runtime' : ns.module);
  if (!(init.property.name in react)) throw Error(`${ns.module} has no ${init.property.name} (vendor-frame ${local})`);
  return { from: ns.module, name: init.property.name };
}
const rank = area => { const i = importableAreas.indexOf(area); return i === -1 ? importableAreas.length : i; };
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
    const importable = elsewhere.filter(e => importableAreas.includes(e.area)).sort((a, b) => rank(a.area) - rank(b.area));
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
      assertFeatures(`${spec.target}: adapter ${via} (${local})`, adapter.closure ? closureText(dep, local) : await featureText(dep, original), adapter.features);
      return { from: adapterModule, name: adapter.name, via, kind: 'adapter', original: `${file}:${local}` };
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
      'Node', 'reportError', 'ResizeObserver', 'URL', 'Event', 'KeyboardEvent', 'arguments', 'SVGElement', 'Image']);
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
      const count = text.split(feature).length - 1;
      if (count !== (site.count ?? 1)) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected ${site.count ?? 1}`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
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
