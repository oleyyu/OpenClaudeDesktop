// Epitaxy's active Ml/Dl path: wordWave=false, holdBack=false,
// holdBlockMarkers=true. Full inline/math holdBack parsing is a separate path.
export const RESPONSE_PACING = Object.freeze({stepChars:22,targetLagMs:550,minStepMs:25,maxStepMs:150,joinAboveChars:400,rejoinAboveChars:600});
const listPrefix = /^[ \t]*(?:>[ \t]*)*(?:(?:[-*+]|\d{1,9}[.)]?)$|(?:[-*+]|\d{1,9}[.)])[ \t]+(?:\[(?:[ xX](?:\][ \t]*)?)?)?$)/;
const headingPrefix = /^ {0,3}(?:>[ \t]*)*#{1,6}[ \t]*$/;
export function pacingBoundary(text, offset) {
  const at=Math.max(0,Math.min(text.length,offset));
  return at>0 && (text.charCodeAt(at)&0xfc00)===0xdc00 ? at-1 : at;
}
function markerStart(text, end) {
  if (!end) return -1;
  const start=text.lastIndexOf('\n',end-1)+1;
  if (start===end) return -1;
  const tail=text.slice(start,end);
  return listPrefix.test(tail)||headingPrefix.test(tail)?start:-1;
}
export function pacingCeiling(text) {
  const marker=markerStart(text,text.length);
  return pacingBoundary(text,marker<0?text.length:marker);
}
function wordStep(text, from, ceiling) {
  const end=Math.min(from+RESPONSE_PACING.stepChars,ceiling);
  if(end<ceiling){const space=text.lastIndexOf(' ',end);if(space>from+RESPONSE_PACING.stepChars/2)return space+1;}
  return pacingBoundary(text,end);
}
export function nextPacingBoundary(text, from, ceiling=pacingCeiling(text)) {
  let next=wordStep(text,from,ceiling);
  for(let marker=markerStart(text,next);marker>=0;marker=markerStart(text,next)){
    if(marker>from)return marker;
    if(next>=ceiling)return ceiling;
    const step=wordStep(text,next,ceiling);
    if(step<=next)return ceiling;
    next=step;
  }
  return next;
}
export function remapPacingOffset(before, after, visible) {
  let prefix=0,suffix=0;
  const common=Math.min(before.length,after.length);
  while(prefix<common&&before[prefix]===after[prefix])prefix++;
  while(suffix<common-prefix&&before[before.length-1-suffix]===after[after.length-1-suffix])suffix++;
  let next=visible;
  if(visible>prefix&&visible>=before.length-suffix)next+=after.length-before.length;
  return pacingBoundary(after,next);
}
export function updatePacing(state, text, enabled, now=0) {
  const first=/\S/.exec(text)?.index??-1;
  if(!enabled)return {text,enabled:false,visible:text.length,ceiling:text.length,shown:state.shown||first>=0,lastStep:now};
  const ceiling=pacingCeiling(text), wasEnabled=state.enabled;
  let visible=wasEnabled?state.visible:0;
  if(wasEnabled&&!text.startsWith(state.text.slice(0,visible)))visible=remapPacingOffset(state.text,text,visible);
  visible=Math.min(visible,ceiling);
  if(visible>0&&ceiling-visible>RESPONSE_PACING.rejoinAboveChars)visible=ceiling;
  if(visible===0&&first>=0&&first<ceiling){
    visible=state.shown||ceiling>RESPONSE_PACING.joinAboveChars?ceiling:nextPacingBoundary(text,first,ceiling);
  }
  return {text,enabled:true,visible,ceiling,shown:state.shown||/\S/.test(text.slice(0,visible)),
    lastStep:!wasEnabled||state.visible>=state.ceiling||visible===ceiling?now:state.lastStep};
}
export function createPacingState(text='',enabled=false,now=0){
  return updatePacing({text:'',enabled:false,visible:0,ceiling:0,shown:false,lastStep:now},text,enabled,now);
}
export function pacingDelay(state,now) {
  const lag=state.ceiling-state.visible;
  if(!state.enabled||lag<=0||!state.visible||!(/\S/.test(state.text.slice(0,state.ceiling))))return null;
  const interval=Math.max(RESPONSE_PACING.minStepMs,Math.min(RESPONSE_PACING.maxStepMs,RESPONSE_PACING.targetLagMs*RESPONSE_PACING.stepChars/lag));
  return Math.max(0,Math.ceil(interval-(now-state.lastStep)));
}
export function tickPacing(state,now) {
  if(pacingDelay(state,now)!==0)return state;
  const visible=nextPacingBoundary(state.text,state.visible,state.ceiling);
  return visible>state.visible?{...state,visible,lastStep:now}:state;
}
export function resumePacing(state,now) {
  return state.enabled&&state.visible<state.ceiling?{...state,visible:state.ceiling,lastStep:now,shown:state.shown||/\S/.test(state.text.slice(0,state.ceiling))}:state;
}
export const pacedText=state=>state.enabled?state.text.slice(0,state.visible):state.text;
