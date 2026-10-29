import React,{useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {slashMenuLayout,slashFilterFits} from './slash-menu-layout.mjs';
import {SkillDescriptionTooltip} from './source-menu.jsx';
import {slashMenuEntries} from './session-command-model.mjs';
import {skeletonPlan} from './menu-model.mjs';
import './source-slash-menu.css';
import { t } from '../electron/i18n/index.mjs';
// E41: the composer graph takes view-tabs from the concrete file by semantic name, not the facade.
import {useVirtualizer} from './generated/view-tabs/vendor-frame-CnSY1sxv.js';
function Match({text,query}) {const at=text.toLowerCase().indexOf(query.toLowerCase());return !query||at<0?text:<>{text.slice(0,at)}<b>{text.slice(at,at+query.length)}</b>{text.slice(at+query.length)}</>;}
// ccc334009 z: the virtual anchor parked at y -1e6 while no row is active.
const FAR=-1e6,FAR_RECT={x:0,y:FAR,width:0,height:0,top:FAR,right:0,bottom:FAR,left:0,toJSON:()=>({})};
const OFFSCREEN_ANCHOR={getBoundingClientRect:()=>FAR_RECT};
const contextAttributes=['data-density','data-mode','data-cds-theme','data-platform','data-font','data-page-bg'];
function syncContext(source,target) {
 if(!source||!target)return;
 for(const name of contextAttributes){const value=source.closest(`[${name}]`)?.getAttribute(name);if(value==null)target.removeAttribute(name);else target.setAttribute(name,value);}
 target.style.setProperty('--cds-rem-scale',source.ownerDocument.defaultView.getComputedStyle(source).getPropertyValue('--cds-rem-scale').trim()||'1');
}
// 3.6556.2 ccc334009-BcS3oSTB N / M (w12b-slash-plugin-groups): from A = 30 rows on (`[m,h]=d(r.length>=A)`, latched
// once reached while the menu stays open) the list is TanStack's useVirtualizer (vendor-frame sy, published as
// useVirtualizer) over the menu's scroll body: `estimateSize: j` (separator 9, section header 25, any other row 32),
// `overscan: 8, scrollPaddingStart: 28, scrollPaddingEnd: 28`, keyed by the rows' keys; a keyboard move scrolls the
// active row in with `scrollToIndex(a, {align: "auto"})`. The rows sit in `div{height: total} > div{transform:
// translateY(first.start)} > div[data-index]{ref: measureElement}`, and the outer div's min-width only grows while the
// same rows stay (reset when they change), so the menu does not narrow as it scrolls. Below 30 rows: k's "flex flex-col".
export const SLASH_VIRTUAL_MIN_ROWS=30;
export const SLASH_VIRTUALIZER_OPTIONS=Object.freeze({overscan:8,scrollPaddingStart:28,scrollPaddingEnd:28});
export const slashRowEstimate=entry=>entry?.type==='separator'?9:entry?.type==='header'?25:32;
export const slashEntryKey=(entry,key)=>entry.type==='header'?`h${key}`:entry.type==='loading'?'loading':`${entry.command.kind||'command'}:${entry.command.id}`;
export function SlashVirtualRows({entries,rowKeys,renderEntry,scrollEl,virtualizerRef}) {
 const getItemKey=useCallback(index=>rowKeys[index],[rowKeys]);
 const virtualizer=useVirtualizer({count:entries.length,getItemKey,getScrollElement:()=>scrollEl,estimateSize:index=>slashRowEstimate(entries[index]),...SLASH_VIRTUALIZER_OPTIONS});
 useLayoutEffect(()=>{if(virtualizerRef)virtualizerRef.current=virtualizer;return()=>{if(virtualizerRef?.current===virtualizer)virtualizerRef.current=null;};},[virtualizer,virtualizerRef]);
 const items=virtualizer.getVirtualItems(),outer=useRef(null);
 useLayoutEffect(()=>{if(outer.current)outer.current.style.minWidth='';},[entries]);
 useLayoutEffect(()=>{const node=outer.current;if(!node)return;const width=node.offsetWidth;if(width>(Number.parseFloat(node.style.minWidth)||0))node.style.minWidth=`${width}px`;},[items]);
 return <div ref={outer} style={{height:`${virtualizer.getTotalSize()}px`}}>
  <div style={{transform:`translateY(${items[0]?.start??0}px)`}}>
   {items.map(item=><div key={item.key} data-index={item.index} ref={virtualizer.measureElement}>{renderEntry(entries[item.index],rowKeys[item.index])}</div>)}
  </div>
 </div>;
}
export function SourceSlashMenu({commands,selected,onSelect,onHover,onDismiss,id,query,caret,preSession,loading=false,failed=false,editorRef}) {
 const ref=useRef(null),body=useRef(null),mouseSelection=useRef(null),latest=useRef(onDismiss),virtualizer=useRef(null);latest.current=onDismiss;
 // 3.6556.2 ccc334009-BcS3oSTB B: the description tooltip is anchored to the active row element (an off-screen
 // virtual element until there is one) and is open while the active row has something to describe.
 const [activeRow,setActiveRow]=useState(null);
 const listEntries=slashMenuEntries(commands,{preSession,loading,failed}),rowKeys=listEntries.map(slashEntryKey);
 const [virtual,setVirtual]=useState(listEntries.length>=SLASH_VIRTUAL_MIN_ROWS);
 if(!virtual&&listEntries.length>=SLASH_VIRTUAL_MIN_ROWS)setVirtual(true);
 const [scrollEl,setScrollEl]=useState(null);
 const bodyRef=useCallback(node=>{body.current=node;setScrollEl(node);},[]);
 const active=commands[selected],entries=commands.map(c=>c.id).join('\0');
 useLayoutEffect(()=>{
  const menu=ref.current,scroller=body.current;
  if(!menu||!scroller||!caret)return;
  const doc=menu.ownerDocument,view=doc.defaultView,owner=editorRef?.current||doc.documentElement;
  let frame=0,disposed=false;
  const update=()=>{
   if(disposed)return;
   syncContext(owner,menu);
   const viewport={width:view.innerWidth,height:view.innerHeight};
   menu.style.maxHeight=`${Math.max(0,Math.min(384,caret.top-34))}px`;
   const rect=menu.getBoundingClientRect(),position=slashMenuLayout({caret,width:rect.width,height:rect.height,viewport});
   Object.assign(menu.style,{left:`${position.left}px`,top:`${position.top}px`,visibility:'visible'});
   setActiveRow(scroller.querySelector('[data-highlighted]'));
  };
  const schedule=()=>{if(!frame)frame=view.requestAnimationFrame(()=>{frame=0;update();});};
  update();
  const row=scroller.querySelector('[data-highlighted]');
  // M: a keyboard move hands the active row to the virtualizer (scroll padding 28), which may not have rendered it yet.
  const at=listEntries.findIndex(entry=>entry.type==='row'&&entry.index===selected);
  if(virtual&&virtualizer.current&&mouseSelection.current!==selected){if(at>=0)virtualizer.current.scrollToIndex(at,{align:'auto'});}
  else if(row&&mouseSelection.current!==selected){const r=row.getBoundingClientRect(),clip=scroller.getBoundingClientRect();if(r.top<clip.top+4)scroller.scrollTop-=clip.top+4-r.top;else if(r.bottom>clip.bottom-4)scroller.scrollTop+=r.bottom-(clip.bottom-4);update();}
  mouseSelection.current=null;
  const outside=event=>{if(!menu.contains(event.target))latest.current?.();};
  const resize=new view.ResizeObserver(schedule);resize.observe(menu);resize.observe(scroller);
  const mutation=new view.MutationObserver(schedule);for(let node=owner;node;node=node.parentElement)mutation.observe(node,{attributes:true});
  doc.addEventListener('mousedown',outside);view.addEventListener('scroll',schedule,true);view.addEventListener('resize',schedule);
  return()=>{disposed=true;if(frame)view.cancelAnimationFrame(frame);resize.disconnect();mutation.disconnect();doc.removeEventListener('mousedown',outside);view.removeEventListener('scroll',schedule,true);view.removeEventListener('resize',schedule);};
 },[selected,query,entries,caret?.left,caret?.top,preSession,loading,failed,editorRef,virtual]);
 if(!caret)return null;
 const renderEntry=(entry,key)=>entry.type==='header'?<div key={key} className="slash-header" role="presentation">{t(entry.label)}</div>
  :entry.type==='loading'?<div key={key} className="smenu-skeleton-row slash-loading" data-slash-loading=""><span className="smenu-skeleton" style={{width:skeletonPlan(1)[0].width,height:16}} role="status"><span className="smenu-sr-only">{t('Loading')}</span></span></div>
  :(({command:c,index:i})=><div key={key} id={`${id}-${i}`} role="menuitem" tabIndex={-1} data-highlighted={selected===i?'':undefined} onMouseMove={()=>{if(i!==selected){mouseSelection.current=i;onHover(i);}}} onClick={()=>onSelect(c.id)}><span className="slash-label"><Match text={c.id} query={query}/>{c.matchedAlias&&<span className="slash-alias"> (<Match text={c.matchedAlias} query={query}/>)</span>}</span>{c.subtitle&&<span className="slash-subtitle"><span className="sc-sr-only">, </span>{t(c.subtitle)}</span>}</div>)(entry);
 const description=active?.skillDescription||active?.description||undefined,hasDescription=!!(description||active?.sourcePluginName||active?.sourceRepo);
 const doc=editorRef?.current?.ownerDocument||document;
 return createPortal(<>
  <div ref={ref} id={id} role="menu" aria-label={t('Slash commands')} className="source-slash-menu cds-root" data-positioning={editorRef?.current?.getCaretViewportRect?"editor-coordinates":"textarea-mirror"} style={{visibility:'hidden'}} onMouseDown={e=>e.preventDefault()}>
   <div ref={bodyRef} className="source-slash-body scroll-fade-y">
    {/* c5cd1b4dc :3586-3700 + ccc334009 z/G: section headers, the skill rows (an overriding row's 'Custom command'
        subtitle sits at the right, ml-auto pl-2 caption muted, read out after the name), and the loading skeleton
        (ccc334009 z: {type:'loading'} without an icon draws one 16px bar, shared-3 br rows 1). */}
    {/* ccc334009 k (under A = 30 rows): the rows sit in one "flex flex-col" div inside the shared-5 TO body (QC). */}
    {virtual?(scrollEl?<SlashVirtualRows entries={listEntries} rowKeys={rowKeys} renderEntry={renderEntry} scrollEl={scrollEl} virtualizerRef={virtualizer}/>:null)
     :listEntries.length>0&&<div className="flex flex-col">{listEntries.map((entry,key)=>renderEntry(entry,rowKeys[key]))}</div>}
   </div>
  </div>
  <SkillDescriptionTooltip anchor={hasDescription&&activeRow?activeRow:OFFSCREEN_ANCHOR} open={hasDescription} description={description}
   sourcePluginName={active?.sourcePluginName||undefined} sourceRepo={active?.sourceRepo||undefined} query={query}/>
 </>,doc.body);
}
export function SlashHint({caret,text,argument=false,id,editorRef,getCaret}) {
 const ref=useRef(null);
 useLayoutEffect(()=>{
  const hint=ref.current,editor=editorRef?.current;if(!hint||!editor)return;
  const doc=editor.ownerDocument,view=doc.defaultView;
  const update=()=>{
   syncContext(editor,hint);
   const position=getCaret(editor,argument?editor.value.length:editor.selectionStart),font=view.getComputedStyle(editor);
   Object.assign(hint.style,{fontFamily:font.fontFamily,fontSize:font.fontSize,lineHeight:font.lineHeight});
   const fits=argument||slashFilterFits({start:editor.selectionStart,end:editor.selectionEnd,length:editor.value.length,caretLeft:position.left,parentRight:editor.parentElement.getBoundingClientRect().right,width:hint.getBoundingClientRect().width});
   Object.assign(hint.style,{left:`${position.left+2}px`,top:`${position.top+position.height/2}px`,visibility:fits?'visible':'hidden'});
  };
  update();const observer=new view.ResizeObserver(update);observer.observe(editor);observer.observe(hint);
  const mutation=new view.MutationObserver(update);for(let node=editor;node;node=node.parentElement)mutation.observe(node,{attributes:true});
  doc.addEventListener('selectionchange',update);view.addEventListener('resize',update);view.addEventListener('scroll',update,true);
  return()=>{observer.disconnect();mutation.disconnect();doc.removeEventListener('selectionchange',update);view.removeEventListener('resize',update);view.removeEventListener('scroll',update,true);};
 },[text,argument,caret?.left,caret?.top,editorRef,getCaret]);
 if(!caret||!text)return null;
 return createPortal(<><span ref={ref} className={argument?'slash-argument cds-root':'slash-filter cds-root'} data-skill-arg-hint={argument||undefined} aria-hidden="true" style={{left:caret.left+2,top:caret.top+caret.height/2}}>{text}</span>{argument&&<span className="sc-sr-only" role="status" aria-live="polite" id={id}>{text}</span>}</>,editorRef?.current?.ownerDocument.body||document.body);
}
