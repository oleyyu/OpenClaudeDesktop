// R3-terminal FT-09 (diffgit-01), migrated to 3.6556.2 (w2-tr-findings): extract the Changes pane review finding card
// without executing any desktop runtime (decision D0: own generator, own output folders, own
// scripts/verify-gen-review-findings.mjs, which checks every source contract).
//
// Two source contracts, two outputs (region batch 2a of the 4.16336.0 migration, region-plan G6 / cutover):
//   3.6556.2   src/generated/review-findings, the graph the host (source-pane-review.jsx, review-findings-model.mjs) and
//              the 3.6556.2 pierre-changes generator link by original identity (its linkedAreas check this manifest's
//              version and module bytes), so it stays on 3.6556.2, byte for byte, until they move.
//   4.16336.0  src/generated/review-findings-v4, an isolated graph of the same semantic exports cut from the frozen
//              4.16336.0 snapshot, linking the shared CDS graph cds-core (sharedGraph 'cds-core'). Nothing imports it until
//              the cutover (region-plan cutover.productionSwitchNotBeforeBatch 11, with pierre-changes).
//
// 3.6556.2 modules:
//   review-finding-card.mjs  c44d00c7f wc = memo(Cc): the inline finding card under its line in the diff — the Claude
//                            spark + "Claude" header with the "Line N" / "Lines N–M" label (nc), the Fixed / Fixing… /
//                            Confirmed / Plausible and category badges, the ghost ArrowDown "Next finding" and X
//                            "Dismiss finding" buttons, the body and failure scenario, and the border-t footer with the
//                            secondary ArrowUp "Fix this one" while the finding is open and fixable; $s is the
//                            --diff-widget-* card skin. 3.6556.2 compiles Cc with React Compiler (J9/J1…/K1…, imported
//                            from view-tabs by their E3 semantic names) and renames two ids (Fixed BNEz9MFGbU,
//                            Plausible FNzj2neHoF, research T13).
//   pane-focus-return.mjs    shared-1 nC / aC (2.42304.0 cae42d46f s / u, chunk removed): where focus goes when the card
//                            it was in is dismissed (the diff pane body, a dialog or the pane root, a tick later and only
//                            if focus fell to the body).
//   finding-category.mjs     c227f4d5e b1: the ReportFindings category label (x1: `category: b1(t.category)`).
//
// 4.16336.0 modules (what changed against 3.6556.2):
//   review-finding-card.mjs  c44d00c7f-DNez7133.js Fl = memo(Pl) (region-plan's `fo` was a shape-equal guess; Fl is located
//                            as the one memo() of the uniquely featured Pl, see `memoOf`). New: an "unchanged" status
//                            badge ("No change needed", /sZiHK3SsB); the category badge moved from the header into the
//                            footer (max-w-48), which now also shows for a categorised open finding without Fix; body and
//                            failure scenario render inline code (c2ed6676f InlineCodeText); the failure scenario goes
//                            through cd4f82e77 dr (a blank or "-" scenario is dropped); the line label is a muted
//                            footnote shown only for a finding with a line; muted text uses
//                            --diff-widget-fg / --muted-as-secondary. ll / pl are the card skin and line label.
//   pane-focus-return.mjs    shared-1-D1bGaTaN.js dI / mI / uI / fI / hI: the same five declarations (renamed).
//   finding-category.mjs     cd4f82e77-Cuw99s6A.js fr (the category label moved out of c227f4d5e; pr, the ReportFindings
//                            parser, reads `category: fr(t.category)`) and dr (findingScenario, which the card now reads).
//   inline-code.mjs          c2ed6676f-Bf5-wRdo.js o (InlineCodeText) and inline-code-split.mjs c96d6655d-BjCrWdGK.js t.
//   compiler-helpers.mjs     shared-frame J9 / J8 / J0–J5 / K0–K5 / I1–I4 / Z1: React Compiler helpers, proved by
//                            official-4.16336.0.mjs assertCompilerHelpers; cds-core holds them without a publicName, so
//                            they are cut again as pure bindings whose declaration hash equals cds-core's (heldByCdsCore).
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source. Each module's
// bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked and a renamed or
// re-pointed minified import fails generation instead of silently binding the wrong value. An import resolves, in this
// order, to: a named host adapter in src/source-review-findings-adapters.jsx (feature-checked against the original it
// replaces), a verified React export of vendor-frame (official.reactAliases, R3), a semantic public name of the shared
// graph (3.6556.2 view-tabs, D1/E3: CdsButton / CdsBadge / CdsTooltipProvider / CdsOverflowTooltip / clsx and the compiler
// helpers; 4.16336.0 cds-core publicNames, the manifest's version / snapshot / module bytes / source hashes checked as
// runSlicer does), or another module generated here. 4.16336.0 also: a same-chunk binding cds-core publishes is linked,
// never cut again (its declaration must hash as cds-core's); a binding cds-core holds without a publicName is cut again
// only when it is pure and hashes as cds-core's — module state (a Context / Map / Set / WeakMap / WeakSet) stops
// generation (D46) and is reported with the binding, its text and the chain that reached it (error.stateConflicts).
// 4.16336.0 roots must be the only top-level declaration of their chunk carrying their features (a memo wrapper root is
// the only memo() of its uniquely featured component).
// `callSites` pin the original text the host wiring follows but cannot import: the diff's annotation renderer, the
// annotation list, the ReportFindings parser and the findings card's annotation builder in c96d752d0. Features are
// stable strings, or {loose} (official.looseFeature, R2/E5) where the text names minified bindings.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official3 from './official-3.6556.2.mjs';
import * as official4 from './official-4.16336.0.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-review-findings-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const loose = text => ({ loose: text });

// ── 3.6556.2: the production graph (unchanged contract, byte-identical output) ──────────────────────────────────────
const legacy = (() => {
  const official = official3;
  // vendor-frame re-exports React; each alias is checked against official.reactAliases (R3: top-level
  // `local=<namespace>.<member>`, `Oo` is react/compiler-runtime `c`).
  const vendor = { [official.vendorFrame]: official.reactAliases };
  // Host dependencies. `features` must appear in the same-chunk closure of the original binding the adapter replaces.
  const adapters = {
    // react-intl useIntl / FormattedMessage over the local catalog (source-code-start-adapters.jsx useStartIntl).
    [official.vendorIntl]: {
      p: { name: 'useIntl', features: ['[React Intl]'] },
      l: { name: 'FormattedMessage', features: ['textComponent'] },
    },
    // cc8941b7b pt / mt (exported Z / tt): the session review store's current finding and a finding's status. Here the
    // Changes pane keeps them (source-session.jsx review marks) and hands each card its own through context.
    'cc8941b7b-DAgMZRvX.js': {
      Z: { name: 'useIsCurrentFinding', features: ['.currentFindingBySession[e] === t'] },
      tt: { name: 'useFindingStatus', features: ['.findingStatusBySession[e]?.[t] ?? "open"'] },
    },
    // shared-frame ZO (exported fa): the CDS Spark — idle/undefined state is the static path Jg, `shrink-0` added for a
    // numeric size. The host Spark is SourceSpark (same path, colour and size variable, plus the local persona glyphs).
    [official.sharedFrame]: {
      fa: { name: 'ReviewSpark', features: [loose('typeof r.size == "string" ? t : Q("shrink-0", t)'), loose('i === void 0 || i === "idle"'),
        '"data-cds": "Spark"', loose('Kg = "var(--cds-clay, #d97757)"'), loose('qg = "h-[var(--cds-spark-size)] w-[var(--cds-spark-size)]"')] },
    },
  };
  const modules = [
    // W14-code r6 gen-final-6 (D1): tC / rC / oC exported too, for the pierre Changes body (generated/pierre-changes links
    // this module instead of slicing shared-1's focus-return helpers a second time).
    { target: 'pane-focus-return.mjs', source: 'shared-1-BJhqMmkf.js', exports: { nC: 'focusReturnRegion', aC: 'returnFocusSoon', tC: 'paneRootOf', rC: 'paneFocusTarget', oC: 'returnFocusSoonTo' },
      features: {
        nC: [loose('return e?.closest(\'[data-diff-pane-body], [role="dialog"]\') ?? tC(e);')], tC: ['?.closest("[data-pane-root]") ?? null;'],
        rC: ['.querySelector("[data-diff-pane-body]") ??'], aC: [loose('oC(e, tC(e));')],
        oC: ['setTimeout(() => {', loose('if (n.activeElement !== n.body) return;'), loose('r?.isConnected && rC(r).focus({ preventScroll: !0 });')],
      } },
    { target: 'finding-category.mjs', source: 'c227f4d5e-B-FYKrwT.js', exports: { b1: 'findingCategoryLabel' },
      features: { b1: [loose('if (typeof e != "string") return;'), '.replace(/[-_]+/g, " ").trim();', loose('return (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, 40);')] } },
    { target: 'review-finding-card.mjs', source: 'c44d00c7f-Cr1FDL2F.js', exports: { wc: 'ReviewFindingCard', nc: 'findingLinesLabel', $s: 'DIFF_WIDGET_CARD' },
      features: {
        wc: [loose('wc = v(Cc)')],
        $s: ['"rounded border border-[var(--diff-widget-border,var(--cds-border))] bg-[var(--diff-widget-bg,var(--cds-surface-3))] font-sans text-[var(--diff-widget-fg,var(--cds-text-primary))] shadow-sm"'],
        nc: ['{ defaultMessage: "Line {line}", id: "qtx2KQoFxt" }', '{ defaultMessage: "Lines {start}\\u2013{end}", id: "LkSZyjr77o" }'],
        Cc: [
          loose('$ = J9(64)'), '{ sessionId: i, annotation: a, onDismiss: s, onFix: c, onNext: l }',
          loose('(e?.contains(e.ownerDocument.activeElement) && Ee(Se(e)), s?.());'), '.focus({ preventScroll: !0 }),', loose('m = _r(i, a.id),'), loose('h = kr(i, a.id),'),
          loose('g = h === "open" && !!c,'), 'h === "addressed"', 'variant: "success",', 'defaultMessage: "Fixed", id: "BNEz9MFGbU"', 'defaultMessage: "Fixing\\u2026",',
          '.verdict === "CONFIRMED" ? "danger" : "warning"', 'defaultMessage: "Confirmed", id: "dX7+RvbH/9"', 'defaultMessage: "Plausible", id: "FNzj2neHoF"',
          'defaultMessage: "Next finding", id: "5lh5JiLkPH"', 'defaultMessage: "Next finding after the one on line {line}",', 'id: "RkGf6cYgK5",',
          'className: "px-md py-xs",', 'tabIndex: -1,', '"aria-current": b,', '"border-accent ring-1 ring-accent"',
          'className: "flex min-h-7 items-center gap-1.5 px-md pt-1",', loose('n(ne, { size: 16 })'), 'className: "truncate text-body-medium",',
          'defaultMessage: "Claude", id: "4PjoX4rZSt"', loose('children: nc(a.startLine, a.endLine, u),'), 'className: "ms-auto flex min-w-0 items-center gap-1",',
          'truncate: !0,', 'className: "max-w-[12rem]",', 'lazy: !0,', 'className: "flex shrink-0 items-center gap-0.5",', loose('h === "open" && l'),
          'icon: "ArrowDown",', 'icon: "X",', 'defaultMessage: "Dismiss finding",', '"pb-1.25" : "pb-md"',
          '"whitespace-pre-wrap break-words text-body text-primary"', '"whitespace-pre-wrap break-words text-body text-muted-as-secondary"',
          '"flex justify-end border-t border-[var(--diff-widget-border,var(--cds-border))] px-sm py-xs"', 'variant: "secondary",', 'size: "sm",',
          'icon: "ArrowUp",', 'defaultMessage: "Fix this one",', 'id: "t7GVF0eiPN",',
        ],
      } },
  ];
  const callSites = [
    { source: 'c44d00c7f-Cr1FDL2F.js', binding: 'Pc', role: 'Diff annotation renderer: a finding is wc with Fix / Next (only with more findings) / Dismiss',
      features: [loose('if (r.kind === "finding")'), loose('annotation: r.finding,'), loose('onFix: f ? () => f(r.finding) : void 0,'), loose('onNext: r.hasNext'),
        '.stepReviewFinding(', loose('p ? p(r.finding) : wr.dismissReviewFinding(i, r.finding.id, c)'), loose('n( wc, {')] },
    { source: 'c44d00c7f-Cr1FDL2F.js', binding: 'Tc', role: 'Annotation list: a finding sits under its end line (lineNumber: endLine), hasNext from the pane',
      features: ['key: `finding:${e.id}`,', 'lineNumber: e.endLine,', 'metadata: { kind: "finding", finding: e, hasNext: i },'] },
    { source: 'c227f4d5e-B-FYKrwT.js', binding: 'x1', role: 'ReportFindings finding parser: category is b1(category), line only when a number',
      features: [loose('line: typeof t.line == "number" ? t.line : void 0,'), loose('category: b1(t.category),'), loose('t.verdict === "CONFIRMED" || t.verdict === "PLAUSIBLE"')] },
  ];
  // Pinned on the minified bytes: c96d752d0 is the transcript chunk (tens of thousands of lines); only this text matters.
  const rawCallSites = [
    { source: 'c96d752d0-CWv_7-n9.js', role: 'Findings card: the annotation each reported finding becomes (host: review-findings-model.mjs findingAnnotation)',
      features: [loose('id:`finding-${t.id}-${n}`,filePath:e.file,side:"additions",startLine:e.line??1,endLine:e.line??1,line:e.line,body:e.summary,detail:e.failure_scenario,source:"finding",category:e.category,verdict:e.verdict,createdAt:O')] },
  ];
  return { official, output: path.join(root, 'src/generated/review-findings'), vendor, adapters, modules, callSites, rawCallSites,
    sharedGraph: 'view-tabs', allowedGlobals: new Set(['setTimeout', 'String', 'Object']) };
})();

// ── 4.16336.0: the isolated graph (region-plan G6), linking cds-core ──────────────────────────────────────────────────
const target4 = (() => {
  const official = official4;
  const vendor = { [official.vendorFrame]: official.reactAliases };
  // The same five host services as 3.6556.2 (the adapter module is unchanged): each replaced original still carries the
  // features below, so a changed store shape or spark fails generation.
  const adapters = {
    [official.vendorIntl]: {
      p: { name: 'useIntl', features: ['[React Intl]'] },
      l: { name: 'FormattedMessage', features: ['textComponent'] },
    },
    // cc8941b7b Lt / Rt (exported rt / st): the review store's current finding and a finding's status (same text).
    'cc8941b7b-C4hsxbbb.js': {
      rt: { name: 'useIsCurrentFinding', features: ['.currentFindingBySession[e] === t'] },
      st: { name: 'useFindingStatus', features: ['.findingStatusBySession[e]?.[t] ?? "open"'] },
    },
    // shared-frame dM (exported Wa, cds-core CdsAnimatedSpark): unchanged — idle/undefined state is the static A_
    // (CdsSpark: path D_ in O_ --cds-clay at k_ --cds-spark-size), `shrink-0` added for a numeric size. The host spark
    // stays SourceSpark through ReviewSpark (the local persona glyphs, C2), so it is an adapter, not the cds-core link.
    [official.sharedFrame]: {
      Wa: { name: 'ReviewSpark', features: [loose('typeof r.size == "string" ? t : Q("shrink-0", t)'), loose('i === void 0 || i === "idle"'),
        '"data-cds": "Spark"', loose('O_ = "var(--cds-clay, #d97757)"'), loose('k_ = "h-[var(--cds-spark-size)] w-[var(--cds-spark-size)]"')] },
    },
  };
  const helperNames = ['reactMemoCache', 'memoIsEmpty', 'memoChanged1', 'memoChanged2', 'memoChanged3', 'memoChanged4', 'memoChanged5',
    'memoStore0', 'memoStore1', 'memoStore2', 'memoStore3', 'memoStore4', 'memoStore5',
    'memoStoreValueFirst1', 'memoStoreValueFirst2', 'memoStoreValueFirst3', 'memoStoreValueFirst4', 'memoStoreDeps1'];
  const helpers = Object.fromEntries(helperNames.map(name => {
    const helper = Object.values(official.compilerHelpers).find(h => h.name === name);
    if (!helper) throw Error(`official-${official.referenceVersion}.mjs has no compiler helper ${name}`);
    return [helper.local, helper.name];
  }));
  const modules = [
    // E3: the React Compiler helpers the card and InlineCodeText read, every one proved by assertCompilerHelpers.
    { target: 'compiler-helpers.mjs', source: official.sharedFrame, exports: helpers, compilerHelpers: true },
    { target: 'pane-focus-return.mjs', source: 'shared-1-D1bGaTaN.js', exports: { dI: 'focusReturnRegion', mI: 'returnFocusSoon', uI: 'paneRootOf', fI: 'paneFocusTarget', hI: 'returnFocusSoonTo' },
      features: {
        dI: [loose('return e?.closest(\'[data-diff-pane-body], [role="dialog"]\') ?? tC(e);')], uI: ['?.closest("[data-pane-root]") ?? null;'],
        fI: ['e.matches(\'[data-diff-pane-body], [role="dialog"]\')', '.querySelector("[data-diff-pane-body]") ??'], mI: [loose('oC(e, tC(e));')],
        hI: ['setTimeout(() => {', loose('if (n.activeElement !== n.body) return;'), loose('r?.isConnected && rC(r).focus({ preventScroll: !0 });')],
      } },
    { target: 'finding-category.mjs', source: 'cd4f82e77-Cuw99s6A.js', exports: { fr: 'findingCategoryLabel', dr: 'findingScenario' },
      features: {
        fr: [loose('if (typeof e != "string") return;'), '.replace(/[-_]+/g, " ").trim();', loose('return (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, 40);')],
        dr: [loose('let t = e?.trim();'), loose('return t === void 0 || t === "" || t === "-" ? void 0 : t;')],
      } },
    { target: 'inline-code-split.mjs', source: 'c96d6655d-BjCrWdGK.js', exports: { t: 'splitInlineCode' },
      features: { t: [loose('n.push({ text: t.slice(i + 1, a - 1), isCode: !0 })'), loose('n.length > 0 ? n : [{ text: t, isCode: !1 }]')] } },
    { target: 'inline-code.mjs', source: 'c2ed6676f-Bf5-wRdo.js', exports: { o: 'InlineCodeText' },
      features: { o: ['o.includes("``")', '"rounded-chip bg-alpha-1 px-xs text-code-regular"', 'dir: "ltr",', 'isCode'] } },
    { target: 'review-finding-card.mjs', source: 'c44d00c7f-DNez7133.js', exports: { Fl: 'ReviewFindingCard', pl: 'findingLinesLabel', ll: 'DIFF_WIDGET_CARD' },
      // Fl is `memo(Pl)`: located as the one top-level memo() call of Pl, Pl as the one declaration with its features.
      memoOf: { Fl: 'Pl' },
      features: {
        ll: ['"rounded border border-[var(--diff-widget-border,var(--cds-border))] bg-[var(--diff-widget-bg,var(--cds-surface-3))] font-sans text-[var(--diff-widget-fg,var(--cds-text-primary))] shadow-sm"'],
        pl: ['{ defaultMessage: "Line {line}", id: "qtx2KQoFxt" }', '{ defaultMessage: "Lines {start}\\u2013{end}", id: "LkSZyjr77o" }'],
        Pl: [
          loose('$ = J9(61)'), '{ sessionId: r, annotation: a, onDismiss: o, onFix: s, onNext: c }',
          loose('(e?.contains(e.ownerDocument.activeElement) && Pe(Me(e)), o?.());'), '.focus({ preventScroll: !0 }),', loose('p = fi(r, a.id),'), loose('m = pi(r, a.id),'),
          loose('Mt(a.detail)'), loose('g = m === "open" && (!!s || !!a.category),'), 'm === "addressed"', 'variant: "success",', 'defaultMessage: "Fixed", id: "BNEz9MFGbU"',
          'm === "unchanged"', 'defaultMessage: "No change needed",', 'id: "/sZiHK3SsB",', 'defaultMessage: "Fixing\\u2026",',
          '.verdict === "CONFIRMED" ? "danger" : "warning"', 'defaultMessage: "Confirmed",', 'id: "dX7+RvbH/9",', 'defaultMessage: "Plausible",', 'id: "FNzj2neHoF",',
          'defaultMessage: "Next finding", id: "5lh5JiLkPH"', 'defaultMessage: "Next finding after the one on line {line}",', 'id: "RkGf6cYgK5",',
          'className: "px-md py-xs",', 'tabIndex: -1,', '"aria-current": b,', '"border-accent ring-1 ring-accent"', '"flex flex-col outline-none"',
          'className: "flex min-h-7 items-center gap-1.5 px-md pt-1",', loose('n(F, { size: 16 })'), 'className: "truncate text-body-medium",',
          'defaultMessage: "Claude", id: "4PjoX4rZSt"', loose('children: pl(a.startLine, a.endLine, l),'),
          '"shrink-0 text-footnote text-[var(--diff-widget-muted,var(--muted-as-secondary,var(--cds-text-muted)))]"',
          'className: "ms-auto flex shrink-0 items-center gap-0.5",', loose('m === "open" && c'),
          'icon: "ArrowDown",', 'icon: "X",', 'defaultMessage: "Dismiss finding",', '"pb-1.25" : "pb-md"', '"flex flex-col gap-1 px-md pt-xs"',
          'className: "whitespace-pre-wrap break-words text-body",', loose('n(nr, { text: a.body })'), loose('n(nr, { text: h })'),
          '"whitespace-pre-wrap break-words text-body text-[var(--diff-widget-fg,var(--muted-as-secondary,var(--cds-text-muted)))]"',
          '"flex items-center gap-sm border-t border-[var(--diff-widget-border,var(--cds-border))] ps-md pe-sm py-xs"',
          'truncate: !0,', 'className: "max-w-48",', 'lazy: !0,', 'hoverable: !1,', 'children: a.category,',
          'variant: "secondary",', 'size: "sm",', 'icon: "ArrowUp",', 'className: "ms-auto shrink-0",', 'defaultMessage: "Fix this one",', 'id: "t7GVF0eiPN",',
        ],
      } },
  ];
  const callSites = [
    { source: 'c44d00c7f-DNez7133.js', binding: 'Gl', role: 'Diff annotation renderer: a finding is Fl with Fix / Next (only with more findings) / Dismiss',
      features: [loose('if (r.kind === "finding")'), loose('annotation: r.finding,'), loose('onFix: f ? () => f(r.finding) : void 0,'), loose('onNext: r.hasNext'),
        '.stepReviewFinding(', loose('p ? p(r.finding) : qr.dismissReviewFinding(i, r.finding.id, c)'), loose('n( Fl, {')] },
    { source: 'c44d00c7f-DNez7133.js', binding: 'Il', role: 'Annotation list: a finding sits under its end line (lineNumber: endLine), hasNext from the pane',
      features: ['key: `finding:${e.id}`,', 'lineNumber: e.endLine,', 'metadata: { kind: "finding", finding: e, hasNext: i },'] },
    { source: 'cd4f82e77-Cuw99s6A.js', binding: 'pr', role: 'ReportFindings finding parser: category is fr(category), line only when a number',
      features: [loose('line: typeof t.line == "number" ? t.line : void 0,'), loose('category: fr(t.category),'), loose('t.verdict === "CONFIRMED" || t.verdict === "PLAUSIBLE"')] },
  ];
  const rawCallSites = [
    { source: 'c96d752d0-D9VB6ArX.js', role: 'Findings card: the annotation each reported finding becomes (host: review-findings-model.mjs findingAnnotation)',
      features: [loose('id:`finding-${t.id}-${n}`,filePath:e.file,side:"additions",startLine:e.line??1,endLine:e.line??1,line:e.line,body:e.summary,detail:e.failure_scenario,source:"finding",category:e.category,verdict:e.verdict,createdAt:D')] },
  ];
  return { official, output: path.join(root, 'src/generated/review-findings-v4'), vendor, adapters, modules, callSites, rawCallSites,
    sharedGraph: 'cds-core', uniqueRoots: true,
    isolatedGraph: { productionOutput: 'src/generated/review-findings', productionSwitchNotBeforeBatch: 11, heldBy: ['pierre-changes'] },
    // J8 (the compiler's memo sentinel) reads Symbol; c96d6655d reads Array.
    allowedGlobals: new Set(['setTimeout', 'String', 'Object', 'Symbol', 'Array']) };
})();

export const contracts = Object.freeze({ [official3.referenceVersion]: legacy, [official4.referenceVersion]: target4 });

async function readSource(source, name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, text: bytes.toString(), code, ast, exported, program: null };
  cache.set(name, record);
  return record;
}
function scoped(src) {
  if (!src.program) babel.traverse(src.ast, { Program(p) { src.program = p; p.stop(); } });
  return src.program;
}
const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const declarationDeps = (src, p) => Object.entries(scoped(src).scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
const normalised = text => text.replace(/\s+/g, ' ');
// A top-level declaration in the unformatted chunk bytes: the text a runSlicer graph (cds-core) hashes its bindings by.
function rawDeclarationText(src, name) {
  src.raw ??= new Map(parsers.babel.parse(src.text, {}).program.body.flatMap(node => (node.type === 'FunctionDeclaration' ? [[node.id.name, node]]
    : node.type === 'VariableDeclaration' ? node.declarations.filter(d => d.id.type === 'Identifier').map(d => [d.id.name, d]) : [])));
  const node = src.raw.get(name);
  if (!node) throw Error(`${src.name}: no top-level declaration ${name} in the chunk bytes`);
  return src.text.slice(node.start, node.end);
}
function closureText(src, name) {
  const seen = new Set(), parts = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const p = scoped(src).scope.getBinding(n)?.path;
    if (!p || p.isImportSpecifier()) return;
    parts.push(declarationText(src, p));
    for (const dep of declarationDeps(src, p)) visit(dep);
  };
  visit(name);
  return parts.join('\n');
}
function featureMissing(official, text, features = []) {
  const flat = normalised(text);
  return features.filter(f => typeof f === 'string' ? !text.includes(f) && !flat.includes(normalised(f)) : !official.looseFeature(f.loose).test(text));
}
function assertFeatures(official, label, text, features = []) {
  const missing = featureMissing(official, text, features);
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
// 4.16336.0: the root is the only top-level declaration of its chunk that carries every feature.
function assertUniqueRoot(official, label, src, name, features = []) {
  if (!features.length) throw Error(`${label}: root ${name} has no features to locate it by`);
  const hits = Object.entries(scoped(src).scope.bindings)
    .filter(([, b]) => (b.path.isFunctionDeclaration() || b.path.isVariableDeclarator()) && !featureMissing(official, declarationText(src, b.path), features).length)
    .map(([n]) => n);
  if (hits.length !== 1 || hits[0] !== name) throw Error(`${label}: root ${name} is not the unique declaration with its features (${hits.join(', ') || 'none'})`);
}
// 4.16336.0: a memo wrapper root is the only top-level `<memo>(component)` of its chunk, `memo` being the vendor-frame
// alias official.reactAliases proves to be react memo, and the component being located by its own features.
function assertMemoRoot(contract, label, src, name, component, features, vendorSrc) {
  const { official } = contract;
  assertUniqueRoot(official, label, src, component, features);
  const memoCalls = Object.entries(scoped(src).scope.bindings).filter(([, b]) => {
    if (!b.path.isVariableDeclarator()) return false;
    const init = b.path.node.init;
    if (init?.type !== 'CallExpression' || init.callee.type !== 'Identifier' || init.arguments.length !== 1) return false;
    if (init.arguments[0].type !== 'Identifier' || init.arguments[0].name !== component) return false;
    const callee = scoped(src).scope.getBinding(init.callee.name)?.path;
    if (!callee?.isImportSpecifier() || callee.parent.source.value.replace(/^\.\//, '') !== official.vendorFrame) return false;
    const alias = callee.node.imported.name;
    if (official.reactAliases[alias]?.[0] !== 'react' || official.reactAliases[alias]?.[1] !== 'memo') return false;
    official.assertVendorAlias(vendorSrc.text, alias);
    return true;
  }).map(([n]) => n);
  if (memoCalls.length !== 1 || memoCalls[0] !== name) throw Error(`${label}: root ${name} is not the one memo(${component}) (${memoCalls.join(', ') || 'none'})`);
}
function vendorImport(contract, file, alias, src) {
  const target = contract.vendor[file]?.[alias];
  if (!target) return null;
  // R3: a top-level `local=<namespace>.<member>` of the module's own namespace.
  contract.official.assertVendorAlias(src.bytes.toString(), alias, target);
  return target;
}
async function viewTabsPublic(official) {
  const manifest = await viewTabsManifestFor(official.referenceVersion);
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  const byLocal = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) byLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  return byLocal;
}
// sharedGraph 'cds-core' (4.16336.0): the manifest is on this version and snapshot, every module's bytes equal its
// recorded sha256 and its sourceSha256 equals the official chunk this generator reads, and every publicName is a
// binding its target module exports under exportName (the runSlicer sharedGraph contract, as extract-btw-pane.mjs).
async function cdsCoreGraph(contract) {
  const { official } = contract, area = contract.sharedGraph, dir = path.join(generatedRoot, area);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  if (manifest.referenceSnapshot !== official.referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${official.referenceSnapshot}`);
  const byTarget = new Map(), held = new Map(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}, expected ${official.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
    if (!bytes || !/^[0-9a-f]{64}$/.test(m.sourceSha256 ?? '') || sha(bytes) !== m.sourceSha256)
      throw Error(`${area}/${m.target} was sliced from ${m.source} ${m.sourceSha256 ?? '(no sourceSha256)'}, which is not the source this area reads`);
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
  return { area, held, published, manifestSha256: sha(manifestBytes) };
}
// Module state a second copy would split: a context, or a module-level WeakMap / Map / Set / WeakSet (D46).
function isModuleState(contract, src, p) {
  if (!p.isVariableDeclarator()) return false;
  const init = p.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return true;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = scoped(src).scope.getBinding(init.callee.name)?.path;
    if (callee?.isImportSpecifier()) {
      const file = callee.parent.source.value.replace(/^\.\//, '');
      if (file === contract.official.vendorFrame && contract.official.reactAliases[callee.node.imported.name]?.[1] === 'createContext') return true;
    }
  }
  return false;
}

// `contract` (tests only): a variant of a source contract, run check-only so it can never write an output folder.
export async function extractReviewFindings({ check = false, version = official3.referenceVersion, contract: variant } = {}) {
  if (variant && !check) throw Error('extract-review-findings: a contract variant runs with check: true only');
  const contract = variant ?? contracts[version];
  if (!contract) throw Error(`extract-review-findings has no ${version} source contract`);
  const { official, output } = contract, { referenceVersion, referenceSnapshot } = official, source = official.ionSource;
  const cds = contract.sharedGraph === 'cds-core';
  const cache = new Map();
  const published = cds ? null : await viewTabsPublic(official);
  const graph = cds ? await cdsCoreGraph(contract) : null;
  const emitted = [], stateConflicts = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-review-findings.mjs',
    adapterModule: 'src/source-review-findings-adapters.jsx',
    ...(graph ? { sharedGraph: graph.area, isolatedGraph: contract.isolatedGraph } : {}),
    modules: [], callSites: [],
  };
  const files = {};
  for (const spec of contract.modules) {
    const src = await readSource(source, spec.source, cache);
    const program = scoped(src);
    if (spec.compilerHelpers) {
      const proved = official.assertCompilerHelpers(src.text);
      for (const [local, name] of Object.entries(spec.exports))
        if (proved[name]?.local !== local) throw Error(`${spec.target}: ${local} is not the proved compiler helper ${name}`);
    }
    const selected = new Map(), imports = new Map(), seen = new Set(), heldByCdsCore = [];
    const add = async (name, reachedBy) => {
      if (seen.has(name)) return;
      seen.add(name);
      const binding = program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const adapter = contract.adapters[file]?.[alias];
        if (adapter) {
          const dep = await readSource(source, file, cache);
          const local = dep.exported.get(alias);
          if (!local) throw Error(`${spec.target}: adapter alias ${via} is no longer exported`);
          assertFeatures(official, `${spec.target}: adapter ${via} (${local})`, closureText(dep, local), adapter.features);
          imports.set(name, { from: adapterModule, name: adapter.name, via, kind: 'adapter', original: local });
          return;
        }
        const dep = await readSource(source, file, cache);
        const react = vendorImport(contract, file, alias, dep);
        if (react) { imports.set(name, { from: react[0], name: react[1], via, kind: 'react' }); return; }
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${via} is not exported`);
        if (graph) {
          const shared = graph.published.get(`${file}#${local}`);
          if (shared) { imports.set(name, { from: `../${graph.area}/${shared.target}`, name: shared.exportName, via, kind: 'shared-graph', original: local }); return; }
        } else {
          const shared = published.get(`${file}#${local}`);
          if (shared) { imports.set(name, { from: `../view-tabs/${file}`, name: shared.name, via, kind: 'view-tabs', original: local }); return; }
        }
        const generated = emitted.find(m => m.spec.source === file && m.spec.exports[local]);
        if (!generated) throw Error(`${spec.target}: unresolved import ${via} (${local})`);
        imports.set(name, { from: `./${generated.spec.target}`, name: generated.spec.exports[local], via, kind: 'generated' });
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      if (graph) {
        // One copy of each CDS name: a binding cds-core publishes is linked (its declaration must hash as cds-core's);
        // one it holds without a publicName is cut again only when pure and identical, module state is D46.
        const key = `${spec.source}#${name}`, shared = graph.published.get(key), held = graph.held.get(key);
        if (shared) {
          if (!held?.sha256 || held.sha256 !== sha(rawDeclarationText(src, name)))
            throw Error(`${spec.target}: ${key} differs from the declaration ${graph.area} publishes as ${shared.name}`);
          imports.set(name, { from: `../${graph.area}/${shared.target}`, name: shared.exportName, via: key, kind: 'shared-graph', original: name, linkedSha256: held.sha256 });
          return;
        }
        if (held) {
          if (isModuleState(contract, src, p)) {
            stateConflicts.push({ binding: key, heldBy: `${graph.area}/${held.target}`, text: rawDeclarationText(src, name).slice(0, 400), reachedBy: [...reachedBy, name].join(' -> ') });
            return;
          }
          if (held.sha256 !== sha(rawDeclarationText(src, name))) throw Error(`${spec.target}: ${key} differs from the declaration ${graph.area}/${held.target} holds`);
          heldByCdsCore.push(name);
        }
      }
      selected.set(name, p);
      p.traverse({
        ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); },
        CallExpression(r) { if (r.node.callee.type === 'Import') throw Error(`${spec.target}: dynamic import inside ${name}`); },
      });
      for (const dep of declarationDeps(src, p)) await add(dep, [...reachedBy, name]);
    };
    for (const name of Object.keys(spec.exports)) {
      const binding = program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (contract.uniqueRoots && !spec.compilerHelpers) {
        if (spec.memoOf?.[name]) assertMemoRoot(contract, spec.target, src, name, spec.memoOf[name], spec.features?.[spec.memoOf[name]], await readSource(source, official.vendorFrame, cache));
        else assertUniqueRoot(official, spec.target, src, name, spec.features?.[name]);
      }
      await add(name, [`${spec.target}:${spec.exports[name]}`]);
    }
    // Features: every pinned binding must be in the closure and carry its original text.
    for (const [name, features] of Object.entries(spec.features ?? {})) {
      const p = selected.get(name);
      if (!p) throw Error(`${spec.target}: pinned binding ${name} is not in the closure of ${Object.keys(spec.exports).join(',')}`);
      assertFeatures(official, `${spec.target}: ${name}`, declarationText(src, p), features);
    }
    // D46: once module state was refused nothing is emitted; the remaining modules are still walked so every
    // conflict is reported at once.
    if (stateConflicts.length) { emitted.push({ spec }); continue; }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-review-findings.mjs.\n// Edit the extractor or src/source-review-findings-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    // The module must be closed: every identifier it reads is imported or declared in it.
    const closed = babel.babelParse(text, spec.target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter(name => !contract.allowedGlobals.has(name));
    if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}), ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      exports: spec.exports,
      ...(graph ? { heldByCdsCore } : {}),
    });
    emitted.push({ spec });
  }
  // D46: module state cds-core holds without a publicName stops generation; nothing is written or checked.
  if (stateConflicts.length) {
    const error = Error(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${stateConflicts.map(c => c.binding).join(', ')}`);
    error.stateConflicts = stateConflicts;
    throw error;
  }
  for (const site of contract.callSites) {
    const src = await readSource(source, site.source, cache);
    const node = topLevelDeclaration(src, site.binding);
    const text = src.code.slice(node.start, node.end);
    assertFeatures(official, `call site ${site.source}:${site.binding}`, text, site.features);
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(text), features: site.features });
  }
  for (const site of contract.rawCallSites) {
    const bytes = await fs.readFile(path.join(source, site.source));
    assertFeatures(official, `call site ${site.source} (raw)`, bytes.toString(), site.features);
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Review findings ${referenceVersion} output set changed: ${present.join(',')}. Run scripts/extract-review-findings.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Review findings ${referenceVersion} source mismatch: ${name}. Run scripts/extract-review-findings.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} review finding modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites${graph ? `, ${graph.area} ${graph.manifestSha256.slice(0, 8)}` : ''}).`);
  return manifest;
}
function topLevelDeclaration(src, name) {
  const hits = [];
  for (const node of src.ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) hits.push(node);
    for (const declarator of node.declarations ?? []) if (declarator.id?.name === name) hits.push(declarator);
  }
  if (hits.length !== 1) throw Error(`${src.name}: expected one top-level ${name}, found ${hits.length}`);
  return hits[0];
}

// `node scripts/extract-review-findings.mjs [--check] [--version <v>]`: every contract unless one is named.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf('--version');
  const versions = at > 0 ? [process.argv[at + 1]] : Object.keys(contracts);
  for (const version of versions) await extractReviewFindings({ check: process.argv.includes('--check'), version });
}
