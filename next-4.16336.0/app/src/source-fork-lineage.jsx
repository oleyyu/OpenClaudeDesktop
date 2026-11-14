import React from "react";
import { Icon } from "./icons";
import { t } from "../electron/i18n/index.mjs";
import "./source-fork-lineage.css";

// The top of a forked session's transcript: where it came from, a link back when that session is listed
// (official code-approval 'Forked from {title}' / 'Forked from another session', 'Go to parent session {title}').
export function SourceForkLineage({ parentTitle = null, onOpen = null }) {
  const label = parentTitle ? t("Forked from {title}", { title: parentTitle }) : t("Forked from another session");
  return <div className="source-fork-lineage" data-fork-lineage="">
    <Icon name="GitBranch" size={14} aria-hidden="true" />
    {onOpen
      ? <button type="button" className="source-fork-lineage-link" aria-label={parentTitle ? t("Go to parent session {title}", { title: parentTitle }) : label} onClick={onOpen}>{label}</button>
      : <span>{label}</span>}
  </div>;
}

// The other end, in the parent's transcript after the turn a fork was made at (official fork-marker Ehe/Ohe
// 'Forked here: {title}'): a link that opens the fork, or plain text with '· Archived' when it can't be opened.
export function SourceForkMarker({ forks = [], onOpen = null }) {
  if (!forks.length) return null;
  return <div className="source-fork-marker" data-fork-marker="">
    {forks.map((fork) => {
      const title = fork.title || t("Untitled session");
      const label = t("Forked here: {title}", { title });
      const open = onOpen && !fork.archived ? () => onOpen(fork.id) : null;
      return <div key={fork.id} className="source-fork-lineage" data-fork-id={fork.id}>
        <Icon name="GitBranch" size={14} aria-hidden="true" />
        {open
          ? <button type="button" className="source-fork-lineage-link" onClick={open}>{label}</button>
          : <span className="source-fork-lineage-text">{label}{fork.archived ? <span className="source-fork-lineage-archived"> · {t("Archived")}</span> : null}</span>}
      </div>;
    })}
  </div>;
}
