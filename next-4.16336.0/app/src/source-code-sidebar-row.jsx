import React, { useId, useLayoutEffect, useRef } from 'react';
import { CurrentSidebarRow, SidebarRowMoreControl } from './generated/code-current/sidebar-row-view.mjs';
import { CdsDensityContext as SidebarCdsDensity } from './generated/view-tabs/index.js';
import { SidebarLabelMenuOpen } from './generated/code-current/sidebar-fade-label.mjs';
import { SidebarPrCardContext, SidebarPrGlyph, sidebarPrCoveredControl } from './generated/code-current/sidebar-pr-card.mjs';
import { SidebarDescription, sidebarRightDecoration } from './generated/code-current/sidebar-details-view.mjs';
import { SidebarNestedCaret } from './generated/code-current/sidebar-nested-caret.mjs';
import { useNestedCaretHost } from './source-sidebar-nested-caret-adapters.mjs';
import { SidebarLabelInteraction, SidebarCdsIcon } from './source-sidebar-current-adapters.jsx';
import { CodeSessionStatusMark, CodeSessionStatusAnnouncement } from './source-sidebar-status-adapters.jsx';

// The outer host owns selection, drag and persistence. The original KT (3.6556.2 shared-18 Ak) owns
// row geometry, labels, control slots, inline rename and focus restoration.
// 3.6556.2 shared-21 Zee: multiSelected = the row key is in the bulk selection (shared-6 iA: selectedKeys.has(key)),
// selected = multiSelected || paneSelected; Ak then announces ", selected" (oirQ+bswp8) as an sr-only suffix.
// w10-shell-sidebar-row: a family head in a foldable bucket shows the nested caret. shared-21 Xee computes
// `Oe = Te !== null && O_(we, De) ? Te + n.id : void 0` and hands it through Zee to f0 as nestedCaretId (Te = the wC list's useId while the list is
// foldable, we = "head" from the uu tree-place provider, De = the presets gate, on here by D10) and f0 turns it into
// `nameSuffix: a === void 0 ? void 0 : u(h1, {headId: t.id, title: c.title}), nameId: a`. h1 is `u(g1, {headId,
// title, hidden: hv(headId)})`: `nestedHead.hidden` is this host's collapsed-family state. The id prefix is this row's
// useId (the host has no list-level id); the caret's toggle and multi-click guard reach g1 through
// source-sidebar-nested-caret-adapters.mjs.
export function SourceCodeSidebarRow({ view, details, title, label, pinned, selected, multiSelected, shown, nestedHead,
  menu, menuOpen, anyMenuOpen, contextMenuOpen, dragging, renameRequested, onRenameStarted, onRename, onKeyDown, ...props }) {
  const startEditRef = useRef(null);
  const caretPrefix = useId();
  const nestedCaretId = nestedHead ? caretPrefix + nestedHead.id : undefined;
  useNestedCaretHost(nestedHead?.id, nestedHead?.onToggle, nestedHead?.guard);
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
  const nameSuffix = nestedCaretId === undefined ? undefined : <SidebarNestedCaret headId={nestedHead.id} title={label} hidden={!!nestedHead.hidden}/>;
  // f0: `l = c !== void 0 || a !== void 0` (a PR tail or a caret), V = o ?? (l ? null : void 0), I = c ?? (o === null && !l ? void 0 : null).
  const suffixed = tail !== undefined || nestedCaretId !== undefined;
  return <SidebarPrCardContext.Provider value={{ menuOpen: !!menuOpen || !!anyMenuOpen, rowCardOpen: !!dragging }}>
    <SidebarLabelInteraction.Provider value={!!dragging || !!menuOpen}>
      <SidebarLabelMenuOpen.Provider value={!!menuOpen}>
        <CurrentSidebarRow {...props} variant="session" selected={selected || !!multiSelected} multiSelected={!!multiSelected}
          className={view.archived ? "text-muted opacity-50" : undefined}
          aria-current={shown ? 'page' : undefined}
          icon={pinned ? <SidebarCdsIcon name="Code"/> : null}
          rightDecoration={decoration ?? (suffixed ? null : undefined)}
          tail={tail ?? (decoration === null && !suffixed ? undefined : null)} tailBesideControls
          nameSuffix={nameSuffix} nameId={nestedCaretId}
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
