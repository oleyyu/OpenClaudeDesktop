// R3-style SC-7 (research/style-compat.md §7): what the Code UI still took from the 2.2553.1 chat extraction.
// 1. The terminal find bar renders the 2.42304.0 CDS TextInput (shared-frame tx, exported `ho`) by its view-tabs
//    semantic name CdsTextInput, as the official terminal find (c6bf19e8f en: `ho as O`) does, instead of chat Bh.
// 2. The native-field registry (source-field-adapters.jsx) no longer imports the chat field family: each family
//    registers its own parts from its own module. The old import closed a cycle with the chat shared-frame (which
//    imports the adapter module), so loading the shared-frame first left undefined in the registry — the three
//    source-field-render failures of the R3 baseline.
// 3. extract-chat-ui.mjs no longer forces in shared-14 Ga/qa (tv/ev: imported by nothing) and points the two
//    unreachable chat modules that rendered Bh (caaf77b85 w, cf35aed38 b) at view-tabs CdsTextInput.
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
import { selectorClasses } from '../scripts/prepare-style-compatibility.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL = path.join(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const OLD_CHAT = path.join(ROOT, '../reference/current-2.2553.1/ion-dist/assets/v1');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const official = name => fs.readFileSync(path.join(OFFICIAL, name), 'utf8');
const CHAT_FRAME = 'src/generated/chat/shared-frame-C_2npUJq.js';
const VIEW_TABS_FRAME = 'src/generated/view-tabs/shared-frame-BfjMqbuN.js';
const h = React.createElement;
const servers = [];
const vite = async () => {
  const server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  servers.push(server);
  return server;
};
let ssr, Find, ViewTabs, Chat, Env;
before(async () => {
  ssr = await vite();
  ({ SourceTerminalFind: Find } = await ssr.ssrLoadModule('/src/source-terminal-find.jsx'));
  ViewTabs = await ssr.ssrLoadModule(`/${VIEW_TABS_FRAME}`);
  Chat = await ssr.ssrLoadModule(`/${CHAT_FRAME}`);
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
  internals.H = dispatcher;
  try { return render(...args); } finally { internals.H = previous; }
}
const findProps = { view: { current: null }, selectionSuppressed: { current: false }, onClose() {} };
// SourceTerminalFind's own tree (forwardRef render) and the TextInput element in it.
const findTree = (props = findProps) => callWithHooks(Find.render, props, null);
const findInput = tree => { const node = elements(tree).find(node => node.type === ViewTabs.CdsTextInput); assert.ok(node, 'the find bar renders view-tabs CdsTextInput'); return node; };
// tx's own tree: the native <input> is the `render` element of Base UI Field.Control.
const nativeInput = (props) => {
  const control = elements(callWithHooks(ViewTabs.CdsTextInput.render, props, null)).find(node => node.props.render?.type === 'input');
  assert.ok(control, 'tx renders its <input> through Field.Control render');
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
  // The 2.2553.1 Bh it replaces: physical pr-0 / pr-md (compatibility rule #42 `.pr-0`).
  assert.ok(/a=n\?"pr-0":"pr-md"/.test(fs.readFileSync(path.join(OLD_CHAT, 'shared-frame-C_2npUJq.js'), 'utf8')), '2.2553.1 Bh pr-0/pr-md');
  const names = JSON.parse(read('src/generated/view-tabs/manifest.json')).publicNames;
  assert.deepEqual({ file: names.CdsTextInput.file, local: names.CdsTextInput.local, export: names.CdsTextInput.export }, { file: 'shared-frame-BfjMqbuN.js', local: 'tx', export: 'ho' });
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
test('host: the terminal find and the field adapters take nothing from the 2.2553.1 chat shared-frame; Bh is left to CsvTextInput alone', () => {
  assert.deepEqual(importsOf('src/source-terminal-find.jsx').filter(i => i.name === 'CdsTextInput'), [{ from: VIEW_TABS_FRAME, name: 'CdsTextInput' }]);
  assert.equal(importsOf('src/source-terminal-find.jsx').some(i => i.from.startsWith('src/generated/chat/')), false);
  assert.equal(importsOf('src/source-field-adapters.jsx').some(i => i.from.startsWith('src/generated/')), false, 'the field registry imports no field family');
  // Only R3-files' CsvTextInput (re-exported by R3-sections as SidebarSectionsInput) still renders Bh; when those
  // move to CdsTextInput, Bh keeps no host importer (diagnostic only: the list may shrink, never grow).
  const holders = hostFiles().filter(rel => importsOf(rel).some(i => i.from === CHAT_FRAME && i.name === 'Bh'));
  assert.deepEqual(holders.filter(rel => rel !== 'src/source-csv-adapters.jsx'), [], `new host importers of 2.2553.1 Bh: ${holders}`);
  if (!holders.length) console.log('# SC-7: no host module imports chat Bh any more; rule #42 (.pr-0) now rests on the chat field family (Sy) only');
});

// ---------------------------------------------------------------- 3. SSR: the find bar's field is the official tx
test('SSR: the find bar field is tx — wrapper div[data-cds=TextInput] with pe-md (not pr-md / pr-0), the polite end slot, the official props', () => {
  const html = renderToStaticMarkup(h(Find, findProps));
  const wrapper = /<div data-cds="TextInput"[^>]*>/.exec(html)?.[0];
  assert.ok(wrapper, html);
  const wrapperClasses = /class="([^"]*)"/.exec(wrapper)[1].split(/\s+/);
  for (const name of ['pe-md', 'inline-flex', 'stp-find-input']) assert.ok(wrapperClasses.includes(name), name);
  for (const name of ['pr-md', 'pr-0']) assert.ok(!wrapperClasses.includes(name), name);
  const input = /<input\b[^>]*>/.exec(html)[0];
  for (const attr of ['aria-label="Find in terminal"', 'placeholder="Find in terminal…"', 'spellCheck="false"', 'autoComplete="off"', 'value=""']) assert.ok(input.includes(attr), attr);
  assert.match(html, /<span data-cds-end-slot="" class="[^"]*"><span aria-live="polite" class="text-footnote whitespace-nowrap"><\/span><\/span>/);
  // The element the bar renders carries the official en props; only the width class is the host's (.stp-find-input
  // in source-terminal-pane.css = 12rem, the official w-48). en also passes onKeyDown (Enter steps): the host
  // handles Enter on the bar (terminalFindKey), R3-terminal's part.
  const { props } = findInput(findTree());
  assert.deepEqual(Object.keys(props).filter(key => key !== 'onChange').sort(), ['aria-label', 'autoComplete', 'className', 'fullWidth', 'placeholder', 'ref', 'slotEnd', 'spellCheck', 'value']);
  assert.deepEqual([props.spellCheck, props.autoComplete, props.fullWidth, props.className, props.slotEnd.props['aria-live'], props.slotEnd.props.className], [false, 'off', false, 'stp-find-input', 'polite', 'text-footnote whitespace-nowrap']);
  const asOfficial = renderToStaticMarkup(h(ViewTabs.CdsTextInput, { ...props, className: 'w-48' }));
  assert.equal(renderToStaticMarkup(h(ViewTabs.CdsTextInput, props)).replace('stp-find-input', 'w-48'), asOfficial);
});

test('stylesheets: every class tx gives the find field is in the official 2.42304.0 sheets and none needs the compatibility layer; Bh needed it', () => {
  const props = findInput(findTree()).props;
  const tx = tokens(renderToStaticMarkup(h(ViewTabs.CdsTextInput, { ...props, className: 'w-48' })));
  assert.deepEqual([...tx].filter(name => !officialClasses.has(name)), []);
  assert.deepEqual([...tx].filter(name => legacyClasses.has(name)), []);
  // The same props on chat Bh: its end-slot padding class is served only by public/assets/legacy-utilities.css (rule #56).
  const bh = tokens(renderToStaticMarkup(h(Chat.Bh, { ...props, className: 'w-48' })));
  assert.deepEqual([...bh].filter(name => legacyClasses.has(name)), ['has-[[data-cds-end-slot]_[data-cds=Button]:not([data-cds-ghost])]:pr-[calc((var(--cds-h-control)-var(--cds-h-control-nested))/2)]']);
  assert.ok(bh.has('pr-md') && !tx.has('pr-md') && tx.has('pe-md'));
  // In the renderer's cascade (index.html sheets + bundled src/*.css), the field's padding and box come from the
  // official sheets' @layer utilities / components; the host only sets the width (unlayered .stp-find-input).
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
  assert.equal(width.from.sheet, 'src/source-terminal-pane.css');
});

// ---------------------------------------------------------------- 4. controlled events: Escape
test('Escape: the non-clearable tx lets it through and the bar closes; a clearable tx with a value consumes it to clear', () => {
  let closed = 0;
  const tree = findTree({ ...findProps, onClose() { closed++; } });
  const field = findInput(tree);
  const input = nativeInput(field.props);
  const event = keyEvent('Escape', 'needle');
  input.props.onKeyDown(event);
  assert.deepEqual([event.defaultPrevented, event.stopped, event.immediate], [false, false, false], 'tx does not intercept Escape without clearable');
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
const renderTextField = Sy => renderToStaticMarkup(h(Sy, { label: 'Task name', hint: 'Use a unique name', id: 'task-name', value: 'x', onChange() {} }));
const linked = html => {
  const label = /<label\b[^>]*>/.exec(html)[0], input = /<input\b[^>]*>/.exec(html)[0];
  return { forId: /\bfor="([^"]*)"/.exec(label)?.[1], id: /\bid="([^"]*)"/.exec(input)?.[1], labelledby: /aria-labelledby="([^"]*)"/.exec(input)?.[1], labelId: /\bid="([^"]*)"/.exec(label)?.[1], describedby: /aria-describedby="([^"]*)"/.exec(input)?.[1] };
};
test('registry: the chat field family registers itself, so its TextField links label, input and hint whichever module loads first', async () => {
  const frame = read(CHAT_FRAME);
  assert.match(frame, /^import \{ registerNativeFieldComponents \} from "\.\.\/\.\.\/source-field-adapters\.jsx";$/m);
  assert.match(frame, /^registerNativeFieldComponents\(\{ Field: _y, Label: vy, Description: yy, ErrorText: by, TextInput: Bh, TextArea: \$v \}\);$/m);
  for (const order of [['/src/source-field-adapters.jsx', `/${CHAT_FRAME}`], [`/src/generated/current-chat/shared-frame-DVFSKIcx.js`, `/${CHAT_FRAME}`], [`/${CHAT_FRAME}`]]) {
    const server = await vite();
    let chat;
    for (const id of order) chat = await server.ssrLoadModule(id);
    const html = renderTextField(chat.Sy);
    const link = linked(html);
    assert.deepEqual([link.forId, link.id, link.labelledby], ['task-name', 'task-name', link.labelId], `${order.join(' then ')}: ${html}`);
    assert.ok(link.describedby && html.includes(`id="${link.describedby}"`), 'hint linked');
    await server.close(); servers.splice(servers.indexOf(server), 1);
  }
});

test('registry: the 2.42304.0 tx in it is EnvironmentTextInput (NativeField-wired); view-tabs CdsTextInput reads Base UI field context, so it is not a part', () => {
  const field = child => renderToStaticMarkup(h(Chat._y, { disabled: true }, h(Chat.vy, null, 'Name'), child));
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

// ---------------------------------------------------------------- 6. the chat extraction
test('extract-chat-ui: no dead shared-14 tv/ev, and no chat module imports Bh; the two unreachable renderers use view-tabs CdsTextInput', () => {
  const provenance = JSON.parse(read('src/generated/chat/provenance.json'));
  const entry = name => provenance.find(item => item.source === name);
  assert.equal(entry('shared-14-BOJVa-jT.js').declarations.some(name => name === 'tv' || name === 'ev'), false);
  assert.doesNotMatch(read('src/generated/chat/shared-14-BOJVa-jT.js'), /after:border-alpha-1/);
  for (const [file, local] of [['caaf77b85-DdXwb3ur.js', 'w'], ['cf35aed38-CgXOe11O.js', 'b']]) {
    assert.match(read(`src/generated/chat/${file}`), new RegExp(`^import \\{ CdsTextInput as ${local} \\} from "\\.\\./view-tabs/shared-frame-BfjMqbuN\\.js";$`, 'm'));
    assert.deepEqual(entry(file).boundaries.find(([name]) => name === local), [local, ['../view-tabs/shared-frame-BfjMqbuN.js', 'CdsTextInput']]);
    // and that local was this module's import of shared-frame Bh in the 2.2553.1 source
    const original = fs.readFileSync(path.join(OLD_CHAT, file), 'utf8');
    const exported = Object.entries(Object.fromEntries([...fs.readFileSync(path.join(OLD_CHAT, 'shared-frame-C_2npUJq.js'), 'utf8').matchAll(/(\w+|\$\w*) as ([\w$]+)/g)].map(m => [m[2], m[1]]))).filter(([, local]) => local === 'Bh').map(([name]) => name);
    assert.ok(exported.some(name => new RegExp(`import\\{[^}]*\\b${name.replace('$', '\\$')} as ${local}\\b[^}]*\\}from"\\./shared-frame-C_2npUJq\\.js"`).test(original)), `${file}:${local} imported Bh`);
  }
  const chatImportsOfBh = fs.readdirSync(path.join(ROOT, 'src/generated/chat')).filter(name => name.endsWith('.js'))
    .filter(name => /import \{ Bh as [\w$]+ \} from "\.\/shared-frame-C_2npUJq\.js"/.test(read(`src/generated/chat/${name}`)));
  assert.deepEqual(chatImportsOfBh, []);
  assert.deepEqual(entry('shared-frame-C_2npUJq.js').registrations, [{ call: 'registerNativeFieldComponents', from: '../../source-field-adapters.jsx', parts: { Field: '_y', Label: 'vy', Description: 'yy', ErrorText: 'by', TextInput: 'Bh', TextArea: '$v' } }]);
});

test('compatibility layer: #54 lost its chat hit (current-chat xf keeps it, SC-6); #42 .pr-0 is held only by chat Bh until CsvTextInput moves', () => {
  const rules = JSON.parse(read('public/style-compatibility.json')).rules;
  const hits = name => rules.flatMap(rule => rule.references).filter(ref => ref.className === name).flatMap(ref => ref.hits.map(hit => `${hit.file}#${hit.binding}`));
  assert.deepEqual(hits('after:border-alpha-1'), ['src/generated/current-chat/shared-9-CAAkBVM3.js#xf']);
  assert.deepEqual(hits('pr-0'), ['src/generated/chat/shared-frame-C_2npUJq.js#Bh']);
  assert.equal(hits('has-[[data-cds-end-slot]_[data-cds=Button]:not([data-cds-ghost])]:pr-[calc((var(--cds-h-control)-var(--cds-h-control-nested))/2)]').every(hit => !hit.includes('view-tabs') && !hit.includes('code-current')), true);
});
