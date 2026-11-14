import React,{useCallback,useLayoutEffect,useRef,useState} from 'react';
import {useReducedMotion} from './use-reduced-motion.js';
import './source-morph-text.css';

const timing={duration:180,easing:'cubic-bezier(0.2, 0, 0, 1)',fill:'both'};

// Independent rE/oE/sE text morph. Historic static groups stay static until
// their first key change; a group mounted live never fades its initial label.
export function SourceMorphText({morphKey,live=false,className='',slotClassName='',children}){
 const reduced=useReducedMotion(),[initial]=useState(morphKey),[enabled,setEnabled]=useState(live);
 if(!enabled&&initial!==morphKey)setEnabled(true);
 return reduced||!enabled
  ? <span className={`${slotClassName} ${className}`}>{children}</span>
  : <MorphSlots morphKey={morphKey} animateMount={!live} className={className} slotClassName={slotClassName}>{children}</MorphSlots>;
}

function MorphSlots({morphKey,animateMount,className,slotClassName,children}){
 const [state,setState]=useState(()=>({key:morphKey,children,exits:[],generation:0}));
 const root=useRef(null),last=useRef(null),glide=useRef(null);
 if(state.key!==morphKey)setState({key:morphKey,children,generation:state.generation+1,
  exits:[...state.exits.filter(slot=>slot.key!==morphKey),{key:state.key,children:state.children}]});
 else if(state.children!==children)setState({...state,children});
 const exited=useCallback(key=>setState(value=>({...value,exits:value.exits.filter(slot=>slot.key!==key)})),[]);
 useLayoutEffect(()=>{
  const node=root.current;if(!node||typeof node.animate!=='function')return;
  const current=[...node.children].find(child=>child.dataset.morphKey===morphKey);
  if(!current)return;
  const text=current.textContent||'',previous=last.current;
  if(previous?.key===morphKey&&previous.text===text)return;
  const outgoing=[...node.children].find(child=>child!==current);
  const oldWidth=previous===null?undefined:glide.current?node.getBoundingClientRect().width:previous.key===morphKey?previous.width:outgoing?.getBoundingClientRect().width;
  glide.current?.cancel();glide.current=null;delete node.dataset.gliding;
  // Remove the truncation cap while measuring the new slot, as oE does.
  if(oldWidth!==undefined)node.dataset.gliding='';
  const width=current.getBoundingClientRect().width;
  last.current={key:morphKey,text,width};
  if(oldWidth===undefined||Math.abs(oldWidth-width)<.5){delete node.dataset.gliding;return;}
  const animation=node.animate([{width:`${oldWidth}px`},{width:`${width}px`}],timing);
  glide.current=animation;
  animation.onfinish=()=>{
   if(glide.current!==animation)return;
   // Outgoing slots share a grid cell; release width only after they disappear.
   if(node.querySelector('[aria-hidden=true]'))return;
   animation.cancel();glide.current=null;delete node.dataset.gliding;
  };
 },[morphKey,children]);
 useLayoutEffect(()=>{
  if(state.exits.length||!glide.current||glide.current.playState==='running')return;
  glide.current.cancel();glide.current=null;if(root.current)delete root.current.dataset.gliding;
 },[state.exits.length]);
 useLayoutEffect(()=>{
  const node=root.current,host=node.ownerDocument.defaultView;
  const observer=typeof host.ResizeObserver==='function'?new host.ResizeObserver(entries=>{
   if(last.current&&!glide.current)last.current.width=entries.at(-1).contentRect.width;
  }):null;
  observer?.observe(node);
  return()=>{observer?.disconnect();glide.current?.cancel();glide.current=null;};
 },[]);
 return <span ref={root} className={`source-morph-text ${slotClassName}`}>
  {state.exits.map(slot=><MorphSlot key={slot.key} morphKey={slot.key} present={false} animateEnter className={className} onExited={exited}>{slot.children}</MorphSlot>)}
  <MorphSlot key={state.key} morphKey={state.key} present animateEnter={animateMount||state.generation>0} className={className} onExited={exited}>{children}</MorphSlot>
 </span>;
}

function MorphSlot({morphKey,present,animateEnter,className,onExited,children}){
 const ref=useRef(null);
 useLayoutEffect(()=>{
  const node=ref.current;
  if(present&&!animateEnter)return;
  if(typeof node.animate!=='function'){if(!present)onExited(morphKey);return;}
  const style=node.ownerDocument.defaultView.getComputedStyle(node);
  const animation=node.animate(present
   ? [{opacity:0,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0px)'}]
   : [{opacity:style.opacity,transform:style.transform},{opacity:0,transform:'translateY(-3px)'}],timing);
  animation.onfinish=()=>{if(present)animation.cancel();else onExited(morphKey);};
  return()=>{animation.onfinish=null;animation.cancel();};
 },[morphKey,present,animateEnter,onExited]);
 return <span ref={ref} data-morph-key={morphKey} aria-hidden={!present||undefined} className={`source-morph-slot ${className}`}>{children}</span>;
}
