// Working line (transcript-working-line): extract the 3.6556.2 Code transcript's loading line in its turnStatusRows
// branch, without executing any desktop runtime (decision D0: own generator, own output folder
// src/generated/working-line, own scripts/verify-gen-working-line.mjs). Migrated from 2.42304.0 in wave 2 of the
// 3.6556.2 migration (lane w2-tr-working; transcript research §2.1 T2/T3/T4, §3.2).
//
// User rulings: the host opens GrowthBook `__gb__2846116625` (turnStatusRows, c26fb8b6b `qe`), and the line follows the
// desktop with no host trade-off. The host's GrowthBook answers (src/source-working-line-adapters.jsx HOST_GROWTHBOOK)
// serve the flag on; the original GrowthBook provider Je turns it into the context Xe reads, and U6's raw read of the
// flag sees it on as well. Every other flag stays off (D29 / D31). 3.6556.2 dropped the clay mark's gate
// (`__gb__507049721`, shared-4 Ny, E14): the clay mark always leads, the classic and sprite marks are gone.
//
//   working-line.mjs   c96d752d0 U6 (memo): the loading line, React Compiler output (its memo cache helpers are the
//                      view-tabs compiler helpers, E3). `ce = Pv()` (c26fb8b6b Xe) picks the branch: on, qet
//                      (`data-testid="code-working-line"`, `data-turn-working`) → Ket → the CDS TurnStatus row `gf`
//                      (c734f318c It); new since 2.42304.0: the "No response" API retry labels (c4a9ee384 ym / xm) and
//                      the running tool's label (toolLabel / toolLabelSince / toolLabelEndedAt + 2 s). W6 (how the
//                      desktop feeds U6 from its session stores and the mark broker) is pinned, not emitted: the host
//                      feeds U6 from its own turn state (src/working-line-model.mjs).
//   turn-status-rows.mjs  c26fb8b6b qe / D / Je / Ye / Xe: the flag, its context, the GrowthBook provider (the host
//                      mounts it, src/source-working-line.jsx), the explicit provider and the reader.
//   turn-status.mjs    c734f318c It / Et: the CDS TurnStatus (data-cds="TurnStatus") and its Step.
//   morph.mjs          cb6930dae Ja: the keyed morph, the turn mark broker ($a) and its said-words store (the tool label).
//   api-errors.mjs     c4a9ee384 ym / xm: the API retry label and its retry count text ("No response from the API",
//                      "Trying once more, for up to {minutes} min").
//   …                  and the small originals those read, each chunk's slice in a module of its own.
//
// Legacy names (E34): transcript-rows imported 2.42304.0 minified names from this area's files (shared-frame.mjs Ji,
// morph.mjs Ca, …) until it moved to 3.6556.2 in wave 6; it now imports semantic names or `linkExports` (this version's
// own locals) only, never a legacy name (tests/transcript-rows.test.mjs guards it). Wave 7 removed this area's
// `legacyExports` and its `legacy['2.42304.0']` segment (scripts/working-line-legacy-2.42304.0.json): no importer is
// left on 2.42304.0, and the last host import of a legacy name (src/source-transcript-status.jsx `Ja`) now reads the
// semantic morph.mjs `useTurnMarkHeld`. Wave 10 (w10-cleanup-slicer-d1) removed the E34 machinery from runSlicer as well
// (the `legacyExports` / `legacyView` options, the frozen linked views, the 2.42304.0 defaults): both of its callers run
// on 3.6556.2 and pass the snapshot, source and vendor table explicitly.
//
// The machinery (runSlicer, shared with extract-transcript-rows.mjs, which runs it on 3.6556.2 too): every emitted
// binding is an original top-level declaration sliced from the official chunk; a module's bindings are the reachable
// closure of its roots (each declaration parsed on its own, its free variables are the chunk's top-level bindings it
// uses); an import is followed into the chunk it names, so the closure crosses chunks, and every chunk it may enter is
// listed in `modules`. An import resolves, in this order, to: a named host adapter in src/source-working-line-adapters.jsx
// (its original declaration must carry `features`), a verified React export of vendor-frame (official-3.6556.2.mjs
// assertVendorAlias, the compiler runtime included), a semantic public name of the shared view-tabs graph (D1/D46/E3),
// or the declaration in a listed chunk. A declaration view-tabs holds without a public name is sliced again here
// (recorded as `heldByViewTabs`) unless it is module state outside the justified `stateCopies`. `--dry-run` with
// WORKING_LINE_EXPLORE=1 surveys a closure without writing.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import * as v3 from './official-3.6556.2.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = v3.referenceVersion;
const referenceSnapshot = v3.referenceSnapshot;
const source = v3.ionSource;
const output = path.join(root, 'src/generated/working-line');
const adapterModule = '../../source-working-line-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React: the official-3.6556.2.mjs table (R3), each alias checked against its declarator.
const vendor = { [v3.vendorFrame]: v3.reactAliases };

// Host dependencies (checked first), keyed by chunk then export alias. `local` is the declaration the alias must still
// name; `features` must appear in that declaration's prettier form; `also` pins further declarations of the same chunk.
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (source-code-start-adapters.jsx useStartIntl /
  // StartMessage: the English message is looked up in zh-CN by t()).
  'vendor-intl-DYfox5Co.js': {
    p: { name: 'useIntl', local: 'q', features: ['return (Mt(e), e);'], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
    l: { name: 'FormattedMessage', local: 'Gt', features: ['(Wt, Ut)'], also: { Wt: ['textComponent:', '{ ignoreTag: f }', 'Array.isArray(p) ? p : [p]'] } },
  },
  // shared-25 fs (exported Yh): a GrowthBook flag (U6's raw turnStatusRows read `jt(Mpe)`, B6's ccr_thinking_token_count,
  // c26fb8b6b Je's provider). hs (exported rg): a GrowthBook flag behind an enable argument (shared-4 MS: the activity
  // sprites' `__gb__2346508742`). No GrowthBook here: the host's answers (HOST_GROWTHBOOK; D29 / D31).
  'shared-25-DOWZRSlq.js': {
    Yh: { name: 'useGrowthBookFlag', local: 'fs', features: ['.on;'] },
    rg: { name: 'useGrowthBookFlagWhen', local: 'hs', features: ['!t || !n?.growthbook', '.on;'] },
  },
  // shared-7 Rg (exported es): the chat text size preference (the classic row's spark size D6[se]). Host: the transcript's
  // text size, through WorkingLineHost.
  'shared-7-DBAgAi5H.js': { es: { name: 'useChatTextSize', local: 'Rg', features: ['return jg(zg);'], also: { zg: ['return e.chatTextSize;'] } } },
  // c06cf64bb: the desktop's per-session turn stores. bk (xn): the running turn's start time; U (ti): the session's
  // output token counter; K (Bn): the session's thinking / waiting state; a_ (ni): their change emitter. The host has no
  // desktop session id here (U6 gets sessionId null: tokens and the clock come from props), so these answer the empty
  // session: no start, 0 tokens, no state, nothing to subscribe to.
  'c06cf64bb-CdJdJuVd.js': {
    xn: { name: 'useTurnStartTime', local: 'bk', features: ['function bk(e) {'], also: { xk: ['return e?.pendingTurn?.startTime ?? null;'] } },
    ti: { name: 'sessionTokenCounter', local: 'U', features: ['addThinkingText(e, t) {', 'setTaskTokens(e, t, n) {'] },
    Bn: { name: 'sessionActivityStore', local: 'K', features: ['NS("requesting", "sending")', 'awaitsInit(e) {', 'return t === "sending" || t === "starting";'] },
    ni: { name: 'sessionActivityEvents', local: 'a_', features: ['subscribe(e) {', 'notify(e) {'] },
  },
};

// Host stand-ins for declarations the closure reaches inside a listed chunk (keyed chunk#local). None.
const localAdapters = {};

// Module state view-tabs also holds (without a public name) that this area copies anyway, each with why a second copy
// cannot split anything the host relies on. Any other state copy stops generation (see isModuleState).
const stateCopies = {
  // CDS router context (CdsRoot provides `router`): TurnStatus links (ia) read it. No host CdsRoot passes a router, so the
  // view-tabs copy and this one both read undefined.
  'shared-frame-6jtSkIit.js#hi': 'router context; no host router (both copies undefined)',
  // The reduced-motion listener set (kh / Dh over matchMedia and the html reduced-motion attribute, Oh): a second copy
  // subscribes to the same global sources and answers the same value.
  'shared-frame-6jtSkIit.js#Th': 'reduced-motion listeners over global sources (same answer)',
  // A per-document Range cache (Af, text overflow measurement).
  'shared-frame-6jtSkIit.js#kf': 'per-document Range cache',
  // The toolbar roving-focus hook E_ (Arrow / Home / End keys) keeps its elements in these: every element this copy
  // registers (Ic.add, Lc.set) it also reads, through the same copy (shared-2 R6, the message action bar the legacy TX
  // name serves); $g is set by no declaration in this closure, so it answers its default.
  'shared-frame-6jtSkIit.js#Lc': 'toolbar roving-focus state of elements this copy registers',
  'shared-frame-6jtSkIit.js#Ic': 'toolbar roving-focus state of elements this copy registers',
  'shared-frame-6jtSkIit.js#$g': 'toolbar roving-focus overrides, never set in this closure (default)',
};

// One generated module per chunk the closure may enter. `exports` maps original local binding -> exported name (the
// roots; `features` pins each to stable strings of its original prettier-formatted text, R2/E5). Bindings other
// generated modules import from a chunk are exported under their original names as well. `linkExports` lists the
// 3.6556.2 locals the transcript rows area (extract-transcript-rows.mjs) imports from a module without a semantic name:
// each is exported under its own 3.6556.2 name and recorded in the manifest, so that area never depends on an E34
// legacy name and the legacy shims can go in wave 7 without touching it (w6-transcript-rows-cont review fix).
const modules = [
  { target: 'turn-status-rows.mjs', source: 'c26fb8b6b-B7Friu61.js',
    exports: { qe: 'TURN_STATUS_ROWS_FLAG', Je: 'TurnStatusRowsProvider', Ye: 'TurnStatusRowsOverride', Xe: 'useTurnStatusRows' },
    features: { qe: ['qe = "__gb__2846116625"'], Je: ['value: a, children: t'], Ye: ['{ value: t, children: r } = e,', 'value: t, children: r'],
      Xe: ['?? !1;'] } },
  { target: 'elapsed-clock.mjs', source: 'c93058e68-CMBi_EBm.js', exports: { d: 'useElapsedSince' }, features: { d: ['e ?? null'] } },
  { target: 'media-query.mjs', source: 'shared-25-DOWZRSlq.js' },
  { target: 'shared-0.mjs', source: 'shared-0-DDOOdL6P.js', linkExports: ['ea'] },
  { target: 'count-tween.mjs', source: 'c60636ac6-xYOM0GQX.js', exports: { Je: 'useCountTween' },
    features: { Je: ['requestAnimationFrame'] } },
  { target: 'token-format.mjs', source: 'shared-8-Db1QN4mf.js', exports: { lX: 'formatTokenCount' } },
  { target: 'flag-names.mjs', source: 'c93fb40ec-ueIsHfDz.js', exports: { t: 'THINKING_TOKEN_COUNT_FLAG' }, features: { t: ['t = "ccr_thinking_token_count"'] } },
  { target: 'transcript-attrs.mjs', source: 'shared-6-sd9jbJqs.js' },
  { target: 'value-changed.mjs', source: 'shared-52-uHFNjl7C.js' },
  // vendor-intl tn / nn (defineMessages / defineMessage: identity), read by c4a9ee384's message tables.
  { target: 'define-messages.mjs', source: 'vendor-intl-DYfox5Co.js', linkExports: ['tn'] },
  // c4a9ee384 ym / xm (U6's apiRetry label `${voe(p, oe, "short", m)} · ${coe(p, oe)}`): the short text of the API
  // error type, or "No response from the API" / "The API didn’t respond to {host}" for a no-response retry, and the
  // retry count, or "Trying once more, for up to {minutes} min" for a no-response retry with one try left.
  { target: 'api-errors.mjs', source: 'c4a9ee384-RLCjceOL.js', exports: { ym: 'apiRetryLabel', xm: 'apiRetryCountText' },
    features: { ym: ['e.noResponse'], xm: ['e.noResponse && e.maxRetries === 1'] } },
  { target: 'spinner-face.mjs', source: 'cc5c5e22c-CxzwX9Ie.js', exports: { c: 'useSpinnerFace', s: 'SpinnerFaceContext' },
    features: { c: ['word:', 'message:', 'mode:'] } },
  { target: 'spinner-native.mjs', source: 'c1e715a58-5bxKK3Qu.js' },
  { target: 'mark-seat.mjs', source: 'c28b569d3-Cz90mWvn.js', exports: { a: 'seatLeadingMark', i: 'MarkSeatContext' },
    features: { a: ['leading:', 'seated:'] } },
  { target: 'clipboard.mjs', source: 'shared-1-BJhqMmkf.js', linkExports: ['CR'] },
  { target: 'shared-156.mjs', source: 'shared-156-BLTosN8U.js' },
  { target: 'shared-2.mjs', source: 'shared-2-TF8v67kg.js', linkExports: ['R6'] },
  { target: 'shared-4.mjs', source: 'shared-4-DUB1Oi0O.js' },
  { target: 'shared-28.mjs', source: 'shared-28-DNYlf4wu.js' },
  // w12 (D1): aa left linkExports once view-tabs published it as cdsNodeOwnerWindow (w12-preview); transcript rows import
  // it from view-tabs by that name.
  { target: 'shared-frame.mjs', source: 'shared-frame-6jtSkIit.js', linkExports: ['gn', 'hn', 'ia', 'Mh', 'qF'] },
  { target: 'card-classes.mjs', source: 'c8ba53634-Qe339QHm.js' },
  { target: 'turn-steps.mjs', source: 'c227f4d5e-B-FYKrwT.js' },
  // The Spark's sprite strips (shared-frame lazily loads them as `cds_spark_sprites`), emitted under the chunk's own
  // name so the original `import("./cf2613ee5-Btwr9m9F.js")` resolves unchanged.
  { target: 'cf2613ee5-Btwr9m9F.js', source: 'cf2613ee5-Btwr9m9F.js', exports: { e: 'animations' },
    features: { e: ['thinking: {', 'frameCount: 7,'] } },
  // The clay activity mark (jT → c05970c42 s, no gate since 3.6556.2) and its sprite players (cc39db724), with the
  // lazily loaded sheets emitted under their own chunk name so the original `import("./…")` resolves unchanged:
  // c8677db5f (the activity sheets: inline data URLs plus six /assets/v1/*.webp sheets, see publicAssets).
  { target: 'c8677db5f-CJKAHncR.js', source: 'c8677db5f-CJKAHncR.js', exports: { D: 'ALIASES', O: 'SHEETS', E: 'SHEET_FRAME', k: 'SHEET_URLS' },
    features: { k: ['"think.loop": x,'] } },
  { target: 'activity-sprites.mjs', source: 'cc39db724-BVvHv4hP.js' },
  { target: 'activity-mark.mjs', source: 'c05970c42-1Ws8_hz4.js', exports: { s: 'ActivityMark' },
    features: { s: ['mark:', 'standalone:', '"classic"'] } },
  { target: 'turn-status.mjs', source: 'c734f318c-SHcb2X2p.js', internal: true, exports: { It: 'TurnStatus', Et: 'TurnStatusStep' },
    features: { It: ['Object.assign(', 'Step:', 'Phrases:'], Et: ['"data-cds": "TurnStatusStep"'] } },
  // framer-motion as the desktop ships it (vendor-motion): the slice morph.mjs reaches, with its top-level initializers.
  // D27: no dependency is added; this is the official chunk's own code.
  // w10-ccres-rail-readout (D1): the session rail context area's chart tooltip kit (c0ce8f953 useSpring, ca74e9c4f
  // useMotionValue, cddbfc1b6) imports the motion values, frame loop and spring generator from here (one framer-motion).
  { target: 'vendor-motion.mjs', source: 'vendor-motion-DlXQpU4V.js',
    linkExports: ['C', 'fd', 'pd', 'ul', 'En', 'F', 'G', 'K', 'M', 'N', 'Qr', 'S', 'Sn', 'Zc', 'hn', 'un', 'vn', 'x'] },
  // cb6930dae: the keyed morph (Ja), the turn mark broker's context ($a: the tool rows hold the mark and say their
  // words there — U6's toolLabel in the desktop) and the turn activity context (jo). The transcript rows area imports
  // the contexts from here, so each exists once.
  { target: 'morph.mjs', source: 'cb6930dae-Dw_4c1QI.js', internal: true,
    // So: whether a running tool row holds the turn's mark (src/source-transcript-status.jsx; 2.42304.0 Ja).
    exports: { Ja: 'Morph', $a: 'TurnMarkBrokerContext', vo: 'noSubscription', yo: 'neverHeld', jo: 'TurnActivityContext', So: 'useTurnMarkHeld' },
    linkExports: ['Ba', 'Fa', 'Ia', 'La', 'Pa', 'Ra', 'za'],
    features: { Ja: ['morphKey:', 'mode:', 'openWidth:', '"popLayout"'], vo: ['return () => void 0;'], yo: ['return !1;'], So: ['e?.held'] } },
  { target: 'working-line.mjs', source: 'c96d752d0-CWv_7-n9.js', internal: true,
    exports: { U6: 'WorkingLine', M6: 'thinkingElapsedBucket', Ret: 'thinkingLabel', P6: 'waitingLabel', iD: 'spinnerMode', Get: 'WORKING_LINE_TEST_ID',
      // Shared with the transcript rows area (it imports them under these semantic names).
      tD: 'useNeedsYourInputLabel', nD: 'useSpinnerWord', rD: 'spinnerWord', eD: 'useTurnClock', jT: 'activityMark' },
    linkExports: ['EE'],
    features: {
      U6: ['toolLabel:', 'toolLabelUnspoken:', 'toolLabelSince:', 'toolLabelEndedAt:', 'apiRetrySshHost:', '+ 2e3', '"short"',
        'defaultMessage: "Thinking", id: "AHQWDTo4+e"', '"{count, plural, one {# running task} other {# running tasks}}",',
        'defaultMessage: "Stopping\\u2026",', 'defaultMessage: "Compacting session\\u2026",', 'defaultMessage: "Working\\u2026"', '"tokens"'],
      M6: ['e >= 2 ? 2 : 0'], Ret: ['defaultMessage: "Almost done thinking\\u2026",', 'defaultMessage: "Still thinking\\u2026",'],
      P6: ['defaultMessage: "Waiting for Claude\\u2026",', 'defaultMessage: "Running tools\\u2026",', 'case "connecting":'],
      iD: ['? "thinking"', '"tool-use"', '"responding"', '"requesting"'], Get: ['Get = "code-working-line"'],
      tD: ['defaultMessage: "Needs your input"'], rD: ['(\\u2026|\\.\\.\\.)$'], eD: ['>= 2 ?'], jT: ['mark: "clay"'],
    } },
];

// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration).
const callSites = [
  { source: 'c96d752d0-CWv_7-n9.js', binding: 'W6', role: 'How the desktop feeds U6 from its session stores and the mark broker (host: src/working-line-model.mjs workingLineProps)',
    features: ['toolLabel: p,', 'toolLabelUnspoken: m,', 'toolLabelSince: h,', 'toolLabelEndedAt: g,', 'apiRetrySshHost: F,', 'N?.kind === "ssh"',
      'hasTokens: Z,', 'turnStartTime: T,', 'finishedTaskCount: ie,', '"loading_indicator"'] },
  { source: 'c96d752d0-CWv_7-n9.js', binding: 'Jet', role: 'toolLabelSince: the said tool call\'s start (startedAt, else looked up), pushed past the waits',
    features: ['t.startedAt === void 0', 't.startedAt ?? o'] },
  { source: 'c96d752d0-CWv_7-n9.js', binding: 'B6', role: 'sessionId null: the tokens come from the tokens prop (R6 with the flag, else the z6 count tween)',
    features: ['t === null'] },
  { source: 'c96d752d0-CWv_7-n9.js', binding: 'Ket', role: 'sessionId and clockStartTime null: the clock is the elapsedSeconds prop when it reaches 2; clockNotBefore hides it',
    features: ['clockStartTime: c,', 'clockNotBefore: l,', 'u >= 2 ? u : void 0', '* 1e3 < l'] },
];
// Pinned on the minified bytes (each must occur exactly once).
const rawCallSites = [
  { source: 'c96d752d0-CWv_7-n9.js', role: 'The next renderer feed forces turnStatusRows on through Ye (Nv), the form the host follows; U6 reads Xe (Pv)',
    features: ['C as Nv', 'T as Pv'] },
  { source: 'cf74bc599-CRYqipWN.js', role: 'The transcript turns the rows on when the gate or the renderer chrome says so (Gn = Xe() || Wn) and provides it through Ye ($m)',
    features: ['Gn=eh()||Wn', 's($m,{value:Gn,'] },
  { source: 'c9543da06-BaufrsQl.js', role: 'Je (na): the GrowthBook provider the desktop mounts at its root', features: ['w as na'] },
];

async function readSourceIn(name, cache, dir = source) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(dir, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') for (const d of node.declarations) {
      // A destructuring declarator (vendor-motion `var { schedule: M, cancel: N, … } = Pe(…)`) binds each name to the
      // one declarator, emitted once.
      const entry = { kind: 'var', node: d };
      for (const id of patternNames(d.id)) top.set(id, entry);
    }
    else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
  }
  // Top-level expression statements (vendor-motion: `sn.applyToOptions = …`, `or.translateX = or.x, …`): carried as
  // original initializers when the closure holds the object they assign to (see extractWorkingLine).
  // A top-level for…of or if (c5d464fa3 registers its lazily loaded code themes in one, c64baa838 defines the
  // diffs-container element in one) is carried only by carryStatements.
  const statements = ast.program.body.filter(node => ['ExpressionStatement', 'ForOfStatement', 'IfStatement'].includes(node.type)).map(node => {
    const assigned = new Set();
    const visit = e => { if (!e) return; if (e.type === 'SequenceExpression') e.expressions.forEach(visit);
      else if (e.type === 'AssignmentExpression' && e.left.type === 'MemberExpression' && e.left.object.type === 'Identifier') assigned.add(e.left.object.name); };
    if (node.type !== 'ExpressionStatement') return { node, assigned: [] };
    visit(node.expression);
    // A guarded global initializer (vendor-zod: `(Le = globalThis).__zod_globalConfig ?? (Le.__zod_globalConfig = {})`):
    // a logical expression whose operands assign to a top-level binding.
    const nested = e => { if (!e || typeof e !== 'object') return;
      if (e.type === 'AssignmentExpression') { if (e.left.type === 'Identifier') assigned.add(e.left.name); else if (e.left.type === 'MemberExpression' && e.left.object.type === 'Identifier') assigned.add(e.left.object.name); else if (e.left.type === 'MemberExpression' && e.left.object.type === 'AssignmentExpression') nested(e.left.object); nested(e.right); }
      else if (e.type === 'LogicalExpression') { nested(e.left); nested(e.right); }
      else if (e.type === 'MemberExpression') nested(e.object); };
    if (node.expression.type === 'LogicalExpression') nested(node.expression);
    return { node, assigned: [...assigned] };
  });
  const record = { name, bytes, code, ast, exported, top, statements, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
function patternNames(p) {
  if (!p) return [];
  if (p.type === 'Identifier') return [p.name];
  if (p.type === 'ObjectPattern') return p.properties.flatMap(q => patternNames(q.type === 'RestElement' ? q.argument : q.value));
  if (p.type === 'ArrayPattern') return p.elements.flatMap(patternNames);
  if (p.type === 'RestElement') return patternNames(p.argument);
  if (p.type === 'AssignmentPattern') return patternNames(p.left);
  return [];
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
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
// Features are matched on the prettier form with all whitespace and trailing commas dropped, so a line break prettier
// puts in a long call does not matter.
const normalised = text => text.replace(/\s+/g, '').split(',)').join(')').split(',]').join(']').split(',}').join('}').replace(/,$/, '');
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}${process.env.WORKING_LINE_EXPLAIN ? `\n--- text ---\n${text}` : ''}`);
}
function vendorImportIn(file, alias, src, table = vendor, version = referenceVersion) {
  const target = table[file]?.[alias];
  if (!target) return null;
  // 3.6556.2 (R3): official-3.6556.2.mjs checks the alias' declarator, including the compiler runtime's shape. The
  // pre-3.6556.2 regex branch went with the last non-3.6556.2 caller (w11-sweep-rest, w10-cleanup-slicer-d1 review).
  if (version !== v3.referenceVersion) throw Error(`vendor-frame aliases are checked for ${v3.referenceVersion} only, not ${version}`);
  v3.assertVendorAlias(src.code, alias, target);
  return target;
}
async function viewTabsGraph(version = referenceVersion) {
  const manifest = await viewTabsManifestFor(version);
  if (manifest.referenceVersion !== version) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${version}`);
  const published = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  const held = new Set();
  for (const m of manifest.modules) for (const b of m.bindings) held.add(`${m.source}#${typeof b === 'string' ? b : b.name}`);
  return { published, held };
}
// Module state a second copy would split: a context, or a module-level WeakMap / Map / Set.
async function isModuleState(src, entry, table = vendor) {
  if (entry.kind !== 'var') return false;
  const init = entry.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return true;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.top.get(init.callee.name);
    if (callee?.kind === 'import' && table[callee.file]?.[callee.alias]?.[1] === 'createContext') return true;
  }
  return false;
}
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'NaN', 'undefined', 'Infinity', 'isFinite', 'parseInt', 'parseFloat', 'encodeURIComponent',
  'globalThis', 'crypto', 'performance', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'window', 'document', 'console', 'navigator', 'queueMicrotask', 'getComputedStyle', 'Uint8Array', 'BigInt', 'CSS', 'Element', 'HTMLElement', 'Node',
  'reportError', 'URL', 'MutationObserver', 'AbortController', 'ClipboardItem', 'Blob', 'NodeFilter', 'isNaN', 'SVGElement', 'EventTarget', 'PointerEvent', 'ResizeObserver', 'Proxy',
  'HTMLButtonElement', 'IntersectionObserver', 'arguments', 'Image', 'location', 'MessageChannel', 'WeakRef', 'decodeURIComponent', 'decodeURI', 'encodeURI', 'TextDecoder', 'TextEncoder', 'atob', 'btoa',
  'structuredClone', 'Reflect', 'Int32Array', 'Uint16Array', 'Uint32Array', 'Float64Array', 'ArrayBuffer', 'DataView', 'SyntaxError', 'RangeError',
  'URLSearchParams', 'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'HTMLInputElement', 'HTMLTextAreaElement', 'Text', 'DOMParser',
  'escape', 'unescape', 'AggregateError', 'FinalizationRegistry', 'BigInt64Array', 'BigUint64Array', 'Int8Array', 'Int16Array', 'Float32Array', 'Uint8ClampedArray',
  // vendor-frame's reportError fallback reads it behind `typeof process == "object"`.
  'process', 'ErrorEvent', 'EvalError', 'ReferenceError', 'URIError', 'sessionStorage', 'localStorage', 'matchMedia', 'self', 'StorageEvent', 'Function', 'CSSStyleSheet', 'customElements', 'HTMLStyleElement', 'WebAssembly', 'SharedArrayBuffer', 'Buffer', 'Response', 'WorkerGlobalScope',
  // w6-transcript-rows-cont (3.6556.2 tool rows): the o11y idle queue reads the page visibility entries.
  'PerformanceObserver', 'fetch', 'Request', 'HTMLScriptElement',
  // w13-close-chat-renderer (chat-renderer, c76f98194 selection helpers): the DOM Range constants (Range.START_TO_START).
  'Range']);

// Generated areas this one imports from instead of slicing again: file#local -> { from, name } for every binding a
// linked area emits and exports; a binding it slices without exporting is `null` (stops generation: export it there,
// or list it in `linkedCopies` when it is a pure binding). An entry is an area name (every module, the area's manifest
// on this version), or { area, modules } to link only those modules of an area another generator owns (its other
// modules may hold copies this area also slices; only the listed ones are imported, never resliced; each listed module
// must be on this version, by its own `referenceVersion` when it carries one: code-current records it per module).
export function workingLineManifestFor(manifest, version, label = 'working-line') {
  if (manifest.referenceVersion === version) return manifest;
  throw Error(`${label} is ${manifest.referenceVersion}, expected ${version}`);
}
// A manifest module without an export table (code-current's helper modules list `bindings` only): the names its file
// exports, read from the file's own `export { local as name }` (rolldown parseAst; a local of the original is kept
// under its original name, such as file-output-paths' `WV as outputBasename`).
let parseAst;
function exportedLocals(code, label) {
  parseAst ??= createRequire(path.join(root, 'package.json'))('rolldown/parseAst').parseAst;
  const names = new Map();
  for (const node of parseAst(code, { lang: 'js' }, label).body) {
    if (node.type !== 'ExportNamedDeclaration' || node.source) continue;
    for (const s of node.specifiers ?? []) names.set(s.local.name ?? s.local.value, s.exported.name ?? s.exported.value);
    for (const d of node.declaration?.declarations ?? []) if (d.id.type === 'Identifier') names.set(d.id.name, d.id.name);
    if (node.declaration?.id) names.set(node.declaration.id.name, node.declaration.id.name);
  }
  return names;
}
async function linkedBindings(areas, version = referenceVersion) {
  const map = new Map();
  // A binding two linked areas answer for: an exported one is never replaced by a `null` (sliced, not exported) entry; a
  // later exported entry wins (the area listed last is the one that slices it).
  const put = (key, value) => { if (value.name === null && map.get(key)?.name) return; map.set(key, value); };
  for (const linkedArea of areas) {
    const area = typeof linkedArea === 'string' ? linkedArea : linkedArea.area;
    const only = typeof linkedArea === 'string' ? null : new Set(linkedArea.modules);
    const dir = path.join(root, 'src/generated', area);
    const current = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
    const manifest = only ? current : workingLineManifestFor(current, version, area);
    for (const target of only ?? []) if (!manifest.modules.some(m => m.target === target)) throw Error(`linked module ${area}/${target} is not in its manifest`);
    for (const m of manifest.modules) {
      if (only && !only.has(m.target)) continue;
      const moduleVersion = m.referenceVersion ?? manifest.referenceVersion;
      if (moduleVersion !== version) throw Error(`linked module ${area}/${m.target} is ${moduleVersion}, expected ${version}`);
      const bytes = await fs.readFile(path.join(dir, m.target));
      if (sha(bytes) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
      // The manifest's source may be a path into the snapshot (code-current): the chunk is its file name.
      const chunk = path.basename(m.source);
      const tabled = m.exports !== undefined || m.linkExports !== undefined || m.sharedExports !== undefined;
      const parsed = tabled ? null : exportedLocals(bytes.toString(), `${area}/${m.target}`);
      // A binding is imported under its semantic name, else under its own name when the area exports it so (linkExports /
      // sharedExports), else (no export table) under the name the file exports it as. Never under an E34 legacy name.
      for (const b of m.bindings ?? []) {
        const local = typeof b === 'string' ? b : b.name;
        const name = tabled
          ? m.exports?.[local] ?? (m.linkExports?.includes(local) || m.sharedExports?.includes(local) ? local : null)
          : parsed.get(local) ?? null;
        put(`${chunk}#${local}`, name === null ? { area, target: m.target, name: null } : { from: `../${area}/${m.target}`, name, area, target: m.target });
      }
      // A re-export (session-rail saved-output.mjs imports shared-130 WV from code-current and exports it as
      // pathFileName): the module serves the binding it imports under its export name, without holding a copy.
      for (const imp of m.imports ?? []) {
        const exported = m.exports?.[imp.local];
        const original = typeof imp.original === 'string' ? /^(.+\.js)[:#]([\w$]+)$/.exec(imp.original) : null;
        if (!exported || !original || (m.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === imp.local)) continue;
        put(`${path.basename(original[1])}#${original[2]}`, { from: `../${area}/${m.target}`, name: exported, area, target: m.target });
      }
    }
  }
  return map;
}

export async function runSlicer(cfg, { check = false, dryRun = false } = {}) {
  const { name: areaName, generator, output, adapterModule, adapterFile, adapters, localAdapters = {}, stateCopies = {}, modules,
    callSites = [], rawCallSites = [], gate = null, linkedAreas = [], lazyVerbatim = null,
    referenceVersion, referenceSnapshot, source, vendor, linkedCopies = {} } = cfg;
  // No default snapshot (wave 10): each caller names the version it slices, its snapshot, source folder and vendor table.
  for (const [key, value] of Object.entries({ referenceVersion, referenceSnapshot, source, vendor }))
    if (!value) throw Error(`${areaName ?? 'runSlicer'}: ${key} is required`);
  for (const key of ['legacyExports', 'legacyView']) if (Object.hasOwn(cfg, key)) throw Error(`${areaName ?? 'runSlicer'}: ${key} was removed in wave 10 (E34 legacy names)`);
  const readSource = (name, c) => readSourceIn(name, c, source);
  const vendorImport = (file, alias, src) => vendorImportIn(file, alias, src, vendor, referenceVersion);
  const linked = await linkedBindings(linkedAreas, referenceVersion);
  const unexportedLinks = [];
  const linkedImport = key => {
    const link = linked.get(key);
    if (!link) return null;
    // linkedCopies (chunk#local -> why): a pure binding a linked area slices without exporting, sliced again here.
    if (link.name === null && Object.hasOwn(linkedCopies, key)) return null;
    if (link.name === null) { unexportedLinks.push(`${key} (${link.area}/${link.target})`); return null; }
    return link;
  };
  // --dry-run with WORKING_LINE_EXPLORE=1: unlisted chunks become provisional modules and unbound globals pass, to
  // survey a closure before listing its chunks. Nothing is written in a dry run.
  const explore = dryRun && !!process.env.WORKING_LINE_EXPLORE;
  const cache = new Map();
  const { published, held } = await viewTabsGraph(referenceVersion);
  const specs = new Map(modules.map(spec => [spec.source, { ...spec, exports: spec.exports ?? {} }]));
  const state = new Map([...specs.values()].map(spec => [spec.source, { spec, selected: new Map(), imports: new Map(), seen: new Set(), shared: new Set(), heldCopies: [] }]));
  const stateConflicts = [];
  // Verbatim chunks (spec.verbatim, or found through lazyVerbatim): data chunks the desktop loads lazily (Shiki's
  // languages, themes and its inlined oniguruma wasm), copied byte for byte under their own file names (checked by
  // sha256), so every original `import("./<chunk>.js")` and their own relative imports resolve unchanged. A verbatim
  // chunk may import only other verbatim chunks. lazyVerbatim: { importers: [chunk, …], count }: a dynamic import inside
  // a selected declaration of one of these importers that names an unlisted chunk adds it (with its static and dynamic
  // imports, to a fixpoint); count pins how many are found.
  const verbatimFound = [];
  const relativeImports = (code, name) => {
    const specs = new Set();
    babel.traverse(babel.babelParse(code, name, true), {
      ImportDeclaration(p) { specs.add(p.node.source.value); }, ExportNamedDeclaration(p) { if (p.node.source) specs.add(p.node.source.value); },
      ExportAllDeclaration(p) { specs.add(p.node.source.value); },
      CallExpression(p) { if (p.node.callee.type === "Import") { const a = p.node.arguments[0]; if (a?.type !== "StringLiteral") throw Error(`verbatim ${name}: computed dynamic import`); specs.add(a.value); } },
      ImportExpression(p) { const a = p.node.source; if (a?.type !== "StringLiteral") throw Error(`verbatim ${name}: computed dynamic import`); specs.add(a.value); },
    });
    for (const spec of specs) if (!/^\.\/[\w.-]+\.js$/.test(spec)) throw Error(`verbatim ${name} imports ${spec}, not a sibling chunk`);
    return [...specs].map(spec => spec.slice(2));
  };
  const addVerbatim = async (name, via) => {
    const known = state.get(name);
    if (known) { if (!known.spec.verbatim) throw Error(`${via}: ${name} is a sliced module, not a verbatim chunk`); return; }
    const bytes = await fs.readFile(path.join(source, name));
    const code = bytes.toString();
    state.set(name, { spec: { target: name, source: name, verbatim: true, exports: {} }, selected: new Map(), imports: new Map(), seen: new Set(), shared: new Set(), heldCopies: [], bytes, deps: relativeImports(code, name) });
    verbatimFound.push(name);
    for (const dep of state.get(name).deps) await addVerbatim(dep, name);
  };
  for (const st of [...state.values()].filter(st => st.spec.verbatim)) {
    st.bytes = await fs.readFile(path.join(source, st.spec.source)); st.deps = relativeImports(st.bytes.toString(), st.spec.source);
    for (const dep of st.deps) await addVerbatim(dep, st.spec.source);
  }
  // --dry-run exploration records who reaches what (globalThis.__exploreEdges: [from, to]), to find service boundaries.
  const trail = [];
  const add = async (file, name) => {
    if (explore) (globalThis.__exploreEdges ??= []).push([trail.at(-1) ?? null, `${file}#${name}`]);
    trail.push(`${file}#${name}`);
    try { return await addOne(file, name); } finally { trail.pop(); }
  };
  const addOne = async (file, name) => {
    const st = state.get(file);
    if (!st) throw Error(`the closure enters ${file}#${name}, which is not a listed chunk`);
    if (st.seen.has(name)) return;
    st.seen.add(name);
    const src = await readSource(file, cache);
    const entry = src.top.get(name);
    if (!entry) throw Error(`${st.spec.target}: unbound ${name}`);
    const target = st.spec.target;
    if (entry.kind === 'import') {
      const { file: depFile, alias } = entry, via = `${depFile}:${alias}`;
      const dep = await readSource(depFile, cache);
      const local = dep.exported.get(alias);
      if (!local) throw Error(`${target}: ${via} is not exported`);
      const adapter = adapters[depFile]?.[alias];
      if (adapter) {
        if (adapter.local !== local) throw Error(`${target}: adapter alias ${via} is ${local}, expected ${adapter.local}`);
        const original = dep.top.get(local);
        if (!original || original.kind === 'import') throw Error(`${target}: adapter ${via} (${local}) is not a declaration`);
        assertFeatures(`${target}: adapter ${via} (${local})`, await featureText(dep, original), adapter.features);
        for (const [other, features] of Object.entries(adapter.also ?? {})) {
          const also = dep.top.get(other);
          if (!also || also.kind === 'import') throw Error(`${target}: adapter ${via} pins ${other}, which is not a declaration of ${depFile}`);
          assertFeatures(`${target}: adapter ${via} (${other})`, await featureText(dep, also), features);
        }
        st.imports.set(name, { from: adapterModule, name: adapter.name, via, kind: 'adapter', original: local });
        return;
      }
      const standIn = localAdapters[`${depFile}#${local}`];
      if (standIn) {
        assertFeatures(`${target}: local adapter ${depFile}#${local}`, await featureText(dep, dep.top.get(local)), standIn.features);
        st.imports.set(name, { from: adapterModule, name: standIn.name, via, kind: 'adapter', original: local });
        return;
      }
      const react = vendorImport(depFile, alias, dep);
      if (react) { st.imports.set(name, { from: react[0], name: react[1], via, kind: 'react' }); return; }
      const shared = published.get(`${depFile}#${local}`);
      if (shared) { st.imports.set(name, { from: `../view-tabs/${depFile}`, name: shared.name, via, kind: 'view-tabs', original: local }); return; }
      const link = linkedImport(`${depFile}#${local}`);
      if (link) { st.imports.set(name, { from: link.from, name: link.name, via, kind: 'linked', original: local }); return; }
      if (state.get(depFile)?.spec.verbatim) { st.imports.set(name, { from: `./${depFile}`, name: alias, via, kind: 'verbatim' }); return; }
      if (explore && !state.has(depFile)) state.set(depFile, { spec: { target: `auto:${depFile}`, source: depFile, exports: {} }, selected: new Map(), imports: new Map(), seen: new Set(), shared: new Set(), heldCopies: [] });
      const owner = state.get(depFile);
      if (!owner) throw Error(`${target}: unresolved import ${via} (${local}); ${depFile} is not a listed chunk`);
      const dentry = dep.top.get(local);
      if (dentry?.kind === 'import') throw Error(`${target}: ${via} (${local}) is a re-export; follow it in ${depFile}'s own import`);
      await add(depFile, local);
      st.imports.set(name, { from: `./${owner.spec.target}`, name: null, chunk: depFile, local, via, kind: 'generated' });
      return;
    }
    const stand = localAdapters[`${file}#${name}`];
    if (stand) {
      assertFeatures(`${target}: local adapter ${file}#${name}`, await featureText(src, entry), stand.features);
      st.imports.set(name, { from: adapterModule, name: stand.name, via: `${file}#${name}`, kind: 'adapter', original: name });
      return;
    }
    const shared = published.get(`${file}#${name}`);
    if (shared && !Object.hasOwn(st.spec.exports, name)) {
      st.imports.set(name, { from: `../view-tabs/${file}`, name: shared.name, via: `${file}#${name}`, kind: 'view-tabs', original: name });
      return;
    }
    if (!Object.hasOwn(st.spec.exports, name)) {
      const link = linkedImport(`${file}#${name}`);
      if (link) { st.imports.set(name, { from: link.from, name: link.name, via: `${file}#${name}`, kind: 'linked', original: name }); return; }
    }
    if (entry.kind !== 'function' && entry.kind !== 'var') throw Error(`${target}: unsupported declaration ${name}`);
    if (held.has(`${file}#${name}`)) {
      if (await isModuleState(src, entry, vendor) && !Object.hasOwn(stateCopies, `${file}#${name}`)) stateConflicts.push(`${target}: ${file}#${name}`);
      st.heldCopies.push(name);
    }
    const text = declarationText(src, entry);
    // A dynamic import is kept only when it names a listed chunk emitted under its own file name next to this module
    // (shared-frame AT: `import("./cf2613ee5-Btwr9m9F.js")`, the Spark sprites), so the original specifier resolves.
    for (const [, spec] of text.matchAll(/\bimport\s*\(\s*"([^"]+)"\s*\)/g)) {
      if (!state.has(spec.replace(/^\.\//, '')) && lazyVerbatim?.importers.includes(file)) await addVerbatim(spec.replace(/^\.\//, ''), `${file}#${name}`);
      const lazy = state.get(spec.replace(/^\.\//, ''));
      if (explore && (!lazy || lazy.spec.target !== spec.replace(/^\.\//, ''))) { (globalThis.__exploreLazy ??= new Set()).add(`${file}#${name} -> ${spec}`); continue; }
      if (!lazy || lazy.spec.target !== spec.replace(/^\.\//, '')) throw Error(`${target}: dynamic import ${spec} inside ${name} is not a chunk emitted under its own name`);
      st.dynamic ??= new Set(); st.dynamic.add(spec);
    }
    if (/\bimport\s*\(\s*[^"\s]/.test(text)) throw Error(`${target}: computed dynamic import inside ${name}`);
    st.selected.set(name, entry);
    for (const dep of declarationDeps(src, name)) await add(file, dep);
  };
  for (const st of state.values()) {
    if (st.spec.verbatim) continue;
    const src = await readSource(st.spec.source, cache);
    // A re-export chunk (spec.reexport: cce0118b1, loaded lazily, only re-exports another chunk's bindings): its roots are
    // its imports, exported under the chunk's own export names.
    if (st.spec.reexport) {
      for (const [alias, local] of src.exported) {
        if (src.top.get(local)?.kind !== 'import') throw Error(`${st.spec.target}: ${alias} is not a re-export`);
        st.spec.exports[local] = alias;
        await add(st.spec.source, local);
      }
      continue;
    }
    for (const name of Object.keys(st.spec.exports)) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import') throw Error(`${st.spec.target}: root ${name} is not a declaration of ${st.spec.source}`);
      if (linked.has(`${st.spec.source}#${name}`)) throw Error(`${st.spec.target}: root ${name} is already sliced by a linked area; import it from there`);
      if (!st.spec.internal && ![...src.exported.values()].includes(name)) throw Error(`${st.spec.target}: root ${name} is no longer exported by ${st.spec.source}`);
      assertFeatures(`${st.spec.target}: root ${name}`, await featureText(src, entry), st.spec.features?.[name]);
      await add(st.spec.source, name);
    }
  }
  // linkExports join the closure like roots, so they stay exported.
  for (const st of state.values()) for (const local of st.spec.linkExports ?? []) {
    const entry = (await readSource(st.spec.source, cache)).top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`${st.spec.target}: linkExports ${local} is not a declaration of ${st.spec.source}`);
    await add(st.spec.source, local);
  }
  // Initializers: a statement that assigns to a selected binding comes along with its own dependencies (to a fixpoint).
  for (let changed = true; changed;) {
    changed = false;
    for (const st of state.values()) {
      if (st.spec.verbatim) continue;
      const src = await readSource(st.spec.source, cache);
      st.initializers ??= new Set();
      for (const statement of src.statements) {
        // carryStatements: a top-level statement named by a feature of its text, carried whenever the module is (vendor-zod's
        // global config / registry, which the selected code reads off globalThis).
        const named = (st.spec.carryStatements ?? []).some(feature => src.code.slice(statement.node.start, statement.node.end).includes(feature));
        if (st.initializers.has(statement) || (!named && !statement.assigned.some(name => st.selected.has(name)))) continue;
        st.initializers.add(statement); changed = true;
        const text = src.code.slice(statement.node.start, statement.node.end);
        let globals;
        babel.traverse(babel.babelParse(text, `${src.name}#init`, true), { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
        for (const dep of globals.filter(n => src.top.has(n))) await add(st.spec.source, dep);
      }
    }
  }
  if (unexportedLinks.length && !explore) throw Error(`bindings a linked area slices without exporting (export them there):\n  ${[...new Set(unexportedLinks)].join('\n  ')}`);
  if (explore && (unexportedLinks.length || stateConflicts.length)) console.log('EXPLORE unexported links:', [...new Set(unexportedLinks)].join(' '), '\nEXPLORE state conflicts:', stateConflicts.join(' '));
  if (stateConflicts.length && !explore) throw Error(`module state view-tabs holds without a semantic name (name it in extract-view-tabs.mjs, D46):\n  ${stateConflicts.join("\n  ")}`);
  // Name what each generated import binds: the root's semantic name, else the original local (exported as such).
  const exportName = (chunk, local) => {
    const owner = state.get(chunk);
    if (Object.hasOwn(owner.spec.exports, local)) return owner.spec.exports[local];
    owner.shared.add(local);
    return local;
  };
  for (const st of state.values()) for (const entry of st.imports.values()) if (entry.kind === 'generated') entry.name = exportName(entry.chunk, entry.local);
  // linkExports: bindings a linked area (extract-transcript-rows.mjs) imports from this area, exported under their
  // original names so the other area does not slice them a second time (added to the closure above).
  for (const st of state.values()) for (const local of st.spec.linkExports ?? []) {
    if (!st.selected.has(local)) throw Error(`${st.spec.target}: linkExports ${local} is not in the closure`);
    if (!Object.hasOwn(st.spec.exports, local)) st.shared.add(local);
  }
  const unused = [...state.values()].filter(st => st.selected.size === 0 && !st.spec.verbatim && !st.spec.reexport).map(st => st.spec.source);
  if (lazyVerbatim && !explore && verbatimFound.length !== lazyVerbatim.count) throw Error(`lazyVerbatim found ${verbatimFound.length} chunks, expected ${lazyVerbatim.count}`);
  // A listed verbatim chunk must be imported (statically by a module, or by another verbatim chunk, or dynamically).
  const verbatimUsed = new Set([...state.values()].flatMap(st => [...st.imports.values()].filter(e => e.kind === 'verbatim').map(e => e.from.slice(2)))
    .concat([...state.values()].flatMap(st => [...(st.dynamic ?? [])].map(spec => spec.replace(/^\.\//, ''))))
    .concat([...state.values()].flatMap(st => st.deps ?? [])));
  unused.push(...[...state.values()].filter(st => st.spec.verbatim && !verbatimUsed.has(st.spec.source)).map(st => st.spec.source));
  if (unused.length) throw Error(`listed chunks the closure never enters: ${unused.join(', ')}`);
  // Module order: a generated module after the modules it imports; a cycle stops generation.
  const order = [], mark = new Map();
  const visit = (chunk, trail) => {
    if (mark.get(chunk) === 'done') return;
    if (mark.get(chunk) === 'open') throw Error(`generated modules import each other: ${[...trail, chunk].join(' -> ')}`);
    mark.set(chunk, 'open');
    for (const entry of state.get(chunk).imports.values()) if (entry.kind === 'generated' && entry.chunk !== chunk) visit(entry.chunk, [...trail, chunk]);
    mark.set(chunk, 'done');
    order.push(chunk);
  };
  for (const spec of modules) if (!spec.verbatim) visit(spec.source, []);

  const manifest = {
    referenceVersion, referenceSnapshot, generator: `scripts/${generator}`, adapterModule: adapterFile, ...(gate ? { gate } : {}),
    ...(linkedAreas.length ? { linkedAreas } : {}), modules: [], callSites: [],
  };
  const files = {};
  for (const chunk of order) {
    const st = state.get(chunk), { spec } = st;
    const src = await readSource(chunk, cache);
    const decls = [...st.selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const inits = [...(st.initializers ?? [])].map(statement => ({ start: statement.node.start, text: src.code.slice(statement.node.start, statement.node.end) }));
    const once = [...new Set(decls.map(([, entry]) => entry))];
    const blocks = [...once.map(entry => ({ start: entry.node.start, text: emittedText(src, entry) })), ...inits]
      .sort((a, b) => a.start - b.start).map(block => block.text);
    const groups = new Map();
    for (const [local, entry] of [...st.imports].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exported = [...Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)),
      ...[...st.shared].sort().filter(local => !Object.hasOwn(spec.exports, local))];
    const exportText = exported.length ? `export { ${exported.join(', ')} };` : '';
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${chunk}; generated by ${generator}.\n// Edit the extractor or ${adapterFile}, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const closed = babel.babelParse(text, spec.target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter(name => !allowedGlobals.has(name));
    if (unbound.length && !explore) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: chunk, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: decls.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      initializers: inits.map(init => sha(init.text)),
      imports: [...st.imports].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports, sharedExports: [...st.shared].sort(), heldByViewTabs: [...st.heldCopies].sort(),
      ...(spec.linkExports?.length ? { linkExports: [...spec.linkExports].sort() } : {}),
    });
  }
  for (const site of callSites) {
    const src = await readSource(site.source, cache);
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
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  // Public assets the emitted code names by absolute URL (c8677db5f: `new URL("/assets/v1/<sheet>.webp", import.meta.url)`).
  // The bytes are copied from the installed snapshot into public-assets/ here (checked), and, on a write run, into
  // public/assets/v1 where the renderer serves /assets/v1 (scripts/prepare-ui.mjs recreates that folder and does not know
  // these files yet: a followUp for whoever owns prepare-ui).
  manifest.publicAssets = [];
  const assetNames = new Set();
  for (const text of Object.values(files)) for (const [, name] of text.matchAll(/"\/assets\/v1\/([\w.-]+\.(?:webp|png|svg|json))"/g)) assetNames.add(name);
  for (const name of [...assetNames].sort()) {
    const bytes = await fs.readFile(path.join(source, name));
    files[`public-assets/${name}`] = bytes;
    manifest.publicAssets.push({ name, url: `/assets/v1/${name}`, sha256: sha(bytes) });
  }
  // Host adapter (packaged app): the renderer loads dist/index.html over file://, where the official root-relative
  // `new URL("/assets/v1/<sheet>", import.meta.url)` names the disk root, so the sheet never loads and the clay mark
  // stays its static fallback dot. The same file resolves against the page instead (dist/assets/v1 in the package,
  // /assets/v1 under the dev server), one replacement per asset, each asserted.
  for (const [file, text] of Object.entries(files)) {
    if (typeof text !== 'string') continue;
    let next = text;
    for (const { name } of manifest.publicAssets) {
      const from = `new URL("/assets/v1/${name}", "" + import.meta.url)`;
      const count = next.split(from).length - 1;
      if (count === 0) continue;
      if (count !== 1) throw Error(`${file}: ${from} occurs ${count} times, expected 1`);
      next = next.split(from).join(`new URL("assets/v1/${name}", document.baseURI)`);
    }
    if (next !== text) { files[file] = next; const entry = manifest.modules.find(m => m.target === file); if (entry) entry.sha256 = sha(next); }
  }
  for (const st of [...state.values()].filter(st => st.spec.verbatim).sort((a, b) => (a.spec.target < b.spec.target ? -1 : 1))) {
    files[st.spec.target] = st.bytes;
    manifest.modules.push({ target: st.spec.target, source: st.spec.source, sourceSha256: sha(st.bytes), sha256: sha(st.bytes), referenceVersion, verbatim: true,
      bindings: [], initializers: [], imports: st.deps.map(dep => ({ from: `./${dep}`, kind: 'verbatim' })), exports: {}, sharedExports: [], heldByViewTabs: [] });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (dryRun) {
    // WORKING_LINE_EXPLORE_WRITE=<dir>: an exploration also writes what it would emit there (never the area's folder).
    if (explore && process.env.WORKING_LINE_EXPLORE_WRITE) for (const [name, content] of Object.entries(files)) { const to = path.join(process.env.WORKING_LINE_EXPLORE_WRITE, name.replace(/^auto:/, 'auto-')); await fs.mkdir(path.dirname(to), { recursive: true }); await fs.writeFile(to, content); }
    for (const m of manifest.modules) console.log(`${m.target.padEnd(24)} ${String(m.bindings.length).padStart(3)} bindings, imports ${m.imports.length}, held copies ${m.heldByViewTabs.length}`);
  } else if (check) {
    const present = (await fs.readdir(output, { recursive: true }).catch(() => [])).filter(name => name !== 'public-assets').sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`${areaName} output set changed: ${present.join(',')}. Run scripts/${generator}.`);
    for (const [name, content] of Object.entries(files)) {
      const on = await fs.readFile(path.join(output, name));
      if (!on.equals(Buffer.isBuffer(content) ? content : Buffer.from(content))) throw Error(`${areaName} source mismatch: ${name}. Run scripts/${generator}.`);
    }
  } else {
    await fs.rm(output, { recursive: true, force: true });
    await fs.mkdir(output, { recursive: true });
    if (manifest.publicAssets.length) await fs.mkdir(path.join(output, 'public-assets'), { recursive: true });
    for (const [name, content] of Object.entries(files)) await fs.writeFile(path.join(output, name), content);
    const served = path.join(root, 'public/assets/v1');
    if (manifest.publicAssets.length) await fs.mkdir(served, { recursive: true });
    for (const asset of manifest.publicAssets) await fs.copyFile(path.join(output, 'public-assets', asset.name), path.join(served, asset.name));
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : dryRun ? 'Dry-ran' : 'Extracted'} ${manifest.modules.length} ${areaName} modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
export const WORKING_LINE = {
  name: 'working line', generator: 'extract-working-line.mjs', output, adapterModule, adapterFile: 'src/source-working-line-adapters.jsx',
  adapters, localAdapters, stateCopies, modules, callSites, rawCallSites,
  referenceVersion, referenceSnapshot, source, vendor,
  gate: { flag: '__gb__2846116625', name: 'turnStatusRows', host: 'src/host-growthbook.mjs HOST_GROWTHBOOK, served to Xe by c26fb8b6b Je (TurnStatusRowsProvider)' },
};
export function extractWorkingLine(options) {
  return runSlicer(WORKING_LINE, options);
}
export { vendor, readSourceIn as readSource, featureText, assertFeatures, referenceVersion, referenceSnapshot, source as referenceSource };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractWorkingLine({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
