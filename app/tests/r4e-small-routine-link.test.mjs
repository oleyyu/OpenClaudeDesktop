// R4e-small global-13: the routine form's inheritColor links render the 2.42304.0 CDS TextLink class string (shared-frame
// Cd: _d + vd, so the underline rests at 35%) through the host FormLink adapter; the click still goes to the host's
// external opener. view-tabs has no TextLink semantic name, so the adapter restates the class strings and this file
// pins them against the official chunk. Vite SSR + the CSS cascade fixture; no browser, no GUI, no network.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { appSheets, append, computed, element, find, loadCascade, parseMarkup } from './fixtures/transcript-css-cascade.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const once = (text, needles) => { for (const needle of needles) assert.equal(count(text, needle), 1, needle); };
const SAFE_USE = 'https://support.claude.com/en/articles/13364135-use-claude-cowork-safely';

let server, Form, Routine;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Form = await server.ssrLoadModule('/src/source-routine-form-adapters.jsx');
  Routine = await server.ssrLoadModule('/src/source-routine-adapters.jsx');
});
after(async () => { await server?.close(); });

const h = React.createElement;
const renderLink = (props, host = { call: async () => {}, error() {} }) =>
  renderToStaticMarkup(h(Routine.RoutineContext.Provider, { value: host }, h(Form.FormLink, props, 'See safe use tips')));

test('global-13 official: shared-frame Cd is _d plus vd for inheritColor, then cursor-pointer and the caller className', () => {
  const frame = official('shared-frame-BfjMqbuN.js');
  once(frame, [
    'var hd="cds-reset cds-text-link",gd="cds-text-link-underline",_d=`${hd} ${gd} inline`,vd="',
    'f=W(pd),p=a??f',
    'x=`${X(b?Y(bd,n?"gap-[0.25em]":"gap-0"):_d,p&&vd)}`',
    'C=X(x,"cursor-pointer",e)',
    '...p&&{"data-inherit-color":""}',
    'stamp:{"data-cds":"TextLink"}',
    'Cd as Xc',
  ]);
  // The adapter's two strings are the official ones, read straight out of the chunk.
  const [, hd, gd, vd] = frame.match(/var hd="([^"]+)",gd="([^"]+)",_d=`\$\{hd\} \$\{gd\} inline`,vd="([^"]+)"/);
  assert.equal(Form.TEXT_LINK_CLASS, `${hd} ${gd} inline`);
  assert.equal(Form.TEXT_LINK_INHERIT_COLOR_CLASS, vd);
  assert.match(vd, /transparent_35%\)\]$/);
  // The routine form takes TextLink as Zt and passes inheritColor at four sites (three with an external href).
  const routine = official('c97b955f1-BlGH1qrk.js');
  once(routine, ['Xc as Zt']);
  assert.equal(count(routine, 'inheritColor:!0'), 4);
  assert.equal(count(routine, '(Zt,{external:!0,inheritColor:!0,href:'), 3);
});

test('global-13 local: the 2.42304.0 routine form renders the official TextLink for its four inheritColor links; FormLink emits the same classes', async () => {
  // R4g-routines RTC (CW-1): the Cowork page now renders cowork-scheduled c97b955f1 Ca, which takes the official shared-frame
  // Cd (TextLink) as Zt itself; the old 2.31226.0 form (and its FormLink adapter) is no longer on the page.
  const form = local('src/generated/cowork-scheduled/c97b955f1-BlGH1qrk.mjs');
  // D1/D46 (R4i-graph GR3 published CdsTextLink = shared-frame Cd): cowork-scheduled now imports the TextLink by its
  // semantic name from view-tabs instead of slicing its own shared-frame copy; same original binding Cd.
  once(form, ['  CdsTextLink as Zt,']);
  assert.match(form, /  CdsTextLink as Zt,\n[^}]*\} from "\.\.\/view-tabs\/shared-frame-BfjMqbuN\.js";/);
  const viewTabs = JSON.parse(local('src/generated/view-tabs/manifest.json'));
  assert.deepEqual([viewTabs.publicNames.CdsTextLink.file, viewTabs.publicNames.CdsTextLink.local], ['shared-frame-BfjMqbuN.js', 'Cd']);
  assert.equal(count(form, 'inheritColor: !0'), 4);
  assert.equal(count(form, `href: "${SAFE_USE}",`), 2);
  const Frame = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
  const official = renderToStaticMarkup(h(Frame.CdsTextLink, { external: true, inheritColor: true, href: SAFE_USE }, 'See safe use tips'));
  const attrClass = text => text.replaceAll('&', '&amp;');
  assert.match(official, new RegExp(`^<a data-cds="TextLink" data-inherit-color="" aria-describedby="[^"]+" href="${SAFE_USE}" target="_blank" rel="noopener" class="`));
  assert.ok(official.includes(`class="${attrClass(`${Form.TEXT_LINK_CLASS} ${Form.TEXT_LINK_INHERIT_COLOR_CLASS}`)} cursor-pointer"`));
  // The notice links (routine-auto-notice / -skip-notice "See safe use tips"), exactly as the generated form calls them.
  const html = renderLink({ external: true, inheritColor: true, href: SAFE_USE });
  const attr = text => text.replaceAll('&', '&amp;');
  assert.equal(html, `<a data-cds="TextLink" data-inherit-color="" href="${SAFE_USE}" class="${attr(`${Form.TEXT_LINK_CLASS} ${Form.TEXT_LINK_INHERIT_COLOR_CLASS}`)} cursor-pointer">See safe use tips</a>`);
  // The header link's caller className follows cursor-pointer, as in X(x,"cursor-pointer",e).
  const header = renderLink({ inheritColor: true, href: SAFE_USE, className: 'hover:text-primary aria-disabled:pointer-events-none aria-disabled:opacity-disabled' });
  assert.match(header, /class="cds-reset cds-text-link cds-text-link-underline inline text-inherit [^"]+ cursor-pointer hover:text-primary aria-disabled:pointer-events-none aria-disabled:opacity-disabled"/);
  // Without inheritColor it is plain _d (no vd, no data-inherit-color), the official default link.
  const plain = renderLink({ href: SAFE_USE });
  assert.match(plain, /^<a data-cds="TextLink" href="[^"]+" class="cds-reset cds-text-link cds-text-link-underline inline cursor-pointer">/);
  assert.doesNotMatch(plain, /text-inherit|transparent_35|data-inherit-color/);
  // The old hand-written look (Tailwind underline underline-offset-2 + text-inherit / text-link) is gone.
  const classList = html.match(/class="([^"]+)"/)[1].split(' ');
  for (const old of ['underline', 'underline-offset-2', 'text-link']) assert.equal(classList.includes(old), false, old);
});

test('global-13 local: the click still opens the link through the host (no navigation inside the app)', async () => {
  const calls = [], errors = [];
  const host = { call: async (name, payload) => { calls.push([name, payload]); }, error: message => errors.push(message) };
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = { useContext: () => host };
  let link;
  try { link = Form.FormLink({ external: true, inheritColor: true, href: SAFE_USE, children: 'See safe use tips' }); } finally { internal.H = old; }
  let prevented = false;
  link.props.onClick({ preventDefault() { prevented = true; } });
  await Promise.resolve();
  assert.equal(prevented, true);
  assert.deepEqual(calls, [['external', { url: SAFE_USE }]]);
  assert.deepEqual(errors, []);
});

test('global-13 local cascade: over every loaded sheet the inheritColor link takes its parent\'s colour and a pointer cursor', () => {
  const cascade = loadCascade(appSheets(app));
  const html = element('html', { class: 'cds-root', 'data-theme': 'claude', 'data-mode': 'system', 'data-density': 'comfortable',
    'data-platform': 'desktop', 'data-color-version': 'v2', 'data-dframe': '' });
  const root = append(append(html, element('body')), element('div', { id: 'root' }));
  // The form's notice row colour (the generated form's header row is "text-footnote text-muted").
  const row = append(root, element('div', { class: 'mb-4 flex items-center gap-1.5 text-footnote text-muted' }));
  const rowColor = computed(cascade, row, 'color');
  const [inherit] = parseMarkup(renderLink({ external: true, inheritColor: true, href: SAFE_USE }));
  append(row, inherit);
  const color = computed(cascade, inherit, 'color');
  assert.equal(color.value, rowColor.value, `inheritColor link colour → ${color.value}`);
  // Decided on the link by the official .text-inherit utility (vd), which beats the .cds-text-link accent colour.
  assert.equal(color.inheritedFrom, row);
  assert.equal(color.via.value, 'inherit');
  assert.equal(color.via.sheet, 'public/assets/v1/c6a992d55-sXiDGMFQ.css');
  assert.equal(color.via.layer, 'utilities');
  assert.equal(computed(cascade, inherit, 'cursor').value, 'pointer');
  // The default link keeps .cds-text-link's accent colour.
  const [plain] = parseMarkup(renderLink({ href: SAFE_USE }));
  append(row, plain);
  assert.equal(computed(cascade, plain, 'color').value, 'var(--cds-text-accent)');
  // The 35% rest is the vd utility the served sheet compiles; it applies while not hovered / focus-visible, and the
  // .cds-text-link hover rule puts the line back to currentColor.
  const css = local('public/assets/v1/c6a992d55-sXiDGMFQ.css');
  once(css, ['.\\[\\&\\:not\\(\\:hover\\,\\:focus-visible\\)\\]\\:\\[--_text-link-line\\:color-mix\\(in_srgb\\,currentColor\\,transparent_35\\%\\)\\]:not(:hover,:focus-visible){--_text-link-line:color-mix(in srgb,currentColor,transparent 35%)}',
    ':where(.cds-root) .cds-text-link:is(:hover,:focus-visible){--_text-link-line:currentColor}']);
  assert.ok(find([inherit], node => node.attrs?.class?.split(' ').includes('[&:not(:hover,:focus-visible)]:[--_text-link-line:color-mix(in_srgb,currentColor,transparent_35%)]')));
});
