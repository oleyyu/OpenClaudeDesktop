import React from "react";
import { AttachmentFileName, attachmentNameExtension } from "./generated/code-current/attachment-file-name.mjs";
import { displayText } from "./generated/code-current/display-text.mjs";

// R2-topbar TT-07 / cov3-01: a non-image file a user message carries, as 2.42304.0 draws it
// (shared-2-Cb74JByF.js Pp `"data-cds": "MessageAttachmentsFile"` → card frame jp → name Np).
//
// - The shown name is `${np(e)}` (np = shared-frame fn, displayText: control and bidi-override characters dropped);
//   it is the sr-only text, which jp puts before the content column.
// - The content column is jp's "flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-xs"
//   (.source-user-attachment-file-body in source-session.css) holding Pp's renderContent
//   `div.flex.min-w-0.flex-col > Np` and then the badge.
// - Np (generated attachment-file-name.mjs) clamps the name to `lines` lines and, once the name overflows, splits it
//   into a head (max-h of lines-1) plus "…" and the last 12 graphemes, keeping the extension whole. Pp picks the
//   lines as `m = description && failed ? 2 : description || failed ? 3 : 4`; a Code user message's file part has no
//   description and never fails, so it is 4. Np is keyed `${m}:${name}` so a new name re-measures its overflow.
// - The badge text is `np(badge ?? ap(name)[1].toUpperCase())` (ap = attachmentNameExtension: nothing for a leading
//   dot or a trailing one) inside a <bdi>, shown while it is not blank (jp `A`). The local badge keeps its own
//   chip styling (shared-frame Badge is not migrated here).
// - Host difference: the card root keeps the full path as its native title (local addition); Np adds the official
//   displayTitle(name) title on the name itself.
export const USER_FILE_NAME_LINES = 4;

export function SourceUserFileCard({ name, path }) {
  const shown = `${displayText(name)}`;
  const badge = displayText(attachmentNameExtension(shown)[1].toUpperCase());
  const lines = USER_FILE_NAME_LINES;
  return (
    <div data-cds="MessageAttachmentsFile" className="source-user-attachment-file" title={path}>
      <div data-cds="Card" className="source-user-attachment-card">
        <span aria-hidden="true" className="source-user-attachment-fill" />
        <span className="sr-only">{shown}</span>
        <div className="source-user-attachment-file-body">
          <div className="flex min-w-0 flex-col">
            <AttachmentFileName key={`${lines}:${shown}`} name={shown} lines={lines} />
          </div>
          {badge.trim() !== "" && <span className="source-user-attachment-badge"><bdi>{badge}</bdi></span>}
        </div>
      </div>
    </div>
  );
}
