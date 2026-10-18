// Working line (transcript-working-line): extract the 2.42304.0 Code transcript's loading line in its turnStatusRows
// branch, without executing any desktop runtime (decision D0: own generator, own output folder
// src/generated/working-line, own scripts/verify-gen-working-line.mjs).
//
// User rulings: the host opens GrowthBook `__gb__2846116625` (turnStatusRows, c26fb8b6b `Ve`), and the line follows the
// desktop with no host trade-off. The host's GrowthBook answers (src/source-working-line-adapters.jsx HOST_GROWTHBOOK)
// serve the flag on; the original GrowthBook provider He turns it into the context We reads, and w8's raw read of the
// flag (`fe(S_e)`) sees it on as well. Every other flag stays off (D29 / D31).
//
//   working-line.mjs   c96d752d0 w8 (memo): the loading line. `M = m_()` (c26fb8b6b We) picks the branch: on, Het
//                      (`data-testid="code-working-line"`, `data-turn-working`) → Vet → the CDS TurnStatus row `up`
//                      (c734f318c jt) with the leading mark seated by tfe (c28b569d3 a), the clock (WM / the elapsed
//                      prop), the trailing items (x8 tokens: y8 "1 token" / "{tokens} tokens" over ml; the tasks button;
//                      the "Thinking" chip only while the raw flag is off, so never here), the spinner face (KM =
//                      cc5c5e22c l, JM's mode) and XM's activity mark (ww: the clay mark behind shared-4 Ny, GrowthBook
//                      `__gb__507049721`, off); off, the classic row (Zo spark, uv morphs, m8 clock) — kept as original
//                      code because w8 is one declaration. T8 (how the desktop feeds w8 from its session stores) is
//                      pinned, not emitted: the host feeds w8 from its own turn state (src/working-line-model.mjs).
//   turn-status-rows.mjs  c26fb8b6b Ve / D / He / Ue / We: the flag, its context, the GrowthBook provider (the host
//                      mounts it, src/source-working-line.jsx), the explicit provider and the reader.
//   turn-status.mjs    c734f318c jt / At / St: the CDS TurnStatus (data-cds="TurnStatus") and its Step
//                      (data-cds="TurnStatusStep"), over shared-frame's row parts (the row mark EM with the Spark NT / MT,
//                      the clock pM, the label swap HM, the settle hook KM, …).
//   cf2613ee5-Btwr9m9F.js  the Spark's sprite strips, emitted under the chunk's own name so shared-frame AT's lazy
//                      `import("./cf2613ee5-Btwr9m9F.js")` (`cds_spark_sprites`) resolves unchanged.
//   morph.mjs          cb6930dae ja (uv): the keyed morph, animated by vendor-motion.mjs.
//   vendor-motion.mjs  framer-motion as the desktop ships it (vendor-motion-DKLOEafD.js): the slice ja reaches
//                      (useReducedMotion, AnimatePresence, motion) with its two top-level initializers. No dependency
//                      is added (D27): it is the installed chunk's own code.
//   api-errors.mjs     c4a9ee384 zp (the apiRetry label over the API error type) and $f, over vendor-intl's
//                      defineMessages (define-messages.mjs).
//   …                  and the small originals those read (c93058e68 f elapsed clock, c60636ac6 X count tween, shared-8
//                      AV token format, shared-4 Ny / Py, cc5c5e22c l / c, c1e715a58 r, c28b569d3 a / i, shared-52 oD,
//                      shared-6 ug, c93fb40ec t, c8ba53634, shared-1, shared-156, shared-2, shared-25 Di), each chunk's
//                      slice in a module of its own.
//
// The machinery is extract-turn-box.mjs's: every emitted binding is an original top-level declaration sliced from the
// installed chunk; a module's bindings are the reachable closure of its roots (each declaration parsed on its own, its
// free variables are the chunk's top-level bindings it uses); an import is followed into the chunk it names, so the
// closure crosses chunks, and every chunk it may enter is listed in `modules`. An import resolves, in this order, to: a
// named host adapter in src/source-working-line-adapters.jsx (its original declaration must carry `features`), a
// verified React export of vendor-frame, a semantic public name of the shared view-tabs graph (D1/D46), or the
// declaration in a listed chunk. A declaration of a listed chunk that view-tabs already publishes is imported from
// view-tabs too. A declaration view-tabs holds without a public name is sliced again here (recorded in the manifest as
// `heldByViewTabs`, a followUp for extract-view-tabs.mjs) unless it is module state (a context, a WeakMap / Map / Set)
// outside the justified `stateCopies`. A destructuring declarator is one binding for each name it declares; a top-level
// expression statement that assigns to a selected binding is carried as an initializer, in source order. A dynamic
// import is kept only when it names a listed chunk emitted under its own file name. Anything else unresolved stops
// generation. `--dry-run` with WORKING_LINE_EXPLORE=1 surveys a closure without writing.
//
// `callSites` / `rawCallSites` pin the original text the host wiring follows but cannot import: T8's props, the gate
// constant, the root GrowthBook provider, and where the desktop forces the gate on through Ue (c96d752d0 nat,
// cf74bc599 Cn).
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
const output = path.join(root, 'src/generated/working-line');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-working-line-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React; each alias is checked against its `local=<ns>.<member>` assignment.
const vendor = {
  'vendor-frame-DfPJ1QmD.js': {
    Co: ['react', 'useState'], So: ['react', 'useRef'], uo: ['react', 'useCallback'], bo: ['react', 'useMemo'], mo: ['react', 'useEffect'],
    yo: ['react', 'useLayoutEffect'], oo: ['react', 'memo'], Ja: ['react', 'Fragment'], Ba: ['react', 'Fragment'], eo: ['react', 'createContext'],
    do: ['react', 'useContext'], lo: ['react', 'use'], wo: ['react', 'useSyncExternalStore'], go: ['react', 'useId'], xo: ['react', 'useReducer'],
    co: ['react', 'startTransition'], io: ['react', 'isValidElement'], $a: ['react', 'cloneElement'], ro: ['react', 'forwardRef'],
    po: ['react', 'useDeferredValue'], vo: ['react', 'useInsertionEffect'], _o: ['react', 'useImperativeHandle'], To: ['react', 'useTransition'],
    ho: ['react', 'useEffectEvent'], Ka: ['react', 'Children'], qa: ['react', 'Component'], to: ['react', 'createElement'], Qa: ['react', 'Suspense'], Sa: ['react-dom', 'createPortal'], Ca: ['react-dom', 'flushSync'],
    Va: ['react/jsx-runtime', 'jsx'], Ha: ['react/jsx-runtime', 'jsxs'],
    // The React namespace (zustand's useStore in vendor-all-0 reads useSyncExternalStore / useCallback off it).
    so: ['react', 'default'],
  },
};

// Host dependencies (checked first), keyed by chunk then export alias. `local` is the declaration the alias must still
// name; `features` must appear in that declaration's prettier form; `also` pins further declarations of the same chunk.
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (source-code-start-adapters.jsx useStartIntl /
  // StartMessage: the English message is looked up in zh-CN by t()). useIntl also carries the host's thinking toggle
  // (see the adapter module).
  'vendor-intl-Db7hDWRO.js': {
    p: { name: 'useIntl', local: 'q', features: ['let e = o(K);', 'return (Mt(e), e);'], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
    l: { name: 'FormattedMessage', local: 'Gt', features: ['var Gt = u(Wt, Ut);'], also: { Wt: ['p = r({ id: o, description: s, defaultMessage: c }, l, { ignoreTag: f });'] } },
  },
  // shared-25 Zs (exported Th): a GrowthBook flag (w8 `fe(S_e)` = the raw turnStatusRows flag, x8 `fe(nfe)` =
  // ccr_thinking_token_count). No GrowthBook here: off (D29 / D31). turnStatusRows reaches the line through Ue instead.
  // ec (exported Nh): a GrowthBook flag behind an enable argument (shared-4 Ny: `__gb__507049721`, the clay mark). Off.
  'shared-25-DP8p7i1Z.js': {
    Th: { name: 'useGrowthBookFlag', local: 'Zs', features: ['return Rs(I(e)).on;'] },
    Nh: { name: 'useGrowthBookFlagWhen', local: 'ec', features: ['return !t || !n?.growthbook ? !1 : As(n, I(e)).on;'] },
  },
  // shared-14 Ge (exported Y): the chat text size preference (the classic row's spark size c8[j]). Host: the transcript's
  // text size, through WorkingLineHost.
  'shared-14-u0TSV9dR.js': { Y: { name: 'useChatTextSize', local: 'Ge', features: ['return L((e) => e.chatTextSize);'] } },
  // c06cf64bb: the desktop's per-session turn stores. Cy (yn): the running turn's start time; H (qr): the session's output
  // token counter; G (In): the session's thinking / waiting state; tc (Jr): their change emitter. The host has no
  // desktop session id here (w8 gets sessionId null: tokens and the clock come from props), so these answer the empty
  // session: no start, 0 tokens, no state, nothing to subscribe to.
  'c06cf64bb-BE5q2vSr.js': {
    yn: { name: 'useTurnStartTime', local: 'Cy', features: ['function Cy(e) {'] },
    qr: { name: 'sessionTokenCounter', local: 'H', features: ['addThinkingText(e, t) {', 'firstPositiveAt(e) {', 'return nc.get(e) ?? 0;'] },
    In: { name: 'sessionActivityStore', local: 'G', features: ['W.set(e, xp("requesting", "sending"))', 'return W.get(e) ?? null;'] },
    Jr: { name: 'sessionActivityEvents', local: 'tc', features: ['ec.add(e),', 'for (let t of ec) t(e);'] },
  },
};

// Host stand-ins for declarations the closure reaches inside a listed chunk (keyed chunk#local, feature-checked the same
// way as `adapters`). None at present: the CDS Spark (shared-frame NT / MT with its lazily loaded sprite chunk) is the
// original, not the host SourceSpark.
const localAdapters = {};

// Module state view-tabs also holds (without a public name) that this area copies anyway, each with why a second copy
// cannot split anything the host relies on. Any other state copy stops generation (see isModuleState).
const stateCopies = {
  // CDS router context (CdsRoot provides `router`): TurnStatus links (qi) read it. No host CdsRoot passes a router, so the
  // view-tabs copy and this one both read undefined.
  'shared-frame-BfjMqbuN.js#ii': 'router context; no host router (both copies undefined)',
  // The reduced-motion listener set (Am / km over matchMedia and html[data-reduced-motion]): a second copy subscribes to
  // the same global sources and answers the same value.
  'shared-frame-BfjMqbuN.js#Em': 'reduced-motion listeners over global sources (same answer)',
  // A per-document Range cache (Id, text overflow measurement).
  'shared-frame-BfjMqbuN.js#Fd': 'per-document Range cache',
};

// One generated module per chunk the closure may enter. `exports` maps original local binding -> exported name (the
// roots; `features` pins each to strings of its original prettier-formatted text). Bindings other generated modules
// import from a chunk are exported under their original names as well.
const modules = [
  { target: 'turn-status-rows.mjs', source: 'c26fb8b6b-DfPeiuGP.js',
    exports: { Ve: 'TURN_STATUS_ROWS_FLAG', He: 'TurnStatusRowsProvider', Ue: 'TurnStatusRowsOverride', We: 'useTurnStatusRows' },
    features: { Ve: ['Ve = "__gb__2846116625"'], He: ['n = f(Ve);', 'value: t ?? n'], Ue: ['return o(D.Provider, { value: e, children: t });'],
      We: ['return l(D) ?? !1;'] } },
  { target: 'elapsed-clock.mjs', source: 'c93058e68-BZctuFpI.js', exports: { f: 'useElapsedSince' },
    features: { f: ['return d(e ?? null, r);'] } },
  { target: 'media-query.mjs', source: 'shared-25-DP8p7i1Z.js' },
  { target: 'count-tween.mjs', source: 'c60636ac6-DF2ym4tP.js', exports: { X: 'useCountTween' },
    features: { X: ['o = (e) => 1 - (1 - e) ** 3,', 'l = requestAnimationFrame(u)'] } },
  { target: 'token-format.mjs', source: 'shared-8-B5lJ8U5C.js', exports: { AV: 'formatTokenCount' }, features: { AV: ['return jV(e'] } },
  { target: 'flag-names.mjs', source: 'c93fb40ec-ueIsHfDz.js', exports: { t: 'THINKING_TOKEN_COUNT_FLAG' }, features: { t: ['t = "ccr_thinking_token_count"'] } },
  { target: 'transcript-attrs.mjs', source: 'shared-6-Cby4X-ms.js' },
  { target: 'value-changed.mjs', source: 'shared-52-DGviI8xb.js' },
  // vendor-intl tn / nn (defineMessages / defineMessage: identity), read by c4a9ee384's message tables.
  { target: 'define-messages.mjs', source: 'vendor-intl-Db7hDWRO.js' },
  // c4a9ee384: $f (the thinking-token count the session path reads) and zp (w8's apiRetry label: the short text of an
  // API error type, "Request failed" for any other). The host passes the official error type (working-line-model.mjs
  // apiErrorType over the Codex error info).
  { target: 'api-errors.mjs', source: 'c4a9ee384-ZZIKqgNM.js', exports: { zp: 'apiErrorText' },
    features: { zp: ['let r = n === "long" ? Ip : Lp;', 'return t.formatMessage(r[e] ?? Rp);'] } },
  { target: 'activity-marks.mjs', source: 'shared-4-CJsHhp5n.js', exports: { Ny: 'useActivityMarks' },
    features: { Ny: ['n = ue("__gb__507049721", e && !t);', 'return e && (t || n);'] } },
  { target: 'spinner-face.mjs', source: 'cc5c5e22c-C8R6koQe.js', exports: { l: 'useSpinnerFace', c: 'SpinnerFaceContext' },
    features: { l: ['d?.publish(f, t === null ? null : { word: t, message: l, mode: u });', 'd?.faceOf(f) ?? o'] } },
  { target: 'spinner-native.mjs', source: 'c1e715a58-DfhjCuW6.js' },
  { target: 'mark-seat.mjs', source: 'c28b569d3-tlK89Xxf.js', exports: { a: 'seatLeadingMark', i: 'MarkSeatContext' },
    features: { a: ['let s = a && n(t) ? r(i) : null;', '{ leading: t, seated: null }'] } },
  { target: 'clipboard.mjs', source: 'shared-1-CAAiD7E3.js' },
  { target: 'shared-156.mjs', source: 'shared-156-Bikz018e.js' },
  { target: 'shared-2.mjs', source: 'shared-2-Cb74JByF.js' },
  { target: 'shared-frame.mjs', source: 'shared-frame-BfjMqbuN.js', linkExports: ['Ji', 'fn', 'un', 'ln', 'dn', 'io', 'lo'] },
  { target: 'card-classes.mjs', source: 'c8ba53634-Qe339QHm.js' },
  // The Spark's sprite strips (shared-frame AT loads them lazily as `cds_spark_sprites`), emitted under the chunk's own
  // name so AT's `import("./cf2613ee5-Btwr9m9F.js")` resolves unchanged.
  { target: 'cf2613ee5-Btwr9m9F.js', source: 'cf2613ee5-Btwr9m9F.js', exports: { e: 'animations' },
    features: { e: ['thinking: {', 'frameCount: 7,'] } },
  // The clay activity mark (ww → c05970c42 Q, shown when shared-4 Ny is on: GrowthBook `__gb__507049721`, on by the
  // user's ruling) and its sprite players (cc39db724), with the lazily loaded sheets emitted under their own chunk names
  // so each original `import("./…")` resolves unchanged: c8677db5f (the activity sheets: inline data URLs plus six
  // /assets/v1/*.webp sheets, see publicAssets), c98f11b7a (mainSparkSheets) and cca15fd43 (nodeMarkAnimations).
  { target: 'c8677db5f-CJKAHncR.js', source: 'c8677db5f-CJKAHncR.js', exports: { D: 'ALIASES', O: 'SHEETS', E: 'SHEET_FRAME', k: 'SHEET_URLS' },
    features: { k: ['"think.loop": x,'] } },
  { target: 'c98f11b7a-DyaVNKTh.js', source: 'c98f11b7a-DyaVNKTh.js', exports: { e: 'mainSparkSheets' }, features: { e: ['thinkingFast: {'] } },
  { target: 'cca15fd43-C_oOPIWW.js', source: 'cca15fd43-C_oOPIWW.js', exports: { e: 'nodeMarkAnimations' }, features: { e: ['nodes3: {'] } },
  { target: 'activity-sprites.mjs', source: 'cc39db724-BRrbVAsR.js' },
  { target: 'activity-mark.mjs', source: 'c05970c42-Dye5Z-ab.js', exports: { Q: 'ActivityMark' },
    features: { Q: ['d = f("turnStatusActivityMarks"),', '"data-testid": "TurnStatusClassicMark",', 'mark: e,'] } },
  { target: 'turn-status.mjs', source: 'c734f318c-BRH2gAJZ.js', internal: true, exports: { jt: 'TurnStatus', St: 'TurnStatusStep' },
    features: { jt: ['jt = Object.assign(At, { Step: St, Phrases: ut })'], St: ['"data-cds": "TurnStatusStep"'] } },
  // framer-motion as the desktop ships it (vendor-motion): the slice morph.mjs reaches (useReducedMotion pd,
  // AnimatePresence ul, motion fd) with its two top-level initializers. D27: no dependency is added; this is the
  // installed chunk's own code.
  { target: 'vendor-motion.mjs', source: 'vendor-motion-DKLOEafD.js', linkExports: ['C'] },
  // The transcript rows area (extract-transcript-rows.mjs) imports the mark broker's context (Ia, Ga, Ka) and the turn
  // activity context (ro) from here, so each exists once.
  { target: 'morph.mjs', source: 'cb6930dae-BD0W5ZM9.js', internal: true, linkExports: ['Ca', '_a', 'va', 'ba', 'xa', 'Sa', 'ya'],
    exports: { ja: 'Morph', Ia: 'TurnMarkBrokerContext', Ga: 'noSubscription', Ka: 'neverHeld', ro: 'TurnActivityContext' },
    features: { ja: ['mode: n = "popLayout",', 'openWidth: r = !1,', 'let a = Ie(),', 'return a || !o', ': l("span", { className: t, children: i })'] } },
  { target: 'working-line.mjs', source: 'c96d752d0-BOCqU7c2.js', internal: true, linkExports: ['uM'],
    exports: { w8: 'WorkingLine', p8: 'thinkingElapsedBucket', Net: 'thinkingLabel', h8: 'waitingLabel', JM: 'spinnerMode', Bet: 'WORKING_LINE_TEST_ID',
      // Shared with the transcript rows area (XAe / ZAe read them).
      GM: 'useNeedsYourInputLabel', KM: 'useSpinnerWord', qM: 'spinnerWord', WM: 'useTurnClock', ww: 'activityMark' },
    features: {
      w8: ['M = m_(),', 'N = fe(S_e),', 'if (M) {', 'b(Het, {', 'b(x8, { sessionId: y, isRunning: n && !e, tokens: m }, "tokens"),',
        'defaultMessage: "Thinking", id: "AHQWDTo4+e"', '"{count, plural, one {# running task} other {# running tasks}}",',
        'defaultMessage: "Stopping\\u2026",', 'defaultMessage: "Compacting session\\u2026",', 'spinnerWord: qM(h),'],
      p8: ['return e >= f8'], Net: ['defaultMessage: "Almost done thinking\\u2026",', 'defaultMessage: "Still thinking\\u2026",'],
      h8: ['defaultMessage: "Waiting for Claude\\u2026",', 'defaultMessage: "Running tools\\u2026",', 'case "connecting":'],
      JM: ['? "thinking"', '? "tool-use"', '? "responding"', ': "requesting";'], Bet: ['Bet = "code-working-line"'],
    } },
];

// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration).
const callSites = [
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'T8', role: 'How the desktop feeds w8 from its session stores (host: src/working-line-model.mjs workingLineProps)',
    features: ['{ elapsedSeconds: l, tokens: u, thinking: d, waiting: f } = Iw(e),', 'j = p8(wp(g) ?? l),', 'return b(w8, {', 'hasTokens: u > 0,',
      'waiting: f !== null && x ? "connecting" : f,', 'turnStartTime: g,', 'finishedTaskCount: z,', 'onToggleTasksPane: !B && H && V !== null ? ee : null,'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'x8', role: 'sessionId null: the tokens come from the tokens prop (y8 with the flag, else the b8 count tween)',
    features: ['return e === null', '? b(r ? y8 : b8, { tokens: n })'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'Vet', role: 'sessionId and turnStartTime null: the clock is the elapsedSeconds prop when it reaches 2',
    features: ['v = o !== null || s !== null,', 'j = c >= 2 ? c : void 0;', 'elapsedSeconds: _ ? (v ? y : j) : void 0,'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'ITe', role: 'The thinking state: active open while a thought streams, active closed during the minimum hold, then done',
    features: ['if (e.thinkingStart !== null) return { kind: "active", open: !0 };', '? { kind: "active", open: !1 }', ': t < i + FTe'] },
];
// Pinned on the minified bytes (each must occur exactly once).
const rawCallSites = [
  { source: 'c96d752d0-BOCqU7c2.js', role: 'nat: the next renderer feed forces turnStatusRows on through Ue (p_), the form the host follows',
    features: ['C as p_', 'T as m_'] },
  { source: 'cf74bc599-D9NZWRyl.js', role: 'The transcript turns the rows on when the gate or the renderer chrome says so (Cn = Jp() || Sn) and provides it through Ue (qp)',
    features: ['Cn=Jp()||Sn', 'u(qp,{value:Cn,'] },
  { source: 'c9543da06-DX8mZLsD.js', role: 'He (fa): the GrowthBook provider the desktop mounts at its root', features: ['w as fa'] },
];

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
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
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  const local = src.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${target[1]}\\b`).test(src.code))
    throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
  return target;
}
async function viewTabsGraph() {
  const manifest = JSON.parse(await fs.readFile(path.join(viewTabs, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const published = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  const held = new Set();
  for (const m of manifest.modules) for (const b of m.bindings) held.add(`${m.source}#${typeof b === 'string' ? b : b.name}`);
  return { published, held };
}
// Module state a second copy would split: a context, or a module-level WeakMap / Map / Set.
async function isModuleState(src, entry) {
  if (entry.kind !== 'var') return false;
  const init = entry.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return true;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.top.get(init.callee.name);
    if (callee?.kind === 'import' && vendor[callee.file]?.[callee.alias]?.[1] === 'createContext') return true;
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
  'process', 'ErrorEvent', 'EvalError', 'ReferenceError', 'URIError', 'sessionStorage', 'localStorage', 'matchMedia', 'self', 'StorageEvent', 'Function', 'CSSStyleSheet', 'customElements', 'HTMLStyleElement', 'WebAssembly', 'SharedArrayBuffer', 'Buffer', 'Response', 'WorkerGlobalScope']);

// Generated areas this one imports from instead of slicing again: file#local -> { from, name } for every binding a
// linked area emits and exports; a binding it slices without exporting is `null` (stops generation: export it there).
// An entry is an area name (every module), or { area, modules } to link only those modules of an area another generator
// owns (its other modules may hold copies this area also slices; only the listed ones are imported, never resliced).
async function linkedBindings(areas) {
  const map = new Map();
  for (const linkedArea of areas) {
    const area = typeof linkedArea === 'string' ? linkedArea : linkedArea.area;
    const only = typeof linkedArea === 'string' ? null : new Set(linkedArea.modules);
    const dir = path.join(root, 'src/generated', area);
    const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
    if (manifest.referenceVersion !== referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
    for (const target of only ?? []) if (!manifest.modules.some(m => m.target === target)) throw Error(`linked module ${area}/${target} is not in its manifest`);
    for (const m of manifest.modules) {
      if (only && !only.has(m.target)) continue;
      if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
      for (const b of m.bindings ?? []) {
        const local = typeof b === 'string' ? b : b.name;
        const name = m.exports?.[local] ?? (m.sharedExports?.includes(local) ? local : null);
        map.set(`${m.source}#${local}`, name === null ? { area, target: m.target, name: null } : { from: `../${area}/${m.target}`, name, area, target: m.target });
      }
    }
  }
  return map;
}

export async function runSlicer(cfg, { check = false, dryRun = false } = {}) {
  const { name: areaName, generator, output, adapterModule, adapterFile, adapters, localAdapters = {}, stateCopies = {}, modules,
    callSites = [], rawCallSites = [], gate = null, linkedAreas = [], lazyVerbatim = null } = cfg;
  const linked = await linkedBindings(linkedAreas);
  const unexportedLinks = [];
  const linkedImport = key => {
    const link = linked.get(key);
    if (!link) return null;
    if (link.name === null) { unexportedLinks.push(`${key} (${link.area}/${link.target})`); return null; }
    return link;
  };
  // --dry-run with WORKING_LINE_EXPLORE=1: unlisted chunks become provisional modules and unbound globals pass, to
  // survey a closure before listing its chunks. Nothing is written in a dry run.
  const explore = dryRun && !!process.env.WORKING_LINE_EXPLORE;
  const cache = new Map();
  const { published, held } = await viewTabsGraph();
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
      if (await isModuleState(src, entry) && !Object.hasOwn(stateCopies, `${file}#${name}`)) stateConflicts.push(`${target}: ${file}#${name}`);
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
  // linkExports: bindings this area slices for itself that a linked area (extract-transcript-rows.mjs) imports, exported
  // under their original names so the other area does not slice them a second time. Each must already be selected.
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
  gate: { flag: '__gb__2846116625', name: 'turnStatusRows', host: 'src/host-growthbook.mjs HOST_GROWTHBOOK, served to We by c26fb8b6b He (TurnStatusRowsProvider)' },
};
export function extractWorkingLine(options) {
  return runSlicer(WORKING_LINE, options);
}
export { vendor, readSource, featureText, assertFeatures, referenceVersion, referenceSnapshot, source as referenceSource };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractWorkingLine({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
