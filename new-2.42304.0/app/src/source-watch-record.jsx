// Watch-record, "Record a skill" (docs/computer-use-official-spec-20261021.md §2.4): the renderer's side.
//
//   useWatchRecord      official shared-6 Sz: tryStart(entryPoint) asks main to start (the chooser, then recording —
//                       electron/computer-use/watch-record.cjs), maps the answer (watch-record-model startOutcome) and
//                       hosts the macOS permissions dialog whose Continue retries with resumeRecord.
//   WatchRecordPermissionsDialog   official Nz over nj / ej (the Accessibility and Screen recording rows).
//   SourceWatchRecordMessage       official cc1aae219 bO: the delivered demonstration as "Recorded demonstration ·
//                       N.Ns", its lead in the user bubble above, the steps and pictures behind the disclosure.
//
// Entries (official gz): the composer's Add menu "Record a skill" (plus_menu, c752b32f8 zo) and Customize › Skills' Add
// menu "Record your screen" (customize_skills_add, shared-6 wz) — main.jsx and source-customize.jsx. The microphone
// menu's "Share screen" (mic_menu, purpose context) has no place here: this app has no dictation / voice control.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";
import { SourceDialog } from "./source-dialog.jsx";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { SourceImageViewer } from "./source-image-viewer.jsx";
import { actionLabel, demonstrationLead, demonstrationRows, startOutcome } from "./watch-record-model.mjs";
import { t } from "../electron/i18n/index.mjs";

// gz / HL (official i18n ids in the comments).
export const WATCH_RECORD_COPY = Object.freeze({
  menuLabel: "Record a skill", // BTQ6AjqiI0
  addSkillLabel: "Record your screen", // UfRQgxACuM
  tccModalTitle: "Grant macOS permissions", // ZoFao4NS9T
  tccModalBody: "To record your screen and actions, grant the macOS permissions below.", // VR8FtozrWk
  tccModalClose: "Close without granting permission", // zlYa5CM+bh
  tccModalContinue: "Continue to recording", // v7DYgSIHR1
  needsCuOptIn: "Turn on computer use in Settings, then try recording again.", // QsRJi63y+g
  remoteSessionUnsupported: "Recording isn’t available in a remote desktop session.", // uapjRQOxE9
  deliveryFailed: "Your recording couldn’t be sent. Try recording again.", // 6GqLJdLNSm
});

/**
 * Sz: `call` is the desktop bridge; `sessionId()` the session a recording made now belongs to (undefined: a new
 * session, official cowork_new); `notify(message)` shows a notice. `available` is false off macOS or without the bridge.
 */
export function useWatchRecord({ call, sessionId = () => undefined, notify = () => {}, available = true }) {
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  // `armed`: this view started the recording that is under way, so its completion is this view's to deliver (two
  // views of one window — a split — both hear it; the original keys the delivery by its start target the same way).
  const starting = useRef(false), last = useRef(null), armed = useRef(false);
  const start = useCallback((entryPoint, options = {}) => {
    if (starting.current || !available || !call) return;
    const session = Object.hasOwn(options, "session") ? options.session : sessionId(), resumeRecord = options.resumeRecord === true;
    last.current = { entryPoint, session };
    starting.current = true;
    setIsStarting(true);
    (async () => {
      let result;
      try { result = await call("watch-record:start", { ...(session ? { sessionId: session } : {}), resumeRecord, purpose: "skill" }); }
      catch { result = "cancelled"; }
      const outcome = startOutcome(result);
      if (outcome.kind === "started") armed.current = true;
      else if (outcome.kind === "permissions") setPermissionsOpen(true);
      else if (outcome.kind === "notice") notify(t(WATCH_RECORD_COPY[outcome.message]));
    })().finally(() => { starting.current = false; setIsStarting(false); });
  }, [call, sessionId, notify, available]);
  // ae: the dialog closed; Continue (granted) retries the same start without the chooser.
  const closePermissions = useCallback((granted) => {
    setPermissionsOpen(false);
    const previous = last.current;
    if (granted && previous) start(previous.entryPoint, { session: previous.session, resumeRecord: true });
  }, [start]);
  // `newSession`: the recording starts a session of its own whatever is open (Customize › Skills, official cowork_new).
  const tryStart = useCallback((entryPoint, { newSession = false } = {}) => start(entryPoint, newSession ? { session: undefined } : {}), [start]);
  const host = available ? <WatchRecordPermissionsDialog open={permissionsOpen} call={call} onClose={closePermissions} /> : null;
  // A completion is delivered once, by the view that started it.
  const claimCompletion = useCallback(() => { const mine = armed.current; armed.current = false; return mine; }, []);
  return { available, isStarting, tryStart, claimCompletion, host };
}

// ej: one permission row — its name, what it is for, Granted / Not yet granted, and Request while it is missing.
function PermissionRow({ label, description, granted, onRequest, kind }) {
  return <div className="p-3 flex items-start justify-between gap-3" data-watch-record-permission={kind} data-granted={granted ? "" : undefined}>
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-secondary font-medium">{label}</span>
        {granted
          ? <span className="inline-flex items-center gap-1 text-xs text-success"><Icon name="CheckCircle" size={14} className="shrink-0" />{t("Granted")}</span>
          : <span data-tone="danger" className="inline-flex items-center gap-1 text-xs text-danger"><Icon name="XCircle" size={14} className="shrink-0" />{t("Not yet granted")}</span>}
      </div>
      <p className="text-xs text-muted-as-secondary">{description}</p>
    </div>
    {granted ? null : <SourceSettingsButton variant="secondary" className="flex-shrink-0" onClick={onRequest}>{t("Request")}</SourceSettingsButton>}
  </div>;
}

/**
 * Nz: "Grant macOS permissions" with nj's two rows; the footer's one button is "Continue to recording" once both are
 * granted, else "Close without granting permission". The state is read again every second while it is open (co()).
 */
export function WatchRecordPermissionsDialog({ open, call, onClose }) {
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    const read = () => { call?.("watch-record:permissions").then((next) => { if (live && next) setState(next); }, () => {}); };
    read();
    const timer = setInterval(read, 1000);
    return () => { live = false; clearInterval(timer); };
  }, [open, call]);
  const granted = state?.accessibility === true && state?.screenRecording === true;
  const request = (kind) => { call?.("watch-record:request-permission", { kind }).then((next) => { if (next) setState(next); }, () => {}); };
  return <SourceDialog open={open} size="md" showClose={false} title={t(WATCH_RECORD_COPY.tccModalTitle)} description={t(WATCH_RECORD_COPY.tccModalBody)}
    onClose={() => onClose(false)} data-watch-record-permissions=""
    footer={<SourceSettingsButton variant="primary" onClick={() => onClose(granted)}>{t(granted ? WATCH_RECORD_COPY.tccModalContinue : WATCH_RECORD_COPY.tccModalClose)}</SourceSettingsButton>}>
    <div className="mt-3 border border-border-300 rounded-lg divide-y divide-border-300">
      <PermissionRow kind="accessibility" label={t("Accessibility")} description={t("Required for mouse and keyboard tracking and control.")}
        granted={state?.accessibility === true} onRequest={() => request("accessibility")} />
      <PermissionRow kind="screenRecording" label={t("Screen recording")} description={t("Required for screen visibility. macOS may ask you to restart OpenClaude Desktop.")}
        granted={state?.screenRecording === true} onRequest={() => request("screenRecording")} />
    </div>
  </SourceDialog>;
}

// dO: one action — its icon, the verb (and app in medium weight, typed text in mono), the time on the right.
function ActionRow({ action }) {
  return <div className="flex items-center gap-2.5 py-1">
    <Icon name={action.icon} size={16} className="text-muted-as-secondary shrink-0" />
    <span className="text-body text-primary truncate">
      {actionLabel(action)}
      {action.app && <span className="font-medium">{action.app}</span>}
      {action.typed && <span className="font-mono text-caption bg-surface-1 px-1.5 py-0.5 rounded ms-1.5">{action.typed}</span>}
    </span>
    <span className="ms-auto text-caption text-muted-as-secondary tabular-nums shrink-0">{`${action.tSec}s`}</span>
  </div>;
}

// pO: what the model was sent, behind its own disclosure.
function ModelText({ text }) {
  return <details className="mt-3 border-t pt-2" data-watch-record-model-text="">
    <summary className="text-caption text-muted-as-secondary"><span className="text-current-control">{t("Full text sent to DeepSeek")}</span></summary>
    <div className="mt-1 max-h-64 overflow-auto text-caption text-muted-as-secondary whitespace-pre-wrap break-words">{text}</div>
  </details>;
}

/**
 * bO over a parsed demonstration (watch-record-model parseDemonstration): the lead as the user's words, then the
 * card — a button "Recorded demonstration · 12.3s" (EyeFrame, CaretRight turning 90°) that opens the rows: actions,
 * "Screenshot · 3.0s" captions, the pictures (loaded once first opened; a picture opens the image viewer), notes,
 * and "Full text sent to …".
 */
export function SourceWatchRecordMessage({ parsed, itemId, footer = null }) {
  const [open, setOpen] = useState(false), [loaded, setLoaded] = useState(false), [closing, setClosing] = useState(false);
  const [viewer, setViewer] = useState(null);
  const closeTimer = useRef(undefined);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const lead = demonstrationLead(parsed);
  const rows = useMemo(() => demonstrationRows(parsed, lead), [parsed, lead]);
  const wide = open || closing;
  const seconds = parsed.durationMs / 1e3;
  const label = parsed.purpose === "context" ? `Shared screen · ${seconds.toFixed(1)}s` : t("Recorded demonstration · {seconds}s", { seconds: seconds.toFixed(1) });
  const toggle = () => {
    clearTimeout(closeTimer.current);
    if (open) { setClosing(true); closeTimer.current = setTimeout(() => setClosing(false), 320); }
    else { setClosing(false); setLoaded(true); }
    setOpen((value) => !value);
  };
  return <article className="source-message message user-message source-user-message" data-transcript-item-id={itemId} data-cds="UserMessage" data-watch-record="">
    <div className="w-full max-w-[75ch] mx-auto mt-[var(--msg-gap,1.5rem)] mb-sm flex flex-col gap-2">
      {lead && <div className="source-user-group" data-cds="UserMessageGroup"><div className="source-user-bubble"><span className="whitespace-pre-wrap">{lead}</span></div></div>}
      <div className={`ms-auto max-w-sm rounded-xl border bg-white dark:bg-surface-0 shadow-sm shadow-always-black/5 overflow-hidden font-sans ${wide ? "w-full" : "w-max"}`}>
        <button type="button" aria-expanded={open} onClick={toggle}
          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-start text-body text-secondary hover:bg-surface-1 transition-colors">
          <Icon name="EyeFrame" size={20} />
          <span className="flex-1">{label}</span>
          <Icon name="CaretRight" size={16} className={`ms-3 transition-transform ${open ? "rotate-90" : ""}`} />
        </button>
        <div aria-hidden={!open} inert={!open}
          className={`grid transition-[grid-template-rows] duration-[280ms] ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className={`min-h-0 overflow-hidden ${wide ? "" : "w-0"}`}>
            <div className="px-3.5 pt-2 pb-3 flex flex-col border-t">
              {rows.map((row, index) => {
                switch (row.kind) {
                  case "image": return <button key={index} type="button" onClick={(event) => setViewer({ src: row.src, origin: event.currentTarget })}
                    className="block w-full p-0 my-1.5 border-0 bg-transparent cursor-zoom-in">
                    <img src={loaded ? row.src : undefined} alt="" className="max-w-full h-auto rounded-lg border" />
                  </button>;
                  case "action": return <ActionRow key={index} action={row.action} />;
                  case "caption": return <div key={index} className="text-caption text-muted-as-secondary pt-5 first:pt-0">{row.text}</div>;
                  case "note": return <div key={index} className="text-caption text-secondary py-1 break-words">{row.text}</div>;
                  default: return null;
                }
              })}
              {parsed.modelText ? <ModelText text={parsed.modelText} /> : null}
            </div>
          </div>
        </div>
      </div>
      {viewer && <SourceImageViewer src={viewer.src} alt="" originRef={{ current: viewer.origin }} onClose={() => setViewer(null)} />}
    </div>
    {footer}
  </article>;
}
