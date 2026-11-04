import React, { useEffect, useRef, useState } from "react";
import { ActionDialog } from "./source-session-actions.jsx";
import { SourceDialogFooter } from "./source-dialog.jsx";
// W14-code r6 R6DC-02: shared-frame Uu (E41 direct import), not the host replica.
import { CdsButton } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { SourceSegments } from "./source-segments.jsx";
import { getAssistantName, t } from "../electron/i18n/index.mjs";
import "./source-resume-dialog.css";

// 'Resume a session' (/resume, as Claude Desktop's dialog and the agents' own `resume` pickers): every session the
// running core keeps, its own CLI's or app's included (main.cjs resume-sessions → thread/list), searchable, this
// folder or all folders. Picking one adds it to the sidebar (resume-add, confirmed by thread/read) and opens it.
const IMPORTED_FROM = { cc: () => t("Imported from Claude Code"), codex: () => t("Imported from Codex"), opencode: () => t("Imported from OpenCode") };

/** 'Last active' text for a thread's updatedAt (seconds). */
export function resumeActivityLabel(seconds, now = Date.now()) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const minutes = Math.max(0, Math.round((now - seconds * 1000) / 60000));
  if (minutes < 1) return t("Just now");
  if (minutes < 60) return t("{count}m ago", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("{count}h ago", { count: hours });
  const days = Math.round(hours / 24);
  if (days < 30) return t("{count}d ago", { count: days });
  return new Date(seconds * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const folderName = (cwd) => (typeof cwd === "string" && cwd ? cwd.replace(/\/+$/, "").split("/").pop() || cwd : "");

// fullText: the core also searches what was said (Codex thread/search): a match shows the conversation snippet.
export function SourceResumeDialog({ desktopCall, cwd = "", initialQuery = "", fullText = false, onOpened, onClose, ...dialog }) {
  const [query, setQuery] = useState(initialQuery), [scope, setScope] = useState(cwd ? "folder" : "all");
  const [rows, setRows] = useState(null), [cursor, setCursor] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(""), [loadingMore, setLoadingMore] = useState(false);
  const request = useRef(0), searchRef = useRef(null);
  const load = async ({ more = false } = {}) => {
    const id = ++request.current;
    if (more) setLoadingMore(true); else { setRows(null); setError(""); }
    try {
      const value = await desktopCall("resume-sessions", { searchTerm: query.trim() || undefined, cwd: scope === "folder" && cwd ? cwd : undefined, cursor: more ? cursor : undefined });
      if (id !== request.current) return;
      const data = Array.isArray(value?.data) ? value.data : [];
      setRows((current) => (more ? [...(current ?? []), ...data] : data));
      setCursor(value?.nextCursor ?? null);
    } catch (failure) {
      if (id === request.current) { setRows((current) => current ?? []); setError(failure?.message || String(failure)); }
    } finally { if (id === request.current) setLoadingMore(false); }
  };
  // A new query or scope lists again, a moment after the last keystroke.
  useEffect(() => { const timer = setTimeout(() => void load(), query ? 250 : 0); return () => clearTimeout(timer); }, [query, scope]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = async (row) => {
    if (busy) return;
    setBusy(row.id); setError("");
    try { await desktopCall("resume-add", { threadId: row.id }); onOpened?.(row.id); }
    catch (failure) { setError(failure?.message || String(failure)); setBusy(""); }
  };
  const core = getAssistantName();
  return <ActionDialog {...dialog} title={t("Resume a session")} size="md" className="resume-dialog" initialFocusRef={searchRef} onClose={() => !busy && onClose()}>
    <p className="resume-intro">{t("Sessions {core} keeps on this Mac, including ones you started in its own app or terminal.", { core })}</p>
    <div className="resume-controls">
      <input ref={searchRef} type="search" data-cds="TextInput" className="cds-input cds-reset resume-search" aria-label={t("Search sessions")} placeholder={fullText ? t("Search titles and conversations") : t("Search by title or folder")}
        value={query} spellCheck={false} autoComplete="off" onChange={(event) => setQuery(event.target.value)} />
      {cwd && <SourceSegments label={t("Which sessions")} value={scope} onChange={setScope}
        options={[{ value: "folder", label: t("This folder") }, { value: "all", label: t("All folders") }]} />}
    </div>
    <div className="resume-list" role="list" aria-label={t("Sessions")} aria-busy={rows === null || undefined}>
      {rows === null ? <p role="status" className="resume-muted">{t("Loading sessions…")}</p>
        : rows.length === 0 ? <p className="resume-muted">{query.trim() ? t("No sessions match your search.") : t("No sessions yet.")}</p>
        : rows.map((row) => <button key={row.id} type="button" role="listitem" className="resume-row" data-resume-id={row.id} data-added={row.added || undefined}
            disabled={!!busy} aria-busy={busy === row.id || undefined} onClick={() => void open(row)}>
            <span className="resume-title">{row.name || row.preview || t("Untitled session")}</span>
            {row.snippet && <span className="resume-snippet"><bdi>{row.snippet}</bdi></span>}
            <span className="resume-meta">
              {row.cwd && <span className="resume-folder" title={row.cwd}>{folderName(row.cwd)}</span>}
              {row.updatedAt && <span>{resumeActivityLabel(row.updatedAt)}</span>}
              {row.importedFrom && IMPORTED_FROM[row.importedFrom] && <span className="resume-badge">{IMPORTED_FROM[row.importedFrom]()}</span>}
              {row.added && <span className="resume-badge">{t("In the sidebar")}</span>}
            </span>
          </button>)}
      {cursor && rows?.length > 0 && <CdsButton size="sm" variant="ghost" className="resume-more" busy={loadingMore} disabled={loadingMore} onClick={() => void load({ more: true })}>{t("Show more")}</CdsButton>}
    </div>
    {error && <p role="alert" className="resume-error">{error}</p>}
    <SourceDialogFooter><CdsButton disabled={!!busy} onClick={onClose}>{t("Cancel")}</CdsButton></SourceDialogFooter>
  </ActionDialog>;
}
