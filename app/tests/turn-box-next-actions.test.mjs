// R4i-transcript TR1 (transcript-turn-box TB-4, tasks-06): the next-step row's rule chips. The chip row z$ and the rule
// evaluation sm runs (cd4f82e77 lt / V / pt / mt / dt / rt / ot, c73f45bc3 om and the streak memory) are generated
// originals; src/source-turn-box-adapters.jsx useNextActionRules is 3.6556.2 Sg's body over what the host knows. 3.6556.2
// dropped the row label's `secret:` gating, so the host catalog that named it is gone (w10-ccres-turnbox). The next-step
// row is cccc2cf0a cj (TurnNextActionsRow) with its sj proposal count. Also the TB-3 follow-ups: isReadOnly (shared-19
// NM → Mte `on`) and the dropped `.epitaxy-markdown-inherit-color` rule.
// SSR and pure calls only: no browser, no DOM, no network, no real session.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
// The turn box is generated from 3.6556.2 (w2-tr-turn-cont); the 2.42304.0 pins below record what the gating was.
const v3 = (name) => fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', name), 'utf8');
const v1 = (name) => fs.readFileSync(path.join(reference, 'ion-dist/assets/v1', name), 'utf8');
const generated = (name) => fs.readFileSync(path.join(app, 'src/generated/turn-box', name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
let server, A, C, E, N, M, B, P, PA;
before(async () => {
  // hmr / ws off: the test listens on no port.
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  A = await server.ssrLoadModule('/src/source-turn-box-adapters.jsx');
  C = await server.ssrLoadModule('/src/generated/turn-box/chip-text.mjs');
  E = await server.ssrLoadModule('/src/generated/turn-box/epitaxy-session.mjs');
  N = await server.ssrLoadModule('/src/generated/turn-box/next-action-memory.mjs');
  M = await server.ssrLoadModule('/src/source-turn-box.jsx');
  B = await server.ssrLoadModule('/src/generated/turn-box/turn-box.mjs');
  P = await server.ssrLoadModule('/src/generated/proposal-group/index.mjs');
  PA = await server.ssrLoadModule('/src/source-proposal-group-adapters.jsx');
});
after(async () => { await server?.close(); });

const LABEL_IDS = ['c8xcui', 'eqxzqc', 'x6cwfo', 'swxbes', '1a53mms', '1fr1tlf', '17ruqlh', '130mj9q', '4694ei', 'dbw0q8', 'qxk14n', 'xqesaj',
  '1hgx20t', '8y39yj', '1uf8vf1', 'aqrd2l', '1f2vhxn', '10b9uxk', 'u3irwb', 'd2mpsy', 'hlf4y0', '1qo0q0k', 'buvjo', '1w2simx', '1tlup25', '1qjls5q'];

test('TR1 official: the rule labels are secret-gated ids no shipped catalog carries, and a missing one turns the chip or row off', () => {
  const rules = v1('cd4f82e77-BZMvPH7p.js'), row = v1('c227f4d5e-Ba-r--Rl.js'), shared78 = v1('shared-78-D6VXYXaQ.js'), shared104 = v1('shared-104-Cqo2-vQh.js');
  for (const [text, needle] of [
    [rules, 'create_pr:{label:"xqesaj",prompt:"1hgx20t"}'], [rules, 'archive:{label:"10b9uxk"}'], [rules, 'ht="hlf4y0"'],
    [rules, 'function Dt(e){return g(e.messages,ht)}'],
    [rules, 'function Ct(e,t){if(t==="new_session")return!0;let{label:n,countLabel:r}=W[t];return g(e.messages,n)&&(r===void 0||g(e.messages,r))}'],
    [row, 'k=w!==void 0||sm(O)'], [row, 'E as sm'], [row, '"aria-label":w??om(O)'],
    [shared78, 'var Nv="secret";function Pv(e){return`${Nv}:${e}`}'], [shared104, 'kb as Yn'],
    [shared104, 'function nu(e,t){let n=e??{},r=Yn(t);if(!(r in n))return!1;'],
  ]) assert.equal(count(text, needle), 1, needle);
  // 3.6556.2 drops the gating: cd4f82e77 U returns the defaultMessage and W says every label is there, so the row label is
  // "Suggested next actions" and every rule command is offered.
  const rules3 = v3('cd4f82e77-CAMIsQ30.js');
  for (const needle of ['function U(e,t,n,r){return n()}', 'function W(e,t){return!0}', 'Et="hlf4y0"', 'defaultMessage:"Suggested next actions",id:"sLHORPqF0i"'])
    assert.equal(count(rules3, needle), 1, needle);
  // Neither the static nor the dynamic en-US catalog has any of the 26 ids (plain or secret-prefixed).
  for (const file of ['ion-dist/i18n/en-US.json', 'ion-dist/i18n/dynamic/en-US.json']) {
    const catalog = JSON.parse(fs.readFileSync(path.join(reference, file), 'utf8'));
    for (const id of LABEL_IDS) assert.equal(Object.hasOwn(catalog, id) || Object.hasOwn(catalog, `secret:${id}`), false, `${file} ${id}`);
  }
});

test('TR1 generator: z$ and the rule evaluation are generated originals; the stub adapters are gone', () => {
  const session = generated('epitaxy-session.mjs');
  assert.equal(count(session, 'A5 as NextActionChipRow'), 1, '3.6556.2 A5 (2.42304.0 z$)');
  assert.equal(count(session, 'shortcut: b.composerHoldsDraft ? void 0 : "cmd+enter"'), 1);
  const box = generated('turn-box.mjs');
  assert.equal(count(box, 'NextActionChipRow as sp,'), 1);
  assert.equal(count(box, 'T5 as qf,'), 1, 'the turn observer id is the original T5 (2.42304.0 P$)');
  assert.equal(count(box, '} from "./epitaxy-session.mjs";'), 1);
  // 3.6556.2 ZA keeps the app-action rule chips only for a session with the per-session turnBox flag (ae = T1(t));
  // otherwise it drops them (2.42304.0 hT dropped them whenever the box was hosted).
  assert.equal(count(box, 'ae = cp(t),'), 1);
  assert.equal(count(box, 'let e = ae ? xe : xe.filter(tj),'), 1);
  assert.equal(A.NextActionChipRow, undefined);
  assert.equal(A.useTurnObserverId, undefined);
  const manifest = JSON.parse(generated('manifest.json'));
  const chip = manifest.modules.find((m) => m.target === 'chip-text.mjs');
  assert.deepEqual(Object.values(chip.exports).sort(), ['NEXT_ACTION_RULES', 'NEXT_ACTION_RULE_ORDER', 'chipRowLabelAvailable', 'chipStateKey', 'commandLabelAvailable',
    'evaluateNextActionRules', 'firingNextActionRules', 'keepShownChips', 'namedRuleChip', 'prStateEndsSession', 'pullRequestRuleState', 'retireShownChips']);
  const memory = manifest.modules.find((m) => m.target === 'next-action-memory.mjs');
  assert.equal(memory.source, 'c73f45bc3-B7hbL7H9.js');
  assert.deepEqual(memory.imports.filter((i) => i.kind === 'adapter').map((i) => i.name).sort(), ['onPaneHiddenChange', 'usePaneHiddenStore']);
  const sessionModule = manifest.modules.find((m) => m.target === 'epitaxy-session.mjs');
  for (const name of ['logChipsShown', 'logChipClicked', 'logRulesEvaluated', 'logChipOutcome', 'useChipChords', 'useAccountFlag'])
    assert.ok(sessionModule.imports.some((i) => i.kind === 'adapter' && i.name === name), name);
});

const allCommands = new Set(['correct_slash_command', 'reconnect_connector', 'create_pr', 'archive', 'new_session']);
test('TR1 rule table: the original evaluation over sm-shaped inputs', () => {
  assert.deepEqual(C.NEXT_ACTION_RULE_ORDER, ['correct_slash_command', 'resolve_conflicts', 'fix_ci', 'address_comments', 'merge', 'reconnect_connector',
    'abundant_waffle', 'create_pr', 'commit', 'verify', 'archive', 'new_session']);
  const idle = { prState: 'merged', idleOnReturn: true, archiveHeldBack: false, commands: allCommands };
  assert.deepEqual(C.evaluateNextActionRules(idle).map((c) => c.key), ['rule:archive', 'rule:new_session']);
  assert.deepEqual(C.evaluateNextActionRules({ ...idle, isResponding: true }), []);
  assert.deepEqual(C.evaluateNextActionRules({ ...idle, archiveHeldBack: true }), []);
  // A command rule the row does not offer (NW) has no chip unless it falls back to a send.
  assert.deepEqual(C.evaluateNextActionRules({ connectorsTouchedLastTurn: 1, commands: new Set() }), []);
  assert.deepEqual(C.evaluateNextActionRules({ connectorsTouchedLastTurn: 1, commands: allCommands }),
    [{ key: 'rule:reconnect_connector', source: 'rule', ruleId: 'reconnect_connector', kind: 'command', command: 'reconnect_connector' }]);
  assert.deepEqual(C.evaluateNextActionRules({ prState: 'none', hasChanges: true, hasRemote: true, commands: new Set() }),
    [{ key: 'rule:create_pr', source: 'rule', ruleId: 'create_pr', kind: 'send' }]);
  assert.equal(C.pullRequestRuleState(undefined), 'unknown');
  assert.equal(C.pullRequestRuleState(null), 'none');
  assert.equal(C.pullRequestRuleState({ state: 'MERGED' }), 'merged');
  assert.equal(C.prStateEndsSession('draft'), true);
  assert.equal(C.prStateEndsSession('unknown'), false);
  // The memory keeps the chips on screen and retires the rest.
  const kept = C.keepShownChips({ id: 'P', chips: [], onScreen: false }, 'P', C.evaluateNextActionRules(idle));
  assert.deepEqual(kept.chips.map((c) => c.key), ['rule:archive', 'rule:new_session']);
  assert.equal(kept.memory.onScreen, true);
  // The streak memory: a new session id starts fresh.
  assert.deepEqual(N.advanceRuleMemory(N.emptyRuleMemory('P'), { id: 'Q', turnKey: 't', promptKey: 'p' }).id, 'Q');
  // The catalog checks: 3.6556.2 W always answers true, so every command label and the row label are available.
  const bare = { messages: {} };
  for (const id of ['new_session', 'correct_slash_command', 'reconnect_connector', 'create_pr', 'archive']) assert.equal(C.commandLabelAvailable(bare, id), true, id);
  assert.equal(C.chipRowLabelAvailable(bare), true);
});

// One render of useNextActionRules over a host (SSR: effects do not run, so om's idle check has not happened yet).
function rules(host, sessionRef, options) {
  let out = null;
  function Probe() { out = A.useNextActionRules(sessionRef, options); return null; }
  renderToStaticMarkup(React.createElement(A.TurnBoxHost.Provider, { value: host }, React.createElement(Probe)));
  return out;
}
test('TR1 adapter: Sg over the host — responding from the host, PR from the session row, no invented inputs', () => {
  const ref = { id: 'P', type: 'local' };
  const quiet = rules({ responding: () => false, pullRequest: () => undefined }, ref, { commands: allCommands, lastActivityAt: 1 });
  assert.deepEqual(quiet.chips, []);
  assert.deepEqual(quiet.evaluation, { isResponding: false, derived: [] });
  assert.equal(quiet.firingKnown, false);
  assert.equal(quiet.slashCorrection, undefined);
  assert.equal(quiet.reconnectTarget, undefined);
  assert.equal(quiet.sessionRepo, null);
  assert.equal(quiet.namedFallback('create_pr'), undefined, 'no repo or changes known: no create_pr fallback');
  assert.equal(rules({ responding: () => true }, ref, {}).evaluation.isResponding, true);
  assert.equal(rules(null, ref, { isResponding: true }).evaluation.isResponding, true);
  // A remote session with a merged PR is not held back (te = m !== "merged"), but om has not reported idle yet.
  const remote = rules({ pullRequest: () => ({ state: 'merged', number: 1, url: 'https://github.com/o/r/pull/1' }) }, { id: 'R', type: 'remote' }, { commands: allCommands });
  assert.deepEqual(remote.chips, []);
  assert.deepEqual(remote.firing, []);
  // Without a host at all the evaluation is the empty one.
  assert.deepEqual(rules(null, null, {}).chips, []);
  // Sg's g / b: the row's PR is a GitHub pull request (shared-18 QE, Sg's er), so it is the conflict PR; any other URL is not.
  assert.deepEqual(rules({ pullRequest: () => ({ state: 'open', number: 7, url: 'https://github.com/o/r/pull/7' }) }, ref, {}).conflictPr,
    { number: 7, url: 'https://github.com/o/r/pull/7' });
  assert.equal(rules({ pullRequest: () => ({ state: 'open', number: 7, url: 'https://example.com/o/r/merge/7' }) }, ref, {}).conflictPr, undefined);
  assert.equal(rules({ pullRequest: () => undefined }, ref, {}).conflictPr, undefined);
});

test('W12b #29: Sg\'s P is the generated c227f4d5e Tk (Go) over the sessions store, not a constant', () => {
  // c73f45bc3 imports Go from c227f4d5e's Oc, which is Tk; Tk / Ek are pinned in the original bytes.
  const sg = v3('c73f45bc3-B7hbL7H9.js');
  const goFrom = [...sg.matchAll(/import\{([^}]*)\}from"([^"]+)"/g)].filter((m) => /(?:^|,)Oc as Go(?:,|$)/.test(m[1])).map((m) => m[2]);
  assert.deepEqual(goFrom, ['./c227f4d5e-B-FYKrwT.js']);
  const c227 = v3('c227f4d5e-B-FYKrwT.js');
  assert.equal(count(c227, 'Tk as Oc'), 1);
  assert.equal(count(c227, 'function Tk(e){let $=J9(2),t=J1($,0,e)?K1($,0,e,t=>e!==void 0&&(t.sessions.find(t=>t.sessionId===e)?.backgroundTaskSuggestions)?.some(Ek)===!0):$[1];return of(t)}'), 1);
  assert.equal(count(c227, 'function Ek(e){return e.offer===!0&&e.toolUseId!==void 0&&e.accepted!==!0}'), 1);
  const manifest = JSON.parse(generated('manifest.json'));
  const session = manifest.modules.find((m) => m.target === 'epitaxy-session.mjs');
  assert.equal(session.exports.Tk, 'useOffersBackgroundTask');
  assert.ok(session.bindings.some((b) => b.name === 'Tk') && session.bindings.some((b) => b.name === 'Ek'));
  assert.deepEqual(session.imports.find((i) => i.local === 'of'), { local: 'of', from: '../../source-turn-box-adapters.jsx', name: 'useSessionsStore',
    via: 'shared-8-Db1QN4mf.js:Df', kind: 'adapter', original: 'og' });
  const adapters = fs.readFileSync(path.join(app, 'src/source-turn-box-adapters.jsx'), 'utf8');
  assert.equal(count(adapters, 'const P = useOffersBackgroundTask(local ? (r ?? undefined) : undefined);'), 1);
  assert.equal(count(adapters, 'const P = false;'), 0);
  // The host: an unanswered offer on the local session's queue makes Sg responding (F), as the original; the host queue
  // (spawn_task suggestions) has none, so P is false there.
  const ref = { id: 'P', type: 'local' };
  const offer = { id: 'task_00000001', offer: true, toolUseId: 'call-1' };
  const withQueue = (queue) => ({ responding: () => false, sessions: [{ sessionId: 'P', backgroundTaskSuggestions: queue }] });
  assert.equal(rules(withQueue([offer]), ref, {}).evaluation.isResponding, true, 'an open offer');
  assert.equal(rules(withQueue([{ ...offer, accepted: true }]), ref, {}).evaluation.isResponding, false, 'answered');
  assert.equal(rules(withQueue([{ ...offer, toolUseId: undefined }]), ref, {}).evaluation.isResponding, false, 'no tool call');
  assert.equal(rules(withQueue([{ id: 'task_00000002' }]), ref, {}).evaluation.isResponding, false, 'a spawn_task suggestion is no offer');
  assert.equal(rules(withQueue([offer]), { id: 'P', type: 'remote' }, {}).evaluation.isResponding, false, 'only a local session (Go(void 0))');
  assert.equal(rules({ responding: () => false, sessions: [{ sessionId: 'Q', backgroundTaskSuggestions: [offer] }] }, ref, {}).evaluation.isResponding, false, 'another session');
  assert.equal(typeof E.useOffersBackgroundTask, 'function');
});

test('w10 Sg: the adapter follows the 3.6556.2 body (c73f45bc3), and the URL test is the generated QE', () => {
  const sg = v3('c73f45bc3-B7hbL7H9.js');
  for (const needle of ['Sg as Dt', 'M=ko(e),N=Qs(r)&&n.turnSettled===!0,P=Go(e?.type==="local"?r??void 0:void 0),F=M&&!N||n.isResponding===!0||P,',
    'g=c&&er(c.url)&&!s?.inheritedPr&&!s?.stackParent,_=g?c.number:void 0,v=g?c',
    'ee=J3($,36,U,p,e)?K3($,36,U,p,e,t=>e?.type==="local"&&U===!0&&$i(p)?He(t.sessions,e.id):void 0):$[39],te=Jr(ee),ne=e?.type==="local"?te:p!=="merged"',
    'st=c?.url,ct=J1($,90,st)?K1($,90,st,er(st)):$[91]', 'prOnGithub:ct', 'conflictPr:b',
    'function Kp(){let $=J9(3),e=p(Tn)?.messages,t=Ji();return J2($,0,t,e)?K2($,0,t,e,t&&dt(e,"dbw0q8")&&dt(e,"qxk14n")):$[2]}'])
    assert.equal(count(sg, needle), 1, needle);
  // Sg's evaluation object has no connectorsToReconnect key (the 2.42304.0-era adapter carried one).
  assert.equal(count(sg, 'connectorsToReconnect'), 0);
  const adapters = fs.readFileSync(path.join(app, 'src/source-turn-box-adapters.jsx'), 'utf8');
  assert.equal(count(adapters, 'connectorsToReconnect'), 0);
  assert.equal(count(adapters, 'import { isPullRequestUrl } from "./generated/turn-box/shared-18.mjs";'), 1);
  const manifest = JSON.parse(generated('manifest.json'));
  assert.deepEqual(manifest.modules.find((m) => m.target === 'shared-18.mjs').exports, { QE: 'isPullRequestUrl' });
  assert.equal(count(generated('shared-18.mjs'), 'function QE(e) {'), 1);
  assert.equal(count(v3('shared-18-D3y8YMFN.js'), '.test(URL.parse(e)?.pathname??""):!1}'), 1);
  assert.equal(count(v3('shared-18-D3y8YMFN.js'), 'QE as hc'), 1);
});

const newSession = { key: 'rule:new_session', source: 'rule', ruleId: 'new_session', kind: 'command', command: 'new_session' };
const chipRow = (props) => renderToStaticMarkup(React.createElement(E.NextActionChipRow,
  { chips: [newSession], surface: 'composer', sessionType: 'local', sessionId: 'P', onActivate: () => 'none', ...props }));
test('TR1 z$ (3.6556.2 A5): the original row renders with its default group label, no host catalog', () => {
  // 3.6556.2 A5: the group label is cd4f82e77 Ft's defaultMessage (U no longer reads secret:hlf4y0 from any catalog).
  assert.match(chipRow(), /^<div role="group" aria-label="Suggested next actions" class="flex min-w-0 /);
  assert.equal(chipRow({ chips: [], evaluation: { isResponding: true, derived: [] } }), '');
  const html = chipRow();
  assert.equal(count(html, 'New session'), 1);
  assert.equal(count(html, '<button'), 1);
  // An explicit group label (the desktop's other surfaces pass one) needs no catalog entry.
  assert.match(chipRow({ groupLabel: 'Group' }), /aria-label="Group"/);
});

test('w10 catalog: no generated turn-box module asks for secret:hlf4y0, so the host catalog is gone', () => {
  // Et is read only by Ft (U returns the defaultMessage) and Rt (W answers true): never looked up.
  const chip = generated('chip-text.mjs');
  assert.equal(count(chip, 'var Et = "hlf4y0";'), 1);
  assert.equal(count(chip, 'return U(e, Et, () =>'), 1);
  assert.equal(count(chip, 'return W(e, Et);'), 1);
  assert.equal(count(chip, 'function W(e, t) {\n  return !0;\n}'), 1);
  assert.equal(count(chip, 'function U(e, t, n, r) {\n  return n();\n}'), 1);
  assert.equal(chip.match(/\bEt\b/g).length, 3, 'the declaration, Ft and Rt');
  for (const name of fs.readdirSync(path.join(app, 'src/generated/turn-box')))
    assert.equal(count(generated(name), 'hlf4y0'), name === 'chip-text.mjs' ? 1 : 0, name);
  assert.equal(A.TurnBoxCatalog, undefined);
  assert.equal(M.TURN_BOX_ROW_LABEL, undefined);
  const box = fs.readFileSync(path.join(app, 'src/source-turn-box.jsx'), 'utf8');
  const adapters = fs.readFileSync(path.join(app, 'src/source-turn-box-adapters.jsx'), 'utf8');
  for (const needle of ['TurnBoxCatalog', 'TURN_BOX_ROW_LABEL', 'Suggested next steps', 'createIntl']) {
    assert.equal(count(box, needle), 0, needle);
    assert.equal(count(adapters, needle), 0, needle);
  }
});

test('TR1 hT: the mounted next row stays empty — app-action chips are dropped under presets and the rest have no input', () => {
  const ref = { id: 'P', type: 'local' };
  const host = { responding: () => false, pullRequest: () => ({ state: 'merged', number: 1, url: 'https://github.com/o/r/pull/1' }),
    sessionInfo: () => ({ lastActivityAt: 1, createdAt: 1 }) };
  const html = renderToStaticMarkup(React.createElement(A.TurnBoxHost.Provider, { value: host },
    React.createElement(B.NextActionsRow, { sessionRef: ref, composerRef: { current: null }, latestPromptId: 'p1', turnSettled: true })));
  assert.equal(html, '');
  // The same through cj, the row the host mounts.
  const row = renderToStaticMarkup(React.createElement(A.TurnBoxHost.Provider, { value: host },
    React.createElement(B.TurnNextActionsRow, { sessionRef: ref, composerRef: { current: null }, latestPromptId: 'p1' })));
  assert.equal(row, '');
});

test('w10 cj / sj: the next-step row is the generated cccc2cf0a cj, and its proposal count is sj over JX', () => {
  const box3 = v3('cccc2cf0a-DhZC33Gc.js');
  for (const needle of ['cj as g', 'function cj(e){let $=J9(16),t,n;J1($,0,e)?({turnHasPendingSuggestion:n,...t}=e,K2($,0,e,t,n)):(t=$[1],n=$[2]);',
    'proposedTaskIds:l}=xy(t.sessionRef,t.latestPromptId),d=sj(t.sessionRef.id,l),f=J2($,3,n,r)?K2($,3,n,r,_m(r,n)):$[5],p=s>0;',
    'function sj(e,t){let $=J9(4),n=ls(e??void 0),', 'e.id!==void 0&&t.includes(e.id)&&!n.has(e.id)&&e.autoStart!=="cloud"&&e.accepted!==!0&&a++;return a}):$[3];return Ma(r)}'])
    assert.equal(count(box3, needle), 1, needle);
  assert.equal(count(v3('cf74bc599-CRYqipWN.js'), 'Or as EpitaxyTurnNextActionsRow'), 1);
  const c96 = v3('c96d752d0-CWv_7-n9.js');
  assert.equal(count(c96, 'function JX(e){let $=J9(4),t=J1($,0,e)?K1($,0,e,t=>e?t.byParent[e]??LX:LX):$[1],n=zX(Ar(t));return J1($,2,n)?K1($,2,n,n.length===0?RX:new Set(n)):$[3]}'), 1);
  assert.equal(count(c96, 'JX as nn'), 1);
  const manifest = JSON.parse(generated('manifest.json'));
  const box = manifest.modules.find((m) => m.target === 'turn-box.mjs');
  assert.equal(box.exports.cj, 'TurnNextActionsRow');
  assert.equal(box.exports.sj, 'useProposalsPending');
  // W12b (w11-sweep-ccres #31, D1): ls is generated/proposal-group's JX, the one zX the host spawner marks (no adapter).
  assert.deepEqual(box.imports.find((i) => i.local === 'ls'), { local: 'ls', from: '../proposal-group/c96d752d0-CWv_7-n9.js', name: 'useSpawningTaskIds',
    via: 'c96d752d0-CWv_7-n9.js:nn', kind: 'proposal-group', original: 'JX' });
  assert.equal(count(generated('turn-box.mjs'), 'import { useSpawningTaskIds as ls } from "../proposal-group/c96d752d0-CWv_7-n9.js";'), 1);
  const group = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/proposal-group/manifest.json'), 'utf8'));
  assert.deepEqual(group.publicNames.useSpawningTaskIds, { file: 'c96d752d0-CWv_7-n9.js', local: 'JX', export: 'nn' });
  const groupC96 = group.modules.find((m) => m.source === 'c96d752d0-CWv_7-n9.js');
  assert.ok(groupC96.bindings.some((b) => b.name === 'JX'));
  assert.ok(groupC96.bindings.some((b) => b.name === 'zX') && groupC96.bindings.some((b) => b.name === 'HX'), 'JX, HX and zX: one module');
  assert.equal(count(fs.readFileSync(path.join(app, 'src/generated/proposal-group/c96d752d0-CWv_7-n9.js'), 'utf8'), 'JX as useSpawningTaskIds,'), 1);
  for (const file of fs.readdirSync(path.join(app, 'src/generated/turn-box')))
    assert.equal(count(generated(file), 'var zX ='), 0, `${file}: no second zX`);
  assert.equal(count(fs.readFileSync(path.join(app, 'src/source-turn-box-adapters.jsx'), 'utf8'), 'export function useSpawningTaskIds'), 0);
  assert.equal(box.imports.find((i) => i.local === 'Ma').name, 'useSessionsStore');
  assert.equal(box.imports.find((i) => i.local === '_m').from, './wrap-up.mjs');
  assert.ok(box.bindings.some((b) => b.name === 'cj') && box.bindings.some((b) => b.name === 'sj'));

  // sj: the turn's proposed tasks still queued on the session, not being started, not cloud, not accepted.
  const queue = [{ id: 'task_00000001' }, { id: 'task_00000002' }, { id: 'task_00000003', autoStart: 'cloud' }, { id: 'task_00000004', accepted: true },
    { id: 'task_00000005' }, { id: 'task_00000006' }];
  const proposed = ['task_00000001', 'task_00000002', 'task_00000003', 'task_00000004', 'task_00000005', 'task_00000009'];
  const pending = (host, id = 'P', ids = proposed) => {
    let out;
    function Probe() { out = B.useProposalsPending(id, ids); return null; }
    renderToStaticMarkup(React.createElement(A.TurnBoxHost.Provider, { value: host }, React.createElement(Probe)));
    return out;
  };
  const sessions = [{ sessionId: 'P', backgroundTaskSuggestions: queue }, { sessionId: 'Q', backgroundTaskSuggestions: [{ id: 'task_00000001' }] }];
  assert.equal(pending({ sessions }), 3, '1, 2 and 5');
  // On the server JX reads zX's initial state (zustand's server snapshot), so a mark shows only in a client render (the
  // next test); the count here stays 3 either way.
  P.markProposalSpawning('P', 'task_00000002');
  try { assert.equal(pending({ sessions }), 3, 'server snapshot: no marks'); } finally { P.clearProposalSpawning('P', 'task_00000002'); }
  assert.equal(pending({ sessions }, 'P', []), 0, 'the turn proposed nothing');
  assert.equal(pending({ sessions }, null), 0);
  assert.equal(pending({ sessions: [] }), 0, 'no row for the session');
  assert.equal(pending(null), 0, 'no host');
});

test('W12b #31: sj\'s ls is the proposal-group JX, subscribed to the zX marks the host spawner sets (client render)', async () => {
  // cccc2cf0a `function sj(e,t){let $=J9(4),n=ls(e??void 0),…}` with `import{…nn as ls…}from"./c96d752d0-CWv_7-n9.js"`, and
  // c96d752d0 `n=zX(Ar(t))` in JX: a mark (WX) or a clear (GX) re-renders sj on its own, with no new TurnBoxHost value.
  const box3 = v3('cccc2cf0a-DhZC33Gc.js');
  const statement = [...box3.matchAll(/import\{([^}]*)\}from"([^"]+)"/g)].filter((m) => /\bnn as ls\b/.test(m[1])).map((m) => m[2]);
  assert.deepEqual(statement, ['./c96d752d0-CWv_7-n9.js']);
  assert.equal(count(v3('c96d752d0-CWv_7-n9.js'), 'function JX(e){let $=J9(4),t=J1($,0,e)?K1($,0,e,t=>e?t.byParent[e]??LX:LX):$[1],n=zX(Ar(t));'), 1);
  const { act } = React;
  const { createRoot } = await import('react-dom/client');
  const doc = { nodeType: 9, nodeName: '#document', activeElement: null, body: null, addEventListener() {}, removeEventListener() {} };
  const container = { nodeType: 1, nodeName: 'DIV', tagName: 'DIV', ownerDocument: doc, addEventListener() {}, removeEventListener() {}, childNodes: [],
    appendChild(child) { this.childNodes.push(child); return child; }, removeChild(child) { return child; } };
  const saved = ['IS_REACT_ACT_ENVIRONMENT', 'window'].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'window', { value: { event: undefined, document: doc, HTMLIFrameElement: class {} }, configurable: true, writable: true });
  const queue = [{ id: 'task_00000001' }, { id: 'task_00000002' }, { id: 'task_00000005' }];
  const host = { sessions: [{ sessionId: 'P', backgroundTaskSuggestions: queue }] };
  const seen = [];
  function Probe() { seen.push(B.useProposalsPending('P', ['task_00000001', 'task_00000002', 'task_00000005'])); return null; }
  const root = createRoot(container);
  try {
    await act(async () => { root.render(React.createElement(A.TurnBoxHost.Provider, { value: host }, React.createElement(Probe))); });
    assert.equal(seen.at(-1), 3);
    const renders = seen.length;
    await act(async () => { P.markProposalSpawning('P', 'task_00000002'); });
    assert.ok(seen.length > renders, 'the mark alone re-renders sj');
    assert.equal(seen.at(-1), 2, 'one being started');
    await act(async () => { P.markProposalSpawning('Q', 'task_00000001'); });
    assert.equal(seen.at(-1), 2, 'another parent\'s marks do not count');
    await act(async () => { P.clearProposalSpawning('P', 'task_00000002'); });
    assert.equal(seen.at(-1), 3, 'cleared');
  } finally {
    await act(async () => { root.unmount(); });
    P.clearProposalSpawning('P', 'task_00000002');
    P.clearProposalSpawning('Q', 'task_00000001');
    for (const [name, descriptor] of saved) if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
  }
});

test('w10 host: the mount hands cj only what cc43287c9 passes ope; TurnBoxHost reads the proposal stores', () => {
  const ref = { id: 'P', type: 'local' };
  let host = null;
  function Probe() { host = M.useCodeTurnBoxHost({ state: { items: {}, active: {}, approvals: [] }, planMarks: {}, currentId: 'P', requestOwner: () => 'P' }); return null; }
  renderToStaticMarkup(React.createElement(Probe));
  // The sessions store is the proposal card's (shared-8 og), read when a consumer renders.
  assert.equal(host.sessions, PA.useSessionsStore.getState().sessions);
  assert.deepEqual(host.sessions, []);
  // JX is imported from generated/proposal-group (W12b, #31): the host hands the turn box no spawning reader.
  assert.equal('spawningTaskIds' in host, false);
  // The mount: TurnBox with cj as its child, keyed as cc43287c9 keys ope; cj computes the tail-derived props itself.
  let portalled = null;
  renderToStaticMarkup(React.createElement(M.SourceTurnBoxMount, { host, scope: M.createTurnBoxScope(), placement: { slotEl: { nodeType: 1 }, placeable: true },
    sessionRef: ref, isResponding: false, latestPromptId: 'u1', composerRef: { current: null }, hasComposerDraft: () => false,
    portal: (child, target) => { portalled = { child, target }; return null; } }));
  const row = portalled.child.props.children;
  assert.equal(row.type, B.TurnNextActionsRow);
  assert.equal(row.key, 'P:next-actions');
  assert.deepEqual(Object.keys(row.props).sort(), ['composerHasAttachments', 'composerRef', 'eligible', 'hasComposerDraft', 'hidden', 'isSsh', 'latestPromptId',
    'onQuestionWithheld', 'onSessionRemoved', 'openSessionMcpDialog', 'overlayBusy', 'ownsShortcuts', 'sessionRef', 'turnHasPendingSuggestion']);
  // Every prop name is one cc43287c9 passes ope.
  const mte = v3('cc43287c9-Me-M2ucD.js');
  const call = mte.slice(mte.indexOf('children:ms?p(ope,{'), mte.indexOf('`${Hn.id}:next-actions`'));
  assert.ok(call.length > 100);
  for (const name of Object.keys(row.props)) assert.ok(call.includes(`${name}:`), name);
});

test('TR1 isReadOnly: NM over the archived session reaches MM and lo, as Mte `on`', () => {
  const nm = v1('shared-19-CkPOiIKm.js'), transcript = v1('cf74bc599-D9NZWRyl.js'), mte = v1('cc43287c9-DAfOi8yP.js');
  assert.equal(count(nm, 'function NM(e){return e.isShared||e.isSessionNotFound||e.isArchived||e.isProjectsGateOffGrouped||e.isCliMirror||e.isFailedInit||e.isConversationWorkspace}'), 1);
  assert.equal(count(nm, ',NM as Ed,'), 1);
  assert.equal(count(transcript, ',Ed as it,'), 1);
  assert.equal(count(transcript, 'L=l?.isArchived??!1'), 1);
  assert.equal(count(transcript, 'G=it({isShared:ee,isSessionNotFound:M,isArchived:L,'), 1);
  assert.equal(count(mte, 'da=Ur({isReadOnly:on,'), 1);
  assert.equal(M.sessionReadOnly({}), false);
  assert.equal(M.sessionReadOnly({ isArchived: true }), true);
  const isPlanReview = () => false;
  assert.deepEqual(M.codeTurnBoxRegionProps({ items: [], running: false, shownApprovals: [], isPlanReview, archived: true }),
    { isResponding: false, latestPromptId: undefined, composerVisible: false, isPlanApproval: false, isReadOnly: true });
  assert.equal(M.codeTurnBoxRegionProps({ items: [], running: false, shownApprovals: [], isPlanReview }).isReadOnly, false);
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.equal(count(main, 'codeTurnBoxRegionProps({ items, running, shownApprovals, isPlanReview: isPlanReviewRequest, archived: session?.archived })'), 1);
  assert.equal(count(main, 'readOnly: !!session?.archived, isPanelActive: splitActive'), 1, 'the session rail reads the same flag');
});

test('TR1 style: the inherit-color rule had no consumer and is gone; the first-line rule stays', () => {
  const css = fs.readFileSync(path.join(app, 'src/source-turn-box.css'), 'utf8');
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal(count(rules, '.epitaxy-markdown-inherit-color'), 0);
  assert.equal(count(rules, '.epitaxy-markdown-first-line{height:1lh;'), 1);
  const official = v1('c19e90103-CuNz46ca.css');
  assert.equal(count(official, '.epitaxy-markdown-inherit-color .epitaxy-markdown{color:inherit}'), 1);
  // Lu still carries the class (official DOM), but what renders inside it has no .epitaxy-markdown element.
  assert.equal(count(generated('todo-list.mjs'), '"epitaxy-markdown-inherit-color min-w-0 flex-1"'), 1);
  const html = renderToStaticMarkup(React.createElement(A.TodoMarkdown, null, 'Run **the** tests in `app/`'));
  assert.equal(count(html, 'epitaxy-markdown'), 0);
  // No host stylesheet carries the rule. public/assets (prepare-ui output) may hold c19e90103-CuNz46ca.css: 3.6556.2
  // preloads that official sheet for the inline diff / MCP app card (`"assets/v1/c19e90103-CuNz46ca.css"` in their
  // __vite__mapDeps) and prepare-ui ships it as is (only `/assets/v1/` → `./`), so a copy byte-equal to the official file
  // is the official DOM's own rule, not a host one; it still matches nothing in the turn box (see the SSR check above).
  const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
  const officialCopy = (dir, f) => dir === 'public/assets' && fs.existsSync(path.join(snapshot, path.basename(f)))
    && fs.readFileSync(path.join(app, dir, f), 'utf8') === fs.readFileSync(path.join(snapshot, path.basename(f)), 'utf8').replaceAll('/assets/v1/', './');
  for (const dir of ['src', 'public/assets']) {
    if (!fs.existsSync(path.join(app, dir))) continue;
    const hits = fs.readdirSync(path.join(app, dir), { recursive: true }).filter((f) => /\.css$/.test(f))
      .filter((f) => fs.readFileSync(path.join(app, dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').includes('.epitaxy-markdown-inherit-color'))
      .filter((f) => !officialCopy(dir, f));
    assert.deepEqual(hits, [], dir);
  }
});

// ---- W12c (w12b-turnbox-ls #27): Sg's archiveHeldBack is shared-46 sL over store rows that carry the host's ZI fields.
test('W12c #27 official + generator: Sg reads He = shared-46 sL through Jr (the sessions store); sL is generated, one appFeatures store', async () => {
  const sg = v3('c73f45bc3-B7hbL7H9.js');
  const from = (name) => [...sg.matchAll(/import\{([^}]*)\}from"([^"]+)"/g)].filter((m) => new RegExp(`(?:^|,)${name.replace('$', '\\$')}(?:,|$)`).test(m[1])).map((m) => m[2]);
  assert.deepEqual(from('L as He'), ['./shared-46-BIbZBGFq.js']);
  assert.deepEqual(from('Df as Jr'), ['./shared-8-Db1QN4mf.js']);
  assert.equal(count(sg, 'ee=J3($,36,U,p,e)?K3($,36,U,p,e,t=>e?.type==="local"&&U===!0&&$i(p)?He(t.sessions,e.id):void 0):$[39],te=Jr(ee),ne=e?.type==="local"?te:p!=="merged"'), 1);
  const s46 = v3('shared-46-BIbZBGFq.js');
  assert.equal(count(s46, 'sL as L'), 1);
  assert.equal(count(s46, 'function sL(e,t){let n=e.find(e=>e.sessionId===t);return n===void 0||!ZI(n)||n.autoArchiveHold!==void 0||cL(e,t)}'), 1);
  assert.equal(count(s46, 'function ZI(e){return!e.isRunning&&!e.turnRunning&&!e.hasBackgroundActivity&&!e.starting&&!e.isStarred&&!e.manualKeepAwake&&!e.heldInput?.uuids.length&&!e.loops?.length&&e.lanyard?.state!=="connected"&&!e.pendingToolPermissions?.length&&!e.pendingRefusalFallbackPrompt&&!e.pendingAutoModeServerFallbackPrompt&&!e.pendingLanyardConsent&&!e.pendingViolinBowPrompt}'), 1);
  assert.equal(count(s46, 'function aL(e,t,n){return n==="archive"&&ui.getState().appFeatures?.nestedArchiveKeepsFamily?.status==="supported"'), 1);
  assert.equal(count(s46, 'vb as ui'), 1);
  assert.equal(count(v3('shared-78-D5Fw2h0a.js'), 'vb as ui') + count(v3('shared-78-D5Fw2h0a.js'), 'W as vb'), 1, 'shared-78 exports W as vb');
  const manifest = JSON.parse(generated('manifest.json'));
  const status = manifest.modules.find((m) => m.target === 'session-status.mjs');
  assert.equal(status.exports.sL, 'archiveHeldBack');
  for (const name of ['sL', 'ZI', 'cL', 'rL', 'oL', 'eL', 'aL', 'GI', 'tL']) assert.ok(status.bindings.some((b) => b.name === name), name);
  assert.deepEqual(status.imports.find((i) => i.local === 'ui'), { local: 'ui', from: '../../source-turn-box-adapters.jsx', name: 'appFeaturesStore',
    via: 'shared-78-D5Fw2h0a.js:vb', kind: 'adapter', original: 'W' });
  // No second appFeatures store: the turn box's shared-78 slice holds neither W nor its zustand body U.
  const s78 = manifest.modules.find((m) => m.target === 'shared-78.mjs');
  assert.ok(!s78.bindings.some((b) => ['W', 'U', 'cC', 'sC'].includes(b.name)));
  assert.equal(count(generated('shared-78.mjs'), 'desktopBootFeatures'), 0);
  assert.ok(manifest.callSites.some((c) => c.raw && c.features.includes('te=Jr(ee),ne=e?.type==="local"?te:p!=="merged"')));
  assert.ok(manifest.importPins.some((p) => p.source === 'c73f45bc3-B7hbL7H9.js' && p.names.L === 'He'));
  assert.equal(A.appFeaturesStore.getState().appFeatures.nestedArchiveKeepsFamily.status, 'unavailable');
  // The adapter: te is the store selecting sL once the host knows the family's loops / monitors, else held back.
  const adapters = fs.readFileSync(path.join(app, 'src/source-turn-box-adapters.jsx'), 'utf8');
  assert.equal(count(adapters, '? (host?.archiveFactsKnown?.(r) === true ? archiveHeldBack(t.sessions, r) : true) : undefined));'), 1);
  assert.equal(count(adapters, 'prStateEndsSession(p) ? true : undefined'), 0);
  // main.jsx hands the host the metadata (pinned / keepAwake / family), the open session's tasks and the bridge.
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.equal(count(main, 'metadata: shownSessionMetadata, tasks, desktop: api,'), 1);
});

test('W12c #27 sL: the generated original over host-shaped rows', async () => {
  const S = await server.ssrLoadModule('/src/generated/turn-box/session-status.mjs');
  const idle = M.archiveHoldFields({});
  assert.deepEqual(idle, { isRunning: false, turnRunning: false, hasBackgroundActivity: false, isStarred: false, manualKeepAwake: false, loops: [], pendingToolPermissions: [] });
  const row = (sessionId, fields = {}, extra = {}) => ({ sessionId, ...M.archiveHoldFields(fields), ...extra });
  assert.equal(S.archiveHeldBack([row('P')], 'P'), false, 'an idle session is not held back');
  assert.equal(S.archiveHeldBack([], 'P'), true, 'a session the store does not hold');
  assert.equal(S.archiveHeldBack([row('P', { running: true })], 'P'), true, 'a turn runs');
  assert.equal(S.archiveHeldBack([row('P', { backgroundRunning: true })], 'P'), true, 'a background task runs');
  assert.equal(S.archiveHeldBack([row('P', { monitors: [{ id: 'm', status: 'running' }] })], 'P'), true, 'a monitor runs');
  assert.equal(S.archiveHeldBack([row('P', { monitors: [{ id: 'm', status: 'completed' }] })], 'P'), false, 'a finished monitor');
  assert.equal(S.archiveHeldBack([row('P', { meta: { pinned: true } })], 'P'), true, 'pinned');
  assert.equal(S.archiveHeldBack([row('P', { meta: { keepAwake: true } })], 'P'), true, 'kept awake');
  assert.equal(S.archiveHeldBack([row('P', { loops: [{ id: 'job-1', prompt: 'check', cron: '*/5 * * * *' }] })], 'P'), true, 'a loop');
  assert.equal(S.archiveHeldBack([row('P', { requests: [{ id: 1 }] })], 'P'), true, 'a pending request');
  // The side-session family (eL / oL / cL): an idle btw child goes with the parent; a busy one holds it back.
  const child = (fields) => row('C', fields, { spawnedFrom: { sessionId: 'P', sideSession: true, userFork: true, btw: true } });
  assert.equal(S.archiveHeldBack([row('P'), child({})], 'P'), false);
  assert.equal(S.archiveHeldBack([row('P'), child({ running: true })], 'P'), true);
  assert.equal(S.archiveHeldBack([row('P'), child({ loops: [{ id: 'j' }] })], 'P'), true);
  assert.equal(S.archiveHeldBack([row('P'), { ...child({ running: true }), isArchived: true }], 'P'), false, 'an archived child is not family');
  // The family the host reads feeds for: the open session and its unarchived side sessions, down the tree.
  const metadata = { C: { spawnedFrom: { sessionId: 'P', sideSession: true } }, D: { spawnedFrom: { sessionId: 'C', sideSession: true } },
    T: { spawnedFrom: { sessionId: 'P', sideSession: false, taskId: 'task_00000001' } }, X: { spawnedFrom: { sessionId: 'P', sideSession: true } } };
  assert.deepEqual(M.archiveFamily('P', [{ id: 'X', archived: true }], metadata), ['P', 'C', 'D']);
  assert.deepEqual(M.archiveFamily(null, [], metadata), []);
});

test('W12c #27 host: TurnBoxHost rows carry the family\'s ZI fields from state, metadata and the loop / monitor feeds (client render)', async () => {
  const { act } = React;
  const { createRoot } = await import('react-dom/client');
  const listeners = new Set();
  const doc = { nodeType: 9, nodeName: '#document', activeElement: null, body: null, visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
  const container = { nodeType: 1, nodeName: 'DIV', tagName: 'DIV', ownerDocument: doc, addEventListener() {}, removeEventListener() {}, childNodes: [],
    appendChild(child) { this.childNodes.push(child); return child; }, removeChild(child) { return child; } };
  const win = { event: undefined, document: doc, HTMLIFrameElement: class {}, addEventListener() {}, removeEventListener() {} };
  const saved = ['IS_REACT_ACT_ENVIRONMENT', 'window'].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'window', { value: win, configurable: true, writable: true });
  const calls = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const desktop = {
    call: async (action, { sessionId }) => { calls.push(`${action}:${sessionId}`); await gate; return []; },
    onEvent: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
  const merged = { state: 'merged', number: 3, url: 'https://github.com/o/r/pull/3' };
  const sessions = [{ id: 'P', name: 'P', cwd: '/w', prInfo: { url: merged.url, number: 3, state: 'MERGED' } }, { id: 'C', name: 'C', cwd: '/w' }];
  const storeRows = [{ sessionId: 'P' }, { sessionId: 'C', spawnedFrom: { sessionId: 'P', sideSession: true, btw: true } }, { sessionId: 'Z' }];
  let state = { items: {}, active: {}, approvals: [] };
  let metadata = { C: { spawnedFrom: { sessionId: 'P', sideSession: true, btw: true } } };
  let host = null, result = null;
  const ref = { id: 'P', type: 'local' };
  function Rules() { result = A.useNextActionRules(ref, { commands: allCommands, lastActivityAt: Date.now() - 3 * 3600e3 }); return null; }
  function Host() {
    host = M.useCodeTurnBoxHost({ state, planMarks: {}, currentId: 'P', requestOwner: () => 'P', sessions, metadata, tasks: [], desktop });
    return React.createElement(A.TurnBoxHost.Provider, { value: host }, React.createElement(Rules));
  }
  // xg (useIdleOnReturn) reads the owner window (shared-frame aa: no CdsOwnerWindowContext element → globalThis.window).
  const tree = () => React.createElement(PA.ProposalHostProvider, { value: { sessions: storeRows } }, React.createElement(Host));
  const derived = () => result.evaluation.derived.map((chip) => chip.key);
  const root = createRoot(container);
  try {
    await act(async () => { root.render(tree()); });
    assert.deepEqual(calls.sort(), ['monitor-state:C', 'monitor-state:P', 'schedule-state:C', 'schedule-state:P']);
    assert.equal(host.archiveFactsKnown('P'), false, 'feeds not read yet');
    assert.deepEqual(derived(), [], 'held back until the loops and monitors are known (Sg: idle on return, merged PR)');
    await act(async () => { release(); await gate; });
    assert.equal(host.archiveFactsKnown('P'), true);
    assert.equal(host.archiveFactsKnown('C'), false, 'only the open session');
    const rows = host.sessions;
    assert.deepEqual(rows.find((r) => r.sessionId === 'P'), { sessionId: 'P', ...M.archiveHoldFields({}) });
    assert.deepEqual(rows.find((r) => r.sessionId === 'Z'), { sessionId: 'Z' }, 'rows outside the family are the card\'s');
    assert.equal(host.sessions, rows, 'one projection per store list');
    assert.deepEqual(derived(), ['rule:archive', 'rule:new_session'], 'idle, merged, family idle: not held back');
    // A loop scheduled on the open session (its {kind:"schedules"} event) holds the chips back again.
    await act(async () => { for (const listener of listeners) listener({ kind: 'schedules', sessionId: 'P', jobs: [{ id: 'job-1', prompt: 'check', cron: '*/5 * * * *' }] }); });
    assert.equal(host.sessions.find((r) => r.sessionId === 'P').loops.length, 1);
    assert.deepEqual(derived(), []);
    await act(async () => { for (const listener of listeners) listener({ kind: 'schedules', sessionId: 'P', jobs: [] }); });
    assert.deepEqual(derived(), ['rule:archive', 'rule:new_session']);
    // A running monitor on the btw child, then a turn on it: the family cannot go with the parent.
    await act(async () => { for (const listener of listeners) listener({ kind: 'monitors', sessionId: 'C', monitors: [{ id: 'm', status: 'running' }] }); });
    assert.equal(host.sessions.find((r) => r.sessionId === 'C').hasBackgroundActivity, true);
    assert.deepEqual(derived(), []);
    await act(async () => { for (const listener of listeners) listener({ kind: 'monitors', sessionId: 'C', monitors: [] }); });
    state = { ...state, active: { C: 'turn-1' } };
    await act(async () => { root.render(tree()); });
    assert.deepEqual(derived(), []);
    // Pinned (sessionMetadata pinned) holds it back too.
    state = { ...state, active: {} };
    metadata = { ...metadata, P: { pinned: true } };
    await act(async () => { root.render(tree()); });
    assert.equal(host.sessions.find((r) => r.sessionId === 'P').isStarred, true);
    assert.deepEqual(derived(), []);
  } finally {
    await act(async () => { root.unmount(); });
    for (const [name, descriptor] of saved) if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
  }
});
