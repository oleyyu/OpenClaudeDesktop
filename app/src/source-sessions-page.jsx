import React,{createContext,useContext,useEffect,useId,useMemo,useRef,useState} from 'react';
import {useSessionsPageLoadHold} from './generated/code-current/sessions-page-load-hold.mjs';
import {SessionsPageView} from './generated/code-current/sessions-page-view.mjs';
import {SessionsPageTabs} from './generated/code-current/sessions-page-tabs.mjs';
import {SessionsPageCountText} from './generated/code-current/sessions-page-count-text.mjs';
import {SessionsPageEmpty} from './generated/code-current/sessions-page-empty.mjs';
import {sessionsPageSearchProps} from './generated/code-current/sessions-page-search.mjs';
import {SessionsPageRow} from './generated/code-current/sessions-page-row.mjs';
import {sessionsPageBulkMenuEnabled} from './generated/code-current/sessions-page-bulk-actions.mjs';
import {useStartIntl} from './source-code-start-adapters.jsx';
import {useSessionsSelection,SessionsMoreButton,SessionsActionsRail} from './source-sessions-primitives.jsx';
import {sessionPageRows,sessionPageHref,sessionIdFromPageHref} from './sessions-page-model.mjs';
import {menuTriggerProps} from './source-menu.jsx';
const keyboardEntry=event=>event?.detail===0?'first':undefined;
import {readSessionsPageSearch,rememberSessionsPageSearch} from './sessions-page-search-state.mjs';
import './source-sessions-page.css';

const PageNavigation=createContext(null),empty=[];
export function SessionsPageLink({href,onClick,...props}) {
  const onOpen=useContext(PageNavigation);
  return <a {...props} href={href} data-primary onClick={event=>{
    onClick?.(event);if(event.defaultPrevented)return;
    const id=sessionIdFromPageHref(href);if(id!==null){event.preventDefault();onOpen?.(id,event);}
  }}/>;
}
// 2.42304.0 cbd6c85c8 Sd → gd({codeScoped: true}): t (codeScoped) and x (text-first rows) hold, so only the
// Code/Archived tabs, the Code rows and the host row menu are reachable. historyKey is the history entry's key
// (TanStack __TSR_key) and scopeKey the local engine (orgUuid) for the remembered search (ed/td, cov11-02).
// engine is boot.core: its btwChildSessions capability is nested_less_side_chats (rows pass shared-11 pb).
export function SourceSessionsPage({sessions=[],state={},metadata={},repoIdentities={},loading=false,engine,
  initialSurface='code',scopeKey='code',historyKey=null,onSurfaceChange,onOpen,onNew,onSessionMenu,menuSessionId,loadFailed=false}) {
  const intl=useStartIntl(),tabsId=useId(),panelId=`${tabsId}-panel`;
  const [surface,setSurface]=useState(initialSurface==='archived'?'archived':'code');
  // gd z/B: what this entry held when it was left; only Back/Forward to the same entry finds one.
  const [heldQuery,setHeldQuery]=useState(()=>readSessionsPageSearch(historyKey,scopeKey));
  const [sortBy,setSortBy]=useState(heldQuery?.sortBy??'type');
  const [input,setInput]=useState(heldQuery?.input??''),[query,setQuery]=useState(heldQuery?.input.trim()??'');
  useEffect(()=>rememberSessionsPageSearch(historyKey,input,sortBy,scopeKey),[historyKey,input,sortBy,scopeKey]);
  useEffect(()=>{const id=setTimeout(()=>setQuery(input.trim()),300);return ()=>clearTimeout(id);},[input]);
  const changeInput=value=>{setInput(value);if(!value.trim())setQuery('');};
  const rows=useMemo(()=>sessionPageRows(sessions,{surface,query,sortBy,state,metadata,repoIdentities,engine}),[sessions,surface,query,sortBy,state,metadata,repoIdentities,engine]);
  const hold=useSessionsPageLoadHold({pending:loading,errored:loadFailed,hasRows:rows.length>0});
  const displayed=hold.held?empty:rows;
  // gd Wt/Gt/J: Code rows are never selectable, so the original hook stays inactive (it still resets on a
  // surface change) and the Select button that would take its restored focus is never rendered.
  const selectable=useMemo(()=>displayed.filter(row=>row.ref.kind!=='code'),[displayed]);
  const selectButton=useRef(null);
  const selection=useSessionsSelection(selectable,row=>row.ref.id,surface,{restoreFocusRef:selectButton});
  if(heldQuery!==undefined&&selection.isActive)setHeldQuery(undefined);
  // gd Jt: the GrowthBook bulk menu gate (closed without GrowthBook); with it closed gd has no selection
  // status (fr), so tabsStatus/selectionLead/selectionHiddenClass stay undefined.
  const bulkMenu=sessionsPageBulkMenuEnabled(selection.isActive);
  // gd bn/xn/wn: the selected chat and cowork rows among the shown rows (Mt by getRowKey). Code rows are never selectable,
  // so this is 0 on the Code page; lr is gd's "{count} selected" label, shown by the tabs while a selection is active.
  const selectedCount=useMemo(()=>{
    if(selection.selectedKeys.length===0)return 0;
    const byKey=new Map(displayed.map(row=>[row.ref.id,row]));
    return selection.selectedKeys.filter(key=>{const kind=byKey.get(key)?.ref.kind;return kind==='chat'||kind==='cowork';}).length;
  },[selection.selectedKeys,displayed]);
  const countText=SessionsPageCountText({selectedCount});
  const sortItems=[['type','Type','+U6ozcnv4r'],['date','Date','P7PLVjLe4f']].map(([value,label,id])=>({label:intl.formatMessage({defaultMessage:label,id}),checked:sortBy===value,checkedRole:'radio',onSelect:()=>setSortBy(value)}));
  // gd A/j: the tab sets the page surface, then replaces the history entry (Ru; "all" is the Code default).
  const tabs=SessionsPageTabs({surface,onSurface:setSurface,replaceSurface:value=>onSurfaceChange?.(value==='all'?'code':value),intl,tabsId,panelId,
    filterLabel:intl.formatMessage({defaultMessage:'Filter by',id:'/lwQDxsM2S'}),selection,bulkMenu,countText});
  // gd: `J.isActive || (br = {...})`.
  const search=selection.isActive?undefined:sessionsPageSearchProps({value:input,onChange:changeInput,intl,sortItems,sortBy,hasQuery:!!query,heldQuery});
  const renderActions=row=>onSessionMenu?<SessionsActionsRail><SessionsMoreButton
    aria-label={intl.formatMessage({defaultMessage:'More options for {chatName}',id:'ukZKEVU02W'},{chatName:row.title||intl.formatMessage({defaultMessage:'Untitled',id:'3kbIhS7KZS'})})}
    {...menuTriggerProps({open:menuSessionId===row.ref.id,onOpen:(entry,event)=>onSessionMenu(row.hostSession,event.currentTarget,entry)})}
    onClick={event=>onSessionMenu(row.hostSession,event.currentTarget,keyboardEntry(event))}/></SessionsActionsRail>:null;
  // gd Zn: showArchivedBadge is `fe && Yi(e)` with fe = U && L === "all" && !x, never true on the Code page.
  return <PageNavigation value={onOpen}><div className="source-sessions-page" onClick={event=>{
    if(event.defaultPrevented)return;
    if(event.target.closest?.('a[href="#new"]')){event.preventDefault();onNew?.();}
  }}>
    <SessionsPageView tabs={tabs} search={search} loading={loading||hold.held} surface={surface} newHref="#new" panelId={panelId} tabsId={tabsId}
      hasQuery={!!query} rows={displayed} getRowKey={row=>row.ref.id} getRowHref={row=>sessionPageHref(row.ref.id)}
      getRowLabel={row=>row.title||intl.formatMessage({defaultMessage:'Untitled',id:'3kbIhS7KZS'})} selection={selection}
      bulkMenu={bulkMenu} selectableRows={selectable} selectButtonRef={selectButton} countText={countText} selectedCount={selectedCount}
      renderContent={row=><SessionsPageRow session={row} lowerQuery={query.toLowerCase()} showArchivedBadge={false} textFirstRows/>}
      renderActions={renderActions} linkComponent={SessionsPageLink} emptyState={<SessionsPageEmpty query={query} surface={surface}/>} intl={intl}/>
  </div></PageNavigation>;
}
