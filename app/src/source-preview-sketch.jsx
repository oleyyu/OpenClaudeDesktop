import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createPreviewSketchToolbar } from './generated/code-editor/preview-sketch-toolbar.mjs';
import { createPreviewSketchCanvas } from './generated/code-editor/preview-sketch-canvas.mjs';
import { createPreviewSketchState } from './generated/code-editor/preview-sketch-state.mjs';
import { createPreviewSketchHost } from './generated/code-editor/preview-sketch-host.mjs';
import { matchSketchCommand, sketchShortcut } from './generated/code-editor/preview-sketch-keys.mjs';
import { Icon } from './icons.jsx';
import sketchIcons from './generated/code-editor/preview-sketch-icons.mjs';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceTooltip, useExplicitSourceTooltip } from './source-tooltip.jsx';
import { SourceConfirmationDialog } from './source-dialog.jsx';
import { RoutineSourceMenu, useRoutineIntl } from './source-routine-adapters.jsx';
import './source-preview-sketch.css';

const ownerWindow = node => node?.ownerDocument?.defaultView ?? window;
const optionalOwnerWindow = node => node?.ownerDocument?.defaultView ?? null;
const asElement = node => node?.nodeType === 1 ? node : null;
const isTextInput = node => !!node?.closest?.('textarea,input:not([type=button]):not([type=checkbox]):not([type=radio]),[contenteditable]:not([contenteditable=false])');
const openPopupSelector = '[data-popup-open], [role="dialog"]:not([data-artifact-viewer-mode="minimized"]), [data-open][role="alertdialog"], [role="menu"], [role="listbox"], [role="combobox"][aria-expanded="true"]';
const reducedMotion = () => typeof window !== 'undefined' && (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reduceMotion === 'true');
const tokenValue = name => typeof document === 'undefined' ? '' : getComputedStyle(document.querySelector('.spv-pane') ?? document.documentElement).getPropertyValue(`--cds-${name}`).trim();
function useToken(name) {
  const [value, setValue] = useState(() => tokenValue(name));
  useEffect(() => {
    const update = () => setValue(tokenValue(name)); update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [name]);
  return value;
}
function SketchIcon({ customIcon, size = 'sm', ...props }) {
  const pixels = { xs: 12, sm: 16, md: 20 }[size] ?? size;
  // R4i-small SM3: the 2.42304.0 glyph map draws with its own font, the official Anthropicons-Variable
  // (c0f671921-cvFTkbeX.woff2, declared by shared-frame-CegduNQ2.css that index.html links).
  if (!customIcon) return <Icon {...props} glyphMap={sketchIcons} size={pixels} style={{ fontFamily: 'Anthropicons-Variable' }} />;
  return <svg aria-hidden="true" data-cds="Icon" width={pixels} height={pixels} viewBox={`0 0 ${customIcon.viewBox} ${customIcon.viewBox}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    {customIcon.paths.map((path, index) => <path key={index} {...path} />)}
  </svg>;
}
function SketchButton({ pressed, shortcut, disabledReason, ...props }) {
  const explicit = useExplicitSourceTooltip();
  const button = <SourceSettingsButton {...props} iconSize={16} aria-pressed={pressed} />;
  return explicit || !props['aria-label'] ? button : <SourceTooltip content={props['aria-label']} shortcut={shortcut} disabledReason={props.disabled ? disabledReason : undefined} side="top" hoverable={false}>{button}</SourceTooltip>;
}
function Panel({ elevation, className = '', style, ...props }) {
  // shared-frame Sh/vh: a panel is surface-2 + shadow-panel-sm, not a popover.
  return <div {...props} data-cds="Surface" data-surface={elevation}
    className={`rounded-card bg-surface-2 shadow-panel-sm forced-colors:border forced-colors:border-solid forced-colors:border-[color:CanvasText] ${className}`}
    style={{ '--cds-page-bg': 'var(--cds-surface-2)', ...style }} />;
}
function Message({ defaultMessage, values }) { return useRoutineIntl().formatMessage({ id: defaultMessage, defaultMessage }, values); }
function Confirm({ description, onOpenChange, ...props }) { return <SourceConfirmationDialog {...props} body={description} onCancel={() => onOpenChange(false)} />; }
const { Toolbar, colors } = createPreviewSketchToolbar({
  Button: SketchButton, Tooltip: SourceTooltip, Icon: SketchIcon, Panel,
  Menu: { ...RoutineSourceMenu, TriggerButton: props => <RoutineSourceMenu.Trigger render={<SketchButton {...props} />} /> },
  renderMenuItems: items => items.map((item, index) => <RoutineSourceMenu.Item key={item.key ?? index} leading={item.leading} checked={item.checked} checkedRole={item.checkedRole} disabled={item.disabled} onClick={item.onSelect}>{item.label}</RoutineSourceMenu.Item>),
  ConfirmDialog: Confirm, Provider: ({ children }) => children, Message, useIntl: useRoutineIntl,
  ownerWindow, asElement, ownerDocument: ownerWindow, prefersReducedMotion: reducedMotion,
  schedule: (node, callback, delay) => { const win = ownerWindow(node), id = win.setTimeout(callback, delay); return { cancel: () => win.clearTimeout(id) }; },
  useRem: () => typeof document === 'undefined' ? 16 : parseFloat(getComputedStyle(document.documentElement).fontSize),
  densityToken: tokenValue,
  resolveLength: (value, rem) => {
    const result = /^(-?\d*\.?\d+)(px|rem)$/.exec(value.trim());
    if (result) return Number(result[1]) * (result[2] === 'rem' ? rem : 1);
    if (typeof document === 'undefined') return 0;
    const probe = document.createElement('span'); probe.style.cssText = `position:absolute;visibility:hidden;height:${value}`;
    (document.querySelector('.spv-pane') ?? document.body).append(probe);
    const height = probe.getBoundingClientRect().height; probe.remove(); return height;
  },
});
// preview-08: the generated canvas is the 2.42304.0 St (c467aa787-B4L-l_bi, R4g SM2), which formats its "Sketch canvas" /
// "Text label" aria-labels with useIntl (ce = me()); the host's intl goes in like the toolbar's and the host's.
const { Canvas } = createPreviewSketchCanvas({ ownerWindow, optionalOwnerWindow, useToken, reducedMotion, useIntl: useRoutineIntl });
const noTextTargets = { textTargets: undefined, handleTextTargetRedacted() {}, textRedactionCount: () => 0, resetTextRedactionCount() {} };
const useSketch = createPreviewSketchState({ usePlatform: () => true,
  // Original optional redaction/OCR rollout is not exposed without its detector.
  useRedaction: () => false, skipTextDetection: () => true, useTextTargets: () => noTextTargets,
  asElement, isTextInput, matchCommand: matchSketchCommand, shortcut: sketchShortcut });
const ErrorContext = createContext(null);
const CurrentSketch = createPreviewSketchHost({
  usePlatform: () => true, isTextInput, isApplication: node => !!node?.closest?.('canvas,[role="application"]'),
  popupSelector: openPopupSelector, openPopupSelector, asElement, ownerWindow: optionalOwnerWindow,
  hasOtherEscapeOwner: (pane, own) => {
    const active = pane.ownerDocument.activeElement;
    return (!own.contains(active) && !!active?.closest?.('textarea,input,[contenteditable=true],[data-escape-owner],[role=application]')) ||
      [...pane.ownerDocument.querySelectorAll(openPopupSelector)].some(node => node.getClientRects().length > 0);
  },
  suppressContextMenu: (event, root) => !event.defaultPrevented && root.contains(event.target) && !isTextInput(event.target) && !root.ownerDocument.getSelection()?.toString().trim(),
  // The local shortcut dispatcher has no held-Escape latch to release.
  releaseEscape: () => {}, DisabledReasonTooltip: ({ reason, children }) => <SourceTooltip content={reason} hoverable={false}>{children}</SourceTooltip>,
  Button: SketchButton, useIntl: useRoutineIntl,
  useErrors: () => { const error = useContext(ErrorContext); return useMemo(() => ({ addError: message => error?.(message) }), [error]); },
  Toolbar, useSketch, colors, Canvas,
});

export function SourcePreviewSketch({ onError, onAttach, backdrop, ...props }) {
  const sourceBackdrop = useMemo(() => backdrop ? { src: backdrop.src, pixelWidth: backdrop.width, pixelHeight: backdrop.height, dpr: backdrop.dpr ?? (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1) } : backdrop, [backdrop]);
  const attach = (dataUrl, details) => {
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1), bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
    onAttach(new File([bytes], details.annotated ? 'preview-annotation.png' : 'preview-screenshot.png', { type: 'image/png' }), details);
  };
  return <ErrorContext.Provider value={onError}><CurrentSketch {...props} backdrop={sourceBackdrop} onAttach={attach} /></ErrorContext.Provider>;
}
