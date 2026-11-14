import { TURN_COPY_FEEDBACK_MS } from './turn-copy-model.mjs';

// Clipboard writes themselves cannot be canceled. Identity/content/attempt
// fences prevent their late completion from changing another turn's feedback.
// trim:false keeps a message payload byte-exact (user Copy); turn Copy trims
// only the aggregate, matching the audited turn behavior.
// `write({ text, html })` is the rich-then-plain payload writer (resolves
// true/false, or throws); `getHtml(text)` runs at click time like the audited
// getRichText and any failure/empty result degrades to a plain-only write.
// The older `writeText` seam remains for callers that only write plain text.
export function createTurnClipboardFeedback({ write, writeText, getHtml, onState, schedule = setTimeout, cancel = clearTimeout, trim = true }) {
  let live = true, identity, text = '', revision = 0, attempt = 0, timer = null;
  const clear = () => { if (timer !== null) { cancel(timer); timer = null; } };
  const publish = value => { if (live) onState(value); };
  const writer = write ?? (async ({ text: plain }) => { await writeText(plain); return true; });
  const richText = source => {
    if (!getHtml) return '';
    try { const html = getHtml(source); return typeof html === 'string' ? html : ''; } catch { return ''; }
  };
  return {
    setContent(nextIdentity, nextText) {
      const value = typeof nextText === 'string' ? nextText : '';
      if (identity === nextIdentity && text === value) return;
      identity = nextIdentity; text = value; revision++;
      clear(); publish('idle');
    },
    async copy() {
      if (!live) return false;
      const version = revision, id = ++attempt, payload = { text: trim ? text.trim() : text, html: richText(text) };
      const current = () => live && version === revision && id === attempt;
      clear(); publish('pending');
      try {
        const written = await writer(payload);
        if (!current()) return false;
        if (written === false) { publish('error'); return false; }
        publish('copied');
        timer = schedule(() => {
          timer = null;
          if (current()) publish('idle');
        }, TURN_COPY_FEEDBACK_MS);
        return true;
      } catch {
        if (current()) publish('error');
        return false;
      }
    },
    dispose() { live = false; revision++; clear(); },
  };
}

// bO/vO: horizontal wrapping, RTL-aware arrows and Home/End. One Copy button
// uses exactly the same navigation, with its sole button remaining tabIndex0.
export function turnFooterKeyIndex(event, { count, current = -1, rtl = false }) {
  if (!count || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return null;
  if (event.key === 'Home') return 0;
  if (event.key === 'End') return count - 1;
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return null;
  if (current < 0) return 0;
  const delta = (event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1);
  return (current + delta + count) % count;
}

export function preventRepeatedSelection({ detail, button, editable = false }) {
  return detail > 1 && button === 0 && !editable;
}
