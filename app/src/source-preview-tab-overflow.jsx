import React, { useContext, useEffect, useId, useRef } from 'react';
import { TabOverflowItem, tabOverflowRtlKey, tabOverflowSizes, tabOverflowTypeaheadResetKeys } from './generated/code-current/terminal-tab-overflow.mjs';
import { CdsDropdown, CdsTooltipProvider, DirectionContext } from './generated/view-tabs/index.js';
import { t } from '../electron/i18n/index.mjs';

// The shared strip's overflow menu, 3.6556.2 cfe7c4b3b ae (view-tabs ViewTabOverflowMenu; 2.42304.0 se). Preview passes
// its own labels by default; the terminal strip (cccc2cf0a Vy) passes "More terminals" / "Close terminal" / its delete
// hint. Each row is the original 3.6556.2 se (generated/code-current/terminal-tab-overflow.mjs): a close key
// (ArrowRight while arrowCloses, Delete, Backspace; ArrowLeft in RTL) with Control, Meta or Alt is left alone, a held
// key's repeats do nothing, and the window swallows the key's repeats after the close (shared-19 ln); a middle click
// closes; the label and caption are CdsOverflowTooltip; the row is the CDS dropdown item (se `_.Item`, view-tabs
// CdsDropdown). w10-trans-tab-overflow (L125): the menu is ae's CDS dropdown again (view-tabs CdsDropdown, not the host
// SourceMenu), with ae's parts:
//   - `_.Root` (onOpenChange T: resets the typeahead; a close reports onClose) around `_.Popup` (side "bottom", align
//     "end", onContextMenu I = preventDefault, onKeyDownCapture ne) and the arrow hint span j, a sibling of the popup;
//   - x = useDirection() === "rtl" (vendor-frame Ia, DirectionContext);
//   - g = arrowCloses ?? true (ViewTabBar overflowArrowCloses: off only on the side chat strip, cccc2cf0a qP; the
//     Preview and terminal strips keep the default), passed to every row;
//   - ne: after typeahead the first Backspace only clears that gesture; ie (through L in RTL) resets it, ArrowRight only
//     while g;
//   - the rows sit in the CDS tooltip provider at delay 700 (C);
//   - the "press right arrow to close" hint (RTL: left) exists only while the menu is open, some row can close and g
//     (`ee && te && g`; this component is mounted only while open), and a row is described by it only while g
//     (`hintIds: g ? `${b} ${c}` : c`).
// Host differences (the strips' trigger is the host's own button, not ae's `_.Trigger`, because the Preview strip and
// the terminal strip draw their own bars):
//   - the popup is anchored to that button (`anchor`) and the Root is open while this component is mounted;
//   - the trigger's accessible name, which Base UI gives the popup through aria-labelledby, is the popup's aria-label;
//   - the delete hint (c, ViewTabBar's closeHintId) is rendered here, next to the arrow hint;
//   - initialHighlight "first" / "last" (the host trigger's ArrowDown / ArrowUp, menuTriggerProps) moves focus to that
//     row after Base UI's initial focus, which is what `_.Trigger` gets from Base UI on a keyboard open;
//   - className stays a host marker on the popup (no style of its own).
// A removed row needs no host focus restore: the Base UI menu popup restores focus itself (restoreFocus).
export function SourcePreviewTabOverflow({ anchor, tabs, onActivate, onCloseTab, onClose, initialHighlight, labels = null, className = 'spv-overflow-menu', arrowCloses = true }) {
  const copy = labels ?? { moreTabs: t('More tabs'), closeTab: t('Close tab'), closeTabHint: t('press right arrow to close'), closeTabHintRtl: t('press left arrow to close'),
    closeTabDeleteHint: t('Press Delete or Backspace to close the tab'), previewTabHint: t('preview'), deletedTabHint: t('deleted') };
  const rtl = useContext(DirectionContext)?.direction === 'rtl';
  const closable = tabs.some(tab => tab.closable !== false);
  const hint = useId(), deleteHint = useId(), typed = useRef(false), popup = useRef(null);
  useEffect(() => {
    if (initialHighlight !== 'first' && initialHighlight !== 'last') return undefined;
    const view = globalThis.window;
    if (!view?.requestAnimationFrame) return undefined;
    let frame = view.requestAnimationFrame(() => {
      frame = view.requestAnimationFrame(() => {
        const items = popup.current?.querySelectorAll('[role="menuitem"]:not([data-disabled])');
        items?.[initialHighlight === 'first' ? 0 : items.length - 1]?.focus({ preventScroll: true });
      });
    });
    return () => view.cancelAnimationFrame(frame);
  }, []);
  const onKeyDownCapture = event => {
    const key = rtl ? tabOverflowRtlKey(event.key) : event.key;
    if (event.key === 'Backspace' && typed.current) {
      event.preventDefault();event.stopPropagation();typed.current = false;
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) typed.current = true;
    else if (tabOverflowTypeaheadResetKeys.has(key) && (arrowCloses || key !== 'ArrowRight')) typed.current = false;
  };
  return <CdsDropdown.Root open onOpenChange={open => { typed.current = false; if (!open) onClose?.(); }}>
    <CdsDropdown.Popup ref={popup} side="bottom" align="end" anchor={anchor ?? undefined} aria-label={copy.moreTabs} className={className}
      onContextMenu={preventDefault} onKeyDownCapture={onKeyDownCapture}>
      <CdsTooltipProvider delay={700}>
        {tabs.map(tab => <TabOverflowItem tab={tab} sizes={tabOverflowSizes} key={tab.id} hintIds={arrowCloses ? `${hint} ${deleteHint}` : deleteHint} arrowCloses={arrowCloses} closeLabel={copy.closeTab}
          previewHint={copy.previewTabHint} deletedHint={copy.deletedTabHint} rtl={rtl} onActivate={onActivate} onClose={onCloseTab} />)}
      </CdsTooltipProvider>
    </CdsDropdown.Popup>
    {closable && arrowCloses && <span id={hint} className="sr-only">{rtl ? copy.closeTabHintRtl ?? copy.closeTabHint : copy.closeTabHint}</span>}
    <span id={deleteHint} className="sr-only">{copy.closeTabDeleteHint}</span>
  </CdsDropdown.Root>;
}
// ae I: the popup's context menu does nothing.
function preventDefault(event) {
  event.preventDefault();
}
