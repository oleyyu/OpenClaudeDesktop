// R4f-rail SR-6 (2.42304.0): the Code titlebar's session rail toggle and its ⋮ fold, plus topbar-09 (pressed toggles).
//   cc43287c9 wW   places EH (generated session-rail-kit SessionRailToggle) at the head of the cluster, then TI
//                  (c467aa787 Q, a vertical rule), before the pane toggles; Te makes it foldable (en: maxHidden 7, the
//                  rail toggle folds first); ⋮ (c73f45bc3 Zh) holds its ref while folded and takes focus from it.
//   cf74bc599 tE   lists the folded toggle as ⋮'s first group (ListCard, Hide/Show session rail, onToggle).
//   topbar-09      a pressed ghost Button paints bg-accent under text-accent: pressedVariant "selected" is inert
//                  (fizzy-lake "color" is never allowed), so the local pressed toggles map to the same two utilities.
// SR-7 mounted the rail: main.jsx passes jre's railToggle while a Code session has a rail; without one the titlebar draws
// no toggle and ⋮ no row. R4f-rail fix: the lead's rail mode (c73f45bc3 w_: no origin glyph, no folder pill).
// Nothing here launches Electron or a browser; the fake DOM is tests/fixtures/preview-r3b-dom.mjs.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withPreviewDom, reactProps } from './fixtures/preview-r3b-dom.mjs';
import { appSheets, append, computed, element, find, loadCascade, parseMarkup, setState } from './fixtures/transcript-css-cascade.mjs';
import { TITLEBAR_RAIL_SEPARATOR, createRailFoldFocus, titlebarRailMenuItems, titlebarRailToggleFoldable } from '../src/titlebar-controls-model.mjs';
import { LEAD_NO_ORIGIN_CLASS } from '../src/generated/session-rail-kit/rail-column.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, name), 'utf8');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const pin = (text, needles, expected = 1) => { for (const needle of needles) assert.equal(count(text, needle), expected, needle); };
const h = React.createElement;
const UTILITIES = 'public/assets/v1/c6a992d55-sXiDGMFQ.css';

// The titlebar's fold measure (generated cd54a5401 un) needs a laid-out row; this server swaps only its hook for one
// the test drives (hiddenCount) and that records what the titlebar asks of it. titlebarFoldLimits (en) stays the
// generated original.
const FOLD = path.join(app, 'src/generated/code-current/titlebar-fold-measure.mjs');
const foldCalls = [];
let foldHidden = 0;
const foldTitleRef = () => {};
globalThis.__railToggleFold = (args) => { foldCalls.push(args); return { hiddenCount: foldHidden, pillsCompact: false, titleRef: foldTitleRef }; };
const foldStub = {
  name: 'titlebar-rail-toggle-fold-stub',
  enforce: 'pre',
  load(id) {
    const [file, query] = id.split('?');
    if (file !== FOLD) return null;
    if (query === 'real') return fs.readFileSync(FOLD, 'utf8');
    return 'export * from "/src/generated/code-current/titlebar-fold-measure.mjs?real";\n'
      + 'export function useTitlebarFold(args) { return globalThis.__railToggleFold(args); }\n';
  },
};

let server, T, Fold;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [foldStub, react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  T = await server.ssrLoadModule('/src/source-titlebar.jsx');
  Fold = await server.ssrLoadModule('/src/generated/code-current/titlebar-fold-measure.mjs');
});
after(async () => { await server?.close(); delete globalThis.__railToggleFold; });

const SESSION = { id: 'a', name: 'A title', cwd: '/tmp/work' };
const baseProps = { section: 'new', session: SESSION, onRename() {}, terminalAvailable: true, previewAvailable: true };
const model = (over = {}) => ({ onScreen: false, raises: false, panelId: 'rail-panel', onToggle() {}, ...over });
const renderTitlebar = (props = {}) => renderToStaticMarkup(h(T.SourceTitlebar, { ...baseProps, ...props }));
const trailingOf = (html) => html.slice(html.indexOf('st-trailing'));

// ---------------------------------------------------------------------------------------------------------------
test('official 2.42304.0: wW places EH + TI before the toggles, Te folds it into ⋮ first, tE lists it first', () => {
  const wW = official('cc43287c9-DAfOi8yP.js');
  pin(wW, [
    'Te=y!==void 0&&e!==null&&de.overflowMenuProps!==null&&!Ce',
    'ZR({rootRef:me,togglesRef:he,sampleRef:b,',
    'maxHidden:YR({railToggleFoldable:Te,hiddenCount:0}).maxHidden',
    '{railToggleFolded:De,hiddenMainPanes:q}=YR({railToggleFoldable:Te,hiddenCount:G})',
    'Oe=_(!1),ke=A(()=>{Oe.current=!0},[]);P(()=>{Oe.current&&(Oe.current=!1,De&&b?.current?.focus({preventScroll:!0}))},[De,y,b])',
    'y&&!De&&p(u,{children:[v(EH,{model:y,buttonRef:b,onUnmountFocused:ke,inert:!B}),re&&!_e&&v(TI,{})]}),re&&o&&v(OW,{agent:o}),v("div",{ref:he,inert:!B,className:"flex items-center gap-1 empty:hidden"',
    'railToggle:De?y:void 0,railToggleRef:De?b:void 0',
    // _e is only ever set under fizzy `panels` (off here), so TI follows EH whenever the cluster is mounted.
    'ls("panels")&&(_e=fe&&ge&&!w)',
    // jre: the model exists only while the rail is on (railMode), and its ref is shared with the overlay rail.
    'railToggle:on?bn:void 0,railToggleRef:mn',
    'import{o as TI}from"./c467aa787-B4L-l_bi.js"',
  ]);
  // TI is c467aa787 Q, a vertical rule (the chunk's other exports are the preview sketch toolbar's).
  const sketch = official('c467aa787-B4L-l_bi.js');
  pin(sketch, ['function Q(){return o("span",{role:"separator","aria-orientation":"vertical",className:"h-4 w-px shrink-0 bg-border"})}', 'Q as o']);
  assert.deepEqual(TITLEBAR_RAIL_SEPARATOR, { role: 'separator', 'aria-orientation': 'vertical', className: 'h-4 w-px shrink-0 bg-border' });
  for (const utility of ['.h-4{', '.w-px{', '.shrink-0{', '.bg-border{background-color:var(--cds-border)}']) assert.equal(count(read(UTILITIES), utility), 1, utility);
  // en (cd54a5401; generated titlebarFoldLimits): 7 with a foldable rail toggle, and the first fold takes it.
  const cd = official('cd54a5401-B0T2EyYD.js');
  pin(cd, ['function en({railToggleFoldable:e,hiddenCount:t}){let n=e&&t>0;return{maxHidden:e?7:6,railToggleFolded:n,hiddenMainPanes:n?t-1:t}}']);
  // Zh: the ⋮ trigger's ref callback also fills railToggleRef.
  const zh = official('c73f45bc3-CFrHin0p.js');
  pin(zh, ['te=y(e=>{ee.current=e,o&&(o.current=e)},[o])', 'c(K.Trigger,{render:c(un,{ref:te,']);
  // tE: the rail group, then the view items; XT(e, t) = e ? [t] : []; Oe = shared-1 Wn = "ListCard".
  const tE = official('cf74bc599-D9NZWRyl.js');
  pin(tE, [
    'k=XT(a,{icon:Oe,label:a?.onScreen?c.formatMessage({defaultMessage:"Hide session rail",id:"U0R7oYkTM1"}):c.formatMessage({defaultMessage:"Show session rail",id:"JYaBivMdHH"}),onSelect:a?.onToggle})',
    'children:[k.length>0&&u($T,{items:k,container:s}),d.length>0&&u($T,{items:d,container:s})',
    'function XT(e,t){return e?[t]:[]}',
    'Wn as Oe',
  ]);
  pin(official('shared-1-CAAiD7E3.js'), ['yL="ListCard"', 'yL as Wn']);
});

test('model: Te, tE\'s rail row and the fold focus hand-off', () => {
  // Te: a rail toggle on a titlebar that folds (a Code session's, where ⋮ is); nothing else.
  assert.equal(titlebarRailToggleFoldable({ foldable: true, railToggle: model() }), true);
  assert.equal(titlebarRailToggleFoldable({ foldable: true, railToggle: undefined }), false);
  assert.equal(titlebarRailToggleFoldable({ foldable: true, railToggle: null }), false);
  assert.equal(titlebarRailToggleFoldable({ foldable: false, railToggle: model() }), false);
  // en through the generated original: 6 → 7, and the first hidden step is the rail toggle.
  assert.deepEqual(Fold.titlebarFoldLimits({ railToggleFoldable: false, hiddenCount: 0 }), { maxHidden: 6, railToggleFolded: false, hiddenMainPanes: 0 });
  assert.deepEqual(Fold.titlebarFoldLimits({ railToggleFoldable: true, hiddenCount: 0 }), { maxHidden: 7, railToggleFolded: false, hiddenMainPanes: 0 });
  assert.deepEqual(Fold.titlebarFoldLimits({ railToggleFoldable: true, hiddenCount: 1 }), { maxHidden: 7, railToggleFolded: true, hiddenMainPanes: 0 });
  assert.deepEqual(Fold.titlebarFoldLimits({ railToggleFoldable: true, hiddenCount: 3 }), { maxHidden: 7, railToggleFolded: true, hiddenMainPanes: 2 });
  assert.deepEqual(Fold.titlebarFoldLimits({ railToggleFoldable: false, hiddenCount: 3 }), { maxHidden: 6, railToggleFolded: false, hiddenMainPanes: 3 });
  // tE k: none without a (folded) toggle; one unchecked ListCard row named for what it does next.
  assert.deepEqual(titlebarRailMenuItems(undefined), []);
  const onToggle = () => {};
  assert.deepEqual(titlebarRailMenuItems(model({ onToggle })), [{ icon: 'ListCard', label: 'Show session rail', onSelect: onToggle }]);
  assert.deepEqual(titlebarRailMenuItems(model({ onScreen: true, onToggle })), [{ icon: 'ListCard', label: 'Hide session rail', onSelect: onToggle }]);
  assert.equal('checked' in titlebarRailMenuItems(model())[0], false);
  // Oe / ke: only a toggle that unmounted with focus hands it on, only once, and only to a folded ⋮.
  const focused = [];
  const ref = { current: { focus: (options) => focused.push(options) } };
  const handoff = createRailFoldFocus();
  handoff.commit(true, ref);
  assert.deepEqual(focused, [], 'nothing pending');
  handoff.unmountFocused();
  handoff.commit(false, ref);
  handoff.commit(true, ref);
  assert.deepEqual(focused, [], 'an unfolded commit clears it (the toggle left for another reason)');
  handoff.unmountFocused();
  handoff.commit(true, ref);
  handoff.commit(true, ref);
  assert.deepEqual(focused, [{ preventScroll: true }]);
});

test('SSR: no rail model, no toggle (no session rail: another surface, the landing page, a pane window)', () => {
  for (const html of [renderTitlebar(), renderTitlebar({ loading: true })]) {
    assert.doesNotMatch(html, /session rail|role="separator"/);
  }
  // Even with a model, only a session's cluster has it (wW `y && …` comes from jre, which has a session).
  assert.doesNotMatch(renderTitlebar({ session: null, railToggle: model() }), /session rail/);
  assert.doesNotMatch(renderTitlebar({ section: 'routines', sectionLabel: 'Routines', railToggle: model() }), /session rail/);
});

test('SSR: EH heads the cluster, TI follows it, then the pane toggles; Show/Hide, pressed, flat style, overlay-only aria-expanded', () => {
  const off = trailingOf(renderTitlebar({ railToggle: model() }));
  const toggle = off.match(/<button[^>]*aria-label="Show session rail"[^>]*>/)?.[0];
  assert.ok(toggle, 'the rail toggle');
  const rule = '<span role="separator" aria-orientation="vertical" class="h-4 w-px shrink-0 bg-border"></span>';
  const group = '<div class="flex items-center gap-1 empty:hidden">';
  assert.ok(off.indexOf(toggle) < off.indexOf(rule) && off.indexOf(rule) < off.indexOf(group), 'EH, TI, then the toggle group');
  assert.equal(count(off, rule), 1);
  assert.equal(off.slice(off.indexOf(toggle), off.indexOf(rule)).match(/<\/button>/g).length, 1, 'only the toggle between');
  // The official Button: ghost, icon-only, text-secondary (shared-18 Mb with panels off), pressed with the "selected"
  // variant (inert, see topbar-09), and TH under the flat rail (D10).
  assert.match(toggle, /data-cds="Button" data-cds-icon-only="" data-cds-ghost=""/);
  assert.match(toggle, / text-secondary"/);
  assert.match(toggle, /aria-pressed="false"/);
  assert.doesNotMatch(toggle, /data-cds-pressed-variant/);
  assert.match(toggle, /style="--cds-bg-accent:var\(--cds-fill-ghost-selected\);--cds-text-accent:var\(--titlebar-text-primary, var\(--cds-text-primary\)\)"/);
  assert.doesNotMatch(toggle, / aria-expanded=| aria-controls=| inert=/);
  // On screen, docked: pressed, "Hide", still no disclosure semantics.
  const docked = renderTitlebar({ railToggle: model({ onScreen: true }) }).match(/<button[^>]*aria-label="Hide session rail"[^>]*>/)[0];
  assert.match(docked, /aria-pressed="true"/);
  assert.doesNotMatch(docked, / aria-expanded=/);
  // Overlay semantics (raises): aria-expanded follows onScreen; aria-controls only while the overlay is up.
  const raised = renderTitlebar({ railToggle: model({ onScreen: true, raises: true }) }).match(/<button[^>]*aria-label="Hide session rail"[^>]*>/)[0];
  assert.match(raised, /aria-expanded="true"/);
  assert.match(raised, /aria-controls="rail-panel"/);
  const closed = renderTitlebar({ railToggle: model({ raises: true }) }).match(/<button[^>]*aria-label="Show session rail"[^>]*>/)[0];
  assert.match(closed, /aria-expanded="false"/);
  assert.doesNotMatch(closed, / aria-controls=/);
  // A held (loading) session keeps it in place, inert (wW `inert: !B`), like the toggle group.
  const held = renderTitlebar({ loading: true, railToggle: model() }).match(/<button[^>]*aria-label="Show session rail"[^>]*>/)[0];
  assert.match(held, /\sinert=""/);
  assert.doesNotMatch(held, /\sdisabled(=|\s|>)/);
});

// ---------------------------------------------------------------------------------------------------------------
// R4f-rail fix (review finding: the titlebar ignored wW's railMode). jre passes `railMode: tn` to wW, wW hands it to the
// lead (c73f45bc3 w_, imported as SN); in rail mode w_ renders t_ with `origin: null, pill: null`, and t_ draws the
// empty shared-6 Ih slot (`Yf as Bt`; o = shared-15 xn is false outside the fizzy panels scope) where the origin box was.
test('SSR: railMode — the lead drops the origin glyph and the folder pill for t_\'s empty Ih slot; title and caret stay', () => {
  pin(official('c73f45bc3-CFrHin0p.js'), ['function w_({railMode:e=!1,...t}){return e?', 'c(t_,{origin:null,pill:null,children:t.children})',
    'e===null?c("span",{className:o?Kt:Bt}):c("span",{className:o?Rt:Gt,children:e})', 'Yf as Bt', 'w_ as j']);
  pin(official('cc43287c9-DAfOi8yP.js'), ['j as SN', 'railMode:g=!1', 'titleKnown:ue!==void 0,railMode:g,children:[', 'railMode:tn,railToggle:on?bn:void 0']);
  pin(official('shared-6-Cby4X-ms.js'), ['Ih="w-[max(0px,calc(1rem-var(--tiles-padding,0px)-var(--tiles-border,1px)))] shrink-0"', 'Ih as Yf']);
  pin(official('shared-15-Cc9xvKlF.js'), ['function xn(){return f(bn)===!0}']);
  assert.equal(LEAD_NO_ORIGIN_CLASS, 'w-[max(0px,calc(1rem-var(--tiles-padding,0px)-var(--tiles-border,1px)))] shrink-0');
  const slot = `<span class="${LEAD_NO_ORIGIN_CLASS}"></span>`;
  const leadOf = (html) => html.slice(html.indexOf('st-lead'), html.indexOf('st-trailing'));
  // Not in rail mode (the default): the origin glyph and the folder pill, as before.
  const plain = leadOf(renderTitlebar());
  assert.match(plain, /data-testid="epitaxy-origin-indicator"/);
  assert.match(plain, /<button type="button" class="st-folder"/);
  assert.equal(count(plain, slot), 0);
  // Rail mode, ready: the slot first, then the title and its caret; no origin, no pill.
  const rail = leadOf(renderTitlebar({ railMode: true }));
  assert.equal(count(rail, slot), 1);
  assert.doesNotMatch(rail, /st-origin|epitaxy-origin-indicator|st-folder|epitaxy-origin-label/);
  assert.ok(rail.indexOf(slot) < rail.indexOf('class="session-title st-title"'), 'the slot leads');
  assert.match(rail, /class="session-title st-title"[^>]*>A title<\/button>/);
  assert.match(rail, /st-session-caret/);
  // Rail mode, loading with a known title: the skeleton title, still no static pill; the Loading session status stays.
  const loading = leadOf(renderTitlebar({ railMode: true, loading: true }));
  assert.equal(count(loading, slot), 1);
  assert.doesNotMatch(loading, /st-folder|epitaxy-origin/);
  assert.match(loading, /data-pane-title=""/);
  assert.match(loading, /role="status">Loading session</);
  // Another surface has no origin box or pill to drop.
  assert.equal(count(renderTitlebar({ surface: 'cowork', railMode: true }), slot), 0);
});

// ---------------------------------------------------------------------------------------------------------------
// A mounted titlebar (react-dom/client over the fake DOM): the measure's cap and sample, the fold into ⋮, the focus
// hand-off and the report main.jsx's ⋮ menu reads.
test('mounted: maxHidden 6 → 7 and the sample ref with a rail; the first fold moves the toggle into ⋮ with its focus', async () => {
  await withPreviewDom(async (dom) => {
    // The official tooltip (view-tabs CdsTooltip around EH) clears its timers through window on unmount.
    Object.assign(dom.window, { setTimeout, clearTimeout });
    const host = dom.document.body.appendChild(dom.document.createElement('div'));
    const root = createRoot(host);
    const reports = [], toggles = [];
    const railToggleRef = { current: null };
    // A stable callback, as main.jsx passes its state setter.
    const onRailToggleFoldChange = (folded) => reports.push(folded);
    const props = (over = {}) => ({ ...baseProps, railToggleRef, onRailToggleFoldChange, ...over });
    const rail = model({ onToggle: (event) => toggles.push(event) });
    const button = (label) => host.find((node) => node.localName === 'button' && node.getAttribute('aria-label') === label);
    const more = () => host.find((node) => node.localName === 'button' && /^View options/.test(node.getAttribute('aria-label') ?? ''));
    const rule = () => host.find((node) => node.getAttribute?.('role') === 'separator');
    try {
      foldHidden = 0; foldCalls.length = 0;
      act(() => root.render(h(T.SourceTitlebar, props())));
      assert.equal(foldCalls.at(-1).maxHidden, 6, 'no rail toggle: en caps the fold at 6');
      assert.equal(button('Show session rail'), null);
      assert.deepEqual(reports, [false]);

      act(() => root.render(h(T.SourceTitlebar, props({ railToggle: rail }))));
      assert.equal(foldCalls.at(-1).maxHidden, 7, 'with a foldable rail toggle: 7');
      assert.equal(foldCalls.at(-1).sampleRef, railToggleRef, 'wW sampleRef: b');
      const toggle = button('Show session rail');
      assert.ok(toggle && rule(), 'EH and TI are inline');
      assert.equal(railToggleRef.current, toggle, 'jre\'s ref holds the toggle');
      assert.notEqual(more().getAttribute('aria-label'), null);
      reactProps(toggle).onClick({ detail: 0 });
      assert.equal(toggles.length, 1, 'the toggle calls the model\'s onToggle');
      assert.deepEqual(reports, [false]);

      // The keyboard-focused toggle folds (hiddenCount 1 → railToggleFolded, no pane toggle folds yet).
      toggle.focus();
      foldHidden = 1;
      act(() => root.render(h(T.SourceTitlebar, props({ railToggle: rail }))));
      assert.equal(button('Show session rail'), null, 'folded away');
      assert.equal(rule(), null, 'TI goes with it');
      assert.ok(host.find((node) => node.getAttribute?.('data-pane-toggle') === 'terminal'), 'the pane toggles stay (hiddenMainPanes 0)');
      assert.equal(railToggleRef.current, more(), '⋮ holds the ref while folded (Zh te)');
      assert.equal(dom.document.activeElement, more(), 'focus moved to ⋮ (wW Oe/ke)');
      assert.deepEqual(reports, [false, true], 'main.jsx is told, so ⋮ lists the rail row');

      // The second fold takes the first inactive pane toggle.
      foldHidden = 2;
      act(() => root.render(h(T.SourceTitlebar, props({ railToggle: rail }))));
      assert.equal(host.find((node) => node.getAttribute?.('data-pane-toggle') === 'terminal'), null);

      // Room again: the toggle comes back; ⋮ gives the ref back; focus stays where it is.
      foldHidden = 0;
      act(() => root.render(h(T.SourceTitlebar, props({ railToggle: rail }))));
      assert.equal(railToggleRef.current, button('Show session rail'));
      assert.equal(dom.document.activeElement, more());
      assert.deepEqual(reports, [false, true, false]);

      // A pointer-folded toggle (focus elsewhere) moves no focus.
      dom.document.activeElement = dom.document.body;
      foldHidden = 1;
      act(() => root.render(h(T.SourceTitlebar, props({ railToggle: rail }))));
      assert.equal(dom.document.activeElement, dom.document.body);
    } finally {
      foldHidden = 0;
      act(() => root.unmount());
      // Let the unmounted titlebar's cancelled frames settle before the fake DOM goes away.
      await new Promise((resolve) => setImmediate(resolve));
    }
  });
});

test('main.jsx: ⋮ lists the folded rail toggle first, from the same model the titlebar draws', () => {
  const main = read('src/main.jsx');
  assert.equal(count(main, 'const [titlebarRailFolded, setTitlebarRailFolded] = useState(false);'), 1);
  assert.equal(count(main, 'const sessionRailToggle = '), 1, 'one model per App (side), assigned by the rail mount');
  assert.match(main, /onFoldChange=\{setTitlebarHidden\}\n\s+railToggle=\{sessionRailToggle\} onRailToggleFoldChange=\{setTitlebarRailFolded\}/);
  const menu = main.slice(main.indexOf('case "titlebar":'), main.indexOf('case "session-title":'));
  const row = menu.indexOf('titlebarRailMenuItems(titlebarRailFolded ? sessionRailToggle : undefined)');
  // The folded pane toggles come through session-chord-model.mjs titlebarViewOptionsItems since R4h-topbar K1.
  assert.ok(row > 0 && row < menu.indexOf('titlebarViewOptionsItems('), 'the rail row precedes the folded pane toggles');
  assert.match(menu, /icon=\{item\.icon\} onClick=\{item\.onSelect\}>\{t\(item\.label\)\}<\/SourceMenu\.Item>/);
  // Its English copy is the official text, looked up through t() like the other rows (zh-CN: SR-8).
  pin(official('cc43287c9-DAfOi8yP.js'), ['defaultMessage:"Hide session rail",id:"U0R7oYkTM1"', 'defaultMessage:"Show session rail",id:"JYaBivMdHH"']);
});

// ---------------------------------------------------------------------------------------------------------------
// topbar-09 through the real cascade (every sheet the renderer loads, @layer order included).
test('topbar-09: pressed titlebar toggles end on bg-accent / text-accent, hovered or not; unpressed ones keep the ghost look', () => {
  const markup = renderTitlebar({ panes: new Set(['terminal']), popoutWindow: { alwaysOnTop: true, onDock() {}, onTogglePin() {} } });
  const tree = element('html', { lang: 'en', class: 'cds-root', 'data-theme': 'claude', 'data-mode': 'system', 'data-density': 'comfortable',
    'data-platform': 'desktop', 'data-color-version': 'v2', 'data-dframe': '' }, [element('body', {}, [element('div', { id: 'root' })])]);
  const mount = find(tree, (node) => node.attrs.id === 'root');
  for (const node of parseMarkup(markup)) append(mount, node);
  const sheets = appSheets(app);
  assert.ok(sheets.some((sheet) => sheet.name === UTILITIES), 'index.html loads the official utilities sheet');
  const cascade = loadCascade(sheets);
  const clear = (node) => { node.state.clear(); node.children.forEach(clear); };
  const byAttr = (name, value) => find(tree, (node) => node.tag === 'button' && node.attrs[name] === value);
  const pressed = { terminal: byAttr('data-pane-toggle', 'terminal'), pin: byAttr('data-popout-pin', '') };
  const unpressed = byAttr('data-pane-toggle', 'preview');
  for (const [name, node] of Object.entries(pressed)) {
    assert.equal(node.attrs['aria-pressed'], 'true', name);
    for (const hover of [false, true]) {
      clear(tree);
      if (hover) setState(node, ['hover']);
      const fill = computed(cascade, node, 'background-color');
      const ink = computed(cascade, node, 'color');
      assert.equal(fill.value, 'var(--cds-bg-accent)', `${name}${hover ? ':hover' : ''} fill from ${fill.from?.sheet}`);
      assert.equal(ink.value, 'var(--cds-text-accent)', `${name}${hover ? ':hover' : ''} text from ${ink.from?.sheet}`);
      assert.equal(fill.from.sheet, 'src/source-titlebar.css');
    }
  }
  clear(tree);
  assert.equal(computed(cascade, unpressed, 'color').value, 'var(--cds-text-secondary)');
  assert.notEqual(computed(cascade, unpressed, 'background-color').value, 'var(--cds-bg-accent)');
  setState(unpressed, ['hover']);
  assert.equal(computed(cascade, unpressed, 'background-color').value, 'var(--cds-fill-ghost-hover)');
  // The values are the official utilities' own (the rail toggle, an official Button, gets them from these rules).
  const sheet = read(UTILITIES);
  pin(sheet, [
    '.group-aria-pressed\\/btn\\:bg-accent:is(:where(.group\\/btn)[aria-pressed=true] :where(.group-aria-pressed\\/btn\\:bg-accent)){background-color:var(--cds-bg-accent)}',
    '.aria-pressed\\:text-accent[aria-pressed=true]{color:var(--cds-text-accent)}',
  ]);
});
