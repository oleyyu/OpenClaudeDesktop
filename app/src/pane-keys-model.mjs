// Session pane keyboard: type-to-focus the composer, Tab from the transcript into the composer, and Arrow / Page
// keys that scroll the transcript from anywhere with an eased animation. Claude 2.31226.0 cc43287c9-Bchz60VT.js
// session pane keydown (readable :45084-45180, the `i` listener with kn/jn/An), its imperative handle
// (:43974-43979 tryFocusComposer / focusAndInsert), and the helpers it imports: ca80fca8d jZ (Vy, :26952 key name),
// sZ / cZ (D_ / cv, :26737-26754 focusable scroller / other scroller), shared-16 rp / ip / ap / op (Zm / ah / ih,
// :6455-6480 key owners and the composer Page-key exception), shared-150 sz (Pn, :19942 open layer) / RR (wn,
// :19765 approval digits), shared-15 Pa (Ky, :2852 scroll-padding-bottom) and F3 = 48 (:44569 arrow step).
// Pure where it can be: the DOM helpers take elements and only call matches / closest / getComputedStyle.

// F3: one arrow press moves 48px; a Page press 90% of the scroller's visible height above its scroll padding.
export const ARROW_SCROLL_STEP = 48;
export const PAGE_SCROLL_FRACTION = 0.9;
// r(): each frame closes a quarter of the remaining distance, at least one pixel; under a pixel it lands.
export const SCROLL_EASE_FRACTION = 0.25;

const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown"]);

export const isMacPlatform = (nav = globalThis.navigator) =>
  !nav || /Mac|iPhone|iPad/.test(nav.platform || nav.userAgent || "");

// Windows / Linux chords. The app's ⌘ chords are Ctrl there (metaKey is the Windows key, which the OS keeps for
// itself and which is never a chord modifier); the official bindings' "non-mac" rows say the same (shared-1 Wy:
// cmd → ctrl). primaryModifier is ⌘ on macOS and Ctrl elsewhere.
export const primaryModifier = (event, { mac = isMacPlatform() } = {}) => !!(mac ? event?.metaKey : event?.ctrlKey);
/**
 * A Mac-written chord matcher's view of `event`: on macOS the event itself; elsewhere a copy with Ctrl read as ⌘ and
 * the Windows key as ⌃, so a ⌘X matcher matches Ctrl+X and a ⌃-only matcher (⌃O, ⌃`) never matches a Ctrl chord by
 * accident (callers bind those explicitly). An AltGr chord (Ctrl+Alt with AltGraph, which types a character on many
 * layouts) loses its Ctrl, as the official split keys do (shared-23 u4 getModifierState("AltGraph")).
 */
export function macChordView(event, { mac = isMacPlatform() } = {}) {
  if (mac || !event) return event;
  const altGraph = !!event.ctrlKey && !!event.altKey && !!event.getModifierState?.("AltGraph");
  return {
    type: event.type, key: event.key, code: event.code, keyCode: event.keyCode, repeat: event.repeat,
    isComposing: event.isComposing, shiftKey: !!event.shiftKey, altKey: !!event.altKey, target: event.target,
    defaultPrevented: event.defaultPrevented, metaKey: !!event.ctrlKey && !altGraph, ctrlKey: !!event.metaKey,
    getModifierState: (key) => !!event.getModifierState?.(key),
    preventDefault: () => event.preventDefault?.(), stopPropagation: () => event.stopPropagation?.(),
  };
}

// jZ (Vy): Ctrl+Home / Ctrl+End name Home / End; on macOS Option+↑ / Option+↓ are Page Up / Page Down; any other
// Ctrl, ⌘ or Option chord is not a pane key. Shift is kept (Shift+letter types its capital).
export function paneKeyName(event, { mac = isMacPlatform() } = {}) {
  const { ctrlKey, metaKey, altKey, shiftKey, key } = event;
  if (ctrlKey && !metaKey && !altKey && !shiftKey && (key === "Home" || key === "End")) return key;
  if (altKey && !ctrlKey && !metaKey && !shiftKey && mac)
    return key === "ArrowUp" ? "PageUp" : key === "ArrowDown" ? "PageDown" : null;
  if (ctrlKey || metaKey || altKey) return null;
  return key;
}

export const isScrollKey = (name) => SCROLL_KEYS.has(name);

// The distance one press adds to the scroll target.
export function keyScrollDelta(name, { clientHeight = 0, scrollPaddingBottom = 0 } = {}) {
  const page = (clientHeight - scrollPaddingBottom) * PAGE_SCROLL_FRACTION;
  if (name === "ArrowDown") return ARROW_SCROLL_STEP;
  if (name === "ArrowUp") return -ARROW_SCROLL_STEP;
  if (name === "PageDown") return page;
  if (name === "PageUp") return -page;
  return 0;
}

// A held key accumulates onto the pending target (kn ?? scrollTop), clamped to the scroll range.
export function nextScrollTarget({ pending = null, scrollTop = 0, scrollHeight = 0, clientHeight = 0, delta = 0 }) {
  const maximum = Math.max(0, scrollHeight - clientHeight);
  return Math.max(0, Math.min(maximum, (pending ?? scrollTop) + delta));
}

// r(): one animation frame toward the target.
export function easeScrollStep(top, target) {
  if (Math.abs(target - top) < 1) return { top: target, done: true };
  const distance = target - top;
  return { top: top + Math.sign(distance) * Math.max(1, Math.abs(distance) * SCROLL_EASE_FRACTION), done: false };
}

// shared-16 ip: what owns its own keys (editors, menus, options, tabs, comboboxes, sliders, trees, canvases,
// applications) — plus an open approval card (local .sac-card is the reference's .epitaxy-approval-card).
export const KEY_OWNER_SELECTOR =
  'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role^="menu"],[role="option"],[role="tab"],[role="combobox"],[role="textbox"],[role="searchbox"],[role="listbox"],[role="radiogroup"],[role="radio"],[role="tree"],[role="treeitem"],[role="slider"],canvas, [role="application"]';
export const OPEN_CARD_SELECTOR = '.sac-card[data-approval-presentation="card"]:not([data-collapsed])';
export const COMPOSER_EDITOR_SELECTOR = '[data-cds="ChatComposerEditor"]';
// The reference's Space exception (cc43287c9 :45166-45170): Space presses a focused button-like control.
export const BUTTON_LIKE_SELECTOR = 'button,[role="button"],[role="switch"],[role="checkbox"],[role="radio"]';

// rp (Zm): the focused element owns its keys.
export function ownsKeys(element) {
  if (!element || typeof element.matches !== "function") return false;
  return element.matches(KEY_OWNER_SELECTOR) || !!element.closest?.(OPEN_CARD_SELECTOR);
}

// ap (ah): Page Up / Page Down inside the composer editor scroll the transcript while the editor itself does not
// scroll (Shift+Page keeps its selection meaning).
export function composerPageKey(event, element) {
  if ((event.key !== "PageUp" && event.key !== "PageDown") || event.shiftKey) return false;
  const editor = element?.closest?.(COMPOSER_EDITOR_SELECTOR);
  return !!editor && editor.scrollHeight <= editor.clientHeight;
}

// sZ (D_): a focused keyboard scroller keeps the arrows.
export function focusableScroller(element) {
  return !!element && element.tabIndex >= 0 && element.scrollHeight > element.clientHeight;
}

// cZ (cv): focus sits inside another scroll container (a sidebar list, a file pane) that is not the transcript.
export function inOtherScroller(element, scroller, getStyle = (node) => node.ownerDocument?.defaultView?.getComputedStyle(node)) {
  if (!element || (scroller && scroller.contains(element))) return false;
  const doc = element.ownerDocument;
  for (let node = element; node && node !== doc?.body && node !== doc?.documentElement; node = node.parentElement) {
    if (scroller && node.contains(scroller)) return false;
    const overflow = getStyle(node)?.overflowY;
    if (overflow === "auto" || overflow === "scroll" || overflow === "overlay") return true;
  }
  return false;
}

// sz (Pn) with lR / az: an open menu, listbox, dialog, popover or alert dialog that is visible. An idle toast (one
// that does not hold focus) does not count unless the key is an approval-card digit (RR). Local modal dialogs also
// make #root inert.
export const OPEN_LAYER_SELECTOR =
  '[role="menu"],[role="listbox"],[role="dialog"],[role="alertdialog"],dialog[open],[data-ask-user-input-banner]:not([data-chromeless]),[data-radix-dialog-content]';
const TOAST_SELECTOR = '[data-cds="Toast"]';
export function openLayer(doc, { skipIdleToasts = false } = {}) {
  if (!doc) return false;
  if (doc.getElementById?.("root")?.inert === true) return true;
  for (const layer of doc.querySelectorAll(OPEN_LAYER_SELECTOR)) {
    if (skipIdleToasts && layer.closest(TOAST_SELECTOR) && !layer.contains(doc.activeElement)) continue;
    if (typeof layer.checkVisibility !== "function" || layer.checkVisibility()) return true;
  }
  return false;
}
// RR (wn): a digit some open approval or question card answers.
export function approvalDigit(key, doc) {
  if (!/^[1-9]$/.test(key) || !doc) return false;
  return Array.from(doc.querySelectorAll("[data-approval-card-digits],[data-question-card-digits]")).some((card) =>
    Number(key) <= Number(card.getAttribute("data-approval-card-digits") ?? card.getAttribute("data-question-card-digits")));
}

/**
 * What a session-pane keydown does (cc43287c9 :45108-45177).
 * @param {KeyboardEvent} event
 * @param {object} context - facts about the focus and the page:
 *   name (paneKeyName), keyOwner (ownsKeys(active)), composerPage (composerPageKey), layer (openLayer),
 *   scrollerFocus (focusableScroller(active)), otherScroller (inOtherScroller(active, transcript)),
 *   inTranscript (the transcript contains the focus), inApplication (focus inside [role=application]),
 *   landing (the new-session page without a session), buttonFocus (focus on a button-like control),
 *   locked (the composer takes no typing).
 * @returns {null | {type: "cancel"} | {type: "scroll", key: string} | {type: "tab"} | {type: "insert", char: string}}
 */
export function paneKeyAction(event, context = {}) {
  if (event.defaultPrevented) return { type: "cancel" };
  if (event.isComposing || event.keyCode === 229) return null;
  const name = context.name ?? null;
  if (name === null || typeof event.key !== "string") return null;
  const scroll = isScrollKey(name);
  if (!scroll && event.key !== "Tab" && event.key.length !== 1) return null;
  if ((!context.composerPage && context.keyOwner) || context.layer) return null;
  if (scroll) {
    if (context.scrollerFocus || (!context.composerPage && context.otherScroller)) return null;
    return { type: "scroll", key: name };
  }
  if (event.key === "Tab") {
    if (event.shiftKey || context.landing || !context.inTranscript || context.inApplication) return null;
    return { type: "tab" };
  }
  if (event.key === " " && context.buttonFocus) return null;
  if (context.locked) return null;
  return { type: "insert", char: event.key };
}

// The listener's whole read of the page, for one keydown: the facts paneKeyAction takes.
export function paneKeyContext(event, { doc, transcript = null, landing = false, locked = false, mac } = {}) {
  const active = deepActiveElement(doc);
  const name = paneKeyName(event, { mac });
  const scroll = isScrollKey(name);
  const composerPage = composerPageKey(event, active);
  return {
    name,
    keyOwner: ownsKeys(active),
    composerPage,
    layer: openLayer(doc, { skipIdleToasts: !approvalDigit(event.key, doc) }),
    scrollerFocus: scroll ? focusableScroller(active) : false,
    otherScroller: scroll && !composerPage ? inOtherScroller(active, transcript) : false,
    inTranscript: !!active && !!transcript?.contains(active),
    inApplication: !!active?.closest?.('[role="application"]'),
    landing,
    // op (ih): the focused element itself is button-like.
    buttonFocus: typeof active?.matches === "function" && active.matches(BUTTON_LIKE_SELECTOR),
    locked,
  };
}

// Hc (mu): the focused element, through open shadow roots; the body when nothing is focused.
export function deepActiveElement(doc) {
  let active = doc?.activeElement ?? null;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

// shared-15 Pa (Ky): the scroller's scroll-padding-bottom in px (0 when unset).
export function scrollPaddingBottom(element) {
  const value = element?.ownerDocument?.defaultView?.getComputedStyle(element).scrollPaddingBottom ?? "";
  const number = value.endsWith("px") ? Number.parseFloat(value) : Number.NaN;
  return number > 0 ? number : 0;
}
