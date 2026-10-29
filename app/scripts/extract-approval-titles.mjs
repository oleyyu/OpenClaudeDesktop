// Extract the 3.6556.2 originals of the approval card's tool title builders (3.6556.2 migration, wave 10,
// w10-trans-approval-titles-gen; research/w10-trans.md CI-20). Nothing here executes desktop runtime code.
//
//   cc32965c2 cd(intl, spec, args, ctx)  the title of an approval card for one of the desktop's own MCP tools: switches on
//                  spec.server (`ccd_session_mgmt` ru, `ccd_pr` su, `ccd_host` _u, `ccd_connectors` yu, `ccd_sidebar` xu,
//                  `ccd_session` Vu, `ccd_settings` Ku, `terminal` nd, `scheduled-tasks` sd); a builder that rejects the
//                  arguments' shape returns null and the generic Ul (action + "What Claude sent" rows) answers instead.
//                  ctx is what the card passes: {targets, consentStamped, archivedWithTarget, toolName, description,
//                  decisionReason, awayFromSession, connectors}.
//   cc32965c2 ld / ud  the tool name → {server, kind, sessionRefs?} table and its lookup (the card only calls cd for a
//                  name ud knows).
//   The message tables (`G({...})` = vendor-intl defineMessages) the builders format go to messages.mjs under semantic
//   names; every other binding cd reaches is copied as the original top-level declaration, the chunk's own ones into
//   tool-titles.mjs and the ones it imports into a module named after their chunk (one per chunk, exporting the original
//   local names). Builders format through the intl object they are given (`e.formatMessage`), so the host's useIntl /
//   t() adapter decides the language.
//
// Boundaries (all checked): vendor-frame is only reached for the jsx runtime (official-3.6556.2.mjs reactAliases, R3);
// rolldown-runtime only for commonJS/toESM, from the view-tabs copy of that very file (E36, publicNames checked);
// shared-frame only for CdsIcon, which shared-8 zG (the permission mode descriptor ru's setSessionPermissionMode title
// reads `.label` from) puts in the `icon` element it builds. The titles only read the label, and this output must stay
// importable by plain node (approval-card-model.mjs is a plain model, E42), so that one import is emitted as a React.lazy
// reference to the same view-tabs export instead of a static import: the element is identical when rendered, and the
// view-tabs graph is only loaded if it ever is. Any other React export, React Compiler helper, shared-frame binding,
// dynamic import, class, or unknown global stops the generator: the titles are pure functions.
//
// D0: own generator, own output folder (src/generated/approval-titles), own scripts/verify-gen-approval-titles.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot } = official;
const source = official.ionSource;
const output = path.join(root, 'src/generated/approval-titles');
const viewTabsDir = path.join(root, 'src/generated/view-tabs');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const loose = official.looseFeature;

const rootChunk = 'cc32965c2-BQu1bA_w.js';
const intlChunk = 'vendor-intl-DYfox5Co.js';
const rolldownRuntime = 'rolldown-runtime-C3OYiQ02.js';
// Roots of tool-titles.mjs: original local -> exported name. cd and its helpers are private to cc32965c2.
const roots = {
  cd: 'approvalToolTitle',
  ld: 'approvalToolSpecs',
  ud: 'approvalToolSpec',
  ru: 'sessionMgmtApprovalTitle',
  su: 'pullRequestApprovalTitle',
  _u: 'hostApprovalTitle',
  yu: 'connectorsApprovalTitle',
  xu: 'sidebarApprovalTitle',
  Vu: 'sessionApprovalTitle',
  Ku: 'settingsApprovalTitle',
  nd: 'terminalApprovalTitle',
  sd: 'scheduledTaskApprovalTitle',
  Ul: 'fallbackApprovalTitle',
  Al: 'argsMatchShape',
  Fl: 'quotedName',
  jl: 'singleLineText',
  Nl: 'plainIdentifier',
};
const servers = ['ccd_session_mgmt', 'ccd_pr', 'ccd_host', 'ccd_connectors', 'ccd_sidebar', 'ccd_session', 'ccd_settings', 'terminal', 'scheduled-tasks'];
// Features (R2: literals or looseFeature patterns) checked on the declaration of each listed cc32965c2 binding.
const features = {
  cd: [...servers.map(s => `case ${JSON.stringify(s)}:`), loose('return i ?? Ul(e, t, n, r.toolName)')],
  ld: ['mcp__ccd_session_mgmt__set_session_title', 'mcp__terminal__run_in_terminal: { server: "terminal", kind: "runInTerminal" }', 'mcp__ccd_host__reveal_path: { server: "ccd_host", kind: "revealPath" }',
    '"mcp__scheduled-tasks__create_scheduled_task"', 'sessionRefs: "session_ids"'],
  ud: [loose('return Object.hasOwn(ld, e) ? ld[e] : void 0')],
  ru: ['case "archiveSession":', 'case "setSessionTitle":'],
  su: ['case "prSetMonitor":'],
  _u: ['case "openInEditor":', 'case "revealPath":'],
  yu: ['case "setConnectorEnabled":'],
  xu: ['n.session_titles'],
  Vu: [loose('if (t.kind === "moveToCloud") return Pu(e, n, r)')],
  Ku: ['t.kind !== "setSetting"', 'consentStamped'],
  nd: ['t.kind === "listTerminalTabs"', 't.kind === "runInTerminal"', '/[\\r\\n\\u0085\\u2028\\u2029]/u', 'cwd_outside_session',
    'detailReadGate', 'ownProse'],
  sd: ['cronExpression'],
  Ul: ['clickOnly: !0', 'fallback: !0', 'rowsReadGate', 't.server === "terminal"'],
  Al: [loose('Object.entries(e).every(([e, r]) =>'), 'consentStamped === !0'],
  Fl: [loose('e.formatMessage(Rl.quoted, { name: "" })')],
  jl: ['singleLine: !0', '.replace(/\\s+/g, " ")'],
  Nl: ['/^[\\w.:-]{1,200}$/'],
};
// messages.mjs: each defineMessages table cd reaches, found by one message (key and id, R2) it holds, under a semantic name.
const messageTables = [
  { name: 'toolActionMessages', key: 'archiveSession', id: 'dklkYoafh2' },             // bl: "archive a session" … per kind (Ul's action)
  { name: 'scheduledTaskActionMessages', key: 'createScheduledTask', id: '9ckP1sG81B' },    // xl: the scheduled-task wording of bl's routine kinds
  { name: 'approvalValueMessages', key: 'quoted', id: 'zqhoP4dVL1' },          // Rl: “{name}”, yes/no/none, "In {folder}"
  { name: 'approvalRowLabels', key: 'url', id: 'bWjdfaXOzU' },              // zl: Ul's row labels (URL, Session, Folder …)
  { name: 'archiveConsequenceMessages', key: 'archiveSelfConsequence', id: 'uQTqr9lpJc' },     // ol
  { name: 'sessionMgmtTitleMessages', key: 'archiveSelf', id: 'y+zYomVeNf' },       // Q: ccd_session_mgmt titles
  { name: 'pullRequestTitleMessages', key: 'fixOn', id: '1+NkIl48Pc' },       // iu: ccd_pr
  { name: 'hostTitleMessages', key: 'open', id: 'Wf3CfBI1fe' },              // cu: ccd_host (open / reveal / keep awake / worktrees)
  { name: 'connectorTitleMessages', key: 'on', id: 'tLwn9A/xeT' },         // vu: ccd_connectors
  { name: 'sidebarTitleMessages', key: 'pinTitle', id: '+O33CWUgVt' },           // bu: ccd_sidebar (pinTitle)
  { name: 'sessionTitleMessages', key: 'start', id: 'Ei5EslCbgL' },           // Su: ccd_session start / hand off
  { name: 'moveToCloudMessages', key: 'push', id: 'Hr1ga5cpXZ' },            // Cu: ccd_session move_to_cloud
  { name: 'settingsTitleMessages', key: 'change', id: '9irG5Hm1hU' },          // Hu: ccd_settings
  { name: 'terminalTitleMessages', key: 'run', id: 'HL7kBz9ncy' },          // Ju: terminal
  { name: 'terminalRuleMessages', key: 'own_shell_rule', id: '8mJRXSL8Q0' },           // Yu: terminal reason lines per consequence
  { name: 'routineTitleMessages', key: 'create', id: 'RNj8X+QKww' },           // rd: scheduled-tasks as routines
  { name: 'scheduledTaskTitleMessages', key: 'create', id: 'pz0aPh3TBK' },     // id: scheduled-tasks as scheduled tasks
];
// The pinTitle message the sidebar table must hold verbatim (root identity of messages.mjs).
const pinTitle = '"Allow Claude to <b>pin</b> <glued>{session}?</glued>"';
// vendor-frame exports the titles may use (anything else, hooks included, is an error).
const reactAllowed = new Set(['Ha', 'Ua', 'Va']);
// shared-frame: the one allowed import, emitted as a lazy reference (see the header).
const lazyViewTabs = { od: 'CdsIcon' };
const globalsAllowed = new Set(['Object', 'Array', 'String', 'Number', 'Boolean', 'RegExp', 'Set', 'Map', 'WeakMap', 'WeakSet',
  'JSON', 'Math', 'Symbol', 'Date', 'Error', 'TypeError', 'RangeError', 'Intl', 'Infinity', 'NaN', 'undefined', 'parseInt',
  'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'globalThis', 'Promise',
  // c0958e5bf (cronstrue's UMD wrapper) probes `typeof define == "function" && define.amd`, warns on console and reads
  // a function's own `arguments`.
  'define', 'console', 'arguments',
  // shared-0 oi times a callback only when `typeof performance` is defined; shared-0 DC reads the managed config off
  // `window` behind `typeof window > "u"` (null in plain node and in the host, which sets no desktopManagedConfig).
  'performance', 'window']);

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, text: bytes.toString(), code, program, exported };
  cache.set(name, record);
  return record;
}
const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const declarationDeps = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
function assertFeatures(label, text, list = []) {
  const missing = list.filter(f => (f instanceof RegExp ? !f.test(text) : !text.includes(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => (f instanceof RegExp ? f.source : JSON.stringify(f))).join(', ')}`);
}
const moduleOf = file => (file === rootChunk ? null : file.replace(/\.js$/, '.mjs'));
// Bindings another generated graph holds and exports (D1, w13-close-gen-dedup w12-carry-01): chunk -> { area, target }.
// shared-156's display-safety helpers (OX / kX / AX … VX / qX) are code-routines' one copy; its module imports only
// routines-shared's shared-0, so these titles stay importable by plain node (E42). DX (and fb / db) code-routines does not
// hold stay here. Each binding is imported under the name the module exports it as; the module must match its manifest.
// shared-0's Pa (lazyInit), jL / ML and the Vy / Hy / Ky / ib … hb helpers are routines-shared's one copy (w13-close-gen-dedup
// review 1): that module has no import at all (plain node loads it), and code-routines' shared-156 already reads it, so
// this graph loaded it besides its own copy. The shared-0 bindings routines-shared does not slice stay here.
const linkedChunks = {
  'shared-156-BLTosN8U.js': { area: 'code-routines', target: 'shared-156-BLTosN8U.mjs' },
  'shared-0-DDOOdL6P.js': { area: 'routines-shared', target: 'shared-0-DDOOdL6P.mjs' },
};
async function linkedHeld() {
  const held = new Map();
  for (const [chunk, { area, target }] of Object.entries(linkedChunks)) {
    const dir = path.join(root, 'src/generated', area);
    const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
    const mod = manifest.modules.find(m => m.target === target && m.source === chunk);
    if (!mod) throw Error(`linked ${area}/${target} does not hold ${chunk}`);
    const text = await fs.readFile(path.join(dir, target), 'utf8');
    if (sha(text) !== mod.sha256) throw Error(`linked ${area}/${target} differs from its manifest`);
    const exported = new Map();
    for (const m of text.matchAll(/^export \{([^}]*)\};/gm))
      for (const spec of m[1].split(',').map(x => x.trim()).filter(Boolean)) { const [local, as] = spec.split(/\s+as\s+/); exported.set(local, as ?? local); }
    for (const b of mod.bindings) if (exported.has(b.name)) held.set(`${chunk}#${b.name}`, { from: `../${area}/${target}`, name: exported.get(b.name) });
  }
  return held;
}

export async function extractApprovalTitles({ check = false } = {}) {
  const cache = new Map();
  const viewTabs = JSON.parse(await fs.readFile(path.join(viewTabsDir, 'manifest.json'), 'utf8'));
  if (viewTabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${viewTabs.referenceVersion}, expected ${referenceVersion}`);
  const published = (file, alias, local) => {
    const entry = Object.entries(viewTabs.publicNames ?? {}).find(([, v]) => v.file === file && v.export === alias);
    if (!entry || (local && entry[1].local !== local)) throw Error(`view-tabs does not publish ${file}:${alias}`);
    return entry[0];
  };
  const intl = await readSource(intlChunk, cache);
  const linked = await linkedHeld();
  // selected: file -> Map(local -> declaration path); imports: file -> Map(local -> {kind, ...}).
  const selected = new Map(), imports = new Map();
  const at = (map, file) => (map.has(file) ? map.get(file) : map.set(file, new Map()).get(file));
  const add = async (file, name) => {
    const src = await readSource(file, cache);
    const sel = at(selected, file), imp = at(imports, file);
    if (sel.has(name) || imp.has(name)) return;
    const link = linked.get(`${file}#${name}`);
    if (link) { imp.set(name, { kind: 'linked', from: link.from, name: link.name, via: `${file}#${name}` }); return; }
    const binding = src.program.scope.getBinding(name);
    if (!binding) throw Error(`${file}: unbound ${name}`);
    const p = binding.path;
    if (p.isImportSpecifier()) {
      const dep = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${dep}:${alias}`;
      if (dep === official.vendorFrame) {
        if (!reactAllowed.has(alias)) throw Error(`${file}: ${name} is React ${via} (${official.reactAliases[alias]}); the titles must stay pure`);
        const { module, member } = official.assertVendorAlias((await readSource(dep, cache)).text, alias);
        imp.set(name, { kind: 'react', from: module, name: member, via });
        return;
      }
      if (dep === official.sharedFrame) {
        if (!lazyViewTabs[alias]) throw Error(`${file}: ${name} is shared-frame ${via}; only ${Object.keys(lazyViewTabs).join(', ')} may be reached`);
        const semantic = published(dep, alias);
        if (semantic !== lazyViewTabs[alias]) throw Error(`view-tabs publishes ${via} as ${semantic}, expected ${lazyViewTabs[alias]}`);
        imp.set(name, { kind: 'lazy-view-tabs', from: `../view-tabs/${dep}`, name: semantic, via });
        return;
      }
      if (dep === rolldownRuntime) {
        const semantic = published(dep, alias);
        imp.set(name, { kind: 'view-tabs', from: `../view-tabs/${dep}`, name: semantic, via });
        return;
      }
      const depSrc = await readSource(dep, cache);
      const local = depSrc.exported.get(alias);
      if (!local) throw Error(`${file}: ${dep} does not export ${alias}`);
      const link = linked.get(`${dep}#${local}`);
      if (link) { imp.set(name, { kind: 'linked', from: link.from, name: link.name, via }); return; }
      imp.set(name, { kind: 'generated', file: dep, name: local, via });
      await add(dep, local);
      return;
    }
    if (p.isFunctionDeclaration()) {
      if (p.node.async || p.node.generator) throw Error(`${file}: ${name} is not a plain function`);
    } else if (p.isVariableDeclarator()) {
      // A destructuring declarator (shared-52 `{ execution: WE, ...GE } = HE`) is copied once for all its names.
    } else throw Error(`${file}: unsupported declaration ${name} (${p.node.type})`);
    // A top-level binding some statement outside the copied declarations assigns would lose that assignment.
    if (binding.constantViolations.some(q => q !== p && !within(p, q) && !q.getFunctionParent()))
      throw Error(`${file}: ${name} is assigned by a top-level statement`);
    p.traverse({
      ImportExpression() { throw Error(`${file}: dynamic import inside ${name}`); },
      ClassDeclaration() { throw Error(`${file}: class inside ${name}`); },
      ClassExpression() { throw Error(`${file}: class inside ${name}`); },
    });
    sel.set(name, p);
    for (const dep of declarationDeps(src, p)) await add(file, dep);
  };
  const rootSrc = await readSource(rootChunk, cache);
  for (const name of Object.keys(roots)) {
    const binding = rootSrc.program.scope.getBinding(name);
    if (!binding || binding.path.isImportSpecifier()) throw Error(`${rootChunk}: root ${name} is not a declaration`);
    assertFeatures(`${rootChunk}: root ${name}`, declarationText(rootSrc, binding.path), features[name]);
    await add(rootChunk, name);
  }
  // The root chunk's defineMessages tables (`X = G({...})` with G the vendor-intl export) form messages.mjs.
  const intlLocal = intl.exported.get('f');
  const rootImports = imports.get(rootChunk), rootSelected = selected.get(rootChunk);
  const defineMessages = [...rootImports].find(([, e]) => e.file === intlChunk && e.name === intlLocal)?.[0];
  if (!defineMessages) throw Error(`${rootChunk}: no defineMessages import from ${intlChunk}`);
  assertFeatures(`${intlChunk}: defineMessages ${intlLocal}`, declarationText(intl, intl.program.scope.getBinding(intlLocal).path),
    [loose('function tn(e) { return e; }')]);
  const tables = new Map();
  for (const [name, p] of rootSelected) {
    const init = p.isVariableDeclarator() ? p.node.init : null;
    if (init?.type === 'CallExpression' && init.callee.type === 'Identifier' && init.callee.name === defineMessages) tables.set(name, p);
  }
  const tableNames = new Map();
  for (const { name, key, id } of messageTables) {
    const entry = new RegExp(`(?<![\\w$])${key}: \\{\\s*defaultMessage:\\s*"(?:[^"\\\\]|\\\\.)*",\\s*id: ${JSON.stringify(id).replace(/[+/]/g, '\\$&')},?\\s*\\}`);
    const hits = [...tables].filter(([, p]) => entry.test(declarationText(rootSrc, p)));
    if (hits.length !== 1) throw Error(`messages.mjs: ${name} (${key}, id ${id}) matches ${hits.length} tables`);
    tableNames.set(hits[0][0], name);
  }
  const unnamed = [...tables.keys()].filter(n => !tableNames.has(n));
  if (unnamed.length) throw Error(`messages.mjs: unnamed defineMessages tables ${unnamed.join(', ')}`);
  const sidebar = [...tableNames].find(([, n]) => n === 'sidebarTitleMessages')[0];
  assertFeatures(`messages.mjs: sidebarTitleMessages`, declarationText(rootSrc, tables.get(sidebar)), [pinTitle, '"+O33CWUgVt"']);
  for (const [name, p] of tables) if (declarationDeps(rootSrc, p).some(d => d !== defineMessages)) throw Error(`messages.mjs: ${name} depends on more than defineMessages`);

  // Emit: one module per chunk; the root chunk split into messages.mjs and tool-titles.mjs.
  const targets = [];
  const targetOf = (file, name) => (file === rootChunk ? (tables.has(name) ? 'messages.mjs' : 'tool-titles.mjs') : moduleOf(file));
  for (const file of selected.keys()) {
    if (file === rootChunk) targets.push({ target: 'messages.mjs', file, names: [...tables.keys()] }, { target: 'tool-titles.mjs', file, names: [...rootSelected.keys()].filter(n => !tables.has(n)) });
    else targets.push({ target: moduleOf(file), file, names: [...selected.get(file).keys()] });
  }
  // Exports: the root modules export semantic names; chunk modules export the original locals other modules import.
  const wanted = new Map(targets.map(t => [t.target, new Set()]));
  for (const t of targets) {
    const src = cache.get(t.file);
    for (const name of t.names) for (const dep of declarationDeps(src, selected.get(t.file).get(name))) {
      const imp = imports.get(t.file).get(dep);
      if (imp?.kind === 'generated') wanted.get(moduleOf(imp.file)).add(imp.name);
      else if (selected.get(t.file).has(dep) && targetOf(t.file, dep) !== t.target) wanted.get(targetOf(t.file, dep)).add(dep);
    }
  }
  const files = {};
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-approval-titles.mjs',
    roots: Object.fromEntries(Object.entries(roots).map(([local, name]) => [name, { file: rootChunk, local }])),
    messageTables: Object.fromEntries([...tableNames].map(([local, name]) => [name, { file: rootChunk, local, id: messageTables.find(m => m.name === name).id }])),
    modules: [] };
  for (const t of targets) {
    const src = cache.get(t.file), sel = selected.get(t.file);
    const names = t.names.slice().sort((a, b) => sel.get(a).node.start - sel.get(b).node.start);
    const used = new Set(names.flatMap(n => declarationDeps(src, sel.get(n))));
    const groups = new Map(), lazies = [], records = [];
    const push = (from, spec) => (groups.has(from) ? groups.get(from) : groups.set(from, []).get(from)).push(spec);
    for (const dep of [...used].sort()) {
      const imp = imports.get(t.file).get(dep);
      if (imp) {
        if (imp.kind === 'lazy-view-tabs') { lazies.push([dep, imp]); records.push({ local: dep, from: imp.from, name: imp.name, via: imp.via, kind: imp.kind }); continue; }
        const from = imp.kind === 'generated' ? `./${moduleOf(imp.file)}` : imp.from;
        push(from, imp.name === dep ? dep : `${imp.name} as ${dep}`);
        records.push({ local: dep, from, name: imp.name, via: imp.via, kind: imp.kind });
      } else if (targetOf(t.file, dep) !== t.target) {
        const from = `./${targetOf(t.file, dep)}`;
        push(from, dep);
        records.push({ local: dep, from, name: dep, via: `${t.file}:${dep}`, kind: 'split' });
      }
    }
    if (lazies.length) push('react', 'lazy');
    const importText = [...groups].map(([from, specs]) => `import { ${[...new Set(specs)].join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const lazyText = lazies.map(([local, imp]) => `var ${local} = lazy(() => import(${JSON.stringify(imp.from)}).then((m) => ({ default: m.${imp.name} })));`).join('\n');
    const blocks = [...new Set(names.map(n => sel.get(n)))].map(p => (p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p)));
    const exportNames = t.target === 'tool-titles.mjs' ? Object.entries(roots).map(([l, n]) => [l, n])
      : t.target === 'messages.mjs' ? [...[...tableNames].map(([l, n]) => [l, n]), ...[...wanted.get(t.target)].sort().map(n => [n, n])]
        : [...wanted.get(t.target)].sort().map(n => [n, n]);
    // Root modules also export the originals other modules import under their local name.
    if (t.target === 'tool-titles.mjs') for (const n of wanted.get(t.target)) if (!roots[n]) exportNames.push([n, n]);
    const exportText = `export { ${exportNames.map(([l, n]) => (l === n ? l : `${l} as ${n}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${t.file}; generated by extract-approval-titles.mjs.\n`
      + `// Edit the extractor, never this file.${lazies.length ? '\n// CdsIcon is a React.lazy reference to the view-tabs export so this module stays importable by plain node (see the extractor).' : ''}\n`;
    const text = await format(`${header}${importText}\n${lazyText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, t.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(n => !globalsAllowed.has(n));
    if (foreign.length) throw Error(`${t.target}: unbound ${foreign.join(', ')}`);
    files[t.target] = text;
    manifest.modules.push({ target: t.target, source: t.file, sourceSha256: sha(src.bytes), sha256: sha(text),
      bindings: names.map(n => ({ name: n, sha256: sha(declarationText(src, sel.get(n))) })), imports: records,
      exports: Object.fromEntries(exportNames) });
  }
  manifest.modules.sort((a, b) => a.target.localeCompare(b.target));
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`approval titles output set changed: ${present.join(',')}. Run scripts/extract-approval-titles.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`approval titles source mismatch: ${name}. Run scripts/extract-approval-titles.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} approval title modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractApprovalTitles({ check: process.argv.includes('--check') });
