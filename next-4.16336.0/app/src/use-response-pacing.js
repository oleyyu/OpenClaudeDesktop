import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {useReducedMotion} from './use-reduced-motion.js';
import {createPacingState,updatePacing,pacingDelay,tickPacing,resumePacing,pacedText} from './response-pacing-model.mjs';
const now=()=>typeof performance==='undefined'?0:performance.now();
export function useResponsePacing(text,{enabled=false,interrupting=false}={}){
  const reduced=useReducedMotion(),[interrupted,setInterrupted]=useState(false);
  if(interrupting&&!interrupted)setInterrupted(true);
  const active=enabled&&!reduced&&!interrupting&&!interrupted&&typeof document!=='undefined';
  const [state,setState]=useState(()=>createPacingState(text,active,now()));
  let current=state;
  if(state.text!==text||state.enabled!==active){current=updatePacing(state,text,active,now());setState(current);}
  const latest=useRef(current);useLayoutEffect(()=>{latest.current=current;});
  useEffect(()=>{
    if(!active)return;
    let timer=null,disposed=false;
    const cancel=()=>{if(timer!==null)clearTimeout(timer);timer=null;};
    const schedule=()=>{
      cancel();if(disposed||document.hidden)return;
      const delay=pacingDelay(latest.current,now());
      if(delay!==null)timer=setTimeout(()=>{timer=null;if(disposed||document.hidden)return;const next=tickPacing(latest.current,now());latest.current=next;setState(next);schedule();},delay);
    };
    const visible=()=>{
      cancel();if(document.hidden)return;
      const next=resumePacing(latest.current,now());latest.current=next;setState(next);schedule();
    };
    schedule();document.addEventListener('visibilitychange',visible);
    return()=>{disposed=true;cancel();document.removeEventListener('visibilitychange',visible);};
  },[active,current.text,current.ceiling]);
  return pacedText(current);
}
