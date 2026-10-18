import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { SourceDialog, SourceDialogFooter, SourceConfirmationDialog } from "./source-dialog.jsx";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { Icon } from "./icons";
import { t } from "../electron/i18n/index.mjs";
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
 * variables have no local counterpart. The '.env format' link points at dotenv's parsing rules, the format the parser is
 * taken from (the source links Claude Code's desktop docs).
 */
const DOTENV_RULES_URL = "https://github.com/motdotla/dotenv#what-rules-does-the-parsing-engine-follow";
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

// Oe: the TextAreaField (shared-frame ti: Field gap-sm, Label, TextArea, Description hint, Error with WarningCircle).
export function EnvironmentVariablesField({ value, onChange, error, disabled, autoFocus }) {
  const id = useId();
  const hint = t("In {format}. These are stored securely and passed to your sessions.", { format: "\u0000" }).split("\u0000");
  const link = <a key="link" href={DOTENV_RULES_URL} className="sle-link" onClick={(event) => { event.preventDefault(); openExternal(DOTENV_RULES_URL); }}>{t(".env format")}</a>;
  return (
    <div className="sle-field" data-cds="Field" data-invalid={error ? "" : undefined}>
      <label className="sle-label" htmlFor={`${id}-control`}>{t("Environment variables")}</label>
      <textarea id={`${id}-control`} data-cds="TextArea" className="sle-textarea cds-reset" rows={8} value={value} placeholder={ENVIRONMENT_PLACEHOLDER}
        autoComplete="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" disabled={disabled} autoFocus={autoFocus}
        data-autofocus={autoFocus ? "" : undefined} data-invalid={error ? "" : undefined} aria-invalid={error ? true : undefined}
        aria-describedby={[`${id}-hint`, error ? `${id}-error` : null].filter(Boolean).join(" ")}
        onChange={(event) => onChange(event.target.value)} />
      <div className="sle-hint" id={`${id}-hint`}>{hint.flatMap((part, index) => index ? [link, part] : [part])}</div>
      {error && <div className="sle-error" id={`${id}-error`} role="alert"><Icon name="WarningCircle" size={16} className="sle-error-icon" /><span>{error}</span></div>}
    </div>
  );
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
        <SourceSettingsButton variant="secondary" disabled={pending} onClick={() => close()}>{t("Cancel")}</SourceSettingsButton>
        <SourceSettingsButton variant="primary" disabled={!valid || pending} busy={pending} onClick={() => void submit()}>{t("Save changes")}</SourceSettingsButton>
      </EnvironmentFooter>
    </form>
  );
}

// The failed state's E.Close.
function FailedCloseButton() {
  const close = useContext(DialogCloseContext);
  return <SourceSettingsButton variant="secondary" onClick={() => close?.()}>{t("Close")}</SourceSettingsButton>;
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
      <SourceSettingsButton variant="secondary" busy={retrying} aria-label={retrying ? t("Loading environment variables") : undefined}
        onClick={() => { setStatus("retrying"); void read().then((failed) => { if (failed) setFailures((count) => count + 1); }); }}>{t("Try again")}</SourceSettingsButton>
      <span role="status" className="sle-sr-only">{failures > 0 && <span key={failures}>{t("Couldn’t load environment variables.")}</span>}</span>
    </SourceDialogFooter>
  </EditDialog>;
}
