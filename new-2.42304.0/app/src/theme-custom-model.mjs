// Custom theme (C4): accent, UI font, font size, density and corner radius on
// top of light/dark. Everything is applied by overriding the design-system's
// existing custom properties at the document root; no component CSS changes.
// Pure apart from applyCustomTheme, which only touches the document it is given.
import { THEME_DEFAULT, normalizeTheme, validateTheme, isDefaultTheme, isFontFamily } from '../electron/prefs/theme.mjs';
import { DEFAULT_CODE_THEMES, isTheme, themeLabel } from './code-theme-catalog.mjs';
import { t } from '../electron/i18n/index.mjs';
import { isWindowsHost } from './host-path-model.mjs';

export const THEME_FILE_FORMAT = 'code-desktop-theme';
export const THEME_FILE_VERSION = 1;
export const THEME_STYLE_ID = 'code-desktop-custom-theme';
export const THEME_FILE_LIMIT = 256 * 1024;

const preset = (id, label, fields) => Object.freeze({ id, label, theme: Object.freeze({ ...THEME_DEFAULT, ...fields, preset: id }) });
export const THEME_PRESETS = Object.freeze([
  preset('default', 'Default', {}),
  preset('deepseek', 'DeepSeek blue', { accent: '#4d6bfe' }),
  preset('clay', 'Clay', { accent: '#d97757' }),
  preset('forest', 'Forest', { accent: '#2f855a' }),
  preset('grape', 'Grape', { accent: '#7c3aed' }),
  preset('sharp', 'Sharp', { radiusScale: 0 }),
  preset('rounded', 'Rounded', { radiusScale: 1.5 }),
]);
export function themePreset(id) { return THEME_PRESETS.find(entry => entry.id === id) ?? null; }
/** The preset select's value: a built-in id whose fields still match, otherwise 'custom'. */
export function presetValue(value) {
  const theme = normalizeTheme(value), match = themePreset(theme.preset);
  if (!match) return isDefaultTheme(theme) ? 'default' : 'custom';
  return Object.keys(THEME_DEFAULT).every(key => key === 'preset' || match.theme[key] === theme[key]) ? match.id : 'custom';
}

// --- colour math -----------------------------------------------------------
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
export function relativeLuminance(hex) {
  const [r, g, b] = rgb(hex).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
/** WCAG: white text when it reaches 3:1 on the accent (AA for UI components and large text, which keeps
    mid-tone brand colours like DeepSeek blue on white), otherwise whichever of white/black contrasts more. */
export function onAccent(hex) {
  const l = relativeLuminance(hex), white = contrast(l, 1);
  return white >= 3 || white >= contrast(l, 0) ? '#fff' : '#000';
}

// The role scale the semantic tokens pick from (c6a992d55 :where(:root,:host)
// --cds-role-accent-*: var(--cds-blue-*)). Light mode uses 100/250/600, dark
// mode 800/700/300, so one light→dark scale serves both modes. 450 = accent.
const ACCENT_STEPS = Object.freeze([
  ['50', 8, 'white'], ['100', 16, 'white'], ['250', 40, 'white'], ['300', 58, 'white'], ['400', 82, 'white'],
  ['600', 82, 'black'], ['700', 64, 'black'], ['800', 42, 'black'], ['850', 30, 'black'],
]);
export const ROOT_PROPS = Object.freeze([
  '--cds-rem-scale',
  ...['50', '100', '250', '300', '400', '450', '600', '700', '800', '850', 'fill', 'fill-hover', 'on'].map(step => `--cds-role-accent-${step}`),
  '--accent-100', '--accent-200',
]);

/** sRGB mix of a hex colour toward white/black; `amount` is the share of the colour (0-1). */
export function mixHex(hex, amount, base) {
  const target = base === 'black' ? 0 : 255;
  return '#' + rgb(hex).map(v => Math.round(v * amount + target * (1 - amount)).toString(16).padStart(2, '0')).join('');
}
/** "#2f855a" → "150 47.8% 35.3%": the HSL triplet form of the design-system's --accent-* tokens
    (c6a992d55 [data-theme=claude] --accent-100:210 70.9% 51.6%, read as hsl(var(--accent-100))). */
export function hslTriplet(hex) {
  const [r, g, b] = rgb(hex).map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const one = value => String(Math.round(value * 10) / 10);
  return `${one(h)} ${one(s * 100)}% ${one(l * 100)}%`;
}
// Claude's legacy accent family, which the base layer's focus outline (*{outline-color:hsl(var(--accent-100))}),
// markdown/ProseMirror link hover and accent-tinted surfaces read. 100/200 are the accent in both modes; 000 is the
// text-strength step (darker in light, lighter in dark) and 900 the tinted surface, with the same light/dark ratios
// as Claude's blue (51.6% → 40.2% / 67.1% lightness; 900 at 90% / 24.6%).
export function accentFamily(hex) {
  return {
    100: hslTriplet(hex),
    light: { '000': hslTriplet(mixHex(hex, 0.78, 'black')), 900: hslTriplet(mixHex(hex, 0.2, 'white')) },
    dark: { '000': hslTriplet(mixHex(hex, 0.68, 'white')), 900: hslTriplet(mixHex(hex, 0.48, 'black')) },
  };
}

/** Inline style for document.documentElement. Empty for the default theme. */
export function themeRootStyle(value) {
  const theme = normalizeTheme(value), style = {};
  // The loaded CDS CSS only sets --cds-rem-scale (to 16/17) inside an iOS-only
  // @supports block; on Electron/macOS it is unset and every var(--cds-rem-scale,1)
  // reads 1. So the scale itself is the value. Only calc() tokens that multiply by
  // it scale; plain rem/px text (Tailwind text-*, local CSS) keeps its size.
  if (theme.fontScale !== 1) style['--cds-rem-scale'] = String(theme.fontScale);
  if (theme.accent) {
    const accent = theme.accent;
    for (const [step, percent, base] of ACCENT_STEPS) style[`--cds-role-accent-${step}`] = `color-mix(in oklab, ${accent} ${percent}%, ${base})`;
    style['--cds-role-accent-450'] = accent;
    style['--cds-role-accent-fill'] = accent;
    style['--cds-role-accent-fill-hover'] = `color-mix(in oklab, ${accent} 85%, white)`;
    style['--cds-role-accent-on'] = onAccent(accent);
    style['--accent-100'] = style['--accent-200'] = accentFamily(accent)[100];
  }
  return style;
}

// --- stylesheet --------------------------------------------------------------
const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji', 'fangsong', '-apple-system', 'BlinkMacSystemFont']);
const cssString = text => `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
/** "Inter, 'PingFang SC', sans-serif" → "Inter", "PingFang SC", sans-serif (generic keywords stay bare). */
export function fontStack(family) {
  return family.split(',').map(part => part.trim().replace(/^(["'])(.*)\1$/, '$2').trim()).filter(Boolean)
    .map(name => GENERIC.has(name) ? name : cssString(name)).join(', ');
}

// Base radii in rem, read from public/assets/v1/c6a992d55-C0zTICcS.css:
//   .cds-root { --cds-radius--xs:.3125rem; --cds-radius--sm:.3125rem; --cds-radius--lg:.4375rem;
//               --cds-radius:.375rem; --cds-radius-composer:.75rem }            (each × var(--cds-rem-scale,1))
//   .cds-root[data-density=comfortable] { --cds-radius--xs:.375rem; --cds-radius--sm:.4375rem;
//               --cds-radius--lg:.625rem; --cds-radius:.5rem; --cds-radius-composer:.875rem }
//   :root,:host { --radius-xs:.125rem; --radius-sm:.25rem; --radius-md:.375rem; --radius-lg:.5rem;
//               --radius-xl:.75rem; --radius-2xl:1rem; --radius-3xl:1.5rem }   (Tailwind, unscaled)
export const RADIUS_BASE = Object.freeze({
  compact: Object.freeze({ '--cds-radius--xs': 0.3125, '--cds-radius--sm': 0.3125, '--cds-radius--lg': 0.4375, '--cds-radius': 0.375, '--cds-radius-composer': 0.75 }),
  comfortable: Object.freeze({ '--cds-radius--xs': 0.375, '--cds-radius--sm': 0.4375, '--cds-radius--lg': 0.625, '--cds-radius': 0.5, '--cds-radius-composer': 0.875 }),
  tailwind: Object.freeze({ '--radius-xs': 0.125, '--radius-sm': 0.25, '--radius-md': 0.375, '--radius-lg': 0.5, '--radius-xl': 0.75, '--radius-2xl': 1, '--radius-3xl': 1.5 }),
});
const rem = value => `${Math.round(value * 10000) / 10000}rem`;
const declarations = map => Object.entries(map).map(([prop, value]) => `${prop}:${value};`).join('');

// Selectors and their specificity against the loaded CSS:
//   .cds-root (0,1,0) / html.cds-root[data-density=comfortable] (0,2,0) / .cds-root[data-density=comfortable] (0,2,0)
//   shared-styles :root[data-dyslexic-font] .cds-root[data-font=system] (0,4,0)
const SCOPE = ':root[data-custom-theme]';
/** Text for <style id="code-desktop-custom-theme">; '' when nothing needs a stylesheet. */
export function themeCss(value) {
  const theme = normalizeTheme(value), rules = [];
  if (theme.uiFont) {
    const stack = `${fontStack(theme.uiFont)}, var(--cds-font-system)`;
    // html:root…[data-font] is (0,4,1), above the dyslexic rule's (0,4,0).
    rules.push(`html${SCOPE},html${SCOPE}[data-font],html${SCOPE} .cds-root,html${SCOPE} .cds-root[data-font]{--font-ui:${stack};--cds-font-sans:${stack};}`);
  }
  if (theme.accent) {
    // The mode-dependent steps of the legacy accent family. (0,2,1)/(0,3,1) beat the loaded
    // [data-color-version=v2][data-theme=claude] (0,2,0) and its [data-mode=dark] (0,3,0) blocks.
    const family = accentFamily(theme.accent), steps = map => `--accent-000:${map['000']};--accent-900:${map[900]};`;
    rules.push(`html${SCOPE}{${steps(family.light)}}`);
    rules.push(`html${SCOPE}[data-mode=dark]{${steps(family.dark)}}`);
    // Page text selection follows the accent (the same 30% tint as the theme preview). :where() keeps it at
    // (0,0,1) so ProseMirror-hideselection and transparent-selection rules still win.
    rules.push(`:where(${SCOPE}) ::selection{background-color:color-mix(in srgb, ${theme.accent} 30%, transparent);}`);
  }
  if (theme.radiusScale !== 1) {
    const scaled = (base, unit) => Object.fromEntries(Object.entries(base).map(([prop, value]) => [prop, unit(value * theme.radiusScale)]));
    const cds = value => `calc(${rem(value)} * var(--cds-rem-scale,1))`;
    // (0,2,0)/(0,3,0) beat .cds-root and html.cds-root[data-density=comfortable] is handled by the next rule.
    rules.push(`${SCOPE},${SCOPE} .cds-root{${declarations(scaled(RADIUS_BASE.tailwind, rem))}${declarations(scaled(RADIUS_BASE.compact, cds))}}`);
    rules.push(`${SCOPE}[data-density=comfortable],${SCOPE} .cds-root[data-density=comfortable]{${declarations(scaled(RADIUS_BASE.comfortable, cds))}}`);
  }
  return rules.join('\n');
}

export function themeDensity(config) { return normalizeTheme(config?.customTheme).density; }

/**
 * Applies config.customTheme to a document: root inline props, the
 * data-custom-theme attribute and the style element. Every property this
 * module can set is cleared first, so the default theme leaves nothing behind.
 */
export function applyCustomTheme(doc, config) {
  const root = doc?.documentElement;
  if (!root) return;
  const theme = normalizeTheme(config?.customTheme), style = themeRootStyle(theme), css = themeCss(theme);
  for (const prop of ROOT_PROPS) if (!(prop in style)) root.style.removeProperty(prop);
  for (const [prop, value] of Object.entries(style)) root.style.setProperty(prop, value);
  if (isDefaultTheme(theme)) root.removeAttribute('data-custom-theme');
  else root.setAttribute('data-custom-theme', theme.preset);
  let element = doc.getElementById(THEME_STYLE_ID);
  if (!css) { element?.remove(); return; }
  if (!element) {
    element = doc.createElement('style');
    element.id = THEME_STYLE_ID;
    (doc.head ?? root).appendChild(element);
  }
  if (element.textContent !== css) element.textContent = css;
}

// --- theme files ----------------------------------------------------------------
const codeFontOk = value => typeof value === 'string' && isFontFamily(value);

/** The JSON object written by Export…. */
export function exportThemeFile(config, name) {
  const theme = normalizeTheme(config?.customTheme);
  const label = typeof name === 'string' && name.trim() ? name.trim().slice(0, 80) : themePreset(theme.preset)?.label ?? 'My theme';
  return {
    format: THEME_FILE_FORMAT, version: THEME_FILE_VERSION, name: label,
    accent: theme.accent, uiFont: theme.uiFont, fontScale: theme.fontScale, density: theme.density, radiusScale: theme.radiusScale,
    codeFont: codeFontOk(config?.codeFont) ? config.codeFont : '',
    codeThemeLight: isTheme(config?.codeThemeLight, 'light') ? config.codeThemeLight : DEFAULT_CODE_THEMES.light,
    codeThemeDark: isTheme(config?.codeThemeDark, 'dark') ? config.codeThemeDark : DEFAULT_CODE_THEMES.dark,
  };
}

/**
 * Parses an imported theme file (text or object) into ONE settings patch
 * {customTheme, codeFont, codeThemeLight, codeThemeDark}. Theme fields are
 * validated strictly (throws a user-facing Error); unknown code themes and a
 * bad code font fall back to the defaults with a warning.
 */
export function importThemeFile(input) {
  let file = input;
  if (typeof input === 'string') {
    if (input.length > THEME_FILE_LIMIT) throw new Error(t('This theme file is too large.'));
    try { file = JSON.parse(input); } catch { throw new Error(t('This file isn’t valid JSON.')); }
  }
  if (!file || typeof file !== 'object' || Array.isArray(file) || file.format !== THEME_FILE_FORMAT)
    throw new Error(t('This isn’t an OpenClaude Desktop theme file.'));
  if (file.version !== THEME_FILE_VERSION)
    throw new Error(typeof file.version === 'number' && file.version > THEME_FILE_VERSION ? t('This theme file needs a newer version of OpenClaude Desktop.') : t('Unsupported theme file version.'));
  const fields = {};
  for (const key of ['accent', 'uiFont', 'fontScale', 'density', 'radiusScale']) if (key in file) fields[key] = file[key];
  if (typeof fields.accent === 'string') fields.accent = fields.accent.trim();
  const customTheme = { ...validateTheme({ ...fields, preset: 'custom' }) };
  const warnings = [];
  const patch = { customTheme };
  if ('codeFont' in file) {
    if (codeFontOk(file.codeFont)) patch.codeFont = file.codeFont;
    else { patch.codeFont = ''; warnings.push(t('The code font in this file isn’t valid; using the default.')); }
  }
  for (const [key, mode] of [['codeThemeLight', 'light'], ['codeThemeDark', 'dark']]) {
    if (!(key in file)) continue;
    if (isTheme(file[key], mode)) patch[key] = file[key];
    else {
      patch[key] = DEFAULT_CODE_THEMES[mode];
      warnings.push(t(mode === 'light' ? 'Unknown light code theme “{name}”; using {fallback}.' : 'Unknown dark code theme “{name}”; using {fallback}.', { name: String(file[key]).slice(0, 60), fallback: themeLabel(DEFAULT_CODE_THEMES[mode]) }));
    }
  }
  const name = typeof file.name === 'string' ? file.name.trim().slice(0, 80) : '';
  return { patch, warnings, name };
}

// --- UI font list ---------------------------------------------------------------
export const MAC_FALLBACK_FONTS = Object.freeze(['SF Pro', 'SF Pro Rounded', 'Helvetica Neue', 'Avenir Next', 'Avenir', 'Gill Sans', 'Optima',
  'PingFang SC', 'Hiragino Sans', 'Hiragino Sans GB', 'Noto Sans', 'Noto Sans SC', 'Inter', 'Source Sans 3', 'IBM Plex Sans',
  'Georgia', 'Charter', 'Iowan Old Style', 'Palatino', 'Menlo', 'Monaco', 'SF Mono', 'JetBrains Mono', 'Fira Code']);
// Windows 10/11's own families (plus the CJK UI fonts it ships), for when queryLocalFonts is unavailable or refused.
export const WINDOWS_FALLBACK_FONTS = Object.freeze(['Segoe UI', 'Segoe UI Variable', 'Arial', 'Calibri', 'Cambria', 'Candara',
  'Corbel', 'Georgia', 'Palatino Linotype', 'Tahoma', 'Trebuchet MS', 'Verdana', 'Microsoft YaHei', 'Microsoft YaHei UI',
  'SimSun', 'DengXian', 'Yu Gothic UI', 'Malgun Gothic', 'Noto Sans', 'Inter', 'Consolas', 'Cascadia Code', 'Cascadia Mono',
  'Courier New', 'Lucida Console', 'JetBrains Mono', 'Fira Code']);
export const fallbackFonts = (windows = isWindowsHost()) => (windows ? WINDOWS_FALLBACK_FONTS : MAC_FALLBACK_FONTS);
export const FALLBACK_FONTS = fallbackFonts();
/** Dedupes family names from window.queryLocalFonts() results; ≤limit, sorted. */
export function fontFamilies(fonts, limit = 500) {
  const seen = new Set();
  for (const font of fonts ?? []) {
    const family = typeof font === 'string' ? font : font?.family;
    if (typeof family === 'string' && family && isFontFamily(family) && !family.startsWith('.')) seen.add(family);
    if (seen.size >= limit) break;
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
export async function loadFontFamilies(win = globalThis.window) {
  try {
    if (typeof win?.queryLocalFonts !== 'function') return FALLBACK_FONTS;
    const families = fontFamilies(await win.queryLocalFonts());
    return families.length ? families : FALLBACK_FONTS;
  } catch { return FALLBACK_FONTS; }
}

export const FONT_SCALE_OPTIONS = Object.freeze([0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.25]);
export const RADIUS_OPTIONS = Object.freeze([
  { value: 0, label: 'Sharp' }, { value: 0.5, label: 'Subtle' }, { value: 1, label: 'Default' }, { value: 1.5, label: 'Round' }, { value: 2, label: 'Extra' },
]);
/** Normalizes a typed hex ("4d6bfe", "#4D6BFE", "#abc") to #rrggbb, or null. */
export function parseHex(text) {
  const value = String(text ?? '').trim().replace(/^#?/, '#');
  if (/^#[0-9a-f]{3}$/i.test(value)) return ('#' + [...value.slice(1)].map(c => c + c).join('')).toLowerCase();
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
}
