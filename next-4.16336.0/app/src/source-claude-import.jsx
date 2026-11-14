import React, { useEffect, useState } from "react";
import { ActionDialog } from "./source-session-actions.jsx";
import { SourceDialogFooter } from "./source-dialog.jsx";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { t, tn } from "../electron/i18n/index.mjs";
import "./source-claude-import.css";

// Import from Claude Code on Codex (codex /import; tui external_agent_config_migration): Codex detects what it can
// bring over from ~/.claude and the project (externalAgentConfig/detect), the user keeps or drops each item, and the
// import runs (main.cjs codex-import). Labels per ExternalAgentConfigMigrationItemType.
const TYPE_LABELS = {
  AGENTS_MD: () => t("Instructions (CLAUDE.md → AGENTS.md)"), CONFIG: () => t("Settings"), SKILLS: () => t("Skills"),
  PLUGINS: () => t("Plugins"), MCP_SERVER_CONFIG: () => t("MCP servers"), SUBAGENTS: () => t("Subagents"), HOOKS: () => t("Hooks"),
  COMMANDS: () => t("Commands"), MEMORY: () => t("Memory"), SESSIONS: () => t("Recent sessions"),
};
export const claudeImportTypeLabel = (type) => (TYPE_LABELS[type] ? TYPE_LABELS[type]() : type);

export function ClaudeImportDialog({ desktopCall, cwds = [], onDone, onClose, ...dialog }) {
  const [items, setItems] = useState(null), [chosen, setChosen] = useState(() => new Set()), [error, setError] = useState(""), [busy, setBusy] = useState(false), [result, setResult] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.resolve(desktopCall("codex-import", { op: "detect", cwds })).then((value) => {
      if (!live) return;
      const list = Array.isArray(value?.items) ? value.items : [];
      setItems(list); setChosen(new Set(list.map((item) => item.index)));
    }, (failure) => { if (live) { setItems([]); setError(failure?.message || String(failure)); } });
    return () => { live = false; };
  }, []);
  const toggle = (index, on) => setChosen((current) => { const next = new Set(current); if (on) next.add(index); else next.delete(index); return next; });
  const run = async () => {
    setBusy(true); setError("");
    try { const value = await desktopCall("codex-import", { op: "import", indices: [...chosen] }); setResult(value); onDone?.(value); }
    catch (failure) { setError(failure?.message || String(failure)); }
    finally { setBusy(false); }
  };
  return <ActionDialog {...dialog} title={t("Import from Claude Code")} className="claude-import-dialog" onClose={() => !busy && onClose()}>
    {result ? <>
      <p role="status">{result.finished ? tn(result.imported, "Imported {count} item into Codex.", "Imported {count} items into Codex.") : t("The import is still running in Codex. Check again in a moment.")}</p>
      {result.failures?.length > 0 && <ul className="claude-import-failures">{result.failures.map((failure, index) => <li key={index}><strong>{claudeImportTypeLabel(failure.itemType)}</strong> {failure.message}</li>)}</ul>}
      <SourceDialogFooter><SourceSettingsButton variant="primary" data-autofocus onClick={onClose}>{t("Done")}</SourceSettingsButton></SourceDialogFooter>
    </> : <>
      <p>{t("Codex can bring over your Claude Code setup: instructions, MCP servers, skills, hooks, commands and recent sessions. Choose what to import.")}</p>
      {items === null ? <p role="status" className="claude-import-muted">{t("Looking for your Claude Code setup…")}</p>
        : items.length === 0 ? <p className="claude-import-muted">{t("Nothing to import was found.")}</p>
        : <div className="claude-import-list" role="group" aria-label={t("Items to import")}>{items.map((item) => <label key={item.index} className="claude-import-item">
            <input type="checkbox" checked={chosen.has(item.index)} disabled={busy} onChange={(event) => toggle(item.index, event.target.checked)} />
            <span><strong>{claudeImportTypeLabel(item.itemType)}</strong><span className="claude-import-muted">{item.description}</span></span>
          </label>)}</div>}
      {error && <p role="alert" className="claude-import-error">{error}</p>}
      <SourceDialogFooter><SourceSettingsButton data-autofocus disabled={busy} onClick={onClose}>{t("Cancel")}</SourceSettingsButton>
        <SourceSettingsButton variant="primary" busy={busy} disabled={!items?.length || !chosen.size} onClick={() => void run()}>{t("Import")}</SourceSettingsButton></SourceDialogFooter>
    </>}
  </ActionDialog>;
}
