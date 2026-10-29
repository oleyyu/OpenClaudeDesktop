// R2-appswitch W3 (research/app-switch.md W3, §1.9), migrated to 3.6556.2 by W2 w2-titlebar-current
// (analysis/claude-3.6556.2-migrate-20261025/research/titlebar-frame.md §1.1/§3.2): pins for the ⌥⌘←/→ surface chord
// helpers that scripts/extract-code-ui-current.mjs emits from the 3.6556.2 renderer. The emit slices a hand-listed
// binding set; before it runs, this module checks that the set is exactly the same-chunk closure of the roots the helper
// exports, that every binding still carries feature strings of its original text (literals, keys, selectors; no
// minified statements, R2), that the chunk still exports the roots under the official aliases its consumers import, and
// that each replaced import still names the same export of its chunk. It also slices the two shortcut tables of
// shared-1 LV (`chorus_surface_prev` / `chorus_surface_next` .shortcut.bindings) out of the source, so the binding data
// the matcher GV compares against is the original, not a restatement.
import fs from 'node:fs/promises';
import path from 'node:path';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import { looseFeature } from './official-3.6556.2.mjs';

export const surfaceChordPins = {
  // shared-156 qK (exported `_r`): the modal layer selector JV/YV extend; GK/UK are the ask-user banner selectors.
  'surface-chord-layers.mjs': {
    source: 'shared-156-BLTosN8U.js', roots: ['qK'], bindings: ['UK', 'GK', 'qK'], officialExports: { _r: 'qK', gr: 'UK', mr: 'GK' },
    features: {
      UK: ['"[data-ask-user-input-banner]"'], GK: [':not([data-chromeless])'],
      qK: ['[role="menu"],[role="listbox"],[role="dialog"],[role="alertdialog"],dialog[open],'],
    },
  },
  // shared-78 Eo (exported `mE`): the macOS user-agent test. shared-1 imports it as `so` (eH: AltGraph only blocks off a
  // Mac). The source is /(macintosh|macintel|macppc|mac68k|macos)/i.
  'surface-chord-platform.mjs': {
    source: 'shared-78-D5Fw2h0a.js', roots: ['Eo'], bindings: ['To', 'Eo'], officialExports: { mE: 'Eo' },
    features: { To: ['/(macintosh|macintel|macppc|mac68k|macos)/i'], Eo: ['typeof window > "u"', 'window.navigator.userAgent.toLowerCase()'] },
  },
  // shared-1 eH (`On`): the chord direction (repeat, AltGraph and modal-layer guards, RTL swap); oH (`kn`): the next
  // mode in the list, no wrap; GV: the useShortcut binding matcher that it("chorus_surface_*") runs. 3.6556.2 adds a
  // `host` / `doc` option to QV (the open-layer test, exported `jn`) and a `host` to HP (`Ji`) for popout windows;
  // eH calls tH → QV({passiveLayers: !0}) without them, so the document is shared-25 ap (ownerDocument, imported as
  // Ze) of null: globalThis.document, as in 2.42304.0.
  'surface-chord.mjs': {
    source: 'shared-1-BJhqMmkf.js', roots: ['eH', 'oH', 'GV'],
    bindings: ['FP', 'RP', 'zP', 'HP', 'qV', 'JV', 'YV', 'ZV', 'QV', 'tH', 'GV', 'eH', 'oH'],
    officialExports: { On: 'eH', kn: 'oH', En: 'tH', jn: 'QV', Ji: 'HP' },
    imports: { so: 'shared-78-D5Fw2h0a.js:mE', Ze: 'shared-25-DOWZRSlq.js:ap', Ws: 'shared-156-BLTosN8U.js:_r' },
    dependencies: {
      'shared-156-BLTosN8U.js:_r': ['[role="menu"],[role="listbox"],[role="dialog"],[role="alertdialog"],dialog[open]'],
      'shared-78-D5Fw2h0a.js:mE': ['window.navigator.userAgent.toLowerCase()'],
      'shared-25-DOWZRSlq.js:ap': ['globalThis.document'],
    },
    features: {
      FP: ['[aria-hidden="true"], [inert]'], RP: [looseFeature('e.closest(FP)')], zP: [looseFeature('!RP(e)'), '"[hidden], [aria-live]"', '"aria-modal"'],
      HP: ['"[data-aria-hidden]"', '\'[role="dialog"], [role="alertdialog"]\'', '"data-closed"', '[data-cds="ConfirmationDialog"]'],
      qV: ['"[data-radix-popper-content-wrapper]"'], JV: ['[role="menu"],[role="listbox"],[role="dialog"],[role="alertdialog"],'],
      YV: ['`${Ws},${qV}`'], ZV: [looseFeature('e.closest(YV)'), looseFeature('e.closest(JV)'), '"[data-ask-user-input-banner]"'],
      QV: ['passiveLayers: t = !1', 'ownedBy: n', 'host: r = null', 'e.doc ??', '.activeElement'], tH: [looseFeature('!QV({ passiveLayers: !0 })')],
      GV: ['e.code !== t.code', 'e.key.toLowerCase() !== t.key.toLowerCase()', 'getModifierState?.("AltGraph")', 'e.metaKey !== r', 'e.altKey !== o'],
      eH: ['if (e.repeat) return null;', '? "prev"', '? "next"', 'getModifierState?.("AltGraph")', looseFeature('i === "prev" ? "next" : "prev"')],
      oH: ['if (e.length < 2) return null;', '(n === "prev" ? -1 : 1)', 'r >= e.length ? null : e[r]'],
    },
    // LV.<command>.shortcut.bindings, emitted as `surfaceChordShortcuts`; each command must stay hidden from the palette.
    shortcuts: { owner: 'LV', commands: ['chorus_surface_prev', 'chorus_surface_next'], features: ['hiddenFromCommandPalette: !0', 'app: "desktop"'] },
  },
};

const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const property = (object, key) => object?.type === 'ObjectExpression'
  ? object.properties.find(p => p.type === 'ObjectProperty' && (p.key.name ?? p.key.value) === key) : undefined;

// Returns { bindings, prelude }: the pinned binding list the emit slices and, for surface-chord.mjs, the source-sliced
// `surfaceChordShortcuts` declaration. `run` false (target skipped by --only) returns the list without the checks.
export async function pinSurfaceChordHelper(target, directory, run = true) {
  const pin = surfaceChordPins[target];
  if (!pin) throw Error(`No surface chord pin for ${target}`);
  if (!run) return { bindings: [...pin.bindings], prelude: '' };
  const label = `${target} (${pin.source})`;
  const raw = await fs.readFile(path.join(directory, pin.source), 'utf8');
  const code = await format(raw, { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const declaration = name => {
    const p = program.scope.getBinding(name)?.path;
    if (!p || p.isImportSpecifier()) throw Error(`${label}: ${name} is not a top-level declaration`);
    return p;
  };
  const text = p => code.slice(p.node.start, p.node.end);
  for (const [alias, local] of Object.entries(pin.officialExports ?? {}))
    if (exported.get(alias) !== local) throw Error(`${label}: exports ${alias} as ${exported.get(alias)}, not ${local}`);
  for (const [name, features] of Object.entries(pin.features)) {
    const absent = features.filter(f => typeof f === 'string' ? !text(declaration(name)).includes(f) : !f.test(text(declaration(name))));
    if (absent.length) throw Error(`${label}: ${name} lacks ${absent.map(f => typeof f === 'string' ? JSON.stringify(f) : String(f)).join(', ')}`);
  }
  // The same-chunk closure of the roots, stopping at imports.
  const closure = new Set(), imports = new Map();
  const visit = name => {
    if (closure.has(name)) return;
    const binding = program.scope.getBinding(name);
    if (!binding) throw Error(`${label}: unbound ${name}`);
    if (binding.path.isImportSpecifier()) {
      imports.set(name, `${binding.path.parent.source.value.replace(/^\.\//, '')}:${binding.path.node.imported.name}`);
      return;
    }
    closure.add(name);
    const p = binding.path;
    for (const [dep, b] of Object.entries(program.scope.bindings))
      if (b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))) visit(dep);
  };
  pin.roots.forEach(visit);
  const listed = [...pin.bindings].sort(), reached = [...closure].sort();
  if (JSON.stringify(listed) !== JSON.stringify(reached)) throw Error(`${label}: closure of ${pin.roots.join(',')} is ${reached.join(',')}, emit lists ${listed.join(',')}`);
  const expectedImports = JSON.stringify(Object.entries(pin.imports ?? {}).sort());
  const actualImports = JSON.stringify([...imports].sort());
  if (actualImports !== expectedImports) throw Error(`${label}: replaced imports are ${actualImports}, expected ${expectedImports}`);
  for (const [via, features] of Object.entries(pin.dependencies ?? {})) {
    const [file, alias] = via.split(':');
    const bytes = await fs.readFile(path.join(directory, file), 'utf8');
    const table = [...bytes.matchAll(/export\s*\{([^}]*)\}/g)].pop()?.[1] ?? '';
    const local = table.split(',').map(s => s.trim().split(/\s+as\s+/)).find(([l, e]) => (e ?? l) === alias)?.[0];
    if (!local) throw Error(`${label}: ${file} no longer exports ${alias}`);
    const escaped = local.replace(/\$/g, '\\$');
    const start = bytes.search(new RegExp(`(?:function ${escaped}\\(|(?<![\\w$.])${escaped}=)`));
    if (start < 0) throw Error(`${label}: ${file} ${alias} (${local}) has no declaration`);
    const slice = bytes.slice(start, start + 400);
    const absent = features.filter(f => !slice.includes(f));
    if (absent.length) throw Error(`${label}: ${file} ${alias} (${local}) lacks ${absent.map(f => JSON.stringify(f)).join(', ')}`);
  }
  let prelude = '';
  if (pin.shortcuts) {
    const owner = declaration(pin.shortcuts.owner).node.init;
    const tables = pin.shortcuts.commands.map(command => {
      const entry = property(owner, command)?.value;
      if (!entry) throw Error(`${label}: ${pin.shortcuts.owner}.${command} is missing`);
      const entryText = code.slice(entry.start, entry.end);
      const absent = pin.shortcuts.features.filter(f => !entryText.includes(f));
      if (absent.length) throw Error(`${label}: ${pin.shortcuts.owner}.${command} lacks ${absent.map(f => JSON.stringify(f)).join(', ')}`);
      const bindings = property(property(entry, 'shortcut')?.value, 'bindings')?.value;
      if (bindings?.type !== 'ArrayExpression') throw Error(`${label}: ${pin.shortcuts.owner}.${command}.shortcut.bindings is not an array`);
      return `${command}: ${code.slice(bindings.start, bindings.end)}`;
    });
    prelude = `// shared-1 ${pin.shortcuts.owner}.{${pin.shortcuts.commands.join(',')}}.shortcut.bindings, sliced from the source by code-current-surface-chord-pins.mjs.\n`
      + `const surfaceChordShortcuts = {${tables.join(',\n')}};`;
  }
  return { bindings: [...pin.bindings], prelude };
}
