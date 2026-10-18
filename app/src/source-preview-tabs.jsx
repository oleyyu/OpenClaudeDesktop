import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './icons';
import { SourceTooltip } from './source-tooltip.jsx';
import { SourceMenu, menuTriggerProps } from './source-menu.jsx';
import { SourcePreviewTabOverflow } from './source-preview-tab-overflow.jsx';
import { SourceSpinner } from './source-pane-states.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { useTabDragReorder } from './use-tab-drag-reorder.mjs';
import { tabOverflowLayout, stableIds } from './file-tab-overflow-model.mjs';
import { PREVIEW_TAB_CAP_TEXT, previewTabCapReached } from './preview-model.mjs';
import { t } from '../electron/i18n/index.mjs';

// Current cf580efe9 ki / c224804cc U / cfe7c4b3b shared view-tab strip.
// Page title + origin tooltip, favicon/loading glyph, close/menu/reorder and
// a disabled create button once nine real tabs exist. No view reload on select.
const label = tab => tab.title?.trim() || (() => { try { const u = new URL(tab.url); return u.host || decodeURIComponent(u.pathname).split('/').at(-1); } catch { return ''; } })() || t('New tab');
function PageIcon({ tab }) {
  const [failed, setFailed] = useState(false);
  return tab.loading ? <SourceSpinner size={12} /> : tab.faviconUrl && !failed
    ? <img src={tab.faviconUrl} alt="" width={12} height={12} onError={() => setFailed(true)} />
    : <Icon name="Globe" size={12} />;
}
function PreviewTab({ tab, selected, onSelect, onClose, onCloseOthers, onExternal, onKeyDown, onPointerDown, overflowed, compact, tight }) {
  const root = useRef(null), [menu, setMenu] = useState(null);
  const closable = !tab.placeholder;
  return <div ref={root} role="presentation" className="source-file-tab spv-tab" data-vtb-id={tab.id} data-preview-tab-id={tab.id}
    data-has-icon={!!tab.url || undefined} data-compact={compact || undefined} data-tight={tight || undefined} data-overflowed={overflowed || undefined} data-selected={selected || undefined} data-popup-open={!!menu || undefined}
    onPointerDown={onPointerDown}
    onMouseDown={event => { if (event.button === 1 || event.button === 2 || event.ctrlKey) event.preventDefault(); }}
    onMouseUp={event => { if (event.button === 1 && closable) { event.preventDefault(); onClose(tab.id); } }}
    onContextMenu={event => { event.preventDefault(); setMenu({ x: event.clientX, y: event.clientY }); }}>
    <span className="source-file-tab-bg" aria-hidden="true" />
    <SourceTooltip content={label(tab)} detail={tab.url || undefined} open={menu ? false : undefined}>
      <div role="tab" aria-selected={selected} tabIndex={selected && !overflowed ? 0 : -1} onClick={() => onSelect(tab.id)}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(tab.id); } else onKeyDown(event, tab.id); }}>
        {tab.url && !tight && <span className="spv-tab-icon" aria-hidden="true"><PageIcon key={tab.faviconUrl} tab={tab} /></span>}
        <span className="source-file-tab-label" data-vtb-label=""><span>{label(tab)}</span></span>
      </div>
    </SourceTooltip>
    {closable && !compact && <button type="button" tabIndex={-1} aria-label={t('Close tab')} className="source-file-tab-close"
      onMouseDown={event => event.preventDefault()} onClick={() => onClose(tab.id)}><Icon name="X" size={12} /></button>}
    {menu && <SourceMenu.Popup anchor={root.current} point={menu} layer="contextmenu" label={t('Tab actions')} contextMenuGuard="always"
      onClose={() => setMenu(null)} finalFocus={() => root.current?.querySelector('[role="tab"]')}>
      <SourceMenu.Item disabled={!/^https?:/i.test(tab.url || '')} onClick={() => onExternal(tab.id)}>{t('Open in default browser')}</SourceMenu.Item>
      <SourceMenu.Separator />
      <SourceMenu.Item disabled={!closable} onClick={() => onClose(tab.id)}>{t('Close tab')}</SourceMenu.Item>
      <SourceMenu.Item onClick={() => onCloseOthers(tab.id)}>{t('Close other tabs')}</SourceMenu.Item>
    </SourceMenu.Popup>}
  </div>;
}

export function SourcePreviewTabs({ tabs = [], activeId, onSelect, onCreate, onClose, onCloseOthers, onExternal, onReorder }) {
  const bar = useRef(null), list = useRef(null), overflow = useRef(null), [menu, setMenu] = useState(null);
  const [strip, setStrip] = useState({ hiddenIds: [], compactIds: [], overflowing: false, activeTight: false });
  useEffect(() => { if (!strip.overflowing) setMenu(null); }, [strip.overflowing]);
  const shown = tabs.length ? tabs : [{ id: activeId, placeholder: true }];
  const drag = useTabDragReorder({ stripRef: list, itemSelector: '[data-preview-tab-id]', idOf: node => node.dataset.previewTabId, onReorder });
  const focus = id => requestAnimationFrame(() => [...(list.current?.querySelectorAll('[data-preview-tab-id]') || [])].find(node => node.dataset.previewTabId === id)?.querySelector('[role="tab"]')?.focus());
  useLayoutEffect(() => {
    const root = bar.current, node = list.current;
    if (!root || !node) return;
    const measure = () => {
      const entries = [...node.querySelectorAll('[data-vtb-id]')].map(el => ({ id: el.dataset.vtbId, start: el.offsetLeft - 4, end: el.offsetLeft - 4 + el.offsetWidth, compact: el.hasAttribute('data-compact'), clipped: el.querySelector('[data-vtb-label]').scrollWidth > el.querySelector('[data-vtb-label]').clientWidth + 1 }));
      const button = root.querySelector('[data-vtb-overflow]');
      const layout = tabOverflowLayout({ tabs: entries, activeId, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, scrollLeft: node.scrollLeft, overflowWidth: button ? button.getBoundingClientRect().width + 4 : 0 });
      if (Math.abs(node.scrollLeft - layout.scrollLeft) > 1) node.scrollLeft = layout.scrollLeft;
      setStrip(previous => {
        const hiddenIds = stableIds(previous.hiddenIds, layout.hiddenIds);
        const compactIds = stableIds(previous.compactIds, layout.compactIds);
        return hiddenIds === previous.hiddenIds && compactIds === previous.compactIds && previous.overflowing === layout.overflowing && previous.activeTight === layout.activeTight ? previous : { hiddenIds, compactIds, overflowing: layout.overflowing, activeTight: layout.activeTight };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);observer.observe(root);observer.observe(node);
    for (const tab of node.querySelectorAll('[data-vtb-id]')) observer.observe(tab);
    node.addEventListener('scroll', measure, { passive: true });
    return () => { observer.disconnect(); node.removeEventListener('scroll', measure); };
  }, [tabs, activeId]);
  // preview-13 (2.42304.0 cfe7c4b3b-CP-IQXj8 Y: createDisabled x, the slot vt, _t): at the cap, focus that was on + (or
  // fell to the body) goes to the open tab; once a tab closes, focus left on the reason's wrapper returns to +.
  const capped = previewTabCapReached(tabs.length), capId = useId();
  const createSlot = useRef(null), wasCapped = useRef(capped);
  useLayoutEffect(() => {
    const was = wasCapped.current;
    wasCapped.current = capped;
    if (was && !capped) {
      const slot = createSlot.current;
      if (slot?.contains(slot.ownerDocument.activeElement)) slot.querySelector('button')?.focus({ preventScroll: true });
      return;
    }
    const node = list.current;
    if (!node || was || !capped) return;
    const doc = node.ownerDocument, active = doc.activeElement;
    if (active !== doc.body && !createSlot.current?.contains(active)) return;
    node.querySelector(`[data-vtb-id="${CSS.escape(activeId)}"] [role="tab"]`)?.focus({ preventScroll: true });
  }, [capped, activeId]);
  const key = (event, id) => {
    if (event.nativeEvent.isComposing) return;
    const index = shown.findIndex(tab => tab.id === id);
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); onReorder(id, Math.max(0, Math.min(shown.length - 1, index + (event.key === 'ArrowLeft' ? -1 : 1)))); focus(id); return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if ((event.key === 'Delete' || event.key === 'Backspace') && !shown[index]?.placeholder) { event.preventDefault(); onClose(id); return; }
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? shown.length - 1 : event.key === 'ArrowRight' ? (index + 1) % shown.length : event.key === 'ArrowLeft' ? (index - 1 + shown.length) % shown.length : null;
    if (next !== null) { event.preventDefault(); onSelect(shown[next].id); focus(shown[next].id); }
  };
  return <div ref={bar} className="source-file-tabbar spv-tabbar" data-view-tab-bar="">
    <div className="source-file-tabs spv-tabs" ref={list} role="tablist" aria-label={t('Preview tabs')}>
      {drag.order(shown, tab => tab.id).map(tab => <PreviewTab key={tab.id} tab={tab} selected={tab.id === activeId} overflowed={strip.hiddenIds.includes(tab.id)} compact={strip.compactIds.includes(tab.id)} tight={tab.id === activeId && strip.activeTight}
        {...{ onSelect, onClose, onCloseOthers, onExternal }} onKeyDown={key} onPointerDown={event => { if (!tab.placeholder) drag.onPointerDown(tab.id, event); }} />)}
      <div className="source-file-tabs-spacer" hidden={!strip.overflowing} aria-hidden="true" />
    </div>
    {strip.overflowing && <span className="source-file-tabs-overflow" data-vtb-overflow=""><SourceTooltip content={t('More tabs')}><SourceSettingsButton ref={overflow} variant="ghost" size="sm" icon="CaretDown" iconSize="auto" iconOnly aria-label={t('More tabs')}
      {...menuTriggerProps({ open: !!menu, onOpen: setMenu })} onClick={() => setMenu(value => value ? null : 'click')} /></SourceTooltip></span>}
    {/* cfe7c4b3b Y: the cap's sr-only description for +, then the slot: DisabledReason (Qp: the reason's tooltip on a
        focusable wrapper, since a disabled button gets no hover or focus) around the New tab tooltip (Zp). */}
    {capped && <span id={capId} className="sr-only">{t(PREVIEW_TAB_CAP_TEXT)}</span>}
    <span ref={createSlot} className="inline-flex shrink-0" data-preview-new-tab="">
      {/* R4e-preview: Qp is SourceTooltip's disabledReason, kept mounted (keepReasonWrapper) so + stays the same button. */}
      <SourceTooltip disabledReason={capped ? t(PREVIEW_TAB_CAP_TEXT) : null} keepReasonWrapper side="bottom" hoverable={false}>
        <SourceTooltip content={capped ? null : t('New tab')} shortcut="cmd+t" side="bottom" hoverable={false}>
          <SourceSettingsButton variant="ghost" size="sm" icon="Add" iconSize="auto" iconOnly aria-label={t('New tab')} aria-describedby={capped ? capId : undefined} disabled={capped} onClick={onCreate} />
        </SourceTooltip>
      </SourceTooltip>
    </span>
    {menu && strip.overflowing && <SourcePreviewTabOverflow anchor={overflow.current} initialHighlight={menu === 'first' || menu === 'last' ? menu : undefined}
      tabs={tabs.filter(tab => strip.hiddenIds.includes(tab.id)).map(tab => ({ id: tab.id, label: label(tab), detail: tab.url || undefined, closable: !tab.placeholder, icon: tab.url ? <PageIcon key={tab.faviconUrl} tab={tab} /> : undefined }))}
      onActivate={onSelect} onCloseTab={onClose} onClose={() => setMenu(null)} />}
  </div>;
}
