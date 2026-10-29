// Extract the 3.6556.2 originals the Changes pane, its menus and the worktree confirms reuse (lane R2-files, FT-08/10/11:
// diffgit-02/10/15/16/17), with the minimal original closures they need, without executing any desktop runtime.
// R3-files (FT-03 / FT-05) adds the Files pane and Changes tree originals: content-result layout, tree pointer and
// row classes, the selection store, the in-window drag protocol, the editor-path rule, frontmatter, the diff change
// navigation / tree expansion / whitespace pause, and the right-click "path gone" check with its menu open gate.
// R3-files FT-16 adds the breadcrumb's "Files in {folder}" popover (now cd2efac6e kl/Ol/Nl), its compact folder tree
// (ca7840910 F) and what they run on: TanStack Query (vendor-query), zustand's React store, the file-type icon and
// the small shared helpers. A binding that scripts/extract-code-ui-current.mjs already emits from the same 3.6556.2
// chunk is imported from src/generated/code-current (its declaration compared after formatting) rather than
// duplicated; adapters that restate an original one-liner are pinned to its text (adapterChecks).
//
// w2-files (3.6556.2 migration, plan §3 w2-files, research/panes.md §1.6 / §2.3 / §3.3): the renderer is React
// Compiler output. A closure's imports of a binding the view-tabs graph publishes (the E3 cache helpers J9/J0…Z5,
// CdsButton, CdsIcon, clsx, cva, useDirection, useCdsDensity, …) are imported from that graph's file by semantic name
// (R3/R6), never sliced again; a module whose roots view-tabs already publishes (CDS ShimmerText, asElementNode, the
// menu-item variants, the o11y error tag) re-exports them instead of holding a second copy (D1). vendor-frame React
// aliases come from official-3.6556.2.mjs (R1) and are checked with assertVendorAlias (top-level declarator + namespace).
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source. Each module's
// bindings are the reachable closure of its roots (computed with Babel scope analysis), so nothing is hand-picked and a
// renamed or re-pointed minified import fails generation instead of silently binding the wrong value. Imports of the
// original modules are resolved through the source chunk's export table to one of: another module generated here, a
// verified React / ReactDOM export of vendor-frame, a view-tabs public name, or a named host adapter in
// src/source-files-changes-adapters.jsx. Every module also names feature strings its emitted text must contain (stable
// strings only: literals, class names, data-*, i18n ids, GrowthBook keys, R2), so a re-pointed root fails generation
// instead of emitting the wrong function. (D0: own generator, own output folder, own verify-gen script.)
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/files-changes');
const adapterModule = '../../source-files-changes-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const frame = official.sharedFrame, vendorFrame = official.vendorFrame, intl = official.vendorIntl;

// vendor-frame re-exports React / ReactDOM / the compiler runtime; each alias is checked with assertVendorAlias.
const vendor = { [vendorFrame]: official.reactAliases };
// Host dependencies the official chunks read from runtime services or shared modules this generator does not own
// (see the adapter module). Checked before the view-tabs names and the vendor table.
const adapters = {
  // shared-28 persisted preferences (`persisted.<key>` in localStorage + the desktop preferences bucket): Uc = Bp (the
  // hook), Fc = Fp (read), Lc… Wc = Lp (write), Mc = Pp (the bucket is still loading).
  'shared-28-DNYlf4wu.js': { Uc: 'usePersistedValue', Fc: 'readPersistedValue', Wc: 'writePersistedValue', Mc: 'persistedValuesLoading' },
  // The Tooltip (Kl), Popover (ua), SkeletonGroup and Skeleton the breadcrumb popover and the trees render are the
  // host's (SourceTooltip, SourcePopover, and the Skeleton DOM), as in the 2.42304.0 emit: the Files pane's other
  // tooltips are SourceTooltip. fd (To, the rem-scaled length) and Ad (Wa, the CDS mode) are one-liners the file-type
  // icon reads; adapterChecks pins their text.
  [frame]: { Kl: 'FilesTooltip', ua: 'FilesPopover', fd: 'cdsRem', Ad: 'useCdsMode' },
  // react-intl FormattedMessage over the local catalog; p (useIntl) and f (defineMessages, the identity).
  [intl]: { l: 'FormattedMessage', p: 'useIntl', f: 'defineMessages' },
  // shared-0 dh (pC: `globalThis["claude.web"]?.LocalSessions`, the desktop bridge the gone hook asks), _b (Ko,
  // GrowthBook isOn) and yb (Zo, GrowthBook value). Locally there is no GrowthBook: the answers are those of a client
  // that has not loaded (isOn false, value undefined), so kill switches stay off and rollouts keep their defaults.
  'shared-0-DDOOdL6P.js': { dh: 'LocalSessions', _b: 'growthBookOn', yb: 'growthBookValue' },
  // shared-25 Yh (fs, `$o(…).on`) is the same GrowthBook isOn (the file-type icon set's gate).
  'shared-25-DOWZRSlq.js': { Yh: 'growthBookOn' },
  // c7fa71d26 t (2.42304.0: c856385e2 B, a same-chunk binding): session id -> {id, type}. Every local session runs on
  // this machine, while the original reads the "local_" id prefix of the desktop's session ids.
  'c7fa71d26-Cx2DrEBa.js': { t: 'localSessionTarget' },
};
// An adapter that restates an original one-liner names the text it restates; generation fails when the original
// changes.
const adapterChecks = {
  [frame]: {
    fd: { text: ['To=e=>`calc(${e/16}rem * var(${bo}, 1))`'], also: ['bo="--cds-rem-scale"'] },
    // Ga reads the mode store of an enclosing CdsRoot (`J(Sa)??Ca`); the host renders none, so the original answers
    // Ca.getSnapshot() (undefined) -> "light".
    Ad: { text: ['function Wa(){return Ga()??"light"}'], also: ['function Ga(){let e=J(Sa)??Ca;', 'getSnapshot:()=>void 0'] },
  },
  [intl]: { f: { text: ['function tn(e){return e}'] } },
  'shared-25-DOWZRSlq.js': { Yh: { text: ['function fs(e){', '.on}'] } },
  'shared-0-DDOOdL6P.js': { dh: { text: ['pC=globalThis["claude.web"]?.LocalSessions'] }, _b: { text: ['t.isOn('] } },
  'c7fa71d26-Cx2DrEBa.js': { t: { text: ['type:t.startsWith("local_")?"local":"remote"'] } },
};
// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots.
// `hostBindings` maps a same-chunk top-level binding to an adapter export instead of emitting its closure.
// `viewTabs: true`: every root is a view-tabs public name (same chunk, same local); the module re-exports it (D1).
// `signature`: feature strings (prettier-formatted source) the emitted module must contain.
// 2.42304.0 names in the comments are the pre-migration locals (research/panes.md §1.6, data/panes-binding-map.json).
const modules = [
  // shared-25 pf / mf (old up / dp; exported `df` / `ff`): the owner window of a node, or the global window.
  { target: 'owner-window.mjs', source: 'shared-25-DOWZRSlq.js', exports: { pf: 'ownerWindow', mf: 'ownerWindowOrGlobal' },
    signature: ['.ownerDocument)?.defaultView ?? null', '?? globalThis.window;'] },
  { target: 'editable-target.mjs', source: 'shared-156-BLTosN8U.js', exports: { BK: 'isEditableTarget' },
    signature: ['n === "INPUT" || n === "TEXTAREA" || n === "SELECT"', '[contenteditable="plaintext-only" i]'] },
  // ca5db7aaf P (old F, exported `s`): the menu Popup onContextMenu of the Files tree, file viewer and tab menus.
  { target: 'menu-context-guard.mjs', source: 'ca5db7aaf-qq5selW3.js', exports: { P: 'suppressNativeContextMenu' },
    signature: ['(e.target) || e.preventDefault();'] },
  // shared-1 iK (old c82eca2bd Be, panes §1.6 moved): the onContextMenu of the four Changes ContextMenu.Popups.
  { target: 'diff-context-guard.mjs', source: 'shared-1-BJhqMmkf.js', exports: { iK: 'preventContextMenu' },
    signature: ['function iK(e) {\n  e.preventDefault();\n}'] },
  // c03935b01 "epitaxy-diff-uncommitted-sessions": the sessions whose last pick was "Uncommitted changes" (≤ 50).
  // The chunk's top-level session-eviction registration is a statement, not a binding: the host registers the same
  // call (source-diff-scope.jsx).
  { target: 'diff-scope-memory.mjs', source: 'c03935b01-yhcY34vt.js',
    exports: {
      qn: 'uncommittedSessionsKey', Jn: 'uncommittedSessionsDefault', Yn: 'uncommittedSessionIds', Xn: 'useStoredDiffScope',
      Zn: 'rememberDiffScope', Un: 'branchDiffScope', Wn: 'uncommittedDiffScope', Gn: 'diffScopeKey', Kn: 'sameDiffScope',
    },
    signature: ['"epitaxy-diff-uncommitted-sessions"', '[...r.slice(-49), e]', '{ kind: "uncommitted" }'] },
  // shared-frame zF (old Aj): CDS ShimmerText, which view-tabs publishes as CdsShimmer.
  { target: 'shimmer-text.mjs', source: frame, viewTabs: true, exports: { zF: 'ShimmerText' } },
  // shared-46 GD (old shared-19 jY, panes §1.6 moved): the "Checking for uncommitted changes…" line of the worktree confirms.
  { target: 'worktree-checking.mjs', source: 'shared-46-BIbZBGFq.js', exports: { GD: 'WorktreeChecking' },
    signature: ['id: "iJ0f0MP5kz"', '"text-footnote text-muted-as-secondary"', '"reserve"', '"animate-placeholder-reveal"'] },

  // ---- R3-files FT-03: Files pane / Changes tree originals (FT-05 consumes the gone check and the open gate). ----
  // vendor-all-0 m (old v): zustand's vanilla createStore, the store runtime the selection store builds on.
  { target: 'vanilla-store.mjs', source: 'vendor-all-0-DXM0MGjZ.js', exports: { m: 'createStore' },
    signature: ['getInitialState: () => o', 'typeof i != "object" || !i'] },
  // shared-26 DS (old Wb): the drive-letter test of the isAbsolutePath for a platform.
  { target: 'windows-path.mjs', source: 'shared-26-CGuBxVt9.js', exports: { DS: 'windowsAbsolutePath' },
    signature: ['var DS = /^[A-Za-z]:[\\\\/]/;'] },
  // shared-28 UM (old ak): `(path, false)` in the gone hook, a posix path that is absolute or "~"-rooted; vM (new in
  // 3.6556.2, exported `vr`): a non-empty path that is neither rooted nor absolute, which the gone hook now also asks.
  { target: 'path-absolute.mjs', source: 'shared-28-DNYlf4wu.js', exports: { UM: 'isAbsolutePathFor', vM: 'isRelativePath' },
    signature: ['e.startsWith("/") || e === "~" || e.startsWith("~/")'] },
  // shared-104 tL / KI (old bP / dP): the image-extension rule.
  { target: 'image-path.mjs', source: 'shared-104-CTONUSaz.js', exports: { tL: 'isImagePath', KI: 'rasterImageExtensions' },
    signature: ['["png", "jpg", "jpeg", "gif", "bmp", "webp"]', ', "avif"]'] },
  // shared-28 yN (old Fk): "Open in" editors only for a file that is not a document/binary/media type or an image.
  { target: 'file-editor-path.mjs', source: 'shared-28-DNYlf4wu.js', exports: { yN: 'canOpenFileInEditor' },
    signature: ['dng|svgz)$/i'] },
  // shared-104 Fu (old Nl) over Pu: a promise raced against a DOMException("…", "TimeoutError").
  { target: 'promise-timeout.mjs', source: 'shared-104-CTONUSaz.js', exports: { Fu: 'withTimeout' },
    signature: ['new DOMException(n, "TimeoutError")', 'Promise.race([e, i]).finally(() => clearTimeout(r))'] },
  // shared-78 Ao (old qa): the Windows user-agent test the gone hook skips on.
  { target: 'windows-platform.mjs', source: 'shared-78-D5Fw2h0a.js', exports: { Ao: 'isWindowsPlatform' },
    signature: ['/(win32|win64|windows|wince)/i', 'window.navigator.userAgent.toLowerCase()'] },
  // c9b8e0296 r (exported `t`): the current session id context (`use(…)` in the gone hook; the session pane provides it).
  { target: 'session-context.mjs', source: 'c9b8e0296-DE2P0m6e.js', exports: { r: 'CurrentSessionIdContext' },
    signature: ['r = t(null)'] },
  // c856385e2 q (old V): whether a right-clicked path is gone, asked of the desktop before the menu opens. Local session,
  // both paths absolute posix and outside iCloud/CloudStorage, not Windows, kill switch "__gb__3212098161" off, 150 ms
  // deadline. The session id -> {type} rule is c7fa71d26 t now (an import; the host adapter localSessionTarget).
  { target: 'file-gone-check.mjs', source: 'c856385e2-aEyDzrcK.js',
    exports: { q: 'useFileGone', Re: 'goneCheckablePath', Le: 'cloudStoragePath', Fe: 'fileGoneKillSwitch', Ie: 'fileGoneDeadlineMs' },
    signature: ['?.isSessionPathGone === void 0', '.type !== "local"', 'var Fe = "__gb__3212098161";', 'var Ie = 150;',
      '"The desktop did not answer in time"', '{ gone: ', 'beforeOpen: ', '(?:Mobile Documents|CloudStorage)'] },
  // c856385e2 J/Ke/qe/Je and Qe (old H/$e/et/tt/it): the Files pane's multi-selection store, range / select-all, and
  // "this row is part of a multi-selection" (no gone check then).
  { target: 'file-selection.mjs', source: 'c856385e2-aEyDzrcK.js',
    exports: { Ke: 'createFileSelectionStore', qe: 'selectFileRange', Je: 'selectAllFiles', Qe: 'inMultiSelection' },
    signature: ['selected: J,', 'e({ selected: new Map(i.map((e) => [e.absPath, e])) });', 'return n && r.size >= 2 && r.has(t);'] },
  // cccc2cf0a cT/pT/gT (old oS/uS/pS): content-search grouping, whitespace collapse and the snippet lead/hit/tail layout.
  { target: 'file-content-results.mjs', source: 'cccc2cf0a-DhZC33Gc.js',
    exports: { cT: 'groupContentResults', pT: 'collapseContentWhitespace', gT: 'contentSnippetLayout' },
    signature: ['return { groups: s, shown: a, truncated: i, patternRefused: !1 };', 'return (l >= 56320 && l <= 57343 && c++, i(c, "\\u2026"));'] },
  // cccc2cf0a Ww/Gw (old Ux/Wx): blank-area presses of the tree clear the selection; Gw adds the RTL scrollbar side (Kw).
  { target: 'file-tree-pointer.mjs', source: 'cccc2cf0a-DhZC33Gc.js', exports: { Ww: 'isBlankTreeTarget', Gw: 'isBlankTreePress' },
    signature: ['t.closest("[data-tree-row]") === null', 'getComputedStyle(e).direction === "rtl"'] },
  // shared-frame tn (old Qt, exported `Rf`): coarse-pointer / no-hover media query, which turns the in-window drag off.
  // view-tabs publishes it (matchesCoarseOrHoverlessPointer), so this module re-exports that copy (D1) and c052e27aa
  // imports it from view-tabs directly.
  { target: 'coarse-pointer.mjs', source: frame, viewTabs: true, exports: { tn: 'isCoarsePointer' } },
  // c052e27aa (old cd06fb298, panes §1.6 moved): the in-window file-context drag; s adds `!coarsePointer()` to the
  // "__gb__3508862586" rollout (no GrowthBook locally: value undefined, so on). The mapper's missing `h` is d here
  // (`let e = a; ((a = null), e?.attach());`).
  { target: 'file-context-drag.mjs', source: 'c052e27aa-DlzVwnbz.js',
    exports: { i: 'fileContextDragType', s: 'fileContextDragEnabled', c: 'beginFileContextDrag', l: 'isFileContextDrag', u: 'draggedFilePaths', d: 'commitFileContextDrag', o: 'clearFileContextDrag' },
    signature: ['var r = "__gb__3508862586"', '"application/x-claude-file-context"', '(r) !== !1;', 'e?.attach());'] },
  // preload-helper e (exported `n`): tags an error with its o11y text; view-tabs publishes it as tagErrorText.
  { target: 'error-text.mjs', source: 'preload-helper-D0dM6GpB.js', viewTabs: true, exports: { e: 'withErrorText' } },
  // cf80fba0c e (exported `t`): Math.min over an iterable (NaN-, -0-aware), the frontmatter block indent.
  { target: 'array-min.mjs', source: 'cf80fba0c-CT5qqVq9.js', exports: { e: 'iterableMin' },
    signature: ['(n < t || (Object.is(n, -0) && t === 0)) && (t = n);'] },
  // c3fde7009 $i/sa (old ki/Li): the Markdown preview's frontmatter split (an empty `---\n---` block too, cov9-01) and
  // its field parser, with the parser's closure.
  { target: 'file-frontmatter.mjs', source: 'c3fde7009-LYGOoUpG.js',
    exports: { $i: 'splitFrontmatter', sa: 'frontmatterFields', Qi: 'emptyFrontmatterBlock', Zi: 'frontmatterBlock' },
    signature: ['var Qi = /^---\\r?\\n---[ \\t]*(?:\\r?\\n|$)/;', 'Error("Unsupported frontmatter")', 'return { fields: sa(n[1]), body: r };'] },
  // c44d00c7f Ui/Hi/Vi (old hi/mi/pi): F7 / ⇧F7 change navigation (diffgit-09) and the change anchors of one file.
  { target: 'diff-change-nav.mjs', source: 'c44d00c7f-Cr1FDL2F.js', exports: { Ui: 'adjacentChange', Hi: 'sameChangeAnchor', Vi: 'changeAnchors' },
    signature: ['(a.belowPane === !0 && c(e))', 'e.id === t.id && e.side === t.side && e.lineNumber === t.lineNumber',
      'let t = r.deletionStart + +(r.deletionCount === 0),', 'let r = a.additions > 0 ? "additions" : "deletions";', 'removes: a.deletions > 0,'] },
  // c44d00c7f $o/Qo/Zo (old kc/Oc/Dc): expanding a Changes tree folder scrolls so its whole subtree shows (diffgit-04).
  { target: 'diff-tree-expand.mjs', source: 'c44d00c7f-Cr1FDL2F.js', exports: { $o: 'revealExpandedSubtree', Qo: 'diffTreeRowLevel', Zo: 'diffTreeRowSelector' },
    signature: ['var Zo = "[data-diff-tree-row]";', 'r.scrollTop += Math.max(0, Math.min(l, u));'] },
  // W12 diff-scope-tree: c44d00c7f Ta/Aa/Na (module Maps) behind Ho/Xo/Ko — the Changed files tree's collapsed folders
  // per session + scope (Oa/ka, Uo/Go), its kind sections' open state (ja/Ma, Wo) and its scroll top per file list
  // (Fa key, Ia/La/Ra, at most Pa = 32), so a remounted tree (scope switch, pane hidden and shown) comes back as left.
  { target: 'diff-tree-memory.mjs', source: 'c44d00c7f-Cr1FDL2F.js',
    exports: { Oa: 'readTreeCollapsed', ka: 'writeTreeCollapsed', ja: 'readTreeSectionOpen', Ma: 'writeTreeSectionOpen',
      Fa: 'treeScrollKey', Ia: 'readTreeScroll', La: 'forgetTreeScroll', Ra: 'writeTreeScroll',
      Uo: 'initialTreeCollapsed', Wo: 'initialTreeSectionOpen', Go: 'revealCollapsedFolders' },
    signature: ['n.collapsed.size === 0 ? Ta.delete(i) : Ta.set(i, n);', 'e?.startsWith("diff:")', 'Na.size > Pa',
      'a.open || (i && r !== a.activePath)'] },
  // W12 diff-scope-tree: shared-1 iC (c44d00c7f imports it as Te) — the Changes pane body (or dialog) a node sits in,
  // where Jo's unmount effect hands focus back; c91a5e4a6 _ (Ko's `on`) — a node that is not laid out (offsetParent null).
  { target: 'diff-pane-body.mjs', source: 'shared-1-BJhqMmkf.js', exports: { iC: 'diffPaneFocusRoot' },
    signature: ['[data-diff-pane-body], [role="dialog"]', '[data-pane-root]'] },
  { target: 'node-hidden.mjs', source: 'c91a5e4a6-xMjQN7Gn.js', exports: { _: 'isNodeHidden' },
    signature: ['return e?.offsetParent === null;'] },
  // W12 diff-scope-tree: cccc2cf0a $S's trigger pieces — QS (a label span clipped by its box: scrollWidth, else the
  // text range's rect past the span's), read by rC's tooltip `[o, s, c].some(eC) ? J : void 0`, and iC (a commit
  // scope's label "{shortSha} {subject || (no message)}", else the 7-character sha).
  { target: 'diff-scope-label.mjs', source: 'cccc2cf0a-DhZC33Gc.js', exports: { QS: 'scopeLabelClipped', iC: 'commitScopeTriggerLabel' },
    signature: ['if (e.scrollWidth > e.clientWidth) return !0;', 'return n.right - r.right > 0.1 || r.left - n.left > 0.1;',
      'return r ? `${r.shortSha} ${r.subject || n}` : e.slice(0, 7);'] },
  // W12 diff-cont: c5da7eb42 Zf (cccc2cf0a `xa as kc`), YS's branch label: on a detached HEAD the session repo's own
  // branch value reads "HEAD" (the Compare against hint `kc(a, o)` and its rows `label: kc(a, e)`).
  { target: 'diff-scope-base-label.mjs', source: 'c5da7eb42-XijZdwf1.js', exports: { Zf: 'scopeBranchLabel' },
    signature: ['return e?.detachedHead && t === e.branch ? "HEAD" : t;'] },
  // c44d00c7f Dc (old Ca): Hide whitespace pauses while findings, PR comments or non-Files annotations/drafts show (diffgit-11).
  { target: 'diff-whitespace-pause.mjs', source: 'c44d00c7f-Cr1FDL2F.js', exports: { Dc: 'whitespaceHidingPaused' },
    signature: ['e.some((e) => e.source !== "file")', 'Object.values(r).some((e) => e.source !== "file")'] },
  // c621b1e2d d/u/c/l/f/m/p (old ca7840910 N/M/A/j/P/I/F, panes C3-2 moved, 7/7 identical): the tree's official classes
  // (files-08 / files-v03: the kept-guide layer, the `group/file-tree` container, the row colors).
  { target: 'file-tree-row-classes.mjs', source: 'c621b1e2d-CU5cG_mP.js',
    exports: { d: 'fileTreePadding', u: 'fileTreeRowGap', c: 'fileTreeGroup', l: 'fileTreeKeptGuides', f: 'fileTreeCompactRow', m: 'fileTreeRowCurrent', p: 'fileTreeRowIdle' },
    signature: ['bg-(image:--file-tree-kept-guides) group-hover/file-tree:bg-(image:--file-tree-guides)', 'group/file-tree [&:where(:root[dir=rtl]_:dir(rtl))]:[--file-tree-guides-to:to_left]', 'h-control app-list-row'] },
  // shared-156 sq/cq (old dV/fV): a document-scoped "a menu is waiting to open" count, held while the gate waits.
  { target: 'menu-pending.mjs', source: 'shared-156-BLTosN8U.js', exports: { sq: 'holdMenuPending', cq: 'menuPending' },
    signature: ['(oq.set(e, (oq.get(e) ?? 0) + 1),', 'return oq.has(e);'] },
  // shared-19 Gj/Uj (old pZ/dZ): swallow the held key's repeats after the key closed something (Escape).
  { target: 'escape-repeat.mjs', source: 'shared-19-DIKJVT7c.js', exports: { Gj: 'suppressEscapeRepeat' },
    signature: ['("Escape", e);', 't.key === e && t.repeat ? (t.preventDefault(), t.stopPropagation()) : i();'] },
  // shared-frame Uc (old lc): an event target narrowed to an Element; view-tabs publishes it as asElementNode.
  { target: 'event-element.mjs', source: frame, viewTabs: true, exports: { Uc: 'elementTarget' } },
  // c0cdf4a08 m/h (old h/g): a menu whose beforeOpen returned a promise opens when it settles, unless a press, a key
  // (Escape is swallowed with its repeats; panes C3-6: a held Enter's auto-repeats are ignored) or a blur comes first;
  // only the latest request may open.
  { target: 'menu-open-gate.mjs', source: 'c0cdf4a08-C69Ng1c8.js', exports: { m: 'openAfterCheck', h: 'useMenuOpenGate' },
    signature: ['addEventListener("pointerdown", o, { capture: !0, signal: a })', '"Enter"', '.repeat'] },

  // ---- R3-files FT-16: the breadcrumb's "Files in {folder}" popover (cd2efac6e kl/Ol/Nl) and its compact tree
  // (ca7840910 F), with the TanStack Query / zustand runtime and the small originals they import. ----
  // shared-0 nz (old bI): the no-op the popover's fetch catches with.
  { target: 'noop.mjs', source: 'shared-0-DDOOdL6P.js', exports: { nz: 'noop' }, signature: ['function nz() {}'] },
  // vendor-all-0 v (old ee, exported `I`): zustand's React `create` over the vanilla store; `o` is React.
  { target: 'react-store.mjs', source: 'vendor-all-0-DXM0MGjZ.js', exports: { v: 'create' },
    signature: ['v = (e) => (e ? _(e) : _)', '.useSyncExternalStore(', '() => t(e.getInitialState()),'] },
  // vendor-query (TanStack Query v5, identical): QueryClient Ve, QueryClientProvider He, useQueryClient J, useQuery tt
  // and queryOptions nt, with the cache / observer / focus / online / notify runtime they close over.
  { target: 'file-browser-query.mjs', source: 'vendor-query-DVJ0goAF.js',
    exports: { Ve: 'QueryClient', He: 'QueryClientProvider', J: 'useQueryClient', tt: 'useQuery', nt: 'queryOptions' },
    signature: ['throw Error("No QueryClient set, use QueryClientProvider to set one");', 'return et(e, U, t);',
      'e.mount(),', '(t.refetchOnReconnect = t.networkMode !== "always")'] },
  // shared-18 fU (old PR, folders first, then a numeric collator) and wU (old GR, the popover's collisionPadding).
  { target: 'file-entry-order.mjs', source: 'shared-18-D3y8YMFN.js', exports: { fU: 'compareFileEntries', wU: 'popoverCollisionPadding' },
    signature: ['(e.name, t.name)', '(() => new Intl.Collator(void 0, { numeric: !0 }))', '{ top: 48, right: 8, bottom: 8, left: 8 }'] },
  // shared-26 OS/jS (old Gb/Jb): UNC / device-namespace prefixes, and "drive letter or UNC".
  { target: 'windows-path-kinds.mjs', source: 'shared-26-CGuBxVt9.js', exports: { OS: 'uncPathPattern', jS: 'isWindowsRootedPath' },
    signature: ['OS = /^(?:[\\\\/]{2}|[\\\\/]\\?\\?[\\\\/])/'] },
  // shared-28 TM (old HO): a path relative to a root, case-insensitively; $h (old Pm): a logical side as left/right.
  { target: 'file-relative-path.mjs', source: 'shared-28-DNYlf4wu.js', exports: { TM: 'relativeToRoot', $h: 'physicalSide' },
    signature: ['return a === o ? "" : a.startsWith(`${o}/`) ? r.slice(i.length + 1) : r;', 'return (e === "inline-start") == (t === "rtl") ? "right" : "left";'] },
  // shared-104 Cm (old Ff): run an async step with a loading flag set around it (a folder row's children).
  { target: 'loading-flag.mjs', source: 'shared-104-CTONUSaz.js', exports: { Cm: 'withLoadingFlag' },
    signature: ['async function Cm(e, t) {\n  e(!0);', '} finally {\n    e(!1);'] },
  // shared-104 fL (old jP): the highlight language ids the file-kind icon treats as code.
  { target: 'code-language-ids.mjs', source: 'shared-104-CTONUSaz.js', exports: { fL: 'highlightLanguageIds' },
    signature: ['"python.javascript.typescript.java.csharp.go.rust.ruby.php.swift.kotlin.dart.scala.perl'] },
  // c7037f09e e (exported `t`, byte-identical): ArrowLeft/ArrowRight swap in RTL (the compact tree's keys).
  { target: 'arrow-key-direction.mjs', source: 'c7037f09e-DXK8RSre.js', exports: { e: 'logicalArrowKey' },
    signature: ['if (e === "ArrowLeft") return "ArrowRight";', 'if (e === "ArrowRight") return "ArrowLeft";'] },
  // shared-6 DM (old Yk): source-code extensions; shared-2 C2 (old jq, with S2): md/html icon overrides.
  { target: 'source-code-extensions.mjs', source: 'shared-6-sd9jbJqs.js', exports: { DM: 'sourceCodeExtensions' },
    signature: ['"js.jsx.gs.ts.tsx.py.rb.go.rs.c.cpp.h.hpp.java.kt.swift.sh.bash.zsh.json.yaml.yml.toml.xml.html.css.scss.sql.graphql.proto.lua.r"'] },
  { target: 'file-icon-overrides.mjs', source: 'shared-2-TF8v67kg.js', exports: { C2: 'fileIconOverride' },
    signature: ['markdown: "Note",', 'xhtml: "Globe",'] },
  // shared-9 nw (old cg): a file name's CDS icon (File / Code / Database / Spreadsheet / Slides / Image / Archive /
  // Scroll, Note / Globe overrides).
  { target: 'file-kind-icon-name.mjs', source: 'shared-9-CM21XrJw.js', exports: { nw: 'fileKindIconName' },
    signature: ['skill: "Scroll",', 'e.includes("SKILL.md") ? "skill"'] },
  // shared-52 nk (old n_): a path's last segment.
  { target: 'path-basename.mjs', source: 'shared-52-uHFNjl7C.js', exports: { nk: 'pathBasename' },
    signature: ['n = Math.max(t.lastIndexOf("/"), t.lastIndexOf("\\\\"));'] },
  // shared-25 ni (old _i): a subscribe that never notifies (the file-type icon while its icon set is off).
  { target: 'subscribe-never.mjs', source: 'shared-25-DOWZRSlq.js', exports: { ni: 'subscribeNever' },
    signature: ['function ni() {\n  return ri;\n}', 'function ri() {}'] },
  // c36273108 t (byte-identical): SVG attribute escaping (the icon set's markup).
  { target: 'attribute-escape.mjs', source: 'c36273108-nfRg0EqW.js', exports: { t: 'escapeAttribute' },
    signature: ['return t.replace(/[&<>"\']/g, (t) => e[t]);', '"\'": "&#39;"'] },
  // c280f9bbb B (exported `t`): the file-type icon. Its colored icon set (fetched JSON) is behind GrowthBook
  // "__gb__2954460583"; without GrowthBook that gate is off and B renders the CDS icon of shared-9 nw.
  { target: 'file-type-icon.mjs', source: 'c280f9bbb-CutcMso2.js', exports: { B: 'FileTypeIcon' },
    signature: ['"__gb__2954460583"', '"data-file-type-icon": ""'] },
  // c30c42d34 p (old f, exported `t`): the inline Try again button (focus kept on unmount, an sr-only failure status).
  { target: 'retry-button.mjs', source: 'c30c42d34-B0SRB643.js', exports: { p: 'RetryButton' },
    signature: ['defaultMessage: "Try again", id: "FazwRldA7z"'] },
  // c6e73333a C (old w): the diff-widget surface the popover paints.
  { target: 'diff-widget-background.mjs', source: 'c6e73333a-DjPHi7Jv.js', exports: { C: 'diffWidgetBackground' },
    signature: ['C = "var(--diff-widget-bg, var(--cds-surface-3))"'] },
  // shared-18 sk / ok (exported `Ms` / `js`; old ca7840910 te / U with H, the binding map's moves): a tree row's key
  // handling for its context menu. ok opens the row's menu from the ContextMenu key or ⇧F10 (a synthetic contextmenu at
  // the row's start edge, nk / ik) and from Ctrl+Enter on macOS (rk / ak); sk keeps a held Enter on a menu item from
  // repeating into the page.
  { target: 'tree-context-menu-keys.mjs', source: 'shared-18-D3y8YMFN.js', exports: { sk: 'preventMenuItemEnterRepeat', ok: 'openContextMenuFromKey' },
    signature: ['e.key === "ContextMenu" ||', '(e.key === "F10" && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey)', '"contextmenu"', 'button: -1,', '\'[role="menu"][data-open]\'', '\'[role^="menuitem"]\''] },
  // ca7840910 F (old ie) and k (old q): the folder tree (variant "compact" in the popover: h-control rows, a caret,
  // file-type icons, 200 entries per level, autoFocus on the current row), and its "current or first row". The row
  // geometry (icon size, indent) is c621b1e2d now (code-current file-tree-style.mjs, panes C3-2); panes C3-1: the caret
  // turns with the CDS Icon `rotate` prop instead of a rotate-90 class.
  { target: 'file-tree-compact.mjs', source: 'ca7840910-By5J0kGX.js',
    exports: { F: 'FolderTree', k: 'currentFolderTreeRow' },
    signature: ['name: "CaretRight",', '"Collapse folder {name}"', '"Expand folder {name}"',
      '"{count, plural, one {# more item not shown} other {# more items not shown}}"', '[aria-current="true"]', '"classic"'] },
  // c0fbbe82d ri (old cfac349aa q, exported `O`): the "epitaxy-file-browser-tree" query key, read by the popover.
  { target: 'folder-list-key.mjs', source: 'c0fbbe82d-COsmfHJY.js', exports: { ri: 'folderListQueryKey' },
    signature: ['return ["epitaxy-file-browser-tree", e, t];'] },
  // cd2efac6e kl (old cfac349aa Pt: the folder segment, a Popover whose trigger is the segment button), Ol (old Nt: open /
  // held / warm; the listing is fetched on open and the popup stays transparent for up to 150 ms while it loads; hover
  // or focus prefetches), Nl (old Lt: skeleton, "Couldn’t list this folder" + Try again, "Empty folder", or the compact
  // tree), nl / rl (old J / Y: the folder query; panes C3-3: no "local"/"ssh" scope branches). Ji is the query key above.
  // El / Dl (old jt / Mt) are the segment class and keys code-current breadcrumb-paths.mjs already emits from this chunk:
  // imported from there, never sliced a second time.
  { target: 'breadcrumb-folder.mjs', source: 'cd2efac6e-Be7wcc4w.js',
    currentBindings: { El: ['breadcrumb-paths.mjs', 'segmentClass'], Dl: ['breadcrumb-paths.mjs', 'segmentKeys'] },
    exports: { kl: 'BreadcrumbFolderSegment', Ol: 'useFolderPopover', Nl: 'BreadcrumbFolderList', nl: 'folderListQuery', rl: 'fetchFolderList',
      Ji: 'folderListQueryKey', tl: 'folderListFailed', Il: 'folderTreeEntries', bl: 'folderEntryLimit', xl: 'folderSkeletonRows', wl: 'folderHoldMs' },
    signature: ['"epitaxy-root break-words w-72 max-h-[min(24rem,var(--available-height))]"', '"opacity-0 pointer-events-none"', 'wl = 150',
      '{ defaultMessage: "Files in {folder}", id: "ymTEkGZRIx" }', 'defaultMessage: "Listing this folder",',
      '"Couldn\\u2019t list this folder"', 'defaultMessage: "Empty folder",', 'id: "8a1Ts60z9o",', 'variant: "compact",',
      '"flex items-center h-control px-md text-footnote text-muted-as-secondary"'] },

  // ---- R3-files FT-14: the Files tree rows (cccc2cf0a) and the worktree start folder (cccc2cf0a zw). ----
  // shared-6 Th / Eh (old _h / vh): the list-row height markers of a tree row (h-control) and of its error row.
  { target: 'app-list-row.mjs', source: 'shared-6-sd9jbJqs.js', exports: { Th: 'appListRow', Eh: 'appListRowMin' },
    signature: ['Th = "h-control app-list-row"', 'Eh = "min-h-control app-list-row-min"'] },
  // shared-frame FC (old Cx): the CDS menu-item variants a tree row starts from; view-tabs publishes cdsMenuItemClass.
  { target: 'menu-item-classes.mjs', source: frame, viewTabs: true, exports: { FC: 'menuItemClasses' } },
  // cccc2cf0a dw / fw / pw (old dx / fx / px): the tree row's base, its selected colors, and the row's primary button;
  // wT / TT (old xS / SS): which open folders keep their guide and the kept-guide gradients of one row.
  { target: 'file-tree-row.mjs', source: 'cccc2cf0a-DhZC33Gc.js',
    exports: { dw: 'fileTreeRowBase', fw: 'fileTreeRowSelected', pw: 'fileTreeRowPrimary', wT: 'keptGuideFolders', TT: 'keptGuidesOfRow' },
    signature: ['py-0 focus-visible:outline-hidden focus-visible:shadow-focus`', '"bg-fill-ghost-selected hover:bg-fill-ghost-selected"',
      "before:absolute before:inset-0 before:content-['']", '?.parentIndex === i ? i : r.parentIndex);', 'return r.join(", ") || void 0;'] },
  // shared-28 kM (old GO, a path relative to a root, or undefined outside it) and xM (old RO, join). kM's absolute-path
  // test _M (old PO) is sliced with it. code-current file-output-normalize.mjs is 3.6556.2 too and slices its own _M from
  // the same shared-28 (it is not linked to this area): two copies of the same original _M text (a D1 follow-up).
  { target: 'path-within.mjs', source: 'shared-28-DNYlf4wu.js', exports: { kM: 'pathWithinRoot', xM: 'joinPath' },
    signature: ['(r === "/" || r === "\\\\") && e.length > n.length + 1', '\\\\${t.replace(/\\//g, "\\\\")}`'] },
  // shared-0 mU (old jB): the "gitInfo" query-key prefix.
  { target: 'git-info-key.mjs', source: 'shared-0-DDOOdL6P.js', exports: { mU: 'gitInfoQueryKey' }, signature: ['mU = "gitInfo"'] },
  // shared-11 Tm (old zd) over wm: the git info query of a folder, asked of LocalSessions getGitInfo.
  { target: 'git-info-query.mjs', source: 'shared-11-_AVGLHEz.js', exports: { Tm: 'gitInfoQuery' },
    signature: ['.getGitInfo ? ', 'networkMode: "always",', 'staleTime: 3e5,'] },
  // cccc2cf0a zw (old zx, files-10): a local session in a desktop worktree whose origin folder is below its repository
  // root starts its Files tree at the same folder inside the worktree.
  { target: 'file-tree-start-folder.mjs', source: 'cccc2cf0a-DhZC33Gc.js',
    exports: { zw: 'useWorktreeStartFolder', Hw: 'normalizeRevealPath', Rw: 'startRevealNonce' },
    signature: ['.hasDesktopWorktree === !0', '?.originCwd', '.root', '.replace(/[\\\\/]+$/, "")', 'var Rw = -1;'] },
  // c856385e2 Ye (old nt): Escape (no modifier, not composing) clears a multi-selection of the tree element it is bound
  // to, swallowing the held key's repeats (files-26).
  { target: 'file-selection-escape.mjs', source: 'c856385e2-aEyDzrcK.js', exports: { Ye: 'useMultiSelectionEscape' },
    signature: ['.key !== "Escape" ||', '.getState().selected.size < 2', '.getState().clear()', 'addEventListener("keydown", '] },

  // ---- R3-files FT-18: the Markdown preview's frontmatter list (cov9-01), c3fde7009 qi (old Ei). ----
  // panes W3 resolved: the mapper's Ei -> Yi is the document variant's row; the list itself is qi (exported `o`; the
  // preview renders `qi({frontmatter})`, the document view `qi({frontmatter, variant: "document"})`), its pane row Ji.
  // Classes are unchanged from 2.42304.0; only the rows moved into their own (compiled) functions.
  // E42 (W2 gate): Ki, the field label, is plain string code; it is its own target so the plain-node Markdown model
  // (src/file-markdown-model.mjs) re-exports it without loading the compiled view (shared-frame -> vendor-frame ->
  // .jsx adapters). The view below imports this copy (sibling rule) and still exports it as frontmatterLabel.
  { target: 'file-frontmatter-label.mjs', source: 'c3fde7009-LYGOoUpG.js', exports: { Ki: 'frontmatterLabel' },
    signature: ['let t = e.replace(/[-_]/g, " ");', 'return t.charAt(0).toUpperCase() + t.slice(1);'] },
  { target: 'file-frontmatter-view.mjs', source: 'c3fde7009-LYGOoUpG.js', exports: { qi: 'Frontmatter', Ki: 'frontmatterLabel' },
    signature: ['"data-not-prose": ""', '"document"', '"pane"', '"text-footnote text-muted-as-secondary"',
      '"grid grid-cols-[max-content_1fr] items-baseline gap-x-[28px] gap-y-md mb-[24px] pb-[20px] border-b border-alpha-2"',
      '"rounded-sm border bg-alpha-1 px-xs font-mono-ui text-caption text-primary"'] },

  // ---- R3-files FT-07: the Changes "Changed files" tree rows. ----
  // c784da984 u (old d) and f (old p): a path as its folder prefix (cut at the head with an ellipsis overlay when it does
  // not fit) then its last segment, and the "name first, then its folder in footnote" form whose folder fades out once
  // clipped (panes C3-5: no aria-hidden). Vr is code-current path-parts.mjs, n / i are code-current breadcrumb-measure.mjs.
  // l (exported r, cccc2cf0a Af): the lit run text RT's name and path render (W12b cf-03).
  { target: 'path-segments.mjs', source: 'c784da984-Bk3OYRhM.js', exports: { u: 'PathSegments', f: 'NameThenFolder', l: 'LitText' },
    signature: ['"relative flex min-w-0 overflow-hidden whitespace-nowrap"', '"absolute inset-0 truncate text-start select-none [text-decoration:inherit]"',
      '"flex min-w-0 text-footnote text-muted-as-secondary data-[clipped]:opacity-0"', '"data-clipped"'] },
  // c44d00c7f Si (old Jr, with bi / yi / vi / xi): a Changed files row's tooltip (side bottom, align start, 700 ms, not
  // hoverable, lazy); the path split and the max width cap are cc5c56f5c t / n (code-current path-tooltip.mjs, E39).
  // Kl is the host tooltip (FilesTooltip).
  { target: 'diff-tree-tooltip.mjs', source: 'c44d00c7f-Cr1FDL2F.js', exports: { Si: 'DiffTreeRowTooltip', vi: 'rowNameClipped' },
    signature: ['.includes("/")', 'delay: 700,', 'lazy: !0,', '.querySelector("[data-clipped]") !== null'] },
];

// The 3.6556.2 view-tabs graph (E2/R6): `(chunk, export alias)` and `(chunk, local)` -> semantic name.
let viewTabsManifest;
const viewTabs = async () => {
  if (!viewTabsManifest) {
    const manifest = await viewTabsManifestFor(referenceVersion);
    const byExport = new Map(), byLocal = new Map();
    for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
      if (entry.export !== undefined) byExport.set(`${entry.file}:${entry.export}`, name);
      byLocal.set(`${entry.file}:${entry.local}`, name);
    }
    viewTabsManifest = { manifest, byExport, byLocal };
  }
  return viewTabsManifest;
};
// An import of a binding the view-tabs graph publishes: imported from that graph's file by semantic name.
async function viewTabsImport(file, alias, via) {
  const name = (await viewTabs()).byExport.get(`${file}:${alias}`);
  return name ? { from: `../view-tabs/${file}`, name, via, kind: 'view-tabs' } : null;
}

// The raw (unformatted) top-level declaration an export alias names, for adapterChecks.
const rawChunks = new Map();
async function rawExportDeclaration(file, alias) {
  if (!rawChunks.has(file)) {
    const bytes = (await fs.readFile(path.join(source, file))).toString();
    rawChunks.set(file, { bytes, ast: parsers.babel.parse(bytes, {}) });
  }
  const { bytes, ast } = rawChunks.get(file);
  const local = ast.program.body.filter(n => n.type === 'ExportNamedDeclaration').flatMap(n => n.specifiers)
    .find(s => s.exported.name === alias)?.local.name;
  for (const node of ast.program.body) {
    if (local && node.id?.name === local) return { local, bytes, text: bytes.slice(node.start, node.end) };
    const d = local && node.declarations?.find(d => d.id.name === local);
    if (d) return { local, bytes, text: bytes.slice(d.start, d.end) };
  }
  return { local, bytes, text: null };
}
async function checkAdapter(file, alias) {
  const check = adapterChecks[file]?.[alias];
  if (!check) return;
  const { local, bytes, text } = await rawExportDeclaration(file, alias);
  if (text === null) throw Error(`adapter ${file}:${alias} no longer names a top-level declaration`);
  const absent = [...check.text.filter(f => !text.includes(f)), ...(check.also ?? []).filter(f => !bytes.includes(f))];
  if (absent.length) throw Error(`adapter ${file}:${alias} (${local}) no longer matches ${absent.map(f => JSON.stringify(f)).join(', ')}`);
}

// A binding already emitted from the same 3.6556.2 chunk by scripts/extract-code-ui-current.mjs is imported from that
// module (src/generated/code-current) instead of being duplicated, when that module exports it. The declaration is
// compared after formatting both on their own, so a code-current module that still holds an older or re-pointed text
// fails generation.
const currentDir = path.join(root, 'src/generated/code-current');
let currentManifest;
const currentModules = new Map();
const standalone = async (code, node) =>
  format(node.type === 'VariableDeclarator' ? `var ${code.slice(node.start, node.end)};` : code.slice(node.start, node.end), { parser: 'babel' });
const topLevelDeclaration = (program, name) => {
  for (const node of program.body) {
    if (node.id?.name === name) return node;
    const d = node.declarations?.find(d => d.id.name === name);
    if (d) return d;
  }
  return null;
};
async function currentExport(file, local, src, target) {
  currentManifest ??= JSON.parse(await fs.readFile(path.join(currentDir, 'manifest.json'), 'utf8'));
  const candidates = currentManifest.modules.filter(e => e.referenceVersion === referenceVersion && !e.target.startsWith('../')
    && path.basename(e.source) === file && e.bindings.includes(local) && (target === undefined || e.target === target));
  for (const entry of candidates) {
    if (!currentModules.has(entry.target)) {
      const code = await fs.readFile(path.join(currentDir, entry.target), 'utf8');
      const ast = parsers.babel.parse(code, {});
      const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
        .flatMap(n => n.specifiers.map(s => [s.local.name, s.exported.name])));
      currentModules.set(entry.target, { code, ast, exported });
    }
    const { code, ast, exported } = currentModules.get(entry.target);
    const name = exported.get(local);
    if (!name) continue;
    const mine = topLevelDeclaration(ast.program, local), original = src.program.scope.getBinding(local)?.path.node;
    if (!mine || !original || await standalone(code, mine) !== await standalone(src.code, original))
      throw Error(`code-current ${entry.target} ${local} is not ${file}'s ${local}`);
    return { from: `../code-current/${entry.target}`, name, kind: 'code-current' };
  }
  return null;
}

// W13 G11 (D1): else a binding routines-shared's import-free shared-0 holds and exports (shared-0 Pa, lazyInit: code-current
// lazy-init.mjs only re-exports that copy now) is imported from it, its declaration compared the same way.
const routinesSharedDir = path.join(root, 'src/generated/routines-shared');
async function routinesSharedExport(file, local, src) {
  const manifest = JSON.parse(await fs.readFile(path.join(routinesSharedDir, 'manifest.json'), 'utf8'));
  const entry = manifest.modules.find(e => e.source === file && e.target === 'shared-0-DDOOdL6P.mjs' && e.bindings.some(b => b.name === local));
  if (!entry || manifest.referenceVersion !== referenceVersion) return null;
  const code = await fs.readFile(path.join(routinesSharedDir, entry.target), 'utf8');
  const ast = parsers.babel.parse(code, {});
  if (ast.program.body.some(n => n.type === 'ImportDeclaration')) throw Error(`routines-shared ${entry.target} is no longer import-free`);
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration').flatMap(n => n.specifiers.map(s => [s.local.name, s.exported.name])));
  const name = exported.get(local);
  if (!name) return null;
  const mine = topLevelDeclaration(ast.program, local), original = src.program.scope.getBinding(local)?.path.node;
  if (!mine || !original || await standalone(code, mine) !== await standalone(src.code, original))
    throw Error(`routines-shared ${entry.target} ${local} is not ${file}'s ${local}`);
  return { from: `../routines-shared/${entry.target}`, name, kind: 'routines-shared' };
}

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, code, program, exported };
  cache.set(name, record);
  return record;
}

// R1/R3: a vendor-frame React alias is the top-level `local=<namespace>.<member>` declarator official-3.6556.2.mjs
// names (or the compiler runtime's `c`).
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) throw Error(`Unmapped vendor import ${file}:${alias}`);
  official.assertVendorAlias(src.bytes.toString(), alias, target);
  return target;
}

export async function extractFilesChanges({ check = false } = {}) {
  const cache = new Map();
  const emitted = []; // modules already generated in this run: { spec, src }
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-files-changes.mjs', adapterModule: 'src/source-files-changes-adapters.jsx', modules: [] };
  const files = {};
  const absentFeatures = [];
  for (const spec of modules) {
    const src = await readSource(spec.source, cache);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-files-changes.mjs.\n// Edit the extractor or src/source-files-changes-adapters.jsx, never this file.\n`;
    if (spec.viewTabs) {
      // D1: the roots are view-tabs public names (same chunk, same local): re-export that graph's single copy.
      const { byLocal } = await viewTabs();
      for (const local of Object.keys(spec.exports)) {
        const name = byLocal.get(`${spec.source}:${local}`);
        if (!name) throw Error(`${spec.target}: ${spec.source}:${local} is not a view-tabs public name`);
        if (!src.program.scope.getBinding(local) || src.program.scope.getBinding(local).path.isImportSpecifier())
          throw Error(`${spec.target}: ${local} is not a top-level declaration of ${spec.source}`);
        imports.set(local, { from: `../view-tabs/${spec.source}`, name, via: `${spec.source}:${local}`, kind: 'view-tabs' });
      }
    }
    // A binding of the same chunk already emitted by an earlier module is imported, never duplicated.
    const sibling = local => emitted.find(m => m.spec.source === spec.source && !m.spec.viewTabs && m.spec.exports[local]);
    const fromChunk = async (file, alias, via) => {
      if (adapters[file]?.[alias]) {
        await checkAdapter(file, alias);
        return { from: adapterModule, name: adapters[file][alias], via, kind: 'adapter' };
      }
      const published = await viewTabsImport(file, alias, via);
      if (published) return published;
      const dep = cache.get(file);
      const local = dep?.exported.get(alias);
      const owner = local && emitted.find(m => m.spec.source === file && m.spec.exports[local]);
      if (owner) return { from: `./${owner.spec.target}`, name: owner.spec.exports[local], via, kind: 'generated' };
      const current = local && (await currentExport(file, local, dep) ?? await routinesSharedExport(file, local, dep));
      if (!current) throw Error(`${spec.target}: unresolved import ${via}`);
      return { ...current, via };
    };
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      if (spec.hostBindings?.[name]) {
        if (!src.program.scope.getBinding(name)) throw Error(`${spec.target}: host binding ${name} no longer exists`);
        imports.set(name, { from: adapterModule, name: spec.hostBindings[name], via: `${spec.source}:${name}`, kind: 'adapter' });
        return;
      }
      if (spec.currentBindings?.[name]) {
        const [target, exportName] = spec.currentBindings[name];
        const current = await currentExport(spec.source, name, src, target);
        if (current?.name !== exportName) throw Error(`${spec.target}: code-current ${target} does not export ${name} as ${exportName}`);
        imports.set(name, { ...current, via: `${spec.source}:${name}` });
        return;
      }
      const owner = sibling(name);
      if (owner) { imports.set(name, { from: `./${owner.spec.target}`, name: owner.spec.exports[name], via: `${spec.source}:${name}`, kind: 'generated' }); return; }
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        if (!adapters[file]?.[alias] && vendor[file]?.[alias]) {
          const dep = await readSource(file, cache);
          const [from, imported] = vendorImport(file, alias, dep);
          imports.set(name, { from, name: imported, via, kind: 'react' });
          return;
        }
        if (!adapters[file]?.[alias]) await readSource(file, cache);
        imports.set(name, await fromChunk(file, alias, via));
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      selected.set(name, p);
      // Reads and writes both count: an `x ??= …` only assigns x, yet the module needs its declaration.
      const within = q => q.node.start >= p.node.start && q.node.end <= p.node.end;
      const deps = new Set(Object.entries(src.program.scope.bindings)
        .filter(([, b]) => b.referencePaths.some(within) || b.constantViolations.some(within)).map(([n]) => n));
      let dynamic = false;
      p.traverse({ ImportExpression() { dynamic = true; }, CallExpression(r) { if (r.node.callee.type === 'Import') dynamic = true; } });
      if (dynamic) throw Error(`${spec.target}: ${name} loads a chunk dynamically; not supported here`);
      for (const dep of deps) await add(dep);
    };
    if (!spec.viewTabs) for (const name of Object.keys(spec.exports)) await add(name);
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => {
      const text = src.code.slice(p.node.start, p.node.end);
      return p.isVariableDeclarator() ? `var ${text};` : text;
    });
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const absent = (spec.signature ?? []).filter(feature => !text.includes(feature));
    if (absent.length) absentFeatures.push(`${spec.target}: ${spec.source} no longer has ${absent.map(f => JSON.stringify(f)).join(', ')}; re-check its roots`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(src.code.slice(p.node.start, p.node.end)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind })),
      exports: spec.exports,
      ...(spec.viewTabs ? { reexport: 'view-tabs' } : {}),
    });
    emitted.push({ spec, src });
  }
  if (absentFeatures.length) throw Error(absentFeatures.join('\n'));
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    let present = [];
    try { present = (await fs.readdir(output)).sort(); } catch {}
    const expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`files-changes output set changed: ${present.join(',')}. Run scripts/extract-files-changes.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`files-changes source mismatch: ${name}. Run scripts/extract-files-changes.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} files-changes modules (${count} original ${referenceVersion} bindings).`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractFilesChanges({ check: process.argv.includes('--check') });
