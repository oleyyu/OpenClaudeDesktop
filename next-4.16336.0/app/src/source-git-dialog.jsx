// B29 nY (cc43287c9 :17250-17370): the Git dialog a worktree start opens when git is missing ('Install Git': Download
// Git opens the platform's download page, initial focus on Not now), blocked ('Git was blocked') or failing to start
// ('Git isn’t working', with git's own error below). Built on the shared ConfirmationDialog (Uu).
import React from "react";
import { SourceConfirmationDialog } from "./source-dialog.jsx";
import { gitDialogCopy } from "./git-dialog-model.mjs";
import "./source-git-dialog.css";

// VJ: font-mono-ui text-code px-0.75 rounded-[3px] bg-alpha-1
const Code = ({ block = false, children }) => <code className={`sgd-code${block ? " sgd-code-block" : ""}`}>{children}</code>;

function withCommand(text, command) {
  if (!command || !text.includes("{command}")) return text;
  const [before, after] = text.split("{command}");
  return <>{before}<Code>{command}</Code>{after}</>;
}

export function SourceGitRequiredDialog({ failure, open = !!failure, platform, onDownload, onOpenTerminal, onClose, onExited }) {
  const copy = gitDialogCopy({ reason: failure?.reason ?? "missing", platform, detail: failure?.detail ?? null, terminal: !!onOpenTerminal });
  return (
    <SourceConfirmationDialog open={open} onExited={onExited} title={copy.title} className="epitaxy-root sgd-dialog"
      initialFocus={copy.action === "download" ? "cancel" : "confirm"}
      body={<>{withCommand(copy.description, copy.command)}{copy.detail ? <Code block>{copy.detail}</Code> : null}
        {/* KJ installGitWindows: the download page stays one click away. */}
        {copy.downloadLink ? <p className="sgd-download"><a href={copy.url} onClick={(event) => { event.preventDefault(); onDownload?.(copy.url); }}>{copy.downloadLink}</a></p> : null}</>}
      confirmLabel={copy.confirmLabel} cancelLabel={copy.cancelLabel}
      onCancel={onClose}
      onConfirm={() => {
        // g: 'Open in terminal' closes only once the command is typed in a tab; otherwise the dialog stays.
        if (copy.action === "terminal") { Promise.resolve(onOpenTerminal?.(copy.terminalCommand)).then((typed) => { if (typed) onClose?.(); }, () => {}); return; }
        if (copy.action === "download") onDownload?.(copy.url);
        onClose?.();
      }} />
  );
}
