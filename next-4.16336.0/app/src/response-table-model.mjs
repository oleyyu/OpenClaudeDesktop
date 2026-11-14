// markdown-current Ts: one CSS pixel of tolerance is part of the source
// contract, not a test accommodation. Growing tables never offer Expand.
export const tableOverflows = (scrollWidth, clientWidth, streaming = false) =>
  !streaming && scrollWidth > clientWidth + 1;

export function nearestTableHeading(start) {
  for (let node = start; node && !node.matches('.source-markdown, .prose'); node = node.parentElement) {
    for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      const headings = sibling.matches('h1,h2,h3,h4,h5,h6') ? [sibling] : [...sibling.querySelectorAll('h1,h2,h3,h4,h5,h6')];
      const heading = headings.at(-1)?.textContent?.trim();
      if (heading) return heading;
    }
  }
  return null;
}

export function observeTableOverflow(element, onChange, Observer = element.ownerDocument.defaultView.ResizeObserver) {
  let active = true;
  const measure = () => { if (active) onChange(tableOverflows(element.scrollWidth, element.clientWidth)); };
  const observer = new Observer(measure);
  observer.observe(element);
  for (const child of element.children) observer.observe(child);
  return () => { active = false; observer.disconnect(); };
}

// A close animation retains the clicked rows. An old transition completion
// cannot discard a newer snapshot, even if another table opens meanwhile.
export function createResponseTableStore() {
  let state = { version: 0, open: false, snapshot: null };
  const listeners = new Set();
  const publish = next => { state = next; for (const listener of listeners) listener(); };
  return {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    show(snapshot) { publish({ version: state.version + 1, open: true, snapshot }); },
    close() { if (state.open) publish({ ...state, open: false }); },
    release(version) { if (version === state.version && !state.open && state.snapshot) publish({ ...state, snapshot: null }); },
  };
}

export function transitionMilliseconds(style) {
  const times = field => String(field || '0s').split(',').map(value => {
    const text = value.trim(), amount = Number.parseFloat(text);
    return Number.isFinite(amount) ? amount * (text.endsWith('ms') ? 1 : 1000) : 0;
  });
  const durations = times(style.transitionDuration), delays = times(style.transitionDelay);
  return Math.max(0, ...durations.map((duration, index) => duration + delays[index % delays.length]));
}
