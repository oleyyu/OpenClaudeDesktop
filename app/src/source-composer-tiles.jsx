// R4g-composer CP4 (X7-10, ledger composer-01): the Code card's staged attachments as the 2.42304.0 tiles.
//
// The official Code composer's shelf (c227f4d5e uM: `lc.Attachments` > `div.epitaxy-attachment-shelf`) holds the strip
// cc43287c9 YG portals into it: Wx > uk = c0fbbe82d Ri (exported `o`). Ri lays everything out in one wrapping row —
// `div.flex.flex-wrap.items-end.gap-xs` — the tiles first (images: Bi > hr = Hp.Image; files: Vi > _r = Hp.File, the
// extension or "Folder" as badge; snippets: Hi > vr = Hp.Quote with the "Excerpt" badge; annotations), then one pill group
// `flex flex-wrap items-center gap-1` (the agent, the GitHub issue, saved-draft text snippets, element contexts: Oi pills).
// A press on an image opens the image viewer (st) from the tile, a file goes to the file preview (zi: a text preview or
// a new tab), a snippet to the file-preview modal titled "Excerpt"; removing a tile hands focus to the next one (pr / fr).
//
// Here the tiles and their wrappers are the generated originals (composer-attachment-tiles.mjs: hr / _r / vr over shared-2
// wp / Pp / Bp in chat-composer-attachments.mjs); this module is Ri's layout for the host's entries
// ({kind: "image" | "file" | "snippet" | "elementContext", …}, src/composer-attachments-model.mjs) plus the host ends of
// each press. Host differences: a file's press opens it in the Files pane, or reveals a folder (attachmentOpenAction:
// the official text preview / new tab have no local counterpart); a snippet's press pins the host preview popover with its
// text (SourcePopover, as the previous pill did) instead of the file-preview modal; the pills are Go's ko (agent / issue
// SourceContextPill, element contexts SourceSelectedElementPill) under one strip intent in Ri's pill row; a saved line comment is
// fs's annotation tile (a snippet that carries `annotation`, W12b cf-01); a held text ({kind: "text"}, W14-code composer-15)
// is Go's "Saved draft" ko pill with its generated dialog (composer-held-text-dialog.mjs ca) and Go's "Remove saved
// draft?" confirmation; no annotate / replace image flow (the host has none); while the card sends, removal is held (the host takes the entries
// for the send), as the previous pills' disabled remove did. Ki's project-files rename (c63c52947 Pt, /mnt/project-files/
// paths) is remote-only: a host file shows `relativePath || name`.
import React, { useRef, useState } from "react";
import { ComposerFileTile, ComposerImageTile, ComposerQuoteTile, ComposerVideoTile, videoMimeTypePattern } from "./generated/code-composer/composer-attachment-tiles.mjs";
import { videoFileNamePattern } from "./generated/code-composer/composer-video-types.mjs";
import { annotationText, annotationWhere, attachmentLabel, attachmentOpenAction, attachmentViewerState } from "./composer-attachments-model.mjs";
import { SourceImageViewer } from "./source-image-viewer.jsx";
import { SourcePopover } from "./source-popover";
import { AttachmentPill, SourceContextPill, SourceSelectedElementPill, attachmentStripHandlers, useAttachmentPreviewIntent } from "./source-selected-element.jsx";
import { HeldTextDialog } from "./generated/code-composer/composer-held-text-dialog.mjs";
import { CdsConfirmationDialog, CdsContextMenu, CdsIcon } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { useRoutineIntl } from "./source-routine-adapters.jsx";
import "./source-composer-attachments.css";
import { t } from "../electron/i18n/index.mjs";

// R4i-graph GR3: Vi's video branch (`e.file !== void 0 && Ze.test(e.fileName) && Si.test(e.file.type) ? f(gr, …) : f(_r, …)`):
// only an attachment that keeps its File, named and typed like a video, is a Video tile (gr > Hp.Video). The official
// local environment's attachments keep no File, nor do the host's (stageFiles keeps the path), so these stay File tiles.
export function isVideoTileEntry(entry) {
  return entry?.file !== undefined && entry.file !== null && videoFileNamePattern.test(entry.name ?? "") && videoMimeTypePattern.test(entry.file.type ?? "");
}

/** Ri's row and pill group classes (c0fbbe82d `i("div", {ref: O, className: …})` and `mt = i(ct, {…, className: …})`). */
export const TILE_ROW_CLASS = "flex flex-wrap items-end gap-xs";
export const PILL_ROW_CLASS = "flex flex-wrap items-center gap-1";

// W12b cf-01: c0fbbe82d fs over Wi (the Quote tile): a saved line comment (a snippet carrying `annotation`) is named
// "Comment on {where}" with fs's text, the "Comment" badge and Bo's where (zo's "(before changes)" on deleted lines) as
// its tooltip; Go maps them after the snippets. Its press is cc43287c9 lg (onClickAnnotation from the host).
export function annotationWhereLabel(annotation) {
  const where = annotationWhere(annotation);
  return annotation.side === "deletions" ? t("{where} (before changes)", { where }) : where;
}
export function ComposerAttachmentTiles({ entries = [], contextPills = [], onRemove, onOpenFile, onClickAnnotation, onEditHeldText, disabled = false, previewLayerBase = 0 }) {
  const [viewer, setViewer] = useState(null);
  // Go's Saved draft state: Y / Me (the open dialog: id, text, open, the opening count that keys it) and Ie / Le (the
  // pill whose removal waits on "Remove saved draft?").
  const [held, setHeld] = useState(null);
  const [removing, setRemoving] = useState(null);
  const intl = useRoutineIntl();
  const [quote, setQuote] = useState(null);
  // Go's one preview intent for the whole pill group (600 / 200 ms; moving between pills switches at once).
  const intent = useAttachmentPreviewIntent();
  const firstElementPill = useRef(null);
  // The viewer and a snippet's preview live only as long as their entry (a send, a draft swap, a removal closes them).
  const shown = attachmentViewerState(viewer, entries);
  if (viewer && !shown) setViewer(null);
  const quoted = quote ? entries.find((entry) => entry.id === quote.id && entry.kind === "snippet") : null;
  if (quote && !quoted) setQuote(null);
  if (!entries.length && !contextPills.length) return null;
  const remove = (id) => { if (!disabled) onRemove?.(id); };
  const images = entries.filter((entry) => entry.kind === "image");
  const files = entries.filter((entry) => entry.kind === "file");
  const snippets = entries.filter((entry) => entry.kind === "snippet" && !entry.annotation);
  const annotations = entries.filter((entry) => entry.kind === "snippet" && entry.annotation);
  const elements = entries.filter((entry) => entry.kind === "elementContext");
  const heldTexts = entries.filter((entry) => entry.kind === "text");
  // Go Pe: open the dialog on a held text (a new opening remounts it); Fe: close it, keeping its text for the exit.
  const openHeld = (entry) => setHeld((open) => ({ id: entry.id, text: entry.text, open: true, opening: (open?.opening ?? 0) + 1 }));
  const closeHeld = () => setHeld((open) => (open ? { ...open, open: false } : open));
  // Go's text pill: ko {quiet, opensDialog, Note xs, wideLabel, "Saved draft", the 1ztYc4dAWB count label, Click to edit. /
  // Click to view., the Edit menu item, onClick (close the preview intent, open), onRequestRemove (the confirmation)}.
  const heldPill = (entry) => <AttachmentPill key={entry.id} value={entry.id} quiet opensDialog thumbnail={<CdsIcon name="Note" size="xs" />} wideLabel
    label={intl.formatMessage({ defaultMessage: "Saved draft", id: "dxXfrwuTJF" })}
    ariaLabel={intl.formatMessage({ defaultMessage: "Saved draft \u00B7 {count} {chars, plural, one {character} other {characters}}", id: "1ztYc4dAWB" },
      { chars: entry.text.length, count: intl.formatNumber(entry.text.length, { notation: "compact", compactDisplay: "long", maximumFractionDigits: 1 }) })}
    detail={onEditHeldText ? intl.formatMessage({ defaultMessage: "Click to edit.", id: "Z3sULMIWJx" }) : intl.formatMessage({ defaultMessage: "Click to view.", id: "UI5mDVwEZ2" })}
    menuItems={<CdsContextMenu.Item onClick={() => openHeld(entry)}>{intl.formatMessage({ defaultMessage: "Edit", id: "wEQDC6Wv3/" })}</CdsContextMenu.Item>}
    onPreviewIntent={intent.onPreviewIntent} onClick={() => { intent.close(true); openHeld(entry); }}
    onRequestRemove={onRemove && !disabled ? () => setRemoving(entry.id) : undefined} onRemove={() => remove(entry.id)} />;
  // Ri `lt !== 0`: the pill group renders only when some pill exists.
  const pills = contextPills.length + heldTexts.length + elements.length > 0
    ? <div className={PILL_ROW_CLASS} {...attachmentStripHandlers(intent)}>
        {contextPills.map((pill) => <SourceContextPill key={pill.kind} pill={pill} intent={intent} disabled={disabled} />)}
        {heldTexts.map(heldPill)}
        {elements.map((entry, index) => <SourceSelectedElementPill key={entry.id} entry={entry} intent={intent} anchorRef={index === 0 ? firstElementPill : undefined}
          onRemove={onRemove} disabled={disabled} />)}
      </div>
    : null;
  return <>
    <div className={TILE_ROW_CLASS}>
      {/* Bi: an image tile, pending while it loads; its press opens the viewer from the image (`o(img ?? null, tile)`). */}
      {/* A path-backed image gets its file:// preview once staged (markReady): until then no src at all. */}
      {images.map((entry) => <ComposerImageTile key={entry.id} src={entry.previewUrl || undefined} name={entry.name} pending={entry.status === "loading"}
        onOpen={(image, tile) => { if (attachmentOpenAction(entry) === "view") setViewer({ id: entry.id, src: entry.previewUrl, alt: entry.name, origin: image ?? tile }); }}
        onRemove={() => remove(entry.id)} />)}
      {/* Vi > gr for a File-backed video (isVideoTileEntry), else Vi > _r: Ki's name (relativePath || fileName), the extension / Folder badge, qi's path for the hover card. */}
      {files.map((entry) => {
        const action = attachmentOpenAction(entry);
        if (isVideoTileEntry(entry)) return <ComposerVideoTile key={entry.id} file={entry.file} name={attachmentLabel(entry)}
          onOpen={action ? () => onOpenFile?.(entry, action) : undefined} onRemove={() => remove(entry.id)} />;
        return <ComposerFileTile key={entry.id} name={attachmentLabel(entry)} fileName={entry.name} isDirectory={entry.isDirectory === true}
          onOpen={action ? () => onOpenFile?.(entry, action) : undefined} onRemove={() => remove(entry.id)} filePath={entry.path || undefined} />;
      })}
      {/* Hi > vr: the snippet's label, its text, the "Excerpt" badge with the label as its tooltip. */}
      {snippets.map((entry) => <ComposerQuoteTile key={entry.id} name={entry.label} text={entry.text ?? ""} badge={t("Excerpt")} badgeTooltip={entry.label}
        onOpen={(event) => setQuote((open) => (open?.id === entry.id ? null : { id: entry.id, anchor: event?.currentTarget ?? null }))}
        onRemove={() => remove(entry.id)} />)}
      {/* fs: Wi {name: "Comment on {where}", text, badge: "Comment", badgeTooltip: where, onOpen: n && (() => n(t)), onRemove}. */}
      {annotations.map((entry) => {
        const where = annotationWhereLabel(entry.annotation);
        return <ComposerQuoteTile key={entry.id} name={t("Comment on {where}", { where })} text={annotationText(entry.annotation, where)} badge={t("Comment")} badgeTooltip={where}
          onOpen={onClickAnnotation ? () => onClickAnnotation(entry.annotation) : undefined} onRemove={() => remove(entry.id)} />;
      })}
      {pills}
    </div>
    {shown && <SourceImageViewer key={shown.id} src={shown.src} alt={shown.alt} originRef={{ current: shown.origin }} onClose={() => setViewer(null)} />}
    {/* Go Wt: ca keyed `${id}:${opening}` — Save hands the text to onEditSnippetText (readOnly without it), its own Remove
        confirmation removes the pill; en: the pill's "Remove saved draft?" (danger Remove, closes on confirm). */}
    {held && <HeldTextDialog key={`${held.id}:${held.opening}`} open={held.open} onOpenChange={(open) => { if (!open) closeHeld(); }} text={held.text}
      onSave={(text) => onEditHeldText?.(held.id, text)} onClosed={() => setHeld(null)} onRemove={() => remove(held.id)} readOnly={!onEditHeldText} />}
    <CdsConfirmationDialog open={removing !== null} onOpenChange={(open) => { if (!open) setRemoving(null); }}
      title={intl.formatMessage({ defaultMessage: "Remove saved draft?", id: "Z6Mb9r9ele" })}
      description={intl.formatMessage({ defaultMessage: "This is the only copy of this text.", id: "tK3aS6EQE+" })}
      confirmLabel={intl.formatMessage({ defaultMessage: "Remove", id: "G/yZLul6P1" })} confirmVariant="danger" closeOnConfirm
      onConfirm={() => { if (removing !== null) { remove(removing); closeHeld(); } }} />
    {quoted && quote.anchor && <SourcePopover anchor={quote.anchor} side="top" align="start" sideOffset={8} padding="none" label={quoted.label}
      dataCds="AttachmentPreview" layerBase={previewLayerBase} className="sca-preview" onClose={() => setQuote(null)}>
      <div className="sca-preview-body" tabIndex={0} role="group" aria-label={quoted.label} data-epitaxy-pill-preview="">
        <span className="sca-preview-text">{quoted.text}</span>
      </div>
    </SourcePopover>}
  </>;
}
