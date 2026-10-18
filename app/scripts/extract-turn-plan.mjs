// Turn plan (the task list card's data): extract the 2.42304.0 `update_plan` tool of the `ccd_turn` server and the
// renderer's reading of its calls, without executing any desktop runtime (decision D0: own generator, own output
// folders, own scripts/verify-gen-turn-plan.mjs).
//
// Main process (asar/.vite/build, CommonJS chunks) -> electron/generated/turn-plan/ (the agent-tools module imports it,
// and src/ is not packaged, D47):
//   ccd-turn.mjs      index.chunk-B5tintml.js: Qt (the ccd_turn server definition: update_plan with Tt's description and
//                     Et's inputSchema, wrap_up with Ft / Lt, readOnlyHint, alwaysLoad), Zt (createToolHandler: the
//                     update_plan branch validates items / scope / advance / done / start and answers "Plan shown (n
//                     steps)." / "Plan updated: …"; the wrap_up branch comes along unused), ot (the sub-agent refusal),
//                     ct (an empty turn plan), Qe / et / $e / Ze (status updates, the status line, the bad step number
//                     text, the step number check), at / it (mcp__ccd_turn__update_plan / wrap_up).
//   tool-result.mjs   index.chunk-BemIcaFh.js n / t (an MCP text result, an error result).
//   text-guards.mjs   index.chunk-muI2IV6k.js Ep / gj / _j: what Xt / qt run a step's content through before counting it.
// Renderer (ion-dist/assets/v1, ES modules) -> src/generated/turn-plan/:
//   plan-update.mjs   cb27dab29: z (a plan from update_plan's items: content cleaned by H, status pending unless
//                     completed / in_progress, at most 12, `plan-<n>` ids), Se (an update applied to a plan: items
//                     replaces it, else _e advance / done / start), xe / ye (the tool's name).
//   …                 the originals H reads (shared-104 secret redaction, shared-2 markup stripping), one module per chunk.
//
// Every emitted binding is an original top-level declaration sliced from the installed chunk; a module's bindings are
// the reachable closure of its roots (free variables found with Babel's scope analysis). An ES import, or a CommonJS
// `ns.member` of a `ns = require("./chunk")`, is followed into the chunk it names; it resolves to a named host adapter
// (electron/turn-plan-adapters.mjs; its original declaration must carry `features`) or the declaration in a listed
// chunk. Anything else stops generation. `callSites` / `rawCallSites` pin original text the host follows but does not
// import (where the renderer applies update_plan calls, that the transcript skips their rows, the per-session gate).
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
const rendererSource = path.resolve(root, '../reference', referenceSnapshot, 'ion-dist/assets/v1');
const mainSource = path.resolve(root, '../reference', referenceSnapshot, 'asar/.vite/build');
const outputs = { renderer: path.join(root, 'src/generated/turn-plan'), main: path.join(root, 'electron/generated/turn-plan') };
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

// Host dependencies of the main-process closure: chunk -> export -> { name (adapter export), local (the declaration the
// export must still name), features (in its prettier form) }.
const adapterModule = '../../turn-plan-adapters.mjs';
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog: the turn box's own adapters (source-turn-box-adapters.jsx).
  'vendor-intl-Db7hDWRO.js': {
    p: { module: '../../source-turn-box-adapters.jsx', name: 'useIntl', local: 'q', features: ['let e = o(K);', 'return (Mt(e), e);'] },
    l: { module: '../../source-turn-box-adapters.jsx', name: 'FormattedMessage', local: 'Gt', features: ['var Gt = u(Wt, Ut);'] },
  },
  'index.chunk-muI2IV6k.js': {
    // GrowthBook: ht() = LZ("2371478310") turns the ccd_turn tools on (host: on for this flag by the user's decision).
    LZ: { name: 'growthBookOn', local: 'hy', features: ['if (Uzt.has(e)) return !0;', 'return (py(e, t), t?.on ?? !1);'] },
    // Event logging (desktop_ccd_turn_scope): nothing is sent (D17).
    iz: { name: 'logEvent', local: 'Q', features: ['[EventLogging] Queuing event: %s | metadata: %o'] },
  },
};

const modules = [
  { side: 'main', target: 'ccd-turn.mjs', source: 'index.chunk-B5tintml.js',
    exports: { Qt: 'turnServerDefinition', Zt: 'createTurnToolHandler', ot: 'SUBAGENT_TURN_TOOL_REFUSAL', ct: 'emptyTurnPlan', Qe: 'applyPlanStatuses',
      et: 'planStatusLine', $e: 'badStepNumberText', Ze: 'isStepNumber', at: 'UPDATE_PLAN_TOOL_NAME', it: 'WRAP_UP_TOOL_NAME', rt: 'UPDATE_PLAN', tt: 'TURN_SERVER',
      nt: 'WRAP_UP', ft: 'turnPlanHooks', Nt: 'END_TURN_META' },
    features: {
      Qt: ['serverName: tt,', '{ name: rt, description: Tt(e), inputSchema: Et, annotations: mt, alwaysLoad: !0 },', 'isEnabled: (e) => e.sessionType === "ccd" && e.turnBoxEnabled === !0,', 'createToolHandler: Zt,'],
      Zt: ['(n === "update_plan" && r.items !== void 0 && (a.steps = void 0), !ht())', 'return w.t(`${n} is turned off right now; write it as text instead.`);', 'let e = wt(r.scope);', 'return e.some((e) => !Ze(e, o ?? 12))', '"items needs at least one step with content and status."',
        '`Plan shown (${o.length} steps).${s > 1 ? " Keep only one step in_progress." : ""}', 'w.n(`Plan updated${a.steps ? `: ${et(a.steps)}` : ""}.${bt(i.getAvailableNextActions?.())}`)'],
      ot: ['"Not shown: you are a subagent, and the app shows only the main conversation\'s task list and wrap-up. Do not call update_plan or wrap_up again; carry on with your task and report your result as usual."'],
      ct: ['return { steps: void 0, promptId: void 0, wrappedUpIn: void 0 };'],
      Qe: ['if (Array.isArray(t.done))', 'let t = n.indexOf("pending", e + 1),'],
      et: ['"every step is done"', '`no step is in progress (${n} of ${e.length} done); {"start": n} starts one`'],
      $e: ['`Nothing changed: done and start take whole step numbers counted from 1, and ${e === void 0 ? "a list has at most 12 steps" : `the list has ${e} step${e === 1 ? "" : "s"}`}.'],
      Ze: ['return typeof e == "number" && Number.isInteger(e) && e >= 1 && e <= t;'],
      nt: ['nt = "wrap_up"'], Nt: ['Nt = "claude/endTurn"'],
      ft: ['matcher: `${at}|${it}`,', 't.tool_name === at ? (n.promptId = t.prompt_id) : t.tool_name === it && (n.wrappedUpIn = t.prompt_id)', 'Also still to do in this turn, on top of what the summary above lists'],
      at: ['at = `mcp__${tt}__${rt}`'], it: ['it = `mcp__${tt}__${nt}`'], rt: ['rt = "update_plan"'], tt: ['tt = "ccd_turn"'],
    } },
  { side: 'main', target: 'tool-result.mjs', source: 'index.chunk-BemIcaFh.js' },
  { side: 'main', target: 'text-guards.mjs', source: 'index.chunk-muI2IV6k.js' },
  { side: 'renderer', target: 'plan-update.mjs', source: 'cb27dab29-_H2_XKli.js',
    exports: { z: 'planFromItems', Se: 'applyPlanUpdate', _e: 'applyStepStatuses', xe: 'isUpdatePlanTool', ye: 'UPDATE_PLAN_TOOL',
      R: 'isWrapUpTool', ve: 'WRAP_UP_TOOL', Me: 'legacyWrapUpText', Ee: 'wrapUpShown', je: 'parseWrapUp' },
    features: {
      z: ['r = H(t, "content");', 't.status === "completed" || t.status === "in_progress"', 'id: `plan-${n.length}`,', 'n.length >= 12'],
      Se: ['if (Array.isArray(t.items)) return z(t);', 'return e.map((e, t) => ({ ...e, status: n[t] }));'],
      _e: ['t.advance === !0 || t.advance === "true"'], xe: ['return e === ye;'], ye: ['ye = "mcp__ccd_turn__update_plan"'],
      R: ['return e === ve;'], ve: ['ve = "mcp__ccd_turn__wrap_up"'], Me: ['["outcome", "failures", "not_verified", "needs_user"]'],
      Ee: ['return t && e?.blocked !== !0 ? null : e;'], je: ['let t = H(e, "recap") ?? H(e, "next_recap") ?? H(e, "outcome");'],
    } },
  { side: 'renderer', target: 'secret-redaction.mjs', source: 'shared-104-Cqo2-vQh.js' },
  { side: 'renderer', target: 'strip-markup.mjs', source: 'shared-2-Cb74JByF.js' },
  { side: 'renderer', target: 'shared-0.mjs', source: 'shared-0-ByI5P0CP.js' },
  { side: 'renderer', target: 'cd4f82e77.mjs', source: 'cd4f82e77-BZMvPH7p.js' },
  { side: 'renderer', target: 'c227f4d5e.mjs', source: 'c227f4d5e-Ba-r--Rl.js' },
  { side: 'renderer', target: 'shared-11.mjs', source: 'shared-11-BuQ3CK5I.js' },
  { side: 'renderer', target: 'shared-25.mjs', source: 'shared-25-DP8p7i1Z.js' },
  { side: 'renderer', target: 'shared-78.mjs', source: 'shared-78-D6VXYXaQ.js' },
  { side: 'renderer', target: 'cb6930dae.mjs', source: 'cb6930dae-BD0W5ZM9.js' },
  { side: 'renderer', target: 'shared-156.mjs', source: 'shared-156-Bikz018e.js' },
  { side: 'renderer', target: 'cd57a9664.mjs', source: 'cd57a9664-BUM4bG19.js' },
  { side: 'renderer', target: 'shared-130.mjs', source: 'shared-130-DnUXVlYq.js' },
  { side: 'renderer', target: 'shared-52.mjs', source: 'shared-52-DGviI8xb.js' },
  { side: 'renderer', target: 'ccae33cda.mjs', source: 'ccae33cda-DCEu0VuC.js' },
  { side: 'renderer', target: 'cfb444e1a.mjs', source: 'cfb444e1a-C6ExxC04.js' },
  { side: 'renderer', target: 'c4d199b75.mjs', source: 'c4d199b75-BCsc0Miu.js' },
  { side: 'renderer', target: 'shared-7.mjs', source: 'shared-7-B8UIMGDr.js' },
  { side: 'renderer', target: 'shared-182.mjs', source: 'shared-182-eT1kXtya.js' },
  { side: 'renderer', target: 'shared-frame.mjs', source: 'shared-frame-BfjMqbuN.js' },
  { side: 'renderer', target: 'c8187a2dc.mjs', source: 'c8187a2dc-Dp9Zia_4.js' },
  { side: 'renderer', target: 'turn-tail.mjs', source: 'c1ebb1aa4-c89yWBMH.js',
    exports: { Rt: 'deriveTurnTail', Et: 'EMPTY_TURN_TAIL', Bt: 'turnTailEqual', Ft: 'wrapUpsByPrompt', It: 'wrapUpReceipt' },
    features: {
      Rt: ['a = i ? At : N,', 'v && !b', '(z = z.map((e) => ({ ...e, status: "completed" })))', ': !v && x > 0 && S && r.size === 0 && !(E && !D) && (z = Mt(z));', 'let B = Ft(e, (e) => e === t, !0).get(null),'],
      Et: ['planBeforeWrapUp: null,', 'proposedTaskIds: Object.freeze([]),'], Bt: ['zt(e.planBeforeWrapUp, t.planBeforeWrapUp) &&'],
      Ft: ['(s.uuid !== void 0 && t(s.uuid) && (a = s.uuid),', 'r.set(a, { ...e, callId: t.id ?? null });'], It: ['return t ? (n ? e : { ...e, recap: "" }) : null;'],
    } },
  { side: 'renderer', target: 'c06cf64bb.mjs', source: 'c06cf64bb-BE5q2vSr.js' },
  { side: 'renderer', target: 'c7d4a4512.mjs', source: 'c7d4a4512-B5-cT4Zn.js' },
  { side: 'renderer', target: 'c8479260c.mjs', source: 'c8479260c-DaoJ9_2S.js' },
  { side: 'renderer', target: 'shared-1.mjs', source: 'shared-1-CAAiD7E3.js' },
  { side: 'renderer', target: 'settled-turn-box.mjs', source: 'c96d752d0-BOCqU7c2.js',
    exports: { Itt: 'SettledTurnBox', R8: 'settledTurnBoxPairs', z8: 'settledTurnBoxRecap', AL: 'promptOfRow' },
    features: { Itt: ['let t = R8(e, Q());', 'return b(yv, { recap: z8(e.wrapUp), pairs: [t] });'], R8: ['if (n)', 'e.ruleId !== "new_session" &&'], z8: ['return ed(e.recap) ?? "";'], AL: [] } },
];

// Prettier form of a named top-level declaration the host follows but does not import.
const callSites = [
  { source: 'c1ebb1aa4-c89yWBMH.js', binding: 'Rt', role: 'The turn tail reads update_plan calls newest first: an errored call is skipped, the newest items call is the base (se = z), later advance / done / start inputs are applied over it oldest first (F = Se); host: src/turn-plan-model.mjs appToolPlan',
    features: ['a = i ? At : N,', 's.length > 0 && M !== null && u > M', '? (o = se(e))', ': (s.push(e), (M = null));', 'for (let e = s.length - 1; e >= 0; e--) z = F(z, s[e]);'] },
  { source: 'c1ebb1aa4-c89yWBMH.js', binding: 'Wt', role: 'N_: the update_plan branch runs when the session has the turn box (D(e) = Pq); otherwise the TaskCreate todos are passed in',
    features: ['{ todos: i } = _t(r ? null : e),', '() => (n.length === 0 ? Et : Ut(n, t, r ? void 0 : i, a)),'] },
  { source: 'c1ebb1aa4-c89yWBMH.js', binding: 'Lt', role: 'settledWrapUps: every prompt row’s preceding wrap_up that settles (It), unless its call was dismissed; host: src/turn-plan-model.mjs settledWrapUps',
    features: ['T(t, e) && r.add(t[e].sourceUuid ?? t[e].id);', 'for (let [t, a] of Ft(e, (e) => r.has(e), !1)) {', '!(a.callId !== null && n.has(a.callId)) &&'] },
  { source: 'c1ebb1aa4-c89yWBMH.js', binding: 'Jt', role: 'latestWrapUp: shown in the transcript only once the user left the box for it (leftToTranscript); host: not shown (the host has no leave-to-transcript action)',
    features: ['m = !i && p !== null && !c.has(p) && (r === !0 || r === p),'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'Itt', role: 'The settledTurnBox row (pushed before the prompt row that answered it, prompt = AL(row).text); host: main.jsx row',
    features: ['return b(yv, { recap: z8(e.wrapUp), pairs: [t] });'] },
];
const rawCallSites = [
  { source: 'c96d752d0-BOCqU7c2.js', role: 'Where the transcript puts a settled wrap-up: before the prompt row it answered',
    features: ['let a=t.settledWrapUps?.get(n.sourceUuid??n.id);if(a!==void 0&&s.push({kind:"settledTurnBox",id:`turn-box-${L(n,r)}`,wrapUp:a,prompt:AL(n)?.text??""})', 'case"settledTurnBox":return D9(Ye,b(Itt,{wrapUp:e.wrapUp,prompt:e.prompt,unanswered:e.unanswered===!0}));'] },
  { source: 'cc43287c9-DAfOi8yP.js', role: 'Mte hands hT the tail’s wrapUp through BO = cb27dab29 Ee (a non-blocked wrap-up waits while a suggestion is pending)',
    features: ['wrapUp:BO(La,Ka)', '{wrapUp:La,wrapUpCallId:Ra,turnSettled:za,agentsRunning:Ba,workedWithoutWrapUp:Va,proposedTaskIds:Ha}=$L(Na?tr:null,Ia)', 'import{H as BO}from"./cb27dab29-_H2_XKli.js"'] },
  { source: 'c06cf64bb-BE5q2vSr.js', role: 'A wrap_up tool_use draws no row; only a legacy outcome call (Vr = cb27dab29 Me) shows as text',
    features: ['if(n&&Br(o.name)){let t=As.get(o);if(!t){let n=Vr(Ss(o.partialJson));if(n===void 0)continue;', 'L as Br', 'R as Vr'] },
  { source: 'c06cf64bb-BE5q2vSr.js', role: 'Transcript rows: an update_plan tool_use draws no row when the turn box shows (zr = cb27dab29 F = xe); host: withoutTurnPlanCalls',
    features: ['if(n&&zr(o.name))continue;', 'if(o&&zr(r.name))continue;', 'F as zr'] },
  { main: true, source: 'index.chunk-B5tintml.js', role: 'Main process: the ccd_turn tools are on behind GrowthBook 2371478310 (ht, exported Au); Qt is pushed with sideSessions (a!==!1); the server is for Code sessions with the turn box mounted',
    features: ['function ht(){return t.LZ("2371478310")}', 'c.push(Qt(a!==!1))', 'isEnabled:e=>e.sessionType==="ccd"&&e.turnBoxEnabled===!0',
      'Object.defineProperty(exports,"Au",{enumerable:!0,get:function(){return ht}})', 'Object.defineProperty(exports,"zu",{enumerable:!0,get:function(){return ot}})',
      'Object.defineProperty(exports,"Bu",{enumerable:!0,get:function(){return at}})', 'Object.defineProperty(exports,"ku",{enumerable:!0,get:function(){return pt}})'] },
  { main: true, source: 'index.chunk-CFJssAFf.js', role: 'Main process: a sub-agent\'s update_plan / wrap_up is denied with ot (PreToolUse); the tools are allowed without asking (allowedTools ku); turnBoxEnabled = Au() && turnBoxMounted',
    features: ['e.agent_id&&(e.tool_name===n.Bu||e.tool_name===n.Vu)?(t.iz("desktop_ccd_permission_auto_denied",{session_id:r,tool_name:e.tool_name,reason:"subagent_turn_tool"}),{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:n.zu}})',
      '..._.ccd_turn?n.ku:[]', 'turnBoxEnabled:n.Au()&&this.sessions.get(e)?.turnBoxMounted===!0'] },
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
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter((f) => !text.includes(f) && !flat.includes(normalised(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map((f) => JSON.stringify(f)).join(', ')}${process.env.TURN_PLAN_EXPLAIN ? `\n--- text ---\n${text}` : ''}`);
}
// vendor-frame re-exports React; each alias is checked against its `local=<ns>.<member>` assignment (as extract-turn-box).
const vendor = {
  'vendor-frame-DfPJ1QmD.js': {
    Co: ['react', 'useState'], So: ['react', 'useRef'], uo: ['react', 'useCallback'], bo: ['react', 'useMemo'], mo: ['react', 'useEffect'],
    yo: ['react', 'useLayoutEffect'], oo: ['react', 'memo'], Ja: ['react', 'Fragment'], eo: ['react', 'createContext'], do: ['react', 'useContext'],
    wo: ['react', 'useSyncExternalStore'], go: ['react', 'useId'], xo: ['react', 'useReducer'], co: ['react', 'startTransition'],
    io: ['react', 'isValidElement'], $a: ['react', 'cloneElement'], ro: ['react', 'forwardRef'], po: ['react', 'useDeferredValue'],
    Va: ['react/jsx-runtime', 'jsx'], Ha: ['react/jsx-runtime', 'jsxs'],
  },
};
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  const local = src.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${target[1]}\\b`).test(src.code)) throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
  return target;
}
let publicNames = null;
async function viewTabsPublic() {
  if (publicNames) return publicNames;
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  publicNames = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) publicNames.set(`${entry.file}#${entry.local}`, { name, ...entry });
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
  const state = new Map(modules.map((spec) => [key(spec.side, spec.source), { spec: { ...spec, exports: spec.exports ?? {} }, selected: new Map(), imports: new Map(), rewrites: new Map(), seen: new Set(), shared: new Set() }]));
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
      assertFeatures(`${target}: adapter ${via} (${local})`, await featureText(dep, original), adapter.features);
      st.imports.set(localName, { from: adapter.module ?? adapterModule, name: adapter.name, via, kind: 'adapter', original: local });
      return;
    }
    const react = side === 'renderer' ? vendorImport(depFile, alias, dep) : null;
    if (react) { st.imports.set(localName, { from: react[0], name: react[1], via, kind: 'react' }); return; }
    const shared = side === 'renderer' ? (await viewTabsPublic()).get(`${depFile}#${local}`) : null;
    if (shared) { st.imports.set(localName, { from: `../view-tabs/${depFile}`, name: shared.name, via, kind: 'view-tabs', original: local }); return; }
    const owner = state.get(key(side, depFile));
    if (!owner) throw Error(`${target}: unresolved import ${via} (${local}); ${depFile} is not a listed chunk`);
    const dentry = dep.top.get(local);
    if (!dentry || dentry.kind === 'import' || dentry.kind === 'require') throw Error(`${target}: ${via} (${local}) is a re-export`);
    await add(side, depFile, local);
    st.imports.set(localName, { from: `./${owner.spec.target}`, name: null, chunk: key(side, depFile), local, via, kind: 'generated' });
  };
  const add = async (side, file, name) => {
    const st = state.get(key(side, file));
    if (!st) throw Error(`the closure enters ${file}, which is not a listed chunk`);
    if (st.seen.has(name)) return;
    st.seen.add(name);
    const src = await readSource(side, file, cache);
    const entry = src.top.get(name);
    if (!entry) throw Error(`${st.spec.target}: unbound ${name}`);
    if (entry.kind === 'import') { await importExport(st, side, entry.file, entry.alias, name, `${entry.file}:${entry.alias}`); return; }
    if (entry.kind === 'require') throw Error(`${st.spec.target}: ${name} is a CommonJS namespace`);
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
      } else await add(side, file, dep.name);
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
  for (const spec of modules) visit(key(spec.side, spec.source), []);

  const manifests = {
    renderer: { referenceVersion, referenceSnapshot, generator: 'scripts/extract-turn-plan.mjs', modules: [], callSites: [] },
    main: { referenceVersion, referenceSnapshot, generator: 'scripts/extract-turn-plan.mjs', adapterModule: 'electron/turn-plan-adapters.mjs', modules: [], callSites: [] },
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
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.side === 'main' ? 'asar/.vite/build/' : ''}${spec.source}; generated by extract-turn-plan.mjs.\n// Edit the extractor or ${adapterNote}, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const closed = babel.babelParse(text, spec.target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter((name) => !allowedGlobals.has(name));
    if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.side][spec.target] = text;
    manifests[spec.side].modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
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
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifests.renderer.modules.length + manifests.main.modules.length} turn plan modules (${count} original ${referenceVersion} bindings, ${manifests.renderer.callSites.length + manifests.main.callSites.length} pinned call sites).`);
  return manifests;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractTurnPlan({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
