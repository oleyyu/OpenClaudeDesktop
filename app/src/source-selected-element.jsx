import React, { useState } from 'react';
import { createSelectedElementDetail } from './generated/code-editor/preview-element-detail.mjs';
import { createSelectedElementPill } from './generated/code-editor/preview-element-chip.mjs';
import { createSelectedElementTranscript } from './generated/code-editor/preview-element-transcript.mjs';
import { selectedElementLabel } from './generated/code-editor/preview-element-label.mjs';
// E41: this file is in the composer graph, so CdsIcon comes from the concrete view-tabs file, not the facade.
import { CdsIcon, CdsSpinner } from './generated/view-tabs/shared-frame-6jtSkIit.js';
import { Icon } from './icons.jsx';
import { useRoutineIntl } from './source-routine-adapters.jsx';
import { useSourceToasts } from './source-toast.jsx';
import { SourceImageViewer } from './source-image-viewer.jsx';
import { t } from '../electron/i18n/index.mjs';
import './source-disclosure.css';

function Message({ defaultMessage, values }) {
  return useRoutineIntl().formatMessage({ defaultMessage, id: defaultMessage }, values);
}
// shared-52 ha (ErrorsProvider): the image menu's "Image copied to clipboard." / "Couldn’t copy image." are host toasts.
function useErrors() {
  const store = useSourceToasts();
  return React.useMemo(() => ({
    addSuccess: message => store?.add?.(message),
    addError: message => store?.add?.(message, { variant: 'danger' }),
  }), [store]);
}
// 3.6556.2: the detail and the transcript card render the official CdsIcon / CdsCollapsible (view-tabs); the host
// supplies react-intl over the local catalog, the pill's Toggle and the screenshot tile.
const { Preview, Details, useDetailAnimation } = createSelectedElementDetail({ Message, useIntl: useRoutineIntl });
// Base UI Toggle stand-in (the host strip is no ToggleGroup): ko's key handlers call `preventBaseUIHandler()`, which Base
// UI puts on its events, so the plain button supplies a no-op one; `value` is the group value, not a DOM attribute.
function ChipToggle({ value, onKeyDown, onKeyUp, ...props }) {
  const base = handler => handler && (event => { event.preventBaseUIHandler ??= () => {}; handler(event); });
  return <button type="button" {...props} onKeyDown={base(onKeyDown)} onKeyUp={base(onKeyUp)} />;
}
// c0fbbe82d ko (the whole attachment pill: floating preview, outside-click/Tab/Escape, keyboard navigation, removal,
// remove button and the CdsContextMenu) and Go's preview intent (600 ms open / 200 ms close timers, pin, openedVia).
const { Pill, usePreviewIntent } = createSelectedElementPill({ Message, useIntl: useRoutineIntl, Toggle: ChipToggle });
const PREVIEW_WIDTH = 320; // c0fbbe82d `Ro = 320`

// Go (c0fbbe82d) owns one preview intent per strip (`onPreviewIntent:Nt,onPreviewEnter:rn,onPreviewLeave:an`, 600 / 200 ms),
// so moving between pills switches at once. The composer strips (source-composer-tiles.jsx, source-composer-attachments.jsx)
// call useAttachmentPreviewIntent once, spread attachmentStripHandlers on the strip element (Go's `Ft` gets onMouseEnter
// `s`, onMouseLeave `d`, onBlur `m`) and hand the intent to every pill (element, agent and issue: all get `onPreviewIntent: Nt`).
export const useAttachmentPreviewIntent = usePreviewIntent;
export { Pill as AttachmentPill };
export function attachmentStripHandlers(intent) {
  return {
    // s = () => window.clearTimeout(Ze.current) (the same body as rn)
    onMouseEnter: () => intent.onPreviewEnter(),
    // d = () => nn()
    onMouseLeave: () => intent.close(),
    // m: close at once unless focus moves into the strip or into a pill preview
    onBlur: (e) => {
      let t = e.relatedTarget;
      (t === null && !e.currentTarget.ownerDocument.hasFocus()) ||
        (e.currentTarget.contains(e.target) &&
          !e.currentTarget.contains(t) &&
          !(typeof t?.closest == "function" && t.closest("[data-epitaxy-pill-preview]")) &&
          intent.close(!0));
    },
  };
}

// Go renders one ko per element context (`value: element-${t}`, Cursor thumbnail, Gi label/ariaLabel, ia preview); `intent`
// is the strip's, `anchorRef` Go's `ue` for the first element pill (`anchorRef: a && W ? ue : void 0`).
export function SourceSelectedElementPill({ entry, intent, anchorRef, onRemove, disabled }) {
  const intl = useRoutineIntl();
  const element = intl.formatMessage({ defaultMessage: 'Element', id: 'SHkKGmzgh6' });
  const label = selectedElementLabel(entry.context, element);
  // The host's screenshot-processing notice rides in ko's `trailing` slot (inside the body), so the pills stay adjacent
  // siblings for ko's ArrowLeft/Right/Home/End and removal focus.
  const trailing = entry.status === 'loading' ? <span className="sr-only" role="status">{t('Processing image')}</span> : undefined;
  return <Pill value={entry.id} thumbnail={<CdsIcon name="Cursor" size="xs" />} label={label} trailing={trailing}
      ariaLabel={selectedElementLabel(entry.context, element, true)}
      previewOpen={intent.open === entry.id} hoverPeek previewPinned={intent.pinned === entry.id}
      previewContent={<Preview ctx={entry.context} width={PREVIEW_WIDTH} scrollRegionLabel={label} openedVia={intent.openedVia} />}
      anchorRef={anchorRef} onPreviewIntent={intent.onPreviewIntent} onPreviewEnter={intent.onPreviewEnter} onPreviewLeave={intent.onPreviewLeave}
      onRemove={() => { if (!disabled) onRemove?.(entry.id); }} />;
}

// The draft's agent and GitHub issue pills, as Go renders them (c0fbbe82d):
//   i(ko, {value: "agent", thumbnail: i(N, {name: "Agent", size: "xs"}), label: c, restored: …, onPreviewIntent: Nt, onRemove: me}, "agent")
//   i(ko, {value: "issue", thumbnail: l.bodyStatus === "loading" ? i(ae, {size: "sm"}) : i(N, {name: "Placeholder", size: "xs"}),
//          label: l.label, onPreviewIntent: Nt, onClick: l.url ? () => re(ut, l.url, "_blank", "noopener") : void 0, onRemove: he}, "issue")
// N = CdsIcon, ae = CdsSpinner (shared-frame od / Vu). Host data: {kind, label, loading, onOpen, onRemove}; the issue's
// press is the host's external-link opener (the window.open `ua` is denied in the host), no restored ids.
export function SourceContextPill({ pill, intent, disabled }) {
  const remove = () => { if (!disabled) pill.onRemove?.(); };
  if (pill.kind === 'agent') return <Pill value="agent" thumbnail={<CdsIcon name="Agent" size="xs" />} label={pill.label}
    onPreviewIntent={intent.onPreviewIntent} onRemove={remove} />;
  return <Pill value="issue" thumbnail={pill.loading ? <CdsSpinner size="sm" /> : <CdsIcon name="Placeholder" size="xs" />}
    label={pill.label} onPreviewIntent={intent.onPreviewIntent} onClick={pill.onOpen ? () => pill.onOpen() : undefined} onRemove={remove} />;
}

// The MessageAttachments Image stand-in. c26fb8b6b Ue clones it (onContextMenu, tabIndex, style) and the CdsContextMenu
// Trigger renders it (`render: g`, merged ref and handlers), so the rest props reach the root element.
function ElementScreenshot({ src, alt, onClick, className = '', ref, srcSet: _srcSet, width: _width, height: _height, ...rest }) {
  const [loaded, setLoaded] = useState(false), [failed, setFailed] = useState(false);
  return <div ref={ref} className={`source-user-attachment-image ${className}`} data-cds="MessageAttachmentsImage" role="button" tabIndex={0}
    aria-label={alt} onClick={onClick} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick?.(event); } }} {...rest}>
    <div className="source-user-attachment-card" data-cds="Card">
      <span aria-hidden="true" className="source-user-attachment-fill" />
      {!failed && <img src={src} alt={alt} width={120} height={120} className="source-user-attachment-picture" data-loaded={loaded ? '' : undefined}
        onLoad={() => setLoaded(true)} onError={() => setFailed(true)} draggable={false} />}
      {failed && <span className="source-user-attachment-glyph"><Icon name="Image" size={24} /></span>}
    </div>
  </div>;
}
const TranscriptCard = createSelectedElementTranscript({ useIntl: useRoutineIntl, Message, Details, useDetailAnimation, useErrors, ImageTile: ElementScreenshot });
export function SourceSelectedElementTranscript({ view, screenshot }) {
  const [viewer, setViewer] = useState(null);
  if (view.simulator) return null;
  return <div className="flex min-w-0 basis-full [justify-content:inherit]" data-element-context="">
    <TranscriptCard view={view} screenshot={screenshot ? { ...screenshot, onOpen: event => setViewer(event.currentTarget) } : undefined} />
    {viewer && screenshot && <SourceImageViewer src={screenshot.src} alt={t('Screenshot of the selected element')} originRef={{ current: viewer }} onClose={() => setViewer(null)} />}
  </div>;
}
