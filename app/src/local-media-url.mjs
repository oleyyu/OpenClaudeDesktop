// U-2: the page (app://localhost) never names a file:// URL. A local image / video / audio / PDF it shows is the
// claude-media://v/<token>?v=<mtime> URL main mints for that one file (electron/session-media.cjs, ported from the
// 4.16336.0 SessionMedia module: x9 / T_o / j_o), asked through the preload bridge window.desktop.mediaUrl
// (main.cjs desktop:media-url). null when main refuses the path (not absolute, not a media type, missing, not a
// regular file) or when there is no desktop bridge (node tests, a plain browser).
export const LOCAL_MEDIA_SCHEME = 'claude-media:';

export function localMediaUrl(filePath, bridge = globalThis.desktop) {
  if (typeof filePath !== 'string' || !filePath.startsWith('/') || /[\0\n\r]/.test(filePath)) return null;
  const mint = bridge?.mediaUrl;
  if (typeof mint !== 'function') return null;
  try {
    const url = mint(filePath);
    return typeof url === 'string' && url.startsWith(`${LOCAL_MEDIA_SCHEME}//`) ? url : null;
  } catch { return null; }
}

export const isLocalMediaUrl = (value) => typeof value === 'string' && value.startsWith(`${LOCAL_MEDIA_SCHEME}//`);

/**
 * c5259f582 K / Ae (Copy image of a claude-media image): the minted image's bytes come from main as a data URL
 * (main.cjs media:data-url = readSessionImageAsDataUrl) and are decoded in a same-origin Image, because a canvas that
 * draws the cross-origin claude-media image is tainted. Any other image element is answered as it is.
 */
export async function copyableImage(element, { call = globalThis.desktop?.call, ImageClass = globalThis.Image } = {}) {
  const src = element?.currentSrc || element?.src || '';
  if (!isLocalMediaUrl(src)) return element;
  if (typeof call !== 'function' || typeof ImageClass !== 'function') throw new Error('Image bytes unavailable');
  const result = await call('media:data-url', { url: src });
  if (typeof result?.dataUrl !== 'string' || !result.dataUrl.startsWith('data:image/')) throw new Error('Image bytes unavailable');
  const image = new ImageClass();
  await new Promise((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Image decode failed')); image.src = result.dataUrl; });
  return image;
}
