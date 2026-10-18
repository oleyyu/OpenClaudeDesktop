import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";
import { SourceMenu, useMenuPopup } from "./source-menu.jsx";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import {
  DEFAULT_DIFF_SCOPE, DIFF_SCOPE_LABELS, UNCOMMITTED_DIFF_SCOPE, commitScopeGone, diffScopeParam, diffScopePick, diffScopeSections, diffScopeTrigger, filterSearchItems,
  resolveDiffScope, uncommittedScopeAvailable,
} from "./diff-scope-model.mjs";
import { rememberDiffScope, useStoredDiffScope } from "./generated/files-changes/diff-scope-memory.mjs";
import { onSessionEvicted } from "./source-files-changes-adapters.jsx";
import { t } from "../electron/i18n/index.mjs";
import "./source-diff-scope.css";

// Changes-pane diff scope dropdown, 2.2553.1 readable/panes-tile-current.js:2949-3110 zm:
// It.TriggerButton variant ghost, `shrink min-w-0 text-secondary`, aria-label "Diff scope: {label}";
// the branch label is a `grid min-w-0 grid-cols-[minmax(0,max-content)_auto_minmax(0,max-content)]
// items-center gap-xs` of two `min-w-0 truncate text-secondary` spans around an xs text-muted
// ArrowRight (alt "to"); It.Popup side bottom, align start, over Id (cd5e3435c B/U/H) sections.

/** cd5e3435c H + F_ (shared-frame SearchablePopup): the search field heads the
 * submenu, rows filter by lower-cased substring, an empty match shows the
 * item's searchEmptyLabel (`px-md py-sm text-footnote text-muted`). */
function SearchableRows({ item }) {
  const popup = useMenuPopup();
  const [query, setQuery] = useState("");
  const input = useRef(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, []);
  const rows = filterSearchItems(item.items, query);
  return <>
    <div className="sds-search">
      <Icon name="Search" size={12} />
      <input ref={input} type="text" value={query} placeholder={item.searchLabel} aria-label={item.searchLabel}
        autoComplete="off" spellCheck={false} onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) { event.stopPropagation(); return; }
          if (event.key === "Enter") {
            event.preventDefault(); event.stopPropagation();
            const highlighted = popup?.highlighted;
            if (highlighted?.isConnected) highlighted.click();
            return;
          }
          if (["ArrowDown", "ArrowUp", "ArrowLeft", "Escape", "Tab"].includes(event.key)) return;
          event.stopPropagation();
        }} />
    </div>
    {rows.length > 0
      ? <div className="sds-search-rows">{rows.map((child, index) => <ScopeItem key={child.value ?? index} item={child} />)}</div>
      : <div role="presentation" className="sds-search-empty">{item.searchEmptyLabel}</div>}
  </>;
}

/** cd5e3435c U: a submenu row (a hint or trailing turns hover-open off) or a plain row. */
function ScopeItem({ item }) {
  if (item.items) {
    return <SourceMenu.Submenu onOpenChange={item.onOpenChange}>
      <SourceMenu.SubmenuTrigger hint={item.hint} openOnHover={item.hint !== undefined || item.trailing !== undefined ? false : undefined}
        disabled={item.disabled}>{item.label}</SourceMenu.SubmenuTrigger>
      <SourceMenu.Popup label={item.label} side="right" align="start" sideOffset={-4}
        className={item.searchLabel !== undefined ? "sds-search-popup" : undefined}>
        {item.searchLabel !== undefined ? <SearchableRows item={item} />
          : item.items.map((child, index) => <ScopeItem key={child.value ?? index} item={child} />)}
      </SourceMenu.Popup>
    </SourceMenu.Submenu>;
  }
  return <SourceMenu.Item checked={item.checked} checkedRole={item.checkedRole} hint={item.hint} disabled={item.disabled}
    keepOpen={item.keepOpen} onClick={item.onSelect}>{item.label}</SourceMenu.Item>;
}

/** zm trigger + popup. `trigger` from diffScopeTrigger, `sections` from diffScopeSections. */
export function SourceDiffScope({ trigger, sections = [] }) {
  const [open, setOpen] = useState(null);
  const button = useRef(null);
  if (!trigger) return null;
  const filled = sections.filter((section) => section.items.length > 0);
  return <>
    <SourceSettingsButton ref={button} variant="ghost" className="sds-trigger" aria-label={trigger.ariaLabel}
      aria-haspopup="menu" aria-expanded={!!open} data-popup-open={open ? "" : undefined}
      onClick={() => setOpen(open ? null : { token: Date.now() })}
      onKeyDown={(event) => {
        if (open || event.metaKey || event.ctrlKey || event.altKey || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
        event.preventDefault();
        setOpen({ token: Date.now(), entry: event.key === "ArrowDown" ? "first" : "last" });
      }}>
      {trigger.branch
        ? <span className="sds-label">
          <span className="sds-part">{trigger.branch.base}</span>
          <Icon name="ArrowRight" size={12} className="sds-arrow" role="img" aria-hidden={false} aria-label={DIFF_SCOPE_LABELS.to} />
          <span className="sds-part">{trigger.branch.head}</span>
        </span>
        : <span className="sds-part">{trigger.label}</span>}
    </SourceSettingsButton>
    {open && <SourceMenu.Popup key={open.token} anchor={button.current} trigger={button.current} side="bottom" align="start"
      label={t("Diff scope")} onClose={() => setOpen(null)} initialHighlight={open.entry} contextMenuGuard>
      {filled.map((section, index) => <React.Fragment key={section.key ?? index}>
        {index > 0 && <SourceMenu.Separator />}
        <SourceMenu.Group>{section.items.map((item, itemIndex) => <ScopeItem key={item.value ?? itemIndex} item={item} />)}</SourceMenu.Group>
      </React.Fragment>)}
    </SourceMenu.Popup>}
  </>;
}

// c03935b01 `$e((e) => Rn(e, "branch"))` (2.42304.0): a session that goes away leaves the remembered set.
onSessionEvicted((sessionId) => rememberDiffScope(sessionId, "branch"));

const EMPTY_ENTRY = Object.freeze({});
const COMMITS_FETCH_LIMIT = 101;
const NO_BRANCHES = Object.freeze({ cwd: null, list: [], loaded: false, error: false });

/** Per-session diff scope for the Changes pane (Od/zm state, held per session
 * here): {scope, base} where base is the "Compare against" override. With no pick in this window the scope is the
 * remembered one (2.42304.0 c03935b01 Cc: `diffScopeByTile[tile] ?? Ln(session)`, i.e. "Uncommitted changes" for a
 * session whose last scope-row pick was Uncommitted, persisted.epitaxy-diff-uncommitted-sessions, ≤ 50). Returns the
 * workspace-git-diff `scope` parameter, the override, and the trigger element
 * (null without a resolvable base, where the pane keeps its plain title). The
 * commit list loads while the pane is active; branches load when "Compare
 * against" opens (za is enabled only while the submenu is open). */
export function useDiffScope({ call, cwd, sessionId, status, active = false, refreshKey = 0 }) {
  const [entries, setEntries] = useState({});
  const [commits, setCommits] = useState({ key: null, list: [], total: 0 });
  const [branches, setBranches] = useState(NO_BRANCHES);
  const sessionKey = sessionId ?? "";
  const entry = entries[sessionKey] || EMPTY_ENTRY;
  const isRepo = !!status?.isRepo;
  const defaultBase = isRepo ? status.scopeBase || null : null;
  const override = isRepo && defaultBase && entry.base ? entry.base : null;
  const base = override || defaultBase;
  const stored = useStoredDiffScope(sessionId ?? undefined);
  const picked = entry.scope ?? stored;
  const uncommittedAvailable = uncommittedScopeAvailable(status);
  const scope = resolveDiffScope(picked, { base, uncommittedAvailable });
  const param = isRepo ? diffScopeParam(scope) : undefined;
  const update = useCallback((patch) => setEntries((previous) => ({ ...previous, [sessionKey]: { ...previous[sessionKey], ...patch } })), [sessionKey]);
  // mb S/C and Xb V: set the pane's scope; a changed All changes / Uncommitted pick is remembered for the session (Rn).
  const uncommittedOffered = status?.workingTreeDirty === true || scope.kind === "uncommitted";
  const pick = (next, via) => {
    const outcome = diffScopePick({ picked, shown: scope, next, via, uncommittedAvailable, uncommittedOffered });
    if (!outcome.set) return;
    update({ scope: next });
    if (outcome.remember && sessionId) rememberDiffScope(sessionId, outcome.remember);
  };
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const pickScope = useCallback((next, via) => pickRef.current(next, via), []);
  const listKey = JSON.stringify([cwd, sessionId]);
  const fetchKey = JSON.stringify([cwd, sessionId, status?.headSha ?? null, override, defaultBase, refreshKey]);
  useEffect(() => {
    if (!active || !isRepo || !base || !cwd) return undefined;
    let live = true;
    // B15: 101 rows = the Commits section's 100 (c44d00c7f qr) plus one; the menu shows the first 50.
    call("workspace-git-commits", { cwd, sessionId, limit: COMMITS_FETCH_LIMIT, ...(override ? { base: override } : {}) })
      .then((result) => {
        if (!live) return;
        const list = Array.isArray(result?.commits) ? result.commits : [];
        // `total` = rev-list --count base..HEAD, so "N older commits not shown" is the real N (zm m.length − 50).
        setCommits({ key: listKey, list, total: Number.isSafeInteger(result?.total) ? result.total : list.length });
      })
      .catch(() => { if (live) setCommits({ key: listKey, list: [], total: 0, failed: true }); });
    return () => { live = false; };
    // fetchKey covers cwd, session, HEAD, base and Refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isRepo, fetchKey]);
  const commitList = commits.key === listKey ? commits.list : [];
  const commitTotal = commits.key === listKey ? commits.total : 0;
  // cccc2cf0a Xb te: a commit scope whose sha has left the loaded base..HEAD list (amended, rebased, reset)
  // goes back to "All changes". Only a complete, successfully read list can tell that the sha is gone.
  const selectedCommitGone = commits.key === listKey && commitScopeGone(scope, { list: commitList, total: commitTotal, failed: commits.failed });
  useEffect(() => { if (selectedCommitGone) update({ scope: DEFAULT_DIFF_SCOPE }); }, [selectedCommitGone, update]);
  const loadBranches = useCallback(() => {
    if (!cwd) return;
    call("workspace-git-branches", { cwd })
      .then((list) => setBranches({ cwd, list: Array.isArray(list) ? list : [], loaded: true, error: false }))
      .catch(() => setBranches({ cwd, list: [], loaded: true, error: true }));
  }, [call, cwd]);
  const branchState = branches.cwd === cwd ? branches : NO_BRANCHES;
  const current = status?.detached ? undefined : status?.branch || undefined;
  const trigger = isRepo ? diffScopeTrigger(scope, { base, commits: commitList }) : null;
  const sections = useMemo(() => !trigger ? [] : diffScopeSections({
    scope, base, defaultBase, overridden: !!override, current, uncommittedAvailable, commits: commitList, commitTotal, branches: branchState,
    onSelectScope: (next, meta) => pickScope(next, meta?.via),
    onSelectBase: (name) => update({ base: name || undefined }),
    // Im I(): opening the list drops an override that names the checked-out branch, then refetches.
    onBaseMenuOpen: () => { if (override && override === current) update({ base: undefined }); loadBranches(); },
  }), [trigger?.ariaLabel, scope, base, defaultBase, override, current, uncommittedAvailable, commitList, commitTotal, branchState, update, pickScope, loadBranches]);
  // B15 Commits section (cccc2cf0a Xb H/U/B): a commit row narrows to that commit, null is "All changes";
  // "Uncommitted changes" is offered while the working tree is dirty or that scope is picked.
  const selectCommit = useCallback((sha) => pickScope(sha ? { kind: "commit", sha } : DEFAULT_DIFF_SCOPE, "commit_list"), [pickScope]);
  const selectUncommitted = useCallback(() => pickScope(UNCOMMITTED_DIFF_SCOPE, "commit_list"), [pickScope]);
  const commitsSection = useMemo(() => (!trigger || commitList.length === 0 ? null : {
    list: commitList, total: commitTotal, selectedSha: scope.kind === "commit" ? scope.sha : null, uncommittedSelected: scope.kind === "uncommitted",
    onSelect: selectCommit, onSelectUncommitted: uncommittedOffered ? selectUncommitted : undefined,
  }), [!trigger, commitList, commitTotal, scope, selectCommit, selectUncommitted, uncommittedOffered]); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    param,
    base: override || undefined,
    kind: scope.kind,
    control: trigger ? <SourceDiffScope trigger={trigger} sections={sections} /> : null,
    commits: commitsSection,
  };
}
