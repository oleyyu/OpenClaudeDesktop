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

  const ops = { read_page: readPage, find };
  globalThis.__openclaudeBridge = {
    run(op, args) {
      const fn = ops[op];
      if (!fn) return { error: { code: "unknown_tool", message: `The page script has no ${op}.` } };
      try { return fn(args ?? {}); } catch (error) { return { error: { code: "page_error", message: error?.message ?? String(error) } }; }
    },
  };
})();
