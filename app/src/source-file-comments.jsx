import React, { useLayoutEffect, useRef } from 'react';
import { Icon } from './icons';
import { SourceTooltip } from './source-tooltip.jsx';
import { t } from '../electron/i18n/index.mjs';
import { suppressEscapeRepeat } from './generated/code-editor-current/keyboard-repeat.mjs';
import { ownerWindow } from './generated/files-changes/owner-window.mjs';

/** The comment field's keydown (c82eca2bd Se me): Enter saves ('⌘/Ctrl+Enter' also submits) unless composing or held,
 * Escape cancels. 2.42304.0: before cancelling, Escape swallows its own auto-repeat in the owner window until the key is
 * released (`let t = f(e.currentTarget); t && te(t)`: shared-25 up + shared-19 pZ), so holding Escape closes the card
 * and does not go on to close the pane, menu or dialog behind it. */
export function commentFieldKeyDown(event,{save,cancel}){
  event.stopPropagation();if(event.nativeEvent?.isComposing||event.keyCode===229)return;
  if(event.key==='Enter'&&!event.shiftKey&&!event.altKey){event.preventDefault();if(!event.repeat)save(true,event.metaKey||event.ctrlKey);}
  else if(event.key==='Escape'){event.preventDefault();const view=ownerWindow(event.currentTarget);if(view)suppressEscapeRepeat(view);cancel();}
}

// c82eca2bd H/U/ot, inline variant with canPostToGitHub=false (Files Wc).
// placeholder: the Changes pane passes ga's 'Tell Claude what to change'; outdated: ot isOutdated, the label then
// carries the neutral xs 'Outdated' badge (c82eca2bd W).
export function FileCommentCard({entry,active,store,onSave,onDelete,placeholder,outdated=false}) {
  const input=useRef(null),card=useRef(null);
  const editing=entry.savedBody===undefined||active;
  const label=entry.start===entry.end?t('Line {line}',{line:entry.end}):t('Lines {start}–{end}',{start:entry.start,end:entry.end});
  const inputLabel=entry.start===entry.end?t('Comment on line {line}',{line:entry.end}):t('Comment on lines {start}–{end}',{start:entry.start,end:entry.end});
  useLayoutEffect(()=>{if(!editing)return;const node=input.current;if(node){node.focus();node.setSelectionRange(node.value.length,node.value.length);node.scrollTop=node.scrollHeight;}},[editing,entry.id]);
  const save=(viaKeyboard=false,submit=false)=>{const saved=store.save(entry.id);if(saved)onSave(saved,{viaKeyboard,submit});};
  const cancel=()=>store.cancel(entry.id);
  return <div className="sfv-comment-wrap" data-file-comment-card="" onContextMenu={event=>event.stopPropagation()} onTouchStart={event=>event.stopPropagation()}>
    <div ref={card} className="sfv-comment-card" data-active={active||undefined} data-editing={editing||undefined}>
      <div className="sfv-comment-label">{outdated?<span className="sfv-comment-label-row">{label}<span className="sfv-comment-badge" data-cds="Badge" data-variant="neutral" data-size="xs">{t('Outdated')}</span></span>:label}</div>
      <div className="sfv-comment-row">
        {editing?<textarea ref={input} aria-label={inputLabel} placeholder={placeholder??t('Add a comment')} rows={1} value={entry.body}
          onChange={event=>store.edit(entry.id,event.target.value)} onKeyDown={event=>commentFieldKeyDown(event,{save,cancel})} onBlur={event=>{if(entry.savedBody!==undefined||card.current?.contains(event.relatedTarget))return;requestAnimationFrame(()=>{if(input.current&&!input.current.value.trim())cancel();});}}/>
          :<div role="button" tabIndex={0} className="sfv-comment-body" onClick={event=>{const selection=event.currentTarget.ownerDocument.getSelection();if(selection?.isCollapsed===false&&(event.currentTarget.contains(selection.anchorNode)||event.currentTarget.contains(selection.focusNode)))return;store.activate(entry.id);}}
            onKeyDown={event=>{if(event.metaKey||event.ctrlKey||event.altKey)return;if(event.key==='Enter'||event.key===' '){event.preventDefault();if(event.key==='Enter')store.activate(entry.id);}}}
            onKeyUp={event=>{if(event.key===' '&&!event.metaKey&&!event.ctrlKey&&!event.altKey){event.preventDefault();store.activate(entry.id);}}}>{entry.savedBody}</div>}
        <div className="sfv-comment-actions">
          {editing?<SourceTooltip content={t('Save comment')}><button type="button" aria-label={t('Save comment')} disabled={!entry.body.trim()} onClick={()=>save()}><Icon name="ChatAdd" size={16}/></button></SourceTooltip>
            :<><SourceTooltip content={t('Edit comment')}><button type="button" aria-label={t('Edit comment')} onClick={()=>store.activate(entry.id)}><Icon name="Edit" size={14}/></button></SourceTooltip>
              <SourceTooltip content={t('Delete comment')}><button type="button" aria-label={t('Delete comment')} onClick={()=>{store.remove(entry.id);onDelete(entry);}}><Icon name="Trash" size={14}/></button></SourceTooltip></>}
        </div>
      </div>
    </div>
  </div>;
}
