// Transcript rows for Codex 0.155.1 ThreadItems that are neither tools nor messages
// (ts-experimental ThreadItem.ts): imageGeneration {status, revisedPrompt, result, savedPath?,
// failure}, imageView {path} and sleep {durationMs}, plus hookPrompt {fragments[{text, hookRunId}]}.
// Pure, so the labels and image sources are unit-tested; source-session.jsx renders them as steps.
import { t } from '../electron/i18n/index.mjs';

export const MEDIA_ITEM_TYPES = Object.freeze(['imageGeneration', 'imageView', 'sleep', 'hookPrompt']);
export const isMediaItem = item => MEDIA_ITEM_TYPES.includes(item?.type);

const basename = value => String(value || '').split(/[\\/]/).filter(Boolean).pop() || '';
// An absolute local path the renderer may show (file:// like user image attachments), never a URL or a
// relative path.
export function localImageSource(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || /[\0\n\r]/.test(path)) return null;
  return encodeURI(`file://${path}`).replace(/[#?]/g, encodeURIComponent);
}
// ImageGenerationItem.result is the base64 PNG; savedPath (when Codex saved it) is preferred.
export function generatedImageSource(item) {
  const saved = localImageSource(item?.savedPath);
  if (saved) return saved;
  const data = typeof item?.result === 'string' ? item.result.trim() : '';
  if (data.startsWith('data:image/')) return data;
  return data.length > 64 && /^[A-Za-z0-9+/=\s]+$/.test(data) ? `data:image/png;base64,${data.replace(/\s+/g, '')}` : null;
}
const status = item => String(item?.status || '').toLowerCase();
export function imageGenerationState(item) {
  const value = status(item);
  if (item?.failure || value === 'failed' || value === 'error') return 'failed';
  if (['inprogress', 'in_progress', 'generating', 'running', 'started'].includes(value)) return 'busy';
  if (['interrupted', 'cancelled', 'canceled', 'stopped'].includes(value)) return 'stopped';
  return 'done';
}
export function imageGenerationFailure(item) {
  const failure = item?.failure;
  if (!failure) return '';
  if (failure.type === 'usageLimitExceeded') return t('You’ve reached your image generation limit.');
  return t('Image generation failed.');
}
export function mediaItemRow(item) {
  if (item?.type === 'imageGeneration') {
    const state = imageGenerationState(item);
    return { state, label: state === 'busy' ? t('Generating image') : state === 'failed' ? t('Couldn’t generate image') : t('Generated image'),
      meta: item.savedPath ? basename(item.savedPath) : '', image: state === 'failed' ? null : generatedImageSource(item),
      caption: typeof item.revisedPrompt === 'string' ? item.revisedPrompt.trim() : '', error: imageGenerationFailure(item), path: item.savedPath || null };
  }
  if (item?.type === 'imageView')
    return { state: 'done', label: t('Viewed image'), meta: basename(item.path), image: localImageSource(item.path), caption: '', error: '', path: item.path || null };
  if (item?.type === 'sleep') {
    const seconds = Number.isFinite(item.durationMs) ? Math.max(0, Math.round(item.durationMs / 1000)) : null;
    return { state: 'done', label: seconds === null ? t('Waited') : t('Waited {seconds}s', { seconds }), meta: '', image: null, caption: '', error: '', path: null };
  }
  if (item?.type === 'hookPrompt') {
    const text = (Array.isArray(item.fragments) ? item.fragments : []).map(part => typeof part?.text === 'string' ? part.text : '').filter(Boolean).join('\n\n');
    return { state: 'done', label: t('Hook added context'), meta: '', image: null, caption: text, error: '', path: null };
  }
  return null;
}
