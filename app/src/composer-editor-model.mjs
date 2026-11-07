import {Schema,Slice} from 'prosemirror-model';
import { pathBasename } from "./host-path-model.mjs";
import {TextSelection,NodeSelection,Plugin} from 'prosemirror-state';
// shared-5 :15975-16060 (the composer's Tiptap extensions) + ca80fca8d :15427 (bold/italic only with emphasisMarks,
// which Code sessions leave off): paragraphs and a code block ($A CodeBlock, exitOnTripleEnter false), the link mark
// (hA: inclusive false, href only, autolink without paste rules), strike (Jl) and inline code (xA). Lists stay out:
// the paste path keeps their text (parseLists false) and nothing else here makes one.
export const composerSchema=new Schema({nodes:{
 doc:{content:'block+'},
 paragraph:{group:'block',content:'inline*',whitespace:'pre',toDOM:()=>['p',0],parseDOM:[{tag:'p'}]},
 code_block:{group:'block',content:'text*',marks:'',code:true,defining:true,whitespace:'pre',attrs:{language:{default:''}},
  toDOM:node=>['pre',{class:'sc-code-block',...(node.attrs.language?{'data-language':node.attrs.language}:{})},['code',0]],
  parseDOM:[{tag:'pre',preserveWhitespace:'full',getAttrs:dom=>({language:codeLanguage(dom.getAttribute?.('data-language')||/(?:^|\s)language-(\S+)/.exec(dom.querySelector?.('code')?.className||'')?.[1]||'')})}]},
 text:{group:'inline'},
 hard_break:{inline:true,group:'inline',selectable:false,toDOM:()=>['br'],parseDOM:[{tag:'br'}],leafText:()=> '\n'},
 // kind 'skill' marks a skill chip (cc183b3ab-BNeMUZS1.js:619-700 skills in the '/' list; the Add › Skills row,
 // scroll-shared-10-current.js:8667-8722 wv/Ev); both kinds are the source skillChip (shared-14 :18578-18600).
 command_chip:{inline:true,group:'inline',atom:true,selectable:true,attrs:{id:{},label:{default:''},description:{default:''},argumentHint:{default:''},kind:{default:'command'}},
  toDOM:node=>['span',{'data-skill-chip':'',dir:'auto'},'/'+node.attrs.id],leafText:node=>'/'+node.attrs.id},
 // An '@' file pick (c099c328d-CbkcmYSW.js:10502-10520 Vr: {type:'mention', attrs:{label: basename, renderedText: path,
 // providerId:'ccd-files'}} + ' '); shared-13 jw renderText `@${renderedText}`, so the draft text, mentionRanges and the
 // mentionInputs payload are the same as for the typed '@path'.
 mention:{inline:true,group:'inline',atom:true,selectable:true,attrs:{path:{},label:{default:''}},
  toDOM:node=>['span',{'data-mention':node.attrs.path,dir:'auto'},'@'+node.attrs.path],leafText:node=>'@'+node.attrs.path},
},marks:{
 // Tiptap Link has priority 1000, so it is the outermost mark: '~~[text](url)~~'.
 link:{attrs:{href:{}},inclusive:false,
  parseDOM:[{tag:'a[href]',getAttrs:dom=>{const href=dom.getAttribute('href')||'';return LINK_PROTOCOL.test(href.trim())?{href:href.trim()}:false;}}],
  toDOM:mark=>['a',{href:mark.attrs.href,class:'sc-composer-link',rel:'noopener noreferrer nofollow'},0]},
 strike:{parseDOM:[{tag:'s'},{tag:'del'},{tag:'strike'},{style:'text-decoration',getAttrs:value=>/line-through/.test(value)&&null}],toDOM:()=>['s',0]},
 // xA: the input rule ends the mark (setStoredMarks([]) + a zero-width space there); inclusive false does the same here.
 code:{excludes:'_',inclusive:false,code:true,parseDOM:[{tag:'code'}],toDOM:()=>['code',{class:'sc-inline-code'},0]},
}});
export const ATOM_NODES=Object.freeze(['command_chip','mention']);
export const leafText=node=>node.isText?node.text:node.type.name==='command_chip'?'/'+node.attrs.id:node.type.name==='mention'?'@'+node.attrs.path:node.type.name==='hard_break'?'\n':'';
export const mentionLabel=path=>pathBasename(String(path||''))||String(path||'');
// ---- Markdown of the marks and the code block (shared-175 Ty/wy/dy/ty/Qv, the composer's serializer) ----
export const LINK_PROTOCOL=/^(https?|mailto|tel):/i; // ca80fca8d zM
const LINK_SAFE=/^(?:https?:\/\/|mailto:|tel:)[\w\-.~:/?#[\]@!$&'*+,;=%{}|^]+$/i,LINK_PARENS=/^(?:https?:\/\/|mailto:|tel:)[\w\-.~:/?#[\]@!$&'()*+,;=%{}|^]+$/i;
/** ty: a link target the markdown can carry ('(' only in balanced pairs). */
export function linkTarget(href){if(LINK_SAFE.test(href))return true;if(!LINK_PARENS.test(href))return false;let depth=0;for(let index=0;index<href.length;index++){const char=href[index];if(char==='('&&href[index-1]!==']')depth++;else if(char==='('||(char===')'&&--depth<0))return false;}return depth===0;}
/** dy: the href a link mark writes as '[text](href)', or '' when it stays plain text (the href is the text itself). */
export function linkHref(href,text){
 if(typeof href!=='string'||href===text||!text)return '';
 const code=text.charCodeAt(0);if(!(code>32&&code<127)&&!/(?![\p{Default_Ignorable_Code_Point}⠀￼])[\p{L}\p{N}\p{P}\p{S}]/u.test(text))return '';
 if(linkTarget(href))return href;const bare=href.replaceAll('​','');return bare!==text&&linkTarget(bare)?bare:'';
}
/** Qv: a code block's language as the fence writes it ('' unless a short plain name). */
export function codeLanguage(value){if(typeof value!=='string'||!value)return '';const ok=/^(?=[\w+#.-]{1,24}$)(?!.*www\.)/i;if(ok.test(value))return value;const bare=value.replaceAll('​','');return ok.test(bare)?bare:'';}
/** wy: the markdown before and after a text node's marks (schema order: link outermost, then strike, then code). */
export function markWrap(marks=[],text=''){let before='',after='';for(const mark of marks){const name=mark.type.name;
 if(name==='strike'){before='~~'+before;after+='~~';}else if(name==='code'){before='`'+before;after+='`';}
 else if(name==='link'){const href=linkHref(mark.attrs.href,text);if(href){before='['+before;after+=`](${href})`;}}}
 return [before,after];}
const fenceOpen=node=>'```'+codeLanguage(node.attrs.language)+'\n',FENCE_CLOSE='\n```';
// Ty: a paragraph ends with '\n', a code block is '\n```lang\n…\n```\n\n'; between two blocks that is '\n', or '\n\n'
// beside a code block ('\n\n\n' between two), and the ends are trimmed — here the ends are left as they are.
const blockGap=(before,after)=>before.type.name==='code_block'&&after.type.name==='code_block'?'\n\n\n':before.type.name==='code_block'||after.type.name==='code_block'?'\n\n':'\n';
// Browser insertion/paste can create separate paragraphs. Their two PM boundary positions represent the newline(s)
// between blocks in the plain-text RPC/selection API. A text run carries its markdown: `pre` characters before the
// text (a mark's '[' or '~~', a code block's opening fence) and `post` after it, which offsets inside map to its ends.
function textRuns(doc){const runs=[];let previous=null;doc.forEach((block,start,index)=>{
 if(index)runs.push({from:start-1,to:start+1,value:blockGap(previous,block),text:false});
 if(block.type.name==='code_block'){const open=fenceOpen(block);runs.push({from:start+1,to:start+1+block.content.size,value:open+block.textContent+FENCE_CLOSE,text:true,pre:open.length,post:FENCE_CLOSE.length});}
 else block.forEach((node,offset)=>{const from=start+1+offset;if(node.isText){const [pre,post]=markWrap(node.marks,node.text);runs.push({from,to:from+node.nodeSize,value:pre+node.text+post,text:true,pre:pre.length,post:post.length});}
  else runs.push({from,to:from+node.nodeSize,value:leafText(node),text:false});});
 previous=block;});return runs;}
export function composerText(doc){return textRuns(doc).map(run=>run.value).join('');}
// Text → document. With `mentions`, every '@path' of a picked file becomes its mention node; with `chips`, a
// leading '/name' of a known command or skill becomes its chip (c099c328d-CbkcmYSW.js:10647-10673 di rebuilds
// '/id' into the chip when the editor is filled from text). A fenced block becomes its code block when the text
// reads exactly as the editor would write it (shared-7 yE + vE: parse the fences, keep them only if the document
// serializes back to the same text). composerText(doc) always equals the text.
const MENTION_BOUNDARY=/\s/;
function lineContent(line,{mentions=[],chip=null}={}){
 const nodes=[];let rest=line;
 if(chip){nodes.push(composerSchema.node('command_chip',{id:chip.id,label:chip.id,description:chip.description||'',argumentHint:chip.argumentHint||'',kind:chip.kind==='skill'||chip.kind==='custom'?chip.kind:'command'}));rest=line.slice(chip.id.length+1);}
 const paths=[...new Set(mentions.map(entry=>typeof entry==='string'?entry:entry?.path).filter(Boolean))].sort((a,b)=>b.length-a.length);
 let at=0;const taken=[];
 for(const path of paths){const needle='@'+path;let from=0;for(;;){const index=rest.indexOf(needle,from);if(index<0)break;const end=index+needle.length;
  if((index===0||MENTION_BOUNDARY.test(rest[index-1]))&&(end===rest.length||MENTION_BOUNDARY.test(rest[end]))&&!taken.some(([a,b])=>index<b&&end>a))taken.push([index,end,path]);from=index+1;}}
 taken.sort((a,b)=>a[0]-b[0]);
 for(const [start,end,path] of taken){if(start>at)nodes.push(composerSchema.text(rest.slice(at,start)));nodes.push(composerSchema.node('mention',{path,label:mentionLabel(path)}));at=end;}
 if(at<rest.length)nodes.push(composerSchema.text(rest.slice(at)));
 return nodes.length?nodes:null;
}
const FENCE=/^(`{3,})(\S*)\n([\s\S]*?)\n\1[ \t]*$/gm; // shared-7 lE
const codeBlockNode=(language,text)=>composerSchema.node('code_block',{language:codeLanguage(language)},text?composerSchema.text(text):null);
/** The text as blocks: [{code:true, language, text}] for each fence, [{lines}] for the paragraphs between; null if none. */
export function fencedBlocks(text){
 const value=String(text??'');if(!value.includes('```'))return null;
 const blocks=[];let at=0,previousCode=false;
 for(const match of value.matchAll(FENCE)){
  const raw=value.slice(at,match.index);
  if(!(previousCode&&raw==='\n\n\n')&&!(at===0&&raw==='')){
   let middle=raw;
   if(previousCode){if(!middle.startsWith('\n\n'))return null;middle=middle.slice(2);}
   if(!middle.endsWith('\n\n'))return null;
   blocks.push({lines:middle.slice(0,-2).split('\n')});
  }
  blocks.push({code:true,language:match[2],text:match[3]});at=match.index+match[0].length;previousCode=true;
 }
 if(!previousCode)return null;
 const tail=value.slice(at);
 if(tail){if(!tail.startsWith('\n\n'))return null;blocks.push({lines:tail.slice(2).split('\n')});}
 return blocks;
}
function plainDocument(lines,{mentions,chip}){return lines.map((line,index)=>composerSchema.node('paragraph',null,lineContent(line,{mentions,chip:index===0?chip:null})));}
export function composerDocument(text,{mentions=[],chips=[]}={}){
 const value=String(text??''),lines=value.split('\n');
 const first=/^\/([a-z0-9][a-z0-9_:.-]*)(?=\s|$)/i.exec(lines[0]),chip=first?chips.find(entry=>entry?.id===first[1]):null;
 const plain=()=>composerSchema.node('doc',null,plainDocument(lines,{mentions,chip}));
 const blocks=fencedBlocks(value);
 if(!blocks)return plain();
 const content=[];blocks.forEach((block,index)=>{if(block.code)content.push(codeBlockNode(block.language,block.text));else content.push(...plainDocument(block.lines,{mentions,chip:index===0?chip:null}));});
 const doc=composerSchema.node('doc',null,content);
 return composerText(doc)===value?doc:plain();
}
export function composerTextOffset(doc,position){let offset=0;for(const run of textRuns(doc)){
 if(position<=run.from)return offset;
 if(position<run.to)return offset+(run.text?(run.pre||0)+position-run.from:0);
 offset+=run.value.length;
 }return offset;}
// An offset inside a run's markdown (a mark's '[' or '](url)', a fence) maps to that end of its text.
export function composerPosition(doc,offset,bias=1){let count=0;for(const run of textRuns(doc)){
 const end=count+run.value.length;
 if(offset<=end)return run.text?Math.min(run.to,run.from+Math.max(0,offset-count-(run.pre||0))):offset<=count?run.from:offset===end||bias>0?run.to:run.from;
 count=end;
 }return doc.content.size-1;}
export function composerSelection(doc,start,end=start,direction='forward'){
 const a=composerPosition(doc,start,start===end?1:-1),b=composerPosition(doc,end,1);return TextSelection.create(doc,direction==='backward'?b:a,direction==='backward'?a:b);
}
// Backspace right after a chip or a mention selects it first; the next Backspace deletes it whole
// (shared-13 Aw atom: the mention is removed as one unit).
export function selectCommandBefore(state,dispatch){const {$from,empty}=state.selection,node=$from.nodeBefore;if(!empty||!ATOM_NODES.includes(node?.type.name))return false;dispatch?.(state.tr.setSelection(NodeSelection.create(state.doc,$from.pos-node.nodeSize)));return true;}
// A '/' pick. Without `range` the whole draft becomes chip + ' '. With the caret token's text range {start,end}
// (session-command-model slashToken) only that range is replaced, anywhere in the draft (c5cd1b4dc :3703-3770 qt:
// deleteRange(range).insertContent(chip, ' ')); the caret lands after the space.
export function commandTransaction(state,command,range=null){const atom=composerSchema.node('command_chip',{id:command.id,label:command.id,description:command.description||'',argumentHint:command.argumentHint||'',kind:command.kind==='skill'||command.kind==='custom'?command.kind:'command'});
 if(range&&Number.isInteger(range.start)&&Number.isInteger(range.end)){const doc=state.doc,from=composerPosition(doc,range.start,1),to=Math.max(from,composerPosition(doc,range.end,-1));const tr=state.tr.replaceWith(from,to,[atom,composerSchema.text(' ')]);return tr.setSelection(TextSelection.create(tr.doc,from+2)).scrollIntoView();}
 const paragraph=composerSchema.node('paragraph',null,[atom,composerSchema.text(' ')]),tr=state.tr.replaceWith(0,state.doc.content.size,paragraph);return tr.setSelection(TextSelection.create(tr.doc,3));}
// The text offset where the caret's text run starts: after the chip, mention or line break before it (PM nodeBefore),
// the boundary slashToken scans back to.
export function caretRunStart(state){const {$from}=state.selection,before=$from.nodeBefore;return composerTextOffset(state.doc,before?.isText?$from.pos-before.nodeSize:$from.pos);}
// '@' pick: the token's text range becomes the mention node plus a space; the caret lands after the space.
export function mentionTransaction(state,token,option){const doc=state.doc,from=composerPosition(doc,token.start,1),to=composerPosition(doc,token.end,-1);
 const atom=composerSchema.node('mention',{path:option.path,label:option.label||mentionLabel(option.path)});
 const tr=state.tr.replaceWith(from,Math.max(from,to),[atom,composerSchema.text(' ')]);return tr.setSelection(TextSelection.create(tr.doc,from+2)).scrollIntoView();}
// Add › Skills, a plugin's skill row and Settings › Skills "Use in message" (c099c328d-CbkcmYSW.js:7926-7940 B):
// every skill chip already in the draft goes, then chip + ' ' are inserted at the start (focus("start").insertContent),
// so the draft always leads with the picked skill and composerInput sends it as the {type:'skill'} item. The caret
// lands after the inserted space, where insertContent leaves it. A removed chip also takes its own ' ' separator
// (the source leaves it behind, so a replaced skill would read '/new  text').
export function skillTransaction(state,command){
 const atom=composerSchema.node('command_chip',{id:command.id,label:command.id,description:command.description||'',argumentHint:command.argumentHint||'',kind:'skill'});
 const chips=[];state.doc.descendants((node,start,parent,index)=>{if(node.type.name!=='command_chip'||node.attrs.kind!=='skill')return;const next=parent.maybeChild(index+1);chips.push({from:start,to:start+node.nodeSize+(next?.isText&&next.text.startsWith(' ')?1:0)});});
 const tr=state.tr;for(const {from,to} of chips.reverse())tr.delete(from,to);
 // A draft that opens with a code block gets a paragraph of its own for the chip.
 if(tr.doc.firstChild?.type.name!=='paragraph'){tr.insert(0,composerSchema.node('paragraph',null,[atom,composerSchema.text(' ')]));return tr.setSelection(TextSelection.create(tr.doc,3)).scrollIntoView();}
 tr.insert(1,[atom,composerSchema.text(' ')]);return tr.setSelection(TextSelection.create(tr.doc,3)).scrollIntoView();}
export function reconcileComposerText(state,value,{mentions=[],chips=[]}={}){const old=composerText(state.doc);if(old===value)return null;let start=0,end=0;while(start<old.length&&start<value.length&&old[start]===value[start])start++;while(end<old.length-start&&end<value.length-start&&old[old.length-1-end]===value[value.length-1-end])end++;
 const from=composerPosition(state.doc,start,-1),to=composerPosition(state.doc,old.length-end,1);
 // If a text edit intersects an atom, replace its complete serialized extent.
 const actualStart=composerTextOffset(state.doc,from),actualEnd=composerTextOffset(state.doc,to),suffix=old.length-actualEnd;
 const tr=state.tr.insertText(value.slice(actualStart,value.length-suffix),from,to).setMeta('addToHistory',false);
 if(composerText(tr.doc)===value)return tr;
 // An edit across markdown (a link's '](url)', a fence) can't be applied in place: the text becomes the document.
 const doc=composerDocument(value,{mentions,chips});
 return state.tr.replaceWith(0,state.doc.content.size,doc.content).setMeta('addToHistory',false);
}
// The texts the editor reported through onChange that the parent's value prop hasn't caught up with. React can render
// the composer with an older draft while the user types (a keydown's discrete update renders before the default-lane
// draft updates of the DOM flush); a value equal to one of these is a stale copy of the editor's own text, not an
// outside change, so the document must keep what was typed instead of being reset to it (which re-fired onChange in
// the layout effect, lost keystrokes and looped into React's "Maximum update depth exceeded").
// classify(value,current): 'current' (caught up), 'stale' (an older echo) or 'external' (a session switch, a history
// recall, a programmatic insert: apply it). An empty value always counts as outside (the draft cleared after a send
// must clear the composer even when the user had emptied it moments before).
export function composerEchoTracker(limit=512){let sent=[];return {
 sent(text){if(sent.at(-1)!==text){sent.push(text);if(sent.length>limit)sent.shift();}},
 classify(value,current){if(value===current){sent=[];return 'current';}const index=value===''?-1:sent.indexOf(value);if(index>=0){sent=sent.slice(index+1);return 'stale';}sent=[];return 'external';},
 clear(){sent=[];},
 get size(){return sent.length;},
};}
export function composerArgumentHint(doc){if(doc.content.size>128)return null;let hint=null;doc.descendants((node,start)=>{
 if(node.type.name!=='command_chip'||!node.attrs.argumentHint)return;
 const after=start+node.nodeSize;
 if(doc.textBetween(0,start,' ','\uFFFC').trim()||doc.textBetween(after,doc.content.size,' ','\uFFFC').trim())return;
 const trailing=doc.textBetween(after,doc.resolve(after).end(),undefined,'\uFFFC');
 if(trailing.length)hint={text:node.attrs.argumentHint,position:after+trailing.length};
 });return hint;}
export function restoreCommandSeparators(state){const positions=[];state.doc.descendants((node,start,parent,index)=>{if(!ATOM_NODES.includes(node.type.name))return;const next=parent.maybeChild(index+1);if(!next?.isText)return;const text=next.text.replace(/^\u200B+/,'');if(text&&!/^[ \u00a0]/.test(text))positions.push(start+node.nodeSize);});if(!positions.length)return null;let tr=state.tr;for(const pos of positions.reverse())tr=tr.insertText(' ',pos);return tr;}
export function commandSeparatorPlugin(){let view=null;return new Plugin({appendTransaction(transactions,previous,state){return !view?.composing&&transactions.some(tr=>tr.docChanged)?restoreCommandSeparators(state):null;},view(editor){view=editor;const finish=()=>{if(view&&!view.composing){const tr=restoreCommandSeparators(view.state);if(tr)view.dispatch(tr);}};editor.dom.addEventListener('compositionend',finish);return {destroy(){editor.dom.removeEventListener('compositionend',finish);view=null;}};}});}

// ---- Typing, paste and the link bubble (shared-5 xA/$A/hA/gA, ca80fca8d bI/KM/qM, Tiptap's input rules) ----
const OBJECT_TEXT='￼';
/** Whether the caret is in code: a code block or inline code (no '@', '/' or ':' suggestions there). */
export function caretInCode(state){const {$from}=state.selection;return $from.parent.type.spec.code===true||(state.storedMarks||$from.marks()).some(mark=>mark.type.spec.code===true);}
const textBefore=($pos)=>$pos.parent.textBetween(0,$pos.parentOffset,undefined,OBJECT_TEXT);
const CODE_FENCE_RULE=/^```([a-z]+)?$/i; // Tiptap CodeBlock backtickInputRegex /^```([a-z]+)?[\s\n]$/ (the space typed)
const INLINE_CODE_RULE=/(?<=^|[^`])`([^`\n]+)`(?!`)$/; // xA _A
const STRIKE_RULE=/(?:^|\s)(~~(?!\s+~~)((?:[^~\n]+))~~(?!\s+~~))$/; // Tiptap Strike inputRegex
/** vA: an even number of backticks, so a typed '`' closes a span rather than sitting inside one. */
const evenTicks=text=>{let even=true;for(let at=text.indexOf('`');at!==-1;at=text.indexOf('`',at+1))even=!even;return even;};
/**
 * The input rules for one typed string at [from,to) (handleTextInput): '```lang' + space turns the paragraph into a code
 * block, '`code`' and '~~strike~~' become their marks, and a space after a URL links it (hA autolink). Null: no rule.
 */
export function inputRuleTransaction(state,from,to,text){
 if(from!==to||!text)return null;
 const $from=state.doc.resolve(from);
 if($from.parent.type.spec.code===true||$from.marks().some(mark=>mark.type.spec.code===true))return null;
 // A paragraph's lines are separated by '\n' characters here (Shift+Enter), where the source has paragraphs: every
 // rule reads the caret's line only.
 const whole=textBefore($from),before=whole.slice(whole.lastIndexOf('\n')+1);
 if(text===' '&&$from.parent.type.name==='paragraph'){
  const fence=CODE_FENCE_RULE.exec(before);
  if(fence){
   let blocked=false;$from.parent.forEach(node=>{if(!node.isText)blocked=true;});
   if(!blocked){
    // The fence's line (and the rest of the paragraph after the caret) becomes the code block; earlier lines stay a
    // paragraph above it.
    const lineStart=from-before.length,tr=state.tr.delete(lineStart,from);let start=$from.start();
    if(lineStart>start){tr.delete(lineStart-1,lineStart).split(lineStart-1);start=lineStart+1;}
    tr.setBlockType(start,start,composerSchema.nodes.code_block,{language:codeLanguage(fence[1]||'')});
    // The marks of the old paragraph text go: a code block holds plain text only.
    tr.removeMark(start,start+tr.doc.resolve(start).parent.content.size);return tr.setSelection(TextSelection.create(tr.doc,start)).scrollIntoView();}
  }
  const link=autolinkTransaction(state,from);if(link)return link.insertText(' ',from).scrollIntoView();
  return null;
 }
 if(text==='`'){
  const match=INLINE_CODE_RULE.exec(before+'`');
  if(match&&match[0].length<=120&&!match[0].includes(OBJECT_TEXT)){
   const start=from-(match[0].length-1);
   const lead=textBefore(state.doc.resolve(start));if(evenTicks(lead.slice(lead.lastIndexOf('\n')+1))){
    // The typed closing '`' is not in the document yet: drop the opening one and mark what was between.
    const end=from-1;
    if(end>start){const tr=state.tr.delete(start,start+1);tr.addMark(start,end,composerSchema.marks.code.create());tr.setStoredMarks([]);return tr;}
   }
  }
 }
 if(text==='~'){
  const match=STRIKE_RULE.exec(before+'~');
  if(match&&!match[0].includes(OBJECT_TEXT)){
   const full=match[0],inner=match[2],lead=full.search(/\S/),begin=from-(full.length-1),textStart=begin+full.indexOf(inner),textEnd=textStart+inner.length;
   if(!state.doc.rangeHasMark(textStart,textEnd,composerSchema.marks.code)){
    const tr=state.tr.delete(textEnd,from).delete(begin+lead,textStart);const markStart=begin+lead,markEnd=markStart+inner.length;
    tr.addMark(markStart,markEnd,composerSchema.marks.strike.create());tr.removeStoredMark(composerSchema.marks.strike);return tr;
   }
  }
 }
 return null;
}
// hA shouldAutoLink + Tiptap's autolink: a bare http(s) or mailto URL as typed, its trailing punctuation left out.
const BARE_URL=/(?:^|[\s(])((?:https?:\/\/|mailto:)[^\s<>"]+)$/i;
function trimUrl(url){let value=url.replace(/[.,;:!?'"]+$/,'');while(value.endsWith(')')&&(value.match(/\(/g)?.length??0)<(value.match(/\)/g)?.length??0))value=value.slice(0,-1).replace(/[.,;:!?'"]+$/,'');return value;}
/** Links the URL that ends at `pos` (a space is about to follow it); null when there is none or it is linked already. */
export function autolinkTransaction(state,pos){
 const $pos=state.doc.resolve(pos);if($pos.parent.type.spec.code===true)return null;
 const before=textBefore($pos),match=BARE_URL.exec(before);if(!match)return null;
 const url=trimUrl(match[1]);if(!url||!linkTarget(url))return null;
 const start=pos-(before.length-(match.index+match[0].length-match[1].length)),end=start+url.length;
 if(state.doc.rangeHasMark(start,end,composerSchema.marks.link)||state.doc.rangeHasMark(start,end,composerSchema.marks.code))return null;
 return state.tr.addMark(start,end,composerSchema.marks.link.create({href:url}));
}
/** ml: link every bare URL of [from,to) (the href is the text, so the draft text stays the same). */
export function linkifyRange(tr,from,to){
 tr.doc.nodesBetween(from,to,(node,pos,parent)=>{
  if(!node.isText||parent?.type.spec.code===true||node.marks.some(mark=>mark.type.name==='link'||mark.type.name==='code'))return;
  for(const match of node.text.matchAll(/(?:https?:\/\/|mailto:)[^\s<>"]+/gi)){const url=trimUrl(match[0]),start=pos+match.index,end=start+url.length;
   if(url&&linkTarget(url)&&start>=from&&end<=to)tr.addMark(start,end,composerSchema.marks.link.create({href:url}));}
 });
 return tr;
}
/** mI: the pasted text as one link target (a selection it wraps), or undefined. */
export function pastedLink(text){const value=String(text??'').trim();return value&&!/\s/.test(value)&&LINK_PROTOCOL.test(value)&&linkTarget(value)?value:undefined;}
/** hI: a selection inside one text block, over text only, that a link can wrap. */
function linkableSelection(state){const {from,to,empty,$from,$to}=state.selection;if(empty||!$from.sameParent($to)||$from.parent.type.spec.code===true)return false;
 let ok=true;state.doc.nodesBetween(from,to,node=>{if(node.isTextblock)return true;if(!node.isText||node.marks.some(mark=>mark.type.name==='code'))ok=false;return false;});return ok;}
/** P_ (has_pre): a copied page with preformatted text keeps its HTML (the deferred_pre paste path). */
export const pasteKeepsHtml=html=>typeof html==='string'&&/<pre[\s>]/i.test(html);
/**
 * bI handlePaste for the plain-text paths: inside a code block the raw text; a URL over a selection links it
 * (link_wrap); otherwise the text, its fenced blocks as code blocks (Ud parseFences, parseLists false) and its bare
 * URLs linked (per_line). Null: leave it to the HTML parser (pasteKeepsHtml) or nothing to paste.
 */
export function pasteTransaction(state,{text='',html='',bashMode=false}={}){
 const value=String(text??'').replace(/\r\n?/g,'\n');
 const {$from}=state.selection;
 if($from.parent.type.spec.code===true)return value?state.tr.insertText(value).scrollIntoView():null;
 // bI: no link_wrap in bash mode (`O = w && !D && !S ? mI(x)`): a shell command never takes '[text](url)'.
 const href=bashMode?undefined:pastedLink(value);
 if(href&&linkableSelection(state)){const {from,to}=state.selection;const tr=state.tr.addMark(from,to,composerSchema.marks.link.create({href}));return tr.setSelection(TextSelection.create(tr.doc,to)).scrollIntoView();}
 if(pasteKeepsHtml(html))return null;
 if(!value)return null;
 const blocks=fencedBlocks(value);
 if(blocks){const doc=composerDocument(value);if(doc.childCount>1||doc.firstChild.type.name==='code_block'){
  const start=state.selection.from,tr=state.tr.replaceSelection(new Slice(doc.content,1,1));return linkifyRange(tr,start,tr.selection.from).scrollIntoView();}}
 const start=state.selection.from,tr=state.tr.insertText(value);return linkifyRange(tr,start,start+value.length).scrollIntoView();
}
/** WM: the link around the caret: {href, text, from, to}, or null. */
export function activeLink(state){
 const type=composerSchema.marks.link,{$from,empty,from,to}=state.selection;
 const marks=empty?(state.storedMarks||$from.marks()):null;
 let mark=empty?type.isInSet(marks):null;
 if(!empty){let all=true,found=null;state.doc.nodesBetween(from,to,node=>{if(!node.isText)return true;const link=type.isInSet(node.marks);if(!link||(found&&!found.eq(link)))all=false;else found=link;return false;});mark=all?found:null;}
 if(!mark)return null;
 // getMarkRange: the stretch of the paragraph's text carrying this mark around the caret.
 const parent=$from.parent,start=$from.start();let offset=0,range=null,current=null;
 parent.forEach(node=>{const at=start+offset;offset+=node.nodeSize;
  if(node.isText&&mark.isInSet(node.marks)){current=current?{from:current.from,to:at+node.nodeSize}:{from:at,to:at+node.nodeSize};if(current.from<=$from.pos&&$from.pos<=current.to)range=current;}
  else current=null;});
 if(!range)return null;
 return {href:mark.attrs.href,text:state.doc.textBetween(range.from,range.to),from:range.from,to:range.to};
}
/** BM: an Edit link field's value it can save: empty (unlink) or an http(s)/mailto/tel address. */
export const linkHrefValid=value=>{const trimmed=String(value??'').trim();return trimmed===''||LINK_PROTOCOL.test(trimmed);};
/** qM save (KM v): the range becomes `text` (the old text when blank), linked to `href`, or plain when href is ''. */
export function editLinkTransaction(state,range,text,href){
 const value=String(text??'').trim(),target=String(href??'').trim();
 if(target!==''&&!LINK_PROTOCOL.test(target))return null;
 // KM v: a blank text keeps the old one when unlinking, and reads as the address when linking.
 const content=value||(target===''?range.text:target);
 const node=composerSchema.text(content,target===''?[]:[composerSchema.marks.link.create({href:target})]);
 const tr=state.tr.replaceWith(range.from,range.to,node);return tr.setSelection(TextSelection.create(tr.doc,range.from+content.length)).scrollIntoView();
}
/** KM Remove link: extendMarkRange('link').unsetLink(). */
export function removeLinkTransaction(state){const link=activeLink(state);return link?state.tr.removeMark(link.from,link.to,composerSchema.marks.link):null;}
/** Tiptap Code Mod-e / CodeBlock Mod-Alt-c. */
export function toggleInlineCode(state,dispatch){const {from,to,empty}=state.selection,type=composerSchema.marks.code;if(state.selection.$from.parent.type.spec.code===true)return false;
 if(empty){const active=type.isInSet(state.storedMarks||state.selection.$from.marks());dispatch?.(active?state.tr.removeStoredMark(type):state.tr.addStoredMark(type.create()));return true;}
 const has=state.doc.rangeHasMark(from,to,type);dispatch?.(has?state.tr.removeMark(from,to,type):state.tr.addMark(from,to,type.create()));return true;}
export function toggleCodeBlock(state,dispatch){const {$from,$to}=state.selection;if(!$from.sameParent($to))return false;const block=$from.parent,start=$from.before(),code=block.type.name==='code_block';
 if(!code){let blocked=false;block.forEach(node=>{if(!node.isText)blocked=true;});if(blocked)return false;}
 if(!dispatch)return true;const tr=state.tr;if(!code)tr.removeMark(start+1,start+1+block.content.size);
 tr.setBlockType(start+1,start+1,code?composerSchema.nodes.paragraph:composerSchema.nodes.code_block,code?null:{language:''});dispatch(tr.scrollIntoView());return true;}
/** Tiptap CodeBlock Backspace: in an empty code block, or at the very start of the draft in one, the block becomes a
 * paragraph again (clearNodes), so a fence typed by mistake is undone with Backspace. */
export function clearCodeBlock(state,dispatch){const {empty,$anchor}=state.selection;if(!empty||$anchor.parent.type.name!=='code_block')return false;
 if($anchor.pos!==1&&$anchor.parent.textContent.length)return false;
 if(dispatch){const start=$anchor.before()+1;dispatch(state.tr.setBlockType(start,start,composerSchema.nodes.paragraph).scrollIntoView());}return true;}
/** Bk: ArrowUp at the start of a code block that opens the draft puts a paragraph above it (Rk insertContentAt(0)). */
export function exitCodeBlockUp(state,dispatch){const {$from,empty}=state.selection;if(!empty||$from.parent.type.name!=='code_block'||$from.parentOffset!==0||$from.before()>0)return false;
 if(dispatch){const tr=state.tr.insert(0,composerSchema.node('paragraph'));dispatch(tr.setSelection(TextSelection.create(tr.doc,1)).scrollIntoView());}return true;}
/** CodeBlock exitOnArrowDown: ArrowDown at the end of a code block that closes the draft opens a paragraph below it
 * (the source's trailingParagraph keeps one there; here it is made when the caret leaves, so a draft's text never
 * changes on its own). */
export function exitCodeBlockDown(state,dispatch){const {$from,empty}=state.selection;if(!empty||$from.parent.type.name!=='code_block'||$from.parentOffset!==$from.parent.content.size||$from.after()<state.doc.content.size)return false;
 if(dispatch){const tr=state.tr.insert(state.doc.content.size,composerSchema.node('paragraph'));dispatch(tr.setSelection(TextSelection.create(tr.doc,tr.doc.content.size-1)).scrollIntoView());}return true;}
