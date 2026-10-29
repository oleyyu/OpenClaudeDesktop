import React,{forwardRef,useImperativeHandle,useLayoutEffect,useRef,useState} from 'react';
// 3.6556.2 c6bf19e8f rn (the terminal find bar), by view-tabs semantic names (R6 facade): u = CdsSurface (shared-frame
// Dl = cg, published by w11-e31-terminal-cont), v = CdsTextInput (vs), d = CdsButton (Eu), _ = CdsTooltipProvider (ql),
// m = useCdsLayerAwareZIndex(13) (cu, Xt). The Surface gives the root data-cds="Surface" data-surface="panel", the
// panel class (ig, forced-colors border included), its sg style variables (Za surface vars and the theme focus shadows)
// under rn's style, and the CdsSurfaceContext value "surface-2" for its children. `fe` spreads `{[N]: ""}`, N being
// shared-156 Ln = "data-escape-owner" (proposal-group slices it as the official export Ln).
import {CdsButton,CdsSurface,CdsTextInput as TextInput,CdsTooltipProvider,useCdsLayerAwareZIndex,useCdsOwnerWindow} from './generated/view-tabs/index.js';
import {Ln as escapeOwnerAttribute} from './generated/proposal-group/shared-156-BLTosN8U.js';
import {ownerWindow} from './generated/code-current/owner-window.mjs';
import {isMacUserAgent} from './generated/code-current/surface-chord-platform.mjs';
import {suppressKeyRepeat} from './generated/code-editor-current/keyboard-repeat.mjs';
import {suppressNativeMenu} from './diff-commits-model.mjs';
import {runTerminalFind,terminalFindKey} from './terminal-find-model.mjs';
import {t} from '../electron/i18n/index.mjs';

// rn Qt / k: the step buttons show cmd+g / cmd+shift+g only when the app menu steps the search
// (`ie?.onFindStepRequested !== void 0 && !w && ce()`): the host's menu route (main.jsx dispatchTerminalFind) serves the
// main window, w is shared-frame zd (co: the owner window is not this window, a child window), ce is shared-78 mE
// (isMacUserAgent). Close always shows esc.
const STEP_SHORTCUTS={next:'cmd+g',previous:'cmd+shift+g'};
const FIND_ROOT_CLASS='absolute top-2 right-5 flex items-center gap-xs p-xs';
const ESCAPE_OWNER={[escapeOwnerAttribute]:''};
// rn tn: a key that closed or acted keeps its auto-repeat from reaching the terminal (shared-19 ln on the owner window).
function swallowRepeat(key,node){const view=ownerWindow(node);if(view)suppressKeyRepeat(key,view);}
// rn de = `p ? en : $t`, p being shared-25 vh (isDesktopClient, true here): en keeps the bar's context menu out of the
// terminal's and drops the native one unless shared-1 y (ZG, the host port suppressNativeMenu) lets it through, or the
// press is on the bar (outside its field) with a collapsed selection.
function barContextMenu(event){
 event.stopPropagation();
 const bar=event.currentTarget,target=event.target?.nodeType===1?event.target:null;
 const onBar=target!==null&&bar.contains(target)&&target.closest('input')===null;
 const selection=bar.ownerDocument.getSelection(),collapsed=selection!==null&&selection.rangeCount>0&&selection.getRangeAt(0).collapsed;
 if(suppressNativeMenu(event,bar)||(onBar&&collapsed))event.preventDefault();
}

export const SourceTerminalFind=forwardRef(function SourceTerminalFind({view,selectionSuppressed,onClose},ref){
 const input=useRef(null),[query,setQuery]=useState(''),[noResults,setNoResults]=useState(false);
 const zIndex=useCdsLayerAwareZIndex(13);
 const owner=useCdsOwnerWindow();
 const stepShortcuts=!(owner!==undefined&&owner!==globalThis.window)&&isMacUserAgent()?STEP_SHORTCUTS:undefined;
 const focus=()=>{input.current?.focus();input.current?.select();};
 useLayoutEffect(()=>{input.current?.focus();},[]);
 // rn C: a step with a query searches; no match shows "No results".
 const step=direction=>{if(query!=='')setNoResults(!runTerminalFind(view.current,query,direction,false,selectionSuppressed));};
 useImperativeHandle(ref,()=>({focus,step:forward=>step(forward?'next':'previous')}),[query,view,selectionSuppressed]);
 return <CdsSurface elevation="panel" role="search" data-terminal-find="" className={FIND_ROOT_CLASS} style={{zIndex}}
  // rn A: Escape closes (its repeat swallowed), the find chord (Zt findInFile) refocuses the field. Host: ⌘G/⇧⌘G also
  // step here, for a window whose menu does not route them (rn steps through ie.onFindStepRequested instead).
  onKeyDown={event=>{
   // rn A, verbatim: `e.key==="Escape"&&!e.nativeEvent.isComposing ? (e.preventDefault(), e.stopPropagation(),
   // tn("Escape", e.currentTarget), e.keyCode!==229&&c())`: an IME Escape (keyCode 229) is still taken, it only
   // does not close.
   if(event.key==='Escape'&&!event.nativeEvent.isComposing){
    event.preventDefault();event.stopPropagation();swallowRepeat('Escape',event.currentTarget);
    if(event.keyCode!==229)onClose();return;
   }
   if(event.key==='Enter')return;
   const action=terminalFindKey(event.nativeEvent);if(!action)return;
   event.preventDefault();event.stopPropagation();
   if(action==='focus')focus();else if(action!=='close')step(action);
  }}
  onContextMenu={barContextMenu} {...ESCAPE_OWNER}>
  <CdsTooltipProvider>
   <TextInput ref={input} value={query} onChange={event=>{const text=event.target.value;setQuery(text);setNoResults(!runTerminalFind(view.current,text,'previous',true,selectionSuppressed)&&text!=='');}}
    // rn M: Enter steps backwards, Shift+Enter forwards (not while composing).
    onKeyDown={event=>{const action=event.key==='Enter'?terminalFindKey(event.nativeEvent):null;if(!action)return;event.preventDefault();step(action);}}
    spellCheck={false} autoComplete="off" aria-label={t('Find in terminal')} placeholder={t('Find in terminal…')} fullWidth={false} className="w-48"
    slotEnd={<span aria-live="polite" className="text-footnote whitespace-nowrap">{noResults?t('No results'):null}</span>}/>
   <CdsButton size="base" icon="ArrowUp" aria-label={t('Previous match')} shortcut={stepShortcuts?.previous} onClick={()=>step('previous')} disabled={query===''} variant="ghost" iconOnly/>
   <CdsButton size="base" icon="ArrowDown" aria-label={t('Next match')} shortcut={stepShortcuts?.next} onClick={()=>step('next')} disabled={query===''} variant="ghost" iconOnly/>
   <CdsButton size="base" icon="X" aria-label={t('Close find bar')} shortcut="esc" onClick={onClose}
    onKeyDown={event=>{if(event.key==='Enter')swallowRepeat('Enter',event.currentTarget);}} variant="ghost" iconOnly className="text-secondary"/>
  </CdsTooltipProvider>
 </CdsSurface>;
});
