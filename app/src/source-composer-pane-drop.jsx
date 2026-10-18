// R4i-graph GR3 (composer-12 follow-up): the Code session pane's drop zone, as 2.42304.0 mounts it.
//
// cc43287c9 renders the session pane's root as c4c113f6f f (YI): `p(YI, {onDropped: jn, appDrag: Mn, disabled: me || !Bt,
// className: "h-full min-w-0 flex flex-col …", children: […]})`. A Finder drop anywhere over the pane (header, transcript,
// composer) is split by shared-52 mb and handed to the composer's dropFiles (`jn = A(e => oe.current?.dropFiles(e), [])` →
// Xh → `Yh(e, "drop")`, the one aK route paste and the file picker share); an in-app drag the pane owns (Mn = cd06fb298 g:
// `{accepts: t => l?.owner === e && p(t), onDrop: h}`) commits instead; while either is over the pane, cc63499d2 d draws the
// accent ring. The zone, its drag-over state and the halo are the generated originals (composer-pane-drop-zone.mjs,
// composer-drop-target.mjs); this module is the host's two answers:
//   - appDrag: the host's in-window file-context drag (file-context-drag.mjs over the generated cd06fb298 c/d/f/p/m/h) for
//     the pane's owner — accepts is the wrapper's owner + drag test (g's `l?.owner === e && p(t)`), onDrop its commit (h);
//   - onDropped: the composer's own intake (SourceComposer publishes it on `dropRef`: aK over the split, then the editor's
//     focus, as Xh's scheduleFocus). The card itself takes no drop then (the official card has none: uM gets no onFileDrop).
// Host difference: the zone wraps the host's pane box (div.source-chat-tile-content, its data attributes and CSS) rather
// than being it, with YI's own `relative` and the flex column it passes; the host passes no onContextMenu (Re is the
// official pane's dev menu). The host pane box also hosts Chat / Cowork, whose composers keep their own drop: there the
// zone stays mounted (no remount on a mode switch) but inert, through YI's own `filesElsewhere` and no appDrag, so it
// accepts no drag at all (u's accepts is false: no preventDefault, no dropEffect, no halo).
import React, { useMemo } from "react";
import { ComposerPaneDropZone } from "./generated/code-composer/composer-pane-drop-zone.mjs";
import { acceptsFileContextDrag } from "./file-context-drag.mjs";
import { commitFileContextDrag } from "./generated/files-changes/file-context-drag.mjs";

/** YI's className for a session pane that is not a popout tile body (cc43287c9: `h-full min-w-0 flex flex-col`). */
export const PANE_DROP_ZONE_CLASS = "h-full min-w-0 flex flex-col";

/** cd06fb298 g for the host's file-context drag: undefined without an owner, as g without one. */
export function paneAppDrag(owner) {
  if (!owner) return undefined;
  return { accepts: (event) => acceptsFileContextDrag(event, owner), onDrop: () => commitFileContextDrag() };
}

export function SourcePaneDropZone({ dropRef, owner, disabled = false, filesElsewhere = false, className = PANE_DROP_ZONE_CLASS, children }) {
  const appDrag = useMemo(() => (filesElsewhere ? undefined : paneAppDrag(owner)), [owner, filesElsewhere]);
  return <ComposerPaneDropZone onDropped={(split) => dropRef?.current?.(split)} appDrag={appDrag} disabled={disabled}
    filesElsewhere={filesElsewhere} className={className}>
    {children}
  </ComposerPaneDropZone>;
}
