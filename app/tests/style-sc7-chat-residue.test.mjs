// R3-style SC-7 (research/style-compat.md §7): what the Code UI took from the 2.2553.1 chat extraction, and what is
// left of that question after W10 retired the 2.2553.1 chat outputs (w10-chat-gen / w10-chat-tests).
// 1. The terminal find bar renders the CDS TextInput by its view-tabs semantic name CdsTextInput, as the official
//    terminal find does: 2.42304.0 c6bf19e8f en (`ho as O`, shared-frame tx), now 3.6556.2 c6bf19e8f rn (`vs as v`,
//    shared-frame-6jtSkIit uC, className "w-48", Enter steps from the field's onKeyDown M). Not the 2.2553.1 chat Bh.
// 2. The native-field registry (source-field-adapters.jsx) imports no field family: each family registers its own
//    parts from its own module (code-current environment-field-controls; the 2.31226.0 current-chat family went with
//    w10-curchat-retire).
//    No host file imports a 2.2553.1 chat shared-frame any more (the chat field family, Bh and $v went with chat:M12).
// 3. The compatibility layer: once recomputed from the current tree no rule keeps a hit in src/generated/chat/
//    (.pr-0 was held only by chat Bh).
// Source, SSR, controlled events through a hook dispatcher and a stylesheet cascade only: no browser or pixels.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parseAst } from 'rolldown/parseAst';
import { appSheets, computed, element, append, find, loadCascade, parseMarkup } from './fixtures/transcript-css-cascade.mjs';
import { prepareStyleCompatibility, selectorClasses } from '../scripts/prepare-style-compatibility.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL = path.join(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const OFFICIAL_V3 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const official = name => fs.readFileSync(path.join(OFFICIAL, name), 'utf8');
const officialV3 = name => fs.readFileSync(path.join(OFFICIAL_V3, name), 'utf8');
// 3.6556.2 c6bf19e8f rn: the find field element and the props it passes.
const RN_FIELD = /n\(v,\{(ref:t,value:y,onChange:j,onKeyDown:M,spellCheck:!1,autoComplete:"off","aria-label":F,placeholder:pe,fullWidth:!1,className:"w-48",slotEnd:me)\}\)/;
const VIEW_TABS_FRAME = 'src/generated/view-tabs/shared-frame-6jtSkIit.js';
const h = React.createElement;
const servers = [];
const vite = async () => {
  const server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  servers.push(server);
  return server;
};
let ssr, Find, ViewTabs, Env;
before(async () => {
  ssr = await vite();
  ({ SourceTerminalFind: Find } = await ssr.ssrLoadModule('/src/source-terminal-find.jsx'));
  ViewTabs = await ssr.ssrLoadModule(`/${VIEW_TABS_FRAME}`);
  Env = await ssr.ssrLoadModule('/src/generated/code-current/environment-field-controls.mjs');
});
after(async () => { for (const server of servers) await server.close(); });

// ---------------------------------------------------------------- one component's hooks, called directly
function elements(tree) {
  const out = [];
  const walk = node => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!React.isValidElement(node)) return;
    out.push(node);
    for (const value of Object.values(node.props)) if (value && typeof value === 'object') walk(value);
  };
  walk(tree);
  return out;
}
function callWithHooks(render, ...args) {
  const cells = []; let cursor = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const dispatcher = {
    useContext: context => context._currentValue,
    useState(value) { const index = cursor++; if (!cells[index]) cells[index] = { value: typeof value === 'function' ? value() : value }; return [cells[index].value, next => { cells[index].value = typeof next === 'function' ? next(cells[index].value) : next; }]; },
    useReducer(reducer, initial) { const [state, set] = dispatcher.useState(initial); return [state, action => set(previous => reducer(previous, action))]; },
    useRef(value) { const index = cursor++; if (!cells[index]) cells[index] = { value: { current: value } }; return cells[index].value; },
    useMemo(fn, deps) { const index = cursor++; if (!cells[index] || !same(cells[index].deps, deps)) cells[index] = { value: fn(), deps }; return cells[index].value; },
    useCallback(fn, deps) { return dispatcher.useMemo(() => fn, deps); },
    useId() { const index = cursor++; if (!cells[index]) cells[index] = { value: `id-${index}` }; return cells[index].value; },
    useEffect() { cursor++; }, useLayoutEffect() { cursor++; }, useInsertionEffect() { cursor++; }, useImperativeHandle() { cursor++; },
    useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
    useEffectEvent(fn) { return fn; },
  };
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, previous = internals.H;
  internals.H = withMemoCache(dispatcher);
  try { return render(...args); } finally { internals.H = previous; }
}
const findProps = { view: { current: null }, selectionSuppressed: { current: false }, onClose() {} };
// SourceTerminalFind's own tree (forwardRef render) and the TextInput element in it.
const findTree = (props = findProps) => callWithHooks(Find.render, props, null);
const findInput = tree => { const node = elements(tree).find(node => node.type === ViewTabs.CdsTextInput); assert.ok(node, 'the find bar renders view-tabs CdsTextInput'); return node; };
// uC's own tree: the native <input> is the `render` element of Base UI Field.Control.
const nativeInput = (props) => {
  const control = elements(callWithHooks(ViewTabs.CdsTextInput.render, props, null)).find(node => node.props.render?.type === 'input');
  assert.ok(control, 'uC renders its <input> through Field.Control render');
  return control.props.render;
};
const keyEvent = (key, value, extra = {}) => {
  const event = {
    key, repeat: false, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, defaultPrevented: false, stopped: false, immediate: false,
    currentTarget: { value }, nativeEvent: { key, isComposing: false, keyCode: key === 'Escape' ? 27 : 0, stopImmediatePropagation() { event.immediate = true; } },
    preventDefault() { event.defaultPrevented = true; }, stopPropagation() { event.stopped = true; }, isPropagationStopped() { return event.stopped; },
    ...extra,
  };
  return event;
};

// ---------------------------------------------------------------- stylesheets
const OFFICIAL_SHEETS = JSON.parse(read('public/style-compatibility.json')).currentStylesheets.map(sheet => `public/assets/v1/${sheet.file}`);
const sheetClasses = rel => {
  const out = new Set();
  for (const [, selector] of read(rel).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:^|[}{;])\s*([^{}@;][^{}]*?)\s*\{/g)) for (const name of selectorClasses(selector)) out.add(name);
  return out;
};
const officialClasses = new Set(OFFICIAL_SHEETS.flatMap(rel => [...sheetClasses(rel)]));
const legacyClasses = new Set(JSON.parse(read('public/style-compatibility.json')).rules.flatMap(rule => rule.references.map(ref => ref.className)));
const tokens = html => new Set([...html.matchAll(/\bclass="([^"]*)"/g)].flatMap(m => m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").split(/\s+/)).filter(Boolean));
const HTML_ATTRS = Object.fromEntries([...(/<html\b([^>]*)>/.exec(read('index.html'))[1]).matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
// SSR markup inside the terminal pane (source-terminal-pane.jsx: aside.stp-pane > div.stp-body > the find bar).
function mounted(markup) {
  const pane = element('aside', { class: 'source-file-panel detail-panel stp-pane' }), body = append(pane, element('div', { class: 'stp-body group/terminal' }));
  element('html', HTML_ATTRS, [element('body', {}, [element('div', { id: 'root' }, [pane])])]);
  for (const node of parseMarkup(markup)) append(body, node);
  return body;
}

// ---------------------------------------------------------------- 1. official facts
test('official 2.42304.0: the terminal find bar (c6bf19e8f en) renders shared-frame ho = tx; tx pads pe-md and clears on Escape only when clearable', () => {
  const terminal = official('c6bf19e8f-oq2b1_8O.js');
  const has = (re, what) => assert.ok(re.test(terminal), what);
  has(/import\{[^}]*\bho as O\b[^}]*\}from"\.\/shared-frame-BfjMqbuN\.js"/, 'en imports ho as O');
  has(/i\(O,\{ref:e,value:h,onChange:re,onKeyDown:ie,spellCheck:!1,autoComplete:"off","aria-label":l\.formatMessage\(\{defaultMessage:"Find in terminal",id:"58b3ZchvoL"\}\),placeholder:l\.formatMessage\(\{defaultMessage:"Find in terminal\\u2026",id:"5\/cV58WKEX"\}\),fullWidth:!1,className:"w-48",slotEnd:i\("span",\{"aria-live":"polite",className:"text-footnote whitespace-nowrap"/, 'en renders O with these props');
  // Escape closes the bar from the container's onKeyDown (ne), after the field has had it.
  has(/ne=u\(t=>\{t\.key==="Escape"&&!t\.nativeEvent\.isComposing\?\(t\.preventDefault\(\),t\.stopPropagation\(\),o\(\)\)/, 'en closes on Escape');
  const frame = official('shared-frame-BfjMqbuN.js');
  for (const feature of [/\btx as ho\b/, /[,;]tx=q\(\(\{className:e,size:t,fullWidth:n=!0,slotStart:r,slotEnd:i,clearable:a=!1,/,
    /I=ne&&P&&\(!M\|\|o!==void 0\)&&!_\.readOnly/, /let n=re\?ex:"pe-md"/]) assert.ok(feature.test(frame), `shared-frame-BfjMqbuN.js has ${feature}`);
});

test('official 3.6556.2: the terminal find bar (c6bf19e8f rn) renders shared-frame vs = uC with className w-48 and its own Enter handler; uC pads pe-md', () => {
  const terminal = officialV3('c6bf19e8f-CgQ1_Jhf.js');
  const has = (re, what) => assert.ok(re.test(terminal), what);
  has(/import\{[^}]*\bvs as v\b[^}]*\}from"\.\/shared-frame-6jtSkIit\.js"/, 'rn imports vs as v');
  has(RN_FIELD, 'rn renders v with these props');
  has(/f\.formatMessage\(\{defaultMessage:"Find in terminal",id:"58b3ZchvoL"\}\)/, 'aria-label copy');
  has(/f\.formatMessage\(\{defaultMessage:"Find in terminal\\u2026",id:"5\/cV58WKEX"\}\)/, 'placeholder copy');
  has(/n\("span",\{"aria-live":"polite",className:"text-footnote whitespace-nowrap",children:I\}\)/, 'the polite end slot');
  // M: Enter steps (Shift+Enter forwards) unless composing; A (the bar): Escape closes, its repeat swallowed (tn).
  has(/e\.key==="Enter"&&!e\.nativeEvent\.isComposing&&e\.keyCode!==229&&\(e\.preventDefault\(\),C\(e\.shiftKey\?"next":"previous"\)\)/, 'rn M');
  has(/e\.key==="Escape"&&!e\.nativeEvent\.isComposing\?\(e\.preventDefault\(\),e\.stopPropagation\(\),tn\("Escape",e\.currentTarget\)/, 'rn A closes on Escape');
  const frame = officialV3('shared-frame-6jtSkIit.js');
  for (const feature of [/\buC as vs\b/, /[,;]uC=X\(\(e,t\)=>\{let \$=J9\(100\)/, /let e=oe\?lC:"pe-md"/, /Q\("cds-input cds-reset",aC,"pe-md",/])
    assert.ok(feature.test(frame), `shared-frame-6jtSkIit.js has ${feature}`);
  // The view-tabs semantic name is that binding.
  const names = JSON.parse(read('src/generated/view-tabs/manifest.json')).publicNames;
  assert.deepEqual({ file: names.CdsTextInput.file, local: names.CdsTextInput.local, export: names.CdsTextInput.export }, { file: 'shared-frame-6jtSkIit.js', local: 'uC', export: 'vs' });
});

// ---------------------------------------------------------------- 2. host imports
const hostFiles = () => fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }).map(rel => `src/${rel.split(path.sep).join('/')}`)
  .filter(rel => /\.(jsx?|mjs)$/.test(rel) && !rel.startsWith('src/generated/'));
const importsOf = rel => {
  let program;
  try { program = parseAst(read(rel), { lang: rel.endsWith('.jsx') ? 'jsx' : 'js' }, rel); } catch { return []; }
  return program.body.filter(node => node.source && ['ImportDeclaration', 'ExportNamedDeclaration'].includes(node.type))
    .flatMap(node => (node.specifiers ?? []).map(s => ({ from: path.posix.normalize(path.posix.join(path.posix.dirname(rel), node.source.value)), name: (s.imported ?? s.local)?.name ?? s.local?.name })));
};
test('host: the terminal find and the field adapters take nothing from a chat shared-frame; no host file imports one', () => {
  // W7 (R6): through the view-tabs facade, no longer the 2.42304.0 shim file (retired in W7).
  assert.deepEqual(importsOf('src/source-terminal-find.jsx').filter(i => i.name === 'CdsTextInput'), [{ from: 'src/generated/view-tabs/index.js', name: 'CdsTextInput' }]);
  assert.equal(importsOf('src/source-terminal-find.jsx').some(i => i.from.startsWith('src/generated/chat/')), false);
  assert.equal(importsOf('src/source-field-adapters.jsx').some(i => i.from.startsWith('src/generated/')), false, 'the field registry imports no field family');
  // W10: the 2.2553.1 chat shared-frame (Bh, $v, the field family) is retired; its E34 legacy shim went with the
  // current-chat slice (w10-curchat-retire). No host module imports any chat shared-frame.
  assert.equal(fs.existsSync(path.join(ROOT, 'src/generated/chat/shared-frame-C_2npUJq.js')), false);
  const holders = hostFiles().filter(rel => importsOf(rel).some(i => /^src\/generated\/chat\/shared-frame-/.test(i.from)));
  assert.deepEqual(holders, []);
});

// ---------------------------------------------------------------- 3. SSR: the find bar's field is the official tx
test('SSR: the find bar field is uC — wrapper div[data-cds=TextInput] with pe-md and w-48 (not pr-md / pr-0), the polite end slot, the official rn props', () => {
  const html = renderToStaticMarkup(h(Find, findProps));
  const wrapper = /<div data-cds="TextInput"[^>]*>/.exec(html)?.[0];
  assert.ok(wrapper, html);
  const wrapperClasses = /class="([^"]*)"/.exec(wrapper)[1].split(/\s+/);
  for (const name of ['pe-md', 'inline-flex', 'w-48']) assert.ok(wrapperClasses.includes(name), name);
  for (const name of ['pr-md', 'pr-0', 'stp-find-input']) assert.ok(!wrapperClasses.includes(name), name);
  const input = /<input\b[^>]*>/.exec(html)[0];
  for (const attr of ['aria-label="Find in terminal"', 'placeholder="Find in terminal…"', 'spellCheck="false"', 'autoComplete="off"', 'value=""']) assert.ok(input.includes(attr), attr);
  assert.match(html, /<span data-cds-end-slot="" class="[^"]*"><span aria-live="polite" class="text-footnote whitespace-nowrap"><\/span><\/span>/);
  // The element the bar renders carries exactly the official rn props (ref, value, onChange, onKeyDown — Enter steps
  // from the field, rn M — spellCheck, autoComplete, aria-label, placeholder, fullWidth, className "w-48", slotEnd).
  const { props } = findInput(findTree());
  const officialKeys = RN_FIELD.exec(officialV3('c6bf19e8f-CgQ1_Jhf.js'))[1].split(/,(?=[\w"-]+:)/).map(pair => pair.split(':')[0].replace(/"/g, ''));
  assert.deepEqual(Object.keys(props).sort(), [...officialKeys].sort());
  assert.deepEqual([props.spellCheck, props.autoComplete, props.fullWidth, props.className, props.slotEnd.props['aria-live'], props.slotEnd.props.className], [false, 'off', false, 'w-48', 'polite', 'text-footnote whitespace-nowrap']);
  assert.equal(typeof props.onKeyDown, 'function');
});

test('stylesheets: every class uC gives the find field is in the official 3.6556.2 sheets and none needs the compatibility layer', () => {
  const props = findInput(findTree()).props;
  const uC = tokens(renderToStaticMarkup(h(ViewTabs.CdsTextInput, props)));
  assert.deepEqual([...uC].filter(name => !officialClasses.has(name)), []);
  assert.deepEqual([...uC].filter(name => legacyClasses.has(name)), []);
  assert.ok(uC.has('pe-md') && !uC.has('pr-md') && uC.has('w-48'));
  // In the renderer's cascade (index.html sheets + bundled src/*.css), the field's padding, box and width all come
  // from the official sheets' @layer utilities / components (the host .stp-find-input width rule is gone).
  const cascade = loadCascade(appSheets(ROOT));
  const body = mounted(renderToStaticMarkup(h(Find, findProps)));
  const wrapper = find(body.children, node => node.attrs['data-cds'] === 'TextInput');
  const field = find(wrapper.children, node => node.tag === 'input');
  const official = new Set(OFFICIAL_SHEETS);
  for (const [node, property] of [[wrapper, 'padding-right'], [wrapper, 'padding-left'], [wrapper, 'border-top-left-radius'], [wrapper, 'background-color'], [field, 'font-size'], [field, 'color'], [field, 'padding-left']]) {
    const { from, value } = computed(cascade, node, property);
    if (!from) continue; // initial / UA
    assert.ok(official.has(from.sheet) && from.layer, `${node.tag} ${property}: ${value} from ${from.sheet} ${from.layer ?? 'unlayered'}`);
  }
  assert.equal(computed(cascade, wrapper, 'padding-right').from.rule.selectors.length > 0, true);
  assert.match(computed(cascade, wrapper, 'padding-right').value, /--cds-pad-md|--spacing/);
  const width = computed(cascade, wrapper, 'width');
  assert.ok(official.has(width.from.sheet) && width.from.layer, `width ${width.value} from ${width.from.sheet}`);
});

// ---------------------------------------------------------------- 4. controlled events: Escape
test('Escape: the non-clearable uC lets it through and the bar closes; a clearable uC with a value consumes it to clear', () => {
  let closed = 0;
  const tree = findTree({ ...findProps, onClose() { closed++; } });
  const field = findInput(tree);
  const input = nativeInput(field.props);
  const event = keyEvent('Escape', 'needle');
  input.props.onKeyDown(event);
  assert.deepEqual([event.defaultPrevented, event.stopped, event.immediate], [false, false, false], 'uC does not intercept Escape without clearable');
  tree.props.onKeyDown(event); // bubbles to the bar (role=search)
  assert.equal(closed, 1);
  assert.equal(event.defaultPrevented && event.stopped, true);
  // IME composition: neither the field nor the bar acts.
  const composing = keyEvent('Escape', 'needle'); composing.nativeEvent.isComposing = true;
  input.props.onKeyDown(composing); tree.props.onKeyDown(composing);
  assert.deepEqual([closed, composing.defaultPrevented, composing.stopped], [1, false, false]);
  // Contrast (the case SC-7 had to rule out): clearable with a value and onClear swallows Escape and clears.
  let cleared = 0;
  const clearable = nativeInput({ ...field.props, value: 'needle', clearable: true, onClear() { cleared++; } });
  const swallowed = keyEvent('Escape', 'needle');
  clearable.props.onKeyDown(swallowed);
  assert.deepEqual([swallowed.defaultPrevented, swallowed.stopped, swallowed.immediate, cleared], [true, true, true, 1]);
});

// ---------------------------------------------------------------- 5. the native-field registry
// W10: the 2.2553.1 chat field family (shared-frame _y / vy / Sy) that hosted this check is retired; the NativeField-
// wired 3.6556.2 family code-current registers (environment-field-controls Jj / Yj) hosts it instead.
test('registry: the code-current TextInput (3.6556.2 uC) is EnvironmentTextInput (NativeField-wired); view-tabs CdsTextInput reads Base UI field context, so it is not a part', () => {
  const field = child => renderToStaticMarkup(h(Env.EnvironmentField, { disabled: true }, h(Env.EnvironmentLabel, null, 'Name'), child));
  const env = field(h(Env.EnvironmentTextInput, { value: '', onChange() {} }));
  const envInput = /<input\b[^>]*>/.exec(env)[0], envLabel = /<label\b[^>]*>/.exec(env)[0];
  assert.match(envInput, /disabled=""/);
  assert.equal(/\bid="([^"]*)"/.exec(envInput)[1], /\bfor="([^"]*)"/.exec(envLabel)[1]);
  assert.equal(/aria-labelledby="([^"]*)"/.exec(envInput)[1], /\bid="([^"]*)"/.exec(envLabel)[1]);
  // view-tabs tx inside the same host Field: the host context does not reach Base UI Field.Control.
  const cds = field(h(ViewTabs.CdsTextInput, { value: '', onChange() {} }));
  const cdsInput = /<input\b[^>]*>/.exec(cds)[0];
  assert.doesNotMatch(cdsInput, /disabled=""|aria-labelledby=/);
  assert.notEqual(/\bid="([^"]*)"/.exec(cdsInput)?.[1], /\bfor="([^"]*)"/.exec(/<label\b[^>]*>/.exec(cds)[0])[1]);
  assert.match(read('src/source-field-adapters.jsx'), /\['Field', 'Label', 'Description', 'ErrorText', 'TextInput', 'TextArea'\]\.map\(key => \[key, new Set\(\)\]\)/);
});

// ---------------------------------------------------------------- 6. the compatibility layer
// The published public/style-compatibility.json is regenerated by the gate only (R10); the dry run recomputes it from
// the current tree without writing, which is what the gate will publish.
test('compatibility layer: no rule keeps a hit in src/generated/chat/ (.pr-0 went with chat Bh); #54 stays retired', async () => {
  const { rules } = await prepareStyleCompatibility({ dryRun: true });
  const allHits = rules.flatMap(rule => rule.references).flatMap(ref => ref.hits.map(hit => ({ className: ref.className, ...hit })));
  const hits = name => allHits.filter(hit => hit.className === name).map(hit => `${hit.file}#${hit.binding}`);
  // 3.6556.2 ships after:border-alpha-1 again, so the layer no longer needs to hold it (it was for the retired
  // current-chat xf).
  assert.deepEqual(hits('after:border-alpha-1'), []);
  assert.deepEqual(hits('pr-0'), []);
  assert.deepEqual(allHits.filter(hit => hit.file.startsWith('src/generated/chat/')).map(hit => `${hit.className} ${hit.file}#${hit.binding}`), []);
  assert.equal(hits('has-[[data-cds-end-slot]_[data-cds=Button]:not([data-cds-ghost])]:pr-[calc((var(--cds-h-control)-var(--cds-h-control-nested))/2)]').every(hit => !hit.includes('view-tabs') && !hit.includes('code-current')), true);
});
