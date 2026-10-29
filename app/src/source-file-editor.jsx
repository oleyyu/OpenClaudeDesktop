import { createPortal } from 'react-dom';
import { CdsRoot, useDirection } from './generated/view-tabs/index.js';
import { SelectionActionBar } from './generated/code-current/terminal-action-bar.mjs';
import { Icon } from './icons';
import { FileCommentCard } from './source-file-comments.jsx';
import { fileCommentsStore, fileCommentAttachmentKey } from './file-comments-store.mjs';
import { commentRangeHighlight, setCommentRange, rangeHighlightTheme, selectionActions, selectableLineNumbers, commentWidgets, setCommentSlots, hoveredEditorLine } from './generated/code-editor-current/wrapper.mjs';
import { SourceMenu } from './source-menu.jsx';
import { CONTEXT_MENU_ALIGN_OFFSET, CONTEXT_MENU_SIDE_OFFSET } from './menu-model.mjs';
import { useSourceToasts } from './source-toast.jsx';
import { editorClipboardExtension, editorMenuItems, editorSelectedContext, editorCaret, goToEditorLocation, syncEditorSelection, runEditorCommand } from './file-editor-commands.mjs';
import React, { useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { EditorState, EditorView, Compartment, Decoration, keymap, drawSelection, history, historyKeymap, highlightWhitespace, scrollPastEnd, Transaction } from './code-editor-core.mjs';
import { loadEditorLanguage, cachedEditorLanguage, pendingEditorLanguage, settleEditorParse } from './generated/code-editor-current/wrapper.mjs';
import { rememberEditorView, restoreEditorView, restoredHistory, restoredFolds, baseLanguageBehavior, detectedIndentation, resetIndentation, editorKeymap, codeFolding, bracketIndentation, bracketJump, autoCloseBrackets, tabIndentation, columnSelection, indentGuides, externalEditorChange, externalEditorUpdate, updateEditorTransactions } from './generated/code-editor-current/wrapper.mjs';
import { unfoldEditorRange } from './file-editor-folds.mjs';
import { createFindReveal, runFindReveal } from './file-editor-find.mjs';
import { useSettledHighlight } from './use-settled-highlight.mjs';
import { tokenLines, fileHighlightLanguage, fileViewerTooSlow } from './file-preview-model.mjs';
import { tokenCSS } from './highlight-model.mjs';
import { editorTheme, findMatchTheme } from './generated/code-editor-current/theme.mjs';
import { useCodeThemes } from './code-theme-store.mjs';
import themeColors from './generated/code-theme-colors.json';
import { t } from '../electron/i18n/index.mjs';

// shared-18 lx, the experimental flags fx hands its compact CdsRoot.
const CHIP_ROOT_EXPERIMENTAL = { naturalImageTiles: 'sized' };
// The current source theme uses the user's code-theme palette, including active indent guides.
const viewOptions = (settings, hintId) => [
  settings.wordWrap ? EditorView.lineWrapping : [], EditorState.tabSize.of(settings.tabSize),
  settings.showWhitespace ? highlightWhitespace() : [], settings.scrollPastEnd ? scrollPastEnd() : [],
  settings.indentGuides ? indentGuides() : [],
  tabIndentation(settings.tabIndents, hintId),
];
export function SourceFileEditor({ editor, settings, line, endLine, scrollNonce, find, apiRef, onGoToLine, onAttachFile, onAttachSelection, onDownload, downloading = false, onSaveComment, onDeleteComment }) {
  const [menu, setMenu] = useState(null), [chip,setChip] = useState(null), [cards,setCards] = useState([]), [hover,setHover] = useState(null);
  const selectionController=useRef(null);
  const comments=useMemo(()=>fileCommentsStore(editor.key),[editor.key]);
  const commentState=useSyncExternalStore(comments.subscribe,comments.getSnapshot,comments.getSnapshot);
  const commentEnabled=!!onSaveComment;
  const shell=useRef(null);
  const hintId = useId(), pointerUsed = useRef(false);
  const [showTabHint, setShowTabHint] = useState(false);
  const toasts = useSourceToasts();
  const actions = useRef(null);
  actions.current = { onGoToLine, onAttachFile, onAttachSelection, onDownload, onSaveComment, onDeleteComment };
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
  const host = useRef(null), view = useRef(null), findReveal = useRef(null);
  if (!findReveal.current) findReveal.current = createFindReveal(find);
  const themes = useCodeThemes();
  const [mode,setMode] = useState(() => typeof document !== 'undefined' && document.documentElement.dataset.mode === 'dark' ? 'dark' : 'light');
  const theme = useMemo(() => editorTheme(themeColors[themes[mode]].editor), [themes,mode]);
  const paint = useRef(new Compartment());
  useLayoutEffect(() => {
    const root=host.current.ownerDocument.documentElement;
    const sync=()=>setMode(root.dataset.mode === 'dark' ? 'dark' : 'light');
    sync();
    const observer=new MutationObserver(sync); observer.observe(root,{attributes:true,attributeFilter:['data-mode']});
    return ()=>observer.disconnect();
  }, []);
  const options = useRef(new Compartment()), marks = useRef(new Compartment()), search = useRef(new Compartment()), grammar = useRef(new Compartment()), undoHistory = useRef(new Compartment()), lineBreaks = useRef(new Compartment());
  const language = fileHighlightLanguage(editor.path);
  const normalized = state.text.replace(/\r\n/g, '\n');
  const tokens = useSettledHighlight({ text: normalized, language: fileViewerTooSlow(normalized, language) ? 'text' : language, isFrontier: false, languageSettled: true, scopeKey: editor.key }, host);
  useLayoutEffect(() => { editor.setAutoSave(settings.autoSave !== false); }, [editor, settings.autoSave]);
  useLayoutEffect(() => {
    // Official Jo: vo(e)=e.closest("[data-pane-root]"); without a pane root no chip container is made.
    const parent=host.current.closest('[data-pane-root]'); const tooltipParent=parent?.ownerDocument.createElement('div');
    if(parent&&tooltipParent){tooltipParent.className='absolute left-0 top-0 size-0'; parent.append(tooltipParent);}
    const selections=selectionActions({
      getHandler:()=>actions.current.onAttachSelection ? (text,range)=>actions.current.onAttachSelection({text,...range}) : undefined,
      getCommentHandler:()=>actions.current.onSaveComment ? (start,end,code)=>comments.create(start,end,code) : undefined,
      onChipLifecycle:(event,value)=>setChip(current=>event==='mount'?value:current===value?null:current),tooltipParent,
    });
    selectionController.current=selections;
    const restored = restoreEditorView(editor.key, state.text);
    const cm = new EditorView({ dispatchTransactions: updateEditorTransactions, scrollTo: restored?.scroll, parent: host.current, state: EditorState.create({ doc: state.text, selection: restored?.selection, extensions: [
      paint.current.of(theme), undoHistory.current.of([restoredHistory(restored), history()]), restoredFolds(true, restored?.folds), selectableLineNumbers(), drawSelection(), editorClipboardExtension,
      selections.extension, commentRangeHighlight, rangeHighlightTheme(), findMatchTheme,
      commentWidgets((event,value)=>setCards(current=>event==='mount'?[...current,value]:current.filter(item=>item!==value))),
      baseLanguageBehavior, detectedIndentation(true, editor.path), bracketIndentation(true), bracketJump(true), autoCloseBrackets(true), columnSelection(true),
      codeFolding(true, { formatMessage: ({ defaultMessage }) => t(defaultMessage) }),
      // Official Jo seeds the grammar compartment with Yt ?? qi(h): the cached grammar, else the pending closeBrackets data.
      grammar.current.of(cachedEditorLanguage(editor.path) ?? pendingEditorLanguage(editor.path)),
      EditorView.clipboardInputFilter.of((text, state) => text.replace(/\r\n|\r|\n/g, state.lineBreak)),
      EditorState.allowMultipleSelections.of(true),
      EditorState.phrases.of({ 'Selection deleted': t('Selection deleted') }),
      lineBreaks.current.of(EditorState.lineSeparator.of(state.text.includes('\r\n') ? '\r\n' : '\n')),
      EditorView.contentAttributes.of({ 'aria-label': t('File editor'), spellcheck: 'false' }),
      keymap.of([{ key: 'Ctrl-g', run: () => actions.current.onGoToLine?.() === true },
        { key: 'Mod-s', run: () => { void editor.save(); return true; } }, ...editorKeymap, ...historyKeymap]),
      options.current.of(viewOptions(settings, hintId)), marks.current.of([]), search.current.of([]),
      EditorView.domEventHandlers({ blur: () => { void editor.flushAutoSave(); } }),
      EditorView.updateListener.of(update => { if (update.docChanged) editor.change(update.state.sliceDoc()); }),
    ] }) });
    view.current = cm;
    // A new view starts like a fresh Jo mount: Nr=t(x?.query) and the Pr effect runs once.
    findReveal.current = createFindReveal(find);
    cm.dispatch({effects:setCommentSlots.of(commentEnabled?comments.getSnapshot().entries.map(entry=>({id:entry.id,line:entry.end})):[])});
    // Official Jo's [Zt] effect (on mount and after the grammar loads): reconfigure(Zt), then uo(e) force-parses near the viewport.
    settleEditorParse(cm);
    void loadEditorLanguage(editor.path).then(language => {
      if (view.current === cm && language) { cm.dispatch({ effects: grammar.current.reconfigure(language) }); settleEditorParse(cm); }
    });
    if (apiRef) apiRef.current = { caret: () => editorCaret(cm.state), focus: () => cm.focus(), go: (line, column) => goToEditorLocation(cm, line, column) };
    const document = host.current.ownerDocument;
    const hidden = () => { if (document.visibilityState === 'hidden') void editor.flushAutoSave(); };
    const flush = () => { void editor.flushAutoSave(); };
    document.addEventListener('visibilitychange', hidden);
    document.defaultView.addEventListener('pagehide', flush);
    return () => { flush(); document.removeEventListener('visibilitychange', hidden); document.defaultView.removeEventListener('pagehide', flush); rememberEditorView(editor.key, cm, {}); view.current = null; if (apiRef) apiRef.current = null; cm.destroy(); selectionController.current=null; tooltipParent?.remove(); comments.release(); };
  }, [editor]); // Initial text and options are subsequently updated without losing selection/history.
  useLayoutEffect(() => { view.current?.dispatch({effects:paint.current.reconfigure(theme)}); }, [theme]);
  useLayoutEffect(()=>{view.current?.dispatch({effects:setCommentSlots.of(commentEnabled?commentState.entries.map(entry=>({id:entry.id,line:entry.end})):[])});},[commentState.entries,commentEnabled]);
  useLayoutEffect(()=>{if(chip)view.current?.requestMeasure();},[chip]);
  useLayoutEffect(()=>{const entry=commentEnabled?commentState.entries.find(entry=>entry.id===commentState.active):null;view.current?.dispatch({effects:setCommentRange.of(entry&&entry.end>entry.start?{from:entry.start,to:Math.min(entry.end,entry.start+199)}:null)});},[commentState.active,commentState.entries,commentEnabled]);
  useLayoutEffect(() => {
    const cm = view.current;
    if (cm && cm.state.sliceDoc() !== state.text) {
      const lineBreak = state.text.includes('\r\n') ? '\r\n' : '\n';
      if (cm.state.lineBreak !== lineBreak) cm.dispatch({ effects: lineBreaks.current.reconfigure(EditorState.lineSeparator.of(lineBreak)) });
      cm.dispatch({ changes: externalEditorChange(cm, state.text), annotations: [externalEditorUpdate.of(true), resetIndentation.of(true), Transaction.addToHistory.of(false)] });
      cm.dispatch({ effects: undoHistory.current.reconfigure([]) });
      cm.dispatch({ effects: undoHistory.current.reconfigure(history()) });
    }
  }, [state.text]);
  useLayoutEffect(() => { view.current?.dispatch({ effects: options.current.reconfigure(viewOptions(settings, hintId)) }); }, [settings]);
  useLayoutEffect(() => {
    const cm = view.current;
    if (!cm) return;
    const ranges = [];
    if (tokens) tokenLines(tokens, normalized).forEach((tokens, index) => {
      if (index >= cm.state.doc.lines) return;
      let offset = cm.state.doc.line(index + 1).from;
      for (const token of tokens) {
        if (token.text.length && token.light && token.dark) ranges.push(Decoration.mark({ attributes: {
          'data-code-token': '', style: Object.entries(tokenCSS(token)).map(([k,v]) => `${k}:${v}`).join(';'),
        } }).range(offset, offset + token.text.length));
        offset += token.text.length;
      }
    });
    cm.dispatch({ effects: marks.current.reconfigure(EditorView.decorations.of(Decoration.set(ranges, true))) });
  }, [tokens, normalized]);
  useLayoutEffect(() => {
    const cm = view.current;
    if (!cm) return;
    const ranges = [], active = find?.matches?.[find.index];
    for (const [i, match] of (find?.matches ?? []).slice(0, 2000).entries()) {
      if (match.line > cm.state.doc.lines) continue;
      const row = cm.state.doc.line(match.line), from = row.from + match.start, to = Math.min(row.to, row.from + match.end);
      if (to > from) ranges.push(Decoration.mark({ class: i === find.index ? 'cm-epitaxyFindMatch cm-epitaxyFindMatch-active' : 'cm-epitaxyFindMatch' }).range(from, to));
    }
    if (active && find.index >= 2000 && active.line <= cm.state.doc.lines) {
      const row = cm.state.doc.line(active.line), from = row.from + active.start, to = Math.min(row.to, row.from + active.end);
      if (to > from) ranges.push(Decoration.mark({ class: 'cm-epitaxyFindMatch cm-epitaxyFindMatch-active' }).range(from, to));
    }
    const jump = !find && Number.isInteger(line) && line > 0 ? Math.min(line, cm.state.doc.lines) : null;
    if (jump) for (let n = jump; n <= Math.min(endLine || jump, cm.state.doc.lines); n++) ranges.push(Decoration.line({ class: 'cm-epitaxyJumpRange' }).range(cm.state.doc.line(n).from));
    const effects = [search.current.reconfigure(EditorView.decorations.of(Decoration.set(ranges, true)))];
    if (jump) { const target = cm.state.doc.line(jump).from; effects.push(...unfoldEditorRange(cm.state, target), EditorView.scrollIntoView(target, { y: 'center' })); }
    cm.dispatch({ effects });
    // 3.6556.2 cbd02b8f2 Jo Pr, deps Rr=[query,options,activeLine,scrollNonce]: `t&&J!==void 0&&(fo(e,t),t.query===Nr.current&&uo(e)),Nr.current=t?.query`.
    // fo centers the active hit and puts the caret on it; uo settles the parse only for another hit of the same query.
    runFindReveal(cm, find, findReveal.current);
  }, [find, line, endLine, scrollNonce, normalized]);
  const openMenu = event => {
    const cm = view.current;
    if (!cm) return;
    event.preventDefault(); event.stopPropagation(); syncEditorSelection(cm);
    const rect = cm.contentDOM.getBoundingClientRect();
    setMenu({ point: event.type === 'keydown' ? { x: rect.left + 12, y: rect.top + 12 } : { x: event.clientX, y: event.clientY }, view: cm, selection: selectionController.current?.attachable(cm.state) ? editorSelectedContext(cm.state) : null, commentLines: selectionController.current?.commentLines(cm.state) });
  };
  const command = action => {
    const cm = menu.view;
    void runEditorCommand(cm, action, { isCurrent: () => view.current === cm }).catch(() => toasts?.add(t(action === 'paste' ? 'Couldn’t paste from clipboard.' : 'Couldn’t copy to clipboard.'), { variant: 'danger' }));
  };
  const direction = useDirection();
  const chipActions = chip ? [
    ...(onAttachSelection ? [{ key: 'add-to-chat', label: t('Attach as context'), shortcut: 'cmd+shift+l', onSelect: chip.attach }] : []),
    ...(commentEnabled ? [{ key: 'add-comment', label: t('Add comment'), ariaLabel: chip.range.fromLine===chip.range.toLine?t('Comment on line {line}',{line:chip.range.fromLine}):t('Comment on lines {start}–{end}',{start:chip.range.fromLine,end:chip.range.toLine}), onSelect: chip.comment }] : []),
  ] : [];
  const hintKey = event => { if (settings.tabIndents && event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey && !pointerUsed.current && event.target === view.current?.contentDOM) setShowTabHint(true); };
  return <>
    <div ref={shell} className="sfv-editor-shell"
      onMouseMove={event=>{const cm=view.current;if(!cm||!commentEnabled)return;const next=hoveredEditorLine(cm,event.currentTarget.getBoundingClientRect().top,event.clientY);setHover(current=>current?.line===next?.line&&current?.top===next?.top&&current?.rowHeight===next?.rowHeight?current:next);}}
      onMouseLeave={()=>setHover(null)} onScrollCapture={()=>setHover(null)} onKeyDownCapture={hintKey} onKeyUpCapture={hintKey}
      onPointerDownCapture={() => { pointerUsed.current = true; setShowTabHint(false); }}
      onBlur={event => { setShowTabHint(false); if (!event.currentTarget.contains(event.relatedTarget)) pointerUsed.current = false; }}>
    <div ref={host} dir="ltr" className="sfv-editor" data-file-viewer="" data-word-wrap={settings.wordWrap} data-show-whitespace={settings.showWhitespace || undefined} data-scroll-past-end={settings.scrollPastEnd || undefined}
      onContextMenu={openMenu} onKeyDown={event => { if (event.key === 'ContextMenu' || event.key === 'F10' && event.shiftKey) openMenu(event); }} />
    {settings.tabIndents && <span id={hintId} className={showTabHint ? "sfv-editor-tab-hint" : "sr-only"}>{t(typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)
      ? 'Tab inserts indentation. To move the focus with Tab, press Shift+Option+M first.'
      : 'Tab inserts indentation. To move the focus with Tab, press Control+M first.')}</span>}
    {commentEnabled&&hover&&<button type="button" className="sfv-gutter-comment" aria-label={t('Comment on line {line}',{line:hover.line})} style={{top:hover.top+(hover.rowHeight-16)/2}} onMouseDown={event=>event.preventDefault()} onClick={()=>{const cm=view.current;if(!cm)return;const line=cm.state.doc.line(Math.min(hover.line,cm.state.doc.lines));comments.create(line.number,line.number,line.text);if(cm.state.selection.ranges.some(range=>!range.empty))cm.dispatch({selection:{anchor:line.from}});}}><Icon name="Add" size={12} weight="strong"/></button>}
    </div>
    {/* cbd02b8f2 li: `W !== null && Z.length > 0 ? p(n(oe, {children: n("div", {dir: Je, className: Ft ? "pointer-events-auto
        invisible" : "pointer-events-auto", children: n(le, {actions: Z})})}), W.dom) : null`. oe is shared-18 fx (shared-frame yd,
        view-tabs CdsRoot, density compact, experimental lx, className contents), le is ceb49ada3 t (the SelectionActionBar the
        terminal and the Changes chip render), Ft the editor's context menu being open, Je `useDirection() === "rtl" ? "rtl" : undefined`.
        Z: `{key: "add-to-chat", label: "Attach as context", shortcut: "cmd+shift+l", onSelect: W.attach}` when attaching is possible,
        then `{key: "add-comment", label: "Add comment", ariaLabel: Tt(P, {start, end}), onSelect: W.comment}` when commenting is. */}
    {chip&&chipActions.length>0&&createPortal(<CdsRoot density="compact" experimental={CHIP_ROOT_EXPERIMENTAL} className="contents">
      <div dir={direction==='rtl'?'rtl':undefined} className={menu?'pointer-events-auto invisible':'pointer-events-auto'}><SelectionActionBar actions={chipActions}/></div>
    </CdsRoot>,chip.dom)}
    {commentEnabled&&cards.map(card=>{const entry=commentState.entries.find(entry=>entry.id===card.id);return entry?createPortal(<FileCommentCard entry={entry} active={commentState.active===entry.id} store={comments}
      onSave={(entry,options)=>onSaveComment({...entry,key:fileCommentAttachmentKey(editor.key,entry.id),source:'file'},options)}
      onDelete={entry=>onDeleteComment?.({...entry,key:fileCommentAttachmentKey(editor.key,entry.id)})}/>,card.dom,card.seq):null;})}
    {menu && <SourceMenu.Popup anchor={menu.view.contentDOM} point={menu.point} trigger={null} side="bottom" align="start"
      sideOffset={CONTEXT_MENU_SIDE_OFFSET} alignOffset={CONTEXT_MENU_ALIGN_OFFSET} layer="contextmenu" dataCds="ContextMenu" contextMenuGuard
      label={t('File actions')} onClose={() => setMenu(null)} finalFocus={() => view.current?.contentDOM}>
      {(onAttachFile || menu.selection && onAttachSelection || commentEnabled) && <>
        {menu.selection && onAttachSelection ? <SourceMenu.Item shortcut="cmd+shift+l" onClick={() => selectionController.current?.attach(menu.view,"context_menu")}>{t('Attach selection as context')}</SourceMenu.Item>
          : onAttachFile ? <SourceMenu.Item onClick={onAttachFile}>{t('Attach as context')}</SourceMenu.Item> : null}
        {commentEnabled&&<SourceMenu.Item aria-label={menu.commentLines?.fromLine===menu.commentLines?.toLine?t('Comment on line {line}',{line:menu.commentLines?.fromLine}):t('Comment on lines {start}–{end}',{start:menu.commentLines?.fromLine,end:menu.commentLines?.toLine})} onClick={()=>selectionController.current?.comment(menu.view)}>{t('Add comment')}</SourceMenu.Item>}
        <SourceMenu.Separator />
      </>}
      {editorMenuItems(menu.view.state, { windows: typeof navigator !== 'undefined' && /Win/.test(navigator.platform) }).map((item, index) => item.separator
        ? <SourceMenu.Separator key={index} /> : <SourceMenu.Item key={item.action} shortcut={item.shortcut} disabled={item.disabled} onClick={() => command(item.action)}>{t(item.label)}</SourceMenu.Item>)}
      {onGoToLine && <><SourceMenu.Separator /><SourceMenu.Item shortcut="ctrl+g" onClick={onGoToLine}>{t('Go to line')}</SourceMenu.Item></>}
      {/* cd2efac6e (editor branch, zu set): `(z || pg) && F.Separator, z && Copy file contents, pg && Download`. z = R !== null
          only for channel/chat/task files, so a Code local file has no Copy file contents here (the ⋮ menu and the preview keep it). */}
      {onDownload && <><SourceMenu.Separator />
      <SourceMenu.Item disabled={downloading} disabledReason={t('Downloading…')} onClick={() => onDownload(menu.view.state.sliceDoc())}>{t('Download file')}</SourceMenu.Item></>}
    </SourceMenu.Popup>}
  </>;
}
