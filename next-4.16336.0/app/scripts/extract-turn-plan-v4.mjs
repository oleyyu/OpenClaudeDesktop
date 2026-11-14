// Turn plan, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104 region batch 3, region-plan G6 / cutover):
// the same `ccd_turn` server (update_plan / wrap_up) and the renderer's reading of its calls as extract-turn-plan.mjs, cut
// from the frozen 4.16336.0 snapshot into an isolated version graph. The 3.6556.2 contract (extract-turn-plan.mjs ->
// src/generated/turn-plan + electron/generated/turn-plan) is untouched: code-transcript, pierre-changes and queued-bar
// (3.6556.2) still link those modules by their original identity (region-plan cutover.oldConsumersAtGeneration), so
// this graph is staged until the batch-11 coupled cutover:
//   renderer -> src/generated/turn-plan-v4/
//   main     -> src/generated/turn-plan-v4/main/  (staged here, not under electron/: the region may only write its own
//              src/generated folders before the cutover; at the cutover it moves to electron/generated/turn-plan, D47,
//              and its adapter import becomes ../../turn-plan-adapters.mjs again)
//
// What moved against 3.6556.2 (see contract comments below):
//   main      index.chunk-DBIg6EBr -> index.chunk-wiGqt7B_ (Yt -> vt, Jt -> _t, et -> Pe, We -> Ae, Ke -> Me, Ge -> je,
//             Ue -> M, it -> Re, Tt -> Qe, jt -> rt, kt -> tt, At -> nt); the tool names, the server name and the
//             sub-agent refusal moved into index.chunk-Du-Wqi0E (Aar / Mar / jar / Par / Nar / Far), as did the MCP
//             text / error results (zSa / BSa) and the GrowthBook / event-logging services the host adapts.
//   renderer  cb27dab29-B4WyL7_M -> cb27dab29-Cw2yQaFh (same locals; R also accepts the built-in "WrapUp", Me reads
//             the tool name); c4ea84cb3 Br / Er / Y / Ir / Rr -> Gr / Er / Kr / Lr / zr (Gr takes readsWrapUp sixth);
//             c96d752d0 Ytt / r8 / i8 / eH -> pvt / g7 / _7 / A2; dN (promptOfRow) moved to c71ae93f1 c.
//
// Every emitted binding is an original top-level declaration sliced from the official chunk bytes; a module's bindings
// are the reachable closure of its roots (Babel scope analysis). A root must be the only top-level declaration of its
// chunk carrying its features and must keep its pinned export alias (null: not exported). An import resolves, in
// order, to: a named host adapter (feature-checked against the original), a verified React export of vendor-frame, a
// cds-core publicName (sharedGraph 'cds-core': manifest version / snapshot / module bytes / source hashes checked; the
// linked declaration must hash as cds-core's), a binding a linked 4.16336.0 area already holds (D1: one copy of
// cross-graph bindings; manifest version / snapshot / module bytes / source hash checked), or a declaration of a listed
// chunk. A binding cds-core holds without a publicName is cut again only when pure and hashing as cds-core's; module
// state stops generation (D46, error.stateConflicts). Anything else stops generation. No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-4.16336.0.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
const { referenceVersion, referenceSnapshot } = official;
const sources = { renderer: official.ionSource, main: official.asarSource };
const loose = (text) => ({ loose: text });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const outputs = { renderer: path.join(root, 'src/generated/turn-plan-v4'), main: path.join(root, 'src/generated/turn-plan-v4/main') };
// Adapter modules, relative to the output folder of the side that imports them.
const mainAdapterModule = '../../../../electron/turn-plan-adapters.mjs';
const rendererAdapters = '../../source-turn-box-adapters.jsx';

// ── Host adapters: chunk -> export alias -> { module, name, local, features, also } ─────────────────────────────────
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (the turn box's own adapters).
  [official.vendorIntl]: {
    p: { module: rendererAdapters, name: 'useIntl', local: 'q', features: [loose('return (Mt(e), e);')], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
    l: { module: rendererAdapters, name: 'FormattedMessage', local: 'Gt', features: [loose('var Gt = a(Wt, Ut);')], also: { Wt: ['p = i({ id: o, description: s, defaultMessage: c }, l, { ignoreTag: f });'] } },
  },
  // c96d752d0 E2 (exported Mt; 3.6556.2 QV, exported ir; pvt calls it in its own chunk): appFeatures.turnBoxAtReplies
  // over the shared-92 appFeatures store (Bne = zv). Host: the turn box's own adapter (supported).
  'c96d752d0-D9VB6ArX.js': {
    Mt: { module: rendererAdapters, name: 'useTurnBoxAtReplies', local: 'E2', features: [loose('return Bne(plt);')], also: { plt: ['e.appFeatures?.turnBoxAtReplies?.status === "supported"'] } },
  },
  // index.chunk-Du-Wqi0E (3.6556.2 index.chunk-jPKPzV-P m0 / h0 / uz).
  'index.chunk-Du-Wqi0E.js': {
    // GrowthBook: Ve() = Tnt("2371478310") turns the ccd_turn tools on (host: on for this flag, D49).
    Tnt: { module: mainAdapterModule, name: 'growthBookOn', local: 'X', features: [loose('if (Zb.has(e)) return !1;'), loose('if (B3t.has(e)) return !0;'), loose('return (Yb(e, t), t?.on ?? !1);')] },
    // GrowthBook with a default: B() = Ent("2833454025", !0) and Ent($e = "700252341", !0).
    Ent: { module: mainAdapterModule, name: 'growthBookValue', local: 'Qb', features: [loose('if (Zb.has(e)) return !1;'), loose('return (Yb(e, n), n?.on ?? t);')] },
    // Event logging (desktop_ccd_turn_scope): nothing is sent (D17).
    xJ: { module: mainAdapterModule, name: 'logEvent', local: 'Q', features: ['[EventLogging] Queuing event: %s | metadata: %o'] },
  },
};

// ── Modules: one per chunk (a `part` of a chunk owns exactly its `locals` and roots) ───────────────────────────────
// exports: local -> semantic name; exportAlias: local -> the chunk's own export alias (null: private); features: the
// original text each root (and any pinned binding) must carry, and by which the root is the unique declaration.
// linkExports (account2 turn-box): bindings of a listed chunk that turn-box-v4 links from this graph instead of cutting
// them again (the chip rules and their predicates cd4f82e77 holds here), exported under their original names.
const LINK_EXPORTS = {
  'cd4f82e77-Cuw99s6A.js': ['G', 'H', 'Nt', 'Pt', 'V', 'kt', 'q'],
};
const modules = [
  { side: 'main', target: 'ccd-turn.mjs', source: 'index.chunk-wiGqt7B_.js',
    exports: { vt: 'turnServerDefinition', _t: 'createTurnToolHandler', Pe: 'emptyTurnPlan', Ae: 'applyPlanStatuses', Me: 'planStatusLine',
      je: 'badStepNumberText', M: 'isStepNumber', Re: 'turnPlanHooks', Qe: 'END_TURN_META', rt: 'wrapUpDescription', tt: 'WRAP_UP_CLOSING_FOLLOWS',
      nt: 'WRAP_UP_BOX_ENDS_TURN', ze: 'TURN_ALLOWED_TOOLS', Le: 'heldTurnPlan', Ve: 'turnToolsOn', B: 'closingFollowsQuestionDefault' },
    exportAlias: { vt: 'jt', _t: null, Pe: null, Ae: null, Me: null, je: null, M: null, Re: 'It', Qe: null, rt: null, tt: null, nt: null, ze: 'kt', Le: 'Rt', Ve: 'Mt', B: 'At' },
    features: {
      vt: [loose('serverName: e.oK,'), loose('name: e.uK,'), loose('description: Ye(t, r),'), loose('name: e.dK,'), loose('description: rt(n),'), 'alwaysLoad: !0,',
        'isEnabled: (e) => e.sessionType === "ccd" && e.turnBoxEnabled === !0,', loose('createToolHandler: _t,')],
      _t: [loose('let o = a.turnPlan?.() ?? t;'), '`${r} is turned off right now; write it as text instead.`', '"items needs at least one step with content and status."',
        '`Plan shown (${r.length} steps).', '"desktop_ccd_turn_scope"', loose('k = O && !(a.closingFollowsQuestion ?? B()),'),
        loose('return k && !s && e.Ent($e, !0) ? { ...A, _meta: { [Qe]: !0 } } : A;'), 'a.getAvailableNextActions?.()', 'new_session is no longer an action'],
      Pe: ['return {', 'steps: void 0,', 'promptId: void 0,', 'wrappedUpIn: void 0,', 'unreadRefusals: new Set(),'],
      Ae: ['if (Array.isArray(t.done))', 'let t = n.indexOf("pending", e + 1),', 't.advance === !0 || t.advance === "true"'],
      Me: ['"every step is done"', '`no step is in progress (${n} of ${e.length} done); {"start": n} starts one`'],
      je: ['`Nothing changed: done and start take whole step numbers counted from 1, and ${e === void 0 ? "a list has at most 12 steps" : `the list has ${e} step${e === 1 ? "" : "s"}`}.'],
      M: ['return typeof e == "number" && Number.isInteger(e) && e >= 1 && e <= t;'],
      Re: [loose('matcher: `${e.cK}|${e.lK}`,'), loose('(n.tool_name === e.cK'), loose('(r.wrappedUpIn = n.prompt_id)'), 'Also still to do in this turn, on top of what the summary above lists'],
      Qe: ['"claude/endTurn"'],
      rt: ['Fill the "next step" box the app shows at the end of your turn', loose('${e ? tt : nt}'), 'a go-ahead to fix, commit, push, post or send'],
      tt: ['"Your closing message is ordinary text right after this call, the last thing you say this turn: your answer to the user in full, which the recap never replaces.'],
      nt: ['"The result says which case below applies. When the box shows your question, it ends your turn:'],
      ze: [loose('[e.lK, e.cK]')],
      Le: [loose('Fe.set(e, { conversation: e.cliSessionId, plan: n })')],
      Ve: [loose('return e.Tnt("2371478310");')],
      B: [loose('() => e.Ent("2833454025", !0)')],
    } },
  // The tool and server names, the sub-agent refusal and the MCP text / error results the handler returns.
  { side: 'main', target: 'turn-names.mjs', source: 'index.chunk-Du-Wqi0E.js',
    exports: { Aar: 'TURN_SERVER', Mar: 'UPDATE_PLAN', jar: 'WRAP_UP', Par: 'UPDATE_PLAN_TOOL_NAME', Nar: 'WRAP_UP_TOOL_NAME', Far: 'SUBAGENT_TURN_TOOL_REFUSAL' },
    exportAlias: { Aar: 'oK', Mar: 'uK', jar: 'dK', Par: 'cK', Nar: 'lK', Far: 'sK' },
    features: {
      Aar: ['"ccd_turn"'], Mar: ['"update_plan"'], jar: ['"wrap_up"'], Par: [loose('`mcp__${Aar}__${Mar}`')], Nar: [loose('`mcp__${Aar}__${jar}`')],
      Far: ['"Not shown: you are a subagent, and the app shows only the main conversation\'s task list and wrap-up. Do not call update_plan or wrap_up again; carry on with your task and report your result as usual."'],
    } },
  { side: 'main', target: 'remote-control.mjs', source: 'index.chunk-DJMw3cXE.js' },
  // Renderer: the plan and wrap-up readers (cb27dab29 keeps its 3.6556.2 locals).
  // linkExports (account2 turn-box): bindings turn-box-v4 links from this graph (D1: cb27dab29 B is a Set, one copy),
  // exported under their original names.
  { side: 'renderer', target: 'plan-update.mjs', source: 'cb27dab29-Cw2yQaFh.js', linkExports: ['B'],
    exports: { z: 'planFromItems', Ce: 'applyPlanUpdate', ve: 'applyStepStatuses', Se: 'isUpdatePlanTool', be: 'UPDATE_PLAN_TOOL',
      R: 'isWrapUpTool', ye: 'WRAP_UP_TOOL', Ne: 'legacyWrapUpText', De: 'wrapUpShown', Me: 'parseWrapUp' },
    exportAlias: { z: 'U', Ce: 'I', ve: null, Se: 'z', be: null, R: 'V', ye: 'F', Ne: 'H', De: 'K', Me: 'W' },
    features: {
      z: [loose('r = H(t, "content");'), 't.status === "completed" || t.status === "in_progress"', 'id: `plan-${n.length}`', 'n.length >= 12', loose('...(a === void 0 ? {} : { session: a })')],
      Ce: [loose('if (Array.isArray(t.items)) return z(t);'), loose('return e.map((e, t) => ({ ...e, status: n[t] }));')],
      ve: ['t.advance === !0 || t.advance === "true"', 'let t = n.indexOf("pending", e + 1),'],
      Se: ['return e === be;'], be: [loose('be = "mcp__ccd_turn__update_plan"')],
      R: ['return e === "mcp__ccd_turn__wrap_up" || e === "WrapUp";'], ye: [loose('ye = "mcp__ccd_turn__wrap_up"')],
      Ne: ['["outcome", "failures", "not_verified", "needs_user"]'],
      De: [loose('return t && e?.blocked !== !0 ? null : e;')],
      Me: [loose('let n = H(e, "recap") ?? H(e, "next_recap") ?? H(e, "outcome"),'), loose('...(t !== "mcp__ccd_turn__wrap_up" && { builtIn: !0 }),')],
    } },
  // The turn tail (c4ea84cb3 Br / Er / Y / Ir / Rr -> Gr / Er / Kr / Lr / zr).
  { side: 'renderer', target: 'turn-tail.mjs', source: 'c4ea84cb3-RflkeHS4.js',
    exports: { Gr: 'deriveTurnTail', Er: 'EMPTY_TURN_TAIL', Kr: 'turnTailEqual', Lr: 'wrapUpsByPrompt', zr: 'wrapUpReceipt' },
    exportAlias: { Gr: null, Er: null, Kr: null, Lr: null, zr: null },
    features: {
      Gr: [loose('function Gr(e, t, n, r = Dr, i = !1, a = n === void 0)'), loose('closingMessageFollows: ge !== null && Rr(e, ge),'), loose('planCutShort: !o && S && !w,'),
        loose('let he = a ? Lr(e, (e) => e === t, !0, i).get(null) : void 0,'), '(j = j.map((e) => ({ ...e, status: "completed" })))', loose('workedWithoutWrapUp: a && te && E === !0 && M === null,')],
      Er: ['closingMessageFollows: !1,', 'planBeforeWrapUp: null,', 'planCutShort: !1,', 'proposedTaskIds: Object.freeze([]),'],
      Kr: ['e.planCutShort === t.planCutShort &&', 'e.closingMessageFollows === t.closingMessageFollows &&'],
      Lr: [loose('i?.opensTurn(f.uuid)'), loose('let n = { ...e, callId: t.id ?? null };')],
      zr: [loose('return t ? (n ? e : { ...e, recap: "" }) : null;')],
    } },
  // The settled wrap-up receipt row (c96d752d0 Ytt / r8 / i8 -> pvt / g7 / _7).
  { side: 'renderer', target: 'settled-turn-box.mjs', source: 'c96d752d0-D9VB6ArX.js',
    exports: { pvt: 'SettledTurnBox', g7: 'settledTurnBoxPairs', _7: 'settledTurnBoxRecap' },
    exportAlias: { pvt: null, g7: null, _7: null },
    features: {
      pvt: [loose('r = J3($, 0, e, t, n) ? K3($, 0, e, t, n, g7(e, t, n)) : $[3],'), loose('f(Oy, { recap: i, pairs: a })')],
      g7: ['e.ruleId !== "new_session" &&', loose('.filter((e) => e.kind === "send")'), 'if (n)'],
      _7: [loose('return bf(e.recap) ?? "";')],
    } },
  // E42: the wrap-up reply chip (A2, exported jt) the plain turn tail reads (c4ea84cb3 Ir: `He(a, t)`), as a part of
  // c96d752d0 of its own, so turn-tail.mjs does not import the compiled SettledTurnBox (and the .jsx adapters) with it.
  // The part owns exactly these locals: A2 and the declarations / imports it reads.
  { side: 'renderer', target: 'wrap-up-chips.mjs', source: 'c96d752d0-D9VB6ArX.js', part: 'chips',
    exports: { A2: 'wrapUpSendChip' }, exportAlias: { A2: 'jt' }, locals: ['k2', 'O2', 'D2', 'bf', 'Ofe', 'tpe', 'mpe', 'fn'],
    features: { A2: ['key: `wrap:${n}`,', 'source: "model",', loose('kind: "send",'), loose('text: O2(n)')] } },
  // promptOfRow (3.6556.2 c96d752d0 dN) moved into c71ae93f1 with the resume-prompt helpers.
  { side: 'renderer', target: 'prompt-of-row.mjs', source: 'c71ae93f1-Cz_h3B0l.js',
    exports: { c: 'promptOfRow' }, exportAlias: { c: 'n' },
    features: { c: [loose('if (i.kind !== "text" && i.kind !== "sessionBrief") continue;'), loose('i.kind === "text" && i.rawReplyLead === !0,'), loose('return { entryId: e.id, text: l };')] } },
  // The originals the roots read, one module per chunk (the closure decides the bindings; listing a chunk the closure
  // never enters, or entering one not listed, stops generation).
  // (cds-wave8 addendum W8A: shared-0 left this list. The closure entered it only for N / Rc / Fc / Ic / Lc, read by the
  // shared-92 storage helpers ux / gx / vx, which cds-core holds and publishes since the addendum (identity_shared92_*),
  // and Fc (identity_shared0_Fc); the closure now links those and no longer enters shared-0. Was: 'shared-0-CnnWnVrT.js'
  // after 'shared-62-DoCqVpIq.js'.)
  ...[
    'shared-92-BOgyxePb.js', 'shared-62-DoCqVpIq.js', 'shared-26-B-POtn5S.js', 'shared-25-D-aF0gt9.js', 'shared-1-D1bGaTaN.js',
    'shared-39-ZCs0lAwB.js', 'shared-212-BHMAi0oa.js', 'shared-18-Cfqwgjc5.js', 'shared-183-B2N6Zy4J.js', 'shared-123-1Hc1RTKl.js', 'shared-153-DMw2VzSq.js',
    'shared-36-fqRFYwOb.js', 'shared-33-DtdykY0y.js', 'shared-38-DyF0_Fim.js', 'c06cf64bb-CoZso5N4.js', 'c8479260c-D5Ma9EoG.js', 'cb0636f7b-BS9ram6K.js',
    'cd4f82e77-Cuw99s6A.js', 'cb6930dae-DPu57U90.js', 'cd57a9664-DS9NN1WS.js', 'c89674120-C7hppnPI.js', 'cd902d735-DCi6CgIM.js', 'cd4fb5ac7-DCVeUpE6.js',
    'c4d199b75-BFt-qsGU.js', 'c8187a2dc-Dp9Zia_4.js', 'c88cd06ec-Cb6ANuHe.js', 'c2ed6676f-Bf5-wRdo.js', 'c96d6655d-BjCrWdGK.js', 'c18ec48ef-f4vXxMAu.js',
    'c35f1c8fe-BuC0WBqk.js',
  ].map((source) => ({ side: 'renderer', target: `${/^(shared-\d+|c[0-9a-f]+)-/.exec(source)[1]}.mjs`, source, ...(LINK_EXPORTS[source] ? { linkExports: LINK_EXPORTS[source] } : {}) })),
  // The React Compiler helpers and the label sanitiser the compiled components read (cds-core holds the helpers without
  // a publicName: they are cut again as pure bindings hashing as cds-core's, heldByCdsCore).
  { side: 'renderer', target: 'shared-frame.mjs', source: official.sharedFrame },
];

// ── Linked 4.16336.0 areas (D1): bindings a dependency area already holds are imported from it, never cut again ─────
// chunks: the chunks whose held bindings this graph imports from that area (a binding is linked only when the area's
// module exports it). Filled from the --survey D1 report (region-plan dependsOn: code-routines, routines-shared).
const linkedAreas = [
  // r3b-tasks (4.16336.0 production) holds the one lazyValue (shared-0 Tl, D1 survey: converge on r3b-tasks), the
  // invisible-character checks (shared-212) and the command / mention prefix checks (c8f38bf1f) the reply chips read.
  { area: 'r3b-tasks', chunks: ['shared-0-CnnWnVrT.js', 'shared-212-BHMAi0oa.js', 'c8f38bf1f-B4N4qS0l.js'] },
  // routines-shared-v4 (region-plan dependsOn): every binding it already holds and exports in these chunks is linked,
  // among them the shared-62 kI Set (module state, d1 wave5 candidate) — one copy (D1). Its shared-62 / shared-25 /
  // shared-26 modules import src/source-routines-shared-adapters.jsx, so the plain turn tail is no longer node-loadable
  // without a .jsx loader until cds-core publishes kI (wave 5); tests load this graph through Vite SSR.
  { area: 'routines-shared-v4', chunks: ['shared-0-CnnWnVrT.js', 'shared-62-DoCqVpIq.js', 'shared-25-D-aF0gt9.js', 'shared-26-B-POtn5S.js', official.vendorIntl] },
];

// ── Pinned call sites the host follows but does not import ───────────────────────────────────────────────────────
const callSites = [
  { source: 'c4ea84cb3-RflkeHS4.js', binding: 'Yr', role: 'The turn tail hook (exported r): the update_plan branch when the session has the turn box (r = yn(e), no TaskCreate todos), with the running agents, turnBoxAtReplies (s = Me()) and readsWrapUp; host: src/turn-plan-model.mjs codeTurnTail',
    features: [loose('{ todos: a } = Cn(i ? null : e),'), loose('n.length === 0 ? Er : Jr(n, t, i ? void 0 : a, o, s, r)'), loose('return w(c, Kr);')] },
  { source: 'c4ea84cb3-RflkeHS4.js', binding: 'Jr', role: 'Yr / $r cache the derivation per message array (keyed by latestPromptId, taskTodos, runningAgents, atReplies and readsWrapUp) before Gr runs',
    features: [loose('let c = Gr(e, t, n, r, i, a);'), 'e.atReplies === i &&', 'e.readsWrapUp === a'] },
  { source: 'c4ea84cb3-RflkeHS4.js', binding: 'Wr', role: 'settledWrapUps: every prompt row’s preceding wrap_up that settles (zr), unless its call was dismissed; now cached per message array in a WeakMap (Hr)',
    features: [loose('...Lr(e, (e) => i.has(e), !1, r, {'), loose('let r = zr(t);'), loose('!(t.callId !== null && n.has(t.callId)) &&')] },
  { source: 'c4ea84cb3-RflkeHS4.js', binding: '$r', role: 'latestWrapUp: shown in the transcript only once the user left the box for it (leftToTranscript); host: not shown',
    features: ['leftToTranscript: i,', loose('(i === !0 || i === h) &&'), loose('s && n.length > 0 ? Jr(n, p, l ? void 0 : u, d, f, !0) : Er,')] },
  { source: 'c9bd7af9c-Bvb7EG4D.js', binding: 'kP', role: 'EpitaxyTurnNextActionsRow (3.6556.2 cccc2cf0a cj): reads the tail and hands vP wrapUp through Nl = cb27dab29 De, closingMessageFollows, turnSettled, workedWithoutWrapUp, agentRunning; host: src/source-turn-box.jsx SourceTurnBoxMount',
    features: [loose('} = mx(t.sessionRef, t.latestPromptId),'), loose('K2($, 3, n, r, Nl(r, n))'), 'closingMessageFollows: a,', 'turnHasPendingSuggestion: n,', 'agentRunning: p,', 'proposalsPending: d,'] },
];
const rawCallSites = [
  { source: 'c96d752d0-D9VB6ArX.js', role: 'Where the transcript puts a settled wrap-up: before the prompt row it answered, rendered with pvt (prompt = c71ae93f1 c as UT)',
    features: ['for(let e of HRe(n)){let i=t.settledWrapUps?.get(e);if(i===void 0)continue;let a=e!==(n.sourceUuid??n.id);s.push({kind:"settledTurnBox",id:`turn-box-${L(n,r)}${a?`-${e}`:""}`,wrapUp:i,prompt:UT(n)?.text??"",...!Ix(n)&&{unanswered:!0}})}',
      'f(pvt,{wrapUp:t.wrapUp,prompt:t.prompt,unanswered:e})'] },
  { source: 'c9bd7af9c-Bvb7EG4D.js', role: 'kP reads cb27dab29 De (wrapUpShown) as Nl', features: ['import{B as Ml,K as Nl,S as Pl,q as Fl}from"./cb27dab29-Cw2yQaFh.js"'] },
  { source: 'cb0636f7b-BS9ram6K.js', role: 'Transcript rows (3.6556.2 c06cf64bb): an update_plan tool_use draws no row (S = cb27dab29 Se); a wrap_up call (b = R) draws no row, only a legacy outcome call (y = Ne) shows as text',
    features: ['import{H as y,V as b,m as x,z as S}from"./cb27dab29-Cw2yQaFh.js"', 'if(n&&S(o.name))continue;', 'if(o&&S(r.name)){w(r.id,r.name,r.input);continue}',
      'if(n&&b(o.name)){let t=Z.get(o);if(!t){let n=y(B(o.partialJson));if(n===void 0)continue;'] },
  { main: true, source: 'index.chunk-wiGqt7B_.js', role: 'Main process: the ccd_turn tools are on behind GrowthBook 2371478310 (Ve, exported Mt); the server is for Code sessions with the turn box mounted; wrap_up is left out with noWrapUp (vt third parameter); allowed tools kt; the held plan Rt; the hooks It',
    features: ['function Ve(){return e.Tnt("2371478310")}', 'isEnabled:e=>e.sessionType==="ccd"&&e.turnBoxEnabled===!0', 'Object.defineProperty(exports,"Mt",{enumerable:!0,get:function(){return Ve}})',
      'Object.defineProperty(exports,"jt",{enumerable:!0,get:function(){return vt}})', 'Object.defineProperty(exports,"kt",{enumerable:!0,get:function(){return ze}})',
      'Object.defineProperty(exports,"Rt",{enumerable:!0,get:function(){return Le}})', 'Object.defineProperty(exports,"It",{enumerable:!0,get:function(){return Re}})'] },
  { main: true, source: 'index.chunk-CqaSnEfn.js', role: 'Main process: turnBoxEnabled = Mt() && turnBoxMounted; the ccd_turn tools are allowed without asking (kt, minus wrap_up with noWrapUp); the handler reads the held plan through Rt',
    features: ['b=require("./index.chunk-wiGqt7B_.js")', 'turnBoxEnabled:b.Mt()&&this.sessions.get(e)?.turnBoxMounted===!0', '...x.ccd_turn?b.kt.filter((e=>!(a.noWrapUp&&e===t.lK))):[]'] },
  { main: true, source: 'index.chunk-_xHmE7Nf.js', role: 'Main process: a sub-agent\'s update_plan / wrap_up is denied with Far (sK, PreToolUse)',
    features: ['e.agent_id&&(e.tool_name===t.cK||e.tool_name===t.lK)?(t.xJ("desktop_ccd_permission_auto_denied",{session_id:r,tool_name:e.tool_name,reason:"subagent_turn_tool"}),{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:t.sK}})'] },
];

const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'NaN', 'undefined', 'Infinity', 'isFinite', 'parseInt', 'parseFloat', 'encodeURIComponent', 'globalThis',
  'Uint8Array', 'BigInt', 'TextEncoder', 'TextDecoder', 'crypto', 'performance', 'setTimeout', 'clearTimeout', 'requestAnimationFrame',
  'cancelAnimationFrame', 'window', 'console', 'navigator', 'queueMicrotask', 'document', 'URL', 'URLSearchParams', 'DOMException', 'AbortController', 'Reflect', 'Proxy', 'Function', 'RangeError', 'SyntaxError', 'Int32Array', 'Float64Array', 'ArrayBuffer', 'DataView', 'atob', 'btoa', 'decodeURIComponent', 'encodeURI', 'decodeURI', 'isNaN', 'escape', 'unescape', 'Blob', 'location', 'localStorage', 'sessionStorage', 'ResizeObserver', 'MutationObserver']);

export const contract = Object.freeze({ referenceVersion, referenceSnapshot, adapters, modules, linkedAreas, callSites, rawCallSites, allowedGlobals,
  sharedGraph: 'cds-core',
  isolatedGraph: { productionOutputs: ['src/generated/turn-plan', 'electron/generated/turn-plan'], productionSwitchNotBeforeBatch: 11, heldBy: ['code-transcript', 'pierre-changes', 'queued-bar'],
    mainStagedAt: 'src/generated/turn-plan-v4/main (moves to electron/generated/turn-plan at the cutover)' } });

// ── Source reading ───────────────────────────────────────────────────────────────────────────────────────────────
const isRequire = (init) => init?.type === 'CallExpression' && init.callee?.type === 'Identifier' && init.callee.name === 'require'
  && init.arguments?.length === 1 && init.arguments[0].type === 'StringLiteral';
async function readSource(side, name, cache) {
  const key = `${side}/${name}`;
  if (cache.has(key)) return cache.get(key);
  const bytes = await fs.readFile(path.join(sources[side], name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(), top = new Map();
  for (const node of ast.program.body) {
    if (node.type === 'ExportNamedDeclaration') for (const s of node.specifiers) exported.set(s.exported.name, s.local.name);
    else if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (d.id.type !== 'Identifier') continue;
        if (isRequire(d.init)) top.set(d.id.name, { kind: 'require', file: d.init.arguments[0].value.replace(/^\.\//, '') });
        else top.set(d.id.name, { kind: 'var', node: d });
      }
    } else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
  }
  if (side === 'main') for (const m of code.matchAll(/Object\.defineProperty\(exports,"([\w$]+)",\{enumerable:!0,get:function\(\)\{return ([\w$]+)\}\}\)/g)) exported.set(m[1], m[2]);
  const aliasOf = new Map();
  for (const [alias, local] of exported) aliasOf.set(local, [...(aliasOf.get(local) ?? []), alias]);
  const record = { side, name, bytes, code, ast, exported, aliasOf, top, formatted: new Map(), deps: new Map() };
  cache.set(key, record);
  return record;
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
  const text = emittedText(src, entry);
  const ast = babel.babelParse(text, `${src.name}#${name}`, true);
  const found = new Map();
  babel.traverse(ast, {
    Program(p) { for (const g of Object.keys(p.scope.globals)) if (g !== name && src.top.has(g)) found.set(g, { name: g, members: [] }); },
    Identifier(p) {
      const dep = found.get(p.node.name);
      if (!dep || src.top.get(p.node.name).kind !== 'require' || !p.isReferencedIdentifier() || p.scope.hasBinding(p.node.name)) return;
      const parent = p.parent;
      if (parent.type !== 'MemberExpression' || parent.object !== p.node || parent.computed || parent.property.type !== 'Identifier')
        throw Error(`${src.name}#${name}: CommonJS namespace ${p.node.name} is used other than as ${p.node.name}.member`);
      dep.members.push({ member: parent.property.name, start: parent.start, end: parent.end });
    },
  });
  const deps = [...found.values()];
  src.deps.set(name, deps);
  return deps;
}
const normalised = (text) => text.replace(/\s+/g, '').split(',)').join(')').split(',]').join(']').split(',}').join('}').replace(/,$/, '');
const coarse = (text) => text.replace(/[\s;()]+/g, '').replace(/'/g, '"').replace(/,(?=[\]}])/g, '');
// The literal anchors of a loose feature: its string literals and the identifiers looseFeature keeps literal (> 3 chars).
const looseAnchors = (feature) => {
  const anchors = [...feature.matchAll(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g)].map((m) => coarse(m[0]));
  for (const m of feature.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, ' ').matchAll(/[A-Za-z_$][\w$]{3,}/g)) anchors.push(m[0]);
  return anchors.length ? anchors : [coarse(feature)];
};
const featureHits = (text, features) => features.filter((f) => (typeof f === 'string' ? text.includes(f) || normalised(text).includes(normalised(f)) : official.looseFeature(f.loose).test(text)));
function assertFeatures(label, text, features = []) {
  const missing = features.filter((f) => !featureHits(text, [f]).length);
  if (missing.length) throw Error(`${label} lacks ${missing.map((f) => JSON.stringify(f)).join(', ')}${process.env.TURN_PLAN_EXPLAIN ? `\n--- text ---\n${text}` : ''}`);
}
// A root is the only top-level declaration of its chunk carrying all its features (raw text first; a declaration that
// matches some features raw is checked again in its prettier form) and keeps its pinned export alias.
async function assertUniqueRoot(label, src, name, features, alias) {
  if (!features?.length) throw Error(`${label}: root ${name} has no features to locate it by`);
  const hits = [];
  for (const [local, entry] of src.top) {
    if (entry.kind !== 'function' && entry.kind !== 'var') continue;
    // Prefilter on the raw text with a coarse normal form (no whitespace, semicolons, parentheses, quotes kind); a
    // declaration matching any feature that way is checked exactly on its prettier form.
    const raw = coarse(emittedText(src, entry));
    if (!features.some((f) => (typeof f === 'string' ? raw.includes(coarse(f)) : looseAnchors(f.loose).some((a) => raw.includes(a))))) continue;
    if (featureHits(await featureText(src, entry), features).length === features.length) hits.push(local);
  }
  if (hits.length !== 1 || hits[0] !== name) throw Error(`${label}: root ${name} is not the unique declaration with its features (${hits.join(', ') || 'none'})`);
  if (alias !== undefined) {
    const aliases = src.aliasOf.get(name) ?? [];
    if (alias === null ? aliases.length : !aliases.includes(alias)) throw Error(`${label}: root ${name} is exported as ${aliases.join(',') || '(nothing)'}, expected ${alias ?? '(nothing)'}`);
  }
}
async function assertAdapter(label, src, local, adapter) {
  const original = src.top.get(local);
  if (!original || original.kind === 'import' || original.kind === 'require') throw Error(`${label} (${local}) is not a declaration`);
  assertFeatures(`${label} (${local})`, await featureText(src, original), adapter.features);
  for (const [other, features] of Object.entries(adapter.also ?? {})) {
    const also = src.top.get(other);
    if (!also || also.kind === 'import' || also.kind === 'require') throw Error(`${label} pins ${other}, which is not a declaration of ${src.name}`);
    assertFeatures(`${label} (${other})`, await featureText(src, also), features);
  }
}
const vendor = { [official.vendorFrame]: official.reactAliases };
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  official.assertVendorAlias(src.code, alias, target);
  return target;
}
// Module state a second copy would split (D46 / D1): a module-level collection, a vendor-frame createContext, or a
// module-level binding the chunk assigns after its declaration.
function isModuleState(src, name) {
  const entry = src.top.get(name);
  if (entry.kind !== 'var') return false;
  const init = entry.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return 'collection';
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.top.get(init.callee.name);
    if (callee?.kind === 'import' && callee.file === official.vendorFrame && official.reactAliases[callee.alias]?.[1] === 'createContext') return 'context';
  }
  // Babel scope analysis of the whole chunk (cached): a top-level binding with a constant violation is written later.
  if (!src.reassigned) {
    const ast = babel.babelParse(src.code, src.name, true);
    babel.traverse(ast, { Program(p) { src.reassigned = new Set(Object.entries(p.scope.bindings).filter(([, b]) => b.constantViolations.length).map(([n]) => n)); p.stop(); } });
  }
  if (src.reassigned.has(name)) return 'reassigned';
  return false;
}

// sharedGraph 'cds-core': manifest version / snapshot, every module's bytes and sourceSha256, publicNames exported.
async function cdsCoreGraph() {
  const area = active.sharedGraph, dir = path.join(generatedRoot, area);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  if (manifest.referenceSnapshot !== referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${referenceSnapshot}`);
  const byTarget = new Map(), held = new Map(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}, expected ${referenceVersion}`);
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
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some((b) => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${area} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  return { area, held, published, manifestSha256: sha(manifestBytes) };
}
// A linked 4.16336.0 area: manifest version / snapshot, module bytes, source hash; chunk#local -> exported name.
async function linkedGraphs() {
  const map = new Map(), pins = [];
  for (const { area, chunks } of active.linkedAreas) {
    const dir = path.join(generatedRoot, area);
    const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
    const manifest = JSON.parse(manifestBytes);
    if (manifest.referenceVersion !== referenceVersion) throw Error(`linked ${area} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
    if (manifest.referenceSnapshot && manifest.referenceSnapshot !== referenceSnapshot) throw Error(`linked ${area} snapshot is ${manifest.referenceSnapshot}, expected ${referenceSnapshot}`);
    for (const chunk of chunks) {
      const mods = manifest.modules.filter((m) => path.basename(m.source) === chunk && !m.part);
      if (mods.length !== 1) throw Error(`linked ${area} holds ${chunk} in ${mods.length} modules, expected 1`);
      const [m] = mods;
      const text = await fs.readFile(path.join(dir, m.target), 'utf8');
      if (sha(text) !== m.sha256) throw Error(`linked ${area}/${m.target} differs from its manifest`);
      const bytes = await fs.readFile(path.join(official.ionSource, chunk));
      if (m.sourceSha256 && m.sourceSha256 !== sha(bytes)) throw Error(`linked ${area}/${m.target} was sliced from another ${chunk}`);
      const exported = new Map();
      for (const e of text.matchAll(/^export \{([^}]*)\};/gm))
        for (const spec of e[1].split(',').map((x) => x.trim()).filter(Boolean)) { const [local, as] = spec.split(/\s+as\s+/); exported.set(local, as ?? local); }
      for (const b of m.bindings) {
        const local = typeof b === 'string' ? b : b.name;
        if (exported.has(local) && !map.has(`${chunk}#${local}`)) map.set(`${chunk}#${local}`, { from: `../${area}/${m.target}`, name: exported.get(local), area, target: m.target });
      }
      pins.push({ area, target: m.target, source: chunk, sha256: m.sha256, manifestSha256: sha(manifestBytes) });
    }
  }
  return { map, pins, used: new Set() };
}

const memberAlias = (ns, member) => `${ns}$${member}`;
// The contract a run reads: `contract`, or (tests only) a variant, which runs check / dry-run / survey only and never writes.
let active = contract;

export async function extractTurnPlanV4({ check = false, dryRun = false, survey = false, variant } = {}) {
  if (variant && !(check || dryRun || survey)) throw Error('extract-turn-plan-v4: a contract variant runs with check / dryRun / survey only');
  active = variant ?? contract;
  try {
    return await run({ check: variant ? false : check, dryRun: variant ? true : dryRun, survey });
  } finally { active = contract; }
}
async function run({ check, dryRun, survey }) {
  const cache = new Map();
  const graph = await cdsCoreGraph();
  const linked = await linkedGraphs();
  const stateConflicts = [], surveyLog = { autoModules: [], partStrays: [], linkedHits: [], heldResliced: [] };
  const key = (side, file) => `${side}/${file}`;
  const specKey = (spec) => key(spec.side, spec.source) + (spec.part ? `#${spec.part}` : '');
  const specs = active.modules.map((spec) => ({ ...spec }));
  const state = new Map(specs.map((spec) => [specKey(spec), { key: specKey(spec), spec: { ...spec, exports: spec.exports ?? {} },
    locals: new Set([...(spec.locals ?? []), ...Object.keys(spec.exports ?? {})]), selected: new Map(), imports: new Map(), rewrites: new Map(), seen: new Set(), shared: new Set(), heldByCdsCore: [] }]));
  const stateFor = (side, file, name) => {
    const part = specs.find((spec) => spec.part && spec.side === side && spec.source === file && state.get(specKey(spec)).locals.has(name));
    let st = state.get(part ? specKey(part) : key(side, file));
    if (!st && survey) {
      // --survey: an unlisted chunk becomes a module of its own, reported so the contract can list it.
      const spec = { side, source: file, target: `${file.replace(/\.js$/, '')}.mjs`, exports: {} };
      specs.push(spec);
      st = { key: specKey(spec), spec, locals: new Set(), selected: new Map(), imports: new Map(), rewrites: new Map(), seen: new Set(), shared: new Set(), heldByCdsCore: [] };
      state.set(st.key, st);
      surveyLog.autoModules.push(`${side}:${file}`);
    }
    return st;
  };
  const importExport = async (st, side, depFile, alias, localName, via, reachedBy) => {
    const target = st.spec.target;
    const dep = await readSource(side, depFile, cache);
    const local = dep.exported.get(alias);
    if (!local) throw Error(`${target}: ${via} is not exported`);
    const adapter = active.adapters[depFile]?.[alias];
    if (adapter) {
      if (adapter.local !== local) throw Error(`${target}: adapter alias ${via} is ${local}, expected ${adapter.local}`);
      await assertAdapter(`${target}: adapter ${via}`, dep, local, adapter);
      st.imports.set(localName, { from: adapter.module, name: adapter.name, via, kind: 'adapter', original: local });
      return;
    }
    const react = side === 'renderer' ? vendorImport(depFile, alias, dep) : null;
    if (react) { st.imports.set(localName, { from: react[0], name: react[1], via, kind: 'react' }); return; }
    if (side === 'renderer') {
      const k = `${depFile}#${local}`, shared = graph.published.get(k);
      if (shared) {
        const held = graph.held.get(k), entry = dep.top.get(local);
        if (!held?.sha256 || !entry?.node || held.sha256 !== sha(declarationText(dep, entry))) throw Error(`${target}: ${k} differs from the declaration ${graph.area} publishes as ${shared.name}`);
        st.imports.set(localName, { from: `../${graph.area}/${shared.target}`, name: shared.exportName, via, kind: 'shared-graph', original: local, linkedSha256: held.sha256 });
        return;
      }
      const link = linked.map.get(k);
      if (link) { linked.used.add(k); st.imports.set(localName, { from: link.from, name: link.name, via, kind: 'linked', original: local }); return; }
    }
    const owner = stateFor(side, depFile, local);
    if (!owner) throw Error(`${target}: unresolved import ${via} (${local}); ${depFile} is not a listed chunk`);
    const dentry = dep.top.get(local);
    if (!dentry || dentry.kind === 'import' || dentry.kind === 'require') throw Error(`${target}: ${via} (${local}) is a re-export`);
    await add(side, depFile, local, reachedBy);
    if (owner === st && st.spec.source === depFile) return;
    st.imports.set(localName, { from: `./${owner.spec.target}`, name: null, chunk: owner.key, local, via, kind: 'generated' });
  };
  const add = async (side, file, name, reachedBy = []) => {
    const st = stateFor(side, file, name);
    if (!st) throw Error(`the closure enters ${file}, which is not a listed chunk (${[...reachedBy, name].join(' -> ')})`);
    if (st.seen.has(name)) return;
    st.seen.add(name);
    const src = await readSource(side, file, cache);
    const entry = src.top.get(name);
    if (!entry) throw Error(`${st.spec.target}: unbound ${name}`);
    const trail = [...reachedBy, `${file}#${name}`];
    if (entry.kind === 'import') { await importExport(st, side, entry.file, entry.alias, name, `${entry.file}:${entry.alias}`, trail); return; }
    if (entry.kind === 'require') throw Error(`${st.spec.target}: ${name} is a CommonJS namespace`);
    const isRoot = Object.hasOwn(st.spec.exports, name);
    const localAdapter = Object.entries(active.adapters[file] ?? {}).find(([, a]) => a.local === name && !isRoot);
    if (localAdapter) {
      const [alias, adapter] = localAdapter;
      if (src.exported.get(alias) !== name) throw Error(`${st.spec.target}: adapter alias ${file}:${alias} is ${src.exported.get(alias)}, expected ${name}`);
      await assertAdapter(`${st.spec.target}: adapter ${file}#${name}`, src, name, adapter);
      st.imports.set(name, { from: adapter.module, name: adapter.name, via: `${file}#${name}`, kind: 'adapter', original: name });
      return;
    }
    if (side === 'renderer') {
      const k = `${file}#${name}`, shared = graph.published.get(k), held = graph.held.get(k);
      if (shared && isRoot) throw Error(`${st.spec.target}: root ${name} is a ${graph.area} publicName`);
      if (shared) {
        if (!held?.sha256 || held.sha256 !== sha(declarationText(src, entry))) throw Error(`${st.spec.target}: ${k} differs from the declaration ${graph.area} publishes as ${shared.name}`);
        st.imports.set(name, { from: `../${graph.area}/${shared.target}`, name: shared.exportName, via: k, kind: 'shared-graph', original: name, linkedSha256: held.sha256 });
        return;
      }
      const link = isRoot ? null : linked.map.get(k);
      if (link) { linked.used.add(k); st.imports.set(name, { from: link.from, name: link.name, via: k, kind: 'linked', original: name }); return; }
      // D46: module state cds-core holds without a publicName stops generation (roots included); a pure binding is
      // cut again only when it hashes as cds-core's.
      if (held) {
        const kind = isModuleState(src, name);
        if (kind) { stateConflicts.push({ binding: k, heldBy: `${graph.area}/${held.target}`, kind, text: declarationText(src, entry).slice(0, 400), reachedBy: trail.join(' -> ') }); return; }
        if (held.sha256 !== sha(declarationText(src, entry))) throw Error(`${st.spec.target}: ${k} differs from the declaration ${graph.area}/${held.target} holds`);
        st.heldByCdsCore.push(name);
      }
    }
    if (entry.kind !== 'function' && entry.kind !== 'var') throw Error(`${st.spec.target}: unsupported declaration ${name}`);
    const text = declarationText(src, entry);
    if (/\bimport\s*\(/.test(text) || /\brequire\s*\(/.test(text)) throw Error(`${st.spec.target}: dynamic import inside ${name}`);
    st.selected.set(name, entry);
    for (const dep of declarationDeps(src, name)) {
      const depEntry = src.top.get(dep.name);
      if (depEntry.kind === 'require') {
        for (const { member } of dep.members) {
          const alias = memberAlias(dep.name, member);
          if (!st.imports.has(alias)) await importExport(st, side, depEntry.file, member, alias, `${depEntry.file}:${member}`, trail);
        }
        st.rewrites.set(name, [...(st.rewrites.get(name) ?? []), ...dep.members.map((m) => ({ ...m, alias: memberAlias(dep.name, m.member) }))]);
      } else {
        const owner = stateFor(side, file, dep.name);
        if (owner !== st) {
          if (st.spec.part) {
            if (!survey) throw Error(`${st.spec.target}: ${name} reads ${dep.name}, which is not one of the part's locals`);
            surveyLog.partStrays.push(`${st.spec.target}: ${name} -> ${dep.name}`);
          }
          st.imports.set(dep.name, { from: `./${owner.spec.target}`, name: null, chunk: owner.key, local: dep.name, via: `${file}#${dep.name}`, kind: 'generated', pending: true });
        }
        await add(side, file, dep.name, trail);
      }
    }
  };
  for (const st of [...state.values()]) {
    const src = await readSource(st.spec.side, st.spec.source, cache);
    for (const name of Object.keys(st.spec.exports)) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import' || entry.kind === 'require') throw Error(`${st.spec.target}: root ${name} is not a declaration of ${st.spec.source}`);
      await assertUniqueRoot(`${st.spec.target}`, src, name, st.spec.features?.[name], st.spec.exportAlias?.[name]);
      await add(st.spec.side, st.spec.source, name, [`${st.spec.target}:${st.spec.exports[name]}`]);
    }
  }
  // An import of a binding that ended up linked / shared / adapted (not selected in its owner) takes that resolution.
  for (const st of state.values()) for (const [local, entry] of st.imports) {
    if (entry.kind !== 'generated') continue;
    const owner = state.get(entry.chunk);
    if (!owner.selected.has(entry.local)) {
      const resolved = owner.imports.get(entry.local);
      if (!resolved) {
        if (stateConflicts.length) { st.imports.delete(local); continue; }
        throw Error(`${st.spec.target}: ${entry.local} of ${owner.spec.target} was neither cut nor linked`);
      }
      st.imports.set(local, { ...resolved, via: entry.via });
    }
  }
  const exportName = (chunkKey, local) => {
    const owner = state.get(chunkKey);
    if (Object.hasOwn(owner.spec.exports, local)) return owner.spec.exports[local];
    owner.shared.add(local);
    return local;
  };
  for (const st of state.values()) for (const entry of st.imports.values()) if (entry.kind === 'generated') { entry.name = exportName(entry.chunk, entry.local); delete entry.pending; }
  // linkExports: bindings another graph links from this one, exported under their original names (each must be cut here).
  for (const st of state.values()) for (const local of st.spec.linkExports ?? []) {
    if (!st.selected.has(local)) throw Error(`${st.spec.target}: linkExports ${local} is not in the closure`);
    if (!Object.hasOwn(st.spec.exports, local)) st.shared.add(local);
  }
  if (stateConflicts.length) {
    const error = Error(`module state ${graph.area} holds without a semantic name (D46): ${stateConflicts.map((c) => c.binding).join(', ')}`);
    error.stateConflicts = stateConflicts;
    if (survey) return { survey: surveyLog, stateConflicts };
    throw error;
  }
  const unused = [...state.values()].filter((st) => st.selected.size === 0).map((st) => st.spec.target);
  if (unused.length && !survey) throw Error(`listed modules the closure never enters: ${unused.join(', ')}`);
  const unusedLinks = active.linkedAreas.flatMap(({ area, chunks }) => chunks.filter((c) => ![...linked.used].some((k) => k.startsWith(`${c}#`) && linked.map.get(k).area === area)).map((c) => `${area}:${c}`));
  if (unusedLinks.length && !survey) throw Error(`linked chunks the closure never reads: ${unusedLinks.join(', ')}`);
  const order = [], mark = new Map();
  const visit = (chunkKey, trail) => {
    if (mark.get(chunkKey) === 'done') return;
    if (mark.get(chunkKey) === 'open') throw Error(`generated modules import each other: ${[...trail, chunkKey].join(' -> ')}`);
    mark.set(chunkKey, 'open');
    for (const entry of state.get(chunkKey).imports.values()) if (entry.kind === 'generated' && entry.chunk !== chunkKey) visit(entry.chunk, [...trail, chunkKey]);
    mark.set(chunkKey, 'done');
    order.push(chunkKey);
  };
  for (const st of state.values()) if (st.selected.size) visit(st.key, []);

  const manifests = {
    renderer: { referenceVersion, referenceSnapshot, generator: 'scripts/extract-turn-plan-v4.mjs', adapterModule: 'src/source-turn-box-adapters.jsx', sharedGraph: graph.area,
      sharedGraphManifestSha256: graph.manifestSha256, isolatedGraph: active.isolatedGraph, linkedAreas: linked.pins.filter((p) => [...linked.used].some((k) => k.startsWith(`${p.source}#`))), modules: [], callSites: [] },
    main: { referenceVersion, referenceSnapshot, generator: 'scripts/extract-turn-plan-v4.mjs', adapterModule: 'electron/turn-plan-adapters.mjs', isolatedGraph: active.isolatedGraph, modules: [], callSites: [] },
  };
  const files = { renderer: {}, main: {} };
  for (const chunkKey of order) {
    const st = state.get(chunkKey), { spec } = st;
    const src = await readSource(spec.side, spec.source, cache);
    const decls = [...st.selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = decls.map(([name, entry]) => {
      let text = emittedText(src, entry);
      const offset = entry.kind === 'var' ? 4 : 0;
      for (const r of [...(st.rewrites.get(name) ?? [])].sort((a, b) => b.start - a.start)) text = text.slice(0, r.start) + r.alias + text.slice(r.end);
      return offset ? text : text;
    });
    const groups = new Map();
    for (const [local, entry] of [...st.imports].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exported = [...Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)),
      ...[...st.shared].sort().filter((local) => !Object.hasOwn(spec.exports, local))];
    const exportText = exported.length ? `export { ${exported.join(', ')} };` : '';
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.side === 'main' ? 'asar/.vite/build/' : ''}${spec.source}; generated by extract-turn-plan-v4.mjs.\n// Edit the extractor or ${spec.side === 'main' ? 'electron/turn-plan-adapters.mjs' : 'src/source-turn-box-adapters.jsx'}, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const closed = babel.babelParse(text, spec.target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter((name) => !active.allowedGlobals.has(name));
    if (unbound.length) {
      if (!survey) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
      (surveyLog.unbound ??= []).push(`${spec.target}: ${unbound.join(', ')}`);
    }
    files[spec.side][spec.target] = text;
    manifests[spec.side].modules.push({
      target: spec.target, source: spec.source, ...(spec.part ? { part: spec.part } : {}), sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: decls.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...st.imports].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}), ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      exports: spec.exports, ...(spec.exportAlias ? { exportAlias: spec.exportAlias } : {}), ...(spec.linkExports ? { linkExports: spec.linkExports } : {}), sharedExports: [...st.shared].sort(),
      ...(spec.side === 'renderer' ? { heldByCdsCore: st.heldByCdsCore } : {}),
    });
  }
  for (const site of active.callSites) {
    const src = await readSource('renderer', site.source, cache);
    const entry = src.top.get(site.binding);
    if (!entry || entry.kind === 'import' || entry.kind === 'require') throw Error(`call site ${site.source}:${site.binding} is not a declaration`);
    assertFeatures(`call site ${site.source}:${site.binding}`, await featureText(src, entry), site.features);
    manifests.renderer.callSites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(declarationText(src, entry)), features: site.features });
  }
  for (const site of active.rawCallSites) {
    const side = site.main ? 'main' : 'renderer';
    const bytes = await fs.readFile(path.join(sources[side], site.source));
    const code = bytes.toString();
    for (const feature of site.features) {
      const count = code.split(feature).length - 1;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifests[side].callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  if (survey) {
    for (const k of order) {
      const st = state.get(k), src = await readSource(st.spec.side, st.spec.source, cache);
      if (st.spec.side !== 'renderer') { st.moduleState = []; continue; }
      st.moduleState = [...st.selected.keys()].map((b) => [b, isModuleState(src, b)]).filter(([, kind]) => kind).map(([b, kind]) => `${b}:${kind}`);
    }
    surveyLog.modules = Object.fromEntries(order.map((k) => [k, { target: state.get(k).spec.target, bindings: [...state.get(k).selected.keys()], heldByCdsCore: state.get(k).heldByCdsCore, moduleState: state.get(k).moduleState,
      imports: [...state.get(k).imports].map(([l, e]) => `${l}<-${e.kind}:${e.via}${e.name && e.name !== l ? '=' + e.name : ''}`) }]));
    return { survey: surveyLog, manifests, unused, unusedLinks };
  }
  for (const side of ['renderer', 'main']) files[side]['manifest.json'] = JSON.stringify(manifests[side], null, 2) + '\n';
  if (!dryRun) {
    for (const side of ['renderer', 'main']) {
      const output = outputs[side];
      const present = async () => (await fs.readdir(output, { withFileTypes: true }).catch(() => [])).filter((d) => d.isFile()).map((d) => d.name).sort();
      if (check) {
        const expected = Object.keys(files[side]).sort(), now = await present();
        if (JSON.stringify(now) !== JSON.stringify(expected)) throw Error(`Turn plan ${referenceVersion} output set changed in ${path.relative(root, output)}: ${now.join(',')}. Run scripts/extract-turn-plan-v4.mjs.`);
        for (const [name, text] of Object.entries(files[side]))
          if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Turn plan ${referenceVersion} source mismatch: ${path.relative(root, path.join(output, name))}. Run scripts/extract-turn-plan-v4.mjs.`);
      } else {
        await fs.mkdir(output, { recursive: true });
        for (const name of await present()) if (!(name in files[side])) await fs.rm(path.join(output, name));
        for (const [name, text] of Object.entries(files[side])) await fs.writeFile(path.join(output, name), text);
      }
    }
  }
  const count = [...manifests.renderer.modules, ...manifests.main.modules].reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : dryRun ? 'Dry-ran' : 'Extracted'} ${manifests.renderer.modules.length + manifests.main.modules.length} turn plan ${referenceVersion} modules (${count} original bindings; ${manifests.renderer.callSites.length + manifests.main.callSites.length} pinned call sites; ${graph.area} ${graph.manifestSha256.slice(0, 8)}; linked ${manifests.renderer.linkedAreas.map((p) => `${p.area}/${p.target}`).join(', ') || 'none'}).`);
  return manifests;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const survey = process.argv.includes('--survey');
  try {
    const result = await extractTurnPlanV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run'), survey });
    if (survey) console.log(JSON.stringify(result.survey ? { ...result, manifests: undefined } : result, null, 2));
  } catch (error) {
    if (error.stateConflicts) console.error(JSON.stringify({ stateConflicts: error.stateConflicts }, null, 2));
    throw error;
  }
}
