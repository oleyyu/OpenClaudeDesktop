// A small, honest CSS cascade resolver for SSR markup, used by the transcript tests to decide which declaration
// really wins on an element — cascade layers included — instead of only asserting that a class name is present.
//
// Scope (what it models, per CSS Cascade 5 / Selectors 4):
//   - origins: a tiny UA sheet below every author sheet; !important reverses origin and layer order;
//   - @layer: named / anonymous / nested layers, ordered by first appearance across all sheets in load order;
//     unlayered rules beat every layer for normal declarations; important declarations reverse the layer order;
//   - specificity (:is/:not/:has take their most specific argument, :where is zero, nesting takes its parent's);
//   - order of appearance (sheet index, then rule index);
//   - @media against a fixed desktop environment, @supports with a Chromium-ish evaluator, @scope roots/limits;
//     @starting-style and @container never apply to the steady state and are skipped (and reported);
//   - inheritance for inherited properties, and the CSS-wide keywords inherit / unset / initial / revert-layer;
//   - shorthands and the LTR / horizontal-tb logical aliases of every tracked longhand (padding-inline-start is
//     padding-left, border-block-end-width is border-bottom-width, …), one cascade per physical longhand, with the
//     later declaration of a rule winning a tie inside that rule.
// Selectors are parsed by lightningcss (the same parser Vite uses for this app's CSS), so escaped Tailwind class names
// such as `.group-aria-pressed\/btn\:bg-accent` are matched exactly. Element state (:hover, :focus-visible …) is set
// explicitly on the synthetic tree; unknown pseudo-classes never match and are reported in `unknown`.
import { transform } from 'lightningcss';
import { parseAst } from 'rolldown/parseAst';
import fs from 'node:fs';
import path from 'node:path';

// The renderer's stylesheets in load order: a small UA sheet for the form controls, then index.html's
// <link rel=stylesheet>s (the official c6a992d55 & co. and the generated compatibility layer), then the app's own
// sheets bundled from src/ in the order the bundle meets them (bundleOrder: main.jsx's static import graph, CSS
// @import included, so message-style.css precedes style.css and the sheets of modules main.jsx imports before
// style.css precede it; sheets only a lazy chunk imports follow; any sheet not reached comes last by name). Callers
// that depend on the order between two local sheets must say so, see orderOnly. `replace` maps a sheet name to
// substitute text; `{ order: 'name' }` restores the legacy order (style.css first, the rest by name).
export const UA_SHEET = 'button{color:buttontext;background-color:buttonface;padding:1px 6px;border:2px outset buttonborder;'
  + 'font:13.333px Arial;text-align:center;cursor:default}input,textarea,select{padding:1px 2px;border:2px inset;'
  + 'font:13.333px Arial}:focus-visible{outline:auto 1px -webkit-focus-ring-color}';
export function appSheets(appRoot, replace = {}, { order = 'bundle' } = {}) {
  const html = fs.readFileSync(path.join(appRoot, 'index.html'), 'utf8');
  const links = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="\/([^"]+)"/g)].map((m) => m[1]);
  const all = fs.readdirSync(path.join(appRoot, 'src')).filter((name) => name.endsWith('.css')).map((name) => `src/${name}`);
  const byName = all.toSorted((a, b) => (a === 'src/style.css' ? -1 : b === 'src/style.css' ? 1 : a.localeCompare(b)));
  const local = order === 'name' ? byName
    : [...new Set([...bundleOrder(appRoot).filter((name) => all.includes(name)), ...byName.filter((name) => name !== 'src/style.css').toSorted(), ...all])];
  const read = (name, file) => replace[name] ?? fs.readFileSync(file, 'utf8');
  return [{ name: 'ua', origin: 'ua', code: UA_SHEET },
    ...links.map((href) => ({ name: `public/${href}`, code: read(`public/${href}`, path.join(appRoot, 'public', href)) })),
    ...local.map((name) => ({ name, code: read(name, path.join(appRoot, name)) }))];
}

// Static CSS order of the renderer bundle: depth-first over main.jsx's import / export-from declarations in source
// order (ES module evaluation in dev, Rolldown's CSS order in build — dist/assets/index-*.css has the same sequence),
// a sheet's own @import first; then the modules reached only through a literal import() (lazy chunks, whose CSS loads
// with them), in discovery order. App-relative paths, src/ sheets and any other reached .css. A file that does not
// parse (another agent mid-edit) is skipped, so its sheets fall to the by-name tail of appSheets instead of breaking it.
const bundleOrders = new Map();
export function bundleOrder(appRoot) {
  if (bundleOrders.has(appRoot)) return bundleOrders.get(appRoot);
  const EXT = ['', '.jsx', '.js', '.mjs', '/index.jsx', '/index.js', '/index.mjs'];
  const resolveFrom = (from, spec) => {
    if (typeof spec !== 'string' || !(spec.startsWith('./') || spec.startsWith('../'))) return null;
    const base = path.resolve(path.dirname(from), spec);
    return EXT.map((ext) => base + ext).find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) ?? null;
  };
  const seen = new Set(), css = [], lazy = [];
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    if (file.endsWith('.css')) {
      for (const [, spec] of fs.readFileSync(file, 'utf8').matchAll(/@import\s+(?:url\()?["']([^"']+)["']/g)) {
        const target = resolveFrom(file, spec.startsWith('.') ? spec : `./${spec}`);
        if (target) visit(target);
      }
      css.push(path.relative(appRoot, file).split(path.sep).join('/'));
      return;
    }
    if (!/\.(jsx?|mjs)$/.test(file)) return;
    let program;
    try { program = parseAst(fs.readFileSync(file, 'utf8'), { lang: file.endsWith('.jsx') ? 'jsx' : 'js' }, file); } catch { return; }
    for (const node of program.body) {
      if (node.source && ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type)) {
        const target = resolveFrom(file, node.source.value);
        if (target) visit(target);
      }
    }
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'ImportExpression' && node.source?.type === 'Literal') { const target = resolveFrom(file, node.source.value); if (target) lazy.push(target); }
      for (const key of Object.keys(node)) {
        const value = node[key];
        if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object' && typeof value.type === 'string') walk(value);
      }
    };
    walk(program);
  };
  visit(path.join(appRoot, 'src/main.jsx'));
  for (let i = 0; i < lazy.length; i++) visit(lazy[i]);
  bundleOrders.set(appRoot, css);
  return css;
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (text) => text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, name) => name[0] === '#'
  ? String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10))
  : ENTITIES[name.toLowerCase()] ?? all);

export function element(tag, attrs = {}, children = []) {
  const node = { tag: tag.toLowerCase(), attrs: { ...attrs }, children: [], parent: null, text: '', state: new Set() };
  for (const child of children) append(node, child);
  return node;
}
export function append(parent, child) { child.parent = parent; parent.children.push(child); return child; }
export const classes = (node) => new Set(String(node.attrs.class ?? '').split(/\s+/).filter(Boolean));

// React's renderToStaticMarkup output: double-quoted attributes, escaped text, no implied end tags.
export function parseMarkup(html) {
  const root = element('#fragment');
  let current = root;
  const token = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/g;
  for (const match of html.matchAll(token)) {
    const [, close, open, attrText, selfClose, text] = match;
    if (text !== undefined) { current.text += decode(text); continue; }
    if (close) {
      if (current.tag !== close.toLowerCase()) throw new Error(`unbalanced </${close}> in <${current.tag}>`);
      current = current.parent; continue;
    }
    if (!open) continue;
    const attrs = {};
    for (const [, name, value] of (attrText ?? '').matchAll(/\s+([^\s"'>/=]+)(?:="([^"]*)")?/g)) attrs[name] = decode(value ?? '');
    const node = append(current, element(open, attrs));
    if (!selfClose && !VOID.has(node.tag)) current = node;
  }
  if (current !== root) throw new Error(`unclosed <${current.tag}>`);
  return root.children;
}

export function find(nodes, predicate) {
  for (const node of [].concat(nodes)) {
    if (predicate(node)) return node;
    const hit = find(node.children, predicate);
    if (hit) return hit;
  }
  return null;
}
// :hover / :active / :focus-within hold for the element and every ancestor; :focus / :focus-visible only on the element.
export function setState(node, states) {
  for (const state of states) {
    if (state === 'hover' || state === 'active' || state === 'focus-within') for (let n = node; n; n = n.parent) n.state.add(state);
    else node.state.add(state);
    if (state === 'focus' || state === 'focus-visible') for (let n = node; n; n = n.parent) n.state.add('focus-within');
  }
}

// ---- stylesheet loading -------------------------------------------------------------------------------------------

const ENV = {
  hover: 'hover', 'any-hover': 'hover', pointer: 'fine', 'any-pointer': 'fine', 'prefers-reduced-motion': 'no-preference',
  'prefers-color-scheme': 'light', 'prefers-contrast': 'no-preference', 'forced-colors': 'none', 'inverted-colors': 'none',
  'prefers-reduced-transparency': 'no-preference', 'display-mode': 'browser', orientation: 'landscape', scripting: 'enabled',
  'dynamic-range': 'standard', 'color-gamut': 'srgb', update: 'fast',
  width: 1280, height: 800, 'device-width': 1280, 'device-height': 800, resolution: 2,
};
const px = (value) => value?.type === 'length' ? lengthPx(value.value) : value?.type === 'number' ? value.value : NaN;
function lengthPx(length) {
  const v = length?.value ?? length;
  if (!v || typeof v.value !== 'number') return NaN;
  return { px: 1, rem: 16, em: 16 }[v.unit] !== undefined ? v.value * { px: 1, rem: 16, em: 16 }[v.unit] : NaN;
}
function mediaFeature(feature, unknown) {
  const name = feature.name;
  if (feature.type === 'boolean') return name in ENV ? !['none', 'no-preference', 0].includes(ENV[name]) : (unknown.add(`@media (${name})`), false);
  if (!(name in ENV)) { unknown.add(`@media (${name})`); return false; }
  const env = ENV[name];
  if (feature.type === 'plain') {
    if (typeof env === 'number') {
      const want = name === 'resolution' ? feature.value?.value?.value ?? NaN : px(feature.value);
      return want === env;
    }
    return feature.value?.value === env;
  }
  if (feature.type === 'range') {
    const want = name === 'resolution' ? feature.value?.value?.value ?? NaN : px(feature.value);
    if (Number.isNaN(want)) { unknown.add(`@media range ${name}`); return false; }
    return { 'greater-than-equal': env >= want, 'greater-than': env > want, 'less-than-equal': env <= want, 'less-than': env < want, equal: env === want }[feature.operator] ?? false;
  }
  if (feature.type === 'interval') { unknown.add(`@media interval ${name}`); return false; }
  return false;
}
function mediaCondition(condition, unknown) {
  if (!condition) return true;
  if (condition.type === 'feature') return mediaFeature(condition.value, unknown);
  if (condition.type === 'not') return !mediaCondition(condition.value, unknown);
  if (condition.type === 'operation') {
    const results = condition.conditions.map((c) => mediaCondition(c, unknown));
    return condition.operator === 'and' ? results.every(Boolean) : results.some(Boolean);
  }
  unknown.add(`@media ${condition.type}`); return false;
}
function mediaMatches(query, unknown) {
  return query.mediaQueries.some((q) => {
    const typeOk = q.mediaType === 'all' || q.mediaType === 'screen';
    const result = typeOk && mediaCondition(q.condition, unknown);
    return q.qualifier === 'not' ? !result : result;
  });
}
// Chromium supports every standard declaration/selector the design system tests, but not the Firefox/WebKit-only ones.
const NOT_IN_CHROMIUM = /^-moz-|^-webkit-touch-callout$|^margin-trim$/;
function supportsMatches(condition, unknown) {
  switch (condition.type) {
    case 'not': return !supportsMatches(condition.value, unknown);
    case 'and': return condition.value.every((c) => supportsMatches(c, unknown));
    case 'or': return condition.value.some((c) => supportsMatches(c, unknown));
    case 'declaration': return !NOT_IN_CHROMIUM.test(condition.propertyId?.property ?? '');
    case 'selector': return true;
    default: unknown.add(`@supports ${condition.type}`); return true;
  }
}

class Layers {
  constructor() { this.root = { children: new Map() }; this.anonymous = 0; }
  // Registers the path (an array of names, each prefix in order of first appearance) and returns it.
  register(path) {
    let node = this.root;
    for (const name of path) {
      if (!node.children.has(name)) node.children.set(name, { index: node.children.size, children: new Map() });
      node = node.children.get(name);
    }
    return path;
  }
  // Sort key: at each depth the sublayer's index; rules directly in a layer (or unlayered) come after its sublayers.
  key(path) {
    const key = []; let node = this.root;
    for (const name of path) { node = node.children.get(name); key.push(node.index); }
    key.push(Infinity);
    return key;
  }
}
const compareKeys = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? Infinity, y = b[i] ?? Infinity;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
};

const INHERITED = new Set(['color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
  'cursor', 'text-align', 'pointer-events']);
// The longhands a test can ask about, with the shorthands and (LTR, horizontal-tb) logical properties that also set
// them (`all` sets every one but the custom -webkit-app-region).
const SIDES = { top: ['block', 'block-start'], right: ['inline', 'inline-end'], bottom: ['block', 'block-end'], left: ['inline', 'inline-start'] };
const CORNERS = { 'top-left': 'start-start', 'top-right': 'start-end', 'bottom-right': 'end-end', 'bottom-left': 'end-start' };
const SHORTHANDS = {
  color: [], 'background-color': ['background'], 'overflow-x': ['overflow'], 'overflow-y': ['overflow'],
  height: [], 'max-height': [], 'min-height': [], 'flex-grow': ['flex'], 'flex-basis': ['flex'],
  'background-image': ['background'], 'max-width': [], 'min-width': [], width: [], opacity: [], cursor: [], 'text-align': [], 'pointer-events': [],
  'font-family': ['font'], 'font-size': ['font'], 'font-weight': ['font'], 'font-style': ['font'], 'line-height': ['font'],
  'letter-spacing': [], 'outline-style': ['outline'], 'outline-width': ['outline'], 'outline-color': ['outline'],
  '-webkit-app-region': ['app-region'],
  ...Object.fromEntries(Object.entries(SIDES).flatMap(([side, [axis, edge]]) => [
    [`padding-${side}`, ['padding', `padding-${axis}`, `padding-${edge}`]],
    ...['width', 'style', 'color'].map((part) => [`border-${side}-${part}`, ['border', `border-${side}`, `border-${part}`,
      `border-${axis}`, `border-${edge}`, `border-${axis}-${part}`, `border-${edge}-${part}`]]),
  ])),
  ...Object.fromEntries(Object.entries(CORNERS).map(([corner, logical]) => [`border-${corner}-radius`, ['border-radius', `border-${logical}-radius`]])),
};
const NOT_IN_ALL = new Set(['-webkit-app-region', 'app-region']);
const TRACKED = new Set(['all', ...Object.keys(SHORTHANDS), ...Object.values(SHORTHANDS).flat()]);
// The properties the resolver tracked before the shorthand extraction existed keep their value text (a shorthand's
// whole value) so the transcript tests that assert on it keep passing; every other longhand gets its own component.
const LEGACY_VALUES = new Set(['color', 'background-color', 'overflow-x', 'overflow-y', 'height', 'max-height', 'min-height', 'flex-grow', 'flex-basis']);
export const TRACKED_PROPERTIES = Object.keys(SHORTHANDS);

// lightningcss ASTs by sheet text, so a test can load several cascades over the same 1.8 MB official sheet cheaply.
const parsedSheets = new Map();
function parseSheet(name, code) {
  const key = `${name}\n${code}`;
  if (!parsedSheets.has(key)) {
    let parsed;
    transform({
      filename: name, code: Buffer.from(code), errorRecovery: true,
      visitor: { StyleSheet(stylesheet) { parsed = stylesheet.rules; } },
    });
    parsedSheets.set(key, parsed ?? []);
  }
  return parsedSheets.get(key);
}

// sheets: [{ name, code, origin? = 'author' | 'ua' }] in load order.
export function loadCascade(sheets) {
  const layers = new Layers();
  const rules = [], skipped = [], unknown = new Set();
  let order = 0;
  sheets.forEach((sheet, sheetIndex) => {
    const parsed = parseSheet(sheet.name, sheet.code);
    const walk = (list, ctx) => {
      for (const rule of list) {
        const v = rule.value;
        switch (rule.type) {
          case 'layer-statement': for (const name of v.names) layers.register([...ctx.layer, ...name]); break;
          case 'layer-block': {
            const name = v.name ?? [`<anonymous ${layers.anonymous++}>`];
            walk(v.rules, { ...ctx, layer: layers.register([...ctx.layer, ...name]) }); break;
          }
          case 'media': if (mediaMatches(v.query, unknown)) walk(v.rules, ctx); break;
          case 'supports': if (supportsMatches(v.condition, unknown)) walk(v.rules, ctx); break;
          case 'scope': walk(v.rules, { ...ctx, scopes: [...ctx.scopes, { start: v.scopeStart, end: v.scopeEnd, parent: ctx.parent }] }); break;
          case 'style': {
            const decls = [];
            const collect = (items, important) => {
              for (const decl of items ?? []) {
                const property = decl.property === 'unparsed' ? decl.value.propertyId.property
                  : decl.property === 'custom' ? decl.value.name : decl.property;
                // `index`: a later declaration of the same rule wins a tie (padding: 0; padding-left: 4px).
                if (TRACKED.has(property)) decls.push({ property, raw: decl, important, index: decls.length });
              }
            };
            collect(v.declarations?.declarations, false);
            collect(v.declarations?.importantDeclarations, true);
            const entry = { sheet: sheet.name, sheetIndex, origin: sheet.origin ?? 'author', order: order++, selectors: v.selectors,
              layer: ctx.layer, scopes: ctx.scopes, parent: ctx.parent, decls, line: (v.loc?.line ?? 0) + 1,
              properties: new Set(decls.map((d) => d.property)) };
            if (decls.length) rules.push(entry);
            if (v.rules?.length) walk(v.rules, { ...ctx, parent: entry });
            break;
          }
          case 'starting-style': case 'container': skipped.push({ sheet: sheet.name, type: rule.type }); break;
          default: break;
        }
      }
    };
    walk(parsed ?? [], { layer: [], scopes: [], parent: null });
  });
  // Bucket each rule by what its selectors' subject compounds require (one class, an id, a tag or an attribute name;
  // '*' when nothing simple is required), so a query only matches the rules that can possibly apply.
  const index = new Map();
  for (const rule of rules) {
    for (const key of new Set(rule.selectors.map(subjectKey))) {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(rule);
    }
  }
  return { layers, rules, skipped, unknown, index };
}
function subjectKey(components) {
  let start = components.length;
  while (start > 0 && components[start - 1].type !== 'combinator') start--;
  const subject = components.slice(start);
  const of = (type) => subject.find((c) => c.type === type);
  if (of('class')) return `.${of('class').name}`;
  if (of('id')) return `#${of('id').name}`;
  if (of('type')) return of('type').name.toLowerCase();
  if (of('attribute')) return `[${of('attribute').name}`;
  return '*';
}
function nodeKeys(node) {
  return ['*', node.tag, ...[...classes(node)].map((name) => `.${name}`), ...(node.attrs.id ? [`#${node.attrs.id}`] : []),
    ...Object.keys(node.attrs).map((name) => `[${name}`)];
}

// ---- declaration values -------------------------------------------------------------------------------------------

function tokenText(token) {
  const v = token.value;
  switch (token.type) {
    case 'var': return `var(${v.name.ident}${v.fallback ? `, ${tokensText(v.fallback)}` : ''})`;
    case 'function': return `${v.name}(${tokensText(v.arguments)})`;
    case 'color': return colorText(v);
    case 'token':
      switch (v.type) {
        case 'ident': case 'delim': return String(v.value);
        case 'number': return String(v.value);
        case 'percentage': return `${v.value * 100}%`;
        case 'dimension': return `${v.value}${v.unit}`;
        case 'whitespace': case 'white-space': return ' ';
        case 'comma': return ',';
        case 'string': return JSON.stringify(v.value);
        case 'hash': case 'id-hash': return `#${v.value}`;
        default: return JSON.stringify(v);
      }
    case 'length': case 'angle': case 'time': case 'resolution': return `${v.value}${v.unit}`;
    case 'dashed-ident': return String(v);
    default: return JSON.stringify(token);
  }
}
const tokensText = (list) => (list ?? []).map(tokenText).join('').trim();
function colorText(color) {
  if (!color) return '';
  if (typeof color === 'string') return color;
  if (color.type === 'currentcolor') return 'currentcolor';
  if (color.type === 'rgb') return color.alpha === 0 && !color.r && !color.g && !color.b ? 'transparent' : `rgb(${color.r} ${color.g} ${color.b} / ${color.alpha})`;
  return JSON.stringify(color);
}
function valueText(decl) {
  if (decl.property === 'unparsed') return tokensText(decl.value.value);
  if (decl.property === 'overflow') return `${decl.value.x} ${decl.value.y}`;
  if (decl.property === 'overflow-x' || decl.property === 'overflow-y') return String(decl.value);
  if (decl.property === 'color') return colorText(decl.value);
  if (decl.property === 'background-color') return colorText(decl.value);
  if (decl.property === 'background') return colorText(decl.value.at(-1)?.color);
  if (decl.property === 'all') return String(decl.value);
  return JSON.stringify(decl.value);
}

// The value a declaration gives `longhand`: a CSS-wide keyword as itself, a var()-bearing shorthand as
// `shorthand(tokens)` (its split is only known after substitution), a parsed shorthand's component for that longhand.
const KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);
function valueOf(decl, longhand) {
  if (LEGACY_VALUES.has(longhand)) return valueText(decl);
  if (decl.property === 'all') return String(decl.value);
  if (decl.property === 'unparsed' || decl.property === 'custom') {
    const text = tokensText(decl.value.value);
    const name = decl.property === 'custom' ? decl.value.name : decl.value.propertyId.property;
    return KEYWORDS.has(text) || name === longhand || SINGLE_ALIAS.test(name) ? text : `${name}(${text})`;
  }
  const { property, value: v } = decl;
  if (property === longhand || SINGLE_ALIAS.test(property)) return cssValue(v);
  const side = longhand.match(/^(padding|border)-(top|right|bottom|left)(?:-(width|style|color))?$/);
  if (side) {
    const [, box, edge, part] = side;
    const start = edge === 'top' || edge === 'left';
    if (box === 'padding') {
      if (property === 'padding') return cssValue(v[edge]);
      return cssValue(property === 'padding-inline' ? v[start ? 'inlineStart' : 'inlineEnd'] : v[start ? 'blockStart' : 'blockEnd']);
    }
    if (property === `border-${part}`) return cssValue(v[edge]);
    if (/^border-(inline|block)-(width|style|color)$/.test(property)) return cssValue(v[start ? 'start' : 'end']);
    return cssValue(v[part]); // border, border-<side>, border-inline, border-block, border-inline-start …: {width, style, color}
  }
  const corner = longhand.match(/^border-(top|bottom)-(left|right)-radius$/);
  if (corner) return cssValue(v[`${corner[1]}${corner[2][0].toUpperCase()}${corner[2].slice(1)}`]);
  if (property === 'font') return cssValue(v[{ 'font-family': 'family', 'font-size': 'size', 'font-weight': 'weight', 'font-style': 'style', 'line-height': 'lineHeight' }[longhand]]);
  if (property === 'outline') return cssValue(v[longhand.slice('outline-'.length)]);
  if (property === 'background') return longhand === 'background-image' ? v.map((layer) => cssValue(layer.image)).join(', ') : cssValue(v.at(-1)?.color);
  return cssValue(v);
}
// Logical / alias properties that set exactly one tracked longhand (in LTR, horizontal-tb).
const SINGLE_ALIAS = /^(padding-(inline|block)-(start|end)|border-(inline|block)-(start|end)-(width|style|color)|border-(start|end)-(start|end)-radius|app-region)$/;
// Readable text for the lightningcss value shapes the tracked longhands use (lengths, keywords, colours, weights …);
// anything else stays JSON, which still compares equal for equal values.
function cssValue(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 2 && v.every((part) => part && typeof part === 'object' && 'type' in part)) {
      const [x, y] = v.map(cssValue);
      return x === y ? x : `${x} ${y}`;
    }
    return v.map((part) => (typeof part === 'string' ? part : cssValue(part))).join(', ');
  }
  if (v.unit !== undefined && typeof v.value === 'number') return `${v.value}${v.unit}`;
  switch (v.type) {
    case 'dimension': case 'value': case 'length-percentage': case 'length': return cssValue(v.value);
    case 'percentage': return `${v.value * 100}%`;
    case 'number': return String(v.value);
    case 'line-style': case 'keyword': return String(v.value);
    case 'absolute': return v.value?.type === 'weight' ? String(v.value.value) : String(v.value?.type ?? '');
    case 'normal': case 'medium': case 'thin': case 'thick': case 'auto': case 'none': case 'currentcolor':
    case 'bolder': case 'lighter': case 'italic': return v.type;
    case 'rgb': return colorText(v);
    default: break;
  }
  if (Array.isArray(v.images) && 'keyword' in v) return v.images.length ? JSON.stringify(v) : String(v.keyword);
  return JSON.stringify(v);
}

// ---- selector matching --------------------------------------------------------------------------------------------

const siblings = (node) => (node.parent ? node.parent.children : [node]);
const isFormControl = (node) => ['button', 'input', 'select', 'textarea', 'fieldset', 'optgroup', 'option'].includes(node.tag);
function nth(node, a, b, list) {
  const index = list.indexOf(node) + 1;
  if (index <= 0) return false;
  if (a === 0) return index === b;
  const n = (index - b) / a;
  return Number.isInteger(n) && n >= 0;
}

function split(components) {
  const compounds = [[]], combinators = [];
  for (const c of components) {
    if (c.type === 'combinator') { combinators.push(c.value); compounds.push([]); } else compounds.at(-1).push(c);
  }
  return { compounds, combinators };
}

function descendants(node, out = []) { for (const c of node.children) { out.push(c); descendants(c, out); } return out; }
const top = (node) => { while (node.parent) node = node.parent; return node; };

export function matchSelector(components, node, ctx, unknown) {
  const { compounds, combinators } = split(components);
  const at = (i, el) => {
    if (!el || !compound(compounds[i], el, ctx, unknown)) return false;
    if (i === 0) return true;
    switch (combinators[i - 1]) {
      case 'descendant': for (let p = el.parent; p; p = p.parent) if (at(i - 1, p)) return true; return false;
      case 'child': return at(i - 1, el.parent);
      case 'next-sibling': { const list = siblings(el); return at(i - 1, list[list.indexOf(el) - 1]); }
      case 'later-sibling': { const list = siblings(el); return list.slice(0, list.indexOf(el)).some((p) => at(i - 1, p)); }
      default: unknown.add(`combinator ${combinators[i - 1]}`); return false;
    }
  };
  return at(compounds.length - 1, node);
}
const anyMatch = (list, node, ctx, unknown) => (list ?? []).some((s) => matchSelector(s, node, ctx, unknown));

function attribute(c, node) {
  const value = node.attrs[c.name];
  if (value === undefined) return false;
  if (!c.operation) return true;
  const insensitive = /insensitive/.test(c.operation.caseSensitivity);
  const have = insensitive ? value.toLowerCase() : value, want = insensitive ? c.operation.value.toLowerCase() : c.operation.value;
  switch (c.operation.operator) {
    case 'equal': return have === want;
    case 'includes': return have.split(/\s+/).includes(want);
    case 'dash-match': return have === want || have.startsWith(`${want}-`);
    case 'prefix': return want !== '' && have.startsWith(want);
    case 'suffix': return want !== '' && have.endsWith(want);
    case 'substring': return want !== '' && have.includes(want);
    default: return false;
  }
}

function compound(list, node, ctx, unknown) {
  for (const c of list) {
    switch (c.type) {
      case 'universal': case 'namespace': break;
      case 'type': if (node.tag !== c.name.toLowerCase()) return false; break;
      case 'class': if (!classes(node).has(c.name)) return false; break;
      case 'id': if (node.attrs.id !== c.name) return false; break;
      case 'attribute': if (!attribute(c, node)) return false; break;
      case 'nesting':
        if (ctx.parent) { if (!anyMatch(ctx.parent.selectors, node, ctxOf(ctx.parent, ctx), unknown)) return false; }
        else if (node !== (ctx.scopeRoot ?? top(node))) return false;
        break;
      case 'pseudo-element': return false;
      case 'pseudo-class': if (!pseudoClass(c, node, ctx, unknown)) return false; break;
      case '__anchor': if (node !== ctx.anchor) return false; break;
      default: unknown.add(`component ${c.type}`); return false;
    }
  }
  return true;
}
const ctxOf = (rule, ctx) => ({ ...ctx, parent: rule.parent });

function pseudoClass(c, node, ctx, unknown) {
  switch (c.kind) {
    case 'hover': case 'active': case 'focus': case 'focus-visible': case 'focus-within': return node.state.has(c.kind);
    case 'is': case 'where': case 'any': case 'matches': return anyMatch(c.selectors, node, ctx, unknown);
    case 'not': return !anyMatch(c.selectors, node, ctx, unknown);
    case 'has': return (c.selectors ?? []).some((s) => {
      const relative = s[0]?.type === 'pseudo-class' && s[0].kind === 'scope'
        ? [{ type: '__anchor' }, ...s.slice(1)] : [{ type: '__anchor' }, { type: 'combinator', value: 'descendant' }, ...s];
      return descendants(top(node)).some((candidate) => matchSelector(relative, candidate, { ...ctx, anchor: node }, unknown));
    });
    case 'scope': return node === (ctx.anchor ?? ctx.scopeRoot ?? top(node));
    case 'root': return !node.parent;
    case 'disabled': return isFormControl(node) && node.attrs.disabled !== undefined;
    case 'enabled': return isFormControl(node) && node.attrs.disabled === undefined;
    case 'read-only': return !(['input', 'textarea'].includes(node.tag) || node.attrs.contenteditable === 'true' || node.attrs.contenteditable === '');
    case 'read-write': return ['input', 'textarea'].includes(node.tag) || node.attrs.contenteditable === 'true' || node.attrs.contenteditable === '';
    case 'defined': return true;
    case 'link': case 'any-link': return (node.tag === 'a' || node.tag === 'area') && node.attrs.href !== undefined;
    case 'empty': return node.children.length === 0 && node.text === '';
    case 'first-child': return siblings(node)[0] === node;
    case 'last-child': return siblings(node).at(-1) === node;
    case 'only-child': return siblings(node).length === 1;
    case 'first-of-type': return siblings(node).find((s) => s.tag === node.tag) === node;
    case 'last-of-type': return siblings(node).findLast((s) => s.tag === node.tag) === node;
    case 'only-of-type': return siblings(node).filter((s) => s.tag === node.tag).length === 1;
    case 'nth-child': return nth(node, c.a, c.b, c.of ? siblings(node).filter((s) => anyMatch(c.of, s, ctx, unknown)) : siblings(node));
    case 'nth-last-child': return nth(node, c.a, c.b, (c.of ? siblings(node).filter((s) => anyMatch(c.of, s, ctx, unknown)) : siblings(node)).toReversed());
    case 'nth-of-type': return nth(node, c.a, c.b, siblings(node).filter((s) => s.tag === node.tag));
    case 'nth-last-of-type': return nth(node, c.a, c.b, siblings(node).filter((s) => s.tag === node.tag).toReversed());
    case 'dir': return c.direction === 'ltr';
    case 'lang': {
      let lang; for (let n = node; n && lang === undefined; n = n.parent) lang = n.attrs.lang;
      return (c.languages ?? []).some((l) => lang === l || lang?.startsWith(`${l}-`));
    }
    // States the synthetic steady-state tree never has.
    case 'visited': case 'target': case 'checked': case 'indeterminate': case 'open': case 'popover-open': case 'modal':
    case 'fullscreen': case 'placeholder-shown': case 'autofill': case 'user-invalid': case 'invalid': case 'user-valid':
    case 'focus-ring': case 'state': case 'host': case 'playing': case 'paused': case 'default': case 'required': case 'optional':
      return false;
    // Firefox-only pseudo-classes (the official preflight's :-moz-focusring / :-moz-ui-invalid) never match Chromium.
    case 'custom': if (/^-moz-/.test(c.name ?? '')) return false; unknown.add(`:${c.name}`); return false;
    default: unknown.add(`:${c.kind}${c.name ? `(${c.name})` : ''}`); return false;
  }
}

// ---- specificity --------------------------------------------------------------------------------------------------

const add = (x, y) => [x[0] + y[0], x[1] + y[1], x[2] + y[2]];
const cmpSpec = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
const maxSpec = (list, parent) => (list ?? []).map((s) => specificity(s, parent)).reduce((m, s) => (cmpSpec(s, m) > 0 ? s : m), [0, 0, 0]);
export function specificity(components, parent = null) {
  let total = [0, 0, 0];
  for (const c of components) {
    switch (c.type) {
      case 'id': total = add(total, [1, 0, 0]); break;
      case 'class': case 'attribute': total = add(total, [0, 1, 0]); break;
      case 'type': case 'pseudo-element': total = add(total, [0, 0, 1]); break;
      case 'nesting': if (parent) total = add(total, maxSpec(parent.selectors, parent.parent)); break;
      case 'pseudo-class':
        if (c.kind === 'where') break;
        if (['is', 'not', 'has', 'any', 'matches'].includes(c.kind)) { total = add(total, maxSpec(c.selectors, parent)); break; }
        if ((c.kind === 'nth-child' || c.kind === 'nth-last-child') && c.of) total = add(total, maxSpec(c.of, parent));
        total = add(total, [0, 1, 0]); break;
      default: break;
    }
  }
  return total;
}

// ---- the cascade --------------------------------------------------------------------------------------------------

function inScope(rule, node, unknown) {
  // Every enclosing @scope needs a root among node's inclusive ancestors with no scope limit between them.
  let roots = [null];
  for (const scope of rule.scopes) {
    const next = [];
    for (let candidate = node; candidate; candidate = candidate.parent) {
      if (!scope.start || anyMatch(scope.start, candidate, { scopeRoot: null, parent: scope.parent }, unknown)) next.push(candidate);
    }
    roots = next.filter((root) => {
      if (!scope.end) return true;
      for (let n = node; n && n !== root; n = n.parent) if (anyMatch(scope.end, n, { scopeRoot: root, parent: null }, unknown)) return false;
      return true;
    });
    if (!roots.length) return null;
  }
  return roots;
}

// Every declaration of `property` that applies to `node`, most important first (the cascade's winner is [0]).
export function declarations(cascade, node, property) {
  const unknown = cascade.unknown;
  const found = [];
  if (!(property in SHORTHANDS)) throw new Error(`untracked property ${property}`);
  const names = [property, ...SHORTHANDS[property], ...(NOT_IN_ALL.has(property) ? [] : ['all'])];
  // Candidate rules: the index buckets this element's tag, classes, id and attribute names open, in sheet order.
  const candidates = cascade.index ? [...new Set(nodeKeys(node).flatMap((key) => cascade.index.get(key) ?? []))] : cascade.rules;
  for (const rule of candidates) {
    if (rule.properties && !names.some((name) => rule.properties.has(name))) continue;
    const decls = rule.decls.filter((d) => names.includes(d.property));
    if (!decls.length) continue;
    const roots = inScope(rule, node, unknown);
    if (!roots) continue;
    let best = null;
    for (const root of roots) {
      for (const selector of rule.selectors) {
        if (!matchSelector(selector, node, { scopeRoot: root, parent: rule.parent }, unknown)) continue;
        const spec = specificity(selector, rule.parent);
        if (!best || cmpSpec(spec, best) > 0) best = spec;
      }
    }
    if (!best) continue;
    for (const decl of decls) {
      found.push({ ...decl, value: decl.raw ? valueOf(decl.raw, property) : decl.value, sheet: rule.sheet, line: rule.line, origin: rule.origin, layer: rule.layer.join('.') || null,
        layerKey: cascade.layers.key(rule.layer), specificity: best, order: rule.order, sheetIndex: rule.sheetIndex, rule });
    }
  }
  found.sort((x, y) => -precedence(x, y));
  return found;
}
// > 0 when x beats y.
export function precedence(x, y) {
  const rank = (d) => (d.origin === 'ua' ? (d.important ? 2 : 0) : (d.important ? 1.5 : 1));
  if (rank(x) !== rank(y)) return rank(x) - rank(y);
  const layer = compareKeys(x.layerKey, y.layerKey);
  if (layer) return x.important ? -layer : layer;
  const spec = cmpSpec(x.specificity, y.specificity);
  if (spec) return spec;
  return x.order - y.order || (x.index ?? 0) - (y.index ?? 0);
}

// True when x and y differ only by order of appearance between two different local sheets — a tie the bundle order
// (not the CSS) would decide, which a test must not silently resolve.
export function orderOnly(x, y) {
  return x.origin === y.origin && x.important === y.important && !compareKeys(x.layerKey, y.layerKey)
    && !cmpSpec(x.specificity, y.specificity) && x.sheet !== y.sheet && x.sheet.startsWith('src/') && y.sheet.startsWith('src/');
}

// The specified value of `property` on `node` after the cascade, following inherit/unset/revert-layer and inheritance.
// Returns { value, from }: `from` is the winning declaration, null when no rule sets the property (value 'initial'). An
// inherited value carries the ancestor's winner as `from`, that ancestor as `inheritedFrom`, and as `via` the
// declaration that asked to inherit (null for plain inheritance).
export function computed(cascade, node, property) {
  const list = declarations(cascade, node, property);
  for (let i = 0; i < list.length; i++) {
    const decl = list[i], value = decl.value;
    // revert-layer rolls back to the next lower layer of the same origin (unlayered styles are the implicit last
    // layer), then like `revert` to the UA origin; `revert` goes straight to the UA origin.
    if (value === 'revert-layer' || value === 'revert') {
      const lower = value === 'revert-layer' && decl.origin === 'author'
        ? list.findIndex((d, j) => j > i && d.origin === 'author' && d.important === decl.important && compareKeys(d.layerKey, decl.layerKey) < 0) : -1;
      const next = lower >= 0 ? lower : list.findIndex((d, j) => j > i && d.origin === 'ua');
      if (next < 0) break;
      i = next - 1; continue;
    }
    if (value === 'inherit' || (value === 'unset' && INHERITED.has(property))) return inherit(cascade, node, property, decl);
    if (value === 'initial' || value === 'unset') return { value: 'initial', from: decl, candidates: list };
    return { value, from: decl, candidates: list };
  }
  return INHERITED.has(property) ? inherit(cascade, node, property, null) : { value: 'initial', from: null };
}
function inherit(cascade, node, property, from) {
  if (!node.parent) return { value: 'initial', from };
  const parent = computed(cascade, node.parent, property);
  return { ...parent, inheritedFrom: parent.inheritedFrom ?? node.parent, via: from };
}
