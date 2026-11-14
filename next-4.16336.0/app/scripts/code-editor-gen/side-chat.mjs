// Area "side-chat": side-chat geometry, context wire format, scroll, persistence, status, user segments/render,
// secrets, activity, plus the transcript selection hook. All ten adapters are cut from the 3.6556.2 snapshot
// (w10-editor-side-chat; research/w10-editor.md §2.2–2.3 and the binding table of plan-w10.md).
// Rules: names are the 3.6556.2 top-level bindings; every slice is pinned by stable features (R2/E5) so a reused
// minified name fails here instead of shipping other code. Compiled closures import the React Compiler helpers from
// the view-tabs shared-frame by semantic name (R3/E3) and React from its real module (reactAliases); the adapters
// that plain-node models and tests import (context, persistence, scroll, segments, render, secrets, activity,
// geometry) stay free of view-tabs (E42). Bindings another 3.6556.2 area already publishes are linked, not re-cut
// (D1): EE from working-line, the mention escape and `once` from r4e-findings, zod from mcp-app-host.
import { fs, path, root, parsers, readSource, sha } from './common.mjs';
import { referenceVersion as version, ionSource, vendorFrame, sharedFrame, reactAliases, compilerHelpers, assertVendorAlias, assertCompilerHelpers } from '../official-3.6556.2.mjs';
import { routinesSharedLink } from '../routines-shared-compat.mjs';

const ion = { base: 'ion', preserveKind: true };
const viewTabsFrame = `../view-tabs/${sharedFrame}`;

// Import specifiers of one official chunk: local -> { from, name }.
const chunkCache = new Map();
async function chunk(name) {
  if (!chunkCache.has(name)) {
    const { text } = await readSource(name, { base: 'ion' });
    const ast = parsers.babel.parse(text, {}), imports = new Map(), exports = new Map(), declared = new Set();
    for (const node of ast.program.body) {
      if (node.type === 'ImportDeclaration') for (const s of node.specifiers) imports.set(s.local.name, { from: node.source.value.replace(/^\.\//, ''), name: s.imported?.name ?? 'default' });
      if (node.type === 'ExportNamedDeclaration' && !node.source) for (const s of node.specifiers) exports.set(s.exported.name, s.local.name);
      if (node.id?.name) declared.add(node.id.name);
      for (const d of node.declarations ?? []) if (d.id.type === 'Identifier') declared.add(d.id.name);
    }
    chunkCache.set(name, { text, imports, exports, declared });
  }
  return chunkCache.get(name);
}

// originalBindings over the 3.6556.2 snapshot, failing when a wanted name is not a top-level declaration or a
// feature (stable literal) is missing from the cut text.
async function cut(originalBindings, file, names, features = []) {
  const { declared } = await chunk(file);
  const missing = names.filter(name => !declared.has(name));
  if (missing.length) throw Error(`${file} no longer declares ${missing.join(', ')}`);
  const result = await originalBindings(file, names, ion);
  // Features are written prettier-style; whitespace is ignored on both sides (the cut text is minified).
  const compact = result.text.replace(/\s+/g, '');
  for (const feature of features) if (!compact.includes(feature.replace(/\s+/g, ''))) throw Error(`${file} [${names.join(',')}] lost feature ${feature}`);
  return result;
}

// The chunk-level import of `local` must be `from`'s export `name`; returns that export's local declaration name.
async function importOf(file, local, from) {
  const spec = (await chunk(file)).imports.get(local);
  if (!spec || spec.from !== from) throw Error(`${file} ${local} is no longer imported from ${from} (${spec ? spec.from : 'missing'})`);
  const target = (await chunk(from)).exports.get(spec.name);
  if (!target) throw Error(`${from} does not export ${spec.name}`);
  return target;
}

// Import lines for chunk locals that come from vendor-frame (React, by reactAliases) or shared-frame (compiler helpers).
async function frameImports(file, locals) {
  const { imports } = await chunk(file), vendorText = (await chunk(vendorFrame)).text, byModule = new Map();
  const add = (module, member, local) => { if (!byModule.has(module)) byModule.set(module, []); byModule.get(module).push(member === local ? member : `${member} as ${local}`); };
  for (const local of locals) {
    const spec = imports.get(local);
    if (spec?.from === vendorFrame) { const { module, member } = assertVendorAlias(vendorText, spec.name, reactAliases[spec.name]); add(module, member, local); }
    else if (spec?.from === sharedFrame && compilerHelpers[spec.name]) {
      if (compilerHelpers[spec.name].local !== local) throw Error(`${file} imports compiler helper ${spec.name} as ${local}`);
      add(viewTabsFrame, compilerHelpers[spec.name].name, local);
    } else throw Error(`${file} ${local} is not a vendor-frame/shared-frame frame import (${spec ? spec.from + '#' + spec.name : 'missing'})`);
  }
  return [...byModule].map(([module, specifiers]) => `import {${specifiers.join(',')}} from '${module}';`).join('\n');
}

// D1 links: an output of another 3.6556.2 area, from the same official file and binding.
async function linked(area, target, { source, exported, features }) {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/generated', area, 'manifest.json'), 'utf8'));
  const entry = manifest.modules?.find(module => module.target === target);
  if (manifest.referenceVersion !== version || entry?.referenceVersion !== version || entry.source !== source) throw Error(`${area}/${target} is no longer the ${version} cut of ${source}`);
  const { text } = await readSource(source, { base: 'ion' });
  if (entry.sourceSha256 !== sha(text)) throw Error(`${area}/${target} was cut from another ${source}`);
  const output = await fs.readFile(path.join(root, 'src/generated', area, target), 'utf8');
  if (!features.every(feature => feature.test(output))) throw Error(`${area}/${target} no longer exports ${exported}`);
  return `../${area}/${target}`;
}

// Import lines for chunk locals: React through reactAliases, compiler helpers by semantic name, anything else through the
// view-tabs manifest's publicNames (the concrete view-tabs file and its semantic export), else generation fails.
async function viewTabsImports(file, locals) {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  const { imports } = await chunk(file), vendorText = (await chunk(vendorFrame)).text, byModule = new Map();
  for (const local of locals) {
    const spec = imports.get(local);
    let module, member;
    if (spec?.from === sharedFrame && compilerHelpers[spec.name]) {
      if (compilerHelpers[spec.name].local !== local) throw Error(`${file} imports compiler helper ${spec.name} as ${local}`);
      module = viewTabsFrame; member = compilerHelpers[spec.name].name;
    } else if (spec?.from === vendorFrame && reactAliases[spec.name]) ({ module, member } = assertVendorAlias(vendorText, spec.name, reactAliases[spec.name]));
    else {
      const published = spec && Object.entries(manifest.publicNames).find(([, entry]) => entry.file === spec.from && entry.export === spec.name);
      if (!published) throw Error(`${file} ${local} (${spec ? spec.from + '#' + spec.name : 'missing'}) is not published by view-tabs`);
      module = `../view-tabs/${spec.from}`; member = published[0];
    }
    if (!byModule.has(module)) byModule.set(module, []);
    byModule.get(module).push(member === local ? member : `${member} as ${local}`);
  }
  return [...byModule].map(([module, specifiers]) => `import {${specifiers.join(',')}} from '${module}';`).join('\n');
}

export async function emit({ adapter, originalBindings }) {
  assertCompilerHelpers((await chunk(sharedFrame)).text);
  const c96 = 'c96d752d0-CWv_7-n9.js', cccc = 'cccc2cf0a-DhZC33Gc.js', wire = 'c4d199b75-D3cQB-UP.js';

  // Geometry: cd97b284f is byte-identical in 3.6556.2; the handles moved to cccc2cf0a EF/DF.
  const sideRect = await cut(originalBindings, 'cd97b284f-Cpvb2TuL.js', ['e', 't'], ['rtl: o = !1', 'Math.max(280,']);
  const sideHandles = await cut(originalBindings, cccc, ['EF', 'DF'], ['"nwse-resize"', '"-top-[3px] inset-x-[8px] h-[6px]"']);
  await adapter('side-chat-geometry.mjs', `// Original panel placement, viewport rebasing, resize handles and cursors (${version}).\n${sideRect.text}\n${sideHandles.text}\nexport {e as sideChatRect,EF as sideChatResizeCursor,DF as sideChatResizeHandles};`, [sideRect.source, sideHandles.source], version);

  // Context: c4d199b75 wire (names unchanged) escapes mentions through shared-182 eh (`Nv`), which r4e-findings
  // publishes as neutralizeMentions; the Unicode-safe limit is c96d752d0 z9/B9.
  const contextWire = await cut(originalBindings, wire, ['oe', 'S', 'C', 'w', 'A', 'Se', 'Ne', 'B'], ['"<!-- attach -->"', '<!-- attach: ${', 'terminalTabId: r || void 0']);
  if (await importOf(wire, 'r', 'shared-182-BI1KJccu.js') !== 'eh') throw Error(`${wire} r is no longer shared-182 eh`);
  const mentions = await linked('r4e-findings', 'text-sanitize.mjs', { source: 'shared-182-BI1KJccu.js', exported: 'neutralizeMentions', features: [/\beh as neutralizeMentions\b/] });
  const contextLimit = await cut(originalBindings, c96, ['z9', 'B9'], ['= 1500', '\\u2026']);
  await adapter('side-chat-context.mjs', `// Original wire attachment serializer/parser and Unicode-safe selection limit.\nimport {neutralizeMentions as r} from '${mentions}';\n${contextWire.text}\n${contextLimit.text}\nexport {Se as sideChatContextQuestion,B as parseSideChatQuestion,z9 as sideChatContextLimit,B9 as truncateSideChatContext};`, [contextWire.source, contextLimit.source], version);

  // Transcript selection: compiled hook mn (c80ec48f8) with its constants; owner-window lookup is shared-25 pf (`ee`).
  const selectionFile = 'c80ec48f8-D2IVcRNS.js';
  const transcriptSelection = await cut(originalBindings, selectionFile, ['fn', 'pn', 'mn', 'hn'], ['"selectionchange"', 'containerOf:', 'e.cloneRange()', 'getSelection()?.removeAllRanges()']);
  if (await importOf(selectionFile, 'ee', 'shared-25-DOWZRSlq.js') !== 'pf') throw Error(`${selectionFile} ee is no longer shared-25 pf`);
  const ownerWindow = await cut(originalBindings, 'shared-25-DOWZRSlq.js', ['df', 'ff', 'pf'], ['= 9', '.ownerDocument)?.defaultView ?? null']);
  const selectionImports = await frameImports(selectionFile, ['J9', 'J0', 'J1', 'J3', 'K0', 'K1', 'K3', 'K4', 'h', 'n', 'u']);
  await adapter('transcript-selection.mjs', `// Original compiled selection hook (React Compiler helpers from view-tabs).\n${selectionImports}\n${ownerWindow.text}\nconst ee=pf;\n${transcriptSelection.text}\nexport {mn as useTranscriptSelection};`, [transcriptSelection.source, ownerWindow.source], version);

  // Scroll: the latest-user-turn callback now sits in a compiled K2(…) closure, so it is found by content, not by name
  // (research §2.2); its refs/session/store are reordered into the host signature (ref, sessionId, store, last).
  const scrollText = (await chunk(cccc)).text, scrollAst = parsers.babel.parse(scrollText, {}), scrollHits = [];
  (function find(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(find); return; }
    if (node.type === 'ArrowFunctionExpression' && node.body.type === 'BlockStatement') {
      const body = scrollText.slice(node.body.start, node.body.end);
      if (body.includes('messagesBySession') && body.includes('querySelectorAll') && body.includes('scrollHeight')) scrollHits.push(body);
    }
    for (const [key, value] of Object.entries(node)) if (key !== 'loc' && value && typeof value === 'object') find(value);
  })(scrollAst.program);
  if (scrollHits.length !== 1) throw Error(`${cccc}: expected one side-chat scroll callback, found ${scrollHits.length}`);
  const scrollBody = scrollHits[0];
  const head = /^\{let ([\w$]+)=([\w$]+)\.current;if\(!\1\)return;let [\w$]+=\(?([\w$]+)&&([\w$]+)\?\.getState\(\)\.messagesBySession\[\3\]\)?\|\|\[\],[\w$]+=[\w$]+\.at\(-1\)\?\.role==="assistant",[\w$]+=([\w$]+)\.current;if\(\(?\5\.current=\{el:/.exec(scrollBody);
  const tolerance = /\.scrollTop\+[\w$]+\.view<[\w$]+\.height-([\w$]+)\)return;/.exec(scrollBody)?.[1];
  const offset = /\+[\w$]+\.scrollTop-([\w$]+);[\w$]+\.scrollTo\(\{top:Math\.max\(/.exec(scrollBody)?.[1];
  const turnClass = /querySelectorAll\(`\.\$\{([\w$]+)\}`\)/.exec(scrollBody)?.[1];
  const empty = /(?:^|[,;{]|var )([\w$]+)=\{el:null,sessionId:null,turns:0,reply:!1,height:0,view:0\}/.exec(scrollText)?.[1];
  if (!head || !tolerance || !offset || !turnClass || !empty) throw Error(`${cccc}: side-chat scroll callback shape changed`);
  const [, , refName, sessionName, storeName, lastName] = head;
  const turnLocal = await importOf(cccc, turnClass, 'c2fd10b8d-DB1Sgoyz.js');
  const turnName = await cut(originalBindings, 'c2fd10b8d-DB1Sgoyz.js', [turnLocal], ['"epitaxy-user-turn"']);
  const scrollConstants = await cut(originalBindings, cccc, [offset, tolerance, empty], ['= 8', '= 4', 'sessionId: null']);
  await adapter('side-chat-scroll.mjs', `// Original latest-user-turn scroll callback. Refs and per-session message store are supplied by the host.\n${turnName.text}\nconst ${turnClass}=${turnLocal};\n${scrollConstants.text}\nexport function syncSideChatScroll(${refName},${sessionName},${storeName},${lastName})${scrollBody}\nexport {${empty} as emptySideChatScroll};`, [turnName.source, scrollConstants.source], version);

  // Persistence: c03935b01 Li now validates through zod (Fi/Ii/Ri); the schema builders are vendor-zod's y/T/w/N,
  // linked from mcp-app-host's zod cut. `localStorage` stays a host-supplied parameter.
  const persistFile = 'c03935b01-yhcY34vt.js';
  const zodLocals = { s: 'y', r: 'T', o: 'w', n: 'N' };
  for (const [local, name] of Object.entries(zodLocals)) { const spec = (await chunk(persistFile)).imports.get(local); if (spec?.from !== 'vendor-zod-fszujTq6.js' || spec.name !== name) throw Error(`${persistFile} ${local} is no longer vendor-zod ${name}`); }
  const zod = await linked('mcp-app-host', 'zod.mjs', { source: 'vendor-zod-fszujTq6.js', exported: 'y/T/w/N', features: ['y', 'T', 'w', 'N'].map(name => new RegExp(`^export \\{[^}]*\\bas ${name}[,\\s]`, 'm')) });
  const panelSchema = await cut(originalBindings, persistFile, ['Fi', 'Ii', 'Ri'], ['viewport: n().optional()', 'Ii.safeParse(e)']);
  const panelPersistence = await cut(originalBindings, persistFile, ['Li'], ['Fi.safeParse(JSON.parse(localStorage.getItem(e) ?? "null"))']);
  await adapter('side-chat-persistence.mjs', `// Original stored panel rectangle parser (zod schema); storage object supplied by host.\nimport {${Object.entries(zodLocals).map(([local, name]) => `${name} as ${local}`).join(',')}} from '${zod}';\n${panelSchema.text}\nexport function readSideChatPanelRect(localStorage,key){\n${panelPersistence.text}\nreturn Li(key);\n}`, [panelSchema.source, panelPersistence.source], version);

  // Status: compiled V6 with its 150ms hold (Het); EE is the label hold hook working-line already cuts from c96d752d0.
  const sideStatus = await cut(originalBindings, c96, ['Het', 'V6'], ['= 150', 'EE((u ? l : s) ?? "", 650, void 0, i.epoch)', '{ working: n, epoch: 0 }']);
  const holdLabel = await linked('working-line', 'working-line.mjs', { source: c96, exported: 'EE', features: [/^export \{[^}]*\sEE,?\s*\};/m] });
  const statusImports = await frameImports(c96, ['J9', 'J1', 'K1', 'J2', 'K3', 'I', 'D']);
  await adapter('side-chat-status.mjs', `// Original compiled status-label hook (React Compiler helpers from view-tabs).\n${statusImports}\nimport {EE} from '${holdLabel}';\n${sideStatus.text}\nexport {V6 as useSideChatStatusLabel};`, [sideStatus.source], version);

  // User segments: shared-frame whitespace (gn/_n/hn), shared-182 ny serializer, shared-7 parser (TP/bP/AP), and the
  // c4d199b75 segmentation Ye. Each part's chunk import aliases are re-created as consts.
  const userWhitespace = await cut(originalBindings, sharedFrame, ['fn', 'pn', 'mn', 'hn', 'gn', '_n', 'vn'], ['\\u200C|\\u200D|\\uFE0E|\\uFE0F', 'var mn = "$1"']);
  const serializeFile = 'shared-182-BI1KJccu.js', parseFile = 'shared-7-DBAgAi5H.js';
  const serializeAliases = { ee: 'gn', O: '_n', k: 'hn' };
  for (const [local, name] of Object.entries(serializeAliases)) if (await importOf(serializeFile, local, sharedFrame) !== name) throw Error(`${serializeFile} ${local} is no longer shared-frame ${name}`);
  const userSerialize = await cut(originalBindings, serializeFile, ['V_', 'H_', 'U_', 'W_', 'G_', 'K_', 'q_', 'J_', 'ev', 'tv', 'nv', 'rv', 'iv', 'yv', 'bv', 'xv', 'Sv', 'Cv', 'wv', 'Tv', 'Ev', 'Dv', 'Ov', 'kv', 'Av', 'jv', 'Mv', 'Nv', 'Pv', 'Fv', 'Iv', 'Lv', 'Rv', 'Wv', 'Gv', 'Kv', 'qv', 'Jv', 'Yv', 'ny'], ['e.type === "bulletList"', '`**${n}**`', 'e.type === "codeBlock"']);
  if (await importOf(parseFile, 'up', serializeFile) !== 'ny') throw Error(`${parseFile} up is no longer shared-182 ny`);
  const userParse = await cut(originalBindings, parseFile, ['bP', 'xP', 'SP', 'CP', 'wP', 'TP', 'EP', 'DP', 'OP', 'kP', 'AP'], ['f.ordered ? "orderedList" : "bulletList"', 'type: "listItem"', 'replaceAll("\\u00A0", " ")']);
  const segmentAliases = { s: 'TP', o: 'bP', a: 'AP' };
  for (const [local, name] of Object.entries(segmentAliases)) if (await importOf(wire, local, parseFile) !== name) throw Error(`${wire} ${local} is no longer shared-7 ${name}`);
  const userSegments = await cut(originalBindings, wire, ['G', 'K', 'Le', 'Re', 'ze', 'Be', 'Ve', 'He', 'q', 'Ue', 'We', 'Ge', 'Ke', 'qe', 'Je', 'Ye'], ['"   ".repeat(t.level)', 'ordered: e.type === "orderedList"']);
  const aliases = map => `const ${Object.entries(map).map(([local, name]) => `${local}=${name}`).join(',')};`;
  await adapter('side-chat-user-segments.mjs', `// Original text/list segmentation; serializer is private to parser round-trip checks.\n${userWhitespace.text}\n${aliases(serializeAliases)}\n${userSerialize.text}\nconst up=ny;\n${userParse.text}\n${aliases(segmentAliases)}\n${userSegments.text}\nexport {Ye as parseSideChatUserText};`, [userWhitespace.source, userSerialize.source, userParse.source, userSegments.source], version);

  // User render: c96d752d0 SP/xP (list direction via shared-5 eP, the fizzy-lake "type" part via shared-52 th, which
  // stays off locally per E12) and shared-10 Ns line breaks.
  const userRender = await cut(originalBindings, c96, ['hP', 'gP', '_P', 'vP', 'yP', 'bP', 'xP', 'SP'], ['epitaxy-user-list', '"text-body whitespace-pre-wrap [overflow-wrap:anywhere] text-pretty"', 'e.kind === "list"']);
  const renderLinks = { yf: ['c8187a2dc-Dp9Zia_4.js', ['e'], ['"[unicode-bidi:plaintext]"']], Vs: ['shared-5-Bg6ZMqvt.js', ['eP', 'tP', 'nP'], ['"rtl"', '"ltr"']], $r: ['shared-52-uHFNjl7C.js', ['Ym', 'Xm', 'Qm', '$m', 'eh', 'th'], ['"data-cds-fizzy-lake"', 'var Qm = [];']] };
  const renderParts = [], renderSources = [userRender.source];
  for (const [local, [file, names, features]] of Object.entries(renderLinks)) {
    const target = await importOf(c96, local, file), part = await cut(originalBindings, file, names, features);
    if (!names.includes(target)) throw Error(`${c96} ${local} is no longer one of ${file} ${names.join('/')}`);
    renderParts.push(`${part.text}\nconst ${local}=${target};`);
    renderSources.push(part.source);
  }
  const userBreaks = await cut(originalBindings, 'shared-10-D6FXWZph.js', ['Ns'], ['split(/\\r\\n?|\\n/)', 's("br", {})']);
  const renderImports = await frameImports(c96, ['f', '_']), breakImports = await frameImports('shared-10-D6FXWZph.js', ['d', 'p', 's']);
  await adapter('side-chat-user-render.mjs', `// Original user list renderer and line-break presentation.\n${renderImports}\n${breakImports}\n${renderParts.join('\n')}\n${userRender.text}\n${userBreaks.text}\nexport {SP as renderSideChatUserSegment,Ns as sideChatTextBreaks};`, [...renderSources, userBreaks.source], version);

  // Secrets: shared-104 detector/mask (al/fl/ml and their closure), with shared-0 AL (invisible text) and Pa (`once`,
  // published by r4e-findings).
  const secretsFile = 'shared-104-CTONUSaz.js';
  if (await importOf(secretsFile, 'bt', 'shared-0-DDOOdL6P.js') !== 'AL' || await importOf(secretsFile, 'Dt', 'shared-0-DDOOdL6P.js') !== 'Pa') throw Error(`${secretsFile} bt/Dt are no longer shared-0 AL/Pa`);
  const once = await linked('r4e-findings', 'once.mjs', { source: 'shared-0-DDOOdL6P.js', exported: 'once', features: [/^export \{ Pa as once \};/m] });
  // W13 G11 (D1): AL is routines-shared's shared-0 copy (no imports, plain node, E42), imported rather than re-cut.
  await cut(originalBindings, 'shared-0-DDOOdL6P.js', ['AL'], ['\\p{Default_Ignorable_Code_Point}\\u2800\\uFFFC']);
  const secretInvisible = await routinesSharedLink({ referenceVersion: version, ionSource, target: 'shared-0-DDOOdL6P.mjs', source: 'shared-0-DDOOdL6P.js', names: ['AL'] });
  const sideSecrets = await cut(originalBindings, secretsFile, ['bc', 'xc', 'Sc', 'Cc', 'wc', 'Tc', 'Ec', 'Dc', 'Oc', 'kc', 'Ac', 'jc', 'Mc', 'Nc', 'Pc', 'Fc', 'Ic', 'Lc', 'Rc', 'zc', 'Bc', 'Vc', 'Hc', 'Uc', 'Wc', 'Gc', 'Kc', 'qc', 'Jc', 'Yc', 'Xc', 'Zc', 'Qc', '$c', 'el', 'tl', 'nl', 'rl', 'il', 'al', 'ol', 'sl', 'cl', 'll', 'ul', 'dl', 'fl', 'ml', 'hl', 'gl', 'vl', 'yl'], ['id: "anthropic"', 'trigger: "sk-ant-"', 'id: "private_key"', '"\\u2022".repeat(e.length)']);
  await adapter('side-chat-secrets.mjs', `// Original secret detector, mask and whole-text redaction.\nimport {once as Dt} from '${once}';\nimport {AL} from '${secretInvisible}';\nconst bt=AL;\n${sideSecrets.text}\nexport {al as detectSideChatSecrets,fl as maskSideChatSecret,ml as maskSideChatSecrets};`, [sideSecrets.source], version);

  const sideActivity = await cut(originalBindings, cccc, ['gF'], ['case "Read":', 'defaultMessage: "Reading {file}"', 'defaultMessage: "Finding files"']);
  await adapter('side-chat-activity.mjs', `// Original side tool announcement; host supplies the intl formatter.\n${sideActivity.text}\nexport {gF as sideChatToolAnnouncement};`, [sideActivity.source], version);

  // W12 sidechat-cont: the class constants UF/HF/N_ draw with (strings only, no imports; E42-safe). UF's turn list and
  // empty notice pad with FF; HF's outer div is `ay` (c2fd10b8d gr → ss = `${os} gap-sm`, os = `${as} flex w-full …`); the
  // UserMessage bubble HF hands its body to (shared-2 r8 via `it`) is shaped by C3 and measured by w3; UF's pane is
  // c4db265df rn (`N_`): the Surface root Lt (`${It} ${z}`, z = shared-6 Vf → eh) or zt when flush, the body Qt, the
  // header line fh (rn inlines the same literal), the title span vh (`ce`) and the trailing row xh (`se`).
  const userTurnFile = 'c2fd10b8d-DB1Sgoyz.js', bubbleFile = 'shared-2-TF8v67kg.js', paneFile = 'c4db265df-fNhlkQCj.js', shellFile = 'shared-6-sd9jbJqs.js';
  if (await importOf(cccc, 'ay', userTurnFile) !== 'ss') throw Error(`${cccc} ay is no longer ${userTurnFile} ss`);
  if (await importOf(cccc, 'Ar', bubbleFile) !== 'i8') throw Error(`${cccc} Ar is no longer ${bubbleFile} i8 (UserMessage)`);
  if (await importOf(cccc, 'N_', paneFile) !== 'rn') throw Error(`${cccc} N_ is no longer ${paneFile} rn`);
  for (const [local, name] of Object.entries({ z: 'eh', se: 'xh', ce: 'vh' })) if (await importOf(paneFile, local, shellFile) !== name) throw Error(`${paneFile} ${local} is no longer ${shellFile} ${name}`);
  const inset = await cut(originalBindings, cccc, ['FF'], ['"px-lg pt-md pb-[24px]"']);
  const userTurn = await cut(originalBindings, userTurnFile, ['as', 'os', 'ss'], ['"epitaxy-user-turn"', '`${as} flex w-full flex-col min-w-0 ms-auto items-end`', '`${os} gap-sm`']);
  const bubble = await cut(originalBindings, bubbleFile, ['C3', 'w3'], ['"rounded-[var(--cds-message-bubble-radius)] px-[var(--cds-message-bubble-pad-x)] py-[var(--cds-message-bubble-pad-y)]"', '"max-w-[var(--cds-message-bubble-measure)]"']);
  const shell = await cut(originalBindings, shellFile, ['eh', 'ih', 'fh', 'vh', 'xh'], ['"dark:shadow-sm dark:not-forced-colors:outline', '"ps-[4px]"', '`text-body font-normal font-control text-secondary select-none truncate ${ih}`', '"relative z-[1] flex items-center gap-0.5 shrink-0 draggable-none"']);
  const pane = await cut(originalBindings, paneFile, ['Nt', 'It', 'Lt', 'zt', 'Qt'], ['= "panel"', '"min-w-0 shrink-0 relative isolate flex flex-col"', '`${It} ${z}`', '`${It} rounded-none shadow-none`', '"flex flex-col flex-1 min-h-0 overflow-hidden"']);
  // rn's classic header line (oe() / F("panels") are off locally, R15) inlines shared-6 fh's literal; keep them one string.
  const paneText = (await chunk(paneFile)).text, fhLiteral = /fh\s*=\s*("[^"]+")/.exec(shell.text)?.[1];
  if (!fhLiteral || !paneText.includes(`??(l?Vt:${fhLiteral})`)) throw Error(`${paneFile} rn no longer inlines ${shellFile} fh as its header line`);
  await adapter('side-chat-chrome.mjs', `// Original class constants of the side chat's turns and pane chrome (strings only).\n${inset.text}\n${userTurn.text}\n${bubble.text}\n${shell.text}\nconst z=eh;\n${pane.text}\nexport {FF as sideChatInsetClass,ss as sideChatUserTurnClass,C3 as userBubbleShapeClass,w3 as userBubbleMeasureClass,fh as paneHeaderLineClass,vh as paneTitleClass,xh as paneTrailingClass,Nt as paneElevation,Lt as paneRootClass,zt as paneFlushRootClass,Qt as paneBodyClass};`, [inset.source, userTurn.source, bubble.source, shell.source, pane.source], version);

  // W12 sidechat-cont: HF's snippet chips. HF draws `sy` (c2fd10b8d cc, MessageAttachments) with images LF = [] and its
  // snippets, so only cc's "Attached context" list renders: ul `${qs} gap-1` > uc → li > Xs (icon Quote, quiet, label
  // `e.label ?? ws(e.text)`, body): a CdsPreviewCard (shared-156 Ai, delay 200) whose Trigger is a 40px quote button and
  // whose Popup (side top, collisionPadding yt = shared-18 wU, className Ts) holds `us` (code undefined, body, width 420;
  // ds falls back to us without a file path). Imports resolve through the chunk's import table: React by reactAliases,
  // compiler helpers by semantic name, and CdsPreviewCard / CdsIcon / clsx by the view-tabs manifest's publicNames. This
  // target reaches view-tabs, so only the host component imports it (E42: no plain model does).
  const chipFile = userTurnFile, railFile = 'shared-18-D3y8YMFN.js';
  if (await importOf(cccc, 'sy', chipFile) !== 'cc') throw Error(`${cccc} sy is no longer ${chipFile} cc`);
  if (await importOf(chipFile, 'yt', railFile) !== 'wU') throw Error(`${chipFile} yt is no longer ${railFile} wU`);
  const ccText = (await chunk(chipFile)).text;
  for (const feature of ['a("ul",{role:"list",className:`${qs} gap-1`,"aria-label":f.formatMessage({defaultMessage:"Attached context",id:"k3uHjv4lto"}),children:[k.map(uc),'])
    if (!ccText.includes(feature)) throw Error(`${chipFile} cc lost feature ${feature}`);
  const chipPadding = await cut(originalBindings, railFile, ['wU'], ['{ top: 48, right: 8, bottom: 8, left: 8 }']);
  const chips = await cut(originalBindings, chipFile, ['ls', 'us', 'Cs', 'ws', 'Ts', 'qs', 'Xs', 'uc'], ['"[.epitaxy-user-turn_&]:justify-end"',
    '"flex flex-col gap-1 max-w-full min-w-0 max-h-[280px] overflow-y-auto p-md text-body select-text text-start rounded-[inherit]',
    '"text-body text-primary whitespace-pre-wrap [overflow-wrap:anywhere] [unicode-bidi:plaintext]"', 'Cs = 60', '`${t.slice(0, 59)}\\u2026`',
    '"epitaxy-root break-words !p-0 !min-w-0"', '`epitaxy-user-attachments flex flex-wrap max-w-full ${ls}`',
    '"grid place-items-center w-10 h-10 rounded-sm focus-visible:outline-hidden border-0 p-0 hide-focus-ring focus-visible:shadow-focus"',
    '"bg-alpha-2 text-muted-as-secondary"', 'r(Tt.Trigger, { render: r("button", { type: "button", "aria-label": o, className: p, children: m }) })',
    'r(Tt.Popup, { side: "top", collisionPadding: yt, className: Ts', 'a(Tt.Root, { delay: 200, children: [h, g] })',
    'r(Xs, { icon: "Quote", quiet: !0, label: e.label ?? ws(e.text), body: e.text })']);
  // ds(code: undefined, …) returns us; Xs calls ds, which is replaced by that branch (the diff path needs a file path), so
  // only uc (snippets: no code, no file path) is exported, not Xs itself.
  const dsText = ccText.slice(ccText.indexOf('function ds('), ccText.indexOf('function fs('));
  if (!dsText.includes('if(d===null||!f)return J3($,10,i,t,o)?K3($,10,i,t,o,r(us,{code:t,body:i,width:o})):$[13]') || !/u=null;break bb0/.test(dsText)) throw Error(`${chipFile} ds no longer falls back to us without a file path`);
  const chipImportLines = await viewTabsImports(chipFile, ['r', 'a', 't', 'Tt', 'L', 'J9', 'J1', 'K1', 'J2', 'K2', 'J3', 'K3', 'J5', 'K5']);
  const chipsText = chips.text.replace(/r\(ds,\s*\{\s*code:\s*s,\s*suggestion:\s*c,\s*body:\s*l,\s*filePath:\s*u,\s*startLine:\s*d,\s*width:\s*420\s*\}\)/, 'r(us,{code:s,body:l,width:420})');
  if (chipsText === chips.text) throw Error(`${chipFile} Xs no longer renders ds with width 420`);
  await adapter('side-chat-attachments.mjs', `// Original MessageAttachments context chips (cc's "Attached context" list items) for the side chat's user turns.\n${chipImportLines}\n${chipPadding.text}\nconst yt=wU;\n${chipsText}\nexport {qs as messageAttachmentsClass,uc as messageContextChipItem};`, [chipPadding.source, chips.source], version);

  // W12 sidechat-cont: N_'s header line onMouseDown `en` (c4db265df): a right-click (or macOS ctrl-click) pressed on a
  // header button does not move focus there, unless focus already sits in a text field inside the header. `_` is
  // shared-frame Iu (view-tabs asElementNode), `ie` shared-78 mE (isMacUserAgent), `U` shared-156 xr = BK (text-editable,
  // through open shadow roots), cut here with its closure.
  const editableFile = 'shared-156-BLTosN8U.js';
  if (await importOf(paneFile, 'U', editableFile) !== 'BK') throw Error(`${paneFile} U is no longer ${editableFile} BK`);
  const editable = await cut(originalBindings, editableFile, ['PK', 'IK', 'RK', 'zK', 'BK', 'VK'], ['.shadowRoot?.activeElement', 'n === "INPUT" || n === "TEXTAREA" || n === "SELECT"', 'return VK(e) || RK(IK(e), VK)']);
  const headerMouseDown = await cut(originalBindings, paneFile, ['en'], ['?.closest("button")', '!(e.button===2||e.button===0&&e.ctrlKey&&ie())', 'e.preventDefault()']);
  const headerImports = await viewTabsImports(paneFile, ['_', 'ie']);
  await adapter('side-chat-pane-events.mjs', `// Original pane header mouse-down guard (N_ en) and the text-editable check it reads.\n${headerImports}\n${editable.text}\nconst U=BK;\n${headerMouseDown.text}\nexport {en as paneHeaderMouseDown};`, [editable.source, headerMouseDown.source], version);
}
