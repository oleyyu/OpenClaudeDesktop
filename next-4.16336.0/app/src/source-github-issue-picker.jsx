import React, { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./icons";
import { SourceDialog } from "./source-dialog.jsx";
import { ISSUE_SEARCH_DELAY, issueKey, issuePickerState } from "./github-issue-model.mjs";
import { t } from "../electron/i18n/index.mjs";
import "./source-github-issue-picker.css";

// c7bad7a49 t (the issue state glyph): a closed issue is CheckCircle in text-git-merged; an open one a 12px
// 1.5px-ringed circle with a 4px dot in text-git-opened, in a 16px box at size sm.
export function IssueStateIcon({ closed = false }) {
  if (closed) return <Icon name="CheckCircle" size={16} className="sgi-state sgi-state--closed" aria-hidden="true" />;
  return <span aria-hidden="true" className="sgi-state-box"><span className="sgi-state sgi-state--open"><span className="sgi-state-dot" /></span></span>;
}

// K$: the state glyph, '#n' (muted) and the title, then the repository · labels footnote.
function IssueRow({ issue }) {
  return <>
    <span className="sgi-row-icon"><IssueStateIcon closed={issue.state === "closed"} /></span>
    <span className="sgi-row-text">
      <span className="sgi-row-title"><span className="sgi-muted">{`#${issue.number}`}</span>{" "}{issue.title}</span>
      <span className="sgi-row-meta">{issue.repo}{issue.labels?.length ? ` · ${issue.labels.join(", ")}` : ""}</span>
    </span>
  </>;
}

/**
 * cc43287c9 J$ + U$ (:28205-28470): the Import GitHub issue dialog. A search field (combobox, 'Search by issue number
 * or title', debounced 300ms) over the folder's open issues (gH listGhIssues through the user's gh), the list with
 * ↑/↓ and Enter from the field, and the Loading… / error / empty / no-results lines. A pick closes it.
 * load(query) → {issues, error?}.
 */
export function SourceGithubIssuePicker({ open, onClose, onSelect, load }) {
  const [input, setInput] = useState(""), [query, setQuery] = useState(""), [active, setActive] = useState(null);
  const [result, setResult] = useState({ loading: true, issues: [], error: false, query: null });
  const field = useRef(null), list = useRef(null), id = useId(), titleId = `${id}-title`;
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const timer = setTimeout(() => setQuery((current) => (current === input.trim() ? current : input.trim())), ISSUE_SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    // J$ S = isLoading || (isFetching && no rows): a refetch over an empty list reads 'Loading...' again; one over rows
    // keeps them (placeholder data, aria-busy) until the answer comes.
    setResult((current) => ({ ...current, loading: current.query === null || !current.issues.length, refreshing: true }));
    Promise.resolve(loadRef.current?.(query)).then((value) => {
      if (!live) return;
      const issues = Array.isArray(value?.issues) ? value.issues : [];
      setResult({ loading: false, refreshing: false, issues, error: !!value?.error && !issues.length, query });
    }, () => { if (live) setResult({ loading: false, refreshing: false, issues: [], error: true, query }); });
    return () => { live = false; };
  }, [open, query]);
  const state = issuePickerState({ loading: result.loading, error: result.error, issues: result.issues, query: result.query ?? "" });
  const shown = state === "list";
  // R: picks follow the list only once it answers the query typed in the field.
  const settled = shown && !result.refreshing && input.trim() === query && result.query === query;
  const index = settled && active !== null ? result.issues.findIndex((issue) => issueKey(issue) === active) : -1;
  useEffect(() => { if (index >= 0) list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" }); }, [index]);
  const pick = (issue) => { onSelect(issue); onClose(); };
  const keyDown = (event) => {
    if (event.nativeEvent.isComposing || !settled) return;
    const plain = !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && plain) {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? Math.min(index + 1, result.issues.length - 1) : Math.max(index - 1, 0);
      setActive(issueKey(result.issues[next]));
      field.current?.focus({ preventScroll: true });
    } else if (event.key === "Enter" && event.target === field.current) {
      const issue = index >= 0 ? result.issues[index] : undefined;
      if (issue && !event.repeat) { event.preventDefault(); pick(issue); }
    }
  };
  const message = (text) => <p className="sgi-message">{text}</p>;
  return (
    <SourceDialog open={open} onClose={onClose} initialFocusRef={field} className="sgi-dialog" onKeyDown={keyDown}
      title={<span id={titleId} className="sgi-title"><Icon name="Github" size={20} />{t("Import GitHub issue")}</span>}>
      <div className="sgi-body">
        <div className="sgi-search" data-cds="TextInput" data-size="sm">
          <Icon name="Search" size={16} className="sgi-search-icon" aria-hidden="true" />
          <input ref={field} type="text" autoComplete="off" spellCheck={false} className="cds-input cds-reset sgi-search-input"
            placeholder={t("Search by issue number or title")} aria-label={t("Search by issue number or title")}
            role="combobox" aria-autocomplete="list" aria-expanded={shown} aria-controls={shown ? id : undefined}
            aria-activedescendant={index >= 0 ? `${id}-opt-${index}` : undefined}
            value={input} onChange={(event) => { setInput(event.target.value); setActive(null); }} />
        </div>
        <div className="sgi-results">
          {state === "loading" ? message(t("Loading..."))
            : state === "error" ? message(t("Something went wrong. You can try again."))
            : state === "empty" ? message(t("No issues you’re involved with here. Search to find any issue."))
            : state === "no-results" ? message(t("No issues match your search."))
            : <ul ref={list} id={id} role="listbox" aria-labelledby={titleId} className="sgi-list" aria-busy={!settled}
                onMouseDown={(event) => { if (event.target !== event.currentTarget) { event.preventDefault(); field.current?.focus({ preventScroll: true }); } }}>
                {result.issues.map((issue, at) => (
                  <li key={issueKey(issue)} role="presentation">
                    <button type="button" id={`${id}-opt-${at}`} role="option" aria-selected={at === index} className="sgi-option"
                      onClick={() => pick(issue)} onFocus={() => setActive(issueKey(issue))}>
                      <IssueRow issue={issue} />
                    </button>
                  </li>
                ))}
              </ul>}
        </div>
      </div>
    </SourceDialog>
  );
}
