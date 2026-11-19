// Host adapters of the 4.16336.0 artifact library graph (scripts/extract-artifact-library-v4.mjs, round 2 unit
// artifact-library). Each export answers one original declaration the extractor names in HOST_ADAPTERS (pinned there by
// features and raw declaration sha256); the provenance `adapters[].difference` repeats why. Staged graph: nothing
// imports this module until the artifact-library cutover (region-plan productionSwitchNotBeforeBatch 9).
// The library lists this machine's files (source "cowork"), so the claude.ai artifact services (owners, the chat artifact
// preview, the official artifact menu chunk and its actions) have no backend here: each answers the official gate-closed
// value, exactly as the 3.6556.2 src/source-artifact-v3-adapters.jsx exports of the same names; the CDS menus now come
// from cds-core (4.16336.0) instead of view-tabs (3.6556.2).
import { CdsContextMenu, CdsDropdown } from './cds-core.mjs';

export { RouterLink, useIntl, FormattedMessage } from './source-routines-shared-adapters.jsx';

// c1b2dcb06 v (3.6556.2 ce645a5d4 s): owner names for artifacts another account shared. No account here, no shared rows.
export const useArtifactOwners = () => noOwner;
const noOwner = () => undefined;

// c33ae67d6 j (3.6556.2 cbbbbbd87 N): the chat artifact preview (published screenshot / markdown excerpt); the thumbnail
// renders it only for source "chat". U-49: the host follows it (source-artifact-chat-preview.jsx; no published screenshot).
export { ChatArtifactPreview } from './source-artifact-chat-preview.jsx';

// shared-140 zo (3.6556.2 shared-16 $l): the lazy artifact menu chunk handle the page preloads on idle; none here.
export const artifactMenuItemsLazy = null;

// shared-140 Xo (3.6556.2 shared-16 uu): the official artifact menu. c230724a2 Ns renders it for an item without `menu`
// that has menu actions or `menuExtras`: { item, contextMenuTrigger } for a list row (Xo -> Qo: the row element becomes
// the context-menu trigger and carries data-popup-open while open; content in mode "context"), else { item, trigger }
// with Ps's official Fs "More options for {label}" button (Xo -> Zo: dropdown Trigger render = the trigger, mode
// "dropdown"). The official content (shared-140 es) lists the claude.ai artifact actions, then the item's menuExtras;
// the host has none of those actions (artifactMenuActions is empty), so the menu holds the item's menuExtras alone
// (CdsDropdown.Item rows, which are also CdsContextMenu.Item).
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

// shared-140 wo (3.6556.2 shared-16 Vl): the official per-item artifact actions (pin, rename, duplicate, copy link,
// remove, delete); none on the host.
export const artifactMenuActions = () => [];

// shared-5 bC: a card's drag start onto the sidebar Starred list. The official function answers false (after resetting
// the drag store) unless the item is an unstarred frame artifact with onToggleStar and GrowthBook __gb__2021363468 is
// on; host items are local files (source "cowork" / "chat", never "frame") and the host does not serve that flag, so the official
// answer for every host call is false (the generator's HOST_ADAPTERS entry documents the branch).
export const beginStarDrag = () => false;
