// DOM driver for the ordinary user-bubble shrink-wrap: measure visible inline
// content, propose a tighter inline max-width, and keep it only when layout is
// observably identical. Independent local implementation; the decision rules
// live in shrink-wrap-model.mjs. Nothing here touches other message widths.
import { SHRINK_WRAP_ANCESTOR_LIMIT, SHRINK_WRAP_ATTRIBUTE, SHRINK_WRAP_FILL, SHRINK_WRAP_MAX_ROUNDS,
  acceptable, advanceProbe, createProbeState, initialCandidate, resizeWarrantsMeasure } from "./shrink-wrap-model.mjs";

const PROPERTY = "maxWidth";
const REPLACED = new Set(["IMG", "SVG", "VIDEO", "AUDIO", "CANVAS", "IFRAME", "EMBED", "OBJECT", "PICTURE",
  "INPUT", "TEXTAREA", "SELECT", "PROGRESS", "METER"]);
const original = new WeakMap(); // element -> author inline max-width before we touched it
const applied = new WeakMap();  // element -> the value we last wrote

function write(el, value) { el.style[PROPERTY] = value; applied.set(el, value); }
function remember(el) {
  const current = el.style[PROPERTY];
  // Record the author value unless the current inline value is ours.
  if (!original.has(el) || current !== applied.get(el)) original.set(el, current);
}
export function restoreShrinkWrap(el) {
  if (!original.has(el)) return;
  remember(el);
  write(el, original.get(el) ?? "");
}

function fillsAncestor(node, root) {
  for (let el = node.nodeType === 1 ? node : node.parentElement; el && el !== root; el = el.parentElement)
    if (el.getAttribute(SHRINK_WRAP_ATTRIBUTE) === SHRINK_WRAP_FILL) return true;
  return false;
}
function isInlineLike(el, style) {
  return REPLACED.has(el.tagName.toUpperCase()) || style.display.startsWith("inline");
}

/** Walk visible text and inline/replaced content, collecting line rects and
 * the horizontal bounds of everything drawn. Hidden, absolute and fixed
 * subtrees are ignored; data-shrinkwrap="fill" subtrees never constrain. */
export function collectInlineBounds(root) {
  const doc = root.ownerDocument, win = doc.defaultView;
  const rects = []; let clipped = 0, left = Infinity, right = -Infinity;
  const extend = rect => { if (rect.left < left) left = rect.left; if (rect.right > right) right = rect.right; };
  const range = doc.createRange();
  const walker = doc.createTreeWalker(root, 5, { acceptNode: node => {
    if (node.nodeType === 1) {
      const style = win?.getComputedStyle(node);
      return style && (style.display === "none" || style.position === "absolute" || style.position === "fixed") ? 2 : 1;
    }
    return fillsAncestor(node, root) ? 2 : 1;
  } });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === 3) {
      range.selectNodeContents(node);
      for (const rect of range.getClientRects?.() ?? []) if (rect.width > 0) { rects.push(rect); extend(rect); }
      continue;
    }
    const style = win?.getComputedStyle(node), box = node.getBoundingClientRect();
    if (box.width > 0) extend(box);
    if (style && !fillsAncestor(node, root) && isInlineLike(node, style))
      for (const rect of node.getClientRects()) if (rect.width > 0) rects.push(rect);
    if (style && (style.overflowX !== "visible" || style.overflowY !== "visible"))
      clipped += Math.max(0, node.scrollWidth - node.clientWidth) + Math.max(0, node.scrollHeight - node.clientHeight);
  }
  return { rects, clipped, left, right };
}

export function snapshotLayout(el, bounds) {
  const style = el.ownerDocument.defaultView?.getComputedStyle(el), box = el.getBoundingClientRect();
  let spill = 0;
  if (style && Number.isFinite(bounds.left)) {
    const width = parseFloat(style.width);
    const border = style.boxSizing === "border-box" ? width : width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    const scale = (border > 0 && box.width / border) || 1;
    const innerLeft = box.left + (parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft)) * scale;
    const innerRight = box.right - (parseFloat(style.borderRightWidth) + parseFloat(style.paddingRight)) * scale;
    spill = Math.max(0, bounds.right - innerRight) + Math.max(0, innerLeft - bounds.left);
  }
  return { height: el.scrollHeight, overflow: el.scrollWidth, client: el.clientWidth, spill,
    clipped: bounds.clipped, widths: bounds.rects.map(rect => rect.width) };
}

function createJob(el, done) { return { el, done, natural: null, probe: null, settled: false, result: null }; }
function finish(job, value) {
  if (value === null) restoreShrinkWrap(job.el); else write(job.el, `${value}px`);
  job.settled = true; job.result = value; job.done(value);
}
function read(job) {
  const el = job.el, win = el.ownerDocument.defaultView;
  if (!win || typeof el.getBoundingClientRect !== "function") return finish(job, null);
  const style = win.getComputedStyle(el), boxWidth = parseFloat(style.width);
  if (!Number.isFinite(boxWidth) || boxWidth <= 0) return finish(job, null);
  const extras = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
  const bounds = collectInlineBounds(el);
  if (bounds.rects.length === 0) return finish(job, null);
  job.natural = snapshotLayout(el, bounds);
  let left = Infinity, right = -Infinity;
  for (const rect of bounds.rects) { if (rect.left < left) left = rect.left; if (rect.right > right) right = rect.right; }
  const borderBox = style.boxSizing === "border-box";
  const border = borderBox ? boxWidth : boxWidth + extras;
  const scale = el.getBoundingClientRect().width / border || 1;
  const candidate = initialCandidate({ boxWidth, borderBox, extras, left, right, scale });
  if (candidate === null) return finish(job, null);
  job.probe = createProbeState({ boxWidth, candidate });
  write(el, `${candidate}px`);
}

/** Measure a batch together: all reads first, then alternate write/verify
 * rounds so several bubbles never interleave layout thrash. */
export function measureShrinkWrapBatch(jobs) {
  for (const job of jobs) { remember(job.el); restoreShrinkWrap(job.el); }
  for (const job of jobs) read(job);
  let pending = jobs.filter(job => !job.settled);
  for (let round = 0; pending.length > 0 && round < SHRINK_WRAP_MAX_ROUNDS; round++) {
    const results = pending.map(job => [job, acceptable(job.natural, snapshotLayout(job.el, collectInlineBounds(job.el)))]);
    const next = [];
    for (const [job, ok] of results) {
      const step = advanceProbe(job.probe, ok);
      if ("settled" in step) finish(job, step.settled); else next.push([job, step.probe]);
    }
    for (const [job, probe] of next) write(job.el, `${probe}px`);
    pending = next.map(([job]) => job);
  }
  for (const job of pending) if (!job.settled) finish(job, null);
}
export function measureShrinkWrap(el) {
  let result = null;
  measureShrinkWrapBatch([createJob(el, value => { result = value; })]);
  return result;
}

// Per-window scheduling: microtask for content changes, frame for our own
// resize echo, and synchronous processing inside the ResizeObserver callback
// for ancestor width changes.
const queues = new WeakMap();
function queueFor(win) {
  let queue = queues.get(win);
  if (!queue) { queue = { jobs: new Map(), microtask: false, frame: 0 }; queues.set(win, queue); }
  return queue;
}
function flush(win, queue, jobs) {
  if (jobs.length) measureShrinkWrapBatch(jobs);
  if (queue.jobs.size === 0) {
    if (queue.frame) { win.cancelAnimationFrame(queue.frame); queue.frame = 0; }
    if (!queue.microtask) queues.delete(win);
  }
}
function flushAll(win) {
  const queue = queues.get(win); if (!queue) return;
  queue.microtask = false;
  if (queue.frame) { win.cancelAnimationFrame(queue.frame); queue.frame = 0; }
  const jobs = [...queue.jobs.values()]; queue.jobs.clear();
  flush(win, queue, jobs);
}
function flushResizeDue(win) {
  const queue = queues.get(win); if (!queue) return;
  const jobs = [];
  for (const [el, job] of queue.jobs) if (job.resizeDue) { queue.jobs.delete(el); jobs.push(job); }
  flush(win, queue, jobs);
}
function schedule(el, done, mode) {
  const win = el.ownerDocument.defaultView;
  if (!win) { done(measureShrinkWrap(el)); return; }
  const queue = queueFor(win);
  let job = queue.jobs.get(el);
  if (job) job.done = done; else { job = createJob(el, done); queue.jobs.set(el, job); }
  if (mode === "microtask") {
    if (!queue.microtask) { queue.microtask = true; queueMicrotask(() => flushAll(win)); }
  } else if (mode === "resize") job.resizeDue = true;
  else if (!queue.frame && !queue.microtask) queue.frame = win.requestAnimationFrame(() => flushAll(win));
}
function unschedule(el) {
  const win = el.ownerDocument.defaultView; if (!win) return;
  const queue = queues.get(win); if (!queue) return;
  queue.jobs.delete(el); flush(win, queue, []);
}

// One ResizeObserver per window, with handler fan-out and one-frame pauses so
// our own writes do not observe themselves forever.
const observers = new WeakMap();
function observerFor(win) {
  let shared = observers.get(win);
  if (!shared) {
    const handlers = new Map();
    shared = { handlers, paused: new Set(), resume: 0, observer: new win.ResizeObserver(entries => {
      for (const entry of entries) for (const handler of handlers.get(entry.target) ?? []) handler(entry);
      flushResizeDue(win);
    }) };
    observers.set(win, shared);
  }
  return shared;
}
function observe(win, el, handler) {
  const shared = observerFor(win);
  let set = shared.handlers.get(el);
  if (!set) { set = new Set(); shared.handlers.set(el, set); shared.observer.observe(el); }
  set.add(handler);
}
function unobserve(win, el, handler) {
  const shared = observers.get(win), set = shared?.handlers.get(el);
  if (!shared || !set) return;
  set.delete(handler);
  if (set.size === 0) { shared.handlers.delete(el); shared.paused.delete(el); shared.observer.unobserve(el); }
  if (shared.handlers.size === 0) {
    shared.observer.disconnect();
    if (shared.resume) win.cancelAnimationFrame(shared.resume);
    observers.delete(win);
  }
}
function pause(win, el) {
  const shared = observers.get(win);
  if (!shared || !shared.handlers.has(el) || shared.paused.has(el)) return;
  shared.observer.unobserve(el); shared.paused.add(el);
  shared.resume ||= win.requestAnimationFrame(() => {
    shared.resume = 0;
    for (const target of shared.paused) if (shared.handlers.has(target)) shared.observer.observe(target);
    shared.paused.clear();
  });
}

/** Attach measurement to one element. Returns a cleanup that removes every
 * observer and queued job and restores the author inline max-width. */
export function attachShrinkWrap(el, { immediate = false } = {}) {
  let disposed = false, current = null, pauseFrom = 0;
  const win = el.ownerDocument.defaultView, roWindow = win?.ResizeObserver ? win : null;
  const sizes = new Map(), watched = [];
  const record = target => sizes.set(target, { inline: target.offsetWidth ?? 0, block: target.offsetHeight ?? 0 });
  const done = value => {
    if (disposed) return;
    current = value;
    for (const target of watched) record(target);
    if (roWindow && pauseFrom > 0) for (const target of watched.slice(pauseFrom)) pause(roWindow, target);
    pauseFrom = 0;
  };
  const request = mode => { if (!disposed) schedule(el, done, mode); };
  const onResize = entry => {
    const size = entry.borderBoxSize?.[0];
    const inline = size ? size.inlineSize : entry.contentRect.width, block = size ? size.blockSize : entry.contentRect.height;
    const prev = sizes.get(entry.target) ?? { inline, block };
    sizes.set(entry.target, { inline, block });
    const self = entry.target === el;
    if (!resizeWarrantsMeasure({ self, inline, block, prevInline: prev.inline, prevBlock: prev.block, applied: current })) return;
    if (!self) pauseFrom = Math.max(pauseFrom, watched.indexOf(entry.target));
    request(self ? "frame" : "resize");
  };
  const watch = target => { if (roWindow) observe(roWindow, target, onResize); watched.push(target); if (immediate) record(target); };
  remember(el);
  if (immediate) current = measureShrinkWrap(el); else request("microtask");
  watch(el);
  for (let parent = el.parentElement, depth = 0; parent && depth < SHRINK_WRAP_ANCESTOR_LIMIT; parent = parent.parentElement, depth++) watch(parent);
  const mutations = win?.MutationObserver ? new win.MutationObserver(() => request("microtask")) : null;
  mutations?.observe(el, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [SHRINK_WRAP_ATTRIBUTE] });
  const fonts = el.ownerDocument.fonts, onFonts = () => request("microtask");
  fonts?.addEventListener?.("loadingdone", onFonts);
  if (fonts && fonts.status !== "loaded") fonts.ready.then(onFonts);
  return () => {
    disposed = true;
    unschedule(el);
    if (roWindow) for (const target of watched) unobserve(roWindow, target, onResize);
    mutations?.disconnect();
    fonts?.removeEventListener?.("loadingdone", onFonts);
    restoreShrinkWrap(el);
  };
}
