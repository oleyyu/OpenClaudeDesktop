// blue-bg-01: the 2.42304.0 Code landing texture (c9d397622 LandingTextureLayer + cc43287c9 fH/pH/mH) extracted as
// original bindings. WebGL cannot run in Node, so nothing here claims the texture renders: these tests cover the
// generator contract, SSR markup, pure functions, shader text and the official gates under a controlled fake window,
// clock and WebGL stand-ins that only ever refuse (no context, software renderer, no parallel compile).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractLandingTexture } from '../scripts/extract-landing-texture.mjs';

const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/landing-texture');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const layerClass = 'pointer-events-none absolute inset-0 font-mono-ui text-muted-as-secondary transition-opacity ease-out [contain:strict]';
let server, Layer, Host, Background, Adapters;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Layer = await server.ssrLoadModule('/src/generated/landing-texture/layer.mjs');
  Host = await server.ssrLoadModule('/src/generated/landing-texture/host.mjs');
  Background = await server.ssrLoadModule('/src/generated/landing-texture/background-animation.mjs');
  Adapters = await server.ssrLoadModule('/src/source-landing-texture-adapters.jsx');
});
after(() => server?.close());

// ---------------------------------------------------------------- controlled environment (no layout, no painting)
function createEnvironment({ hidden = false, focused = true, media = {}, deviceBox = true, webgl = () => null } = {}) {
  let now = 0, nextId = 0;
  const timers = new Map(), frames = new Map();
  const events = {
    addEventListener(type, fn, options) { ((this.__listeners ??= new Map()).get(type) ?? this.__listeners.set(type, []).get(type)).push({ fn, capture: typeof options === 'boolean' ? options : !!options?.capture }); },
    removeEventListener(type, fn, options) { const list = this.__listeners?.get(type), capture = typeof options === 'boolean' ? options : !!options?.capture; const i = list?.findIndex(l => l.fn === fn && l.capture === capture) ?? -1; if (i >= 0) list.splice(i, 1); },
    dispatchEvent(event) { for (const { fn } of [...(this.__listeners?.get(event.type) ?? [])]) fn.call(this, event); return true; },
    listenerCount(type) { return this.__listeners?.get(type)?.length ?? 0; },
  };
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', hidden, activeElement: null, fontLoads: [] });
  document.fonts = { load: (font, text) => { document.fontLoads.push([font, text]); return Promise.resolve([]); } };
  class Element {
    constructor(tag) { Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml', ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map(), dataset: {}, contextRequests: [] }); this.style = { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } }; }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const s = this.parentNode?.childNodes; return s ? s[s.indexOf(this) + 1] ?? null : null; }
    get className() { return this.getAttribute('class') ?? ''; }
    set className(value) { this.setAttribute('class', value); }
    set textContent(_value) { this.childNodes = []; }
    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
    removeAttribute(k) { this.attributes.delete(k); }
    appendChild(child) { child.parentNode?.removeChild(child); this.childNodes.push(child); child.parentNode = this; return child; }
    append(...children) { children.forEach(child => this.appendChild(child)); }
    insertBefore(child, ref) { child.parentNode?.removeChild(child); const i = ref ? this.childNodes.indexOf(ref) : -1; if (i < 0) this.childNodes.push(child); else this.childNodes.splice(i, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const i = this.childNodes.indexOf(child); if (i >= 0) this.childNodes.splice(i, 1); child.parentNode = null; return child; }
    remove() { this.removed = true; this.parentNode?.removeChild(this); }
    contains(node) { for (let x = node; x; x = x.parentNode) if (x === this) return true; return false; }
    closest() { return null; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; }
    getContext(kind, options) { this.contextRequests.push([kind, options]); return kind === 'webgl2' ? webgl(this) : null; }
  }
  Object.assign(Element.prototype, events);
  Object.assign(document, { createElement: tag => new Element(tag), createTextNode: text => ({ nodeType: 3, nodeName: '#text', textContent: text, ownerDocument: document, parentNode: null }) });
  document.documentElement = new Element('html');
  document.body = document.documentElement.appendChild(new Element('body'));
  const storage = new Map();
  const window = Object.assign(Object.create(events), {
    focused, document, devicePixelRatio: 2, HTMLIFrameElement: class {},
    performance: { now: () => now },
    setTimeout(fn, ms = 0) { const id = ++nextId; timers.set(id, { at: now + Math.max(0, ms), fn }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { const id = ++nextId; frames.set(id, { fn, requestedAt: now }); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    matchMedia: query => ({ media: query, matches: !!media[query], addEventListener() {}, removeEventListener() {} }),
    getComputedStyle: () => ({ fontFamily: 'ui-monospace', color: 'rgb(137, 135, 129)', colorScheme: 'light' }),
    crypto: { getRandomValues: array => { array[0] = 0x2468ace; return array; } },
    localStorage: { getItem: k => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) },
  });
  if (deviceBox) window.ResizeObserverEntry = class { get devicePixelContentBoxSize() { return []; } };
  document.defaultView = window;
  document.hasFocus = () => window.focused;
  const clock = {
    get now() { return now; },
    pending: () => timers.size,
    // Due timers run in time order; each animation frame runs `frameLag` ms after it was requested and receives the
    // request time as its timestamp, so `frameLag` is exactly the lateness the official loop measures.
    advance(ms, { frameLag = 0 } = {}) {
      const end = now + ms;
      for (;;) {
        const timer = [...timers].sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0], frame = [...frames][0];
        const frameAt = frame ? frame[1].requestedAt + frameLag : Infinity, timerAt = timer ? timer[1].at : Infinity;
        if (Math.min(frameAt, timerAt) > end) break;
        now = Math.max(now, Math.min(frameAt, timerAt));
        if (frameAt <= timerAt) { frames.delete(frame[0]); frame[1].fn(frame[1].requestedAt); } else { timers.delete(timer[0]); timer[1].fn(); }
      }
      now = end;
    },
    setHidden(value) { document.hidden = value; document.dispatchEvent({ type: 'visibilitychange' }); },
    setFocused(value) { window.focused = value; window.dispatchEvent({ type: value ? 'focus' : 'blur' }); },
  };
  return { window, document, clock, storage, Element };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
// React DOM's client reads the global window; the adapter's owner window is the same global, as in a real renderer.
async function withGlobals(env, run) {
  const saved = ['window', 'document', 'localStorage'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const [name, value] of [['window', env.window], ['document', env.document], ['localStorage', env.window.localStorage]])
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  try { return await run(); }
  finally { for (const [name, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]; }
}
function mount(env) {
  const container = env.document.body.appendChild(env.document.createElement('div'));
  const root = createRoot(container);
  return { container, render: element => act(async () => root.render(element)), unmount: () => act(async () => root.unmount()) };
}
const advance = (env, ms, options) => act(async () => { env.clock.advance(ms, options); await flush(); });

// ---------------------------------------------------------------- generator contract
test('generator output matches the pinned 2.42304.0 sources and manifest (check mode)', async () => {
  await extractLandingTexture({ check: true });
  const manifest = JSON.parse(await fs.readFile(path.join(generated, 'manifest.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, '2.42304.0');
  for (const module of manifest.modules) {
    const bytes = await fs.readFile(path.join(reference, module.source));
    assert.equal(module.sourceSha256, createHash('sha256').update(bytes).digest('hex'), module.source);
    assert.equal(module.sha256, createHash('sha256').update(await fs.readFile(path.join(generated, module.target), 'utf8')).digest('hex'), module.target);
  }
  const byTarget = Object.fromEntries(manifest.modules.map(m => [m.target, m]));
  assert.equal(byTarget['layer.mjs'].source, 'c9d397622-Ddkc2XHN.js');
  assert.deepEqual(byTarget['layer.mjs'].bindings.map(b => b.name).join(' '),
    'f p m h g _ v y b ee x S C w te T E D O k ne re A j M ie ae oe N P F I se L ce R z le B ue de fe pe V H U me W G K he q J ge _e Y X ve ye Z Q be xe Se Ce we Te Ee De Oe ke Ae je Me');
  assert.deepEqual(byTarget['host.mjs'].bindings.map(b => b.name), ['dH', 'fH', 'pH', 'mH']);
  assert.deepEqual(byTarget['host.mjs'].rewrites, [{ binding: 'fH', from: './c9d397622-Ddkc2XHN.js', to: './layer.mjs' }]);
  assert.deepEqual(byTarget['timing.mjs'].bindings.map(b => b.name), ['NB', 'PB']);
  assert.deepEqual(byTarget['background-animation.mjs'].bindings.map(b => b.name), ['i', 'a', 'o', 's', 'c', 'l']);
  assert.deepEqual(byTarget['owner-support.mjs'].bindings.map(b => b.name), ['Uc', 'Wc', 'cp', 'lp', 'up', 'dp', 'pp', 'mp']);
  // Original import aliases are re-checked: a reused minified name pointing elsewhere would show up here.
  const layerImports = Object.fromEntries(byTarget['layer.mjs'].imports.map(i => [i.local, `${i.via} -> ${i.from}:${i.name}`]));
  assert.deepEqual(layerImports, {
    e: 'vendor-frame-DfPJ1QmD.js:Co -> react:useState', t: 'vendor-frame-DfPJ1QmD.js:So -> react:useRef',
    r: 'vendor-frame-DfPJ1QmD.js:mo -> react:useEffect', n: 'vendor-frame-DfPJ1QmD.js:Va -> react/jsx-runtime:jsx',
    i: 'shared-25-DP8p7i1Z.js:Ff -> ./owner-support.mjs:ownerWindow', s: 'shared-25-DP8p7i1Z.js:Pf -> ./owner-support.mjs:ownerWindowOrGlobal',
    a: 'shared-25-DP8p7i1Z.js:Mf -> ./owner-support.mjs:ownerMutationObserver', o: 'shared-25-DP8p7i1Z.js:Nf -> ./owner-support.mjs:ownerResizeObserver',
    c: 'shared-25-DP8p7i1Z.js:Qm -> ./owner-support.mjs:idleCallback', l: 'shared-frame-BfjMqbuN.js:vl -> ./element-node.mjs:elementNode',
    u: 'c5d9b9a16-dnU9db-H.js:t -> ./theme-attribute.mjs:themeAttribute', d: 'cc43287c9-DAfOi8yP.js:P -> ./timing.mjs:landingFadeInMs',
  });
  const adapters = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via}=${i.name}`)).sort();
  assert.deepEqual(adapters, ['cc43287c9-DAfOi8yP.js:__vite__mapDeps=chunkDependencies', 'preload-helper-D0dM6GpB.js:t=preloadChunk',
    'shared-156-Bikz018e.js:Ic=useReduceMotion', 'shared-25-DP8p7i1Z.js:$h=withChunkLoadContext', 'shared-frame-BfjMqbuN.js:mu=useOwnerWindow']);
  assert.deepEqual(Object.keys(Adapters).sort(), ['chunkDependencies', 'preloadChunk', 'useOwnerWindow', 'useReduceMotion', 'withChunkLoadContext']);
});

test('every emitted declaration is AST-identical to the shipped minified source (only the recorded import rewrite differs)', async () => {
  const { parsers } = await import('../../tools/node_modules/prettier/plugins/babel.mjs');
  const manifest = JSON.parse(await fs.readFile(path.join(generated, 'manifest.json'), 'utf8'));
  const strip = node => JSON.stringify(node, (key, value) => ['start', 'end', 'loc', 'range', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments'].includes(key) ? undefined : value);
  const declarations = code => new Map(parsers.babel.parse(code, {}).program.body.flatMap(n => n.type === 'FunctionDeclaration' ? [[n.id.name, n]] : n.type === 'VariableDeclaration' ? n.declarations.map(d => [d.id.name, d]) : []));
  let compared = 0;
  for (const module of manifest.modules) {
    const original = declarations(await fs.readFile(path.join(reference, module.source), 'utf8'));
    const emitted = declarations(await fs.readFile(path.join(generated, module.target), 'utf8'));
    assert.deepEqual([...emitted.keys()].sort(), module.bindings.map(b => b.name).sort(), `${module.target}: nothing hand-written`);
    for (const { name } of module.bindings) {
      let expected = strip(original.get(name));
      for (const rewrite of module.rewrites ?? []) if (rewrite.binding === name) expected = expected.replaceAll(JSON.stringify(rewrite.from), JSON.stringify(rewrite.to));
      assert.equal(strip(emitted.get(name)), expected, `${module.target}:${name}`);
      compared += 1;
    }
  }
  assert.equal(compared, 129);
});

test('generated text keeps the official feature strings and stays off view-tabs/code-current', async () => {
  const read = name => fs.readFile(path.join(generated, name), 'utf8');
  const layer = await read('layer.mjs'), host = await read('host.mjs');
  for (const marker of ['"code-landing-texture-recent"', '"ab0cAde1fEgh2iGjk3lHmn4oKpq5rMst6uRvw7xSyz8nT9eW"', 'e.dataset.landingTexture = "canvas"',
    'color: { dark: [0.1, 0.68, 1], light: [0, 0.25, 1] }', `className: \`${layerClass} \${m ? "opacity-100" : "opacity-0"}\``,
    'composition: { card: { centerY: 0.45, calmX: 250, calmY: 80, left: 0.3 } }', 'export {\n  Me as LandingTextureLayer,'])
    assert.ok(layer.includes(marker), marker);
  for (const marker of ['tag: "code_landing_texture"', 'var mH = O(function ({ available: e, onLanding: t })', 'import("./layer.mjs")', 'a = pH(e && t && n !== "disabled")'])
    assert.ok(host.includes(marker), marker);
  assert.match(await read('timing.mjs'), /var NB = 3e3;\nvar PB = 3e3;/);
  assert.match(await read('background-animation.mjs'), /var i = "appearance:backgroundAnimation";/);
  const adapterSource = (await fs.readFile(path.join(app, 'src/source-landing-texture-adapters.jsx'), 'utf8')).replace(/^\s*\/\/.*$/gm, '');
  for (const name of await fs.readdir(generated)) assert.doesNotMatch(await read(name), /view-tabs|code-current/, name);
  assert.doesNotMatch(adapterSource, /view-tabs|className|style|getContext|fillText|createElement|<[a-z]/, 'the adapter supplies host services only and draws nothing');
});

test('official stylesheet already carries every class the layer and its future siblings use', async () => {
  const css = await fs.readFile(path.join(app, 'public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8');
  for (const rule of ['.font-mono-ui{font-family:var(--cds-font-mono-ui)}', '.text-muted-as-secondary{color:var(--muted-as-secondary,var(--cds-text-muted))}',
    '.\\[contain\\:strict\\]{contain:strict}', '.pointer-events-none{', '.transition-opacity{', '.ease-out{', '.opacity-0{', '.opacity-100{', '.inset-0{'])
    assert.ok(css.includes(rule), rule);
  const variant = '.\\[\\[data-landing-texture\\=canvas\\]\\~div_\\&\\]\\:';
  for (const utility of ['-mx-1', 'box-content', 'w-fit', 'max-w-full', 'transform-gpu', 'rounded-none', 'bg-\\[var\\(--epitaxy-transcript-surface\\,var\\(--cds-surface-1\\)\\)\\]', 'px-1', 'before\\:', 'after\\:', '\\[\\&\\>li\\]\\:relative'])
    assert.ok(css.includes(variant + utility), utility);
});

// ---------------------------------------------------------------- SSR
test('SSR: the layer is an aria-hidden, transparent box with the official classes; the host renders nothing', () => {
  const html = renderToStaticMarkup(React.createElement(Layer.LandingTextureLayer, { shown: true, animate: true, onGone() {} }));
  assert.equal(html, `<div aria-hidden="true" class="${layerClass} opacity-0" style="transition-duration:500ms"></div>`);
  assert.equal(renderToStaticMarkup(React.createElement(Host.LandingTextureHost, { available: true, onLanding: true })), '');
});

// ---------------------------------------------------------------- pure functions and shader text
test('grid: 6.5 CSS px cells twice as tall, minimum 24x8, centred, capped at 21e6 device pixels', () => {
  const { landingGrid: grid, landingConfig: config } = Layer;
  assert.deepEqual(grid({ deviceWidth: 1600, deviceHeight: 1000, devicePixelRatio: 2 }), { cellWidth: 13, cellHeight: 26, columns: 124, rows: 39, left: -6, top: -7, scale: 2 });
  assert.equal(grid({ deviceWidth: 160, deviceHeight: 1000, devicePixelRatio: 1 }), null, 'fewer than 24 columns');
  assert.equal(grid({ deviceWidth: 1000, deviceHeight: 90, devicePixelRatio: 1 }), null, 'fewer than 8 rows');
  assert.equal(grid({ deviceWidth: 0, deviceHeight: 900, devicePixelRatio: 1 }), null);
  const big = grid({ deviceWidth: 8000, deviceHeight: 5000, devicePixelRatio: 1 });
  assert.equal(big.cellWidth, 7);
  assert.ok(big.columns < Math.ceil(8000 / 7) && big.rows < Math.ceil(5000 / 14));
  assert.ok(big.columns * big.cellWidth * big.rows * big.cellHeight <= config.grid.maxDevicePixels);
  assert.equal(big.left, Math.round((8000 - big.columns * 7) / 2));
});

test('glyph sequences, looks and wind are deterministic per seed and fall back the official way', () => {
  const { landingSequence: sequence, landingCharacters: chars, landingLooks: looks, pickLandingLook: pick, landingWind: wind, landingHash: hash } = Layer;
  assert.equal(chars.length, 96);
  const missing = [...chars].map(() => false);
  assert.deepEqual([...sequence('figured', missing)], [...looks.figured].map(c => chars.indexOf(c)));
  missing[chars.indexOf('a')] = true;
  assert.ok(![...sequence('mixed', missing)].includes(chars.indexOf('a')));
  assert.deepEqual([...sequence('figured', [...chars].map(() => true))], [chars.indexOf('.')], 'nothing drawable falls back to "."');
  assert.deepEqual([...sequence('bogus', [])], [...looks.mixed].map(c => chars.indexOf(c)));
  assert.equal(hash(7), hash(7));
  const seeds = Array.from({ length: 40 }, (_, i) => i * 7919 + 1);
  for (const seed of seeds) {
    assert.equal(pick(seed, ['mixed', 'lettered']), 'figured');
    assert.notEqual(pick(seed, ['mixed', 'lettered', 'figured']), 'mixed', 'never repeats the latest look');
    assert.equal(pick(seed, []), pick(seed, []));
    const w = wind(seed, 'bogus');
    assert.equal(w.key, 'mixed');
    assert.equal(w.seed, seed >>> 0);
    assert.deepEqual(w, wind(seed, 'bogus'));
    for (const [key, low, high] of [['speed', 42, 64], ['gustLength', 380, 560], ['gustWidth', 120, 190], ['bend', 60, 110], ['bendScale', 300, 440]])
      assert.ok(w[key] >= low && w[key] <= high, `${key}=${w[key]}`);
    const heading = w.heading < Math.PI / 2 ? w.heading : Math.PI - w.heading;
    assert.ok(heading >= Math.PI / 10 - 1e-9 && heading <= Math.PI / 4.3 + 1e-9, `heading=${w.heading}`);
  }
  assert.ok(new Set(seeds.map(seed => pick(seed, []))).size > 1);
  assert.equal(wind(1, 'lettered').key, 'lettered');
});

test('recent looks: at most three, most recent first, de-duplicated, and storage failures never throw', () => {
  const { readRecentLooks: read, rememberLook: remember, landingRecentKey: key } = Layer;
  assert.equal(key, 'code-landing-texture-recent');
  const env = createEnvironment();
  env.storage.set(key, JSON.stringify(['lettered', 3, null, 'mixed']));
  assert.deepEqual(read(env.window), ['lettered', 'mixed']);
  for (const look of ['mixed', 'lettered', 'figured', 'mixed']) remember(env.window, look);
  assert.equal(env.storage.get(key), JSON.stringify(['mixed', 'figured', 'lettered']));
  const broken = { localStorage: { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } } };
  const before = read(broken);
  assert.doesNotThrow(() => remember(broken, 'figured'));
  assert.deepEqual(read(broken), ['figured', ...before.filter(look => look !== 'figured')].slice(0, 3), 'kept in memory');
});

test('software renderers are refused; shaders carry the calm card area, glow headroom and resting light', () => {
  const { softwareRenderer: software, windVertexShader, windFragmentShader, glyphVertexShader, glyphFragmentShader, landingConfig: config } = Layer;
  for (const name of ['Google SwiftShader', 'llvmpipe (LLVM 15.0.7, 256 bits)', 'Microsoft Basic Render Driver', 'softpipe']) assert.ok(software.test(name), name);
  assert.ok(!software.test('Apple M3'));
  assert.deepEqual(config.glow.color, { dark: [0.1, 0.68, 1], light: [0, 0.25, 1] });
  assert.equal(config.power.frameMs, 40);
  assert.ok(windVertexShader.startsWith('#version 300 es') && windVertexShader.includes('out vec4 v_air;'));
  const wind = windFragmentShader();
  for (const line of ['const vec2 CALM = vec2(250.0, 80.0);', 'const float CALM_LEFT = 0.3;', 'const float CARD_Y = 0.45;', '// Thinner behind the content.', 'float heart(vec2 u)', 'vec4 tapsAt(vec2 p, out vec2 glow)'])
    assert.ok(wind.includes(line), line);
  const glyphs = glyphFragmentShader();
  for (const line of ['const float REST = 0.03;', 'const float HEAD = 3.0;', 'uniform vec3 u_color, u_glowColor;', 'float tint = smoothstep(0.04, 0.3, u_glowAmount * v_glow.x);'])
    assert.ok(glyphs.includes(line), line);
  assert.ok(glyphVertexShader().includes('if (true && glow.x < 0.04 && glow.y < 0.015) {'), 'skipUnseen with REST 0.03 inlines to true');
});

// ---------------------------------------------------------------- controlled events
test('frame loop runs only while running, visible, focused and allowed; 40 ms default; 0.25 s step cap', () => {
  const env = createEnvironment({ hidden: true });
  const times = [];
  let allowed = true;
  const loop = Layer.landingFrameLoop(env.window, t => times.push(t), { allowed: () => allowed });
  loop.setRunning(true);
  assert.equal(env.clock.pending(), 0, 'hidden document schedules nothing');
  env.clock.setHidden(false);
  assert.equal(env.clock.pending(), 1);
  env.clock.advance(39);
  assert.deepEqual(times, []);
  env.clock.advance(81);
  assert.deepEqual(times.map(t => Math.round(t * 1000)), [40, 80, 120]);
  env.clock.setFocused(false);
  assert.equal(env.clock.pending(), 0, 'blur cancels the pending frame');
  env.clock.advance(400);
  assert.equal(times.length, 3);
  allowed = false;
  env.clock.setFocused(true);
  assert.equal(env.clock.pending(), 0, 'not allowed: focus schedules nothing');
  allowed = true;
  loop.refresh();
  assert.equal(env.clock.pending(), 1);
  env.clock.advance(3000, { frameLag: 1000 });
  const steps = times.slice(3).map((t, i) => Math.round((t - times[2 + i]) * 1000));
  assert.deepEqual(steps, [250, 250], 'a one-second frame advances the texture clock by 0.25 s');
  loop.destroy();
  assert.equal(env.document.listenerCount('visibilitychange') + env.window.listenerCount('focus') + env.window.listenerCount('blur'), 0);
  assert.equal(env.clock.pending(), 0);
});

test('frame loop reports late frames (5 of the last 10 over 17 ms) and stalls (3 in a row over 50 ms)', () => {
  const env = createEnvironment();
  const late = [], stalls = [];
  const loop = Layer.landingFrameLoop(env.window, () => {}, { onLate: () => late.push(env.clock.now), onStall: () => stalls.push(env.clock.now) });
  loop.setRunning(true);
  env.clock.advance(40 * 4, { frameLag: 0 });
  env.clock.advance(60 * 4 + 20, { frameLag: 20 });
  assert.deepEqual(stalls, []);
  assert.equal(late.length, 0, 'four late frames are not yet a pattern');
  env.clock.advance(60, { frameLag: 20 });
  assert.equal(late.length, 1);
  const stallEnv = createEnvironment();
  const stalled = [];
  const slow = Layer.landingFrameLoop(stallEnv.window, () => {}, { onStall: () => stalled.push(stallEnv.clock.now), intervalMs: () => 10 });
  slow.setRunning(true);
  stallEnv.clock.advance(70 * 2, { frameLag: 60 });
  assert.deepEqual(stalled, []);
  stallEnv.clock.advance(70, { frameLag: 60 });
  assert.equal(stalled.length, 1, 'intervalMs is honoured and the third slow frame stalls');
  loop.destroy();
  slow.destroy();
});

test('touch: wakes need 18 px and 35 ms between samples; every third tap is a negative heart; busy windows 3.6 s / 2.4 s', () => {
  const touch = Layer.landingTouch();
  assert.equal(touch.move(0, 0, 0), false, 'first sample anchors');
  assert.equal(touch.move(10, 0, 0.05), false, 'under 18 px');
  assert.equal(touch.move(110, 0, 0.1), true, 'a fast stroke leaves a wake');
  assert.equal(touch.move(200, 0, 0.12), false, 'under 35 ms since the last wake');
  assert.equal(touch.move(400, 0, 0.6), false, 'a pause over 0.25 s re-anchors');
  assert.equal(touch.busy(0.1 + 2.39), true);
  assert.equal(touch.busy(0.1 + 2.41), false);
  assert.equal(touch.rippling(0.2), false, 'wakes are not ripples');
  for (const at of [10, 10.1, 10.2]) touch.tap(5, 5, at);
  const state = touch.frame(10.3);
  assert.equal(state.tapCount, 3);
  assert.deepEqual([state.taps[3], state.taps[7], state.taps[11]], [1, 1, Math.fround(-1.15)]);
  assert.equal(touch.busy(10.2 + 3.59), true);
  assert.equal(touch.rippling(10.2 + 3.59), true);
  assert.equal(touch.busy(10.2 + 3.61), false);
  assert.equal(touch.frame(20).tapCount, 0);
});

test('support gate: contrast/forced colours or no device-pixel boxes keep the texture off', () => {
  const { landingTextureSupported: supported, landingContrastQuery: contrast } = Layer;
  assert.equal(contrast, '(prefers-contrast: more), (forced-colors: active)');
  assert.equal(supported(createEnvironment().window), true);
  assert.equal(supported(createEnvironment({ deviceBox: false }).window), false);
  assert.equal(supported(createEnvironment({ media: { [contrast]: true } }).window), false);
  const env = createEnvironment({ deviceBox: false });
  env.window.ResizeObserverEntry = class {};
  assert.equal(supported(env.window), false);
  assert.equal(Layer.createLandingTexture(createEnvironment({ deviceBox: false }).document.createElement('div'), () => assert.fail('ready')), null);
});

test('texture start waits for a visible, focused window, then stops at every refused WebGL2 path without drawing', async () => {
  const attempts = [];
  let bareCanvas;
  const contexts = {
    none: canvas => { bareCanvas = canvas; return null; },
    software: canvas => fakeGl(canvas, 'Google SwiftShader'),
    noParallelCompile: canvas => fakeGl(canvas, 'Apple M3'),
  };
  function fakeGl(canvas, renderer) {
    const gl = { canvas, renderer, lost: false, sources: [], linked: 0, VERTEX_SHADER: 'vs', FRAGMENT_SHADER: 'fs' };
    Object.assign(gl, {
      getExtension: name => name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 37446 } : name === 'WEBGL_lose_context' ? { loseContext: () => { gl.lost = true; } } : null,
      getParameter: p => p === 37446 ? renderer : null,
      createProgram: () => ({}), createShader: type => ({ type }), shaderSource: (shader, text) => gl.sources.push(text),
      compileShader() {}, attachShader() {}, deleteShader() {}, linkProgram: () => { gl.linked += 1; },
    });
    attempts.push(gl);
    return gl;
  }
  for (const [kind, webgl] of Object.entries(contexts)) {
    const env = createEnvironment({ hidden: true, webgl });
    const parent = env.document.body.appendChild(env.document.createElement('div'));
    const element = parent.appendChild(env.document.createElement('div'));
    let ready = 0;
    const texture = Layer.createLandingTexture(element, () => { ready += 1; });
    assert.ok(texture, kind);
    await flush();
    assert.deepEqual(env.document.fontLoads, [], 'nothing starts in a hidden window');
    env.clock.setHidden(false);
    await flush();
    assert.deepEqual(env.document.fontLoads, [['400 16px ui-monospace', '.']]);
    env.clock.advance(0); // idle fallback without requestIdleCallback
    await flush();
    assert.equal(element.dataset.landingTexture, undefined, `${kind}: no canvas marker`);
    assert.deepEqual(element.childNodes, [], `${kind}: nothing appended`);
    assert.equal(ready, 0, `${kind}: never reports ready`);
    assert.equal(env.storage.has('code-landing-texture-recent'), false, `${kind}: look not recorded`);
    assert.equal(env.window.listenerCount('focus') + env.document.listenerCount('visibilitychange'), 0);
    assert.equal(parent.listenerCount('pointerdown'), 0, `${kind}: no pointer handling without a renderer`);
    texture.destroy();
  }
  assert.equal(bareCanvas.className, 'absolute block');
  assert.equal(bareCanvas.contextRequests.length, 1);
  const [software, noParallel] = attempts;
  assert.equal(software.lost, true);
  assert.equal(software.canvas.removed, true);
  assert.equal(software.canvas.className, 'absolute block');
  assert.deepEqual(software.canvas.contextRequests, [['webgl2', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true }]]);
  assert.equal(software.sources.length, 0, 'refused before compiling');
  assert.equal(noParallel.lost, true);
  assert.equal(noParallel.linked, 2);
  assert.deepEqual(noParallel.sources, [Layer.windVertexShader, Layer.windFragmentShader(), Layer.glyphVertexShader(), Layer.glyphFragmentShader()]);
});

test('layer in a controlled DOM: renderer refused, stays opacity-0, and calls onGone 500 ms after hiding', async () => {
  const env = createEnvironment({ webgl: () => null });
  await withGlobals(env, async () => {
    const view = mount(env);
    let gone = 0;
    const onGone = () => { gone += 1; };
    await view.render(React.createElement(Layer.LandingTextureLayer, { shown: true, animate: true, onGone }));
    const box = view.container.firstChild;
    assert.equal(box.getAttribute('aria-hidden'), 'true');
    assert.equal(box.getAttribute('class'), `${layerClass} opacity-0`);
    await advance(env, 5000);
    assert.equal(box.dataset.landingTexture, undefined);
    assert.equal(box.getAttribute('class'), `${layerClass} opacity-0`, 'no fake success: still transparent');
    await view.render(React.createElement(Layer.LandingTextureLayer, { shown: false, animate: true, onGone }));
    await advance(env, 499);
    assert.equal(gone, 0);
    await advance(env, 1);
    assert.equal(gone, 1);
    await view.unmount();
  });
});

test('reveal delay: true only after 3000 ms of continuous visibility; hiding restarts the wait', async () => {
  const env = createEnvironment();
  await withGlobals(env, async () => {
    const view = mount(env);
    const seen = [];
    const Probe = ({ when }) => { seen.push(Host.useLandingRevealDelay(when)); return null; };
    await view.render(React.createElement(Probe, { when: true }));
    await advance(env, 2000);
    await act(async () => env.clock.setHidden(true));
    await advance(env, 10000);
    assert.equal(seen.at(-1), false, 'hidden: timer cleared');
    await act(async () => env.clock.setHidden(false));
    await advance(env, 2999);
    assert.equal(seen.at(-1), false);
    await advance(env, 1);
    assert.equal(seen.at(-1), true);
    await view.render(React.createElement(Probe, { when: false }));
    assert.equal(seen.at(-1), false, 'condition false resets at once');
    await view.unmount();
  });
});

test('host: mounts the official layer after the reveal delay, unmounts it after onGone, honours backgroundAnimation=disabled', async () => {
  const env = createEnvironment({ webgl: () => null });
  await withGlobals(env, async () => {
    const view = mount(env);
    const host = props => view.render(React.createElement(Host.LandingTextureHost, props));
    await host({ available: true, onLanding: true });
    await advance(env, 2999);
    assert.deepEqual(view.container.childNodes, []);
    await advance(env, 1);
    await act(async () => { assert.equal(await Host.loadLandingTextureLayer(), Layer.LandingTextureLayer); await flush(); });
    const box = view.container.firstChild;
    assert.equal(box?.getAttribute('class'), `${layerClass} opacity-0`);
    await advance(env, 1000);
    assert.equal(box.dataset.landingTexture, undefined, 'WebGL2 refused: no canvas marker');
    await host({ available: true, onLanding: false });
    assert.equal(view.container.firstChild, box, 'kept for the 500 ms fade');
    await advance(env, 500);
    assert.deepEqual(view.container.childNodes, []);
    await view.unmount();
  });
  const disabled = createEnvironment();
  disabled.storage.set('LSS-appearance:backgroundAnimation', JSON.stringify({ value: 'disabled' }));
  await withGlobals(disabled, async () => {
    const view = mount(disabled);
    await view.render(React.createElement(Host.LandingTextureHost, { available: true, onLanding: true }));
    await advance(disabled, 10000);
    assert.deepEqual(view.container.childNodes, []);
    assert.equal(disabled.clock.pending(), 0, 'no reveal timer at all');
    await view.render(React.createElement(Host.LandingTextureHost, { available: false, onLanding: true }));
    await view.unmount();
  });
});

test('background animation preference: official LSS key, system default follows reduced motion, storage events notify', async () => {
  const reduce = '(prefers-reduced-motion: reduce)';
  const read = async (env) => withGlobals(env, async () => {
    const view = mount(env);
    let value;
    const Probe = () => { value = { ...Background.useBackgroundAnimation(), ...Adapters.useReduceMotion() }; return null; };
    await view.render(React.createElement(Probe));
    await view.unmount();
    return value;
  });
  assert.deepEqual(pick(await read(createEnvironment())), { animationMode: 'system', shouldAnimate: true, shouldReduceMotion: false });
  assert.deepEqual(pick(await read(createEnvironment({ media: { [reduce]: true } }))), { animationMode: 'system', shouldAnimate: false, shouldReduceMotion: true });
  const enabled = createEnvironment({ media: { [reduce]: true } });
  enabled.storage.set('LSS-appearance:backgroundAnimation', JSON.stringify({ value: 'enabled', tabId: '', timestamp: 1 }));
  assert.deepEqual(pick(await read(enabled)), { animationMode: 'enabled', shouldAnimate: true, shouldReduceMotion: true });
  const local = createEnvironment();
  local.document.documentElement.dataset.reduceMotion = 'true';
  assert.equal((await read(local)).shouldReduceMotion, true, 'local prefs.motion=reduce maps through html[data-reduce-motion]');
  const env = createEnvironment();
  await withGlobals(env, async () => {
    assert.equal(Background.shouldAnimateBackground(), true);
    const calls = [];
    const stop = Background.subscribeBackgroundAnimation(value => calls.push(value));
    env.storage.set('LSS-appearance:backgroundAnimation', JSON.stringify({ value: 'disabled' }));
    env.window.dispatchEvent({ type: 'storage', key: 'LSS-other' });
    env.window.dispatchEvent({ type: 'storage', key: 'LSS-appearance:backgroundAnimation' });
    assert.deepEqual(calls, [false]);
    stop();
    assert.equal(env.window.listenerCount('storage'), 0);
  });
  function pick({ animationMode, shouldAnimate, shouldReduceMotion }) { return { animationMode, shouldAnimate, shouldReduceMotion }; }
});
