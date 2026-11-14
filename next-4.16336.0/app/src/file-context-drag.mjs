// R3-files FT-18: the in-window file-context drag is the 2.42304.0 original (cd06fb298 c/d/f/p/m/h/u, generated in
// generated/files-changes/file-context-drag.mjs; old 2.31226.0 c194f2b35 w..j in generated/code-editor). Its gate d is
// `!coarsePointer() && rollout "__gb__3508862586" !== false` (locally no GrowthBook, so the rollout keeps its default),
// and its drag state (which owner, which paths, attach on drop) is that module's one `l`. Every drop target reads it
// through this wrapper (main.jsx starts drags; source-composer.jsx and source-terminal-pane.jsx accept them), so the
// state lives in one module instance.
import {fileContextDragEnabled,beginFileContextDrag,isFileContextDrag,draggedFilePaths,commitFileContextDrag} from './generated/files-changes/file-context-drag.mjs';
export {draggedFilePaths};
export function startFileContextDrag(event,owner,paths,attach){
 if(!owner||!Array.isArray(paths)||!paths.length||paths.length>100||typeof attach!=='function'){event.preventDefault();return false;}
 // cd06fb298 f refuses (preventDefault) when d() is off; the wrapper reports that to the caller.
 if(!fileContextDragEnabled()){event.preventDefault();return false;}
 beginFileContextDrag(event,owner,attach,paths);return true;
}
export function acceptsFileContextDrag(event,owner){return !!owner&&draggedFilePaths(owner)!==undefined&&isFileContextDrag(event);}
export function dropFileContextDrag(event,owner){
 if(!acceptsFileContextDrag(event,owner))return false;
 event.preventDefault();event.stopPropagation();commitFileContextDrag();return true;
}
