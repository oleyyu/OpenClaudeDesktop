// R4a test lock (moved from tests-r4a/ at the R4g/R4h gate) for the R3 audit group A-global (official 2.42304.0): global-02, global-09, global-11, global-13,
// global-14. Each test has (a) the official signature counts read from the installed 2.42304.0 chunks and (b) the
// local side: model behaviour or a CSS cascade resolved over every stylesheet the renderer loads
// (tests/fixtures/transcript-css-cascade.mjs) where that decides it, otherwise the source line that decides the
// behaviour. global-13 was a divergence when R4a was written; since R4e-small it asserts the official Cd classes.
// No vite, no GUI, no network: model imports plus file reads only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { appSheets, append, computed, element, loadCascade, setState } from '../tests/fixtures/transcript-css-cascade.mjs';
import { designSnapshot, designStylesheets, designVersion } from '../scripts/current-design-assets.mjs';
import { PASS_THROUGH_REGIONS, REGION_ORDER, orderStops } from '../src/focus-region-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const previous = path.resolve(app, '../reference/installed-2.37337.1-20261015');
const cache = new Map();
const read = file => { if (!cache.has(file)) cache.set(file, fs.readFileSync(file, 'utf8')); return cache.get(file); };
const official = name => read(path.join(reference, 'ion-dist/assets/v1', name));
const local = rel => read(path.join(app, rel));
const count = (text, needle) => text.split(needle).length - 1;
const once = (text, needles) => { for (const needle of needles) assert.equal(count(text, needle), 1, needle); };
const OFFICIAL_CSS = 'c6a992d55-sXiDGMFQ.css';
const LOCAL_CSS = `public/assets/v1/${OFFICIAL_CSS}`;
// The only difference between an official stylesheet and its public/assets/v1 copy: font url()s made relative.
const asServed = text => text.replaceAll('url(/assets/v1/', 'url(./');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
// Every local source file (app-relative) with one of `exts`, generated/** included unless `generated: false`.
const sources = (exts, { generated = true } = {}) => [...walk(path.join(app, 'src')), ...walk(path.join(app, 'electron'))]
  .map(file => path.relative(app, file))
  .filter(rel => exts.some(ext => rel.endsWith(ext)) && (generated || !rel.split(path.sep).includes('generated')));
const stripComments = css => css.replace(/\/\*[\s\S]*?\*\//g, '');

// The renderer's cascade (index.html's official sheets, then the app's src/*.css in bundle order), built once.
let shippedCascade = null;
const shipped = () => (shippedCascade ??= loadCascade(appSheets(app)));
// html.cds-root as index.html writes it > body > #root.
function documentRoot() {
  const html = element('html', { class: 'cds-root', 'data-theme': 'claude', 'data-mode': 'system', 'data-density': 'comfortable',
    'data-platform': 'desktop', 'data-color-version': 'v2', 'data-dframe': '' });
  const body = append(html, element('body'));
  return append(body, element('div', { id: 'root' }));
}

// ---- global-02 ------------------------------------------------------------------------------------------------------

test('global-02 account row: pw\'s ps-[var(--df-row-px)] pe-2 text-start class string, decided by the official utilities with no local restatement', () => {
  // (a) 2.42304.0 shared-19 pw: the user-menu trigger's class string (logical ps-/pe-/text-start; no physical pl-).
  const OFFICIAL_CLASS = 'df-user-menu-btn cds-reset flex h-[max(28px,var(--df-footer-btn-size))] max-w-full items-center gap-[var(--df-row-gap)] rounded-[var(--df-radius-pill)] ps-[var(--df-row-px)] pe-2 text-start outline-none hover:bg-[var(--df-hover)] focus-visible:shadow-focus';
  const sidebar = official('shared-19-CkPOiIKm.js');
  once(sidebar, [`"data-testid":"user-menu-button",className:"${OFFICIAL_CLASS}"`]);
  assert.equal(count(sidebar, 'pl-[var(--df-row-px)]'), 0);
  const css = official(OFFICIAL_CSS);
  once(css, ['.ps-\\[var\\(--df-row-px\\)\\]{padding-inline-start:var(--df-row-px)}', '.pe-2{padding-inline-end:calc(var(--spacing) * 2)}',
    '.text-start{text-align:start}']);
  assert.equal(count(css, '.pl-\\[var\\(--df-row-px\\)\\]'), 0, 'the physical pl- utility is no longer compiled');

  // (b) local: source-sidebar.jsx's trigger carries pw's class string, class for class (+ the host account-button hook).
  const jsx = local('src/source-sidebar.jsx');
  const classes = [...jsx.matchAll(/className="(df-user-menu-btn [^"]*)"/g)].map(match => match[1]);
  assert.deepEqual(classes, [OFFICIAL_CLASS.replace('df-user-menu-btn', 'df-user-menu-btn account-button')]);
  // No local sheet styles the trigger by its own classes any more (D26 removed style.css's padding restatement).
  for (const rel of [...fs.readdirSync(path.join(app, 'src')).filter(name => name.endsWith('.css')).map(name => `src/${name}`),
    'public/assets/legacy-utilities.css', 'public/assets/current-chat/layout.css'])
    assert.doesNotMatch(stripComments(local(rel)), /\.(df-user-menu-btn|account-button)(?![\w-])/, rel);
  assert.equal(local(LOCAL_CSS), asServed(css), 'the served c6a992d55 is the official sheet');
  // The cascade over every loaded sheet: the three utilities of the official copy decide padding and alignment.
  const footer = append(append(documentRoot(), element('div', { class: 'desktop-app dframe-root' })), element('div', { class: 'df-bottom-tray shrink-0' }));
  const row = append(footer, element('div', { class: 'df-footer-row account-footer shrink-0 flex items-center gap-[var(--df-footer-gap)]' }));
  const button = append(append(row, element('div', { class: 'min-w-0 flex-1' })), element('button', { type: 'button', class: classes[0], 'data-testid': 'user-menu-button' }));
  // A footer aux with content (the Connection settings control), so pw's own end padding is the one that applies.
  append(append(row, element('div', { class: 'df-footer-aux ml-auto flex shrink-0 items-center' })), element('button', { type: 'button' }));
  for (const [property, value, utility] of [['padding-left', 'var(--df-row-px)', 'ps-'], ['padding-right', 'calc(var(--spacing) * 2)', 'pe-2'], ['text-align', 'start', 'text-start']]) {
    const resolved = computed(shipped(), button, property);
    assert.equal(resolved.value, value, `${utility} → ${resolved.value} from ${resolved.from?.sheet}`);
    assert.equal(resolved.from.sheet, LOCAL_CSS); assert.equal(resolved.from.layer, 'utilities');
  }
});

// ---- global-09 ------------------------------------------------------------------------------------------------------

test('global-09 tokens: the served sheets are the 2.42304.0 originals; menu gutter, control ink, frame row and prose tokens keep their defaults', () => {
  // (a) 2.42304.0 c6a992d55: --cds-menu-gutter is reset to initial (its users fall back to .25rem / 4px), --control-ink
  // and --frame-row-h are only ever read with a fallback, never declared; --radius-4xl (2.37337.1) is gone.
  const css = official(OFFICIAL_CSS);
  once(css, ['.\\[--cds-menu-gutter\\:initial\\]{--cds-menu-gutter:initial}', ';--cds-menu-gutter:initial;',
    '.p-\\[var\\(--cds-menu-gutter\\,0\\.25rem\\)\\]{padding:var(--cds-menu-gutter,.25rem)}',
    '.text-muted-control{color:var(--control-ink,var(--cds-text-muted))}', '.top-frame-row{top:var(--frame-row-h,3rem)}',
    '.text-prose-medium{font-size:var(--cds-font-size-prose);']);
  const TOKENS = { '--cds-menu-gutter:initial': 2, 'var(--cds-menu-gutter': 12, '--control-ink': 7, '--control-ink:': 0,
    '--frame-row-h': 29, '--frame-row-h:': 0, 'text-prose-medium': 3, 'radius-4xl': 0 };
  for (const [token, n] of Object.entries(TOKENS)) assert.equal(count(css, token), n, token);
  for (const name of designStylesheets) assert.equal(count(official(name), 'radius-4xl'), 0, name);
  const old = read(path.join(previous, 'ion-dist/assets/v1/c6a992d55-CNGsCU46.css'));
  once(old, ['--radius-4xl:2rem;', '.rounded-4xl{border-radius:var(--radius-4xl)}']);
  // shared-frame Hx: the menu frame's header / footer gutters and the list's max-height, all on the .25rem fallback.
  const frame = official('shared-frame-BfjMqbuN.js');
  once(frame, ['zx="shrink-0 px-[var(--cds-menu-gutter,0.25rem)] pt-[var(--cds-menu-gutter,0.25rem)]"',
    'Bx="-mt-[var(--cds-menu-gutter,0.25rem)] shrink-0 px-[var(--cds-menu-gutter,0.25rem)] pb-[var(--cds-menu-gutter,0.25rem)]"',
    'calc(${r} * ${Vx} + ${e?"var(--cds-menu-gutter, 0.25rem) + 0.25rem":"2 * var(--cds-menu-gutter, 0.25rem)"})']);

  // (b) local: the pinned design snapshot is 2.42304.0, index.html links the same-hash sheets, and each served copy is
  // the original byte for byte but for the relative font url()s — so every token count above holds for what loads.
  assert.equal(designVersion, '2.42304.0'); assert.equal(designSnapshot, 'installed-2.42304.0-20261017');
  assert.ok(designStylesheets.includes(OFFICIAL_CSS));
  const html = local('index.html');
  for (const name of designStylesheets) {
    assert.equal(count(html, `<link rel="stylesheet" href="/assets/v1/${name}" />`), 1, name);
    assert.equal(local(`public/assets/v1/${name}`), asServed(official(name)), name);
  }
  for (const [token, n] of Object.entries(TOKENS)) assert.equal(count(local(LOCAL_CSS), token), n, `served ${token}`);
  // Nothing local redefines the tokens or still uses the removed radius.
  const files = [...sources(['.css', '.jsx', '.js', '.mjs'], { generated: false }), 'index.html', 'public/assets/legacy-utilities.css', 'public/assets/current-chat/layout.css'];
  for (const pattern of [/--cds-menu-gutter\s*:/, /--control-ink\s*:/, /--frame-row-h\s*:/, /radius-4xl/, /rounded-4xl/])
    assert.deepEqual(files.filter(rel => pattern.test(local(rel))), [], String(pattern));
  // source-menu.css restates zx / Bx with the same .25rem fallback, and menuListMaxHeight is Hx's template.
  const menuCss = local('src/source-menu.css');
  once(menuCss, ['.smenu-frame-header { flex-shrink: 0; padding: var(--cds-menu-gutter, .25rem) var(--cds-menu-gutter, .25rem) 0; }',
    'margin-top: calc(-1 * var(--cds-menu-gutter, .25rem));', 'padding: 0 var(--cds-menu-gutter, .25rem) var(--cds-menu-gutter, .25rem);']);
  once(local('src/source-menu.jsx'), ['const MENU_ROW_HEIGHT = "max(var(--cds-h-control), var(--cds-leading-body))";',
    'return `calc(${maxVisibleItems} * ${MENU_ROW_HEIGHT} + ${hasHeader ? "var(--cds-menu-gutter, 0.25rem) + 0.25rem" : "2 * var(--cds-menu-gutter, 0.25rem)"})`;']);
  once(frame, ['Vx="max(var(--cds-h-control), var(--cds-leading-body))"']);
});

// ---- global-11 ------------------------------------------------------------------------------------------------------

test('global-11 forced colors: the official base rule hides a resting button / link outline; the served cascade lets it decide', () => {
  // (a) 2.42304.0 c6a992d55 @layer base: a transparent 2px outline on every control (so focus can animate it in), and
  // under forced colors (where the transparent colour would be forced visible) no resting outline on a button or link.
  const css = official(OFFICIAL_CSS);
  const RULE = '@media (forced-colors:active){.can-focus:not(:where(input,textarea,:focus-visible)),a:not(:where(:focus-visible)),button:not(:where(:focus-visible)){outline-style:none}}';
  once(css, ['.can-focus,a,button,input,textarea{outline:2px solid hsla(var(--accent-100) / 0%);outline-offset:2px}' + RULE]);
  assert.equal(count(css, 'button:not(:where(:focus-visible)){outline-style:none}'), 1);
  assert.ok(css.indexOf(RULE) > css.indexOf('@layer base{') && css.indexOf(RULE) < css.indexOf('@layer components{'), 'in @layer base');

  // (b) local: the rule is in the served copy, and the cascade over every loaded sheet — with (forced-colors:active)
  // emulated true and (forced-colors:none) false in each sheet — resolves a resting button and link to that rule.
  assert.equal(count(local(LOCAL_CSS), RULE), 1);
  const forced = code => code.replace(/\(\s*forced-colors\s*:\s*active\s*\)/g, '(prefers-color-scheme:light)')
    .replace(/\(\s*forced-colors\s*:\s*none\s*\)/g, '(prefers-color-scheme:dark)');
  const forcedCascade = loadCascade(appSheets(app).map(sheet => sheet.code.includes('forced-colors') ? { ...sheet, code: forced(sheet.code) } : sheet));
  for (const [tag, attrs] of [['button', { type: 'button' }], ['a', { href: '#fixture' }]]) {
    const resting = append(documentRoot(), element(tag, attrs));
    const normal = computed(shipped(), resting, 'outline-style');
    assert.equal(normal.value, 'outline(2px solid hsla(var(--accent-100) / 0%))', `${tag} without forced colors`);
    const hidden = computed(forcedCascade, resting, 'outline-style');
    assert.equal(hidden.value, 'none', `${tag} under forced colors → ${hidden.value} from ${hidden.from?.sheet}`);
    assert.equal(hidden.from.sheet, LOCAL_CSS); assert.equal(hidden.from.layer, 'base');
    const focused = append(documentRoot(), element(tag, attrs)); setState(focused, ['focus-visible']);
    assert.equal(computed(forcedCascade, focused, 'outline-style').value, 'outline(2px solid hsl(var(--accent-100)))', `${tag}:focus-visible keeps its ring`);
  }
  // No local sheet gives a resting button or link (type selector, or role=button) a visible outline of its own that
  // would bring the forced-colours outline back (rules under :focus* are the focus ring, not a resting outline).
  const splitTop = text => { const parts = []; let depth = 0, cur = ''; for (const ch of text) { depth += ch === '(' ? 1 : ch === ')' ? -1 : 0; if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch; } return [...parts, cur.trim()].filter(Boolean); };
  const offenders = [];
  for (const rel of fs.readdirSync(path.join(app, 'src')).filter(name => name.endsWith('.css')).map(name => `src/${name}`)) {
    for (const [, selector, body] of stripComments(local(rel)).matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
      const visible = [...body.matchAll(/(?:^|;)\s*outline(?:-style)?\s*:\s*([^;]+)/g)].map(match => match[1].trim())
        .filter(value => !/^(none|0|0px|revert-layer|inherit|unset|initial)(\s*!important)?$/.test(value));
      if (!visible.length) continue;
      for (const part of splitTop(selector.trim()))
        if (!/:focus/.test(part) && /(^|[\s>+~(])(button|a)(?=$|[\s.:#[>+~)])|\[role="?button"?\]/.test(part)) offenders.push(`${rel}: ${part}`);
    }
  }
  assert.deepEqual(offenders, []);
});

// ---- global-13 ------------------------------------------------------------------------------------------------------

// Equivalent since R4e-small: the official inheritColor TextLink rests at 35% (vd). Since R4g-routines RTC (CW-1) the
// Cowork page renders the 2.42304.0 routine form (cowork-scheduled c97b955f1 Ca), whose four inheritColor links are the
// official shared-frame Cd itself (with its target / rel and "(opens in new tab)" note); the page host hands their clicks
// to the host's external opener. FormLink (still exported for the old graphs) emits the same class string. Default
// (non-inheritColor) links are aligned as before. (SSR markup, click and cascade checks: tests/r4e-small-routine-link.test.mjs.)
test('global-13 TextLink inheritColor: official vd rests at 35%; the local routine form\'s inheritColor links (FormLink) carry _d + vd', () => {
  // (a) 2.42304.0 shared-frame Cd (TextLink, exported as Xc; md = the inheritColor provider, exported as Zc).
  const frame = official('shared-frame-BfjMqbuN.js');
  const VD = 'vd="text-inherit [transition-property:text-decoration-color,box-shadow] [&:not(:hover,:focus-visible)]:[--_text-link-line:color-mix(in_srgb,currentColor,transparent_35%)]"';
  once(frame, ['hd="cds-reset cds-text-link",gd="cds-text-link-underline",_d=`${hd} ${gd} inline`,' + VD, 'f=W(pd),p=a??f',
    'X(b?Y(bd,n?"gap-[0.25em]":"gap-0"):_d,p&&vd)', 'Cd as Xc', 'md as Zc']);
  const css = official(OFFICIAL_CSS);
  once(css, ['.\\[\\&\\:not\\(\\:hover\\,\\:focus-visible\\)\\]\\:\\[--_text-link-line\\:color-mix\\(in_srgb\\,currentColor\\,transparent_35\\%\\)\\]:not(:hover,:focus-visible){--_text-link-line:color-mix(in srgb,currentColor,transparent 35%)}',
    ':where(.cds-root) .cds-text-link{color:var(--cds-text-accent);--_text-link-line:color-mix(in srgb, currentColor, transparent 60%);',
    ':where(.cds-root) .cds-text-link:is(:hover,:focus-visible){--_text-link-line:currentColor}']);
  // The audit's three cc43287c9 callers (remote control Learn more, draft group Don't add, the environment hint) …
  assert.equal(count(official('cc43287c9-DAfOi8yP.js'), 'inheritColor:!0'), 3);
  // … and the routine form c97b955f1: TextLink as Zt, four inheritColor links ("See safe use tips" in the auto /
  // skip notices, the header link).
  const routine = official('c97b955f1-BlGH1qrk.js');
  once(routine, ['Xc as Zt', '"data-testid":"routine-auto-notice",children:s(A,{defaultMessage:"For this task, Claude will work and use connectors without pausing for approval. <link>See safe use tips</link>"']);
  assert.equal(count(routine, 'inheritColor:!0'), 4);
  assert.equal(count(routine, '(Zt,{external:!0,inheritColor:!0,href:'), 3);

  // (b) local, aligned part: the hand-written default links restate .cds-text-link's 60% rest / currentColor hover.
  for (const [rel, rest, hover] of [
    ['src/source-plan-card.css', 'color: var(--cds-text-accent); --_text-link-line: color-mix(in srgb, currentColor, transparent 60%);', '.spc-open-plan:is(:hover, :focus-visible) { --_text-link-line: currentColor; }'],
    ['src/source-bypass-permission.css', 'color:var(--cds-text-accent);--_text-link-line:color-mix(in srgb,currentColor,transparent 60%);', '.source-bypass-dialog .source-bypass-link:is(:hover,:focus-visible){--_text-link-line:currentColor}'],
  ]) { once(local(rel), [rest, hover]); assert.equal(count(local(rel), 'transparent 35%'), 0, rel); }
  // (b) local, the routine form: the generated 2.42304.0 routine form (cowork-scheduled, mounted by source-routines.jsx
  // through source-routine-cowork-page-adapters.jsx) takes the official TextLink Cd as Zt and passes inheritColor at four sites.
  const form = local('src/generated/cowork-scheduled/c97b955f1-BlGH1qrk.mjs');
  // D1/D46 (R4i-graph GR3 published CdsTextLink = shared-frame Cd): cowork-scheduled now imports the TextLink by its
  // semantic name from view-tabs instead of slicing its own shared-frame copy; same original binding Cd.
  once(form, ['  CdsTextLink as Zt,', 's(Zt, { external: !0, inheritColor: !0, href: ue, children: e });']);
  assert.equal(count(form, 'inheritColor: !0'), 4);
  once(local('src/source-routines.jsx'), ["CoworkUpsertScheduledTaskModal as OriginalRoutineForm } from './source-routine-cowork-page-adapters.jsx';"]);
  once(local('src/source-routine-cowork-page-adapters.jsx'), ["import { ScheduledTaskDetail, UpsertScheduledTaskModal } from './generated/cowork-scheduled/index.mjs';"]);
  const adapters = local('src/source-routine-form-adapters.jsx');
  const formLink = adapters.slice(adapters.indexOf('export const TEXT_LINK_CLASS ='), adapters.indexOf('export const useNoRoutineReview'));
  // The lines that decide the link's look: the official _d and vd strings (read from shared-frame above), joined as Cd's
  // X(X(_d, p && vd), "cursor-pointer", className), plus Cd's data-inherit-color stamp.
  const officialVd = frame.match(/,vd="([^"]+)"/)[1];
  once(formLink, [
    "export const TEXT_LINK_CLASS = 'cds-reset cds-text-link cds-text-link-underline inline';",
    `export const TEXT_LINK_INHERIT_COLOR_CLASS = '${officialVd}';`,
    "[TEXT_LINK_CLASS, inheritColor && TEXT_LINK_INHERIT_COLOR_CLASS, 'cursor-pointer', className].filter(Boolean).join(' ')",
    'data-cds="TextLink" data-inherit-color={inheritColor ? \'\' : undefined} href={href} className={formLinkClassName(inheritColor, className)}',
  ]);
  assert.match(officialVd, /transparent_35%\)\]$/);
  // The old hand-written look (Tailwind underline at 2px offset, text-inherit / text-link) is gone.
  assert.doesNotMatch(formLink, /underline-offset-2|'text-link'/);
  // The served c6a992d55 already compiles every class vd and _d need, so FormLink only has to emit them.
  for (const rule of ['.\\[\\&\\:not\\(\\:hover\\,\\:focus-visible\\)\\]\\:\\[--_text-link-line\\:color-mix\\(in_srgb\\,currentColor\\,transparent_35\\%\\)\\]:not(:hover,:focus-visible){',
    '.\\[transition-property\\:text-decoration-color\\,box-shadow\\]{', '.text-inherit{', ':where(.cds-root) .cds-text-link-underline{'])
    assert.equal(count(local(LOCAL_CSS), rule), 1, rule);
});

// ---- global-14 ------------------------------------------------------------------------------------------------------

test('global-14 F6 regions: composer stops skip [data-turn-next], the content ring is logical; locally neither has a target', () => {
  // (a) 2.42304.0 ca1d33d05 (also in 2.37337.1): vt drops waiting-card stops inside a proposed task or the turn-next
  // row, the composer landing goes through it, and the .dframe-content landing ring starts after the sidebar with
  // inset-inline-start.
  const regions = official('ca1d33d05-BYDNb5Fu.js');
  once(regions, ['function vt(e){return[...new Set(e.flatMap(z))].filter(e=>e.closest("[data-proposed-task-state], [data-turn-next]")===null)}',
    'let s=o(()=>vt(i()).filter(e=>!B(e)),[i])', 'landing:()=>bt(q(K(e.current)),s())',
    '.dframe-root:not([data-collapsed]):not([data-experiment]) .dframe-content[data-focus-region-landing]:focus:after{inset-inline-start:calc(var(--df-sidebar-width) + var(--df-sidebar-left) + 2px)}']);
  assert.equal(count(regions, '[data-turn-next]'), 1);
  once(read(path.join(previous, 'ion-dist/assets/v1/ca1d33d05-BwRPnP7R.js')), ['e.closest("[data-proposed-task-state], [data-turn-next]")===null']);
  once(regions, ['var S=["navigation","discoveryScreen","header","conversation","main","question","composer","sidePanel","artifact","overview","activity","sessionDetails","preview","terminal","tile","projectKnowledge"]']);

  // (b) local: since R4f/R4g only the generated originals render the targets (the proposal group card and the turn box);
  // no host-written module does, and the composer stop collects no waiting-card candidates, so the exclusion still has
  // nothing of the host's to exclude …
  const code = sources(['.jsx', '.js', '.mjs', '.cjs']);
  assert.deepEqual(code.filter(rel => /data-turn-next|data-proposed-task-state/.test(local(rel)) && !/(^|\/)generated\//.test(rel)), []);
  // … the composer stop is the editor's own marker (no waiting-card candidates are collected) …
  once(local('src/source-composer.jsx'), ['data-focus-region={disabled ? undefined : "composer"} data-focus-region-order="pane" data-focus-region-clear-on-input="" data-focus-region-holds=".epitaxy-prompt"']);
  const hook = local('src/use-focus-regions.js');
  once(hook, ['const landings = [...doc.querySelectorAll("[data-focus-region]")]']);
  assert.doesNotMatch(hook, /waiting|turn-next|proposed-task/);
  const stops = orderStops([{ region: 'main', instance: '', index: 0 }, { region: 'composer', instance: 'pane0:', index: 1, order: [0, 0, 0] },
    { region: 'navigation', instance: '', index: 2 }]);
  assert.deepEqual(stops.map(stop => stop.id), ['navigation:', 'main:', 'composer:pane0:']);
  // The local region order is S without "artifact" (no artifact region locally); composer keeps its place after the
  // pass-through question stop.
  assert.deepEqual(REGION_ORDER, ['navigation', 'discoveryScreen', 'header', 'conversation', 'main', 'question', 'composer', 'sidePanel', 'overview',
    'activity', 'sessionDetails', 'preview', 'terminal', 'tile', 'projectKnowledge']);
  assert.ok(PASS_THROUGH_REGIONS.has('question'));
  // … and no element carries the dframe-content class (the local "main" landing is source-split-view's .split-host),
  // so the .dframe-content ring rules, logical or physical, never apply. focus-regions.css is the inline sheet's
  // generic landing rules verbatim and stops before them.
  assert.deepEqual(code.filter(rel => /(?<![.\w-])dframe-content(?![\w-])/.test(local(rel))), []);
  once(local('src/source-split-view.jsx'), ['className="split-host dframe-pane-host" data-focus-region="main"']);
  const sheet = regions.slice(regions.indexOf('("cdc7c802e",\'') + 14);
  const generic = sheet.slice(0, sheet.indexOf('.dframe-content['));
  const normalize = css => stripComments(css).replace(/::after/g, ':after').replace(/="([\w-]+)"/g, '=$1')
    .replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1').replace(/;}/g, '}').trim();
  const focusCss = local('src/focus-regions.css');
  assert.equal(normalize(focusCss), normalize(generic));
  assert.doesNotMatch(stripComments(focusCss), /dframe-content|(^|[;{\s])(left|right)\s*:/);
});
