// Extract the installed Claude Desktop 2.42304.0 Code start card (cc43287c9 p6/hG and its Next steps a6) without
// executing its desktop runtime.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted chunk. Each output lists
// its bindings; Babel scope analysis then proves that every top-level name they reference is resolved: another binding
// emitted here (same chunk, or another chunk through that chunk's export table), a React export of vendor-frame checked
// against its `local=<ns>.<member>` assignment, a named host adapter in src/source-code-start-adapters.jsx, or a host
// constant written below. Each mapping states the original import (`file:alias`) it replaces, so a renamed or re-pointed
// minified import fails generation instead of silently binding the wrong value, and an unused mapping fails too.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = '2.42304.0';
const referenceSnapshot = 'installed-2.42304.0-20261017';
const source = path.resolve(root, '../reference', referenceSnapshot, 'ion-dist/assets/v1');
const output = path.join(root, 'src/generated/code-start');
const adapterModule = '../../source-code-start-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

const chunk = {
  start: 'cc43287c9-DAfOi8yP.js',
  focus: 'c73f45bc3-CFrHin0p.js',
  path: 'c0fbbe82d-BOWKSems.js',
  surface: 'c4a70913c-C9EYof6i.js',
  home: 'shared-19-CkPOiIKm.js',
  basename: 'shared-52-DGviI8xb.js',
  frame: 'shared-frame-BfjMqbuN.js',
  preview: 'shared-156-Bikz018e.js',
  clawd: 'cc13f8cc7--_rF5jpy.js',
};
// vendor-frame re-exports React; each alias is checked against its `local=<ns>.<member>` assignment in the chunk.
const vendorFile = 'vendor-frame-DfPJ1QmD.js';
const vendor = {
  Co: ['react', 'useState'], So: ['react', 'useRef'], bo: ['react', 'useMemo'], uo: ['react', 'useCallback'],
  mo: ['react', 'useEffect'], yo: ['react', 'useLayoutEffect'], go: ['react', 'useId'], oo: ['react', 'memo'],
  to: ['react', 'createElement'], Ba: ['react', 'Fragment'], Va: ['react/jsx-runtime', 'jsx'], Ha: ['react/jsx-runtime', 'jsxs'],
};
const via = (file, alias) => `${file}:${alias}`;
const adapter = (from, name) => ({ via: from, adapter: name });
const host = (from, code, note) => ({ via: from, host: code, note });

// Bindings of each output. `exports` maps original local -> exported name (outputs import one another by these names).
const outputs = [
  { target: 'model.mjs', source: chunk.start,
    // Pure start-card model: measurement (oG..dG), dismissals (r3..u3, S3), ranking/grouping (f3..x3) and A4.
    exports: {
      oG: 'setupHiddenAttribute', sG: 'setupAttribute', cG: 'setupHiddenClassName', lG: 'promptOverlapRem', uG: 'placementMarginPx',
      dG: 'startCardPlacement', r3: 'dismissalsPrefKey', i3: 'dismissalsDefault', a3: 'unstampedDismissal', o3: 'dismissalHash',
      s3: 'dismissalEntryKey', c3: 'dismissalStamp', l3: 'isDismissed', u3: 'withDismissal', f3: 'startCardSeats',
      p3: 'blockerRowOrder', m3: 'startRowOrder', h3: 'blocksStartSend', g3: 'isSessionRow', _3: 'isLowPriorityRow',
      v3: 'startRowKey', y3: 'startRowRank', b3: 'startRowFamily', x3: 'startCardGroups', S3: 'startDismissKey', A4: 'startEntryFacts',
    } },
  { target: 'focus.mjs', source: chunk.focus,
    // bd/xd: keep keyboard focus in the list after a row's dismiss (moved here from cc43287c9 Tz/Ez in 2.42304.0).
    exports: { bd: 'focusHeading', xd: 'useDismissFocus' },
    imports: { vn: host(via(chunk.frame, 'vl'), 'e => (e?.nodeType === 1 ? e : null)', 'vl: the node when it is an Element, else null.') } },
  { target: 'path.mjs', source: chunk.path, exports: { mn: 'tooltipProps', hn: 'pathTooltip' } },
  { target: 'surface.mjs', source: chunk.surface, exports: { f: 'transcriptSurfaceClassName' } },
  { target: 'home-path.mjs', source: chunk.home, exports: { F7: 'homeRelativePath' } },
  { target: 'basename.mjs', source: chunk.basename, exports: { n_: 'environmentBasename' } },
  // The CDS popover surface (rounded-card + surface + shadow) and PreviewCard popup classes the host card adapter uses.
  { target: 'card-surface.mjs', source: chunk.frame, exports: { ah: 'cardSurfaceClassName', rh: 'surfaceBackgrounds', th: 'surfaceKinds', nh: 'surfaceShadows', ih: 'forcedColorsBorder' } },
  { target: 'preview-card.mjs', source: chunk.preview, exports: { hR: 'previewCardClassName', gR: 'previewCardPadding' } },
  { target: 'environments.mjs', source: chunk.start,
    // Recent environments data: c6/u6 activity keys, d6 last-used per key, f6 rows (local cwd shown ~-relative via F7).
    exports: { c6: 'environmentServerKey', u6: 'environmentPlaceKey', d6: 'environmentLastUsed', f6: 'startEnvironmentRows' },
    // Recorded in the manifest: how the host feeds these bindings differently from the official stores.
    hostDifferences: [
      'D14: f6 items are the named environments (preset:<id>) followed by the local recent folders (code-start-host-model startEnvironmentItems); the official T2.environmentItems has named environments only. The folders rank after d6 by the host folder activity.',
      'No cloud / bridge / pool / SSH targets on this host: f6 runs with sshOffered:false, sshLoaded:true, sshHosts:[], and d6 with startedPlaces:[].',
    ] },
  // R3-home (home-env-07): the draft page's Clawd. O7 is k7's ClawdLaptop className (2.37337.1 A4, unchanged); the
  // replay button's own classes are written inline in ClawdLaptopInner (cc13f8cc7, LB = IB.Component's lazy chunk) after
  // the caller's className, so they are sliced as a fragment. The sprite, its replay token and its loop stay with the
  // host's SourcePet (the lottie player is the host's).
  { target: 'pet.mjs', source: chunk.start, exports: { O7: 'clawdClassName' },
    fragments: [{ name: 'clawdReplayButtonClassName', source: chunk.clawd, pattern: /className:`\$\{r\?\?""\} ([^`]+)`,children:S\}/,
      note: 'ClawdLaptopInner replayOnClick: the button classes after `${className ?? ""}`' }],
    hostDifferences: [
      'k7 mounts the sprite in `relative h-0 pointer-events-none ${Nl}` with a layer-aware z-index (rd(2)); the host slot is .sc-pet-slot (relative, height 0, pointer-events none) with z-index 2. V$ (a CCR teleport draft) shows the Clawd-Cloud image instead; the host has no CCR.',
      'ClawdLaptopInner (lottie via c6e52127a, shouldAnimate, replayToken, listeningLoop) is the host SourcePet over the local lottie player; only its button markup and classes are the original.',
    ] },
  { target: 'view.mjs', source: chunk.start,
    hostDifferences: [
      'r6 (a suggested task’s Options: model / effort / permission / cloud) is () => null: the host never passes tasks.startContext, so i6 never reaches it.',
      'P3 / PO / E4 / D4 / O4 / Pf / Lf / Uu are host services: local approvals (ask from item/tool/requestUserInput), navigation, the local task backlog, startCardDismissals in localStorage, the local split view.',
      'Kn (PreviewCard) and sd (Popover) are host adapters over SourcePopover: no card handover, hover bootstrap or interactive Tab entry.',
      'B4 startBesideDraft is the local Send and stay here path (main.jsx sendMessage beside); the started session opens once its first turn started, not at dispatch. H4 start answers staged without the official submit-after-prefill, which only runs when B4 is blocked and the local send would refuse then too.',
    ],
    exports: {
      p6: 'StartCard', hG: 'StartSlot', fG: 'useStartSlotMeasure', p0: 'useStableEnvironmentOrder', a6: 'StartNextSteps', i6: 'StartStepRow',
      e6: 'StartStep', t3: 'StartRow', n3: 'SelectedStartRow', e3: 'StartRowTip', L3: 'StartTaskPreview', z3: 'describeStartRow',
      B3: 'describeStartFamily', R3: 'blockedReason', V3: 'dismissRowLabel', F3: 'plainTip', W3: 'useStartRowHold', G3: 'useStartRowsSettled',
      q3: 'useShownStartRows', X3: 'startUsedKey', Q3: 'startGroupKey', $3: 'startGroupBlocksSend', d3: 'useStartDismissals',
      W4: 'startRowClassName', G4: 'startRowDetailTone', q4: 'startRowDetailClassName', Y4: 'startRowDetailSetClassName',
      X4: 'startRowTrailingSpacerClassName', Q4: 'startRowTrailingClassName', $4: 'previewDelayMs', o6: 'startCardClassName',
      s6: 'startCardDividerStyle', H3: 'noShownRows', U3: 'setupRowAttributes', Y3: 'noUsedRows', t6: 'noTaskEdits', n6: 'noTaskState',
    },
    imports: {
      // Shared CDS components and the frontend's intl/navigation hooks -> local components and services.
      Zu: adapter(via(chunk.frame, 'Hl'), 'StartIcon'),
      fd: adapter(via(chunk.frame, 'cl'), 'StartButton'),
      td: adapter(via(chunk.frame, 'Oc'), 'StartTooltip'),
      yd: adapter(via(chunk.frame, 'kc'), 'StartTooltipGroup'),
      sd: adapter(via(chunk.frame, 'Zi'), 'StartPopover'),
      Kn: adapter(via(chunk.preview, 'Ei'), 'StartPreviewCard'),
      Q: adapter(via('vendor-intl-Db7hDWRO.js', 'p'), 'useStartIntl'),
      Z: adapter(via('vendor-intl-Db7hDWRO.js', 'l'), 'StartMessage'),
      Uu: adapter(via('shared-2-Cb74JByF.js', 'qh'), 'useStartSplitPane'),
      PO: adapter(via('c26fb8b6b-DfPeiuGP.js', 'o'), 'useStartNavigation'),
      pa: adapter(via('shared-78-D6VXYXaQ.js', 'dr'), 'useStartSessionHref'),
      Te: adapter(via('shared-25-DP8p7i1Z.js', '_f'), 'startDragIntent'),
      Pf: adapter(via('shared-28-DcgD7xXH.js', 'fs'), 'useStartPref'),
      Lf: adapter(via('shared-28-DcgD7xXH.js', 'ms'), 'useStartPrefsSettled'),
      // Local declarations of cc43287c9 whose data comes from the official stores: host services instead.
      P3: adapter('local', 'useWaitingSessions'),
      E4: adapter('local', 'startTaskTitle'),
      D4: adapter('local', 'startTaskDetail'),
      O4: adapter('local', 'startTaskPrompt'),
      // Host DOM helpers and the composer pane class (the local transcript pane has its own class name).
      Od: host(via(chunk.frame, 'vl'), 'e => (e?.nodeType === 1 ? e : null)', 'vl: the node when it is an Element, else null.'),
      ge: host(via('shared-25-DP8p7i1Z.js', 'Pf'), 'e => e.ownerDocument.defaultView', 'Pf: the element’s window.'),
      me: host(via('shared-25-DP8p7i1Z.js', 'Nf'), 'e => ge(e).ResizeObserver', 'Nf: that window’s ResizeObserver.'),
      Jc: host(via('shared-6-Cby4X-ms.js', 'Ju'), '"source-chat-tile-content"', 'Ju is "epitaxy-chat-panel"; the local composer pane is .source-chat-tile-content.'),
      // Analytics-only callbacks (shown/press/dismiss events): no UI effect, never contact the official service.
      MK: host('local', '() => {}', 'MK: start-card shown analytics.'),
      PK: host('local', '() => {}', 'PK: start-card press analytics.'),
      FK: host('local', '() => {}', 'FK: start-card dismiss analytics.'),
      // r6: a suggested task's Options (model/effort/permission/cloud). i6 renders it only when `tasks.startContext`
      // is set; the host never passes startContext (no settings rail or cloud), so the official branch is unreachable.
      r6: host('local', '() => null', 'r6: task Options, unreachable without tasks.startContext.'),
    } },
];

// Feature strings per binding (see the migration notes: the minified names change every release).
const signatures = {
  'model.mjs': {
    oG: ['"data-start-card-setup-hidden"'], sG: ['"data-start-card-setup"'], lG: ['2.75'], uG: ['24'], dG: ['setupFits'],
    r3: ['"startCardDismissals"'], u3: ['99'], m3: ['"waiting-session",\n    "resume-session",\n    "worktree-apart"'],
    _3: ['"connect-github"', '"cli-import"', '"auto-mode"'], b3: ['"blocked-sessions"', '"suggested-tasks"'],
    x3: ['seats', '"rest"', 'whole'], S3: ['"continue-branch"'], A4: ['keyboard'],
  },
  'focus.mjs': { xd: ['[data-row-dismiss]', ':focus-visible'] },
  'path.mjs': { mn: ['max-w-[min(480px,var(--available-width))]'], hn: ['whitespace-pre-wrap'] },
  'surface.mjs': { f: ['--epitaxy-transcript-surface'] },
  'home-path.mjs': { F7: ['\\/Users\\/', '~'] },
  'pet.mjs': { O7: ['absolute right-[-13px] bottom-[calc(var(--cds-ring-outer,0px)-144px/11)] w-[80px] h-[80px] -scale-x-100'] },
  'card-surface.mjs': { ah: ['rounded-card'] },
  'preview-card.mjs': { hR: ['--preview-card-max-w', 'draggable-none'] },
  'environments.mjs': { c6: ['`cloud:${'], u6: ['`pool:${', '`ssh:${'], d6: ['startedPlaces'], f6: ['sshOffered'] },
  'view.mjs': {
    p6: ['"epitaxy-start-card"', '"Recent environments"', '"Choose environment"'], hG: ['pb-6'], fG: ['.epitaxy-prompt', '--cds-rem-scale'],
    a6: ['"Next steps"', '"start-card-setup"', 'startContext', 'onDeleteAll'], o6: ['[[data-landing-texture=canvas]~div_&]', 'shadow-card-ring'],
    z3: ['<status>Blocked</status> {title}', 'Edit \\u201C{title}\\u201D before starting'],
    B3: ['Claude is blocked in', 'suggested task'], R3: ['"Asked a question"', '"Needs permission"', '"Hit an error"'],
    L3: ['Starts now in {folder}', 'Scroll to the end to start it now.'], e3: ['--preview-card-max-w', 'delay: $4'],
    t3: ['group/row', 'CaretDown'], $4: ['800'], d3: ['settled'], W3: ['recheckPointer'], G3: ['hasRows'],
  },
};

async function readChunk(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, code, program, exported };
  cache.set(name, record);
  return record;
}

function vendorImport(alias, vendorChunk) {
  const target = vendor[alias];
  if (!target) throw Error(`Unmapped vendor-frame import ${alias}`);
  const local = vendorChunk.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${target[1]}\\b`).test(vendorChunk.bytes.toString()))
    throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
  return target;
}

export async function extractCodeStart({ check = false } = {}) {
  const cache = new Map();
  const vendorChunk = await readChunk(vendorFile, cache);
  const owners = new Map(); // `${source}\0${local}` -> output spec
  for (const spec of outputs) for (const local of Object.keys(spec.exports)) owners.set(`${spec.source}\0${local}`, spec);
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-code-start.mjs', adapterModule: 'src/source-code-start-adapters.jsx', outputs: [] };
  const files = {};
  for (const spec of outputs) {
    const src = await readChunk(spec.source, cache);
    const names = Object.keys(spec.exports);
    const mapped = spec.imports ?? {};
    const selected = new Map(), imports = new Map(), hosts = new Map(), used = new Set();
    for (const name of names) {
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: missing original binding ${spec.source}:${name}`);
      const p = binding.path;
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: ${name} is not a top-level declaration`);
      selected.set(name, p);
    }
    const resolve = async name => {
      const binding = src.program.scope.getBinding(name), p = binding.path;
      const original = p.isImportSpecifier() ? via(p.parent.source.value.replace(/^\.\//, ''), p.node.imported.name) : 'local';
      const mapping = mapped[name];
      if (mapping) {
        if (mapping.via !== original) throw Error(`${spec.target}: ${name} is ${original}, mapped as ${mapping.via}`);
        used.add(name);
        if (mapping.adapter) imports.set(name, { from: adapterModule, name: mapping.adapter, via: original, kind: 'adapter' });
        else hosts.set(name, { code: mapping.host, via: original, note: mapping.note });
        return;
      }
      if (original === 'local') {
        const owner = owners.get(`${spec.source}\0${name}`);
        if (!owner || owner === spec) throw Error(`${spec.target}: unresolved local reference ${spec.source}:${name}`);
        imports.set(name, { from: `./${owner.target}`, name: owner.exports[name], via: `${spec.source}:${name}`, kind: 'generated' });
        return;
      }
      const [file, alias] = original.split(':');
      if (file === vendorFile) {
        const [from, member] = vendorImport(alias, vendorChunk);
        imports.set(name, { from, name: member, via: original, kind: 'react' });
        return;
      }
      const dep = await readChunk(file, cache);
      const local = dep.exported.get(alias);
      const owner = local && owners.get(`${file}\0${local}`);
      if (!owner) throw Error(`${spec.target}: unresolved import ${name} <- ${original}`);
      imports.set(name, { from: `./${owner.target}`, name: owner.exports[local], via: original, kind: 'generated' });
    };
    const references = new Set();
    for (const [, p] of selected) p.traverse({
      ReferencedIdentifier(r) { if (r.scope.getBinding(r.node.name)?.scope === src.program.scope) references.add(r.node.name); },
    });
    for (const name of [...references].sort()) if (!selected.has(name)) await resolve(name);
    // The one host constant that uses another (me reads ge's window) needs it emitted too.
    if (hosts.has('me') && !hosts.has('ge')) throw Error(`${spec.target}: host me needs host ge`);
    const unused = Object.keys(mapped).filter(name => !used.has(name));
    if (unused.length) throw Error(`${spec.target}: mappings no longer referenced: ${unused.join(', ')}`);
    // Feature strings: each must sit in the binding it identifies, so a minified name reused for something else fails.
    for (const [name, needles] of Object.entries(signatures[spec.target] ?? {})) {
      const body = src.code.slice(selected.get(name).node.start, selected.get(name).node.end);
      for (const needle of needles) if (!body.includes(needle)) throw Error(`${spec.target}: ${spec.source}:${name} lost its feature string ${JSON.stringify(needle)}`);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => (p.isVariableDeclarator() ? `var ${src.code.slice(p.node.start, p.node.end)};` : src.code.slice(p.node.start, p.node.end)));
    const groups = new Map();
    for (const [local, entry] of [...imports].sort((a, b) => a[1].from.localeCompare(b[1].from))) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, list]) => `import { ${list.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const hostOrder = ['Od', 'ge', 'me', 'Jc', 'vn', 'MK', 'PK', 'FK', 'r6'].filter(name => hosts.has(name));
    if (hostOrder.length !== hosts.size) throw Error(`${spec.target}: host constant without an emit order`);
    const hostText = hostOrder.map(name => `// ${hosts.get(name).note} (${hosts.get(name).via})\nconst ${name} = ${hosts.get(name).code};`).join('\n');
    // Inline class strings (no top-level binding): each pattern must match the shipped bytes exactly once.
    const fragments = [];
    for (const fragment of spec.fragments ?? []) {
      const dep = await readChunk(fragment.source, cache), raw = dep.bytes.toString();
      const found = [...raw.matchAll(new RegExp(fragment.pattern.source, 'g'))];
      if (found.length !== 1) throw Error(`${spec.target}: ${fragment.source} fragment ${fragment.name} matched ${found.length} times`);
      fragments.push({ ...fragment, value: found[0][1], sourceSha256: sha(dep.bytes) });
    }
    const fragmentText = fragments.map(f => `// ${f.note} (${f.source})\nconst ${f.name} = ${JSON.stringify(f.value)};`).join('\n');
    const exportText = `export { ${[...Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`), ...fragments.map(f => f.name)].join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-code-start.mjs.\n// Edit the extractor or src/source-code-start-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${hostText}\n${blocks.join('\n')}\n${fragmentText ? `${fragmentText}\n` : ''}${exportText}\n`, { parser: 'babel' });
    files[spec.target] = text;
    manifest.outputs.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text),
      bindings: order.map(([name, p]) => ({ name, export: spec.exports[name], sha256: sha(src.code.slice(p.node.start, p.node.end)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind })),
      hosts: hostOrder.map(name => ({ local: name, via: hosts.get(name).via, code: hosts.get(name).code })),
      ...(fragments.length ? { fragments: fragments.map(f => ({ name: f.name, source: f.source, sourceSha256: f.sourceSha256, sha256: sha(f.value) })) } : {}),
      ...(spec.hostDifferences ? { hostDifferences: spec.hostDifferences } : {}),
    });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output)).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Start-card output set changed: ${present.join(',')}. Run scripts/extract-code-start.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Start-card source mismatch: ${name}. Run scripts/extract-code-start.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.outputs.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${count} original start-card bindings (${referenceVersion}) in ${manifest.outputs.length} modules.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractCodeStart({ check: process.argv.includes('--check') });
