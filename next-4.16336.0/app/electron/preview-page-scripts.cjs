// Scripts the preview runs inside the previewed page for the agent tools, in an isolated world (Electron
// executeJavaScriptInIsolatedWorld): they share the DOM but not JavaScript with the page, so the page never sees
// the element references (window.__codeDesktopRefs) or can tamper with them. Each builder returns source text.
const WORLD_ID = 1717;

// read_page: an accessibility-ish outline. Interactive elements get ref_N ids the click/type tools accept.
function readPageScript({ filter = "all", maxChars = 50000 } = {}) {
  return `(() => {
  const interactiveOnly = ${JSON.stringify(filter === "interactive")};
  const maxChars = ${Number(maxChars) > 0 ? Math.min(Number(maxChars), 200000) : 50000};
  const refs = window.__codeDesktopRefs = new Map();
  let next = 0, size = 0, truncated = false;
  const lines = [];
  const clean = (value) => String(value || "").replace(/\\s+/g, " ").trim();
  const ROLES = { BUTTON: "button", SELECT: "combobox", TEXTAREA: "textbox", H1: "heading", H2: "heading", H3: "heading", H4: "heading", H5: "heading", H6: "heading",
    IMG: "img", NAV: "navigation", MAIN: "main", HEADER: "banner", FOOTER: "contentinfo", ASIDE: "complementary", FORM: "form", UL: "list", OL: "list", LI: "listitem",
    TABLE: "table", TR: "row", TH: "columnheader", TD: "cell", DIALOG: "dialog", SUMMARY: "button", OPTION: "option", SECTION: "region", ARTICLE: "article", IFRAME: "iframe", VIDEO: "video", AUDIO: "audio" };
  const INTERACTIVE = new Set(["link", "button", "textbox", "searchbox", "checkbox", "radio", "combobox", "slider", "option", "menuitem", "menuitemcheckbox", "menuitemradio", "tab", "switch", "listbox", "spinbutton"]);
  const LEAF = new Set(["link", "button", "heading", "textbox", "searchbox", "checkbox", "radio", "combobox", "slider", "option", "img", "switch", "tab", "menuitem"]);
  function roleOf(el) {
    const explicit = el.getAttribute("role");
    if (explicit) return explicit.split(/\\s+/)[0];
    if (el.tagName === "A") return el.hasAttribute("href") ? "link" : null;
    if (el.tagName === "INPUT") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      if (type === "hidden") return null;
      return { checkbox: "checkbox", radio: "radio", button: "button", submit: "button", reset: "button", image: "button", range: "slider", search: "searchbox", number: "spinbutton" }[type] || "textbox";
    }
    if (el.isContentEditable && el.parentElement && !el.parentElement.isContentEditable) return "textbox";
    return ROLES[el.tagName] || null;
  }
  function visible(el) {
    if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return false;
    if (style.display === "contents") return true;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0 || el.children.length > 0;
  }
  function nameOf(el, role) {
    let value = el.getAttribute("aria-label");
    if (clean(value)) return clean(value);
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) { value = labelledBy.split(/\\s+/).map((id) => document.getElementById(id)?.innerText || "").join(" "); if (clean(value)) return clean(value); }
    if (el.labels && el.labels.length) { value = [...el.labels].map((label) => label.innerText).join(" "); if (clean(value)) return clean(value); }
    value = el.getAttribute("alt") || el.getAttribute("title") || el.getAttribute("placeholder");
    if (clean(value)) return clean(value);
    if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return "";
    if (role && LEAF.has(role)) return clean(el.innerText || el.textContent).slice(0, 120);
    return "";
  }
  function emit(text) {
    if (truncated) return;
    if (size + text.length + 1 > maxChars) { truncated = true; return; }
    lines.push(text);
    size += text.length + 1;
  }
  function details(el, role) {
    const parts = [];
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      const type = (el.getAttribute("type") || "").toLowerCase();
      if (role === "checkbox" || role === "radio") parts.push(el.checked ? "checked" : "unchecked");
      else if (type === "password") parts.push(el.value ? 'value="••••"' : 'value=""');
      else parts.push('value="' + clean(el.value).slice(0, 200) + '"');
    }
    if (el.tagName === "SELECT") parts.push('value="' + clean(el.selectedOptions?.[0]?.text) + '"');
    if (role === "link") { const href = el.getAttribute("href"); if (href) parts.push("href=" + JSON.stringify(href.slice(0, 200))); }
    if (role === "heading") { const level = /^H(\\d)$/.exec(el.tagName); if (level) parts.push("level=" + level[1]); }
    if (el.disabled || el.getAttribute("aria-disabled") === "true") parts.push("disabled");
    if (el.getAttribute("aria-expanded")) parts.push("expanded=" + el.getAttribute("aria-expanded"));
    if (el.getAttribute("aria-selected") === "true") parts.push("selected");
    return parts.length ? " " + parts.join(" ") : "";
  }
  function walk(node, depth) {
    if (truncated) return;
    if (node.nodeType === Node.TEXT_NODE) {
      if (interactiveOnly) return;
      const text = clean(node.textContent);
      if (text) emit("  ".repeat(depth) + "- text " + JSON.stringify(text.slice(0, 300)));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node;
    const tag = el.tagName.toUpperCase();
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "HEAD"].includes(tag)) return;
    if (tag === "SVG" && !el.getAttribute("aria-label")) return;
    if (!visible(el)) return;
    const role = roleOf(el);
    const tabbable = el.hasAttribute("tabindex") && el.tabIndex >= 0;
    const isInteractive = Boolean((role && INTERACTIVE.has(role)) || el.hasAttribute("onclick") || tabbable);
    let childDepth = depth;
    if (role || isInteractive) {
      const shown = !interactiveOnly || isInteractive;
      if (shown) {
        let line = (interactiveOnly ? "" : "  ".repeat(depth)) + "- " + (role || "generic");
        const name = nameOf(el, role || (isInteractive ? "button" : null));
        if (name) line += " " + JSON.stringify(name);
        line += details(el, role);
        if (isInteractive) { next += 1; const ref = "ref_" + next; refs.set(ref, new WeakRef(el)); line += " [" + ref + "]"; }
        emit(line);
        if (!interactiveOnly) childDepth = depth + 1;
      }
      if (role && LEAF.has(role) && !el.querySelector("a[href], button, input, select, textarea, [role=button], [role=link]")) return;
    }
    const children = el.shadowRoot ? [...el.shadowRoot.childNodes, ...el.childNodes] : el.childNodes;
    for (const child of children) walk(child, childDepth);
  }
  if (document.body) walk(document.body, 0);
  return { text: lines.join("\\n"), truncated, refs: next, title: document.title, url: location.href };
})()`;
}

// Find the element a tool names (ref from read_page, or a CSS selector), scroll it into view and report where it
// is in viewport (visual) CSS pixels, which is what CDP input takes.
function locateScript({ ref = null, selector = null, focus = false } = {}) {
  return `(() => {
  const ref = ${JSON.stringify(ref)}, selector = ${JSON.stringify(selector)};
  let el = null;
  if (ref) { el = window.__codeDesktopRefs?.get(ref)?.deref() ?? null; if (!el || !el.isConnected) return { error: "No element " + ref + " on this page. Read the page again (read_page) to get fresh refs." }; }
  else if (selector) { try { el = document.querySelector(selector); } catch (error) { return { error: "Invalid selector: " + error.message }; } if (!el) return { error: "No element matches " + selector }; }
  else return { error: "Name an element: a ref from read_page or a CSS selector." };
  el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return { error: "The element isn't visible." };
  if (${JSON.stringify(focus)} && typeof el.focus === "function") el.focus();
  const viewport = window.visualViewport;
  const scale = viewport ? viewport.scale : 1, left = viewport ? viewport.offsetLeft : 0, top = viewport ? viewport.offsetTop : 0;
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  return { x: (cx - left) * scale, y: (cy - top) * scale, cssX: cx, cssY: cy, tag: el.tagName.toLowerCase(), label: (el.getAttribute("aria-label") || el.innerText || el.value || "").replace(/\\s+/g, " ").trim().slice(0, 80) };
})()`;
}

// A click made of DOM events, for a page that isn't on screen (a hidden view gets no native input).
function domClickScript({ ref = null, selector = null, x = null, y = null, clickCount = 1 } = {}) {
  return `(() => {
  const ref = ${JSON.stringify(ref)}, selector = ${JSON.stringify(selector)};
  let el = null, cx = ${JSON.stringify(x)}, cy = ${JSON.stringify(y)};
  if (ref) el = window.__codeDesktopRefs?.get(ref)?.deref() ?? null;
  else if (selector) { try { el = document.querySelector(selector); } catch {} }
  if (ref || selector) {
    if (!el || !el.isConnected) return { error: "The element is gone. Read the page again." };
    el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    const rect = el.getBoundingClientRect();
    cx = rect.left + rect.width / 2; cy = rect.top + rect.height / 2;
  }
  const target = document.elementFromPoint(cx, cy) || el;
  if (!target) return { error: "Nothing is at that point." };
  const base = { bubbles: true, cancelable: true, composed: true, clientX: cx, clientY: cy, button: 0, view: window };
  const pointer = { ...base, pointerId: 1, isPrimary: true, pointerType: "mouse" };
  for (let i = 1; i <= ${Math.max(1, Math.min(3, Number(clickCount) || 1))}; i++) {
    target.dispatchEvent(new PointerEvent("pointerdown", pointer));
    target.dispatchEvent(new MouseEvent("mousedown", { ...base, detail: i }));
    const focusable = target.closest("a, button, input, select, textarea, [tabindex], [contenteditable]");
    if (focusable && typeof focusable.focus === "function") focusable.focus();
    target.dispatchEvent(new PointerEvent("pointerup", pointer));
    target.dispatchEvent(new MouseEvent("mouseup", { ...base, detail: i }));
    if (typeof target.click === "function") target.click(); else target.dispatchEvent(new MouseEvent("click", { ...base, detail: i }));
  }
  if (${Number(clickCount) === 2}) target.dispatchEvent(new MouseEvent("dblclick", { ...base, detail: 2 }));
  return { ok: true, tag: target.tagName.toLowerCase() };
})()`;
}

// Key presses as DOM events plus the default action the page would get, for a page that isn't on screen.
function domKeyScript({ key, modifiers = {} }) {
  return `(() => {
  const key = ${JSON.stringify(key)}, mods = ${JSON.stringify(modifiers)};
  const el = document.activeElement || document.body;
  const init = { key, bubbles: true, cancelable: true, composed: true, altKey: !!mods.alt, ctrlKey: !!mods.ctrl, metaKey: !!mods.meta, shiftKey: !!mods.shift };
  const proceed = el.dispatchEvent(new KeyboardEvent("keydown", init));
  if (proceed) {
    if ((mods.meta || mods.ctrl) && key.toLowerCase() === "a") document.execCommand("selectAll");
    else if (key === "Backspace") document.execCommand("delete");
    else if (key === "Delete") document.execCommand("forwardDelete");
    else if (key === "Enter") {
      if (el.tagName === "TEXTAREA" || el.isContentEditable) document.execCommand("insertLineBreak");
      else if (el.form && typeof el.form.requestSubmit === "function") el.form.requestSubmit();
      else if (typeof el.click === "function" && (el.tagName === "BUTTON" || el.tagName === "A")) el.click();
    } else if (key === "Tab") {
      const all = [...document.querySelectorAll("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1']), [contenteditable]")].filter((node) => !node.disabled && node.offsetParent !== null);
      const index = all.indexOf(el);
      const target = all[(index + (mods.shift ? -1 : 1) + all.length) % all.length];
      target?.focus();
    } else if (key === " " && (el.tagName === "BUTTON" || el.getAttribute("role") === "button" || el.type === "checkbox")) el.click();
  }
  el.dispatchEvent(new KeyboardEvent("keyup", init));
  return { ok: true, prevented: !proceed };
})()`;
}

function pageTextScript({ maxChars = 50000 } = {}) {
  return `(() => {
  const root = document.querySelector("main, article, [role=main]") || document.body;
  const text = (root?.innerText || "").replace(/\\n{3,}/g, "\\n\\n").trim();
  const max = ${Number(maxChars) > 0 ? Math.min(Number(maxChars), 200000) : 50000};
  return { text: text.slice(0, max), truncated: text.length > max, title: document.title, url: location.href };
})()`;
}

// CDP key events: [key, code, windowsVirtualKeyCode, text].
const NAMED_KEYS = {
  enter: ["Enter", "Enter", 13, "\r"], return: ["Enter", "Enter", 13, "\r"], tab: ["Tab", "Tab", 9, ""], escape: ["Escape", "Escape", 27, ""], esc: ["Escape", "Escape", 27, ""],
  backspace: ["Backspace", "Backspace", 8, ""], delete: ["Delete", "Delete", 46, ""], space: [" ", "Space", 32, " "],
  arrowup: ["ArrowUp", "ArrowUp", 38, ""], arrowdown: ["ArrowDown", "ArrowDown", 40, ""], arrowleft: ["ArrowLeft", "ArrowLeft", 37, ""], arrowright: ["ArrowRight", "ArrowRight", 39, ""],
  up: ["ArrowUp", "ArrowUp", 38, ""], down: ["ArrowDown", "ArrowDown", 40, ""], left: ["ArrowLeft", "ArrowLeft", 37, ""], right: ["ArrowRight", "ArrowRight", 39, ""],
  home: ["Home", "Home", 36, ""], end: ["End", "End", 35, ""], pageup: ["PageUp", "PageUp", 33, ""], pagedown: ["PageDown", "PageDown", 34, ""],
};
for (let i = 1; i <= 12; i++) NAMED_KEYS[`f${i}`] = [`F${i}`, `F${i}`, 111 + i, ""];
const MODIFIERS = { alt: 1, option: 1, ctrl: 2, control: 2, meta: 4, cmd: 4, command: 4, super: 4, shift: 8 };
// Editing shortcuts a Mac page only gets as CDP `commands`.
const MAC_COMMANDS = { a: "selectAll", c: "copy", x: "cut", v: "paste", z: "undo" };

/** "cmd+shift+a" / "Enter" / "a" → {key, code, keyCode, text, modifiers (CDP bitmask), mods, commands}, or null. */
function parseKeyCombo(combo) {
  const parts = String(combo || "").split("+").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  const last = parts.pop();
  let modifiers = 0;
  const mods = {};
  for (const part of parts) {
    const bit = MODIFIERS[part.toLowerCase()];
    if (!bit) return null;
    modifiers |= bit;
    mods[{ 1: "alt", 2: "ctrl", 4: "meta", 8: "shift" }[bit]] = true;
  }
  const named = NAMED_KEYS[last.toLowerCase()];
  let key, code, keyCode, text;
  if (named) [key, code, keyCode, text] = named;
  else if (last.length === 1) {
    key = mods.shift ? last.toUpperCase() : last;
    const upper = last.toUpperCase();
    code = /[A-Z]/.test(upper) ? `Key${upper}` : /[0-9]/.test(last) ? `Digit${last}` : "";
    keyCode = upper.charCodeAt(0);
    text = key;
  } else return null;
  if (mods.meta || mods.ctrl) text = "";
  const commands = mods.meta && MAC_COMMANDS[last.toLowerCase()] ? [MAC_COMMANDS[last.toLowerCase()]] : [];
  return { key, code, keyCode, text, modifiers, mods, commands };
}

// preview_inspect: an element's tag, box, a few attributes and the computed CSS values asked for (or a default set).
const INSPECT_DEFAULTS = ["display", "position", "width", "height", "margin", "padding", "color", "background-color", "font-family", "font-size", "font-weight", "line-height", "border", "border-radius", "opacity", "visibility", "z-index", "overflow", "gap", "flex-direction", "justify-content", "align-items"];
function inspectScript({ ref = null, selector = null, properties = [] } = {}) {
  const wanted = (Array.isArray(properties) && properties.length ? properties : INSPECT_DEFAULTS).filter((name) => typeof name === "string" && /^-{0,2}[a-zA-Z][\w-]{0,80}$/.test(name)).slice(0, 80);
  return `(() => {
  const ref = ${JSON.stringify(ref)}, selector = ${JSON.stringify(selector)}, wanted = ${JSON.stringify(wanted)};
  let el = null;
  if (ref) { el = window.__codeDesktopRefs?.get(ref)?.deref() ?? null; if (!el || !el.isConnected) return { error: "No element " + ref + " on this page. Read the page again (read_page) to get fresh refs." }; }
  else if (selector) { try { el = document.querySelector(selector); } catch (error) { return { error: "Invalid selector: " + error.message }; } if (!el) return { error: "No element matches " + selector }; }
  else return { error: "Name an element: a ref from read_page or a CSS selector." };
  const style = getComputedStyle(el), rect = el.getBoundingClientRect();
  const styles = {};
  for (const name of wanted) { const value = style.getPropertyValue(name); if (value !== "") styles[name] = value; }
  const attributes = {};
  for (const name of ["id", "class", "role", "aria-label", "href", "type", "name", "disabled"]) if (el.hasAttribute(name)) attributes[name] = String(el.getAttribute(name)).slice(0, 300);
  return { tag: el.tagName.toLowerCase(), attributes, box: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) }, styles,
    text: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 200) };
})()`;
}

// preview_fill: sets a field's value the way a framework sees typing (the native setter, then input and change), or
// picks an option of a <select>, or checks a checkbox / radio.
function fillScript({ ref = null, selector = null, value = "" } = {}) {
  return `(() => {
  const ref = ${JSON.stringify(ref)}, selector = ${JSON.stringify(selector)}, value = ${JSON.stringify(value)};
  let el = null;
  if (ref) { el = window.__codeDesktopRefs?.get(ref)?.deref() ?? null; if (!el || !el.isConnected) return { error: "No element " + ref + " on this page. Read the page again (read_page) to get fresh refs." }; }
  else if (selector) { try { el = document.querySelector(selector); } catch (error) { return { error: "Invalid selector: " + error.message }; } if (!el) return { error: "No element matches " + selector }; }
  else return { error: "Name an element: a ref from read_page or a CSS selector." };
  const fire = () => { el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  if (el instanceof HTMLSelectElement) {
    const option = [...el.options].find((item) => item.value === value || item.textContent.trim() === value);
    if (!option) return { error: "No option " + JSON.stringify(value) + ". Options: " + [...el.options].map((item) => item.textContent.trim()).slice(0, 30).join(", ") };
    el.value = option.value; fire(); return { filled: el.tagName.toLowerCase(), value: option.value };
  }
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
    const checked = !/^(false|off|0|no|unchecked)$/i.test(value);
    if (el.checked !== checked) el.click();
    return { filled: el.type, value: el.checked ? "checked" : "unchecked" };
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.disabled || el.readOnly) return { error: "That field can't be edited." };
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    el.focus(); if (setter) setter.call(el, value); else el.value = value; fire();
    return { filled: el.tagName.toLowerCase(), value: el.value.slice(0, 200) };
  }
  if (el.isContentEditable) { el.focus(); el.textContent = value; el.dispatchEvent(new InputEvent("input", { bubbles: true })); return { filled: "contenteditable", value: value.slice(0, 200) }; }
  return { error: "That element isn't a form field. Use click or type instead." };
})()`;
}

// scroll: with no direction, the element a tool names (ref or selector) into view; else the scrollable box holding
// that element or the point (else the page) by `amount` wheel ticks (100 px each). Reports where it ended up.
function scrollScript({ ref = null, selector = null, x = null, y = null, direction = null, amount = 3 } = {}) {
  return `(() => {
  const ref = ${JSON.stringify(ref)}, selector = ${JSON.stringify(selector)}, x = ${JSON.stringify(x)}, y = ${JSON.stringify(y)};
  const direction = ${JSON.stringify(["up", "down", "left", "right"].includes(direction) ? direction : null)}, ticks = ${Math.max(1, Math.min(20, Number(amount) || 3))};
  let el = null;
  if (ref) { el = window.__codeDesktopRefs?.get(ref)?.deref() ?? null; if (!el || !el.isConnected) return { error: "No element " + ref + " on this page. Read the page again (read_page) to get fresh refs." }; }
  else if (selector) { try { el = document.querySelector(selector); } catch (error) { return { error: "Invalid selector: " + error.message }; } if (!el) return { error: "No element matches " + selector }; }
  if (el && direction === null) {
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    return { into: true, scrollX: Math.round(scrollX), scrollY: Math.round(scrollY) };
  }
  let target = el;
  if (!target && Number.isFinite(x) && Number.isFinite(y)) target = document.elementFromPoint(x, y);
  const scrollable = (node) => { for (let at = node; at && at !== document.documentElement && at !== document.body; at = at.parentElement) { const style = getComputedStyle(at); if ((/(auto|scroll|overlay)/.test(style.overflowY) && at.scrollHeight > at.clientHeight) || (/(auto|scroll|overlay)/.test(style.overflowX) && at.scrollWidth > at.clientWidth)) return at; } return null; };
  const box = (target && scrollable(target)) || document.scrollingElement || document.documentElement;
  const step = ticks * 100;
  const dx = direction === "left" ? -step : direction === "right" ? step : 0, dy = direction === "up" ? -step : direction === "left" || direction === "right" ? 0 : step;
  const before = [box.scrollLeft, box.scrollTop];
  box.scrollBy({ left: dx, top: dy, behavior: "instant" });
  const page = box === document.scrollingElement || box === document.documentElement;
  return { into: false, page, moved: box.scrollLeft !== before[0] || box.scrollTop !== before[1], scrollX: Math.round(page ? scrollX : box.scrollLeft), scrollY: Math.round(page ? scrollY : box.scrollTop),
    maxY: Math.round(box.scrollHeight - box.clientHeight), tag: page ? "page" : box.tagName.toLowerCase() };
})()`;
}

// hover for a page that isn't on screen: the pointer events a mouse moving onto the element sends.
function domHoverScript({ ref = null, selector = null, x = null, y = null } = {}) {
  return `(() => {
  const ref = ${JSON.stringify(ref)}, selector = ${JSON.stringify(selector)};
  let el = null, cx = ${JSON.stringify(x)}, cy = ${JSON.stringify(y)};
  if (ref) el = window.__codeDesktopRefs?.get(ref)?.deref() ?? null;
  else if (selector) { try { el = document.querySelector(selector); } catch {} }
  if (ref || selector) {
    if (!el || !el.isConnected) return { error: "The element is gone. Read the page again." };
    el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    const rect = el.getBoundingClientRect();
    cx = rect.left + rect.width / 2; cy = rect.top + rect.height / 2;
  } else el = document.elementFromPoint(cx, cy);
  if (!el) return { error: "Nothing is at that point." };
  const init = { bubbles: true, cancelable: true, composed: true, clientX: cx, clientY: cy, view: window };
  el.dispatchEvent(new PointerEvent("pointerover", init)); el.dispatchEvent(new PointerEvent("pointerenter", { ...init, bubbles: false }));
  el.dispatchEvent(new MouseEvent("mouseover", init)); el.dispatchEvent(new MouseEvent("mouseenter", { ...init, bubbles: false }));
  el.dispatchEvent(new PointerEvent("pointermove", init)); el.dispatchEvent(new MouseEvent("mousemove", init));
  return { hovered: (el.getAttribute("aria-label") || el.innerText || el.tagName.toLowerCase()).replace(/\\s+/g, " ").trim().slice(0, 80) };
})()`;
}

// find: elements whose role, accessible name or text contains the query (case-insensitive), with refs for click,
// type and preview_fill (added to the refs read_page made, which stay valid).
function findScript({ query = "", limit = 20 } = {}) {
  return `(() => {
  const query = ${JSON.stringify(String(query))}.toLowerCase().trim(), limit = ${Math.max(1, Math.min(50, Number(limit) || 20))};
  if (!query) return { error: "Give the text to look for." };
  const refs = window.__codeDesktopRefs ??= new Map();
  let next = 0;
  for (const key of refs.keys()) { const n = Number(String(key).slice(4)); if (n > next) next = n; }
  const clean = (value) => String(value || "").replace(/\\s+/g, " ").trim();
  const roleOf = (el) => {
    const explicit = el.getAttribute("role"); if (explicit) return explicit.split(/\\s+/)[0];
    const tag = el.tagName;
    if (tag === "A") return el.hasAttribute("href") ? "link" : "generic";
    if (tag === "BUTTON" || tag === "SUMMARY") return "button";
    if (tag === "INPUT") { const type = (el.getAttribute("type") || "text").toLowerCase(); return { checkbox: "checkbox", radio: "radio", button: "button", submit: "button", reset: "button", range: "slider", search: "searchbox" }[type] || "textbox"; }
    if (tag === "TEXTAREA") return "textbox"; if (tag === "SELECT") return "combobox"; if (/^H[1-6]$/.test(tag)) return "heading"; if (tag === "IMG") return "img"; if (tag === "LABEL") return "label";
    return el.isContentEditable ? "textbox" : "generic";
  };
  const nameOf = (el) => clean(el.getAttribute("aria-label") || (el.labels && [...el.labels].map((label) => label.innerText).join(" ")) || el.getAttribute("alt") || el.getAttribute("title") || el.getAttribute("placeholder") || (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ? "" : el.innerText || el.textContent)).slice(0, 120);
  const shown = (el) => { if (el.closest("[hidden],[aria-hidden=true]")) return false; const style = getComputedStyle(el); if (style.display === "none" || style.visibility === "hidden") return false; const rect = el.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; };
  const found = [], seen = new Set();
  const all = document.body ? document.body.querySelectorAll("*") : [];
  for (const el of all) {
    if (found.length >= limit) break;
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(el.tagName)) continue;
    const role = roleOf(el), name = nameOf(el);
    const own = clean([...el.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join(" "));
    const interactive = role !== "generic" && role !== "label" || el.hasAttribute("onclick") || (el.hasAttribute("tabindex") && el.tabIndex >= 0);
    const hay = (role + " " + name + " " + (el.getAttribute("placeholder") || "") + " " + (el.getAttribute("value") || "")).toLowerCase();
    // A match on its own words (a leaf) or, for an interactive element, on its name; never every ancestor of a match.
    if (!(interactive ? hay.includes(query) : own.toLowerCase().includes(query))) continue;
    if (!shown(el)) continue;
    if ([...seen].some((other) => other.contains(el) && other !== el && roleOf(other) !== "generic")) continue;
    seen.add(el);
    let ref = null;
    for (const [key, value] of refs) if (value.deref() === el) { ref = key; break; }
    if (!ref) { next += 1; ref = "ref_" + next; refs.set(ref, new WeakRef(el)); }
    found.push("- " + role + (name ? " " + JSON.stringify(name) : "") + " [" + ref + "]");
  }
  return { matches: found, more: found.length >= limit };
})()`;
}

module.exports = { WORLD_ID, readPageScript, locateScript, domClickScript, domKeyScript, pageTextScript, parseKeyCombo, inspectScript, fillScript, scrollScript, domHoverScript, findScript };
