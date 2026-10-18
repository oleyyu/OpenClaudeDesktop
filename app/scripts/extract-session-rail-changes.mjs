// R4f-rail SR-4: extract the 2.42304.0 session rail's Changes row (the flat rail's `data-rail-changes-row`), without
// executing any desktop runtime (decision D0: own generator, own output folder src/generated/session-rail-changes, own
// scripts/verify-gen-session-rail-changes.mjs).
// Spec: analysis/code-ui-migrate-20261017/research/r4-session-rail.md §1.5, §2, §8 SR-4.
//
//   changes-row.mjs        c96d752d0 OLe: the PR bar's rail-layout row. With no PR link and the Changes row layout
//                          context (c0a531389 O, kit ChangesRowLayoutContext) at "row" it renders the flat rail's
//                          single row: `div[data-rail-changes-row]` with the ChangesPlusMinus icon, the repo name, the
//                          diff counts button ("Open changes", the toggleDiff shortcut, aria-label "Open changes,
//                          {added, number} added, {removed, number} removed"), review comments (aB), the warning, the
//                          checks and verb slots and the sr-only ⋮ "More options for {title}" menu (kLe), all inside the
//                          row's context menu; otherwise the stacked layout. kLe is the menu body (View changes, Open
//                          review comments, extra items, Dismiss); aB the review comments count.
//   changes-verb.mjs       c96d752d0 DLe with Qz: the rail row's verb button (the PR bar's primary action, Commit in a
//                          local session), CLe / rB its label and busy label.
//   diff-counts.mjs        c60636ac6 Xe (cf74bc599 / c96d752d0 dS): the +N −M counts with their sr-only "N additions,
//                          M deletions".
//   …                      and the small originals those read.
//
// Every emitted binding is an original top-level declaration sliced from the installed chunk. A module's bindings are
// the reachable closure of its roots: a declaration's dependencies are its free variables (each declaration is parsed
// on its own; Babel's scope analysis names what it reads from outside). An import or same-chunk binding resolves, in
// this order, to: a host adapter in src/source-session-rail-changes-adapters.jsx (feature-checked against the original
// it replaces), an earlier module of this generator, a public name of the session rail kit (SR-1: its contexts, row
// primitives and constants exist once, in src/generated/session-rail-kit), a semantic public name of the shared
// view-tabs graph (D1/D24), React (a vendor-frame `X = <React namespace>.member`), or a code-current export of the same
// original binding. Nothing else is accepted; a binding another generated area slices without exporting is refused
// unless `duplicates` says why a second copy is harmless, and a context is never instantiated twice.
//
// R4i-rail RL2 adds pr-rows.mjs: c96d752d0 iB (the PR bar row; its rail branch builds the PR link and CI glyph and
// hands OLe its props), oRe (the rail rows list, Show more) and sRe (earlier pull requests), with eze's rail shape
// helpers (tRe / aRe / dLe) and nze's mode (yze), plus what they read from other chunks (branch-row-classes.mjs,
// dismiss-button.mjs, rail-disclosure.mjs, copy-link-item.mjs's link menu and host label, pr-bar-labels.mjs's CI dot).
// wB (the tile store), Yz / qz / pE (one copy in the sibling rail areas) and the PR panel / in-app link / hover card
// sources are host adapters.
//
// The remaining callers are not sliced: c96d752d0 wB (the rail list item, diffOpenHasChord from the tile layout; a host
// adapter), nze (the per-repo props assembly against claude.ai's PR stores), eze (the PR bar root),
// cf74bc599 pC (EpitaxyPrBarSlot) and c73f45bc3 O_ (the card's lazy slot) read GitHub, the PR store and the tile store.
// `callSites` pin their original text; the host adapter follows it over the local git status (main.jsx gitStatus).
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
const output = path.join(root, 'src/generated/session-rail-changes');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-session-rail-changes-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const VENDOR_FRAME = 'vendor-frame-DfPJ1QmD.js';
const TRANSCRIPT = 'c96d752d0-BOCqU7c2.js';

// vendor-frame's React namespaces: `X = <ns>.member` is `import { member } from <module>`. Each namespace is proved by
// strings of the CommonJS factory its closure wraps.
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
  // react-intl useIntl / FormattedMessage over the local catalog (the kit's adapters, re-exported).
  'vendor-intl-Db7hDWRO.js:q': { name: 'useIntl', features: ['let e = o(K);', 'return (Mt(e), e);'] },
  'vendor-intl-Db7hDWRO.js:Gt': { name: 'FormattedMessage', features: ['var Gt = u(Wt, Ut);'] },
  // shared-frame qa (exported _u): the CDS layer element (OLe's portalContainer, the menu's window); none here.
  'shared-frame-BfjMqbuN.js:qa': { name: 'useLayerElement', features: ['return W(Oa);'] },
  // shared-52 Sj (exported Ya): the ErrorsProvider; the host toasts (the kit's adapter, re-exported).
  'shared-52-DGviI8xb.js:Sj': { name: 'useErrors', features: ['Error("Must be called within ErrorsProvider")'] },
  // shared-25 ml (exported Rm): whether this is the Claude desktop app (the user agent test behind the keybinding
  // table's `when: "isClaudeApp"` rows). This host is the desktop app: true.
  'shared-25-DP8p7i1Z.js:ml': { name: 'isClaudeDesktopApp', features: ['se(window.navigator.userAgent, { version: e, platform: t })'] },
  // shared-frame Ya (exported mu): the layer element's window, else the current one (the kit's adapter, re-exported).
  'shared-frame-BfjMqbuN.js:Ya': { name: 'useLayerOwnerWindow', features: ['return Ji(W(Oa));'] },
  // shared-frame iC (exported Ya): a menu items array (label / onSelect / checked / separatorBefore / items …) as CDS
  // dropdown items. view-tabs slices it but does not publish a semantic name (D1/D24); its 80 KB closure (the Base UI
  // menu parts and their contexts) cannot be sliced twice. Only OLe's extraMenuItems (the PR bar's create-mode radio
  // items, offered only when a GitHub PR can be created) goes through it, and this host's rail never passes those.
  'shared-frame-BfjMqbuN.js:iC': { name: 'renderMenuItems', features: ['e === "separator"', 'onClick: e.onSelect,', 'children: iC(e.items)'] },
  // ---- R4i-rail RL2: the rail PR rows (pr-rows.mjs: c96d752d0 iB / oRe / sRe and the rail shape helpers) ----
  // c96d752d0 wB: the rail list item reads the tile store (Yh, c03935b01's 68 KB tile layout closure) for
  // diffOpenHasChord; the host list item takes it from the entry the host stand-in builds (main.jsx's chord rule).
  'c96d752d0-BOCqU7c2.js:wB': { name: 'RailPrListItem', features: ['if (!e.primary || jhe(t, "diff")) return !1;', 'className: "flex flex-col",',
    'children: b(iB, { ...e.row, layout: "rail", diffOpenHasChord: t }),'] },
  // c96d752d0 Yz (the repo name chip, iB's band layout): its one copy is session-rail repo-name-chip.mjs (a sibling area
  // this generator does not import from), re-exported by the adapter module.
  'c96d752d0-BOCqU7c2.js:Yz': { name: 'RepoNameChip', features: ['var Yz = M(pLe);'] },
  // c96d752d0 qz (dLe reports the rail PR count into it): the one instance is session-rail pr-count-context.mjs, which
  // rail-view's Changes card provides (rD's `Wo.Provider value: ge`); re-exported, never instantiated twice.
  'c96d752d0-BOCqU7c2.js:qz': { name: 'RailPrCountContext', features: ['var qz = E(null);'] },
  // shared-20 pE (oRe's Dae): the sr-only status announcement; its one copy is session-rail-sections announcement.mjs.
  'shared-20-B7UqYfsi.js:pE': { name: 'Announcement', features: ['className: "sr-only",', 'role: "status",', 'children: [e.text, e.nonce % 2 == 1'] },
  // c227f4d5e Nw (iB's default prPanelPreloadHandle, the lazy EpitaxyPrPanel's handle): the host has no in-app PR panel,
  // so iB never passes it to yo (`yo(o ? u : null)`, o = onOpenPrPanel is never set): null.
  'c227f4d5e-Ba-r--Rl.js:Nw': { name: 'prPanelPreloadHandle', features: ['var Nw = Mw.handle;'] },
  // cc6e65d4b f (iB's Xbe): a PR link click opens the link in the app's preview pane when prLinkOpensInApp. The host
  // opens PRs in the browser (nze's `prsOpenInBrowser`), so iB is never asked (`Xbe(s ? ve : void 0)`): undefined.
  'cc6e65d4b-CKlso-Pn.js:f': { name: 'usePrLinkInAppClick', features: ['r.setPendingPreviewLinkUrl(t, { prPane: n, clickedIn: a })', 'return s && t && r(t) ? l : void 0;'] },
  // c60636ac6 ct / lt (iB's hxe / bLe's pS): the GitHub ref hover card, only in the band layout and only with the
  // desktop's getGhRefSummary bridge, which the host does not have: no hover card (ct false), lt passes its child.
  'c60636ac6-DF2ym4tP.js:ct': { name: 'hasPrHoverCard', features: ['if (t?.kind === "github") return !!u?.getGhRefSummary || !1;'] },
  'c60636ac6-DF2ym4tP.js:lt': { name: 'PrHoverCard', features: ['function lt({ href: e, children: t, surface: n }) {', 'return u?.getGhRefSummary'] },
};

// Original bindings this generator may slice although another generated area slices them without exporting them.
// Each entry says why a second copy is harmless; anything that holds state is never listed here.
const duplicates = {
  // ca7840910 U / H / te: the ContextMenu-key test and the synthetic contextmenu at the row's start edge (files-changes
  // file-tree-compact.mjs slices them for its tree rows without exporting them).
  'ca7840910-DSVFtTw1.js:U': 'pure function (no state)',
  'ca7840910-DSVFtTw1.js:H': 'pure function (no state)',
  'ca7840910-DSVFtTw1.js:te': 'pure function (no state; dispatches on the element it is given)',
  // shared-frame Ms / js / As: the Mac platform test (useSyncExternalStore with a constant subscription); Js / Hs / Us /
  // Bs / qs / Ps / Fs / Ns: the aria-keyshortcuts formatter and its key tables. view-tabs slices them without a
  // semantic name (D1 forbids importing its minified names).
  'shared-frame-BfjMqbuN.js:Ms': 'pure hook (constant store, no state)',
  'shared-frame-BfjMqbuN.js:js': 'constant (a no-op subscribe)',
  'shared-frame-BfjMqbuN.js:As': 'constant (a RegExp without the g flag)',
  'shared-frame-BfjMqbuN.js:Js': 'pure function (no state)',
  'shared-frame-BfjMqbuN.js:Hs': 'pure function (no state)',
  'shared-frame-BfjMqbuN.js:Us': 'pure function (no state)',
  'shared-frame-BfjMqbuN.js:Bs': 'pure function (no state)',
  'shared-frame-BfjMqbuN.js:qs': 'constant (key name table)',
  'shared-frame-BfjMqbuN.js:Ps': 'pure function (no state)',
  'shared-frame-BfjMqbuN.js:Fs': 'constant (modifier order)',
  'shared-frame-BfjMqbuN.js:Ns': 'constant (modifier names)',
};
// Contexts view-tabs also instantiates that a slice here may own a second instance of (none).
const contextDuplicates = {};

// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original (prettier-formatted) text.
const modules = [
  // vendor-intl sn = J("formatList"): react-intl's FormattedList (the counts' sr-only "N additions, M deletions").
  { target: 'formatted-list.mjs', source: 'vendor-intl-Db7hDWRO.js', exports: { sn: 'FormattedList' },
    features: { sn: ['sn = J("formatList")'] } },
  // shared-25 Di (exported n_): the media query hook (the counts' prefers-reduced-motion test).
  { target: 'media-query.mjs', source: 'shared-25-DP8p7i1Z.js', exports: { Di: 'useMediaQuery' },
    features: { Di: ['let r = (t ?? window).matchMedia(e);', 'return b(n, r, () => !1);'] } },
  // shared-0 SD (exported Gf) and shared-78 Ja (exported Ow): whether the user agent is Linux (the keybinding table's
  // `!isLinux` rows).
  { target: 'linux-agent.mjs', source: 'shared-0-ByI5P0CP.js', exports: { SD: 'isLinuxAgent' }, features: { SD: ['return bD.test(e) && !xD.test(e);'] } },
  { target: 'linux-user-agent.mjs', source: 'shared-78-D6VXYXaQ.js', exports: { Ja: 'isLinuxUserAgent' },
    features: { Ja: ['return typeof window > "u" ? !1 : Ft(window.navigator.userAgent);'] } },
  // shared-frame Ms (exported Nl): whether the platform is a Mac (a constant external store); Js (exported Ml): a
  // shortcut's aria-keyshortcuts form (OLe's diff button). view-tabs slices both without a semantic name.
  { target: 'aria-shortcut.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { Ms: 'useIsMacPlatform', Js: 'ariaKeyShortcuts' },
    features: { Ms: ['() => As.test(navigator.userAgent),'], Js: ['let o = t ? "Meta" : "Control",', 'return [...i, ...a].map(s).join("+");'] } },
  // shared-19 $7 (exported R): the first key of a command in the keybinding table (OLe's toggleDiff chord).
  { target: 'command-shortcut.mjs', source: 'shared-19-CkPOiIKm.js', exports: { $7: 'commandShortcut' },
    features: { $7: ['return e9(e, t, n)[0];'] } },
  // c219730b0: the PR bar's mode labels (_n, "Commit changes" …), busy labels (vn) and the review threads label (Ht).
  { target: 'pr-bar-labels.mjs', source: 'c219730b0-B08P7Rqk.js', exports: { _n: 'PR_MODE_MESSAGES', vn: 'PR_MODE_BUSY_MESSAGES', Ht: 'useOpenReviewThreadsLabel', Zt: 'CI_SKIPPED_DOT' },
    features: { _n: ['commit: { defaultMessage: "Commit changes", id: "PQy14pRnLi" },'], vn: ['creating: { defaultMessage: "Creating PR\\u2026", id: "E7tHZPJmaR" },'],
      Ht: ['"{count, plural, one {# open review thread} other {# open review threads}}",'],
      // R4i-rail RL2: c219730b0 Zt (tB's skipped / unavailable CI glyph, a hollow dot).
      Zt: ['className: "size-[6px] rounded-full border border-alpha-5",'] } },
  // cfb0234e3 h (exported t): the PR link's "Copy link" menu item (only with a PR link).
// R4i-rail RL2: m (exported r, OS) is the link's "Open on {host}" label, p (exported n, Nxe) the PR link's menu (View
  // pull request, Open on {host}, Copy link) that iB's band layout opens on the number.
  { target: 'copy-link-item.mjs', source: 'cfb0234e3-CmyaYk4H.js', exports: { h: 'CopyLinkMenuItem', m: 'openOnHostLabel', p: 'PrLinkMenuItems' },
    features: { h: ['defaultMessage: "Link copied to clipboard.",', 'defaultMessage: "Copy link", id: "lbr3Lq2Lnm"'],
      m: ['return e.formatMessage(f.openOnHost, { host: g(t) });'], p: ['c && n(a.Item, { onClick: () => c(), children: i }),', 'n(h, { prUrl: p }),'] } },
  // ca7840910 U (exported r): the ContextMenu / Shift+F10 key opens the row's context menu at its start edge.
  { target: 'context-menu-key.mjs', source: 'ca7840910-DSVFtTw1.js', exports: { U: 'openContextMenuFromKey' },
    features: { U: ['return H(e) ? (t && f() && (e.preventDefault(), te(t)), !0) : !1;'] } },
  // cd59309dc o (exported t): while a context menu is open, count it on its window (the row menu's mount marker).
  // The store (r) holds per-window state, so its reader a (exported n) is published from this one copy as well.
  { target: 'context-menu-marker.mjs', source: 'cd59309dc-DjmF_LWt.js', exports: { o: 'ContextMenuOpenMarker', a: 'useContextMenuOpenInWindow' },
    features: { o: ['return (e(() => (i(n, 1), () => i(n, -1)), [n]), null);'], a: ['return r((t) => t.byWindow.has(e));'] } },
  // c0cdf4a08 _ (exported t): the row's context menu (right click opens the same items at the pointer).
  { target: 'row-context-menu.mjs', source: 'c0cdf4a08-h228IL-P.js', exports: { _: 'RowContextMenu' },
    features: { _: ['nativeMenuWhen: l,', 'r ? h(e.currentTarget, r, n) : n();', 'openEvent: b.event,'] } },
  { target: 'diff-counts.mjs', source: 'c60636ac6-DF2ym4tP.js', exports: { Xe: 'DiffCounts' },
    features: { Xe: ['addedClassName: a = "text-git-added",', 'removedClassName: o = "text-git-removed",', '"{count, plural, one {# addition} other {# additions}}",',
      '"{count, plural, one {# deletion} other {# deletions}}",', 'type: "unit",'] } },
  { target: 'changes-verb.mjs', source: TRANSCRIPT, exports: { DLe: 'ChangesRowVerb', CLe: 'prModeLabel', rB: 'prModeBusyLabel', Qz: 'PrActionFocusKeeper' },
    features: { DLe: ['wrapperClassName: "min-w-0 shrink-0",', 'size: "xs",', 'children: b("span", { className: "truncate", children: e }),'],
      CLe: ['{ defaultMessage: "Commit to {base}", id: "iAjUOOFB7k" },', 'return e.formatMessage(Xb[t]);'], rB: ['return e.formatMessage(Zb.merging);', 'return e.formatMessage(Zb.creating);'],
      Qz: ['e.current = t && Xz(t) && !Zz(t) ? t.ownerDocument : null;', 'className: "contents",'] } },
  // c96d752d0 VRe: the rail PR bar nav's class (empty:hidden; the card is hidden while the nav is empty, cf74bc599 aD);
  // fze: whether a repo's live row is rendered (a PR, else the branch stats' hasChanges unless the branch is known
  // unpushed without a working tree).
  { target: 'pr-bar-rail.mjs', source: TRANSCRIPT, exports: { VRe: 'RAIL_PR_BAR_NAV_CLASS', fze: 'prBarRowShown' },
    features: { VRe: ['VRe = "flex flex-col gap-1 empty:hidden"'], fze: ['return e ? !0 : n === !1 && !r ? !1 : !!t?.hasChanges;'] } },
  // ---- R4i-rail RL2: what iB / oRe / sRe read from other chunks ----
  // shared-6: the branch row's class names (iB's band layout: wre / Io / Po / zo / Ro / No / _re).
  { target: 'branch-row-classes.mjs', source: 'shared-6-Cby4X-ms.js',
    exports: { v_: 'branchRowClass', y_: 'BRANCH_ROW_LEADING_CLASS', b_: 'BRANCH_ROW_CHECKOUT_CLASS', w_: 'branchChipClass', T_: 'branchChipNameClass',
      S_: 'BRANCH_ROW_GAP_CLASS', C_: 'PR_NUMBER_CLASS' },
    features: { v_: ['return `${h_(e)} @container/branch-row`;'], y_: ['var y_ = "flex-1 flex items-center gap-0 min-w-0";'], b_: ['var b_ = "flex-1 flex items-center gap-0 min-w-0";'],
      w_: ['let r = `${b_} @container/branch-chip text-body`;'], T_: ['"@max-[9em]/branch-chip:hidden"'], S_: ['"w-[32px] min-w-0 shrink [@container_branch-row_(max-width:320px)]:hidden";'],
      C_: ['"min-w-0 truncate [direction:rtl] px-1.25 text-body tabular-nums"'] } },
  // c0b46114c x (iB's __e): the band row's Dismiss button.
  { target: 'dismiss-button.mjs', source: 'c0b46114c-CeR7hhV7.js', exports: { x: 'DismissButton' },
    features: { x: ['inkClassName: i = "text-muted hover:text-primary",', 'a.formatMessage({ defaultMessage: "Dismiss", id: "TDaF6JVgG6" }),'] } },
  // c227f4d5e HL / UL (sRe's Due / Bue): the disclosure row trigger and its caret.
  { target: 'rail-disclosure.mjs', source: 'c227f4d5e-Ba-r--Rl.js', exports: { HL: 'RAIL_DISCLOSURE_TRIGGER_CLASS', UL: 'RAIL_DISCLOSURE_CARET_CLASS' },
    features: { HL: ['group/disclosure flex min-h-6.5 w-full min-w-0 items-center gap-sm px-xs text-start text-body'],
      UL: ['"shrink-0 text-muted-as-secondary group-data-[panel-open]/disclosure:rotate-90"'] } },
  { target: 'changes-row.mjs', source: TRANSCRIPT, exports: { OLe: 'ChangesRow', kLe: 'ChangesRowMenuItems', aB: 'ReviewCommentsCount' },
    features: {
      OLe: ['if (n === null && j === "row") {', '"data-rail-changes-row": "",', 'className: aue,', 'b(vf, { name: "ChangesPlusMinus" }),', 'defaultMessage: "Open changes",',
        'id: "FtjWR6UYvS",', '"Open changes, {added, number} added, {removed, number} removed",', 'id: "+7hgPwXakn",', 'N = h ? Nr("toggleDiff", O) : void 0,',
        '{ defaultMessage: "More options for {title}", id: "YCz8Z2UnCJ" },', '"sr-only flex shrink-0 focus-within:not-sr-only has-[[data-popup-open]]:not-sr-only",',
        'collisionPadding: Kc,', 'return b(Qg, { trigger: r, disabled: !U, children: ee });', 'className: "inline-flex shrink-0 gap-1 text-body",'],
      kLe: ['defaultMessage: "View changes",', 'defaultMessage: "Open review comments",', 'defaultMessage: "Dismiss", id: "UvvKWSp/Um"', 's ? ms(s) : null,'],
      aB: ['return e === void 0 || e <= 0', '"Open review comments, {count, plural, one {# open thread} other {# open threads}}",'],
    } },
  // R4i-rail RL2, c96d752d0: the rail's PR rows. iB (memo) is the PR bar row: in the rail layout it builds the PR link
  // (xLe glyph + tint, Bc state label, "#{number}", anchor props) and the CI glyph (tB / nB) and hands them to OLe, whose
  // link branch is the stacked row (state icon, title link, #number, diff counts, CI, verb, ⋮ menu). oRe lists the rail
  // entries (five before ple's Show more; earlier PRs in sRe's "{count} earlier pull requests" disclosure with
  // "{count} merged"). tRe / aRe / dLe are eze's rail shape (rows vs history, sorted by xB), its Show more / history
  // state and the PR count report into the Changes card (qz); yze is nze's PR mode for a row (view / merged / queued).
  { target: 'pr-rows.mjs', source: TRANSCRIPT,
    exports: { iB: 'PrBarRow', oRe: 'RailPrRows', sRe: 'RailPrHistory', Jz: 'PrBarLayoutContext', xLe: 'PR_STATE_GLYPHS', SLe: 'PR_STATE_ACCENTS',
      tB: 'CiStatusIcon', nB: 'ciStatusLabel', tRe: 'railRowsShape', aRe: 'useRailRowsControls', dLe: 'useReportRailPrCount', SB: 'railRowsOverflow',
      CB: 'railShownRows', yze: 'prBarMode', WB: 'historyRowKey', JB: 'repoRowId', qB: 'repoRowIdKey' },
    features: {
      iB: ['Y = (e ?? oe) === "rail",', 'if (t !== void 0 && ve) {', 'defaultMessage: "View pull request",', '{ defaultMessage: "#{number}", id: "rj4hoKw+Qf" },',
        'numberText: g,', 'anchorProps: l,', 'openOnHostLabel: m,', 'onExternalClick: a,', 'icon: b(tB, { status: F }),', '"aria-label": nB(J, F),', 'return b(OLe, {'],
      oRe: ['role: "list",', 'children: c.map((e) => b(wB, { entry: e }, e.rowKey)),', 's ? b(ple, { expanded: r.showAll, onToggle: t.onToggleShowAll }) : null,',
        'o.history.length > 0 &&'],
      sRe: ['"{count, plural, one {# earlier pull request} other {# earlier pull requests}}",', 'defaultMessage: "{count} merged",', 'id: "WQh7w3BsRk",'],
      Jz: ['var Jz = E("band");'],
      xLe: ['open: { name: "GitPullRequest", tint: $z.opened },', 'queued: { name: "GitMergeQueue", tint: $z.queued },'],
      SLe: ['var SLe = { merged: "purple", queued: "yellow" };'],
      tB: ['className: "size-[6px] rounded-full bg-[var(--cds-text-git-removed)]",', 'return b(Mc, { kind: "running" });'],
      nB: ['defaultMessage: "CI: checks failing",', 'defaultMessage: "CI: status unavailable",'],
      tRe: ['((i.history ? n : t).push(i), i.facts.prState !== void 0 && (r += 1));', 'historyMerged: a.filter((e) => e.facts.prState === "merged").length,'],
      aRe: ['onToggleShowAll: i,'], dLe: ['if (t) return (t(e), () => t(null));'],
      SB: ['return e.rows.length > 5;'], CB: ['return t || e.rows.length <= 5 ? e.rows : e.rows.slice(0, 5);'],
      yze: ['e.state === "merged"', 'e.state === "queued"'], WB: ['return `${e}#${t}`;'], JB: ['repo: (e.repo.split("/").pop() ?? "").toLowerCase(),'],
      qB: ['return JSON.stringify([e.cwd, e.repo, e.branch, e.history]);'],
    } },
];

// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration).
const callSites = [
  // c96d752d0 iB (memo): the PR bar row. In the rail layout (layout prop or the Jz context) it renders OLe with these
  // props; the verb is DLe with CLe's label unless the PR mode is view / none (then the PR-only railVerb). The band
  // layout renders ELe for review comments instead. Host: SessionRailChanges (no PR: link null, the commit verb).
  { source: TRANSCRIPT, binding: 'iB', role: 'PR bar row: the rail branch hands OLe its props; verb = DLe unless view/none (host: SessionRailChanges)',
    features: ['Y = (e ?? oe) === "rail",', 'X = CLe(J, U, v),', 'fe = U === "commit" || U === "none",', 'U === "view" || U === "none" || ce ? null : b(Qz, {',
      'be === null ? V : b(DLe, {', 'busyLabel: rB(J, U),', 'onClick: G ?? Ot,', 'return b(OLe, {', 'link: _e,', 'branchTitle: x,', 'repoName: h ? void 0 : m,',
      'baseBranch: fe || (t === void 0 && v === x) ? void 0 : v,', 'diff: ce ? void 0 : w,', 'verb: e,', 'checks: n,', 'onDiffClick: ce ? void 0 : E,',
      'onDiffOpen: ce ? void 0 : D,', 'diffOpenHasChord: k,', 'extraMenuItems: ie,', 'warning: z,', 'hint: ce ? null : B,',
      '!ce && j !== void 0 && j > 0 && b(ELe, { count: j, onClick: M }),'] },
  // c96d752d0 ELe: the band layout's review comments chip (Chat icon, accent). Not rendered in the rail, where OLe
  // shows aB (changes-row.mjs ReviewCommentsCount). r4-session-rail.md §1.5 names ELe as OLe's caller; it is iB.
  { source: TRANSCRIPT, binding: 'ELe', role: 'Band-only review comments chip (the rail row uses aB); iB, not ELe, renders OLe',
    features: ['let n = ex(e);', '"shrink-0 inline-flex h-control items-center gap-1 px-md text-body-medium"'] },
  // c96d752d0 wB: a rail list item, `li.flex.flex-col` around iB with layout "rail"; diffOpenHasChord only for the
  // primary row while toggleDiff would open its diff (the diff tile is not the visible one).
  { source: TRANSCRIPT, binding: 'wB', role: 'Rail list item: li around iB layout rail; diffOpenHasChord from the tile layout (host: caller)',
    features: ['if (!e.primary || jhe(t, "diff")) return !1;', 'return n.has("diff") || n.has(Kh(e.rowKey)) || !Array.from(n).some(Mhe);',
      'className: "flex flex-col",', 'children: b(iB, { ...e.row, layout: "rail", diffOpenHasChord: t }),'] },
  // c96d752d0 oRe: the rail rows list (`ul[role=list].flex.flex-col.gap-1`, five rows before Show more, PR history).
  { source: TRANSCRIPT, binding: 'oRe', role: 'Rail rows list: ul role=list flex flex-col gap-1 of wB (host: one primary row)',
    features: ['role: "list",', 'className: "flex flex-col gap-1",', 'children: c.map((e) => b(wB, { entry: e }, e.rowKey)),', 'o.history.length > 0 &&'] },
  // c96d752d0 eze: the PR bar root. Rail: `nav[aria-label="Repository and pull request controls"]` with VRe, the
  // per-repo rows report rail entries (nze onRailEntries) and oRe lists them; a single repo hides its name.
  { source: TRANSCRIPT, binding: 'eze', role: 'PR bar root: rail nav (VRe) with oRe; hideRepo for a single repo (host: SessionRailChanges)',
    features: ['layout: n = "band",', 'Ee = n === "rail",', 'if (!e || (!We && !le.length && we.length === 0)) return null;',
      'defaultMessage: "Repository and pull request controls",', 'hideRepo: t || (n === "rail" && de.length <= 1),',
      'onRailEntries: Ee ? ce : void 0,', 'Ee && b(oRe, { shape: je, controls: Me, announcement: Ne }),', '? b("nav", { ...Ke, className: VRe, children: qe })'] },
  // c96d752d0 nze: one repo's row props. The diff counts only when the diff can open (ze) and something changed; the
  // counts button opens (mn), the menu's View changes toggles (pn); a local session without a forge repo is in
  // commit mode, whose verb sends the commit turn; the row shows while fze holds.
  { source: TRANSCRIPT, binding: 'nze', role: 'Repo row props: diff only when openable and non-zero, open vs toggle, commit mode and its turn (host: caller + SessionRailChanges)',
    features: ['ze = o !== void 0 || u !== void 0 || (Ie && Le !== null),', 'ze && hn !== void 0 && gn !== void 0 && (hn > 0 || gn > 0)', '? { added: hn, removed: gn }',
      'ar = ze ? pn : void 0,', 'or = ze ? mn : void 0,', 'Wt = !V && be ? "commit" : yze(V, Ht, Ut),', 'be = t.type === "local" && !n.repo,',
      'gt = !hze(V?.state, oe, se) && fze(V, De, le, pze(n, Se) || Ee !== void 0),', 'text: "Commit the working tree changes with a sensible message.",',
      'defaultMessage: "No changes to commit",', 'Gn = n.currentBranch || n.branch,', 'branchName: Gn,', 'diff: _n,', 'onDiffClick: ar,', 'onDiffOpen: or,',
      'prMode: Wt,', 'prDisabled: on,', 'prDisabledReason: ur,', 'onPrClick: ln,', 'prMenuItems: dn,', 'if (vze(nn, Wt, un))'] },
  // R4i-rail RL2: nze's rail entries (`pr`: the live row with facts {prState, ciStatus} and `dr`, then the branch's other
  // PRs as XB rows, history by jc), its rail-only verb (Ln: Ready for review on a draft, Merge on an open GitHub PR), CI
  // popover slot (jn, FLe) and review comment count (Cn, IRe over the PR store's synced threads); eze collects the
  // entries (`ce`), shapes them (tRe) and reports the PR count (dLe). Host: railPrEntries / SessionRailChanges.
  { source: TRANSCRIPT, binding: 'nze', role: 'Rail entries: live row facts + dr, the branch\'s other PRs as history; railVerb / ciSlot / reviewComments sources (host: railPrEntries)',
    features: ['facts: { prState: ye, ciStatus: An },', 'row: dr,', 'history: jc(n.state),', 'row: XB(n, fr),', 'if (I) return (I(e, pr), () => I(e, null));',
      'V.state === "draft"', '`ready-${V.number}`', '`merge-${V.number}`', 'if (!(!B || !Bt || n.inheritedPr || !V))', 'V && Bt', 'b(FLe, {', 'Cn = IRe({',
      'Wt = !V && be ? "commit" : yze(V, Ht, Ut),', 'zt = V ? tV(V.url) : void 0,', 'Bt = V != null && Wc(V.url),', 'prLinkOpensInApp: !He,', 'Xn = eV(V),',
      'rr = V?.baseRefName ?? n.baseBranch,', 'ciStatus: An,', 'railVerb: Ln,', 'ciSlot: jn,', 'reviewComments: Cn,', 'onPrIconClick: Qn,'] },
  { source: TRANSCRIPT, binding: 'eze', role: 'Rail shape: entries per repo (ce), tRe, aRe controls, dLe count, oRe (host: SessionRailChanges)',
    features: ['for (let { key: t } of de) for (let n of se.get(t) ?? WRe) e.push(n);', 'return tRe(e);', 'Me = aRe(je),', 'dLe(Ee ? je.prCount : null);',
      '{ announcement: Ne, announce: Pe } = Tae();', 'return b(Jz.Provider, {', 'value: n,'] },
  // c96d752d0 $Re (exported wr): a local session's PR bar is eze (FB for the others).
  { source: TRANSCRIPT, binding: '$Re', role: 'PR bar entry (cf74bc599 zc): eze for a local session',
    features: ['return Xne(e.sessionRef?.type, t)', '? b(eze, { ...e })'] },
  // cf74bc599 fC (EpitaxyPrBarSlot) / pC: the lazy PR bar slot; in the rail it reserves the remembered rail height (Qh)
  // around zc (= c96d752d0 $Re) with layout "rail".
  { source: 'cf74bc599-D9NZWRyl.js', binding: 'fC', role: 'EpitaxyPrBarSlot: pC for a local session',
    features: ['return Sn(e.sessionRef.type, t)', '? u(pC, { ...e })'] },
  { source: 'cf74bc599-D9NZWRyl.js', binding: 'pC', role: 'PR bar slot: rail reserve (Qh) around zc layout rail (host: synchronous, no reserve)',
    features: ['[c] = a(t !== "rail"),', 'layout: c ? "band" : "rail",', 'let I = u(zc, {', ': u(Qh, { heightPx: A ? m.heightPx : 0, entries: m.entries, children: I });'] },
  // c73f45bc3 O_ (exported A; cf74bc599 Sh): the Changes card's child, the lazy slot with the rail placeholder (qm).
  { source: 'c73f45bc3-CFrHin0p.js', binding: 'O_', role: 'Changes card slot (cf74bc599 Sh): lazy D_ with the rail placeholder qm (host: synchronous)',
    features: ['let i = oe(E_.handle, !0, { reportWait: !1 }),', 't === "rail"', '? c(qm, {', 'children: c(D_, {'] },
];
// Pinned on the minified bytes (each must occur exactly once unless `count` says otherwise).
const rawCallSites = [
  // cf74bc599 fO / rD: the rail's Changes card gets Sh with layout "rail"; rD wraps it in the PR count report (Wo), the
  // branch chip face (i_) and the row layout (r_ = c0a531389 O: "row" in the flat rail) contexts; the card is hidden
  // until its nav has rows (aD).
  { source: 'cf74bc599-D9NZWRyl.js', role: 'Changes card: Sh layout rail inside the Wo / i_ / r_ providers (r_ "row" when flat); hidden while the nav is empty',
    features: ['pullRequests:o?void 0:u(Sh,{sessionRef:e,layout:"rail",onRequestComposerFocus:i},e.id)',
      'children:u(Wo.Provider,{value:ge,children:u(i_.Provider,{value:z,children:u(r_.Provider,{value:R?"row":"stacked",children:t})})})',
      'aD={pullRequests:"hidden has-[nav:not(:empty)]:flex has-[[data-epitaxy-branch-row-ghost]]:flex"}'] },
  { source: TRANSCRIPT, role: 'Changes row feature strings (research §1.5 counts)', count: 1, features: ['"data-rail-changes-row":""'] },
  { source: TRANSCRIPT, role: 'Changes row aria-label (row and stacked branches)', count: 2, features: ['"Open changes, {added, number} added, {removed, number} removed"'] },
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
  const record = { name, bytes, code, ast, exported, top, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' || entry.kind === 'pattern' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
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
// The raw text of a binding's same-chunk closure (imports excluded).
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

// ---- other generated areas ------------------------------------------------------------------------------------------
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
// Areas checked for a second copy of a binding (they slice from this snapshot too).
const sliceAreas = ['code-current', 'files-changes', 'r3b-transcript', 'r4e-findings', 'view-tabs', 'session-rail-kit'];
let areas;
async function loadAreas() {
  if (areas) return areas;
  const viewTabs = await readJson(path.join(generatedRoot, 'view-tabs/manifest.json'));
  if (viewTabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${viewTabs.referenceVersion}, expected ${referenceVersion}`);
  const publicByLocal = new Map();
  for (const [name, entry] of Object.entries(viewTabs.publicNames ?? {})) publicByLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  const viewTabsBindings = new Map();
  for (const m of viewTabs.modules) viewTabsBindings.set(m.source, new Set(m.bindings));
  // The session rail kit (SR-1): its publicNames are the one copy of the rail's contexts, rows and constants.
  const kit = await readJson(path.join(generatedRoot, 'session-rail-kit/manifest.json'));
  if (kit.referenceVersion !== referenceVersion) throw Error(`session-rail-kit is ${kit.referenceVersion}, expected ${referenceVersion}`);
  const kitByLocal = new Map();
  for (const [name, entry] of Object.entries(kit.publicNames ?? {})) kitByLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  // code-current mixes versions; only its modules sliced from this snapshot count.
  const codeCurrent = await readJson(path.join(generatedRoot, 'code-current/manifest.json'));
  const codeCurrentByLocal = new Map();
  for (const m of codeCurrent.modules) {
    if (m.referenceVersion !== referenceVersion || !m.source.includes(`/${referenceSnapshot}/`)) continue;
    const file = path.basename(m.source);
    const names = (m.bindings ?? []).map(b => (typeof b === 'string' ? b : b.name));
    for (const local of names) {
      const key = `${file}#${local}`;
      if (!codeCurrentByLocal.has(key)) codeCurrentByLocal.set(key, []);
      codeCurrentByLocal.get(key).push(m.target);
    }
  }
  // Every other area's slices of this snapshot: file#local -> [{ area, target }]. A binding one of them exports is
  // imported from there; one sliced there without an export is not sliced here again unless `duplicates` lists it.
  const slicedElsewhere = new Map();
  for (const area of sliceAreas) {
    if (area === 'code-current') continue;
    const manifest = await readJson(path.join(generatedRoot, area, 'manifest.json'));
    if (manifest.referenceVersion && manifest.referenceVersion !== referenceVersion) continue;
    for (const m of manifest.modules ?? []) {
      if (m.referenceVersion && m.referenceVersion !== referenceVersion) continue;
      const file = path.basename(m.source);
      for (const b of m.bindings ?? []) {
        const key = `${file}#${typeof b === 'string' ? b : b.name}`;
        if (!slicedElsewhere.has(key)) slicedElsewhere.set(key, []);
        slicedElsewhere.get(key).push({ area, target: m.target ?? m.source });
      }
    }
  }
  areas = { publicByLocal, viewTabsBindings, kitByLocal, codeCurrentByLocal, slicedElsewhere };
  return areas;
}
const areaExports = new Map();
async function areaExport(area, target) {
  const key = `${area}/${target}`;
  if (!areaExports.has(key)) areaExports.set(key, exportedNames(await fs.readFile(path.join(generatedRoot, area, target), 'utf8')));
  return areaExports.get(key);
}
const codeCurrentExport = target => areaExport('code-current', target);
// Areas whose generated modules export their slices under the generator's own names (view-tabs exports minified
// names, which D1 forbids importing; the kit is read through its publicNames).
const importableAreas = new Set(['files-changes', 'r3b-transcript', 'r4e-findings']);

// vendor-frame `var X = ns.member` with ns a proved React namespace.
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
const posix = p => p.split(path.sep).join('/');
const rel = (fromFile, toFile) => { const r = posix(path.relative(path.dirname(fromFile), toFile)); return r.startsWith('.') ? r : `./${r}`; };

export async function extractSessionRailChanges({ check = false, explore = null } = {}) {
  const { publicByLocal, viewTabsBindings, kitByLocal, codeCurrentByLocal, slicedElsewhere } = await loadAreas();
  const emitted = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-session-rail-changes.mjs',
    adapterModule: 'src/source-session-rail-changes-adapters.jsx', modules: [], publicNames: {}, callSites: [],
  };
  const files = {};
  const exploring = explore;
  const owner = (file, local) => emitted.find(m => m.spec.source === file && Object.hasOwn(m.spec.exports, local));
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
    const mine = owner(file, local);
    if (mine) return { from: `./${mine.spec.target}`, name: mine.spec.exports[local], via, kind: 'generated', original: `${file}:${local}` };
    const kit = kitByLocal.get(`${file}#${local}`);
    if (kit) return { from: rel(self, path.join(generatedRoot, 'session-rail-kit', kit.target)), name: kit.name, via, kind: 'session-rail-kit', original: `${file}:${local}` };
    const pub = publicByLocal.get(`${file}#${local}`);
    if (pub) return { from: rel(self, path.join(generatedRoot, 'view-tabs', pub.file)), name: pub.name, via, kind: 'view-tabs', original: `${file}:${local}` };
    const react = await reactMember(file, local);
    if (react) return { ...react, via, kind: 'react' };
    const current = codeCurrentByLocal.get(`${file}#${local}`);
    if (current) {
      for (const target of current) {
        const names = (await codeCurrentExport(target)).get(local);
        if (names?.length) return { from: rel(self, path.join(generatedRoot, 'code-current', target)), name: names[0], via, kind: 'code-current', original: `${file}:${local}` };
      }
    }
    for (const { area, target } of slicedElsewhere.get(`${file}#${local}`) ?? []) {
      if (!importableAreas.has(area)) continue;
      const names = (await areaExport(area, target)).get(local);
      if (names?.length) return { from: rel(self, path.join(generatedRoot, area, target)), name: names[0], via, kind: area, original: `${file}:${local}` };
    }
    const elsewhere = [...(current ?? []).map(t => `code-current/${t}`), ...(slicedElsewhere.get(`${file}#${local}`) ?? []).map(e => `${e.area}/${e.target}`)];
    if (elsewhere.length && !duplicates[`${file}:${local}`]) {
      const message = `${spec.target}: ${via} (${local}) is sliced by ${elsewhere.join(', ')} but not exported; it must not be sliced twice`;
      if (!exploring) throw Error(message);
      exploring.push({ target: spec.target, via: 'DUPLICATE', local: `${file}:${local}`, size: elsewhere.join(', ') });
    }
    return null;
  };
  for (const spec of modules) {
    const src = await readSource(spec.source);
    const selected = new Map(), imports = new Map(), seen = new Set(), contexts = [];
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
      if (!isRoot) {
        const resolved = await resolveBinding(spec, spec.source, name, `${spec.source}:${name}`);
        if (resolved) { imports.set(name, resolved); return; }
      } else if (adapters[`${spec.source}:${name}`] || publicByLocal.has(`${spec.source}#${name}`) || kitByLocal.has(`${spec.source}#${name}`)) {
        throw Error(`${spec.target}: root ${name} is provided elsewhere`);
      } else {
        const elsewhere = [...(codeCurrentByLocal.get(`${spec.source}#${name}`) ?? []).map(t => `code-current/${t}`),
          ...(slicedElsewhere.get(`${spec.source}#${name}`) ?? []).map(e => `${e.area}/${e.target}`)];
        if (elsewhere.length && !duplicates[`${spec.source}:${name}`]) {
          const message = `${spec.target}: root ${name} is sliced by ${elsewhere.join(', ')} too; list it in duplicates or import it`;
          if (!explore) throw Error(message);
          explore.push({ target: spec.target, via: 'DUPLICATE ROOT', local: name, size: elsewhere.join(', ') });
        }
      }
      if (entry.kind === 'pattern') throw Error(`${spec.target}: ${spec.source}:${name} is a destructured declaration; it needs an adapter`);
      if (entry.kind !== 'function' && entry.kind !== 'var') throw Error(`${spec.target}: unsupported declaration ${name}`);
      const text = declarationText(src, entry);
      if (/\bimport\s*\(/.test(text)) throw Error(`${spec.target}: dynamic import inside ${name}`);
      selected.set(name, entry);
      for (const dep of declarationDeps(src, name)) await add(dep);
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
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-session-rail-changes.mjs.\n// Edit the extractor or src/source-session-rail-changes-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    if (!explore) {
      // The module must be closed: every identifier it reads is imported or declared in it.
      const closed = babel.babelParse(text, spec.target, true);
      let globals;
      babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
      const allowed = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'String', 'Set', 'Map', 'JSON', 'Symbol', 'Promise', 'RegExp',
        'globalThis', 'setTimeout', 'clearTimeout', 'Date', 'Intl', 'undefined', 'Infinity', 'WeakMap', 'Boolean', 'window', 'document',
        'console', 'navigator', 'NaN', 'Element', 'HTMLElement', 'Node', 'parseFloat', 'performance', 'requestAnimationFrame',
        'cancelAnimationFrame', 'AbortController', 'ResizeObserver', 'TypeError', 'getComputedStyle',
        // R4i-rail RL2: cfb0234e3 g (the link host for "Open on {host}") parses the URL.
        'URL']);
      const unbound = globals.filter(name => !allowed.has(name));
      if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    }
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
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
  // Every adapter an emitted module imports is exported by the adapter module.
  const adapterText = await fs.readFile(path.join(root, manifest.adapterModule), 'utf8');
  const adapterExports = new Set([...adapterText.matchAll(/^export (?:async )?(?:function|const|let|class) ([\w$]+)/gm)].map(m => m[1]));
  for (const block of adapterText.matchAll(/^export \{([^}]*)\}/gm))
    for (const part of block[1].split(',').map(p => p.trim()).filter(Boolean)) adapterExports.add(part.split(/\s+as\s+/).pop());
  for (const m of manifest.modules)
    for (const i of m.imports) if (i.kind === 'adapter' && !adapterExports.has(i.name)) throw Error(`${m.target}: ${manifest.adapterModule} does not export ${i.name}`);
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Session rail changes output set changed: ${present.join(',')}. Run scripts/extract-session-rail-changes.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Session rail changes source mismatch: ${name}. Run scripts/extract-session-rail-changes.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} session rail changes modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--explore')) {
    const found = [];
    const manifest = await extractSessionRailChanges({ explore: found });
    for (const m of manifest.modules) console.log(`${m.target}\t${m.bindings.length} bindings (${m.bindings.map(b => b.name).join(' ')})\t${m.imports.filter(i => i.kind !== 'unresolved').map(i => `${i.local}=${i.kind}:${i.name}`).join(' ')}`);
    for (const f of found) console.log(`UNRESOLVED ${f.target}\t${f.via}\t${f.local}\t${f.size}`);
  } else await extractSessionRailChanges({ check: process.argv.includes('--check') });
}
