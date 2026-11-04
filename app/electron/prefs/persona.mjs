// C2 persona preference (preferences.json key `persona`). Pure: imported by
// both the main process (settingsPatch) and the renderer (persona-store).
// Renderer copy only; nothing here ever reaches the model.
import { t } from '../i18n/index.mjs';
export const SPARK_ICONS = Object.freeze(['spark', 'star', 'lightning', 'chat', 'custom']);
// W14-code r5 cleanup R5DC-01: no home greeting template any more (nothing read it after R4DC-N2 removed the host
// SourceGreeting; official 3.6556.2 has no Persona page and, under D10 / E92, no Code home greeting either). A
// `greeting` left in an older preferences.json is ignored on read and dropped on write.
export const PERSONA_DEFAULT = Object.freeze({ assistantName: '', sparkIcon: 'spark', sparkImage: '' });
const LEGACY_KEYS = Object.freeze(['greeting']);
export const DEFAULT = PERSONA_DEFAULT;
export const ASSISTANT_NAME_MAX = 40;
export const SPARK_IMAGE_MAX = 350000;
const IMAGE = /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x1f\x7f]/;

export function isSparkImage(value) {
  return typeof value === 'string' && value.length <= SPARK_IMAGE_MAX && IMAGE.test(value);
}
function nameError(value) {
  if (typeof value !== 'string') return t('Enter a name.');
  const name = value.trim();
  if (name.length > ASSISTANT_NAME_MAX) return t('Use {max} characters or fewer.', { max: ASSISTANT_NAME_MAX });
  if (CONTROL.test(name) || /[<>]/.test(name)) return t('The name can’t contain < or > or control characters.');
  return null;
}
/** Single-field checks for the Settings text fields (null when valid). */
export function assistantNameError(value) { return nameError(value); }

/** Lenient read: any invalid field falls back to its default. */
export function normalize(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const assistantName = typeof input.assistantName === 'string' && !nameError(input.assistantName) ? input.assistantName.trim() : '';
  const sparkImage = isSparkImage(input.sparkImage) ? input.sparkImage : '';
  let sparkIcon = SPARK_ICONS.includes(input.sparkIcon) ? input.sparkIcon : 'spark';
  if (sparkIcon === 'custom' && !sparkImage) sparkIcon = 'spark';
  return { assistantName, sparkIcon, sparkImage };
}

/** Strict write check: throws a user-facing Error; null resets to the default. */
export function validate(value) {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(t('Invalid persona setting.'));
  const merged = { ...PERSONA_DEFAULT, ...value };
  for (const key of Object.keys(value)) if (!(key in PERSONA_DEFAULT) && !LEGACY_KEYS.includes(key)) throw new Error(t('Invalid persona setting.'));
  const name = nameError(merged.assistantName);
  if (name) throw new Error(name);
  if (!SPARK_ICONS.includes(merged.sparkIcon)) throw new Error(t('Choose an assistant icon.'));
  if (typeof merged.sparkImage !== 'string') throw new Error(t('Invalid assistant image.'));
  if (merged.sparkImage && !isSparkImage(merged.sparkImage))
    throw new Error(merged.sparkImage.length > SPARK_IMAGE_MAX ? t('The image is too large. Choose one under 256 KB.') : t('Choose a PNG, JPEG, WebP or SVG image.'));
  if (merged.sparkIcon === 'custom' && !merged.sparkImage) throw new Error(t('Choose an image for the custom icon.'));
  return { assistantName: merged.assistantName.trim(), sparkIcon: merged.sparkIcon, sparkImage: merged.sparkImage };
}
export const normalizePersona = normalize;
export const validatePersona = validate;
