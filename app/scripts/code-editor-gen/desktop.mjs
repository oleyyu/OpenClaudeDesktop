// Area "desktop": search engine (+ electron/generated/file-search.mjs), editor URI, side-chat history, CDP element
// inspector, Preview address parser, native tab shortcuts and link routing. Split out of extract-code-editor.mjs by
// w10-editor-split; migrated to 3.6556.2 by w10-editor-desktop (sources: ion-dist/assets/v1 and asar/.vite/build of
// snapshots/claude-3.6556.2-20261025-192807). Adapter file names and export names are unchanged (R4/E7).
import { parsers } from './common.mjs';
import { referenceVersion, looseFeature } from '../official-3.6556.2.mjs';

const ion = { base: 'ion' }, asar = { base: 'asar' };
// Main-process chunks: editor URI and side-chat history; CDP inspector, tab shortcuts and link origin.
const desktopEditorName = 'index.chunk-DNPOm2Zc.js';
const mentionName = 'index.chunk-C1YVpIsP.js';
const previewMainName = 'index.chunk-jPKPzV-P.js';
const id = '[\\w$]{1,3}';
const escapeName = name => name.replaceAll('$', '\\$');

// ESM import of `producer` inside `consumer` text -> `const <consumer local>=<producer local>` declarations, read from
// both modules' import/export specifiers (no minified name is pinned).
function importAliases(consumerText, producerName, producerText, wanted) {
  const exportsOf = new Map();
  for (const node of parsers.babel.parse(producerText, {}).program.body)
    if (node.type === 'ExportNamedDeclaration' && !node.source) for (const s of node.specifiers) exportsOf.set(s.exported.name ?? s.exported.value, s.local.name);
  const aliases = [];
  for (const node of parsers.babel.parse(consumerText, {}).program.body) {
    if (node.type !== 'ImportDeclaration' || node.source.value !== `./${producerName}`) continue;
    for (const s of node.specifiers) {
      const local = exportsOf.get(s.imported.name ?? s.imported.value);
      if (!local) throw Error(`${producerName} does not export ${s.imported.name}`);
      aliases.push([s.local.name, local]);
    }
  }
  if (wanted !== undefined && aliases.length !== wanted) throw Error(`Expected ${wanted} imports from ${producerName}, found ${aliases.length}`);
  return aliases;
}
const constAliases = aliases => `const ${aliases.map(([local, value]) => `${local}=${value}`).join(',')};`;

export async function emit({ adapter, copy, originalBindings, readSource }) {
  // Search engine (cc3bc2027) plus its normalization/escaping dependencies: shared-15 `ws` (imported as `G`, quote table
  // `cn` from shared-12 `b` exported as `P`) and shared-52 `qx` (imported as `Df`). The chunk also carries the diff
  // layout tokens and newline helpers that code-editor-current publishes; they stay unexported here.
  const search = await readSource('cc3bc2027-CqmDBxcX.js', ion);
  const shared15 = await readSource('shared-15-BvlV43cI.js', ion);
  const shared52 = await readSource('shared-52-uHFNjl7C.js', ion);
  const shared12 = await readSource('shared-12-Dro5Rhl0.js', ion);
  const normalize = await originalBindings('shared-15-BvlV43cI.js', ['xs', 'Ss', 'Cs', 'Ns', 'Ps', 'ws'], ion);
  const quotes = await originalBindings('shared-12-Dro5Rhl0.js', ['b'], ion);
  const escape = await originalBindings('shared-52-uHFNjl7C.js', ['qx'], ion);
  const searchImports = [...importAliases(search.text, 'shared-52-uHFNjl7C.js', shared52.text, 1), ...importAliases(search.text, 'shared-15-BvlV43cI.js', shared15.text, 1)];
  if (searchImports.map(([, local]) => local).join() !== 'qx,ws') throw Error('Search imports changed: ' + JSON.stringify(searchImports));
  const [[quotesLocal, quotesSource]] = importAliases(shared15.text, 'shared-12-Dro5Rhl0.js', shared12.text, 1);
  if (quotesSource !== 'b' || !normalize.text.includes(`of ${quotesLocal})`) || !/^const b=\[\["\\u2018","'"\]/.test(quotes.text)) throw Error('Search quote table changed');
  const searchAst = parsers.babel.parse(search.text, {});
  const searchBody = searchAst.program.body.filter(n => n.type !== 'ImportDeclaration' && n.type !== 'ExportNamedDeclaration').map(n => search.text.slice(n.start, n.end)).join('\n');
  for (const feature of ['var s={matchCase:!1,wholeWord:!1,regexp:!1}', 'var a=1e6;', 'function y(e,n){', 'function b(e,t,n,r){', 'function x(e,t,n){', 'function u(e,t){return e.isRegExp===!0&&t>c}'])
    if (!searchBody.includes(feature)) throw Error('Search engine shape changed: ' + feature);
  await adapter('search.mjs', `// Original 3.6556.2 search engine (cc3bc2027-CqmDBxcX); desktop-wide dependencies reduced to their exact pure bindings.
${quotes.text.replace(/^const b=/, `const ${quotesLocal}=`)}
${normalize.text}
${escape.text}
${constAliases(searchImports)}
${searchBody}
export {s as defaultSearchOptions, a as searchLimit, y as compileSearch, b as scanSearch, x as searchIndexFromLine, u as skipsLongLine, ws as normalizeSearchText};`, [search.source, normalize.source, quotes.source, escape.source], referenceVersion);

  // Desktop local editor URI (openInEditor): original Eh/kh encoding, integer line/column suffix and local URI shape.
  // The suffix declarators and local branch are found structurally; the protocol/path/line/column names come from them.
  const editorURI = await originalBindings(desktopEditorName, ['Eh', 'kh'], asar);
  const desktopEditor = await readSource(desktopEditorName, asar);
  const suffix = new RegExp(`let (${id})=Number\\.isInteger\\((${id})\\)&&\\2>0\\?\`:\\$\\{\\2\\}\`:"",(${id})=Number\\.isInteger\\((${id})\\)&&\\4>0\\?\`:\\$\\{\\4\\}\\$\\{\\1\\}\`:"",(${id});if\\(`).exec(desktopEditor.text);
  if (!suffix || desktopEditor.text.indexOf(suffix[0], suffix.index + 1) >= 0) throw Error('Original editor URI suffix marker changed');
  const [, , column, suffixName, line, uriName] = suffix;
  const tail = desktopEditor.text.slice(suffix.index, suffix.index + 2000);
  const local = new RegExp(`else ${escapeName(uriName)}=(\`\\$\\{(${id})\\}file/\\$\\{kh\\((${id})\\)\\}\\$\\{${escapeName(suffixName)}\\}\`);[^]*?"openInEditor: the editor did not start or exited early"\\),${id}\\}return await ${id}\\.shell\\.openExternal\\(${escapeName(uriName)}\\)`).exec(tail);
  if (!local) throw Error('Original editor local URI marker changed');
  const [, localURI, protocol, filePath] = local;
  const suffixText = suffix[0].slice(0, -'if('.length);
  await adapter('editor-location.cjs', `// Original 3.6556.2 desktop Eh/kh encoding and local URI/suffix expressions (index.chunk-DNPOm2Zc openInEditor). Host supplies protocol/path/position.
${editorURI.text}
function editorLocationURI(${protocol},${filePath},${line},${column}){${suffixText}return ${localURI};}
module.exports={editorLocationURI};`, [editorURI.source], referenceVersion);

  // Side-chat history d0 (bounded history and error-recovery replay text). Its assistant-mention escape is read through
  // the C1YVpIsP chunk namespace (`<ns>.t(...)`); the namespace and member are taken from d0 and that chunk's exports.
  const sideHistory = await originalBindings(desktopEditorName, ['s0', 'c0', 'l0', 'u0', 'd0'], asar);
  const mentionCall = /`Assistant: \$\{u0\(([\w$]+)\.([\w$]+)\(e\.text\)\)\}`/.exec(sideHistory.text);
  if (!sideHistory.text.includes('buildReplayPrompt') || !sideHistory.text.includes('<side_chat_history>') || !mentionCall) throw Error('Side history source bindings changed');
  const [, mentionNamespace, mentionMember] = mentionCall;
  if (!desktopEditor.text.includes(`${mentionNamespace}=require("./${mentionName}")`)) throw Error('Side history mention namespace changed');
  const mentionSource = await readSource(mentionName, asar);
  const mentionExport = new RegExp(`Object\\.defineProperty\\(exports,"${mentionMember}",\\{enumerable:!0,get:function\\(\\)\\{return (${id})\\}\\}\\)`).exec(mentionSource.text);
  if (!mentionExport) throw Error('Side history mention export changed');
  const mentions = await originalBindings(mentionName, [mentionExport[1]], asar);
  if (!mentions.text.includes('replaceAll("@","\\uff20")')) throw Error('Side history mention escape changed');
  await adapter('side-chat-history.cjs', `// Original 3.6556.2 desktop side-chat history, limits, escaping and replay prompt (index.chunk-DNPOm2Zc d0, index.chunk-C1YVpIsP).
${mentions.text}
const ${mentionNamespace}={${mentionMember}:${mentionExport[1]}};
${sideHistory.text}
module.exports={SideChatHistory:d0,escapeSideHistory:u0,escapeAssistantMentions:${mentionExport[1]}};`, [sideHistory.source, mentions.source], referenceVersion);
  await copy('search.mjs', 'electron/generated/file-search.mjs');
  await copy('editor-location.cjs', 'electron/generated/editor-location.cjs');

  // The CDP inspector is a large host class. Retain only its five complete inspect/context methods, plus their original
  // pure helpers and page function. The class is the one declaring captureElementContext (its name is not pinned).
  const inspectorHelpers = await originalBindings(previewMainName, ['Qh', 'Tai', 'Eai', 'Dai', 'CZ', 'Oai', 'kai', 'Aai', 'jai', 'Mai', 'Nai', 'wZ', 'Pai', 'Fai', 'PZ', 'woi', 'Eoi', 'Doi', 'voi', 'Toi', 'dsi'], { preserveKind: true, ...asar });
  const previewMain = await readSource(previewMainName, asar);
  const inspectorClasses = [];
  (function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) walk(child); return; }
    if (node.type === 'ClassBody' && node.body.some(member => member.key?.name === 'captureElementContext')) inspectorClasses.push(node);
    for (const key in node) if (key !== 'loc' && node[key] && typeof node[key] === 'object') walk(node[key]);
  })(parsers.babel.parse(previewMain.text, {}).program);
  if (inspectorClasses.length !== 1) throw Error(`Expected one original inspector class, found ${inspectorClasses.length}`);
  const inspectorMethodNames = ['enableInspectMode', 'disableInspectMode', 'releaseObjectGroup', 'captureReactComponent', 'captureElementContext'];
  const inspectorMethods = inspectorMethodNames.map(name => {
    const method = inspectorClasses[0].body.find(member => member.type === 'ClassMethod' && member.key?.name === name);
    if (!method) throw Error('Missing original inspector method ' + name);
    return previewMain.text.slice(method.start, method.end);
  }).join('\n');
  // The wrapper below supplies exactly these instance members; a new one in the methods must be wired explicitly.
  const members = [...new Set([...inspectorMethods.matchAll(/this\.([\w$]+)/g)].map(match => match[1]))].sort();
  const supplied = ['SCREENSHOT_PADDING', 'REACT_COMPONENT_TIMEOUT_MS', 'attached', 'captureReactComponent', 'emulationScale', 'ensureAttached', 'innerText', 'inspectModeCallback', 'outerHTML', 'parentElement', 'releaseObjectGroup', 'sendCommand', 'webContents'].sort();
  if (members.join() !== supplied.join()) throw Error('Original inspector instance members changed: ' + members.join(' '));
  if (!looseFeature('this.REACT_COMPONENT_TIMEOUT_MS,null);return n?X(n.result?.value):null}').test(inspectorMethods)) throw Error('Original inspector React capture changed');
  await adapter('preview-element-inspector.mjs', `// Original 3.6556.2 CDP inspect/highlight, element context and React fiber capture (index.chunk-jPKPzV-P). Host supplies only the native transport.
${inspectorHelpers.text}
export function createPreviewElementInspector({webContents,sendCommand,ensureAttached,emulationScale=()=>1,logger={debug(){},error(){}}}) {
const N=logger;
return new class {
get webContents(){return webContents;}
get attached(){return !webContents.isDestroyed() && webContents.debugger.isAttached();}
get emulationScale(){return emulationScale();}
SCREENSHOT_PADDING=80;
REACT_COMPONENT_TIMEOUT_MS=5000;
sendCommand(method,params){return sendCommand(method,params);}
ensureAttached(){return ensureAttached();}
${inspectorMethods}
};
}`, [inspectorHelpers.source], referenceVersion);
  await copy('preview-element-inspector.mjs', 'electron/generated/preview-element-inspector.mjs');

  // R3-terminal FT-15 (global-v01): the shared tab overflow row is retired (the Preview and terminal strips render
  // generated/code-current/terminal-tab-overflow.mjs); the driver's stale cleanup keeps its old output removed.
  // Preview address classifier (c224804cc) and its shared-25 Unicode helpers; the import aliases are read from both
  // modules. routines-shared also slices PH/FH, but this adapter is copied into the main process, so it keeps its own.
  const parserSource = await readSource('c224804cc-Ct9XIdre.js', ion);
  const shared25 = await readSource('shared-25-DOWZRSlq.js', ion);
  const parserImports = importAliases(parserSource.text, 'shared-25-DOWZRSlq.js', shared25.text, 3);
  const previewUnicode = await originalBindings('shared-25-DOWZRSlq.js', ['NH', 'PH', 'FH', 'MH'], ion);
  const previewParser = await originalBindings('c224804cc-Ct9XIdre.js', ['se', 'ce', 'le', 'ue', 'de', 'fe', 'q', 'J', 'Y', 'X', 'Z', 'Q', 'pe', 'me', 'he'], ion);
  if (!previewParser.text.includes('function me(e,t){let n=he(e,t);') || !previewParser.text.includes('https://www.google.com/search?q=')) throw Error('Original Preview address parser changed');
  await adapter('preview-address-parser.mjs', `// Original 3.6556.2 Preview address classifier and Unicode normalization (c224804cc-Ct9XIdre, shared-25-DOWZRSlq).
${previewUnicode.text}
${constAliases(parserImports)}
${previewParser.text}
export {me as parsePreviewAddress};`, [previewUnicode.source, previewParser.source], referenceVersion);
  await copy('preview-address-parser.mjs', 'electron/generated/preview-address-parser.mjs');

  const previewKeys = await originalBindings(previewMainName, ['fli', 'Sli', 'Oli', 'pli', 'Dli', 'Ali', 'kli', 'qst', 'Dun', 'Lgi', 'Rgi', 'mci'], asar);
  if (!previewKeys.text.includes('e.key.toLowerCase()!=="t"') || !previewKeys.text.includes('/^Digit[1-9]$/')) throw Error('Original Preview tab shortcuts changed');
  await adapter('preview-tab-shortcuts.mjs', `// Original 3.6556.2 native reopen/select/cycle key matchers and closed-tab history bounds (index.chunk-jPKPzV-P).
${previewKeys.text}
export {pli as reopenTabKey,Ali as selectTabKey,Dli as cycleTabKey,qst as closedTabsPerSession,Dun as closedTabSessions,Lgi as beginSyntheticInput,Rgi as endSyntheticInput};`, [previewKeys.source], referenceVersion);
  await copy('preview-tab-shortcuts.mjs', 'electron/generated/preview-tab-shortcuts.mjs');
  await copy('side-chat-history.cjs', 'electron/generated/side-chat-history.cjs');

  // Link chooser decisions (c11959232): Lf now reads paneOffered, Rf adds the cloud-session release branch.
  const linkDecisions = await originalBindings('c11959232-TLc_9Vpx.js', ['If', 'Lf', 'Rf', 'zf'], ion);
  if (!linkDecisions.text.includes('"prompt"') || !linkDecisions.text.includes('"release":"drop"')) throw Error('Original link decisions changed');
  await adapter('preview-link-decisions.mjs', `// Original 3.6556.2 Preview link chooser decisions (c11959232-TLc_9Vpx).
${linkDecisions.text}
export {If as linkArrival,Lf as linkCapabilities,Rf as linkDispatch,zf as linkConfirmation};`, [linkDecisions.source], referenceVersion);

  // Link origin EI and the external-only test. gWn now classifies Chrome Web Store links as "origin"/"other"; YM
  // (`gWn(e)!==null`) is the boolean every non-rendering caller uses, so it keeps the externalOnlyLink export.
  const linkOrigin = await originalBindings(previewMainName, ['MM', 'hWn', 'gWn', 'YM', 'o$n', 'TF', 'kF', 'nZn', 'DF', 'EI'], asar);
  if (!/function YM\(e\)\{return gWn\(e\)!==null\}/.test(linkOrigin.text) || !linkOrigin.text.includes('"https://chromewebstore.google.com"')) throw Error('Original external-only link test changed');
  await adapter('preview-link-origin.mjs', `// Original 3.6556.2 Preview link origin and external-only site test (index.chunk-jPKPzV-P).
${linkOrigin.text}
export {EI as previewLinkOrigin,YM as externalOnlyLink};`, [linkOrigin.source], referenceVersion);
  await copy('preview-link-origin.mjs', 'electron/generated/preview-link-origin.mjs');
}
