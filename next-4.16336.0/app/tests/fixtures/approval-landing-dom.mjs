// A controlled DOM for the 2.42304.0 approval-slot originals (src/generated/approval-landing, R4g-btw BT4): a window
// whose capture listeners tests dispatch to by hand, a document whose activeElement only changes through focus(),
// and elements with the classList / attribute / tree surface qj, Hj, Zw, Gj and the attention tracker read.
export function fakeWindow() {
  const listeners = [];
  const add = target => (type, fn, capture) => listeners.push({ target, type, fn, capture: capture === true || capture?.capture === true });
  const remove = target => (type, fn) => {
    const index = listeners.findIndex(l => l.target === target && l.type === type && l.fn === fn);
    if (index >= 0) listeners.splice(index, 1);
  };
  const win = { listeners, timers: [] };
  const doc = { nodeType: 9, visibilityState: 'visible', defaultView: win, hasFocus: () => true };
  doc.body = element('body', { doc });
  doc.activeElement = doc.body;
  doc.addEventListener = add('document');
  doc.removeEventListener = remove('document');
  Object.assign(win, {
    document: doc, performance: globalThis.performance,
    addEventListener: add('window'), removeEventListener: remove('window'),
    setTimeout: fn => (win.timers.push(fn), win.timers.length), clearTimeout() {},
    getComputedStyle: el => ({ display: el.style.display ?? 'block', position: el.style.position ?? 'static' }),
    MutationObserver: class { observe() {} disconnect() {} },
  });
  // A keydown / pointerdown / focusout as the window's capture listeners see it; the result records what they did.
  const dispatch = (type, init = {}, target = doc.activeElement) => {
    const event = { type, target, repeat: false, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, isTrusted: true,
      prevented: false, stopped: false, ...init,
      preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, stopPropagation() { this.stopped = true; } };
    for (const l of listeners.filter(l => l.target === 'window' && l.type === type && l.capture)) {
      if (event.stopped) break;
      l.fn(event);
    }
    return event;
  };
  function element(name, { doc: owner = doc, attributes = {}, style = {}, children = [] } = {}) {
    const attrs = new Map(Object.entries(attributes)), classes = new Set(), own = [];
    const el = {
      nodeType: 1, nodeName: name.toUpperCase(), ownerDocument: owner, style, id: '', parentElement: null, focused: [],
      get children() { return own; },
      get firstElementChild() { return own[0] ?? null; },
      classList: { add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n)),
        contains: n => classes.has(n), get length() { return classes.size; }, toArray: () => [...classes] },
      hasAttribute: n => attrs.has(n), getAttribute: n => attrs.get(n) ?? null,
      setAttribute: (n, v) => void attrs.set(n, String(v)), removeAttribute: n => void attrs.delete(n),
      addEventListener: (type, fn) => { (el.handlers[type] ??= []).push(fn); },
      removeEventListener: (type, fn) => { el.handlers[type] = (el.handlers[type] ?? []).filter(h => h !== fn); },
      handlers: {},
      contains: node => { for (let n = node; n; n = n.parentElement) if (n === el) return true; return false; },
      querySelectorAll: selector => {
        const match = selector.match(/^\[([\w-]+)\]$/);
        const out = [], walk = n => n.children.forEach(c => { if (match && c.hasAttribute(match[1])) out.push(c); walk(c); });
        walk(el);
        return out;
      },
      append: child => { own.push(child); child.parentElement = el; return el; },
      focus: options => {
        el.focused.push(options);
        if (el.focusable === false) return;
        const previous = owner.activeElement;
        owner.activeElement = el;
        if (previous && previous !== el) (previous.handlers?.blur ?? []).slice().forEach(h => h({ type: 'blur' }));
      },
      blur: () => {
        if (owner.activeElement !== el) return;
        owner.activeElement = owner.body;
        (el.handlers.blur ?? []).slice().forEach(h => h({ type: 'blur' }));
      },
    };
    children.forEach(c => el.append(c));
    return el;
  }
  return { win, doc, element, dispatch };
}
