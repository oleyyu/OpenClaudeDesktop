import React,{forwardRef,useImperativeHandle,useLayoutEffect,useRef,useState} from 'react';
// SC-7: the field is the 2.42304.0 CDS TextInput (shared-frame tx, exported ho), as the official c6bf19e8f en renders
// it (`ho as O`), by its view-tabs semantic name; no longer the 2.2553.1 Bh from generated/chat.
import {CdsTextInput as TextInput} from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import {SourceSettingsButton} from './source-settings-button.jsx';
import {SourceTooltip,SourceTooltipGroup} from './source-tooltip.jsx';
import {runTerminalFind,terminalFindKey} from './terminal-find-model.mjs';
import {t} from '../electron/i18n/index.mjs';

// Jt, with original CDS input/button markup and panel geometry. The bridge is local xterm.
export const SourceTerminalFind=forwardRef(function SourceTerminalFind({view,selectionSuppressed,onClose},ref){
 const input=useRef(null),[query,setQuery]=useState(''),[noResults,setNoResults]=useState(false);
 const focus=()=>{input.current?.focus();input.current?.select();};
 useLayoutEffect(()=>{input.current?.focus();},[]);
 const step=direction=>{if(query!=='')setNoResults(!runTerminalFind(view.current,query,direction,false,selectionSuppressed));};
 useImperativeHandle(ref,()=>({focus,step:forward=>step(forward?'next':'previous')}),[query,view,selectionSuppressed]);
 return <div role="search" data-terminal-find="" data-cds="Surface" data-surface="panel" className="stp-find rounded-card bg-surface-2 shadow-panel-sm"
  onContextMenu={event=>event.stopPropagation()}
  onKeyDown={event=>{const action=terminalFindKey(event.nativeEvent);if(!action)return;event.preventDefault();event.stopPropagation();if(action==='close')onClose();else if(action==='focus')focus();else step(action);}}>
  <SourceTooltipGroup>
   <TextInput ref={input} value={query} onChange={event=>{const text=event.target.value;setQuery(text);setNoResults(!runTerminalFind(view.current,text,'previous',true,selectionSuppressed)&&text!=='');}}
    spellCheck={false} autoComplete="off" aria-label={t('Find in terminal')} placeholder={t('Find in terminal…')} fullWidth={false} className="stp-find-input"
    slotEnd={<span aria-live="polite" className="text-footnote whitespace-nowrap">{noResults?t('No results'):null}</span>}/>
   <SourceTooltip content={t('Previous match')} shortcut="cmd+shift+g"><SourceSettingsButton variant="ghost" icon="ArrowUp" iconOnly aria-label={t('Previous match')} disabled={query===''} onClick={()=>step('previous')}/></SourceTooltip>
   <SourceTooltip content={t('Next match')} shortcut="cmd+g"><SourceSettingsButton variant="ghost" icon="ArrowDown" iconOnly aria-label={t('Next match')} disabled={query===''} onClick={()=>step('next')}/></SourceTooltip>
   <SourceTooltip content={t('Close find bar')} shortcut="esc"><SourceSettingsButton variant="ghost" icon="X" iconOnly className="text-secondary" aria-label={t('Close find bar')} onClick={onClose}/></SourceTooltip>
  </SourceTooltipGroup>
 </div>;
});
