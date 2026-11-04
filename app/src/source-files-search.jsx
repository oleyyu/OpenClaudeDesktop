import {fileSearchFocus} from "./file-search-focus.mjs";
import {createFileTreeSelection,selectFileRange,selectAllFiles} from "./file-tree-selection.mjs";
import {useBlankTreeSelection} from "./use-blank-tree-selection.jsx";
import { fileMenuSelection, fileCopyChoices } from "./file-context-menu-model.mjs";
import { useFileGone, inMultiSelection, openWhenChecked } from "./file-gone-menu.mjs";
import { SourceMenu } from "./source-menu.jsx";
import { SourceFileMenuEntries } from "./source-file-menu-entries.jsx";
import { CONTEXT_MENU_ALIGN_OFFSET, CONTEXT_MENU_SIDE_OFFSET } from "./menu-model.mjs";
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, useImperativeHandle } from "react";
// R3-files FT-18 (files-26): Escape on a multi-selection of the results is c856385e2 nt, as on the tree (official Nx binds
// it to the one tree element that also holds the search results).
import { useMultiSelectionEscape } from "./generated/files-changes/file-selection-escape.mjs";
import {SourceFileSearchOptions} from './source-file-viewer.jsx';
import {contentResults,contentPreview} from './file-content-results.mjs';
import {DEFAULT_SEARCH_OPTIONS} from './file-find-model.mjs';
import { CdsButton, CdsIcon, CdsSpinner, CdsTextInput } from "./generated/view-tabs/index.js";
import { SessionsHighlight } from "./generated/view-tabs/c1ea8a271-CHvO08g4.js";
import { FileTypeIcon } from "./generated/files-changes/file-type-icon.mjs";
import { LitText } from "./generated/files-changes/path-segments.mjs";
import { fileTreeRowClassName, fileTreeRowPrimary, fileTreeIconClassName, fileTreeIconSize } from "./file-tree-row-model.mjs";
import { treeIndent } from "./generated/code-current/file-tree-style.mjs";
import { createFileSearchController, emptySearchState, isPlainSearchKey,
  resultNavigation, searchLimitMessage } from "./files-search-model.mjs";
import "./source-files-search.css";
import { t, tn } from "../electron/i18n/index.mjs";

const desktopCall = (action, params) => window.desktop?.call(action, params) ??
  Promise.reject(new Error(t("Open OpenClaude Desktop to search local filenames.")));

// r8pa-01: 3.6556.2 cccc2cf0a BT (a content match under zT): the line number k, then N, the ltr snippet of lead (rtl
// clipped from the start) / hit / tail, the hit and tail through c1ea8a271 gl (variant mark: bg-accent marks).
const CONTENT_LINE_CLASS = "shrink-0 min-w-[2.5ch] text-footnote text-muted-as-secondary tabular-nums text-end";
// zT's "More matches in this file." row, at el(1) with a 2.5ch spacer under the line numbers.
const CONTENT_MORE_CLASS = "flex items-center gap-1 h-control app-list-row pe-md text-footnote text-muted-as-secondary select-none";
// zT keys the "more" row's id by its file group (`${w}-${t}`), and RT's describedBy points the file row at it.
const groupHasMore = (rows, index) => { for (let i = index + 1; i < rows.length && rows[i].line; i++) if (rows[i].more) return true; return false; };
const groupHeaderIndex = (rows, index) => { for (let i = index; i >= 0; i--) if (!rows[i].line) return i; return index; };
export function ContentSnippet({entry}){
 const parts=contentPreview(entry);
 return <><span className={CONTENT_LINE_CLASS}>{entry.line}</span><span dir="ltr" className="flex min-w-0 overflow-hidden whitespace-pre text-code text-primary">
  {parts.lead&&<span dir="rtl" className="min-w-0 overflow-hidden text-ellipsis"><span dir="ltr">{parts.lead}</span></span>}
  {parts.hit&&<span className="max-w-full shrink-0 overflow-hidden text-ellipsis"><SessionsHighlight text={parts.hit} matches={parts.hitMatches} /></span>}
  {parts.tail&&<span className="min-w-[2ch] shrink-[9999] overflow-hidden text-ellipsis"><SessionsHighlight text={parts.tail} matches={parts.tailMatches} /></span>}
 </span></>;
}

// 3.6556.2 cccc2cf0a WT (an empty or invalid note) and UT (the cap note, at the row indent el(0)).
const EMPTY_NOTE_CLASS = "flex items-center justify-center px-lg py-1 text-body text-muted-as-secondary";
const CAP_NOTE_CLASS = "py-1.5 pe-md text-footnote text-muted-as-secondary select-none";
const keepFocus = event => event.preventDefault();

/** Source adapter inside .source-files-tree, replacing its folder/Refresh
 * header. Existing tree/notices stay mounted as children while filtered.
 * onOpen is the FilePane.openFile authority for previews.
 * Main derives cwd+scope from sessionId, or validates the home folder selection
 * against its own saved/approved workspace roots.
 */
export function SourceFilesSearch({ sessionId = null, searchPane = "main", cwd, activePath, onOpen, onClear,
  fileMenu = null, onAskAbout = null, focusRef = null, children, enabled = true, refreshKey = 0, call = desktopCall,
  revealNonce, onRevealFolder = null, onEnterOpen = null }) {
  const [query, setQuery] = useState("");
  const [focusRange,setFocusRange]=useState(null);
  const [menu,setMenu]=useState(null);
  // R3-files FT-05: a right-click waits here for its row's "path gone" check before it becomes `menu`.
  const [menuRequest,setMenuRequest]=useState(null);

  const [state, setState] = useState(emptySearchState);
  const [options,setOptions]=useState(DEFAULT_SEARCH_OPTIONS);
  useEffect(()=>{setMenu(null);setMenuRequest(null);},[sessionId,cwd,query,options,enabled]);
  const content=query.trim().startsWith('?');
  const grouped=useMemo(()=>content?contentResults(state.matches):null,[content,state.matches]);
  const shownMatches=grouped?.rows??state.matches;
  // The reference browser owns one store across tree and filename modes.
  const selectionStore=useMemo(()=>createFileTreeSelection(),[sessionId,searchPane,cwd]);
  const selectionState=useSyncExternalStore(selectionStore.subscribe,selectionStore.getState,selectionStore.getState);
  const selected=selectionState.selected;
  const selectionEntries=useMemo(()=>shownMatches.map(entry=>({...entry,absPath:entry.path,relativePath:entry.path})),[shownMatches]);
  const selectionNav=useMemo(()=>({count:selectionEntries.length,entryAt:index=>selectionEntries[index],indexOfKey:key=>selectionEntries.findIndex(entry=>entry.path===key)}),[selectionEntries]);
  const blankSelection=useBlankTreeSelection(()=>selectionStore.getState().clear());
  const ids = useId();
  const input = useRef(null), results = useRef(null), keptTree = useRef(null);
  const [resultsElement, setResultsElement] = useState(null);
  const resultsRef = useCallback((node) => { results.current = node; setResultsElement(node); }, []);
  // Content results are not selectable (Nx clears the selection for "?" search), so only filename results bind it.
  useMultiSelectionEscape(content ? null : resultsElement, selectionStore);
  const controller = useRef(null), focused = useRef({ index: 0, path: null });
  const focusInResults = useRef(false), callbacks = useRef(null), currentQuery = useRef(query);
  const enabledNow = useRef(enabled), lastRefresh = useRef(refreshKey);
  callbacks.current = { call, onOpen, onClear, onRevealFolder };
  currentQuery.current = query;
  enabledNow.current = enabled;
  const hasQuery = query.trim().length > 0;
  const busy = state.phase === "debouncing" || state.phase === "loading";
  const stale = hasQuery && state.matchedQuery !== query.trim();
  const resultId = `${ids}-results`, treeId = `${ids}-tree`, hintId = `${ids}-hint`, limitId = `${ids}-limit`, invalidId = `${ids}-invalid`;
  const invalidPattern = state.error?.code === 'INVALID_PATTERN';

  useLayoutEffect(() => {
    const resource = createFileSearchController({ sessionId, pane: searchPane, workspaceRoot: cwd,
      search: request => callbacks.current.call(request.mode==='content'?"files:content-search":"files:search", request),
      cancel: request => callbacks.current.call("files:search:cancel", request),
      onState: setState,
      onActivate: entry => {
        if(!currentQuery.current.trim().startsWith('?'))selectionStore.getState().selectOnly({...entry,absPath:entry.path,relativePath:entry.path});
        if(entry.directory)openFolder(entry);else callbacks.current.onOpen(entry);
      },
      enabled: enabledNow.current && Boolean(cwd),
      options,
    });
    controller.current = resource;
    resource.setQuery(currentQuery.current);
    return () => { resource.dispose(); if (controller.current === resource) controller.current = null; };
  }, [sessionId, searchPane, cwd, selectionStore]);
  const toggleOption=key=>{const next={...options,[key]:!options[key]};setOptions(next);controller.current?.setOptions(next);};

  useLayoutEffect(() => {
    controller.current?.setEnabled(enabled && Boolean(cwd));
    if (!enabled) focusInResults.current = false;
  }, [enabled, sessionId, searchPane, cwd]);

  useLayoutEffect(() => {
    if (lastRefresh.current !== refreshKey) {
      lastRefresh.current = refreshKey;
      controller.current?.refresh();
    }
  }, [refreshKey]);

  useLayoutEffect(() => {
    // Wv retains against a mounted nonempty list; an empty/loading notice has no navigation list.
    if(hasQuery&&!content&&shownMatches.length)selectionStore.getState().retain(path=>selectionNav.indexOfKey(path)>=0);
    if (!enabled || !hasQuery || !focusInResults.current) return;
    const document = results.current?.ownerDocument;
    if (!document || (document.activeElement !== document.body && !results.current.contains(document.activeElement))) return;
    const old = focused.current;
    const pathIndex = shownMatches.findIndex(match => (match.key??match.path) === old.path);
    focusResult(pathIndex >= 0 ? pathIndex : Math.min(old.index, shownMatches.length - 1));
  }, [shownMatches, enabled, hasQuery, content, selectionNav, selectionStore]);
  useLayoutEffect(()=>{if(content)selectionStore.getState().clear();},[content,selectionStore]);

  useImperativeHandle(focusRef,()=>mode=>{
    const field=input.current;
    if(!field||field.disabled||field.closest('[hidden], [inert]'))return false;
    const next=fileSearchFocus(currentQuery.current,mode);
    change(next.value);setFocusRange(next);return true;
  });
  useLayoutEffect(()=>{
    if(!focusRange)return;
    input.current?.focus({preventScroll:true});
    input.current?.setSelectionRange(focusRange.start,focusRange.end);
    setFocusRange(null);
  },[focusRange]);

  function focusResult(index) {
    if (index < 0) { input.current?.focus(); return; }
    const row = results.current?.querySelectorAll("[data-tree-row]")[index];
    row?.focus();
    row?.scrollIntoView({ block: "nearest" });
  }
  function change(value) {
    const wasQuery = currentQuery.current.trim().length > 0;
    currentQuery.current = value;
    setQuery(value);
    controller.current?.setQuery(value);
    if (wasQuery && !value.trim()) callbacks.current.onClear?.(activePath);
  }
  function clear() {
    change("");
    input.current?.focus();
  }
  // B33 (cccc2cf0a Bv B/V :4237-4250): a folder row from a filter ending in '/' reveals that folder in the tree
  // (revealInFilesTree, which clears the filter); without a tree to reveal in, it drills the filter into it.
  function openFolder(entry) {
    if (callbacks.current.onRevealFolder) { callbacks.current.onRevealFolder(entry.path); return; }
    change(`${entry.path}/`);
    input.current?.focus();
  }
  // Bv kt (:4327-4332): an explicit reveal (not the follow of the open file) resets the filter to "" for a local
  // tree, without the clear's own follow (I, not te).
  const lastReveal = useRef(revealNonce);
  useLayoutEffect(() => {
    if (lastReveal.current === revealNonce) return;
    lastReveal.current = revealNonce;
    if (revealNonce === undefined || !currentQuery.current) return;
    currentQuery.current = "";
    setQuery("");
    controller.current?.setQuery("");
  }, [revealNonce]);
  function selectAt(index, event) {
    if(content)return;
    const entry = shownMatches[index];
    if (!entry) return;
    if (event.metaKey || event.ctrlKey) selectionStore.getState().toggle(selectionEntries[index]);
    else if (event.shiftKey) selectFileRange(selectionStore,selectionNav,index,index);
    else selectionStore.getState().selectOnly(selectionEntries[index]);
  }
  function activate(index, event, keep = false) {
    const entry = shownMatches[index];
    if (!entry) return;
    controller.current?.cancelEnter();
    setMenu(null);
    selectAt(index, event);
    if (content || !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
      if (entry.directory) openFolder(entry);
      else callbacks.current.onOpen(entry, { preview: !keep });
    }
  }
  function openResultMenu(event,entry,row=event.currentTarget) {
    if(!fileMenu)return;
    event.preventDefault();event.stopPropagation();controller.current?.cancelEnter();
    // R3-files FT-05 (cccc2cf0a NS `ue`): a filename row of a multi-selection asks no gone check; content rows (FS) always do.
    const multiSelected=!content&&inMultiSelection(selectionStore,entry.path,true);
    const rect=row.getBoundingClientRect(),keyboard=event.type==='keydown'||event.clientX===0&&event.clientY===0;
    const paths=content?[entry.path]:fileMenuSelection(shownMatches,selected,entry.path);
    if(!content){const state=selectionStore.getState();if(selected.has(entry.path))state.reorder(selectionNav.indexOfKey);else state.selectOnly(selectionEntries[selectionNav.indexOfKey(entry.path)]);}
    setMenuRequest({entry,paths,row,keyboard,multiSelected,returnFocus:row.ownerDocument.activeElement,point:keyboard?{x:rect.left,y:rect.bottom}:{x:event.clientX,y:event.clientY}});
  }
  // R3-files FT-05 (FS/NS `Kf(absPath, absPath)` + Yf): one gone hook for the requested (else the open) row. The request
  // renders once so the hook is bound to its path, then asks; the menu opens when the answer arrives (c0cdf4a08 h), and
  // a press, a key or a blur meanwhile cancels it.
  const goneEntry=menuRequest?.entry??menu?.entry;
  const goneAt=goneEntry&&cwd?fileCopyChoices(cwd,goneEntry.path).absolute??undefined:undefined;
  const {gone,beforeOpen}=useFileGone(goneAt,goneAt);
  const askedRequest=useRef(null);
  useLayoutEffect(()=>{
    if(!menuRequest||askedRequest.current===menuRequest)return;
    askedRequest.current=menuRequest;
    const request=menuRequest;
    openWhenChecked(request.row,request.multiSelected?undefined:beforeOpen(),()=>{setMenuRequest(current=>current===request?null:current);setMenu(request);});
  },[menuRequest,beforeOpen]);
  const multi=menu?.paths.length>1;
  // B33: folder rows (a filter ending in '/') get the folder menu, as tree rows do.
  const folderPaths=menu&&!content?menu.paths.filter(path=>shownMatches.some(match=>match.path===path&&match.directory)):[];
  const menuEntries=menu&&fileMenu?(multi?fileMenu.multiEntries(menu.paths,folderPaths.length?{directories:folderPaths}:undefined):[
    ...(menu.entry.line&&onAskAbout?[{kind:'item',action:'ask-about',label:t('Ask about this')}]:[]),
    ...fileMenu.entries(menu.entry.path,{surface:'file_browser',line:menu.entry.line,gone,...(menu.entry.directory?{directory:true}:{})}),
  ]):null;
  function selectMenuItem(item){
    if(item.action==='ask-about')onAskAbout?.(t('In {path} at line {line}: `{snippet}` — explain what this does and where it’s used.',{path:menu.entry.path,line:menu.entry.line,snippet:menu.entry.preview.trim()}));
    else fileMenu.select(item,menu.entry.path);
  }
  function resultKey(event) {
    if (event.nativeEvent.isComposing || event.keyCode === 229 || event.altKey) return;
    const row = event.target.closest("[data-tree-row]");
    const index = row ? Number(row.dataset.rowIndex) : -1;
    if(index>=0&&(event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey)){
      openResultMenu(event,shownMatches[index],row);return;
    }
    let destination = resultNavigation(event.key, index, shownMatches.length, isPlainSearchKey(event));
    if(content&&event.key==='ArrowLeft'&&shownMatches[index]?.line){destination=index-1;while(destination>0&&!shownMatches[destination].header)destination--;}
    if (destination !== null) {
      event.preventDefault();
      controller.current?.cancelEnter();
      if (destination === "input") input.current?.focus();
      else {
        focusResult(destination);
        if (event.shiftKey&&!content&&index>=0&&(event.key==='ArrowDown'||event.key==='ArrowUp')) selectFileRange(selectionStore,selectionNav,destination,index);
        else if (!content&&!event.shiftKey&&!event.metaKey&&!event.ctrlKey) selectionStore.getState().moveAnchor(shownMatches[destination]?.path);
      }
    } else if ((event.key === "a" || event.key === "A") && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
      event.preventDefault();
      if(!content)selectAllFiles(selectionStore,selectionNav);
    } else if ((event.key === "Enter" || event.key === " ") && index >= 0) {
      event.preventDefault();
      if (event.key === " " && (event.shiftKey || event.metaKey || event.ctrlKey)) selectAt(index, event);
      // B33 ly → oy: Enter (not repeated, no modifier) hands focus to the file it opens once released.
      else if (event.key === "Enter" && !event.repeat && isPlainSearchKey(event) && onEnterOpen) onEnterOpen(event.currentTarget, () => activate(index, {}, true));
      else activate(index, {}, true);
    } else if (event.key === "Tab" && event.shiftKey && index >= 0 && !event.ctrlKey && !event.metaKey) {
      // Let the browser's subsequent Shift+Tab leave the tree for the input.
      event.currentTarget.focus({ preventScroll: true });
    }
  }
  function inputKey(event) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Escape") {
      controller.current?.cancelEnter();
      if (query) { event.preventDefault(); event.stopPropagation(); clear(); }
      return;
    }
    if (!isPlainSearchKey(event)) return;
    if (event.key === "ArrowDown") {
      const row = hasQuery ? results.current?.querySelector("[data-tree-row]")
        : keptTree.current?.querySelector("[data-tree-row]");
      if (row) {
        event.preventDefault();
        controller.current?.cancelEnter();
        row.focus();
        row.scrollIntoView({ block: "nearest" });
        const firstPath=hasQuery?shownMatches[0]?.path:row.querySelector('[data-tree-primary]')?.dataset.filePath;
        if(!content&&firstPath)selectionStore.getState().moveAnchor(firstPath);
      }
    } else if (event.key === "Enter" && !event.repeat && hasQuery) {
      event.preventDefault();
      controller.current?.requestEnter();
    }
  }
  return <div className="sfs-browser" data-search-phase={state.phase} inert={!enabled ? true : undefined}>
    {/* cccc2cf0a filter bar Dn "flex h-8 shrink-0 items-center px-md": the CdsTextInput ve (aria-describedby the hint
        plus the invalid or cap note, slotStart the "grid size-4 shrink-0 place-items-center" Spinner sm "Searching files" /
        Search icon, clearable unless the find options show; with them slotEnd is fv plus an sm ghost iconOnly X), then
        the sr-only hint. */}
    <div className="flex h-8 shrink-0 items-center px-md" data-files-filter="">
      <CdsTextInput ref={input} value={query} maxLength={content?256:64}
        onChange={event => change(event.target.value)} onKeyDown={inputKey} onBlur={() => controller.current?.cancelEnter()}
        aria-controls={hasQuery ? resultId : treeId}
        aria-describedby={`${hintId}${invalidPattern ? ` ${invalidId}` : hasQuery && state.phase === "success" && (state.truncated||grouped?.truncated) ? ` ${limitId}` : ""}`}
        spellCheck={false} autoComplete="off" style={{ textOverflow: "ellipsis" }}
        aria-label={t("Filter files")} placeholder={t("Filter, or ? to search in files")}
        slotStart={<span className="grid size-4 shrink-0 place-items-center">{busy ? <CdsSpinner size="sm" label={t("Searching files")} /> : <CdsIcon name="Search" size="sm" />}</span>}
        clearable={!content} clearLabel={t("Clear filter")} onClear={clear}
        aria-invalid={invalidPattern || undefined}
        slotEnd={content ? <><SourceFileSearchOptions options={options} onToggle={toggleOption} />
          <CdsButton size="sm" variant="ghost" icon="X" iconOnly aria-label={t("Clear filter")} tooltip={false} onMouseDown={keepFocus} onClick={clear} /></> : undefined}
        disabled={!cwd} />
      <p id={hintId} className="sr-only">{t("Results update as you type. Press Down Arrow to go to results, and Up Arrow on the first result to return here.")}</p>
    </div>
    <div ref={keptTree} id={treeId} className="sfs-kept-tree" hidden={hasQuery} inert={hasQuery ? true : undefined}
      onKeyDown={event => {
        if (event.key !== "ArrowUp" || !isPlainSearchKey(event)) return;
        const rows = keptTree.current.querySelectorAll("[data-tree-row]");
        if (rows[0] === event.target || rows[0]?.contains(event.target)) { event.preventDefault(); input.current?.focus(); }
      }}>{typeof children === "function" ? children({ filtered: hasQuery, selectionStore }) : children}</div>
    <div ref={resultsRef} id={resultId} className="sfs-results" role="tree" aria-label={t("Project files")}
      aria-multiselectable={content?undefined:true} aria-busy={busy || undefined} hidden={!hasQuery} inert={!hasQuery ? true : undefined}
      data-stale={stale || undefined} tabIndex={0} onKeyDown={resultKey}
      {...blankSelection}
      onPointerDown={event=>{controller.current?.cancelEnter();blankSelection.onPointerDown(event);}}
      onFocusCapture={event => {
        focusInResults.current = true;
        if (event.target === event.currentTarget && !event.currentTarget.contains(event.relatedTarget) && event.currentTarget.matches(":focus-visible")) {
          const current = shownMatches.findIndex(entry => entry.path === activePath);
          focusResult(Math.max(0, current));
        }
      }} onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) focusInResults.current = false;
      }}>
      {shownMatches.map((entry, index) => {
        const slash = entry.path.lastIndexOf("/"), parent = slash >= 0 ? entry.path.slice(0, slash) : "";
        const hasNameMatches = entry.positions.some(position => position > slash);
        // cccc2cf0a _T renders a filename result, and zT a content result's file, as RT (the tree's row, depth 0,
        // showPath): the row is `R(de(), dw, W ? nl : ie ? fw : ol)` at el(0), the button pw. r8pa-01: a content match
        // is BT, `R(de(), dw, ol)` at el(1) around the same pw button; the file row is described by its "more" row.
        const treeRow = !entry.line, rowCurrent = treeRow && activePath === entry.path, rowSelected = !content && selected.has(entry.path);
        const moreId = entry.header && groupHasMore(shownMatches, index) ? `${ids}-more-${index}` : undefined;
        return <React.Fragment key={entry.key??entry.path}><div className={fileTreeRowClassName({ current: rowCurrent, selected: rowSelected })}
          style={treeIndent(treeRow ? 0 : 1)} data-pressed={menu?.entry===entry ? "" : undefined} role="treeitem" aria-level={entry.line?2:1}
          aria-describedby={moreId}
          data-content-match={entry.line||undefined}
          draggable={!entry.line&&!!fileMenu?.drag}
          onDragStart={event=>{
            if(entry.line)return;
            const paths=content?[entry.path]:fileMenuSelection(shownMatches,selected,entry.path);
            fileMenu?.drag?.(event,paths.map(path=>shownMatches.find(match=>match.path===path)));
          }}
          data-popup-open={menu?.entry===entry?"":undefined}
          onContextMenu={event=>openResultMenu(event,entry)}
          aria-selected={content?undefined:selected.has(entry.path)} aria-current={(!content||entry.header)&&activePath === entry.path || undefined}
          data-tree-row="" data-row-index={index} tabIndex={-1}
          onFocus={() => { focused.current = { path: entry.key??entry.path, index }; }}>
          <button type="button" tabIndex={-1} data-tree-primary="" className={fileTreeRowPrimary} aria-label={entry.line?`${entry.path}:${entry.line}`:entry.path}
            onClick={event => activate(index, event, event.detail!==1)} onDoubleClick={event => activate(index, event, true)}
            onMouseDown={event=>{if(event.button===1&&!entry.directory)event.preventDefault();}}
            onAuxClick={event=>{if(event.button===1&&!entry.directory){event.preventDefault();activate(index,event,true);}}}>
            {/* RT: a folder (no onToggle in a result list, so not a caret) is the Folder glyph, a file c280f9bbb ul
                (FileTypeIcon), both $c() sized, `shrink-0 self-center text-muted-control`; the name
                `truncate text-secondary|text-primary` (data-has-matches) and the folder `truncate text-footnote
                text-muted-as-secondary`, their lit runs c784da984 l (Af). */}
            {entry.line?<ContentSnippet entry={entry}/>:<>{entry.directory
              ? <CdsIcon name="Folder" size={fileTreeIconSize()} className={fileTreeIconClassName({ openable: true })} />
              : <FileTypeIcon fileName={entry.name} size={fileTreeIconSize()} className={fileTreeIconClassName({ openable: true })} />}
            <span data-has-matches={hasNameMatches || undefined} className={hasNameMatches ? "truncate text-secondary" : "truncate text-primary"}>
              {entry.positions ? <LitText text={entry.name} positions={entry.positions} offset={slash + 1} /> : entry.name}
            </span>
            {parent && <span className="truncate text-footnote text-muted-as-secondary">{entry.positions ? <LitText text={parent} positions={entry.positions} offset={0} /> : parent}</span>}</>}
          </button>
        </div>{entry.more&&<div id={`${ids}-more-${groupHeaderIndex(shownMatches, index)}`} aria-hidden="true" className={CONTENT_MORE_CLASS} style={treeIndent(1)}>
          <span className="shrink-0 min-w-[2.5ch]" /><span className="min-w-0 truncate">{t('More matches in this file.')}</span></div>}</React.Fragment>;
      })}
      {/* _T / zT: WT "Type after ? to search in files", WT{id} "Invalid regular expression", and with no rows (a
          failed local read included: _T has no error branch) WT "No matching files" / "No matches in file contents";
          UT{id} the cap note, F8ftTrFYrH with the shown count (filenames) or 8//Rlb3ezL (contents). */}
      {content&&query.trim()==='?'&&<div className={EMPTY_NOTE_CLASS}>{t('Type after ? to search in files')}</div>}
      {invalidPattern?<div id={invalidId} className={EMPTY_NOTE_CLASS}>{t('Invalid regular expression')}</div>
        :(state.phase === "error" || (state.phase === "success" && !state.matches.length)) && !(content&&query.trim()==='?') && <div className={EMPTY_NOTE_CLASS}>{t(content?"No matches in file contents":"No matching files")}</div>}
      {state.phase === "success" && (state.truncated||grouped?.truncated) && <div id={limitId} className={CAP_NOTE_CLASS} style={treeIndent(0)} data-files-limit="">
        {content?tn(grouped.shown,'Only {count} match is shown. Keep typing to narrow.','Only {count} matches are shown. Keep typing to narrow.'):searchLimitMessage(state)}
      </div>}
    </div>
    {menuEntries&&<SourceMenu.Popup anchor={menu.row} trigger={menu.row} point={menu.point} side="bottom" align="start"
      sideOffset={CONTEXT_MENU_SIDE_OFFSET} alignOffset={CONTEXT_MENU_ALIGN_OFFSET} layer="contextmenu" dataCds="ContextMenu" contextMenuGuard
      label={t('File actions')} initialHighlight={menu.keyboard?"first":"popup"} onClose={()=>setMenu(null)} finalFocus={()=>menu.returnFocus?.isConnected&&menu.returnFocus!==menu.row.ownerDocument.body?menu.returnFocus:menu.row}>
      {multi?<SourceMenu.Group><SourceMenu.GroupLabel>{tn(menu.paths.length,'{count} item selected','{count} items selected')}</SourceMenu.GroupLabel>
        <SourceFileMenuEntries entries={menuEntries} onSelect={selectMenuItem}/></SourceMenu.Group>:<SourceFileMenuEntries entries={menuEntries} onSelect={selectMenuItem}/>}
    </SourceMenu.Popup>}
  </div>;
}
