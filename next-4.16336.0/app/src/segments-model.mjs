// Physical-pixel alignment inside a possibly scaled modal (shared-7 CR/wR).
export function segmentGeometry(container, segment, layoutWidth, pixelRatio = 1) {
  const scale = container.width / layoutWidth;
  if (!segment || !(scale > 0) || !Number.isFinite(scale) || !(segment.width > 0)) return null;
  const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const snap = value => Math.round(value * ratio) / ratio;
  return { left: (snap(segment.left) - snap(container.left)) / scale,
    width: (snap(segment.left + segment.width) - snap(segment.left)) / scale };
}

export function nextSegment(options, value, key, rtl = false) {
  const enabled = options.filter(option => !option.disabled);
  if (!enabled.length) return null;
  if (key === 'Home') return enabled[0].value;
  if (key === 'End') return enabled.at(-1).value;
  let direction = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1
    : key === 'ArrowRight' ? (rtl ? -1 : 1) : key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0;
  if (!direction) return null;
  const at = enabled.findIndex(option => option.value === value);
  return enabled[at < 0 ? (direction > 0 ? 0 : enabled.length - 1) : (at + direction + enabled.length) % enabled.length].value;
}

export function cssDuration(value) {
  const text = value.trim();
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:ms|s)$/.test(text)) return 0;
  return Number.parseFloat(text) * (text.endsWith('ms') ? 1 : 1000);
}
