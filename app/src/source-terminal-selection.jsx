import React,{useLayoutEffect,useRef} from 'react';
import {SourceSettingsButton} from './source-settings-button.jsx';
import {SourceTooltip} from './source-tooltip.jsx';
import {t} from '../electron/i18n/index.mjs';
import {terminalSelectionPillPosition} from './generated/code-current/terminal-geometry.mjs';
// 2.42304.0 c6bf19e8f li: measure the action strip (ci), preserve its side while a selection scrolls.
export function TerminalSelectionAction({anchor,onAttach}) {
 const root=useRef(null),side=useRef(null);
 useLayoutEffect(()=>{
  const node=root.current,parent=node?.offsetParent;if(!node||!parent)return;
  const place=()=>{
   const result=terminalSelectionPillPosition(anchor,{width:node.offsetWidth,height:node.offsetHeight},{width:parent.clientWidth,height:parent.clientHeight},side.current?.id===anchor.sel?.id?side.current.side:undefined);
   side.current=anchor.sel&&result.side?{id:anchor.sel.id,side:result.side}:null;
   node.style.left=`${result.left}px`;node.style.top=`${result.top}px`;
  };
  place();const observer=new ResizeObserver(place);observer.observe(parent);return()=>observer.disconnect();
 },[anchor]);
 return <div ref={root} className="stp-selection-action"><SourceTooltip content={t('Attach as context')} shortcut="cmd+shift+l" hoverable={false}>
  <SourceSettingsButton variant="ghost" onMouseDown={event=>event.preventDefault()} onClick={onAttach}>{t('Attach as context')}</SourceSettingsButton>
 </SourceTooltip></div>;
}
