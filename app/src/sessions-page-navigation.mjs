// Local equivalent of /sessions and its replace-only ?surface=archived filter.
// TanStack history gives every committed entry its own key (vendor-router Ot:
// `{...state, key: n, __TSR_key: n}` with a fresh Nt() for push and replace
// alike); cbd6c85c8 ed/td key the remembered search by it (cov11-02).
let routeSeq=0;
const historyEntryKey=()=>globalThis.crypto?.randomUUID?.()??`sessions-${Date.now().toString(36)}-${(++routeSeq).toString(36)}`;
export const sessionsPageRoute=surface=>({page:'sessions',surface:surface==='archived'?'archived':'code',key:historyEntryKey()});
export const isSessionsPageRoute=entry=>entry?.page==='sessions'&&(entry.surface==='code'||entry.surface==='archived');
// gd Ru: a tab change replaces the current entry (router.replace), which
// commits a new entry key exactly like TanStack's replace.
export function replaceSessionsPageSurface(history,index,surface) {
  if(!isSessionsPageRoute(history[index]))return history;
  return history.map((entry,at)=>at===index?sessionsPageRoute(surface):entry);
}
// 3.6556.2 Hf reads the page surface from the route's search (cbd6c85c8 ef: `Qd = "surface"`, `$d(e.get(Qd))`) and a
// tab change replaces the route with it (nf: `e.replace(\`${t}${a ? `?${a}` : ""}\`)`, "all" drops the parameter).
// The Code page offers code / archived only (`oe.includes(F) ? F : P`).
export const sessionsPagePathname='/sessions';
export const sessionsPageSearch=surface=>surface==='archived'?'surface=archived':'';
export function sessionsPageSurfaceFromHref(href) {
  const query=typeof href==='string'&&href.includes('?')?href.slice(href.indexOf('?')+1):'';
  return new URLSearchParams(query).get('surface')==='archived'?'archived':'code';
}
// Hf keeps the remembered search in its own window-wide Map keyed by the shown history entry (cbd6c85c8 Tf / Ef), and
// reads that entry's key from window.history.state.__TSR_key (shared-5 zk), where TanStack's history keeps it. The
// app's history is its own entry list, so the shown Sessions entry mirrors its key there (replaceState: same URL, no
// navigation); without a key the mirror is removed, so no other entry's search comes back.
export function mirrorSessionsPageHistoryKey(key,win=globalThis.window) {
  const history=win?.history;
  if(!history||typeof history.replaceState!=='function')return;
  const state=history.state&&typeof history.state==='object'?history.state:{};
  if(key==null?!('__TSR_key' in state):state.__TSR_key===key)return;
  const {__TSR_key:_previous,...rest}=state;
  history.replaceState(key==null?rest:{...rest,__TSR_key:key},'');
}
