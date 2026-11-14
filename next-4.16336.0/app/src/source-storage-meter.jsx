import React,{useLayoutEffect,useRef,useState} from 'react';
import {SourceTooltip} from './source-tooltip.jsx';
import {t} from '../electron/i18n/index.mjs';
import {storageReadout,storageMeterGeometry,storagePercent} from './storage-meter-model.mjs';

export function SourceStorageMeter({areas,formatValue}) {
  const node=useRef(null),[width,setWidth]=useState(0),[hovered,setHovered]=useState(null),[keyboardReadout,setKeyboardReadout]=useState(false);
  useLayoutEffect(()=>{
    const element=node.current;
    const observer=new element.ownerDocument.defaultView.ResizeObserver(entries=>setWidth(entries[0].contentRect.width));
    setWidth(element.clientWidth);observer.observe(element);
    return()=>observer.disconnect();
  },[]);
  const entries=storageReadout(areas,formatValue),geometry=storageMeterGeometry(entries,width);
  const segment=(index,style)=><SourceTooltip key={entries[index].id} content={entries[index].readout} hoverable={false} className="ss-storage-readout"><span data-area={entries[index].id} style={style} onPointerEnter={()=>{setKeyboardReadout(false);setHovered(entries[index].id);}} onPointerLeave={()=>setHovered(null)}/></SourceTooltip>;
  // A segment owns hover; the enclosing meter owns keyboard focus. Prevent
  // the enclosing tooltip's delayed opening from replacing its child's readout.
  return <SourceTooltip content={entries.map(entry=>entry.readout).join('\n')} open={keyboardReadout?true:hovered===null?undefined:false} onOpenChange={open=>{if(!open)setKeyboardReadout(false);}} multiline hoverable={false} className="ss-storage-readout">
    <div ref={node} className="ss-storage-bar" data-cds="StackedMeter" data-shape={geometry.kind} role="img" tabIndex={0} onFocus={event=>{setHovered(null);if(event.currentTarget.matches(':focus-visible'))setKeyboardReadout(true);}} onBlur={()=>setKeyboardReadout(false)} aria-label={t('Storage by area: {areas}',{areas:entries.map(entry=>entry.readout).join('; ')})}>
      {geometry.kind==='dot'&&segment(geometry.index,{width:8,insetInlineStart:0,borderRadius:4})}
      {geometry.segments.map(part=>segment(part.index,{
        insetInlineStart:`calc(${storagePercent(part.start)}% + ${part.seam}px)`,width:`calc(${storagePercent(part.share)}% - ${part.seam}px)`,
        borderStartStartRadius:part.startRadius,borderEndStartRadius:part.startRadius,borderStartEndRadius:part.endRadius,borderEndEndRadius:part.endRadius,
      }))}
    </div>
  </SourceTooltip>;
}
