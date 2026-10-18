// Preserve original grammar/core bytes; isolate pure editor behavior from desktop host hooks.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
const root = path.resolve(import.meta.dirname, '..');
const source = path.resolve(root, '../reference/current-2.31226.0/ion-dist/assets/v1');
const output = path.join(root, 'src/generated/code-editor');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const wrapperName = 'cbd02b8f2-Bbrhywu4.js';
const wrapperBytes = await fs.readFile(path.join(source, wrapperName));
const wrapper = await format(wrapperBytes.toString(), { parser: 'babel' });
const ast = parsers.babel.parse(wrapper, {});
const coreImport = ast.program.body.find(n => n.type === 'ImportDeclaration' && n.source.value === './c148e7537-Ks6hIVju.js');
const core = wrapper.slice(coreImport.start, coreImport.end);
function between(start, end) {
 const a=wrapper.indexOf(start), b=wrapper.indexOf(end,a);
 if(a<0||b<0) throw Error(`Missing original source range ${start} / ${end}`);
 return wrapper.slice(a,b);
}
function bindings(names) {
 return names.map(name => {
  for(const node of ast.program.body) {
   if(node.id?.name===name)return wrapper.slice(node.start,node.end);
   const d=node.declarations?.find(d=>d.id.name===name);
   if(d)return 'var '+wrapper.slice(d.start,d.end)+';';
  }
  throw Error('Missing binding '+name);
 }).join('\n');
}
const languageBody = between('var $n =', 'function hi(');
const importsIn = text => [...text.matchAll(/(?:from\s*|import\()"(\.\/[^\"]+\.js)"/g)].map(m=>m[1]);
const names = ['c148e7537-Ks6hIVju.js','vendor-prosemirror-DGtrMU0c.js',...importsIn(languageBody).map(n=>n.slice(2))];
const allowed = new Set([...names, 'rolldown-runtime-C3OYiQ02.js', 'c2a6d07ee-BJ-FI6y2.js']);
const manifest = { referenceVersion:'2.31226.0', modules:[], adapters:[] };
await fs.mkdir(output,{recursive:true});
const seen=new Set();
for (let cursor=0; cursor<names.length; cursor++) {
 const name=names[cursor]; if(seen.has(name))continue; seen.add(name);
 if(!allowed.has(name))throw Error(`Unexpected original dependency ${name}`);
 const bytes=await fs.readFile(path.join(source,name));
 const tree=parsers.babel.parse(bytes.toString(),{});
 const imports=tree.program.body.filter(n=>n.source).map(n=>n.source.value);
 for(const spec of imports) { if(!spec.startsWith('./'))throw Error(`External dependency ${spec}`); names.push(spec.slice(2)); }
 await fs.writeFile(path.join(output,name),bytes);
 manifest.modules.push({name,imports,sha256:sha(bytes),bytes:bytes.length});
}
async function adapter(name, text, sources, referenceVersion) {
 // 2.37337.1 design-system compatibility: retain the extracted behavior while
 // adopting the official logical-direction utilities removed from the old bundle.
 // The manifest records that rename (the committed manifest carried this note
 // before the generator emitted it; R1-style made the generator reproduce it).
 let styleCompatibility;
 if (name === 'preview-element-chip.mjs') text = text.replaceAll('"mr-xs"', '"me-xs"');
 if (name === 'preview-element-chip.mjs') styleCompatibility = '2.37337.1 logical-direction utility rename; behavior and original source provenance retained';
 const formatted=await format(text,{parser:'babel'});
 await fs.writeFile(path.join(output,name),formatted);
 manifest.adapters.push({name,sha256:sha(formatted),sources,...(styleCompatibility?{styleCompatibility}:{}),...(referenceVersion?{referenceVersion}:{})});
}
const provenance=[{name:wrapperName,sha256:sha(wrapperBytes)}];
const filenameName='c26fb8b6b-EDdRebCk.js', filenameBytes=await fs.readFile(path.join(source,filenameName));
const filenameSource=filenameBytes.toString(), filenameAst=parsers.babel.parse(filenameSource,{});
const filenameParts=[];
for(const node of filenameAst.program.body){
 for(const d of node.declarations??[])if(['C','w','T','Xe'].includes(d.id.name))filenameParts.push('const '+filenameSource.slice(d.start,d.end)+';');
 if(node.id?.name==='Ze')filenameParts.push(filenameSource.slice(node.start,node.end));
}
await adapter('filename-language.mjs',`// Original filename aliases; only basename is adapted locally.\nconst ae = path => path.replaceAll('\\\\','/').split('/').at(-1);\n${filenameParts.join('\n')}\nexport { Ze as filenameLanguage };`,[{name:filenameName,sha256:sha(filenameBytes)}]);
await adapter('languages.mjs',`// Original loader table, parsers, caching and comment-token overrides. Host rollout/background/preload adapters are local.\n${core}\nimport {filenameLanguage as de} from './filename-language.mjs';\nconst se = path => path.replaceAll('\\\\','/').split('/').at(-1);\nconst h=()=>true, g=load=>load(), v=(_options,load)=>load();\n${languageBody}\nexport {fi as loadEditorLanguage, di as cachedEditorLanguage, ai as resolveEditorLanguage};`,provenance);
const pieces=[between('var jt =','function rn('),between('function mn(', 'function wn('),between('var W = -1,','var $n ='),between('var Ki =','function Yi('),bindings(['Zi','Qi','$i','ea','ta']),between('var ra =','function sa('), between('var Si =','function Oi('), bindings(['kn'])];
await adapter('editing.mjs',`// Pure behavior extracted from the original editor wrapper. No account/desktop hooks.\n${core}\nconst y=()=>typeof navigator!=='undefined' && /Mac/.test(navigator.platform);\nconst b={cursor:{interactive:{cssVar:'pointer'}}};\n${pieces.join('\n')}\nexport {Ft as detectIndentation, ta as detectedIndentation, Zi as resetIndentation, Kt as bracketIndentation, en as bracketJump, qt as editorKeymap, oa as autoCloseBrackets, aa as tabIndentation, ia as columnSelection, Cn as codeFolding, Qn as indentGuides, tn as insertTabIndent, Wt as bracketEnter, Xt as jumpBracket};\nexport {wi as rememberEditorView, Ei as restoreEditorView, Di as restoredHistory, kn as restoredFolds};\nexport const baseLanguageBehavior=[dt(), k(), qi, B(), nt()];`,provenance);
await adapter('selection.mjs',`// Original selection tooltip, line-gutter drag and inline comment widgets.\n${core}\nconst _=node=>node.ownerDocument.defaultView, ee=_;\nconst Ji=Ve.define();\n${between('function hi(', 'function xi(')}\n${between('function Dn(', 'var W = -1,')}\n${between('var ya =', 'function La(')}\n${bindings(['Ua','Ga','qa','Ya','Xa','Za'])}\nexport {Xa as commentRangeHighlight, Ya as setCommentRange, Za as rangeHighlightTheme, Ta as selectionActions, Hn as selectableLineNumbers, Fa as commentWidgets, ka as setCommentSlots, Ia as hoveredEditorLine, An as lineRangeSelection, jn as lineSelectionAnchor, _i as selectedEditorContext, vi as selectionTooltipAnchor, yi as selectionTooltipCoords};`,provenance);
// Original search engine plus its small normalization/escaping dependencies.
const searchName='cc3bc2027-9j7QM9E7.js';
const searchBytes=await fs.readFile(path.join(source,searchName));
async function originalBindings(name, wanted, { preserveKind = false } = {}) {
 const bytes=await fs.readFile(path.join(source,name)), text=bytes.toString(), ast=parsers.babel.parse(text,{});
 const parts=[];
 for(const node of ast.program.body){
  if(wanted.includes(node.id?.name))parts.push(text.slice(node.start,node.end));
  for(const d of node.declarations??[])if(wanted.includes(d.id.name))parts.push((preserveKind ? node.kind : 'const')+' '+text.slice(d.start,d.end)+';');
 }
 return {text:parts.join('\n'),source:{name,sha256:sha(bytes)}};
}
const normalize=await originalBindings('shared-15-q2q-pQA_.js',['Pi','Fi','Ii','Li','Ri','G']);
const quotes=await originalBindings('shared-12-BDBaKIbU.js',['le']);
const escape=await originalBindings('shared-125-CbVXqztB.js',['_f']);
const searchText=searchBytes.toString(), searchAst=parsers.babel.parse(searchText,{});
const searchBody=searchAst.program.body.filter(n=>n.type!=='ImportDeclaration'&&n.type!=='ExportNamedDeclaration').map(n=>searchText.slice(n.start,n.end)).join('\n');
await adapter('search.mjs',`// Original search engine; desktop-wide dependencies reduced to their exact pure bindings.\n${quotes.text}\nconst At=le;\n${normalize.text}\n${escape.text}\nconst e=_f,t=G;\n${searchBody}\nexport {i as defaultSearchOptions, n as searchLimit, p as compileSearch, m as scanSearch, h as searchIndexFromLine, s as skipsLongLine, G as normalizeSearchText};`,[{name:searchName,sha256:sha(searchBytes)},normalize.source,quotes.source,escape.source]);
const terminalName='c6bf19e8f-BmwVB0LV.js', terminalBytes=await fs.readFile(path.join(source,terminalName));
const terminalSource=await format(terminalBytes.toString(),{parser:'babel'});
const terminalGeometry=terminalSource.slice(terminalSource.indexOf('var Br = 8,'),terminalSource.indexOf('function Xr('));
if(!terminalGeometry.includes('function Yr('))throw Error('Terminal selection source markers changed');
await adapter('terminal-selection.mjs',`// Original terminal selection geometry, with no desktop dependencies.\n${terminalGeometry}\nexport {Wr as terminalSelectionEndRow, Gr as terminalSelectionBox, qr as isWholeTerminalSelection, Jr as wholeTerminalSelectionAnchor, Yr as terminalSelectionPillPosition};`,[{name:terminalName,sha256:sha(terminalBytes)}]);
const terminalCommands=terminalSource.slice(terminalSource.indexOf('var Pt = "__gb__1475692361"'),terminalSource.indexOf('var Bt = "__gb__1802682766"'));
if(!terminalCommands.includes('function zt('))throw Error('Terminal command source markers changed');
await adapter('terminal-commands.mjs',`// Original OSC 133 command markers, decorations and boundary navigation. Feature enabled locally.\nconst g=()=>true;\n${terminalCommands}\nexport {zt as installTerminalCommands};`,[{name:terminalName,sha256:sha(terminalBytes)}]);
const terminalOutput=await originalBindings(terminalName,['kn','jn','Mn','Nn','Pn','Kn']);
await adapter('terminal-output.mjs',`// Original selected/visible terminal output attachment and replay-banner normalization.\n${terminalOutput.text}\nexport {Kn as attachVisibleTerminalOutput, Pn as terminalSelectionText};`,[terminalOutput.source]);
const terminalMouse=await originalBindings(terminalName,['Fr']);
await adapter('terminal-mouse.mjs',`// Original terminal-program context-menu ownership. Platform detection is supplied by the host.\nexport function terminalOwnsContextMenu(term,event,mac) { const E=()=>mac;\n${terminalMouse.text}\nreturn Fr(term,event); }`,[terminalMouse.source]);
const terminalColors=await originalBindings(terminalName,['Tn','En','Dn','On']);
await adapter('terminal-colors.mjs',`// Original color OSC policy: preserve the UI theme while allowing color queries.\n${terminalColors.text}\nexport {En as installTerminalColorPolicy};`,[terminalColors.source]);
const contentGroups=await originalBindings('cccc2cf0a-DHtZKTKW.js',['uy','fy','py','my','hy','gy','_y']);
await adapter('file-content-results.mjs',`// Original content-search grouping and snippet layout.\n${contentGroups.text}\nexport {uy as groupContentResults,my as collapseContentWhitespace,_y as contentSnippetLayout};`,[contentGroups.source]);
const editorPath=await originalBindings('shared-28-MgJrblDu.js',['kk','mk','Ak']);
const editorImage=await originalBindings('shared-100-Bs3K3KCN.js',['Ba','Va','qa','Ya']);
await adapter('file-editor-path.mjs',`// Original non-text/image exclusion used by file-menu editor actions.\n${editorImage.text}\nconst sa=Ya;\n${editorPath.text}\nexport {Ak as canOpenFileInEditor};`,[editorPath.source,editorImage.source]);
const fileSelection=await originalBindings('c856385e2-BYfwNIMj.js',['L','Re','ze','Be']);
await adapter('file-selection.mjs',`// Original selection store and range/select-all operations. Store runtime supplied by host.\nexport function createOriginalFileSelection(re){\n${fileSelection.text}\nreturn Re();}\n${(await originalBindings('c856385e2-BYfwNIMj.js',['ze','Be'])).text}\nexport {ze as selectFileRange,Be as selectAllFiles};`,[fileSelection.source]);
const dragContext=await originalBindings('c194f2b35-CUAxC_le.js',['w','T','E','O','k','A','j']);
await adapter('file-context-drag.mjs',`// Original in-window file-context drag protocol; rollout enabled locally.\nconst D=()=>true;\n${dragContext.text.replace('const T=', 'let T=')}\nexport {O as beginFileContextDrag,k as isFileContextDrag,A as draggedFilePaths,j as commitFileContextDrag,E as clearFileContextDrag};`,[dragContext.source]);
const blankTree=await originalBindings('cccc2cf0a-DHtZKTKW.js',['Jv','Yv']);
await adapter('file-tree-pointer.mjs',`// Original blank-area pointer selection rules, including scrollbar exclusion.\n${blankTree.text}\nexport {Jv as isBlankTreeTarget,Yv as isBlankTreePress};`,[blankTree.source]);
// Desktop local editor URI: preserve original encoding, integer suffix and URI shape.
const desktopEditorName='../../../desktop/index.chunk-D5UeOeQn.js';
const editorURI=await originalBindings(desktopEditorName,['tm','im']);
const desktopEditorText=await fs.readFile(path.join(source,desktopEditorName),'utf8');
const suffixStart=desktopEditorText.indexOf('let d=Number.isInteger(o)&&o>0?');
const suffixEnd=desktopEditorText.indexOf('if(c)',suffixStart);
const localURIMatch=desktopEditorText.slice(suffixEnd).match(/else p=(`[^;]+`);return await Fe.shell.openExternal/);
if(suffixStart<0||suffixEnd<0||!localURIMatch)throw Error('Original editor URI markers changed');
await adapter('editor-location.cjs',`// Original desktop tm/im encoding and local URI/suffix expressions. Host supplies protocol/path/position.\n${editorURI.text}\nfunction editorLocationURI(a,u,i,o){${desktopEditorText.slice(suffixStart,suffixEnd)}return ${localURIMatch[1]};}\nmodule.exports={editorLocationURI};`,[editorURI.source]);
// Side-chat geometry follows 2.42304.0: n/s handles use inset-x-[8px] (was left-/right-[8px]) and the
// rect takes an optional rtl flag (default false). Names are relative to `source`, as verify-code-editor resolves them.
const sideChatVersion='2.42304.0', sideChatSource='../../../../installed-2.42304.0-20261017/ion-dist/assets/v1/';
const sideRect=await originalBindings(sideChatSource+'cd97b284f-Cpvb2TuL.js',['e','t']);
const sideHandles=await originalBindings(sideChatSource+'cccc2cf0a-B0D--VZp.js',['sk','ck']);
await adapter('side-chat-geometry.mjs',`// Original panel placement, viewport rebasing, resize handles and cursors (${sideChatVersion}).\n${sideRect.text}\n${sideHandles.text}\nexport {e as sideChatRect,sk as sideChatResizeCursor,ck as sideChatResizeHandles};`,[sideRect.source,sideHandles.source],sideChatVersion);
// Side-chat context wire format and transcript selection lifecycle from the current snapshot.
const contextWire=await originalBindings('c4d199b75-BZcAZW6m.js',['oe','S','C','w','A','Se','Ne','B']);
const mentionEscape=await originalBindings('shared-175-mecppX10.js',['Nh','Ph','pg','mg','hg','gg','vg','xg']);
const contextLimit=await originalBindings('cd5a31703-B4nKQMBN.js',['X9','Z9']);
await adapter('side-chat-context.mjs',`// Original wire attachment serializer/parser and Unicode-safe selection limit.\nconst T=fn=>{let value;return()=>value??=fn();};\n${mentionEscape.text}\nconst n=xg;\n${contextWire.text}\n${contextLimit.text}\nexport {Se as sideChatContextQuestion,B as parseSideChatQuestion,X9 as sideChatContextLimit,Z9 as truncateSideChatContext};`,[contextWire.source,mentionEscape.source,contextLimit.source]);
const transcriptSelection=await originalBindings('c80ec48f8-CFtcrlMH.js',['ot','st','lt','ct']);
await adapter('transcript-selection.mjs',`// Original selection hook. React and owner-window resolution supplied by host.\nimport {useState as t,useEffect as n,useRef as o,useCallback as l} from 'react';\nconst S=node=>node?.ownerDocument?.defaultView;\n${transcriptSelection.text}\nexport {ct as useTranscriptSelection};`,[transcriptSelection.source]);
// Current kT scroll callback: keep the latest user turn near the top instead of tail-following.
const scrollFile='cccc2cf0a-DHtZKTKW.js',scrollBytes=await fs.readFile(path.join(source,scrollFile)),scrollSource=scrollBytes.toString();
const scrollAst=parsers.babel.parse(scrollSource,{});let scrollCallback;
function findScroll(node){
 if(!node||typeof node!=='object')return;
 if(node.type==='VariableDeclarator'&&node.id?.name==='re'&&node.init?.arguments?.[0]?.type==='ArrowFunctionExpression'){
   const body=node.init.arguments[0].body,text=scrollSource.slice(body.start,body.end);
   if(text.includes('ne.current')&&text.includes('querySelectorAll')&&text.includes('scrollHeight'))scrollCallback=text;
 }
 for(const value of Object.values(node))if(Array.isArray(value))value.forEach(findScroll);else if(value&&typeof value==='object')findScroll(value);
}
findScroll(scrollAst);if(!scrollCallback)throw Error('Original side-chat scroll callback missing');
const scrollConstants=await originalBindings(scrollFile,['yT','bT','xT']);
await adapter('side-chat-scroll.mjs',`// Original kT scroll callback. Refs and per-session message store are supplied by the host.\nconst Aa='epitaxy-user-turn';\n${scrollConstants.text}\nexport function syncSideChatScroll(V,g,l,ne)${scrollCallback}\nexport {xT as emptySideChatScroll};`,[scrollConstants.source]);
const panelPersistence=await originalBindings('c03935b01-DOWikwO_.js',['Xn','Zn']);
await adapter('side-chat-persistence.mjs',`// Original stored panel rectangle parser; storage object supplied by host.\nexport function readSideChatPanelRect(localStorage,key){\n${panelPersistence.text}\nreturn Xn(key);\n}`, [panelPersistence.source]);
// Current working-label debounce and minimum display hold used by side-chat iT/Ta.
const sideStatus=await originalBindings('cd5a31703-B4nKQMBN.js',['pj','$tt','Z8']);
await adapter('side-chat-status.mjs',`// Original current status-label hook; React supplied by host.\nimport {useState as g,useEffect as b,useRef as D} from 'react';\n${sideStatus.text}\nexport {Z8 as useSideChatStatusLabel};`,[sideStatus.source]);
// Current OT user-message segmentation, including list/fence round-trip rules.
const userWhitespace=await originalBindings('shared-frame-DVFSKIcx.js',['sn','ln','dn','un']);
const userSerialize=await originalBindings('shared-175-mecppX10.js',['ky','Sy','yy','vy','_y','by','xy','dy','ry','ny','ty','$v','ey','Qv','Zv','uy','Xv','ly','iy','oy','cy','sy','ay'],{preserveKind:true});
const userParse=await originalBindings('shared-7-CJO19piq.js',['lE','mE','uE','dE','fE','pE','hE','gE','_E','vE','yE']);
const userSegments=await originalBindings('c4d199b75-BZcAZW6m.js',['G','K','Le','Re','ze','Be','Ve','He','q','Ue','We','Ge','Ke','qe','Je','Ye']);
await adapter('side-chat-user-segments.mjs',`// Original text/list segmentation; serializer is private to parser round-trip checks.\n${userWhitespace.text}\nconst Ho=ln,Uo=un;\n${userSerialize.text}\nconst Hd=ky;\n${userParse.text}\nconst o=yE,a=lE,s=mE;\n${userSegments.text}\nexport {Ye as parseSideChatUserText};`,[userWhitespace.source,userSerialize.source,userParse.source,userSegments.source]);
const userRender=await originalBindings('cd5a31703-B4nKQMBN.js',['UR','WR','GR']);
const userBreaks=await originalBindings('shared-11-Bx4tMrIf.js',['hl']);
await adapter('side-chat-user-render.mjs',`// Original OT list renderer and Bp's newline presentation.\nimport {jsx as k,jsxs as P,Fragment as T} from 'react/jsx-runtime';\nconst w=k,O=P;\n${userRender.text}\n${userBreaks.text}\nexport {GR as renderSideChatUserSegment,hl as sideChatTextBreaks};`,[userRender.source,userBreaks.source]);
// Current Bp secret scanning/masking, including token suffixes and invisible text.
const secretInvisible=await originalBindings('shared-0-tP5vNlHv.js',['xA','k']);
const sideSecrets=await originalBindings('shared-100-Bs3K3KCN.js',["Rs", "ys", "hs", "os", "ps", "us", "ds", "ss", "cs", "fs", "ls", "ms", "_s", "vs", "gs", "As", "ws", "Ts", "xs", "Ds", "Os", "ks", "Es", "Ls", "Cs", "Ps", "Ms", "js", "Ns", "Is", "Fs", "Ws", "Bs", "Vs", "Hs", "Us", "Js", "Ks", "qs", "bs", "zs"],{preserveKind:true});
await adapter('side-chat-secrets.mjs',`// Original current secret detector, mask and whole-text redaction.\n${secretInvisible.text}\nconst ve=xA,E=k;\n${sideSecrets.text}\nexport {Rs as detectSideChatSecrets,Ws as maskSideChatSecret,Ks as maskSideChatSecrets};`,[secretInvisible.source,sideSecrets.source]);
const sideActivity=await originalBindings('cccc2cf0a-DHtZKTKW.js',['rT']);
await adapter('side-chat-activity.mjs',`// Original side tool announcement; host supplies the intl formatter.\n${sideActivity.text}\nexport {rT as sideChatToolAnnouncement};`,[sideActivity.source]);
// Current desktop XU: bounded side-chat history and error-recovery replay text.
const sideHistory=await originalBindings(desktopEditorName,['KU','qU','JU','YU','XU']);
const sideHistoryMentions=await originalBindings('../../../desktop/index.chunk-CiiI592G.js',['qUr']);
if(!sideHistory.text.includes('buildReplayPrompt')||!sideHistoryMentions.text.includes('function qUr'))throw Error('Side history source bindings changed');
await adapter('side-chat-history.cjs',`// Original desktop side-chat history, limits, escaping and replay prompt.\n${sideHistoryMentions.text}\nconst t={pv:qUr};\n${sideHistory.text}\nmodule.exports={SideChatHistory:XU,escapeSideHistory:YU,escapeAssistantMentions:qUr};`,[sideHistory.source,sideHistoryMentions.source]);
const workerMatcher=await fs.readFile(path.join(output,'search.mjs'));
await fs.writeFile(path.join(root,'electron/generated/file-search.mjs'),workerMatcher);
manifest.copies=[{name:'search.mjs',target:'electron/generated/file-search.mjs',sha256:sha(workerMatcher)}];
const editorLocation=await fs.readFile(path.join(output,'editor-location.cjs'));
await fs.writeFile(path.join(root,'electron/generated/editor-location.cjs'),editorLocation);
manifest.copies.push({name:'editor-location.cjs',target:'electron/generated/editor-location.cjs',sha256:sha(editorLocation)});
const previewAddress=await originalBindings('cf550b864-CJfC7V7E.js',['se','ce','le','O','ae','oe','E','D']);
const previewAddressDisplay=await originalBindings('c224804cc-Cihs1Tbi.js',['X','pe']);
await adapter('preview-address-field.mjs',`// Original current Preview address field; host supplies only CDS primitives and owner document.
import {useState as t,useEffect as n,useLayoutEffect as r,useRef as i,useCallback as o,useMemo as ee,memo as l} from 'react';
import {jsx as a,jsxs as s} from 'react/jsx-runtime';
export function createPreviewAddressField({Button:v,Spinner:ne,ownerDocument}) {
const re=()=>ownerDocument(),te=doc=>doc?.defaultView,ie=()=>true;
${previewAddress.text}
return O;
}
const displayPreviewURL=(()=>{${previewAddressDisplay.text}
return X;})();
export {displayPreviewURL};`,[previewAddress.source,previewAddressDisplay.source]);
const previewNavigation=await originalBindings('c224804cc-Cihs1Tbi.js',['P','F','I','ie']);
const previewNavigationHeader=await originalBindings('cd5e3435c-DH7TDYOQ.js',['r','i']);
await adapter('preview-navigation.mjs',`// Original current Preview navigation row and header geometry.
import {Fragment as a,memo as c,useMemo as l} from 'react';
import {jsx as i,jsxs as s} from 'react/jsx-runtime';
export function createPreviewNavigation({Button:C,Tooltip:x}) {
const b=a,j=({children})=>children;
const M=(()=>{${previewNavigationHeader.text}
return i;})();
${previewNavigation.text}
return ie;
}`,[previewNavigation.source,previewNavigationHeader.source]);
// The source CDP inspector is a large host class. Retain only its five complete
// inspect/context methods, plus their original pure helpers and page function.
const inspectorName='../../../desktop/index.chunk-CiiI592G.js';
const inspectorHelpers=await originalBindings(inspectorName,['Om','z3r','B3r','V3r','H3r','U3r','W3r','G3r','K3r','q3r','J3r','VX','Y3r','X3r','JX','I6r','R6r','z6r','A6r','L6r','w8r'],{preserveKind:true});
const inspectorText=await fs.readFile(path.join(source,inspectorName),'utf8');
const inspectorTree=parsers.babel.parse(inspectorText,{});
const inspectorClass=inspectorTree.program.body.flatMap(node=>node.declarations??[]).find(d=>d.id.name==='m8r')?.init;
const inspectorMethodNames=['enableInspectMode','disableInspectMode','releaseObjectGroup','captureReactComponent','captureElementContext'];
const inspectorMethods=inspectorMethodNames.map(name=>{
 const method=inspectorClass?.body.body.find(method=>method.key?.name===name);
 if(!method)throw Error('Missing original inspector method '+name);
 return inspectorText.slice(method.start,method.end);
}).join('\n');
await adapter('preview-element-inspector.mjs',`// Original CDP inspect/highlight, element context and React fiber capture. Host supplies only the native transport.
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
}`,[inspectorHelpers.source]);
const inspectorBytes=await fs.readFile(path.join(output,'preview-element-inspector.mjs'));
await fs.writeFile(path.join(root,'electron/generated/preview-element-inspector.mjs'),inspectorBytes);
manifest.copies.push({name:'preview-element-inspector.mjs',target:'electron/generated/preview-element-inspector.mjs',sha256:sha(inspectorBytes)});
// R3-terminal FT-15 (global-v01): the shared tab overflow row (2.31226.0 cfe7c4b3b I/oe/F, with a 'pl-[2px]' →
// 'ps-[2px]' patch) is retired; the Preview and terminal strips render the 2.42304.0 ce from
// extract-code-ui-current.mjs (generated/code-current/terminal-tab-overflow.mjs). Its old output is removed.
await fs.rm(path.join(output,'preview-tab-overflow.mjs'),{force:true});
const previewUnicode=await originalBindings('shared-25-B37c0AC9.js',['RU','zU','BU','LU']);
const previewParser=await originalBindings('c224804cc-Cihs1Tbi.js',['G','K','le','q','ue','J','Y','de','X','Z','fe','Q','pe','me','he']);
await adapter('preview-address-parser.mjs',`// Original current Preview address classifier and Unicode normalization.
${previewUnicode.text}
const p=BU,m=zU,h=RU;
${previewParser.text}
export {me as parsePreviewAddress};`,[previewUnicode.source,previewParser.source]);
const previewParserBytes=await fs.readFile(path.join(output,'preview-address-parser.mjs'));
await fs.writeFile(path.join(root,'electron/generated/preview-address-parser.mjs'),previewParserBytes);
manifest.copies.push({name:'preview-address-parser.mjs',target:'electron/generated/preview-address-parser.mjs',sha256:sha(previewParserBytes)});
const previewKeys=await originalBindings('../../../desktop/index.chunk-CiiI592G.js',['A7r','z7r','K7r','M7r','G7r','J7r','q7r','Fti','Iti','uoi','doi','E5r']);
await adapter('preview-tab-shortcuts.mjs',`// Original native reopen/select/cycle key matchers and closed-tab history bounds.
${previewKeys.text}
export {M7r as reopenTabKey,J7r as selectTabKey,G7r as cycleTabKey,Fti as closedTabsPerSession,Iti as closedTabSessions,uoi as beginSyntheticInput,doi as endSyntheticInput};`,[previewKeys.source]);
const previewKeyBytes=await fs.readFile(path.join(output,'preview-tab-shortcuts.mjs'));
await fs.writeFile(path.join(root,'electron/generated/preview-tab-shortcuts.mjs'),previewKeyBytes);
manifest.copies.push({name:'preview-tab-shortcuts.mjs',target:'electron/generated/preview-tab-shortcuts.mjs',sha256:sha(previewKeyBytes)});
const historyBytes=await fs.readFile(path.join(output,'side-chat-history.cjs'));
await fs.writeFile(path.join(root,'electron/generated/side-chat-history.cjs'),historyBytes);
manifest.copies.push({name:'side-chat-history.cjs',target:'electron/generated/side-chat-history.cjs',sha256:sha(historyBytes)});
// Keep the entire selected-element serializer, including its Unicode-aware
// sentinel escaping. Replacing this with HTML escaping changes what is sent.
const elementSerialName='ce311b43f-BBMmG6RA.js';
const elementSerialBytes=await fs.readFile(path.join(source,elementSerialName));
const elementSerialText=elementSerialBytes.toString();
const elementSerialNodes=parsers.babel.parse(elementSerialText,{}).program.body;
const elementLazy=await originalBindings('shared-0-tP5vNlHv.js',['k']);
const elementSentinels=await originalBindings('shared-1-BPVqFfwb.js',['bL']);
await adapter('preview-element-serialization.mjs',`// Original selected-element protocol and sentinel escaping, complete module body.
const e=(()=>{${elementLazy.text};return k;})();
const t=(()=>{${elementSentinels.text};return bL;})();
${elementSerialNodes.filter(n=>n.type!=='ImportDeclaration'&&n.type!=='ExportNamedDeclaration').map(n=>elementSerialText.slice(n.start,n.end)).join('\n')}
export {Je as serializeSelectedElement,qe as selectedElementComponent,$e as selectedElementTag,et as stripSelectedElementContext,Le as escapeSelectedElementText,Ue as selectedSimulatorPattern,q as selectedElementTagName,Re as selectedElementBoundary};`,[{name:elementSerialName,sha256:sha(elementSerialBytes)},elementLazy.source,elementSentinels.source]);
const elementDisplaySafety=await originalBindings('shared-150-CLvmPbZG.js',['_B','MB','mB','gB','yB','DB','vB','bB','xB','TB','EB','wB','CB','SB']);
const elementView=await originalBindings('c7d4a4512-Fu8KaFVe.js',['He','Ue','We','Ge','Je','Ye','Xe','Ze','O','Qe','k','$e','et','tt','nt','rt','it','at','ot','st','Gt']);
await adapter('preview-element-view.mjs',`// Original selected browser-element detail model and visible Unicode escaping.
const e=(()=>{${elementLazy.text};return k;})();
const {a,o,s,c,l,d}=(()=>{const I=e;${elementDisplaySafety.text};return {a:_B,o:MB,s:mB,c:gB,l:yB,d:DB};})();
${elementView.text}
export {st as selectedElementView};`,[elementView.source,elementDisplaySafety.source,elementLazy.source]);
const elementLabel=await originalBindings('ca80fca8d-uAxy5Mjj.js',['lO','uO','dO','fO','pO']);
// uO is the original simulator branch; browser contexts are the supported host
// input, but preserving its label helper keeps the original declaration intact.
const simulatorLabel=await originalBindings('c7d4a4512-Fu8KaFVe.js',['D','Ke','qe']);
await adapter('preview-element-label.mjs',`// Original composer element labels, including surrogate-safe forty-character truncation.
import {selectedElementComponent as y_,selectedElementTag as x_} from './preview-element-serialization.mjs';
const b_=e=>'source' in e&&e.source==='simulator';
const g_=(()=>{${simulatorLabel.text};return qe;})();
${elementLabel.text}
export {lO as selectedElementLabel,pO as selectedElementScreenshot};`,[elementLabel.source,simulatorLabel.source]);
const elementDetail=await originalBindings('ca80fca8d-uAxy5Mjj.js',['GD','KD','qD','JD','YD','XD','ZD','QD','pO','mO','hO']);
await adapter('preview-element-detail.mjs',`// Original browser-element detail components. Local host supplies CDS primitives and localization.
import {Fragment as L,useMemo as W,useState as _,useEffect as w} from 'react';
import {jsx as F,jsxs as V} from 'react/jsx-runtime';
import {selectedElementView as p_} from './preview-element-view.mjs';
export function createSelectedElementDetail({Icon:Ts,Message:Z,useIntl:Q,Collapsible:os}) {
const te=(...parts)=>parts.filter(Boolean).join(' ');
// Browser contexts have no simulator row. Do not expose this factory for simulator data.
const tb=()=>{throw new Error('Simulator detail rows are not supported by the browser element adapter');};
const O=callback=>callback,Hh=()=>{};
${elementDetail.text}
return {Preview:hO,Details:QD};
}`,[elementDetail.source]);
const elementChipName='ca80fca8d-uAxy5Mjj.js',elementChipBytes=await fs.readFile(path.join(source,elementChipName));
const elementChipText=elementChipBytes.toString(),elementChipAst=parsers.babel.parse(elementChipText,{});
const elementChipFunction=elementChipAst.program.body.find(node=>node.id?.name==='pk');
const elementChipBody=elementChipFunction.body.body.flatMap(node=>node.declarations??[]).find(node=>node.id.name==='J');
if(!elementChipBody)throw Error('Original element chip body changed');
const elementChipParams=elementChipFunction.params[0].properties.map(node=>elementChipText.slice(node.start,node.end)).join(',');
await adapter('preview-element-chip.mjs',`// Original pk chip button render, over the local popover/menu host.
import {useRef as P} from 'react';
import {jsx as F,jsxs as V} from 'react/jsx-runtime';
export function createSelectedElementChipBody({Button:Mf}) {
const te=(...parts)=>parts.filter(Boolean).join(' '),$O=node=>node.matches(':focus-visible');
return function SelectedElementChipBody({${elementChipParams},onKeyDown:le,previewRef:W={current:null}}) {
const de=P(false),ie=P(false),I=d&&f,ee=u!==undefined;
const ue=d?()=>{C?.(I&&l?null:e,true,true,'click');D?.();}:()=>D?.();
const J=${elementChipText.slice(elementChipBody.init.start,elementChipBody.init.end)};
return J;
};
}`,[{name:elementChipName,sha256:sha(elementChipBytes)}]);
const elementParserBytes=await fs.readFile(path.join(source,'c7d4a4512-Fu8KaFVe.js'));
const elementParserFormatted=await format(elementParserBytes.toString(),{parser:'babel'});
const elementParserStart=elementParserFormatted.indexOf('var He ='),elementParserEnd=elementParserFormatted.indexOf('function qt(');
if(elementParserStart<0||elementParserEnd<elementParserStart)throw Error('Selected-element parser source markers changed');
const elementIgnorables=await originalBindings('shared-100-Bs3K3KCN.js',['nc']);
await adapter('preview-element-parser.mjs',`// Original structured selected-element parser and display normalization.
import {selectedSimulatorPattern as Ne,selectedElementTagName as E,selectedElementBoundary as Ie} from './preview-element-serialization.mjs';
const e=(()=>{${elementLazy.text};return k;})();
const {a,o,s,c,l,d}=(()=>{const I=e;${elementDisplaySafety.text};return {a:_B,o:MB,s:mB,c:gB,l:yB,d:DB};})();
const x=(()=>{const E=e;${elementIgnorables.text};return nc;})();
${elementParserFormatted.slice(elementParserStart,elementParserEnd)}
export function parseSelectedElementMessage(text) {
const parsed=pt(text);
return {text:parsed.end===0?text:text.slice(parsed.end).replace(/^\\s+/,''),views:parsed.views.map(view=>{
let unsafe=false;const shown=ot(view,value=>{const result=Ge(value);unsafe ||= result.escaped;return result.text;});
return unsafe?{...shown,unsafeDisplay:true}:shown;
})};
}`,[{name:'c7d4a4512-Fu8KaFVe.js',sha256:sha(elementParserBytes)},elementDisplaySafety.source,elementIgnorables.source,elementLazy.source]);
const elementTranscript=await originalBindings('cd5a31703-B4nKQMBN.js',['YM','qM','GM','UM','WM','KM','JM']);
const elementCardAction=await originalBindings('ca80fca8d-uAxy5Mjj.js',['WD']);
await adapter('preview-element-transcript.mjs',`// Original selected-element transcript card, disclosure and size-change animation.
import {useRef as D,useCallback as N,useLayoutEffect as C,useState as g} from 'react';
import {jsx as k,jsxs as P} from 'react/jsx-runtime';
export function createSelectedElementTranscript({useIntl:Q,Message:Z,Icon:Ws,Collapsible:xs,Details:vce,Image:ImageComponent}) {
const I=(...parts)=>parts.filter(Boolean).join(' '),Zr=node=>node?.ownerDocument?.defaultView??null;
const jme=()=>{},mp=()=>undefined,Wg=({children})=>children,hc={Image:ImageComponent};
const S_e=()=>{throw new Error('Simulator cards are not supported by the browser element host');};
${elementCardAction.text}
const Of=WD;
${elementTranscript.text}
return YM;
}`,[elementTranscript.source,elementCardAction.source]);
// R4i-small SM3 (preview-sketch adapters, after R4g SM2's canvas): the toolbar, state, keys, host and glyph map
// follow 2.42304.0 as well. Each slice was aligned against its 2.31226.0 predecessor by a scope-normalized token diff:
// the state slice, the keys slice and the host chunk differ only in minified names (plus the host's new b, the
// "[data-sketch-tools] button:not(:disabled)" selector it exports); the toolbar adds the "Zoom" group (yMbKjuDH/n)
// in the bar, resting.firstToolsOnly and data-sketch-tools. Every import a slice uses is pinned to its
// "module:export" below, because minified names are reused across versions (D1). Names are relative to `source`.
const sketchLatestVersion='2.42304.0',sketchLatestSource='../../../../installed-2.42304.0-20261017/ion-dist/assets/v1/';
async function sketchLatestChunk(name,pins,features=[]) {
 const bytes=await fs.readFile(path.join(source,sketchLatestSource+name)),text=bytes.toString(),imports=new Map();
 for(const node of parsers.babel.parse(text,{}).program.body)if(node.type==='ImportDeclaration')
  for(const spec of node.specifiers)imports.set(spec.local.name,`${node.source.value.slice(2)}:${spec.imported?.name}`);
 for(const [local,spec] of Object.entries(pins))if(imports.get(local)!==spec)throw Error(`${name} import ${local} is ${imports.get(local)}, expected ${spec}`);
 for(const feature of features)if(text.split(feature).length-1!==1)throw Error(`${name} feature ${feature} changed`);
 return {bytes,text,source:{name:sketchLatestSource+name,sha256:sha(bytes)}};
}
const sketchFrame='vendor-frame-DfPJ1QmD.js',sketchShared='shared-frame-BfjMqbuN.js';
const sketchChunk=await sketchLatestChunk('c467aa787-B4L-l_bi.js',{
 r:sketchFrame+':Co',s:sketchFrame+':_o',l:sketchFrame+':mo',f:sketchFrame+':yo',a:sketchFrame+':So',d:sketchFrame+':uo',
 c:sketchFrame+':bo',u:sketchFrame+':oo',n:sketchFrame+':Ba',o:sketchFrame+':Va',i:sketchFrame+':Ha',p:sketchFrame+':za',
 fe:'vendor-intl-Db7hDWRO.js:f',pe:'vendor-intl-Db7hDWRO.js:l',me:'vendor-intl-Db7hDWRO.js:p',
 S:sketchShared+':cl',ae:sketchShared+':Oc',b:sketchShared+':Hl',C:sketchShared+':lc',w:sketchShared+':qa',oe:sketchShared+':Ya',
 T:sketchShared+':qs',ce:sketchShared+':kc',le:sketchShared+':vl',re:sketchShared+':Eu',se:sketchShared+':_d',de:sketchShared+':xu',
 x:sketchShared+':Yl',ie:sketchShared+':Kl',h:'shared-25-DP8p7i1Z.js:Pf',_e:'c8748971a-B4mdzZFm.js:t',
 g:'shared-25-DP8p7i1Z.js:Rm',ee:'shared-1-CAAiD7E3.js:xl',_:'shared-25-DP8p7i1Z.js:Th',v:'shared-156-Bikz018e.js:xr',
 y:'shared-19-CkPOiIKm.js:B',te:'shared-19-CkPOiIKm.js:R'},
 ['defaultMessage:"Zoom",id:"yMbKjuDH/n"','firstToolsOnly===!0','"data-sketch-tools":!0','export{Kt as a,tn as i,Yt as n,Q as o,Zt as r,St as s,Xt as t};','Xt="#1F1E1D"']);
const sketchToolbar = await originalBindings(sketchLatestSource+'c467aa787-B4L-l_bi.js',
  ['Q','wt','Tt','Et','Dt','Ot','kt','At','jt','Mt','Nt','Pt','Ft','It','Lt','Rt','zt','Bt','Vt','Ht','Ut','Wt','Gt','Kt','Yt']);
// The glyph map pairs with 2.42304.0's own c0f671921-cvFTkbeX.woff2, which the official shared-frame-CegduNQ2.css
// (linked by index.html from public/assets/v1) declares as Anthropicons-Variable; the 2.31226.0 font is no longer vendored.
const sketchIconChunk=await sketchLatestChunk(sketchShared,{});
const sketchIconBlock=sketchIconChunk.text.match(/icons:\{(Activity:57344,[^}]+)\}/)?.[1];
if(!sketchIconBlock)throw Error('Current sketch icon map changed');
const sketchIcons=Object.fromEntries([...sketchIconBlock.matchAll(/([A-Za-z][A-Za-z0-9]*):(\d+)/g)].map(match=>[match[1],Number(match[2])]));
const sketchIconFont=await fs.readFile(path.join(source,sketchLatestSource+'shared-frame-CegduNQ2.css'),'utf8');
if(sketchIconFont.split('font-family:Anthropicons-Variable;src:url(/assets/v1/c0f671921-cvFTkbeX.woff2)format("woff2-variations")').length-1!==1)throw Error('Current sketch icon font changed');
await adapter('preview-sketch-icons.mjs',`// Current source glyph map (${sketchLatestVersion}), paired with its own Anthropicons-Variable font.\nexport default ${JSON.stringify(sketchIcons)};`,[sketchIconChunk.source],sketchLatestVersion);
await fs.rm(path.join(output,'c0f671921-CWPPK3vl.woff2'),{force:true});
await adapter('preview-sketch-toolbar.mjs',`// Original adaptive selection/drawing toolbar (${sketchLatestVersion}). The host supplies CDS primitives,
// density and owner-window utilities; no tool, layout or discard logic is rewritten.
import {useState as r,useImperativeHandle as s,useEffect as l,useLayoutEffect as f,useRef as a,useCallback as d,useMemo as c,memo as u,Fragment as n} from 'react';
import {jsx as o,jsxs as i} from 'react/jsx-runtime';
export function createPreviewSketchToolbar({
  Button:S,Tooltip:ae,Icon:b,Panel:C,Menu:w,renderMenuItems:oe,
  ConfirmDialog:T,Provider:ce,Message:pe,useIntl:me,
  ownerWindow:h,asElement:le,schedule:re,prefersReducedMotion:se,ownerDocument:de,
  useRem:x,densityToken:_e,resolveLength:ie
}) {
const p=(...parts)=>parts.filter(Boolean).join(' '),fe=value=>value;
${sketchToolbar.text}
return {Toolbar:Kt,colors:Yt};
}`,[sketchToolbar.source],sketchLatestVersion);
// R4g SM2 (preview-08 / X7-13): the canvas follows 2.42304.0 c467aa787-B4L-l_bi.js St, whose "Sketch canvas" /
// "Text label" aria-labels go through useIntl (ce = me()) and whose hit test skips sub-threshold shapes. Names are
// relative to `source` (as side-chat geometry above) so verify-code-editor resolves them. Every free name of the
// slice is pinned to its import below: minified names are reused across versions, so a rename must fail loudly.
const sketchCanvasVersion='2.42304.0',sketchCanvasSource='../../../../installed-2.42304.0-20261017/ion-dist/assets/v1/';
const sketchCanvasName='c467aa787-B4L-l_bi.js';
const sketchBytes=await fs.readFile(path.join(source,sketchCanvasSource+sketchCanvasName));
const sketchImports=new Map();
for(const node of parsers.babel.parse(sketchBytes.toString(),{}).program.body)if(node.type==='ImportDeclaration')
 for(const spec of node.specifiers)sketchImports.set(spec.local.name,`${node.source.value.slice(2)}:${spec.imported?.name}`);
const sketchCanvasImports={r:'vendor-frame-DfPJ1QmD.js:Co',s:'vendor-frame-DfPJ1QmD.js:_o',l:'vendor-frame-DfPJ1QmD.js:mo',
 f:'vendor-frame-DfPJ1QmD.js:yo',a:'vendor-frame-DfPJ1QmD.js:So',d:'vendor-frame-DfPJ1QmD.js:uo',c:'vendor-frame-DfPJ1QmD.js:bo',
 o:'vendor-frame-DfPJ1QmD.js:Va',i:'vendor-frame-DfPJ1QmD.js:Ha',e:'preload-helper-D0dM6GpB.js:n',D:'cf80fba0c-CT5qqVq9.js:t',
 he:'shared-130-DnUXVlYq.js:yb',ge:'c25d7186f-CHE_J2eY.js:t',_e:'c8748971a-B4mdzZFm.js:t',h:'shared-25-DP8p7i1Z.js:Pf',
 m:'shared-25-DP8p7i1Z.js:Ff',ue:'shared-frame-BfjMqbuN.js:wc',me:'vendor-intl-Db7hDWRO.js:p'};
for(const [local,spec] of Object.entries(sketchCanvasImports))if(sketchImports.get(local)!==spec)throw Error(`Sketch canvas import ${local} is ${sketchImports.get(local)}, expected ${spec}`);
const sketchText=await format(sketchBytes.toString(),{parser:'babel'});
const sketchStart=sketchText.indexOf('var O = {\n    name: "EditFilled"'),sketchEnd=sketchText.indexOf('function Q() {');
if(sketchStart<0||sketchEnd<sketchStart)throw Error('Sketch canvas source markers changed');
const sketchSlice=sketchText.slice(sketchStart,sketchEnd);
for(const feature of ['id: "jvMtXRguc4"','id: "c29+YCh/oq"','ce = me()','function St('])
 if(sketchSlice.split(feature).length-1!==1)throw Error(`Sketch canvas feature ${feature} changed`);
const sketchMin=await originalBindings(sketchCanvasSource+'cf80fba0c-CT5qqVq9.js',['e']);
const sketchMax=await originalBindings(sketchCanvasSource+'shared-130-DnUXVlYq.js',['_d']);
const sketchTokens=await originalBindings(sketchCanvasSource+'c25d7186f-CHE_J2eY.js',['e']);
const sketchErrorText=await originalBindings(sketchCanvasSource+'preload-helper-D0dM6GpB.js',['e']);
if(!sketchErrorText.text.includes('Symbol.for("ant.o11y.errorText")'))throw Error('Sketch canvas error-text helper changed');
await adapter('preview-sketch-canvas.mjs',`// Complete original drawing canvas and geometry/history/rendering helpers (${sketchCanvasVersion}).
import {useState as r,useImperativeHandle as s,useEffect as l,useLayoutEffect as f,useRef as a,useCallback as d,useMemo as c} from 'react';
import {jsx as o,jsxs as i} from 'react/jsx-runtime';
const D=(()=>{${sketchMin.text};return e;})();
const he=(()=>{${sketchMax.text};return _d;})();
const ge=(()=>{${sketchTokens.text};return e;})();
const e=(()=>{${sketchErrorText.text};return e;})();
export function createPreviewSketchCanvas({ownerWindow:h,optionalOwnerWindow:m,useToken:_e,reducedMotion:ue,useIntl:me}) {
${sketchSlice}
return {Canvas:St,drawStroke:X,constrainPoint:ve,resizeStroke:ke,hitTest:Te,moveStroke:Ee,resizeHandle:Ne,resizeText:K,emptyHistory:Pe,commitHistory:q,undoHistory:Fe,redoHistory:Ie,mapHistory:Le,historyState:Re};
}`,[{name:sketchCanvasSource+sketchCanvasName,sha256:sha(sketchBytes)},sketchMin.source,sketchMax.source,sketchTokens.source,sketchErrorText.source],sketchCanvasVersion);
const sketchState=await originalBindings(sketchLatestSource+'c467aa787-B4L-l_bi.js',['Yt','Xt','Zt','Qt','$t','en','tn'],{preserveKind:true});
// shared-19 W7..e9 are 2.31226.0 m6..w6 renamed (Y7 = B matchCommand, $7 = R shortcut); $o/io are the host platform tests.
await sketchLatestChunk('shared-19-CkPOiIKm.js',{},['Y7 as B,','$7 as R,']);
const sketchKeys=await originalBindings(sketchLatestSource+'shared-19-CkPOiIKm.js',['V7','H7','U7','W7','G7','K7','q7','J7','Y7','X7','Z7','$7','e9']);
await adapter('preview-sketch-keys.mjs',`// Original command matching (${sketchLatestVersion}), including physical-key versus character rules.
const $o=()=>typeof navigator!=='undefined'&&/Mac/.test(navigator.platform),io=()=>typeof navigator!=='undefined'&&/Linux/.test(navigator.platform);
${sketchKeys.text}
export {Y7 as matchSketchCommand,$7 as sketchShortcut};`,[sketchKeys.source],sketchLatestVersion);
await adapter('preview-sketch-state.mjs',`// Original state, history commands and export generation gate (${sketchLatestVersion}). OCR is a host capability.
import {useState as r,useRef as a,useCallback as d} from 'react';
export function createPreviewSketchState({usePlatform:g,useRedaction:ee,skipTextDetection:_,useTextTargets:Jt,asElement:le,isTextInput:v,matchCommand:y,shortcut:te}) {
${sketchState.text}
return tn;
}`,[sketchState.source],sketchLatestVersion);
const sketchHost=await sketchLatestChunk('cda4f50bb-DheueVFA.js',{
 e:sketchFrame+':Co',t:sketchFrame+':Ha',n:sketchFrame+':So',r:sketchFrame+':Va',i:sketchFrame+':_o',ee:sketchFrame+':bo',
 a:sketchFrame+':ho',o:sketchFrame+':mo',s:sketchFrame+':oo',c:sketchFrame+':uo',te:sketchFrame+':yo',l:sketchFrame+':za',
 ne:'shared-25-DP8p7i1Z.js:Ff',re:'shared-25-DP8p7i1Z.js:Rm',u:'shared-156-Bikz018e.js:Vn',ie:'shared-156-Bikz018e.js:Zn',
 d:'shared-156-Bikz018e.js:hr',ae:'shared-156-Bikz018e.js:xr',f:'shared-19-CkPOiIKm.js:Xa',oe:'shared-19-CkPOiIKm.js:ya',
 se:'shared-52-DGviI8xb.js:qa',p:sketchShared+':Ec',m:sketchShared+':cl',h:sketchShared+':vl',ce:'vendor-intl-Db7hDWRO.js:p',
 le:'cb50b3202-CF7R7xSF.js:n',ue:'cb50b3202-CF7R7xSF.js:t',de:'c467aa787-B4L-l_bi.js:a',fe:'c467aa787-B4L-l_bi.js:i',
 pe:'c467aa787-B4L-l_bi.js:n',me:'c467aa787-B4L-l_bi.js:s',he:'c467aa787-B4L-l_bi.js:t',ge:'cf0fecf2c-2cWleVY5.js:o'},
 ['b="[data-sketch-tools] button:not(:disabled)"']);
// u is shared-156 Vn (cV="data-escape-owner"), he is c467aa787 t (Xt="#1F1E1D", pinned above), ge is cf0fecf2c o (u).
if(!(await fs.readFile(path.join(source,sketchLatestSource+'shared-156-Bikz018e.js'),'utf8')).includes('cV="data-escape-owner"'))throw Error('Sketch escape-owner attribute changed');
const sketchHostNodes=parsers.babel.parse(sketchHost.text,{}).program.body;
const sketchSize=await originalBindings(sketchLatestSource+'cf0fecf2c-2cWleVY5.js',['u']);
if(!sketchSize.text.startsWith('function u(e){return{width:e.pixelWidth/e.dpr,height:e.pixelHeight/e.dpr}'))throw Error('Sketch export size helper changed');
await adapter('preview-sketch-host.mjs',`// Original Preview sketch host (${sketchLatestVersion}), mode switch, focus, export and toolbar composition.
import {useState as e,useImperativeHandle as i,useEffect as o,useEffectEvent as a,useLayoutEffect as te,useRef as n,useCallback as c,useMemo as ee,memo as s} from 'react';
import {jsx as r,jsxs as t} from 'react/jsx-runtime';
export function createPreviewSketchHost({usePlatform:re,isTextInput:ae,isApplication:ie,popupSelector:d,hasOtherEscapeOwner:le,openPopupSelector:ue,asElement:h,ownerWindow:ne,suppressContextMenu:f,releaseEscape:oe,DisabledReasonTooltip:p,Button:m,useIntl:ce,useErrors:se,Toolbar:de,useSketch:fe,colors:pe,Canvas:me}) {
const l=(...parts)=>parts.filter(Boolean).join(' '),u='data-escape-owner',he='#1F1E1D';
const ge=(()=>{${sketchSize.text};return u;})();
${sketchHostNodes.filter(node=>node.type!=='ImportDeclaration'&&node.type!=='ExportNamedDeclaration').map(node=>sketchHost.text.slice(node.start,node.end)).join('\n')}
return C;
}`,[sketchHost.source,sketchSize.source],sketchLatestVersion);
const previewMenuItems=await originalBindings('cfca6870a-CL7PP3yV.js',['d','f','p','m','h']);
await adapter('preview-menu-items.mjs',`// Original server-menu item rendering, tooltips, loading and trailing actions.
import {useEffect as e,Fragment as n} from 'react';
import {jsx as t,jsxs as r} from 'react/jsx-runtime';
export function createPreviewMenuItems({Menu:s,Tooltip:a,Spinner:o,collisionPadding:i}) {
${previewMenuItems.text}
return h;
}`,[previewMenuItems.source]);
const previewServers=await originalBindings('cf580efe9-Cz_m1KNC.js',['Mr','Nr','Pr','Fr','Ir','Lr']);
await adapter('preview-server-menu.mjs',`// Original current split dev-server menu and section/action builder.
import {useState as e,useCallback as l,useMemo as p,memo as f,Fragment as s} from 'react';
import {jsx as o,jsxs as u} from 'react/jsx-runtime';
export function createPreviewServerMenu({Menu:G,Tooltip:be,Button:H,Spinner:Ce,Provider:c,
 useStable:g,useOptionalStable:v,usePortal:we,useIntl:Oe,renderItems:Ln,collisionPadding:w}) {
const En=event=>event.preventDefault();
${previewServers.text}
return {Menu:Lr,useSections:Ir,isEmpty:Pr};
}`,[previewServers.source]);
const previewSettings=await originalBindings('c224804cc-Cihs1Tbi.js',['oe','se','ce','B','V','H']);
await adapter('preview-settings-menu.mjs',`// Original Preview settings sections, menu wrapper and clear-data dialog.
import {useMemo as l,memo as c} from 'react';
import {jsx as i} from 'react/jsx-runtime';
export function createPreviewSettingsMenu({useOptionalStable:u,PaneMenu:A,ConfirmDialog:T,useIntl:D}) {
${previewSettings.text}
return {Menu:V,useSections:B,ClearDataDialog:H,labels:oe};
}`,[previewSettings.source]);
const paneMenu=await originalBindings('ca5db7aaf-B0kvLliv.js',['F','I','U','W','G','K','q','J','Y','X','Z']);
await adapter('preview-pane-menu.mjs',`// Original pane menu trigger, sections and rows. Host supplies local CDS/portal primitives.
import {useState as e,useEffect as t,useRef as n,Fragment as i,memo as c} from 'react';
import {jsx as r,jsxs as s} from 'react/jsx-runtime';
export function createPreviewPaneMenu({Menu:v,Button:_,Tooltip:g,Provider:a,useIntl:b,usePortal:y,
 collisionPadding:u,isTextInput:f,asElement:m,useOwnerWindow:h}) {
${paneMenu.text}
return {Menu:U,Sections:W};
}`,[paneMenu.source]);
const previewCopyUrl=await originalBindings('cf580efe9-Cz_m1KNC.js',['Ai','ji','Mi','Ni']);
await adapter('preview-copy-url.mjs',`// Original URL copy hook: website validation, clipboard result and generation-scoped feedback.
import {useEffect as t,useRef as a} from 'react';
export function createPreviewCopyUrl({useIntl:Oe,useToasts:re,useOwnerWindow:we,useFeature:qt,useStable:g,writeClipboard:B,previewApi:S}) {
${previewCopyUrl.text}
return Mi;
}`,[previewCopyUrl.source]);
const linkDecisions=await originalBindings('c11959232-CDBo_AYC.js',['Ju','Yu','Xu','Zu']);
await adapter('preview-link-decisions.mjs',`${linkDecisions.text}
export {Ju as linkArrival,Yu as linkCapabilities,Xu as linkDispatch,Zu as linkConfirmation};`,[linkDecisions.source]);
const linkModal=await originalBindings('cf700d36e-CtbL28Dt.js',['v']);
const linkArm=await originalBindings('cebf5596d-BjJwacsN.js',['n']);
await adapter('preview-link-chooser.mjs',`// Original link destination chooser and input arming delay.
import {useId as t,useState as n,memo as a} from 'react';
import {jsx as r,jsxs as i} from 'react/jsx-runtime';
import {useState as armState,useEffect as armEffect} from 'react';
const g=(()=>{const e=armState,t=armEffect;${linkArm.text};return n;})();
export function createPreviewLinkChooser({RadioGroup:o,useShortcut:s,Icon:c,ConfirmationDialog:l,platform:u,useIntl:d,useChooserSeen:f,useLinksPreference:p,useModalPresence:m,useBrowserLabel:h}) {
${linkModal.text}
return v;
}`,[linkModal.source,linkArm.source]);
const linkRadio=await originalBindings('shared-frame-DVFSKIcx.js',['PN','FN']);
await adapter('preview-link-radio.mjs',`// Original CDS radio-card layout. Radio semantics and focus belong to the local host.
import {forwardRef as J,useId as p,Fragment as ie} from 'react';
import {jsx as W,jsxs as K} from 'react/jsx-runtime';
export function createPreviewLinkRadio({Radio:Ze,Indicator:jN,useWrap:ay,onMouseDown:rs}) {
const X=(...parts)=>parts.filter(Boolean).join(' ');
${linkRadio.text}
return FN;
}`,[linkRadio.source]);
const linkOrigin=await originalBindings('../../../desktop/index.chunk-CiiI592G.js',['TA','YA','LMn','AN','PN','wjn','MN','mP']);
await adapter('preview-link-origin.mjs',`${linkOrigin.text}
export {mP as previewLinkOrigin,YA as externalOnlyLink};`,[linkOrigin.source]);
const linkOriginBytes=await fs.readFile(path.join(output,'preview-link-origin.mjs'));
await fs.writeFile(path.join(root,'electron/generated/preview-link-origin.mjs'),linkOriginBytes);
manifest.copies.push({name:'preview-link-origin.mjs',target:'electron/generated/preview-link-origin.mjs',sha256:sha(linkOriginBytes)});
// B19 terminal titles begin
const terminalTitles=await originalBindings('cf718f694-CR4UeXtg.js',['R','z','B','V','le','H','U','W','G','ue','de','fe','K','q','J','Y','pe','me','he','ge']);
const terminalTitleText=await originalBindings('shared-75-BauJ3twV.js',['QC','tw','nw','rw','bw','Ew']);
await adapter('terminal-titles.mjs',`// Original running-command / shell-title tracking for terminal tabs (OSC 133 C cmdline_url, OSC 0/2 titles).
// Rollout gates are on locally. The host supplies the store factory; the text sanitizer keeps its original
// control/invisible-character, mark and whitespace rules but not the long combining-run cap.
export function createTerminalTitles({create:ee}) {
const i=()=>true, f=()=>"on";
const {o,s,c}=(()=>{
const le=make=>{let value;return ()=>value??=make();};
${terminalTitleText.text}
const vw=4e3;
function gw(e){return e.replace(/[\\n\\r\\u2028\\u2029]/g," ").replace(rw(),"$1").replace(nw," ").trim();}
function Tw(e,t){return gw(t(e.slice(0,vw)).replace(/\\p{Cs}/gu,""));}
const Sw=e=>Tw(e,bw);
return {o:Sw,s:Ew,c:e=>Sw(e).replace(/[\\u200C\\u200D]/g,"").trim()};
})();
${terminalTitles.text}
return {store:W,install:ge,value:ue,description:de,forget:q,enabled:fe};
}`,[terminalTitles.source,terminalTitleText.source]);
// B19 terminal titles end
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Extracted ${manifest.modules.length} original modules and ${manifest.adapters.length} source-derived adapters.`);
