// Extract the Claude Desktop 3.6556.2 Code start card (cc43287c9 ele/PK and its Next steps Bce) without executing its
// desktop runtime.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted chunk. Each output lists
// its roots; Babel scope analysis then proves that every top-level name they reference is resolved: another binding
// emitted here (same chunk, or another chunk through that chunk's export table), a React export of vendor-frame checked
// against official.reactAliases (R3), a React Compiler helper published by the shared view-tabs graph (E3), a named host
// adapter in src/source-code-start-adapters.jsx, or a host constant written below. Each mapping states the original
// import (`file:alias`) it replaces, so a renamed or re-pointed minified import fails generation instead of silently
// binding the wrong value, and an unused mapping fails too.
//
// 3.6556.2 is React Compiler output: a component's memo slots and the callbacks the compiler hoisted out of it (`Jce`,
// `qce`, `AK`, ...) change names every release. Outputs marked `closure: true` therefore emit their roots plus every
// same-chunk top-level declaration those roots reach (E27); only roots are exported, and each root carries feature
// strings (R2/E5) so a minified name reused for something else fails.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot, looseFeature } = official;
const source = official.ionSource;
const output = path.join(root, 'src/generated/code-start');
const adapterModule = '../../source-code-start-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const loose = text => ({ loose: text });
const absent = text => ({ absent: text });

const chunk = {
  start: 'cc43287c9-Me-M2ucD.js',
  focus: 'c73f45bc3-B7hbL7H9.js',
  path: 'cc5c56f5c-BoRtnbt1.js',
  surface: 'c4a70913c-BfrWompY.js',
  home: 'shared-46-BIbZBGFq.js',
  basename: 'shared-52-uHFNjl7C.js',
  frame: official.sharedFrame,
  preview: 'shared-156-BLTosN8U.js',
  clawd: 'cc13f8cc7-BHF1aIvS.js',
};
const vendorFile = official.vendorFrame;
const via = (file, alias) => `${file}:${alias}`;
// `features` of an adapter or host mapping are checked against the declaration it replaces (in its own chunk).
const adapter = (from, name, features) => ({ via: from, adapter: name, features });
const host = (from, code, note, features) => ({ via: from, host: code, note, features });

// Bindings of each output. `exports` maps original local -> exported name (outputs import one another by these names).
const outputs = [
  { target: 'model.mjs', source: chunk.start,
    // Pure start-card model: measurement (yK..DK), dismissals (ece..rce, A5), ranking/grouping (C5..oce) and d5.
    exports: {
      yK: 'setupHiddenAttribute', bK: 'setupAttribute', xK: 'setupHiddenClassName', SK: 'environmentsAttribute', CK: 'promptOverlapRem',
      wK: 'placementSetupRows', TK: 'placementListGapRem', EK: 'setupRowsRem', DK: 'startCardPlacement',
      ece: 'dismissalsPrefKey', tce: 'dismissalsDefault', y5: 'unstampedDismissal', b5: 'dismissalHash', x5: 'dismissalEntryKey',
      S5: 'dismissalStamp', nce: 'isDismissed', rce: 'withDismissal', C5: 'startCardSeats', w5: 'blockerRowOrder', ace: 'startRowOrder',
      T5: 'blocksStartSend', E5: 'isLowPriorityRow', D5: 'startRowKey', O5: 'startRowRank', k5: 'startRowFamily', oce: 'startCardGroups',
      A5: 'startDismissKey', d5: 'startEntryFacts',
    } },
  { target: 'focus.mjs', source: chunk.focus, closure: true,
    // Ip/Lp: keep keyboard focus in the list after a row's dismiss (Lp's compiled closure hoists Rp).
    exports: { Ip: 'focusHeading', Lp: 'useDismissFocus' },
    imports: { D: host(via(chunk.frame, 'Iu'), 'e => (e?.nodeType === 1 ? e : null)', 'Iu: the node when it is an Element, else null.', ['e?.nodeType===1?e:null']) } },
  { target: 'path.mjs', source: chunk.path, exports: { t: 'tooltipProps', n: 'pathTooltip' } },
  { target: 'surface.mjs', source: chunk.surface, exports: { d: 'transcriptSurfaceClassName' } },
  { target: 'home-path.mjs', source: chunk.home, exports: { GL: 'homeRelativePath' } },
  { target: 'basename.mjs', source: chunk.basename, exports: { nk: 'environmentBasename' } },
  // The CDS popover surface (rounded-card + surface + shadow) and PreviewCard popup classes the host card adapter uses.
  { target: 'card-surface.mjs', source: chunk.frame, exports: { ig: 'cardSurfaceClassName', ng: 'surfaceBackgrounds', eg: 'surfaceKinds', tg: 'surfaceShadows', rg: 'forcedColorsBorder' } },
  { target: 'preview-card.mjs', source: chunk.preview, exports: { WU: 'previewCardClassName', GU: 'previewCardPadding' } },
  { target: 'environments.mjs', source: chunk.start,
    // Recent environments data: q5/Y5 activity keys, Qce last-used per key, $ce rows (local cwd shown ~-relative via GL).
    exports: { q5: 'environmentServerKey', Y5: 'environmentPlaceKey', Qce: 'environmentLastUsed', $ce: 'startEnvironmentRows' },
    // Recorded in the manifest: how the host feeds these bindings differently from the official stores.
    hostDifferences: [
      'D14: $ce items are the named environments (preset:<id>) followed by the local recent folders (code-start-host-model startEnvironmentItems); the official environmentItems has named environments only. The folders rank after Qce by the host folder activity.',
      'No cloud / bridge / pool / SSH targets on this host: $ce runs with sshOffered:false, sshLoaded:true, sshHosts:[], and Qce with startedPlaces:[].',
    ] },
  // R3-home (home-env-07): the draft page's Clawd. jfe is the ClawdLaptop className (2.42304.0 O7, unchanged); the
  // replay button's own classes are written inline in ClawdLaptopInner (cc13f8cc7) after the caller's className, so
  // they are sliced as a fragment. The sprite, its replay token and its loop stay with the host's SourcePet.
  { target: 'pet.mjs', source: chunk.start, exports: { jfe: 'clawdClassName' },
    fragments: [{ name: 'clawdReplayButtonClassName', source: chunk.clawd, pattern: /let [\w$]+=`\$\{[\w$]+\?\?""\} ([^`]+)`;/,
      note: 'ClawdLaptopInner replayOnClick: the button classes after `${className ?? ""}`' }],
    hostDifferences: [
      'The official draft page mounts the sprite in `relative h-0 pointer-events-none` with a layer-aware z-index; the host slot is .sc-pet-slot (relative, height 0, pointer-events none) with z-index 2. A CCR teleport draft shows the Clawd-Cloud image instead; the host has no CCR.',
      'ClawdLaptopInner (lottie, shouldAnimate, replayToken, listeningLoop) is the host SourcePet over the local lottie player; only its button markup and classes are the original.',
    ] },
  { target: 'view.mjs', source: chunk.start, closure: true,
    hostDifferences: [
      'zce (a suggested task’s Options: model / effort / permission / cloud) is () => null: the host never passes tasks.startContext, so W5 never reaches it.',
      'wce / hk / c5 / l5 / u5 / Yg / kg are host services: local approvals (ask from item/tool/requestUserInput), navigation, the local task backlog, startCardDismissals in localStorage.',
      'Qp (PreviewCard) and we (Popover) are host adapters over SourcePopover: no card handover, hover bootstrap or interactive Tab entry.',
      'The cloud auto environment row (ele `auto`, Uae: GrowthBook __gb__3124758682 plus anthropic_cloud/byoc remote environments) is off: the host has neither, never passes `auto`, so y8 and its po (server-sent copy 16trpb8/tlymh1) are unreachable (E13, HS-04).',
      '3.6556.2 shows waiting/resume rows in split panes too (the 2.42304.0 split-pane filter and its isSplitPane hook are gone); the host no longer feeds a split flag (HS-05).',
      'Rows started from a suggested task go through the local Send and stay here path (main.jsx sendMessage beside); the started session opens once its first turn started, not at dispatch.',
    ],
    exports: {
      ele: 'StartCard', X5: 'StartEnvironmentRow', PK: 'StartSlot', OK: 'useStartSlotMeasure', kK: 'measureStartSlot',
      s8: 'useStableEnvironmentOrder', Bce: 'StartNextSteps', W5: 'StartStepRow', H5: 'StartStep', _5: 'StartRow', v5: 'SelectedStartRow',
      g5: 'StartRowTip', jce: 'StartTaskPreview', P5: 'describeStartRow', Mce: 'describeStartFamily', N5: 'blockedReason',
      Nce: 'dismissRowLabel', M5: 'plainTip', F5: 'deleteTooltip', Pce: 'useStartRowHold', Fce: 'useStartRowsSettled',
      Ice: 'useShownStartRows', z5: 'startUsedKey', B5: 'startGroupKey', V5: 'startGroupBlocksSend', ice: 'useStartDismissals',
      m5: 'startRowClassName', h5: 'startRowDetailTone', Yse: 'startRowDetailClassName', Xse: 'startRowDetailSetClassName',
      Zse: 'startRowTrailingSpacerClassName', Qse: 'startRowTrailingClassName', $se: 'previewDelayMs', G5: 'startCardClassName',
      Yce: 'startCardDividerStyle', Xce: 'environmentsListAttributes', y8: 'autoEnvironmentName', Hce: 'popoverTriggerWrap',
      L5: 'noShownRows', R5: 'setupRowAttributes', Lce: 'noUsedRows', Rce: 'noTaskEdits', U5: 'noTaskState',
    },
    imports: {
      // Shared CDS components and the frontend's intl/navigation hooks -> local components and services.
      Se: adapter(via(chunk.frame, 'od'), 'StartIcon', ['customIcon']),
      B: adapter(via(chunk.frame, 'Eu'), 'StartButton', ['busyLabel', 'disabledReason']),
      ae: adapter(via(chunk.frame, 'Kl'), 'StartTooltip', ['secondaryHint', 'hoverable']),
      Ce: adapter(via(chunk.frame, 'ql'), 'StartTooltipGroup', ['closeDelay']),
      we: adapter(via(chunk.frame, 'ua'), 'StartPopover', ['Trigger:', 'Popup:', 'createHandle:']),
      Qp: adapter(via(chunk.preview, 'Ai'), 'StartPreviewCard', ['Root:', 'Trigger:', 'Popup:']),
      qd: adapter(via(official.vendorIntl, 'p'), 'useStartIntl'),
      Q: adapter(via(official.vendorIntl, 'l'), 'StartMessage'),
      hk: adapter(via('c26fb8b6b-B7Friu61.js', 'o'), 'useStartNavigation', ['useOpenLinkedSession']),
      Vo: adapter(via('shared-78-D5Fw2h0a.js', 'X_'), 'useStartSessionHref', ['encodeURIComponent(']),
      Ue: adapter(via('shared-25-DOWZRSlq.js', 'Kf'), 'startDragIntent', [loose('if (e === null && t === void 0) return')]),
      Yg: adapter(via('shared-28-DNYlf4wu.js', 'zc'), 'useStartPref', ['legacyLocalStorageKey', 'seedFromPref']),
      kg: adapter(via('shared-28-DNYlf4wu.js', 'Vc'), 'useStartPrefsSettled'),
      // Local declarations of cc43287c9 whose data comes from the official stores: host services instead.
      wce: adapter('local', 'useWaitingSessions', ['allSessions']),
      c5: adapter('local', 'startTaskTitle', ['"Untitled task"']),
      l5: adapter('local', 'startTaskDetail', ['e.tldr']),
      u5: adapter('local', 'startTaskPrompt', ['e.prompt']),
      // Host DOM helpers and the composer pane class (the local transcript pane has its own class name).
      ne: host(via(chunk.frame, 'Iu'), 'e => (e?.nodeType === 1 ? e : null)', 'Iu: the node when it is an Element, else null.', ['e?.nodeType===1?e:null']),
      Dt: host(via('shared-25-DOWZRSlq.js', 'lp'), 'e => e.ownerDocument.defaultView', 'lp: the element’s window.', ['??globalThis.window']),
      yt: host(via('shared-25-DOWZRSlq.js', 'cp'), 'e => Dt(e).ResizeObserver', 'cp: that window’s ResizeObserver.', ['?.ResizeObserver??globalThis.ResizeObserver']),
      Xl: host(via('shared-6-sd9jbJqs.js', 'md'), '"source-chat-tile-content"', 'md is "epitaxy-chat-panel"; the local composer pane is .source-chat-tile-content.', ['"epitaxy-chat-panel"']),
      // y8's secret-copy lookup: only reachable when ele gets `auto.offered`, which this host never passes (HS-04).
      po: host(via('shared-78-D5Fw2h0a.js', 'Is'), '() => ""', 'Is: server-sent (secret) copy; unreachable without the cloud auto row.', ['dangerouslyVisiblePublicValues']),
      // Analytics-only callbacks (shown/press/dismiss events): no UI effect, never contact the official service.
      wJ: host('local', '() => {}', 'wJ: start-card shown analytics.', ['bJ.delete(e)']),
      EJ: host('local', '() => {}', 'EJ: start-card press analytics.'),
      DJ: host('local', '() => {}', 'DJ: start-card dismiss analytics.'),
      // zce: a suggested task's Options (model/effort/permission/cloud). W5 renders it only when `tasks.startContext`
      // is set; the host never passes startContext (no settings rail or cloud), so the official branch is unreachable.
      zce: host('local', '() => null', 'zce: task Options, unreachable without tasks.startContext.', ['recheckCloud']),
    } },
];
const hostOrder = ['ne', 'Dt', 'yt', 'Xl', 'D', 'po', 'wJ', 'EJ', 'DJ', 'zce'];

// Feature strings per root (R2): literals, keys, data-*, classes and i18n ids; `loose` for statements with minified
// names; `absent` for text the binding must no longer contain.
const signatures = {
  'model.mjs': {
    yK: ['"data-start-card-setup-hidden"'], bK: ['"data-start-card-setup"'], SK: ['"data-start-card-environments"'], CK: ['2.75'],
    EK: ['0.125', '0.75'], DK: ['setupFits', 'foot', 'list', 'rem'],
    ece: ['"startCardDismissals"'], rce: ['99'], ace: ['"waiting-session",\n    "resume-session",\n    "worktree-apart"'],
    E5: ['"connect-github"', '"cli-import"', '"auto-mode"'], k5: ['"blocked-sessions"', '"suggested-tasks"'],
    oce: ['seats', '"rest"', 'whole'], A5: ['"continue-branch"'], d5: ['keyboard'],
  },
  'focus.mjs': { Lp: ['[data-row-dismiss]', ':focus-visible'] },
  'path.mjs': { t: ['max-w-[min(480px,var(--available-width))]'], n: ['whitespace-pre-wrap'] },
  'surface.mjs': { d: ['--epitaxy-transcript-surface'] },
  'home-path.mjs': { GL: ['\\/Users\\/', '~'] },
  'pet.mjs': { jfe: ['absolute right-[-13px] bottom-[calc(var(--cds-ring-outer,0px)-144px/11)] w-[80px] h-[80px] -scale-x-100'] },
  'card-surface.mjs': { ig: ['rounded-card'] },
  'preview-card.mjs': { WU: ['--preview-card-max-w', 'draggable-none'] },
  'environments.mjs': { q5: ['`cloud:${'], Y5: ['`pool:${', '`ssh:${'], Qce: ['startedPlaces'], $ce: ['sshOffered'] },
  'view.mjs': {
    ele: ['"epitaxy-start-card"', '"Recent environments"', '"Choose environment"', '"start-card-auto"', '"start-card-choose"', '...Xce'],
    X5: ['"start-card-environment"', '"aria-current": f', '"px-1 pt-0.5 first:pt-1"'],
    PK: ['max-h-0 grow basis-0', 'pb-6', '"aria-hidden": !0'], OK: ['return kK'], kK: ['.epitaxy-prompt', '--cds-rem-scale', 'maxHeight', 'paddingBottom'],
    Bce: ['"Next steps"', '"start-card-setup"', 'startContext', 'onDeleteAll', absent('isSplitPane')],
    G5: ['shadow-card-ring', absent('data-landing-texture')], Xce: ['[SK]: ""'],
    P5: ['<status>Blocked</status> {title}', 'Edit \\u201C{title}\\u201D before starting'],
    Mce: ['Claude is blocked in', 'suggested task', 'dismissTooltip'], N5: ['"Asked a question"', '"Needs permission"', '"Hit an error"'],
    jce: ['Starts now in {folder}', 'Scroll to the end to start it now.'], g5: ['--preview-card-max-w', 'delay: $se'],
    _5: ['group/row', 'CaretDown', 'm.tooltip ??', '"TDaF6JVgG6"'], H5: ['tooltip.text', 'suggested-task'], F5: ['"Delete"', '"K3r6DQW7h+"'],
    y8: ['"16trpb8"', '"tlymh1"'], Hce: ['we.Trigger'], $se: ['800'], ice: ['settled'], Pce: ['recheckPointer'], Fce: ['hasRows'],
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

const declarationText = (chunkRecord, name) => {
  const p = chunkRecord.program.scope.getBinding(name)?.path;
  return p ? chunkRecord.code.slice(p.node.start, p.node.end) : undefined;
};
const squash = text => text.replace(/\s+/g, '');
function assertFeatures(label, text, features = []) {
  for (const feature of features) {
    const ok = typeof feature === 'string' ? text.includes(feature) || squash(text).includes(squash(feature))
      : feature.loose ? looseFeature(feature.loose).test(text)
        : !text.includes(feature.absent);
    if (!ok) throw Error(`${label} ${feature.absent ? 'still contains' : 'lost its feature string'} ${JSON.stringify(feature.loose ?? feature.absent ?? feature)}`);
  }
}

// E3: the React Compiler helpers are published once by the view-tabs graph; generated code imports them from there.
async function compilerHelperNames() {
  const manifest = await viewTabsManifestFor(referenceVersion);
  const names = new Map();
  for (const [alias, { local, name }] of Object.entries(official.compilerHelpers)) {
    const entry = manifest.publicNames?.[name];
    if (entry?.file !== official.sharedFrame || entry.export !== alias || entry.local !== local)
      throw Error(`view-tabs does not publish ${name} as ${official.sharedFrame}:${alias} (${local})`);
    names.set(alias, name);
  }
  return names;
}

export async function extractCodeStart({ check = false } = {}) {
  const cache = new Map();
  const vendorChunk = await readChunk(vendorFile, cache);
  const helpers = await compilerHelperNames();
  official.assertCompilerHelpers((await readChunk(official.sharedFrame, cache)).bytes.toString());
  const owners = new Map(); // `${source}\0${local}` -> output spec
  for (const spec of outputs) for (const local of Object.keys(spec.exports)) owners.set(`${spec.source}\0${local}`, spec);
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-code-start.mjs', adapterModule: 'src/source-code-start-adapters.jsx', outputs: [] };
  const files = {};
  for (const spec of outputs) {
    const src = await readChunk(spec.source, cache);
    const names = Object.keys(spec.exports);
    const mapped = spec.imports ?? {};
    const selected = new Map(), imports = new Map(), hosts = new Map(), used = new Set();
    const select = name => {
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: missing original binding ${spec.source}:${name}`);
      const p = binding.path;
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: ${name} is not a top-level declaration`);
      selected.set(name, p);
    };
    for (const name of names) select(name);
    const resolve = async name => {
      const binding = src.program.scope.getBinding(name), p = binding.path;
      const original = p.isImportSpecifier() ? via(p.parent.source.value.replace(/^\.\//, ''), p.node.imported.name) : 'local';
      const mapping = mapped[name];
      if (mapping) {
        if (mapping.via !== original) throw Error(`${spec.target}: ${name} is ${original}, mapped as ${mapping.via}`);
        used.add(name);
        if (mapping.features) {
          let text;
          if (original === 'local') text = declarationText(src, name);
          else {
            const [file, alias] = original.split(':');
            const dep = await readChunk(file, cache);
            text = declarationText(dep, dep.exported.get(alias));
          }
          assertFeatures(`${spec.target}: ${name} (${original})`, text ?? '', mapping.features);
        }
        if (mapping.adapter) imports.set(name, { from: adapterModule, name: mapping.adapter, via: original, kind: 'adapter' });
        else hosts.set(name, { code: mapping.host, via: original, note: mapping.note });
        return false;
      }
      if (original === 'local') {
        const owner = owners.get(`${spec.source}\0${name}`);
        if (owner && owner !== spec) {
          imports.set(name, { from: `./${owner.target}`, name: owner.exports[name], via: `${spec.source}:${name}`, kind: 'generated' });
          return false;
        }
        if (!spec.closure) throw Error(`${spec.target}: unresolved local reference ${spec.source}:${name}`);
        select(name);
        return true;
      }
      const [file, alias] = original.split(':');
      if (file === vendorFile) {
        const member = official.reactAliases[alias];
        if (!member) throw Error(`${spec.target}: unmapped vendor-frame import ${alias}`);
        official.assertVendorAlias(vendorChunk.bytes.toString(), alias, member);
        imports.set(name, { from: member[0], name: member[1], via: original, kind: 'react' });
        return false;
      }
      if (file === official.sharedFrame && helpers.has(alias)) {
        imports.set(name, { from: `../view-tabs/${file}`, name: helpers.get(alias), via: original, kind: 'view-tabs' });
        return false;
      }
      const dep = await readChunk(file, cache);
      const local = dep.exported.get(alias);
      const owner = local && owners.get(`${file}\0${local}`);
      if (!owner) throw Error(`${spec.target}: unresolved import ${name} <- ${original}`);
      imports.set(name, { from: `./${owner.target}`, name: owner.exports[local], via: original, kind: 'generated' });
      return false;
    };
    // Walk references until no new same-chunk declaration joins (closure outputs grow `selected` as they go).
    const resolved = new Set();
    for (let pending = [...selected.values()]; pending.length;) {
      const references = new Set();
      for (const p of pending) p.traverse({
        ReferencedIdentifier(r) { if (r.scope.getBinding(r.node.name)?.scope === src.program.scope) references.add(r.node.name); },
      });
      pending = [];
      for (const name of [...references].sort()) {
        if (selected.has(name) || resolved.has(name)) continue;
        resolved.add(name);
        if (await resolve(name)) pending.push(selected.get(name));
      }
    }
    // The one host constant that uses another (yt reads Dt's window) needs it emitted too.
    if (hosts.has('yt') && !hosts.has('Dt')) throw Error(`${spec.target}: host yt needs host Dt`);
    const unused = Object.keys(mapped).filter(name => !used.has(name));
    if (unused.length) throw Error(`${spec.target}: mappings no longer referenced: ${unused.join(', ')}`);
    // Feature strings: each must sit in the binding it identifies, so a minified name reused for something else fails.
    for (const [name, needles] of Object.entries(signatures[spec.target] ?? {})) {
      if (!spec.exports[name]) throw Error(`${spec.target}: feature for ${name}, which is not a root`);
      assertFeatures(`${spec.target}: ${spec.source}:${name}`, src.code.slice(selected.get(name).node.start, selected.get(name).node.end), needles);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => (p.isVariableDeclarator() ? `var ${src.code.slice(p.node.start, p.node.end)};` : src.code.slice(p.node.start, p.node.end)));
    const groups = new Map();
    for (const [local, entry] of [...imports].sort((a, b) => a[1].from.localeCompare(b[1].from))) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, list]) => `import { ${list.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const emitHosts = hostOrder.filter(name => hosts.has(name));
    if (emitHosts.length !== hosts.size) throw Error(`${spec.target}: host constant without an emit order`);
    const hostText = emitHosts.map(name => `// ${hosts.get(name).note} (${hosts.get(name).via})\nconst ${name} = ${hosts.get(name).code};`).join('\n');
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
      bindings: order.map(([name, p]) => ({ name, ...(spec.exports[name] ? { export: spec.exports[name] } : { closure: true }), sha256: sha(src.code.slice(p.node.start, p.node.end)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind })),
      hosts: emitHosts.map(name => ({ local: name, via: hosts.get(name).via, code: hosts.get(name).code })),
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
