// Static source contract for the R5-V1 settings target: the claude.ai live public web build d0407c9a7d (entry index-Bm5RAwE_.js),
// frozen as reference/snapshots/claude-web-live-20261110-Bm5RAwE_ (round3-decisions.json userDecisions R5-V1). Derived the same way as
// official-4.16336.0.mjs (round4/settings/round2/tools/derive-live-constants.mjs: AST declarations + export/import relations of the
// frozen snapshot; official code is never executed). The live minifier wraps function expressions in parentheses
// (`e.c=(function(e){…})`), which the compiler-runtime feature below allows. Main process stays on the 4.16336.0 asar.
// Cross-version linking to the 4.16336.0 graphs (cds-core) goes through scripts/cross-version-link.mjs, never by name.
// Alias and helper tables were independently derived from top-level AST declarations
// and export/import relationships in the frozen snapshot. Official code is never executed.
// Existing generators remain on their own actual version until individually ported.
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const appRoot = path.resolve(import.meta.dirname, '..');
export const referenceRoot = path.resolve(appRoot, '../reference');
export const referenceVersion = 'web-live-d0407c9a7d';
export const referenceSnapshot = 'snapshots/claude-web-live-20261110-Bm5RAwE_';
export const snapshotRoot = path.join(referenceRoot, referenceSnapshot);
export const ionSource = path.join(snapshotRoot, 'assets/v1');
// The live web build has no main process: the desktop main process stays on the 4.16336.0 asar.
export const asarSource = path.join(referenceRoot, 'snapshots/claude-4.16336.0-20261104/asar/.vite/build');
export const i18nSource = path.join(snapshotRoot, 'i18n');
export const previousVersion = '4.16336.0';
export const previousSnapshot = 'snapshots/claude-4.16336.0-20261104';
export const previousRoot = path.join(referenceRoot, previousSnapshot);
export const previousIonSource = path.join(previousRoot, 'ion-dist/assets/v1');
export const previousAsarSource = path.join(previousRoot, 'asar/.vite/build');
export const previousI18nSource = path.join(previousRoot, 'ion-dist/i18n');
export const vendorFrame = "vendor-frame-C_BCNewq.js";
export const sharedFrame = "shared-frame-Bi25Rpmq.js";
export const vendorIntl = "vendor-intl-gHFTX6E9.js";
export const compilerRuntimeAlias = "jo";
export const preloadHelper = "preload-helper-BlnaKDVg.js";
export const vendorMotion = "vendor-motion-BlxMhm5h.js";
export const rolldownRuntime = "rolldown-runtime-CtHIh08M.js";
export const entry = "index-Bm5RAwE_.js";
export const buildId = "d0407c9a7d";
export const reactAliases = Object.freeze({
  "do": [
    "react",
    "default"
  ],
  "Ya": [
    "react",
    "Activity"
  ],
  "Xa": [
    "react",
    "Children"
  ],
  "Za": [
    "react",
    "Component"
  ],
  "Qa": [
    "react",
    "Fragment"
  ],
  "$a": [
    "react",
    "Profiler"
  ],
  "eo": [
    "react",
    "PureComponent"
  ],
  "to": [
    "react",
    "StrictMode"
  ],
  "no": [
    "react",
    "Suspense"
  ],
  "ro": [
    "react",
    "cloneElement"
  ],
  "io": [
    "react",
    "createContext"
  ],
  "ao": [
    "react",
    "createElement"
  ],
  "oo": [
    "react",
    "createRef"
  ],
  "so": [
    "react",
    "forwardRef"
  ],
  "co": [
    "react",
    "isValidElement"
  ],
  "lo": [
    "react",
    "lazy"
  ],
  "uo": [
    "react",
    "memo"
  ],
  "fo": [
    "react",
    "startTransition"
  ],
  "po": [
    "react",
    "use"
  ],
  "mo": [
    "react",
    "useCallback"
  ],
  "ho": [
    "react",
    "useContext"
  ],
  "go": [
    "react",
    "useDebugValue"
  ],
  "_o": [
    "react",
    "useDeferredValue"
  ],
  "vo": [
    "react",
    "useEffect"
  ],
  "yo": [
    "react",
    "useEffectEvent"
  ],
  "bo": [
    "react",
    "useId"
  ],
  "xo": [
    "react",
    "useImperativeHandle"
  ],
  "So": [
    "react",
    "useInsertionEffect"
  ],
  "Co": [
    "react",
    "useLayoutEffect"
  ],
  "wo": [
    "react",
    "useMemo"
  ],
  "To": [
    "react",
    "useReducer"
  ],
  "Eo": [
    "react",
    "useRef"
  ],
  "Do": [
    "react",
    "useState"
  ],
  "Oo": [
    "react",
    "useSyncExternalStore"
  ],
  "ko": [
    "react",
    "useTransition"
  ],
  "Ka": [
    "react/jsx-runtime",
    "Fragment"
  ],
  "qa": [
    "react/jsx-runtime",
    "jsx"
  ],
  "Ja": [
    "react/jsx-runtime",
    "jsxs"
  ],
  "Ha": [
    "react-dom",
    "default"
  ],
  "za": [
    "react-dom",
    "createPortal"
  ],
  "Ba": [
    "react-dom",
    "flushSync"
  ],
  "Ua": [
    "react-dom",
    "unstable_batchedUpdates"
  ],
  "jo": [
    "react/compiler-runtime",
    "c"
  ]
});
export const compilerHelpers = Object.freeze({
  "J9": {
    "local": "J9",
    "name": "reactMemoCache",
    "feature": "J9=mo"
  },
  "J8": {
    "local": "J8",
    "name": "memoSentinel",
    "feature": "J8=Symbol.for(\"react.memo_cache_sentinel\")"
  },
  "J0": {
    "local": "J0",
    "name": "memoIsEmpty",
    "feature": "J0=(function(e,t){return e[t]===J8})"
  },
  "J1": {
    "local": "J1",
    "name": "memoChanged1",
    "feature": "J1=(function(e,t,n){return e[t]!==n})"
  },
  "J2": {
    "local": "J2",
    "name": "memoChanged2",
    "feature": "J2=(function(e,t,n,r){return e[t]!==n||e[t+1]!==r})"
  },
  "J3": {
    "local": "J3",
    "name": "memoChanged3",
    "feature": "J3=(function(e,t,n,r,i){return e[t]!==n||e[t+1]!==r||e[t+2]!==i})"
  },
  "J4": {
    "local": "J4",
    "name": "memoChanged4",
    "feature": "J4=(function(e,t,n,r,i,a){return e[t]!==n||e[t+1]!==r||e[t+2]!==i||e[t+3]!==a})"
  },
  "J5": {
    "local": "J5",
    "name": "memoChanged5",
    "feature": "J5=(function(e,t,...n){for(let r=0;r<n.length;r++)if(e[t+r]!==n[r])return!0;return!1})"
  },
  "K0": {
    "local": "K0",
    "name": "memoStore0",
    "feature": "K0=(function(e,t,n){return e[t]=n,n})"
  },
  "K1": {
    "local": "K1",
    "name": "memoStore1",
    "feature": "K1=(function(e,t,n,r){return e[t]=n,e[t+1]=r,r})"
  },
  "K2": {
    "local": "K2",
    "name": "memoStore2",
    "feature": "K2=(function(e,t,n,r,i){return e[t]=n,e[t+1]=r,e[t+2]=i,i})"
  },
  "K3": {
    "local": "K3",
    "name": "memoStore3",
    "feature": "K3=(function(e,t,n,r,i,a){return e[t]=n,e[t+1]=r,e[t+2]=i,e[t+3]=a,a})"
  },
  "K4": {
    "local": "K4",
    "name": "memoStore4",
    "feature": "K4=(function(e,t,n,r,i,a,o){return e[t]=n,e[t+1]=r,e[t+2]=i,e[t+3]=a,e[t+4]=o,o})"
  },
  "K5": {
    "local": "K5",
    "name": "memoStore5",
    "feature": "K5=(function(e,t,...n){for(let r=0;r<n.length;r++)e[t+r]=n[r];return n[n.length-1]})"
  },
  "I1": {
    "local": "I1",
    "name": "memoStoreValueFirst1",
    "feature": "I1=(function(e,t,n,r){return e[t]=r,e[t+1]=n,n})"
  },
  "I2": {
    "local": "I2",
    "name": "memoStoreValueFirst2",
    "feature": "I2=(function(e,t,n,r,i){return e[t]=r,e[t+1]=i,e[t+2]=n,n})"
  },
  "I3": {
    "local": "I3",
    "name": "memoStoreValueFirst3",
    "feature": "I3=(function(e,t,n,r,i,a){return e[t]=r,e[t+1]=i,e[t+2]=a,e[t+3]=n,n})"
  },
  "I4": {
    "local": "I4",
    "name": "memoStoreValueFirst4",
    "feature": "I4=(function(e,t,n,r,i,a,o){return e[t]=r,e[t+1]=i,e[t+2]=a,e[t+3]=o,e[t+4]=n,n})"
  },
  "I5": {
    "local": "I5",
    "name": "memoStoreValueFirst5",
    "feature": "I5=(function(e,t,n,...r){for(let n=0;n<r.length;n++)e[t+n]=r[n];return e[t+r.length]=n,n})"
  },
  "Z1": {
    "local": "Z1",
    "name": "memoStoreDeps1",
    "feature": "Z1=(function(e,t,n,r){return e[t]=r,n})"
  },
  "Z2": {
    "local": "Z2",
    "name": "memoStoreDeps2",
    "feature": "Z2=(function(e,t,n,r,i){return e[t]=r,e[t+1]=i,n})"
  },
  "Z3": {
    "local": "Z3",
    "name": "memoStoreDeps3",
    "feature": "Z3=(function(e,t,n,r,i,a){return e[t]=r,e[t+1]=i,e[t+2]=a,n})"
  },
  "Z4": {
    "local": "Z4",
    "name": "memoStoreDeps4",
    "feature": "Z4=(function(e,t,n,r,i,a,o){return e[t]=r,e[t+1]=i,e[t+2]=a,e[t+3]=o,n})"
  },
  "Z5": {
    "local": "Z5",
    "name": "memoStoreDeps5",
    "feature": "Z5=(function(e,t,n,...r){for(let n=0;n<r.length;n++)e[t+n]=r[n];return n})"
  }
});
export const sourceHashes = Object.freeze({
  "vendor-frame-C_BCNewq.js": "6b6146f582924dc225472de3c201fd3687a41fc36d9f1131d2fdfc6e9587b228",
  "shared-frame-Bi25Rpmq.js": "c82137ee2af1ef6615551cf6084920d8d2b27d683003a0b673907a6ff68731bc"
});

for (const target of Object.values(reactAliases)) Object.freeze(target);
for (const helper of Object.values(compilerHelpers)) Object.freeze(helper);

export function assertPinnedSource(file, text) {
  const expected = sourceHashes[file];
  if (!expected) throw Error(`No pinned source hash for ${file}`);
  if (createHash('sha256').update(text).digest('hex') !== expected)
    throw Error(`Official live d0407c9a7d source changed: ${file}`);
  return expected;
}

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

// R3: the compiler runtime export is `o=e(n(((e,t)=>{t.exports=a()}))()).c`, and `a` defines `c` through React's useMemoCache.
const compilerFactory = /^[\w$]+\([\w$]+\(\(\(([\w$]+),([\w$]+)\)=>\{\2\.exports=([\w$]+)\(\)\}\)\)\(\)\)\.c$/;
const compilerRuntimeFeature = looseFeature('var t=i().__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;e.c=(function(e){return t.H.useMemoCache(e)})');
export function assertCompilerRuntime(text, alias = compilerRuntimeAlias) {
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
// `reactMemoCache` must resolve to the pinned vendor compiler-runtime import.
export function assertCompilerHelpers(text, { vendor = vendorFrame } = {}) {
  const info = parsed(text), resolved = {};
  const sentinel = Object.values(compilerHelpers).find(helper => helper.name === 'memoSentinel').local;
  for (const [alias, { local, name, feature }] of Object.entries(compilerHelpers)) {
    if (exportedLocal(info, alias, 'shared-frame') !== local) throw Error(`shared-frame ${alias} is no longer ${local} (${name})`);
    const declaration = info.declarations.get(local);
    const pattern = looseFeature(feature, { keep: [local, sentinel] });
    if (!declaration || !new RegExp(`^${pattern.source}$`).test(declaration.text)) throw Error(`shared-frame ${local} (${name}) no longer matches ${feature}`);
    resolved[name] = { alias, local };
  }
  const runtime = info.declarations.get(Object.values(compilerHelpers).find(helper => helper.name === 'reactMemoCache').local).init;
  const [from, imported] = runtime?.type === 'Identifier' ? info.imports.get(runtime.name) ?? [] : [];
  if (from !== `./${vendor}` || imported !== compilerRuntimeAlias) throw Error(`shared-frame reactMemoCache is not the ${vendor} ${compilerRuntimeAlias} import`);
  return resolved;
}
