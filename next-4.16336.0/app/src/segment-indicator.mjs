import { segmentGeometry, cssDuration } from './segments-model.mjs';

// Independent single controlled-value FLIP indicator. No per-frame React state.
export function bindSegmentIndicator(root, thumb) {
  const host = root.ownerDocument.defaultView;
  const media = host.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => media.matches || root.ownerDocument.documentElement.dataset.reduceMotion === 'true'
    || root.ownerDocument.documentElement.dataset.localMotion === 'reduce';
  let last = null, disposed = false;
  const cancel = () => { for (const animation of thumb.getAnimations?.() || []) animation.cancel(); };
  const update = () => {
    if (disposed) return;
    const selected = root.querySelector('[role=radio][aria-checked=true]');
    const rootRect = root.getBoundingClientRect(), layoutWidth = parseFloat(host.getComputedStyle(root).width);
    const target = segmentGeometry(rootRect, selected?.getBoundingClientRect(), layoutWidth, host.devicePixelRatio);
    if (!target) { cancel(); last = null; thumb.style.visibility = 'hidden'; return; }
    if (last?.left === target.left && last?.width === target.width) { if (reduced()) cancel(); return; }
    // Read the animated presentation before cancellation, so a quick reversal
    // begins where the thumb is now rather than at its previous destination.
    const current = thumb.getBoundingClientRect(), scale = rootRect.width / layoutWidth;
    const shouldAnimate = last !== null && !reduced() && typeof thumb.animate === 'function';
    const style = host.getComputedStyle(thumb);
    const duration = cssDuration(style.getPropertyValue('--cds-dur-base'));
    const easing = style.getPropertyValue('--cds-ease-snap').trim() || 'linear';
    cancel();
    thumb.style.width = `${target.width}px`;
    thumb.style.transform = `translateX(${target.left}px)`;
    thumb.style.visibility = 'visible';
    last = target;
    if (shouldAnimate && duration > 0) {
      try {
        thumb.animate({ transform: [
          `translateX(${(current.left - rootRect.left) / scale}px) scaleX(${current.width / scale / target.width})`,
          `translateX(${target.left}px) scaleX(1)`,
        ] }, { duration, easing });
      } catch { /* Unsupported animation must not prevent the final selection. */ }
    }
  };
  const observer = new host.ResizeObserver(update);
  const refresh = () => {
    observer.disconnect(); observer.observe(root);
    for (const child of root.querySelectorAll('[role=radio]')) observer.observe(child);
    update();
  };
  host.addEventListener('local-motion-change', update);
  media.addEventListener('change', update);
  refresh();
  return { refresh, dispose() {
    disposed = true; observer.disconnect(); cancel();
    host.removeEventListener('local-motion-change', update); media.removeEventListener('change', update);
  } };
}
