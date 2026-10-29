// Extract the 3.6556.2 originals of the AskUserQuestion card (c9ed5627b dt, exported `t`; 2.42304.0 approval-current yk)
// that the host's question card renders with. Nothing here executes desktop runtime code (W12 lane question, follow-up of
// w11-sweep-trans question-keys):
//   option-row.mjs       c9ed5627b ut (the option row: a type=button row `flex items-center gap-sm rounded-[5px] px-md
//                        py-md …`, selected st / highlighted bg-alpha-2 / resting bg-alpha-1; the label `text-body
//                        text-primary` and the description `text-footnote text-muted-as-secondary whitespace-pre-wrap`
//                        through c53f67064 t; trailing a CdsCheckboxIndicator (multiSelect) or the digit keycap
//                        `pointer-events-none flex pointer-coarse:hidden` CdsShortcut when showDigitHint), st (the
//                        selected-row surface the Other row shares), ot (the drag-select threshold), at (onMouseDown
//                        preventDefault), vt (the Other field's ↑/↓ stay in the field), _t (the Other field's click stops).
//   digit-shortcuts.mjs  the document-level digit listener of dt: the effect React Compiler stores as `$t` (cache slot 57)
//                        and dt runs with useLayoutEffect, cut out of dt by AST with dt's own locals as named parameters
//                        (A collapsed, xt hasComposerPopup, N the card root ref, E enableDigitShortcuts, B
//                        handleOptionClick, U no questions, T isFocusedPane, w isPanelActive, W the page's option count,
//                        z showSubmitted, Yt the time the card became active, H "focus the card on page change"); its
//                        guard chain (shared-156 Xq / tJ / hq / _q / LK / rq / Yq / uq / Cq, shared-2 C7 / w7, c2f6611a3
//                        $t, shared-10 hx (linked from proposal-group), c9ed5627b tt / nt / mt / ht / gt) comes along as
//                        the original declarations.
//                        It also marks the card root with data-question-card-digits = options + 1 (shared-156 Cq), which
//                        the session pane's digit test reads (pane-keys-model approvalDigit, RR).
//   primary-button.mjs   c30607cef i (dt's `je`): the primary CdsButton whose shortcut hides while the window is not
//                        attended; that hook (shared-10 Fx) and the tracker state it reads are approval-landing's
//                        window-attention-hook.mjs / window-attention.mjs, linked (one instance).
//   card-header.mjs      shared-5 bL (the card title row: leading / title [data-question-stop-name] / subtitle /
//                        trailing; exported `tt`).
//   …                    every other original those read, one module per official chunk (`<chunk>.mjs`), cut as the
//                        reachable closure of what is asked of that chunk.
//
// Resolution (the approval-landing machinery, extended to one auto module per chunk): an import resolves to React (a
// verified vendor-frame alias, official-3.6556.2.mjs), a React Compiler helper or a CDS name view-tabs publishes (E3/R3/R6:
// by semantic name from the concrete view-tabs file), a module src/generated/approval-landing or src/generated/btw-pane
// already emits from the very same chunk bytes (their manifests are checked; this is where c9ed5627b's landing state D
// and nt come from, so the landed-card guard stays one instance), or else this generator's module for that chunk. A
// same-chunk dependency that a linked module exports is imported from it instead of being cut again. Features (R2:
// stable strings or looseFeature patterns) are checked on each root; every module must be closed apart from a fixed list
// of host globals.
//
// D0: own generator, own output folder (src/generated/question-card), own scripts/verify-gen-question-card.mjs.
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
const output = path.join(root, 'src/generated/question-card');
const linkedDirs = ['approval-landing', 'btw-pane'];
// W12c (w12-carry-02, D1): shared-10 hx (`function hx(e){return Date.now()-mx(e)}`, exported tn; c9ed5627b imports it as
// `tn as we`, read by $t's `w7(400, we(e))`) is already proposal-group's (shared-10-D6FXWZph.js exports it as tn for
// c96d752d0 `tn as Oie`; cowork-approval links that copy too). Linked from there, one copy.
// W13 G11 (D1): shared-0 Pa (lazyInit) and AL (the control/format character class) are routines-shared's
// (shared-0-DDOOdL6P.mjs, no imports, plain node); linked from there instead of a second copy here.
const linkedBindings = { 'proposal-group': ['shared-10-D6FXWZph.js#hx'], 'routines-shared': ['shared-0-DDOOdL6P.js#Pa', 'shared-0-DDOOdL6P.js#AL'] };
// W13 G11 (D1, cowork-approval pendingDedupe): bindings an auto (per-chunk) module of this graph cuts that another graph
// reaches too are exported here as well, so that graph links this one copy: shared-2 c7 (the MCP app fullscreen store,
// one store for both cards) and shared-156 eq. A listed binding the closure no longer cuts stops generation.
const publishedAuto = { 'shared-2-TF8v67kg.js': ['c7'], 'shared-156-BLTosN8U.js': ['eq'] };
const viewTabsDir = path.join(root, 'src/generated/view-tabs');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const loose = official.looseFeature;
const QUESTION = 'c9ed5627b-BSPWYeYQ.js';

// Globals the original code reads from the host page.
const hostGlobals = new Set(['performance', 'queueMicrotask', 'globalThis', 'Set', 'WeakMap', 'WeakSet', 'Date', 'Infinity',
  'window', 'document', 'Number', 'String', 'Object', 'Array', 'Math', 'RegExp', 'Error', 'JSON', 'Map', 'Symbol', 'parseInt',
  'navigator', 'Boolean', 'Promise', 'Intl', 'Node', 'Element', 'HTMLElement', 'ShadowRoot', 'Reflect', 'console', 'isFinite',
  'undefined', 'NaN', 'encodeURIComponent', 'decodeURIComponent', 'setTimeout', 'clearTimeout', 'requestAnimationFrame',
  'cancelAnimationFrame', 'AbortController', 'WeakRef', 'TextEncoder', 'Uint8Array', 'BigInt', 'structuredClone', 'CSS', 'DOMRect']);

// The asked-for roots. `exports` maps an original local binding to its exported name, or `byExport` names the roots by
// the chunk's export alias; `internal: true` allows roots the chunk does not export. `inner` cuts one expression out of
// a declaration: { name, within, features, params } (params: within's own locals the expression reads, in order).
const targets = [
  { target: 'option-row.mjs', source: QUESTION, internal: true,
    exports: { ut: 'QuestionOptionRow', st: 'selectedRowClass', ot: 'dragSelectThreshold', at: 'preventMouseDown',
      vt: 'otherFieldArrowKeys', _t: 'stopClickPropagation' },
    features: {
      ut: [loose('showDigitHint: c'), loose('onRowMouseDown: l'), loose('endsDragSelect: d'), loose('onOptionClick: te'),
        'flex items-center gap-sm rounded-[5px] px-md py-md text-start focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus transition-[background-color]',
        '"bg-alpha-2"', '"bg-alpha-1 hover:bg-alpha-2"', '`text-footnote text-muted-as-secondary whitespace-pre-wrap ${w}`', '"flex flex-col gap-0.5 min-w-0 flex-1 select-text"',
        '"pointer-events-none flex pointer-coarse:hidden"', loose('keys: String(i + 1)'), '"data-size": "sm"', '"flex shrink-0"', '"aria-pressed": p'],
      st: ['bg-[light-dark(var(--cds-surface-popover),var(--cds-alpha-2))] [box-shadow:inset_0_0_0_1px_var(--cds-fill-secondary-ring)]'],
      ot: [loose('ot = 4')], at: [loose('return e.preventDefault()')],
      vt: [loose('(e.key === "ArrowUp" || e.key === "ArrowDown") && e.stopPropagation()')], _t: [loose('e.stopPropagation()')] } },
  { target: 'digit-shortcuts.mjs', source: QUESTION, internal: true,
    exports: { tt: 'onLandedCard', mt: 'composedHopElements', ht: 'isTextboxRole', gt: 'isInEditableContent' },
    features: {
      tt: [loose('t?.onCard === !0 && t.at === e')], mt: [loose('return l(e) ?? []')],
      ht: ['\'[role="combobox"],[role="textbox"],[role="searchbox"]\''], gt: ['\'[contenteditable]:not([contenteditable="false"])\''] },
    inner: [{ name: 'questionDigitShortcuts', within: 'dt',
      features: ['if (!w || !T || z || U || A || !E) return;', 'e.isComposing', 'e.keyCode === 229', 'r = W + 1',
        'n < 1 || n > r', 'a.isTruncated', '\'input,textarea,select,[role^="menu"],[role="listbox"],[role="option"],[role="tab"]\'',
        '!(!e.repeat && Date.now() - Yt.current < 400)', 'B(n === r ? -1 : n - 1)', 'e.addEventListener("keydown", n, !0)',
        'r?.setAttribute(be, String(W + 1))', 'r?.removeAttribute(be)'],
      params: ['w', 'T', 'z', 'U', 'A', 'E', 'N', 'W', 'xt', 'Yt', 'H', 'B'] }] },
  // dt's row pointer handlers (cache slots 100 / 101), shared by the option rows and the Other row: mn (onRowMouseDown:
  // a plain press clears a selection inside the row and watches the mouseup; a drag past ot, or a shift-extended
  // selection, marks the press as a drag-select and blurs the row) and hn (endsDragSelect: that press's click is not a pick).
  { target: 'row-pointer.mjs', source: QUESTION, internal: true, exports: {},
    inner: [
      { name: 'questionRowMouseDown', within: 'dt', params: ['un', 'dn'],
        features: ['if (e.button !== 0) return;', 'e.getRangeAt(0).intersectsNode(t)', 'e.shiftKey && !!i && !i.isCollapsed',
          '"mouseup"', 'Math.hypot(e.clientX - c, e.clientY - l) > ot', 's.dragSelected = u && (d || a)', 'capture: !0, signal: o.signal'] },
      { name: 'questionEndsDragSelect', within: 'dt', params: ['un'],
        features: ['(un.current = null), e.detail !== 0 && !!t?.dragSelected'] }] },
  // c30607cef i (exported `t`, dt's `je`): the card's primary button, a CdsButton whose shortcut hides while the window is
  // not attended (shared-10 Fx, `r() || (n.hideShortcut ?? !1)`). Fx and its tracker state come from approval-landing
  // window-attention-hook.mjs / window-attention.mjs (one instance; linked, never cut here).
  { target: 'primary-button.mjs', source: 'c30607cef-YKGa83RR.js', byExport: { t: 'QuestionPrimaryButton' },
    features: { t: [loose('i = r() || (n.hideShortcut ?? !1)'), loose('{ ...n, hideShortcut: i }')] } },
  // shared-5 hr ($A): the question text dt titles the card with (`ae(G.question)`).
  { target: 'card-header.mjs', source: 'shared-5-Bg6ZMqvt.js', byExport: { tt: 'QuestionCardHeader', hr: 'questionDisplayText' },
    features: { tt: [loose('titleNamesCard: a'), '"text-body text-muted-as-secondary"', '"shrink-0 self-center"', '"data-question-stop-name": l',
      '"text-body-semibold min-w-0 break-words"', '"flex items-start gap-xs min-w-0"', '"flex flex-1 min-w-0 flex-col gap-[2px]"',
      '"text-primary min-h-[24px] flex items-center gap-1"'], hr: [loose('keepLegibilityJoiners: !0')] } },
];

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
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => (f instanceof RegExp ? !f.test(text) : !text.includes(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => (f instanceof RegExp ? f.source : JSON.stringify(f))).join(', ')}`);
}
function reactImport(file, alias, dep) {
  if (file !== official.vendorFrame || !official.reactAliases[alias]) return null;
  const { module, member } = official.assertVendorAlias(dep.text, alias);
  return { from: module, member };
}
// E3/R3/R6: a React Compiler helper, or any shared-frame / view-tabs binding view-tabs publishes, by its semantic name.
async function viewTabsImport(file, alias, dep, state) {
  state.viewTabs ??= JSON.parse(await fs.readFile(path.join(viewTabsDir, 'manifest.json'), 'utf8'));
  if (state.viewTabs.referenceVersion !== referenceVersion) throw Error('view-tabs manifest is for another reference version');
  const helper = file === official.sharedFrame ? official.compilerHelpers[alias] : undefined;
  if (helper) {
    if (!state.helpersChecked) { official.assertCompilerHelpers(dep.text); state.helpersChecked = true; }
    const published = state.viewTabs.publicNames?.[helper.name];
    if (published?.file !== file || published.export !== alias || published.local !== helper.local)
      throw Error(`view-tabs does not publish ${helper.name} as ${file}:${alias} (${helper.local})`);
    return { from: `../view-tabs/${file}`, member: helper.name };
  }
  const entry = Object.entries(state.viewTabs.publicNames ?? {}).find(([, v]) => v.file === file && v.export === alias);
  return entry ? { from: `../view-tabs/${file}`, member: entry[0] } : null;
}
async function linkedModules(cache) {
  const linked = [];
  for (const dir of linkedDirs) {
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/generated', dir, 'manifest.json'), 'utf8'));
    if (manifest.referenceVersion !== referenceVersion) throw Error(`${dir} manifest is for another reference version`);
    for (const m of manifest.modules) {
      const src = await readSource(m.source, cache);
      if (sha(src.bytes) !== m.sourceSha256) throw Error(`${dir} ${m.target} was cut from other ${m.source} bytes`);
      const text = await fs.readFile(path.join(root, 'src/generated', dir, m.target), 'utf8');
      if (sha(text) !== m.sha256) throw Error(`${dir} ${m.target} differs from its manifest`);
      linked.push({ target: `../${dir}/${m.target}`, source: m.source, exports: m.exports, bindings: m.bindings.map(b => b.name) });
    }
  }
  // Single bindings of a per-chunk graph (modules named by their chunk): only the listed ones are linked, so nothing else
  // of this card (nor what cowork-approval links from it) moves.
  for (const [dir, keys] of Object.entries(linkedBindings)) {
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/generated', dir, 'manifest.json'), 'utf8'));
    if (manifest.referenceVersion !== referenceVersion) throw Error(`${dir} manifest is for another reference version`);
    for (const key of keys) {
      const [file, name] = key.split('#');
      // A per-chunk graph names its module by the chunk (proposal-group); routines-shared by `target` (`<chunk>.mjs`).
      const m = manifest.modules.find(x => (x.target ?? x.source) === file) ?? manifest.modules.find(x => x.source === file);
      if (!m || m.source !== file) throw Error(`${dir} no longer holds a module of ${file}`);
      const target = m.target ?? file;
      const src = await readSource(m.source, cache);
      if (sha(src.bytes) !== m.sourceSha256) throw Error(`${dir} ${file} was cut from other ${m.source} bytes`);
      const text = await fs.readFile(path.join(root, 'src/generated', dir, target), 'utf8');
      if (sha(text) !== m.sha256) throw Error(`${dir} ${target} differs from its manifest`);
      // A manifest without `exports` (routines-shared): the module's own `export { … }` list names it.
      const exported = m.exports ?? Object.fromEntries([...text.matchAll(/^export \{([^}]*)\};/gm)].flatMap(x => x[1].split(',').map(s => s.trim()).filter(Boolean))
        .map(spec => { const [local, as] = spec.split(/\s+as\s+/); return [local, as ?? local]; }));
      if (!m.bindings.some(b => b.name === name) || !exported[name]) throw Error(`${dir} ${target} does not export the original ${key}`);
      linked.push({ target: `../${dir}/${target}`, source: m.source, exports: { [name]: exported[name] }, bindings: m.bindings.map(b => b.name) });
    }
  }
  return linked;
}
const chunkTarget = file => `${file.replace(/-[A-Za-z0-9_-]{8}\.js$/, '')}.mjs`;

export async function extractQuestionCard({ check = false } = {}) {
  const cache = new Map(), files = {}, state = {};
  const linked = await linkedModules(cache);
  // module key = target; each holds roots (local -> exported name), selected declarations and imports.
  const mods = new Map();
  const ensure = (target, file) => {
    if (!mods.has(target)) mods.set(target, { target, source: file, roots: new Map(), selected: new Map(), imports: new Map(),
      seen: new Set(), auto: true, features: {} });
    const m = mods.get(target);
    if (m.source !== file) throw Error(`${target} would hold both ${m.source} and ${file}`);
    return m;
  };
  const queue = [];
  for (const raw of targets) {
    const src = await readSource(raw.source, cache);
    const byLocal = alias => {
      const local = src.exported.get(alias);
      if (!local) throw Error(`${raw.target}: ${raw.source} no longer exports ${alias}`);
      return local;
    };
    const exportsMap = raw.byExport ? Object.fromEntries(Object.entries(raw.byExport).map(([a, n]) => [byLocal(a), n])) : raw.exports;
    const features = raw.byExport ? Object.fromEntries(Object.entries(raw.features ?? {}).map(([k, l]) => [k in raw.byExport ? byLocal(k) : k, l])) : raw.features ?? {};
    const m = ensure(raw.target, raw.source);
    Object.assign(m, { auto: false, internal: !!raw.internal, features, inner: raw.inner });
    for (const [local, name] of Object.entries(exportsMap)) {
      const binding = src.program.scope.getBinding(local);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${raw.target}: root ${local} is not a declaration of ${raw.source}`);
      if (!raw.internal && ![...src.exported.values()].includes(local)) throw Error(`${raw.target}: root ${local} is no longer exported by ${raw.source}`);
      assertFeatures(`${raw.target}: root ${local}`, declarationText(src, binding.path), features[local]);
      m.roots.set(local, name);
      queue.push([m, local]);
    }
  }
  // Where a chunk's binding lives when another module asks for it.
  const ownerOf = (file, local) => {
    const l = linked.find(x => x.source === file && x.exports[local]);
    if (l) return { from: l.target, name: l.exports[local], kind: 'linked' };
    const fixed = [...mods.values()].sort((a, b) => a.auto - b.auto).find(x => x.source === file && x.roots.has(local));
    if (fixed) return { from: `./${fixed.target}`, name: fixed.roots.get(local), kind: 'generated', mod: fixed };
    return null;
  };
  const addImport = async (m, src, name, p) => {
    const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
    const dep = await readSource(file, cache);
    const hook = reactImport(file, alias, dep);
    if (hook) { m.imports.set(name, { from: hook.from, name: hook.member, via, kind: 'react' }); return; }
    const vt = await viewTabsImport(file, alias, dep, state);
    if (vt) { m.imports.set(name, { from: vt.from, name: vt.member, via, kind: 'view-tabs' }); return; }
    if (file === official.sharedFrame || file === official.vendorFrame || file === official.vendorIntl)
      throw Error(`${m.target}: ${via} is neither React nor published by view-tabs`);
    const local = dep.exported.get(alias);
    if (!local) throw Error(`${m.target}: ${file} does not export ${alias}`);
    const owner = ownerOf(file, local);
    if (owner) { m.imports.set(name, { from: owner.from, name: owner.name, via, kind: owner.kind, original: local }); return; }
    // A chunk with one asked-for module takes the extra root itself (its closure is already cut there).
    const fixedOf = [...mods.values()].filter(x => !x.auto && x.source === file);
    const auto = fixedOf.length === 1 ? fixedOf[0] : ensure(chunkTarget(file), file);
    if (!auto.roots.has(local)) { auto.roots.set(local, local); queue.push([auto, local]); }
    m.imports.set(name, { from: `./${auto.target}`, name: local, via, kind: 'generated', original: local });
  };
  const add = async (m, name) => {
    if (m.seen.has(name)) return;
    m.seen.add(name);
    const src = await readSource(m.source, cache);
    const binding = src.program.scope.getBinding(name);
    if (!binding) throw Error(`${m.target}: unbound ${name}`);
    const p = binding.path;
    if (p.isImportSpecifier()) return addImport(m, src, name, p);
    if (!m.roots.has(name)) {
      // A same-chunk dependency a linked module (or another root module of this chunk) exports is imported from it.
      const owner = ownerOf(m.source, name);
      if (owner && owner.mod !== m) { m.imports.set(name, { from: owner.from, name: owner.name, via: `${m.source}#${name}`, kind: owner.kind, original: name }); return; }
      if (linked.some(x => x.source === m.source && x.bindings.includes(name) && /\b(?:new (?:WeakMap|WeakSet|Map|Set)|Nd\(|ds\()/.test(declarationText(src, p))))
        throw Error(`${m.target}: ${name} is state a linked module holds unexported`);
    }
    if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${m.target}: unsupported declaration ${name}`);
    if (!m.roots.has(name) && m.features?.[name]) assertFeatures(`${m.target}: ${name}`, declarationText(src, p), m.features[name]);
    m.selected.set(name, p);
    p.traverse({ ImportExpression() { throw Error(`${m.target}: dynamic import inside ${name}`); } });
    for (const dep of declarationDeps(src, p)) await add(m, dep);
  };
  // inner expressions: cut first so their program-level reads join the module's closure.
  for (const m of mods.values()) {
    if (!m.inner) continue;
    const src = await readSource(m.source, cache);
    m.innerTexts = [];
    m.innerRecords = [];
    for (const inner of m.inner) {
      const host = src.program.scope.getBinding(inner.within)?.path;
      if (!host) throw Error(`${m.target}: ${inner.within} is not a declaration of ${m.source}`);
      const found = [];
      host.traverse({ ArrowFunctionExpression(q) {
        const text = declarationText(src, q);
        if (inner.features.every(f => (f instanceof RegExp ? f.test(text) : text.includes(f)))) found.push(q);
      } });
      const innermost = found.filter(q => !found.some(o => o !== q && within(q, o)));
      if (innermost.length !== 1) throw Error(`${m.target}: ${inner.within} has ${innermost.length} expressions matching ${inner.name}'s features`);
      const q = innermost[0], params = new Set(), deps = new Set();
      q.traverse({ ReferencedIdentifier(r) {
        const name = r.node.name, b = r.scope.getBinding(name);
        if (!b) { if (!hostGlobals.has(name)) throw Error(`${m.target}: ${inner.name} reads global ${name}`); return; }
        if (within(q, b.path)) return;
        if (b.scope === src.program.scope) deps.add(name); else params.add(name);
      } });
      if (JSON.stringify([...params].sort()) !== JSON.stringify([...inner.params].sort()))
        throw Error(`${m.target}: ${inner.name} reads ${[...params].sort().join(',')} of ${inner.within}, expected ${[...inner.params].sort().join(',')}`);
      m.innerTexts.push(`var ${inner.name} = ({ ${inner.params.join(', ')} }) => ${declarationText(src, q)};`);
      m.innerRecords.push({ name: inner.name, within: inner.within, params: inner.params, sha256: sha(declarationText(src, q)) });
      m.roots.set(inner.name, inner.name);
      m.seen.add(inner.name);
      for (const name of deps) queue.push([m, name]);
    }
  }
  while (queue.length) { const [m, name] = queue.shift(); await add(m, name); }
  for (const [file, names] of Object.entries(publishedAuto)) {
    const m = [...mods.values()].find(x => x.auto && x.source === file);
    for (const name of names) {
      if (!m?.selected.has(name)) throw Error(`publishedAuto: ${file}#${name} is no longer cut by this graph`);
      if (!m.roots.has(name)) m.roots.set(name, name);
    }
  }

  // One instance of every cut binding: no declaration of a chunk may land in two modules.
  const placed = new Map();
  for (const m of mods.values()) for (const name of m.selected.keys()) {
    const key = `${m.source}#${name}`;
    if (placed.has(key)) throw Error(`${key} is cut into both ${placed.get(key)} and ${m.target}`);
    placed.set(key, m.target);
  }
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-question-card.mjs', modules: [] };
  const all = [...mods.values()].sort((a, b) => (a.auto - b.auto) || a.target.localeCompare(b.target));
  for (const m of all) {
    const src = await readSource(m.source, cache);
    const unreached = Object.keys(m.features ?? {}).filter(name => !m.selected.has(name));
    if (unreached.length) throw Error(`${m.target}: listed bindings ${unreached.join(', ')} are not part of the module`);
    const order = [...m.selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => (p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p)));
    if (m.innerTexts) blocks.push(...m.innerTexts);
    const groups = new Map();
    for (const [local, entry] of [...m.imports].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].sort((a, b) => a[0].localeCompare(b[0])).map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportsObj = Object.fromEntries(m.roots);
    const exportText = `export { ${Object.entries(exportsObj).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${m.source}; generated by extract-question-card.mjs.\n// Edit the extractor, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, m.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(name => !hostGlobals.has(name));
    if (foreign.length) throw Error(`${m.target}: unbound ${foreign.join(', ')}`);
    files[m.target] = text;
    manifest.modules.push({
      target: m.target, source: m.source, sourceSha256: sha(src.bytes), sha256: sha(text),
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      ...(m.innerRecords ? { inner: m.innerRecords } : {}),
      imports: [...m.imports].sort((a, b) => a[0].localeCompare(b[0])).map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: exportsObj,
    });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`question card output set changed: ${present.join(',')}. Run scripts/extract-question-card.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`question card source mismatch: ${name}. Run scripts/extract-question-card.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} question card modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractQuestionCard({ check: process.argv.includes('--check') });
