// customTheme preference (C4). Shared by the renderer and the main process:
// pure, no node:* imports. Code font and code themes stay in the existing
// top-level codeFont / codeThemeLight / codeThemeDark keys.
import { t } from '../i18n/index.mjs';
export const THEME_DENSITIES = Object.freeze(['compact', 'comfortable']);
export const THEME_DEFAULT = Object.freeze({ preset: 'default', accent: '', uiFont: '', fontScale: 1, density: 'compact', radiusScale: 1 });
export const DEFAULT = THEME_DEFAULT;
export const FONT_SCALE = Object.freeze({ min: 0.85, max: 1.25, step: 0.05 });
export const RADIUS_SCALE = Object.freeze({ min: 0, max: 2, step: 0.25 });

const HEX = /^#[0-9a-f]{6}$/i;
// Same charset rule as codeFont in preferences.mjs settingsPatch: no control
// characters and none of ;{}<> (the value ends up inside a CSS declaration).
const BAD_FONT = /[\x00-\x1f\x7f;{}<>]/;
const BAD_PRESET = /[\x00-\x1f\x7f<>]/;
const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const snap = (value, { step }) => Math.round(Math.round(value / step) * step * 100) / 100;

export function isFontFamily(value) {
  return typeof value === 'string' && value.length <= 120 && !BAD_FONT.test(value);
}

/** Lenient read: always a valid, frozen theme object; bad fields fall back to their defaults. */
export function normalizeTheme(value) {
  if (!isObject(value)) return THEME_DEFAULT;
  const number = (raw, range, fallback) => typeof raw === 'number' && Number.isFinite(raw)
    ? snap(Math.min(range.max, Math.max(range.min, raw)), range) : fallback;
  return Object.freeze({
    preset: typeof value.preset === 'string' && value.preset && value.preset.length <= 40 && !BAD_PRESET.test(value.preset) ? value.preset : THEME_DEFAULT.preset,
    accent: typeof value.accent === 'string' && HEX.test(value.accent) ? value.accent.toLowerCase() : '',
    uiFont: isFontFamily(value.uiFont) ? value.uiFont.trim() : '',
    fontScale: number(value.fontScale, FONT_SCALE, 1),
    density: THEME_DENSITIES.includes(value.density) ? value.density : THEME_DEFAULT.density,
    radiusScale: number(value.radiusScale, RADIUS_SCALE, 1),
  });
}

/** Strict write check: throws a user-facing Error; null means "reset to default". */
export function validateTheme(value) {
  if (value === null) return null;
  if (!isObject(value)) throw new Error(t('Invalid theme setting.'));
  if ('preset' in value && (typeof value.preset !== 'string' || !value.preset || value.preset.length > 40 || BAD_PRESET.test(value.preset)))
    throw new Error(t('Invalid theme preset.'));
  if ('accent' in value && (typeof value.accent !== 'string' || (value.accent !== '' && !HEX.test(value.accent))))
    throw new Error(t('Enter an accent color like #4d6bfe.'));
  if ('uiFont' in value && !isFontFamily(value.uiFont)) throw new Error(t('Enter a font family name.'));
  const range = (key, limits, label) => {
    if (!(key in value)) return;
    const raw = value[key];
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < limits.min - 1e-9 || raw > limits.max + 1e-9)
      throw new Error(t(label, { min: limits.min, max: limits.max }));
  };
  range('fontScale', FONT_SCALE, 'Font size must be between {min} and {max}.');
  range('radiusScale', RADIUS_SCALE, 'Corner radius must be between {min} and {max}.');
  if ('density' in value && !THEME_DENSITIES.includes(value.density)) throw new Error(t('Invalid density setting.'));
  return normalizeTheme(value);
}

/** True when the theme changes nothing (the preset label is informational). */
export function isDefaultTheme(value) {
  const theme = normalizeTheme(value);
  return Object.keys(THEME_DEFAULT).every(key => key === 'preset' || theme[key] === THEME_DEFAULT[key]);
}

export const normalize = normalizeTheme;
export const validate = validateTheme;
