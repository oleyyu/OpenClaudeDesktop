import { previewDOMTabKey } from "../electron/preview-tab-shortcuts.mjs";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { previewLinksStore } from "./preview-links-model.mjs";
import { Icon } from "./icons";
import { SourcePreviewSettingsMenu, SourcePreviewClearDataDialog, useAutoOpenFilesMenuProps } from "./source-preview-settings-menu.jsx";
import { SourcePreviewAllowedSites } from "./source-preview-allowed-sites.jsx";
import { usePreviewCopyUrl } from "./source-preview-copy-url.jsx";
import { SourceSpinner } from "./source-pane-states.jsx";
// 3.6556.2 cf580efe9 `import { t as Zt } from "./cc0a875c8-Ba9KI-Fw.js"` (EmptyState): the generated slice.
import { EmptyState } from "./generated/r3b-transcript/empty-state.mjs";
import { assistantName } from "./persona-store.mjs";
import { addServerErrorText, candidateRow, detectedCandidates, detectionActive, detectionKey, serverTriggerVisible, shouldHandOffFocus } from "./preview-detection-model.mjs";
import { SourceAnsiText } from "./source-ansi-text.jsx";
import { SourcePreviewAddress, SourcePreviewNavigation } from "./source-preview-address.jsx";
import { SourcePreviewServerMenu } from "./source-preview-server-menu.jsx";
import { SourcePreviewCloseTabsDialog, SourcePreviewTabs } from "./source-preview-tabs.jsx";
import { ownsSelectedElement } from './preview-element-attachments.mjs';
import { CdsButton, CdsConfirmationDialog, CdsIcon, CdsSpinner } from "./generated/view-tabs/index.js";
import { devServerLogTone, devServerLogToneClasses } from "./generated/code-editor/preview-log-lines.mjs";
import { SourcePreviewSketch } from "./source-preview-sketch.jsx";
import { matchSketchCommand } from './generated/code-editor/preview-sketch-keys.mjs';
import {
  ADD_SERVER_PROMPT, LOGS_HEIGHT, SHOW_RETRY_MS, SERVER_SETTLE_MS, boundsOf, clampLogsHeight, failedServer, failureLogLine, heldPort, isOccluded,
  logsServer, logsSourceLabel, PREVIEW_LOGS_EXPANDED_KEY, readLogsExpanded, serverStartHold, startFailurePrompt, startFailureText, writeLogsExpanded,
  pageRefused, previewSurface, stoppedServer, sameBounds, serverErrorText, serverRows, serverMenuRows, showsPage, viewportLabel, viewportRows,
  launchEntryMissingText, noLaunchEntry, pickUnavailable, SKETCH_AWAIT_CAPTURE_MS, createFailureReports,
} from "./preview-model.mjs";
import { t } from "../electron/i18n/index.mjs";
import "./source-preview-pane.css";

// W14-code r4 r4pa-c05: a failed Run's error report waits here, per session, until the session takes it (preview-model
// createFailureReports), so the start-failed card's "Error details were sent to {assistant}" is true.
export const previewFailureReports = createFailureReports();

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

// c9c84d68b C(e), the scheme branch left to the sheet ("scheme").
export function previewViewportBackground({ hasServer, hideForStartPage, isHtmlPreview, activeTabUsesBrowserDefaults, pageBackgroundColor }) {
  if (!hasServer || hideForStartPage) return false;
  if (pageBackgroundColor) return pageBackgroundColor;
  return isHtmlPreview || activeTabUsesBrowserDefaults ? "#ffffff" : "scheme";
}

function DownloadNotice({ download, onReveal, onDismiss }) {
  const text = download.state === "completed" ? t("Downloaded {file}", { file: download.file })
    : download.state === "failed" ? t("Couldn’t download {file}", { file: download.file })
      : t("{file} wasn’t downloaded: the preview has to be on screen to ask where to save it.", { file: download.file });
  return (
    <div className="spv-download" role="status" data-preview-download={download.state}>
      <Icon name={download.state === "completed" ? "Download" : "Warning"} size={16} className="spv-download-icon" />
      <span className="spv-download-text"><bdi>{text}</bdi></span>
      {download.state === "completed" && download.canReveal && <CdsButton size="sm" variant="secondary" onClick={onReveal}>{t("Show in Finder")}</CdsButton>}
      {/* W14-code r3 fr3-08: the CDS ghost iconOnly Button, as 3.6556.2 draws pane controls (c4db265df `n(h,{variant:"ghost",
          iconOnly:!0,icon:"X","aria-label":…})`); the host notice keeps its bottom tooltip. */}
      <CdsButton variant="ghost" iconOnly icon="X" aria-label={t("Dismiss")} tooltipSide="bottom" onMouseDown={(event) => event.preventDefault()} onClick={onDismiss} />
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
      {row.blocked ? null : <CdsButton variant="secondary" disabled={busy} onClick={() => onUse(candidate)}>{t("Use this")}</CdsButton>}
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
            <CdsButton variant="ghost" size="xxs" onClick={onSetUp} onMouseDown={(event) => event.preventDefault()}>{t("Detect dev server")}</CdsButton>
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
      <EmptyState role="status" icon="Globe" title={t("Browser tools are turned off")}
        body={t("They let {assistant} start your dev server and open pages here. Once they’re on, {assistant} can use them in new sessions on your computer.", { assistant })}
        actions={onTurnOn ? <CdsButton variant="secondary" onClick={onTurnOn}>{t("Turn on Browser tools")}</CdsButton> : null} />
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

// shared-78 JT (frontend_preview_external_domains): off on this host, as titlebar-controls-model's C.
const PREVIEW_OPENS_EXTERNAL_DOMAINS = false;

// W14-code r6 r6pa-05 (E84): 3.6556.2 cf580efe9 pa (list) / fa (row) in their own utility class strings: a bordered
// rounded list (at most 5 rows until "See all"), each row Cache icon · name (truncates) · the `:${port}` detail in
// text-muted-as-secondary tabular-nums, an icon-only Play (secondary) / Stop (danger). A running server's row is itself
// the Open button, and its icon and name read text-secondary-control. The two captions sit at the bottom of the pane.
// W14-code r6 review (r6pa-05): pa's `ie = I || B` (readable 3300-3356) — a server starting (F = t.find(ma)), a pending
// Run of a server not yet running (N.isRun), or the started server held da = 1500 ms once it runs (B; the pane's
// serverStartHold, passed as `holding`) — replaces the list with a role=status lg spinner (Ac) and an sr-only
// "Starting server" (rTAQSpY/q9), and drops the two captions (`!ie && …`).
const VISIBLE_SERVERS = 5;
export function ServerList({ launch = {}, rows, starting = null, holding = false, startingName, onStart, onStop, onOpen }) {
  const [all, setAll] = useState(false);
  const pendingRun = !!starting && !rows.some((row) => row.name === starting && row.running);
  const spinner = holding || pendingRun || rows.some((row) => row.status === "starting");
  const firstHidden = useRef(null);
  const focusHidden = useRef(false);
  const showAll = all || rows.some((row, index) => index >= VISIBLE_SERVERS && (row.running || row.busy || row.name === starting));
  const shown = showAll ? rows : rows.slice(0, VISIBLE_SERVERS);
  useEffect(() => { if (showAll && focusHidden.current) { focusHidden.current = false; firstHidden.current?.focus(); } }, [showAll]);
  return (
    <div className="absolute inset-0" data-preview-start="servers" data-preview-starting={spinner ? (startingName ?? starting ?? undefined) : undefined}>
      <div className="h-full w-full overflow-y-auto">
        <div className="flex min-h-full w-full flex-col items-center gap-lg p-lg">
          <div className="flex w-full flex-1 items-center justify-center">
            <div className="flex min-w-[min(400px,75%)] flex-col gap-sm">
              {spinner ? (
                <div role="status" className="flex w-full items-center justify-center py-lg"><CdsSpinner size="lg" /><span className="sr-only">{t("Starting server")}</span></div>
              ) : <>
              {/* Host: a launch.json that doesn't parse keeps the list view with its error. */}
              {launch.error && <p className="spv-start-problem" role="alert">{launch.error}</p>}
              {shown.length > 0 && (
                <ul role="list" className="flex w-full flex-col rounded border max-h-[min(60vh,480px)] overflow-y-auto" aria-label={t("Servers")}>
                  {shown.map((row, index) => {
                    const open = row.running && !!row.port;
                    const label = row.running ? t("Stop {serverName}", { serverName: row.name }) : t("Run {serverName}", { serverName: row.name });
                    const tone = open ? "text-secondary-control" : "text-secondary";
                    const body = <>
                      <CdsIcon name="Cache" size="sm" className={`shrink-0 ${tone}`} />
                      <span className={`min-w-0 flex-1 truncate text-body ${tone}`}>{row.name}</span>
                      {row.port ? <span className="shrink-0 text-footnote text-muted-as-secondary tabular-nums">{`:${row.port}`}</span> : null}
                    </>;
                    return (
                      <li key={row.name} ref={index === VISIBLE_SERVERS ? firstHidden : undefined} tabIndex={-1} data-status={row.status}
                        aria-busy={row.name === starting || undefined}
                        className={`flex items-center gap-sm border-b py-md ps-[9px] pe-md last:border-b-0 focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-fill-accent ${open ? "hover:bg-alpha-2 has-[:focus-visible]:bg-alpha-2" : ""}`}>
                        {open
                          ? <button type="button" aria-label={t("Open {name}", { name: row.name })} onClick={() => onOpen(row.url)}
                            className="flex min-w-0 flex-1 items-center gap-sm border-0 bg-transparent p-0 text-start outline-none hide-focus-ring">{body}</button>
                          : body}
                        {/* cf580efe9 fa: size sm iconOnly g, className "min-w-8 shrink-0" (its aria-label is the tooltip). */}
                        <CdsButton size="sm" variant={row.running ? "danger" : "secondary"} icon={row.running ? "Stop" : "Play"} iconOnly
                          className="min-w-8 shrink-0" aria-label={label} busy={row.busy || row.name === starting}
                          disabled={!!starting && row.name !== starting} onMouseDown={(event) => event.preventDefault()}
                          onClick={() => (row.running ? onStop(row.name) : onStart(row.name))} />
                      </li>
                    );
                  })}
                </ul>
              )}
              {shown.length < rows.length && (
                // cf580efe9 pa: ghost xxs, "w-full text-muted hover:text-primary".
                <CdsButton variant="ghost" size="xxs" className="w-full text-muted hover:text-primary" onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => { focusHidden.current = event.currentTarget === event.currentTarget.ownerDocument.activeElement; setAll(true); }}>{t("See all")}</CdsButton>
              )}
              </>}
            </div>
          </div>
          {!spinner && <div className="flex flex-col items-center">
            <p className="m-0 max-w-[48ch] text-center text-footnote text-muted-as-secondary">{rows.some((row) => row.running) ? t("Open a server to preview your app, or enter a URL.") : t("Run a server to preview your app, or enter a URL.")}</p>
            <p className="m-0 max-w-[48ch] text-center text-footnote text-muted-as-secondary">{t("Edit this list in .claude/launch.json.")}</p>
          </div>}
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
            {onCopyLog && <CdsButton size="base" variant="ghost" icon={copied ? "Check" : "Copy"} iconOnly aria-label={copied ? t("Copied") : t("Copy error log")}
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
      <EmptyState role="status" icon="Cache" title={t("Preview server stopped")} body={t("Close and reopen the preview to start it again.")}
        actions={onClose ? <CdsButton variant="secondary" onClick={onClose}>{t("Close")}</CdsButton> : null} />
    );
  }
  return (
    <div role="status" className={`flex h-full w-full items-center justify-center overflow-y-auto p-lg ${className}`.trim()} data-preview-stopped={serverLabel}>
      <div className={`flex w-full max-w-[400px] flex-col gap-sm ${contentClassName}`.trim()}>
        <div className="flex items-center gap-sm rounded bg-alpha-1 py-md ps-[9px] pe-md">
          <Icon name="Cache" size={16} className="shrink-0 text-secondary" />
          <span className="min-w-0 flex-1 truncate text-body text-secondary">{serverLabel}</span>
          <span className="shrink-0 text-footnote text-muted-as-secondary">{t("Stopped")}</span>
          <CdsButton size="xxs" variant="secondary" busy={restartPending} aria-label={t("Restart {serverName}", { serverName: serverLabel })}
            onClick={onRestart} onMouseDown={(event) => event.preventDefault()} className="shrink-0">{t("Restart")}</CdsButton>
        </div>
        <p className="m-0 text-center text-caption text-muted-as-secondary">{caption ?? t("The dev server stopped. Restart it, or close the preview.")}</p>
        {onDismiss && <CdsButton size="xs" variant="ghost" onClick={onDismiss} className="self-center">{t("Show start page")}</CdsButton>}
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

// 3.6556.2 cf580efe9 So (w12b TPT-4): the drawer under the page — `relative flex flex-col shrink-0 h-[200px] min-h-[80px]
// max-h-[60%]`, a pointer-only separator along its top edge (`absolute top-0 inset-x-0 h-[8px] cursor-ns-resize z-[1]`,
// no tab stop, no name), the header "{name} · {host}" (text-muted-as-secondary) with Close (CdsButton ghost iconOnly X,
// tooltipSide "bottom", className c = shared-18 Mb(c219730b0 Jr) with fizzy-lake "panels" off), and the output, which
// follows the end unless scrolled up (`<8`). Rows are Go: "whitespace-pre-wrap break-all" plus _o's tint (vo). The
// host keeps the height the user dragged to (So sets it on the element; the host holds it across drawer toggles).
export function LogsDrawer({ source, lines, height, onResize, onClose, paneHeight }) {
  const body = useRef(null);
  const pinned = useRef(true);
  const drag = useRef(null);
  useLayoutEffect(() => { const node = body.current; if (node && pinned.current) node.scrollTop = node.scrollHeight; }, [lines]);
  useEffect(() => () => drag.current?.abort(), []);
  const resize = (event) => {
    if (event.button !== 0) return;
    const view = event.currentTarget.ownerDocument.defaultView;
    if (!view) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const startY = event.clientY, startHeight = height, controller = new AbortController();
    drag.current = controller;
    const move = (moveEvent) => onResize(clampLogsHeight(startHeight + (startY - moveEvent.clientY), paneHeight));
    const stop = () => controller.abort();
    view.addEventListener("pointermove", move, { signal: controller.signal });
    view.addEventListener("pointerup", stop, { signal: controller.signal });
    view.addEventListener("pointercancel", stop, { signal: controller.signal });
  };
  return (
    <div className="relative flex flex-col shrink-0 h-[200px] min-h-[80px] max-h-[60%]" style={{ height }}>
      <div role="separator" aria-orientation="horizontal" onPointerDown={resize} className="absolute top-0 inset-x-0 h-[8px] cursor-ns-resize z-[1]" />
      <div className="flex shrink-0 items-center gap-sm pt-md pe-xs ps-lg">
        <span data-testid="preview-logs-source" title={source} className="min-w-0 flex-1 truncate text-caption text-muted-as-secondary">{source}</span>
        <CdsButton variant="ghost" iconOnly icon="X" className="text-muted-as-secondary hover:text-secondary" tooltipSide="bottom"
          aria-label={t("Close dev server logs")} onClick={onClose} />
      </div>
      <div ref={body} onScroll={(event) => { const node = event.currentTarget; pinned.current = node.scrollHeight - node.scrollTop - node.clientHeight < 8; }}
        className="min-h-0 flex-1 overflow-auto [contain:strict] px-lg pb-lg text-code text-secondary select-text">
        {lines.length === 0 ? <div className="text-muted-as-secondary text-center">{t("Waiting for output…")}</div>
          : lines.map((line, index) => {
            const tone = devServerLogTone(line);
            return <div key={index} className={tone ? `whitespace-pre-wrap break-all ${devServerLogToneClasses[tone]}` : "whitespace-pre-wrap break-all"}><SourceAnsiText text={line} /></div>;
          })}
      </div>
    </div>
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
  const askAgent = useRef(onAskAgent); askAgent.current = onAskAgent;
  // r4pa-c05: send a waiting error report whenever a sender is there (main.jsx gives none while disconnected or archived;
  // a new one on each of its renders, e.g. when loading or sending ends), and again after the backoff.
  const [failureRetry, setFailureRetry] = useState(0);
  useEffect(() => {
    if (!onAskAgent || !previewFailureReports.pending(sessionId)) return undefined;
    let timer = null, live = true;
    void previewFailureReports.flush(sessionId, onAskAgent).then(({ retryIn }) => {
      if (live && retryIn !== null) timer = setTimeout(() => setFailureRetry((value) => value + 1), retryIn);
    });
    return () => { live = false; if (timer !== null) clearTimeout(timer); };
  }, [sessionId, onAskAgent, failureRetry]);
  // cf580efe9 bi: the server whose start replaced the list with a spinner (held SERVER_SETTLE_MS once it runs).
  const [heldServer, setHeldServer] = useState(null);
  // cf580efe9 Pi: the page from before the app closed ({ key, value }; value null when there is no frame to show).
  const [frame, setFrame] = useState(null);
  const linksInPreview = useSyncExternalStore(previewLinksStore.subscribe, previewLinksStore.getSnapshot, previewLinksStore.getSnapshot);
  const autoOpenFilesProps = useAutoOpenFilesMenuProps(sessionId);
  const [showTools, setShowTools] = useState(false);
  const [tabClose, setTabClose] = useState(null);
  const [closingTab, setClosingTab] = useState(false);
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
  // 3.6556.2 c9c84d68b C(e) (called from cf580efe9 with Me.pageBackgroundColor): with a server shown and not the start
  // page, the viewport is the page's own colour, else #ffffff for an HTML preview or a tab on browser defaults, else the
  // scheme placeholder (#131312 dark / #f5f5f5 light, data-placeholder in the sheet); otherwise it is not painted. Local
  // previews are dev-server pages (no html-preview- tabs, no browser-defaults signal).
  // W14-code DC-13: the main process never samples a page colour here, as officially on a 3P desktop: jPKPzV-P
  // samplePageColors starts `if(!this.externalPreviewEnabled)return;` with externalPreviewEnabled = lP() = cP() && sP(),
  // cP needing Pb("17519066") (eYn), which Uon does not list (E81: off). So pageBackgroundColor stays undefined, and
  // C(e)'s first branch is kept only as the official renderer transcription.
  const viewportBackground = previewViewportBackground({ hasServer: !!state?.hasPage, hideForStartPage: surface === "start" || surface === "restored",
    isHtmlPreview: false, activeTabUsesBrowserDefaults: false, pageBackgroundColor: state?.pageBackgroundColor });
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
      if (result?.ok) { previewFailureReports.drop(sessionId, name); return; }
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
      // ca80fca8d / cf580efe9 Rr, zr: unless another session's server holds the port, the error goes to the agent —
      // now, or (r4pa-c05) once the session can take it.
      if (heldPort(result) !== undefined) { previewFailureReports.drop(sessionId, name); return; }
      const logs = await call("preview-server-logs", { name, lines: 500 }).catch(() => null);
      previewFailureReports.queue(sessionId, { name, text: startFailurePrompt(startFailureText(result, logs?.lines ?? [])) });
      setFailureRetry((value) => value + 1);
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
    // W14-code r2-shared-07: jPKPzV-P wli `pQ(e,t,"r")` claims ⌘R inside the page; c518a31cc Ve lists it.
    else if (action === "reload") history("reload");
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
  // cf580efe9 Hr: the meta is unconditional (r4pa-c05) — the agent's own preview_start got the error in its tool result,
  // a start from here sends it (previewFailureReports) — except for a port another session's server holds.
  const failureMeta = !failure ? undefined
    : failureHeld !== undefined ? t("Port {port} is already in use by a dev server in another session. Stop that server, then try again.", { port: failureHeld })
      : t("Error details were sent to {assistant}", { assistant: assistantName() });
  const copyFailure = useCallback(async () => {
    try { await navigator.clipboard.writeText(failureText); return "written"; } catch { return "failed"; }
  }, [failureText]);

  const stopped = surface === "stopped" ? (hold?.surface === "stopped" ? hold.server : stoppedServer(state)) : null;
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
          // W14-code r2-shared-07: c518a31cc Ve "Reload page in preview" cmd+r (jPKPzV-P dTi: View › Reload reloads the
          // preview whose chrome has focus, Bhi), taken here before the menu's CmdOrCtrl+R reloads the app.
          if (event.key.toLowerCase() === 'r') { event.preventDefault();event.stopPropagation();if (!event.repeat) history('reload');return; }
        }
        // Ve off a Mac: `i = n ? Be : "f5"` (k off: F5).
        if (event.key === 'F5' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && !/Mac/.test(navigator.platform)) { event.preventDefault();event.stopPropagation();if (!event.repeat) history('reload');return; }
        // toggleSketchMode (⇧⌘X) while focus is in this pane.
        const pageTool = matchSketchCommand(event, { isClaudeApp: true, commands: ['toggleSketchMode', 'toggleSelectionMode'] });
        if (pageTool) { event.preventDefault(); event.stopPropagation(); if (!event.repeat) { if (pageTool === 'toggleSketchMode') void toggleSketch(); else togglePick(); } }
      }}>
      <header className="source-pane-header spv-tabs-header" data-pane-header="preview">
        <SourcePreviewTabs tabs={state?.tabs} activeId={state?.activeTabId} onSelect={selectTab} onCreate={createTab}
          onClose={id => void closeTab(id)} onCloseOthers={id => void closeTab(id, true)}
          onExternal={tabId => call('preview-tab-external', { tabId }).catch(report)}
          onReorder={(tabId, toIndex) => call('preview-tab-reorder', { tabId, toIndex }).then(acceptTabState, report)}
          onFocusPage={() => call('preview-focus').catch(() => {})} />
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
            description: row.setByAgent ? t('Set by {assistant}', { assistant: assistantName() }) : undefined,
            onSelect: () => { if (!row.keep) call('preview-emulate', { preset: row.value }).catch(report); } }))}
          viewportHint={state?.viewport?.preset !== 'responsive' ? viewportLabel(state?.viewport) : undefined} viewportDisabled={!state?.hasPage}
          colorScheme={state?.viewport?.colorScheme ?? 'system'} onColorScheme={colorScheme => call('preview-emulate', { colorScheme }).catch(report)}
          onShowSessionLogs={logsOpen || logsSource ? () => setLogsOpen(value => !value) : undefined}
          openLinksInPreview={linksInPreview} onOpenLinksInPreviewChange={value => previewLinksStore.set(value)} {...autoOpenFilesProps}
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
      {/* cf580efe9 Oa Rt: `r(va,{pending:Mt,onCancel:vt,onKeepRunning:bt,onStopServer:St,onClosed:Ct})`, Mt =
          `{mode:Ye.mode,processes:Ye.processes.map(La)}` (La: name and port). The main process answers a close that would
          strand a running server with the confirmation (preview-tab-close), and the decision closes it from there. */}
      <SourcePreviewCloseTabsDialog pending={tabClose ? { mode: tabClose.others ? 'others' : 'single', processes: tabClose.processes.map(({ name, port }) => ({ name, port })) } : null}
        onCancel={() => setTabClose(null)} onKeepRunning={() => { if (tabClose) void closeTab(tabClose.tabId, tabClose.others, 'keep'); }}
        onStopServer={() => { if (tabClose) void closeTab(tabClose.tabId, tabClose.others, 'stop'); }} />
      {/* W14-code r6 css6-preview-focus-sentinel: cf580efe9 `c` — a block-level sr-only sentinel in the pane column before
          the viewport body, with the "Browser page" copy when `I` (shared-78 JT: frontend_preview_external_domains, which
          the host has no GrowthBook for — titlebar-controls-model C) and "Preview page" otherwise. */}
      {wantsPage && (
        <button ref={skip} type="button" data-preview-focus-sentinel=""
          className="sr-only focus:not-sr-only focus:block focus:w-full focus:shrink-0 focus:bg-alpha-2 focus:text-start focus:text-caption focus:text-primary focus:shadow-focus"
          onClick={() => call("preview-focus").catch(() => {})}>
          {PREVIEW_OPENS_EXTERNAL_DOMAINS
            ? t("Browser page — press Enter to move into it. Inside, press F6 or Ctrl+F6 to move back out.")
            : t("Preview page — press Enter to move into it. Inside, press F6 or Ctrl+F6 to move back out.")}
        </button>
      )}
      <div className="spv-body">
        <div ref={viewport} className="spv-viewport" data-page={pageVisible || undefined} data-covered={occlusion.covered || undefined}
          data-placeholder={viewportBackground === "scheme" || undefined} style={viewportBackground && viewportBackground !== "scheme" ? { backgroundColor: viewportBackground } : undefined}>
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
          {/* A start from this pane is pa's own `ie` branch (3.6556.2 cf580efe9 readable 3350: the list's lg spinner with an
              sr-only "Starting server", in the start page's frame, captions dropped); one the agent (or another pane) began
              is Or's "Setting up preview" with the session's running tool. */}
          {surface === "starting" && (starting || (heldServer !== null && heldServer === lastStarted)
            ? <ServerList launch={state?.launch} rows={rows} starting={starting} holding={startHold.spinner} startingName={starting ?? heldServer}
              onStart={start} onStop={stop} onOpen={navigate} />
            : <div className="absolute inset-0"><PreviewSettingUp label={runningToolLabel} /></div>)}
          {surface === "restored" && restored && (restored.value
            ? <div className="absolute inset-0"><PreviewLastFrame jpegBase64={restored.value.jpegBase64} serverLabel={restored.value.configName ?? state?.lastFrame?.configName}
              restartPending={restartPending} onRestart={() => restart(restored.value.configName ?? state?.lastFrame?.configName, { surface: "restored" })} onDismiss={dismissFrame} /></div>
            : <StartPage state={state} rows={rows} starting={starting} onStart={start} onStop={stop} onOpen={navigate} call={call} sessionId={sessionId}
              agentUsesPreview={agentUsesPreview} onTurnOnAgentPreview={onTurnOnAgentPreview} onSetUp={onAskAgent ? () => onAskAgent(ADD_SERVER_PROMPT) : undefined} />)}
          {surface === "failed" && failure && (
            <div className="absolute inset-0" data-preview-failure={failure.name}>
              <PreviewStartFailedCard meta={failureMeta} logLine={failureChip} onCopyLog={copyFailure}
                // W14-code pa2-09 (E93): cf580efe9 Hr's start-failed actions are only `r(g, {"data-preview-start-retry": "",
                // variant: "secondary", …"Try again" (FazwRldA7z)})`; the error goes to the agent by itself (main.jsx onAskAgent
                // queues it while a turn runs, as submitToChat does), so the host's ask-to-fix ghost button is gone.
                actions={<CdsButton data-preview-start-retry="" variant="secondary" busy={restartPending} onClick={() => restart(failure.name, { surface: "failed", failure })}>{t("Try again")}</CdsButton>} />
            </div>
          )}
          {/* cf580efe9 mr (fa main pane 5916-5935): the page's dev server stopped; Restart starts it again and reopens the page. */}
          {surface === "stopped" && stopped && (
            <div className="absolute inset-0">
              <PreviewStoppedCard serverLabel={stopped.name} restartPending={restartPending} onClose={onClose}
                onRestart={() => restart(stopped.name, { surface: "stopped", server: stopped })} />
            </div>
          )}
          {/* W14-code r4 r4pa-c04 (E95): a page that fails to load or crashes is the main process's data: error page in
              the tab itself (3.6556.2 jPKPzV-P Idi / Pdi, electron/preview-service.cjs previewErrorPage); the host's
              .spv-error overlay with its Restart {serverName} / Reload buttons is gone (the toolbar's Reload stays). */}
        </div>
        {toolsOpen && <div className="spv-sketch-reservation" />}
        {downloadNotice && <DownloadNotice download={downloadNotice} onReveal={() => call("preview-download-reveal").catch(report)} onDismiss={() => setDismissedDownload(downloadNotice.at)} />}
        {logsOpen && (logsSource || drawerLines.length > 0) && <LogsDrawer source={logsSourceLabel(logsSource)} lines={drawerLines} height={logsHeight} paneHeight={paneHeight} onResize={setLogsHeight} onClose={() => setLogsOpen(false)} />}
      </div>
      {/* 3.6556.2 c9c84d68b w (cf580efe9 `r as Jn`, mounted `r(Jn,{open:Eu,onKeepEditing:Ji,onDiscard:sa})`): the pane's own
          Discard your annotations? for the pending action — `t(a,{initialFocus:"cancel",open:n,onOpenChange:o,onConfirm:i,
          confirmVariant:"danger",title:s,description:c,confirmLabel:l,cancelLabel:d})` with `Xc as a` (view-tabs
          CdsConfirmationDialog); o closes on `e || r()`. */}
      <CdsConfirmationDialog initialFocus="cancel" open={pendingDiscard !== null} onOpenChange={(open) => { if (!open) setPendingDiscard(null); }}
        onConfirm={discardAndContinue} confirmVariant="danger" title={t('Discard your annotations?')}
        description={t('You have unsaved marks on this image. Discarding removes them.')} confirmLabel={t('Discard')} cancelLabel={t('Keep editing')} />
      <SourcePreviewClearDataDialog isOpen={sessionData} previewStorage={state?.previewStorage ?? 'none'}
        onClose={() => setSessionData(false)} onConfirm={() => {
          setSessionData(false);call('preview-clear-data').then(next => { if (next) setState(next); }, report);
        }} />
      {desktop?.call && <SourcePreviewAllowedSites isOpen={allowedSites} onClose={() => setAllowedSites(false)} desktop={desktop} />}
    </aside>
  );
}
