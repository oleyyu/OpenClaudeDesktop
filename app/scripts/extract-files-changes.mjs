// Extract the 2.42304.0 originals the Changes pane, its menus and the worktree confirms reuse (lane R2-files, FT-08/10/11:
// diffgit-02/10/15/16/17), with the minimal original closures they need, without executing any desktop runtime.
// R3-files (FT-03 / FT-05) adds the Files pane and Changes tree originals: content-result layout, tree pointer and
// row classes, the selection store, the in-window drag protocol, the editor-path rule, frontmatter, the diff change
// navigation / tree expansion / whitespace pause, and the right-click "path gone" check with its menu open gate.
// R3-files FT-16 adds the breadcrumb's "Files in {folder}" popover (cfac349aa Pt/Nt/Lt), its compact folder tree
// (ca7840910 ie) and what they run on: TanStack Query (vendor-query), zustand's React store, the file-type icon and
// the small shared helpers. A binding that scripts/extract-code-ui-current.mjs already emits from the same 2.42304.0
// chunk is imported from src/generated/code-current (its declaration compared after formatting) rather than
// duplicated; adapters that restate an original one-liner are pinned to its text (adapterChecks).
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source. Each module's
// bindings are the reachable closure of its roots (computed with Babel scope analysis), so nothing is hand-picked and a
// renamed or re-pointed minified import fails generation instead of silently binding the wrong value. Imports of the
// original modules are resolved through the source chunk's export table to one of: another module generated here, a
// verified React / ReactDOM export of vendor-frame, or a named host adapter in src/source-files-changes-adapters.jsx.
// Every module also names feature strings its emitted text must contain, so a re-pointed root (a minified name reused by
// another declaration in a later build) fails generation instead of emitting the wrong function. A shared-frame binding
// mapped to the view-tabs graph is checked against that graph's publicNames (D1): same chunk, same local, same export.
// (Same machinery as scripts/extract-landing-texture.mjs; D0: own generator, own output folder, own verify-gen script.)
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
const output = path.join(root, 'src/generated/files-changes');
const adapterModule = '../../source-files-changes-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React / ReactDOM; each alias is checked against its `local=<ns>.<member>` assignment.
const vendor = {
  'vendor-frame-DfPJ1QmD.js': {
    Co: ['react', 'useState'], So: ['react', 'useRef'], bo: ['react', 'useMemo'], mo: ['react', 'useEffect'],
    yo: ['react', 'useLayoutEffect'], wo: ['react', 'useSyncExternalStore'], ro: ['react', 'forwardRef'],
    Va: ['react/jsx-runtime', 'jsx'], Ha: ['react/jsx-runtime', 'jsxs'], Ca: ['react-dom', 'flushSync'],
    // R3-files: `A=o.use`, `M=o.useCallback`, `x=o.createContext` (the gone hook, the menu open gate, the session id context).
    lo: ['react', 'use'], uo: ['react', 'useCallback'], eo: ['react', 'createContext'],
    // R3-files FT-16 (the breadcrumb folder popover, its compact tree, TanStack Query and zustand): `N=o.useContext`,
    // `D=o.memo`, `S=o.createElement`, `d=o.Fragment`, `pe=fe.Fragment` (jsx-runtime), `s=o.default` (React itself,
    // zustand's `c.useSyncExternalStore`).
    do: ['react', 'useContext'], oo: ['react', 'memo'], to: ['react', 'createElement'], Ja: ['react', 'Fragment'],
    Ba: ['react/jsx-runtime', 'Fragment'], so: ['react', 'default'],
    // R3-files FT-07: `b=o.cloneElement` (c44d00c7f Jr hands its pointer handlers to the row it wraps).
    $a: ['react', 'cloneElement'],
  },
};
// Host dependencies the official chunks read from runtime services or shared modules this generator does not own
// (see the adapter module). Checked before the vendor table.
const adapters = {
  // `re = "19.2.4"`: vendor-frame's React version literal (shared-frame Km/qm pick inert={true} from React 19 on).
  // R3-files FT-16: za (ge, clsx) is the view-tabs graph's `clsx`; Wn (Td, Base UI useDirection) reads the view-tabs
  // DirectionContext (adapterChecks pins Td's text and its context's local).
  // R3-files FT-14: Ea (In, class-variance-authority) is the view-tabs graph's `cva` (shared-frame Cx's `g`).
  'vendor-frame-DfPJ1QmD.js': { Eo: 'reactVersion', za: 'clsx', Wn: 'useDirection', Ea: 'cva' },
  // shared-28 persisted preferences (`persisted.<key>` in localStorage + the desktop preferences bucket).
  'shared-28-DcgD7xXH.js': { gs: 'usePersistedValue', cs: 'readPersistedValue', _s: 'writePersistedValue', as: 'persistedValuesLoading' },
  // shared-frame X (twMerge cn): the view-tabs graph's `cdsClassNames` (D1 semantic name), not a second copy.
  // R3-files FT-16: CdsButton (cl), CdsIcon (Hl) and CdsContextMenu (Ii) are view-tabs semantic names (D1/D24). The
  // Tooltip (Oc), Popover (Zi), SkeletonGroup (tl) and Skeleton ($c) the breadcrumb popover renders are the host's
  // (SourceTooltip, SourcePopover, and the Skeleton DOM): view-tabs publishes no Popover or Skeleton, and the Files pane's
  // other tooltips are SourceTooltip. su (ja `W(la)`), Jl (lo, the rem-scaled length) and du (Na) are one-liners the
  // file-type icon reads; adapterChecks pins their text.
  'shared-frame-BfjMqbuN.js': {
    xd: 'cdsClassNames', cl: 'CdsButton', Hl: 'CdsIcon', Ii: 'CdsContextMenu',
    Oc: 'FilesTooltip', Zi: 'FilesPopover', tl: 'FilesSkeletonGroup', $c: 'FilesSkeleton',
    su: 'useCdsDensity', Jl: 'cdsRem', du: 'useCdsMode',
  },
  // react-intl FormattedMessage over the local catalog. R3-files FT-16: p (useIntl) and f (defineMessages, the identity).
  'vendor-intl-Db7hDWRO.js': { l: 'FormattedMessage', p: 'useIntl', f: 'defineMessages' },
  // R3-files: shared-0 Om (`globalThis["claude.web"]?.LocalSessions`, the desktop bridge the gone hook asks), my (Za,
  // GrowthBook isOn) and gy (no, GrowthBook value). Locally there is no GrowthBook: the answers are those of a client
  // that has not loaded (isOn false, value undefined), so kill switches stay off and rollouts keep their defaults.
  'shared-0-ByI5P0CP.js': { Om: 'LocalSessions', my: 'growthBookOn', gy: 'growthBookValue' },
  // R3-files FT-16: shared-25 Th (Zs, `Rs(I(e)).on`) is the same GrowthBook isOn (the file-type icon set's gate).
  'shared-25-DP8p7i1Z.js': { Th: 'growthBookOn' },
};
// R3-files FT-16: an adapter that restates an original one-liner names the text it restates; generation fails when the
// original changes. `viewTabs` also pins the view-tabs local the restated body reads (Td's `wd` is DirectionContext).
const adapterChecks = {
  'vendor-frame-DfPJ1QmD.js': {
    Wn: { text: ['function Td(){return N(wd)?.direction??"ltr"}'], viewTabs: { DirectionContext: 'wd' } },
    za: { text: ['function ge(){for(var e,t,n=0,r="",i=arguments.length;n<i;n++)'] },
  },
  'shared-frame-BfjMqbuN.js': {
    su: { text: ['function ja(){return W(la)}'], viewTabs: { CdsDensityContext: 'la' } },
    Jl: { text: ['lo=e=>`calc(${e/16}rem * var(${io}, 1))`'], also: ['io="--cds-rem-scale"'] },
    // Pa reads the mode store of an enclosing CdsRoot (`W(da)??fa`); the host renders none, so the original answers
    // fa.getSnapshot() (undefined) -> "light".
    du: { text: ['function Na(){return Pa()??"light"}'], also: ['function Pa(){let e=W(da)??fa;', 'getSnapshot:()=>void 0'] },
  },
  'vendor-intl-Db7hDWRO.js': { f: { text: ['function tn(e){return e}'] } },
  'shared-25-DP8p7i1Z.js': { Th: { text: ['function Zs(e){return Rs(I(e)).on}'] } },
};
// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots.
// `hostBindings` maps a same-chunk top-level binding to an adapter export instead of emitting its closure.
// `signature`: feature strings (prettier-formatted source) the emitted module must contain.
const modules = [
  // c82eca2bd Se / c44d00c7f: `let t = f(e.currentTarget); t && te(t)` — f is shared-25 Ff = up.
  // R3-files: dp (exported `Pf`) is the window-or-global form cccc2cf0a Gx (RTL scrollbar side) reads.
  { target: 'owner-window.mjs', source: 'shared-25-DP8p7i1Z.js', exports: { up: 'ownerWindow', dp: 'ownerWindowOrGlobal' },
    signature: ['.ownerDocument)?.defaultView ?? null', 'return up(e) ?? globalThis.window;'] },
  { target: 'editable-target.mjs', source: 'shared-156-Bikz018e.js', exports: { KB: 'isEditableTarget' },
    signature: ['n === "INPUT" || n === "TEXTAREA" || n === "SELECT"', '[contenteditable="plaintext-only" i]'] },
  // ca5db7aaf F (exported `s`): the menu Popup onContextMenu of the Files tree, file viewer and tab menus.
  { target: 'menu-context-guard.mjs', source: 'ca5db7aaf-DNznjmvJ.js', exports: { F: 'suppressNativeContextMenu' },
    signature: ['u(e.target) || e.preventDefault();'] },
  // c82eca2bd Be (exported `y`, c44d00c7f En): the onContextMenu of the four Changes ContextMenu.Popups.
  { target: 'diff-context-guard.mjs', source: 'c82eca2bd-1Y6mm3wZ.js', exports: { Be: 'preventContextMenu' },
    signature: ['function Be(e) {\n  e.preventDefault();\n}'] },
  // c03935b01 "epitaxy-diff-uncommitted-sessions": the sessions whose last pick was "Uncommitted changes" (≤ 50).
  // The chunk's top-level `$e((e) => Rn(e, "branch"))` (forget on session eviction) is a statement, not a binding:
  // the host registers the same call (source-diff-scope.jsx).
  { target: 'diff-scope-memory.mjs', source: 'c03935b01-CyJKQj4N.js',
    exports: {
      Pn: 'uncommittedSessionsKey', Fn: 'uncommittedSessionsDefault', In: 'uncommittedSessionIds', Ln: 'useStoredDiffScope',
      Rn: 'rememberDiffScope', An: 'branchDiffScope', jn: 'uncommittedDiffScope', Mn: 'diffScopeKey', Nn: 'sameDiffScope',
    },
    signature: ['"epitaxy-diff-uncommitted-sessions"', '[...r.slice(-49), e]', '{ kind: "uncommitted" }'] },
  // shared-frame Aj (exported `oi`): CDS ShimmerText.
  { target: 'shimmer-text.mjs', source: 'shared-frame-BfjMqbuN.js', hostBindings: { X: 'cdsClassNames' },
    exports: { Aj: 'ShimmerText' },
    signature: ['"data-cds": "ShimmerText"', 'animate-[cds-shimmer-text-shine_3s_linear_infinite]'] },
  // shared-19 jY (exported `do`): the "Checking for uncommitted changes…" line of the worktree confirms.
  { target: 'worktree-checking.mjs', source: 'shared-19-CkPOiIKm.js', exports: { jY: 'WorktreeChecking' },
    signature: ['id: "iJ0f0MP5kz"', '"text-footnote text-muted-as-secondary"', 'active: e !== "reserve"'] },

  // ---- R3-files FT-03: Files pane / Changes tree originals (FT-05 consumes the gone check and the open gate). ----
  // vendor-all-0 v (exported `R`): zustand's vanilla createStore, the store runtime c856385e2 $e builds on.
  { target: 'vanilla-store.mjs', source: 'vendor-all-0-CTKbbUUg.js', exports: { v: 'createStore' },
    signature: ['getInitialState: () => o', 'typeof i != "object" || !i'] },
  // shared-26 Wb (exported `nc`): the drive-letter test of shared-28 ak (isAbsolutePath for a platform).
  { target: 'windows-path.mjs', source: 'shared-26-CgdP_nTj.js', exports: { Wb: 'windowsAbsolutePath' },
    signature: ['var Wb = /^[A-Za-z]:[\\\\/]/;'] },
  // shared-28 ak (exported `sr`): `ve(path, false)` in the gone hook, a posix path that is absolute or "~"-rooted.
  { target: 'path-absolute.mjs', source: 'shared-28-DcgD7xXH.js', exports: { ak: 'isAbsolutePathFor' },
    signature: ['e.startsWith("/") || e === "~" || e.startsWith("~/")'] },
  // shared-104 bP (exported `Xn`): the image-extension rule (old shared-100 Ya) behind shared-28 vk.
  { target: 'image-path.mjs', source: 'shared-104-Cqo2-vQh.js', exports: { bP: 'isImagePath', dP: 'rasterImageExtensions' },
    signature: ['["png", "jpg", "jpeg", "gif", "bmp", "webp"]', '[...dP, "avif"]'] },
  // shared-28 Fk (old Ak): "Open in" editors only for a file that is not a document/binary/media type or an image
  // (files-27; the menus pass isDirectory and skip this for folders).
  { target: 'file-editor-path.mjs', source: 'shared-28-DcgD7xXH.js', exports: { Fk: 'canOpenFileInEditor' },
    signature: ['return !Pk.test(e) && !vk(e);', 'dng|svgz)$/i'] },
  // shared-104 Nl (exported `Bp`) over Ml: a promise raced against a DOMException("…", "TimeoutError").
  { target: 'promise-timeout.mjs', source: 'shared-104-Cqo2-vQh.js', exports: { Nl: 'withTimeout' },
    signature: ['new DOMException(n, "TimeoutError")', 'Promise.race([e, i]).finally(() => clearTimeout(r))'] },
  // shared-78 qa (exported `Pw`): the Windows user-agent test the gone hook skips on.
  { target: 'windows-platform.mjs', source: 'shared-78-D6VXYXaQ.js', exports: { qa: 'isWindowsPlatform' },
    signature: ['/(win32|win64|windows|wince)/i', 'window.navigator.userAgent.toLowerCase()'] },
  // c9b8e0296 r (exported `t`): the current session id context (`use(F)` in the gone hook; the session pane provides it).
  { target: 'session-context.mjs', source: 'c9b8e0296-Bo59dZrJ.js', exports: { r: 'CurrentSessionIdContext' },
    signature: ['r = t(null)'] },
  // c856385e2 V (exported `vt`; cccc2cf0a Kf, cfac349aa Ee): whether a right-clicked path is gone, asked of the desktop
  // before the menu opens. Local session, both paths absolute posix and outside iCloud/CloudStorage, not Windows, kill
  // switch "__gb__3212098161" off, 150 ms deadline. B (session id -> {type}) is the host's: every local session runs
  // on this machine, while the original reads the "local_" id prefix of the desktop's session ids.
  { target: 'file-gone-check.mjs', source: 'c856385e2-DVsjb2QL.js', hostBindings: { B: 'localSessionTarget' },
    exports: { V: 'useFileGone', qe: 'goneCheckablePath', Ke: 'cloudStoragePath', We: 'fileGoneKillSwitch', Ge: 'fileGoneDeadlineMs' },
    signature: ['m?.isSessionPathGone === void 0', 'B(r).type !== "local"', 'var We = "__gb__3212098161";', 'var Ge = 150;',
      '"The desktop did not answer in time"', 'return { gone: o === a, beforeOpen: u };', '(?:Mobile Documents|CloudStorage)'] },
  // c856385e2 H/$e/et/tt (old 2.31226.0 L/Re/ze/Be, identical) and it (exported `ct`; cccc2cf0a Ff): the Files pane's
  // multi-selection store, range / select-all, and "this row is part of a multi-selection" (no gone check then).
  { target: 'file-selection.mjs', source: 'c856385e2-DVsjb2QL.js',
    exports: { $e: 'createFileSelectionStore', et: 'selectFileRange', tt: 'selectAllFiles', it: 'inMultiSelection' },
    signature: ['selected: H,', 'e({ selected: new Map(i.map((e) => [e.absPath, e])) });', 'return n && r.size >= 2 && r.has(t);'] },
  // cccc2cf0a oS/uS/pS (old uy/my/_y): content-search grouping, whitespace collapse and the snippet lead/hit/tail layout.
  { target: 'file-content-results.mjs', source: 'cccc2cf0a-B0D--VZp.js',
    exports: { oS: 'groupContentResults', uS: 'collapseContentWhitespace', pS: 'contentSnippetLayout' },
    signature: ['return { groups: s, shown: a, truncated: i, patternRefused: !1 };', 'return (l >= 56320 && l <= 57343 && c++, i(c, "\\u2026"));'] },
  // cccc2cf0a Ux/Wx (old Jv/Yv): blank-area presses of the tree clear the selection; Wx adds the RTL scrollbar side (Gx).
  { target: 'file-tree-pointer.mjs', source: 'cccc2cf0a-B0D--VZp.js', exports: { Ux: 'isBlankTreeTarget', Wx: 'isBlankTreePress' },
    signature: ['t.closest("[data-tree-row]") === null', 'getComputedStyle(e).direction === "rtl"'] },
  // shared-frame Qt (exported `_d`): coarse-pointer / no-hover media query, which turns the in-window drag off.
  { target: 'coarse-pointer.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { Qt: 'isCoarsePointer' },
    signature: ['"(pointer: coarse), (hover: none)"'] },
  // cd06fb298 (old 2.31226.0 c194f2b35 w..j): the in-window file-context drag; d adds `!coarsePointer()` to the
  // "__gb__3508862586" rollout (no GrowthBook locally: value undefined, so on).
  { target: 'file-context-drag.mjs', source: 'cd06fb298-BHzAz0jN.js',
    exports: { c: 'fileContextDragType', d: 'fileContextDragEnabled', f: 'beginFileContextDrag', p: 'isFileContextDrag', m: 'draggedFilePaths', h: 'commitFileContextDrag', u: 'clearFileContextDrag' },
    signature: ['var s = "__gb__3508862586"', '"application/x-claude-file-context"', 'return !i() && n(s) !== !1;'] },
  // preload-helper e (exported `n`): tags an error with its o11y text; c3fde7009 Y throws "Unsupported frontmatter" with it.
  { target: 'error-text.mjs', source: 'preload-helper-D0dM6GpB.js', exports: { e: 'withErrorText' },
    signature: ['Symbol.for("ant.o11y.errorText")'] },
  // cf80fba0c e (exported `t`): Math.min over an iterable (NaN-, -0-aware), the frontmatter block indent.
  { target: 'array-min.mjs', source: 'cf80fba0c-CT5qqVq9.js', exports: { e: 'iterableMin' },
    signature: ['(n < t || (Object.is(n, -0) && t === 0)) && (t = n);'] },
  // c3fde7009 ki/Li (old ci/frontmatterFields): the Markdown preview's frontmatter split (an empty `---\n---` block
  // too, cov9-01) and its field parser, with the parser's closure.
  { target: 'file-frontmatter.mjs', source: 'c3fde7009-BbbO5TX9.js',
    exports: { ki: 'splitFrontmatter', Li: 'frontmatterFields', Oi: 'emptyFrontmatterBlock', Di: 'frontmatterBlock' },
    signature: ['var Oi = /^---\\r?\\n---[ \\t]*(?:\\r?\\n|$)/;', 'Error("Unsupported frontmatter")', 'return { fields: Li(n[1]), body: r };'] },
  // c44d00c7f hi/mi (≡ 2.37337.1 pi): F7 / ⇧F7 change navigation, including a change that starts at the anchor line
  // when the anchor sits below the pane (`belowPane`, diffgit-09). R3-files FT-07: pi, the change anchors of one file
  // (one per change run of its @pierre/diffs hunks; Nt pushes `...pi(e, t)` for every expanded file).
  { target: 'diff-change-nav.mjs', source: 'c44d00c7f-zUAG9XyS.js', exports: { hi: 'adjacentChange', mi: 'sameChangeAnchor', pi: 'changeAnchors' },
    signature: ['(a.belowPane === !0 && c(e))', 'e.id === t.id && e.side === t.side && e.lineNumber === t.lineNumber',
      'let t = r.deletionStart + +(r.deletionCount === 0),', 'let r = a.additions > 0 ? "additions" : "deletions";', 'removes: a.deletions > 0,'] },
  // c44d00c7f kc/Oc/Dc (≡ Ec): expanding a Changes tree folder scrolls so its whole subtree shows (diffgit-04).
  { target: 'diff-tree-expand.mjs', source: 'c44d00c7f-zUAG9XyS.js', exports: { kc: 'revealExpandedSubtree', Oc: 'diffTreeRowLevel', Dc: 'diffTreeRowSelector' },
    signature: ['var Dc = "[data-diff-tree-row]";', 'i.scrollTop += Math.max(0, Math.min(l, u));'] },
  // c44d00c7f Ca (≡ xa): Hide whitespace pauses while findings, PR comments or non-Files annotations/drafts show (diffgit-11).
  { target: 'diff-whitespace-pause.mjs', source: 'c44d00c7f-zUAG9XyS.js', exports: { Ca: 'whitespaceHidingPaused' },
    signature: ['e.some((e) => e.source !== "file")', 'Object.values(r).some((e) => e.source !== "file")'] },
  // ca7840910 N/M/A/j/P/I/F (cccc2cf0a Nl/Pl/Rl/zl, Ul/Wl; P is the compact tree's row): the tree's official classes
  // (files-08 / files-v03: the kept-guide layer, the `group/file-tree` container, the row colors).
  { target: 'file-tree-row-classes.mjs', source: 'ca7840910-DSVFtTw1.js',
    exports: { N: 'fileTreePadding', M: 'fileTreeRowGap', A: 'fileTreeGroup', j: 'fileTreeKeptGuides', P: 'fileTreeCompactRow', I: 'fileTreeRowCurrent', F: 'fileTreeRowIdle' },
    signature: ['bg-(image:--file-tree-kept-guides) group-hover/file-tree:bg-(image:--file-tree-guides)', 'group/file-tree [&:where(:root[dir=rtl]_:dir(rtl))]:[--file-tree-guides-to:to_left]', 'h-control app-list-row'] },
  // shared-156 dV/fV (exported `nr`/`sr`): a document-scoped "a menu is waiting to open" count, held while the gate waits.
  { target: 'menu-pending.mjs', source: 'shared-156-Bikz018e.js', exports: { dV: 'holdMenuPending', fV: 'menuPending' },
    signature: ['(uV.set(e, (uV.get(e) ?? 0) + 1),', 'return uV.has(e);'] },
  // shared-19 pZ/dZ (exported `ya`): swallow the held key's repeats after the key closed something (Escape).
  { target: 'escape-repeat.mjs', source: 'shared-19-CkPOiIKm.js', exports: { pZ: 'suppressEscapeRepeat' },
    signature: ['dZ("Escape", e);', 't.key === e && t.repeat ? (t.preventDefault(), t.stopPropagation()) : i();'] },
  // shared-frame lc (exported `vl`): an event target narrowed to an Element.
  { target: 'event-element.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { lc: 'elementTarget' },
    signature: ['return e?.nodeType === 1 ? e : null;'] },
  // c0cdf4a08 h/g (exported `n`; c856385e2 Re): a menu whose beforeOpen returned a promise opens when it settles, unless a
  // press, a key (Escape is swallowed with its repeats) or a blur comes first; only the latest request may open.
  { target: 'menu-open-gate.mjs', source: 'c0cdf4a08-h228IL-P.js', exports: { h: 'openAfterCheck', g: 'useMenuOpenGate' },
    signature: ['r.addEventListener("pointerdown", o, { capture: !0, signal: a })', 'm === o && (o(), n());', 'h(d(n.event.target), i, () => r(!0));'] },

  // ---- R3-files FT-16: the breadcrumb's "Files in {folder}" popover (cfac349aa Pt/Nt/Lt) and its compact tree
  // (ca7840910 ie), with the TanStack Query / zustand runtime and the small originals they import. ----
  // shared-0 bI (exported `ul`): the no-op the popover's fetch catches with (`Y(…).catch(v)`).
  { target: 'noop.mjs', source: 'shared-0-ByI5P0CP.js', exports: { bI: 'noop' }, signature: ['function bI() {}'] },
  // vendor-all-0 ee (exported `I`): zustand's React `create` over the vanilla store (v, vanilla-store.mjs); `c` is React.
  { target: 'react-store.mjs', source: 'vendor-all-0-CTKbbUUg.js', exports: { ee: 'create' },
    signature: ['ee = (e) => (e ? x(e) : x)', 'let n = c.useSyncExternalStore(', '() => t(e.getInitialState()),'] },
  // vendor-query (TanStack Query v5): QueryClient Ve (`m`), QueryClientProvider He (`f`), useQueryClient J (`p`),
  // useQuery tt (`s`) and queryOptions nt (`o`), with the cache / observer / focus / online / notify runtime they close
  // over. The host makes one client (source-breadcrumb-adapters.jsx) with the official app's query defaults.
  { target: 'file-browser-query.mjs', source: 'vendor-query-Dqcf4jOo.js',
    exports: { Ve: 'QueryClient', He: 'QueryClientProvider', J: 'useQueryClient', tt: 'useQuery', nt: 'queryOptions' },
    signature: ['throw Error("No QueryClient set, use QueryClientProvider to set one");', 'return et(e, U, t);',
      'e.mount(),', '(t.refetchOnReconnect = t.networkMode !== "always")'] },
  // shared-18 PR (exported `En`, folders first, then a numeric collator) and GR (exported `xn`, the popover's
  // collisionPadding). MR's Ct is shared-0 Hi (code-current lazy-init.mjs).
  { target: 'file-entry-order.mjs', source: 'shared-18-D4XxL6Tg.js', exports: { PR: 'compareFileEntries', GR: 'popoverCollisionPadding' },
    signature: ['? NR(e.name, t.name)', 'MR = Ct(() => new Intl.Collator(void 0, { numeric: !0 }))', 'GR = { top: 48, right: 8, bottom: 8, left: 8 }'] },
  // shared-26 Gb/Jb (exported `tc`/`ac`): UNC / device-namespace prefixes, and "drive letter or UNC" (Kb, qb).
  { target: 'windows-path-kinds.mjs', source: 'shared-26-CgdP_nTj.js', exports: { Gb: 'uncPathPattern', Jb: 'isWindowsRootedPath' },
    signature: ['Gb = /^(?:[\\\\/]{2}|[\\\\/]\\?\\?[\\\\/])/', 'return Kb(e) || qb(e);'] },
  // shared-28 HO (exported `Kn`): a path relative to a root, case-insensitively (the folder query's relativePath);
  // Pm (exported `bo`): a logical side ("inline-start" / "inline-end") as left/right for the text direction.
  { target: 'file-relative-path.mjs', source: 'shared-28-DcgD7xXH.js', exports: { HO: 'relativeToRoot', Pm: 'physicalSide' },
    signature: ['return a === o ? "" : a.startsWith(`${o}/`) ? r.slice(i.length + 1) : r;', 'return (e === "inline-start") == (t === "rtl") ? "right" : "left";'] },
  // shared-104 Ff (exported `Tf`): run an async step with a loading flag set around it (a folder row's children).
  { target: 'loading-flag.mjs', source: 'shared-104-Cqo2-vQh.js', exports: { Ff: 'withLoadingFlag' },
    signature: ['async function Ff(e, t) {\n  e(!0);', '} finally {\n    e(!1);'] },
  // shared-104 jP (exported `ir`): the highlight language ids the file-kind icon treats as code.
  { target: 'code-language-ids.mjs', source: 'shared-104-Cqo2-vQh.js', exports: { jP: 'highlightLanguageIds' },
    signature: ['"python.javascript.typescript.java.csharp.go.rust.ruby.php.swift.kotlin.dart.scala.perl'] },
  // c7037f09e e (exported `t`): ArrowLeft/ArrowRight swap in RTL (the compact tree's keys).
  { target: 'arrow-key-direction.mjs', source: 'c7037f09e-DXK8RSre.js', exports: { e: 'logicalArrowKey' },
    signature: ['if (e === "ArrowLeft") return "ArrowRight";', 'if (e === "ArrowRight") return "ArrowLeft";'] },
  // shared-6 Yk (exported `Va`): source-code extensions; shared-2 jq (exported `Rt`, with Aq): md/html icon overrides.
  { target: 'source-code-extensions.mjs', source: 'shared-6-Cby4X-ms.js', exports: { Yk: 'sourceCodeExtensions' },
    signature: ['"js.jsx.gs.ts.tsx.py.rb.go.rs.c.cpp.h.hpp.java.kt.swift.sh.bash.zsh.json.yaml.yml.toml.xml.html.css.scss.sql.graphql.proto.lua.r"'] },
  { target: 'file-icon-overrides.mjs', source: 'shared-2-Cb74JByF.js', exports: { jq: 'fileIconOverride' },
    signature: ['return t && Object.hasOwn(Aq, t) ? Aq[t] : void 0;', 'markdown: "Note",', 'xhtml: "Globe",'] },
  // shared-9 cg (exported `Y`): a file name's CDS icon (File / Code / Database / Spreadsheet / Slides / Image / Archive /
  // Scroll, Note / Globe overrides). The local file-kind-icon.mjs is a 2.2553.1 copy of the same rule.
  { target: 'file-kind-icon-name.mjs', source: 'shared-9-D7uuiUv7.js', exports: { cg: 'fileKindIconName' },
    signature: ['return t === "skill" ? sg.skill : (Vn(ag(e)) ?? sg[t]);', 'skill: "Scroll",', 'e.includes("SKILL.md") ? "skill"'] },
  // shared-52 n_ (exported `wd`): a path's last segment.
  { target: 'path-basename.mjs', source: 'shared-52-DGviI8xb.js', exports: { n_: 'pathBasename' },
    signature: ['n = Math.max(t.lastIndexOf("/"), t.lastIndexOf("\\\\"));'] },
  // shared-25 _i (exported `a_`): a subscribe that never notifies (the file-type icon while its icon set is off).
  { target: 'subscribe-never.mjs', source: 'shared-25-DP8p7i1Z.js', exports: { _i: 'subscribeNever' },
    signature: ['function _i() {\n  return vi;\n}', 'function vi() {}'] },
  // c36273108 t: SVG attribute escaping (the icon set's markup).
  { target: 'attribute-escape.mjs', source: 'c36273108-nfRg0EqW.js', exports: { t: 'escapeAttribute' },
    signature: ['return t.replace(/[&<>"\']/g, (t) => e[t]);', '"\'": "&#39;"'] },
  // c280f9bbb B (exported `t`): the file-type icon. Its colored icon set (fetched JSON) is behind GrowthBook
  // "__gb__2954460583"; without GrowthBook that gate is off and B renders the CDS icon of shared-9 cg.
  { target: 'file-type-icon.mjs', source: 'c280f9bbb-Dw5U-PIG.js', exports: { B: 'FileTypeIcon' },
    signature: ['F = "__gb__2954460583"', 'return i === "auto"', 'e(l, { name: h, size: i, className: a })', '"data-file-type-icon": ""'] },
  // c30c42d34 f (exported `t`): the inline Try again button (focus kept on unmount, an sr-only failure status).
  { target: 'retry-button.mjs', source: 'c30c42d34-DW_r0HJ_.js', exports: { f: 'RetryButton' },
    signature: ['children: i(s, { defaultMessage: "Try again", id: "FazwRldA7z" }),', 'children: m > 0 && i("span", { children: d }, m),'] },
  // c6e73333a w (exported `r`): the diff-widget surface the popover paints (`style: { backgroundColor: je }`).
  { target: 'diff-widget-background.mjs', source: 'c6e73333a-HHjd1vH0.js', exports: { w: 'diffWidgetBackground' },
    signature: ['w = "var(--diff-widget-bg, var(--cds-surface-3))"'] },
  // ca7840910 ie (exported `t`) and q (exported `n`): the folder tree (variant "compact" in the popover: h-control rows,
  // a caret, file-type icons, 200 entries per level, autoFocus on the current row), and its "current or first row".
  // E (icon size) and L (indent) are code-current file-tree-style.mjs; P/M/F/I are file-tree-row-classes.mjs.
  { target: 'file-tree-compact.mjs', source: 'ca7840910-DSVFtTw1.js',
    currentBindings: { E: ['file-tree-style.mjs', 'fileTreeIconSize'], L: ['file-tree-style.mjs', 'treeIndent'] },
    exports: { ie: 'FolderTree', q: 'currentFolderTreeRow' },
    signature: ['dirRow: `${P} ${F}`,', 'fileRow: (e) => u(P, e ? I : F),', 'name: "CaretRight",', '"Collapse folder {name}"', '"Expand folder {name}"',
      '"{count, plural, one {# more item not shown} other {# more items not shown}}"', '`${G}[aria-current="true"]`', 'variant: h = "classic",'] },
  // cfac349aa Pt (the folder segment: a Popover whose trigger is the segment button), Nt (open / held / warm: the
  // listing is fetched on open and the popup stays transparent for up to 150 ms while it loads; hover or focus
  // prefetches), Lt (the list: skeleton, "Couldn’t list this folder" + Try again, "Empty folder", or the compact tree),
  // and J / Y (the "epitaxy-file-browser-tree" query). jt / Mt are code-current breadcrumb-paths.mjs.
  { target: 'breadcrumb-folder.mjs', source: 'cfac349aa-BiPinwNg.js',
    currentBindings: { jt: ['breadcrumb-paths.mjs', 'segmentClass'], Mt: ['breadcrumb-paths.mjs', 'segmentKeys'] },
    exports: { Pt: 'BreadcrumbFolderSegment', Nt: 'useFolderPopover', Lt: 'BreadcrumbFolderList', J: 'folderListQuery', Y: 'fetchFolderList',
      q: 'folderListQueryKey', ut: 'folderListFailed', zt: 'folderTreeEntries', Tt: 'folderEntryLimit', Et: 'folderSkeletonRows', kt: 'folderHoldMs' },
    signature: ['"epitaxy-root break-words w-72 max-h-[min(24rem,var(--available-height))]"', 'At = "opacity-0 pointer-events-none"', 'kt = 150',
      'f = setTimeout(d, kt);', '{ defaultMessage: "Files in {folder}", id: "ymTEkGZRIx" }', 'defaultMessage: "Listing this folder",',
      '"Couldn\\u2019t list this folder"', '{ defaultMessage: "Empty folder", id: "8a1Ts60z9o" }', 'variant: "compact",', 'maxEntries: Tt,',
      'return ["epitaxy-file-browser-tree", e, t];', 'className: p(Dt, v && At),', '"flex items-center h-control px-md text-footnote text-muted-as-secondary"'] },

  // ---- R3-files FT-14: the Files tree rows (cccc2cf0a NS / AS) and the worktree start folder (cccc2cf0a zx). ----
  // shared-6 _h / vh (exported `df` / `ff`; cccc2cf0a En / Dn): the list-row height markers of a tree row (h-control) and
  // of its error row (min-h-control). `app-list-row` / `app-list-row-min` are markers without rules.
  { target: 'app-list-row.mjs', source: 'shared-6-Cby4X-ms.js', exports: { _h: 'appListRow', vh: 'appListRowMin' },
    signature: ['_h = "h-control app-list-row"', 'vh = "min-h-control app-list-row-min"'] },
  // shared-frame Cx (exported `oo`; cccc2cf0a vr): the CDS menu-item variants a tree row starts from (`Er(vr(), dx, …)`).
  // g is vendor-frame Ea, the view-tabs graph's `cva`.
  { target: 'menu-item-classes.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { Cx: 'menuItemClasses' },
    signature: ['"cds-reset flex w-full items-center gap-xs compact:px-2 comfortable:px-2.5', 'default: "text-primary data-[highlighted]:bg-fill-ghost-hover",',
      'defaultVariants: { variant: "default" }'] },
  // cccc2cf0a dx / fx / px: the tree row's base (`relative ${En} py-0 …`), its selected colors, and the row's primary
  // button (`… ${Pl} … before:absolute before:inset-0 before:content-['']`); xS / SS: which open folders keep their
  // guide (the parents of selected or current rows) and the kept-guide gradients of one row (Il = ca7840910 z).
  { target: 'file-tree-row.mjs', source: 'cccc2cf0a-B0D--VZp.js',
    exports: { dx: 'fileTreeRowBase', fx: 'fileTreeRowSelected', px: 'fileTreeRowPrimary', xS: 'keptGuideFolders', SS: 'keptGuidesOfRow' },
    signature: ['dx = `relative ${En} py-0 focus-visible:outline-hidden focus-visible:shadow-focus`', 'fx = "bg-fill-ghost-selected hover:bg-fill-ghost-selected"',
      "before:absolute before:inset-0 before:content-['']", 'n.add(e[i + 1]?.parentIndex === i ? i : r.parentIndex);',
      'for (; i >= 0; i = e[i].parentIndex) t.has(i) && r.push(Il(e[i].depth));', 'return r.join(", ") || void 0;'] },
  // shared-28 GO (exported `fr`, a path relative to a root, or undefined outside it) and RO (exported `lr`, join), the
  // path helpers zx reads. PO is code-current file-output-normalize.mjs; kr / Mr are shared-26 (windows-path*.mjs).
  { target: 'path-within.mjs', source: 'shared-28-DcgD7xXH.js',
    currentBindings: { PO: ['file-output-normalize.mjs', 'isAbsolutePath'] },
    exports: { GO: 'pathWithinRoot', RO: 'joinPath' },
    signature: ['return e.startsWith(n) && (r === "/" || r === "\\\\") && e.length > n.length + 1', '`${n}\\\\${t.replace(/\\//g, "\\\\")}`'] },
  // shared-0 jB (exported `Ro`): the "gitInfo" query-key prefix.
  { target: 'git-info-key.mjs', source: 'shared-0-ByI5P0CP.js', exports: { jB: 'gitInfoQueryKey' }, signature: ['jB = "gitInfo"'] },
  // shared-11 zd (exported `Zr`; cccc2cf0a Ta) over Rd: the git info query of a folder, asked of LocalSessions getGitInfo
  // (the host answers it from main's repo identities; see the adapter module).
  { target: 'git-info-query.mjs', source: 'shared-11-BuQ3CK5I.js', exports: { zd: 'gitInfoQuery' },
    signature: ['queryKey: [Me, n, t],', 'return V?.getGitInfo ? V.getGitInfo(e) : null;', 'networkMode: "always",', 'staleTime: 3e5,'] },
  // cccc2cf0a zx (files-10): a local session in a desktop worktree whose origin folder is below its repository root
  // starts its Files tree at the same folder inside the worktree (Nx: `{absPath: Vx(j), nonce: Rx, start: true}`).
  { target: 'file-tree-start-folder.mjs', source: 'cccc2cf0a-B0D--VZp.js',
    exports: { zx: 'useWorktreeStartFolder', Vx: 'normalizeRevealPath', Rx: 'startRevealNonce' },
    signature: ['t.hasDesktopWorktree === !0 &&', 'r = n && t?.originCwd !== n ? t?.originCwd : void 0,', '{ data: i } = yi({ ...Ta(r, "local"), select: (e) => e?.root }),',
      'a = r && Zr(r, i)?.replace(/[\\\\/]+$/, "");', 'return n && a ? ti(n, a) : void 0;', 'var Rx = -1;'] },
  // c856385e2 nt (exported `dt`; cccc2cf0a If): Escape (no modifier, not composing) clears a multi-selection of the tree
  // element it is bound to, swallowing the held key's repeats (files-26).
  { target: 'file-selection-escape.mjs', source: 'c856385e2-DVsjb2QL.js', exports: { nt: 'useMultiSelectionEscape' },
    signature: ['n.key !== "Escape" ||', 't.getState().selected.size < 2', '(r && v(r), t.getState().clear());', 'e.addEventListener("keydown", n),'] },

  // ---- R3-files FT-18: the Markdown preview's frontmatter list (cov9-01), c3fde7009 Ei (pane / document variants). ----
  { target: 'file-frontmatter-view.mjs', source: 'c3fde7009-BbbO5TX9.js', exports: { Ei: 'Frontmatter', Ti: 'frontmatterLabel' },
    signature: ['function Ei({ frontmatter: e, variant: t = "pane" })', 'className: "text-footnote text-muted-as-secondary",',
      '"grid grid-cols-[max-content_1fr] items-baseline gap-x-[28px] gap-y-md mb-[24px] pb-[20px] border-b border-alpha-2"'] },

  // ---- R3-files FT-07: the Changes "Changed files" tree rows (c44d00c7f Rc / zc / Ec / Fc, diffgit-03/04/05). ----
  // c784da984 d (exported `n`; c44d00c7f St, a folder row's name) and p (exported `t`; Ct, a flat list's file row): a path
  // as its folder prefix (cut at the head with an ellipsis overlay when it does not fit, ce574895a g) then its last
  // segment, and the "name first, then its folder in footnote" form whose folder fades out once clipped. WO is
  // code-current path-parts.mjs, l / g (observeWidth / useHeadCut) are code-current breadcrumb-measure.mjs.
  { target: 'path-segments.mjs', source: 'c784da984-B4E9BLV6.js', exports: { d: 'PathSegments', p: 'NameThenFolder' },
    signature: ['"relative flex min-w-0 overflow-hidden whitespace-nowrap",', '"aria-label": p ? a : void 0,',
      '"absolute inset-0 truncate text-start select-none [text-decoration:inherit]",', 'var f = 5;',
      '"flex min-w-0 text-footnote text-muted-as-secondary data-[clipped]:opacity-0",', 'e.toggleAttribute("data-clipped", t < s - 1);'] },
  // c44d00c7f Jr (with Kr / Gr / Wr / qr): a Changed files row's tooltip (side bottom, align start, 700 ms, not hoverable,
  // lazy) — the row's name when it is clipped, or a nested file's own name while the pointer is on it, with its folder as
  // the detail line; a folder name with "/" and a file's folder are split at "/" (c0fbbe82d hn, code-current
  // path-tooltip.mjs) under the max-w-[min(480px,var(--available-width))] cap (mn). Oc is the host tooltip (FilesTooltip).
  { target: 'diff-tree-tooltip.mjs', source: 'c44d00c7f-zUAG9XyS.js', exports: { Jr: 'DiffTreeRowTooltip', Wr: 'rowNameClipped' },
    signature: ['u = e.includes("/"),', 'd = r && n ? n : void 0;', 'let t = u ? Ot(e) : e;', 'detail: o ? null : d === void 0 ? n || null : c(qr, { path: d }),',
      'className: u || d !== void 0 ? Dt.className : void 0,', 'delay: 700,', 'lazy: !0,', 'e.querySelector("[data-clipped]") !== null'] },
];

// Adapter names the host answers from the view-tabs graph (src/source-files-changes-adapters.jsx re-exports them).
const viewTabsNames = new Set(['cdsClassNames', 'clsx', 'CdsButton', 'CdsIcon', 'CdsContextMenu', 'cva']);
let viewTabsManifest;
const readViewTabsManifest = async () =>
  (viewTabsManifest ??= JSON.parse(await fs.readFile(path.join(root, 'src/generated/view-tabs/manifest.json'), 'utf8')));
async function checkViewTabsName(name, { file, local, exported }) {
  if (!viewTabsNames.has(name)) return;
  await readViewTabsManifest();
  const entry = viewTabsManifest.publicNames?.[name];
  if (viewTabsManifest.referenceVersion !== referenceVersion || !entry || entry.file !== file
    || (local !== undefined && entry.local !== local) || (exported !== undefined && entry.export !== exported))
    throw Error(`view-tabs ${name} is not ${file}:${local ?? exported} (${JSON.stringify(entry)}, ${viewTabsManifest.referenceVersion})`);
}

// R3-files FT-16: the raw (unformatted) top-level declaration an export alias names, for adapterChecks.
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
  for (const [name, expected] of Object.entries(check.viewTabs ?? {})) {
    const entry = (await readViewTabsManifest()).publicNames?.[name];
    if (viewTabsManifest.referenceVersion !== referenceVersion || entry?.file !== file || entry.local !== expected)
      throw Error(`adapter ${file}:${alias} reads view-tabs ${name}, which is not ${file}:${expected} (${JSON.stringify(entry)})`);
  }
}

// R3-files FT-16: a binding already emitted from the same 2.42304.0 chunk by scripts/extract-code-ui-current.mjs is
// imported from that module (src/generated/code-current) instead of being duplicated, when that module exports it.
// The declaration is compared after formatting both on their own, so a code-current module that still holds an older
// or re-pointed text fails generation.
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

function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) throw Error(`Unmapped vendor import ${file}:${alias}`);
  const local = src.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${target[1]}\\b`).test(src.bytes.toString()))
    throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
  return target;
}

export async function extractFilesChanges({ check = false } = {}) {
  const cache = new Map();
  const emitted = []; // modules already generated in this run: { spec, src }
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-files-changes.mjs', adapterModule: 'src/source-files-changes-adapters.jsx', modules: [] };
  const files = {};
  for (const spec of modules) {
    const src = await readSource(spec.source, cache);
    const selected = new Map(), imports = new Map(), seen = new Set();
    // A binding of the same chunk already emitted by an earlier module is imported, never duplicated.
    const sibling = local => emitted.find(m => m.spec.source === spec.source && m.spec.exports[local]);
    const fromChunk = async (file, alias, via) => {
      if (adapters[file]?.[alias]) {
        await checkViewTabsName(adapters[file][alias], { file, exported: alias });
        await checkAdapter(file, alias);
        return { from: adapterModule, name: adapters[file][alias], via, kind: 'adapter' };
      }
      const dep = cache.get(file);
      const local = dep?.exported.get(alias);
      const owner = local && emitted.find(m => m.spec.source === file && m.spec.exports[local]);
      if (owner) return { from: `./${owner.spec.target}`, name: owner.spec.exports[local], via, kind: 'generated' };
      const current = local && await currentExport(file, local, dep);
      if (!current) throw Error(`${spec.target}: unresolved import ${via}`);
      return { ...current, via };
    };
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      if (spec.hostBindings?.[name]) {
        if (!src.program.scope.getBinding(name)) throw Error(`${spec.target}: host binding ${name} no longer exists`);
        await checkViewTabsName(spec.hostBindings[name], { file: spec.source, local: name });
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
        if (!adapters[file]?.[alias] && vendor[file]) {
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
    for (const name of Object.keys(spec.exports)) await add(name);
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
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-files-changes.mjs.\n// Edit the extractor or src/source-files-changes-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    for (const feature of spec.signature ?? [])
      if (!text.includes(feature)) throw Error(`${spec.target}: ${spec.source} no longer has ${JSON.stringify(feature)}; re-check its roots`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(src.code.slice(p.node.start, p.node.end)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind })),
      exports: spec.exports,
    });
    emitted.push({ spec, src });
  }
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
