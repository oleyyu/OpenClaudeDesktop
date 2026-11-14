// Host adapters of the 3.6556.2 artifact library graph (scripts/extract-artifact-library.mjs, w10-curchat-artifacts-gen).
// Each export answers one original declaration the extractor names (its features pin the original); the manifest's
// `hostDifferences` repeats why. The library lists this machine's files (source "cowork"), so the claude.ai artifact
// services (owners, the chat artifact preview, the official artifact menu chunk) have no data here.
// E41: this module sits under the chat graph (source-artifact-adapters.jsx imports the artifact library), so the CDS
// menus come from the concrete view-tabs file by semantic name, not the view-tabs facade.
import { CdsContextMenu, CdsDropdown } from './generated/view-tabs/shared-frame-6jtSkIit.js';

// ce645a5d4 s (exported n): owner names for artifacts another account shared. No account here, no shared rows.
export const useArtifactOwners = () => noOwner;
const noOwner = () => undefined;

// cbbbbbd87 N: the claude.ai chat artifact preview (published screenshot / markdown excerpt); only for source "chat".
export const ChatArtifactPreview = () => null;

// shared-16 $l: the lazy artifact menu chunk handle Ns preloads on idle (`t && e?.enqueueIdle()`); none here.
export const artifactMenuItemsLazy = null;

// shared-16 uu: the official artifact menu. c69e9937a on renders it for an item without `menu` that has menu actions or
// `menuExtras`: { item, contextMenuTrigger } for a list row (uu -> fu: the row element itself becomes the context-menu
// trigger and carries data-popup-open while open; content in mode "context" = shared-frame qi, CdsContextMenu), else
// { item, trigger } with sn's official cn "More options for {label}" button (uu -> du: CdsDropdown Root / Trigger render
// = the trigger, Popup align "end", mode "dropdown"). The official content lists the claude.ai artifact actions, then
// the item's menuExtras (ce9de3a9d: `children:[m.artifact,v,y,l.menuExtras]`); the host has none of those actions
// (artifactMenuActions is empty), so the menu holds the item's menuExtras alone (CdsDropdown.Item rows, which are also
// CdsContextMenu.Item).
export function ArtifactItemMenu({ item, trigger, contextMenuTrigger, open, onOpenChange }) {
  const content = item?.menuExtras;
  if (contextMenuTrigger) {
    if (!content) return contextMenuTrigger;
    return <CdsContextMenu.Root open={open} onOpenChange={onOpenChange}>
      <CdsContextMenu.Trigger render={contextMenuTrigger} />
      <CdsContextMenu.Popup>{content}</CdsContextMenu.Popup>
    </CdsContextMenu.Root>;
  }
  if (!trigger || !content) return trigger ?? null;
  return <CdsDropdown.Root open={open} onOpenChange={onOpenChange}>
    <CdsDropdown.Trigger render={trigger} />
    <CdsDropdown.Popup align="end">{content}</CdsDropdown.Popup>
  </CdsDropdown.Root>;
}

// shared-16 Vl: the official per-item artifact actions (pin, rename, duplicate, copy link, remove, delete).
export const artifactMenuActions = () => [];
