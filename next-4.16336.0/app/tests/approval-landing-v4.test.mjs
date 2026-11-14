// Region batch 2a (approval-landing, region-plan G6 / cutover.oldConsumersAtGeneration): the isolated 4.16336.0 graph of
// the approval card slot's landing originals (src/generated/approval-landing-v4, scripts/extract-approval-landing.mjs
// version 4.16336.0, sharedGraph cds-core, linking src/generated/btw-pane-v4). The 3.6556.2 graph
// (src/generated/approval-landing) keeps serving the host and the 3.6556.2 consumers that link it by original identity
// (cowork-approval, proposal-group, question-card) until the cutover; tests/approval-card-model, question-card-* and
// btw-pane-render keep pinning it. Official code is never executed here: the generated modules are imported, the chunks
// only read as text.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, rmSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import path from 'node:path';
import React from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as official from '../scripts/official-4.16336.0.mjs';
import { contractVersions, contract4, extractApprovalLanding, extractContract } from '../scripts/extract-approval-landing.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';
import { fakeWindow } from './fixtures/approval-landing-dom.mjs';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';

const app = path.resolve(import.meta.dirname, '..');
const out = path.join(app, 'src/generated/approval-landing-v4');
const legacyOut = path.join(app, 'src/generated/approval-landing');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const chunk = name => readFileSync(path.join(official.ionSource, name), 'utf8');
const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
const mod = target => manifest.modules.find(m => m.target === target);
const exportsOf = name => [...chunk(name).matchAll(/export\{([^}]*)\}/g)].at(-1)[1].split(',');
const rawDeclarations = new Map();
function rawDeclaration(file, name) {
  if (!rawDeclarations.has(file)) {
    const text = chunk(file);
    rawDeclarations.set(file, { text, nodes: new Map(parsers.babel.parse(text, {}).program.body.flatMap(node => (node.type === 'FunctionDeclaration' ? [[node.id.name, node]]
      : node.type === 'VariableDeclaration' ? node.declarations.filter(d => d.id.type === 'Identifier').map(d => [d.id.name, d]) : []))) });
  }
  const { text, nodes } = rawDeclarations.get(file), node = nodes.get(name);
  assert.ok(node, `${file}: no top-level declaration ${name}`);
  return text.slice(node.start, node.end);
}

// card-landing and the hook read React Compiler helpers and cds-core (whose host adapters are .jsx): Vite SSR, one graph.
const server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
after(() => server.close());
const load = target => server.ssrLoadModule(`/src/generated/approval-landing-v4/${target}`);
const landing = await load('card-landing.mjs');
const attention = await load('window-attention.mjs');
const ring = await load('focus-ring.mjs');
const reveal = await load('reveal-guard.mjs');
const { isKeyboardActivatedClick } = await load('keyboard-click.mjs');
const { questionStopNameAttribute } = await load('question-stop-name.mjs');
const { hostGrowthBookFeature } = await server.ssrLoadModule('/src/cds-core-adapter.mjs');
const { readGrowthBookValue } = await server.ssrLoadModule('/src/btw-focus-host.mjs');

test('both contracts regenerate byte for byte; the 3.6556.2 graph and its consumers stay on 3.6556.2', async () => {
  assert.deepEqual(contractVersions, ['3.6556.2', '4.16336.0']);
  assert.deepEqual(await extractApprovalLanding({ check: true, version: '4.16336.0' }), manifest);
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-approval-landing.mjs');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(manifest.linkedGraph, 'btw-pane-v4');
  assert.deepEqual(manifest.isolatedGraph, { legacyOutput: 'src/generated/approval-landing', productionSwitchNotBeforeBatch: 8,
    heldBy: ['cowork-approval', 'proposal-group', 'question-card', 'src/source-approval-card.jsx', 'src/source-btw-pane.jsx',
      'src/source-plan-card.jsx', 'src/source-question-card.jsx'] });
  assert.deepEqual(manifest.modules.map(m => [m.target, m.source]), [
    ['compiler-helpers.mjs', 'shared-frame-CJdE5Ria.js'], ['owner-globals.mjs', 'shared-25-D-aF0gt9.js'],
    ['question-stop-name.mjs', 'shared-33-DtdykY0y.js'], ['focus-name.mjs', 'cd8405c1a-DmdA7k6H.js'],
    ['focus-ring.mjs', 'c37aeaf53-Cm_eXF4J.js'], ['window-attention.mjs', 'shared-26-B-POtn5S.js'],
    ['window-attention-hook.mjs', 'shared-26-B-POtn5S.js'], ['keyboard-click.mjs', 'shared-1-D1bGaTaN.js'],
    ['card-landing.mjs', 'c6dc54e94-Ci7MQEoh.js'], ['reveal-guard.mjs', 'c96d752d0-D9VB6ArX.js']]);
  assert.deepEqual(readdirSync(out).sort(), [...manifest.modules.map(m => m.target), 'manifest.json'].sort());
  for (const m of manifest.modules) {
    assert.equal(m.sourceSha256, sha(readFileSync(path.join(official.ionSource, m.source))), m.source);
    assert.equal(m.sha256, sha(readFileSync(path.join(out, m.target))), m.target);
    assert.match(readFileSync(path.join(out, m.target), 'utf8'), /^\/\/ Original Claude Desktop 4\.16336\.0 bindings from /);
  }
  // The 3.6556.2 graph: same contract, same bytes, still linking the 3.6556.2 btw-pane graph and view-tabs.
  const legacy = await extractApprovalLanding({ check: true });
  assert.equal(legacy.referenceVersion, '3.6556.2');
  const legacyText = readdirSync(legacyOut).filter(n => n.endsWith('.mjs')).map(n => readFileSync(path.join(legacyOut, n), 'utf8')).join('\n');
  assert.match(legacyText, /from "\.\.\/btw-pane\//); assert.doesNotMatch(legacyText, /btw-pane-v4|cds-core|approval-landing-v4/);
  // Its consumers link it by original identity (3.6556.2 manifests, ../approval-landing/ imports): nothing links -v4 yet.
  for (const area of ['cowork-approval', 'proposal-group', 'question-card']) {
    const consumer = JSON.parse(readFileSync(path.join(app, 'src/generated', area, 'manifest.json'), 'utf8'));
    assert.equal(consumer.referenceVersion, '3.6556.2', area);
    const text = readdirSync(path.join(app, 'src/generated', area)).filter(n => /\.m?js$/.test(n))
      .map(n => readFileSync(path.join(app, 'src/generated', area, n), 'utf8')).join('\n');
    assert.match(text, /from "\.\.\/approval-landing\//, area); assert.doesNotMatch(text, /approval-landing-v4/, area);
  }
  for (const file of readdirSync(path.join(app, 'src')).filter(n => /\.(m?js|jsx)$/.test(n)))
    assert.doesNotMatch(readFileSync(path.join(app, 'src', file), 'utf8'), /approval-landing-v4/, `host ${file} is not cut over`);
});

test('each root is the 4.16336.0 binding its chunk exports under the proved alias, or the slot\'s private helper', () => {
  assert.deepEqual(Object.fromEntries(manifest.modules.filter(m => m.roots).map(m => [m.target, m.roots])), {
    'owner-globals.mjs': { v_: 'ld' }, 'question-stop-name.mjs': { dG: 'at' }, 'focus-name.mjs': { s: 'a' },
    'focus-ring.mjs': { o: 'r', r: 't', i: 'n' }, 'window-attention.mjs': { MC: 'bp', RC: 'mp', IC: 'gp', yC: '_p', pC: 'Ep', FC: null },
    'window-attention-hook.mjs': { PC: 'wp' }, 'keyboard-click.mjs': { sI: 'Nd' },
    'card-landing.mjs': { B: 'v', ae: null, N: null, j: null, z: null, F: 'g', I: '_', P: 'h' }, 'reveal-guard.mjs': { Jst: 'Kt', ect: 'Wt' } });
  for (const m of manifest.modules.filter(m => m.roots))
    for (const [local, alias] of Object.entries(m.roots)) {
      const exported = exportsOf(m.source);
      if (alias) assert.ok(exported.includes(`${local} as ${alias}`), `${m.source} ${local} as ${alias}`);
      else assert.ok(!exported.some(pair => pair.startsWith(`${local} as `)), `${m.source} ${local} is private`);
    }
  // Same semantic exports as the 3.6556.2 graph, plus isLandedCard (c6dc54e94 P, `h`) and the keyboard click. Since
  // cds-core wave 4 publishes shared-25 xd / _d (getMutationObserverClass / ownerWindow), this graph links them and no
  // longer exports mutationObserverOf / ownerWindow of its own (no host module imports either from here).
  const legacy = JSON.parse(readFileSync(path.join(legacyOut, 'manifest.json'), 'utf8'));
  const names = list => list.flatMap(m => Object.values(m.exports)).sort();
  assert.deepEqual(names(manifest.modules).filter(n => !names(legacy.modules).includes(n)).sort(),
    ['isKeyboardActivatedClick', 'isLandedCard', 'memoChanged1', 'memoChanged3', 'memoChanged5', 'memoStore1', 'memoStore2', 'memoStore5']);
  assert.deepEqual(names(legacy.modules).filter(n => !names(manifest.modules).includes(n)), ['mutationObserverOf']);
  // c6dc54e94-Ci7MQEoh.js (3.6556.2 c9ed5627b A) imports the tracker, the focus ring and btw-pane's focus roots.
  const slot = chunk('c6dc54e94-Ci7MQEoh.js');
  for (const feature of ['import{Ep as p,_p as m,bp as h,gp as g,mp as _}from"./shared-26-B-POtn5S.js"', 'import{Cd as u,Nd as d,Sd as f}from"./shared-1-D1bGaTaN.js"',
    'import{i as w,n as T,r as ee,t as te}from"./c37aeaf53-Cm_eXF4J.js"', 'function ie(){return s("__gb__1616707004")}', 'var L=1e4',
    'return f(r,i),R(t,n),null', 'performance.now()-r<L&&w(e.ownerDocument)&&t(e)'])
    assert.ok(slot.includes(feature), feature);
  // c96d752d0: the reveal guard, read by cf74bc599 / cd8124ecc as before; the inline approval host reads i2 (`Ut`).
  const host = chunk('c96d752d0-D9VB6ArX.js');
  for (const feature of ['function Jst(e,t){return M0(e,t!==void 0&&t).armed}', 'function ect(e){return e?$st:Qst}', 'i2 as Ut', 'D=i2(r===null?w:`${r}:${x}:${p}`,E)'])
    assert.ok(host.includes(feature), feature);
  for (const file of ['cf74bc599-BytvntCE.js', 'cd8124ecc-BNFPksnP.js']) assert.match(chunk(file), /Kt as [\w$]+[^}]*\}from"\.\/c96d752d0-D9VB6ArX\.js"/, file);
  assert.equal(questionStopNameAttribute, 'data-question-stop-name');
  assert.ok(chunk('cd8405c1a-DmdA7k6H.js').includes('import{at as e}from"./shared-33-DtdykY0y.js"'));
});

test('sharedGraph cds-core and btw-pane-v4: linked by name, held copies equal, compiler helpers proved, no dynamic import', () => {
  const core = JSON.parse(readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  const btw = JSON.parse(readFileSync(path.join(app, 'src/generated/btw-pane-v4/manifest.json'), 'utf8'));
  assert.equal(core.referenceVersion, '4.16336.0'); assert.equal(btw.referenceVersion, '4.16336.0'); assert.equal(btw.sharedGraph, 'cds-core');
  const held = new Map(core.modules.flatMap(m => m.bindings.map(b => [`${path.basename(m.source)}#${b.name}`, b.sha256])));
  const published = new Map(Object.entries(core.publicNames).map(([name, e]) => [`${e.file}#${e.local}`, { name, ...e }]));
  const btwModules = new Map(btw.modules.map(m => [`../btw-pane-v4/${m.target}`, m]));
  const kinds = new Set();
  for (const m of manifest.modules) {
    const text = readFileSync(path.join(out, m.target), 'utf8');
    assert.doesNotMatch(text, /view-tabs|\bimport\(/, m.target);
    for (const i of m.imports) {
      kinds.add(i.kind);
      if (i.kind === 'react') assert.ok(['react', 'react/jsx-runtime'].includes(i.from), i.from);
      if (i.kind === 'generated') assert.ok(mod(i.from.slice(2))?.exports[i.original] === i.name, `${m.target} ${i.local}`);
      if (i.kind === 'linked') {
        const linked = btwModules.get(i.from);
        assert.ok(linked, i.from); assert.equal(linked.exports[i.original], i.name, `${m.target} ${i.local}`);
        assert.equal(linked.source, i.via.split(/[#:]/)[0]);
      }
      if (i.kind === 'shared-graph') {
        const entry = published.get(`${i.via.split(/[#:]/)[0]}#${i.original}`);
        assert.ok(entry, `${m.target} ${i.via} is a cds-core publicName`);
        assert.equal(i.from, `../cds-core/${entry.target}`); assert.equal(i.name, entry.exportName);
        assert.equal(i.linkedSha256, held.get(`${entry.file}#${entry.local}`));
        assert.equal(sha(rawDeclaration(entry.file, entry.local)), i.linkedSha256);
      }
    }
    for (const b of m.bindings) {
      const key = `${m.source}#${b.name}`;
      assert.equal(m.heldByCdsCore.includes(b.name), held.has(key), key);
      assert.ok(!published.has(key), `${key} is a cds-core publicName: link it`);
      if (held.has(key)) assert.equal(sha(rawDeclaration(m.source, b.name)), held.get(key), `${key} is the declaration cds-core holds`);
    }
    for (const name of m.heldByLinked) {
      const holder = btw.modules.find(x => x.source === m.source && x.bindings.some(b => b.name === name));
      assert.equal(holder.bindings.find(b => b.name === name).sha256, m.bindings.find(b => b.name === name).sha256, `${m.target} ${name}`);
      assert.ok(!Object.hasOwn(holder.exports, name), `${name} is exported by btw-pane-v4/${holder.target}: link it`);
    }
  }
  assert.deepEqual([...kinds].sort(), ['generated', 'host', 'linked', 'react', 'shared-graph']);
  // cds-core wave 6 also holds the pure owner-globals helpers __ / g_ / v_ (closure of its published bindings, no
  // publicName): they are cut again only as the very declaration cds-core holds.
  assert.deepEqual(Object.fromEntries(manifest.modules.map(m => [m.target, m.heldByCdsCore.slice().sort()])), {
    'compiler-helpers.mjs': ['J1', 'J3', 'J5', 'K1', 'K2', 'K5'], 'owner-globals.mjs': ['__', 'g_', 'v_'], 'question-stop-name.mjs': [],
    'focus-name.mjs': [], 'focus-ring.mjs': [], 'window-attention.mjs': [], 'window-attention-hook.mjs': [], 'keyboard-click.mjs': ['oI', 'sI'],
    'card-landing.mjs': [], 'reveal-guard.mjs': [] });
  assert.deepEqual(Object.fromEntries(manifest.modules.filter(m => m.heldByLinked.length).map(m => [m.target, m.heldByLinked])),
    { 'keyboard-click.mjs': ['sI', 'oI'] });
  // cds-core publishes asElementNode (Pt) and useCdsOwnerWindow (mo), since wave 4 getMutationObserverClass (xd) and
  // ownerWindow (_d), and since wave 5 modifierKeys (shared-1 vI): linked, never cut again
  // Since wave 7 shared-frame an (state_sharedframe_an, canFocusComposerOnClick) too: linked from cds-core, no longer
  // through btw-pane-v4 focus-on-click.mjs.
  assert.deepEqual(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'shared-graph').map(i => `${m.target}:${i.local}=${i.name}`)),
    ['focus-ring.mjs:e=getMutationObserverClass', 'window-attention.mjs:B=asElementNode', 'window-attention-hook.mjs:j=useCdsOwnerWindow',
      'card-landing.mjs:o=asElementNode', 'card-landing.mjs:u=vI', 'card-landing.mjs:i=an', 'card-landing.mjs:c=ownerWindow']);
  // E3: the compiler helpers btw-pane-v4 does not export are proved and cut once here; the rest come from btw-pane-v4.
  const proved = official.assertCompilerHelpers(chunk(official.sharedFrame));
  for (const [local, name] of Object.entries(mod('compiler-helpers.mjs').exports)) assert.equal(proved[name].local, local);
  const btwHelpers = btw.modules.find(m => m.target === 'compiler-helpers.mjs').exports;
  assert.deepEqual(Object.keys(mod('compiler-helpers.mjs').exports).filter(local => btwHelpers[local]), []);
  // shared-26 and c96d752d0 hold computed import(e) calls; none is part of this graph.
  assert.ok(/\bimport\(/.test(chunk('shared-26-B-POtn5S.js')) && /\bimport\(/.test(chunk('c96d752d0-D9VB6ArX.js')));
  // The one host adapter: sI's GrowthBook reader is cds-core's (its own copy of sI reads the same import through it).
  const hosts = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'host').map(i => [m.target, i.local, i.from, i.name, i.via, i.original]));
  assert.deepEqual(hosts, [['keyboard-click.mjs', 'jt', '../../cds-core-adapter.mjs', 'hostGrowthBookFeature', 'shared-0-CnnWnVrT.js:Rx', 'Uu']]);
  const coreShared1 = core.modules.find(m => m.target === 'shared-1.mjs');
  assert.ok(coreShared1.imports.some(i => i.local === 'jt' && i.from === '../../cds-core-adapter.mjs' && i.name === 'hostGrowthBookFeature'));
  assert.ok(chunk('shared-0-CnnWnVrT.js').includes('function Uu(e){let t=Wu(e);return t===void 0?zu(e):t}'));
  assert.equal(hostGrowthBookFeature('__gb__1951358650') === true, readGrowthBookValue('__gb__1951358650') === true,
    'this copy of sI and btw-pane-v4\'s answer the gate alike');
});

test('one tracker state: the hook, the slot and the reexports read window-attention.mjs, never a second WeakMap', () => {
  const hook = mod('window-attention-hook.mjs');
  assert.deepEqual(hook.bindings.map(b => b.name), ['PC']);
  assert.deepEqual(hook.imports.filter(i => i.from === './window-attention.mjs').map(i => `${i.local}=${i.name}`).sort(), ['EC=attentionChangeListeners', 'FC=windowUnattended']);
  assert.doesNotMatch(readFileSync(path.join(out, 'window-attention.mjs'), 'utf8'), /from "react"|cds-core\/shared-frame\.mjs";\n.*useCdsOwnerWindow/);
  assert.deepEqual(mod('window-attention.mjs').exports, { MC: 'watchWindowAttention', RC: 'windowAttended', IC: 'justGainedFocus', yC: 'isTrustedEvent',
    pC: 'eventDelay', FC: 'windowUnattended', EC: 'attentionChangeListeners', vC: 'trustedEventTest', bC: 'focusGraceMs', SC: 'modifierKeyNames',
    CC: 'attentionStates', wC: 'trackedWindows', TC: 'attentionStateOf', DC: 'setAttentionMark', OC: 'focusSettledAt', kC: 'inputCountsAsAttention',
    AC: 'windowHiddenAt', jC: 'trackWindowAttention', LC: 'isEmbeddedFrame', zC: 'attentionStateAttended' });
  const slot = mod('card-landing.mjs');
  assert.deepEqual(slot.bindings.map(b => b.name), ['ae', 'j', 'M', 'N', 'P', 'F', 'I', 'L', 'R', 'z', 'B']);
  assert.deepEqual(Object.fromEntries(slot.imports.filter(i => !['react', 'linked'].includes(i.kind) && !/compiler-helpers/.test(i.from)).map(i => [i.local, `${i.from}:${i.name}`])), {
    h: './window-attention.mjs:watchWindowAttention', _: './window-attention.mjs:windowAttended', p: './window-attention.mjs:eventDelay',
    m: './window-attention.mjs:isTrustedEvent', g: './window-attention.mjs:justGainedFocus', T: './focus-ring.mjs:ringClassesPositioned',
    ee: './focus-ring.mjs:focusWithRing', te: './focus-ring.mjs:ringClasses', o: '../cds-core/shared-frame.mjs:asElementNode',
    c: '../cds-core/shared-25.mjs:ownerWindow', u: '../cds-core/shared-1.mjs:vI', d: './keyboard-click.mjs:isKeyboardActivatedClick',
    i: '../cds-core/shared-frame.mjs:an' });
  assert.deepEqual(Object.fromEntries(slot.imports.filter(i => i.kind === 'linked' && !/compiler-helpers/.test(i.from)).map(i => [i.local, `${i.from}:${i.name}`])), {
    a: '../btw-pane-v4/focus-guard.mjs:guardStrayEnter', l: '../btw-pane-v4/owner-window.mjs:ownerWindowOrGlobal', w: '../btw-pane-v4/focus-lost.mjs:focusIsLost',
    f: '../btw-pane-v4/focus-hand-back.mjs:useFocusHandBack' });
  // The tracker state carries the 4.16336.0 claim fields the approval keyboard guard (shared-26 GC) writes.
  const { win } = fakeWindow();
  assert.deepEqual(Object.keys(attention.attentionStateOf(win)), ['gainedAtPerf', 'inputAtPerf', 'createdAtPerf', 'leftAtPerf', 'pointerAtPerf',
    'pressAtPerf', 'pressHandledAtPerf', 'hiddenFromPerf', 'hiddenSpells', 'claimedAt', 'claimedHandledAt', 'claimedBy', 'withheld']);
  assert.equal(attention.attentionStates.get(win), attention.attentionStateOf(win));
});

test('c6dc54e94 N: on a landed card plain Enter and ⌘⇧⏎ are swallowed, a letter goes to the composer, digits stay', () => {
  const { guardWindowAfterCard, afterCardState, isLandedCard } = landing;
  const { win, element, dispatch } = fakeWindow();
  guardWindowAfterCard(win); guardWindowAfterCard(win);
  assert.deepEqual(win.listeners.filter(l => l.target === 'window').map(l => [l.type, l.capture]),
    [['keydown', true], ['pointerdown', true], ['focusout', true]], 'installed once per window (M), all capture');
  const scope = element('div'), card = element('section'), moved = [];
  let chord = false;
  const drawn = { get chordActsAnywhere() { return chord; }, toComposer: from => moved.push(from) };
  card.focus(); afterCardState.set(win, { at: card, onCard: true, from: scope, drawn: () => drawn });
  assert.equal(isLandedCard(card), true, 'P: the landed card'); assert.equal(isLandedCard(scope), false);
  const swallowed = init => { const e = dispatch('keydown', init); return e.prevented && e.stopped; };
  assert.equal(swallowed({ key: 'Enter' }), true);
  assert.equal(swallowed({ key: 'Shift' }), false, 'a modifier is ignored (btw-pane-v4 modifierKeys)');
  assert.equal(swallowed({ key: 'Enter', metaKey: true }), false);
  assert.equal(swallowed({ key: 'Enter', metaKey: true, shiftKey: true }), true);
  chord = true;
  assert.equal(swallowed({ key: 'Enter', ctrlKey: true, shiftKey: true }), false, 'unless the drawn card\'s chord acts anywhere');
  for (const key of ['1', ' ', 'ArrowDown']) dispatch('keydown', { key });
  assert.deepEqual(moved, []);
  dispatch('keydown', { key: 'h' });
  assert.deepEqual(moved, [scope], 'a printable key hands focus to the composer with the slot\'s parent');
  element('button').focus();
  dispatch('keydown', { key: 'Enter' });
  assert.equal(afterCardState.has(win), false, 'focus elsewhere clears it on the next key');
  assert.equal(isLandedCard(card), false);
});

test('c6dc54e94 F / I: after a deliberate pick on the landed card, a deliberate Enter passes', () => {
  const { guardWindowAfterCard, afterCardState, deliberateCardKey, markCardPick } = landing;
  const { win, element, dispatch } = fakeWindow();
  guardWindowAfterCard(win);
  const scope = element('div'), card = element('section'), drawn = () => ({ chordActsAnywhere: false });
  const land = (extra = {}) => { card.focus(); afterCardState.set(win, { at: card, onCard: true, from: scope, drawn, since: performance.now() - 1000, ...extra }); };
  const swallowed = init => { const e = dispatch('keydown', init); return e.prevented && e.stopped; };
  land();
  assert.equal(swallowed({ key: 'Enter' }), true);
  const key = init => ({ type: 'keydown', target: card, repeat: false, metaKey: false, ctrlKey: false, altKey: false, isTrusted: true, ...init });
  assert.equal(deliberateCardKey(key({ key: '1' })), true);
  assert.equal(deliberateCardKey(key({ key: '1', repeat: true })), false);
  assert.equal(deliberateCardKey(key({ key: '1', altKey: true })), false);
  assert.equal(deliberateCardKey(key({ key: '1', isTrusted: false })), false);
  assert.equal(markCardPick(key({ key: '1' }), false), true);
  assert.equal(afterCardState.get(win).picked, undefined);
  assert.equal(markCardPick(key({ key: '1' }), true), true);
  assert.equal(afterCardState.get(win).picked, true);
  assert.equal(swallowed({ key: 'Enter' }), false, 'after the pick a deliberate Enter passes');
  assert.equal(swallowed({ key: 'Enter', repeat: true }), true);
  land({ since: performance.now(), picked: true });
  assert.equal(markCardPick(key({ key: '2' }), true), false, 'right after landing a key is not a pick');
  // The window just gained focus (tracker gainedAtPerf within 1s): not deliberate either.
  land();
  attention.attentionStateOf(win).gainedAtPerf = performance.now();
  assert.equal(deliberateCardKey(key({ key: '1' })), false);
  attention.attentionStateOf(win).gainedAtPerf = -Infinity;
  afterCardState.delete(win);
  assert.equal(markCardPick(key({ key: '1' }), true), true, 'off a landed card the card handles its keys as usual');
});

test('ae / o / s: the next card\'s root takes focus with the ring; a real aria-label is kept, a fallback one replaced', () => {
  const { approvalCardRoot } = landing;
  const { focusWithRing, ringClasses, ringClassesPositioned } = ring;
  const { doc, element } = fakeWindow();
  // cd8405c1a a reads `e.matches(...)` for its two selectors (4.16336.0 data-fallback-name).
  const withMatches = el => Object.assign(el, { matches(selector) {
    if (selector === '[aria-labelledby], [aria-label]:not([data-fallback-name])') return el.hasAttribute('aria-labelledby') || (el.hasAttribute('aria-label') && !el.hasAttribute('data-fallback-name'));
    if (selector === '[data-fallback-name]:not([aria-label])') return el.hasAttribute('data-fallback-name') && !el.hasAttribute('aria-label');
    throw Error(`unexpected selector ${selector}`);
  } });
  const hidden = element('section', { attributes: { 'data-approval-card-root': '' }, style: { display: 'contents' } });
  const root = element('section', { attributes: { 'data-approval-card-root': '' } });
  assert.equal(approvalCardRoot(element('div', { style: { display: 'contents' }, children: [hidden, root] })), root);
  const inner = element('section'), wrapper = element('div', { style: { display: 'contents' }, children: [inner] });
  assert.equal(approvalCardRoot(element('div', { style: { display: 'contents' }, children: [wrapper] })), inner);
  assert.equal(approvalCardRoot(element('div')), null);
  assert.equal(ringClasses, 'focus-visible:outline-hidden focus-visible:shadow-focus');
  assert.match(ringClassesPositioned, /focus-visible:after:shadow-focus/);
  const name = element('span', { attributes: { [questionStopNameAttribute]: '' } });
  name.textContent = 'Allow edits?';
  const card = withMatches(element('section', { style: { position: 'relative' }, children: [name] }));
  focusWithRing(card, ringClassesPositioned);
  assert.equal(doc.activeElement, card);
  assert.deepEqual(card.focused, [{ focusVisible: true }]);
  assert.equal(card.getAttribute('tabindex'), '-1');
  assert.equal(card.getAttribute('role'), 'group');
  assert.equal(card.getAttribute('aria-labelledby'), name.id, 'named by its marked parts');
  card.blur();
  assert.equal(card.classList.length, 0);
  assert.equal(card.hasAttribute('tabindex') || card.hasAttribute('aria-labelledby') || card.hasAttribute('role'), false);
  const labelled = withMatches(element('section', { attributes: { 'aria-label': 'Approval' } }));
  focusWithRing(labelled, ringClasses);
  assert.equal(labelled.hasAttribute('aria-labelledby'), false, 'an own aria-label is kept');
  labelled.blur();
  const fallback = withMatches(element('section', { attributes: { 'aria-label': 'Card', 'data-fallback-name': '' } }));
  focusWithRing(fallback, ringClasses);
  assert.equal(fallback.hasAttribute('aria-label'), false, 'a fallback name yields to the text while focused');
  fallback.blur();
  assert.equal(fallback.getAttribute('aria-label'), 'Card', 'and comes back on blur');
});

test('shared-26 MC / RC / FC: attended until focus moves into an embedded frame; installed once per window', () => {
  const { watchWindowAttention, windowAttended, windowUnattended } = attention;
  const { win, element } = fakeWindow();
  watchWindowAttention(win); const count = win.listeners.length; watchWindowAttention(win);
  assert.equal(win.listeners.length, count, 'installed once per window');
  assert.ok(win.listeners.some(l => l.type === 'pointercancel'));
  assert.equal(windowAttended(win), true); assert.equal(windowUnattended(win), false);
  for (const l of win.listeners.filter(l => l.target === 'document' && l.type === 'focusin')) l.fn({ target: element('iframe') });
  assert.equal(windowAttended(win), false, 'focus inside a frame'); assert.equal(windowUnattended(win), true);
});

// D21: deterministic hook cells with real state (render-phase updates re-render before commit, as React does); effects
// of the committed pass run on flush, cleanups before re-runs.
function hookFixture(body, props) {
  const cells = []; let cursor = 0, dirty = false, rendering = false, pass = [], result;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const effect = (fn, deps) => { const i = cursor++; cells[i] ??= {}; if (!same(cells[i].committed, deps)) pass.push({ i, fn, deps }); };
  const dispatcher = {
    useState(initial) {
      const i = cursor++;
      if (!cells[i]) {
        const cell = { value: typeof initial === 'function' ? initial() : initial };
        cell.set = v => { const next = typeof v === 'function' ? v(cell.value) : v; if (!Object.is(next, cell.value)) { cell.value = next; dirty = true; if (!rendering) render(); } };
        cells[i] = cell;
      }
      return [cells[i].value, cells[i].set];
    },
    useRef(initial) { return dispatcher.useState(() => ({ current: initial }))[0]; },
    useEffect: effect, useLayoutEffect: effect,
  };
  function render(next) {
    if (next) props = next;
    rendering = true;
    const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internals.H;
    try {
      do { dirty = false; cursor = 0; pass = []; internals.H = withMemoCache(dispatcher); result = body(props); } while (dirty);
    } finally { internals.H = old; rendering = false; }
    for (const { i, fn, deps } of pass) { cells[i].cleanup?.(); cells[i].committed = deps; cells[i].cleanup = fn(); }
    return result;
  }
  render();
  return { render, get result() { return result; }, close: () => cells.forEach(cell => cell?.cleanup?.()) };
}

test('c6dc54e94 z / R (new in 4.16336.0): a card left soon after focus moved into it hands focus back; a pointer does not', () => {
  const run = (act, { lost = true, later = 0 } = {}) => {
    const realNow = performance.now; let now = 5000;
    performance.now = () => now;
    try {
      const { win, doc, element, dispatch } = fakeWindow();
      const button = element('button'), place = element('section', { children: [button] });
      doc.body.append(place);
      const left = [];
      const watch = hookFixture(props => landing.ApprovalCardWatch(props), { place, onLeft: node => left.push(node) });
      assert.equal(win.listeners.filter(l => l.target === 'window' && ['focusin', 'pointerdown', 'keydown', 'click'].includes(l.type) && l.capture).length, 4);
      act({ dispatch, button, element });
      now += later;
      if (lost) doc.activeElement = doc.body; else element('textarea').focus();
      watch.close();
      assert.equal(win.listeners.filter(l => l.target === 'window').length, 0, 'R removes its window listeners');
      return left.map(node => node === place);
    } finally { performance.now = realNow; }
  };
  const focusIn = ({ dispatch, button }) => dispatch('focusin', {}, button);
  assert.deepEqual(run(focusIn), [true], 'focus inside, then the card leaves with focus nowhere: onLeft(place)');
  assert.deepEqual(run(focusIn, { lost: false }), [], 'focus still somewhere: nothing to hand back');
  assert.deepEqual(run(focusIn, { later: 10_000 }), [], 'L = 10s: too long ago');
  assert.deepEqual(run(({ dispatch, button }) => { focusIn({ dispatch, button }); dispatch('pointerdown', {}, button); }), [], 'a pointer press clears it');
  assert.deepEqual(run(({ dispatch, button, element }) => dispatch('focusin', {}, element('div'))), [], 'focus outside the card does not count');
  assert.deepEqual(run(({ dispatch, button }) => { dispatch('pointerdown', {}, button); dispatch('keydown', { key: 'Shift' }, button); }), [], 'a modifier is not a decision');
  assert.deepEqual(run(({ dispatch, button }) => { dispatch('pointerdown', {}, button); dispatch('keydown', { key: '1' }, button); }), [true], 'a key inside re-arms after a pointer');
  // sI: a mouse-typed click from the keyboard counts only with the GrowthBook gate the host answers.
  const click = { type: 'click', button: 0, buttons: 1, pointerType: 'mouse' };
  assert.equal(isKeyboardActivatedClick(click), hostGrowthBookFeature('__gb__1951358650') === true);
  assert.equal(isKeyboardActivatedClick({ ...click, sourceCapabilities: {} }), false);
});

test('c96d752d0 Jst / ect: 400ms after a key change clicks are swallowed; a null key settles at once when asked', () => {
  const { useRevealSettled, revealClickGuard } = reveal;
  const timers = [], real = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  globalThis.setTimeout = (fn, ms) => (timers.push({ fn, ms, live: true }), timers.length);
  globalThis.clearTimeout = id => { if (timers[id - 1]) timers[id - 1].live = false; };
  try {
    const hook = hookFixture(props => useRevealSettled(props.key, props.nullSettled), { key: 'a', nullSettled: true });
    assert.equal(hook.result, false, 'a key: unsettled');
    assert.deepEqual(timers.map(t => [t.ms, t.live]), [[400, true]]);
    timers[0].fn();
    assert.equal(hook.result, true, '400ms later: settled');
    hook.render({ key: 'b', nullSettled: true });
    assert.equal(hook.result, false, 'a new key restarts the window');
    assert.equal(timers.filter(t => t.live).length, 2);
    hook.render({ key: null, nullSettled: true });
    assert.equal(hook.result, true, 'a null key counts as settled when nullSettled');
    hook.close();
    const idle = hookFixture(props => useRevealSettled(props.key), { key: null });
    assert.equal(idle.result, true, 'mounted with a null key: settled');
    idle.close();
  } finally { Object.assign(globalThis, real); }
  const { doc, element } = fakeWindow();
  const docListeners = [];
  doc.addEventListener = (type, fn, capture) => docListeners.push({ type, fn, capture });
  doc.removeEventListener = (type, fn) => { const i = docListeners.findIndex(l => l.type === type && l.fn === fn); if (i >= 0) docListeners.splice(i, 1); };
  const host = element('div');
  const event = (init = {}) => ({ prevented: 0, button: 0, currentTarget: host, nativeEvent: { detail: 1, timeStamp: 1000 }, ...init,
    preventDefault() { this.prevented++; }, stopPropagation() {} });
  const open = revealClickGuard(false), settled = revealClickGuard(true);
  assert.deepEqual(Object.keys(open), ['onClickCapture', 'onMouseDownCapture', 'onMouseUpCapture']);
  assert.deepEqual(Object.keys(settled), ['onClickCapture', 'onMouseUpCapture']);
  let e = event(); open.onClickCapture(e); assert.equal(e.prevented, 1, 'inside the window a pointer click is swallowed');
  e = event({ nativeEvent: { detail: 0 } }); open.onClickCapture(e); assert.equal(e.prevented, 0, 'a keyboard click passes');
  e = event(); open.onMouseDownCapture(e); assert.equal(e.prevented, 1);
  assert.deepEqual(docListeners.map(l => [l.type, l.capture]), [['click', true], ['mousedown', true]], 'a one-shot document listener is armed');
  open.onMouseUpCapture(event({ nativeEvent: { detail: 1, timeStamp: 1000 } }));
  const released = { timeStamp: 1050, detail: 1 };
  docListeners.find(l => l.type === 'click').fn(released);
  assert.deepEqual(docListeners, [], 'disarmed after the click');
  e = event({ nativeEvent: released }); settled.onClickCapture(e); assert.equal(e.prevented, 1, 'once settled, the click a guarded press released within 100ms is still swallowed');
  e = event({ nativeEvent: { detail: 1, timeStamp: 3000 } }); settled.onClickCapture(e); assert.equal(e.prevented, 0, 'any other click passes');
});

test('generation stops: a renamed alias, a root that is not unique, and cds-core module state without a name (D46)', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'approval-landing-v4-'));
  after(() => rmSync(dir, { recursive: true, force: true }));
  const variant = edit => ({ ...contract4, output: path.join(dir, 'out'), modules: contract4.modules.map(m => edit(m) ?? m) });
  const upToSlot = edit => { const v = variant(edit); v.modules = v.modules.slice(0, v.modules.findIndex(m => m.target === 'card-landing.mjs') + 1); return v; };
  await assert.rejects(extractContract(upToSlot(m => (m.target === 'card-landing.mjs' ? { ...m, aliases: { ...m.aliases, B: 'g' } } : null)), { check: false }),
    /exports g as F, not B/);
  await assert.rejects(extractContract(upToSlot(m => (m.target === 'card-landing.mjs'
    ? { ...m, features: { ...m.features, P: [official.looseFeature('t?.onCard === !0 && t.at === e')] } } : null)), { check: false }),
  /root P is not the unique declaration with its features \(P, F\)/);
  await assert.rejects(extractContract(upToSlot(m => (m.target === 'question-stop-name.mjs'
    ? { ...m, features: { dG: ['"data-question-stop-name"'] } } : null)), { check: false }), /root dG is not the unique declaration with its features \(rG, dG\)/);
  // D46: a module-level WeakMap / Map / Set / WeakSet cds-core holds without a publicName stops generation. Proved on a
  // synthetic cds-core (the real manifest and the real shared-frame module bytes, with that state's publicName removed)
  // and an empty linked graph on it, so the check keeps running however many states the real cds-core names.
  const core = JSON.parse(readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  const shared = official.sharedFrame, exported = new Map(exportsOf(shared).map(pair => pair.split(' as ').reverse()).map(([alias, local]) => [local, alias]));
  const holder = core.modules.find(m => path.basename(m.source) === shared);
  assert.ok(holder, `cds-core holds ${shared}`);
  rawDeclaration(shared, 'J9');
  const isState = name => rawDeclarations.get(shared).nodes.has(name) && /^[\w$]+=new (?:WeakMap|Map|WeakSet|Set)$/.test(rawDeclaration(shared, name));
  const state = holder.bindings.map(b => b.name).find(isState);
  assert.ok(state, `cds-core holds a module-level WeakMap / Map / Set / WeakSet of ${shared}`);
  const fixtures = mkdtempSync(path.join(tmpdir(), 'approval-landing-v4-d46-'));
  after(() => rmSync(fixtures, { recursive: true, force: true }));
  const coreDir = path.join(fixtures, 'cds-core'), linkedDir = path.join(fixtures, 'linked');
  mkdirSync(coreDir); mkdirSync(linkedDir);
  copyFileSync(path.join(app, 'src/generated/cds-core', holder.target), path.join(coreDir, holder.target));
  const publicNames = Object.fromEntries(Object.entries(core.publicNames).filter(([, e]) => e.target === holder.target && !(e.file === shared && e.local === state)));
  assert.ok(Object.keys(publicNames).length > 0, 'the synthetic cds-core still publishes the other shared-frame names');
  writeFileSync(path.join(coreDir, 'manifest.json'), JSON.stringify({ ...core, modules: [holder], publicNames }));
  const generated = path.join(app, 'src/generated'), coreArea = path.relative(generated, coreDir), linkedArea = path.relative(generated, linkedDir);
  writeFileSync(path.join(linkedDir, 'manifest.json'), JSON.stringify({ referenceVersion: core.referenceVersion, referenceSnapshot: core.referenceSnapshot, sharedGraph: coreArea, modules: [] }));
  const spec = { target: 'state.mjs', source: shared, exports: { [state]: 'state' }, aliases: { [state]: exported.get(state) ?? null },
    features: { [state]: [`${state} = ${rawDeclaration(shared, state).split('=')[1]}()`] } };
  const escape = text => text.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
  await assert.rejects(extractContract({ ...contract4, sharedGraph: coreArea, linkedArea, output: path.join(dir, 'state'), modules: [spec] }, { check: false }),
    new RegExp(`module state ${escape(coreArea)} holds without a semantic name \\(add it to ${escape(coreArea)} publicNames, D46\\): state\\.mjs: ${escape(`${shared}#${state}`)}$`));
  // Control: the same synthetic graph with the state's publicName kept links it instead of stopping.
  const named = Object.entries(core.publicNames).find(([, e]) => e.file === shared && e.local === state);
  if (named) {
    writeFileSync(path.join(coreDir, 'manifest.json'), JSON.stringify({ ...core, modules: [holder], publicNames: { ...publicNames, [named[0]]: named[1] } }));
    await assert.rejects(extractContract({ ...contract4, sharedGraph: coreArea, linkedArea, output: path.join(dir, 'state'), modules: [spec] }, { check: false }),
      new RegExp(`state\\.mjs: root ${escape(`${shared}#${state}`)} is the cds-core publicName ${escape(named[1].exportName)}; link it instead`));
  }
  assert.deepEqual(readdirSync(dir), [], 'nothing is written when generation stops');
});
