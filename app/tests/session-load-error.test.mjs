import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractSessionLoadError } from '../scripts/extract-session-load-error.mjs';
import { createTranscriptCache } from '../src/use-transcript-scroll.js';

// R4f-error E1 (transcript-session-error-boundary WI-1, transcript-10), migrated to 3.6556.2 (w2-tr-r3b) and to 4.16336.0
// (batch 2a): the session load error fallback (cc43287c9 xG / bG, shared-55 QV) and its chunk heal gate chain (shared-100
// No / so / oo = "__gb__982582273", Zo; shared-62 Vd / sf / qd; shared-26 yu; shared-123 Zc / Gc; c7f0c0d23 c), generated
// into src/generated/session-load-error over the shared cds-core graph (CdsButton). Source/AST, SSR and a small fake DOM
// driven through React's own props: no browser, no Electron, no network, no reload.
const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/session-load-error');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const MESSAGE = 'Something went wrong loading this session.';

let server, Session, Page, Gate, Claim, ReloadState, Probe, Blockers, Veto, Adapters, Boundary, Expansion, I18n;
before(async () => {
  // ws: false — no WebSocket server, so the test listens on no port.
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Session = await server.ssrLoadModule('/src/generated/session-load-error/session-load-error.mjs');
  Page = await server.ssrLoadModule('/src/generated/session-load-error/error-page.mjs');
  Gate = await server.ssrLoadModule('/src/generated/session-load-error/chunk-heal-gate.mjs');
  Claim = await server.ssrLoadModule('/src/generated/session-load-error/pane-retry-claim.mjs');
  ReloadState = await server.ssrLoadModule('/src/generated/session-load-error/chunk-reload-state.mjs');
  Probe = await server.ssrLoadModule('/src/generated/session-load-error/chunk-heal-probe.mjs');
  Blockers = await server.ssrLoadModule('/src/generated/session-load-error/reload-blockers.mjs');
  Veto = await server.ssrLoadModule('/src/generated/session-load-error/unload-veto.mjs');
  Adapters = await server.ssrLoadModule('/src/source-session-load-error-adapters.jsx');
  Boundary = await server.ssrLoadModule('/src/generated/r3b-transcript/render-error-boundary.mjs');
  Expansion = await server.ssrLoadModule('/src/tool-group-expansion.mjs');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(async () => { await server?.close(); });

// A small fake DOM (as tests/r3b-transcript-current.test.mjs), enough for the CDS button and the boundary.
function createDom() {
  const events = {
    addEventListener(type, fn) { (this.__l ??= new Map()).set(type, [...(this.__l.get(type) ?? []), fn]); },
    removeEventListener(type, fn) { const list = this.__l?.get(type); if (list) this.__l.set(type, list.filter(entry => entry !== fn)); },
    dispatchEvent(event) { for (const fn of [...(this.__l?.get(event.type) ?? [])]) fn.call(this, event); return true; },
  };
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', activeElement: null });
  class Element {
    constructor(tag) {
      Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml',
        ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map(), style: {} });
    }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const siblings = this.parentNode?.childNodes; return siblings ? siblings[siblings.indexOf(this) + 1] ?? null : null; }
    set textContent(value) { this.childNodes = value ? [document.createTextNode(value)] : []; }
    get textContent() { return this.childNodes.map(node => (node.nodeType === 3 ? node.nodeValue : node.textContent) ?? '').join(''); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) { child.parentNode?.removeChild?.(child); this.childNodes.push(child); child.parentNode = this; return child; }
    insertBefore(child, ref) { child.parentNode?.removeChild?.(child); const index = ref ? this.childNodes.indexOf(ref) : -1; if (index < 0) this.childNodes.push(child); else this.childNodes.splice(index, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const index = this.childNodes.indexOf(child); if (index >= 0) this.childNodes.splice(index, 1); child.parentNode = null; return child; }
    contains(node) { for (let at = node; at; at = at.parentNode) if (at === this) return true; return false; }
    getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
    focus() { document.activeElement = this; }
    find(predicate) {
      if (predicate(this)) return this;
      for (const child of this.childNodes) { const hit = child.nodeType === 1 ? child.find(predicate) : null; if (hit) return hit; }
      return null;
    }
  }
  Object.assign(Element.prototype, events);
  Object.assign(document, {
    createElement: tag => new Element(tag),
    createElementNS: (ns, tag) => Object.assign(new Element(tag), { namespaceURI: ns }),
    createTextNode: text => ({ nodeType: 3, nodeName: '#text', textContent: text, nodeValue: text, ownerDocument: document, parentNode: null }),
    querySelectorAll: () => [],
  });
  document.documentElement = new Element('html');
  document.documentElement.parentNode = document;
  document.body = document.documentElement.appendChild(new Element('body'));
  // location.reload is a spy: the closed gate must never reach it.
  const reloads = [];
  const window = Object.assign(Object.create(events), { document, location: { pathname: '/', reload: () => reloads.push('reload') },
    HTMLIFrameElement: class {}, getComputedStyle: () => ({ lineHeight: '20px', direction: 'ltr' }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {} });
  document.defaultView = window;
  return { window, document, Element, reloads };
}
// sessionStorage spy: the closed gate must not claim a pane retry either.
function storageSpy() {
  const values = new Map(), calls = [];
  return { calls, values, getItem: key => (calls.push(['get', key]), values.has(key) ? values.get(key) : null),
    setItem: (key, value) => { calls.push(['set', key]); values.set(key, String(value)); } };
}
async function withDom(run) {
  const dom = createDom();
  const storage = storageSpy();
  const names = ['window', 'document', 'sessionStorage'];
  const saved = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const [name, value] of [['window', dom.window], ['document', dom.document], ['sessionStorage', storage]])
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  const container = dom.document.body.appendChild(new dom.Element('div'));
  const root = createRoot(container);
  const error = console.error;
  const logged = [];
  console.error = (...args) => { logged.push(args); };
  try { return await run({ dom, storage, container, root, logged }); }
  finally {
    act(() => root.unmount());
    console.error = error;
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
}
const reactProps = element => element[Object.keys(element).find(key => key.startsWith('__reactProps$'))];
const press = element => ({ preventDefault() {}, stopPropagation() {}, isDefaultPrevented: () => false, currentTarget: element, target: element, button: 0, detail: 1, nativeEvent: {} });
const chunkError = () => Object.assign(Error('Failed to fetch dynamically imported module: https://a.example/assets/v1/c1.js'), { name: 'ChunkLoadError' });

test('generator: the check passes, every module and call site is pinned to the 4.16336.0 chunks', async () => {
  await extractSessionLoadError({ check: true });
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  for (const entry of [...manifest.modules, ...manifest.callSites])
    assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(reference, entry.source))), entry.source);
  for (const m of manifest.modules) assert.equal(m.referenceVersion, '4.16336.0', m.target);
  assert.deepEqual(manifest.modules.map(m => [m.target, m.source]), [
    ['compiler-helpers.mjs', 'shared-frame-CJdE5Ria.js'], ['error-page.mjs', 'shared-55-BRv2XBP7.js'], ['chunk-reload-state.mjs', 'shared-62-DoCqVpIq.js'],
    ['chunk-heal-probe.mjs', 'shared-26-B-POtn5S.js'], ['chunk-heal-gate.mjs', 'shared-100-BBQR7Gmd.js'], ['pane-retry-claim.mjs', 'shared-100-BBQR7Gmd.js'],
    ['reload-blockers.mjs', 'shared-123-1Hc1RTKl.js'], ['unload-veto.mjs', 'c7f0c0d23-CMovzUAr.js'], ['session-load-error.mjs', 'cc43287c9-dzfX-J5i.js']]);
  // xG's bindings are xG and bG only: everything else it reads is imported (React Compiler helpers from compiler-helpers.mjs).
  const session = manifest.modules.find(m => m.target === 'session-load-error.mjs');
  assert.deepEqual(session.bindings.map(b => b.name).sort(), ['bG', 'xG']);
  assert.deepEqual(session.exports, { xG: 'SessionLoadError', bG: 'canReloadPane' });
  const compiler = { J9: 'reactMemoCache', J8: 'memoSentinel', J1: 'memoChanged1', K1: 'memoStore1', J2: 'memoChanged2', K2: 'memoStore2', J3: 'memoChanged3', K3: 'memoStore3' };
  const helpers = i => i.from === './compiler-helpers.mjs';
  assert.deepEqual(Object.fromEntries(session.imports.filter(i => !helpers(i)).map(i => [i.local, `${i.kind}:${i.name}`])), {
    o_: 'adapter:useIntl', M: 'react:useRef', D: 'react:useEffect', BP: 'adapter:forgetScrollAnchors', Cie: 'adapter:forgetRowExpansion',
    tc: 'generated:CHUNK_HEAL_PROBE_MS', $o: 'generated:CHUNK_RELOAD_SPACING_MS', Oo: 'shared-graph:sf', Ev: 'generated:chunkHealTarget',
    $a: 'generated:reloadBlocker', Px: 'generated:unloadHeld', is: 'generated:isChunkReloadPending', Tv: 'generated:claimPaneRetry',
    bc: 'adapter:reportChunkCacheHeal', p: 'react:jsx', pa: 'generated:ErrorPage' });
  for (const i of manifest.modules.flatMap(m => m.imports).filter(helpers)) assert.equal(compiler[i.local], i.name, i.local);
  // Every host dependency is a named adapter of this lane, React, cds-core (CdsButton, since cds-core wave 5
  // markPageUnloading: shared-62 sf, exported $_, and since wave 6 the chunk reload mark shared-62 Gd, state_shared62_Gd)
  // or a sibling module: nothing else, and no 3.6556.2 view-tabs.
  const all = manifest.modules.flatMap(m => m.imports);
  assert.deepEqual([...new Set(all.map(i => i.kind))].sort(), ['adapter', 'generated', 'react', 'shared-graph']);
  assert.deepEqual(all.filter(i => i.kind === 'shared-graph').map(i => `${i.via}=${i.from}:${i.name}`), ['shared-frame-CJdE5Ria.js:Id=../cds-core/shared-frame.mjs:CdsButton',
    'shared-62-DoCqVpIq.js#Gd=../cds-core/shared-62.mjs:Gd', 'shared-62-DoCqVpIq.js:$_=../cds-core/shared-62.mjs:sf']);
  assert.ok(!all.some(i => /view-tabs/.test(i.from)));
  assert.deepEqual(all.filter(i => i.kind === 'adapter').map(i => `${i.via}=${i.name}`).sort(), [
    'cc6e9624e-QSsNXeYh.js:a=forgetRowExpansion', 'cd14a8022-DdgywyOs.js:u=forgetScrollAnchors', 'shared-0-CnnWnVrT.js:Rx=growthBookValue',
    'shared-100-BBQR7Gmd.js:Po=resolveChunkHealTarget', 'shared-25-D-aF0gt9.js:em=useRouter', 'shared-26-B-POtn5S.js:yb=reportChunkCacheHeal',
    'vendor-intl-BJgYK7RA.js:l=FormattedMessage', 'vendor-intl-BJgYK7RA.js:p=useIntl']);
  for (const i of all.filter(i => i.kind === 'adapter')) assert.equal(typeof Adapters[i.name], 'function', i.name);
  // The boundaries that mount xG (WI-3 follows them): main pane, secondary pane, pop-out; each fallback is cc43287c9 j.
  const sites = manifest.callSites.filter(s => !s.raw);
  assert.deepEqual(sites.map(s => `${s.source}:${s.binding}`), ['c11959232-D8gLbLAI.js:Pv', 'c11959232-D8gLbLAI.js:Fv', 'c5638815a-DZAqfzwl.js:ct']);
  for (const site of sites) assert.ok(Object.values(site.imports).some(v => v === 'cc43287c9-dzfX-J5i.js:j (xG)'), site.binding);
  for (const site of sites) assert.ok(Object.values(site.imports).some(v => v === 'shared-26-B-POtn5S.js:$b (Ds)'), site.binding);
  // The distinctive strings, once each in the minified originals.
  const pins = [
    ['cc43287c9-dzfX-J5i.js', 'Something went wrong loading this session'], ['cc43287c9-dzfX-J5i.js', 'id:"z0PjNhLbSp"'],
    ['cc43287c9-dzfX-J5i.js', 'bc(t,"pane_retry",tc,void 0,e)'], ['cc43287c9-dzfX-J5i.js', 'function bG(){return $a()===null&&!Px()}'],
    ['cc43287c9-dzfX-J5i.js', 'xG as j'],
    ['shared-100-BBQR7Gmd.js', 'function No(e){return so(oo)?Po(e):void 0}'], ['shared-100-BBQR7Gmd.js', '"__gb__982582273"'],
    ['shared-55-BRv2XBP7.js', 'min-h-screen flex flex-col items-center justify-center px-4'],
  ];
  for (const [file, needle] of pins) assert.equal(occurrences(raw(file), needle), 1, `${file}: ${needle}`);
  // The gate's flag lives in shared-100 only (4.16336.0 moved it out of shared-15), and the main process never mentions
  // it or the pane_retry heal.
  const assets = fs.readdirSync(reference).filter(name => name.endsWith('.js'));
  assert.deepEqual(assets.filter(name => raw(name).includes('__gb__982582273')), ['shared-100-BBQR7Gmd.js']);
  const build = path.resolve(reference, '../../../asar/.vite/build');
  const mainText = fs.readdirSync(build).filter(name => name.endsWith('.js')).map(name => fs.readFileSync(path.join(build, name), 'utf8')).join('\n');
  assert.equal(occurrences(mainText, '982582273') + occurrences(mainText, 'pane_retry'), 0);
});

test('cds-core (sharedGraph): CdsButton and markPageUnloading are linked, the compiler helpers are re-sliced only as byte-identical pure copies, no module state is copied', () => {
  const cds = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  assert.equal(cds.referenceVersion, manifest.referenceVersion);
  assert.equal(cds.referenceSnapshot, manifest.referenceSnapshot);
  const held = new Map(cds.modules.flatMap(m => m.bindings.map(b => [`${path.basename(m.source)}#${b.name ?? b}`, b.sha256])));
  // The linked names: cds-core publishes shared-frame Xu as CdsButton, (wave 5) shared-62 sf as markPageUnloading and
  // (wave 6) shared-62 Gd as state_shared62_Gd; each declaration hash is the one linked.
  const linkedImports = manifest.modules.flatMap(m => m.imports).filter(i => i.kind === 'shared-graph');
  assert.deepEqual(linkedImports.map(i => i.original), ['Xu', 'Gd', 'sf']);
  const [link, mark, unload] = linkedImports;
  assert.deepEqual(cds.publicNames.state_shared62_Gd, { file: 'shared-62-DoCqVpIq.js', local: 'Gd', target: 'shared-62.mjs', exportName: 'Gd' });
  assert.equal(mark.linkedSha256, held.get('shared-62-DoCqVpIq.js#Gd'));
  assert.deepEqual(cds.publicNames.CdsButton, { file: 'shared-frame-CJdE5Ria.js', local: 'Xu', target: 'shared-frame.mjs', exportName: 'CdsButton' });
  assert.equal(link.original, 'Xu');
  assert.equal(link.linkedSha256, held.get('shared-frame-CJdE5Ria.js#Xu'));
  assert.deepEqual(cds.publicNames.markPageUnloading, { file: 'shared-62-DoCqVpIq.js', local: 'sf', target: 'shared-62.mjs', exportName: 'sf' });
  assert.equal(unload.original, 'sf');
  assert.equal(unload.linkedSha256, held.get('shared-62-DoCqVpIq.js#sf'));
  // Only the compiler helpers are held by cds-core, each re-sliced with the very bytes cds-core holds (pure functions and
  // the Symbol.for sentinel, not module state).
  for (const m of manifest.modules) {
    const own = m.bindings.filter(b => held.has(`${m.source}#${b.name}`)).map(b => b.name);
    assert.deepEqual(own.sort(), [...m.heldByCdsCore].sort(), m.target);
    for (const b of m.bindings.filter(b => held.has(`${m.source}#${b.name}`))) assert.equal(b.sha256, held.get(`${m.source}#${b.name}`), `${m.target} ${b.name}`);
  }
  assert.deepEqual(manifest.modules.filter(m => m.heldByCdsCore.length).map(m => m.target), ['compiler-helpers.mjs']);
  const helpers = fs.readFileSync(path.join(directory, 'compiler-helpers.mjs'), 'utf8');
  assert.doesNotMatch(helpers, /new (Weak)?(Map|Set)\b|createContext/);
  // The module state this area does slice (reload blocker registry, beforeunload holders) is in chunks cds-core does not
  // hold. The page-unloading marks (shared-62 af / of, written by sf and by the official pagehide / pageshow registration)
  // are cds-core's since wave 5: linked through sf, never cut here; the chunk reload mark shared-62 Gd is cds-core's since
  // wave 6 (chunk-reload-state imports it).
  for (const key of ['shared-62-DoCqVpIq.js#af', 'shared-62-DoCqVpIq.js#of', 'shared-62-DoCqVpIq.js#sf', 'shared-62-DoCqVpIq.js#Gd'])
    assert.ok(held.has(key) && !manifest.modules.some(m => m.bindings.some(b => `${m.source}#${b.name}` === key)), key);
  for (const [target, names] of [['reload-blockers.mjs', ['Wc']], ['unload-veto.mjs', ['s']]]) {
    const m = manifest.modules.find(x => x.target === target);
    for (const name of names) assert.ok(m.bindings.some(b => b.name === name) && !held.has(`${m.source}#${name}`), `${target} ${name}`);
  }
  // D46 stays a hard stop in the generator: module state held without a public name is recorded and nothing is written.
  const generator = fs.readFileSync(path.join(app, 'scripts/extract-session-load-error.mjs'), 'utf8');
  assert.equal(occurrences(generator, 'holds without a semantic name (add it to ${graph.area} publicNames, D46)'), 2);
  assert.ok(generator.indexOf('if (stateConflicts.length)\n    throw') < generator.indexOf("files['manifest.json'] ="));
});

test('root location: every root is unique in its chunk, read by a proved root, or imported by one under the official alias', () => {
  const locate = Object.fromEntries(manifest.modules.flatMap(m => Object.entries(m.locate ?? {}).map(([name, how]) => [`${m.target}#${name}`, how])));
  assert.deepEqual(locate, {
    'error-page.mjs#QV': 'unique',
    'chunk-reload-state.mjs#Vd': 'import', 'chunk-reload-state.mjs#qd': 'import',
    'chunk-heal-probe.mjs#yu': 'import',
    'chunk-heal-gate.mjs#No': 'unique', 'chunk-heal-gate.mjs#oo': { readBy: 'No' }, 'chunk-heal-gate.mjs#so': { readBy: 'No' },
    'pane-retry-claim.mjs#Zo': 'import', 'pane-retry-claim.mjs#qo': { readBy: 'Zo' },
    'reload-blockers.mjs#Zc': 'import', 'reload-blockers.mjs#Gc': 'unique',
    'unload-veto.mjs#c': 'import',
    'session-load-error.mjs#xG': 'unique', 'session-load-error.mjs#bG': { readBy: 'xG' },
  });
  const all = manifest.modules.flatMap(m => m.imports);
  for (const [key, how] of Object.entries(locate)) {
    if (how !== 'import') continue;
    const [target, name] = key.split('#');
    const importer = all.find(i => i.kind === 'generated' && i.from === `./${target}` && i.original === name);
    assert.ok(importer, key);
    // The alias the importer used is the one the official chunk exports this declaration under.
    const [file, alias] = importer.via.split(':');
    const exported = [...raw(file).matchAll(/export\{([^}]*)\}/g)].pop()[1].split(',').map(s => s.split(' as '));
    assert.ok(exported.some(([local, as]) => local === name && as === alias), `${key} via ${importer.via}`);
  }
});

test('transcript-10 / D33: the chunk heal gate is GrowthBook "__gb__982582273", closed on this host', () => {
  assert.equal(Gate.CHUNK_HEAL_FLAG, '__gb__982582273');
  assert.equal(Adapters.growthBookValue(Gate.CHUNK_HEAL_FLAG), undefined, 'no GrowthBook client: a value is undefined');
  assert.equal(Gate.chunkHealFlagOn(Gate.CHUNK_HEAL_FLAG), false);
  // So even a chunk load failure names no heal target, and xG's pane_retry / reload branch is unreachable.
  assert.equal(Gate.chunkHealTarget(chunkError()), undefined);
  assert.equal(Gate.chunkHealTarget(Error('render failed')), undefined);
  // The adapters only that branch reaches: no heal target, a report that resolves at once and sends nothing.
  assert.equal(Adapters.resolveChunkHealTarget(chunkError()), undefined);
  assert.ok(Adapters.reportChunkCacheHeal(chunkError(), 'pane_retry', Probe.CHUNK_HEAL_PROBE_MS) instanceof Promise);
  assert.throws(() => Adapters.useRouter().push('/code'), /no desktop router/);
  // The timings xG's retry lock adds up (tc + $o) and the never-scheduled chunk reload.
  assert.equal(Probe.CHUNK_HEAL_PROBE_MS, 2e3);
  assert.equal(ReloadState.CHUNK_RELOAD_SPACING_MS, 1e4);
  assert.equal(ReloadState.isChunkReloadPending(), false);
  // markPageUnloading is cds-core's since wave 5 (chunk-reload-state.mjs no longer cuts or exports it).
  assert.equal(ReloadState.markPageUnloading, undefined);
});

test('bG (canReloadPane): the original reload check reads the blocker registry and the beforeunload holders', () => {
  // Nothing on this host registers a blocker or a holder, so a reload would not be blocked; xG never asks while the gate
  // above is closed (`e !== void 0 && bG()` short-circuits).
  assert.equal(Blockers.reloadBlocker(), null);
  assert.equal(Veto.unloadHeld(), false);
  assert.equal(Session.canReloadPane(), true);
  let holding = true;
  Blockers.registerReloadBlocker('test-elective', () => true, { electiveOnly: true });
  assert.equal(Session.canReloadPane(), true, 'an elective blocker does not block');
  Blockers.registerReloadBlocker('test-hold', () => holding);
  assert.equal(Blockers.reloadBlocker(), 'test-hold');
  assert.equal(Session.canReloadPane(), false);
  holding = false;
  assert.equal(Session.canReloadPane(), true);
  Blockers.registerReloadBlocker('test-elective', () => false, { electiveOnly: true });
});

test('Zo (claimPaneRetry): the original once-per-chunk sessionStorage claim (unreachable here, kept as shipped)', () => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const storage = storageSpy();
  Object.defineProperty(globalThis, 'sessionStorage', { value: storage, configurable: true, writable: true });
  try {
    const target = { url: 'https://a.example/assets/v1/c1-AbC.js', form: 'parse' };
    assert.equal(Claim.claimPaneRetry(target), true);
    assert.equal(Claim.claimPaneRetry(target), false, 'claimed once');
    assert.ok(storage.values.has(`${Claim.PANE_RETRY_CLAIM_PREFIX}c1-AbC.js`));
    assert.equal(Claim.claimPaneRetry({ ...target, form: 'not_function' }), true, 'the not_function form claims separately');
  } finally {
    if (saved) Object.defineProperty(globalThis, 'sessionStorage', saved); else delete globalThis.sessionStorage;
  }
});

test('xG renders the original error page: the message, Try again, no Back to landing page', () => {
  const html = renderToStaticMarkup(h(Session.SessionLoadError, { error: Error('boom'), reset() {}, sessionId: 's1' }));
  assert.match(html, /^<div class="min-h-screen flex flex-col items-center justify-center px-4"><div class="text-center max-w-md">/);
  assert.match(html, new RegExp(`<div class="text-danger mb-6 text-lg font-medium">${MESSAGE.replace('.', '\\.')}</div>`));
  assert.equal(occurrences(html, '<button'), 1);
  assert.match(html, />Try again<\/button>|>Try again</);
  assert.doesNotMatch(html, /Back to landing page|mb-6 text-sm text-secondary/);
  // QV by itself (TR-T11, unchanged in 4.16336.0: only { message, error, onRetry }; no hint line, no onBack): Back to
  // landing page only without onRetry, and a hint prop renders nothing.
  const page = renderToStaticMarkup(h(Page.ErrorPage, { message: 'm', hint: 'why' }));
  assert.doesNotMatch(page, /why|mb-6 text-sm text-secondary/);
  assert.match(page, /Back to landing page/);
  assert.doesNotMatch(page, /Try again/);
  // "Try again" is the local catalog's (common.mjs).
  const previous = I18n.getLocale();
  I18n.setLocale('zh-CN');
  try {
    assert.match(renderToStaticMarkup(h(Session.SessionLoadError, { error: Error('boom'), reset() {}, sessionId: 's1' })), />重试</);
  } finally { I18n.setLocale(previous); }
});

test('Try again forgets the session\'s row expansion, resets the boundary, and never reloads or claims (gate closed)', async () => {
  const { toolGroupExpansion, toolRowExpansion, groupExpansionKey, rowExpansionKey } = Expansion;
  toolGroupExpansion.set(groupExpansionKey('s-load', 'g1'), true);
  toolRowExpansion.set(rowExpansionKey('s-load', 'r1'), true);
  toolGroupExpansion.set(groupExpansionKey('s-other', 'g1'), true);
  await withDom(async ({ dom, storage, container, root, logged }) => {
    let fail = true, renders = 0;
    function Flaky() { renders += 1; if (fail) throw Error('session pane failed to render'); return h('p', { 'data-loaded': '' }, 'loaded'); }
    const tree = sessionId => h(Boundary.RenderErrorBoundary, { resetOn: sessionId, componentName: 'EpitaxyChatPanel', tags: { feature: 'epitaxy' },
      metadata: { sessionId }, fallback: (error, reset) => h(Session.SessionLoadError, { error, reset, sessionId }) }, h(Flaky));
    act(() => root.render(tree('s-load')));
    assert.ok(container.textContent.includes(MESSAGE), 'the fallback replaces the session pane');
    assert.ok(logged.length > 0, 'React reported the render error');
    const button = container.find(node => node.tagName === 'BUTTON');
    assert.ok(button && button.textContent.includes('Try again'));
    fail = false;
    const before = renders;
    act(() => reactProps(button).onClick(press(button)));
    assert.ok(renders > before, 'the boundary reset re-rendered the session pane');
    assert.ok(container.find(node => node.hasAttribute?.('data-loaded')), 'the session pane is back');
    assert.ok(!container.textContent.includes(MESSAGE));
    assert.equal(toolGroupExpansion.get(groupExpansionKey('s-load', 'g1')), undefined, 'group expansion forgotten');
    assert.equal(toolRowExpansion.get(rowExpansionKey('s-load', 'r1')), undefined, 'row expansion forgotten');
    assert.equal(toolGroupExpansion.get(groupExpansionKey('s-other', 'g1')), true, 'another session keeps its expansion');
    assert.deepEqual(dom.reloads, [], 'window.location.reload is never called');
    assert.deepEqual(storage.calls, [], 'no pane_retry claim in sessionStorage');
  });
  toolGroupExpansion.forgetSession('s-other');
});

test('the scroll anchors xG forgets are the host transcript cache entry of the session (use-transcript-scroll forget)', () => {
  // createTranscriptCache().forget: the snapshot is gone, and a visit still open on the key cannot save into it any more.
  const cache = createTranscriptCache();
  const first = cache.open('code:s1');
  assert.equal(cache.save('code:s1', first.generation, { following: false, anchor: { itemId: 'row-3', offset: -4 } }), true);
  assert.equal(cache.forget('code:s1'), true);
  assert.equal(cache.forget('code:s1'), false);
  assert.equal(cache.save('code:s1', first.generation, { following: true }), false);
  assert.equal(cache.open('code:s1').snapshot, undefined, 'the remounted transcript starts without the old anchor');
  // The module cache is reachable through the export; the adapter forgets the key main.jsx mounts the transcript with.
  const scroll = fs.readFileSync(path.join(app, 'src/use-transcript-scroll.js'), 'utf8');
  assert.equal(occurrences(scroll, 'export function forgetTranscriptScroll(key) {\n  return cache.forget(key);\n}'), 1);
  assert.equal(Adapters.codeTranscriptScrollKey('s1'), 'code:s1');
  const adapters = fs.readFileSync(path.join(app, 'src/source-session-load-error-adapters.jsx'), 'utf8');
  assert.equal(occurrences(adapters, 'forgetTranscriptScroll(codeTranscriptScrollKey(sessionId));'), 1);
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.equal(occurrences(main, 'sessionKey={current ? `code:${current}` : null}'), 1);
  assert.doesNotThrow(() => Adapters.forgetScrollAnchors('never-opened'));
});
