// OpenClaude Desktop Bridge — content script.
// Injected by the service worker into a tab only when a tool acts on it (chrome.scripting, isolated world: the page's
// own scripts can't see or change anything here). It reads the page as an accessibility tree and hands out refs.
//
// Refs: read_page gives every interactive element a ref (ref_N; N comes from the service worker's counter, so a name is
// never reused on any tab) and keeps ref → element here. Each read_page drops the previous refs. find adds refs for its
// matches without dropping. The service worker keeps a copy of what was handed out, because this map is gone once the
// page reloads; a ref whose element left the page is reported as stale_ref, never silently ignored.
// Interactive: button, a[href], input (not hidden), select, textarea, [role=button], [contenteditable], [onclick].
// Text nodes never get a ref.
// form_input and computer act on an element by its ref (a coordinate only when there is no ref) and dispatch the DOM
// events a user's input makes.
(() => {
  if (globalThis.__openclaudeBridge) return;

  const refs = new Map(); // "ref_N" → WeakRef<Element>
  let nextRef = 1;

  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "HEAD", "META", "LINK", "IFRAME", "OBJECT", "EMBED"]);
  const MAX_NAME = 120;
  const MAX_TEXT = 400;
  const clean = (text, max = MAX_TEXT) => {
    const value = String(text ?? "").replace(/\s+/g, " ").trim();
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
  };
  const quote = (text) => `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

  function isInteractive(el) {
    const tag = el.tagName;
    if (tag === "BUTTON" || tag === "SELECT" || tag === "TEXTAREA") return true;
    if (tag === "A") return el.hasAttribute("href");
    if (tag === "INPUT") return (el.getAttribute("type") ?? "").toLowerCase() !== "hidden";
    if (el.getAttribute("role") === "button") return true;
    const editable = el.getAttribute("contenteditable");
    if (editable !== null && editable.toLowerCase() !== "false") return true;
    return el.hasAttribute("onclick");
  }

  function hidden(el) {
    if (el.hidden || el.getAttribute("aria-hidden") === "true") return true;
    // display: contents has no box of its own, so checkVisibility calls it hidden; its children still show.
    if (typeof el.checkVisibility === "function") return !el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true }) && getComputedStyle(el).display !== "contents";
    const style = getComputedStyle(el);
    return style.display === "none" || style.visibility === "hidden";
  }

  const INPUT_ROLES = { button: "button", submit: "button", reset: "button", image: "button", checkbox: "checkbox", radio: "radio", range: "slider", number: "spinbutton", search: "searchbox" };
  const TAG_ROLES = {
    A: "link", BUTTON: "button", TEXTAREA: "textbox", P: "paragraph", UL: "list", OL: "list", LI: "listitem", NAV: "navigation",
    MAIN: "main", HEADER: "banner", FOOTER: "contentinfo", FORM: "form", TABLE: "table", TR: "row", TD: "cell", TH: "columnheader",
    DIALOG: "dialog", ARTICLE: "article", ASIDE: "complementary", OPTION: "option", IMG: "img", LABEL: "label", FIELDSET: "group",
    LEGEND: "legend", BLOCKQUOTE: "blockquote", PRE: "code", CODE: "code", SUMMARY: "summary", DETAILS: "group", HR: "separator",
    H1: "heading", H2: "heading", H3: "heading", H4: "heading", H5: "heading", H6: "heading", SECTION: "region", SELECT: "combobox",
  };
  function roleOf(el) {
    const explicit = (el.getAttribute("role") ?? "").trim().split(/\s+/)[0];
    if (explicit) return explicit;
    if (el.tagName === "INPUT") return INPUT_ROLES[(el.getAttribute("type") ?? "text").toLowerCase()] ?? "textbox";
    if (el.tagName === "SELECT" && (el.multiple || el.size > 1)) return "listbox";
    if (el.tagName === "A" && !el.hasAttribute("href")) return null;
    if (el.isContentEditable && el.getAttribute("contenteditable") !== null) return "textbox";
    return TAG_ROLES[el.tagName] ?? (isInteractive(el) ? "generic" : null);
  }

  function labelText(el) {
    const parts = [];
    if (el.labels) for (const label of el.labels) parts.push(label.textContent);
    return clean(parts.join(" "), MAX_NAME);
  }
  function nameOf(el, role) {
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const text = clean(labelledBy.split(/\s+/).map((id) => el.ownerDocument.getElementById(id)?.textContent ?? "").join(" "), MAX_NAME);
      if (text) return text;
    }
    const aria = clean(el.getAttribute("aria-label"), MAX_NAME);
    if (aria) return aria;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
      const type = (el.getAttribute("type") ?? "").toLowerCase();
      if (tag === "INPUT" && ["submit", "reset", "button"].includes(type)) return clean(el.value || type, MAX_NAME);
      if (tag === "INPUT" && type === "image") return clean(el.alt || el.title, MAX_NAME);
      return labelText(el) || clean(el.getAttribute("placeholder") || el.title, MAX_NAME);
    }
    if (tag === "IMG") return clean(el.getAttribute("alt") || el.title, MAX_NAME);
    if (role && ["link", "button", "heading", "option", "summary", "label", "legend", "tab", "menuitem", "cell", "columnheader", "listitem", "checkbox", "radio", "generic"].includes(role)) {
      let text = clean(el.innerText ?? el.textContent, MAX_NAME);
      if (!text) text = clean([...el.querySelectorAll("img[alt], svg title")].map((node) => node.getAttribute?.("alt") ?? node.textContent).join(" "), MAX_NAME);
      if (text) return text;
    }
    return clean(el.title, MAX_NAME);
  }

  function details(el, role) {
    const out = [];
    const tag = el.tagName;
    if (role === "heading") out.push(`[level=${tag.slice(1)}]`);
    if (tag === "INPUT") {
      const type = (el.getAttribute("type") ?? "text").toLowerCase();
      if (!["text", "checkbox", "radio", "submit", "button", "reset"].includes(type)) out.push(`type=${type}`);
      if (type === "checkbox" || type === "radio") { if (el.checked) out.push("checked"); }
      else if (type === "password") { if (el.value) out.push("value=(hidden)"); }
      else if (!["submit", "button", "reset", "image"].includes(type) && el.value) out.push(`value=${quote(clean(el.value, MAX_NAME))}`);
    } else if (tag === "TEXTAREA" && el.value) out.push(`value=${quote(clean(el.value, MAX_NAME))}`);
    else if (role === "textbox" && el.isContentEditable) { const text = clean(el.innerText, MAX_NAME); if (text) out.push(`value=${quote(text)}`); }
    else if (tag === "SELECT") {
      const chosen = [...el.selectedOptions].map((option) => clean(option.textContent, 60)).join(", ");
      if (chosen) out.push(`value=${quote(chosen)}`);
    }
    if (el.disabled || el.getAttribute("aria-disabled") === "true") out.push("disabled");
    if (el.required) out.push("required");
    const expanded = el.getAttribute("aria-expanded");
    if (expanded) out.push(`expanded=${expanded}`);
    if (tag === "A" && el.hasAttribute("href")) out.push(`href=${quote(clean(el.href, 300))}`);
    if (role === "generic" && el.hasAttribute("onclick")) out.push("(clickable)");
    return out.join(" ");
  }

  function assign(el, handedOut) {
    const ref = `ref_${nextRef++}`;
    refs.set(ref, new WeakRef(el));
    handedOut[ref] = { role: roleOf(el), name: nameOf(el, roleOf(el)) };
    return ref;
  }

  function childrenOf(node) {
    const list = [];
    if (node.shadowRoot) list.push(...node.shadowRoot.childNodes);
    if (node.tagName === "SLOT") list.push(...node.assignedNodes());
    else list.push(...node.childNodes);
    return list;
  }

  /** The tree under `root` as YAML-style lines. Plain containers (div, span …) are flattened into their parent. */
  function readTree(root, { filter, depth, maxChars, handedOut }) {
    const lines = [];
    let chars = 0, truncated = false, refCount = 0, cut = 0;
    const push = (level, text) => {
      if (truncated) return;
      const line = `${"  ".repeat(level)}- ${text}`;
      if (chars + line.length + 1 > maxChars) { truncated = true; return; }
      lines.push(line);
      chars += line.length + 1;
    };
    const walk = (node, level) => {
      if (truncated) return;
      if (node.nodeType === Node.TEXT_NODE) {
        if (filter === "interactive") return;
        const text = clean(node.textContent);
        if (text) push(level, `text: ${text}`);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (SKIP.has(node.tagName) || hidden(node)) return;
        const interactive = isInteractive(node);
        const role = roleOf(node);
        if (interactive || (role && filter !== "interactive")) {
          if (level >= depth) { cut += 1; return; }
          const ref = interactive ? assign(node, handedOut) : null;
          if (ref) refCount += 1;
          const name = nameOf(node, role);
          const extra = details(node, role);
          const kids = childrenOf(node);
          // A leaf whose whole content is its name, or a paragraph of plain text, takes one line.
          const onlyText = kids.every((kid) => kid.nodeType === Node.TEXT_NODE);
          const ownText = onlyText ? clean(node.textContent) : "";
          if (filter === "interactive") {
            push(level, [role ?? "generic", name ? quote(name) : "", `[${ref}]`, extra].filter(Boolean).join(" "));
            for (const kid of kids) walk(kid, level);
            return;
          }
          const head = [role, name ? quote(name) : "", ref ? `[${ref}]` : "", extra].filter(Boolean).join(" ");
          if (onlyText) { push(level, ownText && ownText !== name ? `${head}: ${ownText}` : head); return; }
          push(level, head);
          for (const kid of kids) walk(kid, level + 1);
          return;
        }
      }
      for (const kid of childrenOf(node)) walk(kid, level);
    };
    if (root === document.body || root === document.documentElement) for (const kid of childrenOf(root)) walk(kid, 0);
    else walk(root, 0);
    if (cut) lines.push(`- … ${cut} deeper element${cut === 1 ? "" : "s"} not shown (raise depth)`);
    if (truncated) lines.push(`- … truncated at ${maxChars} characters`);
    return { tree: lines.join("\n"), refCount, truncated };
  }

  function lookup(ref) {
    const entry = refs.get(ref);
    if (!entry) return { error: { code: "stale_ref", message: `${ref} isn't on this page any more (it reloaded or read_page ran again). Call read_page for fresh refs.` } };
    const el = entry.deref();
    if (!el || !el.isConnected) {
      refs.delete(ref);
      return { error: { code: "stale_ref", message: `${ref}'s element was removed from the page. Call read_page for fresh refs.` } };
    }
    return { el };
  }

  function readPage({ startAt, filter = "all", depth = 15, refId = null, maxChars = 50000 }) {
    let root = document.body ?? document.documentElement;
    if (refId) {
      const found = lookup(refId);
      if (found.error) return found;
      root = found.el;
    }
    // Every read_page starts over: the refs handed out before are void from here on.
    refs.clear();
    nextRef = startAt;
    const handedOut = {};
    const { tree, refCount, truncated } = readTree(root, { filter: filter === "interactive" ? "interactive" : "all", depth, maxChars, handedOut });
    return { result: { title: document.title, url: location.href, tree, refCount, truncated }, refs: handedOut, nextRef };
  }

  /** Elements whose own text, name or value contains `query` (case-insensitive); an interactive ancestor stands in for
   * its text. New refs join the current set; nothing is dropped. */
  function find({ query, startAt, limit = 20 }) {
    const needle = clean(query, 500).toLowerCase();
    if (!needle) return { error: { code: "bad_request", message: "query is empty." } };
    nextRef = startAt;
    const handedOut = {};
    const seen = new Set();
    const matches = [];
    let total = 0;
    const consider = (el) => {
      let target = el;
      for (let node = el; node && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement ?? node.getRootNode()?.host) {
        if (isInteractive(node)) { target = node; break; }
      }
      if (seen.has(target)) return;
      seen.add(target);
      total += 1;
      if (matches.length >= limit) return;
      let ref = null;
      for (const [name, weak] of refs) if (weak.deref() === target) { ref = name; break; }
      if (!ref) ref = assign(target, handedOut);
      const role = roleOf(target);
      matches.push({ ref, role: role ?? target.tagName.toLowerCase(), name: nameOf(target, role), interactive: isInteractive(target), text: clean(target.innerText ?? target.textContent, 200) });
    };
    const walk = (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (SKIP.has(node.tagName) || hidden(node)) return;
        const own = [...node.childNodes].filter((kid) => kid.nodeType === Node.TEXT_NODE).map((kid) => kid.textContent).join(" ");
        const attrs = [node.getAttribute("aria-label"), node.getAttribute("placeholder"), node.getAttribute("alt"), node.getAttribute("title"),
          node.tagName === "INPUT" && node.type !== "password" ? node.value : null, node.tagName === "TEXTAREA" ? node.value : null];
        if (clean(own).toLowerCase().includes(needle) || attrs.some((value) => value && value.toLowerCase().includes(needle))
          || (isInteractive(node) && clean(node.innerText ?? node.textContent).toLowerCase().includes(needle))) consider(node);
      }
      for (const kid of childrenOf(node)) if (kid.nodeType === Node.ELEMENT_NODE || kid.nodeType === Node.DOCUMENT_FRAGMENT_NODE) walk(kid);
    };
    walk(document.body ?? document.documentElement);
    return { result: { query, matches, total, title: document.title, url: location.href }, refs: handedOut, nextRef };
  }

  // ── P2: writing to the page ───────────────────────────────────────────────────────────────────────────────────────
  // Events are dispatched from here as DOM events (isTrusted is false): pages see the same sequence a real mouse or
  // keyboard makes, and the default actions DOM events don't trigger on their own (focus, typing, Enter, Tab,
  // Backspace, select-all) are carried out as well and listed in the result's `emulated`.
  const fail = (code, message) => ({ error: { code, message } });
  const TEXT_INPUTS = new Set(["text", "search", "email", "url", "tel", "password", "number", "date", "datetime-local", "month", "week", "time", "color", "range", ""]);
  const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex], [contenteditable]:not([contenteditable="false"])';

  function describe(el) {
    if (!el) return null;
    const role = roleOf(el);
    return { role: role ?? el.tagName.toLowerCase(), name: nameOf(el, role) };
  }
  const inputType = (el) => (el.getAttribute("type") ?? "").toLowerCase();
  const isTextField = (el) => (el.tagName === "INPUT" && TEXT_INPUTS.has(inputType(el))) || el.tagName === "TEXTAREA";
  const isEditable = (el) => !!el && (isTextField(el) || el.isContentEditable);
  const masked = (el, value) => (el.tagName === "INPUT" && inputType(el) === "password" ? "•".repeat(String(value).length) : value);

  function deepElementFromPoint(x, y) {
    let el = document.elementFromPoint(x, y);
    while (el?.shadowRoot) {
      const inner = el.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === el) break;
      el = inner;
    }
    return el;
  }
  const containsDeep = (outer, inner) => {
    for (let node = inner; node; node = node.parentNode ?? node.host) if (node === outer) return true;
    return false;
  };

  /** The element an action is aimed at: the ref's (preferred) or the one at `coordinate` (viewport CSS pixels). */
  function aim({ ref, coordinate }) {
    if (ref) {
      const found = lookup(ref);
      if (found.error) return found;
      return { el: found.el, ref };
    }
    if (Array.isArray(coordinate) && coordinate.length === 2 && coordinate.every(Number.isFinite)) {
      const [x, y] = coordinate;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return fail("bad_request", `(${x}, ${y}) is outside the ${innerWidth}×${innerHeight} viewport.`);
      const el = deepElementFromPoint(x, y);
      if (!el) return fail("no_element", `Nothing is at (${x}, ${y}).`);
      return { el, x, y };
    }
    return fail("bad_request", "Pass a ref (from read_page or find), or a coordinate [x, y] when there is no ref.");
  }

  /** Scrolls the element into view and picks the point to aim at: its centre, and what is really there. */
  function pointOn(target) {
    if (target.x !== undefined) return { x: target.x, y: target.y, covered: null };
    const el = target.el;
    el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return fail("not_visible", `${target.ref} has no size on the page (it may be hidden).`);
    const x = Math.round(Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1));
    const y = Math.round(Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1));
    const hit = deepElementFromPoint(x, y);
    return { x, y, covered: hit && !containsDeep(el, hit) ? describe(hit) : null };
  }

  function modifierFlags(spec) {
    const flags = { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false };
    for (const part of String(spec ?? "").toLowerCase().split("+").map((text) => text.trim()).filter(Boolean)) {
      if (part === "ctrl" || part === "control") flags.ctrlKey = true;
      else if (part === "shift") flags.shiftKey = true;
      else if (part === "alt" || part === "option") flags.altKey = true;
      else if (["cmd", "meta", "command", "super", "win", "windows"].includes(part)) flags.metaKey = true;
      else return null;
    }
    return flags;
  }

  function mouse(el, type, x, y, { button = 0, buttons = 0, detail = 0, mods = {} } = {}) {
    const init = { bubbles: !["mouseenter", "mouseleave", "pointerenter", "pointerleave"].includes(type), cancelable: true, composed: true, view: window, clientX: x, clientY: y, screenX: x + screenX, screenY: y + screenY, button, buttons, detail, ...mods };
    const event = type.startsWith("pointer") ? new PointerEvent(type, { ...init, pointerId: 1, pointerType: "mouse", isPrimary: true }) : new MouseEvent(type, init);
    return el.dispatchEvent(event);
  }
  function hoverOn(el, x, y, mods) {
    for (const type of ["pointerover", "pointerenter", "mouseover", "mouseenter", "pointermove", "mousemove"]) mouse(el, type, x, y, { mods });
  }
  function focusFor(el) {
    const focusable = el.closest?.(FOCUSABLE);
    if (focusable && typeof focusable.focus === "function") { focusable.focus({ preventScroll: true }); return true; }
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur?.();
    return false;
  }
  function press(el, x, y, { button, detail, mods }) {
    const buttons = button === 2 ? 2 : 1;
    const down = mouse(el, "pointerdown", x, y, { button, buttons, detail, mods }) & mouse(el, "mousedown", x, y, { button, buttons, detail, mods });
    if (down && button === 0) focusFor(el);
    mouse(el, "pointerup", x, y, { button, detail, mods });
    mouse(el, "mouseup", x, y, { button, detail, mods });
  }

  function click(el, x, y, { action, mods }) {
    hoverOn(el, x, y, mods);
    if (action === "right_click") {
      press(el, x, y, { button: 2, detail: 1, mods });
      mouse(el, "contextmenu", x, y, { button: 2, detail: 1, mods });
      return;
    }
    press(el, x, y, { button: 0, detail: 1, mods });
    // A dispatched click runs the element's activation behaviour: links follow, checkboxes toggle, buttons submit.
    mouse(el, "click", x, y, { detail: 1, mods });
    if (action === "double_click") {
      if (!el.isConnected) return;
      press(el, x, y, { button: 0, detail: 2, mods });
      mouse(el, "click", x, y, { detail: 2, mods });
      mouse(el, "dblclick", x, y, { detail: 2, mods });
    }
  }

  const KEYS = {
    enter: ["Enter", "Enter", 13], return: ["Enter", "Enter", 13], tab: ["Tab", "Tab", 9], escape: ["Escape", "Escape", 27], esc: ["Escape", "Escape", 27],
    backspace: ["Backspace", "Backspace", 8], delete: ["Delete", "Delete", 46], space: [" ", "Space", 32], home: ["Home", "Home", 36], end: ["End", "End", 35],
    pageup: ["PageUp", "PageUp", 33], pagedown: ["PageDown", "PageDown", 34], arrowup: ["ArrowUp", "ArrowUp", 38], arrowdown: ["ArrowDown", "ArrowDown", 40],
    arrowleft: ["ArrowLeft", "ArrowLeft", 37], arrowright: ["ArrowRight", "ArrowRight", 39], up: ["ArrowUp", "ArrowUp", 38], down: ["ArrowDown", "ArrowDown", 40],
    left: ["ArrowLeft", "ArrowLeft", 37], right: ["ArrowRight", "ArrowRight", 39],
  };
  for (let n = 1; n <= 12; n++) KEYS[`f${n}`] = [`F${n}`, `F${n}`, 111 + n];
  function keyDef(name, shift) {
    const known = KEYS[name.toLowerCase()];
    if (known) return { key: known[0], code: known[1], keyCode: known[2] };
    if ([...name].length !== 1) return null;
    const char = shift ? name.toUpperCase() : name;
    const upper = name.toUpperCase();
    const code = /[a-z]/i.test(name) ? `Key${upper}` : /\d/.test(name) ? `Digit${name}` : "";
    return { key: char, code, keyCode: upper.charCodeAt(0), char };
  }
  function keyEvent(el, type, def, mods) {
    return el.dispatchEvent(new KeyboardEvent(type, { key: def.key, code: def.code, keyCode: def.keyCode, which: def.keyCode, charCode: type === "keypress" ? def.key.charCodeAt(0) : 0, bubbles: true, cancelable: true, composed: true, view: window, ...mods }));
  }
  const focused = () => {
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el && el !== document.documentElement ? el : document.body;
  };

  /** Inserts text at the caret of a focused editable element, the way typing does (beforeinput, input). */
  function insertText(el, text) {
    if (document.execCommand("insertText", false, text)) return;
    if (isTextField(el)) {
      if (!el.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: text, bubbles: true, cancelable: true, composed: true }))) return;
      const start = el.selectionStart ?? el.value.length, end = el.selectionEnd ?? el.value.length;
      try { el.setRangeText(text, start, end, "end"); } catch { el.value += text; }
      el.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: text, bubbles: true, composed: true }));
    }
  }
  function moveFocus(from, backwards) {
    const list = [...document.querySelectorAll(FOCUSABLE)].filter((el) => el.tabIndex >= 0 && !el.disabled && !hidden(el));
    if (!list.length) return null;
    const index = list.indexOf(from);
    const next = list[(index === -1 ? (backwards ? list.length - 1 : 0) : index + (backwards ? -1 : 1) + list.length) % list.length];
    next.focus();
    return next;
  }
  /** What the browser would do for a key a page didn't cancel. Returns a short label, or null. */
  function keyDefault(el, def, mods) {
    const command = mods.ctrlKey || mods.metaKey;
    const name = def.key;
    if (command && name.toLowerCase() === "a") {
      if (isTextField(el)) el.select(); else document.execCommand("selectAll");
      return "select all";
    }
    if (command || mods.altKey) return null;
    if (name === "Tab") { const next = moveFocus(el, mods.shiftKey); return next ? `focus ${describe(next).role}` : null; }
    if (name === "Backspace" || name === "Delete") { return isEditable(el) && document.execCommand(name === "Backspace" ? "delete" : "forwardDelete") ? name.toLowerCase() : null; }
    if (name === "Enter") {
      if (el.tagName === "TEXTAREA" || el.isContentEditable) { insertText(el, "\n"); return "new line"; }
      if (el.tagName === "INPUT" && el.form) { el.form.requestSubmit(); return "submit form"; }
      if (el.matches?.('a[href], button, [role="button"], summary')) { el.click(); return "activate"; }
      return null;
    }
    if (name === " " && !isEditable(el) && el.matches?.('button, [role="button"], input[type="checkbox"], input[type="radio"], summary')) { el.click(); return "activate"; }
    if (isTextField(el) && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(name)) {
      try {
        const length = el.value.length, at = el.selectionStart ?? length;
        const to = name === "Home" ? 0 : name === "End" ? length : Math.min(Math.max(at + (name === "ArrowLeft" ? -1 : 1), 0), length);
        el.setSelectionRange(to, to);
        return "move caret";
      } catch { return null; }
    }
    if (def.char && isEditable(el)) { insertText(el, def.char); return "insert"; }
    return null;
  }
  function pressKeys(sequence) {
    const combos = String(sequence ?? "").trim().split(/\s+/).filter(Boolean);
    if (!combos.length) return fail("bad_request", 'text is the key or keys to press, e.g. "Enter", "ctrl+a", "Backspace Backspace".');
    const plan = [];
    for (const combo of combos) {
      const parts = combo.split("+");
      const keyName = parts.pop() || "+";
      const mods = modifierFlags(parts.join("+"));
      const def = mods && keyDef(keyName, mods.shiftKey);
      if (!def) return fail("bad_request", `Unknown key ${JSON.stringify(combo)}.`);
      plan.push({ combo, def, mods });
    }
    const emulated = [];
    for (const { combo, def, mods } of plan) {
      const el = focused();
      const allowed = keyEvent(el, "keydown", def, mods);
      if (allowed && def.char && !mods.ctrlKey && !mods.metaKey) keyEvent(el, "keypress", def, mods);
      const done = allowed ? keyDefault(el, def, mods) : null;
      if (done) emulated.push(`${combo}: ${done}`);
      keyEvent(focused(), "keyup", def, mods);
    }
    return { result: { keys: combos, emulated, focused: describe(focused()) } };
  }

  function typeText({ ref, text }) {
    if (typeof text !== "string" || !text) return fail("bad_request", "text is what to type.");
    let el;
    if (ref) {
      const found = lookup(ref);
      if (found.error) return found;
      el = found.el;
      if (!isEditable(el)) return fail("not_editable", `${ref} (${describe(el).role}) isn't a text field. Use form_input for selects, checkboxes and radios.`);
      if (focused() !== el) {
        el.focus({ preventScroll: true });
        try { if (isTextField(el)) el.setSelectionRange(el.value.length, el.value.length); } catch {}
      }
    } else {
      el = focused();
      if (!isEditable(el)) return fail("not_editable", "Nothing editable has focus. Click a text field first, or pass its ref.");
    }
    if (el.disabled || el.readOnly) return fail("not_editable", "That field is disabled or read-only.");
    for (const char of text) {
      const def = char === "\n" ? { key: "Enter", code: "Enter", keyCode: 13 } : keyDef(char, false) ?? { key: char, code: "", keyCode: 0, char };
      if (!keyEvent(el, "keydown", def, {})) { keyEvent(el, "keyup", def, {}); continue; }
      keyEvent(el, "keypress", def, {});
      if (char === "\n" && el.tagName === "INPUT") { if (el.form) el.form.requestSubmit(); }
      else insertText(el, char);
      keyEvent(el, "keyup", def, {});
    }
    const value = isTextField(el) ? el.value : clean(el.innerText, MAX_TEXT);
    return { result: { ...describe(el), ref: ref ?? null, typed: [...text].length, value: masked(el, value) } };
  }

  function scrollable(el) {
    for (let node = el; node && node !== document.body && node !== document.documentElement; node = node.parentElement ?? node.getRootNode()?.host) {
      const style = getComputedStyle(node);
      if ((/(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) || (/(auto|scroll|overlay)/.test(style.overflowX) && node.scrollWidth > node.clientWidth)) return node;
    }
    return document.scrollingElement ?? document.documentElement;
  }
  function scrollPage({ ref, coordinate, direction, amount = 3 }) {
    const DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    if (direction === undefined || direction === null) {
      if (!ref) return fail("bad_request", "scroll needs scroll_direction (up, down, left, right), or a ref to scroll into view.");
      const found = lookup(ref);
      if (found.error) return found;
      found.el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
      const rect = found.el.getBoundingClientRect();
      return { result: { ...describe(found.el), ref, scrolledIntoView: true, x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) } };
    }
    if (!DELTA[direction]) return fail("bad_request", "scroll_direction is up, down, left or right.");
    let origin = null, x = innerWidth / 2, y = innerHeight / 2;
    if (ref || coordinate) {
      const target = aim({ ref, coordinate });
      if (target.error) return target;
      origin = target.el;
      if (target.x !== undefined) ({ x, y } = target);
    }
    const box = scrollable(origin ?? document.documentElement);
    const [dx, dy] = DELTA[direction].map((unit) => unit * amount * 100);
    const wheelTarget = origin ?? deepElementFromPoint(x, y) ?? document.documentElement;
    const allowed = wheelTarget.dispatchEvent(new WheelEvent("wheel", { deltaX: dx, deltaY: dy, deltaMode: 0, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true, view: window }));
    const page = box === document.scrollingElement || box === document.documentElement;
    if (allowed) (page ? window : box).scrollBy({ left: dx, top: dy, behavior: "instant" });
    return { result: { direction, amount, scrolled: page ? "page" : describe(box), scrollX: Math.round(page ? scrollX : box.scrollLeft), scrollY: Math.round(page ? scrollY : box.scrollTop), cancelledByPage: !allowed } };
  }

  /** computer(action, ref?, coordinate?, text?, modifiers?, scroll_direction?, scroll_amount?) */
  function computer(args) {
    const { action } = args;
    if (action === "key") return pressKeys(args.text);
    if (action === "type") return typeText(args);
    if (action === "scroll") return scrollPage({ ref: args.ref, coordinate: args.coordinate, direction: args.scroll_direction, amount: args.scroll_amount ?? 3 });
    if (!["left_click", "right_click", "double_click", "hover"].includes(action)) return fail("bad_request", `Unknown action ${action}.`);
    const mods = modifierFlags(args.modifiers);
    if (!mods) return fail("bad_request", `modifiers ${JSON.stringify(args.modifiers)} isn't something like "shift" or "ctrl+shift".`);
    const target = aim(args);
    if (target.error) return target;
    const point = pointOn(target);
    if (point.error) return point;
    const { el } = target;
    if (action === "hover") hoverOn(el, point.x, point.y, mods);
    else click(el, point.x, point.y, { action, mods });
    return { result: { action, ...describe(el), ref: target.ref ?? null, x: point.x, y: point.y, ...(point.covered ? { coveredBy: point.covered } : {}), focused: describe(focused()), stillOnPage: el.isConnected } };
  }

  /** form_input(ref, value): sets a control's value as the user would and fires input and change. */
  function formInput({ ref, value }) {
    const found = lookup(ref);
    if (found.error) return found;
    const el = found.el;
    const tag = el.tagName, type = inputType(el);
    if (el.disabled) return fail("not_editable", `${ref} is disabled.`);
    const fire = () => {
      el.dispatchEvent(new InputEvent("input", { inputType: "insertReplacementText", bubbles: true, composed: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    if (tag === "INPUT" && (type === "checkbox" || type === "radio")) {
      const want = value === true || value === "true" || value === 1 || value === "on" || value === "checked";
      if (type === "radio" && !want) return fail("bad_request", "A radio button can only be checked (value true); check another one to change the choice.");
      const toggle = el.checked !== want;
      if (toggle) el.click(); // the click fires input and change, and the page's own click handlers
      if (el.checked !== want) return fail("page_refused", `The page kept ${ref} ${el.checked ? "checked" : "unchecked"}.`);
      return { result: { ...describe(el), ref, checked: el.checked, events: toggle ? ["click", "input", "change"] : [] } };
    }
    if (tag === "INPUT" && type === "file") return fail("bad_request", "File inputs can't be filled with form_input.");
    if (tag === "SELECT") {
      const wanted = (Array.isArray(value) ? value : [value]).map((item) => String(item));
      if (!el.multiple && wanted.length > 1) return fail("bad_request", `${ref} takes a single option.`);
      const options = [...el.options];
      const pick = (item) => options.find((option) => option.value === item) ?? options.find((option) => clean(option.textContent).toLowerCase() === item.trim().toLowerCase());
      const chosen = wanted.map(pick);
      const missing = wanted.filter((_, index) => !chosen[index]);
      if (missing.length) return fail("bad_request", `${ref} has no option ${missing.map((item) => JSON.stringify(item)).join(", ")}. Options: ${options.slice(0, 30).map((option) => JSON.stringify(clean(option.textContent, 60))).join(", ")}.`);
      for (const option of options) option.selected = chosen.includes(option);
      fire();
      return { result: { ...describe(el), ref, value: chosen.map((option) => clean(option.textContent, 60)), events: ["input", "change"] } };
    }
    if (typeof value !== "string" && typeof value !== "number") return fail("bad_request", "value must be text or a number for this field.");
    const text = String(value);
    if (isTextField(el)) {
      if (el.readOnly) return fail("not_editable", `${ref} is read-only.`);
      el.focus({ preventScroll: true });
      el.value = text; // the element's own setter: a framework's tracker sees the change on the input event
      fire();
      if (type === "number" && text && el.value === "") return fail("bad_request", `${JSON.stringify(text)} isn't a number.`);
      return { result: { ...describe(el), ref, value: masked(el, el.value), events: ["input", "change"] } };
    }
    if (el.isContentEditable) {
      el.focus({ preventScroll: true });
      document.execCommand("selectAll");
      if (!document.execCommand("insertText", false, text)) { el.textContent = text; fire(); }
      else el.dispatchEvent(new Event("change", { bubbles: true }));
      return { result: { ...describe(el), ref, value: clean(el.innerText, MAX_TEXT), events: ["input", "change"] } };
    }
    return fail("not_a_form_control", `${ref} (${describe(el).role}) isn't a form field. Use computer left_click for buttons and links.`);
  }

  const ops = { read_page: readPage, find, form_input: formInput, computer };
  globalThis.__openclaudeBridge = {
    run(op, args) {
      const fn = ops[op];
      if (!fn) return { error: { code: "unknown_tool", message: `The page script has no ${op}.` } };
      try { return fn(args ?? {}); } catch (error) { return { error: { code: "page_error", message: error?.message ?? String(error) } }; }
    },
  };
})();
