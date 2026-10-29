import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createPreviewSketchToolbar } from './generated/code-editor/preview-sketch-toolbar.mjs';
import { createPreviewSketchCanvas } from './generated/code-editor/preview-sketch-canvas.mjs';
import { createPreviewSketchState } from './generated/code-editor/preview-sketch-state.mjs';
import { createPreviewSketchHost } from './generated/code-editor/preview-sketch-host.mjs';
import { matchSketchCommand, sketchShortcut } from './generated/code-editor/preview-sketch-keys.mjs';
import { useRoutineIntl } from './source-routine-adapters.jsx';
import './source-preview-sketch.css';

// w10-editor-preview-sketch: the six adapters are the 3.6556.2 c23255574/cda4f50bb/shared-46 slices. Their CDS Button,
// Icon, Dropdown, Tooltip, ConfirmationDialog, DisabledReason, Surface (w11-sweep-rest: the toolbar panel is view-tabs'
// CdsSurface, shared-frame cg) and owner-window helpers are view-tabs' own; the host only supplies what the slices cannot
// carry: intl, the density token, platform and text-input tests, the escape/popup checks and the OCR text targets.
const isTextInput = node => !!node?.closest?.('textarea,input:not([type=button]):not([type=checkbox]):not([type=radio]),[contenteditable]:not([contenteditable=false])');
const openPopupSelector = '[data-popup-open], [role="dialog"]:not([data-artifact-viewer-mode="minimized"]), [data-open][role="alertdialog"], [role="menu"], [role="listbox"], [role="combobox"][aria-expanded="true"]';
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
function Message({ defaultMessage, values }) { return useRoutineIntl().formatMessage({ id: defaultMessage, defaultMessage }, values); }
const { Toolbar } = createPreviewSketchToolbar({ Message, useIntl: useRoutineIntl });
const { Canvas } = createPreviewSketchCanvas({ useToken, useIntl: useRoutineIntl });
const noTextTargets = { textTargets: undefined, handleTextTargetRedacted() {}, textRedactionCount: () => 0, resetTextRedactionCount() {} };
const { useSketch, colors, widths, black } = createPreviewSketchState({ usePlatform: () => true,
  // The OCR detector chunk (cb22b036c) is not shipped: the official "skip text detection" gate stays on, as before.
  useGate: key => key === '__gb__2978899829', useTextTargets: () => noTextTargets,
  isTextInput, matchCommand: matchSketchCommand, shortcut: sketchShortcut });
const ErrorContext = createContext(null);
const CurrentSketch = createPreviewSketchHost({
  usePlatform: () => true, isTextInput, isApplication: node => !!node?.closest?.('canvas,[role="application"]'),
  popupSelector: openPopupSelector, openPopupSelector,
  hasOtherEscapeOwner: (pane, own) => {
    const active = pane.ownerDocument.activeElement;
    return (!own.contains(active) && !!active?.closest?.('textarea,input,[contenteditable=true],[data-escape-owner],[role=application]')) ||
      [...pane.ownerDocument.querySelectorAll(openPopupSelector)].some(node => node.getClientRects().length > 0);
  },
  suppressContextMenu: (event, root) => !event.defaultPrevented && root.contains(event.target) && !isTextInput(event.target) && !root.ownerDocument.getSelection()?.toString().trim(),
  // The local shortcut dispatcher has no held-Escape latch to release.
  releaseEscape: () => {}, useIntl: useRoutineIntl,
  useErrors: () => { const error = useContext(ErrorContext); return useMemo(() => ({ addError: message => error?.(message) }), [error]); },
  Toolbar, useSketch, colors, widths, black, Canvas,
});

export function SourcePreviewSketch({ onError, onAttach, backdrop, ...props }) {
  const sourceBackdrop = useMemo(() => backdrop ? { src: backdrop.src, pixelWidth: backdrop.width, pixelHeight: backdrop.height, dpr: backdrop.dpr ?? (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1) } : backdrop, [backdrop]);
  const attach = (dataUrl, details) => {
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1), bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
    onAttach(new File([bytes], details.annotated ? 'preview-annotation.png' : 'preview-screenshot.png', { type: 'image/png' }), details);
  };
  return <ErrorContext.Provider value={onError}><CurrentSketch {...props} backdrop={sourceBackdrop} onAttach={attach} /></ErrorContext.Provider>;
}
