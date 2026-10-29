import React,{useLayoutEffect,useMemo,useRef} from 'react';
import {useCdsLayerAwareZIndex} from './generated/view-tabs/index.js';
import {SelectionActionBar} from './generated/code-current/terminal-action-bar.mjs';
import {t} from '../electron/i18n/index.mjs';
import {terminalSelectionPillPosition} from './generated/code-current/terminal-geometry.mjs';
// 3.6556.2 c6bf19e8f Si: the selection's action strip. A wrapper at the anchor (`absolute -translate-x-1/2
// -translate-y-full`, z-index from the layer-aware mi = 12) around ceb49ada3 u (SelectionActionBar, generated) with one
// action, Attach as context (cmd+shift+l). On each anchor change the layout effect measures the strip and its offset
// parent (kept from the last measurement while there is none) and places it with xi (terminalSelectionPillPosition),
// keeping the side it took for the same selection.
const SELECTION_ACTION_Z=12;
export function TerminalSelectionAction({anchor,onAttach}) {
 const root=useRef(null),measured=useRef(null),side=useRef(null);
 useLayoutEffect(()=>{
  const node=root.current;if(!node)return;
  const parent=node.offsetParent;
  if(parent)measured.current={pill:{width:node.offsetWidth,height:node.offsetHeight},box:{width:parent.clientWidth,height:parent.clientHeight}};
  const {sel}=anchor;
  const result=terminalSelectionPillPosition(anchor,measured.current?.pill??{width:node.offsetWidth,height:node.offsetHeight},measured.current?.box??{width:Infinity,height:Infinity},sel&&side.current?.id===sel.id?side.current.side:undefined);
  side.current=sel&&result.side?{id:sel.id,side:result.side}:null;
  node.style.left=`${result.left}px`;node.style.top=`${result.top}px`;
 },[anchor]);
 const label=t('Attach as context');
 const actions=useMemo(()=>[{key:'attach',label,shortcut:'cmd+shift+l',onSelect:onAttach}],[label,onAttach]);
 const zIndex=useCdsLayerAwareZIndex(SELECTION_ACTION_Z);
 return <div ref={root} className="absolute -translate-x-1/2 -translate-y-full" style={{zIndex}}><SelectionActionBar actions={actions}/></div>;
}
