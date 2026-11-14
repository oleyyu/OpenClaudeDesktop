// Shared constants and source checks for generators migrated to Claude Desktop 3.6556.2 (migration plan §2.3, R1/R2/R3).
// Official chunks are only read as text and parsed with rolldown's parseAst; nothing here executes them.
import path from 'node:path';
import { createRequire } from 'node:module';

const appRoot = path.resolve(import.meta.dirname, '..');
export const referenceRoot = path.resolve(appRoot, '../reference');

export const referenceVersion = '3.6556.2';
// E6: manifests record this value in `referenceSnapshot`; it is a path relative to `reference/`.
export const referenceSnapshot = 'snapshots/claude-3.6556.2-20261025-192807';
export const snapshotRoot = path.join(referenceRoot, referenceSnapshot);
export const ionSource = path.join(snapshotRoot, 'ion-dist/assets/v1');
export const asarSource = path.join(snapshotRoot, 'asar/.vite/build');
export const i18nSource = path.join(snapshotRoot, 'ion-dist/i18n');

export const previousVersion = '2.42304.0';
export const previousSnapshot = 'installed-2.42304.0-20261017';
export const previousRoot = path.join(referenceRoot, previousSnapshot);
export const previousIonSource = path.join(previousRoot, 'ion-dist/assets/v1');
export const previousAsarSource = path.join(previousRoot, 'asar/.vite/build');
export const previousI18nSource = path.join(previousRoot, 'ion-dist/i18n');

export const vendorFrame = 'vendor-frame-CnSY1sxv.js';
export const sharedFrame = 'shared-frame-6jtSkIit.js';
export const vendorIntl = 'vendor-intl-DYfox5Co.js';

// vendor-frame export alias -> [module, member], measured on vendor-frame-CnSY1sxv.js: every alias resolves through a
// top-level `local=<namespace>.<member>` declarator (react namespace `c`, jsx-runtime `me`, react-dom `Hn`).
// Aliases were reused across versions: 2.42304.0 `Co` was useState and is useRef here, `Va` was jsx and is the
// jsx-runtime Fragment here, `$a` was cloneElement and is Suspense here. Never carry an old alias over by name.
// `Oo` is React Compiler's `c` (useMemoCache); its declarator has a different shape, see assertCompilerRuntime().
export const reactAliases = Object.freeze(Object.fromEntries(Object.entries({
  co: ['react', 'default'], Ka: ['react', 'Activity'], qa: ['react', 'Children'], Ja: ['react', 'Component'],
  Ya: ['react', 'Fragment'], Xa: ['react', 'Profiler'], Za: ['react', 'PureComponent'], Qa: ['react', 'StrictMode'],
  $a: ['react', 'Suspense'], eo: ['react', 'cloneElement'], to: ['react', 'createContext'], no: ['react', 'createElement'],
  ro: ['react', 'createRef'], io: ['react', 'forwardRef'], ao: ['react', 'isValidElement'], oo: ['react', 'lazy'],
  so: ['react', 'memo'], lo: ['react', 'startTransition'], uo: ['react', 'use'], do: ['react', 'useCallback'],
  fo: ['react', 'useContext'], po: ['react', 'useDebugValue'], mo: ['react', 'useDeferredValue'], ho: ['react', 'useEffect'],
  go: ['react', 'useEffectEvent'], _o: ['react', 'useId'], vo: ['react', 'useImperativeHandle'], yo: ['react', 'useInsertionEffect'],
  bo: ['react', 'useLayoutEffect'], xo: ['react', 'useMemo'], So: ['react', 'useReducer'], Co: ['react', 'useRef'],
  wo: ['react', 'useState'], To: ['react', 'useSyncExternalStore'], Eo: ['react', 'useTransition'],
  Va: ['react/jsx-runtime', 'Fragment'], Ha: ['react/jsx-runtime', 'jsx'], Ua: ['react/jsx-runtime', 'jsxs'],
  Ca: ['react-dom', 'default'], xa: ['react-dom', 'createPortal'], Sa: ['react-dom', 'flushSync'], wa: ['react-dom', 'unstable_batchedUpdates'],
  Oo: ['react/compiler-runtime', 'c'],
}).map(([alias, target]) => [alias, Object.freeze(target)])));

// E3: React Compiler helpers that shared-frame defines once and every compiled closure imports. Keys are the
// shared-frame export aliases; `name` is the semantic name view-tabs publishes; `feature` is the 3.6556.2 declaration,
// matched whole through looseFeature(). `J9` is the vendor-frame `Oo` import; `J8` the memo cache sentinel.
export const compilerHelpers = Object.freeze(Object.fromEntries(Object.entries({
  ip: ['J9', 'reactMemoCache', 'J9=B'],
  rp: ['J8', 'memoSentinel', 'J8=Symbol.for("react.memo_cache_sentinel")'],
  Zf: ['J0', 'memoIsEmpty', 'function J0(e,t){return e[t]===J8}'],
  Qf: ['J1', 'memoChanged1', 'function J1(e,t,n){return e[t]!==n}'],
  $f: ['J2', 'memoChanged2', 'function J2(e,t,n,r){return e[t]!==n||e[t+1]!==r}'],
  ep: ['J3', 'memoChanged3', 'function J3(e,t,n,r,i){return e[t]!==n||e[t+1]!==r||e[t+2]!==i}'],
  tp: ['J4', 'memoChanged4', 'function J4(e,t,n,r,i,a){return e[t]!==n||e[t+1]!==r||e[t+2]!==i||e[t+3]!==a}'],
  np: ['J5', 'memoChanged5', 'function J5(e,t,...n){for(let r=0;r<n.length;r++)if(e[t+r]!==n[r])return!0;return!1}'],
  ap: ['K0', 'memoStore0', 'function K0(e,t,n){return e[t]=n,n}'],
  op: ['K1', 'memoStore1', 'function K1(e,t,n,r){return e[t]=n,e[t+1]=r,r}'],
  sp: ['K2', 'memoStore2', 'function K2(e,t,n,r,i){return e[t]=n,e[t+1]=r,e[t+2]=i,i}'],
  cp: ['K3', 'memoStore3', 'function K3(e,t,n,r,i,a){return e[t]=n,e[t+1]=r,e[t+2]=i,e[t+3]=a,a}'],
  lp: ['K4', 'memoStore4', 'function K4(e,t,n,r,i,a,o){return e[t]=n,e[t+1]=r,e[t+2]=i,e[t+3]=a,e[t+4]=o,o}'],
  up: ['K5', 'memoStore5', 'function K5(e,t,...n){for(let r=0;r<n.length;r++)e[t+r]=n[r];return n[n.length-1]}'],
  Kf: ['I1', 'memoStoreValueFirst1', 'function I1(e,t,n,r){return e[t]=r,e[t+1]=n,n}'],
  qf: ['I2', 'memoStoreValueFirst2', 'function I2(e,t,n,r,i){return e[t]=r,e[t+1]=i,e[t+2]=n,n}'],
  Jf: ['I3', 'memoStoreValueFirst3', 'function I3(e,t,n,r,i,a){return e[t]=r,e[t+1]=i,e[t+2]=a,e[t+3]=n,n}'],
  Yf: ['I4', 'memoStoreValueFirst4', 'function I4(e,t,n,r,i,a,o){return e[t]=r,e[t+1]=i,e[t+2]=a,e[t+3]=o,e[t+4]=n,n}'],
  Xf: ['I5', 'memoStoreValueFirst5', 'function I5(e,t,n,...r){for(let n=0;n<r.length;n++)e[t+n]=r[n];return e[t+r.length]=n,n}'],
  dp: ['Z1', 'memoStoreDeps1', 'function Z1(e,t,n,r){return e[t]=r,n}'],
  fp: ['Z2', 'memoStoreDeps2', 'function Z2(e,t,n,r,i){return e[t]=r,e[t+1]=i,n}'],
  pp: ['Z3', 'memoStoreDeps3', 'function Z3(e,t,n,r,i,a){return e[t]=r,e[t+1]=i,e[t+2]=a,n}'],
  mp: ['Z4', 'memoStoreDeps4', 'function Z4(e,t,n,r,i,a,o){return e[t]=r,e[t+1]=i,e[t+2]=a,e[t+3]=o,n}'],
  hp: ['Z5', 'memoStoreDeps5', 'function Z5(e,t,n,...r){for(let n=0;n<r.length;n++)e[t+n]=r[n];return n}'],
}).map(([alias, [local, name, feature]]) => [alias, Object.freeze({ local, name, feature })])));

// R2/E5: a source feature with minified names generalized. Identifiers of at most three characters become
// `[\w$]{1,3}` (the same identifier repeated must match the same name again), except property names after `.`,
// object keys before `:`, keywords, short globals and `keep`. String and template literals, numbers and longer
// identifiers stay literal; whitespace between tokens is optional, so a feature matches raw and prettier text.
const keywords = new Set(['as', 'do', 'if', 'in', 'of', 'for', 'let', 'new', 'try', 'var', 'NaN', 'Map', 'Set', 'URL']);
const escapeRegExp = text => text.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&');
export function looseFeature(feature, { keep = [], flags = '' } = {}) {
  if (typeof feature !== 'string' || !feature) throw Error('looseFeature needs a non-empty string');
  const tokens = [], groups = new Map();
  let i = 0;
  while (i < feature.length) {
    const char = feature[i];
    if (/\s/.test(char)) { i++; continue; }
    if (char === '"' || char === "'" || char === '`') {
      let j = i + 1;
      while (j < feature.length && feature[j] !== char) j += feature[j] === '\\' ? 2 : 1;
      if (j >= feature.length) throw Error(`looseFeature: unterminated string in ${JSON.stringify(feature)}`);
      tokens.push(escapeRegExp(feature.slice(i, j + 1))); i = j + 1; continue;
    }
    const number = /^(?:0[xXbBoO][\da-fA-F_]+|\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?)n?/.exec(feature.slice(i));
    if (number) { tokens.push(escapeRegExp(number[0])); i += number[0].length; continue; }
    const word = /^[A-Za-z_$][\w$]*/.exec(feature.slice(i));
    if (word) {
      const name = word[0], before = feature.slice(0, i).trimEnd(), after = feature.slice(i + name.length).trimStart();
      const property = before.endsWith('.') && !before.endsWith('..');
      const key = after.startsWith(':') && !before.endsWith('?');
      if (name.length > 3 || property || key || keywords.has(name) || keep.includes(name)) tokens.push(`(?<![\\w$])${escapeRegExp(name)}(?![\\w$])`);
      else if (groups.has(name)) tokens.push(`\\k<${groups.get(name)}>`);
      else { const group = `n${groups.size}`; groups.set(name, group); tokens.push(`(?<![\\w$])(?<${group}>[\\w$]{1,3})(?![\\w$])`); }
      i += name.length; continue;
    }
    tokens.push(escapeRegExp(char)); i++;
  }
  return new RegExp(tokens.join('\\s*'), flags);
}

// Parsed view of one official chunk: export alias -> local, import local -> [source, imported], top-level declarations.
let parsedCache = { text: null, info: null };
function parsed(text) {
  if (parsedCache.text === text) return parsedCache.info;
  const { parseAst } = createRequire(path.join(appRoot, 'package.json'))('rolldown/parseAst');
  const ast = parseAst(text);
  const exports = new Map(), imports = new Map(), declarations = new Map();
  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration' && !node.declaration && !node.source) for (const s of node.specifiers) exports.set(s.exported.name ?? s.exported.value, s.local.name);
    if (node.type === 'ImportDeclaration') for (const s of node.specifiers) imports.set(s.local.name, [node.source.value, s.type === 'ImportNamespaceSpecifier' ? '*' : s.imported?.name ?? s.imported?.value ?? 'default']);
    if (node.type === 'FunctionDeclaration' && node.id) declarations.set(node.id.name, { node, text: text.slice(node.start, node.end) });
    if (node.type === 'VariableDeclaration') for (const d of node.declarations) if (d.id.type === 'Identifier') declarations.set(d.id.name, { node: d, init: d.init, text: text.slice(d.start, d.end) });
  }
  parsedCache = { text, info: { exports, imports, declarations } };
  return parsedCache.info;
}
function exportedLocal(info, alias, label) {
  const local = info.exports.get(alias);
  if (!local) throw Error(`${label} does not export ${alias}`);
  return local;
}

// R3: the namespace a module's members are read from is the one carrying that module's anchor member.
const namespaceAnchors = { react: '__COMPILER_RUNTIME', 'react/jsx-runtime': 'jsxs', 'react-dom': 'flushSync' };
function namespaceFor(info, module) {
  const anchor = namespaceAnchors[module];
  if (!anchor) throw Error(`No vendor-frame namespace anchor for ${module}`);
  const owners = new Set([...info.declarations.values()].filter(d => d.init?.type === 'MemberExpression' && !d.init.computed && d.init.object.type === 'Identifier' && d.init.property.name === anchor).map(d => d.init.object.name));
  if (owners.size !== 1) throw Error(`vendor-frame ${module} namespace is ambiguous (${[...owners].join(', ') || 'none'})`);
  return [...owners][0];
}

// vendor-frame `alias` must be a top-level `local=<namespace>.<member>` with the namespace of `module`.
export function assertVendorAlias(text, alias, member = reactAliases[alias]) {
  const [module, name] = Array.isArray(member) ? member : [reactAliases[alias]?.[0], member];
  if (!module || !name) throw Error(`No React alias entry for vendor-frame ${alias}`);
  if (module === 'react/compiler-runtime') {
    if (name !== 'c') throw Error(`react/compiler-runtime has no ${name}`);
    return { ...assertCompilerRuntime(text, alias) };
  }
  const info = parsed(text), local = exportedLocal(info, alias, 'vendor-frame');
  const init = info.declarations.get(local)?.init;
  const namespace = namespaceFor(info, module);
  if (init?.type !== 'MemberExpression' || init.computed || init.object.type !== 'Identifier' || init.object.name !== namespace || init.property.name !== name)
    throw Error(`vendor-frame ${alias} no longer resolves to ${module}:${name}`);
  return { alias, local, namespace, module, member: name };
}

// R3: `Oo` is `o=e(n(((e,t)=>{t.exports=a()}))()).c`, and `a` defines `c` through React's useMemoCache.
const compilerFactory = /^[\w$]+\([\w$]+\(\(\(([\w$]+),([\w$]+)\)=>\{\2\.exports=([\w$]+)\(\)\}\)\)\(\)\)\.c$/;
const compilerRuntimeFeature = looseFeature('var t=i().__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;e.c=function(e){return t.H.useMemoCache(e)}');
export function assertCompilerRuntime(text, alias = 'Oo') {
  const info = parsed(text), local = exportedLocal(info, alias, 'vendor-frame');
  const declaration = info.declarations.get(local);
  const init = declaration?.init ? text.slice(declaration.init.start, declaration.init.end) : '';
  const factory = compilerFactory.exec(init)?.[3];
  if (!factory) throw Error(`vendor-frame ${alias} no longer has the react/compiler-runtime shape (${init.slice(0, 80) || 'missing'})`);
  if (!compilerRuntimeFeature.test(info.declarations.get(factory)?.text ?? '')) throw Error(`vendor-frame ${alias} factory ${factory} does not define c through useMemoCache`);
  if (!text.includes('__COMPILER_RUNTIME=')) throw Error('vendor-frame lacks React __COMPILER_RUNTIME');
  return { alias, local, factory, module: 'react/compiler-runtime', member: 'c' };
}

// E3: every compiler helper is exported under its alias and its whole top-level declaration matches the feature.
// `reactMemoCache` must be the vendor-frame `Oo` import itself.
export function assertCompilerHelpers(text, { vendor = vendorFrame } = {}) {
  const info = parsed(text), resolved = {};
  const sentinel = compilerHelpers.rp.local;
  for (const [alias, { local, name, feature }] of Object.entries(compilerHelpers)) {
    if (exportedLocal(info, alias, 'shared-frame') !== local) throw Error(`shared-frame ${alias} is no longer ${local} (${name})`);
    const declaration = info.declarations.get(local);
    const pattern = looseFeature(feature, { keep: [local, sentinel] });
    if (!declaration || !new RegExp(`^${pattern.source}$`).test(declaration.text)) throw Error(`shared-frame ${local} (${name}) no longer matches ${feature}`);
    resolved[name] = { alias, local };
  }
  const runtime = info.declarations.get(compilerHelpers.ip.local).init;
  const [from, imported] = runtime?.type === 'Identifier' ? info.imports.get(runtime.name) ?? [] : [];
  if (from !== `./${vendor}` || imported !== 'Oo') throw Error(`shared-frame ${compilerHelpers.ip.local} is not the ${vendor} Oo import`);
  return resolved;
}
