import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { THEME_DEFAULT } from '../electron/prefs/theme.mjs';
import { THEME_PRESETS, THEME_STYLE_ID, ROOT_PROPS, RADIUS_BASE, themePreset, presetValue, themeRootStyle, themeCss, hslTriplet, mixHex, accentFamily, applyCustomTheme, themeDensity,
  exportThemeFile, importThemeFile, onAccent, relativeLuminance, fontStack, fontFamilies, loadFontFamilies, FALLBACK_FONTS, parseHex, FONT_SCALE_OPTIONS } from '../src/theme-custom-model.mjs';

const app = path.resolve(import.meta.dirname, '..');

test('presets: the seven built-ins are full, valid customTheme objects', () => {
  assert.deepEqual(THEME_PRESETS.map(entry => entry.id), ['default', 'deepseek', 'clay', 'forest', 'grape', 'sharp', 'rounded']);
  for (const entry of THEME_PRESETS) assert.deepEqual(Object.keys(entry.theme).sort(), Object.keys(THEME_DEFAULT).sort());
  assert.equal(themePreset('deepseek').theme.accent, '#4d6bfe');
  assert.equal(themePreset('sharp').theme.radiusScale, 0);
  assert.equal(themePreset('rounded').theme.radiusScale, 1.5);
  assert.equal(presetValue(undefined), 'default');
  assert.equal(presetValue(themePreset('clay').theme), 'clay');
  assert.equal(presetValue({ ...themePreset('clay').theme, density: 'comfortable' }), 'custom', 'an edited preset reads as Custom');
  assert.equal(presetValue({ preset: 'custom', accent: '#123456' }), 'custom');
  assert.equal(presetValue({ preset: 'custom' }), 'default');
});

test('the radius base values match the loaded design-system CSS', () => {
  const dir = path.join(app, 'public/assets/v1'), css = readFileSync(path.join(dir, readdirSync(dir).find(name => /^c6a992d55-.*\.css$/.test(name))), 'utf8');
  const block = selector => css.slice(css.indexOf(selector) + selector.length).split('}')[0];
  const compact = '--cds-radius--xs' + block('.cds-root{--cds-radius--xs'), comfortable = '--cds-radius--xs' + block('.cds-root[data-density=comfortable]{--cds-radius--xs');
  const value = (text, prop) => Number(new RegExp(`(?:^|;)${prop}:calc\\((\\.?[\\d.]+)rem`).exec(text)?.[1]);
  for (const prop of ['--cds-radius--sm', '--cds-radius--lg']) {
    assert.equal(value(compact, prop), RADIUS_BASE.compact[prop], prop);
    assert.equal(value(comfortable, prop), RADIUS_BASE.comfortable[prop], prop);
  }
  assert.equal(value(comfortable, '--cds-radius--xs'), RADIUS_BASE.comfortable['--cds-radius--xs']);
  assert.match(css, /--cds-radius--xs:calc\(\.3125rem \* var\(--cds-rem-scale,1\)\)/);
  const remScale = css.match(/--cds-rem-scale:[^;}]*/g) ?? [];
  assert.deepEqual(remScale, ['--cds-rem-scale:calc(16 / 17)'], 'the only rem-scale definition is the iOS one');
  assert.ok(css.includes('@supports (font:-apple-system-body) and (-webkit-touch-callout:default){:root{font:-apple-system-body;font-family:var(--font-ui);--cds-rem-scale:calc(16 / 17)'), 'desktop leaves --cds-rem-scale unset (1)');
  for (const [prop, rem] of Object.entries(RADIUS_BASE.tailwind)) assert.ok(css.includes(`${prop}:${String(rem).replace(/^0\./, '.')}rem`), prop);
  assert.ok(css.includes('--cds-radius-composer:calc(.75rem * var(--cds-rem-scale,1))') && css.includes('--cds-radius-composer:calc(.875rem * var(--cds-rem-scale,1))'));
});

test('themeRootStyle: nothing for the default; rem scale and a full accent role scale when set', () => {
  assert.deepEqual(themeRootStyle(undefined), {});
  assert.deepEqual(themeRootStyle({ fontScale: 1.1 }), { '--cds-rem-scale': '1.1' });
  const scales = FONT_SCALE_OPTIONS.map(fontScale => Number(themeRootStyle({ fontScale })['--cds-rem-scale'] ?? 1));
  assert.ok(Number(themeRootStyle({ fontScale: 1.05 })['--cds-rem-scale']) > 1, '105% is larger than the unscaled default');
  assert.ok(scales.every((value, i) => i === 0 || value > scales[i - 1]), 'font size options scale monotonically');
  assert.deepEqual(scales, [...FONT_SCALE_OPTIONS], 'each option scales by exactly its label');
  const style = themeRootStyle({ accent: '#4d6bfe' });
  for (const step of ['50', '100', '250', '300', '400', '600', '700', '800', '850']) assert.match(style[`--cds-role-accent-${step}`], /^color-mix\(in oklab, #4d6bfe \d+%, (white|black)\)$/, step);
  assert.equal(style['--cds-role-accent-450'], '#4d6bfe');
  assert.equal(style['--cds-role-accent-fill'], '#4d6bfe');
  assert.equal(style['--cds-role-accent-fill-hover'], 'color-mix(in oklab, #4d6bfe 85%, white)');
  assert.equal(style['--cds-role-accent-on'], '#fff');
  assert.ok(Object.keys(style).every(prop => ROOT_PROPS.includes(prop)));
  // The legacy accent family (focus outlines, link hover) follows the custom accent too.
  assert.equal(style['--accent-100'], hslTriplet('#4d6bfe'));
  assert.equal(style['--accent-200'], hslTriplet('#4d6bfe'));
});

test('hslTriplet/mixHex: the design-system HSL triplet form and white/black mixes', () => {
  assert.equal(hslTriplet('#2f855a'), '150 47.8% 35.3%');
  assert.equal(hslTriplet('#ffffff'), '0 0% 100%');
  assert.equal(hslTriplet('#ff0000'), '0 100% 50%');
  assert.equal(hslTriplet('#0000ff'), '240 100% 50%');
  assert.equal(mixHex('#2f855a', 1, 'white'), '#2f855a');
  assert.equal(mixHex('#2f855a', 0, 'black'), '#000000');
  assert.equal(mixHex('#000000', 0.5, 'white'), '#808080');
  const family = accentFamily('#2f855a');
  const lightness = triplet => Number(triplet.split(' ')[2].replace('%', ''));
  assert.ok(lightness(family.light['000']) < lightness(family[100]) && lightness(family.dark['000']) > lightness(family[100]), '000 is darker in light, lighter in dark');
  assert.ok(lightness(family.light[900]) > 80 && lightness(family.dark[900]) < 30, '900 is the tinted surface in each mode');
});

test('themeCss: a custom accent rewrites the mode-dependent accent steps and the page selection', () => {
  const css = themeCss({ accent: '#2f855a' }), family = accentFamily('#2f855a');
  assert.ok(css.includes(`html:root[data-custom-theme]{--accent-000:${family.light['000']};--accent-900:${family.light[900]};}`), '(0,2,1) beats the light v2 block');
  assert.ok(css.includes(`html:root[data-custom-theme][data-mode=dark]{--accent-000:${family.dark['000']};--accent-900:${family.dark[900]};}`), '(0,3,1) beats the dark v2 block');
  assert.ok(css.includes(':where(:root[data-custom-theme]) ::selection{background-color:color-mix(in srgb, #2f855a 30%, transparent);}'), 'zero-specificity scope keeps hideselection rules winning');
  assert.equal(themeCss({ accent: '' }), '');
});

test('onAccent picks the WCAG higher-contrast text colour', () => {
  assert.equal(relativeLuminance('#ffffff'), 1);
  assert.equal(relativeLuminance('#000000'), 0);
  assert.equal(onAccent('#2f855a'), '#fff');
  assert.equal(onAccent('#7c3aed'), '#fff');
  assert.equal(onAccent('#ffd60a'), '#000');
  assert.equal(onAccent('#a3e635'), '#000');
});

test('themeCss: font and radius rules scoped to :root[data-custom-theme], outranking density and dyslexic rules', () => {
  assert.equal(themeCss(undefined), '');
  assert.equal(themeCss({ fontScale: 1.2, density: 'comfortable' }), '', 'root inline props and data-density need no stylesheet');
  const font = themeCss({ uiFont: 'Inter, "PingFang SC", sans-serif' });
  assert.ok(font.includes('--font-ui:"Inter", "PingFang SC", sans-serif, var(--cds-font-system);'));
  assert.ok(font.includes('--cds-font-sans:"Inter", "PingFang SC", sans-serif, var(--cds-font-system);'));
  assert.ok(font.includes('html:root[data-custom-theme] .cds-root[data-font]'), '(0,4,1) beats :root[data-dyslexic-font] .cds-root[data-font=system]');
  const sharp = themeCss({ radiusScale: 0 });
  assert.match(sharp, /^:root\[data-custom-theme\],:root\[data-custom-theme\] \.cds-root\{--radius-xs:0rem;/);
  assert.ok(sharp.includes('--cds-radius-composer:calc(0rem * var(--cds-rem-scale,1));'));
  assert.ok(sharp.includes(':root[data-custom-theme][data-density=comfortable],:root[data-custom-theme] .cds-root[data-density=comfortable]{'));
  const round = themeCss({ radiusScale: 2 });
  assert.ok(round.includes('--radius-lg:1rem;') && round.includes('--cds-radius--lg:calc(0.875rem * var(--cds-rem-scale,1));') && round.includes('--cds-radius--lg:calc(1.25rem * var(--cds-rem-scale,1));'));
  assert.equal((round.match(/\{/g) || []).length, (round.match(/\}/g) || []).length);
});

test('fontStack quotes family names, keeps generic keywords bare and escapes quotes', () => {
  assert.equal(fontStack('SF Pro'), '"SF Pro"');
  assert.equal(fontStack("'Avenir Next', system-ui"), '"Avenir Next", system-ui');
  assert.equal(fontStack('A"B\\C'), '"A\\"B\\\\C"');
  assert.equal(fontStack(' , Inter ,'), '"Inter"');
});

function fakeDocument() {
  const props = new Map(), attrs = new Map(), elements = new Map();
  const head = { children: [], appendChild(el) { this.children.push(el); elements.set(el.id, el); el.remove = () => { elements.delete(el.id); head.children = head.children.filter(x => x !== el); }; } };
  return {
    props, attrs, head,
    documentElement: {
      style: { setProperty: (k, v) => props.set(k, v), removeProperty: k => props.delete(k) },
      setAttribute: (k, v) => attrs.set(k, String(v)), removeAttribute: k => attrs.delete(k),
    },
    getElementById: id => elements.get(id) ?? null,
    createElement: tag => ({ tagName: tag, id: '', textContent: '' }),
  };
}

test('applyCustomTheme sets props, attribute and stylesheet, and the default theme leaves nothing behind', () => {
  const doc = fakeDocument();
  doc.documentElement.style.setProperty('--cds-font-code', '"Menlo"'); // owned by main.jsx, never touched
  applyCustomTheme(doc, { customTheme: { preset: 'grape', accent: '#7c3aed', fontScale: 1.15, radiusScale: 1.5, uiFont: 'Inter' } });
  assert.equal(doc.attrs.get('data-custom-theme'), 'grape');
  assert.equal(doc.props.get('--cds-role-accent-fill'), '#7c3aed');
  assert.equal(doc.props.get('--cds-rem-scale'), '1.15');
  const style = doc.getElementById(THEME_STYLE_ID);
  assert.equal(style.tagName, 'style');
  assert.ok(style.textContent.includes('"Inter"') && style.textContent.includes('--radius-lg:0.75rem;'));
  applyCustomTheme(doc, { customTheme: { accent: '#7c3aed' } });
  assert.equal(doc.props.has('--cds-rem-scale'), false, 'a dropped field clears its prop');
  assert.equal(doc.props.get('--accent-100'), hslTriplet('#7c3aed'));
  assert.ok(!doc.getElementById(THEME_STYLE_ID).textContent.includes('"Inter"'), 'a dropped font leaves only the accent rules');
  applyCustomTheme(doc, { customTheme: { fontScale: 1.1 } });
  assert.equal(doc.props.has('--accent-100'), false, 'a dropped accent clears the accent family');
  assert.equal(doc.getElementById(THEME_STYLE_ID), null);
  assert.equal(doc.head.children.length, 0);
  applyCustomTheme(doc, { customTheme: null });
  assert.deepEqual([...doc.props.keys()], ['--cds-font-code']);
  assert.equal(doc.attrs.size, 0);
  applyCustomTheme(doc, {});
  applyCustomTheme(null, {});
  assert.deepEqual([...doc.props.keys()], ['--cds-font-code']);
});

test('themeDensity follows customTheme.density', () => {
  assert.equal(themeDensity(undefined), 'compact');
  assert.equal(themeDensity({ customTheme: { density: 'comfortable' } }), 'comfortable');
  assert.equal(themeDensity({ customTheme: { density: 'huge' } }), 'compact');
});

test('export → import round-trips into one settings patch', () => {
  const config = { customTheme: { preset: 'forest', accent: '#2f855a', uiFont: 'Avenir Next', fontScale: 0.9, density: 'comfortable', radiusScale: 0.5 },
    codeFont: 'JetBrains Mono', codeThemeLight: 'github-light', codeThemeDark: 'nord' };
  const file = exportThemeFile(config, 'Forest');
  assert.deepEqual(file, { format: 'code-desktop-theme', version: 1, name: 'Forest', accent: '#2f855a', uiFont: 'Avenir Next', fontScale: 0.9, density: 'comfortable', radiusScale: 0.5,
    codeFont: 'JetBrains Mono', codeThemeLight: 'github-light', codeThemeDark: 'nord' });
  const { patch, warnings, name } = importThemeFile(JSON.stringify(file));
  assert.deepEqual(warnings, []);
  assert.equal(name, 'Forest');
  assert.deepEqual(patch, { customTheme: { ...config.customTheme, preset: 'custom' }, codeFont: 'JetBrains Mono', codeThemeLight: 'github-light', codeThemeDark: 'nord' });
  assert.deepEqual(exportThemeFile({}).codeThemeLight, 'claude-light');
  assert.equal(exportThemeFile({ codeFont: 'bad;font' }).codeFont, '');
});

test('import: unknown code themes fall back with warnings; invalid files are user-facing errors', () => {
  const { patch, warnings } = importThemeFile({ format: 'code-desktop-theme', version: 1, accent: ' #ABCDEF', codeThemeLight: 'nord', codeThemeDark: 'nope', codeFont: '{x}' });
  assert.equal(patch.customTheme.accent, '#abcdef');
  assert.equal(patch.codeThemeLight, 'claude-light');
  assert.equal(patch.codeThemeDark, 'claude-dark');
  assert.equal(patch.codeFont, '');
  assert.equal(warnings.length, 3);
  assert.match(warnings[1], /Unknown light code theme “nord”; using Claude Light/);
  assert.equal('codeThemeLight' in importThemeFile({ format: 'code-desktop-theme', version: 1 }).patch, false, 'absent keys are left alone');
  assert.throws(() => importThemeFile('{'), /valid JSON/);
  assert.throws(() => importThemeFile({ format: 'vscode-theme', version: 1 }), /OpenClaude Desktop theme file/);
  assert.throws(() => importThemeFile({ format: 'code-desktop-theme', version: 2 }), /newer version/);
  assert.throws(() => importThemeFile({ format: 'code-desktop-theme', version: 1, fontScale: 3 }), /Font size/);
  assert.throws(() => importThemeFile('x'.repeat(300 * 1024)), /too large/);
});

test('font list: queryLocalFonts families deduped and capped, fallback on denial or absence', async () => {
  assert.deepEqual(fontFamilies([{ family: 'Inter' }, { family: 'Inter' }, { family: '.SF NS' }, { family: 'Bad;Font' }, { family: 'Avenir' }]), ['Avenir', 'Inter']);
  assert.equal(fontFamilies(Array.from({ length: 900 }, (_, i) => ({ family: `F${i}` }))).length, 500);
  assert.deepEqual(await loadFontFamilies({ queryLocalFonts: async () => [{ family: 'Zed' }] }), ['Zed']);
  assert.equal(await loadFontFamilies({ queryLocalFonts: async () => { throw new Error('denied'); } }), FALLBACK_FONTS);
  assert.equal(await loadFontFamilies({}), FALLBACK_FONTS);
  assert.ok(FALLBACK_FONTS.includes('PingFang SC') && FALLBACK_FONTS.includes('Menlo'));
});

test('parseHex accepts #rgb / rrggbb forms', () => {
  assert.equal(parseHex('4D6BFE'), '#4d6bfe');
  assert.equal(parseHex('#abc'), '#aabbcc');
  assert.equal(parseHex('#abcd'), null);
  assert.equal(parseHex(''), null);
});

// Server-render the page (effects do not run) to check the IA and accessible names.
let server, React, render, Page;
before(async () => {
  createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceThemeSettings: Page } = await server.ssrLoadModule('/src/source-settings-theme.jsx'));
});
after(() => server?.close());

test('Theme page: groups, rows and controls per the settings IA', () => {
  const html = render(React.createElement(Page, { config: { customTheme: { preset: 'clay', accent: '#d97757' }, codeThemeLight: 'github-light' }, desktopCall: async () => null, onSave: async () => ({}), onOpenSetting: () => {} }));
  const titles = [...html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map(match => match[1]);
  assert.deepEqual(titles, ['Theme', 'Colors', 'Typography', 'Shape', 'Code', 'Preview']);
  const ids = [...html.matchAll(/data-setting-id="([^"]+)"/g)].map(match => match[1]);
  // One home per setting: light/dark (Preferences), code theme / code font / Interface font (Code) are links here.
  assert.deepEqual(ids, ['themePreset', 'themeMode', 'themeAccent', 'themeUiFont', 'themeFontScale', 'themeDensity', 'themeRadius', 'themeCodeAppearance']);
  // Font size and Corner radius are 160px selects (Claude keeps segments to 2–3 choices); Density stays segmented.
  for (const label of ['Theme preset', 'Font size', 'Corner radius']) assert.match(html, new RegExp(`role="combobox" aria-label="${label}"`));
  for (const label of ['Light code theme', 'Dark code theme', 'Code font family']) assert.ok(!html.includes(`aria-label="${label}"`), `${label} lives on the Code page`);
  for (const label of ['Accent color picker', 'Accent color hex', 'Custom interface font']) assert.ok(html.includes(`aria-label="${label}"`), label);
  for (const text of ['Open General settings', 'Open Code settings', 'Interface font settings']) assert.ok(html.includes(`>${text}<`), text);
  for (const label of ['Density']) assert.ok(html.includes(`role="radiogroup" aria-label="${label}"`), label);
  for (const label of ['Font size', 'Corner radius']) assert.ok(!html.includes(`role="radiogroup" aria-label="${label}"`), `${label} is a select`);
  for (const text of ['Import…', 'Export…', 'Reset to default', 'Clear', '100%', 'Default', 'Comfortable']) assert.ok(html.includes(`>${text}<`), text);
  assert.match(html, /data-value="clay"/, 'the preset select shows the matching built-in');
  // No native colour input: a swatch button (its popover lists the preset accents) beside the hex field.
  assert.doesNotMatch(html, /type="color"/);
  assert.match(html, /class="ss-theme-custom-swatch" aria-label="Accent color picker" data-value="#d97757"/);
  assert.match(html, /<datalist id="[^"]+"><option value="SF Pro"/);
  assert.match(html, /class="ss-theme-custom-preview" aria-hidden="true" inert=""/);
});

test('Theme page: a saved quarter-step corner radius (a theme file’s 1.25) is shown, not a blank select', () => {
  // RADIUS_SCALE keeps 0.25 steps (normalizeTheme / validateTheme), wider than the five named options.
  const html = render(React.createElement(Page, { config: { customTheme: { preset: 'custom', radiusScale: 1.25 } }, desktopCall: async () => null, onSave: async () => ({}), onOpenSetting: () => {} }));
  const radius = html.match(/aria-label="Corner radius"[^>]*>.*?<span class="sselect-value">([^<]*)<\/span>/)?.[1];
  assert.equal(radius, '125%');
  const named = render(React.createElement(Page, { config: { customTheme: { preset: 'custom', radiusScale: 1.5 } }, desktopCall: async () => null, onSave: async () => ({}), onOpenSetting: () => {} }));
  assert.equal(named.match(/aria-label="Corner radius"[^>]*>.*?<span class="sselect-value">([^<]*)<\/span>/)?.[1], 'Round');
});
