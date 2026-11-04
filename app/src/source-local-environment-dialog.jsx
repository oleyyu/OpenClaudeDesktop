import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SourceDialog, SourceDialogFooter, SourceConfirmationDialog } from "./source-dialog.jsx";
import { CdsButton, CdsTextAreaField, CdsTextLink } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { getAssistantName, t } from "../electron/i18n/index.mjs";
import { ENVIRONMENT_PLACEHOLDER, parseEnvironmentText, serializeEnvironment, validateEnvironmentText } from "../electron/prefs/local-environment.mjs";
import { environmentBodyClass, EnvironmentFooter } from "./generated/code-current/environment-form-layout.mjs";
import { localEnvironmentRevision } from "./source-environment-menu-adapters.jsx";
import "./source-local-environment-dialog.css";

/*
 * "Edit local environment" (2.31226.0 c3f9f1667 Ae/Ne/Pe/Oe/Me :98-327, opened by cc43287c9 ZY openLocalEnvironmentSettings
 * → uF from the env pill's Local row). Ported pieces:
 * - Ne: loads the variables first and renders nothing until they arrive; a failed load reports 'Couldn’t load environment
 *   variables.' and shows that dialog with Close and Try again (c30c42d34 f: busy 'Loading environment variables', an
 *   sr-only status repeating the failure after each failed retry).
 * - xe (c29df1c52 v): Dialog size md, density comfortable; a dirty form asks 'Discard unsaved changes?' (c13c65b88 a:
 *   Discard danger / Keep editing, initial focus on Keep editing) before closing; while a save is pending the close
 *   button is hidden and dismissal is blocked, until the save has run 20s (g: busy && !stuck), when closing works again.
 *   Cancel / Close are E.Close, so they close through the same check (DialogCloseContext).
 * - Pe: the form. The field (Oe) is a TextAreaField 'Environment variables', 8 rows, font-mono, hint 'In .env format…',
 *   placeholder c29df1c52 f. Its error allows a trailing bare key (the line being typed); Save needs the strict check.
 *   Footer align end: Cancel and the primary 'Save changes' (busy while saving). A hidden submit button keeps the form's
 *   implicit submission.
 * - Me: save → close; a failure reports 'Couldn’t save environment variables. You can try again.'.
 * The bridge's get/save is desktop:call local-environment (local-environment.cjs); the reference's scoped (per-environment)
 * variables have no local counterpart.
 */
// W14-code r4 shell fr4-12c (E95): the '.env format' link is c3f9f1667 Q's, verbatim:
// `t(j, { href: "https://code.claude.com/docs/en/desktop#environment-configuration", children: e })`.
export const ENV_FORMAT_DOCS_URL = "https://code.claude.com/docs/en/desktop#environment-configuration";
const STUCK_MS = 2e4;

// c29df1c52 g: true while `busy` and not yet 20s old (closing is blocked); false again once it has run 20s.
function useBlocking(busy) {
  const [stuck, setStuck] = useState(false);
  if (!busy && stuck) setStuck(false);
  useEffect(() => {
    if (!busy) return undefined;
    const timer = setTimeout(() => setStuck(true), STUCK_MS);
    return () => clearTimeout(timer);
  }, [busy]);
  return busy && !stuck;
}

// E.Close: Cancel and Close go through the dialog's onOpenChange (the dirty / pending check), not straight to onClose.
const DialogCloseContext = createContext(null);

// c29df1c52 v (xe)
function EditDialog({ open, onClose, onExited, title, busy = false, dirty = false, children }) {
  const blocking = useBlocking(busy);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const requestClose = () => {
    if (blocking) return;
    if (dirty && !busy) { setConfirmDiscard(true); return; }
    onClose?.();
  };
  return <>
    <SourceDialog open={open} onExited={onExited} size="md" density="comfortable" title={title} showClose={!blocking}
      className="sle-dialog" onClose={requestClose}>
      <DialogCloseContext.Provider value={requestClose}>{children}</DialogCloseContext.Provider>
    </SourceDialog>
    {confirmDiscard && <SourceConfirmationDialog title={t("Discard unsaved changes?")} body={t("Your changes haven’t been saved and will be lost.")}
      confirmLabel={t("Discard")} cancelLabel={t("Keep editing")} confirmVariant="danger" initialFocus="cancel"
      onCancel={() => setConfirmDiscard(false)} onConfirm={() => { setConfirmDiscard(false); onClose?.(); }} />}
  </>;
}

function openExternal(url) {
  return globalThis.desktop?.call?.("external", { url })?.catch?.(() => {});
}

// 3.6556.2 c3f9f1667 Z: the shared-frame TextAreaField (Di = CdsTextAreaField), verbatim props:
// `t(o,{dir:"ltr",label:c,hint:l,error:i,value:n,onChange:u,placeholder:k,rows:8,className:"font-mono",autoComplete:"off",
// "data-1p-ignore":"true","data-lpignore":"true",disabled:a,autoFocus:s,fieldClassName:"gap-sm"})`. W14-code r5 cleanup
// fr5-04 (E84): the hand-copied .sle-field / label / textarea / hint / link / error markup and rules are gone.
// data-autofocus is the host dialog's initial-focus hook (source-dialog.jsx).
export function EnvironmentVariablesField({ value, onChange, error, disabled, autoFocus }) {
  // 3.6556.2 c3f9f1667 Z: "In <link>.env format</link>. These are stored securely and passed to Claude sessions."
  // (yQufZ/mHZn), Claude as the running assistant (E83, {assistant}); the <link> chunk is Q: c29df1c52 m =
  // `e(o,{href:n,external:!0,children:r})` (o = shared-frame hu = CdsTextLink), opened in the browser here.
  const [before, label, after] = t("In <link>.env format</link>. These are stored securely and passed to {assistant} sessions.", { assistant: getAssistantName() })
    .split(/<link>(.*?)<\/link>/);
  const hint = label === undefined ? before : <>{before}<CdsTextLink href={ENV_FORMAT_DOCS_URL} external
    onClick={(event) => { event.preventDefault(); openExternal(ENV_FORMAT_DOCS_URL); }}>{label}</CdsTextLink>{after ?? ""}</>;
  return <CdsTextAreaField dir="ltr" label={t("Environment variables")} hint={hint} error={error || undefined} value={value}
    onChange={(event) => onChange(event.target.value)} placeholder={ENVIRONMENT_PLACEHOLDER} rows={8} className="font-mono"
    autoComplete="off" data-1p-ignore="true" data-lpignore="true" disabled={disabled} autoFocus={autoFocus}
    data-autofocus={autoFocus ? "" : undefined} fieldClassName="gap-sm" />;
}

// Pe
export function EnvironmentForm({ loadedText, onDirtyChange, onClose, pending, setPending, save, onSaved, onError }) {
  const [text, setText] = useState(loadedText);
  const close = useContext(DialogCloseContext) ?? onClose;
  const baseline = useRef({ text: loadedText, dirty: false });
  const edit = (next) => {
    setText(next);
    const dirty = next !== baseline.current.text;
    if (dirty !== baseline.current.dirty) { baseline.current = { ...baseline.current, dirty }; onDirtyChange(dirty); }
  };
  const blocking = useMemo(() => validateEnvironmentText(text, { checkManagedVars: true }), [text]);
  const shown = useMemo(() => validateEnvironmentText(text, { checkManagedVars: true, allowTrailingBareKey: true }), [text]);
  const valid = !blocking;
  // Me
  const submit = useCallback(async () => {
    if (!valid || pending) return;
    setPending(true);
    try {
      const result = await save(parseEnvironmentText(text));
      // c3f9f1667 Me: je.getState().bump() — an open environment picker re-reads whether this machine has variables.
      localEnvironmentRevision.getState().bump();
      onSaved?.(result);
      onClose();
    } catch {
      onError?.(t("Couldn’t save environment variables. You can try again."));
    } finally {
      setPending(false);
    }
  }, [valid, pending, text, save, onSaved, onClose, onError, setPending]);
  return (
    <form className="sle-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className={environmentBodyClass}>
        <EnvironmentVariablesField value={text} onChange={edit} error={shown} disabled={pending} autoFocus />
      </div>
      <button type="submit" hidden aria-hidden="true" tabIndex={-1} disabled={pending} />
      <EnvironmentFooter>
        {/* W14-code r5 cleanup css5-settings-button-replica: the shared-frame Button (Uu = CdsButton), not the host replica. */}
        <CdsButton variant="secondary" disabled={pending} onClick={() => close()}>{t("Cancel")}</CdsButton>
        <CdsButton variant="primary" disabled={!valid || pending} busy={pending} onClick={() => void submit()}>{t("Save changes")}</CdsButton>
      </EnvironmentFooter>
    </form>
  );
}

// The failed state's E.Close.
function FailedCloseButton() {
  const close = useContext(DialogCloseContext);
  return <CdsButton variant="secondary" onClick={() => close?.()}>{t("Close")}</CdsButton>;
}
// Ne (wrapped by Ae: rendered only while open). load() → {variables}; save(variables) → the saved result.
export function SourceLocalEnvironmentDialog({ onClose, load, save, onSaved, onError }) {
  const [status, setStatus] = useState("loading");
  const [loadedText, setLoadedText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [failures, setFailures] = useState(0);
  const attempt = useRef(0);
  const read = useCallback(() => {
    attempt.current += 1;
    const mine = attempt.current;
    return Promise.resolve().then(() => load()).then((result) => {
      if (mine !== attempt.current) return false;
      setLoadedText(serializeEnvironment(result?.variables ?? {}));
      setDirty(false);
      setStatus("loaded");
      return false;
    }, () => {
      if (mine !== attempt.current) return false;
      onError?.(t("Couldn’t load environment variables."));
      setStatus("failed");
      return true;
    });
  }, [load, onError]);
  useEffect(() => {
    void read();
    return () => { attempt.current += 1; };
  }, [read]);
  if (status === "loading") return null;
  const title = t("Edit local environment");
  if (status === "loaded") {
    return <EditDialog open onClose={onClose} busy={pending} dirty={dirty} title={title}>
      <EnvironmentForm loadedText={loadedText} onDirtyChange={setDirty} onClose={onClose} pending={pending} setPending={setPending}
        save={save} onSaved={onSaved} onError={onError} />
    </EditDialog>;
  }
  const retrying = status === "retrying";
  return <EditDialog open onClose={onClose} title={title}>
    <p className="sle-description">{t("Couldn’t load environment variables.")}</p>
    <SourceDialogFooter className="sle-footer">
      <FailedCloseButton />
      <CdsButton variant="secondary" busy={retrying} aria-label={retrying ? t("Loading environment variables") : undefined}
        onClick={() => { setStatus("retrying"); void read().then((failed) => { if (failed) setFailures((count) => count + 1); }); }}>{t("Try again")}</CdsButton>
      <span role="status" className="sr-only">{failures > 0 && <span key={failures}>{t("Couldn’t load environment variables.")}</span>}</span>
    </SourceDialogFooter>
  </EditDialog>;
}
