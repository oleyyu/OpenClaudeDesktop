import React,{createContext,useContext,useEffect,useId,useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {Icon} from './icons.jsx';
// W14-code r6 sh6-03: shared-22 QI `action: o(A,{size:"sm",variant:"secondary",onClick:…})` — A is shared-frame Uu (E41 direct import).
import {CdsButton} from './generated/view-tabs/shared-frame-6jtSkIit.js';
import {t} from '../electron/i18n/index.mjs';
import {createToastStore,toastClearance} from './toast-store.mjs';
import './source-toast.css';
const ToastContext=createContext(null);
export const useSourceToasts=()=>useContext(ToastContext);
export function SourceToastProvider({children}) {
  const [store]=useState(createToastStore);
  useEffect(()=>()=>store.dispose(),[store]);
  return <ToastContext.Provider value={store}>{children}<ToastViewport store={store}/></ToastContext.Provider>;
}
function ToastViewport({store}) {
  const entries=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot),viewport=useRef(null),previous=useRef(null),scope=useRef(null);
  const [frontHeight,setFrontHeight]=useState(0),[font,setFont]=useState('sans');
  const front=entries.find(entry=>entry.phase!=='ending');
  useEffect(()=>{if(!entries.length){store.resume('hover');store.resume('focus');}},[entries.length,store]);
  const restore=()=>{const target=previous.current;previous.current=null;if(target?.isConnected&&!target.closest('[inert]'))target.focus({preventScroll:true});};
  useEffect(()=>{
    const doc=document,view=doc.defaultView;
    const sync=()=>setFont(doc.documentElement.dataset.font||'sans');sync();
    const observer=new MutationObserver(sync);observer.observe(doc.documentElement,{attributes:true,attributeFilter:['data-font']});
    const blur=()=>store.pause('window'),focus=()=>store.resume('window');
    view.addEventListener('blur',blur);view.addEventListener('focus',focus);
    if(!doc.hasFocus())blur();
    return()=>{observer.disconnect();view.removeEventListener('blur',blur);view.removeEventListener('focus',focus);};
  },[store]);
  useEffect(()=>{
    if(!front)return;
    const key=event=>{
      if(event.key!=='F6'||event.isComposing||event.defaultPrevented||viewport.current?.contains(document.activeElement))return;
      event.preventDefault();previous.current=document.activeElement;viewport.current?.focus({preventScroll:true});
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[front?.id]);
  const dismiss=id=>{
    const node=viewport.current?.querySelector(`[data-toast-id="${id}"]`),focused=node?.contains(document.activeElement);
    store.close(id);
    if(focused){
      const next=store.getSnapshot().find(entry=>entry.phase!=='ending');
      if(next)viewport.current?.querySelector(`[data-toast-id="${next.id}"]`)?.focus({preventScroll:true});
      else {store.resume('focus');restore();}
    }
  };
  const shown=entries.length>0;
  useLayoutEffect(()=>{
    const node=scope.current;if(!shown||!node)return;
    const view=node.ownerDocument.defaultView;let frame=0;
    const update=()=>{frame=0;const regions=[...node.ownerDocument.querySelectorAll('[data-toast-safe-region]')].filter(region=>!region.closest('[inert]')).map(region=>{const {left,right,top,bottom,width,height}=region.getBoundingClientRect();return {left,right,top,bottom,width,height,nearWindowBottomOnly:region.getAttribute('data-toast-safe-region')==='near-bottom'};});
      const value=toastClearance(node.getBoundingClientRect(),regions,view.innerHeight);
      if(value>0)node.style.setProperty('--toast-clearance',`${Math.round(value)}px`);else node.style.removeProperty('--toast-clearance');};
    const schedule=()=>{if(!frame)frame=view.requestAnimationFrame(update);};
    update();
    const resize=new view.ResizeObserver(schedule);for(const region of node.ownerDocument.querySelectorAll('[data-toast-safe-region]'))resize.observe(region);
    view.addEventListener('resize',schedule);
    return()=>{resize.disconnect();view.removeEventListener('resize',schedule);if(frame)view.cancelAnimationFrame(frame);};
  },[shown]);
  if(!shown)return null;
  let visibleIndex=0;
  return createPortal(<div ref={scope} className="cds-root source-toast-scope" data-cds-portal="" data-cds="Toast" data-density="compact" data-font={font}>
    <div ref={viewport} className="source-toast-viewport" role="region" aria-label={t('Notifications')} aria-live="polite" aria-atomic="false" aria-relevant="additions text" tabIndex={-1} style={{height:frontHeight||undefined}}
      onMouseEnter={()=>store.pause('hover')} onMouseLeave={()=>store.resume('hover')}
      onFocus={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget))previous.current=event.relatedTarget;store.pause('focus');}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))store.resume('focus');}}
      onKeyDown={event=>{
        if(event.nativeEvent.isComposing)return;
        if(event.key==='Tab'&&event.target===event.currentTarget){event.preventDefault();if(event.shiftKey){store.resume('focus');restore();}else viewport.current?.querySelector('[data-front=true]')?.focus({preventScroll:true});}
      }}>
      {entries.map((entry,index)=>{const order=entry.phase==='ending'?index:visibleIndex++,limited=order>=3;return <ToastCard key={entry.id} entry={entry} front={entry===front} limited={limited} order={order} zIndex={entries.length-index} frontHeight={frontHeight} onHeight={setFrontHeight} store={store} dismiss={dismiss}/>;})}
    </div>
  </div>,document.body);
}
function ToastCard({entry,front,limited,order,zIndex,frontHeight,onHeight,store,dismiss}) {
  const content=useRef(null),lastLayout=useRef({behind:!front,height:!front?frontHeight:undefined}),title=useId(),description=useId();
  const ending=entry.phase==='ending';
  if(!ending)lastLayout.current={behind:!front,height:!front?frontHeight:undefined};
  const layout=lastLayout.current;
  useLayoutEffect(()=>{
    let second;const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>store.settle(entry.id));});
    return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);};
  },[entry.id,store]);
  useLayoutEffect(()=>{
    if(!front||!content.current)return;
    const node=content.current,update=()=>onHeight(node.offsetHeight),observer=new ResizeObserver(update);update();observer.observe(node);return()=>observer.disconnect();
  },[front,onHeight]);
  const text=entry.message+(entry.count>1?` (×${entry.count})`:'');
  return <div className="source-toast-card" data-toast-id={entry.id} data-phase={entry.phase} data-front={front} data-limited={limited||undefined} data-variant={entry.variant} role={entry.variant==='danger'?'alertdialog':'dialog'} aria-modal="false" aria-labelledby={title} aria-describedby={entry.description?description:undefined} aria-hidden={limited||ending||undefined} tabIndex={limited||ending?-1:0} inert={limited||ending}
    style={{'--toast-index':order,zIndex}} onKeyDown={event=>{if(event.key==='Escape'&&!event.nativeEvent.isComposing){event.preventDefault();event.stopPropagation();dismiss(entry.id);}}}>
    <div className="source-toast-surface"><div ref={content} className="source-toast-content" data-behind={layout.behind||undefined} style={{height:layout.height||undefined}}>
      <Icon name={entry.variant==='neutral'?'Info':entry.variant==='danger'?'WarningCircle':'Warning'} size={20}/>
      {/* aV nV: the title (font-medium), Toast.Description under it in the body weight, then the action slot
          (mt-pad-md); a click on the action runs it and dismisses the toast. */}
      <div className="source-toast-text">
        <div id={title} className="source-toast-message">{text}</div>
        {entry.description&&<p id={description} className="source-toast-description">{entry.description}</p>}
        {entry.action&&<div className="source-toast-action"><CdsButton size="sm" variant="secondary" onClick={()=>{try{entry.action.onClick();}finally{dismiss(entry.id);}}}>{entry.action.label}</CdsButton></div>}
      </div>
      <button type="button" className="source-toast-dismiss" aria-label={t('Dismiss')} onClick={()=>dismiss(entry.id)}><Icon name="X" size={16}/></button>
    </div></div>
  </div>;
}
