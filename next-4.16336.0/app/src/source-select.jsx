import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { positionMenu, typeaheadMatch, typeaheadState } from './menu-model.mjs';
import { selectOptions, selectHighlight } from './select-model.mjs';
import { t } from '../electron/i18n/index.mjs';
import './source-select.css';

// 2.42304.0 shared-frame zk/Bk (the Combobox trigger's onKeyDown): once an Escape has
// closed the popup, the held key's auto-repeats on the same trigger are swallowed
// (preventDefault + stopPropagation) so they never reach an outer Dialog; a fresh
// (non-repeat) Escape clears the mark and behaves normally again.
const escapeClosedTriggers = new WeakSet();
export function markEscapeClosed(owner) {
  if (owner) escapeClosedTriggers.add(owner);
}
export function swallowRepeatedEscape(event) {
  const owner = event.currentTarget;
  if (event.key !== 'Escape' || event.defaultPrevented) return false;
  if (event.repeat && escapeClosedTriggers.has(owner)) { event.preventDefault(); event.stopPropagation(); return true; }
  escapeClosedTriggers.delete(owner);
  return false;
}

// Independent CDS Combobox single/select branch (shared-frame xb → Tb → Eb).
// Options are the caller's actual data; selection never changes on mere focus.
// triggerProps: extra attributes for the combobox button (a form's id, aria-describedby/-invalid/-required, data-*).
export function SourceSelect({ label, value, items, onChange, disabled = false, align = 'start', className = '', title, style, triggerProps = null,
  searchable: searchableOverride, renderTriggerValue, fullWidth = true, variant }) {
  const [open, setOpen] = useState(false), trigger = useRef(null);
  const id = useId(), selected = items.find(item => String(item.value) === String(value));
  const searchable = searchableOverride ?? items.length > 5;
  const [initial, setInitial] = useState('selected');
  const show = direction => { if (!disabled) { setInitial(direction); setOpen(true); } };
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  const close = restore => { setOpen(false); if (restore) trigger.current?.focus({ preventScroll: true }); };
  return <div className={`sselect ${className}`} data-cds="Combobox" data-disabled={disabled || undefined} data-variant={variant}
    style={{ ...(!fullWidth && { width: 'auto' }), ...style }}>
    <button {...triggerProps} ref={trigger} type="button" role="combobox" aria-label={label} title={title}
      aria-haspopup="listbox" aria-expanded={open && !disabled} aria-controls={open && !disabled ? id : undefined}
      data-value={value ?? ''} disabled={disabled} className="sselect-trigger"
      onClick={() => open ? close(false) : show('selected')}
      onKeyDown={event => {
        if (swallowRepeatedEscape(event)) return;
        if (event.nativeEvent.isComposing || event.altKey || event.metaKey || event.ctrlKey) return;
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); show(event.key); }
      }}>
      <span className="sselect-value">{renderTriggerValue ? renderTriggerValue(selected) : selected?.label ?? '\u00a0'}</span><Icon name="CaretDown" size={16} className="sselect-caret"/>
    </button>
    {open && !disabled && <SelectPopup key={id} id={id} label={label} items={items} value={value} searchable={searchable}
      trigger={trigger} initial={initial} align={align} onClose={close} onChoose={next => { close(true); if (String(next) !== String(value)) onChange(next); }}/>} 
  </div>;
}

function SelectPopup({ id, label, items, value, searchable, trigger, initial, align, onClose, onChoose }) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => selectOptions(items, query), [items, query]);
  const [activeValue, setActiveValue] = useState(() => {
    const selected = items.find(item => String(item.value) === String(value) && !item.disabled);
    return (selected ?? items[selectHighlight(items, -1, initial === 'ArrowUp' ? 'End' : 'Home')])?.value;
  });
  const active = visible.findIndex(item => item.value === activeValue && !item.disabled);
  const popup = useRef(null), input = useRef(null), list = useRef(null), typing = useRef(null), latest = useRef(null);
  const [position, setPosition] = useState({ visibility: 'hidden' });
  latest.current = { onClose };
  const context = useMemo(() => {
    const owner = trigger.current, root = document.documentElement;
    const attrs = {};
    for (const attr of ['data-density', 'data-mode', 'data-theme', 'data-chat-source-version', 'data-cds-theme', 'data-font', 'data-color-version']) {
      const source = owner?.closest(`[${attr}]`) || root;
      const text = source.getAttribute(attr); if (text != null) attrs[attr] = text;
    }
    // Settings is a local modal portal, outside the shared Menu provider.
    const modal = owner?.closest('[role=dialog],[role=alertdialog]')?.parentElement;
    const base = modal ? Number.parseInt(getComputedStyle(modal).zIndex, 10) || 0 : 0;
    return { attrs, layer: base + 100 + 20 };
  }, [trigger]);
  useLayoutEffect(() => {
    const owner = trigger.current, node = popup.current;
    if (!owner || !node) return;
    const update = () => {
      const anchor = owner.parentElement.getBoundingClientRect();
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const width = Math.min(Math.max(anchor.width, 12 * rem), innerWidth - 16);
      node.style.width = `${width}px`;
      const size = { width, height: Math.min(node.scrollHeight, 320, innerHeight - 16) };
      const placed = positionMenu({ anchor, size, viewport: { width: innerWidth, height: innerHeight }, align, sideOffset: 6 });
      const next = { left: placed.left, top: placed.top, width, maxHeight: Math.min(320, placed.availableHeight), visibility: 'visible' };
      setPosition(old => Object.keys(next).every(key => old[key] === next[key]) ? old : next);
    };
    update();
    const observer = new ResizeObserver(update); observer.observe(owner.parentElement); observer.observe(node);
    window.addEventListener('resize', update); document.addEventListener('scroll', update, true);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); document.removeEventListener('scroll', update, true); };
  }, [trigger, align]);
  useLayoutEffect(() => { if (position.visibility === 'visible') (searchable ? input.current : list.current)?.focus({ preventScroll: true }); }, [searchable, position.visibility]);
  useLayoutEffect(() => {
    if (active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, id]);
  useEffect(() => {
    if (active < 0) setActiveValue(visible.find(item => !item.disabled)?.value);
  }, [visible, active]);
  useEffect(() => {
    const outside = event => {
      if (!popup.current?.contains(event.target) && !trigger.current?.contains(event.target)) latest.current.onClose(false);
    };
    document.addEventListener('pointerdown', outside, true); document.addEventListener('focusin', outside);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('focusin', outside); };
  }, [trigger]);
  const choose = index => { const item = visible[index]; if (item && !item.disabled) onChoose(item.value); };
  const keyDown = event => {
    // Portals bubble through SettingsContent. Do not let Escape/Tab dismiss or
    // trap in the parent modal while the combobox owns the keyboard.
    if (event.nativeEvent.isComposing) { event.stopPropagation(); return; }
    // Preserve parent shortcuts such as Settings Cmd+F; focus-out then closes
    // this popup naturally when the parent focuses its search field.
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); markEscapeClosed(trigger.current); onClose(true); return; }
    if (event.key === 'Tab') {
      event.preventDefault();
      const owner = trigger.current, scope = owner?.closest('[role=dialog],[role=alertdialog]') || document.body;
      const controls = [...scope.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].filter(node => node.tabIndex >= 0 && !node.disabled && node.getClientRects().length && !node.closest('[inert]') && !popup.current?.contains(node));
      const at = controls.indexOf(owner), next = controls[(at + (event.shiftKey ? -1 : 1) + controls.length) % controls.length];
      onClose(false); next?.focus({ preventScroll: true }); return;
    }
    const inSearch = event.target === input.current;
    if (['ArrowDown', 'ArrowUp'].includes(event.key) || (!inSearch && ['Home', 'End'].includes(event.key))) {
      event.preventDefault(); const at = selectHighlight(visible, active, event.key); setActiveValue(visible[at]?.value); return;
    }
    if (event.key === 'Enter' || (!inSearch && event.key === ' ')) { event.preventDefault(); choose(active); return; }
    if (!inSearch && event.key.length === 1) {
      event.preventDefault(); typing.current = typeaheadState(typing.current, event.key, performance.now());
      const enabled = visible.filter(item => !item.disabled), current = enabled.findIndex(item => item.value === activeValue);
      const at = typeaheadMatch(enabled.map(item => item.label), current, typing.current.text);
      if (at !== null) setActiveValue(enabled[at].value);
    }
  };
  return createPortal(<div {...context.attrs} className="sselect-portal cds-root" data-cds-portal="" style={{ zIndex: context.layer }}>
    <div ref={popup} data-cds="Combobox" className="sselect-popup" style={position} onKeyDown={keyDown}>
      <div className="sselect-body">
        {searchable && <input ref={input} className="sselect-search" role="combobox" aria-label={label} aria-expanded="true"
          aria-controls={id} aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${id}-option-${active}` : undefined}
          autoComplete="off" spellCheck={false} value={query} onChange={event => { setQuery(event.target.value); setActiveValue(undefined); }}/>} 
        <div ref={list} id={id} role="listbox" aria-label={label} tabIndex={-1} className="sselect-list scroll-fade-y"
          aria-activedescendant={!searchable && active >= 0 ? `${id}-option-${active}` : undefined}>
          {visible.map((item, index) => <div key={item.value} id={`${id}-option-${index}`} role="option"
            aria-selected={String(item.value) === String(value)} aria-disabled={item.disabled || undefined}
            data-selected={String(item.value) === String(value) || undefined} data-disabled={item.disabled || undefined}
            data-highlighted={active === index || undefined} data-value={item.value} className="sselect-option"
            onPointerMove={() => { if (!item.disabled) setActiveValue(item.value); }} onMouseDown={event => event.preventDefault()}
            onClick={() => choose(index)}>
            <div className="sselect-option-copy"><span className="sselect-option-label">{item.label}</span>{item.description!=null&&<span className="sselect-option-description">{item.description}</span>}</div>{String(item.value) === String(value) && <Icon name="Check" size={20} weight="strong" className="sselect-check"/>}
          </div>)}
          {!visible.length && <div className="sselect-empty">{t('No results')}</div>}
        </div>
      </div>
    </div>
  </div>, document.body);
}
