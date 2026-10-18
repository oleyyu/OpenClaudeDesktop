import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { transform } from 'lightningcss';
import { parseAst } from 'rolldown/parseAst';
import { appSheets, append, bundleOrder, computed, declarations, element, find, loadCascade, orderOnly, parseMarkup, setState, specificity }
  from './fixtures/transcript-css-cascade.mjs';

// D26 (R3-style): style.css's native-control resets (button/input/textarea/select font+color, the button box reset,
// button:disabled and -webkit-app-region) were unlayered, so they beat every @layer components / utilities class of
// 2.42304.0 on a control whatever its specificity. That one root cause was behind R1 TT-04 (turn footer), the
// .df-user-menu-btn restatement in style.css and the revert-layer releases around official controls (source-code-start,
// source-composer, source-sidebar, source-file-viewer, source-sessions-page, source-view-tabs,
// source-saved-environment-dialog). Step 1 put the resets in @layer base, after the official preflight of the same layer
// (c6a992d55-sXiDGMFQ.css); step 2 removed the workarounds. Each cascade below is resolved through every stylesheet the
// renderer loads, in bundle order, three ways: with the workaround put back; without it (as shipped — nothing changes,
// so it was redundant); and without it over the old unlayered reset (the root cause: the reset wins again).
const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL = 'public/assets/v1/c6a992d55-sXiDGMFQ.css';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const START = '/* D26 (R3-style)', END = '/* end D26 control resets */';
// The unlayered reset step 1 replaced, verbatim (R3 snapshot src/style.css:42-64).
const UNLAYERED_RESET = `button,
input,
textarea,
select {
  font: inherit;
  color: inherit;
}
button {
  cursor: default;
  border: 0;
  background: transparent;
  padding: 0;
}
button:disabled {
  color: var(--cds-text-disabled);
  cursor: default;
}
button,
input,
textarea,
select {
  -webkit-app-region: no-drag;
}
`;
const once = (text, part) => {
  const pieces = text.split(part);
  assert.equal(pieces.length, 2, `exactly one ${JSON.stringify(part.slice(0, 60))}`);
  return pieces;
};
const without = (text, ...parts) => parts.reduce((acc, part) => once(acc, part).join(''), text);
const style = read('src/style.css');
const block = once(once(style, START)[1], END)[0];
// The disabled-colour keep rule inside the block (from its selector to its closing brace).
const keepRule = block.slice(block.indexOf('button:where('), block.indexOf('}', block.indexOf('button:where(')) + 1);
const keepClasses = [...keepRule.matchAll(/button:where\(([^)]*)\):disabled/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().replace(/^\./, '')));
const styleUnlayered = (text) => { const [head, rest] = once(text, START); return head + UNLAYERED_RESET + once(rest, END)[1].replace(/^\n/, ''); };

// ---- the removed workarounds ------------------------------------------------------------------------------------------
// Each as it stood before step 2 (`rule`, verbatim) and where: `from` is the sheet text today, `to` the same text with
// the workaround in place. Putting one back replaces `from` by `to`; if another lane has since changed the neighbouring
// text the rule is appended to its sheet instead (equal-specificity ties inside that sheet are then its own).
const at = (sheet, anchor, rule, side) => ({ sheet, rule, from: anchor, to: side === 'before' ? rule + anchor : anchor + rule });
const WORKAROUNDS = {
  // R2-transcript TT-04: the turn footer's colour release.
  footer: { sheet: 'src/source-turn-footer.css', rule: 'color: revert-layer; ', from: 'background: transparent; outline: none;', to: 'background: transparent; color: revert-layer; outline: none;' },
  // pw restatement (style.css).
  userMenu: at('src/style.css', '/* Sidebar resize handle (', `/* pw's utilities sit in @layer utilities / components of the loaded
   c6a992d55-C0zTICcS.css, so the unlayered button reset at the top of this
   file (padding 0, transparent background, focus-visible outline) wins over
   them whatever their specificity. Restate only the colliding declarations
   from pw's class string: pl-[var(--df-row-px)] pr-2,
   hover:bg-[var(--df-hover)] and outline-none (cds-reset); the rest
   (height, radius, gap, focus-visible:shadow-focus) applies as loaded. */
.df-user-menu-btn {
  padding: 0 8px 0 var(--df-row-px);
}
.df-user-menu-btn:hover {
  background-color: var(--df-hover);
}
.df-user-menu-btn:focus-visible {
  outline: none;
}
`, 'before'),
  startRows: at('src/source-code-start.css', "/* SourcePopover's unlayered .sp-popup sizes", `/* The app's unlayered legacy button reset would override official layered
   padding/font/hover utilities. Native extracted rows defer to those layers:
   the card's rows (rest rows and PreviewCard triggers included) and the rows
   listed in a rest row's popover, which is portaled outside the card. */
[data-testid="epitaxy-start-card"] button[data-testid],
.oc-start-popup button[data-testid] {
  font: revert-layer; color: revert-layer; padding: revert-layer; background: revert-layer;
}
`, 'before'),
  composerSend: at('src/source-composer.css', '/* composer-env-bar: the Home draft', `.sc-composer .sc-input-row button[data-cds="Button"]:not(.sc-button) {
  font: revert-layer; color: revert-layer; padding: revert-layer; background: revert-layer;
  border: revert-layer; border-radius: revert-layer; text-align: revert-layer; cursor: revert-layer;
}
`, 'before'),
  composerEnvBar: at('src/source-composer.css', '.sc-zone .sc-chin.sc-env-bar-scope { display: contents; font: inherit; color: inherit; }\n', `.sc-env-bar-scope button[data-cds="Button"]:not(.sc-button) {
  font: revert-layer; color: revert-layer; padding: revert-layer; background: revert-layer;
  border: revert-layer; border-radius: revert-layer; text-align: revert-layer; cursor: revert-layer;
}
`, 'after'),
  composerEnvMenu: at('src/source-composer.css', '.smenu-popup.sc-env-menu { min-width: 200px; }\n', `/* Current ca80fca8d tX owns the action utilities. Release the host button reset. */
.source-env-menu-row button {
  font: revert-layer; color: revert-layer; padding: revert-layer; background: revert-layer;
  border: revert-layer; border-radius: revert-layer; text-align: revert-layer;
}
`, 'after'),
  sidebarRows: at('src/source-sidebar.css', '.source-session-row.source-current-session-host { height: auto; }\n', `/* The host reset is unlayered; release these properties to official utilities. */
.source-current-filter-button,
.source-current-session-host :is(button, input) {
  font: revert-layer;
  color: revert-layer;
  padding: revert-layer;
  background: revert-layer;
  border: revert-layer;
  border-radius: revert-layer;
  text-align: revert-layer;
}
`, 'after'),
  familyStub: at('src/source-sidebar.css', '.source-sidebar:not([data-code-list]) .df-session-list { --df-iconless-pad: 10px; }\n', `.source-sidebar .df-family-stub {
  padding-inline-start: calc(var(--df-row-px) + var(--df-row-indent, 0px) + var(--df-iconless-pad, calc((var(--df-leading-slot) - var(--df-icon-size)) / 2)));
  padding-inline-end: var(--df-row-px);
  font-size: var(--df-group-font);
  color: var(--cds-text-secondary);
}
.source-sidebar .df-family-stub:hover { color: var(--cds-text-primary); }
`, 'after'),
  breadcrumb: at('src/source-file-viewer.css', '.source-file-breadcrumb { display: contents; }\n', `.source-file-breadcrumb button {
  font: revert-layer;
  color: revert-layer;
  padding: revert-layer;
  background: revert-layer;
  border: revert-layer;
  border-radius: revert-layer;
  text-align: revert-layer;
}
`, 'after'),
  sessionsPage: at('src/source-sessions-page.css', '.source-sessions-page :is(input,textarea):focus { outline: revert-layer; }', `/* Release the unlayered host control reset to the original CDS utilities. */
.source-sessions-page :is(button,input,textarea,select) {
  font: revert-layer;
  color: revert-layer;
  padding: revert-layer;
  background: revert-layer;
  border: revert-layer;
  border-radius: revert-layer;
  text-align: revert-layer;
}
`, 'before'),
  viewTabs: { sheet: 'src/source-view-tabs.css', rule: `/* Let the original utility layer style tab controls instead of the host's
   generic unlayered button reset. Dimensions/colors remain source-owned. */
.source-view-tabs button {
  font: revert-layer;
  color: revert-layer;
  padding: revert-layer;
  background: revert-layer;
  border: revert-layer;
  border-radius: revert-layer;
}
` },
  savedEnvInput: at('src/source-saved-environment-dialog.css', '.saved-environment-dialog .source-settings-button.text-danger { color: revert-layer; }', `/* Undo the host's unlayered native-control font/color reset for the original tx. */
.saved-environment-dialog input[data-cds="TextInput"] { font: revert-layer; color: revert-layer; }
`, 'before'),
  savedEnvButton: at('src/source-saved-environment-dialog.css', '.saved-environment-dialog .saved-environment-link {', `/* cd8823d73 he: the branch trigger is the original CDS Button (view-tabs CdsButton). Release style.css's unlayered
   button reset so its own utilities (px-md, min-w-0 shrink, text-muted-as-secondary) apply; the host X button keeps
   source-settings-button's rules. */
.saved-environment-dialog button[data-cds="Button"]:not(.source-settings-button) {
  font: revert-layer; color: revert-layer; padding: revert-layer; background: revert-layer;
  border: revert-layer; border-radius: revert-layer; text-align: revert-layer; cursor: revert-layer;
}
`, 'before'),
  savedEnvBranchInput: at('src/source-saved-environment-dialog.css', '.smenu-popup.saved-environment-branch-popup { min-width: revert-layer; max-width: revert-layer; }\n',
    '.saved-environment-branch-popup input[data-cds="TextInput"] { font: revert-layer; color: revert-layer; }\n', 'after'),
};
const appended = new Set();
function putBack(text, name) {
  const w = WORKAROUNDS[name];
  if (w.to && text.includes(w.to)) return text;
  if (w.from && text.split(w.from).length === 2) return text.split(w.from).join(w.to);
  if (w.from) appended.add(name);
  return `${text}\n${w.rule}`;
}
function takeOut(text, name) {
  const w = WORKAROUNDS[name];
  if (w.to && text.includes(w.to)) return once(text, w.to).join(w.from);
  if (text.includes(w.rule)) return once(text, w.rule).join('');
  return text;
}

// Cascades by variant, built once: `reset` 'layered' (as shipped), 'unlayered' (the old reset) or 'nokeep' (layered,
// without the disabled-colour keep rule); `on` / `off` put back / take out workarounds by name; `drop` removes exact
// rule texts from local sheets.
const cascades = new Map();
function cascade({ reset = 'layered', on = [], off = [], drop = {} } = {}) {
  const key = JSON.stringify({ reset, on, off, drop });
  if (!cascades.has(key)) {
    const replace = {};
    const sheet = (name) => replace[name] ?? read(name);
    for (const name of on) replace[WORKAROUNDS[name].sheet] = putBack(sheet(WORKAROUNDS[name].sheet), name);
    for (const name of off) replace[WORKAROUNDS[name].sheet] = takeOut(sheet(WORKAROUNDS[name].sheet), name);
    for (const [name, parts] of Object.entries(drop)) replace[name] = without(sheet(name), ...parts);
    const base = sheet('src/style.css');
    replace['src/style.css'] = reset === 'unlayered' ? styleUnlayered(base) : reset === 'nokeep' ? without(base, keepRule) : base;
    cascades.set(key, loadCascade(appSheets(ROOT, replace)));
  }
  return cascades.get(key);
}
// index.html's <html> attributes, then body > #root > children.
const HTML_ATTRS = Object.fromEntries([...(/<html\b([^>]*)>/.exec(read('index.html'))[1]).matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const page = (...children) => element('html', HTML_ATTRS, [element('body', {}, [element('div', { id: 'root' }, children)])]);
const chain = (ancestors) => {
  const nodes = ancestors.map((a) => element(a.tag ?? 'div', typeof a === 'string' ? { class: a } : Object.fromEntries(Object.entries(a).filter(([k]) => k !== 'tag'))));
  for (let i = 1; i < nodes.length; i++) append(nodes[i - 1], nodes[i]);
  return nodes;
};
// SSR markup placed inside the given ancestor elements (a class string or an attribute object each, `tag` optional)
// under #root; returns the innermost container.
const mount = (markup, ...ancestors) => {
  const nodes = chain(ancestors);
  const root = find(page(...nodes.slice(0, 1)), (n) => n.attrs.id === 'root');
  const inner = nodes.at(-1) ?? root;
  for (const node of parseMarkup(markup)) append(inner, node);
  return inner;
};
// The same, portaled: body > ancestors (after #root), as SourcePopover / SourceMenu / SourceDialog render.
const portal = (markup, ...ancestors) => {
  const nodes = chain(ancestors);
  const body = find(page(), (n) => n.tag === 'body');
  append(body, nodes[0]);
  const inner = nodes.at(-1);
  for (const node of parseMarkup(markup)) append(inner, node);
  return inner;
};
const all = (root, predicate) => { const out = []; const walk = (n) => { if (predicate(n)) out.push(n); n.children.forEach(walk); }; walk(root); return out; };
const hasClass = (n, name) => String(n.attrs.class ?? '').split(/\s+/).includes(name);
const top = (node) => (node.parent ? top(node.parent) : node);
const clearState = (node) => { const walk = (n) => { n.state.clear(); n.children.forEach(walk); }; walk(top(node)); };
const where = (from) => (from ? `${from.sheet}:${from.line} ${from.layer ? `@layer ${from.layer}` : 'unlayered'} (${from.specificity})` : 'initial');
function resolve(c, node, property) {
  const result = computed(c, node, property);
  const list = declarations(c, node, property);
  const rival = list.find((d) => d.value !== list[0]?.value);
  assert.ok(!list[0] || !rival || !orderOnly(list[0], rival), `${property}: ${list[0]?.sheet} vs ${rival?.sheet} tie only on bundle order`);
  return result;
}
// On desktop the official --cds-cursor-interactive is `default` (asserted below), the value desktop-layout.css's
// unlayered dframe rule gives every button too.
const effective = (property, value) => (property === 'cursor' && value === 'var(--cds-cursor-interactive)' ? 'default' : value);
const RESET_PROPS = ['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'background-color', 'border-top-width', 'border-top-style', 'border-left-width', 'border-left-style', 'border-top-left-radius', 'text-align', 'cursor'];
// A declaration of the old unlayered reset itself: style.css, no layer, selectors naming only a control (and :disabled).
const isReset = (decl) => Boolean(decl) && decl.sheet === 'src/style.css' && !decl.layer
  && decl.rule.selectors.every((sel) => sel.every((c) => (c.type === 'type' && ['button', 'input', 'textarea', 'select'].includes(c.name)) || (c.type === 'pseudo-class' && c.kind === 'disabled')));
const label = (node) => `<${node.tag}${node.attrs['data-testid'] ? ` data-testid=${node.attrs['data-testid']}` : ''}${node.attrs['aria-label'] ? ` aria-label="${node.attrs['aria-label']}"` : ''} class="${String(node.attrs.class ?? '').slice(0, 48)}…">`;
// The shipped sheets carry none of `names`.
function removed(...names) {
  for (const name of names) {
    const w = WORKAROUNDS[name], text = read(w.sheet);
    assert.ok(!(w.to && text.includes(w.to)) && !text.includes(w.rule), `${w.sheet}: the ${name} workaround is gone`);
  }
}
// The three-way comparison over `nodes` for `properties` in `states`: with the workaround == without it (as shipped) for
// every one; over the old reset without it, at least one property differs, won by style.css's reset — on every node
// (`everyNode`) or on some.
function threeWay({ nodes, names, properties = RESET_PROPS, states = [[]], everyNode = true }) {
  removed(...names);
  const withIt = cascade({ on: names }), shipped = cascade(), rootCause = cascade({ reset: 'unlayered' });
  const evidence = [], unaffected = [];
  for (const node of nodes) {
    let caused = null;
    for (const state of states) {
      clearState(node); if (state.length) setState(node, state);
      for (const property of properties) {
        const a = resolve(withIt, node, property), b = resolve(shipped, node, property), c = resolve(rootCause, node, property);
        assert.equal(effective(property, b.value), effective(property, a.value),
          `${label(node)}${state.map((s) => `:${s}`).join('')} ${property}: with the workaround ${a.value} (${where(a.from)}) vs without ${b.value} (${where(b.from)})`);
        if (!caused && effective(property, c.value) !== effective(property, b.value) && isReset(c.via ?? c.from)) caused = `${property}${state.map((s) => `:${s}`).join('')}: ${c.value} from ${where(c.via ?? c.from)} instead of ${b.value} from ${where(b.from)}`;
      }
    }
    clearState(node);
    if (everyNode) assert.ok(caused, `${label(node)}: the old unlayered reset decides at least one property once the workaround is gone`);
    if (caused) evidence.push(`${label(node)} — ${caused}`); else unaffected.push(label(node));
  }
  assert.ok(evidence.length, `${names}: the old reset decides something on at least one node`);
  return { evidence, unaffected };
}
const report = (t, title, { evidence, unaffected }) => t.diagnostic(`${title}: ${evidence.length} node(s) the old reset decided${unaffected.length ? `, ${unaffected.length} it never touched` : ''}\n${evidence.join('\n')}`);

let server;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
});
after(() => {
  server?.close();
  if (appended.size) console.log(`# workarounds put back at the end of their sheet (neighbouring text changed): ${[...appended].join(', ')}`);
});
const noop = () => {};
// A document stub for modules that touch document at render (view-tabs preload helper, menus' dir lookup; D21).
function withDocument(t) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'document');
  if (!saved) {
    Object.defineProperty(globalThis, 'document', { value: { documentElement: { dir: 'ltr', getAttribute: () => null }, body: {}, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }), querySelector: () => null, querySelectorAll: () => [], head: { appendChild() {} } }, configurable: true });
    t.after(() => { delete globalThis.document; });
  }
}

// ---- the official layer order and preflight -------------------------------------------------------------------------

test('2.42304.0 declares properties … base, components, utilities and puts its control preflight in base; desktop cursor is default', () => {
  const css = read(OFFICIAL);
  const official = loadCascade([{ name: OFFICIAL, code: css }]);
  assert.deepEqual([...official.layers.root.children.keys()], ['properties', 'software-compositing', 'cds-card', 'theme', 'base', 'components', 'utilities']);
  const base = css.slice(css.indexOf('@layer base{'), css.indexOf('@layer components{'));
  for (const rule of ['*,:after,:before,::backdrop{box-sizing:border-box;border:0 solid;margin:0;padding:0}',
    'button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}',
    ':where(.cds-root) :where(button,[role=button],[role=tab],[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio],[role=option],[role=switch],[role=checkbox],[role=radio]){cursor:var(--cds-cursor-interactive)}',
    ':where(.cds-root) :where(button,[role]):where(:disabled,[aria-disabled=true],[data-disabled]){cursor:default}',
    ':where(a,button,input,label,select,textarea,summary,[contenteditable],[role=button],[role=checkbox],[role=radio],[role=switch],[role=tab]),.draggable-none{app-region:no-drag}'])
    assert.ok(base.includes(rule), `official @layer base: ${rule.slice(0, 70)}`);
  assert.doesNotMatch(base, /button:disabled\{[^}]*color/, 'the source preflight gives a disabled button no colour of its own');
  assert.ok(css.includes('.cds-root[data-platform=desktop]{--cds-cursor-interactive:default}'));
  assert.ok(css.includes('--spacing:.25rem'));
  assert.equal(HTML_ATTRS.class, 'cds-root'); assert.equal(HTML_ATTRS['data-platform'], 'desktop'); assert.equal(HTML_ATTRS['data-dframe'], '');
  // index.html links every official sheet; the app bundle (style.css among it) is loaded after them.
  const order = appSheets(ROOT).map((sheet) => sheet.name);
  assert.ok(order.indexOf(OFFICIAL) < order.indexOf('src/style.css'));
});

test('style.css: the four control resets are in the official base layer, below components and utilities; no unlayered rule styles a bare control', () => {
  let parsed;
  transform({ filename: 'style.css', code: Buffer.from(style), visitor: { StyleSheet(sheet) { parsed = sheet.rules; } } });
  const text = (selectors) => selectors.map((sel) => sel.map((c) => c.type === 'combinator' ? ' ' : c.type === 'type' ? c.name : c.type === 'pseudo-class' ? `:${c.kind}` : `<${c.type}>`).join('')).join(', ');
  const layered = parsed.filter((rule) => rule.type === 'layer-block');
  const resets = layered.filter((rule) => JSON.stringify(rule.value.name) === '["base"]' && rule.value.rules.some((r) => text(r.value.selectors) === 'button:disabled'));
  assert.equal(resets.length, 1, 'one @layer base block holds the resets');
  assert.deepEqual(resets[0].value.rules.slice(0, 4).map((rule) => text(rule.value.selectors)), ['button, input, textarea, select', 'button', 'button:disabled', 'button, input, textarea, select']);
  assert.ok(layered.every((rule) => JSON.stringify(rule.value.name) === '["base"]'), 'style.css adds no layer of its own');
  // Unlayered style rules whose selectors name a control and nothing else (no class, id or attribute anywhere).
  const flat = (rules) => rules.flatMap((rule) => (rule.type === 'media' || rule.type === 'supports' ? flat(rule.value.rules) : [rule]));
  const bare = flat(parsed).filter((rule) => rule.type === 'style' && rule.value.selectors.some((sel) => sel.some((c) => c.type === 'type' && ['button', 'input', 'textarea', 'select'].includes(c.name))
    && !JSON.stringify(sel).match(/"type":"(class|id|attribute)"/)));
  // input:focus / textarea:focus { outline: none } is the only one: it sets no property of the D26 resets, and every
  // official input class the host uses agrees with it (outline-none, focus-visible:outline-hidden, the .cds-input reset).
  assert.deepEqual(bare.map((rule) => [text(rule.value.selectors), rule.value.declarations.declarations.map((d) => d.property)]), [['input:focus, textarea:focus', ['outline']]]);
  // The disabled-colour keep rule: (0,1,1) like the old button:disabled, and every selector needs a host class.
  let keep;
  transform({ filename: 'keep.css', code: Buffer.from(keepRule), visitor: { StyleSheet(sheet) { keep = sheet.rules[0].value; } } });
  assert.deepEqual(keep.declarations.declarations.map((d) => d.property === 'unparsed' ? d.value.propertyId.property : d.property), ['color']);
  for (const sel of keep.selectors) {
    assert.deepEqual(specificity(sel), [0, 1, 1]);
    assert.match(JSON.stringify(sel), /"type":"class"/);
  }
  assert.ok(!keepClasses.includes('stf-copy'), 'the turn footer dims like Il instead (step 2)');
  assert.doesNotMatch(style, /^\.df-user-menu-btn/m, 'no pw restatement (step 2)');
  // In the cascade the local base is the official base: one layer, ordered below components and utilities.
  const shipped = cascade();
  assert.deepEqual([...shipped.layers.root.children.keys()].slice(0, 7), ['properties', 'software-compositing', 'cds-card', 'theme', 'base', 'components', 'utilities']);
  const resetRules = shipped.rules.filter((rule) => rule.sheet === 'src/style.css' && rule.layer.join('.') === 'base');
  assert.equal(resetRules.length, 4);
  assert.ok(bundleOrder(ROOT).indexOf('src/message-style.css') < bundleOrder(ROOT).indexOf('src/style.css'), 'message-style.css is @imported first');
});

// ---- R1 TT-04: the turn footer ---------------------------------------------------------------------------------------

test('TT-04 footer: no .stf-copy colour release; the pressed accent wins over the layered reset, and a rating in flight dims like Il', async () => {
  const F = await server.ssrLoadModule('/src/source-turn-footer.jsx');
  const markup = renderToStaticMarkup(React.createElement(F.SourceTurnFooter, { sessionKey: 's', turnId: 't', text: 'hello', interacted: true,
    pin: { pinned: true, onToggle() {} }, rating: { value: 'negative', onRate() {} }, onFork() {} }));
  // source-transcript.jsx's ancestors of a turn footer.
  const host = mount(markup, { class: 'source-transcript-frame', 'data-following': 'true', 'data-scroll-fade': 'false' },
    { class: 'transcript', 'data-focus-region': 'conversation' }, { class: 'source-transcript-content', 'data-testid': 'transcript-sizer', 'data-transcript-spacing': 'regular' });
  const button = (attr, value) => find(host, (n) => n.tag === 'button' && n.attrs[attr] === value);
  const b = { copy: button('aria-label', 'Copy'), pin: button('data-message-action', 'pin'), good: button('data-feedback', 'positive'), bad: button('data-feedback', 'negative') };
  removed('footer');
  const withIt = cascade({ on: ['footer'] }), shipped = cascade(), rootCause = cascade({ reset: 'unlayered' });
  for (const hover of [[], ['hover']]) {
    for (const name of ['pin', 'bad']) {
      clearState(host); if (hover.length) setState(b[name], hover);
      for (const c of [shipped, withIt]) {
        const color = resolve(c, b[name], 'color');
        assert.equal(color.value, 'var(--cds-text-accent)', `${name}${hover.length ? ':hover' : ''} → ${color.value} from ${where(color.from)}`);
        assert.equal(color.from.sheet, OFFICIAL); assert.equal(color.from.layer, 'utilities');
      }
      const old = resolve(rootCause, b[name], 'color');
      assert.notEqual(old.value, 'var(--cds-text-accent)');
      assert.ok(isReset(old.via), `the old reset's color: inherit wins: ${where(old.via)}`);
    }
    for (const name of ['copy', 'good']) {
      clearState(host); if (hover.length) setState(b[name], hover);
      const want = hover.length ? 'var(--cds-text-primary)' : 'var(--cds-text-muted)';
      for (const c of [shipped, withIt]) assert.equal(resolve(c, b[name], 'color').value, want, `${name}${hover.length ? ':hover' : ''}`);
    }
  }
  // A rating in flight: Good / Bad are disabled. Il "[&:disabled:not([aria-busy])]:opacity-disabled
  // disabled:pointer-events-none" dims them and the colour stays the toolbar's muted / the pressed accent (the source
  // preflight has no disabled colour). Before step 2 the host's keep rule gave them --cds-text-disabled (R2 difference 1).
  clearState(host);
  for (const [name, colour] of [['good', 'var(--cds-text-muted)'], ['bad', 'var(--cds-text-accent)']]) {
    b[name].attrs.disabled = '';
    const color = resolve(shipped, b[name], 'color');
    assert.equal(color.value, colour, `${name} disabled → ${color.value} from ${where(color.from)}`); assert.equal(color.from.layer, 'utilities');
    const opacity = resolve(shipped, b[name], 'opacity');
    assert.equal(opacity.value, 'var(--cds-opacity-disabled)'); assert.equal(opacity.from.sheet, OFFICIAL); assert.equal(opacity.from.layer, 'utilities');
    assert.equal(resolve(shipped, b[name], 'pointer-events').value, 'none');
    // The step-1 keep rule (stf-copy listed) is what used to win.
    const kept = resolve(loadCascade(appSheets(ROOT, { 'src/style.css': style.split('.ssn-action, .sua-copy').join('.ssn-action, .stf-copy, .sua-copy') })), b[name], 'color');
    assert.equal(kept.value, 'var(--cds-text-disabled)'); assert.equal(kept.from.sheet, 'src/style.css');
    b[name].attrs['aria-busy'] = 'true';
    assert.equal(resolve(shipped, b[name], 'opacity').value, '1', `${name} busy: not dimmed`);
    delete b[name].attrs['aria-busy']; delete b[name].attrs.disabled;
  }
  assert.deepEqual([...shipped.unknown], []);
});

// ---- .df-user-menu-btn -----------------------------------------------------------------------------------------------

test('.df-user-menu-btn: the source\'s ps-/pe-2/text-start class string, and no restatement — pr-2, hover:bg and outline-none apply over the layered reset', async () => {
  // 2.42304.0 shared-19 pw: the account button's class string.
  const official = /"(df-user-menu-btn cds-reset [^"]*)"/.exec(fs.readFileSync(path.join(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/shared-19-CkPOiIKm.js'), 'utf8'))[1];
  assert.equal(official, 'df-user-menu-btn cds-reset flex h-[max(28px,var(--df-footer-btn-size))] max-w-full items-center gap-[var(--df-row-gap)] rounded-[var(--df-radius-pill)] ps-[var(--df-row-px)] pe-2 text-start outline-none hover:bg-[var(--df-hover)] focus-visible:shadow-focus');
  const { SourceSidebar } = await server.ssrLoadModule('/src/source-sidebar.jsx');
  const now = Math.floor(Date.now() / 1000);
  const sidebar = (props) => mount(renderToStaticMarkup(React.createElement(SourceSidebar, { sessions: [{ id: 's1', name: 'Session s1', cwd: '/fixture/work', createdAt: now, updatedAt: now }],
    knownFolders: ['/fixture/work'], displayName: 'Fixture Person', accountLabel: 'plus', ...props })), 'desktop-app dframe-root');
  const userButton = (host) => find(host, (n) => n.tag === 'button' && n.attrs['data-testid'] === 'user-menu-button');
  // With the core down the footer aux holds Connection settings, so pw's own end padding applies; a healthy core leaves
  // the aux empty and desktop-layout.css's unlayered .df-footer-row:has(.df-footer-aux:empty) .df-user-menu-btn
  // (0,4,0) sets padding-inline-end for every variant alike.
  const host = sidebar({ connectionIssue: true });
  const btn = userButton(host);
  assert.equal(btn.attrs.class, official.replace('df-user-menu-btn', 'df-user-menu-btn account-button'), 'pw class for class (+ the host account-button hook)');
  removed('userMenu');
  const withIt = cascade({ on: ['userMenu'] }), shipped = cascade(), rootCause = cascade({ reset: 'unlayered' });
  const healthy = userButton(sidebar({}));
  for (const c of [withIt, shipped, rootCause]) {
    const r = resolve(c, healthy, 'padding-right');
    assert.equal(r.value, 'calc(var(--df-tray-caret-col) - 14px)'); assert.equal(r.from.sheet, 'public/assets/v1/shared-styles-Bl9zqrv-.css');
  }
  const atState = (c, property, state = []) => { clearState(host); if (state.length) setState(btn, state); return resolve(c, btn, property); };
  const utility = (r, value, name) => { assert.equal(r.value, value, `${name} → ${r.value} from ${where(r.from)}`); assert.equal(r.from.sheet, OFFICIAL); assert.equal(r.from.layer, 'utilities'); };
  const reset = (r, value, name) => { assert.equal(r.value, value, `old reset: ${name} ${r.value} from ${where(r.from)}`); assert.ok(isReset(r.from)); };
  // ps-[var(--df-row-px)], pe-2, text-start and hover:bg-[var(--df-hover)] (c6a992d55 @layer utilities) decide; the
  // restatement, put back, gives the same values; the old reset zeroed the padding and cleared the hover paint.
  utility(atState(shipped, 'padding-left'), 'var(--df-row-px)', 'ps-[var(--df-row-px)]');
  utility(atState(shipped, 'padding-right'), 'calc(var(--spacing) * 2)', 'pe-2');
  utility(atState(shipped, 'text-align'), 'start', 'text-start');
  utility(atState(shipped, 'background-color', ['hover']), 'var(--df-hover)', 'hover:bg');
  assert.equal(atState(shipped, 'background-color').value, 'transparent', 'at rest the layered reset still clears the paint');
  assert.match(atState(withIt, 'padding-left').value, /var\(--df-row-px\)/); assert.match(atState(withIt, 'padding-right').value, /^padding\(0 8px /);
  assert.equal(atState(withIt, 'background-color', ['hover']).value, 'var(--df-hover)');
  reset(atState(rootCause, 'padding-left'), '0px', 'padding-left');
  reset(atState(rootCause, 'padding-right'), '0px', 'padding-right');
  reset(atState(rootCause, 'background-color', ['hover']), 'transparent', 'hover background');
  // outline-none was never blocked (the old reset sets no outline): the :focus-visible restatement was always moot.
  for (const c of [withIt, shipped, rootCause]) assert.equal(atState(c, 'outline-style', ['focus-visible']).value, 'none');
  assert.equal(atState(shipped, 'outline-style', ['focus-visible']).from.layer, 'utilities');
  // Why the class string had to change with it: the host's old physical pl-[var(--df-row-px)] is compiled only inside
  // current-chat/layout.css's Chat @scope, so without the restatement it gives no start padding on the Code side.
  btn.attrs.class = btn.attrs.class.replace('ps-[var(--df-row-px)] pe-2 text-start', 'pl-[var(--df-row-px)] pr-2 text-left');
  const pl = atState(shipped, 'padding-left');
  assert.equal(pl.value, '0px'); assert.equal(pl.from.sheet, 'src/style.css'); assert.equal(pl.from.layer, 'base');
  assert.ok(declarations(shipped, btn, 'padding-left').every((d) => !d.sheet.includes('current-chat') || d.rule.scopes.length), 'the Chat copy is @scope-d away');
  btn.attrs.class = official.replace('df-user-menu-btn', 'df-user-menu-btn account-button');
  clearState(host);
});

// ---- source-code-start.css -------------------------------------------------------------------------------------------

test('source-code-start.css: the start card\'s official rows, in the card and in a rest row\'s popover, need no revert-layer release', async (t) => {
  const View = await server.ssrLoadModule('/src/generated/code-start/view.mjs');
  const Adapters = await server.ssrLoadModule('/src/source-code-start-adapters.jsx');
  const environments = ['A', 'B', 'C'].map((id) => ({ id, name: `Repo ${id}`, icon: 'Laptop', where: { kind: 'path', text: `~/work/${id}` } }));
  const tasks = { settled: true, items: [1, 2, 3].map((i) => ({ id: `t${i}`, title: `Task ${i}`, prompt: `do ${i}`, cwd: '/Users/me/repo' })), onStart: () => null, onDelete: noop, onDeleteAll: noop };
  const waiting = (id, title) => ({ id, type: 'local', isSsh: false, title, ask: 'question', stamp: '1' });
  const markup = renderToStaticMarkup(React.createElement(Adapters.StartHostContext.Provider, { value: { sessions: [waiting('a', 'Alpha')], settled: true, splitPane: false, onOpenSession: noop } },
    React.createElement(View.StartCard, { ready: true, environments, selectedId: 'A', setupRows: [{ card: { id: 'worktree-apart', folder: '/r', taken: false }, onPress: noop }],
      openingKey: 'test', onSelect: noop, onChoose: noop, chooseOpen: false, tasks })));
  // The local transcript scrollport the start slot mounts in (source-code-start.css selectors).
  const host = mount(markup, { class: 'source-chat-tile-content', 'data-surface': 'code', 'data-home': '' }, 'source-transcript-content', 'welcome', 'oc-start-slot');
  const card = find(host, (n) => n.attrs['data-testid'] === 'epitaxy-start-card');
  assert.ok(card);
  const rows = all(card, (n) => n.tag === 'button' && n.attrs['data-testid']);
  assert.ok(rows.length >= 4, `start card rows: ${rows.map((n) => n.attrs['data-testid']).join(', ')}`);
  // A rest row's popover lists the same t3 rows (i6 with listed: the title text and the dismiss differ, not the
  // classes), portaled: SourcePopover's DOM with a6's popup classes.
  const list = portal(markup, { class: 'sp-portal cds-root', 'data-cds-portal': '', 'data-density': 'compact' }, 'sp-positioner',
    { role: 'dialog', 'data-cds': 'Popover', 'data-cds-overlay': '', 'data-open': '', class: 'sp-popup cds-reset rounded-card shadow-panel epitaxy-root break-words max-w-[min(26rem,90vw)] min-w-(--anchor-width) oc-start-popup' },
    { 'data-cds-popover-body': '', 'data-cds-sheet-scroll': '', 'data-padding': 'none', class: 'sp-body' }, { tag: 'ul', role: 'list', class: 'flex flex-col gap-0.5 p-1' });
  const listed = all(list, (n) => n.tag === 'button' && n.attrs['data-testid']);
  const props = ['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'background-color'];
  report(t, 'start card', threeWay({ nodes: rows, names: ['startRows'], states: [[], ['hover']], properties: props }));
  report(t, 'rest popover', threeWay({ nodes: listed, names: ['startRows'], states: [[], ['hover']], properties: props }));
  // Not D26: .sp-popup's own unlayered max-width (SourcePopover) still beats a6's max-w-[min(26rem,90vw)] on the rest
  // popover, with either reset, so that release stays.
  const popup = mount('<div class="sp-popup oc-start-popup max-w-[min(26rem,90vw)] min-w-(--anchor-width)"></div>').children[0];
  const dropMax = { 'src/source-code-start.css': ['.sp-popup.oc-start-popup { max-width: revert-layer; }\n'] };
  assert.equal(resolve(cascade(), popup, 'max-width').from.sheet, OFFICIAL);
  for (const reset of ['layered', 'unlayered']) assert.equal(resolve(cascade({ reset, drop: dropMax }), popup, 'max-width').from.sheet, 'src/source-popover.css');
});

// ---- source-composer.css ---------------------------------------------------------------------------------------------

test('source-composer.css: the Send cell, the environment-bar chips and the environment-menu row actions need no revert-layer release', async (t) => {
  const C = await server.ssrLoadModule('/src/source-composer.jsx');
  const markup = renderToStaticMarkup(React.createElement(C.SourceComposer, { draft: 'hello', setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false,
    permission: 'auto', model: { model: 'fixture', displayName: 'Fixture', supportedReasoningEfforts: [{ reasoningEffort: 'low' }, { reasoningEffort: 'high' }] },
    effort: 'high', workdir: '/tmp/fixture/project', showContext: true, environmentMenu: true }));
  const host = mount(markup);
  const official = all(host, (n) => n.tag === 'button' && n.attrs['data-cds'] === 'Button' && !hasClass(n, 'sc-button'));
  const send = official.find((n) => n.attrs['data-testid'] === 'code-prompt-send');
  const bar = find(host, (m) => m.attrs['data-testid'] === 'epitaxy-environment-bar');
  const chips = official.filter((n) => bar && find(bar, (x) => x === n));
  assert.ok(send, 'presets Send cell'); assert.ok(chips.length >= 2, 'environment bar chips');
  report(t, 'Send cell + environment bar', threeWay({ nodes: [send, ...chips], names: ['composerSend', 'composerEnvBar'], states: [[], ['hover']] }));
  // tX / zK row actions inside a .source-env-menu-row (SourceLocalEnvironmentMenu renders SourceMenu.Item on its own).
  withDocument(t);
  const { SourceLocalEnvironmentMenu } = await server.ssrLoadModule('/src/source-environment-menu.jsx');
  const menu = mount(renderToStaticMarkup(SourceLocalEnvironmentMenu({ onOpenSettings: noop })), { class: 'smenu-popup cds-root', role: 'menu' });
  const row = find(menu, (n) => hasClass(n, 'source-env-menu-row'));
  const actions = all(row, (n) => n.tag === 'button');
  assert.ok(actions.length >= 1, 'environment settings action');
  report(t, 'environment menu row', threeWay({ nodes: actions, names: ['composerEnvMenu'], states: [[], ['hover']], properties: RESET_PROPS.filter((p) => p !== 'cursor') }));
});

// ---- source-sidebar.css ----------------------------------------------------------------------------------------------

test('source-sidebar.css: the KT rows\' controls, the filter button and the folded family stub need no release or restatement', async (t) => {
  const { SourceSidebar } = await server.ssrLoadModule('/src/source-sidebar.jsx');
  const now = Math.floor(Date.now() / 1000);
  const thread = (id, fields = {}) => ({ id, name: `Session ${id}`, cwd: '/fixture/work', createdAt: now, updatedAt: now, ...fields });
  const markup = renderToStaticMarkup(React.createElement(SourceSidebar, {
    sessions: [thread('parent'), thread('child-a', { forkedFromId: 'parent' }), thread('child-b', { forkedFromId: 'parent' }), thread('solo')],
    knownFolders: ['/fixture/work'], sidebarPreferences: { groupBy: 'none', collapsedNested: ['parent'] }, onSessionAction: noop }));
  const host = mount(markup, 'desktop-app dframe-root');
  const rowControls = all(host, (n) => (n.tag === 'button' || n.tag === 'input') && (() => { for (let p = n.parent; p; p = p.parent) if (hasClass(p, 'source-current-session-host')) return true; return false; })());
  const filter = all(host, (n) => n.tag === 'button' && hasClass(n, 'source-current-filter-button'));
  const stub = all(host, (n) => n.tag === 'button' && hasClass(n, 'df-family-stub'));
  assert.ok(rowControls.length >= 2, `row controls: ${rowControls.length}`); assert.equal(filter.length, 1, 'filter button'); assert.equal(stub.length, 1, 'family stub');
  report(t, 'KT rows + filter', threeWay({ nodes: [...rowControls, ...filter], names: ['sidebarRows'], states: [[], ['hover']], everyNode: false }));
  // g$'s own ps-/pe-/text-[length:var(--df-group-font)]/text-secondary/hover:text-primary give what the restatement did.
  report(t, 'family stub', threeWay({ nodes: stub, names: ['familyStub'], states: [[], ['hover']], properties: ['font-size', 'color', 'padding-left', 'padding-right'] }));
  const shipped = cascade();
  clearState(stub[0]);
  for (const [property, value] of [['color', 'var(--cds-text-secondary)'], ['font-size', 'var(--df-group-font)'], ['padding-right', 'var(--df-row-px)']]) {
    const r = resolve(shipped, stub[0], property);
    assert.equal(r.value, value, `${property} → ${where(r.from)}`); assert.equal(r.from.layer, 'utilities');
  }
  setState(stub[0], ['hover']); assert.equal(resolve(shipped, stub[0], 'color').value, 'var(--cds-text-primary)'); clearState(stub[0]);
});

// ---- source-file-viewer.css ------------------------------------------------------------------------------------------

test('source-file-viewer.css: the breadcrumb\'s official buttons need no revert-layer release', async (t) => {
  const { SourceFileBreadcrumb } = await server.ssrLoadModule('/src/source-file-breadcrumb.jsx');
  const lister = { root: '/repo', list: async () => [], onOpenFile() {} };
  const segmentMenu = { entries: (target) => [{ kind: 'item', action: 'copy', label: 'Copy', value: target.path }], select() {} };
  const nodes = [];
  for (const props of [{ displayPath: '/repo/src/a.js', fullPath: '/repo/src/a.js', lister, segmentMenu }, { displayPath: 'src/a.js', fullPath: '/repo/src/a.js', onCopyPath() {} }]) {
    const html = renderToStaticMarkup(React.createElement(SourceFileBreadcrumb, props));
    // source-file-viewer.jsx: .source-file-view > .epitaxy-panel-subheader.sfv-subheader > the breadcrumb.
    const host = mount(html, { class: 'source-file-view', 'data-file-state': 'text' }, 'epitaxy-panel-subheader sfv-subheader');
    nodes.push(...all(host, (n) => n.tag === 'button'));
  }
  assert.ok(nodes.length >= 3, `breadcrumb buttons: ${nodes.length}`);
  report(t, 'breadcrumb', threeWay({ nodes, names: ['breadcrumb'], states: [[], ['hover']], everyNode: false }));
});

// ---- source-sessions-page.css ----------------------------------------------------------------------------------------

test('source-sessions-page.css: the original page\'s controls need no revert-layer release (the :focus outline one is not D26 and stays)', async (t) => {
  const Host = await server.ssrLoadModule('/src/source-sessions-page.jsx');
  const now = Date.now();
  const sessions = [{ id: 'live', name: 'Live task', updatedAtMs: now }, { id: 'old', name: 'Old task', updatedAtMs: now - 1000 }];
  const host = mount(renderToStaticMarkup(React.createElement(Host.SourceSessionsPage, { sessions })), 'desktop-app dframe-root');
  const controls = all(host, (n) => ['button', 'input', 'textarea', 'select'].includes(n.tag));
  assert.ok(controls.length >= 3, `page controls: ${controls.length}`);
  report(t, 'sessions page', threeWay({ nodes: controls, names: ['sessionsPage'], states: [[], ['hover']], everyNode: false }));
  // The remaining release hands focused fields back from the unlayered input:focus { outline: none } (not D26).
  assert.match(read('src/source-sessions-page.css'), /\.source-sessions-page :is\(input,textarea\):focus \{ outline: revert-layer; \}/);
});

// ---- source-view-tabs.css --------------------------------------------------------------------------------------------

test('source-view-tabs.css: the original tab bar\'s buttons need no revert-layer release', async (t) => {
  withDocument(t);
  const Host = await server.ssrLoadModule('/src/source-view-tabs.jsx');
  const html = renderToStaticMarkup(React.createElement(Host.SourceViewTabBar, { tabs: [{ id: 'a', label: 'A', closable: true }, { id: 'b', label: 'B', closable: false }],
    activeId: 'a', onActivate: noop, onClose: noop, 'aria-label': 'Side chat tabs' }));
  const host = mount(html, 'desktop-app dframe-root');
  const buttons = all(host, (n) => n.tag === 'button');
  // The tabs are role=tab elements, not buttons; the buttons are the closable tab's Close (and any overflow control).
  assert.ok(buttons.length >= 1, `tab buttons: ${buttons.length}`);
  report(t, 'view tabs', threeWay({ nodes: buttons, names: ['viewTabs'], states: [[], ['hover']], everyNode: false }));
});

// ---- source-saved-environment-dialog.css -----------------------------------------------------------------------------

test('source-saved-environment-dialog.css: the original TextInputs and CDS Buttons need no font/colour/box release (the host-primitive ones stay)', async (t) => {
  withDocument(t);
  const { SourceSavedEnvironmentDialog: Dialog } = await server.ssrLoadModule('/src/source-saved-environment-dialog.jsx');
  const record = { id: 'dev', name: 'Dev', target: { kind: 'local', cwd: '/work/app', additionalFolders: ['/work/shared'] }, createdAt: 1, lastUsedAt: 0, settings: { worktree: true, branch: 'main' } };
  let dialogProps;
  function Form() {
    const tree = Dialog({ editing: record, environments: [], call: async () => ({}), onSave: noop, onClose: noop });
    const dialog = tree.props.children[0];
    dialogProps = dialog.props;
    return React.createElement(React.Fragment, null, dialog.props.children);
  }
  const html = renderToStaticMarkup(React.createElement(Form));
  // SourceDialog's portal: .sdlg-portal > .sdlg-backdrop > section.sdlg-popup.saved-environment-dialog.
  const body = portal(html, { class: 'sdlg-portal cds-root', 'data-cds-portal': '', 'data-density': 'comfortable' }, { class: 'sdlg-backdrop', role: 'presentation' },
    { tag: 'section', role: 'dialog', 'aria-modal': 'true', 'data-cds': 'Dialog', 'data-dialog-size': 'md', 'data-open': '', class: `sdlg-popup cds-reset ${dialogProps.className}` });
  const inputs = all(body, (n) => n.tag === 'input' && n.attrs['data-cds'] === 'TextInput');
  const cds = all(body, (n) => n.tag === 'button' && n.attrs['data-cds'] === 'Button' && !hasClass(n, 'source-settings-button'));
  assert.ok(inputs.length >= 1, `TextInputs: ${inputs.length}`); assert.ok(cds.length >= 1, `CDS Buttons: ${cds.length}`);
  report(t, 'dialog TextInput', threeWay({ nodes: inputs, names: ['savedEnvInput'], properties: ['font-family', 'font-size', 'font-weight', 'line-height', 'color'], everyNode: false }));
  report(t, 'dialog CDS Buttons', threeWay({ nodes: cds, names: ['savedEnvButton'], states: [[], ['hover']], everyNode: false }));
  // The branch picker's search field (SearchablePopupOpen's header, the original tx) in its SourceMenu.Popup.
  const Folder = await server.ssrLoadModule('/src/source-environment-folder-adapters.jsx');
  let popupProps;
  function Branch() {
    const popup = Folder.SearchablePopupOpen({ menu: { triggerRef: { current: null }, popupId: 'branch', setOpen: noop }, children: () => null, searchLabel: 'Search branches' });
    popupProps = popup.props;
    return popup.props.header;
  }
  const header = renderToStaticMarkup(React.createElement(Branch));
  const frame = portal(header, { class: 'smenu-portal cds-root', 'data-cds-portal': '', 'data-density': 'compact' }, 'smenu-positioner',
    { role: 'menu', 'data-open': '', 'data-menu-depth': '0', class: `smenu-popup cds-reset rounded-card shadow-panel ${popupProps.className}` }, 'smenu-frame', 'smenu-frame-header');
  const search = all(frame, (n) => n.tag === 'input');
  assert.equal(search.length, 1, 'branch search field');
  report(t, 'branch search field', threeWay({ nodes: search, names: ['savedEnvBranchInput'], properties: ['font-family', 'font-size', 'font-weight', 'line-height', 'color'] }));
  // Not D26: SourceSettingsButton's own unlayered colour (source-settings-button.css) still needs the text-danger /
  // text-secondary releases, and the min/max width ones are SourceMenu.Popup / SourceDialog sizes.
  const css = read('src/source-saved-environment-dialog.css');
  for (const keep of ['.saved-environment-dialog .source-settings-button.text-danger { color: revert-layer; }', '.saved-environment-dialog .source-settings-button.text-secondary { color: revert-layer; }',
    '.smenu-popup.saved-environment-branch-popup { min-width: revert-layer; max-width: revert-layer; }', '.saved-environment-dialog { max-height: revert-layer; }']) assert.ok(css.includes(keep), keep);
});

// ---- not D26: source-turn-error.css ----------------------------------------------------------------------------------

test('source-turn-error.css: the .ste-dismiss colour rules are still needed — SourceSettingsButton\'s own unlayered colour, not the reset, beats text-muted', async () => {
  const E = await server.ssrLoadModule('/src/source-turn-error.jsx');
  const html = renderToStaticMarkup(React.createElement(E.SourceTurnError, { error: { message: 'x' }, turnId: 't', onDismiss: noop }));
  const host = mount(html, 'source-transcript-content');
  const dismiss = find(host, (n) => n.tag === 'button' && n.attrs['aria-label'] === 'Dismiss');
  assert.ok(dismiss && hasClass(dismiss, 'source-settings-button') && hasClass(dismiss, 'text-muted') && hasClass(dismiss, 'hover:text-primary'));
  const css = read('src/source-turn-error.css');
  const RULES = ['.ste-dismiss .source-settings-button[data-cds=Button] { color: var(--cds-text-muted); }\n', '.ste-dismiss .source-settings-button[data-cds=Button]:hover { color: var(--cds-text-primary); }\n'];
  for (const rule of RULES) assert.ok(css.includes(rule), rule);
  const shipped = cascade();
  for (const [state, want] of [[[], 'var(--cds-text-muted)'], [['hover'], 'var(--cds-text-primary)']]) {
    clearState(dismiss); if (state.length) setState(dismiss, state);
    const r = resolve(shipped, dismiss, 'color');
    assert.equal(r.value, want); assert.equal(r.from.sheet, 'src/source-turn-error.css');
  }
  // Without them, over either reset, the settings button's unlayered (0,2,0) colour decides: the cause is the host
  // primitive (source-settings-button.css), which D26 does not touch.
  for (const reset of ['layered', 'unlayered']) {
    clearState(dismiss);
    const r = resolve(cascade({ reset, drop: { 'src/source-turn-error.css': RULES } }), dismiss, 'color');
    assert.equal(r.value, 'var(--cds-text-primary)'); assert.equal(r.from.sheet, 'src/source-settings-button.css'); assert.equal(r.from.layer, null);
  }
  clearState(dismiss);
});

// ---- hand-written host controls ---------------------------------------------------------------------------------------

// Every intrinsic <button>/<input>/<textarea>/<select> in the host's own JSX (src/, generated code excluded) with its
// static class tokens (string literals and template parts of className, all branches) and static string attributes.
function hostControls() {
  const out = [], skipped = [];
  const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === 'generated' ? [] : files(path.join(dir, e.name)))
    : /\.(jsx|js|mjs)$/.test(e.name) ? [path.join(dir, e.name)] : []);
  const strings = (node, acc = []) => {
    if (!node || typeof node !== 'object') return acc;
    if (node.type === 'Literal' && typeof node.value === 'string') acc.push(node.value);
    if (node.type === 'TemplateLiteral') for (const q of node.quasis) acc.push(q.value.cooked ?? q.value.raw);
    for (const key of Object.keys(node)) { const v = node[key]; if (Array.isArray(v)) v.forEach((x) => strings(x, acc)); else if (v && typeof v === 'object' && typeof v.type === 'string') strings(v, acc); }
    return acc;
  };
  for (const file of files(path.join(ROOT, 'src'))) {
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes('<')) continue;
    let program;
    try { program = parseAst(text, { lang: file.endsWith('.jsx') ? 'jsx' : 'js' }, file); } catch { skipped.push(path.relative(ROOT, file)); continue; }
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'JSXOpeningElement' && node.name.type === 'JSXIdentifier' && ['button', 'input', 'textarea', 'select'].includes(node.name.name)) {
        const attrs = {}; let classes = [], disabled = false, spread = false;
        for (const a of node.attributes) {
          if (a.type === 'JSXSpreadAttribute') { spread = true; continue; }
          const name = a.name.name;
          if (name === 'className') { classes = strings(a.value).flatMap((s) => s.split(/\s+/)).filter(Boolean); continue; }
          if (name === 'disabled') { disabled = !(a.value?.type === 'JSXExpressionContainer' && a.value.expression.type === 'Literal' && a.value.expression.value === false); continue; }
          if (a.value?.type === 'Literal' && typeof a.value.value === 'string') attrs[name] = a.value.value;
        }
        out.push({ tag: node.name.name, at: `${path.relative(ROOT, file)}:${text.slice(0, node.start).split('\n').length}`, classes: [...new Set(classes)], attrs, canDisable: disabled || spread });
      }
      for (const key of Object.keys(node)) { const v = node[key]; if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === 'object' && typeof v.type === 'string') visit(v); }
    };
    visit(program);
  }
  return { controls: out, skipped };
}
const controlNode = (control, disabled) => {
  const node = element(control.tag, { ...control.attrs, ...(control.classes.length ? { class: control.classes.join(' ') } : {}), ...(disabled ? { disabled: '' } : {}) });
  page(node);
  return node;
};
let scan;
const controls = () => (scan ??= hostControls());

test('hand-written host controls keep their disabled colour: the keep rule covers every button whose own colour lost to the old button:disabled', (t) => {
  const { controls: list, skipped } = controls();
  if (skipped.length) t.diagnostic(`unparsed (mid-edit?) files skipped: ${skipped.join(', ')}`);
  const buttons = list.filter((c) => c.tag === 'button' && c.canDisable);
  assert.ok(buttons.length > 50, `${buttons.length} disableable host buttons`);
  const old = cascade({ reset: 'unlayered' }), shipped = cascade(), nokeep = cascade({ reset: 'nokeep' });
  const needed = new Set();
  for (const control of buttons) {
    const node = controlNode(control, true);
    const a = computed(old, node, 'color'), b = computed(shipped, node, 'color');
    assert.equal(b.value, a.value, `${control.at} <button class="${control.classes.join(' ')}" disabled>: ${b.value} from ${where(b.from)}, was ${a.value} from ${where(a.from)}`);
    if (computed(nokeep, node, 'color').value !== a.value) needed.add(control.classes.find((name) => keepClasses.includes(name)) ?? `${control.at} (no keep class)`);
  }
  // Ancestor-scoped (0,1,1) colour rules (`.x button`, `.x > button`) in sheets the bundle orders before style.css lost
  // to button:disabled on order alone.
  const order = bundleOrder(ROOT), styleAt = order.indexOf('src/style.css');
  const scoped = [];
  for (const rule of old.rules) {
    // (revert-layer releases of official elements excluded: those hand the colour to the official layers on purpose.)
    if (!rule.sheet.startsWith('src/') || rule.layer.length || order.indexOf(rule.sheet) >= styleAt
      || !rule.decls.some((d) => d.property === 'color' && !JSON.stringify(d.raw).includes('revert-layer'))) continue;
    for (const sel of rule.selectors) {
      if (sel.length !== 3 || !['class', 'attribute'].includes(sel[0].type) || sel[1].type !== 'combinator' || sel[2].type !== 'type' || sel[2].name !== 'button') continue;
      const node = element('button', { type: 'button', disabled: '' });
      const name = sel[0].type === 'class' ? `.${sel[0].name}` : `[${sel[0].name}]`;
      page(element('div', sel[0].type === 'class' ? { class: sel[0].name } : { [sel[0].name]: sel[0].operation?.value ?? '' }, [node]));
      const a = computed(old, node, 'color'), b = computed(shipped, node, 'color');
      if (a.from?.sheet === 'src/style.css') scoped.push(`${name}${sel[1].value === 'child' ? ' >' : ''}`);
      assert.equal(b.value, a.value, `${rule.sheet}:${rule.line} ${name} button[disabled]: ${b.value} from ${where(b.from)}, was ${a.value}`);
    }
  }
  for (const name of needed) assert.ok(keepClasses.includes(name), `the keep rule must list ${name}`);
  t.diagnostic(`keep rule: ${keepClasses.length} classes (${[...needed].length} needed at root); ancestor rules kept: ${scoped.join(', ')}`);
  const stale = keepClasses.filter((name) => !needed.has(name));
  if (stale.length) t.diagnostic(`keep-rule classes no host button needs any more (safe to drop): ${stale.join(', ')}`);
});
test('hand-written host controls: apart from the kept disabled colour, a property only changes where an official class on the control itself now applies', (t) => {
  const old = cascade({ reset: 'unlayered' }), shipped = cascade();
  const changed = [];
  const keyOf = (sel) => { let i = sel.length; while (i > 0 && sel[i - 1].type !== 'combinator') i--; return sel.slice(i).find((c) => c.type === 'class')?.name; };
  for (const control of controls().controls) {
    for (const disabled of control.canDisable ? [false, true] : [false]) {
      const node = controlNode(control, disabled);
      for (const property of RESET_PROPS) {
        const a = computed(old, node, property), b = computed(shipped, node, property);
        if (effective(property, a.value) === effective(property, b.value)) continue;
        const from = b.from;
        assert.ok(from && from.sheet.startsWith('public/') && from.layer, `${control.at} ${property}: ${a.value} → ${b.value} from ${where(from)} (only an official layered class may newly win)`);
        const own = from.rule.selectors.map(keyOf).filter(Boolean).filter((name) => control.classes.includes(name));
        assert.ok(own.length, `${control.at} ${property}: the winning official rule targets a class on the control (${from.rule.selectors.map(keyOf)})`);
        changed.push(`${control.at} ${disabled ? '[disabled] ' : ''}${property}: ${a.value} → ${b.value} (.${own[0]})`);
      }
    }
  }
  t.diagnostic(`${changed.length} official-class wins on host controls:\n${changed.join('\n')}`);
});
