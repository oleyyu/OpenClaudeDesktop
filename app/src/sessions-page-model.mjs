import {sessionUpdatedAt,timestampMs,sessionArchived} from './sidebar-model.js';
import {currentSidebarSession} from './sidebar-session-current-model.mjs';
import {isSessionArchived,sortSessionPageRows,isListedSession} from './generated/code-current/sessions-page-model.mjs';
import {parentTabChildIds,listedSessionFields} from './nested-less-side-chats.mjs';

// inParentTabs: shared-11 _g's su set (nested-less-side-chats.mjs), carried on the row as shownInParentTabs for pb.
export function sessionPageRecord(session,{state={},metadata={},repoIdentities={},inParentTabs}={}) {
  const meta=metadata[session.id]??{},view=currentSidebarSession(session,state,meta,{showPrStatus:false});
  const identity=repoIdentities[session.cwd];
  return {ref:{kind:'code',id:session.id},title:session.name?.trim()||session.title?.trim()||null,
    updatedAtMs:sessionUpdatedAt(session),createdAtMs:timestampMs(session.createdAt??session.createdAtMs),
    liveStatus:view.mark==='awaiting'?'awaiting':view.mark==='running'?'running':'idle',
    hasError:view.mark==='error',hasCompleted:view.unread,isUnread:view.unread,isStarred:!!meta.pinned,
    source:{kind:'code',data:{...session,...listedSessionFields(session,metadata,inParentTabs),isArchived:sessionArchived(session),errorCategory:view.errorCategory,
      repoInfo:session.repoInfo??(identity?.isRepo?{owner:identity.owner,name:identity.name}:undefined)}},
    hostSession:session};
}
// engine: boot.core; its btwChildSessions capability turns on nested_less_side_chats (shared-11 Nu).
export function sessionPageRows(sessions,{surface='code',query='',sortBy='type',engine,...context}={}) {
  const seen=new Set(),lower=query.trim().toLowerCase();
  const unique=sessions.filter(session=>session?.id&&!seen.has(session.id)&&seen.add(session.id));
  // R3-nested NBS-3: gd lists a Code row only when ra(e.source.data) (shared-11 pb) holds, before the surface filter.
  const inParentTabs=parentTabChildIds(unique,context.metadata,engine);
  const rows=unique.map(session=>sessionPageRecord(session,{...context,inParentTabs})).filter(row=>isListedSession(row.source.data))
    .filter(row=>isSessionArchived(row)===(surface==='archived')&&(!lower||(row.title??'').toLowerCase().includes(lower)));
  return sortSessionPageRows(rows,!!lower&&sortBy==='type');
}
export const sessionPageHref=id=>`#code-session/${encodeURIComponent(id)}`;
export function sessionIdFromPageHref(href) {
  if(typeof href!=='string'||!href.startsWith('#code-session/'))return null;
  try{return decodeURIComponent(href.slice('#code-session/'.length));}catch{return null;}
}
