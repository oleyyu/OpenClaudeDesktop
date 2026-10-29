// Turn plan (the task list card's data): extract the 3.6556.2 `update_plan` / `wrap_up` tools of the `ccd_turn` server
// and the renderer's reading of their calls, without executing any desktop runtime (decision D0: own generator, own output
// folders, own scripts/verify-gen-turn-plan.mjs).
//
// Main process (asar/.vite/build, CommonJS chunks; 3.6556.2 since w2-tr-turn) -> electron/generated/turn-plan/ (the
// agent-tools module imports it, and src/ is not packaged, D47):
//   ccd-turn.mjs      index.chunk-DBIg6EBr.js: Yt (the ccd_turn server definition: update_plan with _t's description and
//                     vt's inputSchema, wrap_up with jt(t) / Nt; t = Dt() picks the closing-message wording kt or At),
//                     Jt (createToolHandler: the update_plan branch validates items / scope / advance / done / start and
//                     answers "Plan shown (n steps)." / "Plan updated: …"; the wrap_up branch comes along unused), Qe
//                     (the sub-agent refusal), et (an empty turn plan, now with unreadRefusals), We / Ke / Ge / Ue (status
//                     updates, the status line, the bad step number text, the step number check), Ze / Xe
//                     (mcp__ccd_turn__update_plan / wrap_up), it (the PostToolUse / SessionStart hooks).
//   text-guards.mjs   index.chunk-jPKPzV-P.js: the MCP text / error results (Wf / Uf; 2.42304.0 BemIcaFh) and what the
//                     handler runs a step's content through before counting it.
//   remote-control.mjs  index.chunk-DlYkVJEe.js: the Remote Control note the handler names.
// Renderer (ion-dist/assets/v1, ES modules; 3.6556.2 since w8-turn-plan-renderer) -> src/generated/turn-plan/:
//   plan-update.mjs   cb27dab29: z (a plan from update_plan's items: content cleaned by H, status pending unless
//                     completed / in_progress, an optional side-session name, at most 12, `plan-<n>` ids), Ce (an update
//                     applied to a plan: items replaces it, else ve advance / done / start), Se / be and R / ye (the
//                     tools' names), Me (a wrap_up input read), De (the box's wrap-up while a suggestion is pending), Ne
//                     (an old-style outcome call's text).
//   turn-tail.mjs     c4ea84cb3 Br / Er / Y (the turn tail: plan, planBeforeWrapUp, wrapUp and its receipt,
//                     closingMessageFollows, planCutShort, turnSettled, …), Ir / Rr (the wrap-ups that settled earlier
//                     turns, by prompt, and their receipts).
//   settled-turn-box.mjs  c96d752d0 Ytt (the settled wrap-up receipt row over cb6930dae's question receipt), r8 / i8 / dN.
//   wrap-up-chips.mjs  c96d752d0 eH (a wrap-up reply as a chip), a `part` of that chunk of its own (E42: the plain turn
//                     tail reads it; the compiled Ytt and the .jsx adapters stay out of its import graph).
//   …                 the originals those read, one module per chunk; React Compiler helpers and CDS from view-tabs (E3).
//
// Every emitted binding is an original top-level declaration sliced from the installed chunk; a module's bindings are
// the reachable closure of its roots (free variables found with Babel's scope analysis). An ES import, or a CommonJS
// `ns.member` of a `ns = require("./chunk")`, is followed into the chunk it names; it resolves to a named host adapter
// (electron/turn-plan-adapters.mjs; its original declaration must carry `features`) or the declaration in a listed
// chunk. Anything else stops generation. `callSites` / `rawCallSites` pin original text the host follows but does not
// import (where the renderer applies update_plan calls, that the transcript skips their rows, the per-session gate).
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
// 3.6556.2 migration: the main-process side (electron/generated/turn-plan, the ccd_turn server the agent tools serve)
// moved in w2-tr-turn, the renderer side (src/generated/turn-plan) in w8-turn-plan-renderer, with the turn box; both read
// 3.6556.2 (official-3.6556.2.mjs, R1).
const { referenceVersion, referenceSnapshot } = official;
const rendererSource = official.ionSource;
const mainSource = official.asarSource;
const sideReference = {
  renderer: { referenceVersion, referenceSnapshot },
  main: { referenceVersion, referenceSnapshot },
};
const loose = (text) => ({ loose: text });
const outputs = { renderer: path.join(root, 'src/generated/turn-plan'), main: path.join(root, 'electron/generated/turn-plan') };
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

// Host dependencies of the main-process closure: chunk -> export -> { name (adapter export), local (the declaration the
// export must still name), features (in its prettier form) }.
const adapterModule = '../../turn-plan-adapters.mjs';
const rendererAdapters = '../../source-turn-box-adapters.jsx';
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog: the turn box's own adapters (source-turn-box-adapters.jsx,
  // the same pins as extract-turn-box.mjs).
  [official.vendorIntl]: {
    p: { module: rendererAdapters, name: 'useIntl', local: 'q', features: [loose('return (Mt(e), e);')], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
    l: { module: rendererAdapters, name: 'FormattedMessage', local: 'Gt', features: [loose('var Gt = c(Wt, Ut);')], also: { Wt: ['p = i({ id: o, description: s, defaultMessage: c }, l, { ignoreTag: f });'] } },
  },
  // c96d752d0 QV (exported ir; Ytt calls it in its own chunk): appFeatures.turnBoxAtReplies. The 3.6556.2 main process
  // reports it supported (index.chunk-jPKPzV-P JU `turnBoxAtReplies:RU`, `RU={status:"supported"}`); host: true, the
  // turn box's own adapter.
  'c96d752d0-CWv_7-n9.js': {
    ir: { module: rendererAdapters, name: 'useTurnBoxAtReplies', local: 'QV', features: [loose('return ma(mLe);')], also: { mLe: ['e.appFeatures?.turnBoxAtReplies?.status === "supported"'] } },
  },
  // 3.6556.2: index.chunk-muI2IV6k -> index.chunk-jPKPzV-P (E33: matched on the export name and features).
  'index.chunk-jPKPzV-P.js': {
    // GrowthBook: st() = m0("2371478310") turns the ccd_turn tools on (host: on for this flag by the user's decision, D49).
    m0: { name: 'growthBookOn', local: 'Pb', features: ['if (Nb.has(e)) return !1;', 'if (Mb.has(e)) return !0;', 'return (Ab(e, t), t?.on ?? !1);'] },
    // GrowthBook with a default: Dt() = h0("2833454025", !0) (the wrap_up closing-message wording) and h0(Et, !0).
    h0: { name: 'growthBookValue', local: 'Fb', features: ['if (Nb.has(e)) return !1;', 'return (Ab(e, n), n?.on ?? t);'] },
    // Event logging (desktop_ccd_turn_scope): nothing is sent (D17).
    uz: { name: 'logEvent', local: 'Q', features: ['[EventLogging] Queuing event: %s | metadata: %o'] },
  },
};

const modules = [
  // 3.6556.2 main process: index.chunk-B5tintml -> index.chunk-DBIg6EBr (Qt -> Yt, Zt -> Jt, ft -> it, …).
  { side: 'main', target: 'ccd-turn.mjs', source: 'index.chunk-DBIg6EBr.js',
    exports: { Yt: 'turnServerDefinition', Jt: 'createTurnToolHandler', Qe: 'SUBAGENT_TURN_TOOL_REFUSAL', et: 'emptyTurnPlan', We: 'applyPlanStatuses',
      Ke: 'planStatusLine', Ge: 'badStepNumberText', Ue: 'isStepNumber', Ze: 'UPDATE_PLAN_TOOL_NAME', Xe: 'WRAP_UP_TOOL_NAME', Ye: 'UPDATE_PLAN', qe: 'TURN_SERVER',
      Je: 'WRAP_UP', it: 'turnPlanHooks', Tt: 'END_TURN_META', jt: 'wrapUpDescription', kt: 'WRAP_UP_CLOSING_FOLLOWS', At: 'WRAP_UP_BOX_ENDS_TURN' },
    features: {
      Yt: ['serverName: qe,', 'description: _t(e),', 'description: jt(t),', 'alwaysLoad: !0,', 'isEnabled: (e) => e.sessionType === "ccd" && e.turnBoxEnabled === !0,', 'createToolHandler: Jt,'],
      Jt: ['(n === "update_plan" && r.items !== void 0 && (a.steps = void 0), !st())', '`${n} is turned off right now; write it as text instead.`',
        '"items needs at least one step with content and status."', '`Plan shown (${o.length} steps).', '"desktop_ccd_turn_scope"', 'i.closingFollowsQuestion ?? Dt()',
        'return ie && !o && t.h0(Et, !0) ? { ...ae, _meta: { [Tt]: !0 } } : ae;'],
      Qe: ['"Not shown: you are a subagent, and the app shows only the main conversation\'s task list and wrap-up. Do not call update_plan or wrap_up again; carry on with your task and report your result as usual."'],
      et: ['return { steps: void 0, promptId: void 0, wrappedUpIn: void 0, unreadRefusals: new Set() };'],
      We: ['if (Array.isArray(t.done))', 'let t = n.indexOf("pending", e + 1),'],
      Ke: ['"every step is done"', '`no step is in progress (${n} of ${e.length} done); {"start": n} starts one`'],
      Ge: ['`Nothing changed: done and start take whole step numbers counted from 1, and ${e === void 0 ? "a list has at most 12 steps" : `the list has ${e} step${e === 1 ? "" : "s"}`}.'],
      Ue: ['return typeof e == "number" && Number.isInteger(e) && e >= 1 && e <= t;'],
      Je: ['"wrap_up"'], Ye: ['"update_plan"'], qe: ['"ccd_turn"'], Tt: ['"claude/endTurn"'],
      it: ['matcher: `${Ze}|${Xe}`,', '(t.tool_name === Ze', '(n.wrappedUpIn = t.prompt_id)', 'Also still to do in this turn, on top of what the summary above lists'],
      Ze: ['`mcp__${qe}__${Ye}`'], Xe: ['`mcp__${qe}__${Je}`'],
      jt: ['Fill the "next step" box the app shows at the end of your turn', '${e ? kt : At}', 'a go-ahead to fix, commit, push, post or send'],
      kt: ['"Your closing message is ordinary text right after this call, the last thing you say this turn: your answer to the user in full, which the recap never replaces.'],
      At: ['"The result says which case below applies. When the box shows your question, it ends your turn:'],
    } },
  { side: 'main', target: 'text-guards.mjs', source: 'index.chunk-jPKPzV-P.js' },
  { side: 'main', target: 'remote-control.mjs', source: 'index.chunk-DlYkVJEe.js' },
  // 3.6556.2 renderer (w8-turn-plan-renderer): cb27dab29 z / Se / _e / xe / ye / R / ve / Me / Ee / je -> z / Ce / ve / Se / be
  // / R / ye / Ne / De / Me (the names were reused: 3.6556.2 `ve` is the step statuses, `be` update_plan's name).
  // 3.6556.2 renderer (w8-turn-plan-renderer): cb27dab29 z / Se / _e / xe / ye / R / ve / Me / Ee / je -> z / Ce / ve / Se / be
  // / R / ye / Ne / De / Me (the names were reused: 3.6556.2 `ve` is the step statuses, `be` update_plan's name).
  // 3.6556.2 renderer (w8-turn-plan-renderer): cb27dab29 z / Se / _e / xe / ye / R / ve / Me / Ee / je -> z / Ce / ve / Se / be
  // / R / ye / Ne / De / Me (the names were reused: 3.6556.2 `ve` is the step statuses, `be` update_plan's name).
  // 3.6556.2 renderer (w8-turn-plan-renderer): cb27dab29 z / Se / _e / xe / ye / R / ve / Me / Ee / je -> z / Ce / ve / Se / be
  // / R / ye / Ne / De / Me (the names were reused: 3.6556.2 `ve` is the step statuses, `be` update_plan's name).
  // 3.6556.2 renderer (w8-turn-plan-renderer): cb27dab29 z / Se / _e / xe / ye / R / ve / Me / Ee / je -> z / Ce / ve / Se / be
  // / R / ye / Ne / De / Me (the names were reused: 3.6556.2 `ve` is the step statuses, `be` update_plan's name).
  // 3.6556.2 renderer (w8-turn-plan-renderer): cb27dab29 z / Se / _e / xe / ye / R / ve / Me / Ee / je -> z / Ce / ve / Se / be
  // / R / ye / Ne / De / Me (the names were reused: 3.6556.2 `ve` is the step statuses, `be` update_plan's name).
  // 3.6556.2 renderer (w8-turn-plan-renderer): cb27dab29 z / Se / _e / xe / ye / R / ve / Me / Ee / je -> z / Ce / ve / Se / be
  // / R / ye / Ne / De / Me (the names were reused: 3.6556.2 `ve` is the step statuses, `be` update_plan's name).
  // 3.6556.2 renderer (w8-turn-plan-renderer): cb27dab29 z / Se / _e / xe / ye / R / ve / Me / Ee / je -> z / Ce / ve / Se / be
  // / R / ye / Ne / De / Me (the names were reused: 3.6556.2 `ve` is the step statuses, `be` update_plan's name).
  { side: 'renderer', target: 'plan-update.mjs', source: 'cb27dab29-B4WyL7_M.js',
    exports: { z: 'planFromItems', Ce: 'applyPlanUpdate', ve: 'applyStepStatuses', Se: 'isUpdatePlanTool', be: 'UPDATE_PLAN_TOOL',
      R: 'isWrapUpTool', ye: 'WRAP_UP_TOOL', Ne: 'legacyWrapUpText', De: 'wrapUpShown', Me: 'parseWrapUp' },
    features: {
      z: ['r = H(t, "content");', 't.status === "completed" || t.status === "in_progress"', 'id: `plan-${n.length}`', 'n.length >= 12', '...(a === void 0 ? {} : { session: a })'],
      Ce: ['if (Array.isArray(t.items)) return z(t);', 'return e.map((e, t) => ({ ...e, status: n[t] }));'],
      ve: ['t.advance === !0 || t.advance === "true"', 'let t = n.indexOf("pending", e + 1),'], Se: [loose('return e === be;')], be: ['be = "mcp__ccd_turn__update_plan"'],
      R: [loose('return e === ye;')], ye: ['ye = "mcp__ccd_turn__wrap_up"'], Ne: ['["outcome", "failures", "not_verified", "needs_user"]'],
      De: ['return t && e?.blocked !== !0 ? null : e;'], Me: ['let t = H(e, "recap") ?? H(e, "next_recap") ?? H(e, "outcome");'],
    } },
  // c1ebb1aa4 Rt / Et / Bt / Ft / It -> c4ea84cb3 Br / Er / Y / Ir / Rr (Br now also derives closingMessageFollows and
  // planCutShort, and reads turnBoxAtReplies as its fifth argument; Ir takes it fourth).
  { side: 'renderer', target: 'turn-tail.mjs', source: 'c4ea84cb3-rXGDAnKH.js',
    exports: { Br: 'deriveTurnTail', Er: 'EMPTY_TURN_TAIL', Y: 'turnTailEqual', Ir: 'wrapUpsByPrompt', Rr: 'wrapUpReceipt' },
    features: {
      Br: [loose('o = a ? jr : B,'), 'closingMessageFollows: he !== null && Lr(e, he),', 'planCutShort: x && !C,', loose('let pe = Ir(e, (e) => e === t, !0, i).get(null),'),
        '(j = j.map((e) => ({ ...e, status: "completed" })))', 'workedWithoutWrapUp: te && ne === !0 && me === null,'],
      Er: ['closingMessageFollows: !1,', 'planBeforeWrapUp: null,', 'planCutShort: !1,', 'proposedTaskIds: Object.freeze([]),'],
      Y: ['e.planCutShort === t.planCutShort &&', 'e.closingMessageFollows === t.closingMessageFollows &&'],
      Ir: ['i?.opensTurn(f.uuid)', 'let n = { ...e, callId: t.id ?? null };'], Rr: ['return t ? (n ? e : { ...e, recap: "" }) : null;'],
    } },
  // c96d752d0 Itt / R8 / z8 / AL -> Ytt / r8 / i8 / dN (r8 now reads turnBoxAtReplies QV for the reply chips).
  { side: 'renderer', target: 'settled-turn-box.mjs', source: 'c96d752d0-CWv_7-n9.js',
    exports: { Ytt: 'SettledTurnBox', r8: 'settledTurnBoxPairs', i8: 'settledTurnBoxRecap', dN: 'promptOfRow' },
    features: { Ytt: [loose('r8(e, t, n)'), loose('f(cy, { recap: i, pairs: a })')], r8: ['e.ruleId !== "new_session" &&', 'if (n)'], i8: [loose('return dd(e.recap) ?? "";')], dN: [] } },
  // E42: the wrap-up reply chip (eH) the plain turn tail reads (c4ea84cb3 J: `Re(a, t)`), as a part of c96d752d0 of its
  // own, so turn-tail.mjs does not import the compiled SettledTurnBox (and the .jsx adapters) with it.
  { side: 'renderer', target: 'wrap-up-chips.mjs', source: 'c96d752d0-CWv_7-n9.js', part: 'chips',
    exports: { eH: 'wrapUpSendChip' }, locals: ['hLe', '$V', 'dd', 'wme', 'Ele', 'Dle', '_n'],
    features: { eH: ['key: `wrap:${n}`,', 'source: "model",', 'sendText: a === o ? void 0 : a,'] } },
  // The originals the roots read, one module per chunk (as extract-turn-box.mjs slices the same chunks).
  { side: 'renderer', target: 'secret-redaction.mjs', source: 'shared-104-CTONUSaz.js' },
  { side: 'renderer', target: 'strip-markup.mjs', source: 'shared-2-TF8v67kg.js' },
  { side: 'renderer', target: 'c06cf64bb.mjs', source: 'c06cf64bb-CdJdJuVd.js' },
  { side: 'renderer', target: 'c8479260c.mjs', source: 'c8479260c-D5Ma9EoG.js' },
  { side: 'renderer', target: 'shared-11.mjs', source: 'shared-11-_AVGLHEz.js' },
  { side: 'renderer', target: 'cd4f82e77.mjs', source: 'cd4f82e77-CAMIsQ30.js' },
  { side: 'renderer', target: 'shared-0.mjs', source: 'shared-0-DDOOdL6P.js' },
  { side: 'renderer', target: 'shared-18.mjs', source: 'shared-18-D3y8YMFN.js' },
  { side: 'renderer', target: 'shared-52.mjs', source: 'shared-52-uHFNjl7C.js' },
  { side: 'renderer', target: 'cb6930dae.mjs', source: 'cb6930dae-Dw_4c1QI.js' },
  { side: 'renderer', target: 'c6dc54e94.mjs', source: 'c6dc54e94-E5GA6ry5.js' },
  { side: 'renderer', target: 'c2f6611a3.mjs', source: 'c2f6611a3-DBT6B0Bq.js' },
  { side: 'renderer', target: 'shared-1.mjs', source: 'shared-1-BJhqMmkf.js' },
  { side: 'renderer', target: 'shared-25.mjs', source: 'shared-25-DOWZRSlq.js' },
  { side: 'renderer', target: 'context-markers.mjs', source: 'cb0636f7b-jouCT0V2.js' },
  { side: 'renderer', target: 'shared-78.mjs', source: 'shared-78-D5Fw2h0a.js' },
  { side: 'renderer', target: 'define-messages.mjs', source: official.vendorIntl },
  { side: 'renderer', target: 'shared-130.mjs', source: 'shared-130-dWztbTO1.js' },
  { side: 'renderer', target: 'cd4fb5ac7.mjs', source: 'cd4fb5ac7-BD73PU5C.js' },
  { side: 'renderer', target: 'c4d199b75.mjs', source: 'c4d199b75-D3cQB-UP.js' },
  { side: 'renderer', target: 'c8187a2dc.mjs', source: 'c8187a2dc-Dp9Zia_4.js' },
  { side: 'renderer', target: 'shared-7.mjs', source: 'shared-7-DBAgAi5H.js' },
  { side: 'renderer', target: 'shared-182.mjs', source: 'shared-182-BI1KJccu.js' },
  { side: 'renderer', target: 'shared-frame.mjs', source: official.sharedFrame },
];

// Prettier form of a named top-level declaration the host follows but does not import.
const callSites = [
  { source: 'c4ea84cb3-rXGDAnKH.js', binding: 'Wr', role: 'The turn tail hook (cccc2cf0a xy): the update_plan branch when the session has the turn box (r = yt(e), no TaskCreate todos), with the running agents and turnBoxAtReplies (o = N() = c96d752d0 QV); host: src/turn-plan-model.mjs codeTurnTail over TurnBoxHost.turnTail',
    features: [loose('{ todos: i } = Sn(r ? null : e),'), loose('n.length === 0 ? Er : Ur(n, t, r ? void 0 : i, a, o)'), loose('return v(s, Y);')] },
  { source: 'c4ea84cb3-rXGDAnKH.js', binding: 'Ur', role: 'Wr caches the derivation per message array (keyed by latestPromptId, taskTodos, runningAgents and atReplies) before Br runs',
    features: [loose('let s = Br(e, t, n, r, i);'), 'e.atReplies === i'] },
  { source: 'c4ea84cb3-rXGDAnKH.js', binding: 'zr', role: 'settledWrapUps: every prompt row’s preceding wrap_up that settles (Rr), unless its call was dismissed; turns opened by a non-bubble user row add their calls (host: every prompt is a bubble, so src/turn-plan-model.mjs settledWrapUps reads Ir over the prompts alone)',
    features: [loose('s = Ir(e, (e) => i.has(e), !1, r, { opensTurn: (e) => a.has(e), calls: o }),'), loose('e !== null && r !== null && !(t.callId !== null && n.has(t.callId)) && c.set(e, r);')] },
  { source: 'c4ea84cb3-rXGDAnKH.js', binding: 'Jr', role: 'latestWrapUp: shown in the transcript only once the user left the box for it (leftToTranscript); host: not shown (the host has no leave-to-transcript action)',
    features: [loose('!a && p !== null && !c.has(p) && (i === !0 || i === p) && (f.turnSettled || qr(n))')] },
  { source: 'cccc2cf0a-DhZC33Gc.js', binding: 'cj', role: 'EpitaxyTurnNextActionsRow: reads the tail itself and hands ZA wrapUp through _m = cb27dab29 De (a non-blocked wrap-up waits while a suggestion is pending), closingMessageFollows, turnSettled, workedWithoutWrapUp, agentRunning; host: src/source-turn-box.jsx SourceTurnBoxMount',
    features: [loose('} = xy(t.sessionRef, t.latestPromptId),'), loose('K2($, 3, n, r, _m(r, n))'), 'closingMessageFollows: a,', 'turnHasPendingSuggestion: n,', 'agentRunning: p,', 'proposalsPending: d,'] },
  { source: 'c96d752d0-CWv_7-n9.js', binding: 'Ytt', role: 'The settledTurnBox row (pushed before the prompt row that answered it, prompt = dN(row).text); host: main.jsx row',
    features: [loose('f(cy, { recap: i, pairs: a })')] },
];
const rawCallSites = [
  { source: 'c96d752d0-CWv_7-n9.js', role: 'Where the transcript puts a settled wrap-up: before the prompt row it answered (one row per turn the prompt opens), and renders it with Ytt',
    features: ['for(let e of swe(n)){let i=t.settledWrapUps?.get(e);if(i===void 0)continue;let a=e!==(n.sourceUuid??n.id);s.push({kind:"settledTurnBox",id:`turn-box-${L(n,r)}${a?`-${e}`:""}`,wrapUp:i,prompt:dN(n)?.text??"",...!xv(n)&&{unanswered:!0}})}',
      'f(Ytt,{wrapUp:t.wrapUp,prompt:t.prompt,unanswered:e})'] },
  { source: 'cccc2cf0a-DhZC33Gc.js', role: 'cj reads cb27dab29 De (wrapUpShown) as _m', features: ['import{H as _m,I as vm,U as ym,y as bm}from"./cb27dab29-B4WyL7_M.js"'] },
  { source: 'c06cf64bb-CdJdJuVd.js', role: 'A wrap_up tool_use draws no row; only a legacy outcome call (ea = cb27dab29 Ne) shows as text',
    features: ['if(n&&$i(o.name)){let t=Pg.get(o);if(!t){let n=ea(Tg(o.partialJson));if(n===void 0)continue;', 'L as $i', 'R as ea'] },
  { source: 'c06cf64bb-CdJdJuVd.js', role: 'Transcript rows: an update_plan tool_use draws no row when the turn box shows (Qi = cb27dab29 Se); host: withTurnBoxRows',
    features: ['if(n&&Qi(o.name))continue;', 'if(o&&Qi(r.name))continue;', 'F as Qi'] },
  { main: true, source: 'index.chunk-DBIg6EBr.js', role: 'Main process (3.6556.2): the ccd_turn tools are on behind GrowthBook 2371478310 (st, exported bd); Yt is pushed with sideSessions (a!==!1) and the closing-message wording s (SS parameter; default Dt() = h0("2833454025", !0)); the server is for Code sessions with the turn box mounted',
    features: ['function st(){return t.m0("2371478310")}', 'l.push(Yt(a!==!1,s))', 'isEnabled:e=>e.sessionType==="ccd"&&e.turnBoxEnabled===!0', ',Dt=()=>t.h0("2833454025",!0)',
      'Object.defineProperty(exports,"bd",{enumerable:!0,get:function(){return st}})', 'Object.defineProperty(exports,"kd",{enumerable:!0,get:function(){return Qe}})',
      'Object.defineProperty(exports,"Ad",{enumerable:!0,get:function(){return Ze}})', 'Object.defineProperty(exports,"jd",{enumerable:!0,get:function(){return Xe}})',
      'Object.defineProperty(exports,"vd",{enumerable:!0,get:function(){return at}})', 'var at=[Xe,Ze]'] },
  { main: true, source: 'index.chunk-DNPOm2Zc.js', role: 'Main process (3.6556.2): a sub-agent\'s update_plan / wrap_up is denied with Qe (kd, PreToolUse); the tools are allowed without asking (allowedTools vd); turnBoxEnabled = bd() && turnBoxMounted',
    features: ['e.agent_id&&(e.tool_name===n.Ad||e.tool_name===n.jd)?(t.uz("desktop_ccd_permission_auto_denied",{session_id:r,tool_name:e.tool_name,reason:"subagent_turn_tool"}),{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:n.kd}})',
      '...g.ccd_turn?n.vd:[]', 'turnBoxEnabled:n.bd()&&this.sessions.get(e)?.turnBoxMounted===!0', 'n=require("./index.chunk-DBIg6EBr.js")'] },
];

const isRequire = (init) => init?.type === 'CallExpression' && init.callee?.type === 'Identifier' && init.callee.name === 'require'
  && init.arguments?.length === 1 && init.arguments[0].type === 'StringLiteral';

async function readSource(side, name, cache) {
  const key = `${side}/${name}`;
  if (cache.has(key)) return cache.get(key);
  const bytes = await fs.readFile(path.join(side === 'main' ? mainSource : rendererSource, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map();
  const top = new Map();
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
  const record = { side, name, bytes, code, ast, exported, top, formatted: new Map(), deps: new Map() };
  cache.set(key, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
// A declaration's free variables that are top-level bindings of its chunk, and for a CommonJS namespace the members it
// reads ({ name, members: [{ member, start, end }] }, offsets inside the declaration's emitted text).
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
// A feature is a string (whitespace-normalised) or {loose} (official.looseFeature, R2/E5).
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter((f) => (typeof f === 'string' ? !text.includes(f) && !flat.includes(normalised(f)) : !official.looseFeature(f.loose).test(text)));
  if (missing.length) throw Error(`${label} lacks ${missing.map((f) => JSON.stringify(f)).join(', ')}${process.env.TURN_PLAN_EXPLAIN ? `\n--- text ---\n${text}` : ''}`);
}
// An adapter's original declaration carries `features`; `also` pins further declarations of the same chunk it stands for.
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
// R3: vendor-frame re-exports React; an alias is accepted only as official.reactAliases names it (a top-level
// `local=<namespace>.<member>`, `Oo` the react/compiler-runtime `c` factory; official.assertVendorAlias).
const vendor = { [official.vendorFrame]: official.reactAliases };
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  official.assertVendorAlias(src.code, alias, target);
  return target;
}
// D1/E3: CDS components and the React Compiler helpers come from the shared view-tabs graph by their semantic names.
// E42: except the shared-0 storage wrappers (stateless) the plain turn tail reaches through shared-52 / shared-130: the
// view-tabs shared-0 module imports vendor-frame and the .jsx adapters, which plain node (turn-plan-model.mjs) cannot load.
const slicedHere = new Set(['safeLocalStorage', 'getWindowStorage', 'createSafeStorage']);
let publicNames = null;
// Renderer bindings another generated graph holds and exports (D1, w13-close-gen-dedup w12-carry-01): chunk -> { area,
// target }. shared-156's display-safety helpers (VX and the OX / kX / AX … qX it reads) are code-routines' one copy; that
// module imports only routines-shared's shared-0 (no host adapter, plain node can load it, E42). Each binding is imported
// under the name the module exports it as; the module must match its manifest. shared-0's Pa / AL / jL / ML (lazyInit and
// the bindings around it) are routines-shared's one copy (w13-close-gen-dedup review 1): that module has no import at all,
// and code-routines' shared-156 already loads it. A linked binding is imported both when another chunk reads it and when a
// binding of the same chunk does (add), so no second copy is sliced into shared-0.mjs.
const linkedChunks = {
  'shared-156-BLTosN8U.js': { area: 'code-routines', target: 'shared-156-BLTosN8U.mjs' },
  'shared-0-DDOOdL6P.js': { area: 'routines-shared', target: 'shared-0-DDOOdL6P.mjs' },
};
let linkedCache = null;
async function linkedHeld() {
  if (linkedCache) return linkedCache;
  linkedCache = new Map();
  for (const [chunk, { area, target }] of Object.entries(linkedChunks)) {
    const dir = path.join(root, 'src/generated', area);
    const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
    const mod = manifest.modules.find((m) => m.target === target && m.source === chunk);
    if (!mod) throw Error(`linked ${area}/${target} does not hold ${chunk}`);
    const text = await fs.readFile(path.join(dir, target), 'utf8');
    if (sha(text) !== mod.sha256) throw Error(`linked ${area}/${target} differs from its manifest`);
    const exported = new Map();
    for (const m of text.matchAll(/^export \{([^}]*)\};/gm))
      for (const spec of m[1].split(',').map((x) => x.trim()).filter(Boolean)) { const [local, as] = spec.split(/\s+as\s+/); exported.set(local, as ?? local); }
    for (const b of mod.bindings) if (exported.has(b.name)) linkedCache.set(`${chunk}#${b.name}`, { from: `../${area}/${target}`, name: exported.get(b.name), area });
  }
  return linkedCache;
}
async function viewTabsPublic() {
  if (publicNames) return publicNames;
  const manifest = await viewTabsManifestFor(referenceVersion);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  publicNames = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) publicNames.set(`${entry.file}#${entry.local}`, { name, ...entry, currentFile: entry.file });
  return publicNames;
}
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'NaN', 'undefined', 'Infinity', 'isFinite', 'parseInt', 'parseFloat', 'encodeURIComponent', 'globalThis',
  'Uint8Array', 'BigInt', 'TextEncoder', 'TextDecoder', 'crypto', 'performance', 'setTimeout', 'clearTimeout', 'requestAnimationFrame',
  'cancelAnimationFrame', 'window', 'console', 'navigator', 'queueMicrotask', 'document', 'URL', 'URLSearchParams', 'DOMException', 'AbortController', 'Reflect', 'Proxy', 'Function', 'RangeError', 'SyntaxError', 'Int32Array', 'Float64Array', 'ArrayBuffer', 'DataView', 'atob', 'btoa', 'decodeURIComponent', 'encodeURI', 'decodeURI', 'isNaN', 'escape', 'unescape', 'Blob', 'location', 'localStorage', 'sessionStorage']);
// The alias a CommonJS member gets in the module that reads it.
const memberAlias = (ns, member) => `${ns}$${member}`;

export async function extractTurnPlan({ check = false, dryRun = false } = {}) {
  const cache = new Map();
  const key = (side, file) => `${side}/${file}`;
  // A chunk is one module, unless a spec takes a `part` of it (E42: the plain functions a node-importable model reaches,
  // kept out of the module that holds the chunk's compiled components): the part owns exactly its `locals` (and roots).
  const specKey = (spec) => key(spec.side, spec.source) + (spec.part ? `#${spec.part}` : '');
  const state = new Map(modules.map((spec) => [specKey(spec), { key: specKey(spec), spec: { ...spec, exports: spec.exports ?? {} },
    locals: new Set([...(spec.locals ?? []), ...Object.keys(spec.exports ?? {})]), selected: new Map(), imports: new Map(), rewrites: new Map(), seen: new Set(), shared: new Set() }]));
  const stateFor = (side, file, name) => {
    const part = modules.find((spec) => spec.part && spec.side === side && spec.source === file && state.get(specKey(spec)).locals.has(name));
    return state.get(part ? specKey(part) : key(side, file));
  };
  // Resolve chunk `depFile`'s export `alias` (read by module `st`) and record the import under `localName`.
  const importExport = async (st, side, depFile, alias, localName, via) => {
    const target = st.spec.target;
    const dep = await readSource(side, depFile, cache);
    const local = dep.exported.get(alias);
    if (!local) throw Error(`${target}: ${via} is not exported`);
    const adapter = adapters[depFile]?.[alias];
    if (adapter) {
      if (adapter.local !== local) throw Error(`${target}: adapter alias ${via} is ${local}, expected ${adapter.local}`);
      const original = dep.top.get(local);
      if (!original || original.kind === 'import' || original.kind === 'require') throw Error(`${target}: adapter ${via} (${local}) is not a declaration`);
      await assertAdapter(`${target}: adapter ${via}`, dep, local, adapter);
      st.imports.set(localName, { from: adapter.module ?? adapterModule, name: adapter.name, via, kind: 'adapter', original: local });
      return;
    }
    const react = side === 'renderer' ? vendorImport(depFile, alias, dep) : null;
    if (react) { st.imports.set(localName, { from: react[0], name: react[1], via, kind: 'react' }); return; }
    const shared = side === 'renderer' ? (await viewTabsPublic()).get(`${depFile}#${local}`) : null;
    if (shared && !slicedHere.has(shared.name)) {
      if (!shared.currentFile) throw Error(`${target}: view-tabs no longer publishes ${shared.name}`);
      st.imports.set(localName, { from: `../view-tabs/${shared.currentFile}`, name: shared.name, via, kind: 'view-tabs', original: local });
      return;
    }
    const link = side === 'renderer' ? (await linkedHeld()).get(`${depFile}#${local}`) : null;
    if (link) { st.imports.set(localName, { from: link.from, name: link.name, via, kind: 'linked', original: local }); return; }
    const owner = stateFor(side, depFile, local);
    if (!owner && process.env.TURN_PLAN_EXPLORE) {
      const d = dep.top.get(local);
      console.error(`[explore] ${target}: ${localName} = ${via} (${local}) :: ${d && d.node ? (await featureText(dep, d)).slice(0, 300).replace(/\n\s*/g, ' ') : d?.kind}`);
      st.imports.set(localName, { from: adapterModule, name: `EXPLORE_${local}`, via, kind: 'adapter', original: local });
      return;
    }
    if (!owner) throw Error(`${target}: unresolved import ${via} (${local}); ${depFile} is not a listed chunk`);
    const dentry = dep.top.get(local);
    if (!dentry || dentry.kind === 'import' || dentry.kind === 'require') throw Error(`${target}: ${via} (${local}) is a re-export`);
    await add(side, depFile, local);
    st.imports.set(localName, { from: `./${owner.spec.target}`, name: null, chunk: owner.key, local, via, kind: 'generated' });
  };
  const add = async (side, file, name) => {
    const st = stateFor(side, file, name);
    if (!st) throw Error(`the closure enters ${file}, which is not a listed chunk`);
    if (st.seen.has(name)) return;
    st.seen.add(name);
    const src = await readSource(side, file, cache);
    const entry = src.top.get(name);
    if (!entry) throw Error(`${st.spec.target}: unbound ${name}`);
    if (entry.kind === 'import') { await importExport(st, side, entry.file, entry.alias, name, `${entry.file}:${entry.alias}`); return; }
    if (entry.kind === 'require') throw Error(`${st.spec.target}: ${name} is a CommonJS namespace`);
    // A declaration of a listed chunk the host stands in for (the root reads it locally, not through an import).
    const localAdapter = Object.entries(adapters[file] ?? {}).find(([, a]) => a.local === name && !Object.hasOwn(st.spec.exports, name));
    if (localAdapter) {
      const [alias, adapter] = localAdapter;
      if (src.exported.get(alias) !== name) throw Error(`${st.spec.target}: adapter alias ${file}:${alias} is ${src.exported.get(alias)}, expected ${name}`);
      await assertAdapter(`${st.spec.target}: adapter ${file}#${name}`, src, name, adapter);
      st.imports.set(name, { from: adapter.module ?? adapterModule, name: adapter.name, via: `${file}#${name}`, kind: 'adapter', original: name });
      return;
    }
    const published = side === 'renderer' ? (await viewTabsPublic()).get(`${file}#${name}`) : null;
    if (published && !slicedHere.has(published.name) && !Object.hasOwn(st.spec.exports, name)) {
      st.imports.set(name, { from: `../view-tabs/${published.currentFile}`, name: published.name, via: `${file}#${name}`, kind: 'view-tabs', original: name });
      return;
    }
    const held = side === 'renderer' && !Object.hasOwn(st.spec.exports, name) ? (await linkedHeld()).get(`${file}#${name}`) : null;
    if (held) { st.imports.set(name, { from: held.from, name: held.name, via: `${file}#${name}`, kind: 'linked', original: name }); return; }
    if (entry.kind !== 'function' && entry.kind !== 'var') throw Error(`${st.spec.target}: unsupported declaration ${name}`);
    const text = declarationText(src, entry);
    if (/\bimport\s*\(/.test(text) || /\brequire\s*\(/.test(text)) throw Error(`${st.spec.target}: dynamic import inside ${name}`);
    st.selected.set(name, entry);
    if (process.env.TURN_PLAN_TRACE) console.error(`[trace] ${file}#${name} <- ${declarationDeps(src, name).map((d) => d.name).join(' ')}`);
    for (const dep of declarationDeps(src, name)) {
      const depEntry = src.top.get(dep.name);
      if (depEntry.kind === 'require') {
        for (const { member } of dep.members) {
          const alias = memberAlias(dep.name, member);
          if (!st.imports.has(alias)) await importExport(st, side, depEntry.file, member, alias, `${depEntry.file}:${member}`);
        }
        st.rewrites.set(name, [...(st.rewrites.get(name) ?? []), ...dep.members.map((m) => ({ ...m, alias: memberAlias(dep.name, m.member) }))]);
      } else {
        const owner = stateFor(side, file, dep.name);
        if (owner !== st) {
          if (st.spec.part) throw Error(`${st.spec.target}: ${name} reads ${dep.name}, which is not one of the part's locals`);
          st.imports.set(dep.name, { from: `./${owner.spec.target}`, name: null, chunk: owner.key, local: dep.name, via: `${file}#${dep.name}`, kind: 'generated' });
        }
        await add(side, file, dep.name);
      }
    }
  };
  for (const st of state.values()) {
    const src = await readSource(st.spec.side, st.spec.source, cache);
    for (const name of Object.keys(st.spec.exports)) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import' || entry.kind === 'require') throw Error(`${st.spec.target}: root ${name} is not a declaration of ${st.spec.source}`);
      assertFeatures(`${st.spec.target}: root ${name}`, await featureText(src, entry), st.spec.features?.[name]);
      await add(st.spec.side, st.spec.source, name);
    }
  }
  const exportName = (chunkKey, local) => {
    const owner = state.get(chunkKey);
    if (Object.hasOwn(owner.spec.exports, local)) return owner.spec.exports[local];
    owner.shared.add(local);
    return local;
  };
  for (const st of state.values()) for (const entry of st.imports.values()) if (entry.kind === 'generated') entry.name = exportName(entry.chunk, entry.local);
  const unused = [...state.values()].filter((st) => st.selected.size === 0).map((st) => st.spec.source);
  if (unused.length) throw Error(`listed chunks the closure never enters: ${unused.join(', ')}`);
  const order = [], mark = new Map();
  const visit = (chunkKey, trail) => {
    if (mark.get(chunkKey) === 'done') return;
    if (mark.get(chunkKey) === 'open') throw Error(`generated modules import each other: ${[...trail, chunkKey].join(' -> ')}`);
    mark.set(chunkKey, 'open');
    for (const entry of state.get(chunkKey).imports.values()) if (entry.kind === 'generated' && entry.chunk !== chunkKey) visit(entry.chunk, [...trail, chunkKey]);
    mark.set(chunkKey, 'done');
    order.push(chunkKey);
  };
  for (const spec of modules) visit(specKey(spec), []);

  const manifests = {
    renderer: { ...sideReference.renderer, generator: 'scripts/extract-turn-plan.mjs', modules: [], callSites: [] },
    main: { ...sideReference.main, generator: 'scripts/extract-turn-plan.mjs', adapterModule: 'electron/turn-plan-adapters.mjs', modules: [], callSites: [] },
  };
  const files = { renderer: {}, main: {} };
  for (const chunkKey of order) {
    const st = state.get(chunkKey), { spec } = st;
    const src = await readSource(spec.side, spec.source, cache);
    const decls = [...st.selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = decls.map(([name, entry]) => {
      let text = emittedText(src, entry);
      for (const r of [...(st.rewrites.get(name) ?? [])].sort((a, b) => b.start - a.start)) text = text.slice(0, r.start) + r.alias + text.slice(r.end);
      return text;
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
    const adapterNote = spec.side === 'main' ? 'electron/turn-plan-adapters.mjs' : 'src/turn-plan-model.mjs';
    const header = `// Original Claude Desktop ${sideReference[spec.side].referenceVersion} bindings from ${spec.side === 'main' ? 'asar/.vite/build/' : ''}${spec.source}; generated by extract-turn-plan.mjs.\n// Edit the extractor or ${adapterNote}, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const closed = babel.babelParse(text, spec.target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter((name) => !allowedGlobals.has(name));
    if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.side][spec.target] = text;
    manifests[spec.side].modules.push({
      target: spec.target, source: spec.source, ...(spec.part ? { part: spec.part } : {}), sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion: sideReference[spec.side].referenceVersion,
      bindings: decls.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...st.imports].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports, sharedExports: [...st.shared].sort(),
    });
  }
  for (const site of callSites) {
    const src = await readSource('renderer', site.source, cache);
    const entry = src.top.get(site.binding);
    if (!entry || entry.kind === 'import') throw Error(`call site ${site.source}:${site.binding} is not a declaration`);
    assertFeatures(`call site ${site.source}:${site.binding}`, await featureText(src, entry), site.features);
    manifests.renderer.callSites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(declarationText(src, entry)), features: site.features });
  }
  for (const site of rawCallSites) {
    const src = await readSource(site.main ? 'main' : 'renderer', site.source, cache);
    for (const feature of site.features) {
      const count = src.code.split(feature).length - 1;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifests[site.main ? 'main' : 'renderer'].callSites.push({ source: site.source, role: site.role, sourceSha256: sha(src.bytes), raw: true, features: site.features });
  }
  for (const side of ['renderer', 'main']) files[side]['manifest.json'] = JSON.stringify(manifests[side], null, 2) + '\n';
  if (!dryRun) {
    for (const side of ['renderer', 'main']) {
      const output = outputs[side];
      if (check) {
        const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files[side]).sort();
        if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Turn plan output set changed in ${path.relative(root, output)}: ${present.join(',')}. Run scripts/extract-turn-plan.mjs.`);
        for (const [name, text] of Object.entries(files[side]))
          if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Turn plan source mismatch: ${path.relative(root, path.join(output, name))}. Run scripts/extract-turn-plan.mjs.`);
      } else {
        await fs.mkdir(output, { recursive: true });
        for (const name of await fs.readdir(output)) if (!(name in files[side])) await fs.rm(path.join(output, name));
        for (const [name, text] of Object.entries(files[side])) await fs.writeFile(path.join(output, name), text);
      }
    }
  }
  const count = [...manifests.renderer.modules, ...manifests.main.modules].reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifests.renderer.modules.length + manifests.main.modules.length} turn plan modules (${count} original bindings: renderer ${referenceVersion}, main ${official.referenceVersion}; ${manifests.renderer.callSites.length + manifests.main.callSites.length} pinned call sites).`);
  return manifests;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractTurnPlan({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
