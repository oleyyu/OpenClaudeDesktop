// code-block Lr: a growing plain fence commits at most once per100ms.
// Completion is immediate; latest input replaces the pending value without
// moving the deadline. This owns display text only, never source/copy bytes.
export function createPlainCodeScheduler({initialText='',onCommit,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}) {
 let displayed=initialText,lastCommit=0,timer=null,generation=0,disposed=false;
 function clear(){generation++;if(timer!==null){cancel(timer);timer=null;}}
 function commit(text,at){if(text===displayed)return;displayed=text;lastCommit=at;onCommit(text);}
 return {
  update(text,growing){
   if(disposed)return;
   clear();
   if(text===displayed)return;
   if(!growing){commit(text,0);return;}
   const delay=100-(now()-lastCommit);
   if(delay<=0){commit(text,now());return;}
   const owner=generation;
   timer=schedule(()=>{if(disposed||owner!==generation)return;timer=null;commit(text,now());},delay);
  },
  dispose(){if(disposed)return;disposed=true;clear();},
 };
}
