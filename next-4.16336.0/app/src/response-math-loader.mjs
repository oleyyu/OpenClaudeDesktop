// Shared lazy resource, matching shared-16 Gw/Jw's demand-driven retry policy.
// No timer retries: the next eligible consumer may retry after the cooldown.
export function createResponseMathLoader({loadEngine,loadStyles,now=Date.now,events}) {
  const pendingState=Object.freeze({status:'pending',katex:null});
  const failedState=Object.freeze({status:'failed',katex:null});
  const listeners=new Set();
  let ready=null,promise=null,failures=0,failed=false,failedAt=0,preloadFailed=false,listening=false;
  const canRetry=()=>!preloadFailed && failures<3;
  const snapshot=()=>ready || (failed && !canRetry()?failedState:pendingState);
  const publish=()=>{for(const listener of listeners)listener();};
  function preloadError(){const before=snapshot();preloadFailed=true;if(before!==snapshot())publish();}
  function ensure(){
    if(!listening && events){events.addEventListener('vite:preloadError',preloadError);listening=true;}
    if(failed && canRetry() && now()-failedAt>=10000){promise=null;failed=false;}
    if(!promise){
      // Stylesheet failure is independent of the renderer's readiness, as in Gw.
      // Wrapping also turns synchronous loader errors into observed rejections.
      promise=Promise.all([
        Promise.resolve().then(loadEngine),
        Promise.resolve().then(loadStyles).catch(()=>undefined),
      ]).then(([katex])=>{
        failures=0;ready=Object.freeze({status:'ready',katex});publish();return ready;
      },error=>{
        const before=snapshot();failed=true;failures++;failedAt=now();if(before!==snapshot())publish();throw error;
      });
    }
    return promise;
  }
  return {ensure,getSnapshot:snapshot,getDisabledSnapshot:()=>pendingState,
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  };
}
