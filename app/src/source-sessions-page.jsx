import React,{createContext,useCallback,useContext,useMemo,useState} from 'react';
// R6: view-tabs through its facade, by semantic name (this page is not in the chat / composer / menu graph, E41).
import {SessionsActionsRail,SessionsMoreButton} from './generated/view-tabs/index.js';
// 3.6556.2 cbd6c85c8 Hf, the whole Sessions page (src/generated/sessions-page, re-exported by code-current).
import {SessionsPageView} from './generated/code-current/sessions-page-view.mjs';
import {SessionsPageHfHost} from './source-sessions-page-hf-adapters.jsx';
import {useStartIntl} from './source-code-start-adapters.jsx';
import {sessionPageRecords,sessionPageHref,sessionIdFromPageHref} from './sessions-page-model.mjs';
import {sessionsPagePathname,sessionsPageSearch,sessionsPageSurfaceFromHref,mirrorSessionsPageHistoryKey} from './sessions-page-navigation.mjs';
import {menuTriggerProps} from './source-menu.jsx';
import './source-sessions-page.css';

const keyboardEntry=event=>event?.detail===0?'first':undefined;
const PageNavigation=createContext(null),PageMenu=createContext(null);
// Hf's primary action is a CDS Button link to the Code start route (shared-52 Jx: shared-25 Qa "/code", or $a
// "/epitaxy"; "/new" off the Code page). The local app opens a new session instead of navigating the window.
const NEW_SESSION_HREFS=new Set(['/code','/epitaxy','/new']);
// The router link Hf renders for each row (shared-25 Cx through cbd6c85c8 Bf, `data-primary`): a local session link
// opens that session.
export function SessionsPageLink({href,onClick,...props}) {
  const onOpen=useContext(PageNavigation);
  return <a {...props} href={href} data-primary onClick={event=>{
    onClick?.(event);if(event.defaultPrevented)return;
    const id=sessionIdFromPageHref(href);if(id!==null){event.preventDefault();onOpen?.(id,event);}
  }}/>;
}
// codeRowLinkComponent (cbd6c85c8 Qu on the desktop): Hf hands it `{ item, link }`, item the Code session data
// (`source.data`), link its router link; Qu makes the row's link the session's context-menu trigger. The local menu is
// the host session menu, anchored to the row link.
export function SessionsPageCodeRowLink({item,link}) {
  const openMenu=useContext(PageMenu);
  return <span className="contents" onContextMenu={openMenu?event=>{
    event.preventDefault();openMenu(item.id,event.target?.closest?.('a')??event.currentTarget);
  }:undefined}>{link}</span>;
}
// 3.6556.2 gp → Hf({codeScoped: true, renderCodeRowActions: hp, codeRowLinkComponent}). Hf lists, filters, searches,
// sorts and holds the rows itself (Code branch: surfaces code / archived, text-first rows, no selectable rows, je false
// so no load banner, "Sessions loaded." or "Searching…"). The host supplies what the official page reads from its stores
// through SessionsPageHfHost: the merged list (only local Code sessions; their loading feeds Hf's load hold and the
// table's isLoading, E20), the route (surface search parameter, router.replace on a tab change), the history entry
// key for the remembered search (cov11-02; scoped by the local engine, as Hf scopes by orgUuid) and the row link.
// engine is boot.core: its btwChildSessions capability is nested_less_side_chats (rows pass shared-11 pw).
export function SourceSessionsPage({sessions=[],state={},metadata={},repoIdentities={},loading=false,engine,
  initialSurface='code',scopeKey='code',historyKey=null,onSurfaceChange,onOpen,onNew,onSessionMenu,menuSessionId,loadFailed=false}) {
  const intl=useStartIntl();
  const [surface,setSurface]=useState(initialSurface==='archived'?'archived':'code');
  const records=useMemo(()=>sessionPageRecords(sessions,{state,metadata,repoIdentities,engine}),[sessions,state,metadata,repoIdentities,engine]);
  const byId=useMemo(()=>new Map(records.map(row=>[row.ref.id,row.hostSession])),[records]);
  const entryKey=historyKey==null?null:`${scopeKey}\u0000${historyKey}`;
  mirrorSessionsPageHistoryKey(entryKey);
  const router=useMemo(()=>({
    push:href=>{if(NEW_SESSION_HREFS.has(href))onNew?.();},
    replace:href=>{const next=sessionsPageSurfaceFromHref(href);setSurface(next);onSurfaceChange?.(next);},
    back(){},forward(){},refresh(){},prefetch(){},
  }),[onNew,onSurfaceChange]);
  const list=useMemo(()=>({sessions:records,isInitialLoading:loading,isCodeLoading:loading,isCodeLoadError:loadFailed}),[records,loading,loadFailed]);
  const host=useMemo(()=>({list,router,search:sessionsPageSearch(surface),pathname:sessionsPagePathname,historyKey:entryKey,
    getRowHref:ref=>sessionPageHref(ref.id),linkComponent:SessionsPageLink}),[list,router,surface,entryKey]);
  const openRowMenu=useCallback((id,anchor,entry)=>{const session=byId.get(id);if(session)onSessionMenu?.(session,anchor,entry);},[byId,onSessionMenu]);
  // hp → Xu: the row's actions rail with its "More options for {chatName}" menu trigger (the host session menu).
  const renderCodeRowActions=useCallback(data=>{
    if(!onSessionMenu||!byId.has(data.id))return null;
    const title=data.name?.trim()||data.title?.trim()||intl.formatMessage({defaultMessage:'Untitled',id:'3kbIhS7KZS'});
    return <SessionsActionsRail><SessionsMoreButton aria-label={intl.formatMessage({defaultMessage:'More options for {chatName}',id:'ukZKEVU02W'},{chatName:title})}
      {...menuTriggerProps({open:menuSessionId===data.id,onOpen:(entry,event)=>openRowMenu(data.id,event.currentTarget,entry)})}
      onClick={event=>openRowMenu(data.id,event.currentTarget,keyboardEntry(event))}/></SessionsActionsRail>;
  },[byId,intl,menuSessionId,onSessionMenu,openRowMenu]);
  return <PageNavigation value={onOpen}><PageMenu value={onSessionMenu?openRowMenu:null}><div className="source-sessions-page" onClick={event=>{
    if(event.defaultPrevented)return;
    const anchor=event.target?.closest?.('a[href]');
    if(anchor&&NEW_SESSION_HREFS.has(anchor.getAttribute('href'))){event.preventDefault();onNew?.();}
  }}>
    <SessionsPageHfHost.Provider value={host}>
      <SessionsPageView codeScoped reportsRecentsLoad={false} renderCodeRowActions={renderCodeRowActions} codeRowLinkComponent={SessionsPageCodeRowLink}/>
    </SessionsPageHfHost.Provider>
  </div></PageMenu></PageNavigation>;
}
