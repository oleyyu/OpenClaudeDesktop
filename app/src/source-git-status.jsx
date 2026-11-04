import React, { useEffect, useRef, useState } from "react";
import { CdsButton, CdsIcon, CdsPopover } from "./generated/view-tabs/index.js"; // shared-frame Uu / us / bk
import { prStatusHintText, GH_INSTALL_URL, GH_AUTH_LOGIN } from "./git-rail-model.mjs";
import { t } from "../electron/i18n/index.mjs";

// W14-code r7 css7-git-band-prbarrow (E84 / E95): the composer's Git status band is the generated c96d752d0 EL (PrBarRow,
// band layout) and its stale hold the generated aAe (source-session-rail-changes-adapters.jsx SessionBandChanges /
// SessionBandHold). The host band row (SourceGitStatus: .sg-row, the chips and their menus, behind, counts, CI glyph, the
// PR split button and busy status, the Commit button) and its hold (SourceGitStatusStale) are gone with their .sg-* rules.
// What stays is the GitHub CLI hint EL takes as prStatusHint (c219730b0 dn), which no generated area slices.
// W14-code r8 css8-gh-hint-popover-host (E84): the hint is the official CDS Popover (c219730b0 ii: Root / Trigger rendering
// the secondary d / Popup / Title; ai: the command row with Close around Run in terminal) with the official utility class
// strings; the host SourcePopover, the hand-copied .sg-gh-* rules (source-git-status.css, deleted) and the 12px host caret
// are gone.

/** c219730b0 dn → ii / ai: the local GitHub CLI hint — a secondary trigger ("GitHub CLI unavailable" /
 * "GitHub CLI signed out" + caret) opening a popover above, end-aligned, w-72, with the explanation and either the
 * Install GitHub CLI action or the `gh auth login` command row (Run in terminal, Copy command). Exported for the session
 * rail PR row (R4i-rail fix: c96d752d0 nze `Un = w && Hn ? b(kye, {cause: Hn, onRunInTerminal: ct})`, kye = c219730b0 dn). */
export function GhHint({ cause, onRunInTerminal, onInstall }) {
  const text = prStatusHintText(cause);
  if (!text) return null;
  // dn: gh_unavailable → ii {cause, action: Install GitHub CLI}; gh_signed_out → ii {cause, children: ai {command, onRun}}.
  // Host: the window refuses new windows (main.cjs setWindowOpenHandler deny), so the official href button opens the
  // install page through onInstall (the external opener).
  const action = cause === "gh_unavailable" && onInstall
    ? <CdsButton variant="secondary" onClick={() => onInstall(GH_INSTALL_URL)}>{t("Install GitHub CLI")}</CdsButton>
    : null;
  return <GhHintPopover text={text} action={action}>
    {cause === "gh_signed_out" ? <GhCommandRow command={GH_AUTH_LOGIN} onRun={onRunInTerminal ?? null} /> : null}
  </GhHintPopover>;
}

/** c219730b0 ii: Root > [Trigger render secondary d ("shrink-0 text-muted hover:text-secondary @max-[699px]/branch-row:hidden",
 * [label, CaretDown xs text-muted-as-secondary]), Popup (ref = initialFocus, top / end / 8 / md,
 * "epitaxy-root break-words w-72") > div "flex flex-col gap-md" > [Title "text-body text-primary", children,
 * action ? div "flex justify-end" : null]]. */
function GhHintPopover({ text, action, children }) {
  const popup = useRef(null);
  return <CdsPopover.Root>
    <CdsPopover.Trigger render={<CdsButton variant="secondary" className="shrink-0 text-muted hover:text-secondary @max-[699px]/branch-row:hidden">
      {text.trigger}<CdsIcon name="CaretDown" size="xs" className="text-muted-as-secondary" />
    </CdsButton>} />
    <CdsPopover.Popup ref={popup} initialFocus={popup} side="top" align="end" sideOffset={8} padding="md" className="epitaxy-root break-words w-72">
      <div className="flex flex-col gap-md">
        <CdsPopover.Title className="text-body text-primary">{text.body}</CdsPopover.Title>
        {children}
        {action ? <div className="flex justify-end">{action}</div> : null}
      </div>
    </CdsPopover.Popup>
  </CdsPopover.Root>;
}

/** c219730b0 ai: div "flex h-control items-center gap-sm rounded bg-alpha-1 ps-md pe-0.5" > [code "me-auto font-mono-ui
 * text-code text-primary", onRun ? Close render ghost sm iconOnly Play (Run in terminal) : null, ghost sm iconOnly
 * Copy / Check (Copy command; tooltip Copied once copied)]. */
function GhCommandRow({ command, onRun }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const copyLabel = t("Copy command");
  const runLabel = t("Run in terminal");
  return <div className="flex h-control items-center gap-sm rounded bg-alpha-1 ps-md pe-0.5">
    <code className="me-auto font-mono-ui text-code text-primary">{command}</code>
    {onRun ? <CdsPopover.Close render={<CdsButton variant="ghost" size="sm" iconOnly icon="Play" aria-label={runLabel} tooltip={runLabel}
      onClick={() => onRun(command)} />} /> : null}
    <CdsButton variant="ghost" size="sm" iconOnly icon={copied ? "Check" : "Copy"} aria-label={copyLabel} tooltip={copied ? t("Copied") : copyLabel}
      onClick={() => { navigator.clipboard?.writeText(command).then(() => setCopied(true), () => {}); }} />
  </div>;
}
