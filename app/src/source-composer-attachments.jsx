import React, { useRef, useState } from "react";
import { Icon } from "./icons";
import { SourceTooltip } from "./source-tooltip";
import { SourcePopover } from "./source-popover";
import { attachmentOpenAction, attachmentViewerState, extensionOf } from "./composer-attachments-model.mjs";
import { SourceImageViewer } from "./source-image-viewer.jsx";
import { convertedTooltip } from "./chat-attachment-model.mjs"; // w13-close-chat-composer
import { SourceContextPill, SourceSelectedElementPill, attachmentStripHandlers, useAttachmentPreviewIntent } from "./source-selected-element.jsx";
import "./source-composer-attachments.css";
import { t } from "../electron/i18n/index.mjs";

// 2.2553.1 CDS Attachments slot (shared-11 :1625-1633) hosting the epitaxy
// pills (c099c328d :2200-2330 Al, :2947-2975 Kl/ql, :2896-2912 strip). Image
// pills show the object-URL/file preview with a loading overlay until the
// entry is ready; file pills are the quiet variant with the lowercase
// extension caption (jl) or the Folder glyph. The remove control is the
// hover/focus-revealed 16px circle. Mounted only while entries exist (:7479).
// A press on the pill opens it (Kl/ql onClick, c099c328d :3551-3590): onOpen
// routes it through attachmentOpenAction.
function AttachmentPill({ entry, onRemove, onOpen, disabled }) {
  const image = entry.kind === "image";
  const name = entry.relativePath || entry.name;
  // Skills are editor chips now (source-composer-editor.jsx command_chip kind 'skill'), never pills.
  const body = (
    <button type="button" aria-label={name}
      className={`epitaxy-pill-body sca-body ${image ? "sca-body--image" : "epitaxy-pill-body--flat sca-body--flat"}`}
      onMouseDown={(event) => event.preventDefault()} onClick={(event) => onOpen?.(entry, event.currentTarget)}>
      {image ? (
        <span className="sca-thumb">
          {entry.previewUrl && <img src={entry.previewUrl} alt="" className="sca-picture" draggable={false} />}
          {entry.status === "loading" && (
            <span role="status" className="sca-loading">
              <span className="sc-spinner" aria-hidden="true" />
              <span className="sca-sr-only">{t("Processing image")}</span>
            </span>
          )}
        </span>
      ) : (
        <span className="sca-glyph" aria-hidden="true">
          {entry.isDirectory ? <Icon name="Folder" size={16} /> : <span className="sca-extension">{extensionOf(entry.name)}</span>}
        </span>
      )}
    </button>
  );
  return (
    <div data-cds-attachment="" className="sca-pill" data-kind={entry.kind} data-status={entry.status}>
      {/* w13-close-chat-composer (chatfn-attachments-02): shared-7's file tile hands its type tag OD {tooltipText: "PDF
          converted to text"} for a converted PDF (`t.file_type === "pdf"`); this pill's type tag is the extension caption
          inside the one pill tooltip, so the line rides as that tooltip's detail. */}
      <SourceTooltip content={name} detail={convertedTooltip(entry) ?? undefined}>{body}</SourceTooltip>
      <button type="button" tabIndex={-1} aria-label={t("Remove {name}", { name })} className="epitaxy-pill-remove sca-remove"
        disabled={disabled} onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => { event.stopPropagation(); event.preventDefault(); onRemove(entry.id); }}>
        <Icon name="X" size={12} />
      </button>
    </div>
  );
}

// A context snippet (c099c328d :3364-3385): Al{quiet, pinPreview, thumbnail Quote sm, label: e.label ?? Il(text)} — the
// 40px quiet pill with the Quote glyph, its tooltip the label with 'Click to preview'; a press pins the preview popover
// (top-start, 8px, Uc: 320px wide, at most 280px tall, the body as wrapped text) and Escape or a press outside closes it.
// Delete/Backspace on the pill removes it (Al xe), as the × does.
function SnippetPill({ entry, onRemove, disabled, previewLayerBase }) {
  const [preview, setPreview] = useState(false), body = useRef(null);
  return (
    <div data-cds-attachment="" className="sca-pill" data-kind="snippet" data-status={entry.status}>
      <SourceTooltip content={entry.label} detail={t("Click to preview")} open={preview ? false : undefined}>
        <button ref={body} type="button" aria-label={entry.label} aria-haspopup="dialog" aria-expanded={preview}
          className="epitaxy-pill-body epitaxy-pill-body--flat sca-body sca-body--flat"
          onMouseDown={(event) => event.preventDefault()} onClick={() => setPreview((open) => !open)}
          onKeyDown={(event) => { if ((event.key === "Delete" || event.key === "Backspace") && !disabled && onRemove) { event.preventDefault(); onRemove(entry.id); } }}>
          <span className="sca-glyph" aria-hidden="true"><Icon name="Quote" size={16} /></span>
        </button>
      </SourceTooltip>
      {onRemove && <button type="button" tabIndex={-1} aria-label={t("Remove {name}", { name: entry.label })} className="epitaxy-pill-remove sca-remove"
        disabled={disabled} onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => { event.stopPropagation(); event.preventDefault(); onRemove(entry.id); }}>
        <Icon name="X" size={12} />
      </button>}
      {preview && body.current && <SourcePopover anchor={body.current} side="top" align="start" sideOffset={8} padding="none" label={entry.label}
        dataCds="AttachmentPreview" layerBase={previewLayerBase} className="sca-preview" onClose={() => setPreview(false)}>
        <div className="sca-preview-body" tabIndex={0} role="group" aria-label={entry.label} data-epitaxy-pill-preview="">
          <span className="sca-preview-text">{entry.text}</span>
        </div>
      </SourcePopover>}
    </div>
  );
}

// The draft's agent and issue pills are Go's ko (SourceContextPill, c0fbbe82d); they and the element pills share the strip's
// one preview intent (Go `onPreviewIntent:Nt,onPreviewEnter:rn,onPreviewLeave:an`), whose handlers ride on the strip.
// Ue/Za (c099c328d :3143-3150, :3518-3526): an image pill opens the image viewer on its
// preview, named by the image, zooming from the pill; the viewer state stays here. A file or
// directory pill goes to onOpenFile(entry, 'file' | 'reveal') (Gl :3542-3550, adapted).
export function SourceComposerAttachments({ entries = [], contextPills = [], onRemove, onOpenFile, disabled = false, previewLayerBase = 0 }) {
  const [viewer, setViewer] = useState(null);
  const intent = useAttachmentPreviewIntent();
  const firstElementPill = useRef(null);
  const firstElement = entries.find((entry) => entry.kind === "elementContext");
  // The viewer lives only as long as its entry: a removed or swapped-out attachment (a draft swap,
  // a send, the last pill removed) closes it, and the state is cleared before the empty early
  // return so a later attachment never reopens a stale (possibly revoked) preview.
  const shown = attachmentViewerState(viewer, entries);
  if (viewer && !shown) setViewer(null);
  if (!entries.length && !contextPills.length) return null;
  const open = (entry, origin) => {
    const action = attachmentOpenAction(entry);
    if (action === "view") setViewer({ id: entry.id, src: entry.previewUrl, alt: entry.name, origin });
    else if (action) onOpenFile?.(entry, action);
  };
  return (
    <div className="sca-wrap">
      <div data-cds-composer-attachments="" className="sca-slot">
        <div className="sca-strip" {...attachmentStripHandlers(intent)}>
          {contextPills.map((pill) => <SourceContextPill key={pill.kind} pill={pill} intent={intent} disabled={disabled} />)}
          {entries.map((entry) => entry.kind === "elementContext"
            ? <SourceSelectedElementPill key={entry.id} entry={entry} intent={intent} anchorRef={entry === firstElement ? firstElementPill : undefined}
              onRemove={onRemove} disabled={disabled} />
            : entry.kind === "snippet"
            ? <SnippetPill previewLayerBase={previewLayerBase} key={entry.id} entry={entry} onRemove={onRemove} disabled={disabled} />
            : <AttachmentPill key={entry.id} entry={entry} onRemove={onRemove} onOpen={open} disabled={disabled} />)}
        </div>
      </div>
      {shown && <SourceImageViewer key={shown.id} src={shown.src} alt={shown.alt} originRef={{ current: shown.origin }} onClose={() => setViewer(null)} />}
    </div>
  );
}
