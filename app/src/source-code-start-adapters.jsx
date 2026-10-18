// Local services for the original start-card view. Layout and row logic live in generated/code-start (2.42304.0
// cc43287c9 p6/a6/t3); this module answers the imports extract-code-start.mjs maps to it.
import React, { Children, Fragment, cloneElement, createContext, isValidElement, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { kt as createIntl } from './generated/chat/vendor-intl-Cf4IuK3L.js';
import { Icon } from './icons.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceTooltip, SourceTooltipGroup } from './source-tooltip.jsx';
import { SourcePopover, useSourcePopover } from './source-popover.jsx';
import { backlogTitle, backlogDetail } from './task-backlog-model.mjs';
import { dismissalsPrefKey } from './generated/code-start/model.mjs';
import { previewCardClassName, previewCardPadding } from './generated/code-start/preview-card.mjs';
import { getLocale, t } from '../electron/i18n/index.mjs';
import { registerLocalizedMessage } from './source-chat-adapters.jsx';

// sessions: P3's awaiting sessions ({id, type, isSsh, title, ask, stamp}); splitPane: shared-2 qh isSplitPane.
export const StartHostContext = createContext({ sessions: [], settled: false, splitPane: false, onOpenSession() {} });
export const StartTooltip = SourceTooltip;
export const StartTooltipGroup = SourceTooltipGroup;
// E4/D4: title and tldr of a suggested task (task-backlog-model u0/d0).
export const startTaskTitle = backlogTitle;
export const startTaskDetail = backlogDetail;
/** O4: the task's prompt text, normalized like the prompt the message box takes (insertTakenPrompt). */
export function startTaskPrompt(item) {
  return String(item?.prompt ?? '').replace(/\r\n?/g, '\n').trim();
}
export function StartIcon({ size, ...props }) {
  const pixels = size === 'xs' ? 12 : 16;
  return <Icon {...props} size={pixels} style={{ fontSize: `calc(${pixels / 16}rem * var(--cds-rem-scale, 1))` }} />;
}
export function StartButton({ tooltip, ...props }) {
  const button = <SourceSettingsButton {...props} iconSize="auto" />;
  return tooltip ? <SourceTooltip content={tooltip}>{button}</SourceTooltip> : button;
}
// Q/Z (react-intl useIntl/FormattedMessage) over the local catalog: the English message is looked up in zh-CN by t().
// As in the official react-intl (vendor-intl Pt/Ft/Bt), a rich-text result (e.g. "<status>Blocked</status> {title}") and
// the chunks a tag function receives come back keyed: each element in its own keyed Fragment.
const keyedParts = parts => Children.toArray(parts).map((part, index) => (isValidElement(part) ? <Fragment key={index}>{part}</Fragment> : part));
const keyedValues = values => values && Object.fromEntries(Object.entries(values)
  .map(([name, value]) => [name, typeof value === 'function' ? chunks => value(keyedParts(chunks)) : value]));
export function createStartIntl(locale = getLocale()) {
  const intl = createIntl({ locale, defaultLocale: locale, messages: {} });
  return { ...intl, formatMessage: (message, values) => {
    const id = message.id || message.defaultMessage;
    const result = intl.formatMessage({ ...message, id, defaultMessage: t(message.defaultMessage) }, keyedValues(values));
    return Array.isArray(result) ? keyedParts(result) : result;
  } };
}
export function useStartIntl() {
  const locale = getLocale();
  return useMemo(() => createStartIntl(locale), [locale]);
}
export function StartMessage({ values, ...message }) { return useStartIntl().formatMessage(message, values); }
// LocalizedMessage of the chat adapters formats through StartMessage; registered from here so that module stays out of
// the vendor-intl import chain (see source-chat-adapters.jsx).
registerLocalizedMessage(StartMessage);
/** P3: Home's awaiting sessions. The host computes them from local approvals (code-start-host-model startWaitingSessions). */
export function useWaitingSessions() {
  const host = useContext(StartHostContext);
  return { sessions: host.sessions, settled: host.settled };
}
/** PO: open a session (a row, or the session a suggested task just started beside the draft). */
export function useStartNavigation() {
  const { onOpenSession } = useContext(StartHostContext);
  return useCallback((_event, session) => onOpenSession(session.id), [onOpenSession]);
}
/** qh: the split-pane context. a6 hides waiting/resume rows when Home is one pane of a split. */
export function useStartSplitPane() {
  const { splitPane } = useContext(StartHostContext);
  return splitPane ? { isSplitPane: true } : null;
}
// dr/_f: a session row's href and its drag-to-split intent. The start card's rows are not drag sources here (the
// local split view takes its drags from the sidebar), so the row gets no intent props.
const noSessionHref = () => null;
export function useStartSessionHref() { return noSessionHref; }
export function startDragIntent() { return undefined; }

// fs/ms (shared-28): a persisted preference and whether preferences have loaded. The start card's only one is d3's
// `startCardDismissals`, kept in this window's localStorage under the same key as before (existing choices carry over)
// and synced across windows (storage event) and start cards in one window (prefEvent). Storage is synchronous, so
// preferences are always settled.
const prefEvent = 'openclaude-start-card-pref';
const prefReaders = {
  [dismissalsPrefKey]: value => (value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter(([, stamp]) => typeof stamp === 'string')) : undefined),
};
function prefStorage() {
  try { return globalThis.window?.localStorage ?? null; } catch { return null; }
}
// The stored value; `missing` when storage holds none, `current` when storage is unavailable or holds something else.
function readPref(key, missing, current = missing) {
  const storage = prefStorage();
  if (!storage) return current;
  try {
    const raw = storage.getItem(key);
    if (raw == null) return missing;
    const value = (prefReaders[key] ?? (parsed => parsed))(JSON.parse(raw));
    return value === undefined ? current : value;
  } catch { return current; }
}
export function useStartPref(key, fallback) {
  const [value, setValue] = useState(() => readPref(key, fallback));
  const latest = useRef(value);
  latest.current = value;
  const initial = useRef(fallback);
  useEffect(() => {
    const target = globalThis.window;
    if (typeof target?.addEventListener !== 'function') return undefined;
    const sync = () => setValue(readPref(key, initial.current, latest.current));
    const storage = event => { if (event.key === key || event.key === null) sync(); };
    const local = event => { if (event.detail === key) sync(); };
    target.addEventListener(prefEvent, local);
    target.addEventListener('storage', storage);
    return () => { target.removeEventListener(prefEvent, local); target.removeEventListener('storage', storage); };
  }, [key]);
  const update = useCallback(next => {
    // Like fs, an updater sees the stored value (another window may have written since this one rendered).
    const value = typeof next === 'function' ? next(readPref(key, initial.current, latest.current)) : next;
    latest.current = value;
    setValue(value);
    try {
      prefStorage()?.setItem(key, JSON.stringify(value));
      globalThis.window?.dispatchEvent?.(new CustomEvent(prefEvent, { detail: key }));
    } catch { /* Keep this opening usable if storage is unavailable. */ }
  }, [key]);
  return [value, update];
}
export function useStartPrefsSettled() { return true; }

function assignRef(ref, node) {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}
// A popup that reports the pointer entering/leaving it, on the SourcePopover node. `focus`: focus moving inside it
// counts as entering too (a preview card stays open while it holds focus); a Popover's onPointerEnter is pointer-only.
function PopupPointer({ onEnter, onLeave, focus = false }) {
  const popover = useSourcePopover();
  const latest = useRef({ onEnter, onLeave });
  latest.current = { onEnter, onLeave };
  useEffect(() => {
    const node = popover?.node?.current;
    if (!node) return undefined;
    const enter = event => latest.current.onEnter?.(event);
    const leave = event => latest.current.onLeave?.(event);
    node.addEventListener('pointerenter', enter);
    node.addEventListener('pointerleave', leave);
    if (focus) node.addEventListener('focusin', enter);
    return () => { node.removeEventListener('pointerenter', enter); node.removeEventListener('pointerleave', leave); node.removeEventListener('focusin', enter); };
  }, [popover, focus]);
  return null;
}

// Kn (shared-156 Ei): the CDS PreviewCard. Root opens `delay` ms after the pointer rests on the trigger (or at once on
// keyboard focus) and closes `closeDelay` ms after it leaves trigger and card (Base UI PreviewCard defaults: 600/300);
// `lazy` content mounts only while open; onOpenChange reports each change. Popup is the official popup class (hR + gR
// padding) on the local SourcePopover positioner/portal, with data-cds="PreviewCard" and no focus move.
const PreviewCardContext = createContext(null);
function PreviewCardRoot({ delay = 600, closeDelay = 300, onOpenChange, children }) {
  const [open, setOpen] = useState(false), [anchor, setAnchor] = useState(null);
  const openRef = useRef(false), timer = useRef(null), latest = useRef(onOpenChange);
  latest.current = onOpenChange;
  const change = useCallback(next => {
    clearTimeout(timer.current);
    if (openRef.current === next) return;
    openRef.current = next;
    setOpen(next);
    latest.current?.(next);
  }, []);
  const later = useCallback((next, ms) => {
    clearTimeout(timer.current);
    if (openRef.current !== next) timer.current = setTimeout(() => change(next), ms);
  }, [change]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const value = useMemo(() => ({
    open, anchor, setAnchor, change,
    rest: () => later(true, delay), leave: () => later(false, closeDelay), stay: () => clearTimeout(timer.current),
  }), [open, anchor, change, later, delay, closeDelay]);
  return <PreviewCardContext.Provider value={value}>{children}</PreviewCardContext.Provider>;
}
function PreviewCardTrigger({ render }) {
  const card = useContext(PreviewCardContext);
  const own = render.props;
  const { setAnchor } = card;
  const ref = useCallback(node => { assignRef(own.ref, node); setAnchor(node); }, [own.ref, setAnchor]);
  return cloneElement(render, {
    ref,
    onPointerEnter: event => { own.onPointerEnter?.(event); if (event.pointerType !== 'touch') card.rest(); },
    onPointerLeave: event => { own.onPointerLeave?.(event); card.leave(); },
    onFocus: event => { own.onFocus?.(event); if (event.currentTarget?.matches?.(':focus-visible')) card.change(true); },
    onBlur: event => { own.onBlur?.(event); card.leave(); },
  });
}
function PreviewCardPopup({ side = 'bottom', align = 'start', sideOffset = 6, padding = 'lg', className = '', children }) {
  const card = useContext(PreviewCardContext);
  if (!card.open || !card.anchor) return null;
  return (
    <SourcePopover anchor={card.anchor} side={side} align={align} sideOffset={sideOffset} padding="none" scrollFade={false}
      initialFocus={false} dataCds="PreviewCard" onClose={() => card.change(false)}
      className={`${previewCardClassName} ${previewCardPadding[padding] ?? previewCardPadding.lg} ${className} oc-start-preview`}>
      <PopupPointer onEnter={card.stay} onLeave={card.leave} focus />
      {children}
    </SourcePopover>
  );
}
export const StartPreviewCard = { Root: PreviewCardRoot, Trigger: PreviewCardTrigger, Popup: PreviewCardPopup };

// sd (shared-frame Zi): the CDS Popover that a6's rest row ("Claude is blocked in # sessions", "# suggested tasks")
// opens. Root is controlled (open/onOpenChange); Trigger renders the row button with Base UI's popover trigger props
// (aria-haspopup="dialog", aria-expanded, aria-controls) and toggles on press; Popup is SourcePopover (data-cds Popover,
// Escape / outside press / focus-out close) with --anchor-width for the official min-w-(--anchor-width) class.
const PopoverContext = createContext(null);
function PopoverRoot({ open = false, onOpenChange, children }) {
  const [anchor, setAnchor] = useState(null);
  const id = useId();
  const latest = useRef(onOpenChange);
  latest.current = onOpenChange;
  const change = useCallback((next, event) => latest.current?.(next, event), []);
  const value = useMemo(() => ({ open: !!open, anchor, setAnchor, id, change }), [open, anchor, id, change]);
  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}
function PopoverTrigger({ render }) {
  const popover = useContext(PopoverContext);
  const own = render.props;
  const { setAnchor } = popover;
  const ref = useCallback(node => { assignRef(own.ref, node); setAnchor(node); }, [own.ref, setAnchor]);
  return cloneElement(render, {
    ref,
    'aria-haspopup': 'dialog',
    'aria-expanded': popover.open,
    'aria-controls': popover.open ? popover.id : undefined,
    onClick: event => { own.onClick?.(event); popover.change(!popover.open, event); },
  });
}
function PopoverPopup({ side = 'bottom', align = 'center', sideOffset = 6, padding = 'lg', className = '', onPointerEnter, 'aria-label': label, children }) {
  const popover = useContext(PopoverContext);
  if (!popover.open || !popover.anchor) return null;
  const width = popover.anchor.getBoundingClientRect?.().width;
  return (
    <SourcePopover anchor={popover.anchor} id={popover.id} side={side} align={align} sideOffset={sideOffset} padding={padding} label={label}
      className={`${className} oc-start-popup`} style={width ? { '--anchor-width': `${width}px` } : undefined}
      onClose={(_reason, event) => popover.change(false, event)}>
      <PopupPointer onEnter={onPointerEnter} />
      {children}
    </SourcePopover>
  );
}
export const StartPopover = { Root: PopoverRoot, Trigger: PopoverTrigger, Popup: PopoverPopup };
