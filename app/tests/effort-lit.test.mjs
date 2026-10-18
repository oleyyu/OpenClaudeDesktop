import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// The lit top-tier slider overlay (source-effort-lit.jsx), a port of c992c8428-DwnKAaOy.js (scratch lit.js).
const app = path.resolve(import.meta.dirname, '..');
let server, L;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  L = await server.ssrLoadModule('/src/source-effort-lit.jsx');
});
after(() => server?.close());

test('the shader, limits, inks and per-mode params are the source values (lit.js:13-366)', () => {
  assert.match(L.LIT_VERTEX, /^#version 300 es\nin vec2 a_position;/);
  for (const constant of ['CELL_PITCH = 4.0', 'CELL_SIZE  = 3.0', 'CELL_R     = 0.9', 'SPEED_LO   = 20.0', 'SPEED_HI   = 36.0', 'RANGE_HI   = 55.0',
    'DENSITY_HI = 0.85', 'HEAD_DECAY = 5.0', 'BODY_HI    = 0.77', 'MAX_AGE    = 5.0', 'RAMP_POW    = 1.4', 'BREATH_DIP  = 0.28', 'const int MAX_BURSTS = 8;'])
    assert.ok(L.LIT_FRAGMENT.includes(constant), constant);
  assert.match(L.LIT_FRAGMENT, /float lv = step\(0\.04, e\) \+ step\(0\.2, e\) \+ step\(0\.4, e\) \+ step\(0\.6, e\) \+ step\(0\.8, e\);/, '5-step ramp');
  assert.match(L.LIT_FRAGMENT, /fragColor = vec4\(col, a\);\n}\n$/);
  assert.deepEqual(L.LIT_LIMITS, { maxPixels: 4147200, maxBursts: 8, maxAge: 5, fadeIn: 0.7, fadeOut: 0.85, holdRamp: 1.6 });
  assert.deepEqual(L.LIT_INKS, {
    light: { chargedStart: '#888edd', chargedEnd: '#8964c4', cool: '#c6c0f3', hot: '#fbedf1', tintBlue: 'rgba(191, 214, 243, 0.28)', tintPink: 'rgba(240, 188, 204, 0.28)' },
    dark: { chargedStart: 'color(srgb 0.62 0.5 0.92)', chargedEnd: 'color(srgb 0.35 0.25 0.6)', cool: '#ffffff', hot: 'var(--cds-text-pro)', tintBlue: 'transparent', tintPink: 'transparent' },
  });
  assert.deepEqual(L.LIT_PARAMS, {
    light: { bedFill: 1, chargeMax: 0.92, chargeRamp: 0.5, inkFloor: 0.28, inkCeil: 1, gain: 1.18 },
    dark: { bedFill: 0, chargeMax: 0.85, chargeRamp: 1.1, inkFloor: 0.08, inkCeil: 0.85, gain: 1 },
  });
});

// lit.js:782-813: h = lit && !reduced && (live === true || (live === null && initialLit)) — mounted lit, the ground is on
// before the controller reports; the canvas mounts only once lit (p), carrying the light inks inline.
test('SSR: mounted lit shows the ground and the canvas; mounted unlit has neither', () => {
  const lit = renderToStaticMarkup(React.createElement(L.EffortLitOverlay, { lit: true }));
  assert.match(lit, /^<span class="sc-effort-lit-ground" data-on="" style="transition:opacity 700ms ease-out"><span class="sc-effort-lit-ground-inner"><\/span><\/span><span class="sc-effort-lit-field"><canvas aria-hidden="true" style="[^"]*"><\/canvas><\/span>$/);
  const style = /<canvas aria-hidden="true" style="([^"]*)"/.exec(lit)[1];
  for (const part of ['color:#fbedf1', 'outline-color:#c6c0f3', 'border-top-color:#888edd', 'border-bottom-color:#8964c4',
    'text-decoration-color:rgba(191, 214, 243, 0.28)', 'column-rule-color:rgba(240, 188, 204, 0.28)', 'border-width:0', 'border-style:none'])
    assert.ok(style.includes(part), part);
  const unlit = renderToStaticMarkup(React.createElement(L.EffortLitOverlay, { lit: false }));
  assert.equal(unlit, '<span class="sc-effort-lit-ground" style="transition:opacity 850ms linear"><span class="sc-effort-lit-ground-inner"></span></span><span class="sc-effort-lit-field"></span>');
});

// A minimal browser + WebGL2 double for the controller (lit.js:367-745).
function harness({ webgl = true, reduced = false } = {}) {
  const frames = new Map(); let nextFrame = 1, clock = 0;
  const calls = [], live = [], lost = [];
  const listeners = new Map();
  const media = (matches) => ({ matches, addEventListener() {}, removeEventListener() {} });
  const win = {
    devicePixelRatio: 2,
    requestAnimationFrame: (callback) => { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame: (id) => { frames.delete(id); },
    matchMedia: (query) => media(query.includes('reduced-motion') ? reduced : false),
    ResizeObserver: class { observe() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    performance: { now: () => clock },
    getComputedStyle: () => ({ color: '', outlineColor: '', borderTopColor: '', borderBottomColor: '', textDecorationColor: '', columnRuleColor: '', colorScheme: 'light' }),
  };
  const doc = { hidden: false, defaultView: win, documentElement: { getAttribute: () => null },
    addEventListener() {}, removeEventListener() {}, createElement: () => ({ getContext: () => null }) };
  const gl = new Proxy({
    getExtension: (name) => name === 'WEBGL_lose_context' ? { loseContext: () => lost.push(true) } : null,
    createShader: () => ({}), createProgram: () => ({}), createBuffer: () => ({}), getProgramParameter: () => true, isContextLost: () => false,
    getUniformLocation: (_, name) => name, getAttribLocation: () => 0,
  }, { get: (target, key) => key in target ? (...args) => { calls.push([key, ...args]); return target[key](...args); } : (...args) => { calls.push([key, ...args]); } });
  const canvas = { ownerDocument: doc, clientWidth: 180, clientHeight: 20, width: 0, height: 0,
    getContext: (kind) => webgl && kind === 'webgl2' ? gl : null,
    addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: (type) => listeners.delete(type) };
  const tick = (ms = 16) => { clock += ms; const due = [...frames]; frames.clear(); for (const [, callback] of due) callback(clock); };
  const actions = { current: null }, recolor = { current: null };
  const dispose = L.createLitController(canvas, actions, () => 'light', recolor, (value) => live.push(value));
  return { actions, recolor, calls, live, lost, tick, frames, canvas, dispose, uniform: (name) => calls.filter((call) => call[1] === name) };
}

test('controller: no WebGL2 reports live=false after the two-frame start and drops the actions', () => {
  const h = harness({ webgl: false });
  h.actions.current.pressStart(1);
  h.tick(); assert.deepEqual(h.live, []); h.tick();
  assert.deepEqual(h.live, [false]); assert.equal(h.actions.current, null);
  h.dispose(); assert.deepEqual(h.lost, []);
});

test('controller: a press queued before the program links replays as a burst at the handle, then loops until released', () => {
  const h = harness();
  h.actions.current.pressStart(1);
  h.tick(); h.tick();
  assert.deepEqual(h.live, [true]);
  assert.equal(h.canvas.width, 360, 'device-pixel canvas width'); assert.equal(h.canvas.height, 40);
  const gains = h.uniform('u_burstGain[0]').at(-1)[2];
  assert.ok(Math.abs(gains[0] - (0.15 + 0.7) * 0.45) < 1e-6, 'first burst gain = (0.15+0.7·pos)·0.45');
  assert.equal(h.uniform('u_burstCenter[0]').at(-1)[2][0], 180, 'burst x = pos · css width');
  assert.equal(h.frames.size, 1, 'the loop runs while held');
  for (let i = 0; i < 50; i++) h.tick(16);
  const fade = h.uniform('u_fade').at(-1)[2];
  assert.equal(fade, 1, 'the envelope reaches 1 after 0.7s held');
  assert.equal(h.uniform('u_bedFill').at(-1)[2], 1, 'light params from color-scheme');
  h.actions.current.pressEnd(1);
  for (let i = 0; i < 80 && h.frames.size; i++) h.tick(16);
  assert.equal(h.uniform('u_fade').at(-1)[2], 0, 'released, the field cools to 0 over 0.85s');
  assert.equal(h.frames.size, 0, 'the loop stops once cool');
  h.dispose();
  assert.ok(h.calls.some((call) => call[0] === 'deleteProgram') && h.calls.some((call) => call[0] === 'deleteBuffer'));
  assert.deepEqual(h.lost, [true], 'the context is released on unmount');
  assert.equal(h.actions.current, null);
});

test('controller: reduced motion keeps a press from firing or looping', () => {
  const h = harness({ reduced: true });
  h.actions.current.pressStart(1);
  h.tick(); h.tick();
  assert.deepEqual(h.live, [true]);
  assert.equal(h.uniform('u_burstGain[0]').length, 1, 'only the initial zeroed upload');
  assert.equal(h.frames.size, 0);
  h.dispose();
});

test('composer CSS: overlay anchoring, dark field, reduced motion and the chip tint selector', () => {
  const css = fs.readFileSync(path.join(app, 'src/source-composer.css'), 'utf8');
  assert.match(css, /\.sc-slider-track \{[^}]*container-type: inline-size;/);
  assert.match(css, /\.sc-slider-fill \{ position: relative; overflow: hidden;/);
  assert.match(css, /\.sc-slider-overlay \{ position: absolute; inset-block: 0; right: 0; width: 100cqw; pointer-events: none; \}/);
  assert.match(css, /\[data-mode="dark"\] \.sc-effort-lit-field \{[^}]*black 60%[^}]*mix-blend-mode: plus-lighter; opacity: \.65; \}/);
  assert.match(css, /html\[data-reduce-motion="true"\] \.sc-effort-lit-ground, html\[data-reduce-motion="true"\] \.sc-effort-lit-ground\[data-on\] \{ opacity: 0; transition: none !important; \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[^@]*\.sc-effort-glow:not\(\[data-r="0"\]\) \{ display: none; \}/);
  assert.match(css, /\.sc-effort-swap\[data-accent\], \.sc-effort-plain\[data-accent\] \{ color: var\(--cds-text-pro\); font-weight: 500; \}/);
  // R3 composer-row-chin: the chip is the official EffortControl trigger (a ghost CdsButton, data-cds ModelSelectorEffort);
  // the unlayered tint outranks its layered text / font-weight utilities in every state.
  assert.match(css, /\.sc-chin \[data-cds="ModelSelectorEffort"\]\[data-top-tier\] \{ color: var\(--cds-text-pro\); font-weight: 500; \}/);
  assert.doesNotMatch(css, /\.sc-effort-trigger\[data-top-tier\]/, 'no hook-class tint left');
  assert.doesNotMatch(css, /@layer[^{]*\{[^}]*ModelSelectorEffort/, 'the tint stays unlayered');
  assert.doesNotMatch(css, /sc-effort-change/);
});
