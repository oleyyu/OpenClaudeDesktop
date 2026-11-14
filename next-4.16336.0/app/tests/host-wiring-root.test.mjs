// host-wiring root: main.jsx mounts the 4.16336.0 CdsRoot (src/cds-core.mjs, generated cds-core shared-frame xo) at the
// window root and inside the Code composer's 3.6556.2 root, and renders its own Button / Icon from the cds-core facade,
// while the 3.6556.2 regions keep reading the view-tabs Contexts the old providers give them. Official chunks are read as
// text only; the SSR half runs the generated graphs under the host React through Vite (configFile false + plugin-react).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-4.16336.0.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const official = (name) => fs.readFileSync(path.join(ionSource, name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const main = read('src/main.jsx');

const WINDOW_ROOT = '<CdsCoreRoot className="contents" labels={cdsLabels} locale={getLocale()} pageBackground="surface-1" platform="desktop" experimental={cdsWindowExperimental}>';
// rl-main-entry U-1: the 3.6556.2 root takes the density the window root resolved (shared-frame Ja), see the U-1 test below.
const PANE_OLD_ROOT = '<CdsRoot density={windowDensity} font={cdsFont} platform="desktop" experimental={codePaneExperimental} className="contents">';
const PANE_NEW_ROOT = '<CdsCoreRoot density={themeDensity(boot?.config)} font={cdsCoreFont} platform="desktop" experimental={codePaneExperimental} className="contents">';

let server, Core, Old, Labels, Experimental;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Core = await server.ssrLoadModule('/src/cds-core.mjs');
  Old = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
  Labels = await server.ssrLoadModule('/src/cds-labels.mjs');
  Experimental = await server.ssrLoadModule('/src/generated/code-composer/code-pane-experimental.mjs');
});
after(() => server?.close());

test('official 4.16336.0: the main window root (index XQ kE = shared-46 St), the Code pane root and the font token main.jsx follows', () => {
  // The main window (ion-dist/index.html -> index-DN24_FmB.js): XQ wraps the app in kE = shared-46 St (export o).
  // frame-shell-chrome tte is the artifact iframe shell's root (surfaces-audit section 1, item 2), not this one.
  const index = official('index-DN24_FmB.js');
  assert.ok(/import\{[^}]*[{,]o as kE[,}][^}]*\}from"\.\/shared-46-Cx3Fc1bY\.js"/.test(index));
  assert.ok(index.includes('m(HH,{components:cU,children:m(kE,{children:g(eH,{children:[r,m("div",{className:"root",children:m(xU,{children:m($y,{})})})]})})})'));
  // St renders Ef (imported as s) with no density / platform / direction, pageBackground C, experimental v.
  const st = official('shared-46-Cx3Fc1bY.js');
  assert.match(st, /[{,]St as o[,}]/);
  assert.ok(/import\{(?:[^}]*,)?Ef as s[,}][^}]*\}from"\.\/shared-frame-CJdE5Ria\.js"/.test(st));
  assert.ok(st.includes('v=J2($,1,h,u)?K2($,1,h,u,{theme:u,fizzyLake:_,automaticDelayedBusy:h}):$[3]'));
  assert.ok(st.includes('a(s,{mode:g,font:m,router:c,labels:d,locale:f,pageBackground:C,experimental:v,className:"contents",children:y})'));
  // C = shared-23 FD = "surface-1"; automaticDelayedBusy U() is growthbook gate __gb__3526081406.
  assert.ok(/import\{et as C,[^}]*\}from"\.\/shared-23-BRmsPtuN\.js"/.test(st));
  const s23 = official('shared-23-BRmsPtuN.js');
  assert.match(s23.slice(s23.lastIndexOf('export{')), /[{,]FD as et[,}]/);
  assert.match(s23, /[,; ]FD="surface-1"/);
  assert.ok(st.includes('var mt="__gb__3526081406";function U(){return te(mt,!0)}'));
  // titlebar relink T1: St's fizzyLake _ is A() once (J0/K0 memo slot 0), A = shared-92 sv = ib, which reads the html
  // data-cds-fizzy-lake attribute ($y) filtered to nb = Qy ["color","panels","type"] and caches it in rb.
  assert.ok(st.includes('_=J0($,0)?K0($,0,A()):$[0]'));
  assert.ok(/import\{(?:[^}]*,)?sv as A[,}][^}]*\}from"\.\/shared-92-BOgyxePb\.js"/.test(st));
  const s92 = official('shared-92-BOgyxePb.js');
  assert.ok(s92.includes('function ib(){return rb??={parts:typeof document>"u"?[]:eb(document.documentElement.getAttribute($y),nb)},rb}'));
  assert.ok(s92.includes('Qy=["color","panels","type"],$y="data-cds-fizzy-lake"'));
  assert.match(s92.slice(s92.lastIndexOf('export{')), /[{,]ib as sv[,}]/);
  // Root (shared-frame xo): pageBackground becomes data-page-bg and an inline --cds-page-bg (ro); the sheet's .cds-root is surface-0.
  const frame = official('shared-frame-CJdE5Ria.js');
  assert.ok(frame.includes('function ro(e){return e?{"--cds-page-bg":co(e)?`var(--cds-${e})`:oo(e),'));
  assert.ok(frame.includes('"data-page-bg":V,style:Te'));
  assert.ok(frame.includes('var Da=et("comfortable")'));
  assert.ok(official('c6a992d55-_JRfOmTh.css').includes('--cds-page-bg:var(--cds-surface-0)'));
  // c11959232 j_: the Code pane under Ef (y) at compact, experimental shared-18 BC = {naturalImageTiles:"sized"} (wp).
  const pane = official('c11959232-D8gLbLAI.js');
  assert.ok(pane.includes('i(y,{density:"compact",fontMono:Le,experimental:Re,className:"contents",children:qa})'));
  assert.ok(official('shared-18-Cfqwgjc5.js').includes('BC={naturalImageTiles:"sized"}'));
  // shared-92 Ox: the cds font is "anthropic" for the Anthropic interface font, otherwise "system".
  assert.ok(official('shared-92-BOgyxePb.js').includes('function Ox(e){let t=e==="anthropic"?"anthropic":"system";return{cdsFont:t,'));
  assert.deepEqual({ ...Experimental.codePaneExperimental }, { naturalImageTiles: 'sized' });
});

test('main.jsx: the window root, the nested Code pane root and the host controls come from the cds-core facade', () => {
  assert.equal(count(main, 'import { CdsRoot as CdsCoreRoot } from "./cds-core.mjs";'), 1);
  assert.match(main, /^import \{ CdsButton \} from "\.\/cds-core\.mjs";/m);
  assert.match(main, /^import \{ CdsIcon \} from "\.\/cds-core\.mjs";/m);
  // Wave 2: the rename field is the 4.16336.0 TextInput (shared-frame ww, export pc; shared-140's rename dialog draws pc).
  assert.match(main, /^import \{ CdsTextInput \} from "\.\/cds-core\.mjs";/m);
  assert.doesNotMatch(main, /import \{ Cds(Button|Icon|TextInput) \} from "\.\/generated\/view-tabs/);
  // The 3.6556.2 providers stay for the regions still on the old graph.
  assert.equal(count(main, 'import { CdsRoot } from "./generated/view-tabs/index.js";'), 1);
  assert.equal(count(main, 'import { CdsLocaleContext } from "./generated/view-tabs/index.js";'), 1);
  assert.equal(count(main, 'import { CdsLabelsContext } from "./generated/view-tabs/index.js";'), 1);
  // Window root: inside the two old providers, around the toast provider and every window (App / PopoutApp).
  const render = main.slice(main.indexOf('createRoot(document.getElementById("root")).render('));
  assert.equal(count(main, WINDOW_ROOT), 1);
  assert.ok(render.includes(`<CdsLocaleContext.Provider value={getLocale()}><CdsLabelsContext.Provider value={cdsLabels}>${WINDOW_ROOT}<SourceToastProvider>`));
  assert.ok(render.includes('</SourceToastProvider></CdsCoreRoot></CdsLabelsContext.Provider></CdsLocaleContext.Provider>,\n);'));
  // As shared-46 St: pageBackground surface-1, no direction / density; mode, font, router, experimental left to their defaults.
  assert.ok(WINDOW_ROOT.includes(' pageBackground="surface-1" '));
  for (const prop of ['direction=', 'density=', 'font=', 'mode=', 'router=']) assert.ok(!WINDOW_ROOT.includes(prop), prop);
  // titlebar relink T1: experimental is St's v with fizzyLake = sv() (shared-92 ib through the facade), read once at module level.
  assert.equal(count(main, 'import { readFizzyLakeParts } from "./cds-core.mjs";'), 1);
  assert.equal(count(main, '{ fizzyLake: readFizzyLakeParts() }'), 1);
  assert.equal(count(main, 'const cdsWindowExperimental = { fizzyLake: readFizzyLakeParts() };'), 1);
  assert.equal(count(main, 'experimental={cdsWindowExperimental}'), 1);
  // No host-side parts literal or rr Provider: the parts come from ib only and Root provides rr.
  assert.doesNotMatch(main, /CdsFizzyLakePartsContext|parts:\s*\[/);
  // Code pane: the 4.16336.0 root right inside the old one, same props, the 4.16336.0 font token.
  assert.ok(main.includes(`    ${PANE_OLD_ROOT}\n    ${PANE_NEW_ROOT}\n    <SourceComposer\n`));
  assert.equal(count(main, '<CdsCoreRoot '), 2);
  assert.equal(count(main, '</CdsCoreRoot>'), 2);
  assert.equal(count(main, '  const cdsCoreFont = prefs.interfaceFont === "anthropic" ? "anthropic" : "system";'), 1);
  // The host controls main.jsx draws itself: the split tip, the key / sign-in cards, the rename dialog, the account menu icon.
  assert.equal(count(main, '<CdsButton '), 10);
  assert.equal(count(main, '<CdsIcon '), 1);
  assert.equal(count(main, '<CdsTextInput\n'), 1);
  // Nothing else in main.jsx still comes from the view-tabs graph than the three 3.6556.2 providers.
  assert.deepEqual([...main.matchAll(/^import \{([^}]*)\} from "\.\/generated\/view-tabs\/[^"]*";/gm)].map((m) => m[1].trim()).sort(), ['CdsLabelsContext', 'CdsLocaleContext', 'CdsRoot']);
});

const Probe = () => {
  const read = (ctx) => React.useContext(ctx);
  const core = { density: read(Core.CdsDensityContext), locale: read(Core.CdsLocaleContext), labels: read(Core.CdsLabelsContext) === Labels.cdsLabels,
    router: read(Core.CdsRouterContext) ?? null, direction: read(Core.CdsDirectionContext)?.direction ?? null };
  const old = { density: read(Old.CdsDensityContext), locale: read(Old.CdsLocaleContext), labels: read(Old.CdsLabelsContext) === Labels.cdsLabels };
  return h('i', { 'data-probe': JSON.stringify({ core, old }) });
};
const probes = (html) => [...html.matchAll(/data-probe="([^"]*)"/g)].map((m) => JSON.parse(m[1].replaceAll('&quot;', '"')));

test('SSR under the host React: the window root is a contents cds-root and both graphs read their own Contexts', () => {
  const html = renderToStaticMarkup(h(Old.CdsLocaleContext.Provider, { value: 'zh-CN' }, h(Old.CdsLabelsContext.Provider, { value: Labels.cdsLabels },
    h(Core.CdsRoot, { className: 'contents', labels: Labels.cdsLabels, locale: 'zh-CN', pageBackground: 'surface-1', platform: 'desktop' },
      h(Probe),
      // The Code pane: old root, then the 4.16336.0 root with the same props (themeDensity's default compact, font system).
      h(Old.CdsRoot, { density: 'compact', font: 'sans', platform: 'desktop', experimental: Experimental.codePaneExperimental, className: 'contents' },
        h(Core.CdsRoot, { density: 'compact', font: 'system', platform: 'desktop', experimental: Experimental.codePaneExperimental, className: 'contents' },
          h(Probe), h(Core.CdsButton, { size: 'sm' }, 'Open in split view')))))));
  // No document in SSR: without a font prop the root falls back to "anthropic" (shared-frame Ir/Fr read html[data-font]).
  // pageBackground surface-1 (shared-46 St's FD): data-page-bg plus the inline --cds-page-bg over the sheet's .cds-root surface-0.
  assert.ok(html.startsWith('<div class="cds-root text-primary contents" data-density="comfortable" data-platform="desktop" data-font="anthropic" data-page-bg="surface-1" style="font-size:var(--cds-font-size-body);--cds-page-bg:var(--cds-surface-1)"><i data-probe='), html.slice(0, 320));
  assert.doesNotMatch(html.slice(0, html.indexOf('>')), /data-mode|dir=/);
  // The pane's 4.16336.0 root passes no pageBackground (c11959232 j_ neither) and inherits the window root's surface-1 through
  // Root's Contexts, as j_ does under St (the Code routes, index _epitaxyGroup, hang off the root layout, not the cic $I
  // shell that sets surface-0); the 3.6556.2 root reads its own graph and carries none.
  assert.ok(html.includes('<div class="cds-root text-primary contents" data-density="compact" data-platform="desktop" data-font="sans" style="font-size:var(--cds-font-size-body)"><div class="cds-root text-primary contents" data-density="compact" data-platform="desktop" data-font="system" data-page-bg="surface-1" style="font-size:var(--cds-font-size-body);--cds-page-bg:var(--cds-surface-1)">'));
  const [windowLevel, pane] = probes(html);
  // No density prop: Root's density Context default (shared-frame Da) is comfortable. No direction prop: no DirectionProvider.
  assert.deepEqual(windowLevel, { core: { density: 'comfortable', locale: 'zh-CN', labels: true, router: null, direction: null }, old: { density: 'comfortable', locale: 'zh-CN', labels: true } });
  // In the pane both read compact from their own root; labels and locale chain to the window-level values.
  assert.deepEqual(pane, { core: { density: 'compact', locale: 'zh-CN', labels: true, router: null, direction: null }, old: { density: 'compact', locale: 'zh-CN', labels: true } });
  // The facade Button is the 4.16336.0 one (data-cds Button) and renders inside both roots.
  assert.match(html, /<button type="button" data-cds="Button"[^>]*>[^]*Open in split view[^]*<\/button>/);
});

test('SSR: with St\'s fizzyLake parts the window root carries them and every nested 4.16336.0 root resolves to comfortable (xo)', () => {
  // The facade name is shared-92 ib itself (one rb cache with the published isFizzyLakePartEnabled ab).
  assert.deepEqual(JSON.parse(read('src/generated/cds-core/manifest.json')).publicNames.readFizzyLakeParts, { file: 'shared-92-BOgyxePb.js', local: 'ib', target: 'shared-92.mjs', exportName: 'ib' });
  // Official xo: w = cr(X(rr), p?.fizzyLake?.parts); E = densityOverride ?? X(Ha) ?? (ar(w,"panels") ? "comfortable" : void 0).
  const frame = official('shared-frame-CJdE5Ria.js');
  assert.ok(/[,;]E=p\?\.densityOverride\?\?[A-Za-z$_]+\?\?\(ar\(w,"panels"\)\?"comfortable":void 0\)/.test(frame), 'xo density');
  // Fixture parts only (the value index.html carries); ib itself is not called here (no document: rb would cache []).
  const parts = { fizzyLake: { parts: ['color', 'panels', 'type'] } };
  const html = renderToStaticMarkup(h(Core.CdsRoot, { className: 'contents', labels: Labels.cdsLabels, locale: 'en-US', pageBackground: 'surface-1', platform: 'desktop', experimental: parts },
    h(Probe),
    h(Old.CdsRoot, { density: 'compact', font: 'sans', platform: 'desktop', experimental: Experimental.codePaneExperimental, className: 'contents' },
      h(Core.CdsRoot, { density: 'compact', font: 'system', platform: 'desktop', experimental: Experimental.codePaneExperimental, className: 'contents' }, h(Probe)))));
  assert.ok(html.startsWith('<div class="cds-root text-primary contents" data-density="comfortable" data-platform="desktop" data-font="anthropic" data-cds-fizzy-lake="color panels type" data-page-bg="surface-1"'), html.slice(0, 320));
  // The Code pane's 4.16336.0 root: density "compact" (c11959232 j_ passes it too) is overridden to comfortable by panels and it
  // carries the union of the parent parts; the 3.6556.2 root reads its own graph and stays compact.
  assert.ok(html.includes('<div class="cds-root text-primary contents" data-density="compact" data-platform="desktop" data-font="sans" style="font-size:var(--cds-font-size-body)"><div class="cds-root text-primary contents" data-density="comfortable" data-platform="desktop" data-font="system" data-cds-fizzy-lake="color panels type"'), html);
  const [, pane] = probes(html);
  assert.equal(pane.core.density, 'comfortable');
  assert.equal(pane.old.density, 'compact');
});

test('U-1 (density as the official code): the host\'s extra density writers take the window root\'s resolved density (Ja)', () => {
  // Official: c11959232 j_ renders one CdsRoot above the session, `y({density:"compact",fontMono:Le,experimental:Re,…})`
  // around div.epitaxy-root (no data-density, no cds-root); the pane window (c5638815a bt) is a plain div.epitaxy-root.
  const c119 = official('c11959232-D8gLbLAI.js');
  assert.ok(c119.includes('a("div",{className:"epitaxy-root text-body text-primary break-words select-none h-full w-full flex flex-col",children:[Ma,da,Pa,Fa,La,za,Ga]})'));
  assert.ok(c119.includes('i(y,{density:"compact",fontMono:Le,experimental:Re,className:"contents",children:qa})'));
  const c563 = official('c5638815a-DZAqfzwl.js');
  assert.ok(c563.includes('e("div",{className:"epitaxy-root text-body text-primary break-words epitaxy-pane-window flex h-full w-full select-none flex-col bg-surface-1","data-sim-native-ground":""'));
  // No official epitaxy-root element writes data-density (the writers are xo, the portal root, the sidebar aside, two fixed ones).
  for (const name of fs.readdirSync(ionSource).filter((f) => f.endsWith('.js'))) {
    const text = official(name);
    for (const m of text.matchAll(/className:"([^"]*epitaxy-root[^"]*)"/g)) {
      const near = text.slice(m.index, m.index + 400);
      assert.doesNotMatch(near.slice(0, near.indexOf('children:') > 0 ? near.indexOf('children:') : 400), /"data-density"/, `${name}: ${m[1]}`);
    }
  }
  // Ja (useCdsDensity) is X(Da), and xo provides Da with k (`E??(O?"comfortable":t??_)`, E comfortable under panels).
  const frame = official('shared-frame-CJdE5Ria.js');
  assert.ok(frame.includes('function Ja(){return X(Da)}'));
  assert.ok(frame.includes('return J2($,120,k,Ge)?K2($,120,k,Ge,v(Da.Provider,{value:k,children:Ge})):$[122]}'));
  assert.deepEqual(JSON.parse(read('src/generated/cds-core/manifest.json')).publicNames.useCdsDensity, { file: 'shared-frame-CJdE5Ria.js', local: 'Ja', target: 'shared-frame.mjs', exportName: 'useCdsDensity' });
  // main.jsx: the facade name, read in App and PopoutApp (both under the window root); the 3.6556.2 view-tabs root and the two
  // main.epitaxy-root.cds-root elements write it; the local theme density no longer reaches any of the three.
  assert.equal(count(main, 'import { useCdsDensity } from "./cds-core.mjs";'), 1);
  assert.equal(count(main, '  const windowDensity = useCdsDensity();\n'), 2);
  assert.equal(count(main, `    ${PANE_OLD_ROOT}\n`), 1);
  assert.equal(count(main, 'data-density={windowDensity /* U-1: c11959232 j_\'s root as xo resolves it (Ja), see above */}'), 1);
  assert.ok(main.includes('<main className={"workspace epitaxy-root cds-root popout-workspace" + (popoutFrame ? " epitaxy-pane-window" : "")} data-density={windowDensity} '));
  assert.doesNotMatch(main, /data-density=\{(?:appearanceConfig \? )?themeDensity\(/);
  assert.doesNotMatch(main, /<CdsRoot density=\{themeDensity\(/);
});

test('SSR: U-1 — under the window root\'s fizzy-lake parts Ja reads comfortable, so the 3.6556.2 root it feeds writes comfortable', () => {
  const parts = { fizzyLake: { parts: ['color', 'panels', 'type'] } };
  let seen;
  const Pane = () => { const d = Core.useCdsDensity(); seen = d;
    return h(Old.CdsRoot, { density: d, font: 'sans', platform: 'desktop', experimental: Experimental.codePaneExperimental, className: 'contents' }, h(Probe)); };
  const html = renderToStaticMarkup(h(Core.CdsRoot, { className: 'contents', labels: Labels.cdsLabels, locale: 'en-US', pageBackground: 'surface-1', platform: 'desktop', experimental: parts }, h(Pane)));
  assert.equal(seen, 'comfortable');
  assert.ok(html.includes('<div class="cds-root text-primary contents" data-density="comfortable" data-platform="desktop" data-font="sans"'), html.slice(0, 600));
  assert.equal(probes(html)[0].old.density, 'comfortable');
});

test('SSR: the facade Icon and Button are the generated cds-core bindings, not the view-tabs ones', () => {
  assert.notEqual(Core.CdsButton, Old.CdsButton);
  assert.notEqual(Core.CdsIcon, Old.CdsIcon);
  assert.notEqual(Core.CdsRoot, Old.CdsRoot);
  const icon = renderToStaticMarkup(h(Core.CdsRoot, { className: 'contents', density: 'comfortable', platform: 'desktop' }, h(Core.CdsIcon, { name: 'ArrowOutSquare', size: 'sm' })));
  assert.match(icon, /data-cds="Icon"/);
  assert.notEqual(Core.CdsTextInput, Old.CdsTextInput);
  const official = fs.readFileSync(path.join(ionSource, 'shared-frame-CJdE5Ria.js'), 'utf8');
  assert.match(official, /[{,]ww as pc[,}]/);
  assert.deepEqual(JSON.parse(read('src/generated/cds-core/manifest.json')).publicNames.CdsTextInput, { file: 'shared-frame-CJdE5Ria.js', local: 'ww', target: 'shared-frame.mjs', exportName: 'CdsTextInput' });
  // The rename field's props (main.jsx: ref, data-testid, aria-label, value, onChange, onFocus) reach the native input.
  const field = renderToStaticMarkup(h(Core.CdsRoot, { className: 'contents', density: 'comfortable', platform: 'desktop' },
    h(Core.CdsTextInput, { 'data-testid': 'name-session', 'aria-label': 'Rename session', value: 'Draft', onChange() {}, onFocus() {} })));
  assert.match(field, /<input[^>]*data-testid="name-session"[^>]*>/);
  assert.match(field, /<input[^>]*aria-label="Rename session"[^>]*value="Draft"|<input[^>]*value="Draft"[^>]*aria-label="Rename session"/);
});
