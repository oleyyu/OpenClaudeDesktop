// Independent implementation of shared-21 kv:1378–1472 and settings rt:214–319.
const INPUT_EVENTS = ['wheel', 'touchstart', 'keydown', 'mousedown'];
const TITLE_CLASS = 'feature-anchor-highlight';
const ROW_CLASS = 'feature-anchor-row-fill';
const ANIMATION = 'ss-anchor-line';
export const SETTINGS_ANCHOR_TIMING = Object.freeze({ settleMin: 250, settleMax: 1500, stableFrames: 3, cleanup: 2050, missing: 300, late: 5500 });

export function highlightSettingsTarget(row, onFinish, host = window) {
  const title = row.querySelector('.settings-row-title') || row;
  const wash = row.tagName === 'SECTION' && title !== row
    ? (title.parentElement?.classList.contains('flex-col') ? title.parentElement.parentElement : title) : row;
  const reduced = host.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let disposed = false, frame, expiry, arm, touched = false, previousTop, stable = 0;
  const start = host.performance.now();
  const touchedByUser = () => { touched = true; };
  const finish = (notify = true) => {
    if (disposed) return;
    disposed = true;
    host.cancelAnimationFrame(frame); host.clearTimeout(expiry); host.clearTimeout(arm);
    for (const event of INPUT_EVENTS) host.removeEventListener(event, touchedByUser);
    title.removeEventListener('animationend', ended);
    title.classList.remove(TITLE_CLASS); wash.classList.remove(ROW_CLASS);
    if (notify) onFinish?.();
  };
  const ended = event => { if (event.animationName === ANIMATION) finish(); };
  const viewport = () => {
    for (let parent = title.parentElement; parent; parent = parent.parentElement) {
      if (['auto', 'scroll'].includes(host.getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) return parent.getBoundingClientRect();
    }
    return { top: 0, bottom: host.innerHeight };
  };
  const tick = () => {
    if (disposed) return;
    if (!title.isConnected) { finish(); return; }
    const rect = title.getBoundingClientRect(), age = host.performance.now() - start;
    stable = previousTop !== undefined && Math.abs(rect.top - previousTop) < .5 ? stable + 1 : 0;
    previousTop = rect.top;
    if ((age < SETTINGS_ANCHOR_TIMING.settleMin || stable < SETTINGS_ANCHOR_TIMING.stableFrames) && age < SETTINGS_ANCHOR_TIMING.settleMax) {
      frame = host.requestAnimationFrame(tick); return;
    }
    if (!touched) {
      const visible = viewport();
      if (Math.abs((rect.top + rect.bottom - visible.top - visible.bottom) / 2) > (visible.bottom - visible.top) / 4) title.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    title.classList.add(TITLE_CLASS); wash.classList.add(ROW_CLASS);
    title.addEventListener('animationend', ended);
    expiry = host.setTimeout(() => finish(), SETTINGS_ANCHOR_TIMING.cleanup);
  };
  title.scrollIntoView({ block: 'center', behavior: reduced ? 'instant' : 'smooth' });
  // The activation click must not count as later manual scrolling.
  arm = host.setTimeout(() => { if (!disposed) for (const event of INPUT_EVENTS) host.addEventListener(event, touchedByUser, { once: true, passive: true }); }, 0);
  frame = host.requestAnimationFrame(tick);
  return () => finish(false);
}

export function bindSettingsAnchor(root, id, onFinish, host = window) {
  let cancelled = false, observer, timer, frame, stopHighlight;
  const stopWaiting = () => { observer?.disconnect(); host.clearTimeout(timer); };
  const late = () => [...root.querySelectorAll('[data-settle-slot="hidden"], [data-settle-slot="late"]')]
    .some(element => { const hidden = element.closest('[aria-hidden="true"]'); return !hidden || !root.contains(hidden); });
  const attempt = () => {
    if (cancelled || stopHighlight) return true;
    // Exact known IDs avoid CSS interpolation and ambiguous duplicate labels.
    const row = [...root.querySelectorAll('[data-setting-id]')].find(element => element.dataset.settingId === id && element.getClientRects().length && !element.closest('[data-settle-slot="placeholder"]'));
    if (!row) return false;
    stopWaiting();
    stopHighlight = highlightSettingsTarget(row, onFinish, host);
    return true;
  };
  const expire = () => { stopWaiting(); if (!attempt()) { cancelled = true; onFinish?.(); } };
  frame = host.requestAnimationFrame(() => {
    if (cancelled || attempt()) return;
    observer = new host.MutationObserver(attempt);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-settle-slot', 'style'] });
    timer = late() ? host.setTimeout(expire, SETTINGS_ANCHOR_TIMING.late) : host.setTimeout(() => {
      if (late()) timer = host.setTimeout(expire, SETTINGS_ANCHOR_TIMING.late - SETTINGS_ANCHOR_TIMING.missing);
      else expire();
    }, SETTINGS_ANCHOR_TIMING.missing);
  });
  return () => { cancelled = true; host.cancelAnimationFrame(frame); stopWaiting(); stopHighlight?.(); };
}
