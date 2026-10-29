// During the source migration, retain only absent utilities still referenced by
// local modules. Never merge the previous design-system/component stylesheet.
//
// References are exact class tokens (R1 SC-0): string literals and template
// fragments of src JS/JSX/MJS, split on whitespace, plus the classes of src CSS
// selectors. Comments never enter the index. Two kinds of non-rendered class
// data are excluded and audited in manifest.scanner.exclusions: CDS design-token
// records ({__name, cssVar, ...}) and tailwind-merge class registries
// ({classGroups, conflictingClassGroups, ...}). Module reachability from
// index.html is recorded per hit for information only; it never drops a rule.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import postcss from 'postcss';
import {parseAst} from 'rolldown/parseAst';
import {designSnapshot, designStylesheets, designVersion} from './current-design-assets.mjs';

const root = path.resolve(import.meta.dirname, '..');
const sha = text => createHash('sha256').update(text).digest('hex');
const decode = name => name.replace(/\\([a-fA-F0-9]{1,6})\s?|\\([^\r\n\f])/g,
  (_, hex, char) => hex ? String.fromCodePoint(parseInt(hex, 16) || 0xfffd) : char);
export function selectorClasses(selector) {
  return [...selector.matchAll(/\.((?:\\(?:[a-fA-F0-9]{1,6}\s?|[^\r\n\f])|[\w-]|[^\x00-\x7f])+)/g)].map(m => decode(m[1]));
}

// The classes a utility rule styles (its subject). Tailwind emits the utility class in the leading compound selector of
// each selector in the list; variants add functional pseudo-classes (:is/:where/:has/:not) and descendant parts after
// it, which may name other classes (`.max-sm\:has-…:has(>[data-title-row-ruled]) .epitaxy-toc ol[aria-hidden]`). Only
// the leading compound's classes outside parentheses count; a selector that starts with a wrapper (`:is(.\*\:p-2 > *)`,
// `:where(.space-x-2>…)`) takes the subject of the wrapper's argument. A reference to a class elsewhere in the
// selector (a plain host class such as epitaxy-toc) does not keep the rule.
function maskSelector(selector) {
  let out = '';
  for (let i = 0; i < selector.length;) {
    const char = selector[i];
    if (char === '\\') { const escape = /^\\(?:[a-fA-F0-9]{1,6}\s?|[^\r\n\f]|$)/.exec(selector.slice(i))[0]; out += '_'.repeat(escape.length); i += escape.length; continue; }
    if (char === '[') {
      // Attribute selector: its name and value (quoted or not) are neither structure nor classes (masked as U+0001).
      let j = i + 1, quote = null;
      for (; j < selector.length; j++) {
        const c = selector[j];
        if (c === '\\') { j++; continue; }
        if (quote) { if (c === quote) quote = null; continue; }
        if (c === '"' || c === "'") quote = c; else if (c === ']') break;
      }
      const end = Math.min(j + 1, selector.length);
      out += '[' + '\u0001'.repeat(Math.max(0, end - i - 2)) + (end - i >= 2 ? ']' : ''); i = end; continue;
    }
    out += char; i++;
  }
  return out;
}
export function subjectClasses(selector) {
  const masked = maskSelector(selector), parts = [];
  let depth = 0, from = 0;
  for (let i = 0; i <= masked.length; i++) {
    const c = masked[i];
    if (c === '(') depth++; else if (c === ')') depth--;
    else if ((c === ',' && depth === 0) || i === masked.length) { parts.push([from, i]); from = i + 1; }
  }
  const subjects = [];
  for (let [start, end] of parts) {
    while (start < end && /\s/.test(masked[start])) start++;
    let stop = start, level = 0, outside = '';
    for (; stop < end; stop++) {
      const c = masked[stop];
      if (c === '(') { level++; continue; }
      if (c === ')') { level--; continue; }
      if (level === 0 && /[\s>+~]/.test(c)) break;
      if (level === 0 && c !== '\u0001') outside += selector[stop];
    }
    const own = selectorClasses(outside);
    if (own.length) { subjects.push(...own); continue; }
    const wrapper = /^:(?:is|where)\(/.exec(masked.slice(start, stop));
    if (!wrapper) continue;
    let close = start + wrapper[0].length, inner = 1;
    for (; close < stop && inner; close++) { if (masked[close] === '(') inner++; else if (masked[close] === ')') inner--; }
    subjects.push(...subjectClasses(selector.slice(start + wrapper[0].length, close - 1)));
  }
  return subjects;
}
// A prior-snapshot utility rule is retained only when a referenced (absent) class is in its subject.
export function retainsRule(selector, referencedClasses) {
  const subject = new Set(subjectClasses(selector));
  return referencedClasses.some(name => subject.has(name));
}

const SOURCE_FILE = /\.(?:js|jsx|mjs|css)$/;
// Object shapes whose string values are class metadata rather than rendered classes.
// A CDS design-token record carries both keys; the values are names / var() refs.
const TOKEN_RECORD = {keys:['__name', 'cssVar'], reason:'design-token-metadata'};
// tailwind-merge configuration (default config and CDS extendTailwindMerge): the
// registry object holds both keys; class groups are conflict-resolution data.
const MERGE_REGISTRY = {keys:['classGroups', 'conflictingClassGroups'],
  excluded:['classGroups', 'conflictingClassGroups', 'conflictingClassGroupModifiers'], reason:'tailwind-merge-registry'};

const propertyName = node => node?.type === 'Property' && !node.computed
  ? node.key.type === 'Identifier' ? node.key.name : node.key.type === 'Literal' ? String(node.key.value) : null
  : null;
const memberName = node => node?.type === 'MemberExpression'
  ? !node.computed && node.property.type === 'Identifier' ? node.property.name
    : node.computed && node.property.type === 'Literal' ? String(node.property.value) : null
  : null;
const patternNames = node => {
  if (!node) return [];
  if (node.type === 'Identifier') return [node.name];
  if (node.type === 'ObjectPattern') return node.properties.flatMap(p => patternNames(p.type === 'RestElement' ? p.argument : p.value));
  if (node.type === 'ArrayPattern') return node.elements.flatMap(patternNames);
  if (node.type === 'AssignmentPattern') return patternNames(node.left);
  if (node.type === 'RestElement') return patternNames(node.argument);
  return [];
};
const splitTokens = text => text.split(/\s+/).filter(Boolean);
const literalSpecifier = node => node?.type === 'Literal' && typeof node.value === 'string' ? node.value
  : node?.type === 'TemplateLiteral' && node.expressions.length === 0 ? node.quasis[0].value.cooked ?? node.quasis[0].value.raw : null;

// One top-level statement can declare many bindings (minified `const a=…,b=…`):
// attribute each declarator separately, so hits name the binding that holds them.
function topLevelUnits(statement) {
  const declaration = statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration' ? statement.declaration : statement;
  if (statement.type === 'ExportDefaultDeclaration' && !declaration?.id) return [{binding:'default', node:declaration}];
  if (declaration?.type === 'VariableDeclaration') return declaration.declarations.map(d => ({binding:patternNames(d.id).join(',') || '(pattern)', node:d}));
  if (declaration?.type === 'FunctionDeclaration' || declaration?.type === 'ClassDeclaration') return [{binding:declaration.id?.name ?? 'default', node:declaration}];
  return [{binding:'(top-level)', node:statement}];
}

// Scan one source file. Returns the class tokens it holds (with their top-level
// binding), the tokens withheld as metadata/registry data, its module specifiers
// (for reachability) and which metadata keys it reads.
export function scanClassTokens(file, text) {
  const tokens = [], excluded = [], imports = [], reads = new Set();
  let nonLiteralImport = false;
  if (file.endsWith('.css')) {
    const ast = postcss.parse(text, {from:file});
    ast.walkRules(rule => {
      for (const token of selectorClasses(rule.selector)) tokens.push({token, binding:'css:' + rule.selector.replace(/\s+/g, ' ').slice(0, 120)});
    });
    ast.walkAtRules('import', rule => { const spec = rule.params.match(/^(?:url\()?\s*["']([^"']+)["']/)?.[1]; if (spec) imports.push({specifier:spec, kind:'css-import'}); });
    return {tokens, excluded, imports, reads, nonLiteralImport};
  }
  const program = parseAst(text, {lang:file.endsWith('.jsx') ? 'jsx' : 'js'}, file);
  const skipKeys = new Set(['type', 'start', 'end', 'range', 'loc']);
  const visit = (node, unit, withheld) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) visit(child, unit, withheld); return; }
    switch (node.type) {
      case 'ImportDeclaration': case 'ExportAllDeclaration':
        imports.push({specifier:node.source.value, kind:'static'}); return;
      case 'ExportNamedDeclaration':
        if (node.source) { imports.push({specifier:node.source.value, kind:'static'}); return; }
        break;
      case 'ImportExpression': {
        const spec = literalSpecifier(node.source);
        if (spec === null) nonLiteralImport = true; else imports.push({specifier:spec, kind:'dynamic'});
        visit(node.options, unit, withheld);
        return;
      }
      case 'NewExpression':
        // new URL('./worker.mjs', import.meta.url): Vite bundles the referenced module.
        if (node.callee.type === 'Identifier' && node.callee.name === 'URL' && node.arguments[1]?.type === 'MemberExpression'
          && node.arguments[1].object.type === 'MetaProperty' && memberName(node.arguments[1]) === 'url') {
          const spec = literalSpecifier(node.arguments[0]);
          if (spec !== null) { imports.push({specifier:spec, kind:'url'}); visit(node.arguments.slice(1), unit, withheld); return; }
        }
        break;
      case 'MemberExpression': {
        const name = memberName(node);
        if (name) reads.add(name);
        if (node.object.type === 'MetaProperty' && name === 'glob') nonLiteralImport = true; // import.meta.glob: pattern imports
        break;
      }
      case 'ObjectPattern':
        for (const property of node.properties) { const name = propertyName(property); if (name) reads.add(name); }
        break;
      case 'Literal':
        if (typeof node.value === 'string') for (const token of splitTokens(node.value)) (withheld ? excluded : tokens).push({token, binding:unit, ...withheld});
        return;
      case 'TemplateElement':
        for (const token of splitTokens(node.value.cooked ?? node.value.raw)) (withheld ? excluded : tokens).push({token, binding:unit, ...withheld});
        return;
      case 'ObjectExpression': {
        const keys = new Set(node.properties.map(propertyName).filter(Boolean));
        const record = TOKEN_RECORD.keys.every(k => keys.has(k));
        const registry = MERGE_REGISTRY.keys.every(k => keys.has(k));
        if (record || registry) {
          for (const property of node.properties) {
            if (property.type !== 'Property') { visit(property, unit, withheld); continue; }
            const name = propertyName(property);
            const rule = record && TOKEN_RECORD.keys.includes(name) ? {key:name, reason:TOKEN_RECORD.reason}
              : registry && MERGE_REGISTRY.excluded.includes(name) ? {key:name, reason:MERGE_REGISTRY.reason} : null;
            visit(property.key, unit, withheld);
            visit(property.value, unit, rule ?? withheld);
          }
          return;
        }
        break;
      }
    }
    for (const key in node) if (!skipKeys.has(key)) { const value = node[key]; if (value && typeof value === 'object') visit(value, unit, withheld); }
  };
  for (const statement of program.body) for (const {binding, node} of topLevelUnits(statement)) visit(node, binding, null);
  return {tokens, excluded, imports, reads, nonLiteralImport};
}

// Index every source: token -> file -> bindings. Withheld tokens are grouped per
// file/binding/key/reason. The __name exclusion is void (and reported) if any
// source reads that key, since its values could then reach a className. cssVar
// values are var() expressions consumed as style values, never class tokens.
export function buildClassIndex(sources) {
  const scans = sources.map(source => ({file:source.file, ...scanClassTokens(source.file, source.text)}));
  const reads = new Set(scans.flatMap(scan => [...scan.reads]));
  const voided = TOKEN_RECORD.keys.filter(key => key === '__name' && reads.has(key));
  const index = new Map(), groups = new Map(), warnings = [];
  const add = (token, file, binding) => {
    if (!index.has(token)) index.set(token, new Map());
    const files = index.get(token);
    if (!files.has(file)) files.set(file, new Set());
    files.get(file).add(binding);
  };
  for (const scan of scans) {
    for (const hit of scan.tokens) add(hit.token, scan.file, hit.binding);
    for (const hit of scan.excluded) {
      if (voided.includes(hit.key)) { add(hit.token, scan.file, hit.binding); continue; }
      const id = [scan.file, hit.binding, hit.key, hit.reason].join('\0');
      if (!groups.has(id)) groups.set(id, {file:scan.file, binding:hit.binding, key:hit.key, reason:hit.reason, tokens:new Set()});
      groups.get(id).tokens.add(hit.token);
    }
  }
  for (const key of voided) warnings.push(`Metadata key ${key} is read by a source module; its values were indexed as class references.`);
  return {index, exclusions:[...groups.values()], warnings, scans};
}

const RESOLVE_SUFFIXES = ['', '.js', '.jsx', '.mjs', '.json', '/index.js', '/index.jsx', '/index.mjs'];
async function resolveModule(from, specifier) {
  const bare = specifier.replace(/[?#].*$/, '');
  if (!bare.startsWith('.') && !bare.startsWith('/')) return null; // package or virtual module
  const base = bare.startsWith('/') ? path.join(root, bare) : path.resolve(path.dirname(from), bare);
  for (const suffix of RESOLVE_SUFFIXES) {
    const candidate = base + suffix;
    if ((await fs.stat(candidate).catch(() => null))?.isFile()) return candidate;
  }
  return null;
}

// Modules Vite would bundle from index.html: static/dynamic imports, CSS imports
// and new URL(..., import.meta.url) assets/workers. Any non-literal dynamic import
// makes the graph incomplete, and then every module counts as reachable.
export async function moduleReachability(scans) {
  const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  const entries = [...html.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);
  const scanned = new Map(scans.map(scan => [path.join(root, scan.file), scan]));
  const seen = new Set(), queue = [];
  for (const entry of entries) { const file = await resolveModule(path.join(root, 'index.html'), entry); if (file) queue.push(file); }
  let complete = true;
  const warnings = [];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file) || file.includes(`${path.sep}node_modules${path.sep}`)) continue;
    seen.add(file);
    let scan = scanned.get(file);
    // Modules outside src (electron/, public/) are only followed for their imports; one that does
    // not parse leaves the graph incomplete instead of failing preparation.
    if (!scan && /\.(?:js|jsx|mjs|css)$/.test(file)) {
      try { scan = scanClassTokens(file, await fs.readFile(file, 'utf8')); }
      catch (error) { complete = false; warnings.push(`Reachability: ${path.relative(root, file)} did not parse (${error.message.split('\n')[0]}).`); continue; }
    }
    if (!scan) continue;
    if (scan.nonLiteralImport) complete = false;
    for (const {specifier} of scan.imports) { const target = await resolveModule(file, specifier); if (target && !seen.has(target)) queue.push(target); }
  }
  const reachable = new Set([...seen].map(file => path.relative(root, file).split(path.sep).join('/')));
  return {entries, complete, reachable, warnings};
}

// generated/<area>/ -> the extract-*.mjs that writes it, and the reference version
// recorded by its manifest/provenance (per output when present).
async function generatedOwners() {
  const owners = new Map();
  for (const name of (await fs.readdir(path.join(root, 'scripts'))).filter(n => /^extract-.+\.mjs$/.test(n)).sort()) {
    const text = await fs.readFile(path.join(root, 'scripts', name), 'utf8');
    for (const m of text.matchAll(/src\/generated\/([\w.-]+)['"`]/g)) {
      if (!owners.has(m[1])) owners.set(m[1], {generator:'scripts/' + name, versions:[...new Set([...text.matchAll(/reference\/(?:current|installed)-(\d+(?:\.\d+)+)/g)].map(v => v[1]))]});
    }
  }
  const records = new Map();
  for (const [area, owner] of owners) {
    let top = null; const files = new Map();
    for (const record of ['manifest.json', 'provenance.json']) {
      const data = JSON.parse(await fs.readFile(path.join(root, 'src/generated', area, record), 'utf8').catch(() => 'null'));
      if (!data) continue;
      top ??= data.referenceVersion ?? data.version ?? null;
      for (const list of Array.isArray(data) ? [data] : [data.modules, data.adapters, data.outputs].filter(Array.isArray)) {
        for (const entry of list) {
          const version = entry.referenceVersion ?? entry.version ?? null;
          for (const name of [entry.target, entry.name, entry.output, entry.file].filter(n => typeof n === 'string')) if (version) files.set(name, version);
        }
      }
    }
    records.set(area, {generator:owner.generator, version:top ?? (owner.versions.length === 1 ? owner.versions[0] : null), files});
  }
  return records;
}

const BASELINES = [
  ['2.42304.0', 'installed-2.42304.0-20261017', 'c6a992d55-sXiDGMFQ.css'],
  ['2.37337.1', 'installed-2.37337.1-20261015', 'c6a992d55-CNGsCU46.css'],
];

// dryRun computes the manifest without writing or comparing the published files (a scanner change can be measured
// before the gate regenerates them, R10).
export async function prepareStyleCompatibility({check = false, dryRun = false} = {}) {
  // Prior snapshots, newest first: an absent utility is retained from the newest one that still ships it, so modules
  // generated from 2.42304.0 keep that version's rules after the pin moved past it, and older ones fall back further.
  const baselines = [];
  for (const [version, snapshot, file] of BASELINES) {
    const text = await fs.readFile(path.join(root, '../reference', snapshot, 'ion-dist/assets/v1', file), 'utf8');
    baselines.push({version, source:snapshot + '/ion-dist/assets/v1/' + file, text, ast:postcss.parse(text)});
  }
  const currentClasses = new Set(), currentVariables = new Set(), stylesheets = [];
  for (const file of designStylesheets) {
    const text = await fs.readFile(path.join(root, '../reference', designSnapshot, 'ion-dist/assets/v1', file), 'utf8');
    const ast = postcss.parse(text);
    ast.walkRules(rule => selectorClasses(rule.selector).forEach(c => currentClasses.add(c)));
    ast.walkDecls(d => { if (d.prop.startsWith('--')) currentVariables.add(d.prop); });
    stylesheets.push({file, sha256: sha(text)});
  }
  const sources = [];
  for (const file of (await fs.readdir(path.join(root, 'src'), {recursive:true})).map(f => f.split(path.sep).join('/')).sort()) {
    if (!SOURCE_FILE.test(file)) continue;
    sources.push({file: 'src/' + file, text: await fs.readFile(path.join(root, 'src', file), 'utf8')});
  }
  const {index, exclusions, warnings, scans} = buildClassIndex(sources);
  const reach = await moduleReachability(scans);
  const owners = await generatedOwners();
  const origin = file => {
    const area = file.match(/^src\/generated\/([^/]+)\/(.+)$/);
    if (!area) return {generator:'host', sourceVersion:null};
    const owner = owners.get(area[1]);
    return {generator:owner?.generator ?? null, sourceVersion:owner ? owner.files.get(area[2]) ?? owner.version : null};
  };
  const hitsOf = name => [...(index.get(name) ?? new Map())].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .flatMap(([file, bindings]) => [...bindings].sort().map(binding => ({file, binding, ...origin(file), reachable:!reach.complete ? true : reach.reachable.has(file)})));
  const utilities = [];
  for (const baseline of baselines) baseline.ast.walkRules(rule => {
    const parents=[];
    for(let parent=rule.parent;parent&&parent.type!=='root';parent=parent.parent)parents.unshift(parent);
    if(!parents.some(p=>p.type==='atrule'&&p.name==='layer'&&p.params==='utilities'))return;
    // Nested rule bodies are already retained in their owning utility.
    if(parents.some(p=>p.type==='rule'))return;
    utilities.push({rule, parents, baseline});
  });
  const absent = new Set(utilities.flatMap(({rule}) => selectorClasses(rule.selector).filter(name => !currentClasses.has(name))));
  const retained = [], fragments = [];
  // Class names a newer baseline already retained: an older baseline's rules for them are not merged in.
  const covered = new Set();
  for (const baseline of baselines) {
    const taken = new Set();
    for (const {rule, parents} of utilities.filter(u => u.baseline === baseline)) {
      const references=selectorClasses(rule.selector).filter(name=>!currentClasses.has(name)&&!covered.has(name))
        .map(name=>({className:name,hits:hitsOf(name)})).filter(ref=>ref.hits.length);
      // The references it records stay all referenced absent classes of the selector.
      if(!retainsRule(rule.selector,references.map(ref=>ref.className)))continue;
      const text=baseline.text, start=rule.source.start.offset,end=rule.source.end.offset;
      const raw=text.slice(start,end);
      let fragment=raw;
      const wrappers=parents.filter(p=>p.type==='atrule'&&!(p.name==='layer'&&p.params==='utilities'));
      for(const parent of wrappers.toReversed()){
        const from=parent.source.start.offset;
        const header=text.slice(from,text.indexOf('{',from)+1);
        fragment=header+fragment+'}';
      }
      fragments.push(fragment);
      references.forEach(ref => taken.add(ref.className));
      retained.push({selector:rule.selector,references,baseline:baseline.source,start,end,sha256:sha(raw),
        contexts:wrappers.map(p=>({name:p.name,params:p.params})),fragmentSha256:sha(fragment)});
    }
    taken.forEach(name => covered.add(name));
  }
  const tokens = [];
  const missing = baselines.flatMap(baseline => {
    const theme = baseline.ast.nodes.find(n => n.type === 'atrule' && n.name === 'layer' && n.params === 'theme');
    const globalTheme = theme?.nodes.find(n => n.type === 'rule' && n.selector === ':root,:host');
    return (globalTheme?.nodes.filter(n => n.type === 'decl' && n.prop.startsWith('--') && !currentVariables.has(n.prop)) ?? []).map(decl => ({decl, baseline}));
  });
  let references = sources.map(s => s.text).join('\n') + fragments.join('\n');
  for (let changed = true; changed;) {
    changed = false;
    for (const {decl, baseline} of missing) {
      if (tokens.some(t => t.property === decl.prop) || !references.includes(decl.prop)) continue;
      const text = baseline.text.slice(decl.source.start.offset, decl.source.end.offset);
      tokens.push({property:decl.prop, value:decl.value, baseline:baseline.source, text, sha256:sha(text)});
      references += '\n' + decl.value;
      changed = true;
    }
  }
  const css = '/* Original prior-snapshot utilities for modules still awaiting migration; generated, not current-version parity. */\n'
    + (tokens.length ? '@layer theme{:root,:host{' + tokens.map(t => t.text.endsWith(';') ? t.text : t.text + ';').join('') + '}}\n' : '')
    + '@layer utilities{\n' + fragments.join('\n') + '\n}\n';
  postcss.parse(css); // Fail preparation on malformed source slices, before emitting assets.
  const byPosition = (a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : a.binding < b.binding ? -1 : a.binding > b.binding ? 1 : a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  const manifest = {
    currentVersion:designVersion,
    baselines:baselines.map(({version, source, text}) => ({version, source, sha256:sha(text)})),
    currentStylesheets:stylesheets, output:'assets/legacy-utilities.css', outputSha256:sha(css),
    note:'Only absent utilities whose exact class token is still named by a src string literal, template fragment or CSS selector, plus their missing theme tokens. Hits list the owning file/binding, its generator and source version; reachable is informational (rules are never dropped for it). Remove as owning modules migrate.',
    scanner:{
      mode:'class-token',
      sources:'src/**/*.{js,jsx,mjs,css}',
      parser:'rolldown/parseAst (ESTree) for scripts; postcss rule selectors for stylesheets',
      tokens:'string Literal values and TemplateLiteral quasis (cooked), split on whitespace; CSS selector classes. Comments are not tokens.',
      retention:'a rule is retained only when a referenced absent class is in its subject: the leading compound of each selector in its list, outside functional pseudo-class arguments (a selector led by :is()/:where() takes its argument\'s subject). Classes elsewhere in the selector are recorded as references but never retain it alone.',
      exclusionRules:[
        {reason:TOKEN_RECORD.reason, object:'has keys ' + TOKEN_RECORD.keys.join(' + '), excludedKeys:TOKEN_RECORD.keys},
        {reason:MERGE_REGISTRY.reason, object:'has keys ' + MERGE_REGISTRY.keys.join(' + '), excludedKeys:MERGE_REGISTRY.excluded},
      ],
      exclusions:exclusions.map(group => ({file:group.file, binding:group.binding, key:group.key, reason:group.reason,
        tokens:group.tokens.size, suppressed:[...group.tokens].filter(token => absent.has(token)).sort()})).sort(byPosition),
      warnings:[...warnings, ...reach.warnings],
      // No source counts here: they change with every added file, while hits change only with references.
      reachability:{entries:reach.entries.map(entry => 'index.html ' + entry), complete:reach.complete,
        note:'Per-hit reachable flag only; a rule held solely by unreachable modules is still retained.'},
    },
    rules:retained, tokens,
  };
  if (dryRun) return manifest;
  for (const [file, text] of [['assets/legacy-utilities.css',css], ['style-compatibility.json',JSON.stringify(manifest,null,2)+'\n']]) {
    const dest = path.join(root, 'public', file);
    if (check) { if (await fs.readFile(dest, 'utf8') !== text) throw Error('Style compatibility mismatch: ' + file); }
    else { await fs.mkdir(path.dirname(dest), {recursive:true}); await fs.writeFile(dest,text); }
  }
  console.log(`${check?'Verified':'Prepared'} ${retained.length} prior-source utility rules and ${tokens.length} theme tokens.`);
  return manifest;
}

// `node scripts/prepare-style-compatibility.mjs [--check]`: regenerate (gate only, R10) or verify the published files.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.dirname, 'prepare-style-compatibility.mjs')) {
  await prepareStyleCompatibility({check:process.argv.includes('--check')});
}
