// Host answers for the CDS pieces the 2.42304.0 environment folder view imports (scripts/extract-code-ui-current.mjs
// maps them here for generated/code-current/environment-folder-view.mjs and environment-checkbox.mjs). The folder row,
// its controls `he`, the branch search order `pe` and the Checkbox `wA` are the original bindings; this module only
// supplies the overlay primitives they render into, because the saved-environment dialog is the host SourceDialog
// (MODAL_LAYER) and the CDS overlays of the view-tabs graph would stack under it (their layer context starts at 0).
import React, { createContext, forwardRef, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CdsButton, CdsDensityContext, CdsIcon, cdsClassNames } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { EnvironmentTextInput } from './generated/code-current/environment-field-controls.mjs';
import { SourceMenu, menuTriggerProps, useMenuPopup } from './source-menu.jsx';
import { SourceTooltip, textOverflows } from './source-tooltip.jsx';
import { MODAL_LAYER } from './source-dialog.jsx';
import {
  selectTriggerClassName, selectTriggerVariantClassNames, selectTriggerModeClassNames, selectTriggerButtonClassName, selectEmptyClassName,
  selectFooterDividerClassName, selectFooterClassName, selectPopupSearchClassName, selectItemMatches, SelectFooterAction,
} from './generated/code-current/environment-select-parts.mjs';
import './source-environment-menu.css';

const assignRef = (ref, node) => { if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; };
// Base UI's change details: the reason, the native event and cancel().
const changeDetails = (reason, event) => {
  let canceled = false;
  return { reason, event, cancel() { canceled = true; }, get isCanceled() { return canceled; } };
};

// shared-frame Oc (Zp, the CDS Tooltip). he/me pass content (a node or a function answering it on open), side,
// open and lazy. SourceTooltip takes the same props; Base UI's logical sides map to the physical ones it places by, and
// `lazy` (mount the popup on first open) has no counterpart because SourceTooltip renders its popup only while open.
const LOGICAL_SIDES = { 'inline-start': ['left', 'right'], 'inline-end': ['right', 'left'] };
const rootDirection = () => (typeof document !== 'undefined' && document.documentElement?.dir === 'rtl' ? 1 : 0);
export function EnvironmentTooltip({ lazy: _lazy, side, ...props }) {
  return <SourceTooltip {...props} side={LOGICAL_SIDES[side]?.[rootDirection()] ?? side} />;
}

// shared-frame Dc (gm, OverflowTooltip): a single-line span (its official classes and data-cds) that shows its text in a
// tooltip only while it is truncated. he wraps a string note ("Not a Git repository") in it.
export function EnvironmentOverflowText({ className, side, align, sideOffset, delay, collisionPadding, hoverable, lazy: _lazy, children, ...rest }) {
  const text = useRef(null);
  return <SourceTooltip side={side} align={align} sideOffset={sideOffset} delay={delay} collisionPadding={collisionPadding} hoverable={hoverable}
    content={() => (textOverflows(text.current, { subpixel: true }) ? children : undefined)}>
    <span {...rest} ref={text} data-cds="OverflowTooltip" className={cdsClassNames('block min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap', className)}>{children}</span>
  </SourceTooltip>;
}

// vendor-frame Q (Base UI Checkbox.Root) under wA: a span role=checkbox carrying the checked/unchecked/indeterminate and
// disabled state attributes the CDS classes key on (group-data-[checked]/cb…), focusable unless disabled, toggled by a
// click or Space (useButton, non-native), Enter submitting the enclosing form through its first submit button (Fg),
// followed by the visually hidden native input (za) that keeps form semantics.
const VISUALLY_HIDDEN = { clipPath: 'inset(50%)', overflow: 'hidden', whiteSpace: 'nowrap', border: 0, padding: 0, width: 1, height: 1, margin: -1, position: 'fixed', top: 0, left: 0 };
function submitButton(form) {
  for (const element of form?.elements ?? []) if ((element.tagName === 'BUTTON' || element.tagName === 'INPUT') && element.type === 'submit') return element;
  return null;
}
export const EnvironmentCheckboxRoot = forwardRef(function EnvironmentCheckboxRoot({
  checked: controlled, defaultChecked = false, indeterminate = false, disabled = false, readOnly = false, required = false,
  onCheckedChange, name, value, form, inputRef, nativeButton: _nativeButton, render: _render, children, onClick, onKeyDown, onKeyUp, ...rest
}, ref) {
  const [own, setOwn] = useState(defaultChecked);
  const checked = controlled ?? own;
  const toggle = event => {
    if (disabled || readOnly) return;
    const details = changeDetails('none', event.nativeEvent ?? event);
    onCheckedChange?.(!checked, details);
    if (!details.isCanceled && controlled === undefined) setOwn(!checked);
  };
  const state = indeterminate ? { 'data-indeterminate': '' } : checked ? { 'data-checked': '' } : { 'data-unchecked': '' };
  return <>
    <span {...rest} ref={ref} role="checkbox" tabIndex={disabled ? -1 : 0} aria-checked={indeterminate ? 'mixed' : checked}
      aria-disabled={disabled || undefined} aria-readonly={readOnly || undefined} aria-required={required || undefined}
      {...state} data-disabled={disabled ? '' : undefined} data-readonly={readOnly ? '' : undefined} data-required={required ? '' : undefined}
      onClick={event => { onClick?.(event); if (event.defaultPrevented) return; event.preventDefault(); toggle(event); }}
      onKeyDown={event => {
        onKeyDown?.(event);
        if (event.defaultPrevented || disabled) return;
        if (event.key === ' ') event.preventDefault();
        else if (event.key === 'Enter') {
          event.preventDefault();
          const submit = submitButton(event.currentTarget.closest?.('form'));
          if (submit && !submit.disabled) submit.click();
        }
      }}
      onKeyUp={event => { onKeyUp?.(event); if (!event.defaultPrevented && event.key === ' ') toggle(event); }}>
      {children}
    </span>
    <input ref={inputRef} type="checkbox" name={name} value={value} form={form} checked={checked} disabled={disabled} required={required}
      aria-hidden="true" tabIndex={-1} readOnly style={VISUALLY_HIDDEN} />
  </>;
});

// shared-frame aD under wA: a disabled checkbox explains itself with its reason (Tl, the disabled-reason tooltip).
export function EnvironmentDisabledReason({ reason, children }) {
  return reason === undefined ? children : <SourceTooltip disabledReason={reason}>{children}</SourceTooltip>;
}

// shared-frame qa (EC, the CDS Menu) as he uses it: a controlled Root (open, modal, onOpenChange(open, {reason})), a
// TriggerButton (Menu.Trigger rendering the CDS Button plus its caret oC), and a SearchablePopup (yC) over Group /
// GroupLabel / Separator / Header / Item. The popup is the host SourceMenu.Popup, raised over the dialog's modal layer.
const MenuContext = createContext(null);
// SourceMenu close reasons -> Base UI's.
const BASE_REASONS = { 'item-click': 'item-press' };

function MenuRoot({ open: controlled, defaultOpen = false, onOpenChange, children }) {
  const [own, setOwn] = useState(defaultOpen);
  const open = controlled ?? own;
  const triggerRef = useRef(null), popupId = useId(), latest = useRef(onOpenChange);
  latest.current = onOpenChange;
  const isControlled = controlled !== undefined;
  const setOpen = useCallback((next, reason, event) => {
    const details = changeDetails(reason, event);
    latest.current?.(next, details);
    if (!details.isCanceled && !isControlled) setOwn(next);
  }, [isControlled]);
  const value = useMemo(() => ({ open, setOpen, triggerRef, popupId }), [open, setOpen, popupId]);
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

// shared-frame oC: the trigger's CaretDown, xs unless the density and size resolve to md or more (aC: ca(density,size) >= 4).
const DENSITY_STEP = { compact: 2, comfortable: 4 }, SIZE_STEP = { xs: -2, sm: -1, base: 0, lg: 1 };
function MenuCaret({ size }) {
  const density = useContext(CdsDensityContext);
  const step = (DENSITY_STEP[density] ?? 4) + (SIZE_STEP[size ?? 'base'] ?? 0);
  return <CdsIcon name="CaretDown" size={step >= 4 ? 'sm' : 'xs'} data-cds-part="menu-caret" className="shrink-0 opacity-60" />;
}

const MenuTriggerButton = forwardRef(function MenuTriggerButton({ children, size, disabled, busy, onClick, onKeyDown, ...rest }, ref) {
  const menu = useContext(MenuContext);
  const inert = !!(disabled || busy);
  const trigger = menuTriggerProps({ open: menu.open, disabled: inert, onOpen: (_where, event) => menu.setOpen(true, 'trigger-press', event?.nativeEvent) });
  return <CdsButton {...rest} ref={node => { menu.triggerRef.current = node; assignRef(ref, node); }} size={size} disabled={disabled} busy={busy}
    aria-haspopup={trigger['aria-haspopup']} aria-expanded={trigger['aria-expanded']} data-popup-open={trigger['data-popup-open']}
    aria-controls={menu.open ? menu.popupId : undefined}
    onKeyDown={event => { onKeyDown?.(event); if (!event.defaultPrevented) trigger.onKeyDown(event); }}
    onClick={event => { onClick?.(event); if (!event.defaultPrevented && !inert) menu.setOpen(!menu.open, 'trigger-press', event.nativeEvent); }}>
    {children}
    <MenuCaret size={size} />
  </CdsButton>;
});

// yC gC: a printable key (or Backspace / forward Delete) typed while a row has focus goes to the search field.
function typedKey(event) {
  const altGraph = event.getModifierState?.('AltGraph');
  return ((event.key.length === 1 && event.key !== ' ') || event.key === 'Backspace' || (event.key === 'Delete' && !event.shiftKey))
    && (!event.ctrlKey || altGraph) && !event.metaKey && (!event.altKey || altGraph) && event.keyCode !== 229;
}
// yC O: apply that key to the field's selection through the native value setter, so React sees an input event.
function applyKey(input, key) {
  const { value } = input;
  let start = input.selectionStart ?? value.length, end = input.selectionEnd ?? value.length;
  const erase = key === 'Backspace' || key === 'Delete', text = erase ? '' : key;
  if (erase && start === end) {
    if (key === 'Backspace') start = Math.max(0, start - ((value.codePointAt(start - 2) ?? 0) > 0xffff ? 2 : 1));
    else end = Math.min(value.length, end + ((value.codePointAt(end) ?? 0) > 0xffff ? 2 : 1));
  }
  const next = value.slice(0, start) + text + value.slice(end), view = input.ownerDocument.defaultView ?? window;
  Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value')?.set?.call(input, next);
  input.setSelectionRange(start + text.length, start + text.length);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

// yC's header: the CDS TextInput (tx) with its menu classes and the rule under it. R3-home: it is the popup's header
// (SourceMenu.Popup header, shared-frame KS -> Hx), so it stays in place while only the rows scroll.
export function SearchField({ inputRef, query, searchLabel, onChange, onSubmitQuery }) {
  const popup = useMenuPopup();
  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [inputRef]);
  return <>
    <EnvironmentTextInput ref={inputRef} value={query} onChange={event => onChange(event.target.value)}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) { event.stopPropagation(); return; }
        if (event.key === 'Enter') {
          const text = query.trim();
          if (onSubmitQuery && text !== '' && !event.repeat && !event.shiftKey && !event.altKey) {
            event.preventDefault();
            onSubmitQuery(text);
            popup?.close('imperative-action');
          }
          event.stopPropagation();
          return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          const rows = event.currentTarget.closest('[role="menu"]')?.querySelectorAll('[role^="menuitem"]:not([aria-disabled="true"])');
          const row = event.key === 'ArrowDown' ? rows?.[0] : rows?.[rows.length - 1];
          if (row) { event.preventDefault(); event.stopPropagation(); row.focus(); }
          return;
        }
        if (event.key !== 'Escape' && event.key !== 'Tab') event.stopPropagation();
      }}
      placeholder={searchLabel} aria-label={searchLabel} autoComplete="off" data-1p-ignore="true"
      className="!border-transparent !bg-transparent !shadow-none compact:!ps-2 comfortable:!ps-2.5" />
    <div className="-mx-[var(--cds-menu-gutter,0.25rem)] mt-[var(--cds-menu-gutter,0.25rem)] mb-1 h-px bg-border" />
  </>;
}

// yC's state and key handling: the query (controlled or own), the header field, and a printable key typed on a row
// going to the field (gC/O). The rows get the trimmed lowercased query and the trimmed query.
function useSearchablePopup({ searchLabel, query: controlledQuery, onQueryChange, onSubmitQuery, onKeyDown, children }) {
  const [own, setOwn] = useState('');
  const query = controlledQuery ?? own;
  const input = useRef(null);
  const change = value => { setOwn(value); onQueryChange?.(value); };
  return {
    header: <SearchField inputRef={input} query={query} searchLabel={searchLabel} onChange={change} onSubmitQuery={onSubmitQuery} />,
    onKeyDown: event => {
      const field = input.current;
      if (!field || event.target.closest?.('input, textarea, [contenteditable]') || event.nativeEvent.isComposing || !typedKey(event)) {
        event.preventBaseUIHandler ??= () => {};
        onKeyDown?.(event);
        return;
      }
      event.preventDefault(); event.stopPropagation();
      field.focus({ preventScroll: true });
      applyKey(field, event.key);
    },
    rows: children(query.trim().toLowerCase(), query.trim()),
  };
}

/** shared-frame yC (EC.SearchablePopup) over the host SourceMenu.Popup: any popup props, plus searchLabel / query /
 *  onQueryChange / onSubmitQuery and children(lowercasedQuery, query). The environment picker (h2) opens one. */
export function EnvironmentSearchablePopup({ searchLabel, query, onQueryChange, onSubmitQuery, onKeyDown, children, label, ...popup }) {
  const parts = useSearchablePopup({ searchLabel, query, onQueryChange, onSubmitQuery, onKeyDown, children });
  return <SourceMenu.Popup {...popup} label={label ?? searchLabel} initialHighlight={null} header={parts.header} onKeyDown={parts.onKeyDown}>
    {parts.rows}
  </SourceMenu.Popup>;
}

function MenuSearchablePopup(props) {
  const menu = useContext(MenuContext);
  return menu.open ? <SearchablePopupOpen {...props} menu={menu} /> : null;
}
export function SearchablePopupOpen({ menu, children, searchLabel, query, onQueryChange, onSubmitQuery, onKeyDown, side = 'bottom', align = 'start', sideOffset, className = '' }) {
  const popup = useRef(null);
  const parts = useSearchablePopup({ searchLabel, query, onQueryChange, onSubmitQuery, onKeyDown, children });
  // Base UI hands focus back to the trigger when the menu closes with focus inside it (he closes it on Tab itself).
  useLayoutEffect(() => {
    const trigger = menu.triggerRef;
    return () => {
      const doc = popup.current?.ownerDocument;
      if (!doc) return;
      const node = popup.current;
      queueMicrotask(() => {
        const active = doc.activeElement;
        if ((!active || active === doc.body || !active.isConnected || node?.contains(active)) && trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
      });
    };
  }, [menu.triggerRef]);
  return <SourceMenu.Popup id={menu.popupId} anchor={menu.triggerRef.current} side={side} align={align} sideOffset={sideOffset}
    layerBase={MODAL_LAYER.z} label={searchLabel} initialHighlight={null} popupRef={popup}
    className={`saved-environment-branch-popup ${className}`.trim()}
    onClose={reason => menu.setOpen(false, BASE_REASONS[reason] ?? reason)}
    header={parts.header} onKeyDown={parts.onKeyDown}>
    {parts.rows}
  </SourceMenu.Popup>;
}

export const EnvironmentMenu = Object.freeze({
  Root: MenuRoot, TriggerButton: MenuTriggerButton, SearchablePopup: MenuSearchablePopup,
  Group: SourceMenu.Group, GroupLabel: SourceMenu.GroupLabel, Separator: SourceMenu.Separator, Header: SourceMenu.Header, Item: SourceMenu.Item,
});

// shared-frame xA (the CDS Select, Ak over Base UI Combobox) as the dialog's Folders field uses it for "+ Add"
// (cd8823d73 ge: outline sm, hideCaret, value null, renderTriggerValue Add-icon + "Add", end-aligned popup
// "w-max min-w-48 max-w-96"; ca690a791 fn: items Er, emptyMessage "No recent folders", footer FooterAction "Choose…").
// The trigger is Ak's select-mode markup with its original classes (HO + UO[variant] + WO.select + pe-sm, the button qO,
// the value span) and the popup's Empty (dk), footer rule (fk) / slot (pk), search field (rk, shown past five items as
// Ak's `a.length > 5`) and filter (Sk) are the generated originals. Host: the popup is SourceMenu.Popup (menu / menuitem
// rows instead of the Combobox's listbox / option), raised over the dialog's modal layer, and its FooterAction is a
// menuitem so the arrow keys reach it.
const SelectFooterItem = forwardRef(function SelectFooterItem(props, ref) {
  return <SelectFooterAction ref={ref} role="menuitem" tabIndex={-1} {...props} />;
});
// Ak's footer under the list: the fk rule and the pk slot (footerDivider), the consumer's footer({close}). Closing hands
// focus back to the trigger, as Base UI does when the popup closes with focus inside it.
function SelectFooter({ footer, divider }) {
  const popup = useMenuPopup();
  return <>
    {divider && <div aria-hidden="true" className={selectFooterDividerClassName} />}
    <div className={divider ? selectFooterClassName : 'shrink-0'}>{typeof footer === 'function' ? footer({ close: () => popup?.close('item-click') }) : footer}</div>
  </>;
}
// Ak's PopupSearch (rk) over the rows: typing filters them (Sk), ArrowDown enters them, Enter takes the first match.
function SelectSearch({ query, label, onQuery, first, onPick }) {
  const popup = useMenuPopup();
  return <input className={selectPopupSearchClassName} value={query} aria-label={label} autoComplete="off" data-1p-ignore="" data-lpignore="true" autoFocus
    onChange={event => onQuery(event.target.value)}
    onKeyDown={event => {
      if (event.key !== 'Enter' || event.nativeEvent.isComposing || first === undefined) return;
      event.preventDefault(); event.stopPropagation();
      onPick(first.value);
      popup?.close('item-click');
    }} />;
}
function SelectPopup({ anchor, trigger, id, label, align, popupClassName, items, searchable, emptyMessage, footer, footerDivider, initialHighlight, onPick, onClose }) {
  const [query, setQuery] = useState('');
  const text = query.trim();
  const shown = searchable && text ? items.filter(item => selectItemMatches(item, text)) : items;
  return <SourceMenu.Popup id={id} anchor={anchor} trigger={trigger} side="bottom" align={align} sideOffset={6} layerBase={MODAL_LAYER.z} label={label}
    className={`environment-select-popup ${popupClassName ?? 'w-[var(--anchor-width)] min-w-[12rem]'}`} initialHighlight={searchable ? null : initialHighlight}
    onClose={onClose} header={searchable ? <SelectSearch query={query} label={label} onQuery={setQuery} first={shown[0]} onPick={onPick} /> : undefined}
    footer={footer ? <SelectFooter footer={footer} divider={footerDivider} /> : undefined}>
    {shown.length ? shown.map(item => <SourceMenu.Item key={item.value} description={item.description} disabled={item.disabled}
      onClick={() => onPick(item.value)}>{item.label}</SourceMenu.Item>)
      : <div className={selectEmptyClassName}>{emptyMessage}</div>}
  </SourceMenu.Popup>;
}
export function EnvironmentSelect({
  items = [], value = null, onChange, emptyMessage, footer, footerDivider = true, variant = 'outline', size, hideCaret = false, renderTriggerValue,
  placeholder, className, popupClassName, align = 'start', fullWidth = true, disabled = false, searchable, 'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(null);
  const root = useRef(null), button = useRef(null), valueId = useId(), popupId = useId();
  const selected = items.find(item => item.value === value) ?? null;
  const trigger = menuTriggerProps({ open: !!open, disabled, onOpen: where => setOpen({ highlight: where }) });
  const shown = renderTriggerValue?.(selected) ?? selected?.label ?? <span className="font-normal font-control text-muted">{placeholder ?? '\u00A0'}</span>;
  return <>
    <div ref={root} data-cds="Combobox" {...(size && size !== 'base' ? { 'data-size': size } : {})} data-disabled={disabled || undefined}
      className={cdsClassNames(`${selectTriggerClassName} ${selectTriggerVariantClassNames[variant]} ${selectTriggerModeClassNames.select} pe-sm ${fullWidth ? 'w-full min-w-0' : 'shrink-0'}`, className)}>
      <button ref={button} type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup={trigger['aria-haspopup']} aria-expanded={trigger['aria-expanded']}
        data-popup-open={trigger['data-popup-open']} aria-controls={open ? popupId : undefined} className={selectTriggerButtonClassName}
        onKeyDown={trigger.onKeyDown} onClick={() => setOpen(previous => (previous ? null : { highlight: undefined }))}>
        <span id={valueId} className="min-w-0 flex-1 truncate">{shown}</span>
        {!hideCaret && <CdsIcon name="CaretDown" size="sm" className="me-0.5 shrink-0 text-[color:var(--cds-text-stays-secondary,var(--cds-text-muted))] transition-colors group-hover/cbx:text-secondary" />}
      </button>
    </div>
    {open && <SelectPopup anchor={root.current} trigger={button.current} id={popupId} label={ariaLabel} align={align} popupClassName={popupClassName} items={items}
      searchable={searchable ?? items.length > 5} emptyMessage={emptyMessage} footer={footer} footerDivider={footerDivider} initialHighlight={open.highlight}
      onPick={pick => { setOpen(null); onChange?.(pick); }} onClose={() => setOpen(null)} />}
  </>;
}
EnvironmentSelect.FooterAction = SelectFooterItem;

