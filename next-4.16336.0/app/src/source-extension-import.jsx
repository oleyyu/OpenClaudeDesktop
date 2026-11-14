// Importing an Extension Pack (extension-packs.cjs), shared by first-run setup and Settings › Cores: a picker (or a
// pack dropped on the drop zone) → inspect (nothing installed yet) → a confirmation that says what the pack is and
// that it runs code on this Mac → install. The caller hears about the installed core id.
import React, { useCallback, useRef, useState } from "react";
import { SourceDialog, SourceDialogFooter } from "./source-dialog.jsx";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { cleanErrorReason } from "./action-error-model.mjs";
import { Icon } from "./icons";
import { t } from "../electron/i18n/index.mjs";
import "./source-extension-import.css";

const mb = (bytes) => (bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`);

function ConfirmDialog({ pack, layer, busy, error, onCancel, onConfirm }) {
  const confirm = useRef(null);
  return <SourceDialog open size="md" layer={layer} title={pack.replaces ? t("Update {name}?", { name: pack.name }) : t("Add {name}?", { name: pack.name })}
    description={pack.description || pack.models || undefined} initialFocusRef={confirm} className="sxi-dialog" onClose={() => { if (!busy) onCancel(); }}>
    <dl className="sxi-facts">
      <div><dt>{t("Made by")}</dt><dd>{pack.vendor || t("Unknown")}</dd></div>
      <div><dt>{t("Version")}</dt><dd>{pack.version}{pack.replaces ? <span className="sxi-muted"> {t("(replaces {version})", { version: pack.replaces })}</span> : null}</dd></div>
      {pack.models && pack.description ? <div><dt>{t("Models")}</dt><dd>{pack.models}</dd></div> : null}
      <div><dt>{t("Size")}</dt><dd>{t("{files} files · {size}", { files: pack.files, size: mb(pack.bytes) })}</dd></div>
      {pack.license ? <div><dt>{t("License")}</dt><dd>{pack.license}</dd></div> : null}
      {pack.capabilities.length ? <div><dt>{t("Supports")}</dt><dd className="sxi-chips">{pack.capabilities.map((name) => <span key={name} className="sxi-chip">{name}</span>)}</dd></div> : null}
    </dl>
    {pack.runsCode && <p className="sxi-warning" role="note"><Icon name="Warning" size={16} />
      <span>{t("This pack runs code on your Mac with your permissions. Only add packs from sources you trust.")}</span></p>}
    {pack.downloadsAgent && <p className="sxi-note">{t("Choosing it downloads {binary} from the release this pack names, checked against its checksum.", { binary: pack.agentBinary || pack.name })}</p>}
    {error && <p className="sxi-error" role="alert">{error}</p>}
    <SourceDialogFooter>
      <SourceSettingsButton disabled={busy} onClick={onCancel}>{t("Cancel")}</SourceSettingsButton>
      <SourceSettingsButton ref={confirm} variant="primary" busy={busy} onClick={onConfirm}>{pack.replaces ? t("Update") : t("Add pack")}</SourceSettingsButton>
    </SourceDialogFooter>
  </SourceDialog>;
}

/**
 * @param {{desktopCall: Function, onInstalled?: (id: string, cores: object[]) => void, layer?: object}} options
 * @returns {{pick: () => Promise<void>, inspectPath: (path: string) => Promise<void>, dropProps: object, dragging: boolean, error: string, dialog: React.ReactNode}}
 */
export function useExtensionImport({ desktopCall, onInstalled, layer = { base: 520, z: 520 } }) {
  const [pack, setPack] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [dragging, setDragging] = useState(false);
  const call = useCallback((op, extra = {}) => Promise.resolve(desktopCall("extensions", { op, ...extra })), [desktopCall]);
  const inspectPath = useCallback(async (file) => {
    setError("");
    try { setPack(await call("inspect", { path: file })); }
    catch (failure) { setError(cleanErrorReason(failure?.message || String(failure))); }
  }, [call]);
  const pick = useCallback(async () => {
    setError("");
    try { const file = await call("pick"); if (file) await inspectPath(file); }
    catch (failure) { setError(cleanErrorReason(failure?.message || String(failure))); }
  }, [call, inspectPath]);
  const cancel = () => { if (pack?.token) void call("discard", { token: pack.token }); setPack(null); setError(""); };
  const confirm = async () => {
    setBusy(true); setError("");
    try { const result = await call("install", { token: pack.token }); setPack(null); onInstalled?.(result.installed, result.cores); }
    catch (failure) { setError(cleanErrorReason(failure?.message || String(failure))); }
    finally { setBusy(false); }
  };
  // A pack dragged onto the drop zone (Electron gives the dropped file's path through the preload).
  const dropProps = {
    onDragOver: (event) => { if ([...(event.dataTransfer?.types ?? [])].includes("Files")) { event.preventDefault(); setDragging(true); } },
    onDragLeave: (event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); },
    onDrop: (event) => {
      event.preventDefault(); setDragging(false);
      const file = event.dataTransfer?.files?.[0];
      const filePath = file ? globalThis.desktop?.pathForFile?.(file) : "";
      if (filePath) void inspectPath(filePath); else setError(t("Drop an extension pack folder or .zip."));
    },
  };
  const dialog = pack ? <ConfirmDialog pack={pack} layer={layer} busy={busy} error={error} onCancel={cancel} onConfirm={confirm} /> : null;
  return { pick, inspectPath, dropProps, dragging, error: pack ? "" : error, dialog };
}

/** The import affordance: a dashed drop zone with the picker button. */
export function SourceExtensionDropZone({ importer, compact = false }) {
  return (
    <div className="sxi-drop" data-dragging={importer.dragging || undefined} data-compact={compact || undefined} {...importer.dropProps}>
      <Icon name="Box" size={compact ? 16 : 20} />
      <span className="sxi-drop-text">{importer.dragging ? t("Drop to import") : t("Add another agent with an extension pack")}</span>
      <SourceSettingsButton size="sm" onClick={importer.pick}>{t("Import extension pack…")}</SourceSettingsButton>
      {importer.error && <p className="sxi-error sxi-drop-error" role="alert">{importer.error}</p>}
    </div>
  );
}
