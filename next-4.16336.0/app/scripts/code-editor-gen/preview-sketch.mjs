// Area "preview-sketch": Preview sketch toolbar, canvas, keys, state and host, cut from 3.6556.2
// (w10-editor-preview-sketch; research/w10-editor.md §2.2 and the binding table of plan-w10.md).
// 3.6556.2 moved the sketch from c467aa787 into c23255574-B0Bkz_WU.js (toolbar fe…je, text targets Me/F/Ne, state
// I…B, canvas from the EditFilled glyph to the export) and compiled every component with React Compiler. Rules:
// - Each slice is a contiguous run of top-level statements, located from stable features (R2/E5) and from the host
//   chunk's own imports of c23255574 (cda4f50bb uses `s` as the toolbar, `t` as the canvas, `o` as the sketch hook…),
//   never from a minified name carried over from 2.42304.0.
// - Every free name of a slice is resolved here: React through reactAliases (R3), compiler helpers and the CDS pieces
//   view-tabs publishes by their semantic names (E3/R6, D1), small official helpers cut inline below, and the host
//   capabilities the slice cannot carry (intl, OCR, gates, platform) as factory parameters. A free name
//   with no resolution fails the generator, so a reused minified name cannot ship other code.
// - The keys adapter stays free of view-tabs (E42: shortcuts-dialog-model and preview-sketch-canvas tests import it).
// - w11-sweep-rest: the toolbar's panel (`f` = shared-frame cg, exported Dl) is view-tabs' CdsSurface now that view-tabs
//   publishes it (w11-e31-terminal-cont), no longer a host substitute; the glyph map adapter (preview-sketch-icons.mjs)
//   is retired: nothing imported it, and CdsIcon (view-tabs) carries the official map with the font.
import { createRequire } from 'node:module';
import { fs, path, root, parsers, readSource } from './common.mjs';
import { referenceVersion as version, vendorFrame, sharedFrame, reactAliases, compilerHelpers, assertVendorAlias, assertCompilerHelpers, looseFeature } from '../official-3.6556.2.mjs';

const require = createRequire(import.meta.url);
// Scope analysis only (the same Babel bundle analysis/code-ui-migrate-20261017/tools/map-bindings.mjs uses); nothing official is executed.
const babel = require('../../../tools/node_modules/playwright/lib/transform/babelBundle.js');

const sketchFile = 'c23255574-B0Bkz_WU.js', hostFile = 'cda4f50bb-BYPh13KQ.js', keysFile = 'shared-46-BIbZBGFq.js';
const viewTabsDir = path.join(root, 'src/generated/view-tabs');

// Parsed official chunk (raw, minified text): imports local -> {from, name}, exports alias -> local, top-level statements.
const chunkCache = new Map();
async function chunk(name) {
  if (!chunkCache.has(name)) {
    const { text, source } = await readSource(name, { base: 'ion' });
    const imports = new Map(), exports = new Map(), statements = [];
    for (const node of parsers.babel.parse(text, {}).program.body) {
      if (node.type === 'ImportDeclaration') { for (const s of node.specifiers) imports.set(s.local.name, { from: node.source.value.replace(/^\.\//, ''), name: s.imported?.name ?? 'default' }); continue; }
      if (node.type === 'ExportNamedDeclaration' && !node.declaration && !node.source) { for (const s of node.specifiers) exports.set(s.exported.name, s.local.name); continue; }
      const names = node.type === 'VariableDeclaration' ? node.declarations.map(d => d.id.name) : node.id ? [node.id.name] : [];
      statements.push({ names, node, text: text.slice(node.start, node.end) });
    }
    chunkCache.set(name, { text, source, imports, exports, statements });
  }
  return chunkCache.get(name);
}
const compact = text => text.replace(/\s+/g, '');
const feature = (text, features, label) => { for (const f of features) if (!compact(text).includes(compact(f))) throw Error(`${label} lost feature ${f}`); };
// The one statement of `file` whose raw text matches `pattern` (string or RegExp); fails unless exactly one does.
async function statementWith(file, pattern, label) {
  const hits = (await chunk(file)).statements.filter(s => typeof pattern === 'string' ? compact(s.text).includes(compact(pattern)) : pattern.test(s.text));
  if (hits.length !== 1) throw Error(`${file} ${label}: ${hits.length} statements match ${pattern}`);
  return hits[0];
}
// Top-level declaration name inside `statements` whose own text (function or declarator) matches the pattern.
function declarationWith(statements, file, pattern, label) {
  const hits = [];
  for (const { node } of statements) {
    for (const part of node.type === 'VariableDeclaration' ? node.declarations : [node]) {
      const own = textOf(file, part);
      if (typeof pattern === 'string' ? compact(own).includes(compact(pattern)) : pattern.test(own)) hits.push(part.id.name);
    }
  }
  if (hits.length !== 1) throw Error(`${file} ${label}: ${hits.length} declarations match ${pattern}`);
  return hits[0];
}
const rawText = new Map();
const textOf = (file, node) => rawText.get(file).slice(node.start, node.end);
// Names a piece of code reads without declaring (Babel scope globals of the piece parsed on its own).
function freeNames(text) {
  const ast = babel.babelParse(text, 'slice.js', false), names = new Set();
  babel.traverse(ast, { Program(p) { for (const name of Object.keys(p.scope.globals)) names.add(name); } });
  return names;
}
const jsGlobals = new Set(['Math', 'Number', 'Object', 'Array', 'Symbol', 'Map', 'Set', 'WeakMap', 'Promise', 'JSON', 'String', 'Boolean', 'Error',
  'Infinity', 'NaN', 'undefined', 'globalThis', 'window', 'document', 'navigator', 'performance', 'console', 'setTimeout', 'clearTimeout',
  'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask', 'encodeURIComponent', 'Image', 'Path2D', 'DOMMatrix', 'getComputedStyle',
  'HTMLElement', 'Element', 'Node', 'Event', 'KeyboardEvent', 'PointerEvent', 'ResizeObserver', 'MutationObserver', 'OffscreenCanvas',
  'createImageBitmap', 'Blob', 'URL', 'FileReader', 'Uint8Array', 'Uint8ClampedArray', 'Float32Array', 'ImageData', 'TextEncoder', 'atob', 'btoa',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Date', 'RegExp', 'Intl', 'Reflect', 'Proxy', 'WeakSet', 'BigInt', 'structuredClone', 'matchMedia',
  'devicePixelRatio', 'arguments', 'AbortController', 'DOMRect', 'TypeError', 'RangeError', 'CSS', 'HTMLCanvasElement', 'CanvasRenderingContext2D', 'self']);

// view-tabs semantic names (R6): `${file}#${exportAlias}` -> published name, for files view-tabs writes out.
let published;
async function viewTabsNames() {
  if (!published) {
    const manifest = JSON.parse(await fs.readFile(path.join(viewTabsDir, 'manifest.json'), 'utf8'));
    if (manifest.referenceVersion !== version) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${version}`);
    published = new Map();
    for (const [name, entry] of Object.entries(manifest.publicNames)) if (entry.export) published.set(`${entry.file}#${entry.export}`, name);
  }
  return published;
}

// Import lines for the free names of a slice. `provided` names are bound by the adapter itself (factory parameters or
// inline cuts); every other free name must be a chunk import resolvable through React, a compiler helper or a view-tabs
// published name; anything else (another top-level declaration, an unpublished import) fails.
async function resolveImports(file, text, provided, label) {
  const { imports } = await chunk(file), vendorText = (await chunk(vendorFrame)).text, names = await viewTabsNames();
  const byModule = new Map(), resolved = new Set();
  const add = (module, member, local) => { if (!byModule.has(module)) byModule.set(module, []); byModule.get(module).push(member === local ? member : `${member} as ${local}`); };
  for (const local of [...freeNames(text)].sort()) {
    if (provided.has(local)) { resolved.add(local); continue; }
    const spec = imports.get(local);
    if (!spec) { if (jsGlobals.has(local)) continue; throw Error(`${label}: free name ${local} is neither an import nor a known global`); }
    resolved.add(local);
    if (spec.from === vendorFrame && reactAliases[spec.name]) { const { module, member } = assertVendorAlias(vendorText, spec.name, reactAliases[spec.name]); add(module, member, local); continue; }
    if (spec.from === sharedFrame && compilerHelpers[spec.name]) {
      if (compilerHelpers[spec.name].local !== local) throw Error(`${label} imports compiler helper ${spec.name} as ${local}`);
      add(`../view-tabs/${sharedFrame}`, compilerHelpers[spec.name].name, local); continue;
    }
    const name = names.get(`${spec.from}#${spec.name}`);
    if (name) { await fs.access(path.join(viewTabsDir, spec.from)); add(`../view-tabs/${spec.from}`, name, local); continue; }
    throw Error(`${label}: ${local} (${spec.from}#${spec.name}) is not React, a compiler helper or a view-tabs published name`);
  }
  for (const local of provided) if (!resolved.has(local) && !freeNames(text).has(local)) throw Error(`${label}: provided ${local} is not read by the slice`);
  return [...byModule].map(([module, specifiers]) => `import {${specifiers.join(',')}} from '${module}';`).join('\n');
}

// The chunk import `local` must be `from`'s export `name`; returns the export's local declaration name in `from`.
async function importOf(file, local, from) {
  const spec = (await chunk(file)).imports.get(local);
  if (!spec || spec.from !== from) throw Error(`${file} ${local} is no longer imported from ${from} (${spec ? spec.from : 'missing'})`);
  const target = (await chunk(from)).exports.get(spec.name);
  if (!target) throw Error(`${from} does not export ${spec.name}`);
  return { exported: spec.name, local: target };
}
// An official helper inlined as `const <as> = ((<free…>) => { <declarations>; return <name>; })(<args…>)`: `args` maps each
// free name of the declarations to an expression of the adapter's scope; unmapped free names fail.
async function cutDecls(file, names, features = []) {
  const { statements } = await chunk(file), parts = [];
  rawText.set(file, (await chunk(file)).text);
  for (const { node } of statements) {
    if (node.type === 'VariableDeclaration') { for (const d of node.declarations) if (names.includes(d.id.name)) parts.push(`${node.kind} ${textOf(file, d)};`); }
    else if (names.includes(node.id?.name)) parts.push(textOf(file, node));
  }
  if (parts.length !== names.length) throw Error(`${file} no longer declares all of ${names.join(', ')}`);
  const body = parts.join('\n');
  feature(body, features, `${file} [${names.join(',')}]`);
  return { body, source: (await chunk(file)).source };
}
async function inline(file, names, as, args, features = []) {
  const { body, source } = await cutDecls(file, names, features);
  const free = [...freeNames(body)].filter(name => !jsGlobals.has(name)).sort();
  const missing = free.filter(name => !(name in args)), extra = Object.keys(args).filter(name => !free.includes(name));
  if (missing.length || extra.length) throw Error(`${file} [${names.join(',')}] reads ${free.join(',') || 'nothing'}; mapped ${Object.keys(args).join(',') || 'nothing'}`);
  const params = Object.keys(args);
  return { text: `const ${as}=((${params.join(',')})=>{${body};return ${names.at(-1)};})(${params.map(name => args[name]).join(',')});`, source };
}
// The vendor-frame/shared-frame import `local` of `file` must be the React member / compiler helper / published name named.
async function expectImport(file, local, expected) {
  const spec = (await chunk(file)).imports.get(local);
  if (!spec) throw Error(`${file} no longer imports ${local}`);
  if (spec.from === vendorFrame && reactAliases[spec.name]) { const [module, member] = reactAliases[spec.name]; if (`${module}#${member}` === expected) return; }
  const name = (await viewTabsNames()).get(`${spec.from}#${spec.name}`);
  if (name === expected) return;
  if (spec.from === sharedFrame && compilerHelpers[spec.name]?.name === expected) return;
  throw Error(`${file} ${local} is ${spec.from}#${spec.name}, expected ${expected}`);
}

export async function emit({ adapter }) {
  assertCompilerHelpers((await chunk(sharedFrame)).text);
  const sketch = await chunk(sketchFile), host = await chunk(hostFile);
  rawText.set(sketchFile, sketch.text); rawText.set(hostFile, host.text);

  // Roles of the c23255574 exports, read from the host chunk's own use of them (cda4f50bb d): `n(be,{…widths:ge,…})`
  // is the toolbar, `n(xe,{ref:T,…})` the canvas, `ve(w,we,Re)` the sketch hook, `colors:ye`, `_e` the black ink.
  const hostImport = local => { const spec = host.imports.get(local); if (spec?.from !== sketchFile) throw Error(`${hostFile} ${local} is not a ${sketchFile} import`); const target = sketch.exports.get(spec.name); if (!target) throw Error(`${sketchFile} does not export ${spec.name}`); return target; };
  const hostD = await statementWith(hostFile, 'Preview annotation composite failed', 'host component');
  feature(hostD.text, ['n(be,{className:Ot,tool:kt', 'colors:ye,', 'widths:ge,', 'n(xe,{ref:T,', '=ve(w,we,Re)', 'e.toPNG(_e)'], `${hostFile} host`);
  const toolbarName = hostImport('be'), canvasName = hostImport('xe'), stateName = hostImport('ve'), colorsName = hostImport('ye'), widthsName = hostImport('ge'), blackName = hostImport('_e');
  const indexOf = name => { const i = sketch.statements.findIndex(s => s.names.includes(name)); if (i < 0) throw Error(`${sketchFile} no longer declares ${name}`); return i; };

  const frame = await chunk(sharedFrame);

  // Toolbar: from the first statement (the Square glyph) through `je = memo(P)`. CDS Button/Icon/Dropdown/Tooltip/
  // ConfirmationDialog/TooltipProvider/Surface and asElementNode are view-tabs' own; intl comes from the host. Inline: the separator (cd1531e2e t), menu items (shared-frame yT over CdsDropdown's
  // parts), defineMessages (vendor-intl identity) and the owner window with a global fallback (shared-25 mf).
  const toolbarStart = (await statementWith(sketchFile, 'name:"Square"', 'toolbar start')).node, toolbarEnd = indexOf(toolbarName);
  if (sketch.statements.findIndex(s => s.node === toolbarStart) !== 0) throw Error(`${sketchFile} toolbar no longer starts the chunk`);
  const toolbarText = sketch.statements.slice(0, toolbarEnd + 1).map(s => s.text).join('\n');
  feature(toolbarText, ['"data-sketch-tools":!0', 'firstToolsOnly===!0', 'defaultMessage:"Zoom",id:"yMbKjuDH/n"', 'defaultMessage:"Line width",id:"SdHvg9BQQO"',
    'defaultMessage:"Extra thick",id:"JB06EXjUT5"', 'defaultMessage:"Discard your annotations?",id:"MfFrIX0mxC"', 'checkedRole:"radio"', 'elevation:"panel"'], `${sketchFile} toolbar`);
  for (const [local, expected] of [['i', 'react/jsx-runtime#jsx'], ['a', 'react/jsx-runtime#jsxs'], ['o', 'react/jsx-runtime#Fragment'], ['h', 'CdsDropdown'], ['f', 'CdsSurface']]) await expectImport(sketchFile, local, expected);
  if ((await importOf(sketchFile, 'de', 'cd1531e2e-DJSqbgrp.js')).local !== 't') throw Error(`${sketchFile} de is no longer cd1531e2e t`);
  const separator = await inline('cd1531e2e-DJSqbgrp.js', ['t'], 'de', { e: 'i', J9: 'J9', J0: 'J0', K0: 'K0' }, ['role:"separator"', '"aria-orientation":"vertical"', 'className:"h-4 w-px shrink-0 bg-border"']);
  for (const [local, expected] of [['e', 'react/jsx-runtime#jsx'], ['J9', 'reactMemoCache'], ['J0', 'memoIsEmpty'], ['K0', 'memoStore0']]) await expectImport('cd1531e2e-DJSqbgrp.js', local, expected);
  // CdsDropdown (shared-frame GT) is Object.assign(CT,{…Popup:cT,Item:dT,Separator:mT,…Submenu:pT,SubmenuTrigger:fT…}); yT renders through those parts.
  if ((await importOf(sketchFile, '_', sharedFrame)).local !== 'yT') throw Error(`${sketchFile} _ is no longer shared-frame yT`);
  const dropdownLocal = (await importOf(sketchFile, 'h', sharedFrame)).local;
  rawText.set(sharedFrame, frame.text);
  const dropdownDecl = frame.statements.flatMap(s => s.node.type === 'VariableDeclaration' ? s.node.declarations : []).find(d => d.id.name === dropdownLocal);
  const parts = new Map((dropdownDecl?.init?.arguments?.[1]?.properties ?? []).map(p => [p.value.name, p.key.name]));
  const part = local => { const key = parts.get(local); if (!key) throw Error(`CdsDropdown has no part bound to ${local}`); return `h.${key}`; };
  for (const [local, key] of [['mT', 'Separator'], ['pT', 'Submenu'], ['fT', 'SubmenuTrigger'], ['cT', 'Popup'], ['dT', 'Item']]) if (parts.get(local) !== key) throw Error(`CdsDropdown.${key} is no longer ${local}`);
  for (const [local, expected] of [['b', 'react/jsx-runtime#jsx'], ['G', 'react/jsx-runtime#jsxs'], ['ge', 'react#Fragment']]) await expectImport(sharedFrame, local, expected);
  // React's Fragment and the jsx-runtime Fragment are the same element type, so the toolbar's `o` serves yT's `ge`.
  const menuItems = await inline(sharedFrame, ['vT', 'yT'], '_', { b: 'i', G: 'a', ge: 'o', mT: part('mT'), pT: part('pT'), fT: part('fT'), cT: part('cT'), dT: part('dT') }, ['e==="separator"', 'onClick:e.onSelect', 'checkedRole:e.checkedRole']);
  if ((await importOf(sketchFile, 'C', 'vendor-intl-DYfox5Co.js')).local !== 'tn') throw Error(`${sketchFile} C is no longer vendor-intl tn`);
  const defineMessages = await inline('vendor-intl-DYfox5Co.js', ['tn'], 'C', {}, ['function tn(e){return e}']);
  if ((await importOf(sketchFile, 're', 'shared-25-DOWZRSlq.js')).local !== 'mf') throw Error(`${sketchFile} re is no longer shared-25 mf`);
  const ownerWindowOr = await inline('shared-25-DOWZRSlq.js', ['mf'], 're', { pf: '$ownerWindow' }, ['return pf(e)??globalThis.window']);
  const ownerWindowImport = `import {ownerWindow as $ownerWindow} from '../view-tabs/shared-25-DOWZRSlq.js';`;
  if ((await viewTabsNames()).get('shared-25-DOWZRSlq.js#up') !== 'ownerWindow') throw Error('view-tabs no longer publishes shared-25 up as ownerWindow');
  const toolbarProvided = new Set(['w', 'se', 'de', '_', 'C', 're']);
  const toolbarImports = await resolveImports(sketchFile, toolbarText, toolbarProvided, 'sketch toolbar');
  await adapter('preview-sketch-toolbar.mjs', `// Original adaptive selection/drawing toolbar (${version}), CDS primitives (the panel Surface included) from
// view-tabs. The host supplies intl; no tool, layout, width, color or discard logic is rewritten.
${toolbarImports}
${ownerWindowImport}
${separator.text}
${menuItems.text}
${defineMessages.text}
${ownerWindowOr.text}
export function createPreviewSketchToolbar({Message:w,useIntl:se}) {
${toolbarText}
return {Toolbar:${toolbarName}};
}`, [sketch.source, separator.source, menuItems.source, defineMessages.source, ownerWindowOr.source], version);

  // State: from the color list through the last-width/last-color getters, before the canvas glyphs. The text-target
  // hook (F, whose OCR chunk cb22b036c is not shipped), the gate hook, platform test, text-input test and the command
  // keys come from the host; the redaction source test (shared-1 qC) is cut inline.
  const canvasStart = sketch.statements.findIndex(s => looseFeature('var X={name:"EditFilled"').test(s.text));
  const stateStart = indexOf(colorsName), stateIndex = indexOf(stateName);
  if (!(toolbarEnd < stateStart && stateStart <= stateIndex && stateIndex < canvasStart)) throw Error(`${sketchFile} toolbar/state/canvas order changed`);
  for (const name of [widthsName, blackName]) { const i = indexOf(name); if (i < stateStart || i >= canvasStart) throw Error(`${sketchFile} ${name} left the state range`); }
  const stateText = sketch.statements.slice(stateStart, canvasStart).map(s => s.text).join('\n');
  feature(stateText, ['["#E03131","#1971C2","#2F9E44","#1F1E1D","#FFFFFF"]', '[2,4,8,12]', '["sketchUndo","sketchRedo","sketchDeleteSelection","sketchDeselect"]',
    '("__gb__2978899829")?void0:n,l==="redact")', 'handleStrokeWidthChange:O', 'a.current?.resizeSelection(e)'], `${sketchFile} state`);
  const textTargets = sketch.statements.find(s => s.names.includes('F'));
  feature(textTargets?.text ?? '', ['resetTextRedactionCount:ae', 'textRedactionCount:ie'], `${sketchFile} text-target hook F`);
  if ((await importOf(sketchFile, 'ae', 'shared-1-BJhqMmkf.js')).local !== 'qC') throw Error(`${sketchFile} ae is no longer shared-1 qC`);
  const redactSource = await inline('shared-1-BJhqMmkf.js', ['qC'], 'ae', {}, ['case"userFile":case"remoteExternal":return!0']);
  for (const [local, from, target] of [['y', 'shared-25-DOWZRSlq.js', 'fs'], ['ie', 'shared-25-DOWZRSlq.js', 'cc'], ['ce', 'shared-156-BLTosN8U.js', 'BK'], ['oe', keysFile, 'eR'], ['S', keysFile, 'iR']])
    if ((await importOf(sketchFile, local, from)).local !== target) throw Error(`${sketchFile} ${local} is no longer ${from} ${target}`);
  const stateImports = await resolveImports(sketchFile, stateText, new Set(['ie', 'ae', 'F', 'y', 'ce', 'oe', 'S']), 'sketch state');
  // Emitted after the keys, keeping the area's adapter order (toolbar, canvas, keys, state, host).
  const emitState = () => adapter('preview-sketch-state.mjs', `// Original state, history commands, width/color memory and export generation (${version}). OCR is a host capability.
${stateImports}
${redactSource.text}
export function createPreviewSketchState({usePlatform:ie,useTextTargets:F,useGate:y,isTextInput:ce,matchCommand:oe,shortcut:S}) {
${stateText}
return {useSketch:${stateName},colors:${colorsName},widths:${widthsName},black:${blackName}};
}`, [sketch.source, redactSource.source], version);

  // Canvas: from the EditFilled glyph to the export. Pure helpers (min/max, motion tokens, error text) and the reduced-
  // motion test are cut inline; ownerWindow is view-tabs'; the density token hook and intl come from the host.
  const canvasText = sketch.statements.slice(canvasStart).map(s => s.text).join('\n');
  const canvasStatements = sketch.statements.slice(canvasStart);
  if (indexOf(canvasName) < canvasStart) throw Error(`${sketchFile} canvas left its range`);
  feature(canvasText, ['defaultMessage:"Sketch canvas",id:"jvMtXRguc4"', 'defaultMessage:"Text label",id:"c29+YCh/oq"', 'role:"application"'], `${sketchFile} canvas`);
  const role = (pattern, label) => declarationWith(canvasStatements, sketchFile, pattern, label);
  const roles = {
    Canvas: role('defaultMessage:"Sketch canvas"', 'canvas'), drawStroke: role('e.lineCap="round"', 'drawStroke'),
    constrainPoint: role(looseFeature('function X(e,t,n,r){if(!r)return n;let i=n.x-t.x'), 'constrainPoint'),
    resizeStroke: role('points:e.points.map(e=>({...e,x:e.x*t,y:e.y*n}))', 'resizeStroke'),
    hitTest: role(looseFeature('function X(e,t,n,r=!1){if(e.kind==="freehand")return!1;if(e.kind==="text")'), 'hitTest'),
    moveStroke: role('points:e.points.map(e=>({x:e.x+t,y:e.y+n}))', 'moveStroke'),
    resizeHandle: role('if(e.kind==="line"||e.kind==="arrow"){if(t==="bend")', 'resizeHandle'),
    resizeText: role('if(r!=="nw"&&r!=="ne"&&r!=="se"&&r!=="sw")return e', 'resizeText'),
    emptyHistory: role(/^[\w$]+=\{past:\[\],present:\[\],future:\[\]\}$/, 'emptyHistory'),
    commitHistory: role('n.length>100?n.slice(-100):n', 'commitHistory'), undoHistory: role('e.past.at(-1)', 'undoHistory'),
    redoHistory: role('let[t,...n]=e.future', 'redoHistory'), mapHistory: role(/^function [\w$]+\(e,t\)\{let n=new Map/, 'mapHistory'),
    historyState: role('{count:e.present.length,canUndo:', 'historyState'),
  };
  if (roles.Canvas !== canvasName) throw Error(`${sketchFile} canvas ${roles.Canvas} is not the host's ${canvasName}`);
  for (const [local, file, target] of [['D', 'cf80fba0c-CT5qqVq9.js', 'e'], ['le', 'shared-130-dWztbTO1.js', 'Df'], ['T', 'c25d7186f-CHE_J2eY.js', 'i'], ['e', 'preload-helper-D0dM6GpB.js', 'e'], ['m', sharedFrame, 'wh'], ['ue', 'c8748971a-B0-mlqu7.js', 'f']])
    if ((await importOf(sketchFile, local, file)).local !== target) throw Error(`${sketchFile} ${local} is no longer ${file} ${target}`);
  const sketchMin = await inline('cf80fba0c-CT5qqVq9.js', ['e'], 'D', {}, ['let t=1/0;']);
  const sketchMax = await inline('shared-130-dWztbTO1.js', ['Df'], 'le', {}, ['let t=-1/0;']);
  // c25d7186f is byte-identical to 2.42304.0's: `i=e` re-exports the token table `e`.
  const tokens = await chunk('c25d7186f-CHE_J2eY.js');
  const tokenText = tokens.text.replace(/export\s*\{[^}]*\};?\s*$/, '');
  feature(tokenText, ['dur:{', 'base:{'], 'c25d7186f tokens');
  if (!/(?:^|[,;\s])i=e[,;]/.test(tokenText)) throw Error('c25d7186f t is no longer the token table e');
  const errorText = await inline('preload-helper-D0dM6GpB.js', ['e'], 'e', {}, ['Symbol.for("ant.o11y.errorText")']);
  const reducedMotion = await inline(sharedFrame, ['Sh', 'Ch', 'wh'], 'm', {}, ['window.matchMedia(Sh).matches', 'getAttribute(Ch)==="true"']);
  const canvasImports = await resolveImports(sketchFile, canvasText, new Set(['D', 'le', 'T', 'e', 'm', 're', 'ue', 'se']), 'sketch canvas');
  // One ownerWindow import (w11-sweep-rest): the canvas body already reads view-tabs ownerWindow, so the inlined mf takes
  // that local instead of a second import of the same binding.
  const canvasOwner = canvasImports.match(/import \{(?:[^}]*,)?ownerWindow as ([\w$]+)(?:,[^}]*)?\} from '\.\.\/view-tabs\/shared-25-DOWZRSlq\.js';/)?.[1];
  const canvasOwnerOr = canvasOwner ? await inline('shared-25-DOWZRSlq.js', ['mf'], 're', { pf: canvasOwner }, ['return pf(e)??globalThis.window']) : ownerWindowOr;
  await adapter('preview-sketch-canvas.mjs', `// Complete original drawing canvas and geometry/history/rendering helpers (${version}).
${canvasImports}
${canvasOwner ? '' : ownerWindowImport}
${sketchMin.text}
${sketchMax.text}
const T=(()=>{${tokenText};return i;})();
${errorText.text}
${reducedMotion.text}
${canvasOwnerOr.text}
export function createPreviewSketchCanvas({useToken:ue,useIntl:se}) {
${canvasText}
return {${Object.entries(roles).map(([name, local]) => `${name}:${local}`).join(',')}};
}`, [sketch.source, sketchMin.source, sketchMax.source, tokens.source, errorText.source, reducedMotion.source, ownerWindowOr.source], version);

  // Keys: shared-46 command table and matchers (13 declarations), the platform tests (shared-78 mE/pE) are the host's.
  const keys = await chunk(keysFile);
  const digitsTable = names => names.some(name => keys.statements.some(s => s.node.declarations?.some(d => d.id.name === name && looseFeature('X=["1","2","3","4","5","6","7","8","9"]').test(textOf(keysFile, d)))));
  rawText.set(keysFile, keys.text);
  const matchName = (await importOf(sketchFile, 'oe', keysFile)).local, shortcutName = (await importOf(sketchFile, 'S', keysFile)).local;
  // The matcher and the shortcut formatter plus every top-level declaration they read, in source order.
  const keyDeclared = keys.statements.flatMap(s => s.names);
  let keyNames = [matchName, shortcutName];
  for (let grew = true; grew;) {
    grew = false;
    for (const name of freeNames((await cutDecls(keysFile, keyDeclared.filter(n => keyNames.includes(n)))).body)) if (keyDeclared.includes(name) && !keyNames.includes(name)) { keyNames.push(name); grew = true; }
  }
  keyNames = keyDeclared.filter(name => keyNames.includes(name));
  if (!digitsTable(keyNames)) throw Error(`${keysFile} key table lost its preset digit list`);
  if (!keyNames.includes(matchName) || !keyNames.includes(shortcutName) || keyNames.length !== 13) throw Error(`${keysFile} key table is ${keyNames.join(',')}`);
  const { body: keysBody } = await cutDecls(keysFile, keyNames, ['"toggleSketchMode"', '"sketchUndo"', 'matchBy==="char"']);
  const keysFree = [...freeNames(keysBody)].filter(name => !jsGlobals.has(name)).sort().join(',');
  if (keysFree !== '$r,ni') throw Error(`${keysFile} key table reads ${keysFree}`);
  for (const [local, target] of [['$r', 'Eo'], ['ni', 'jo']]) if ((await importOf(keysFile, local, 'shared-78-D5Fw2h0a.js')).local !== target) throw Error(`${keysFile} ${local} is no longer shared-78 ${target}`);
  await adapter('preview-sketch-keys.mjs', `// Original command matching (${version}), including physical-key versus character rules.
const $r=()=>typeof navigator!=='undefined'&&/Mac/.test(navigator.platform),ni=()=>typeof navigator!=='undefined'&&/Linux/.test(navigator.platform);
${keysBody}
export {${matchName} as matchSketchCommand,${shortcutName} as sketchShortcut};`, [keys.source], version);

  await emitState();

  // Host: cda4f50bb from the bar classes through `Pe = memo(f)`. CdsButton/CdsDisabledReason/asElementNode/ownerWindow/clsx
  // are view-tabs'; c23255574 parts come from the adapters above; the escape-owner attribute and export size are inline.
  const hostEnd = host.statements.findIndex(s => s.names.includes(host.exports.get('t')));
  const hostText = host.statements.slice(0, hostEnd + 1).map(s => s.text).join('\n');
  feature(hostText, ['De="[data-sketch-tools] button:not(:disabled)"', '"--sketch-bar-reach"', 'defaultMessage:"Add to chat",id:"oBu4r1Zt46"', 'focusHandoverRef:a'], `${hostFile} host`);
  const escape = await importOf(hostFile, 'c', 'shared-156-BLTosN8U.js');
  const escapeDecl = (await chunk('shared-156-BLTosN8U.js')).statements.flatMap(s => s.node.type === 'VariableDeclaration' ? s.node.declarations : []).find(d => d.id.name === escape.local);
  if (escapeDecl?.init?.value !== 'data-escape-owner') throw Error('Sketch escape-owner attribute changed');
  if (!/[\w$]+="data-escape-owner"/.test((await chunk('shared-156-BLTosN8U.js')).text)) throw Error('Sketch escape-owner declaration changed');
  if ((await importOf(hostFile, 'pe', 'cf0fecf2c-DzifWMTz.js')).local !== 'u') throw Error(`${hostFile} pe is no longer cf0fecf2c u`);
  const size = await inline('cf0fecf2c-DzifWMTz.js', ['u'], 'pe', {}, ['return{width:e.pixelWidth/e.dpr,height:e.pixelHeight/e.dpr}']);
  for (const [local, from, target] of [['se', 'shared-25-DOWZRSlq.js', 'cc'], ['de', 'shared-156-BLTosN8U.js', 'BK'], ['ue', 'shared-156-BLTosN8U.js', 'hq'], ['l', 'shared-156-BLTosN8U.js', 'JK'],
    ['me', 'cb50b3202-Be3mtbm0.js', 'd'], ['he', 'cb50b3202-Be3mtbm0.js', 'c'], ['s', 'shared-1-BJhqMmkf.js', 'ZG'], ['fe', 'shared-19-DIKJVT7c.js', 'Gj'], ['ce', 'shared-52-uHFNjl7C.js', 'lB']])
    if ((await importOf(hostFile, local, from)).local !== target) throw Error(`${hostFile} ${local} is no longer ${from} ${target}`);
  const hostProvided = new Set(['se', 'de', 'ue', 'l', 'me', 'he', 's', 'fe', 'le', 'ce', 'c', 'pe', 'be', 've', 'ye', 'ge', '_e', 'xe']);
  const hostImports = await resolveImports(hostFile, hostText, hostProvided, 'sketch host');
  await adapter('preview-sketch-host.mjs', `// Original Preview sketch host (${version}), mode switch, focus, export and toolbar composition.
${hostImports}
const c='data-escape-owner';
${size.text}
export function createPreviewSketchHost({usePlatform:se,isTextInput:de,isApplication:ue,popupSelector:l,hasOtherEscapeOwner:me,openPopupSelector:he,suppressContextMenu:s,releaseEscape:fe,useIntl:le,useErrors:ce,Toolbar:be,useSketch:ve,colors:ye,widths:ge,black:_e,Canvas:xe}) {
${hostText}
return ${host.exports.get('t')};
}`, [host.source, size.source], version);
}
