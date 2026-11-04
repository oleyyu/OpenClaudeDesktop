import React from "react";
import { CdsButton } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { qE as recapPlainText } from "./generated/turn-box/shared-11.mjs";
import { t } from "../electron/i18n/index.mjs";
import "./source-recap-card.css";

// c96d752d0 OLe / gH (the transcript tail's 'awayRecap' row): section role=status, overflow-clip rounded-[10px] border
// bg-surface-1 and a 1px/2px 3% shadow. Header (flex items-center justify-between gap-2 border-b px-3 py-1.5): h3 'Recap'
// in text-caption font-medium text-secondary and a ghost base icon-only X 'Dismiss recap' (-me-1.5 text-secondary
// hover:bg-alpha-2). Body: `f("p",{dir:"auto",className:"break-words p-3 text-footnote italic text-secondary",
// children:f("bdi",{children:c})})` with `c=dd(n)` (shared-11 qE: secrets masked, invisible characters stripped, whitespace
// collapsed to one space, at most 500 characters then …; the text's own characters stay, no Markdown); `if(c===void 0…)return null`, so there is no card until the text is
// there (the host's /recap writes it on demand: while it is written nothing shows, as the official card).
export function SourceRecapCard({ recap, onDismiss }) {
  if (!recap || recap.status === "loading") return null;
  const text = recapPlainText(recap.text);
  if (text === undefined) return null;
  // W14-code r6 R6DC-02 (E84): gH's own class strings and its Button (shared-frame Uu), no host restatement. `source-message`
  // / `src-recap` stay as the transcript-row hooks (source-recap-card.css: full width, no row margin).
  return <section role="status" className="source-message src-recap overflow-clip rounded-[10px] border bg-surface-1 shadow-[0_1px_2px_color-mix(in_srgb,var(--cds-black)_3%,transparent)]" data-recap="done">
    <header className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
      <h3 className="src-recap-title text-caption font-medium text-secondary">{t("Recap")}</h3>
      {onDismiss && <CdsButton variant="ghost" iconOnly size="base" icon="X" aria-label={t("Dismiss recap")}
        onMouseDown={(event) => event.preventDefault()} onClick={onDismiss} className="-me-1.5 text-secondary hover:bg-alpha-2" />}
    </header>
    <p dir="auto" className="src-recap-body break-words p-3 text-footnote italic text-secondary"><bdi>{text}</bdi></p>
  </section>;
}
