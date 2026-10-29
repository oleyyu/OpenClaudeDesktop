import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { holdModalInert } from "./modal-inert.mjs";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { SourceSpinner } from "./source-pane-states.jsx";
import { hasPendingApproval } from "./state.js";
import { sessionArchived, sessionName, sessionState, sessionUpdatedAt } from "./sidebar-model";
import {
  EMPTY_PALETTE_FILTERS, PALETTE_DATES, PALETTE_RECENTS, PALETTE_TYPES, filterPaletteActions, hasPaletteFilters, matchRanges, paletteActionGroups,
  movePaletteSelection, paletteMode, palettePlaceholder, paletteProjects, paletteRelativeTime, paletteSessions, stepPaletteType,
} from "./sidebar-palette-model.mjs";
import { t, tn } from "../electron/i18n/index.mjs";
import "./source-sidebar-palette.css";

/*
 * ⌘K / ⇧⌘K command palette (2.2553.1 c2771e1f6-v15xXKAc.js vm CommandPaletteBody in shared-22 XP), opened by
 * the sidebar Search button (sidebar-groups.js:5352-5377 _w, search mode). XP: a modal popup portalled to the
 * body, centred at --cp-top (desktop HP: clear of the titlebar, then clamp to 15vh / 25vh), max-w-2xl,
 * bg-surface-3 rounded-xl border-0.5 border-strong shadow-2xl, zoom/fade 50ms in and hidden at once on close.
 * vm: the input row (mode chip hu, the combobox field, the 'Searching deeper...' spinner slot and the ghost X
 * Gp), the Pu type tabs in search mode, a 0.5px rule, the grouped listbox (gd rows: px-3 py-2 rounded-lg, the
 * selected row bg-fill-ghost-hover with an ArrowReturn in place of its time) and the qp footer key hints.
 * Local adaptations: one-line input (the source's textarea grows for long compose text); the date filter is a
 * chip row next to the type tabs instead of the typed filter words; there are no chats, tasks, scheduled runs or
 * artifacts to search, so the types are Sessions and Projects.
 */

const PORTAL_ATTRIBUTES = ["data-cds-theme", "data-density", "data-font", "data-platform"];
function portalAttributes() {
  const root = typeof document === "undefined" ? null : document.documentElement, result = {};
  for (const name of PORTAL_ATTRIBUTES) {
    const value = root?.getAttribute(name);
    if (value != null) result[name] = value;
  }
  return result;
}

/** ra variant bold: the matched ranges of a title in bold. */
function Highlighted({ text, query }) {
  const ranges = matchRanges(text, query);
  if (!ranges.length) return text;
  const parts = [];
  let at = 0;
  ranges.forEach(([start, end], index) => {
    if (start > at) parts.push(text.slice(at, start));
    parts.push(<strong key={index} className="spal-match">{text.slice(start, end)}</strong>);
    at = end;
  });
  if (at < text.length) parts.push(text.slice(at));
  return parts;
}

/** _a small / Lu: keycaps with a transparent fill and a 0.5px border. */
function Keys({ keys }) {
  return <span className="spal-keys" aria-hidden="true">{keys.map((key) => <kbd key={key}>{key}</kbd>)}</span>;
}

/** fd: the row's trailing slot, the ArrowReturn glyph while selected (accent badge on a ready send row). */
function Trailing({ selected, accent = false, children }) {
  if (selected) return <span className="spal-trailing">{accent
    ? <span className="spal-return-badge"><Icon name="ArrowReturn" size={16} /></span>
    : <Icon name="ArrowReturn" size={16} />}</span>;
  return <span className="spal-trailing">{children}</span>;
}

/** hd: the 20px glyph with a status dot (awaiting / running / unread) at its top right. */
function Glyph({ name, dot }) {
  return <span className="spal-glyph"><Icon name={name} size={20} />{dot && <span className="spal-dot"><span className="status-dot" data-kind={dot} /></span>}</span>;
}

const DOT_LABELS = { awaiting: "Awaiting input", running: "Running", ready: "Unread response" };

export function SourceSidebarPalette({
  open, entry = "default", onClose, query = "", setQuery, sessions = [], folders = [], contentMatches = null, deepSearch = false,
  state = {}, metadata = {}, actions = [], onOpenSession, onStartSession, onNew, onProject,
  // inline: render in place instead of portalling to the body (server-rendered tests).
  inline = false,
  // surface: the sidebar mode (V3-w13-surfaces-shortcuts, the placeholder's chat copy off Code).
  surface = "code",
}) {
  const [mode, setMode] = useState(() => paletteMode(entry));
  const [filters, setFilters] = useState(EMPTY_PALETTE_FILTERS);
  const [selected, setSelected] = useState(0);
  const [deeper, setDeeper] = useState(false);
  const input = useRef(null), popup = useRef(null), list = useRef(null), opener = useRef(null);
  const listId = useId();
  const now = Date.now();
  // sw n("search"): ⇧⌘K on an open palette switches it to search mode.
  useEffect(() => { if (open) setMode(paletteMode(entry)); }, [open, entry]);
  useEffect(() => { if (!open) { setFilters(EMPTY_PALETTE_FILTERS); setMode("default"); } }, [open]);

  // XP is modal: #root goes inert, focus starts in the field and returns to the opener on close.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const doc = document;
    opener.current = doc.activeElement;
    const release = holdModalInert(doc.getElementById("root"));
    input.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(frame);
      release();
      const target = opener.current, now = doc.activeElement;
      const lost = !now || now === doc.body || !now.isConnected || popup.current?.contains(now);
      if (lost && target?.isConnected && target !== doc.body && !target.closest("[inert]")) target.focus({ preventScroll: true });
    };
  }, [open]);

  // 'Searching deeper...' (hn): a core's full-text search runs a moment after the last keystroke; the
  // spinner shows until its matches arrive (or a few seconds pass without them).
  const term = query.trim();
  useEffect(() => {
    if (!open || !deepSearch || term.length < 2 || contentMatches) { setDeeper(false); return undefined; }
    setDeeper(true);
    const timer = setTimeout(() => setDeeper(false), 4000);
    return () => clearTimeout(timer);
  }, [open, deepSearch, term, contentMatches]);

  const marks = (session) => hasPendingApproval(state, session.id) ? "awaiting"
    : sessionState(session, state) === "working" ? "running" : metadata[session.id]?.unread ? "ready" : undefined;
  const sessionItem = (session) => ({ kind: "session", id: `session:${session.id}`, session, run: () => onOpenSession?.(session.id) });
  const projectItem = (project) => ({ kind: "project", id: `project:${project.cwd}`, project, run: () => onProject?.(project.cwd) });
  const actionItem = (action) => ({ kind: "action", id: `action:${action.id}`, action, run: action.run });
  const sendItem = { kind: "send", id: "send", run: () => (term && onStartSession ? onStartSession(term) : onNew?.()) };

  const groups = useMemo(() => {
    // c2771e1f6 :3592-3598: Actions mode lists the commands under their registry groups (Navigation, Session, …).
    if (mode === "actions") return paletteActionGroups(filterPaletteActions(actions, query)).map((group) => ({ ...group, items: group.items.map(actionItem) }));
    if (mode === "search") {
      const result = [];
      if (filters.type !== "project") result.push({ id: "sessions", title: t("Sessions"),
        items: paletteSessions({ sessions, query, contentMatches, filters, includeArchived: true, now, limit: 50 }).map(sessionItem) });
      if (filters.type !== "session") result.push({ id: "projects", title: t("Projects"),
        items: paletteProjects({ folders, sessions, query, filters, now }).slice(0, filters.type === "project" ? 50 : 5).map(projectItem) });
      return result.filter((group) => group.items.length > 0);
    }
    const quick = { id: "quick", title: t("Quick actions"), items: [sendItem] };
    if (!term) return [quick, { id: "recents", title: t("Recents"), toSearch: true,
      items: paletteSessions({ sessions, now, limit: PALETTE_RECENTS }).map(sessionItem) }].filter((group) => group.items.length > 0);
    const matchedActions = filterPaletteActions(actions, query).slice(0, 5).map(actionItem);
    return [
      ...(matchedActions.length ? [{ id: "actions", title: t("Actions"), toActions: true, items: matchedActions }] : []),
      quick,
      { id: "sessions", title: t("Sessions"), items: paletteSessions({ sessions, query, contentMatches, includeArchived: true, now, limit: 20 }).map(sessionItem) },
      { id: "projects", title: t("Projects"), items: paletteProjects({ folders, sessions, query, now }).slice(0, 5).map(projectItem) },
    ].filter((group) => group.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, query, filters, sessions, folders, contentMatches, actions, state, metadata, onStartSession]);
  const items = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const count = items.length;
  useEffect(() => { setSelected(0); }, [mode, query, filters]);
  const current = Math.min(selected, count - 1);
  useEffect(() => {
    const node = current >= 0 && list.current?.querySelector(`[data-palette-index="${current}"]`);
    node?.scrollIntoView?.({ block: "nearest" });
  }, [current]);

  if (!open || (!inline && typeof document === "undefined")) return null;

  const close = () => onClose?.();
  const activate = (item) => { if (!item) return; close(); item.run?.(); };
  const resultCount = items.filter((item) => item.kind === "session" || item.kind === "project").length;
  const filtered = hasPaletteFilters(filters);
  const empty = count === 0;
  const onKeyDown = (event) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (["ArrowDown", "ArrowUp"].includes(event.key) && !event.metaKey && !event.altKey) {
      event.preventDefault();
      setSelected(movePaletteSelection(current, count, event.key));
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!event.repeat) activate(items[current]); return; }
    // vm Tab: into Actions mode (the footer's 'Actions Tab' hint); the field keeps focus otherwise.
    if (event.key === "Tab") { event.preventDefault(); if (!event.shiftKey && mode !== "actions") setMode("actions"); return; }
    // Backspace on an empty field leaves Actions mode (I), or drops the last filter in search mode.
    if ((event.key === "Backspace" || event.key === "Delete") && query === "" && !event.repeat) {
      if (mode === "actions") { event.preventDefault(); setMode("default"); }
      else if (mode === "search" && filtered) { event.preventDefault(); setFilters((value) => value.date !== null ? { ...value, date: null } : { ...value, type: null }); }
      return;
    }
    // Pu ←/→ on an empty field: the next type tab.
    if (mode === "search" && query === "" && (event.key === "ArrowLeft" || event.key === "ArrowRight") && !event.metaKey && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      setFilters((value) => ({ ...value, type: stepPaletteType(value.type, event.key === "ArrowRight" ? 1 : -1) }));
    }
  };

  const renderItem = (item, index) => {
    const isSelected = index === current;
    const common = { type: "button", role: "option", "aria-selected": isSelected, tabIndex: -1, id: `${listId}-${index}`,
      "data-palette-index": index, "data-item-type": item.kind, className: "spal-row" + (isSelected ? " is-selected" : ""),
      onMouseDown: (event) => event.preventDefault(), onMouseMove: () => { if (!isSelected) setSelected(index); }, onClick: () => activate(item) };
    if (item.kind === "session") {
      const { session } = item, dot = marks(session), archived = sessionArchived(session);
      const time = paletteRelativeTime(sessionUpdatedAt(session), now);
      return <button key={item.id} {...common}>
        <span className="spal-row-main"><Glyph name="Code" dot={dot} />
          <span className="spal-row-text"><Highlighted text={sessionName(session)} query={query} /></span>
          {archived && <span className="spal-sr-only"> {t("Archived")}</span>}
          {dot && <span className="spal-sr-only"> {t(DOT_LABELS[dot])}</span>}
        </span>
        <Trailing selected={isSelected}>{archived
          ? <span className="spal-badge" aria-hidden="true"><Icon name="Archive" size={12} />{t("Archived")}</span>
          : time}</Trailing>
      </button>;
    }
    if (item.kind === "project") {
      const { project } = item;
      return <button key={item.id} {...common}>
        <span className="spal-row-main"><Glyph name="Projects" />
          <span className="spal-row-text"><Highlighted text={project.name} query={query} /></span>
          <span className="spal-row-meta">{project.cwd}</span>
        </span>
        <Trailing selected={isSelected}>{project.updatedAt ? paletteRelativeTime(project.updatedAt, now) : null}</Trailing>
      </button>;
    }
    if (item.kind === "action") {
      const { action } = item;
      return <button key={item.id} {...common}>
        <span className="spal-row-main"><span className="spal-glyph"><Icon name={action.icon} size={20} /></span>
          <span className="spal-row-text"><Highlighted text={action.label} query={query} /></span>
        </span>
        <Trailing selected={isSelected}>{action.shortcut ? <Keys keys={[action.shortcut]} /> : null}</Trailing>
      </button>;
    }
    // send_message: 'New session' and, once something is typed, the text it will send in quotes.
    return <button key={item.id} {...common}>
      <span className="spal-row-main"><span className="spal-glyph"><Icon name="Add" size={20} /></span>
        <span className="spal-row-text">{t("New session")}{term && <span className="spal-send-text">
          <span className="spal-quote">“</span>{term}<span className="spal-quote">”</span></span>}</span>
      </span>
      <Trailing selected={isSelected} accent={!!term}>{null}</Trailing>
    </button>;
  };

  let index = 0;
  const placeholder = palettePlaceholder(mode, { surface }); // V3-w13-surfaces-shortcuts: c2771e1f6 P (code list) by surface
  const listLabel = mode === "search" ? t("Search results") : mode === "actions" ? t("Actions") : t("Command palette options");
  const tree = (
    <div className="spal-portal cds-root" data-cds-portal="" {...portalAttributes()}>
      <div className="spal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { event.preventDefault(); close(); } }} />
      <div ref={popup} role="dialog" aria-modal="true" aria-label={t("Command palette")} className="spal-popup cds-reset" data-palette-mode={mode}
        data-testid="command-palette">
        <div className="spal-body">
          <div className="spal-head">
            <div className="spal-input-row">
              {mode === "search" && <span className="spal-mode-icon" aria-label={t("Search mode")}><Icon name="Search" size={20} /></span>}
              {mode === "actions" && <span className="spal-mode-chip"><span aria-label={t("Actions mode")}><Icon name="Keyboard" size={20} /></span>
                <SourceSettingsButton variant="ghost" size="xs" iconOnly icon="X" iconSize={12} aria-label={t("Clear filter")}
                  onMouseDown={(event) => event.preventDefault()} onClick={() => { setMode("default"); input.current?.focus(); }} /></span>}
              <input ref={input} id="command-palette-input" type="text" role="combobox" aria-autocomplete="list" aria-expanded="true"
                aria-controls={listId} aria-activedescendant={current >= 0 ? `${listId}-${current}` : undefined} aria-label={placeholder}
                placeholder={placeholder} value={query} autoComplete="off" spellCheck={false} className="spal-input"
                onChange={(event) => setQuery?.(event.target.value)} onKeyDown={onKeyDown} />
              <span className="spal-spinner-slot">{deeper && <span role="status" aria-label={t("Searching deeper...")} className="leading-[0]"><SourceSpinner size="md" delay={150} /></span>}</span>
              <SourceSettingsButton variant="ghost" iconOnly icon="X" iconSize="auto" aria-label={t("Close")} onClick={close} />
            </div>
            {mode === "search" && <div className="spal-filters" role="group" aria-label={t("Filters")} onMouseDown={(event) => event.preventDefault()}>
              <div role="tablist" aria-label={t("Type")} className="spal-tabs">
                {[[null, "All"], ...PALETTE_TYPES].map(([value, label]) => <button key={label} type="button" role="tab" tabIndex={-1}
                  aria-selected={filters.type === value} className="spal-tab" onClick={() => setFilters((current) => ({ ...current, type: value }))}>{t(label)}</button>)}
              </div>
              <span className="spal-filters-rule" aria-hidden="true" />
              <div role="group" aria-label={t("Last activity")} className="spal-tabs">
                {PALETTE_DATES.map(([value, label]) => <button key={value} type="button" tabIndex={-1} aria-pressed={filters.date === value} className="spal-tab"
                  onClick={() => setFilters((current) => ({ ...current, date: current.date === value ? null : value }))}>{t(label)}</button>)}
              </div>
            </div>}
            <div className="spal-rule" />
          </div>
          <div ref={list} className="spal-results">
            <div id={listId} role="listbox" aria-label={listLabel} className="spal-listbox">
              {groups.map((group) => <div key={group.id} role="group" aria-label={group.title ?? undefined} className="spal-group">
                {group.title && <div className="spal-group-title">{group.toSearch || group.toActions
                  ? <button type="button" role="presentation" tabIndex={-1} className="spal-group-link" onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setMode(group.toSearch ? "search" : "actions")}><span>{group.title}</span><Icon name="CaretRight" size={12} className="spal-group-caret" /></button>
                  : <span>{group.title}</span>}</div>}
                {group.items.map((item) => renderItem(item, index++))}
              </div>)}
            </div>
            {empty && <div className="spal-empty">
              <p aria-hidden="true" className="spal-empty-words">{t("No results found")}</p>
              {filtered && <SourceSettingsButton size="sm" onMouseDown={(event) => event.preventDefault()} onClick={() => setFilters(EMPTY_PALETTE_FILTERS)}>{t("Clear filters")}</SourceSettingsButton>}
            </div>}
          </div>
          <div className="spal-footer">
            <div className="spal-footer-hints">
              <span className="spal-hint"><span>{t("Select")}</span><Keys keys={["↑", "↓"]} /></span>
              {mode === "default" && term && <span className="spal-hint"><span>{t("Send")}</span><Keys keys={["⏎"]} /></span>}
              {mode !== "actions" && <span className="spal-hint"><span>{t("Actions")}</span><Keys keys={["Tab"]} /></span>}
            </div>
          </div>
        </div>
        <div className="spal-sr-only" aria-live="polite" aria-atomic="true">{term && !deeper
          ? resultCount > 0 ? tn(resultCount, "{count} result available", "{count} results available") : t("No results found")
          : null}</div>
      </div>
    </div>
  );
  return inline ? tree : createPortal(tree, document.body);
}
