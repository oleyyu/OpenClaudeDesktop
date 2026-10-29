// w13-chatui-composer-tools (research/w13-chatui.md §1.6 K2/K3/K5, research/w13-chatfn.md §1.5 C1/C2/C8; plan-w13
// 「#### w13-chatui-composer-tools」): extract the 3.6556.2 originals the Chat card's + button and + menu are built on.
// Nothing here executes desktop runtime code; chunks are read, prettier-formatted and parsed (Babel scope analysis) only.
//
//   shared-8 kF              the + trigger: CdsButton `"data-chorus-callout": "attach"`, iconOnly, icon "Add", ghost,
//                            aria-label "Add files, connectors, and more" (OnsnuZtVJO), tooltip off, class "ms-0.5", in a
//                            CdsTooltip (side "bottom", shortcut "/", no content while the menu is open). Its testid is
//                            shared-1 S_ ("chat-input-attach", imported as Qd) — resolved through the import, not guessed.
//   shared-8 iN/oN/sN/cN/lN  the + menu's slot groups [base, tools, modes] and the filter that drops slots for agent mode /
//                            session hosts / per-chat-tools-unavailable (exported as Wi; c752b32f8 Js calls it as `dr`).
//                            Sliced verbatim (closed over themselves).
//   c752b32f8 na/ra/ia       the + menu testid table (add-menu-upload-file … add-menu-web-search) and its applier,
//                            sliced verbatim.
//   c752b32f8 Js             the assembly `[...base, separator-tools, ...tools, separator-modes, ...modes]` (separator
//                            labels picked; the slot object's keys are checked against iN, and `dr`/`ra` against lN/ra).
//   c752b32f8 Ws / Fs / ks   the uploadFile / screenshot / project slot descriptors (type, icon, copy) — picked literals.
//   c752b32f8 Es / Ms        (w13-chatfn-tools review 补做) the project slot's popup ks renders through As → Ms: Es's search
//                            labels and empty / failure rows, its chat project row ({type:"checkbox", icon:"Projects",
//                            closeOnClick}) and Ms's maxVisibleItems (shared-182 es, resolved through the import) —
//                            picked literals; the host (src/source-chat-project-popup.jsx) feeds them the local projects.
//   shared-5 Tz / yz         the webSearch / research slot descriptors (checkbox, Globe / Lock / Research icons, copy and
//                            research's disabled reasons) — picked literals.
// K3 / K5 (the separate tools menu and the style picker the plan names) are not extracted: 3.6556.2 has neither in the
// Chat composer (c9b54eb90 pe is the org/project tools hook, Extended thinking is a model-selector thinking mode, and the
// style ids are voice mode's / Code's output style); tests/w13-chat-composer-tools.test.mjs locks that evidence.
// Roots are found by stable features only (R2/E5): message ids, data-* values, class strings, literal tables.
//
// D0: own generator, own output folder (src/generated/chat-composer-menus), own scripts/verify-gen-chat-composer-menus.mjs.
// The host (src/source-chat-tools-menu.jsx) renders the trigger with the view-tabs CdsButton / CdsTooltip (E41: concrete
// shared-frame file, the card is in the composer graph) and the menu rows with the host SourceMenu; nothing generated
// here imports anything.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import { referenceVersion, referenceSnapshot, ionSource as source, looseFeature } from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'src/generated/chat-composer-menus');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const SHARED1 = 'shared-1-BJhqMmkf.js';
const SHARED5 = 'shared-5-Bg6ZMqvt.js';
const SHARED8 = 'shared-8-Db1QN4mf.js';
const SHARED182 = 'shared-182-BI1KJccu.js';
const ADD = 'c752b32f8-mYZAs6yC.js';
const I = '[\\w$]+';
const STR = '"((?:[^"\\\\]|\\\\.)*)"';
// A react-intl descriptor, single- or multi-line as prettier printed it; emitted in canonical one-line form.
const descriptor = id => new RegExp(`\\{\\s*defaultMessage: ${STR},\\s*id: "(${id.replace(/[+/]/g, '\\$&')})",?\\s*\\}`);

// Top-level declarations located by features (all must match exactly one declaration of the chunk).
const roots = {
  kF: { source: SHARED8, features: ['"data-chorus-callout": "attach"', 'id: "OnsnuZtVJO"', 'tooltip: !1'] },
  iN: { source: SHARED8, features: ['["uploadFile", "addPeople", "googleDrive", "addFolder", "teach", "screenshot", "shareScreen", "project", "github"]',
    '["skills", "connectors", "designSystem", "plugins", "devices"]', '["haystack", "research", "webSearch", "memory", "permissionMode"]'] },
  oN: { source: SHARED8, features: ['new Set(["project", "github", ...', '.filter((e) => e !== "memory" && e !== "permissionMode")'] },
  sN: { source: SHARED8, features: ['new Set(["designSystem", "googleDrive"])'] },
  cN: { source: SHARED8, features: ['"googleDrive", "teach", "haystack", "memory"]'] },
  lN: { source: SHARED8, exportAlias: 'Wi', features: ['return r && !a(t) ? [n(t, r)] : [];', 'return [o(iN[0]), o(iN[1]), o(iN[2])];'] },
  na: { source: ADD, features: ['uploadFile: "add-menu-upload-file"', 'screenshot: "add-menu-screenshot"', 'webSearch: "add-menu-web-search"'] },
  ra: { source: ADD, features: ['for (let e of Object.keys(na))', 'n && r && (t[e] = ia(n, r));'] },
  ia: { source: ADD, features: ['case "toggle":', 'case "submenu":', 'return { ...e, testId: t };'] },
  Js: { source: ADD, features: ['"separator-tools"', '"separator-modes"', '"composer.plus_menu.upload_file"', '"composer.plus_menu.web_search"'] },
  Ws: { source: ADD, features: ['id: "vVSGqeakjA"', 'icon: "Attachment"', 'focusesNothing: !0'] },
  Fs: { source: ADD, features: ['id: "fVVgugcqfW"', 'id: "uGOETn5bfV"', '"screenshot.png"'] },
  ks: { source: ADD, features: ['id: "VTbz0vOf5i"', 'icon: "Projects"'] },
  Es: { source: ADD, features: ['id: "x1GW6kgtFG"', 'id: "C1IFDydllb"', 'id: "gkvdf7tU5r"', 'id: "ld45uLSco8"'] },
  Ms: { source: ADD, features: ['{ popup: t } = e,', 'leadingRows: i, rows: a, maxVisibleItems:'] },
  Tz: { source: SHARED5, exportAlias: 'n', features: ['id: "0/w13aoHrd"', 'icon: "Globe"', 'icon: "Lock"'] },
  yz: { source: SHARED5, exportAlias: 's', features: ['id: "C5I8J3lxs3"', 'icon: "Research"', 'id: "CzjOV5rgPZ"', 'id: "WyiVeak7w5"'] },
};
// Sliced verbatim, in this order (dependencies first); each may only read the others in its chunk's group.
const sliced = { [SHARED8]: ['iN', 'oN', 'sN', 'cN', 'lN'], [ADD]: ['na', 'ia', 'ra'] };

// Literal picks: [name, root, pattern, group names, count]; each pattern must match `count` times (identically).
const picks = [
  ['messages.addFilesConnectorsAndMore', 'kF', descriptor('OnsnuZtVJO'), ['message']],
  ['trigger.button', 'kF', new RegExp(`${I}\\(${I}, \\{\\s*"data-testid": (${I}),\\s*\\.\\.\\.${I},\\s*"data-chorus-callout": ${STR},\\s*iconOnly: !0,\\s*icon: ${I},\\s*variant: ${STR},\\s*"aria-label": ${I},\\s*tooltip: !1,\\s*disabled: ${I},\\s*"aria-busy": ${I},\\s*className: ${I},\\s*\\}\\)`), ['testIdBinding', 'callout', 'variant']],
  ['trigger.icon', 'kF', new RegExp(`${I} = ${I} === void 0 \\? ${STR} : ${I},`), ['value']],
  ['trigger.className', 'kF', new RegExp(`${I}\\(\\$, \\d+, ${I}, ${I}\\(${STR}, ${I}\\)\\)`), ['value']],
  ['trigger.shortcut', 'kF', new RegExp(`${I} = ${I} \\? void 0 : ${STR},`), ['value']],
  ['trigger.tooltip', 'kF', new RegExp(`${I}\\(${I}, \\{ content: ${I}, side: ${STR}, shortcut: ${I}, children: ${I} \\}\\)`), ['side']],
  ['separators', 'Js', new RegExp(`\\[\\s*\\.\\.\\.${I},\\s*\\.\\.\\.\\(${I}\\.length > 0 \\? \\[\\{ type: "separator", label: ${STR} \\}, \\.\\.\\.${I}\\] : \\[\\]\\),\\s*\\.\\.\\.\\(${I}\\.length > 0 \\? \\[\\{ type: "separator", label: ${STR} \\}, \\.\\.\\.${I}\\] : \\[\\]\\),\\s*\\]`), ['tools', 'modes']],
  ['assembly', 'Js', new RegExp(`\\[${I}, ${I}, ${I}\\] = (${I})\\(\\s*(${I})\\(\\{([\\s\\S]*?)\\}\\),\\s*${I},\\s*${I},\\s*${I},\\s*${I},\\s*\\)`), ['split', 'testIds', 'slots']],
  ['messages.addFilesOrPhotos', 'Ws', descriptor('vVSGqeakjA'), ['message']],
  ['items.uploadFile', 'Ws', new RegExp(`\\{\\s*type: ${STR},\\s*label: ${I},\\s*icon: ${STR},\\s*onAction: ${I},\\s*focusesNothing: !0,\\s*shortcut: ${I},\\s*\\}`), ['type', 'icon']],
  ['messages.takeAScreenshot', 'Fs', descriptor('fVVgugcqfW'), ['message']],
  ['messages.couldNotCaptureScreen', 'Fs', descriptor('uGOETn5bfV'), ['message']],
  ['items.screenshot', 'Fs', new RegExp(`\\{ type: ${STR}, label: ${I}, icon: ${STR}, onAction: ${I} \\}`), ['type', 'icon']],
  ['messages.addToProject', 'ks', descriptor('VTbz0vOf5i'), ['message']],
  ['items.project', 'ks', new RegExp(`\\{ type: ${STR}, icon: ${STR}, label: ${I}, onOpenChange: ${I}, renderPopup: ${I} \\}`), ['type', 'icon']],
  ['messages.searchOrCreateProject', 'Es', descriptor('x1GW6kgtFG'), ['message']],
  ['messages.searchProjects', 'Es', descriptor('C1IFDydllb'), ['message']],
  ['messages.noMatches', 'Es', descriptor('96GJ5wSQam'), ['message']],
  ['messages.noProjectsYet', 'Es', descriptor('gkvdf7tU5r'), ['message']],
  ['messages.noProjectsAvailable', 'Es', descriptor('UN4PP2vYc0'), ['message']],
  ['messages.failedToLoadProjects', 'Es', descriptor('ld45uLSco8'), ['message']],
  ['items.projectRow', 'Es', new RegExp(`\\{\\s*type: ${STR},\\s*label: ${I}\\.project\\.name,\\s*subtitle: ${I}\\.project\\.creator\\.full_name,\\s*onAction: \\(\\) => void ${I}\\(${I}\\.project\\.uuid, ${I}\\.project\\.name\\),\\s*icon: ${STR},\\s*checked: ${I}\\.project\\.uuid === ${I},\\s*closeOnClick: !0,\\s*\\}`), ['type', 'icon']],
  ['items.projectNotice', 'Es', new RegExp(`\\{ type: ${STR}, label: ${I}, disabled: !0 \\}`), ['type'], 2],
  ['projectPopup', 'Ms', new RegExp(`${I}\\(\\{ search: ${I}, items: ${I}, leadingRows: ${I}, rows: ${I}, maxVisibleItems: (${I}) \\}\\)`), ['maxVisibleBinding']],
  ['messages.webSearch', 'Tz', descriptor('0/w13aoHrd'), ['message'], 2],
  ['items.webSearch', 'Tz', new RegExp(`\\{\\s*type: ${STR},\\s*label: ${I},\\s*icon: ${STR},\\s*checked: ${I},\\s*disabled: ${I},\\s*onAction: ${I},\\s*tooltip: ${I},\\s*closeOnClick: !0,\\s*\\.\\.\\.${I},\\s*\\}`), ['type', 'icon']],
  ['items.webSearchBlocked', 'Tz', new RegExp(`\\{\\s*type: ${STR},\\s*label: ${I},\\s*icon: ${STR},\\s*checked: !1,\\s*disabled: !0,\\s*closeOnClick: !1,\\s*tooltip: ${I},\\s*\\}`), ['type', 'icon']],
  ['messages.research', 'yz', descriptor('C5I8J3lxs3'), ['message']],
  ['messages.researchNeedsSearchTool', 'yz', descriptor('CzjOV5rgPZ'), ['message']],
  ['messages.researchNeedsSearchIntegration', 'yz', descriptor('WyiVeak7w5'), ['message']],
  ['items.research', 'yz', new RegExp(`\\{\\s*type: ${STR},\\s*label: ${I},\\s*icon: ${STR},\\s*checked: ${I},\\s*disabled: ${I},\\s*tooltip: ${I},\\s*onAction: ${I},\\s*closeOnClick: !0,\\s*\\.\\.\\.${I},\\s*\\}`), ['type', 'icon']],
];

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  // printWidth 120, as analysis tools/fmt.mjs (the readable copies the picks were written against).
  const code = await format(bytes.toString(), { parser: 'babel', printWidth: 120 });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  // local -> { imported, from } for every named import.
  const imported = new Map(ast.program.body.filter(n => n.type === 'ImportDeclaration')
    .flatMap(n => n.specifiers.filter(s => s.type === 'ImportSpecifier').map(s => [s.local.name, { imported: s.imported.name, from: n.source.value.replace(/^\.\//, '') }])));
  const record = { name, bytes, code, program, exported, imported };
  cache.set(name, record);
  return record;
}
const textOf = (src, p) => src.code.slice(p.node.start, p.node.end);
function findRoot(src, key, { features, exportAlias }) {
  const tests = features.map(f => looseFeature(f));
  const hits = Object.entries(src.program.scope.bindings).filter(([, b]) =>
    (b.path.isFunctionDeclaration() || b.path.isVariableDeclarator()) && tests.every(t => t.test(textOf(src, b.path))));
  if (hits.length !== 1) throw Error(`${src.name}: root ${key} matched ${hits.length} declarations (${hits.map(([n]) => n).join(', ')})`);
  const [local, binding] = hits[0];
  if (exportAlias && src.exported.get(exportAlias) !== local) throw Error(`${src.name}: ${exportAlias} no longer exports root ${key} (${local})`);
  return { local, path: binding.path, text: textOf(src, binding.path) };
}
const unescape = value => JSON.parse(`"${value}"`);
function setPath(target, dotted, value) {
  const keys = dotted.split('.');
  let at = target;
  for (const key of keys.slice(0, -1)) at = at[key] ??= {};
  at[keys.at(-1)] = value;
}

export async function extractChatComposerMenus({ check = false } = {}) {
  const cache = new Map();
  const found = {};
  for (const [key, spec] of Object.entries(roots)) {
    const src = await readSource(spec.source, cache);
    found[key] = { ...findRoot(src, key, spec), source: spec.source, src };
  }
  // Sliced declarations are closed over their group: they read no binding of the chunk outside it.
  for (const [chunk, keys] of Object.entries(sliced)) {
    const locals = new Set(keys.map(key => found[key].local));
    for (const key of keys) {
      const { src, path: p } = found[key];
      const free = Object.entries(src.program.scope.bindings).filter(([name, b]) => !locals.has(name)
        && b.referencePaths.some(q => q.node.start >= p.node.start && q.node.end <= p.node.end));
      if (free.length) throw Error(`${chunk} ${key} is no longer closed (reads ${free.map(([n]) => n).join(', ')})`);
    }
  }
  const allSliced = Object.values(sliced).flat().map(key => found[key].local);
  if (new Set(allSliced).size !== allSliced.length) throw Error(`sliced locals collide across chunks: ${allSliced.join(', ')}`);

  const data = {}, pickRecords = [];
  for (const [name, rootKey, pattern, groups, count = 1] of picks) {
    const text = found[rootKey].text;
    const all = [...text.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))];
    if (all.length !== count) throw Error(`pick ${name}: ${all.length} matches in ${rootKey} (${found[rootKey].source}), expected ${count}`);
    if (new Set(all.map(m => JSON.stringify(m.slice(1)))).size !== 1) throw Error(`pick ${name}: the ${count} matches differ`);
    const match = all[0];
    pickRecords.push({ name, root: rootKey, source: found[rootKey].source, sha256: sha(match[0]) });
    if (groups.length === 1 && groups[0] === 'message') {
      setPath(data, name, `{ defaultMessage: ${JSON.stringify(unescape(match[1]))}, id: ${JSON.stringify(match[2])} }`);
      continue;
    }
    if (groups.length === 1 && groups[0] === 'value') {
      setPath(data, name, unescape(match[1]));
      continue;
    }
    setPath(data, name, Object.fromEntries(groups.map((group, i) => [group, match[i + 1]])));
  }
  for (const item of Object.values(data.items)) for (const [k, v] of Object.entries(item)) item[k] = unescape(v);
  // The flag literals the item patterns above require verbatim (`focusesNothing: !0`, `closeOnClick: !0`, the blocked
  // web-search row's `checked: !1, disabled: !0, closeOnClick: !1`).
  Object.assign(data.items.uploadFile, { focusesNothing: true });
  Object.assign(data.items.webSearch, { closeOnClick: true });
  Object.assign(data.items.webSearchBlocked, { checked: false, disabled: true, closeOnClick: false });
  Object.assign(data.items.research, { closeOnClick: true });
  Object.assign(data.items.projectRow, { closeOnClick: true });
  Object.assign(data.items.projectNotice, { disabled: true });
  for (const k of ['callout', 'variant']) data.trigger.button[k] = unescape(data.trigger.button[k]);
  data.trigger.tooltip.side = unescape(data.trigger.tooltip.side);
  data.separators = { tools: unescape(data.separators.tools), modes: unescape(data.separators.modes) };

  // E5: the trigger's testid is the shared-1 constant kF imports (Qd => S_), resolved through the import declaration.
  const s8 = found.kF.src;
  const testIdImport = s8.imported.get(data.trigger.button.testIdBinding);
  if (!testIdImport || testIdImport.from !== SHARED1) throw Error(`kF data-testid ${data.trigger.button.testIdBinding} is not a ${SHARED1} import`);
  const s1 = await readSource(SHARED1, cache);
  const testIdLocal = s1.exported.get(testIdImport.imported);
  const testIdBinding = testIdLocal && s1.program.scope.bindings[testIdLocal];
  const testIdInit = testIdBinding?.path.isVariableDeclarator() ? testIdBinding.path.node.init : null;
  if (testIdInit?.type !== 'StringLiteral') throw Error(`${SHARED1} ${testIdImport.imported} (${testIdLocal}) is no longer a string constant`);
  if (testIdInit.value !== 'chat-input-attach') throw Error(`${SHARED1} ${testIdLocal} is now ${JSON.stringify(testIdInit.value)}`);
  data.trigger.button.testId = testIdInit.value;
  delete data.trigger.button.testIdBinding;
  // E5: Js splits through shared-8's lN (imported as Wi) after applying c752b32f8's ra, and passes exactly iN's slots.
  const add = found.Js.src;
  const splitImport = add.imported.get(data.assembly.split);
  if (!splitImport || splitImport.from !== SHARED8 || s8.exported.get(splitImport.imported) !== found.lN.local)
    throw Error(`Js no longer splits its slots with ${SHARED8} ${found.lN.local}`);
  if (data.assembly.testIds !== found.ra.local) throw Error(`Js no longer applies the testids with ${found.ra.local}`);
  // iN read from its AST (an array of string arrays), not evaluated.
  const groupsNode = found.iN.path.node.init;
  if (groupsNode?.type !== 'ArrayExpression' || !groupsNode.elements.every(g => g?.type === 'ArrayExpression' && g.elements.every(e => e?.type === 'StringLiteral')))
    throw Error(`${SHARED8} ${found.iN.local} is no longer an array of slot-name arrays`);
  const slotKeys = groupsNode.elements.flatMap(g => g.elements.map(e => e.value));
  let at = 0;
  for (const key of slotKeys) {
    const next = data.assembly.slots.indexOf(`\n${' '.repeat(10)}${key}:`, at);
    if (next < 0) throw Error(`Js slot ${key} missing or out of iN order`);
    at = next;
  }
  const topKeys = [...data.assembly.slots.matchAll(/\n {10}(\w+):/g)].map(m => m[1]);
  if (JSON.stringify(topKeys) !== JSON.stringify(slotKeys)) throw Error(`Js slot keys ${topKeys.join(',')} differ from iN`);
  delete data.assembly;
  // E5: Ms's maxVisibleItems is the shared-182 number constant c752b32f8 imports (es), read from its declaration.
  const maxImport = add.imported.get(data.projectPopup.maxVisibleBinding);
  if (!maxImport || maxImport.from !== SHARED182) throw Error(`Ms maxVisibleItems ${data.projectPopup.maxVisibleBinding} is not a ${SHARED182} import`);
  const s182 = await readSource(SHARED182, cache);
  const maxLocal = s182.exported.get(maxImport.imported);
  const maxInit = maxLocal && s182.program.scope.bindings[maxLocal]?.path.isVariableDeclarator() ? s182.program.scope.bindings[maxLocal].path.node.init : null;
  if (maxInit?.type !== 'NumericLiteral') throw Error(`${SHARED182} ${maxImport.imported} (${maxLocal}) is no longer a number constant`);
  data.items.project.maxVisibleItems = maxInit.value;
  const projectPopupResolved = { source: SHARED182, export: maxImport.imported, local: maxLocal, value: maxInit.value };
  delete data.projectPopup;

  const literal = value => typeof value === 'string' && value.startsWith('{ defaultMessage') ? value : JSON.stringify(value);
  const objectText = obj => `{ ${Object.entries(obj).map(([k, v]) => `${JSON.stringify(k)}: ${v && typeof v === 'object' ? objectText(v) : literal(v)}`).join(', ')} }`;
  const header = (sources) => `// Original Claude Desktop ${referenceVersion} code and literals from ${sources}; generated by extract-chat-composer-menus.mjs.\n// Edit the extractor, never this file.\n`;
  const declText = key => found[key].path.isVariableDeclarator() ? `var ${found[key].text};` : found[key].text;
  const slotsText = await format(`${header(`${SHARED8} iN, oN, sN, cN, lN and ${ADD} na, ia, ra (sliced)`)}` +
    `${[...sliced[SHARED8], ...sliced[ADD]].map(declText).join('\n')}\n` +
    `export { ${found.iN.local} as addMenuSlotGroups, ${found.lN.local} as splitAddMenuSlots, ${found.na.local} as addMenuTestIds, ${found.ra.local} as withAddMenuTestIds };\n`, { parser: 'babel' });
  const menu = { trigger: { ...data.trigger.button, icon: data.trigger.icon, className: data.trigger.className, tooltipSide: data.trigger.tooltip.side, shortcut: data.trigger.shortcut },
    separators: data.separators, items: data.items };
  const menuText = await format(`${header(`${SHARED8} kF, ${SHARED1} S_, ${ADD} Js / Ws / Fs / ks / Es / Ms, ${SHARED182} es and ${SHARED5} Tz / yz (picked literals)`)}` +
    `const chatAddMenuMessages = Object.freeze(${objectText(data.messages)});\n` +
    `const chatAddMenu = Object.freeze(${objectText(menu)});\n` +
    `export { chatAddMenuMessages, chatAddMenu };\n`, { parser: 'babel' });
  const files = { 'add-menu-slots.mjs': slotsText, 'add-menu.mjs': menuText };
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-chat-composer-menus.mjs', hostModule: 'src/source-chat-tools-menu.jsx',
    roots: Object.fromEntries(Object.entries(found).map(([key, f]) => [key, { source: f.source, local: f.local, sourceSha256: sha(f.src.bytes), sha256: sha(f.text), features: roots[key].features }])),
    resolved: { triggerTestId: { source: SHARED1, export: testIdImport.imported, local: testIdLocal, value: data.trigger.button.testId }, projectMaxVisibleItems: projectPopupResolved },
    modules: [
      { target: 'add-menu-slots.mjs', sources: [SHARED8, ADD], sha256: sha(slotsText), sliced: Object.values(sliced).flat(),
        exports: ['addMenuSlotGroups', 'splitAddMenuSlots', 'addMenuTestIds', 'withAddMenuTestIds'] },
      { target: 'add-menu.mjs', sources: [SHARED8, SHARED1, ADD, SHARED5, SHARED182], sha256: sha(menuText), exports: ['chatAddMenuMessages', 'chatAddMenu'] },
    ],
    picks: pickRecords };
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`chat composer menus output set changed: ${present.join(',')}. Run scripts/extract-chat-composer-menus.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`chat composer menus source mismatch: ${name}. Run scripts/extract-chat-composer-menus.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  console.log(`${check ? 'Verified' : 'Extracted'} chat composer menus (${Object.keys(roots).length} original ${referenceVersion} roots, ${pickRecords.length} picks).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractChatComposerMenus({ check: process.argv.includes('--check') });
