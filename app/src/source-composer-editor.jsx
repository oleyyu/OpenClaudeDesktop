import React,{useId,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {EditorState,Selection,AllSelection,TextSelection} from 'prosemirror-state';
import {createComposerFocusApi} from './composer-focus-api.mjs';
import {EditorView,Decoration,DecorationSet} from 'prosemirror-view';
import {Plugin} from 'prosemirror-state';
import {baseKeymap} from 'prosemirror-commands';
import {keymap} from 'prosemirror-keymap';
import {history,undo,redo,closeHistory} from 'prosemirror-history';
import {compositionEdgePlugins,finishCompositionBeforePaste,trackComposition} from './generated/code-current/composer-composition.mjs';
import {composerSchema,composerDocument,composerText,composerTextOffset,composerPosition,composerSelection,selectCommandBefore,commandTransaction,caretRunStart,mentionTransaction,skillTransaction,reconcileComposerText,composerArgumentHint,commandSeparatorPlugin,leafText,mentionLabel,composerEchoTracker,inputRuleTransaction,pasteTransaction,caretInCode,activeLink,editLinkTransaction,removeLinkTransaction,linkHrefValid,LINK_PROTOCOL,toggleInlineCode,toggleCodeBlock,clearCodeBlock,exitCodeBlockUp,exitCodeBlockDown} from './composer-editor-model.mjs';
import {SourceDialog} from './source-dialog.jsx';
import {SourceSettingsButton} from './source-settings-button.jsx';
import {SourceMenu} from './source-menu.jsx';
import {pathChoices} from './file-tool-model.mjs';
import {positionMenu} from './menu-model.mjs';
import { t } from '../electron/i18n/index.mjs';
import {safeHoverHull,insideHoverHull} from './source-tooltip-model.js';
import './source-composer-editor.css';
import {emoticonReplacement} from './emoji-model.mjs';
import {ultracodeMatches} from '../electron/prefs/workflow-keyword.mjs';

// The "ultracode" keyword while it counts (Claude Code highlights it in the prompt): an inline mark over each match.
function keywordPlugin(enabled){
 const make=state=>{if(!enabled())return DecorationSet.empty;const text=composerText(state.doc),matches=ultracodeMatches(text);
  return matches.length?DecorationSet.create(state.doc,matches.map(match=>Decoration.inline(composerPosition(state.doc,match.start,1),composerPosition(state.doc,match.end,-1),{class:'sc-ultracode-keyword','data-ultracode-keyword':''}))):DecorationSet.empty;};
 const plugin=new Plugin({state:{init:(_,state)=>make(state),apply(tr,previous,_old,state){return tr.docChanged||tr.getMeta('composer-keyword-refresh')?make(state):previous;}},props:{decorations:state=>plugin.getState(state)}});
 return plugin;
}

function CommandChip({command,selected}) {
 const [open,setOpen]=useState(false),trigger=useRef(null),popup=useRef(null),timer=useRef(null),corridor=useRef(null);
 const clear=()=>{clearTimeout(timer.current);timer.current=null;};
 const enter=event=>{if(event.pointerType!=='mouse')return;clear();corridor.current=null;if(!open)timer.current=setTimeout(()=>setOpen(true),300);};
 const leave=event=>{if(event.pointerType!=='mouse')return;clear();const target=event.currentTarget===trigger.current?popup.current:trigger.current;if(open&&target){corridor.current=safeHoverHull({x:event.clientX,y:event.clientY},target.getBoundingClientRect());timer.current=setTimeout(()=>setOpen(false),40);}else setOpen(false);};
 useLayoutEffect(()=>()=>clear(),[]);
 useLayoutEffect(()=>{if(!open)return;const doc=trigger.current.ownerDocument;
 const move=event=>{if(!corridor.current)return;clear();if(insideHoverHull({x:event.clientX,y:event.clientY},corridor.current))timer.current=setTimeout(()=>setOpen(false),40);else setOpen(false);};
 const dismiss=event=>{if(event.type==='keydown'){if(event.key!=='Escape'||event.isComposing)return;event.preventDefault();event.stopPropagation();setOpen(false);}else if(!trigger.current?.contains(event.target)&&!popup.current?.contains(event.target))setOpen(false);};
 doc.addEventListener('pointermove',move);doc.addEventListener('keydown',dismiss,true);doc.addEventListener('pointerdown',dismiss,true);
 return()=>{doc.removeEventListener('pointermove',move);doc.removeEventListener('keydown',dismiss,true);doc.removeEventListener('pointerdown',dismiss,true);clear();corridor.current=null;};},[open]);
 return <span ref={trigger} className="sc-command-chip" data-selected={selected||undefined} data-card-open={open||undefined} onPointerEnter={enter} onPointerMove={event=>{if(!open)enter(event);}} onPointerLeave={leave} onMouseDown={event=>{event.preventDefault();event.stopPropagation();}} onClick={event=>{event.preventDefault();event.stopPropagation();}}>
 <span className="sc-command-chip-glow"/><span className="sc-command-chip-label"><span className="sc-command-chip-slash" aria-hidden="true">/</span>{command.label||command.id}</span>
 {open&&command.description&&<CommandCard {...{command,trigger,popup}} onPointerEnter={()=>{clear();corridor.current=null;}} onPointerLeave={leave}/>}</span>;
}
function CommandCard({command,trigger,popup,...events}) {
 useLayoutEffect(()=>{const owner=trigger.current,node=popup.current,view=owner.ownerDocument.defaultView;const update=()=>{for(const name of ['data-mode','data-density','data-cds-theme','data-platform','data-font']){const value=owner.closest(`[${name}]`)?.getAttribute(name);if(value!=null)node.setAttribute(name,value);else node.removeAttribute(name);}const css=view.getComputedStyle(owner);node.style.setProperty('--cds-rem-scale',css.getPropertyValue('--cds-rem-scale'));const box=node.getBoundingClientRect(),p=positionMenu({anchor:owner.getBoundingClientRect(),size:box,viewport:{width:view.innerWidth,height:view.innerHeight},side:'top',align:'start',sideOffset:8,collisionPadding:5});Object.assign(node.style,{left:`${p.left}px`,top:`${p.top}px`,zIndex:(parseInt(css.getPropertyValue('--cds-layer-base'),10)||0)+50,visibility:'visible'});};update();const observer=new view.ResizeObserver(update);observer.observe(owner);observer.observe(node);const mutation=new view.MutationObserver(update);for(let current=owner;current;current=current.parentElement)mutation.observe(current,{attributes:true});view.addEventListener('resize',update);view.addEventListener('scroll',update,true);return()=>{observer.disconnect();mutation.disconnect();view.removeEventListener('resize',update);view.removeEventListener('scroll',update,true);};},[command,trigger,popup]);
 return createPortal(<div {...events} ref={popup} className="sc-command-card cds-root epitaxy-root" style={{visibility:'hidden'}}><div className="sc-command-card-description"><p>{command.description}</p></div></div>,trigger.current.ownerDocument.body);
}
function commandNodeView(node){const dom=document.createElement('span');dom.contentEditable='false';dom.setAttribute('data-skill-chip','');dom.setAttribute('data-chip-kind',node.attrs.kind||'command');dom.dir='auto';const root=createRoot(dom);let selected=false;const render=()=>root.render(<CommandChip command={node.attrs} selected={selected}/>);render();return {dom,selectNode(){selected=true;render();},deselectNode(){selected=false;render();},update(next){if(next.type!==node.type)return false;node=next;render();return true;},ignoreMutation:()=>true,destroy(){queueMicrotask(()=>root.unmount());}};}

// shared-13-Bl2X1oob.js:7882-7958 Aw: the mention chip is 'inline-flex relative cursor-interactive group/mention mx-0.5
// text-accent' around a glow span ('absolute -inset-y-0.5 -left-0.5 -right-1 rounded-md pointer-events-none', bg-accent
// when selected, else group-hover bg-fill-ghost-hover) and the label (the basename, title = the path). The Sw menu
// opens on click: for a picked file (c099c328d-CbkcmYSW.js:7052-7062 op, ccd-files) the c856385e2 Z path actions —
// Copy ▸ Absolute path / Relative path / Filename (c3e58cab4 p, 'Copied to clipboard.'), then Open in ▸ Files pane
// (zn; the local pane is the one target) — a separator and the danger Delete, which removes the node and refocuses.
// A non-primary mousedown and the context menu stay with the chip (Cw/ww); a primary press selects the atom.
function MentionChip({path,label,selected,getActions,onDelete,onFocusEditor}) {
 const [menu,setMenu]=useState(false),trigger=useRef(null),name=label||mentionLabel(path);
 const act=fn=>()=>{setMenu(false);fn();};
 // YM (ca80fca8d :11333-11345): only a file mention (ccd-files) adds the path actions; a session mention's menu is Delete.
 const file=!/^session:/.test(path);
 const choices=menu&&file?pathChoices(path,getActions()?.root):null;
 const copy=text=>getActions()?.onCopy?.(text);
 return <span ref={trigger} className="sc-mention-chip" data-selected={selected||undefined} data-menu-open={menu||undefined}
  onMouseDown={event=>{if(event.button!==0)event.stopPropagation();}} onContextMenu={event=>event.stopPropagation()}
  onClick={event=>{if(!event.currentTarget.contains(event.target))return;event.preventDefault();setMenu(true);}}>
  <span className="sc-mention-chip-trigger"><span className="sc-mention-chip-glow" aria-hidden="true"/><span className="sc-mention-chip-label" title={path}>{name}</span></span>
  {menu&&<SourceMenu.Popup anchor={trigger.current} side="bottom" align="start" label={t('Mention actions')} finalFocus={false} layerBase={getActions()?.layerBase}
   onClose={reason=>{setMenu(false);if(reason==='escape-key'||reason==='item-click')requestAnimationFrame(onFocusEditor);}}>
   {file&&<><SourceMenu.Submenu><SourceMenu.SubmenuTrigger>{t('Copy')}</SourceMenu.SubmenuTrigger><SourceMenu.Popup label={t('Copy')}>
    {choices?.absolute&&<SourceMenu.Item onClick={act(()=>copy(choices.absolute))}>{t('Absolute path')}</SourceMenu.Item>}
    {choices?.relative&&<SourceMenu.Item onClick={act(()=>copy(choices.relative))}>{t('Relative path')}</SourceMenu.Item>}
    <SourceMenu.Item onClick={act(()=>copy(choices?.filename||name))}>{t('Filename')}</SourceMenu.Item>
   </SourceMenu.Popup></SourceMenu.Submenu>
   <SourceMenu.Separator/>
   <SourceMenu.Submenu><SourceMenu.SubmenuTrigger>{t('Open in')}</SourceMenu.SubmenuTrigger><SourceMenu.Popup label={t('Open in')}>
    <SourceMenu.Item onClick={act(()=>getActions()?.onOpen?.(path))}>{t('Files pane')}</SourceMenu.Item>
   </SourceMenu.Popup></SourceMenu.Submenu>
   <SourceMenu.Separator/></>}
   <SourceMenu.Item variant="danger" onClick={()=>{setMenu(false);onDelete();}}>{t('Delete')}</SourceMenu.Item>
  </SourceMenu.Popup>}
 </span>;
}
function mentionNodeView(node,view,getPos,latest){const dom=document.createElement('span');dom.contentEditable='false';dom.dir='auto';dom.className='sc-mention-node';dom.setAttribute('data-mention',node.attrs.path);const root=createRoot(dom);let selected=false;
 const remove=()=>{const pos=getPos();const current=typeof pos==='number'?view.state.doc.nodeAt(pos):null;if(current?.type.name!=='mention')return;view.dispatch(view.state.tr.delete(pos,pos+current.nodeSize));view.focus();};
 const render=()=>root.render(<MentionChip path={node.attrs.path} label={node.attrs.label} selected={selected} getActions={()=>latest.current.mentionActions} onDelete={remove} onFocusEditor={()=>{if(!view.isDestroyed)view.focus();}}/>);render();
 return {dom,selectNode(){selected=true;render();},deselectNode(){selected=false;render();},update(next){if(next.type!==node.type||next.attrs.path!==node.attrs.path)return false;node=next;render();return true;},stopEvent:event=>event.type==='click'||event.type==='contextmenu',ignoreMutation:()=>true,destroy(){queueMicrotask(()=>root.unmount());}};}

// The link bubble's state follows every editor update (selection moves, edits); focus changes report themselves.
function linkBubblePlugin(onUpdate){return new Plugin({view(editor){onUpdate(editor);return {update(next){onUpdate(next);},destroy(){onUpdate(null);}};}});}
const COPIED_MS=1200; // ca80fca8d RM
// ca80fca8d KM (:11116-11248): a top-placed bubble 8px above the selection (BubbleMenu LM), 'epitaxy-root text-body
// text-primary break-words relative isolate flex items-center gap-1 popover rounded-lg p-xs', four base ghost
// icon-only buttons: Edit link (Edit), Open link (ArrowOutSquare: http(s)/mailto/tel only), Copy link (Copy → Check
// 'Copied' for 1.2s) and Remove link (Trash). A press on it keeps the editor's focus (IM preventDefault).
function LinkBubble({anchor,rect,href,onEdit,onOpen,onRemove}) {
 const popup=useRef(null),[copied,setCopied]=useState(null),timer=useRef(null),mounted=useRef(true);
 useLayoutEffect(()=>{mounted.current=true;return()=>{mounted.current=false;clearTimeout(timer.current);};},[]);
 useLayoutEffect(()=>{const node=popup.current,view=anchor.ownerDocument.defaultView;if(!node)return;
  for(const name of ['data-mode','data-density','data-cds-theme','data-platform','data-font']){const value=anchor.closest(`[${name}]`)?.getAttribute(name);if(value!=null)node.setAttribute(name,value);else node.removeAttribute(name);}
  const css=view.getComputedStyle(anchor);node.style.setProperty('--cds-rem-scale',css.getPropertyValue('--cds-rem-scale'));
  const box=node.getBoundingClientRect(),p=positionMenu({anchor:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.right-rect.left,height:rect.bottom-rect.top},size:box,viewport:{width:view.innerWidth,height:view.innerHeight},side:'top',align:'center',sideOffset:8,collisionPadding:8});
  Object.assign(node.style,{left:`${p.left}px`,top:`${p.top}px`,zIndex:(parseInt(css.getPropertyValue('--cds-layer-base'),10)||0)+50,visibility:'visible'});},[anchor,rect]);
 const isCopied=copied!==null&&copied===href;
 const copy=()=>{if(!href)return;Promise.resolve(anchor.ownerDocument.defaultView.navigator.clipboard?.writeText(href)).then(()=>{if(!mounted.current)return;setCopied(href);clearTimeout(timer.current);timer.current=setTimeout(()=>setCopied(null),COPIED_MS);},()=>{});};
 const button=(icon,label,onClick)=><SourceSettingsButton variant="ghost" iconOnly icon={icon} iconSize="auto" aria-label={label} onClick={onClick}/>;
 return createPortal(<div ref={popup} className="sc-link-bubble cds-root epitaxy-root" data-link-bubble="" style={{visibility:'hidden'}} onMouseDown={event=>event.preventDefault()}>
  {button('Edit',t('Edit link'),onEdit)}
  {button('ArrowOutSquare',t('Open link'),onOpen)}
  {button(isCopied?'Check':'Copy',isCopied?t('Copied'):t('Copy link'),copy)}
  {button('Trash',t('Remove link'),onRemove)}
 </div>,anchor.ownerDocument.body);
}
// ca80fca8d qM (:11250-11329): a small Dialog that only Cancel, Save or Escape closes (dismissible false), header 'Edit
// link' without a close button, the 'Text' and 'Link' fields (Link focused, Enter saves outside an IME composition),
// and Save disabled until the address is empty or http(s)/mailto/tel (BM).
function EditLinkDialog({initialText,initialHref,onSave,onClose}) {
 const text=useRef(initialText),href=useRef(initialHref),[valid,setValid]=useState(()=>linkHrefValid(initialHref)),textId=useId(),linkId=useId();
 const save=()=>{if(valid)onSave(text.current,href.current.trim());};
 const keyDown=event=>{if(event.nativeEvent.isComposing||event.keyCode===229)return;if(event.key==='Enter'){event.preventDefault();save();}};
 return <SourceDialog title={t('Edit link')} size="sm" showClose={false} className="sc-link-dialog epitaxy-root" onClose={reason=>{if(reason!=='outside-press')onClose();}}
  footer={<><SourceSettingsButton variant="secondary" onClick={onClose}>{t('Cancel')}</SourceSettingsButton><SourceSettingsButton variant="primary" disabled={!valid} onClick={save}>{t('Save')}</SourceSettingsButton></>}>
  <div className="sc-link-fields">
   <div className="sc-link-field"><label htmlFor={textId}>{t('Text')}</label><input id={textId} type="text" data-cds="TextInput" className="cds-input cds-reset" defaultValue={initialText} spellCheck={false} autoComplete="off" onChange={event=>{text.current=event.target.value;}} onKeyDown={keyDown}/></div>
   <div className="sc-link-field"><label htmlFor={linkId}>{t('Link')}</label><input id={linkId} type="text" data-cds="TextInput" data-autofocus="" className="cds-input cds-reset" defaultValue={initialHref} spellCheck={false} autoComplete="off" aria-invalid={!valid||undefined} onChange={event=>{href.current=event.target.value;setValid(linkHrefValid(event.target.value));}} onKeyDown={keyDown}/></div>
  </div>
 </SourceDialog>;
}

function hintPlugin(onHint){let editor=null;
 const make=state=>{const hint=composerArgumentHint(state.doc);return {hint:hint?.text||'',held:false,deco:hint?DecorationSet.create(state.doc,[Decoration.widget(hint.position,()=>{const span=document.createElement('span');span.className='sc-command-argument';span.setAttribute('data-skill-arg-hint','true');span.setAttribute('aria-hidden','true');span.textContent=hint.text;return span;},{side:1,key:hint.text})]):DecorationSet.empty};};
 const plugin=new Plugin({state:{init:(_,state)=>make(state),apply(tr,previous,_old,state){if(tr.getMeta('composer-hint-refresh'))return make(state);if(!tr.docChanged)return previous;const fresh=make(state);return editor?.composing?{...fresh,held:true,deco:previous.deco.map(tr.mapping,state.doc)}:fresh;}},props:{decorations:state=>plugin.getState(state).deco},view(view){editor=view;const notify=()=>{const state=plugin.getState(view.state),node=view.dom.querySelector('[data-skill-arg-hint]');if(node)node.style.display=state.hint?'inline':'none';onHint(state.hint);};const finish=()=>{if(editor&&plugin.getState(editor.state).held&&!editor.composing)editor.dispatch(editor.state.tr.setMeta('composer-hint-refresh',true));};notify();view.dom.addEventListener('compositionend',finish);return {update(){notify();finish();},destroy(){view.dom.removeEventListener('compositionend',finish);editor=null;}};}});return plugin;
}

// mentions / chips: the restored draft's '@path' picks and the known '/name' commands and skills, turned back into
// their nodes when the editor is filled from text (a session switch, a history recall).
// autoHeight: the editor sizes itself to its content up to its max-height (the side chat's row). The Code card's CDS
// ChatComposer shell (source-composer-shell.jsx) turns it off: there the ChatComposerEditor box around the editor scrolls
// (shared-26 qa max-h-96 + the maxHeight style), as around shared-9's tiptap editor.
export function SourceComposerEditor({value,onChange,inputRef,scope,disabled,onKeyDown,onPaste,onFocusInsert,mentions,chips,mentionActions,keywordHighlight=false,emoticons=true,bashMode=false,autoHeight=true,...props}) {
 const host=useRef(null),view=useRef(null),latest=useRef(null),pendingValue=useRef(null),syncValue=useRef(null),echoes=useRef(null),hintId=useId(),[hint,setHint]=useState('');latest.current={value,onChange,inputRef,scope,disabled,onKeyDown,onPaste,onFocusInsert,mentions,chips,mentionActions,keywordHighlight,emoticons,bashMode,autoHeight,props};
 const documentFor=text=>composerDocument(text,{mentions:latest.current.mentions||[],chips:latest.current.chips||[]});
 // KM: the link under the caret {link, rect} while the bubble shows; editing: the Edit link dialog's range (qM).
 const [bubble,setBubble]=useState(null),[editing,setEditing]=useState(null),reportLink=useRef(null);
 reportLink.current=current=>{if(!current||current.isDestroyed){setBubble(null);return;}
  const link=current.hasFocus()&&!latest.current.disabled?activeLink(current.state):null;
  if(!link){setBubble(value=>value===null?value:null);return;}
  const {from,to}=current.state.selection,start=current.coordsAtPos(from),end=current.coordsAtPos(to);
  const rect={left:Math.min(start.left,end.left),right:Math.max(start.right,end.right),top:Math.min(start.top,end.top),bottom:Math.max(start.bottom,end.bottom)};
  setBubble(value=>value&&value.link.href===link.href&&value.link.from===link.from&&value.link.to===link.to&&value.rect.left===rect.left&&value.rect.top===rect.top?value:{link,rect});};
 // The editor owns its text while the user types: echoes holds what it reported that the parent hasn't rendered yet.
 if(!echoes.current)echoes.current=composerEchoTracker();
 useLayoutEffect(()=>{
  const input=host.current;
  // Mod-e inline code (Tiptap Code), Mod-Alt-c code block (CodeBlock), Backspace in an empty or leading code block
  // (CodeBlock clearNodes), and the arrows that leave a code block at the draft's ends (shared-5 Bk; exitOnArrowDown).
  const plugins=()=>[...compositionEdgePlugins(),hintPlugin(setHint),keywordPlugin(()=>latest.current.keywordHighlight===true),linkBubblePlugin(view=>reportLink.current?.(view)),commandSeparatorPlugin(),history(),keymap({'Backspace':(state,dispatch)=>selectCommandBefore(state,dispatch)||clearCodeBlock(state,dispatch),'Shift-Enter':(state,dispatch)=>{dispatch(state.tr.insertText('\n'));return true;},'Alt-Enter':(state,dispatch)=>{dispatch(state.tr.insertText('\n'));return true;},'Mod-z':undo,'Shift-Mod-z':redo,'Mod-y':redo,'Mod-e':toggleInlineCode,'Mod-Alt-c':toggleCodeBlock,'ArrowUp':exitCodeBlockUp,'ArrowDown':exitCodeBlockDown}),keymap(baseKeymap)];
  // OP Fi's `X.commands.focus(caret)` (scroll into view) and focusPreservingSelection's view.focus() on this view.
  const focusApi=createComposerFocusApi({dom:input,editable:()=>view.current===editor&&!editor.isDestroyed&&!latest.current.disabled,
   nativeFocus:options=>HTMLElement.prototype.focus.call(input,options),
   placeCaret:caret=>{const doc=editor.state.doc,selection=caret==='start'?Selection.atStart(doc):caret==='end'?Selection.atEnd(doc):caret==='all'?new AllSelection(doc):null;
    editor.dispatch((selection?editor.state.tr.setSelection(selection):editor.state.tr).scrollIntoView());editor.focus();},
   focusView:()=>{if(view.current===editor&&!editor.isDestroyed)editor.focus();}});
  const editor=new EditorView({mount:input},{state:EditorState.create({schema:composerSchema,doc:documentFor(latest.current.value),plugins:plugins()}),editable:()=>!latest.current.disabled,attributes:()=>({class:latest.current.props.className}),nodeViews:{command_chip:commandNodeView,mention:(node,current,getPos)=>mentionNodeView(node,current,getPos,latest)},
   dispatchTransaction(tr){const state=editor.state.applyTransaction(tr).state;editor.updateState(state);input.dataset.empty=composerText(state.doc)?'false':'true';if(tr.docChanged&&!pendingValue.current){echoes.current.sent(composerText(state.doc));latest.current.onChange?.({target:input,currentTarget:input});}},
   handleDOMEvents:{keydown(_view,event){if(latest.current.disabled)return true;
    // c227f4d5e OP keydown: a repeated Enter, or one inside the ignoreStrayEnter() window, is swallowed before any
    // popup or the composer's own keys see it (composer-focus-api.mjs).
    if(focusApi.swallowsEnter(event)){event.preventDefault();event.stopPropagation();return true;}
    latest.current.onKeyDown?.(event);
    // Escape is no editing key: one the composer left alone (an open menu's, an idle blur) goes on unprevented to the
    // document listeners (SourceMenu dismiss, main.jsx layers) instead of PM's captureKeyDown preventDefault.
    if(event.key==='Escape'&&!event.defaultPrevented)return true;return event.defaultPrevented;},paste(current,event){if(latest.current.disabled)return false;finishCompositionBeforePaste(current,event);latest.current.onPaste?.(event);return event.defaultPrevented;},compositionstart:trackComposition,compositionupdate:trackComposition,compositionend(current,event){
    trackComposition(current,event);
    // Run after PM's compositionend handler and its queued DOM-observer flush.
    // A controlled draft replacement must not be overwritten by the IME's old document.
    queueMicrotask(()=>queueMicrotask(()=>{if(view.current!==editor||editor.composing)return;const next=pendingValue.current;pendingValue.current=null;if(next&&next.scope===latest.current.scope)syncValue.current?.(next.value);}));return false;
   }},
   // Emoticon input rule (c099c328d :4935-4942, :4988-5000 Ad/Od): '(^|\s)(emoticon) ' becomes '<emoji> ' as the space is typed.
   // Then the composer's input rules (composer-editor-model inputRuleTransaction): '```lang ' code block, '`code`',
   // '~~strike~~' and a typed URL's link. Nothing of either inside code.
   handleTextInput(current,from,to,text){
    if(text===' '&&latest.current.emoticons!==false&&from===to&&!caretInCode(current.state)){const $from=current.state.doc.resolve(from);
     const before=$from.parent.textBetween(0,$from.parentOffset,undefined,'\ufffc')+' ',hit=emoticonReplacement(before);
     if(hit){current.dispatch(current.state.tr.insertText(hit.text,from-(before.length-1-hit.start),to).scrollIntoView());return true;}}
    const rule=inputRuleTransaction(current.state,from,to,text);if(!rule)return false;current.dispatch(rule);return true;},
   // ca80fca8d bI epitaxyPlainTextPaste: the plain-text paths (code block raw, link_wrap, per_line with fences and bare
   // URLs); a copied page with <pre> goes through the schema's HTML parser (deferred_pre), keeping links and code.
   handlePaste(current,event){const data=event.clipboardData;if(!data)return false;const text=data.getData('text/plain'),html=data.getData('text/html');
    const tr=pasteTransaction(current.state,{text:text??'',html,bashMode:latest.current.bashMode===true});if(tr){current.dispatch(tr.setMeta('paste',true).setMeta('uiEvent','paste'));return true;}return false;},
   clipboardTextSerializer:slice=>slice.content.textBetween(0,slice.content.size,'\n',leafText),
  });view.current=editor;
  // Every block is watched (a code block below the first paragraph grows the editor too).
  const measure=()=>{if(latest.current.autoHeight===false){input.style.height='';return;}input.style.height='auto';input.style.height=`${Math.max(24,Math.min(input.scrollHeight,parseFloat(getComputedStyle(input).maxHeight)||384))}px`;};
  const resize=new input.ownerDocument.defaultView.ResizeObserver(measure);let watched=new Set();
  const watch=()=>{const next=new Set(input.children);for(const node of watched)if(!next.has(node))resize.unobserve(node);for(const node of next)if(!watched.has(node))resize.observe(node);watched=next;};watch();
  const children=new input.ownerDocument.defaultView.MutationObserver(()=>{watch();measure();});children.observe(input,{childList:true});measure();
  const offsets=()=>{const selection=input.ownerDocument.getSelection();if(selection?.anchorNode&&selection.focusNode&&input.contains(selection.anchorNode)&&input.contains(selection.focusNode)){try {const a=composerTextOffset(editor.state.doc,editor.posAtDOM(selection.anchorNode,selection.anchorOffset)),b=composerTextOffset(editor.state.doc,editor.posAtDOM(selection.focusNode,selection.focusOffset));return {start:Math.min(a,b),end:Math.max(a,b)};}catch{}}
   return {start:composerTextOffset(editor.state.doc,editor.state.selection.from),end:composerTextOffset(editor.state.doc,editor.state.selection.to)};};
  Object.defineProperties(input,{value:{configurable:true,get:()=>composerText(editor.state.doc)},selectionStart:{configurable:true,get:()=>offsets().start},selectionEnd:{configurable:true,get:()=>offsets().end}});
  input.setSelectionRange=(start,end=start,direction='forward')=>{editor.dispatch(editor.state.tr.setSelection(composerSelection(editor.state.doc,start,end,direction)));};
  // A programmatic focus() of the host (Add › Skills, queue edit, menus' final focus, Settings' focus return) goes
  // through EditorView.focus, which puts the document's selection back instead of the browser's caret-at-start;
  // PM's own focusPreventScroll re-enters here and gets the native focus.
  let focusing=false;
  input.focus=function(options){if(focusing||view.current!==editor)return HTMLElement.prototype.focus.call(input,options);focusing=true;try{editor.focus();}finally{focusing=false;}};
  // c227f4d5e OP's focus API on this element (composer-focus-api.mjs): scheduleFocus(caret,{yieldsToUser}),
  // focusPreservingSelection(), ignoreStrayEnter(). placeCaret is Tiptap's commands.focus(caret) on this view.
  input.scheduleFocus=focusApi.scheduleFocus;input.focusPreservingSelection=focusApi.focusPreservingSelection;input.ignoreStrayEnter=focusApi.ignoreStrayEnter;
  // shared-5 vp (the shell's storeCaret): `e.commands.setTextSelection(e.view.posAtDOM(t, n)), e.view.focus()` — a click the
  // ChatComposer shell resolved to a DOM position beside the text (sd) puts the caret there.
  input.placeCaretAtDom=(target,offset)=>{if(view.current!==editor||editor.isDestroyed)return;let pos;try{pos=editor.posAtDOM(target,offset);}catch{return;}
   const doc=editor.state.doc;editor.dispatch(editor.state.tr.setSelection(TextSelection.near(doc.resolve(Math.max(0,Math.min(pos,doc.content.size))))));editor.focus();};
  // range: the caret's '/' token (slashToken) — only it becomes the chip; none replaces the whole draft.
  input.insertCommand=(command,range=null)=>{if(latest.current.disabled)return;editor.dispatch(closeHistory(commandTransaction(editor.state,command,range)));editor.dispatch(closeHistory(editor.state.tr));editor.focus();};
  Object.defineProperty(input,'textRunStart',{configurable:true,get:()=>caretRunStart(editor.state)});
  // The caret in a code block or inline code: the composer opens no '/', '@' or ':' suggestions there.
  Object.defineProperty(input,'caretInCode',{configurable:true,get:()=>caretInCode(editor.state)});
  // The link bubble (KM): shown while the focused, editable editor has its caret in a link.
  const report=()=>reportLink.current?.(editor);editor.dom.addEventListener('focus',report);editor.dom.addEventListener('blur',report);
  // '@' pick (c099c328d :10502-10520 Vr): the token's range becomes the mention node plus a space.
  input.insertMention=(token,option)=>{if(latest.current.disabled||!token||!option?.path)return;editor.dispatch(closeHistory(mentionTransaction(editor.state,token,option)));editor.dispatch(closeHistory(editor.state.tr));editor.focus();};
  // Add › Skills (c099c328d-CbkcmYSW.js:7926-7940 B): any skill chip goes, the picked one plus a space lead the draft;
  // focus is the caller's.
  input.insertSkill=command=>{if(latest.current.disabled)return false;editor.dispatch(closeHistory(skillTransaction(editor.state,command)));editor.dispatch(closeHistory(editor.state.tr));return true;};
  // An emoji pick (Kd command: deleteRange + insertContent(char)): the text offsets [start,end) become `text`.
  input.replaceText=(start,end,text)=>{if(latest.current.disabled)return;const doc=editor.state.doc,from=composerPosition(doc,start,1),to=Math.max(from,composerPosition(doc,end,-1));editor.dispatch(editor.state.tr.insertText(text,from,to).scrollIntoView());editor.focus();};
  // cc43287c9 :43979 focusAndInsert / ca80fca8d :15852-15866 br: a printable key typed while the focus was elsewhere in
  // the session pane lands at the end of the draft (the editor scrolls to it unless the draft was empty). onFocusInsert
  // lets the composer take a key itself ('!' on an empty editor turns bash mode on). False: the editor takes no typing.
  input.focusAndInsert=char=>{if(latest.current.disabled||editor.isDestroyed)return false;
   if(latest.current.onFocusInsert?.(char)===true){editor.dispatch(editor.state.tr.setSelection(Selection.atEnd(editor.state.doc)));editor.focus();return true;}
   const empty=!composerText(editor.state.doc);let tr=editor.state.tr.setSelection(Selection.atEnd(editor.state.doc)).insertText(char);if(!empty)tr=tr.scrollIntoView();
   editor.dispatch(tr);editor.focus();return true;};
  input.getCaretViewportRect=offset=>{const p=editor.coordsAtPos(composerPosition(editor.state.doc,offset));return {left:p.left,right:p.right,top:p.top,bottom:p.bottom,height:p.bottom-p.top};};
  // shared-13 zj/Bj (:14452-14466): collapsed caret at the doc start/end, or on the first/last
  // textblock with nothing above/below it on screen (view.endOfTextblock('up'/'down')).
  input.caretAtEdge=side=>{const {selection,doc}=editor.state;if(!selection.empty)return false;const edge=side==='start'?Selection.atStart(doc):Selection.atEnd(doc);if(selection.$anchor.pos===edge.$anchor.pos)return true;return selection.$anchor.start()===edge.$anchor.start()&&editor.endOfTextblock(side==='start'?'up':'down');};
  // Vj v(): setContent + caret atEnd + addToHistory false + scrollIntoView. The docChanged
  // dispatch reaches onChange, so the controlled draft follows through the usual path.
  // caret 'start': the Ctrl+R search shows a match with the caret at its start (c099c328d _d S: Ea.atStart).
  input.recallText=(text,{caret='end'}={})=>{if(latest.current.disabled)return;const next=documentFor(text),tr=editor.state.tr.replaceWith(0,editor.state.doc.content.size,next.content);editor.dispatch(tr.setSelection(caret==='start'?Selection.atStart(tr.doc):Selection.atEnd(tr.doc)).setMeta('addToHistory',false).scrollIntoView());};
  input.resetComposer=()=>{pendingValue.current=null;echoes.current.clear();editor.updateState(EditorState.create({schema:composerSchema,doc:documentFor(latest.current.value),plugins:plugins()}));};
  syncValue.current=text=>{if(text===''&&composerText(editor.state.doc)!=='')input.resetComposer();else {const tr=reconcileComposerText(editor.state,text,{mentions:latest.current.mentions||[],chips:latest.current.chips||[]});if(tr)editor.dispatch(tr);}input.dataset.empty=composerText(editor.state.doc)?'false':'true';};
  input.dataset.empty=value?'false':'true';latest.current.inputRef?.(input);
  return()=>{latest.current.inputRef?.(null);view.current=null;syncValue.current=null;pendingValue.current=null;resize.disconnect();children.disconnect();editor.destroy();editor.dom.removeEventListener('focus',report);editor.dom.removeEventListener('blur',report);setBubble(null);for(const key of ['value','selectionStart','selectionEnd','textRunStart','caretInCode','setSelectionRange','focus','insertCommand','insertMention','insertSkill','getCaretViewportRect','caretAtEdge','recallText','resetComposer','replaceText','focusAndInsert','scheduleFocus','focusPreservingSelection','ignoreStrayEnter','placeCaretAtDom'])delete input[key];};
 },[]);
 const previousScope=useRef(scope);
 // The keyword highlight follows Dynamic workflows, the trigger setting and alt+w (keywordHighlight).
 useLayoutEffect(()=>{const editor=view.current;if(editor&&!editor.isDestroyed)editor.dispatch(editor.state.tr.setMeta('composer-keyword-refresh',true).setMeta('addToHistory',false));},[keywordHighlight]);
 // The parent's value is applied only when it changed from outside; an older copy of the editor's own text (a render
 // that lags fast typing) is left alone, so it never resets the document, re-fires onChange or drops keystrokes.
 useLayoutEffect(()=>{const editor=view.current;if(!editor)return;if(previousScope.current!==scope){previousScope.current=scope;host.current.resetComposer();}else{const kind=echoes.current.classify(value,composerText(editor.state.doc));
  if(editor.composing){if(kind==='current')pendingValue.current=null;else if(kind==='external')pendingValue.current={value,scope};}else if(kind==='external')syncValue.current?.(value);}host.current.dataset.empty=composerText(editor.state.doc)?'false':'true';editor.setProps({editable:()=>!disabled});},[value,scope,disabled]);
 const focusEditor=()=>{const editor=view.current;if(editor&&!editor.isDestroyed)editor.focus();};
 return <><div {...props} ref={host} role="textbox" aria-multiline="true" contentEditable={!disabled} suppressContentEditableWarning aria-disabled={disabled||undefined} aria-describedby={hint?hintId:props['aria-describedby']} data-placeholder={props.placeholder}/><span className="sc-sr-only" id={hintId} role="status" aria-live="polite">{hint}</span>
  {bubble&&host.current&&<LinkBubble anchor={host.current} rect={bubble.rect} href={bubble.link.href}
   onEdit={()=>{const editor=view.current;const link=editor&&activeLink(editor.state);if(link)setEditing(link);}}
   onOpen={()=>{const href=bubble.link.href;if(LINK_PROTOCOL.test(href))latest.current.mentionActions?.onOpenLink?.(href);}}
   onRemove={()=>{const editor=view.current;const tr=editor&&removeLinkTransaction(editor.state);if(tr){editor.dispatch(tr);editor.focus();}}}/>}
  {editing&&<EditLinkDialog initialText={editing.text} initialHref={editing.href} onClose={()=>{setEditing(null);requestAnimationFrame(focusEditor);}}
   onSave={(text,href)=>{const editor=view.current;if(!editor)return;const tr=editLinkTransaction(editor.state,editing,text,href);if(!tr)return;editor.dispatch(tr);setEditing(null);requestAnimationFrame(focusEditor);}}/>}
 </>;
}
