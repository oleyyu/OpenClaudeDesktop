import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import postcss from 'postcss';
import { appSheets, append, computed, declarations, element, find, loadCascade, orderOnly, parseMarkup, setState } from './fixtures/transcript-css-cascade.mjs';

// TT-04 / transcript-01: the turn footer's Pin as chapter and Good / Bad response are ghost Buttons with
// pressedVariant "selected" (2.42304.0 c96d752d0 S6e; shared-2 TX hX / gX). shared-frame-BfjMqbuN.js $l only takes
// the "selected" look when the fizzy "color" part is on (ue = le && ghost && !href && _r(ce, "color")); by default the
// button keeps Il ghost "group/btn … aria-pressed:text-accent" and its paint takes gc
// "group-aria-pressed/btn:bg-accent group-hover/btn:group-aria-pressed/btn:bg-accent". The MessageActions toolbar (shared-2
// lX) colours its buttons with "[&_button]:text-muted [&_button:hover:not([aria-pressed=true])]:text-primary".
const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL = path.join(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const BUTTON = ['group/btn', 'aria-pressed:text-accent'];
const PAINT = ['group-aria-pressed/btn:bg-accent', 'group-hover/btn:group-aria-pressed/btn:bg-accent'];
const TOOLBAR = ['[&_button]:text-muted', '[&_button:hover:not([aria-pressed=true])]:text-primary'];
// Il base: a disabled, not busy Button dims (opacity-disabled) and takes no pointer events; its colour stays.
const DISABLED = ['[&:disabled:not([aria-busy])]:opacity-disabled', 'disabled:pointer-events-none'];
const UTILITIES = 'public/assets/v1/c6a992d55-sXiDGMFQ.css';
let server, F;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  F = await server.ssrLoadModule('/src/source-turn-footer.jsx');
});
after(() => server?.close());

const render = (props) => renderToStaticMarkup(React.createElement(F.SourceTurnFooter, {
  sessionKey: 's', turnId: 't', text: 'hello', interacted: true, ...props,
}));
// The <button …> open tag carrying `marker`, and the paint span inside that button.
function button(html, marker) {
  const start = html.indexOf(marker);
  assert.ok(start >= 0, `${marker} renders`);
  const open = html.lastIndexOf('<button', start);
  const close = html.indexOf('</button>', start);
  const tag = html.slice(open, html.indexOf('>', open) + 1);
  const body = html.slice(open, close);
  const paint = body.match(/<span data-cds-part="paint"[^>]*>/)?.[0] ?? '';
  return { tag, paint, classes: (tag.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/), paintClasses: (paint.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/) };
}
const toolbarClasses = (html) => (html.match(/<div class="([^"]*)" data-cds="MessageActions"/)?.[1] ?? '').replaceAll('&amp;', '&').split(/\s+/);

test('the official pass-through strings: Il ghost carries aria-pressed:text-accent, gc is the default pressed paint, lX colours the toolbar buttons', () => {
  const source = fs.readFileSync(path.join(OFFICIAL, 'shared-frame-BfjMqbuN.js'), 'utf8');
  assert.match(source, /"cds-reset group\/btn relative isolate inline-flex/);
  assert.match(source, /ghost:`text-primary font-normal font-control aria-pressed:text-accent \$\{dc\}`/);
  assert.match(source, /gc="group-aria-pressed\/btn:bg-accent group-hover\/btn:group-aria-pressed\/btn:bg-accent"/);
  assert.match(source, /Il=g\("cds-reset group\/btn [^"]* \[&:disabled:not\(\[aria-busy\]\)\]:opacity-disabled disabled:pointer-events-none /);
  const s6e = fs.readFileSync(path.join(OFFICIAL, 'c96d752d0-BOCqU7c2.js'), 'utf8');
  assert.match(s6e, /icon:f\?"PinFilled":"Pin",pressed:f,pressedVariant:"selected"/);
  const shared2 = fs.readFileSync(path.join(OFFICIAL, 'shared-2-Cb74JByF.js'), 'utf8');
  assert.match(shared2, /role:"toolbar".{0,120}className:Ku\("flex items-center select-none","\[&_button\]:text-muted","\[&_button:hover:not\(\[aria-pressed=true\]\)\]:text-primary",o\)/);
});

test('Pin as chapter: pressed → aria-pressed=true with the official button and paint classes', () => {
  for (const pinned of [false, true]) {
    const html = render({ pin: { pinned, onToggle() {} } });
    const pin = button(html, 'data-message-action="pin"');
    assert.match(pin.tag, new RegExp(`aria-pressed="${pinned}"`));
    for (const name of BUTTON) assert.ok(pin.classes.includes(name), `${name} on the Pin button`);
    for (const name of PAINT) assert.ok(pin.paintClasses.includes(name), `${name} on the Pin paint`);
    assert.ok(!pin.paintClasses.includes('group-aria-pressed/btn:bg-fill-ghost-selected'), 'not the fizzy "selected" paint (_c)');
    for (const name of TOOLBAR) assert.ok(toolbarClasses(html).includes(name), `${name} on the MessageActions toolbar`);
  }
});

test('Good / Bad response: the current rating is pressed, with the same official classes', () => {
  const html = render({ rating: { value: 'negative', onRate() {} } });
  const good = button(html, 'data-feedback="positive"');
  const bad = button(html, 'data-feedback="negative"');
  assert.match(good.tag, /aria-pressed="false"/);
  assert.match(bad.tag, /aria-pressed="true"/);
  for (const entry of [good, bad]) {
    for (const name of BUTTON) assert.ok(entry.classes.includes(name), name);
    for (const name of PAINT) assert.ok(entry.paintClasses.includes(name), name);
    for (const name of DISABLED) assert.ok(entry.classes.map((c) => c.replaceAll('&amp;', '&')).includes(name), name);
  }
});

test('every class is in the loaded official CSS; the local sheet sets no button text colour of its own', () => {
  const css = fs.readFileSync(path.join(ROOT, UTILITIES), 'utf8');
  const escape = (name) => name.replace(/[/:&[\]()=]/g, (c) => `\\${c}`);
  for (const name of [...BUTTON, ...PAINT, ...TOOLBAR, ...DISABLED]) assert.ok(css.includes(`.${escape(name)}`), `${name} is an official utility`);
  assert.match(css, /\.aria-pressed\\:text-accent\[aria-pressed=true\]\{color:var\(--cds-text-accent\)\}/);
  assert.match(css, /\.group-aria-pressed\\\/btn\\:bg-accent:is\(:where\(\.group\\\/btn\)\[aria-pressed=true\] :where\(\.group-aria-pressed\\\/btn\\:bg-accent\)\)\{background-color:var\(--cds-bg-accent\)\}/);
  assert.ok(css.includes('.\\[\\&_button\\]\\:text-muted button{color:var(--cds-text-muted)}'));
  assert.ok(css.includes('.\\[\\&_button\\:hover\\:not\\(\\[aria-pressed\\=true\\]\\)\\]\\:text-primary button:hover:not([aria-pressed=true]){color:var(--cds-text-primary)}'));
  const local = postcss.parse(fs.readFileSync(path.join(ROOT, 'src/source-turn-footer.css'), 'utf8'));
  const colours = [];
  local.walkDecls('color', (decl) => colours.push(`${decl.parent.selector} { color: ${decl.value} }`));
  // No colour at all, not even a release: style.css's button reset sits in @layer base since D26 (R3-style).
  assert.deepEqual(colours, [], 'the local sheet sets no button colour');
  // The ghost hover fill stays local and leaves a pressed paint to gc; the base paint rule has no background at all.
  const text = local.toString();
  assert.match(text, /\.stf-copy:hover:not\(\[aria-pressed="true"\]\) \.stf-button-backdrop > \[data-cds-part="paint"\] \{ background: var\(--cds-fill-ghost-hover\); \}/);
  const base = text.match(/\.stf-button-backdrop > \[data-cds-part="paint"\] \{[^}]*\}/)?.[0] ?? '';
  assert.doesNotMatch(base, /(^|[\s;{])background(-color)?\s*:/, 'the base paint rule does not compete with group-aria-pressed/btn:bg-accent');
});

// ---- the real cascade --------------------------------------------------------------------------------------------
// Builds the rendered footer inside the transcript's own ancestors (source-transcript.jsx), then resolves `color` and
// the paint's `background-color` through every stylesheet the renderer loads, honouring @layer order (c6a992d55 declares
// properties, software-compositing, cds-card, theme, base, components, utilities; local sheets are unlayered).
function footerTree(markup) {
  const content = element('div', { class: 'source-transcript-content', 'data-testid': 'transcript-sizer', 'data-transcript-spacing': 'regular' });
  for (const node of parseMarkup(markup)) append(content, node);
  return element('html', { lang: 'en', class: 'cds-root', 'data-theme': 'claude', 'data-mode': 'system', 'data-density': 'comfortable',
    'data-platform': 'desktop', 'data-color-version': 'v2', 'data-dframe': '' }, [element('body', {}, [element('div', { id: 'root' }, [
    element('div', { class: 'source-transcript-frame', 'data-following': 'true', 'data-scroll-fade': 'false' }, [
      element('div', { class: 'transcript supports-[animation-timeline:scroll()]:[--epitaxy-top-fade-height:32px]', 'data-focus-region': 'conversation' }, [content])])])])]);
}
const clearState = (node) => { node.state.clear(); node.children.forEach(clearState); };
function resolve(cascade, node, property) {
  const result = computed(cascade, node, property);
  const list = declarations(cascade, node, property);
  const rival = list.find((d) => d.value !== list[0]?.value);
  assert.ok(!list[0] || !rival || !orderOnly(list[0], rival), `${property}: ${list[0]?.sheet} vs ${rival?.sheet} tie only on bundle order`);
  return result;
}
const where = (from) => from ? `${from.sheet} ${from.layer ? `@layer ${from.layer}` : 'unlayered'} (${from.specificity})` : 'inherited/initial';

test('the resolver itself: layer order, unlayered precedence, !important reversal, :where and revert-layer', () => {
  const doc = element('html', {}, [element('body', {}, [element('button', { class: 'x y', 'aria-pressed': 'true' })])]);
  const target = find(doc, (n) => n.tag === 'button');
  const value = (code) => computed(loadCascade([{ name: 'ua', origin: 'ua', code: 'button{color:buttontext}' }, { name: 'a.css', code }]), target, 'color').value;
  assert.equal(value('@layer lo, hi; @layer hi { .x { color: hi } } @layer lo { .x.y[aria-pressed=true] { color: lo } }'), 'hi');
  assert.equal(value('@layer u { .x.y[aria-pressed=true] { color: layered } } .x { color: unlayered }'), 'unlayered');
  assert.equal(value('@layer lo, hi; @layer lo { .x { color: lo !important } } @layer hi { .x { color: hi !important } }'), 'lo');
  assert.equal(value('.x { color: one } :where(.x.y) { color: two }'), 'one');
  assert.equal(value('@layer u { .x { color: layered } } .y { color: inherit } .x.y { color: revert-layer }'), 'layered');
  assert.equal(value('.x.y { color: revert-layer }'), 'buttontext');
  assert.equal(value('@scope (body) to (button) { button { color: limited } } @scope (body) { :scope > .x { color: scoped } }'), 'scoped');
  assert.equal(value('body:has(> .x[aria-pressed=true]) .y { color: has }'), 'has');
});

let markup, tree, cascade;
function setup(replace = {}) {
  const sheets = appSheets(ROOT, replace);
  assert.ok(sheets.some((s) => s.name === UTILITIES), 'index.html loads the official utilities sheet');
  return loadCascade(sheets);
}
const buttons = (root) => ({
  copy: find(root, (n) => n.tag === 'button' && n.attrs['aria-label'] === 'Copy'),
  pin: find(root, (n) => n.tag === 'button' && n.attrs['data-message-action'] === 'pin'),
  good: find(root, (n) => n.tag === 'button' && n.attrs['data-feedback'] === 'positive'),
  bad: find(root, (n) => n.tag === 'button' && n.attrs['data-feedback'] === 'negative'),
});

test('real cascade: a pressed Pin / Bad response ends on the official accent text and paint, hover included', () => {
  markup = render({ pin: { pinned: true, onToggle() {} }, rating: { value: 'negative', onRate() {} }, onFork() {} });
  tree = footerTree(markup);
  cascade = setup();
  const b = buttons(tree);
  for (const [name, node] of Object.entries(b)) assert.ok(node, `${name} renders`);
  const paint = (node) => find(node, (n) => n.attrs['data-cds-part'] === 'paint');
  const glyph = (node) => find(node, (n) => n.attrs['data-cds'] === 'Icon');
  for (const hover of [false, true]) {
    for (const name of ['pin', 'bad']) {
      clearState(tree);
      if (hover) setState(b[name], ['hover']);
      const color = resolve(cascade, b[name], 'color');
      assert.equal(color.value, 'var(--cds-text-accent)', `${name}${hover ? ' :hover' : ''} text → ${color.value} from ${where(color.from)}`);
      assert.equal(color.from.sheet, UTILITIES); assert.equal(color.from.layer, 'utilities');
      assert.equal(resolve(cascade, glyph(b[name]), 'color').value, 'var(--cds-text-accent)', `${name} glyph inherits the accent`);
      const fill = resolve(cascade, paint(b[name]), 'background-color');
      assert.equal(fill.value, 'var(--cds-bg-accent)', `${name}${hover ? ' :hover' : ''} paint → ${fill.value} from ${where(fill.from)}`);
      assert.equal(fill.from.layer, 'utilities');
    }
  }
  assert.deepEqual([...cascade.unknown], [], 'every selector the resolver met is modelled');
});

test('real cascade: unpressed buttons keep lX muted, and hover turns them primary with the ghost hover fill', () => {
  const b = buttons(tree);
  const paint = (node) => find(node, (n) => n.attrs['data-cds-part'] === 'paint');
  for (const name of ['copy', 'good']) {
    clearState(tree);
    const rest = resolve(cascade, b[name], 'color');
    assert.equal(rest.value, 'var(--cds-text-muted)', `${name} text → ${rest.value} from ${where(rest.from)}`);
    assert.equal(rest.from.layer, 'utilities');
    assert.equal(resolve(cascade, paint(b[name]), 'background-color').value, 'initial', `${name} paint stays transparent`);
    setState(b[name], ['hover']);
    const hover = resolve(cascade, b[name], 'color');
    assert.equal(hover.value, 'var(--cds-text-primary)', `${name} :hover text → ${hover.value} from ${where(hover.from)}`);
    assert.equal(hover.from.layer, 'utilities');
    assert.equal(resolve(cascade, paint(b[name]), 'background-color').value, 'var(--cds-fill-ghost-hover)');
  }
});

test('real cascade: an unlayered colour beats the utilities layer whatever its specificity — why the sheet sets none', () => {
  const footer = fs.readFileSync(path.join(ROOT, 'src/source-turn-footer.css'), 'utf8');
  const BOX = 'background: transparent; outline: none;';
  assert.equal(footer.split(BOX).length - 1, 1, 'the .stf-copy box declarations');
  const pressed = (sheet) => {
    const variant = setup({ 'src/source-turn-footer.css': sheet });
    clearState(tree);
    return resolve(variant, buttons(tree).pin, 'color');
  };
  // R1's sheet: `.stf-copy { color: var(--cds-text-muted) }`, unlayered (0,1,0), beat aria-pressed:text-accent (0,2,0).
  const r1 = pressed(footer.split(BOX).join('background: transparent; color: var(--cds-text-muted); outline: none;'));
  assert.equal(r1.value, 'var(--cds-text-muted)');
  assert.equal(r1.from.sheet, 'src/source-turn-footer.css');
  // As shipped, without any colour of its own, the pressed button takes the accent: since D26 (R3-style) style.css's
  // `button { color: inherit }` reset sits in @layer base, and R2's `color: revert-layer` release was dropped as
  // redundant (the old unlayered reset, which did win here, is reproduced in tests/style-control-reset-layer.test.mjs).
  const bare = pressed(footer);
  assert.equal(bare.value, 'var(--cds-text-accent)', `no local colour: ${where(bare.from)}`);
  assert.equal(bare.from.layer, 'utilities');
  assert.equal(pressed(footer.split(BOX).join('background: transparent; color: revert-layer; outline: none;')).value, 'var(--cds-text-accent)', 'R2 release');
  // With the reset released, the same muted rule placed in a layer below utilities loses to the pressed accent, as the
  // toolbar's muted does in the source.
  const layered = pressed(`${footer}\n@layer components { .stf-copy { color: var(--cds-text-muted); } }`);
  assert.equal(layered.value, 'var(--cds-text-accent)');
});

test('real cascade: a rating in flight dims Good / Bad with Il\'s opacity-disabled and keeps their colours (R3-style)', () => {
  const html = render({ rating: { value: 'negative', onRate() {} } });
  const root = footerTree(html);
  const b = buttons(root);
  cascade ??= setup();
  for (const [name, colour] of [['good', 'var(--cds-text-muted)'], ['bad', 'var(--cds-text-accent)']]) {
    const node = b[name];
    clearState(root);
    // Enabled: the official preflight's opacity:1 (@layer base), pointer events as usual.
    const rest = resolve(cascade, node, 'opacity');
    assert.equal(rest.value, '1', `${name} enabled opacity`); assert.equal(rest.from.layer, 'base');
    assert.notEqual(resolve(cascade, node, 'pointer-events').value, 'none');
    node.attrs.disabled = '';
    const opacity = resolve(cascade, node, 'opacity');
    assert.equal(opacity.value, 'var(--cds-opacity-disabled)', `${name} disabled → ${opacity.value} from ${where(opacity.from)}`);
    assert.equal(opacity.from.sheet, UTILITIES); assert.equal(opacity.from.layer, 'utilities');
    const events = resolve(cascade, node, 'pointer-events');
    assert.equal(events.value, 'none'); assert.equal(events.from.layer, 'utilities');
    // The colour is the enabled one (the toolbar's muted, or the pressed accent), not a disabled tint.
    const color = resolve(cascade, node, 'color');
    assert.equal(color.value, colour, `${name} disabled colour → ${color.value} from ${where(color.from)}`);
    assert.equal(color.from.layer, 'utilities');
    // Busy (aria-busy) is the one disabled state Il does not dim.
    node.attrs['aria-busy'] = 'true';
    assert.equal(resolve(cascade, node, 'opacity').value, '1', `${name} busy`);
    delete node.attrs['aria-busy']; delete node.attrs.disabled;
  }
  assert.deepEqual([...cascade.unknown], []);
});

test('S6e (c96d752d0): Good / Bad only pass pressed and onClick, never disable in flight, and forward repeated clicks', async () => {
  const c96 = fs.readFileSync(path.join(OFFICIAL, 'c96d752d0-BOCqU7c2.js'), 'utf8');
  assert.equal(
    c96.split('g!==void 0&&p(m,{children:[b(Uo.PositiveFeedbackAction,{pressed:a==="positive",onClick:()=>g(i,"positive")}),b(Uo.NegativeFeedbackAction,{pressed:a==="negative",onClick:()=>g(i,"negative")})]})').length - 1,
    1,
  );
  const footerSrc = fs.readFileSync(path.join(ROOT, 'src/source-turn-footer.jsx'), 'utf8');
  assert.doesNotMatch(footerSrc, /rateBusy|setBusy|disabled={busy}/);

  const calls = [];
  let pendingResolve;
  const onRate = (kind) => {
    calls.push(kind);
    return new Promise((r) => { pendingResolve = r; });
  };
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let idCounter = 0;
  const withHooks = (fn) => {
    const prev = internal.H;
    internal.H = {
      useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
      useRef: (init) => ({ current: init }),
      useId: () => `:tf-${++idCounter}:`,
      useMemo: (f) => f(),
      useCallback: (f) => f,
      useEffect: () => {},
      useLayoutEffect: () => {},
      useContext: (ctx) => ctx._currentValue,
      useSyncExternalStore: (_sub, get, getServer) => (getServer ?? get)(),
    };
    try { return fn(); }
    finally { internal.H = prev; }
  };
  const findButtons = (node, out = []) => {
    if (!node || typeof node !== 'object') return out;
    if (Array.isArray(node)) { for (const c of node) findButtons(c, out); return out; }
    if (typeof node.type === 'function') return findButtons(withHooks(() => node.type(node.props)), out);
    if (node.type && typeof node.type === 'object' && typeof node.type.render === 'function')
      return findButtons(withHooks(() => node.type.render(node.props, node.ref ?? null)), out);
    if (node.type === 'button' && node.props?.['data-feedback']) out.push(node);
    if (node.props?.children) findButtons(node.props.children, out);
    return out;
  };
  const fbButtons = findButtons(React.createElement(F.SourceTurnFooter, {
    sessionKey: 's', turnId: 't', text: 'hello', interacted: true,
    rating: { value: 'positive', onRate },
  }));
  assert.equal(fbButtons.length, 2);
  const [goodBtn, badBtn] = fbButtons;
  assert.equal(goodBtn.props['data-feedback'], 'positive');
  assert.equal(goodBtn.props['aria-pressed'], true);
  assert.equal(goodBtn.props.disabled, undefined);
  assert.equal(badBtn.props['data-feedback'], 'negative');
  assert.equal(badBtn.props['aria-pressed'], false);
  assert.equal(badBtn.props.disabled, undefined);

  // Repeated clicks while the first request is still pending are forwarded directly, never dropped by a busy guard.
  const p1 = goodBtn.props.onClick({ defaultPrevented: false });
  const p2 = goodBtn.props.onClick({ defaultPrevented: false });
  const p3 = badBtn.props.onClick({ defaultPrevented: false });
  assert.deepEqual(calls, ['positive', 'positive', 'negative']);
  pendingResolve?.();
  await Promise.race([Promise.all([p1, p2, p3]), new Promise((r) => setTimeout(r, 10))]);

  // In the shipped cascade, Good & Bad have no disabled attribute, so opacity stays 1.
  cascade ??= setup();
  const root = footerTree(render({ rating: { value: 'positive', onRate } }));
  const b = buttons(root);
  for (const name of ['good', 'bad']) {
    assert.equal(b[name].attrs.disabled, undefined);
    assert.equal(resolve(cascade, b[name], 'opacity').value, '1');
  }
});
