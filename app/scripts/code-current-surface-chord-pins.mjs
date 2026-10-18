// R2-appswitch W3 (research/app-switch.md W3, §1.9): pins for the ⌥⌘←/→ surface chord helpers that
// scripts/extract-code-ui-current.mjs emits from the 2.42304.0 renderer. The emit slices a hand-listed binding set;
// before it runs, this module checks that the set is exactly the same-chunk closure of the roots the helper exports, that
// every binding still carries feature strings of its original text, that the chunk still exports the roots under the
// official aliases its consumers import (shared-22 AM imports qL as `jn`, $L as `Mn`), and that each replaced import
// still names the same export of its chunk. It also slices the two shortcut tables of shared-1 jL
// (`chorus_surface_prev` / `chorus_surface_next` .shortcut.bindings) out of the source, so the binding data the
// matcher RL compares against is the original, not a restatement.
import fs from 'node:fs/promises';
import path from 'node:path';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

export const surfaceChordPins = {
  // shared-156 $B (exported `_r`): the modal layer selector WL/HL extend; ZB/YB are the ask-user banner selectors.
  'surface-chord-layers.mjs': {
    source: 'shared-156-Bikz018e.js', roots: ['$B'], bindings: ['YB', 'ZB', '$B'], officialExports: { _r: '$B', gr: 'YB', mr: 'ZB' },
    features: {
      YB: ['"[data-ask-user-input-banner]"'], ZB: ['${YB}:not([data-chromeless])'],
      $B: ['[role="menu"],[role="listbox"],[role="dialog"],[role="alertdialog"],dialog[open],${ZB}'],
    },
  },
  // shared-78 Wa (exported `kw`): the macOS user-agent test. shared-1 imports it as `Da` (qL: AltGraph only blocks off a
  // Mac) and shared-22 as `Si` (AM: the extra-panes guard applies only off a Mac). research/app-switch.md W3 called it a
  // mobile UA check; the source is /(macintosh|macintel|macppc|mac68k|macos)/i.
  'surface-chord-platform.mjs': {
    source: 'shared-78-D6VXYXaQ.js', roots: ['Wa'], bindings: ['Ua', 'Wa'], officialExports: { kw: 'Wa' },
    features: { Ua: ['/(macintosh|macintel|macppc|mac68k|macos)/i'], Wa: ['typeof window > "u"', 'window.navigator.userAgent.toLowerCase()', 'Ua.test(e)'] },
  },
  // shared-1 qL (`jn`): the chord direction (repeat, AltGraph and modal-layer guards, RTL swap); $L (`Mn`): the next
  // mode in the list, no wrap; RL: the useShortcut binding matcher (LL matchShortcut) that it("chorus_surface_*") runs.
  'surface-chord.mjs': {
    source: 'shared-1-CAAiD7E3.js', roots: ['qL', '$L', 'RL'],
    bindings: ['vj', 'xj', 'Sj', 'Tj', 'BL', 'VL', 'HL', 'WL', 'GL', 'JL', 'RL', 'qL', '$L'],
    officialExports: { jn: 'qL', Mn: '$L', kn: 'JL', Pn: 'GL', Gi: 'Tj' },
    imports: { ci: 'shared-156-Bikz018e.js:_r', Da: 'shared-78-D6VXYXaQ.js:kw' },
    dependencies: {
      'shared-156-Bikz018e.js:_r': ['[role="menu"],[role="listbox"],[role="dialog"],[role="alertdialog"],dialog[open]'],
      'shared-78-D6VXYXaQ.js:kw': ['window.navigator.userAgent.toLowerCase()'],
    },
    features: {
      vj: ['[aria-hidden="true"], [inert]'], xj: ['e.closest(vj)'], Sj: ['!xj(e)', '"[hidden], [aria-live]"'],
      Tj: ['"[data-aria-hidden]"', '\'[role="dialog"], [role="alertdialog"]\'', '"data-closed"', '[data-cds="ConfirmationDialog"]'],
      BL: ['"[data-radix-popper-content-wrapper]"'], VL: ['[role="menu"],[role="listbox"],[role="dialog"],[role="alertdialog"],${BL}'],
      HL: ['${ci},${BL}'], WL: ['e.closest(HL)', 'e.closest(VL)', '"[data-ask-user-input-banner]"'],
      GL: ['passiveLayers: t = !1', 'document.activeElement', 'WL(r, t)', '!Tj(n)'], JL: ['!GL({ passiveLayers: !0 })'],
      RL: ['e.code !== t.code', 'e.key.toLowerCase() !== t.key.toLowerCase()', 'getModifierState?.("AltGraph")', 'e.metaKey !== r', 'e.altKey !== o'],
      qL: ['if (e.repeat) return null;', 't(e) ? "prev" : n(e) ? "next" : null', '!Da() && e.getModifierState?.("AltGraph")', 'JL()'],
      $L: ['if (e.length < 2) return null;', 'Math.max(0, e.indexOf(t)) + (n === "prev" ? -1 : 1)', 'r < 0 || r >= e.length ? null : e[r]'],
    },
    // jL.<command>.shortcut.bindings, emitted as `surfaceChordShortcuts`; each command must stay hidden from the palette.
    shortcuts: { owner: 'jL', commands: ['chorus_surface_prev', 'chorus_surface_next'], features: ['hiddenFromCommandPalette: !0', 'app: "desktop"'] },
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
    const absent = features.filter(f => !text(declaration(name)).includes(f));
    if (absent.length) throw Error(`${label}: ${name} lacks ${absent.map(f => JSON.stringify(f)).join(', ')}`);
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
