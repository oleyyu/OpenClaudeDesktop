import React, { useLayoutEffect, useRef } from 'react';
import { CurrentSidebarRow, SidebarRowMoreControl } from './generated/code-current/sidebar-row-view.mjs';
import { CdsDensityContext as SidebarCdsDensity } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { SidebarLabelMenuOpen } from './generated/code-current/sidebar-fade-label.mjs';
import { SidebarPrCardContext, SidebarPrGlyph, sidebarPrCoveredControl } from './generated/code-current/sidebar-pr-card.mjs';
import { SidebarDescription, sidebarRightDecoration } from './generated/code-current/sidebar-details-view.mjs';
import { SidebarLabelInteraction, SidebarCdsIcon } from './source-sidebar-current-adapters.jsx';
import { CodeSessionStatusMark, CodeSessionStatusAnnouncement } from './source-sidebar-status-adapters.jsx';

// The outer host owns selection, drag and persistence. The original KT owns
// row geometry, labels, control slots, inline rename and focus restoration.
export function SourceCodeSidebarRow({ view, details, title, label, pinned, selected, shown,
  menu, menuOpen, anyMenuOpen, contextMenuOpen, dragging, renameRequested, onRenameStarted, onRename, onKeyDown, ...props }) {
  const startEditRef = useRef(null);
  useLayoutEffect(() => {
    if (renameRequested) {
      startEditRef.current?.();
      onRenameStarted?.();
    }
  }, [renameRequested, onRenameStarted]);
  const decoration = sidebarRightDecoration({
    mark: view.mark ? <CodeSessionStatusMark view={view}/> : undefined,
    env: details.env,
  });
  const tail = details.showPrTail ? <SidebarPrGlyph pr={details.pr} place="title"/> : undefined;
  return <SidebarPrCardContext.Provider value={{ menuOpen: !!menuOpen || !!anyMenuOpen, rowCardOpen: !!dragging }}>
    <SidebarLabelInteraction.Provider value={!!dragging || !!menuOpen}>
      <SidebarLabelMenuOpen.Provider value={!!menuOpen}>
        <CurrentSidebarRow {...props} variant="session" selected={selected}
          className={view.archived ? "text-muted opacity-50" : undefined}
          aria-current={shown ? 'page' : undefined}
          icon={pinned ? <SidebarCdsIcon name="Code"/> : null}
          rightDecoration={decoration ?? (tail === undefined ? undefined : null)}
          tail={tail ?? (decoration === null ? undefined : null)} tailBesideControls
          coveredCell={sidebarPrCoveredControl(details.pr)}
          description={details.description === undefined ? undefined : <SidebarDescription line={details.description}/>}
          menu={menu} menuOpen={menuOpen} contextMenuOpen={contextMenuOpen}
          onRename={onRename} renameValue={label} renameMaxLength={200} startEditRef={startEditRef}
          onKeyDown={event => {
            if (event.key === 'F2' && onRename) { event.preventDefault(); startEditRef.current?.(); }
            onKeyDown?.(event);
          }}>
          <span className="relative">{title}<CodeSessionStatusAnnouncement view={view} pr={details.pr} env={details.env}/></span>
        </CurrentSidebarRow>
      </SidebarLabelMenuOpen.Provider>
    </SidebarLabelInteraction.Provider>
  </SidebarPrCardContext.Provider>;
}

// KT supplies this optional callback to a menu component when rename is
// available. The existing host menu starts the same editor through its ref.
export function SidebarCurrentMenuHost({ onRenameStart, children }) { return children; }

// Sidebar owns a compact CDS scope independently of the workspace density.
export function SourceSidebarRowMore({ label, ...props }) {
  return <SidebarCdsDensity value="compact"><SidebarRowMoreControl {...props} aria-label={label}/></SidebarCdsDensity>;
}
