import React, { cloneElement, createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SourcePopover, useSourcePopover } from './source-popover.jsx';
import { SourceMenu } from './source-menu.jsx';
import { cdsClassNames } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { mergeProps } from './generated/view-tabs/vendor-frame-DfPJ1QmD.js';
import { QueryClient } from './generated/files-changes/file-browser-query.mjs';
import { openAfterCheck } from './generated/files-changes/menu-open-gate.mjs';
import { CONTEXT_MENU_ALIGN_OFFSET, CONTEXT_MENU_SIDE_OFFSET } from './menu-model.mjs';
import { t } from '../electron/i18n/index.mjs';

// Host services of the 2.42304.0 breadcrumb (code-current breadcrumb-view.mjs / breadcrumb-file.mjs, cfac349aa Kt/Jt/Yt
// and cd2efac6e Yl; files-changes breadcrumb-folder.mjs, cfac349aa Pt/Nt/Lt with ca7840910's compact tree). The view,
// the folder popover's open / hold / prefetch logic, its query and its list states are the generated originals; this
// module answers what they import from the desktop's design system and runtime.

const assignRef = (ref, node) => {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
};

// cfac349aa De = c0cdf4a08 _ (exported `t`): a segment's right-click menu. The trigger's contextmenu records the point,
// asks beforeOpen (Jt passes the gone hook's, c856385e2 V) and opens at once or, for a pending check, when it settles
// (c0cdf4a08 h, generated menu-open-gate.mjs) unless a press, a key or a blur comes first. The menu itself is the local
// SourceMenu (the segment items are SourceMenu items), not a Base UI ContextMenu.Root.
export function BreadcrumbContextMenu({ trigger, disabled, onOpenChange, beforeOpen, children }) {
  const [menu, setMenu] = useState(null);
  const returnFocus = useRef(null);
  const close = () => { setMenu(null); onOpenChange(false); };
  useEffect(() => {
    if (disabled && menu) { setMenu(null); onOpenChange(false); }
  }, [disabled, menu, onOpenChange]);
  return <>{React.cloneElement(trigger, { onContextMenu: event => {
    if (disabled) return;
    event.preventDefault(); event.stopPropagation();
    const anchor = event.currentTarget, box = anchor.getBoundingClientRect();
    returnFocus.current = anchor.ownerDocument.activeElement;
    const point = event.clientX === 0 && event.clientY === 0 ? { x: box.left, y: box.bottom } : { x: event.clientX, y: event.clientY };
    const open = () => { setMenu({ anchor, point }); onOpenChange(true); };
    const pending = beforeOpen?.();
    if (pending) openAfterCheck(anchor, pending, open);
    else open();
  } })}
    {menu && !disabled && <SourceMenu.Popup {...menu} trigger={null} side="bottom" align="start"
      sideOffset={CONTEXT_MENU_SIDE_OFFSET} alignOffset={CONTEXT_MENU_ALIGN_OFFSET} layer="contextmenu" dataCds="ContextMenu" contextMenuGuard="always"
      label={t('File actions')} onClose={close} finalFocus={() => returnFocus.current?.isConnected ? returnFocus.current : null}>
      {children}
    </SourceMenu.Popup>}
  </>;
}

// cfac349aa Pt's `O` = shared-frame Zi (nE: the CDS Popover's Root / Trigger / Popup). view-tabs publishes no Popover,
// so these sit on the local SourcePopover (the same positioner, portal layer, Escape / outside-press / focus-out
// dismissal and focus return as the CDS one). Root keeps Pt's controlled open state (Nt), Trigger merges its props and
// the tooltip's into the segment button with Base UI's own mergeProps (view-tabs), and Popup renders the "Files in
// {folder}" dialog. Popup's ref / initialFocus (the popup itself) and onFocus (Pt's T: focus the current or first row
// when the popup takes focus) reach the SourcePopover element through its context.
const FolderPopoverContext = createContext(null);
function FolderPopoverRoot({ open = false, onOpenChange, children }) {
  const [anchor, setAnchor] = useState(null);
  const id = useId();
  const latest = useRef(onOpenChange);
  latest.current = onOpenChange;
  const change = useCallback((next, event) => latest.current?.(next, { event }), []);
  const value = useMemo(() => ({ open: !!open, anchor, setAnchor, id, change }), [open, anchor, id, change]);
  return <FolderPopoverContext.Provider value={value}>{children}</FolderPopoverContext.Provider>;
}
function FolderPopoverTrigger({ render, ref, ...props }) {
  const popover = useContext(FolderPopoverContext);
  const own = render.props;
  const { setAnchor } = popover;
  const setNode = useCallback(node => { assignRef(own.ref, node); assignRef(ref, node); setAnchor(node); }, [own.ref, ref, setAnchor]);
  const merged = mergeProps(props, own);
  return cloneElement(render, {
    ...merged,
    ref: setNode,
    'aria-haspopup': 'dialog',
    'aria-expanded': popover.open,
    'aria-controls': popover.open ? popover.id : undefined,
    onClick: event => { merged.onClick?.(event); popover.change(!popover.open, event); },
  });
}
function FolderPopoverBridge({ popupRef, onFocus }) {
  const popover = useSourcePopover();
  const latest = useRef(onFocus);
  latest.current = onFocus;
  useLayoutEffect(() => {
    const node = popover?.node.current;
    if (!node) return undefined;
    assignRef(popupRef, node);
    // React's onFocus is the bubbling focusin; a listener on the popup runs before the portal's delegated handlers, as
    // Pt's own onFocus does before the CDS popup hands focus to its body.
    const focus = event => latest.current?.(event);
    node.addEventListener('focusin', focus);
    return () => { node.removeEventListener('focusin', focus); assignRef(popupRef, null); };
  }, [popover, popupRef]);
  return null;
}
function FolderPopoverPopup({ ref, initialFocus, onFocus, side, align, padding, collisionPadding, className = '', style, 'aria-label': label, children }) {
  const popover = useContext(FolderPopoverContext);
  if (!popover.open || !popover.anchor) return null;
  return <SourcePopover anchor={popover.anchor} id={popover.id} side={side} align={align} padding={padding} collisionPadding={collisionPadding}
    label={label} className={`${className} sfv-folder-popover`.trim()} style={style} initialFocus={initialFocus}
    onClose={(_reason, event) => popover.change(false, event)}>
    <FolderPopoverBridge popupRef={ref} onFocus={onFocus} />
    {children}
  </SourcePopover>;
}
export const FolderPopover = { Root: FolderPopoverRoot, Trigger: FolderPopoverTrigger, Popup: FolderPopoverPopup };

// Lt's loading placeholder: shared-frame tl (nd, the SkeletonGroup) around $c.Rows (dd = Object.assign(rd, { Rows: od })).
// Neither is a view-tabs public name. The DOM is nd's delayed-hold branch (data-hold="delayed": the official CSS reveals
// the group after its delay, and the sr-only label is written when that reveal starts) and od / rd's in-group rows
// (6 rows of a 20×20 icon and a 160/128/144-wide, 16-high bar, "flex h-control items-center gap-xs compact:px-2
// comfortable:px-2.5"). nd's wave stagger (--cds-skel-i in DOM order, Gu/qu = 2000/90 slots) is written at render time,
// as in source-transcript-states.jsx; nd's shown/hidden callbacks and cross-document phase sync have no local caller.
const SkeletonInGroup = createContext(false);
const SkeletonIndex = createContext(null);
const WAVE_SLOTS = Math.floor(2000 / 90);
const SETTLED_MS = 1e5; // Ju
export function FolderSkeletonGroup({ children, className, label }) {
  const text = label ?? t('Loading');
  const counter = { next: 0 };
  return <div data-cds="SkeletonGroup" data-motion="wave" data-hold="delayed" role="status" className={className}
    onAnimationStart={event => {
      if (event.animationName !== 'cds-placeholder-reveal' || event.target !== event.currentTarget) return;
      event.currentTarget.setAttribute('data-shown', '');
      const node = event.currentTarget.querySelector('[data-skeleton-label]');
      if (node && node.textContent === '') node.textContent = text;
    }}
    onAnimationEnd={event => {
      if (event.animationName !== 'cds-placeholder-reveal' || event.target !== event.currentTarget) return;
      event.currentTarget.style.setProperty('--cds-skel-settled', `${SETTLED_MS}ms`);
      event.currentTarget.setAttribute('data-settled', '');
    }}>
    <span className="sr-only" data-skeleton-label="" />
    <SkeletonInGroup.Provider value={true}>
      <SkeletonIndex.Provider value={counter}><div aria-hidden="true" className="contents">{children}</div></SkeletonIndex.Provider>
    </SkeletonInGroup.Provider>
  </div>;
}
function Skeleton({ width, height, className }) {
  const grouped = useContext(SkeletonInGroup), counter = useContext(SkeletonIndex);
  const [index] = useState(() => (counter ? counter.next++ : 0));
  if (grouped) return <div data-cds="Skeleton" className={cdsClassNames('h-[1em] max-w-full rounded bg-[var(--cds-skeleton-base)]', className)}
    style={{ width, height, '--cds-skel-i': String(index % WAVE_SLOTS) }} />;
  return <div data-cds="Skeleton" role="status"
    className={cdsClassNames('relative h-[1em] max-w-full overflow-hidden rounded bg-[var(--cds-skeleton-base)] after:absolute after:inset-0 after:animate-[cds-shimmer_2s_linear_infinite] after:bg-[linear-gradient(90deg,transparent,var(--cds-skeleton-sheen),transparent)] motion-reduce:after:hidden', className)}
    style={{ width, height }}><span className="sr-only">{t('Loading')}</span></div>;
}
const ROW_WIDTHS = [160, 128, 144], ROW_WIDTHS_NO_ICON = [120, 88, 104]; // id / ad
function SkeletonRows({ rows = 3, icon = true }) {
  const widths = icon ? ROW_WIDTHS : ROW_WIDTHS_NO_ICON;
  const groups = (typeof rows === 'number' ? [rows] : rows).filter(count => count > 0);
  const nodes = [];
  let row = 0;
  for (const [group, count] of (groups.length > 0 ? groups : [3]).entries()) {
    if (group > 0) nodes.push(<div key={`separator-${group}`} aria-hidden="true" data-slot="menu-skeleton-separator" className="compact:mx-2 comfortable:mx-2.5 my-1 h-px bg-border" />);
    for (const end = row + count; row < end; row++)
      nodes.push(<div key={row} aria-hidden={row > 0 || undefined} className="flex h-control items-center gap-xs compact:px-2 comfortable:px-2.5">
        {icon && <Skeleton width={20} height={20} />}
        <span aria-hidden={icon ? true : undefined} className="contents"><Skeleton width={widths[row % widths.length]} height={16} /></span>
      </div>);
  }
  return nodes;
}
export const FolderSkeleton = Object.assign(Skeleton, { Rows: SkeletonRows });

// The app's QueryClient (shared-23 `new _S({defaultOptions:{queries:{staleTime:3e5,refetchOnWindowFocus:!1,retry:…}}})`):
// the folder queries (J) set their own staleTime (10 s), retry: false for local listings, and meta noToast. The
// desktop's never-retry error classes are cloud / API errors; locally a failed listing is not retried (J's `lt`).
export const fileBrowserQueryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 3e5, refetchOnWindowFocus: false, retry: failureCount => failureCount < 3 } },
});

// cd2efac6e wt's local lister ({sessionId, scope: "local", root, listDirectory}) over the host's scoped folder listing
// (file-breadcrumb-model.mjs createBreadcrumbLister: absolute paths, `directory`, the symlink `link` state). Officially
// listDirectory is LocalSessions.listSessionDirectory(sessionId, dir).
export function folderLister(lister, sessionId) {
  if (!lister) return null;
  return {
    sessionId: sessionId ?? '',
    scope: 'local',
    root: lister.root,
    listDirectory: async dir => (await lister.list(dir)).map(({ name, path, directory, link }) => ({ name, path, isDirectory: !!directory, ...(link && { link }) })),
  };
}
