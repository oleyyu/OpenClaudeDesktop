// Shared helpers of the code-editor-v4 areas preview-shell-a and preview-shell-b (round 2 unit code-editor:d), 4.16336.0
// contract. Slicing is preview-graph.mjs sliceLinked (React imported from the host packages, cds-core public names and
// linked graphs' exports imported, every other official declaration copied in per-chunk block scopes); this module adds
// what these two areas need on top of it:
//   - the linked graphs both areas resolve against (D1: the module state another 4.16336.0 graph holds is imported from
//     it, never copied a second time): cds-core (every module: public names and shared exports), code-composer-v4
//     menu-collision-padding (shared-18 OJ, region plan), cowork-live-v4 c25e47851 (the tab favicon, region plan:
//     preview-tab-strip links cowork-live-v4), code-current-v4 chunk-vendor-flags (vendor-flags Vt, the GrowthBook React
//     context the copy-URL gate reads) and routines-shared-v4 shared-25 (shared-25 Dz, the account context the link
//     chooser's persisted preferences read);
//   - sibling links inside this graph (`siblings`: chunk:alias -> adapter export), so a declaration one adapter of the
//     two areas emits is imported by the others instead of copied (the address tooltip context, the pane menu, the menu
//     item renderer);
//   - OWNED_STATE: every module-state binding the two areas copy, the one adapter that holds it and why (manifest
//     ownedStateReasons; a copy of the same state in a second adapter, or one that is not listed, stops generation);
//   - adapters assembled from several root chunks: the first chunk's closure is top level, every further chunk's closure
//     is its own block scope (`const $s_<chunk>=(()=>{…})()`), so minified names of different slices never collide.
import { sliceLinked, linkedTable, importText, mergeImports, assertBound } from './preview-graph.mjs';
import { namespaceOf } from './common.mjs';

export const ion = 'ion';
export const LINKED_GRAPHS = Object.freeze([
  'cds-core',
  { graph: 'code-composer-v4', modules: ['menu-collision-padding.mjs'] },
  { graph: 'cowork-live-v4', modules: ['c25e47851.mjs'] },
  // (code-current-v4 chunk-vendor-flags.mjs left in wave 7: vendor-flags Vt is cds-core's.)
  { graph: 'routines-shared-v4', modules: ['shared-25-D-aF0gt9.mjs'] },
]);
// Bindings that must arrive through a link (D1 owners named by the region plan or found by the D1 pre-check); a slice
// that copies one of them instead stops generation.
export const REQUIRED_LINKS = Object.freeze({
  'shared-18-Cfqwgjc5.js#OJ': '../code-composer-v4/menu-collision-padding.mjs',
  'c25e47851-CDXbwncf.js#a': '../cowork-live-v4/c25e47851.mjs',
  // vendor-flags Vt: cds-core's since wave 7 (code-current-v4 links it too).
  'vendor-flags-BSWGVdqu.js#Vt': '../cds-core/vendor-flags.mjs',
  // shared-25 Dz (the account context, official `Dz=g(null)`): cds-core's since wave 8s (settings_shared25_Dz, D1 single holder
  // for the settings pages); it was routines-shared-v4's ('../routines-shared-v4/shared-25-D-aF0gt9.mjs') through wave 8.
  'shared-25-D-aF0gt9.js#Dz': '../cds-core/shared-25.mjs',
  'vendor-intl-BJgYK7RA.js#K': '../cds-core/vendor-intl.mjs',
  // wave 7 (cds-integrate/wave7, round2/code-editor-d cdsCoreNeeds): the pane-header panels context and the two state units
  // these areas held alone until then are cds-core publicNames (CdsPanePanelsContext; useOpenInBrowserLabel over the
  // default-browser-name cache s / c / l / u; notifyPreviewStorageCleared / usePreviewStorageEpoch over _ / v).
  'shared-120-DCdTP1_5.js#Je': '../cds-core/shared-120.mjs',
  'c8ae173c6-BUQ9DHQT.js#p': '../cds-core/c8ae173c6.mjs',
  'c8d2b6a1c-I-NfiP11.js#y': '../cds-core/c8d2b6a1c.mjs',
  'c8d2b6a1c-I-NfiP11.js#b': '../cds-core/c8d2b6a1c.mjs',
});
// Module state copied by these areas: file#local -> { adapter, reason }. (Wave 7: shared-120 Je, c8ae173c6 s / c / l and
// c8d2b6a1c _ / v moved to cds-core; REQUIRED_LINKS above links them.)
export const OWNED_STATE = Object.freeze({
  'cf550b864-BHVEoOWt.js#C': { adapter: 'preview-address-field.mjs', reason: 'official Preview address tooltip context (createContext(true)); preview-navigation.mjs reads it through PreviewAddressTooltipProvider, no other 4.16336.0 graph holds it' },
});

let linkedPromise = null;
export const linked = () => (linkedPromise ??= linkedTable(LINKED_GRAPHS));

// One root chunk's closure. `scoped` puts it in its own block scope returning `expose` (the locals the adapter reads).
export async function part(file, roots, { hosts = {}, scoped = false, expose = roots } = {}) {
  const sliced = await sliceLinked(file, roots, { hosts, linked: await linked() });
  for (const [key, module] of Object.entries(REQUIRED_LINKS)) {
    if (sliced.bindings.some(b => `${b.file}#${b.name}` === key)) throw Error(`${file}: ${key} would be copied; it must be imported from ${module}`);
    const link = sliced.links.find(l => l.binding === key);
    if (link && link.module !== module) throw Error(`${file}: ${key} links ${link.module}, expected ${module}`);
  }
  const scope = '$s_' + file.replace(/\.js$/, '').replace(/[^\w$]/g, '_');
  const text = scoped ? `// ${file}\nconst ${scope}=(()=>{\n${sliced.text}\nreturn {${[...new Set(expose)].join(',')}};\n})();` : sliced.text;
  return { ...sliced, file, text, scope: scoped ? scope : null };
}
// The expression an adapter exports for `local` of `file` (a root, or a declaration of a producer chunk of the part).
export function member(p, file, local) {
  if (file === p.file) return p.scope ? `${p.scope}.${local}` : local;
  const ns = namespaceOf(file);
  const block = new RegExp(`const ${ns.replace(/\$/g, '\\$')}=\\(\\(\\)=>\\{[^]*?\\nreturn \\{([^}]*)\\};\\n\\}\\)\\(\\);`).exec(p.text);
  if (!block || !block[1].split(',').includes(local)) throw Error(`${p.file}: ${file}#${local} is not a declaration its slice copies`);
  return p.scope ? `${p.scope}.${ns}.${local}` : `${ns}.${local}`;
}

// Writes one adapter: header comment, merged imports, the parts, then `export const <name>=<expression>` per export (or
// a factory when a part reads a host parameter: `export function <factory>({…}){ <parts> return {…} }`).
export async function emitAdapter(ctx, target, { header, parts, exports, roots, previous, factory, links = [] }) {
  const imports = mergeImports(...parts.map(p => p.imports));
  const params = [...new Set(parts.flatMap(p => [...p.params.keys()]))];
  const body = parts.map(p => p.text).join('\n');
  const exportLines = Object.entries(exports);
  let text;
  if (params.length) {
    if (!factory) throw Error(`${target}: host parameters ${params.join(', ')} need a factory name`);
    text = `${header}\n${importText(imports)}\nexport function ${factory}({${params.join(',')}}) {\n${body}\nreturn {${exportLines.map(([name, expr]) => `${name}:${expr}`).join(',')}};\n}`;
  } else {
    if (factory) throw Error(`${target}: factory ${factory} without host parameters`);
    text = `${header}\n${importText(imports)}\n${body}\n${exportLines.map(([name, expr]) => `export const ${name}=${expr};`).join('\n')}`;
  }
  assertBound(target, text);
  const bindings = [], seen = new Set();
  for (const b of parts.flatMap(p => p.bindings)) { const k = `${b.file}#${b.name}`; if (!seen.has(k)) { seen.add(k); bindings.push(b); } }
  // Module state: the shape check of sliceLinked plus the listed state of OWNED_STATE (closure stores and reassigned
  // module variables the D1 gate classifies as state).
  const ownedState = {};
  const state = Object.assign({}, ...parts.map(p => p.state));
  for (const key of Object.keys(state)) {
    const owner = OWNED_STATE[key];
    if (!owner) throw Error(`${target}: copies module state ${key} (${state[key]}) that OWNED_STATE does not list`);
  }
  for (const [key, owner] of Object.entries(OWNED_STATE)) {
    const copied = seen.has(key);
    if (copied && owner.adapter !== target) throw Error(`${target}: copies ${key}, which ${owner.adapter} holds`);
    if (!copied && owner.adapter === target) throw Error(`${target}: OWNED_STATE lists ${key} but the adapter no longer copies it`);
    if (copied) ownedState[key] = owner.reason;
  }
  const sources = [], seenSources = new Set();
  for (const s of parts.flatMap(p => p.sources)) if (!seenSources.has(s.name)) { seenSources.add(s.name); sources.push(s); }
  const allLinks = [...links, ...parts.flatMap(p => p.links)];
  const keptLinks = allLinks.filter((l, i) => allLinks.findIndex(x => x.binding === l.binding && x.module === l.module) === i)
    .filter(l => !/^shared-frame-CJdE5Ria\.js#[IJKZ]\d$/.test(l.binding));
  await ctx.adapter(target, text, {
    sources, bindings, realm: 'renderer', productionRealms: ['renderer'], previous,
    roots: { ...roots, $links: keptLinks.map(l => ({ binding: l.binding, module: l.module, name: l.name, kind: l.kind })) },
    ...(Object.keys(ownedState).length ? { ownedState } : {}),
  });
}

// Root pins: { probe | pattern, features?, alias?, sha256, previous } -> { file, local, sha256, previous }.
export function pins(ctx, file, table) {
  const out = {};
  for (const [name, spec] of Object.entries(table)) out[name] = { file, local: ctx.locatePinned(file, ion, spec), sha256: spec.sha256, ...(spec.previous ? { previous: spec.previous } : {}) };
  return out;
}
export const header = (area, what) => `// Original Claude Desktop 4.16336.0 ${what}; generated by scripts/code-editor-v4-gen/${area}.mjs.\n// Edit the generator, never this file.`;
