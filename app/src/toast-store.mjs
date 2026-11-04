import {cleanErrorReason} from './action-error-model.mjs';
export function toastDuration(variant='neutral',timeout) {
  if(timeout===undefined)return variant==='neutral'?6500:10000;
  if(!Number.isFinite(timeout)||timeout<=0)return 0;
  return Math.max(6000,timeout);
}
const TOAST_VARIANTS=new Set(['neutral','warning','danger']);
// shared-19 mV add({title, description, action}) / aV: a secondary description under the title and an action slot. The
// action is {label, onClick} (the slot's sm secondary button); a toast that carries one never expires (aV: d ? 0).
const toastDescription=value=>typeof value==='string'&&value.trim()?value:undefined;
const toastAction=value=>value&&typeof value==='object'&&typeof value.label==='string'&&value.label&&typeof value.onClick==='function'?{label:value.label,onClick:value.onClick}:undefined;
export function createToastStore({now=()=>Date.now(),schedule=setTimeout,cancel=clearTimeout,exitDuration=200}={}) {
  let snapshot=[],sequence=0,disposed=false;
  const listeners=new Set(),records=new Map(),paused=new Set();
  const publish=()=>{snapshot=[...snapshot];for(const listener of listeners)listener();};
  const stop=record=>{if(record.timer!==null){cancel(record.timer);record.timer=null;record.remaining=Math.max(0,record.deadline-now());}};
  const arm=record=>{if(disposed||paused.size||!record.expiring)return;record.deadline=now()+record.remaining;record.timer=schedule(()=>close(record.id),record.remaining);};
  function close(id) {
    const entry=snapshot.find(entry=>entry.id===id),record=records.get(id);
    if(!entry||entry.phase==='ending')return;
    stop(record);snapshot=snapshot.map(entry=>entry.id===id?{...entry,phase:'ending'}:entry);publish();
    if(disposed)return;
    record.exit=schedule(()=>{records.delete(id);snapshot=snapshot.filter(entry=>entry.id!==id);publish();},exitDuration);
  }
  return {
    getSnapshot:()=>snapshot,
    subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
    // key (the source toast API's uniqueKey, cc43287c9-BMbiZYzF.js:33860-33877 'epitaxy-plan-command-notice'):
    // a live toast with the same key takes the new text and variant in place and restarts its timer, so
    // on/off variants of one notice share a slot instead of stacking.
    // add(message, options) or add({title, description, action, ...options}): the message string is the title.
    add(message,options={}){
      if(message&&typeof message==='object'){options={...message,...options};message=message.title;}
      const {variant:requested='neutral',timeout,dedupe=true,key}=options;
      if(disposed||typeof message!=='string'||!message)return null;
      // shared-21 HA/UA/WA/GA: exactly neutral, warning and danger; the shared-25 bridge folds 'info' (and any other
      // name) into neutral, so an unknown variant never borrows the warning icon.
      const variant=TOAST_VARIANTS.has(requested)?requested:'neutral';
      // A caught desktop:call rejection's message never shows Electron's IPC transport wrapper.
      message=cleanErrorReason(message);
      if(!message)return null;
      const description=toastDescription(options.description),action=toastAction(options.action);
      const duration=action?0:toastDuration(variant,timeout);
      const keyed=typeof key==='string'&&key?snapshot.find(entry=>entry.key===key&&entry.phase!=='ending'):null;
      if(keyed){
        const record=records.get(keyed.id);stop(record);record.remaining=duration;record.expiring=duration>0;
        snapshot=snapshot.map(entry=>entry.id===keyed.id?{...entry,message,variant,count:1,description,action}:entry);publish();arm(record);return keyed.id;
      }
      const existing=dedupe&&!key?snapshot.find(entry=>entry.message===message&&entry.description===description&&!entry.key&&entry.phase!=='ending'):null;
      if(existing){
        // mV dedupe: the newer action wins, and a toast that has one keeps never expiring.
        const kept=action??existing.action,record=records.get(existing.id),next=kept?0:duration;stop(record);record.remaining=next;record.expiring=next>0;
        snapshot=snapshot.map(entry=>entry.id===existing.id?{...entry,count:entry.count+1,action:kept}:entry);publish();arm(record);return existing.id;
      }
      const id=++sequence,record={id,remaining:duration,expiring:duration>0,timer:null,exit:null,deadline:0};records.set(id,record);
      snapshot=[{id,message,variant,count:1,phase:'starting',...(description?{description}:{}),...(action?{action}:{}),...(typeof key==='string'&&key?{key}:{})},...snapshot];publish();arm(record);return id;
    },
    settle(id){if(disposed)return;snapshot=snapshot.map(entry=>entry.id===id&&entry.phase==='starting'?{...entry,phase:'open'}:entry);publish();},
    close,
    pause(reason){if(disposed||paused.has(reason))return;if(!paused.size)for(const record of records.values())stop(record);paused.add(reason);},
    resume(reason){if(disposed||!paused.delete(reason)||paused.size)return;for(const entry of snapshot)if(entry.phase!=='ending')arm(records.get(entry.id));},
    dispose(){disposed=true;for(const record of records.values()){stop(record);if(record.exit!==null)cancel(record.exit);}records.clear();listeners.clear();snapshot=[];},
  };
}

// git-layout-shared.js:12302-12440 (FN/kN/AN, tN 96): a registered safe region — here the composer zone,
// [data-toast-safe-region] — that overlaps the toast region horizontally lifts it: --toast-clearance is the
// region's distance from the viewport bottom (innerHeight - top), capped at innerHeight - 96, and the scope's
// bottom offset is max(…, --toast-clearance) + 16px. Zero-size and disjoint regions do not count.
// W14-code r5-composer-02 (shared-26-CGuBxVt9.js OP `rP.has(i) && window.innerHeight - a.bottom > eP`, eP = 200;
// PP `t.nearWindowBottomOnly && rP.add(e)`): a region registered nearWindowBottomOnly — the Code dock column,
// cc43287c9 `Ds(e, {nearWindowBottomOnly: !0})`, here [data-toast-safe-region="near-bottom"] — only lifts the toast
// while its bottom edge is within 200px of the window bottom (a Code new-session composer mid-window does not).
export const TOAST_CLEARANCE_FLOOR=96;
export const TOAST_NEAR_BOTTOM_LIMIT=200;
export function toastClearance(scopeRect,regionRects,innerHeight){
  let clearance=0;
  for(const rect of regionRects){if(!rect||rect.width===0||rect.height===0||rect.right<=scopeRect.left||rect.left>=scopeRect.right)continue;
    if(rect.nearWindowBottomOnly&&innerHeight-(rect.bottom??rect.top+rect.height)>TOAST_NEAR_BOTTOM_LIMIT)continue;
    const lift=innerHeight-rect.top;if(lift>0)clearance=Math.max(clearance,lift);}
  return Math.min(clearance,Math.max(0,innerHeight-TOAST_CLEARANCE_FLOOR));
}
