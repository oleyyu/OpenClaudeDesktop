// Working line, 4.16336.0 contract (OpenClaude v0.3 -> Claude 4.16336.0, frozen snapshot
// reference/snapshots/claude-4.16336.0-20261104): the Code transcript's loading line sliced from the 4.16336.0 chunks into
// the isolated graph src/generated/working-line-v4, next to the 3.6556.2 production graph src/generated/working-line that
// scripts/extract-working-line.mjs keeps writing byte for byte (region plan G6, cutover.productionSwitchNotBeforeBatch 10:
// chat-knowledge, chat-markdown, chat-messages, chat-projects, code-editor, code-transcript, cowork-home,
// session-rail-context, sessions-page and transcript-rows, still on 3.6556.2, link the production graph by original
// identity, so it cannot move until they do).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here), with
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames; a binding cds-core holds without one is sliced again only
//     when it is not module state; module state stops generation, D46). heldStateV4 below adds the state the engine's own
//     test does not see (a context made through a chunk-local createContext alias, a module-level binding a selected
//     declaration writes), so a second copy of cds-core state can never be emitted silently;
//   - the same host adapter module as 3.6556.2 (src/source-working-line-adapters.jsx, unchanged: every 4.16336.0 adapter
//     resolves to one of its existing exports; the adapter's declaration is pinned by features in its own chunk).
// Roots are located by AST (locateRootsV4): each root is the one top-level declaration of its chunk whose raw text
// contains the probe and whose prettier form carries every feature, and its export alias (or the absence of one) matches;
// a context root is its pinned raw declaration, made through the chunk's React createContext alias and read by a located
// root. Call sites and raw call sites are pinned the same way. Any mismatch stops generation; no pin-refresh script exists.
//
// 4.16336.0 vs 3.6556.2 (roots.json `previous` records each mapping):
//   working-line.mjs   c96d752d0 Y5 (export X; 3.6556.2 U6): new props coversMarkedRow, spawnHoldsStill, sendingLabel,
//                      atRest; the "Thinking" row label is ceb33a220 (shared message table), and "Thought for {seconds}s".
//                      X5 (export Y; 3.6556.2 W6, pinned not emitted) feeds it from the session stores.
//   turn-status-rows.mjs  ca7b95e24 l / d / f / p (3.6556.2 c26fb8b6b qe / Je / Ye / Xe): the flag moved chunk; the
//                      reader is now `use(u) ?? false`.
//   api-errors.mjs     c4a9ee384 rp / ap (ym / xm): rp adds "Check the network, proxy, or firewall on {host}" after
//                      repeated unknown errors over SSH, and bidi-isolates the host (shared-160 Sr over shared-62 SN).
//   cdsIconAliases (3.6556.2 view-tabs) is gone from the 4.16336.0 closure (region plan G3).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as v4 from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
export const WORKING_LINE_V4_OUTPUT = 'src/generated/working-line-v4';
const generatedRoot = path.join(root, 'src/generated');
// The activity sheets c8677db5f names (/assets/v1/*.webp) are byte-identical in 3.6556.2 and 4.16336.0 (same file
// names; tests/working-line-v4.test.mjs compares them with the production copies). A staged graph never copies into the
// active public/assets/v1 (runSlicer default for staged graphs): a write run copies them into this staging folder, which
// is outside every served root.
const stagedPublicAssets = path.resolve(root, '../analysis/claude-4.16336.0-migrate-20261104/regions/batch2b/working-line/staging/public/assets/v1');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// Host adapters: chunk -> export alias -> { name (export of src/source-working-line-adapters.jsx), local (the declaration
// the alias must name), features (its prettier form) }. Same names and meaning as the 3.6556.2 contract.
const adaptersV4 = {
  // react-intl useIntl / FormattedMessage over the local catalog (same locals q / Gt as 3.6556.2).
  'vendor-intl-BJgYK7RA.js': {
    p: { name: 'useIntl', local: 'q', features: ['return (Mt(e), e);'], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
    l: { name: 'FormattedMessage', local: 'Gt', features: ['(Wt, Ut)'], also: { Wt: ['textComponent:', '{ ignoreTag: f }', 'Array.isArray(p) ? p : [p]'] } },
  },
  // shared-25 ko (export Fg): a GrowthBook flag (Y5's raw turnStatusRows read `Bn(Bye)`, ca7b95e24 d's provider).
  // Mo (export Wg): a GrowthBook flag behind an enable argument (shared-31 $m: the activity sprites' `__gb__2346508742`).
  'shared-25-D-aF0gt9.js': {
    Fg: { name: 'useGrowthBookFlag', local: 'ko', features: ['.on;'] },
    Wg: { name: 'useGrowthBookFlagWhen', local: 'Mo', features: ['!t || !n?.growthbook', '.on;'] },
  },
  // shared-36 Rm (export bo): the chat text size preference.
  'shared-36-fqRFYwOb.js': { bo: { name: 'useChatTextSize', local: 'Rm', features: ['return Om(zm);'], also: { zm: ['return e.chatTextSize;'] } } },
  // c06cf64bb: the desktop's per-session turn stores; the host answers the empty session (no desktop session id here).
  'c06cf64bb-CoZso5N4.js': {
    On: { name: 'useTurnStartTime', local: 'BA', features: ['function BA(e) {'], also: { VA: ['return e?.pendingTurn?.startTime ?? null;'] } },
    Qa: { name: 'sessionTokenCounter', local: 'V', features: ['addThinkingText(e, t) {', 'setTaskTokens(e, t, n) {'] },
    qn: { name: 'sessionActivityStore', local: 'K', features: ['WC("requesting", "sending")', 'awaitsInit(e) {', 'return t === "sending" || t === "starting";'] },
    $a: { name: 'sessionActivityEvents', local: 'Zc', features: ['subscribe(e) {', 'notify(e) {'] },
  },
};

const E = '\\u2026';
// Roots: chunk -> local -> { name, alias (chunk export alias, null = private), probe (raw token), features } or a context
// { name, alias, context: { text (raw declaration), readBy (a located root of this chunk), read (raw text in it) } }.
const C96 = 'c96d752d0-D9VB6ArX.js';
export const rootsV4 = {
  'ca7b95e24-BFvFgBI_.js': {
    l: { name: 'TURN_STATUS_ROWS_FLAG', alias: 'i', probe: '2846116625', features: ['l = "__gb__2846116625"'] },
    d: { name: 'TurnStatusRowsProvider', alias: 'o', probe: 'children', features: ['{ children: r } = n,', 's = i ?? o;', 'value: s, children: r'] },
    f: { name: 'TurnStatusRowsOverride', alias: 'a', probe: 'children', features: ['{ value: n, children: r } = t,', 'value: n, children: r'] },
    p: { name: 'useTurnStatusRows', alias: 's', probe: '??!1', features: ['return t(u) ?? !1;'] },
  },
  'c93058e68-Dnwt2AaM.js': { d: { name: 'useElapsedSince', alias: 't', probe: '??null', features: ['return u(e ?? null, n);'] } },
  'c60636ac6-Qhz8qfr3.js': { Je: { name: 'useCountTween', alias: 'a', probe: 'requestAnimationFrame', features: ['requestAnimationFrame', 'n = t === void 0 ? 400 : t,'] } },
  'shared-8-BqfCbkJd.js': { xZ: { name: 'formatTokenCount', alias: 'I', probe: 'e=>e', features: ['return SZ(e, (e) => e);'] } },
  'c93fb40ec-ueIsHfDz.js': { t: { name: 'THINKING_TOKEN_COUNT_FLAG', alias: 'n', probe: 'ccr_thinking_token_count', features: ['t = "ccr_thinking_token_count"'] } },
  'c4a9ee384-BWj_BT12.js': {
    rp: { name: 'apiRetryLabel', alias: 't', probe: 'noResponse', features: ['if (e.noResponse)', 'n === "long"', 'defaultMessage: "Check the network, proxy, or firewall on {host}"'] },
    ap: { name: 'apiRetryCountText', alias: 'n', probe: 'maxRetries', features: ['e.noResponse && e.maxRetries === 1'] },
  },
  'cc5c5e22c-Bin4bZh4.js': {
    c: { name: 'useSpinnerFace', alias: 't', probe: 'publish', features: ['word:', 'message:', 'mode:'] },
    s: { name: 'SpinnerFaceContext', alias: 'n', context: { text: 's=t(null)', readBy: 'c', read: 'd=n(s)' } },
  },
  'c28b569d3-CjPHW-8M.js': {
    a: { name: 'seatLeadingMark', alias: 'r', probe: 'seated', features: ['leading:', 'seated:'] },
    i: { name: 'MarkSeatContext', alias: 'n', context: { text: 'i=n(null)', readBy: 'a', read: 't(i)' } },
  },
  'c8677db5f-CJKAHncR.js': {
    D: { name: 'ALIASES', alias: 'ALIASES', probe: '', features: [] },
    O: { name: 'SHEETS', alias: 'SHEETS', probe: '', features: [] },
    E: { name: 'SHEET_FRAME', alias: 'SHEET_FRAME', probe: '', features: [] },
    k: { name: 'SHEET_URLS', alias: 'SHEET_URLS', probe: 'think.loop', features: ['"think.loop": x,'] },
  },
  'c05970c42-pKfzwsnZ.js': { s: { name: 'ActivityMark', alias: 't', probe: 'standalone', features: ['mark:', 'standalone:', '"classic"'] } },
  'c734f318c-CGzPyTBU.js': {
    zt: { name: 'TurnStatus', alias: 't', probe: 'Phrases', features: ['Object.assign(', 'Step:', 'Phrases:'] },
    Dt: { name: 'TurnStatusStep', alias: null, probe: 'TurnStatusStep', features: ['"data-cds": "TurnStatusStep"'] },
  },
  'cb6c4b462-DQhtu8Uk.js': {
    d: { name: 'domMax', alias: 'domMax', probe: 'renderer', features: ['renderer: o,'] },
    f: { name: 'PresenceElement', alias: 'PresenceElement', probe: 'elementRef', features: ['ref: i', 'J9(4)'] },
    p: { name: 'HidingPresenceElement', alias: 'HidingPresenceElement', probe: 'aria-hidden', features: ['"aria-hidden": c,'] },
  },
  'cb6930dae-DPu57U90.js': {
    ru: { name: 'Morph', alias: 'xt', probe: 'morphKey', features: ['morphKey:', 'mode:', 'openWidth:', '"popLayout"'] },
    du: { name: 'TurnMarkBrokerContext', alias: null, context: { text: 'du=m(null)', readBy: 'Ru', read: 'let e=d(du)' } },
    Nu: { name: 'noSubscription', alias: null, probe: 'void 0', features: ['function Nu() {', 'return () => void 0;'] },
    Pu: { name: 'neverHeld', alias: null, probe: 'return!1', features: ['function Pu() {', 'return !1;'] },
    qu: { name: 'TurnActivityContext', alias: null, context: { text: 'qu=m(void 0)', readBy: 'Yu', read: 'return h(qu)' } },
    Yu: { name: 'useTurnActivity', alias: 'Q', probe: 'h(qu)', features: ['return h(qu);'] },
    Ru: { name: 'useTurnMarkHeld', alias: 'pt', probe: 'held', features: ['e?.held'] },
  },
  [C96]: {
    Y5: { name: 'WorkingLine', alias: 'X', probe: 'toolLabelUnspoken', features: ['toolLabel:', 'toolLabelUnspoken:', 'toolLabelSince:', 'toolLabelEndedAt:', 'apiRetrySshHost:',
      'coversMarkedRow:', 'spawnHoldsStill:', 'sendingLabel:', 'atRest:', '+ 2e3', '"short"', 'defaultMessage: "Thought for {seconds}s"',
      '"{count, plural, one {# running task} other {# running tasks}}",', `defaultMessage: "Stopping${E}",`, `defaultMessage: "Compacting session${E}",`,
      `defaultMessage: "Working${E}"`, '"tokens"'] },
    F5: { name: 'thinkingElapsedBucket', alias: 'Z', probe: '>=2?2:0', features: ['e >= 2 ? 2 : 0'] },
    Zgt: { name: 'thinkingLabel', alias: null, probe: 'Almost done thinking', features: [`defaultMessage: "Almost done thinking${E}",`, `defaultMessage: "Still thinking${E}",`] },
    R5: { name: 'waitingLabel', alias: '$', probe: 'Waiting for Claude', features: [`defaultMessage: "Waiting for Claude${E}",`, `defaultMessage: "Running tools${E}",`, 'case "connecting":'] },
    RM: { name: 'spinnerMode', alias: null, probe: '"tool-use"', features: ['? "thinking"', '"tool-use"', '"responding"', '"requesting"'] },
    i_t: { name: 'WORKING_LINE_TEST_ID', alias: null, probe: 'code-working-line', features: ['i_t = "code-working-line"'] },
    FM: { name: 'useNeedsYourInputLabel', alias: null, probe: 'ydrhToQu', features: ['defaultMessage: "Needs your input"', 'let $ = J9(2),'] },
    IM: { name: 'useSpinnerWord', alias: null, probe: 'IM=', features: ['var IM = ake;'] },
    LM: { name: 'spinnerWord', alias: null, probe: 'trimEnd', features: [`(${E}|\\.\\.\\.)$`] },
    PM: { name: 'useTurnClock', alias: null, probe: '!=null', features: ['>= 2 ? a : void 0'] },
    rE: { name: 'activityMark', alias: 'ds', probe: 'mark:"clay"', features: ['mark: "clay"', 't === void 0 ? {} : t'] },
  },
};

// Bindings v4 consumers of the 3.6556.2 graph's linkExports will need, each mapped to its 4.16336.0 local and exported
// under that local (the semantic name is the consumer's to give). Evidence: vendor-motion export aliases are the same in
// both releases (cb6c4b462 imports N/a/c/f/h/l/m/o/s/u from it in both) and each mapped local is that alias's declaration;
// morph Fa/La/Pa/Ra/za are byte-equal (Wl/Kl/Ul/ql/Jl), Ba/Ia shape-equal and unique (Yl/Gl); shared-2 R6 -> m7
// (shape-equal, unique), x6 -> X5 (the context m7's action bar reads, `v=x(X5)`); shared-1 CR -> J$ (the clipboard hook:
// `{ timeout: t, trim: n }`); c96d752d0 EE -> pP (shape-equal, unique). Not carried (tests/working-line-v4.test.mjs records
// why): shared-frame gn/hn/ia/Mh/qF (shared-frame is cds-core's; v4 consumers link cds-core), shared-0 ea (its export
// alias and its shape point at different 4.16336.0 declarations, Zu vs Uc).
// D1 (cds-integrate wave 8s, W8S-M6): cds-core now holds and publishes vendor-motion Zc (the MotionConfig context,
// settings_vendormotion_Zc, pins.merge.wave8s), so v4 consumers link it from cds-core and this graph no longer exports it (F,
// motion's time, stays here: wave 8s holds it back with the frameloop it reads, W8S-H5);
// the vendor-motion list was ['C', 'Cl', 'F', 'G', 'K', 'M', 'N', 'S', 'Tn', 'Zc', 'Zr', '_n', 'fd', 'ln', 'mn', 'ol', 'pd',
// 'su', 'ul', 'x', 'xn'] through wave 8.
const linkExportsV4 = {
  'vendor-motion-Ba5cqrBN.js': ['C', 'Cl', 'F', 'G', 'K', 'M', 'N', 'S', 'Tn', 'Zr', '_n', 'fd', 'ln', 'mn', 'ol', 'pd', 'su', 'ul', 'x', 'xn'],
  'cb6930dae-DPu57U90.js': ['Gl', 'Jl', 'Kl', 'Ul', 'Wl', 'Yl', 'ql'],
  // round-4 addendum B (W8B-X2): the matchMedia subscription helpers transcript-rows-v4's ToolRow (wz) reaches through m7's
  // siblings (n5 hook, $8 per-window cache over the WeakMap Q8, e5 / t5 the no-window subscribe / snapshot), exported so it
  // links this graph's one Q8 (module state) instead of stopping on an unexported link.
  'shared-2-CsjIBQD8.js': ['X5', 'm7', 'n5', '$8', 'Q8', 'e5', 't5'],
  'shared-1-D1bGaTaN.js': ['J$'],
  'vendor-intl-BJgYK7RA.js': ['tn'],
  [C96]: ['pP'],
};
const linkFeaturesV4 = {
  'shared-2-CsjIBQD8.js#X5': { context: { text: 'X5=y(!1)', readBy: 'm7', read: null } },
  'shared-1-D1bGaTaN.js#J$': { features: ['{ timeout: t, trim: n }', 't === void 0 ? 2e3 : t,'] },
  'shared-2-CsjIBQD8.js#m7': { features: ['Object.assign(e7, {'] },
};

// One generated module per chunk the closure enters (target names follow the 3.6556.2 graph where the role is the same).
const targets = [
  ['turn-status-rows.mjs', 'ca7b95e24-BFvFgBI_.js'],
  ['elapsed-clock.mjs', 'c93058e68-Dnwt2AaM.js'],
  ['media-query.mjs', 'shared-25-D-aF0gt9.js'],
  ['shared-0.mjs', 'shared-0-CnnWnVrT.js'],
  ['count-tween.mjs', 'c60636ac6-Qhz8qfr3.js'],
  ['token-format.mjs', 'shared-8-BqfCbkJd.js'],
  ['flag-names.mjs', 'c93fb40ec-ueIsHfDz.js'],
  // shared-38 qn "data-epitaxy-transcript-region" (3.6556.2 shared-6 Sg).
  ['transcript-attrs.mjs', 'shared-38-DyF0_Fim.js'],
  ['define-messages.mjs', 'vendor-intl-BJgYK7RA.js'],
  ['shared-62.mjs', 'shared-62-DoCqVpIq.js'],
  ['shared-160.mjs', 'shared-160-DDUFdDNM.js'],
  ['api-errors.mjs', 'c4a9ee384-BWj_BT12.js'],
  // ceb33a220 t: the shared "Thinking" message table Y5's sle reads.
  ['thinking-messages.mjs', 'ceb33a220-DKpZ8l1W.js'],
  ['spinner-native.mjs', 'c1e715a58-Cj2MxC0n.js'],
  ['spinner-face.mjs', 'cc5c5e22c-Bin4bZh4.js'],
  ['mark-seat.mjs', 'c28b569d3-CjPHW-8M.js'],
  ['clipboard.mjs', 'shared-1-D1bGaTaN.js'],
  ['shared-5.mjs', 'shared-5-u8kha2eH.js'],
  ['shared-183.mjs', 'shared-183-B2N6Zy4J.js'],
  ['preload-helper.mjs', 'preload-helper-BBljBeZo.js'],
  ['shared-frame.mjs', 'shared-frame-CJdE5Ria.js'],
  ['shared-2.mjs', 'shared-2-CsjIBQD8.js'],
  ['shared-31.mjs', 'shared-31-C9BqSSuD.js'],
  ['card-classes.mjs', 'c8ba53634-irgE0xgn.js'],
  ['turn-steps.mjs', 'c227f4d5e-DGDdGBTz.js'],
  // The activity sheets, emitted under the chunk's own name so shared-33's `import("./c8677db5f-CJKAHncR.js")` resolves.
  ['c8677db5f-CJKAHncR.js', 'c8677db5f-CJKAHncR.js'],
  // shared-33: the clay activity mark's sprite players (3.6556.2 cc39db724, activity-sprites.mjs).
  ['activity-sprites.mjs', 'shared-33-DtdykY0y.js'],
  ['activity-mark.mjs', 'c05970c42-pKfzwsnZ.js'],
  ['turn-status.mjs', 'c734f318c-CGzPyTBU.js'],
  ['vendor-motion.mjs', 'vendor-motion-Ba5cqrBN.js'],
  ['presence-motion.mjs', 'cb6c4b462-DQhtu8Uk.js'],
  ['morph.mjs', 'cb6930dae-DPu57U90.js'],
  ['working-line.mjs', C96],
];
const modulesV4 = targets.map(([target, source]) => {
  const roots = rootsV4[source] ?? {};
  const exports = Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name]));
  const features = Object.fromEntries(Object.entries(roots).filter(([, r]) => r.features?.length).map(([local, r]) => [local, r.features]));
  const internal = Object.values(roots).some(r => r.alias === null);
  return { target, source, ...(internal ? { internal: true } : {}), exports, features, ...(linkExportsV4[source] ? { linkExports: linkExportsV4[source] } : {}) };
});

// Original text the host wiring follows but cannot import.
const callSitesV4 = [
  { source: C96, binding: 'X5', alias: 'Y', probe: 'loading_indicator', role: 'How the desktop feeds Y5 from its session stores and the mark broker (3.6556.2 W6; host: src/working-line-model.mjs workingLineProps)',
    features: ['toolLabel: v,', 'toolLabelUnspoken: y,', 'toolLabelSince: b,', 'toolLabelEndedAt: S,', 'z?.kind === "ssh"', 'hasTokens: we,', 'turnStartTime: j,',
      'finishedTaskCount: pe,', 'atRest: be,', 'coversMarkedRow: xe,', 'spawnHoldsStill: X,', 'sendingLabel: ae,', '"loading_indicator"'] },
  { source: C96, binding: 's_t', alias: null, probe: 'startedAt', role: 'toolLabelSince: the said tool call\'s start (startedAt, else looked up), pushed past the waits (3.6556.2 Jet)',
    features: ['t.startedAt === void 0', 't.startedAt ?? o'] },
  { source: C96, binding: 'W5', alias: null, probe: 'isRunning', role: 'sessionId null: the tokens come from the tokens prop (3.6556.2 B6)', features: ['t === null', 'isRunning: n, tokens: r'] },
  { source: C96, binding: 'a_t', alias: null, probe: 'clockNotBefore', role: 'sessionId and clockStartTime null: the clock is the elapsedSeconds prop when it reaches 2; clockNotBefore hides it (3.6556.2 Ket)',
    features: ['clockStartTime: l,', 'clockNotBefore: u,', 'Y = d >= 2 ? d : void 0', 'N + j * 1e3 < u', 'overHeldRow: a'] },
];
// Pinned on the minified bytes (each must occur exactly once).
const rawCallSitesV4 = [
  { source: C96, role: 'Y5 reads the rows flag through ca7b95e24 p (Rv) and the raw flag l (Bye) through useGrowthBookFlag; the next renderer feed forces it on through f (Lv)',
    features: ['import{a as Lv,i as Bye,s as Rv}from"./ca7b95e24-BFvFgBI_.js"', 'he=Bn(Bye)'] },
  { source: 'cf74bc599-BytvntCE.js', role: 'The transcript turns the rows on when the gate or the renderer chrome says so (lr = p() || cr) and provides it through f (Oh)',
    features: ['lr=kh()||cr', 'o(Oh,{value:lr,children:Ol})'] },
  { source: 'c66fe388e-sXvAafc7.js', role: 'd (ie): the GrowthBook provider the desktop mounts at its root', features: ['import{o as ie}from"./ca7b95e24-BFvFgBI_.js"', 'e(ie,{children:o})'] },
];

// Wave 8 (cds-integrate/wave8 W8-RT, round3 integrate-gates notFixed r3b-tasks-subtask:98): the r3b-tasks bindings this
// closure reaches (shared-0 Tl) are linked from r3b-tasks, their one 4.16336.0
// owner (D1 survey: converge on r3b-tasks; r3b-tasks exports them, roots under their semantic names, the rest as linkExports),
// never cut again here.
export const WORKING_LINE_V4 = {
  name: 'working line (4.16336.0)', generator: 'extract-working-line-v4.mjs', output: path.join(root, WORKING_LINE_V4_OUTPUT),
  adapterModule: '../../source-working-line-adapters.jsx', adapterFile: 'src/source-working-line-adapters.jsx',
  adapters: adaptersV4, localAdapters: {}, stateCopies: {}, modules: modulesV4,
  callSites: callSitesV4.map(({ alias, probe, ...site }) => site), rawCallSites: rawCallSitesV4,
  sharedGraph: 'cds-core', generatedRoot, publicAssetsRoot: stagedPublicAssets, linkedAreas: ['r3b-tasks'],
  referenceVersion: v4.referenceVersion, referenceSnapshot: v4.referenceSnapshot, source: v4.ionSource,
  vendor: { [v4.vendorFrame]: v4.reactAliases }, sourceContract: v4,
  gate: { flag: '__gb__2846116625', name: 'turnStatusRows', host: 'src/host-growthbook.mjs HOST_GROWTHBOOK, served to p by ca7b95e24 d (TurnStatusRowsProvider)' },
};

const declarationEntries = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const raw = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const hasFeatures = (label, text, features) => { try { assertFeatures(label, text, features); return true; } catch { return false; } };
async function uniqueDeclaration(src, label, probe, features) {
  if (!features.length) throw Error(`${src.name} ${label}: no features`);
  const hits = [];
  for (const entry of declarationEntries(src)) {
    if (probe && !raw(src, entry).includes(probe)) continue;
    if (hasFeatures(label, await featureText(src, entry), features)) hits.push(entry);
  }
  if (hits.length !== 1) throw Error(`${src.name} ${label}: ${hits.length} top-level declarations carry ${JSON.stringify(features)}, expected 1`);
  return [...src.top].find(([, e]) => e === hits[0])[0];
}
const reactAlias = (src, local, member) => {
  const e = src.top.get(local);
  return e?.kind === 'import' && e.file === v4.vendorFrame && v4.reactAliases[e.alias]?.[1] === member;
};
// A context root: its raw declaration is pinned, it is made by the chunk's import of React createContext, and the root
// that reads it carries the read (when given).
function locateContext(src, local, { text, readBy, read }, label) {
  const entry = src.top.get(local);
  if (entry?.kind !== 'var' || raw(src, entry) !== text) throw Error(`${src.name} ${label}: ${local} is not \`${text}\``);
  const callee = entry.node.init?.callee?.name;
  if (!callee || !reactAlias(src, callee, 'createContext')) throw Error(`${src.name} ${label}: ${local} is not made by React createContext`);
  if (read !== null) {
    const reader = src.top.get(readBy);
    if (!reader || reader.kind === 'import' || !raw(src, reader).includes(read)) throw Error(`${src.name} ${label}: ${readBy} does not read it (${read})`);
  }
  return sha256(raw(src, entry));
}
const aliasOf = (src, local) => [...src.exported].filter(([, l]) => l === local).map(([a]) => a);
function assertAlias(src, local, alias, label) {
  const aliases = aliasOf(src, local);
  if (alias === null ? aliases.length : !(src.exported.get(alias) === local)) throw Error(`${src.name} ${label}: ${local} is exported as [${aliases}], expected ${alias ?? 'none'}`);
}
export async function locateRootsV4() {
  const cache = new Map(), read = name => readSource(name, cache, v4.ionSource);
  const roots = {}, links = {}, callSites = {};
  for (const [chunk, locals] of Object.entries(rootsV4)) {
    const src = await read(chunk);
    for (const [local, r] of Object.entries(locals)) {
      let hash;
      if (r.context) hash = locateContext(src, local, r.context, r.name);
      else if (!r.features.length) {
        // c8677db5f D / O / E: data tables of a chunk byte-identical to 3.6556.2 (sourceSha256 pinned in the manifest).
        const entry = src.top.get(local);
        if (entry?.kind !== 'var') throw Error(`${chunk} ${r.name}: ${local} is not a declaration`);
        hash = sha256(raw(src, entry));
      } else {
        const hit = await uniqueDeclaration(src, r.name, r.probe, r.features);
        if (hit !== local) throw Error(`${chunk} ${r.name}: the declaration is ${hit}, expected ${local}`);
        hash = sha256(raw(src, src.top.get(local)));
      }
      assertAlias(src, local, r.alias, r.name);
      roots[r.name] = { chunk, local, alias: r.alias, sha256: hash };
    }
  }
  for (const [chunk, locals] of Object.entries(linkExportsV4)) {
    const src = await read(chunk);
    for (const local of locals) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') throw Error(`${chunk}: linkExports ${local} is not a declaration`);
      const pin = linkFeaturesV4[`${chunk}#${local}`];
      if (pin?.context) locateContext(src, local, pin.context, `linkExports ${local}`);
      if (pin?.features && (await uniqueDeclaration(src, `linkExports ${local}`, null, pin.features)) !== local) throw Error(`${chunk}: linkExports ${local} is not the declaration its features name`);
      links[`${chunk}#${local}`] = sha256(raw(src, entry));
    }
  }
  for (const site of callSitesV4) {
    const src = await read(site.source);
    const hit = await uniqueDeclaration(src, `call site ${site.binding}`, site.probe, site.features);
    if (hit !== site.binding) throw Error(`${site.source} call site: the declaration is ${hit}, expected ${site.binding}`);
    assertAlias(src, hit, site.alias, `call site ${site.binding}`);
    callSites[site.binding] = { chunk: site.source, alias: site.alias, sha256: sha256(raw(src, src.top.get(hit))) };
  }
  return { roots, linkExports: links, callSites };
}

const previousV3 = {
  referenceVersion: '3.6556.2', output: 'src/generated/working-line', generator: 'scripts/extract-working-line.mjs',
  roots: {
    WorkingLine: 'c96d752d0-CWv_7-n9.js#U6', thinkingElapsedBucket: '#M6', thinkingLabel: '#Ret', waitingLabel: '#P6', spinnerMode: '#iD',
    WORKING_LINE_TEST_ID: '#Get', useNeedsYourInputLabel: '#tD', useSpinnerWord: '#nD', spinnerWord: '#rD', useTurnClock: '#eD', activityMark: '#jT',
    TURN_STATUS_ROWS_FLAG: 'c26fb8b6b-B7Friu61.js#qe', TurnStatusRowsProvider: '#Je', TurnStatusRowsOverride: '#Ye', useTurnStatusRows: '#Xe',
    useElapsedSince: 'c93058e68-CMBi_EBm.js#d', useCountTween: 'c60636ac6-xYOM0GQX.js#Je', formatTokenCount: 'shared-8-Db1QN4mf.js#lX',
    THINKING_TOKEN_COUNT_FLAG: 'c93fb40ec-ueIsHfDz.js#t', apiRetryLabel: 'c4a9ee384-RLCjceOL.js#ym', apiRetryCountText: '#xm',
    useSpinnerFace: 'cc5c5e22c-CxzwX9Ie.js#c', SpinnerFaceContext: '#s', seatLeadingMark: 'c28b569d3-Cz90mWvn.js#a', MarkSeatContext: '#i',
    animations: 'cf2613ee5-Btwr9m9F.js#e (not in the 4.16336.0 closure: the Spark sprites are cds-core\'s)',
    SHEET_URLS: 'c8677db5f-CJKAHncR.js#k (same bytes)', ActivityMark: 'c05970c42-1Ws8_hz4.js#s', TurnStatus: 'c734f318c-SHcb2X2p.js#It', TurnStatusStep: '#Et',
    domMax: 'cb6c4b462-Dl6QEgSL.js#d', PresenceElement: '#f', HidingPresenceElement: '#p',
    Morph: 'cb6930dae-Dw_4c1QI.js#Ja', TurnMarkBrokerContext: '#$a', noSubscription: '#vo', neverHeld: '#yo', TurnActivityContext: '#jo', useTurnMarkHeld: '#So',
  },
  linkExports: {
    'vendor-motion C/Cl/fd/ol/pd/ul/En/F/G/K/M/N/Qr/S/Sn/Zc/hn/su/un/vn/x': 'C/Cl/fd/ol/pd/ul/Tn/F/G/K/M/N/Zr/S/xn/Zc/mn/su/ln/_n/x (same export aliases)',
    'morph Ba/Fa/Ia/La/Pa/Ra/za': 'Yl/Wl/Gl/Kl/Ul/ql/Jl', 'shared-2 R6/x6': 'm7/X5', 'clipboard CR': 'shared-1 J$', 'define-messages tn': 'tn', 'working-line EE': 'pP',
    'shared-frame gn/hn/ia/Mh/qF': 'not carried (cds-core owns shared-frame)', 'shared-0 ea': 'not carried (ambiguous: alias -> Zu, shape -> Uc)',
  },
  callSites: { W6: 'X5', Jet: 's_t', B6: 'W5', Ket: 'a_t' },
  removed: { cdsIconAliases: 'official 4.16336.0 removed it (region plan G3)', 'transcript-attrs shared-6 Sg': 'shared-38 qn', 'activity-sprites cc39db724': 'shared-33' },
};
function rootsJson(located) {
  return JSON.stringify({ referenceVersion: v4.referenceVersion, referenceSnapshot: v4.referenceSnapshot, ...located,
    isolatedGraph: { productionGraph: 'src/generated/working-line', productionSwitchNotBeforeBatch: 10,
      heldBy: ['chat-knowledge', 'chat-markdown', 'chat-messages', 'chat-projects', 'code-editor', 'code-transcript', 'cowork-home', 'session-rail-context', 'sessions-page', 'transcript-rows'] },
    previous: previousV3 }, null, 2) + '\n';
}

// Module state cds-core holds without a publicName that the engine's own test (module-level WeakMap / Map / Set, or a
// context made through an imported createContext) does not see, checked on the closure the engine selected: a context
// made through a chunk-local alias of createContext, and a module-level binding a selected declaration writes. Each is a
// D46 conflict: generation stops until cds-core names it.
async function heldStateV4(manifest) {
  const cache = new Map(), found = [];
  for (const m of manifest.modules) {
    if (!m.heldByViewTabs?.length) continue;
    const src = await readSource(m.source, cache, v4.ionSource), held = new Set(m.heldByViewTabs);
    const createContextAlias = name => { const e = src.top.get(name); const init = e?.kind === 'var' ? e.node.init : null;
      return init?.type === 'MemberExpression' && !init.computed && init.property.name === 'createContext'; };
    for (const name of held) {
      const entry = src.top.get(name), init = entry?.kind === 'var' ? entry.node.init : null;
      if (init?.type === 'CallExpression' && ((init.callee.type === 'Identifier' && createContextAlias(init.callee.name))
        || (init.callee.type === 'MemberExpression' && !init.callee.computed && init.callee.property.name === 'createContext')))
        found.push({ module: m.target, file: m.source, binding: name, kind: 'context (local createContext)' });
    }
    const written = new Map();
    for (const { name } of m.bindings) {
      const entry = src.top.get(name), text = (entry.kind === 'var' ? 'var ' : '') + raw(src, entry) + (entry.kind === 'var' ? ';' : '');
      babel.traverse(babel.babelParse(text, `${m.source}#${name}`, true), {
        'AssignmentExpression|UpdateExpression'(p) {
          const target = p.node.type === 'AssignmentExpression' ? p.node.left : p.node.argument;
          if (target.type === 'Identifier' && target.name !== name && held.has(target.name) && !p.scope.hasBinding(target.name)) written.set(target.name, name);
        },
      });
    }
    for (const [binding, by] of written) found.push({ module: m.target, file: m.source, binding, kind: `module-level binding written by ${by}` });
  }
  return found;
}
// The preload helper (preload-helper e/i/a/o/s, sliced again: cds-core holds it without a publicName) resolves a dependency
// as "/" + dep, which names the disk root under file://. Every call this graph emits passes no dependency, so that path is
// never taken; a call with dependencies stops generation (the host would need src/view-tabs-asset-url.mjs viteAssetUrl).
async function assertPreloadCalls(manifest) {
  const pre = manifest.modules.find(m => m.source === 'preload-helper-BBljBeZo.js');
  if (!pre) return;
  const out = path.join(root, WORKING_LINE_V4_OUTPUT);
  for (const m of manifest.modules) {
    const helper = m.imports?.find(i => i.from === `./${pre.target}` && i.name === 's');
    if (!helper) continue;
    const text = m.verbatim ? null : await fs.readFile(path.join(out, m.target), 'utf8').catch(() => null);
    if (text === null) continue;
    const name = helper.local.replace(/\$/g, '\\$');
    const calls = [...text.matchAll(new RegExp(`(?<![\\w$.])${name}\\(\\s*\\(\\)\\s*=>\\s*import\\("[^"]+"\\),\\s*(\\[[^\\]]*\\])`, 'g'))];
    const all = [...text.matchAll(new RegExp(`(?<![\\w$.])${name}\\(`, 'g'))].length;
    if (!calls.length || calls.length !== all || calls.some(([, deps]) => deps.replace(/\s/g, '') !== '[]'))
      throw Error(`${m.target}: a preload helper call passes dependencies (or is not a lazy import); "/" + dep fails under file://`);
  }
}
const quiet = async run => { const log = console.log; console.log = () => {}; try { return await run(); } finally { console.log = log; } };
export async function extractWorkingLineV4({ check = false, dryRun = false } = {}) {
  const located = await locateRootsV4();
  const cfg = { ...WORKING_LINE_V4, artifacts: () => ({ 'roots.json': rootsJson(located) }) };
  // The engine stops on the state it sees (D46); the closure it would emit is then checked for the state it does not.
  const planned = await quiet(() => runSlicer(cfg, { dryRun: true }));
  const unseen = await heldStateV4(planned);
  if (unseen.length) throw Error(`module state cds-core holds without a semantic name, unseen by the engine (add it to cds-core publicNames, D46):\n  ${unseen.map(s => `${s.module}: ${s.file}#${s.binding} (${s.kind})`).join('\n  ')}`);
  if (dryRun) return runSlicer(cfg, { dryRun: true });
  const manifest = await runSlicer(cfg, { check });
  await assertPreloadCalls(manifest);
  return manifest;
}
// D46 survey (writes nothing): every state conflict of this contract, the engine's and heldStateV4's, each with its
// declaration text and the chain of declarations that reaches it. [] while cds-core names them all.
export async function surveyWorkingLineV4() {
  let message = null;
  try { await quiet(() => runSlicer(WORKING_LINE_V4, { dryRun: true })); } catch (error) { message = String(error.message); }
  const engine = message?.startsWith('module state cds-core holds without a semantic name')
    ? message.split('\n').slice(1).map(line => /^\s*([^:]+): ([^#\s]+)#([\w$]+)$/.exec(line)).filter(Boolean)
      .map(([, module, file, binding]) => ({ module, file, binding, kind: 'module state the engine detects (WeakMap / Map / Set / imported createContext)' }))
    : [];
  if (message !== null && !engine.length) return { stateConflicts: null, error: message };
  const before = process.env.WORKING_LINE_EXPLORE;
  globalThis.__exploreEdges = [];
  process.env.WORKING_LINE_EXPLORE = '1';
  let explored;
  try { explored = await quiet(() => runSlicer(WORKING_LINE_V4, { dryRun: true })); } finally {
    if (before === undefined) delete process.env.WORKING_LINE_EXPLORE; else process.env.WORKING_LINE_EXPLORE = before;
  }
  const parents = new Map();
  for (const [from, to] of globalThis.__exploreEdges) if (from && !parents.has(to)) parents.set(to, from);
  delete globalThis.__exploreEdges;
  const cache = new Map(), stateConflicts = [];
  for (const { module, file, binding, kind } of [...engine, ...await heldStateV4(explored)]) {
    const src = await readSource(file, cache, v4.ionSource), entry = src.top.get(binding);
    const reachedBy = [];
    for (let at = parents.get(`${file}#${binding}`); at && reachedBy.length < 64; at = parents.get(at)) reachedBy.push(at);
    stateConflicts.push({ binding: `${file}#${binding}`, module, kind, text: (entry.kind === 'var' ? 'var ' : '') + raw(src, entry).slice(0, 400), reachedBy });
  }
  return { stateConflicts, error: message };
}
// CLI: write src/generated/working-line-v4; --check compares it byte for byte; --dry-run writes nothing; --survey prints
// the D46 state conflicts (nothing written).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--survey')) console.log(JSON.stringify(await surveyWorkingLineV4(), null, 2));
  else await extractWorkingLineV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
