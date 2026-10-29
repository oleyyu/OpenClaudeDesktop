import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import { selectBinding } from '../scripts/extract-code-ui-current.mjs';
import { ionSource, previousIonSource } from '../scripts/official-3.6556.2.mjs';

// selectBinding() is the `selections` step of extract-code-ui-current.mjs emit(); it sees prettier-formatted source,
// exactly as emit() formats it. Official chunks are read as text only (R13).
const prepare = async text => { const code = await format(text, { parser: 'babel' }); return { code, ast: parsers.babel.parse(code, {}) }; };
const valid = async text => { await format(text, { parser: 'babel' }); return true; };

test('existing selection modes keep their output and manifest records', async () => {
  const { code, ast } = await prepare(`
    function A(e){const x=useMemo(()=>e.a+1,[e]);return x}
    function B(e){const y=e.b;return y}
    function C(e){return track(e,{id:1})}
    function D(e){let z;z=e.c*2;return z}
    function E(e){return e.d?wrap(e.d):null}
  `);
  assert.deepEqual(selectBinding(code, ast, 'A', { local: 'x', parameters: 'e' }).text, 'function A(e) { return e.a + 1; }');
  const local = selectBinding(code, ast, 'A', { local: 'x', parameters: 'e' }).record;
  assert.deepEqual(Object.keys(local), ['binding', 'local', 'fragmentSha256', 'parameters']);
  const direct = selectBinding(code, ast, 'B', { local: 'y', direct: true, parameters: 'e' });
  assert.equal(direct.text, 'function B(e) { return e.b; }');
  assert.deepEqual(Object.keys(direct.record), ['binding', 'local', 'direct', 'fragmentSha256', 'parameters']);
  const call = selectBinding(code, ast, 'C', { call: 'track', argument: 'e', parameters: 'e' });
  assert.equal(call.text, 'function C(e) { return track(e, { id: 1 }); }');
  assert.deepEqual(Object.keys(call.record), ['binding', 'call', 'argument', 'fragmentSha256', 'parameters']);
  const assignment = selectBinding(code, ast, 'D', { assignment: 'z', parameters: 'e' });
  assert.equal(assignment.text, 'function D(e) { return e.c * 2; }');
  assert.deepEqual(Object.keys(assignment.record), ['binding', 'assignment', 'fragmentSha256', 'parameters']);
  const branch = selectBinding(code, ast, 'E', { test: 'e.d', callee: 'wrap', parameters: 'e' });
  assert.equal(branch.text, 'function E(e) { return wrap(e.d); }');
  assert.deepEqual(branch.record, { binding: 'E', test: 'e.d', callee: 'wrap', fragmentSha256: branch.record.fragmentSha256, parameters: 'e' });
  assert.match(branch.record.fragmentSha256, /^[0-9a-f]{64}$/);
});

test('conditional mode returns the whole conditional expression', async () => {
  const { code, ast } = await prepare(`
    function F(e){let t;t=e.length<=4||cut(e,4)===e?e:cut(e,3)+"…";return t}
    function G(e){return [e?1:2, e?3:4]}
  `);
  const whole = selectBinding(code, ast, 'F', { conditional: 'e.length <= 4 || cut(e, 4) === e', whole: true, parameters: 'e' });
  assert.equal(whole.text, 'function F(e) { return e.length <= 4 || cut(e, 4) === e ? e : cut(e, 3) + "…"; }');
  assert.deepEqual(whole.record, { binding: 'F', conditional: 'e.length <= 4 || cut(e, 4) === e', whole: true, fragmentSha256: whole.record.fragmentSha256, parameters: 'e' });
  // The `test` mode on the same expression gives only the consequent.
  assert.equal(selectBinding(code, ast, 'F', { test: 'e.length <= 4 || cut(e, 4) === e', parameters: 'e' }).text, 'function F(e) { return e; }');
  assert.throws(() => selectBinding(code, ast, 'F', { conditional: 'e.length <= 4 || cut(e, 4) === e', parameters: 'e' }), /conditional needs whole: true/);
  assert.throws(() => selectBinding(code, ast, 'G', { conditional: 'e', whole: true, parameters: 'e' }), /Ambiguous G branch e \(2 matches\)/);
  assert.throws(() => selectBinding(code, ast, 'G', { conditional: 'e.x', whole: true, parameters: 'e' }), /Ambiguous G branch e\.x \(no match\)/);
  assert.throws(() => selectBinding(code, ast, 'H', { conditional: 'e', whole: true, parameters: 'e' }), /Missing selection owner H/);
});

// titlebar-frame §3.2: the two 3.6556.2 use cases in cc43287c9.
test('conditional mode on cc43287c9: sessionMenuTooltipLabel (YW) and titlebarDraftTitle (oG)', async () => {
  const file = fs.readdirSync(ionSource).filter(name => name.startsWith('cc43287c9-') && name.endsWith('.js'));
  assert.deepEqual(file, ['cc43287c9-Me-M2ucD.js']);
  const { code, ast } = await prepare(fs.readFileSync(path.join(ionSource, file[0]), 'utf8'));

  const label = selectBinding(code, ast, 'YW', { conditional: 'Ze.length <= JW || yd(Ze, JW) === Ze', whole: true, parameters: 'Ze' });
  const flat = text => text.replace(/\s+/g, ' ');
  assert.equal(flat(label.text), 'function YW(Ze) { return Ze.length <= JW || yd(Ze, JW) === Ze ? Ze : `${yd(Ze, 79).trimEnd()}\\u2026`; }');
  assert.ok(await valid(label.text));
  // `Xe` is assigned twice inside YW, so the assignment mode cannot select it.
  assert.throws(() => selectBinding(code, ast, 'YW', { assignment: 'Xe', parameters: 'Ze' }), /Ambiguous YW branch/);

  const title = selectBinding(code, ast, 'oG', { conditional: '!t && !o && _', whole: true, parameters: 't, o, _' });
  assert.equal(flat(title.text), 'function oG(t, o, _) { return !t && !o && _ ? p("h1", { "data-pane-title": "", className: "draggable truncate ps-2.5 text-body font-medium font-control text-muted-as-secondary", children: _, }) : null; }');
  assert.ok(await valid(title.text));
  assert.equal(title.record.whole, true);
  assert.equal(title.record.parameters, 't, o, _');
});

test('extract-code-ui-current tags 3.6556.2 emits by directory', () => {
  const text = fs.readFileSync(path.resolve(import.meta.dirname, '../scripts/extract-code-ui-current.mjs'), 'utf8');
  assert.match(text, /^import \* as official from '\.\/official-3\.6556\.2\.mjs';$/m);
  assert.match(text, /^const v3Source = official\.ionSource;$/m);
  assert.match(text, /^const v3Desktop = official\.asarSource;$/m);
  // w10-cleanup-cc-public: every emit reads 3.6556.2 (the default directory is v3Source; any other directory throws), and
  // the manifest records 3.6556.2 at the top and on every module.
  assert.ok(text.includes('async function emit(prefix, target, names, imports, exports, directory = v3Source, selections = {}) {'));
  assert.ok(text.includes('if (![v3Source, v3Desktop].includes(directory)) throw Error('));
  assert.ok(text.includes('const referenceVersion = official.referenceVersion;'));
  assert.ok(text.includes('const manifest = { referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, modules: [] };'));
  assert.doesNotMatch(text, /latestSource|latestDesktop|installed-2\.42304\.0/);
  const manifest = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../src/generated/code-current/manifest.json'), 'utf8'));
  assert.deepEqual([manifest.referenceVersion, manifest.referenceSnapshot], ['3.6556.2', 'snapshots/claude-3.6556.2-20261025-192807']);
  assert.deepEqual(manifest.modules.filter(m => m.referenceVersion !== '3.6556.2').map(m => m.target), []);
});

// w10-ccres-cycle-step: `initType` keeps only the `local` declarators whose init is that AST node type; without it
// the local mode is unchanged (same matches, same record keys).
test('local mode initType filter: shared-16 Pg step arrow `m` (session-cycle-step)', async () => {
  const synthetic = await prepare(`function P(e){let m=()=>e+1,k=f(()=>{let m=g?h(1):0;return m});return [m,k]}`);
  assert.throws(() => selectBinding(synthetic.code, synthetic.ast, 'P', { local: 'm', direct: true, parameters: 'e' }), /Ambiguous P branch undefined \(2 matches\)/);
  const arrow = selectBinding(synthetic.code, synthetic.ast, 'P', { local: 'm', direct: true, initType: 'ArrowFunctionExpression', parameters: 'e' });
  assert.equal(arrow.text, 'function P(e) { return () => e + 1; }');
  assert.deepEqual(Object.keys(arrow.record), ['binding', 'local', 'direct', 'initType', 'fragmentSha256', 'parameters']);
  assert.equal(selectBinding(synthetic.code, synthetic.ast, 'P', { local: 'm', direct: true, initType: 'ConditionalExpression', parameters: 'e' }).text, 'function P(e) { return g ? h(1) : 0; }');
  assert.throws(() => selectBinding(synthetic.code, synthetic.ast, 'P', { local: 'm', direct: true, initType: 'CallExpression', parameters: 'e' }), /no match/);

  const { code, ast } = await prepare(fs.readFileSync(path.join(ionSource, 'shared-16-ByfgAyLr.js'), 'utf8'));
  assert.throws(() => selectBinding(code, ast, 'Pg', { local: 'm', direct: true, parameters: 'd, l, p, o, Hg' }), /Ambiguous Pg branch undefined \(2 matches\)/);
  const step = selectBinding(code, ast, 'Pg', { local: 'm', direct: true, initType: 'ArrowFunctionExpression', parameters: 'd, l, p, o, Hg' });
  const flat = text => text.replace(/\s+/g, ' ');
  assert.ok(flat(step.text).startsWith('function Pg(d, l, p, o, Hg) { return () => { let { buttons: e, selectedIdx: t } = Hg(l), n = e.length + 1, r = d ? zg(d, e) : p ? 0 : t + 1,'));
  assert.equal(step.record.initType, 'ArrowFunctionExpression');
  assert.ok(await valid(step.text));
  const manifest = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../src/generated/code-current/manifest.json'), 'utf8'));
  assert.equal(manifest.modules.find(entry => entry.target === 'session-cycle-step.mjs').sourceSelections[0].fragmentSha256, step.record.fragmentSha256);
});

// w10-shell-selections-tests (research/w10-shell.md notdone 61): the selection kinds behind the two E38 targets that
// w3-sidebar-sections-gen moved to 3.6556.2. sidebar-filter-view.mjs uses the `ifTest` mode (the `else if (n ===
// "sessionList") { … }` block of shared-21 PJ over PJ's own compiler cache); sidebar-filter-controls.mjs selects no
// binding and re-exports the sidebar-sections slice of the same chunk, so its guard is that every re-exported name
// still resolves to the very shared-21 declaration the slice was cut from.
test('ifTest mode returns the if / else-if block over the owner\'s compiler cache', async () => {
  const { code, ast } = await prepare(`
    function S(e){let $=J9(4),{layout:n}=e,fn;if(n==="cowork"){fn=$[0]}else if(n==="sessionList"){let t=n.length;fn=wrap(t)}else{fn=null}return fn}
    function T(e){let $=J9(2);if(e.x)return 1;if(e.x){y()}return 0}
    function U(e){let $=J9(2);if(e.k){a()}if(e.k){b()}}
    function V(e){let c=J9(1);if(e.k){a()}}
    function W(e){let a=1;let $=J9(1);if(e.k){a()}}
  `);
  const flat = text => text.replace(/\s+/g, ' ');
  const block = selectBinding(code, ast, 'S', { ifTest: 'n === "sessionList"', result: 'fn', cache: '$', parameters: '{layout:n}' });
  assert.equal(flat(block.text), 'function S({layout:n}) { let $ = J9(4), fn; let t = n.length; fn = wrap(t); return fn; }');
  assert.ok(await valid(block.text));
  assert.deepEqual(Object.keys(block.record), ['binding', 'ifTest', 'result', 'cache', 'fragmentSha256', 'parameters']);
  assert.deepEqual(block.record, { binding: 'S', ifTest: 'n === "sessionList"', result: 'fn', cache: '$ = J9(4)', fragmentSha256: block.record.fragmentSha256, parameters: '{layout:n}' });
  assert.match(block.record.fragmentSha256, /^[0-9a-f]{64}$/);
  // An `if` whose consequent is not a block is not a candidate, so T has exactly one match.
  assert.equal(flat(selectBinding(code, ast, 'T', { ifTest: 'e.x', result: 'r', cache: '$', parameters: 'e' }).text), 'function T(e) { let $ = J9(2), r; y(); return r; }');
  // The test text is the prettier-formatted source: other quoting does not match.
  assert.throws(() => selectBinding(code, ast, 'S', { ifTest: "n === 'sessionList'", result: 'fn', cache: '$', parameters: 'e' }), /Ambiguous S branch n === 'sessionList' \(no match\)/);
  assert.throws(() => selectBinding(code, ast, 'U', { ifTest: 'e.k', result: 'fn', cache: '$', parameters: 'e' }), /Ambiguous U branch e\.k \(2 matches\)/);
  // The cache must be a declarator of the owner's first statement (the React Compiler `$ = J9(n)` prologue).
  assert.throws(() => selectBinding(code, ast, 'V', { ifTest: 'e.k', result: 'fn', cache: '$', parameters: 'e' }), /Selection V: no compiler cache \$ opens the owner/);
  assert.throws(() => selectBinding(code, ast, 'W', { ifTest: 'e.k', result: 'fn', cache: '$', parameters: 'e' }), /Selection W: no compiler cache \$ opens the owner/);
  assert.throws(() => selectBinding(code, ast, 'X', { ifTest: 'e', result: 'fn', cache: '$', parameters: 'e' }), /Missing selection owner X/);
});

const generatedCurrent = path.resolve(import.meta.dirname, '../src/generated/code-current');
const generatedSections = path.resolve(import.meta.dirname, '../src/generated/sidebar-sections');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const moduleSpecifiers = (file, type) => {
  const { program } = parsers.babel.parse(fs.readFileSync(file, 'utf8'), {});
  return program.body.filter(node => node.type === type).flatMap(node => node.specifiers.map(s => ({ from: node.source?.value, imported: (s.imported ?? s.local).name, local: s.local.name, exported: s.exported?.name })));
};
const declarationOf = ({ code, ast }, name) => {
  const node = ast.program.body.find(n => n.id?.name === name) ?? ast.program.body.flatMap(n => n.declarations ?? []).find(n => n.id?.name === name);
  return node && code.slice(node.start, node.end);
};
const escape = text => text.replace(/[$.*+?^()[\]{}|\\]/g, '\\$&');
const sha256 = text => createHash('sha256').update(text).digest('hex');

test('ifTest mode on shared-21 PJ: sidebar-filter-view (Group and sort, sessionList layout)', async () => {
  const file = 'shared-21-R7LldJ05.js';
  const bytes = fs.readFileSync(path.join(ionSource, file));
  const { code, ast } = await prepare(bytes.toString());
  const entry = readJson(path.join(generatedCurrent, 'manifest.json')).modules.find(m => m.target === 'sidebar-filter-view.mjs');
  assert.equal(entry.referenceVersion, '3.6556.2');
  assert.equal(path.basename(entry.source), file);
  assert.equal(entry.sourceSha256, sha256(bytes));
  assert.deepEqual(entry.bindings, ['PJ']);
  const [recorded] = entry.sourceSelections;
  const view = selectBinding(code, ast, 'PJ', { ifTest: 'n === "sessionList"', result: 'fn', cache: '$', parameters: recorded.parameters });
  assert.deepEqual(view.record, recorded);
  assert.equal(view.record.cache, '$ = J9(482)');
  const flat = text => text.replace(/\s+/g, ' ');
  assert.ok(flat(view.text).startsWith(`function PJ(${recorded.parameters}) { let $ = J9(482), fn; let e = J1($, 378, Q) ? K1($, 378, Q, Q.formatMessage(OJ.groupBy)) : $[379],`));
  assert.ok(flat(view.text).endsWith('h(g, { children: [t, n, v, b] })) : $[434]; return fn; }'));
  assert.ok(await valid(view.text));
  // The emitted function is exactly this selection (emit() formats the whole file; the function formats the same alone).
  const generated = fs.readFileSync(path.join(generatedCurrent, 'sidebar-filter-view.mjs'), 'utf8');
  assert.ok(generated.includes((await format(view.text, { parser: 'babel' })).trim()));
  // The block's slots (378-434) index PJ's own cache, so the cache must be PJ's `$`, not another local.
  assert.throws(() => selectBinding(code, ast, 'PJ', { ifTest: 'n === "sessionList"', result: 'fn', cache: 't', parameters: 'e' }), /Selection PJ: no compiler cache t opens the owner/);
  // A reused or moved minified name reports instead of slicing something else: the same selection on other shared-21
  // bindings, on 2.42304.0's PJ (there a scheduler counter `PJ = 0`) and on the old owner oU (a conditional, not if blocks).
  for (const other of ['HJ', 'qJ', 'UJ', 'OJ']) assert.throws(() => selectBinding(code, ast, other, { ...view.record, cache: '$' }), new RegExp(`Ambiguous ${other} branch n === "sessionList" \\(no match\\)`));
  const old = await prepare(fs.readFileSync(path.join(previousIonSource, 'shared-21-IP-SVetq.js'), 'utf8'));
  assert.match(declarationOf(old, 'PJ'), /^PJ = 0$/);
  assert.throws(() => selectBinding(old.code, old.ast, 'PJ', { ...view.record, cache: '$' }), /Ambiguous PJ branch n === "sessionList" \(no match\)/);
  assert.throws(() => selectBinding(old.code, old.ast, 'oU', { ...view.record, cache: '$' }), /Ambiguous oU branch n === "sessionList" \(no match\)/);
});

test('sidebar-filter-controls re-exports resolve to the shared-21 declarations the PJ block reads', async () => {
  const file = 'shared-21-R7LldJ05.js';
  const v3 = await prepare(fs.readFileSync(path.join(ionSource, file), 'utf8'));
  const old = await prepare(fs.readFileSync(path.join(previousIonSource, 'shared-21-IP-SVetq.js'), 'utf8'));
  const entry = readJson(path.join(generatedCurrent, 'manifest.json')).modules.find(m => m.target === 'sidebar-filter-controls.mjs');
  assert.equal(entry.referenceVersion, '3.6556.2');
  assert.equal(path.basename(entry.source), file);
  assert.deepEqual(entry.bindings, []);
  assert.equal(entry.sourceSelections, undefined);
  const slice = readJson(path.join(generatedSections, 'manifest.json')).modules.find(m => m.target === 'section-filter-controls.mjs');
  assert.equal(slice.referenceVersion, '3.6556.2');
  assert.equal(slice.source, file);
  const published = new Map(moduleSpecifiers(path.join(generatedSections, 'section-filter-controls.mjs'), 'ExportNamedDeclaration').filter(s => !s.from).map(s => [s.exported, s.local]));
  // Guard: the local behind a published name must be the declaration the slice recorded, in the chunk given.
  const sliced = (src, label, name) => {
    const local = published.get(name), recorded = slice.bindings.find(b => b.name === local);
    if (!local || !recorded) throw Error(`${name} is not published by section-filter-controls.mjs`);
    const text = declarationOf(src, local);
    if (text === undefined || sha256(text) !== recorded.sha256) throw Error(`${label} ${local} (${name}) is not the sliced binding`);
    return local;
  };
  const reexports = moduleSpecifiers(path.join(generatedCurrent, 'sidebar-filter-controls.mjs'), 'ExportNamedDeclaration');
  assert.deepEqual(reexports.map(s => s.exported), ['sidebarFilterMessages', 'useSidebarSortOptions', 'SidebarOptionMenu', 'SidebarSortMenu', 'focusSidebarAfterRegroup', 'SidebarViewAllContext', 'useSidebarViewAll', 'SidebarViewAllItem', 'SidebarViewResetItems', 'sortAscendingShown', 'sortAscendingStored', 'SidebarFilterTrigger', 'trailingControlClass']);
  // SB-26: gU (useSidebarRegroupFocus) is deleted officially and no longer re-exported.
  assert.ok(!reexports.some(s => s.exported === 'useSidebarRegroupFocus'));
  const locals = {};
  for (const s of reexports) {
    assert.equal(s.from, '../sidebar-sections/section-filter-controls.mjs');
    assert.equal(s.imported, s.exported);
    locals[s.exported] = sliced(v3, file, s.exported);
    // Every one of these minified names also exists in 2.42304.0 shared-21, bound to something else.
    assert.ok(declarationOf(old, locals[s.exported]) !== undefined);
    assert.throws(() => sliced(old, '2.42304.0', s.exported), new RegExp(`2\\.42304\\.0 ${escape(locals[s.exported])} \\(${s.exported}\\) is not the sliced binding`));
  }
  assert.deepEqual(locals, { sidebarFilterMessages: 'OJ', useSidebarSortOptions: 'KJ', SidebarOptionMenu: 'qJ', SidebarSortMenu: 'JJ', focusSidebarAfterRegroup: 'nY', SidebarViewAllContext: '_J', useSidebarViewAll: 'vJ', SidebarViewAllItem: 'WJ', SidebarViewResetItems: 'UJ', sortAscendingShown: 'xJ', sortAscendingStored: 'SJ', SidebarFilterTrigger: 'NJ', trailingControlClass: 'OG' });
  // sidebar-filter-view imports the controls under PJ's own free names, so the selected block reads the same bindings.
  const viewImports = moduleSpecifiers(path.join(generatedCurrent, 'sidebar-filter-view.mjs'), 'ImportDeclaration').filter(s => s.from === './sidebar-filter-controls.mjs');
  assert.deepEqual(viewImports.map(s => [s.imported, s.local]), [['sidebarFilterMessages', 'OJ'], ['SidebarOptionMenu', 'qJ'], ['SidebarSortMenu', 'JJ'], ['SidebarViewResetItems', 'UJ']]);
  const block = selectBinding(v3.code, v3.ast, 'PJ', { ifTest: 'n === "sessionList"', result: 'fn', cache: '$', parameters: 'e' }).text;
  for (const { imported, local } of viewImports) {
    assert.equal(locals[imported], local);
    assert.match(block, new RegExp(`(^|[^\\w$])${escape(local)}[.(,]`));
  }
});
