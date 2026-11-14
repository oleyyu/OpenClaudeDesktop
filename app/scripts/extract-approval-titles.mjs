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
import * as official4 from './official-4.16336.0.mjs';

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

async function extractLegacy({ check = false } = {}) {
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
// ---------------------------------------------------------------------------------------------------------------------
// 4.16336.0: the isolated graph (region-plan G6, cutover.oldConsumersAtGeneration approval-elicitation / code-editor /
// cowork-approval / sidebar-hover-card, productionSwitchNotBeforeBatch 11). The 3.6556.2 contract above writes
// src/generated/approval-titles unchanged (those consumers import it by original chunk identity); this one writes
// src/generated/approval-titles-v4 from the frozen 4.16336.0 snapshot. Same roots under the same exported names.
//
//   cc32965c2 np / rp / ip   (3.6556.2 cd / ld / ud) the title switch, the tool table (adds read_cloud_session) and its lookup.
//   cc32965c2 Jd Qd df pf hf Ff Bf Xf tp   the per-server builders (3.6556.2 ru su _u yu xu Vu Ku nd sd).
//   cc32965c2 Pd / xd / Ed / Sd / wd       fallback / argsMatchShape / quotedName / singleLineText / plainIdentifier.
// Roots: every root names its chunk export alias (all private: null, and must not be exported) and is the only
// top-level declaration of cc32965c2 carrying its features (AST, prettier form). The defineMessages tables the closure
// reaches go to messages.mjs under semantic names (found by one key + id each); an unnamed table stops generation.
//
// Links (read strictly; nothing here pins another graph's bytes, so a dependency regenerating with the same declarations
// keeps this output identical):
//   cds-core (sharedGraph): manifest version / snapshot, module bytes, sourceSha256; a publicName is imported (its raw
//     declaration sha256 must equal cds-core's); a binding cds-core holds without a publicName is re-cut only when pure and
//     hash-equal (heldByCdsCore); module state it holds without a name is collected as a stateConflict (D46) and stops
//     generation before anything is written. shared-frame Bs (CdsIcon, the permission mode descriptor's icon) is the
//     publicName CdsIcon (cds-core is importable by plain node, so the 3.6556.2 React.lazy detour is not needed).
//   linkedAreas: routines-shared-v4 (dependency region, staged 4.16336.0) and r3b-tasks (4.16336.0 production, the D1
//     owner of shared-0 Tl lazyValue). Their manifests are checked (version, snapshot, sharedGraph cds-core, module bytes,
//     source chunk hashes). `links` names what is imported from them: whole-chunk links import every binding the area's
//     module holds and exports (only modules plain node loads: shared-0, c0958e5bf cronstrue, shared-4), binding links
//     import one binding. Any other binding a linked area holds: module state stops generation (D1, one copy across
//     graphs); a pure one is re-cut only when its declaration hash equals the area's (heldByLinked). Plain node loads this
//     graph once nothing is pending (approval-card-model.mjs is a plain model, E42), so the routines-shared-v4 modules
//     that import src/source-routines-shared-adapters.jsx are never linked for pure bindings.
//   D1 pending: shared-62 kI (missing-translation report Set, written by AI) and OF (grapheme width override Map) are
//     module state routines-shared-v4 holds; cds-core wave 5 publishes both (wave5-candidates; its first apply was rolled
//     back, cds-core is e14252ee again). Until then they are linked from routines-shared-v4 (`d1Pending`): that shared-62
//     module imports src/source-routines-shared-adapters.jsx, so meanwhile this graph loads under vite / the bundler,
//     not plain node. Once cds-core publishes them the publicName wins (the link is superseded, not an error) and a
//     rerun of this generator makes the graph plain again.
// code-routines (the other dependency region) has no 4.16336.0 graph (region batch 3: its generation stops on D46 before
// writing): the shared-183 display-safety helpers its 3.6556.2 shared-156 lent are cut here (pure, no module state);
// when src/generated/code-routines-v4 exists, add it to linkedAreas / links and rerun.
const contract4 = (() => {
  const official = official4, loose = official.looseFeature;
  const servers4 = ['ccd_session_mgmt', 'ccd_pr', 'ccd_host', 'ccd_connectors', 'ccd_sidebar', 'ccd_session', 'ccd_settings', 'terminal', 'scheduled-tasks'];
  return {
    official, output: path.join(root, 'src/generated/approval-titles-v4'), label: 'approval titles 4.16336.0',
    rootChunk: 'cc32965c2-CpdpcYvh.js', intlChunk: official.vendorIntl, defineMessagesAlias: 'f',
    sharedGraph: 'cds-core',
    isolatedGraph: { productionOutput: 'src/generated/approval-titles', productionSwitchNotBeforeBatch: 11,
      heldBy: ['approval-elicitation', 'code-editor', 'cowork-approval', 'sidebar-hover-card', 'src/approval-card-model.mjs', 'src/source-approval-card.jsx'] },
    roots: {
      np: 'approvalToolTitle', rp: 'approvalToolSpecs', ip: 'approvalToolSpec', Jd: 'sessionMgmtApprovalTitle', Qd: 'pullRequestApprovalTitle',
      df: 'hostApprovalTitle', pf: 'connectorsApprovalTitle', hf: 'sidebarApprovalTitle', Ff: 'sessionApprovalTitle', Bf: 'settingsApprovalTitle',
      Xf: 'terminalApprovalTitle', tp: 'scheduledTaskApprovalTitle', Pd: 'fallbackApprovalTitle', xd: 'argsMatchShape', Ed: 'quotedName',
      Sd: 'singleLineText', wd: 'plainIdentifier',
    },
    features: {
      np: [...servers4.map(s => `case ${JSON.stringify(s)}:`), loose('return i ?? Pd(e, t, n, r.toolName)', { keep: ['Pd'] })],
      rp: ['mcp__ccd_session_mgmt__set_session_title', 'mcp__ccd_session_mgmt__read_cloud_session', 'mcp__terminal__run_in_terminal: { server: "terminal", kind: "runInTerminal" }',
        'mcp__ccd_host__reveal_path: { server: "ccd_host", kind: "revealPath" }', '"mcp__scheduled-tasks__create_scheduled_task"', 'sessionRefs: "session_ids"'],
      ip: [loose('return Object.hasOwn(rp, e) ? rp[e] : void 0', { keep: ['rp'] })],
      Jd: ['case "archiveSession":', 'case "setSessionTitle":', 'case "readCloudSession":'],
      Qd: ['case "prSetMonitor":', 'auto_fix'],
      df: ['case "openInEditor":', 'case "revealPath":', 'case "requestKeepAwake":'],
      pf: ['case "setConnectorEnabled":', 'connector_id'],
      hf: ['n.session_titles'],
      Ff: [loose('if (t.kind === "moveToCloud") return Of(e, n, r)', { keep: ['Of'] }), 't.kind === "handOffToSession"'],
      Bf: ['t.kind !== "setSetting"', 'consentStamped'],
      Xf: ['t.kind === "listTerminalTabs"', 't.kind === "runInTerminal"', '/[\\r\\n\\u0085\\u2028\\u2029]/u', 'cwd_outside_session',
        'detailReadGate', 'ownProse'],
      tp: ['cronExpression', 'notifyOnCompletion'],
      Pd: ['clickOnly: !0', 'fallback: !0', 'rowsReadGate', 't.server === "terminal"'],
      xd: [loose('Object.entries(e).every(([e, r]) =>'), 'consentStamped === !0'],
      Ed: [loose('e.formatMessage(kd.quoted, { name: "" })', { keep: ['kd'] })],
      Sd: ['singleLine: !0', '.replace(/\\s+/g, " ")'],
      wd: ['/^[\\w.:-]{1,200}$/'],
    },
    // The same 17 tables as 3.6556.2 under the same names, each found by one key + id. 4.16336.0 re-hashed some ids with
    // the English unchanged (toolActionMessages archiveSession dklkYoafh2 -> n3eUhTbU5V, scheduledTaskActionMessages
    // createScheduledTask 9ckP1sG81B -> T1gocvuVde, sessionMgmtTitleMessages archiveSelf y+zYomVeNf -> Vr1IhXt5Sg,
    // terminalTitleMessages run HL7kBz9ncy -> t8vlt67Y4o); an unnamed table the closure reaches stops generation.
    messageTables: [
      { name: 'toolActionMessages', key: 'archiveSession', id: 'n3eUhTbU5V' },
      { name: 'scheduledTaskActionMessages', key: 'createScheduledTask', id: 'T1gocvuVde' },
      { name: 'approvalValueMessages', key: 'quoted', id: 'zqhoP4dVL1' },
      { name: 'approvalRowLabels', key: 'url', id: 'bWjdfaXOzU' },
      { name: 'archiveConsequenceMessages', key: 'archiveSelfConsequence', id: 'uQTqr9lpJc' },
      { name: 'sessionMgmtTitleMessages', key: 'archiveSelf', id: 'Vr1IhXt5Sg' },
      { name: 'pullRequestTitleMessages', key: 'fixOn', id: '1+NkIl48Pc' },
      { name: 'hostTitleMessages', key: 'open', id: 'Wf3CfBI1fe' },
      { name: 'connectorTitleMessages', key: 'on', id: 'tLwn9A/xeT' },
      { name: 'sidebarTitleMessages', key: 'pinTitle', id: '+O33CWUgVt' },
      { name: 'sessionTitleMessages', key: 'start', id: 'Ei5EslCbgL' },
      { name: 'moveToCloudMessages', key: 'push', id: 'Hr1ga5cpXZ' },
      { name: 'settingsTitleMessages', key: 'change', id: '9irG5Hm1hU' },
      { name: 'terminalTitleMessages', key: 'run', id: 't8vlt67Y4o' },
      { name: 'terminalRuleMessages', key: 'own_shell_rule', id: '8mJRXSL8Q0' },
      { name: 'routineTitleMessages', key: 'create', id: 'RNj8X+QKww' },
      { name: 'scheduledTaskTitleMessages', key: 'create', id: 'pz0aPh3TBK' },
    ],
    pinTitle,
    // vendor-frame: the jsx runtime only (any other React export, hooks included, stops generation: pure functions).
    reactAllowed: new Set(['Wa', 'Ga', 'Ka']),
    linkedAreas: ['routines-shared-v4', 'r3b-tasks'],
    links: [
      { area: 'routines-shared-v4', chunk: 'shared-0-CnnWnVrT.js' },
      { area: 'routines-shared-v4', chunk: 'c0958e5bf-BxTMNpvT.js' },
      { area: 'routines-shared-v4', chunk: 'shared-4-C_EiQb9h.js' },
      { area: 'r3b-tasks', binding: 'shared-0-CnnWnVrT.js#Tl' },
      { area: 'routines-shared-v4', binding: 'shared-62-DoCqVpIq.js#kI', d1Pending: 'cds-core wave 5 publishes it (missingTranslationListeners); rerun this generator then' },
      { area: 'routines-shared-v4', binding: 'shared-62-DoCqVpIq.js#OF', d1Pending: 'cds-core wave 5 publishes it (graphemeWidthOverrides); rerun this generator then' },
    ],
    hostGlobals: new Set([...globalsAllowed]),
  };
})();
export { contract4, extractTarget4 as extractContract4 };
export const contractVersions = Object.freeze([referenceVersion, official4.referenceVersion]);

const featureMissing = (text, list = []) => list.filter(f => (f instanceof RegExp ? !f.test(text) : !text.includes(f)));
function assertUniqueRoot(label, src, name, list = []) {
  if (!list.length) throw Error(`${label}: root ${name} has no features to locate it by`);
  const hits = Object.entries(src.program.scope.bindings)
    .filter(([, b]) => (b.path.isFunctionDeclaration() || b.path.isVariableDeclarator()) && !featureMissing(declarationText(src, b.path), list).length)
    .map(([n]) => n);
  if (hits.length !== 1 || hits[0] !== name) throw Error(`${label}: root ${name} is not the unique declaration with its features (${hits.join(', ') || 'none'})`);
}
// A top-level declaration in the unformatted chunk bytes (the text a runSlicer graph such as cds-core hashes).
function rawDeclarationText(src, name) {
  src.raw ??= new Map(parsers.babel.parse(src.text, {}).program.body.flatMap(node => (node.type === 'FunctionDeclaration' ? [[node.id.name, node]]
    : node.type === 'VariableDeclaration' ? node.declarations.flatMap(d => patternNames(d.id).map(n => [n, d])) : [])));
  const node = src.raw.get(name);
  if (!node) throw Error(`${src.name}: no top-level declaration ${name} in the chunk bytes`);
  return src.text.slice(node.start, node.end);
}
// The names a declarator's id binds (a destructuring declarator such as shared-62 `{ execution: wD, ...TD } = SD` binds several).
const patternNames = id => (id.type === 'Identifier' ? [id.name] : id.type === 'ObjectPattern' ? id.properties.flatMap(p => patternNames(p.type === 'RestElement' ? p.argument : p.value))
  : id.type === 'ArrayPattern' ? id.elements.filter(Boolean).flatMap(patternNames) : id.type === 'RestElement' ? patternNames(id.argument)
    : id.type === 'AssignmentPattern' ? patternNames(id.left) : []);
// Both hash forms of a declaration: raw chunk bytes (runSlicer graphs) and the prettier form (own generators).
const declarationShas = (src, name, p) => ({ raw: sha(rawDeclarationText(src, name)), formatted: sha(declarationText(src, p)) });
const shaMatches = (shas, recorded) => (recorded === shas.raw ? 'raw' : recorded === shas.formatted ? 'formatted' : null);
// Module state a second copy would split: a module-level WeakMap / Map / Set / WeakSet, a React context, or a module-level
// binding the chunk assigns after its declaration.
function moduleStateKind(official, src, p) {
  if (!p.isVariableDeclarator()) return null;
  for (const name of patternNames(p.node.id))
    if (src.program.scope.getBinding(name).constantViolations.some(q => q !== p)) return 'module-level binding written after its declaration';
  const init = p.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return `module ${init.callee.name}`;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.program.scope.getBinding(init.callee.name)?.path;
    if (callee?.isImportSpecifier() && callee.parent.source.value.replace(/^\.\//, '') === official.vendorFrame
      && official.reactAliases[callee.node.imported.name]?.[1] === 'createContext') return 'context (createContext)';
  }
  return null;
}
// sharedGraph 'cds-core' (as extract-approval-landing.mjs): version, snapshot, module bytes, source chunk, publicNames.
async function sharedGraph4(contract) {
  const { official } = contract, area = contract.sharedGraph, dir = path.join(root, 'src/generated', area);
  const manifestText = await fs.readFile(path.join(dir, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestText);
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  if (manifest.referenceSnapshot !== official.referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${official.referenceSnapshot}`);
  const byTarget = new Map(), held = new Map(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}, expected ${official.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
    if (!bytes || !/^[0-9a-f]{64}$/.test(m.sourceSha256 ?? '') || sha(bytes) !== m.sourceSha256)
      throw Error(`${area}/${m.target} was sliced from ${m.source} ${m.sourceSha256 ?? '(no sourceSha256)'}, which is not the source this area reads`);
    byTarget.set(m.target, m);
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = byTarget.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${area} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  return { area, held, published, manifestSha256: sha(manifestText) };
}
// The `export { a, b as c }` statements of a generated module: local -> exported name.
function moduleExports(text, label) {
  const exported = new Map();
  for (const node of babel.babelParse(text, label, true).program.body)
    if (node.type === 'ExportNamedDeclaration' && !node.source && !node.declaration)
      for (const s of node.specifiers) exported.set(s.local.name, s.exported.name ?? s.exported.value);
  return exported;
}
// A linked 4.16336.0 area: version, snapshot, shared graph, module bytes and the source chunk bytes each module was cut from.
async function linkedArea4(contract, area, cache) {
  const { official } = contract, dir = path.join(root, 'src/generated', area);
  const manifestText = await fs.readFile(path.join(dir, 'manifest.json'), 'utf8').catch(() => null);
  if (manifestText === null) throw Error(`linked area ${area} has no manifest (src/generated/${area})`);
  const manifest = JSON.parse(manifestText);
  if (manifest.referenceVersion !== official.referenceVersion || manifest.referenceSnapshot !== official.referenceSnapshot)
    throw Error(`${area} is ${manifest.referenceVersion} (${manifest.referenceSnapshot}), expected ${official.referenceVersion} (${official.referenceSnapshot})`);
  if (manifest.sharedGraph !== contract.sharedGraph) throw Error(`${area} links ${manifest.sharedGraph}, expected ${contract.sharedGraph}`);
  const held = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion) throw Error(`${area}/${m.target} is ${m.referenceVersion}`);
    const text = await fs.readFile(path.join(dir, m.target), 'utf8');
    if (sha(text) !== m.sha256) throw Error(`linked ${area}/${m.target} differs from its manifest`);
    const chunk = path.basename(m.source);
    const bytes = cache.get(chunk)?.bytes ?? await fs.readFile(path.join(official.ionSource, chunk)).catch(() => null);
    if (!bytes || sha(bytes) !== m.sourceSha256) throw Error(`linked ${area}/${m.target} was cut from other ${chunk} bytes`);
    const exported = moduleExports(text, `${area}/${m.target}`);
    for (const b of m.bindings) {
      const name = typeof b === 'string' ? b : b.name;
      held.set(`${chunk}#${name}`, { area, target: m.target, from: `../${area}/${m.target}`, name, sha256: typeof b === 'string' ? null : b.sha256, exportName: exported.get(name) ?? null });
    }
  }
  return { area, held, manifestSha256: sha(manifestText) };
}
async function readSource4(official, name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(official.ionSource, name));
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

async function extractTarget4(contract, { check = false, survey = false } = {}) {
  // A contract variant (tests: proving generation stops) runs check / survey only, so it can never write the output folder.
  if (contract !== contract4 && !check && !survey) throw Error('extract-approval-titles: a contract variant runs with check: true only');
  const { official, output, label, rootChunk, intlChunk } = contract;
  const { referenceVersion: version, referenceSnapshot: snapshot } = official;
  const cache = new Map();
  const graph = await sharedGraph4(contract);
  const areas = new Map();
  for (const area of contract.linkedAreas) areas.set(area, await linkedArea4(contract, area, cache));
  // links: chunk#name -> held entry of the named area (whole-chunk links: every binding it holds and exports there).
  const linkFor = (file, name) => {
    for (const l of contract.links) {
      if (l.binding ? l.binding !== `${file}#${name}` : l.chunk !== file) continue;
      const entry = areas.get(l.area)?.held.get(`${file}#${name}`);
      if (l.binding && (!entry || !entry.exportName)) throw Error(`link ${l.area} ${l.binding}: the area does not hold and export it`);
      if (entry?.exportName) return { ...entry, d1Pending: l.d1Pending };
    }
    return null;
  };
  const usedLinks = new Set();
  const heldElsewhere = key => [...areas.values()].map(a => a.held.get(key)).filter(Boolean);
  const stateConflicts = [], selected = new Map(), imports = new Map(), reachedBy = new Map();
  const heldByCdsCore = new Map(), heldByLinked = new Map();
  const at = (map, file) => (map.has(file) ? map.get(file) : map.set(file, new Map()).get(file));
  const push = (map, file, value) => { const list = map.has(file) ? map.get(file) : map.set(file, []).get(file); if (!list.includes(value)) list.push(value); };
  const chain = key => { const out = []; for (let k = key; k && out.length < 12; k = reachedBy.get(k)) out.push(k); return out; };
  const add = async (file, name, from) => {
    const key = `${file}#${name}`;
    const src = await readSource4(official, file, cache);
    const sel = at(selected, file), imp = at(imports, file);
    if (sel.has(name) || imp.has(name)) return;
    if (!reachedBy.has(key)) reachedBy.set(key, from);
    const binding = src.program.scope.getBinding(name);
    if (!binding) throw Error(`${file}: unbound ${name}`);
    const p = binding.path;
    if (p.isImportSpecifier()) {
      const dep = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${dep}:${alias}`;
      const depSrc = await readSource4(official, dep, cache);
      if (dep === official.vendorFrame && official.reactAliases[alias]) {
        if (!contract.reactAllowed.has(alias)) throw Error(`${file}: ${name} is React ${via} (${official.reactAliases[alias]}); the titles must stay pure`);
        const { module, member } = official.assertVendorAlias(depSrc.text, alias);
        imp.set(name, { kind: 'react', from: module, name: member, via });
        return;
      }
      const local = depSrc.exported.get(alias);
      if (!local) throw Error(`${file}: ${dep} does not export ${alias}`);
      const target = await resolve(dep, local, depSrc, key);
      if (target) { imp.set(name, { ...target, via }); return; }
      imp.set(name, { kind: 'generated', file: dep, name: local, via });
      await add(dep, local, key);
      return;
    }
    const target = await resolve(file, name, src, from);
    if (target) { imp.set(name, { ...target, via: key }); return; }
    if (p.isFunctionDeclaration()) {
      if (p.node.async || p.node.generator) throw Error(`${file}: ${name} is not a plain function`);
    } else if (!p.isVariableDeclarator()) throw Error(`${file}: unsupported declaration ${name} (${p.node.type})`);
    if (binding.constantViolations.some(q => q !== p && !within(p, q) && !q.getFunctionParent()))
      throw Error(`${file}: ${name} is assigned by a top-level statement`);
    p.traverse({
      ImportExpression() { throw Error(`${file}: dynamic import inside ${name}`); },
      ClassDeclaration() { throw Error(`${file}: class inside ${name}`); },
      ClassExpression() { throw Error(`${file}: class inside ${name}`); },
    });
    sel.set(name, p);
    for (const dep of declarationDeps(src, p)) await add(file, dep, key);
  };
  // The one place a binding is imported instead of cut: a cds-core publicName, then a link. Bindings cds-core or a
  // linked area hold otherwise are cut only when pure and hash-equal (module state: D46 / D1).
  const resolve = async (file, name, src, from) => {
    const key = `${file}#${name}`;
    const p = src.program.scope.getBinding(name)?.path;
    if (!p || p.isImportSpecifier()) return null;
    const shas = declarationShas(src, name, p);
    const shared = graph.published.get(key);
    if (shared) {
      const held = graph.held.get(key);
      if (!held?.sha256 || held.sha256 !== shas.raw) throw Error(`${key} differs from the declaration ${graph.area} publishes as ${shared.name}`);
      return { kind: 'shared-graph', from: `../${graph.area}/${shared.target}`, name: shared.exportName, original: name, linkedSha256: held.sha256 };
    }
    const link = linkFor(file, name);
    if (link) {
      const scheme = link.sha256 && shaMatches(shas, link.sha256);
      if (!scheme) throw Error(`${key} differs from the declaration ${link.area}/${link.target} holds`);
      usedLinks.add(link.d1Pending !== undefined || contract.links.some(l => l.binding === key) ? key : file);
      return { kind: 'linked', from: link.from, name: link.exportName, original: name, area: link.area, linkedSha256: link.sha256, shaScheme: scheme,
        ...(link.d1Pending ? { d1Pending: link.d1Pending } : {}) };
    }
    const state = moduleStateKind(official, src, p);
    const cds = graph.held.get(key);
    if (cds) {
      if (state) { stateConflicts.push({ binding: key, heldBy: `${graph.area}/${cds.target}`, kind: state, text: declarationText(src, p).slice(0, 400), reachedBy: chain(from) }); return null; }
      if (cds.sha256 !== shas.raw) throw Error(`${key} differs from the declaration ${graph.area}/${cds.target} holds`);
      push(heldByCdsCore, file, name);
    }
    for (const other of heldElsewhere(key)) {
      if (state) throw Error(`D1: ${key} is module state ${other.area}/${other.target} holds (${state}); link it instead of cutting a second copy`);
      if (!shaMatches(shas, other.sha256)) throw Error(`${key} differs from the declaration ${other.area}/${other.target} holds`);
      push(heldByLinked, file, `${other.area}:${name}`);
    }
    return null;
  };

  const rootSrc = await readSource4(official, rootChunk, cache);
  for (const [name] of Object.entries(contract.roots)) {
    const binding = rootSrc.program.scope.getBinding(name);
    if (!binding || binding.path.isImportSpecifier()) throw Error(`${rootChunk}: root ${name} is not a declaration`);
    if ([...rootSrc.exported.values()].includes(name)) throw Error(`${rootChunk}: root ${name} is exported by the chunk; name its alias`);
    assertFeatures(`${rootChunk}: root ${name}`, declarationText(rootSrc, binding.path), contract.features[name]);
    assertUniqueRoot(rootChunk, rootSrc, name, contract.features[name]);
    if (graph.published.has(`${rootChunk}#${name}`) || linkFor(rootChunk, name)) throw Error(`${rootChunk}: root ${name} is held by another graph; link it`);
    await add(rootChunk, name, 'root');
  }
  // A d1Pending link cds-core has since published is superseded (the publicName was linked instead), not stale.
  const unusedLinks = contract.links.filter(l => !usedLinks.has(l.binding ?? l.chunk) && !(l.d1Pending && graph.published.has(l.binding)))
    .map(l => `${l.area} ${l.binding ?? l.chunk}`);
  if (survey) {
    const summary = { version, unusedLinks, chunks: Object.fromEntries([...selected].map(([f, m]) => [f, [...m.keys()]])),
      imports: Object.fromEntries([...imports].map(([f, m]) => [f, Object.fromEntries([...m].filter(([, e]) => e.kind !== 'generated').map(([l, e]) => [l, `${e.kind} ${e.from}:${e.name}`]))])),
      heldByCdsCore: Object.fromEntries(heldByCdsCore), heldByLinked: Object.fromEntries(heldByLinked), stateConflicts };
    console.log(JSON.stringify(summary, null, 1));
    return summary;
  }
  if (stateConflicts.length) {
    const error = Error(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${stateConflicts.map(c => c.binding).join(', ')}`);
    error.stateConflicts = stateConflicts;
    throw error;
  }
  if (unusedLinks.length) throw Error(`links never reached: ${unusedLinks.join(', ')}`);
  // messages.mjs: the root chunk's defineMessages tables (`X = f({...})`, f the vendor-intl export) the closure reaches.
  const intl = await readSource4(official, intlChunk, cache);
  const intlLocal = intl.exported.get(contract.defineMessagesAlias);
  assertFeatures(`${intlChunk}: defineMessages ${intlLocal}`, declarationText(intl, intl.program.scope.getBinding(intlLocal).path), [loose4('function tn(e) { return e; }')]);
  const rootImports = imports.get(rootChunk), rootSelected = selected.get(rootChunk);
  const defineMessages = [...rootImports].find(([, e]) => e.via === `${intlChunk}:${contract.defineMessagesAlias}`)?.[0];
  if (!defineMessages) throw Error(`${rootChunk}: no defineMessages import from ${intlChunk}`);
  const tables = new Map();
  for (const [name, p] of rootSelected) {
    const init = p.isVariableDeclarator() ? p.node.init : null;
    if (init?.type === 'CallExpression' && init.callee.type === 'Identifier' && init.callee.name === defineMessages) tables.set(name, p);
  }
  const tableNames = new Map();
  for (const { name, key, id } of contract.messageTables) {
    const entry = new RegExp(`(?<![\\w$])${key}: \\{\\s*defaultMessage:\\s*"(?:[^"\\\\]|\\\\.)*",\\s*id: ${JSON.stringify(id).replace(/[+/]/g, '\\$&')},?\\s*\\}`);
    const hits = [...tables].filter(([, p]) => entry.test(declarationText(rootSrc, p)));
    if (hits.length !== 1) throw Error(`messages.mjs: ${name} (${key}, id ${id}) matches ${hits.length} tables`);
    tableNames.set(hits[0][0], name);
  }
  const unnamed = [...tables.keys()].filter(n => !tableNames.has(n));
  if (unnamed.length) throw Error(`messages.mjs: unnamed defineMessages tables ${unnamed.join(', ')}`);
  const sidebar = [...tableNames].find(([, n]) => n === 'sidebarTitleMessages')[0];
  assertFeatures('messages.mjs: sidebarTitleMessages', declarationText(rootSrc, tables.get(sidebar)), [contract.pinTitle, '"+O33CWUgVt"']);
  for (const [name, p] of tables) if (declarationDeps(rootSrc, p).some(d => d !== defineMessages)) throw Error(`messages.mjs: ${name} depends on more than defineMessages`);

  // Emit: one module per chunk; the root chunk split into messages.mjs and tool-titles.mjs.
  const moduleOf4 = file => (file === rootChunk ? null : file.replace(/\.js$/, '.mjs'));
  const targetOf = (file, name) => (file === rootChunk ? (tables.has(name) ? 'messages.mjs' : 'tool-titles.mjs') : moduleOf4(file));
  const targets = [];
  for (const [file, sel] of selected) {
    if (!sel.size) continue;
    if (file === rootChunk) targets.push({ target: 'messages.mjs', file, names: [...tables.keys()] }, { target: 'tool-titles.mjs', file, names: [...sel.keys()].filter(n => !tables.has(n)) });
    else targets.push({ target: moduleOf4(file), file, names: [...sel.keys()] });
  }
  const wanted = new Map(targets.map(t => [t.target, new Set()]));
  for (const t of targets) {
    const src = cache.get(t.file);
    for (const name of t.names) for (const dep of declarationDeps(src, selected.get(t.file).get(name))) {
      const imp = imports.get(t.file).get(dep);
      if (imp?.kind === 'generated') wanted.get(moduleOf4(imp.file)).add(imp.name);
      else if (!imp && selected.get(t.file).has(dep) && targetOf(t.file, dep) !== t.target) wanted.get(targetOf(t.file, dep)).add(dep);
    }
  }
  // Module-level bindings the official chunk assigns only in declarations this graph does not cut: shared-62 Zk (the
  // served backend the hook Qk records in an effect, read by eA / MA) and shared-0 NY (the flag FY, exported `Pa`, sets and
  // RY / zY read: MA's "ccr" backend). Reported, not hidden: the copy reads the initial value (undefined / false, the
  // local-desktop answer) until a graph that cuts the writer links this one (no 4.16336.0 graph cuts Qk or FY).
  const stateWritersNotCut = [];
  for (const [file, sel] of selected) {
    const src = cache.get(file);
    for (const [name, p] of sel) {
      if (!p.isVariableDeclarator()) continue;
      for (const bound of patternNames(p.node.id)) {
        const writers = src.program.scope.getBinding(bound).constantViolations.filter(q => q !== p && ![...sel.values()].some(d => within(d, q)))
          .map(q => { let top = q; while (top.parentPath && !top.parentPath.isProgram()) top = top.parentPath; const d = top.isVariableDeclaration() ? top.node.declarations.find(x => q.node.start >= x.start && q.node.end <= x.end) : top.node; return d?.id?.name ?? top.node.type; });
        if (writers.length) stateWritersNotCut.push({ binding: `${file}#${bound}`, writers: [...new Set(writers)].sort() });
      }
    }
  }
  const files = {};
  const d1Pending = [];
  const manifest = { referenceVersion: version, referenceSnapshot: snapshot, generator: 'scripts/extract-approval-titles.mjs',
    sharedGraph: graph.area, linkedAreas: [...areas.keys()], isolatedGraph: contract.isolatedGraph,
    roots: Object.fromEntries(Object.entries(contract.roots).map(([local, name]) => [name, { file: rootChunk, local, alias: null }])),
    messageTables: Object.fromEntries([...tableNames].map(([local, name]) => [name, { file: rootChunk, local, id: contract.messageTables.find(m => m.name === name).id }])),
    modules: [], d1Pending, stateWritersNotCut };
  for (const t of targets) {
    const src = cache.get(t.file), sel = selected.get(t.file);
    const names = t.names.slice().sort((a, b) => sel.get(a).node.start - sel.get(b).node.start);
    const used = new Set(names.flatMap(n => declarationDeps(src, sel.get(n))));
    const groups = new Map(), records = [];
    const group = (from, spec) => (groups.has(from) ? groups.get(from) : groups.set(from, []).get(from)).push(spec);
    for (const dep of [...used].sort()) {
      const imp = imports.get(t.file).get(dep);
      if (imp) {
        const from = imp.kind === 'generated' ? `./${moduleOf4(imp.file)}` : imp.from;
        group(from, imp.name === dep ? dep : `${imp.name} as ${dep}`);
        records.push({ local: dep, from, name: imp.name, via: imp.via, kind: imp.kind, ...(imp.original ? { original: imp.original } : {}),
          ...(imp.linkedSha256 ? { linkedSha256: imp.linkedSha256 } : {}), ...(imp.shaScheme ? { shaScheme: imp.shaScheme } : {}) });
        if (imp.d1Pending && !d1Pending.some(d => d.binding === imp.via)) d1Pending.push({ binding: imp.via, linkedFrom: `${imp.from}:${imp.name}`, until: imp.d1Pending });
      } else if (targetOf(t.file, dep) !== t.target) {
        const from = `./${targetOf(t.file, dep)}`;
        group(from, dep);
        records.push({ local: dep, from, name: dep, via: `${t.file}:${dep}`, kind: 'split' });
      }
    }
    const importText = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([from, specs]) => `import { ${[...new Set(specs)].join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const blocks = [...new Set(names.map(n => sel.get(n)))].map(p => (p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p)));
    const exportNames = t.target === 'tool-titles.mjs' ? Object.entries(contract.roots)
      : t.target === 'messages.mjs' ? [...tableNames, ...[...wanted.get(t.target)].sort().map(n => [n, n])]
        : [...wanted.get(t.target)].sort().map(n => [n, n]);
    if (t.target === 'tool-titles.mjs') for (const n of [...wanted.get(t.target)].sort()) if (!contract.roots[n]) exportNames.push([n, n]);
    const exportText = exportNames.length ? `export { ${exportNames.map(([l, n]) => (l === n ? l : `${l} as ${n}`)).join(', ')} };` : '';
    const header = `// Original Claude Desktop ${version} bindings from ${t.file}; generated by extract-approval-titles.mjs (4.16336.0 contract).\n`
      + '// Edit the extractor, never this file.\n';
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, t.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(n => !contract.hostGlobals.has(n));
    if (foreign.length) throw Error(`${t.target}: unbound ${foreign.join(', ')}`);
    files[t.target] = text;
    manifest.modules.push({ target: t.target, source: t.file, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion: version,
      bindings: names.map(n => ({ name: n, sha256: sha(declarationText(src, sel.get(n))) })), imports: records,
      exports: Object.fromEntries(exportNames), heldByCdsCore: heldByCdsCore.get(t.file)?.filter(n => names.includes(n)) ?? [],
      heldByLinked: heldByLinked.get(t.file)?.filter(n => names.includes(n.split(':').pop())) ?? [] });
  }
  manifest.modules.sort((a, b) => a.target.localeCompare(b.target));
  d1Pending.sort((a, b) => a.binding.localeCompare(b.binding));
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`${label} output set changed: ${present.join(',')}. Run scripts/extract-approval-titles.mjs --version ${version}.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`${label} source mismatch: ${name}. Run scripts/extract-approval-titles.mjs --version ${version}.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} ${label} modules (${count} original ${version} bindings).`);
  return manifest;
}
const loose4 = official4.looseFeature;

// `version` picks the source contract: 3.6556.2 (default; src/generated/approval-titles, the graph the host and the
// 3.6556.2 consumers import) or 4.16336.0 (src/generated/approval-titles-v4, isolated until the batch-11 cutover).
export async function extractApprovalTitles({ check = false, survey = false, version = referenceVersion } = {}) {
  if (version === referenceVersion) {
    if (survey) throw Error('extract-approval-titles: --survey is a 4.16336.0 contract mode');
    return extractLegacy({ check });
  }
  if (version === official4.referenceVersion) return extractTarget4(contract4, { check, survey });
  throw Error(`extract-approval-titles has no ${version} source contract`);
}
// CLI: no --version runs both contracts in turn (3.6556.2 first); --version <v> runs one; --survey (4.16336.0) prints the
// closure, links and D46 state conflicts and writes nothing.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2), at = argv.indexOf('--version');
  const versions = at >= 0 ? [argv[at + 1]] : argv.includes('--survey') ? [official4.referenceVersion] : contractVersions;
  for (const version of versions) await extractApprovalTitles({ check: argv.includes('--check'), survey: argv.includes('--survey'), version });
}

