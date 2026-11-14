import {useEffect, useMemo, useState} from 'react';

// Keep the real transcript item nodes/anchors intact. Only assistant-side rows
// reveal the turn's footer; a user bubble may share its turnId but not its actions.
export function useTurnFooterInteraction(sessionKey, items) {
  const itemTurns=useMemo(()=>new Map(items.filter(item=>item.id&&item.turnId&&item.type!=='userMessage').map(item=>[item.id,item.turnId])),[items]);
  const [state,setState]=useState(()=>({sessionKey,hovered:null,focused:null,interacted:new Set()}));
  useEffect(()=>{
    setState(previous=>previous.sessionKey===sessionKey?previous:{sessionKey,hovered:null,focused:null,interacted:new Set()});
  },[sessionKey]);
  const current=state.sessionKey===sessionKey?state:null;
  const turnAt=(target,container)=>{
    const node=target?.closest?.('[data-turn-copy-id],[data-transcript-item-id]');
    if(!node||!container.contains(node))return null;
    return node.dataset.turnCopyId||itemTurns.get(node.dataset.transcriptItemId)||null;
  };
  const update=(field,turnId)=>{
    setState(previous=>{
      const value=previous.sessionKey===sessionKey?previous:{sessionKey,hovered:null,focused:null,interacted:new Set()};
      if(value[field]===turnId&&(!turnId||value.interacted.has(turnId)))return value;
      const interacted=new Set(value.interacted);
      if(turnId)interacted.add(turnId);
      return {...value,[field]:turnId,interacted};
    });
  };
  return {
    forTurn:turnId=>({hovered:current?.hovered===turnId,focused:current?.focused===turnId,interacted:current?.interacted.has(turnId)||false}),
    handlers:{
      onPointerOver:event=>update('hovered',turnAt(event.target,event.currentTarget)),
      onPointerOut:event=>update('hovered',turnAt(event.relatedTarget,event.currentTarget)),
      onPointerLeave:()=>update('hovered',null),
      onFocusCapture:event=>update('focused',turnAt(event.target,event.currentTarget)),
      onBlurCapture:event=>update('focused',turnAt(event.relatedTarget,event.currentTarget)),
    },
  };
}
