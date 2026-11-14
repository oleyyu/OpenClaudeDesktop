import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,NodeSelection} from 'prosemirror-state';
import {history,undo,redo,closeHistory} from 'prosemirror-history';
import {composerSchema,composerText,composerDocument,composerTextOffset,composerPosition,composerSelection,commandTransaction,caretRunStart,selectCommandBefore,reconcileComposerText,composerArgumentHint,commandSeparatorPlugin,restoreCommandSeparators,mentionTransaction,skillTransaction,mentionLabel,composerEchoTracker} from '../src/composer-editor-model.mjs';
import {mentionToken,mentionInputs} from '../src/mention-model.mjs';
import {parseSessionCommand,slashToken} from '../src/session-command-model.mjs';
import {skillChipInput} from '../src/composer-attachments-model.mjs';
const command={id:'theme',description:'Change appearance',argumentHint:'[system|light|dark]'};
const seed=(value,plugins=[])=>EditorState.create({schema:composerSchema,doc:composerDocument(value),plugins});
const selected=(plugins=[])=>{const state=seed('/th',plugins);return state.apply(commandTransaction(state,command));};
test('plain composer text retains Unicode, literal HTML, blank and trailing lines',()=>{for(const value of ['', '中文 👩🏽‍💻', 'a\n\nb\n', '<img src=x onerror=alert(1)>']){const doc=composerDocument(value);assert.equal(composerText(doc),value);for(let offset=0;offset<=value.length;offset++)assert.equal(composerTextOffset(doc,composerPosition(doc,offset)),offset);}});
test('explicit menu selection inserts one atom and separator while preserving the exact command text boundary',()=>{const state=selected();assert.equal(state.doc.firstChild.firstChild.type.name,'command_chip');assert.equal(state.doc.firstChild.firstChild.nodeSize,1);assert.equal(composerText(state.doc),'/theme ');assert.equal(state.selection.from,3);assert.equal(composerPosition(state.doc,3,-1),1);assert.equal(composerPosition(state.doc,3,1),2);assert.equal(composerTextOffset(state.doc,2),6);assert.equal(seed('/theme ').doc.firstChild.firstChild.isText,true);});
test('Backspace first selects the preceding command atom; the next deletion removes it as a whole',()=>{let state=selected();state=state.apply(state.tr.delete(2,3));assert.equal(selectCommandBefore(state,tr=>state=state.apply(tr)),true);assert.ok(state.selection instanceof NodeSelection);assert.deepEqual([composerTextOffset(state.doc,state.selection.from),composerTextOffset(state.doc,state.selection.to)],[0,6]);assert.equal(selectCommandBefore(state),false);state=state.apply(state.tr.deleteSelection());assert.equal(composerText(state.doc),'');});
test('selection mapping includes the full atom and preserves backward ranges and emoji offsets',()=>{let state=selected();state=state.apply(state.tr.insertText('中文🙂',3));const selection=composerSelection(state.doc,1,11,'backward');assert.equal(selection.anchor,7);assert.equal(selection.head,1);assert.equal(composerText(state.doc),'/theme 中文🙂');});
test('external draft edits preserve unaffected atoms and replace an atom fully when its name changes',()=>{let state=selected();state=state.apply(reconcileComposerText(state,'/theme dark'));assert.equal(state.doc.firstChild.firstChild.type.name,'command_chip');assert.equal(composerText(state.doc),'/theme dark');state=state.apply(reconcileComposerText(state,'/model dark'));assert.equal(composerText(state.doc),'/model dark');assert.equal(state.doc.firstChild.firstChild.isText,true);assert.equal(reconcileComposerText(state,'/model dark'),null);});
test('source argument hint requires a selected chip, separator, no arguments and the document size budget',()=>{let state=selected();assert.deepEqual(composerArgumentHint(state.doc),{text:command.argumentHint,position:3});assert.equal(composerArgumentHint(seed('/theme ').doc),null);state=state.apply(state.tr.insertText('dark'));assert.equal(composerArgumentHint(state.doc),null);state=selected();state=state.apply(state.tr.delete(2,3));assert.equal(composerArgumentHint(state.doc),null);state=selected();state=state.apply(state.tr.insertText(' '.repeat(130)));assert.equal(composerArgumentHint(state.doc),null);});
test('separator restoration prevents arguments merging into an atom, respects NBSP and defers while composing',()=>{const plugin=commandSeparatorPlugin();let state=selected([plugin]);state=state.applyTransaction(state.tr.insertText('dark',2,3)).state;assert.equal(composerText(state.doc),'/theme dark');state=state.applyTransaction(state.tr.insertText('\u00a0',2,3)).state;assert.equal(restoreCommandSeparators(state),null);
 const events=new EventTarget();const view={dom:events,composing:true,get state(){return state;},dispatch(tr){state=state.applyTransaction(tr).state;}};const lifecycle=plugin.spec.view(view);state=state.applyTransaction(state.tr.insertText('中',2,3)).state;assert.equal(composerText(state.doc),'/theme中dark');view.composing=false;events.dispatchEvent(new Event('compositionend'));assert.equal(composerText(state.doc),'/theme 中dark');lifecycle.destroy();});
test('command insertion and later argument typing have distinct reversible history steps',()=>{let state=seed('/th',[history()]);const apply=tr=>state=state.apply(tr);apply(closeHistory(commandTransaction(state,command)));apply(closeHistory(state.tr));apply(state.tr.insertText('dark'));assert.equal(composerText(state.doc),'/theme dark');assert.equal(undo(state,apply),true);assert.equal(composerText(state.doc),'/theme ');assert.equal(undo(state,apply),true);assert.equal(composerText(state.doc),'/th');assert.equal(redo(state,apply),true);assert.equal(state.doc.firstChild.firstChild.type.name,'command_chip');});

test('multiple paragraphs retain blank lines and map every UTF16 text position',()=>{const value='one\n\n中文🙂\n';const doc=composerDocument(value);assert.equal(doc.childCount,4);assert.equal(composerText(doc),value);for(let i=0;i<=value.length;i++)assert.equal(composerTextOffset(doc,composerPosition(doc,i)),i);});
test('cross-paragraph draft edits, selections and command replacement retain all text',()=>{let state=seed('one\ntwo\nthree');const selection=composerSelection(state.doc,2,9);state=state.apply(state.tr.setSelection(selection).insertText('!'));assert.equal(composerText(state.doc),'on!hree');state=seed('one\ntwo');state=state.apply(reconcileComposerText(state,'one more\nlast\n'));assert.equal(composerText(state.doc),'one more\nlast\n');state=state.apply(commandTransaction(state,command));assert.equal(state.doc.childCount,1);assert.equal(composerText(state.doc),'/theme ');});
test('atoms in later paragraphs keep mappings, parent-local hints and separators',()=>{const chip=selected().doc.firstChild;const empty=composerSchema.node('paragraph');let doc=composerSchema.node('doc',null,[empty,chip,empty]);assert.equal(composerText(doc),'\n/theme \n');assert.equal(composerTextOffset(doc,composerPosition(doc,7)),7);assert.deepEqual(composerArgumentHint(doc),{text:command.argumentHint,position:5});let state=EditorState.create({schema:composerSchema,doc});state=state.apply(state.tr.insertText('dark',4,5));assert.equal(composerArgumentHint(state.doc),null);state=state.apply(restoreCommandSeparators(state));assert.equal(composerText(state.doc),'\n/theme dark\n');doc=composerSchema.node('doc',null,[chip,composerSchema.node('paragraph',null,composerSchema.text('argument'))]);assert.equal(composerArgumentHint(doc),null);});

// Fidelity F05: the '@' pick is an atomic mention node (c099c328d-CbkcmYSW.js:10502-10520 Vr; shared-13 jw renderText).
const pick=(value,option)=>{let state=seed(value);state=state.apply(state.tr.setSelection(composerSelection(state.doc,value.length)));const token=mentionToken(composerText(state.doc),value.length);return state.apply(mentionTransaction(state,token,option));};
test('a mention pick replaces the token with one atom plus a space; the doc serializes to the same @path text and payload',()=>{
 const state=pick('see @sr',{path:'src/a.ts',label:'a.ts'}),paragraph=state.doc.firstChild;
 assert.deepEqual(paragraph.content.content.map(node=>node.type.name),['text','mention','text']);
 assert.deepEqual({...paragraph.child(1).attrs},{path:'src/a.ts',label:'a.ts'});assert.equal(paragraph.child(1).nodeSize,1);
 assert.equal(composerText(state.doc),'see @src/a.ts ');assert.equal(composerTextOffset(state.doc,state.selection.from),'see @src/a.ts '.length,'caret after the space');
 // The RPC payload is the one the typed '@src/a.ts ' text produced before.
 const mentions=[{path:'src/a.ts',name:'a.ts'}];
 assert.deepEqual(mentionInputs(composerText(state.doc),mentions),mentionInputs('see @src/a.ts ',mentions));
 assert.deepEqual(mentionInputs(composerText(state.doc),mentions).text_elements,[{byteRange:{start:4,end:13},placeholder:null}]);
 assert.equal(mentionLabel('src/deep/a.ts'),'a.ts');
});
test('Backspace after a mention first selects it, then deletes it whole',()=>{
 let state=pick('see @sr',{path:'src/a.ts',label:'a.ts'});state=state.apply(state.tr.delete(state.selection.from-1,state.selection.from));
 assert.equal(selectCommandBefore(state,tr=>state=state.apply(tr)),true);assert.ok(state.selection instanceof NodeSelection);assert.equal(state.selection.node.type.name,'mention');
 state=state.apply(state.tr.deleteSelection());assert.equal(composerText(state.doc),'see ');
});
test('text typed against a mention gets its separator back, so the @path stays a whole mention',()=>{
 let state=pick('@a',{path:'a.ts'});state=state.applyTransaction(state.tr.delete(2,3)).state;state=state.apply(state.tr.insertText('x',2));
 state=state.apply(restoreCommandSeparators(state));assert.equal(composerText(state.doc),'@a.ts x');
});
test('rehydrating a draft from text restores mention nodes and a known leading chip with identical text',()=>{
 const text='/pdf read @src/a.ts and @src/a.tsx\n@src/a.ts';
 const doc=composerDocument(text,{mentions:[{path:'src/a.ts'},{path:'src/a.tsx'}],chips:[{id:'pdf',kind:'skill',argumentHint:'[file]'}]});
 assert.equal(composerText(doc),text);
 assert.deepEqual(doc.firstChild.content.content.map(node=>node.type.name),['command_chip','text','mention','text','mention']);
 assert.equal(doc.firstChild.firstChild.attrs.kind,'skill');assert.deepEqual({...doc.firstChild.child(4).attrs},{path:'src/a.tsx',label:'a.tsx'});
 assert.deepEqual(doc.lastChild.content.content.map(node=>node.type.name),['mention']);
 assert.equal(composerDocument('x@src/a.ts',{mentions:['src/a.ts']}).firstChild.childCount,1,'no mention without a boundary');
 assert.equal(composerDocument('/pdfx',{chips:[{id:'pdf'}]}).firstChild.firstChild.isText,true);
 for(const value of ['', 'a\n\nb', '/pdf'])assert.equal(composerText(composerDocument(value,{chips:[{id:'pdf'}]})),value);
});
// c099c328d-CbkcmYSW.js:7926-7940 B: delete every skillChip, then focus("start").insertContent(chip + ' ').
test('Add › Skills replaces any skill chip with the picked one at the start of the draft',()=>{
 let state=seed('summarize this file');state=state.apply(state.tr.setSelection(composerSelection(state.doc,19)));
 state=state.apply(skillTransaction(state,{id:'pdf',description:'PDFs'}));
 assert.equal(composerText(state.doc),'/pdf summarize this file','typed text first, skill second: the chip still leads');
 assert.equal(state.doc.firstChild.firstChild.attrs.kind,'skill');assert.equal(composerTextOffset(state.doc,state.selection.from),5,'caret after the inserted space');
 // send(): the draft parses as the skill, and composerInput's skillChipInput turns the chip into the skill item.
 const pdf={name:'pdf',path:'/s/pdf/SKILL.md'},parsed=parseSessionCommand(composerText(state.doc),{skills:[pdf]});
 assert.equal(parsed?.skill?.name,'pdf');assert.deepEqual(skillChipInput(composerText(state.doc),parsed.skill),{text:'summarize this file',item:{type:'skill',name:'pdf',path:pdf.path}});
 state=state.apply(skillTransaction(state,{id:'fx',description:'Effects'}));
 assert.equal(composerText(state.doc),'/fx summarize this file','a second skill replaces the first, separator included');
 assert.deepEqual(state.doc.firstChild.content.content.filter(node=>node.type.name==='command_chip').map(node=>node.attrs.id),['fx']);
 state=state.apply(skillTransaction(state,{id:'fx'}));assert.equal(composerText(state.doc),'/fx summarize this file','the same skill again stays one chip');
 state=seed('one\ntwo');state=state.apply(state.tr.setSelection(composerSelection(state.doc,7)));state=state.apply(skillTransaction(state,{id:'pdf'}));
 assert.equal(composerText(state.doc),'/pdf one\ntwo','inserted at the start of the first paragraph');
 state=seed('');state=state.apply(skillTransaction(state,{id:'pdf'}));assert.equal(composerText(state.doc),'/pdf ');assert.equal(composerTextOffset(state.doc,state.selection.from),5);
 const picked=seed('/th').apply(commandTransaction(seed('/th'),{id:'theme'}));
 assert.equal(composerText(picked.apply(skillTransaction(picked,{id:'pdf'})).doc),'/pdf /theme ','a command chip is not a skill chip and stays');
 assert.equal(commandTransaction(seed('/p'),{id:'pdf',kind:'skill'}).doc.firstChild.firstChild.attrs.kind,'skill');
 assert.equal(commandTransaction(seed('/th'),command).doc.firstChild.firstChild.attrs.kind,'command');
});
test('echo tracker: an older copy of the editor\'s own text is stale, an outside value or a cleared draft is applied',()=>{
 const echoes=composerEchoTracker();let typed='';
 for(const ch of 'The quick brown fox jumps over the lazy dog, then types a long prompt quickly ultracode ENDCALL'){typed+=ch;echoes.sent(typed);}
 // A render that lags behind the typing hands back earlier copies, in order: none of them resets the document.
 assert.equal(echoes.classify('The quick',typed),'stale');
 assert.equal(echoes.classify('The quick brown fox jumps over',typed),'stale');
 assert.equal(echoes.classify(typed.slice(0,-3),typed),'stale');
 // Once the parent catches up the history is dropped, so the same older text later is an outside change.
 assert.equal(echoes.classify(typed,typed),'current');assert.equal(echoes.size,0);
 assert.equal(echoes.classify('The quick',typed),'external');
 // A session switch / recall that never came from the editor is applied.
 echoes.sent('abc');assert.equal(echoes.classify('something else','abc'),'external');assert.equal(echoes.size,0);
 // The draft cleared after a send clears the composer even if the user had emptied it just before.
 echoes.sent('');echoes.sent('h');echoes.sent('hi');assert.equal(echoes.classify('','hi'),'external');
 // Repeated identical reports are kept once; the history is bounded.
 const bounded=composerEchoTracker(4);for(let i=0;i<10;i++){bounded.sent(String(i));bounded.sent(String(i));}assert.equal(bounded.size,4);assert.equal(bounded.classify('2','9'),'external');
});

// B05 C4 (c5cd1b4dc :3703-3770 qt: deleteRange(range).insertContent(chip,' ')): a mid-message pick replaces only the
// caret's '/' token; the text around it stays, the caret lands after the inserted space, and the chip ends the text run.
test('a mid-message slash pick inserts the chip in place of the token and keeps the rest of the draft',()=>{
 const caretAt=(value,offset)=>{const state=seed(value);return state.apply(state.tr.setSelection(composerSelection(state.doc,offset)));};
 let state=caretAt('please run /rev now',15);
 const token=slashToken(composerText(state.doc),15,{boundary:caretRunStart(state)});
 assert.deepEqual(token,{start:11,end:15,query:'rev'});
 state=state.apply(commandTransaction(state,{id:'review',kind:'skill'},token));
 const paragraph=state.doc.firstChild;
 assert.deepEqual(paragraph.content.content.map(node=>node.type.name),['text','command_chip','text']);
 assert.equal(paragraph.child(1).attrs.kind,'skill');
 assert.equal(composerText(state.doc),'please run /review  now','the reference inserts chip + space before the kept text');
 assert.equal(composerTextOffset(state.doc,state.selection.from),19,'caret after the inserted space');
 assert.equal(caretRunStart(state),18,'the chip ends the text run before the caret');
 assert.equal(slashToken(composerText(state.doc),19,{boundary:caretRunStart(state)}),null,'the chip text is no new trigger');
 // A later line: only that line's token goes.
 state=caretAt('first line\n/com',15);
 state=state.apply(commandTransaction(state,{id:'compact'},slashToken(composerText(state.doc),15,{boundary:caretRunStart(state)})));
 assert.equal(composerText(state.doc),'first line\n/compact ');
 assert.equal(state.doc.child(1).firstChild.type.name,'command_chip');
});

// B31: the reference composer's marks and code block (shared-5 :15975-16060; shared-175 Ty/wy serializer).
import * as composerSchemaModule from '../src/composer-editor-model.mjs';
import {inputRuleTransaction,pasteTransaction,activeLink,editLinkTransaction,removeLinkTransaction,linkHref,linkHrefValid,caretInCode,fencedBlocks,toggleInlineCode,toggleCodeBlock,exitCodeBlockUp,exitCodeBlockDown,pastedLink,pasteKeepsHtml} from '../src/composer-editor-model.mjs';
import {TextSelection} from 'prosemirror-state';
const {marks:M,nodes:N}=composerSchema;
const para=(...content)=>composerSchema.node('paragraph',null,content);
const txt=(value,marks=[])=>composerSchema.text(value,marks);
const docOf=(...blocks)=>composerSchema.node('doc',null,blocks);
const typed=(value,char)=>{let state=seed(value);state=state.apply(state.tr.setSelection(TextSelection.atEnd(state.doc)));const at=state.selection.from;const tr=inputRuleTransaction(state,at,at,char);return tr?state.apply(tr):null;};
test('marks serialize to the markdown the source sends: links, strike, inline code; a link whose href is its text stays bare',()=>{
 const doc=docOf(para(txt('see '),txt('docs',[M.link.create({href:'https://x.dev/a'})]),txt(' and '),txt('https://x.dev',[M.link.create({href:'https://x.dev'})]),txt(' '),txt('old',[M.strike.create()]),txt(' '),txt('npm i',[M.code.create()]),txt(' '),txt('both',[M.link.create({href:'https://y.io'}),M.strike.create()])));
 assert.equal(composerText(doc),'see [docs](https://x.dev/a) and https://x.dev ~~old~~ `npm i` ~~[both](https://y.io)~~');
 assert.equal(linkHref('javascript:alert(1)','x'),'');assert.equal(linkHref('https://a.b/(x)','t'),'https://a.b/(x)');assert.equal(linkHref('https://a.b/)x(','t'),'');
 // Every document position maps to an offset and back.
 for(let pos=1;pos<doc.content.size;pos++){const offset=composerTextOffset(doc,pos);assert.equal(composerPosition(doc,offset),pos,`position ${pos}`);}
 // An offset inside a link's markdown lands on that end of its text.
 assert.equal(composerPosition(doc,'see ['.length),5);assert.equal(composerPosition(doc,'see [docs](h'.length),9);
});
test('a code block is a fenced block with a blank line on either side; text written that way reads back as one',()=>{
 const doc=docOf(para(txt('fix this')),composerSchema.node('code_block',{language:'js'},txt('const a = 1;\nlet b')),para(txt('thanks')));
 const text='fix this\n\n```js\nconst a = 1;\nlet b\n```\n\nthanks';
 assert.equal(composerText(doc),text);
 const back=composerDocument(text);assert.deepEqual(back.content.content.map(node=>node.type.name),['paragraph','code_block','paragraph']);assert.equal(back.child(1).attrs.language,'js');assert.equal(composerText(back),text);
 for(let offset=0;offset<=text.length;offset++)assert.ok(composerPosition(back,offset)>=0);
 for(const plain of ['a\n```\nx\n```','```\n```','```js\nx\n```  ','see ``` here'])assert.equal(composerDocument(plain).child(0).type.name,'paragraph',plain),assert.equal(composerText(composerDocument(plain)),plain);
 for(const value of ['```\nx\n```','```\nx\n```\n\n\n```py\ny\n```','```\n\n```\n\nafter','```sh\nls\n```\n\n'])assert.equal(composerText(composerDocument(value)),value,value),assert.equal(composerDocument(value).firstChild.type.name,'code_block');
 assert.equal(fencedBlocks('no fences'),null);
});
test('input rules: ``` + space makes a code block, `x` inline code, ~~x~~ strike, a URL then space a link; none inside code',()=>{
 let state=typed('```py',' ');assert.equal(state.doc.firstChild.type.name,'code_block');assert.equal(state.doc.firstChild.attrs.language,'py');assert.equal(composerText(state.doc),'```py\n\n```');assert.equal(caretInCode(state),true);
 assert.equal(typed('a ```',' '),null,'only at the start of a paragraph');
 state=typed('run `npm i','`');assert.equal(composerText(state.doc),'run `npm i`');assert.equal(state.doc.firstChild.lastChild.marks[0].type.name,'code');
 state=state.apply(state.tr.insertText(' now'));assert.equal(composerText(state.doc),'run `npm i` now','typing after the code goes on plain');
 assert.equal(typed('``a','`'),null,'an open fence is no inline code');
 state=typed('it was ~~wrong~','~');assert.equal(composerText(state.doc),'it was ~~wrong~~');assert.equal(state.doc.firstChild.lastChild.marks[0].type.name,'strike');
 state=typed('see https://example.com/a.',' ');assert.equal(composerText(state.doc),'see https://example.com/a. ','a bare link reads as its text');
 assert.equal(state.doc.firstChild.child(1).marks[0].attrs.href,'https://example.com/a');
 assert.equal(typed('see example.com',' '),null);
 state=typed('```',' ');assert.equal(inputRuleTransaction(state,state.selection.from,state.selection.from,'`'),null);
});
test('paste: raw text in a code block, a URL over a selection links it, fences become code blocks, bare URLs are linked',()=>{
 let state=typed('```',' ');state=state.apply(pasteTransaction(state,{text:'a\r\n  b'}));assert.equal(composerText(state.doc),'```\na\n  b\n```');
 state=seed('read the docs');state=state.apply(state.tr.setSelection(TextSelection.create(state.doc,10,14)));
 state=state.apply(pasteTransaction(state,{text:' https://d.dev/x '}));assert.equal(composerText(state.doc),'read the [docs](https://d.dev/x)');
 assert.deepEqual(activeLink(state.apply(state.tr.setSelection(TextSelection.create(state.doc,11)))),{href:'https://d.dev/x',text:'docs',from:10,to:14});
 state=seed('');state=state.apply(pasteTransaction(state,{text:'look:\n\n```js\nx()\n```\n\nok https://a.io'}));
 assert.deepEqual(state.doc.content.content.map(node=>node.type.name),['paragraph','code_block','paragraph']);
 assert.equal(composerText(state.doc),'look:\n\n```js\nx()\n```\n\nok https://a.io');
 assert.equal(state.doc.lastChild.lastChild.marks[0]?.type.name,'link');
 state=seed('x');state=state.apply(state.tr.setSelection(TextSelection.atEnd(state.doc)));state=state.apply(pasteTransaction(state,{text:'\nhttps://b.io/q?a=1 two'}));
 assert.equal(composerText(state.doc),'x\nhttps://b.io/q?a=1 two');
 assert.equal(pasteTransaction(seed(''),{text:'x',html:'<pre>x</pre>'}),null,'preformatted HTML goes through the HTML parser');
 assert.equal(pasteKeepsHtml('<p>a</p>'),false);assert.equal(pastedLink('mailto:a@b.c'),'mailto:a@b.c');assert.equal(pastedLink('two words'),undefined);
});
test('link bubble: Edit link saves text and address, an empty address unlinks, Remove link keeps the text',()=>{
 let state=EditorState.create({schema:composerSchema,doc:docOf(para(txt('see '),txt('docs',[M.link.create({href:'https://x.dev'})]),txt(' now')))});
 state=state.apply(state.tr.setSelection(TextSelection.create(state.doc,6)));
 const link=activeLink(state);assert.deepEqual(link,{href:'https://x.dev',text:'docs',from:5,to:9});
 assert.equal(linkHrefValid('ftp://x'),false);assert.equal(linkHrefValid(''),true);assert.equal(linkHrefValid(' https://a '),true);
 assert.equal(editLinkTransaction(state,link,'x','ftp://x'),null);
 let next=state.apply(editLinkTransaction(state,link,' the guide ','https://x.dev/guide'));assert.equal(composerText(next.doc),'see [the guide](https://x.dev/guide) now');
 next=state.apply(editLinkTransaction(state,link,'','https://x.dev/b'));assert.equal(composerText(next.doc),'see https://x.dev/b now','a blank text reads as the address');
 next=state.apply(editLinkTransaction(state,link,'docs',''));assert.equal(composerText(next.doc),'see docs now');
 next=state.apply(removeLinkTransaction(state));assert.equal(composerText(next.doc),'see docs now');
 assert.equal(activeLink(state.apply(state.tr.setSelection(TextSelection.create(state.doc,2)))),null);
});
test('code keys: Mod-e marks inline code, Mod-Alt-c toggles the block, arrows leave a code block at the draft edges',()=>{
 let state=seed('npm i');state=state.apply(state.tr.setSelection(TextSelection.create(state.doc,1,6)));toggleInlineCode(state,tr=>state=state.apply(tr));assert.equal(composerText(state.doc),'`npm i`');
 state=seed('ls -la');toggleCodeBlock(state,tr=>state=state.apply(tr));assert.equal(composerText(state.doc),'```\nls -la\n```');
 state=state.apply(state.tr.setSelection(TextSelection.create(state.doc,1)));assert.equal(exitCodeBlockUp(state,tr=>state=state.apply(tr)),true);assert.equal(composerText(state.doc),'\n\n```\nls -la\n```');
 state=state.apply(state.tr.setSelection(TextSelection.atEnd(state.doc)));assert.equal(exitCodeBlockDown(state,tr=>state=state.apply(tr)),true);assert.equal(composerText(state.doc),'\n\n```\nls -la\n```\n\n');assert.equal(state.selection.$from.parent.type.name,'paragraph');
 toggleCodeBlock(seed('a @x'),()=>{});
});
test('an outside edit across a link\'s markdown rebuilds the document from the text; a skill chip never goes into a code block',()=>{
 let state=EditorState.create({schema:composerSchema,doc:docOf(para(txt('a '),txt('b',[M.link.create({href:'https://x.dev'})])))});
 assert.equal(composerText(state.doc),'a [b](https://x.dev)');
 state=state.apply(reconcileComposerText(state,'a b'));assert.equal(composerText(state.doc),'a b');
 state=seed('```\nx\n```');state=state.apply(skillTransaction(state,{id:'pdf'}));assert.equal(composerText(state.doc),'/pdf \n\n```\nx\n```');
});
test('input rules read the caret\'s line: a fence typed after Shift+Enter splits the paragraph above the code block',()=>{
 let state=typed('fix this\n```js',' ');assert.deepEqual(state.doc.content.content.map(node=>node.type.name),['paragraph','code_block']);assert.equal(composerText(state.doc),'fix this\n\n```js\n\n```');assert.equal(state.selection.$from.parent.type.name,'code_block');
 state=typed('a `b\nc','`');assert.equal(state,null,'no inline code across lines');
 state=typed('x\nrun `ls','`');assert.equal(composerText(state.doc),'x\nrun `ls`');
});
test('B31 review: a one-character `x` becomes inline code; bash mode never wraps a selection in a link',()=>{
 const state=typed('run `a','`');assert.ok(state,'the closing backtick of a one-character span applies the rule');
 assert.equal(composerText(state.doc),'run `a`');assert.equal(state.doc.firstChild.lastChild.marks[0]?.type.name,'code');
 let shell=seed('curl docs');shell=shell.apply(shell.tr.setSelection(TextSelection.create(shell.doc,6,10)));
 const tr=pasteTransaction(shell,{text:'https://d.dev/x',bashMode:true});
 assert.equal(composerText(shell.apply(tr).doc),'curl https://d.dev/x','the URL replaces the selection as text');
});
test('B31 review: Backspace turns an empty (or leading, caret-at-start) code block back into a paragraph',()=>{
 const {clearCodeBlock}=composerSchemaModule;
 let state=typed('```',' ');assert.equal(state.doc.firstChild.type.name,'code_block');
 assert.equal(clearCodeBlock(state,tr=>{state=state.apply(tr);}),true);
 assert.equal(state.doc.firstChild.type.name,'paragraph');assert.equal(composerText(state.doc),'');
 state=seed('a\n\n```\nx\n```');state=state.apply(state.tr.setSelection(TextSelection.atEnd(state.doc)));
 assert.equal(clearCodeBlock(state),false,'a code block with text keeps its type unless the caret is at the draft start');
});
