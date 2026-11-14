import React, {useId,useLayoutEffect,useRef,useState} from 'react';
import {Icon} from './icons';
import './source-disclosure.css';

// Independent CDS Collapsible: measured height, with closed contents removed
// from both the accessibility tree and tab order during their exit transition.
// caret="end" / triggerClassName / after serve the error-details Rp branch
// (approval-shared-current.js:4100-4135: Wt.Trigger hideCaret + trailing
// CaretRight, panel order-first, trailing actions inside the same root).
// defaultOpen (Collapsible.Root defaultOpen, c2e7fd468 g) mounts open at its
// natural height without an entrance transition.
export function SourceDisclosure({label,ariaLabel,children,className='',caret='start',triggerClassName='',after=null,defaultOpen=false}) {
  const [open,setOpen]=useState(defaultOpen),[present,setPresent]=useState(defaultOpen);
  const mountedOpen=useRef(defaultOpen);
  const panel=useRef(null),content=useRef(null),trigger=useRef(null),id=useId();
  useLayoutEffect(()=>{
    const node=panel.current,body=content.current;if(!present||!node||!body)return;
    const host=node.ownerDocument.defaultView,media=host.matchMedia('(prefers-reduced-motion: reduce)');
    let frame,timer,disposed=false;
    const reduced=()=>media.matches||node.ownerDocument.documentElement.dataset.localMotion==='reduce';
    const finish=()=>{if(disposed)return;host.clearTimeout(timer);if(!open)setPresent(false);};
    const apply=()=>{
      if(disposed)return;
      // Computed layout height excludes the ancestor dialog's entrance scale.
      const height=open?parseFloat(host.getComputedStyle(body).height):0;
      node.style.height=`${height}px`;
      if(reduced())finish();
    };
    const start=()=>{
      const current=parseFloat(host.getComputedStyle(node).height);
      node.style.height=`${current}px`;
      // Freeze an in-flight transition before retargeting it on rapid toggles.
      node.getBoundingClientRect();
      if(reduced())apply();else frame=host.requestAnimationFrame(()=>{
        apply();const style=host.getComputedStyle(node);
        const ms=value=>value.split(',').map(x=>parseFloat(x)*(x.trim().endsWith('ms')?1:1000));
        const duration=Math.max(...ms(style.transitionDuration))+Math.max(...ms(style.transitionDelay));
        timer=host.setTimeout(finish,duration+50);
      });
    };
    const ended=event=>{if(event.target===node&&event.propertyName==='height')finish();};
    const motion=()=>{if(reduced()){host.cancelAnimationFrame(frame);apply();}};
    const resize=new host.ResizeObserver(()=>{if(open)apply();});resize.observe(body);
    node.addEventListener('transitionend',ended);media.addEventListener('change',motion);host.addEventListener('local-motion-change',motion);
    if(mountedOpen.current)mountedOpen.current=false;else start();
    return()=>{disposed=true;host.cancelAnimationFrame(frame);host.clearTimeout(timer);resize.disconnect();node.removeEventListener('transitionend',ended);media.removeEventListener('change',motion);host.removeEventListener('local-motion-change',motion);};
  },[open,present]);
  const toggle=()=>{
    if(open&&panel.current?.contains(panel.current.ownerDocument.activeElement))trigger.current?.focus({preventScroll:true});
    setPresent(true);setOpen(value=>!value);
  };
  return <div className={`source-disclosure ${className}`} data-cds="Collapsible">
    <button type="button" ref={trigger} className={`source-disclosure-trigger ${triggerClassName}`} aria-label={ariaLabel} aria-expanded={open} aria-controls={id} data-panel-open={open||undefined} onClick={toggle}>
      {caret==='start'&&<Icon name="CaretRight" size={16}/>}{label}{caret==='end'&&<Icon name="CaretRight" size={16}/>}
    </button>
    {present&&<div id={id} ref={node=>{panel.current=node;if(node&&mountedOpen.current)node.style.height='auto';}} className="source-disclosure-panel" aria-hidden={!open||undefined} inert={!open}>
      <div ref={content} className="source-disclosure-content">{children}</div>
    </div>}
    {after}
  </div>;
}
