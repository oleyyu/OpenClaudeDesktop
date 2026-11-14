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
import * as official4 from './official-4.16336.0.mjs';

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
  // W14-code r2 closeout-2 (DC-06): shimmer-text.mjs (shared-frame zF = view-tabs CdsShimmer re-exported) is retired:
  // nothing imported it (worktree-checking reads CdsShimmer from view-tabs itself).
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
  // view-tabs publishes it (matchesCoarseOrHoverlessPointer) and c052e27aa imports it from view-tabs directly; W14-code
  // r2 closeout-2 (DC-06) retired the unimported coarse-pointer.mjs re-export.
  // c052e27aa (old cd06fb298, panes §1.6 moved): the in-window file-context drag; s adds `!coarsePointer()` to the
  // "__gb__3508862586" rollout (no GrowthBook locally: value undefined, so on). The mapper's missing `h` is d here
  // (`let e = a; ((a = null), e?.attach());`).
  { target: 'file-context-drag.mjs', source: 'c052e27aa-DlzVwnbz.js',
    exports: { i: 'fileContextDragType', s: 'fileContextDragEnabled', c: 'beginFileContextDrag', l: 'isFileContextDrag', u: 'draggedFilePaths', d: 'commitFileContextDrag', o: 'clearFileContextDrag' },
    signature: ['var r = "__gb__3508862586"', '"application/x-claude-file-context"', '(r) !== !1;', 'e?.attach());'] },
  // W14-code r2 closeout-2 (DC-06): error-text.mjs (preload-helper e = view-tabs tagErrorText re-exported) is retired,
  // nothing imported it.
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
    // q / Ue / Ke (the QueryClient, is-restoring and error-reset contexts) are exported too: code-transcript's TanStack
    // Query code reads these contexts directly, so it imports this one copy (W14-code gen-final, D1: one context each).
    exports: { Ve: 'QueryClient', He: 'QueryClientProvider', J: 'useQueryClient', tt: 'useQuery', nt: 'queryOptions',
      q: 'QueryClientContext', Ue: 'IsRestoringContext', Ke: 'QueryErrorResetBoundaryContext' },
    signature: ['throw Error("No QueryClient set, use QueryClientProvider to set one");', 'return et(e, U, t);',
      'e.mount(),', '(t.refetchOnReconnect = t.networkMode !== "always")'] },
  // shared-18 fU (old PR, folders first, then a numeric collator) and wU (old GR, the popover's collisionPadding).
  // W14-code r6 gen-final-6 (D1): uU / dU (the numeric collator and the name order) exported too, for the pierre Changes
  // body (generated/pierre-changes links this module instead of slicing them a second time).
  { target: 'file-entry-order.mjs', source: 'shared-18-D3y8YMFN.js', exports: { fU: 'compareFileEntries', wU: 'popoverCollisionPadding', uU: 'numericCollator', dU: 'compareNames' },
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
  // W14-code r2 closeout-2 (DC-06): attribute-escape.mjs (c36273108 t, SVG attribute escaping) is retired, nothing
  // imported it.
  // c280f9bbb B (exported `t`): the file-type icon. Its colored icon set (fetched JSON) is behind GrowthBook
  // "__gb__2954460583"; without GrowthBook that gate is off and B renders the CDS icon of shared-9 nw.
  { target: 'file-type-icon.mjs', source: 'c280f9bbb-CutcMso2.js', exports: { B: 'FileTypeIcon' },
    signature: ['"__gb__2954460583"', '"data-file-type-icon": ""'] },
  // c30c42d34 p (old f, exported `t`): the inline Try again button (focus kept on unmount, an sr-only failure status).
  { target: 'retry-button.mjs', source: 'c30c42d34-B0SRB643.js', exports: { p: 'RetryButton' },
    signature: ['defaultMessage: "Try again", id: "FazwRldA7z"'] },
  // c6e73333a C (old w): the diff-widget surface the popover paints. W14 diff: b = y("var(--cds-surface-2)"), the code
  // background the Changes file header paints (c44d00c7f `{ backgroundColor: en }`, en = c6e73333a n = b).
  { target: 'diff-widget-background.mjs', source: 'c6e73333a-DjPHi7Jv.js', exports: { C: 'diffWidgetBackground', b: 'codeBackground' },
    signature: ['C = "var(--diff-widget-bg, var(--cds-surface-3))"', 'b = y("var(--cds-surface-2)")'] },
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

export async function extractFilesChanges({ check = false, version = referenceVersion, survey = false } = {}) {
  if (version === official4.referenceVersion) return extractTarget4(contract4, { check, survey });
  if (version !== referenceVersion) throw Error(`extract-files-changes has no ${version} source contract`);
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
// ---------------------------------------------------------------------------------------------------------------------
// 4.16336.0 (region batch 3, region-plan batches[3] files-changes, large-split, cutover.oldConsumersAtGeneration lists 13
// 3.6556.2 areas — code-current:upper, code-transcript, composer-notices, cowork-approval, cowork-progress, pierre-changes,
// proposal-group, session-rail, session-rail-changes, session-rail-sections, sessions-page, sidebar-hover-card,
// transcript-rows — that import src/generated/files-changes by original identity; productionSwitchNotBeforeBatch 11):
// a second source contract cuts the same semantic exports from snapshots/claude-4.16336.0-20261104 into the isolated
// graph src/generated/files-changes-v4. The 3.6556.2 contract above and its output stay byte for byte as they were.
//
// Root location (AST, as extract-chat-markdown.mjs / extract-routines-shared.mjs 4.16336.0): every root names its chunk
// export alias (checked against the chunk's export table) or null for a private root (which must not be exported), carries
// all of its features (literal strings or looseFeature() patterns on its prettier-formatted declaration), and is proved
// by one identity rule: (default) the only top-level declaration of its chunk carrying those features and, when `reads`
// is given, reaching a same-chunk declaration that carries each `reads` feature; `readBy` (same-chunk declarations that
// must reference it: shape-equal twins told apart by their official reader); or `importedBy` (an official declaration of
// another chunk whose import of this chunk's alias names it). Anything else stops generation.
//
// Resolution (sharedGraph 'cds-core', linkedAreas ['routines-shared-v4']): an import resolves to React (assertVendorAlias),
// a host answer (existing exports only; the replaced declaration's features are checked and its sha256 pinned), a cds-core
// publicName (raw declaration hash checked), a binding the linked v4 area holds and exports (D1: a dependency area's
// copy is linked, never cut again; declaration hash checked), or a module emitted earlier here. A binding cds-core holds
// without a publicName is cut again only when it is not module state and hashes as cds-core's copy; module state stops
// generation and is reported as stateConflicts {binding, text, reachedBy} (D46). React Compiler helpers are proved by
// assertCompilerHelpers and cut once in compiler-helpers.mjs.
const v4Root = path.join(root, 'src/generated');
const featureMissing4 = (text, features = []) => features.filter(f => (f instanceof RegExp ? !f.test(text) : !text.includes(f)));
const featureLabel4 = f => (f instanceof RegExp ? `/${f.source}/` : JSON.stringify(f));
function assertFeatures4(label, text, features = []) {
  const missing = featureMissing4(text, features);
  if (missing.length) throw Error(`${label} lacks ${missing.map(featureLabel4).join(', ')}`);
}
async function readSource4(name, cache, dir) {
  const key = `v4:${name}`;
  if (cache.has(key)) return cache.get(key);
  const bytes = await fs.readFile(path.join(dir, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, text: bytes.toString(), code, program, exported };
  cache.set(key, record);
  return record;
}
const declText4 = (src, p) => src.code.slice(p.node.start, p.node.end);
const within4 = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const declDeps4 = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within4(p, q)) || b.constantViolations.some(q => within4(p, q))).map(([n]) => n);
const isDecl4 = p => p && (p.isFunctionDeclaration() || p.isVariableDeclarator());
// A top-level declaration in the unformatted chunk bytes (the text runSlicer graphs such as cds-core hash bindings by).
function rawDeclText4(src, name) {
  src.raw ??= new Map(parsers.babel.parse(src.text, {}).program.body.flatMap(node => (node.type === 'FunctionDeclaration' ? [[node.id.name, node]]
    : node.type === 'VariableDeclaration' ? node.declarations.filter(d => d.id.type === 'Identifier').map(d => [d.id.name, d]) : [])));
  const node = src.raw.get(name);
  if (!node) throw Error(`${src.name}: no top-level declaration ${name} in the chunk bytes`);
  return src.text.slice(node.start, node.end);
}
// The export list(s) of a generated module: local -> exported name.
function moduleExportNames4(text) {
  const out = new Map();
  for (const m of text.matchAll(/^export \{([^}]*)\};?$/gm))
    for (const spec of m[1].split(',').map(x => x.trim()).filter(Boolean)) {
      const [local, as] = spec.split(/\s+as\s+/);
      if (!out.has(local)) out.set(local, as ?? local);
    }
  return out;
}
// sharedGraph 'cds-core': manifest on this version / snapshot, every module's bytes equal its sha256 and its sourceSha256
// equals the official chunk read here, every publicName exported by its target as exportName.
async function sharedGraph4(contract) {
  const { official } = contract, area = contract.sharedGraph, dir = path.join(v4Root, area);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  if (manifest.referenceSnapshot !== official.referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${official.referenceSnapshot}`);
  const byTarget = new Map(), held = new Map(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
    if (!bytes || sha(bytes) !== m.sourceSha256) throw Error(`${area}/${m.target} was sliced from ${m.source} ${m.sourceSha256 ?? '(no sourceSha256)'}, not the source this area reads`);
    byTarget.set(m.target, m);
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = byTarget.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${area} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  const byName = new Map([...published.values()].map(e => [e.name, e]));
  return { area, held, published, byName, byTarget, manifestSha256: sha(manifestBytes) };
}
// linkedAreas: another 4.16336.0 graph this area depends on (region-plan dependsOn). Manifest version / snapshot, module
// bytes and source chunk hashes are checked; a binding it holds and exports is linked under that export name.
async function linkedGraphs4(contract) {
  const { official } = contract, holds = new Map(), areas = {};
  for (const area of contract.linkedAreas ?? []) {
    const dir = path.join(v4Root, area), manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
    const manifest = JSON.parse(manifestBytes);
    if (manifest.referenceVersion !== official.referenceVersion || manifest.referenceSnapshot !== official.referenceSnapshot)
      throw Error(`linked ${area} is ${manifest.referenceVersion} ${manifest.referenceSnapshot}, expected ${official.referenceVersion} ${official.referenceSnapshot}`);
    areas[area] = sha(manifestBytes);
    for (const m of manifest.modules) {
      const bytes = await fs.readFile(path.join(dir, m.target));
      if (sha(bytes) !== m.sha256) throw Error(`linked ${area}/${m.target} differs from its manifest`);
      const source = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
      if (!source || sha(source) !== m.sourceSha256) throw Error(`linked ${area}/${m.target} was not sliced from the source this area reads`);
      const exported = moduleExportNames4(bytes.toString());
      for (const b of m.bindings ?? []) {
        const name = typeof b === 'string' ? b : b.name, exportName = m.exports?.[name] ?? exported.get(name);
        if (exportName && b.sha256) holds.set(`${path.basename(m.source)}#${name}`, { area, target: m.target, exportName, sha256: b.sha256, moduleSha256: m.sha256 });
      }
    }
  }
  return { holds, areas };
}
// Module state a second copy would split (D46): a context, a module-level Map / Set / WeakMap / WeakSet, or a module
// variable the chunk assigns after its declaration.
function isModuleState4(contract, src, p) {
  if (!p.isVariableDeclarator()) return false;
  const init = p.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return true;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.program.scope.getBinding(init.callee.name)?.path;
    if (callee?.isImportSpecifier()) {
      const file = callee.parent.source.value.replace(/^\.\//, '');
      if (file === contract.official.vendorFrame && contract.official.reactAliases[callee.node.imported.name]?.[1] === 'createContext') return true;
    }
  }
  return (src.program.scope.getBinding(p.node.id.name)?.constantViolations.length ?? 0) > 0;
}
const hostExportCache4 = new Map();
async function assertHostExport4(label, from, name) {
  const file = path.resolve(v4Root, 'files-changes-v4', from);
  if (!hostExportCache4.has(file)) hostExportCache4.set(file, await fs.readFile(file, 'utf8'));
  const text = hostExportCache4.get(file);
  const direct = new RegExp(`^export (?:async )?(?:function|const|let|class) ${name.replace(/\$/g, '\\$')}\\b`, 'm').test(text);
  const listed = [...text.matchAll(/^export \{([^}]*)\}/gm)].some(m => m[1].split(',').map(x => x.trim().split(/\s+as\s+/).pop()).includes(name));
  if (!direct && !listed) throw Error(`${label}: ${path.relative(root, file)} does not export ${name}`);
}

async function extractTarget4(contract, { check = false, survey = false } = {}) {
  const { official, output: out, label } = contract, dir = official.ionSource;
  const cache = new Map(), files = {}, emitted = [], hostAnswers = new Map();
  const graph = await sharedGraph4(contract), linked = await linkedGraphs4(contract);
  const issues = { unresolved: [], stateConflicts: [], globals: [], roots: [] };
  const sharedModules = new Set(), linkedModules = new Map();
  const manifest = { referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-files-changes.mjs',
    sharedGraph: graph.area, linkedAreas: linked.areas, isolatedGraph: contract.isolatedGraph, modules: [] };
  const sharedImport = (file, local) => {
    const shared = graph.published.get(`${file}#${local}`);
    return shared ? { from: `../${graph.area}/${shared.target}`, name: shared.exportName, kind: 'shared-graph', publicName: shared.name, sharedTarget: shared.target } : null;
  };
  const linkedSha = (src, file, local, shared) => {
    const held = graph.held.get(`${file}#${local}`);
    if (!held?.sha256 || held.sha256 !== sha(rawDeclText4(src, local))) throw Error(`${file}#${local} differs from the declaration ${graph.area} publishes as ${shared.publicName}`);
    return held.sha256;
  };
  // A binding a linked area holds: its recorded hash must be the raw or the prettier declaration of the official chunk.
  const linkedImport = (src, file, local) => {
    const link = linked.holds.get(`${file}#${local}`);
    if (!link) return null;
    const p = src.program.scope.getBinding(local)?.path;
    if (!isDecl4(p) || ![sha(rawDeclText4(src, local)), sha(declText4(src, p))].includes(link.sha256)) throw Error(`${file}#${local} differs from the declaration ${link.area}/${link.target} holds`);
    linkedModules.set(`${link.area}/${link.target}`, link.moduleSha256);
    return { from: `../${link.area}/${link.target}`, name: link.exportName, kind: 'linked-area', area: link.area, linkedSha256: link.sha256 };
  };
  for (const spec of contract.modules) {
    const src = await readSource4(spec.source, cache, dir);
    if (spec.compilerHelpers) {
      const proved = official.assertCompilerHelpers(src.text);
      for (const [local, name] of Object.entries(spec.exports))
        if (proved[name]?.local !== local) throw Error(`${spec.target}: ${local} is not the proved compiler helper ${name}`);
    }
    const roots = Object.keys(spec.exports ?? {});
    const exportsAll = { ...spec.exports, ...spec.reexports };
    const selected = new Map(), imports = new Map(), seen = new Set(), heldByCdsCore = [], reachedBy = new Map();
    const unresolved = (via, local, extra) => {
      const item = { target: spec.target, via, local, ...extra };
      if (survey) { issues.unresolved.push(item); return; }
      throw Error(`${spec.target}: unresolved import ${via} (${local})`);
    };
    const add = async (name, from) => {
      if (seen.has(name)) return;
      seen.add(name);
      reachedBy.set(name, from);
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      const host = spec.host?.[name];
      if (host) {
        if (!isDecl4(p)) throw Error(`${spec.target}: host binding ${name} is not a declaration of ${spec.source}`);
        if (roots.includes(name) || spec.reexports?.[name]) throw Error(`${spec.target}: host binding ${name} is a root`);
        assertFeatures4(`${spec.target}: host ${host.name} (${name})`, declText4(src, p), host.features);
        await assertHostExport4(`${spec.target}: host ${name}`, host.from, host.name);
        imports.set(name, { from: host.from, name: host.name, via: `${spec.source}#${name}`, kind: 'host', original: name, hostOf: `${spec.source}#${name}`, replacedSha256: sha(declText4(src, p)) });
        return;
      }
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const dep = await readSource4(file, cache, dir);
        if (file === official.vendorFrame && official.reactAliases[alias]) {
          const { module, member } = official.assertVendorAlias(dep.text, alias);
          imports.set(name, { from: module, name: member, via, kind: 'react' });
          return;
        }
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${file} does not export ${alias}`);
        const answer = contract.importHosts?.[`${file}#${local}`];
        if (answer) {
          const replaced = dep.program.scope.getBinding(local)?.path;
          if (!isDecl4(replaced)) throw Error(`${spec.target}: host ${answer.name} replaces ${file}#${local}, which is not a declaration`);
          assertFeatures4(`${spec.target}: host ${answer.name} (${file}#${local})`, declText4(dep, replaced), answer.features);
          await assertHostExport4(`${spec.target}: host ${file}#${local}`, answer.from, answer.name);
          imports.set(name, { from: answer.from, name: answer.name, via, kind: 'host', original: local, hostOf: `${file}#${local}`, replacedSha256: sha(declText4(dep, replaced)) });
          return;
        }
        const shared = sharedImport(file, local);
        if (shared) { imports.set(name, { ...shared, via, original: local, linkedSha256: linkedSha(dep, file, local, shared) }); return; }
        const link = linkedImport(dep, file, local);
        if (link) { imports.set(name, { ...link, via, original: local }); return; }
        const owner = emitted.find(m => m.source === file && m.exports[local]);
        if (owner) { imports.set(name, { from: `./${owner.target}`, name: owner.exports[local], via, kind: 'generated', original: local }); return; }
        const silent = emitted.find(m => m.source === file && m.selectedNames.includes(local));
        const declared = dep.program.scope.getBinding(local)?.path;
        unresolved(via, local, { heldSilentlyBy: silent?.target, heldByCdsCore: graph.held.has(`${file}#${local}`) || undefined,
          text: isDecl4(declared) ? declText4(dep, declared).slice(0, 160) : '(import)' });
        return;
      }
      if (!isDecl4(p)) throw Error(`${spec.target}: unsupported declaration ${name}`);
      const key = `${spec.source}#${name}`;
      const holder = !exportsAll[name] && emitted.find(m => m.source === spec.source && m.exports[name]);
      if (holder) { imports.set(name, { from: `./${holder.target}`, name: holder.exports[name], via: key, kind: 'generated', original: name }); return; }
      const silent = emitted.find(m => m.source === spec.source && m.selectedNames.includes(name));
      if (silent) {
        if (survey) { issues.unresolved.push({ target: spec.target, via: key, local: name, heldSilentlyBy: silent.target }); return; }
        throw Error(`${spec.target}: ${name} is held by ${silent.target} but not exported there`);
      }
      const shared = sharedImport(spec.source, name), held = graph.held.get(key);
      if (shared) {
        if (roots.includes(name) || spec.reexports?.[name]) throw Error(`${spec.target}: root ${key} is the cds-core publicName ${shared.publicName}; link it instead`);
        imports.set(name, { ...shared, via: key, original: name, linkedSha256: linkedSha(src, spec.source, name, shared) });
        return;
      }
      if (!roots.includes(name) && !spec.reexports?.[name]) {
        const link = linkedImport(src, spec.source, name);
        if (link) { imports.set(name, { ...link, via: key, original: name }); return; }
      }
      if (held) {
        if (isModuleState4(contract, src, p)) {
          const conflict = { binding: key, heldBy: `${graph.area}/${held.target}`, text: declText4(src, p).slice(0, 200), reachedBy: [] };
          for (let at = from; at; at = reachedBy.get(at)) conflict.reachedBy.push(`${spec.source}#${at}`);
          issues.stateConflicts.push({ target: spec.target, ...conflict });
          return;
        }
        if (held.sha256 !== sha(rawDeclText4(src, name))) throw Error(`${spec.target}: ${key} differs from the declaration ${graph.area}/${held.target} holds`);
        heldByCdsCore.push(name);
      }
      if (!roots.includes(name) && spec.features?.[name]) assertFeatures4(`${spec.target}: ${name}`, declText4(src, p), spec.features[name]);
      selected.set(name, p);
      p.traverse({ ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); },
        CallExpression(q) { if (q.node.callee.type === 'Import') throw Error(`${spec.target}: dynamic import inside ${name}`); } });
      for (const dep of declDeps4(src, p)) await add(dep, name);
    };
    for (const name of roots) {
      const binding = src.program.scope.getBinding(name);
      if (!isDecl4(binding?.path)) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (!spec.compilerHelpers) {
        const alias = spec.aliases?.[name];
        if (alias === undefined) throw Error(`${spec.target}: root ${name} names no export alias (null for a private root)`);
        if (alias !== null && src.exported.get(alias) !== name) throw Error(`${spec.target}: ${spec.source} exports ${alias} as ${src.exported.get(alias) ?? 'nothing'}, not ${name}`);
        if (alias === null && [...src.exported.values()].includes(name)) throw Error(`${spec.target}: private root ${name} is exported by ${spec.source}`);
        try { await proveRoot4(spec, src, name, cache, dir); }
        catch (error) { if (!survey) throw error; issues.roots.push(error.message); }
      }
      await add(name, null);
    }
    // D46 stops here, before the module is rendered: the state binding is left out, so later checks (unbound globals)
    // would otherwise report the symptom instead of the unnamed state.
    if (!survey && issues.stateConflicts.length) {
      const error = Error(`module state ${graph.area} holds without a semantic name (D46): ${issues.stateConflicts.map(c => c.binding).join(', ')}`);
      error.stateConflicts = issues.stateConflicts;
      throw error;
    }
    for (const [local, name] of Object.entries(spec.reexportImports ?? {})) {
      const p = src.program.scope.getBinding(local)?.path;
      if (!p?.isImportSpecifier()) throw Error(`${spec.target}: ${local} is not an import of ${spec.source}`);
      if (!imports.has(local)) throw Error(`${spec.target}: re-exported import ${local} is not reached`);
      exportsAll[local] = name;
    }
    const unreached = [...Object.keys(spec.reexports ?? {}), ...Object.keys(spec.features ?? {})].filter(name => !selected.has(name) && !imports.has(name));
    if (unreached.length && !survey) throw Error(`${spec.target}: listed bindings ${unreached.join(', ')} are not part of the module`);
    const unusedHosts = Object.keys(spec.host ?? {}).filter(name => !imports.has(name));
    if (unusedHosts.length) throw Error(`${spec.target}: host answers ${unusedHosts.join(', ')} are no longer reached`);
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => (p.isVariableDeclarator() ? `var ${declText4(src, p)};` : declText4(src, p)));
    const groups = new Map();
    for (const [local, entry] of [...imports].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    // cdsCore: { exportName: publicName } re-exports cds-core's single copy (D1); forward: { exportName: [target, name] }
    // re-exports a module emitted earlier here (an export whose 4.16336.0 original moved to another chunk).
    const forwards = [];
    for (const [exportName, publicName] of Object.entries(spec.cdsCore ?? {})) {
      const entry = graph.byName.get(publicName);
      if (!entry) throw Error(`${spec.target}: ${publicName} is not a ${graph.area} publicName`);
      sharedModules.add(entry.target);
      forwards.push({ from: `../${graph.area}/${entry.target}`, name: entry.exportName, as: exportName, publicName });
    }
    // linked: { exportName: 'file#local' } re-exports the copy a linked area holds (D1: a root a dependency area already
    // holds is never cut again; its declaration hash is checked against the official chunk).
    for (const [exportName, key] of Object.entries(spec.linked ?? {})) {
      const [file, local] = key.split('#');
      const link = linkedImport(await readSource4(file, cache, dir), file, local);
      if (!link) throw Error(`${spec.target}: no linked area holds ${key}`);
      forwards.push({ from: link.from, name: link.name, as: exportName, linked: key, linkedSha256: link.linkedSha256 });
    }
    for (const [exportName, [target, name]] of Object.entries(spec.forward ?? {})) {
      const owner = emitted.find(m => m.target === target);
      if (!owner || !Object.values(owner.exports).includes(name)) throw Error(`${spec.target}: forward ${exportName} -> ${target} ${name} is not exported there`);
      forwards.push({ from: `./${target}`, name, as: exportName });
    }
    const forwardText = forwards.map(f => `export { ${f.name === f.as ? f.name : `${f.name} as ${f.as}`} } from ${JSON.stringify(f.from)};`).join('\n');
    const exportEntries = Object.entries(exportsAll);
    const exportText = exportEntries.length ? `export { ${exportEntries.map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };` : '';
    const header = `// Original Claude Desktop ${official.referenceVersion} bindings from ${spec.source}; generated by extract-files-changes.mjs.\n// Edit the extractor or the host adapter it names, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n${forwardText}\n`, { parser: 'babel' });
    const absent = featureMissing4(text, spec.signature);
    if (absent.length) {
      const message = `${spec.target}: ${spec.source} no longer has ${absent.map(featureLabel4).join(', ')}; re-check its roots`;
      if (survey) issues.roots.push(message); else throw Error(message);
    }
    let globals;
    babel.traverse(babel.babelParse(text, spec.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(name => !contract.hostGlobals.has(name));
    if (foreign.length) { if (survey) issues.globals.push(`${spec.target}: ${foreign.join(', ')}`); else throw Error(`${spec.target}: unbound ${foreign.join(', ')}`); }
    files[spec.target] = text;
    for (const entry of imports.values()) {
      if (entry.kind === 'host') hostAnswers.set(entry.hostOf, { original: entry.hostOf, from: entry.from, name: entry.name, replacedSha256: entry.replacedSha256 });
      if (entry.kind === 'shared-graph') sharedModules.add(entry.sharedTarget);
    }
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion: official.referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declText4(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}),
        ...(e.publicName ? { publicName: e.publicName } : {}), ...(e.replacedSha256 ? { replacedSha256: e.replacedSha256 } : {}),
        ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      exports: exportsAll,
      ...(forwards.length ? { forwards: forwards.map(({ from, name, as, publicName, linked, linkedSha256 }) => ({ from, name, as, ...(publicName ? { publicName } : {}),
        ...(linked ? { linked, linkedSha256 } : {}) })) } : {}),
      ...(spec.compilerHelpers ? {} : { roots: Object.fromEntries(roots.map(name => [name, spec.aliases[name]])) }),
      heldByCdsCore,
    });
    emitted.push({ ...spec, exports: exportsAll, selectedNames: [...selected.keys()] });
  }
  manifest.hosts = [...hostAnswers.values()].sort((a, b) => (a.original < b.original ? -1 : 1));
  manifest.sharedGraphModules = Object.fromEntries([...sharedModules].sort().map(target => [target, graph.byTarget.get(target).sha256]));
  manifest.linkedGraphModules = Object.fromEntries([...linkedModules].sort());
  if (survey) return { issues, files, manifest };
  if (issues.stateConflicts.length) {
    const error = Error(`module state ${graph.area} holds without a semantic name (D46): ${issues.stateConflicts.map(c => c.binding).join(', ')}`);
    error.stateConflicts = issues.stateConflicts;
    throw error;
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(out).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`${label} output set changed: ${present.join(',')}. Run scripts/extract-files-changes.mjs --version ${official.referenceVersion}.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(out, name), 'utf8') !== text) throw Error(`${label} source mismatch: ${name}. Run scripts/extract-files-changes.mjs --version ${official.referenceVersion}.`);
  } else {
    await fs.mkdir(out, { recursive: true });
    for (const name of await fs.readdir(out)) if (!(name in files)) await fs.rm(path.join(out, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(out, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} ${label} modules (${count} original ${official.referenceVersion} bindings; cds-core ${graph.manifestSha256.slice(0, 8)}).`);
  return manifest;
}
// Root identity (see the contract comment above).
async function proveRoot4(spec, src, name, cache, dir) {
  const features = spec.features?.[name] ?? [];
  if (!features.length) throw Error(`${spec.target}: root ${name} has no features to locate it by`);
  const p = src.program.scope.getBinding(name).path;
  assertFeatures4(`${spec.target}: root ${name}`, declText4(src, p), features);
  const identity = spec.identity?.[name] ?? {};
  for (const rule of ['readBy', 'importedBy', 'reads']) if (rule in identity && !(Array.isArray(identity[rule]) && identity[rule].length))
    throw Error(`${spec.target}: root ${name} identity.${rule} must list at least one declaration or feature`);
  const readsOk = q => (identity.reads ?? []).every(f => declDeps4(src, q).some(dep => {
    const d = src.program.scope.getBinding(dep)?.path;
    return isDecl4(d) && !featureMissing4(declText4(src, d), [f]).length;
  }));
  if (identity.readBy) {
    for (const reader of identity.readBy) {
      const r = src.program.scope.getBinding(reader)?.path;
      if (!isDecl4(r) || !declDeps4(src, r).includes(name)) throw Error(`${spec.target}: root ${name} is not read by ${spec.source}#${reader}`);
    }
    return;
  }
  if (identity.importedBy) {
    const alias = spec.aliases[name];
    for (const consumer of identity.importedBy) {
      const [file, local] = consumer.split('#');
      const dep = await readSource4(file, cache, dir), r = dep.program.scope.getBinding(local)?.path;
      if (!isDecl4(r)) throw Error(`${spec.target}: ${consumer} is not a declaration`);
      const ok = declDeps4(dep, r).some(d => {
        const q = dep.program.scope.getBinding(d)?.path;
        return q?.isImportSpecifier() && q.parent.source.value.replace(/^\.\//, '') === spec.source && q.node.imported.name === alias;
      });
      if (!ok) throw Error(`${spec.target}: ${consumer} does not import ${spec.source} ${alias} (${name})`);
    }
    return;
  }
  const hits = Object.entries(src.program.scope.bindings)
    .filter(([, b]) => isDecl4(b.path) && !featureMissing4(declText4(src, b.path), features).length && readsOk(b.path)).map(([n]) => n);
  if (hits.length !== 1 || hits[0] !== name) throw Error(`${spec.target}: root ${name} is not the unique declaration with its features (${hits.join(', ') || 'none'})`);
}
const contract4 = (() => {
  const official = official4, loose = official.looseFeature;
  // L: a looseFeature (minified names of up to three characters generalised, `keep` names literal); K: a `name = value`
  // top-level constant, name kept (constants are located by their own declarator).
  const L = (text, keep) => loose(text, keep ? { keep } : {});
  const K = (name, value) => loose(`${name} = ${value}`, { keep: [name] });
  const adapters = '../../source-files-changes-adapters.jsx', cdsAdapter = '../../cds-core-adapter.mjs';
  // m(target, source, { local: [exportName, exportAlias | null, features, identity?] }, rest)
  const m = (target, source, roots, rest = {}) => ({ target, source,
    exports: Object.fromEntries(Object.entries(roots).map(([local, [name]]) => [local, name])),
    aliases: Object.fromEntries(Object.entries(roots).map(([local, [, alias]]) => [local, alias])),
    features: { ...Object.fromEntries(Object.entries(roots).map(([local, [, , features]]) => [local, features])), ...rest.features },
    identity: Object.fromEntries(Object.entries(roots).filter(([, r]) => r[3]).map(([local, r]) => [local, r[3]])),
    ...Object.fromEntries(Object.entries(rest).filter(([k]) => k !== 'features')) });
  return {
    official, output: path.join(root, 'src/generated/files-changes-v4'), label: 'files-changes 4.16336.0',
    sharedGraph: 'cds-core',
    // D1: routines-shared is a region-plan dependency (its v4 graph is linked, never cut again); r3b-tasks (production
    // 4.16336.0) is the one owner of shared-0 Tl (lazyValue) that its D1 test allows.
    linkedAreas: ['routines-shared-v4', 'r3b-tasks'],
    isolatedGraph: { legacyOutput: 'src/generated/files-changes', productionSwitchNotBeforeBatch: 11,
      heldBy: ['code-current:upper', 'code-transcript', 'composer-notices', 'cowork-approval', 'cowork-progress', 'pierre-changes', 'proposal-group',
        'session-rail', 'session-rail-changes', 'session-rail-sections', 'sessions-page', 'sidebar-hover-card', 'transcript-rows', 'src/** host consumers'],
      dependsOn: { 'code-current:base': 'no 4.16336.0 graph at generation: the 3.6556.2 links (breadcrumb-paths, breadcrumb-measure, file-tree-style, path-parts, path-tooltip) are cut here; link code-current-v4 once it exists',
        'routines-shared': 'linked: routines-shared-v4' } },
    hostGlobals: new Set(['Math', 'Symbol', 'Object', 'Error', 'RegExp', 'String', 'Set', 'Map', 'WeakMap', 'WeakSet', 'Array', 'Number', 'Boolean', 'JSON',
      'Promise', 'Date', 'DOMException', 'Intl', 'globalThis', 'window', 'document', 'navigator', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'getComputedStyle', 'AbortController', 'queueMicrotask', 'Infinity', 'NaN', 'undefined', 'parseInt', 'parseFloat', 'Proxy', 'Reflect', 'fetch',
      'requestAnimationFrame', 'cancelAnimationFrame', 'NodeFilter']),
    // Imports another chunk declares that the host answers (existing exports only): original file#local -> { from, name,
    // features on the original's prettier-formatted declaration }.
    importHosts: {
      // shared-5 Op / _p / bp / kp: the persisted values (`persisted.<key>` in localStorage + the desktop preferences
      // bucket) -> tile-layout-store's localStorage values (3.6556.2 shared-28 Uc / Mc / Fc / Wc answered the same way).
      'shared-5-u8kha2eH.js#U_': { from: adapters, name: 'usePersistedValue', features: ['`persisted.${e}`', 'sync: !0'] },
      'shared-5-u8kha2eH.js#I_': { from: adapters, name: 'persistedValuesLoading', features: ['?.getPreferences !== void 0'] },
      'shared-5-u8kha2eH.js#L_': { from: adapters, name: 'readPersistedValue', features: ['`persisted.${e}`', '.has(e) ?'] },
      'shared-5-u8kha2eH.js#z_': { from: adapters, name: 'writePersistedValue', features: ['`persisted.${e}`', 'typeof t == "function" ? t('] },
      // shared-0 Kh: `globalThis["claude.web"]?.LocalSessions`, the desktop bridge (isSessionPathGone, getGitInfo).
      'shared-0-CnnWnVrT.js#qO': { from: adapters, name: 'LocalSessions', features: ['globalThis["claude.web"]?.LocalSessions'] },
      // c7fa71d26 n: session id -> {id, type} (cli / local / remote by id prefix); every OpenClaude session is local.
      'c7fa71d26-Db91ge0c.js#r': { from: adapters, name: 'localSessionTarget', features: ['type: e.startsWith("local_") ? "local" : "remote"', 'type: "cli"'] },
      // react-intl useIntl / FormattedMessage -> the host i18n adapter cds-core reads react-intl through.
      'vendor-intl-BJgYK7RA.js#q': { from: cdsAdapter, name: 'useHostIntl', features: [L('let e = l(K);'), L('return (Mt(e), e);', ['Mt'])] },
      'vendor-intl-BJgYK7RA.js#Gt': { from: cdsAdapter, name: 'HostFormattedMessage', features: [L('Gt = a(Wt, Ut)', ['Gt', 'Wt', 'Ut'])] },
    },
    modules: [
      // E3: the React Compiler helpers are not cut here: routines-shared-v4 (a region-plan dependency) holds and exports
      // them (shared-frame-CJdE5Ria.mjs), so every read links that copy (D1); memoStoreDeps4 is cds-core's publicName.
      // shared-frame yf (rem-scaled length), Uu (control characters collapsed to spaces, invisible ones dropped) and Vu
      // (a text without RTL / unpaired surrogates, else undefined): pure. cdsRem (Qo) is cds-core's publicName since wave 7
      // (state_sharedframe_Qo, cds-integrate/wave7): re-exported from that single copy instead of cut here.
      m('cds-parts.mjs', official.sharedFrame, {
        Um: ['collapseControlCharacters', 'Uu', ['.replace(/[\\t\\n\\v\\f\\r\\u0085\\u2028\\u2029]+/g, " ")']],
        qm: ['plainDirectionText', 'Vu', [L('return e === void 0 ? void 0 : Km(e);', ['Km'])]] },
        { cdsCore: { cdsRem: 'state_sharedframe_Qo' } }),
      // shared-25 Wp (old pf / mf, exported df / ff): the owner window of a node, or the global window; ownerWindow is cds-core's.
      m('owner-window.mjs', 'shared-25-D-aF0gt9.js', { vd: ['ownerWindowOrGlobal', 'Wp', [L('return _d(e) ?? globalThis.window;', ['_d'])]] },
        { cdsCore: { ownerWindow: 'ownerWindow' } }),
      m('editable-target.mjs', 'shared-183-B2N6Zy4J.js', { YU: ['isEditableTarget', 'wa', [L('return XU(e) || qU(GU(e), XU);', ['XU', 'qU', 'GU'])]] }),
      m('menu-context-guard.mjs', 'ca5db7aaf-C8dMH-IH.js', { P: ['suppressNativeContextMenu', 's', [L('g(e.target) || e.preventDefault();')]] }),
      // c91a5e4a6 F (export _; 3.6556.2 shared-1 iK): the onContextMenu of the Changes context-menu popups (c44d00c7f imports
      // it as An; shared-1's own `e.preventDefault()` twin R9 is the main-menu button's).
      m('diff-context-guard.mjs', 'c91a5e4a6-BOaQZsN0.js', { F: ['preventContextMenu', '_', ['e.preventDefault();'], { importedBy: ['c44d00c7f-DNez7133.js#Do', 'c44d00c7f-DNez7133.js#Sp'] }] }),
      m('diff-scope-memory.mjs', 'c03935b01-BylKMWqe.js', {
        Xn: ['uncommittedSessionsKey', null, ['"epitaxy-diff-uncommitted-sessions"']],
        Zn: ['uncommittedSessionsDefault', null, [K('Zn', '{}')], { readBy: ['$n', 'er'] }],
        Qn: ['uncommittedSessionIds', null, ['typeof e == "object" && e ? Object.keys(e) : []']],
        $n: ['useStoredDiffScope', 'Br', [L('return e !== void 0 && Qn(t).includes(e) ? qn : Kn;', ['Qn', 'qn', 'Kn'])]],
        er: ['rememberDiffScope', 'Pr', ['[...r.slice(-49), e]', 't === "uncommitted"']],
        Kn: ['branchDiffScope', 'jr', ['{ kind: "branch" }'], { readBy: ['$n'] }],
        qn: ['uncommittedDiffScope', 'Mr', ['{ kind: "uncommitted" }'], { readBy: ['$n'] }],
        Jn: ['diffScopeKey', 'Nr', ['`commit:${e.sha}`']],
        Yn: ['sameDiffScope', 'Fr', [L('return Jn(e) === Jn(t);', ['Jn'])]] },
        { signature: ['"epitaxy-diff-uncommitted-sessions"', '[...r.slice(-49), e]', '{ kind: "uncommitted" }'] }),
      m('worktree-checking.mjs', 'shared-55-BRv2XBP7.js', { yj: ['WorktreeChecking', 'Fi',
        ['"Checking for uncommitted changes\\u2026"', 'id: "iJ0f0MP5kz"', '"text-footnote text-muted-as-secondary"', '"animate-placeholder-reveal"', '"reserve"']] }),
      // shared-55 D / k (3.6556.2 code-current path-tooltip.mjs t / n): a path tooltip's placement and its LTR,
      // separator-split content.
      m('path-tooltip.mjs', 'shared-55-BRv2XBP7.js', {
        mV: ['pathTooltipOptions', 'D', ['className: "max-w-[min(480px,var(--available-width))]"', 'side: "bottom",', 'align: "start",']],
        gV: ['pathTooltipContent', 'k', ['dir: "ltr",', '.split(/(?<=[\\\\/])/)']] }),
      m('vanilla-store.mjs', 'vendor-all-0-uUCo-eCX.js', { m: ['createStore', 'z', [L('m = (e) => (e ? p(e) : p)', ['m', 'p'])], { reads: ['getInitialState: () => o'] }] },
        { signature: ['getInitialState: () => o', 'typeof i != "object" || !i'] }),
      m('windows-path.mjs', 'shared-26-B-POtn5S.js', { MA: ['windowsAbsolutePath', 'fu', [K('MA', '/^[A-Za-z]:[\\\\/]/')]] }),
      m('path-absolute.mjs', 'shared-3-IQTrO7Gx.js', {
        TN: ['isAbsolutePathFor', 'It', ['e.startsWith("/") || e === "~" || e.startsWith("~/")']],
        JM: ['isRelativePath', 'Et', [L('return e !== "" && !/^[\\\\/]/.test(e) && !TN(e, !0);', ['TN'])]] }),
      m('image-path.mjs', 'shared-153-DMw2VzSq.js', {
        Ww: ['isImagePath', 'Qh', ['t?.allowSvg && n === "svg"']],
        Fw: ['rasterImageExtensions', 'Uh', [K('Fw', '["png", "jpg", "jpeg", "gif", "bmp", "webp"]')]] }, { signature: [', "avif"]'] }),
      m('file-editor-path.mjs', 'shared-3-IQTrO7Gx.js', { rP: ['canOpenFileInEditor', 'Vt', [L('return !eP.test(e) && !RN(e);', ['eP', 'RN'])]] },
        { signature: ['dng|svgz)$/i'] }),
      m('promise-timeout.mjs', 'shared-62-DoCqVpIq.js', { IF: ['withTimeout', 'Kc', ['new DOMException(n, "TimeoutError")']] },
        { signature: ['Promise.race([e, i]).finally(() => clearTimeout(r))'] }),
      m('windows-platform.mjs', 'shared-62-DoCqVpIq.js', { to: ['isWindowsPlatform', 'fS', ['window.navigator.userAgent.toLowerCase()'],
        { reads: ['/(win32|win64|windows|wince)/i'] }] }),
      m('session-context.mjs', 'c9b8e0296-DA332Htz.js', { t: ['CurrentSessionIdContext', 't', [K('t', 'e(null)')]] }),
      m('file-gone-check.mjs', 'c856385e2-Cqx37C-b.js', {
        et: ['useFileGone', 'Dt', ['?.isSessionPathGone === void 0', '.type !== "local"', 'beforeOpen']],
        $e: ['goneCheckablePath', null, [L('return ue(e, !1) && !Qe.test(e);', ['Qe'])]],
        Qe: ['cloudStoragePath', null, ['/\\/Library\\/(?:Mobile Documents|CloudStorage)\\//i']],
        Xe: ['fileGoneKillSwitch', null, [K('Xe', '"__gb__3212098161"')]],
        Ze: ['fileGoneDeadlineMs', null, [K('Ze', '150')]] },
        { signature: ['"The desktop did not answer in time"', '{ gone: '] }),
      m('file-selection.mjs', 'c856385e2-Cqx37C-b.js', {
        ft: ['createFileSelectionStore', 'mt', ['selectOnly: (n) =>', 'moveAnchor: (n) =>', 'selectRange: (t, n) =>']],
        pt: ['selectFileRange', '_t', ['e.getState().selectRange(o, l);', '.indexOfKey(i)']],
        mt: ['selectAllFiles', 'gt', ['e.getState().selectRange(n.find((e) => e.absPath === i) ?? r, n);']],
        vt: ['inMultiSelection', 'ht', ['return n && r.size >= 2 && r.has(t);']] }),
      m('file-content-results.mjs', 'c9bd7af9c-Bvb7EG4D.js', {
        bD: ['groupContentResults', null, ['{ listed: [t], more: !1 }', 'maxLine: Math.max(']],
        TD: ['collapseContentWhitespace', null, ['return { text: n, matches: a?.length ? a : void 0 };']],
        OD: ['contentSnippetLayout', null, ['hitMatches: [{ start: n.start - a, end: n.end - a }]', 'tailMatches: r.length > 0 ? r : void 0']] }),
      m('file-tree-pointer.mjs', 'c9bd7af9c-Bvb7EG4D.js', {
        nD: ['isBlankTreeTarget', null, ['t.closest("[data-tree-row]") === null']],
        rD: ['isBlankTreePress', null, ['e.clientY >= n.top + t.clientTop + t.clientHeight']] },
        { signature: ['getComputedStyle(e).direction === "rtl"'] }),
      m('file-context-drag.mjs', 'c052e27aa-U_ULRjag.js', {
        i: ['fileContextDragType', null, ['"application/x-claude-file-context"']],
        s: ['fileContextDragEnabled', 't', [L('return !e() && t(r) !== !1;')], { reads: ['"__gb__3508862586"'] }],
        c: ['beginFileContextDrag', 'i', ['e.dataTransfer.effectAllowed = "copy"', 'absPaths: r']],
        l: ['isFileContextDrag', 'r', [L('return e.dataTransfer?.types?.includes(i) ?? !1;')]],
        u: ['draggedFilePaths', 'n', ['a.owner === e ? a.absPaths : void 0']],
        d: ['commitFileContextDrag', null, [L('((a = null), e?.attach());')]],
        o: ['clearFileContextDrag', null, [L('a = null;')], { readBy: ['c'] }] }),
      m('array-min.mjs', 'cf80fba0c-CT5qqVq9.js', { e: ['iterableMin', 't', ['(Object.is(n, -0) && t === 0)']] }),
      m('file-frontmatter.mjs', 'c3fde7009-DTvRUX3c.js', {
        er: ['splitFrontmatter', 'l', [L('return { fields: ur(n[1]), body: r };', ['ur'])]],
        ur: ['frontmatterFields', null, ['/^(?:[ \\t]|#|$)/']],
        $n: ['emptyFrontmatterBlock', null, ['/^---\\r?\\n---[ \\t]*(?:\\r?\\n|$)/']],
        Qn: ['frontmatterBlock', null, ['/^---\\r?\\n([\\s\\S]*?)\\r?\\n---\\r?\\n?([\\s\\S]*)$/']] },
        { signature: ['Error("Unsupported frontmatter")'] }),
      m('diff-change-nav.mjs', 'c44d00c7f-DNez7133.js', {
        La: ['adjacentChange', null, ['a.belowPane === !0 && c(e)', '!e.startsWithRemoval && e.newLine === a.lineNumber']],
        Ia: ['sameChangeAnchor', null, ['e.id === t.id && e.side === t.side && e.lineNumber === t.lineNumber']],
        Fa: ['changeAnchors', null, ['startsWithRemoval: o.deletions > 0', 'r.deletionStart + +(r.deletionCount === 0)']] }),
      m('diff-tree-expand.mjs', 'c44d00c7f-DNez7133.js', {
        oc: ['revealExpandedSubtree', null, ['r.scrollTop += Math.max(0, Math.min(l, u));']],
        ac: ['diffTreeRowLevel', null, ['Number(e.getAttribute("aria-level") ?? "1")']],
        ic: ['diffTreeRowSelector', null, [K('ic', '"[data-diff-tree-row]"')]] }),
      m('diff-tree-memory.mjs', 'c44d00c7f-DNez7133.js', {
        No: ['readTreeCollapsed', null, [L('return e === void 0 ? void 0 : Ao.get(Mo(e, t, n));', ['Ao', 'Mo'])], { readBy: ['Xs'] }],
        Po: ['writeTreeCollapsed', null, [L('n.collapsed.size === 0 ? Ao.delete(i) : Ao.set(i, n);', ['Ao'])]],
        Io: ['readTreeSectionOpen', null, [L('return e === void 0 ? void 0 : Fo.get(Mo(e, t, n));', ['Fo', 'Mo'])], { readBy: ['Zs'] }],
        Lo: ['writeTreeSectionOpen', null, [L('e !== void 0 && Fo.set(Mo(e, t, r), n);', ['Fo', 'Mo'])]],
        Bo: ['treeScrollKey', null, ['`${t.asTree ? "tree" : "flat"}${t.groupByKind ? "+kinds" : ""}`']],
        Vo: ['readTreeScroll', null, [L('return Ro.get(e);', ['Ro'])]],
        Ho: ['forgetTreeScroll', null, [L('Ro.delete(e);', ['Ro'])], { readBy: ['$s'] }],
        Uo: ['writeTreeScroll', null, [L('Ro.size > zo', ['Ro', 'zo'])]],
        Xs: ['initialTreeCollapsed', null, [L('let a = No(e, t, n);', ['No']), 'i && r !== a.activePath']],
        Zs: ['initialTreeSectionOpen', null, ['a.open || (i && r !== a.activePath)']],
        Qs: ['revealCollapsedFolders', null, ['t.startsWith(`${r}/`)']] }),
      m('diff-pane-body.mjs', 'shared-1-D1bGaTaN.js', { pI: ['diffPaneFocusRoot', 'Ed', [L('return t ? fI(t) : null;')], { reads: ['[data-diff-pane-body], [role="dialog"]'] }] },
        { signature: ['[data-pane-root]'] }),
      m('node-hidden.mjs', 'c91a5e4a6-BOaQZsN0.js', { P: ['isNodeHidden', 'g', ['return e?.offsetParent === null;']] }),
      m('diff-scope-label.mjs', 'c9bd7af9c-Bvb7EG4D.js', {
        Cw: ['scopeLabelClipped', null, ['if (e.scrollWidth > e.clientWidth) return !0;', 'return n.right - r.right > 0.1 || r.left - n.left > 0.1;']],
        kw: ['commitScopeTriggerLabel', null, ['return r ? `${r.shortSha} ${r.subject || n}` : e.slice(0, 7);']] }),
      m('diff-scope-base-label.mjs', 'c5da7eb42-aEqbSKbC.js', { zN: ['scopeBranchLabel', 'Rn', ['return e?.detachedHead && t === e.branch ? "HEAD" : t;']] }),
      m('diff-whitespace-pause.mjs', 'c44d00c7f-DNez7133.js', { Rl: ['whitespaceHidingPaused', null,
        ['e.some((e) => e.source !== "file")', 'Object.values(r).some((e) => e.source !== "file")']] }),
      // c621b1e2d: the file tree's official classes and geometry; f / l / u (3.6556.2 code-current file-tree-style.mjs
      // treeIndent / fileTreeIconSize / guideGradient) are cut here (no code-current-v4 at generation).
      m('file-tree-row-classes.mjs', 'c621b1e2d-Bo_3tWUk.js', {
        u: ['fileTreePadding', 'n', [K('u', '"px-xs py-1.25"')]],
        l: ['fileTreeRowGap', 'a', [K('l', '"gap-1"')]],
        s: ['fileTreeGroup', 't', ['"group/file-tree [&:where(:root[dir=rtl]_:dir(rtl))]:[--file-tree-guides-to:to_left]"']],
        c: ['fileTreeKeptGuides', 'o', ['bg-(image:--file-tree-kept-guides) group-hover/file-tree:bg-(image:--file-tree-guides)']],
        d: ['fileTreeCompactRow', 'c', ['h-control text-body text-start w-full select-none focus-visible:outline-hidden hide-focus-ring`']],
        m: ['fileTreeRowCurrent', 'i', ['"bg-fill-control hover:bg-fill-control text-primary"']],
        p: ['fileTreeRowIdle', 's', ['"bg-alpha-0 text-primary hover:bg-fill-ghost-hover data-[pressed]:bg-fill-ghost-hover"']],
        f: ['fileTreeCompactRowFocusable', 'r', ['rounded focus-visible:shadow-focus`']],
        h: ['treeIndent', 'f', ['paddingInlineStart:', 'paddingInlineEnd:']],
        r: ['fileTreeIconSize', 'l', [L('function r() {\n return "sm";\n}', ['r'])]],
        _: ['guideGradient', 'u', ['linear-gradient(${g}, transparent ${t}px, var(--cds-border)']] }),
      m('menu-pending.mjs', 'shared-183-B2N6Zy4J.js', {
        UW: ['holdMenuPending', 'Wi', ['"abort"', '{ once: !0 }', L('HW.set(e, (HW.get(e) ?? 0) + 1)', ['HW'])]],
        WW: ['menuPending', 'Qi', [L('return HW.has(e);', ['HW'])]] }),
      m('escape-repeat.mjs', 'shared-8-BqfCbkJd.js', { qI: ['suppressEscapeRepeat', 'ni', [L('GI("Escape", e);', ['GI'])]] },
        { signature: ['t.key === e && t.repeat ? (t.preventDefault(), t.stopPropagation()) : i();'] }),
      // shared-frame Pt (3.6556.2 Uc, view-tabs asElementNode): cds-core's single copy, re-exported.
      { target: 'event-element.mjs', source: official.sharedFrame, exports: {}, aliases: {}, cdsCore: { elementTarget: 'asElementNode' } },
      m('menu-open-gate.mjs', 'c0cdf4a08-Ca7hJehs.js', {
        m: ['openAfterCheck', null, ['addEventListener("pointerdown", o, { capture: !0, signal: a })', 'e.key === "Enter" && e.repeat']],
        h: ['useMenuOpenGate', 'n', [L('m(a(n.event.target), i, () => r(!0));', ['m'])]] }),
      // shared-0 Su (3.6556.2 nz): the no-op the breadcrumb popover's prefetch catches with.
      m('noop.mjs', 'shared-0-CnnWnVrT.js', { PU: ['noop', 'Su', [L('function PU() {}', ['PU'])], { importedBy: ['cd2efac6e-B38TGyig.js#Qu'] }] }),
      m('react-store.mjs', 'vendor-all-0-uUCo-eCX.js', { v: ['create', 'L', [L('v = (e) => (e ? _(e) : _)', ['v', '_'])]] },
        { signature: ['.useSyncExternalStore('] }),
      m('file-browser-query.mjs', 'vendor-query-Bl2Kfzgk.js', {
        Ve: ['QueryClient', 'm', ['resumePausedMutations', 'e.queryCache ||']],
        He: ['QueryClientProvider', 'f', ['e.mount(),', 'e.unmount();', L('t(q.Provider, { value: e, children: n })', ['q'])]],
        J: ['useQueryClient', 'p', ['"No QueryClient set, use QueryClientProvider to set one"']],
        tt: ['useQuery', 's', [L('return et(e, U, t);', ['et', 'U'])]],
        nt: ['queryOptions', 'o', ['return e;'], { importedBy: ['cd2efac6e-B38TGyig.js#Eu'] }] },
        // D1 (cds-integrate wave 8s, W8S-M7): cds-core now holds and publishes the three TanStack Query contexts
        // (settings_vendorquery_q / _Ue / _Ke, pins.merge.wave8s), so He / J / tt link them from cds-core and this graph no longer
        // cuts or exports them; were `q: ['QueryClientContext', 'd', [K('q', 'o(void 0)')], { readBy: ['He', 'J'] }],
        // Ue: ['IsRestoringContext', null, [K('Ue', 'o(!1)')]], Ke: ['QueryErrorResetBoundaryContext', null, [K('Ke', 'o(Ge())')]]`.
        { signature: ['(t.refetchOnReconnect = t.networkMode !== "always")'] }),
      m('file-entry-order.mjs', 'shared-39-ZCs0lAwB.js', {
        Tg: ['compareFileEntries', 'Ei', ['e.isDirectory === t.isDirectory', L('? wg(e.name, t.name)', ['wg'])]],
        Cg: ['numericCollator', null, ['new Intl.Collator(void 0, { numeric: !0 })']],
        wg: ['compareNames', 'Di', [L('Cg().compare(e, t) || (e < t ? -1 : 1)', ['Cg'])]] },
        { forward: {} }),
      m('popover-collision-padding.mjs', 'shared-18-Cfqwgjc5.js', { OJ: ['popoverCollisionPadding', 'Cn', [K('OJ', '{ top: 48, right: 8, bottom: 8, left: 8 }')]] }),
      m('windows-path-kinds.mjs', 'shared-26-B-POtn5S.js', {
        NA: ['uncPathPattern', 'du', [K('NA', '/^(?:[\\\\/]{2}|[\\\\/]\\?\\?[\\\\/])/')]],
        IA: ['isWindowsRootedPath', 'hu', [L('return PA(e) || FA(e);', ['PA', 'FA'])], { reads: [L('return MA.test(e);', ['MA'])] }] }),
      m('file-relative-path.mjs', 'shared-3-IQTrO7Gx.js', {
        rN: ['relativeToRoot', 'bt', ['a.startsWith(`${o}/`) ? r.slice(i.length + 1) : r']],
        qM: ['isAbsolutePath', 'xt', [L('return e.startsWith("/") || io.test(e);', ['io'])]] }),
      // shared-33 Cb (export nl; 3.6556.2 shared-28 $h): routines-shared-v4 holds it, re-exported from there (D1).
      { target: 'physical-side.mjs', source: 'shared-33-DtdykY0y.js', exports: {}, aliases: {}, linked: { physicalSide: 'shared-33-DtdykY0y.js#Cb' } },
      m('loading-flag.mjs', 'shared-62-DoCqVpIq.js', { oQ: ['withLoadingFlag', 'y', ['e(!0);', 'return await t();', 'e(!1);']] }),
      m('code-language-ids.mjs', 'shared-153-DMw2VzSq.js', { tT: ['highlightLanguageIds', 'og',
        ['"python.javascript.typescript.java.csharp.go.rust.ruby.php.swift.kotlin.dart.scala.perl']] }),
      m('arrow-key-direction.mjs', 'c7037f09e-DXK8RSre.js', { e: ['logicalArrowKey', 't', ['if (e === "ArrowLeft") return "ArrowRight";']] }),
      // shared-6 QE (source-code-extensions.mjs until cds-core wave 5b): a cds-core publicName now (sourceCodeExtensions, one Set
      // for every graph); its readers here (file-kind-icon-name.mjs) link it from cds-core.
      m('file-icon-overrides.mjs', 'shared-2-CsjIBQD8.js', { S4: ['fileIconOverride', 'Ut', [L('Object.hasOwn(x4, t) ? x4[t] : void 0', ['x4'])],
        { reads: ['markdown: "Note",'] }] }, { signature: ['xhtml: "Globe",'] }),
      m('file-kind-icon-name.mjs', 'shared-9-BgdM6Y1f.js', { MT: ['fileKindIconName', 'j', [L('return t === "skill" ? jT.skill : (Ba(kT(e)) ?? jT[t]);', ['jT', 'Ba', 'kT'])],
        { reads: ['skill: "Scroll",'] }] }),
      m('path-basename.mjs', 'shared-92-BOgyxePb.js', { pk: ['pathBasename', 'vp', ['Math.max(t.lastIndexOf("/"), t.lastIndexOf("\\\\"))']] }),
      // c17ed8826 t: the context the file-type icon reads its icon set from (module state: one copy, this graph).
      m('file-type-icon-context.mjs', 'c17ed8826-s4tf2WDj.js', { t: ['FileTypeIconSetContext', 't', [K('t', 'e(null)')], { importedBy: ['c280f9bbb-BOcpax9X.js#L'] }] }),
      m('file-type-icon.mjs', 'c280f9bbb-BOcpax9X.js', { V: ['FileTypeIcon', 't', ['fileName: n,', 'fallback: o', 'size: "auto"']] },
        { signature: ['"data-file-type-icon": ""'] }),
      // c0a54ccd3 t: hand focus back to a successor when the focused section unmounts (the Try again button's).
      m('focus-return.mjs', 'c0a54ccd3-DO5tXxAj.js', { n: ['useFocusReturnOnUnmount', 't', ['sectionWide: a,', 'portaled: o,', 'successorIn: s,']] }),
      m('retry-button.mjs', 'c30c42d34-CjFge6Ol.js', { u: ['RetryButton', 't', ['defaultMessage: "Try again", id: "FazwRldA7z"', 'busyLabel: f,', 'failedLabel: p,']] }),
      m('diff-widget-background.mjs', 'c6e73333a-LnS4e_bw.js', {
        k: ['diffWidgetBackground', 'r', ['"var(--diff-widget-bg, var(--cds-surface-3))"']],
        E: ['codeBackground', 'n', [K('E', 'w("var(--cds-surface-2)")')]] }),
      m('tree-context-menu-keys.mjs', 'shared-18-Cfqwgjc5.js', {
        GN: ['preventMenuItemEnterRepeat', 'tc', ['\'[role^="menuitem"]\') === !0']],
        WN: ['openContextMenuFromKey', 'ec', [L('t && Ys() && (e.preventDefault(), HN(t))', ['Ys', 'HN'])]] },
        { signature: ['e.key === "ContextMenu" ||', '(e.key === "F10" && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey)', '"contextmenu"', 'button: -1,'] }),
      m('file-tree-compact.mjs', 'ca7840910-Cb227yVR.js', {
        F: ['FolderTree', 't', ['"classic"', 'onLoadChildren: i,', 'maxEntries: p,']],
        k: ['currentFolderTreeRow', 'n', ['[aria-current="true"]']] },
        { signature: ['name: "CaretRightFilled",', '"Collapse folder {name}"', '"Expand folder {name}"',
          '"{count, plural, one {# more item not shown} other {# more items not shown}}"'] }),
      m('folder-list-key.mjs', 'c0a74d72b-BELp4TMv.js', { Xa: ['folderListQueryKey', 'T', ['return ["epitaxy-file-browser-tree", e, t];']] }),
      m('breadcrumb-folder.mjs', 'cd2efac6e-B38TGyig.js', {
        $u: ['BreadcrumbFolderSegment', null, ['lister: l,', 'onOpenFile: d,', L('= Qu(l, r)', ['Qu'])]],
        Qu: ['useFolderPopover', null, ['n.prefetchQuery(r)', L('setTimeout(d, Yu)', ['Yu'])]],
        rd: ['BreadcrumbFolderList', null, ['errorUpdateCount: m,', L('Tu(r.scope, { isError: f, data: d })', ['Tu'])]],
        Eu: ['folderListQuery', 'd', ['networkMode: "always",', '.toSorted(', 'relativePath:']],
        Du: ['fetchFolderList', 'p', ['e.cancelQueries({ queryKey: r.queryKey, exact: !0 })']],
        Tu: ['folderListFailed', 'h', ['return t && (e === "local" || n === void 0);']],
        od: ['folderTreeEntries', null, ['path: e.absPath,']],
        Gu: ['folderEntryLimit', null, [K('Gu', '200')]],
        Ku: ['folderSkeletonRows', null, [K('Ku', '6')]],
        Yu: ['folderHoldMs', null, [K('Yu', '150')]] },
        { reexportImports: { Fo: 'folderListQueryKey' },
          signature: ['"opacity-0 pointer-events-none"', '{ defaultMessage: "Files in {folder}", id: "ymTEkGZRIx" }', 'defaultMessage: "Listing this folder",',
            '"Couldn\\u2019t list this folder"', 'defaultMessage: "Empty folder",', 'variant: "compact",'] }),
      // shared-frame yT (3.6556.2 FC, view-tabs cdsMenuItemClass): cds-core's single copy, re-exported.
      { target: 'menu-item-classes.mjs', source: official.sharedFrame, exports: {}, aliases: {}, cdsCore: { menuItemClasses: 'cdsMenuItemClass' } },
      m('file-tree-row.mjs', 'c9bd7af9c-Bvb7EG4D.js', {
        yE: ['fileTreeRowBase', null, ['py-0 focus-visible:outline-hidden focus-visible:shadow-focus`']],
        bE: ['fileTreeRowSelected', null, [K('bE', '"bg-fill-ghost-selected hover:bg-fill-ghost-selected"')]],
        xE: ['fileTreeRowPrimary', null, ["before:absolute before:inset-0 before:content-['']", 'flex flex-1 min-w-0 items-baseline']],
        LD: ['keptGuideFolders', null, ['?.parentIndex === i ? i : r.parentIndex']],
        RD: ['keptGuidesOfRow', null, ['return r.join(", ") || void 0;']] }),
      m('path-within.mjs', 'shared-3-IQTrO7Gx.js', {
        dN: ['pathWithinRoot', 'Ut', ['e.length > n.length + 1', '/^~[\\\\/]/.test(e)']],
        $M: ['joinPath', 'Rt', ['`${n}\\\\${t.replace(/\\//g, "\\\\")}`']] }),
      m('git-info-key.mjs', 'shared-0-CnnWnVrT.js', { OJ: ['gitInfoQueryKey', 'Ks', [K('OJ', '"gitInfo"')]] }),
      m('git-info-query.mjs', 'shared-39-ZCs0lAwB.js', { Kg: ['gitInfoQuery', 'fi', ['networkMode: "always",', 'staleTime: 3e5,', '.getGitInfo']] }),
      m('file-tree-start-folder.mjs', 'c9bd7af9c-Bvb7EG4D.js', {
        ZE: ['useWorktreeStartFolder', null, ['t.hasDesktopWorktree === !0', '?.originCwd', '.replace(/[\\\\/]+$/, "")']],
        eD: ['normalizeRevealPath', null, ['if (e === "..") {', 'e.replace(/\\\\/g, "/")']],
        XE: ['startRevealNonce', null, [K('XE', '-1')], { readBy: ['WE'] }] }),
      m('file-selection-escape.mjs', 'c856385e2-Cqx37C-b.js', { ht: ['useMultiSelectionEscape', 'vt',
        ['n.key !== "Escape" ||', '.getState().selected.size < 2', '.getState().clear()', 'addEventListener("keydown", n)']] }),
      m('file-frontmatter-label.mjs', 'c3fde7009-DTvRUX3c.js', { Ha: ['frontmatterLabel', null, ['e.replace(/[-_]/g, " ")']] }),
      m('file-frontmatter-view.mjs', 'c3fde7009-DTvRUX3c.js', { Ua: ['Frontmatter', 'r', ['"data-not-prose": ""', 'i === "document"', '"pane"']] },
        { forward: { frontmatterLabel: ['file-frontmatter-label.mjs', 'frontmatterLabel'] } }),
      // c784da984's path rendering reads 3.6556.2 code-current path-parts / breadcrumb-measure (cut here: shared-3 Qt,
      // ce574895a n / i).
      m('path-parts.mjs', 'shared-3-IQTrO7Gx.js', { aN: ['splitPath', 'Qt', ['{ posix: t = !1 } = {}', 'return r < 0 ? ["", e] : [e.slice(0, r + 1), e.slice(r + 1)];']] }),
      // ce574895a _ (useHeadCut) is a cds-core publicName since wave 5b (useHeadTruncationCut, with its measurement caches):
      // path-segments.mjs links it from cds-core; observeWidth l stays a root here and links the ce574895a observer maps.
      m('breadcrumb-measure.mjs', 'ce574895a-AyUKk43x.js', {
        l: ['observeWidth', 'i', ['n?.ResizeObserver', 'a.observe(e)']] }),
      m('path-segments.mjs', 'c784da984-CRJnGT1U.js', {
        m: ['PathSegments', 'n', ['keepTailWhenNoRoom: g,', 'reportNoRoom: !0,']],
        g: ['NameThenFolder', 't', ['/^(?:[A-Za-z]:)?[\\\\/]$/']],
        d: ['LitText', 'r', ['"data-lit": ""', '"font-semibold text-primary"']] }),
      m('diff-tree-tooltip.mjs', 'c44d00c7f-DNez7133.js', {
        _a: ['DiffTreeRowTooltip', 'b', ['nameSaysMore: s,', 'detailIsPath: i,', 't.includes("/")']],
        pa: ['rowNameClipped', 'x', ['e.querySelector("[data-clipped]") !== null']] }),
    ],
  };
})();
export const contractVersions = Object.freeze([referenceVersion, official4.referenceVersion]);
// The 4.16336.0 contract and its engine, for tests that prove generation stops (a renamed alias, a non-unique root, D46).
export { contract4, extractTarget4 };

// CLI: every contract (3.6556.2 -> src/generated/files-changes, 4.16336.0 -> src/generated/files-changes-v4); `--version
// <v>` runs one; `--survey` (4.16336.0 only) prints what the contract does not resolve yet and writes nothing.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf('--version');
  const versions = at > 0 ? [process.argv[at + 1]] : contractVersions;
  if (process.argv.includes('--survey')) {
    const { issues } = await extractFilesChanges({ version: official4.referenceVersion, survey: true });
    console.log(JSON.stringify(issues, null, 1));
  } else for (const version of versions) await extractFilesChanges({ check: process.argv.includes('--check'), version });
}
