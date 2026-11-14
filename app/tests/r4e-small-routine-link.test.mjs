// R4e-small global-13: the routine form's inheritColor links render the CDS TextLink class string (3.6556.2 shared-frame
// _f: df + ff, so the underline rests at 35%; the same strings as 2.42304.0 Cd's _d + vd). The 3.6556.2 routine form
// (cowork-scheduled c97b955f1) renders the official view-tabs CdsTextLink itself; the host FormLink restatement of the
// retired 2.31226.0 form had no importer and was deleted by w10-cleanup-final (with its click-through-host check), so
// the class strings are read straight out of the chunk here. Vite SSR + the CSS cascade fixture; no browser, no GUI,
// no network.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { appSheets, append, computed, element, find, loadCascade, parseMarkup } from './fixtures/transcript-css-cascade.mjs';
import { ionSource, referenceVersion, sharedFrame } from '../scripts/official-3.6556.2.mjs';
import { designEntryStylesheets } from '../scripts/current-design-assets.mjs';
// design-production (4.16336.0): the loaded c6a992d55 entry sheet, named by current-design-assets.
const UTILITIES_CSS = designEntryStylesheets.find(name => name.startsWith('c6a992d55-'));

const app = path.resolve(import.meta.dirname, '..');
const official = name => fs.readFileSync(path.join(ionSource, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
// 3.6556.2 (w3-cowork-scheduled): the routine form module is looked up by its stable chunk prefix in the cowork-scheduled
// manifest, so the content hash in the file name is not restated here.
const coworkModule = prefix => {
  const manifest = JSON.parse(local('src/generated/cowork-scheduled/manifest.json'));
  assert.equal(manifest.referenceVersion, referenceVersion);
  const hits = manifest.modules.filter(entry => entry.source.startsWith(`${prefix}-`));
  assert.equal(hits.length, 1, prefix);
  return hits[0];
};
const count = (text, needle) => text.split(needle).length - 1;
const once = (text, needles) => { for (const needle of needles) assert.equal(count(text, needle), 1, needle); };
const SAFE_USE = 'https://support.claude.com/en/articles/13364135-use-claude-cowork-safely';

// df / ff of the official chunk: the TextLink base class string and the inheritColor addition.
const [, lf, uf, ff] = official(sharedFrame).match(/var lf="([^"]+)",uf="([^"]+)",df=`\$\{lf\} \$\{uf\} inline`,ff="([^"]+)"/);
const TEXT_LINK_CLASS = `${lf} ${uf} inline`, TEXT_LINK_INHERIT_COLOR_CLASS = ff;

let server, Frame;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Frame = await server.ssrLoadModule(`/src/generated/view-tabs/${sharedFrame}`);
});
after(async () => { await server?.close(); });

const h = React.createElement;
const renderLink = props => renderToStaticMarkup(h(Frame.CdsTextLink, props, 'See safe use tips'));

test('global-13 official: 3.6556.2 shared-frame _f is df plus ff for inheritColor, then cursor-pointer and the caller className', () => {
  const frame = official(sharedFrame);
  once(frame, [
    'var lf="cds-reset cds-text-link",uf="cds-text-link-underline",df=`${lf} ${uf} inline`,ff="',
    'var _f=X((e,t)=>{',
    'm=J(sf),h=s??m',
    'Q(C?c(mf,i?"gap-[0.25em]":"gap-0"):df,h&&ff)',
    'Q(w,"cursor-pointer",n)',
    'h&&{"data-inherit-color":""}',
    '{"data-cds":"TextLink"}',
    '_f as hu',
  ]);
  assert.equal(TEXT_LINK_CLASS, 'cds-reset cds-text-link cds-text-link-underline inline');
  assert.match(ff, /^text-inherit /);
  assert.match(ff, /transparent_35%\)\]$/);
  // The routine form takes TextLink as oe and passes inheritColor at four sites (three with an external href).
  const routine = official(coworkModule('c97b955f1').source);
  once(routine, ['hu as oe']);
  assert.equal(count(routine, 'inheritColor:!0'), 4);
  assert.equal(count(routine, '(oe,{external:!0,inheritColor:!0,href:'), 3);
});

test('global-13 local: the 3.6556.2 routine form renders the official TextLink for its four inheritColor links', async () => {
  // R4g-routines RTC (CW-1): the Cowork page renders cowork-scheduled c97b955f1 (3.6556.2 La), which takes the official
  // shared-frame TextLink (3.6556.2 _f) as oe itself; the old 2.31226.0 form is no longer on the page.
  const form = local(`src/generated/cowork-scheduled/${coworkModule('c97b955f1').target}`);
  // D1/D46: cowork-scheduled imports the TextLink by its semantic name from the concrete view-tabs file (R6).
  once(form, ['  CdsTextLink as oe,']);
  assert.match(form, new RegExp(`  CdsTextLink as oe,\\n[^}]*\\} from "\\.\\./view-tabs/${sharedFrame.replaceAll('.', '\\.')}";`));
  const viewTabs = JSON.parse(local('src/generated/view-tabs/manifest.json'));
  assert.equal(viewTabs.referenceVersion, referenceVersion);
  assert.deepEqual([viewTabs.publicNames.CdsTextLink.file, viewTabs.publicNames.CdsTextLink.local], [sharedFrame, '_f']);
  assert.equal(count(form, 'inheritColor: !0'), 4);
  assert.equal(count(form, `href: "${SAFE_USE}",`), 2);
  // The notice links (routine-auto-notice / -skip-notice "See safe use tips"), exactly as the generated form calls them.
  const html = renderLink({ external: true, inheritColor: true, href: SAFE_USE });
  const attrClass = text => text.replaceAll('&', '&amp;');
  assert.match(html, new RegExp(`^<a data-cds="TextLink" data-inherit-color="" aria-describedby="[^"]+" href="${SAFE_USE}" target="_blank" rel="noopener" class="`));
  assert.ok(html.includes(`class="${attrClass(`${TEXT_LINK_CLASS} ${TEXT_LINK_INHERIT_COLOR_CLASS}`)} cursor-pointer"`));
  // The header link's caller className follows cursor-pointer, as in Q(w,"cursor-pointer",n).
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
  assert.equal(color.via.sheet, `public/assets/v1/${UTILITIES_CSS}`);
  assert.equal(color.via.layer, 'utilities');
  assert.equal(computed(cascade, inherit, 'cursor').value, 'pointer');
  // The default link keeps .cds-text-link's accent colour. design-production: 4.16336.0's rule reads the accent through
  // the optional --cds-text-link-color token (var(--cds-text-link-color,var(--cds-text-accent))); nothing on the plain
  // link or its ancestors sets that token, so it falls back to the accent.
  const [plain] = parseMarkup(renderLink({ href: SAFE_USE }));
  append(row, plain);
  const LINK_COLOR = 'var(--cds-text-link-color, var(--cds-text-accent))';
  assert.ok(local(`public/assets/v1/${UTILITIES_CSS}`).includes(':where(.cds-root) .cds-text-link{color:var(--cds-text-link-color,var(--cds-text-accent));'));
  const plainColor = computed(cascade, plain, 'color');
  assert.equal(plainColor.value, LINK_COLOR);
  assert.equal(plainColor.from.sheet, `public/assets/v1/${UTILITIES_CSS}`);
  // Every loaded declaration of the token is an arbitrary-property utility class `[--cds-text-link-color:…]` (bare or
  // variant-prefixed), and neither the plain link nor its ancestors carry one.
  const setters = [];
  for (const sheet of appSheets(app)) {
    for (const match of sheet.code.matchAll(/([^{};]*)\{[^{}]*?(?<![\w-])--cds-text-link-color:/g)) {
      const selector = match[1].trim();
      setters.push(selector);
      assert.match(selector, /^\.(?:[\w-]+\\:)*\\\[--cds-text-link-color\\:/, `${sheet.name}: ${selector.slice(0, 120)}`);
    }
  }
  assert.ok(setters.length > 0);
  for (const node of [plain, row, root])
    assert.equal((node.attrs?.class ?? '').split(' ').some(name => name.includes('[--cds-text-link-color:')), false, node.attrs?.class);
  // The 35% rest is the vd utility the served sheet compiles; it applies while not hovered / focus-visible, and the
  // .cds-text-link hover rule puts the line back to currentColor.
  const css = local(`public/assets/v1/${UTILITIES_CSS}`);
  once(css, ['.\\[\\&\\:not\\(\\:hover\\,\\:focus-visible\\)\\]\\:\\[--_text-link-line\\:color-mix\\(in_srgb\\,currentColor\\,transparent_35\\%\\)\\]:not(:hover,:focus-visible){--_text-link-line:color-mix(in srgb,currentColor,transparent 35%)}',
    ':where(.cds-root) .cds-text-link:is(:hover,:focus-visible){--_text-link-line:currentColor}']);
  assert.ok(find([inherit], node => node.attrs?.class?.split(' ').includes('[&:not(:hover,:focus-visible)]:[--_text-link-line:color-mix(in_srgb,currentColor,transparent_35%)]')));
});
