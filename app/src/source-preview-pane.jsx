import { previewDOMTabKey } from "../electron/preview-tab-shortcuts.mjs";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { previewLinksStore } from "./preview-links-model.mjs";
import { Icon } from "./icons";
import { SourcePreviewSettingsMenu, SourcePreviewClearDataDialog } from "./source-preview-settings-menu.jsx";
import { SourcePreviewAllowedSites } from "./source-preview-allowed-sites.jsx";
import { usePreviewCopyUrl } from "./source-preview-copy-url.jsx";
import { SourceTooltip } from "./source-tooltip";
import { SourceSpinner } from "./source-pane-states.jsx";
import { SourceEmptyState } from "./source-transcript-states.jsx";
import { assistantName } from "./persona-store.mjs";
import { addServerErrorText, candidateRow, detectedCandidates, detectionActive, detectionKey, serverTriggerVisible, shouldHandOffFocus } from "./preview-detection-model.mjs";
import { SourceAnsiText } from "./source-ansi-text.jsx";
import { SourcePreviewAddress, SourcePreviewNavigation } from "./source-preview-address.jsx";
import { SourcePreviewServerMenu } from "./source-preview-server-menu.jsx";
import { SourcePreviewTabs } from "./source-preview-tabs.jsx";
import { ownsSelectedElement } from './preview-element-attachments.mjs';
import { SourceDialog, SourceConfirmationDialog } from "./source-dialog";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { SourcePreviewSketch } from "./source-preview-sketch.jsx";
import { matchSketchCommand } from './generated/code-editor/preview-sketch-keys.mjs';
import {
  ADD_SERVER_PROMPT, anyServerRunning, LOGS_HEIGHT, SHOW_RETRY_MS, SERVER_SETTLE_MS, boundsOf, clampLogsHeight, failedServer, failureLogLine, heldPort, isOccluded, logTone,
  logsServer, logsSourceLabel, PREVIEW_LOGS_EXPANDED_KEY, readLogsExpanded, serverStartHold, startFailurePrompt, startFailureText, writeLogsExpanded,
  pageError, pageRefused, pageServer, previewSurface, stoppedServer, sameBounds, serverErrorText, serverRows, serverMenuRows, serverStatus, showsPage, viewportLabel, viewportRows,
  launchEntryMissingText, noLaunchEntry, pickUnavailable, SKETCH_AWAIT_CAPTURE_MS,
} from "./preview-model.mjs";
import { t } from "../electron/i18n/index.mjs";
import "./source-preview-pane.css";

// Current Preview tabs plus the original 2.31226.0 navigation row and address field.
// Current source dev-server control is separate from preview settings in the tab header.
// The page itself is a WebContentsView the main process lays over .spv-viewport (electron/preview-service.cjs):
// this component reports that rectangle on every change, hides the page while something covers it (a menu, a
// dialog, a tooltip) and shows the start page, server states and errors in the DOM when no page is shown. When
// another pane of the session shows the page, main refuses this pane's show (2.2553.1 claimant): the viewport stays
// empty, and the pane asks again 50/250/1000 ms later and whenever its layout changes.

// A page capture (preview-capture bytes) as a PNG data URL with its pixel size.
const captureDataUrl = (bytes) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error(t("Couldn’t capture the page.")));
  reader.readAsDataURL(new Blob([bytes], { type: "image/png" }));
});
const imageSize = (src) => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
  image.onerror = () => resolve({ width: 0, height: 0 });
  image.src = src;
});
const SKETCH_SHORTCUT = "cmd+shift+x";
const PICK_SHORTCUT = 'cmd+shift+s';

const newInstanceId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
const prefStorage = () => { try { return globalThis.window?.localStorage ?? null; } catch { return null; } };

// A dev server's output (preview-server-logs) while enabled: once, or every second (cf580efe9 fa's getLogs poll, 1e3).
// version: read once more when it changes (a Try again that failed again has a new startedAt).
function useServerLogs(call, name, enabled, follow, version = null) {
  const [logs, setLogs] = useState({ name: null, lines: [] });
  useEffect(() => {
    if (!enabled || !name) return undefined;
    let live = true, timer = 0;
    const poll = () => call("preview-server-logs", { name, lines: 500 })
      .then((result) => { if (live) setLogs({ name, lines: result?.lines ?? [] }); }, () => {})
      .finally(() => { if (live && follow) timer = setTimeout(poll, 1000); });
    poll();
    return () => { live = false; clearTimeout(timer); };
  }, [call, name, enabled, follow, version]);
  return name && logs.name === name ? logs.lines : [];
}

function GhostButton({ label, icon, shortcut, onClick, disabled = false, className = "", pressed, children, ...rest }) {
  return (
    <SourceTooltip content={label} shortcut={shortcut} side="bottom" hoverable={false}>
      <button type="button" className={`source-icon-button spc-ghost spv-icon ${className}`.trim()} aria-label={label} aria-pressed={pressed} disabled={disabled}
        onMouseDown={(event) => event.preventDefault()} onClick={onClick} {...rest}>
        {children ?? <Icon name={icon} size={16} />}
      </button>
    </SourceTooltip>
  );
}

function DownloadNotice({ download, onReveal, onDismiss }) {
  const text = download.state === "completed" ? t("Downloaded {file}", { file: download.file })
    : download.state === "failed" ? t("Couldn’t download {file}", { file: download.file })
      : t("{file} wasn’t downloaded: the preview has to be on screen to ask where to save it.", { file: download.file });
  return (
    <div className="spv-download" role="status" data-preview-download={download.state}>
      <Icon name={download.state === "completed" ? "Download" : "Warning"} size={16} className="spv-download-icon" />
      <span className="spv-download-text"><bdi>{text}</bdi></span>
      {download.state === "completed" && download.canReveal && <button type="button" className="spv-button" data-variant="secondary" onClick={onReveal}>{t("Show in Finder")}</button>}
      <GhostButton label={t("Dismiss")} icon="X" onClick={onDismiss} />
    </div>
  );
}

// cf580efe9 dr (readable 382-424): one detected server — a footnote caption ({framework} · port {port}, or port
// {port}), the command in the code face (selectable; truncated when blocked), the red validation reason when it can't
// be used, and a secondary "Use this" only when it can.
export function PreviewCandidateRow({ candidate, busy, onUse }) {
  const row = candidateRow(candidate);
  return (
    <div className="flex w-full items-center gap-xs rounded border border-alpha-2 px-md py-sm text-left" data-detected-server={candidate.name}>
      <div className="min-w-0 flex-1">
        <div className="text-footnote text-muted">{row.framework ? t("{framework} · port {port}", { framework: row.framework, port: row.port }) : t("port {port}", { port: row.port })}</div>
        <code className={row.blocked ? "block truncate text-code text-primary" : "block break-words text-code text-primary select-all"}>{row.command}</code>
        {row.problem && <div className="mt-[2px] text-footnote text-danger">{t(row.problem)}</div>}
      </div>
      {row.blocked ? null : <SourceSettingsButton variant="secondary" disabled={busy} onClick={() => onUse(candidate)}>{t("Use this")}</SourceSettingsButton>}
    </div>
  );
}

// cf580efe9 fr's markup (readable 520-660) for what the static scan found: the lead sentence, the rows, a save error,
// the launch.json note and "Back to browsing". The agent scan's states (its spinner, "looked and found no dev
// server", Preview HTML / Ask) aren't here: no local core offers the hidden read-only scan (B17 notes).
export function PreviewServerDetection({ candidates, busy, addError, onUse, onBack }) {
  const found = candidates !== null && candidates.length > 0;
  return (
    <div className="flex w-full flex-col items-center justify-center gap-sm text-center" data-preview-detection="">
      {found && <p className="text-body text-secondary max-w-[44ch]">{t("Dev server detected. This command runs in your shell when the preview starts.")}</p>}
      {found && <div className="flex w-full max-w-[420px] flex-col gap-1.25">
        {candidates.map((candidate) => <PreviewCandidateRow key={candidate.name} candidate={candidate} busy={busy} onUse={onUse} />)}
      </div>}
      {addError !== null && <p role="alert" className="text-footnote text-danger">{t(addServerErrorText(addError))}</p>}
      {found && <p className="text-footnote text-muted max-w-[44ch]">{t("Your choice is saved to .claude/launch.json in this project.")}</p>}
      <button type="button" onClick={onBack} className="group inline-flex items-center gap-0.75 border-0 bg-transparent p-0 text-footnote text-muted">
        <Icon name="ArrowLeft" size={16} />
        <span className="underline-offset-2 group-hover:underline">{t("Back to browsing")}</span>
      </button>
    </div>
  );
}

// cf580efe9 gr (readable 734-790): the start page without a launch.json — an xl Globe in text-disabled, the body-size
// title over a muted footnote, and "Preview your app instead? Detect dev server" as a ghost xxs link; the detection
// subtree below, replacing all of that while it has something to show (detectionActive).
// cf550b864 s/c (cf580efe9 Si _n/pn): with a session, "Browse with {assistant}"; on the New session page (no session,
// so no agent to ask) "Browse the web" / "Type a URL to open a site." (B39 landing preview).
export function PreviewStartPrompt({ onSetUp, detection = null, detectionActive = false, landing = false }) {
  const assistant = assistantName();
  return (
    <div role="status" className="flex h-full w-full items-center justify-center overflow-y-auto p-lg">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-md text-center">
        {!detectionActive && <>
          <Icon name="Globe" size={32} className="text-disabled" />
          <div className="flex flex-col items-center gap-[4px]">
            <p className="m-0 max-w-[36ch] text-body text-primary">{landing ? t("Browse the web") : t("Browse with {assistant}", { assistant })}</p>
            <p className="m-0 max-w-[44ch] text-footnote text-muted">{landing ? t("Type a URL to open a site.") : t("Type a URL or ask {assistant} to open a site. {assistant} can read, click, and type.", { assistant })}</p>
          </div>
          {onSetUp && <p className="m-0 flex flex-wrap items-center justify-center gap-x-[3px] text-footnote text-muted">
            <span>{t("Preview your app instead?")}</span>
            <SourceSettingsButton variant="ghost" size="xxs" onClick={onSetUp} onMouseDown={(event) => event.preventDefault()}>{t("Detect dev server")}</SourceSettingsButton>
          </p>}
        </>}
        {detection}
      </div>
    </div>
  );
}

// cf580efe9 Dr + fr's state (readable 430-520, 939-958): the static scan runs on mount and again for another session or
// folder (a generation guard drops stale answers); "Use this" appends the server to .claude/launch.json and the pane
// runs it (Si onServerAdded); "Back to browsing" clears the list and brings the prompt back. Without the agent scan,
// "Detect dev server" asks the session's agent to set the server up (Dr onSetUp = a ?? r with a = null).
function PreviewNoConfig({ call, sessionId, cwd, onSetUp, onServerAdded }) {
  const [candidates, setCandidates] = useState(null);
  const [busy, setBusy] = useState(false);
  const [addError, setAddError] = useState(null);
  const generation = useRef(0);
  const key = detectionKey(sessionId, cwd);
  useEffect(() => {
    let cancelled = false;
    const current = ++generation.current;
    setCandidates(null); setAddError(null); setBusy(false);
    call("preview-detect").then((result) => detectedCandidates(result), () => []).then((found) => {
      if (!cancelled && generation.current === current) setCandidates(found);
    });
    return () => { cancelled = true; };
  }, [call, key]);
  const use = useCallback((candidate) => {
    const current = generation.current;
    setBusy(true); setAddError(null);
    call("preview-use-server", { candidate })
      .then((outcome) => { if (generation.current === current) { if (outcome?.ok) onServerAdded?.(outcome.name ?? candidate.name); else setAddError(outcome?.reason ?? "write-failed"); } })
      .catch(() => { if (generation.current === current) setAddError("write-failed"); })
      .finally(() => { if (generation.current === current) setBusy(false); });
  }, [call, onServerAdded]);
  const back = useCallback(() => { generation.current += 1; setCandidates([]); setAddError(null); setBusy(false); }, []);
  const active = detectionActive({ candidates, addError });
  return (
    <div className="absolute inset-0" data-preview-start="empty">
      <PreviewStartPrompt onSetUp={onSetUp} detectionActive={active} landing={isLandingPreview(sessionId)}
        detection={active ? <PreviewServerDetection candidates={candidates} busy={busy} addError={addError} onUse={use} onBack={back} /> : null} />
    </div>
  );
}

// cf580efe9 Or setting-off (readable 1006-1027): Settings › Code › Preview › 'Let {assistant} use the preview' is off
// (the reference's Browser tools): an EmptyState with the Globe, its title and body, and a secondary button that turns
// the setting back on.
export function PreviewBrowserToolsOff({ onTurnOn }) {
  const assistant = assistantName();
  return (
    <div className="absolute inset-0" data-preview-start="setting-off">
      <SourceEmptyState role="status" icon="Globe" title={t("Browser tools are turned off")}
        body={t("They let {assistant} start your dev server and open pages here. Once they’re on, {assistant} can use them in new sessions on your computer.", { assistant })}
        actions={onTurnOn ? <SourceSettingsButton variant="secondary" onClick={onTurnOn}>{t("Turn on Browser tools")}</SourceSettingsButton> : null} />
    </div>
  );
}

/** B39: the New session page's preview owner ("home:<folder>", terminal-store ownerKeyOf) rather than a session. */
export const isLandingPreview = (owner) => typeof owner === "string" && owner.startsWith("home:");

function StartPage({ state, rows, onStart, onStop, onOpen, onSetUp, starting, call, sessionId, agentUsesPreview = true, onTurnOnAgentPreview }) {
  // Browser tools off is about the agent; the New session page's browser has no agent and stays the user's own.
  if (!agentUsesPreview && !isLandingPreview(sessionId)) return <PreviewBrowserToolsOff onTurnOn={onTurnOnAgentPreview} />;
  const launch = state?.launch;
  // Si: the start page (gr + fr) whenever there is no configuration to list (t.length === 0) — a launch.json with an
  // empty "configurations" too, which "Use this" then appends to. A launch.json that doesn't parse keeps the list
  // view so its error stays visible.
  if (!launch?.exists || (!launch.error && rows.length === 0)) return <PreviewNoConfig call={call} sessionId={sessionId} cwd={state?.cwd} onSetUp={onSetUp} onServerAdded={onStart} />;
  return <ServerList launch={launch} rows={rows} starting={starting} onStart={onStart} onStop={onStop} onOpen={onOpen} />;
}

// 2.2553.1 bv / yv (panes-tile-current.js:10172-10365): a bordered rounded list (at most 5 rows until "See all"),
// each row Cache icon · name (truncates) · muted tabular port · an icon-only Play (secondary) / Stop (danger). A
// running server's row is itself the Open button. The two muted captions sit at the bottom of the pane; editing
// .claude/launch.json lives in the Servers & settings menu, not on the caption.
const VISIBLE_SERVERS = 5;
function ServerList({ launch, rows, starting, onStart, onStop, onOpen }) {
  const [all, setAll] = useState(false);
  const firstHidden = useRef(null);
  const focusHidden = useRef(false);
  const showAll = all || rows.some((row, index) => index >= VISIBLE_SERVERS && (row.running || row.busy || row.name === starting));
  const shown = showAll ? rows : rows.slice(0, VISIBLE_SERVERS);
  useEffect(() => { if (showAll && focusHidden.current) { focusHidden.current = false; firstHidden.current?.focus(); } }, [showAll]);
  return (
    <div className="spv-start-servers" data-preview-start="servers">
      <div className="spv-start-servers-inner">
        <div className="spv-start-servers-main">
          <div className="spv-start-column">
            {launch.error && <p className="spv-start-problem" role="alert">{launch.error}</p>}
            {shown.length > 0 && (
              <ul role="list" className="spv-servers" aria-label={t("Servers")}>
                {shown.map((row, index) => {
                  const open = row.running && !!row.port;
                  const label = row.running ? t("Stop {serverName}", { serverName: row.name }) : t("Run {serverName}", { serverName: row.name });
                  const body = <>
                    <Icon name="Cache" size={16} className="spv-server-icon" />
                    <span className="spv-server-name">{row.name}</span>
                    {row.port ? <span className="spv-server-port">:{row.port}</span> : null}
                  </>;
                  return (
                    <li key={row.name} ref={index === VISIBLE_SERVERS ? firstHidden : undefined} tabIndex={-1} className="spv-server" data-status={row.status}
                      data-open={open || undefined} aria-busy={row.name === starting || undefined}>
                      {open
                        ? <button type="button" className="spv-server-main" aria-label={t("Open {name}", { name: row.name })} onClick={() => onOpen(row.url)}>{body}</button>
                        : <span className="spv-server-main">{body}</span>}
                      <SourceSettingsButton size="sm" variant={row.running ? "danger" : "secondary"} icon={row.running ? "Stop" : "Play"} iconSize="auto" iconOnly
                        className="spv-server-action" aria-label={label} busy={row.busy || row.name === starting}
                        disabled={!!starting && row.name !== starting} onMouseDown={(event) => event.preventDefault()}
                        onClick={() => (row.running ? onStop(row.name) : onStart(row.name))} />
                    </li>
                  );
                })}
              </ul>
            )}
            {shown.length < rows.length && (
              <SourceSettingsButton variant="ghost" size="xxs" className="spv-see-all" onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => { focusHidden.current = event.currentTarget === event.currentTarget.ownerDocument.activeElement; setAll(true); }}>{t("See all")}</SourceSettingsButton>
            )}
          </div>
        </div>
        <div className="spv-start-captions">
          <p className="spv-start-caption">{rows.some((row) => row.running) ? t("Open a server to preview your app, or enter a URL.") : t("Run a server to preview your app, or enter a URL.")}</p>
          <p className="spv-start-caption">{t("Edit this list in .claude/launch.json.")}</p>
        </div>
      </div>
    </div>
  );
}

// cf580efe9 yr (readable 794-870; vr = 1500): the start failure, centred — an xl Warning in text-disabled, the title, the
// meta ("sent to {assistant}", or the port another session's server holds), a one-line chip with the last line of the
// error and an icon-only Copy (Check for 1.5 s once written), and the actions (Try again, busy while it runs).
export const COPIED_MS = 1500;
export function PreviewStartFailedCard({ logLine, onCopyLog, actions = null, meta, className = "" }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(async () => {
    let outcome;
    try { outcome = await onCopyLog?.(); } catch { outcome = "failed"; }
    clearTimeout(timer.current);
    if (outcome !== undefined && outcome !== "written") { setCopied(false); return; }
    setCopied(true);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }, [onCopyLog]);
  return (
    <div role="status" className={`flex h-full w-full items-center justify-center overflow-y-auto p-lg ${className}`.trim()}>
      <div className="flex w-full max-w-[400px] flex-col items-center gap-md text-center">
        <Icon name="Warning" size={32} className="text-disabled" />
        <p className="m-0 text-body text-primary">{t("Dev server failed to start")}</p>
        {!logLine && meta && <p className="m-0 text-footnote text-muted">{meta}</p>}
        {logLine && (
          <div className="flex w-full min-w-0 items-center gap-[4px] rounded bg-alpha-1 py-xs pl-md pr-xs text-left">
            <span className="min-w-0 flex-1 truncate text-code text-muted">
              {meta && <span className="font-sans text-footnote text-muted">{meta}{" ·"}{" "}</span>}
              {logLine}
            </span>
            {onCopyLog && <SourceSettingsButton variant="ghost" icon={copied ? "Check" : "Copy"} iconOnly aria-label={copied ? t("Copied") : t("Copy error log")}
              className="shrink-0" onMouseDown={(event) => event.preventDefault()} onClick={() => void copy()} />}
          </div>
        )}
        {actions && <div className="flex flex-wrap items-center justify-center gap-[4px]">{actions}</div>}
      </div>
    </div>
  );
}

// cf580efe9 mr (readable 667-731): the stopped server — a rounded alpha-1 row with Cache, the server's name, a muted
// "Stopped" and a secondary xxs Restart (busy while it runs), the caption under it, and Show start page when it can be
// dismissed. Classes follow 2.42304.0 cf580efe9-b-DCvKJg Mr: "py-md ps-[9px] pe-md" (logical since 2.37337.1) and
// text-muted-as-secondary for "Stopped" and the caption (2.37337.1: text-muted). Without a name (fa main pane 5919-5935): the Rt empty state that only offers Close.
export function PreviewStoppedCard({ serverLabel, onRestart, restartPending = false, onDismiss, onClose, caption, className = "", contentClassName = "" }) {
  if (!serverLabel) {
    return (
      <SourceEmptyState role="status" icon="Cache" title={t("Preview server stopped")} body={t("Close and reopen the preview to start it again.")}
        actions={onClose ? <SourceSettingsButton variant="secondary" onClick={onClose}>{t("Close")}</SourceSettingsButton> : null} />
    );
  }
  return (
    <div role="status" className={`flex h-full w-full items-center justify-center overflow-y-auto p-lg ${className}`.trim()} data-preview-stopped={serverLabel}>
      <div className={`flex w-full max-w-[400px] flex-col gap-sm ${contentClassName}`.trim()}>
        <div className="flex items-center gap-sm rounded bg-alpha-1 py-md ps-[9px] pe-md">
          <Icon name="Cache" size={16} className="shrink-0 text-secondary" />
          <span className="min-w-0 flex-1 truncate text-body text-secondary">{serverLabel}</span>
          <span className="shrink-0 text-footnote text-muted-as-secondary">{t("Stopped")}</span>
          <SourceSettingsButton size="xxs" variant="secondary" busy={restartPending} aria-label={t("Restart {serverName}", { serverName: serverLabel })}
            onClick={onRestart} onMouseDown={(event) => event.preventDefault()} className="shrink-0">{t("Restart")}</SourceSettingsButton>
        </div>
        <p className="m-0 text-center text-caption text-muted-as-secondary">{caption ?? t("The dev server stopped. Restart it, or close the preview.")}</p>
        {onDismiss && <SourceSettingsButton size="xs" variant="ghost" onClick={onDismiss} className="self-center">{t("Show start page")}</SourceSettingsButton>}
      </div>
    </div>
  );
}

// cf580efe9 ri (readable 2521-2547): the page from before the app closed, grayscale at 60% under the backdrop, with the
// stopped card raised on a panel over it.
export function PreviewLastFrame({ jpegBase64, serverLabel, onRestart, restartPending, onDismiss, className = "" }) {
  const src = useMemo(() => `data:image/jpeg;base64,${jpegBase64}`, [jpegBase64]);
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`.trim()} data-testid="preview-last-frame">
      <img src={src} alt={t("The last page this preview showed before the app closed")} draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-top opacity-60 grayscale" />
      <div aria-hidden="true" className="absolute inset-0 bg-backdrop" />
      <PreviewStoppedCard className="relative" contentClassName={`rounded-card bg-surface-panel p-lg shadow-popover${onDismiss ? " pb-md" : ""}`}
        serverLabel={serverLabel} onRestart={onRestart} restartPending={restartPending} onDismiss={onDismiss}
        caption={t("Showing the page from before the app closed.")} />
    </div>
  );
}

// cf580efe9 Or fallback (readable 1070-1088): the agent is starting a server — a md spinner and the session's running tool
// (wr), else "Setting up preview". The Clawd crab GIF above it is a claude.ai asset this app doesn't ship.
export function PreviewSettingUp({ label = null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-md px-lg" data-preview-setting-up="">
      <div role="status" className="flex items-center gap-xs text-body text-secondary">
        <SourceSpinner size="md" />
        <span>{label ?? t("Setting up preview")}</span>
      </div>
    </div>
  );
}

// cf580efe9 ua (readable 4396-4508): the drawer under the page, "{name} · localhost:{port}" (preview-logs-source) and
// Close; the output follows the end unless scrolled up.
function LogsDrawer({ source, lines, height, onResize, onClose, paneHeight }) {
  const body = useRef(null);
  const pinned = useRef(true);
  useLayoutEffect(() => { const node = body.current; if (node && pinned.current) node.scrollTop = node.scrollHeight; }, [lines]);
  const drag = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startY = event.clientY, startHeight = height;
    const move = (moveEvent) => onResize(clampLogsHeight(startHeight + (startY - moveEvent.clientY), paneHeight));
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <section className="spv-logs" style={{ height }} aria-label={t("Dev server logs")}>
      <div role="separator" aria-orientation="horizontal" aria-label={t("Resize dev server logs")} tabIndex={0} className="spv-logs-handle"
        aria-valuenow={height} aria-valuemin={LOGS_HEIGHT.min} aria-valuemax={Math.round((paneHeight || 0) * LOGS_HEIGHT.maxRatio)}
        onPointerDown={drag}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); onResize(clampLogsHeight(height + (event.key === "ArrowUp" ? 24 : -24), paneHeight)); }
        }} />
      <div className="flex shrink-0 items-center gap-sm pt-md pr-xs pl-lg">
        <span data-testid="preview-logs-source" title={source} className="min-w-0 flex-1 truncate text-caption text-muted">{source}</span>
        <GhostButton label={t("Close dev server logs")} icon="X" onClick={onClose} />
      </div>
      <div ref={body} className="spv-logs-body" tabIndex={0} onScroll={(event) => { const node = event.currentTarget; pinned.current = node.scrollHeight - node.scrollTop - node.clientHeight < 8; }}>
        {lines.length === 0 ? <div className="spv-logs-empty">{t("Waiting for output…")}</div>
          : lines.map((line, index) => <div key={index} className="spv-log-line" data-tone={logTone(line) ?? undefined}><SourceAnsiText text={line} /></div>)}
      </div>
    </section>
  );
}

/** Session preview metadata remains subscribed even while its pane is closed. */
export function usePreviewSnapshot(sessionId, desktop = globalThis.desktop) {
  const [state, setState] = useState(null);
  useEffect(() => {
    setState(null);
    if (!sessionId || !desktop?.call) return undefined;
    let live = true;
    desktop.call("preview-state", { sessionId }).then(next => { if (live) setState(next); }, () => {});
    const off = desktop.onEvent?.(event => { if (live && event?.kind === "preview" && event.sessionId === sessionId && event.state) setState(event.state); });
    return () => { live = false; off?.(); };
  }, [sessionId, desktop]);
  return state?.sessionId === sessionId ? state : null;
}
export function usePreviewActivity(sessionId, desktop = globalThis.desktop) {
  return anyServerRunning(usePreviewSnapshot(sessionId, desktop));
}

/**
 * @param {object} props
 * @param {string} props.sessionId
 * @param {object} [props.desktop]            window.desktop (call / onEvent)
 * @param {React.ReactNode} [props.headerCenter]  the tile's drag handle
 * @param {React.ReactNode} [props.controls]      SourcePaneControls
 * @param {(file: File) => void} [props.onAttachScreenshot]
 * @param {(text: string) => void} [props.onAskAgent]   sends a message to this session
 * @param {(message: string) => void} [props.onError]
 * @param {object} [props.initialState]
 * @param {boolean} [props.agentUsesPreview]   Settings › Code › Preview › Let {assistant} use the preview
 * @param {() => void} [props.onTurnOnAgentPreview]  turns that setting on (the off state's Turn on Browser tools)
 * @param {string|null} [props.runningToolLabel]  the session's running tool, named while the agent starts a server
 */
export function SourcePreviewPane({ sessionId, desktop = globalThis.desktop, headerCenter = null, controls = null, onAttachScreenshot, onAttachElement, onAskAgent, onError, onClose, initialState = null, agentUsesPreview = true, onTurnOnAgentPreview, runningToolLabel = null }) {
  const instanceId = useRef(newInstanceId()).current;
  const attachElement = useRef(onAttachElement); attachElement.current = onAttachElement;
  // initialState: a snapshot to paint before main answers (server rendering and tests).
  const [state, setState] = useState(initialState);
  const copyUrl = usePreviewCopyUrl(sessionId, state?.url ?? null);
  const [occlusion, setOcclusion] = useState({ covered: false, image: null });
  const [starting, setStarting] = useState(null);
  const [lastStarted, setLastStarted] = useState(null);
  // cf580efe9 fa Fe("epitaxy-preview-logs-expanded", !1): the drawer's open state is a preference, kept across panes,
  // sessions and restarts, and followed between windows.
  const [logsOpen, setLogsOpenState] = useState(() => readLogsExpanded(prefStorage()));
  const setLogsOpen = useCallback((next) => setLogsOpenState((value) => {
    const open = typeof next === "function" ? next(value) : next;
    writeLogsExpanded(prefStorage(), open);
    return open === true;
  }), []);
  useEffect(() => {
    const sync = (event) => { if (event.key === null || event.key === PREVIEW_LOGS_EXPANDED_KEY) setLogsOpenState(readLogsExpanded(prefStorage())); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const [logsHeight, setLogsHeight] = useState(LOGS_HEIGHT.initial);
  // cf580efe9 Or h/g, fa vo/go (da): one Restart / Try again per session at a time; its card stays up with the button
  // busy (hold) and repeat clicks are ignored until it settles.
  const restartRef = useRef(null);
  const [restartFor, setRestartFor] = useState(null);
  const [hold, setHold] = useState(null);
  const restartPending = restartFor === sessionId;
  // A start from this pane that failed: whether its error reached the agent (Rr / zr submitToChat).
  const [failureNote, setFailureNote] = useState(null);
  const askAgent = useRef(onAskAgent); askAgent.current = onAskAgent;
  // cf580efe9 bi: the server whose start replaced the list with a spinner (held SERVER_SETTLE_MS once it runs).
  const [heldServer, setHeldServer] = useState(null);
  // cf580efe9 Pi: the page from before the app closed ({ key, value }; value null when there is no frame to show).
  const [frame, setFrame] = useState(null);
  const linksInPreview = useSyncExternalStore(previewLinksStore.subscribe, previewLinksStore.getSnapshot, previewLinksStore.getSnapshot);
  const [showTools, setShowTools] = useState(false);
  const [tabClose, setTabClose] = useState(null);
  const [closingTab, setClosingTab] = useState(false);
  const keepTabRunning = useRef(null);
  const [sessionData, setSessionData] = useState(false);
  // cf580efe9 Xr H === "allowedSites" (B39): Manage allowed sites… opens the Allowed sites dialog (er).
  const [allowedSites, setAllowedSites] = useState(false);
  // The page's latest download (preview-service state.download), until dismissed: saved, failed, or not started because
  // the preview wasn't on screen. A download still saving shows nothing (the Save dialog is up).
  const [dismissedDownload, setDismissedDownload] = useState(null);
  const mountedAt = useRef(Date.now());
  const downloadNotice = state?.download && state.download.state !== "saving" && state.download.at !== dismissedDownload && state.download.at >= mountedAt.current
    && (state.download.state !== "cancelled" || state.download.reason === "not-shown") ? state.download : null;
  // Annotate (2.2553.1 mt / bt): {token, backdrop} while sketching; backdrop undefined until the capture arrives.
  const [sketch, setSketch] = useState(null);
  const [requestingPick, setRequestingPick] = useState(false);
  // preview-07 (2.42304.0 cf580efe9-b-DCvKJg Aa Kr): the action waiting on "Discard your annotations?" — "picking"
  // (Select element over a sketch with marks). The original's other two, "popOut" and "dock" (the Dock of a Preview
  // pane window, c41956fd9's context from c5638815a bt), have no host here: Preview never runs in a pane window.
  const [pendingDiscard, setPendingDiscard] = useState(null);
  const pickSequence = useRef(0);
  const sketchRef = useRef(null);
  const sketchToken = useRef(0);
  const pane = useRef(null);
  const viewport = useRef(null);
  const skip = useRef(null);
  const [addressFocus, setAddressFocus] = useState();
  const addressSequence = useRef(0), pendingNewTab = useRef({ pending: false, seq: 0 });
  const activeTab = useRef(state?.activeTabId);activeTab.current = state?.activeTabId;
  const focusAddress = (mode = 'edit-current') => setAddressFocus({ key: ++addressSequence.current, mode });
  const shortcutRef = useRef(null);
  const sent = useRef({ bounds: null, visible: null });
  // Refused shows (another pane has the page): the bounds refused, how many retries ran, the pending retry.
  const refused = useRef({ bounds: null, count: 0, timer: 0 });
  const call = useCallback((action, params = {}) => (desktop?.call ? desktop.call(action, { sessionId, ...params }) : Promise.reject(new Error(t("Open OpenClaude Desktop to use the preview.")))), [desktop, sessionId]);
  // The main process words its refusals in English (preview-service.cjs): shown in the UI language, as terminalError does.
  const report = useCallback((error) => { if (error?.message) onError?.(t(error.message)); }, [onError]);
  // preview-05: si's u() — whether the session a Run was for is still the one this pane shows.
  const liveSession = useRef(null);
  useEffect(() => { liveSession.current = sessionId; return () => { liveSession.current = null; }; }, [sessionId]);

  // State: the snapshot, then every change main pushes for this session.
  useEffect(() => {
    let live = true;
    call("preview-state").then((next) => { if (live) setState(next); }, report);
    const off = desktop?.onEvent?.((event) => {
      if (event?.sessionId !== sessionId) return;
      if (event.kind === "preview" && event.state) setState(event.state);
      else if (ownsSelectedElement(event, { sessionId, instanceId, tabId: activeTab.current })) attachElement.current?.(event);
      else if (event.kind === "preview-focus-out" && event.instanceId === instanceId) (skip.current ?? pane.current?.querySelector('.spv-address input'))?.focus();
      // A pane chord pressed inside the page (preview-service.cjs previewShortcut): the page never lets the pane see it.
      else if (event.kind === "preview-shortcut" && event.instanceId === instanceId) shortcutRef.current?.(event.action);
    });
    return () => { live = false; off?.(); };
  }, [call, desktop, sessionId, instanceId, report]);

  const acceptTabState = next => { if (next?.sessionId === sessionId) setState(next); };
  const createTab = () => {
    closeSketch();pendingNewTab.current.pending = true;pendingNewTab.current.seq++;
    call('preview-tab-new').then(next => { acceptTabState(next);focusAddress('blank'); }, error => { pendingNewTab.current.pending = false;report(error); });
  };
  const selectTab = id => { closeSketch(); call('preview-tab-activate', { tabId: id }).then(acceptTabState, report); };
  const closeTab = async (tabId, others = false, decision = null) => {
    if (closingTab) return;
    setClosingTab(true);
    try {
      const next = await call('preview-tab-close', { tabId, others, decision });
      if (next?.confirmation) { setTabClose(next.confirmation); return; }
      setTabClose(null);closeSketch();acceptTabState(next);if (next?.lastTabClosed) onClose?.();
    } catch (error) { report(error); }
    finally { setClosingTab(false); }
  };
  const rows = useMemo(() => serverRows(state), [state]);
  // cf580efe9 Xr xt: the Dev servers trigger shows only with a server to list or Add server to offer. When it goes away
  // while it had focus, focus moves to the next button of the header group (Xr's r() effect on St / Ct).
  const menuRows = useMemo(() => serverMenuRows(state), [state]);
  const showServerMenu = serverTriggerVisible({ rows: menuRows, canAddServer: !!onAskAgent });
  const serverGroup = useRef(null);
  const hadServerMenu = useRef(showServerMenu);
  useLayoutEffect(() => {
    const had = hadServerMenu.current;
    hadServerMenu.current = showServerMenu;
    const doc = serverGroup.current?.ownerDocument;
    if (!doc || !shouldHandOffFocus({ hadTrigger: had, hasTrigger: showServerMenu, activeIsBody: doc.activeElement === doc.body || doc.activeElement === null })) return;
    serverGroup.current.querySelector('button:not([disabled])')?.focus({ preventScroll: true });
  }, [showServerMenu]);
  const startHold = serverStartHold(heldServer, { servers: state?.servers, pending: starting });
  useEffect(() => { if (startHold.held !== heldServer) setHeldServer(startHold.held); }, [startHold.held, heldServer]);
  useEffect(() => {
    if (!startHold.settle) return undefined;
    const timer = setTimeout(() => setHeldServer(null), SERVER_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [startHold.settle]);
  const surface = previewSurface(state, { starting, lastStarted, hold: hold?.surface ?? null, settling: startHold.spinner });
  const failure = surface === "failed" ? (hold?.surface === "failed" ? hold.failure : failedServer(state, lastStarted)) : null;
  // Keep the native surface painting until its replacement image is ready.
  // CDP can wait indefinitely for a fresh frame if a resized view is hidden first.
  const wantsPage = showsPage(surface) && (!sketch || sketch.backdrop === undefined);
  const picking = requestingPick || !!state?.selection?.enabled;
  const toolsOpen = picking || !!sketch || showTools;
  const pageVisible = wantsPage && !occlusion.covered;
  // Kr's reset (`!Q || V`): the pending action goes once the sketch has closed or the server is gone.
  if (pendingDiscard !== null && (!sketch || surface === "stopped")) setPendingDiscard(null);

  // Bounds: the viewport rectangle (CSS px; main scales by the window zoom), re-sent whenever it moves.
  const sync = useCallback((force = false) => {
    const node = viewport.current;
    if (!node) return;
    const bounds = boundsOf(node.getBoundingClientRect());
    const visible = wantsPage && !!bounds && bounds.width > 0 && bounds.height > 0 && !document.hidden;
    if (!force && sameBounds(bounds, sent.current.bounds) && visible === sent.current.visible) return;
    if (!force && visible && sameBounds(bounds, refused.current.bounds)) return;
    sent.current = { bounds, visible };
    call("preview-attach", { instanceId, bounds, visible }).then((next) => {
      if (!next) return;
      setState(next);
      const retry = refused.current;
      if (!visible || !pageRefused(next, instanceId)) { retry.bounds = null; retry.count = 0; return; }
      // Refused: the same rectangle is not sent again until a retry is due or the layout changes.
      sent.current = { bounds: null, visible: null };
      retry.bounds = bounds;
      if (retry.timer || retry.count >= SHOW_RETRY_MS.length) return;
      retry.timer = setTimeout(() => { retry.timer = 0; retry.bounds = null; latestSync.current(); }, SHOW_RETRY_MS[retry.count++]);
    }, () => {});
  }, [call, instanceId, wantsPage]);
  const latestSync = useRef(sync);
  latestSync.current = sync;
  useEffect(() => () => { clearTimeout(refused.current.timer); refused.current.timer = 0; }, []);
  useLayoutEffect(() => { sync(true); }, [sync, state?.hasPage, state?.activeTabId, logsOpen, logsHeight]);
  useEffect(() => {
    const node = viewport.current;
    if (!node) return undefined;
    let frame = 0, settle = 0;
    const tick = () => { sync(); if (settle-- > 0) frame = requestAnimationFrame(tick); else frame = 0; };
    // A layout change asks again even after a refusal (2.2553.1 resets the retry budget on resize and tile moves).
    const kick = () => { const retry = refused.current; retry.bounds = null; retry.count = 0; settle = 30; if (!frame) frame = requestAnimationFrame(tick); };
    const resize = new ResizeObserver(kick);
    resize.observe(node);
    window.addEventListener("resize", kick);
    document.addEventListener("visibilitychange", kick);
    kick();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); window.removeEventListener("resize", kick); document.removeEventListener("visibilitychange", kick); };
  }, [sync]);
  // Leaving (pane closed, session switched, window gone): the page moves to the parking window and keeps running.
  useEffect(() => () => { sent.current = { bounds: null, visible: null }; desktop?.call?.("preview-detach", { sessionId, instanceId }).catch?.(() => {}); }, [desktop, sessionId, instanceId]);

  // Overlays: whatever covers the viewport (menus, dialogs, tooltips, a dragged tile) hides the page behind a capture.
  useEffect(() => {
    if (!wantsPage) return undefined;
    let frame = 0, last = 0, timer = 0, current = false;
    const node = viewport.current;
    const check = () => {
      frame = 0;
      if (!node?.isConnected) return;
      const dragging = !!document.querySelector(".tiles-viewport[data-dragging]");
      const covered = dragging || isOccluded(node.getBoundingClientRect(), (x, y) => document.elementFromPoint(x, y), (element) => node.contains(element));
      if (covered === current) return;
      current = covered;
      setOcclusion({ covered, image: null });
      call("preview-occlude", { instanceId, occluded: covered }).then(({ image } = {}) => { if (covered && image) setOcclusion((now) => (now.covered ? { covered: true, image } : now)); }, () => {});
    };
    const schedule = () => {
      if (frame || timer) return;
      const wait = Math.max(0, 60 - (performance.now() - last));
      timer = setTimeout(() => { timer = 0; last = performance.now(); frame = requestAnimationFrame(check); }, wait);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["inert", "data-open", "data-dragging", "hidden", "open", "style"] });
    window.addEventListener("resize", schedule);
    document.addEventListener("scroll", schedule, true);
    schedule();
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame); clearTimeout(timer); window.removeEventListener("resize", schedule); document.removeEventListener("scroll", schedule, true);
      if (current) call("preview-occlude", { instanceId, occluded: false }).catch(() => {});
      setOcclusion({ covered: false, image: null });
    };
  }, [wantsPage, call, instanceId, state?.activeTabId]);

  // Logs (cf580efe9 fa bn / ua): the drawer follows the server at the open tab's port, else the one started last, polled
  // every second while open; the failure card reads its server's output once.
  const logsSource = logsServer(state);
  const drawerLines = useServerLogs(call, logsSource?.name ?? null, logsOpen, true);
  const failureLines = useServerLogs(call, failure?.name ?? null, surface === "failed", false, failure?.startedAt ?? null);

  const start = useCallback(async (name, { inPlace = false } = {}) => {
    if (!inPlace) setStarting(name);
    setLastStarted(name);
    try {
      const result = await call("preview-server-start", { name });
      if (result?.ok) { setFailureNote(null); return; }
      // preview-05 (2.42304.0 cf580efe9-b-DCvKJg si / ui): no usable launch.json entry — refresh the configurations
      // (yn: the snapshot re-reads launch.json) and, while the session is still shown, the uV3BfEC8hz notice.
      if (noLaunchEntry(result)) {
        call("preview-state").then((next) => { if (liveSession.current === sessionId && next?.sessionId === sessionId) setState(next); }, () => {});
        if (liveSession.current === sessionId) onError?.(launchEntryMissingText(name));
        return;
      }
      // Any other failure without a server entry is a notice; one with it shows the failure card.
      if (result?.code === "error") { report(new Error(serverErrorText(result, name))); return; }
      if (result?.code === "stopped") return;
      // ca80fca8d / cf580efe9 Rr, zr: unless another session's server holds the port, the error goes to the agent.
      if (heldPort(result) !== undefined || !askAgent.current) { setFailureNote({ name, sent: false }); return; }
      setFailureNote({ name, sent: false });
      const logs = await call("preview-server-logs", { name, lines: 500 }).catch(() => null);
      const sent = await Promise.resolve(askAgent.current?.(startFailurePrompt(startFailureText(result, logs?.lines ?? [])))).catch(() => false);
      setFailureNote((note) => (note?.name === name ? { name, sent: sent === true } : note));
    } catch (error) { report(error); }
    finally { if (!inPlace) setStarting(null); }
  }, [call, report, onError, sessionId]);
  const restart = useCallback((name, from) => {
    const id = sessionId;
    if (!name || restartRef.current === id) return;
    restartRef.current = id; setRestartFor(id); setHold(from);
    Promise.resolve(start(name, { inPlace: true })).finally(() => {
      if (restartRef.current === id) restartRef.current = null;
      setRestartFor((value) => (value === id ? null : value));
      setHold(null);
    });
  }, [sessionId, start]);
  // cf580efe9 Pi: the frame is read once per saved frame; nothing paints until it answers (Ee.status "loading").
  const frameKey = state?.lastFrame?.configName ? `${sessionId}:${state.lastFrame.savedAt}` : null;
  useEffect(() => {
    if (!frameKey) return undefined;
    let live = true;
    call("preview-last-frame").then((value) => { if (live) setFrame({ key: frameKey, value: value?.jpegBase64 ? value : null }); },
      () => { if (live) setFrame({ key: frameKey, value: null }); });
    return () => { live = false; };
  }, [call, frameKey]);
  const restored = frame?.key === frameKey ? frame : null;
  const dismissFrame = useCallback(() => { call("preview-last-frame-discard").then((next) => { if (next?.sessionId === sessionId) setState(next); }, report); }, [call, report, sessionId]);
  const stop = useCallback((name) => { call("preview-server-stop", { name }).catch(report); }, [call, report]);
  const navigate = useCallback((url) => { call("preview-navigate", { url }).catch(report); }, [call, report]);
  const history = (action) => call("preview-history", { action }).catch(report);
  const closeSketch = useCallback(() => { sketchToken.current++; setSketch(null); }, []);
  const cancelPick = useCallback(() => {
    pickSequence.current++; setRequestingPick(false);
    call('preview-selection', { instanceId, enabled: false }).catch(() => {});
  }, [call, instanceId]);
  const beginPick = useCallback(async () => {
    if (!state?.hasPage || !onAttachElement) return;
    const sequence = ++pickSequence.current;
    closeSketch(); setRequestingPick(true);
    try {
      // Reserve the original tool bar's space before enabling native inspection.
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (sequence !== pickSequence.current || !viewport.current?.isConnected) return;
      await call('preview-attach', { instanceId, bounds: boundsOf(viewport.current.getBoundingClientRect()), visible: true });
      if (sequence !== pickSequence.current) return;
      const next = await call('preview-selection', { instanceId, enabled: true });
      if (sequence === pickSequence.current) { setState(next); setRequestingPick(false); }
    } catch (error) { if (sequence === pickSequence.current) { setRequestingPick(false); report(error); } }
  }, [state?.hasPage, onAttachElement, closeSketch, call, instanceId, report]);
  // Zr: a pending action isn't stacked over another open alert dialog.
  const askDiscard = (action) => { if (!pane.current?.ownerDocument?.querySelector('[data-open][role="alertdialog"]')) setPendingDiscard(action); };
  const togglePick = () => {
    if (sketch && sketchRef.current?.hasMarks()) { askDiscard("picking"); return; }
    if (picking) cancelPick(); else void beginPick();
  };
  // si: Discard closes the sketch, then runs the pending action (picking only while the page can still be picked).
  const discardAndContinue = () => {
    const action = pendingDiscard;
    setPendingDiscard(null); closeSketch();
    if (action === "picking" && !pickBlocked) void beginPick();
  };
  const closeTools = () => { setShowTools(false); cancelPick(); closeSketch(); };
  useEffect(() => {
    pickSequence.current++; setRequestingPick(false); setPendingDiscard(null);
    return () => { pickSequence.current++; };
  }, [sessionId, state?.activeTabId]);
  // preview-06 (2.42304.0 cf580efe9-b-DCvKJg Aa `ei !== ti && (ni(ei), ei && rr(!1))`): picking turns itself off when the
  // page stops being pickable (start page, no page, the server gone, nothing to send the element to), not only on a
  // session or tab switch; main's selection would otherwise stay on.
  const pickBlocked = pickUnavailable(state, { surface, sendsToSession: !!onAttachElement });
  const pickWasBlocked = useRef(pickBlocked);
  useEffect(() => {
    const was = pickWasBlocked.current;
    pickWasBlocked.current = pickBlocked;
    if (pickBlocked && !was && picking) cancelPick();
  }, [pickBlocked]);
  useEffect(() => {
    if (!picking) return;
    const escape = event => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (document.querySelector('[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],[role="combobox"][aria-expanded="true"]')) return;
      event.preventDefault(); event.stopPropagation(); cancelPick();
    };
    document.addEventListener('keydown', escape, true);
    return () => document.removeEventListener('keydown', escape, true);
  }, [picking, cancelPick]);
  // kt: a second press asks the sketch to close (Discard your annotations? when it has marks).
  const toggleSketch = useCallback(async () => {
    if (sketch) { sketchRef.current?.requestClose(); return; }
    if (!state?.hasPage || !onAttachScreenshot) return;
    const token = ++sketchToken.current;
    setSketch({ token, backdrop: undefined });
    try {
      if (picking) { pickSequence.current++; setRequestingPick(false); await call('preview-selection', { instanceId, enabled: false }); }
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (sketchToken.current !== token || !viewport.current?.isConnected) return;
      await call('preview-attach', { instanceId, bounds: boundsOf(viewport.current.getBoundingClientRect()), visible: true });
      if (sketchToken.current !== token) return;
      // preview-06 (cf550b864 N limits.awaitCaptureMs, picking or not): past SKETCH_AWAIT_CAPTURE_MS the sketch opens
      // without a backdrop; a capture that still lands replaces it.
      const late = setTimeout(() => setSketch((now) => (now?.token === token && now.backdrop === undefined ? { token, backdrop: null } : now)), SKETCH_AWAIT_CAPTURE_MS);
      let shot;
      try { shot = await call("preview-capture"); } finally { clearTimeout(late); }
      const bytes = shot?.bytes instanceof Uint8Array ? shot.bytes : new Uint8Array(shot?.bytes ?? []);
      const src = bytes.length ? await captureDataUrl(bytes) : null;
      const size = src ? await imageSize(src) : null;
      if (sketchToken.current === token) setSketch({ token, backdrop: src ? { src, ...size, dpr: shot.displayWidth > 0 ? size.width / shot.displayWidth : window.devicePixelRatio || 1 } : null });
    } catch (error) {
      if (sketchToken.current === token) setSketch({ token, backdrop: null });
      report(error);
    }
  }, [sketch, picking, instanceId, state?.hasPage, onAttachScreenshot, call, report]);
  useEffect(() => { if (sketch && !state?.hasPage) closeSketch(); }, [sketch, state?.hasPage, closeSketch]);
  // Chords from inside the page: ⇧⌘X Annotate, ⌘W close the preview, ⌘L the address field.
  shortcutRef.current = (action) => {
    if (action === "sketch") void toggleSketch();
    else if (action === 'selection') togglePick();
    else if (action === "close") { if (state?.tabs?.length) void closeTab(state.activeTabId); else onClose?.(); }
    else if (action === "new-tab") createTab();
    else if (action === "address") focusAddress();
  };
  // Pt: the annotated (or plain) capture goes to the composer and the sketch closes.
  const attachSketch = useCallback((file) => { onAttachScreenshot?.(file); closeSketch(); }, [onAttachScreenshot, closeSketch]);
  const saveScreenshot = useCallback(async () => {
    try {
      const shot = await call("preview-capture");
      const bytes = shot?.bytes instanceof Uint8Array ? shot.bytes : new Uint8Array(shot?.bytes ?? []);
      if (!bytes.length) throw new Error(t("Couldn’t capture the page."));
      const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
      await call("image:save", { dataUrl: await captureDataUrl(bytes), name: `preview-${stamp}.png` });
    } catch (error) { report(error); }
  }, [call, report]);

  // cf580efe9 Or start-failed: the error text (localized), its last line in the chip, and the meta line.
  const failureHeld = failure ? heldPort(failure.error) : undefined;
  const failureMessage = failure ? serverErrorText(failure.error, failure.name) : "";
  const failureText = failure ? startFailureText({ message: failureMessage }, failureLines) : "";
  const failureChip = !failure || failureHeld !== undefined ? undefined
    : failureLogLine(failure.error?.code === "identity" ? failureMessage : failureText, failure.error);
  const ownFailure = !!failure && failureNote?.name === failure.name;
  const failureMeta = !failure ? undefined
    : failureHeld !== undefined ? t("Port {port} is already in use by a dev server in another session. Stop that server, then try again.", { port: failureHeld })
      // The agent's own preview_start got the error in its tool result; a start from here, once it was sent.
      : !ownFailure || failureNote.sent ? t("Error details were sent to {assistant}", { assistant: assistantName() }) : undefined;
  const copyFailure = useCallback(async () => {
    try { await navigator.clipboard.writeText(failureText); return "written"; } catch { return "failed"; }
  }, [failureText]);

  const error = surface === "error" ? pageError(state) : null;
  const stopped = surface === "stopped" ? (hold?.surface === "stopped" ? hold.server : stoppedServer(state)) : null;
  // A connection-refused page whose address is one of this folder's servers that isn't running.
  const refusedServer = (() => {
    if (!error || !/CONNECTION_REFUSED|ERR_CONNECTION_RESET|ADDRESS_UNREACHABLE/.test(state?.error?.description ?? "")) return null;
    const server = pageServer(state, { configs: true });
    return server && server.status !== "running" && server.status !== "starting" && server.status !== "stopping" ? server : null;
  })();
  const paneHeight = pane.current?.clientHeight ?? 0;
  return (
    <aside ref={pane} className="source-file-panel detail-panel spv-pane" aria-label={t("Preview")} data-preview-surface={surface} data-sketching={sketch ? "" : undefined} data-page-tools={toolsOpen ? '' : undefined}
      onKeyDown={(event) => {
        if (event.defaultPrevented || event.nativeEvent.isComposing || event.keyCode === 229) return;
        const command = previewDOMTabKey(event, /Mac/.test(navigator.platform));
        if (command) {
          event.preventDefault();event.stopPropagation();
          const action = { 'reopen-tab': 'preview-tab-reopen', 'select-tab': 'preview-tab-select-index', 'cycle-tab': 'preview-tab-cycle' }[command.action];
          if (action) { closeSketch();call(action, command).then(acceptTabState, report); }
          return;
        }
        if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && !event.nativeEvent.isComposing) {
          if (event.key.toLowerCase() === 'l') { event.preventDefault();event.stopPropagation();if (!event.repeat) focusAddress();return; }
          if (event.key.toLowerCase() === 't') { event.preventDefault();event.stopPropagation();if (!event.repeat) createTab();return; }
          if (event.key.toLowerCase() === 'w' && state?.tabs?.length) { event.preventDefault();event.stopPropagation();if (!event.repeat) void closeTab(state.activeTabId);return; }
        }
        // toggleSketchMode (⇧⌘X) while focus is in this pane.
        const pageTool = matchSketchCommand(event, { isClaudeApp: true, commands: ['toggleSketchMode', 'toggleSelectionMode'] });
        if (pageTool) { event.preventDefault(); event.stopPropagation(); if (!event.repeat) { if (pageTool === 'toggleSketchMode') void toggleSketch(); else togglePick(); } }
      }}>
      <header className="source-pane-header spv-tabs-header" data-pane-header="preview">
        <SourcePreviewTabs tabs={state?.tabs} activeId={state?.activeTabId} onSelect={selectTab} onCreate={createTab}
          onClose={id => void closeTab(id)} onCloseOthers={id => void closeTab(id, true)}
          onExternal={tabId => call('preview-tab-external', { tabId }).catch(report)}
          onReorder={(tabId, toIndex) => call('preview-tab-reorder', { tabId, toIndex }).then(acceptTabState, report)} />
        <span ref={serverGroup} className="contents">
        {showServerMenu && <SourcePreviewServerMenu rows={menuRows} loading={!state} onStart={start} onStop={stop}
          onAddServer={onAskAgent ? () => onAskAgent(ADD_SERVER_PROMPT) : undefined} />}
        <SourcePreviewSettingsMenu
          onOpenExternal={() => call("preview-external").catch(report)} openExternalDisabled={!/^https?:/i.test(state?.url ?? '')}
          onCopyUrl={copyUrl} copyUrlDisabled={state !== null && !/^https?:/i.test(state?.url ?? '')}
          onScreenshot={desktop?.call ? saveScreenshot : undefined} screenshotDisabled={!state?.hasPage || !!sketch}
          onShowAnnotationTools={() => setShowTools(true)} showAnnotationToolsDisabled={!state?.hasPage || !onAttachScreenshot}
          onOpenFile={() => call("preview-open-file").then(result => { if (result && !result.canceled && result.ok === false) report(new Error(result.description || t("The page didn’t load."))); }, report)}
          viewportItems={viewportRows(state?.viewport).map(row => ({ value: row.value, label: row.label, checked: row.checked, checkedRole: 'radio', hint: row.hint,
            description: row.setByAgent ? t('Set by {assistant}', { assistant: t('DeepSeek') }) : undefined,
            onSelect: () => { if (!row.keep) call('preview-emulate', { preset: row.value }).catch(report); } }))}
          viewportHint={state?.viewport?.preset !== 'responsive' ? viewportLabel(state?.viewport) : undefined} viewportDisabled={!state?.hasPage}
          colorScheme={state?.viewport?.colorScheme ?? 'system'} onColorScheme={colorScheme => call('preview-emulate', { colorScheme }).catch(report)}
          onShowSessionLogs={logsOpen || logsSource ? () => setLogsOpen(value => !value) : undefined}
          openLinksInPreview={linksInPreview} onOpenLinksInPreviewChange={value => previewLinksStore.set(value)}
          autoVerify={state?.launch?.autoVerify !== false}
          onAutoVerifyChange={state?.launch?.exists && agentUsesPreview ? enabled => call('preview-auto-verify', { enabled }).then(next => { if (next) setState(next); }, report) : undefined}
          previewStorage={state?.previewStorage ?? (state?.keepCookies ? 'shared' : 'none')}
          onPreviewStorageChange={mode => { closeTools(); call('preview-storage', { mode }).then(next => { if (next) setState(next); }, report); }}
          onClearBrowsingData={() => setSessionData(true)}
          onAllowedSites={desktop?.call ? () => setAllowedSites(true) : undefined}
          labels={{ showSessionLogs: logsOpen ? t('Hide dev server logs') : t('Show dev server logs'), openLinksInPreview: t('Open links in built-in browser') }} />
        </span>
        {headerCenter}{controls}
      </header>
      <SourcePreviewNavigation followsPaneHeader canGoBack={!!state?.canGoBack} canGoForward={!!state?.canGoForward} canReload={!!state?.hasPage}
        onBack={() => history('back')} onForward={() => history('forward')} onReload={() => history('reload')}
        labels={{ navigation: t('Navigation'), pageTools: t('Page tools'), back: t('Back'), forward: t('Forward'), reload: t('Reload'), selectElement: t('Select element'), exitSelection: t('Exit selection mode'), selectElementDetail: t('Sends Claude a screenshot plus the element’s HTML, styles, selector and any React component details.') }}
        selectElement={{ shortcut: sketch ? SKETCH_SHORTCUT : PICK_SHORTCUT, pressed: picking || !!sketch, pressedLabel: sketch ? t('Annotate') : undefined, disabled: (!state?.hasPage && !sketch) || !onAttachElement, onToggle: sketch ? toggleSketch : togglePick }}>
        <SourcePreviewAddress state={state} sessionId={sessionId} focusRequest={addressFocus} pendingNewTabRef={pendingNewTab}
          onNavigate={url => {
            if (url.trim()) {
              const tabId = state?.activeTabId;
              call('preview-address-navigate', { text: url }).then(result => {
                if (result?.ok && activeTab.current === tabId) call('preview-focus').catch(() => {});
              }, report);
            }
            return true;
          }} />
      </SourcePreviewNavigation>
      {tabClose && <SourceDialog title={tabClose.others ? t('Close other tabs?') : t('Close {host}?', { host: `localhost:${tabClose.processes[0]?.port}` })}
        description={tabClose.processes.length > 1
          ? t('{count} dev servers are still running. You can keep them running and reopen a tab any time by entering its localhost address in the URL bar.', { count: tabClose.processes.length })
          : t(tabClose.others ? '{serverLabel} is still running. You can keep it running and reopen a tab any time by entering {host} in the URL bar.' : '{serverLabel} is still running. You can keep it running and reopen this tab any time by entering {host} in the URL bar.', { serverLabel: tabClose.processes[0]?.name, host: `localhost:${tabClose.processes[0]?.port}` })}
        showClose={false} size="sm" className="spv-close-tabs-dialog" initialFocusRef={keepTabRunning} onClose={() => { if (!closingTab) setTabClose(null); }}
        footer={<><SourceSettingsButton variant="secondary" disabled={closingTab} onClick={() => setTabClose(null)}>{t('Cancel')}</SourceSettingsButton>
          <SourceSettingsButton variant="danger" aria-label={tabClose.processes.length > 1 ? t('Stop {count} servers and close', { count: tabClose.processes.length }) : t('Stop server and close')} disabled={closingTab} onClick={() => closeTab(tabClose.tabId, tabClose.others, 'stop')}>{t(tabClose.processes.length > 1 ? 'Stop servers' : 'Stop server')}</SourceSettingsButton>
          <SourceSettingsButton ref={keepTabRunning} variant="primary" busy={closingTab} onClick={() => closeTab(tabClose.tabId, tabClose.others, 'keep')}>{t('Keep running')}</SourceSettingsButton></>} />}
      <div className="spv-body">
        <div ref={viewport} className="spv-viewport" data-page={pageVisible || undefined} data-covered={occlusion.covered || undefined}>
          {wantsPage && (
            <button ref={skip} type="button" className="spv-skip" onClick={() => call("preview-focus").catch(() => {})}>
              {t("Preview page — press Enter to move into it. Inside, press F6 or Ctrl+F6 to move back out.")}
            </button>
          )}
          {wantsPage && occlusion.covered && occlusion.image && <img className="spv-capture" src={occlusion.image} alt="" draggable={false} />}
          {state?.viewport?.preset && state.viewport.preset !== "responsive" && wantsPage && <span className="spv-viewport-badge" aria-hidden="true">{viewportLabel(state.viewport)}</span>}
          {toolsOpen && <div className="spv-sketch-layer" data-drawing={sketch && sketch.backdrop !== undefined ? '' : undefined} data-preview-sketch="">
            <SourcePreviewSketch layerKey={`${sessionId}:${state?.activeTabId}`} ref={sketchRef} backdrop={sketch?.backdrop} barUnder
              pageTool={{ resting: showTools && !picking && !sketch ? { onHide: () => setShowTools(false) } : undefined, label: t('Select element'), shortcut: PICK_SHORTCUT, picking, canDraw: !!state?.hasPage && !!onAttachScreenshot, onTogglePick: togglePick, onDraw: toggleSketch }}
              onCancel={closeTools} onAttach={attachSketch} onError={onError} />
          </div>}
          {surface === "loading" && <div className="spv-center" role="status" aria-label={t("Loading preview")}><SourceSpinner size="lg" delay={400} /></div>}
          {surface === "start" && <StartPage state={state} rows={rows} starting={starting} onStart={start} onStop={stop} onOpen={navigate} call={call} sessionId={sessionId}
            agentUsesPreview={agentUsesPreview} onTurnOnAgentPreview={onTurnOnAgentPreview} onSetUp={onAskAgent ? () => onAskAgent(ADD_SERVER_PROMPT) : undefined} />}
          {/* cf580efe9 bi: a start from this pane is a centred lg spinner with an sr-only "Starting server"; one the agent (or
              another pane) began is Or's "Setting up preview" with the session's running tool. */}
          {surface === "starting" && (starting || (heldServer !== null && heldServer === lastStarted)
            ? <div className="spv-center" role="status" data-preview-starting={starting ?? heldServer}><SourceSpinner size="lg" /><span className="source-sr-only">{t("Starting server")}</span></div>
            : <div className="absolute inset-0"><PreviewSettingUp label={runningToolLabel} /></div>)}
          {surface === "restored" && restored && (restored.value
            ? <div className="absolute inset-0"><PreviewLastFrame jpegBase64={restored.value.jpegBase64} serverLabel={restored.value.configName ?? state?.lastFrame?.configName}
              restartPending={restartPending} onRestart={() => restart(restored.value.configName ?? state?.lastFrame?.configName, { surface: "restored" })} onDismiss={dismissFrame} /></div>
            : <StartPage state={state} rows={rows} starting={starting} onStart={start} onStop={stop} onOpen={navigate} call={call} sessionId={sessionId}
              agentUsesPreview={agentUsesPreview} onTurnOnAgentPreview={onTurnOnAgentPreview} onSetUp={onAskAgent ? () => onAskAgent(ADD_SERVER_PROMPT) : undefined} />)}
          {surface === "failed" && failure && (
            <div className="absolute inset-0" data-preview-failure={failure.name}>
              <PreviewStartFailedCard meta={failureMeta} logLine={failureChip} onCopyLog={copyFailure}
                actions={<>
                  <SourceSettingsButton variant="secondary" busy={restartPending} onClick={() => restart(failure.name, { surface: "failed", failure })}>{t("Try again")}</SourceSettingsButton>
                  {/* Sending the error didn't go through (a turn was running): it can be sent from here once the agent is free. */}
                  {ownFailure && !failureNote.sent && failureHeld === undefined && onAskAgent && (
                    <SourceSettingsButton variant="ghost" onClick={() => { void Promise.resolve(onAskAgent(startFailurePrompt(startFailureText(failure.error, failureLines))))
                      .then((sent) => { if (sent === true) setFailureNote((note) => (note?.name === failure.name ? { name: failure.name, sent: true } : note)); }, () => {}); }}>
                      {t("Ask {assistant} to fix it", { assistant: assistantName() })}
                    </SourceSettingsButton>
                  )}
                </>} />
            </div>
          )}
          {/* cf580efe9 mr (fa main pane 5916-5935): the page's dev server stopped; Restart starts it again and reopens the page. */}
          {surface === "stopped" && stopped && (
            <div className="absolute inset-0">
              <PreviewStoppedCard serverLabel={stopped.name} restartPending={restartPending} onClose={onClose}
                onRestart={() => restart(stopped.name, { surface: "stopped", server: stopped })} />
            </div>
          )}
          {surface === "error" && error && (
            <div className="spv-center spv-error" role="alert">
              <Icon name="Warning" size={20} className="spv-error-icon" />
              <div className="spv-error-title">{error.title}</div>
              {error.body && <div className="spv-error-body">{error.body}</div>}
              <div className="spv-error-actions">
                {/* Nothing answering at a launch.json server's address: start that server again from here. */}
                {refusedServer && <button type="button" className="spv-button" data-variant="primary" data-preview-restart={refusedServer.name} onClick={() => start(refusedServer.name)}>{t("Restart {serverName}", { serverName: refusedServer.name })}</button>}
                <button type="button" className="spv-button" data-variant="secondary" onClick={() => history("reload")}>{t("Reload")}</button>
              </div>
            </div>
          )}
        </div>
        {toolsOpen && <div className="spv-sketch-reservation" />}
        {downloadNotice && <DownloadNotice download={downloadNotice} onReveal={() => call("preview-download-reveal").catch(report)} onDismiss={() => setDismissedDownload(downloadNotice.at)} />}
        {logsOpen && (logsSource || drawerLines.length > 0) && <LogsDrawer source={logsSourceLabel(logsSource)} lines={drawerLines} height={logsHeight} paneHeight={paneHeight} onResize={setLogsHeight} onClose={() => setLogsOpen(false)} />}
      </div>
      {/* c9c84d68b-DMgxSiTd r (T): the pane's own Discard your annotations? for the pending action (Gn, open: Kr !== null). */}
      {pendingDiscard !== null && <SourceConfirmationDialog title={t('Discard your annotations?')} body={t('You have unsaved marks on this image. Discarding removes them.')}
        confirmLabel={t('Discard')} cancelLabel={t('Keep editing')} confirmVariant="danger" initialFocus="cancel"
        onCancel={() => setPendingDiscard(null)} onConfirm={discardAndContinue} />}
      <SourcePreviewClearDataDialog isOpen={sessionData} previewStorage={state?.previewStorage ?? 'none'}
        onClose={() => setSessionData(false)} onConfirm={() => {
          setSessionData(false);call('preview-clear-data').then(next => { if (next) setState(next); }, report);
        }} />
      {desktop?.call && <SourcePreviewAllowedSites isOpen={allowedSites} onClose={() => setAllowedSites(false)} desktop={desktop} />}
    </aside>
  );
}
