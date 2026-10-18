// R4i-transcript TR1 (transcript-turn-box TB-4, tasks-06): the next-step row's rule chips. The chip row z$ and the rule
// evaluation sm runs (cd4f82e77 lt / V / pt / mt / dt / rt / ot, c73f45bc3 om and the streak memory) are generated
// originals; src/source-turn-box-adapters.jsx useNextActionRules is sm's body over what the host knows. The rule labels
// are `secret:` gated messages no shipped catalog has, so the row takes the official "label missing" branch. Also the
// TB-3 follow-ups: isReadOnly (shared-19 NM → Mte `on`) and the dropped `.epitaxy-markdown-inherit-color` rule.
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
const v1 = (name) => fs.readFileSync(path.join(reference, 'ion-dist/assets/v1', name), 'utf8');
const generated = (name) => fs.readFileSync(path.join(app, 'src/generated/turn-box', name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
let server, A, C, E, N, M, B;
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
  // Neither the static nor the dynamic en-US catalog has any of the 26 ids (plain or secret-prefixed).
  for (const file of ['ion-dist/i18n/en-US.json', 'ion-dist/i18n/dynamic/en-US.json']) {
    const catalog = JSON.parse(fs.readFileSync(path.join(reference, file), 'utf8'));
    for (const id of LABEL_IDS) assert.equal(Object.hasOwn(catalog, id) || Object.hasOwn(catalog, `secret:${id}`), false, `${file} ${id}`);
  }
});

test('TR1 generator: z$ and the rule evaluation are generated originals; the stub adapters are gone', () => {
  const session = generated('epitaxy-session.mjs');
  assert.equal(count(session, 'z$ as NextActionChipRow'), 1);
  assert.equal(count(session, 'k = w !== void 0 || sm(O),'), 1);
  assert.equal(count(session, 'shortcut: h.composerHoldsDraft ? void 0 : "cmd+enter"'), 1);
  const box = generated('turn-box.mjs');
  assert.equal(count(box, 'NextActionChipRow as Fs,'), 1);
  assert.equal(count(box, 'P$ as Ws,'), 1, 'the turn observer id is the original P$');
  assert.equal(count(box, '} from "./epitaxy-session.mjs";'), 1);
  // hT keeps only the non-app-action rule chips while the turn box is hosted (H = xs(e) = canHostTurnBox, presets on).
  assert.equal(count(box, 'H = xs(e),'), 1);
  assert.equal(count(box, '? ae.filter((e) => !fT(e))'), 1);
  assert.equal(A.NextActionChipRow, undefined);
  assert.equal(A.useTurnObserverId, undefined);
  const manifest = JSON.parse(generated('manifest.json'));
  const chip = manifest.modules.find((m) => m.target === 'chip-text.mjs');
  assert.deepEqual(Object.values(chip.exports).sort(), ['NEXT_ACTION_RULES', 'NEXT_ACTION_RULE_ORDER', 'chipRowLabelAvailable', 'chipStateKey', 'commandLabelAvailable',
    'evaluateNextActionRules', 'firingNextActionRules', 'keepShownChips', 'namedRuleChip', 'prStateEndsSession', 'pullRequestRuleState', 'retireShownChips']);
  const memory = manifest.modules.find((m) => m.target === 'next-action-memory.mjs');
  assert.equal(memory.source, 'c73f45bc3-CFrHin0p.js');
  assert.deepEqual(memory.imports.filter((i) => i.kind === 'adapter').map((i) => i.name).sort(), ['onPaneHiddenChange', 'useLayerOwnerWindow', 'usePaneHiddenStore']);
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
  // The catalog checks: only new_session without the gated labels.
  const bare = { messages: {} };
  assert.equal(C.commandLabelAvailable(bare, 'new_session'), true);
  for (const id of ['correct_slash_command', 'reconnect_connector', 'create_pr', 'archive']) assert.equal(C.commandLabelAvailable(bare, id), false, id);
  assert.equal(C.chipRowLabelAvailable(bare), false);
  assert.equal(C.chipRowLabelAvailable({ messages: { 'secret:hlf4y0': 'x' } }), true);
});

// One render of useNextActionRules over a host (SSR: effects do not run, so om's idle check has not happened yet).
function rules(host, sessionRef, options) {
  let out = null;
  function Probe() { out = A.useNextActionRules(sessionRef, options); return null; }
  renderToStaticMarkup(React.createElement(A.TurnBoxHost.Provider, { value: host }, React.createElement(Probe)));
  return out;
}
test('TR1 adapter: sm over the host — responding from the host, PR from the session row, no invented inputs', () => {
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
});

const newSession = { key: 'rule:new_session', source: 'rule', ruleId: 'new_session', kind: 'command', command: 'new_session' };
const chipRow = (catalog, props) => renderToStaticMarkup(React.createElement(A.TurnBoxCatalog.Provider, { value: catalog },
  React.createElement(E.NextActionChipRow, { chips: [newSession], surface: 'composer', sessionType: 'local', sessionId: 'P', onActivate: () => 'none', ...props })));
test('TR1 z$: the original row renders only with its gated group label; the host catalog has none', () => {
  assert.equal(chipRow(null), '', 'host catalog: the row is off');
  assert.equal(chipRow(null, { chips: [], evaluation: { isResponding: true, derived: [] } }), '');
  // A catalog that carries the gated label (test values, not product strings) lights the original row up.
  const html = chipRow({ 'secret:hlf4y0': 'TEST row label' });
  assert.match(html, /^<div role="group" aria-label="TEST row label" class="flex min-w-0 ">/);
  assert.equal(count(html, 'New session'), 1);
  assert.equal(count(html, '<button'), 1);
  // An explicit group label (the desktop's other surfaces pass one) needs no catalog entry.
  assert.match(chipRow(null, { groupLabel: 'Group' }), /aria-label="Group"/);
});

test('TR1 hT: the mounted next row stays empty — app-action chips are dropped under presets and the rest have no input', () => {
  const ref = { id: 'P', type: 'local' };
  const host = { responding: () => false, pullRequest: () => ({ state: 'merged', number: 1, url: 'https://github.com/o/r/pull/1' }),
    sessionInfo: () => ({ lastActivityAt: 1, createdAt: 1 }) };
  const catalog = Object.fromEntries(LABEL_IDS.map((id) => [`secret:${id}`, `TEST ${id}`]));
  for (const value of [null, catalog]) {
    const html = renderToStaticMarkup(React.createElement(A.TurnBoxCatalog.Provider, { value },
      React.createElement(A.TurnBoxHost.Provider, { value: host },
        React.createElement(B.NextActionsRow, { sessionRef: ref, composerRef: { current: null }, latestPromptId: 'p1', turnSettled: true }))));
    assert.equal(html, '', value ? 'even with every gated label' : 'host catalog');
  }
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
  for (const dir of ['src', 'public/assets']) {
    const hits = fs.readdirSync(path.join(app, dir), { recursive: true }).filter((f) => /\.css$/.test(f))
      .filter((f) => fs.readFileSync(path.join(app, dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').includes('.epitaxy-markdown-inherit-color'));
    assert.deepEqual(hits, [], dir);
  }
});
