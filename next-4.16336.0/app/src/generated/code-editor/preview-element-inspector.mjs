// Original 3.6556.2 CDP inspect/highlight, element context and React fiber capture (index.chunk-jPKPzV-P). Host supplies only the native transport.
function Qh(e, t, n) {
  let r;
  return Promise.race([
    e,
    new Promise((e) => {
      ((r = setTimeout(() => e(n), t)), r.unref());
    }),
  ]).finally(() => clearTimeout(r));
}
var Tai = 4;
var Eai = 50;
var Dai = 200;
var CZ = 100;
var Oai = 5e3;
var kai = 1500;
var Aai = 8192;
var jai = 1024;
var Mai = 222;
var Nai = `function(request) {\n  var MAX_OWNERS = ${Tai}, MAX_PROPS = ${Eai}, MAX_STRING = ${Dai}, MAX_NAME = ${CZ}, MAX_FIBERS = ${Oai}, MODULE_FETCH_TIMEOUT_MS = ${kai}, MAX_STACK = ${Aai}, MAX_STACK_LINE = ${jai}, MAX_POSITION = 1000000000;\n  // Fiber tags that are components: Function, Class, ForwardRef, Memo,\n  // SimpleMemo. Everything else (host nodes, providers, consumers, fragments,\n  // suspense) is a wrapper that must neither name the component nor hide it.\n  var COMPONENT_TAGS = { 0: true, 1: true, 11: true, 14: true, 15: true };\n  var HOST_PORTAL = 4, HOST_COMPONENT = 5, HOST_TEXT = 6, MEMO = 14;\n\n  // Any read of the page's objects may throw (a getter, a revoked Proxy), so\n  // reads go through safely() or field(): one bad field costs that field.\n  function safely(read, fallback) {\n    try { return read(); } catch (e) { return fallback; }\n  }\n  function field(obj, k) {\n    return safely(function () { return obj == null ? undefined : obj[k]; }, undefined);\n  }\n  // react-refresh registers anonymous functions as _c, _c1, _c2 and so on.\n  function usefulName(n) {\n    return typeof n === 'string' && n.length > 1 && n !== 'Anonymous' && !/^_c\\d*$/.test(n)\n      ? n.slice(0, MAX_NAME)\n      : null;\n  }\n  // forwardRef wraps the function as { render }, memo as { type }; a\n  // displayName set on the wrapper wins.\n  function typeName(type, depth) {\n    if (!type || (depth || 0) > 3) return null;\n    var named = function (k) { return usefulName(field(type, k)); };\n    if (typeof type === 'function') return named('displayName') || named('name');\n    if (typeof type === 'object') {\n      return named('displayName') || typeName(field(type, 'render'), (depth || 0) + 1) || typeName(field(type, 'type'), (depth || 0) + 1);\n    }\n    return null;\n  }\n  // elementType is the memo() wrapper on a SimpleMemo fiber, whose type is\n  // the wrapped function.\n  function componentName(fiber) {\n    var tag = field(fiber, 'tag');\n    return typeof tag === 'number' && COMPONENT_TAGS[tag] === true\n      ? typeName(field(fiber, 'elementType')) || typeName(field(fiber, 'type'))\n      : null;\n  }\n\n  // memo() with a comparator renders its wrapped type through an inner fiber\n  // of its own; the Memo fiber is the one the owner's JSX created (it holds\n  // the call site), so the pair is one component, named by the wrapper.\n  function memoWrapperOf(fiber) {\n    var wrapper = field(fiber, 'return');\n    return wrapper && field(wrapper, 'tag') === MEMO && field(field(wrapper, 'type'), 'type') === field(fiber, 'type') ? wrapper : null;\n  }\n\n  // The components whose JSX rendered this one, nearest first: the owner\n  // chain, not the tree above it (a layout wrapper in between is not an owner).\n  function ownerNames(fiber) {\n    var names = [];\n    var owner = field(fiber, '_debugOwner');\n    for (var guard = 0; owner && names.length < MAX_OWNERS && guard < 64; guard++) {\n      // A fiber, or React 19's server-component info ({ name, owner }).\n      var isFiber = typeof field(owner, 'tag') === 'number';\n      var n = isFiber\n        ? typeName(field(owner, 'elementType')) || typeName(field(owner, 'type'))\n        : usefulName(field(owner, 'name'));\n      if (n && names[names.length - 1] !== n) names.push(n);\n      owner = isFiber ? field(owner, '_debugOwner') : field(owner, 'owner');\n    }\n    return names;\n  }\n\n  function summarizeProp(v) {\n    var t = typeof v;\n    if (v === null || t === 'number' || t === 'boolean') return v;\n    if (t === 'string') return v.length > MAX_STRING ? v.slice(0, MAX_STRING) + '\u2026' : v;\n    if (t === 'function') return '[function]';\n    if (t === 'undefined') return undefined;\n    if (Array.isArray(v)) return '[array(' + v.length + ')]';\n    if (t === 'object') return v.$$typeof ? '[element]' : '[object]';\n    return '[' + t + ']';\n  }\n  function summarizeProps(props) {\n    var out = {};\n    var keys = safely(function () { return props ? Object.keys(props) : []; }, []);\n    var count = 0;\n    for (var i = 0; i < keys.length; i++) {\n      var k = keys[i];\n      if (k === 'children' || k === 'ref' || k === '__proto__') continue;\n      if (count === MAX_PROPS) {\n        var left = keys.slice(i).filter(function (j) { return j !== 'children' && j !== 'ref' && j !== '__proto__'; }).length;\n        out['...'] = '[+' + left + ' more]';\n        break;\n      }\n      var v = safely(function () { return summarizeProp(props[k]); }, '[unreadable]');\n      if (v === undefined) continue;\n      out[k.slice(0, MAX_NAME)] = v;\n      count++;\n    }\n    return out;\n  }\n\n  function union(box, r) {\n    if (!(r.width > 0 || r.height > 0) || !isFinite(r.left + r.top + r.right + r.bottom)) return box;\n    if (!box) return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };\n    box.left = Math.min(box.left, r.left);\n    box.top = Math.min(box.top, r.top);\n    box.right = Math.max(box.right, r.right);\n    box.bottom = Math.max(box.bottom, r.bottom);\n    return box;\n  }\n  // The picked node's own rect plus the rect of each DOM node the component\n  // renders (subtrees not walked, portals skipped): an absolutely positioned\n  // descendant can lie outside every node its component renders.\n  function extentOf(fiber, node) {\n    var box = safely(function () { return node.getBoundingClientRect ? union(null, node.getBoundingClientRect()) : null; }, null);\n    var first = field(fiber, 'child');\n    var stack = first ? [first] : [];\n    for (var visited = 0; stack.length && visited < MAX_FIBERS; visited++) {\n      var f = stack.pop();\n      var sibling = field(f, 'sibling');\n      if (sibling) stack.push(sibling);\n      var tag = field(f, 'tag');\n      if (tag === HOST_PORTAL) continue;\n      var child = field(f, 'stateNode');\n      if (tag === HOST_COMPONENT && child && typeof field(child, 'getBoundingClientRect') === 'function') {\n        box = safely(function () { return union(box, child.getBoundingClientRect()); }, box);\n      } else if (tag === HOST_TEXT && child && field(child, 'parentNode') && typeof document.createRange === 'function') {\n        box = safely(function () {\n          var range = document.createRange();\n          range.selectNode(child);\n          return union(box, range.getBoundingClientRect());\n        }, box);\n      } else {\n        var next = field(f, 'child');\n        if (next) stack.push(next);\n      }\n    }\n    if (!box) return null;\n    return {\n      x: box.left + window.scrollX,\n      y: box.top + window.scrollY,\n      width: box.right - box.left,\n      height: box.bottom - box.top,\n    };\n  }\n\n  // A filesystem path as React 18 or a source map reports it: kept as is\n  // (a directory may contain "#" or "?"), the end kept when it is long.\n  function fsPath(path) {\n    return String(path).slice(-MAX_STRING);\n  }\n  // Windows absolute paths ("C:/Users/\u2026") are not URLs.\n  function isDrivePath(s) {\n    return /^[A-Za-z]:[\\/\\\\]/.test(s);\n  }\n  // /src/App.tsx from http://localhost:5173/src/App.tsx?t=1, the absolute\n  // path from Vite's /@fs/ form, the path itself for webpack-internal:///./src\n  // and Next's webpack-internal:///(app-pages-browser)/./src.\n  function pathOf(url) {\n    return fsPath(String(url)\n      .replace(/[?#].*$/, '')\n      .replace(/^[a-z][a-z0-9+.-]*:\\/\\/[^/]*\\//i, '/')\n      .replace(/^\\/@fs\\//, '/')\n      .replace(/^\\/\\([^)]*\\)\\//, '/')\n      .replace(/^\\/\\.\\//, '/'));\n  }\n\n  // React 18 dev: fiber._debugSource = { fileName, lineNumber, columnNumber },\n  // original positions. React 19.1+ dev: fiber._debugStack is an Error captured\n  // inside the JSX runtime; the first frame below the runtime's own is the JSX\n  // site in the TRANSPILED module, mapped back in resolveSource. Past its\n  // per-render budget React hands every element one shared stack captured at\n  // module load ("UnknownOwner"), which points at no JSX site at all.\n  function rawSourceOf(fiber) {\n    var src = field(fiber, '_debugSource');\n    var fileName = field(src, 'fileName');\n    if (typeof fileName === 'string' && fileName) {\n      return { file: fsPath(fileName), line: field(src, 'lineNumber'), column: field(src, 'columnNumber'), mapped: true };\n    }\n    var stack = field(field(fiber, '_debugStack'), 'stack');\n    if (typeof stack !== 'string') return null;\n    // A real stack is a few short frames; anything else is not worth reading\n    // (the frame pattern backtracks on a long line).\n    var lines = stack.slice(0, MAX_STACK).split('\\n');\n    if (lines.some(function (l) { return /\\bUnknownOwner\\b/.test(l); })) return null;\n    for (var i = 0; i < lines.length; i++) {\n      if (lines[i].length > MAX_STACK_LINE) continue;\n      var m = /^\\s*at (?:(.*?) \\()?(.+?):(\\d+):(\\d+)\\)?\\s*$/.exec(lines[i]);\n      if (!m) continue;\n      var fn = m[1] || '';\n      // A module URL or an absolute path; not "<anonymous>" or an eval site.\n      if (!/^([a-z][a-z0-9+.-]*:|\\/)/i.test(m[2])) continue;\n      if (/^(exports\\.|Object\\.|Module\\.)?(jsxs?(DEV)?|createElement)$|react_stack_bottom_frame/.test(fn)) continue;\n      if (/\\/node_modules\\/\\.vite\\/|react[-_]?jsx[-_]?(dev[-_]?)?runtime|\\/react-dom[\\/_-]|\\/react\\/cjs\\//.test(m[2])) continue;\n      return { url: m[2], line: Number(m[3]), column: Number(m[4]), mapped: false };\n    }\n    return null;\n  }\n\n  // Source map v3 lookup for a generated position (1-based in, 1-based out).\n  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';\n  function originalPosition(map, genLine, genCol) {\n    var rows = String(map.mappings).split(';');\n    if (genLine > rows.length) return null;\n    var source = 0, origLine = 0, origCol = 0, best = null;\n    for (var l = 0; l < genLine; l++) {\n      var fields = rows[l].split(',');\n      var col = 0;\n      for (var i = 0; i < fields.length; i++) {\n        var f = fields[i], p = 0, values = [];\n        while (p < f.length) {\n          var value = 0, shift = 0, c;\n          do {\n            if (p >= f.length) return null;\n            c = B64.indexOf(f.charAt(p++));\n            if (c < 0) return null;\n            value += (c & 31) * Math.pow(2, shift);\n            shift += 5;\n          } while (c & 32);\n          values.push(value & 1 ? -Math.floor(value / 2) : Math.floor(value / 2));\n        }\n        if (values.length === 0) continue;\n        col += values[0];\n        // The segment in force at the column is the last one at or before\n        // it; a segment without a source field leaves the position unmapped.\n        if (values.length < 4) {\n          if (l === genLine - 1 && col <= genCol - 1) best = null;\n          continue;\n        }\n        source += values[1];\n        origLine += values[2];\n        origCol += values[3];\n        if (l === genLine - 1 && col <= genCol - 1) {\n          best = { source: map.sources && map.sources[source], line: origLine + 1, column: origCol + 1 };\n        }\n      }\n    }\n    return best && typeof best.source === 'string' ? best : null;\n  }\n\n  var moduleMaps = Object.create(null);\n  // Same-origin only: the page fetches its own dev server's module text and\n  // reads the inline map Vite appends.\n  function fetchMap(url) {\n    if (!moduleMaps[url]) {\n      moduleMaps[url] = Promise.resolve().then(function () {\n        var parsed = new URL(url, location.href);\n        if (parsed.origin !== location.origin || !/^https?:$/.test(parsed.protocol)) return { fetched: false };\n        var controller = typeof AbortController === 'function' ? new AbortController() : null;\n        var timer = controller && setTimeout(function () { controller.abort(); }, MODULE_FETCH_TIMEOUT_MS);\n        var done = function () { if (timer) clearTimeout(timer); };\n        return fetch(parsed.href, { signal: controller ? controller.signal : undefined, credentials: 'same-origin' })\n          .then(function (res) { return res.ok ? res.text() : null; })\n          .then(function (text) {\n            done();\n            if (text === null) return { fetched: false };\n            var m = /\\/\\/[#@] sourceMappingURL=data:application\\/json[^,]*;base64,([A-Za-z0-9+\\/=]+)\\s*$/.exec(text);\n            var map = null;\n            // The map is UTF-8 JSON; atob yields one char per byte, so the\n            // bytes are decoded as UTF-8 (a non-ASCII source path would\n            // otherwise come out garbled). A map that fails to decode or\n            // parse counts as no map.\n            try {\n              if (m) {\n                var bytes = atob(m[1]);\n                map = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes, function (c) { return c.charCodeAt(0); })));\n              }\n            } catch (e) {}\n            return { fetched: true, map: map };\n          }, function () { done(); return { fetched: false }; });\n      }).catch(function () { return { fetched: false }; });\n    }\n    return moduleMaps[url];\n  }\n  function isPosition(n) {\n    return typeof n === 'number' && n % 1 === 0 && n >= 1 && n <= MAX_POSITION;\n  }\n  function formatLocation(file, line, column) {\n    if (!isPosition(line)) return file;\n    return isPosition(column) ? file + ':' + line + ':' + column : file + ':' + line;\n  }\n  // A transpiled position would point at the wrong code, so it is never\n  // reported. A module the page could not request (another origin,\n  // webpack-internal://, a failed or timed-out fetch) keeps the file alone,\n  // since a dev server's module URL is the source path; one that was fetched\n  // but carries no usable inline map (a bundled chunk) yields no location.\n  function resolveSource(raw) {\n    if (!raw) return Promise.resolve(null);\n    if (raw.mapped) return Promise.resolve(formatLocation(raw.file, raw.line, raw.column));\n    var file = pathOf(raw.url);\n    return fetchMap(raw.url).then(function (result) {\n      if (!result.fetched) return file;\n      var pos = result.map && isPosition(raw.line) && isPosition(raw.column) && originalPosition(result.map, raw.line, raw.column);\n      if (!pos || !isPosition(pos.line) || !isPosition(pos.column)) return null;\n      // An absolute filesystem path (Vite emits them) is not a URL: kept whole.\n      if (isDrivePath(pos.source) || pos.source.charAt(0) === '/') return formatLocation(fsPath(pos.source), pos.line, pos.column);\n      var dir = file.slice(0, file.lastIndexOf('/') + 1);\n      var mapped = new URL(pos.source, 'file://' + dir).pathname;\n      // URL percent-encodes a space in a directory name; the path on disk has the space.\n      return formatLocation(fsPath(safely(function () { return decodeURIComponent(mapped); }, mapped)), pos.line, pos.column);\n    });\n  }\n\n  var node = this;\n  var key = safely(function () {\n    return Object.keys(node).find(function (k) {\n      return k.indexOf('__reactFiber$') === 0 || k.indexOf('__reactInternalInstance$') === 0;\n    });\n  }, null);\n  if (!key) return null;\n  var fiber = field(node, key);\n  var name = componentName(fiber);\n  for (var depth = 0; fiber && !name && depth < MAX_FIBERS; depth++) {\n    fiber = field(fiber, 'return');\n    name = componentName(fiber);\n  }\n  if (!name) return null;\n  var hostFiber = field(node, key);\n  // Both fibers of a memo() pair count as the component's own when looking\n  // for the JSX it wrote, as does each one's alternate: React keeps two\n  // fibers per component and a child's _debugOwner may point at either.\n  var selfFibers = [fiber];\n  var wrapper = memoWrapperOf(fiber);\n  if (wrapper) {\n    fiber = wrapper;\n    name = componentName(wrapper) || name;\n    selfFibers.push(wrapper);\n  } else if (field(fiber, 'tag') === MEMO && field(field(fiber, 'child'), 'type') === field(field(fiber, 'type'), 'type')) {\n    selfFibers.push(field(fiber, 'child'));\n  }\n  for (var s = selfFibers.length - 1; s >= 0; s--) {\n    var alternate = field(selfFibers[s], 'alternate');\n    if (alternate) selfFibers.push(alternate);\n  }\n  var result = {\n    name: name,\n    owners: safely(function () { return ownerNames(fiber); }, []),\n    props: safely(function () { return summarizeProps(field(fiber, 'memoizedProps')); }, {}),\n    boundingBox: request && request.extent ? safely(function () { return extentOf(fiber, node); }, null) : null,\n  };\n  if (!request || !request.source) return result;\n  // The first JSX the component itself created sits inside its body, so its\n  // file is the component's file.\n  var definedIn = safely(function () {\n    var first = field(fiber, 'child');\n    var stack = first ? [first] : [];\n    for (var visited = 0; stack.length && visited < MAX_FIBERS; visited++) {\n      var f = stack.pop();\n      if (selfFibers.indexOf(f) < 0 && selfFibers.indexOf(field(f, '_debugOwner')) >= 0) return f;\n      var sibling = field(f, 'sibling');\n      if (sibling) stack.push(sibling);\n      var child = field(f, 'child');\n      if (child) stack.push(child);\n    }\n    return null;\n  }, null);\n  // Each location on its own: one that fails to resolve costs only itself.\n  var locate = function (f) {\n    return resolveSource(safely(function () { return rawSourceOf(f); }, null)).then(null, function () { return null; });\n  };\n  return Promise.all([locate(definedIn), locate(fiber), locate(hostFiber)]).then(function (sources) {\n    if (sources[0]) result.definedIn = sources[0].replace(/:\\d+:\\d+$/, '').replace(/:\\d+$/, '');\n    if (sources[1]) result.renderedAt = sources[1];\n    if (sources[2]) result.elementSource = sources[2];\n    return result;\n  }, function () { return result; });\n}`;
function Pai(e) {
  let t = e;
  if (
    !(
      !t ||
      ![t.x, t.y, t.width, t.height].every(
        (e) => typeof e == "number" && Number.isFinite(e),
      )
    )
  )
    return { x: t.x, y: t.y, width: t.width, height: t.height };
}
function wZ(e, t) {
  return typeof e == "string" && e.length > 0 ? e.slice(0, t) : void 0;
}
function Fai(e) {
  let t = e,
    n = t ? wZ(t.name, CZ) : void 0;
  if (!t || !n) return null;
  let r = {};
  if (t.props && typeof t.props == "object")
    for (let [e, n] of Object.entries(t.props).slice(0, 51))
      e !== "__proto__" &&
        (n === null ||
          typeof n == "number" ||
          typeof n == "boolean" ||
          typeof n == "string") &&
        (r[e.slice(0, CZ)] = typeof n == "string" ? n.slice(0, 201) : n);
  return {
    name: n,
    definedIn: wZ(t.definedIn, Dai),
    renderedAt: wZ(t.renderedAt, Mai),
    owners: Array.isArray(t.owners)
      ? t.owners
          .slice(0, Tai)
          .map((e) => wZ(e, CZ))
          .filter((e) => e !== void 0)
      : [],
    props: Object.keys(r).length > 0 ? r : void 0,
    boundingBox: Pai(t.boundingBox),
    elementSource: wZ(t.elementSource, Mai),
  };
}
function voi(e, t) {
  let n = Math.max(0, e.x - t.x),
    r = Math.max(0, e.y - t.y),
    i = Math.min(t.width, e.x + e.width - t.x),
    a = Math.min(t.height, e.y + e.height - t.y);
  return i > n && a > r ? { x: n, y: r, width: i - n, height: a - r } : null;
}
function PZ(e, t = "") {
  return ["top", "right", "bottom", "left"].map((n) => `${e}-${n}${t}`);
}
var woi = new Map([
  ["padding", PZ("padding")],
  ["margin", PZ("margin")],
  [
    "border-radius",
    [
      "border-top-left-radius",
      "border-top-right-radius",
      "border-bottom-right-radius",
      "border-bottom-left-radius",
    ],
  ],
  ["border-width", PZ("border", "-width")],
  ["border-style", PZ("border", "-style")],
  ["border-color", PZ("border", "-color")],
]);
var Toi = [
  "display",
  "position",
  "flex-direction",
  "justify-content",
  "align-items",
  "width",
  "height",
  "padding",
  "margin",
  "background-color",
  "color",
  "font-size",
  "font-weight",
  "border-radius",
  "border-width",
  "border-style",
  "border-color",
];
function Eoi(e) {
  let [t, n, r, i] = e;
  if (
    !(
      t === void 0 ||
      n === void 0 ||
      r === void 0 ||
      i === void 0 ||
      [t, n, r, i].some((e) => /\s/.test(e.replace(/\([^)]*\)/g, "")))
    )
  )
    return i === n
      ? r === t
        ? n === t
          ? t
          : `${t} ${n}`
        : `${t} ${n} ${r}`
      : `${t} ${n} ${r} ${i}`;
}
function Doi(e, t) {
  let n = (t) => e.find((e) => e.name === t)?.value,
    r = woi.get(t);
  return r ? Eoi(r.map(n)) : n(t);
}
var dsi = 0;
export function createPreviewElementInspector({
  webContents,
  sendCommand,
  ensureAttached,
  emulationScale = () => 1,
  logger = { debug() {}, error() {} },
}) {
  const N = logger;
  return new (class {
    get webContents() {
      return webContents;
    }
    get attached() {
      return !webContents.isDestroyed() && webContents.debugger.isAttached();
    }
    get emulationScale() {
      return emulationScale();
    }
    SCREENSHOT_PADDING = 80;
    REACT_COMPONENT_TIMEOUT_MS = 5000;
    sendCommand(method, params) {
      return sendCommand(method, params);
    }
    ensureAttached() {
      return ensureAttached();
    }
    async enableInspectMode(e) {
      (this.ensureAttached(),
        (this.inspectModeCallback = e),
        await this.sendCommand("DOM.enable"),
        await this.sendCommand("Overlay.enable"),
        await this.sendCommand("Overlay.setInspectMode", {
          mode: "searchForNode",
          highlightConfig: {
            showInfo: !0,
            contentColor: { r: 111, g: 168, b: 220, a: 0.66 },
            paddingColor: { r: 147, g: 196, b: 125, a: 0.55 },
            borderColor: { r: 255, g: 229, b: 153, a: 0.66 },
            marginColor: { r: 246, g: 178, b: 107, a: 0.66 },
          },
        }),
        N.debug("[CDPTools] Inspect mode enabled"));
    }
    async disableInspectMode() {
      (this.ensureAttached(), (this.inspectModeCallback = null));
      try {
        (await this.sendCommand("Overlay.hideHighlight"),
          await this.sendCommand("Overlay.setInspectMode", {
            mode: "none",
            highlightConfig: {},
          }),
          await this.sendCommand("Overlay.disable"),
          await this.sendCommand("DOM.disable"));
      } catch {}
      N.debug("[CDPTools] Inspect mode disabled");
    }
    releaseObjectGroup(e) {
      !this.webContents ||
        !this.attached ||
        this.sendCommand("Runtime.releaseObjectGroup", {
          objectGroup: e,
        }).catch(() => void 0);
    }
    async captureReactComponent(e, t) {
      let n = await Qh(
        this.sendCommand("Runtime.callFunctionOn", {
          objectId: e,
          functionDeclaration: Nai,
          arguments: [{ value: t }],
          returnByValue: !0,
          awaitPromise: !0,
        }),
        this.REACT_COMPONENT_TIMEOUT_MS,
        null,
      );
      return n ? Fai(n.result?.value) : null;
    }
    async captureElementContext(e) {
      this.ensureAttached();
      let t = `element-context:${++dsi}`;
      try {
        (await this.sendCommand("DOM.enable"),
          await this.sendCommand("CSS.enable"),
          await this.sendCommand("DOM.getDocument", { depth: 0 }));
        let n = (
            await this.sendCommand("DOM.describeNode", {
              backendNodeId: e,
              depth: 0,
            })
          ).node,
          r = n.attributes || [],
          i = {};
        for (let e = 0; e < r.length; e += 2) i[r[e]] = r[e + 1];
        let a = i.class || "",
          o = i.id || "",
          s = a ? a.split(/\s+/).filter(Boolean) : [],
          c = {};
        for (let e of [
          "data-testid",
          "data-test-id",
          "aria-label",
          "name",
          "type",
          "href",
          "role",
          "placeholder",
          "title",
          "alt",
          "onclick",
          "value",
          "src",
        ])
          i[e] && (c[e] = i[e]);
        let l;
        i.href
          ? (l = `navigates to: ${i.href}`)
          : i.onclick && (l = `onclick: ${i.onclick.slice(0, 100)}`);
        let u = {};
        try {
          let [t] = (
              await this.sendCommand("DOM.pushNodesByBackendIdsToFrontend", {
                backendNodeIds: [e],
              })
            ).nodeIds,
            n = (
              await this.sendCommand("CSS.getComputedStyleForNode", {
                nodeId: t,
              })
            ).computedStyle;
          for (let e of Toi) {
            let t = Doi(n, e);
            t !== void 0 && (u[e] = t);
          }
        } catch (e) {
          N.debug("[CDPTools] No computed styles for picked element %o", {
            error: e,
          });
        }
        let d = { x: 0, y: 0, width: 0, height: 0 };
        try {
          let t = (
            await this.sendCommand("DOM.getBoxModel", { backendNodeId: e })
          ).model.content;
          t &&
            t.length >= 6 &&
            (d = { x: t[0], y: t[1], width: t[2] - t[0], height: t[5] - t[1] });
        } catch {}
        let f;
        try {
          f = (
            await this.sendCommand("DOM.resolveNode", {
              backendNodeId: e,
              objectGroup: t,
            })
          ).object?.objectId;
        } catch {}
        let p,
          m,
          h,
          g,
          _ = Promise.resolve(null);
        if (f)
          try {
            let e = await this.captureReactComponent(f, {
              source: !1,
              extent: !0,
            });
            if (e) {
              let { name: t, owners: n, props: r, boundingBox: i } = e;
              ((p = { name: t, owners: n, props: r, boundingBox: i }),
                (h =
                  p.owners.length > 0
                    ? `${p.name} (in ${p.owners.join(" > ")})`
                    : p.name),
                (g = p.props),
                (_ = this.captureReactComponent(f, {
                  source: !0,
                  extent: !1,
                }).catch(() => null)));
            }
          } catch {}
        let v, y;
        if (f)
          try {
            ((v =
              (
                await this.sendCommand("Runtime.callFunctionOn", {
                  objectId: f,
                  functionDeclaration:
                    "function() { return this.innerText?.substring(0, 200) || ''; }",
                  returnByValue: !0,
                })
              ).result?.value || void 0),
              (y =
                (
                  await this.sendCommand("Runtime.callFunctionOn", {
                    objectId: f,
                    functionDeclaration: `function() {\n              const parts = [];\n              let el = this.parentElement;\n              for (let i = 0; i < 4 && el && el !== document.body; i++) {\n                let selector = el.tagName.toLowerCase();\n                if (el.id) selector += '#' + el.id;\n                else if (el.getAttribute('class')) selector += '.' + el.getAttribute('class').split(' ')[0];\n                parts.unshift(selector);\n                el = el.parentElement;\n              }\n              return parts.join(' > ');\n            }`,
                    returnByValue: !0,
                  })
                ).result?.value || void 0));
          } catch {}
        let b, x;
        if (f)
          try {
            let e = (
              await this.sendCommand("Runtime.callFunctionOn", {
                objectId: f,
                functionDeclaration: `function() {\n              var outer = this.outerHTML;\n              if (outer && outer.length > 2000) {\n                outer = outer.substring(0, 2000) + '...';\n              }\n              var sibling = null;\n              if (this.parentElement) {\n                var children = Array.from(this.parentElement.children);\n                var parts = children.map(function(child) {\n                  if (child === this) return '\x3c!-- SELECTED --\x3e' + child.outerHTML;\n                  var tag = child.tagName.toLowerCase();\n                  var rawCls = child.getAttribute('class') || '';\n                  var cls = rawCls ? ' class="' + rawCls.split(' ').slice(0, 3).join(' ') + '"' : '';\n                  var id = child.id ? ' id="' + child.id + '"' : '';\n                  return '<' + tag + id + cls + ' />';\n                }.bind(this));\n                sibling = parts.join('\\n');\n                if (sibling.length > 2000) sibling = sibling.substring(0, 2000) + '...';\n              }\n              return { outer: outer, sibling: sibling };\n            }`,
                returnByValue: !0,
              })
            ).result?.value;
            e && ((b = e.outer), (x = e.sibling ?? void 0));
          } catch {}
        let S = "";
        try {
          let e = await this.sendCommand("Runtime.evaluate", {
              expression:
                "JSON.stringify({ x: window.scrollX, y: window.scrollY, width: window.innerWidth, height: window.innerHeight })",
              returnByValue: !0,
            }),
            t = JSON.parse(e.result.value),
            n =
              (p?.boundingBox && voi(p.boundingBox, t)) ??
              voi(d, { ...t, x: 0, y: 0 });
          if (n) {
            let e = this.emulationScale,
              t = this.SCREENSHOT_PADDING,
              r = Math.max(0, n.x * e - t),
              i = Math.max(0, n.y * e - t),
              a = n.width * e + t * 2,
              o = n.height * e + t * 2,
              s = await this.webContents.capturePage({
                x: Math.round(r),
                y: Math.round(i),
                width: Math.round(a),
                height: Math.round(o),
              }),
              c = 1200,
              l = s.getSize();
            if (l.width > c || l.height > c) {
              let e = Math.min(c / l.width, c / l.height);
              s = s.resize({
                width: Math.round(l.width * e),
                height: Math.round(l.height * e),
              });
            }
            S = s.toPNG().toString("base64");
          } else
            S = (await this.webContents.capturePage())
              .toPNG()
              .toString("base64");
        } catch (e) {
          N.error("[CDPTools] Screenshot capture failed %o", { error: e });
        }
        let C = await _;
        return (
          p &&
            C &&
            C.name === p.name &&
            ((p.definedIn = C.definedIn),
            (p.renderedAt = C.renderedAt),
            (m = C.elementSource)),
          {
            tagName: n.nodeName.toLowerCase(),
            id: o || void 0,
            classes: s,
            attributes: c,
            computedStyles: u,
            boundingBox: d,
            screenshot: S,
            innerText: v,
            parentPath: y,
            action: l,
            component: p,
            sourceFile: m,
            reactComponent: h,
            reactProps: g,
            outerHTML: b,
            siblingHTML: x,
          }
        );
      } catch (e) {
        return (
          N.error("[CDPTools] captureElementContext failed %o", { error: e }),
          null
        );
      } finally {
        this.releaseObjectGroup(t);
        try {
          (await this.sendCommand("CSS.disable"),
            await this.sendCommand("DOM.disable"));
        } catch {}
      }
    }
  })();
}
