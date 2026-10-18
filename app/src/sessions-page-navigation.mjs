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
