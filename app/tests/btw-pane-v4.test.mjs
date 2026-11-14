// Region batch 1 (btw-pane, region-plan G6): the isolated 4.16336.0 graph of the /btw pane originals
// (src/generated/btw-pane-v4, scripts/extract-btw-pane.mjs version 4.16336.0, sharedGraph cds-core). The 3.6556.2 graph
// (src/generated/btw-pane) keeps serving the host and the 3.6556.2 consumers that link it by original identity
// (approval-landing, question-card) until the cutover; tests/btw-pane-render, btw-read-state and btw-tab-menu keep
// pinning it. Official code is never executed here: the generated modules are imported, the chunks only read as text.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import React from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as official from '../scripts/official-4.16336.0.mjs';
import { contracts, extractBtwPane } from '../scripts/extract-btw-pane.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';
import { hostGrowthBookFlag } from '../src/host-growthbook.mjs';
import { readGrowthBookValue } from '../src/btw-focus-host.mjs';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';

// src/btw-read-state.mjs (the shown-session host adapter) also imports the 3.6556.2 graph, whose view-tabs host adapters
// are .jsx: the graph loads through Vite SSR (one module graph, as tests/btw-read-state.test.mjs).
const appRoot = path.resolve(import.meta.dirname, '..');
const server = await createServer({ configFile: false, root: appRoot, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
after(() => server.close());
const load = target => server.ssrLoadModule(`/src/generated/btw-pane-v4/${target}`);
const { bindBtwReadState } = await server.ssrLoadModule('/src/btw-read-state.mjs');
const { useFocusHandBack } = await load('focus-hand-back.mjs');
const { guardStrayEnter, elementOf } = await load('focus-guard.mjs');
const { canFocusComposerOnClick } = await load('focus-on-click.mjs');
const { modifierKeys } = await load('modifier-keys.mjs');
const { focusIsLost } = await load('focus-lost.mjs');
const { ownerWindowOrGlobal } = await load('owner-window.mjs');
const { useShownSession, markUnreadUnlessShown } = await load('shown-session.mjs');
const { sideSessionDetachable } = await load('detach-eligibility.mjs');
const { asElementNode } = await server.ssrLoadModule('/src/generated/cds-core/shared-frame.mjs');

const app = path.resolve(import.meta.dirname, '..');
const out = path.join(app, 'src/generated/btw-pane-v4');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const chunk = name => readFileSync(path.join(official.ionSource, name), 'utf8');
const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
const mod = target => manifest.modules.find(m => m.target === target);
// A top-level declaration in the unformatted chunk bytes: the text cds-core (runSlicer) hashes its bindings by.
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

test('the 4.16336.0 contract regenerates byte for byte, beside the unchanged 3.6556.2 graph', async () => {
  assert.deepEqual(Object.keys(contracts), ['3.6556.2', '4.16336.0']);
  const checked = await extractBtwPane({ check: true, version: '4.16336.0' });
  assert.deepEqual(checked, manifest);
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-btw-pane.mjs');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.isolatedGraph, { legacyOutput: 'src/generated/btw-pane' });
  assert.deepEqual(manifest.modules.map(m => [m.target, m.source]), [
    ['compiler-helpers.mjs', 'shared-frame-CJdE5Ria.js'], ['owner-window.mjs', 'shared-25-D-aF0gt9.js'],
    ['use-event.mjs', 'shared-0-CnnWnVrT.js'], ['focus-guard.mjs', 'shared-frame-CJdE5Ria.js'],
    ['focus-on-click.mjs', 'shared-frame-CJdE5Ria.js'], ['modifier-keys.mjs', 'shared-1-D1bGaTaN.js'],
    ['focus-lost.mjs', 'c37aeaf53-Cm_eXF4J.js'], ['focus-hand-back.mjs', 'shared-1-D1bGaTaN.js'],
    ['shown-session.mjs', 'shared-8-BqfCbkJd.js'], ['detach-eligibility.mjs', 'shared-39-ZCs0lAwB.js']]);
  assert.deepEqual(readdirSync(out).sort(), [...manifest.modules.map(m => m.target), 'manifest.json'].sort());
  for (const m of manifest.modules) {
    assert.equal(m.sourceSha256, sha(readFileSync(path.join(official.ionSource, m.source))), m.source);
    assert.equal(m.sha256, sha(readFileSync(path.join(out, m.target))), m.target);
    assert.match(readFileSync(path.join(out, m.target), 'utf8'), /^\/\/ Original Claude Desktop 4\.16336\.0 bindings from /);
  }
  if (official.sourceHashes['shared-frame-CJdE5Ria.js']) official.assertPinnedSource('shared-frame-CJdE5Ria.js', chunk('shared-frame-CJdE5Ria.js'));
  // The 3.6556.2 graph and its linked consumers stay on 3.6556.2 (they check this version and the chunk bytes).
  const legacy = await extractBtwPane({ check: true });
  assert.equal(legacy.referenceVersion, '3.6556.2');
  for (const area of ['approval-landing', 'question-card']) {
    const linked = JSON.parse(readFileSync(path.join(app, 'src/generated', area, 'manifest.json'), 'utf8'));
    assert.equal(linked.referenceVersion, '3.6556.2', area);
    const text = readdirSync(path.join(app, 'src/generated', area)).filter(n => n.endsWith('.mjs'))
      .map(n => readFileSync(path.join(app, 'src/generated', area, n), 'utf8')).join('\n');
    assert.match(text, /from "\.\.\/btw-pane\//, area); assert.doesNotMatch(text, /btw-pane-v4/, area);
  }
});

test('each root is the exported 4.16336.0 binding the approval slot (c6dc54e94 B) and the /btw pane read', () => {
  assert.deepEqual(Object.fromEntries(manifest.modules.map(m => [m.target, m.exports])), {
    'compiler-helpers.mjs': { J9: 'reactMemoCache', J0: 'memoIsEmpty', J2: 'memoChanged2', K0: 'memoStore0', K3: 'memoStore3' },
    'owner-window.mjs': { vd: 'ownerWindowOrGlobal' }, 'use-event.mjs': { xe: 'useEvent' },
    'focus-guard.mjs': { Hn: 'guardStrayEnter', Pt: 'elementOf' }, 'focus-on-click.mjs': { an: 'canFocusComposerOnClick' },
    'modifier-keys.mjs': { vI: 'modifierKeys' }, 'focus-lost.mjs': { a: 'focusIsLost' },
    'focus-hand-back.mjs': { CI: 'useFocusHandBack' }, 'shown-session.mjs': { J_: 'useShownSession', X_: 'markUnreadUnlessShown' },
    'detach-eligibility.mjs': { v_: 'sideSessionDetachable' } });
  const exportsOf = name => [...chunk(name).matchAll(/export\{([^}]*)\}/g)].at(-1)[1];
  for (const [file, pairs] of Object.entries({ 'shared-1-D1bGaTaN.js': ['CI as Sd', 'vI as Cd', 'sI as Nd'],
    'shared-frame-CJdE5Ria.js': ['Hn as kp', 'Pt as nm', 'an as Yp', 'J9 as hm', 'J2 as um', 'K3 as ym'],
    'shared-25-D-aF0gt9.js': ['vd as Wp'], 'shared-0-CnnWnVrT.js': ['xe as PT', 'Uu as Rx'], 'c37aeaf53-Cm_eXF4J.js': ['a as i'],
    'shared-8-BqfCbkJd.js': ['J_ as Xd', 'X_ as Wd'], 'shared-39-ZCs0lAwB.js': ['v_ as $r'] }))
    for (const pair of pairs) assert.ok(exportsOf(file).split(',').includes(pair), `${file} ${pair}`);
  // c6dc54e94-Ci7MQEoh.js (the approval card slot, 3.6556.2 c9ed5627b A) imports every focus root of this graph.
  const slot = chunk('c6dc54e94-Ci7MQEoh.js');
  for (const feature of ['Yp as i', 'kp as a', 'nm as o', 'Wp as l', 'from"./shared-25-D-aF0gt9.js"', 'import{Cd as u,Nd as d,Sd as f}from"./shared-1-D1bGaTaN.js"',
    'import{i as w,n as T,r as ee,t as te}from"./c37aeaf53-Cm_eXF4J.js"']) assert.ok(slot.includes(feature), feature);
  // The new hook: a keyboard-activated click (sI, GrowthBook "__gb__1951358650") counts when canFocusComposerOnClick holds.
  const shared1 = chunk('shared-1-D1bGaTaN.js');
  for (const feature of ['oI="__gb__1951358650"', 'e.pointerType==="mouse"&&!("sourceCapabilities"in e&&e.sourceCapabilities)&&jt(oI)===!0',
    'sI(e)&&me(di(t))&&(i=!0,o=!0,r.addEventListener("pointerdown",u,!0))', 'vI=new Set(["Alt","Control","Shift","Meta"])'])
    assert.ok(shared1.includes(feature), feature);
  assert.deepEqual(mod('focus-hand-back.mjs').bindings.map(b => b.name), ['oI', 'sI', 'CI']);
  assert.deepEqual(Object.fromEntries(mod('focus-hand-back.mjs').imports.map(i => [i.via, i.original ?? `${i.kind}:${i.name}`])), {
    'vendor-frame-BckkO60Y.js:xo': 'react:useLayoutEffect', 'shared-frame-CJdE5Ria.js:Yp': 'an', 'shared-frame-CJdE5Ria.js:hm': 'J9',
    'shared-frame-CJdE5Ria.js:kp': 'Hn', 'shared-frame-CJdE5Ria.js:nm': 'Pt', 'shared-frame-CJdE5Ria.js:um': 'J2', 'shared-frame-CJdE5Ria.js:ym': 'K3',
    'shared-0-CnnWnVrT.js:PT': 'xe', 'shared-25-D-aF0gt9.js:Wp': 'vd', 'shared-0-CnnWnVrT.js:Rx': 'host:readGrowthBookValue',
    'shared-1-D1bGaTaN.js:vI': 'vI' });
});

test('sharedGraph cds-core: no view-tabs, held pure bindings equal cds-core\'s declarations, compiler helpers proved', () => {
  const core = JSON.parse(readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  assert.equal(core.referenceVersion, manifest.referenceVersion); assert.equal(core.referenceSnapshot, manifest.referenceSnapshot);
  const held = new Map(core.modules.flatMap(m => m.bindings.map(b => [`${m.source}#${b.name}`, b.sha256])));
  const published = new Map(Object.entries(core.publicNames).map(([name, e]) => [`${e.file}#${e.local}`, { name, ...e }]));
  const kinds = new Set();
  for (const m of manifest.modules) {
    for (const i of m.imports) {
      kinds.add(i.kind);
      assert.ok(!i.from.includes('view-tabs'), `${m.target} ${i.from}`);
      if (i.kind === 'react') assert.ok(['react', 'react/compiler-runtime'].includes(i.from));
      if (i.kind === 'generated') assert.match(i.from, /^\.\/[\w-]+\.mjs$/);
      if (i.kind === 'shared-graph') {
        // A cds-core publicName, linked by the original binding it publishes, under the name it is exported as.
        assert.match(i.from, /^\.\.\/cds-core\/[\w-]+\.mjs$/, `${m.target} ${i.from}`);
        const entry = published.get(`${i.via.split(/[#:]/)[0]}#${i.original}`);
        assert.ok(entry, `${m.target} ${i.via} (${i.original}) is not a cds-core publicName`);
        assert.equal(i.from, `../cds-core/${entry.target}`); assert.equal(i.name, entry.exportName);
      }
    }
    for (const b of m.bindings) {
      const key = `${m.source}#${b.name}`;
      assert.equal(m.heldByCdsCore.includes(b.name), held.has(key), key);
      assert.ok(!published.has(key), `${key} is a cds-core publicName: link it`);
    }
  }
  assert.deepEqual([...kinds].sort(), ['generated', 'host', 'react', 'shared-graph']);
  // Every pure binding cds-core holds without a publicName is cut again only as the very declaration cds-core holds
  // (cds-core wave 6 also holds shared-25 vd, closure of its published bindings).
  assert.deepEqual(Object.fromEntries(manifest.modules.map(m => [m.target, m.heldByCdsCore.slice().sort()])), {
    'compiler-helpers.mjs': ['J0', 'J2', 'J8', 'J9', 'K0', 'K3'], 'owner-window.mjs': ['vd'], 'use-event.mjs': [],
    'focus-guard.mjs': [], 'focus-on-click.mjs': [], 'modifier-keys.mjs': [], 'focus-lost.mjs': [],
    'focus-hand-back.mjs': ['oI', 'sI'], 'shown-session.mjs': [], 'detach-eligibility.mjs': [] });
  // cds-core wave 4 publishes shared-25 _d (ownerWindow) and shared-0 xe (useEventCallback): owner-window links _d instead
  // of holding _d / gd / hd, and use-event re-exports cds-core's xe as useEvent (no xe / ye copy).
  assert.deepEqual(mod('owner-window.mjs').bindings.map(b => b.name), ['vd']);
  assert.deepEqual(mod('owner-window.mjs').imports.map(i => [i.local, i.from, i.name, i.kind]), [['_d', '../cds-core/shared-25.mjs', 'ownerWindow', 'shared-graph']]);
  assert.deepEqual(mod('use-event.mjs').bindings, []);
  // cds-core wave 7 publishes shared-frame an (state_sharedframe_an, the composer focus-on-click gate): focus-on-click
  // re-exports cds-core's an as canFocusComposerOnClick (no an / $t / Qt / en / tn copy).
  assert.deepEqual(mod('focus-on-click.mjs').bindings, []);
  assert.deepEqual(mod('focus-on-click.mjs').imports.map(i => [i.local, i.from, i.name, i.kind]), [['an', '../cds-core/shared-frame.mjs', 'an', 'shared-graph']]);
  assert.deepEqual(mod('use-event.mjs').imports.map(i => [i.local, i.from, i.name, i.kind]), [['xe', '../cds-core/shared-0.mjs', 'useEventCallback', 'shared-graph']]);
  assert.deepEqual(mod('use-event.mjs').exports, { xe: 'useEvent' });
  for (const m of manifest.modules.filter(m => m.heldByCdsCore.length)) {
    const text = readFileSync(path.join(out, m.target), 'utf8');
    for (const name of m.heldByCdsCore) {
      assert.match(text, new RegExp(`(?:function |var )${name.replace('$', '\\$')}\\b`));
      // runSlicer hashes the unformatted declaration; the held copy is exactly the one cds-core holds.
      assert.ok(/^[0-9a-f]{64}$/.test(held.get(`${m.source}#${name}`)));
      assert.equal(sha(rawDeclaration(m.source, name)), held.get(`${m.source}#${name}`), `${m.target} ${name}`);
    }
  }
  // Pt is cds-core's asElementNode: focus-guard re-exports that copy as elementOf (never cut again, its hash proved),
  // and focus-hand-back links it directly.
  assert.deepEqual(core.publicNames.asElementNode, { ...core.publicNames.asElementNode, file: 'shared-frame-CJdE5Ria.js', local: 'Pt', target: 'shared-frame.mjs', exportName: 'asElementNode' });
  // Vn (the Set of modifier keys a stray Enter ignores) is cds-core strayEnterModifierKeys since wave 5b: linked (its
  // declaration hash proved), the rest of Hn's constants are not in cds-core.
  assert.deepEqual(mod('focus-guard.mjs').bindings.map(b => b.name), ['zn', 'Bn', 'Hn'], 'Hn and its constants are not in cds-core');
  assert.deepEqual(core.publicNames.strayEnterModifierKeys, { ...core.publicNames.strayEnterModifierKeys, file: 'shared-frame-CJdE5Ria.js', local: 'Vn', target: 'shared-frame.mjs', exportName: 'Vn' });
  assert.deepEqual(mod('focus-guard.mjs').imports, [{ local: 'Vn', from: '../cds-core/shared-frame.mjs', name: 'Vn',
    via: 'shared-frame-CJdE5Ria.js#Vn', kind: 'shared-graph', original: 'Vn', linkedSha256: held.get('shared-frame-CJdE5Ria.js#Vn') },
  { local: 'Pt', from: '../cds-core/shared-frame.mjs', name: 'asElementNode',
    via: 'shared-frame-CJdE5Ria.js#Pt', kind: 'shared-graph', original: 'Pt', linkedSha256: held.get('shared-frame-CJdE5Ria.js#Pt') }]);
  assert.equal(sha(rawDeclaration('shared-frame-CJdE5Ria.js', 'Vn')), held.get('shared-frame-CJdE5Ria.js#Vn'));
  assert.equal(sha(rawDeclaration('shared-frame-CJdE5Ria.js', 'Pt')), held.get('shared-frame-CJdE5Ria.js#Pt'));
  assert.match(readFileSync(path.join(out, 'focus-guard.mjs'), 'utf8'), /^import \{ Vn, asElementNode as Pt \} from "\.\.\/cds-core\/shared-frame\.mjs";$/m);
  assert.doesNotMatch(readFileSync(path.join(out, 'focus-guard.mjs'), 'utf8'), /var Vn\b/);
  assert.doesNotMatch(readFileSync(path.join(out, 'focus-guard.mjs'), 'utf8'), /function Pt\b/);
  assert.equal(elementOf, asElementNode, 'one copy of the CDS name');
  const shared = chunk('shared-frame-CJdE5Ria.js');
  const proved = official.assertCompilerHelpers(shared);
  for (const [local, name] of Object.entries(mod('compiler-helpers.mjs').exports)) assert.equal(proved[name].local, local);
  assert.match(readFileSync(path.join(out, 'compiler-helpers.mjs'), 'utf8'), /import \{ c as Je \} from "react\/compiler-runtime";\nvar J9 = Je;/);
});

test('host adapters replace the store, the pane set, the bridge, the nest map and the GrowthBook reader', () => {
  const hosts = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'host').map(i => [m.target, i.local, i.from, i.name, i.via]));
  assert.deepEqual(hosts, [
    ['focus-hand-back.mjs', 'jt', '../../btw-focus-host.mjs', 'readGrowthBookValue', 'shared-0-CnnWnVrT.js:Rx'],
    ['shown-session.mjs', 'Y_', '../../btw-read-state.mjs', 'unreadStore', 'shared-8-BqfCbkJd.js:Y_'],
    ['shown-session.mjs', 'G_', '../../btw-read-state.mjs', 'paneSessions', 'shared-8-BqfCbkJd.js:G_'],
    ['detach-eligibility.mjs', 'uh', '../../btw-detach-host.mjs', 'detachLineageParents', 'shared-39-ZCs0lAwB.js:uh'],
    ['detach-eligibility.mjs', '__', '../../btw-detach-host.mjs', 'detachFromParentAvailable', 'shared-39-ZCs0lAwB.js:__']]);
  assert.ok(manifest.modules.flatMap(m => m.imports).filter(i => i.kind === 'host').every(i => /^[0-9a-f]{64}$/.test(i.replacedSha256)));
  for (const feature of ['function Uu(e){let t=Wu(e);return t===void 0?zu(e):t}', 'Uu as Rx', 'getForcedFeatures'])
    assert.ok(chunk('shared-0-CnnWnVrT.js').includes(feature), feature);
  for (const feature of ['function __(){return!!U?.detachFromParent}', 'function uh(e,t){return t?(lh?.sessions!==e&&(lh={sessions:e,parents:Pp(e,!0)}),lh.parents):rh}'])
    assert.ok(chunk('shared-39-ZCs0lAwB.js').includes(feature), feature);
  for (const feature of ['G_=H_', 'function K_(e){G_=e}', 'U_="epitaxy-unread-v1"', 'function X_(e){G_.has(e)||q_.includes(e)||Y_.getState().markUnread(e)}'])
    assert.ok(chunk('shared-8-BqfCbkJd.js').includes(feature), feature);
  // The desktop's 3P default for the gate is `1951358650:{rule:"always",value:!0}`; the host answers from its one table
  // (a flag it does not list is off), so the reader is exactly hostGrowthBookFlag.
  assert.ok(readFileSync(path.join(official.asarSource, 'index.chunk-Du-Wqi0E.js'), 'utf8').includes('1951358650:{rule:"always",value:!0}'));
  assert.equal(readGrowthBookValue('__gb__1951358650'), hostGrowthBookFlag('__gb__1951358650'));
  assert.equal(typeof readGrowthBookValue('__gb__1951358650'), 'boolean');
});

// D21: deterministic hook cells; effects run on flush in order, cleanups before re-runs.
function hookFixture(body, props) {
  const cells = [], effects = []; let cursor = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const effect = (fn, deps) => { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) { const old = cells[i]; cells[i] = { deps }; effects.push(() => { old?.cleanup?.(); cells[i].cleanup = fn(); }); } };
  const dispatcher = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, () => {}]; },
    useRef(initial) { return dispatcher.useState(() => ({ current: initial }))[0]; },
    useEffect: effect, useLayoutEffect: effect,
  };
  const render = next => {
    if (next) props = next;
    cursor = 0;
    const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internals.H;
    internals.H = withMemoCache(dispatcher);
    try { body(props); } finally { internals.H = old; }
    while (effects.length) effects.shift()();
  };
  render();
  return { render, close: () => cells.forEach(cell => cell?.cleanup?.()) };
}
function target() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, fn, capture) { listeners.set(`${type}${capture ? ':capture' : ''}`, [...(listeners.get(`${type}${capture ? ':capture' : ''}`) ?? []), fn]); },
    removeEventListener(type, fn, capture) { const key = `${type}${capture ? ':capture' : ''}`; listeners.set(key, (listeners.get(key) ?? []).filter(f => f !== fn)); },
    fire(type, event = {}, capture = false) { for (const fn of listeners.get(`${type}${capture ? ':capture' : ''}`) ?? []) fn({ type, ...event }); },
    count(type, capture = false) { return (listeners.get(`${type}${capture ? ':capture' : ''}`) ?? []).length; },
  };
}

test('the shown-session registry: a shown unread child is read once and kept out of the automatic mark', () => {
  const calls = [];
  const unbind = bindBtwReadState({ metadata: () => ({ child: { unread: true }, other: {} }), markRead: id => calls.push(['read', id]),
    markUnread: id => calls.push(['unread', id]), paneShows: id => id === 'split' });
  const tile = hookFixture(props => useShownSession(props.shown, true), { shown: 'child' });
  assert.deepEqual(calls, [['read', 'child']]);
  tile.render({ shown: 'child' });
  assert.equal(calls.length, 1, 'J_ deps [id, true]: once per mount');
  markUnreadUnlessShown('child'); markUnreadUnlessShown('split');
  assert.equal(calls.length, 1, 'q_ lists the child; G_ (the pane set) holds split');
  markUnreadUnlessShown('other');
  assert.deepEqual(calls.at(-1), ['unread', 'other']);
  tile.render({ shown: undefined });
  markUnreadUnlessShown('child');
  assert.deepEqual(calls.at(-1), ['unread', 'child']);
  tile.close(); unbind();
});

test('detach eligibility: a non-archived /btw child with a lineage parent, not sharing its parent checkout', () => {
  const parent = { sessionId: 'p' };
  const child = { sessionId: 'c', spawnedFrom: { sessionId: 'p', sideSession: true } };
  const shared = { sessionId: 's', spawnedFrom: { sessionId: 'p', sideSession: true, sharedCheckout: true } };
  const archived = { sessionId: 'a', isArchived: true, spawnedFrom: { sessionId: 'p', sideSession: true } };
  const detached = { sessionId: 'd', lineageDetached: true, spawnedFrom: { sessionId: 'p', sideSession: true } };
  const records = [parent, child, shared, archived, detached];
  assert.deepEqual(['p', 'c', 's', 'a', 'd', 'missing'].map(id => sideSessionDetachable(records, id)), [false, true, false, false, false, false]);
});

test('the focus utilities: Element-or-null, lost focus, modifier keys, owner window, click focus', () => {
  const element = { nodeType: 1 };
  assert.equal(elementOf(element), element); assert.equal(elementOf({ nodeType: 3 }), null); assert.equal(elementOf(null), null);
  const body = {};
  assert.equal(focusIsLost({ activeElement: null, body }), true); assert.equal(focusIsLost({ activeElement: body, body }), true);
  assert.equal(focusIsLost({ activeElement: element, body }), false);
  assert.deepEqual([...modifierKeys], ['Alt', 'Control', 'Shift', 'Meta']);
  const view = {};
  assert.equal(ownerWindowOrGlobal({ nodeType: 1, ownerDocument: { defaultView: view } }), view);
  assert.equal(ownerWindowOrGlobal({ nodeType: 9, defaultView: view }), view);
  assert.equal(ownerWindowOrGlobal(null), globalThis.window);
  const coarse = matches => ({ matchMedia: query => ({ matches: query === '(pointer: coarse)' && matches }) });
  assert.equal(canFocusComposerOnClick({ ...coarse(true), navigator: { userAgent: 'x Electron/38', maxTouchPoints: 5 } }), true, 'Electron');
  assert.equal(canFocusComposerOnClick({ ...coarse(true), navigator: { userAgent: 'Safari', maxTouchPoints: 5 } }), false, 'a touch screen');
  assert.equal(canFocusComposerOnClick({ ...coarse(false), navigator: { userAgent: 'Safari', maxTouchPoints: 5 } }), true);
});

test('guardStrayEnter: swallows Enter for 500 ms, survives a blur followed by focus, ends after a blur alone', async () => {
  const realNow = performance.now; let now = 1000;
  performance.now = () => now;
  try {
    const view = target(), doc = Object.assign(target(), { defaultView: view });
    const stop = guardStrayEnter(doc);
    let prevented = 0;
    const enter = (extra = {}) => doc.fire('keydown', { key: 'Enter', preventDefault: () => prevented++, stopPropagation() {}, ...extra }, true);
    enter(); assert.equal(prevented, 1);
    view.fire('blur'); view.fire('focus'); await Promise.resolve();
    assert.equal(doc.count('keydown', true), 1, '4.16336.0: focus back before the microtask keeps the guard');
    now += 600; enter(); assert.equal(prevented, 1, 'outside the window Enter passes');
    assert.equal(doc.count('keydown', true), 0, 'and a key that is not swallowed ends the guard');
    const stop2 = guardStrayEnter(doc);
    view.fire('blur'); await Promise.resolve();
    assert.equal(doc.count('keydown', true), 0); assert.equal(view.count('focus'), 0);
    stop(); stop2();
  } finally { performance.now = realNow; }
});

test('useFocusHandBack: a keyboard decision hands focus to the composer when the card leaves; a pointer decision does not', async () => {
  const run = ({ act, gate = false }) => {
    const view = Object.assign(target(), { setTimeout: fn => fn(), navigator: { userAgent: 'Electron/38' } });
    const doc = Object.assign(target(), { defaultView: view, nodeType: 9, activeElement: null });
    const card = Object.assign(target(), { nodeType: 1, ownerDocument: doc, contains: node => node === inside });
    const inside = { nodeType: 1, matches: () => false };
    const composer = { isConnected: true, focus() { doc.activeElement = composer; } };
    doc.activeElement = inside;
    const asked = [];
    const hook = hookFixture(() => useFocusHandBack({ current: card }, node => { asked.push(node); return composer; }), {});
    assert.equal(card.count('click', true), 1, 'the capture click listener');
    act(card, gate);
    hook.close();
    return { asked, landed: doc.activeElement === composer, guard: doc.count('keydown', true) };
  };
  const keyboard = run({ act: card => card.fire('keydown', { key: 'Enter' }) });
  assert.equal(keyboard.asked.length, 1); assert.equal(keyboard.landed, true); assert.equal(keyboard.guard, 1, 'the stray-Enter guard is installed');
  const modifier = run({ act: card => card.fire('keydown', { key: 'Shift' }) });
  assert.deepEqual(modifier, { asked: [], landed: false, guard: 0 });
  const pointer = run({ act: card => { card.fire('keydown', { key: 'Enter' }); card.fire('pointerdown'); } });
  assert.deepEqual(pointer, { asked: [], landed: false, guard: 0 });
  const click = { button: 0, buttons: 1, pointerType: 'mouse' };
  const synthetic = run({ act: card => card.fire('click', click, true) });
  assert.equal(synthetic.landed, hostGrowthBookFlag('__gb__1951358650'), 'sI counts only with the GrowthBook gate the host answers');
});
