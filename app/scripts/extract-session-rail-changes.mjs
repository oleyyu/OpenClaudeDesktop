// R4f-rail SR-4: extract the session rail's Changes row (the flat rail's `data-rail-changes-row`) and R4i-rail RL2's PR rows,
// without executing any desktop runtime (decision D0: own generator, own output folder src/generated/session-rail-changes,
// own scripts/verify-gen-session-rail-changes.mjs).
// w3-rail-changes (2026-10-26): the originals are Claude Desktop 3.6556.2 (analysis/claude-3.6556.2-migrate-20261025,
// research/panes.md §1.2, §2.2 C2-1 … C2-6, §3.2; plan R1–R15, E3/E5/E7/E12/E13). Target files and export names are those
// of 2.42304.0 (R4/E7). New targets: status-dot.mjs (shared-18 JO, the CI dots' StatusDot), pr-mode-messages.mjs (the
// mode labels moved from c219730b0 to cd4f82e77; pr-bar-labels.mjs re-exports them) and tooltip-deferral.mjs (shared-frame
// nu). aria-shortcut.mjs and context-menu-key.mjs re-export the one 3.6556.2 copy (view-tabs, files-changes).
//
//   changes-row.mjs        c96d752d0 Ike: the PR bar's rail-layout row. With no PR link and the Changes row layout context
//                          (kit ChangesRowLayoutContext) at "row" it renders the flat rail's single row:
//                          `div[data-rail-changes-row]` with the ChangesPlusMinus icon, the repo name, the diff counts
//                          button ("Open changes", the toggleDiff shortcut), review comments (DL), the warning, the checks
//                          and verb slots and the sr-only ⋮ menu (OL; "More options for {repo} on {branch}" when a repo
//                          name shows, else "More options for {title}", C2-2), all inside the row's context menu;
//                          otherwise the stacked layout. Bke is the menu body (grouped: pull request, changes, create,
//                          dismiss); DL the review comments count.
//   changes-verb.mjs       c96d752d0 Fke with yL: the rail row's verb button, jke / TL its label and busy label.
//   diff-counts.mjs        c60636ac6 Xe: the +N −M counts (Qe, with their sr-only "N additions, M deletions").
//   pr-rows.mjs            c96d752d0 EL (memo, the PR bar row: its rail branch builds the PR link — live / refused / asks
//                          by the link policy, C2-3 — and the CI glyph, CL = c219730b0's StatusDot presets, C2-1, and
//                          hands Ike its props), bAe (the rail rows list over renderRow, Show more) and xAe (earlier pull
//                          requests, the caret by Icon `rotate`), with Sje's rail shape helpers (mAe / vAe / gke) and
//                          Zje's mode (hMe).
//   …                      and the small originals those read.
//
// Every emitted binding is an original top-level declaration sliced from the 3.6556.2 chunk. A module's bindings are the
// reachable closure of its roots: a declaration's dependencies are its free variables (each declaration is parsed on its
// own; Babel's scope analysis names what it reads from outside). An import or same-chunk binding resolves, in this order,
// to: a host adapter in src/source-session-rail-changes-adapters.jsx (feature-checked against the original it replaces),
// an earlier module of this generator, a public name of the session rail kit (SR-1: its contexts, row primitives and
// constants exist once, in src/generated/session-rail-kit), a semantic public name of the shared view-tabs graph
// (D1/D24; the React Compiler helpers by their E3 names), React (a vendor-frame export alias of official.reactAliases,
// react/compiler-runtime included), a code-current export of the same 3.6556.2 binding, or the export of a sibling area
// sliced from 3.6556.2. Nothing else is accepted; a binding another generated area slices without exporting is refused
// unless `duplicates` says why a second copy is harmless, and a context is never instantiated twice. A root view-tabs
// publishes is re-exported under this generator's name (R4), never sliced twice.
//
// The remaining callers are not sliced: c96d752d0 YL (the rail list item, diffOpenHasChord from the tile layout; a host
// adapter), TR / Zje (the per-repo props assembly against claude.ai's PR stores), Sje (the PR bar root), cf74bc599 Vl
// (EpitaxyPrBarSlot) and c73f45bc3 Py (the card's lazy slot) read GitHub, the PR store and the tile store. `callSites`
// pin their original text; the host adapter follows it over the local git status (main.jsx gitStatus).
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import * as official from './official-3.6556.2.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
// w3-rail-changes: 3.6556.2 (R1/E6). The constants come from official-3.6556.2.mjs.
const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/session-rail-changes');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-session-rail-changes-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const VENDOR_FRAME = official.vendorFrame;
const TRANSCRIPT = 'c96d752d0-CWv_7-n9.js';
const RAIL = 'cf74bc599-CRYqipWN.js';
// React (R3): a vendor-frame import resolves through its export alias in official.reactAliases (measured on
// vendor-frame-CnSY1sxv.js; aliases were reused across versions, so never by the old name), each alias proved once by
// official.assertVendorAlias (`Oo` is react/compiler-runtime c).

// Host dependencies, keyed by the original binding (file:local) an import or same-chunk reference resolves to.
// `features` must appear in that binding's prettier form (`closure: true`: in its same-chunk closure).
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (the kit's adapters, re-exported).
  'vendor-intl-DYfox5Co.js:q': { name: 'useIntl', features: ['return (Mt(e), e);'] },
  'vendor-intl-DYfox5Co.js:Gt': { name: 'FormattedMessage', features: ['var Gt = c(Wt, Ut);'] },
  // shared-52 cB (exported ha): the ErrorsProvider; the host toasts (the kit's adapter, re-exported).
  'shared-52-uHFNjl7C.js:cB': { name: 'useErrors', features: ['Error("Must be called within ErrorsProvider")'] },
  // shared-25 cc (exported vh): whether this is the Claude desktop app (the user agent test behind the keybinding table's
  // `when: "isClaudeApp"` rows). This host is the desktop app: true.
  'shared-25-DOWZRSlq.js:cc': { name: 'isClaudeDesktopApp', features: ['(o = An(window.navigator.userAgent, { version: t, platform: n })),'] },
  // shared-frame yT (exported Xo): a menu items array (label / onSelect / checked / separatorBefore / items …) as CDS
  // dropdown items. view-tabs slices it without a semantic name (D1/D24); its 93 KB closure (the Base UI menu parts and
  // their contexts) cannot be sliced twice. Only Ike's extraMenuItems (the PR bar's create-mode radio items) go through it.
  'shared-frame-6jtSkIit.js:yT': { name: 'renderMenuItems', features: ['e === "separator"', 'checkedRole: e.checkedRole,', 'children: yT(e.items)'] },
  // shared-frame fu (exported Au), the tooltip Ike / EL wrap their buttons and glyphs in, is no adapter (w10-trans-rail-
  // deferred-tooltip, L64): view-tabs publishes it as CdsDeferredTooltip, so it resolves to that one copy by its semantic
  // name. Before the CDS tooltip code loads (first pointermove / keydown / touchstart) or is adopted, it renders the bare
  // trigger with `data-cds-tooltip-pending` and the hover / focus interceptors; then the tooltip implementation.
  // ---- the rail PR rows (pr-rows.mjs: c96d752d0 EL / bAe / xAe and the rail shape helpers) ----
  // c96d752d0 YL (memo): the rail list item reads the tile store (pm / bm over c03935b01's 72 KB tile layout closure) for
  // diffOpenHasChord and hands it to its render prop; the host list item takes the chord from the Changes card stand-in.
  'c96d752d0-CWv_7-n9.js:YL': { name: 'RailPrListItem', features: ['if (!n || Cde(e, "diff")) return !1;', 'className: "flex flex-col",', 'hidden: r,', 'i(o)'] },
  // c96d752d0 cL (gke reports the rail PR count into it): the one instance is session-rail pr-count-context.mjs, which
  // rail-view's Changes card provides for its "{count} pull requests" summary; re-exported, never instantiated twice.
  'c96d752d0-CWv_7-n9.js:cL': { name: 'RailPrCountContext', features: ['var cL = N(null);'] },
  // shared-20 bE (bAe's tie): the sr-only status announcement; its one copy is session-rail-sections announcement.mjs.
  'shared-20-mUr7IqZY.js:bE': { name: 'Announcement', features: ['className: "sr-only",', 'role: "status",', 'children: [t.text, n],'] },
  // c227f4d5e UT (EL's default prPanelPreloadHandle, the lazy EpitaxyPrPanel's handle): the host has no in-app PR panel,
  // so EL never passes it to qa (`qa(s ? oe : null)`, s = onOpenPrPanel is never set): null.
  'c227f4d5e-B-FYKrwT.js:UT': { name: 'prPanelPreloadHandle', features: ['var UT = HT.handle;'] },
  // cc6e65d4b f (EL's G_e): a PR link click opens the link in the app's preview pane when prLinkOpensInApp. The host
  // opens PRs in the browser, so EL is never asked (`G_e(c ? xe : void 0)`): undefined.
  'cc6e65d4b-D0J5j7gV.js:f': { name: 'usePrLinkInAppClick', features: ['n.setPendingPreviewLinkUrl(e, { prPane: i, clickedIn: a })', 's && e && n(e) ? l : void 0'] },
  // c2fd10b8d Al (EL's rw): the PR link's policy, live / refused / asks, from the link confirm context (cb8c5a88f An) and
  // the policy override (shared-1 EP). Neither has a provider in this host, so c9c0413df r answers "live" for every URL
  // and Dl / kl keep it: "live". Ml (EL's Gve) is the "asks" link (onConfirmLinkClick), never rendered here.
  'c2fd10b8d-DB1Sgoyz.js:Al': { name: 'usePrLinkPolicy', features: ['let t = Dl(d(li), e, d(pe));', 'return d(Ol) ? kl(t) : t;'] },
  'c2fd10b8d-DB1Sgoyz.js:Ml': { name: 'ConfirmedPrLink', features: ['p?.onConfirmLinkClick?.(e, t));', 'linkTarget: "_blank",'] },
  // c60636ac6 mt / ht (EL's hve / Oke's hover card): the GitHub ref hover card, only with the desktop's getGhRefSummary
  // bridge, which the host does not have: no hover card for a PR URL (mt false), ht passes its child.
  'c60636ac6-xYOM0GQX.js:mt': { name: 'hasPrHoverCard', features: ['if (t?.kind === "github") return !!p?.getGhRefSummary || !1;'] },
  'c60636ac6-xYOM0GQX.js:ht': { name: 'PrHoverCard', features: ['{ href: t, children: r, surface: i } = e,', 'return p?.getGhRefSummary'] },
};

// Original bindings this generator may slice although another generated area slices them without exporting them.
// Each entry says why a second copy is harmless; anything that holds state is never listed here.
const duplicates = {
  // c96d752d0 pL: the branch name's head / tail split (the kit's branch-chip.mjs slices it without exporting it).
  'c96d752d0-CWv_7-n9.js:pL': 'pure function (no state)',
  // shared-18 JO (exported Fs): the StatusDot wrapper (CdsPulse without animation, the running dot's animation phase
  // synced on start); code-current sidebar-status-glyph.mjs slices it without exporting it.
  'shared-18-D3y8YMFN.js:JO': 'pure component (no state)',
  'shared-18-D3y8YMFN.js:Kv': 'pure function (an animationstart handler, no state)',
  // w6-transcript-rows: r3b-transcript's Turn edits card (3.6556.2) draws its static +N −M counts through c60636ac6 Ze → Qe
  // (its own diff-counts.mjs, Qe not exported); this area's animated Xe draws the same Qe.
  'c60636ac6-xYOM0GQX.js:Qe': 'pure component (no state); r3b-transcript diff-counts.mjs holds the other copy',
  'c60636ac6-xYOM0GQX.js:Ke': 'a constant (the minus sign); r3b-transcript diff-counts.mjs holds the other copy',
};
// Contexts view-tabs also instantiates that a slice here may own a second instance of (none).
const contextDuplicates = {};
// 3.6556.2 sibling areas whose exports this generator imports (one copy) and whose slices it does not repeat.
const SIBLING_AREAS = [];

// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original (prettier-formatted) text (R2: literals, keys, classes, ids).
// 3.6556.2 bodies are React Compiler output: their cache helpers (J9 J0…J5 K0…K5 I1…I5 Z1…Z5 J8) resolve to the view-tabs
// semantic names (E3), never sliced again. Export names are those of 2.42304.0 (R4/E7).
const modules = [
  // vendor-intl sn = J("formatList"): react-intl's FormattedList (the counts' sr-only "N additions, M deletions").
  { target: 'formatted-list.mjs', source: 'vendor-intl-DYfox5Co.js', exports: { sn: 'FormattedList' },
    features: { sn: ['sn = J("formatList")'] } },
  // shared-25 mi (exported I_): the media query hook (the counts' prefers-reduced-motion test).
  { target: 'media-query.mjs', source: 'shared-25-DOWZRSlq.js', exports: { mi: 'useMediaQuery' },
    features: { mi: ['let r = (t ?? window).matchMedia(e);', '() => (t ?? window).matchMedia(e).matches'] } },
  // shared-0 lk (exported jp) and shared-78 jo (exported pE): whether the user agent is Linux (the keybinding table's
  // `!isLinux` rows).
  { target: 'linux-agent.mjs', source: 'shared-0-DDOOdL6P.js', exports: { lk: 'isLinuxAgent' }, features: { lk: ['return sk.test(e) && !ck.test(e);'] } },
  { target: 'linux-user-agent.mjs', source: 'shared-78-D5Fw2h0a.js', exports: { jo: 'isLinuxUserAgent' },
    features: { jo: ['return typeof window > "u" ? !1 : Wn(window.navigator.userAgent);'] } },
  // shared-frame lc / Dc: whether the platform is a Mac and a shortcut's aria-keyshortcuts form (Ike's diff button).
  // view-tabs publishes both in 3.6556.2 (useIsMacPlatform / ariaKeyShortcuts): re-exported, one copy.
  { target: 'aria-shortcut.mjs', source: 'shared-frame-6jtSkIit.js', exports: { lc: 'useIsMacPlatform', Dc: 'ariaKeyShortcuts' }, closureFeatures: { lc: ['test(navigator.userAgent)'] },
    features: { lc: ['function lc()'], Dc: ['let o = t ? "Meta" : "Control",', 'return [...i, ...a].map(s).join("+");'] } },
  // shared-46 iR (exported g; shared-19 in 2.42304.0): the first key of a command in the keybinding table (Ike's
  // toggleDiff chord). The table (YL) adds nextPrComment / prevPrComment (alt+F9 / shift+alt+F9, panes:C3-8).
  { target: 'command-shortcut.mjs', source: 'shared-46-BIbZBGFq.js', exports: { iR: 'commandShortcut' },
    features: { iR: ['return aR(e, t, n)[0];'] },
    closureFeatures: { iR: ['command:"toggleDiff",key:"cmd+shift+d",code:"KeyD",when:"isClaudeApp"', 'command:"nextPrComment",key:"alt+f9",code:"F9",when:"!isLinux"'] } },
  // shared-18 JO (exported Fs): the StatusDot (CdsPulse, animate off) c219730b0's CI dot presets are built on.
  { target: 'status-dot.mjs', source: 'shared-18-D3y8YMFN.js', exports: { JO: 'StatusDot' },
    features: { JO: ['className: "contents [--cds-page-bg:transparent]",', 'onAnimationStart: Kv,', 'm(B, { animate: !1, ...e })'] } },
  // cd4f82e77 (3.6556.2): the PR bar's mode labels (j, "Commit changes" …) and busy labels (Ue), moved out of c219730b0.
  { target: 'pr-mode-messages.mjs', source: 'cd4f82e77-CAMIsQ30.js', exports: { j: 'PR_MODE_MESSAGES', Ue: 'PR_MODE_BUSY_MESSAGES' },
    features: { j: ['commit: { defaultMessage: "Commit changes", id: "PQy14pRnLi" },', 'view: { defaultMessage: "View PR", id: "OtsPuOcaGS" },'],
      Ue: ['creating: { defaultMessage: "Creating PR\\u2026", id: "E7tHZPJmaR" },', 'merging: { defaultMessage: "Merging\\u2026", id: "n0g32ofhZQ" },'] } },
  // c219730b0: the review threads label (Rn) and the CI dots EL's CL picks (C2-1, the StatusDot presets that replace
  // 2.42304.0's 6px spans): or failed, ar passed, sr running (df-tab-dot-running), cr skipped / unavailable (hollow).
  // PR_MODE_MESSAGES / PR_MODE_BUSY_MESSAGES moved to cd4f82e77 (re-exported, R4).
  { target: 'pr-bar-labels.mjs', source: 'c219730b0-DGG9iA8k.js', reexports: { 'pr-mode-messages.mjs': ['PR_MODE_MESSAGES', 'PR_MODE_BUSY_MESSAGES'] },
    exports: { Rn: 'useOpenReviewThreadsLabel', or: 'CI_FAILED_DOT', ar: 'CI_PASSED_DOT', sr: 'CI_RUNNING_DOT', cr: 'CI_SKIPPED_DOT' },
    features: { Rn: ['"{count, plural, one {# open review thread} other {# open review threads}}",'],
      or: ['color: "var(--cds-text-git-removed)"'], ar: ['color: "var(--cds-text-git-opened)"'],
      sr: ['color: "var(--cds-text-muted)",', 'className: "df-tab-dot-running",'],
      cr: ['color: "var(--cds-alpha-5)",', 'hollow: !0,', 'className: "forced-colors:border",'] } },
  // cfb0234e3 h (exported t): the PR link's "Copy link" menu item; m (exported r) the link's "Open on {host}" label;
  // p (exported n) the PR link's menu (View pull request, Open on {host}, Copy link) that EL's band layout opens.
  { target: 'copy-link-item.mjs', source: 'cfb0234e3-CAtk05RE.js', exports: { h: 'CopyLinkMenuItem', m: 'openOnHostLabel', p: 'PrLinkMenuItems' },
    features: { h: ['defaultMessage: "Link copied to clipboard.",', 'defaultMessage: "Copy link", id: "lbr3Lq2Lnm"'],
      m: ['return e.formatMessage(f.openOnHost, { host: g(t) });'], p: ['l && e(o.Item, { onClick: () => l(), children: c })', 'e(h, { prUrl: m }),'] } },
  // shared-18 ok (exported js; ca7840910 U in 2.42304.0): the ContextMenu / Shift+F10 key opens the row's context menu at
  // its start edge. files-changes tree-context-menu-keys.mjs exports this 3.6556.2 copy: re-exported, one copy.
  { target: 'context-menu-key.mjs', source: 'shared-18-D3y8YMFN.js', exports: { ok: 'openContextMenuFromKey' },
    features: { ok: ['? (t && ws() && (e.preventDefault(), ik(t)), !0)'] } },
  // cd59309dc o (exported t): while a context menu is open, count it on its window (the row menu's mount marker).
  // The store (r) holds per-window state, so its reader a (exported n) is published from this one copy as well.
  { target: 'context-menu-marker.mjs', source: 'cd59309dc-BZMawR8Y.js', exports: { o: 'ContextMenuOpenMarker', a: 'useContextMenuOpenInWindow' },
    features: { o: ['((r = () => (i(n, 1), () => i(n, -1))), (a = [n]), K2($, 0, n, r, a))'], a: ['(t) => t.byWindow.has(e)'] } },
  // c0cdf4a08 g (exported t): the row's context menu (right click opens the same items at the pointer; popupProps new).
  { target: 'row-context-menu.mjs', source: 'c0cdf4a08-C69Ng1c8.js', exports: { g: 'RowContextMenu' },
    features: { g: ['nativeMenuWhen: u,', 'r ? m(e.currentTarget, r, n) : n();', 'openEvent: y.event,', 'popupProps: _,'] } },
  // c60636ac6 Xe (exported r): the +N −M counts (Qe, the shown numbers through Je).
  { target: 'diff-counts.mjs', source: 'c60636ac6-xYOM0GQX.js', exports: { Xe: 'DiffCounts' },
    features: { Xe: ['n(Qe, { ...e, shownAdded: t, shownRemoved: r })'] },
    closureFeatures: { Xe: ['addedClassName:l', 'l===void 0?"text-git-added":l', 'u===void 0?"text-git-removed":u', '"{count, plural, one {# addition} other {# additions}}"',
      '"{count, plural, one {# deletion} other {# deletions}}"', 'type:"unit"'] } },
  // c96d752d0 Fke (with yL, the focus keeper): the rail row's verb button; jke / TL its label and busy label.
  { target: 'changes-verb.mjs', source: TRANSCRIPT, exports: { Fke: 'ChangesRowVerb', jke: 'prModeLabel', TL: 'prModeBusyLabel', yL: 'PrActionFocusKeeper' },
    features: { Fke: ['wrapperClassName: "min-w-0 shrink-0",', 'size: "xs",', 'f("span", { className: "truncate", children: t })'],
      jke: ['{ defaultMessage: "Commit to {base}", id: "iAjUOOFB7k" },', 'return e.formatMessage(gp[t]);'], TL: ['return e.formatMessage(_p.merging);', 'return e.formatMessage(_p.creating);'],
      yL: ['t.current = e && _L(e) && !vL(e) ? e.ownerDocument : null;', 'className: "contents",'] } },
  // c96d752d0 lje: the rail PR bar nav's class (empty:hidden; the card is hidden while the nav is empty); cMe: whether a
  // repo's live row is rendered (a PR, else the branch stats' hasChanges unless the branch is known unpushed without a
  // working tree).
  { target: 'pr-bar-rail.mjs', source: TRANSCRIPT, exports: { lje: 'RAIL_PR_BAR_NAV_CLASS', cMe: 'prBarRowShown' },
    features: { lje: ['lje = "flex flex-col gap-1 empty:hidden"'], cMe: ['return e ? !0 : n === !1 && !r ? !1 : !!t?.hasChanges;'] } },
  // shared-6: the branch row's class names (EL's band layout).
  { target: 'branch-row-classes.mjs', source: 'shared-6-sd9jbJqs.js',
    exports: { D_: 'branchRowClass', O_: 'BRANCH_ROW_LEADING_CLASS', k_: 'BRANCH_ROW_CHECKOUT_CLASS', N_: 'branchChipClass', P_: 'branchChipNameClass',
      j_: 'BRANCH_ROW_GAP_CLASS', M_: 'PR_NUMBER_CLASS' },
    features: { D_: ['return `${C_(e)} @container/branch-row`;'], O_: ['var O_ = "flex-1 flex items-center gap-0 min-w-0";'], k_: ['var k_ = "flex-1 flex items-center gap-0 min-w-0";'],
      N_: ['let r = `${k_} @container/branch-chip text-body`;'], P_: ['"@max-[9em]/branch-chip:hidden"'], j_: ['"w-[32px] min-w-0 shrink [@container_branch-row_(max-width:320px)]:hidden";'],
      M_: ['"min-w-0 truncate [direction:rtl] px-1.25 text-body tabular-nums"'] } },
  // c0b46114c b (exported n; EL's vxe): the band row's Dismiss button (C2-6: ink text-muted-as-secondary).
  { target: 'dismiss-button.mjs', source: 'c0b46114c-Tzv34BiL.js', exports: { b: 'DismissButton' },
    features: { b: ['s = o === void 0 ? "text-muted-as-secondary hover:text-primary" : o,', 'c.formatMessage({ defaultMessage: "Dismiss", id: "TDaF6JVgG6" })'] } },
  // c227f4d5e SB / CB (xAe's Ufe / K_): the disclosure row trigger (2.42304.0 HL, its `group/disclosure` gone) and its
  // caret (no rotate-90 class; xAe rotates the icon by `rotate`).
  { target: 'rail-disclosure.mjs', source: 'c227f4d5e-B-FYKrwT.js', exports: { SB: 'RAIL_DISCLOSURE_TRIGGER_CLASS', CB: 'RAIL_DISCLOSURE_CARET_CLASS' },
    features: { SB: ['`flex min-h-6.5 w-full min-w-0 items-center gap-sm px-xs text-start text-body ${hB} hover:bg-alpha-2`'],
      CB: ['var CB = "shrink-0 text-muted-as-secondary";'] } },
  // shared-frame nu (exported ku; EL's Ve): the tooltip deferral scope (CdsTooltipDeferralContext) around the band row:
  // its tooltips adopt the CDS implementation on the first pointer enter / focus. view-tabs does not slice it.
  { target: 'tooltip-deferral.mjs', source: 'shared-frame-6jtSkIit.js', exports: { nu: 'TooltipDeferralScope' },
    features: { nu: ['ambientImpl: () => r.current,', 'isDeferred: () => e,', 'onPointerEnter: u(s.engage, c.props.onPointerEnter),'] } },
  { target: 'changes-row.mjs', source: TRANSCRIPT, exports: { Ike: 'ChangesRow', Bke: 'ChangesRowMenuItems', DL: 'ReviewCommentsCount' },
    features: {
      Ike: ['if (r === null && N === "row") {', '"data-rail-changes-row": "",', 'className: nv,', 'f(hg, { name: "ChangesPlusMinus" })', 'defaultMessage: "Open changes",',
        'id: "FtjWR6UYvS",', '"Open changes, {added, number} added, {removed, number} removed",', 'id: "+7hgPwXakn",', '(L = g ? wi("toggleDiff", A) : void 0),',
        'defaultMessage: "More options for {repo} on {branch}",', 'id: "8RgmijlEMA",', 'defaultMessage: "More options for {title}",', 'id: "YCz8Z2UnCJ",',
        '"sr-only flex shrink-0 focus-within:not-sr-only has-[[data-popup-open]]:not-sr-only",', 'className: "min-w-0 text-muted-as-secondary",',
        'onKeyDownCapture: Nc,', 'f(Yh, { trigger: E, disabled: k, popupProps: A, children: ae })', 'className: "inline-flex shrink-0 gap-1 text-body",'],
      Bke: ['defaultMessage: "View changes",', 'defaultMessage: "Open review comments",', 'defaultMessage: "Dismiss", id: "UvvKWSp/Um"', 'f(Sd, { children: we(c) })',
        'groups: { pullRequest: d, changes: h, create: g, ...l, dismiss: y },'],
      DL: ['if (t === void 0 || t <= 0) return null;', '"Open review comments, {count, plural, one {# open thread} other {# open threads}}",'],
    } },
  // c96d752d0: the rail's PR rows. EL (memo) is the PR bar row: in the rail layout it builds the PR link (kke glyph +
  // tint, Wc state label, "#{number}", anchor props, the link policy) and the CI glyph (CL / wL) and hands them to Ike,
  // whose link branch is the stacked row. bAe lists the rail entries through renderRow (five before Show more; earlier
  // PRs in xAe's "{count} earlier pull requests" disclosure with "{count} merged"). mAe / vAe / gke are Sje's rail shape
  // (rows vs history, sorted by KL), its Show more / history state and the PR count report into the Changes card (cL);
  // hMe is Zje's PR mode for a row (view / merged / queued).
  { target: 'pr-rows.mjs', source: TRANSCRIPT,
    exports: { EL: 'PrBarRow', bAe: 'RailPrRows', xAe: 'RailPrHistory', lL: 'PrBarLayoutContext', kke: 'PR_STATE_GLYPHS', Ake: 'PR_STATE_ACCENTS',
      CL: 'CiStatusIcon', wL: 'ciStatusLabel', mAe: 'railRowsShape', vAe: 'useRailRowsControls', gke: 'useReportRailPrCount', qL: 'railRowsOverflow',
      JL: 'railShownRows', hMe: 'prBarMode', gR: 'historyRowKey', bR: 'repoRowId', yR: 'repoRowIdKey' },
    features: {
      EL: ['ce = (t ?? se) === "rail",', 'if (n !== void 0 && xe) {', 'defaultMessage: "View pull request",', '{ defaultMessage: "#{number}", id: "rj4hoKw+Qf" }',
        'Te = s === void 0 && Ce === void 0 ? we : "live";', 'Te === "asks"', 'Te === "refused"', ' hover:decoration-current`',
        'numberText: S,', 'anchorProps: _,', 'openOnHostLabel: b,', 'onExternalClick: o,', 'children: f(CL, { status: L }),', '"aria-label": wL(X, L),',
        'f(Ike, {', 'menuControls: p,', 'defaultMessage: "More PR options",'],
      bAe: ['{ shape: t, controls: n, announcement: r, renderRow: i, kept: a } = e,', 'role: "list",', 'className: "flex flex-col gap-1",',
        'children: (e) => i(t, e),', 'f($g, { expanded: o.showAll, onToggle: n.onToggleShowAll })', 'd.history.length > 0 &&'],
      xAe: ['"{count, plural, one {# earlier pull request} other {# earlier pull requests}}",', 'defaultMessage: "{count} merged",', 'id: "WQh7w3BsRk",',
        'o = r ? 90 : 0,', 'rotate: o,'],
      lL: ['var lL = N("band");'],
      kke: ['open: { name: "GitPullRequest", tint: xL.opened },', 'queued: { name: "GitMergeQueue", tint: xL.queued },'],
      Ake: ['var Ake = { merged: "purple", queued: "yellow" };'],
      CL: ['case "failed":', 'return yge;', 'case "unavailable":', 'return vge;', 'return hge;'],
      wL: ['defaultMessage: "CI: checks failing",', 'defaultMessage: "CI: status unavailable",'],
      mAe: ['for (let i of e) ((i.history ? n : t).push(i), i.facts.prState !== void 0 && (r += 1));', 'historyMerged: a.filter((e) => e.facts.prState === "merged").length,'],
      vAe: ['onHistoryOpenChange: r,', 'onToggleShowAll: i'], gke: ['if (t) return (t(e), () => t(null));'],
      qL: ['return e.rows.length > 5;'], JL: ['return t || e.rows.length <= 5 ? e.rows : e.rows.slice(0, 5);'],
      hMe: ['e.state === "merged"', 'e.state === "queued"'], gR: ['return `${e}#${t}`;'], bR: ['repo: (e.repo.split("/").pop() ?? "").toLowerCase(),'],
      yR: ['return JSON.stringify([e.cwd, e.repo, e.branch, e.history]);'],
    } },
];

// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration).
const callSites = [
  // c96d752d0 EL (memo): the PR bar row. In the rail layout (layout prop or the lL context) it renders Ike with these
  // props; the verb is Fke with jke's label unless the PR mode is view / none or the PR is merged / queued (then the
  // PR-only railVerb). The band layout renders Pke for review comments instead. Host: SessionRailChanges (no PR: link
  // null, the commit verb).
  { source: TRANSCRIPT, binding: 'EL', role: 'PR bar row: the rail branch hands Ike its props; verb = Fke unless view/none (host: SessionRailChanges)',
    features: ['ce = (t ?? se) === "rail",', 'he = W === "commit" || W === "none",', 'W === "view" || W === "none" || Z', 'f(Fke, {', 'busyLabel: TL(X, W),',
      'onClick: Y ?? nn,', 'f(Ike, {', 'link: be,', 'branchTitle: C,', 'repoName: r,', 'baseBranch: a,', 'diff: o,', 'verb: e,', 'checks: t,', 'onDiffClick: c,',
      'onDiffOpen: l,', 'diffOpenHasChord: j,', 'extraMenuItems: ne,', 'menuControls: p,', 'warning: z,', 'hint: m,',
      '!Z && N !== void 0 && N > 0 && f(Pke, { count: N, onClick: P })'] },
  // c96d752d0 Pke: the band layout's review comments chip (Chat icon, accent). Not rendered in the rail, where Ike shows
  // DL (changes-row.mjs ReviewCommentsCount).
  { source: TRANSCRIPT, binding: 'Pke', role: 'Band-only review comments chip (the rail row uses DL)',
    features: ['f(We, { name: "Chat", size: "sm", className: "text-accent" })'] },
  // c96d752d0 YL (memo): a rail list item, `li.flex.flex-col[hidden]` around its render prop with diffOpenHasChord, only
  // for the primary row while toggleDiff would open its diff (the diff tile is not the visible one).
  { source: TRANSCRIPT, binding: 'YL', role: 'Rail list item: li (hidden when folded) around renderRow(entry, chord); the chord from the tile layout (host: RailPrListItem)',
    features: ['if (!n || Cde(e, "diff")) return !1;', 'return r.has("diff") || r.has(xm(t)) || !Array.from(r).some(wde);', 'className: "flex flex-col",', 'hidden: r,'] },
  // c96d752d0 Sje: the PR bar root. Rail: `nav[aria-label="Repository and pull request controls"]` with lje; the per-repo
  // rows report rail entries and bAe lists them through renderRow (TR, i.e. Zje's EL with railRowKey and the chord); a
  // single repo hides its name; the fold props (panes:C2-4) only shape the band.
  { source: TRANSCRIPT, binding: 'Sje', role: 'PR bar root: rail nav (lje) with bAe over renderRow; hideRepo for a single repo (host: SessionRailChanges)',
    features: ['w = r === void 0 ? "band" : r,', 'K = w === "rail",', 'defaultMessage: "Repository and pull request controls",', 'hideRepo: n || (w === "rail" && de.length <= 1),',
      'railRowKey: n,', 'railDiffOpenHasChord: t,', 'renderRow: St,', 'kept: _t,', '? f("nav", { ...xt, className: lje, children: Dt })', 'gke(K ? ze.prCount : null);',
      '((e = mAe(t)), K2($, 44, de, le, e));', 'Be = vAe(ze),', 'f(lL.Provider, { value: w, children: Ot })', 'fold: g,', 'Ee = Math.max(1, YAe - (g?.rowsBelow ?? 0)),',
      'Ne = g?.onFoldableCountChange,'] },
  // c96d752d0 Hje: the rail entries per repo: the live row (rowKey, primary, facts {prState, ciStatus}) and the branch's
  // other PRs as history rows (rowKey `${key}#${number}`), each entry's row being `{key, repo, repoState}` for renderRow.
  { source: TRANSCRIPT, binding: 'Hje', role: 'Rail entries: the live row with facts, the branch\'s other PRs as history (host: railPrEntries)',
    features: ['primary: t === 0,', 'history: !1,', 'facts: { prState: c === "none" ? void 0 : c, ciStatus: SR(r, o, !1) },', 'rowKey: gR(n, t.number),',
      'history: Tc(t.state),', 'facts: { prState: t.state, ciStatus: void 0 },', 'row: { key: n, repo: e.sessionRepo, repoState: k },'] },
  // c96d752d0 Zje: one repo's row props. A local session without a forge repo is in commit mode, whose verb sends the
  // commit turn; the rail renders EL with railRowKey's props, layout "rail" and the chord; railVerb (Ready for review on
  // a draft, Merge on an open GitHub PR), ciSlot and reviewComments have no host source. Host: railPrEntries.
  { source: TRANSCRIPT, binding: 'Zje', role: 'Repo row props: commit mode and its turn, EL layout rail with the chord; rail-only sources (host: railPrEntries + SessionRailChanges)',
    features: ['text: "Commit the working tree changes with a sensible message.",', 'defaultMessage: "No changes to commit",', 'railRowKey: k,', 'Rn = i.currentBranch || i.branch,',
      'f(EL, { ...or, layout: "rail", diffOpenHasChord: A })', '`ready-${N.number}`', '`merge-${N.number}`', 'railVerb: Dn,', 'ciSlot: yn,', 'reviewComments: ln,',
      'repoMenu: st,', 'prLinkOpensInApp: ar,'] },
  // c96d752d0 xje (exported vi; cf74bc599 Vl, EpitaxyPrBarSlot's PR bar): Sje for a local session.
  { source: TRANSCRIPT, binding: 'xje', role: 'PR bar entry (cf74bc599 Vl): Sje for a local session',
    features: ['f(Sje, { ...e })'] },
  // c96d752d0 TMe: the PR bar slot; in the rail it reserves the remembered rail height (P_) around xje with layout "rail".
  { source: TRANSCRIPT, binding: 'TMe', role: 'PR bar slot: rail reserve (P_) around xje (host: synchronous, no reserve)',
    features: ['[c] = I(n !== "rail"),', 'layout: c ? "band" : "rail",', 'f(P_, { heightPx: K, entries: h.entries, children: G })'] },
  // c73f45bc3 Py (exported N; cf74bc599 a_): the Changes card's child, the lazy slot with the rail placeholder (us).
  { source: 'c73f45bc3-B7hbL7H9.js', binding: 'Py', role: 'Changes card slot (cf74bc599 a_): lazy Ny with the rail placeholder us (host: synchronous)',
    features: ['if (r !== "rail")', 'r === "rail"', 'i(us, {', 'i(Ny, { sessionRef: t, layout: r, onRequestComposerFocus: a })'] },
];
// Pinned on the minified bytes (each must occur exactly once unless `count` says otherwise). `loose` features go through
// official.looseFeature (R2: identifiers of up to three characters generalized, literals and keys kept).
const rawCallSites = [
  // cf74bc599: the rail's Changes card gets a_ (c73f45bc3 Py) with layout "rail"; the card wraps it in the PR count report,
  // the branch chip face and the row layout ("row" in the flat rail) contexts; the card is hidden until its nav has rows.
  { source: RAIL, role: 'Changes card: a_ layout rail inside the count / face / row layout providers ("row" when flat); hidden while the nav is empty', loose: true,
    features: ['l?void 0:s(a_,{sessionRef:t,layout:"rail",onRequestComposerFocus:a},t.id)',
      'children:s(As.Provider,{value:be,children:s(Kl.Provider,{value:H,children:s(Ds.Provider,{value:V?"row":"stacked",children:n})})})',
      '={pullRequests:"hidden has-[nav:not(:empty)]:flex has-[[data-epitaxy-branch-row-ghost]]:flex"'] },
  { source: TRANSCRIPT, role: 'Changes row feature strings (research §1.2 counts)', count: 1, features: ['"data-rail-changes-row":""'] },
  { source: TRANSCRIPT, role: 'Changes row aria-label (row and stacked branches)', count: 2, features: ['"Open changes, {added, number} added, {removed, number} removed"'] },
  { source: TRANSCRIPT, role: 'Changes row ⋮ label with a repo name (C2-2)', count: 1, features: ['defaultMessage:"More options for {repo} on {branch}",id:"8RgmijlEMA"'] },
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
const sliceAreas = ['code-current', 'files-changes', 'r3b-transcript', 'r4e-findings', 'view-tabs', 'session-rail-kit', ...SIBLING_AREAS];
let areas;
async function loadAreas() {
  if (areas) return areas;
  const viewTabs = await viewTabsManifestFor(referenceVersion);
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
    const manifest = area === 'view-tabs' ? await viewTabsManifestFor(referenceVersion) : await readJson(path.join(generatedRoot, area, 'manifest.json'));
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
const importableAreas = new Set(['files-changes', 'r3b-transcript', 'r4e-findings', ...SIBLING_AREAS]);

// vendor-frame: the export alias of `local` that official.reactAliases lists, proved once (R3).
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
      } else if (adapters[`${spec.source}:${name}`] || kitByLocal.has(`${spec.source}#${name}`)) {
        throw Error(`${spec.target}: root ${name} is provided elsewhere`);
      } else {
        // R4 (w3-rail-changes): a root that view-tabs publishes, or that a 3.6556.2 sibling area / code-current exports,
        // keeps its export name here as a re-export of that one copy (D1), never a second slice.
        const provided = await resolveBinding(spec, spec.source, name, `${spec.source}:${name}`);
        if (provided) { imports.set(name, provided); return; }
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
        // `closureFeatures`: strings of the root's same-chunk closure (raw text), for a root whose own body is only calls.
        assertFeatures(`${spec.target}: root ${name} (closure)`, closureText(src, name), spec.closureFeatures?.[name]);
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
    // `reexports` (R4): an export name whose original moved to another chunk in 3.6556.2 is re-exported from the module
    // that slices it now.
    const reexportText = Object.entries(spec.reexports ?? {}).map(([target, names]) => {
      const from = emitted.find(m => m.spec.target === target);
      if (!from) throw Error(`${spec.target}: re-export from ${target}, which is not an earlier module`);
      for (const n of names) if (!Object.values(from.spec.exports).includes(n)) throw Error(`${spec.target}: ${target} does not export ${n}`);
      return `
export { ${names.join(', ')} } from "./${target}";`;
    }).join('');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };${reexportText}`;
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
        'cancelAnimationFrame', 'AbortController', 'ResizeObserver', 'TypeError', 'getComputedStyle', 'WeakSet', 'Reflect', 'isNaN',
        'MutationObserver', 'queueMicrotask', 'Event',
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
      ...(spec.reexports ? { reexports: spec.reexports } : {}),
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
      const count = site.loose ? [...text.matchAll(official.looseFeature(feature, { flags: 'g', keep: site.keep ?? [] }))].length : text.split(feature).length - 1;
      if (count !== (site.count ?? 1)) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected ${site.count ?? 1}`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, ...(site.loose ? { loose: true } : {}), features: site.features });
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
