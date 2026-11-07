// Files the agent hands over (the DeepSeek core's `present` tool, deliverables/presented; the official
// client/ui-deliverables cards): one card per file, Open in its default app and Show in Finder (scoped to the
// session's folder by main.cjs open-tool-file / reveal-tool-file).
import React, { useState } from "react";
import { pathBasename } from "./host-path-model.mjs";
import { revealFileLabel } from "./file-manager-labels.mjs";
import { Icon } from "./icons";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { fileKindIcon } from "./file-kind-icon.mjs";
import "./source-deliverables.css";
import { t } from "../electron/i18n/index.mjs";
import { itemDeliverables } from "./deliverable-records.mjs";
export { itemDeliverables } from "./deliverable-records.mjs";

const baseName = (file) => pathBasename(String(file ?? "")) || String(file ?? "");


export function SourceDeliverables({ item, sessionKey, failed = false }) {
  const files = itemDeliverables(item) ?? [];
  const [error, setError] = useState("");
  const act = (operation, path) => {
    setError("");
    Promise.resolve(window.desktop?.call?.(operation, { sessionId: sessionKey, path })).catch((reason) => setError(reason?.message || String(reason)));
  };
  return <div className="source-message sdl-root" data-transcript-item-id={item.id} data-deliverables="" role="group" aria-label={t("Files from this turn")}>
    {files.map((file) => <div key={file.path} className="sdl-card" data-deliverable={file.path}>
      <span className="sdl-icon" aria-hidden="true"><Icon name={fileKindIcon(file.path)} size={20} /></span>
      <span className="sdl-copy">
        <span className="sdl-name" title={file.path}>{baseName(file.path)}</span>
        <span className="sdl-description">{file.description || file.path}</span>
      </span>
      {!failed && sessionKey && <span className="sdl-actions">
        <SourceSettingsButton size="sm" variant="secondary" onClick={() => act("open-tool-file", file.path)}>{t("Open")}</SourceSettingsButton>
        <SourceSettingsButton size="sm" variant="ghost" icon="Folder" iconSize={16} iconOnly aria-label={revealFileLabel(baseName(file.path))}
          onClick={() => act("reveal-tool-file", file.path)} />
      </span>}
    </div>)}
    {error && <p role="alert" className="sdl-error">{error}</p>}
  </div>;
}

/**
 * Artifacts a core attaches to a finished tool call (Qwen's _meta.artifacts: files it wrote or recorded, links such as
 * a pull request): a file card opens the file, a link card opens the page.
 */
export function SourceArtifacts({ artifacts = [], sessionKey }) {
  const [error, setError] = useState("");
  const list = (Array.isArray(artifacts) ? artifacts : []).filter((entry) => typeof entry?.path === "string" || typeof entry?.url === "string");
  if (!list.length) return null;
  const act = (operation, params) => {
    setError("");
    Promise.resolve(window.desktop?.call?.(operation, params)).catch((reason) => setError(reason?.message || String(reason)));
  };
  return <div className="sdl-root sdl-artifacts" data-artifacts="" role="group" aria-label={t("Artifacts")}>
    {list.map((entry) => <div key={entry.path ?? entry.url} className="sdl-card" data-artifact-kind={entry.kind}>
      <span className="sdl-icon" aria-hidden="true"><Icon name={entry.url ? "Link" : fileKindIcon(entry.path)} size={20} /></span>
      <span className="sdl-copy">
        <span className="sdl-name" title={entry.path ?? entry.url}>{entry.title || baseName(entry.path ?? entry.url)}</span>
        <span className="sdl-description">{entry.url ?? entry.path}</span>
      </span>
      <span className="sdl-actions">
        {entry.url
          ? <SourceSettingsButton size="sm" variant="secondary" onClick={() => act("external", { url: entry.url })}>{t("Open link")}</SourceSettingsButton>
          : sessionKey && <>
            <SourceSettingsButton size="sm" variant="secondary" onClick={() => act("open-tool-file", { sessionId: sessionKey, path: entry.path })}>{t("Open")}</SourceSettingsButton>
            <SourceSettingsButton size="sm" variant="ghost" icon="Folder" iconSize={16} iconOnly aria-label={revealFileLabel(baseName(entry.path))}
              onClick={() => act("reveal-tool-file", { sessionId: sessionKey, path: entry.path })} />
          </>}
      </span>
    </div>)}
    {error && <p role="alert" className="sdl-error">{error}</p>}
  </div>;
}
