import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionDialog } from "./source-session-actions.jsx";
import { CdsBadge, CdsButton, CdsCheckbox, CdsIcon, CdsSpinner } from "./cds-core.mjs";
import { SourceBrandLogo } from "./source-brand-logo.jsx";
import { ALL_SOURCES, folderName, groupSessions, importWarnings, messageCountLabel, newImportJobId, pageLoadId, previewRows,
  relativeTimeLabel, sessionTime, sessionTitle, sourceFilters, sourceLabel } from "./import-history-model.mjs";
import { t, tn } from "../electron/i18n/index.mjs";
import "./source-import-history.css";

// Import history (U-NAV-IMPORT, the sidebar's Import history row): the conversations other coding agents keep on this
// Mac (Claude Code, Codex, DeepSeek Harness, Gemini CLI, OpenCode, …; main's desktop:call "chat-import", electron/
// chat-import) in one dialog: sources on the left, the conversations by day in the middle (searchable, each with a
// checkbox), the focused one read-only on the right. Import brings every checked conversation into the running core, one
// after another, each as a new session (main picks the strategy: the core's own import, injected history, or a text
// handoff); nothing is imported until the button is pressed and the originals are only read.
const PAGE = 200;
const text = (value) => (typeof value === "string" ? value : "");
const failureText = (failure) => text(failure?.message).replace(/^Error invoking remote method '[^']*': (Error: )?/, "") || String(failure);
/** "Claude Code" → "CC", "Codex" → "Co": the source tile's letters. */
export function sourceInitials(label) {
  const words = text(label).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).replace(/^./, (first) => first.toUpperCase());
}
/** The keys of conversations some session here was imported from (sessionMetadata[*].importedFrom). */
export function importedKeys(sessionMetadata) {
  const keys = new Set();
  for (const entry of Object.values(sessionMetadata && typeof sessionMetadata === "object" ? sessionMetadata : {})) {
    const from = entry?.importedFrom;
    if (text(from?.source) && text(from?.sourceId)) keys.add(`${from.source}:${from.sourceId}`);
  }
  return keys;
}

// Each source's own logo (brand-logos.mjs, the tiles Settings › Cores draws); one without a logo gets its initials.
export const SOURCE_BRANDS = Object.freeze({ codex: "codex", "claude-code": "claudecode", dsh: "deepseek", gemini: "geminicli", opencode: "opencode", mimo: "mimo",
  grok: "grok", kimi: "kimi", qwen: "qwen", minimax: "minimax", zcode: "zai", copilot: "githubcopilot", cursor: "cursor" });
function SourceTile({ source, label, small = false }) {
  const brand = Object.hasOwn(SOURCE_BRANDS, source) ? SOURCE_BRANDS[source] : null;
  if (brand) return <SourceBrandLogo brand={brand} size={small ? 16 : 24} className="ih-logo" />;
  return <span className="ih-tile" data-small={small || undefined} aria-hidden="true">{sourceInitials(label)}</span>;
}

function Preview({ focus, preview, sources }) {
  if (!focus) return <div className="ih-empty"><CdsIcon name="Chats" size="lg" /><p>{t("Select a conversation to preview it.")}</p></div>;
  const session = preview?.session ?? focus;
  const rows = preview?.rows ?? null;
  const meta = [sourceLabel(session.source, sources), folderName(session.cwd), relativeTimeLabel(sessionTime(session)), messageCountLabel(session.messageCount), text(session.model)].filter(Boolean);
  return <>
    <header className="ih-preview-head">
      <SourceTile source={session.source} label={sourceLabel(session.source, sources)} />
      <div className="ih-preview-title"><strong title={sessionTitle(session, 400)}>{sessionTitle(session)}</strong>
        <span className="ih-meta">{meta.map((part, index) => <span key={index}>{part}</span>)}</span></div>
    </header>
    <div className="ih-preview-scroll" role="region" aria-label={t("Conversation preview")} tabIndex={0}>
      {preview?.error ? <p role="alert" className="ih-error">{preview.error}</p>
        : rows === null ? <div className="ih-empty"><CdsSpinner size="md" /><p role="status">{t("Loading preview…")}</p></div>
        : rows.length === 0 ? <div className="ih-empty"><p>{t("Nothing to preview in this conversation.")}</p></div>
        : <>{rows.map((row) => row.kind === "tool" ? <p key={row.id} className="ih-tool"><CdsIcon name="Wrench" size="xs" /><span>{row.text}</span></p>
            : row.kind === "note" ? <p key={row.id} className="ih-note">{row.text}</p>
            : <div key={row.id} className="ih-bubble" data-kind={row.kind}><bdi>{row.text}</bdi></div>)}
          {preview.truncated && <p className="ih-note">{t("The preview shows the beginning of this conversation. Long conversations are trimmed to their most recent part for the model.")}</p>}</>}
    </div>
  </>;
}

export function ImportHistoryDialog({ desktopCall, coreLabel = "", sessionMetadata = null, onImported, onOpenThread, onImportSettings = null, onClose, ...dialog }) {
  const core = coreLabel || t("The core");
  const [sources, setSources] = useState([]), [filter, setFilter] = useState(ALL_SOURCES), [query, setQuery] = useState("");
  const [list, setList] = useState(null), [loadingMore, setLoadingMore] = useState(false), [error, setError] = useState("");
  // key → the session's summary: a selection outlives the filter and the search it was made under.
  const [selected, setSelected] = useState(() => new Map());
  const [focus, setFocus] = useState(null), [preview, setPreview] = useState(null);
  // The import run: {order: [session], status: {key: 'waiting'|'running'|'done'|'failed'}, results, errors, finished}.
  const [run, setRun] = useState(null);
  const request = useRef(0), previews = useRef(new Map()), stop = useRef(false), searchRef = useRef(null);
  const already = useMemo(() => {
    const keys = importedKeys(sessionMetadata);
    for (const [key, state] of Object.entries(run?.status ?? {})) if (state === "done") keys.add(key);
    return keys;
  }, [sessionMetadata, run]);
  const busy = !!run && !run.finished;

  useEffect(() => {
    let live = true;
    Promise.resolve(desktopCall("chat-import", { op: "sources" })).then((rows) => { if (live) setSources(Array.isArray(rows) ? rows : []); }, () => {});
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async ({ more = false } = {}) => {
    const id = ++request.current;
    if (more) setLoadingMore(true); else { setList(null); setError(""); }
    try {
      const value = await desktopCall("chat-import", { op: "list", limit: PAGE, ...(more ? { offset: list?.sessions.length ?? 0 } : {}),
        ...(filter !== ALL_SOURCES ? { sources: [filter] } : {}), ...(query.trim() ? { query: query.trim() } : {}) });
      if (id !== request.current) return;
      const sessions = Array.isArray(value?.sessions) ? value.sessions : [];
      setList((current) => ({ sessions: more ? [...(current?.sessions ?? []), ...sessions] : sessions, total: value?.total ?? sessions.length,
        counts: value?.counts ?? {}, hasMore: value?.hasMore === true }));
    } catch (failure) {
      if (id === request.current) { setList((current) => current ?? { sessions: [], total: 0, counts: {}, hasMore: false }); setError(failureText(failure)); }
    } finally { if (id === request.current) setLoadingMore(false); }
  }, [desktopCall, filter, query, list]);
  // A new search or source lists again, a moment after the last keystroke.
  useEffect(() => { const timer = setTimeout(() => void load(), query ? 250 : 0); return () => clearTimeout(timer); }, [query, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // The focused conversation's preview: asked once per conversation, kept for the dialog's life.
  useEffect(() => {
    if (!focus) { setPreview(null); return undefined; }
    const known = previews.current.get(focus.key);
    if (known) { setPreview(known); return undefined; }
    let live = true;
    setPreview(null);
    Promise.resolve(desktopCall("chat-import", { op: "preview", key: focus.key })).then((value) => {
      const answer = { key: focus.key, session: value?.session ?? focus, rows: previewRows(value?.turns), truncated: value?.truncated === true };
      previews.current.set(focus.key, answer);
      if (live) setPreview(answer);
    }, (failure) => { if (live) setPreview({ key: focus.key, session: focus, rows: [], error: failureText(failure) }); });
    return () => { live = false; };
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  const sessions = list?.sessions ?? [];
  const groups = useMemo(() => groupSessions(sessions), [sessions]);
  const filters = useMemo(() => sourceFilters(sources, list?.counts ?? {}), [sources, list]);
  // Select all covers what is listed and not yet here; a conversation already imported is only picked by its own box.
  const selectable = useMemo(() => sessions.filter((session) => !already.has(session.key)), [sessions, already]);
  const shownSelected = selectable.filter((session) => selected.has(session.key)).length;
  const toggle = (session, on) => setSelected((current) => { const next = new Map(current); if (on) next.set(session.key, session); else next.delete(session.key); return next; });
  const toggleAll = (on) => setSelected((current) => { const next = new Map(current); for (const session of selectable) { if (on) next.set(session.key, session); else next.delete(session.key); } return next; });

  const start = async () => {
    const order = [...selected.values()];
    if (!order.length || busy) return;
    stop.current = false;
    const status = Object.fromEntries(order.map((session) => [session.key, "waiting"])), results = {}, errors = {};
    const publish = (finished = false) => setRun({ order, status: { ...status }, results: { ...results }, errors: { ...errors }, finished });
    publish();
    for (const session of order) {
      if (stop.current) break;
      status[session.key] = "running"; publish();
      try {
        const result = await desktopCall("chat-import", { op: "import", key: session.key, jobId: newImportJobId(), pageLoad: pageLoadId() });
        if (!text(result?.threadId)) throw new Error(text(result?.message) || t("The conversation couldn’t be imported."));
        results[session.key] = result; status[session.key] = "done";
        onImported?.(result);
      } catch (failure) { errors[session.key] = failureText(failure); status[session.key] = "failed"; }
      publish();
    }
    for (const session of order) if (status[session.key] === "waiting") delete status[session.key];
    publish(true);
    setSelected((current) => { const next = new Map(current); for (const session of order) if (status[session.key] === "done") next.delete(session.key); return next; });
    const done = order.filter((session) => status[session.key] === "done");
    // One conversation, imported cleanly: straight into it.
    if (order.length === 1 && done.length === 1 && !importWarnings(results[done[0].key], core).length) onOpenThread?.(results[done[0].key].threadId);
  };

  const ran = run?.order.filter((session) => run.status[session.key]) ?? [];
  const doneCount = ran.filter((session) => run.status[session.key] === "done").length;
  const failedCount = ran.filter((session) => run.status[session.key] === "failed").length;
  const settled = doneCount + failedCount;

  return <ActionDialog {...dialog} title={t("Import history")} size="2xl" className="import-history-dialog" initialFocusRef={searchRef}
    description={t("Pick conversations from other coding agents on this Mac and continue them in {core}. The originals are not changed.", { core })}
    onClose={() => !busy && onClose()}>
    <div className="ih-body" data-view={run ? "run" : "pick"}>
      {run ? <section className="ih-run" aria-label={t("Import results")}>
        <header className="ih-run-head">
          {busy ? <CdsSpinner size="md" /> : <span className="ih-run-mark" data-state={failedCount && !doneCount ? "failed" : "done"}><CdsIcon name={failedCount && !doneCount ? "Warning" : "Check"} size="md" /></span>}
          <div><strong role="status">{busy ? t("Importing {done} of {total}…", { done: Math.min(settled + 1, run.order.length), total: run.order.length })
            : doneCount ? tn(doneCount, "Imported {count} conversation into {core}", "Imported {count} conversations into {core}", { core }) : t("Nothing was imported")}</strong>
            <span className="ih-meta">{busy ? t("Each conversation becomes a new session. You can keep this window open while it works.")
              : failedCount ? tn(failedCount, "{count} conversation couldn’t be imported.", "{count} conversations couldn’t be imported.") : t("They are in the sidebar now.")}</span></div>
          <div className="ih-progress" role="progressbar" aria-valuemin={0} aria-valuemax={run.order.length} aria-valuenow={settled}><span style={{ width: `${run.order.length ? (settled / run.order.length) * 100 : 0}%` }} /></div>
        </header>
        <ul className="ih-run-list">{run.order.map((session) => {
          const state = run.status[session.key] ?? "skipped", result = run.results[session.key];
          const notes = state === "done" ? importWarnings(result, core) : state === "failed" ? [run.errors[session.key]] : [];
          return <li key={session.key} className="ih-run-row" data-state={state}>
            <span className="ih-run-state">{state === "running" ? <CdsSpinner size="sm" /> : state === "done" ? <CdsIcon name="CheckCircle" size="sm" />
              : state === "failed" ? <CdsIcon name="WarningCircle" size="sm" /> : <CdsIcon name="Circle" size="sm" />}</span>
            <SourceTile small source={session.source} label={sourceLabel(session.source, sources)} />
            <span className="ih-run-text"><span className="ih-title">{sessionTitle(session)}</span>
              <span className="ih-meta"><span>{state === "running" ? t("Importing…") : state === "waiting" ? t("Waiting") : state === "skipped" ? t("Not imported") : sourceLabel(session.source, sources)}</span></span>
              {notes.map((note, index) => <span key={index} className={state === "failed" ? "ih-run-note ih-error" : "ih-run-note"}>{note}</span>)}</span>
            {state === "done" && <CdsButton size="sm" variant="secondary" disabled={busy} onClick={() => onOpenThread?.(result.threadId)}>{t("Open")}</CdsButton>}
          </li>;
        })}</ul>
      </section> : <>
        <nav className="ih-sources" aria-label={t("Sources")}>
          {filters.map((entry) => <button key={entry.value} type="button" className="ih-source" aria-pressed={filter === entry.value} onClick={() => setFilter(entry.value)}>
            {entry.value === ALL_SOURCES ? <span className="ih-tile" aria-hidden="true"><CdsIcon name="Grid" size="sm" /></span> : <SourceTile source={entry.value} label={entry.label} />}
            <span className="ih-source-name">{entry.label}</span>
            {entry.experimental && <span className="sr-only">{t("Experimental")}</span>}
            <span className="ih-count">{list ? entry.count : ""}</span>
          </button>)}
        </nav>
        <section className="ih-list-pane" aria-label={t("Conversations")}>
          <div className="ih-toolbar">
            {/* No <label> here: .session-action-dialog label stacks its children (source-session-actions.css). */}
            <div className="ih-search" onClick={() => searchRef.current?.focus()}><CdsIcon name="Search" size="sm" />
              <input ref={searchRef} type="search" aria-label={t("Search conversations")} placeholder={t("Search conversations…")} value={query} spellCheck={false} autoComplete="off"
                onChange={(event) => setQuery(event.target.value)} /></div>
            <div className="ih-select-all">
              <span className="ih-select-all-box"><CdsCheckbox size="sm" aria-label={t("Select all")} disabled={!selectable.length} checked={selectable.length > 0 && shownSelected === selectable.length}
                indeterminate={shownSelected > 0 && shownSelected < selectable.length} onCheckedChange={(on) => toggleAll(on === true)} />
                <span aria-hidden="true" onClick={() => selectable.length && toggleAll(shownSelected !== selectable.length)}>{t("Select all")}</span></span>
              <span className="ih-meta">{list ? tn(list.total, "{count} conversation", "{count} conversations") : ""}</span>
            </div>
          </div>
          <div className="ih-list" aria-busy={list === null || undefined}>
            {list === null ? <div className="ih-empty"><CdsSpinner size="md" /><p role="status">{t("Looking for conversations on this Mac…")}</p></div>
              : sessions.length === 0 ? <div className="ih-empty"><CdsIcon name="Chats" size="lg" />
                  <p>{query.trim() ? t("No conversations match “{search}”", { search: query.trim() }) : filter !== ALL_SOURCES ? t("No conversations from this source.") : t("No conversations found")}</p></div>
              : groups.map((group) => <div key={group.key} role="group" aria-label={group.label}>
                  <h3 className="ih-group">{group.label}</h3>
                  {group.sessions.map((session) => {
                    const title = sessionTitle(session), label = sourceLabel(session.source, sources);
                    return <div key={session.key} className="ih-row" data-import-key={session.key} data-focused={focus?.key === session.key || undefined} data-selected={selected.has(session.key) || undefined}>
                      <CdsCheckbox size="sm" aria-label={t("Select “{title}”", { title })} checked={selected.has(session.key)} onCheckedChange={(on) => toggle(session, on === true)} />
                      <button type="button" className="ih-row-main" aria-current={focus?.key === session.key || undefined} onClick={() => setFocus(session)}>
                        <span className="ih-title">{title}</span>
                        <span className="ih-meta"><SourceTile small source={session.source} label={label} /><span>{label}</span>
                          {session.cwd && <span className="ih-folder" title={session.cwd}>{folderName(session.cwd)}</span>}
                          <span>{relativeTimeLabel(sessionTime(session))}</span>
                          {already.has(session.key) && <CdsBadge variant="neutral" size="sm">{t("Imported")}</CdsBadge>}</span>
                      </button>
                    </div>;
                  })}
                </div>)}
            {list?.hasMore && <CdsButton size="sm" variant="ghost" className="ih-more" busy={loadingMore} disabled={loadingMore} onClick={() => void load({ more: true })}>{t("Show more")}</CdsButton>}
          </div>
        </section>
        <section className="ih-preview"><Preview focus={focus} preview={preview?.key === focus?.key ? preview : null} sources={sources} /></section>
      </>}
    </div>
    {error && !run && <p role="alert" className="ih-error ih-alert">{error}</p>}
    <footer className="ih-footer">
      {run ? <>
        <span className="ih-footer-note" />
        {busy ? <CdsButton disabled={stop.current} onClick={() => { stop.current = true; setRun((current) => ({ ...current })); }}>{t("Stop after this one")}</CdsButton>
          : <><CdsButton onClick={() => setRun(null)}>{t("Import more")}</CdsButton>
            <CdsButton variant="primary" data-autofocus onClick={onClose}>{t("Done")}</CdsButton></>}
      </> : <>
        <span className="ih-footer-note">
          {onImportSettings && <CdsButton variant="ghost" size="sm" icon="Settings" onClick={onImportSettings}>{t("Import Claude Code settings…")}</CdsButton>}
          {selected.size > 0 && <><span role="status">{tn(selected.size, "{count} selected", "{count} selected")}</span>
            <CdsButton variant="ghost" size="sm" onClick={() => setSelected(new Map())}>{t("Clear")}</CdsButton></>}
        </span>
        <CdsButton onClick={onClose}>{t("Cancel")}</CdsButton>
        <CdsButton variant="primary" disabled={!selected.size} onClick={() => void start()}>
          {selected.size ? tn(selected.size, "Import {count} conversation", "Import {count} conversations") : t("Import")}</CdsButton>
      </>}
    </footer>
  </ActionDialog>;
}
