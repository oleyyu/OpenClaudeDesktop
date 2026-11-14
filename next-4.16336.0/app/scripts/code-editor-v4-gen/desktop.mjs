// Area "desktop", 4.16336.0 contract: search engine, editor URI, side-chat history, CDP element inspector, Preview address
// parser, native tab shortcuts, link chooser decisions and link origin. Same adapter file names and export names as the
// 3.6556.2 area (scripts/code-editor-gen/desktop.mjs), so a later production switch changes import paths only.
//
// Every root is located by AST (common.mjs locatePinned: the one top-level declaration carrying the probe or matching the
// pattern) and its raw declaration sha256 is pinned below; the copied code is the official program-scope closure of the
// roots (common.mjs slice; other chunks in their own block scope). Nothing is renamed or rewritten. Host-supplied parts
// are exactly those of the 3.6556.2 area: the editor protocol/path/position, the inspector's native transport
// (webContents, sendCommand, ensureAttached, emulationScale, attached) and its logger.
//
// 4.16336.0 vs 3.6556.2 (each adapter records `previous`):
//   search.mjs                 c5fbdc8eb-D_9kA6bR (3.6556.2 cc3bc2027-CqmDBxcX, which now only keeps the diff layout
//                              tokens): scanSearch also reports `waiting` lines (matcher.awaits); the regexp matcher's loop
//                              moved into its own function; normalization is shared-100 mc (shared-15 ws), escaping
//                              shared-62 pC (shared-52 qx).
//   editor-location.cjs        index.chunk-CqaSnEfn (index.chunk-DNPOm2Zc): same Eh/kh encoding, now qc/Xc.
//   side-chat-history.cjs      index.chunk-CqaSnEfn D1/E1 (d0/u0), mention escape index.chunk-DSL69jku (C1YVpIsP).
//   preview-element-inspector  index.chunk-Du-Wqi0E (index.chunk-jPKPzV-P): enableInspectMode now drives the inspect
//                              boxes / frame / zoom-out machinery; the 5 root methods reach 20 class methods (followed by
//                              `this.<member>`), their instance state starts as the official constructor sets it.
//   preview-address-parser     cf790d7f8-C-RpKvlh E/D (c224804cc-Ct9XIdre me/he): chrome-extension URLs are refused.
//   preview-tab-shortcuts      index.chunk-Du-Wqi0E: closedTabsPerSession / closedTabSessions are now located through
//                              rememberClosedTab (`urls.length > X && shift()`, `size > Y`). The 3.6556.2 area pinned
//                              qst / Dun, which are unrelated constants (a proxy poll interval and a plugin host cap) that
//                              happen to equal the real bounds (25 / 50, 3.6556.2 Efi / Dfi).
//   preview-link-decisions     c11959232-D8gLbLAI Fp/Ip/Lp/Rp (If/Lf/Rf/zf), unchanged bodies.
//   preview-link-origin        index.chunk-Du-Wqi0E (EI / YM): same bodies under new names.
const ion = 'ion', asar = 'asar';
const SEARCH = 'c5fbdc8eb-D_9kA6bR.js';
const NORMALIZE = 'shared-100-BBQR7Gmd.js';
const EDITOR = 'index.chunk-CqaSnEfn.js';
const PREVIEW_MAIN = 'index.chunk-Du-Wqi0E.js';
const ADDRESS = 'cf790d7f8-C-RpKvlh.js';
const LINKS = 'c11959232-D8gLbLAI.js';
const id = '[\\w$]{1,4}';
const escapeName = name => name.replaceAll('$', '\\$');

// Root pins: file -> export name -> { probe | pattern, features?, sha256 (raw declaration), previous (3.6556.2 local) }.
export const rootPins = {
  [SEARCH]: {
    defaultSearchOptions: { probe: '{matchCase:!1,wholeWord:!1,regexp:!1}', sha256: '4758f5a09d3a59be29aaeabb323d9b1c1c260c39de87e49199205fef652154de', previous: 's' },
    searchLimit: { pattern: /^[\w$]{1,3}=1e6$/, sha256: '04ddca79cdfb438c45f3ad70a3b51093ed5452defa1dd0794698eb045a6b3f66', previous: 'a' },
    compileSearch: { probe: '.isRegExp=!0),', features: ['wholeWord'], sha256: '76bcc2f025eeac2427ad634ca023d6c1c4035fa56216a3f812334b074485f2a0', previous: 'y' },
    scanSearch: { probe: 'hasLongLines:s,waiting:c,resume:', sha256: '902d76517d3e03f20bf8731657b1a793c01c964338ab3f866cfab24a01868764', previous: 'b' },
    searchIndexFromLine: { probe: 'n===1?r<e.length?r:0:r>0?r-1:e.length-1', sha256: 'a2dfefbd7892f39a2f8d1430410c49d930a8559d2c3740d71969a3c40b265521', previous: 'x' },
    skipsLongLine: { pattern: /^function [\w$]{1,3}\(e,t\)\{return e\.isRegExp===!0&&t>[\w$]{1,3}\}$/, sha256: '21a644f78071aabc3b1af94ac517595ddacddcb94fe52d6e7e900081200c98b2', previous: 'u' },
  },
  [NORMALIZE]: {
    normalizeSearchText: { probe: 'if(i===304||i===931)', features: ['.toLowerCase()'], sha256: 'c4799599bb9a638292588b975fa97ff32f855ac4e57e0067e7b832cd9ab96875', previous: 'shared-15 ws' },
  },
  [EDITOR]: {
    SideChatHistory: { probe: 'buildReplayPrompt(){', features: ['<side_chat_history>', 'cloneForRespawn(){'], sha256: 'd5d6bf74fab354abc8eab2b61a4315b948214e0a95a127b44bc6c81d5442167f', previous: 'd0' },
    escapeSideHistory: { probe: '/<\\/side_chat_history/gi', sha256: 'e0d02041dcc38384219d6658ac0a94900bd76a82826e6799ae904f20283f9868', previous: 'u0' },
  },
  [ADDRESS]: {
    parsePreviewAddress: { probe: 'if(n?.kind==="search"&&!', sha256: '0260120d350da5ff574448a311d7e9684366182d93c60c341b4af85e0801473c', previous: 'me' },
  },
  [LINKS]: {
    linkArrival: { probe: 'return t===e.url?e:{url:t,settled:n,prompted:!1}', sha256: '47376e2e395ad72a90ce258965d9b0973b8ed83289dfc14c1fd950d07929a91f', previous: 'If' },
    linkCapabilities: { probe: 'return{canRoute:e.linksInPreview&&e.infraOk,', sha256: '572d4278b6aaf0318a6188dfefa19346f2eb7c064f179bc783619ca167a55208', previous: 'Lf' },
    linkDispatch: { probe: 'return e.hasPendingUrl?e.chooserOpen?"hold"', sha256: '49894a846adfd08b6cc22fa8cb5676bef0101387cdc9d144c4c854304b5f1f23', previous: 'Rf' },
    linkConfirmation: { probe: 'e.inPreview?"keep":"release":"drop"', sha256: '666ea28d20212f4707526a60382b4cecb37a30abbbcf0f1885b436a574070054', previous: 'zf' },
  },
  [PREVIEW_MAIN]: {
    reopenTabKey: { pattern: /^function [\w$]{1,4}\(e,t\)\{return t\.enabled\?[\w$]{1,4}\(e,t,!0\):"pass"\}$/, sha256: '66e2f71a6e75473e37a562aa829d48844885ed91b59d8fa6a750604743180ee4', previous: 'pli' },
    selectTabKey: { probe: 'Number(e.code.slice(5))', sha256: '340d67460b0c41060f8add049c4959d0b4d20cc68c9c68fa202f4a679cf1a893', previous: 'Ali' },
    cycleTabKey: { probe: 'e.type!=="keyDown"||!e.control||e.meta||e.alt)return"pass"', sha256: 'c6d1836236442cbe0a21444e9eee13f78e7503773c378eab1069f2116f706087', previous: 'Dli' },
    beginSyntheticInput: { probe: 'return e.set(t,n),n+', sha256: '0dc776d982b583c1ce7f7cfd50bbb61d1820c8b5c2ceab266dc3d87157b4adbe', previous: 'Lgi' },
    endSyntheticInput: { probe: 'e.delete(t);let i=Date.now(),a=0;', sha256: '0e199c384ceca823d1ed5d34132ba0e55597fd03e673785b8f69e9f46945a277', previous: 'Rgi' },
    previewLinkOrigin: { probe: 'return`${t.protocol}//${a}${o}`', sha256: '739fe208214ed18828fdd7f7c4c255fc57d193fb66a0bcf4156700a1c9b7b7d0', previous: 'EI' },
    chromeWebStoreLink: { probe: 'n==="chromewebstore.google.com"?t.origin===', sha256: '267bffebf4db41a7e31b50af0ffaf66e6b1b3dbf79200dcf222977418c4ea3a5', previous: 'gWn' },
  },
};
// Pinned texts that are not top-level declarations: the openInEditor suffix/local-URI expressions, the inspector's
// selected class methods, the rememberClosedTab bounds read.
export const textPins = {
  editorURI: 'e218f6f6775627e741267eebd8f8d5b8f27e68611572312ee7b8925ce0b336dc',
  inspectorMethods: 'b429ad7facc6bc4ff946ae3d2ccb7d7d6e28fefac2f6d5ce2f0c85ddcd5b22ea',
  rememberClosedTab: '947498fa186f5d49242f004cd1a81098a5fab1817c989d9af8c935cc9fee68fc',
};

function roots(ctx, file, base) {
  const out = {};
  for (const [exportName, spec] of Object.entries(rootPins[file])) {
    const local = ctx.locatePinned(file, base, spec);
    out[exportName] = { file, local, sha256: spec.sha256, previous: spec.previous };
  }
  return out;
}
const pick = (all, names) => Object.fromEntries(names.map(n => [n, all[n]]));
const sha256Of = async text => (await import('node:crypto')).createHash('sha256').update(text).digest('hex');
async function pinText(label, text) {
  const actual = await sha256Of(text);
  if (actual !== textPins[label]) throw Error(`code-editor-v4 desktop: pinned text ${label} changed: sha256 ${actual} (pinned ${textPins[label]})`);
  return actual;
}
// The single top-level name a root chunk's import local is bound to in a slice: the consumer's local.
function importLocal(ctx, consumer, base, producer, producerLocal) {
  const c = ctx.chunk(consumer, base);
  const hits = [...c.imports].filter(([, { from, imported }]) => from === producer && ctx.exportedLocal(producer, base, imported) === producerLocal).map(([local]) => local);
  if (hits.length !== 1) throw Error(`${consumer}: expected one import of ${producer}#${producerLocal}, found ${hits.length}`);
  return hits[0];
}

// Module state among a slice's root-chunk declarations, recognised by its official declaration shape: a collection made
// at module load (`new Map(` / `new Set(`) or a numeric variable the slice (or `readers`, e.g. the copied class methods)
// increments (`<name>++` / `++<name>`).
function ownedStateOf(sliced, file, reasons, readers = '') {
  const out = {};
  for (const b of sliced.bindings) {
    if (b.file !== file) continue;
    const decl = sliced.text.match(new RegExp(`(?:^|[,\\s;])${escapeName(b.name)}=(new (?:Map|Set)\\(|\\d+[,;])`, 'm'));
    if (!decl) continue;
    const kind = decl[1].startsWith('new') ? 'collection' : 'reassigned';
    if (kind === 'reassigned' && !new RegExp(`(\\+\\+${escapeName(b.name)}|${escapeName(b.name)}\\+\\+)`).test(sliced.text + '\n' + readers)) continue;
    if (!reasons[kind]) throw Error(`${file}#${b.name}: ${kind} module state without a stated reason`);
    out[`${file}#${b.name}`] = reasons[kind];
  }
  return out;
}

export async function emit(ctx) {
  // Search engine.
  const searchRoots = { ...roots(ctx, SEARCH, ion), ...roots(ctx, NORMALIZE, ion) };
  const normalizeLocal = importLocal(ctx, SEARCH, ion, NORMALIZE, searchRoots.normalizeSearchText.local);
  const searchNames = ['defaultSearchOptions', 'searchLimit', 'compileSearch', 'scanSearch', 'searchIndexFromLine', 'skipsLongLine'];
  const search = ctx.slice(SEARCH, ion, searchNames.map(n => searchRoots[n].local).concat(normalizeLocal));
  await ctx.adapter('search.mjs', `// Original 4.16336.0 search engine (${SEARCH}) with its normalization (${NORMALIZE}) and escaping chunks.
${search.text}
export {${searchNames.map(n => `${searchRoots[n].local} as ${n}`).join(',')},${normalizeLocal} as normalizeSearchText};`,
  { sources: search.sources, bindings: search.bindings, roots: searchRoots, realm: 'renderer', productionRealms: ['renderer', 'main'], previous: 'cc3bc2027-CqmDBxcX.js' });

  // Desktop local editor URI (openInEditor): the integer line/column suffix and the local `file/` URI branch, read from
  // the one place they occur; the path encoder is the function the local branch calls.
  const editor = ctx.chunk(EDITOR, asar);
  const suffixRe = new RegExp(`let (${id})=Number\\.isInteger\\((${id})\\)&&\\2>0\\?\`:\\$\\{\\2\\}\`:"",(${id})=Number\\.isInteger\\((${id})\\)&&\\4>0\\?\`:\\$\\{\\4\\}\\$\\{\\1\\}\`:"",(${id});if\\(`, 'g');
  const suffixes = [...editor.text.matchAll(suffixRe)];
  if (suffixes.length !== 1) throw Error(`Expected one openInEditor suffix, found ${suffixes.length}`);
  const [suffix] = suffixes, [, , column, suffixName, line, uriName] = suffix;
  const tail = editor.text.slice(suffix.index, suffix.index + 3000);
  const local = new RegExp(`else ${escapeName(uriName)}=(\`\\$\\{(${id})\\}file/\\$\\{(${id})\\((${id})\\)\\}\\$\\{${escapeName(suffixName)}\\}\`);[^]*?"openInEditor: the editor did not start or exited early"\\),${id}\\}return await ${id}\\.shell\\.openExternal\\(${escapeName(uriName)}\\)`).exec(tail);
  if (!local) throw Error('Original editor local URI branch changed');
  const [, localURI, protocol, encoder, filePath] = local;
  const suffixText = suffix[0].slice(0, -'if('.length);
  const editorPin = await pinText('editorURI', suffixText + '\n' + localURI);
  const encode = ctx.slice(EDITOR, asar, [encoder]);
  if (!encode.text.includes('Refusing to build editor URI: path failed encode round-trip')) throw Error('Original editor path encoder changed');
  await ctx.adapter('editor-location.cjs', `// Original 4.16336.0 desktop path encoding and local URI/suffix expressions (${EDITOR} openInEditor). Host supplies protocol/path/position.
${encode.text}
function editorLocationURI(${protocol},${filePath},${line},${column}){${suffixText}return ${localURI};}
module.exports={editorLocationURI};`,
  { sources: encode.sources, bindings: encode.bindings, roots: { encodeEditorPath: { file: EDITOR, local: encoder, sha256: encode.bindings.find(b => b.name === encoder).sha256, previous: 'kh' }, editorURI: { file: EDITOR, text: 'openInEditor suffix + local branch', sha256: editorPin } }, realm: 'main', productionRealms: ['main'], previous: 'index.chunk-DNPOm2Zc.js' });

  // Side-chat history (bounded history and error-recovery replay text); the assistant-mention escape is the CommonJS
  // member it reads from the mention chunk.
  const sideRoots = roots(ctx, EDITOR, asar);
  const side = ctx.slice(EDITOR, asar, [sideRoots.SideChatHistory.local, sideRoots.escapeSideHistory.local]);
  const mention = new RegExp(`\`Assistant: \\$\\{${escapeName(sideRoots.escapeSideHistory.local)}\\((${id})\\.(${id})\\(e\\.text\\)\\)\\}\``).exec(ctx.chunk(EDITOR, asar).top.get(sideRoots.SideChatHistory.local).text);
  if (!mention) throw Error('Side history mention escape call changed');
  if (!side.text.includes('replaceAll("@","\\uff20")')) throw Error('Side history mention escape changed');
  await ctx.adapter('side-chat-history.cjs', `// Original 4.16336.0 desktop side-chat history, limits, escaping and replay prompt (${EDITOR}, mention escape index.chunk-DSL69jku).
${side.text}
module.exports={SideChatHistory:${sideRoots.SideChatHistory.local},escapeSideHistory:${sideRoots.escapeSideHistory.local},escapeAssistantMentions:${mention[1]}.${mention[2]}};`,
  { sources: side.sources, bindings: side.bindings, roots: sideRoots, realm: 'main', productionRealms: ['main'], previous: 'index.chunk-DNPOm2Zc.js d0' });

  // CDP inspector: the five inspect/context methods of the original preview host class plus every class method they
  // reach; the host supplies the native transport and the logger.
  const host = ['webContents', 'sendCommand', 'ensureAttached', 'emulationScale', 'attached'];
  const inspector = ctx.classMethods(PREVIEW_MAIN, asar, {
    anchors: ['captureElementContext', 'enableInspectMode', 'captureReactComponent'],
    roots: ['enableInspectMode', 'disableInspectMode', 'releaseObjectGroup', 'captureReactComponent', 'captureElementContext'], host,
  });
  if (inspector.hostUsed.join() !== [...host].sort().join()) throw Error('Original inspector host members changed: ' + inspector.hostUsed.join(' '));
  const methodsPin = await pinText('inspectorMethods', inspector.methodText + '\n' + inspector.fieldInits.join('\n'));
  const loggers = inspector.refs.filter(name => /createLogger\)/.test(ctx.chunk(PREVIEW_MAIN, asar).top.get(name)?.text ?? ''));
  if (loggers.length !== 1) throw Error(`Expected the inspector methods to read one logger, found ${loggers.join(', ') || 'none'}`);
  const inspectorSlice = ctx.slice(PREVIEW_MAIN, asar, inspector.refs, { stop: loggers, imports: inspector.imports });
  const stoppedBy = [...(inspectorSlice.stopped.get(loggers[0]) ?? [])];
  if (stoppedBy.join() !== '(root)') throw Error(`The logger is read by sliced declarations too (${stoppedBy.join(', ')})`);
  await ctx.adapter('preview-element-inspector.mjs', `// Original 4.16336.0 CDP inspect/highlight, element context and React fiber capture (${PREVIEW_MAIN}). Host supplies only the native transport and logger.
${inspectorSlice.text}
export function createPreviewElementInspector({webContents,sendCommand,ensureAttached,emulationScale=()=>1,logger={debug(){},error(){}}}) {
const ${loggers[0]}=logger;
return new class {
constructor(){${inspector.fieldInits.join(',')};}
get webContents(){return webContents;}
get attached(){return !webContents.isDestroyed() && webContents.debugger.isAttached();}
get emulationScale(){return emulationScale();}
sendCommand(method,params){return sendCommand(method,params);}
ensureAttached(){return ensureAttached();}
${inspector.methodText}
};
}`, { sources: inspectorSlice.sources, bindings: inspectorSlice.bindings, roots: { inspectorMethods: { file: PREVIEW_MAIN, methods: inspector.methods, fields: inspector.fields, sha256: methodsPin } }, realm: 'main', productionRealms: ['main'], previous: 'index.chunk-jPKPzV-P.js',
    ownedState: ownedStateOf(inspectorSlice, PREVIEW_MAIN, {
      collection: 'official read-only lookup table of the computed-style capture (Map built at module load)',
      reassigned: 'official module-level object-group counter of captureElementContext (`element-context:${++n}`), shared by every inspector in the main process as in the official class',
    }, inspector.methodText) });

  // Preview address classifier.
  const addressRoots = roots(ctx, ADDRESS, ion);
  const address = ctx.slice(ADDRESS, ion, [addressRoots.parsePreviewAddress.local]);
  if (!address.text.includes('https://www.google.com/search?q=')) throw Error('Original Preview address parser changed');
  await ctx.adapter('preview-address-parser.mjs', `// Original 4.16336.0 Preview address classifier and Unicode normalization (${ADDRESS}).
${address.text}
export {${addressRoots.parsePreviewAddress.local} as parsePreviewAddress};`,
  { sources: address.sources, bindings: address.bindings, roots: addressRoots, realm: 'main', productionRealms: ['main'], previous: 'c224804cc-Ct9XIdre.js',
    ownedState: ownedStateOf(address, ADDRESS, { collection: 'official read-only Set of navigable URL schemes (http, https)' }) });

  // Native reopen/select/cycle key matchers, synthetic-input windows and the closed-tab history bounds.
  const previewRoots = roots(ctx, PREVIEW_MAIN, asar);
  const remember = ctx.classMethods(PREVIEW_MAIN, asar, { anchors: ['rememberClosedTab', 'displayUrlForTab'], roots: ['rememberClosedTab'], host: ['tabs', 'sessionWorkingDir', 'offersTabReopen', 'serverId'] });
  const bounds = new RegExp(`\\.length>(${id})&&${id}\\.shift\\(\\),[^]*?\\.size>(${id})\\)`).exec(remember.methodText);
  if (remember.methods.join() !== 'rememberClosedTab' || !bounds) throw Error('Original closed-tab history bounds changed');
  await pinText('rememberClosedTab', remember.methodText);
  const [, perSession, sessions] = bounds;
  const keyNames = ['reopenTabKey', 'selectTabKey', 'cycleTabKey', 'beginSyntheticInput', 'endSyntheticInput'];
  const keys = ctx.slice(PREVIEW_MAIN, asar, [...keyNames.map(n => previewRoots[n].local), perSession, sessions]);
  for (const local of [perSession, sessions]) if (!/^[\w$]+=\d+$/.test(ctx.chunk(PREVIEW_MAIN, asar).top.get(local).text)) throw Error(`Closed-tab bound ${local} is no longer a number`);
  if (!keys.text.includes('e.key.toLowerCase()!=="t"') || !keys.text.includes('/^Digit[1-9]$/')) throw Error('Original Preview tab shortcuts changed');
  const shortcutRoots = { ...pick(previewRoots, keyNames),
    closedTabsPerSession: { file: PREVIEW_MAIN, local: perSession, sha256: keys.bindings.find(b => b.name === perSession).sha256, via: 'rememberClosedTab', previous: 'qst (wrong identity, see header)' },
    closedTabSessions: { file: PREVIEW_MAIN, local: sessions, sha256: keys.bindings.find(b => b.name === sessions).sha256, via: 'rememberClosedTab', previous: 'Dun (wrong identity, see header)' } };
  await ctx.adapter('preview-tab-shortcuts.mjs', `// Original 4.16336.0 native reopen/select/cycle key matchers and closed-tab history bounds (${PREVIEW_MAIN}).
${keys.text}
export {${keyNames.map(n => `${previewRoots[n].local} as ${n}`).join(',')},${perSession} as closedTabsPerSession,${sessions} as closedTabSessions};`,
  { sources: keys.sources, bindings: keys.bindings, roots: shortcutRoots, realm: 'main', productionRealms: ['main', 'renderer'], previous: 'index.chunk-jPKPzV-P.js' });

  // Link chooser decisions.
  const linkRoots = roots(ctx, LINKS, ion);
  const linkNames = ['linkArrival', 'linkCapabilities', 'linkDispatch', 'linkConfirmation'];
  const links = ctx.slice(LINKS, ion, linkNames.map(n => linkRoots[n].local));
  await ctx.adapter('preview-link-decisions.mjs', `// Original 4.16336.0 Preview link chooser decisions (${LINKS}).
${links.text}
export {${linkNames.map(n => `${linkRoots[n].local} as ${n}`).join(',')}};`,
  { sources: links.sources, bindings: links.bindings, roots: linkRoots, realm: 'renderer', productionRealms: ['renderer'], previous: 'c11959232-TLc_9Vpx.js' });

  // Link origin and the external-only test (`<chrome web store classifier>(e)!==null`, the boolean every non-rendering
  // caller uses, located through the classifier it calls).
  const store = previewRoots.chromeWebStoreLink.local;
  const external = ctx.locate(PREVIEW_MAIN, asar, { pattern: new RegExp(`^function ${id}\\(e\\)\\{return ${escapeName(store)}\\(e\\)!==null\\}$`) });
  const origin = ctx.slice(PREVIEW_MAIN, asar, [previewRoots.previewLinkOrigin.local, external]);
  if (!origin.text.includes('"https://chromewebstore.google.com"')) throw Error('Original external-only link test changed');
  await ctx.adapter('preview-link-origin.mjs', `// Original 4.16336.0 Preview link origin and external-only site test (${PREVIEW_MAIN}).
${origin.text}
export {${previewRoots.previewLinkOrigin.local} as previewLinkOrigin,${external} as externalOnlyLink};`,
  { sources: origin.sources, bindings: origin.bindings, roots: { ...pick(previewRoots, ['previewLinkOrigin', 'chromeWebStoreLink']), externalOnlyLink: { file: PREVIEW_MAIN, local: external, sha256: origin.bindings.find(b => b.name === external).sha256, via: 'chromeWebStoreLink', previous: 'YM' } }, realm: 'renderer', productionRealms: ['renderer', 'main'], previous: 'index.chunk-jPKPzV-P.js' });

  // Production electron/generated copies of the 3.6556.2 area (cutover list; this staged graph writes none).
  for (const [name, target] of [['search.mjs', 'electron/generated/file-search.mjs'], ['editor-location.cjs', 'electron/generated/editor-location.cjs'],
    ['preview-element-inspector.mjs', 'electron/generated/preview-element-inspector.mjs'], ['preview-address-parser.mjs', 'electron/generated/preview-address-parser.mjs'],
    ['preview-tab-shortcuts.mjs', 'electron/generated/preview-tab-shortcuts.mjs'], ['side-chat-history.cjs', 'electron/generated/side-chat-history.cjs'],
    ['preview-link-origin.mjs', 'electron/generated/preview-link-origin.mjs']]) ctx.copyTarget(name, target);
}
